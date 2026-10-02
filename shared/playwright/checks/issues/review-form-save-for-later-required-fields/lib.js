// Helpers of walk.js here (spec U28, register A14). Requiring this file runs nothing. Every helper
// drives the screens a person uses: Settings › Workflow › "Review" › "Review Forms" (a form with its
// items, made active), the workflow's "Reviewers" panel (a row's "Edit" › "Review Form"), and step 3
// of the reviewer's review when the review carries a review form.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const ACTIVATE_FORM = /activate this review form/i;

/** Per app, on PKP's default test dataset (docs/process/dataset.md): a submission in review with two unanswered requests. */
const CASES = {
    ojs: {id: 12, reviewer: {name: 'Julie Janssen', username: 'jjanssen'}, neighbour: {name: 'Paul Hudson', username: 'phudson'}},
    omp: {id: 17, reviewer: {name: 'Julie Janssen', username: 'jjanssen'}, neighbour: {name: 'Paul Hudson', username: 'phudson'}},
};

/** The journal's review page objects (the Reviewers panel is the same on a press). */
const R = () => require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');

function wizard(page, app) {
    const {ReviewWizardPage} = require('../../../pages/ReviewerPages.js');
    return new ReviewWizardPage(page, app.contextPath);
}

/**
 * Settings › Workflow › "Review" › "Review Forms": "Create Review Form" with the title, then the
 * row's "Edit" › "Form Items" › "Create New Item" per item (`{question, type, required}`), the
 * window closed, and the row's "Active" box ticked with "OK". Returns the row's text.
 */
async function createActiveReviewForm(page, app, {title, items}) {
    const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
    const settings = new ReviewSettingsPage(page, app.contextPath);
    const forms = settings.forms;
    await settings.goto('Review Forms');
    await idle(page);
    await forms.createForm(title);
    const controls = await forms.rowControls(forms.row(title).first());
    await forms.control(controls, 'Edit').click();
    await forms.windowHeading().waitFor({timeout: T});
    await forms.openWindowTab('Form Items');
    for (const item of items) {
        await forms.openCreateItem();
        await forms.saveItem({question: item.question, required: !!item.required, type: item.type});
    }
    const listed = (await forms.itemRows().allInnerTexts()).map((t) => flat(t, 120));
    await forms.closeWindow();
    await settings.goto('Review Forms');
    await idle(page);
    await forms.activeBox(forms.row(title).first()).click();
    await forms.answerConfirm(ACTIVATE_FORM, 'OK');
    await idle(page);
    const row = forms.row(title).first();
    return {items: listed, active: await forms.activeBox(row).isChecked(), row: flat(await row.innerText(), 160)};
}

/** The editor's workflow of the submission, on the stage and round it opens on. */
async function openWorkflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const modal = page.locator('[data-cy="active-modal"]').first();
    await modal.locator('[data-cy="reviewer-manager"]').waitFor({timeout: T});
    await idle(page);
    return modal;
}

/** The reviewer's row "Edit": choose the form under "Review Form", "OK". Returns the list's options and the choice. */
async function giveReviewForm(page, app, id, name, title) {
    const modal = await openWorkflow(page, app, id);
    const row = modal.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name});
    await row.first().waitFor({timeout: T});
    await R().clickRowAction(page, row.first(), 'Edit');
    const edit = R().legacyModal(page, 'editReviewForm');
    const select = edit.locator('select[name="reviewFormId"]');
    await select.waitFor({timeout: T});
    await idle(page);
    const options = (await select.locator('option').allInnerTexts()).map((t) => flat(t, 80));
    await select.selectOption({label: title});
    const saved = page.waitForResponse((r) => /update-review|updateReview/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await edit.getByRole('button', {name: 'OK', exact: true}).click();
    const s = await saved;
    await edit.locator('form#editReviewForm').waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return {options, chose: title, status: s ? s.status() : null};
}

/**
 * Open the signed-in reviewer's review on step 3. With `accept`, step 1's "Accept Review, Continue
 * to Step #2" and step 2's "Continue to Step #3" are pressed on the way; without, the page is
 * loaded afresh (a reload) and step 3 selected when another step opened.
 */
async function openStep3(page, app, id, {accept = false} = {}) {
    const w = wizard(page, app);
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await w.expectOpen();
    const out = {heading: flat(await page.getByRole('heading', {level: 1}).first().innerText(), 160)};
    if (accept) {
        await w.accept();
        await w.continueToStep3();
    } else {
        out.openedOn = flat(await page.locator('li.ui-tabs-active').first().innerText().catch(() => null), 60);
        if (!/^3\./.test(out.openedOn || '')) await w.selectStep(3);
    }
    await w.expectStep(3);
    await w.step3Form.waitFor({timeout: T});
    await idle(page);
    out.tab = flat(await page.locator('li.ui-tabs-active').first().innerText().catch(() => null), 60);
    return out;
}

