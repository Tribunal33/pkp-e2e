// Issue report docs/issues/U65-OJS4-subscriptions-report-contact-no-country.md (U65 OJS4):
// Statistics › "Reports" › "Subscriptions Report" fails when an institutional subscription's
// contact has no country. OJS only (subscriptions are a journal's), on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), journal `publicknowledge`. The kit
// builds nothing; every step is a screen. The dataset's `jdoe` (Jhon Doe) has no Country.
//
//   1 sign in as rvaca
//   2 Settings › Distribution › "Payments": Enable, USD, Manual Fee Payment, "Save"
//   3 Institutions › "Add Institution": "u65ir1 Harbour Library"
//   4 Payments › "Subscription Types": "u65ir1 Campus Year" (Institutional, USD 400, Online, 12)
//   5 Payments › "Institutional Subscriptions": jdoe at u65ir1 Harbour Library, Active,
//     2026-01-01 to 2026-12-31, "2 Harbour Road", "harbour.ac.uk"
//   6 Statistics › "Reports" › "Subscriptions Report"
//
// Mode `neighbour` (argument) runs alone, instead of the steps: the same 1-4, plus an
// individual type "u65ir1 Online Year"; the institutional subscription's contact is ccorino
// (Country Italy) and an individual subscription goes to lvon (no Country); then step 6. The
// file must carry "Italy" for ccorino and an empty Country for lvon, fix in or out.
//
// Reset first: npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):  PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir1 node bin/probe.js ojs shared/playwright/checks/issues/subscriptions-report-contact-no-country/walk.js [neighbour]
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=ir1 node bin/probe.js ojs <this file>
// Facts: the run folder's ojs4-facts[-<run>]-ojs.json (ojs4-nb-facts in neighbour mode)
const {forEachApp, launch, signIn, record, shot, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] === 'neighbour' ? 'neighbour' : 'steps';
const DATES = {start: '2026-01-01', end: '2026-12-31'};

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // OMP and OPS have no subscriptions
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const pre = MODE === 'neighbour' ? 'ojs4-nb' : 'ojs4';
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (k, fn) => {
        try {
            fact(k, await fn());
        } catch (e) {
            fact(k, {error: String(e.message || e).split('\n')[0].slice(0, 400)});
        }
    };
    const {page, close} = await launch(app);
    try {
        await step('1 sign in', async () => {
            await signIn(page, 'rvaca');
            return 'rvaca';
        });
        await step('2 payments', async () => {
            const {setUpPayments} = require('../priced-file-link-price-twice-or-missing/lib');
            return setUpPayments(page, app, {currency: 'USD', instructions: 'Pay by cheque to the journal office.'});
        });
        await step('3 institution', async () => {
            const {createInstitution} = require('../expiry-reminder-task-stops-with-error/lib');
            return createInstitution(page, 'u65ir1 Harbour Library');
        });
        await step('4 types', async () => {
            const {createType} = require('../individual-purchase-refusal-says-nothing/lib');
            const out = {campus: await createType(page, app, {name: 'u65ir1 Campus Year', cost: '400', institutional: true})};
            if (MODE === 'neighbour') out.online = await createType(page, app, {name: 'u65ir1 Online Year', cost: '40'});
            return out;
        });
        await step('5 subscriptions', async () => {
            const {createSubscription} = require('../expiry-reminder-task-stops-with-error/lib');
            const inst = {type: 'u65ir1 Campus Year', ...DATES, institution: 'u65ir1 Harbour Library'};
            if (MODE === 'neighbour') {
                return {
                    ccorino: await createSubscription(page, {...inst, username: 'ccorino', userId: 18}),
                    lvon: await createSubscription(page, {type: 'u65ir1 Online Year', ...DATES, username: 'lvon', userId: 38}),
                };
            }
            return {jdoe: await createSubscription(page, {...inst, username: 'jdoe', userId: 37})};
        });
        const log = serverLog(app);
        const from = log.mark();
        await step('6 Subscriptions Report', async () => {
            const r = await L.pressSubscriptionsReport(page, app, `${pre}-subscriptions`);
            await shot(page, `${pre}-after-press`).catch(() => {});
            record(`${pre}-press`, r);
            const out = {downloaded: r.downloaded, failed: r.failed || null, responses: r.responses, pageAfter: r.pageAfter || null};
            if (r.downloaded) {
                out.file = r.file;
                out.individual = L.individualRows(r.rows).map((x) => ({Name: x.Name, Country: x.Country}));
                out.institutional = L.institutionalRows(r.rows).map((x) => ({Institution: x['Institution Name'], Contact: x['Contact Name'], Country: x.Country}));
            }
            return out;
        });
        await page.waitForTimeout(1000);
        fact('server log', log.since(from).map((l) => L.flat(l, 400)));
        const s6 = facts['6 Subscriptions Report'] || {};
        const want = MODE === 'neighbour'
            ? s6.downloaded && (s6.institutional || []).some((x) => x.Contact && /Corino/.test(x.Contact) && x.Country === 'Italy') && (s6.individual || []).some((x) => /Von/.test(x.Name || '') && x.Country === '')
            : s6.downloaded && (s6.institutional || []).some((x) => /Doe/.test(x.Contact || '') && x.Country === '');
        fact('verdict', want ? 'Expected (file with the row, Country as stated)' : 'not Expected');
    } finally {
        record(`${pre}-facts`, facts);
        await close();
    }
});
