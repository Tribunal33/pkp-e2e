// Helpers for walk.js beside this file (U60 A8). Requiring this file runs nothing.
// main and 3.5 page addresses carry the locale; 3.4 and 3.3 are read in the code, not walked.
const urlLocaleOf = () => '/en';

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/** A dataset user's password: the username twice, `admin` for the administrator (dataset.md). */
const passwordOf = (username) => (username === 'admin' ? 'admin' : username + username);

/**
 * Signed out, open a Login page (`index` for the site's, a context path for that context's), sign in
 * there as a dataset user, and return the redirects the sign-in followed and the page it landed on.
 * Never throws: an error comes back in `error`.
 */
async function signInOn(page, app, where, username) {
    const out = {loginPage: `/index.php/${where}${urlLocaleOf()}/login`, username};
    const chain = [];
    const on = (r) => {
        if (r.request().isNavigationRequest() && r.status() >= 300 && r.status() < 400) {
            chain.push(`${r.request().method()} ${flat(rel(r.url()), 200)} -> ${r.status()} ${flat(rel(r.headers().location), 200)}`);
        }
    };
    try {
        await page.goto(app.url(out.loginPage));
        await page.waitForLoadState('load');
        out.loginPageUrl = flat(rel(page.url()), 200);
        out.source = await page.locator('form#login input[name="source"]').getAttribute('value').catch(() => null);
        page.on('response', on);
        await page.locator('input#username').fill(username);
        await page.locator('input#password').fill(passwordOf(username));
        await Promise.all([
            page.waitForURL((u) => !/\/login(\/signIn)?(\?|$)/.test(u.pathname + u.search), {timeout: 30_000}),
            page.locator('form#login button[type="submit"]').click(),
        ]);
        await page.waitForLoadState('load');
        await page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => {});
        out.redirects = chain.slice();
        out.landed = flat(rel(page.url()), 200);
        out.title = await page.title();
        out.heading = flat(await page.locator('main h1, h1').first().innerText({timeout: 5000}).catch(() => null), 120);
    } catch (e) {
        out.redirects = chain.slice();
        out.error = flat(e.message, 300);
        out.landed = flat(rel(page.url()), 200);
    } finally {
        page.off('response', on);
    }
    return out;
}

/**
 * Administration › "Site Settings" › "Site Setup" › "Settings": choose the redirect by the entry's
 * label ('' for the blank one), "Site Name" filled when it is empty and one is given, and "Save"; the answer's status and the entry read back after a reload.
 */
async function setRedirect(page, label, {siteName} = {}) {
    const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
    const site = new SiteSettingsPage(page);
    const out = {asked: label};
    try {
        await site.gotoFromAdministration();
        const form = await site.settings();
        out.choices = await form.redirectChoices();
        // The dataset's site has no "Site Name", which the form requires before it saves.
        if (siteName) {
            out.siteNameBefore = await form.siteName('en').inputValue();
            if (!out.siteNameBefore) await form.siteName('en').fill(siteName);
        }
        await form.redirect.selectOption({label});
        const r = await form.pressSave();
        out.status = r.status();
        await site.reload();
        out.chosenAfterReload = await (await site.settings()).redirectChosen();
    } catch (e) {
        out.error = flat(e.message, 300);
    }
    return out;
}

module.exports = {flat, rel, passwordOf, signInOn, setRedirect};
