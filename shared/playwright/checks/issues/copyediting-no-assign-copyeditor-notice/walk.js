// U71 OMP10 with U32 A6: a submission that reaches Copyediting by "Accept and Skip Review", by a
// press's "Accept Submission" on Internal Review, or back from Production shows its assigned editors
// no "Assign a copyeditor using the Assign link in the Participants list." notice
// (docs/issues/U71-OMP10-copyediting-no-assign-copyeditor-notice.md).
//
// On PKP's default test dataset, through the screens, as dbarnes (then each other assigned editor):
//   OJS  skip      submission 4 "Computer Skill Requirements…" (Submission): "Accept and Skip Review"
//        back      submission 5 "Genetic transformation of forest trees" (Production): back to Copyediting
//        control   submission 3 "The Facets Of Job Satisfaction…" (accepted from review in the dataset): read only
//   OMP  skip      submission 8 "Editorial" (Submission): "Accept and Skip Review"
//        internal  submission 6 "The Information Literacy User's Guide" (Internal Review): "Accept Submission"
//        back      submission 4 "How Canadians Communicate…" (Production): back to Copyediting
//        control   submission 7 "Accessible Elements…" (accepted from External Review in the dataset): read only
// MODE=nb, the neighbour alone (what a fix must leave as it is), every step recorded, none throwing:
//   OJS  submission 10 "Condensing Water Availability Models…": "Accept Submission" from review, read by
//        dbarnes (one box) and the author jnovak (none)
//   OMP  submission 9 "Enabling Openness…": "Send to External Review" from Internal Review (no copyediting
//        notice stored), then "Accept Submission" on External Review, read by the assigned dbuskins (one
//        box) and the author fperini (none)
//
// Run (the fleet freshly reset to the dataset):
//   PROBE_FEATURE=<dataset fleet's feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/copyediting-no-assign-copyeditor-notice/walk.js
//   MODE=nb PROBE_RUN=nb-out … the same command
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<the 3.5 fleet's feature> … the same command
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const NB = process.env.MODE === 'nb';
const BACK = /copyediting/i;
const CASES = {
    ojs: [
        {key: 'control', id: 3, readers: ['dbarnes']},
        {key: 'skip', id: 4, decisions: ['Accept and Skip Review'], readers: ['dbarnes', 'dbuskins']},
        {key: 'back', id: 5, decisions: [BACK], readers: ['dbarnes', 'dbuskins']},
    ],
    omp: [
        {key: 'control', id: 7, readers: ['dbarnes']},
        {key: 'skip', id: 8, decisions: ['Accept and Skip Review'], readers: ['dbarnes']},
        {key: 'internal', id: 6, decisions: ['Accept Submission'], readers: ['dbarnes', 'dbuskins']},
        {key: 'back', id: 4, decisions: [BACK], readers: ['dbarnes']},
    ],
};
const NEIGHBOURS = {
    ojs: [{key: 'nb-accept', id: 10, decisions: ['Accept Submission'], readers: ['dbarnes'], author: 'jnovak'}],
    omp: [{key: 'nb-external', id: 9, decisions: ['Send to External Review', 'Accept Submission'], readers: ['dbuskins'], author: 'fperini'}],
};

forEachApp(async (app) => {
    const cases = (NB ? NEIGHBOURS : CASES)[app.name];
    if (!cases) return; // a preprint server has no Copyediting stage
    const {page, close} = await launch(app);
    const snap = async (name) => { record(name, await screen(page).catch((e) => ({error: String(e.message).slice(0, 200)}))); await shot(page, name).catch(() => {}); };
    const summary = {};
    try {
        for (const c of cases) {
            const out = (summary[c.key] = {submission: c.id, stageBefore: L.stageOf(app, c.id), storedBefore: L.storedNotices(app, c.id)});
            try {
                await signIn(page, 'dbarnes');
                out.decisions = [];
                for (const d of c.decisions || []) {
                    await L.openWorkflow(page, app, c.id);
                    const done = await L.decide(page, d);
                    out.decisions.push({asked: String(d), ...done, stageAfter: L.stageOf(app, c.id), stored: L.storedNotices(app, c.id)});
                    if (done.absent || !done.done) { out.stopped = `"${d}" was not recorded`; break; }
                }
                if (out.stopped) { await snap(`${c.key}-stopped`); continue; }
                out.stageAfter = L.stageOf(app, c.id);
                out.readers = {};
                for (const who of c.readers) {
                    await signIn(page, who);
                    await L.openWorkflow(page, app, c.id);
                    const landing = await L.workflowNotices(page);
                    await snap(`${c.key}-${who}-landing`);
                    await page.reload();
                    await idle(page);
                    const reloaded = await L.workflowNotices(page);
                    out.readers[who] = {landing, reloaded: {boxes: reloaded.boxes, lines: reloaded.lines}};
                }
                if (c.author) {
                    await signIn(page, c.author);
                    await L.openWorkflow(page, app, c.id, {author: true});
                    out.author = {who: c.author, ...(await L.workflowNotices(page))};
                    await snap(`${c.key}-author`);
                }
                out.storedAfter = L.storedNotices(app, c.id);
            } catch (e) {
                out.error = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
                await snap(`${c.key}-error`);
            }
            const seen = Object.entries(out.readers || {}).map(([who, r]) => `${who}: ${JSON.stringify(r.landing.boxes)} / reload ${JSON.stringify(r.reloaded.boxes)}`).join(' ; ');
            console.log(`[${app.name} ${c.key} #${c.id}] stage ${out.stageBefore}→${out.stageAfter} | ${(out.decisions || []).map((d) => `${d.label || d.asked}: ${d.done ? L.flat(d.done, 50) : JSON.stringify(d).slice(0, 200)}`).join(' ; ')} | ${seen}${out.author ? ` | author ${out.author.who}: ${JSON.stringify(out.author.boxes)} ${JSON.stringify(out.author.lines)}` : ''} | stored ${JSON.stringify(out.storedAfter)}${out.stopped ? ` | STOPPED: ${out.stopped}` : ''}${out.error ? ` | ERROR: ${out.error}` : ''}`);
        }
    } finally {
        record(NB ? 'neighbour-summary' : 'summary', summary);
        await idle(page).catch(() => {});
        await close();
    }
});
