// pkp/pkp-lib#13565 PR review (2026-10-20): the add-on to U36/H19/h19.js for the
// fix of the 3.5 regression from pkp/pkp-lib#10268 (FileInformationCenterHandler
// without `use PKP\note\Note;`). h19 reads a copied file's "Notes" tab and types
// a note there without adding it; this adds one on the copy, reads it back after
// a reload and deletes it, as the editor `dbarnes` on a 3.5 DATASET fleet (PKP's
// default test dataset): the dataset's copied review file (OJS 19, OMP 2), the
// file h19's read phase opens. OPS has no "More Information" on its files.
//
// Run (mutates the fleet: reset it first):
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature pr13565 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=pr13565 PKP_E2E_DATASET=2 PROBE_AGENT=pr13565 PROBE_RUN=head \
//       node bin/probe.js ojs,omp shared/playwright/checks/sync/pkp-lib-10268/note-on-copy.js
// Fixed when on OJS and OMP: add.saveNote 200 with the note in add.own, the
// note's row in the database on the copy's id, reload.own with it and
// reload.earlierPresent true, del.deleteNote 200 and del.dbAfter 0.
const {forEachApp, launch, signIn, screen, shot, record, idle, sql, serverLog} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 800) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const SID = {ojs: 19, omp: 2};

forEachApp(async (app) => {
    if (!SID[app.name]) return;
    const {page, close} = await launch(app);
    const out = {app: app.name, line: app.line || 'main', dataset: app.dataset};
    const log = serverLog(app);
    const calls = [];
    page.on('response', (r) => {
        if (/information-center/.test(r.url())) calls.push({t: Date.now(), status: r.status(), method: r.request().method(), url: r.url().replace(/^.*\/index\.php/, '').replace(/\?.*$/, '')});
    });
    page.on('dialog', (d) => d.accept().catch(() => {}));
    const since = (t0) => calls.filter((c) => c.t >= t0).map(({t, ...c}) => c);
    const snap = async (name) => { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; };
    const wf = () => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
    const icWin = () => page.getByRole('dialog').filter({has: page.locator('.pkp_controllers_informationCenter')}).last();
    const fileRow = (id) => wf().locator('table tbody tr').filter({has: page.locator('td, th').filter({hasText: new RegExp(`^\\s*${id}\\s*$`)})}).first();
    const run = process.env.PROBE_RUN || 'x';
    const text = `pr13565 note on the copy ${run}`;

    const sid = SID[app.name];
    const [copyId, srcId, roundId, stageId] = sql(app, `select sf.submission_file_id, sf.source_submission_file_id, rrf.review_round_id, rr.stage_id from submission_files sf join review_round_files rrf on rrf.submission_file_id = sf.submission_file_id join review_rounds rr on rr.review_round_id = rrf.review_round_id where sf.submission_id = ${sid} and sf.source_submission_file_id is not null order by 1 limit 1`).split('|');
    out.target = {sid, copyId, srcId, roundId, stageId};
    const dbNotes = () => Number(sql(app, `select count(*) from notes where assoc_type = 515 and assoc_id = ${copyId} and contents like '%${text}%'`));

    const openNotes = async (key) => {
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=workflow_${stageId}_${roundId}`));
        await wf().waitFor({timeout: 30000}).catch(() => {});
        await idle(page); await sleep(800);
        await fileRow(copyId).waitFor({timeout: 20000});
        await fileRow(copyId).getByRole('button', {name: /More Actions/}).first().click(); await sleep(300);
        await page.getByRole('menuitem', {name: 'More Information', exact: true}).first().click();
        await icWin().waitFor({timeout: 30000}); await idle(page); await sleep(500);
        const resp = page.waitForResponse((x) => x.url().includes('view-notes'), {timeout: 30000}).catch(() => null);
        await icWin().getByRole('tab', {name: 'Notes', exact: true}).click();
        const r = await resp;
        await sleep(1500); await idle(page);
        await snap(key);
        return r && r.status();
    };
    const own = () => icWin().locator('#informationCenterNotes > .pkp_notes_list .note, #informationCenterNotes > .pkp_notes_list .no_notes').allInnerTexts().then((a) => a.map((s) => flat(s, 200))).catch(() => []);

    try {
        await signIn(page, 'dbarnes');
        // 1. add a note on the copy
        const add = {viewNotes: await openNotes('add-01-notes')};
        const box = icWin().locator('textarea[name="newNote"]');
        add.form = await box.count();
        if (add.form) {
            const t0 = Date.now(), lm = log.mark();
            await box.fill(text);
            const saved = page.waitForResponse((x) => x.url().includes('save-note'), {timeout: 30000}).catch(() => null);
            await icWin().locator('#newNoteForm').getByRole('button', {name: 'Add Note', exact: true}).click();
            const sv = await saved;
            add.saveNote = sv && sv.status();
            await sleep(1500); await idle(page);
            const s = await snap('add-02-saved');
            add.notices = s.notices;
            add.own = await own();
            add.traffic = since(t0);
            add.log = log.since(lm).slice(-4).map((l) => l.slice(0, 300));
        }
        add.db = dbNotes();
        out.add = add;
        await icWin().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(800);
        // 2. read it back after a reload
        const reload = {viewNotes: await openNotes('reload-01-notes')};
        reload.own = await own();
        reload.earlierPresent = (await icWin().locator('#showPastNotesLink').count()) > 0;
        out.reload = reload;
        // 3. delete it
        const del = {};
        const noteEl = icWin().locator('#informationCenterNotes > .pkp_notes_list .note').filter({hasText: text}).first();
        del.button = await noteEl.getByRole('button', {name: 'Delete', exact: true}).count();
        if (del.button) {
            const t0 = Date.now();
            const gone = page.waitForResponse((x) => x.url().includes('delete-note'), {timeout: 30000}).catch(() => null);
            await noteEl.getByRole('button', {name: 'Delete', exact: true}).click();
            await sleep(600);
            const confirm = page.getByRole('dialog').last().getByRole('button', {name: /^(OK|Yes|Delete)$/});
            await confirm.first().click({timeout: 10000}).catch((e) => { del.confirmErr = String(e).slice(0, 200); });
            const dr = await gone;
            del.deleteNote = dr && dr.status();
            await sleep(1500); await idle(page);
            await snap('del-01-after');
            del.own = await own();
            del.traffic = since(t0);
        }
        del.dbAfter = dbNotes();
        out.del = del;
        console.log(`[${app.name} ${out.line}] note-on-copy`, JSON.stringify(out).slice(0, 3000));
    } finally {
        record('note-on-copy', out);
        await close();
    }
});
