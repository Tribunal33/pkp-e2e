// Helpers of walk.js here (spec U29, register A9). Requiring this file runs nothing. Every helper
// drives the screens a person uses: Settings › Workflow › "Review" › "Review Forms" (a row's
// "Active" box and its counts), the workflow's "Reviewers" panel (a row's "More Actions" › "Edit"
// window, its "Review Form" list and "OK"), and step 3 of the reviewer's review. The form making,
// the form giving and the reviewer's step 3 are U28 A14's helpers, reused as they stand.
const {idle, sql} = require('../../../probe');
const A14 = require('../review-form-save-for-later-required-fields/lib.js');

const {T, sleep, flat} = A14;
const DEACTIVATE = /deactivate this review form/i;

/** Per app, on PKP's default test dataset (docs/process/dataset.md): a submission in review with two unanswered requests. */
const CASES = {
    ojs: {id: 12, reviewer: {name: 'Julie Janssen', username: 'jjanssen'}, neighbour: {name: 'Paul Hudson', username: 'phudson'}},
    omp: {id: 17, reviewer: {name: 'Julie Janssen', username: 'jjanssen'}, neighbour: {name: 'Paul Hudson', username: 'phudson'}},
};

const R = () => require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');

function settingsPage(page, app) {
    const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
    return new ReviewSettingsPage(page, app.contextPath);
}

/** "Review Forms": each listed form's title, "Active" tick, "In Review" and "Completed", and the controls of `controlsOf`. */
async function formsList(page, app, {controlsOf = null} = {}) {
    const settings = settingsPage(page, app);
    const forms = settings.forms;
    await settings.goto('Review Forms');
    await idle(page);
    const out = [];
    const n = await forms.rows().count();
    for (let i = 0; i < n; i++) {
        const row = forms.rows().nth(i);
        const title = flat(await row.locator('td').first().innerText(), 120);
        const counts = await forms.rowCounts(row);
        out.push({title, active: await forms.activeBox(row).isChecked(), ...counts});
    }
    if (controlsOf) {
        const controls = await forms.rowControls(forms.row(controlsOf).first());
        const names = (await controls.getByRole('link').allInnerTexts()).map((t) => flat(t, 30)).filter(Boolean);
        out.push({controlsOf, controls: names});
    }
    return out;
}

/** "Review Forms": untick the form's "Active" box and answer the confirmation with "OK". Returns the question and the tick after. */
async function deactivateForm(page, app, title) {
    const settings = settingsPage(page, app);
    const forms = settings.forms;
    await settings.goto('Review Forms');
    await idle(page);
    const row = forms.row(title).first();
    await forms.activeBox(row).click();
    const question = flat(await forms.confirmWindow(DEACTIVATE).innerText(), 300);
    await forms.answerConfirm(DEACTIVATE, 'OK');
    await idle(page);
    return {question, active: await forms.activeBox(forms.row(title).first()).isChecked()};
}

/**
 * The reviewer row's "More Actions" › "Edit" on the submission's workflow: the "Review Form" list
 * as the window shows it (absent, or its options and the selected one), then `press` ("OK" with
 * nothing changed, or "Cancel"). Returns the list, the save's status and whether the window closed.
 */
