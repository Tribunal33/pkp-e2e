// Helpers of walk.js here (U31 A8) and of ../suggestion-added-reviewer-leaves-blank-row/walk.js
// (U31 A9): the Add Reviewer window's "Select a Reviewer from Reviewer Suggestions" list, reached
// from PKP's default test dataset through the screens (the setting switched on, an author's
// submission with two suggestions, the editor's send-to-review decision).
// Requiring this file runs nothing. Every helper drives the screens a person uses; sql() is used
// only to find the ids a person reads off the screen (the new submission, its review round).
const path = require('path');
const {idle, screen, record, shot, sql} = require('../../../probe');
const {typeRich, currentStep, pressContinue} = require('../wizard-refused-save-hangs-saving/lib.js');
const U20 = require('../author-tags-given-name-alone-other-language/lib.js');
const C = require('../copyediting-no-assign-copyeditor-notice/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const TITLE = 'Reviewer suggestions u31q4';
const SUGGESTIONS = [
    {givenName: 'Nova', familyName: 'Newcomer', email: 'nova.u31q4@mailinator.com', affiliation: 'Newcomer University', reason: 'Works on this topic.'},
    {givenName: 'Kim', familyName: 'Keeper', email: 'kim.u31q4@mailinator.com', affiliation: 'Keeper Institute', reason: 'Knows the method.'},
];
const NOVA_USERNAME = 'u31q4nova';
/** Per-app words: the dataset's author account and the decision that opens (external) review. */
const WORDS = {
    ojs: {author: 'ccorino', section: 'Articles', decision: 'Send for Review'},
    omp: {author: 'aclark', section: null, decision: 'Send to External Review'},
};

async function snap(page, name) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), error: flat(e.message, 200)};
    }
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

/** As a manager: Settings › Workflow › "Review" › "Setup", tick the reviewer-suggestion box, "Save". */
async function enableSuggestions(page, app) {
    const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
    const s = new ReviewSettingsPage(page, app.contextPath);
    await s.goto('Setup');
    const box = s.setup.checkbox('Allow authors to suggest potential reviewers at submission process');
    await box.waitFor({state: 'visible', timeout: T});
    const before = await box.isChecked();
    if (!before) await box.check();
    await s.setup.save();
    return {before, after: await box.isChecked()};
}

/**
 * As the author: "Make a Submission" (English), a file, "Continue" to "Reviewer Suggestions", each
 * suggestion through "Add Reviewer Suggestion" and "Save", "Continue" to "Review", "Submit".
 * Returns {id, steps, entries}.
 */
