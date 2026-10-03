// Issue report docs/issues/U65-OMP3-monograph-report-columns-sized-by-other-presses.md (U65 OMP3):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"). OMP only ("Monograph Report" is OMP's; OJS's
// "Articles Report" sizes its columns from the journal's own submissions, OPS has neither).
// The kit builds nothing: the second press and its book are made on screen.
//
//   1  sign in as admin
//   2-3  Administration › "Hosted Presses" › "Create Press": "u65ir14 Press", path u65ir14
//   4  the new press's "Make a Submission": "u65ir14 One-author book", "Begin Submission"
//   5  "Upload Files": one "Book Manuscript" file (3.5 opens on "Details" first)
//   6  "Details": an abstract
//   7  "Contributors": "Add Contributor" Una u65ir14, role Author, "Save"
//   8  on to "Review"; "Submit", confirm
//   9-10  the new press's Statistics › "Reports" › "Monograph Report": the header row
//   control: "Public Knowledge Press"'s own "Monograph Report"
//
// Argument `neighbour` (runs alone, no steps): "Public Knowledge Press"'s "Monograph Report" on
// the untouched dataset, its header read, to compare with the fix in and out.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir14 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-ir14 PROBE_AGENT=ir14 node bin/probe.js omp shared/playwright/checks/issues/monograph-report-columns-sized-by-other-presses/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir14-3_5 PROBE_AGENT=ir14 node bin/probe.js omp <this file>
// Facts: .reports/<feature>/ir14/facts[-<run>]-omp.json (neighbour: neighbour[-<run>]-omp.json)
const {forEachApp, launch, signIn, signOut, screen, shot, record, outFile, note} = require('../../../probe');
const H = require('./lib.js');

const NEIGHBOUR = process.argv.includes('neighbour');
const PRESS = {name: 'u65ir14 Press', initials: 'U65IR14', path: 'u65ir14', email: 'u65ir14@mailinator.com'};
const BOOK = 'u65ir14 One-author book';
const CONTRIBUTOR = {given: 'Una', family: 'u65ir14', email: 'una.u65ir14@mailinator.com'};

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (NEIGHBOUR) {
        const facts = {line: app.line, dataset: app.dataset, mode: 'neighbour'};
        try {
            const r = await H.downloadMonographReport(app, 'admin', app.contextPath, 'nb-reports', outFile('neighbour-monographs.csv'));
            facts.file = r.file;
            facts.header = r.rows[0];
            facts.groups = H.columnGroups(r.rows);
        } catch (e) {
            facts.error = String(e && e.stack ? e.stack : e).slice(0, 1500);
        } finally {
            record('neighbour', facts);
            console.log(JSON.stringify({app: app.name, ...facts, header: undefined}, null, 1));
        }
        return;
    }

    const facts = {line: app.line, dataset: app.dataset, steps: {}};
    const {page, close} = await launch(app);
    try {
        // 1-3
        await signIn(page, 'admin');
        facts.steps.createPress = await H.createPress(page, app, PRESS);
        record('03-press-created', await screen(page));
        // 4
        facts.steps.bookId = await H.beginSubmission(page, app, PRESS.path, {title: BOOK, section: null});
        record('04-begun', await screen(page));
        // 5-8 (the steps as the rail orders them)
        facts.steps.wizard = await H.completeBook(page, app, {fileName: 'u65ir14-manuscript.txt', contributor: CONTRIBUTOR, abstract: 'An abstract for the u65ir14 walk.'});
        record('07-submitted', await screen(page));
        await shot(page, '07-submitted');
        await signOut(page);
    } catch (e) {
        facts.error = String(e && e.stack ? e.stack : e).slice(0, 1500);
        await shot(page, 'error').catch(() => {});
    } finally {
        await close();
    }
    try {
        // 9-10
        const r = await H.downloadMonographReport(app, 'admin', PRESS.path, '08-new-press-reports', outFile('new-press-monographs.csv'));
        facts.newPress = {file: r.file, header: r.rows[0], groups: H.columnGroups(r.rows)};
        // control
        const c = await H.downloadMonographReport(app, 'admin', app.contextPath, '10-control-reports', outFile('control-monographs.csv'));
        facts.control = {file: c.file, groups: H.columnGroups(c.rows)};
    } catch (e) {
        facts.reportError = String(e && e.stack ? e.stack : e).slice(0, 1500);
    }
    record('facts', facts);
    const g = facts.newPress && facts.newPress.groups;
    note(`U65 OMP3 ${app.line || 'main'}: new press authorGroups=${g && g.authorGroups} editorGroups=${g && g.editorGroups} decisionGroups=${g && g.decisionGroups}; control ${JSON.stringify(facts.control && {a: facts.control.groups.authorGroups, e: facts.control.groups.editorGroups, d: facts.control.groups.decisionGroups})}`);
    console.log(JSON.stringify({app: app.name, ...facts, newPress: facts.newPress && {...facts.newPress, header: undefined}, control: facts.control && {...facts.control, groups: {...facts.control.groups, lines: facts.control.groups.lines.length}}}, null, 1));
});
