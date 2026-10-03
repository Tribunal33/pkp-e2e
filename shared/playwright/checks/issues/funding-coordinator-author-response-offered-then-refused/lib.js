// Helpers of walk.js here (U30 A3: the "Author Response" table offers an assigned Funding
// coordinator "Request Response", "View" and "Delete", then refuses them;
// docs/issues/U30-A3-funding-coordinator-author-response-refused.md). Requiring this file runs
// nothing. Every helper drives the review stage's "Author Response" table, the author's
// "Author Response" card and the response window as a person does; none throws on a control a
// fix removes, it records the state instead.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app on PKP's default test dataset: the submission in review with its revisions requested. */
const CASES = {
    ojs: {id: 13, author: 'lkumiega', authorName: 'Lise Kumiega', hosted: 'Hosted Journals'},
};

const table = (page) => page.getByRole('table', {name: 'Author Response'});
const row = (page, name) => table(page).locator('tbody tr').filter({has: page.locator('td:first-child').filter({hasText: name})});

async function state(locator) {
    if (!(await locator.count())) return 'absent';
    return (await locator.first().isEnabled()) ? 'enabled' : 'disabled';
}

/**
 * Open the submission's workflow (editorial dashboard, or "My Submissions" for an author) on its
 * current stage. Waits for the "Author Response" table or card; returns whether one showed.
 */
