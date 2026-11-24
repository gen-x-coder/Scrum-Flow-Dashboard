# Radix — Scrum Flow Dashboard voor Jira

Radix toont de flow-metrics van een team rechtstreeks uit een Jira-bord, op een Confluence-pagina. Je ziet Lead Time, Cycle Time, Queue Time, Flow Efficiency, throughput, een cumulatief stroomdiagram en Monte Carlo-voorspellingen. Alles draait in de browser van de gebruiker, met diens eigen Jira-sessie. Er is geen server, geen database en geen externe AI nodig.

Radix kijkt naar het team, niet naar personen. Namen, issue keys en toegewezen medewerkers komen niet in het dashboard.

> **In English:** Radix is a browser-based flow-metrics dashboard for Jira boards, embedded in a Confluence page. The interface and documentation are in Dutch. MIT licensed, © 2026 Lucas Bonsel.

Huidige versie: **3.0.0-dev.10** (ontwikkelversie).

## Wat Radix laat zien

| Onderdeel | Wat het meet |
| --- | --- |
| Lead Time | Van aanmaken tot afronding |
| Cycle Time | Van de eerste actieve status tot de laatste afronding, inclusief wachttijd en heropeningen |
| Queue Time | Van aanmaken tot de eerste actieve status (ook bij open werk) |
| Flow Efficiency | Tijd in actieve statussen gedeeld door de Lead Time |
| MTTR | Lead Time van bugs |
| Teamindicatoren | Consistentie (variatiecoëfficiënt), stabiliteit (instroom tegenover uitstroom) en heropeningen |
| Monte Carlo | Verwachte doorvoer per periode in issues of Story Points, op basis van 10.000 simulaties |
| Einddatumvoorspelling | Wanneer het huidige open werk af is, uitgaande van een vaste scope |
| Grafieken | Faseverdeling, histogram, scatterplot, throughput en cumulatief stroomdiagram (CFD) |
| Teamreflectie | Observaties en gespreksvragen voor de retrospective. Lokaal en op vaste regels, zonder score of oordeel |

Bij elke metric staat een **meetdekking**: hoeveel issues meetbaar waren en waarom de rest niet. Waarden die ontbreken tellen nooit als nul mee.

## Hoe het werkt

1. De gebruiker opent de Confluence-pagina terwijl hij in Jira is ingelogd.
2. Hij vult een projectsleutel in, kiest een bord en een begindatum (standaard drie maanden terug).
3. Radix haalt de Stories en Bugs van dat bord op. Dat zijn de issues die sinds de begindatum gewijzigd zijn, plus al het werk dat nog open staat.
4. Per issue reconstrueert Radix de statushistorie uit de Jira-changelog, ingedeeld naar de categorieën To Do, In Progress en Done. Ontbreekt een startmoment, dan wordt de vroegste geldige start van een directe subtaak gebruikt.
5. Daaruit berekent Radix de metrics en grafieken. De afgeleide statushistorie wordt tot 24 uur in de browser bewaard (IndexedDB), zodat het de volgende keer snel gaat.

## Installatie

### 1. Bestanden hosten

Zet deze bestanden samen in één map op een webserver die de Confluence-pagina mag laden:

```
dashboard.js       ← het enige bestand dat je in Confluence aanroept
configuration.js   history-cache.js   jira-api.js   metrics.js
workflow.js        charts.js          manual.js     advice.js   app.js
config.js          ← optioneel, zie Configuratie
```

`dashboard.js` laadt de andere bestanden uit zijn eigen map en zet er het versienummer achter. Upload `dashboard.js` daarom als laatste, en laat juist dat bestand niet lang cachen (`Cache-Control: no-cache`).

### 2. Toegang tot Jira

Radix gebruikt de REST-API's van Jira (`/rest/api/2` en `/rest/agile/1.0`) met de sessie waarmee de gebruiker al is ingelogd. De browser moet Jira dus vanaf de Confluence-pagina kunnen aanroepen. Dat kan als ze hetzelfde domein delen, of als Jira het domein van Confluence toestaat (CORS met credentials). Ook de Content Security Policy van Confluence moet het laden van het script en de verbinding met Jira toestaan.

### 3. Confluence-pagina

Plaats in een HTML-macro:

```html
<div id="flow-app-container"></div>
<script>
window.FLOW_CONFIG = { jiraUrl: "https://jira.example.com" };
</script>
<script src="https://jouw-server.example.com/radix/dashboard.js"></script>
```

Per pagina kan er één dashboard staan.

## Configuratie

Zonder configuratie werkt Radix met de standaardwaarden. Je kunt instellingen op drie niveaus vastleggen. Elk volgend niveau gaat boven het vorige:

1. **`config.js`** naast `dashboard.js`, voor de hele organisatie. Kopieer daarvoor `config.example.js` en zet er alleen in wat afwijkt.
2. **`window.FLOW_CONFIG`** op de Confluence-pagina, voor één pagina of team.
3. **Persoonlijke voorkeuren** die de gebruiker zelf onder Instellingen kiest. Die gaan alleen over de weergave.

