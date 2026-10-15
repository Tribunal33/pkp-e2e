// Helpers of walk.js (U03 A25). Requiring this file runs nothing. Page objects are required
// inside each function, after forEachApp has set the app's environment (patterns.md "Probe kit").
const path = require('path');
const {idle, screen, shot, record} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const pages = (f) => require(path.join(__dirname, '../../../pages', f));

/** The Profile page object on `contextPath`. */
function profileOf(page, contextPath) {
    const {ProfilePage} = pages('ProfilePage.js');
    return new ProfilePage(page, contextPath);
}

/** Collect the page's uncaught errors and console errors from now on: {list, stop()}. */
function errorWatch(page) {
    const list = [];
    const onErr = (e) => list.push({kind: 'pageerror', text: flat(e.message || String(e), 300)});
    const onCon = (m) => { if (m.type() === 'error') list.push({kind: 'console', text: flat(m.text(), 300)}); };
    page.on('pageerror', onErr);
    page.on('console', onCon);
    return {list, stop: () => { page.off('pageerror', onErr); page.off('console', onCon); }};
}

/**
 * Every request the page sends while `fn` runs (static files left out), each with its answer's
 * status and, for a redirect, its Location; and the redirect chain's end.
 */
async function traffic(page, fn) {
    const seen = [];
    const onReq = (r) => { if (!/\.(js|css|png|svg|gif|woff2?|ico)(\?|$)/.test(r.url())) seen.push(r); };
    page.on('request', onReq);
    try {
        await fn();
    } finally {
        page.off('request', onReq);
    }
    const out = [];
    for (const r of seen) {
        const res = await r.response().catch(() => null);
        const entry = {method: r.method(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 220), status: res ? res.status() : null};
        const h = r.headers();
        entry.accept = (h.accept || '').slice(0, 80);
        if (h['x-requested-with']) entry.xrw = h['x-requested-with'];
        if (res && res.status() >= 300 && res.status() < 400) entry.location = (res.headers().location || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 220);
        if (res) entry.type = (res.headers()['content-type'] || '').slice(0, 60);
        if (r.redirectedFrom()) entry.redirectedFrom = r.redirectedFrom().url().replace(/^https?:\/\/[^/]+/, '').slice(0, 220);
        out.push(entry);
    }
    return out;
}

/** Like traffic(), for every page of the browser context (a link that opens a new tab). */
async function contextTraffic(context, fn) {
    const seen = [];
    const onReq = (r) => { if (!/\.(js|css|png|svg|gif|woff2?|ico)(\?|$)/.test(r.url())) seen.push(r); };
    context.on('request', onReq);
    let value;
    try {
        value = await fn();
    } finally {
        context.off('request', onReq);
    }
    const out = [];
    for (const r of seen) {
        const res = await r.response().catch(() => null);
        const entry = {method: r.method(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 220), status: res ? res.status() : null,
            accept: (r.headers().accept || '').slice(0, 80)};
        if (res && res.status() >= 300 && res.status() < 400) entry.location = (res.headers().location || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 220);
        if (res) entry.type = (res.headers()['content-type'] || '').slice(0, 60);
        out.push(entry);
    }
    return {value, requests: out};
}

/** The top-right notices' text now. */
async function toastNow(page) {
    return flat(await page.locator('.app__notifications').first().innerText().catch(() => ''), 300) || '';
}

/** The Profile tab bar and panel as they stand (bounded reads: the page may be stuck). */
async function profileState(page, profile) {
    const selected = await page.locator('#profileTabs > ul > li[aria-selected="true"] > a').first().innerText({timeout: 2000}).catch(() => null);
    const panel = page.locator('#profileTabs .ui-tabs-panel[aria-hidden="false"]').first();
    return {
        url: page.url(),
        heading: flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null), 120),
        selectedTab: flat(selected, 60),
        panelText: flat(await panel.innerText({timeout: 2000}).catch(() => null), 300),
        panelForms: await panel.locator('form').evaluateAll((fs) => fs.map((f) => f.id)).catch(() => null),
        loginForm: await page.locator('form#login').count().catch(() => null),
        jqueryActive: await page.evaluate(() => (window.jQuery ? window.jQuery.active : null)).catch(() => null),
        toast: await toastNow(page),
    };
}

/** Press a Profile tab and read the page `ms` later without waiting for jQuery (it may never settle). */
async function pressTabBounded(page, profile, tab, ms = 4000) {
    const errs = errorWatch(page);
    const urlBefore = page.url();
    const requests = await traffic(page, async () => {
        await profile.tabLink(tab).click({timeout: 5000});
        await sleep(ms);
    });
    errs.stop();
    return {pressed: tab, urlBefore, requests, errors: errs.list, state: await profileState(page, profile)};
}

/** Type the Password tab's three boxes as a person types and press "Save"; the answer and the notice. */
async function changePassword(page, profile, current, next) {
    const f = profile.form('password');
    for (const [name, text] of [['oldPassword', current], ['password', next], ['password2', next]]) {
        const box = f.locator(`input[name="${name}"]`);
        await box.click();
        await box.pressSequentially(text, {delay: 5});
    }
    const requests = await traffic(page, async () => {
        const answered = page.waitForResponse((r) => /profile-tab\/save-password/.test(r.url()), {timeout: 15000}).catch(() => null);
        await profile.saveButton().click();
        await answered;
        await idle(page).catch(() => {});
    });
    const seen = new Set();
    for (let i = 0; i < 8; i++) { const t = await toastNow(page); if (t) seen.add(t); await sleep(200); }
    return {requests, toasts: [...seen]};
}

/** screen() + PNG under `name`, bounded: a stuck page still gets its PNG. */
async function snap(page, name, ms = 40000) {
    let s = null;
    try {
        s = await Promise.race([screen(page), sleep(ms).then(() => null)]);
    } catch (e) {
        s = {error: flat(String(e), 200)};
    }
    if (s) record(name, s);
    await shot(page, name).catch(() => {});
    return s ? {file: name, url: s.url, notices: s.notices} : {file: name, timedOut: true};
}

module.exports = {sleep, flat, profileOf, errorWatch, traffic, contextTraffic, toastNow, profileState, pressTabBounded, changePassword, snap};
