// Helpers of walk.js (U36 A4: the "History" tab's "Show events from prior versions" box changes
// nothing; docs/issues/U36-A4-history-prior-versions-box-changes-nothing.md).
// Requiring this file runs nothing. The workflow by address and "Close" are the sibling walks'
// (change-file-keeps-first-upload, add-note-empty-box-posts-empty-note).
const {idle} = require('../../../probe');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Per app: the submission in review, the row in "Review Files" (a copy the editor's "Send to
 * Review" made of the author's submission file) and the author who uploaded the original.
 */
const CASES = {
    ojs: {submissionId: 7, row: 'Developing efficacy beliefs in the classroom.pdf', author: 'dsokoloff'},
    omp: {submissionId: 2, row: 'chapter1.pdf', author: 'afinkel'},
};

/** The window on top. */
const top = (page) => page.locator('[role="dialog"]:visible').last();

/** The row's menu in the list `title` > "More Information"; returns the window's title. */
async function openMoreInformation(page, title, rowText) {
    const row = page.getByRole('table', {name: title, exact: true}).first().locator('tbody tr').filter({hasText: rowText}).first();
    await row.waitFor({state: 'visible', timeout: 60_000});
    await row.locator('button[aria-haspopup="menu"]').last().click();
    const item = page.getByRole('menuitem', {name: 'More Information', exact: true}).first();
    await item.waitFor({timeout: 15_000});
    await item.click();
    const win = page.getByRole('dialog').filter({hasText: /Information Center/}).last();
    await win.waitFor({timeout: 30_000});
    await top(page).locator('tr.gridRow').first().waitFor({state: 'visible', timeout: 30_000}).catch(() => {});
    await idle(page);
    return flat(await win.locator('h1, h2').first().innerText().catch(() => null), 200);
}

/** Every answer of the file history grid's requests from now on: what was posted and the answer's status. */
function watchHistory(page) {
    const list = [];
    page.on('response', async (r) => {
        const m = r.url().match(/submission-file-event-log-grid\/([a-z-]+)(\?.*)?$/);
        if (!m) return;
        const entry = {op: m[1], query: flat(m[2] || '', 200), method: r.request().method(), posted: flat(r.request().postData() || '', 200).replace(/csrfToken=[^&]+/, 'csrfToken=…'), http: r.status()};
        const body = await r.text().catch(() => '');
        try { entry.status = JSON.parse(body).status; } catch (e) { entry.body = flat(body, 200); }
        list.push(entry);
    });
    return list;
}

/** "History" as shown: its lines as {date, user, event}, newest first, and the state of "Search" and the box. */
async function readHistory(page) {
    const win = top(page);
    await idle(page);
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
    const box = win.locator('input[name="allEvents"]').first();
    const there = (await box.count()) > 0;
    return {
        selectedTab: flat(await win.locator('[role="tab"][aria-selected="true"]').first().innerText().catch(() => null), 40),
        lines,
        search: await searchControl(page).isVisible().catch(() => false),
        box: there ? {
            visible: await box.isVisible().catch(() => false),
            ticked: await box.isChecked().catch(() => null),
            label: flat(await win.locator('form#eventLogFilterForm').first().innerText().catch(() => null), 120),
        } : null,
    };
}

/** The "Search" control above the history table. */
function searchControl(page) {
    const win = top(page);
    return win.locator('.pkp_controllers_grid .header').getByText('Search', {exact: true}).first();
}

/** Press "Search" when the box is not showing. Returns whether it was pressed. */
async function showBox(page) {
    const box = top(page).locator('input[name="allEvents"]').first();
    if (await box.isVisible().catch(() => false)) return false;
    await searchControl(page).click();
    await box.waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
    return true;
}

/**
 * Set the box (ticked or not) and wait for the table's reload. When the change itself sends
 * nothing, press "Search" once more. Returns what was sent and "History" as shown afterwards.
 */
async function setBox(page, answers, ticked) {
    const from = answers.length;
    const pressedSearch = await showBox(page);
    const box = top(page).locator('input[name="allEvents"]').first();
    const reload = page.waitForResponse((r) => /submission-file-event-log-grid\/fetch-grid/.test(r.url()), {timeout: 8_000}).catch(() => null);
    await box.setChecked(ticked).catch(async () => { await box.click(); });
    let sentOn = (await reload) ? 'the tick' : null;
    if (!sentOn) {
        const again = page.waitForResponse((r) => /submission-file-event-log-grid\/fetch-grid/.test(r.url()), {timeout: 8_000}).catch(() => null);
        await searchControl(page).click().catch(() => {});
        sentOn = (await again) ? '"Search" after the tick' : 'nothing sent';
    }
    await sleep(1_000);
    const shown = await readHistory(page);
    return {pressedSearch, sentOn, requests: answers.slice(from), ...shown};
}

module.exports = {flat, sleep, CASES, top, openMoreInformation, watchHistory, readHistory, searchControl, showBox, setBox};
