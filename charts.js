/*! Radix — MIT License; see LICENSE. Copyright (c) Lucas Bonsel. */
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

function l_tks(m, h, t) { const s=Math.max(1,Math.ceil(m/5)), r=[]; for(let v=0;v<=m;v+=s) r.push({v, y:t+h*(1-v/m)}); return r; }

function radixChartLegend(id, entries) {
    const el=l_get(id);if(!el)return;el.replaceChildren();
    for(const [label,color,kind] of entries){const item=document.createElement("span"),mark=document.createElement("i");
        if(kind==="line"||kind==="dash"){mark.style.cssText=`width:18px;height:0;border-radius:0;border-top:2px ${kind==="dash"?"dashed":"solid"} ${color}`;}else{mark.style.backgroundColor=color;if(kind==="dot")mark.style.borderRadius="50%";}
        item.append(mark,document.createTextNode(label));el.append(item);}
}

function l_noData(ctx, w, h) {
    ctx.fillStyle = "#172B4D"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; 
    ctx.fillText("Onvoldoende data voor deze grafiek", w / 2, h / 2 - 8);
    ctx.fillStyle = "#6B778C"; ctx.font = "11px sans-serif"; 
    ctx.fillText("Geen bruikbare gegevens in de gekozen databron", w / 2, h / 2 + 10);
}

