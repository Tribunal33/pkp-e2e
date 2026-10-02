// Helpers for "Create Issue" refusing a ticked part left empty (U50 A1), shared by walk.js and
// neighbour.js. Requiring this file runs nothing. Page objects are required inside the functions
// (probe kit: a suite page object is required inside forEachApp's callback).
const {idle, screen, record, shot} = require('../../../probe');

const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function issuesPage(page, contextPath) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    return new IssuesAdmin(page, contextPath);
}

/** What the form marks: every message under a box, the boxes and labels carrying "error", the in-form notice. */
async function formMarks(form) {
    return form.evaluate((f) => {
        const t = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
        return {
            errorLabels: [...f.querySelectorAll('label.error, .sub_label.error')].map(t),
            errorElements: [...f.querySelectorAll('.error')].map((el) => `${el.tagName.toLowerCase()}${el.name ? `[name=${el.name}]` : ''}: ${t(el).slice(0, 80)}`),
            inFormNotice: [...f.querySelectorAll('.notifyFormError, .pkp_notification')].map(t).filter(Boolean),
            titleSubLabel: t(f.querySelector('input[name^="title["]')?.closest('div, span')?.querySelector('label.sub_label') || document.createElement('i')),
        };
    });
}

/**
 * Issues › "Future Issues" › "Create Issue": record which part boxes arrive ticked, type the given
 * parts, set the part boxes (`show`, e.g. {Title: true}), press "Save". Reads the window and the
 * notices right after the save and again once the notice has gone, then "Future Issues".
 */
async function createIssue(page, contextPath, {volume = '', number = '', year = '', show = {}}, label) {
    const issues = issuesPage(page, contextPath);
    await issues.goto('Future Issues');
    record(`${label}-future-before`, await screen(page));
    const {dialog, form} = await issues.openCreate();
    const arrived = {};
    for (const part of ['Volume', 'Number', 'Year', 'Title']) arrived[part] = await form.showBox(part).isChecked();
    record(`${label}-create-open`, await screen(page));
    await shot(page, `${label}-create-open`).catch(() => {});
    await form.volumeBox().fill(volume);
    await form.numberBox().fill(number);
    await form.yearBox().fill(year);
    await form.setShowBoxes(show);
    const response = await form.save();
    await idle(page).catch(() => {});
    const toast = page.locator('.app__notifications .pkpNotification');
    // The notice comes and goes on its own timer: read it while shown, then once it has gone.
    await toast.first().waitFor({state: 'visible', timeout: 3000}).catch(() => {});
    const atOnce = {
        windowOpen: await dialog.isVisible(),
        toasts: (await toast.allInnerTexts()).map(flat),
        marks: (await dialog.isVisible()) ? await formMarks(form.form) : null,
    };
    const s1 = await screen(page);
    record(`${label}-after-save`, s1);
    await shot(page, `${label}-after-save`).catch(() => {});
    const t0 = Date.now();
    await toast.first().waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
    const later = {
        noticeGoneAfterMs: Date.now() - t0,
        windowOpen: await dialog.isVisible(),
        toasts: (await toast.allInnerTexts()).map(flat),
        marks: (await dialog.isVisible()) ? await formMarks(form.form) : null,
    };
    record(`${label}-after-notice`, await screen(page));
    await shot(page, `${label}-after-notice`).catch(() => {});
    if (later.windowOpen) await form.cancelLink().click();
    await issues.goto('Future Issues');
    const futureIssues = (await issues.names('Future Issues').allInnerTexts()).map(flat);
    record(`${label}-future-after`, await screen(page));
    return {arrived, status: response.status(), atOnce, notices: s1.notices, later, futureIssues};
}

module.exports = {flat, formMarks, createIssue};
