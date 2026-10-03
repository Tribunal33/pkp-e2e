// Helpers of walk.js here (U27 A13: the "Email Reviewer" window sends an email with an empty body;
// docs/issues/U27-A13-email-reviewer-sends-empty-body.md). Requiring this file runs nothing.
// Every helper drives the screens a person uses: the workflow's "Reviewers" panel, a row's
// "More Actions" › "Email Reviewer", and the legacy window it opens (form#emailReviewerForm).
// The workflow opener and the row come from the U27/U28 issue walks' helpers.
const {idle} = require('../../../probe');
const U28 = require('../reviewer-link-dead-after-second-request/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const P = () => require('../../../../../apps/omp/playwright/pages/ReviewerAssignmentPages.js');

/** Per app, on PKP's default test dataset (docs/process/dataset.md): a submission in review and an unanswered reviewer. */
const CASES = {
    ojs: {id: 12, reviewer: {user: 'jjanssen', name: 'Julie Janssen'}},
    omp: {id: 17, reviewer: {user: 'jjanssen', name: 'Julie Janssen'}},
};

/** The editor's workflow of the submission, its "Reviewers" panel on screen. */
const openWorkflow = (page, app, id) => U28.openWorkflow(page, app, id);

/** The open "Email Reviewer" form. */
const form = (page) => page.locator('form#emailReviewerForm');

/** The reviewer's row › "More Actions" › "Email Reviewer"; returns once the window's Subject box is there. */
async function openEmailReviewer(page, modal, name) {
    const R = P();
    const row = R.reviewerRow(modal, name).first();
    const menu = await R.openRowMenu(page, row);
    await R.menuEntry(menu, 'Email Reviewer').click();
    await form(page).locator('input[name="subject"]').waitFor({timeout: T});
    await idle(page);
    // the Body is a rich-text editor: wait for its frame
    await form(page).locator('iframe').first().waitFor({timeout: T}).catch(() => {});
    await sleep(500);
    return readForm(page);
}

/** The window as shown: whether it is open, its fields' labels, the values, every visible error text. */
async function readForm(page) {
    const f = form(page);
    if (!(await f.count()) || !(await f.isVisible().catch(() => false))) return {open: false};
    return f.evaluate((el) => {
        const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const visible = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const errors = [...el.querySelectorAll('label.error, .error label, label.sub_label.error, .pkp_form_error, span.error')]
            .filter(visible)
            .map((e) => ({text: clean(e.innerText), near: clean((e.closest('.section') || e.parentElement || {}).innerText).slice(0, 120)}))
            .filter((e) => e.text);
        const subject = el.querySelector('input[name="subject"]');
        const message = el.querySelector('textarea[name="message"]');
        const button = [...el.querySelectorAll('button')].find((b) => clean(b.innerText) === 'Send Email');
        return {
            sendDisabled: button ? button.disabled : null,
            open: true,
            text: clean(el.innerText).slice(0, 600),
            subject: subject ? subject.value : null,
            message: message ? message.value : null,
            errors,
        };
    });
}

/** Type the Subject (select all, then the text) and, when given, the Body into its editor. */
async function fill(page, {subject, body}) {
    const f = form(page);
    if (subject != null) {
        const box = f.locator('input[name="subject"]');
        await box.click();
        await box.press('ControlOrMeta+a');
        await box.pressSequentially(subject, {delay: 15});
    }
    if (body != null) {
        const frame = f.locator('iframe').first().contentFrame();
        await frame.locator('body').click();
        await frame.locator('body').pressSequentially(body, {delay: 15});
    }
    await sleep(300);
}

/**
 * Press "Send Email". Records what the browser posted (its subject and message) and the
 * answer, then reads the window again (gone when it closed). Throws nothing on a refusal.
 */
async function send(page) {
    const posted = [];
    const onRequest = (req) => {
        if (req.method() === 'POST' && /send-email/.test(req.url())) {
            const params = new URLSearchParams(req.postData() || '');
            posted.push({subject: params.get('subject'), message: params.get('message'), url: req.url().replace(/^https?:\/\/[^/]+/, '')});
        }
    };
    const answers = [];
    const onResponse = async (res) => {
        if (res.request().method() === 'POST' && /send-email/.test(res.url())) {
            answers.push({status: res.status(), body: flat(await res.text().catch(() => ''), 300)});
        }
    };
    // a refusal may come as a browser alert: record its text and accept it (the script's own listener decides)
    const dialogs = [];
    const onDialog = (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        d.accept().catch(() => {});
    };
    page.on('request', onRequest);
    page.on('response', onResponse);
    page.on('dialog', onDialog);
    await form(page).getByRole('button', {name: 'Send Email', exact: true}).click();
    await idle(page);
    await sleep(1500);
    page.off('request', onRequest);
    page.off('response', onResponse);
    page.off('dialog', onDialog);
    const notices = (await page.locator('.app__notifications .pkpNotification:visible').allInnerTexts().catch(() => [])).map((t) => flat(t, 200));
    return {posted, answers, dialogs, notices, after: await readForm(page)};
}

/** The window's own "Cancel" link (accepting a leave question if one comes); returns whether the window closed. */
async function cancel(page) {
    const dialogs = [];
    const onDialog = (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        d.accept().catch(() => {});
    };
    page.on('dialog', onDialog);
    await form(page).locator('a[id^="cancelFormButton"], a:has-text("Cancel")').first().click();
    const closed = await form(page).waitFor({state: 'detached', timeout: 10_000}).then(() => true, () => false);
    await idle(page);
    await sleep(1000);
    page.off('dialog', onDialog);
    return {closed, dialogs};
}

/** The messages to an address since a time: subject and body text (Mailpit). */
async function mailsTo(app, to, since) {
    const out = [];
    const n = await app.mail.count({to, since});
    if (!n) return out;
    const res = await app.mail._search({to, since});
    for (const m of res.messages || []) {
        const full = await app.mail.fullMessage(m.ID);
        out.push({subject: m.Subject, text: full.Text, html: flat(full.HTML, 400), textLength: (full.Text || '').trim().length});
    }
    return out;
}

module.exports = {T, sleep, flat, CASES, openWorkflow, form, openEmailReviewer, readForm, fill, send, cancel, mailsTo};
