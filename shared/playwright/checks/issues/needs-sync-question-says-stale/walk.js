// Issue report docs/issues/U45-A14-needs-sync-question-says-stale.md (U45
// A14): the "Mark DOIs Needs Sync" window asks to mark the records "as
// stale", a word the DOIs page uses nowhere else. Takes the report's Steps
// through the screens on a dataset fleet freshly reset to PKP's default test
// dataset, as the dataset's `dbarnes` on `publicknowledge`. The kit builds
// nothing, and the walk changes nothing (the one confirmed action is refused).
//
//   1. sign in as dbarnes
//   2. side menu "DOIs"
//   3. tick the published work (OJS 17, OMP 5, OPS 2)
//   4. "Bulk Actions" › "Mark DOIs Needs Sync": read the window
// Neighbours (what a fix to the question must leave alone):
//   a. "Cancel"; "Bulk Actions" › "Mark DOIs Unregistered": its question; "Cancel"
//   b. "Bulk Actions" › "Mark DOIs Registered": its question; "Cancel"
//   c. "Bulk Actions" › "Mark DOIs Needs Sync" › "Mark DOIs Needs Sync": the
//      work has no submitted DOI, so "DOI Updates Failed" lists it; "OK"
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=ir20 node bin/probe.js all shared/playwright/checks/issues/needs-sync-question-says-stale/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the line fleet's
//               feature, and PROBE_RUN=r35 in front of the run.
// PROBE_RUN=fix names the run with fix.diff applied.
// Facts: .reports/<feature>/ir20/stale-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const count = (text, re) => (String(text).match(re) || []).length;

const PUBLISHED = {ojs: 17, omp: 5, ops: 2};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoisPage} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const pub = PUBLISHED[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1600)}`);
    };

    const {page, close} = await launch(app);
    try {
        const dois = new DoisPage(page, app.contextPath);

        /** Choose a bulk action and read its window: heading, question, buttons. */
        const ask = async (step, label) => {
            const dialog = await dois.chooseBulkAction(label);
            const s = await screen(page);
            record(`stale-${step}${run}`, s);
            await shot(page, `stale-${step}${run}`).catch(() => {});
            const text = flat(await dialog.innerText());
            return {
                dialog,
                read: {
                    heading: flat(await dialog.getByRole('heading').first().innerText()),
                    window: text,
                    buttons: (await dialog.getByRole('button').allInnerTexts()).map((t) => flat(t)).filter(Boolean),
                    staleInWindow: count(text, /stale/gi),
                },
            };
        };
        const cancel = async (dialog) => {
            await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
            await expect(page.getByRole('dialog')).toHaveCount(0, {timeout: T});
        };

        // 1-2
        await signIn(page, 'dbarnes');
        await dois.goto();
        const before = await screen(page);
        record(`stale-page${run}`, before);
        await dois.openBulkActions();
        const labels = await dois.bulkLabels();
        await dois.closeBulkActions();
        fact('the page before the window', {
            tabs: (await page.getByRole('tab').allInnerTexts()).map((t) => flat(t)),
            bulkActions: labels,
            filters: (await page.locator('.listPanel__sidebar').getByRole('button').allInnerTexts()).map((t) => flat(t)).filter(Boolean),
            staleOnPage: count(before.text, /stale/gi),
            needsSyncOnPage: count(before.text, /needs sync/gi),
            badge: flat(await dois.rowBadge(dois.row(pub)).innerText()),
        });

        // 3-4
        await dois.tick([pub]);
        const q = await ask('needs-sync', 'Mark DOIs Needs Sync');
        fact('step 4: Mark DOIs Needs Sync window', q.read);
        await cancel(q.dialog);

        // Neighbours a, b
        await dois.tick([pub]);
        const u = await ask('nb-unregistered', 'Mark DOIs Unregistered');
        fact('neighbour a: Mark DOIs Unregistered window', u.read);
        await cancel(u.dialog);
        await dois.tick([pub]);
        const r = await ask('nb-registered', 'Mark DOIs Registered');
        fact('neighbour b: Mark DOIs Registered window', r.read);
        await cancel(r.dialog);

        // Neighbour c: confirmed, and refused for a work with no submitted DOI
        await dois.tick([pub]);
        const c = await ask('nb-confirm', 'Mark DOIs Needs Sync');
        const response = await dois.confirmAction(c.dialog, 'Mark DOIs Needs Sync');
        await idle(page);
        const failed = dois.failedDialog();
        await expect(failed).toBeVisible({timeout: T});
        record(`stale-nb-failed${run}`, await screen(page));
        const failedText = flat(await failed.innerText());
        fact('neighbour c: Mark DOIs Needs Sync confirmed', {
            status: response.status(),
            window: failedText,
            staleInWindow: count(failedText, /stale/gi),
        });
        await dois.closeFailedDialog();
        fact('badge after', flat(await dois.rowBadge(dois.row(pub)).innerText()));
    } finally {
        record(`stale-facts${run}`, facts);
        await close();
    }
});
