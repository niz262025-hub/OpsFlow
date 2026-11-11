-- Table-level schema operations bypass row policies and are not browser APIs.
-- Keep ordinary data privileges, service-role access and every RLS policy intact.
do $$
declare relation record;
begin
  for relation in
    select n.nspname, c.relname
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p')
  loop
    execute format('revoke truncate, references, trigger on table %I.%I from public, anon, authenticated', relation.nspname, relation.relname);
  end loop;
end $$;
