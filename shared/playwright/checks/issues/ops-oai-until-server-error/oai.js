// Shared by walk.js and neighbour.js: opens an OAI-PMH address in the
// browser, as a person types it, and reads what answers.
const fs = require('fs');
const path = require('path');
const {screen, shot, record, idle} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const ymd = (d) => d.toISOString().slice(0, 10);
const DAY = 86400_000;
const today = ymd(new Date());
const yesterday = ymd(new Date(Date.now() - DAY));
const tomorrow = ymd(new Date(Date.now() + DAY));

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
        const body = r ? (await r.body().catch(() => Buffer.alloc(0))).toString('utf8') : '';
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e)}); }
        await shot(page, name).catch(() => {});
        const shown = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        const err = shown.match(/(badArgument|badResumptionToken|badVerb|cannotDisseminateFormat|idDoesNotExist|noRecordsMatch|noMetadataFormats|noSetHierarchy)[^A-Za-z]*([^.]*\.?)/);
        fact(label, {
            address,
            landedAt: page.url().replace(/^https?:\/\/[^/]+/, ''),
            status: r ? r.status() : null,
            contentType: r ? r.headers()['content-type'] || null : null,
            bodyLength: body.length,
            // what the page shows: the XSL view heads each record "OAI Record Header"
            recordsShown: (shown.match(/OAI Record Header/g) || []).length,
            error: err ? err[0].slice(0, 160) : null,
            shown: shown.slice(0, 160),
            serverLog: logSince(from),
        });
    };
    return {facts, fact, open, save: () => record('facts', facts)};
}

module.exports = {reader, today, yesterday, tomorrow};
