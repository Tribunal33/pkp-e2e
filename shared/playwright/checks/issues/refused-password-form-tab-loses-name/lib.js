// Helpers of walk.js here (issue report docs/issues/U01-A11-refused-password-form-tab-loses-name.md).
// Requiring this file runs nothing. Every helper drives the screens as a person does: the Site
// Administrator's "Settings wizard" › "Users" › "Edit User" (the "Change Password" box), the Login
// page and its forced "Change Password" form, and "Forgot your password?" with the emailed link's
// "Reset Password" form. The reset request and the email's link come from the U03 A7 walk.
const {idle, screen} = require('../../../probe');
const PW = require('../password-boxes-keep-32-characters/lib.js');

const T = 30_000;
const HOSTED = {ojs: 'Hosted Journals', omp: 'Hosted Presses', ops: 'Hosted Servers'};
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** What the browser tab and the page read: the tab's title, the address, the heading, the form's errors. */
async function tabAndHeading(page) {
    const errors = await page
        .locator('#formErrors, .pkp_form_error')
        .allInnerTexts()
        .catch(() => []);
    return {
        tab: await page.title().catch(() => null),
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        heading: flat(await page.locator('h1').first().innerText({timeout: 3000}).catch(() => null), 120),
        errors: errors.map((e) => flat(e, 300)).filter(Boolean),
    };
}

/**
 * As the site administrator (signed in): Administration › "Hosted …" › the context's arrow ›
 * "Settings wizard", tab "Users", search `username`, "Edit User", tick "Change Password", "OK".
 */
async function flagForChange(page, app, username) {
    const {HostedContextsPage, UserDetailsWindow} = require('../../../pages/UsersManagementPages.js');
    const hosted = new HostedContextsPage(page, {hostedLabel: HOSTED[app.name]});
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(app.contextPath);
    const grid = await hosted.openWizardTab('Users');
    await grid.search({text: username});
    await grid.chooseAction(username, 'Edit User');
    const win = new UserDetailsWindow(page, 'Edit User');
    await win.expectOpen();
    await win.mustChangePassword.check();
    const box = {checked: await win.mustChangePassword.isChecked()};
    await win.pressOk();
    await win.expectClosed();
    await idle(page);
    return box;
}

/** On the context's Login page: the username and password, "Login"; where it lands. */
async function signInAt(page, app, username, password) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/login`));
    await idle(page);
    const form = page.locator('form#login');
    await form.locator('input#username').fill(username);
    await form.locator('input#password').fill(password);
    await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), form.getByRole('button', {name: 'Login', exact: true}).click()]);
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    return tabAndHeading(page);
}

/** The forced "Change Password" form shown now: the three passwords, "OK"; what the page reads after. */
async function changePassword(page, {current, next}) {
    const form = page.locator('form#loginChangePassword');
    await form.waitFor({timeout: T});
    await form.locator('input[name="oldPassword"]').fill(current);
    await form.locator('input[name="password"]').fill(next);
    await form.locator('input[name="password2"]').fill(next);
    await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), form.getByRole('button', {name: 'OK', exact: true}).click()]);
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    return tabAndHeading(page);
}

/** On the emailed link's "Reset Password" form: the two boxes, "Save"; what the page reads after. */
async function saveReset(page, {password, repeat}) {
    const form = page.locator('form#updateResetPassword');
    await form.waitFor({timeout: T});
    await form.locator('input[name="password"]').fill(password);
    await form.locator('input[name="password2"]').fill(repeat);
    await Promise.all([page.waitForNavigation({timeout: T}).catch(() => {}), form.getByRole('button', {name: 'Save', exact: true}).click()]);
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    return tabAndHeading(page);
}

module.exports = {T, HOSTED, PW, flat, tabAndHeading, flagForChange, signInAt, changePassword, saveReset, screen};
