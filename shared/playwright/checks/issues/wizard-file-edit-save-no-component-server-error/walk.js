// U36 A11 issue walk: in the submission wizard, "Save" in "Edit {file name}" with no component chosen.
// Steps (docs/issues/U36-A11-wizard-file-edit-save-no-component-server-error.md), on the default dataset, OJS and OMP
// (a preprint server's "Upload Files" step has no such panel):
//   1 the author (OJS ccorino, OMP aclark) signs in; 2 "Make a Submission", "Begin Submission" (3.5: "Continue" to
//   "Upload Files"); 3 "Add File" with u36a-notes.txt; 4 "Other" on its row; 5 "Save" with no radio button chosen;
//   then a reload, to read what was stored. The failed save shows a page notice, read from screen()'s notices.
// MODE=neighbour: what a fix must leave alone, on a submission of its own. A file added and left with no component
//   stays; the row's own component link saves; "Other", a radio button, "Save" stores it; "Edit", another radio
//   button, "Save" changes it.
//
//   npm run fleet-prep -- --feature issues-u36a --dataset 1 --reset
//   PROBE_FEATURE=issues-u36a PROBE_AGENT=u36a node bin/probe.js ojs,omp shared/playwright/checks/issues/wizard-file-edit-save-no-component-server-error/walk.js
//   (MODE=neighbour in front for the neighbour check; PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5)
const {forEachApp, launch, screen, shot, record, serverLog} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const FILE = 'u36a-notes.txt';
const FILE2 = 'u36a-table.txt';

forEachApp(async (app) => {
    if (app.name === 'ops') { console.log('[u36a ops] no files panel in the wizard: not walked'); return; }
    const author = app.name === 'omp' ? 'aclark' : 'ccorino';
    const primary = app.name === 'omp' ? 'Book Manuscript' : 'Article Text';
    const other = app.name === 'omp' ? 'Prospectus' : 'Research Instrument';
    const o = {app: app.name, line: app.line || 'main', mode: MODE, author};
    const {page, close} = await launch(app);
    const log = serverLog(app);
    let n = 0;
    const snap = async (name, facts) => {
        const s = await screen(page).catch((e) => ({url: page.url(), error: L.flat(e.message)}));
        if (facts) s.facts = facts;
        const id = `${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    };
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: L.flat(e.message, 400)}; await snap(`${key}-threw`).catch(() => {}); }
        return o[key];
    };
    const stored = async (id) => (await require('../../../probe').sql(app, `select submission_file_id, genre_id from submission_files where submission_id = ${Number(id)} order by submission_file_id`));
    try {
        // 1–2
        o.submissionId = await L.startSubmission(page, app, app.baseURL, author, MODE === 'walk' ? 'u36a no component' : 'u36a neighbour');
        // 3
        await step('upload', async () => { const r = await L.panelUpload(page, L.smallFile(FILE)); return {status: r.status, body: r.body, row: await L.readRow(page, FILE)}; });
        await snap('uploaded');

        if (MODE === 'neighbour') {
            await step('upload2', async () => { const r = await L.panelUpload(page, L.smallFile(FILE2)); return {status: r.status, row: await L.readRow(page, FILE2)}; });
            // the row's own component link
            await step('componentLink', async () => {
                const answered = page.waitForResponse((r) => /\/submissions\/\d+\/files\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 10_000}).catch(() => null);
                await L.row(page, FILE).getByRole('button', {name: primary, exact: true}).click();
                const r = await answered;
                await L.sleep(1500);
                return {status: r ? r.status() : null, posted: r ? L.flat(r.request().postData(), 200) : null, row: await L.readRow(page, FILE)};
            });
            // "Other", a radio button, "Save"
            await step('otherChosen', async () => {
                const opened = await L.openEdit(page, FILE2, 'Other');
                await L.editWindow(page, FILE2).getByRole('radio', {name: other, exact: true}).check();
                const saved = await L.pressSave(page, FILE2);
                return {radios: opened.radios.map((x) => x.label), ...saved, row: await L.readRow(page, FILE2)};
            });
            await snap('other-chosen-saved');
            // "Edit", another radio button, "Save"
            await step('editChanged', async () => {
                const opened = await L.openEdit(page, FILE, 'Edit');
                await L.editWindow(page, FILE).getByRole('radio', {name: other, exact: true}).check();
                const saved = await L.pressSave(page, FILE);
                return {checkedOnOpen: opened.radios.filter((x) => x.checked).map((x) => x.label), ...saved, row: await L.readRow(page, FILE)};
            });
            await snap('edit-changed-saved');
            o.stored = await stored(o.submissionId);
            return;
        }

        // 4
        await step('other', () => L.openEdit(page, FILE, 'Other'));
        await snap('edit-window');
        // 5
        const from = log.mark();
        await step('save', () => L.pressSave(page, FILE));
        o.serverLog = log.since(from).slice(0, 8).map((x) => L.flat(x, 600));
        o.notices = (await snap('saved-nothing-chosen', o.save)).notices || [];   // the page notice shown on the failed save
        // what is left: the stored component, then a reload
        await step('after', async () => {
            const out = {};
            if (await L.errorWindow(page).isVisible().catch(() => false)) {
                await L.errorWindow(page).getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                await L.sleep(800);
            }
            out.editWindowOpenAfterOk = await L.editWindow(page, FILE).isVisible().catch(() => false);
            out.stored = await stored(o.submissionId);
            await page.reload();
            await L.panel(page).waitFor({timeout: L.T}).catch(() => {});
            await L.row(page, FILE).waitFor({timeout: 10_000}).catch(() => {});
            out.rowAfterReload = await L.readRow(page, FILE);
            return out;
        });
        await snap('reloaded');
    } catch (e) {
        o.error = L.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        record(`facts-${MODE}`, o);
        console.log(`[u36a ${app.name} ${MODE}]`, JSON.stringify(o).slice(0, 4000));
        await close();
    }
});
