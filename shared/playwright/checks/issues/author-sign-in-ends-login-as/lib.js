// Helpers of the kept walk for the U01 A15 issue report (an Author's sign-in that re-saves their password
// ends a manager's "Login As" of them). Requiring this file runs nothing. The screen helpers drive what a
// person uses: Settings › Users & Roles and its row menu, the "Login As" confirmation, the top-right user
// menu ("Logout as {username}") and Edit Profile › Password. Copied in part from the U01 A4 walk's lib.js
// (second-login-as-strands-operator), since kept walks stand alone.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const CONFIRM = 'Log in as this user? All actions you perform will be attributed to this user.';
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const path = (page) => page.url().replace(/^https?:\/\/[^/]+/, '');

/** The Author each app's steps use (dataset.md): username and name. */
const AUTHOR = {ojs: ['ccorino', 'Carlo Corino'], omp: ['afinkel', 'Alvin Finkel'], ops: ['ccorino', 'Carlo Corino']};

/** Settings › Users & Roles, narrowed to `name` through its search box; returns the row. */
async function usersRow(page, app, name) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
    await idle(page);
    const box = page.getByRole('searchbox').first();
    await box.waitFor({timeout: T});
    await box.fill(name.split(' ').slice(-1)[0]);
    await box.press('Enter');
    const row = page.getByRole('row').filter({hasText: name}).first();
    await row.waitFor({timeout: T});
    await idle(page);
    return row;
}

/** From Users & Roles: `name`'s row menu › "Login As" › "OK". Returns {offered, asked, url}. */
async function loginAsFromUsers(page, app, name) {
    const row = await usersRow(page, app, name);
    const button = row.getByRole('button').last();
    await button.click();
    await page.getByRole('menuitem').first().waitFor({timeout: T});
    const item = page.getByRole('menuitem', {name: 'Login As', exact: true});
    if (!(await item.count())) {
        await button.click();
        return {offered: false};
    }
    await item.click();
    const dialog = page.getByRole('dialog').filter({hasText: CONFIRM});
    await dialog.waitFor({timeout: T});
    const asked = flat(await dialog.innerText(), 200);
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await page.waitForURL((u) => !u.pathname.includes('/management/settings/access') && !u.pathname.includes('signInAsUser'), {timeout: T, waitUntil: 'commit'});
    await idle(page);
    return {offered: true, asked, url: path(page)};
}

/** The top-right user menu: the button's text, the open menu's text and its links (null when absent). */
async function userMenu(page) {
    const root = page.locator('[data-cy="app-user-nav"]');
    if (!(await root.count())) return null;
    const button = root.getByRole('button').first();
    const out = {button: flat(await button.innerText().catch(() => null), 80)};
    await button.click();
    await root.getByRole('link').first().waitFor({timeout: T});
    out.text = flat(await root.innerText(), 400);
    out.links = (await root.getByRole('link').allInnerTexts()).map((t) => flat(t, 60));
    await button.click();
    await sleep(300);
    return out;
}

/** The user menu's "Logout as {username}" › wait to land. Returns {offered, url}. */
async function logoutAs(page, username) {
    const root = page.locator('[data-cy="app-user-nav"]');
    if (!(await root.count())) return {offered: false, menu: false};
    const button = root.getByRole('button').first();
    await button.click();
    await root.getByRole('link').first().waitFor({timeout: T});
    const link = root.getByRole('link', {name: `Logout as ${username}`}).first();
    if (!(await link.count())) {
        await button.click();
        return {offered: false};
    }
    await link.click();
    await page.waitForURL((u) => !u.pathname.includes('signOutAsUser'), {timeout: T, waitUntil: 'commit'});
    await idle(page);
    return {offered: true, url: path(page)};
}

/** What a page shows about who is signed in: address, title, Login form or not, header text. */
async function whoAmI(page) {
    const header = flat(await page.locator('header').first().innerText().catch(() => ''), 300);
    return {
        url: path(page),
        title: await page.title(),
        loginForm: (await page.locator('form#login, input[name="username"]').count()) > 0,
        header,
        menu: await userMenu(page).catch((e) => ({error: flat(e.message, 120)})),
    };
}

/** The stored password's form (`$2y$10$` = bcrypt at cost 10) and the account's session rows. Read only. */
function stored(app, username) {
    const [prefix, id] = sql(app, `select substring(password, 1, 7), user_id from users where username = '${username}'`).split('|');
    const sessions = Number(sql(app, `select count(*) from sessions where user_id = ${Number(id)}`));
    return {prefix, userId: Number(id), sessionRows: sessions};
}

/** Edit Profile › Password: current, new, repeat, "Save". Returns the tab's text after the save. */
async function changePassword(page, app, current, next) {
    const {ProfilePage} = require('../../../pages/ProfilePage');
    const profile = new ProfilePage(page, app.contextPath);
    await profile.goto('password');
    await profile.fillPasswords({current, next});
    await profile.save();
    await idle(page);
    return {url: path(page), text: flat(await profile.form('password').innerText().catch(() => ''), 300)};
}

module.exports = {T, AUTHOR, flat, sleep, path, usersRow, loginAsFromUsers, userMenu, logoutAs, whoAmI, stored, changePassword};
