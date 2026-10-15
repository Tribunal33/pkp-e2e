// U21 A21 neighbour check (issue report docs/issues/U21-A21-submit-as-role-order-not-fixed.md),
// run with the fix in and out on a freshly loaded default dataset: dbarnes, given "Author" by the
// Site Administrator, opens "Make a Submission", leaves "Submit As" as it is, fills the form and
// presses "Begin Submission" (the wizard must open under the role selected); dbuskins (Section
// editor, Series editor, Moderator), given "Author" too, does the same (U21 A14's user: the role
// selected must be one "Begin Submission" accepts); an author account (Author only) opens the page
// (no "Submit As").
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> PROBE_RUN=nb-in node bin/probe.js all shared/playwright/checks/issues/submit-as-role-order-not-fixed/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const K = require('./lib.js');

forEachApp(async (app) => {
    const run = tag('hkk15');
    const facts = {app: app.name, line: app.line || 'main', run, steps: {}};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        facts.steps.authorGiven = await K.H.giveRoleInContext(page, app, {username: 'dbarnes', role: 'Author'});
        facts.steps.seAuthorGiven = await K.H.giveRoleInContext(page, app, {username: 'dbuskins', role: 'Author'});
        await signOut(page);

        await signIn(page, 'dbarnes');
        facts.steps.submitAs = await K.readStart(page, app);
        record('nb-01-dbarnes-start', await screen(page));
        await K.H.fillStart(page, {title: `${run} neighbour submission`, section: K.H.ROLES[app.name].section, submitAs: null});
        facts.steps.begin = await K.H.pressBegin(page).catch((e) => ({error: String(e.message || e).split('\n')[0]}));
        record('nb-02-dbarnes-begin', await screen(page));
        await signOut(page);

        await signIn(page, 'dbuskins');
        facts.steps.seSubmitAs = await K.readStart(page, app);
        record('nb-03-section-editor-start', await screen(page));
        await K.H.fillStart(page, {title: `${run} section editor neighbour`, section: K.H.ROLES[app.name].section, submitAs: null});
        facts.steps.seBegin = await K.H.pressBegin(page).catch((e) => ({error: String(e.message || e).split('\n')[0]}));
        record('nb-04-section-editor-begin', await screen(page));
        await signOut(page);

        await signIn(page, K.H.WORDS[app.name].author);
        facts.steps.authorOnly = await K.readStart(page, app).catch((e) => ({error: String(e.message || e).split('\n')[0]}));
        record('nb-05-author-only-start', await screen(page));
        await signOut(page);

        facts.observed = {
            submitAs: facts.steps.submitAs && {options: facts.steps.submitAs.options, checked: facts.steps.submitAs.checked},
            begin: {status: facts.steps.begin.status, postedRole: facts.steps.begin.postedRole, id: facts.steps.begin.id, error: facts.steps.begin.error},
            seSubmitAs: facts.steps.seSubmitAs && {options: facts.steps.seSubmitAs.options, checked: facts.steps.seSubmitAs.checked},
            seBegin: {status: facts.steps.seBegin.status, postedRole: facts.steps.seBegin.postedRole, id: facts.steps.seBegin.id, error: facts.steps.seBegin.error, answer: facts.steps.seBegin.answer},
            authorOnlySubmitAs: facts.steps.authorOnly,
        };
    } finally {
        record('nb-facts', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
