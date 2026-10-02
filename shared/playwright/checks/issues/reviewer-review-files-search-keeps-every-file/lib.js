// Helpers of walk.js (U36 A20: the reviewer's "Review Files" search keeps every file;
// docs/issues/U36-A20-reviewer-review-files-search-keeps-every-file.md).
// Requiring this file runs nothing. The workflow by address is the sibling walk's
// (change-file-keeps-first-upload).
const {idle} = require('../../../probe');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Per app: the submission in review, its reviewer (username and name as the "Reviewers" list
 * shows it), a text one file name alone contains (null when the round has one file), a text
 * every file name contains, and the file the neighbour check withholds (null: one file only).
 */
const CASES = {
    ojs: {submissionId: 12, reviewer: 'jjanssen', reviewerName: 'Julie Janssen', one: null, every: 'butyrate', withhold: null},
    omp: {submissionId: 2, reviewer: 'gfavio', reviewerName: 'Gonzalo Favio', one: 'chapter4', every: 'chapter', withhold: 'chapter1.pdf'},
};

/** The reviewer's page of a review, by address. */
async function openReview(page, app, submissionId) {
    const locale = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en';
    await page.goto(app.url(`/index.php/${app.contextPath}${locale}/reviewer/submission/${submissionId}`));
    await idle(page);
    await page.locator('#reviewFilesStep1 .pkp_controllers_grid').first().waitFor({state: 'visible', timeout: 30_000}).catch(() => {});
    await idle(page);
}

/** The reviewer's "Review Files" list of step 1. */
const reviewFiles = (page) => page.locator('#reviewFilesStep1 .pkp_controllers_grid').first();

/** The window on top. */
const top = (page) => page.locator('[role="dialog"]:visible').last();

/** A legacy file list as shown: its title, its rows' texts and the empty-list line when it shows. */
async function readList(grid) {
    return grid.evaluate((g) => {
        const vis = (e) => e.getClientRects().length > 0;
        const clean = (e) => { const c = e.cloneNode(true); c.querySelectorAll('script').forEach((x) => x.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
        const title = g.querySelector('.header h4, .header h3, .header .title, h4');
        return {
            title: title ? clean(title) : null,
            rows: [...g.querySelectorAll('tbody tr.gridRow')].filter(vis).map(clean),
            empty: [...g.querySelectorAll('tbody.empty tr, tr.empty')].filter(vis).map(clean).join(' ') || null,
            searchShown: [...g.querySelectorAll('form input[name="search"]')].some(vis),
            searchValue: (g.querySelector('form input[name="search"]') || {}).value ?? null,
            column: [...g.querySelectorAll('form select[name="column"] option')].map((o) => o.textContent.trim()),
        };
    });
}

/**
 * The list's "Search": press the control when the box is not showing, type `text`, press the
 * form's "Search" button, wait for the list's reload. Returns what was sent, the answer's row
 * count and the list as shown afterwards.
 */
async function search(page, grid, text) {
    const input = grid.locator('form input[name="search"]').first();
    let pressedControl = false;
    if (!(await input.isVisible().catch(() => false))) {
        await grid.locator('a.pkp_linkaction_search').first().click();
        await input.waitFor({state: 'visible', timeout: 10_000});
        pressedControl = true;
    }
    await input.fill(text);
    const button = grid.locator('form button[type="submit"]').first();
    const label = flat(await button.innerText().catch(() => null), 40);
    const reload = page.waitForResponse((r) => /-grid\/fetch-grid/.test(r.url()) && r.request().method() === 'POST', {timeout: 20_000}).catch(() => null);
    await button.click();
    const r = await reload;
    let sent = null;
    if (r) {
        const body = await r.text().catch(() => '');
        sent = {
            url: flat(r.url().replace(/^.*\/index\.php/, '…'), 300),
            posted: flat(r.request().postData() || '', 200).replace(/csrfToken=[^&]+/, 'csrfToken=…'),
            http: r.status(),
            rowsAnswered: (body.match(/class=\\"gridRow/g) || []).length,
        };
    }
    await idle(page);
    await sleep(800);
    return {text, pressedControl, button: label, sent, ...(await readList(grid))};
}

/** The editor's reviewer "Edit" window, from the reviewer's row in "Reviewers"; returns its "Files To Be Reviewed" list. */
async function openEdit(page, reviewerName) {
    const row = page.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: reviewerName}).first();
    await row.waitFor({state: 'visible', timeout: 60_000});
    await row.getByRole('button', {name: /More Actions/}).first().click();
    const item = page.getByRole('menuitem', {name: 'Edit', exact: true}).first();
    await item.waitFor({timeout: 15_000});
    await item.click();
    const win = page.getByRole('dialog').filter({has: page.locator('form#editReviewForm')}).last();
    await win.waitFor({timeout: 30_000});
    const grid = win.locator('.pkp_controllers_grid').first();
    await grid.waitFor({state: 'visible', timeout: 30_000});
    await idle(page);
    await sleep(800);
    return {win, grid};
}

/** In an open "Edit" window: untick `fileName` under "Files To Be Reviewed" and press "OK". */
async function withhold(page, win, grid, fileName) {
    const box = grid.locator('tbody tr.gridRow').filter({hasText: fileName}).first().locator('input[type="checkbox"]').first();
    const was = await box.isChecked();
    await box.setChecked(false);
    const saved = page.waitForResponse((r) => /update-review/.test(r.url()), {timeout: 20_000}).catch(() => null);
    await win.getByRole('button', {name: 'OK', exact: true}).first().click();
    const r = await saved;
    await idle(page);
    await sleep(1_000);
    return {was, http: r ? r.status() : null, url: r ? flat(r.url().replace(/^.*\/index\.php/, '…'), 200) : null};
}

module.exports = {flat, sleep, CASES, openReview, reviewFiles, top, readList, search, openEdit, withhold};
