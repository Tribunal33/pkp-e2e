// Helpers for walk.js and neighbour.js (U63 A1, A19). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');

/** A tool's name each application does not have (another application's tool). */
const ABSENT = {ojs: 'Onix30ExportPlugin', omp: 'CrossrefExportPlugin', ops: 'Onix30ExportPlugin'};

/** Open an address as a person typing it; returns what came back and what the screen shows. */
async function open(app, page, address) {
    const resp = await page.goto(app.url(`/index.php/${app.contextPath}/en${address}`)).catch((e) => ({error: e.message}));
    await idle(page).catch(() => {});
    const body = native.flat(await page.locator('body').innerText().catch(() => ''), 300);
    return {
        address,
        status: resp && resp.status ? resp.status() : null,
        type: resp && resp.headers ? (resp.headers()['content-type'] || '').split(';')[0] : null,
        heading: native.flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null), 120),
        menu: await page.locator('nav, [role="navigation"]').count(),
        body,
        rawJson: /^\{"status":/.test(body),
    };
}

/** The server log lines this fleet wrote since `from` (byte offset) that name an error. */
function logSince(app, from) {
    const f = path.resolve(__dirname, '../../../../../apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    if (!fs.existsSync(f)) return {file: f, size: 0, lines: []};
    const buf = fs.readFileSync(f);
    const text = buf.slice(from || 0).toString();
    return {file: f, size: buf.length, lines: text.split('\n').filter((l) => /Error|Exception/.test(l)).map((l) => native.flat(l, 300)).slice(0, 5)};
}

module.exports = {ABSENT, open, logSince};
