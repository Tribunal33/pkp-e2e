// Helpers of walk.js (U22 claim check H19, deleting an unfinished submission). Requiring this file runs nothing.
// Self-contained on purpose: the issue walks' helpers it started from are deleted with their reports.
const {idle, screen, sql} = require('../../../probe');
const {waitForEditorReady} = require('../../../support/richtext.js');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const L = (app) => (app.line && /3_[34]/.test(app.line) ? '' : '/en');

// Dataset accounts (docs/process/dataset.md): an author with an account in each app, the manager, the site admin.
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const SECTION = {ojs: 'Articles', omp: null, ops: 'Preprints'};
const MANAGER = 'rvaca';
const ADMIN = 'admin';

/** Every DELETE the page sends to the submissions APIs (a Vue form tunnels it as POST + override), with status and body. */
function watchDeletes(page) {
    const seen = [];
    page.on('response', async (r) => {
        const q = r.request();
        const m = q.headers()['x-http-method-override'] || q.method();
        if (m !== 'DELETE' || !/\/(_submissions|submissions)(\/|\?|$)/.test(r.url())) return;
        let body = null;
        try { body = flat(await r.text(), 600); } catch (e) { /* gone */ }
        seen.push({method: m, url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status(), body});
    });
    return seen;
}

async function typeRich(page, id, text) {
    await page.locator(`#${id}_ifr`).waitFor({state: 'visible', timeout: T});
    await waitForEditorReady(page, id);
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(text);
}

/** "Make a Submission": title, section / language when offered, the boxes, "Begin Submission". Returns the new id (a draft at step 1). */
async function beginSubmission(page, app, {title, section}) {
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/submission`));
    await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
    await typeRich(page, 'startSubmission-title-control', title);
    if (section) {
        const r = page.getByRole('radio', {name: section, exact: true});
        if (await r.count()) await r.check();
    }
    const en = page.getByRole('radio', {name: 'English', exact: true});
    if (await en.count()) await en.check();
    for (const name of [/meets all of these requirements/, /agree to have my data collected/]) {
        const b = page.getByRole('checkbox', {name});
        if (await b.count()) await b.check();
    }
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
    await page.locator('.pkpSteps__step__label--current').waitFor({timeout: T});
    await idle(page);
    return Number(new URL(page.url()).searchParams.get('id'));
}

async function openMySubmissions(page, app, view = '') {
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/dashboard/mySubmissions${view ? `?currentViewId=${view}` : ''}`));
    await idle(page);
}
async function openEditorial(page, app, view = '') {
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/dashboard/editorial${view ? `?currentViewId=${view}` : ''}`));
    await idle(page);
}
async function listed(page, title) {
    return (await page.getByRole('row').filter({hasText: title}).count()) > 0;
}

/** The selection box in the row holding this title (3.5 leaves the box without a name). */
const rowBox = (page, title) => page.getByRole('row').filter({hasText: title}).getByRole('checkbox');

/** What the database still holds for the submission. */
function rows(app, id) {
    const n = (q) => Number(sql(app, q) || 0);
    return {
        submissions: n(`select count(*) from submissions where submission_id = ${id}`),
        publications: n(`select count(*) from publications where submission_id = ${id}`),
        stageAssignments: n(`select count(*) from stage_assignments where submission_id = ${id}`),
    };
}

/** Records every dialog text the page renders from now on, with its time, so one that flashes and closes is seen. */
async function watchDialogs(page) {
    await page.evaluate(() => {
        window.__h19Dialogs = [];
        const t0 = performance.now();
        const seen = new Set();
        new MutationObserver(() => {
            for (const d of document.querySelectorAll('[role="dialog"], [role="alertdialog"]')) {
                const text = (d.innerText || '').replace(/\s+/g, ' ').trim();
                if (text && !seen.has(text)) {
                    seen.add(text);
                    window.__h19Dialogs.push({ms: Math.round(performance.now() - t0), text: text.slice(0, 300)});
                }
            }
        }).observe(document.body, {childList: true, subtree: true, characterData: true});
    });
}
const dialogsSeen = (page) => page.evaluate(() => window.__h19Dialogs || []).catch(() => null);

/**
 * On the open list: More Actions › "Delete Incomplete Submissions", tick the row, the button above
 * the list, "Confirm". Returns what each step showed; `rec(name, screen)` records the screens.
 */
async function bulkDelete(page, title, rec) {
    const out = {};
    const more = page.getByRole('button', {name: 'More Actions'}).first();
    await more.click({timeout: T});
    const item = page.getByRole('menuitem', {name: 'Delete Incomplete Submissions'});
    out.menuItemDisabled = await item.isDisabled().catch(() => null);
    rec('menu-open', await screen(page));
    await item.click({timeout: T});
    const box = rowBox(page, title);
    out.boxOffered = await box.waitFor({state: 'attached', timeout: 10_000}).then(() => true).catch(() => false);
    if (!out.boxOffered) { rec('no-box', await screen(page)); return out; }
    await box.check({timeout: T, force: true}); // the box sits under its drawn tick
    const btn = page.getByRole('button', {name: 'Delete Incomplete Submissions', exact: true});
    out.buttonDisabledAfterTick = await btn.isDisabled().catch(() => null);
    rec('ticked', await screen(page));
    await btn.click({timeout: T});
    const dlg = page.getByRole('dialog').filter({hasText: 'Confirm Delete of Incomplete Submissions'});
    await dlg.waitFor({timeout: T});
    out.confirmDialog = flat(await dlg.innerText());
    rec('confirm-dialog', await screen(page));
    await watchDialogs(page);
    const resp = page.waitForResponse((r) => /\/_submissions/.test(r.url()) && (r.request().headers()['x-http-method-override'] || r.request().method()) === 'DELETE', {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
    const r = await resp;
    out.response = r ? {status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '')} : null;
    await dlg.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await idle(page);
    await page.waitForTimeout(1500); // a refusal's error dialog opens after the answer
    const after = await screen(page);
    rec('after-confirm', after);
    out.afterConfirm = {dialogsRendered: await dialogsSeen(page), dialogOnScreen: after.text.dialog, notices: after.notices,
        // read from the text: while an error dialog is open the rows leave the accessibility tree (getByRole finds none)
        listed: (after.text.main || '').includes(title)};
    return out;
}

/** DELETE {apiBaseUrl}submissions/{id} in the signed-in session (the public API no screen calls). */
async function apiDelete(page, id) {
    return page.evaluate(async (id) => {
        /* global pkp */
        const base = pkp.context.apiBaseUrl;
        const r = await fetch(`${base}submissions/${id}`, {method: 'DELETE', headers: {'X-Csrf-Token': pkp.currentUser.csrfToken, Accept: 'application/json'}});
        return {url: `${base}submissions/${id}`.replace(/^https?:\/\/[^/]+/, ''), status: r.status, body: (await r.text()).replace(/\s+/g, ' ').slice(0, 600)};
    }, id);
}

module.exports = {T, flat, L, AUTHOR, SECTION, MANAGER, ADMIN, watchDeletes, beginSubmission, openMySubmissions, openEditorial, listed, rowBox, rows, watchDialogs, dialogsSeen, bulkDelete, apiDelete};
