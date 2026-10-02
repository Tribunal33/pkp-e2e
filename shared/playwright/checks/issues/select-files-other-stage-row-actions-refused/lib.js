// Helpers of walk.js (U36 A19: in "Upload/Select Files", the row actions of another stage's files
// are refused; docs/issues/U36-A19-select-files-other-stage-row-actions-refused.md).
// Requiring this file runs nothing.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per app: the Copyediting submission the steps open, and the "Submission" stage file they act on. */
const CASES = {
    ojs: {submissionId: 3, file: 'The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence.pdf', group: 'Submission', own: 'Copyediting'},
    omp: {submissionId: 7, file: 'intro.pdf', group: 'Submission', own: 'Copyediting'},
};

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
const control = (page, row, name) => row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name, exact: true}).first();

/**
 * Every answer of the row actions' requests from now on (the information centre, the file's
 * history grid, edit, delete, download): the operation, its stageId, the status and the
 * legacy JSON answer's `status` and text.
 */
function watchActions(page) {
    const list = [];
    page.on('response', async (r) => {
        const u = r.url();
        const m = u.match(/grid\/files\/[a-z-]+\/[a-z-]+\/fetch-row|information-center\/[a-z-]+\/[a-z-]+|submission-file-event-log-grid\/[a-z-]+|manage-file-api\/[a-z-]+|file-api\/[a-z-]+/);
        if (!m) return;
        const head = r.headers();
        const entry = {op: m[0], stageId: (u.match(/[?&]stageId=(\d+)/) || [])[1] || null, fileId: (u.match(/submissionFileId=(\d+)/) || [])[1] || null, http: r.status()};
        if (/attachment/.test(head['content-disposition'] || '')) entry.attachment = flat(head['content-disposition'], 120);
        else {
            const body = await r.text().catch(() => '');
            try { const j = JSON.parse(body); entry.status = j.status; entry.content = flat(String(j.content || '').replace(/<[^>]+>/g, ' '), 160); } catch (e) { entry.body = flat(body, 160); }
        }
        list.push(entry);
    });
    return list;
}

/** Browser alerts and questions from now on; each is accepted. Returns the list and `off()`. */
function watchAlerts(page) {
    const list = [];
    const on = (d) => { list.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); };
    page.on('dialog', on);
    return {list, off: () => page.off('dialog', on)};
}

/** The window on top: its heading and text. */
async function topWindow(page) {
    const d = page.getByRole('dialog').last();
    return {
        title: flat(await d.locator('h1, h2').first().innerText().catch(() => null), 200),
        text: flat(await d.innerText().catch(() => null), 500),
    };
}
/** Is the "Upload/Select Files" window the one on top? */
async function selectOnTop(page) {
    return await page.getByRole('dialog').last().locator('input[name="allStages"]').count() > 0;
}
/**
 * Close the window on top with its own "Close" (or a question's "Cancel"), unless it is the select
 * window. A question whose buttons are disabled is left as it is and reported with what Escape did.
 */
async function closeTop(page) {
    if (await selectOnTop(page)) return 'none open';
    const d = page.getByRole('dialog').last();
    for (const name of ['Cancel', 'Close']) {
        const b = d.getByRole('button', {name, exact: true}).first();
        if (!(await b.isVisible().catch(() => false))) continue;
        if (await b.isDisabled().catch(() => false)) {
            const buttons = await d.getByRole('button').evaluateAll((l) => l.map((e) => `${e.innerText.trim()}${e.disabled ? ' (disabled)' : ''}`));
            await page.keyboard.press('Escape');
            await sleep(1_500);
            const dialogs = await page.getByRole('dialog').count();
            return {stuck: true, buttons, afterEscape: dialogs ? flat(await page.getByRole('dialog').last().innerText().catch(() => null), 120) : 'no window left open'};
        }
        await b.click(); await sleep(1_000); await idle(page); return name;
    }
    return 'no close control';
}

/** Press a row control and read what opens after `wait` ms: alerts, the top window, the answers. */
async function press(page, row, name, answers, {wait = 3_000, confirm = false} = {}) {
    const alerts = watchAlerts(page);
    const from = answers.length;
    const link = control(page, row, name);
    if (!(await link.count())) { alerts.off(); return {offered: false}; }
    await link.click();
    await idle(page);
    if (confirm) {
        const ok = page.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).first();
        await ok.waitFor({state: 'visible', timeout: T});
        const question = await topWindow(page);
        await ok.click();
        await idle(page);
        await sleep(wait);
        const after = await topWindow(page);
        alerts.off();
        return {offered: true, question, after, stillAsking: !(await selectOnTop(page)), alerts: alerts.list, answers: answers.slice(from)};
    }
    await sleep(wait);
    await idle(page);
    const top = await topWindow(page);
    alerts.off();
    return {offered: true, alerts: alerts.list, top, answers: answers.slice(from)};
}

/** Press the file's name in a row: a download, or what the browser got instead. */
async function pressName(page, row, answers) {
    const from = answers.length;
    const alerts = watchAlerts(page);
    const link = row.locator('a.pkp_linkaction_downloadFile').first();
    if (!(await link.count())) { alerts.off(); return {offered: false}; }
    const download = page.waitForEvent('download', {timeout: 8_000}).then((d) => d.suggestedFilename()).catch(() => null);
    const popup = page.context().waitForEvent('page', {timeout: 8_000}).catch(() => null);
    const before = page.url();
    await link.click();
    const name = await download;
    const tab = await popup;
    let tabText = null;
    if (tab) { tabText = flat(await tab.locator('body').innerText({timeout: 3_000}).catch(() => null), 200); await tab.close().catch(() => {}); }
    await sleep(2_500); // the grid redraws two seconds after a download link is pressed
    await idle(page).catch(() => {});
    alerts.off();
    // a refused download answers in the page itself: the workflow is gone and the browser shows the answer
    const left = page.url() !== before;
    const pageNow = left ? {url: page.url().replace(/^https?:\/\/[^/]+/, ''), text: flat(await page.locator('body').innerText().catch(() => null), 300)} : null;
    return {offered: true, downloaded: name, tabText, leftThePage: left, pageNow, alerts: alerts.list, answers: answers.slice(from)};
}

/** Tick a file's box in the window. */
async function tick(page, row) {
    const box = row.locator('input[type="checkbox"]').first();
    await box.check({force: true});
    return await box.isChecked();
}
/** "OK" in the window; waits for it to close. */
async function ok(page) {
    const win = selectWindow(page);
    await win.getByRole('button', {name: 'OK', exact: true}).click();
    await win.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(700);
}
/** "Cancel" in the window. */
async function cancel(page) {
    const win = selectWindow(page);
    await win.locator('a:visible, button:visible').filter({hasText: /^\s*Cancel\s*$/}).last().click();
    await win.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(700);
}

/** The submission's stored files: id|file stage|name. */
function stored(app, submissionId) {
    const rows = sql(app, `select sf.submission_file_id, sf.file_stage, (select setting_value from submission_file_settings s where s.submission_file_id = sf.submission_file_id and s.setting_name = 'name' and s.locale in ('en', 'en_US') limit 1) from submission_files sf where sf.submission_id = ${Number(submissionId)} order by 1`);
    return rows ? rows.split('\n') : [];
}

module.exports = {
    T, flat, sleep, CASES, openCopyediting, listRows, selectWindow, openSelect, tickAllStages, readSelect, fileRow,
    rowControls, watchActions, topWindow, selectOnTop, closeTop, press, pressName, tick, ok, cancel, stored,
};
