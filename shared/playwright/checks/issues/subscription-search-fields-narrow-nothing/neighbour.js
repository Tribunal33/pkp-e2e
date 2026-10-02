// Neighbour check of the A22 fix (issue report U51 A22): the fix casts the numeric search
// fields back to their constants, so the user fields (strings), an empty search box and the
// "is" match must behave as before. Runs right after walk.js on the same install (it reads
// the subscriptions walk.js made), with the fix in and out. As rvaca, Payments ›:
//   N1 "Individual Subscriptions": "Given Name" "contains" "Daniel"      → Daniel Barnes only
//   N2 "Individual Subscriptions": "Email address" "contains" "amwandenga" → Alan Mwandenga only
//   N3 "Individual Subscriptions": "Reference Number" "contains", empty box → both
//   N4 "Individual Subscriptions": "Reference Number" "is" "REF-1"        → none ("is" stays exact)
//   N5 "Institutional Subscriptions": "Institution name" "is" "u51sb10 Harbour Library" → Harbour Library, once
//   N6 "Institutional Subscriptions": "Family Name" "contains" "Kwantes"   → Hilltop College only
// Run: PROBE_FEATURE=issues-sb10 PROBE_AGENT=sb10 node bin/probe.js ojs \
//        shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/neighbour.js
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const L = require('./lib');

const IND = 'Individual Subscriptions';
const INST = 'Institutional Subscriptions';
const CHECKS = [
    ['N1', IND, 'Given Name', 'contains', 'Daniel', ['Daniel Barnes']],
    ['N2', IND, 'Email address', 'contains', 'amwandenga', ['Alan Mwandenga']],
    ['N3', IND, 'Reference Number', 'contains', '', ['Daniel Barnes', 'Alan Mwandenga']],
    ['N4', IND, 'Reference Number', 'is', 'REF-1', []],
    ['N5', INST, 'Institution name', 'is', 'u51sb10 Harbour Library', ['Harbour Library']],
    ['N6', INST, 'Family Name', 'contains', 'Kwantes', ['Hilltop College']],
];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const tag = process.env.PROBE_TAG || 'n';
    const facts = {app: app.name, line: app.line || 'main', fix: process.env.A22_FIX || 'unknown'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const verdicts = {};
        for (const [k, tab, field, match, text, want] of CHECKS) {
            try {
                const r = await L.search(page, app, tab, {field, match, text}, `a22-${tag}-${k}`);
                record(`a22-${tag}-${k}`, await screen(page));
                const ok = r.rows.length === want.length && want.every((w) => r.rows.some((row) => row.includes(w)));
                verdicts[k] = ok ? 'as expected' : `unexpected: ${JSON.stringify(r.rows)}`;
                facts[k] = {field, match, text, rows: r.rows, expected: want, ok};
            } catch (e) {
                verdicts[k] = `error: ${String(e.message).split('\n')[0]}`;
            }
        }
        facts.verdicts = verdicts;
        console.log(`[fact] neighbour ${facts.fix}: ${JSON.stringify(verdicts)}`);
    } finally {
        record(`a22-${tag}-facts`, facts);
        await close();
    }
});
