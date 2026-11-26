const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');const c=vm.createContext({Date,Math,Number});vm.runInContext(fs.readFileSync(path.join(__dirname,'../metrics.js'),'utf8')+'\nthis.api={l_runMC,l_metricStats,l_periodBuckets,l_stability};',c);const {l_runMC,l_metricStats,l_periodBuckets,l_stability}=c.api;
assert.equal(l_runMC([0,0]).p15,0);assert.equal(l_runMC([]).p15,null);assert.equal(l_runMC([2],3).p15,6);
let s=l_metricStats([1,2,3,4,100],'95');assert.equal(s.count,5);assert.equal(s.used,4);assert.equal(s.avg,2.5);assert.equal(s.max,100);assert.equal(s.p85,l_metricStats([1,2,3,4,100],'').p85);
const start=new Date(2025,0,6),now=new Date(2025,0,28),items=[{r:new Date(2025,0,7),t:'Story',sp:3},{r:new Date(2025,0,20),t:'Bug',sp:2}];
let b=l_periodBuckets(items,7,start,now,[],false,true);assert.deepEqual(Array.from(b,x=>x._total),[1,0,1]);
const spr=(a,b)=>({state:'closed',startDate:new Date(2025,0,a),endDate:new Date(2025,0,b)});
b=l_periodBuckets(items,14,start,now,[spr(6,20),spr(13,27)],false,false);assert.equal(b.mode,'2 weken');assert.equal(b.reduce((n,x)=>n+x._total,0),2);
b=l_periodBuckets(items,14,start,now,[spr(6,20),spr(20,27)],false,false);assert.equal(b.mode,'sprint');assert.deepEqual(Array.from(b,x=>x._total),[1,1,0]);console.log('Statistics tests passed: zero delivery, untrimmed percentiles, complete periods, overlap and boundary.');

const dates=n=>new Date(2025,0,n);const schedule=[spr(6,13),spr(15,22),{state:'active',startDate:dates(24),endDate:dates(31)}];const all=[7,14,16,23,25].map(n=>({r:dates(n),c:dates(n),isD:true,t:'Story'}));
b=l_periodBuckets(all,14,start,now,schedule,false,false);assert.equal(b.reduce((n,x)=>n+x._total,0),5);assert.deepEqual(Array.from(b,x=>x.kind),['complete','gap','complete','gap','partial']);b=l_periodBuckets(all,14,start,now,schedule,false,true);assert.deepEqual(Array.from(b,x=>x._total),[1,1]);let st=l_stability(all,start,now,schedule);assert.equal(st.inflow,2);assert.equal(st.outflow,2);assert.equal(st.numPeriods,2);
