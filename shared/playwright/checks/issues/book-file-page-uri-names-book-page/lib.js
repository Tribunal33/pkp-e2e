// Helpers of walk.js here (docs/issues/U20-OMP5-book-file-page-uri-names-book-page.md). Requiring
// this file runs nothing. They read what a visitor's browser receives: the page's own Dublin Core
// <meta> tags, as "View Page Source" shows them.
const {idle} = require('../../../probe');

/** An address's path, with the language segment after the press's path dropped (`/en/catalog` → `/catalog`). */
const path = (u) => (u ? new URL(u).pathname.replace(/^(\/index\.php\/[^/]+)\/[a-z]{2}(?:_[A-Z]{2})?(?=\/)/, '$1') : u);

/** The page's address, title and the Dublin Core tags this report reads. */
async function readTags(page) {
    const tags = await page.evaluate(() =>
        [...document.querySelectorAll('head meta[name^="DC."]')].map((m) => ({name: m.getAttribute('name'), content: m.getAttribute('content')})));
    const pick = (n) => tags.filter((t) => t.name === n).map((t) => t.content);
    return {
        url: page.url(),
        title: await page.title(),
        uri: pick('DC.Identifier.URI'),
        identifier: pick('DC.Identifier'),
        dcTitle: pick('DC.Title'),
        type: pick('DC.Type'),
    };
}

/** Open an address in the address bar, as a visitor, and read its tags with the answer's status. */
async function openAndRead(page, url) {
    const r = await page.goto(url);
    await idle(page).catch(() => {});
    return {status: r ? r.status() : null, ...(await readTags(page))};
}

/** Press a link on the current page that opens a file's view page, and read that page's tags. */
async function pressAndRead(page, link) {
    await Promise.all([page.waitForURL(/\/catalog\/view\//), link.click()]);
    await idle(page).catch(() => {});
    return readTags(page);
}

/** Does the page's DC.Identifier.URI name the page itself (the language segment aside)? */
const namesItself = (t) => t.uri.length === 1 && path(t.uri[0]) === path(t.url);

module.exports = {path, readTags, openAndRead, pressAndRead, namesItself};
