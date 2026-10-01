// Issue report docs/issues/U35-A12-edit-assignment-no-changes-ok-says-changed.md (U35 A12):
// "OK" on an "Edit Assignment" window that says "No changes can be made to
// this participant" closes it with "The stage assignment has been changed.".
// Takes the report's Steps through the screens on a dataset fleet (PKP's
// default test dataset), freshly reset, on OJS, OMP and OPS:
//   as rvaca: Daniel Barnes made recommend-only on the submission ("Edit" on
//   his row on OJS and OMP, "Assign" as Preprint Server manager on OPS);
//   as dbarnes: "Edit" on his own row, "OK".
// Then the neighbour check (for the fix): as dbarnes, still recommending,
// "Edit" on the author's row, the "Permissions" box changed, "OK".
// Run: PROBE_FEATURE=issues-w37 PROBE_AGENT=w37 node bin/probe.js all shared/playwright/checks/issues/edit-assignment-no-changes-ok-says-changed/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w37 --dataset 2 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w37-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'main';
const EDITOR = 'Daniel Barnes';

const CASE = {
    ojs: {sid: 4, assign: false, author: 'Craig Montgomerie'},
    omp: {sid: 6, assign: false, author: 'Deborah Bernnard'},
    ops: {sid: 1, assign: 'Preprint Server manager', author: 'Carlo Corino'},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const c = CASE[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const flags = () =>
        sql(app, `select u.username, ug.role_id, sa.recommend_only, sa.can_change_metadata from stage_assignments sa join users u on u.user_id=sa.user_id join user_groups ug on ug.user_group_id=sa.user_group_id where sa.submission_id=${c.sid} order by sa.stage_assignment_id`);

    const {page, close} = await launch(app);
    try {
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        fact('db.start', flags());

        // 1. rvaca opens the workflow.
        await signIn(page, 'rvaca');
        await panel.goto(c.sid);
        // 2. Daniel Barnes made recommend-only.
        if (c.assign) {
            const win = await panel.openAssign();
            await win.chooseRole(c.assign);
            await win.search('Barnes');
            await win.choosePerson(EDITOR);
            await win.recommendOnlyBox().check();
            await win.ok();
        } else {
            const win = await panel.openEdit(EDITOR);
            await win.recommendOnlyBox().check();
            await win.ok();
        }
        await idle(page);
        await sleep(600);
        fact('setup.notices', (await screen(page)).notices);
        await panel.reland();
        await panel.row(EDITOR).first().waitFor({timeout: 30_000});
        fact('setup.rows', flat(await panel.column().innerText(), 900));
        // 3. Sign out.
        await signOut(page);

        // 4. dbarnes opens the same workflow.
        await signIn(page, 'dbarnes');
        await panel.goto(c.sid);
        await panel.row(EDITOR).first().waitFor({timeout: 30_000});
        fact('rows.dbarnes', flat(await panel.column().innerText(), 900));
        // 5. "Edit" on his own row.
        const win = await panel.openEdit(EDITOR);
        fact('edit.form', flat(await win.form().innerText(), 900));
        fact('edit.boxes', {recommendOnly: await win.recommendOnlyBox().count(), metadata: await win.metadataBox().count()});
        fact('edit.okEnabled', await win.okButton().isEnabled());
        record(`edit-own-${RUN}`, await screen(page));
        await shot(page, `edit-own-${RUN}`);
        // 6. "OK".
        if (await win.okButton().isEnabled()) {
            await win.ok();
            await idle(page);
            await sleep(600);
            const s = await screen(page);
            record(`edit-own-after-${RUN}`, s);
            fact('ok.notices', s.notices);
        } else {
            fact('ok.notices', 'OK disabled: not pressed');
            await win.cancel();
            await idle(page);
            await sleep(600);
            fact('cancel.notices', (await screen(page)).notices);
        }
        await panel.reland();
        await panel.row(EDITOR).first().waitFor({timeout: 30_000});
        fact('rows.after', flat(await panel.column().innerText(), 900));
        fact('db.after', flags());

        // Neighbour: "Edit" on the author's row keeps its box and an active "OK".
        const nwin = await panel.openEdit(c.author);
        fact('nb.form', flat(await nwin.form().innerText(), 600));
        fact('nb.okEnabled', await nwin.okButton().isEnabled());
        const box = nwin.metadataBox();
        const before = await box.isChecked();
        fact('nb.boxBefore', before);
        await box.setChecked(!before);
        await nwin.ok();
        await idle(page);
        await sleep(600);
        fact('nb.notices', (await screen(page)).notices);
        fact('nb.db', flags());
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
