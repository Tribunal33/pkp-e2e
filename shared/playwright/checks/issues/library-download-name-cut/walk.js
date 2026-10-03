// U39 A4: a Publisher Library file whose uploaded name holds its extension's letters earlier on,
// or is long, downloads under a cut name. The Steps, on PKP's default test dataset, signed in as
// `dbarnes`, Settings › Workflow › "Publisher Library" ("Press Library", "Preprint Server Library"):
//   3-6  "Add a file" four times, Type "Marketing": "u39e notes" (notes-pdf-draft.pdf),
//        "u39e guide" (pdf-guide.pdf), "u39e minutes" (a 134-character name), "u39e contract"
//        (contract.pdf, the control)
//   7-8  press each name; the download's name, size and Content-Disposition are recorded
// `nb` as the argument runs the neighbour check alone (for a fix trial): names the fix must leave
// as they are: "contract.pdf" twice as "Marketing" (contract-MAR.pdf, then contract-MAR-1.pdf) and
// "report.v2.final.pdf" as "Reports" (report.v2.final-REP.pdf); plus the long name twice as
// "Other", whose second copy takes the numbered branch of the same code.
// The kit builds nothing; the files are added through the screen (copies of the app's fixture PDF).
//
// Reset first: PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:         PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<r>] node bin/probe.js all shared/playwright/checks/issues/library-download-name-cut/walk.js [nb]
const {forEachApp, launch, signIn, record, screen, shot} = require('../../../probe');
const {openPublisherLibrary} = require('../library-download-redraws-list/lib.js');
const L = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const LONG = 'Minutes-of-the-editorial-board-meeting-on-the-open-access-policy-the-article-processing-charges-and-the-new-review-guidelines-2026.pdf';

const PLAN = {
    walk: [
        {name: 'u39e notes', type: 'Marketing', file: 'notes-pdf-draft.pdf'},
        {name: 'u39e guide', type: 'Marketing', file: 'pdf-guide.pdf'},
        {name: 'u39e minutes', type: 'Marketing', file: LONG},
        {name: 'u39e contract', type: 'Marketing', file: 'contract.pdf'},
    ],
    nb: [
        {name: 'u39e c1', type: 'Marketing', file: 'contract.pdf'},
        {name: 'u39e c2', type: 'Marketing', file: 'contract.pdf'},
        {name: 'u39e report', type: 'Reports', file: 'report.v2.final.pdf'},
        {name: 'u39e long1', type: 'Other', file: LONG},
        {name: 'u39e long2', type: 'Other', file: LONG},
    ],
}[MODE];

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line, mode: MODE, uploaded: {}, downloaded: {}};
    const fact = (k, v) => { console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 600)); };
    const {files, bytes} = L.makeUploads(app, [...new Set(PLAN.map((p) => p.file))]);
    facts.fixtureBytes = bytes;
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const list = await openPublisherLibrary(page, app);
        for (const p of PLAN) {
            const r = await L.addFile(list, {name: p.name, type: p.type, file: files[p.file]});
            facts.uploaded[p.name] = {file: p.file, fileLength: p.file.length, type: p.type, ...r};
            fact(`add ${p.name}`, facts.uploaded[p.name]);
        }
        record('screen-list', await screen(page));
        await shot(page, 'list');
        for (const p of PLAN) {
            const r = await L.downloadRead(page, list, p.name);
            facts.downloaded[p.name] = r;
            fact(`download ${p.name}`, r);
        }
    } finally {
        record(MODE === 'walk' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
