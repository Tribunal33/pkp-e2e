// Helpers for the U72 A11 walk ("Order" pressed while the chapter list is being ordered moves
// the submission wizard to its first step). Requiring this file runs nothing. Every helper drives
// the screens; `openChapters` is copied from the U72 A12 walk's lib.js so this folder stands alone.
const path = require('path');
const {idle, screen, record, shot} = require('../../../probe');

const ROOT = path.resolve(__dirname, '../../../../..');
const omp = (file) => require(path.join(ROOT, 'apps/omp/playwright/pages', file));
const ops = (file) => require(path.join(ROOT, 'apps/ops/playwright/pages', file));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const L = (app) => (app.line && /3_[34]/.test(app.line) ? '' : '/en');

async function snap(page, name) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message)}; }
    record(name, s);
    await shot(page, name).catch(() => {});
}

/** Record every chapter-grid save (the "Done" request) and every 4xx/5xx answer. */
function watch(page) {
    const saves = [];
    const bad = [];
    page.on('response', (r) => {
        const u = r.url().replace(/^https?:\/\/[^/]+/, '');
        if (/save-sequence/i.test(u)) saves.push({at: Date.now(), status: r.status(), url: u.slice(0, 160)});
        if (r.status() >= 400) bad.push({status: r.status(), method: r.request().method(), url: u.slice(0, 200)});
    });
    return {saves, bad};
}

/** Start a submission through "Make a Submission" (Monograph) and open the wizard's "Details" step. */
async function startToDetails(page, app, title) {
    const W = omp('SubmissionWizardPages.js');
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/submission`));
    await idle(page);
    const en = page.getByRole('radio', {name: 'English', exact: true});
    if (await en.count()) await en.check();
    // Fills "Title", ticks the confirmation boxes, "Begin Submission", waits for "Upload Files".
    await W.beginSubmission(page, {title});
    const id = Number(new URL(page.url()).searchParams.get('id'));
    await W.continueTo(page, W.STEPS.details);
    await idle(page);
    return id;
}

/** The wizard's open step, the address's #hash and scroll, and the chapter list's ordering state. */
async function state(page) {
    const list = new (omp('ChapterPages.js').ChapterList)(page);
    const step = flat(await page.locator('.pkpSteps__step__label--current').first().innerText({timeout: 3000}).catch(() => null), 80);
    const loc = await page.evaluate(() => ({hash: location.hash, scrollY: Math.round(window.scrollY)}));
    const gridVisible = await list.grid().isVisible().catch(() => false);
    const out = {step: step || null, hash: loc.hash, scrollY: loc.scrollY, gridVisible};
    if (await list.grid().count()) {
        Object.assign(out, await list.grid().evaluate((root) => {
            const vis = (e) => !!(e && e.getClientRects().length);
            const t = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
            const order = root.querySelector('.header a.pkp_linkaction_orderItems');
            return {
                headerLinks: [...root.querySelectorAll('.header ul.actions a')].filter(vis).map(t),
                orderLink: order ? {disabled: order.hasAttribute('disabled'), href: order.getAttribute('href')} : null,
                finishControls: [...root.querySelectorAll('.order_finish_controls a')].filter(vis).map(t),
                handles: [...root.querySelectorAll('a.pkp_linkaction_moveItem')].filter(vis).length,
                chapters: [...root.querySelectorAll('tbody.category_grid_body')].map((tb) => t(tb.querySelector('tr.gridRow td .gridCellContainer'))),
            };
        }));
    }
    return out;
}

/**
 * OPS: start a preprint through "Make a Submission" (section "Preprints") and open the wizard's
 * "Upload Files" step (the first on `main`; the second, after "Details", on 3.5).
 */
async function startToFilesOps(page, app, title) {
    const W = ops('SubmissionWizardPages.js');
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/submission`));
    await idle(page);
    const en = page.getByRole('radio', {name: 'English', exact: true});
    if (await en.count()) await en.check();
    // The dataset's server has one section, so the form offers no section to choose. Ends
    // waiting for "Upload Files" as the open step, which on 3.5 is "Details": that wait may fail.
    await W.beginSubmission(page, {title}).catch(() => {});
    await page.locator('.pkpSteps__step__label--current').first().waitFor({timeout: 30_000});
    const id = Number(new URL(page.url()).searchParams.get('id'));
    const cur = flat(await page.locator('.pkpSteps__step__label--current').first().innerText());
    if (!/Upload Files$/.test(cur)) await W.continueTo(page, W.STEPS.files);
    await idle(page);
    return {id, openedOn: cur};
}

/** OPS: the galley list's ordering state and the wizard's open step, as `state` reads the chapter list. */
async function stateOps(page) {
    const step = flat(await page.locator('.pkpSteps__step__label--current').first().innerText({timeout: 3000}).catch(() => null), 80);
    const loc = await page.evaluate(() => ({hash: location.hash, scrollY: Math.round(window.scrollY)}));
    const grid = galleyGrid(page);
    const out = {step: step || null, hash: loc.hash, scrollY: loc.scrollY, gridVisible: await grid.isVisible().catch(() => false)};
    if (await grid.count()) {
        Object.assign(out, await grid.evaluate((root) => {
            const vis = (e) => !!(e && e.getClientRects().length);
            const t = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
            const order = root.querySelector('.header a.pkp_linkaction_orderItems');
            return {
                headerLinks: [...root.querySelectorAll('.header ul.actions a')].filter(vis).map(t),
                orderLink: order ? {disabled: order.hasAttribute('disabled'), href: order.getAttribute('href')} : null,
                finishControls: [...root.querySelectorAll('.order_finish_controls a')].filter(vis).map(t),
                handles: [...root.querySelectorAll('a.pkp_linkaction_moveItem')].filter(vis).length,
                rows: [...root.querySelectorAll('tbody tr.gridRow')].filter(vis).map((tr) => t(tr.querySelector('td'))),
            };
        }));
    }
    return out;
}

/** OPS: the wizard's galley list ("Files" on the "Upload Files" step). */
const galleyGrid = (page) => page.locator('[id^="component-grid-preprintgalleys-preprintgalleygrid"]').first();

/** Open the book's "Chapters" (main: the side menu's "Chapters"; 3.5: "Publication" › "Chapters"). */
async function openChapters(page, app, subId) {
    const {WorkflowPage} = require(path.join(ROOT, 'shared/playwright/pages/WorkflowPage.js'));
    const {ChapterList} = omp('ChapterPages.js');
    const frame = new WorkflowPage(page, app.contextPath);
    if (app.line === 'stable-3_5_0') {
        await frame.gotoEditorial(subId, {menuKey: 'publication_chapters'});
    } else {
        await frame.gotoEditorial(subId);
        await frame.selectPage('Chapters');
    }
    const list = new ChapterList(page);
    await list.expectLoaded();
    await idle(page);
    return list;
}

module.exports = {ROOT, omp, ops, sleep, flat, snap, watch, startToDetails, state, openChapters, startToFilesOps, stateOps, galleyGrid};
