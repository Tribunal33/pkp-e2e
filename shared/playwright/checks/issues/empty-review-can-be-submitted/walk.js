// U28 A7 issue walk: a reviewer submits a review with nothing typed in either box and no file under
// "Reviewer Files"; the review goes through (on a journal once a recommendation is chosen) and the
// editor gets a submitted review that holds nothing. Issue report:
// docs/issues/U28-A7-empty-review-can-be-submitted.md. On PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"), journal or press `publicknowledge`. The kit builds nothing.
// A preprint server has no review: not walked. Helpers: ./lib.js.
//
// MODE=walk (default), as `jjanssen` on OJS submission 12 / OMP submission 17:
//   1 open the review; 2 "Accept Review, Continue to Step #2", "Continue to Step #3"; 3 nothing typed,
//   nothing uploaded, "Submit Review", "OK"; 4 (journal) choose "Accept Submission", "Submit Review",
//   "OK"; 5 `dbarnes` opens the workflow and presses "Read Review" on Julie Janssen's row.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing:
//   `phudson` on the same submission: "Save for Later" with nothing typed still saves; then a text in
//   the editor-only box alone and "Submit Review" reaches "Review Submitted";
//   `amccrae` on OJS submission 20 / `agallego` on OMP submission 18: one file under "Reviewer
//   Files", no text, "Submit Review" reaches "Review Submitted".
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/empty-review-can-be-submitted/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a7-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const CASES = {
    ojs: {id: 12, recommendation: 'Accept Submission', reviewer: 'jjanssen', name: 'Julie Janssen', nb: 'phudson', nbName: 'Paul Hudson',
        fileId: 20, fileReviewer: 'amccrae', fileName: 'Aisla McCrae', editorMail: 'dbarnes@mailinator.com'},
    omp: {id: 17, recommendation: null, reviewer: 'jjanssen', name: 'Julie Janssen', nb: 'phudson', nbName: 'Paul Hudson',
        fileId: 18, fileReviewer: 'agallego', fileName: 'Adela Gallego', editorMail: 'dbarnes@mailinator.com'},
};
const NB_TEXT = 'u28f text for the editor only';
const NB_FILE = 'u28f-review-file.txt';

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[a7 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`a7-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a7-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[a7 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        return o[key];
    };
    const snap = async (label) => { record(label, await screen(page)); await shot(page, label).catch(() => {}); };
    const mailSince = async (since) => {
        // the review-complete mail goes to the editors assigned to the submission's stage
        const hit = await app.mail.find({to: c.editorMail, subject: 'Review complete', since, timeoutMs: 8000}).catch(() => null);
        return hit ? {subject: hit.Subject, to: (hit.To || []).map((t) => t.Address)} : null;
    };
    const editor = async (id, name) => {
        await signIn(page, 'dbarnes');
        return L.editorReadsReview(page, app, id, name);
    };
    try {
        if (MODE === 'nb') {
            await step('open', async () => { await signIn(page, c.nb); return L.openStep3(page, app, c.id, {accept: true}); });
            await step('emptySave', async () => ({...(await L.saveForLater(page)), rows: L.savedRows(app, c.id, c.nb)}));
            await step('editorOnlyText', async () => {
                await L.typeBoxes(page, app, {editor: NB_TEXT});
                const s = await L.submitAndRead(page, app, {recommendation: c.recommendation});
                await snap('a7-nb-editor-only-text');
                return {...s, rows: L.savedRows(app, c.id, c.nb)};
            });
            await step('fileOpen', async () => { await signIn(page, c.fileReviewer); return L.openStep3(page, app, c.fileId, {accept: true}); });
            await step('fileOnly', async () => {
                const up = await L.uploadFile(page, app, NB_FILE);
                const before = await L.stepState(page, app);
                const s = await L.submitAndRead(page, app, {recommendation: c.recommendation});
                await snap('a7-nb-file-only');
                return {...up, before: {author: before.author, editor: before.editor, reviewerFiles: before.reviewerFiles}, ...s};
            });
        } else {
            await step('open', async () => { await signIn(page, c.reviewer); return L.openStep3(page, app, c.id, {accept: true}); }); // 1, 2
            await step('labels', async () => L.boxLabels(page));
            await step('before', async () => { await snap('a7-2-step3-empty'); return L.stepState(page, app); });
            const since = new Date();
            await step('submitEmpty', async () => {                                                                                // 3
                const s = await L.submitAndRead(page, app);
                await snap('a7-3-submit-empty');
                return {...s, rows: L.savedRows(app, c.id, c.reviewer)};
            });
            if (c.recommendation && !(o.submitEmpty || {}).completed) {
                await step('submitRecommended', async () => {                                                                      // 4
                    const s = await L.submitAndRead(page, app, {recommendation: c.recommendation});
                    await snap('a7-4-submit-recommended');
                    return {...s, rows: L.savedRows(app, c.id, c.reviewer)};
                });
            }
            await step('mail', async () => mailSince(since));
            await step('editor', async () => {                                                                                     // 5
                const r = await editor(c.id, c.name);
                await snap('a7-5-editor');
                return r;
            });
        }
    } finally {
        record(`a7-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
