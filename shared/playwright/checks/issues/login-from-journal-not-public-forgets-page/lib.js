// Helpers of walk.js (issue report docs/issues/U59-A8-login-from-journal-not-public-forgets-page.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const {expect} = require('@playwright/test');
const {idle} = require('../../../probe');
const {flat, rel} = require('../older-version-pdf-reader-empty/lib');

const T = 30_000;

/** Per-app screen words and the dataset's published item and author. */
const APPS = {
    ojs: {item: 'article/view/17', author: 'amwandenga', restrict: 'Users must be registered and log in to view the journal site.'},
    omp: {item: 'catalog/book/14', author: 'aclark', restrict: 'Users must be registered and log in to view the press site.'},
    ops: {item: 'preprint/view/2', author: 'ccorino', restrict: 'Users must be registered and log in to view the server site.'},
};

/**
 * The Register form at the journal, filled as a newcomer would and sent; where it lands. The
 * password is the username twice, as the dataset's users have it.
 */
async function registerReader(page, app, {givenName, familyName, username}) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/user/register`));
    const form = page.locator('form#register');
    await form.waitFor({state: 'visible', timeout: T});
    await form.locator('input[name="givenName"]').fill(givenName);
    await form.locator('input[name="familyName"]').fill(familyName);
    await form.locator('input[name="affiliation"]').fill(familyName);
    await form.locator('select[name="country"]').selectOption({label: 'Canada'});
    await form.locator('input[name="email"]').fill(`${username}@mailinator.com`);
    await form.locator('input[name="username"]').fill(username);
    await form.locator('input[name="password"]').fill(username + username);
    await form.locator('input[name="password2"]').fill(username + username);
    const consent = form.locator('input[name="privacyConsent"]');
    if (await consent.count()) await consent.check();
    await Promise.all([page.waitForLoadState('load'), form.locator('button.submit').click()]);
    await page.waitForURL(/\/user\/register/, {timeout: T}).catch(() => {});
    await page.waitForLoadState('load');
    return {
        url: flat(rel(page.url()), 200),
        heading: flat(await page.locator('h1').first().innerText().catch(() => null), 120),
        errors: await page.locator('#formErrors li').allInnerTexts().catch(() => []),
    };
}

/**
 * Administration › Hosted Journals › the row's "Edit": tick or untick "Enable this journal to
 * appear publicly on the site", "Save"; the box as it was and the save's status.
 */
async function setEnabled(page, app, enabled) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const {WORDS} = require('../hosted-journals-list-keeps-old-name-after-edit/lib');
    const hosted = new HostedJournalsPage(page, WORDS[app.name]);
    await hosted.goto();
    const win = await hosted.openEdit(app.contextPath);
    const label = flat(await win.enableBox.evaluate((el) => (el.closest('label') || el.parentElement).textContent));
    const was = await win.enableBox.isChecked();
    await win.setBox(win.enableBox, enabled);
    const res = await win.pressSave();
    await expect(win.root).toHaveCount(0, {timeout: T});
    await idle(page).catch(() => {});
    return {label, was, now: enabled, status: res.status()};
}

/** Open an address signed out and say where the visitor ends up. */
async function openSignedOut(page, app, path) {
    const asked = `/index.php/${app.contextPath}/en/${path}`;
    const chain = [];
    const on = (r) => {
        if (r.request().isNavigationRequest() && r.status() >= 300 && r.status() < 400) chain.push({status: r.status(), location: flat(rel(r.headers().location), 300)});
    };
    page.on('response', on);
    await page.goto(app.url(asked));
    page.off('response', on);
    await page.waitForLoadState('load');
    return {
        asked,
        redirects: chain,
        url: flat(rel(page.url()), 300),
        title: await page.title(),
        source: await page.locator('form#login input[name="source"]').getAttribute('value').catch(() => null),
    };
}

module.exports = {T, APPS, registerReader, setEnabled, openSignedOut};
