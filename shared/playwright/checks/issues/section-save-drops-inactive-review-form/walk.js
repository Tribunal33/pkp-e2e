// U17 A11 issue walk: once a journal deactivates the review form a section has as its "Review
// Form", the section's "Edit" window no longer shows it, and "Save" there, with nothing changed,
// clears the section's form for good: when the form is made active again the section reads "None /
// Free Form Review" and Add Reviewer no longer preselects it for the section's submissions.
// Issue report: docs/issues/U17-A11-section-save-drops-inactive-review-form.md.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), OJS only (a press
// and a preprint server have no "Review Form" on a series or section), journal `publicknowledge`.
// The kit builds nothing: the review forms and the sections' choice are made on screen.
//
// MODE=walk (default), as `dbarnes`:
//   1-2 Settings › Workflow › "Review" › "Review Forms": "u17h13e form A" and "u17h13e form B",
//       each with one "Extended text box" item, made active;
//   3-4 Settings › Journal › "Sections": "Articles" › "Edit", "Review Form" = form A, "Save"; the same on "Reviews";
//   5   submission 12 (in "Articles") › "Add Reviewer", "Select" Aisla McCrae: the "Review Form" list;
//   6   "Review Forms": untick form A's "Active", "OK";
//   7   "Articles" › "Edit": the list; "Save" with nothing changed;
//   8   "Review Forms": tick form A's "Active", "OK";
//   9   "Articles" › "Edit": the list ("Cancel"); "Reviews" › "Edit" (the control, never saved in between);
//   10  submission 12 › "Add Reviewer", "Select" Aisla McCrae: the list.
// MODE=one: the same without form B (no other active form), steps 1, 3-10 ("Reviews" too).
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing: forms A
//   and B made, "Articles" given form A, form A deactivated; then "Reviews" (no form) › "Edit" and
//   "Create Section" must offer "None / Free Form Review" and form B only (form A stays withheld
//   from sections that do not hold it), and "Reviews" "Save" must leave it with no form.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/section-save-drops-inactive-review-form/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a11-facts-<mode>[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const FORM_A = 'u17h13e form A';
const FORM_B = 'u17h13e form B';

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[a11 ${app.name}] no "Review Form" on a series or section: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: L.CASE.id};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`a11-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a11-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[a11 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        return o[key];
    };
    const snapper = (label) => async () => { record(label, await screen(page)); await shot(page, label).catch(() => {}); };
    const formA = () => L.A14.createActiveReviewForm(page, app, {title: FORM_A, items: [{question: 'u17h13e question', type: 'Extended text box'}]});
    const formB = () => L.A14.createActiveReviewForm(page, app, {title: FORM_B, items: [{question: 'u17h13e other question', type: 'Extended text box'}]});
    try {
        await step('signIn', async () => { await signIn(page, 'dbarnes'); return 'dbarnes'; });
        await step('formA', formA);                                                                                         // 1
        if (MODE !== 'one') await step('formB', formB);                                                                     // 2
        await step('articlesGiven', () => L.sectionWindow(page, app, 'Articles', {choose: FORM_A, press: 'Save'}));         // 3
        if (MODE === 'nb') {
            await step('deactivated', () => L.A9.deactivateForm(page, app, FORM_A));
            await step('nbReviews', () => L.sectionWindow(page, app, 'Reviews', {press: 'Save', onOpen: snapper('a11-nb-reviews-edit')}));
            await step('nbCreate', () => L.sectionWindow(page, app, null, {onOpen: snapper('a11-nb-create-section')}));
            await step('nbArticles', () => L.sectionWindow(page, app, 'Articles', {onOpen: snapper('a11-nb-articles-edit')}));
            await step('nbStored', async () => L.storedSections(app));
            return;
        }
        await step('reviewsGiven', () => L.sectionWindow(page, app, 'Reviews', {choose: FORM_A, press: 'Save'}));           // 4
        await step('storedGiven', async () => L.storedSections(app));
        await step('addReviewerBefore', () => L.addReviewerList(page, app, L.CASE.id, L.CASE.reviewer, {onOpen: snapper(`a11-${MODE}-5-add-reviewer`)})); // 5
        await step('deactivated', () => L.A9.deactivateForm(page, app, FORM_A));                                            // 6
        await step('articlesSaved', () => L.sectionWindow(page, app, 'Articles', {press: 'Save', onOpen: snapper(`a11-${MODE}-7-articles-edit`)})); // 7
        await step('storedSaved', async () => L.storedSections(app));
        await step('activated', () => L.activateForm(page, app, FORM_A));                                                    // 8
        await step('articlesAgain', () => L.sectionWindow(page, app, 'Articles', {onOpen: snapper(`a11-${MODE}-9-articles-edit`)})); // 9
        await step('reviewsAgain', () => L.sectionWindow(page, app, 'Reviews', {onOpen: snapper(`a11-${MODE}-9-reviews-edit`)}));
        await step('addReviewerAfter', () => L.addReviewerList(page, app, L.CASE.id, L.CASE.reviewer, {onOpen: snapper(`a11-${MODE}-10-add-reviewer`)})); // 10
        await step('storedEnd', async () => L.storedSections(app));
    } finally {
        record(`a11-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
