// Helpers of walk.js here and of ../press-copyright-notice-label-lowercase/walk.js (issue reports
// docs/issues/U58-OMP1-press-disable-submissions-help-says-articles.md and
// docs/issues/U58-OMP1-press-copyright-notice-label-lowercase.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const {flat, L} = require('../section-editors-not-assigned-second-journal/lib.js');

const T = 30_000;

/** The Workflow Settings page object for the app's English interface (or another locale). */
function workflowPage(page, app, locale = null) {
    const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
    return new WorkflowSubmissionSettings(page, app.contextPath, {locale: locale || L(app).replace('/', '')});
}

/** Settings › Workflow by its address (`management/settings/workflow`). Returns the page object. */
async function openWorkflow(page, app) {
    const w = workflowPage(page, app);
    await w.goto();
    await idle(page);
    return w;
}

/** Open Workflow Settings by its address in another interface language (e.g. fr_CA), on a side tab id. */
async function openWorkflowInLocale(page, app, locale, sideTabId) {
    const w = workflowPage(page, app, locale);
    await page.goto(w.url(`#submission/${sideTabId}`));
    await page.locator(`#${sideTabId}`).waitFor({state: 'visible', timeout: T});
    await idle(page);
    return w;
}

/**
 * "Disable Submissions": the selected side tab, the heading, the help under it (verbatim) and the
 * address of the help's link. Records rather than throws.
 */
async function readDisableHelp(page) {
    const panel = page.locator('#disableSubmissions');
    const out = {};
    try {
        await panel.waitFor({state: 'visible', timeout: T});
        const sel = page.locator('#submission [role="tab"][aria-selected="true"]');
        out.selectedSideTab = (await sel.count()) ? flat(await sel.first().innerText()) : null;
        const desc = panel.locator('.pkpFormField__description, .pkpFormFieldLabel + div, [id$="-description"]').first();
        out.help = (await desc.count()) ? flat(await desc.innerText()) : null;
        out.panelText = flat(await panel.innerText());
        const link = panel.locator('a[href]').first();
        out.helpLinkText = (await link.count()) ? flat(await link.innerText()) : null;
        out.helpLinkHref = (await link.count()) ? await link.getAttribute('href') : null;
    } catch (e) {
        out.error = flat(e.message, 300);
    }
    return out;
}

/** "Author Guidance": every box label in order, and the copyright box's own label. Records rather than throws. */
async function readGuidanceLabels(page) {
    const out = {};
    try {
        const panel = page.locator('#instructions');
        await panel.waitFor({state: 'visible', timeout: T});
        out.labels = (await panel.locator('.pkpFormField--richTextarea .pkpFormFieldLabel').allInnerTexts()).map((s) => flat(s));
        const field = panel.locator('.pkpFormField--richTextarea').filter({has: page.locator('[id^="submissionGuidanceSettings-copyrightNotice-control"]')});
        out.copyrightLabel = (await field.count()) ? flat(await field.first().locator('.pkpFormFieldLabel').first().innerText()) : null;
    } catch (e) {
        out.error = flat(e.message, 300);
    }
    return out;
}

module.exports = {workflowPage, openWorkflow, openWorkflowInLocale, readDisableHelp, readGuidanceLabels};
