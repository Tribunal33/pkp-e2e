// Helpers of walk.js (issue report docs/issues/U69-A18-sign-in-to-buy-file-skips-payment-page.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const {idle} = require('../../../probe');
const {sleep, flat, rel} = require('../older-version-pdf-reader-empty/lib');

/** The Login page as it stands: its address, the hidden `source`, the text above the form. */
async function readLogin(page) {
    return {
        url: flat(rel(page.url()), 300),
        title: await page.title(),
        source: await page.locator('form#login input[name="source"]').getAttribute('value').catch(() => null),
        aboveForm: flat(
            await page.evaluate(() => {
                const form = document.querySelector('form#login');
                const out = [];
                for (let el = form?.previousElementSibling; el; el = el.previousElementSibling) out.unshift((el.textContent || '').trim());
                const legend = form?.querySelector('fieldset > legend, p.required, .cmp_notification');
                return out.join(' | ') + (legend ? ` || in form: ${legend.textContent.trim()}` : '');
            }),
            400
        ),
    };
}

/** Type a username and its password into the Login page that is open and press "Login"; where it lands. */
async function signInHere(page, username) {
    await page.locator('input#username').fill(username);
    await page.locator('input#password').fill(username + username);
    await Promise.all([page.waitForURL((u) => !/\/login(\/signIn)?(\?|$)/.test(u.pathname + u.search), {timeout: 30_000}), page.locator('form#login button[type="submit"]').click()]);
    await page.waitForLoadState('load');
    await idle(page).catch(() => {});
    await sleep(1500);
    return {
        url: flat(rel(page.url()), 200),
        title: await page.title(),
        heading: flat(await page.locator('h1').first().innerText().catch(() => null), 120),
        body: flat(await page.locator('.pkp_structure_main, main, body').first().innerText().catch(() => ''), 300),
    };
}

async function landed(page) {
    await page.waitForLoadState('load');
    await idle(page).catch(() => {});
    await sleep(1500);
    return {
        url: flat(rel(page.url()), 200),
        title: await page.title(),
        heading: flat(await page.locator('h1').first().innerText().catch(() => null), 120),
        body: flat(await page.locator('.pkp_structure_main, main, body').first().innerText().catch(() => ''), 300),
    };
}

/**
 * The Login page's "Register" link, the Register form filled as a newcomer would, "Register";
 * where it lands. The password is the username twice, as the dataset's users have it.
 */
async function registerHere(page, app, {givenName, familyName, username}) {
    const path = require('path');
    const {RegisterPage} = require(path.join(app.suiteDir, 'pages', 'RegistrationPages.js'));
    const link = page.locator('form#login a.register');
    const href = flat(rel(await link.getAttribute('href')), 300);
    await Promise.all([page.waitForURL(/\/user\/register/), link.click()]);
    const form = new RegisterPage(page);
    await form.form.waitFor({state: 'visible', timeout: 30_000});
    const source = await form.form.locator('input[name="source"]').getAttribute('value').catch(() => null);
    await form.fillIdentity({givenName, familyName, affiliation: 'u69r10', country: 'Canada', email: `${username}@mailinator.com`, username, password: username + username});
    if (await form.privacyConsent.count()) await form.privacyConsent.check();
    await Promise.all([page.waitForURL((u) => !/\/user\/register\?/.test(u.pathname + u.search) || true, {timeout: 30_000}), form.submit()]);
    await page.waitForLoadState('load');
    await sleep(1500);
    const errors = await form.errorLines.allInnerTexts().catch(() => []);
    return {registerLink: href, source, errors, ...(await landed(page))};
}

module.exports = {readLogin, signInHere, registerHere};
