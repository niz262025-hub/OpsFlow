-- Snapshot for OpsFlow STAGING ojamkplflqafedmxbdxb only, before hardening.
-- Deliberately restores the old excessive grants; use only for a reviewed rollback.
begin;
grant truncate, references, trigger on public.business_payment_profiles to anon;
grant truncate, references, trigger on public.business_payment_profiles to authenticated;
commit;
