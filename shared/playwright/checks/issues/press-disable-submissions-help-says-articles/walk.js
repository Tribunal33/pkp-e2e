// Walk of U58 OMP1, first slip (issue report docs/issues/U58-OMP1-press-disable-submissions-help-says-articles.md):
// as rvaca, Settings › Workflow opens on "Submission" › "Disable Submissions"; read the help under the
// heading. OMP shows the fault ("new articles to the press"); OJS and OPS are the control.
// On PKP's default test dataset, fleet reset first.
//   PROBE_FEATURE=issues-u58f PROBE_AGENT=u58f node bin/probe.js all shared/playwright/checks/issues/press-disable-submissions-help-says-articles/walk.js
// Neighbour (WALK_MODE=nb, alone): the help's "press series" link address on the English page, and
// the same help in the French interface (fr_CA), to compare with the fix in and out.
const {forEachApp, launch, signIn, signOut, screen, record, note} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'rvaca');

        if (MODE === 'nb') {
            await H.openWorkflow(page, app);
            facts.en = await H.readDisableHelp(page);
            record('dis-nb-en', await screen(page));
            await H.openWorkflowInLocale(page, app, 'fr_CA', 'disableSubmissions');
            facts.fr = await H.readDisableHelp(page);
            record('dis-nb-fr', await screen(page));
            note(`u58f ${facts.line} nb ${app.name}: en link ${facts.en.helpLinkHref}; fr "${facts.fr.help}"`);
            record('dis-nb-facts', facts);
            return;
        }

        // 2
        try {
            await H.openWorkflow(page, app);
        } catch (e) {
            facts.openError = String(e.message).slice(0, 300);
        }
        record('dis-s2-workflow-settings', await screen(page));

        // 3
        facts.disable = await H.readDisableHelp(page);
        note(`u58f ${facts.line} ${MODE} ${app.name}: ${facts.disable.selectedSideTab} | ${facts.disable.help}`);
        record('disable-facts', facts);
        await signOut(page);
    } finally {
        await close();
    }
});
