/*! Radix — MIT License; see LICENSE. Copyright (c) Lucas Bonsel. */
// Kopieer dit bestand alleen indien nodig naar config.js, naast dashboard.js.
// Verwijder instellingen die niet afwijken van de ingebouwde standaard.
// FLOW_CONFIG in Confluence heeft voorrang; persoonlijke weergavevoorkeuren
// hebben vervolgens voorrang op defaults. Config bevat nooit wachtwoorden.
window.RADIX_CONFIG = {
    // jiraUrl: "https://www.jira.nl", // indien niet via Confluence opgegeven
    // containerId: "flow-app-container", // alleen bij een afwijkend HTML-element

    // Jira custom fields; null schakelt een veld uit.
    fields: {
        storyPoints: "customfield_10002",
        team: "customfield_10012"
    },

    // Alleen invullen bij afwijkende namen; vervangt de lijst per type.
    // Vergelijking is niet hoofdlettergevoelig en gebruikt deelwoorden.
    // issueTypes: {
    //     story: ["Story", "Verhaal", "User Story", "Verbetering", "Technical Story", "Improvement"],
    //     bug: ["Bug", "Defect", "Fout"]
    // },

    // Alleen invullen bij afwijkende Jira-categorieën.
    // De sleutel is de Jira-statusnaam; waarden: todo, progress, done.
    // statusCategories: { "Development": "progress" },

    // 1–120 maanden; de begindatum blijft vrij aanpasbaar.
    defaultMonths: 3,

    defaults: {
        // Geldige sleutels: lt, ct, qt, fe, mtr, team, mc-issues, mc-sp,
        // forecast, advice, phase, hist, scat, thru, cfd.
        visible: ["lt", "ct", "qt", "fe"],
        workdays: "calendar", // calendar of workdays
        outlier: "95", // "" (uit), "90", "95", "99"; alleen gemiddelde tijdsmetingen
        throughputPeriod: "sprint", // sprint, week of month
        holidays: [] // bijvoorbeeld ["2026-12-25"] (YYYY-MM-DD)
    },

    historyCache: true,
    cacheHours: 24 // 1–24 uur; afwijkende API-metadata maximaal één uur
};
