// Helpers of the kept walk for docs/issues/U30-A5-request-author-response-empty-field-generic-error.md
// (spec U30, register A5). Requiring this file runs nothing. Every helper drives the screens a person uses:
// the editor's workflow (Review stage, "Request Response"), the "Request Author Response" page reached from
// the button or by its address, its "Subject" and "Message", "Submit Request" and the dialog it brings.
const {idle, screen, record} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const P = () => require('../../../../../apps/ojs/playwright/pages/AuthorResponsePages.js');

/** The editor's workflow of the submission by the dashboard's address; returns the review round id read from the address bar (`workflow_3_<id>`). */
async function openWorkflowRound(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await page.getByRole('dialog').first().waitFor({timeout: T});
    for (let i = 0; i < 40; i++) {
        const m = /workflow_3_(\d+)/.exec(page.url());
        if (m) return Number(m[1]);
        await sleep(500);
    }
    // not landed on the round: pick Review › Round 1 in the workflow menu
    await page.getByRole('dialog').first().getByRole('button', {name: /Round 1/}).first().click();
    for (let i = 0; i < 40; i++) {
        const m = /workflow_3_(\d+)/.exec(page.url());
        if (m) return Number(m[1]);
        await sleep(500);
    }
    throw new Error(`no review round in the address for submission ${id}: ${page.url()}`);
}

/** "Request Response" in the open workflow's "Author Response" table. */
async function openRequestFromButton(page) {
    const table = new (P().AuthorResponseTable)(page);
    await table.table().waitFor({timeout: T});
    for (let i = 0; i < 40; i++) {
        const t = flat(await table.table().locator('tbody').innerText().catch(() => ''));
        if (t && !/No Items/i.test(t)) break;
        await sleep(500);
    }
    await table.requestResponseButton().click();
    return waitLoaded(page);
}

/** The request page by its typed address (spec U30 Rule 14). */
async function openRequestByAddress(page, app, submissionId, roundId) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId=${roundId}&submissionId=${submissionId}`));
    return waitLoaded(page);
}

/** Waits for the heading, the subject and the template in "Message" ("Loading" gone). */
async function waitLoaded(page) {
    const req = new (P().RequestAuthorResponsePage)(page, '');
    await req.heading().waitFor({timeout: T});
    for (let i = 0; i < 60; i++) {
        const body = flat(await req.messageBody().innerText().catch(() => ''));
        const loading = await page.getByText('Loading', {exact: true}).count();
        if (body && body.length > 40 && !loading) break;
        await sleep(500);
    }
    await idle(page);
    return req;
}

/** What the page shows now: subject, message length, every field message under the composer. */
async function readPage(page) {
    const req = new (P().RequestAuthorResponsePage)(page, '');
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        heading: flat(await req.heading().innerText().catch(() => null)),
        subject: await req.subject().inputValue().catch(() => null),
        messageChars: (flat(await req.messageBody().innerText().catch(() => '')) || '').length,
        fieldErrors: (await page.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((t) => flat(t, 200)),
        subjectInvalid: await req.subject().getAttribute('aria-invalid').catch(() => null),
    };
}

async function clearSubject(page) {
    const req = new (P().RequestAuthorResponsePage)(page, '');
    await req.subject().fill('');
    await req.subject().blur();
}

async function typeSubject(page, text) {
    const req = new (P().RequestAuthorResponsePage)(page, '');
    await req.subject().fill(text);
    await req.subject().blur();
}

/** Selects everything in "Message" and deletes it, then leaves the box. */
async function clearMessage(page) {
    const req = new (P().RequestAuthorResponsePage)(page, '');
    await req.messageBody().click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Delete');
    await req.subject().click();
    await sleep(500);
}

/**
 * "Submit Request": the POST's status and body, the dialog it brings (title and text) and the page after.
 * Leaves a dialog open; `dismiss()` answers it.
 */
async function submit(page, name) {
    const req = new (P().RequestAuthorResponsePage)(page, '');
    const posted = page.waitForResponse((r) => /authorResponse\/requestResponse/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await req.submitRequestButton().click();
    const resp = await posted;
    const out = {post: resp ? resp.status() : null, sent: null, response: null};
    if (resp) {
        out.response = flat(await resp.text().catch(() => null), 600);
        try {
            const b = JSON.parse(resp.request().postData() || '{}');
            out.sent = {subject: b.subject, bodyChars: (b.body || '').length};
        } catch {
            // not JSON
        }
    }
    await sleep(800);
    await idle(page);
    const dialog = page.getByRole('dialog').last();
    out.dialog = (await dialog.count()) ? flat(await dialog.innerText().catch(() => null), 400) : null;
    out.page = await readPage(page);
    if (name) record(name, {...out, screen: await screen(page)});
    return out;
}

/** "OK" (or the sent dialog's link) on whatever dialog is open; returns the page read after it. */
async function dismiss(page) {
    const ok = page.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true});
    if (await ok.count()) {
        await ok.click();
        await page.getByRole('dialog').waitFor({state: 'hidden', timeout: T}).catch(() => {});
    }
    await idle(page);
    return readPage(page);
}

module.exports = {T, sleep, flat, openWorkflowRound, openRequestFromButton, openRequestByAddress, waitLoaded, readPage, clearSubject, typeSubject, clearMessage, submit, dismiss};
