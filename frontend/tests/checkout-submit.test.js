const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function checkout(createSale){
 const state=[null,{p:{product:{id:'p',name:'Product',sku:'P',stock:5,sellingPrice:10,costPrice:5},quantity:1}}];let index=0;
 const react={useMemo:f=>f(),useRef:value=>({current:value}),useState:value=>[state[index++]??value,()=>{}],createElement:(type,props,...children)=>({type,props:props||{},children})};
 const source=fs.readFileSync(require('node:path').join(__dirname,'../app/app/pos.tsx'),'utf8'),module={exports:{}};
 const requireMock=id=>{
  if(id==='react')return {...react,default:react};
  if(id==='react-native')return {View:'View',Text:'Text',TouchableOpacity:'Touch',StyleSheet:{create:x=>x}};
  if(id==='expo-router')return {useRouter:()=>({})};
  if(id.includes('LocaleContext'))return {useLocale:()=>({tx:x=>x})};
  if(id.includes('DataContext'))return {useData:()=>({products:[],createSale})};
  if(id.includes('designSystem'))return Object.fromEntries(['BizFlowButton','BizFlowDashboardShell','BizFlowKpiCard','BizFlowSectionCard','BizFlowStatusChip','BizFlowTable'].map(x=>[x,x]));
  if(id.includes('currency'))return {formatMYR:x=>String(x)};
  throw new Error(id);
 };
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText,{module,exports:module.exports,require:requireMock});
 const tree=module.exports.default();let handler;
 function visit(n){if(!n||typeof n!=='object')return;if(n.type==='BizFlowButton'&&n.props.title==='Checkout')handler=n.props.onPress;(n.children||[]).flat(Infinity).forEach(visit)}visit(tree);
 assert.ok(handler);return handler;
}
test('rapid repeated checkout submits only once while the sale is pending',async()=>{
 let calls=0,finish;const handler=checkout(()=>{calls++;return new Promise(r=>{finish=r})});
 const first=handler();await handler();assert.equal(calls,1);finish();await first;
});
test('failed checkout releases its lock for a deliberate retry',async()=>{
 let calls=0;const handler=checkout(async()=>{calls++;throw new Error('stock changed')});
 await handler();await handler();assert.equal(calls,2);
});
