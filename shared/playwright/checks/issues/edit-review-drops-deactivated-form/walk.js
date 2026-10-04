// U29 A9 issue walk: once a review form carried by an open request is deactivated, the reviewer
// row's "Edit" window no longer shows it, and "OK" there, with nothing changed, detaches it: the
// form's "In Review" count drops and the reviewer's step 3 loses the questions and the saved answer.
// Issue report: docs/issues/U29-A9-edit-review-drops-deactivated-form.md.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal or press
// `publicknowledge`. The kit builds nothing: both review forms are made on screen, as the Steps say.
// A preprint server has no review: not walked. Helpers: ./lib.js (and U28 A14's lib, reused).
//
// MODE=walk (default), OJS submission 12 / OMP submission 17:
//   1-2 `dbarnes`: Settings › Workflow › "Review" › "Review Forms": "u29w3 form A" (question
//       "u29w3 question") and "u29w3 form B" (question "u29w3 other question"), each made active;
//   3   the submission's workflow, Julie Janssen's row "Edit", "Review Form" = form A, "OK";
//   4   `jjanssen` accepts, step 3: types "u29w3 answer", "Save for Later";
//   5   `dbarnes`: "Review Forms" (form A "In Review" 1), untick form A's "Active", "OK";
//   6   Julie Janssen's row "Edit": the "Review Form" list;
//   7   "OK" with nothing changed;
//   8   "Review Forms": form A's "In Review";
//   9   `jjanssen` opens step 3.
// MODE=delete: steps 1-7 as above, then the manager `rvaca` presses "Delete" on form A (now 0 / 0)
//   and "OK"; `jjanssen` opens step 3; `dbarnes` opens Julie Janssen's "Edit" again (closed with
//   "Cancel"); the request's stored answers are counted in the database beside the screens.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing: the two
//   forms made the same way, form A deactivated with no request carrying it, then Paul Hudson's row
//   (no form) "Edit": the list must offer "None / Free Form Review" and form B only, and "OK" must
//   leave the request with no form.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/edit-review-drops-deactivated-form/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a9-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const FORM_A = 'u29w3 form A';
const FORM_B = 'u29w3 form B';
const QUESTION = 'u29w3 question';
const ANSWER = 'u29w3 answer';

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) { console.log(`[a9 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`a9-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a9-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[a9 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        return o[key];
    };
    const snap = async (label) => { record(label, await screen(page)); await shot(page, label).catch(() => {}); };
    try {
        await step('formA', async () => { await signIn(page, 'dbarnes'); return L.A14.createActiveReviewForm(page, app, {title: FORM_A, items: [{question: QUESTION, type: 'Extended text box'}]}); }); // 1
        await step('formB', async () => L.A14.createActiveReviewForm(page, app, {title: FORM_B, items: [{question: 'u29w3 other question', type: 'Extended text box'}]})); // 2
        if (MODE === 'nb') {
            await step('deactivated', async () => L.deactivateForm(page, app, FORM_A));
            await step('nbEdit', async () => L.editWindow(page, app, c.id, c.neighbour.name, {press: 'OK', label: `a9-nb-edit-${c.neighbour.username}`}));
            await step('nbStored', async () => L.storedForm(app, c.id, c.neighbour.username));
            await step('nbCounts', async () => L.formsList(page, app));
        } else {
            await step('given', async () => L.A14.giveReviewForm(page, app, c.id, c.reviewer.name, FORM_A));                                   // 3
            await step('step3', async () => { await signIn(page, c.reviewer.username); const r = await L.A14.openStep3(page, app, c.id, {accept: true}); return {...r, ...(await L.step3Read(page))}; }); // 4
            await step('typed', async () => { await L.A14.typeAnswer(page, QUESTION, ANSWER); return L.A14.saveForLater(page, app); });
            await step('countsBefore', async () => { await signIn(page, 'dbarnes'); return L.formsList(page, app); });                       // 5
            await step('deactivated', async () => { const d = await L.deactivateForm(page, app, FORM_A); await snap('a9-5-deactivated'); return d; });
            await step('storedBefore', async () => L.storedForm(app, c.id, c.reviewer.username));
            await step('edit', async () => L.editWindow(page, app, c.id, c.reviewer.name, {press: 'OK', label: 'a9-6-edit-window'})); // 6-7
            await step('storedAfter', async () => L.storedForm(app, c.id, c.reviewer.username));
            if (MODE === 'delete') {
                await step('answersBefore', async () => L.storedAnswers(app, c.id, c.reviewer.username));
                await step('deleted', async () => { await signIn(page, 'rvaca'); const d = await L.deleteForm(page, app, FORM_A); await snap('a9-del-review-forms'); return d; });
                await step('answersAfter', async () => L.storedAnswers(app, c.id, c.reviewer.username));
                await step('step3AfterDelete', async () => { await signIn(page, c.reviewer.username); const r = await L.A14.openStep3(page, app, c.id); await snap('a9-del-step3'); return {...r, ...(await L.step3Read(page))}; });
                await step('editAfterDelete', async () => { await signIn(page, 'dbarnes'); return L.editWindow(page, app, c.id, c.reviewer.name, {press: 'Cancel', label: 'a9-del-edit-window'}); });
                return;
            }
            await step('countsAfter', async () => { const r = await L.formsList(page, app, {controlsOf: FORM_A}); await snap('a9-8-review-forms'); return r; }); // 8
            await step('step3After', async () => { await signIn(page, c.reviewer.username); const r = await L.A14.openStep3(page, app, c.id); await snap('a9-9-step3'); return {...r, ...(await L.step3Read(page))}; }); // 9
        }
    } finally {
        record(`a9-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
