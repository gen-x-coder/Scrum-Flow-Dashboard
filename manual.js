window.LUCAS_MANUAL_CONTENT = `
<style>
    /* Styling speciaal voor de Handleiding Modal */
    .m-form-box { background: #091E42; color: #ABF5D1; padding: 12px 16px; border-radius: 4px; font-family: monospace; font-size: 13px; margin: 10px 0; border-left: 4px solid #36B37E; }
    .m-form-lbl { font-family: sans-serif; font-size: 10px; text-transform: uppercase; color: rgba(255,255,255,0.6); display: block; margin-bottom: 4px; letter-spacing: 0.05em; }
    .m-req { font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 16px; margin-bottom: 4px; color: #6B778C; letter-spacing: 0.05em; }
    .m-badge { display: inline-block; padding: 2px 6px; background: #EBECF0; color: #42526E; border-radius: 3px; font-size: 11px; font-family: monospace; margin-right: 4px; border: 1px solid #DFE1E6; }
    .m-faq h4 { margin-top: 16px; margin-bottom: 4px; color: #172B4D; font-size: 14px; }
    .m-faq p { margin-top: 0; font-size: 13px; color: #6B778C; line-height: 1.5; }
    .man-section { margin-bottom: 30px; padding-top: 15px; border-top: 1px solid #DFE1E6; }
    .man-section ul { margin-top: 5px; padding-left: 20px; color: #42526E; }
    .man-section li { margin-bottom: 6px; }
    .man-subtit { color: #172B4D; font-size: 14px; font-weight: 600; margin-top: 20px; margin-bottom: 8px; }
</style>

<div id="man-intro" style="margin-bottom: 30px;">
    <h2 style="margin-top:0; color:#0052CC; font-size: 20px;">Scrum Flow Dashboard Handleiding</h2>
    <p style="color:#42526E;">Dit dashboard visualiseert hoe werk door jullie systeem stroomt op basis van data uit Jira. Het helpt knelpunten te identificeren, bevat een intelligente 'Agile Coach' (Team Advies), en vergroot jullie voorspelbaarheid met behulp van wiskundige Flow Metrics.</p>
    
    <div style="background:#F4F5F7; border:1px solid #DFE1E6; padding:15px; border-radius:4px; margin-top:15px;">
        <strong style="display:block; margin-bottom:10px; color:#172B4D;">Legenda van Issue Typen (Kleuren)</strong>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:13px; color:#42526E;">
            <div style="display:flex; align-items:center;"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:{{C_STORY}}; margin-right:8px;"></span><strong>Verhalen (Story)</strong> &nbsp;- Reguliere productwaarde</div>
            <div style="display:flex; align-items:center;"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:{{C_BUG}}; margin-right:8px;"></span><strong>Bugs (Defect)</strong> &nbsp;- Herstelwerkzaamheden</div>
            <div style="display:flex; align-items:center;"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:{{C_TASK}}; margin-right:8px;"></span><strong>Taken (Task)</strong> &nbsp;- Subtaken / technische taken</div>
            <div style="display:flex; align-items:center;"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:{{C_EPIC}}; margin-right:8px;"></span><strong>Epics</strong> &nbsp;- Grote brokken werk</div>
            <div style="display:flex; align-items:center;"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:{{C_SPIKE}}; margin-right:8px;"></span><strong>Spikes</strong> &nbsp;- Onderzoek / Exploratie</div>
            <div style="display:flex; align-items:center;"><span style="display:inline-block; width:12px; height:12px; border-radius:50%; background:{{C_OTHER}}; margin-right:8px;"></span><strong>Overig</strong> &nbsp;- Onbekende typen</div>
        </div>
    </div>
</div>

<h2 style="color:#172B4D; font-size: 18px; margin-bottom: 0;">1. Metrieken Uitgelegd</h2>
<p style="color:#6B778C; font-size:13px; margin-top:4px; margin-bottom:20px;">Hoe worden de metrics berekend en wat vertellen ze ons?</p>

<div class="man-section" id="man-lt">
    <h3 style="color:#0052CC; margin-top:0;">Lead Time (Doorlooptijd)</h3>
    <div class="m-form-box">
        <span class="m-form-lbl">Formule</span>
        Lead Time = Opgelost − Aangemaakt
    </div>
    <p style="color:#42526E;">De leadtime is de totale tijd die een issue in het systeem heeft gezeten. Het omvat <em>alles</em>: wachten in de backlog, development, reviews en deploys.</p>
    <div class="m-req">Interpretatie</div>
    <ul>
        <li>De leadtime sluit het meest aan bij wat de klant ervaart: hoe lang duurt het nadat iets gevraagd wordt tot het is opgeleverd?</li>
        <li>Gebruik het 85e percentiel (P85) voor Service Level Expectations: <em>"We weten voor 85% zeker dat een verzoek binnen X dagen na aanmaken in productie staat."</em></li>
    </ul>
</div>

<div class="man-section" id="man-ct">
    <h3 style="color:#0052CC; margin-top:0;">Cycle Time (Bewerkingstijd)</h3>
    <div class="m-form-box">
        <span class="m-form-lbl">Formule</span>
        Cycle Time = Opgelost − Dev Start
    </div>
    <p style="color:#42526E;">De cycletime meet de actieve verwerkingstijd: vanaf het moment dat iemand daadwerkelijk aan het issue begint ('In Progress') tot het moment van oplevering. Dit is de tijdsduur die het team direct beïnvloedt.</p>
    <div class="m-req">Interpretatie</div>
    <ul>
        <li>Een lage cycletime met een hoge leadtime betekent dat het team razendsnel ontwikkelt, maar dat de prioriteiten of wachtrijen het proces in de weg zitten (hoge Queue Time).</li>
    </ul>
</div>

<div class="man-section" id="man-qt">
    <h3 style="color:#0052CC; margin-top:0;">Queue Time (Wachttijd)</h3>
    <div class="m-form-box">
        <span class="m-form-lbl">Formule</span>
        Queue Time = Dev Start − Aangemaakt
    </div>
    <p style="color:#42526E;">De queue time is zuivere wachttijd aan de voorkant van het proces: het issue wacht in de backlog totdat iemand er aan begint.</p>
</div>

<div class="man-section" id="man-rs">
    <h3 style="color:#0052CC; margin-top:0;">Rework Rate (Release Stabilisatie)</h3>
    <div class="m-form-box">
        <span class="m-form-lbl">Formule</span>
        Release Stabilisatie = Dev End (Laatste keer) − Dev End (Eerste keer)
    </div>
    <p style="color:#42526E;">Als deze tijd groter is dan 0, betekent dit dat de code is afgekeurd in de test- of reviewfase en is 'teruggepingpongd' naar Development. Een lage Rework Rate betekent een hoge <em>First Time Right</em> kwaliteit.</p>
</div>

<div class="man-section" id="man-fe">
    <h3 style="color:#0052CC; margin-top:0;">Flow Efficiency</h3>
    <div class="m-form-box">
        <span class="m-form-lbl">Formule</span>
        Flow Efficiency = (Cycle Time / Lead Time) * 100%
    </div>
    <p style="color:#42526E;">Dit percentage onthult hoe vaak een ticket stilstond versus hoe vaak er actief aan werd gewerkt. De meeste softwareteams zitten op 15–30% (wat in de IT als normaal wordt beschouwd). Boven de 40% is uitstekend.</p>
</div>

<h2 style="color:#172B4D; font-size: 18px; margin-top: 40px; margin-bottom: 0;">2. Team Indicatoren & Coach</h2>
<p style="color:#6B778C; font-size:13px; margin-top:4px; margin-bottom:20px;">Indicatoren op teamniveau over de stabiliteit en voorspelbaarheid.</p>

<div class="man-section" id="man-coach">
    <h3 style="color:#0052CC; margin-top:0;">Team Advies (Agile Coach)</h3>
    <p style="color:#42526E;">Dit dashboard bevat een geautomatiseerde coach-module. Deze module leest alle wiskundige modellen uit en vergelijkt jullie prestaties met wereldwijde standaarden (zoals de DORA metrics en Actionable Agile). Onder het blok vind je concrete voorgestelde actiepunten voor je retrospectief, inclusief directe linkjes naar tickets die als bottleneck fungeerden.</p>
</div>

<div class="man-section" id="man-cv">
    <h3 style="color:#0052CC; margin-top:0;">Consistentie (CV)</h3>
    <p style="color:#42526E;">De Coefficient of Variation (CV) meet hoe voorspelbaar jullie werk is. Is het percentage onder de 30% (Groen)? Dan lossen jullie items in uiterst voorspelbare, gelijke brokken op (perfecte refinement). Boven de 80% (Rood)? Dan is er enorme willekeur en onverwacht werk.</p>
</div>

<div class="man-section" id="man-vel">
    <h3 style="color:#0052CC; margin-top:0;">Voorspelling (Monte Carlo)</h3>
    <p style="color:#42526E;">In plaats van een simpel (en onbetrouwbaar) gemiddelde, gebruikt dit dashboard een <strong>Monte Carlo simulatie</strong>. De software draait op de achtergrond 10.000 gesimuleerde sprints op basis van jullie eigen historische afgeronde werk (Throughput).<br><br>Vervolgens geeft het harde wiskundige garanties: <em>"We weten voor 85% zeker dat we komende sprint minimaal 17 issues afkrijgen."</em> Om dit te berekenen, kijkt het algoritme naar het 15e percentiel (P15) van alle negatieve scenario's. Gebruik dít getal om de sprint backlog veilig te vullen!</p>
</div>

<div class="man-section" id="man-stab">
    <h3 style="color:#0052CC; margin-top:0;">Stabiliteits Index (Inflow vs Outflow)</h3>
    <p style="color:#42526E;">Vergelijkt de hoeveelheid gecreëerd werk (Inflow) met afgerond werk (Outflow).</p>
    <ul>
        <li><strong>Onder 85% (Rood):</strong> Meer aanvoer dan afvoer. Het team accepteert meer werk dan het aankan. De backlog groeit dicht.</li>
        <li><strong>Rond 100% (Groen):</strong> Gezond evenwicht (Aanvoer ≈ Afvoer).</li>
        <li><strong>Boven 115% (Oranje):</strong> Het team is actief oude backlog aan het afronden of opruimen.</li>
    </ul>
</div>

<h2 style="color:#172B4D; font-size: 18px; margin-top: 40px; margin-bottom: 0;">3. Dashboard Instellingen</h2>
<p style="color:#6B778C; font-size:13px; margin-top:4px; margin-bottom:20px;">Via de knop 'Instellingen' rechtsboven kun je de berekeningen finetunen.</p>

<div class="man-section" id="man-settings">
    <div class="man-subtit">Dagtelling & Feestdagen</div>
    <p style="color:#42526E;">Standaard rekent het dashboard in Kalenderdagen (aanbevolen in Agile/Kanban, omdat de wachttijd voor een klant in het weekend ook doortikt). Je kunt overschakelen naar <strong>Werkdagen</strong> (maandag t/m vrijdag). In het grote tekstvak ernaast kun je bovendien specifieke feestdagen invullen (bijv. <code>2025-12-25</code>, elke datum op een nieuwe regel) die dan óók van de rekensom afgetrokken worden.</p>

    <div class="man-subtit">Uitschieters uitsluiten (Outliers)</div>
    <p style="color:#42526E;">Stel, je team rondt een ticket af dat letterlijk 1900 dagen weggestopt in de backlog heeft gelegen. Zo'n anomalie ('fossiel') trekt direct al je gemiddelden scheef en maakt je grafieken onleesbaar omdat de schaal enorm wordt uitgerekt.</p>
    <ul style="margin-bottom:15px;">
        <li><strong>Uitgeschakeld:</strong> Alle pure data wordt getoond.</li>
        <li><strong>Boven P95 / P90:</strong> Het script berekent per metric de 95% of 90% snelste tickets. De traagste tickets worden genegeerd en uit de berekening gehaald. Dit haalt ruis weg, maar pas op: je verbloemt hiermee wel een deel van de realiteit!</li>
        <li><strong>Boven P99 (Alleen extremen):</strong> Als deze optie geselecteerd is, haal je uitsluitend de extreemste 1% van je uitschieters (de echte fouten/fossielen) weg, terwijl de normale vertragingen zichtbaar blijven. Dit is vaak de veiligste optie.</li>
    </ul>

    <div class="man-subtit">Weergave Opties</div>
    <p style="color:#42526E;">Hebben jullie een volwassen team dat de metrics zelf uitstekend snapt? Dan kun je met het vinkje <strong>"Verberg Team Advies blok"</strong> de geautomatiseerde Agile Coach uitschakelen voor een compacter dashboard.</p>

    <div class="man-subtit">Teamgroepen (Privacy by Design)</div>
    <p style="color:#42526E;">Zitten er analisten, testers en ontwikkelaars op één bord en wil je alleen statistieken zien voor een specifieke rol? Typ onder 'Teamgroepen' een naam (bijv. <em>Ontwikkelaars</em>), vink de juiste personen aan en klik op Maken. Deze groep verschijnt nu direct in je filter-dropdown bovenaan het dashboard.<br><br>
    Je kunt jouw aangemaakte groepen delen met collega's via de <strong>Export</strong> knop. Om de privacy (AVG) te waarborgen, zitten in het geëxporteerde bestand <em>geen namen</em>, maar uitsluitend wiskundig versleutelde hashes (zoals <code>1k3x9a</code>). Je kunt dit kleine json-bestand dus 100% veilig op Confluence plaatsen, waarna je collega's het lokaal kunnen <strong>Importeren</strong>.</p>
</div>

<h2 style="color:#172B4D; font-size: 18px; margin-top: 40px; margin-bottom: 0;">4. Grafieken Lezen</h2>
<p style="color:#6B778C; font-size:13px; margin-top:4px; margin-bottom:20px;">Interactieve grafieken om knelpunten te spotten.</p>

<div class="man-section" id="man-cfd">
    <h3 style="color:#0052CC; margin-top:0;">Cumulatief Stroomdiagram (CFD)</h3>
    <p style="color:#42526E;">Dit is de krachtigste grafiek in het dashboard. Het is een <em>cumulatieve</em> grafiek, wat betekent dat hij <strong>altijd stijgt</strong> en nooit daalt. Het toont de absolute optelsom van jullie werk over de gekozen periode.</p>
    
    <strong style="display:block; margin-bottom:8px; color:#172B4D;">Wat betekenen de kleuren?</strong>
    <ul style="margin-top:0;">
        <li><span style="display:inline-block; width:12px; height:12px; background:#DFE1E6; margin-right:6px;"></span><strong>Lichtgrijs (Aangemaakt):</strong> Het werk is toegevoegd aan het systeem.</li>
        <li><span style="display:inline-block; width:12px; height:12px; background:#B3D4FF; margin-right:6px;"></span><strong>Lichtblauw (Sprint Start):</strong> Het werk is gecommitteerd voor de iteratie.</li>
        <li><span style="display:inline-block; width:12px; height:12px; background:#4C9AFF; margin-right:6px;"></span><strong>Helderblauw (Ontwikkeling):</strong> Het werk staat in progress.</li>
        <li><span style="display:inline-block; width:12px; height:12px; background:#ABF5D1; margin-right:6px;"></span><strong>Lichtgroen (Dev Klaar):</strong> Code klaar, wachten op test/review.</li>
        <li><span style="display:inline-block; width:12px; height:12px; background:#36B37E; margin-right:6px;"></span><strong>Groen (Stabilisatie):</strong> Volledig gecheckt, wachten op deploy.</li>
        <li><span style="display:inline-block; width:12px; height:12px; background:#172B4D; margin-right:6px;"></span><strong>Donkerblauw (Afronding):</strong> Volledig afgerond / Done.</li>
    </ul>

    <strong style="display:block; margin-top:15px; margin-bottom:8px; color:#172B4D;">Hoe lees je hem? Twee vuistregels:</strong>
    <ol>
        <li><strong>Dikte van de band = Hoeveelheid werk (WIP):</strong> Als de helderblauwe band (Ontwikkeling) steeds dikker wordt naar rechts toe, betekent dit dat jullie aan steeds meer tickets tegelijk werken (filevorming).</li>
        <li><strong>Lopen de randen parallel? = Stabiel:</strong> Als de bovenste rand van het grijze vlak net zo schuin omhoog loopt als de donkerblauwe berg onderin, blijft de hoeveelheid werk in jullie systeem netjes in balans.</li>
    </ol>
</div>

<div class="man-section" id="man-scat">
    <h3 style="color:#0052CC; margin-top:0;">Scatterplot (Spreidingsdiagram)</h3>
    <p style="color:#42526E;">Elke stip is 1 afgerond ticket. Je kunt in het vakje <strong>Max (d)</strong> een getal invoeren om extreme uitschieters lokaal weg te filteren.</p>
    <ul>
        <li><strong>Rode stippellijn:</strong> Dit is de P85 grens. Bespreek stippen híerboven in de retro: waarom doken ze zo hoog op?</li>
        <li><strong>Verticale paarse lijntjes:</strong> Dit zijn de momenten dat een Sprint eindigde. Zie je hele torentjes met stippen exact op deze lijnen staan? Dan werken jullie met een "mini-waterval" en ronden jullie al het werk pas op de allerlaatste test-dag van de sprint af!</li>
    </ul>
</div>

<div class="man-section" id="man-hist">
    <h3 style="color:#0052CC; margin-top:0;">Histogram</h3>
    <p style="color:#42526E;">Toont hoe vaak een bepaalde doorlooptijd voorkomt. Een massieve, hoge piek aan de linkerkant van de grafiek is het bewijs van een High Performing team.</p>
</div>

<div class="man-section" id="man-thru">
    <h3 style="color:#0052CC; margin-top:0;">Throughput</h3>
    <p style="color:#42526E;">Het absolute aantal afgeronde issues (of SP) per tijdsperiode. Een voorspelbaar team toont hier een betrouwbare, redelijk platte grafiek (een stabiele 'hartslag'). Grote schommelingen wijzen op te grote stories of externe blokkades.</p>
</div>

<h2 style="color:#172B4D; font-size: 18px; margin-top: 40px; margin-bottom: 0;">5. FAQ</h2>
<div class="man-section m-faq">
    <h4>Waarom staat er 'Onvoldoende data' bij Cycle Time en de Fase-verdeling?</h4>
    <p>Dit gebeurt als jullie de datums in Jira niet logisch vullen. Als tickets direct van 'To-Do' naar 'Done' worden gesleept, is er simpelweg geen actieve bewerkingstijd vastgelegd.</p>
    <h4>Waarom wijken de aantallen af van Jira's eigen rapportages?</h4>
    <p>Jira's eigen rapporten kijken vaak alleen naar de actieve sprint, of tellen 'Sub-Tasks' mee. Dit Dashboard negeert (standaard) Sub-tasks en meet uitsluitend de doorstroming van zuivere waarde (Stories en Bugs) over een langere periode, ongeacht in welke sprint ze toevallig zaten.</p>
</div>
`;