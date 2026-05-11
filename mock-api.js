// ============================================================
// Scrum Flow Dashboard - Jira API Mocker (Stub) met PRNG
// Bestand: mock-api.js
// ============================================================

console.log("[Mock API] Intercepting fetch() requests for Jira simulation...");

const originalFetch = window.fetch;

function cyrb53(str, seed = 0) {
    let h1 = 0xDEADBEEF ^ seed, h2 = 0x41C6CE57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function mulberry32(seed) {
    return function() {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

window.fetch = async function(url, options) {
    if (typeof url === 'string' && url.includes('/rest/')) {
        
        if (url.includes('/rest/api/2/myself')) {
            return new Response(JSON.stringify({ displayName: "Simulator Account", timeZone: "Europe/Amsterdam" }), { status: 200 });
        }
        if (url.includes('/rest/api/2/serverInfo')) {
            return new Response(JSON.stringify({ serverTitle: "Mocked Jira Environment", version: "99.0" }), { status: 200 });
        }
        if (url.includes('/rest/agile/1.0/board?')) {
            return new Response(JSON.stringify({ values: [{ id: 1, name: "Gesimuleerd Project", type: "scrum" }] }), { status: 200 });
        }
        if (url.includes('/rest/api/2/projectCategory')) {
            return new Response(JSON.stringify([
                { id: "10000", name: "Agile Release Train Alpha" },
                { id: "10001", name: "Agile Release Train Beta" }
            ]), { status: 200 });
        }
        if (url.includes('/rest/api/2/field')) {
            const fakeFields = [
                { id: "customfield_10020", name: "Sprint" },
                { id: "customfield_10014", name: "Epic Link" },
                { id: "fixVersions", name: "Fix Version/s" },
                { id: "project", name: "Project" },
                { id: "customfield_10012", name: "Team" },
                { id: "customfield_10002", name: "Story Points" }
            ];
            return new Response(JSON.stringify(fakeFields), { status: 200 });
        }
        if (url.includes('/sprint?startAt=')) {
            const fakeSprints = [];
            const now = new Date();
            const nu = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); 
            for(let i=10; i>=1; i--) {
                const sEnd = nu - ((i - 1) * 14 * 86400000); 
                const sStart = sEnd - (14 * 86400000);
                const isActive = (i === 1);
                fakeSprints.push({
                    id: 11 - i, name: `Sprint ${11 - i}`, state: isActive ? "active" : "closed",
                    startDate: new Date(sStart).toISOString(), endDate: new Date(sEnd).toISOString(),
                    completeDate: isActive ? null : new Date(sEnd).toISOString()
                });
            }
            return new Response(JSON.stringify({ isLast: true, values: fakeSprints }), { status: 200 });
        }

        if (url.includes('/rest/api/2/search')) {
            const s = window.SIM_SETTINGS || { vol: 1000, ct: 5, qt: 10, stab: 100, var: 0.2, bug: 0.15, nosp: false, kp: false, seed: '' };
            const fakeIssues = generateAlgorithmicIssues(s);
            return new Promise(resolve => { setTimeout(() => { resolve(new Response(JSON.stringify({ total: fakeIssues.length, issues: fakeIssues }), { status: 200 })); }, 200); });
        }
    }
    return originalFetch.apply(this, arguments);
};

function generateAlgorithmicIssues(settings) {
    const seedStr = (settings.seed !== undefined && settings.seed !== '') ? String(settings.seed) : null;
    const seedNum = seedStr ? cyrb53(seedStr) : Math.floor(Math.random() * 4294967296);
    const rnd = mulberry32(seedNum);

    const issues = [];
    const teamMembers = ["Alex", "Bas", "Celine", "Daan", "Elena", "Fatih", "Guus", "Hanna"];
    
    // Freggels Teams (10+)
    const teamsList = [
        "Team Gobo", "Team Moki", "Team Wembley", "Team Boober", "Team Red", 
        "De Doozers", "De Gorgs", "Vuilshoop", "Team Sprocket", "Cantus Minstrelen", "Buitenwereld"
    ];
    
    // Donald Duck Projecten (10)
    const projectsList = [
        "Duckstad Centraal", "Geldpakhuis Ops", "Jonge Woudlopers", 
        "Zware Jongens Syndicaat", "Willie Wortel Labs", "Duck Buggy's", 
        "Gansdorp United", "Magica's Magie", "Oma Duck Boerderij", "Damesclub"
    ];
    
    const piList = ["PI 2026 Q1", "PI 2026 Q2", "PI 2026 Q3"];

    const F_SPRINT = "customfield_13303";
    const F_DEV_START = "customfield_13300";
    const F_DEV_END1 = "customfield_13302";
    const F_DEV_END_L = "customfield_13301";
    const F_SP = "customfield_10002";
    const F_TEAM = "customfield_10012";

    const targetInflow = settings.vol;
    const targetOutflow = Math.round(targetInflow * (settings.stab / 100));

    const nNormal = Math.min(targetInflow, targetOutflow);
    const nUnresolved = Math.max(0, targetInflow - targetOutflow);
    const nOld = Math.max(0, targetOutflow - targetInflow);

    const now = new Date();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sprintWindowStart = nowMidnight - (10 * 14 * 86400000); 

    let issueCounter = 1;

    function buildIssue(group) {
        const rBug = rnd(), rAssignee = rnd(), rKeyPerson = rnd(), rTeam = rnd();
        const rProj = rnd(), rPI = rnd();
        const rSp = rnd(), rVar = rnd(), rVarMult = rnd();
        const rResDate = rnd(), rCtFact = rnd(), rRework = rnd(), rReworkLen = rnd();
        const rOldDate = rnd(), rQtFact = rnd(), rUnresDate = rnd();

        const isBug = rBug < settings.bug;
        const typeName = isBug ? "Bug" : "Story";
        
        let assignee = teamMembers[Math.floor(rAssignee * teamMembers.length)];
        if (settings.kp && rKeyPerson < 0.6) assignee = "Alex";
        
        const assignedTeam = teamsList[Math.floor(rTeam * teamsList.length)];
        const assignedProj = projectsList[Math.floor(rProj * projectsList.length)];
        const assignedPI = piList[Math.floor(rPI * piList.length)];
        
        const sp = settings.nosp ? 0 : [1, 2, 3, 5, 8][Math.floor(rSp * 5)];

        // Derives an ART sprint name from a timestamp.
        // SAFe cadence: 4 PIs per year, 6 sprints per PI (Q1=sprints 1-6, Q2=7-12, etc.)
        // Result format matches parseCadence: "ART YYYY QX SN" → parsed as "YYYY QX - Sprint N"
        function artSprintName(ms) {
            const d = new Date(ms);
            const year = d.getFullYear();
            const month = d.getMonth(); // 0-11
            const q = Math.floor(month / 3) + 1; // 1-4
            const weekInQ = Math.floor((d - new Date(year, (q - 1) * 3, 1)) / (7 * 86400000));
            const sprint = Math.min(Math.floor(weekInQ / 2) + 1, 6); // 2-week sprints, max 6
            return `ART ${year} Q${q} S${sprint}`;
        }

        let varMult = 1;
        if (rVar < settings.var) varMult = 0.3 + (rVarMult * 7.7); 

        const isResolved = (group !== 'unresolved');
        let cDateMs, devStartMs, devEndMs, devEndLastMs, resMs, sprintStartMs;

        if (isResolved) {
            resMs = sprintWindowStart + (rResDate * 140 * 86400000);
            let cycleTimeMs = settings.ct * (0.5 + rCtFact) * varMult * 86400000;
            if (cycleTimeMs < 3600000) cycleTimeMs = 3600000;

            devEndLastMs = resMs - (rReworkLen * 2 * 86400000);
            const hasRework = rRework < 0.1;
            devEndMs = hasRework ? devEndLastMs - (rReworkLen * 3 * 86400000) : devEndLastMs;
            
            devStartMs = devEndMs - cycleTimeMs;

            if (group === 'old') {
                cDateMs = devStartMs - (150 * 86400000) - (rOldDate * 150 * 86400000);
            } else {
                let queueTimeMs = settings.qt * (0.5 + rQtFact) * varMult * 86400000;
                cDateMs = devStartMs - queueTimeMs;
            }

            sprintStartMs = cDateMs + ((devStartMs - cDateMs) / 2);
            sprintStartMs = Math.min(sprintStartMs, nowMidnight);

        } else {
            cDateMs = nowMidnight - (rUnresDate * 60 * 86400000); 
            let queueTimeMs = settings.qt * (0.5 + rQtFact) * varMult * 86400000;
            devStartMs = cDateMs + queueTimeMs;
            
            let cycleTimeMs = settings.ct * (0.5 + rCtFact) * varMult * 86400000;
            devEndMs = devStartMs + cycleTimeMs;
            devEndLastMs = devEndMs;
            resMs = null;
            
            sprintStartMs = cDateMs + (queueTimeMs / 2);
            sprintStartMs = Math.min(sprintStartMs, nowMidnight);
        }

        let statusName = "To Do";
        if (isResolved) statusName = "Done";
        else if (devStartMs < nowMidnight) statusName = "In Progress";

        const issue = {
            key: `SIM-${issueCounter++}`,
            fields: {
                issuetype: { name: typeName },
                status: { name: statusName },
                summary: `Gesimuleerd Ticket (${group})`,
                assignee: { displayName: assignee },
                created: new Date(cDateMs).toISOString(),
                updated: new Date(isResolved ? resMs : nowMidnight).toISOString(),
                project: { name: assignedProj },
                fixVersions: [{ name: assignedPI }],
                customfield_10020: [{ name: artSprintName(sprintStartMs) }] 
            }
        };

        if (isResolved) issue.fields.resolutiondate = new Date(resMs).toISOString();
        
        issue.fields[F_SP] = sp;
        issue.fields[F_TEAM] = assignedTeam; 
        
        if (devStartMs < nowMidnight) issue.fields[F_DEV_START] = new Date(devStartMs).toISOString();
        if (devEndMs < nowMidnight) issue.fields[F_DEV_END1] = new Date(devEndMs).toISOString();
        if (devEndLastMs < nowMidnight) issue.fields[F_DEV_END_L] = new Date(devEndLastMs).toISOString();
        issue.fields[F_SPRINT] = new Date(sprintStartMs).toISOString();

        return issue;
    }

    for(let i=0; i<nNormal; i++) issues.push(buildIssue('normal'));
    for(let i=0; i<nUnresolved; i++) issues.push(buildIssue('unresolved'));
    for(let i=0; i<nOld; i++) issues.push(buildIssue('old'));

    return issues;
}