// U54 A2 side check (issue report docs/issues/U54-A2-manager-role-row-shows-no-stage.md): which role a
// manager who holds no other role submits as. On PKP's default test dataset (OJS), `rvaca` ("Journal
// manager" only) opens "Make a Submission", fills the start page and presses "Begin Submission"; then
// the "Roles" tab of his profile is read, and the created submission's submitter assignment.
//   ONLY=ojs PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/manager-role-row-shows-no-stage/submit.js
const {forEachApp, launch, signIn, signOut, record, screen, idle, sql} = require('../../../probe');
const S = require('../section-editor-submit-as-refused/lib.js');

const rolesOf = (app, username) =>
    sql(app, `select string_agg(s.setting_value, ', ' order by s.setting_value) from user_user_groups uug join users u on u.user_id = uug.user_id join user_group_settings s on s.user_group_id = uug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where u.username = '${username}'`).trim();

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', rolesBefore: rolesOf(app, 'rvaca')};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        await S.openStart(page, app);
        facts.submitAs = await S.readSubmitAs(page);
        record('s1-start', await screen(page));
        await S.fillStart(page, {title: 'u54h manager submission', section: 'Articles'});
        facts.begin = await S.pressBegin(page);
        record('s2-after-begin', await screen(page));
        await page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile`));
        await idle(page);
        const rolesTab = page.getByRole('tab', {name: 'Roles', exact: true});
        if (await rolesTab.count()) {
            await rolesTab.click();
            await idle(page);
        }
        const s = await screen(page);
        record('s3-profile-roles', s);
        facts.profileRolesText = (s.text.main || '').replace(/\s+/g, ' ').slice(0, 1500);
        facts.rolesAfter = rolesOf(app, 'rvaca');
        if (facts.begin.id) {
            facts.submitterAssignment = sql(app, `select string_agg(u.username || ' as ' || s.setting_value, ', ') from stage_assignments sa join users u on u.user_id = sa.user_id join user_group_settings s on s.user_group_id = sa.user_group_id and s.setting_name = 'name' and s.locale = 'en' where sa.submission_id = ${facts.begin.id}`).trim();
        }
        await signOut(page);
    } finally {
        record('submit', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
