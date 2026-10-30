-- Staging only. Server role only; no independent Supabase password login.
alter table public.opsflow_documents drop constraint opsflow_documents_collection_check;
alter table public.opsflow_documents add constraint opsflow_documents_collection_check check (collection in ('products','categories','suppliers','customers','purchases','sales','expenses','stock_movements','cash_ledger','bank_accounts','bank_ledger','capital_entries','notifications','settings','purchase_orders','purchase_order_items','pending_references','goods_receipts','supplier_invoices','payments','payment_transactions','invite_codes'));

create function public.opsflow_session_context(p_token_hash text) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object('uid',p.id,'email','','displayName',p.display_name,
 'companyId',s.company_id,'companyName',c.name,'role',m.role,'session_id',s.id)
 from public.opsflow_app_sessions s
 join public.opsflow_profiles p on p.id=s.profile_id
 join public.opsflow_memberships m on m.profile_id=s.profile_id and m.company_id=s.company_id and m.active
 join public.opsflow_companies c on c.id=s.company_id
 where s.token_hash=p_token_hash and s.revoked_at is null
 and s.last_activity_at > now()-interval '15 minutes' and s.absolute_expires_at > now()
$$;

create function public.opsflow_open_session(p_user_ref text,p_session_id uuid,p_token_hash text) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare p uuid; c uuid;
begin
 select id into p from public.opsflow_profiles where myops_user_ref=p_user_ref for update;
 if p is null then return null; end if;
 -- An ambiguous identity must be explicitly assigned before launch.
 if (select count(*) from public.opsflow_memberships where profile_id=p and active) <> 1 then return null; end if;
 select company_id into c from public.opsflow_memberships where profile_id=p and active;
 insert into public.opsflow_app_sessions(id,profile_id,company_id,token_hash,verified_until,absolute_expires_at)
 values(p_session_id,p,c,p_token_hash,now()+interval '30 seconds',now()+interval '12 hours');
 return public.opsflow_session_context(p_token_hash);
end $$;

create function public.opsflow_close_session(p_token_hash text) returns void
language sql security invoker set search_path=public,pg_temp as $$
 update public.opsflow_app_sessions set revoked_at=coalesce(revoked_at,now()) where token_hash=p_token_hash
$$;

create function public.opsflow_touch_session(p_token_hash text,p_activity boolean) returns boolean
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform 1 from public.opsflow_app_sessions where token_hash=p_token_hash for update;
 if public.opsflow_session_context(p_token_hash) is null then return false; end if;
 update public.opsflow_app_sessions set verified_until=least(now()+interval '30 seconds',absolute_expires_at),
 last_activity_at=case when p_activity then now() else last_activity_at end where token_hash=p_token_hash;
 return true;
end $$;

