// Neighbour check for spec U44 register OMP4: the cases where the press's publish confirmation must keep its table.
// On a fresh load of PKP's default test dataset, as `rvaca`, for each "Press Content" choice below: the URN
// plugin's "Settings" with exactly those boxes ticked (the walk's settings otherwise), "Save"; then submission 4 ›
// Publication › "Publish", read the URN part of the confirmation window, close it without publishing.
//   "Monographs" and "Publication Formats": table, a "Publication" row and "Publication Format: PDF".
//   "Monographs" and "Chapters": table, a "Publication" row and one "Chapter: …" row per chapter.
//   "Publication Formats" alone: table, the format row only.
// Walked with the fix in and out: the three must read the same.
// Run: PROBE_FEATURE=issues-r32 PROBE_AGENT=r32 node bin/probe.js omp shared/playwright/checks/issues/press-publish-urn-table-instead-of-sentence/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const SID = 4;
const CASES = [
    ['n-01-monographs-formats', ['Monographs', 'Publication Formats']],
    ['n-02-monographs-chapters', ['Monographs', 'Chapters']],
    ['n-03-formats-only', ['Publication Formats']],
];

forEachApp(async (app) => {
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    if (app.name !== 'omp') { fact('surface', 'not a press'); record('n-facts', facts); return; }
    const {page, close} = await launch(app);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)));
    try {
        await signIn(page, 'rvaca');
        const pid = (await L.readSubmission(page, app, SID)).currentPublicationId;
        for (const [name, kinds] of CASES) {
            const s = await L.trySave(page, app, kinds, `${name}-settings`);
            fact(`${name} settings`, {kinds, saveStatus: s.saveStatus, windowOpen: s.windowOpen, reopened: s.reopened});
            const w = await L.publishWindow(page, app, SID, pid, `${name}-publish`);
            fact(`${name} publish window`, {tables: w.urnPart.tables, warnings: w.urnPart.warnings, urnSentence: w.urnPart.urnSentence, closed: w.closed});
        }
    } finally {
        fact('page errors', errors);
        record('n-facts', facts);
        await close();
    }
});
