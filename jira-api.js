/*! Radix — MIT License; see LICENSE. Copyright (c) Lucas Bonsel. */
// Only status transitions are retained; no changelog authors or other field changes.
const RadixHistory = (() => {
    const date = value => { const d = value ? new Date(value) : null; return d && Number.isFinite(+d) ? d : null; };
    const norm = v => String(v ?? '').trim().toLowerCase();
    const category = s => ({new:'todo', indeterminate:'progress', done:'done'})[s?.statusCategory?.key] || null;
    function classifier(statuses, config = {}) {
        const ids = new Map(), names = new Map();
        for (const s of statuses) {
            const cat = category(s);
            if (s.id != null) ids.set(String(s.id), cat);
            const n = norm(s.name);
            if (names.has(n) && names.get(n) !== cat) names.set(n, null); else names.set(n, cat);
        }
        const overrides = config.statusCategories || {};
        return (id, name) => {
            const n = norm(name), override = Object.entries(overrides).find(([k]) => norm(k) === n)?.[1];
            if (['todo','progress','done'].includes(override)) return override;
            return ids.get(String(id)) || names.get(n) || null;
        };
    }
    function reconstruct(fields, histories, classify) {
        const c = date(fields.created), current = classify(fields.status?.id, fields.status?.name) || category(fields.status);
        if (!c || !current || !Array.isArray(histories)) return null;
        const events = histories.flatMap(h => (h.items || []).filter(i => norm(i.field) === 'status' || norm(i.fieldId) === 'status').map(i => ({at:date(h.created), from:classify(i.from,i.fromString), to:classify(i.to,i.toString)})));
        if (events.some(e => !e.at || e.at < c || e.at > new Date() || !e.from || !e.to)) return null;
        events.sort((a,b)=>a.at-b.at);
        let state = events.length ? events[0].from : current, start = state === 'progress' ? c : null;
        let finish = state === 'done' ? c : null, reopened = 0, cursor = c;
        const intervals = [];
        for (const e of events) {
            if (state !== e.from) return null;
            intervals.push({state, from:cursor, to:e.at});
            if (state === 'done' && e.to !== 'done') { reopened++; finish = null; }
            if (!start && e.to === 'progress') start = e.at;
            if (state !== 'done' && e.to === 'done') finish = e.at;
            state = e.to; cursor = e.at;
        }
        if (state !== current) return null;
        // A current Done issue with no transition history is not evidence it was completed at creation.
        if (state === 'done' && !events.length) return null;
        if (state === 'done' && (!finish || (start && start > finish))) return null;
        if (state === 'done' && finish >= cursor) intervals.push({state,from:cursor,to:finish});
        return {start, finish:state === 'done' ? finish : null, done:state === 'done', reopened, intervals};
    }
    async function getJSON(url, fetcher = fetch) {
        for (let attempt=0; attempt<3; attempt++) {
            const r = await fetcher(url,{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}});
            if (r.ok) return r.json();
            if (r.status === 429 || r.status === 503) {
                if (attempt < 2) { const seconds = Number(r.headers?.get('Retry-After')); await new Promise(resolve=>setTimeout(resolve,Math.min(15000,Math.max(1000,seconds*1000 || 1000*(attempt+1))))); continue; }
            }
            throw new Error('Jira HTTP '+r.status);
        }
    }
    async function completeHistory(base,key,fetcher=fetch) {
        const url = base+'/rest/api/2/issue/'+encodeURIComponent(key);
        const data = await getJSON(url+'?fields=status,created,updated&expand=changelog',fetcher);
        const embedded = data.changelog;
        if (Array.isArray(embedded?.histories) && Number.isInteger(embedded.total) && (embedded.startAt ?? 0) === 0 && embedded.histories.length === embedded.total) return {histories:embedded.histories, fields:data.fields,id:data.id,key:data.key};
        // Some Jira versions truncate expanded histories. Use the paged endpoint if supported.
        let at=0; const all=[], seen=new Set();
        while (true) {
            const page=await getJSON(url+'/changelog?startAt='+at+'&maxResults=100',fetcher);
            const rows=page.values || page.histories;
            if (!Array.isArray(rows) || (page.startAt != null && page.startAt !== at)) throw new Error('Ongeldige historiepagina');
            for (const row of rows) { if (row.id != null && seen.has(String(row.id))) throw new Error('Dubbele historiepagina'); if(row.id!=null) seen.add(String(row.id)); all.push(row); }
            at+=rows.length;
            if (Number.isInteger(page.total) && at === page.total || page.isLast === true && (!Number.isInteger(page.total) || at === page.total)) return {histories:all,fields:data.fields,id:data.id,key:data.key};
            if (!rows.length || (Number.isInteger(page.total) && at > page.total) || at > 100000) throw new Error('Onvolledige historie');
        }
    }
    async function load(base, issues, progress, config={}, user=null, recheck=null) {
        const statuses=await getJSON(base+'/rest/api/2/status');
        if (!Array.isArray(statuses)) throw new Error('Jira-statuslijst ontbreekt');
        const classify=classifier(statuses,config);
        const cacheInfo={status:'niet geladen',notFound:0,expired:0,changed:0,missingFields:0,writeSkipped:0,readErrors:0,writeErrors:0,written:0,purged:0,verified:0,unstable:0,mismatchUpdated:0,mismatchCreated:0,mismatchStatus:0,detailMissing:0,identityMismatch:0,dateDeltaSample:null};
        const cache=typeof RadixHistoryCache !== 'undefined' ? await RadixHistoryCache.connect(base,user,statuses,config,cacheInfo) : null;
        if(cache?.prime) {try {await cache.prime(issues);} catch(e){cacheInfo.readErrors++;}}
        const deferred=[];
        let next=0, completed=0, errors=0, incomplete=0,hits=0,requests=0;
        async function worker() {
            while(next<issues.length) {
                const issue=issues[next++];
                try {
                    let cached=null;
                    try { cached=await cache?.get(issue); } catch(e) { cacheInfo.readErrors++; }
                    if(cached) { issue.radixHistory=cached; hits++; }
                    else {
                    requests++;
                    const data=await completeHistory(base,issue.key);
                    if ((data.id != null && issue.id != null && String(data.id)!==String(issue.id)) || (data.key && data.key!==issue.key)) { cacheInfo.identityMismatch++; errors++; issue.radixHistory=null; completed++; progress(completed,issues.length); continue; }
                    const fields={...issue.fields,...data.fields};
                    // Do not retain the full response or changelog in application state.
                    issue.radixHistory=reconstruct(fields,data.histories,classify);
                    if (!issue.radixHistory) incomplete++;
                    else if(cache && (RadixHistoryCache.sameFields ? RadixHistoryCache.sameFields(data.fields,issue.fields) : data.fields?.updated===issue.fields?.updated && String(data.fields?.status?.id)===String(issue.fields?.status?.id) && data.fields?.created===issue.fields?.created)) {
                        try { await cache.put(issue,issue.radixHistory); } catch(e) { cacheInfo.writeErrors++; }
                    } else if(cache) {
                        const delta=RadixHistoryCache.compareFields?.(data.fields,issue.fields);
                        if(delta){
                            if(delta.updated) cacheInfo.mismatchUpdated++;
                            if(delta.created) cacheInfo.mismatchCreated++;
                            if (!cacheInfo.dateDeltaSample && (delta.created || delta.updated)) { const diff=k=>{const a=Date.parse(data.fields?.[k]),b=Date.parse(issue.fields?.[k]);return Number.isFinite(a)&&Number.isFinite(b)?(a-b)/1000:null;}; cacheInfo.dateDeltaSample={created:diff("created"),updated:diff("updated")}; }
                            if(delta.status) cacheInfo.mismatchStatus++;
                            if(delta.missing) cacheInfo.detailMissing++;
                        }
                        // Board and issue endpoints need not expose identical metadata.
                        // Re-read the authoritative board snapshot before saving under its fingerprint.
                        if(recheck && delta && !delta.status) deferred.push(issue);
                        else cacheInfo.writeSkipped++;
                    }
                    }
                } catch(e) { issue.radixHistory=null; errors++; }
                completed++; progress(completed,issues.length);
            }
        }
        try { await Promise.all(Array.from({length:Math.min(3,issues.length)},worker));
            if(deferred.length){
                let fresh;
                try {fresh=await recheck();} catch(e){cacheInfo.recheckError=true;}
                const map=new Map((fresh||[]).map(i=>[String(i.id||i.key),i]));
                for(const issue of deferred){
                    const current=map.get(String(issue.id||issue.key));
                    if(current && RadixHistoryCache.sameFields(current.fields,issue.fields)){
                        try{await cache.put(issue,issue.radixHistory,60*60*1000);cacheInfo.verified++;}catch(e){cacheInfo.writeErrors++;}
                    }else{cacheInfo.unstable++;cacheInfo.writeSkipped++;}
                }
            }
            if(cache?.flush) {try {await cache.flush();} catch(e){cacheInfo.writeErrors++;}} } finally { cache?.close(); }
        return {errors,incomplete,hits,requests,cacheInfo};
    }
    return {classifier,reconstruct,completeHistory,load,clearCache:()=>RadixHistoryCache.clear()};
})();
