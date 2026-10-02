// U24 A9 issue walk: an address the app does not find shows a bare "404 Not Found" page; the case
// walked is an older workflow address of a submission deleted on screen.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal, press or
// preprint server `publicknowledge`. The kit builds nothing.
//
// MODE=walk (default):
//   1 sign in as dbarnes; 2 (press only) decline submission 3; 3 type `workflow/access/<id>` (it
//   forwards to the workflow); 4 (preprint server: "Production" in the workflow's menu) "Delete", "Confirm"; 5 type `workflow/access/<id>` again;
//   6 the stage-naming addresses of the same submission; 7 the dashboard's address for it;
//   8 signed out, `workflow/access/<id>`.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing:
//   other not-found addresses (an unknown reader item, an unknown page, an unknown context,
//   `workflow/access` without a number and with an unknown one) and what must stay as it is
//   (an address of the legacy `$$$call$$$` kind that names no component, typed by an editor;
//   `workflow/access/<id>` of a live submission forwarding, the dashboard's "Invalid submission."
//   dialog for an unknown number, another author's refusal page, a reader page that exists).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/not-found-page-bare/walk.js
//               MODE=nb PROBE_RUN=nb … the same
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/not-found-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const {flat, look, deleteOpenSubmission} = require('./lib.js');
const D = require('../internal-revisions-request-gives-author-no-task/lib.js');

const MODE = process.env.MODE || 'walk';
const CASES = {
    ojs: {id: 18, decline: false, stage: 1, op: 'submission', live: 7, other: 'ccorino', reader: 'article/view/999999', exists: 'article/view/17'},
    omp: {id: 3, decline: true, stage: 1, op: 'submission', live: 12, other: 'afinkel', reader: 'catalog/book/999999', exists: 'catalog/book/14'},
    ops: {id: 4, decline: false, menu: 'Production', stage: 5, op: 'production', live: 1, other: 'ckwantes', reader: 'preprint/view/999999', exists: 'preprint/view/19'},
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    const ctx = `/index.php/${app.contextPath}/en`;
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    let n = 0;
    const step = async (key, fn, {snap = false} = {}) => {
        try {
            o[key] = await fn();
        } catch (e) {
            o[key] = {threw: flat(e.message, 400)};
        }
        if (snap) {
            const id = `not-found-${MODE}-${String(++n).padStart(2, '0')}-${key}`;
            record(id, await screen(page).catch((e) => ({url: page.url(), error: flat(e.message)})));
            await shot(page, id).catch(() => {});
        }
        console.log(`[not-found ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
    };
    try {
        if (MODE === 'walk') {
            await signIn(page, 'dbarnes');                                                                  // 1
            if (c.decline) {                                                                                // 2
                await step('2-decline', async () => {
                    await D.openEditorial(page, app, c.id, 'Decline Submission');
                    return D.recordDecision(page, 'Decline Submission');
                });
            }
            await step('3-access-before', () => look(page, app, `${ctx}/workflow/access/${c.id}`), {snap: true}); // 3
            await step('4-delete', () => deleteOpenSubmission(page, c.menu), {snap: true});                  // 4
            await step('5-access-after', () => look(page, app, `${ctx}/workflow/access/${c.id}`), {snap: true}); // 5
            await step('6-index', () => look(page, app, `${ctx}/workflow/index/${c.id}/${c.stage}`), {snap: true}); // 6
            await step(`6-${c.op}`, () => look(page, app, `${ctx}/workflow/${c.op}/${c.id}`));
            await step('7-dashboard', () => look(page, app, `${ctx}/dashboard/editorial?workflowSubmissionId=${c.id}`), {snap: true}); // 7
            await signOut(page).catch(async () => { await page.context().clearCookies(); });                // 8
            await step('8-visitor-access', () => look(page, app, `${ctx}/workflow/access/${c.id}`), {snap: true});
        } else {
            await step('visitor-reader-unknown', () => look(page, app, `${ctx}/${c.reader}`), {snap: true});
            await step('visitor-reader-exists', () => look(page, app, `${ctx}/${c.exists}`));
            await step('visitor-unknown-page', () => look(page, app, `${ctx}/nosuchpage`), {snap: true});
            await step('visitor-unknown-context', () => look(page, app, `/index.php/nosuchcontext/en/about`), {snap: true});
            await step('visitor-access-unknown', () => look(page, app, `${ctx}/workflow/access/999999`));
            await signIn(page, 'dbarnes');
            await step('editor-access-live', () => look(page, app, `${ctx}/workflow/access/${c.live}`));
            await step('editor-access-noNumber', () => look(page, app, `${ctx}/workflow/access`), {snap: true});
            await step('editor-access-unknown', () => look(page, app, `${ctx}/workflow/access/999999`), {snap: true});
            await step('editor-unknown-component', () => look(page, app, `${ctx}/$$$call$$$/grid/nosuch/no-such-grid/fetch-grid`), {snap: true});
            await step('editor-dashboard-unknown', () => look(page, app, `${ctx}/dashboard/editorial?workflowSubmissionId=999999`), {snap: true});
            await signIn(page, c.other);
            await step('otherAuthor-access-live', () => look(page, app, `${ctx}/workflow/access/${c.live}`), {snap: true});
            await step('author-access-unknown', () => look(page, app, `${ctx}/workflow/access/999999`), {snap: true});
        }
    } catch (e) {
        o.error = flat(e.stack || e.message, 800);
    } finally {
        record(`not-found-facts-${MODE}`, o);
        await Promise.race([idle(page).catch(() => {}), new Promise((done) => setTimeout(done, 5000))]);
        await close();
    }
});
