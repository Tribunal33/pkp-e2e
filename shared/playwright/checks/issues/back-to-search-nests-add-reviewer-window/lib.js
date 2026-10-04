// Helpers of walk.js (issue report docs/issues/U31-A10-back-to-search-nests-add-reviewer-window.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle, signIn, signOut} = require('../../../probe');
const S = require('../section-editors-not-assigned-second-journal/lib.js');
const W = require('../wizard-refused-save-hangs-saving/lib.js');
const R = require('../reviewer-own-round-listed-under-previous-reviews/lib.js');

const {T, sleep, flat} = S;

/** Per-app dataset facts the steps use. */
const WORDS = {
    ojs: {author: 'ccorino', section: 'Articles', series: null, decision: 'Send for Review', reviewer: 'Julie Janssen', roleReviewer: {name: 'Paul Hudson', email: 'phudson@mailinator.com'}},
    omp: {author: 'aclark', section: null, series: 'Library & Information Studies', decision: 'Send to External Review', reviewer: 'Adela Gallego', roleReviewer: {name: 'Gonzalo Favio', email: 'gfavio@mailinator.com'}},
};

/** The no-account suggestion the steps name. */
const QUINN = {givenName: 'Quinn', familyName: 'u31q5', email: 'quinn.u31q5@mailinator.com', affiliation: 'u31q5 University', reason: 'Knows the field well.'};

/** As the signed-in manager: Settings › Workflow › "Review" › "Setup", tick the suggestion box, "Save". */
async function enableSuggestions(page, app) {
    const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
    const p = new ReviewSettingsPage(page, `${app.contextPath}${S.L(app)}`);
    await p.goto('Setup');
    const box = p.setup.checkbox('Allow authors to suggest potential reviewers at submission process');
    const was = await box.isChecked();
    if (!was) await box.check();
    await p.setup.save();
    return {was, now: await box.isChecked()};
}

/**
 * As the signed-in author: "New Submission" with `title`, every step as the rail orders it, and on
 * "Reviewer Suggestions" one "Add Reviewer Suggestion" per entry of `suggestions`; then "Submit".
 * Returns {id, steps, problems}.
 */