window.drawAllCharts = function() {
    const dta = l_state.filtered;
    radixChartLegend('scat-legend',[]);radixChartLegend('cfd-legend',[]);
    if(!dta || dta.length === 0) { for(const id of ['cv-hist','cv-scat','cv-thru','cv-cfd']) {const ctx=l_ctx(id); if(ctx) l_noData(ctx,ctx._w,ctx._h);} return; }
    
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
        const filterDate = l_get('l_dat') && l_get('l_dat').value ? new Date(l_get('l_dat').value+'T00:00:00').getTime() : new Date('2000-01-01').getTime();
        
        let sP = dta.filter(d=>d[keyScat]!==null&&!isNaN(d[keyScat])&&d.r).map(d=>({v:d[keyScat],t:d.r.getTime(),type:d.t,c:l_col(d.t)}));
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
            const mT = Math.min(minTraw, Math.max(filterDate, minTraw - 86400000));
            const xT = Math.max(sP.reduce((max, p) => p.t > max ? p.t : max, 0), Date.now());
            const mV = Math.max(sP.reduce((max, p) => p.v > max ? p.v : max, 0)) * 1.1 || 10;
            
            const xO=t=>40+((t-mT)/(xT-mT||1))*(Math.max(1,sW-86)), yO=v=>20+(1-v/mV)*(sH-50), tk=l_tks(mV,sH-50,20);
            
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

            const legend=[...new Set(sP.map(p=>p.type))].sort().map(type=>[type,l_col(type),'dot']);
            if(validSprints.some(s=>{const t=+new Date(s.completeDate||s.endDate);return t>=mT&&t<=xT;}))legend.push(['Einde sprint','#6554C0','line']);
            if(realP85!==null&&realP85<=mV)legend.push([`P85 (${fDay(realP85)})`,'#FF5630','dash']);
            radixChartLegend('scat-legend',legend);
            if(realP85 !== null && realP85 <= mV){ 
                sc.beginPath(); sc.moveTo(35,yO(realP85)); sc.lineTo(sW-46,yO(realP85)); 
                sc.strokeStyle="#FF5630"; sc.setLineDash([5,5]); sc.stroke(); sc.setLineDash([]); 
                

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
        const srtGrps = groupItemsByPeriod(dn, pD, false);
        const subtitle=tc.canvas.parentElement.querySelector(".c-sub");
        if(subtitle)subtitle.textContent="Afgesloten issues per "+(srtGrps.mode||"periode")+" · inclusief nulperioden"+(srtGrps.some(b=>b.kind==='partial')?"; * onvolledig":"")+(srtGrps.some(b=>b.kind==='gap')?"; † tussen sprints":"");
        if(srtGrps.length){
            const srt = srtGrps.sort((a,b)=>a.d - b.d);
            const ts = srt.map(b => b._total);
            tc.canvas.setAttribute("aria-label",`Throughput: ${ts.reduce((a,b)=>a+b,0)} afgesloten issues over ${srt.length} getoonde perioden.`);
            const mC = Math.max(...ts,1)*1.1;
            const tk = l_tks(mC,tH-50,20);
            
            tc.fillStyle="#6B778C"; tc.font="11px sans-serif"; tc.textAlign="right";
            tk.forEach(t=>{ tc.fillText(Math.round(t.v), 25, t.y); tc.beginPath(); tc.moveTo(30,t.y); tc.lineTo(tW,t.y); tc.strokeStyle="#DFE1E6"; tc.stroke(); });
            
            const st=(tW-35)/srt.length, bw=Math.max(1,st*0.8);
            srt.forEach((b,i)=>{ 
                let sy=tH-30, x=32+i*st+(st-bw)/2; 
                Object.entries(b.t).forEach(([t,c])=>{ 
                    const h=(c/mC)*(tH-50); 
                    tc.fillStyle=l_col(t); tc.globalAlpha=b.kind==='gap'||b.kind==='partial'?.55:1; 
                    tc.fillRect(x,sy-h,Math.max(1, bw),h); 
                    sy-=h; tc.globalAlpha=1; 
                }); 
            });
            
            tc.textAlign="center"; tc.fillStyle="#6B778C";
            const stepX = Math.max(1, Math.ceil(srt.length / 6));
            for(let i=0; i<srt.length; i+=stepX) {
                if(srt[i] && srt[i].d) tc.fillText(srt[i].d.toLocaleDateString("nl-NL",{day:"numeric",month:"short"})+(srt[i].kind==='gap'?' †':srt[i].kind==='partial'?' *':''), 32+i*st+st/2, tH-12);
            }
        } else {
            l_noData(tc, tW, tH);
        }
    }

    const cc=l_ctx('cv-cfd');
    if(cc){
        const from=new Date((l_get('l_dat')?.value||'2000-01-01')+'T00:00:00'), to=new Date();
        const {eligible,points}=RadixWorkflow.cfd(dta,from,to);
        const note=l_get('cfd-quality');if(note)note.textContent=`${eligible}/${dta.length} issues met reconstrueerbare historie · Huidige selectie, geen historisch bordlidmaatschap.`;
        const w=cc._w,h=cc._h;cc.clearRect(0,0,w,h);
        if(!eligible||!points.length){l_noData(cc,w,h);return;}
        const max=Math.max(1,...points.map(p=>p.todo+p.progress+p.done)), x=i=>40+i/Math.max(1,points.length-1)*Math.max(1,w-86), y=v=>20+(1-v/max)*(h-50);
        radixChartLegend('cfd-legend',[['To Do','#FFAB00'],['In Progress','#4C9AFF'],['Done','#36B37E']]);
        const layers=[['done','#36B37E'],['progress','#4C9AFF'],['todo','#FFAB00']];let bottom=points.map(()=>0);
        for(const [key,color] of layers){const top=points.map((p,i)=>bottom[i]+p[key]);cc.beginPath();top.forEach((v,i)=>i?cc.lineTo(x(i),y(v)):cc.moveTo(x(i),y(v)));for(let i=bottom.length-1;i>=0;i--)cc.lineTo(x(i),y(bottom[i]));cc.closePath();cc.fillStyle=color;cc.fill();bottom=top;}
        cc.fillStyle='#6B778C';cc.font='11px sans-serif';cc.textAlign='right';for(let i=0;i<=4;i++){const v=Math.round(max*i/4);cc.fillText(v,34,y(v));}
        cc.textAlign='center';for(let i=0;i<=4;i++){const j=Math.round((points.length-1)*i/4);cc.fillText(new Date(points[j].time).toLocaleDateString('nl-NL',{month:'short',year:'2-digit'}),x(j),h-12);}
    }
};
