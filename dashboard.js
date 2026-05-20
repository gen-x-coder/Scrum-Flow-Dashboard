// ============================================================
// Scrum Flow API Dashboard - Centraal Beheerd
// ============================================================

// --- 1. HANDLEIDING MODULE ---
// Laadt manual.js dynamisch. Gebruikers hoeven niets aan te passen.
(function() {
    const MANUAL_URL = 'https://www.dutchscrum.nl/jira/manual.js';

    // Tijdelijke fallback totdat manual.js geladen is
    window.LUCAS_MANUAL_CONTENT = null;

    const script = document.createElement('script');
    script.src = MANUAL_URL;
    script.onerror = function() {
        window.LUCAS_MANUAL_CONTENT = '<p style="color:#FF5630;">Handleiding kon niet worden geladen. Controleer je netwerk/VPN.</p>';
    };
    document.head.appendChild(script);
})();
// --- 2. ADVIES ENGINE ---
// Laadt advies.js dynamisch vanuit dezelfde locatie als dashboard.js.
// Gebruikers hoeven alleen dashboard.js te laden; advies.js wordt automatisch meegenomen.
(function() {
    const ADVIES_URL = 'https://www.dutchscrum.nl/jira/advies.js';

    // Tijdelijke fallback totdat advies.js geladen is
    window.l_generateAdvice = function() {
        return '<div style="padding:12px 15px; border-radius:6px; background:#FFFAE6; border:1px solid #FFAB00; font-size:12px; color:#172B4D;">Adviesmodule wordt geladen…</div>';
    };

    const script = document.createElement('script');
    script.src = ADVIES_URL;
    script.onerror = function() {
        window.l_generateAdvice = function() {
            return '<div style="padding:12px 15px; border-radius:6px; background:#FFEBE6; border:1px solid #FF5630; font-size:12px; color:#172B4D;">Adviesmodule kon niet worden geladen (<code>advies.js</code>). Controleer je netwerk/VPN.</div>';
        };
    };
    document.head.appendChild(script);
})();

// --- 2b. SUBTAKEN MODULE ---
// Laadt subtaken.js dynamisch. Wordt aangeroepen via de knop in de filterbalk.
(function() {
    const SUBTAKEN_URL = 'https://www.dutchscrum.nl/jira/subtaken.js';
    const script = document.createElement('script');
    script.src = SUBTAKEN_URL;
    script.onerror = function() {
        window.l_openSubtaken = function() {
            alert('Subtaken module kon niet worden geladen. Controleer je netwerk/VPN.');
        };
    };
    document.head.appendChild(script);
})();

// --- 3. DE HOOFD APPLICATIE ---
const L_CFG = {
    URL: window.LUCAS_JIRA_URL,
    HDR: { 'Accept': 'application/json' },
    JQL_QUERY: 'Project="{PROJECT}" AND updated>="{DATE}" AND issuetype not in subTaskIssueTypes()',
    FIELDS: "key,summary,issuetype,status,assignee,created,resolutiondate,updated,customfield_13303,customfield_13300,customfield_13302,customfield_13301,customfield_10002,customfield_10012",
    F: { 
        sprint: "customfield_13303", 
        dev: "customfield_13300", 
        devEnd1: "customfield_13302", 
        devEndL: "customfield_13301", 
        sp: "customfield_10002", 
        team: "customfield_10012" 
    },
    STATUS_DONE: ["gesloten", "done", "closed", "resolved", "opgelost", "klaar", "gedaan"],
    TYPE_BUG: ["bug", "defect", "fout"],
    TYPE_STORY: ["story", "verhaal", "user story", "verbetering", "technical story", "improvement"],
    TYPE_TASK: ["task", "taak", "sub-task", "subtaak"],
    TYPE_EPIC: ["epic", "feature", "initiatief", "initiative"],
    TYPE_SPIKE: ["spike", "onderzoek", "research", "enabler"],
    colors: { Bug:"#FF5630", Story:"#0052CC", Epic:"#6554C0", Task:"#36B37E", Spike:"#FF8B00", Other:"#97A0AF" },
    pctColors: { 50:"#36B37E", 85:"#FFAB00", 95:"#FF5630" },
    pcts: [50, 85, 95] 
};

const L_DEF = { workdays: "calendar", holidays: [], outlier: "95", groups: {}, hideAdvice: false };

let l_state = {
    raw: [], processed: [], filtered: [], sprints: [], boardName: "", lastJQL: "",
    settings: { ...L_DEF },
    filters: { type: "", assignee: "", team: "" },
    diagnostics: { fetchTime: 0, user: {}, server: {} }
};

const l_get = id => document.getElementById(id);
const l_show = id => { const e = l_get(id); if (e) e.style.display = 'block'; };
const l_hide = id => { const e = l_get(id); if (e) e.style.display = 'none'; };
const l_log = m => { 
    const l = l_get('l-log'); 
    if (l) { 
        l.style.display = 'block'; 
        const div = document.createElement('div');
        div.style.marginBottom = '4px';
        div.textContent = '> ' + m;
        l.appendChild(div);
        l.scrollTop = l.scrollHeight; 
    } 
};
const l_esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const l_col = t => L_CFG.colors[t] || L_CFG.colors.Other;
const fDay = v => v === null || isNaN(v) ? "–" : (v < 1 ? `${Math.round(v*24)}u` : `${v.toFixed(1)}${l_state.settings.workdays==="workdays"?"wd":"d"}`);
const fPct = v => v === null || isNaN(v) ? "–" : `${v.toFixed(1)}%`;
const hMark = id => `<a href="#" onclick="l_openManual('${id}'); return false;" style="color:#97A0AF; text-decoration:none; margin-left:6px; font-weight:normal;" title="Uitleg lezen">(?)</a>`;

const l_hash = str => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
    return (hash >>> 0).toString(36);
};

function l_pct(a, p) { 
    if(!a || !a.length) return null; 
    const s = [...a].filter(v => v !== null && !isNaN(v)).sort((x,y) => x - y);
    if(!s.length) return null;
    const i = (p/100) * (s.length - 1); 
    return s[Math.floor(i)] + (s[Math.ceil(i)] - s[Math.floor(i)]) * (i - Math.floor(i)); 
}

function l_runMC(thrp, sprints = 1) {
    if(!thrp || thrp.length === 0) return { p50:1, p15:1, p5:1, sims:[], thrp:[] };
    let results = [];
    for(let i=0; i<10000; i++) {
        let t = 0;
        for(let s=0; s<sprints; s++) t += thrp[Math.floor(Math.random() * thrp.length)];
        results.push(Math.max(1, t)); // Dwing altijd minimaal 1 af (realisme)
    }
    results.sort((a,b)=>a-b);
    
    return {
        p50: Math.max(1, results[Math.floor(0.50 * results.length)]),
        p15: Math.max(1, results[Math.floor(0.15 * results.length)]), 
        p5: Math.max(1, results[Math.floor(0.05 * results.length)]),
        sims: results,
        thrp: thrp
    };
}

