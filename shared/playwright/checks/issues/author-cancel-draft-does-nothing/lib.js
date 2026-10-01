// Helpers of walk.js (U21 OPS3). Requiring this file runs nothing. Every helper drives the screens.
const {idle, screen} = require('../../../probe');
const {beginSubmission, flat, T} = require('../wizard-refused-save-hangs-saving/lib.js');

const oldLine = (app) => !!(app.line && /3_[34]/.test(app.line));
const L = (app) => (oldLine(app) ? '' : '/en');
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const SECTION = {ojs: 'Articles', omp: null, ops: 'Preprints'};

/** Watch the wizard's DELETE (the cancel) and the dashboard's bulk DELETE, with status and body. */
function watchDeletes(page) {
    const seen = [];
    page.on('response', async (r) => {
        const q = r.request();
        const m = q.headers()['x-http-method-override'] || q.method();
        if (m !== 'DELETE' || !/\/_submissions/.test(r.url())) return;
        let body = null;
        try { body = flat(await r.text(), 300); } catch (e) { /* gone */ }
        seen.push({method: m, url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status(), body});
    });
    return seen;
}

/** Footer "Cancel" › dialog "OK". Returns {dialog, after} (the dialog's text, then the screen). */
async function cancelInWizard(page) {
    await page.locator('#cancelSubmission').click({timeout: T});
    const dlg = page.getByRole('dialog').filter({hasText: 'Cancel submission'});
    await dlg.waitFor({timeout: T});
    const dialog = flat(await dlg.innerText());
    const nav = page.waitForURL(/submission\/cancelled|cancelled/, {timeout: 10_000}).then(() => true).catch(() => false);
    await dlg.getByRole('button', {name: 'OK', exact: true}).click();
    const navigated = await nav;
    await idle(page);
    return {dialog, navigated, url: page.url(), after: await screen(page)};
}

/** My Submissions: is a row with this title listed? */
async function openMySubmissions(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/dashboard/mySubmissions`));
    await idle(page);
}
async function listed(page, title) {
    return (await page.getByText(title, {exact: false}).count()) > 0;
}

/** The selection box in the row holding this title (3.5 leaves the box without a name). */
const rowBox = (page, title) => page.getByRole('row').filter({hasText: title}).getByRole('checkbox');

/** My Submissions › More Actions › "Delete Incomplete Submissions", tick the row, delete, "Confirm". */
async function bulkDelete(page, app, title) {
    await openMySubmissions(page, app);
    await page.getByRole('button', {name: 'More Actions'}).first().click({timeout: T});
    await page.getByRole('menuitem', {name: 'Delete Incomplete Submissions'}).click({timeout: T});
    const box = rowBox(page, title);
    if (!(await box.waitFor({state: 'attached', timeout: 10_000}).then(() => true).catch(() => false))) {
        return {offered: false, after: await screen(page)};
    }
    // the box is visually hidden under its drawn tick, which takes the pointer
    await box.check({timeout: T, force: true});
    await page.getByRole('button', {name: 'Delete Incomplete Submissions', exact: true}).click({timeout: T});
    const dlg = page.getByRole('dialog').filter({hasText: 'Confirm Delete of Incomplete Submissions'});
    await dlg.waitFor({timeout: T});
    const dialog = flat(await dlg.innerText());
    await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
    await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return {offered: true, dialog, after: await screen(page)};
}

module.exports = {T, flat, L, AUTHOR, SECTION, rowBox, beginSubmission, watchDeletes, cancelInWizard, openMySubmissions, listed, bulkDelete};
