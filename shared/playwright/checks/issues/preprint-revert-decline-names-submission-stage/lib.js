// Helpers of walk.js (U33 OPS2: "Revert Decline" on a preprint closes on "…now active in the
// submission stage" and its email is named "Reinstate Submission Declined Without Review";
// docs/issues/U33-OPS2-preprint-revert-decline-names-submission-stage.md). Requiring this file runs nothing.
// Reused: the workflow opener, decision press and wizard walker of ../internal-round-revised-files-not-carried/lib.js
// and the "Manage Emails" opener and list read of ../french-manage-emails-raw-keys/lib.js.
const {idle} = require('../../../probe');
const R = require('../internal-round-revised-files-not-carried/lib.js');
const E = require('../french-manage-emails-raw-keys/lib.js');

const {flat} = R;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Select `name` ("Production") in the open workflow's menu and return the stage's buttons. */
async function workflowMenu(page, name) {
    const dlg = page.locator('[role="dialog"]:visible').first();
    const entry = dlg.getByRole('link', {name, exact: true}).or(dlg.getByRole('button', {name, exact: true})).first();
    await entry.waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
    if (!(await entry.count())) return {absent: true};
    await entry.click();
    await idle(page);
    await sleep(1000);
    await idle(page);
    return R.roundState(page);
}

/** The heading of the open workflow's page and its stage bubble text (the dialog's first lines). */
async function workflowHead(page) {
    const dlg = page.locator('[role="dialog"]:visible').first();
    const text = flat(await dlg.innerText().catch(() => null), 300);
    const h = await dlg.locator('h1, h2').evaluateAll((els) => els.filter((e) => e.getClientRects().length)
        .map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6)).catch(() => []);
    return {headings: h, text};
}

/** The email template buttons the wizard's "Notify Authors" page lists (its composer's template list). */
async function templateButtons(page) {
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
    return page.locator('.composer__templates button, .composer__templates a').evaluateAll((els) =>
        els.filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
}

/** "Manage Emails": the rows whose name or description speaks of declining, as listed. */
async function declineRows(app, page) {
    const via = await E.openManageEmails(app, page, 'en');
    const {rows} = await E.listFacts(page);
    return {via, rows: rows.filter((r) => /declin/i.test(`${r.name} ${r.description}`))};
}

/** Press "Edit" on the "Manage Emails" row `name` and return the window's text (its templates). */
async function mailableWindow(page, name) {
    const row = page.locator('.manageEmails__listPanel .listPanel__item').filter({has: page.locator('.listPanel__itemTitle', {hasText: name})}).first();
    if (!(await row.count())) return {absent: true};
    await row.locator('.listPanel__itemActions button').first().click();
    await idle(page);
    const win = page.getByRole('dialog').filter({hasText: name}).last();
    await win.waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    await sleep(800);
    await idle(page);
    return {text: flat(await win.innerText().catch(() => null), 900)};
}

module.exports = {flat, sleep, workflowMenu, workflowHead, templateButtons, declineRows, mailableWindow,
    openWorkflow: R.openWorkflow, roundState: R.roundState, pressDecision: R.pressDecision, wizardPage: R.wizardPage, throughWizard: R.throughWizard};
