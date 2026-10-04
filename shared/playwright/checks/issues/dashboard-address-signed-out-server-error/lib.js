// Helpers for walk.js (U01 A7). Requiring this file runs nothing.
const {flat, rel} = require('../older-version-pdf-reader-empty/lib');

/** The author account of the default dataset per app (dataset.md). */
const AUTHOR = {ojs: 'amwandenga', omp: 'aclark', ops: 'ccorino'};

/**
 * Type an address into the browser as a person would and read what answers: the first
 * response's status, the redirects on the way, where it ends, the page's title, how much
 * text it shows, and the Login form's `source` when the Login page opened.
 */
async function openAddress(page, app, path) {
    const chain = [];
    const on = (r) => {
        if (r.request().isNavigationRequest() && r.request().frame() === page.mainFrame()) {
            chain.push({status: r.status(), url: flat(rel(r.url()), 200), location: r.headers().location ? flat(rel(r.headers().location), 300) : undefined});
        }
    };
    page.on('response', on);
    const response = await page.goto(app.url(path)).catch((e) => ({error: flat(e.message, 200)}));
    page.off('response', on);
    await page.waitForLoadState('load').catch(() => {});
    const body = await page.locator('body').innerText().catch(() => '');
    return {
        asked: path,
        chain,
        finalStatus: response && response.status ? response.status() : response,
        url: flat(rel(page.url()), 300),
        title: await page.title(),
        bodyChars: body.trim().length,
        body: flat(body, 200),
        loginSource: await page.locator('form#login input[name="source"]').getAttribute('value', {timeout: 2000}).catch(() => null),
    };
}

module.exports = {AUTHOR, openAddress};
