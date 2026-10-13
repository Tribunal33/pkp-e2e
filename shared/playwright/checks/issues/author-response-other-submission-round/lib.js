// Helpers of walk.js here (U30 A11: the author-response delete, edit and request routes never
// check that the review round belongs to the submission in the address;
// docs/issues/U30-A11-author-response-deleted-from-other-submission.md). Requiring this file
// runs nothing. Every helper drives the screens a person uses (the author's "Author Response"
// card and window, the editor's "Author Response" table, Administration › Hosted Journals,
// Users & Roles › "Invite to a role" and its accept link, "Make a Submission"), except `api()`,
// which is the report's console snippet run in the user's own signed-in page. None throws on a
// control a fix removes; each records the state instead.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => (u || '').replace(/^https?:\/\/[^/]+/, '');
const AR = () => require('../../../../../apps/ojs/playwright/pages/AuthorResponsePages.js');

/**
 * The report's console snippet: one request to `reviews/<path>` of the page's own journal, with
 * the page's CSRF token; PUT and DELETE tunnelled as POST with X-Http-Method-Override, as the
 * screens' useFetch sends them. Returns {status, json, base}.
 */
async function api(page, method, path, body) {
    return page.evaluate(
        async ({method, path, body}) => {
            const r = await fetch(pkp.context.apiBaseUrl + path, {
                method: method === 'GET' ? 'GET' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Csrf-Token': pkp.currentUser.csrfToken,
                    ...(['PUT', 'DELETE'].includes(method) ? {'X-Http-Method-Override': method} : {}),
                },
                body: body && JSON.stringify(body),
            });
            let json = null;
            try {
                json = await r.json();
            } catch (e) {
                /* not JSON */
            }
            return {status: r.status, json, base: pkp.context.apiBaseUrl};
        },
        {method, path, body}
    );
}

/** The context's editorial dashboard (or another dashboard view), idle, with `pkp.currentUser` loaded. */
async function dashboard(page, app, ctx, view = 'editorial') {
    await page.goto(app.url(`/index.php/${ctx}/en/dashboard/${view}`));
    await page.waitForFunction(() => window.pkp && pkp.currentUser && pkp.currentUser.csrfToken && pkp.context && pkp.context.apiBaseUrl, null, {timeout: T});
    await idle(page);
    return strip(page.url());
}

/** The submission's review rounds as the workflow reads them (GET submissions/<id>): id, status, request flag, response. */
async function rounds(page, id) {
    const r = await api(page, 'GET', `submissions/${id}`);
    return {
        status: r.status,
        rounds: ((r.json && r.json.reviewRounds) || []).map((x) => ({
            id: x.id,
            stageId: x.stageId,
            status: x.status,
            isAuthorResponseRequested: x.isAuthorResponseRequested,
            authorResponse: x.authorResponse ? {id: x.authorResponse.id, text: flat(JSON.stringify(x.authorResponse.authorResponse), 200)} : null,
        })),
    };
}

