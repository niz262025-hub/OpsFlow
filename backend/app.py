"""OpsFlow Vercel API. MYOPS is the only authentication authority."""
import hashlib
import json
import os
import secrets
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from myops_app_access import call_myops, validate_redeem_response, is_launch_ticket, MyopsAccessError

app = FastAPI(title='OpsFlow API')
bearer = HTTPBearer()


def database(path, body=None, method=None):
    origin = os.getenv('OPSFLOW_SUPABASE_URL', '').rstrip('/')
    key = os.getenv('OPSFLOW_SUPABASE_SERVICE_ROLE_KEY', '')
    if (urlsplit(origin).scheme != 'https' or urlsplit(origin).hostname != 'ojamkplflqafedmxbdxb.supabase.co' or urlsplit(origin).path or not key):
        raise HTTPException(503, 'OpsFlow database is not configured')
    request = Request(origin + '/rest/v1/' + path,
        data=json.dumps(body).encode() if body is not None else None,
        method=method or ('POST' if body is not None else 'GET'),
        headers={'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Prefer': 'return=representation'})
    try:
        with urlopen(request, timeout=15) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except HTTPError as error:
        # Never return upstream bodies, database details or service credentials.
        if error.code == 400:
            raise HTTPException(409, 'Operation rejected; refresh and retry') from None
        raise HTTPException(503, 'OpsFlow data service is unavailable') from None
    except (URLError, TimeoutError):
        raise HTTPException(503, 'OpsFlow data service is unavailable') from None


def token_hash(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    token = credentials.credentials
    if len(token) != 64 or any(c not in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_' for c in token):
        raise HTTPException(401, 'MYOPS session required')
    return hashlib.sha256(token.encode()).hexdigest()


def session_context(digest):
    result = database('rpc/opsflow_session_context', {'p_token_hash': digest})
    if not result:
        raise HTTPException(401, 'MYOPS session expired')
    return result


class Ticket(BaseModel):
    ticket: str = Field(max_length=43)


class Refresh(BaseModel):
    activity: bool = False


class DocumentRequest(BaseModel):
    action: str
    payload: dict = Field(default_factory=dict)


@app.get('/api/health')
def health():
    return {'service': 'opsflow', 'authentication': 'MYOPS', 'store': 'Supabase'}


@app.get('/api/ready')
def readiness():
    # Zero-row query checks server credentials without returning profile data.
    database('opsflow_profiles?select=id&limit=0')
    return {'ready': True, 'database': 'reachable'}


@app.post('/api/app-access/redeem')
async def redeem(body: Ticket):
    if not is_launch_ticket(body.ticket):
        raise HTTPException(400, 'Invalid MYOPS launch ticket')
    try:
        reply = await run_in_threadpool(call_myops, '/api/app/redeem', {'ticket': body.ticket})
        redeemed = validate_redeem_response(reply)
    except MyopsAccessError:
        raise HTTPException(403, 'MYOPS launch could not be verified') from None
    token = secrets.token_urlsafe(48)
    digest = hashlib.sha256(token.encode()).hexdigest()
    # Existing explicit identity and company membership are mandatory. No email matching.
    context = await run_in_threadpool(database, 'rpc/opsflow_open_session', {
        'p_user_ref': redeemed['user_ref'], 'p_session_id': redeemed['session_id'], 'p_token_hash': digest})
    if not context:
        raise HTTPException(403, 'OpsFlow identity or membership is not provisioned')
    return {'access_token': token, 'profile': context}


@app.post('/api/app-access/refresh')
async def refresh(body: Refresh, digest: str = Depends(token_hash)):
    context = await run_in_threadpool(session_context, digest)
    try:
        reply = await run_in_threadpool(call_myops, '/api/app/entitlement', {
            'session_id': context['session_id'], 'product': 'opsflow',
            'activity': body.activity, 'sensitive': False})
    except MyopsAccessError:
        raise HTTPException(503, 'MYOPS access could not be verified') from None
    if reply.get('entitled') is not True or reply.get('session_active') is not True:
        await run_in_threadpool(database, 'rpc/opsflow_close_session', {'p_token_hash': digest})
        raise HTTPException(403, 'MYOPS access is no longer active')
    result = await run_in_threadpool(database, 'rpc/opsflow_touch_session', {'p_token_hash': digest, 'p_activity': body.activity})
    if not result:
        raise HTTPException(401, 'MYOPS session expired')
    return {'entitled': True}


@app.get('/api/auth/me')
async def me(digest: str = Depends(token_hash)):
    return await run_in_threadpool(session_context, digest)


@app.post('/api/auth/logout')
async def logout(digest: str = Depends(token_hash)):
    await run_in_threadpool(database, 'rpc/opsflow_close_session', {'p_token_hash': digest})
    return {'logged_out': True}


@app.post('/api/data')
async def data(body: DocumentRequest, digest: str = Depends(token_hash)):
    if body.action not in ('get', 'list', 'commit'):
        raise HTTPException(400, 'Unsupported operation')
    return await run_in_threadpool(database, 'rpc/opsflow_document_gateway', {
        'p_token_hash': digest, 'p_action': body.action, 'p_payload': body.payload})


@app.post('/api/auth/login')
@app.post('/api/auth/register')
@app.post('/api/payments/success')
def central_only():
    raise HTTPException(410, 'Login and subscriptions are managed by MYOPS')
