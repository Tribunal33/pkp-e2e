// Helpers of walk.js (issue report docs/issues/U58-OMP2-press-copyright-edit-opens-disable-submissions.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const {setCopyrightNotice} = require('../copyright-agreed-log-raw-placeholder/lib.js');
const {flat, L} = require('../section-editors-not-assigned-second-journal/lib.js');

/** The "Submissions" page (About › Submissions) of the signed-in user's context. */
async function openSubmissionsPage(page, app) {
    const {AboutSubmissionsPage} = require('../../../pages/SubmissionIntakePages.js');
    const p = new AboutSubmissionsPage(page, app.contextPath, {locale: L(app).replace('/', '')});
    await p.open();
    await idle(page);
    return p;
}

/**
 * On the "Submissions" page: press "Edit" beside a part's heading and read where it landed: the
 * link's address, the page's address, the selected top tab and side tab of Workflow Settings, and
 * whether the "Copyright Notice" ("Copyright notice" on a press) box's label is on screen. Records rather than throws.
 */
async function pressEditAndRead(page, app, heading) {
    const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
    const sub = await openSubmissionsPage(page, app);
    const link = sub.partEditLink(heading);
    const out = {heading, linkCount: await link.count()};
    if (!out.linkCount) return out;
    out.href = await link.first().getAttribute('href');
    await link.first().click();
    const w = new WorkflowSubmissionSettings(page, app.contextPath, {locale: L(app).replace('/', '')});
    try {
        await w.waitLoaded();
    } catch (e) {
        out.loadError = flat(e.message, 300);
    }
    await idle(page);
    out.url = page.url();
    out.hash = new URL(page.url()).hash;
    const selected = page.getByRole('main').getByRole('tab', {selected: true});
    out.selectedTabs = (await selected.allInnerTexts()).map((t) => flat(t));
    out.selectedSideTab = (await w.selectedSideTab().count()) ? flat(await w.selectedSideTab().first().innerText()) : null;
    const label = page.locator('#instructions .pkpFormFieldLabel').filter({hasText: /^\s*Copyright notice\s*$/i});
    out.copyrightBoxVisible = (await label.count()) > 0 && (await label.first().isVisible());
    return out;
}

module.exports = {setCopyrightNotice, openSubmissionsPage, pressEditAndRead};
