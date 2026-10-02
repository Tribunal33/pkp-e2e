// Helpers of the U71 OMP9 / U24 A5 issue walk. Runs nothing when required.
const {idle, serverLog} = require('../../../probe');

const flat = (s, n = 300) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * Type an address: go to `path` on the app and say what answered. `status` is the last main-frame
 * document's, `chain` every main-frame document on the way (the forwards), `text` the page's own
 * text (empty for a blank page), `dialog` the heading of an open workflow window, `log` the
 * server's error lines written while the address loaded.
 */
async function visit(page, app, path) {
    const log = serverLog(app);
    const from = log.mark();
    const chain = [];
    const seen = (r) => {
        if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push({status: r.status(), url: new URL(r.url()).pathname + new URL(r.url()).search});
    };
    page.on('response', seen);
    let error = null;
    try {
        await page.goto(app.url(path), {waitUntil: 'load', timeout: 45_000});
        await Promise.race([idle(page).catch(() => {}), new Promise((done) => setTimeout(done, 15_000))]);
    } catch (e) {
        error = flat(e.message, 200);
    }
    page.off('response', seen);
    const last = chain[chain.length - 1] || {};
    const u = new URL(page.url());
    const dialog = page.getByRole('dialog').getByRole('heading').first();
    return {
        path,
        status: last.status ?? null,
        chain,
        landed: u.pathname + u.search,
        title: await page.title().catch(() => null),
        h1: flat(await page.locator('h1').first().innerText({timeout: 1000}).catch(() => ''), 120),
        text: flat(await page.locator('body').innerText({timeout: 2000}).catch(() => ''), 300),
        htmlLength: (await page.content().catch(() => '')).length,
        dialog: flat(await dialog.innerText({timeout: 1500}).catch(() => ''), 160),
        log: log.since(from).map((l) => flat(l, 400)).slice(0, 6),
        ...(error ? {error} : {}),
    };
}

module.exports = {flat, visit};