async function editWindow(page, app, id, name, {press = 'OK', label = null} = {}) {
    await A14.openWorkflow(page, app, id);
    const row = page.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name}).first();
    await row.waitFor({timeout: T});
    // the window by its form (3.5's has no "Publicly Show Reviewer Comments" box to wait on)
    await R().clickRowAction(page, row, 'Edit');
    const edit = R().legacyModal(page, 'editReviewForm');
    await edit.locator('form#editReviewForm').waitFor({timeout: T});
    const {waitForLegacyFormSettled} = require('../../../support/legacy.js');
    await waitForLegacyFormSettled(page, edit);
    await idle(page);
    const select = edit.locator('select[name="reviewFormId"]');
    const out = {name, listShown: (await select.count()) > 0};
    if (out.listShown) {
        out.options = (await select.locator('option').allInnerTexts()).map((t) => flat(t, 80));
        out.selected = flat(await select.evaluate((s) => s.options[s.selectedIndex] && s.options[s.selectedIndex].text), 80);
        out.section = flat(await select.evaluate((e) => { const s = e.closest('.section'); return s ? s.innerText : null; }), 200);
    }
    if (label) {
        const {screen, record, shot} = require('../../../probe');
        record(label, await screen(page));
        await shot(page, label).catch(() => {});
    }
    if (press === 'OK') {
        const saved = page.waitForResponse((r) => /update-review|updateReview/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await edit.getByRole('button', {name: 'OK', exact: true}).click();
        const rs = await saved;
        out.status = rs ? rs.status() : null;
        // what the form sent for "Review Form" (absent when the window shows no list)
        out.postedReviewFormId = rs ? new URLSearchParams(rs.request().postData() || '').get('reviewFormId') : null;
        await edit.locator('form#editReviewForm').waitFor({state: 'hidden', timeout: T}).catch(() => {});
    } else {
        await edit.getByRole('link', {name: 'Cancel'}).first().click().catch(() => {});
        await edit.locator('form#editReviewForm').waitFor({state: 'hidden', timeout: T}).catch(() => {});
    }
    await idle(page);
    out.closed = !(await edit.locator('form#editReviewForm').isVisible().catch(() => false));
    await sleep(500); // the closed window's slot (patterns.md pitfall 4)
    return out;
}

/** What step 3 shows: the questions of the review form (if any), the free-text boxes' labels, and the answers. */
async function step3Read(page) {
    return page.locator('#reviewStep3Form').evaluate((form) => {
        const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());
        const shown = (e) => !!(e && (e.offsetWidth || e.offsetHeight));
        const responses = [...form.querySelectorAll('[name^="reviewFormResponses"]')];
        return {
            formQuestions: [...form.querySelectorAll('.section')].filter((s) => s.querySelector('[name^="reviewFormResponses"]') && !s.querySelector('.section'))
                .map((s) => flat(s.innerText).slice(0, 160)),
            answers: responses.map((e) => ({name: e.name, value: e.value})),
            freeText: [...form.querySelectorAll('label, .label, h3')].filter(shown).map((l) => flat(l.textContent))
                .filter((t) => /For author and editor|For editor/i.test(t || '')),
            hasCommentsBox: !!form.querySelector('[name="comments"], textarea[id^="comments"]'),
        };
    });
}

/** "Review Forms": the row's "Delete", "OK" on "Are you sure you wish to delete this review form?". Returns the question and the titles left. */
async function deleteForm(page, app, title) {
    const settings = settingsPage(page, app);
    const forms = settings.forms;
    await settings.goto('Review Forms');
    await idle(page);
    const controls = await forms.rowControls(forms.row(title).first());
    await forms.control(controls, 'Delete').click();
    const question = flat(await forms.confirmWindow(/delete this review form/i).innerText(), 300);
    await forms.answerConfirm(/delete this review form/i, 'OK');
    await idle(page);
    await settings.goto('Review Forms');
    await idle(page);
    const titles = (await forms.rows().allInnerTexts()).map((t) => flat(t, 120));
    return {question, titles};
}

/** The reviewer's saved answers for the request, read from the database (evidence only). */
function storedAnswers(app, id, username) {
    return sql(app, `select count(*) from review_form_responses r join review_assignments ra on ra.review_id = r.review_id join users u on u.user_id = ra.reviewer_id where ra.submission_id = ${Number(id)} and u.username = '${username}'`);
}

/** The request's stored review form, read from the database beside the screens (evidence only). */
function storedForm(app, id, username) {
    return sql(app, `select ra.review_id, ra.review_form_id from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id = ${Number(id)} and u.username = '${username}'`);
}

module.exports = {T, sleep, flat, CASES, formsList, deactivateForm, deleteForm, editWindow, step3Read, storedForm, storedAnswers, A14};
