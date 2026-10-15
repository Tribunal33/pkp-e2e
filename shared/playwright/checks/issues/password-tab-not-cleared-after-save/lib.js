// Helpers of walk.js (U03 A11: the Password tab is not cleared after a successful change).
// Requiring this file runs nothing. The Profile page object is required inside each function,
// after forEachApp has set the app's environment.
const {idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The Profile page by its address (its first tab), then a press on the "Password" tab. */
async function openPasswordTab(app, page) {
    const P = require('../../../pages/ProfilePage.js');
    const profile = new P.ProfilePage(page, app.contextPath);
    await profile.goto('identity');
    await idle(page).catch(() => {});
    await profile.tabLink('password').click();
    await profile.form('password').waitFor({state: 'visible', timeout: 15000});
    await idle(page).catch(() => {});
    return profile;
}

/** Type the three passwords key by key, as a person does. */
async function typePasswords(profile, current, next, repeat = next) {
    for (const [box, text] of [[profile.currentPassword(), current], [profile.newPassword(), next], [profile.repeatPassword(), repeat]]) {
        await box.click();
        await box.pressSequentially(text);
    }
}

/**
 * The Password tab as it stands: the three boxes, the in-tab notice (text, whether shown), the line
 * under "New password" (text, shown, class) and the hint wherever it shows, and the toast.
 */
async function passwordState(page, profile) {
    const f = profile.form('password');
    if (!(await f.isVisible().catch(() => false))) return {open: false};
    const v = async (box) => box.inputValue().catch(() => null);
    const sub = f.locator('label.sub_label[for^="password-"]').first();
    const notice = profile.inTabNotice('password');
    return {
        open: true,
        current: await v(profile.currentPassword()),
        newPassword: await v(profile.newPassword()),
        repeat: await v(profile.repeatPassword()),
        notice: {text: flat(await notice.innerText().catch(() => null)), visible: await profile.passwordErrorNotice().isVisible().catch(() => false)},
        newPasswordLine: {text: flat(await sub.innerText().catch(() => null), 200), visible: await sub.isVisible().catch(() => null),
            class: await sub.getAttribute('class').catch(() => null)},
        hintShown: await f.getByText(/The password must be at least \d+ characters\./).first().isVisible().catch(() => false),
        toast: flat(await profile.toast.innerText().catch(() => null), 200),
    };
}

/**
 * Press "Save" and read the tab when the answer has arrived (about half a second later), then again
 * `laterMs` after the press. Returns the POST's status and body head, both reads and timings.
 * Never throws when nothing is sent.
 */
async function saveAndRead(page, profile, {laterMs = 8000} = {}) {
    const t0 = Date.now();
    const answer = page.waitForResponse((r) => r.request().method() === 'POST' && /\/profile-tab\/save-password/.test(r.url()), {timeout: 20000})
        .catch(() => null);
    await profile.saveButton().click();
    const res = await answer;
    const tAnswer = Date.now() - t0;
    await sleep(500);
    await idle(page).catch(() => {});
    const atAnswer = await passwordState(page, profile);
    const rest = laterMs - (Date.now() - t0);
    if (rest > 0) await sleep(rest);
    const later = await passwordState(page, profile);
    let body = null;
    if (res) body = flat(await res.text().catch(() => null), 200);
    return {post: res ? {status: res.status(), body} : null, answeredAfterMs: tAnswer, atAnswer, laterAfterMs: Date.now() - t0, later};
}

module.exports = {sleep, flat, openPasswordTab, typePasswords, passwordState, saveAndRead};
