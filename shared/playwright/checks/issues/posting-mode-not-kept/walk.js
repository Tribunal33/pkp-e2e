// Issue report docs/issues/U51-OPS1-posting-mode-says-saved-keeps-nothing.md (U51 OPS1, U08 OPS2) {OPS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing. Helpers: lib.js.
//
//   1    sign in as dbarnes
//   2    Settings › Distribution › "Access": the "Posting Mode" radios
//   3    choose "OPS will not be used to post the server's contents online.", "Save"
//   4    the page loaded again, "Access": the radios
//   5    sign out
//   6-8  as a visitor: the home page's header, "Archives", preprint 9 and its "PDF"
//   9    signed in as ccorino (Author, Reader): steps 6 to 8 again
//   10   dbarnes: choose "The server will provide open access to its contents.", "Save"
//   11   the page loaded again, "Access": the radios
// The neighbour check is neighbour.js beside it.
//
// Reset first:  npm run fleet-prep -- --feature issues-sb11 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-sb11 PROBE_AGENT=sb11 node bin/probe.js ops shared/playwright/checks/issues/posting-mode-not-kept/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/posting-mode-not-kept/fix.diff ops
//               (reset, walk.js; reset, neighbour.js), then node bin/try-fix.js revert …/fix.diff ops
const {forEachApp, launch, screen, record, sql} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ops') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 900)}`);
    };
    const {page, close} = await launch(app);
    const failures = L.watchFailures(page);
    try {
        // 1-2
        await L.signIn(page, 'dbarnes');
        await L.openAccessTab(page, app);
        const offered = await L.postingMode(page);
        fact('2 Posting Mode as the tab opens', offered);
        fact('2 the tab\'s fields', await L.tabFields(page));
        record('2-access', await screen(page));
        if (!offered.length) {
            // The tab offers no "Posting Mode" (the fix): the server goes on posting, as the tab no longer promises otherwise.
            await L.signOut(page);
            fact('6-8 visitor', await L.readerTour(page, app));
            return;
        }
        // 3
        fact('3 none chosen, Save', await L.savePostingMode(page, L.NONE));
        fact('3 stored', L.stored(app, sql));
        // 4
        await L.openAccessTab(page, app);
        fact('4 Posting Mode after a reload', await L.postingMode(page));
        record('4-access-reloaded', await screen(page));
        // 5-8
        await L.signOut(page);
        fact('6-8 visitor', await L.readerTour(page, app));
        record('8-visitor-pdf', await screen(page));
        // 9
        await L.signIn(page, 'ccorino');
        fact('9 reader ccorino', await L.readerTour(page, app));
        record('9-reader', await screen(page));
        // 10-11
        await L.signIn(page, 'dbarnes');
        await L.openAccessTab(page, app);
        fact('10 open chosen, Save', await L.savePostingMode(page, L.OPEN));
        fact('10 stored', L.stored(app, sql));
        await L.openAccessTab(page, app);
        fact('11 Posting Mode after a reload', await L.postingMode(page));
        record('11-access-reloaded', await screen(page));
    } finally {
        facts.failures = failures;
        console.log(`[fact] failures: ${JSON.stringify(failures)}`);
        record('facts', facts);
        await close();
    }
});
