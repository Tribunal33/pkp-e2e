// Helpers for walk.js (U45 OJS10: a cancelled review's DOI). Requiring this file runs nothing.
const path = require('path');
const {execFileSync} = require('child_process');
const {request: pwRequest, expect} = require('@playwright/test');
const {screen, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const STATUS = {1: 'Unregistered', 2: 'Submitted', 3: 'Registered', 4: 'Error', 5: 'Needs Sync'};
const REPO = path.resolve(__dirname, '../../../../..');

/** The reviewer row of `name` in the work's review round, the round picked when the stage opens elsewhere. */
async function openRound(page, app, frame, id, name) {
    await frame.gotoEditorial(id);
    await idle(page);
    const R = require(path.join(app.suiteDir, 'pages', 'ReviewStagePages.js'));
    const wf = new R.WorkflowPage(page, app.contextPath);
    const row = wf.reviewerRow(name);
    if (!(await row.isVisible().catch(() => false))) {
        await frame.selectRound(1);
        await idle(page);
    }
    await row.waitFor({state: 'visible', timeout: T});
    return {R, row};
}

async function rowText(page, app, frame, id, name) {
    const {row} = await openRound(page, app, frame, id, name);
    return flat(await row.innerText(), 300);
}

/** "More Actions" › "Edit": tick (or untick) the public-visibility box, "OK". Returns the box's label and state. */
async function setPublic(page, app, frame, id, name, on) {
    const {R, row} = await openRound(page, app, frame, id, name);
    const modal = await R.openEditReview(page, row);
    const box = R.publicVisibilityCheckbox(modal);
    const label = flat(await box.evaluate((el) => (el.closest('label') || el.parentElement || el).textContent).catch(() => null), 200);
    const before = await box.isChecked();
    if (on) await box.check();
    else await box.uncheck();
    await R.saveEditReview(page, modal);
    await idle(page);
    return {label, before, after: on, row: await rowText(page, app, frame, id, name)};
}

/** "More Actions" › "Cancel Reviewer": the menu's entries, the window's words, "Do not send email" ticked, confirmed. */
async function cancelReviewer(page, app, frame, id, name) {
    const {R, row} = await openRound(page, app, frame, id, name);
    const before = flat(await row.innerText(), 300);
    const menu = await R.openRowMenu(page, row);
    const offered = (await menu.getByRole('menuitem').allInnerTexts()).map((s) => flat(s));
    await menu.getByRole('menuitem', {name: 'Cancel Reviewer', exact: true}).click();
    const form = page.locator('form#cancelReviewForm');
    await expect(form).toBeVisible({timeout: T});
    await idle(page);
    await sleep(800);
    const s = await screen(page);
    const skip = form.locator('input[name="skipEmail"]');
    const skipLabel = flat(await skip.evaluate((el) => (el.closest('label') || el.parentElement || el).textContent).catch(() => null), 200);
    await skip.check().catch(() => {});
    await form.getByRole('button', {name: 'Cancel Reviewer', exact: true}).click();
    await expect(form).toBeHidden({timeout: T});
    await idle(page);
    const notices = (await screen(page)).notices || [];
    return {before, offered, window: flat(s.text && s.text.dialog, 500), skipLabel, notices: notices.map((n) => flat(n.text || n, 200)), after: await rowText(page, app, frame, id, name)};
}

/** "More Actions" › "Reinstate Reviewer", confirmed. */
async function reinstateReviewer(page, app, frame, id, name) {
    const {R, row} = await openRound(page, app, frame, id, name);
    const before = flat(await row.innerText(), 300);
    const menu = await R.openRowMenu(page, row);
    const offered = (await menu.getByRole('menuitem').allInnerTexts()).map((s) => flat(s));
    await menu.getByRole('menuitem', {name: 'Reinstate Reviewer', exact: true}).click();
    const form = page.locator('form#reinstateReviewerForm');
    await expect(form).toBeVisible({timeout: T});
    await idle(page);
    await sleep(800);
    const s = await screen(page);
    const skip = form.locator('input[name="skipEmail"]');
    if (await skip.count()) await skip.check().catch(() => {});
    await form.getByRole('button', {name: 'Reinstate Reviewer', exact: true}).click();
    await expect(form).toBeHidden({timeout: T});
    await idle(page);
    return {before, offered, window: flat(s.text && s.text.dialog, 400), after: await rowText(page, app, frame, id, name)};
}

/** The work's review assignments as stored: id, reviewer, cancelled, DOI and its status (read only). */
function storedReviews(app, id) {
    return sql(app, `select ra.review_id, u.username, ra.cancelled, coalesce(d.doi, '-'), coalesce(d.status::text, '-')
        from review_assignments ra join users u on u.user_id = ra.reviewer_id left join dois d on d.doi_id = ra.doi_id
        where ra.submission_id = ${Number(id)} order by ra.review_id`)
        .split('\n').filter(Boolean).map((l) => {
            const [rid, user, cancelled, doi, status] = l.split('|');
            return `${rid} ${user}${cancelled === '1' ? ' CANCELLED' : ''}: ${doi} ${STATUS[status] || status}`;
        });
}

/** The journal's public review record of a work, signed out (the open peer-review API; no screen calls it). */
async function publicRecord(app, id) {
    const pub = await pwRequest.newContext();
    try {
        const r = await pub.get(app.url(`/index.php/${app.contextPath}/api/v1/peerReviews/open/submissions/${id}`));
        if (r.status() !== 200) return {status: r.status(), body: flat(await r.text(), 300)};
        const j = await r.json();
        return {status: 200, reviews: (j.reviewRounds || []).flatMap((x) => (x.reviews || []).map((y) => y.id))};
    } finally {
        await pub.dispose();
    }
}

/**
 * Read-only: what "Deposit All", "Export DOIs" and a work's deposit would take, from the agency plugin's own lists
 * (shared/playwright/checks/U45/H15/xml-read.php, validation off). Returns {depositAllTakes, reviewExportable}.
 */
function exportLists(app, id) {
    const root = path.resolve(REPO, app.root);
    const config = path.isAbsolute(app.configFile) ? app.configFile : path.resolve(REPO, app.configFile);
    const out = execFileSync('php', [path.join(REPO, 'shared/playwright/checks/U45/H15/xml-read.php'), root, app.contextPath, String(id)],
        {env: {...process.env, PKP_CONFIG_FILE: config}, encoding: 'utf8', timeout: 180000, cwd: root});
    const x = JSON.parse(out.trim().split('\n').pop());
    const w = x.works[id] || {};
    return {
        reviewExportable: w.reviewExportable,
        depositAllTakes: Array.isArray(x.depositable) ? x.depositable.filter((d) => d.submissionId === id).map((d) => `${d.doi} ${STATUS[d.status]} (${d.carriers.join(', ')})`) : x.depositable,
    };
}

module.exports = {T, sleep, flat, STATUS, openRound, rowText, setPublic, cancelReviewer, reinstateReviewer, storedReviews, publicRecord, exportLists};
