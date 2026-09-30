// Shared by walk.js and neighbour.js: opens an OAI-PMH address in the
// browser, as a person (or a harvester) types it, and reads what answers:
// the status, the OAI error, and each record header's identifier and
// datestamp from the XML the server sent.
const fs = require('fs');
const path = require('path');
const {screen, shot, record, idle} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// "2026-09-30T12:30:13Z" moved by `s` seconds, in the same shape.
const shift = (stamp, s) => new Date(Date.parse(stamp) + s * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
const day = (stamp, d = 0) => new Date(Date.parse(stamp.slice(0, 10) + 'T00:00:00Z') + d * 86400_000).toISOString().slice(0, 10);

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
    // Types `address` (after /index.php/) and reads the answer.
    const open = async (label, address) => {
        const from = logSize();
        const r = await page.goto(app.url(`/index.php/${address}`));
        await page.waitForLoadState('load').catch(() => {});
        await idle(page).catch(() => {}); await pause(200);
        // The browser shows the XSL rendering; the XML a harvester reads is
        // the same GET's raw answer, fetched again from the address landed at.
        const raw = await page.request.get(page.url()).catch(() => null);
        const body = raw ? await raw.text().catch(() => '') : '';
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e)}); }
        await shot(page, name).catch(() => {});
        const headers = [...body.matchAll(/<header([^>]*)>\s*<identifier>([^<]+)<\/identifier>\s*<datestamp>([^<]+)<\/datestamp>/g)]
            .map((m) => ({identifier: m[2], datestamp: m[3], deleted: /deleted/.test(m[1])}));
        const err = body.match(/<error code="([^"]+)">([^<]*)<\/error>/);
        const shown = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        const out = {
            address,
            status: r ? r.status() : null,
            bodyLength: body.length,
            error: err ? `${err[1]}: ${err[2]}` : null,
            granularity: (body.match(/<granularity>([^<]+)<\/granularity>/) || [])[1] || undefined,
            count: headers.length,
            datestamps: headers.map((h) => `${h.identifier.replace(/^.*:/, '')} ${h.datestamp}${h.deleted ? ' deleted' : ''}`),
            shown: shown.slice(0, 160),
            serverLog: logSince(from),
        };
        fact(label, out);
        return {...out, headers};
    };
    return {facts, fact, open, save: () => record('facts', facts)};
}

module.exports = {reader, shift, day};
