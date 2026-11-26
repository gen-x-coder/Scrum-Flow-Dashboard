# Radix — Scrum Flow Dashboard voor Jira

**Versie: 3.1.0**

Radix is een Nederlandstalig flow-dashboard voor Scrum-teams. Het draait in de browser op een Confluence-pagina en leest Jira met de bestaande gebruikerssessie. Geen afzonderlijke backend, externe AI of individuele prestatiebeoordeling. De optionele lokale IndexedDB-cache bevat afgeleide statushistorie.

*English: Radix is a browser-based Jira flow-metrics dashboard for Confluence. The UI and documentation are in Dutch.*

## Ontwerpprincipes

- Eenvoud boven configureerbaarheid.
- Datakwaliteit boven hoeveelheid data.
- Transparantie boven schijnprecisie.
- Teamreflectie boven prestatiebeoordeling.

## Installatie

Host de JavaScript-bestanden in één map op een webserver die je organisatie beheert en vertrouwt. Gebruik HTTPS. Plaats de inhoud van `confluence.html` in een HTML-macro en vervang beide voorbeeldadressen. De Jira REST-API's moeten toegankelijk zijn vanuit de Confluence-pagina met de bestaande sessie; houd rekening met CORS, cookies en CSP (de huidige interface gebruikt ook inline handlers). Eén Radix-dashboard per pagina. Jira Server/Data Center is de beoogde omgeving; Cloud-compatibiliteit is niet vastgesteld.

Upload bij upgrades `dashboard.js` als laatste en voorkom langdurige caching van dat bestand (bijvoorbeeld `Cache-Control: no-cache`). De loader versieert de overige modules. Een actieve `config.js` blijft bij upgrades behouden.

## Configuratie

Optioneel: kopieer `config.example.js` naar `config.js` in dezelfde map als `dashboard.js`. Alleen afwijkende instellingen zijn nodig. Ingebouwde defaults → config.js → Confluence `window.FLOW_CONFIG` → persoonlijke voorkeuren voor de daarvoor bestemde opties. Geen geheimen in configuratiebestanden. Een ontbrekend bestand blokkeert de start niet.

| Sleutel | Standaard |
|---|---|
| `jiraUrl` | Vereist; via config.js of Confluence |
| `containerId` | `flow-app-container` |
| `fields.storyPoints` | `customfield_10002` |
| `fields.team` | `customfield_10012` |
| `issueTypes.story`, `issueTypes.bug` | Zie voorbeeld; exacte namen, niet hoofdlettergevoelig |
| `statusCategories` | Automatisch; optionele mapping naar `todo`, `progress`, `done` |
| `defaultMonths` | 3 |
| `defaults.visible` | `lt`, `ct`, `qt`, `fe` |
| `defaults.workdays` | `calendar` |
| `defaults.outlier` | `95` |
| `defaults.throughputPeriod` | `sprint` |
| `defaults.holidays` | `[]` |
| `historyCache` | `true` |
| `cacheHours` | 24 (1–24) |

De bestaande knop Standaard herstelt de geconfigureerde weergave; Compact en Alles bieden alternatieven. Zie `config.example.js` voor overige toegestane waarden.

## Metrics en interpretatie

| Onderdeel | Betekenis |
|---|---|
| Lead Time | Aanmaak tot laatste afronding (resolutiondate als terugval) |
| Cycle Time | Eerste actieve status tot laatste afronding |
| Queue Time | Aanmaak tot eerste actieve status, ook voor open werk |
| Flow Efficiency | Tijd in Jira-categorie In Progress / Lead Time; ook wachten kan in die categorie vallen |
| MTTR | Lead Time van bugs |
| Teamindicatoren | Variatiecoëfficiënt, instroom/uitstroom in dezelfde volledige perioden, heropeningen |
| Monte Carlo | Issues en Story Points per periode; minimaal drie volledige historische perioden |
| Einddatumvoorspelling | Vaste open scope, historische wekelijkse doorvoer, geen nieuwe instroom |
| Grafieken | Faseverdeling, histogram, scatterplot, throughput, CFD |
| Teamreflectie | Lokale regelgebaseerde observaties, vragen en mogelijke experimenten |

Standaard drie maanden, vrij aanpasbaar. Oude open issues blijven zichtbaar; recent afgesloten werk telt mee met volledige voorgeschiedenis. Alleen huidige bordpopulatie, geen reconstructie van historisch bordlidmaatschap. Stories en Bugs worden op exacte typenamen herkend; een issue met meerdere teams telt in de totale selectie eenmaal mee. Subtaken kunnen ontbrekende ontwikkelstarts aanvullen maar tellen niet mee als extra werkitems en leveren geen afgeleide Flow Efficiency op.

