// Helpers of the kept walk for docs/issues/U30-A1-author-response-request-leaves-no-trace.md (spec U30, register A1).
// Requiring this file runs nothing. Every helper drives the screens a person uses: the editor's workflow
// (Review stage, the "Author Response" table, "Request Response"), the "Request Author Response" page and its
// sent dialog, and the author's workflow ("Notifications" list, "Author Response" card and its window). The
// OJS page objects of the feature are required inside the calls, since they read the app the kit has exported.
const {idle, screen, record} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const P = () => require('../../../../../apps/ojs/playwright/pages/AuthorResponsePages.js');

/** The editor's workflow of the submission, opened from the dashboard's address; waits for the "Author Response" table's rows. */
async function openEditorial(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const table = new (P().AuthorResponseTable)(page);
    try {
        await table.table().waitFor({timeout: T});
    } catch (e) {
        // no "Author Response" table (a line without the feature): keep what the workflow showed instead
        await idle(page);
        record(`no-table-${id}`, {screen: await screen(page)});
        throw new Error(`no "Author Response" table on submission ${id}`);
    }
    // reached by address the rows can read "No Items" for a moment (spec note c)
    for (let i = 0; i < 40; i++) {
        const t = flat(await table.table().locator('tbody').innerText().catch(() => ''));
        if (t && !/No Items/i.test(t)) break;
        await sleep(500);
    }
    await idle(page);
    return table;
}

/** The table as data: each row's cells, the button's state, the stage and round headings read from the dialog. */
async function readTable(page, name) {
    const table = new (P().AuthorResponseTable)(page);
    const rows = [];
    for (const r of await table.rows().all()) rows.push(flat(await r.innerText().catch(() => null), 300));
    const button = table.requestResponseButton();
    const facts = {
        rows,
        statusDom: flat(await table.table().locator('tbody tr td:nth-child(2)').first().textContent().catch(() => null), 200),
        button: (await button.count()) ? ((await button.isDisabled()) ? 'disabled' : 'enabled') : 'absent',
    };
    if (name) record(name, {...facts, screen: await screen(page)});
    return facts;
}

/**
 * "Request Response" on the open table; on the "Request Author Response" page, once "Message" has loaded,
 * "Submit Request"; the sent dialog's text, then "View Submission Summary" back to the workflow.
 * Returns the page's heading and recipients, the POST's status and the dialog's text.
 */
async function sendRequest(page, app, id, name) {
    const R = P();
    const table = new R.AuthorResponseTable(page);
    const req = new R.RequestAuthorResponsePage(page, app.contextPath);
    await table.requestResponseButton().click();
    await req.heading().waitFor({timeout: T});
    for (let i = 0; i < 60; i++) {
        const body = flat(await req.messageBody().innerText().catch(() => ''));
        const loading = await page.getByText('Loading', {exact: true}).count();
        if (body && body.length > 40 && !loading) break;
        await sleep(500);
    }
    await idle(page);
    const out = {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        heading: flat(await req.heading().innerText().catch(() => null)),
        to: flat(await req.recipientChips().allInnerTexts().catch(() => []), 200),
        subject: await req.subject().inputValue().catch(() => null),
    };
    const posted = page.waitForResponse((r) => /authorResponse\/requestResponse/.test(r.url()), {timeout: T}).catch(() => null);
    await req.submitRequestButton().click();
    const resp = await posted;
    out.post = resp ? resp.status() : null;
    const dialog = req.sentDialog();
    await dialog.waitFor({timeout: T}).catch(() => {});
    out.dialog = flat(await dialog.innerText().catch(() => null), 400);
    if (name) record(name, {...out, screen: await screen(page)});
    const link = req.viewSubmissionSummaryLink();
    if (await link.count()) {
        await link.click();
        await table.table().waitFor({timeout: T});
        for (let i = 0; i < 40; i++) {
            const t = flat(await table.table().locator('tbody').innerText().catch(() => ''));
            if (t && !/No Items/i.test(t)) break;
            await sleep(500);
        }
        await idle(page);
    }
    return out;
}

/** The author's workflow of the submission: the "Notifications" rows and the "Author Response" card's text and button. */
async function authorView(page, app, id, name) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions?workflowSubmissionId=${id}`));
    const card = new (P().AuthorResponseCard)(page);
    await card.heading().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    const dialog = page.getByRole('dialog').first();
    const notices = dialog.locator('h3', {hasText: 'Notifications'}).locator('xpath=..').locator('li');
    const out = {
        notifications: (await notices.allInnerTexts().catch(() => [])).map((t) => flat(t, 160)),
        card: flat(await card.heading().locator('xpath=ancestor::div[1]').innerText().catch(() => null), 300),
        submitButton: await card.submitButton().count(),
        viewButton: await card.viewButton().count(),
    };
    if (name) record(name, {...out, screen: await screen(page)});
    return out;
}

/** The author's card: "Submit Response", the text typed, the contributor's box ticked, "Submit Response"; the POST's status. */
async function submitResponse(page, authorName, text) {
    const R = P();
    const card = new R.AuthorResponseCard(page);
    await card.submitButton().click();
    const win = new R.AuthorResponseWindow(page);
    await win.modal().waitFor({timeout: T});
    await idle(page);
    await win.body().waitFor({timeout: T});
    await win.fillBody(text);
    await win.authorCheckbox(authorName).check();
    const posted = page.waitForResponse((r) => /\/authorResponse\/?$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await win.submitButton().click();
    const resp = await posted;
    await win.modal().waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return {post: resp ? resp.status() : null};
}

/** The open workflow's "Activity Log": its rows that name the request email (the U27 walk's helper). */
async function requestLogRows(page, label) {
    const rows = await require('../reviewer-response-erases-reminder-history/lib.js').activityLog(page, label);
    return rows.filter((r) => /Request For Author Response/i.test(r));
}

module.exports = {T, sleep, flat, openEditorial, readTable, sendRequest, authorView, submitResponse, requestLogRows};
