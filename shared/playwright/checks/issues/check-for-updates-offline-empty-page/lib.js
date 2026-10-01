// Helpers for walk.js and neighbour.js (U61 A1). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const tools = require('../tool-address-without-tool-raw-text/lib');

const ADMIN = '/index.php/index/en/admin';

/** What the page now shown holds: heading, tab title, the System Information parts, any notice. */
async function read(page, resp) {
    await idle(page).catch(() => {});
    const main = await page.locator('main, body').first().innerText().catch(() => '');
    return {
        url: String(page.url()).replace(/^https?:\/\/[^/]+/, ''),
        status: resp && resp.status ? resp.status() : null,
        title: await page.title(),
        heading: native.flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null), 120),
        bodyLength: (await page.locator('body').innerText().catch(() => '')).trim().length,
        checkLink: await page.getByRole('link', {name: 'Check for updates', exact: true}).count(),
        latest: native.flat((main.match(/Latest version:[^\n]*/) || [null])[0], 160),
        notices: (await page.locator('.pkpNotification').allInnerTexts().catch(() => [])).map((t) => native.flat(t, 300)),
        versionHistory: /Version history/.test(main),
        serverInformation: /Server Information/.test(main),
    };
}

/** Open Administration at its address (step 2). */
async function openAdmin(app, page) {
    const resp = await page.goto(app.url(ADMIN));
    return read(page, resp);
}

/** Press a link on the page and read the page it opens. */
async function press(page, name) {
    const [resp] = await Promise.all([
        page.waitForNavigation({waitUntil: 'load'}),
        page.getByRole('link', {name, exact: true}).click(),
    ]);
    return read(page, resp);
}

/** Error lines the fleet's server log took since a byte offset. */
const logMark = (app) => tools.logSince(app, 0).size;
const logSince = (app, mark) => tools.logSince(app, mark).lines;

module.exports = {ADMIN, read, openAdmin, press, logMark, logSince};
