// U71 OMP2: "Accept Submission" and "Create New Review Round" on an internal round carry none of
// the author's revised files (docs/issues/U71-OMP2-internal-round-revised-files-not-carried.md).
//
// On PKP's default test dataset for OMP, through the screens:
//   accept    submission 12 "Connecting ICTs to Development" (Internal Review Round 1, author lelder):
//             dbarnes "Request Revisions"; lelder "Upload revisions"; dbarnes "Accept Submission",
//             its "Select Files" page, "Record Decision", Copyediting's "Draft Files".
//   newround  submission 17 "Open Development: …" (Internal Review Round 1, author msmith): the same
//             with "Create New Review Round", then Round 2's "Files for Review".
// MODE=nb, the neighbour alone (External Review, which a fix must leave as it is), every step
// recorded, none throwing: the same two paths on submission 16 "A Designer's Log" (author mpower,
// "Accept Submission") and submission 2 "The West and Beyond" (author afinkel, "Create New Review
// Round").
// MODE=wr, the way round by hand: the steps, then on each target list "Upload/Select Files", "Show
// files from all accessible workflow stages.", the revision ticked, "OK", and the list read again.
//
// Run (the fleet freshly reset to the dataset):
//   PROBE_FEATURE=<dataset fleet's feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/internal-round-revised-files-not-carried/walk.js
//   MODE=nb PROBE_RUN=nb-out … the same command
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<the 3.5 fleet's feature> … the same command
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const NB = process.env.MODE === 'nb';
const WR = process.env.MODE === 'wr';
const CASES = NB
    ? [
        {key: 'nb-accept', id: 2 + 14, author: 'mpower', decision: 'Accept Submission', file: 'u71b-nb-revision.pdf', stageId: 3, target: {menuKey: 'workflow_4', table: 'Draft Files'}},
        {key: 'nb-newround', id: 2, author: 'afinkel', decision: 'Create New Review Round', file: 'u71b-nb-revision-2.pdf', stageId: 3, target: {newRound: true, table: 'Files for Review'}},
    ]
    : [
        {key: 'accept', id: 12, author: 'lelder', decision: 'Accept Submission', file: 'u71b-revision.pdf', stageId: 2, target: {menuKey: 'workflow_4', table: 'Draft Files'}},
        {key: 'newround', id: 17, author: 'msmith', decision: 'Create New Review Round', file: 'u71b-revision-2.pdf', stageId: 2, target: {newRound: true, table: 'Files for Review'}},
    ];

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // Internal Review is a press's stage; the neighbour's submissions are the press dataset's
    const {page, close} = await launch(app);
    const snap = async (name) => { record(name, await screen(page).catch((e) => ({error: String(e.message).slice(0, 200)}))); await shot(page, name).catch(() => {}); };
    const summary = {};
    try {
        for (const c of CASES) {
            const out = (summary[c.key] = {submission: c.id, decision: c.decision});
            try {
                const round1 = L.rounds(app, c.id).filter((r) => r.stageId === c.stageId).pop();
                out.round = round1;
                const key = L.roundKey(round1);

                // 1–2: the editor asks for revisions
                await signIn(page, 'dbarnes');
                await L.openWorkflow(page, app, c.id, {menuKey: key});
                out.before = await L.roundState(page);
                await snap(`${c.key}-1-round`);
                const rq = await L.pressDecision(page, 'Request Revisions', {choice: 0});
                out.requestWindows = rq.windows;
                if (!rq.onWizard) { out.stopped = 'Request Revisions did not open its pages'; out.request = rq; continue; }
                const req = await L.throughWizard(page);
                out.request = {pages: req.pages.map((p) => p.h1), requests: req.requests, done: req.done};

                // 3: the author uploads the revised file
                await signIn(page, c.author);
                await L.openWorkflow(page, app, c.id, {author: true, menuKey: key});
                const up = await L.uploadRevision(page, c.file);
                await L.openWorkflow(page, app, c.id, {author: true, menuKey: key});
                out.authorRevisions = await L.tableRows(page, 'Revisions Uploaded');
                await snap(`${c.key}-3-author-uploaded`);
                if (!up.offered) { out.stopped = 'the author has no "Upload revisions"'; continue; }

                // 4 / 7: the editor's decision, its "Select Files" page
                await signIn(page, 'dbarnes');
                await L.openWorkflow(page, app, c.id, {menuKey: key});
                out.revised = await L.roundState(page);
                out.editorRevisions = await L.tableRows(page, 'Revisions Uploaded');
                await snap(`${c.key}-4-round-revised`);
                const d = await L.pressDecision(page, c.decision);
                if (!d.onWizard) { out.stopped = `${c.decision} did not open its pages`; out.pressed = d; continue; }
                const w = await L.throughWizard(page, async (n, p) => { if ((p.lists || []).length) await snap(`${c.key}-5-select-files`); });
                out.selectFiles = L.selectFiles(w.pages);
                out.wizard = {pages: w.pages.map((p) => `${p.h1} | ${p.headings.join(' / ')}`), requests: w.requests, done: w.done};

                // 5 / 8: where the files should have arrived
                let menuKey = c.target.menuKey;
                if (c.target.newRound) {
                    const latest = L.rounds(app, c.id).filter((r) => r.stageId === c.stageId).pop();
                    out.newRound = latest;
                    menuKey = L.roundKey(latest);
                }
                await L.openWorkflow(page, app, c.id, {menuKey});
                out.target = {table: c.target.table, ...(await L.tableRows(page, c.target.table))};
                await snap(`${c.key}-6-target`);
                if (WR) {
                    out.byHand = await L.selectByHand(page, c.target.table, c.file);
                    await snap(`${c.key}-7-by-hand-window`);
                    await L.openWorkflow(page, app, c.id, {menuKey});
                    out.byHand.after = await L.tableRows(page, c.target.table);
                    await snap(`${c.key}-8-by-hand-target`);
                    console.log(`[${c.key}] by hand → ${JSON.stringify(out.byHand).slice(0, 1800)}`);
                }
                out.stored = L.storedFiles(app, c.id).filter((f) => /u71b/.test(f.name || ''));
            } catch (e) {
                out.error = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
                await snap(`${c.key}-error`);
            }
            const lists = (out.selectFiles || []).map((l) => `${l.title}: ${l.files.length ? l.files.map((f) => `${f.ticked ? '[x]' : '[ ]'} ${L.flat(f.text, 60)}`).join(', ') : L.flat(l.text, 80)}`);
            console.log(`[${c.key}] select files → ${JSON.stringify(lists)} | ${c.target.table} → ${JSON.stringify(out.target && (out.target.rows || out.target))}${out.stopped ? ` | STOPPED: ${out.stopped}` : ''}${out.error ? ` | ERROR: ${out.error}` : ''}`);
        }
    } finally {
        record(NB ? 'neighbour-summary' : WR ? 'way-round-summary' : 'summary', summary);
        await idle(page).catch(() => {});
        await close();
    }
});
