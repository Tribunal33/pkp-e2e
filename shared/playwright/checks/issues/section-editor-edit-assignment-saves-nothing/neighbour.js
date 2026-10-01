// Neighbour check for the fix of docs/issues/U35-A1-section-editor-edit-assignment-saves-nothing.md:
// what the fix must leave refused, walked with the fix in and out, on a
// dataset fleet (PKP's default test dataset), freshly reset, OJS, OMP, OPS:
//   1. Signed in as dbuskins: the own row ("David Buskins") and a manager-level
//      row (OJS/OMP "Daniel Barnes") offer no "Edit" (the panel's own rule).
//   2. dbuskins opens "Edit" on the Author row; meanwhile, in a second browser,
//      rvaca (the manager) removes "David Buskins" from the submission;
//      dbuskins changes the "Permissions" box and presses "OK": nothing is saved.
// Run: PROBE_FEATURE=issues-w28 PROBE_AGENT=w28 PROBE_RUN=<fix|nofix> node bin/probe.js all shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/neighbour.js
//      (reset first: npm run fleet-prep -- --feature issues-w28 --dataset 1 --reset)
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const CASE = {
    ojs: {sid: 4, author: {name: 'Craig Montgomerie', username: 'cmontgomerie'}, manager: 'Daniel Barnes'},
    omp: {sid: 6, author: {name: 'Deborah Bernnard', username: 'dbernnard'}, manager: 'Daniel Barnes'},
    ops: {sid: 1, author: {name: 'Carlo Corino', username: 'ccorino'}, manager: null},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const c = CASE[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const flags = (username) =>
        sql(app, `select sa.recommend_only, sa.can_change_metadata from stage_assignments sa join users u on u.user_id=sa.user_id where sa.submission_id=${c.sid} and u.username='${username}'`);

    const se = await launch(app);
    const mgr = await launch(app);
    try {
        const page = se.page;
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        await signIn(page, 'dbuskins');
        await panel.goto(c.sid);
        await panel.row(c.author.name).first().waitFor({timeout: 30_000});

        // 1. Rows the panel never offers "Edit" on.
        await panel.openMenu('David Buskins');
        fact('ownRow.menu', await panel.menuLabels());
        await panel.closeMenu('David Buskins');
        if (c.manager) {
            await panel.openMenu(c.manager);
            fact('managerRow.menu', await panel.menuLabels());
            await panel.closeMenu(c.manager);
        }

        // 2. "Edit" open while the manager removes the editor.
        const win = await panel.openEdit(c.author.name);
        const box = win.metadataBox();
        const before = await box.isChecked();
        fact('db.before', flags(c.author.username));

        const mpanel = new SP.ParticipantsPanel(mgr.page, app.contextPath);
        await signIn(mgr.page, 'rvaca');
        await mpanel.goto(c.sid);
        await mpanel.row('David Buskins').first().waitFor({timeout: 30_000});
        const dlg = await mpanel.openRemove('David Buskins');
        await dlg.ok();
        fact('removed', sql(app, `select count(*) from stage_assignments sa join users u on u.user_id=sa.user_id where sa.submission_id=${c.sid} and u.username='dbuskins'`));

        await box.setChecked(!before);
        const saved = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: 30_000});
        await win.okButton().click();
        const res = await saved;
        const body = await res.text().catch(() => '');
        await idle(page);
        await sleep(1500);
        const s = await screen(page);
        record('stale-after', s);
        fact('stale.response', {status: res.status(), redrawsForm: /<form/i.test(body), body: flat(body, 300)});
        fact('stale.windowOpen', (await win.root.count()) > 0 && (await win.root.isVisible().catch(() => false)));
        fact('stale.notices', s.notices);
        fact('stale.dialogText', flat(s.text.dialog, 400));
        fact('db.after', flags(c.author.username));
    } finally {
        record('neighbour-facts', facts);
        await se.close();
        await mgr.close();
    }
});
