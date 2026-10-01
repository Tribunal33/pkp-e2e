// Issue report reach check: docs/issues/U54-A14-users-tab-keeps-old-role-name.md
// (spec U54 register A14), the Users tab's other list. On a dataset fleet
// (PKP's default test dataset), signed in as `rvaca`: Settings › Users &
// Roles › "Invite to a role" sends an invitation for a new address
// (u54w48.invitee@mailinator.com) to "Section editor" (OMP "Series editor",
// OPS "Moderator"); back on the "Users" tab its "Invitations" row names the
// role; then the "Roles" tab, the role's "Edit", "Role Name" "u54w48 Desk
// editor", "OK", and the "Users" tab again: the invitation row read at once
// and after a reload. Every GET of the invitations list is counted. The kit
// builds nothing. Main only (the invitation wizard's page objects follow
// main's screens; OJS's page object, whose markup the three apps share).
//
// Run (reset the fleet first):
//   npm run fleet-prep -- --feature issues-w48 --dataset 4 --reset
//   PROBE_RUN=inv PROBE_FEATURE=issues-w48 PROBE_AGENT=w48 node bin/probe.js all shared/playwright/checks/issues/users-tab-keeps-old-role-name/invitation.js
// With the fix applied, PROBE_RUN=invfix.
// Facts: .reports/<feature>/w48/facts-<run>-<app>.json
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const NEW_NAME = 'u54w48 Desk editor';
const INVITEE = 'u54w48.invitee@mailinator.com';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('invitation.js drives a dataset fleet (fleet-prep --dataset)');
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    const {SendInvitationWizard} = require(path.join(__dirname, "../../../../../apps/ojs/playwright/pages/UserInvitationPages.js"));
    const ROLE = {ojs: 'Section editor', omp: 'Series editor', ops: 'Moderator'}[app.name];
    const facts = {line: app.line || 'main', baseURL: app.baseURL, role: ROLE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const {page, close} = await launch(app);
    const invFetches = [];
    page.on('request', (r) => {
        if (r.method() === 'GET' && /\/api\/v1\/invitations\/userRoleAssignment(\?|$)/.test(r.url())) invFetches.push(r.url().replace(/^.*\/api\/v1\//, ''));
    });
    const users = new UsersListPage(page, app.contextPath);
    const roles = new RolesTab(page, app.contextPath, {stages: []});
    const invRow = async () => {
        const row = users.invitationRow(INVITEE);
        return (await row.count()) ? flat(await row.first().innerText()) : null;
    };
    try {
        await signIn(page, 'rvaca');
        await users.goto();
        await users.inviteButton.click();
        const wizard = new SendInvitationWizard(page);
        await wizard.searchAndContinue(INVITEE);
        await wizard.fillGivenName('u54w48 Invitee');
        await wizard.fillRoleRow({role: ROLE, startDate: new Date().toISOString().slice(0, 10)});
        await wizard.saveAndContinue();
        await wizard.send();
        await wizard.dismissSentDialog();
        await users.table.locator('tbody tr').first().waitFor({timeout: 30_000});
        await idle(page).catch(() => {});
        fact('I1-invitation row', await invRow());
        await roles.openTab();
        const win = await roles.openEdit(ROLE);
        await win.nameBox('en').fill(NEW_NAME);
        const before = invFetches.length;
        const saved = await win.save();
        await pause(800);
        fact('I2-renamed', {status: saved.status(), invitationFetches: invFetches.slice(before)});
        await roles.usersTab.click();
        await idle(page).catch(() => {});
        await pause(1000);
        fact('I3-users tab, invitation row', {row: await invRow(), invitationFetches: invFetches.slice(before)});
        const s = await screen(page);
        record('I3-users-tab', s);
        await shot(page, 'I3-users-tab');
        await page.reload();
        await idle(page).catch(() => {});
        await roles.usersTab.click();
        await users.table.locator('tbody tr').first().waitFor({timeout: 30_000});
        await pause(1000);
        fact('I4-after reload, invitation row', await invRow());
    } finally {
        record('facts', facts);
        await close();
    }
});
