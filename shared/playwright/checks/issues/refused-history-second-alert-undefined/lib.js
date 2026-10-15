// Helpers of walk.js (U36 A27: a refused "History" tab in a file's "More Information" shows a
// second alert that reads only "undefined"; docs/issues/U36-A27-refused-history-second-alert-undefined.md).
// Requiring this file runs nothing. Copied from the U36 A3, A10, A14 and A19 walks' lib.js
// (2026-10-15) so this walk stands alone when those reports close.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per app: the Copyediting submission (mfritz is its Copyeditor), the upload's component, the "Submission" stage file. */
const CASES = {
    ojs: {submissionId: 3, component: 'Article Text', submissionFile: 'The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence.pdf'},
    omp: {submissionId: 7, component: 'Book Manuscript', submissionFile: 'intro.pdf'},
};
const FILE = 'hkk29-copyedit.pdf';

/** A small PDF named hkk29-copyedit.pdf in a temp folder: {path, name}. */
function theFile() {
    const src = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hkk29-'));
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

/** Open a submission's workflow by address (the dashboard's "View"), optionally on a side-menu page. */
async function openWorkflow(page, app, id, menuKey, view = 'editorial') {
    const locale = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en';
    await page.goto(app.url(`/index.php/${app.contextPath}${locale}/dashboard/${view}?workflowSubmissionId=${id}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
    await idle(page);
}

/** The table named `title` in the workflow ("Submission Files"). */
const listTable = (page, title) => page.getByRole('table', {name: title, exact: true});

/** The rows of the list `title`, each as its flat text; waits for the table to show. */
async function workflowRows(page, title = 'Submission Files') {
    const table = listTable(page, title);
    await table.first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    const rows = table.first().locator('tbody tr').filter({has: page.getByRole('rowheader')});
    return (await rows.allInnerTexts()).map((t) => flat(t, 200));
}

/** The open upload wizard (whatever its title). */
const wizard = (page) => page.getByRole('dialog').filter({has: page.locator('.pkp_controller_fileUpload')}).last();

const uploadBox = (page) => wizard(page).locator('.pkp_controller_fileUpload').first();

/**
 * Choose `file` in the upload box and wait for its upload's answer and for the box to name it.
 * The box's button ("Upload File", then "Change File") opens the system's file window; the script
 * hands the file to the same input instead.
 */
async function pick(page, file) {
    const answered = page.waitForResponse((r) => /upload-file/.test(r.url()) && r.request().method() === 'POST', {timeout: 60_000});
    await wizard(page).locator('input[type="file"]').first().setInputFiles(file.path);
    const r = await answered;
    const body = await r.json().catch(() => null);
    await uploadBox(page).getByText(file.name).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page);
    return body && body.uploadedFile ? body.uploadedFile : body;
}

/** "Continue", "Continue", "Complete"; returns the step names passed and whether the window closed. */
async function finish(page) {
    const w = wizard(page);
    const passed = [];
    const current = async () => flat(await page.getByRole('dialog').last().locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => null), 40);
    for (const next of ['2. Review Details', '3. Confirm']) {
        const dlg = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: next, exact: true})}).last();
        await dlg.getByRole('button', {name: 'Continue', exact: true}).click();
        await dlg.getByRole('tab', {name: next, exact: true}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T});
        await idle(page);
        passed.push(await current());
    }
    const dlg = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: '3. Confirm', exact: true})}).last();
    const confirm = flat(await dlg.innerText().catch(() => null), 300);
    await dlg.getByRole('button', {name: 'Complete', exact: true}).click();
    await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(600); // the closed window's slot (patterns.md pitfall 4)
    return {passed, confirm, closed: !(await w.isVisible().catch(() => false))};
}

/** The workflow window (itself a dialog over the dashboard). */
const workflow = (page) => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();

/** The file row's menu > "More Information"; returns the window's title. */
async function openMoreInformation(page, rowText) {
    const wf = workflow(page);
    const row = wf.locator('tbody tr').filter({hasText: rowText}).first();
    await row.waitFor({timeout: 30_000});
    let button = row.locator('button[aria-haspopup="menu"]');
    if (!(await button.count())) {
        button = row.getByRole('button');
    }
    await button.last().click();
    const item = page.getByRole('menuitem', {name: 'More Information', exact: true}).first();
    await item.waitFor({timeout: 15_000});
    await item.click();
    const win = page.getByRole('dialog').filter({hasText: /Information Center/}).last();
    await win.waitFor({timeout: 30_000});
    await idle(page);
    return flat(await win.getByRole('heading', {level: 1}).first().innerText().catch(() => ''));
}

/** Close the window on top with its own "Close". */
async function closeTop(page) {
    const win = top(page);
    await win.getByRole('button', {name: 'Close', exact: true}).first().click();
    await page.waitForTimeout(1_000);
    await idle(page);
}

/** Open a submission's workflow on "Copyediting" by address (the dashboard's "View", then the side menu). */
async function openCopyediting(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=workflow_4`));
    await idle(page);
    await page.getByRole('heading', {name: 'Draft Files', exact: true, level: 3}).first().waitFor({state: 'visible', timeout: T});
    await idle(page);
}

/** The workflow's list `title`: its panel (heading and table) and its rows' texts. */
function listPanel(page, title) {
    return page.locator('div')
        .filter({has: page.getByRole('heading', {name: title, exact: true, level: 3})})
        .filter({has: page.getByRole('table', {name: title, exact: true})})
        .last();
}

async function listRows(page, title) {
    await idle(page);
    const rows = page.getByRole('table', {name: title, exact: true}).first().locator('tbody tr').filter({has: page.getByRole('rowheader')});
    return (await rows.allInnerTexts()).map((t) => flat(t, 200));
}

/** The "Upload/Select Files" window (the legacy side window holding the all-stages box). */
const selectWindow = (page) => page.getByRole('dialog').filter({has: page.locator('input[name="allStages"]')}).last();

/** Press "Upload/Select Files" above the list `title` and wait for the window's grid. */
async function openSelect(page, title) {
    await listPanel(page, title).getByRole('button', {name: 'Upload/Select Files', exact: true}).click();
    const win = selectWindow(page);
    await win.locator('input[name="allStages"]').waitFor({state: 'visible', timeout: T});
    await idle(page);
    await win.locator('table tr').nth(1).waitFor({state: 'attached', timeout: T});
    await sleep(500);
    return win;
}

/** Tick "Show files from all accessible workflow stages." and wait for the grid's refetch. */
async function tickAllStages(page) {
    const win = selectWindow(page);
    const fetched = page.waitForResponse((r) => r.url().includes('fetch-grid'), {timeout: T}).catch(() => null);
    await win.getByRole('checkbox', {name: 'Show files from all accessible workflow stages.'}).check();
    await fetched;
    await idle(page);
    await sleep(500);
}

/** The window as data: its title, the box's state and the visible grid rows, group headers included. */
async function readSelect(page) {
    return await selectWindow(page).evaluate((w) => {
        const vis = (e) => e.getClientRects().length > 0;
        const all = w.querySelector('input[name="allStages"]');
        return {
            title: (w.querySelector('h1, h2') || {}).innerText || w.getAttribute('aria-label') || null,
            allStages: all ? all.checked : null,
            rows: [...w.querySelectorAll('table tr')].filter(vis).map((tr) => {
                const cb = tr.querySelector('input[type=checkbox]');
                return tr.innerText.trim().replace(/\s+/g, ' ').slice(0, 160) + (cb ? (cb.checked ? ' [x]' : ' [ ]') : '');
            }).filter(Boolean),
        };
    });
}

/**
 * The row of the file `name` listed under the stage group `group` in the window: the first file
 * row (one with a tick box) after that group's header row that names the file.
 */
function fileRow(page, name, group) {
    const win = selectWindow(page);
    const header = win.locator('tr.gridRow, tr.category, tr')
        .filter({hasNot: page.locator('input[type="checkbox"]')})
        .filter({hasText: new RegExp(`^\\s*${group}\\s*$`)})
        .first();
    return header
        .locator('xpath=ancestor-or-self::tbody[1]/following-sibling::tbody[1]//tr[.//input[@type="checkbox"]] | following-sibling::tr[.//input[@type="checkbox"]]')
        .filter({hasText: name})
        .first();
}

/** Open a row's controls (the arrow before its name) and return the names of the links it offers. */
async function rowControls(page, row) {
    const arrow = row.locator('a.show_extras').first();
    if (await arrow.count()) { await arrow.click(); await sleep(400); }
    return await row.evaluate((tr) => {
        const n = tr.nextElementSibling;
        return [...(n ? n.querySelectorAll('a') : [])].filter((a) => a.getClientRects().length).map((a) => a.innerText.trim()).filter(Boolean);
    });
}

/** The window on top: its heading and text. */
async function topWindow(page) {
    const d = page.getByRole('dialog').last();
    return {
        title: flat(await d.locator('h1, h2').first().innerText().catch(() => null), 200),
        text: flat(await d.innerText().catch(() => null), 500),
    };
}

/** "OK" in the window; waits for it to close. */
async function ok(page) {
    const win = selectWindow(page);
    await win.getByRole('button', {name: 'OK', exact: true}).click();
    await win.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(700);
}

module.exports = {
    T, flat, sleep, CASES, FILE, theFile,
    top, watchHistory, tabs, readHistory,
    openWorkflow, workflowRows, wizard, uploadBox, pick, finish,
    workflow, openMoreInformation, closeTop,
    openCopyediting, listPanel, listRows, selectWindow, openSelect, tickAllStages, readSelect, fileRow, rowControls, topWindow, ok,
};
