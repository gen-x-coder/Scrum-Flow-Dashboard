/*! Radix — MIT License; see LICENSE. Copyright (c) Lucas Bonsel. */
// Derived status intervals only. No full issues, names or changelog authors.
const RadixHistoryCache = (() => {
    const DB='radix-history-v1', TTL=24*60*60*1000;
    // SHA-256 fallback for hosts without Web Crypto (e.g. non-secure contexts).
    // Hashing is pseudonymisation, not encryption or access control.
    function sha256(bytes) {
        const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
        const H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
        const n=bytes.length, padded=new Uint8Array(Math.ceil((n+9)/64)*64); padded.set(bytes); padded[n]=128;
        const dv=new DataView(padded.buffer); dv.setUint32(padded.length-8,Math.floor(n*8/4294967296)); dv.setUint32(padded.length-4,n*8);
        const R=(x,n)=>(x>>>n)|(x<<(32-n)), w=new Uint32Array(64);
        for(let off=0;off<padded.length;off+=64){
            for(let i=0;i<16;i++)w[i]=dv.getUint32(off+i*4);
            for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(R(x,7)^R(x,18)^(x>>>3))+w[i-7]+(R(y,17)^R(y,19)^(y>>>10)))>>>0;}
            let [a,b,c,d,e,f,g,h]=H;
            for(let i=0;i<64;i++){const t1=(h+(R(e,6)^R(e,11)^R(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0;const t2=((R(a,2)^R(a,13)^R(a,22))+((a&b)^(a&c)^(b&c)))>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
            [a,b,c,d,e,f,g,h].forEach((v,i)=>H[i]=(H[i]+v)>>>0);
        }
        return H.map(v=>v.toString(16).padStart(8,'0')).join('');
    }
    async function hash(value) {
        const bytes=new TextEncoder().encode(JSON.stringify(value));
        try { if(globalThis.crypto?.subtle) return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join(''); } catch(e) {}
        return sha256(bytes);
    }
    const timestamp=v=>{const n=v?Date.parse(v):NaN;return Number.isFinite(n)?n:null;};
    function fingerprint(fields) {
        const updated=timestamp(fields?.updated),created=timestamp(fields?.created),status=fields?.status?.id;
        return updated!==null&&created!==null&&status!=null&&String(status)!==''?{updated,created,status:String(status)}:null;
    }
    function sameFields(a,b) { const x=fingerprint(a),y=fingerprint(b);return !!x&&!!y&&x.updated===y.updated&&x.created===y.created&&x.status===y.status; }
    function compareFields(detail,board){
        const a=detail||{}, b=board||{};
        const au=timestamp(a.updated), bu=timestamp(b.updated), ac=timestamp(a.created), bc=timestamp(b.created);
        const as=a.status?.id, bs=b.status?.id;
        return {updated:au!==bu,created:ac!==null&&bc!==null&&ac!==bc,status:as!=null&&bs!=null&&String(as)!==String(bs),missing:au===null||ac===null||as==null};
    }
    function open() {
        return new Promise((resolve,reject)=>{
            const req=indexedDB.open(DB,1);
            const timer=setTimeout(()=>reject(new Error('IndexedDB timeout')),4000);
            req.onupgradeneeded=()=>req.result.createObjectStore('history',{keyPath:'key'});
            req.onerror=req.onblocked=()=>{clearTimeout(timer);reject(new Error('IndexedDB niet beschikbaar'));};
            req.onsuccess=()=>{clearTimeout(timer);resolve(req.result);};
        });
    }
    function transact(db,mode,fn) {
        return new Promise((resolve,reject)=>{
            const tx=db.transaction('history',mode), req=fn(tx.objectStore('history'));
            tx.oncomplete=()=>resolve(req?.result);
            tx.onerror=tx.onabort=()=>reject(tx.error || new Error('Cachetransactie mislukt'));
        });
    }
    async function connect(base,user,statuses,config,diag={}) {
        const identity=user?.accountId || user?.key || user?.name;
        if(config.historyCache===false){diag.status='uitgeschakeld';return null;}
        if(!identity){diag.status='geen Jira-account-ID';return null;}
        if(typeof indexedDB==='undefined'){diag.status='IndexedDB ontbreekt';return null;}
        let db;
        try {
            const mapping=statuses.map(s=>[String(s.id),s.name,s.statusCategory?.key]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
            const overrides=Object.entries(config.statusCategories||{}).sort(([a],[b])=>a.localeCompare(b));
            const hours=Number.isInteger(config.cacheHours)&&config.cacheHours>=1&&config.cacheHours<=24?config.cacheHours:24;
            const ttlLimit=hours*60*60*1000;
            const scope=await hash([base,identity,mapping,overrides,'reconstruction-v2',...(hours===24?[]:[hours])]);
            db=await open();
            await transact(db,'readwrite',store=>{const cursor=store.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(c){if(c.value.expires<=Date.now()){c.delete();diag.purged=(diag.purged||0)+1;}c.continue();}};});
            diag.status='actief';diag.hash=globalThis.crypto?.subtle?'Web Crypto':'lokale SHA-256';
            const pending=[], primed=new Map();
            const keyFor=issue=>hash([scope,String(issue.id||issue.key)]);
            return {
                async prime(issues){
                    const entries=await Promise.all(issues.filter(i=>fingerprint(i.fields)).map(async i=>[String(i.id||i.key),await keyFor(i)]));
                    // All reads share one transaction; no full database scan for issue data.
                    await transact(db,'readonly',store=>{for(const [id,key] of entries){const req=store.get(key);req.onsuccess=()=>primed.set(id,req.result||null);}});
                },
                async get(issue) {
                    const fp=fingerprint(issue.fields);if(!fp){diag.missingFields++;return null;}
                    const id=String(issue.id||issue.key);let row;if(primed.has(id))row=primed.get(id);else {const key=await keyFor(issue);row=await transact(db,'readonly',s=>s.get(key));}
                    if(!row){diag.notFound++;return null;}
                    if(row.expires<=Date.now()){diag.expired++;return null;}
                    if(row.updated!==fp.updated||row.status!==fp.status||row.created!==fp.created){diag.changed++;return null;}
                    return row.history;
                },
                async put(issue,history,ttl=TTL) {
                    const fp=fingerprint(issue.fields);if(!fp||!history)return;
                    pending.push({key:await keyFor(issue),...fp,expires:Date.now()+Math.min(ttl,ttlLimit),history});
                },
                async flush(){if(!pending.length)return;await transact(db,'readwrite',s=>{for(const row of pending)s.put(row);});diag.written+=pending.length;pending.length=0;},
                close(){db.close();}
            };
        } catch(e){db?.close();diag.status='cache openen mislukt: '+(e.name||'fout');return null;}
    }
    async function clear() {let db;try{db=await open();await transact(db,'readwrite',s=>s.clear());return true;}catch(e){return false;}finally{db?.close();}}
    return {connect,clear,sameFields,compareFields,sha256};
})();
