// Helpers of walk.js here (issue report docs/issues/U03-A7-password-boxes-keep-32-characters.md).
// Requiring this file runs nothing. Every helper drives the screens as a person does: typing into a
// password box key by key (so the box's own limit applies, as it does to a person), the Login page,
// "Forgot your password?" and the reset email's link, and Profile > "Password". The invitation
// wizard's helpers come from the U06 A4 walk (../newcomer-not-signed-in-after-accepting/lib.js).
const {idle, screen} = require('../../../probe');
const U06 = require('../newcomer-not-signed-in-after-accepting/lib.js');

const T = 30_000;

/** The password the steps choose: 40 characters; the boxes keep the first 32. */
const PASSWORD = 'u03rbu03rb-correct-horse-battery-staple!';
const FIRST32 = PASSWORD.slice(0, 32);

/** The newcomer the steps invite (names tagged u03rb). */
const NEWCOMER = {
    email: 'u03rb@mailinator.com',
    givenName: 'Lena',
    familyName: 'Long',
    username: 'u03rb',
    country: 'Canada',
};

/** Type `text` key by key into `box`; what the box then holds and the limit it carries. */
async function typeInto(box, text) {
    await box.click();
    await box.press('ControlOrMeta+a');
    await box.press('Delete');
    await box.pressSequentially(text);
    const value = await box.inputValue();
    return {typed: text.length, kept: value.length, keptIsPrefix: text.startsWith(value), maxlength: await box.getAttribute('maxlength')};
}

/** The accept wizard's "Create … account" and "Enter details" steps with the long password. */
async function newcomerSteps(page) {
    const met = [];
    await page.getByLabel(/^Username/).fill(NEWCOMER.username);
    const box = await typeInto(page.getByLabel(/^Password/), PASSWORD);
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', {name: 'Save and continue'}).click();
    await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
    await idle(page);
    met.push(await U06.stepHeading(page));
    await page.getByLabel(/^Country/).first().selectOption({label: NEWCOMER.country});
    await page.getByRole('button', {name: 'Save and continue'}).click();
    await page.getByRole('heading', {name: /Review & create account/}).waitFor({timeout: T});
    await idle(page);
    met.push(await U06.stepHeading(page));
    return {met, box};
}

/** The page's form error and notices, as shown. */
async function errorsShown(page) {
    const text = await page.locator('body').innerText().catch(() => '');
    return text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /invalid|incorrect|error|must be|do not match|same as/i.test(l));
}

/**
 * On the Login page the browser shows now: type the username and, key by key, the password; press
 * "Login". Returns what the password box held, where the browser went and what it said.
 */
async function login(page, username, password) {
    const form = page.locator('form#login');
    await form.locator('input#username').fill(username);
    const box = await typeInto(form.locator('input#password'), password);
    await Promise.all([page.waitForLoadState('load').catch(() => {}), form.getByRole('button', {name: 'Login', exact: true}).click()]);
    await page.waitForLoadState('load').catch(() => {});
    await idle(page);
    const at = await U06.where(page);
    return {box, errors: await errorsShown(page), at, signedIn: !at.loginForm && !/\/login(\b|\?|$)/.test(at.url)};
}

/** The reset link of the newest password-reset email to `email` since `since` pointing at this install. */
async function resetLink(app, email, since) {
    const origin = new URL(app.baseURL).origin;
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        const result = await app.mail._search({to: email, since});
        for (const m of result.messages || []) {
            const full = await app.mail.fullMessage(m.ID);
            const body = `${full.HTML || ''}\n${full.Text || ''}`;
            const found = body.match(/(https?:\/\/[^\s'"<>]*\/login\/resetPassword\/[^\s'"<>]+)/i);
            const link = found ? found[1].replace(/&amp;/g, '&') : null;
            if (link && link.startsWith(origin)) return {subject: full.Subject, link};
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    return {subject: null, link: null};
}

/** From the Login page: "Forgot your password?", the address, "Reset Password". Returns the page's answer. */
async function requestReset(page, email) {
    await page.getByRole('link', {name: 'Forgot your password?'}).click();
    await page.locator('input#email').waitFor({timeout: T});
    await page.locator('input#email').fill(email);
    await Promise.all([page.waitForLoadState('load').catch(() => {}), page.getByRole('button', {name: 'Reset Password'}).click()]);
    await idle(page);
    return (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 400);
}

/** On the reset link's "Reset Password" form: type the password into both boxes and press "Save". */
async function resetTo(page, link, password) {
    await page.goto(link);
    const form = page.locator('form#updateResetPassword');
    await form.waitFor({timeout: T});
    await idle(page);
    const out = {heading: (await page.locator('main h1').first().innerText().catch(() => null))};
    out.newBox = await typeInto(form.locator('input[name="password"]'), password);
    out.repeatBox = await typeInto(form.locator('input[name="password2"]'), password);
    await Promise.all([page.waitForLoadState('load').catch(() => {}), form.getByRole('button', {name: 'Save', exact: true}).click()]);
    await page.waitForLoadState('load').catch(() => {});
    await idle(page);
    out.answer = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 400);
    return out;
}

/** Profile > "Password": the three boxes, each typed `password` key by key (nothing saved). */
async function profilePasswordBoxes(page, app, password) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile/changePassword`));
    const form = page.locator('form#changePasswordForm');
    await form.waitFor({timeout: T});
    await idle(page);
    const out = {};
    for (const name of ['oldPassword', 'password', 'password2']) {
        out[name] = await typeInto(form.locator(`input[name="${name}"]`), password);
    }
    out.labels = (await form.innerText()).split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 12);
    return out;
}

/**
 * Profile > "Password": type `current` and `next` (twice) and press "Save"; the tab's answer.
 */
async function profileSave(page, app, current, next) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile/changePassword`));
    const form = page.locator('form#changePasswordForm');
    await form.waitFor({timeout: T});
    await idle(page);
    await typeInto(form.locator('input[name="oldPassword"]'), current);
    await typeInto(form.locator('input[name="password"]'), next);
    await typeInto(form.locator('input[name="password2"]'), next);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    await idle(page);
    await page.waitForTimeout(1000);
    const notice = await form.locator('.pkp_notification').innerText().catch(() => '');
    const toast = await page.locator('[role="status"].app__notifications').innerText().catch(() => '');
    return {notice: notice.replace(/\s+/g, ' ').trim(), toast: toast.replace(/\s+/g, ' ').trim()};
}

/** The Register page's username and password boxes, each typed `text` key by key (nothing sent). */
async function registerBoxes(page, app, text) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/user/register`));
    const form = page.locator('form#register');
    await form.waitFor({timeout: T});
    await idle(page);
    return {
        username: await typeInto(form.locator('input#username'), text),
        password: await typeInto(form.locator('input#password'), text),
        password2: await typeInto(form.locator('input#password2'), text),
    };
}

module.exports = {
    U06,
    PASSWORD,
    FIRST32,
    NEWCOMER,
    typeInto,
    newcomerSteps,
    errorsShown,
    login,
    resetLink,
    requestReset,
    resetTo,
    profilePasswordBoxes,
    profileSave,
    registerBoxes,
    screen,
};
