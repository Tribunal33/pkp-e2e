// Neighbour check for docs/issues/U44-A4-urn-resave-refused-already-in-use.md (spec U44 register A4),
// walked with fix.diff in and out. The fix stops a version's own URN (and its sibling versions') from
// counting as "already in use"; it must keep refusing a URN another submission already carries.
//   Preconditions as in walk.js (rvaca sets up the URN plugin; skipped where already on).
//   OJS: dbarnes stores urn:nbn:de:0000-u44r2n on submission 10 ("Condensing Water Availability
//     Models…", version 11), then types the same URN on submission 9 ("Hansen & Pinto: Reason
//     Reclaimed", version 10) and saves. Submission 10's number equals submission 9's version number,
//     which the unfixed check leaves out, so the duplicate goes through without the fix.
//   OMP: the same with submission 7 ("Accessible Elements…") then submission 4 ("How Canadians
//     Communicate…"): refused with and without the fix (the press's numbers coincide per book).
// Run: PROBE_RUN=<fix|nofix> PROBE_FEATURE=issues-r2 PROBE_AGENT=r2 ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/urn-resave-refused-already-in-use/neighbour.js
const {forEachApp, launch, signOut, record} = require('../../../probe');
const L = require('./lib');

const SUBS = {
    ojs: {first: 10, second: 9},
    omp: {first: 7, second: 4},
};

forEachApp(async (app) => {
    const subs = SUBS[app.name];
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!subs) { fact('surface', 'no URN plugin on this app'); record('nb-facts', facts); return; }
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `nb-${String(++n).padStart(2, '0')}-${x}`;
    const urn = `${L.PREFIX}u44r2n`;
    try {
        await L.signIn(page, 'rvaca');
        fact('pre: URN plugin set up', await L.setUpUrnPlugin(page, app, nm('pre')));
        await signOut(page);
        await L.signIn(page, 'dbarnes');
        for (const [label, sid] of [['first', subs.first], ['second', subs.second]]) {
            const s = await L.readSubmission(page, app, sid);
            const pid = s.publications[s.publications.length - 1].id;
            fact(`${label}: submission ${sid}, version ${pid}`, await L.openIdentifiers(page, app, sid, pid, nm(`${label}-identifiers`)));
            await L.typeUrn(page, urn);
            fact(`${label}: Save ${urn}`, await L.pressSave(page, nm(`${label}-save`)));
        }
        const stored = {};
        for (const sid of [subs.first, subs.second]) stored[sid] = (await L.readSubmission(page, app, sid)).publications.map((p) => ({id: p.id, urn: p.urn}));
        fact('stored', stored);
        await signOut(page);
    } finally {
        record('nb-facts', facts);
        await close();
    }
});