async function submitWithSuggestions(page, app, {title = TITLE, suggestions = SUGGESTIONS} = {}) {
    const {ReviewerSuggestionStep} = require('../../../pages/ReviewerSuggestionPages.js');
    const w = WORDS[app.name];
    const {id} = await U20.beginInLanguage(page, app, {title, section: w.section, language: 'English'});
    const ojs = app.name === 'ojs';
    const W = ojs ? null : require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const O = ojs ? new (require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js')).SubmissionWizardPage)(page, app.contextPath) : null;
    const out = {id, steps: []};
    const done = new Set();
    for (let i = 0; i < 12; i++) {
        const step = (await currentStep(page)).replace(/^\d+\s*/, '');
        if (/(^|\s)Review$/.test(step)) break;
        if (!done.has(step)) {
            done.add(step);
            out.steps.push(step);
            if (step === 'Upload Files') {
                if (ojs) await O.uploadFile();
                else await W.uploadWizardFile(page, 'u31q4-manuscript.txt');
            } else if (step === 'Details') {
                const box = 'titleAbstract-abstract-control-en';
                if (await page.locator(`#${box}_ifr`).count()) await typeRich(page, box, 'An abstract for u31q4.');
            } else if (step === 'Reviewer Suggestions') {
                const st = new ReviewerSuggestionStep(page);
                for (const sg of suggestions) {
                    const win = await st.openAdd();
                    await win.fill(sg);
                    await win.save();
                }
                out.entries = (await st.entries().allInnerTexts()).map((t) => flat(t, 200));
                await snap(page, 'wizard-suggestions');
            }
        }
        await pressContinue(page);
        await idle(page);
        await sleep(500);
    }
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    await U20.submit(page, app);
    return out;
}

/** As the editor: the submission's workflow, the decision that opens (external) review, through "Record Decision". */
async function sendToReview(page, app, id) {
    await C.openWorkflow(page, app, id);
    return C.decide(page, WORDS[app.name].decision);
}

/** The submission named `title` (the newest), as the dashboard lists it. */
function submissionId(app, title = TITLE) {
    return Number(sql(app, `select p.submission_id from publication_settings ps join publications p on p.publication_id = ps.publication_id
        where ps.setting_name = 'title' and ps.setting_value like '${title.replace(/'/g, "''")}%' order by 1 desc limit 1`));
}

/** The workflow on the review round's page (the "Review" entry of the workflow's menu). */
async function openReviewRound(page, app, id) {
    const round = sql(app, `select review_round_id from review_rounds where submission_id = ${Number(id)} and stage_id = 3 order by round desc limit 1`);
    await C.openWorkflow(page, app, id, {menuKey: `workflow_3_${round}`});
    return Number(round);
}

/** The Reviewers panel's own "Add Reviewer": the window once "Locate a Reviewer" has its search box. */
async function openAddReviewer(page) {
    const wf = page.locator('[role="dialog"]:visible').first();
    await wf.getByRole('button', {name: 'Add Reviewer', exact: true}).first().click();
    const modal = page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')});
    await modal.locator('.listPanel--selectReviewer input.pkpSearch__input').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    const {waitForRequestEditors} = require('../../../pages/ReviewerSuggestionPages.js');
    await waitForRequestEditors(page).catch(() => {});
    return modal;
}

/**
 * "Select a Reviewer from Reviewer Suggestions" as shown: whether the heading is there, and per row
 * of the list its visible text, its height, and each button's visible text and accessible name.
 */
async function readSuggestionList(page, modal) {
    const panel = modal.locator('.listPanel').filter({hasText: 'Select a Reviewer from Reviewer Suggestions'}).first();
    if (!(await panel.count())) return {heading: false, rows: []};
    const rows = [];
    const lis = panel.locator('li.listPanel__item');
    const n = await lis.count();
    for (let i = 0; i < n; i++) {
        const li = lis.nth(i);
        const box = await li.boundingBox().catch(() => null);
        const buttons = [];
        const bs = li.getByRole('button');
        for (let j = 0; j < (await bs.count()); j++) {
            const b = bs.nth(j);
            buttons.push({visible: flat(await b.innerText().catch(() => '')), aria: flat(await b.ariaSnapshot().catch(() => null), 200)});
        }
        rows.push({text: flat(await li.innerText().catch(() => ''), 200), height: box ? Math.round(box.height) : null, buttons});
    }
    return {heading: true, rows, aria: flat(await panel.ariaSnapshot().catch(() => null), 1500)};
}

/** "Locate a Reviewer": the first `n` entries' names and their buttons' accessible names (or one searched by `phrase`). */
async function readLocate(page, modal, {n = 3, phrase = null} = {}) {
    const panel = modal.locator('.listPanel--selectReviewer').filter({has: page.locator('input.pkpSearch__input')}).first();
    if (phrase) {
        const search = panel.locator('input.pkpSearch__input');
        await search.fill(phrase);
        await search.press('Enter');
        await panel.locator('li.listPanel__item').filter({hasText: phrase}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    }
    const lis = panel.locator('li.listPanel__item');
    const out = [];
    for (let i = 0; i < Math.min(n, await lis.count()); i++) {
        const li = lis.nth(i);
        const name = flat(await li.locator('.listPanel__itemTitle').first().innerText().catch(() => ''), 120);
        const bs = li.getByRole('button');
        const buttons = [];
        for (let j = 0; j < (await bs.count()); j++) {
            const b = bs.nth(j);
            const visible = flat(await b.innerText().catch(() => ''));
            if (/Select|Reassign/.test(visible)) buttons.push({visible, aria: flat(await b.ariaSnapshot().catch(() => null), 200)});
        }
        out.push({name, notice: flat(await li.locator('.listPanel__item--reviewer__notice').first().innerText().catch(() => null), 120), buttons});
    }
    return out;
}

/**
 * "Select Reviewer" on the suggestion entry of `name`: the inner "Add Reviewer" window on
 * "Create New Reviewer"; "Username", "Add Reviewer". Returns what the inner window showed, the
 * grid's answer, the windows left and the notice; records rather than throws.
 */
async function addFromSuggestion(page, modal, name, username) {
    const {SuggestionList, ReviewerRequestWindow} = require('../../../pages/ReviewerSuggestionPages.js');
    const out = {};
    const list = new SuggestionList(page, modal);
    await list.select(name);
    await page.waitForFunction(() => document.querySelectorAll('[role=dialog]').length > 0, null, {timeout: T});
    const inner = new ReviewerRequestWindow(page);
    try {
        await inner.expectOpen();
    } catch (e) {
        out.innerError = flat(e.message, 200);
    }
    out.windows = await ReviewerRequestWindow.all(page).count();
    out.createForm = await inner.createHeading().isVisible().catch(() => false);
    out.prefilled = {
        givenName: await inner.createGivenName().inputValue().catch(() => null),
        familyName: await inner.createFamilyName().inputValue().catch(() => null),
        email: await inner.createEmail().inputValue().catch(() => null),
    };
    await snap(page, 'inner-window');
    await inner.username().fill(username);
    const refetch = page.waitForResponse((r) => /\/reviewers\/suggestions\/\d+/.test(r.url()) && r.request().method() === 'GET', {timeout: 45_000}).catch(() => null);
    const answered = await inner.submit().catch((e) => ({error: flat(e.message, 200)}));
    out.gridStatus = answered && answered.status ? answered.status() : answered;
    const r = await refetch;
    out.refetch = r ? {status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160)} : null;
    await sleep(1200);
    await idle(page);
    out.windowsAfter = await ReviewerRequestWindow.all(page).count();
    out.notice = flat(await page.locator('.pkp_notification, .pkpNotification, [role="status"]').allInnerTexts().catch(() => []).then((a) => a.join(' | ')), 300);
    return out;
}

/** The window's top "Close" arrow (its first Close). */
async function closeAddReviewer(page) {
    const {ReviewerRequestWindow} = require('../../../pages/ReviewerSuggestionPages.js');
    const w = new ReviewerRequestWindow(page);
    await w.close().catch(() => {});
    await idle(page);
}

module.exports = {T, sleep, flat, TITLE, SUGGESTIONS, NOVA_USERNAME, WORDS, snap, enableSuggestions, submitWithSuggestions, sendToReview, submissionId, openReviewRound, openAddReviewer, readSuggestionList, readLocate, addFromSuggestion, closeAddReviewer};
