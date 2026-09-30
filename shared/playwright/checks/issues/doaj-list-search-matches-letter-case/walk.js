// Issue report walk: docs/issues/U63-OJS6-doaj-list-search-matches-letter-case.md
// (spec U63 register OJS6). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
// its journal `publicknowledge`, its manager `rvaca` and its published
// article "Signalling Theory Dividends" (Alan Mwandenga et al.).
// OJS only: OMP and OPS have no DOAJ tool. The kit builds nothing.
//
//   1. Sign in as rvaca.  2. Tools › "DOAJ Export Plugin".  3. "Articles".
//   4. "Search" above the list.
//   5. "Article Title", `signalling`, "Search".   6. `Signalling`, "Search".
//   7. "Authors", `mwandenga`, "Search".          8. `Mwandenga`, "Search".
//   [3.5: 7. `alan mwandenga`, 8. `Alan Mwandenga`: the whole name.]
//   Read: the rows listed after each search.
// The neighbour check (what the fix must leave alone) is neighbour.js beside it.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u63ojs6 node bin/probe.js ojs shared/playwright/checks/issues/doaj-list-search-matches-letter-case/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u63ojs6 node bin/probe.js ojs shared/playwright/checks/issues/doaj-list-search-matches-letter-case/walk.js
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/u63ojs6/walk-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const {openArticles, search} = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the DOAJ tool is OJS's only
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v)}`); };
    const {page, close} = await launch(app);
    try {
        // 1. Sign in as rvaca.
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        await idle(page);
        // 2.-3. Tools › "DOAJ Export Plugin" › "Articles".
        const grid = await openArticles(page, fact);
        record('03-articles', await screen(page));
        // 4.-8. The searches. [3.5: the Authors search matches the whole
        // name only (no wildcards there), so steps 7 and 8 type it whole.]
        const name = (app.line && app.line !== 'main') ? ['alan mwandenga', 'Alan Mwandenga'] : ['mwandenga', 'Mwandenga'];
        const steps = [
            ['5', 'Article Title', 'signalling'],
            ['6', 'Article Title', 'Signalling'],
            ['7', 'Authors', name[0]],
            ['8', 'Authors', name[1]],
        ];
        for (const [n, column, text] of steps) {
            const rows = await search(page, grid, column, text, fact, n);
            fact(`${n} rows (${column}: "${text}")`, rows);
            record(`${n.padStart(2, '0')}-search`, await screen(page));
            await shot(page, `${n.padStart(2, '0')}-search`);
        }
    } finally {
        record('walk-facts', facts);
        await close();
    }
});
