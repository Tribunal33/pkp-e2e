// U37 A9, the "Assign Participant" route (AddParticipantForm ends in the same sendMessage() as "Notify").
// On PKP's default test dataset, the Production stage of the app's submission (OJS 5, OMP 4, OPS 1):
//   editor  dbarnes "Assign"s a person not on the stage with "Discussion (Production)" and "u37r5 assign
//           message"; "Edit" › Name "u37r5 renamed" › "Save"; the window read; "Edit" › message
//           "u37r5 edited text" › "Save"; the window read
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/sync/pkp-lib-13506/assign.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const L = require('./lib.js');

/** Per app: a role of the Production stage and a person who holds it, not assigned to the walk's submission. */
const ASSIGN = {
    ojs: {role: 'Layout Editor', person: 'Stephen Hellier'},
    omp: {role: 'Layout Editor', person: 'Stephen Hellier'},
    ops: {role: 'Moderator', person: 'Minoti Inoue'},
};

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const a = ASSIGN[app.name];
    const facts = {app: app.name, line: app.line || 'main', ...a};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]));
    };
    const {page, close} = await launch(app);
    try {
        const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
        const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
        const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: L.PANEL});
        await signIn(page, 'dbarnes');
        await step('assign', async () => {
            await L.P.openWorkflow(page, app, w.id, w.stage);
            const win = await new ParticipantsPanel(page, app.contextPath).openAssign();
            await win.chooseRole(a.role);
            await win.search(a.person);
            await win.choosePerson(a.person);
            await win.chooseTemplate(w.template);
            await win.typeMessage('u37r5 assign message');
            record('assign-filled', await screen(page));
            await win.ok();
            await idle(page);
            return {ok: true};
        });
        await step('rename', async () => {
            await panel.gotoEditorial(w.id, w.stage);
            const saved = await L.editAndSave(page, panel, w.template, {name: 'u37r5 renamed'}, 'a-rename');
            return {...saved, messages: await L.readMessages(page, panel, 'u37r5 renamed', 'a-rename-window')};
        });
        await step('retext', async () => {
            const saved = await L.editAndSave(page, panel, 'u37r5 renamed', {message: 'u37r5 edited text'}, 'a-retext');
            return {...saved, messages: await L.readMessages(page, panel, 'u37r5 renamed', 'a-retext-window')};
        });
        await signOut(page).catch(() => {});
    } finally {
        record('assign', facts);
        await close();
    }
});
