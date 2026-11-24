import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../../supabase/migrations/',import.meta.url); const db=new PGlite();
try {
 await db.exec('create role anon; create role authenticated; create role service_role;');
 for(const f of ['20261029183440_opsflow_staging_foundation.sql','20261029183829_opsflow_document_gateway.sql','20261124080531_opsflow_central_organization_binding.sql']) await db.exec(await readFile(new URL(f,root),'utf8'));
 const profile='00000000-0000-4000-8000-000000000001',a='00000000-0000-4000-8000-000000000002',b='00000000-0000-4000-8000-000000000003',oa='00000000-0000-4000-8000-000000000004',ob='00000000-0000-4000-8000-000000000005',sid='00000000-0000-4000-8000-000000000006';
 await db.query('insert into opsflow_profiles(id,myops_user_ref) values ($1,$2)',[profile,'x'.repeat(43)]);
 for(const [c,o] of [[a,oa],[b,ob]]) {await db.query("insert into opsflow_companies(id,owner_profile_id,name) values($1,$2,'test')",[c,profile]);await db.query("insert into opsflow_memberships(company_id,profile_id,role) values($1,$2,'admin')",[c,profile]);await db.query('insert into opsflow_organization_companies(organization_id,company_id,enabled) values($1,$2,true)',[o,c]);}
 const result=await db.query('select opsflow_open_organization_session($1,$2,$3,$4) as v',['x'.repeat(43),sid,'a'.repeat(64),oa]); assert.equal(result.rows[0].v.companyId,a);
 await assert.rejects(db.query("select opsflow_document_gateway($1,'get',$2::jsonb)",['a'.repeat(64),JSON.stringify({companyId:b,collection:'products',id:'x'})]));
 await db.query('update opsflow_organization_companies set enabled=false where organization_id=$1',[oa]);
 assert.equal((await db.query('select opsflow_session_context($1) as v',['a'.repeat(64)])).rows[0].v,null);
 console.log('OpsFlow mapped tenant, cross-company denial, mapping revocation PASS');
} finally {await db.close()}
