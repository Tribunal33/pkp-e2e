// Helpers of walk.js (U03 A11, A15 walk; no report written, 2026-10-03).
// Requiring this file runs nothing. The Profile page object is required inside each function,
// after forEachApp has set the app's environment.
const {idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Record every browser dialog and answer it as `state.answer` says ('dismiss' = Cancel,
 * 'accept' = OK); a page-leave question is accepted. While this listener is on the page the kit
 * leaves the answer to it (patterns.md "Probe kit").
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

/** The Profile page by its address, on the named tab. */
async function openProfile(app, page, tab = 'identity') {
    const P = require('../../../pages/ProfilePage.js');
    const profile = new P.ProfilePage(page, app.contextPath);
    await profile.goto(tab);
    await idle(page).catch(() => {});
    return profile;
}

/** Press a tab in the tab bar, answering a question as `answer` says; the dialogs it raised. */
async function pressTab(page, profile, dialogs, tab, {answer = 'dismiss'} = {}) {
    const before = dialogs.seen.length;
    dialogs.answer = answer;
    await profile.tabLink(tab).click();
    await sleep(1500);
    await idle(page).catch(() => {});
    await profile.form(tab).waitFor({state: 'visible', timeout: 8000}).catch(() => {});
    dialogs.answer = 'dismiss';
    return {pressed: tab, dialogs: dialogs.seen.slice(before)};
}

/** Replace a box's text as a person does: click, select all, type key by key. */
async function retype(box, text) {
    await box.click();
    await box.press('ControlOrMeta+a');
    await box.pressSequentially(text);
}

/**
 * Press the visible tab's "Save" and report what it sent and what came back: the save POSTs and
 * their status, the toast, and the tab's in-place notice. Never throws when nothing is sent.
 */
async function pressSave(page, profile, tab) {
    const sent = [];
    const onReq = (r) => {
        if (r.method() === 'POST' && /\/profile-tab\/save-/.test(r.url())) sent.push(r);
    };
    page.on('request', onReq);
    let toast = null;
    const t0 = Date.now();
    try {
        await profile.saveButton().click();
        // read the toast while it is up (it expires)
        while (Date.now() - t0 < 4000) {
            const txt = flat(await profile.toast.innerText().catch(() => null), 300);
            if (txt) { toast = txt; }
            await sleep(250);
        }
        await idle(page).catch(() => {});
    } finally {
        page.off('request', onReq);
    }
    const posts = [];
    for (const r of sent) {
        const res = await r.response().catch(() => null);
        posts.push({url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160), status: res ? res.status() : null,
            body: res ? flat(await res.text().catch(() => null), 300) : null});
    }
    return {posts, toast, inTabNotice: flat(await profile.inTabNotice(tab).innerText().catch(() => null), 400)};
}

/**
 * The Public tab's homepage box and every error label in the form: text, whether it is shown,
 * and how it is tied to the box (its `for` and `id`, the box's `id` and `aria-describedby`).
 */
async function homepageState(profile) {
    const f = profile.form('public');
    if (!(await f.isVisible().catch(() => false))) return {open: false};
    const box = profile.homepage();
    const labels = [];
    for (const l of await f.locator('label.error').all()) {
        labels.push({text: flat(await l.innerText().catch(() => null), 200), visible: await l.isVisible().catch(() => null),
            for: await l.getAttribute('for').catch(() => null), id: await l.getAttribute('id').catch(() => null)});
    }
    return {
        open: true,
        value: await box.inputValue().catch(() => null),
        boxId: await box.getAttribute('id').catch(() => null),
        describedBy: await box.getAttribute('aria-describedby').catch(() => null),
        errorLabels: labels,
        sentenceShown: await profile.fieldError('Please enter a valid URL.').isVisible().catch(() => false),
    };
}

/** The Password tab as it stands: the boxes, the in-tab notice and the line under "New password". */
async function passwordState(profile) {
    const f = profile.form('password');
    if (!(await f.isVisible().catch(() => false))) return {open: false};
    const v = async (name) => f.locator(`input[name="${name}"]`).inputValue().catch(() => null);
    const sub = f.locator('label.sub_label[for^="password-"]').first();
    return {
        open: true,
        oldPassword: await v('oldPassword'), password: await v('password'), password2: await v('password2'),
        notice: flat(await profile.inTabNotice('password').innerText().catch(() => null), 400),
        errorNotice: await profile.passwordErrorNotice().isVisible().catch(() => false),
        newPasswordLine: {text: flat(await sub.innerText().catch(() => null), 200), visible: await sub.isVisible().catch(() => null),
            class: await sub.getAttribute('class').catch(() => null)},
    };
}

/** Type the three passwords key by key, as a person does. */
async function typePasswords(profile, current, next, repeat = next) {
    const f = profile.form('password');
    for (const [name, text] of [['oldPassword', current], ['password', next], ['password2', repeat]]) {
        const box = f.locator(`input[name="${name}"]`);
        await box.click();
        await box.pressSequentially(text);
    }
}

module.exports = {sleep, flat, dialogRecorder, openProfile, pressTab, retype, pressSave, homepageState, passwordState, typePasswords};
