// ============================================================
// Scrum Flow Dashboard - Geautomatiseerd Advies Module
// Bestand: advies.js
// Ondersteunt context: 'issues' (dashboard) en 'subtaken'
// ============================================================

window.LUCAS_ADVICE_CONFIG = {
    leadTime: [
        { max: 7,    cls: 'good',   text: "De doorlooptijd (Lead Time P85) is uitzonderlijk kort (onder de 7 dagen). In de DevOps wereld noemen we dit 'Elite' prestatieniveau volgens de <a href='https://dora.dev/guides/dora-metrics-four-keys/' target='_blank' style='color:#0052CC; text-decoration:none; font-weight:600;'>DORA metrics</a>." },
        { max: 14,   cls: 'good',   text: "De doorlooptijd (Lead Time P85) is uitstekend (onder de twee weken). Volgens het <a href='https://dora.dev/guides/dora-metrics-four-keys/' target='_blank' style='color:#0052CC; text-decoration:none; font-weight:600;'>DORA onderzoek</a> presteren jullie hiermee als High Performers." },
        { max: 30,   cls: 'warn',   text: "De doorlooptijd (Lead Time P85) is gemiddeld (tot een maand). Er is ruimte voor verbetering — onderzoek of werk kleiner opgeknipt kan worden." },
        { max: 60,   cls: 'danger', text: "De doorlooptijd (Lead Time P85) is aan de trage kant. Stakeholders wachten regelmatig één tot twee maanden. Volgens de <a href='https://dora.dev/guides/dora-metrics-four-keys/' target='_blank' style='color:#0052CC; text-decoration:none; font-weight:600;'>DORA metrics</a> vallen jullie hiermee in de categorie Low Performers." },
        { max: 9999, cls: 'danger', text: "De doorlooptijd (Lead Time P85) is <strong>kritiek lang</strong>. Stakeholders moeten extreem lang wachten op oplevering." }
    ],
    cycleTime: [
        { max: 3,    cls: 'good',   text: "De actieve bewerkingstijd (Cycle Time) is indrukwekkend kort. Zodra het werk wordt opgepakt, is het nagenoeg direct klaar." },
        { max: 7,    cls: 'good',   text: "De bewerkingstijd (Cycle Time) is zeer gezond. Werk kost doorgaans maximaal een week om af te ronden nadat het is opgepakt." },
        { max: 14,   cls: 'warn',   text: "De bewerkingstijd (Cycle Time) beslaat ongeveer de lengte van een standaard sprint. Acceptabel, maar er is verbetering mogelijk." },
        { max: 30,   cls: 'danger', text: "De bewerkingstijd (Cycle Time) is te lang. Dit wijst op te grote werkpakketten of afhankelijkheden tijdens het uitvoeren." },
        { max: 9999, cls: 'danger', text: "De bewerkingstijd (Cycle Time) is <strong>extreem lang</strong>. Werk blijft te lang 'In Progress' staan. Overweeg strikte WIP-limieten." }
    ],
    flowEff: [
        { max: 10,   cls: 'danger', text: "De Flow Efficiency is zeer laag (onder de 10%). Werk staat veruit de meeste tijd stil en wacht. De bottleneck zit in wachtrijen of review-fases." },
        { max: 20,   cls: 'warn',   text: "De Flow Efficiency ligt rond het industriegemiddelde van 15-20%. Laag, maar in de IT daadwerkelijk standaard. Er is veel ruimte voor verbetering door minder werk tegelijk op te pakken." },
        { max: 40,   cls: 'good',   text: "De Flow Efficiency is goed (boven gemiddeld). Wachttijden worden vlot afgehandeld." },
        { max: 100,  cls: 'good',   text: "De Flow Efficiency is <strong>fenomenaal</strong>. Werk stroomt nagenoeg zonder onnodige wachttijden door het systeem. Zeer strak gewerkt!" }
    ],
    consistency: [
        { max: 30,   cls: 'good',   text: "Het team is qua doorlooptijd <strong>extreem voorspelbaar</strong> (CV < 30%). Een stabiele variantie maakt plannen en voorspellen betrouwbaar." },
        { max: 50,   cls: 'good',   text: "Het team is qua doorlooptijd zeer consistent. De lage spreiding maakt sprint planning betrouwbaar." },
        { max: 80,   cls: 'warn',   text: "Qua voorspelbaarheid toont het team matige consistentie. Probeer werk strakker in gelijke brokken op te delen." },
        { max: 120,  cls: 'danger', text: "Het team toont een hoge inconsistentie. Er is een mix van snelle en trage opleveringen. Betrouwbaar plannen is nu riskant." },
        { max: 9999, cls: 'danger', text: "Het team toont een <strong>zeer hoge inconsistentie</strong> (CV > 120%). Er is geen helder patroon te ontdekken. Onderzoek of veel ongepland werk de planning verstoort." }
    ],
    stability: [
        { max: 70,   cls: 'danger', text: "De stabiliteitsindex is kritiek laag. Er wordt aanzienlijk meer werk gecreëerd dan afgerond. De werkvoorraad groeit onbeheersbaar." },
        { max: 85,   cls: 'warn',   text: "De stabiliteitsindex staat onder druk. Er komt structureel meer werk bij dan afgerond wordt. De kraan moet tijdelijk wat dichter." },
        { max: 105,  cls: 'good',   text: "Het systeem is <strong>perfect in balans</strong>. Er komt net zoveel werk bij als dat er wordt afgerond." },
        { max: 120,  cls: 'warn',   text: "De stabiliteitsindex is aan de hoge kant. Er wordt structureel meer afgerond dan bijgekomen — de voorraad krimpt." },
        { max: 9999, cls: 'warn',   text: "Er wordt veel meer gesloten dan aangemaakt. Dit gebeurt vaak bij een bulk-opschoning of aan het einde van een jaar." }
    ]
};

