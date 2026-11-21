"""Staging trial write gate; call only with server-verified company/session context."""
from uuid import UUID, uuid5, NAMESPACE_URL
from myops_app_access import MyopsAccessError, consume_trial_quota
TRANSACTIONS = {'sales','purchases','expenses','purchase_orders','goods_receipts','supplier_invoices','payments','capital_entries'}

def enforce_trial_writes(context, payload, consume=consume_trial_quota):
    # These identifiers must come from the stored session, never request payload.
    company = context.get('companyId')
    session = context.get('session_id')
    if not isinstance(company,str) or not company or not session:
        raise MyopsAccessError('Verified company session required')
    operations = payload.get('operations')
    if not isinstance(operations,list) or len(operations)>500:
        raise MyopsAccessError('Invalid trial write batch')
    charges = set()
    for op in operations:
        if not isinstance(op,dict) or op.get('kind') not in {'set','update','delete'}:
            raise MyopsAccessError('Invalid trial operation')
        collection, ident = op.get('collection'), op.get('id')
        if not isinstance(collection,str) or not isinstance(ident,str) or not ident or len(ident)>200:
            raise MyopsAccessError('Invalid trial document')
        if collection in {'users','invite_codes'}:
            raise MyopsAccessError('Multi-user access requires upgrade')
        if op['kind'] != 'delete' and collection in TRANSACTIONS:
            # Stable across retry/re-login. Clients cannot choose the quota UUID.
            # App database must still authorize and deduplicate its actual write.
            operation = str(uuid5(NAMESPACE_URL, f'opsflow:{company}:{collection}:{ident}'))
            charges.add(operation)
    for operation in sorted(charges):
        UUID(operation)
        consume(session,'transactions',operation)
