// Reach check of issue report docs/issues/U54-A14-users-tab-keeps-renamed-role-old-name.md
// (U54 A14) on the same tab's "Invitations" table, OJS only. As `rvaca` on PKP's default test
// dataset: "Invite to a role" for Alan Mwandenga (`amwandenga`) as "Section editor", sent and left
// pending; Settings > Users & Roles shows the invitation naming "Section editor"; "Roles", the
// role renamed "Handling editor"; "Users" pressed without a reload: the invitation's roles and
// David Buskins' "Roles" cell; then a reload.
//
// Reset first:  npm run fleet-prep -- --feature issues-u54f --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u54f PROBE_AGENT=u54f node bin/probe.js ojs shared/playwright/checks/issues/users-tab-keeps-renamed-role-old-name/invitation.js
// Facts: .reports/<feature>/u54f/invitation[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', role: c.role, newName: H.NEW_NAME};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const {users, roles} = H.tabs(page, app);
        await users.goto();
        await H.invite(page, app, {email: H.INVITEE.email, roleName: c.role});
        record('01-invitation-sent', await screen(page));

        await users.goto();
        await users.invitationRow(H.INVITEE.email).first().waitFor({timeout: 30_000});
        facts.before = {invitation: await H.invitationRow(users, H.INVITEE.email), person: await H.personRow(users)};
        record('02-users-before', await screen(page));
        await shot(page, '02-users-before');

        await roles.openTab();
        await screen(page);
        facts.rename = await H.rename(page, roles, c.role, H.NEW_NAME);

        facts.usersFetchesOnTab = await H.pressUsersTab(page, users);
        facts.after = {invitation: await H.invitationRow(users, H.INVITEE.email), person: await H.personRow(users)};
        record('03-users-after-rename', await screen(page));
        await shot(page, '03-users-after-rename');

        await page.reload();
        await users.invitationRow(H.INVITEE.email).first().waitFor({timeout: 30_000});
        await idle(page);
        facts.afterReload = {invitation: await H.invitationRow(users, H.INVITEE.email), person: await H.personRow(users)};
        record('invitation', facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record('invitation', facts);
        throw error;
    } finally {
        await close();
    }
});
