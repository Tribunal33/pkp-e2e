// Helpers of walk.js here (issue report docs/issues/U23-A10-pager-next-lacks-spoken-label.md).
// Requiring this file runs nothing. Every helper drives the screens as a person does: the
// Settings › Users & Roles page's "Users" tab and the pager under its list.
const {idle} = require('../../../probe');

const T = 30_000;

/** Squash whitespace and cut. */
function flat(s, n = 300) {
    return s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n);
}

/** Settings › Users & Roles, tab "Users": the list's heading and its "Showing …" line. */
async function openUsers(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
    const panel = page.locator('#users');
    await panel.getByRole('heading', {name: /^Current Users/}).waitFor({timeout: T});
    await panel.getByText(/^Showing \d+ to \d+ of \d+$/).last().waitFor({timeout: T});
    await idle(page);
    return {
        heading: flat(await panel.getByRole('heading', {name: /^Current Users/}).innerText()),
        showing: flat(await panel.getByText(/^Showing \d+ to \d+ of \d+$/).last().innerText()),
    };
}

/** The Users list's pager: the navigation's name, each button's spoken name and visible text. */
function pagerNav(page) {
    return page.locator('#users').getByRole('navigation', {name: 'View additional pages'}).last();
}

/**
 * What a screen reader is given for the pager: the accessibility tree of the navigation (its
 * buttons' computed names and states), each button's visible text and aria-label, and whether
 * a button named "Go to Next" or plain "Next" exists.
 */
async function pagerFacts(page) {
    const navs = await page.locator('#users').getByRole('navigation', {name: 'View additional pages'}).count();
    const nav = pagerNav(page);
    if (!navs) return {navs, pager: null};
    const aria = await nav.ariaSnapshot();
    const buttons = await nav.locator('button').evaluateAll((els) =>
        els.map((b) => ({
            text: b.innerText.replace(/\s+/g, ' ').trim(),
            ariaLabel: b.getAttribute('aria-label'),
            ariaCurrent: b.getAttribute('aria-current'),
            disabled: b.disabled,
        })),
    );
    return {
        navs,
        aria,
        names: aria.split('\n').filter((l) => /- button/.test(l)).map((l) => l.trim()),
        buttons,
        goToNext: await nav.getByRole('button', {name: 'Go to Next', exact: true}).count(),
        plainNext: await nav.getByRole('button', {name: 'Next', exact: true}).count(),
    };
}

/** Press a pager button by its visible text; the "Showing …" line once the list has reloaded. */
async function pressPager(page, text) {
    const before = flat(await page.locator('#users').getByText(/^Showing \d+ to \d+ of \d+$/).last().innerText());
    await pagerNav(page).locator('button', {hasText: new RegExp(`^\\s*${text}\\s*$`)}).click();
    await page.locator('#users').getByText(/^Showing \d+ to \d+ of \d+$/).last()
        .filter({hasNotText: before}).waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return {before, after: flat(await page.locator('#users').getByText(/^Showing \d+ to \d+ of \d+$/).last().innerText())};
}

module.exports = {flat, openUsers, pagerNav, pagerFacts, pressPager};
