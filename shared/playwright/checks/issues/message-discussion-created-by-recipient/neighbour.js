// Neighbour check for docs/issues/U35-A5-message-discussion-created-by-recipient.md:
// a discussion an editor adds from the stage's discussions panel ("Add") is
// listed as created by that editor, with the fix in and out (the fix touches
// only the discussion a "Participants" message opens). Main only (the Vue
// panel), on a dataset fleet, OJS, OMP and OPS:
//   dbarnes, the submission's stage, "<Stage> Tasks & Discussions" › "Add",
//   a name, one participant ticked, a message, "Save"; read the new row.
// Run: PROBE_FEATURE=issues-w33 PROBE_AGENT=w33 PROBE_RUN=<fix|nofix> node bin/probe.js all shared/playwright/checks/issues/message-discussion-created-by-recipient/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'main';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const CASE = {
    ojs: {sid: 3, stage: 'Copyediting', participant: 'mfritz'},
    omp: {sid: 7, stage: 'Copyediting', participant: 'mfritz'},
    ops: {sid: 1, stage: 'Production', participant: 'dbuskins'},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const c = CASE[app.name];
    const name = `u35w33 neighbour ${RUN} ${Date.now().toString(36)}`;
    const facts = {app: app.name, run: RUN};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        await panel.goto(c.sid);
        await panel.selectStage(c.stage);
        const td = new TasksDiscussionsPanel(page, app.contextPath, {title: `${c.stage} Tasks & Discussions`});
        await td.expectSettled();
        const win = await td.openAdd();
        await win.nameField().fill(name);
        await win.tick(c.participant);
        await win.typeMessage(`u35w33 neighbour message`);
        await win.saveExpectClosed();
        await td.reland();
        facts.row = flat(await td.row(name).first().innerText());
        facts.ownerLine = flat(await td.ownerLine(name).first().innerText());
        console.log(`[fact] ${app.name} neighbour: ${JSON.stringify(facts)}`);
        record(`neighbour-${RUN}`, await screen(page));
        await signOut(page);
    } finally {
        record(`neighbour-facts-${RUN}`, facts);
        await close();
    }
});
