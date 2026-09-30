// Issue report walk: docs/issues/U19-A3-oai-impossible-date-accepted.md
// (spec U19 register A3). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"): the context
// `publicknowledge`'s OAI address typed in the browser as a harvester asks
// it, no sign-in. The kit builds nothing and the walk changes nothing.
//   1. ListIdentifiers, no dates: the baseline count
//   2. from=2026-13-01                    (expected: Illegal from parameter)
//   3. until=2026-13-01                   (expected: Illegal until parameter)
//   4. from=2026-09-30T25:00:00Z          (expected: Illegal from parameter)
//   5. from=2026-02-30&until=2026-03-01   (expected: Illegal from parameter)
//   control: from=2026/09/30              (Illegal from parameter)
//
// `neighbour` as the script's argument runs the neighbour check instead:
// real dates must go on answering as before (a day, a date-time, a leap
// day, the last day of a month, `until` a day), and Identify's
// earliestDatestamp, which is parsed by the same method, must not move.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w07 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-w07 PROBE_AGENT=w07 node bin/probe.js all shared/playwright/checks/issues/oai-impossible-date-accepted/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w07-3_5 PROBE_AGENT=w07 node bin/probe.js all shared/playwright/checks/issues/oai-impossible-date-accepted/walk.js
// Fix trial:    node bin/try-fix.js apply shared/playwright/checks/issues/oai-impossible-date-accepted/fix.diff ojs omp ops, reset, walk and neighbour, then revert.
// Facts: .reports/<feature>/w07/facts[-<run>]-<app>.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, screen, shot, record, idle} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const mode = process.argv[2] === 'neighbour' ? 'neighbour' : 'walk';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {page, close} = await launch(app);
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, mode}};
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
    // Types the address (after /index.php/) and reads the answer. The
    // browser shows the XSL view; the XML a harvester reads is the same
    // GET's raw answer, fetched again from the address landed at.
    const open = async (label, address) => {
        const from = logSize();
        const r = await page.goto(app.url(`/index.php/${address}`));
        await page.waitForLoadState('load').catch(() => {});
        await idle(page).catch(() => {}); await pause(200);
        const raw = await page.request.get(page.url()).catch(() => null);
        const body = raw ? await raw.text().catch(() => '') : '';
        const name = `${mode}-${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e)}); }
        await shot(page, name).catch(() => {});
        const stamps = [...body.matchAll(/<datestamp>([^<]+)<\/datestamp>/g)].map((m) => m[1]);
        const err = body.match(/<error code="([^"]+)">([^<]*)<\/error>/);
        const out = {
            address,
            status: r ? r.status() : null,
            error: err ? `${err[1]}: ${err[2]}` : null,
            count: stamps.length,
            days: [...new Set(stamps.map((s) => s.slice(0, 10)))],
            earliestDatestamp: (body.match(/<earliestDatestamp>([^<]+)<\/earliestDatestamp>/) || [])[1],
            shown: (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200),
            serverLog: logSince(from),
        };
        facts[label] = out;
        console.log(`[${app.name}] ${label}: ${JSON.stringify(out).slice(0, 600)}`);
        return out;
    };
    const oai = `${app.contextPath}/oai`;
    const list = `${oai}?verb=ListIdentifiers&metadataPrefix=oai_dc`;
    try {
        if (mode === 'walk') {
            await open('1-no-dates', list);
            await open('2-from-month-13', `${list}&from=2026-13-01`);
            await open('3-until-month-13', `${list}&until=2026-13-01`);
            await open('4-from-hour-25', `${list}&from=2026-09-30T25:00:00Z`);
            await open('5-from-30-february', `${list}&from=2026-02-30&until=2026-03-01`);
            await open('c-from-slashes', `${list}&from=2026/09/30`);
        } else {
            const all = await open('n1-no-dates', list);
            const d = all.days[0];
            await open('n2-identify', `${oai}?verb=Identify`);
            await open('n3-from-day', `${list}&from=${d}`);
            await open('n4-from-day-start-time', `${list}&from=${d}T00:00:00Z`);
            await open('n5-until-day', `${list}&until=${d}`);
            await open('n6-from-leap-day', `${list}&from=2028-02-29`);
            await open('n7-from-month-end', `${list}&from=2026-02-28`);
            await open('n8-from-after-until', `${list}&from=2026-03-02&until=2026-03-01`);
        }
    } finally {
        record(mode === 'walk' ? 'facts' : 'facts-neighbour', facts);
        await close();
    }
});
