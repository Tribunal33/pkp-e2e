// U35 A10 neighbour check (issue report docs/issues/U35-A10-role-limited-message-template-not-sent.md):
// the fix must not offer a role-limited template to someone outside its roles. On PKP's default
// test dataset dbarnes limits the stage's discussion template to "Author" (when the walk has not),
// and reads the "Notify" list on a submission dbuskins is assigned to (OJS 5 and OPS 1 in
// Production; OMP 1 in Copyediting, "Discussion (Copyediting)"); then dbuskins (Section editor,
// Series editor, Moderator; not an Author) reads the same list, which must not hold the template.
//   PROBE_FEATURE=issues-r2 PROBE_AGENT=r2 node bin/probe.js all shared/playwright/checks/issues/role-limited-message-template-not-sent/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const H = require('../added-message-template-not-sent/lib.js');

forEachApp(async (app) => {
    const s = H.APPS[app.name].se;
    const facts = {app: app.name, line: app.line || 'main', steps: {}};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        facts.steps.limited = await H.limitTemplate(page, app, {stage: s.stage, name: s.template, role: 'Author'});
        let panel = await H.openStage(page, app, s.id, s.menuKey);
        let win = await H.openNotify(page, panel, s.person);
        facts.steps.editor = await H.options(win);
        record('n1-editor-list', await screen(page));
        await signOut(page);

        await signIn(page, 'dbuskins');
        panel = await H.openStage(page, app, s.id, s.menuKey);
        win = await H.openNotify(page, panel, s.person);
        facts.steps.sectionEditor = await H.options(win);
        record('n2-section-editor-list', await screen(page));
        await signOut(page);
        facts.observed = {
            template: s.template,
            wasLimited: facts.steps.limited.wasLimited,
            editorList: facts.steps.editor,
            sectionEditorList: facts.steps.sectionEditor,
            offeredToSectionEditor: facts.steps.sectionEditor.includes(s.template),
        };
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
