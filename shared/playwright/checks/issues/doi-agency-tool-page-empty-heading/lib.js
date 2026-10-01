// Helpers for walk.js and neighbour.js (U45 A20). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');

/** What a tool's page says about itself: tab title, level-one headings, trail, notice and its links. */
async function readToolPage(page) {
    await idle(page).catch(() => {});
    const h1 = await page.locator('h1').evaluateAll((hs) => hs.map((h) => ({text: h.innerText.trim(), cls: h.className})));
    const trail = await page.locator('nav[aria-label="Breadcrumb"], .pkp_breadcrumbs, .app__breadcrumbs').first().innerText({timeout: 1000}).catch(() => null);
    const notice = page.locator('.pkpNotification, [class*="notification"]').filter({hasText: 'DOI management has moved'}).first();
    const hasNotice = await notice.count();
    return {
        url: native.rel(page.url()),
        tabTitle: await page.title(),
        h1,
        trail: native.flat(trail, 160),
        notice: hasNotice ? native.flat(await notice.innerText(), 200) : null,
        noticeLinks: hasNotice ? await notice.locator('a').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')}))) : [],
        main: native.flat(await page.locator('main, .app__main').first().innerText().catch(() => ''), 300),
    };
}

module.exports = {readToolPage};
