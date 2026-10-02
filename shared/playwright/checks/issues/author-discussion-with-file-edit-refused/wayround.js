// U37 A8, the way round's cost and "Add Task Details" (issue report
// docs/issues/U37-A8-author-discussion-with-file-edit-refused.md). On PKP's default test dataset for main,
// per app (lib.js WORDS), as the Author: steps 1–6 of the report (a discussion with an uploaded file), then
//   task     the row's "More Actions" › "Add Task Details": a due date a week ahead, the Author as owner, "Save"
//   reupload "Edit": the file's "Remove", the same file uploaded again ("Attach Files" › "Upload File"), "Save";
//            whether the removed file is still a file of the submission (its submission_files row)
//   again    "Edit" once more, the name changed, "Save" (the uploaded file is on the message again)
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/author-discussion-with-file-edit-refused/wayround.js
const {forEachApp, launch, signIn, record, sql} = require('../../../probe');
const {WORDS, helpers} = require('./lib.js');

const pad = (n) => String(n).padStart(2, '0');
const day = (n) => { const d = new Date(Date.now() + n * 86400000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

forEachApp(async (app) => {
    const w = WORDS[app.name];
    const facts = {app: app.name, line: app.line || 'main'};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]).slice(0, 4000));
    };
    const {page, close} = await launch(app);
    const h = helpers(app, page);
    const name = 'Author question u37r3';
    const fileIds = (answers) => (answers.join(' ').match(/submissionFileIds":\[([0-9,]*)\]/) || [])[1] || null;
    try {
        await signIn(page, w.author);
        await step('add', async () => {
            await h.open(w, true);
            const added = await h.add({name, participant: w.participant, message: 'Please see the attached file.', file: w.file, label: 'wr-add'});
            await h.open(w, true);
            return {closed: added.closed, item: await h.readItem(name, 'wr-item')};
        });
        await step('task', async () => {
            await h.open(w, true);
            return h.addTaskDetails(name, {due: day(7), owner: w.author, label: 'wr-task'});
        });
        await step('reupload', async () => {
            await h.open(w, true);
            const {w: win, files} = await h.openEdit(name);
            const oldId = (files || '').match(/Attach Files \| (\d+)/);
            await win.getByRole('button', {name: /Remove/}).first().click();
            await page.waitForTimeout(500);
            await h.attachUpload(win, w.file);
            const saved = await h.save(win, 'wr-reupload');
            if (!saved.closed) await h.cancel(win);
            const old = oldId ? oldId[1] : null;
            const row = old ? await sql(app, `select submission_file_id, file_stage, assoc_type, assoc_id from submission_files where submission_file_id = ${old}`) : null;
            await h.open(w, true);
            return {files, oldId: old, oldRow: row, saved, item: await h.readItem(name, 'wr-reupload-item')};
        });
        await step('again', async () => {
            await h.open(w, true);
            const {w: win, files} = await h.openEdit(name);
            await win.locator('input[name="title"]').fill(`${name} renamed`);
            const saved = await h.save(win, 'wr-again');
            if (!saved.closed) await h.cancel(win);
            return {files, sent: fileIds(saved.answers), saved};
        });
    } finally {
        record('wayround-facts', facts);
        await close();
    }
});
