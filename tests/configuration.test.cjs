const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'..'), read=name=>fs.readFileSync(path.join(dir,name),'utf8');
const warnings=[], c=vm.createContext({URL,Date,console:{warn:(...x)=>warnings.push(x.join(' '))}});
vm.runInContext(read('configuration.js')+'\nthis.C=RadixConfig;',c);const C=c.C;
const plain=x=>JSON.parse(JSON.stringify(x));
const base=C.resolve();assert.equal(base.defaultMonths,3);assert.deepEqual(plain(base.defaults.visible),['lt','ct','qt','fe']);
const mixed=C.resolve({jiraUrl:'https://jira.test/',fields:{storyPoints:'customfield_42'},defaults:{visible:['ct','scat'],holidays:['2026-12-25']},statusCategories:{Review:'progress',Wait:'todo'},cacheHours:5},{fields:{team:null},defaults:{outlier:'90'},statusCategories:{REVIEW:'todo'},defaultMonths:6});
assert.equal(mixed.jiraUrl,'https://jira.test');assert.equal(mixed.fields.storyPoints,'customfield_42');assert.equal(mixed.fields.team,null);assert.equal(mixed.defaultMonths,6);assert.equal(mixed.cacheHours,5);assert.deepEqual(plain(mixed.statusCategories),{review:'todo',wait:'todo'});assert.deepEqual(plain(mixed.defaults.visible),['ct','scat']);assert.equal(mixed.defaults.outlier,'90');
const invalid=C.resolve({defaultMonths:0,cacheHours:100,historyCache:'false',fields:{storyPoints:'bad'},defaults:{outlier:'42',holidays:['2026-02-30']},privacyModus:false});assert.equal(invalid.defaultMonths,3);assert.equal(invalid.historyCache,true);assert.equal(invalid.fields.storyPoints,'customfield_10002');assert.equal(invalid.cacheHours,24);assert.equal(warnings.length,7);
const saved=C.preferences(mixed,{visible:['lt','rs','team'],outlier:'99',historyCache:false,privacyModus:false,groups:{x:['y']}});assert.deepEqual(plain(saved.visible),['lt','team','mc-issues','mc-sp']);assert.equal(saved.outlier,'99');assert.equal(saved.historyCache,undefined);assert.equal(saved.groups,undefined);assert.equal(saved.privacyModus,undefined);assert.deepEqual(plain(C.preferences(mixed,{}).visible),['ct','scat']);
assert.equal(C.fromDate(3,new Date(2026,10,24)),'2026-08-24');assert.equal(C.fromDate(3,new Date(2026,4,31)),'2026-02-28');assert.equal(C.fromDate(3,new Date(2024,4,31)),'2024-02-29');
const jql=C.boardJQL('ABC','2026-08-24');assert.match(jql,/Project="ABC" AND \(updated >= "2026-08-24" OR statusCategory != Done\) AND issuetype not in subTaskIssueTypes\(\)/);assert.match(C.boardJQL('ABC','2026-08-24',{Review:'progress'}),/OR status in \("Review"\)/);assert.throws(()=>C.boardJQL('ABC','2026-02-30'));assert.throws(()=>C.boardJQL('ABC" OR x','2026-08-24'));
const cutoff=new Date(2026,7,24);assert(C.includesIssue({isD:false,c:new Date(2020,0,1)},cutoff));assert(C.includesIssue({isD:true,c:new Date(2020,0,1),r:new Date(2026,8,1)},cutoff));assert(!C.includesIssue({isD:true,r:new Date(2026,0,1)},cutoff));
// Exercise actual loader and app, including fallback, same-directory loading and overrides.
async function boot(url,org,page){
 const roots={ 'flow-app-container':{id:'flow-app-container'},custom:{id:'custom'} },elements={}, requests=[], warns=[];
 const doc={currentScript:{src:url},readyState:'complete',getElementById:id=>roots[id]||elements[id]||null,createElement:tag=>({tag,style:{}}),querySelectorAll:()=>[],head:{appendChild(el){if(el.tag!=='script')return;requests.push(el.src);queueMicrotask(()=>{try{const name=new URL(el.src).pathname.split('/').at(-1);if(name==='config.js'){if(org===undefined){el.onerror();return;}context.RADIX_CONFIG=org;}else vm.runInContext(read(name),context,{filename:name});el.onload();}catch(e){el.onerror();}});}}};
 const context=vm.createContext({URL,Date,document:doc,console:{warn:(...a)=>warns.push(a),error:()=>{}},FLOW_CONFIG:page,localStorage:{getItem:()=>null,setItem:()=>{}},addEventListener:()=>{},removeEventListener:()=>{},setTimeout,clearTimeout});context.window=context;
 vm.runInContext(read('dashboard.js'),context);for(let n=0;n<100&&!roots.custom.innerHTML&&!roots['flow-app-container'].innerHTML;n++)await new Promise(r=>setTimeout(r,2));
 return {context,requests,roots,warns};
}
(async()=>{let b=await boot('https://scripts.example.test/ji../dashboard.js?abc',undefined,{jiraUrl:'https://jira.test'});assert.match(b.roots['flow-app-container'].innerHTML,/Genereer Dashboard/);assert(b.requests.some(u=>u.startsWith('https://scripts.example.test/ji../config.js?')));assert.equal(b.context.FLOW_CONFIG.defaultMonths,3);
 b=await boot('https://intranet.test/too../dashboard.js',{jiraUrl:'https://jira.test',containerId:'custom',fields:{storyPoints:'customfield_42'},defaults:{visible:['ct','scat'],throughputPeriod:'week'}},{defaultMonths:6});assert.match(b.roots.custom.innerHTML,/Genereer Dashboard/);assert(b.requests.every(u=>u.startsWith('https://intranet.test/too../')));assert.equal(b.context.FLOW_CONFIG.defaultMonths,6);assert.equal(vm.runInContext('L_CFG.F.sp',b.context),'customfield_42');assert.deepEqual(plain(vm.runInContext('l_state.settings.visible',b.context)),['ct','scat']);
 // Real app processing with a long-running open story, old completed story and a recently finished old story.
 const result=vm.runInContext(`window.l_drawDash=()=>{};l_state.historyQuality={errors:0,incomplete:0};
 const old='2024-01-01T00:00:00Z',done='2025-12-31T00:00:00Z';
 const story=(key,closed,r)=>({key,fields:{issuetype:{name:'Story'},created:old,resolutiondate:r,status:{statusCategory:{key:closed?'done':'new'}},customfield_42:8}});
 l_state.raw=[story('A-1',false,null),story('A-2',true,done),story('A-3',true,'2026-09-01T00:00:00Z')];
 const get=document.getElementById;document.getElementById=id=>id==='l_dat'?{value:'2026-08-24'}:get(id);
 l_processData();({count:l_state.filtered.length,open:l_state.filtered.filter(x=>!x.isD).length,lt:l_state.filtered.find(x=>x.isD).lt,sp:l_state.filtered[0].sp})`,b.context);
 assert.equal(result.count,2);assert.equal(result.open,1);assert(result.lt>900);assert.equal(result.sp,8);

 const teamResult=vm.runInContext(`
 l_state.raw=[{key:'T-1',fields:{issuetype:{name:'Story'},created:'2026-08-25',status:{statusCategory:{key:'new'}}}},{key:'T-2',fields:{issuetype:{name:'Debug-taak'},created:'2026-08-25',status:{statusCategory:{key:'new'}}}}];
 // Configure a multi-valued team field in the same actual app.
 L_CFG.F.team='customfield_99';l_state.raw[0].fields.customfield_99=[{value:'A'},{name:'B'},{value:'A'}];
 l_processData();({count:l_state.filtered.length,teams:l_state.filtered[0].teams})`,b.context);
 assert.equal(teamResult.count,1);assert.deepEqual(plain(teamResult.teams),['A','B']);
 console.log('Configuration tests passed: merge, validation, migration, local dates, JQL and actual loader/app in mocked DOM, external/internal hosting and missing config.');})().catch(e=>{console.error(e);process.exitCode=1;});
