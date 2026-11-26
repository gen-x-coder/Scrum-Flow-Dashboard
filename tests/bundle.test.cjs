const assert=require('node:assert/strict'), vm=require('node:vm'), fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/radix.js'),'utf8');
async function boot(org,page,url){
 const roots={'flow-app-container':{id:'flow-app-container'},custom:{id:'custom'}}, requests=[], errors=[];
 const doc={currentScript:{src:url},readyState:'complete',getElementById:id=>roots[id]||null,createElement:tag=>({tag,style:{}}),querySelectorAll:()=>[],head:{appendChild(el){if(el.tag!=='script')return;requests.push(el.src);queueMicrotask(()=>{if(org===undefined)el.onerror();else{ctx.RADIX_CONFIG=org;el.onload();}})}}};
 const ctx=vm.createContext({URL,Date,document:doc,console:{warn:()=>{},error:e=>errors.push(e)},FLOW_CONFIG:page,localStorage:{getItem:()=>null,setItem:()=>{}},addEventListener:()=>{},removeEventListener:()=>{},setTimeout,clearTimeout});ctx.window=ctx;
 vm.runInContext(source,ctx);for(let n=0;n<100&&!roots.custom.innerHTML&&!roots['flow-app-container'].innerHTML;n++)await new Promise(r=>setTimeout(r,2));
 assert.equal(errors.length,0);assert.equal(requests.length,1);assert.equal(typeof ctx.l_hide,'function');assert.equal(typeof ctx.RadixHistory.clearCache,'function');return {ctx,roots,requests};
}
(async()=>{const url='https://confluence.test/download/attachments/464005756/radix.js?api=v2&version=4';let b=await boot(undefined,{jiraUrl:'https://jira.test'},url);assert.match(b.roots['flow-app-container'].innerHTML,/Genereer Dashboard/);assert.equal(b.ctx.FLOW_CONFIG.defaultMonths,3);let u=new URL(b.requests[0]);assert.equal(u.pathname,'/download/attachments/464005756/config.js');assert.equal(u.searchParams.get('api'),'v2');assert.equal(u.searchParams.has('version'),false);
 b=await boot({jiraUrl:'https://jira.test',containerId:'custom',defaultMonths:6},{defaultMonths:1},url);assert.match(b.roots.custom.innerHTML,/Genereer Dashboard/);assert.equal(b.ctx.FLOW_CONFIG.defaultMonths,1);console.log('Bundle boot: optional config, relative attachment URL, API parameter, precedence and UI hooks passed.');})().catch(e=>{console.error(e);process.exitCode=1;});
