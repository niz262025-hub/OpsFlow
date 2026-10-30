-- A verified MYOPS launch may hold onboarding access, never business-data access.
create table public.opsflow_onboarding_sessions (
 id uuid primary key,
 myops_user_ref text not null check (myops_user_ref ~ '^[A-Za-z0-9_-]{43}$'),
 token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now(),
 last_activity_at timestamptz not null default now(),
 absolute_expires_at timestamptz not null default now()+interval '12 hours',
 revoked_at timestamptz,
 completed_at timestamptz,
 check(last_activity_at >= created_at),
 check(absolute_expires_at > created_at and absolute_expires_at <= created_at+interval '12 hours')
);
alter table public.opsflow_onboarding_sessions enable row level security;
revoke all on public.opsflow_onboarding_sessions from public,anon,authenticated;
grant select,insert,update,delete on public.opsflow_onboarding_sessions to service_role;

create function public.opsflow_onboarding(
 p_action text,p_token_hash text,p_user_ref text default null,p_session_id uuid default null,
 p_company_name text default null,p_display_name text default null,p_activity boolean default false
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare pending public.opsflow_onboarding_sessions%rowtype; ref text; profile uuid; company uuid; ctx jsonb;
begin
 if p_action='prepare' then
  if p_user_ref is null or p_session_id is null then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_ref,0));
  -- Never allow suspended or ambiguous existing memberships to escape into a new company.
  select id into profile from public.opsflow_profiles where myops_user_ref=p_user_ref;
  if exists(select 1 from public.opsflow_memberships where profile_id=profile)
   or exists(select 1 from public.opsflow_companies where owner_profile_id=profile)
   or exists(select 1 from public.opsflow_app_sessions where id=p_session_id or token_hash=p_token_hash)
   then return null; end if;
  insert into public.opsflow_onboarding_sessions(id,myops_user_ref,token_hash)
   values(p_session_id,p_user_ref,p_token_hash);
 elsif p_action='close' then
  update public.opsflow_onboarding_sessions set revoked_at=coalesce(revoked_at,now()) where token_hash=p_token_hash;
  return null;
 elsif p_action not in ('context','touch','complete') then
  raise exception 'Unsupported onboarding operation' using errcode='22023';
 end if;
 select myops_user_ref into ref from public.opsflow_onboarding_sessions where token_hash=p_token_hash;
 if ref is null then return null; end if;
 -- All sessions for the same central identity serialize company creation.
 perform pg_advisory_xact_lock(hashtextextended(ref,0));
 select * into pending from public.opsflow_onboarding_sessions where token_hash=p_token_hash for update;
 if pending.revoked_at is not null or pending.last_activity_at<=now()-interval '15 minutes'
  or pending.absolute_expires_at<=now() then return null; end if;
 if pending.completed_at is not null then
  if p_action='complete' then return public.opsflow_session_context(p_token_hash); end if;
  -- A refresh begun before completion may finish after the business session opens.
  if p_action='touch' and public.opsflow_touch_session(p_token_hash,p_activity) then
   return public.opsflow_session_context(p_token_hash);
  end if;
  return null;
 end if;
 if p_action='complete' then
  if p_company_name is null or length(btrim(p_company_name)) not between 1 and 200
   or p_display_name is null or length(btrim(p_display_name)) not between 1 and 100
   then raise exception 'Invalid company or display name' using errcode='22023'; end if;
  select id into profile from public.opsflow_profiles where myops_user_ref=ref for update;
  if exists(select 1 from public.opsflow_memberships where profile_id=profile)
   or exists(select 1 from public.opsflow_companies where owner_profile_id=profile)
   then raise exception 'Company already assigned; reopen OpsFlow from MYOPS' using errcode='22023'; end if;
  if profile is null then
   insert into public.opsflow_profiles(myops_user_ref,display_name) values(ref,btrim(p_display_name)) returning id into profile;
  else
   update public.opsflow_profiles set display_name=btrim(p_display_name) where id=profile;
  end if;
  insert into public.opsflow_companies(owner_profile_id,name,settings)
   values(profile,btrim(p_company_name),'{"currency":"MYR","timezone":"Asia/Kuala_Lumpur"}') returning id into company;
  insert into public.opsflow_memberships(company_id,profile_id,role) values(company,profile,'admin');
  insert into public.opsflow_app_sessions(id,profile_id,company_id,token_hash,created_at,last_activity_at,verified_until,absolute_expires_at)
   values(pending.id,profile,company,p_token_hash,pending.created_at,pending.last_activity_at,
    least(now()+interval '30 seconds',pending.absolute_expires_at),pending.absolute_expires_at);
  update public.opsflow_onboarding_sessions set completed_at=now() where id=pending.id;
  return public.opsflow_session_context(p_token_hash);
 end if;
 if p_action='touch' and p_activity then
  update public.opsflow_onboarding_sessions set last_activity_at=now() where id=pending.id;
 end if;
 return jsonb_build_object('onboarding_required',true,'session_id',pending.id);
end $$;
revoke all on function public.opsflow_onboarding(text,text,text,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.opsflow_onboarding(text,text,text,uuid,text,text,boolean) to service_role;
