// Helpers for walk.js (U20 A5: expired announcements in the sitemap).
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u).replace(/^https?:\/\/[^/]+/, '');

/**
 * Settings › Website › Setup › "Announcements": tick "Enable announcements"
 * and press "Save". Returns whether the box was ticked before, and "Saved".
 */
async function enableAnnouncements(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
    await idle(page).catch(() => {});
    const setupTab = page.locator('#setup-button').first();
    await setupTab.waitFor({state: 'visible', timeout: T});
    if ((await setupTab.getAttribute('aria-selected')) !== 'true') await setupTab.click();
    await page.locator('#setup').first().getByRole('tab', {name: 'Announcements', exact: true}).click();
    const panel = page.locator('#setup').first().locator('[role="tabpanel"]:visible').first();
    const box = panel.getByRole('checkbox', {name: 'Enable announcements', exact: true});
    await box.waitFor({state: 'visible', timeout: T});
    const before = await box.isChecked();
    await box.check();
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const saved = await panel.locator('[role="status"]').filter({hasText: 'Saved'}).first()
        .waitFor({state: 'visible', timeout: T}).then(() => true, () => false);
    return {tickedBefore: before, saved};
}

/**
 * Press the side menu's "Announcements" (the page is reloaded first, since
 * the menu is drawn when the page loads). Falls back to the address when
 * no such entry is found, and says so.
 */
async function openAnnouncementsFromMenu(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
    await idle(page).catch(() => {});
    const nav = page.getByRole('navigation', {name: 'Site Navigation'});
    const entry = nav.locator('[aria-label="Announcements"], a, [role="button"]')
        .filter({hasText: /^\s*Announcements\s*$/}).first();
    let via = 'side menu';
    if (await entry.isVisible().catch(() => false)) {
        await entry.click();
        await page.waitForURL(/\/management\/settings\/announcements/, {timeout: T, waitUntil: 'commit'});
    } else {
        via = 'address (no side menu entry found)';
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/announcements`));
    }
    await idle(page).catch(() => {});
    await page.locator('main .listPanel').first().waitFor({state: 'visible', timeout: T});
    return {via, url: rel(page.url())};
}

/**
 * On the Announcements page: "Add Announcement", the title, an optional
 * expiry date, "Save". Returns the save's answer and the row's number,
 * read from its "View" address.
 */
async function addAnnouncement(page, {title, expiry}) {
    const list = page.locator('main .listPanel').first();
    await list.getByRole('button', {name: 'Add Announcement', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Add Announcement'});
    const save = dialog.getByRole('button', {name: 'Save', exact: true});
    await save.waitFor({state: 'visible', timeout: T});
    await dialog.locator('input[name="title-en"]').fill(title);
    if (expiry) await dialog.locator('input[name="dateExpire"]').fill(expiry);
    const [r] = await Promise.all([
        page.waitForResponse((x) => /\/api\/v1\/announcements(\/\d+)?$/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null),
        save.click(),
    ]);
    const out = {title, expiry: expiry || null, status: r ? r.status() : null};
    if (r && r.status() >= 400) out.answer = flat(await r.text().catch(() => null), 400);
    await dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
    const row = list.locator('.listPanel__item').filter({has: page.locator('.listPanel__itemTitle', {hasText: title})});
    const href = await row.getByRole('link', {name: 'View', exact: true}).getAttribute('href', {timeout: T}).catch(() => null);
    const m = (href || '').match(/\/announcement\/view\/(\d+)/);
    out.id = m ? Number(m[1]) : null;
    out.view = href ? rel(href) : null;
    out.rows = await list.locator('.listPanel__itemTitle').allInnerTexts().then((a) => a.map((s) => flat(s)));
    return out;
}

/** The public Announcements page: its status and the announcement titles it lists. */
async function readAnnouncementsPage(app, page) {
    const res = await page.goto(app.url(`/index.php/${app.contextPath}/announcement`));
    await idle(page).catch(() => {});
    const titles = await page.locator('.obj_announcement_summary h2, .obj_announcement_summary h3').allInnerTexts().catch(() => []);
    return {status: res && res.status(), url: rel(page.url()), titles: titles.map((s) => flat(s))};
}

/**
 * The sitemap as a visitor (or a search engine) opens it: the status the
 * browser got, then the raw XML through the page's own context (Chromium
 * renders XML as a tree), and every <loc> in it.
 */
async function readSitemap(app, page) {
    const res = await page.goto(app.url(`/index.php/${app.contextPath}/sitemap`));
    await idle(page).catch(() => {});
    const raw = await page.request.get(page.url());
    const xml = await raw.text();
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => rel(m[1]));
    return {
        status: res && res.status(),
        url: rel(page.url()),
        contentType: raw.headers()['content-type'] || null,
        locs,
        announcementLocs: locs.filter((l) => /\/announcement(\/|$)/.test(l)),
    };
}

/** Follow one address as a visitor would: where it lands, through which redirects, and the page's heading. */
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

/** YYYY-MM-DD, `days` from today. */
function dateFromToday(days) {
    const d = new Date(Date.now() + days * 86400000);
    return d.toISOString().slice(0, 10);
}

module.exports = {flat, rel, enableAnnouncements, openAnnouncementsFromMenu, addAnnouncement, readAnnouncementsPage, readSitemap, follow, dateFromToday};
