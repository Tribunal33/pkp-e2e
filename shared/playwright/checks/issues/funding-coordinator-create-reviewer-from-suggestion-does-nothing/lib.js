// Helpers of walk.js here (U31 A1 and A5: the Funding coordinator on a submission whose author
// suggested reviewers; issue report docs/issues/U31-A5-funding-coordinator-create-reviewer-from-suggestion-does-nothing.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses and records the
// state it meets (a control gone, a window left open, an error dialog) instead of throwing.
// Reused: the admin's role grant and the "Assign" window (../manager-level-role-save-ticks-every-stage/lib.js),
// "Make a Submission" (../section-editors-not-assigned-second-journal/lib.js), the wizard rail
// (../wizard-refused-save-hangs-saving/lib.js), a decision (../reviewer-own-round-listed-under-previous-reviews/lib.js),
// the suggestion windows (shared/playwright/pages/ReviewerSuggestionPages.js).
const path = require('path');
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const L = (app) => (app.line && /3_[34]/.test(app.line) ? '' : '/en');

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const CASES = {
    ojs: {author: 'ccorino', section: 'Articles', hosted: 'Hosted Journals', decision: 'Send for Review', round: 'Review Round 1'},
    omp: {author: 'aclark', section: null, hosted: 'Hosted Presses', decision: 'Send to External Review', round: 'Review Round 1'},
};

const TITLE = 'u31q1 Reviewer suggestions';
const COORD = {username: 'svogt', name: 'Sarah Vogt', role: 'Funding coordinator'};
const NOVA = {givenName: 'Nova', familyName: 'Newcomer', email: 'nova.u31q1@mailinator.com', affiliation: 'u31q1 Institute', reason: 'Works on this topic.', username: 'novau31q1'};
const ADELA = {givenName: 'Adela', familyName: 'Gallego', email: 'agallego@mailinator.com', affiliation: 'u31q1 Institute', reason: 'Reviewed for the journal before.'};
const full = (p) => `${p.givenName} ${p.familyName}`;

const S = () => require('../../../pages/ReviewerSuggestionPages.js');

/** As a manager: Settings › Workflow › "Review" › "Setup": tick the suggestion box, "Save". */
async function enableSuggestions(page, app) {
    const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
    const settings = new ReviewSettingsPage(page, app.contextPath);
    await settings.goto('Setup');
    const box = settings.setup.checkbox('Allow authors to suggest potential reviewers at submission process');
    const before = await box.isChecked();
    if (!before) await box.check();
    await settings.setup.save();
    return {before, after: await box.isChecked()};
}

/** As `admin`: Administration › Hosted Journals (Presses) › "Settings wizard" › "Users" › "Edit User": tick the role. */
async function giveCoordinatorRole(page, app) {
    const R = require('../manager-level-role-save-ticks-every-stage/lib.js');
    await R.giveRoleAsAdmin(page, app, {username: COORD.username, role: COORD.role});
    return {given: COORD.role};
}

/** On the wizard's "Reviewer Suggestions" step: "Add Reviewer Suggestion", the boxes, "Save", per person. */
async function addSuggestions(page, people) {
    const {ReviewerSuggestionStep} = S();
    const step = new ReviewerSuggestionStep(page);
    for (const p of people) {
        const win = await step.openAdd();
        await win.fill({givenName: p.givenName, familyName: p.familyName, email: p.email, affiliation: p.affiliation, reason: p.reason});
        await win.save();
        await idle(page);
    }
    return (await step.entries().allInnerTexts()).map((t) => flat(t, 120));
}

/**
 * As the author: "Make a Submission", then every step as the rail orders them (a file, an
 * abstract, the suggestions), "Review", the confirmation, "Submit". Returns {id, steps, entries, problems}.
 */
