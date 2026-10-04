// Helpers of the kept walks for docs/issues/U30-A7-author-response-gone-after-revisions-upload.md and
// docs/issues/U30-OMP1-press-author-response-button-leads-nowhere.md (spec U30, register A7 and OMP1).
// Requiring this file runs nothing. Every helper drives the screens a person uses: the editor's decision
// ("Request Revisions" and its steps), the author's workflow (status, "Author Response" card, "Upload
// revisions"), the "Request Author Response" page by its address, and the author's mailbox, whose
// "Submit Author Response" button the author presses. Reused: the decision opener of
// ../internal-revisions-request-gives-author-no-task/lib.js, the upload helpers of
// ../author-revisions-upload-offered-then-refused/lib.js and ../author-update-file-details-offered-then-refused/lib.js.
const {idle, screen, settled} = require('../../../probe');
const H = require('../internal-revisions-request-gives-author-no-task/lib.js');
const A = require('../author-revisions-upload-offered-then-refused/lib.js');
const L = require('../author-update-file-details-offered-then-refused/lib.js');

const T = 30_000;
const {flat, sleep} = L;
const DECISION_SUBJECT = 'Your submission has been reviewed and we encourage you to submit revisions';
const REQUEST_SUBJECT = 'Request For Author Response To Reviewer Feedback';
const WINDOW = 'Submit Your Response to Reviewer Feedback';
const STATUS_RE = /(Revisions have been requested\.|Revisions have been submitted and a decision is needed\.|Resubmitted for review\.|Revisions have been requested and will be sent out for a new round of reviews\.|[A-Z][^.\n]{5,120}(stage|review|decision)[^.\n]{0,80}\.)/;

/** The round's status line, read from the workflow window's text (the "Round 1 Status" box). */
function statusOf(text) {
    if (!text) return null;
    const box = text.split(/Round \d+ Status/)[1] || text;
    const m = box.match(STATUS_RE);
    return m ? m[1] : null;
}

/**
 * As the signed-in editor: open submission `id` (on `menuKey` when given) and record the decision
 * `label` through its steps. With `newRound`, the "Require New Review Round" window takes
 * "Revisions will be subject to a new round of peer reviews." before "Next". Returns the steps'
 * headings, the decision request's status and the closing panel's text.
 */
async function decide(page, app, id, label, {menuKey = null, newRound = false} = {}) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 60_000});
    await H.decisionButton(page, label).first().waitFor({state: 'visible', timeout: 60_000});
    await idle(page);
    if (!newRound) return H.recordDecision(page, label);
    // the entry window's other choice, then the shared helper's path (it presses "Next" itself)
    const entry = page.getByRole('dialog').filter({hasText: 'Require New Review Round'});
    const onClick = async () => {
        await entry.first().waitFor({timeout: T});
        await entry.getByText('Revisions will be subject to a new round of peer reviews.', {exact: true}).click();
    };
    const orig = H.decisionButton(page, label).first();
    await orig.click();
    await onClick();
    // re-enter the helper's loop without pressing the decision button again
    const out = {entry: flat(await entry.first().innerText().catch(() => null), 300), steps: [], request: null};
    const onResponse = (r) => {
        if (/\/decisions(\?|$)/.test(r.url()) && r.request().method() === 'POST') out.request = {status: r.status()};
    };
    page.on('response', onResponse);
    await entry.getByRole('button', {name: 'Next'}).click();
    const done = page.getByText('View Submission Summary');
    for (let i = 0; i < 8 && !(await done.count()); i++) {
        await idle(page);
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
        out.steps.push(flat(await page.locator('h1').first().innerText().catch(() => null), 120));
        const record = page.getByRole('button', {name: /^Record (Editorial )?Decision$/});
        if (await record.count()) {
            await record.first().click();
            await done.first().waitFor({timeout: 60_000});
            break;
        }
        await page.getByRole('button', {name: 'Continue', exact: true}).click();
        await sleep(400);
    }
    await idle(page);
    page.off('response', onResponse);
    return out;
}

/**
 * The author's workflow of submission `id` from "My Submissions" (on `menuKey` when given): the
 * round's status, the "Author Response" card and its button, the response window, and the Vue
 * elements the page could not resolve (a component named by the stage's configuration but not
 * registered by the page renders as an unknown HTML element of that name).
 */
async function authorView(page, app, id, {menuKey = null} = {}) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions?workflowSubmissionId=${id}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 60_000});
    await page.getByRole('table', {name: 'Revisions Uploaded', exact: true}).first().waitFor({timeout: 60_000}).catch(() => {});
    await idle(page);
    return readAuthor(page);
}

/** What the open author workflow shows: status, card, window, unresolved elements, the menu's selected item. */
async function readAuthor(page) {
    const dialog = page.getByRole('dialog').first();
    const text = await dialog.innerText().catch(() => '');
    const card = dialog.getByRole('heading', {name: 'Author Response', exact: true});
    const win = page.getByRole('dialog', {name: WINDOW});
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        status: statusOf(text),
        card: (await card.count()) ? flat(await card.locator('xpath=ancestor::div[1]').innerText().catch(() => null), 200) : null,
        submitResponse: await dialog.getByRole('button', {name: 'Submit Response', exact: true}).count(),
        window: (await win.count()) ? flat(await win.innerText().catch(() => null), 300) : null,
        headings: (await dialog.locator('h2, h3, h4').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean),
        unresolved: await unresolved(page),
    };
}