create function public.opsflow_resolve_value(v jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if jsonb_typeof(v)='object' then
  if v = '{"$serverTimestamp":true}'::jsonb then return jsonb_build_object('$date',now()); end if;
  select coalesce(jsonb_object_agg(key,public.opsflow_resolve_value(value)),'{}'::jsonb) into result from jsonb_each(v);
  return result;
 elsif jsonb_typeof(v)='array' then
  select coalesce(jsonb_agg(public.opsflow_resolve_value(value)),'[]'::jsonb) into result from jsonb_array_elements(v);
  return result;
 end if;
 return v;
end $$;
revoke all on function public.opsflow_resolve_value(jsonb) from public,anon,authenticated;
grant execute on function public.opsflow_resolve_value(jsonb) to service_role;

create function public.opsflow_document_gateway(p_token_hash text,p_action text,p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare ctx jsonb; company uuid; col text; ident text; result jsonb; op jsonb; check_read jsonb;
 existing public.opsflow_documents%rowtype; next_data jsonb; current_version bigint;
begin
 perform 1 from public.opsflow_app_sessions where token_hash=p_token_hash for update;
 ctx=public.opsflow_session_context(p_token_hash);
 if ctx is null then raise exception 'Session expired' using errcode='22023'; end if;
 perform 1 from public.opsflow_app_sessions where token_hash=p_token_hash and verified_until>now();
 if not found then raise exception 'Entitlement refresh required' using errcode='22023'; end if;
 company=(ctx->>'companyId')::uuid;
 if p_payload ? 'companyId' and p_payload->>'companyId' <> company::text then
  raise exception 'Company access denied' using errcode='22023';
 end if;
 col=p_payload->>'collection'; ident=p_payload->>'id';
 if p_action='get' then
  if col='companies' then
   if ident<>company::text then raise exception 'Company access denied' using errcode='22023'; end if;
   select jsonb_build_object('id',c.id,'data',c.settings||jsonb_build_object('name',c.name,'ownerUid',c.owner_profile_id),'version',0) into result from public.opsflow_companies c where c.id=company;
  elsif col='users' then
   if ident<>ctx->>'uid' then raise exception 'Profile access denied' using errcode='22023'; end if;
   result=jsonb_build_object('id',ident,'data',ctx,'version',0);
  else
   select jsonb_build_object('id',d.id,'data',d.data,'version',d.version) into result from public.opsflow_documents d where d.company_id=company and d.collection=col and d.id=ident;
  end if;
  return result;
 elsif p_action='list' then
  if col='users' then
   select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'data',jsonb_build_object('uid',p.id,'companyId',company,'displayName',p.display_name,'email','','role',m.role),'version',0)),'[]'::jsonb) into result from public.opsflow_memberships m join public.opsflow_profiles p on p.id=m.profile_id where m.company_id=company and m.active;
  else
   select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'data',d.data,'version',d.version)),'[]'::jsonb) into result from public.opsflow_documents d where d.company_id=company and d.collection=col;
  end if;
  return result;
 elsif p_action <> 'commit' then raise exception 'Unsupported action' using errcode='22023'; end if;
 if ctx->>'role' not in ('admin','manager') then raise exception 'Manager role required' using errcode='22023'; end if;
 if jsonb_typeof(p_payload->'operations')<>'array' or jsonb_array_length(p_payload->'operations')>500 then raise exception 'Invalid batch' using errcode='22023'; end if;
 -- Serialize all company writes; compare every transaction read before any mutation.
 perform 1 from public.opsflow_companies where id=company for update;
 for check_read in select value from jsonb_array_elements(coalesce(p_payload->'reads','[]'::jsonb)) loop
  select version into current_version from public.opsflow_documents where company_id=company and collection=check_read->>'collection' and id=check_read->>'id';
  if coalesce(current_version,0)<>(check_read->>'version')::bigint then raise exception 'Concurrent update; retry transaction' using errcode='22023'; end if;
 end loop;
 for op in select value from jsonb_array_elements(p_payload->'operations') loop
  op=jsonb_set(op,'{data}',public.opsflow_resolve_value(coalesce(op->'data','{}'::jsonb)));
  col=op->>'collection'; ident=op->>'id';
  if col in ('users','invite_codes') then raise exception 'Membership actions require dedicated endpoint' using errcode='22023'; end if;
  if col='companies' then
   if ctx->>'role'<>'admin' or ident<>company::text or op->>'kind' not in ('set','update') or op->'data' ? 'ownerUid' then raise exception 'Company update denied' using errcode='22023'; end if;
   update public.opsflow_companies set name=coalesce(op->'data'->>'name',name),settings=settings||(op->'data'-'name') where id=company;
   continue;
  end if;
  if op->>'kind'='delete' then
   if ctx->>'role'<>'admin' then raise exception 'Admin required' using errcode='22023'; end if;
   delete from public.opsflow_documents where company_id=company and collection=col and id=ident;
  elsif op->>'kind' in ('set','update') then
   select * into existing from public.opsflow_documents where company_id=company and collection=col and id=ident;
   if op->>'kind'='update' and existing.id is null then raise exception 'Document missing' using errcode='22023'; end if;
   next_data=case when op->>'kind'='update' or coalesce((op->>'merge')::boolean,false) then coalesce(existing.data,'{}'::jsonb)||(op->'data') else op->'data' end;
   if next_data ? 'companyId' and next_data->>'companyId' <> company::text then raise exception 'Company reassignment denied' using errcode='22023'; end if;
   next_data=next_data||jsonb_build_object('companyId',company);
   if col='products' and next_data ? 'stock' and (next_data->>'stock')::numeric<0 then raise exception 'Negative stock denied' using errcode='22023'; end if;
   insert into public.opsflow_documents(company_id,collection,id,data) values(company,col,ident,next_data)
    on conflict(company_id,collection,id) do update set data=excluded.data,version=opsflow_documents.version+1,updated_at=now();
  else raise exception 'Unsupported mutation' using errcode='22023'; end if;
 end loop;
 return jsonb_build_object('committed',true);
end $$;

revoke all on function public.opsflow_session_context(text),public.opsflow_open_session(text,uuid,text),public.opsflow_close_session(text),public.opsflow_touch_session(text,boolean),public.opsflow_document_gateway(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.opsflow_session_context(text),public.opsflow_open_session(text,uuid,text),public.opsflow_close_session(text),public.opsflow_touch_session(text,boolean),public.opsflow_document_gateway(text,text,jsonb) to service_role;
