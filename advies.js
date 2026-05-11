// ============================================================
// Scrum Flow Dashboard - Geautomatiseerd Advies Module
// Bestand: advies.js
// ============================================================

window.LUCAS_ADVICE_CONFIG = {
    leadTime: [
        { max: 7, class: 'good', text: "Jullie doorlooptijd (Lead Time P85) is uitzonderlijk kort (onder de 7 dagen). In de DevOps wereld noemen we dit 'Elite' prestatieniveau volgens de <a href='https://dora.dev/guides/dora-metrics-four-keys/' target='_blank' style='color:#0052CC; text-decoration:none; font-weight:600;'>DORA (DevOps Research and Assessment) metrics</a>. In de grafiek <em>Histogram</em> zie je dit weerspiegeld als een massieve, smalle piek aan de linkerkant." },
        { max: 14, class: 'good', text: "Jullie doorlooptijd (Lead Time P85) is uitstekend (onder de twee weken). Volgens het bekende <a href='https://dora.dev/guides/dora-metrics-four-keys/' target='_blank' style='color:#0052CC; text-decoration:none; font-weight:600;'>DORA onderzoek</a> presteren jullie hiermee als High Performers." },
        { max: 30, class: 'warn', text: "Jullie doorlooptijd (Lead Time P85) is gemiddeld (tot een maand). Stakeholders moeten even wachten, maar de stroom is stabiel. In de <em>Scatterplot</em> zie je wellicht enkele hoge stippen; onderzoek of die grote items de volgende keer kleiner opgeknipt kunnen worden." },
        { max: 60, class: 'danger', text: "Jullie doorlooptijd (Lead Time P85) is aan de trage kant. Stakeholders wachten regelmatig één tot twee maanden op waarde. Volgens de <a href='https://dora.dev/guides/dora-metrics-four-keys/' target='_blank' style='color:#0052CC; text-decoration:none; font-weight:600;'>DORA metrics</a> vallen jullie hiermee in de categorie Low Performers. Kijk in de grafiek <em>Fase-verdeling</em> waar de meeste tijd verloren gaat." },
        { max: 9999, class: 'danger', text: "De doorlooptijd (Lead Time P85) is <strong>kritiek lang</strong>. Stakeholders moeten extreem lang wachten op oplevering. Bekijk het <em>Histogram</em>: de 'staart' van deze grafiek loopt veel te ver door naar rechts." }
    ],
    cycleTime: [
        { max: 3, class: 'good', text: "De actieve bewerkingstijd (Cycle Time) is indrukwekkend kort. Zodra jullie aan een ticket beginnen, is het nagenoeg direct af. In de Kanban methode is dit een buitengewoon gezonde 'Service Level Expectation' (SLE). Meer hierover lees je in de <a href='https://kanbanuniversity.com/kanban-guide/' target='_blank' style='color:#0052CC; text-decoration:none; font-weight:600;'>officiële Kanban Guide</a>." },
        { max: 7, class: 'good', text: "De bewerkingstijd (Cycle Time) is zeer gezond. Een ticket kost doorgaans maximaal een week om af te ronden nadat het is opgepakt." },
        { max: 14, class: 'warn', text: "De bewerkingstijd (Cycle Time) beslaat ongeveer de lengte van een standaard sprint. Dit is acceptabel, maar betekent wel dat een ticket heel snel doorschuift naar een volgende sprint als het pas in de tweede week wordt opgepakt." },
        { max: 30, class: 'danger', text: "De bewerkingstijd (Cycle Time) is te lang. Je ziet in de <em>Fase-verdeling</em> dat de blauwe Active-balk erg dominant is. Dit wijst op te grote stories of enorme afhankelijkheden tijdens het bouwen." },
        { max: 9999, class: 'danger', text: "De actieve bewerkingstijd (Cycle Time) is <strong>extreem lang</strong>. Tickets blijven soms maandenlang 'In Progress' staan. Bescherm jullie focus door strikte Work-In-Progress (WIP) limieten in te stellen. Dit concept wordt uitgebreid beschreven door de <a href='https://kanbanuniversity.com/kanban-guide/' target='_blank' style='color:#0052CC; text-decoration:none; font-weight:600;'>Kanban University</a>." }
    ],
    flowEff: [
        { max: 10, class: 'danger', text: "Jullie Flow Efficiency is zeer alarmerend (onder de 10%). Dit betekent dat tickets veruit de meeste tijd <em>stilstaan</em> en wachten in plaats van dat er actief aan gewerkt wordt. De bottleneck zit in jullie wachtrijen of review fases, niet in jullie ontwikkelsnelheid." },
        { max: 20, class: 'warn', text: "Jullie Flow Efficiency ligt rond het industriegemiddelde van 15-20%. Het klinkt schokkend laag, maar in de IT is dit daadwerkelijk de standaard. Daniel Vacanti omschrijft dit fenomeen uitgebreid in zijn theorie over <a href='https://actionableagile.com/blog/flow-efficiency/' target='_blank' style='color:#0052CC; text-decoration:none; font-weight:600;'>Actionable Agile en Flow Efficiency</a>. Er is nog veel ruimte voor verbetering door minder werk tegelijk op te pakken." },
        { max: 40, class: 'good', text: "Jullie Flow Efficiency is goed (boven gemiddeld). Wachttijden en 'handovers' tussen teamleden worden vlot afgehandeld." },
        { max: 100, class: 'good', text: "Jullie Flow Efficiency is <strong>fenomenaal</strong>. Tickets stromen nagenoeg zonder onnodige wachttijden (de oranje balken in jullie fase-verdeling) door het systeem heen. Zeer strak gewerkt!" }
    ],
    consistency: [
        { max: 30, class: 'good', text: "Het team is qua doorlooptijd <strong>extreem voorspelbaar</strong> (CV < 30%). De piekvorm in het <em>Histogram</em> is heel geconcentreerd. Complimenten aan de Product Owner! Een stabiele variantie maakt het inschatten van de <a href='https://www.agilealliance.org/glossary/velocity/' target='_blank' style='color:#0052CC; text-decoration:none; font-weight:600;'>Team Velocity (Agile Alliance)</a> ontzettend betrouwbaar." },
        { max: 50, class: 'good', text: "Het team is qua doorlooptijd zeer consistent. De lage spreiding in de <em>Scatterplot</em> maakt het maken van een sprint planning betrouwbaar." },
        { max: 80, class: 'warn', text: "Qua voorspelbaarheid toont het team matige consistentie. In de <em>Scatterplot</em> zie je een wat willekeurige spreiding. Probeer werk tijdens de refinement strakker in gelijke brokken op te delen." },
        { max: 120, class: 'danger', text: "Het team toont een hoge inconsistentie. In de <em>Scatterplot</em> zie je een mix van hele snelle en extreem trage opleveringen. Betrouwbaar plannen naar de business toe is nu riskant." },
        { max: 9999, class: 'danger', text: "Het team toont een <strong>zeer hoge inconsistentie</strong> (CV > 120%). Er is geen helder patroon meer te ontdekken. Onderzoek tijdens de retro of er veel onverwacht (ongepland) werk de sprint in fietst waardoor gepland werk stagneert." }
    ],
    stability: [
        { max: 70, class: 'danger', text: "De stabiliteitsindex is kritiek laag. Er wordt aanzienlijk meer werk gecreëerd dan jullie kunnen afronden. In het <em>Cumulatief Stroomdiagram (CFD)</em> zie je de banden dan ook sterk divergeren. Jullie verdrinken langzaam in het werk." },
        { max: 85, class: 'warn', text: "De stabiliteitsindex staat onder druk. Er komt structureel meer werk het systeem in dan jullie afronden. De backlog groeit dicht; de kraan moet tijdelijk wat dichter gedraaid worden. Dit principe van 'Stop starting, start finishing' is een kernwaarde uit de <a href='https://www.scrum.org/resources/kanban-guide-scrum-teams' target='_blank' style='color:#0052CC; text-decoration:none; font-weight:600;'>Kanban Guide for Scrum Teams (Scrum.org)</a>." },
        { max: 105, class: 'good', text: "Het systeem is <strong>perfect in balans</strong>. Er komt net zoveel werk bij als dat er wordt afgerond. In het <em>Cumulatief Stroomdiagram (CFD)</em> zie je de hellingen van de vlakken mooi parallel aan elkaar omhoog lopen." },
        { max: 120, class: 'warn', text: "De stabiliteitsindex is aan de hoge kant. Jullie ronden structureel meer werk af dan er nieuw binnenkomt. Jullie zijn de backlog actief aan het verkleinen (convergerend CFD)." },
        { max: 9999, class: 'warn', text: "Jullie zijn in een extreme backlog-schoonmaak beland. Er wordt véél meer gesloten dan aangemaakt. Dit gebeurt vaak aan het eind van een jaar of wanneer de Product Owner irrelevante tickets bulk-sluit." }
    ]
};