/** The author's workflow of a submission: the "Author Response" card's text and its buttons (or none). */
async function authorCard(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions?workflowSubmissionId=${id}`));
    await page.getByRole('dialog').first().waitFor({timeout: 60_000});
    await idle(page);
    const card = new (AR().AuthorResponseCard)(page);
    const shown = await card.heading().waitFor({timeout: 15_000}).then(() => true).catch(() => false);
    await idle(page);
    return {
        card: shown ? flat(await card.heading().locator('xpath=ancestor::div[1]').innerText().catch(() => null), 300) : null,
        submitResponse: await card.submitButton().count(),
        viewSubmittedResponse: await card.viewButton().count(),
    };
}

/** On the open author workflow: "Submit Response", the text, the contributor's box, "Submit Response"; the POST's status. */
async function submitResponse(page, authorName, text) {
    const R = AR();
    const card = new R.AuthorResponseCard(page);
    if (!(await card.submitButton().count())) return {post: null, offered: false};
    await card.submitButton().click();
    const win = new R.AuthorResponseWindow(page);
    await win.modal().waitFor({timeout: T});
    await idle(page);
    await win.body().waitFor({timeout: T});
    await win.fillBody(text);
    await win.authorCheckbox(authorName).check();
    const posted = page
        .waitForResponse((r) => /\/authorResponse\/?$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', {timeout: T})
        .catch(() => null);
    await win.submitButton().click();
    const resp = await posted;
    await win.modal().waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return {post: resp ? resp.status() : null, offered: true};
}

/** On the open author workflow: "View Submitted Response", the window's text, then "Cancel". */
async function viewSubmitted(page) {
    const R = AR();
    const card = new R.AuthorResponseCard(page);
    if (!(await card.viewButton().count())) return {offered: false};
    await card.viewButton().click();
    const win = page.getByRole('dialog', {name: /Submit Your Response to Reviewer Feedback|Author Response/}).last();
    await win.waitFor({timeout: T});
    await win.locator('iframe').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    let body = null;
    for (let i = 0; i < 20; i++) {
        body = flat(await win.frameLocator('iframe').first().locator('body').innerText().catch(() => ''), 400);
        if (body) break;
        await sleep(500);
    }
    const out = {offered: true, intro: flat(await win.locator('p').first().innerText().catch(() => null), 300), body};
    await win.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
    await win.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    return out;
}

/** The editor's workflow of a submission: the "Author Response" table's rows and "Request Response"'s state. */
async function editorTable(page, app, id, ctx = app.contextPath) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await page.getByRole('dialog').first().waitFor({timeout: 60_000}).catch(() => {});
    await idle(page);
    const table = page.getByRole('table', {name: 'Author Response'});
    const shown = await table.waitFor({timeout: 20_000}).then(() => true).catch(() => false);
    if (!shown) return {table: false, text: flat(await page.getByRole('dialog').first().innerText().catch(() => null), 400)};
    for (let i = 0; i < 40; i++) {
        const t = flat(await table.locator('tbody').innerText().catch(() => ''));
        if (t && !/No Items/i.test(t)) break;
        await sleep(500);
    }
    await idle(page);
    const rows = [];
    for (const tr of await table.locator('tbody tr').all()) rows.push(flat(await tr.innerText().catch(() => null), 200));
    const b = page.getByRole('button', {name: 'Request Response', exact: true});
    return {
        table: true,
        rows,
        moreActions: await table.getByRole('button', {name: 'More Actions'}).count(),
        requestResponse: (await b.count()) ? ((await b.isEnabled()) ? 'enabled' : 'disabled') : 'absent',
    };
}

/** A page by its typed address: where it lands, its title, heading and main text. */
async function typed(page, address) {
    await page.goto(address);
    await idle(page);
    const shown = await screen(page);
    return {
        url: strip(page.url()),
        title: shown.title,
        h1: flat(await page.locator('h1').first().innerText().catch(() => null), 200),
        text: flat(shown.text && (shown.text.main || shown.text.body), 500),
    };
}

/** The "Request Author Response" page by its typed address, once loaded: "Submit Request"; the POST's status and the dialog. */
async function sendTypedRequest(page, app, {submissionId, reviewRoundId, stageId = 3}) {
    const R = AR();
    const req = new R.RequestAuthorResponsePage(page, app.contextPath);
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewResponse/requestAuthorResponse?stageId=${stageId}&reviewRoundId=${reviewRoundId}&submissionId=${submissionId}`));
    const opened = await req.heading().waitFor({timeout: T}).then(() => true).catch(() => false);
    if (!opened) return {opened: false, page: flat((await screen(page)).text.main, 400)};
    for (let i = 0; i < 60; i++) {
        const body = flat(await req.messageBody().innerText().catch(() => ''));
        const loading = await page.getByText('Loading', {exact: true}).count();
        if (body && body.length > 40 && !loading) break;
        await sleep(500);
    }
    await idle(page);
    const to = (await req.recipientChips().allInnerTexts().catch(() => [])).map((t) => flat(t, 80));
    const posted = page.waitForResponse((r) => /authorResponse\/requestResponse/.test(r.url()), {timeout: T}).catch(() => null);
    await req.submitRequestButton().click();
    const resp = await posted;
    const dialog = page.getByRole('dialog').filter({hasText: /Request for review response sent|Error/});
    await dialog.first().waitFor({timeout: T}).catch(() => {});
    return {opened: true, to, post: resp ? resp.status() : null, dialog: flat(await dialog.first().innerText().catch(() => null), 300)};
}

