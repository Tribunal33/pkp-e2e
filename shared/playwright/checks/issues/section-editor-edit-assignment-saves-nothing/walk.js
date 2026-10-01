// Issue report docs/issues/U35-A1-section-editor-edit-assignment-saves-nothing.md
// (U35 A1): an assigned Section editor's "OK" on "Edit Assignment". Takes the
// report's Steps through the screens on a dataset fleet (PKP's default test
// dataset), freshly reset, on OJS, OMP and OPS:
//   as dbuskins (the assigned Section editor / Series editor / Moderator):
//     the Author row's "Edit", the "Permissions" box changed, "OK";
//     the other editor's row "Edit", the "Assignment privileges" box changed, "OK";
//     reload, the Author row's "Edit" again.
//   control, as rvaca (the manager): the Author row's "Edit", the box changed, "OK".
// Also reads (for Evidence) the two stage assignments' flags in the database.
// Run: PROBE_FEATURE=issues-w28 PROBE_AGENT=w28 node bin/probe.js all shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w28 --dataset 1 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w28-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'main';

const CASE = {
    ojs: {sid: 4, author: {name: 'Craig Montgomerie', username: 'cmontgomerie'}, editor: {name: 'Stephanie Berardo', username: 'sberardo'}},
    omp: {sid: 6, author: {name: 'Deborah Bernnard', username: 'dbernnard'}, editor: {name: 'Minoti Inoue', username: 'minoue'}},
    ops: {sid: 1, author: {name: 'Carlo Corino', username: 'ccorino'}, editor: {name: 'Stephanie Berardo', username: 'sberardo'}},
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
    const flags = (username) =>
        sql(app, `select sa.recommend_only, sa.can_change_metadata from stage_assignments sa join users u on u.user_id=sa.user_id where sa.submission_id=${c.sid} and u.username='${username}'`);

    const {page, close} = await launch(app);
    try {
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        const win = new SP.EditAssignmentWindow(page);

        // One "Edit" › change a box › "OK"; what the window and the page show after.
        const editAndOk = async (key, rowName, box, {expectClose = false} = {}) => {
            await panel.openMenu(rowName);
            fact(`${key}.menu`, await panel.menuLabels());
            await panel.menuItem('Edit').click();
            await win.expectOpen();
            fact(`${key}.form`, flat(await win.form().innerText(), 900));
            const b = box === 'metadata' ? win.metadataBox() : win.recommendOnlyBox();
            const before = await b.isChecked();
            fact(`${key}.boxBefore`, before);
            await b.setChecked(!before);
            const saved = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: 30_000});
            await win.okButton().click();
            const res = await saved;
            const body = await res.text().catch(() => '');
            await idle(page);
            await sleep(1500);
            const s = await screen(page);
            record(`${key}-after`, s);
            await shot(page, `${key}-after-${RUN}`);
            const open = (await win.root.count()) > 0 && (await win.root.isVisible().catch(() => false));
            fact(`${key}.response`, {status: res.status(), redrawsForm: /<form/i.test(body), body: flat(body, 200)});
            fact(`${key}.windowOpen`, open);
            fact(`${key}.notices`, s.notices);
            if (open) {
                fact(`${key}.boxAfter`, await (box === 'metadata' ? win.metadataBox() : win.recommendOnlyBox()).isChecked().catch(() => null));
                fact(`${key}.windowText`, flat(s.text.dialog, 600));
                await win.cancel();
                await sleep(600);
            }
            fact(`${key}.rows`, await panel.rowLines());
            return open;
        };

        // ---- as the assigned Section editor ----
        await signIn(page, 'dbuskins');
        await panel.goto(c.sid);
        fact('se.rowsBefore', await panel.rowLines());
        fact('db.before', {author: flags(c.author.username), editor: flags(c.editor.username)});
        await editAndOk('se.author', c.author.name, 'metadata');
        await editAndOk('se.editor', c.editor.name, 'recommendOnly');
        // Reload, the Author row's "Edit" again.
        await panel.reland();
        fact('se.rowsAfterReload', await panel.rowLines());
        await panel.openEdit(c.author.name);
        fact('se.reopen.metadataBox', await win.metadataBox().isChecked());
        await win.cancel();
        await sleep(600);
        fact('db.afterSectionEditor', {author: flags(c.author.username), editor: flags(c.editor.username)});

        // ---- control: the manager ----
        await signOut(page);
        await signIn(page, 'rvaca');
        await panel.goto(c.sid);
        await editAndOk('mgr.author', c.author.name, 'metadata');
        fact('db.afterManager', {author: flags(c.author.username), editor: flags(c.editor.username)});
    } finally {
        record('facts', facts);
        await close();
    }
});
