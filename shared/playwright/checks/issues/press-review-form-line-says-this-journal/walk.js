// U27 OMP6 issue walk: on a press, the "Review Details" and "Modify Review" windows introduce a review
// form that has no description of its own with "The questions this journal asks reviewers to answer.".
// Issue report: docs/issues/U27-OMP6-press-review-form-line-says-this-journal.md.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), press (and, as the
// control, journal) `publicknowledge`; the kit builds nothing: the review form is made on screen.
// A preprint server has no review: not walked. Helpers: ../review-details-guidance-promises-upload/lib.js.
//
// MODE=walk (default), OMP submission 17 / OJS submission 12, Julie Janssen's unanswered request:
//   1 `dbarnes`; 2-4 Settings › Workflow › "Review" › "Review Forms": "Create Review Form" "u27k7 review
//   form" (no description), "Edit" › "Form Items": "u27k7 question" (Single line text box); the row's
//   "Active" box, "OK"; 5 the workflow, the row's "Edit", "Review Form" = the form, "OK"; 6-7 the row's
//   "Review Details": the line under the form's heading; 8 "Modify Review", answered "Modify Review":
//   the same line; 9 "Cancel" both windows.
// MODE=nb, the neighbour alone (with a fix in and out): the same steps with a form that has its own
//   description ("u27k7 description"): both windows must show that description, not the default line.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/press-review-form-line-says-this-journal/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/omp6-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../review-details-guidance-promises-upload/lib.js');

const MODE = process.env.MODE || 'walk';
const FORM = MODE === 'nb' ? 'u27k7 described form' : 'u27k7 review form';
const DESCRIPTION = 'u27k7 description';
const ITEMS = [{question: 'u27k7 question', type: 'Single line text box'}];

/** The description box of the open "Create Review Form" / "Review Form" window (a TinyMCE box). */
async function typeFormDescription(page, text) {
    const body = page.frameLocator('form#reviewFormForm iframe[id^="description"]').first().locator('body');
    await body.click();
    await body.pressSequentially(text, {delay: 10});
}

forEachApp(async (app) => {
    const c = L.CASES.open[app.name];
    if (!c) { console.log(`[omp6 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`omp6-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `omp6-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[omp6 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        return o[key];
    };
    const snap = async (label) => { record(label, await screen(page)); await shot(page, label).catch(() => {}); };
    let details = null;
    try {
        await step('form', async () => {                                                                                   // 1-4
            await signIn(page, 'dbarnes');
            if (MODE === 'nb') {
                // the same "Create Review Form" window, with the description typed before its "Save"
                const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
                const proto = Object.getPrototypeOf(new ReviewSettingsPage(page, app.contextPath).forms);
                const keep = proto.saveOpenForm;
                proto.saveOpenForm = async function (title) { await typeFormDescription(page, DESCRIPTION); return keep.call(this, title); };
                try { return await L.createActiveReviewForm(page, app, {title: FORM, items: ITEMS}); } finally { proto.saveOpenForm = keep; }
            }
            return L.createActiveReviewForm(page, app, {title: FORM, items: ITEMS});
        });
        await step('given', async () => L.giveReviewForm(page, app, c.id, c.reviewer, FORM));                              // 5
        await step('details', async () => {                                                                                 // 6-7
            const m = await L.rowMenu(page, c.reviewer, 'Review Details');
            if (!m.dialog) return {menu: m.items, opened: false};
            details = m.dialog;
            await snap(`omp6-${MODE}-6-review-details`);
            const w = await L.readWindow(details);
            return {menu: m.items, title: w.title, block: await L.groupLine(details, FORM), journalLine: /this journal asks reviewers/.test(w.text), text: w.text.slice(0, 1500)};
        });
        await step('modify', async () => {                                                                                  // 8
            if (!details) return {offered: false};
            const m = await L.openModify(page, details);
            if (!m.dialog) return {offered: false};
            await snap(`omp6-${MODE}-8-modify-review`);
            const w = await L.readWindow(m.dialog);
            const out = {offered: true, title: w.title, block: await L.groupLine(m.dialog, FORM), journalLine: /this journal asks reviewers/.test(w.text)};
            await L.cancelWindow(page, m.dialog);                                                                           // 9
            return out;
        });
        await step('closed', async () => { if (details && await details.isVisible()) await L.cancelWindow(page, details); return {ok: true}; });
    } finally {
        record(`omp6-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
