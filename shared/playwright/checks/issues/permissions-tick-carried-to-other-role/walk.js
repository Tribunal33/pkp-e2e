// Issue report docs/issues/U35-A9-permissions-tick-carried-to-other-role.md
// (U35 A9): in "Assign Participant", a "Permissions" tick from the role chosen
// first stays on after another role is chosen, and "OK" saves it.
// Takes the report's Steps through the screens on a dataset fleet (PKP's
// default test dataset), freshly reset, on OJS (submission 4), OMP
// (submission 8) and OPS (submission 1):
//   OPS only, first: dbarnes, Settings › Users & Roles › Roles, "Author" ›
//   Edit, untick "Permit submission metadata edit.", OK;
//   dbarnes: the submission, "Assign", role "Section editor" (OMP "Series
//   editor", OPS "Moderator"), "Search", "Minoti Inoue"; role "Author",
//   search the author's family name, choose the author, "OK"; the new row's
//   "Edit".
// Records the "Permissions" box (shown, ticked) at each step, the saved
// stage assignment's can_change_metadata, and the "Edit Assignment" box.
// Run: PROBE_FEATURE=issues-w36 PROBE_AGENT=w36 node bin/probe.js all shared/playwright/checks/issues/permissions-tick-carried-to-other-role/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w36 --dataset 1 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w36-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, screen, record, shot, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'main';

const CASE = {
    ojs: {sid: 4, editorRole: 'Section editor', author: {name: 'Carlo Corino', search: 'Corino', username: 'ccorino'}},
    omp: {sid: 8, editorRole: 'Series editor', author: {name: 'Arthur Clark', search: 'Clark', username: 'aclark'}},
    ops: {sid: 1, editorRole: 'Moderator', author: {name: 'Catherine Kwantes', search: 'Kwantes', username: 'ckwantes'},
        authorDefaultOff: true},
};
const EDITOR = {name: 'Minoti Inoue', username: 'minoue'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const c = CASE[app.name];
    const SP = require('../../../pages/StageParticipantsPages.js');
    const assignment = (username) => sql(app,
        `select ug.user_group_id || ':' || sa.can_change_metadata from stage_assignments sa ` +
        `join users u on u.user_id=sa.user_id join user_groups ug on ug.user_group_id=sa.user_group_id ` +
        `where sa.submission_id=${c.sid} and u.username='${username}'`);
    const boxState = async (box) => ({
        shown: await box.isVisible().catch(() => false),
        ticked: await box.isChecked().catch(() => null),
        disabled: await box.isDisabled().catch(() => null),
    });

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');

        // OPS precondition: the Author role's default switched off
        if (c.authorDefaultOff) {
            const roles = new SP.RoleOptionsForm(page, app.contextPath);
            await roles.gotoRoles();
            await roles.openRole('Author');
            const before = await roles.permitMetadataEditBox().isChecked();
            if (before) await roles.permitMetadataEditBox().click();
            fact('pre.authorPermitMetadataEdit', {before, after: await roles.permitMetadataEditBox().isChecked()});
            await roles.save();
            fact('pre.authorGroupSetting', sql(app,
                `select ug.user_group_id || ':' || ug.permit_metadata_edit from user_groups ug where ug.role_id=65536 ` +
                `and ug.context_id=(select server_id from servers where path='${app.contextPath}')`));
        }

        // 1. the submission
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        await panel.goto(c.sid);
        record('step1-workflow', await screen(page));

        // 2. "Assign"
        const win = await panel.openAssign();
        fact('step2.roles', await win.roleOptions());

        // 3. the editor role, "Search"
        await win.chooseRole(c.editorRole);
        await win.search();

        // 4. "Minoti Inoue"
        await win.choosePerson(EDITOR.name);
        fact('step4.permissions', await boxState(win.metadataBox()));
        record('step4-editor-chosen', await screen(page));
        await shot(page, `step4-editor-chosen-${RUN}`);

        // 5. role "Author"
        await win.chooseRole('Author');
        fact('step5.permissions', await boxState(win.metadataBox()));
        fact('step5.recommendOnly', await boxState(win.recommendOnlyBox()));

        // 6. search the author
        await win.search(c.author.search);
        fact('step6.people', await win.peopleNames());

        // 7. the author
        await win.choosePerson(c.author.name);
        fact('step7.permissions', await boxState(win.metadataBox()));
        record('step7-author-chosen', await screen(page));
        await shot(page, `step7-author-chosen-${RUN}`);

        // 8. "OK"
        await win.ok();
        await sleep(500);
        const s8 = await screen(page);
        record('step8-ok', s8);
        fact('step8.notices', s8.notices);
        fact('step8.assignment', assignment(c.author.username));

        // 9. the row's "Edit"
        await panel.reland();
        await panel.row(c.author.name).first().waitFor({timeout: 30_000});
        const edit = await panel.openEdit(c.author.name);
        fact('step9.permissions', await boxState(edit.metadataBox()));
        record('step9-edit', await screen(page));
        await shot(page, `step9-edit-${RUN}`);
        await edit.cancel();
        await idle(page);
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
