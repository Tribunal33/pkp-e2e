// U28 A14 issue walk: on a review that carries a review form with a required question, the reviewer
// answers another question and presses "Save for Later"; the step says "Your changes have been
// saved." and, on the same screen, shows the refused submit's box and "This field is required."
// marks. Issue report: docs/issues/U28-A14-review-form-save-for-later-required-fields.md.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal or press
// `publicknowledge`. The kit builds nothing: the review form is made on screen, as the Steps say.
// A preprint server has no review: not walked. Helpers: ./lib.js.
//
// MODE=walk (default), OJS submission 12 / OMP submission 17:
//   1-3 `dbarnes`: Settings › Workflow › "Review" › "Review Forms": "Create Review Form" "u28i review
//       form"; "Edit" › "Form Items": "u28i comments" (Extended text box) and "u28i verdict" (Single
//       line text box, required); the row's "Active" box, "OK";
//   4   the submission's workflow, Julie Janssen's row "Edit", "Review Form" = the form, "OK";
//   5   `jjanssen` opens the review, "Accept Review, Continue to Step #2", "Continue to Step #3";
//   6   types into "u28i comments";
//   7   presses "Save for Later";
//   8   reloads the page.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing. The
//   form is made the same way and given to Paul Hudson:
//   `phudson` on step 3: "Save for Later" with nothing typed; "Submit Review", "OK" with the
//   required question empty (must stay refused, with the box and the mark); "Save for Later" right
//   after the refusal; (journal) "Accept Submission" chosen and an answer typed into "u28i verdict"
//   (the box must go); "Save for Later" again; then `jjanssen`, whose review has no form: "Save
//   for Later" (the notice alone).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/review-form-save-for-later-required-fields/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a14-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const FORM = 'u28i review form';
const OPTIONAL = 'u28i comments';
const REQUIRED = 'u28i verdict';
const ITEMS = [
    {question: OPTIONAL, type: 'Extended text box'},
    {question: REQUIRED, type: 'Single line text box', required: true},
];

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) { console.log(`[a14 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`a14-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a14-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[a14 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        return o[key];
    };
    const snap = async (label) => { record(label, await screen(page)); await shot(page, label).catch(() => {}); };
    const who = MODE === 'nb' ? c.neighbour : c.reviewer;
    try {
        await step('form', async () => { await signIn(page, 'dbarnes'); return L.createActiveReviewForm(page, app, {title: FORM, items: ITEMS}); }); // 1-3
        await step('given', async () => L.giveReviewForm(page, app, c.id, who.name, FORM));                                                          // 4
        await step('open', async () => { await signIn(page, who.username); return L.openStep3(page, app, c.id, {accept: true}); });                  // 5
        await step('fresh', async () => { await snap(`a14-${MODE}-5-step3`); return L.stepMessages(page); });
        if (MODE === 'nb') {
            await step('emptySave', async () => L.saveForLater(page, app));
            await step('reopen', async () => L.openStep3(page, app, c.id));
            await step('refusedSubmit', async () => { const s = await L.submitReview(page, app); await snap('a14-nb-refused-submit'); return s; });
            await step('saveAfterRefusal', async () => L.saveForLater(page, app));
            await step('answered', async () => {
                const rec = page.locator('#reviewStep3Form select[name="reviewerRecommendationId"], #reviewStep3Form select[name="recommendation"]');
                // journal: the other required answer; the list is focused first, so that leaving it for the box checks it, as for a person
                if (await rec.count()) { await rec.focus(); await rec.selectOption({label: 'Accept Submission'}); }
                await L.typeAnswer(page, REQUIRED, 'u28i sound');
                await snap('a14-nb-answered');
                return L.stepMessages(page);
            });
            await step('saveAnswered', async () => L.saveForLater(page, app));
            await step('noFormOpen', async () => { await signIn(page, c.reviewer.username); return L.openStep3(page, app, c.id, {accept: true}); });
            await step('noFormSave', async () => { const s = await L.saveForLater(page, app); await snap('a14-nb-no-form-save'); return s; });
        } else {
            await step('typed', async () => { await L.typeAnswer(page, OPTIONAL, 'u28i first notes'); await snap('a14-6-typed'); return L.stepMessages(page); }); // 6
            await step('saved', async () => { const s = await L.saveForLater(page, app); await snap('a14-7-saved'); return s; });                               // 7
            await step('reloaded', async () => { const r = await L.openStep3(page, app, c.id); await snap('a14-8-reloaded'); return {...r, ...(await L.stepMessages(page))}; }); // 8
        }
    } finally {
        record(`a14-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
