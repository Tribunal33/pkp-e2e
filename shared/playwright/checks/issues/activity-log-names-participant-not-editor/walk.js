// Issue report docs/issues/U35-A14-activity-log-names-participant-not-editor.md (U35 A14):
// the Activity Log's "User" column of the "… was assigned to this submission
// as a …" and "… was removed from this submission as a …" lines names the
// participant, not the editor who assigned or removed them. Takes the
// report's Steps through the screens on a dataset fleet (PKP's default test
// dataset), freshly reset, on OJS, OMP and OPS:
//   as dbarnes: "Assign" a person not yet on the submission, "OK";
//   the Activity Log's History; the person's row "Remove", "OK"; History again.
// Also reads (for Evidence) the new event_log rows: user_id and the
// userFullName setting.
// Run: PROBE_FEATURE=issues-w38 PROBE_AGENT=w38 node bin/probe.js all shared/playwright/checks/issues/activity-log-names-participant-not-editor/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w38 --dataset 3 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w38-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, screen, record, shot, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'main';

const CASE = {
    ojs: {sid: 4, role: 'Section editor', person: {name: 'Minoti Inoue', username: 'minoue'}},
    omp: {sid: 6, role: 'Series editor', person: {name: 'Stephanie Berardo', username: 'sberardo'}},
    ops: {sid: 1, role: 'Moderator', person: {name: 'Minoti Inoue', username: 'minoue'}},
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
        sql(app, `select e.log_id, e.event_type, e.user_id, (select username from users u where u.user_id=e.user_id), e.message, (select string_agg(s.locale||'='||s.setting_value, ';') from event_log_settings s where s.log_id=e.log_id and s.setting_name='userFullName') from event_log e where e.assoc_type=1048585 and e.assoc_id=${c.sid} order by e.log_id desc limit 3`);

    const {page, close} = await launch(app);
    try {
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        const log = new ActivityLogWindow(page, panel.frame);
        const readLog = async (tag) => {
            await log.open();
            const lines = await log.historyLines();
            fact(`${tag}.top`, lines[0]);
            fact(`${tag}.users`, [...new Set(lines.map((l) => l.user))]);
            fact(`${tag}.control`, lines.filter((l) => !l.event.includes(`(${c.person.username})`)).slice(0, 2));
            record(`${tag}-${RUN}`, await screen(page));
            await shot(page, `${tag}-${RUN}`);
            await log.close();
        };

        // 1. Sign in, open the workflow.
        await signIn(page, 'dbarnes');
        await panel.goto(c.sid);

        // 2-3. "Assign": role, "Search", the person, "OK" (no message).
        const win = await panel.openAssign();
        await win.chooseRole(c.role);
        await win.search();
        await win.choosePerson(c.person.name);
        await win.ok();
        await idle(page);
        await sleep(500);
        fact('assign.notices', (await screen(page)).notices);

        // 4. Activity Log: the top line.
        await readLog('afterAssign');
        fact('db.afterAssign', events());

        // 5. "More Actions" › "Remove" › "OK".
        await panel.reland();
        await panel.row(c.person.name).first().waitFor({timeout: 30_000});
        const dialog = await panel.openRemove(c.person.name);
        await dialog.ok();
        await idle(page);
        await sleep(500);

        // 6. Activity Log again.
        await readLog('afterRemove');
        fact('db.afterRemove', events());
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