async function submitWithSuggestions(page, app, {title, suggestions}) {
    const {expect} = require('@playwright/test');
    const path = require('path');
    const {ReviewerSuggestionStep} = require('../../../pages/ReviewerSuggestionPages.js');
    const w = WORDS[app.name];
    const ojs = app.name === 'ojs';
    const ctx = app.contextPath;
    const id = await S.beginSubmission(page, app, ctx, {title, section: w.section});
    const P = ojs ? null : require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const O = ojs ? new (require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js')).SubmissionWizardPage)(page, ctx) : null;
    const done = new Set();
    const steps = [];
    for (let i = 0; i < 12; i++) {
        const step = (await W.currentStep(page)).replace(/^\d+\s*/, '');
        if (/(^|\s)Review$/.test(step)) break;
        if (!done.has(step)) {
            done.add(step);
            steps.push(step);
            if (step === 'Upload Files') {
                if (ojs) await O.uploadFile();
                else await P.uploadWizardFile(page, 'u31q5-manuscript.txt');
            } else if (step === 'Details') {
                await S.typeAbstract(page, 'An abstract for the u31q5 walk.');
            } else if (step === 'For the Editors' && app.name === 'omp' && w.series) {
                await page.getByRole('radio', {name: w.series, exact: true}).check();
                await idle(page);
            } else if (step === 'Reviewer Suggestions') {
                const st = new ReviewerSuggestionStep(page);
                for (const s of suggestions) {
                    const win = await st.openAdd();
                    await win.fill(s);
                    await win.save();
                    await expect(st.entry(s.email)).toBeVisible({timeout: T});
                }
            }
        }
        await W.pressContinue(page);
        await idle(page);
        await sleep(500);
    }
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    const problems = flat(await page.locator('.submissionWizard__review_errors').innerText({timeout: 3000}).catch(() => ''), 600);
    if (problems) return {id, steps, problems};
    if (ojs) await O.submitAndConfirm();
    else await P.confirmSubmit(page);
    await expect(page.getByRole('heading', {name: 'Submission complete'})).toBeVisible({timeout: T});
    return {id, steps, problems: ''};
}

/** The whole setup of the steps 1-4: setting on, the author's submission with `suggestions`, sent to review. */
async function setUp(page, app, {title, suggestions}) {
    const out = {};
    await signIn(page, 'dbarnes');
    out.setting = await enableSuggestions(page, app);
    await signOut(page);
    await signIn(page, WORDS[app.name].author);
    out.submission = await submitWithSuggestions(page, app, {title, suggestions});
    await signOut(page);
    await signIn(page, 'dbarnes');
    const modal = await R.openWorkflow(page, app, out.submission.id);
    out.decision = await R.recordDecision(page, modal, WORDS[app.name].decision);
    return out;
}

/** Every open "Add Reviewer" window, those under the top one (aria-hidden) included. */
function windows(page) {
    return page.getByRole('dialog', {name: /^Add Reviewer$/, includeHidden: true});
}

/**
 * The state of every open "Add Reviewer" window, outermost first: its headings, whether it carries
 * the suggestions list and "Locate a Reviewer", the "Selected Reviewer" readout, and its text.
 * Plus page-wide counts of the legacy form's fixed-id containers.
 */
async function windowsState(page) {
    const n = await windows(page).count();
    const list = [];
    for (let i = 0; i < n; i++) {
        const d = windows(page).nth(i);
        const st = {};
        try {
            st.headings = (await d.locator('h1, h2, h3, h4, legend').allInnerTexts()).map((t) => flat(t, 100)).filter(Boolean);
            st.suggestionLists = await d.locator('.listPanel').filter({hasText: 'Select a Reviewer from Reviewer Suggestions'}).count();
            st.locateLists = await d.locator('.listPanel--selectReviewer').count();
            st.searchContainers = await d.locator('[id="advancedReviewerSearch"]').count();
            st.nestedSearchContainers = await d.locator('[id="advancedReviewerSearch"] [id="advancedReviewerSearch"], form [id="advancedReviewerSearch"], #createReviewerForm [id="advancedReviewerSearch"], #enrollExistingReviewerForm [id="advancedReviewerSearch"]').count();
            st.selected = await d.locator('[id^="selectedReviewerName"]').evaluateAll((els) =>
                els.map((e) => ({text: e.textContent.trim(), visible: !!(e.offsetWidth || e.offsetHeight)}))
            );
            st.createHeading = await d.getByRole('heading', {name: 'Create New Reviewer', exact: true}).count();
            st.backToSearch = await d.getByRole('link', {name: 'Back to Search', exact: true}).count();
            st.text = flat(await d.innerText(), 1500);
        } catch (e) {
            st.error = flat(e.message, 300);
        }
        list.push(st);
    }
    const page_ = await page.evaluate(() => ({
        advancedReviewerSearch: document.querySelectorAll('[id="advancedReviewerSearch"]').length,
        advancedSearchReviewerForm: document.querySelectorAll('[id="advancedSearchReviewerForm"]').length,
        regularReviewerForm: document.querySelectorAll('[id="regularReviewerForm"]').length,
        reviewerIdInputs: document.querySelectorAll('input[id="reviewerId"]').length,
    }));
    return {count: n, windows: list, page: page_};
}

/** On the open workflow (Review stage): the Reviewers panel's "Add Reviewer"; waits for the window's lists. */
async function openAddReviewer(page, modal) {
    await modal.locator('[data-cy="reviewer-manager"]').getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    const win = windows(page).last();
    await win.locator('.listPanel--selectReviewer').first().waitFor({timeout: T});
    await idle(page);
    const {waitForRequestEditors} = require('../../../pages/ReviewerSuggestionPages.js');
    await waitForRequestEditors(page).catch(() => {});
    await sleep(800);
    return win;
}

/** In the topmost window: the suggestion entry by name, its "Select Reviewer" pressed. Waits for the window count to settle. */
async function selectSuggestion(page, name) {
    const top = windows(page).last();
    const entry = top.locator('.listPanel').filter({hasText: 'Select a Reviewer from Reviewer Suggestions'}).first()
        .locator('.listPanel__item').filter({hasText: name});
    await entry.locator('button').filter({hasText: /Select Reviewer/}).click();
    await settle(page);
}

/** In the topmost window: "Locate a Reviewer", the reviewer's "Select Reviewer" (a name search first). */
async function selectFromLocate(page, name) {
    const top = windows(page).last();
    const panel = top.locator('.listPanel--selectReviewer').last();
    const box = panel.locator('input.pkpSearch__input');
    if (await box.count()) {
        await box.fill(name);
        await box.press('Enter');
        await idle(page);
    }
    const item = panel.locator('.listPanel__item').filter({hasText: name}).first();
    await item.waitFor({timeout: T});
    await item.locator('button').filter({hasText: /Select Reviewer/}).click();
    await settle(page);
}

/** Wait out the legacy window loads: idle, the editors, and two equal window counts. */
async function settle(page) {
    await idle(page).catch(() => {});
    let last = -1;
    for (let i = 0; i < 20; i++) {
        const n = await windows(page).count();
        if (n === last) break;
        last = n;
        await sleep(700);
    }
    const {waitForRequestEditors} = require('../../../pages/ReviewerSuggestionPages.js');
    await waitForRequestEditors(page).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(500);
}

/** Close every open "Add Reviewer" window from the top with its header "Close". */
async function closeAll(page) {
    for (let i = 0; i < 6; i++) {
        const n = await windows(page).count();
        if (!n) return;
        await windows(page).last().getByRole('button', {name: /^Close$/}).first().click().catch(() => {});
        await sleep(900);
    }
}

module.exports = {T, sleep, flat, WORDS, QUINN, enableSuggestions, submitWithSuggestions, setUp, windows, windowsState, openAddReviewer, selectSuggestion, selectFromLocate, settle, closeAll, openWorkflow: R.openWorkflow};
