// Issue report docs/issues/U35-A7-edit-assignment-logged-as-assigned.md (U35 A7):
// an "Edit" › "OK" on a Participants row adds the "… was assigned to this
// submission as a …" line to the Activity Log. Takes the report's Steps
// through the screens on a dataset fleet (PKP's default test dataset),
// freshly reset, on OJS, OMP and OPS:
//   as dbarnes: the Activity Log's History (the lines naming the person);
//   the person's row "Edit", the "Assignment privileges" box changed, "OK";
//   the Activity Log's History again.
// Also reads (for Evidence) the submission's newest event_log rows.
// Run: PROBE_FEATURE=issues-w35 PROBE_AGENT=w35 node bin/probe.js all shared/playwright/checks/issues/edit-assignment-logged-as-assigned/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w35 --dataset 2 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w35-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, screen, record, shot, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'main';

const CASE = {
    ojs: {sid: 4, person: {name: 'Stephanie Berardo', username: 'sberardo'}},
    omp: {sid: 6, person: {name: 'Minoti Inoue', username: 'minoue'}},
    ops: {sid: 1, person: {name: 'Stephanie Berardo', username: 'sberardo'}},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const {ActivityLogWindow} = require('../../../pages/ActivityLogPages.js');
    const c = CASE[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const events = () =>
        sql(app, `select log_id, event_type, message from event_log where assoc_type=1048585 and assoc_id=${c.sid} order by log_id desc limit 4`);

    const {page, close} = await launch(app);
    try {
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        const log = new ActivityLogWindow(page, panel.frame);
        const naming = async () => (await log.historyLines()).filter((l) => l.event.includes(`(${c.person.username})`));

        // 1. Sign in, open the workflow.
        await signIn(page, 'dbarnes');
        await panel.goto(c.sid);
        // 2. Activity Log: the lines naming the person.
        await log.open();
        fact('log.before', await naming());
        fact('log.before.count', (await log.historyLines()).length);
        await log.close();
        fact('db.before', events());

        // 3. The person's row: "Edit".
        const win = await panel.openEdit(c.person.name);
        fact('edit.form', flat(await win.form().innerText(), 900));
        // 4. "Assignment privileges": change the box.
        const box = win.recommendOnlyBox();
        const before = await box.isChecked();
        fact('edit.boxBefore', before);
        await box.setChecked(!before);
        // 5. "OK".
        await win.ok();
        await idle(page);
        await sleep(800);
        const s = await screen(page);
        record(`edit-after-${RUN}`, s);
        fact('edit.notices', s.notices);
        fact('rows.after', await panel.rowLines());

        // 6. Activity Log again.
        await log.open();
        const lines = await log.historyLines();
        fact('log.after', await naming());
        fact('log.after.count', lines.length);
        fact('log.after.top', lines.slice(0, 2));
        record(`log-after-${RUN}`, await screen(page));
        await shot(page, `log-after-${RUN}`);
        await log.close();
        fact('db.after', events());
        fact('db.flags', sql(app, `select sa.recommend_only, sa.can_change_metadata from stage_assignments sa join users u on u.user_id=sa.user_id where sa.submission_id=${c.sid} and u.username='${c.person.username}'`));
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
