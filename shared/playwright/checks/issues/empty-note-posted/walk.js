// Issue report U36 A10 + U38 A2: "Add Note" with an empty box posts an empty
// note, both in a submission's "Activity Log & Notes" window and in a file's
// "More Information" window.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   1-2   dbarnes opens the submission (OJS 4, OMP 3, OPS 1).
//   3-5   "Activity Log" › "Notes" › "Add Note" with the box empty.
//   6     "History".
//   7-9   OJS, OMP: "Submission Files" › the file's "More Actions" ›
//         "More Information"; OPS: "Galleys" › the "PDF" row's menu ›
//         "More Information"; "Notes" › "Add Note" with the box empty.
//   10    "History".
// Neighbour check (run with the fix in and out), in each window after the
// Steps: a box holding only spaces, then a note with text ("Checked u36r18"),
// which must still post with "Note posted.".
//
// On stable-3_5_0 (PKP_E2E_LINE=stable-3_5_0 in front of both commands) the
// OPS galley menu offers no "More Information": the file leg records the menu
// and stops there.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/empty-note-posted/walk.js
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops,
// reset the dataset, walk, then node bin/try-fix.js revert ojs omp ops.
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const SUBMISSION = {ojs: 4, omp: 3, ops: 1};
const FILE = {
    ojs: 'Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice.pdf',
    omp: 'chapter1.pdf',
    ops: 'PDF',
};
const TEXT = 'Checked u36r18';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {ActivityLogWindow} = require('../../../pages/ActivityLogPages.js');
    const {FileList} = require('../../../pages/SubmissionFilesPages.js');
    const {GalleyManager} = require('../../../pages/GalleysPages.js');
    const id = SUBMISSION[app.name];
    const facts = {app: app.name, line: app.line, dataset: app.dataset, submission: id, startedAt: new Date().toISOString()};
    facts.title = flat(sql(app, `SELECT ps.setting_value FROM submissions s JOIN publication_settings ps ON ps.publication_id = s.current_publication_id AND ps.setting_name = 'title' AND ps.locale = 'en' WHERE s.submission_id = ${id}`));
    facts.notesBefore = flat(sql(app, 'SELECT count(*) FROM notes'));

    const {page, close} = await launch(app);
    // Every "Add Note" save the page sends, with its answer.
    const saves = [];
    page.on('response', async (r) => {
        if (!/save-?note/i.test(r.url())) return;
        saves.push({status: r.status(), url: r.url().replace(/^.*index\.php/, ''), body: flat(await r.text().catch(() => '')).slice(0, 300)});
    });
    const snap = async (name, extra) => {
        const s = await screen(page);
        if (extra) Object.assign(s, extra);
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    };

    // Press "Add Note" with `text` typed (or nothing) in `panel`; report what came back.
    async function press(panel, label, text) {
        const before = saves.length;
        const box = panel.getByRole('textbox', {name: 'Add Note'});
        await box.fill(text);
        const answered = page.waitForResponse((r) => /save-?note/i.test(r.url()), {timeout: 8000}).catch(() => null);
        await panel.getByRole('button', {name: 'Add Note', exact: true}).click();
        await answered;
        await idle(page);
        await sleep(800);
        const read = await panel.evaluate((p) => {
            const vis = (e) => e.getClientRects().length > 0;
            const own = p.querySelector('#informationCenterNotes > .pkp_notes_list') || p.querySelector('.pkp_notes_list');
            return {
                notes: own ? [...own.querySelectorAll('.note')].map((n) => ({
                    user: (n.querySelector('.user') || {}).innerText?.trim(),
                    date: (n.querySelector('.date') || {}).innerText?.trim(),
                    text: ((n.querySelector('.message') || {}).innerText || '').trim(),
                    height: Math.round((n.querySelector('.message') || n).getBoundingClientRect().height),
                })) : [],
                empty: own && own.querySelector('.no_notes') ? own.querySelector('.no_notes').innerText.trim() : null,
                errors: [...p.querySelectorAll('label.error, .error, .pkp_form_error, [id$="-error"]')].filter(vis).map((e) => e.innerText.trim()).filter(Boolean),
                boxInvalid: (p.querySelector('textarea[name="newNote"]') || {}).getAttribute?.('aria-invalid') || null,
            };
        });
        const s = await snap(`${label}`, {read});
        return {typed: JSON.stringify(text), requests: saves.slice(before), notices: s.notices, ...read};
    }

    async function historyEvents(dialog) {
        const panel = dialog.getByRole('tabpanel', {name: 'History'});
        await panel.locator('tr.gridRow').first().waitFor({timeout: 30000});
        await idle(page);
        return (await panel.locator('tr.gridRow').allInnerTexts()).map(flat);
    }

    try {
        await signIn(page, 'dbarnes');
        const frame = new WorkflowPage(page, app.contextPath, app.name === 'ops' ? {labels: {publicationGroup: 'Preprint'}} : {});

        // Steps 2-6: the submission's notes.
        await frame.gotoEditorial(id);
        await idle(page);
        const log = new ActivityLogWindow(page, frame);
        await log.open();
        await log.selectTab('Notes');
        const notesPanel = log.panel('Notes');
        facts.submissionNotesBefore = flat(await notesPanel.locator('.pkp_notes_list').first().innerText());
        await snap('submission-notes-before');
        facts.submissionEmpty = await press(notesPanel, 'submission-empty', '');
        await log.selectTab('History');
        facts.submissionHistory = (await historyEvents(log.dialog())).slice(0, 4);
        await snap('submission-history');
        // Neighbour.
        await log.selectTab('Notes');
        facts.submissionSpaces = await press(notesPanel, 'submission-spaces', '   ');
        facts.submissionText = await press(notesPanel, 'submission-text', TEXT);
        await log.dialog().getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(log.dialog()).toHaveCount(0, {timeout: 30000});
        await sleep(700);

        // Steps 7-10: a file's notes.
        if (app.name === 'ops') {
            const pub = Number(sql(app, `SELECT current_publication_id FROM submissions WHERE submission_id = ${id}`).trim());
            const galleys = new GalleyManager(page, frame);
            if (app.line === 'stable-3_5_0') {
                // 3.5's menu keys differ: press "Galleys" under "Preprint" as a person does.
                await frame.gotoEditorial(id);
                await (await frame.revealPublicationEntry('Galleys')).click();
                await galleys.expectLoaded();
            } else {
                await galleys.open(id, pub);
            }
            facts.galleyMenu = await galleys.openMenu(FILE.ops);
            if (!facts.galleyMenu.includes('More Information')) {
                // 3.5's galley menu has no "More Information": no file window to walk.
                await galleys.closeMenu(FILE.ops);
                facts.fileWindow = 'not offered';
                return;
            }
            await galleys.choose('More Information');
        } else {
            await frame.gotoEditorial(id, {menuKey: 'workflow_1'});
            await idle(page);
            const list = new FileList(page, frame, 'Submission Files');
            await expect(list.row(FILE[app.name])).toBeVisible({timeout: 30000});
            await list.choose(list.row(FILE[app.name]), 'More Information');
        }
        const info = page.getByRole('dialog', {name: /^Information Center:/});
        await expect(info).toBeVisible({timeout: 30000});
        facts.fileWindow = await info.getAttribute('aria-label').catch(() => null)
            || flat(await info.getByRole('heading', {level: 1}).first().innerText().catch(() => ''));
        await info.getByRole('tab', {name: 'Notes', exact: true}).click();
        const filePanel = info.getByRole('tabpanel', {name: 'Notes'});
        await expect(filePanel.getByRole('button', {name: 'Add Note', exact: true})).toBeVisible({timeout: 30000});
        await idle(page);
        facts.fileNotesBefore = flat(await filePanel.locator('#informationCenterNotes > .pkp_notes_list').innerText().catch(() => ''));
        await snap('file-notes-before');
        facts.fileEmpty = await press(filePanel, 'file-empty', '');
        await info.getByRole('tab', {name: 'History', exact: true}).click();
        facts.fileHistory = (await historyEvents(info)).slice(0, 4);
        await snap('file-history');
        // Neighbour.
        await info.getByRole('tab', {name: 'Notes', exact: true}).click();
        await expect(filePanel.getByRole('button', {name: 'Add Note', exact: true})).toBeVisible({timeout: 30000});
        await idle(page);
        facts.fileSpaces = await press(filePanel, 'file-spaces', '   ');
        facts.fileText = await press(filePanel, 'file-text', TEXT);

        facts.notesAfter = sql(app, `SELECT assoc_type || ':' || assoc_id || ':' || coalesce(length(contents), -1) FROM notes ORDER BY note_id`).trim().split('\n');
    } catch (e) {
        facts.error = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
        await snap('failed').catch(() => {});
    } finally {
        record('facts', facts);
        await close();
    }
});
