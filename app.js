/*! Radix — MIT License; see LICENSE. Copyright (c) Lucas Bonsel. */
// Based on the original MIT dashboard, github.com/gen-x-coder/Scrum-Flow-Dashboard (11 May 2026).
const RADIX_VIEWS = [['lt','Lead Time'],['ct','Cycle Time'],['qt','Queue Time'],['fe','Flow Efficiency'],['mtr','MTTR'],['team','Teamindicatoren (CV en stabiliteit)'],['mc-issues','Monte Carlo (Issues)'],['mc-sp','Monte Carlo (Story Points)'],['forecast','Einddatumvoorspelling'],['advice','Teamreflectie (advies)'],['phase','Faseverdeling'],['hist','Histogram'],['scat','Scatterplot'],['thru','Throughput'],['cfd','Cumulatief stroomdiagram']];
const RADIX_OPTIONS = window.FLOW_CONFIG;

const L_CFG = {
    URL: String(window.FLOW_CONFIG?.jiraUrl || "").replace(/\/+$/, ""),
    HDR: { 'Accept': 'application/json' },
    FIELDS: ["key","issuetype","status","created","resolutiondate","updated","subtasks",RADIX_OPTIONS.fields.storyPoints,RADIX_OPTIONS.fields.team].filter(Boolean).join(","),
    F: { 
        sp: RADIX_OPTIONS.fields.storyPoints, 
        team: RADIX_OPTIONS.fields.team 
    },
    STATUS_DONE: ["gesloten", "done", "closed", "resolved", "opgelost", "klaar", "gereed", "afgewezen", "Afgewezen", "Won't Do", "gedaan"],
    TYPE_BUG: RADIX_OPTIONS.issueTypes.bug,
    TYPE_STORY: RADIX_OPTIONS.issueTypes.story,
    TYPE_TASK: ["task", "taak", "sub-task", "subtaak"],
    TYPE_EPIC: ["epic", "feature", "initiatief", "initiative"],
    TYPE_SPIKE: ["spike", "onderzoek", "research", "enabler"],
    colors: { Bug:"#FF5630", Story:"#0052CC", Epic:"#6554C0", Task:"#36B37E", Spike:"#FF8B00", Other:"#97A0AF" },
    pctColors: { 50:"#36B37E", 85:"#FFAB00", 95:"#FF5630" },
    pcts: [50, 85, 95] 
};

const L_DEF = RADIX_OPTIONS.defaults;

let l_state = {
    raw: [], processed: [], filtered: [], sprints: [], boardName: "", lastJQL: "",
    settings: RadixConfig.preferences(RADIX_OPTIONS),
    filters: { type: "", team: "" },
    historyQuality: null
};

