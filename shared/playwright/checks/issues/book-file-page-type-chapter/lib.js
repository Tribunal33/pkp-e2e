// Helpers of walk.js here (docs/issues/U20-OMP3-book-file-page-type-chapter.md). Requiring this
// file runs nothing. The helpers read what a visitor's browser receives: the page's own Dublin
// Core <meta> tags, as "View Page Source" shows them.
const {idle} = require('../../../probe');

const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/** The page's address, title and every `DC.*` tag in its head, in order (content addresses made relative). */
async function readDcTags(page) {
    const tags = await page.evaluate(() =>
        [...document.querySelectorAll('head meta[name^="DC."]')].map((m) => ({name: m.getAttribute('name'), content: m.getAttribute('content')})));
    const pick = (n) => tags.filter((t) => t.name === n).map((t) => t.content);
    return {
        url: rel(page.url()),
        title: await page.title(),
        type: pick('DC.Type'),
        dcTitle: pick('DC.Title'),
        creators: pick('DC.Creator.PersonalName'),
        identifier: pick('DC.Identifier'),
        tags: tags.map((t) => `${t.name}=${rel(t.content).slice(0, 120)}`),
    };
}

/** Open a catalog address (the part after the press's path) as a visitor and read its tags. */
async function openAndRead(page, app, address) {
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/${address}`));
    await idle(page).catch(() => {});
    return {status: r ? r.status() : null, ...(await readDcTags(page))};
}

/** Press a link on the current page and read the Dublin Core tags of the page it opens. */
async function pressAndRead(page, link) {
    await Promise.all([page.waitForLoadState('domcontentloaded'), link.click()]);
    await page.waitForURL(/\/catalog\/view\//);
    await idle(page).catch(() => {});
    return readDcTags(page);
}

module.exports = {rel, readDcTags, openAndRead, pressAndRead};
