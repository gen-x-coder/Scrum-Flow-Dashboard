/*! Radix — MIT License; see LICENSE. Copyright (c) Lucas Bonsel. */
function l_pct(a, p) { 
    if(!a || !a.length) return null; 
    const s = [...a].filter(v => v !== null && !isNaN(v)).sort((x,y) => x - y);
    if(!s.length) return null;
    const i = (p/100) * (s.length - 1); 
    return s[Math.floor(i)] + (s[Math.ceil(i)] - s[Math.floor(i)]) * (i - Math.floor(i)); 
}

// Forecasts include genuine zero-delivery periods. No invented minimum output.
function l_runMC(thrp, sprints = 1) {
    const samples=(thrp||[]).filter(v=>Number.isFinite(v)&&v>=0);
    if(!samples.length) return {p50:null,p15:null,p5:null,sims:[],thrp:[]};
    const results=[];
    for(let i=0;i<10000;i++) {
        let t=0; for(let j=0;j<sprints;j++) t+=samples[Math.floor(Math.random()*samples.length)];
        results.push(t);
    }
    results.sort((a,b)=>a-b);
    const q=p=>results[Math.floor(p*(results.length-1))];
    return {p50:q(.50),p15:q(.15),p5:q(.05),sims:results,thrp:samples};
}
function l_metricStats(values,outlier) {
    const all=values.filter(v=>Number.isFinite(v)); if(!all.length)return null;
    const cut=['90','95','99'].includes(String(outlier))?l_pct(all,Number(outlier)):null;
    const used=cut===null?all:all.filter(v=>v<=cut);
    return {count:all.length,used:used.length,min:Math.min(...all),max:Math.max(...all),avg:used.reduce((a,b)=>a+b,0)/used.length,p50:l_pct(all,50),p85:l_pct(all,85),p95:l_pct(all,95)};
}
// Calendar intervals use local calendar dates (no fixed 24-hour steps across DST).
function l_periodBuckets(items, period, from, now, sprints=[], countSp=false, completeOnly=false) {
    if(!Number.isFinite(+from)||!Number.isFinite(+now)||from>=now)return [];
    const buckets=[]; let mode=period===14?'2 weken':period===7?'week':'maand';
    const closed=sprints.filter(s=>s.state==='closed').map(s=>({start:new Date(s.startDate),end:new Date(s.completeDate||s.endDate),id:s.id})).filter(s=>Number.isFinite(+s.start)&&Number.isFinite(+s.end)&&s.start<s.end&&s.end>from&&s.start<now).sort((a,b)=>a.start-b.start||a.end-b.end);
    // Overlapping sprints cannot be uniquely attributed by completion date; use fixed calendar periods instead.
    const overlap=closed.some((s,i)=>i>0&&s.start<closed[i-1].end);
    if(period===14&&closed.length&&!overlap){
        mode='sprint';for(const s of closed)if(!completeOnly||(s.start>=from&&s.end<=now))buckets.push({start:s.start,end:s.end,d:s.end,t:{},_total:0});
    }else{
        const start=new Date(from);start.setHours(0,0,0,0);
        if(period===30)start.setDate(1);else{start.setDate(start.getDate()-((start.getDay()+6)%7));if(period===14){const day=Date.UTC(start.getFullYear(),start.getMonth(),start.getDate())/86400000;const anchor=Date.UTC(2020,0,6)/86400000;if(((Math.floor((day-anchor)/7)%2)+2)%2)start.setDate(start.getDate()-7);}}
        for(let a=start;a<now;){const b=new Date(a);if(period===30)b.setMonth(b.getMonth()+1);else b.setDate(b.getDate()+period);if(!completeOnly||(a>=from&&b<=now))buckets.push({start:a,end:b,d:a,t:{},_total:0});a=b;}
    }
    for(const item of items){if(!item.r||item.r<from||item.r>now)continue;const b=buckets.find(x=>item.r>=x.start&&item.r<x.end);if(!b)continue;b.t[item.t]=(b.t[item.t]||0)+1;b._total+=countSp?(Number.isFinite(item.sp)&&item.sp>0?item.sp:0):1;}
    buckets.mode=mode;return buckets;
}

function isWorkday(d, holSet) {
    if (!d || isNaN(d.getTime())) return false;
    const dow = d.getDay(); 
    if (dow === 0 || dow === 6) return false;
    const dStr = [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
    return !holSet.has(dStr);
}

function l_dif(a, b, precise = false) {
    const round = x => precise ? x : Number(x.toFixed(2));
    if (!a || !b || isNaN(a.getTime()) || isNaN(b.getTime()) || b < a) return null;
    if (l_state.settings.workdays === "workdays") {
        const s = new Date(a.getFullYear(), a.getMonth(), a.getDate()), e = new Date(b.getFullYear(), b.getMonth(), b.getDate());
        const holSet = new Set(l_state.settings.holidays || []);
        if (+s === +e) return isWorkday(s, holSet) ? round((b-a)/86400000) : 0;
        let t = 0, c = new Date(s);
        while (c <= e) {
            if (isWorkday(c, holSet)) { 
                if (+c === +s) t += (new Date(c.getFullYear(),c.getMonth(),c.getDate()+1) - a)/86400000; 
                else if (+c === +e) t += (b - c)/86400000; 
                else t += 1; 
            }
            c.setDate(c.getDate() + 1);
        }
        return round(t);
    }
    return round((b-a)/86400000);
}


// Fixed-scope completion forecast; null quantile means censored beyond horizon.
function l_forecastCompletion(samples, remaining, random=Math.random) {
    const weeks=(samples||[]).filter(v=>Number.isFinite(v)&&v>=0);
    if(weeks.length<3||!weeks.some(v=>v>0)||!Number.isInteger(remaining)||remaining<=0)return null;
    const runs=[]; const horizon=104;
    for(let i=0;i<10000;i++) {let left=remaining,n=0;while(left>0&&n<horizon){left-=weeks[Math.floor(random()*weeks.length)];n++;}runs.push(left>0?Infinity:n);}
    runs.sort((a,b)=>a-b);const q=p=>{const n=runs[Math.ceil(p*runs.length)-1];return Number.isFinite(n)?n:null;};
    return {p50:q(.5),p85:q(.85),p95:q(.95)};
}
