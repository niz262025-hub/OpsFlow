const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const moduleUnderTest={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/utils/inventoryThreshold.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:moduleUnderTest,exports:moduleUnderTest.exports});
const {getMinStockThreshold,isLowStock,parseMinStockValue}=moduleUnderTest.exports;
test('zero threshold survives setup and shows an alert only at zero stock',()=>{
 assert.equal(parseMinStockValue('0'),0);assert.equal(getMinStockThreshold(0),0);
 assert.equal(isLowStock(0,0),true);assert.equal(isLowStock(1,0),false);
});
test('missing thresholds default to ten and alert at the inclusive boundary',()=>{
 for(const value of [undefined,null]){assert.equal(getMinStockThreshold(value),10);assert.equal(isLowStock(10,value),true);assert.equal(isLowStock(11,value),false);}
 assert.equal(parseMinStockValue(''),10);assert.equal(parseMinStockValue('invalid'),10);
});
