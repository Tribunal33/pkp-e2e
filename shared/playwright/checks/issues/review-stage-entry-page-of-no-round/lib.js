// Helpers of walk.js (U71 OMP7 with U24 A6: the review stage's own side-menu entry opens a page
// that belongs to no round; docs/issues/U71-OMP7-review-stage-entry-page-of-no-round.md).
// Requiring this file runs nothing. The workflow's address is
// ../change-file-keeps-first-upload/lib.js's, the heading read
// ../author-revision-filed-on-earlier-internal-round/lib.js's.
const {idle, sql, settled} = require('../../../probe');
const W = require('../change-file-keeps-first-upload/lib.js');
const D = require('../author-revision-filed-on-earlier-internal-round/lib.js');

const T = 60_000;

/** Collect the page's console errors and uncaught errors; `take()` returns those since the last take. */
function watchErrors(page) {
    let seen = [];
    page.on('console', (m) => { if (m.type() === 'error') seen.push(W.flat(m.text(), 260)); });
    page.on('pageerror', (e) => seen.push(`pageerror: ${W.flat(e.message, 260)}`));
    return {take: () => { const out = seen; seen = []; return out; }};
}

/** Open the submission's workflow from the dashboard's address ("My Submissions" for an author), on `key` when given. */
async function open(page, app, id, {author = false, key} = {}) {
    await page.goto('about:blank');
    await W.openWorkflow(page, app, id, key, author ? 'mySubmissions' : 'editorial');
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: T});
    await idle(page);
    await page.waitForTimeout(700);
    await idle(page);
}

/** Reload the page as it stands and wait for the workflow window. */
async function reload(page) {
    await page.reload();
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: T});
    await idle(page);
    await page.waitForTimeout(700);
    await idle(page);
}

/** The workflow's side-menu entries, top to bottom: label, whether it is the selected one, aria-expanded. */
const menu = (page) => page.evaluate(() => {
    const vis = (e) => e.getClientRects().length > 0;
    const root = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
    return [...root.querySelectorAll('.p-panelmenu a, [data-pc-name="panelmenu"] a')].filter(vis).map((a) => {
        const holder = a.closest('[aria-expanded]');
        return {
            label: a.innerText.replace(/\s+/g, ' ').trim(),
            selected: /bg-selection-dark/.test(a.className),
            expanded: holder ? holder.getAttribute('aria-expanded') : null,
        };
    });
});

/** Press the side-menu entry whose label is exactly `label` (the first such). Returns whether it was there. */
async function pressEntry(page, label) {
    const found = await page.evaluate((label) => {
        const vis = (e) => e.getClientRects().length > 0;
        const root = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
        document.querySelectorAll('[data-u71c-entry]').forEach((e) => e.removeAttribute('data-u71c-entry'));
        const hit = [...root.querySelectorAll('.p-panelmenu a, [data-pc-name="panelmenu"] a')].filter(vis)
            .find((a) => a.innerText.replace(/\s+/g, ' ').trim() === label);
        if (hit) hit.setAttribute('data-u71c-entry', '1');
        return !!hit;
    }, label);
    if (!found) return false;
    await page.locator('[data-u71c-entry="1"]').first().click();
    await idle(page);
    await page.waitForTimeout(700);
    await idle(page);
    return true;
}

/** Rows of the workflow's table named `name` (null when the page has no such table). */
async function rows(page, name) {
    const table = page.getByRole('table', {name, exact: true}).first();
    if (!(await table.count()) || !(await table.isVisible().catch(() => false))) return null;
    return (await table.locator('tbody tr').allInnerTexts()).map((t) => W.flat(t, 160));
}

/**
 * What the open workflow shows: its heading, the address's menu key, the status box (heading and
 * first line), the panels of the main and right-hand columns, the decision buttons, the
 * "Reviewers" rows and the side menu.
 */
async function state(page) {
    const win = page.locator('[role="dialog"]:visible').first();
    const texts = async (sel) => (await win.locator(sel).allInnerTexts().catch(() => [])).map((x) => W.flat(x, 80)).filter(Boolean);
    const primary = W.flat(await win.locator('[data-cy="workflow-primary-items"]').first().innerText().catch(() => null), 4000);
    const lines = (await win.locator('[data-cy="workflow-primary-items"]').first().innerText().catch(() => '')).split('\n').map((l) => l.trim()).filter(Boolean);
    const at = lines.findIndex((l) => /^(round \d+ )?status$/i.test(l));
    return {
        heading: await D.workflowHeading(page),
        key: new URL(page.url()).searchParams.get('workflowMenuKey'),
        status: at < 0 ? null : `${lines[at]} / ${lines[at + 1] || ''}`,
        panels: await texts('[data-cy="workflow-primary-items"] h3:visible'),
        right: await texts('[data-cy="workflow-secondary-items"] h3:visible, [data-cy="workflow-secondary-items"] h2:visible'),
        buttons: await texts('[data-cy="workflow-action-items"] button:visible'),
        reviewers: await rows(page, 'Reviewers'),
        primaryLength: primary ? primary.length : 0,
        menu: await menu(page),
    };
}

/** Press "Add Reviewer" and read the window it opens: its title and text, and the legacy request behind it. Closes it. */
async function addReviewer(page) {
    const button = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Add Reviewer', exact: true}).first();
    if (!(await button.count())) return {offered: false};
    const requests = [];
    const onResponse = (r) => { if (/reviewer-grid|reviewer\/reviewer/.test(r.url())) requests.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 260)}`); };
    page.on('response', onResponse);
    await button.click();
    const win = page.getByRole('dialog', {name: /Add Reviewer/i}).last();
    await win.waitFor({timeout: T});
    await idle(page);
    const text = await settled(page, win);
    page.off('response', onResponse);
    const out = {offered: true, window: W.flat(text, 400), requests};
    const close = win.getByRole('button', {name: /^(Close|Cancel)/}).first();
    if (await close.count()) { await close.click().catch(() => {}); await page.waitForTimeout(1500); }
    return out;
}

/** The submission's review rounds as stored: {id, stageId, round}, oldest first. */
function rounds(app, submissionId) {
    const out = sql(app, `select review_round_id, stage_id, round from review_rounds where submission_id = ${Number(submissionId)} order by stage_id, round`);
    return out ? out.split('\n').map((l) => { const [id, stageId, round] = l.split('|').map(Number); return {id, stageId, round}; }) : [];
}

module.exports = {T, watchErrors, open, reload, menu, pressEntry, rows, state, addReviewer, rounds};