async function openStage(page, app, id, {author = false} = {}) {
    await page.goto('about:blank');
    const view = author ? 'mySubmissions' : 'editorial';
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/${view}?workflowSubmissionId=${id}`));
    await page.getByRole('dialog').first().waitFor({timeout: 60_000});
    await idle(page);
    const shown = await page
        .getByRole('heading', {name: 'Author Response', exact: true})
        .first()
        .waitFor({timeout: 20_000})
        .then(() => true)
        .catch(() => false);
    if (shown && !author) {
        await table(page).locator('tbody tr').filter({hasNotText: 'No Items'}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    }
    return shown;
}

/** The table as read: its rows' cells, "Request Response" (absent, enabled, disabled) and each row's "More Actions". */
async function readTable(page) {
    if (!(await table(page).count())) return {table: false};
    const rows = [];
    for (const tr of await table(page).locator('tbody tr').all()) {
        rows.push({
            cells: (await tr.locator('td').allInnerTexts()).map((t) => flat(t, 200)),
            moreActions: await state(tr.getByRole('button', {name: 'More Actions'})),
        });
    }
    return {
        table: true,
        headers: (await table(page).locator('th').allInnerTexts()).map((t) => flat(t, 60)),
        requestResponse: await state(page.getByRole('button', {name: 'Request Response', exact: true})),
        rows,
    };
}

/** Press "Request Response"; returns where the browser lands (address, heading, page text). */
async function pressRequest(page) {
    const b = page.getByRole('button', {name: 'Request Response', exact: true});
    const s = await state(b);
    if (s !== 'enabled') return {requestResponse: s};
    await b.click();
    await page.waitForURL((u) => !/dashboard\/editorial/.test(String(u)), {timeout: T}).catch(() => {});
    await idle(page);
    await sleep(500);
    return {
        requestResponse: s,
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        h1: flat(await page.locator('h1').first().innerText().catch(() => null), 200),
        text: flat(await page.locator('main, body').first().innerText().catch(() => ''), 800),
    };
}

/** A row's "More Actions" menu: each entry and whether it is enabled; the menu closed again by its button. */
async function rowMenu(page, name) {
    const b = row(page, name).first().getByRole('button', {name: 'More Actions'});
    if (!(await b.count())) return {moreActions: 'absent'};
    await b.click();
    const menu = page.getByRole('menu').last();
    await menu.waitFor({timeout: 10_000});
    const entries = [];
    for (const item of await menu.getByRole('menuitem').all()) {
        entries.push({label: flat(await item.innerText(), 60), disabled: (await item.getAttribute('aria-disabled')) === 'true' || (await item.isDisabled())});
    }
    await b.click();
    await menu.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    return {moreActions: 'enabled', entries};
}

/** "More Actions" > the entry; returns false when the menu has no such entry. */
async function chooseFromMenu(page, name, entry) {
    const b = row(page, name).first().getByRole('button', {name: 'More Actions'});
    if (!(await b.count())) return false;
    await b.click();
    const menu = page.getByRole('menu').last();
    await menu.waitFor({timeout: 10_000});
    const item = menu.getByRole('menuitem', {name: entry, exact: true});
    if (!(await item.count())) {
        await b.click();
        return false;
    }
    await item.click();
    return true;
}

/** The open response window: its title, text, buttons with their state, whether its fields are editable; then "Cancel" (or the window's "Close" when it has no "Cancel"). */
async function readWindowAndCancel(page) {
    const w = page.getByRole('dialog', {name: /Author Response to Reviews|Submit Your Response to Reviewer Feedback/});
    await w.waitFor({timeout: T});
    await w.locator('iframe').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(800);
    const buttons = [];
    for (const b of await w.getByRole('button').all()) {
        const label = flat(await b.innerText().catch(() => ''), 40);
        if (label) buttons.push({label, enabled: await b.isEnabled()});
    }
    const out = {
        text: flat(await w.innerText(), 1500),
        buttons: buttons.filter((b) => !/^(Bold|Italic|Underline|Bullet list)$/.test(b.label)),
        editors: await w.locator('iframe').count(),
        checkboxes: await w.getByRole('checkbox').count(),
    };
    const cancel = w.getByRole('button', {name: 'Cancel', exact: true});
    out.closedWith = (await cancel.count()) ? 'Cancel' : 'Close';
    await ((await cancel.count()) ? cancel : w.getByRole('button', {name: 'Close', exact: true})).first().click();
    await w.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await idle(page);
    return out;
}

/** Visible pkp dialogs: their text and buttons. */
async function dialogs(page) {
    const out = [];
    for (const d of await page.locator('[data-cy="dialog"]').all()) {
        if (await d.isVisible().catch(() => false)) {
            out.push({text: flat(await d.innerText(), 400), buttons: (await d.getByRole('button').allInnerTexts()).map((t) => flat(t, 40)).filter(Boolean)});
        }
    }
    return out;
}

/** "More Actions" > "Delete" > "OK": the DELETE's answer, the dialog then shown (answered "OK"). */
async function deleteResponse(page, name) {
    if (!(await chooseFromMenu(page, name, 'Delete'))) return {deleteOffered: false};
    const dlg = page.locator('[data-cy="dialog"]').filter({hasText: 'Are you sure you wish to delete this item?'});
    await dlg.waitFor({timeout: T});
    const confirm = flat(await dlg.innerText(), 300);
    const answered = page
        // the Vue fetch tunnels a DELETE as a POST with X-Http-Method-Override (patterns.md "Probe kit")
        .waitForResponse((r) => /\/authorResponse\/\d+/.test(r.url()) && [r.request().method(), r.request().headers()['x-http-method-override']].includes('DELETE'), {timeout: 15_000})
        .then(async (r) => ({status: r.status(), method: 'DELETE', body: flat(await r.text().catch(() => ''), 300)}))
        .catch(() => null);
    await dlg.getByRole('button', {name: 'OK', exact: true}).click();
    const response = await answered;
    await idle(page);
    await sleep(1200);
    const after = await dialogs(page);
    const err = page.locator('[data-cy="dialog"]').filter({hasText: 'Error'});
    if (await err.isVisible().catch(() => false)) {
        await err.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        await err.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    }
    return {deleteOffered: true, confirm, response, dialogsAfter: after};
}

/** As the author: the card's "Submit Response", type the text, tick the first "Authors" box, "Submit Response". */
async function authorSubmits(page, text) {
    const card = page.getByRole('dialog').first().getByRole('button', {name: 'Submit Response', exact: true});
    if (!(await card.count())) return {card: 'absent'};
    await card.click();
    const w = page.getByRole('dialog', {name: 'Submit Your Response to Reviewer Feedback'});
    await w.waitFor({timeout: T});
    const body = w.frameLocator('iframe').first().locator('body');
    await body.click();
    await body.pressSequentially(text);
    const box = w.getByRole('checkbox').first();
    const boxLabel = flat(await box.evaluate((e) => (document.querySelector(`label[for="${e.id}"]`) || e.closest('label') || {}).innerText || ''), 80);
    await box.check();
    await idle(page);
    const answered = page
        .waitForResponse((r) => /\/authorResponse\/?(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: 15_000})
        .then((r) => r.status())
        .catch(() => null);
    await w.getByRole('button', {name: 'Submit Response', exact: true}).click();
    const status = await answered;
    await w.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return {boxTicked: boxLabel, status};
}

/** The response stored for the submission: count and the submitter's username ("no such table" before 3.6). */
function stored(app, id) {
    if (!sql(app, `select to_regclass('review_round_author_responses') is not null`).startsWith('t')) return 'no such table';
    return sql(
        app,
        `select count(*), max(u.username) from review_round_author_responses r join review_rounds rr on rr.review_round_id = r.review_round_id left join users u on u.user_id = r.user_id where rr.submission_id = ${id}`
    );
}

module.exports = {T, sleep, flat, CASES, openStage, readTable, pressRequest, rowMenu, chooseFromMenu, readWindowAndCancel, deleteResponse, authorSubmits, dialogs, stored};
