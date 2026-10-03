// Helpers of walk.js (issue report docs/issues/U03-A12-password-tab-cancel-does-nothing.md).
// Requiring this file runs nothing. The Profile page object is required inside each function,
// after forEachApp has set the app's environment.
const {idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The tabs of the Profile page, in the order the tab bar shows them. */
const TABS = ['identity', 'contact', 'roles', 'public', 'password', 'notifications', 'apiKey'];

/**
 * Record every browser dialog and answer it as `state.answer` says ('dismiss' = Cancel,
 * 'accept' = OK); a page-leave question is accepted. While this listener is on the page the
 * kit leaves the answer to it (patterns.md "Probe kit").
 */
function dialogRecorder(page) {
    const state = {answer: 'dismiss', seen: []};
    page.on('dialog', async (d) => {
        const entry = {type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : state.answer};
        state.seen.push(entry);
        if (entry.answered === 'accept') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    return state;
}

/** The Profile page by its address (the user menu's "Edit Profile" leads to the same page). */
async function openProfile(app, page, tab = 'identity') {
    const P = require('../../../pages/ProfilePage.js');
    const profile = new P.ProfilePage(page, app.contextPath);
    await profile.goto(tab);
    await idle(page).catch(() => {});
    return profile;
}

/** The tab that is selected now (by the tab bar's aria-selected). */
async function selectedTab(profile) {
    const out = [];
    for (const t of TABS) {
        if ((await profile.tabEntry(t).getAttribute('aria-selected').catch(() => null)) === 'true') out.push(t);
    }
    return out;
}

/**
 * Press a tab as a person does, answering a question as `answer` says, and report the dialogs it
 * raised and the tab selected afterwards. Never throws on a tab that did not open.
 */
async function pressTab(page, profile, dialogs, tab, {answer = 'dismiss'} = {}) {
    const before = dialogs.seen.length;
    dialogs.answer = answer;
    await profile.tabLink(tab).click();
    await sleep(1500);
    await idle(page).catch(() => {});
    await profile.form(tab).waitFor({state: 'visible', timeout: 8000}).catch(() => {});
    dialogs.answer = 'dismiss';
    return {pressed: tab, dialogs: dialogs.seen.slice(before), selected: await selectedTab(profile)};
}

/** The buttons and links under the open tab's form: "Cancel" links and "Save" buttons. */
async function formButtons(profile, tab) {
    const f = profile.form(tab);
    if (!(await f.count())) return {form: false};
    const bar = f.locator('.formButtons');
    return {
        form: true,
        cancel: await f.getByRole('link', {name: 'Cancel', exact: true}).count(),
        cancelHref: await f.locator('a.cancelButton').first().getAttribute('href').catch(() => null),
        save: await f.getByRole('button', {name: 'Save', exact: true}).count(),
        bar: flat(await bar.first().innerText().catch(() => null), 200),
    };
}

/** The Password tab's three boxes as they stand (null when the tab is not loaded). */
async function passwordValues(profile) {
    const f = profile.form('password');
    if (!(await f.isVisible().catch(() => false))) return {open: false};
    const v = async (name) => f.locator(`input[name="${name}"]`).inputValue().catch(() => null);
    return {open: true, oldPassword: await v('oldPassword'), password: await v('password'), password2: await v('password2')};
}

/** Type the three passwords key by key, as a person does; the last box keeps the focus. */
async function typePasswords(profile, current, next) {
    const f = profile.form('password');
    for (const [name, text] of [['oldPassword', current], ['password', next], ['password2', next]]) {
        const box = f.locator(`input[name="${name}"]`);
        await box.click();
        await box.pressSequentially(text);
    }
}

/**
 * Press the Password tab's "Cancel"; what it sent, where the page is and what the tab shows
 * after ({absent: true} when the form has none).
 */
async function pressCancel(page, profile) {
    const f = profile.form('password');
    const cancel = f.getByRole('link', {name: 'Cancel', exact: true});
    if (!(await cancel.count())) return {absent: true};
    const before = page.url();
    const sent = [];
    const on = (r) => sent.push(`${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160)}`);
    page.on('request', on);
    try {
        await cancel.click();
        await sleep(1500);
        await idle(page).catch(() => {});
    } finally {
        page.off('request', on);
    }
    return {
        sent,
        url: page.url(),
        urlChanged: page.url() !== before,
        selected: await selectedTab(profile),
        notice: flat(await profile.inTabNotice('password').innerText().catch(() => null), 300),
    };
}

/** Press the Password tab's "Save" and read the answer: the in-tab notice and the toast. */
async function pressSave(page, profile) {
    await profile.save();
    await sleep(1000);
    return {
        notice: flat(await profile.inTabNotice('password').innerText().catch(() => null), 300),
        toast: flat(await profile.toast.innerText().catch(() => null), 300),
    };
}

module.exports = {sleep, flat, TABS, dialogRecorder, openProfile, selectedTab, pressTab, formButtons, passwordValues, typePasswords, pressCancel, pressSave};
