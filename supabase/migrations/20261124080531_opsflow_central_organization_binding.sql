-- Explicit operator-reviewed mappings; no existing companies are reassigned.
begin;
create table public.opsflow_organization_companies (
 organization_id uuid primary key,
 company_id uuid not null unique references public.opsflow_companies(id),
 enabled boolean not null default false
);
alter table public.opsflow_organization_companies enable row level security;
revoke all on public.opsflow_organization_companies from public,anon,authenticated;
grant select,insert,update,delete on public.opsflow_organization_companies to service_role;
alter table public.opsflow_app_sessions add column organization_id uuid references public.opsflow_organization_companies(organization_id);
create or replace function public.opsflow_session_context(p_token_hash text) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object('uid',p.id,'email','','displayName',p.display_name,
 'companyId',s.company_id,'companyName',c.name,'role',m.role,'session_id',s.id,'organization_id',s.organization_id)
 from public.opsflow_app_sessions s
 join public.opsflow_profiles p on p.id=s.profile_id
 join public.opsflow_memberships m on m.profile_id=s.profile_id and m.company_id=s.company_id and m.active
 join public.opsflow_companies c on c.id=s.company_id
 where s.token_hash=p_token_hash and s.revoked_at is null
 and s.last_activity_at > now()-interval '15 minutes' and s.absolute_expires_at > now()
 and (s.organization_id is null or exists(select 1 from public.opsflow_organization_companies map
  where map.organization_id=s.organization_id and map.company_id=s.company_id and map.enabled))
$$;
create function public.opsflow_open_organization_session(p_user_ref text,p_session_id uuid,p_token_hash text,p_organization_id uuid) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare profile uuid; company uuid;
begin
 select p.id,m.company_id into profile,company from public.opsflow_profiles p
 join public.opsflow_memberships m on m.profile_id=p.id and m.active
 join public.opsflow_organization_companies map on map.company_id=m.company_id and map.enabled
 where p.myops_user_ref=p_user_ref and map.organization_id=p_organization_id;
 if profile is null then return null; end if;
 insert into public.opsflow_app_sessions(id,profile_id,company_id,organization_id,token_hash,verified_until,absolute_expires_at)
 values(p_session_id,profile,company,p_organization_id,p_token_hash,now()+interval '30 seconds',now()+interval '12 hours');
 return public.opsflow_session_context(p_token_hash);
end $$;
revoke all on function public.opsflow_open_organization_session(text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.opsflow_open_organization_session(text,uuid,text,uuid) to service_role;
commit;
