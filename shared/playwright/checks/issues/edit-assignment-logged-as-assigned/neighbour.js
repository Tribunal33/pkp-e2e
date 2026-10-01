// Neighbour check for docs/issues/U35-A7-edit-assignment-logged-as-assigned.md:
// the paths the fix must leave alone or change only as intended, run with the
// fix in and out, as dbarnes on the same submissions as walk.js:
//   Assign: "Assign", the editor role, "Search", a person not yet on the
//   submission, "OK" with no message -> one "… was assigned to this
//   submission as a …" line (must stay, fix in or out).
//   Edit, nothing changed: that person's row "Edit", "OK" with the boxes as
//   they are -> today a further "was assigned" line; with the fix, no line.
// Reset the dataset fleet first.
// Run: PROBE_FEATURE=issues-w35 PROBE_AGENT=w35 PROBE_RUN=nb node bin/probe.js all shared/playwright/checks/issues/edit-assignment-logged-as-assigned/neighbour.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'nb';

const CASE = {
    ojs: {sid: 4, role: 'Section editor', person: {name: 'Minoti Inoue', username: 'minoue'}},
    omp: {sid: 6, role: 'Series editor', person: {name: 'Stephanie Berardo', username: 'sberardo'}},
    ops: {sid: 1, role: 'Moderator', person: {name: 'Minoti Inoue', username: 'minoue'}},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const {ActivityLogWindow} = require('../../../pages/ActivityLogPages.js');
    const c = CASE[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };

    const {page, close} = await launch(app);
    try {
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        const log = new ActivityLogWindow(page, panel.frame);
        const naming = async () => {
            await log.open();
            const lines = (await log.historyLines()).filter((l) => l.event.includes(`(${c.person.username})`)).map((l) => l.event);
            await log.close();
            return lines;
        };

        await signIn(page, 'dbarnes');
        await panel.goto(c.sid);
        fact('log.start', await naming());

        // Assign a person not yet on the submission.
        const win = await panel.openAssign();
        await win.chooseRole(c.role);
        await win.search();
        await win.choosePerson(c.person.name);
        await win.ok();
        await idle(page);
        await sleep(500);
        fact('assign.notices', (await screen(page)).notices);
        fact('log.afterAssign', await naming());

        // "Edit" › "OK" with nothing changed.
        await panel.reland();
        await panel.row(c.person.name).first().waitFor({timeout: 30_000});
        const edit = await panel.openEdit(c.person.name);
        fact('edit.boxes', {
            recommendOnly: (await edit.recommendOnlyBox().count()) ? await edit.recommendOnlyBox().isChecked() : 'not shown',
            metadata: (await edit.metadataBox().count()) ? await edit.metadataBox().isChecked() : 'not shown',
        });
        await edit.ok();
        await idle(page);
        await sleep(500);
        const s = await screen(page);
        record(`nb-edit-${RUN}`, s);
        fact('edit.notices', s.notices);
        fact('log.afterUnchangedEdit', await naming());
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
