// Neighbour check for docs/issues/U35-A9-permissions-tick-carried-to-other-role.md:
// the paths the fix must leave alone, run with the fix in and out.
//   OPS only, first: the Author role's "Permit submission metadata edit."
//   switched off (as in walk.js).
//   Window 1: dbarnes, the submission, "Assign", role "Author", "Search",
//   the list's first author -> "Permissions" unticked (the role's default);
//   tick it by hand, choose the list's second author -> still ticked (a hand
//   tick survives another person chosen from the same list); "Search" again
//   (the boxes hide) and the list's third author -> unfixed: ticked; fixed:
//   unticked, the role's default, as "Assignment privileges" does; "OK" ->
//   saved as the box showed.
//   Window 2: "Assign", role "Author", "Search", the list's first author
//   (unticked), then role
//   "Section editor" (OMP "Series editor", OPS "Moderator"), "Search",
//   "Minoti Inoue" -> ticked (the editor role's default); "OK" -> saved so.
// Same submissions as walk.js; reset the dataset fleet first.
// Run: PROBE_FEATURE=issues-w36 PROBE_AGENT=w36 PROBE_RUN=nb node bin/probe.js all shared/playwright/checks/issues/permissions-tick-carried-to-other-role/neighbour.js
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'nb';

const CASE = {
    ojs: {sid: 4, editorRole: 'Section editor'},
    omp: {sid: 8, editorRole: 'Series editor'},
    ops: {sid: 1, editorRole: 'Moderator', authorDefaultOff: true},
};
const EDITOR = {name: 'Minoti Inoue', username: 'minoue'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const c = CASE[app.name];
    const SP = require('../../../pages/StageParticipantsPages.js');
    const saved = (username) => sql(app,
        `select sa.user_group_id || ':' || sa.can_change_metadata from stage_assignments sa join users u on u.user_id=sa.user_id ` +
        `where sa.submission_id=${c.sid} and u.username='${username}'`);
    const box = async (win) => ({
        shown: await win.metadataBox().isVisible().catch(() => false),
        ticked: await win.metadataBox().isChecked().catch(() => null),
    });

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        if (c.authorDefaultOff) {
            const roles = new SP.RoleOptionsForm(page, app.contextPath);
            await roles.gotoRoles();
            await roles.openRole('Author');
            if (await roles.permitMetadataEditBox().isChecked()) await roles.permitMetadataEditBox().click();
            await roles.save();
        }
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        await panel.goto(c.sid);

        // Window 1: one role, a hand tick kept between two people
        let win = await panel.openAssign();
        await win.chooseRole('Author');
        await win.search('');
        const listed = await win.peopleNames();
        fact('w1.listed', listed.slice(0, 3));
        await win.choosePerson(listed[0]);
        fact('w1.firstPerson', await box(win));
        await win.metadataBox().click();
        fact('w1.afterHandTick', await box(win));
        await win.choosePerson(listed[1]);
        fact('w1.secondPersonSameList', await box(win));
        await win.search('');
        fact('w1.afterSearchAgain', await box(win));
        await win.choosePerson(listed[2]);
        fact('w1.thirdPersonAfterSearch', await box(win));
        await win.ok();
        await sleep(500);
        fact('w1.notices', (await screen(page)).notices);
        fact('w1.saved', sql(app,
            `select u.username || ':' || sa.can_change_metadata from stage_assignments sa join users u on u.user_id=sa.user_id ` +
            `join user_groups ug on ug.user_group_id=sa.user_group_id where sa.submission_id=${c.sid} and ug.role_id=65536`));

        // Window 2: Author first, then the editor role
        await panel.reland();
        win = await panel.openAssign();
        await win.chooseRole('Author');
        await win.search('');
        const author = (await win.peopleNames())[0];
        await win.choosePerson(author);
        fact('w2.author', {name: author, ...(await box(win))});
        await win.chooseRole(c.editorRole);
        await win.search('');
        await win.choosePerson(EDITOR.name);
        fact('w2.editor', await box(win));
        record(`nb-w2-editor-${RUN}`, await screen(page));
        await win.ok();
        await sleep(500);
        fact('w2.notices', (await screen(page)).notices);
        fact('w2.saved', saved(EDITOR.username));
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
