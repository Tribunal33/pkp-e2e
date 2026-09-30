// Neighbour check for docs/issues/U63-OJS6-doaj-list-search-matches-letter-case.md
// (spec U63 register OJS6): what the fix must leave alone. On the same
// "Articles" list of the DOAJ tool, as rvaca, a search still keeps to the
// column chosen and to the text typed, whatever its letter case:
//   N1. "Article Title", `mwandenga` (an author's name, in no title): nothing.
//   N2. "Authors", `signalling` (a title word, no author's name): nothing.
//   N3. "Article Title", `okapi` (in no title): nothing.
//   N4. "Article Title", `SIGNALLING` with "Any Issue" left: with the fix
//       "Signalling Theory Dividends" alone, without it nothing (the fault).
// Walked with the fix in and out (trial.sh). OJS only; the kit builds nothing.
//
// Run: PROBE_FEATURE=issues-ir2 PROBE_AGENT=u63ojs6 node bin/probe.js ojs shared/playwright/checks/issues/doaj-list-search-matches-letter-case/neighbour.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const {openArticles, search} = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v)}`); };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        await idle(page);
        const grid = await openArticles(page, fact);
        for (const [n, column, text] of [
            ['N1', 'Article Title', 'mwandenga'],
            ['N2', 'Authors', 'signalling'],
            ['N3', 'Article Title', 'okapi'],
            ['N4', 'Article Title', 'SIGNALLING'],
        ]) {
            fact(`${n} rows (${column}: "${text}")`, await search(page, grid, column, text, fact, n));
            record(`${n}-search`, await screen(page));
        }
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
