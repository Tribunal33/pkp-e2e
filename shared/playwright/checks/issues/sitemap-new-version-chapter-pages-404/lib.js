// Helpers for walk.js (U20 OMP4: a press's sitemap and a book's chapter pages after "Create New
// Version"). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const {readSitemap, follow, flat, rel} = require('../sitemap-lists-expired-announcements/lib');

/** The sitemap signed out, its chapter entries, and where each one leads. */
async function sitemapChapters(app, page, book) {
    const map = await readSitemap(app, page);
    const re = new RegExp(`/catalog/book/${book}/chapter/`);
    const chapterLocs = map.locs.filter((l) => re.test(l));
    const followed = [];
    for (const loc of chapterLocs) followed.push(await follow(app, page, loc));
    return {status: map.status, entries: map.locs.length, bookLocs: map.locs.filter((l) => l.includes(`/catalog/book/${book}`)), chapterLocs, followed};
}

/** The book's page as a reader opens it: the chapter links it shows, and where the first one leads. */
async function bookChapterLinks(app, page, book) {
    const res = await page.goto(app.url(`/index.php/${app.contextPath}/catalog/book/${book}`));
    await idle(page).catch(() => {});
    const links = await page.locator('a[href*="/chapter/"]').evaluateAll((as) => as.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')})));
    const out = {status: res && res.status(), links: links.map((l) => ({text: flat(l.text, 80), href: rel(l.href)}))};
    if (links[0]) out.firstFollowed = await follow(app, page, rel(links[0].href));
    return out;
}

module.exports = {sitemapChapters, bookChapterLinks};
