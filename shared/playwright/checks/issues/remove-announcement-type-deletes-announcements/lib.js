// Helpers for walk.js (U12 A1: removing an announcement type deletes its announcements).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The management Announcements page (journal, press or server), by its address. */
async function openManagement(app, page, contextPath = app.contextPath) {
    await page.goto(app.url(`/index.php/${contextPath}/en/management/settings/announcements`));
    await idle(page).catch(() => {});
    await page.locator('main .listPanel').first().waitFor({state: 'visible', timeout: T});
}

/** One of the page's tabs: "Announcements" or "Announcement Types". */
async function openTab(page, name) {
    await page.locator('main').getByRole('tab', {name, exact: true}).click();
    if (name === 'Announcement Types') {
        await page.locator('#announcementTypes:visible').first().waitFor({state: 'visible', timeout: T});
    } else {
        await page.locator('main .listPanel').first().waitFor({state: 'visible', timeout: T});
    }
    await idle(page).catch(() => {});
}

function typesGrid(page) {
    return page.locator('#announcementTypes:visible').first();
}

/** The types grid's row names, in order. */
async function typeNames(page) {
    return typesGrid(page).locator('tr.gridRow').evaluateAll((rows) =>
        rows.map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim().replace(/^Settings\s+/, '')));
}

/** "Add Announcement Type": Name, "Save". Returns the save's status and the grid's names. */
async function addType(page, name) {
    const grid = typesGrid(page);
    await grid.getByRole('link', {name: /Add Announcement Type/}).click();
    const win = page.locator('[role="dialog"]:visible').last();
    const box = win.locator('input[name="name[en]"]');
    await box.waitFor({state: 'visible', timeout: T});
    await box.fill(name);
    const [r] = await Promise.all([
        page.waitForResponse((x) => /update-announcement-type/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null),
        win.getByRole('button', {name: 'Save', exact: true}).click(),
    ]);
    await idle(page).catch(() => {});
    await sleep(600);
    return {name, status: r ? r.status() : null, names: await typeNames(page)};
}

/**
 * The type row's arrow, then "Remove": returns the confirmation's title, text and buttons,
 * and the dialog locator, without answering it.
 */
async function openRemoveType(page, name) {
    const grid = typesGrid(page);
    const row = grid.locator('tr.gridRow').filter({hasText: new RegExp(`(^|\\s)${esc(name)}\\s*$`)});
    await row.locator('a.show_extras').click();
    const controls = row.locator('xpath=following-sibling::tr[1]');
    await controls.getByRole('link', {name: 'Remove', exact: true}).click();
    const dialog = page.locator('[role="dialog"]:visible').filter({has: page.getByRole('button', {name: 'OK', exact: true})}).last();
    await dialog.waitFor({state: 'visible', timeout: T});
    await sleep(300);
    const read = await dialog.evaluate((d) => ({
        title: (d.getAttribute('aria-label') || (d.querySelector('h1,h2,h3,.ui-dialog-title') || {}).innerText || '').trim(),
        text: (d.innerText || '').replace(/\s+/g, ' ').trim(),
        buttons: [...d.querySelectorAll('button, a.cancelButton, input[type=submit]')].map((b) => (b.innerText || b.value || '').trim()).filter(Boolean),
    }));
    return {dialog, read};
}

/** Press "OK" in the confirmation: the delete request's status. */
async function confirmOk(page, dialog) {
    const [r] = await Promise.all([
        page.waitForResponse((x) => /delete-announcement-type/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null),
        dialog.getByRole('button', {name: 'OK', exact: true}).click(),
    ]);
    await idle(page).catch(() => {});
    await sleep(600);
    return {status: r ? r.status() : null, url: r ? rel(r.url()) : null};
}

/** The "Announcements" tab's row titles. */
async function listTitles(page) {
    return page.locator('main .listPanel').first().locator('.listPanel__itemTitle').allInnerTexts().then((a) => a.map((s) => flat(s)));
}

/**
 * "Add Announcement": Title, the "Announcement Type" radio of `type` (when given), "Save".
 * Returns the save's status, the types the panel offered and the row's number.
 */
async function addAnnouncement(page, {title, type}) {
    const list = page.locator('main .listPanel').first();
    await list.getByRole('button', {name: 'Add Announcement', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Add Announcement'});
    const save = dialog.getByRole('button', {name: 'Save', exact: true});
    await save.waitFor({state: 'visible', timeout: T});
    await dialog.locator('input[name="title-en"]').fill(title);
    const offered = await dialog.locator('input[name="typeId"]').evaluateAll((els) =>
        els.map((e) => (e.closest('label') ? e.closest('label').innerText : e.value).replace(/\s+/g, ' ').trim()));
    if (type) await dialog.getByRole('radio', {name: type, exact: true}).check();
    const [r] = await Promise.all([
        page.waitForResponse((x) => /\/api\/v1\/announcements(\/\d+)?$/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null),
        save.click(),
    ]);
    const out = {title, type: type || null, typesOffered: offered, status: r ? r.status() : null};
    if (r && r.status() >= 400) out.answer = flat(await r.text().catch(() => null), 400);
    await dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
    const row = list.locator('.listPanel__item').filter({has: page.locator('.listPanel__itemTitle', {hasText: title})});
    const href = await row.getByRole('link', {name: 'View', exact: true}).getAttribute('href', {timeout: T}).catch(() => null);
    const m = (href || '').match(/\/announcement\/view\/(\d+)/);
    out.id = m ? Number(m[1]) : null;
    out.view = href ? rel(href) : null;
    return out;
}

/** The public Announcements page: status and the titles it lists. */
async function readPublicList(app, page, contextPath = app.contextPath) {
    const res = await page.goto(app.url(`/index.php/${contextPath}/announcement`));
    await idle(page).catch(() => {});
    const titles = await page.locator('.obj_announcement_summary h2, .obj_announcement_summary h3').allInnerTexts().catch(() => []);
    return {status: res && res.status(), url: rel(page.url()), titles: titles.map((s) => flat(s))};
}

/** Open an address as a visitor: where it lands and the page's heading. */
async function follow(app, page, address) {
    const res = await page.goto(app.url(address));
    await idle(page).catch(() => {});
    const chain = [];
    for (let q = res && res.request().redirectedFrom(); q; q = q.redirectedFrom()) {
        const rr = await q.response().catch(() => null);
        chain.unshift(`${rr ? rr.status() : '?'} ${rel(q.url())}`);
    }
    const heading = await page.locator('main h1, .pkp_structure_main h1').first().innerText({timeout: 5000}).catch(() => null);
    return {address, redirects: chain, status: res && res.status(), landed: rel(page.url()), heading: flat(heading)};
}

module.exports = {T, sleep, flat, rel, openManagement, openTab, typeNames, addType, openRemoveType, confirmOk, listTitles, addAnnouncement, readPublicList, follow};
