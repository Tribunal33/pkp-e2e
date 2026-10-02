// U37 A29 walk (issue report docs/issues/U37-A29-add-window-file-missing-from-history.md).
// On PKP's default test dataset for main, dbarnes at Production of the submission in lib.js WORDS (OJS 5,
// OMP 4, OPS 1):
//   add      "Tasks & Discussions" › "Add": "u37r14 file at Add", the participant ticked, a message,
//            "Attach Files" › "Upload File" › figure.png › "Attach Files", "Save"; the row's "History"
//   reply    (control) the discussion's name › "Add New Message", a message, replacement.pdf uploaded the
//            same way, "Save", "Close"; "History"
//   remove   the row's "Edit": figure.png's "Remove", "Save"; "History"
//   PROBE_FEATURE=issues-u37r14 PROBE_AGENT=u37r14 node bin/probe.js all shared/playwright/checks/issues/add-window-file-missing-from-history/walk.js
//   (PROBE_RUN=fix in front for the walk with the fix applied.)
// On stable-3_5_0 (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u37r14-3_5 in front) the stage has
// the older "Production Discussions" grid: "Add discussion" with the participant, a subject, a message and
// "Upload File" (figure.png), "OK"; the row's actions and the query window read.
const {forEachApp, launch, signIn} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', words: L.WORDS[app.name]};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]).slice(0, 4000));
    };
    const name = 'u37r14 file at Add';
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        if (facts.line !== 'main') {
            await step('r35', () => L.walk35(page, app, {subject: name, message: 'Please see the attached file.', file: L.FIRST_FILE}));
            return;
        }
        const panel = await L.openPanel(page, app);
        await step('add', async () => {
            const added = await L.addItem(page, app, panel, {name, message: 'Please see the attached file.', file: L.FIRST_FILE, label: 'add'});
            return {...added, history: await L.readHistory(page, panel, name, 'add')};
        });
        await step('reply', async () => {
            const replied = await L.replyWithFile(page, app, panel, name, {message: 'A second file.', file: L.REPLY_FILE, label: 'reply'});
            return {...replied, history: await L.readHistory(page, panel, name, 'reply')};
        });
        await step('remove', async () => {
            const edited = await L.editItem(page, panel, name, {remove: L.FIRST_FILE, label: 'remove'});
            return {...edited, history: await L.readHistory(page, panel, name, 'remove')};
        });
    } finally {
        require('../../../probe').record('facts', facts);
        await close();
    }
});
