// U05 OPS2: on a preprint server the Notifications tab's new-preprint row reads
// "A new preprint , "Title", has been submitted." with a space before the comma
// (docs/issues/U05-OPS2-preprint-submitted-row-space-before-comma.md). On PKP's default test dataset:
//
//   walk       (default) the report's Steps: dbarnes's profile "Notifications" tab, its rows read
//              (OJS and OMP the control: the journal's and the press's row)
//   neighbour  what the fix must leave alone: the same tab in French (fr_CA, whose OPS translation of
//              the row is empty), every row read, to compare with the fix in and out
//
//   PROBE_FEATURE=issues-u05e PROBE_AGENT=u05e node bin/probe.js all \
//     shared/playwright/checks/issues/preprint-submitted-row-space-before-comma/walk.js [walk|neighbour]
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const {tabSentences} = require('./lib.js');

const mode = process.argv[2] || 'walk';
const NEW_ROW = /^(A new (article|monograph|preprint)|(Un nouvel? |Une nouvelle ))/;

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode};
    const {page, close} = await launch(app);
    try {
        // 1. Sign in as dbarnes. 2. Profile, "Notifications". 3. Read the rows.
        await signIn(page, 'dbarnes');
        try {
            facts.sentences = await tabSentences(page, app, mode === 'neighbour' ? 'fr_CA' : null, `ops2-${mode}-tab`);
        } catch (e) {
            facts.failed = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
        }
        facts.newRow = (facts.sentences || []).find((s) => NEW_ROW.test(s || '')) || null;
        facts.spaceBeforeComma = (facts.sentences || []).filter((s) => / ,/.test(s || ''));
        console.log(`[${app.name}]`, JSON.stringify(facts));
        await signOut(page);
    } finally {
        record(`ops2-facts-${mode}`, facts);
        await close();
    }
});
