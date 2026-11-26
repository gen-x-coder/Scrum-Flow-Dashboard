const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{webcrypto,createHash}=require('node:crypto');
// Simulates IndexedDB asynchronous requests, structured clones and transaction completion.
const records=new Map();
const db={createObjectStore(){},close(){},transaction(){let pending=0;const tx={};let timer;const settle=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!pending)tx.oncomplete?.()},0)};
 const req=fn=>{pending++;const r={};setTimeout(()=>{r.result=fn();r.onsuccess?.();pending--;settle()},0);return r;};
 tx.objectStore=()=>({get:k=>req(()=>structuredClone(records.get(k))),put:v=>req(()=>{records.set(v.key,structuredClone(v));return v.key}),clear:()=>req(()=>records.clear()),openCursor:()=>{const rows=[...records.values()];let i=0;const r={};pending++;const next=()=>setTimeout(()=>{const value=rows[i++];r.result=value?{value,delete:()=>records.delete(value.key),continue:next}:null;r.onsuccess?.();if(!value){pending--;settle()}},0);next();return r;}});settle();return tx;}};
const indexedDB={open(){const req={result:db};setTimeout(()=>req.onsuccess?.(),0);return req;}};
const ctx=vm.createContext({Date,Map,Set,Number,String,Object,Array,Promise,setTimeout,clearTimeout,TextEncoder,crypto:webcrypto,indexedDB});
const dir=path.join(__dirname,'..');
vm.runInContext(fs.readFileSync(path.join(dir,'history-cache.js'),'utf8')+'\nthis.C=RadixHistoryCache;',ctx);
const C=ctx.C;const status={id:'1',name:'Done',statusCategory:{key:'done'}},other={id:'2',name:'Open',statusCategory:{key:'new'}};
const fields={created:'2025-01-01T00:00:00Z',updated:'2025-01-05T00:00:00Z',status};
const issue={id:'123',key:'T-1',fields};
const diag=()=>({notFound:0,changed:0,expired:0,missingFields:0,written:0});
(async()=>{for(const x of ['abc','', 'Radix 😀','a'.repeat(1000)]) assert.equal(C.sha256(new TextEncoder().encode(x)),createHash('sha256').update(x).digest('hex'));
 assert(C.sameFields(fields,{...fields,updated:'2025-01-05T01:00:00+01:00'}));assert(!C.sameFields(fields,{...fields,updated:undefined}));
 let d=diag(),c=await C.connect('jira',{key:'A'},[status,other],{},d);assert.equal(d.status,'actief');assert.equal(await c.get(issue),null);await c.put(issue,{finish:new Date(fields.updated),intervals:[]});await c.flush();assert.equal(d.written,1);c.close();
 d=diag();ctx.crypto=undefined;c=await C.connect('jira',{key:'A'},[other,status],{},d);assert.equal(d.hash,'lokale SHA-256');await c.prime([issue]);assert.equal(+(await c.get({...issue,key:'RENAMED-1'})).finish,+new Date(fields.updated));assert.equal(await c.get({...issue,fields:{...fields,updated:'2025-01-06T00:00:00Z'}}),null);assert.equal(d.changed,1);c.close();
 c=await C.connect('jira',{key:'B'},[other,status],{},diag());assert.equal(await c.get(issue),null);c.close();
 // A custom shorter TTL never inherits an existing 24-hour record; the original scope stays usable.
 c=await C.connect('jira',{key:'A'},[other,status],{cacheHours:2},diag());assert.equal(await c.get(issue),null);const before=Date.now();await c.put(issue,{finish:new Date(fields.updated),intervals:[]});await c.flush();assert([...records.values()].some(v=>v.expires>=before+7200000&&v.expires<=Date.now()+7200000));c.close();
 c=await C.connect('jira',{key:'A'},[other,status],{cacheHours:2},diag());assert(await c.get(issue));await c.put(issue,{finish:new Date(fields.updated),intervals:[]},3600000);await c.flush();assert([...records.values()].some(v=>v.expires>Date.now()&&v.expires<=Date.now()+3600000));c.close();
 c=await C.connect('jira',{key:'A'},[other,status],{},diag());assert(await c.get(issue));c.close();assert(await C.clear());assert.equal(records.size,0);console.log('Actual cache code with simulated IndexedDB: hash, date normalization, cross-board/account, persistence, configurable TTL and one-hour cap, invalidation, clear passed.');})().catch(e=>{console.error(e);process.exitCode=1});
