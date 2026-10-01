// Walk of U21 A5 (issue report docs/issues/U21-A5-copyright-agreed-log-raw-placeholder.md):
// as dbarnes, set a "Copyright Notice"; as the author, complete a submission ticking "Yes, I agree
// to the copyright statement."; as dbarnes, read the submission's "Activity Log". Control: the
// "Article submitted" ("Preprint submitted", "Initial submission completed.") row; neighbour: the
// "Revision "<file>" was uploaded" row keeps its file name (the fix leaves the file entries alone). On PKP's default test dataset, fleet reset first.
//   PROBE_FEATURE=issues-ir34 PROBE_AGENT=ir34 node bin/probe.js all shared/playwright/checks/issues/copyright-agreed-log-raw-placeholder/walk.js
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const H = require('./lib.js');

const NOTICE = 'Authors keep the copyright. u21ir34';

forEachApp(async (app) => {
    const w = H.WORDS[app.name];
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        facts.noticeSaved = await H.setCopyrightNotice(page, app, NOTICE);
        record('a5-1-copyright-notice', await screen(page));
        await signOut(page);

        await signIn(page, w.author);
        facts.id = await H.beginSubmission(page, app, app.contextPath, {title: 'u21ir34 copyright walk', section: w.section});
        facts.reviewBoxes = await H.completeWithCopyright(page, app, {series: w.series});
        record('a5-2-submission-complete', await screen(page));
        await signOut(page);

        await signIn(page, 'dbarnes');
        const {rows} = await H.activityLogRows(page, app, facts.id);
        record('a5-3-activity-log', await screen(page));
        facts.copyrightRow = rows.find((r) => /copyright terms/.test(r)) || null;
        facts.submittedRow = rows.find((r) => /(Article|Preprint) submitted$|Initial submission completed/.test(r)) || null;
        // neighbour: the file entries keep their own "{$filename}", which the fix must leave alone
        facts.revisionRow = rows.find((r) => /^.*Revision ".*" was uploaded for file/.test(r)) || null;
        facts.stored = H.storedCopyrightEntry(app, facts.id);
        await signOut(page);

        const expected = `${w.authorName} (${w.author}) agreed to the copyright terms for submission.`;
        facts.observed = {
            expected,
            reproduced: !!facts.copyrightRow && facts.copyrightRow.includes('{$filename}'),
            showsExpected: !!facts.copyrightRow && facts.copyrightRow.includes(expected),
            control: facts.submittedRow,
            neighbourFileNameShown: !!facts.revisionRow && !facts.revisionRow.includes('{$filename}') && !/Revision ""/.test(facts.revisionRow),
        };
    } finally {
        record('a5-facts', facts);
        console.log(JSON.stringify(facts));
        await close();
    }
});
