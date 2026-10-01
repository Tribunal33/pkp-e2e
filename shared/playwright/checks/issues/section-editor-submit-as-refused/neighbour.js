// U21 A14 neighbour check (issue report docs/issues/U21-A14-section-editor-submit-as-refused.md):
// the fix must leave an editor's own editorial role alone. On PKP's default test dataset the
// Site Administrator gives dbarnes (Journal editor, Press editor, Preprint Server manager) the
// Author role; dbarnes opens the start page, reads "Submit As", chooses the editorial role and
// presses "Begin Submission", which must still create the submission.
//   PROBE_FEATURE=issues-ir29 PROBE_AGENT=ir29 node bin/probe.js all shared/playwright/checks/issues/section-editor-submit-as-refused/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const r = H.ROLES[app.name];
    const run = tag('u21ir29');
    const facts = {app: app.name, line: app.line || 'main', run, steps: {}};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        facts.steps.role = await H.giveRoleInContext(page, app, {username: 'dbarnes', role: 'Author'});
        await signOut(page);

        await signIn(page, 'dbarnes');
        await H.openStart(page, app);
        facts.steps.submitAs = await H.readSubmitAs(page);
        record('n1-start', await screen(page));
        await H.fillStart(page, {title: `${run} editor's own submission`, section: r.section, submitAs: r.editor});
        facts.steps.editorial = await H.pressBegin(page);
        record('n2-begin-editorial', await screen(page));
        await signOut(page);
        facts.observed = {
            submitAs: facts.steps.submitAs && {options: facts.steps.submitAs.options, checked: facts.steps.submitAs.checked},
            editorial: {status: facts.steps.editorial.status, postedRole: facts.steps.editorial.postedRole, id: facts.steps.editorial.id, answer: facts.steps.editorial.answer},
        };
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
