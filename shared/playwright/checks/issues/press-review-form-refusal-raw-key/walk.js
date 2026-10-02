// U28 OMP3 issue walk: on a press, a review that carries a review form with a required question is
// refused at "Submit Review" › "OK" with a box whose first line is the raw text code
// "##reviewer.submission.reviewFormResponse.form.responseRequired##"; a journal (the control) reads
// "Please fill in required fields." there.
// Issue report: docs/issues/U28-OMP3-press-review-form-refusal-raw-key.md.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal or press
// `publicknowledge`. The kit builds nothing: the review form is made on screen, as the Steps say.
// A preprint server has no review: not walked. Helpers: the U28 A14 walk's lib.js
// (../review-form-save-for-later-required-fields/lib.js), which drives the same screens.
//
// MODE=walk (default), OMP submission 17 / OJS submission 12:
//   1-3 `dbarnes`: Settings › Workflow › "Review" › "Review Forms": "Create Review Form" "u28l review
//       form"; "Edit" › "Form Items": "u28l verdict" (Single line text box, required); the row's
//       "Active" box, "OK";
//   4   the submission's workflow, Julie Janssen's row "Edit", "Review Form" = the form, "OK";
//   5   `jjanssen` opens the review, "Accept Review, Continue to Step #2", "Continue to Step #3";
//   6   "Submit Review", "OK" with "u28l verdict" empty: the box under the buttons is read.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing. The
//   form is made the same way and given to Paul Hudson: `phudson` types an answer into "u28l
//   verdict" (journal: chooses "Accept Submission" too), "Submit Review", "OK": the review must be
//   submitted, with no box.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp,ojs shared/playwright/checks/issues/press-review-form-refusal-raw-key/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/omp3-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../review-form-save-for-later-required-fields/lib.js');

const MODE = process.env.MODE || 'walk';
const FORM = 'u28l review form';
const REQUIRED = 'u28l verdict';
const ITEMS = [{question: REQUIRED, type: 'Single line text box', required: true}];

/** The box under the buttons, its two lines apart, as the page holds them. */
async function boxLines(page) {
    return page.locator('#reviewStep3MessageBox').evaluate((box) => {
        const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());
        const shown = !!(box.offsetWidth || box.offsetHeight);
        const t = box.querySelector('.title');
        const d = box.querySelector('.description');
        return {shown, title: t ? flat(t.textContent) : null, description: d ? flat(d.textContent) : null};
    }).catch((e) => ({missing: String(e.message).slice(0, 120)}));
}

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) { console.log(`[omp3 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`omp3-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `omp3-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[omp3 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        return o[key];
    };
    const snap = async (label) => { record(label, await screen(page)); await shot(page, label).catch(() => {}); };
    const who = MODE === 'nb' ? c.neighbour : c.reviewer;
    try {
        await step('form', async () => { await signIn(page, 'dbarnes'); return L.createActiveReviewForm(page, app, {title: FORM, items: ITEMS}); }); // 1-3
        await step('given', async () => L.giveReviewForm(page, app, c.id, who.name, FORM));                                                          // 4
        await step('open', async () => { await signIn(page, who.username); return L.openStep3(page, app, c.id, {accept: true}); });                  // 5
        await step('fresh', async () => { await snap(`omp3-${MODE}-5-step3`); return {...(await L.stepMessages(page)), boxLines: await boxLines(page)}; });
        if (MODE === 'nb') {
            await step('answered', async () => {
                const rec = page.locator('#reviewStep3Form select[name="reviewerRecommendationId"], #reviewStep3Form select[name="recommendation"]');
                if (await rec.count()) { await rec.focus(); await rec.selectOption({label: 'Accept Submission'}); } // journal: the other required answer
                await L.typeAnswer(page, REQUIRED, 'u28l sound');
                return L.stepMessages(page);
            });
            await step('submitted', async () => { const s = await L.submitReview(page, app); await snap('omp3-nb-submitted'); return {...s, boxLines: s.completed ? null : await boxLines(page)}; });
        } else {
            await step('refused', async () => {                                                                                                     // 6
                const s = await L.submitReview(page, app);
                await snap('omp3-6-refused');
                return {...s, boxLines: await boxLines(page)};
            });
        }
    } finally {
        record(`omp3-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
