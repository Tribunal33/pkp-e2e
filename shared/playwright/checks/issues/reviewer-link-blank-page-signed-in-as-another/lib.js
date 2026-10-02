// Helper of walk.js here (spec U28, register A10). Requiring this file runs nothing. The screens'
// own helpers (the setting, "Add Reviewer", the mailbox, a link opened signed out) are those of
// ../reviewer-link-dead-after-second-request/lib.js.
const {idle, screen, record, shot, serverLog} = require('../../../probe');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const maskKey = (s) => String(s || '').replace(/^https?:\/\/[^/]+/, '').replace(/(key=)[^&\s]+/g, '$1…');

/**
 * Paste an emailed link into the address bar of a page that is signed in. Returns the answer's
 * status, where it landed, the page's title, headings and text, the server log lines written
 * during the request, and who the page says is signed in afterwards. Never throws on the outcome.
 */
async function openSignedIn(page, app, key, link) {
    const log = serverLog(app);
    const from = log.mark();
    const resp = await page.goto(link).catch((e) => ({error: e.message}));
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    const shown = await screen(page).catch(() => null);
    const body = await page.locator('body').innerText().catch(() => '');
    const html = await page.content().catch(() => '');
    const out = {
        link: maskKey(link),
        status: resp && typeof resp.status === 'function' ? resp.status() : resp && resp.error,
        url: maskKey(page.url()),
        title: await page.title(),
        headings: (await page.getByRole('heading').allInnerTexts().catch(() => [])).map((h) => flat(h, 120)).slice(0, 8),
        bodyLength: body.trim().length,
        htmlLength: html.length,
        body: flat(body, 500),
        saysDifferentUser: /(logged|signed) in as a different user/i.test(body),
        signOutLinks: (await page.getByRole('link', {name: /sign out|log out/i}).allInnerTexts().catch(() => [])).map((t) => flat(t, 60)),
        wizard: /\/reviewer\/submission/.test(page.url()) && (await page.locator('#reviewTabs').count()) > 0,
        signedInAs: await page.evaluate(() => (window.pkp && window.pkp.currentUser && window.pkp.currentUser.username) || null).catch(() => null),
        log: log.since(from).map((l) => flat(maskKey(l), 400)).slice(0, 6),
    };
    record(key, {...out, screen: shown});
    await shot(page, key).catch(() => {});
    return out;
}

/** The username the app's own pages report for this browser's session (null when signed out). */
async function whoAmI(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile`)).catch(() => {});
    await idle(page).catch(() => {});
    if ((await page.locator('form#login').count()) > 0) return null;
    const v = await page.locator('input[name="username"], #username').first().inputValue().catch(() => null);
    return v || (await page.evaluate(() => (window.pkp && window.pkp.currentUser && window.pkp.currentUser.username) || null).catch(() => null));
}

/**
 * When the page a refused link shows offers "Sign out and continue" (a fix under trial brings it),
 * open the link again, press it and return where it lands; null when the page has no such link.
 */
async function signOutAndContinue(page, app, key, link) {
    await page.goto(link).catch(() => {});
    await idle(page).catch(() => {});
    const go = page.getByRole('link', {name: 'Sign out and continue', exact: true});
    if (!(await go.count())) return null;
    await go.click();
    await page.waitForURL(/\/reviewer\/submission|\/login/, {timeout: 30_000}).catch(() => {});
    await idle(page).catch(() => {});
    const out = {
        url: maskKey(page.url()),
        title: await page.title(),
        wizard: /\/reviewer\/submission/.test(page.url()) && (await page.locator('#reviewTabs').count()) > 0,
        signedInAs: await page.evaluate(() => (window.pkp && window.pkp.currentUser && window.pkp.currentUser.username) || null).catch(() => null),
    };
    record(key, {...out, screen: await screen(page).catch(() => null)});
    await shot(page, key).catch(() => {});
    return out;
}

module.exports = {flat, maskKey, openSignedIn, whoAmI, signOutAndContinue};