function isWorkday(d, holSet) {
    if (!d || isNaN(d.getTime())) return false;
    const dow = d.getDay(); 
    if (dow === 0 || dow === 6) return false;
    const dStr = [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
    return !holSet.has(dStr);
}

function l_dif(a, b) {
    if (!a || !b || isNaN(a.getTime()) || isNaN(b.getTime()) || b < a) return null;
    if (l_state.settings.workdays === "workdays") {
        const s = new Date(a.getFullYear(), a.getMonth(), a.getDate()), e = new Date(b.getFullYear(), b.getMonth(), b.getDate());
        const holSet = new Set(l_state.settings.holidays || []);
        if (+s === +e) return isWorkday(s, holSet) ? parseFloat(((b - a)/86400000).toFixed(2)) : 0;
        let t = 0, c = new Date(s);
        while (c <= e) {
            if (isWorkday(c, holSet)) { 
                if (+c === +s) t += (new Date(c.getFullYear(),c.getMonth(),c.getDate()+1) - a)/86400000; 
                else if (+c === +e) t += (b - c)/86400000; 
                else t += 1; 
            }
            c.setDate(c.getDate() + 1);
        }
        return parseFloat(t.toFixed(2));
    }
    return parseFloat(((b - a) / 86400000).toFixed(2));
}

window.l_syncMax = function(id) {
    const val = l_get(id).value;
    if (id === 'hist-max' && l_get('scat-max')) l_get('scat-max').value = val;
    if (id === 'scat-max' && l_get('hist-max')) l_get('hist-max').value = val;
    drawAllCharts();
};

function injectLucasCSS() {
    if(document.getElementById('lucas-css-inject')) return;
    const style = document.createElement('style');
    style.id = 'lucas-css-inject';
    style.textContent = `
        #lucas-app { font-family: inherit; background: transparent; color: inherit; font-size: 14px; line-height: 1.5; padding: 0; border: none; width: 100%; display: block; }
        #lucas-app * { box-sizing: border-box; }
        h2, h3, h4 { font-family: inherit; color: inherit; margin-top: 0; }
        
        .l-flex { display: flex; align-items: center; }
        .l-flex-b { display: flex; align-items: center; justify-content: space-between; }
        .l-card { background: #FFFFFF; border-radius: 6px; box-shadow: 0 1px 3px rgba(9,30,66,.12); padding: 20px; margin-bottom: 20px; display:flex; flex-direction:column; }
        .l-grid-m { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .l-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        
        .l-btn { background: #0052CC; color: #fff; border: none; border-radius: 3px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .l-btn-alt { background: transparent; border: 1px solid #DFE1E6; color: #172B4D; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: 500; }
        .l-btn-alt:hover { background: #F4F5F7; }
        
        .f-btn { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.3); color: #fff; border-radius: 3px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500; transition: background .2s; }
        .f-btn:hover { background: rgba(255,255,255,.2); }

        .l-inp, .l-sel { width: 100%; padding: 8px; border: 1px solid #DFE1E6; border-radius: 3px; font-size: 13px; background: #FAFBFC; margin-top: 4px; outline: none; }
        .l-sel-inline { padding: 4px 8px; border: 1px solid #DFE1E6; border-radius: 3px; font-size: 12px; background: #FAFBFC; outline: none; cursor: pointer; color: #172B4D; }
        
        #l-filter-bar { background: #0747A6; padding: 12px 20px; border-radius: 6px; color: white; gap: 15px; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; width: 100%; }
        .f-sel { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.3); color: #fff; border-radius: 3px; padding: 6px 8px; font-size: 12px; outline: none; cursor:pointer;}
        .f-sel option { background: #fff; color: #172B4D; }
        
        .m-crd { position: relative; overflow: hidden; background: #fff; border-radius: 6px; box-shadow: 0 1px 3px rgba(9,30,66,.12); padding: 20px; border: 1px solid #DFE1E6; display: flex; flex-direction: column; }
        .m-crd::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--ac); border-radius: 6px 0 0 6px; }
        .m-tit { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6B778C; margin-bottom: 12px; }
        .m-cnt { font-size: 11px; color: #6B778C; background: #F4F5F7; padding: 2px 8px; border-radius: 10px; }
        .m-st { display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; gap: 8px; margin-bottom: 12px; }
        .m-s-lbl { font-size: 10px; color: #6B778C; text-transform: uppercase; }
        .m-s-val { font-size: 18px; font-weight: 700; line-height: 1.2; color: #172B4D; }
        .m-pct { border-top: 1px solid #DFE1E6; padding-top: 10px; display: flex; gap: 8px; font-size: 11px; color: #6B778C; }
        .p-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
        
        .l-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
        .l-tbl th { position: sticky; top: 0; background: #FAFBFC; padding: 10px; text-align: left; border-bottom: 1px solid #DFE1E6; color: #6B778C; text-transform: uppercase; font-size: 10px; }
        .l-tbl td { padding: 10px; border-bottom: 1px solid #DFE1E6; color: #172B4D; }
        .m-link { background: none; border: none; color: #0052CC; padding: 10px 0 0 0; margin-top: auto; border-top: 1px solid #DFE1E6; width: 100%; text-align: left; cursor: pointer; font-size: 12px; font-weight: 600; }
        .m-link:hover { text-decoration: underline; }

        .r-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .r-card { background: #fff; padding: 15px; border-radius: 4px; border: 1px solid #DFE1E6; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .r-card h4 { margin-top: 0; color: #0052CC; border-bottom: 1px solid #DFE1E6; padding-bottom: 8px; margin-bottom: 12px; font-size: 14px; }
        .r-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; border-bottom: 1px dashed #f0f0f0; padding-bottom: 4px; }
        .r-row:last-child { border-bottom: none; }
        .r-lbl { color: #6B778C; font-weight: 600; }
        .r-val { color: #172B4D; font-family: monospace; text-align: right; }

        .ti-val { font-size: 32px; font-weight: 700; line-height: 1.1; margin: 8px 0 4px 0; color: #172B4D; }
        .ti-trk { height: 8px; background: #DFE1E6; border-radius: 4px; margin: 8px 0; overflow: hidden; }
        .ti-fil { height: 100%; border-radius: 4px; }
        .ti-row { display: flex; justify-content: space-between; font-size: 12px; color: #6B778C; border-top: 1px solid #DFE1E6; padding-top: 6px; margin-top: 6px; }
        
        .pb-row { margin-bottom: 14px; }
        .pb-trk { height: 10px; background: #DFE1E6; border-radius: 5px; margin-top: 5px; overflow: hidden; }
        
        .c-tit { font-size: 16px; font-weight: 600; color: inherit; font-family: inherit; margin-bottom: 2px; }
        .c-sub { font-size: 11px; color: #6B778C; margin-bottom: 12px; }
        canvas.l-cvs { width: 100%; height: 260px; display: block; }
        
        #l-log { display: none; padding: 12px 16px; background: #EBECF0; font-family: monospace; font-size: 12px; margin-top: 15px; border-radius: 4px; color: #172B4D; max-height: 200px; overflow-y: auto; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #DFE1E6; }
        
        /* Modal Containers */
        .l-modal-bg { display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(9,30,66,0.6); z-index:9999; }
        .l-modal-box { position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:#fff; border-radius:6px; width:800px; max-width:95vw; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 8px 40px rgba(9,30,66,.3); }
        .l-modal-box-lg { width:900px; }
        .l-modal-header { padding:20px; border-bottom:1px solid #DFE1E6; display:flex; justify-content:space-between; align-items:center; background:#FAFBFC; }
        .l-modal-body { overflow-y:auto; padding:20px; font-size:13px; color:#172B4D; }
        
        @media (max-width: 900px) {
            .l-grid-2 { grid-template-columns: 1fr; }
            .r-grid { grid-template-columns: 1fr; }
        }
    `;
    document.head.appendChild(style);
}

function loadSettings() {
    try {
        const s = localStorage.getItem('lucas_settings');
        if (s) l_state.settings = { ...L_DEF, ...JSON.parse(s) };
        if (!l_state.settings.groups) l_state.settings.groups = {};
        if (l_state.settings.hideAdvice === undefined) l_state.settings.hideAdvice = false;
    } catch(e) { console.warn('Instellingen laden mislukt (localStorage):', e); }
}

function saveSettings() {
    try {
        localStorage.setItem('lucas_settings', JSON.stringify(l_state.settings));
    } catch(e) {
        console.warn('Instellingen konden niet worden opgeslagen:', e);
    }
}

window.initLucasApp = function(containerId) {
    injectLucasCSS();
    loadSettings();
    const root = document.getElementById(containerId);
    if (!root) return;
    
    let d = new Date(); d.setFullYear(d.getFullYear() - 1);
    const defDate = d.toISOString().split('T')[0];

    root.innerHTML = `
    <div id="lucas-app">
        <div id="l-setup" style="max-width: 600px;">
            <div class="l-card" style="box-shadow:none;">
                <div class="l-flex" style="gap:15px; align-items:flex-end; flex-wrap:wrap;">
                    <div style="flex:1; min-width: 200px;">
                        <span style="font-size:11px; font-weight:bold; color:#6B778C;">Project Key</span>
                        <input type="text" id="l_inp" class="l-inp" placeholder="Bijv. AAA" style="text-transform: uppercase;">
                        <div style="font-size:11px; color:#6B778C; margin-top:6px; line-height:1.4;">
                            De project key zijn de letters die voor iedere user story staan.
                        </div>
                    </div>
                    <button onclick="l_search()" class="l-btn l-btn-alt" style="height:35px; border:1px solid #ccc; margin-bottom: 24px;">Zoek Borden</button>
                </div>
                
                <div id="l_brd_area" style="display:none; padding-top:20px; margin-top:10px; border-top:1px solid #DFE1E6;">
                    <div class="l-grid-2" style="margin-bottom: 15px;">
                        <div><span style="font-size:11px; font-weight:bold; color:#6B778C;">Kies Bord</span><select id="l_brd" class="l-sel"></select></div>
                        <div><span style="font-size:11px; font-weight:bold; color:#6B778C;">Data vanaf</span><input type="date" id="l_dat" class="l-inp" value="${defDate}"></div>
                    </div>
                    <button onclick="l_run()" id="btn_run" class="l-btn" style="width:100%; max-width: 250px;">Genereer Dashboard</button>
                </div>
                <div id="l-log"></div>
            </div>
        </div>

        <div id="l-dash" style="display:none; width: 100%;">
            
            <div id="l-filter-bar">
                <div class="l-flex" style="gap: 12px; flex-wrap: wrap;">
                    <span style="font-size:12px; color:rgba(255,255,255,.7);">Filter:</span>
                    <select id="f_type" class="f-sel" onchange="l_applyFilters()"><option value="">Alle typen</option></select>
                    <select id="f_assignee" class="f-sel" onchange="l_applyFilters()"><option value="">Alle teamleden</option></select>
                    <select id="f_team" class="f-sel" onchange="l_applyFilters()"><option value="">Alle teams</option></select>
                </div>
                <div class="l-flex" style="gap: 10px; flex-wrap: wrap;">
                    <button onclick="l_openSettings()" class="f-btn">Instellingen</button>
                    <button onclick="l_showRawData()" class="f-btn">Diagnostiek</button>
                    <button onclick="l_openManual()" class="f-btn">Handleiding</button>
                    <button onclick="if(typeof l_openSubtaken==='function'){l_openSubtaken();}else{alert('Subtaken module laadt nog, probeer opnieuw.');}" class="f-btn" id="btn-subtaken" style="display:none;">Subtaken</button>
                    <button onclick="location.reload()" class="f-btn">Nieuwe Analyse</button>
                </div>
            </div>
            <div id="d-info" style="margin-bottom:20px; font-size:12px; color:#6B778C;"></div>
            
            <div class="l-grid-m" id="l-metrics"></div>
            <div class="l-grid-m" id="l-team"></div>
            
            <div id="l-advice-container" style="width: 100%;"></div>
            
            <div class="l-grid-2">
                <div class="l-card"><div class="c-tit">Fase-verdeling ${hMark('man-phase')}</div><div class="c-sub">Onderverdeling van lead time</div><div id="l-phase"></div></div>
                <div class="l-card">
                    <div class="l-flex-b"><div class="c-tit">Histogram ${hMark('man-hist')}</div>
                        <div class="l-flex" style="gap:6px;">
                            <input type="number" id="hist-max" class="l-sel-inline" style="width:70px; padding:3px 6px;" placeholder="Max (d)" onchange="l_syncMax(this.id)" onkeyup="if(event.key==='Enter')l_syncMax(this.id)" title="Verberg uitschieters boven X dagen">
                            <select id="sel-hist" class="l-sel-inline" onchange="drawAllCharts()">
                                <option value="lt" selected>Lead Time</option>
                                <option value="ct">Cycle Time</option>
                                <option value="qt">Queue Time</option>
                            </select>
                        </div>
                    </div>
                    <div id="sub-hist" class="c-sub">Verdeling van frequentie</div>
                    <canvas id="cv-hist" class="l-cvs"></canvas>
                </div>
            </div>
            <div class="l-grid-2">
                <div class="l-card">
                    <div class="l-flex-b"><div class="c-tit">Scatterplot ${hMark('man-scat')}</div>
                        <div class="l-flex" style="gap:6px;">
                            <input type="number" id="scat-max" class="l-sel-inline" style="width:70px; padding:3px 6px;" placeholder="Max (d)" onchange="l_syncMax(this.id)" onkeyup="if(event.key==='Enter')l_syncMax(this.id)" title="Verberg uitschieters boven X dagen">
                            <select id="sel-scat" class="l-sel-inline" onchange="drawAllCharts()">
                                <option value="lt" selected>Lead Time</option>
                                <option value="ct">Cycle Time</option>
                            </select>
                        </div>
                    </div>
                    <div id="sub-scat" class="c-sub">Elke stip is 1 afgerond issue</div>
                    <canvas id="cv-scat" class="l-cvs"></canvas>
                </div>
                <div class="l-card">
                    <div class="l-flex-b"><div class="c-tit">Throughput ${hMark('man-thru')}</div>
                        <select id="sel-thru" class="l-sel-inline" onchange="drawAllCharts()">
                            <option value="14" selected>Per sprint</option>
                            <option value="7">Per week</option>
                            <option value="30">Per maand</option>
                        </select>
                    </div>
                    <div class="c-sub">Aantal afgeronde issues per periode</div>
                    <canvas id="cv-thru" class="l-cvs"></canvas>
                </div>
            </div>
            <div class="l-grid-2">
                <div class="l-card">
                    <div class="c-tit">Cumulatief Stroomdiagram (CFD) ${hMark('man-cfd')}</div>
                    <div class="c-sub">Werkstroom over tijd (gefilterd vanaf ingestelde datum)</div>
                    <canvas id="cv-cfd" class="l-cvs"></canvas>
                </div>
                <div></div>
            </div>
        </div>

        <div id="l-modal-overlay" class="l-modal-bg">
            <div class="l-modal-box">
                <div class="l-modal-header">
                    <div><div id="l-modal-title" style="font-weight:bold; font-size:16px; color:#172B4D;"></div><div id="l-modal-sub" style="font-size:12px; color:#6B778C;"></div></div>
                    <button onclick="l_hide('l-modal-overlay')" style="background:none; border:none; font-size:24px; color:#6B778C; cursor:pointer;">&times;</button>
                </div>
                <div id="l-modal-body" class="l-modal-body" style="padding:0;"></div>
            </div>
        </div>

        <div id="l-raw-modal-overlay" class="l-modal-bg">
            <div class="l-modal-box l-modal-box-lg">
                <div class="l-modal-header">
                    <div style="font-weight:bold; font-size:18px; color:#172B4D;">Diagnostiek & Ruwe Data</div>
                    <button onclick="l_hide('l-raw-modal-overlay')" style="background:none; border:none; font-size:24px; color:#6B778C; cursor:pointer;">&times;</button>
                </div>
                <div id="l-raw-modal-body" class="l-modal-body" style="background:#F4F5F7;"></div>
            </div>
        </div>

        <div id="l-settings-modal-overlay" class="l-modal-bg">
            <div class="l-modal-box">
                <div class="l-modal-header">
                    <div style="font-weight:bold; font-size:18px; color:#172B4D;">Dashboard Instellingen</div>
                    <button onclick="l_hide('l-settings-modal-overlay')" style="background:none; border:none; font-size:24px; color:#6B778C; cursor:pointer;">&times;</button>
                </div>
                <div id="l-settings-modal-body" class="l-modal-body" style="background:#FAFBFC;">
                    
                    <div class="l-grid-2">
                        <div>
                            <span style="font-size:11px; font-weight:bold; color:#6B778C;">Dagtelling</span>
                            <select id="s_workdays" class="l-sel"><option value="calendar">Kalenderdagen</option><option value="workdays">Werkdagen (ma-vr)</option></select>
                            
                            <span style="font-size:11px; font-weight:bold; color:#6B778C; display:block; margin-top:15px;">Uitschieters uitsluiten (Metrics)</span>
                            <select id="s_outlier" class="l-sel"><option value="">Uitgeschakeld</option><option value="90">Boven P90</option><option value="95">Boven P95</option><option value="99">Boven P99</option></select>
                            
                            <span style="font-size:11px; font-weight:bold; color:#6B778C; display:block; margin-top:15px;">Weergave Opties</span>
                            <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:#172B4D; margin-top:6px; cursor:pointer;">
                                <input type="checkbox" id="s_hide_advice" style="margin:0;"> Verberg 'Team Advies' blok
                            </label>
                        </div>
                        <div>
                            <span style="font-size:11px; font-weight:bold; color:#6B778C;">Feestdagen (Uitsluiten bij werkdagen, YYYY-MM-DD per regel)</span>
                            <textarea id="s_holidays" style="width:100%; height:80px; padding:8px; border:1px solid #DFE1E6; border-radius:3px; font-size:12px; margin-top:4px; font-family:monospace; resize:vertical;"></textarea>
                        </div>
                    </div>
                    
                    <div style="margin-top:20px; padding-top:20px; border-top:1px solid #DFE1E6;">
                        <div class="l-flex-b">
                            <span style="font-size:12px; font-weight:bold; color:#172B4D;">Teamgroepen ${hMark('man-groups')}</span>
                            <div>
                                <button onclick="l_exportGroups()" class="l-btn-alt" style="font-size:11px; padding:4px 8px;">Export</button> 
                                <button onclick="l_importGroups()" class="l-btn-alt" style="font-size:11px; padding:4px 8px;">Import</button>
                            </div>
                        </div>
                        <div id="l-group-manager" style="margin-top:10px; font-size:12px;"></div>
                    </div>

                    <button onclick="l_saveSettings()" class="l-btn" style="margin-top:20px; width:100%;">Instellingen Opslaan & Herberekenen</button>

                </div>
            </div>
        </div>

        <div id="l-man-modal-overlay" class="l-modal-bg">
            <div class="l-modal-box l-modal-box-lg">
                <div class="l-modal-header">
                    <div style="font-weight:bold; font-size:18px; color:#172B4D;">Handleiding & Uitleg</div>
                    <button onclick="l_hide('l-man-modal-overlay')" style="background:none; border:none; font-size:24px; color:#6B778C; cursor:pointer;">&times;</button>
                </div>
                <div style="padding:10px 20px; border-bottom:1px solid #DFE1E6; background:#fff;">
                    <input type="text" id="l-man-search" placeholder="Zoek in handleiding..." style="width:100%; padding:8px; border:1px solid #DFE1E6; border-radius:3px; outline:none; font-size:13px;" onkeyup="l_searchManual()">
                </div>
                <div id="l-man-modal-body" class="l-modal-body" style="background:#fff; line-height:1.6;">
                    Handleiding wordt geladen...
                </div>
            </div>
        </div>

    </div>`;

    if(l_get('s_workdays')) l_get('s_workdays').value = l_state.settings.workdays;
    if(l_get('s_outlier')) l_get('s_outlier').value = l_state.settings.outlier;
    if(l_get('s_holidays')) l_get('s_holidays').value = (l_state.settings.holidays||[]).join('\n');
    if(l_get('s_hide_advice')) l_get('s_hide_advice').checked = l_state.settings.hideAdvice;
    
    if (window._l_resizeHandler) window.removeEventListener("resize", window._l_resizeHandler);
    window._l_resizeHandler = () => {
        if (l_state.filtered && l_state.filtered.length) {
            clearTimeout(window._l_resizeTimer);
            window._l_resizeTimer = setTimeout(drawAllCharts, 200);
        }
    };
    window.addEventListener("resize", window._l_resizeHandler);
};

// ============================================================
// LOGICA & DATA VERWERKING
// ============================================================

window.l_renderGroupManager = function() {
    const gm = l_get('l-group-manager');
    if(!gm) return;
    if(!l_state.processed || !l_state.processed.length) {
        gm.innerHTML = '<span style="color:#6B778C;">Laad eerst het dashboard in om teamgroepen te maken.</span>';
        return;
    }
    
    const assignees = [...new Set(l_state.processed.map(d=>d.assignee))].filter(Boolean).sort();
    const hashToName = {};
    assignees.forEach(a => hashToName[l_hash(a)] = a);

    let h = `<div style="display:flex; gap:10px; margin-bottom:10px;">
        <input type="text" id="l-grp-name" class="l-inp" placeholder="Naam nieuwe groep (bijv. Backend)" style="margin-top:0;">
        <button onclick="l_saveGroup()" class="l-btn" style="white-space:nowrap; padding:6px 12px; font-size:12px;">Maken</button>
    </div>`;
    
    h += `<div style="max-height:140px; overflow-y:auto; border:1px solid #DFE1E6; padding:8px; border-radius:3px; background:#FAFBFC; margin-bottom:15px; display:grid; grid-template-columns:1fr 1fr; gap:5px;">`;
    assignees.forEach(a => {
        h += `<label style="display:flex; align-items:center; gap:5px; cursor:pointer; color:#42526E;"><input type="checkbox" class="l-grp-chk" value="${l_esc(a)}"> <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${l_esc(a)}</span></label>`;
    });
    h += `</div>`;

    const grps = l_state.settings.groups || {};
    if(Object.keys(grps).length > 0) {
        h += `<strong style="display:block; margin-bottom:5px; color:#172B4D;">Opgeslagen Groepen:</strong>`;
        Object.entries(grps).forEach(([k, v]) => {
            const memberNames = v.map(hash => hashToName[hash] || "Onbekende medewerker").join(', ');
            h += `<div style="display:flex; justify-content:space-between; padding:6px 8px; background:#EBECF0; margin-bottom:4px; border-radius:3px; align-items:flex-start;">
                <div style="font-size:11px; line-height:1.4;">
                    <strong style="font-size:12px; color:#172B4D;">${l_esc(k)}</strong> <span style="color:#6B778C;">(${v.length} leden)</span><br>
                    <span style="color:#42526E; font-style:italic;">${l_esc(memberNames)}</span>
                </div>
                <button onclick="l_deleteGroup('${l_esc(k)}')" style="background:none; border:none; color:#FF5630; cursor:pointer; font-weight:bold; font-size:16px; padding:0 4px; line-height:1;">&times;</button>
            </div>`;
        });
    }
    gm.innerHTML = h;
};

window.l_saveGroup = function() {
    const name = l_get('l-grp-name').value.trim();
    if(!name) return alert("Vul een naam in voor de groep.");
    const chks = document.querySelectorAll('.l-grp-chk:checked');
    if(chks.length === 0) return alert("Vink minimaal 1 teamlid aan.");
    
    if(!l_state.settings.groups) l_state.settings.groups = {};
    l_state.settings.groups[name] = Array.from(chks).map(c => l_hash(c.value));
    
    saveSettings();
    l_renderGroupManager();
    l_processData(); 
};

window.l_deleteGroup = function(name) {
    if(!confirm(`Groep '${name}' verwijderen?`)) return;
    delete l_state.settings.groups[name];
    saveSettings();
    l_renderGroupManager();
    l_processData();
};

window.l_exportGroups = function() {
    const grps = l_state.settings.groups || {};
    if(Object.keys(grps).length === 0) return alert("Geen groepen om te exporteren.");
    const blob = new Blob([JSON.stringify(grps, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "scrum-teamgroepen.json";
    a.click();
    URL.revokeObjectURL(url);
};

window.l_importGroups = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const imported = JSON.parse(ev.target.result);
                if (!imported || typeof imported !== 'object' || Array.isArray(imported)) {
                    throw new Error("Ongeldig JSON formaat.");
                }
                const safeGroups = {};
                Object.entries(imported).forEach(([k, v]) => {
                    if (typeof k === 'string' && Array.isArray(v)) safeGroups[k] = v;
                });
                
                l_state.settings.groups = { ...(l_state.settings.groups || {}), ...safeGroups };
                saveSettings();
                l_renderGroupManager();
                l_processData();
                alert("Groepen succesvol geïmporteerd!");
            } catch(err) {
                alert("Ongeldig of corrupt bestand.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
};

window.l_openSettings = function() {
    l_show('l-settings-modal-overlay');
    l_renderGroupManager();
};

window.l_saveSettings = function() {
    if(!l_get('s_workdays')) return;
    l_state.settings.workdays = l_get('s_workdays').value;
    l_state.settings.outlier = l_get('s_outlier').value;
    
    l_state.settings.hideAdvice = l_get('s_hide_advice') ? l_get('s_hide_advice').checked : false;
    
    const rawHols = l_get('s_holidays').value.split('\n').map(s=>s.trim()).filter(Boolean);
    const invalidHols = [];
    l_state.settings.holidays = rawHols.map(h => {
        const d = new Date(h);
        if (isNaN(d.getTime())) { invalidHols.push(h); return null; }
        return d.toISOString().split('T')[0];
    }).filter(Boolean);

    if (invalidHols.length > 0) {
        alert(`Let op: de volgende feestdagen hebben een ongeldig formaat en zijn genegeerd (gebruik YYYY-MM-DD):\n\n${invalidHols.join('\n')}`);
    }

    saveSettings();
    l_hide('l-settings-modal-overlay');
    if (l_state.raw && l_state.raw.length > 0) l_processData();
};

window.l_search = async function() {
    const inp = l_get('l_inp');
    const val = inp ? inp.value.trim().toUpperCase() : "";
    
    if(!val || !/^[A-Z0-9_]+$/i.test(val)) return alert("Vul een geldige Project Key in (alleen letters en cijfers).");
    
    const logBox = l_get('l-log');
    if(logBox) logBox.innerHTML = ""; 
    
    try {
        const authRes = await fetch(`${L_CFG.URL}/rest/api/2/myself`, { credentials: 'include', headers: L_CFG.HDR });
        if (!authRes.ok) throw new Error("Je bent niet ingelogd in Jira (of er is geen verbinding). Log in in een ander tabblad en probeer het opnieuw.");
        
        const usr = await authRes.json();
        l_log(`Ingelogd als: ${usr.displayName || "Onbekend"}`);
        l_log(`Zoeken naar borden gekoppeld aan project '${val}'...`);

        const u = `${L_CFG.URL}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(val)}`;
        const r = await fetch(u, { credentials:'include', headers:L_CFG.HDR });
        if(!r.ok) throw new Error("Fout bij het ophalen van borden (HTTP " + r.status + ").");
        const d = await r.json();
        
        if(!d.values || !d.values.length) throw new Error("Geen borden gevonden voor dit project.");
        
        const sel = l_get('l_brd');
        if(sel) sel.innerHTML = d.values.map(b=>`<option value="${l_esc(b.id)}">${l_esc(b.name)} (${l_esc(b.type)})</option>`).join("");
        
        l_show('l_brd_area'); 
        l_log(`Succes! ${d.values.length} bord(en) gevonden. Kies een bord en ga verder.`);
    } catch(e) { 
        if (e.message.includes("Failed to fetch")) {
            l_log("❌ Fout: Kan Jira niet bereiken (Failed to fetch). Controleer je VPN en of je bent ingelogd.");
        } else {
            l_log("❌ " + e.message); 
        }
    }
};

window.l_run = async function() {
    const inpV = l_get('l_inp'), inpD = l_get('l_dat'), inpB = l_get('l_brd'), btn = l_get('btn_run');
    if(!inpV || !inpD || !inpB) return;

    const v = inpV.value.trim().toUpperCase(), dat = inpD.value, bId = inpB.value;
    if(btn) btn.disabled = true;
    
    const logBox = l_get('l-log');
    if(logBox) logBox.innerHTML = ""; 
    
    try {
        if (inpB.selectedIndex >= 0) {
            l_state.boardName = inpB.options[inpB.selectedIndex].text;
        }

        const t0 = performance.now();

        const authRes = await fetch(`${L_CFG.URL}/rest/api/2/myself`, { credentials: 'include', headers: L_CFG.HDR });
        if (!authRes.ok) throw new Error("Je bent niet ingelogd in Jira (of er is geen verbinding). Log in via een ander tabblad en probeer het opnieuw.");
        const usrData = await authRes.json();
        l_log(`Ingelogd als: ${usrData.displayName || "Onbekend"}`);

        l_log("Sprints ophalen voor geselecteerde bord...");
        let sprs = [], sAt = 0, sLast = false;
        while (!sLast) {
            const sr = await fetch(`${L_CFG.URL}/rest/agile/1.0/board/${bId}/sprint?startAt=${sAt}`, { credentials: 'include', headers: L_CFG.HDR });
            if (!sr.ok) { l_log("Let op: Kon sprints niet laden, we gaan verder met enkel issues."); break; }
            const sd = await sr.json();
            if (sd.values) sprs.push(...sd.values);
            sLast = sd.isLast !== undefined ? sd.isLast : true;
            sAt += (sd.values ? sd.values.length : 50);
        }
        l_state.sprints = sprs;
        if(sprs.length) l_log(`${sprs.length} Sprints succesvol ingeladen.`);
        
        l_log("Issues ophalen uit Jira (dit kan even duren bij grote projecten)...");
        const jql = L_CFG.JQL_QUERY.replace('{PROJECT}', v).replace('{DATE}', dat);
        l_state.lastJQL = jql;
        
        let iss=[], at=0, more=true;
        
        const issuesPromise = (async () => {
            while(more){
                const r = await fetch(`${L_CFG.URL}/rest/api/2/search?jql=${encodeURIComponent(jql)}&startAt=${at}&maxResults=1000&fields=${L_CFG.FIELDS}`, { credentials: 'include', headers: L_CFG.HDR });
                if(!r.ok) throw new Error("API Fout: "+r.status);
                const d = await r.json(); 
                if(d.issues) iss.push(...d.issues);
                
                if(!d.issues || at + d.issues.length >= d.total) more=false; 
                else at+=d.issues.length;
                
                l_log(`... ${iss.length} issues binnengehaald...`);
            }
        })();

        let srv = { title: "Onbekend", ver: "Onbekend" };
        let usr = { name: usrData.displayName || "Onbekend", tz: usrData.timeZone || "Onbekend" };
        const sysPromise = Promise.all([
            fetch(`${L_CFG.URL}/rest/api/2/serverInfo`, { credentials: 'include', headers: L_CFG.HDR }).then(r=>r.ok?r.json():{})
        ]).then(([rSrv]) => {
            if(rSrv.serverTitle) srv.title = rSrv.serverTitle;
            if(rSrv.version) srv.ver = rSrv.version;
        }).catch(() => {});

        await Promise.all([issuesPromise, sysPromise]);
        
        const fetchTimeMs = performance.now() - t0;
        l_state.diagnostics = { fetchTime: fetchTimeMs / 1000, server: srv, user: usr };
        l_log(`Alle data binnen! (${(fetchTimeMs/1000).toFixed(1)} sec)`);
        
        l_state.raw = iss;

        // Subtaken ophalen op de achtergrond (niet-blokkerend)
        l_state.rawSubtasks = [];
        const subJql = `Project="${v}" AND updated>="${dat}" AND issuetype in subTaskIssueTypes()`;
        const subFields = "key,summary,status,assignee,issuetype,parent,created,resolutiondate,updated,customfield_13300";
        fetch(`${L_CFG.URL}/rest/api/2/search?jql=${encodeURIComponent(subJql)}&startAt=0&maxResults=1000&fields=${subFields}`, { credentials: 'include', headers: L_CFG.HDR })
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(async d => {
                let subIss = d.issues || [];
                // Pagineer als er meer zijn
                let subAt = subIss.length;
                while (subAt < d.total) {
                    const rr = await fetch(`${L_CFG.URL}/rest/api/2/search?jql=${encodeURIComponent(subJql)}&startAt=${subAt}&maxResults=1000&fields=${subFields}`, { credentials: 'include', headers: L_CFG.HDR });
                    if (!rr.ok) break;
                    const dd = await rr.json();
                    subIss.push(...(dd.issues || []));
                    subAt += (dd.issues || []).length;
                }
                l_state.rawSubtasks = subIss;
                l_log(`${subIss.length} subtaken geladen.`);
                // Knop zichtbaar maken zodra data er is
                const btnSub = l_get('btn-subtaken');
                if (btnSub && subIss.length > 0) btnSub.style.display = '';
            })
            .catch(() => l_log("Let op: subtaken konden niet worden opgehaald."));

        l_log("Wiskundige modellen toepassen en dashboard genereren...");
        
        l_hide('l-setup'); 
        l_show('l-dash');
        
        l_get('l-dash').offsetWidth; 

        l_processData();

    } catch(e) { 
        if (e.message.includes("Failed to fetch")) {
            l_log("❌ Fout: Verbinding met Jira mislukt (Failed to fetch). Controleer VPN en inlogstatus.");
        } else {
            l_log("❌ Fout: " + e.message); 
        }
        if(btn) btn.disabled = false; 
    }
};

function l_processData() {
    const dn = L_CFG.STATUS_DONE.map(s=>s.toLowerCase());
    const ty = t => { 
        const tl=(t||"").toLowerCase(); 
        if(L_CFG.TYPE_BUG.some(x => tl.includes(x))) return "Bug"; 
        if(L_CFG.TYPE_STORY.some(x => tl.includes(x))) return "Story"; 
        if(L_CFG.TYPE_TASK.some(x => tl.includes(x))) return "Task"; 
        if(L_CFG.TYPE_EPIC && L_CFG.TYPE_EPIC.some(x => tl.includes(x))) return "Epic"; 
        if(L_CFG.TYPE_SPIKE && L_CFG.TYPE_SPIKE.some(x => tl.includes(x))) return "Spike"; 
        return "Other"; 
    };
    const pD = s => s ? new Date(s) : null;
    const gF = (f, id) => f[id]&&f[id].value ? f[id].value : f[id];

    l_state.processed = l_state.raw.map(i => {
        if(!i || !i.fields) return null;
        const f=i.fields, t=ty(f.issuetype?.name);
        
        const statusName = (f.status?.name||"").toLowerCase();
        const isD = dn.some(s => statusName.includes(s));
        
        const assignee=f.assignee?.displayName||"Onbekend";
        const team = gF(f, L_CFG.F.team) || "Geen Team";
        const summary = f.summary || "";
        
        const c=pD(f.created);
        let r=pD(f.resolutiondate);
        if (isD && !r) {
            r = pD(f.updated) || c; 
        }
        
        const ss=pD(gF(f,L_CFG.F.sprint)), ds=pD(gF(f,L_CFG.F.dev)), df=pD(gF(f,L_CFG.F.devEnd1)), dl=pD(gF(f,L_CFG.F.devEndL));
        const lt=isD?l_dif(c,r):null, ct=isD?l_dif(ds,r):null;
        
        return { key:i.key, summary, t, isD, assignee, team, sp:parseFloat(gF(f,L_CFG.F.sp))||0, c, r, ss, ds, df, dl, lt, ct, mtr:(isD&&t==="Bug")?l_dif(c,r):null, qt:l_dif(c,ds), rs:l_dif(df,dl), age:(!isD&&ds)?l_dif(ds,new Date()):null, fe:(ct!==null&&lt>0)?(ct/lt)*100:null };
    }).filter(d => d !== null && (d.t === 'Story' || d.t === 'Bug'));

    const types = [...new Set(l_state.processed.map(d=>d.t))].sort();
    const assignees = [...new Set(l_state.processed.map(d=>d.assignee))].filter(Boolean).sort();
    const teams = [...new Set(l_state.processed.map(d=>d.team))].filter(Boolean).sort();
    
    const fType = l_get('f_type');
    const fAss = l_get('f_assignee');
    const fTeam = l_get('f_team');
    
    if(fType) { fType.innerHTML = '<option value="">Alle typen</option>' + types.map(x=>`<option value="${l_esc(x)}">${l_esc(x)}</option>`).join(""); fType.value = l_state.filters.type; }
    if(fTeam) { fTeam.innerHTML = '<option value="">Alle teams</option>' + teams.map(x=>`<option value="${l_esc(x)}">${l_esc(x)}</option>`).join(""); fTeam.value = l_state.filters.team; }
    
    if(fAss) { 
        const grps = l_state.settings.groups || {};
        let assHtml = '<option value="">Alle teamleden</option>';
        if(Object.keys(grps).length > 0) {
            Object.keys(grps).forEach(k => { assHtml += `<option value="GROUP:${l_esc(k)}">[Groep] ${l_esc(k)}</option>`; });
            assHtml += `<option disabled>──────────</option>`;
        }
        assignees.forEach(x => { assHtml += `<option value="${l_esc(x)}">${l_esc(x)}</option>`; });
        fAss.innerHTML = assHtml; 
        fAss.value = l_state.filters.assignee; 
    }

    l_applyFilters();
}

window.l_applyFilters = function() {
    if (!l_state.processed || !l_state.processed.length) return;

    const fType = l_get('f_type');
    const fAss = l_get('f_assignee');
    const fTeam = l_get('f_team');
    const fDat = l_get('l_dat');
    
    l_state.filters.type = fType ? fType.value : "";
    l_state.filters.assignee = fAss ? fAss.value : "";
    l_state.filters.team = fTeam ? fTeam.value : "";
    const minDate = fDat && fDat.value ? new Date(fDat.value) : new Date('2000-01-01');

    l_state.filtered = l_state.processed.filter(d => {
        if(l_state.filters.type && d.t !== l_state.filters.type) return false;
        if(l_state.filters.team && d.team !== l_state.filters.team) return false;
        
        if(l_state.filters.assignee) {
            if(l_state.filters.assignee.startsWith("GROUP:")) {
                const gName = l_state.filters.assignee.replace("GROUP:", "");
                const gHashes = (l_state.settings.groups || {})[gName] || [];
                if(!gHashes.includes(l_hash(d.assignee))) return false;
            } else {
                if(d.assignee !== l_state.filters.assignee) return false;
            }
        }
        
        if(d.r && d.r < minDate) return false; 
        return true;
    });

    const f = l_state.filtered;
    const dStr = minDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const info = l_get('d-info');
    if(info) {
        info.textContent = `${l_state.processed.length} issues in project · ${f.length} in filter · ${f.filter(x=>x.isD).length} afgerond · Data vanaf ${dStr}`;
    }

    l_drawDash();
};

// ============================================================
// DIAGNOSTICS & RAW DATA
// ============================================================
window.l_showRawData = function() {
    if (!l_state.raw || l_state.raw.length === 0) return alert("Geen ruwe data beschikbaar. Voer eerst een analyse uit.");
    
    const raw = l_state.raw;
    const tot = raw.length;
    let minC = null, maxR = null;
    const types = {}, statuses = {};
    const assignees = new Set();
    let hasDS=0, hasDE=0, hasSP=0, noD=0;

    raw.forEach(i => {
        const f = i.fields; if(!f) return;
        const t = f.issuetype?.name || "Onbekend"; types[t] = (types[t]||0)+1;
        const s = f.status?.name || "Onbekend"; statuses[s] = (statuses[s]||0)+1;
        if(f.assignee?.displayName) assignees.add(f.assignee.displayName);
        
        const c = f.created ? new Date(f.created) : null;
        const r = f.resolutiondate ? new Date(f.resolutiondate) : null;
        if(c && (!minC || c < minC)) minC = c;
        if(r && (!maxR || r > maxR)) maxR = r;
        
        if(f[L_CFG.F.dev]) hasDS++;
        if(f[L_CFG.F.devEnd1]) hasDE++;
        if(f[L_CFG.F.sp]) hasSP++;
        if(!f[L_CFG.F.dev] && !f.resolutiondate) noD++;
    });

    const fDatStr = d => d ? d.toLocaleDateString('nl-NL', {day:'2-digit', month:'long', year:'numeric'}) : 'Onbekend';
    const pCt = (n, t) => t > 0 ? `${n} <span style="color:#6B778C; font-size:10px;">(${Math.round(n/t*100)}%)</span>` : `${n} <span style="color:#6B778C; font-size:10px;">(n/a)</span>`;
    const rRw = (l, v) => `<div class="r-row"><span class="r-lbl">${l}</span><span class="r-val">${v}</span></div>`;

    const sprs = l_state.sprints || [];
    const aS = sprs.filter(s => s.state === 'active').length;
    const cS = sprs.filter(s => s.state === 'closed').length;
    const fS = sprs.filter(s => s.state === 'future').length;

    const dn = l_state.filtered.filter(d=>d.isD && d.r);
    let throughputs = [];
    const closedSprints = sprs.filter(s => s.state === 'closed' && s.startDate);
    const minDateRaw = l_get('l_dat') && l_get('l_dat').value ? new Date(l_get('l_dat').value) : new Date('2000-01-01');
    
    if (closedSprints.length > 0) {
        closedSprints.sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
        closedSprints.forEach(s => {
            const sStart = new Date(s.startDate);
            const sEnd = new Date(s.completeDate || s.endDate || s.startDate);
            if (sEnd >= minDateRaw) {
                const count = dn.filter(d => d.r >= sStart && d.r <= sEnd).length;
                throughputs.push(count);
            }
        });
    } else {
        const bk = {}; 
        dn.forEach(x=>{ 
            const dt = new Date(x.r); dt.setHours(0,0,0,0);
            dt.setDate(dt.getDate()-((dt.getDay()+6)%7)); 
            const ep = new Date(2020,0,6); 
            const wks = Math.floor((dt-ep)/604800000);
            dt.setTime(ep.getTime() + Math.floor(wks/2)*2*604800000);
            const k = dt.getTime(); 
            bk[k] = (bk[k]||0) + 1; 
        });
        throughputs = Object.values(bk);
    }
    
    const mc1 = l_runMC(throughputs, 1);
    const mc3 = l_runMC(throughputs, 3);

    const d = l_state.diagnostics;

    let h = `<div class="r-grid">`;
    
    h += `<div class="r-card"><h4>Monte Carlo Voorspellingen</h4>
        <div style="font-size:11px; color:#6B778C; margin-bottom:10px;">Gepusht o.b.v. historische throughput (10.000 simulaties).</div>
        <div style="font-weight:bold; color:#172B4D; margin:5px 0 4px 0; font-size:11px; text-transform:uppercase;">Te leveren in de komende sprint</div>
        ${rRw('50% zekerheid (kansrijk)', '≥ ' + mc1.p50 + ' issues')}
        ${rRw('85% zekerheid (realistisch)', '≥ ' + mc1.p15 + ' issues')}
        ${rRw('95% zekerheid (conservatief)', '≥ ' + mc1.p5 + ' issues')}
        
        <div style="font-weight:bold; color:#172B4D; margin:15px 0 4px 0; font-size:11px; text-transform:uppercase;">Te leveren in de komende 3 sprints</div>
        ${rRw('50% zekerheid (kansrijk)', '≥ ' + mc3.p50 + ' issues')}
        ${rRw('85% zekerheid (realistisch)', '≥ ' + mc3.p15 + ' issues')}
        ${rRw('95% zekerheid (conservatief)', '≥ ' + mc3.p5 + ' issues')}
    </div>`;

    const fetchTimeDisplay = d.fetchTime > 0 ? d.fetchTime.toFixed(2) + ' seconden' : 'N/A';

    h += `<div class="r-card"><h4>Systeem Info</h4>
        <div style="font-size:11px; color:#6B778C; margin-bottom:10px;">Statistieken over deze sessie.</div>
        ${rRw('Ingelogde Gebruiker', l_esc(d.user.name))}
        ${rRw('Tijdzone', l_esc(d.user.tz))}
        ${rRw('Jira Versie', l_esc(d.server.ver))}
        ${rRw('Ophaaltijd API', fetchTimeDisplay)}
    </div>`;

    h += `<div class="r-card"><h4>API Informatie</h4>
        <div style="background:#EBECF0; padding:8px; border-radius:3px; font-family:monospace; font-size:11px; margin-bottom:12px; word-break:break-all; color:#172B4D; border: 1px solid #DFE1E6;">${l_esc(l_state.lastJQL) || 'Onbekend'}</div>
        ${rRw('Totaal opgehaalde issues', tot)}
        ${rRw('Oudste issue (Aangemaakt)', fDatStr(minC))}
        ${rRw('Nieuwste issue (Opgelost)', fDatStr(maxR))}
        ${rRw('Unieke teamleden', assignees.size)}
    </div>`;

    h += `<div class="r-card"><h4>Scrum Bord & Sprints</h4>
        <div style="font-size:11px; color:#6B778C; margin-bottom:10px;">Gegevens van het gekoppelde Scrum Bord.</div>
        ${rRw('Geselecteerd bord', l_esc(l_state.boardName) || 'Onbekend')}
        ${rRw('Totaal aantal sprints', sprs.length)}
        ${rRw('- Actief', aS)}
        ${rRw('- Afgerond (Closed)', cS)}
        ${rRw('- Gepland (Future)', fS)}
    </div>`;

    h += `<div class="r-card"><h4>Data Kwaliteit (Compleetheid)</h4>
        <div style="font-size:11px; color:#6B778C; margin-bottom:10px;">Bepaalt of flow metrics accuraat berekend kunnen worden.</div>
        ${rRw('Met "Dev Start" ingevuld', pCt(hasDS, tot))}
        ${rRw('Met "Dev End First" ingevuld', pCt(hasDE, tot))}
        ${rRw('Met Story Points ingevuld', pCt(hasSP, tot))}
        ${rRw('Zonder Start/Eind datum', noD)}
    </div>`;

    const typH = Object.entries(types).sort((a,b)=>b[1]-a[1]).map(([k,v]) => rRw(`- ${l_esc(k)}`, pCt(v,tot))).join('');
    const staH = Object.entries(statuses).sort((a,b)=>b[1]-a[1]).map(([k,v]) => rRw(`- ${l_esc(k)}`, pCt(v,tot))).join('');
    h += `<div class="r-card"><h4>Verdeling in de set</h4>
        <div style="font-weight:bold; color:#172B4D; margin:5px 0 4px 0; font-size:11px; text-transform:uppercase;">Naar Issue Type</div>
        ${typH}
        <div style="font-weight:bold; color:#172B4D; margin:10px 0 4px 0; font-size:11px; text-transform:uppercase;">Naar Status</div>
        ${staH}
    </div>`;

    h += `<div class="r-card" style="grid-column:1/-1;"><h4>Geïmporteerde Velden</h4>
        <div style="font-size:11px; color:#6B778C; margin-bottom:10px;">Interne ID's die zijn gebruikt voor deze analyse.</div>
        <div style="display:flex; gap:30px; flex-wrap:wrap;">
            <div style="flex:1; min-width:250px;">
                <div style="font-weight:bold; color:#172B4D; margin:5px 0 4px 0; font-size:11px; text-transform:uppercase;">Standaard Jira Velden</div>
                ${rRw('Issue Key', 'key')}
                ${rRw('Samenvatting', 'summary')}
                ${rRw('Issue Type', 'issuetype')}
                ${rRw('Status', 'status')}
                ${rRw('Teamlid (Assignee)', 'assignee')}
                ${rRw('Aangemaakt', 'created')}
                ${rRw('Opgelost', 'resolutiondate')}
                ${rRw('Laatst Gewijzigd', 'updated')}
            </div>
            <div style="flex:1; min-width:250px;">
                <div style="font-weight:bold; color:#172B4D; margin:5px 0 4px 0; font-size:11px; text-transform:uppercase;">Custom Fields</div>
                ${rRw('Sprint Started', L_CFG.F.sprint)}
                ${rRw('Start Development', L_CFG.F.dev)}
                ${rRw('End Development First', L_CFG.F.devEnd1)}
                ${rRw('End Development Last', L_CFG.F.devEndL)}
                ${rRw('Story Points', L_CFG.F.sp)}
                ${rRw('Project Team', L_CFG.F.team)}
            </div>
        </div>
    </div>`;

    const debugIssues = raw.slice(0, 20).map(i => {
        const f = i.fields || {};
        return [
            i.key, 
            f.issuetype?.name, 
            f.status?.name, 
            f.created, 
            f.resolutiondate,
            f.updated,
            f[L_CFG.F.sprint]?.value || f[L_CFG.F.sprint] || "",
            f[L_CFG.F.dev],
            f[L_CFG.F.devEnd1],
            f[L_CFG.F.sp]
        ].map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',');
    }).join('\n');
    
    const debugSprints = sprs.slice(0, 10).map(s => {
        return [s.id, s.name, s.state, s.startDate, s.endDate, s.completeDate]
            .map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',');
    }).join('\n');

    h += `<div class="r-card" style="grid-column:1/-1;"><h4>Debug Data (Kopieer dit voor support)</h4>
        <div style="font-size:11px; color:#6B778C; margin-bottom:10px;">Sample van 20 issues en 10 sprints in CSV formaat.</div>
        <div style="font-weight:bold; color:#172B4D; font-size:11px;">Issues (Sample van 20)</div>
        <textarea readonly style="width:100%; height:100px; font-family:monospace; font-size:10px; margin-bottom:10px; padding:6px; border:1px solid #DFE1E6; outline:none;">key,type,status,created,resolved,updated,sprint,devStart,devEnd1,sp\n${debugIssues}</textarea>
        <div style="font-weight:bold; color:#172B4D; font-size:11px;">Sprints (Sample van 10)</div>
        <textarea readonly style="width:100%; height:80px; font-family:monospace; font-size:10px; padding:6px; border:1px solid #DFE1E6; outline:none;">id,name,state,startDate,endDate,completeDate\n${debugSprints}</textarea>
    </div>`;

    h += `</div>`;

    l_get('l-raw-modal-body').innerHTML = h;
    l_show('l-raw-modal-overlay');
};


// ============================================================
// EXTERNE MODULES (Advies & Handleiding)
// ============================================================

window.l_openManual = function(sectionId) {
    l_show('l-man-modal-overlay');
    const body = l_get('l-man-modal-body');
    
    if (window.LUCAS_MANUAL_CONTENT) {
        _renderManual(sectionId);
    } else {
        body.innerHTML = "<div style='padding:15px; color:#FF5630; font-size:12px; border:1px solid #FF5630; border-radius:4px; background:#FFEBE6;'>Handleiding wordt nog geladen. Wacht even en probeer opnieuw, of controleer je netwerk/VPN als dit blijft.</div>";
    }
};

function _renderManual(sectionId) {
    let html = window.LUCAS_MANUAL_CONTENT;
    html = html.replace(/\{\{C_STORY\}\}/g, L_CFG.colors.Story);
    html = html.replace(/\{\{C_BUG\}\}/g, L_CFG.colors.Bug);
    html = html.replace(/\{\{C_TASK\}\}/g, L_CFG.colors.Task);
    html = html.replace(/\{\{C_EPIC\}\}/g, L_CFG.colors.Epic);
    html = html.replace(/\{\{C_SPIKE\}\}/g, L_CFG.colors.Spike);
    html = html.replace(/\{\{C_OTHER\}\}/g, L_CFG.colors.Other);
    
    l_get('l-man-modal-body').innerHTML = html;
    
    if (sectionId) {
        setTimeout(() => {
            const el = l_get(sectionId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

window.l_searchManual = function() {
    const q = l_get('l-man-search').value.toLowerCase();
    const sections = l_get('l-man-modal-body').querySelectorAll('.man-section');
    sections.forEach(s => {
        if (s.innerText.toLowerCase().includes(q)) {
            s.style.display = 'block';
        } else {
            s.style.display = 'none';
        }
    });
};

function _renderAdvice(adviceData, containerDiv) {
    try {
        containerDiv.innerHTML = window.l_generateAdvice(adviceData);
    } catch (err) {
        containerDiv.innerHTML = `<div style='padding:15px; color:#FF5630; font-size:12px; border:1px solid #FF5630; border-radius:4px; background:#FFEBE6;'><b>Uitvoeringsfout in advies:</b> ${err.message}</div>`;
    }
}

// ============================================================
// MODALS VOOR DETAIL EN CARLO UITLEG
// ============================================================
window.l_openModal = function(k, label) {
    if (!window._l_modalData) return;
    const dObj = window._l_modalData[k];
    if(!dObj || !dObj.vals.length) return;
    
    const fmt = dObj.fmt;
    const rows = dObj.vals.sort((a,b) => b._v - a._v);
    
    l_get('l-modal-title').innerText = `${label} per issue`;
    l_get('l-modal-sub').innerText = `${rows.length} issues gesorteerd`;
    
    let h = `<table class="l-tbl"><thead><tr><th style="width:20px"></th><th>Issue</th><th>Samenvatting</th><th style="text-align:right">${label}</th></tr></thead><tbody>`;
    rows.forEach(r => {
        h += `<tr>
            <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${l_col(r.t)}"></span></td>
            <td style="font-family:monospace; font-weight:bold; color:#0052CC;">${l_esc(r.key)}</td>
            <td style="color:#6B778C;">${l_esc(r.summary)}</td>
            <td style="text-align:right; font-weight:bold; color:#172B4D;">${fmt(r._v)}</td>
        </tr>`;
    });
    h += `</tbody></table>`;
    
    l_get('l-modal-body').innerHTML = h;
    l_show('l-modal-overlay');
};

window.l_openMCModal = function(type) {
    if (!window._l_mcData) return;
    const data = window._l_mcData[type];
    if(!data) return;

    const isSP = type === 'sp';
    const label = isSP ? "Story Points" : "Issues";
    const color = isSP ? "#FFAB00" : "#0052CC";

    l_get('l-modal-title').innerText = `Monte Carlo Voorspelling (${label})`;
    l_get('l-modal-sub').innerText = `Hoe de Blackbox werkt (Op basis van de Carlo module)`;

    let h = `
        <div style="padding: 20px; box-sizing: border-box;">
            <div style="padding: 15px; background: #E9F2FF; border-radius: 4px; color: #172B4D; margin-bottom: 20px; font-size: 13px; border-left: 4px solid #0052CC;">
                <strong>De Blackbox Geopend:</strong> In plaats van een simpel gemiddelde te nemen, kijkt het Monte Carlo algoritme naar de historische resultaten hieronder (input). Vervolgens simuleren we de komende periode <strong>10.000 keer</strong> door willekeurig uit dit verleden te 'trekken'. Dit vormt een uiterst betrouwbare wiskundige waarschijnlijkheidsverdeling.
            </div>
            
            <h4 style="margin-bottom: 8px; color: #172B4D;">1. Historische Input (Afgelopen periodes)</h4>
            <p style="font-size: 11px; color: #6B778C; margin-top: 0; margin-bottom: 10px;">Aantal opgeleverde ${label} in het verleden. Hieruit put de wiskundige simulatie willekeurige resultaten.</p>
            <div style="width: 100%; margin-bottom: 20px; background: #FAFBFC; padding: 10px; border-radius: 4px; border: 1px solid #DFE1E6; box-sizing: border-box;">
                <canvas id="mc-modal-hist" style="height: 140px; width: 100%; display:block;"></canvas>
            </div>

            <h4 style="margin-bottom: 8px; color: #172B4D;">2. Forecast Verdeling (Uitkomst na 10.000 simulaties)</h4>
            <p style="font-size: 11px; color: #6B778C; margin-top: 0; margin-bottom: 10px;">Welk getal kwam er in de 10.000 simulatie-runs het vaakst uit?</p>
            <div style="width: 100%; background: #FAFBFC; padding: 10px; border-radius: 4px; border: 1px solid #DFE1E6; box-sizing: border-box;">
                <canvas id="mc-modal-sim" style="height: 160px; width: 100%; display:block;"></canvas>
            </div>
            
            <div style="margin-top: 15px; display: flex; gap: 15px; font-size: 13px; font-weight: bold; border-top: 1px solid #DFE1E6; padding-top: 15px;">
                <div style="color: #6B778C;">50% Kansrijk: ≥ ${data.p50}</div>
                <div style="color: #0052CC;">85% Realistisch: ≥ ${data.p15}</div>
                <div style="color: #FF5630;">95% Veilig: ≥ ${data.p5}</div>
            </div>
        </div>
    `;

    l_get('l-modal-body').innerHTML = h;
    l_show('l-modal-overlay');

    setTimeout(() => {
        const hc = l_ctx('mc-modal-hist');
        if (hc && data.thrp && data.thrp.length) {
            const w = hc._w, h = hc._h;
            hc.clearRect(0, 0, w, h);
            const mC = Math.max(...data.thrp, 1) * 1.1;
            const st = (w - 30) / data.thrp.length;
            const bw = Math.max(4, st * 0.8);
            
            hc.fillStyle = "#6B778C"; hc.font = "10px sans-serif"; hc.textAlign = "right";
            hc.fillText(Math.round(mC), 25, 10);
            hc.beginPath(); hc.moveTo(30, 10); hc.lineTo(30, h-15); hc.lineTo(w, h-15);
            hc.strokeStyle = "#DFE1E6"; hc.stroke();
            
            hc.fillStyle = color;
            data.thrp.forEach((val, i) => {
                const bx = 35 + i * st + (st - bw) / 2;
                const bh = (val / mC) * (h - 20);
                hc.fillRect(bx, h - 15 - bh, bw, bh);
                
                hc.fillStyle = "#172B4D"; hc.textAlign = "center";
                hc.fillText(Math.round(val), bx + bw/2, h - 18 - bh);
                hc.fillStyle = color;
            });
        }

        const sc = l_ctx('mc-modal-sim');
        if (sc && data.sims && data.sims.length) {
            const counts = {};
            data.sims.forEach(v => counts[v] = (counts[v]||0)+1);
            
            const uniqueVals = Object.keys(counts).map(Number).sort((a,b)=>a-b);
            const w = sc._w, h = sc._h;
            sc.clearRect(0, 0, w, h);
            
            const mC = Math.max(...Object.values(counts), 1) * 1.1;
            const st = (w - 30) / uniqueVals.length;
            const bw = Math.max(4, st * 0.8);
            
            sc.beginPath(); sc.moveTo(30, 10); sc.lineTo(30, h-20); sc.lineTo(w, h-20);
            sc.strokeStyle = "#DFE1E6"; sc.stroke();
            
            uniqueVals.forEach((val, i) => {
                const c = counts[val];
                const bx = 35 + i * st + (st - bw) / 2;
                const bh = (c / mC) * (h - 25);
                
                if (val >= data.p15) sc.fillStyle = "#0052CC"; 
                else sc.fillStyle = "rgba(0, 82, 204, 0.3)";
                
                if (val === data.p15) sc.fillStyle = "#FFAB00";
                
                sc.fillRect(bx, h - 20 - bh, bw, bh);
                
                if (uniqueVals.length < 30 || i % Math.ceil(uniqueVals.length/15) === 0) {
                    sc.fillStyle = "#6B778C"; sc.font = "9px sans-serif"; sc.textAlign = "center";
                    sc.fillText(val, bx + bw/2, h - 5);
                }
            });

            const p15Idx = uniqueVals.indexOf(data.p15);
            if (p15Idx !== -1) {
                const px = 35 + p15Idx * st + st/2;
                sc.beginPath(); sc.moveTo(px, 10); sc.lineTo(px, h-20);
                sc.strokeStyle = "#0052CC"; sc.setLineDash([4,4]); sc.lineWidth = 1.5; sc.stroke(); sc.setLineDash([]);
                sc.fillStyle = "#0052CC"; sc.textAlign = "left";
                sc.fillText("85%", px + 4, 15);
            }
        }
    }, 100);
};

// ============================================================
// DASHBOARD RENDERER & HOOFDLOGICA
// ============================================================
function groupItemsByPeriod(itemsToGroup, pD, countSp = false) {
    const bk = {};
    const validSprints = (l_state.sprints || []).filter(s => s.state === 'closed' && s.startDate);
    const minFilterDate = l_get('l_dat') && l_get('l_dat').value ? new Date(l_get('l_dat').value) : new Date('2000-01-01');

    if (pD === 14 && validSprints.length > 0) {
        validSprints.sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
        validSprints.forEach(s => {
            const sStart = new Date(s.startDate);
            const sEnd = new Date(s.completeDate || s.endDate || s.startDate);
            if (sEnd >= minFilterDate) {
                const matchedItems = itemsToGroup.filter(d => d.r >= sStart && d.r <= sEnd);
                const sprintVal = matchedItems.reduce((sum, d) => sum + (countSp ? d.sp : 1), 0);
                const k = sEnd.getTime();
                if(!bk[k]) bk[k] = { d: sEnd, t: {} };
                matchedItems.forEach(d => {
                    bk[k].t[d.t] = (bk[k].t[d.t]||0)+1;
                });
                bk[k]._total = sprintVal;
            }
        });
    } else {
        itemsToGroup.forEach(x => { 
            const dt = new Date(x.r); dt.setHours(0,0,0,0);
            if (pD === 7 || pD === 14) { 
                dt.setDate(dt.getDate()-((dt.getDay()+6)%7)); 
                if (pD === 14) {
                    const ep = new Date(2020,0,6); 
                    const wks = Math.floor((dt-ep)/604800000);
                    dt.setTime(ep.getTime() + Math.floor(wks/2)*2*604800000);
                }
            } else { dt.setDate(1); }
            const k = dt.getTime(); 
            if(!bk[k]) bk[k] = { d: new Date(k), t: {}, _total: 0 };
            bk[k].t[x.t] = (bk[k].t[x.t]||0) + 1;
            bk[k]._total += (countSp ? x.sp : 1);
        });
    }
    return Object.values(bk);
}

window.l_drawDash = async function() {
    const dta = l_state.filtered;
    if (!dta) return;
    window._l_modalData = {};
    window._l_mcData = {}; 

    let adviceData = {};

    // Open issues (In Progress) meegeven aan advies.js voor aging-analyse
    const _now = new Date();
    adviceData.openIssues = l_state.processed
        .filter(d => !d.isD && d.ds)
        .map(d => ({
            key:      d.key,
            summary:  d.summary,
            assignee: d.assignee,
            age:      l_dif(d.ds, _now)
        }))
        .filter(x => x.age !== null);

    const MT = [
        { k:"lt", id:"man-lt", l:"Lead Time", d:"Aangemaakt tot opgelost", c:"#0052CC" },
        { k:"ct", id:"man-ct", l:"Cycle Time", d:"Dev start tot opgelost", c:"#6554C0" },
        { k:"mtr", id:"man-mtr", l:"MTTR", d:"Mean time to repair (bugs)", c:"#FF5630" },
        { k:"qt", id:"man-qt", l:"Queue Time", d:"Aangemaakt tot dev start", c:"#FF8B00" },
        { k:"rs", id:"man-rs", l:"Release Stabilisatie", d:"Eerste tot laatste dev end", c:"#36B37E" },
        { k:"fe", id:"man-fe", l:"Flow Efficiency", d:"Cycletime als % van Leadtime", c:"#0052CC", isPct: true }
    ];

    const metricsDiv = l_get('l-metrics');
    if(metricsDiv) {
        metricsDiv.innerHTML = MT.map(m => {
            const fmt = m.isPct ? fPct : fDay;
            let valsObj = dta.filter(d => d[m.k] !== null && !isNaN(d[m.k])).map(d => ({ ...d, _v: d[m.k] }));
            
            const noDataHtml = `<div class="m-crd" style="--ac:${m.c}">
                <div class="m-tit">${m.l} ${hMark(m.id)}</div>
                <div style="font-size:11px; color:#6B778C; margin-top:10px; line-height:1.5;">
                    <strong style="color:#172B4D;">Onvoldoende data</strong><br>
                    Vul de <i>MT datum-velden</i> in Jira in om deze metriek te bereken (min. 1 afgerond issue vereist).
                </div>
            </div>`;

            if (!valsObj.length) return noDataHtml;
            
            if (l_state.settings.outlier) {
                const thr = l_pct(valsObj.map(x=>x._v), parseInt(l_state.settings.outlier));
                if (thr !== null) valsObj = valsObj.filter(x => x._v <= thr);
            }
            if (!valsObj.length) return noDataHtml;

            const rawVals = valsObj.map(x=>x._v);
            const min = rawVals.reduce((a, b) => a < b ? a : b, Infinity);
            const max = rawVals.reduce((a, b) => a > b ? a : b, -Infinity);
            
            let avg = 0;
            if(rawVals.length > 0) avg = rawVals.reduce((a,b)=>a+b,0) / rawVals.length;

            if(m.k === 'lt') adviceData.ltP85 = l_pct(rawVals, 85);
            if(m.k === 'ct') adviceData.ctP85 = l_pct(rawVals, 85);
            if(m.k === 'fe') adviceData.feAvg = avg;

            const pts = (L_CFG.pcts||[50,85,95]).map(p=>`<span class="l-flex"><span class="p-dot" style="background:${L_CFG.pctColors[p]}"></span>P${p}: <strong style="color:#172B4D">${fmt(l_pct(rawVals,p))}</strong></span>`).join("");
            
            const tCnt = {}; valsObj.forEach(x => { tCnt[x.t] = (tCnt[x.t]||0)+1; });
            const tArr = Object.entries(tCnt).sort((a,b)=>b[1]-a[1]);
            const distBar = tArr.map(([t,n]) => `<div style="height:100%; min-width:2px; width:${(n/rawVals.length)*100}%; background:${l_col(t)}"></div>`).join("");
            const distLeg = tArr.map(([t,n]) => `<span style="font-size:10px; color:#6B778C; display:inline-flex; align-items:center; gap:4px; margin-right:8px;"><span style="width:6px;height:6px;border-radius:50%;background:${l_col(t)}"></span>${l_esc(t)} <strong style="color:#172B4D">${n}</strong> <span style="opacity:0.6">(${Math.round(n/rawVals.length*100)}%)</span></span>`).join("");
            const distHtml = `<div style="margin-top:10px; padding-top:10px;"><div style="display:flex; height:6px; border-radius:3px; overflow:hidden; margin-bottom:6px; gap:1px;">${distBar}</div><div>${distLeg}</div></div>`;

            window._l_modalData[m.k] = { vals: valsObj, fmt: fmt };

            return `<div class="m-crd" style="--ac:${m.c}">
                <div class="l-flex-b m-tit" style="margin-bottom:2px;"><span>${m.l} ${hMark(m.id)}</span><span class="m-cnt">${rawVals.length} issues</span></div>
                <div style="font-size:10px; color:#6B778C; margin-bottom:12px;">${m.d}</div>
                <div class="m-st">
                    <div><div class="m-s-lbl">Min</div><div class="m-s-val">${fmt(min)}</div></div>
                    <div><div class="m-s-lbl" style="color:${m.c}">Gem</div><div class="m-s-val" style="color:${m.c}">${fmt(avg)}</div></div>
                    <div><div class="m-s-lbl">Max</div><div class="m-s-val">${fmt(max)}</div></div>
                </div>
                <div class="m-pct">${pts}</div>
                ${distHtml}
                <button class="m-link" onclick="l_openModal('${m.k}', '${m.l}')">Bekijk issues</button>
            </div>`;
        }).join("");
    }

    let ih = "";
    
    const ct = dta.map(d=>d.ct).filter(v=>v!==null && !isNaN(v));
    if(ct.length>2){
        const mn = ct.reduce((a,b)=>a+b,0)/ct.length, sd = Math.sqrt(ct.map(v=>(v-mn)**2).reduce((a,b)=>a+b,0)/ct.length), cv = mn>0?(sd/mn)*100:0;
        adviceData.cvPct = cv;
        ih += `<div class="l-card"><div class="l-flex-b"><span class="m-tit" style="margin:0">Consistentie (CV) ${hMark('man-cv')}</span><span class="m-cnt">${ct.length} issues</span></div><div class="ti-val">${cv.toFixed(1)}%</div><div class="ti-trk"><div class="ti-fil" style="width:${Math.min(100,cv)}%; background:${cv<50?'#36B37E':cv<80?'#FFAB00':'#FF5630'}"></div></div><div class="ti-row"><span>Gem. / Std. dev</span><strong>${fDay(mn)} / ${fDay(sd)}</strong></div></div>`;
    }
    
    const selThru = l_get('sel-thru'); const pD = selThru ? parseInt(selThru.value) : 14;
    const perLabel = pD === 7 ? "wk" : (pD === 30 ? "mnd" : "sprint");
    const perTitle = pD === 7 ? "weken" : (pD === 30 ? "maanden" : "sprints");

    const doneWithSP = dta.filter(d => d.isD && d.r && d.sp > 0);
    if(doneWithSP.length>1){
        const spsGrps = groupItemsByPeriod(doneWithSP, pD, true);
        if(spsGrps.length > 0) {
            const sps = spsGrps.map(g => g._total);
            
            // FIX: Negeer de "aanloopfase" van teams (leading zeros wegsnijden)
            let startIdx = 0;
            while(startIdx < sps.length && sps[startIdx] === 0) startIdx++;
            const activeSps = sps.slice(startIdx);
            
            if (activeSps.length > 0) {
                const mcSP = l_runMC(activeSps, 1);
                window._l_mcData.sp = mcSP;

                ih += `<div class="l-card" style="display:flex; flex-direction:column;">
                    <div class="l-flex-b"><span class="m-tit" style="margin:0">Voorspelling (SP) ${hMark('man-vel')}</span><span class="m-cnt">${activeSps.length} ${perTitle}</span></div>
                    <div class="ti-val">≥ ${mcSP.p15} <span style="font-size:12px; font-weight:normal; color:#6B778C">SP/${perLabel}</span></div>
                    <div class="ti-row" style="margin-top:16px;"><span>Kansrijk (50%)</span><strong>≥ ${mcSP.p50} SP</strong></div>
                    <div class="ti-row" style="border-top:none; padding-top:4px; margin-top:0;"><span style="color:#0052CC; font-weight:bold;">Realistisch (85%)</span><strong style="color:#0052CC;">≥ ${mcSP.p15} SP</strong></div>
                    <div class="ti-row" style="border-top:none; padding-top:4px; margin-top:0;"><span>Zeer Veilig (95%)</span><strong>≥ ${mcSP.p5} SP</strong></div>
                    <button class="m-link" onclick="l_openMCModal('sp')">Bekijk voorspelling</button>
                </div>`;
            }
        }
    }

    const doneItems = dta.filter(d => d.isD && d.r);
    if (doneItems.length > 1) {
        const itmGrps = groupItemsByPeriod(doneItems, pD, false);
        if (itmGrps.length > 0) {
            const itms = itmGrps.map(g => g._total);
            
            // FIX: Negeer de aanloopfase (leading zeros) ook voor Aantal Issues!
            let startIdx = 0;
            while(startIdx < itms.length && itms[startIdx] === 0) startIdx++;
            const activeItms = itms.slice(startIdx);
            
            if (activeItms.length > 0) {
                const mcItm = l_runMC(activeItms, 1);
                window._l_mcData.itm = mcItm;

                ih += `<div class="l-card" style="display:flex; flex-direction:column;">
                    <div class="l-flex-b"><span class="m-tit" style="margin:0">Voorspelling (Issues) ${hMark('man-vel')}</span><span class="m-cnt">${activeItms.length} ${perTitle}</span></div>
                    <div class="ti-val">≥ ${mcItm.p15} <span style="font-size:12px; font-weight:normal; color:#6B778C">Issues/${perLabel}</span></div>
                    <div class="ti-row" style="margin-top:16px;"><span>Kansrijk (50%)</span><strong>≥ ${mcItm.p50}</strong></div>
                    <div class="ti-row" style="border-top:none; padding-top:4px; margin-top:0;"><span style="color:#0052CC; font-weight:bold;">Realistisch (85%)</span><strong style="color:#0052CC;">≥ ${mcItm.p15}</strong></div>
                    <div class="ti-row" style="border-top:none; padding-top:4px; margin-top:0;"><span>Zeer Veilig (95%)</span><strong>≥ ${mcItm.p5}</strong></div>
                    <button class="m-link" onclick="l_openMCModal('itm')">Bekijk voorspelling</button>
                </div>`;
            }
        }
    }

    const minDateRaw = l_get('l_dat') && l_get('l_dat').value ? new Date(l_get('l_dat').value) : new Date('2000-01-01');
    const inflow = l_state.processed.filter(d => d.c && d.c >= minDateRaw).length;
    const outflow = dta.filter(d => d.isD && d.r && d.r >= minDateRaw).length;
    
    const validSprints = (l_state.sprints || []).filter(s => s.state === 'closed' && s.startDate && new Date(s.startDate) >= minDateRaw);
    let numPeriods = validSprints.length;
    if (numPeriods === 0) {
        const days = Math.max(1, (new Date() - minDateRaw) / 86400000);
        numPeriods = Math.max(1, Math.round(days / 14));
    }

    if (inflow > 0 || outflow > 0) {
        const stabPct = inflow > 0 ? (outflow / inflow) * 100 : 100;
        adviceData.stabPct = stabPct;
        
        let stabColor = "#36B37E";
        let stabText = "Stabiel (Aanvoer ≈ Afvoer)";
        if (stabPct < 85) { stabColor = "#FF5630"; stabText = "Backlog groeit (In > Uit)"; }
        else if (stabPct > 115) { stabColor = "#FFAB00"; stabText = "Backlog krimpt (Uit > In)"; }

        const inPerSprint = (inflow / numPeriods).toFixed(1);
        const outPerSprint = (outflow / numPeriods).toFixed(1);

        ih += `<div class="l-card">
            <div class="l-flex-b"><span class="m-tit" style="margin:0">STABILITEITS INDEX ${hMark('man-stab')}</span><span class="m-cnt">Inflow vs Outflow</span></div>
            <div class="ti-val" style="color:${stabColor}">${stabPct.toFixed(0)}%</div>
            <div class="ti-trk"><div class="ti-fil" style="width:${Math.min(100,stabPct)}%; background:${stabColor}"></div></div>
            <div class="ti-row" style="margin-top:12px;"><span>Nieuw per sprint (gem)</span><strong>${inPerSprint}</strong></div>
            <div class="ti-row" style="border-top:none; padding-top:4px; margin-top:0;"><span>Afgerond per sprint (gem)</span><strong>${outPerSprint}</strong></div>
            <div style="font-size:11px; color:#6B778C; margin-top:12px; line-height:1.4;">${stabText}</div>
        </div>`;
    }

    const rr = dta.filter(d=>d.isD && d.df && d.dl);
    if(rr.length>1){
        const rw = rr.filter(x=>x.rs>0), rt=(rw.length/rr.length)*100, bc = rt<10?'#36B37E':rt<25?'#FFAB00':'#FF5630';
        ih += `<div class="l-card"><div class="l-flex-b"><span class="m-tit" style="margin:0">Rework Rate ${hMark('man-rs')}</span><span class="m-cnt">${rr.length} issues</span></div><div class="ti-val" style="color:${bc}">${rt.toFixed(1)}%</div><div class="ti-trk"><div class="ti-fil" style="width:${Math.min(100,rt)}%; background:${bc}"></div></div><div class="ti-row"><span>Issues met rework</span><strong>${rw.length}</strong></div></div>`;
    }
    const tDiv = l_get('l-team');
    if(tDiv) tDiv.innerHTML = ih;

    const pd = dta.filter(x=>x.isD && x.c && x.ds && x.df && x.dl && x.r);
    const pDiv = l_get('l-phase');
    if(pDiv) {
        if(pd.length){
            const ph = [{l:"Queue",c:"#FF8B00",f:x=>l_dif(x.c,x.ds)},{l:"Active",c:"#0052CC",f:x=>l_dif(x.ds,x.df)},{l:"Stabilisatie",c:"#36B37E",f:x=>l_dif(x.df,x.dl)},{l:"Afronding",c:"#6554C0",f:x=>l_dif(x.dl,x.r)}];
            const tv = [0,0,0,0]; pd.forEach(x=>ph.forEach((p,i)=>tv[i]+=Math.max(0,p.f(x)))); const tt=tv.reduce((a,b)=>a+b,0);
            
            if (tt > 0) {
                pDiv.innerHTML = ph.map((p,i)=>{ const pc=(tv[i]/tt)*100; return `<div class="pb-row"><div class="l-flex-b" style="font-size:12px;"><span class="l-flex"><span class="p-dot" style="background:${p.c}"></span>${p.l}</span><span><strong>${fDay(tv[i]/pd.length)}</strong> <span style="color:${p.c}; margin-left:8px;">${pc.toFixed(1)}%</span></span></div><div class="pb-trk"><div class="ti-fil" style="width:${pc}%;background:${p.c}"></div></div></div>`; }).join("");
            } else {
                 pDiv.innerHTML = `<div style="font-size:11px; color:#6B778C; margin-top:8px; line-height:1.5;"><strong style="color:#172B4D;">Data is te marginaal</strong><br>De doorlooptijden zijn 0 dagen.</div>`;
            }
        } else {
            pDiv.innerHTML = `<div style="font-size:11px; color:#6B778C; margin-top:8px; line-height:1.5;">
                <strong style="color:#172B4D;">Onvoldoende data</strong><br>
                Kan de fases niet opknippen. Zorg dat de <i>MT workflow-datums</i> correct gevuld worden in Jira. Er is minimaal 1 issue vereist dat de hele flow heeft doorlopen.
            </div>`;
        }
    }

    const advDiv = l_get('l-advice-container');
    if (advDiv) {
        if (l_state.settings.hideAdvice) {
            advDiv.style.display = 'none';
        } else {
            advDiv.style.display = 'block'; 
            if (typeof window.l_generateAdvice === 'function') {
                _renderAdvice(adviceData, advDiv);
            } else {
                advDiv.innerHTML = `<div style='padding:15px; color:#FF5630; font-size:12px; border:1px solid #FF5630; border-radius:4px; background:#FFEBE6;'><b>Netwerk Fout:</b> Kan het advies-bestand niet inladen. Check je netwerk/VPN.</div>`;
            }
        }
    }

    setTimeout(drawAllCharts, 150);
}

// --- CANVAS CHARTS ---
function l_ctx(id) { 
    const c = l_get(id); 
    if(!c) return null;
    const r = c.getBoundingClientRect(); 
    if(r.width === 0) return null; 
    c.width = r.width * 2; 
    c.height = r.height * 2; 
    const ctx = c.getContext("2d"); 
    ctx.scale(2,2); 
    ctx._w = r.width; 
    ctx._h = r.height; 
    return ctx; 
}

function l_tks(m, h, t) { const s=Math.max(1,Math.ceil(m/5)), r=[]; for(let v=0;v<=m+s*0.5;v+=s) r.push({v, y:t+h*(1-v/m)}); return r; }

function l_noData(ctx, w, h) {
    ctx.fillStyle = "#172B4D"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; 
    ctx.fillText("Onvoldoende data voor deze grafiek", w / 2, h / 2 - 8);
    ctx.fillStyle = "#6B778C"; ctx.font = "11px sans-serif"; 
    ctx.fillText("Vul de MT datum-velden in Jira in (min. 1 afgerond issue vereist)", w / 2, h / 2 + 10);
}

window.drawAllCharts = function() {
    const dta = l_state.filtered;
    if(!dta || dta.length === 0) return;
    
    const selHist = l_get('sel-hist'); const keyHist = selHist ? selHist.value : 'lt';
    const selScat = l_get('sel-scat'); const keyScat = selScat ? selScat.value : 'lt';
    const selThru = l_get('sel-thru'); const pD = selThru ? parseInt(selThru.value) : 14;
    
    const hc=l_ctx('cv-hist');
    if(hc) {
        const hW = hc._w, hH = hc._h;
        hc.clearRect(0,0,hW,hH);
        
        let hV = dta.map(d=>d[keyHist]).filter(v=>v!==null&&!isNaN(v));
        const origLen = hV.length;
        
        const histMaxInp = l_get('hist-max');
        if (histMaxInp && histMaxInp.value) {
            const limit = parseFloat(histMaxInp.value);
            if (!isNaN(limit)) hV = hV.filter(v => v <= limit);
        }

        const subHist = l_get('sub-hist');
        if (subHist) {
            const hidden = origLen - hV.length;
            subHist.innerHTML = hidden > 0 ? `Verdeling van frequentie <span style="color:#FF5630; font-weight:600; margin-left:4px;">(${hidden} verborgen)</span>` : 'Verdeling van frequentie';
        }

        if(hV.length){
            const maxV = Math.max(...hV, 0);
            const bS=Math.max(1,Math.ceil(maxV/20)), bks=Array(Math.max(1, Math.ceil(maxV/bS)+1)).fill(0);
            hV.forEach(v=>bks[Math.floor(v/bS)]++); const mC=Math.max(...bks,1), tk=l_tks(mC,hH-50,20);
            hc.fillStyle="#6B778C"; hc.font="11px sans-serif"; hc.textAlign="right";
            tk.forEach(t=>{ hc.fillText(Math.round(t.v), 25, t.y); hc.beginPath(); hc.moveTo(30,t.y); hc.lineTo(hW,t.y); hc.strokeStyle="#DFE1E6"; hc.stroke(); });
            const w=(hW-35)/bks.length; bks.forEach((c,i)=>{ if(!c)return; const h=(c/mC)*(hH-50); hc.fillStyle="#0052CC"; hc.fillRect(32+i*w, hH-30-h, Math.max(1, w-1), h); });
        } else {
            l_noData(hc, hW, hH);
        }
    }

    const sc=l_ctx('cv-scat');
    if(sc) {
        const sW = sc._w, sH = sc._h;
        sc.clearRect(0,0,sW,sH);
        const filterDate = l_get('l_dat') && l_get('l_dat').value ? new Date(l_get('l_dat').value).getTime() : new Date('2000-01-01').getTime();
        
        let sP = dta.filter(d=>d[keyScat]!==null&&!isNaN(d[keyScat])&&d.r).map(d=>({v:d[keyScat],t:d.r.getTime(),c:l_col(d.t)}));
        const origLen = sP.length;
        
        const realP85 = l_pct(sP.map(p=>p.v), 85);

        const scatMaxInp = l_get('scat-max');
        if (scatMaxInp && scatMaxInp.value) {
            const limit = parseFloat(scatMaxInp.value);
            if (!isNaN(limit)) sP = sP.filter(p => p.v <= limit);
        }

        const subScat = l_get('sub-scat');
        if (subScat) {
            const hidden = origLen - sP.length;
            subScat.innerHTML = hidden > 0 ? `Elke stip is 1 afgerond issue <span style="color:#FF5630; font-weight:600; margin-left:4px;">(${hidden} verborgen)</span>` : 'Elke stip is 1 afgerond issue';
        }

        if(sP.length){
            const minTraw = sP.reduce((min, p) => p.t < min ? p.t : min, Infinity);
            const mT = Math.max(filterDate, minTraw);
            const xT = Math.max(sP.reduce((max, p) => p.t > max ? p.t : max, 0), Date.now());
            const mV = Math.max(sP.reduce((max, p) => p.v > max ? p.v : max, 0)) * 1.1 || 10;
            
            const xO=t=>40+((t-mT)/(xT-mT||1))*(sW-50), yO=v=>20+(1-v/mV)*(sH-50), tk=l_tks(mV,sH-50,20);
            
            sc.fillStyle="#6B778C"; sc.font="11px sans-serif"; sc.textAlign="right";
            tk.forEach(t=>{ sc.fillText(Math.round(t.v), 30, t.y); sc.beginPath(); sc.moveTo(35,t.y); sc.lineTo(sW,t.y); sc.strokeStyle="#DFE1E6"; sc.stroke(); });
            
            const validSprints = (l_state.sprints || []).filter(s => s.endDate || s.completeDate);
            sc.lineWidth = 1;
            validSprints.forEach(s => {
                const sEnd = new Date(s.completeDate || s.endDate).getTime();
                if (sEnd >= mT && sEnd <= xT) {
                    sc.beginPath(); sc.moveTo(xO(sEnd), 20); sc.lineTo(xO(sEnd), sH - 30);
                    sc.strokeStyle = "rgba(101, 84, 192, 0.4)"; sc.stroke();
                }
            });

            sc.beginPath(); sc.moveTo(40, 15); sc.lineTo(65, 15);
            sc.strokeStyle = "rgba(101, 84, 192, 0.6)"; sc.lineWidth = 2; sc.stroke(); sc.lineWidth = 1;
            sc.fillStyle = "#6B778C"; sc.textAlign = "left"; sc.font = "10px sans-serif";
            sc.fillText("Einde sprint", 70, 18);

            if(realP85 !== null && realP85 <= mV){ 
                sc.beginPath(); sc.moveTo(35,yO(realP85)); sc.lineTo(sW,yO(realP85)); 
                sc.strokeStyle="#FF5630"; sc.setLineDash([5,5]); sc.stroke(); sc.setLineDash([]); 
                
                sc.fillStyle = "#FF5630"; sc.textAlign = "left"; sc.font = "bold 10px sans-serif";
                sc.fillText(`P85 (${fDay(realP85)})`, 40, yO(realP85) - 6);
            }

            sP.forEach(p=>{ sc.beginPath(); sc.arc(xO(p.t),yO(p.v),4,0,Math.PI*2); sc.fillStyle=p.c; sc.fill(); });
            
            sc.textAlign="center"; sc.fillStyle="#6B778C"; sc.font="11px sans-serif";
            for(let i=0; i<=5; i++){ const ts=mT+(i/5)*(xT-mT); sc.fillText(new Date(ts).toLocaleDateString("nl-NL",{month:"short",year:"2-digit"}), xO(ts), sH-12); }
        } else {
            l_noData(sc, sW, sH);
        }
    }

    const tc=l_ctx('cv-thru');
    if(tc) {
        const tW = tc._w, tH = tc._h;
        tc.clearRect(0,0,tW,tH);
        const dn=dta.filter(d=>d.isD&&d.r);
        if(dn.length){
            const srtGrps = groupItemsByPeriod(dn, pD, false);
            const srt = srtGrps.sort((a,b)=>a.d - b.d);
            const ts = srt.map(b => b._total);
            const mC = Math.max(...ts,1)*1.1;
            const tk = l_tks(mC,tH-50,20);
            
            tc.fillStyle="#6B778C"; tc.font="11px sans-serif"; tc.textAlign="right";
            tk.forEach(t=>{ tc.fillText(Math.round(t.v), 25, t.y); tc.beginPath(); tc.moveTo(30,t.y); tc.lineTo(tW,t.y); tc.strokeStyle="#DFE1E6"; tc.stroke(); });
            
            const st=(tW-35)/srt.length, bw=Math.max(1,st*0.8);
            srt.forEach((b,i)=>{ 
                let sy=tH-30, x=32+i*st+(st-bw)/2; 
                Object.entries(b.t).forEach(([t,c])=>{ 
                    const h=(c/mC)*(tH-50); 
                    tc.fillStyle=l_col(t); 
                    tc.fillRect(x,sy-h,Math.max(1, bw),h); 
                    sy-=h; 
                }); 
            });
            
            tc.textAlign="center"; tc.fillStyle="#6B778C";
            const stepX = Math.max(1, Math.ceil(srt.length / 6));
            for(let i=0; i<srt.length; i+=stepX) {
                if(srt[i] && srt[i].d) tc.fillText(srt[i].d.toLocaleDateString("nl-NL",{month:"short",year:"2-digit"}), 32+i*st+st/2, tH-12);
            }
        } else {
            l_noData(tc, tW, tH);
        }
    }

    const cc=l_ctx('cv-cfd');
    if(cc) {
        const cW = cc._w, cH = cc._h;
        cc.clearRect(0,0,cW,cH);
        const cK=["c","ss","ds","df","dl","r"];
        
        let hasData = false;
        let minRaw = Infinity;
        let maxRaw = 0;

        dta.forEach(d => {
            cK.forEach(k => {
                if (d[k] instanceof Date && !isNaN(d[k].getTime())) {
                    hasData = true;
                    const t = d[k].getTime();
                    if (t < minRaw) minRaw = t;
                    if (t > maxRaw) maxRaw = t;
                }
            });
        });

        if(hasData){
            const filterDate = l_get('l_dat') && l_get('l_dat').value ? new Date(l_get('l_dat').value).getTime() : new Date('2000-01-01').getTime();
            const mD = Math.max(filterDate, minRaw); 
            const xD = maxRaw;
            
            const dr = Math.max(86400000, xD - mD); 
            const dy = Math.min(Math.ceil(dr/86400000),100);
            const ds = dr/dy;
            
            const sortedData = {};
            cK.forEach(k => {
                sortedData[k] = dta.filter(d => d[k] instanceof Date).map(d => d[k].getTime()).sort((a,b) => a - b);
            });

            const ptrs = { c:0, ss:0, ds:0, df:0, dl:0, r:0 };
            const pts = [];

            for(let i=0; i<=dy; i++) {
                const t = mD + i*ds;
                const p = {};
                cK.forEach(k => {
                    const arr = sortedData[k];
                    while(ptrs[k] < arr.length && arr[ptrs[k]] <= t) { ptrs[k]++; }
                    p[k] = ptrs[k];
                });
                pts.push(p);
            }
            
            const mC=Math.max(...pts.map(p=>p.c),1), tk=l_tks(mC,cH-50,20), xO=t=>40+((t-mD)/dr)*(cW-50), yO=v=>20+(1-v/mC)*(cH-50);
            
            cc.fillStyle="#6B778C"; cc.font="11px sans-serif"; cc.textAlign="right";
            tk.forEach(t=>{ cc.fillText(Math.round(t.v), 30, t.y); cc.beginPath(); cc.moveTo(35,t.y); cc.lineTo(cW,t.y); cc.strokeStyle="#DFE1E6"; cc.stroke(); });
            
            const cl=["#DFE1E6","#B3D4FF","#4C9AFF","#ABF5D1","#36B37E","#172B4D"];
            
            for(let j=0; j<cK.length; j++){
                cc.beginPath(); 
                cc.moveTo(xO(mD), cH-30); 
                for(let i=0;i<=dy;i++) {
                    cc.lineTo(xO(mD+i*ds),yO(pts[i][cK[j]]));
                }
                cc.lineTo(xO(mD+dy*ds), cH-30); 
                cc.closePath();
                cc.fillStyle=cl[j]; 
                cc.fill(); 
                
                cc.beginPath();
                for(let i=0;i<=dy;i++) {
                    i===0 ? cc.moveTo(xO(mD+i*ds),yO(pts[i][cK[j]])) : cc.lineTo(xO(mD+i*ds),yO(pts[i][cK[j]]));
                }
                cc.strokeStyle = cl[j]; 
                cc.stroke();
            }

            cc.textAlign="center"; cc.fillStyle="#6B778C";
            for(let i=0; i<=5; i++){ const ts=mD+(i/5)*dr; cc.fillText(new Date(ts).toLocaleDateString("nl-NL",{month:"short",year:"2-digit"}), xO(ts), cH-12); }
        } else {
            l_noData(cc, cW, cH);
        }
    }
};