// ============================================================
// HOOFD FUNCTIE
// metrics : object met ltP85, ctP85, feAvg, cvPct, stabPct, openIssues
// context : 'issues' (standaard, voor dashboard.js)
//           'subtaken' (voor subtaken.js)
// ============================================================
window.l_generateAdvice = function(metrics, context) {
    if (!metrics || Object.keys(metrics).length === 0) return "";
    context = context || 'issues';

    const c    = window.LUCAS_ADVICE_CONFIG;
    const jUrl = window.LUCAS_JIRA_URL || "";
    let adviesTeksten = [];
    let actiePunten   = [];

    // Databron afhankelijk van context
    let dta = [];
    if (context === 'subtaken') {
        const raw = (typeof l_state !== 'undefined' && l_state.rawSubtasks) ? l_state.rawSubtasks : [];
        const DONE_WORDS = ['done','closed','resolved','gesloten','opgelost','klaar','gedaan'];
        const devField   = (typeof window.L_CFG !== 'undefined' && window.L_CFG.F) ? window.L_CFG.F.dev : 'customfield_13300';
        dta = raw.map(i => {
            if (!i || !i.fields) return null;
            const f        = i.fields;
            const isD      = DONE_WORDS.some(s => (f.status?.name || '').toLowerCase().includes(s));
            const created  = f.created ? new Date(f.created) : null;
            const resolved = f.resolutiondate ? new Date(f.resolutiondate) : (isD && f.updated ? new Date(f.updated) : null);
            const devStart = f[devField] ? new Date(f[devField]) : null;
            const lt = (isD && created && resolved) ? (resolved - created) / 86400000 : null;
            const ct = (isD && devStart && resolved) ? (resolved - devStart) / 86400000 : null;
            const qt = (created && devStart) ? (devStart - created) / 86400000 : null;
            return { key: i.key, summary: f.summary || '', assignee: f.assignee?.displayName || 'Onbekend', isD, lt, ct, qt };
        }).filter(Boolean);
    } else {
        dta = (typeof l_state !== 'undefined' && l_state.filtered) ? l_state.filtered : [];
    }

    const _fDay = (typeof fDay === 'function') ? fDay
                : (v => (v === null || isNaN(v)) ? '-' : (v < 1 ? Math.round(v*24)+'u' : v.toFixed(1)+'d'));

    const getAdvice = (val, arr) => {
        if (val === null || isNaN(val)) return null;
        for (const entry of arr) if (val <= entry.max) return { ...entry };
        return null;
    };

    const getWorst = (arr, field) => {
        const v = arr.filter(x => x[field] !== null && !isNaN(x[field]));
        return v.length ? v.reduce((m, o) => o[field] > m[field] ? o : m) : null;
    };

    const tLink = key => jUrl
        ? '<a href="' + jUrl + '/browse/' + key + '" target="_blank" style="color:#0052CC; text-decoration:none; font-weight:600;">' + key + '</a>'
        : '<strong>' + key + '</strong>';

    // Contextuele labels
    const itemLbl  = context === 'subtaken' ? 'subtaken' : 'issues';
    const itemLbl1 = context === 'subtaken' ? 'Subtaak'  : 'Issue';

    // --- METRICS EVALUEREN ---
    let st = getAdvice(metrics.stabPct, c.stability);
    let lt = getAdvice(metrics.ltP85,   c.leadTime);
    let ct = getAdvice(metrics.ctP85,   c.cycleTime);
    let fe = getAdvice(metrics.feAvg,   c.flowEff);
    let cv = getAdvice(metrics.cvPct,   c.consistency);

    // --- PER-ITEM VERRIJKING ---
    if (lt && lt.max >= 30) {
        const worst = getWorst(dta, 'lt');
        if (worst) {
            const who = worst.assignee !== 'Onbekend' ? '(toegewezen aan <strong>' + worst.assignee + '</strong>)' : '(niet toegewezen)';
            lt.text += ' ' + itemLbl1 + ' ' + tLink(worst.key) + ' ' + who + ' had een doorlooptijd van ' + Math.round(worst.lt) + ' dagen.';
        }
    }
    if (ct && ct.max >= 14) {
        const worst = getWorst(dta, 'ct');
        if (worst) {
            const who = worst.assignee !== 'Onbekend' ? '(' + worst.assignee + ')' : '(onbeheerd)';
            ct.text += ' ' + itemLbl1 + ' ' + tLink(worst.key) + ' ' + who + ' kostte ' + Math.round(worst.ct) + ' dagen actieve bewerkingstijd.';
        }
    }
    if (fe && fe.max <= 20) {
        const worst = getWorst(dta, 'qt');
        if (worst) {
            fe.text += ' ' + itemLbl1 + ' ' + tLink(worst.key) + ' lag ' + Math.round(worst.qt) + ' dagen te wachten zonder actie.';
        }
    }

    // --- ADVIESTEKSTEN OPBOUWEN ---
    if (st) adviesTeksten.push(st.text);
    if (lt) adviesTeksten.push(lt.text);
    if (ct) adviesTeksten.push(ct.text);
    if (fe) adviesTeksten.push(fe.text);
    if (cv) adviesTeksten.push(cv.text);

    // =========================================================
    // ACTIEPUNTEN — ALLEEN VOOR ISSUES
    // =========================================================
    if (context === 'issues' && dta.length > 0) {

        if (metrics.stabPct !== undefined && metrics.stabPct < 85) {
            actiePunten.push('<strong>Backlog weigering:</strong> Kijk samen met de PO naar de instroom. Plan een sessie om de instroom tijdelijk te bevriezen totdat de openstaande berg werk is afgebouwd.');
        }

        const totalSp = dta.reduce((acc, d) => acc + (d.sp || 0), 0);
        if (totalSp === 0) {
            actiePunten.push('<strong>Refinement dialoog:</strong> Het team heeft 0 Story Points geregistreerd. Overweeg of schatten via Planning Poker nuttig is om onuitgesproken aannames boven tafel te krijgen. <a href="https://www.agilealliance.org/glossary/planning-poker/" target="_blank" style="color:#0052CC; text-decoration:none;">[Meer over Planning Poker]</a>');
        }

        const bugs = dta.filter(d => d.t === 'Bug').length;
        if (bugs === 0) {
            actiePunten.push('<strong>Kwaliteit registreren:</strong> Er zijn 0 bugs in de dataset. Registreer herstelwerk expliciet als Bug om inzicht te krijgen in MTTR en de verhouding nieuwe waarde vs. onderhoud.');
        }

        const rr = dta.filter(d => d.isD && d.df && d.dl);
        if (rr.length > 5) {
            const rw = rr.filter(x => x.rs > 0);
            const rt = (rw.length / rr.length) * 100;
            if (rt > 20) {
                actiePunten.push('<strong>Kwaliteit aan de poort:</strong> ' + Math.round(rt) + '% van de tickets is na oplevering opnieuw aangeraakt (rework). Bespreek de test-strategie en <em>Definition of Done</em>. <a href="https://www.agilealliance.org/glossary/definition-of-done/" target="_blank" style="color:#0052CC; text-decoration:none;">[Lees meer over de DoD]</a>');
            } else if (rt === 0 && rr.length > 10) {
                adviesTeksten.push('<strong>First Time Right:</strong> 0% rework gemeten. Tickets worden in één keer goed afgeleverd. Vakwerk!');
            }
        }

        const bejaarden = dta
            .filter(d => d.c && d.r && (d.r.getTime() - d.c.getTime()) / 86400000 > 100)
            .sort((a, b) => (b.r.getTime() - b.c.getTime()) - (a.r.getTime() - a.c.getTime()));
        if (bejaarden.length > 0) {
            const oudste = bejaarden[0];
            const dagen  = Math.round((oudste.r.getTime() - oudste.c.getTime()) / 86400000);
            const wie    = oudste.assignee !== 'Onbekend' ? 'direct met <strong>' + oudste.assignee + '</strong>' : 'met het hele team';
            actiePunten.push('<strong>Blokkades oplossen:</strong> ' + itemLbl1 + ' ' + tLink(oudste.key) + ' heeft ' + dagen + ' dagen in het systeem gehangen. Bespreek ' + wie + ' hoe dit kon ontsnappen.');
        }

        const workerCounts = {};
        let totalAssigned  = 0;
        dta.forEach(d => {
            if (d.assignee && d.assignee !== 'Onbekend' && !d.assignee.includes('GROUP:')) {
                workerCounts[d.assignee] = (workerCounts[d.assignee] || 0) + 1;
                totalAssigned++;
            }
        });
        const workers = Object.entries(workerCounts).sort((a, b) => b[1] - a[1]);
        if (workers.length >= 3 && totalAssigned > 10) {
            const pct = (workers[0][1] / totalAssigned) * 100;
            if (pct > 40) {
                actiePunten.push('<strong>Werk herverdelen:</strong> <strong>' + workers[0][0] + '</strong> is betrokken bij ' + Math.round(pct) + '% van alle ' + itemLbl + '. Dit creëert een Key Person Risk. Bespreek hoe anderen taken kunnen overnemen.');
            }
        }
    }

    // =========================================================
    // ACTIEPUNTEN — ALLEEN VOOR SUBTAKEN
    // =========================================================
    if (context === 'subtaken' && dta.length > 0) {

        const openSubs   = dta.filter(x => !x.isD);
        const wipCounts  = {};
        openSubs.forEach(x => { wipCounts[x.assignee] = (wipCounts[x.assignee] || 0) + 1; });
        const overWip    = Object.entries(wipCounts).filter(([, n]) => n >= 5).sort((a, b) => b[1] - a[1]);
        if (overWip.length > 0) {
            const rows = overWip.slice(0, 4).map(([name, n]) => '<strong>' + name + '</strong>: ' + n + ' open').join('  ·  ');
            actiePunten.push('<strong>Hoge WIP:</strong> De volgende teamleden hebben 5+ open subtaken tegelijk: ' + rows + '. Bespreek in de Daily of taken gestapeld zijn of dat er blokkades spelen.');
        }

        const bejaarden = dta.filter(d => d.isD && d.lt !== null && d.lt > 60).sort((a, b) => b.lt - a.lt);
        if (bejaarden.length > 0) {
            const oudste = bejaarden[0];
            const wie    = oudste.assignee !== 'Onbekend' ? '<strong>' + oudste.assignee + '</strong>' : 'het team';
            actiePunten.push('<strong>Lange subtaak:</strong> ' + itemLbl1 + ' ' + tLink(oudste.key) + ' had een doorlooptijd van ' + Math.round(oudste.lt) + ' dagen. Bespreek met ' + wie + ' of dit soort taken eerder gesignaleerd kan worden.');
        }
    }

    // =========================================================
    // AGING — GELDT VOOR BEIDE CONTEXTEN
    // =========================================================
    const AGE_WARN = 14, AGE_DANGER = 30;

    if (metrics.openIssues && metrics.openIssues.length > 0) {
        const aged     = metrics.openIssues.filter(x => x.age !== null && x.age >= AGE_WARN).sort((a, b) => b.age - a.age);
        const critical = aged.filter(x => x.age >= AGE_DANGER);
        const warning  = aged.filter(x => x.age >= AGE_WARN && x.age < AGE_DANGER);

        if (critical.length > 0) {
            let rows = critical.slice(0, 5).map(x => {
                const wie = x.assignee !== 'Onbekend' ? ' &mdash; bespreek met <strong>' + x.assignee + '</strong>' : '';
                return '<div style="margin-top:5px; padding:5px 8px; background:rgba(255,255,255,0.55); border-radius:4px; font-size:11px; line-height:1.5;">'
                    + tLink(x.key) + ' <span style="color:#42526E;"> &ndash; ' + (x.summary || '(geen titel)') + '</span>'
                    + '<span style="color:#FF5630; font-weight:600;"> &middot; ' + Math.round(x.age) + 'd open' + wie + '</span></div>';
            }).join('');
            const more = critical.length > 5 ? '<div style="font-size:11px; color:#6B778C; margin-top:5px;">+ ' + (critical.length - 5) + ' andere...</div>' : '';
            actiePunten.push('<strong>Blokkades in uitvoering (&gt;' + AGE_DANGER + ' dagen):</strong> ' + critical.length + ' ' + itemLbl + ' staat al langer dan een maand In Progress.' + rows + more);
        }

        if (warning.length > 0) {
            const preview = warning.slice(0, 4).map(x => {
                const wie = x.assignee !== 'Onbekend' ? ' (' + x.assignee + ')' : '';
                return tLink(x.key) + wie + ': <strong>' + Math.round(x.age) + 'd</strong>';
            }).join('  &middot;  ');
            const more = warning.length > 4 ? ' en ' + (warning.length - 4) + ' andere' : '';
            actiePunten.push('<strong>' + itemLbl1 + ' op de grens (' + AGE_WARN + '&ndash;' + AGE_DANGER + ' dagen open):</strong> Check op stille blokkades. ' + preview + more);
        }

        const byAssignee = {};
        metrics.openIssues.forEach(x => {
            if (!x.assignee || x.assignee === 'Onbekend' || x.age === null) return;
            if (!byAssignee[x.assignee]) byAssignee[x.assignee] = [];
            byAssignee[x.assignee].push(x);
        });
        const overloaded = Object.entries(byAssignee)
            .map(([name, items]) => ({
                name,
                count:  items.length,
                maxAge: Math.max(...items.map(x => x.age)),
                avgAge: Math.round(items.reduce((s, x) => s + x.age, 0) / items.length)
            }))
            .filter(a => a.count >= 3 || a.maxAge >= AGE_DANGER)
            .sort((a, b) => b.maxAge - a.maxAge);

        if (overloaded.length > 0) {
            const rows = overloaded.slice(0, 5).map(a =>
                '<div style="margin-top:4px; font-size:11px;"><strong>' + a.name + '</strong>: ' + a.count + ' open &mdash; langste al <strong style="color:#FF5630">' + Math.round(a.maxAge) + ' dagen</strong>, gemiddeld ' + a.avgAge + 'd</div>'
            ).join('');
            actiePunten.push('<strong>Werkdruk per persoon:</strong> Deze teamleden hebben opvallend veel of lang openstaande taken.' + rows);
        }
    }

    // =========================================================
    // HTML OPBOUW
    // =========================================================
    const title = context === 'subtaken' ? 'Subtaken Advies' : 'Team advies';
    let html = '<div style="background:#FFFFFF; border:1px solid #DFE1E6; border-radius:6px; padding:24px; margin-bottom:24px; box-shadow:0 1px 3px rgba(9,30,66,.12);">'
             + '<h3 style="margin-top:0; color:#172B4D; font-size:16px; margin-bottom:16px; font-weight:600;">' + title + '</h3>';

    if (adviesTeksten.length === 0 && actiePunten.length === 0) {
        html += '<p style="margin:0; font-size:13px; color:#42526E;"><em>Er is momenteel onvoldoende data beschikbaar om advies te formuleren.</em></p>';
    } else {
        const hasAdvies  = adviesTeksten.length > 0;
        const hasActions = actiePunten.length > 0;

        html += (hasAdvies && hasActions)
            ? '<div class="l-grid-2" style="margin-bottom:0; font-size:13px; color:#42526E; line-height:1.7;">'
            : '<div style="font-size:13px; color:#42526E; line-height:1.7;">';

        if (hasAdvies) {
            html += '<div>';
            adviesTeksten.forEach(t => { html += '<p style="margin-top:0; margin-bottom:14px;">' + t + '</p>'; });
            html += '</div>';
        }
        if (hasActions) {
            html += '<div><div style="height:100%; box-sizing:border-box;">'
                  + '<strong style="display:block; color:#172B4D; margin-bottom:12px; font-size:14px;">Voorgestelde acties:</strong>'
                  + '<ul style="margin:0; padding-left:20px; color:#42526E;">';
            actiePunten.forEach(a => { html += '<li style="margin-bottom:10px;">' + a + '</li>'; });
            html += '</ul></div></div>';
        }
        html += '</div>';
    }

    html += '</div>';
    return html;
};