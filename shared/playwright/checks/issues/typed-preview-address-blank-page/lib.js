// Helpers for walk.js and neighbour.js (U09 A7). Requiring this file runs nothing.
const {idle, screen, record} = require('../../../probe');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** OJS and OMP ship "Static Pages Plugin"; OPS does not. */
const hasStaticPages = (app) => app.name !== 'ops';

/** Each app's author account in the default dataset (dataset.md). */
const AUTHOR = {ojs: 'amwandenga', omp: 'aclark', ops: 'ccorino'};

/** Context-relative address (no locale segment: as a person would type it). */
const address = (app, pathname) => app.url(`/index.php/${app.contextPath}${pathname}`);

/**
 * Type an address into the browser: the document's status, where the browser
 * ended (after any redirect), the page's title and heading and its text.
 */
async function typeAddress(app, page, pathname, name) {
    const resp = await page.goto(address(app, pathname)).catch((e) => ({error: flat(e.message)}));
    await idle(page).catch(() => {});
    const body = await page.locator('body').innerText({timeout: 3000}).catch(() => '');
    const html = await page.content().catch(() => '');
    const out = {
        typed: pathname,
        status: resp && resp.status ? resp.status() : null,
        firstStatus: resp && resp.request ? await firstStatus(resp) : null,
        landed: new URL(page.url()).pathname,
        title: await page.title().catch(() => null),
        h1: flat(await page.locator('h1').first().innerText({timeout: 1500}).catch(() => null), 120),
        bodyText: flat(body, 300),
        htmlLength: html.length,
        blank: !flat(body),
    };
    record(name, {...(await screen(page).catch(() => ({}))), walk: out});
    return out;
}

/** The status of the first response in a redirect chain (a 302 before Login, say). */
async function firstStatus(resp) {
    let req = resp.request();
    while (req.redirectedFrom()) req = req.redirectedFrom();
    const first = await req.response().catch(() => null);
    return first ? first.status() : null;
}

/** Settings › Website › "Plugins": tick "Static Pages Plugin" unless it is ticked (the manager is signed in). */
async function enableStaticPages(app, page) {
    const {PluginsTab} = require('../../../pages/CustomContentPages');
    const tab = new PluginsTab(page, app.contextPath);
    await tab.goto();
    const was = await tab.enabledBox('staticpagesplugin').isChecked();
    if (!was) await tab.enable('staticpagesplugin');
    return {wasEnabled: was, enabled: await tab.enabledBox('staticpagesplugin').isChecked()};
}

module.exports = {flat, hasStaticPages, AUTHOR, address, typeAddress, enableStaticPages};