| Instelling | Standaard | Toelichting |
| --- | --- | --- |
| `jiraUrl` | — (verplicht) | Absolute http(s)-URL van Jira |
| `containerId` | `flow-app-container` | Id van het HTML-element waarin Radix wordt geladen |
| `fields.storyPoints` | `customfield_10002` | Veld voor Story Points; `null` zet het uit |
| `fields.team` | `customfield_10012` | Veld voor het team; `null` zet het uit |
| `issueTypes.story` / `issueTypes.bug` | o.a. Story, User Story, Verbetering / Bug, Defect, Fout | Namen die als Story of Bug tellen. Hoofdletters maken niet uit, een deel van de naam is genoeg |
| `statusCategories` | automatisch uit Jira | Wijs een statusnaam toe aan `todo`, `progress` of `done` |
| `defaultMonths` | `3` | Begindatum, zoveel maanden terug (1–120) |
| `defaults.visible` | `lt`, `ct`, `qt`, `fe` | Welke kaarten standaard zichtbaar zijn |
| `defaults.workdays` | `calendar` | `calendar` of `workdays` (ma–vr, zonder feestdagen) |
| `defaults.outlier` | `95` | Uitschieters buiten het gemiddelde laten: `""`, `90`, `95` of `99` |
| `defaults.throughputPeriod` | `sprint` | `sprint`, `week` of `month` |
| `defaults.holidays` | `[]` | Feestdagen als `YYYY-MM-DD` |
| `historyCache` | `true` | Afgeleide statushistorie in de browser bewaren |
| `cacheHours` | `24` | Hoe lang de cache geldig is, 1–24 uur |

Een ongeldige instelling wordt overgeslagen, met een waarschuwing in de console. `config.js` is uitvoerbare code: beheer het bestand zoals de rest van je code, en zet er nooit wachtwoorden of tokens in.

## Gebruik

- **Filters:** kies boven het dashboard een issuetype of team.
- **Instellingen:** kies welke kaarten en grafieken je ziet (Standaard, Compact of Alles), werk- of kalenderdagen, uitschieters en feestdagen. Je keuze wordt in je eigen browser bewaard.
- **Handleiding:** elke `(?)` opent de uitleg bij die metric, met wat er precies gemeten wordt en wat niet.
- **Historiecache wissen:** met de knop op het startscherm.

Een paar dingen om op te letten bij het lezen van de cijfers:

- Er wordt alleen gemeten wat nu op het bord staat. Werk dat vroeger op het bord stond maar is verplaatst of verwijderd, telt niet mee.
- Monte Carlo en de einddatumvoorspelling gebruiken alleen volledige perioden, ook perioden zonder afgerond werk. Het zijn modeluitkomsten, geen toezeggingen. Met weinig perioden zijn ze onbetrouwbaar.
- Flow Efficiency volgt de Jira-categorie In Progress. Wachten in review of test kan daar ook onder vallen.

## Privacy

- Het dashboard toont alleen cijfers op teamniveau. Je kunt niet inzoomen op één persoon.
- In de cache staan alleen afgeleide statusintervallen: geen namen, geen issue-inhoud en geen changelog-auteurs. Elk Jira-account en elke Jira-omgeving krijgt een eigen cache. De sleutels zijn gehasht, maar dat is pseudonimisering en geen versleuteling.
- Gegevens gaan alleen heen en weer tussen de browser en jouw eigen Jira. De webserver levert alleen de scriptbestanden.

## Herkomst en licentie

Radix is ontworpen en geschreven door **Lucas Bonsel**. De eerste versie, toen nog *Scrum Flow Dashboard*, is op **11 mei 2026** in deze repository gepubliceerd onder de MIT-licentie. Die versie staat vast onder de tag [`v1.0-origineel`](https://github.com/gen-x-coder/Scrum-Flow-Dashboard/tree/v1.0-origineel) en in de [commitgeschiedenis](https://github.com/gen-x-coder/Scrum-Flow-Dashboard/commits/main). De naam *Radix* (Latijn voor "wortel") verwijst naar die oorsprong.

Je mag Radix gebruiken, aanpassen en verspreiden, ook commercieel, onder de voorwaarden van de [MIT-licentie](LICENSE). De belangrijkste voorwaarde: de copyrightvermelding en de licentietekst moeten in elke kopie, en in elk wezenlijk deel ervan, behouden blijven. Gebruik je (delen van) deze code in een eigen product, vermeld dan de herkomst, bijvoorbeeld:

```
Gebaseerd op Radix / Scrum Flow Dashboard door Lucas Bonsel
https://github.com/gen-x-coder/Scrum-Flow-Dashboard — MIT License
```

Copyright © 2026 Lucas Bonsel.
