// Helpers for the announcement feed walks (U12 A7, A15): this folder's walk.js and
// ../announcement-feed-dates-percent-signs/walk.js. Requiring this file runs nothing.
const {idle} = require('../../../probe');
const ann = require('../sitemap-lists-expired-announcements/lib');
const doaj = require('../doaj-tool-stays-on-plugins-list-when-off/lib');

const T = 30_000;
const PLUGIN = 'announcementfeedplugin';
const FEEDS = ['atom', 'rss2', 'rss'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const {flat, rel} = ann;

/** Settings › Website › "Plugins": tick "Announcement Feed Plugin". Returns the row before and the notice. */
async function enableFeedPlugin(app, page) {
    await doaj.openPlugins(app, page);
    const before = await doaj.rowState(app, page, PLUGIN);
    if (!before.listed) return {before};
    if (before.ticked) return {before, alreadyTicked: true};
    const set = await doaj.setEnabled(app, page, PLUGIN, true);
    await idle(page).catch(() => {});
    const after = await doaj.rowState(app, page, PLUGIN);
    return {before, ...set, after: {ticked: after.ticked}};
}

/**
 * Settings › Website › "Plugins", the arrow beside "Announcement Feed Plugin", "Settings":
 * type `n` into "Limit feed to … most recent announcements." and press "Save".
 * Returns the form's label text, the value before, and the save's answer.
 */
async function setFeedLimit(app, page, n) {
    await doaj.openPlugins(app, page);
    const s = doaj.plugins(app, page, PLUGIN);
    await s.row().locator('a.show_extras').click();
    await s.grid().locator(`tr[id$="-row-${PLUGIN}"] + tr`).getByRole('link', {name: 'Settings', exact: true}).click();
    const form = page.locator('#announcementFeedSettingsForm');
    const box = form.locator('input[name="recentItems"]');
    await box.waitFor({state: 'visible', timeout: T});
    await idle(page).catch(() => {});
    const out = {
        label: flat(await form.locator('[id^="webFeedSettingsFormArea"], .section').filter({has: box}).first().innerText().catch(() => null), 200),
        before: await box.inputValue(),
    };
    await box.fill(String(n));
    const [r] = await Promise.all([
        page.waitForResponse((x) => /verb=settings|settings\?|save=1|save=true/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null),
        form.getByRole('button', {name: 'OK', exact: true}).click(),
    ]);
    out.status = r ? r.status() : null;
    out.answer = r ? flat(await r.text().catch(() => null), 200) : null;
    await form.waitFor({state: 'detached', timeout: T}).catch(() => {});
    out.formClosed = !(await form.isVisible().catch(() => false));
    return out;
}

/** The side menu's Announcements list as shown: its titles in order. */
async function listedOnAnnouncementsPage(page) {
    return (await page.locator('main .listPanel .listPanel__itemTitle').allInnerTexts()).map((t) => flat(t));
}

const all = (xml, re) => [...xml.matchAll(re)].map((m) => m[1].trim());

/**
 * Open a feed address as a visitor's browser does (the status it got), then read the raw XML
 * in the same browser context. Returns the feed's own date and each entry's title and dates, in order.
 */
async function readFeed(app, page, type) {
    const path = `/index.php/${app.contextPath}/gateway/plugin/AnnouncementFeedGatewayPlugin/${type}`;
    let status = null;
    try {
        const res = await page.goto(app.url(path));
        status = res && res.status();
    } catch (e) {
        status = `goto: ${flat(e.message, 120)}`;
    }
    const raw = await page.request.get(app.url(path));
    const xml = await raw.text();
    const out = {type, path, status, rawStatus: raw.status(), contentType: raw.headers()['content-type'] || null};
    if (type === 'atom') {
        const head = xml.split('<entry>')[0];
        out.feedUpdated = all(head, /<updated>([^<]*)<\/updated>/g)[0] || null;
        out.entries = xml.split('<entry>').slice(1).map((e) => ({
            title: all(e, /<title>([^<]*)<\/title>/g)[0] || null,
            updated: all(e, /<updated>([^<]*)<\/updated>/g)[0] || null,
            published: all(e, /<published>([^<]*)<\/published>/g)[0] || null,
        }));
    } else if (type === 'rss2') {
        const head = xml.split('<item>')[0];
        out.channelPubDate = all(head, /<pubDate>([^<]*)<\/pubDate>/g)[0] || null;
        out.entries = xml.split('<item>').slice(1).map((e) => ({
            title: all(e, /<title>([^<]*)<\/title>/g)[0] || null,
            pubDate: all(e, /<pubDate>([^<]*)<\/pubDate>/g)[0] || null,
        }));
    } else {
        out.entries = xml.split(/<item rdf:about=/).slice(1).map((e) => ({
            title: all(e, /<title>([^<]*)<\/title>/g)[0] || null,
            dcDate: all(e, /<dc:date>([^<]*)<\/dc:date>/g)[0] || null,
        }));
    }
    out.titles = out.entries.map((e) => e.title);
    out.wellFormed = await page.evaluate((s) => !new DOMParser().parseFromString(s, 'application/xml').querySelector('parsererror'), xml).catch(() => null);
    return out;
}

/** The three feeds, signed out. */
async function readFeeds(app, page) {
    const out = {};
    for (const t of FEEDS) out[t] = await readFeed(app, page, t);
    return out;
}

module.exports = {T, PLUGIN, FEEDS, sleep, flat, rel, ann, enableFeedPlugin, setFeedLimit, listedOnAnnouncementsPage, readFeed, readFeeds};
