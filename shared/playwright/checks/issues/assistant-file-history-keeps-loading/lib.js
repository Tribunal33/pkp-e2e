// Helpers of walk.js (U36 A3: a file's "More Information" > "History" keeps showing "Loading" for
// the assistant roles; docs/issues/U36-A3-assistant-file-history-keeps-loading.md).
// Requiring this file runs nothing. The upload wizard's and the notes' helpers are the sibling
// walks' (change-file-keeps-first-upload, add-note-empty-box-posts-empty-note).
const fs = require('fs');
const os = require('os');
const path = require('path');
const {idle} = require('../../../probe');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per app: the Copyediting submission mfritz (Copyeditor) is assigned to, the component and the author. */
const CASES = {
    ojs: {submissionId: 3, component: 'Article Text', author: 'ckwantes'},
    omp: {submissionId: 7, component: 'Book Manuscript', author: 'dkennepohl'},
};
const FILE = 'u36h-copyedit.pdf';

/** A small PDF named u36h-copyedit.pdf in a temp folder: {path, name}. */
function theFile() {
    const src = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u36h-'));
    const p = path.join(dir, FILE);
    fs.copyFileSync(src, p);
    return {path: p, name: FILE};
}

/** The window on top. */
const top = (page) => page.locator('[role="dialog"]:visible').last();

/**
 * Every answer of the history grids' requests from now on: the grid, the operation, the HTTP
 * status and the legacy JSON answer's `status` and text (a refusal answers 200 with status false).
 */
function watchHistory(page) {
    const list = [];
    page.on('response', async (r) => {
        const m = r.url().match(/(submission-file-event-log-grid|submission-event-log-grid)\/([a-z-]+)/);
        if (!m) return;
        const entry = {grid: m[1], op: m[2], http: r.status()};
        const body = await r.text().catch(() => '');
        try {
            const j = JSON.parse(body);
            entry.status = j.status;
            entry.content = flat(String(j.content || '').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' '), 200);
        } catch (e) { entry.body = flat(body, 200); }
        list.push(entry);
    });
    return list;
}

/** The names of the top window's tabs and the one selected. */
async function tabs(page) {
    const win = top(page);
    return {
        title: flat(await win.locator('h1, h2').first().innerText().catch(() => null), 200),
        tabs: (await win.getByRole('tab').allInnerTexts()).map((t) => flat(t, 40)),
        selected: flat(await win.locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => null), 40),
    };
}

/**
 * What the selected tab shows after up to `wait` ms: the panel's text and, when the history's
 * table is there, its lines as {date, user, event}, newest first.
 */
async function readHistory(page, wait = 10_000) {
    const win = top(page);
    const started = Date.now();
    await win.locator('tr.gridRow').first().waitFor({state: 'visible', timeout: wait}).catch(() => {});
    const waited = Date.now() - started;
    await idle(page).catch(() => {});
    const panel = win.locator('.ui-tabs-panel:visible').first();
    const text = flat(await ((await panel.count()) ? panel : win).evaluate((e) => {
        const c = e.cloneNode(true);
        c.querySelectorAll('script, style').forEach((x) => x.remove());
        return c.innerText || c.textContent;
    }).catch(() => null), 400);
    const lines = await win.locator('tbody tr.gridRow').evaluateAll((rows) =>
        rows.filter((tr) => tr.getClientRects().length).map((tr) => {
            const cells = [...tr.querySelectorAll('td')].map((td) => {
                const c = td.cloneNode(true);
                c.querySelectorAll('script, a.show_extras').forEach((x) => x.remove());
                return c.textContent.replace(/\s+/g, ' ').trim();
            });
            return {date: cells[0], user: cells[1], event: cells[2]};
        })
    );
    return {waitedMs: waited, tabs: await tabs(page), panel: text, search: await win.getByRole('link', {name: 'Search', exact: true}).or(win.getByRole('button', {name: 'Search', exact: true})).first().isVisible().catch(() => false), lines};
}

/** Select a tab of the window on top by its name. */
async function selectTab(page, name) {
    await top(page).getByRole('tab', {name, exact: true}).first().click();
    await idle(page);
}

/** The entries of a file row's menu in the list `title`; the menu is closed again. */
async function rowMenu(page, title, rowText) {
    const row = page.getByRole('table', {name: title, exact: true}).first().locator('tbody tr').filter({hasText: rowText}).first();
    if (!(await row.count())) return {row: false};
    const button = row.locator('button[aria-haspopup="menu"]').last();
    if (!(await button.count())) return {row: true, menu: false};
    await button.click();
    await page.getByRole('menuitem').first().waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
    const entries = (await page.getByRole('menuitem').allInnerTexts()).map((t) => flat(t, 60));
    await page.keyboard.press('Escape');
    await sleep(300);
    return {row: true, menu: true, entries};
}

module.exports = {flat, sleep, CASES, FILE, theFile, top, watchHistory, tabs, readHistory, selectTab, rowMenu};
