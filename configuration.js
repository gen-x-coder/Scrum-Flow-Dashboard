/*! Radix — MIT License; see LICENSE. Copyright (c) Lucas Bonsel. */
// Internal configuration. Administrators edit config.js, not this file.
const RadixConfig = (() => {
    const views = ['lt','ct','qt','fe','mtr','team','mc-issues','mc-sp','forecast','advice','phase','hist','scat','thru','cfd'];
    const base = {
        jiraUrl: '', containerId: 'flow-app-container',
        fields: {storyPoints:'customfield_10002', team:'customfield_10012'},
        issueTypes: {story:['story','verhaal','user story','verbetering','technical story','improvement'], bug:['bug','defect','fout']},
        statusCategories: {}, defaultMonths:3, historyCache:true, cacheHours:24,
        defaults: {visible:['lt','ct','qt','fe'], workdays:'calendar', outlier:'95', throughputPeriod:'sprint', holidays:[]}
    };
    const clone = o => JSON.parse(JSON.stringify(o));
    const record = o => o !== null && typeof o === 'object' && !Array.isArray(o);
    const dateOK = x => typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0,10)===x;
    const oneOf = (...choices) => x => choices.includes(x);
    const intRange = (a,b) => x => Number.isInteger(x) && x>=a && x<=b;
    const unique = a => [...new Set(a)];
    const fieldOK = x => x===null || (typeof x==='string' && /^customfield_\d+$/.test(x));
    function urlOK(x) { try { const u=new URL(x); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password && !u.search && !u.hash; } catch {return false;} }
    function apply(target, src, rules, warn, prefix='') {
        if(!record(src)) {warn(prefix||'configuratie');return;}
        for(const [key,value] of Object.entries(src)) {
            if(!Object.prototype.hasOwnProperty.call(rules,key)){warn(prefix+key);continue;}
            const rule=rules[key];
            if(typeof rule==='function') {if(rule(value)) target[key]=clone(value);else warn(prefix+key);}
            else apply(target[key],value,rule,warn,prefix+key+'.');
        }
    }
    const defaultRules = {
        visible: x=>Array.isArray(x)&&x.every(v=>views.includes(v)),
        workdays:oneOf('calendar','workdays'), outlier:oneOf('','90','95','99'),
        throughputPeriod:oneOf('sprint','week','month'), holidays:x=>Array.isArray(x)&&x.every(dateOK)
    };
    const aliasesOK=x=>Array.isArray(x)&&x.length>0&&x.every(v=>typeof v==='string'&&v.trim().length>0);
    const rules = {jiraUrl:urlOK,containerId:x=>typeof x==='string'&&x.trim().length>0,
        fields:{storyPoints:fieldOK,team:fieldOK},issueTypes:{story:aliasesOK,bug:aliasesOK},
        statusCategories:x=>record(x)&&Object.entries(x).every(([k,v])=>k.trim()&& !['__proto__','constructor','prototype'].includes(k)&&['todo','progress','done'].includes(v)),
        defaultMonths:intRange(1,120),historyCache:x=>typeof x==='boolean',cacheHours:intRange(1,24),defaults:defaultRules};
    function resolve(organization={}, page={}, warn=(key)=>console.warn('Radix: onbekende of ongeldige configuratie-instelling:',key)) {
        const result=clone(base);
        // Merge the known nested objects; statusCategories is a map and merges per status name.
        for(const layer of [organization,page]) {
            const previous=result.statusCategories;
            apply(result,layer,rules,warn);
            result.statusCategories=Object.fromEntries([...Object.entries(previous),...Object.entries(result.statusCategories)].map(([k,v])=>[k.trim().toLowerCase(),v]));
        }
        result.jiraUrl=result.jiraUrl.replace(/\/+$/,'');
        result.defaults.visible=unique(result.defaults.visible);
        result.defaults.holidays=unique(result.defaults.holidays);
        for(const k of ['story','bug'])result.issueTypes[k]=unique(result.issueTypes[k].map(v=>v.trim().toLowerCase()));
        return result;
    }
    function preferences(config, saved) {
        const result=clone(config.defaults);
        if(record(saved)) {
            const src={};for(const key of Object.keys(defaultRules))if(Object.prototype.hasOwnProperty.call(saved,key))src[key]=saved[key];
            // Migrate the removed unavailable Release Stabilisation card without losing the other selections.
            if(Array.isArray(src.visible))src.visible=src.visible.filter(v=>views.includes(v));
            if(Array.isArray(src.visible)&&!saved.viewV6&&src.visible.includes('team'))src.visible.push('mc-issues','mc-sp');
            apply(result,src,defaultRules,()=>{});
        }
        result.visible=unique(result.visible);result.viewV6=true;
        return result;
    }
    function fromDate(months, now=new Date()) {
        const d=new Date(now), day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()-months);
        const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));
        return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    }
    function boardJQL(project, date, overrides={}) {
        if(!/^[A-Z0-9_]+$/.test(project)||!dateOK(date))throw new Error('Ongeldig project of begindatum');
        const names=Object.entries(overrides).filter(([,cat])=>cat!=='done').map(([n])=>'"'+n.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"');
        const extra=names.length?' OR status in ('+names.join(', ')+')':'';
        return `Project="${project}" AND (updated >= "${date}" OR statusCategory != Done${extra}) AND issuetype not in subTaskIssueTypes()`;
    }
    function includesIssue(row, from) { return !row.isD || !row.r || row.r>=from; }
    return {resolve,preferences,fromDate,boardJQL,includesIssue,dateOK};
})();