Meetdekking geeft de geldige metingen vóór uitschieterfilter. Ontbrekende waarden zijn geen nul. Uitschieters worden alleen optioneel uit het gemiddelde van tijdsmetingen verwijderd; min/max/percentielen gebruiken alle geldige waarden. Onbekende historische statusnamen worden gemeld; onbetrouwbare reconstructies worden niet als betrouwbare actieve tijd behandeld.

Throughput meet afgesloten issues, inclusief afgewezen werk, niet noodzakelijk geleverde klantwaarde. Werk tussen sprints en in de lopende sprint staat afzonderlijk in de grafiek. Monte Carlo en stabiliteitsgemiddelden gebruiken volledige perioden; bij overlappende sprints wordt een vaste kalenderperiode gebruikt. Een kleine steekproef beperkt de betrouwbaarheid van een voorspelling. Zie de geïntegreerde handleiding voor details.

## Privacy

Geen namen, issue keys of individuele prestaties in het dashboard. Data blijft in de browser en eigen Jira; de webserver levert scripts. Afgeleide statushistorie wordt per Jira-omgeving en account in IndexedDB opgeslagen; gehashte sleutels zijn pseudonimisering, geen versleuteling of toegangscontrole. Cache wissen kan op het startscherm. Standaard 24 uur geldigheid, bij afwijkende API-metadata maximaal één uur na bordcontrole.

## Testen

Node.js 22: `python build.py` en `node --test tests/*.test.cjs` (gesimuleerde Jira- en IndexedDB-responses). Werkelijke Jira, Confluence en browsergedrag moeten apart getest worden. Interne vergelijkingstools en testgegevens worden niet meegeleverd in de publieke repository.

## Herkomst en licentie

Radix bouwt voort op het oorspronkelijke Scrum Flow Dashboard, gepubliceerd op 11 mei 2026 onder de MIT-licentie. Zie [oorspronkelijke commit 57a72d3](https://github.com/gen-x-coder/Scrum-Flow-Dashboard/tree/57a72d346266d22f49d3949f579bdae8b06782ca) en de [commitgeschiedenis](https://github.com/gen-x-coder/Scrum-Flow-Dashboard/commits/main). Radix betekent wortel in het Latijn. Behoud de copyrightvermelding en [MIT-licentie](LICENSE) bij verspreiding en hergebruik.

## Installatie met één bestand (Confluence)

Download `radix.js` uit de GitHub-release en upload dit als bijlage bij een beheerde Confluence-pagina. De bijlage moet als JavaScript uitvoerbaar zijn; controleer MIME-type, CSP en toegangsrechten in je omgeving. Beperk de wijzigingsrechten op de bijlage tot vertrouwde beheerders. Gebruik het exacte bijlagepad in een HTML-macro, bijvoorbeeld:

```html
<div id="flow-app-container"></div>
<script>window.FLOW_CONFIG = { jiraUrl: "https://jira.example.com" };</script>
<script src="/download/attachments/PAGINA_ID/radix.js?api=v2"></script>
```

Optioneel: upload `config.js` naast `radix.js`. Radix zoekt dit bestand automatisch op dezelfde locatie. Ontbreekt het, dan gelden de standaardwaarden en de HTML-configuratie. Er worden geen andere modules opgehaald. Bij een update vervang je dezelfde bijlage; controleer of Confluence en de browser de nieuwe versie serveren. De modulaire installatie via `dashboard.js` blijft ondersteund.

## Build en releases

`python build.py` genereert `dist/radix.js` uit de modulaire broncode, inclusief MIT-licentie. Het resultaat is niet geminificeerd. Voor controles is Node.js nodig: `node --check dist/radix.js` en `node --test tests/*.test.cjs`.

GitHub Actions bouwt en test automatisch bij een wijziging van `dashboard.js` of de releaseworkflow op `main`, en bij een gepushte tag `vX.Y.Z`. Een nieuwe versie in `dashboard.js` op `main` wordt na geslaagde tests gepubliceerd als nieuwe GitHub-release. Bestaande tags worden niet vervangen. Bij een tag-build wordt gecontroleerd of de tag overeenkomt met de versie in `dashboard.js`. De release bevat `radix.js`, `config.example.js` en `LICENSE`. Een handmatig gestarte workflow maakt alleen een buildartifact.