window.l_generateAdvice = function(metrics) {
    if (!metrics || Object.keys(metrics).length === 0) return "";

    const c = window.LUCAS_ADVICE_CONFIG;
    let adviesTeksten = [];
    let actiePunten = [];
    const dta = (typeof l_state !== 'undefined' && l_state.filtered) ? l_state.filtered : [];
    const jUrl = window.LUCAS_JIRA_URL || "";

    // Lokale formatter zodat advies.js niet afhankelijk is van de globale fDay uit dashboard.js.
    const _fDay = (typeof fDay === 'function') ? fDay : (v => (v === null || isNaN(v)) ? '–' : (v < 1 ? `${Math.round(v*24)}u` : `${v.toFixed(1)}d`));

    const getAdvice = (val, configArray) => {
        if (val === null || isNaN(val)) return null;
        for (let i = 0; i < configArray.length; i++) {
            if (val <= configArray[i].max) return { ...configArray[i] };
        }
        return null;
    };

    const getWorst = (arr, field) => {
        const valid = arr.filter(x => x[field] !== null && !isNaN(x[field]));
        if(!valid.length) return null;
        return valid.reduce((max, obj) => (obj[field] > max[field] ? obj : max));
    };

    const tLink = (key) => jUrl ? `<a href="${jUrl}/browse/${key}" target="_blank" style="color:#0052CC; text-decoration:none; font-weight:600;">${key}</a>` : `<strong>${key}</strong>`;

    let st = getAdvice(metrics.stabPct, c.stability);
    let lt = getAdvice(metrics.ltP85, c.leadTime);
    let ct = getAdvice(metrics.ctP85, c.cycleTime);
    let fe = getAdvice(metrics.feAvg, c.flowEff);
    let cv = getAdvice(metrics.cvPct, c.consistency);

    if (lt && (lt.max >= 30)) {
        const worstLt = getWorst(dta, 'lt');
        if (worstLt) {
            const assT = (worstLt.assignee && worstLt.assignee !== "Onbekend") ? `(toegewezen aan <strong>${worstLt.assignee}</strong>)` : `(momenteel aan niemand toegewezen)`;
            lt.text += ` Kijk maar eens in de grafieken naar issue ${tLink(worstLt.key)} ${assT}. Dit specifieke issue had een totale doorlooptijd van maar liefst ${Math.round(worstLt.lt)} dagen.`;
        }
    }

    if (ct && (ct.max >= 14)) {
        const worstCt = getWorst(dta, 'ct');
        if (worstCt) {
            const assT = (worstCt.assignee && worstCt.assignee !== "Onbekend") ? `(${worstCt.assignee})` : `(onbeheerd)`;
            ct.text += ` Een pijnlijk voorbeeld hiervan is issue ${tLink(worstCt.key)} ${assT}, waar daadwerkelijk ${Math.round(worstCt.ct)} dagen actief aan gewerkt is nádat het op 'In Progress' werd gezet.`;
        }
    }

    if (fe && (fe.max <= 20)) {
        const worstFe = getWorst(dta, 'qt'); 
        if (worstFe) {
            fe.text += ` Issue ${tLink(worstFe.key)} lag bijvoorbeeld ${Math.round(worstFe.qt)} dagen simpelweg in de backlog of in een review-kolom te wachten op actie.`;
        }
    }

    if (st) adviesTeksten.push(st.text);
    if (lt) adviesTeksten.push(lt.text);
    if (ct) adviesTeksten.push(ct.text);
    if (fe) adviesTeksten.push(fe.text);
    if (cv) adviesTeksten.push(cv.text);

    if (dta.length > 0) {
        if (metrics.stabPct < 85) {
            actiePunten.push(`<strong>Backlog weigering:</strong> Kijk samen met de PO naar de instroom. Plan een sessie om de instroom tijdelijk te bevriezen totdat jullie de openstaande berg werk in het CFD hebben afgebouwd.`);
        }

        const totalSp = dta.reduce((acc, issue) => acc + (issue.sp || 0), 0);
        if (totalSp === 0) {
            actiePunten.push(`<strong>Refinement dialoog:</strong> Het team heeft 0 Story Points geregistreerd. Dit kan een bewuste keuze zijn (bijv. de <em>#NoEstimates</em> filosofie). Realiseer je wel dat het schatten van een issue (Planning Poker) vaak een uitstekend middel is om het gesprek over de inhoud en complexiteit te forceren. Vaak ontdek je dán pas onuitgesproken aannames, wat de refinement veel scherper maakt. Weet wat je mist! <a href='https://www.agilealliance.org/glossary/planning-poker/' target='_blank' style='color:#0052CC; text-decoration:none;'>[Meer over Planning Poker]</a>`);
        }

        const bugs = dta.filter(d => d.t === 'Bug').length;
        if (bugs === 0) {
            actiePunten.push(`<strong>Kwaliteit registreren:</strong> Er zijn 0 bugs gevonden in de dataset. Ga herstelwerk, fouten of incidenten expliciet als 'Bug' registreren in Jira. Alleen zo krijgen jullie eerlijk inzicht in de MTTR (Mean Time To Repair) en zien jullie in de grafieken de verhouding tussen nieuwe waarde bouwen vs. onderhoud.`);
        }

        const rr = dta.filter(d => d.isD && d.df && d.dl); 
        if (rr.length > 5) {
            const rw = rr.filter(x => x.rs > 0);
            const rt = (rw.length / rr.length) * 100;
            if (rt > 20) {
                actiePunten.push(`<strong>Kwaliteit aan de poort:</strong> Het <em>'First Time Right'</em> percentage is laag. Bij ${Math.round(rt)}% van de tickets is na de eerste oplevering nógmaals aan de code gewerkt (Rework/Pingpongen). Bespreek tijdens de retro de test-strategie en jullie <em>Definition of Done</em>. <a href='https://www.agilealliance.org/glossary/definition-of-done/' target='_blank' style='color:#0052CC; text-decoration:none;'>[Lees meer over de DoD]</a>`);
            } else if (rt === 0 && rr.length > 10) {
                adviesTeksten.push("<strong>First Time Right:</strong> Bij de afgeronde issues is in dit dashboard 0% rework gemeten. Tickets worden schijnbaar in één keer goed afgeleverd zonder heen-en-weer gepingpong tussen test en development. Vakwerk!");
            }
        }

        const bejaarden = dta.filter(d => d.c && d.r && (d.r.getTime() - d.c.getTime()) / 86400000 > 100).sort((a,b) => (b.r.getTime() - b.c.getTime()) - (a.r.getTime() - a.c.getTime()));
        if (bejaarden.length > 0) {
            const oudste = bejaarden[0];
            const dagen = Math.round((oudste.r.getTime() - oudste.c.getTime()) / 86400000);
            const actieWie = (oudste.assignee && oudste.assignee !== "Onbekend") ? `direct met <strong>${oudste.assignee}</strong>` : `met het hele team`;
            actiePunten.push(`<strong>Blokkades oplossen:</strong> Issue ${tLink(oudste.key)} heeft maar liefst ${dagen} dagen in het systeem gehangen. Bespreek tijdens de retro ${actieWie} hoe deze taak aan de radar kon ontsnappen en hoe dit in de toekomst voorkomen kan worden.`);
        }

        const workerCounts = {};
        let totalAssigned = 0;
        dta.forEach(d => {
            if(d.assignee && d.assignee !== "Onbekend" && !d.assignee.includes("GROUP:")) {
                workerCounts[d.assignee] = (workerCounts[d.assignee] || 0) + 1;
                totalAssigned++;
            }
        });
        const workers = Object.entries(workerCounts).sort((a,b) => b[1] - a[1]);
        if (workers.length >= 3 && totalAssigned > 10) {
            const topWorker = workers[0];
            const pct = (topWorker[1] / totalAssigned) * 100;
            if (pct > 40) {
                actiePunten.push(`<strong>Werk herverdelen:</strong> Uit de data blijkt dat <strong>${topWorker[0]}</strong> betrokken is bij bijna de helft (${Math.round(pct)}%) van alle tickets. Dit creëert een enorme bottleneck (Key Person Risk). Bespreek in de retro hoe andere teamleden kennis of repeterende taken actief kunnen overnemen.`);
            }
        }
    }


    // --- HTML OPBOUW ---
    let html = `<div style="background:#FFFFFF; border:1px solid #DFE1E6; border-radius:6px; padding:24px; margin-bottom:24px; box-shadow:0 1px 3px rgba(9,30,66,.12);">
        <h3 style="margin-top:0; color:#172B4D; font-size:16px; margin-bottom:16px; font-weight:600;">
            Team advies
        </h3>`;

    if (adviesTeksten.length === 0) {
        html += `<p style="margin:0; font-size:13px; color:#42526E;"><em>Er is momenteel onvoldoende afgeronde data beschikbaar om een betrouwbaar team advies te formuleren.</em></p>`;
    } else {
        const hasActions = actiePunten.length > 0;
        
        if (hasActions) {
            html += `<div class="l-grid-2" style="margin-bottom:0; font-size:13px; color:#42526E; line-height:1.7;">`;
        } else {
            html += `<div style="font-size:13px; color:#42526E; line-height:1.7;">`;
        }

        html += `<div>`;
        adviesTeksten.forEach((tekst) => {
            html += `<p style="margin-top:0; margin-bottom:14px;">${tekst}</p>`;
        });
        html += `</div>`;

        if (hasActions) {
            html += `<div>
                <div style="height:100%; box-sizing:border-box;">
                    <strong style="display:block; color:#172B4D; margin-bottom:12px; font-size:14px;">Voorgestelde acties voor de retro:</strong>
                    <ul style="margin:0; padding-left:20px; color:#42526E;">`;
            actiePunten.forEach(actie => {
                html += `<li style="margin-bottom:10px;">${actie}</li>`;
            });
            html += `       </ul>
                </div>
            </div>`;
        }

        html += `</div>`;
    }

    html += `</div>`;
    return html;
};