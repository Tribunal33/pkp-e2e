// Issue report docs/issues/U51-A22-subscription-search-fields-narrow-nothing.md (U51 A22):
// on Payments › "Individual Subscriptions" and "Institutional Subscriptions", "Search" by
// "Membership", "Reference Number", "Notes", "Institution name", "Domain" or "IP ranges"
// lists every subscription. OJS only (subscriptions are a journal's), on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), journal `publicknowledge`. The kit
// builds nothing; every step is a screen.
//
//   P1 rvaca: Settings › Distribution › "Payments": Enable, US Dollar, Manual Fee Payment, "Save"
//   P2 Payments › "Subscription Types": "u51sb10 Online Year" (Individual) and
//      "u51sb10 Campus Year" (Institutional), 12 months, Online
//   P3 Institutions › "Add Institution": "u51sb10 Harbour Library" (10.1.0.0 - 10.1.255.255),
//      "u51sb10 Hilltop College" (10.2.0.0 - 10.2.255.255)
//   P4 "Individual Subscriptions": dbarnes (M-100, REF-100, "paid by cheque"),
//      amwandenga (M-200, REF-200, "paid by card")
//   P5 "Institutional Subscriptions": ccorino at Harbour Library (harbour.edu, REF-300,
//      "invoice 300"), ckwantes at Hilltop College (hilltop.edu, REF-400, "invoice 400")
//   1-4 individual searches, 5-11 institutional searches (the report's Steps), 4 and 11 controls
//
// Reset first: npm run fleet-prep -- --feature issues-sb10 --dataset 5 --reset
// Run (main):  PROBE_FEATURE=issues-sb10 PROBE_AGENT=sb10 node bin/probe.js ojs shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/walk.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb10-3_5 PROBE_AGENT=sb10 node bin/probe.js ojs <this file>
// Facts: the run folder's a22-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const L = require('./lib');

const IND = 'Individual Subscriptions';
const INST = 'Institutional Subscriptions';

/** The searches of the Steps: [step, tab, field, match, text, the row names expected]. */
const SEARCHES = [
    ['1', IND, 'Reference Number', 'is', 'REF-100', ['Daniel Barnes']],
    ['2', IND, 'Membership', 'contains', 'M-100', ['Daniel Barnes']],
    ['3', IND, 'Notes', 'contains', 'cheque', ['Daniel Barnes']],
    ['4 control', IND, 'Username', 'is', 'dbarnes', ['Daniel Barnes']],
    ['5', INST, 'Institution name', 'contains', 'Harbour', ['Harbour Library']],
    ['6', INST, 'Domain', 'contains', 'harbour', ['Harbour Library']],
    ['7', INST, 'IP ranges', 'contains', '10.1.', ['Harbour Library']],
    ['8', INST, 'Reference Number', 'is', 'REF-300', ['Harbour Library']],
    ['9', INST, 'Notes', 'contains', 'invoice 300', ['Harbour Library']],
    ['10', INST, 'Membership', 'contains', 'M-', []],
    ['11 control', INST, 'Username', 'is', 'ccorino', ['Harbour Library']],
];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // OMP and OPS have no subscriptions
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
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
        await signIn(page, 'rvaca');
        await step('P1 payments', async () => {
            const {setUpPayments} = require('../priced-file-link-price-twice-or-missing/lib');
            return setUpPayments(page, app, {currency: 'USD', instructions: 'Pay by cheque to the journal office.'});
        });
        await step('P2 types', async () => {
            const {createType} = require('../individual-purchase-refusal-says-nothing/lib');
            const a = await createType(page, app, {name: 'u51sb10 Online Year', cost: '40'});
            const b = await createType(page, app, {name: 'u51sb10 Campus Year', cost: '400', institutional: true});
            return {a, b};
        });
        await step('P3 institutions', async () => ({
            a: await L.createInstitution(page, app, {name: 'u51sb10 Harbour Library', ipRanges: '10.1.0.0 - 10.1.255.255'}),
            b: await L.createInstitution(page, app, {name: 'u51sb10 Hilltop College', ipRanges: '10.2.0.0 - 10.2.255.255'}),
        }));
        const dates = {start: '2026-01-01', end: '2026-12-31'};
        const ind = {tab: IND, type: 'u51sb10 Online Year', ...dates};
        const inst = {tab: INST, type: 'u51sb10 Campus Year', ...dates, address: '2 Harbour Road'};
        await step('P4 individual', async () => ({
            dbarnes: await L.createSubscription(page, app, {...ind, username: 'dbarnes', userId: 3, membership: 'M-100', reference: 'REF-100', notes: 'paid by cheque'}),
            amwandenga: await L.createSubscription(page, app, {...ind, username: 'amwandenga', userId: 17, membership: 'M-200', reference: 'REF-200', notes: 'paid by card'}),
        }));
        await step('P5 institutional', async () => ({
            ccorino: await L.createSubscription(page, app, {...inst, username: 'ccorino', userId: 18, institution: 'u51sb10 Harbour Library', domain: 'harbour.edu', reference: 'REF-300', notes: 'invoice 300'}),
            ckwantes: await L.createSubscription(page, app, {...inst, username: 'ckwantes', userId: 19, institution: 'u51sb10 Hilltop College', domain: 'hilltop.edu', reference: 'REF-400', notes: 'invoice 400'}),
        }));
        await step('P lists', async () => {
            const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
            const pay = new PaymentsPage(page, app.contextPath);
            await pay.gotoTab(IND);
            const individual = await L.listed(pay, IND);
            record('a22-individual-list', await screen(page));
            await pay.gotoTab(INST);
            const institutional = await L.listed(pay, INST);
            record('a22-institutional-list', await screen(page));
            return {individual, institutional};
        });
        const verdicts = {};
        for (const [k, tab, field, match, text, want] of SEARCHES) {
            await step(`${k} ${field} ${match} "${text}"`, async () => {
                const r = await L.search(page, app, tab, {field, match, text}, `a22-${k.split(' ')[0]}`);
                record(`a22-${k.split(' ')[0]}-search`, await screen(page));
                const narrowed = r.rows.length === want.length && want.every((w) => r.rows.some((row) => row.includes(w)));
                verdicts[k] = narrowed ? 'narrowed as expected' : `listed ${r.rows.length}`;
                return {status: r.status, rows: r.rows, expected: want, narrowed, offered: r.offered};
            });
        }
        fact('verdicts', verdicts);
    } finally {
        record('a22-facts', facts);
        await close();
    }
});
