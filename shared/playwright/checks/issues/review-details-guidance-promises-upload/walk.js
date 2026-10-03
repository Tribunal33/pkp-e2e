// U27 A22 issue walk: the "Review Details" window's guidance tells the editor they "may upload the
// file below", but the window has no upload control; "Upload" is only in the "Modify Review" window.
// Issue report: docs/issues/U27-A22-review-details-guidance-promises-upload.md.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal or press
// `publicknowledge`; the kit builds nothing. A preprint server has no review: not walked.
// Helpers: ./lib.js.
//
// MODE=walk (default), OJS submission 7 (Paul Hudson) / OMP submission 16 (Adela Gallego):
//   1 `dbarnes`; 2 the submission's workflow; 3 "Read Review" on the reviewer's completed review;
//   4 the guidance paragraph and every upload control of the window; 5 "Modify Review", answered
//   "Modify Review", its controls; 6 "Cancel" both windows.
// MODE=nb, the neighbour alone (with a fix in and out): the same window with the interface in
//   French (/fr_CA/ in the address): the paragraph must read the same with and without the fix,
//   since the fix changes the English text only.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/review-details-guidance-promises-upload/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a22-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const GUIDANCE = /^Once this review has been read|^Une fois/;

forEachApp(async (app) => {
    const c = L.CASES.done[app.name];
    if (!c) { console.log(`[a22 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`a22-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a22-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[a22 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        return o[key];
    };
    const snap = async (label) => { record(label, await screen(page)); await shot(page, label).catch(() => {}); };
    let details = null;
    try {
        await step('signIn', async () => { await signIn(page, 'dbarnes'); return {ok: true}; });                          // 1
        if (MODE === 'nb') {
            await step('workflow', async () => {
                await page.goto('about:blank');
                await page.goto(app.url(`/index.php/${app.contextPath}/fr_CA/dashboard/editorial?workflowSubmissionId=${c.id}`));
                await page.locator('[data-cy="reviewer-manager"]').waitFor({timeout: L.T});
                await idle(page);
                return {url: page.url()};
            });
            const readLabel = "Consulter l'évaluation"; // editor.review.readReview, fr_CA
            await step('readFr', async () => {
                const row = L.reviewerRow(page, c.reviewer);
                await row.getByRole('button', {name: readLabel, exact: true}).click();
                details = await L.awaitTopDialog(page, c.reviewer);
                await snap('a22-nb-details-fr');
                const w = await L.readWindow(details);
                return {button: L.flat(readLabel, 60), title: w.title, guidance: await L.paragraph(details, GUIDANCE)};
            });
            return;
        }
        await step('workflow', async () => { await L.openWorkflow(page, app, c.id); return {url: page.url()}; });          // 2
        await step('details', async () => {                                                                                 // 3-4
            details = await L.openReadReview(page, c.reviewer);
            await snap('a22-3-review-details');
            const w = await L.readWindow(details);
            return {...w, guidance: await L.paragraph(details, GUIDANCE)};
        });
        await step('modify', async () => {                                                                                  // 5
            const m = await L.openModify(page, details);
            if (!m.dialog) return {offered: false};
            await snap('a22-5-modify-review');
            const w = await L.readWindow(m.dialog);
            const out = {offered: true, confirm: m.confirm, title: w.title, buttons: w.buttons, uploadControls: w.uploadControls, fileInputs: w.fileInputs,
                description: await L.paragraph(m.dialog, /^You are modifying/)};
            await L.cancelWindow(page, m.dialog);                                                                           // 6
            return out;
        });
        await step('closed', async () => { if (details && await details.isVisible()) await L.cancelWindow(page, details); return {ok: true}; });
    } finally {
        record(`a22-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
