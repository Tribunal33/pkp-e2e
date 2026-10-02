// U36 A10 / U38 A2 walk (issue report docs/issues/U36-A10-add-note-empty-box-posts-empty-note.md).
// On PKP's default test dataset: dbarnes opens a submission (OJS 4, OMP 3, OPS 1), opens a file's
// "More Information" > "Notes" (OPS: the "PDF" galley's, under "Galleys") and presses "Add Note"
// with the box empty, reads "History"; then the same in the header's "Activity Log" > "Notes".
// MODE=neighbour: what a fix must leave alone. In both windows "Checked u36d" typed in the box
// is posted by "Add Note", and the note's "Delete" removes it.
//
//   npm run fleet-prep -- --feature issues-u36d --dataset 2 --reset
//   PROBE_FEATURE=issues-u36d PROBE_AGENT=u36d node bin/probe.js all shared/playwright/checks/issues/add-note-empty-box-posts-empty-note/walk.js
//   (MODE=neighbour in front for the neighbour check; PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5)
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const TEXT = 'Checked u36d';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submissionId: c.submissionId};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) { facts[key] = {threw: H.flat(e.message, 400)}; record(`${MODE}-${key}-threw`, await screen(page).catch(() => ({}))); }
        return facts[key];
    };
    // One window's leg: "Notes", "Add Note" (empty, or with the text and then "Delete"), "History".
    const leg = async (name) => {
        const out = {};
        out.before = await H.openNotes(page);
        if (MODE === 'neighbour') {
            out.add = await H.addNote(page, TEXT, `nb-${name}-1-added`);
            out.history = (await H.openHistory(page, `nb-${name}-2-history`)).slice(0, 3);
            await H.openNotes(page);
            out.del = await H.deleteFirstNote(page, `nb-${name}-3-deleted`).catch((e) => ({threw: H.flat(e.message, 300)}));
        } else {
            out.add = await H.addNote(page, '', `${name}-1-add-empty`);
            out.history = (await H.openHistory(page, `${name}-2-history`)).slice(0, 3);
        }
        return out;
    };
    try {
        facts.storedBefore = {notes: H.storedNotes(app), log: H.storedLog(app)};
        // 1–2
        await signIn(page, 'dbarnes');
        await H.openWorkflow(page, app, c.submissionId);
        if (c.galleys) {
            await step('galleys', () => H.openGalleys(page));
        }
        // 3–6: a file's notes
        await step('fileWindow', () => H.openMoreInformation(page, c.row));
        await step('file', () => leg('file'));
        // 7–10: the submission's notes
        await H.closeTop(page).catch(() => {});
        await H.openWorkflow(page, app, c.submissionId);
        await step('logWindow', () => H.openActivityLog(page));
        await step('submission', () => leg('submission'));
        await H.closeTop(page).catch(() => {});
        facts.storedAfter = {notes: H.storedNotes(app), log: H.storedLog(app)};
        await signOut(page).catch(() => {});
    } finally {
        record(`facts-${MODE}`, facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
