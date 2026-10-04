// Helpers of walk.js (issue report docs/issues/U31-A6-reviewer-suggestion-same-address-other-case.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const {typeAbstract, openWorkflow, sleep, flat, L} = require('../section-editors-not-assigned-second-journal/lib.js');
const {currentStep, pressContinue} = require('../wizard-refused-save-hangs-saving/lib.js');

const T = 30_000;
const SUGGESTION_SAVE = /\/submissions\/\d+\/reviewers\/suggestions(\/\d+)?(\?|$)/;
const AUTHOR = {ojs: 'ccorino', omp: 'aclark'};
const SECTION = {ojs: 'Articles', omp: null};

/**
 * As a manager: Settings › Workflow › "Review" › "Setup", tick "Allow authors to suggest potential
 * reviewers at submission process" under "Reviewer Suggestion at Submission", "Save". Returns the
 * save's status (null when the box was already ticked and nothing was saved).
 */
async function enableSuggestions(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/management/settings/workflow`));
    await idle(page);
    await page.locator('#review-button').click();
    const box = page.getByRole('checkbox', {name: 'Allow authors to suggest potential reviewers at submission process'});
    await box.waitFor({state: 'visible', timeout: T});
    if (await box.isChecked()) return null;
    await box.check();
    const form = page.locator('form').filter({has: box});
    const saved = page.waitForResponse((r) => r.request().method() !== 'GET' && /\/api\/v1\/contexts\/\d+/.test(r.url()), {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await form.locator('.pkpFormPage__status', {hasText: 'Saved'}).waitFor({timeout: T}).catch(() => {});
    return r.status();
}

/**
 * From a just-begun submission, press "Continue" step by step until `target` is the current
 * step, uploading a manuscript on "Upload Files" and typing an abstract on "Details" on the way.
 * Returns the steps passed.
 */
async function toStep(page, app, target) {
    const path = require('path');
    const ojs = app.name === 'ojs';
    const W = ojs ? null : require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const O = ojs ? new (require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js')).SubmissionWizardPage)(page, app.contextPath) : null;
    const passed = [];
    for (let i = 0; i < 10; i++) {
        const step = (await currentStep(page)).replace(/^\d+\s*/, '');
        if (step === target) return passed;
        passed.push(step);
        if (step === 'Upload Files') {
            if (ojs) await O.uploadFile();
            else await W.uploadWizardFile(page, 'u31q2-manuscript.txt');
        } else if (step === 'Details') {
            await typeAbstract(page, 'An abstract for the u31q2 walk.');
        }
        await pressContinue(page);
        await idle(page);
        await sleep(500);
    }
    throw new Error(`step "${target}" not reached; passed ${passed.join(' > ')}`);
}

/** The wizard panel's entries, each as its text. */
async function entries(page) {
    const {ReviewerSuggestionStep} = require('../../../pages/ReviewerSuggestionPages.js');
    const step = new ReviewerSuggestionStep(page);
    await idle(page);
    return (await step.entries().allInnerTexts()).map((t) => flat(t, 300));
}

/**
 * Fill the open "Add Reviewer Suggestion" or "Edit" window and press "Save". Records rather than
 * throws: {status, closed, errors, summary}.
 */
async function saveWindow(page, w, fields) {
    await w.fill(fields);
    const resp = page.waitForResponse((r) => r.request().method() !== 'GET' && SUGGESTION_SAVE.test(r.url()), {timeout: T}).catch(() => null);
    await w.saveButton().click();
    const r = await resp;
    await idle(page);
    await sleep(1200);
    const closed = (await w.dialog().count()) === 0;
    const out = {status: r ? r.status() : null, method: r ? r.request().method() : null, closed};
    if (!closed) {
        out.errors = (await w.fieldErrors().allInnerTexts()).map((t) => flat(t, 200));
        out.emailError = (await w.fieldError('Email').allInnerTexts()).map((t) => flat(t, 200));
        out.summary = flat(await w.errorSummary().first().innerText({timeout: 2000}).catch(() => null), 300);
    }
    return out;
}

/** "Add Reviewer Suggestion", fill, "Save". */
async function addSuggestion(page, fields) {
    const {ReviewerSuggestionStep} = require('../../../pages/ReviewerSuggestionPages.js');
    const w = await new ReviewerSuggestionStep(page).openAdd();
    return {w, ...(await saveWindow(page, w, fields))};
}

/** An entry's "Edit" (the entry found by a text it carries), fill, "Save". */
async function editSuggestion(page, entryText, fields) {
    const {ReviewerSuggestionStep} = require('../../../pages/ReviewerSuggestionPages.js');
    const step = new ReviewerSuggestionStep(page);
    const w = await step.openEdit(step.entry(entryText).first());
    return {w, ...(await saveWindow(page, w, fields))};
}

/** Close a window left open by a refused save (its header "Close"). */
async function closeWindow(page, w) {
    if ((await w.dialog().count()) === 0) return;
    await w.closeButton().click();
    await w.expectClosed().catch(() => {});
    await sleep(600);
}

/** From the wizard's current step: "Continue" to "Review", then "Submit" and its confirmation. */
async function submit(page, app) {
    const path = require('path');
    await pressContinue(page);
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    const problems = flat(await page.locator('.submissionWizard__review_errors').innerText({timeout: 3000}).catch(() => ''), 600);
    if (problems) return problems;
    if (app.name === 'ojs') {
        const {SubmissionWizardPage} = require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPage.js'));
        await new SubmissionWizardPage(page, app.contextPath).submitAndConfirm();
    } else {
        await require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js')).confirmSubmit(page);
    }
    await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: T});
    return '';
}

/**
 * As an editor: the submission's workflow and its "Reviewers Suggested by Author" panel: the
 * heading's presence and each row's text.
 */
async function editorPanel(page, app, id) {
    const {SuggestedReviewersPanel} = require('../../../pages/ReviewerSuggestionPages.js');
    const panel = new SuggestedReviewersPanel(page);
    await openWorkflow(page, app, app.contextPath, id);
    await panel.loaded().catch(() => {});
    await sleep(800);
    const heading = (await panel.heading().count()) > 0;
    const rows = heading ? (await panel.rows().allInnerTexts()).map((t) => flat(t, 300)) : [];
    return {heading, rows};
}

/** The submission id the author phase left for the editor phase (a file of this run). */
function saveState(app, data) {
    const fs = require('fs');
    const {outFile} = require('../../../probe');
    fs.writeFileSync(outFile('state.json'), JSON.stringify(data));
}
function readState(app) {
    const fs = require('fs');
    const {outFile} = require('../../../probe');
    return JSON.parse(fs.readFileSync(outFile('state.json'), 'utf8'));
}

/** As the editor: the workflow's decision ("Send for Review" / "Send to External Review"), recorded. */
async function sendToReview(page, app, id) {
    return require('../funding-coordinator-create-reviewer-from-suggestion-does-nothing/lib.js').sendToReview(page, app, id);
}

/** Open the submission's workflow (lands on its current stage); the panel's rows and "…" buttons for the name. */
async function openReview(page, app, id, name) {
    const Q1 = require('../funding-coordinator-create-reviewer-from-suggestion-does-nothing/lib.js');
    const {SuggestedReviewersPanel} = require('../../../pages/ReviewerSuggestionPages.js');
    const panel = new SuggestedReviewersPanel(page);
    const stage = await Q1.openStage(page, app, id, {people: []});
    await panel.loaded().catch(() => {});
    await sleep(800);
    const shown = (await panel.heading().count()) > 0;
    return {
        heading: stage.heading,
        errorDialog: stage.errorDialog,
        panelShown: shown,
        rows: shown ? (await panel.rows().allInnerTexts()).map((t) => flat(t, 200)) : [],
        menus: await panel.moreActionsButton(name).count(),
    };
}

/**
 * The panel's n-th "{name} More Actions" › "Add Reviewer": what the window opened with (its form,
 * the address the Create form is filled with, the selected reviewer). Records rather than throws.
 */
async function openRowAddReviewer(page, name, n) {
    const {SuggestedReviewersPanel, ReviewerRequestWindow} = require('../../../pages/ReviewerSuggestionPages.js');
    const panel = new SuggestedReviewersPanel(page);
    const btn = panel.moreActionsButton(name).nth(n);
    if (!(await btn.count())) return {offered: false};
    await btn.click();
    const items = page.getByRole('menuitem');
    await items.first().waitFor({timeout: T}).catch(() => {});
    const menu = (await items.allInnerTexts()).map((t) => flat(t, 60));
    if (!menu.includes('Add Reviewer')) {
        await btn.click().catch(() => {});
        return {offered: false, menu};
    }
    await page.getByRole('menuitem', {name: 'Add Reviewer', exact: true}).click();
    const win = new ReviewerRequestWindow(page);
    await win.expectOpen().catch(() => {});
    return {
        offered: true,
        menu,
        create: (await win.createHeading().count()) > 0,
        enroll: (await win.enrollHeading().count()) > 0,
        selected: (await win.selectedReviewerLabel().count()) > 0 ? flat(await win.selectedReviewerName().first().innerText().catch(() => null), 120) : null,
        email: (await win.createEmail().count()) ? await win.createEmail().inputValue().catch(() => null) : null,
    };
}

/**
 * In the open request window: type the username when it is the Create form, press "Add Reviewer".
 * Returns the grid's answer (status, the JSON's status and content), the browser dialogs, the
 * "Error" dialog met, the server log lines written meanwhile and the windows left open.
 */
async function sendRequest(page, app, {username = null} = {}) {
    const {serverLog} = require('../../../probe');
    const {ReviewerRequestWindow} = require('../../../pages/ReviewerSuggestionPages.js');
    const Q1 = require('../funding-coordinator-create-reviewer-from-suggestion-does-nothing/lib.js');
    const win = new ReviewerRequestWindow(page);
    const log = serverLog(app);
    const from = log.mark();
    const alerts = [];
    const onDialog = (d) => { alerts.push({type: d.type(), message: d.message()}); d.dismiss().catch(() => {}); };
    page.on('dialog', onDialog);
    let answer = null;
    try {
        if (username && (await win.createHeading().count())) await win.username().fill(username);
        const resp = await win.submit();
        const body = await resp.text().catch(() => '');
        let json = null;
        try { json = JSON.parse(body); } catch (e) { /* not JSON */ }
        answer = {
            url: resp.url().replace(/^https?:\/\/[^/]+/, ''),
            status: resp.status(),
            jsonStatus: json ? json.status : null,
            content: json ? flat(typeof json.content === 'string' ? json.content : JSON.stringify(json.content), 400) : flat(body, 400),
        };
    } catch (e) {
        answer = {error: flat(e.message, 200)};
    }
    await sleep(3000);
    await idle(page);
    const errorDialog = await Q1.errorDialog(page, {dismiss: false, wait: 2000});
    const notices = flat(await page.locator('.app__notifications .pkpNotification').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 400);
    if (errorDialog) await Q1.errorDialog(page, {dismiss: true, wait: 1000});
    page.off('dialog', onDialog);
    const windowsAfter = await ReviewerRequestWindow.all(page).count();
    const formErrors = windowsAfter ? (await win.dialog().locator('.error, .pkp_form_error, .notifyFormError').allInnerTexts()).map((t) => flat(t, 160)).filter(Boolean) : [];
    return {answer, alerts, errorDialog, notices, serverLog: log.since(from).map((l) => flat(l, 400)), windowsAfter, formErrors};
}

/** "Reviewers" › "Add Reviewer": the suggestions list's entries and their "Select Reviewer" buttons. */
async function addReviewerList(page, name) {
    const Q1 = require('../funding-coordinator-create-reviewer-from-suggestion-does-nothing/lib.js');
    const {modal, list} = await Q1.openAddReviewer(page);
    const items = list.entry(name);
    const out = [];
    for (let i = 0; i < (await items.count()); i++) {
        out.push({text: flat(await items.nth(i).innerText(), 200), select: await list.selectButton(items.nth(i)).count()});
    }
    return {modal, entries: out};
}

/**
 * "Reviewers" › "Add Reviewer", then "Select Reviewer" on the person's entry under "Select a
 * Reviewer from Reviewer Suggestions": what the request form opened with. Records rather than throws.
 */
async function selectFromList(page, name) {
    const {ReviewerRequestWindow} = require('../../../pages/ReviewerSuggestionPages.js');
    const {modal, entries} = await addReviewerList(page, name);
    const out = {entries};
    if (!entries.length || !entries[0].select) return {...out, selected: false};
    const {SuggestionList} = require('../../../pages/ReviewerSuggestionPages.js');
    await new SuggestionList(page, modal).select(name);
    await sleep(1500);
    const win = new ReviewerRequestWindow(page);
    await win.expectOpen().catch((e) => { out.openError = flat(e.message, 200); });
    out.windows = await ReviewerRequestWindow.all(page).count();
    out.create = (await win.createHeading().count()) > 0;
    out.enroll = (await win.enrollHeading().count()) > 0;
    out.selectedName = (await win.selectedReviewerLabel().count()) > 0 ? flat(await win.selectedReviewerName().first().innerText().catch(() => null), 120) : null;
    return {...out, selected: true};
}

module.exports = {selectFromList, T, AUTHOR, SECTION, sleep, flat, enableSuggestions, toStep, entries, addSuggestion, editSuggestion, closeWindow, submit, editorPanel,
    saveState, readState, sendToReview, openReview, openRowAddReviewer, sendRequest, addReviewerList};
