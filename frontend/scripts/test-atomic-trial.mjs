import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
for(const file of fs.readdirSync('../supabase/migrations').filter(f=>f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync('../supabase/migrations/'+file,'utf8'));
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
await db.exec(`insert into opsflow_profiles(id,myops_user_ref) values ('${A}','${'A'.repeat(43)}'),('${B}','${'B'.repeat(43)}');
insert into opsflow_companies(id,owner_profile_id,name) values ('${A}','${A}','A'),('${B}','${B}','B');
insert into opsflow_memberships(company_id,profile_id,role) values ('${A}','${A}','admin'),('${B}','${B}','admin');`);
const call=async(fn,args)=>{const params=args.map((_,i)=>'$'+(i+1)).join(',');return (await db.query(`select ${fn}(${params}) result`,args)).rows[0].result;};
const token='a'.repeat(64),other='b'.repeat(64);
assert.ok(await call('opsflow_open_session',['A'.repeat(43),A,token]));
assert.ok(await call('opsflow_open_session',['B'.repeat(43),B,other]));
assert.equal(await call('opsflow_open_session',['Z'.repeat(43),'cccccccc-cccc-4ccc-8ccc-cccccccccccc','c'.repeat(64)]),null);
await assert.rejects(call('opsflow_open_session',['A'.repeat(43),A,'c'.repeat(64)]));
const gateway=(action,payload,digest=token)=>call('opsflow_document_gateway',[digest,action,JSON.stringify(payload)]);
const op=(kind,collection,id,data)=>({kind,collection,id,data});
await gateway('commit',{operations:[op('set','products','one',{stock:10,companyId:A}),op('set','sales','first',{total:25,createdAt:{$serverTimestamp:true}})]});
assert.equal((await gateway('get',{collection:'products',id:'one'})).data.stock,10);
assert.ok((await gateway('get',{collection:'sales',id:'first'})).data.createdAt.$date);
assert.deepEqual(await gateway('list',{collection:'products'},other),[]);
await assert.rejects(gateway('list',{collection:'products',companyId:B}));
await assert.rejects(gateway('commit',{operations:[op('update','products','one',{companyId:B})]}));
await assert.rejects(gateway('commit',{reads:[{collection:'products',id:'one',version:999}],operations:[op('update','products','one',{stock:0})]}));
assert.equal((await gateway('get',{collection:'products',id:'one'})).data.stock,10);
await assert.rejects(gateway('commit',{operations:[op('set','sales','rollback',{total:9}),op('update','products','one',{stock:-1})]}));
assert.equal(await gateway('get',{collection:'sales',id:'rollback'}),null);
await assert.rejects(gateway('commit',{operations:[op('update','users',A,{role:'admin'})]}));
// Two receipts based on the same purchase-order version must not double-count stock.
await gateway('commit',{operations:[op('set','purchase_orders','po-uat',{companyId:A,status:'Sent',items:[{productId:'one',quantity:3,receivedQuantity:0}]})]});
const purchaseVersion=(await gateway('get',{collection:'purchase_orders',id:'po-uat'})).version;
await gateway('commit',{reads:[{collection:'purchase_orders',id:'po-uat',version:purchaseVersion}],operations:[
 op('update','purchase_orders','po-uat',{status:'Fully Received',items:[{productId:'one',quantity:3,receivedQuantity:3}]}),
 op('update','products','one',{stock:13}),op('set','goods_receipts','receipt-one',{totalAmount:15})]});
await assert.rejects(gateway('commit',{reads:[{collection:'purchase_orders',id:'po-uat',version:purchaseVersion}],operations:[
 op('set','goods_receipts','receipt-duplicate',{totalAmount:15}),op('update','products','one',{stock:16})]}));
assert.equal((await gateway('get',{collection:'products',id:'one'})).data.stock,13);
assert.equal(await gateway('get',{collection:'goods_receipts',id:'receipt-duplicate'}),null);
const trial='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const rid=n=>`eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12,'0')}`;
const write=(n,p)=>call('opsflow_trial_document_gateway',[token,trial,new Date(Date.now()+3600000).toISOString(),rid(n),JSON.stringify(p)]);
const payload={operations:[op('set','sales','trial-first',{total:10})]};
await write(1,payload);await write(1,payload);
assert.equal((await gateway('get',{collection:'sales',id:'trial-first'})).version,1);
await assert.rejects(write(1,{operations:[op('set','sales','changed',{total:20})]}));
await assert.rejects(write(2,{operations:[op('set','sales','trial-failed',{total:5}),op('update','products','one',{stock:-1})]}));
assert.equal(await gateway('get',{collection:'sales',id:'trial-failed'}),null);
assert.equal((await db.query('select count(*)::int n from opsflow_trial_usage')).rows[0].n,1);
for(let n=2;n<=30;n++) await write(n+10,{operations:[op('set','sales','trial-'+n,{total:1})]});
await assert.rejects(write(99,{operations:[op('set','sales','over-limit',{total:1})]}));
assert.equal(await gateway('get',{collection:'sales',id:'over-limit'}),null);
assert.equal((await db.query('select count(*)::int n from opsflow_trial_usage')).rows[0].n,30);
assert.equal((await db.query('select count(*)::int n from opsflow_trial_receipts')).rows[0].n,30);
const flowTrial='ffffffff-ffff-4fff-8fff-ffffffffffff';
const flowWrite=n=>call('opsflow_trial_document_gateway',[token,flowTrial,new Date(Date.now()+3600000).toISOString(),rid(n+100),JSON.stringify({operations:[op('set','purchase_orders','trial-po-'+n,{status:'Draft'})]})]);
await flowWrite(1);await flowWrite(2);await assert.rejects(flowWrite(3));
assert.equal(await gateway('get',{collection:'purchase_orders',id:'trial-po-3'}),null);
await assert.rejects(call('opsflow_trial_document_gateway',[token,flowTrial,new Date(Date.now()-1000).toISOString(),rid(999),JSON.stringify({operations:[]})]));
for(const role of ['anon','authenticated']) {
 await db.exec('set role '+role);
 await assert.rejects(call('opsflow_trial_document_gateway',[token,flowTrial,new Date(Date.now()+3600000).toISOString(),rid(999),JSON.stringify({operations:[]})]),/permission denied/);
 await db.exec('reset role');
}
console.log('PASS: atomic data/quota rollback, idempotent retry and changed payload rejection');
await db.exec(`update opsflow_app_sessions set last_activity_at=now()-interval '16 minutes',created_at=now()-interval '1 hour',absolute_expires_at=now()+interval '11 hours' where id='${A}';`);
assert.equal(await call('opsflow_touch_session',[token,true]),false);
assert.equal(await call('opsflow_session_context',[token]),null);
await assert.rejects(gateway('list',{collection:'products'}));
await call('opsflow_close_session',[other]);
assert.equal(await call('opsflow_touch_session',[other,true]),false);
for(const role of ['anon','authenticated']) {
 await db.exec('set role '+role);
 await assert.rejects(db.query('select * from opsflow_documents'),/permission denied/);
 await assert.rejects(call('opsflow_session_context',[token]),/permission denied/);
 await db.exec('reset role');
}
console.log('PASS: migrations, mapped identity only, replay denial, tenant isolation, company reassignment denial, optimistic conflicts, atomic rollback, server timestamps, expired/revoked no-revival, browser table/RPC denial');
await db.close();
