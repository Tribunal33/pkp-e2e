// Helpers for walk.js (U41 A9). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const flat = (s, n = 2000) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/** The published submission each app's steps open (one version), and the contributor edited. */
const SUBMISSION = {
    ojs: {id: 17, contributor: 'Vajiheh Karbasizaed', post: 'Publish', path: 'article/view/17'},
    omp: {id: 14, contributor: 'Michael Dawson', post: 'Publish', path: 'catalog/book/14'},
    ops: {id: 2, contributor: 'Catherine Kwantes', post: 'Post', path: 'preprint/view/2'},
};

/** Two organisations the default dataset's ROR cache holds. */
const ORG = {
    affiliation: {ror: 'https://ror.org/05njb9z20', name: 'University of Ljubljana'},
    funder: {ror: 'https://ror.org/01h531d29', name: 'Natural Sciences and Engineering Research Council of Canada'},
};

/**
 * Every link to ror.org on the open page: its address, the text around it, and its accessible
 * name as the browser's accessibility tree computes it (Playwright's aria snapshot).
 */
async function rorLinks(page) {
    const links = page.locator('a[href^="https://ror.org/"]');
    const out = [];
    for (let i = 0; i < (await links.count()); i++) {
        const a = links.nth(i);
        out.push({
            href: await a.getAttribute('href'),
            aria: flat(await a.ariaSnapshot().catch((e) => `unreadable: ${e.message}`), 300),
            ariaLabel: await a.getAttribute('aria-label'),
            text: flat(await a.innerText().catch(() => ''), 120),
            svgTitle: await a.locator('svg title').count(),
            context: flat(await a.evaluate((el) => (el.closest('li, .sub_item, span.funder, .affiliation') || el.parentElement).innerText), 200),
        });
    }
    return out;
}

/** The public page of the submission: status, the ROR links and the authors block's aria snapshot. */
async function readPublicPage(app, page, sub) {
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/en/${sub.path}`));
    await idle(page);
    return {
        status: r ? r.status() : null,
        url: page.url(),
        rorLinks: await rorLinks(page),
        authorsAria: flat(await page.locator('.item.authors').first().ariaSnapshot().catch(() => null), 1500),
    };
}

module.exports = {flat, SUBMISSION, ORG, rorLinks, readPublicPage};
