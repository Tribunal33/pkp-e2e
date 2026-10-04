// Issue report docs/issues/U32-A2-copyedited-files-window-titled-upload-review-file.md (U32 A2):
// "Upload/Select Files" above "Copyedited Files" opens its window titled "Upload Review File",
// where the same button above "Draft Files" opens it titled "Upload/Select Files". Walked through
// the screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// context `publicknowledge`. The kit builds nothing. OPS has no Copyediting stage.
//
// MODE=walk (default), as dbarnes, on the submission in Copyediting (OJS 3, OMP 7):
//   1. sign in as dbarnes   2. open the submission at "Copyediting"
//   3. "Draft Files" › "Upload/Select Files": read the window's title, "Cancel"
//   4. "Copyedited Files" › "Upload/Select Files": read the window's title and list, "Cancel"
// MODE=nb, the neighbour alone (fix trial, with the fix in and out): the review round's
//   "Files for Review" › "Upload/Select Files" (OJS 7, OMP 16, both in review round 1), the
//   third window built from the same configuration, must keep "Current Review Files For Round 1".
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/copyedited-files-window-titled-upload-review-file/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature>-3_5 PROBE_AGENT=<id> node bin/probe.js all …/walk.js
// Fix trial:    PROBE_RUN=fix … (walk); MODE=nb PROBE_RUN=nb-in|nb-out … (neighbour)
// Facts: .reports/<feature>/<id>/a2-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const C = require('../select-files-other-stage-row-actions-refused/lib');

const MODE = process.env.MODE || 'walk';
const CASES = {
    ojs: {copyediting: 3, review: 7},
    omp: {copyediting: 7, review: 16},
};

forEachApp(async (app) => {
    const fact = (k, v) => { record('a2-facts', {[`${MODE}:${k}`]: v}, {merge: true}); console.log('[a2]', app.name, MODE, k, JSON.stringify(v).slice(0, 1200)); };
    const step = async (k, fn, must = false) => {
        try { return await fn(); } catch (e) {
            fact(`${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            if (must) throw e;
            return null;
        }
    };
    const c = CASES[app.name];
    if (!c) { fact('surface', 'none: no Copyediting stage'); return; }

    const {page} = await launch(app);
    await signIn(page, 'dbarnes');                                                                      // 1

    if (MODE === 'nb') {
        await step('open', async () => {
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${c.review}`));
            await idle(page);
            await page.getByRole('heading', {name: 'Files for Review', exact: true, level: 3}).first().waitFor({state: 'visible', timeout: C.T});
            await idle(page);
        }, true);
        await step('window', () => C.openSelect(page, 'Files for Review'), true);
        const w = await step('read', () => C.readSelect(page));
        fact('reviewWindow', w && {title: w.title, rows: w.rows.slice(0, 8)});
        record('a2-nb-review-window', await screen(page));
        await shot(page, 'a2-nb-review-window');
        await step('cancel', () => C.cancel(page));
        return;
    }

    await step('open', () => C.openCopyediting(page, app, c.copyediting), true);                       // 2
    record('a2-copyediting', await screen(page));

    await step('draft-window', () => C.openSelect(page, 'Draft Files'), true);                          // 3
    const d = await step('draft-read', () => C.readSelect(page));
    fact('draftWindow', d && {title: d.title, rows: d.rows.slice(0, 8)});
    record('a2-draft-window', await screen(page));
    await step('draft-cancel', () => C.cancel(page));

    await step('copyedited-window', () => C.openSelect(page, 'Copyedited Files'), true);                // 4
    const w = await step('copyedited-read', () => C.readSelect(page));
    fact('copyeditedWindow', w && {title: w.title, rows: w.rows.slice(0, 8)});
    record('a2-copyedited-window', await screen(page));
    await shot(page, 'a2-copyedited-window');
    await step('copyedited-cancel', () => C.cancel(page));
});
