// Helpers of the kept walk for the U01 A4 issue report (second "Login As" mid-impersonation).
// Requiring this file runs nothing. Every helper drives the screens a person uses: Settings ›
// Users & Roles and its row menu, the "Login As" confirmation, the workflow's Participants panel and
// Reviewers table "More Actions" menus, and the top-right user menu ("Logout as {username}").
const {idle} = require('../../../probe');

const T = 30_000;
const CONFIRM = 'Log in as this user? All actions you perform will be attributed to this user.';
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/** Open the menu behind `button`, read its items, close it by pressing the button again. */
async function readMenu(page, button) {
    await button.click();
    const items = page.getByRole('menuitem');
    await items.first().waitFor({timeout: T});
    const labels = (await items.allInnerTexts()).map((t) => flat(t, 60));
    await button.click();
    await items.first().waitFor({state: 'detached', timeout: 5_000}).catch(() => {});
    return labels;
}

/** The Users & Roles row's menu button (the row's last button). */
const usersRowButton = (row) => row.getByRole('button').last();

/** The Users & Roles row menu's items for `name`. */
async function usersRowMenu(page, app, name) {
    const row = await usersRow(page, app, name);
    return readMenu(page, usersRowButton(row));
}

/**
 * From Users & Roles: `name`'s row menu › "Login As" › "OK". Returns {offered, url} (the address
 * landed on); when the menu does not offer it, closes the menu and returns {offered: false}.
 */
async function loginAsFromUsers(page, app, name) {
    const row = await usersRow(page, app, name);
    const button = usersRowButton(row);
    await button.click();
    const item = page.getByRole('menuitem', {name: 'Login As', exact: true});
    await page.getByRole('menuitem').first().waitFor({timeout: T});
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
    return {offered: true, asked, url: page.url().replace(/^https?:\/\/[^/]+/, '')};
}

/** The open workflow of submission `id` (the editorial view), with its Participants panel loaded. */
async function openWorkflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 60_000});
    await page.getByRole('button', {name: / More Actions$/}).first().waitFor({timeout: 60_000}).catch(() => {});
    await idle(page);
}

/** The Participants panel row of `name`: its "More Actions" items. */
async function participantMenu(page, name) {
    const button = page.getByRole('button', {name: `${name} More Actions`, exact: true}).first();
    if (!(await button.count())) return null;
    return readMenu(page, button);
}

/** The Reviewers table row of `name`: its "More Actions" items (null when the table has no such row). */
async function reviewerMenu(page, name) {
    const row = page.getByRole('row').filter({hasText: name}).filter({has: page.getByRole('button', {name: 'More Actions', exact: true})}).first();
    if (!(await row.count())) return null;
    return readMenu(page, row.getByRole('button', {name: 'More Actions', exact: true}));
}

/** The top-right user menu: the button's text, the open menu's text and its links. Leaves it closed. */
async function userMenu(page) {
    const root = page.locator('[data-cy="app-user-nav"]');
    await root.waitFor({timeout: T});
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
    const button = root.getByRole('button').first();
    await button.click();
    const link = root.getByRole('link', {name: `Logout as ${username}`}).first();
    await root.getByRole('link').first().waitFor({timeout: T});
    if (!(await link.count())) {
        await button.click();
        return {offered: false};
    }
    await link.click();
    await page.waitForURL((u) => !u.pathname.includes('signOutAsUser'), {timeout: T, waitUntil: 'commit'});
    await idle(page);
    return {offered: true, url: page.url().replace(/^https?:\/\/[^/]+/, '')};
}

/** Administration typed as an address: its status, heading and whether the admin's page opened. */
async function administration(page, app) {
    const response = await page.goto(app.url('/index.php/index/en/admin'));
    await idle(page);
    const body = flat(await page.locator('body').innerText().catch(() => ''), 600);
    return {
        status: response ? response.status() : null,
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        opened: /Hosted (Journals|Presses|Servers)|Site Settings/.test(body || ''),
        body: flat(body, 300),
    };
}

module.exports = {T, flat, sleep, usersRow, usersRowMenu, loginAsFromUsers, openWorkflow, participantMenu, reviewerMenu, userMenu, logoutAs, administration};
