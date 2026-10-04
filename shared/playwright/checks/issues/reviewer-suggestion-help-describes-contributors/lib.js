// Helpers of walk.js (issue report docs/issues/U58-A7-reviewer-suggestion-help-describes-contributors.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const {flat, L} = require('../section-editors-not-assigned-second-journal/lib.js');

const T = 30_000;

/**
 * Settings › Workflow › "Submission" › "Author Guidance", by the page's address in the given
 * interface language (default the app's English segment), then the side tab pressed. Returns the
 * page object.
 */
async function openAuthorGuidance(page, app, locale = null) {
    const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
    const w = new WorkflowSubmissionSettings(page, app.contextPath, {locale: locale || L(app).replace('/', '')});
    await page.goto(w.url());
    await w.submissionPanel.waitFor({state: 'visible', timeout: T});
    await w.sideTab('Author Guidance').click();
    await page.locator('#instructions').waitFor({state: 'visible', timeout: T});
    await page.locator('#instructions .pkpFormField--richTextarea').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    return w;
}

/**
 * "Author Guidance": every rich-text box in screen order, each with its label, its help (verbatim)
 * and its field name (from the editor's id). Records rather than throws.
 */
async function readGuidanceBoxes(page) {
    const out = {boxes: []};
    try {
        const fields = page.locator('#instructions .pkpFormField--richTextarea');
        const n = await fields.count();
        for (let i = 0; i < n; i++) {
            const f = fields.nth(i);
            const label = flat(await f.locator('.pkpFormFieldLabel').first().innerText());
            const desc = f.locator('.pkpFormField__description').first();
            const help = (await desc.count()) ? flat(await desc.innerText()) : null;
            const ctl = f.locator('[id^="submissionGuidanceSettings-"][id*="-control"]').first();
            const id = (await ctl.count()) ? await ctl.getAttribute('id') : null;
            const field = id ? (id.match(/^submissionGuidanceSettings-(.+?)-control/) || [])[1] || null : null;
            out.boxes.push({label, field, help});
        }
    } catch (e) {
        out.error = flat(e.message, 300);
    }
    return out;
}

/** A box's own text as its editor holds it (tags removed), by field name; null when absent. */
async function boxText(page, field) {
    try {
        const prefix = `submissionGuidanceSettings-${field}-control`;
        const html = await page.evaluate((p) => {
            const ed = ((window.tinymce && window.tinymce.get()) || []).find((e) => e.id === p || e.id.startsWith(`${p}-`));
            return ed ? ed.getContent() : null;
        }, prefix);
        return html === null ? null : flat(String(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' '));
    } catch (e) {
        return `error: ${flat(e.message, 200)}`;
    }
}

module.exports = {openAuthorGuidance, readGuidanceBoxes, boxText};
