const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const filename = path.join(__dirname, '../src/components/MyopsEntry.tsx');
function run(auth, {admin=false, native=false}={}) {
  const calls = [];
  const effects = [];
  const module = {exports:{}};
  const requireMock = id => {
    if(id === 'react') return {useEffect: fn => effects.push(fn)};
    if(id === 'react-native') return {Linking:{openURL:url=>calls.push(['native',url])}};
    if(id === 'expo-router') return {router:{replace:url=>calls.push(['app',url])}};
    if(id.includes('AuthContext')) return {useAuth:()=>auth};
    if(id.includes('myopsAppAccess')) return {myopsPortalUrl:()=> 'https://www.myops.com.my/'};
    throw new Error(id);
  };
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const context={module,exports:module.exports,require:requireMock,URL};
  if(!native) context.window={location:{replace:url=>calls.push(['portal',url])}};
  vm.runInNewContext(code,context);
  assert.equal(module.exports.default({admin}),null);
  effects.forEach(fn=>fn());
  return calls;
}
test('entry waits for server session hydration without redirecting',()=>{
 assert.deepEqual(run({loading:true,user:null,onboardingRequired:false}),[]);
});
test('valid existing app session opens dashboard without login',()=>{
 assert.deepEqual(run({loading:false,user:{uid:'owner'},onboardingRequired:false}),[['app','/app']]);
});
test('verified pending onboarding opens company setup without login',()=>{
 assert.deepEqual(run({loading:false,user:null,onboardingRequired:true}),[['app','/onboarding']]);
});
test('missing app session returns directly to central MYOPS without prompt',()=>{
 assert.deepEqual(run({loading:false,user:null,onboardingRequired:false}),[['portal','https://www.myops.com.my/']]);
});
test('legacy admin routes always use central administration, ignoring local app identity',()=>{
 assert.deepEqual(run({loading:false,user:{uid:'owner'},onboardingRequired:false},{admin:true}),[['portal','https://www.myops.com.my/admin/audit']]);
});
test('native fallback also opens only MYOPS',()=>{
 assert.deepEqual(run({loading:false,user:null,onboardingRequired:false},{native:true}),[['native','https://www.myops.com.my/']]);
});