/** Unknown elements left by unresolved dynamic components of this feature: tag and attribute names. */
async function unresolved(page) {
    return page.locator('authorresponsemanager, authorresponserequestmanager').evaluateAll((els) =>
        els.map((e) => ({tag: e.tagName.toLowerCase(), attrs: e.getAttributeNames().slice(0, 8), children: e.childElementCount})));
}

/** As the signed-in author: "Upload revisions", the component, the file, "Continue", "Continue", "Complete". */
async function uploadRevision(page, app, id, component, fileName) {
    await A.openWorkflow(page, app, id, {author: true});
    return A.uploadThrough(page, A.uploadRevisionsButton(page), component, L.smallFile(fileName));
}

/**
 * The newest email to `to` with `subject` sent since `since` by this install (its links carry the
 * install's own host): the subject and the "Submit Author Response" button's address.
 */
async function mailButton(app, to, subject, since) {
    const host = new URL(app.baseURL).host;
    const msg = await app.mail.find({to, subject, contains: host, since, timeoutMs: 30_000});
    const full = await app.mail.fullMessage(msg.ID);
    const link = app.mail.extractLink(full.HTML || '', 'Submit Author Response');
    return {subject: msg.Subject, button: link, count: await app.mail.count({to, subject, since})};
}

/**
 * As the signed-in author: press the email's "Submit Author Response" (open its address), give the
 * screen time to open the response window (it opens once the round has loaded), and read it.
 */
async function pressButton(page, link) {
    await page.goto('about:blank');
    await page.goto(link);
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 60_000});
    await idle(page);
    await page.getByRole('dialog', {name: WINDOW}).waitFor({timeout: 15_000}).catch(() => {});
    return readAuthor(page);
}

/**
 * As the signed-in editor: open the "Request Author Response" page by its address, wait for
 * "Message" to fill, press "Submit Request". Returns the page's heading and "To", the POST's status
 * and the dialog's title.
 */
async function typedRequest(page, app, {id, stageId, roundId}) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewResponse/requestAuthorResponse?stageId=${stageId}&reviewRoundId=${roundId}&submissionId=${id}`));
    const heading = page.getByRole('heading', {name: 'Request Author Response', level: 1});
    await heading.waitFor({timeout: T});
    const body = page.locator('iframe[id^="composer-body"]').first().contentFrame().locator('body');
    await settled(page, body);
    for (let i = 0; i < 40; i++) {
        const t = flat(await body.innerText().catch(() => ''));
        if (t && t.length > 40 && !(await page.getByText('Loading', {exact: true}).count())) break;
        await sleep(500);
    }
    const out = {
        heading: flat(await heading.innerText().catch(() => null)),
        to: (await page.locator('.pkpAutosuggest--disabled .pkpAutosuggest__selection').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)),
    };
    const posted = page.waitForResponse((r) => /authorResponse\/requestResponse/.test(r.url()), {timeout: T}).catch(() => null);
    await page.getByRole('button', {name: 'Submit Request', exact: true}).click();
    const resp = await posted;
    out.post = resp ? resp.status() : null;
    const dialog = page.getByRole('dialog', {name: 'Request for review response sent'});
    await dialog.waitFor({timeout: T}).catch(() => {});
    out.dialog = (await dialog.count()) ? flat(await dialog.locator('h1, h2').first().innerText().catch(() => null), 120) : null;
    return out;
}

/** As the signed-in editor: the workflow of submission `id` on `menuKey`: headings, the "Author Response" table, unresolved elements. */
async function editorView(page, app, id, menuKey) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 60_000});
    await page.getByRole('table', {name: 'Reviewers'}).first().waitFor({timeout: 60_000}).catch(() => {});
    await idle(page);
    const dialog = page.getByRole('dialog').first();
    const table = dialog.getByRole('table', {name: 'Author Response'});
    return {
        status: statusOf(await dialog.innerText().catch(() => '')),
        headings: (await dialog.locator('h2, h3, h4').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean),
        table: (await table.count()) ? flat(await table.first().innerText().catch(() => null), 300) : null,
        requestResponse: (await dialog.getByRole('button', {name: 'Request Response', exact: true}).count())
            ? ((await dialog.getByRole('button', {name: 'Request Response', exact: true}).first().isDisabled()) ? 'disabled' : 'enabled')
            : 'absent',
        unresolved: await unresolved(page),
    };
}

module.exports = {T, flat, sleep, DECISION_SUBJECT, REQUEST_SUBJECT, WINDOW, statusOf, decide, authorView, readAuthor, unresolved, uploadRevision, mailButton, pressButton, typedRequest, editorView, screen};
