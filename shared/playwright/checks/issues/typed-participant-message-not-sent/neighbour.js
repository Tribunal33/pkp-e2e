// U35 A3 + OMP1, the neighbour check of the proposed fix (fix.diff beside this file): the two paths the
// fix must leave alone, on another submission of the default dataset (lib.js WORDS.neighbour:
// OJS 8, OMP 6 on its Internal Review, OPS 1), as dbarnes:
//   emptyNotify  "Notify" on David Buskins's row with "Message" left empty: the window stays open with the
//                warning "Please ensure that you have filled out the message field…", no discussion
//   emptyAssign  "Assign", the role, "Search", the person, "Message" left empty, "OK": the person assigned
//                with "User added as a stage participant.", the Activity Log line, no discussion
// The path with a predefined message chosen is walk.js's control.
//
//   PROBE_RUN=out PROBE_FEATURE=issues-r1 PROBE_AGENT=r1 node bin/probe.js all shared/playwright/checks/issues/typed-participant-message-not-sent/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const w = L.WORDS[app.name];
    const n = w.neighbour;
    const facts = {app: app.name, submission: n.id};
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => {
        await d.accept().catch(() => {});
    });
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]));
    };
    try {
        await signIn(page, 'dbarnes');
        await step('emptyNotify', async () => {
            await L.openWorkflow(page, app, n.id, n.stage);
            const win = await L.openNotify(page, w.notify);
            const pressed = await L.press(page, win, 'Notify', /send-?notification/i, 'neighbour-empty-notify');
            await L.openWorkflow(page, app, n.id, n.stage);
            const d = await L.discussions(page);
            return {pressed: {status: pressed.status, answer: pressed.answer, windowOpen: pressed.windowOpen, notices: pressed.notices}, discussions: d && d.rows};
        });
        await step('emptyAssign', async () => {
            await L.openWorkflow(page, app, n.id, n.stage);
            const rowsBefore = await L.participants(page);
            const win = await L.openAssign(page);
            const listed = await L.chooseRoleAndPerson(page, win, n.role, n.assign);
            const pressed = await L.press(page, win, 'OK', /save-?participant/i, 'neighbour-empty-assign');
            await L.openWorkflow(page, app, n.id, n.stage);
            const rowsAfter = await L.participants(page);
            const d = await L.discussions(page);
            record('neighbour-reloaded', await screen(page));
            const activity = await L.activityLog(page, 4);
            return {listed, pressed: {status: pressed.status, windowOpen: pressed.windowOpen, notices: pressed.notices}, rowsBefore, rowsAfter, discussions: d && d.rows, activity};
        });
        await signOut(page).catch(() => {});
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
