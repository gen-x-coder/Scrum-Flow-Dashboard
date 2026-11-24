/*! Radix — MIT License; see LICENSE. Copyright (c) Lucas Bonsel. */
// Pure team-level observations. No identity fields, network calls, storage or scoring.
const RadixAdvice = (() => {
    const finite = v => Number.isFinite(v) && v >= 0;
    const pct = (n,d) => d ? Math.round(100*n/d) : null;
    const q = (a,p) => {const s=[...a].sort((x,y)=>x-y);const i=(s.length-1)*p;return s.length?s[Math.floor(i)]+(s[Math.ceil(i)]-s[Math.floor(i)])*(i-Math.floor(i)):null;};
    const fmt = x => x.toFixed(1).replace('.',',');
    function inspect(rows,{from,now=new Date(),diff,unit='dagen'}={}) {
        const done=rows.filter(r=>r.isD), open=rows.filter(r=>!r.isD), notes=[];
        const add=(title,fact,limit,question,experiment)=>notes.push({title,fact,limit,question,experiment});
        if(!rows.length){add('Geen gegevens','De huidige selectie is leeg.','Er is geen basis voor een observatie.','Klopt de gekozen periode en het filter?','Controleer de selectie.');return notes;}
        const ct=done.filter(r=>finite(r.ct)), fe=done.filter(r=>finite(r.fe)&&r.fe<=100), lt=done.filter(r=>finite(r.lt));
        const qt=rows.filter(r=>finite(r.qt));
        add('Meetdekking',`${done.length} afgerond; LT ${lt.length}/${done.length}, CT ${ct.length}/${done.length}, FE ${fe.length}/${done.length}; QT ${qt.length}/${rows.length} geselecteerde issues. ${ct.filter(r=>r.startSource==='subtask').length} CT-metingen via subtaken.`, 'Ontbrekende waarden zijn geen nulwaarden. De meetbare subset is mogelijk niet representatief.', 'Herkennen we de geregistreerde startmomenten in onze manier van werken?', 'Bekijk samen enkele workflowvoorbeelden en spreek af wanneer werk echt gestart is.');
        if(ct.length>=10){const vals=ct.map(r=>r.ct), p50=q(vals,.5),p85=q(vals,.85);add('Variatie in Cycle Time',`P50 ${fmt(p50)} ${unit}; P85 ${fmt(p85)} ${unit} (n=${ct.length}).`, 'Alle geldige waarden, geen uitschieterfilter; geen norm of voorspelling voor één issue.', 'Welke omstandigheden verklaren het verschil tussen kort en lang lopend werk?', 'Onderzoek werksoorten, afhankelijkheden en opsplitsing in een retrospective.');}
        if(qt.length>=10){add('Wachten vóór de start',`Mediane Queue Time ${fmt(q(qt.map(r=>r.qt),.5))} ${unit} (n=${qt.length}, inclusief open werk).`,'Werk zonder bekende start ontbreekt; dit meet niet alle wachttijd.', 'Wanneer wordt werk aangemaakt en wanneer willen we het oppakken?', 'Onderzoek de afspraken rond instroom en gereedheid.');}
        if(fe.length>=10){add('Tijd in actieve statussen',`Gemiddeld ${fmt(fe.reduce((s,r)=>s+r.fe,0)/fe.length)}% (n=${fe.length}/${done.length}).`,'Jira In Progress kan ook wachten of review omvatten; dit is geen meting van daadwerkelijke arbeid.', 'Welke statussen bevatten wachttijd of overdrachten?', 'Breng met het team de betekenis van de workflowstatussen in kaart.');}
        if(ct.length>=10&&typeof diff==='function') {const p85=q(ct.map(r=>r.ct),.85), aging=open.filter(r=>r.currentCategory==='progress'&&r.startSource==='history'&&r.ds).map(r=>diff(r.ds,now)).filter(finite); if(aging.length)add('Leeftijd van lopend werk',`${aging.filter(v=>v>p85).length}/${aging.length} meetbare actieve issues zijn ouder dan de historische CT-P85 (${fmt(p85)} ${unit}).`,'Vergelijking met afgerond werk; geen deadline of bewijs van blokkade. Alleen directe startdatums.', 'Welke lopende werkzaamheden verdienen gezamenlijk aandacht?', 'Bespreek ouder werk in de Daily Scrum en onderzoek welke hulp mogelijk is.');}
        if(from instanceof Date&&Number.isFinite(+from)&&+from<+now){const inflow=rows.filter(r=>r.c&&r.c>=from&&r.c<=now).length,outflow=done.filter(r=>r.r&&r.r>=from&&r.r<=now).length;add('Instroom en afronding',`${inflow} aangemaakt, ${outflow} afgerond binnen de periode; verschil ${inflow-outflow}.`,'Alleen huidige selectie, geen historisch bordlidmaatschap; geen bewijs van een groeiende of krimpende totale backlog.', 'Hoe verhouden nieuwe vraag en afronding zich tot onze afspraken?', 'Inspecteer instroom en throughput over vergelijkbare perioden.');}
        const rr=done.filter(r=>Number.isInteger(r.reopened)&&r.reopened>=0);if(rr.length>=10){const n=rr.filter(r=>r.reopened>0).length;add('Heropeningen',`${n}/${rr.length} meetbare afgeronde issues zijn minstens eenmaal heropend (${pct(n,rr.length)}%).`,'Heropening is niet automatisch een kwaliteitsprobleem en meet niet alle rework.', 'Wat waren de verschillende redenen om werk te heropenen?', 'Onderzoek samen of acceptatiecriteria, veranderde wensen of workflowafspraken een rol spelen.');}
        return notes;
    }
    return {inspect};
})();
