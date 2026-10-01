// U21 A14 walk (issue report docs/issues/U21-A14-section-editor-submit-as-refused.md).
// On PKP's default test dataset: the Site Administrator gives dbuskins (Section editor,
// Series editor, Moderator) the Author role in publicknowledge from its Settings wizard.
// dbuskins opens the start page, reads "Submit As", chooses the editorial role and presses
// "Begin Submission", then chooses "Author" and presses it again.
//   PROBE_FEATURE=issues-ir29 PROBE_AGENT=ir29 node bin/probe.js all shared/playwright/checks/issues/section-editor-submit-as-refused/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const r = H.ROLES[app.name];
    const run = tag('u21ir29');
    const facts = {app: app.name, line: app.line || 'main', run, steps: {}};
    const {page, close} = await launch(app);
    try {
        // 1-3. admin gives dbuskins "Author"
        await signIn(page, 'admin');
        facts.steps.role = await H.giveRoleInContext(page, app, {username: 'dbuskins', role: 'Author'});
        record('01-role-given', await screen(page));
        await signOut(page);

        // 4-5. dbuskins opens the start page and reads "Submit As"
        await signIn(page, 'dbuskins');
        await H.openStart(page, app);
        facts.steps.submitAs = await H.readSubmitAs(page);
        record('02-start', await screen(page));

        // 6. the editorial role, "Begin Submission"
        const offered = facts.steps.submitAs && facts.steps.submitAs.options.includes(r.se);
        await H.fillStart(page, {title: `${run} section editor submission`, section: r.section, submitAs: offered ? r.se : null});
        facts.steps.editorial = offered ? await H.pressBegin(page) : 'not offered';
        record('03-begin-editorial', await screen(page));

        // 7. "Author", "Begin Submission"
        if (offered) {
            await H.fillStart(page, {title: `${run} author submission`, section: r.section, submitAs: 'Author'});
        }
        facts.steps.author = await H.pressBegin(page);
        record('04-begin-author', await screen(page));
        await signOut(page);
        facts.observed = {
            submitAs: facts.steps.submitAs && {options: facts.steps.submitAs.options, checked: facts.steps.submitAs.checked},
            editorial: offered ? {status: facts.steps.editorial.status, answer: facts.steps.editorial.answer, error: facts.steps.editorial.error, id: facts.steps.editorial.id} : 'not offered',
            author: {status: facts.steps.author.status, id: facts.steps.author.id},
        };
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