const l_get = id => document.getElementById(id);
const modalFocus = new Map();
const l_show = id => { const e = l_get(id); if (!e) return; e.style.display='block'; if(id.endsWith('-modal-overlay')){modalFocus.set(id,document.activeElement);e.setAttribute('role','dialog');e.setAttribute('aria-modal','true');e.setAttribute('aria-label',e.querySelector('h2,h3')?.textContent||'Radix dialoog');e.querySelector('button,input,[tabindex]')?.focus();} };
const l_hide = id => { const e = l_get(id); if (!e) return; e.style.display='none'; if(modalFocus.has(id)){modalFocus.get(id)?.focus?.();modalFocus.delete(id);} };
window.addEventListener('keydown',event=>{
    const id=[...modalFocus.keys()].at(-1);if(!id)return;const e=l_get(id);if(!e)return;
    if(event.key==='Escape'){event.preventDefault();l_hide(id);}
    if(event.key==='Tab'){const nodes=[...e.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(x=>!x.disabled&&x.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&(document.activeElement===first||!e.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!e.contains(document.activeElement))){event.preventDefault();first.focus();}}
});
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
const fDay = v => v === null || isNaN(v) ? "–" : (v < 1 && l_state.settings.workdays!=="workdays" ? `${Math.round(v*24)}u` : `${v.toFixed(l_state.settings.workdays==="workdays" && v<1?2:1)}${l_state.settings.workdays==="workdays"?"wd":"d"}`);
const fPct = v => v === null || isNaN(v) ? "–" : `${v.toFixed(1)}%`;
const hMark = id => `<button type="button" onclick="l_openManual('${id}')" style="background:none;border:0;padding:0;cursor:pointer;color:#6B778C; text-decoration:none; margin-left:6px; font-weight:normal;" title="Uitleg lezen" aria-label="Uitleg lezen">(?)</button>`;

window.l_syncMax = function(id) {
    const val = l_get(id).value;
    if (id === 'hist-max' && l_get('scat-max')) l_get('scat-max').value = val;
    if (id === 'scat-max' && l_get('hist-max')) l_get('hist-max').value = val;
    drawAllCharts();
};

function injectFlowCSS() {
    if(document.getElementById('radix-css-inject')) return;
    const style = document.createElement('style');
    style.id = 'radix-css-inject';
    style.textContent = `
        #radix-app { font-family: inherit; background: transparent; color: inherit; font-size: 14px; line-height: 1.5; padding: 0; border: none; width: 100%; display: block; }
        #radix-app * { box-sizing: border-box; }
        #radix-app [hidden] { display:none !important; }
        #radix-app .m-s-val { font-size:22px; }
        #radix-app .m-tit { font-size:13px; }
        #radix-app .m-pct { flex-wrap:wrap; justify-content:space-between; }
        #radix-app .m-primary { font-size:32px; font-weight:700; line-height:1.15; color:var(--ac); margin:4px 0; }
        #radix-app .m-caption { font-size:12px; color:#42526E; }
        #radix-app .m-secondary { display:flex; justify-content:space-between; gap:8px; margin:10px 0; font-size:12px; color:#42526E; }
        #radix-app .m-tit { gap:8px; flex-wrap:wrap; color:#172B4D; text-transform:none; }
        #radix-app #l-metrics, #radix-app #l-team { display:contents; }
        #radix-app .radix-chart-legend {display:flex;flex-wrap:wrap;gap:8px 16px;margin:8px 0;color:#42526E;font-size:11px;}
        #radix-app .radix-chart-legend span {display:inline-flex;align-items:center;gap:5px;}
        #radix-app .radix-chart-legend i {display:inline-block;flex:none;width:10px;height:10px;border-radius:2px;}
        #radix-app .radix-advice-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:12px;}
        #radix-app .radix-advice-grid article {border:1px solid #DFE1E6;border-radius:6px;padding:14px;line-height:1.5;font-size:12px;color:#42526E;}
        #radix-app .radix-advice-grid p {margin:6px 0;}
        #radix-app .radix-advice-grid h4 {margin:0 0 8px;font-size:14px;color:#172B4D;}
        #radix-app .metric-kind {font-size:10px; color:#6B778C; letter-spacing:.03em; margin-bottom:5px;}
        #radix-app #l-card-grid > div > .l-card { margin-bottom:0; min-width:0; }
        #radix-app #l-chart-grid > .l-card { margin-bottom:0; min-width:0; }
        #radix-app #radix-forecast .l-card { max-width:700px; }
        #radix-app #radix-views { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:2px 10px; }

        #radix-app h2, #radix-app h3, #radix-app h4 { font-family: inherit; color: inherit; margin-top: 0; }
        
        #radix-app .l-flex { display: flex; align-items: center; }
        #radix-app .l-flex-b { display: flex; align-items: center; justify-content: space-between; }
        #radix-app .l-card { background: #FFFFFF; border-radius: 6px; box-shadow: 0 1px 3px rgba(9,30,66,.12); padding: 20px; margin-bottom: 20px; display:flex; flex-direction:column; }
        #radix-app .l-grid-m { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; margin-bottom: 24px; }
        #radix-app .l-grid-2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; margin-bottom: 24px; }
        
        #radix-app .l-btn { background: #0052CC; color: #fff; border: none; border-radius: 3px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
        #radix-app .l-btn-alt { background: transparent; border: 1px solid #DFE1E6; color: #172B4D; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: 500; }
        #radix-app .l-btn-alt:hover { background: #F4F5F7; }
        
        #radix-app .f-btn { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.3); color: #fff; border-radius: 3px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-weight: 500; transition: background .2s; }
        #radix-app .f-btn:hover { background: rgba(255,255,255,.2); }

        #radix-app .l-inp, #radix-app .l-sel { width: 100%; padding: 8px; border: 1px solid #DFE1E6; border-radius: 3px; font-size: 13px; background: #FAFBFC; margin-top: 4px; outline: none; }
        #radix-app .l-sel-inline { padding: 4px 8px; border: 1px solid #DFE1E6; border-radius: 3px; font-size: 12px; background: #FAFBFC; outline: none; cursor: pointer; color: #172B4D; }
        
        #radix-app #l-filter-bar { background: #0747A6; padding: 12px 20px; border-radius: 6px; color: white; gap: 15px; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; width: 100%; }
        #radix-app .f-sel { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.3); color: #fff; border-radius: 3px; padding: 6px 8px; font-size: 12px; outline: none; cursor:pointer;}
        #radix-app .f-sel option { background: #fff; color: #172B4D; }
        
        #radix-app .m-crd { position: relative; overflow: hidden; background: #fff; border-radius: 6px; box-shadow: 0 1px 3px rgba(9,30,66,.12); padding: 20px; border: 1px solid #DFE1E6; display: flex; flex-direction: column; }
        #radix-app .m-crd::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--ac); border-radius: 6px 0 0 6px; }
        #radix-app .m-tit { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6B778C; margin-bottom: 12px; }
        #radix-app .m-cnt { font-size: 11px; color: #6B778C; background: #F4F5F7; padding: 2px 8px; border-radius: 10px; }
        #radix-app .m-st { display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; gap: 8px; margin-bottom: 12px; }
        #radix-app .m-s-lbl { font-size: 10px; color: #6B778C; text-transform: uppercase; }
        #radix-app .m-s-val { font-size: 18px; font-weight: 700; line-height: 1.2; color: #172B4D; }
        #radix-app .m-pct { border-top: 1px solid #DFE1E6; padding-top: 10px; display: flex; gap: 8px; font-size: 11px; color: #6B778C; }
        #radix-app .p-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
        
        #radix-app .l-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
        #radix-app .l-tbl th { position: sticky; top: 0; background: #FAFBFC; padding: 10px; text-align: left; border-bottom: 1px solid #DFE1E6; color: #6B778C; text-transform: uppercase; font-size: 10px; }
        #radix-app .l-tbl td { padding: 10px; border-bottom: 1px solid #DFE1E6; color: #172B4D; }
        #radix-app .m-link { background: none; border: none; color: #0052CC; padding: 10px 0 0 0; margin-top: auto; border-top: 1px solid #DFE1E6; width: 100%; text-align: left; cursor: pointer; font-size: 12px; font-weight: 600; }
        #radix-app .m-link:hover { text-decoration: underline; }


        #radix-app .ti-val { font-size: 32px; font-weight: 700; line-height: 1.1; margin: 8px 0 4px 0; color: #172B4D; }
        #radix-app .ti-trk { height: 8px; background: #DFE1E6; border-radius: 4px; margin: 8px 0; overflow: hidden; }
        #radix-app .ti-fil { height: 100%; border-radius: 4px; }
        #radix-app .ti-row { display: flex; justify-content: space-between; font-size: 12px; color: #6B778C; border-top: 1px solid #DFE1E6; padding-top: 6px; margin-top: 6px; }
        
        #radix-app .pb-row { margin-bottom: 14px; }
        #radix-app .pb-trk { height: 10px; background: #DFE1E6; border-radius: 5px; margin-top: 5px; overflow: hidden; }
        
        #radix-app .c-tit { font-size: 16px; font-weight: 600; color: inherit; font-family: inherit; margin-bottom: 2px; }
        #radix-app .c-sub { font-size: 11px; color: #6B778C; margin-bottom: 12px; }
        #radix-app canvas.l-cvs { width: 100%; height: 260px; display: block; }
        
        #radix-app #l-log { display: none; padding: 12px 16px; background: #EBECF0; font-family: monospace; font-size: 12px; margin-top: 15px; border-radius: 4px; color: #172B4D; max-height: 200px; overflow-y: auto; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #DFE1E6; }
        
        #radix-app .l-modal-bg { display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(9,30,66,0.6); z-index:9999; }
        #radix-app .l-modal-box { position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:#fff; border-radius:6px; width:800px; max-width:95vw; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 8px 40px rgba(9,30,66,.3); }
        #radix-app .l-modal-box-lg { width:900px; }
        #radix-app .l-modal-header { padding:20px; border-bottom:1px solid #DFE1E6; display:flex; justify-content:space-between; align-items:center; background:#FAFBFC; }
        #radix-app .l-modal-body { overflow-y:auto; padding:20px; font-size:13px; color:#172B4D; }
        
        @media (max-width: 900px) {
            #radix-app .l-grid-2 { grid-template-columns: 1fr; }
        }
    `;
    document.head.appendChild(style);
}

function loadSettings() {
    let saved;
    try { saved=JSON.parse(localStorage.getItem('radix_settings')); } catch(e) {}
    l_state.settings=RadixConfig.preferences(RADIX_OPTIONS,saved);
}

function saveSettings() {
    try {
        localStorage.setItem('radix_settings', JSON.stringify(l_state.settings));
    } catch(e) {}
}

window.initFlowApp = function(containerId) {
    injectFlowCSS();
    loadSettings();
    const root = document.getElementById(containerId);
    if (!root) return;
    
    const defDate = RadixConfig.fromDate(RADIX_OPTIONS.defaultMonths);

    root.innerHTML = `
    <div id="radix-app">
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
                <button type="button" class="l-btn-alt" style="margin-top:10px" onclick="RadixHistory.clearCache().then(ok=>alert(ok ? 'Lokale historiecache gewist.' : 'Cache wissen niet gelukt.'))">Historiecache wissen</button>
            </div>
        </div>

        <div id="l-dash" style="display:none; width: 100%;">
            
            <div id="l-filter-bar">
                <div class="l-flex" style="gap: 12px; flex-wrap: wrap;">
                    <span style="font-size:12px; color:rgba(255,255,255,.7);">Filter:</span>
                    <select id="f_type" class="f-sel" onchange="l_applyFilters()"><option value="">Alle typen</option></select>
                    
                    <select id="f_team" class="f-sel" onchange="l_applyFilters()"><option value="">Alle teams</option></select>
                </div>
                <div class="l-flex" style="gap: 10px; flex-wrap: wrap;">
                    <button onclick="l_openSettings()" class="f-btn">Instellingen</button>
                    <button onclick="l_openManual()" class="f-btn">Handleiding</button>
                    <button onclick="location.reload()" class="f-btn">Nieuwe Analyse</button>
                </div>
            </div>
            <div id="d-info" style="margin-bottom:20px; font-size:12px; color:#6B778C;"></div>
            
            <div class="l-grid-m" id="l-card-grid">
                <div id="l-metrics"></div>
                <div id="l-team"></div>
            </div>
            <div id="radix-forecast" hidden></div>
            
            <div id="l-advice-container" hidden></div>
            
            <div class="l-grid-2" id="l-chart-grid">
                <div class="l-card"><div class="c-tit">Fase-verdeling ${hMark('man-phase')}</div><div class="c-sub">Tijd per Jira-statuscategorie tot laatste Done</div><div id="l-phase"></div></div>
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
                    <canvas role="img" aria-label="Histogram van doorlooptijden" id="cv-hist" class="l-cvs"></canvas>
                </div>
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
                    <canvas role="img" aria-label="Scatterplot van afgeronde issues" id="cv-scat" class="l-cvs"></canvas><div id="scat-legend" class="radix-chart-legend"></div>
                </div>
                <div class="l-card">
                    <div class="l-flex-b"><div class="c-tit">Throughput ${hMark('man-thru')}</div>
                        <select id="sel-thru" class="l-sel-inline" onchange="radixSetPeriod(this.value)">
                            <option value="14" selected>Per sprint</option>
                            <option value="7">Per week</option>
                            <option value="30">Per maand</option>
                        </select>
                    </div>
                    <div class="c-sub">Aantal afgeronde issues per periode</div>
                    <canvas role="img" aria-label="Throughput per periode" id="cv-thru" class="l-cvs"></canvas>
                </div>
                <div class="l-card">
                    <div class="c-tit">Cumulatief Stroomdiagram (CFD) ${hMark('man-cfd')}</div>
                    <div class="c-sub">Historische statusverdeling van de huidige selectie</div>
                    <canvas role="img" aria-label="Cumulatief stroomdiagram" id="cv-cfd" class="l-cvs"></canvas><div id="cfd-legend" class="radix-chart-legend"></div><div id="cfd-quality" class="m-caption"></div>
                </div>
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
                            
                            <span style="font-size:11px; font-weight:bold; color:#6B778C; display:block; margin-top:15px;">Uitschieters uitsluiten (alleen gemiddelde)</span>
                            <select id="s_outlier" class="l-sel"><option value="">Uitgeschakeld</option><option value="90">Boven P90</option><option value="95">Boven P95</option><option value="99">Boven P99</option></select>
                            
                            <span style="font-size:11px; font-weight:bold; color:#6B778C; display:block; margin-top:15px;">Weergave Opties</span>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0"><button type="button" class="l-btn-alt" onclick="radixPreset('standard')">Standaard</button><button type="button" class="l-btn-alt" onclick="radixPreset('compact')">Compact</button><button type="button" class="l-btn-alt" onclick="radixPreset('all')">Alles</button></div><div id="radix-views"></div>
                        </div>
                        <div>
                            <span style="font-size:11px; font-weight:bold; color:#6B778C;">Feestdagen (Uitsluiten bij werkdagen, YYYY-MM-DD per regel)</span>
                            <textarea id="s_holidays" style="width:100%; height:80px; padding:8px; border:1px solid #DFE1E6; border-radius:3px; font-size:12px; margin-top:4px; font-family:monospace; resize:vertical;"></textarea>
                        </div>
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

    if(l_get('sel-thru')) l_get('sel-thru').value = ({sprint:'14',week:'7',month:'30'})[l_state.settings.throughputPeriod];
    if(l_get('s_workdays')) l_get('s_workdays').value = l_state.settings.workdays;
    if(l_get('s_outlier')) l_get('s_outlier').value = l_state.settings.outlier;
    if(l_get('s_holidays')) l_get('s_holidays').value = (l_state.settings.holidays||[]).join('\n');
    if(l_get('radix-views')) l_get('radix-views').innerHTML = RADIX_VIEWS.map(([id,label])=>`<label style="display:flex;gap:7px;align-items:center;padding:4px 0"><input type="checkbox" value="${id}" ${l_state.settings.visible.includes(id)?'checked':''}>${label}</label>`).join('');
    
    if (window._l_resizeHandler) window.removeEventListener("resize", window._l_resizeHandler);
    window._l_resizeHandler = () => {
        if (l_state.filtered && l_state.filtered.length) {
            clearTimeout(window._l_resizeTimer);
            window._l_resizeTimer = setTimeout(drawAllCharts, 200);
        }
    };
    window.addEventListener("resize", window._l_resizeHandler);
};

window.radixSetPeriod = function(value) {
    l_state.settings.throughputPeriod=({14:"sprint",7:"week",30:"month"})[value] || "sprint";
    saveSettings(); l_drawDash();
};
window.radixPreset = function(mode) {
    const ids=mode==='compact'?['lt','ct','scat']:mode==='all'?RADIX_VIEWS.map(x=>x[0]):L_DEF.visible;
    document.querySelectorAll('#radix-views input').forEach(e=>e.checked=ids.includes(e.value));
};
window.l_openSettings = function() {
    document.querySelectorAll('#radix-views input').forEach(e=>e.checked=l_state.settings.visible.includes(e.value));
    l_show('l-settings-modal-overlay');
};

window.l_saveSettings = function() {
    if(!l_get('s_workdays')) return;
    l_state.settings.workdays = l_get('s_workdays').value;
    l_state.settings.outlier = l_get('s_outlier').value;
    l_state.settings.viewV6 = true;
    l_state.settings.visible = Array.from(document.querySelectorAll("#radix-views input:checked")).map(e=>e.value);
    
    const rawHols = l_get('s_holidays').value.split('\n').map(s=>s.trim()).filter(Boolean);
    const invalidHols = [];
    l_state.settings.holidays = rawHols.map(h => {
        const d = new Date(h);
        if (!RadixConfig.dateOK(h)) { invalidHols.push(h); return null; }
        return d.toISOString().split('T')[0];
    }).filter(Boolean);

    if (invalidHols.length > 0) {
        alert(`Let op: de volgende feestdagen hebben een ongeldig formaat en zijn genegeerd (gebruik YYYY-MM-DD):\n\n${invalidHols.join('\n')}`);
    }

    saveSettings();
    l_hide('l-settings-modal-overlay');
    if (l_state.historyQuality) l_processData();
};

window.l_search = async function() {
    const inp = l_get('l_inp');
    const val = inp ? inp.value.trim().toUpperCase() : "";
    
    if(!val || !/^[A-Z0-9_]+$/i.test(val)) return alert("Vul een geldige Project Key in (alleen letters en cijfers).");
    
    const logBox = l_get('l-log');
    if(logBox) logBox.innerHTML = ""; 
    
    try {
        const authRes = await fetch(`${L_CFG.URL}/rest/api/2/myself`, { credentials: 'include', cache: 'no-store', headers: L_CFG.HDR });
        if (!authRes.ok) throw new Error("Je bent niet ingelogd in Jira (of er is geen verbinding). Log in in een ander tabblad en probeer het opnieuw.");
        
        const usr = await authRes.json();
        if (!(usr.name || usr.key || usr.accountId) || usr.name === "anonymous") throw new Error("Log eerst in bij Jira.");
        l_log("Jira-sessie actief.");
        l_log(`Zoeken naar borden gekoppeld aan project '${val}'...`);

        const d = {values: []};
        for (let offset = 0;;) {
            const u = `${L_CFG.URL}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(val)}&startAt=${offset}`;
            const r = await fetch(u, { credentials:'include', cache:'no-store', headers:L_CFG.HDR });
            if(!r.ok) throw new Error("Fout bij het ophalen van borden (HTTP " + r.status + ").");
            const page = await r.json();
            if (!Array.isArray(page.values)) throw new Error('Ongeldige bordpagina');
            d.values.push(...page.values); offset += page.values.length;
            if (page.isLast === true || (Number.isFinite(page.total) && offset >= page.total)) break;
            if (!page.values.length) { if (page.isLast === false) throw new Error('Onvolledige bordpaginering'); break; }
            if (page.isLast === undefined && !Number.isFinite(page.total) && page.values.length < (page.maxResults || 50)) break;
        }
        
        if(!d.values || !d.values.length) throw new Error("Geen borden gevonden voor dit project.");
        
        const sel = l_get('l_brd');
        if(sel) sel.innerHTML = d.values.map(b=>`<option value="${l_esc(b.id)}">${l_esc(b.name)} (${l_esc(b.type)})</option>`).join("");
        
        l_state.searchedProject = val;
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
    if (!/^[A-Z0-9_]+$/.test(v) || !RadixConfig.dateOK(dat) || !/^\d+$/.test(bId) || v !== l_state.searchedProject) return alert("Zoek eerst de borden opnieuw en kies een geldige datum.");
    if(btn) btn.disabled = true;
    
    const logBox = l_get('l-log');
    if(logBox) logBox.innerHTML = ""; 
    
    try {
        if (inpB.selectedIndex >= 0) {
            l_state.boardName = inpB.options[inpB.selectedIndex].text;
        }

        const t0 = performance.now();

        const authRes = await fetch(`${L_CFG.URL}/rest/api/2/myself`, { credentials: 'include', cache: 'no-store', headers: L_CFG.HDR });
        if (!authRes.ok) throw new Error("Je bent niet ingelogd in Jira (of er is geen verbinding). Log in via een ander tabblad en probeer het opnieuw.");
        const usrData = await authRes.json();
        if (!(usrData.name || usrData.key || usrData.accountId) || usrData.name === "anonymous") throw new Error("Log eerst in bij Jira.");
        l_log("Jira-sessie actief.");

        l_log("Sprints ophalen voor geselecteerde bord...");
        let sprs = [], sAt = 0, sLast = false;
        while (!sLast) {
            const sr = await fetch(`${L_CFG.URL}/rest/agile/1.0/board/${bId}/sprint?startAt=${sAt}`, { credentials: 'include', cache: 'no-store', headers: L_CFG.HDR });
            if (!sr.ok) { l_log("Let op: Kon sprints niet laden, we gaan verder met enkel issues."); break; }
            const sd = await sr.json();
            if (sd.values) sprs.push(...sd.values);
            if (!sd.values?.length && sd.isLast === false) throw new Error("Onvolledige sprintpaginering.");
            sLast = sd.isLast !== undefined ? sd.isLast : true;
            sAt += (sd.values ? sd.values.length : 50);
        }
        l_state.sprints = sprs;
        if(sprs.length) l_log(`${sprs.length} Sprints succesvol ingeladen.`);
        
        l_log("Issues ophalen uit Jira (dit kan even duren bij grote projecten)...");
        const jql = RadixConfig.boardJQL(v,dat,RADIX_OPTIONS.statusCategories);
        l_state.lastJQL = jql;
        
        async function fetchBoardIssues() {
            let iss=[], at=0, more=true;
            while(more){
                const r = await fetch(`${L_CFG.URL}/rest/agile/1.0/board/${bId}/issue?jql=${encodeURIComponent(jql)}&startAt=${at}&maxResults=1000&fields=${L_CFG.FIELDS}`, { credentials: 'include', cache: 'no-store', headers: L_CFG.HDR });
                if(!r.ok) throw new Error("API Fout: "+r.status);
                const d = await r.json(); 
                if(!Array.isArray(d.issues) || !Number.isFinite(d.total)) throw new Error("Jira gaf geen geldige issuepagina terug.");
                iss.push(...d.issues);
                if(!d.issues.length && at < d.total) throw new Error("Onvolledige issuepaginering.");
                if(!d.issues.length || at + d.issues.length >= d.total) more=false; 
                else at+=d.issues.length;
                
                l_log(`... ${iss.length} issues binnengehaald...`);
            }
            return iss;
        }
        const iss = await fetchBoardIssues();
        l_log(`Alle data binnen! (${((performance.now()-t0)/1000).toFixed(1)} sec)`);
        
        l_state.source = 'history';
        const candidates = iss.filter(i => { const n=(i.fields?.issuetype?.name||'').trim().toLowerCase(); return [...L_CFG.TYPE_BUG,...L_CFG.TYPE_STORY].some(x=>n === x); });
        l_log(`Wijzigingshistorie ophalen voor ${candidates.length} Stories en Bugs…`);
        l_state.historyQuality = await RadixHistory.load(L_CFG.URL,candidates,(n,total)=>{if(n%10===0||n===total) l_log(`Historie: ${n} / ${total}`);},window.FLOW_CONFIG || {},usrData,fetchBoardIssues);
        try { l_state.subtaskQuality = await RadixWorkflow.enrich(L_CFG.URL,candidates,RadixHistory.load,usrData,window.FLOW_CONFIG || {},(n,total)=>{if(n%10===0||n===total)l_log(`Subtaakhistorie: ${n} / ${total}`);}); } catch(e) { l_state.subtaskQuality={failed:true}; l_log('Subtaakhistorie niet volledig beschikbaar; primaire metingen blijven behouden.'); }
        l_log(`Historie afgerond: ${l_state.historyQuality.errors} ophaalfouten, ${l_state.historyQuality.incomplete} onvolledige of onbekende workflows.`);
        const unknownNames=Object.keys(l_state.historyQuality.unknownStatuses||{});
        if(unknownNames.length)l_log('Onbekende historische statussen: '+unknownNames.join(', '));
        l_state.raw = iss;


        l_log("Wiskundige modellen toepassen en dashboard genereren...");
        
        l_hide('l-setup'); 
        l_show('l-dash');
        
        l_get('l-dash').offsetWidth; 

        const cfdTitle=l_get('cv-cfd')?.parentElement?.querySelector('.c-tit');
        if(cfdTitle) cfdTitle.innerHTML='Cumulatief stroomdiagram (CFD) '+hMark('man-cfd');
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

const radixIssueIdentity = new WeakMap();
window.RADIX_ENGINE_VERSION = window.RADIX_VERSION;
const radixCardStats = {};
function l_processData() {
    const dn = L_CFG.STATUS_DONE.map(s=>s.toLowerCase());
    const ty = t => { 
        const tl=(t||"").trim().toLowerCase(); 
        if(L_CFG.TYPE_BUG.some(x => tl === x)) return "Bug"; 
        if(L_CFG.TYPE_STORY.some(x => tl === x)) return "Story"; 
        if(L_CFG.TYPE_TASK.some(x => tl === x)) return "Task"; 
        if(L_CFG.TYPE_EPIC && L_CFG.TYPE_EPIC.some(x => tl === x)) return "Epic"; 
        if(L_CFG.TYPE_SPIKE && L_CFG.TYPE_SPIKE.some(x => tl === x)) return "Spike"; 
        return "Other"; 
    };
    const pD = s => s ? new Date(s) : null;
    const gF = (f, id) => id ? (f[id]?.value ?? f[id]) : null;

    l_state.processed = l_state.raw.map(i => {
        if(!i || !i.fields) return null;
        const f=i.fields, t=ty(f.issuetype?.name);
        
        const statusName = (f.status?.name||"").toLowerCase();
        const override=Object.entries(RADIX_OPTIONS.statusCategories).find(([name])=>name.trim().toLowerCase()===statusName.trim())?.[1];
        const isD = i.radixHistory?.done ?? (override ? override==='done' : f.status?.statusCategory?.key ? f.status.statusCategory.key === "done" : dn.includes(statusName));
        
        const team = gF(f, L_CFG.F.team) ?? "Geen Team";
        
        const c=pD(f.created);
        const h=i.radixHistory;
        const ds=h?.start || i.radixSubtaskStart || null;
        const r=isD ? (h?.finish || pD(f.resolutiondate)) : null;
        const active=h?.done && h.start && h.finish ? h.intervals.filter(x=>x.state==='progress').reduce((sum,x)=>sum+(l_dif(x.from,x.to,true) ?? 0),0) : null;
        const lt=isD?l_dif(c,r):null, ct=isD?l_dif(ds,r):null;
        
        const teams = [...new Set((Array.isArray(team)?team:[team]).map(v=>v && typeof v === "object" ? String(v.value ?? v.name ?? v.title ?? v.id ?? "") : String(v ?? "")).filter(Boolean))];
        if(!teams.length)teams.push("Geen Team");

        const currentCategory=['todo','progress','done'].includes(override)?override:({new:'todo',indeterminate:'progress',done:'done'})[f.status?.statusCategory?.key];
        const row = { history:h || null, currentCategory, missingStartReason:h?.start||i.radixSubtaskStart?null:!h?"historie ontbreekt of onvolledig":h.done?"geen actieve status geregistreerd":"nog niet gestart of geen actieve status geregistreerd", startSource:h?.start?'history':i.radixSubtaskStart?'subtask':'unknown', t, isD, team:teams[0], teams, sp:parseFloat(gF(f,L_CFG.F.sp))||0, c, r, ds, lt, ct, mtr:(isD&&t==="Bug")?l_dif(c,r):null, qt:l_dif(c,ds), age:(!isD&&ds)?l_dif(ds,new Date()):null, active, reopened:i.radixHistory?.reopened ?? null, fe:(ct!==null&&lt>0&&active!==null)?Math.min(100,active/l_dif(c,r,true)*100):null };
        radixIssueIdentity.set(row, String(i.key || ""));
        return row;
    }).filter(d => d !== null && (d.t === 'Story' || d.t === 'Bug'));

    const types = [...new Set(l_state.processed.map(d=>d.t))].sort();
    const teams = [...new Set(l_state.processed.flatMap(d=>d.teams))].filter(Boolean).sort();
    
    const fType = l_get('f_type');
    const fTeam = l_get('f_team');
    
    if(fType) { fType.innerHTML = '<option value="">Alle typen</option>' + types.map(x=>`<option value="${l_esc(x)}">${l_esc(x)}</option>`).join(""); fType.value = l_state.filters.type; }
    if(fTeam) { fTeam.innerHTML = '<option value="">Alle teams</option>' + teams.map(x=>`<option value="${l_esc(x)}">${l_esc(x)}</option>`).join(""); fTeam.value = l_state.filters.team; }
    
    l_applyFilters();
}

window.l_applyFilters = function() {
    if (!l_state.processed) return;

    const fType = l_get('f_type');
    const fTeam = l_get('f_team');
    const fDat = l_get('l_dat');
    
    l_state.filters.type = fType ? fType.value : "";
    l_state.filters.team = fTeam ? fTeam.value : "";
    const minDate = fDat && fDat.value ? new Date(fDat.value+'T00:00:00') : new Date('2000-01-01');

    l_state.filtered = l_state.processed.filter(d => {
        if(l_state.filters.type && d.t !== l_state.filters.type) return false;
        if(l_state.filters.team && !d.teams.includes(l_state.filters.team)) return false;
        
        if(!RadixConfig.includesIssue(d,minDate)) return false;
        return true;
    });

    const f = l_state.filtered;
    const dStr = minDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const info = l_get('d-info');
    if(info) {
        info.textContent = `${l_state.processed.length} issues op bord · ${f.length} in filter · ${f.filter(x=>x.isD).length} afgerond · Data vanaf ${dStr} · Changelog`;
        if (l_state.source === "history" && l_state.historyQuality) { const q=l_state.historyQuality; const names=Object.keys(q.unknownStatuses||{});info.title=names.length?"Onbekende historische statussen: "+names.join(", ")+". Zie statusCategories in config.js.":""; info.textContent += ` · ${q.errors} ophaalfouten / ${q.incomplete} onvolledige workflows · ${f.filter(x=>x.isD&&x.ct!==null).length}/${f.filter(x=>x.isD).length} met Cycle Time`; }
    }

    l_drawDash();
};

window.l_openManual = function(sectionId) {
    l_show('l-man-modal-overlay');
    const body = l_get('l-man-modal-body');
    
    if (window.FLOW_MANUAL_CONTENT) {
        _renderManual(sectionId);
    } else {
        body.innerHTML = "<div style='padding:12px; color:#FF5630; font-size:12px; border:1px solid #FF5630; border-radius:4px; background:#FFEBE6;'>Handleiding wordt nog geladen — wacht even en probeer opnieuw, of controleer je netwerk/VPN.</div>";
    }
};

function _renderManual(sectionId) {
    let html = window.FLOW_MANUAL_CONTENT;
    
    l_get('l-man-modal-body').innerHTML = html;
    if(l_get('l-man-search'))l_get('l-man-search').value='';
    
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

function _renderAdvice(rows, containerDiv) {
    const notes=RadixAdvice.inspect(rows,{from:new Date((l_get('l_dat')?.value||'2000-01-01')+'T00:00:00'),diff:l_dif,unit:l_state.settings.workdays==='workdays'?'werkdagen':'kalenderdagen'});
    containerDiv.innerHTML=`<div class="l-card"><div class="c-tit">Teamreflectie ${hMark('man-advice')}</div><div class="c-sub">Observaties en gespreksvragen op basis van de huidige selectie · geen beoordeling of benchmark</div><div class="radix-advice-grid">${notes.map(n=>`<article><h4>${l_esc(n.title)}</h4><p><strong>Observatie:</strong> ${l_esc(n.fact)}</p><p class="m-caption">${l_esc(n.limit)}</p><p><strong>Gespreksvraag:</strong> ${l_esc(n.question)}</p><p><strong>Mogelijke vervolgstap:</strong> ${l_esc(n.experiment)}</p></article>`).join('')}</div></div>`;
}

window.l_openMCModal = function(type) {
    if (!window._l_mcData) return;
    const data = window._l_mcData[type];
    if(!data) return;

    const isSP = type === 'sp';
    const label = isSP ? "Story Points" : "Issues";
    const color = isSP ? "#FFAB00" : "#0052CC";

    l_get('l-modal-title').innerText = `Monte Carlo Voorspelling (${label})`;
    l_get('l-modal-sub').innerText = `Hoe de Monte Carlo-simulatie werkt`;

    let h = `
        <div style="padding: 20px; box-sizing: border-box;">
            <div style="padding: 15px; background: #E9F2FF; border-radius: 4px; color: #172B4D; margin-bottom: 20px; font-size: 13px; border-left: 4px solid #0052CC;">
                <strong>De simulatie:</strong> In plaats van een simpel gemiddelde te nemen, kijkt het Monte Carlo algoritme naar de historische resultaten hieronder (input). Vervolgens simuleren we de komende periode <strong>10.000 keer</strong> door willekeurig uit dit verleden te 'trekken'. Dit geeft een modelmatige kansverdeling onder de aanname dat de historische doorvoer representatief blijft. Het is geen garantie.
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

function groupItemsByPeriod(itemsToGroup, pD, countSp = false, completeOnly=false) {
    const from = l_get('l_dat')?.value ? new Date(l_get('l_dat').value+'T00:00:00') : new Date(2000,0,1);
    return l_periodBuckets(itemsToGroup,pD,from,new Date(),l_state.sprints||[],countSp,completeOnly);
}

window.l_drawDash = async function() {
    const dta = l_state.filtered;
    if (!dta) return;
    window._l_mcData = {}; 

    const MT = [
        { k:"lt", id:"man-lt", l:"Lead Time", d:"Aangemaakt tot opgelost", c:"#0052CC" },
        { k:"ct", id:"man-ct", l:"Cycle Time", d:"Eerste actieve status tot afgerond", c:"#6554C0" },
        { k:"mtr", id:"man-mtr", l:"MTTR", d:"Mean time to repair (bugs)", c:"#FF5630" },
        { k:"qt", id:"man-qt", l:"Queue Time", d:"Aangemaakt tot eerste actieve status", c:"#FF8B00" },
        { k:"fe", id:"man-fe", l:"Flow Efficiency", d:"Tijd in actieve status / Lead Time", c:"#0052CC", isPct: true }
    ];

    const metricsDiv = l_get('l-metrics');
    if(metricsDiv) {
        metricsDiv.innerHTML = MT.map(m => {
            const fmt = m.isPct ? fPct : fDay;
            let valsObj = dta.filter(d => Number.isFinite(d[m.k])).map(d => ({ ...d, _v: d[m.k] }));
            
            const eligible=dta.filter(d=>m.k==='qt'||(d.isD&&(m.k!=='mtr'||d.t==='Bug'))).length;
            const derived=(m.k==='ct'||m.k==='qt')?valsObj.filter(d=>d.startSource==='subtask').length:0;
            const reasons={};if(['ct','qt','fe'].includes(m.k))for(const d of dta.filter(d=>(m.k==='qt'||d.isD)&&!Number.isFinite(d[m.k]))){const reason=m.k==='fe'&&d.startSource==='subtask'?'alleen afgeleide start, geen actieve tijd':d.missingStartReason||'ongeldige of ontbrekende meetduur';reasons[reason]=(reasons[reason]||0)+1;}
            const reasonText=Object.entries(reasons).map(([k,n])=>`${n} × ${k}`).join('; ');
            const coverage=`<div class="m-caption" title="Meetbare issues / toepasselijke issues; vóór uitschieterfilter. ${l_esc(reasonText)}">Meetdekking: ${eligible?Math.round(valsObj.length/eligible*100)+'%':'–'} (${valsObj.length}/${eligible})${derived?' · '+derived+' via subtaken':''}</div>`;
            const noDataHtml = `<div class="m-crd" data-metric="${m.k}" style="--ac:${m.c}">
                <div class="metric-kind">Flow metric</div><div class="m-tit">${m.l} ${hMark(m.id)}</div>
                <div style="font-size:11px; color:#6B778C; margin-top:10px; line-height:1.5;">
                    <strong style="color:#172B4D;">Onvoldoende data</strong><br>
                    Geen bruikbare gegevens voor deze metric in de gekozen databron.
                    ${coverage}
                </div>
            </div>`;

            if (!valsObj.length) { radixCardStats[m.k] = null; return noDataHtml; }
            
            const rawVals=valsObj.map(x=>x._v);
            const stats=l_metricStats(rawVals,m.k === "fe" ? "" : l_state.settings.outlier);
            radixCardStats[m.k] = stats;
            const {min,max,avg}=stats;
            const pts = (L_CFG.pcts||[50,85,95]).map(p=>`<span class="l-flex"><span class="p-dot" style="background:${L_CFG.pctColors[p]}"></span>P${p}: <strong style="color:#172B4D">${fmt(stats['p'+p])}</strong></span>`).join("");
            const tCnt = {}; valsObj.forEach(x => { tCnt[x.t] = (tCnt[x.t]||0)+1; });
            const tArr = Object.entries(tCnt).sort((a,b)=>b[1]-a[1]);
            const distBar = tArr.map(([t,n]) => `<div style="height:100%; min-width:2px; width:${(n/rawVals.length)*100}%; background:${l_col(t)}"></div>`).join("");
            const distLeg = tArr.map(([t,n]) => `<span style="font-size:10px; color:#6B778C; display:inline-flex; align-items:center; gap:4px; margin-right:8px;"><span style="width:6px;height:6px;border-radius:50%;background:${l_col(t)}"></span>${l_esc(t)} <strong style="color:#172B4D">${n}</strong> <span style="opacity:0.6">(${Math.round(n/rawVals.length*100)}%)</span></span>`).join("");
            const distHtml = `<div style="margin-top:10px; padding-top:10px;"><div style="display:flex; height:6px; border-radius:3px; overflow:hidden; margin-bottom:6px; gap:1px;">${distBar}</div><div>${distLeg}</div></div>`;


            return `<div class="m-crd" data-metric="${m.k}" style="--ac:${m.c}">
                <div class="metric-kind">Flow metric</div><div class="l-flex-b m-tit" style="margin-bottom:2px;"><span>${m.l} ${hMark(m.id)}</span><span class="m-cnt">${rawVals.length} issues</span></div>
                <div class="m-caption">${m.d}</div>
                <div class="m-primary">${fmt(avg)}</div>
                <div class="m-caption">Gemiddelde${stats.used<stats.count?` · ${stats.used}/${stats.count} (≤ P${l_state.settings.outlier})`:""}</div>
                <div class="m-secondary"><span>Min <strong>${fmt(min)}</strong></span><span>Max <strong>${fmt(max)}</strong></span></div>
                <div class="m-pct">${pts}</div>
                ${distHtml}
                ${coverage}
                
            </div>`;
        }).join("");
    }

    let ih = "";
    
    const ct = dta.map(d=>d.ct).filter(v=>v!==null && !isNaN(v));
    if(ct.length>2){
        const mn = ct.reduce((a,b)=>a+b,0)/ct.length, sd = Math.sqrt(ct.map(v=>(v-mn)**2).reduce((a,b)=>a+b,0)/ct.length), cv = mn>0?(sd/mn)*100:0;
        ih += `<div class="l-card"><div class="l-flex-b"><span class="m-tit" style="margin:0">Consistentie (CV) ${hMark('man-cv')}</span><span class="m-cnt">${ct.length} issues</span></div><div class="ti-val">${cv.toFixed(1)}%</div><div class="ti-trk"><div class="ti-fil" style="width:${Math.min(100,cv)}%; background:${cv<50?'#36B37E':cv<80?'#FFAB00':'#FF5630'}"></div></div><div class="ti-row"><span>Gem. / Std. dev</span><strong>${fDay(mn)} / ${fDay(sd)}</strong></div></div>`;
    }
    
    const selThru = l_get('sel-thru'); const pD = selThru ? parseInt(selThru.value) : 14;
    const periodMode=groupItemsByPeriod([],pD,false,true).mode;
    const perLabel=periodMode||"periode";
    const perTitle=periodMode||"periodes";

    const doneWithSP = dta.filter(d => d.isD && d.r && d.sp > 0);
    if(doneWithSP.length>1){
        const spsGrps = groupItemsByPeriod(doneWithSP, pD, true, true);
        if(spsGrps.length > 0) {
            const sps = spsGrps.map(g => g._total);
            
            const activeSps = sps;
            
            if (activeSps.length >= 3) {
                const mcSP = l_runMC(activeSps, 1);
                window._l_mcData.sp = mcSP;

                ih += `<div class="l-card" data-indicator="mc-sp" style="display:flex; flex-direction:column;">
                    <div class="l-flex-b"><span class="m-tit" style="margin:0">Voorspelling (Story Points) ${hMark('man-vel')}</span><span class="m-cnt">${activeSps.length} ${perTitle}</span></div>
                    <div class="ti-val">≥ ${mcSP.p15} <span style="font-size:12px; font-weight:normal; color:#6B778C">SP/${perLabel}</span></div>
                    <div class="ti-row" style="margin-top:16px;"><span>Kansrijk (50%)</span><strong>≥ ${mcSP.p50} SP</strong></div>
                    <div class="ti-row" style="border-top:none; padding-top:4px; margin-top:0;"><span style="color:#0052CC; font-weight:bold;">Realistisch (85%)</span><strong style="color:#0052CC;">≥ ${mcSP.p15} SP</strong></div>
                    <div class="ti-row" style="border-top:none; padding-top:4px; margin-top:0;"><span>Zeer Veilig (95%)</span><strong>≥ ${mcSP.p5} SP</strong></div>
                    <div class="m-caption">${doneWithSP.length}/${dta.filter(d=>d.isD&&d.r).length} afgeronde issues met positieve SP · huidige schattingen</div>${activeSps.length<6?'<div class="m-caption">Weinig historische perioden; interpreteer voorzichtig.</div>':''}<button class="m-link" onclick="l_openMCModal('sp')">Bekijk voorspelling</button>
                </div>`;
            }
        }
    }

    const doneItems = dta.filter(d => d.isD && d.r);
    if (doneItems.length > 1) {
        const itmGrps = groupItemsByPeriod(doneItems, pD, false, true);
        if (itmGrps.length > 0) {
            const itms = itmGrps.map(g => g._total);
            
            const activeItms = itms;
            
            if (activeItms.length >= 3) {
                const mcItm = l_runMC(activeItms, 1);
                window._l_mcData.itm = mcItm;

                ih += `<div class="l-card" data-indicator="mc-issues" style="display:flex; flex-direction:column;">
                    <div class="l-flex-b"><span class="m-tit" style="margin:0">Voorspelling (Issues) ${hMark('man-vel')}</span><span class="m-cnt">${activeItms.length} ${perTitle}</span></div>
                    <div class="ti-val">≥ ${mcItm.p15} <span style="font-size:12px; font-weight:normal; color:#6B778C">Issues/${perLabel}</span></div>
                    <div class="ti-row" style="margin-top:16px;"><span>Kansrijk (50%)</span><strong>≥ ${mcItm.p50}</strong></div>
                    <div class="ti-row" style="border-top:none; padding-top:4px; margin-top:0;"><span style="color:#0052CC; font-weight:bold;">Realistisch (85%)</span><strong style="color:#0052CC;">≥ ${mcItm.p15}</strong></div>
                    <div class="ti-row" style="border-top:none; padding-top:4px; margin-top:0;"><span>Zeer Veilig (95%)</span><strong>≥ ${mcItm.p5}</strong></div>
                    ${activeItms.length<6?'<div class="m-caption">Weinig historische perioden; interpreteer voorzichtig.</div>':''}<button class="m-link" onclick="l_openMCModal('itm')">Bekijk voorspelling</button>
                </div>`;
            }
        }
    }

    const minDateRaw = l_get('l_dat') && l_get('l_dat').value ? new Date(l_get('l_dat').value+'T00:00:00') : new Date('2000-01-01');
    const stab = l_stability(dta,minDateRaw,new Date(),l_state.sprints||[],pD);
    const {inflow,outflow,numPeriods,mode:stabMode}=stab;
    if (numPeriods && (inflow > 0 || outflow > 0)) {
        const stabPct = inflow > 0 ? (outflow / inflow) * 100 : null;
        
        let stabColor = "#36B37E";
        let stabText = "Instroom en uitstroom ongeveer gelijk";
        if (stabPct === null) { stabColor="#6B778C"; stabText="Geen instroom: verhouding niet gedefinieerd"; }
        else if (stabPct < 85) { stabColor = "#FF5630"; stabText = "Meer instroom dan uitstroom binnen selectie"; }
        else if (stabPct > 115) { stabColor = "#FFAB00"; stabText = "Meer uitstroom dan instroom binnen selectie"; }

        const inPerSprint = (inflow / numPeriods).toFixed(1);
        const outPerSprint = (outflow / numPeriods).toFixed(1);

        ih += `<div class="l-card">
            <div class="l-flex-b"><span class="m-tit" style="margin:0">STABILITEITS INDEX ${hMark('man-stab')}</span><span class="m-cnt">Inflow vs Outflow</span></div>
            <div class="ti-val" style="color:${stabColor}">${stabPct===null?"–":stabPct.toFixed(0)+"%"}</div>
            <div class="ti-trk"><div class="ti-fil" style="width:${stabPct===null?0:Math.min(100,stabPct)}%; background:${stabColor}"></div></div>
            <div class="ti-row" style="margin-top:12px;"><span>Nieuw per ${stabMode} (gem)</span><strong>${inPerSprint}</strong></div>
            <div class="ti-row" style="border-top:none; padding-top:4px; margin-top:0;"><span>Afgerond per ${stabMode} (gem)</span><strong>${outPerSprint}</strong></div>
            <div style="font-size:11px; color:#6B778C; margin-top:12px; line-height:1.4;">${stabText}</div>
        </div>`;
    }

    const rr = dta.filter(d=>d.isD && Number.isInteger(d.reopened));
    if(rr.length){
        const rw = rr.filter(x=>x.reopened>0), rt=(rw.length/rr.length)*100, bc = "#6554C0";
        ih += `<div class="l-card"><div class="l-flex-b"><span class="m-tit" style="margin:0">Heropeningen (rework) ${hMark('man-rework')}</span><span class="m-cnt">${rr.length}/${dta.filter(d=>d.isD).length} meetbaar</span></div><div class="ti-val" style="color:${bc}">${rt.toFixed(1)}%</div><div class="ti-trk"><div class="ti-fil" style="width:${Math.min(100,rt)}%; background:${bc}"></div></div><div class="ti-row"><span>Issues heropend na Done</span><strong>${rw.length}</strong></div></div>`;
    }

    const tDiv = l_get('l-team');
    if(tDiv) {
        tDiv.innerHTML = ih;
        for(const key of ['mc-sp','mc-issues']) if(!tDiv.querySelector(`[data-indicator="${key}"]`)) {
            const card=document.createElement('div'); card.className='l-card'; card.dataset.indicator=key;
            card.innerHTML=`<div class="m-tit">Voorspelling (${key==='mc-sp'?'Story Points':'Issues'}) ${hMark('man-vel')}</div><p class="m-caption">Onvoldoende data. ${key==='mc-sp'?'Minimaal twee afgeronde issues met positieve Story Points en drie volledige historische perioden vereist.':'Minimaal twee afgeronde issues en drie volledige historische perioden vereist.'}</p>`;
            tDiv.appendChild(card);
        }
        for(const card of tDiv.children){const tag=document.createElement('div');tag.className='metric-kind';tag.textContent='Teamindicator';card.prepend(tag);card.hidden=!l_state.settings.visible.includes(card.dataset.indicator||'team');}
    }

    const phases=dta.map(x=>RadixWorkflow.phase(x,l_dif)).filter(Boolean);
    const pDiv=l_get('l-phase');
    if(pDiv){
        const ph=[['todo','To Do','#FF8B00'],['progress','In Progress','#0052CC'],['done','Eerder Done (voor heropening)','#6554C0']];
        const totals=ph.map(([k])=>phases.reduce((a,p)=>a+p[k],0)), total=totals.reduce((a,b)=>a+b,0);
        pDiv.innerHTML=phases.length&&total>0?ph.map(([k,label,color],i)=>{const pc=totals[i]/total*100;return `<div class="pb-row"><div class="l-flex-b"><span>${label}</span><strong>${fDay(totals[i]/phases.length)} · ${pc.toFixed(1)}%</strong></div><div class="pb-trk"><div class="ti-fil" style="width:${pc}%;background:${color}"></div></div></div>`;}).join(''):'<p class="m-caption">Onvoldoende meetbare statustijd.</p>';
        pDiv.innerHTML+=`<p class="m-caption">${phases.length}/${dta.filter(d=>d.isD).length} afgeronde issues met volledige historie · aandeel van totale gemeten tijd, geen uitschieterfilter.</p>`;
    }

    const visible = new Set(l_state.settings.visible);
    const advDiv = l_get('l-advice-container');
    if(advDiv){advDiv.hidden=!visible.has('advice');if(!advDiv.hidden)_renderAdvice(dta,advDiv);else advDiv.replaceChildren();}
    const forecast = l_get('radix-forecast');
    if(forecast){
        forecast.hidden=!visible.has('forecast');
        if(!forecast.hidden){
            const remaining=dta.filter(d=>!d.isD).length;
            const weeks=groupItemsByPeriod(doneItems,7,false,true).map(g=>g._total);
            const result=l_forecastCompletion(weeks,remaining);
            const date=n=>{if(n===null)return 'Niet binnen 2 jaar';const d=new Date();d.setDate(d.getDate()+n*7);return d.toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'});};
            forecast.innerHTML=`<div class="l-card"><div class="l-flex-b"><div class="c-tit">Einddatumvoorspelling ${hMark('man-forecast')}</div><span class="m-cnt">${remaining} open</span></div><div class="c-sub">Huidige open Stories en Bugs binnen de gekozen filters</div>${remaining===0?'<p>Geen open werk in deze selectie.</p>':!result?'<p>Onvoldoende historie: minimaal 3 volledige weken en positieve doorvoer nodig.</p>':`<div class="ti-row"><span>50% scenario</span><strong>${date(result.p50)}</strong></div><div class="ti-row"><span>85% scenario</span><strong>${date(result.p85)}</strong></div><div class="ti-row"><span>95% scenario</span><strong>${date(result.p95)}</strong></div><p class="m-caption">10.000 simulaties · ${weeks.length} volledige weken · vaste scope, geen nieuwe instroom. Indicatie, geen toezegging.</p>`}</div>`;
        }else forecast.innerHTML='';
    }
    document.querySelectorAll('#l-metrics [data-metric]').forEach(e=>e.hidden=!visible.has(e.dataset.metric));
    for (const [key,id] of [['phase','l-phase'],['hist','cv-hist'],['scat','cv-scat'],['thru','cv-thru'],['cfd','cv-cfd']]) {
        const el=l_get(id); const card=el?.closest('.l-card'); if(card) card.hidden=!visible.has(key);
    }
    document.querySelectorAll('#l-dash .l-grid-2').forEach(g=>{ const cards=[...g.querySelectorAll(':scope > .l-card')]; g.hidden=cards.length>0 && cards.every(c=>c.hidden); });
    setTimeout(drawAllCharts, 150);
}

