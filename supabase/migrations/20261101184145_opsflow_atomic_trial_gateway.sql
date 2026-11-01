BEGIN;
CREATE TABLE public.opsflow_trial_usage (
 trial_id uuid NOT NULL, company_id uuid NOT NULL REFERENCES public.opsflow_companies(id),
 collection text NOT NULL, document_id text NOT NULL,
 PRIMARY KEY(trial_id,company_id,collection,document_id)
);
CREATE TABLE public.opsflow_trial_receipts (
 trial_id uuid NOT NULL, company_id uuid NOT NULL REFERENCES public.opsflow_companies(id),
 request_id uuid NOT NULL, payload_hash text NOT NULL, result jsonb NOT NULL,
 PRIMARY KEY(trial_id,company_id,request_id)
);
ALTER TABLE public.opsflow_trial_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opsflow_trial_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.opsflow_trial_usage,public.opsflow_trial_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.opsflow_trial_usage,public.opsflow_trial_receipts TO service_role;
-- Server supplies trial metadata from fresh signed MYOPS entitlement, never browser data.
CREATE FUNCTION public.opsflow_trial_document_gateway(p_token_hash text,p_trial_id uuid,p_expires_at timestamptz,p_request_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE ctx jsonb; company uuid; receipt public.opsflow_trial_receipts%rowtype; result jsonb; item jsonb; used integer; flows integer;
BEGIN
 ctx=public.opsflow_session_context(p_token_hash);
 IF ctx IS NULL OR p_trial_id IS NULL OR p_request_id IS NULL OR p_expires_at IS NULL OR p_expires_at<=now() THEN RAISE EXCEPTION 'Active verified trial required'; END IF;
 company=(ctx->>'companyId')::uuid;
 -- Same company lock as the original gateway; counters and writes commit together.
 PERFORM 1 FROM public.opsflow_companies WHERE id=company FOR UPDATE;
 SELECT * INTO receipt FROM public.opsflow_trial_receipts WHERE trial_id=p_trial_id AND company_id=company AND request_id=p_request_id;
 IF FOUND THEN
  IF receipt.payload_hash<>md5(p_payload::text) THEN RAISE EXCEPTION 'Request identifier reused with changed payload'; END IF;
  RETURN receipt.result;
 END IF;
 -- Run original session, role, tenant, optimistic concurrency and mutation checks.
 -- Any later quota failure rolls these mutations back in this same transaction.
 result=public.opsflow_document_gateway(p_token_hash,'commit',p_payload);
 FOR item IN SELECT value FROM jsonb_array_elements(p_payload->'operations') LOOP
  IF item->>'kind'<>'delete' AND item->>'collection' IN ('sales','purchases','expenses','purchase_orders','goods_receipts','supplier_invoices','payments','capital_entries') THEN
   INSERT INTO public.opsflow_trial_usage(trial_id,company_id,collection,document_id)
   VALUES(p_trial_id,company,item->>'collection',item->>'id') ON CONFLICT DO NOTHING;
  END IF;
 END LOOP;
 SELECT count(*),count(*) FILTER(WHERE collection='purchase_orders') INTO used,flows FROM public.opsflow_trial_usage WHERE trial_id=p_trial_id AND company_id=company;
 IF used>30 OR flows>2 THEN RAISE EXCEPTION 'Trial usage limit reached'; END IF;
 INSERT INTO public.opsflow_trial_receipts VALUES(p_trial_id,company,p_request_id,md5(p_payload::text),result);
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.opsflow_trial_document_gateway(text,uuid,timestamptz,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.opsflow_trial_document_gateway(text,uuid,timestamptz,uuid,jsonb) TO service_role;
COMMIT;
