// Helpers of walk.js (issue report docs/issues/U08-A2-section-editor-dashboard-opens-profile.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const {idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** The editorial header's bell as it reads after signing in ("Tasks 2"), and the page it is on. */
async function readBell(page) {
    await idle(page);
    const bell = page.getByRole('button', {name: /^Tasks/}).first();
    await bell.waitFor({timeout: T}).catch(() => {});
    return {address: rel(page.url()), bell: (await bell.count()) ? flat(await bell.innerText()) : null};
}

/** Open a public page by its address (the journal's home page, or a site page) and wait for the header. */
async function openPublic(page, app, path) {
    const r = await page.goto(app.url(path));
    const header = await page.locator('header.pkp_structure_head').waitFor({timeout: T}).then(() => true, () => false);
    await idle(page);
    return {asked: path, status: r ? r.status() : null, address: rel(page.url()), header,
        title: await page.title()};
}

/**
 * The header's user menu: the name as shown (with its count, when it has one), then pressed open,
 * the entries under it with their addresses.
 */
async function readUserMenu(page) {
    const wrapper = page.locator('#navigationUserWrapper');
    const toggle = wrapper.locator('#navigationUser > li > a').first();
    await toggle.waitFor({timeout: T});
    const name = flat(await toggle.innerText());
    const nameCount = (await toggle.locator('span.task_count').count())
        ? flat(await toggle.locator('span.task_count').innerText()) : null;
    await toggle.click();
    const list = wrapper.locator('#navigationUser > li > ul').first();
    const opened = await list.waitFor({state: 'visible', timeout: 8000}).then(() => true, () => false);
    const links = list.getByRole('link');
    const entries = [];
    for (let i = 0; i < (await links.count()); i++) {
        const a = links.nth(i);
        entries.push({text: flat(await a.innerText()), href: rel(await a.getAttribute('href'))});
    }
    return {name, nameCount, opened, entries};
}

/**
 * The same page in a window narrower than 992 px (a phone or a narrow browser): reload, press "Open Menu",
 * read the user menu as displayed (innerText skips what the theme hides), then the window back to its width.
 */
async function readUserMenuNarrow(page, width = 800) {
    const size = page.viewportSize();
    await page.setViewportSize({width, height: size.height});
    try {
        await page.reload();
        await page.locator('header.pkp_structure_head').waitFor({timeout: T});
        await idle(page);
        const toggle = page.locator('button.pkp_site_nav_toggle');
        const toggled = await toggle.isVisible().catch(() => false);
        if (toggled) await toggle.click();
        await pause(400);
        const top = page.locator('#navigationUser > li > a').first();
        const entries = (await page.locator('#navigationUser > li > ul a').allInnerTexts()).map(flat);
        return {width, openMenuButton: toggled, name: flat(await top.innerText()), entries};
    } finally {
        await page.setViewportSize(size);
        await page.reload();
        await page.locator('header.pkp_structure_head').waitFor({timeout: T});
        await idle(page);
    }
}

/** Press "Dashboard" in the open user menu; where it lands. */
async function pressDashboard(page) {
    const entry = page.locator('#navigationUser > li > ul').getByRole('link', {name: /^Dashboard(\s+\d+)?$/}).first();
    const before = page.url();
    await entry.click();
    await page.waitForURL((u) => String(u) !== before, {timeout: T}).catch(() => {});
    await idle(page);
    await pause(300);
    return {
        address: rel(page.url()),
        title: await page.title(),
        heading: await page.locator('h1').first().innerText().then(flat, () => null),
    };
}

module.exports = {readBell, openPublic, readUserMenu, readUserMenuNarrow, pressDashboard};
