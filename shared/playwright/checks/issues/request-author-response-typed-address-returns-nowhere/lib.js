// Helpers of walk.js (U30 A4: the "Request Author Response" page opened by its typed address returns nowhere;
// docs/issues/U30-A4-request-author-response-typed-address-returns-nowhere.md).
// Requiring this file runs nothing. The workflow's round entry is pressed with
// ../author-revision-filed-on-earlier-internal-round/lib.js's chooseRound(); the request page's locators are
// the OJS page object's (they read the shared pkp-lib/ui-library page, the same on a press).
const {idle, screen, record} = require('../../../probe');
const R = require('../author-revision-filed-on-earlier-internal-round/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const P = () => require('../../../../../apps/ojs/playwright/pages/AuthorResponsePages.js');
const path = (page) => page.url().replace(/^https?:\/\/[^/]+/, '');

/** The submission's workflow from the dashboard's address; then the round entry under `stage`. Returns the address bar. */
async function openRound(page, app, id, stage) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page);
    await page.getByRole('heading', {name: /^Workflow:/}).first().waitFor({timeout: T}).catch(() => {});
    const chosen = await R.chooseRound(page, stage, 1);
    const m = /workflowMenuKey=workflow_(\d+)_(\d+)/.exec(decodeURIComponent(page.url()));
    return {url: path(page), pressed: chosen.pressed, heading: chosen.heading, entries: chosen.pressed ? undefined : chosen.entries,
        stageId: m ? Number(m[1]) : null, roundId: m ? Number(m[2]) : null};
}

/** The request page has loaded: heading, then "Message" holding the template and no "Loading". Returns what shows. */
async function waitLoaded(page) {
    const req = new (P().RequestAuthorResponsePage)(page, null);
    const up = await req.heading().waitFor({timeout: T}).then(() => true).catch(() => false);
    if (!up) {
        await idle(page);
        return {page: false, url: path(page), title: await page.title(), text: flat(await page.locator('body').innerText().catch(() => null), 300)};
    }
    for (let i = 0; i < 60; i++) {
        const body = flat(await req.messageBody().innerText().catch(() => ''));
        const loading = await page.getByText('Loading', {exact: true}).count();
        if (body && body.length > 40 && !loading) break;
        await sleep(500);
    }
    await idle(page);
    return {
        page: true,
        url: path(page),
        heading: flat(await req.heading().innerText().catch(() => null)),
        to: flat((await req.recipientChips().allInnerTexts().catch(() => [])).join(' | '), 200),
        subject: await req.subject().inputValue().catch(() => null),
    };
}

/** Wait until the address leaves `from` (at most `ms`), then for the page to settle. Returns where the page is. */
async function landing(page, from, ms = 8000) {
    await page.waitForURL((u) => u.toString() !== from, {timeout: ms, waitUntil: 'commit'}).catch(() => {});
    await page.waitForLoadState('load').catch(() => {});
    await idle(page);
    const left = page.url() !== from;
    return {
        moved: left,
        url: path(page),
        title: await page.title().catch(() => null),
        text: flat(await page.locator('body').innerText().catch(() => null), 200),
    };
}

/** "Cancel" on the request page; where it lands. */
async function cancel(page, name) {
    const req = new (P().RequestAuthorResponsePage)(page, null);
    const from = page.url();
    await req.cancelButton().click();
    const out = await landing(page, from);
    if (name) record(name, {...out, screen: await screen(page)});
    return out;
}

/** "Submit Request"; the POST's status and the sent dialog: its text and its one control (tag, label, href). */
async function submit(page, name) {
    const req = new (P().RequestAuthorResponsePage)(page, null);
    const posted = page.waitForResponse((r) => /authorResponse\/requestResponse/.test(r.url()), {timeout: T}).catch(() => null);
    await req.submitRequestButton().click();
    const resp = await posted;
    const dialog = req.sentDialog();
    await dialog.waitFor({timeout: T}).catch(() => {});
    await idle(page);
    const control = await dialog.locator('a, button').evaluateAll((els) => els
        .filter((e) => e.getClientRects().length > 0)
        .map((e) => ({tag: e.tagName.toLowerCase(), label: e.innerText.replace(/\s+/g, ' ').trim(), href: e.getAttribute('href'), aria: e.getAttribute('aria-label')})))
        .catch(() => []);
    const out = {post: resp ? resp.status() : null, dialog: flat(await dialog.innerText().catch(() => null), 400), controls: control};
    if (name) record(name, {...out, screen: await screen(page)});
    return out;
}

/** Press the sent dialog's control named `label` (its own text, not "Close"); where the page is after it. */
async function pressDialogControl(page, label, name) {
    const dialog = new (P().RequestAuthorResponsePage)(page, null).sentDialog();
    const from = page.url();
    const ctl = dialog.locator('a, button').filter({hasText: label}).first();
    await ctl.click({timeout: 5000}).catch(() => {});
    const out = await landing(page, from, 4000);
    out.dialogStillOpen = await dialog.isVisible().catch(() => false);
    if (name) record(name, {...out, screen: await screen(page)});
    return out;
}

/** Escape on the sent dialog; where it lands. */
async function escapeDialog(page, name) {
    const from = page.url();
    await page.keyboard.press('Escape');
    const out = await landing(page, from);
    if (name) record(name, {...out, screen: await screen(page)});
    return out;
}

module.exports = {T, sleep, flat, P, path, openRound, waitLoaded, landing, cancel, submit, pressDialogControl, escapeDialog};
