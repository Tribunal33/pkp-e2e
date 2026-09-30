// Issue report walk: docs/issues/U19-A17-oai-malformed-identifier-answers-record.md
// (spec U19 register A17). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"): the context
// `publicknowledge`'s OAI address typed in the browser as a harvester asks
// it, no sign-in. The kit builds nothing and the walk changes nothing.
//   1. ListIdentifiers: the first identifier, <start><n>
//   2. GetRecord <start><n>                 (the record)
//   3. GetRecord <start>abc                 (expected: Identifier is not in a valid format)
//   4. GetRecord <start><n>abc              (expected: Identifier is not in a valid format)
//   control: GetRecord foo                  (Identifier is not in a valid format)
//   reach: ListMetadataFormats <start><n>abc; GetRecord <start><start><n>; GetRecord <start><n>%0A
// On OJS `main` the steps are the control: a journal already refuses both.
//
// `neighbour` as the script's argument runs the neighbour check instead:
// well-formed identifiers must go on answering as before (GetRecord of each
// listed identifier, at the context's and the site-wide address;
// ListMetadataFormats with one; an unknown number; Identify's sample).
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w16 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-w16 PROBE_AGENT=w16 node bin/probe.js all shared/playwright/checks/issues/oai-malformed-identifier-answers-record/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w16-3_5 PROBE_AGENT=w16 node bin/probe.js all shared/playwright/checks/issues/oai-malformed-identifier-answers-record/walk.js
// Fix trial:    node bin/try-fix.js apply shared/playwright/checks/issues/oai-malformed-identifier-answers-record/fix-omp.diff omp
//               node bin/try-fix.js apply shared/playwright/checks/issues/oai-malformed-identifier-answers-record/fix-ops.diff ops
//               (3.5: fix-omp-3_5.diff, fix-ops-3_5.diff with PKP_E2E_LINE=stable-3_5_0)
//               reset, walk and neighbour, then revert.
// Facts: .reports/<feature>/w16/facts[-<run>]-<app>.json
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
        const err = body.match(/<error code="([^"]+)">([^<]*)<\/error>/);
        const out = {
            address,
            status: r ? r.status() : null,
            error: err ? `${err[1]}: ${err[2]}` : null,
            identifiers: [...body.matchAll(/<identifier>([^<]+)<\/identifier>/g)].map((m) => m[1]),
            titles: [...body.matchAll(/<dc:title[^>]*>([^<]+)<\/dc:title>/g)].map((m) => m[1]).slice(0, 2),
            formats: [...body.matchAll(/<metadataPrefix>([^<]+)<\/metadataPrefix>/g)].map((m) => m[1]),
            sampleIdentifier: (body.match(/<sampleIdentifier>([^<]+)<\/sampleIdentifier>/) || [])[1],
            shown: (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200),
            serverLog: logSince(from),
        };
        facts[label] = out;
        console.log(`[${app.name}] ${label}: ${JSON.stringify(out).slice(0, 600)}`);
        return out;
    };
    const oai = `${app.contextPath}/oai`;
    const get = (id) => `${oai}?verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`;
    try {
        const listed = await open('1-list', `${oai}?verb=ListIdentifiers&metadataPrefix=oai_dc`);
        const first = listed.identifiers[0];
        const [, start, num] = first.match(/^(.*\/)(\d+)$/);
        facts.first = {identifier: first, start, num};
        if (mode === 'walk') {
            await open('2-record', get(first));
            await open('3-letters', get(`${start}abc`));
            await open('4-number-then-letters', get(`${start}${num}abc`));
            await open('c-no-start', get('foo'));
            await open('x-formats-number-then-letters', `${oai}?verb=ListMetadataFormats&identifier=${encodeURIComponent(`${start}${num}abc`)}`);
            await open('x-start-twice', get(`${start}${start}${num}`));
            await open('x-trailing-newline', get(`${first}\n`));
        } else {
            for (const [i, id] of listed.identifiers.slice(0, 5).entries()) await open(`n1-record-${i}`, get(id));
            await open('n2-site-wide-record', `index/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(first)}`);
            await open('n3-formats', `${oai}?verb=ListMetadataFormats&identifier=${encodeURIComponent(first)}`);
            await open('n4-unknown-number', get(`${start}999999`));
            await open('n5-identify', `${oai}?verb=Identify`);
            await open('n6-other-start', get(`${start.replace(/[^:/]+\/$/, 'other/')}${num}`));
        }
    } finally {
        record(mode === 'walk' ? 'facts' : 'facts-neighbour', facts);
        await close();
    }
});
