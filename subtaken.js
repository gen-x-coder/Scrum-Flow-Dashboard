// ============================================================
// Scrum Flow Dashboard - Subtaken Module
// Bestand: subtaken.js
// Vereist: l_state (rawSubtasks, sprints) beschikbaar via dashboard.js
// ============================================================

(function () {

    // -------------------------------------------------------
    // CSS
    // -------------------------------------------------------
    function injectCSS() {
        if (document.getElementById('st-css')) return;
        const s = document.createElement('style');
        s.id = 'st-css';
        s.textContent = `
            #st-modal-overlay {
                display:none; position:fixed; top:0; left:0;
                width:100vw; height:100vh;
                background:rgba(9,30,66,0.65); z-index:10000;
            }
            #st-modal-box {
                position:absolute; top:50%; left:50%;
                transform:translate(-50%,-50%);
                background:#fff; border-radius:6px;
                width:1180px; max-width:98vw; max-height:93vh;
                display:flex; flex-direction:column; overflow:hidden;
                box-shadow:0 8px 40px rgba(9,30,66,.35);
            }
            #st-modal-header {
                padding:14px 20px; border-bottom:1px solid #0052CC;
                background:#0747A6; color:#fff;
                display:flex; justify-content:space-between; align-items:center;
                flex-shrink:0;
            }
            #st-modal-body { overflow-y:auto; flex:1; background:#F4F5F7; }
            .st-tab-bar {
                display:flex; gap:3px; padding:10px 20px 0;
                background:#F4F5F7; border-bottom:1px solid #DFE1E6;
                flex-shrink:0; flex-wrap:wrap;
            }
            .st-tab {
                padding:7px 14px; border-radius:4px 4px 0 0;
                font-size:11px; font-weight:600; cursor:pointer;
                border:1px solid transparent; border-bottom:none;
                color:#6B778C; background:transparent; white-space:nowrap;
            }
            .st-tab:hover { background:#EBECF0; color:#172B4D; }
            .st-tab.active {
                background:#fff; color:#172B4D;
                border-color:#DFE1E6; margin-bottom:-1px;
            }
            .st-panel { display:none; padding:20px; }
            .st-panel.active { display:block; }
            .st-card {
                background:#fff; border-radius:6px;
                box-shadow:0 1px 3px rgba(9,30,66,.1);
                border:1px solid #DFE1E6; padding:16px 20px;
                margin-bottom:16px;
            }
            .st-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
            .st-grid-m { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; margin-bottom:16px; }
            .st-tbl { width:100%; border-collapse:collapse; font-size:12px; }
            .st-tbl th {
                position:sticky; top:0; background:#FAFBFC;
                padding:8px 10px; text-align:left;
                border-bottom:2px solid #DFE1E6;
                color:#6B778C; text-transform:uppercase; font-size:10px; white-space:nowrap;
            }
            .st-tbl td { padding:8px 10px; border-bottom:1px solid #F4F5F7; color:#172B4D; vertical-align:middle; }
            .st-tbl tr:hover td { background:#F8F9FF; }
            .st-badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:600; white-space:nowrap; }
            .st-age-ok   { color:#36B37E; background:#E3FCEF; border:1px solid #ABF5D1; }
            .st-age-warn { color:#974F0C; background:#FFF0B3; border:1px solid #FFE380; }
            .st-age-bad  { color:#BF2600; background:#FFEBE6; border:1px solid #FFBDAD; }
            .st-age-done { color:#6B778C; background:#F4F5F7; border:1px solid #DFE1E6; }
            .st-filter-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px; }
            .st-sel { padding:5px 9px; border:1px solid #DFE1E6; border-radius:3px; font-size:12px; background:#fff; color:#172B4D; outline:none; cursor:pointer; }
            .st-empty { text-align:center; padding:40px 20px; color:#6B778C; font-size:13px; }
            .st-cvs { width:100%; height:180px; display:block; margin-top:8px; }
            .st-mcrd {
                background:#fff; border-radius:6px; padding:14px 16px;
                border:1px solid #DFE1E6; border-top:3px solid var(--ac,#0052CC);
                box-shadow:0 1px 3px rgba(9,30,66,.08);
            }
            .st-m-tit { font-size:12px; font-weight:700; color:#172B4D; margin-bottom:2px; }
            .st-m-sub { font-size:10px; color:#6B778C; margin-bottom:10px; }
            .st-m-st { display:flex; gap:12px; margin-bottom:10px; }
            .st-m-s-lbl { font-size:9px; color:#6B778C; text-transform:uppercase; }
            .st-m-s-val { font-size:16px; font-weight:700; color:#172B4D; }
            .st-m-pct { display:flex; flex-direction:column; gap:3px; font-size:11px; color:#6B778C; }
            .st-m-cnt { font-size:10px; color:#6B778C; background:#F4F5F7; padding:1px 6px; border-radius:8px; }
            .st-m-link { font-size:10px; color:#0052CC; background:none; border:none; cursor:pointer; padding:4px 0 0; text-decoration:underline; }
            .st-p-dot { display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:4px; }
            .st-wip-bar { height:8px; border-radius:4px; background:#DFE1E6; overflow:hidden; margin-top:4px; }
            .st-wip-fill { height:100%; border-radius:4px; }
            .st-sp-bar { height:6px; border-radius:3px; background:#DFE1E6; overflow:hidden; margin-top:4px; }
            .st-sp-fill { height:100%; border-radius:3px; background:#36B37E; }
            .st-sp-fill.warn { background:#FFAB00; }
            .st-sp-fill.bad  { background:#FF5630; }
            .st-trophy-card {
                background:linear-gradient(135deg,#FFF8E6,#FFFAE6);
                border:2px solid #FFAB00; border-radius:8px;
                padding:20px 24px; margin-bottom:16px;
                display:flex; align-items:center; gap:20px;
            }
            .st-podium { display:flex; gap:12px; margin-top:16px; flex-wrap:wrap; }
            .st-podium-item { flex:1; min-width:120px; background:#fff; border:1px solid #DFE1E6; border-radius:6px; padding:12px; text-align:center; }
            .st-mc-val { font-size:28px; font-weight:700; color:#0052CC; }
            .st-mc-row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #F4F5F7; font-size:12px; }
            .st-trk { height:8px; border-radius:4px; background:#DFE1E6; overflow:hidden; margin:6px 0; }
            .st-trk-fill { height:100%; border-radius:4px; }
        `;
        document.head.appendChild(s);
    }

    // -------------------------------------------------------
    // Modal HTML
    // -------------------------------------------------------
    function injectModal() {
        if (document.getElementById('st-modal-overlay')) return;
        const div = document.createElement('div');
        div.id = 'st-modal-overlay';
        div.innerHTML = `
            <div id="st-modal-box">
                <div id="st-modal-header">
                    <div>
                        <div style="font-weight:700;font-size:17px;">Subtaken Dashboard</div>
                        <div id="st-modal-sub" style="font-size:11px;opacity:.75;margin-top:2px;"></div>
                    </div>
                    <button onclick="document.getElementById('st-modal-overlay').style.display='none'"
                        style="background:none;border:none;font-size:26px;color:#fff;cursor:pointer;line-height:1;">&times;</button>
                </div>
                <div class="st-tab-bar" id="st-tabs">
                    <button class="st-tab active" onclick="st_switchTab('analyse')">Analyse</button>
                    <button class="st-tab"        onclick="st_switchTab('monte')">Monte Carlo</button>
                    <button class="st-tab"        onclick="st_switchTab('advies')">Advies</button>
                    <button class="st-tab"        onclick="st_switchTab('aging')">Aging</button>
                    <button class="st-tab"        onclick="st_switchTab('wip')">WIP per persoon</button>
                    <button class="st-tab"        onclick="st_switchTab('stories')">Story voortgang</button>
                    <button class="st-tab"        onclick="st_switchTab('trophy')">Taken Held</button>
                </div>
                <div id="st-modal-body">
                    <div id="st-panel-analyse"  class="st-panel active"></div>
                    <div id="st-panel-monte"    class="st-panel"></div>
                    <div id="st-panel-advies"   class="st-panel"></div>
                    <div id="st-panel-aging"    class="st-panel"></div>
                    <div id="st-panel-wip"      class="st-panel"></div>
                    <div id="st-panel-stories"  class="st-panel"></div>
                    <div id="st-panel-trophy"   class="st-panel"></div>
                </div>
            </div>
        `;
        document.body.appendChild(div);
        div.addEventListener('click', e => { if (e.target === div) div.style.display = 'none'; });
    }

    // -------------------------------------------------------
    // Tab wisselen
    // -------------------------------------------------------
    const TAB_NAMES = ['analyse','monte','advies','aging','wip','stories','trophy'];

    window.st_switchTab = function (name) {
        document.querySelectorAll('.st-tab').forEach((t, i) => t.classList.toggle('active', TAB_NAMES[i] === name));
        document.querySelectorAll('.st-panel').forEach(p => p.classList.toggle('active', p.id === 'st-panel-' + name));
        if (name === 'analyse') setTimeout(st_drawCharts, 60);
        if (name === 'monte')   setTimeout(st_drawMCCharts, 60);
    };

    // -------------------------------------------------------
    // Hulpfuncties
    // -------------------------------------------------------
    const esc = s => String(s || '').replace(/[&<>"']/g, c =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

    const jUrl = () => (typeof window.LUCAS_JIRA_URL === 'string' ? window.LUCAS_JIRA_URL : '');

    const tLink = key => {
        const u = jUrl();
        return u
            ? `<a href="${u}/browse/${key}" target="_blank" style="color:#0052CC;text-decoration:none;font-weight:600;font-family:monospace;">${esc(key)}</a>`
            : `<strong style="font-family:monospace;">${esc(key)}</strong>`;
    };

    const fDay = v => (v === null || isNaN(v)) ? '-' : (v < 1 ? Math.round(v*24)+'u' : v.toFixed(1)+'d');
    const fPct = v => (v === null || isNaN(v)) ? '-' : v.toFixed(1)+'%';

    const calcPct = (arr, p) => {
        const s = arr.filter(v => v !== null && !isNaN(v)).sort((a, b) => a - b);
        if (!s.length) return null;
        return s[Math.max(0, Math.min(Math.ceil((p/100)*s.length)-1, s.length-1))];
    };

    const ageBadge = (age, done) => {
        if (done) return `<span class="st-badge st-age-done">Klaar</span>`;
        if (age === null) return `<span class="st-badge st-age-done">-</span>`;
        const d = Math.round(age);
        if (d >= 30) return `<span class="st-badge st-age-bad">${d}d</span>`;
        if (d >= 14) return `<span class="st-badge st-age-warn">${d}d</span>`;
        return `<span class="st-badge st-age-ok">${d}d</span>`;
    };

    const DONE_STATUSES = ['done','closed','resolved','gesloten','opgelost','klaar','gedaan'];
    const isDone = s => DONE_STATUSES.some(d => (s || '').toLowerCase().includes(d));

    const stCtx = id => {
        const c = document.getElementById(id);
        if (!c) return null;
        const r = c.getBoundingClientRect();
        if (r.width === 0) return null;
        c.width = r.width * 2; c.height = r.height * 2;
        const ctx = c.getContext('2d');
        ctx.scale(2, 2); ctx._w = r.width; ctx._h = r.height;
        return ctx;
    };

    const stTicks = (max, h, top) => {
        const step = Math.max(1, Math.ceil(max / 5));
        const r = [];
        for (let v = 0; v <= max + step*0.5; v += step) r.push({ v, y: top + h*(1 - v/max) });
        return r;
    };

    const noData = (ctx, w, h) => {
        ctx.fillStyle = '#172B4D'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Onvoldoende data', w/2, h/2-6);
        ctx.fillStyle = '#6B778C'; ctx.font = '11px sans-serif';
        ctx.fillText('Minimaal 5 afgeronde subtaken vereist', w/2, h/2+10);
    };

    // Monte Carlo
    function runMC(samples, periods) {
        if (!samples || samples.length < 2) return null;
        const N = 10000, results = [];
        for (let i = 0; i < N; i++) {
            let total = 0;
            for (let p = 0; p < periods; p++) total += samples[Math.floor(Math.random()*samples.length)];
            results.push(total);
        }
        results.sort((a, b) => a - b);
        return { p50: results[Math.floor(N*0.50)], p15: results[Math.floor(N*0.85)], p5: results[Math.floor(N*0.95)], raw: results, hist: samples };
    }

    // Groepeer per sprint/week/maand
    function groupByPeriod(items, pD) {
        const sprints = ((typeof l_state !== 'undefined' ? l_state.sprints : null) || []);
        const closed  = sprints.filter(s => s.state === 'closed' && s.startDate).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        const bk = {};
        if (pD === 14 && closed.length > 0) {
            closed.forEach(s => {
                const sS = new Date(s.startDate), sE = new Date(s.completeDate || s.endDate || s.startDate);
                const matched = items.filter(d => d.resolved >= sS && d.resolved <= sE);
                const k = sE.getTime();
                if (!bk[k]) bk[k] = { d: sE, count: 0, label: s.name };
                bk[k].count += matched.length;
            });
        } else {
            items.forEach(x => {
                const dt = new Date(x.resolved); dt.setHours(0,0,0,0);
                if (pD === 7) dt.setDate(dt.getDate() - ((dt.getDay()+6)%7));
                else if (pD === 14) { dt.setDate(dt.getDate()-((dt.getDay()+6)%7)); const ep=new Date(2020,0,6); const wks=Math.floor((dt-ep)/604800000); dt.setTime(ep.getTime()+Math.floor(wks/2)*2*604800000); }
                else dt.setDate(1);
                const k = dt.getTime();
                if (!bk[k]) bk[k] = { d: new Date(k), count: 0 };
                bk[k].count++;
            });
        }
        return Object.values(bk).sort((a, b) => a.d - b.d);
    }

    // -------------------------------------------------------
    // Subtaken verwerken
    // -------------------------------------------------------
    function getSubtasks() {
        const raw = (typeof l_state !== 'undefined' && l_state.rawSubtasks) ? l_state.rawSubtasks : [];
        const now = new Date();
        const devField = window.L_CFG?.F?.dev || 'customfield_13300';

        return raw.map(i => {
            if (!i || !i.fields) return null;
            const f = i.fields;
            const status   = f.status?.name || '';
            const done     = isDone(status);
            const assignee = f.assignee?.displayName || 'Onbekend';
            const created  = f.created ? new Date(f.created) : null;
            const resolved = f.resolutiondate ? new Date(f.resolutiondate)
                           : (done && f.updated ? new Date(f.updated) : null);
            const devStart = f[devField] ? new Date(f[devField]) : null;
            const ageFrom  = devStart || created;
            const age      = (!done && ageFrom) ? (now - ageFrom) / 86400000 : null;
            const lt       = (done && created && resolved) ? (resolved - created) / 86400000 : null;
            const ct       = (done && devStart && resolved) ? (resolved - devStart) / 86400000 : null;
            const qt       = (created && devStart) ? (devStart - created) / 86400000 : null;
            const fe       = (ct !== null && lt > 0) ? (ct / lt) * 100 : null;

            const sum = (f.summary || '').toLowerCase();
            let discipline = 'Overig';
            if      (sum.startsWith('backend')  || sum.includes('[backend]'))  discipline = 'Backend';
            else if (sum.startsWith('frontend') || sum.includes('[frontend]')) discipline = 'Frontend';
            else if (sum.startsWith('test')     || sum.includes('[test]'))     discipline = 'Test';
            else if (sum.startsWith('design')   || sum.includes('[design]'))   discipline = 'Design';
            else if (sum.startsWith('infra')    || sum.includes('[infra]'))    discipline = 'Infra';
            else if (sum.startsWith('data')     || sum.includes('[data]'))     discipline = 'Data';

            return {
                key: i.key, summary: f.summary || '', assignee, discipline,
                parentKey: f.parent?.key || null, parentSummary: f.parent?.fields?.summary || '',
                status, done, created, resolved, devStart, age, lt, ct, qt, fe
            };
        }).filter(Boolean);
    }

    function getLastClosedSprint() {
        const sprints = (typeof l_state !== 'undefined' && l_state.sprints) ? l_state.sprints : [];
        return sprints.filter(s => s.state === 'closed' && (s.completeDate || s.endDate))
            .sort((a, b) => new Date(b.completeDate||b.endDate) - new Date(a.completeDate||a.endDate))[0] || null;
    }

    // -------------------------------------------------------
    // EIGEN DETAIL MODAL (boven het subtaken venster)
    // -------------------------------------------------------
    function injectDetailModal() {
        if (document.getElementById('st-detail-overlay')) return;
        const div = document.createElement('div');
        div.id = 'st-detail-overlay';
        div.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(9,30,66,0.5); z-index:10100;';
        div.innerHTML = `
            <div id="st-detail-box" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
                background:#fff; border-radius:6px; width:780px; max-width:95vw; max-height:85vh;
                display:flex; flex-direction:column; overflow:hidden; box-shadow:0 8px 40px rgba(9,30,66,.4);">
                <div style="padding:14px 20px; background:#0747A6; color:#fff; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                    <div>
                        <div id="st-detail-title" style="font-weight:700; font-size:15px;"></div>
                        <div id="st-detail-sub" style="font-size:11px; opacity:.75; margin-top:2px;"></div>
                    </div>
                    <button onclick="document.getElementById('st-detail-overlay').style.display='none'"
                        style="background:none;border:none;font-size:24px;color:#fff;cursor:pointer;line-height:1;">&times;</button>
                </div>
                <div id="st-detail-body" style="overflow-y:auto; flex:1; padding:0;"></div>
            </div>`;
        document.body.appendChild(div);
        div.addEventListener('click', e => { if (e.target === div) div.style.display = 'none'; });
    }

    window.st_openMetricDetail = function (key) {
        injectDetailModal();
        const d = _modalData[key];
        if (!d) return;
        const items = getSubtasks().filter(x => x.done && x[key] !== null && !isNaN(x[key])).sort((a, b) => b[key] - a[key]);
        let h = `<div style="padding:16px 20px;">
            <table class="st-tbl"><thead><tr>
                <th>Subtaak</th><th>Omschrijving</th><th>Persoon</th><th style="text-align:right">${d.label}</th>
            </tr></thead><tbody>`;
        items.forEach(x => { h += `<tr>
            <td style="white-space:nowrap;">${tLink(x.key)}</td>
            <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(x.summary)}">${esc(x.summary)}</td>
            <td>${esc(x.assignee)}</td>
            <td style="text-align:right;font-weight:700;">${d.fmt(x[key])}</td>
        </tr>`; });
        h += `</tbody></table></div>`;
        document.getElementById('st-detail-title').innerText = d.label + ' per subtaak';
        document.getElementById('st-detail-sub').innerText = items.length + ' subtaken, hoogste eerst';
        document.getElementById('st-detail-body').innerHTML = h;
        document.getElementById('st-detail-overlay').style.display = 'block';
    };

    // -------------------------------------------------------
    // TAB 1: ANALYSE (Metrics + Grafieken gecombineerd)
    // -------------------------------------------------------
    let _modalData = {};

    function renderAnalyse(subtasks) {
        const panel = document.getElementById('st-panel-analyse');
        if (!panel) return;
        const done = subtasks.filter(x => x.done);

        const METRICS = [
            { k:'lt', label:'Lead Time',      desc:'Aangemaakt tot opgelost',    color:'#0052CC' },
            { k:'ct', label:'Cycle Time',      desc:'Dev start tot opgelost',     color:'#6554C0' },
            { k:'qt', label:'Queue Time',      desc:'Aangemaakt tot dev start',   color:'#FF8B00' },
            { k:'fe', label:'Flow Efficiency', desc:'Cycle time als % lead time', color:'#36B37E', isPct:true },
        ];
        _modalData = {};

        const metricsHtml = METRICS.map(m => {
            const vals = done.map(x => x[m.k]).filter(v => v !== null && !isNaN(v) && v >= 0);
            if (vals.length < 2) return `<div class="st-mcrd" style="--ac:${m.color}">
                <div class="st-m-tit">${m.label}</div><div class="st-m-sub">${m.desc}</div>
                <div style="font-size:11px;color:#6B778C;">Onvoldoende data<br><small>Dev start-datum vereist</small></div>
            </div>`;
            _modalData[m.k] = { vals, label: m.label, fmt: m.isPct ? fPct : fDay };
            const min = Math.min(...vals), max = Math.max(...vals);
            const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
            const fmt = m.isPct ? fPct : fDay;
            return `<div class="st-mcrd" style="--ac:${m.color}">
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;">
                    <span class="st-m-tit">${m.label}</span><span class="st-m-cnt">${vals.length} subtaken</span>
                </div>
                <div class="st-m-sub">${m.desc}</div>
                <div class="st-m-st">
                    <div><div class="st-m-s-lbl">Min</div><div class="st-m-s-val">${fmt(min)}</div></div>
                    <div><div class="st-m-s-lbl" style="color:${m.color}">Gem</div><div class="st-m-s-val" style="color:${m.color}">${fmt(avg)}</div></div>
                    <div><div class="st-m-s-lbl">Max</div><div class="st-m-s-val">${fmt(max)}</div></div>
                </div>
                <div class="st-m-pct">
                    <span><span class="st-p-dot" style="background:#FFAB00"></span>P50: <strong style="color:#172B4D">${fmt(calcPct(vals,50))}</strong></span>
                    <span><span class="st-p-dot" style="background:#0052CC"></span>P85: <strong style="color:#172B4D">${fmt(calcPct(vals,85))}</strong></span>
                    <span><span class="st-p-dot" style="background:#FF5630"></span>P95: <strong style="color:#172B4D">${fmt(calcPct(vals,95))}</strong></span>
                </div>
                <button class="st-m-link" onclick="st_openMetricDetail('${m.k}')">Bekijk subtaken &rsaquo;</button>
            </div>`;
        }).join('');

        // CV
        const ctVals = done.map(x=>x.ct).filter(v=>v!==null&&!isNaN(v));
        let cvHtml = '';
        if (ctVals.length >= 3) {
            const avg = ctVals.reduce((a,b)=>a+b,0)/ctVals.length;
            const sd  = Math.sqrt(ctVals.map(v=>(v-avg)**2).reduce((a,b)=>a+b,0)/ctVals.length);
            const cv  = avg > 0 ? (sd/avg)*100 : 0;
            const col = cv < 50 ? '#36B37E' : cv < 80 ? '#FFAB00' : '#FF5630';
            cvHtml = `<div class="st-card">
                <div style="display:flex;justify-content:space-between;align-items:baseline;">
                    <span class="st-m-tit">Consistentie (CV)</span><span class="st-m-cnt">${ctVals.length} subtaken</span>
                </div>
                <div style="font-size:26px;font-weight:700;color:${col};margin:8px 0 4px;">${cv.toFixed(1)}%</div>
                <div class="st-trk"><div class="st-trk-fill" style="width:${Math.min(100,cv)}%;background:${col};"></div></div>
                <div style="font-size:11px;color:#6B778C;margin-top:6px;">Gem: ${fDay(avg)} &nbsp;&middot;&nbsp; Std.dev: ${fDay(sd)}</div>
                <div style="font-size:10px;color:#6B778C;margin-top:4px;">${cv<50?'Hoog voorspelbaar':cv<80?'Matige spreiding':'Hoge variantie'}</div>
            </div>`;
        }

        // Stabiliteit
        const openCnt = subtasks.filter(x=>!x.done).length;
        const doneCnt = subtasks.filter(x=>x.done).length;
        const stabPct = subtasks.length > 0 ? (doneCnt/subtasks.length)*100 : 0;
        const stabCol = stabPct>=40&&stabPct<=75 ? '#36B37E' : stabPct<40 ? '#FF5630' : '#FFAB00';
        const stabTxt = stabPct<40 ? 'Veel open subtaken' : stabPct>75 ? 'Bijna alles klaar' : 'Gezonde verhouding';
        const stabHtml = `<div class="st-card">
            <div style="display:flex;justify-content:space-between;align-items:baseline;">
                <span class="st-m-tit">Afgerond vs. Open</span><span class="st-m-cnt">${subtasks.length} totaal</span>
            </div>
            <div style="font-size:26px;font-weight:700;color:${stabCol};margin:8px 0 4px;">${stabPct.toFixed(0)}%</div>
            <div class="st-trk"><div class="st-trk-fill" style="width:${stabPct}%;background:${stabCol};"></div></div>
            <div style="font-size:11px;color:#6B778C;margin-top:6px;">Open: <strong>${openCnt}</strong> &nbsp;&middot;&nbsp; Klaar: <strong>${doneCnt}</strong></div>
            <div style="font-size:10px;color:#6B778C;margin-top:4px;">${stabTxt}</div>
        </div>`;

        // Grafieken sectie
        const chartsHtml = `
            <div class="st-card" style="margin-bottom:0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <span class="st-m-tit">Histogram</span>
                    <select class="st-sel" id="st-hist-key" onchange="st_drawCharts()">
                        <option value="lt">Lead Time</option><option value="ct">Cycle Time</option><option value="qt">Queue Time</option>
                    </select>
                </div>
                <div id="st-hist-sub" style="font-size:10px;color:#6B778C;margin-bottom:2px;">Frequentieverdeling</div>
                <canvas id="st-cv-hist" class="st-cvs"></canvas>
            </div>
            <div class="st-grid-2">
                <div class="st-card" style="margin-bottom:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span class="st-m-tit">Scatterplot</span>
                        <select class="st-sel" id="st-scat-key" onchange="st_drawCharts()">
                            <option value="lt">Lead Time</option><option value="ct">Cycle Time</option>
                        </select>
                    </div>
                    <div style="font-size:10px;color:#6B778C;margin-bottom:2px;">Elke stip = 1 subtaak &middot; kleur = persoon</div>
                    <canvas id="st-cv-scat" class="st-cvs"></canvas>
                </div>
                <div class="st-card" style="margin-bottom:0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span class="st-m-tit">Throughput</span>
                        <select class="st-sel" id="st-thru-key" onchange="st_drawCharts()">
                            <option value="14">Per sprint</option><option value="7">Per week</option><option value="30">Per maand</option>
                        </select>
                    </div>
                    <div style="font-size:10px;color:#6B778C;margin-bottom:2px;">Afgeronde subtaken per periode</div>
                    <canvas id="st-cv-thru" class="st-cvs"></canvas>
                </div>
            </div>`;

        panel.innerHTML = `
            <div class="st-grid-m">${metricsHtml}</div>
            <div class="st-grid-2">${cvHtml}${stabHtml}</div>
            <div style="font-size:12px;font-weight:700;color:#172B4D;margin-bottom:12px;padding-top:4px;border-top:1px solid #DFE1E6;">Grafieken</div>
            ${chartsHtml}`;

        window._st_cache = subtasks;
        setTimeout(st_drawCharts, 80);
    }

    const PERSON_COLORS = ['#0052CC','#FF5630','#36B37E','#6554C0','#FF8B00','#00B8D9','#57D9A3','#FF7452','#998DD9'];
    const _colorMap = {};
    let _colorIdx = 0;
    const personColor = name => { if (!_colorMap[name]) _colorMap[name] = PERSON_COLORS[_colorIdx++ % PERSON_COLORS.length]; return _colorMap[name]; };

    window.st_drawCharts = function () {
        const subtasks = window._st_cache || [];
        const done = subtasks.filter(x => x.done && x.resolved);

        // Histogram
        const histKey = document.getElementById('st-hist-key')?.value || 'lt';
        const hc = stCtx('st-cv-hist');
        if (hc) {
            const hW=hc._w, hH=hc._h;
            hc.clearRect(0,0,hW,hH);
            const hV = done.map(d=>d[histKey]).filter(v=>v!==null&&!isNaN(v)&&v>=0);
            if (hV.length >= 2) {
                const maxV=Math.max(...hV,1), bS=Math.max(1,Math.ceil(maxV/20));
                const bks=Array(Math.ceil(maxV/bS)+1).fill(0);
                hV.forEach(v=>bks[Math.floor(v/bS)]++);
                const mC=Math.max(...bks,1), tks=stTicks(mC,hH-50,20), p85v=calcPct(hV,85);
                hc.fillStyle='#6B778C'; hc.font='11px sans-serif'; hc.textAlign='right';
                tks.forEach(t=>{ hc.fillText(Math.round(t.v),25,t.y); hc.beginPath(); hc.moveTo(30,t.y); hc.lineTo(hW,t.y); hc.strokeStyle='#DFE1E6'; hc.stroke(); });
                const w=(hW-35)/bks.length;
                bks.forEach((c,i)=>{ if(!c)return; const h=(c/mC)*(hH-50); hc.fillStyle=p85v!==null&&i*bS>=p85v?'#0052CC':'rgba(0,82,204,0.3)'; hc.fillRect(32+i*w,hH-30-h,Math.max(1,w-1),h); });
                if (p85v!==null) {
                    const bIdx=Math.floor(p85v/bS), px=32+bIdx*w+w/2;
                    hc.beginPath(); hc.moveTo(px,10); hc.lineTo(px,hH-30); hc.strokeStyle='#FF5630'; hc.setLineDash([4,4]); hc.lineWidth=1.5; hc.stroke(); hc.setLineDash([]);
                    hc.fillStyle='#FF5630'; hc.font='bold 10px sans-serif'; hc.textAlign='left'; hc.fillText('P85 ('+fDay(p85v)+')',px+4,18);
                }
                const sub=document.getElementById('st-hist-sub');
                if(sub) sub.textContent=hV.length+' subtaken - P50: '+fDay(calcPct(hV,50))+' - P85: '+fDay(p85v);
            } else noData(hc,hW,hH);
        }

        // Scatterplot
        const scatKey = document.getElementById('st-scat-key')?.value || 'lt';
        const sc = stCtx('st-cv-scat');
        if (sc) {
            const sW=sc._w, sH=sc._h; sc.clearRect(0,0,sW,sH);
            const sP = done.filter(d=>d[scatKey]!==null&&!isNaN(d[scatKey])).map(d=>({ v:d[scatKey], t:d.resolved.getTime(), color:personColor(d.assignee) }));
            if (sP.length >= 2) {
                const mT=Math.min(...sP.map(p=>p.t)), xT=Math.max(...sP.map(p=>p.t),Date.now());
                const mV=Math.max(...sP.map(p=>p.v))*1.1||10, p85v=calcPct(sP.map(p=>p.v),85);
                const xO=t=>40+((t-mT)/(xT-mT||1))*(sW-50), yO=v=>20+(1-v/mV)*(sH-50);
                const tks=stTicks(mV,sH-50,20);
                sc.fillStyle='#6B778C'; sc.font='11px sans-serif'; sc.textAlign='right';
                tks.forEach(t=>{ sc.fillText(Math.round(t.v),30,t.y); sc.beginPath(); sc.moveTo(35,t.y); sc.lineTo(sW,t.y); sc.strokeStyle='#DFE1E6'; sc.stroke(); });
                const sprints=((typeof l_state!=='undefined'?l_state.sprints:null)||[]).filter(s=>s.endDate||s.completeDate);
                sc.lineWidth=1;
                sprints.forEach(s=>{ const sE=new Date(s.completeDate||s.endDate).getTime(); if(sE>=mT&&sE<=xT){ sc.beginPath(); sc.moveTo(xO(sE),20); sc.lineTo(xO(sE),sH-30); sc.strokeStyle='rgba(101,84,192,0.35)'; sc.stroke(); } });
                if(p85v!==null&&p85v<=mV){ sc.beginPath(); sc.moveTo(35,yO(p85v)); sc.lineTo(sW,yO(p85v)); sc.strokeStyle='#FF5630'; sc.setLineDash([5,5]); sc.stroke(); sc.setLineDash([]); sc.fillStyle='#FF5630'; sc.textAlign='left'; sc.font='bold 10px sans-serif'; sc.fillText('P85 ('+fDay(p85v)+')',40,yO(p85v)-5); }
                sP.forEach(p=>{ sc.beginPath(); sc.arc(xO(p.t),yO(p.v),4,0,Math.PI*2); sc.fillStyle=p.color; sc.fill(); });
                sc.textAlign='center'; sc.fillStyle='#6B778C'; sc.font='10px sans-serif';
                for(let i=0;i<=4;i++){ const ts=mT+(i/4)*(xT-mT); sc.fillText(new Date(ts).toLocaleDateString('nl-NL',{month:'short',year:'2-digit'}),xO(ts),sH-10); }
            } else noData(sc,sW,sH);
        }

        // Throughput
        const thruKey = parseInt(document.getElementById('st-thru-key')?.value||'14');
        const tc = stCtx('st-cv-thru');
        if (tc) {
            const tW=tc._w, tH=tc._h; tc.clearRect(0,0,tW,tH);
            const grps=groupByPeriod(done,thruKey);
            if (grps.length >= 2) {
                const vals=grps.map(g=>g.count), mC=Math.max(...vals,1)*1.1, tks=stTicks(mC,tH-50,20);
                tc.fillStyle='#6B778C'; tc.font='11px sans-serif'; tc.textAlign='right';
                tks.forEach(t=>{ tc.fillText(Math.round(t.v),25,t.y); tc.beginPath(); tc.moveTo(30,t.y); tc.lineTo(tW,t.y); tc.strokeStyle='#DFE1E6'; tc.stroke(); });
                const st=(tW-35)/grps.length, bw=Math.max(1,st*0.75);
                grps.forEach((g,i)=>{ const h=(g.count/mC)*(tH-50); tc.fillStyle='#0052CC'; tc.fillRect(32+i*st+(st-bw)/2,tH-30-h,bw,h); });
                tc.textAlign='center'; tc.fillStyle='#6B778C'; tc.font='10px sans-serif';
                const stepX=Math.max(1,Math.ceil(grps.length/7));
                for(let i=0;i<grps.length;i+=stepX){ const lbl=grps[i].label||grps[i].d.toLocaleDateString('nl-NL',{month:'short',year:'2-digit'}); tc.fillText(lbl.length>12?lbl.slice(0,12):lbl,32+i*st+st/2,tH-10); }
            } else noData(tc,tW,tH);
        }
    };

    // -------------------------------------------------------
    // TAB 3: MONTE CARLO
    // -------------------------------------------------------
    let _mcData = {};

    function renderMonte(subtasks) {
        const panel = document.getElementById('st-panel-monte');
        if (!panel) return;
        const done = subtasks.filter(x => x.done && x.resolved);
        if (done.length < 5) { panel.innerHTML = `<div class="st-empty">Minimaal 5 afgeronde subtaken vereist.</div>`; return; }

        const grps = groupByPeriod(done, 14);
        let si = 0;
        while (si < grps.length && grps[si].count === 0) si++;
        const samples = grps.slice(si).map(g => g.count);
        if (samples.length < 2) { panel.innerHTML = `<div class="st-empty">Minimaal 2 afgesloten sprints vereist.</div>`; return; }

        const mc = runMC(samples, 1);
        if (!mc) { panel.innerHTML = `<div class="st-empty">Simulatie mislukt.</div>`; return; }
        _mcData = mc;

        panel.innerHTML = `
            <div class="st-grid-2">
                <div class="st-card">
                    <div class="st-m-tit" style="margin-bottom:4px;">Voorspelling volgende sprint</div>
                    <div style="font-size:10px;color:#6B778C;margin-bottom:12px;">Op basis van ${samples.length} sprints &middot; 10.000 simulaties</div>
                    <div class="st-mc-val">&ge; ${mc.p15} <span style="font-size:13px;font-weight:400;color:#6B778C;">subtaken</span></div>
                    <div class="st-mc-row" style="margin-top:14px;"><span>Kansrijk (50%)</span><strong>&ge; ${mc.p50} subtaken</strong></div>
                    <div class="st-mc-row"><span style="color:#0052CC;font-weight:600;">Realistisch (85%)</span><strong style="color:#0052CC;">&ge; ${mc.p15} subtaken</strong></div>
                    <div class="st-mc-row"><span>Zeer veilig (95%)</span><strong>&ge; ${mc.p5} subtaken</strong></div>
                    <div style="font-size:10px;color:#6B778C;margin-top:10px;line-height:1.5;">Gebruik de 85% lijn als commitment naar stakeholders.</div>
                </div>
                <div class="st-card">
                    <div class="st-m-tit" style="margin-bottom:4px;">Historische throughput</div>
                    <div style="font-size:10px;color:#6B778C;margin-bottom:6px;">Input voor de simulatie (per sprint)</div>
                    <canvas id="st-mc-hist" style="width:100%;height:130px;display:block;"></canvas>
                </div>
            </div>
            <div class="st-card">
                <div class="st-m-tit" style="margin-bottom:4px;">Simulatieverdeling (10.000 runs)</div>
                <div style="font-size:10px;color:#6B778C;margin-bottom:6px;">Hoe vaak een bepaald aantal subtaken voorkwam in de simulatie</div>
                <canvas id="st-mc-sim" style="width:100%;height:150px;display:block;"></canvas>
            </div>`;
        setTimeout(st_drawMCCharts, 60);
    }

    window.st_drawMCCharts = function () {
        const mc = _mcData;
        if (!mc || !mc.hist) return;
        const hc = stCtx('st-mc-hist');
        if (hc) {
            const w=hc._w, h=hc._h; hc.clearRect(0,0,w,h);
            const vals=mc.hist, maxV=Math.max(...vals,1), bS=Math.max(1,Math.ceil(maxV/10));
            const bks=Array(Math.ceil(maxV/bS)+1).fill(0);
            vals.forEach(v=>bks[Math.floor(v/bS)]++);
            const mC=Math.max(...bks,1), bw=(w-30)/bks.length;
            bks.forEach((c,i)=>{ if(!c)return; const bh=(c/mC)*(h-30); hc.fillStyle='#0052CC'; hc.fillRect(25+i*bw,h-20-bh,Math.max(1,bw-2),bh); });
            hc.fillStyle='#6B778C'; hc.font='10px sans-serif'; hc.textAlign='center';
            bks.forEach((_,i)=>{ if(bks.length<12||i%2===0) hc.fillText(i*bS,25+i*bw+bw/2,h-5); });
        }
        const sc = stCtx('st-mc-sim');
        if (sc && mc.raw) {
            const w=sc._w, h=sc._h; sc.clearRect(0,0,w,h);
            const raw=mc.raw, minV=raw[0], maxV=raw[raw.length-1], range=maxV-minV||1, bins=30, bS=range/bins;
            const bks=Array(bins+1).fill(0);
            raw.forEach(v=>{ const i=Math.min(bins,Math.floor((v-minV)/bS)); bks[i]++; });
            const mC=Math.max(...bks,1), bw=(w-30)/bks.length;
            bks.forEach((c,i)=>{ if(!c)return; const bVal=minV+i*bS, bh=(c/mC)*(h-30); sc.fillStyle=bVal>=mc.p15?'#0052CC':bVal>=mc.p50?'rgba(0,82,204,0.5)':'rgba(0,82,204,0.25)'; sc.fillRect(25+i*bw,h-20-bh,Math.max(1,bw-1),bh); });
            [{v:mc.p50,c:'#FFAB00',l:'50%'},{v:mc.p15,c:'#0052CC',l:'85%'},{v:mc.p5,c:'#FF5630',l:'95%'}].forEach(({v,c,l})=>{ const x=25+((v-minV)/range)*(w-30); sc.beginPath(); sc.moveTo(x,5); sc.lineTo(x,h-20); sc.strokeStyle=c; sc.setLineDash([4,3]); sc.lineWidth=1.5; sc.stroke(); sc.setLineDash([]); sc.fillStyle=c; sc.font='bold 10px sans-serif'; sc.textAlign='center'; sc.fillText(l,x,13); });
            sc.fillStyle='#6B778C'; sc.font='10px sans-serif'; sc.textAlign='center';
            for(let i=0;i<=4;i++) sc.fillText(Math.round(minV+(i/4)*range),25+(i/4)*(w-30),h-5);
        }
    };

    // -------------------------------------------------------
    // TAB 4: AGING
    // -------------------------------------------------------
    function renderAging(subtasks) {
        const panel = document.getElementById('st-panel-aging');
        if (!panel) return;
        const assignees   = [...new Set(subtasks.map(x=>x.assignee))].filter(Boolean).sort();
        const disciplines = [...new Set(subtasks.map(x=>x.discipline))].sort();
        panel.innerHTML = `<div class="st-card">
            <div class="st-filter-row">
                <select class="st-sel" id="st-aging-assignee" onchange="st_renderAgingTable()"><option value="">Alle personen</option>${assignees.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join('')}</select>
                <select class="st-sel" id="st-aging-discipline" onchange="st_renderAgingTable()"><option value="">Alle disciplines</option>${disciplines.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('')}</select>
                <select class="st-sel" id="st-aging-status" onchange="st_renderAgingTable()"><option value="open">Alleen open</option><option value="all">Alle statussen</option><option value="done">Alleen afgerond</option></select>
                <select class="st-sel" id="st-aging-sort" onchange="st_renderAgingTable()"><option value="age">Langst open eerst</option><option value="assignee">Per persoon</option><option value="parent">Per story</option></select>
            </div>
            <div id="st-aging-table-wrap"></div>
        </div>`;
        window.st_renderAgingTable();
    }

    window.st_renderAgingTable = function () {
        const wrap = document.getElementById('st-aging-table-wrap');
        if (!wrap) return;
        const aF = document.getElementById('st-aging-assignee')?.value||'';
        const dF = document.getElementById('st-aging-discipline')?.value||'';
        const sF = document.getElementById('st-aging-status')?.value||'open';
        const sf = document.getElementById('st-aging-sort')?.value||'age';
        let items = getSubtasks().filter(x => {
            if(aF&&x.assignee!==aF) return false;
            if(dF&&x.discipline!==dF) return false;
            if(sF==='open'&&x.done) return false;
            if(sF==='done'&&!x.done) return false;
            return true;
        });
        if(sf==='age') items.sort((a,b)=>(b.age??-1)-(a.age??-1));
        else if(sf==='assignee') items.sort((a,b)=>a.assignee.localeCompare(b.assignee)||(b.age??-1)-(a.age??-1));
        else items.sort((a,b)=>(a.parentKey||'').localeCompare(b.parentKey||'')||(b.age??-1)-(a.age??-1));
        if(!items.length){wrap.innerHTML=`<div class="st-empty">Geen subtaken gevonden.</div>`;return;}
        const open=items.filter(x=>!x.done), danger=open.filter(x=>x.age>=30).length, warn=open.filter(x=>x.age>=14&&x.age<30).length;
        wrap.innerHTML=`<div style="display:flex;gap:16px;margin-bottom:10px;font-size:12px;color:#6B778C;">
            <span>Totaal: <strong style="color:#172B4D">${items.length}</strong></span>
            <span>Open: <strong style="color:#0052CC">${open.length}</strong></span>
            ${danger?`<span>&gt;30d: <strong style="color:#FF5630">${danger}</strong></span>`:''}
            ${warn?`<span>14-30d: <strong style="color:#FFAB00">${warn}</strong></span>`:''}
        </div>
        <div style="overflow-x:auto;"><table class="st-tbl"><thead><tr>
            <th>Subtaak</th><th>Omschrijving</th><th>Parent</th><th>Persoon</th><th>Discipline</th><th>Status</th><th style="text-align:right">Open</th><th style="text-align:right">LT</th>
        </tr></thead><tbody>
        ${items.map(x=>{const rBg=(!x.done&&x.age>=30)?'background:#FFF5F5;':(!x.done&&x.age>=14)?'background:#FFFCEB;':'';return`<tr style="${rBg}">
            <td style="white-space:nowrap;">${tLink(x.key)}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(x.summary)}">${esc(x.summary)}</td>
            <td style="white-space:nowrap;">${x.parentKey?tLink(x.parentKey):'-'}</td>
            <td style="white-space:nowrap;">${esc(x.assignee)}</td>
            <td style="font-size:10px;color:#6B778C;">${esc(x.discipline)}</td>
            <td><span style="font-size:10px;padding:2px 7px;border-radius:10px;background:#EBECF0;color:#42526E;">${esc(x.status)}</span></td>
            <td style="text-align:right;white-space:nowrap;">${ageBadge(x.age,x.done)}</td>
            <td style="text-align:right;color:#6B778C;white-space:nowrap;">${x.lt!==null?Math.round(x.lt)+'d':'-'}</td>
        </tr>`;}).join('')}
        </tbody></table></div>`;
    };

    // -------------------------------------------------------
    // TAB 5: WIP
    // -------------------------------------------------------
    function renderWIP(subtasks) {
        const panel = document.getElementById('st-panel-wip');
        if (!panel) return;
        const open = subtasks.filter(x=>!x.done);
        if(!open.length){panel.innerHTML=`<div class="st-empty">Geen open subtaken.</div>`;return;}
        const DISC_COL={Backend:'#0052CC',Frontend:'#6554C0',Test:'#36B37E',Design:'#FF8B00',Infra:'#00B8D9',Data:'#FF5630',Overig:'#97A0AF'};
        const byP={};
        open.forEach(x=>{if(!byP[x.assignee])byP[x.assignee]={tasks:[],maxAge:0,totalAge:0};byP[x.assignee].tasks.push(x);if(x.age!==null){byP[x.assignee].maxAge=Math.max(byP[x.assignee].maxAge,x.age);byP[x.assignee].totalAge+=x.age;}});
        const persons=Object.entries(byP).map(([name,d])=>({name,count:d.tasks.length,maxAge:Math.round(d.maxAge),avgAge:Math.round(d.tasks.length?d.totalAge/d.tasks.length:0),tasks:d.tasks.sort((a,b)=>(b.age??-1)-(a.age??-1)),byDisc:d.tasks.reduce((acc,t)=>{acc[t.discipline]=(acc[t.discipline]||0)+1;return acc;},{})})).sort((a,b)=>b.count-a.count);
        const maxWip=Math.max(...persons.map(p=>p.count),1);
        panel.innerHTML=`<div class="st-card">
            <div style="font-size:11px;color:#6B778C;margin-bottom:16px;">Oranje = 4+ open &nbsp;&middot;&nbsp; Rood = 7+ open &nbsp;&middot;&nbsp; Doel: max 3</div>
            ${persons.map(p=>{const bc=p.count>=7?'#FF5630':p.count>=4?'#FFAB00':'#0052CC';const dH=Object.entries(p.byDisc).map(([d,n])=>`<span style="font-size:10px;color:${DISC_COL[d]||'#97A0AF'};margin-right:8px;">&#9679; ${d}: ${n}</span>`).join('');return`<div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #F4F5F7;">
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;"><span style="font-size:13px;font-weight:600;color:#172B4D;">${esc(p.name)}</span><span style="font-size:12px;color:${bc};font-weight:700;">${p.count} open</span></div>
                <div class="st-wip-bar"><div class="st-wip-fill" style="width:${(p.count/maxWip)*100}%;background:${bc};"></div></div>
                <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:#6B778C;"><div>${dH}</div><div>Langste: <strong style="color:${p.maxAge>=30?'#FF5630':p.maxAge>=14?'#FFAB00':'#172B4D'}">${p.maxAge}d</strong> &middot; Gem: ${p.avgAge}d</div></div>
                <div style="margin-top:6px;">${p.tasks.slice(0,3).map(t=>`<div style="font-size:11px;color:#6B778C;margin-top:3px;">${tLink(t.key)} - <span title="${esc(t.summary)}">${esc(t.summary.length>60?t.summary.slice(0,60)+'...':t.summary)}</span>${t.age!==null?`<span style="color:${t.age>=30?'#FF5630':t.age>=14?'#FFAB00':'#36B37E'};font-weight:600;"> &middot; ${Math.round(t.age)}d</span>`:''}</div>`).join('')}${p.tasks.length>3?`<div style="font-size:10px;color:#6B778C;margin-top:2px;">+ ${p.tasks.length-3} meer...</div>`:''}</div>
            </div>`;}).join('')}
        </div>`;
    }

    // -------------------------------------------------------
    // TAB 6: STORY VOORTGANG
    // -------------------------------------------------------
    function renderStories(subtasks) {
        const panel = document.getElementById('st-panel-stories');
        if (!panel) return;
        const byP={};
        subtasks.forEach(x=>{const k=x.parentKey||'(geen parent)';if(!byP[k])byP[k]={summary:x.parentSummary,tasks:[]};byP[k].tasks.push(x);});
        const stories=Object.entries(byP).map(([key,d])=>{const total=d.tasks.length,done=d.tasks.filter(t=>t.done).length,pct=total>0?Math.round((done/total)*100):0;const openT=d.tasks.filter(t=>!t.done);const maxAge=openT.length?Math.max(...openT.map(t=>t.age??0)):null;return{key,summary:d.summary,total,done,pct,maxAge,allDoneOpen:done===total&&total>0&&key!=='(geen parent)'};}).sort((a,b)=>a.pct-b.pct);
        if(!stories.length){panel.innerHTML=`<div class="st-empty">Geen parent-koppeling gevonden.</div>`;return;}
        const anomalies=stories.filter(s=>s.allDoneOpen);
        panel.innerHTML=`
            ${anomalies.length?`<div class="st-card" style="border-color:#FFAB00;background:#FFFAE6;">
                <div style="font-size:13px;font-weight:600;color:#172B4D;margin-bottom:8px;">Alle subtaken klaar - story nog open</div>
                <div style="font-size:11px;color:#6B778C;margin-bottom:10px;">Deze stories hebben 100% afgeronde subtaken maar staan zelf nog niet op Done.</div>
                ${anomalies.map(s=>`<div style="font-size:12px;margin-bottom:4px;">${tLink(s.key)} - ${esc(s.summary||'(geen titel)')} <span style="color:#6B778C;">&middot; ${s.total} subtaken</span></div>`).join('')}
            </div>`:''}
            <div class="st-card">
                <div style="font-size:11px;color:#6B778C;margin-bottom:16px;">Gesorteerd op minste voortgang &middot; Rood = blokkade (&gt;30d open)</div>
                ${stories.map(s=>{const fc=s.pct>=80?'':s.pct>=40?'warn':'bad';const ac=s.maxAge>=30?'#FF5630':s.maxAge>=14?'#FFAB00':'#36B37E';return`<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #F4F5F7;">
                    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">
                        <span style="font-size:12px;font-weight:600;">${s.key!=='(geen parent)'?tLink(s.key):`<span style="color:#6B778C;">(geen parent)</span>`}<span style="font-size:11px;font-weight:400;color:#6B778C;margin-left:6px;">${esc(s.summary.length>60?s.summary.slice(0,60)+'...':s.summary)}</span></span>
                        <span style="font-size:12px;font-weight:700;color:#172B4D;white-space:nowrap;margin-left:10px;">${s.done}/${s.total} (${s.pct}%)</span>
                    </div>
                    <div class="st-sp-bar"><div class="st-sp-fill ${fc}" style="width:${s.pct}%;"></div></div>
                    ${s.maxAge!==null?`<div style="font-size:10px;color:${ac};margin-top:3px;">Langste open subtaak: ${Math.round(s.maxAge)}d</div>`:''}
                </div>`;}).join('')}
            </div>`;
    }

    // -------------------------------------------------------
    // TAB 3: ADVIES (hergebruikt window.l_generateAdvice uit advies.js)
    // -------------------------------------------------------
    function renderAdvies(subtasks) {
        const panel = document.getElementById('st-panel-advies');
        if (!panel) return;

        if (typeof window.l_generateAdvice !== 'function') {
            panel.innerHTML = '<div style="padding:20px; font-size:13px; color:#6B778C;">Adviesmodule (advies.js) is nog niet geladen. Probeer de tab opnieuw te openen.</div>';
            return;
        }

        const done   = subtasks.filter(x => x.done);
        const open   = subtasks.filter(x => !x.done);
        const now    = new Date();

        // Bereken metrics uit subtaakdata
        const ltVals = done.map(x => x.lt).filter(v => v !== null && !isNaN(v) && v >= 0);
        const ctVals = done.map(x => x.ct).filter(v => v !== null && !isNaN(v) && v >= 0);
        const feVals = done.map(x => x.fe).filter(v => v !== null && !isNaN(v));

        const pct85 = arr => {
            const s = [...arr].sort((a, b) => a - b);
            return s.length ? s[Math.max(0, Math.ceil(0.85 * s.length) - 1)] : null;
        };
        const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
        const cv  = arr => {
            if (arr.length < 3) return null;
            const m = avg(arr);
            const sd = Math.sqrt(arr.map(v => (v - m) ** 2).reduce((a, b) => a + b, 0) / arr.length);
            return m > 0 ? (sd / m) * 100 : null;
        };

        const metrics = {
            ltP85:     pct85(ltVals),
            ctP85:     pct85(ctVals),
            feAvg:     avg(feVals),
            cvPct:     cv(ctVals),
            stabPct:   subtasks.length > 0 ? (done.length / subtasks.length) * 100 : null,
            openIssues: open.map(x => ({ key: x.key, summary: x.summary, assignee: x.assignee, age: x.age }))
        };

        panel.innerHTML = '<div style="padding:20px;">' + window.l_generateAdvice(metrics, 'subtaken') + '</div>';
    }

    // -------------------------------------------------------
    // TAB 7: TAKEN HELD
    // -------------------------------------------------------
    function renderTrophy(subtasks) {
        const panel = document.getElementById('st-panel-trophy');
        if (!panel) return;
        const lastSprint = getLastClosedSprint();
        if (!lastSprint) { panel.innerHTML = `<div class="st-empty">Geen afgesloten sprint gevonden.</div>`; return; }
        const sS=new Date(lastSprint.startDate), sE=new Date(lastSprint.completeDate||lastSprint.endDate);
        const inSprint=subtasks.filter(x=>x.done&&x.resolved&&x.resolved>=sS&&x.resolved<=sE);
        if(!inSprint.length){panel.innerHTML=`<div class="st-card"><div style="font-size:13px;color:#6B778C;">Geen afgeronde subtaken in sprint <strong>${esc(lastSprint.name)}</strong>.</div></div>`;return;}
        const counts={};
        inSprint.forEach(x=>{counts[x.assignee]=(counts[x.assignee]||0)+1;});
        const ranking=Object.entries(counts).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
        const winner=ranking[0];
        const winnerTasks=inSprint.filter(x=>x.assignee===winner.name).sort((a,b)=>(b.lt??0)-(a.lt??0));
        panel.innerHTML=`
            <div class="st-trophy-card">
                <div style="font-size:56px;line-height:1;flex-shrink:0;">&#127942;</div>
                <div style="flex:1;">
                    <div style="font-size:11px;color:#FFAB00;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Taken Held &mdash; ${esc(lastSprint.name)}</div>
                    <div style="font-size:22px;font-weight:700;color:#172B4D;">${esc(winner.name)}</div>
                    <div style="font-size:13px;color:#6B778C;margin-top:4px;">Heeft de meeste subtaken afgetikt in de laatste sprint</div>
                </div>
                <div style="text-align:center;"><div style="font-size:36px;font-weight:700;color:#FFAB00;">${winner.count}</div><div style="font-size:11px;color:#6B778C;">subtaken</div></div>
            </div>
            <div class="st-card">
                <div style="font-size:12px;font-weight:600;color:#172B4D;margin-bottom:10px;">Afgeronde subtaken van ${esc(winner.name)} in deze sprint</div>
                <table class="st-tbl"><thead><tr><th>Subtaak</th><th>Omschrijving</th><th>Parent</th><th style="text-align:right">Lead time</th></tr></thead><tbody>
                ${winnerTasks.map(t=>`<tr><td style="white-space:nowrap;">${tLink(t.key)}</td><td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(t.summary)}">${esc(t.summary)}</td><td style="white-space:nowrap;">${t.parentKey?tLink(t.parentKey):'-'}</td><td style="text-align:right;color:#6B778C;">${t.lt!==null?Math.round(t.lt)+'d':'-'}</td></tr>`).join('')}
                </tbody></table>
            </div>
            ${ranking.length>1?`<div class="st-card" style="font-size:12px;color:#6B778C;">
                <div style="font-weight:600;color:#172B4D;margin-bottom:8px;">Alle teamleden &mdash; ${esc(lastSprint.name)}</div>
                ${ranking.map((p,i)=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #F4F5F7;"><span>${i+1}. ${esc(p.name)}</span><strong style="color:#172B4D;">${p.count} subtaken</strong></div>`).join('')}
            </div>`:''}`;
    }

    // -------------------------------------------------------
    // Publieke functie: modal openen
    // -------------------------------------------------------
    window.l_openSubtaken = function () {
        injectCSS();
        injectModal();
        const subtasks=getSubtasks(), lastSprint=getLastClosedSprint();
        const sub=document.getElementById('st-modal-sub');
        if(sub){const open=subtasks.filter(x=>!x.done).length,done=subtasks.filter(x=>x.done).length,sp=lastSprint?' - Sprint: '+lastSprint.name:'';sub.textContent=subtasks.length+' subtaken - '+open+' open - '+done+' klaar'+sp;}
        if(!subtasks.length){TAB_NAMES.forEach(id=>{const p=document.getElementById('st-panel-'+id);if(p)p.innerHTML=`<div class="st-empty">Geen subtaakdata beschikbaar.</div>`;});}
        else{renderAnalyse(subtasks);renderMonte(subtasks);renderAdvies(subtasks);renderAging(subtasks);renderWIP(subtasks);renderStories(subtasks);renderTrophy(subtasks);}
        st_switchTab('analyse');
        document.getElementById('st-modal-overlay').style.display='block';
    };

})();