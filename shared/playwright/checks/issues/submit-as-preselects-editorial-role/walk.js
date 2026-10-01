// U21 OMP3 walk (issue report docs/issues/U21-OMP3-submit-as-preselects-editorial-role.md).
// On PKP's default test dataset: the Site Administrator gives dbarnes (Journal editor, Press
// editor, Preprint Server manager) the Author role in publicknowledge from its Settings wizard.
// dbarnes opens the start page three times and reads "Submit As" (the order and the selected
// role) each time, then presses "Begin Submission" leaving the selection as it is; the record
// names the role the form sent.
//   PROBE_FEATURE=issues-ir29 PROBE_AGENT=ir29 node bin/probe.js all shared/playwright/checks/issues/submit-as-preselects-editorial-role/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const H = require('../section-editor-submit-as-refused/lib.js');

forEachApp(async (app) => {
    const r = H.ROLES[app.name];
    const run = tag('u21ir29');
    const facts = {app: app.name, line: app.line || 'main', run, steps: {visits: []}};
    const {page, close} = await launch(app);
    try {
        // 1. admin gives dbarnes "Author"
        await signIn(page, 'admin');
        facts.steps.role = await H.giveRoleInContext(page, app, {username: 'dbarnes', role: 'Author'});
        await signOut(page);

        // 2-3. dbarnes opens the start page three times
        await signIn(page, 'dbarnes');
        for (let i = 1; i <= 3; i++) {
            await H.openStart(page, app);
            facts.steps.visits.push(await H.readSubmitAs(page));
            record(`omp3-0${i}-start-visit`, await screen(page));
        }

        // 4. "Begin Submission" with the selection left as it is
        await H.fillStart(page, {title: `${run} editor's own article`, section: r.section});
        facts.steps.begin = await H.pressBegin(page);
        record('omp3-04-begun', await screen(page));
        await signOut(page);
        facts.observed = {
            visits: facts.steps.visits.map((v) => v && `${v.options.join(' / ')} (checked: ${v.checked})`),
            begin: {status: facts.steps.begin.status, id: facts.steps.begin.id, answer: facts.steps.begin.answer},
            postedRole: facts.steps.begin.postedRole,
            editorRole: r.editor,
        };
    } finally {
        record('omp3-facts', facts);
        console.log(JSON.stringify(facts.observed || facts, null, 1));
        await close();
    }
});
