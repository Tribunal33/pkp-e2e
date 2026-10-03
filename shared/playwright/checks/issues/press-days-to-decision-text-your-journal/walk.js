// Issue report docs/issues/U65-OMP2-press-days-to-decision-text-your-journal.md (U65 OMP2): the
// report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). The steps create nothing and change nothing.
//
// Default mode, as `dbarnes`: Statistics › "Editorial Activity" (English), the pointer rested on
//   each information icon of the "Trends" table in turn, the text each shows recorded; the one named
//   "Description for Days to First Editorial Decision" is the finding's. OJS is the control ("your
//   journal" is right there); OPS has no such row.
// `neighbour` as the argument (the fix in and out; runs alone; reads only): the same page in French
//   (`/fr_CA/`), every icon's text read the same way. With the fix in and out the French texts and
//   every English text but the press's "Days" one must read the same.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir13 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir13 PROBE_AGENT=ir13 node bin/probe.js all shared/playwright/checks/issues/press-days-to-decision-text-your-journal/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir13-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir13-3_5 PROBE_AGENT=ir13 node bin/probe.js all shared/playwright/checks/issues/press-days-to-decision-text-your-journal/walk.js
// Fix trial (omp): node bin/try-fix.js apply shared/playwright/checks/issues/press-days-to-decision-text-your-journal/fix.diff omp,
//   then PROBE_RUN=fix … walk.js and PROBE_RUN=nb-in … walk.js neighbour, then revert, and
//   PROBE_RUN=nb-out … walk.js neighbour on the unpatched code.
// Facts: .reports/<feature>/ir13/facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const {openEditorial, readIcons} = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';
const DAYS = 'Description for Days to First Editorial Decision';

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line, dataset: app.dataset, run: process.env.PROBE_RUN || null};
    try {
        await signIn(page, 'dbarnes');
        const locale = MODE === 'neighbour' ? 'fr_CA' : 'en';
        facts.opened = await openEditorial(page, app, locale);
        record(`${MODE}-editorial`, await screen(page));
        await shot(page, `${MODE}-editorial`);
        facts.icons = await readIcons(page);
        if (MODE === 'steps') {
            const days = facts.icons.find((i) => i.label === DAYS);
            facts.daysText = days ? days.text : null;
            facts.daysEnding = days && days.text ? days.text.slice(-60) : null;
            if (days) {
                const n = facts.icons.indexOf(days);
                await page.locator('.tooltipButton:visible').nth(n).hover();
                await new Promise((r) => setTimeout(r, 500));
                await shot(page, 'steps-days-icon');
                await page.mouse.move(2, 2);
            }
        }
    } catch (e) {
        facts.error = String(e.message).slice(0, 400);
    } finally {
        record(MODE === 'steps' ? 'facts' : 'facts-neighbour', facts);
        await close();
    }
});
