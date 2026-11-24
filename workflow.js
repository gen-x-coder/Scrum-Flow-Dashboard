/*! Radix — MIT License; see LICENSE. Copyright (c) Lucas Bonsel. */
const RadixWorkflow = (()=>{
    const valid=v=>v!=null&&Number.isFinite(+v);
    const categories=['todo','progress','done'];
    function fallback(parent, children){
        if(parent.radixHistory?.start)return null;
        const created=new Date(parent.fields?.created), h=parent.radixHistory;
        if(!valid(created))return null;
        const done=h?.done ?? (parent.fields?.status?.statusCategory?.key==='done');
        const end=done?(h?.finish || new Date(parent.fields?.resolutiondate||NaN)):new Date();
        if(!valid(end))return null;
        const starts=children.filter(c=>c.radixHistory?.start && c.fields?.parent && (String(c.fields.parent.id||'')===String(parent.id||'')&&parent.id!=null || c.fields.parent.key===parent.key)).map(c=>c.radixHistory.start).filter(s=>valid(s)&&s>=created&&s<=end);
        return starts.length?new Date(Math.min(...starts.map(Number))):null;
    }
    async function enrich(base,parents,load,user,config,progress=()=>{},fetcher=fetch){
        const targets=parents.filter(p=>!p.radixHistory?.start && Array.isArray(p.fields?.subtasks)&&p.fields.subtasks.length);
        const keys=[...new Set(targets.flatMap(p=>p.fields.subtasks.map(s=>s.key).filter(Boolean)))];
        let errors=0;
        async function metadata(list){
            const rows=[];let next=0;
            await Promise.all(Array.from({length:Math.min(3,list.length)},async()=>{while(next<list.length){const key=list[next++];try{
                const r=await fetcher(base+'/rest/api/2/issue/'+encodeURIComponent(key)+'?fields=created,updated,status,parent,issuetype',{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}});
                if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();if(d.key!==key||!d.fields?.parent||d.fields?.issuetype?.subtask!==true)throw Error('Geen geldige subtaak');rows.push(d);
            }catch(e){errors++;}}}));return rows;
        }
        const rows=await metadata(keys);
        let historyQuality=null;
        if(rows.length)historyQuality=await load(base,rows,progress,config,user,()=>metadata(rows.map(r=>r.key)));
        const byKey=new Map(rows.map(r=>[r.key,r]));let derived=0;
        for(const p of targets){const start=fallback(p,p.fields.subtasks.map(s=>byKey.get(s.key)).filter(Boolean));if(start){p.radixSubtaskStart=start;derived++;}}
        return {targets:targets.length,children:keys.length,metadataErrors:errors,derived,historyQuality};
    }
    function phase(row,diff){
        const h=row.history;if(!row.isD||!h?.done||!valid(h.finish)||!Array.isArray(h.intervals))return null;
        const totals={todo:0,progress:0,done:0};
        for(const i of h.intervals){if(!categories.includes(i.state))return null;const d=diff(i.from,i.to,true);if(!Number.isFinite(d)||d<0)return null;totals[i.state]+=d;}
        return totals;
    }
    function stateAt(row,time){
        const h=row.history;if(!h||!valid(row.c)||time<+(h.intervals?.[0]?.from||row.c))return null;
        for(const i of h.intervals||[])if(time>=+i.from&&time<+i.to)return i.state;
        const last=h.intervals?.at(-1);
        if(last&&time<+last.to)return null;
        return h.done?'done':categories.includes(row.currentCategory)?row.currentCategory:null;
    }
    function cfd(rows,from,to,steps=100){
        const eligible=rows.filter(r=>r.history&&valid(r.c)&&(r.history.done||categories.includes(r.currentCategory)));
        if(!valid(from)||!valid(to)||+from>=+to)return {eligible:eligible.length,points:[]};
        const points=Array.from({length:steps+1},(_,i)=>{const time=+from+(+to-+from)*i/steps;const p={time,todo:0,progress:0,done:0};for(const r of eligible){const s=stateAt(r,time);if(s)p[s]++;}return p;});
        return {eligible:eligible.length,points};
    }
    return {fallback,enrich,phase,stateAt,cfd};
})();
