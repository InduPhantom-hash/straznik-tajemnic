const fs=require('fs'),Module=require('module'),path=require('path'),ts=require('/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/node_modules/typescript');
const root='/Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src';
const old=Module._resolveFilename;Module._resolveFilename=function(req,...rest){return old.call(this,req.startsWith('@/')?path.join(root,req.slice(2)):req,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,f);
const {resolveEraContext}=require(root+'/lib/era/resolve-era-context.ts');
const {findEraManifest}=require(root+'/lib/era/manifests.ts');
const {buildEraNarrativeRules,getEraHandoutDefaults}=require(root+'/lib/era/runtime.ts');
const {assertExactEraContext}=require(root+'/lib/world-setup/validation.ts');
const ctx=(year,country)=>resolveEraContext({userSelection:{year,country}});
const cases=[];
for(const [year,country] of [[1895,'GB'],[1895,'US'],[1925,'US'],[1943,'PL'],[1971,'PL'],[1973,'US'],[1973,'PL'],[1985,'PL'],[1994,'PL'],[1995,'PL'],[2005,'PL'],[2006,'PL'],[2020,'US'],[2020,'FR']]){const c=ctx(year,country);cases.push({year,country,manifest:findEraManifest(year,c.countryCode,c.regionProfile)?.id??null,profile:c.regionProfile})}
let invalidAccepted;try{assertExactEraContext({...ctx(1925,'US'),effectiveYear:-1});invalidAccepted=true}catch{invalidAccepted=false}
const output={cases,invalidYearAcceptedByPreflightGuard:invalidAccepted,impossibleDate:resolveEraContext({sceneDate:'2001-02-31',adventure:{country:'PL'}}),userSelectionOverridden:resolveEraContext({adventure:{yearRange:'1983-1999',country:'PL'},userSelection:{year:1999,country:'PL'}}),gaslightRules:buildEraNarrativeRules(ctx(1895,'GB')),handout:getEraHandoutDefaults(resolveEraContext({sceneDate:'2001-11-14',adventure:{country:'PL'}}))};
output.boundaries=[];for(const year of [1889,1890,1899,1900,1919,1920,1929,1930,1939,1940,1949,1950,1970,1972,1973,1974,1975,1979,1980,1989,1990,1999,2000,2005,2006,2019,2020,2026])for(const country of ['PL','US','GB','FR']){const c=ctx(year,country);output.boundaries.push({year,country,manifest:findEraManifest(year,country,c.regionProfile)?.id??null})}
output.missingInputs=[];for(const input of [{adventure:{country:'PL'}},{adventure:{yearRange:'2001'}}]){try{const c=resolveEraContext(input);assertExactEraContext(c);output.missingInputs.push({input,result:c})}catch(e){output.missingInputs.push({input,error:e.message})}}
const {getEraPromptInjection}=require(root+'/lib/era-presets.ts');output.legacy1973Injection=getEraPromptInjection('prl-1970s');
fs.writeFileSync('/private/tmp/era-probes.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
