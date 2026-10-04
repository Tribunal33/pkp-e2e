// Helpers of walk.js (issue report docs/issues/U58-OMP1-press-copyright-notice-label-lowercase.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const {flat, L} = require('../section-editors-not-assigned-second-journal/lib.js');
const {openSubmissionsPage} = require('../press-copyright-edit-opens-disable-submissions/lib.js');
const {workflowPage, openWorkflow, openWorkflowInLocale, readGuidanceLabels} = require('../press-disable-submissions-help-says-articles/lib.js');

const T = 30_000;

/** On "Author Guidance" (open): type a text into the copyright box and "Save". Returns whether "Saved" showed. */
async function saveCopyrightNotice(page, app, text) {
    const w = workflowPage(page, app);
    await w.guidance.type('Copyright Notice', text);
    await w.guidance.pressSave();
    await w.guidance.savedStatus.waitFor({timeout: T});
    await idle(page);
    return true;
}

/** The "Submissions" page: the headings of its parts, in order. */
async function submissionsHeadings(page, app) {
    await openSubmissionsPage(page, app);
    return (await page.locator('.page_submissions h2').allInnerTexts()).map((s) => flat(s));
}

/** A typed address under the context (e.g. `information/sampleCopyrightWording`): status, title, first heading. */
async function readTypedPage(page, app, rest) {
    const resp = await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/${rest}`));
    await idle(page);
    const h = page.locator('h1').first();
    return {status: resp && resp.status(), title: await page.title(), h1: (await h.count()) ? flat(await h.innerText()) : null};
}

module.exports = {workflowPage, openWorkflow, openWorkflowInLocale, readGuidanceLabels, saveCopyrightNotice, submissionsHeadings, readTypedPage};
