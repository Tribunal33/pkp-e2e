// Helpers for the U01 A12 issue walk (a disabled account's refusal, then the
// next correct sign-in in the same browser), on PKP's default test dataset.
// Copied in part from ../disable-window-lists-ended-roles/lib.js so this
// folder stands alone. Requiring this file runs nothing.
//   docs/issues/U01-A12-disabled-sign-in-bounces-next-sign-in.md
const {expect} = require('@playwright/test');
const {idle, sql} = require('../../../probe');

const T = 30_000;

// The dataset's users (docs/process/dataset.md): the account to disable (an
// Author, Reader on every app), and the editor whose sign-ins follow.
const CASES = {
    ojs: {disabled: {username: 'ccorino', name: 'Carlo Corino'}, enabled: 'dbarnes'},
    omp: {disabled: {username: 'aclark', name: 'Arthur Clark'}, enabled: 'dbarnes'},
    ops: {disabled: {username: 'ccorino', name: 'Carlo Corino'}, enabled: 'dbarnes'},
};
exports.CASES = CASES;

function flat(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}
exports.flat = flat;

/** Settings > Users & Roles, searched by family name; returns {list, row}. */
async function findUser(page, app, who) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    const list = new UsersListPage(page, app.contextPath);
    await list.goto();
    await list.search(who.name.split(' ').pop());
    const row = list.row(`${who.username}@mailinator.com`);
    await expect(row).toHaveCount(1, {timeout: T});
    await idle(page);
    return {list, row};
}
exports.findUser = findUser;

/** The row's "..." > "Disable User", OK with the reason box as typed (empty by default). */
async function disableUser(page, app, who, reason) {
    const {DisableUserWindow} = require('../../../pages/UsersManagementPages.js');
    const {list, row} = await findUser(page, app, who);
    await list.chooseAction(row, 'Disable User');
    const win = new DisableUserWindow(page, `Disable ${who.name}`);
    await win.expectOpen();
    await expect(win.okButton).toBeVisible({timeout: T});
    await idle(page);
    if (reason) await win.reason.fill(reason);
    const answer = page.waitForResponse((r) => /disable-user/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await win.ok();
    const res = await answer;
    await idle(page);
    return {status: res.status()};
}
exports.disableUser = disableUser;

/**
 * Sign in on the Login page the page is on (or open it first when `open`),
 * as `username` with `password` (the dataset's own by default). Returns the
 * document requests the press made (method, address, status), where it
 * landed, whether it signed in, and the form's error line.
 */
async function loginAttempt(page, app, username, {password, open = false, site = false} = {}) {
    const locale = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    const loginUrl = `/index.php/${site ? 'index' : app.contextPath}${locale}/login`;
    if (open || (await page.locator('form#login').count()) === 0) {
        await page.goto(loginUrl);
        await idle(page);
    }
    const chain = [];
    const onResponse = (r) => {
        if (r.request().resourceType() === 'document') {
            chain.push({method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status()});
        }
    };
    page.on('response', onResponse);
    const before = await page.locator('input#username').inputValue().catch(() => null);
    await page.locator('input#username').fill(username);
    await page.locator('input#password').fill(password || (username + username));
    await Promise.all([
        page.waitForNavigation({waitUntil: 'load', timeout: T}).catch(() => null),
        page.locator('form#login button[type="submit"]').click(),
    ]);
    await page.waitForLoadState('domcontentloaded');
    await idle(page);
    page.off('response', onResponse);
    const path = new URL(page.url()).pathname;
    const onLogin = /\/login(\/signIn)?\/?$/.test(path);
    const error = page.locator('.pkp_form_error');
    const errorText = (await error.count()) ? flat(await error.first().innerText()) : null;
    const usernameBox = onLogin ? await page.locator('input#username').inputValue().catch(() => null) : null;
    return {username, usernameBoxBefore: before, chain, landed: page.url().replace(/^https?:\/\/[^/]+/, ''), signedIn: !onLogin, error: errorText, usernameBox};
}
exports.loginAttempt = loginAttempt;

/**
 * The newest row of the fleet's sessions table, its payload reduced to the
 * keys the sign-in uses (Laravel's guard key login_web_*, PKP's userId,
 * username, the password hash key's presence). Evidence only.
 */
function lastSession(app) {
    const row = sql(app, 'SELECT id, user_id, payload FROM sessions ORDER BY last_activity DESC, id LIMIT 1');
    if (!row) return null;
    const [id, userId, payload] = row.split('|');
    let text = '';
    try { text = Buffer.from(payload, 'base64').toString('utf8'); } catch (e) { text = ''; }
    const pick = (re) => { const m = text.match(re); return m ? m[1] : null; };
    return {
        id: id.slice(0, 8),
        user_id: userId || null,
        loginWeb: pick(/s:\d+:"login_web_[0-9a-f]+";i:(\d+)/),
        userId: pick(/s:6:"userId";i:(\d+)/),
        username: pick(/s:8:"username";s:\d+:"([^"]*)"/),
        passwordHash: /password_hash_web/.test(text),
    };
}
exports.lastSession = lastSession;

/** The dataset user's id by username. */
function userId(app, username) {
    return sql(app, `SELECT user_id FROM users WHERE username = '${username}'`);
}
exports.userId = userId;
