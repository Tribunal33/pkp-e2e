// Walk of U58 OMP1, second slip (issue report docs/issues/U58-OMP1-press-copyright-notice-label-lowercase.md):
// as rvaca, Settings › Workflow › "Submission" › "Author Guidance": read the box labels; save a copyright
// notice; open About › "Submissions" and read the heading over it. OMP shows the fault ("Copyright
// notice"); OJS and OPS are the control. On PKP's default test dataset, fleet reset first.
//   PROBE_FEATURE=issues-u58f PROBE_AGENT=u58f node bin/probe.js all shared/playwright/checks/issues/press-copyright-notice-label-lowercase/walk.js
// Neighbour (WALK_MODE=nb, alone, nothing saved): the copyright box's label in the French interface
// (fr_CA), and the title of the sample copyright wording page reached by its address
// (information/sampleCopyrightWording, which reads the same text), to compare with the fix in and out.
const {forEachApp, launch, signIn, signOut, screen, record, note} = require('../../../probe');
const H = require('./lib.js');

const NOTICE = 'u58f copyright notice: authors keep the copyright.';
const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'rvaca');

        if (MODE === 'nb') {
            await H.openWorkflowInLocale(page, app, 'fr_CA', 'instructions');
            facts.fr = await H.readGuidanceLabels(page);
            record('cr-nb-fr', await screen(page));
            facts.sample = await H.readTypedPage(page, app, 'information/sampleCopyrightWording');
            record('cr-nb-sample', await screen(page));
            note(`u58f ${facts.line} nb ${app.name}: fr "${facts.fr.copyrightLabel}"; sample ${facts.sample.status} "${facts.sample.title}"`);
            record('cr-nb-facts', facts);
            return;
        }

        // 2-3
        let w = null;
        try {
            w = await H.openWorkflow(page, app);
            await w.openSideTab('Author Guidance');
        } catch (e) {
            facts.openError = String(e.message).slice(0, 300);
        }
        facts.guidance = await H.readGuidanceLabels(page);
        record('cr-s3-author-guidance', await screen(page));

        // 4
        try {
            facts.saved = await H.saveCopyrightNotice(page, app, NOTICE);
        } catch (e) {
            facts.saveError = String(e.message).slice(0, 300);
        }
        record('cr-s4-saved', await screen(page));

        // 5
        try {
            facts.submissionsHeadings = await H.submissionsHeadings(page, app);
        } catch (e) {
            facts.submissionsError = String(e.message).slice(0, 300);
        }
        record('cr-s5-submissions-page', await screen(page));

        note(`u58f ${facts.line} ${MODE} ${app.name}: box "${facts.guidance.copyrightLabel}"; page headings ${JSON.stringify(facts.submissionsHeadings)}`);
        record('copyright-facts', facts);
        await signOut(page);
    } finally {
        await close();
    }
});