/** Administration › Hosted Journals › "Create Journal", filled (English only) and saved. Returns the save's status. */
async function createJournal(page, app, {name, initials, path: urlPath, email}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'});
    await page.goto(app.url('/index.php/index/en/admin/contexts'));
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), name);
    await win.type(win.initials('en'), initials);
    await win.type(win.contactName, name);
    await win.type(win.contactEmail, email);
    await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, urlPath);
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
    }
    const r = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
    return r.status();
}

/**
 * In a context: Settings › Users & Roles › "Invite to a role" for an existing user's email: one
 * role row (role, today, "Appear on the masthead"), "Save And Continue", "Invite user to the role".
 */
async function inviteToRole(page, app, ctx, {email, role}) {
    const today = new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
    await page.goto(app.url(`/index.php/${ctx}/en/management/settings/access`));
    await page.getByRole('heading', {name: 'Users & Roles'}).first().waitFor({timeout: T});
    await idle(page);
    await page.getByRole('button', {name: 'Invite to a role'}).click();
    await page.getByLabel(/Search for a user by email address/).fill(email);
    await page.getByRole('button', {name: 'Search User', exact: true}).click();
    const newRow = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
    await newRow.waitFor({timeout: T});
    await idle(page);
    await newRow.getByLabel(/^Select a new role/).selectOption({label: role});
    await newRow.getByRole('textbox').fill(today);
    await newRow.getByRole('combobox').last().selectOption({label: 'Appear on the masthead'});
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    await page.locator('input[name="subject"]').waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
    await sent.waitFor({timeout: T});
    return flat(await sent.innerText(), 300);
}

/** The accept link of the newest invitation email to `email` since `since` that points at this install. */
async function acceptLink(app, email, since) {
    const origin = new URL(app.baseURL).origin;
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        const result = await app.mail._search({to: email, since});
        for (const m of result.messages || []) {
            const full = await app.mail.fullMessage(m.ID);
            const found = (full.HTML || '').match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i);
            const link = found ? found[1].replace(/&amp;/g, '&') : null;
            if (link && link.startsWith(origin)) return {subject: full.Subject, link};
        }
        await sleep(500);
    }
    return {subject: null, link: null};
}

/** The signed-in invitee opens the accept link, skips ORCID when asked, presses "Accept And Continue to …". */
async function acceptInvitation(page, link) {
    const met = [];
    await page.goto(link);
    await page.getByRole('heading', {name: /^STEP \d/}).first().waitFor({timeout: T});
    await idle(page);
    const skip = page.getByRole('button', {name: 'Skip ORCID verification'});
    if (await skip.count()) {
        await skip.click();
        await idle(page);
    }
    for (const h of await page.getByRole('heading', {name: /^STEP \d/}).allInnerTexts()) met.push(flat(h, 80));
    const accept = page.getByRole('button', {name: /^Accept And Continue to/});
    await accept.waitFor({timeout: T});
    await accept.click();
    const dialog = page.getByRole('dialog').filter({hasText: /assigned a new role/});
    await dialog.waitFor({timeout: T}).catch(() => {});
    return {steps: met, dialog: (await dialog.count()) ? flat(await dialog.innerText(), 300) : null};
}

/** "Make a Submission" in a context: the title, the two boxes, "Begin Submission"; returns the new submission's id. */
async function startSubmission(page, app, ctx, title) {
    const {StartSubmissionPage} = require('../../../../../apps/ojs/playwright/pages/SubmissionWizardPage.js');
    const start = new StartSubmissionPage(page, ctx);
    await start.goto();
    await start.heading().waitFor({timeout: T});
    await idle(page);
    await start.fillTitle(title);
    if (await start.checklistBox().count()) await start.checklistBox().check();
    if (await start.privacyBox().count()) await start.privacyBox().check();
    await start.begin();
    const m = page.url().match(/[?&]id=(\d+)/);
    return m ? Number(m[1]) : null;
}

module.exports = {
    T, sleep, flat, strip, api, dashboard, rounds, authorCard, submitResponse, viewSubmitted, editorTable, typed,
    sendTypedRequest, createJournal, inviteToRole, acceptLink, acceptInvitation, startSubmission,
};
