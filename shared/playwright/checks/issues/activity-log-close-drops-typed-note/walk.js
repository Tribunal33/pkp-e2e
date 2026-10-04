// U38 A3, A9, A10 walk (issue report docs/issues/U38-A3-A9-A10-activity-log-close-drops-typed-note.md).
// On PKP's default test dataset: dbarnes opens a submission with no note (OJS 4, OMP 3, OPS 1),
// "Activity Log" > "Notes", types a note and does not add it:
//   1-7   without a note: "Close" asks ("Cancel" keeps it); "History" asks, "OK"; "Close" on
//         "History" (A10: asks again); a reload.
//   8-11  with a note added on screen: a note typed, "Close" (A3: closes without asking); a
//         reload (A9: "Leave site?").
// MODE=neighbour: what a fix must leave alone, on a fresh load: N2 nothing typed, "Close" and a
// reload ask nothing; N1 typed, "History" asks and "Cancel" keeps the text; N3 a note added with
// "Add Note", then "Close" and a reload ask nothing; N4 with a note, "History" and back to
// "Notes" with nothing typed, "Close" asks nothing.
//
//   npm run fleet-prep -- --feature issues-u38a --dataset 1 --reset
//   PROBE_FEATURE=issues-u38a PROBE_AGENT=u38a node bin/probe.js all shared/playwright/checks/issues/activity-log-close-drops-typed-note/walk.js
//   (MODE=neighbour in front for the neighbour check; PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5)
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const DRAFT = 'Draft u38a';
const FIRST = 'First note u38a';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submissionId: c.submissionId, steps: {}};
    const {page, close} = await launch(app);
    const d = H.dialogs(page);
    const S = facts.steps;
    const step = async (key, fn) => {
        try { S[key] = await fn(); } catch (e) { S[key] = {threw: H.flat(e.message, 400)}; }
        return S[key];
    };
    const act = (label, fn, opts) => H.act(page, d, `${MODE}-${label}`, fn, opts);
    // "Activity Log" > "Notes" on a freshly opened workflow.
    const openLogNotes = async () => {
        await H.N.openWorkflow(page, app, c.submissionId);
        await H.N.openActivityLog(page);
        return H.N.openNotes(page);
    };
    const reload = (label) => act(label, () => page.reload(), {settle: true});
    try {
        facts.storedBefore = H.storedNotes(app, c.submissionId);
        await signIn(page, 'dbarnes');
        if (MODE === 'neighbour') {
            // N2: nothing typed, "Close", a reload.
            await step('n2-open', async () => H.flat(JSON.stringify(await openLogNotes()), 300));
            await step('n2-close', () => act('n2-close', () => H.pressClose(page), {answer: 'accept', settle: true}));
            await step('n2-reload', () => reload('n2-reload'));
            // N1: typed, "History": asks; "Cancel" keeps "Notes" and the text.
            await step('n1-open', async () => H.flat(JSON.stringify(await openLogNotes()), 300));
            await H.typeNote(page, DRAFT);
            await step('n1-history-cancel', () => act('n1-history-cancel', () => H.pressTab(page, 'History'), {answer: 'dismiss'}));
            await step('n1-leave', () => reload('n1-leave'));
            // N3: "Add Note" with text, then "Close", a reload.
            await step('n3-open', async () => H.flat(JSON.stringify(await openLogNotes()), 300));
            await step('n3-add', async () => { const r = await H.N.addNote(page, FIRST, `${MODE}-n3-add`); return {sent: r.sent, answer: r.answer, notices: r.notices}; });
            await step('n3-close', () => act('n3-close', () => H.pressClose(page), {answer: 'accept', settle: true}));
            await step('n3-reload', () => reload('n3-reload'));
            // N4: with a note, "History" and back to "Notes" with nothing typed, "Close".
            await step('n4-open', async () => H.flat(JSON.stringify(await openLogNotes()), 300));
            await step('n4-history', () => act('n4-history', () => H.pressTab(page, 'History'), {answer: 'accept'}));
            await step('n4-notes', () => act('n4-notes', () => H.pressTab(page, 'Notes'), {answer: 'accept'}));
            await step('n4-close', () => act('n4-close', () => H.pressClose(page), {answer: 'accept', settle: true}));
            await step('n4-reload', () => reload('n4-reload'));
        } else {
            // 1-3: the workflow, "Activity Log", "Notes", a note typed.
            await step('3-notes', async () => H.flat(JSON.stringify(await openLogNotes()), 300));
            await H.typeNote(page, DRAFT);
            // 4: "Close", answered "Cancel" (control).
            await step('4-close-cancel', () => act('4-close-cancel', () => H.pressClose(page), {answer: 'dismiss'}));
            // 5: "History", answered "OK".
            await step('5-history-ok', () => act('5-history-ok', () => H.pressTab(page, 'History'), {answer: 'accept'}));
            // 6: "Close" on "History" (A10); a question is answered "OK".
            await step('6-close', () => act('6-close', () => H.pressClose(page), {answer: 'accept', settle: true}));
            // 7: a reload with nothing typed.
            await step('7-reload', () => reload('7-reload'));
            // 8: a note added on screen.
            await step('8-notes', async () => H.flat(JSON.stringify(await openLogNotes()), 300));
            await step('8-add', async () => { const r = await H.N.addNote(page, FIRST, `${MODE}-8-add`); return {sent: r.sent, answer: r.answer, notices: r.notices, notes: r.notes.notes.map((n) => n.text)}; });
            // 9-10: a note typed, "Close" (A3); a question is answered "OK".
            await H.typeNote(page, DRAFT);
            S['9-typed'] = await H.state(page);
            await step('10-close', () => act('10-close', () => H.pressClose(page), {answer: 'accept', settle: true}));
            // 11: a reload (A9).
            await step('11-reload', () => reload('11-reload'));
            // Afterwards: "Notes" reopened, and the notes as stored.
            await step('12-reopened', async () => { const r = await openLogNotes(); return {notes: r.notes.map((n) => n.text), box: r.box && r.box.value}; });
        }
        facts.storedAfter = H.storedNotes(app, c.submissionId);
        await signOut(page).catch(() => {});
    } finally {
        facts.dialogs = d.list;
        record(`facts-${MODE}`, facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
