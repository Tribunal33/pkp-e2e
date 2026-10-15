// Helpers of walk.js (U03 A26). Requiring this file runs nothing. Page objects are required
// inside each function, after forEachApp has set the app's environment (patterns.md "Probe kit").
const path = require('path');
const {idle, screen, shot, record} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 220);

/** The Profile page object on `contextPath`. */
function profileOf(page, contextPath) {
    const {ProfilePage} = require(path.join(__dirname, '../../../pages', 'ProfilePage.js'));
    return new ProfilePage(page, contextPath);
}

/**
 * Every browser dialog of `page` from now on, answered as a person would (`accept`: OK), with
 * its text; and the page's uncaught errors. {dialogs, errors, stop()}.
 */
function watch(page) {
    const dialogs = [];
    const errors = [];
    const onDialog = (d) => { dialogs.push({type: d.type(), message: flat(d.message(), 300)}); d.accept().catch(() => {}); };
    const onErr = (e) => errors.push({kind: 'pageerror', text: flat(e.message || String(e), 300)});
    const onCon = (m) => { if (m.type() === 'error') errors.push({kind: 'console', text: flat(m.text(), 300)}); };
    page.on('dialog', onDialog);
    page.on('pageerror', onErr);
    page.on('console', onCon);
    return {dialogs, errors, stop: () => { page.off('dialog', onDialog); page.off('pageerror', onErr); page.off('console', onCon); }};
}

/** The component and login requests `page` sends while `fn` runs, each with its answer. */
async function traffic(page, fn) {
    const seen = [];
    const onReq = (r) => { if (/\$\$\$call\$\$\$|\/login|\/api\//.test(r.url())) seen.push(r); };
    page.on('request', onReq);
    try {
        await fn();
    } finally {
        page.off('request', onReq);
    }
    const out = [];
    for (const r of seen) {
        const res = await r.response().catch(() => null);
        const entry = {method: r.method(), url: strip(r.url()), status: res ? res.status() : null};
        if (res) entry.type = (res.headers()['content-type'] || '').slice(0, 60);
        if (res && res.status() >= 300 && res.status() < 400) entry.location = strip(res.headers().location);
        if (res && /json/.test(entry.type || '')) entry.body = flat(await res.text().catch(() => null), 300);
        out.push(entry);
    }
    return out;
}

/** The Profile tab bar and visible panel as they stand (bounded reads: the page may be stuck). */
async function profileState(page) {
    const panel = page.locator('#profileTabs .ui-tabs-panel[aria-hidden="false"]').first();
    return {
        url: strip(page.url()),
        selectedTab: flat(await page.locator('#profileTabs > ul > li[aria-selected="true"] > a').first().innerText({timeout: 2000}).catch(() => null), 60),
        panelText: flat(await panel.innerText({timeout: 2000}).catch(() => null), 300),
        panelForms: await panel.locator('form').evaluateAll((fs) => fs.map((f) => f.id)).catch(() => null),
        initials: await page.locator('input[name="preferredAvatarInitials"]').first().inputValue({timeout: 1000}).catch(() => null),
        loginForm: await page.locator('form#login').count().catch(() => null),
        notices: flat(await page.locator('.app__notifications').first().innerText({timeout: 1000}).catch(() => ''), 300),
    };
}

/** Run a press (`fn`) on `page`, wait `ms`, and return its requests, dialogs, errors and the state after. */
async function press(page, fn, ms = 4000) {
    const w = watch(page);
    const requests = await traffic(page, async () => {
        await fn();
        await sleep(ms);
    });
    w.stop();
    return {requests, dialogs: w.dialogs, errors: w.errors, state: await profileState(page)};
}

/** Type the Password tab's three boxes as a person types and press "Save"; the notice shown. */
async function changePassword(page, profile, current, next) {
    const f = profile.form('password');
    for (const [name, text] of [['oldPassword', current], ['password', next], ['password2', next]]) {
        const box = f.locator(`input[name="${name}"]`);
        await box.click();
        await box.pressSequentially(text, {delay: 5});
    }
    const answered = page.waitForResponse((r) => /profile-tab\/save-password/.test(r.url()), {timeout: 15000}).catch(() => null);
    await profile.saveButton().click();
    const res = await answered;
    await idle(page).catch(() => {});
    let notice = '';
    for (let i = 0; i < 10 && !notice; i++) {
        notice = flat(await page.locator('.app__notifications').first().innerText().catch(() => ''), 200);
        if (!notice) await sleep(200);
    }
    return {status: res ? res.status() : null, notice};
}

/** screen() + PNG under `name`, bounded: a stuck page still gets its PNG. */
async function snap(page, name, ms = 15000) {
    let s = null;
    try {
        s = await Promise.race([screen(page), sleep(ms).then(() => null)]);
    } catch (e) {
        s = {error: flat(String(e), 200)};
    }
    if (s) record(name, s);
    await shot(page, name).catch(() => {});
    return s ? name : `${name} (screen() timed out; PNG only)`;
}

module.exports = {sleep, flat, strip, profileOf, watch, traffic, profileState, press, changePassword, snap};
