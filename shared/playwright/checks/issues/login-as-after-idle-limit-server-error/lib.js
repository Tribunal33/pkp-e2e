// Helpers of the kept walk for the U01 A8 issue report ("Login As" after the idle limit answers a
// blank server error). Requiring this file runs nothing. The screens: the Login page with its "Keep
// me logged in" box, Settings › Users & Roles and its row menu, the "Login As" confirmation.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const CONFIRM = 'Log in as this user? All actions you perform will be attributed to this user.';
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The page address segment for the locale: none on 3.4 and 3.3. */
const loc = (app) => (app.line && /3_[34]/.test(app.line) ? '' : '/en');

/**
 * Signed out, the context's Login page: `username` / its password, "Keep me logged in" ticked or
 * not (`remember`, null leaves the box as the page shows it). Returns what the box read on arrival,
 * where the sign-in landed and whether the browser holds a remember cookie.
 */
async function signInWithBox(page, app, username, remember) {
    await page.goto(app.url(`/index.php/${app.contextPath}${loc(app)}/login`));
    await idle(page);
    const box = page.getByLabel('Keep me logged in');
    const boxOnArrival = await box.isChecked();
    await page.getByLabel('Username or Email').fill(username);
    await page.getByLabel('Password', {exact: false}).first().fill(username === 'admin' ? 'admin' : `${username}${username}`);
    if (remember === true) await box.check();
    if (remember === false) await box.uncheck();
    const boxPressed = await box.isChecked();
    await page.getByRole('button', {name: 'Login', exact: true}).click();
    await page.waitForURL((u) => !/\/login(\/signIn)?$/.test(u.pathname), {timeout: 60_000});
    await idle(page);
    const cookies = (await page.context().cookies()).map((c) => ({
        name: c.name,
        days: c.expires === -1 ? null : Math.round((c.expires * 1000 - Date.now()) / 864e5),
    }));
    return {boxOnArrival, boxPressed, landed: path(page), cookies};
}

/**
 * Stand-in for the idle limit passing: moves every session's last activity back `days` days, which
 * is what that many idle days leave in the `sessions` table (the app's session lifetime is 7 days).
 */
function lapseSessions(app, days = 8) {
    return sql(app, `UPDATE sessions SET last_activity = last_activity - ${days * 86400}; SELECT count(*) FROM sessions`);
}

/** The page's path and query, without the host. */
const path = (page) => page.url().replace(/^https?:\/\/[^/]+/, '');

/** Settings › Users & Roles, narrowed to `name` through its search box; returns the row. */
async function usersRow(page, app, name) {
    await page.goto(app.url(`/index.php/${app.contextPath}${loc(app)}/management/settings/access`));
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

/**
 * On `row`: its menu (the row's last button) › "Login As" › "OK". Returns the confirmation's text,
 * the status of the sign-in-as address the browser opened, where it ended and what the page says.
 */
async function loginAsOnRow(page, row) {
    const button = row.getByRole('button').last();
    await button.click();
    await page.getByRole('menuitem').first().waitFor({timeout: T});
    const item = page.getByRole('menuitem', {name: 'Login As', exact: true});
    if (!(await item.count())) return {offered: false};
    await item.click();
    const dialog = page.getByRole('dialog').filter({hasText: CONFIRM});
    await dialog.waitFor({timeout: T});
    const asked = flat(await dialog.innerText(), 200);
    const answered = page.waitForResponse(
        (r) => r.request().resourceType() === 'document' && /signInAsUser/.test(r.url()),
        {timeout: 60_000},
    );
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    const res = await answered;
    await page.waitForLoadState('load');
    await idle(page);
    return {offered: true, asked, ...(await answerOf(page, res))};
}

/** Open `address` by typing it: the status it answered and where it ended. */
async function typeAddress(page, app, address) {
    const res = await page.goto(app.url(address));
    await idle(page);
    return {typed: address, ...(await answerOf(page, res))};
}

async function answerOf(page, res) {
    return {
        status: res.status(),
        redirectedFrom: res.request().redirectedFrom()?.url().replace(/^https?:\/\/[^/]+/, '') || null,
        address: res.url().replace(/^https?:\/\/[^/]+/, ''),
        landed: path(page),
        title: await page.title(),
        body: flat(await page.locator('body').innerText().catch(() => ''), 300),
    };
}

/** The journal's home page: the header's text (its menus and the user's name or the sign-in links). */
async function homeHeader(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}`));
    await idle(page);
    return {landed: path(page), header: flat(await page.locator('header').first().innerText().catch(() => null), 400)};
}

module.exports = {CONFIRM, flat, loc, path, signInWithBox, lapseSessions, usersRow, loginAsOnRow, typeAddress, homeHeader};
