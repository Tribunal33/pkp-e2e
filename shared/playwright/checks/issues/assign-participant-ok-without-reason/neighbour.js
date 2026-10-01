// Neighbour check for docs/issues/U35-A4-assign-participant-ok-without-reason.md:
// the paths the fix must leave alone, run with the fix in and out.
//   Assign: dbarnes, the submission, "Assign", "OK" with nobody chosen
//   (refused), then the editor role, "Search", "Minoti Inoue", "OK" -> the
//   window closes, "User added as a stage participant." (and which other
//   notices come with it), Minoti Inoue assigned.
//   Edit: her row's "Edit", untick "Permissions" when shown, "OK" -> the
//   window closes, "The stage assignment has been changed.", the box saved.
// Same submissions as walk.js; reset the dataset fleet first.
// Run: PROBE_FEATURE=issues-w32 PROBE_AGENT=w32 PROBE_RUN=nb node bin/probe.js all shared/playwright/checks/issues/assign-participant-ok-without-reason/neighbour.js
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'nb';

const CASE = {
    ojs: {sid: 4, editorRole: 'Section editor'},
    omp: {sid: 8, editorRole: 'Series editor'},
    ops: {sid: 1, editorRole: 'Moderator'},
};
const PERSON = {name: 'Minoti Inoue', username: 'minoue'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const c = CASE[app.name];
    const SP = require('../../../pages/StageParticipantsPages.js');
    const assignments = () => sql(app,
        `select sa.user_group_id || ':' || sa.can_change_metadata from stage_assignments sa join users u on u.user_id=sa.user_id ` +
        `where sa.submission_id=${c.sid} and u.username='${PERSON.username}'`);

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const panel = new SP.ParticipantsPanel(page, app.contextPath);
        await panel.goto(c.sid);

        // Assign with a person chosen under the chosen role
        const win = await panel.openAssign();
        const refused = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: 30_000});
        await win.root.getByRole('button', {name: 'OK', exact: true}).click();
        await refused;
        await idle(page);
        await win.expectOpen();
        fact('refused.errorTexts', await win.root.locator('span.error, label.error').allTextContents());
        await win.chooseRole(c.editorRole);
        await win.search();
        await win.choosePerson(PERSON.name);
        await win.ok();
        await sleep(500);
        const s1 = await screen(page);
        record(`nb-assign-${RUN}`, s1);
        fact('assign.notices', s1.notices);
        fact('assign.minoue', assignments());

        // Edit her row
        await panel.reland();
        await panel.row(PERSON.name).first().waitFor({timeout: 30_000});
        const edit = await panel.openEdit(PERSON.name);
        const box = edit.metadataBox();
        const hasBox = await box.count() > 0 && await box.isVisible();
        fact('edit.metadataBox', hasBox ? await box.isChecked() : 'not shown');
        if (hasBox) await box.click();
        await edit.ok();
        await idle(page);
        await sleep(500);
        const s2 = await screen(page);
        record(`nb-edit-${RUN}`, s2);
        fact('edit.notices', s2.notices);
        fact('edit.minoue', assignments());
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
