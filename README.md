### 1. flow-integratie.html

Dit bestand fungeert als de gebruikersinterface en generator voor de integratie-snippet. Het is een standalone HTML-pagina die door beheerders wordt gebruikt om de implementatie voor te bereiden.

* **Functionaliteit:** Het stelt gebruikers in staat om een specifieke Jira Base URL te configureren en genereert op basis daarvan een JavaScript-snippet.
* **Kenmerken:**
* Bevat een modal-dialoog voor de weergave van de gegenereerde code.
* Maakt gebruik van een lokale `openGenerator()` functie om de configuratie-variabelen (`window.LUCAS_JIRA_URL`) in de snippet te injecteren.
* Biedt instructies over de noodzaak van een veilige domeinomgeving (zoals een Confluence HTML-macro) om Cross-Origin Resource Sharing (CORS) restricties te faciliteren binnen de browser van de gebruiker.



### 2. dashboard.js

De kern-engine van de applicatie. Dit script beheert de data-acquisitie, de verwerking van flow-metrieken en de rendering van de user interface.

* **Data-acquisitie:** Communiceert direct met de Jira REST API (`/rest/api/2/search` en `/rest/agile/1.0/board`). Het maakt gebruik van de authenticatie-context van de ingelogde gebruiker (session-based).
* **Statistische Modellen:**
* **Flow Metrics:** Berekent Lead Time, Cycle Time, Queue Time en Flow Efficiency.
* **Monte Carlo Simulaties:** Voert 10.000 iteraties uit op basis van historische throughput voor predictieve analyses (50%, 85% en 95% betrouwbaarheidsintervallen).
* **Consistentie:** Berekent de Coefficient of Variation (CV) voor de stabiliteit van doorlooptijden.


* **Rendering:** Bevat een aangepaste canvas-rendering engine voor het genereren van het Cumulatief Stroomdiagram (CFD), scatterplots en histogrammen zonder externe zware dependencies.

### 3. advies.js

Een gespecialiseerde logica-module die fungeert als een algoritmische "Agile Coach".

* **Functionaliteit:** Analyseert de berekende metrieken uit `dashboard.js` en vergelijkt deze met industriestandaarden zoals de DORA-metrics en de Actionable Agile-theorie van Daniel Vacanti.
* **Componenten:**
* **Configuratie-matrix:** Definieert drempelwaarden voor verschillende prestatie-niveaus (Elite, High, Moderate, Low Performer).
* **Diagnostische feedback:** Genereert tekstuele analyses en identificeert specifieke bottlenecks of "outlier" tickets direct in de interface.
* **Actiepunten:** Produceert context-afhankelijke suggesties voor retrospectives op basis van data-afwijkingen.



### 4. manual.js

De documentatie-module die binnen de applicatie wordt ingeladen.

* **Inhoud:** Bevat de volledige technische en methodologische uitleg van de gebruikte Flow Metrics en grafieken in HTML-string formaat.
* **Systeem-integratie:** Wordt door `dashboard.js` gekoppeld aan de UI via een help-systeem (`hMark`), waardoor gebruikers direct vanuit de grafieken naar de relevante sectie in de handleiding kunnen navigeren.

### 5. mock-api.js

Een ontwikkel- en test-utility die de Jira REST API simuleert.

* **Functionaliteit:** Intercepteert `fetch()` verzoeken naar de Jira-domeinen en retourneert gesimuleerde JSON-data.
* **Algoritmische Datageneratie:** Maakt gebruik van een Pseudo-Random Number Generator (PRNG) om consistente en realistische datasets te genereren, inclusief instelbare parameters voor volume, stabiliteit, variantie en defect-ratio's.
* **Toepassing:** Maakt het mogelijk om de frontend en de wiskundige modellen te testen zonder een actieve verbinding met een productie-Jira-omgeving.
