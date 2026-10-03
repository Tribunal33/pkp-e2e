// Helpers of walk.js (U12 OMP2: a press's home page shows the site's announcements).
// Requiring this file runs nothing. Every helper drives the screens a person uses,
// through the OMP suite's Announcements page objects (the forms and panels are lib/pkp's,
// the same on the three apps), required lazily.
const path = require('path');
const {idle} = require('../../../probe');
const ctxLib = require('../section-editors-not-assigned-second-journal/lib.js');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const PO = () => require(path.join(__dirname, '../../../../../apps/omp/playwright/pages/AnnouncementsPages.js'));

/** Administration › Hosted Journals (Presses, Servers) › "Create …": the second context. */
async function createSecondContext(page, app, {name, initials, path: urlPath, email}) {
    const status = await ctxLib.createContext(page, app, {name, initials, path: urlPath, email});
    return {status, landed: rel(page.url())};
}

/**
 * Administration › Site Settings › "Announcements" › "Settings": tick "Enable announcements",
 * "Display on Homepage" `count`, "Save". Returns the tab's side tabs and "Saved".
 */
async function siteEnable(page, {count}) {
    const {SiteAnnouncementsTab} = PO();
    const site = new SiteAnnouncementsTab(page);
    await site.goto();
    await site.openSideTab('settings');
    const form = site.form();
    const before = await form.enableBox().isChecked();
    await form.enableBox().check();
    await form.countInput().fill(String(count));
    await form.save();
    return {tickedBefore: before, count: await form.countInput().inputValue(), saved: true};
}

/** Site Settings › "Announcements" side tab › "Add Announcement" (the tab already open). */
async function siteAdd(page, {title, shortDescription}) {
    const {SiteAnnouncementsTab} = PO();
    const site = new SiteAnnouncementsTab(page);
    await site.openSideTab('items');
    const saved = await site.list().add({title, shortDescription});
    return {id: saved.id, title: flat(saved.title && (saved.title.en || saved.title)), rows: (await site.list().titles().allInnerTexts()).map((s) => flat(s))};
}

/**
 * Settings › Website › Setup › "Announcements" on `contextPath`: tick "Enable announcements",
 * "Display on Homepage" `count` ('' leaves it empty), "Save".
 */
async function contextSettings(page, contextPath, {count}) {
    const {AnnouncementSettingsTab} = PO();
    const tab = new AnnouncementSettingsTab(page);
    await tab.goto(contextPath);
    const form = tab.form();
    // "Display on Homepage" is shown only while "Enable announcements" is ticked.
    const enabled = await form.enableBox().isChecked();
    const before = {enabled, count: enabled ? await form.countInput().inputValue() : '(hidden)'};
    await form.enableBox().check();
    await form.countInput().waitFor({state: 'visible', timeout: T});
    await form.countInput().fill(String(count));
    await form.save();
    return {before, after: {enabled: await form.enableBox().isChecked(), count: await form.countInput().inputValue()}, saved: true};
}

/** The context's Announcements page › "Add Announcement". */
async function contextAdd(page, contextPath, {title, shortDescription}) {
    const {AnnouncementsPage} = PO();
    const mgmt = new AnnouncementsPage(page);
    await mgmt.goto(contextPath);
    const saved = await mgmt.list().add({title, shortDescription});
    return {id: saved.id};
}

/**
 * A home page as a visitor reads it: status, address, the "Announcements" blocks with their
 * heading, the titles and every link's address, the summary text, and the skip link.
 */
async function readHome(page, app, contextPath) {
    const res = await page.goto(app.url(`/index.php/${contextPath}`));
    await idle(page).catch(() => {});
    const block = page.locator('section.cmp_announcements');
    const n = await block.count();
    const out = {address: `/index.php/${contextPath}`, status: res && res.status(), landed: rel(page.url()), blocks: n};
    if (n) {
        const b = block.first();
        out.heading = flat(await b.locator('h2').first().innerText().catch(() => null));
        out.titles = (await b.locator('h3 a, h4 a').allInnerTexts()).map((s) => flat(s));
        out.text = flat(await b.innerText(), 600);
        out.links = [...new Set((await b.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).map(rel))];
    }
    out.skipToAnnouncements = flat(await page.locator('a[href="#homepageAnnouncements"]').first().innerText({timeout: 2000}).catch(() => null));
    return out;
}

/** Follow an address as a visitor: status, redirects, where it lands, the page's heading. */
async function follow(app, page, address) {
    const res = await page.goto(app.url(address));
    await idle(page).catch(() => {});
    const chain = [];
    for (let q = res && res.request().redirectedFrom(); q; q = q.redirectedFrom()) {
        const rr = await q.response().catch(() => null);
        chain.unshift(`${rr ? rr.status() : '?'} ${rel(q.url())}`);
    }
    const heading = await page.locator('h1').first().innerText({timeout: 5000}).catch(() => null);
    const body = await page.locator('body').innerText({timeout: 5000}).catch(() => '');
    return {address, redirects: chain, status: res && res.status(), landed: rel(page.url()), heading: flat(heading), text: flat(body, 300)};
}

module.exports = {T, flat, rel, WORDS: ctxLib.WORDS, createSecondContext, siteEnable, siteAdd, contextSettings, contextAdd, readHome, follow};
