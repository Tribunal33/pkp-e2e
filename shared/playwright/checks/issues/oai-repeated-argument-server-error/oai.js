// Shared by walk.js and neighbour.js: opens an OAI-PMH address in the
// browser, as a person (or a harvester) types it, and reads what answers.
const fs = require('fs');
const path = require('path');
const {screen, shot, record, idle} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function reader(app, page) {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP|Error|Exception|SQLSTATE/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 6);
        } catch { return [`(no log at ${logFile})`]; }
    };
    let n = 0;
    // Types `address` (after /index.php/) and reads the answer: the status
    // of the navigation, the raw XML, what the browser shows, the log.
    const open = async (label, address) => {
        const from = logSize();
        const r = await page.goto(app.url(`/index.php/${address}`));
        await page.waitForLoadState('load').catch(() => {});
        await idle(page).catch(() => {}); await pause(200);
        const serverLog = logSince(from);
        // The navigation's body is the page Chromium built with the answer's
        // XSL stylesheet; the raw XML is read again through a request.
        const raw = await page.request.get(page.url()).catch(() => null);
        const body = raw ? await raw.text().catch(() => '') : '';
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e)}); }
        await shot(page, name).catch(() => {});
        const shown = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        const xmlError = body.match(/<error code="([^"]+)">([^<]*)<\/error>/);
        fact(label, {
            address,
            landedAt: page.url().replace(/^https?:\/\/[^/]+/, ''),
            status: r ? r.status() : null,
            contentType: r ? r.headers()['content-type'] || null : null,
            rawStatus: raw ? raw.status() : null,
            bodyLength: body.length,
            error: xmlError ? {code: xmlError[1], message: xmlError[2]} : null,
            records: (body.match(/<record>/g) || []).length,
            repositoryName: (body.match(/<repositoryName>([^<]*)</) || [])[1] || null,
            shown: shown.slice(0, 120),
            shownError: (shown.match(/OAI Error\(s\).{0,200}/) || [])[0] || null,
            serverLog,
        });
    };
    return {facts, fact, open, save: () => record('facts', facts)};
}

module.exports = {reader};
