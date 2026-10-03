// Helpers of walk.js (U08 A22). Requiring this file runs nothing. Every helper presses what a
// person presses or opens a side-menu entry's own address; nothing writes to the database.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per app: the manager role `admin` holds in the dataset, and an author account for the neighbour. */
const CASES = {
    ojs: {managerRole: 'Journal manager', author: 'ccorino'},
    omp: {managerRole: 'Press manager', author: 'aclark'},
    ops: {managerRole: 'Preprint Server manager', author: 'ccorino'},
};

/** The side menu as shown: every entry's label and address (closed groups' entries included). */
async function sideMenu(page) {
    const nav = page.locator('#app-nav');
    if (!(await nav.count())) return {shown: false, entries: []};
    const entries = await nav.locator('a, button, input').evaluateAll((els) =>
        els
            .map((e) => ({
                tag: e.tagName.toLowerCase(),
                text: (e.innerText || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim(),
                href: e.getAttribute('href') || null,
            }))
            .filter((e) => e.text || e.href)
    );
    return {shown: true, text: flat(await nav.innerText()), entries};
}

/**
 * Open an editorial page at `url` and read it: the page's status, the side menu, the count
 * request's answer, and an "Error" window when one opens (its text, then closed with "OK").
 */
async function readPage(page, url, name) {
    const counts = [];
    const onResponse = async (r) => {
        if (/\/_submissions\/viewsCount/.test(r.url())) {
            counts.push({status: r.status(), query: decodeURIComponent(r.url().split('?')[1] || ''), body: (await r.text().catch(() => '')).slice(0, 300)});
        }
    };
    page.on('response', onResponse);
    const response = await page.goto(url);
    await idle(page);
    await pause(1500); // the side menu's count request fires on mount; its window follows the answer
    await idle(page);
    const out = {url: page.url(), status: response ? response.status() : null};
    const err = page.getByRole('dialog').filter({hasText: /^\s*Error/});
    out.errorWindow = (await err.count()) ? flat(await err.first().innerText()) : null;
    out.screen = await screen(page);
    out.menu = await sideMenu(page);
    out.heading = flat(await page.locator('main h1').first().innerText({timeout: 2000}).catch(() => ''));
    out.denied = /The current role does not have access to this operation\./.test(out.screen.text?.main || '');
    if (out.errorWindow) {
        const ok = err.first().getByRole('button', {name: 'OK', exact: true});
        if (await ok.count()) await ok.click();
        await pause(600);
    }
    page.off('response', onResponse);
    out.viewsCount = counts;
    out.name = name;
    return out;
}

/** Profile › "Roles": tick the context's "Reader" and "Save"; returns the box's state after the save. */
async function tickReader(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile`));
    await idle(page);
    await page.getByRole('link', {name: 'Roles', exact: true}).click();
    const form = page.locator('#rolesForm');
    await form.waitFor({timeout: T});
    await idle(page);
    const box = form.getByLabel('Reader', {exact: true});
    const before = await box.isChecked();
    if (!before) await box.check();
    const saved = page.waitForResponse((r) => /save-roles/.test(r.url()), {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await idle(page);
    await pause(500);
    return {before, status: r.status(), after: await box.isChecked()};
}

module.exports = {T, CASES, flat, pause, sideMenu, readPage, tickReader};
