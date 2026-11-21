import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const db = new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
await db.exec('create table public.release_privilege_fixture(id int); grant all on public.release_privilege_fixture to anon, authenticated, service_role;');
for (const file of fs.readdirSync('../supabase/migrations').filter(f => f.endsWith('.sql')).sort()) {
  await db.exec(fs.readFileSync('../supabase/migrations/' + file, 'utf8'));
}
for (const role of ['anon', 'authenticated']) {
  for (const privilege of ['TRUNCATE', 'REFERENCES', 'TRIGGER']) {
    const result = await db.query('select has_table_privilege($1, $2, $3) allowed', [role, 'public.release_privilege_fixture', privilege]);
    assert.equal(result.rows[0].allowed, false, `${role} ${privilege}`);
  }
}
assert.equal((await db.query("select has_table_privilege('service_role','public.release_privilege_fixture','SELECT') allowed")).rows[0].allowed, true);
await db.exec('set role anon');
await assert.rejects(db.exec('truncate public.release_privilege_fixture'), /permission denied/);
await db.close();
console.log('PASS: browser schema privileges revoked, direct TRUNCATE denied, service-role data access retained');
