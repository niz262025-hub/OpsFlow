import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
for (const file of fs.readdirSync('../supabase/migrations').filter(f => f.endsWith('.sql')).sort()) {
  await db.exec(fs.readFileSync('../supabase/migrations/' + file, 'utf8'));
}
const call = async (fn, args) => (await db.query(`select ${fn}(${args.map((_, i) => '$' + (i + 1)).join(',')}) result`, args)).rows[0].result;
const pending = (action, token, ref = null, id = null, company = null, name = null, activity = false) =>
  call('opsflow_onboarding', [action, token, ref, id, company, name, activity]);
const token = 'a'.repeat(64), ref = 'A'.repeat(43), id = randomUUID();
assert.equal(await pending('context', token), null);
assert.ok((await pending('prepare', token, ref, id)).onboarding_required);
assert.equal(await call('opsflow_session_context', [token]), null);
await assert.rejects(call('opsflow_document_gateway', [token, 'list', JSON.stringify({ collection: 'products' })]));
await assert.rejects(pending('prepare', 'b'.repeat(64), ref, id)); // central launch replay
await assert.rejects(pending('complete', token, null, null, '   ', 'Owner'));
assert.equal((await db.query('select count(*)::int n from opsflow_companies')).rows[0].n, 0);
const secondToken = 'b'.repeat(64);
assert.ok(await pending('prepare', secondToken, ref, randomUUID()));
const before = (await db.query('select created_at,absolute_expires_at from opsflow_onboarding_sessions where token_hash=$1', [token])).rows[0];
const owner = await pending('complete', token, null, null, ' Test Company ', ' Owner ');
assert.equal(owner.role, 'admin'); assert.equal(owner.companyName, 'Test Company'); assert.equal(owner.displayName, 'Owner');
assert.deepEqual(await pending('complete', token, null, null, 'Duplicate', 'Changed'), owner);
await assert.rejects(pending('complete', secondToken, null, null, 'Duplicate', 'Owner'));
assert.equal(await pending('prepare', 'c'.repeat(64), ref, randomUUID()), null);
assert.equal((await db.query('select count(*)::int n from opsflow_companies')).rows[0].n, 1);
assert.equal((await db.query('select count(*)::int n from opsflow_memberships')).rows[0].n, 1);
assert.deepEqual(await call('opsflow_document_gateway', [token, 'list', JSON.stringify({ collection: 'products' })]), []);
assert.equal((await db.query('select count(*)::int n from opsflow_documents')).rows[0].n, 0);
const company = (await db.query('select settings from opsflow_companies')).rows[0].settings;
assert.equal(company.currency, 'MYR'); assert.equal(company.timezone, 'Asia/Kuala_Lumpur');
const after = (await db.query('select created_at,absolute_expires_at from opsflow_app_sessions where token_hash=$1', [token])).rows[0];
assert.deepEqual(after, before); // onboarding never resets the 12-hour clock
await db.exec('update opsflow_memberships set active=false');
assert.equal(await pending('prepare', 'd'.repeat(64), ref, randomUUID()), null);
assert.equal(await call('opsflow_session_context', [token]), null);
const idle = 'e'.repeat(64), idleRef = 'E'.repeat(43);
await pending('prepare', idle, idleRef, randomUUID());
await db.query("update opsflow_onboarding_sessions set created_at=now()-interval '1 hour',last_activity_at=now()-interval '16 minutes',absolute_expires_at=now()+interval '11 hours' where token_hash=$1", [idle]);
assert.equal(await pending('touch', idle, null, null, null, null, true), null);
assert.equal(await pending('complete', idle, null, null, 'Expired', 'Owner'), null);
const absolute = 'f'.repeat(64);
await pending('prepare', absolute, 'F'.repeat(43), randomUUID());
await db.query("update opsflow_onboarding_sessions set created_at=now()-interval '13 hours',absolute_expires_at=now()-interval '1 hour' where token_hash=$1", [absolute]);
assert.equal(await pending('context', absolute), null);
const loggedOut = '1'.repeat(64);
await pending('prepare', loggedOut, 'G'.repeat(43), randomUUID());
const activityBefore = (await db.query('select last_activity_at from opsflow_onboarding_sessions where token_hash=$1', [loggedOut])).rows[0];
await pending('touch', loggedOut);
assert.deepEqual((await db.query('select last_activity_at from opsflow_onboarding_sessions where token_hash=$1', [loggedOut])).rows[0], activityBefore);
await pending('close', loggedOut);
assert.equal(await pending('complete', loggedOut, null, null, 'Revoked', 'Owner'), null);
for (const role of ['anon', 'authenticated']) {
  await db.exec('set role ' + role);
  await assert.rejects(db.query('select * from opsflow_onboarding_sessions'), /permission denied/);
  await assert.rejects(pending('context', loggedOut), /permission denied/);
  await db.exec('reset role');
}
console.log('PASS: verified onboarding isolation, replay denial, validation rollback, idempotency, one company across sessions, empty data, MYR/Malaysia defaults, unchanged absolute expiry, suspended membership denial, idle/absolute/logout no revival, passive polling, browser table/RPC denial');
await db.close();
