// Issue report docs/issues/U63-OJS6-doaj-search-matches-letter-case.md (U63 OJS6): the DOAJ
// list's "Article Title" and "Authors" search matches letter case as typed. Takes the report's
// Steps through the screens on a dataset fleet freshly reset to PKP's default test dataset:
//   1. sign in as dbarnes
//   2. Tools › "DOAJ Export Plugin", "Articles"
//   3. "Search" above the list
//   4. "Article Title", "signalling", "Search"
//   5. "Signalling", "Search"
//   6. "Authors", "mwandenga", "Search"
//   7. "Mwandenga", "Search"
// On 3.5 the "Authors" box matches the whole "Given Family" name only (main matches any part),
// so steps 6 and 7 type "alan mwandenga" and "Alan Mwandenga" there.
// OMP and OPS have no DOAJ tool: no surface, skipped.
// Reset first, then run:
//   npm run fleet-prep -- --feature issues-ir20 --dataset 2 --reset
//   PROBE_FEATURE=issues-ir20 PROBE_AGENT=ir20 node bin/probe.js ojs shared/playwright/checks/issues/doaj-search-matches-letter-case/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-ir20-3_5, and PROBE_RUN=r35
// in front of the run.
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const doajLib = require('../doaj-deposit-takes-other-journals-articles/lib.js');
const {flat, searchList} = require('./lib.js');

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[doaj] ${app.name}: no DOAJ tool, no surface; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'dbarnes');
        // 2
        fact('2 open', await doajLib.openDoaj(page, app, ctx, 'Articles'));
        fact('2 list', await doajLib.readList(page));
        record('doaj-2-articles', await screen(page));
        // 3–7
        const on35 = app.line === 'stable-3_5_0';
        const steps = [['4', 'Article Title', 'signalling'], ['5', 'Article Title', 'Signalling'],
            ['6', 'Authors', on35 ? 'alan mwandenga' : 'mwandenga'], ['7', 'Authors', on35 ? 'Alan Mwandenga' : 'Mwandenga']];
        for (const [n, field, text] of steps) {
            fact(`${n} ${field} "${text}"`, await searchList(page, field, text));
            const s = await screen(page);
            record(`doaj-${n}-search`, s);
            await shot(page, `doaj-${n}-search`).catch(() => {});
        }
    } finally {
        record('doaj-facts', facts);
        await close();
    }
});
