// Issue report docs/issues/U56-A1-emails-tab-editorial-statistics-says-journal.md (U56 A1): the
// report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). The steps create nothing and change nothing.
//
// Default mode, as `rvaca`: Settings › Workflow › "Emails" (English), the tab's text recorded, the
//   description under "Editorial statistics" and every line naming the context read off it. OJS is
//   the control ("the journal" is right there).
// `neighbour` as the argument (the fix in and out; runs alone; reads only): the same tab in French
//   (`/fr_CA/`). With the fix in and out the French tab must read the same on every app, and the
//   English tab (default mode) must differ only in OMP's and OPS's "Editorial statistics" line.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u56a --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u56a PROBE_AGENT=u56a node bin/probe.js all shared/playwright/checks/issues/emails-tab-editorial-statistics-says-journal/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u56a-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u56a-3_5 PROBE_AGENT=u56a node bin/probe.js all shared/playwright/checks/issues/emails-tab-editorial-statistics-says-journal/walk.js
// Fix trial (omp, ops): node bin/try-fix.js apply shared/playwright/checks/issues/emails-tab-editorial-statistics-says-journal/fix-<app>.diff <app>,
//   then PROBE_RUN=fix … walk.js and PROBE_RUN=nb-in … walk.js neighbour, then revert, and
//   PROBE_RUN=nb-out … walk.js neighbour on the unpatched code.
// Facts: .reports/<feature>/u56a/facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const {openEmailsTab, readStatistics} = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line, dataset: app.dataset, run: process.env.PROBE_RUN || null};
    try {
        await signIn(page, 'rvaca');
        const locale = MODE === 'neighbour' ? 'fr_CA' : 'en';
        const tab = await openEmailsTab(page, app, locale);
        facts.status = tab.status;
        facts.url = tab.url;
        facts.lines = tab.lines;
        facts.statistics = readStatistics(tab.lines, MODE === 'neighbour' ? 'Statistiques éditoriales' : 'Editorial statistics');
        record(`${MODE}-emails-tab`, await screen(page));
        const field = page.locator('#emails').getByText(/Editorial statistics|Statistiques éditoriales/).first();
        await field.scrollIntoViewIfNeeded().catch(() => {});
        await shot(page, `${MODE}-emails-tab`);
    } catch (e) {
        facts.error = String(e.message).slice(0, 400);
    } finally {
        record(MODE === 'steps' ? 'facts' : 'facts-neighbour', facts);
        await close();
    }
});
