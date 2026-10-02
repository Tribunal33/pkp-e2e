// Helpers for walk.js (U47 OMP2). Requiring this file runs nothing.
const path = require('path');

/**
 * Press a media file's name link (target=_blank) and return what the browser got: the answer's
 * status, content type and Content-Disposition, and, when it is not a download, the text the new
 * tab shows. The tab is closed again.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} link
 */
async function pressFileLink(page, link) {
    const href = await link.getAttribute('href');
    const target = new URL(href, page.url()).href;
    const context = page.context();
    const tabs = [];
    const onPage = (p) => tabs.push(p);
    context.on('page', onPage);
    const answered = context.waitForEvent('response', {
        predicate: (r) => r.url() === target || r.request().redirectedFrom()?.url() === target,
        timeout: 30_000,
    });
    try {
        await link.click();
        const response = await answered;
        const disposition = (await response.headerValue('content-disposition')) || '';
        const type = (await response.headerValue('content-type')) || '';
        let body = null;
        if (!/attachment/i.test(disposition)) {
            body = await response.text().catch(() => null);
        }
        for (let i = 0; i < 30 && !tabs.length; i++) await page.waitForTimeout(500);
        let tabText = null;
        if (tabs[0] && !/attachment/i.test(disposition)) {
            await tabs[0].waitForLoadState('domcontentloaded').catch(() => {});
            tabText = await tabs[0].locator('body').innerText({timeout: 10_000}).catch(() => null);
        }
        return {
            href: target.replace(/^https?:\/\/[^/]+/, ''),
            status: response.status(),
            contentType: type,
            disposition,
            downloaded: /attachment/i.test(disposition),
            body: body ? body.slice(0, 500) : null,
            newTab: tabs.length > 0,
            tabText: tabText ? tabText.slice(0, 500) : null,
        };
    } finally {
        context.off('page', onPage);
        for (const tab of tabs) await tab.close().catch(() => {});
    }
}
exports.pressFileLink = pressFileLink;

/** The fixture the steps upload: any PNG image does. */
exports.FIGURE = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'omp', 'playwright', 'fixtures', 'files', 'figure.png');
