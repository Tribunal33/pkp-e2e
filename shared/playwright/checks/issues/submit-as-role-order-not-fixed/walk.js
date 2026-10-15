// U21 A21 walk (issue report docs/issues/U21-A21-submit-as-role-order-not-fixed.md).
// On PKP's default test dataset: the Site Administrator gives dbarnes (Journal editor, Press
// editor, Preprint Server manager) the Author role in publicknowledge from its Settings wizard;
// dbarnes reads "Submit As" on "Make a Submission"; rvaca (admin on OPS) changes "Consider role
// in masthead list" on dbarnes's editorial role (Settings > Users & Roles > Roles) and changes it
// back, leaving the role as it was; dbarnes reads "Submit As" again.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/submit-as-role-order-not-fixed/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const K = require('./lib.js');

forEachApp(async (app) => {
    const role = K.EDITOR_ROLE[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: tag('hkk15'), steps: {}};
    const {page, close} = await launch(app);
    try {
        // 1-3. admin gives dbarnes "Author"
        await signIn(page, 'admin');
        facts.steps.authorGiven = await K.H.giveRoleInContext(page, app, {username: 'dbarnes', role: 'Author'});
        record('01-author-given', await screen(page));
        await signOut(page);

        // 4. dbarnes reads "Submit As"
        await signIn(page, 'dbarnes');
        facts.steps.before = await K.readStart(page, app);
        record('02-submit-as-before', await screen(page));
        await signOut(page);
        facts.storageBefore = K.storageOrder(app);

        // 5-6. rvaca (OPS: admin) changes "Consider role in masthead list" on the editorial role, then changes it back
        await signIn(page, K.ROLE_EDITOR[app.name], {contextPath: app.contextPath});
        facts.steps.untick = await K.setMasthead(page, app, role, null);
        record('03-masthead-changed', await screen(page));
        facts.steps.tick = facts.steps.untick.blocked ? 'not taken' : await K.setMasthead(page, app, role, !facts.steps.untick.after);
        record('04-masthead-changed-back', await screen(page));
        await signOut(page);
        facts.storageAfter = K.storageOrder(app);

        // 7. dbarnes reads "Submit As" again
        await signIn(page, 'dbarnes');
        facts.steps.after = await K.readStart(page, app);
        record('05-submit-as-after', await screen(page));
        await signOut(page);

        const pick = (s) => s && {options: s.options, checked: s.checked};
        facts.observed = {
            before: pick(facts.steps.before),
            roleEdit: facts.steps.untick.blocked ? {blocked: facts.steps.untick.blocked} : {change: [facts.steps.untick.before, facts.steps.untick.after, facts.steps.untick.status], back: [facts.steps.tick.after, facts.steps.tick.status], listAfter: facts.steps.tick.listAfter},
            after: pick(facts.steps.after),
            same: JSON.stringify(pick(facts.steps.before)) === JSON.stringify(pick(facts.steps.after)),
        };
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