/** The answer control of a review form's question on step 3 (a text box, a textarea or a list). */
function answerBox(page, question) {
    // the innermost section naming the question: an outer one holds every question of the form
    return page.locator('#reviewStep3Form .section').filter({hasText: question}).last().locator('input[type="text"], textarea, select').first();
}

/** Type into a question's box from the keyboard, as a person does; the focus stays in the box. */
async function typeAnswer(page, question, text) {
    const box = answerBox(page, question);
    await box.click();
    await box.pressSequentially(text, {delay: 20});
    await sleep(800); // the form shows its marks on a 250 ms timer (FormHandler.showErrors)
}

/**
 * What step 3 shows a reviewer about its required questions: the box under the buttons, each
 * "This field is required." mark with the question (or list) it sits under, the page notices now
 * on screen, the answers, and (journal) the "Recommendation" list's choice.
 */
async function stepMessages(page) {
    await sleep(600);
    return page.locator('#reviewStep3Form').evaluate((form) => {
        const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());
        const shown = (e) => !!(e && (e.offsetWidth || e.offsetHeight) && getComputedStyle(e).visibility !== 'hidden');
        const box = form.querySelector('#reviewStep3MessageBox');
        const marks = [...form.querySelectorAll('label.error')].filter(shown).map((l) => {
            const section = l.closest('.section');
            const head = section && section.querySelector('label:not(.error), .label, legend, span.title');
            return {text: flat(l.textContent), under: head ? flat(head.textContent).slice(0, 80) : null};
        });
        const rec = form.querySelector('select[name="reviewerRecommendationId"], select[name="recommendation"]');
        return {
            box: box ? (shown(box) ? flat(box.innerText) : false) : null,
            marks,
            answers: [...form.querySelectorAll('[name^="reviewFormResponses"]')].map((e) => ({name: e.name, value: e.value})),
            recommendation: rec ? flat(rec.options[rec.selectedIndex].text) : null,
            notices: [...document.querySelectorAll('.app__notifications .pkpNotification, .pkp_notification .notifySuccess')].filter(shown).map((n) => flat(n.innerText)),
        };
    });
}

/** Press "Save for Later": what the form posted, the answer, the notice, then what the step shows. */
async function saveForLater(page, app) {
    const w = wizard(page, app);
    const sent = page.waitForRequest((r) => r.method() === 'POST' && /save-step|saveStep/i.test(r.url()), {timeout: 8000}).catch(() => null);
    await w.saveForLaterButton.click();
    const request = await sent;
    const out = {requestSent: !!request};
    if (request) {
        const p = new URLSearchParams(request.postData() || '');
        out.posted = {isSave: p.get('isSave'), responses: [...p.entries()].filter(([k]) => k.startsWith('reviewFormResponses')).map(([k, v]) => `${k}=${v}`)};
        const response = await request.response();
        out.http = response.status();
        try { out.status = JSON.parse(await response.text()).status; } catch (e) { /* not JSON */ }
    }
    const notice = page.getByText('Your changes have been saved.').first();
    out.notice = await notice.waitFor({timeout: request ? T : 3000}).then(() => 'Your changes have been saved.', () => null);
    Object.assign(out, await stepMessages(page));
    return out;
}

/** "Submit Review", then "OK": whether the review went through, and what the step shows when it did not. */
async function submitReview(page, app) {
    const w = wizard(page, app);
    const dialog = await w.pressSubmitReview();
    const out = {confirm: flat(await dialog.innerText(), 200)};
    const sent = page.waitForRequest((r) => r.method() === 'POST' && /save-step|saveStep/i.test(r.url()), {timeout: 4000}).catch(() => null);
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    out.requestSent = !!(await sent);
    await idle(page);
    out.completed = await w.completedHeading.waitFor({timeout: out.requestSent ? 10_000 : 1500}).then(() => true, () => false);
    out.tab = flat(await page.locator('li.ui-tabs-active').first().innerText().catch(() => null), 60);
    if (!out.completed) Object.assign(out, await stepMessages(page));
    return out;
}

module.exports = {T, sleep, flat, CASES, createActiveReviewForm, openWorkflow, giveReviewForm, openStep3, answerBox, typeAnswer, stepMessages, saveForLater, submitReview};
