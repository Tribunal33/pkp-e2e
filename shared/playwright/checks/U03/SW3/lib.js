// Helpers of sw3.js (U03 drift sweep SW3: Password, Notifications, API Key, side effects).
// Requiring this file runs nothing. Page objects are required inside each function, after
// forEachApp has set the app's environment (patterns.md "Probe kit").
const path = require('path');
const {idle, screen, shot, record} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 800) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const pages = (f) => require(path.join(__dirname, '../../../pages', f));

/**
 * Record every browser dialog and answer it as `state.answer` says ('dismiss' = Cancel,
 * 'accept' = OK); a page-leave question is accepted. While this listener is on the page the kit
 * leaves the answer to it.
 */
function dialogRecorder(page) {
    const state = {answer: 'dismiss', seen: []};
    page.on('dialog', async (d) => {
        const entry = {type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : state.answer, at: Date.now()};
        state.seen.push(entry);
        if (entry.answered === 'accept') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    return state;
}

/** Every request the page sends while `fn` runs, as {method, url}; and the answers' statuses. */
async function traffic(page, fn, {filter = /\$\$\$call\$\$\$|\/api\/v1\/|profile|login/} = {}) {
    const seen = [];
    const onReq = (r) => {
        if (filter.test(r.url()) && !/\.(js|css|png|svg|woff2?)(\?|$)/.test(r.url())) seen.push(r);
    };
    page.on('request', onReq);
    let value;
    try {
        value = await fn();
    } finally {
        page.off('request', onReq);
    }
    const out = [];
    for (const r of seen) {
        const res = await r.response().catch(() => null);
        out.push({method: r.method(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 200), status: res ? res.status() : null});
    }
    return {value, requests: out};
}

/** The top-right page notices' text right now (`.app__notifications`). */
async function toastNow(page) {
    return flat(await page.locator('.app__notifications').first().innerText().catch(() => ''), 400) || '';
}

/** Poll the top-right notices for `ms`, collecting each distinct text seen. */
async function watchToasts(page, ms = 3000) {
    const seen = new Set();
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
        const t = await toastNow(page);
        if (t) seen.add(t);
        await sleep(200);
    }
    return [...seen];
}

/** Snapshot: the kit's screen() into `<name>`, plus a PNG. */
async function snap(page, name) {
    const s = await screen(page);
    record(name, s);
    await shot(page, name).catch(() => {});
    return {file: name, notices: s.notices, url: s.url};
}

/** The Profile page by its address, on the named tab. */
async function openProfile(page, contextPath, tab = 'identity') {
    const {ProfilePage} = pages('ProfilePage.js');
    const profile = new ProfilePage(page, contextPath);
    await profile.goto(tab);
    await idle(page).catch(() => {});
    return profile;
}

/** Press a tab in the tab bar, answering any question as `answer` says; the dialogs it raised. */
async function pressTab(page, profile, dialogs, tab, {answer = 'dismiss', wait = true} = {}) {
    const before = dialogs.seen.length;
    dialogs.answer = answer;
    await profile.tabLink(tab).click();
    await sleep(1200);
    if (wait) {
        await idle(page).catch(() => {});
        await profile.form(tab).waitFor({state: 'visible', timeout: 8000}).catch(() => {});
    }
    dialogs.answer = 'dismiss';
    return {pressed: tab, dialogs: dialogs.seen.slice(before).map((d) => ({type: d.type, message: d.message, answered: d.answered})),
        selected: await profile.tabEntry(tab).getAttribute('aria-selected').catch(() => null)};
}

/** The Password tab as it stands. */
async function passwordState(profile) {
    const f = profile.form('password');
    if (!(await f.isVisible().catch(() => false))) return {open: false};
    const v = async (name) => f.locator(`input[name="${name}"]`).inputValue().catch(() => null);
    const sub = f.locator('label.sub_label[for^="password-"], label[for^="password-"].error').first();
    const notice = f.locator('.pkp_notification');
    return {
        open: true,
        oldPassword: await v('oldPassword'), password: await v('password'), password2: await v('password2'),
        notice: (await notice.count()) ? flat(await notice.first().innerText().catch(() => null), 500) : null,
        noticeVisible: await notice.first().isVisible().catch(() => false),
        newPasswordLine: {text: flat(await sub.innerText().catch(() => null), 200), visible: await sub.isVisible().catch(() => null),
            class: await sub.getAttribute('class').catch(() => null)},
        subLabels: await f.locator('label.sub_label, label.error').evaluateAll((ls) => ls.map((l) => ({for: l.getAttribute('for'), cls: l.className, text: l.textContent.replace(/\s+/g, ' ').trim()}))).catch(() => null),
    };
}

/** Type the three passwords key by key into empty boxes (maxlength honoured, as a person types). */
async function typePasswords(profile, current, next, repeat = next) {
    const f = profile.form('password');
    for (const [name, text] of [['oldPassword', current], ['password', next], ['password2', repeat]]) {
        const box = f.locator(`input[name="${name}"]`);
        await box.click();
        if (await box.inputValue()) {
            await box.press('ControlOrMeta+a');
            await box.press('Backspace');
        }
        if (text) await box.pressSequentially(text, {delay: 5});
    }
}

/** Press the Password tab's "Save" and read the tab right after the answer. */
async function savePassword(page, profile) {
    const t0 = Date.now();
    const {requests} = await traffic(page, async () => {
        const answered = page.waitForResponse((r) => /profile-tab\/save-/.test(r.url()), {timeout: 6000}).catch(() => null);
        await profile.saveButton().click();
        await answered;
        await idle(page).catch(() => {});
    }, {filter: /profile-tab\/save-/});
    const toasts = await watchToasts(page, 1500);
    return {requests, toasts, ms: Date.now() - t0, state: await passwordState(profile)};
}

/** Sample the Password tab's error notice for `ms`: [{t, present, visible, opacity}]. */
async function sampleNotice(profile, ms, t0 = Date.now()) {
    const out = [];
    const n = profile.form('password').locator('.pkp_notification');
    while (Date.now() - t0 < ms) {
        const present = await n.count().catch(() => 0);
        const visible = present ? await n.first().isVisible().catch(() => false) : false;
        const opacity = present ? await n.first().evaluate((e) => getComputedStyle(e).opacity).catch(() => null) : null;
        out.push({t: Date.now() - t0, present, visible, opacity});
        await sleep(400);
    }
    return out;
}

/** The Notifications tab as data: groups with rows, each row's two boxes. */
async function notificationsState(profile) {
    const f = profile.form('notifications');
    if (!(await f.isVisible().catch(() => false))) return {open: false};
    return f.evaluate((form) => {
        const groups = [];
        for (const node of form.querySelectorAll('#notificationSettings > h4, #notificationSettings > .section')) {
            if (node.tagName === 'H4') {
                groups.push({group: node.textContent.trim(), rows: []});
                continue;
            }
            const label = node.querySelector('ul.checkbox_and_radiobutton > label');
            const boxes = [...node.querySelectorAll('input[type=checkbox]')].map((b) => ({
                id: b.id, name: b.name, checked: b.checked, disabled: b.disabled,
                label: (b.closest('li') || b.parentElement).textContent.replace(/\s+/g, ' ').trim(),
            }));
            if (groups.length) groups[groups.length - 1].rows.push({sentence: label ? label.textContent.trim() : null, boxes});
        }
        const intro = form.querySelector('p');
        return {
            open: true,
            intro: intro ? intro.textContent.replace(/\s+/g, ' ').trim() : null,
            groups,
            buttons: [...form.querySelectorAll('button, a.cancelButton, input[type=submit]')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
        };
    });
}

/** The API Key tab as it stands. */
async function apiKeyState(profile) {
    const f = profile.form('apiKey');
    if (!(await f.isVisible().catch(() => false))) return {open: false};
    const box = profile.apiKeyBox();
    const geo = await box.evaluate((b) => ({readOnly: b.readOnly, disabled: b.disabled, scrollWidth: b.scrollWidth, clientWidth: b.clientWidth, value: b.value})).catch(() => null);
    return {
        open: true,
        value: geo ? geo.value : null,
        length: geo && geo.value ? geo.value.length : 0,
        readOnly: geo ? geo.readOnly : null,
        overflow: geo ? geo.scrollWidth > geo.clientWidth : null,
        widths: geo ? [geo.scrollWidth, geo.clientWidth] : null,
        buttons: await f.locator('button').allInnerTexts().then((a) => a.map((t) => flat(t))).catch(() => null),
        note: flat(await f.innerText().catch(() => null), 900),
        inTab: flat(await profile.inTabNotice('apiKey').innerText().catch(() => null), 300),
    };
}

/** Common bits of any tab: the required legend, the privacy sentence, the buttons and links at the foot. */
async function tabFoot(profile, tab) {
    const f = profile.form(tab);
    return {
        legend: await f.getByText('Required fields are marked with an asterisk: *').count().catch(() => null),
        privacy: flat(await f.getByText('Your data is stored in accordance with our').first().innerText().catch(() => null), 200),
        buttons: await f.locator('button:visible').allInnerTexts().then((a) => a.map((t) => flat(t))).catch(() => null),
        links: await f.locator('a:visible').evaluateAll((as) => as.map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'), cls: a.className}))).catch(() => null),
    };
}

/** A fresh REST read with an API token (no cookies): status and the start of the body. */
async function restWith(app, contextPath, token, {how = 'bearer', endpoint = 'submissions'} = {}) {
    const {request} = require('@playwright/test');
    const ctx = await request.newContext({baseURL: app.baseURL, storageState: {cookies: [], origins: []}});
    try {
        let url = `/index.php/${contextPath}/api/v1/${endpoint}`;
        const headers = {};
        if (token && how === 'bearer') headers.Authorization = `Bearer ${token}`;
        if (token && how === 'param') url += `${url.includes('?') ? '&' : '?'}apiToken=${encodeURIComponent(token)}`;
        const res = await ctx.get(url, {headers, maxRedirects: 0});
        const body = flat(await res.text().catch(() => ''), 240);
        return {how: token ? how : 'none', endpoint, status: res.status(), body};
    } finally {
        await ctx.dispose();
    }
}

/** The newest message to `to` matching `subject`, in full (text, from, to). */
async function fullMail(app, {to, subject, since, timeoutMs = 25_000}) {
    const summary = await app.mail.find({to, subject, since, timeoutMs});
    const full = await app.mail.fullMessage(summary.ID);
    return {
        id: summary.ID,
        subject: full.Subject,
        from: full.From,
        to: full.To,
        text: full.Text,
        html: full.HTML,
    };
}

/** A legacy sign-in on a context's Login page typed by keyboard (maxlength honoured). */
async function typedSignIn(page, app, contextPath, username, password) {
    await page.goto(`/index.php/${contextPath}/en/login`);
    const user = page.locator('input#username, input[name="username"]').first();
    const pw = page.locator('input#password, input[name="password"]').first();
    await user.fill(username);
    await pw.click();
    await pw.pressSequentially(password, {delay: 5});
    const typedLength = (await pw.inputValue()).length;
    await page.locator('form#login button[type="submit"]').first().click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await sleep(1500);
    const url = page.url();
    const error = /Invalid username\/email or password/.test(await page.locator('body').innerText().catch(() => '')) ? 'Invalid username/email or password. Please try again.' : null;
    return {typedLength, url, signedIn: !/\/login/.test(url), error};
}

/** Sign in through the form with maxlength removed (the full string sent). */
async function fullSignIn(page, contextPath, username, password) {
    await page.goto(`/index.php/${contextPath}/en/login`);
    await page.locator('input[name="username"]').first().fill(username);
    const pw = page.locator('input[name="password"]').first();
    await pw.evaluate((el) => el.removeAttribute('maxlength'));
    await pw.fill(password);
    await page.locator('form#login button[type="submit"]').first().click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await sleep(1500);
    const url = page.url();
    const error = /Invalid username\/email or password/.test(await page.locator('body').innerText().catch(() => '')) ? 'Invalid username/email or password. Please try again.' : null;
    return {sentLength: password.length, url, signedIn: !/\/login/.test(url), error};
}

/** The Users & Roles row of an account, as a manager of the context reads it. */
async function usersRolesRow(page, contextPath, username) {
    await page.goto(`/index.php/${contextPath}/en/management/settings/access`);
    const search = page.getByRole('searchbox').first();
    await search.waitFor({state: 'visible', timeout: 30_000});
    await search.fill(username);
    await search.press('Enter');
    await sleep(2000);
    await idle(page).catch(() => {});
    const rows = page.getByRole('row').filter({hasText: username});
    const n = await rows.count();
    return {count: n, text: n ? flat(await rows.first().innerText().catch(() => null), 400) : null};
}

/** The public masthead's text. */
async function mastheadText(page, contextPath) {
    const res = await page.goto(`/index.php/${contextPath}/en/about/editorialMasthead`);
    await idle(page).catch(() => {});
    return {status: res ? res.status() : null, text: flat(await page.locator('body').innerText().catch(() => null), 4000)};
}

/** The submission's Activity Log lines, as a manager reads them. */
async function activityLines(page, contextPath, submissionId) {
    const {WorkflowPage} = pages('WorkflowPage.js');
    const {ActivityLogWindow} = pages('ActivityLogPages.js');
    const frame = new WorkflowPage(page, contextPath);
    await frame.gotoEditorial(submissionId);
    const w = new ActivityLogWindow(page, frame);
    await w.open();
    await w.expectHistoryLoaded().catch(() => {});
    const lines = (await w.historyLines()).map((l) => `${l.user} | ${l.event}`);
    await w.close().catch(() => {});
    return lines;
}

module.exports = {
    sleep, flat, pages, dialogRecorder, traffic, toastNow, watchToasts, snap, openProfile, pressTab,
    passwordState, typePasswords, savePassword, sampleNotice, notificationsState, apiKeyState, tabFoot,
    restWith, fullMail, typedSignIn, fullSignIn, usersRolesRow, mastheadText, activityLines,
};
