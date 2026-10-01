// Helpers of walk.js (issue report U19 A10). Requiring this file runs nothing. Every helper
// drives a screen a journal manager uses.
const {idle, shot} = require('../../../probe');
const {AccessSettings} = require('../../../pages/SubscriptionsPages.js');
const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
const {PluginGrid} = require('../../../pages/OaiPages.js');

const T = 30_000;
const CTX = 'publicknowledge';
const SUBSCRIPTION_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Settings › Distribution › "Access": the subscription choice of "Publishing Mode", "Save". */
async function requireSubscriptions(page) {
    const access = new AccessSettings(page, CTX);
    await access.goto();
    const radio = access.modeRadio(SUBSCRIPTION_MODE);
    const was = await radio.isChecked();
    await radio.check();
    const r = await access.save();
    await shot(page, 'access-settings').catch(() => {});
    return {was, checked: await radio.isChecked(), save: r.status()};
}

/** Settings › Website › "Plugins": a plugin's box ticked. */
async function enablePlugin(page, name) {
    const grid = new PluginGrid(page, CTX);
    await grid.goto();
    const out = {category: flat(await grid.categoryOf(name), 80), was: await grid.box(name).isChecked()};
    if (!out.was) await grid.setEnabled(name, true);
    out.ticked = await grid.box(name).isChecked();
    return out;
}

/** Issues › "Back Issues" › the issue's "Edit" › "Access": "Subscription", "Save". */
async function restrictIssue(page, name) {
    const issues = new IssuesAdmin(page, CTX);
    await issues.goto('Back Issues');
    let win = await issues.openManagement('Back Issues', name);
    const form = await win.openAccess();
    const select = form.locator('select#accessStatus');
    const out = {choices: (await select.locator('option').allInnerTexts()).map((t) => flat(t)), was: flat(await select.locator('option:checked').innerText())};
    await select.selectOption({label: 'Subscription'});
    const saved = page.waitForResponse((r) => /update-access/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    out.save = r ? r.status() : null;
    await idle(page).catch(() => {});
    await page.waitForTimeout(800);
    // read back: the window reopened on "Access"
    await issues.goto('Back Issues');
    win = await issues.openManagement('Back Issues', name);
    const again = await win.openAccess();
    out.now = flat(await again.locator('select#accessStatus option:checked').innerText());
    out.openAccessDate = await again.locator('input[name="openAccessDate-removed"]').inputValue().catch(() => null);
    await shot(page, 'issue-access').catch(() => {});
    await win.close();
    return out;
}

/** 3.5 only: Issues › "Future Issues" › the issue's "Publish Issue", no email, "OK". */
async function publishIssue(page, name) {
    const issues = new IssuesAdmin(page, CTX);
    await issues.goto('Future Issues');
    const win = await issues.openPublish(name);
    await win.mailBox().uncheck().catch(() => {});
    await win.ok();
    await issues.goto('Back Issues');
    const back = await issues.openManagement('Back Issues', name);
    const form = await back.openAccess();
    const access = flat(await form.locator('select#accessStatus option:checked').innerText());
    await back.close();
    return {published: name, access};
}

module.exports = {T, CTX, flat, requireSubscriptions, enablePlugin, restrictIssue, publishIssue};