async function submitWithSuggestions(page, app, people) {
    const {expect} = require('@playwright/test');
    const B = require('../section-editors-not-assigned-second-journal/lib.js');
    const {currentStep, pressContinue} = require('../wizard-refused-save-hangs-saving/lib.js');
    const c = CASES[app.name];
    const id = await B.beginSubmission(page, app, app.contextPath, {title: TITLE, section: c.section});
    const ojs = app.name === 'ojs';
    const W = ojs ? null : require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const O = ojs ? new (require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js')).SubmissionWizardPage)(page, app.contextPath) : null;
    const done = new Set();
    const steps = [];
    let entries = null;
    for (let i = 0; i < 12; i++) {
        const step = (await currentStep(page)).replace(/^\d+\s*/, '');
        if (/(^|\s)Review$/.test(step)) break;
        if (!done.has(step)) {
            done.add(step);
            steps.push(step);
            if (step === 'Upload Files') {
                if (ojs) await O.uploadFile();
                else await W.uploadWizardFile(page, 'u31q1-manuscript.txt');
            } else if (step === 'Details') {
                await B.typeAbstract(page, 'An abstract for the u31q1 walk.');
            } else if (step === 'Reviewer Suggestions') {
                entries = await addSuggestions(page, people);
            }
        }
        await pressContinue(page);
        await idle(page);
        await sleep(500);
    }
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    const problems = flat(await page.locator('.submissionWizard__review_errors').innerText({timeout: 3000}).catch(() => ''), 600);
    if (!problems) {
        if (ojs) await O.submitAndConfirm();
        else await W.confirmSubmit(page);
        await expect(page.getByRole('heading', {name: 'Submission complete'})).toBeVisible({timeout: T});
    }
    return {id, steps, entries, problems};
}

/** As the editor: open the submission, the decision button, "Continue" … "Record Decision". */
async function sendToReview(page, app, id) {
    const D = require('../reviewer-own-round-listed-under-previous-reviews/lib.js');
    const modal = await D.openWorkflow(page, app, id);
    return D.recordDecision(page, modal, CASES[app.name].decision);
}

/** As the editor: "Participants" › "Assign": "Funding coordinator", "Search", "Sarah Vogt", "OK". */
async function assignCoordinator(page, app, id) {
    const R = require('../manager-level-role-save-ticks-every-stage/lib.js');
    const out = await R.assignAs(page, app, id, {role: COORD.role, personName: COORD.name});
    return {status: out.status, userGroupId: out.userGroupId};
}

/** The "Error" dialog when one is open: its text; pressing "OK" closes it. Null when none. */
async function errorDialog(page, {dismiss = true, wait = 4000} = {}) {
    const d = page.getByRole('dialog', {name: 'Error', exact: true});
    const shown = await d.first().waitFor({timeout: wait}).then(() => true).catch(() => false);
    if (!shown) return null;
    const text = flat(await d.first().innerText(), 300);
    const buttons = (await d.first().getByRole('button').allInnerTexts()).map((t) => flat(t, 40)).filter(Boolean);
    if (dismiss) {
        await d.first().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        await d.first().waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    }
    return {text, buttons};
}

/** The workflow dialog (the page itself is one: pitfall 7). */
const wf = (page) => page.locator('[data-cy="active-modal"]').first();

/** The "Reviewers Suggested by Author" panel as shown: heading, rows, each row's "…" button. */
async function readPanel(page, people) {
    const {SuggestedReviewersPanel} = S();
    const panel = new SuggestedReviewersPanel(page);
    const shown = await panel.heading().first().isVisible().catch(() => false);
    const rows = shown ? (await panel.rows().allInnerTexts()).map((t) => flat(t, 160)) : [];
    const menus = {};
    for (const p of people) menus[full(p)] = await panel.moreActionsButton(full(p)).count();
    return {shown, rows, menus};
}

/**
 * Open the submission's workflow (it lands on its current stage) and, when `entry` is named, the
 * workflow menu entry. Returns the stage heading, the error dialog met (dismissed) and the panel.
 */
async function openStage(page, app, id, {entry = null, people = []} = {}) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/dashboard/editorial?workflowSubmissionId=${id}`));
    await wf(page).getByRole('heading', {name: /^Workflow:/}).first().waitFor({timeout: 60_000});
    await idle(page);
    const onLanding = await errorDialog(page);
    let onEntry = null;
    if (entry) {
        const link = wf(page).getByRole('navigation').getByRole('link', {name: entry, exact: true});
        if (!(await link.count())) return {entry, missing: true, onLanding};
        await link.first().click();
        await idle(page);
        await page.waitForFunction(() => !document.body.innerText.includes('Refreshing data'), null, {timeout: 30_000}).catch(() => {});
        onEntry = await errorDialog(page);
    }
    await sleep(1500);
    const heading = flat(await wf(page).getByRole('heading', {name: /^Workflow:/}).first().innerText().catch(() => null), 120);
    return {heading, errorDialog: {onLanding, onEntry}, panel: await readPanel(page, people)};
}

/** The Reviewers table's rows (names), read by text (the panel is aria-hidden behind a window: pitfall 6). */
async function reviewerRows(page) {
    const panel = wf(page).locator('[data-cy="reviewer-manager"]');
    if (!(await panel.count())) return null;
    return (await panel.getByRole('row').allInnerTexts()).map((t) => flat(t, 160)).slice(1);
}

/** "Reviewers" › "Add Reviewer": the window with the suggestions list; returns {modal, list entries and their buttons}. */
async function openAddReviewer(page) {
    const {SuggestionList, waitForRequestEditors} = S();
    await wf(page).locator('[data-cy="reviewer-manager"]').getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    const modal = page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')});
    await modal.locator('.listPanel--selectReviewer input.pkpSearch__input').first().waitFor({timeout: T});
    await waitForRequestEditors(page);
    await idle(page);
    const list = new SuggestionList(page, modal);
    const heading = await list.heading().count();
    const entries = [];
    for (const t of await list.entries().allInnerTexts()) entries.push(flat(t, 160));
    const buttons = {};
    for (const p of [NOVA, ADELA]) buttons[full(p)] = await list.selectButton(list.entry(full(p))).count();
    const links = (await modal.getByRole('link').allInnerTexts()).map((t) => flat(t, 60)).filter(Boolean);
    return {modal, list, read: {suggestionHeading: heading, entries, selectButtons: buttons, links}};
}

/**
 * In an open request window on the "Create New Reviewer" form: type the username, press "Add
 * Reviewer". Returns the grid's answer, the browser dialogs raised, and the window's state 3 s on.
 */
async function createFromWindow(page, username) {
    const {ReviewerRequestWindow} = S();
    const win = new ReviewerRequestWindow(page);
    const before = await ReviewerRequestWindow.all(page).count();
    const form = {
        heading: (await win.createHeading().count()) ? 'Create New Reviewer' : (await win.enrollHeading().count()) ? 'Enroll an Existing User as Reviewer' : null,
        givenName: await win.createGivenName().inputValue().catch(() => null),
        familyName: await win.createFamilyName().inputValue().catch(() => null),
        email: await win.createEmail().inputValue().catch(() => null),
    };
    const alerts = [];
    const onDialog = (d) => { alerts.push({type: d.type(), message: d.message()}); d.dismiss().catch(() => {}); };
    page.on('dialog', onDialog);
    let answer = null;
    try {
        await win.username().fill(username);
        const resp = await win.submit();
        const body = await resp.text().catch(() => '');
        let json = null;
        try { json = JSON.parse(body); } catch (e) { /* not JSON */ }
        answer = {
            url: resp.url().replace(/^https?:\/\/[^/]+/, ''),
            status: resp.status(),
            jsonStatus: json ? json.status : null,
            content: json ? flat(json.content, 300) : flat(body, 300),
        };
    } catch (e) {
        answer = {error: flat(e.message, 200)};
    }
    await sleep(3000);
    await idle(page);
    page.off('dialog', onDialog);
    const after = await ReviewerRequestWindow.all(page).count();
    const stillCreate = after ? await new ReviewerRequestWindow(page).createHeading().count() : 0;
    const formErrors = after ? (await new ReviewerRequestWindow(page).dialog().locator('.error, .pkp_form_error, .notifyFormError').allInnerTexts()).map((t) => flat(t, 120)).filter(Boolean) : [];
    return {form, answer, alerts, windowsBefore: before, windowsAfter: after, createFormStillOpen: stillCreate > 0, formErrors};
}

/** Close every open Add Reviewer window with its own "Close" arrow. */
async function closeAll(page) {
    const {ReviewerRequestWindow} = S();
    for (let i = 0; i < 4 && (await ReviewerRequestWindow.all(page).count()); i++) {
        await new ReviewerRequestWindow(page).close().catch(() => {});
    }
    await sleep(800);
    await idle(page);
}

/** Inside the open Add Reviewer window: "Select Reviewer" on the person's suggestion entry. Returns the window count after. */
async function selectSuggestion(page, list, person) {
    const {ReviewerRequestWindow} = S();
    const btn = list.selectButton(list.entry(full(person)));
    if (!(await btn.count())) return {offered: false};
    await list.select(full(person));
    await sleep(1500);
    const n = await ReviewerRequestWindow.all(page).count();
    const win = new ReviewerRequestWindow(page);
    await win.expectOpen().catch(() => {});
    return {
        offered: true,
        windows: await ReviewerRequestWindow.all(page).count(),
        create: (await win.createHeading().count()) > 0,
        enroll: (await win.enrollHeading().count()) > 0,
        selected: (await win.selectedReviewerLabel().count()) > 0 ? flat(await win.selectedReviewerName().innerText().catch(() => null), 80) : null,
        windowsAtOnce: n,
    };
}

/** The stage panel's row "…" › "Add Reviewer" for the person; returns what opened (or that nothing is offered). */
async function addFromPanelRow(page, person) {
    const {SuggestedReviewersPanel, ReviewerRequestWindow} = S();
    const panel = new SuggestedReviewersPanel(page);
    if (!(await panel.moreActionsButton(full(person)).count())) return {offered: false, panelShown: await panel.heading().count() > 0};
    const items = await panel.openMenu(full(person));
    const menu = (await items.allInnerTexts()).map((t) => flat(t, 60));
    if (!menu.includes('Add Reviewer')) {
        await panel.moreActionsButton(full(person)).click().catch(() => {});
        return {offered: false, menu};
    }
    await page.getByRole('menuitem', {name: 'Add Reviewer', exact: true}).click();
    const win = new ReviewerRequestWindow(page);
    await win.expectOpen().catch(() => {});
    return {offered: true, menu, create: (await win.createHeading().count()) > 0, enroll: (await win.enrollHeading().count()) > 0};
}

module.exports = {T, sleep, flat, CASES, TITLE, COORD, NOVA, ADELA, full, enableSuggestions, giveCoordinatorRole, addSuggestions, submitWithSuggestions, sendToReview, assignCoordinator, errorDialog, readPanel, openStage, reviewerRows, openAddReviewer, createFromWindow, closeAll, selectSuggestion, addFromPanelRow};
