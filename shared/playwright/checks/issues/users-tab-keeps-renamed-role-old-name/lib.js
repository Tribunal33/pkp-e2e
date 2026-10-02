// Helpers of walk.js and neighbour.js here (issue report
// docs/issues/U54-A14-users-tab-keeps-renamed-role-old-name.md). Requiring this file runs nothing.
// Every helper drives Settings > Users & Roles as a person does, through the U53 and U54 page
// objects (shared/playwright/pages/UsersManagementPages.js, RolesConfigurationPages.js).
const {expect} = require('@playwright/test');
const {idle, screen} = require('../../../probe');

/** Per app, on PKP's default test dataset (docs/process/dataset.md): the role held by David Buskins. */
const CASES = {
    ojs: {role: 'Section editor', stages: ['Submission', 'Review', 'Copyediting', 'Production']},
    omp: {role: 'Series editor', stages: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production']},
    ops: {role: 'Moderator', stages: ['Production']},
};

const NEW_NAME = 'Handling editor';
const PERSON = {name: 'David Buskins', email: 'dbuskins@mailinator.com'};

/** The page's two tabs' page objects (required inside forEachApp's fn). */
function tabs(page, app) {
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    return {
        users: new UsersListPage(page, app.contextPath),
        roles: new RolesTab(page, app.contextPath, {stages: CASES[app.name].stages}),
    };
}

/** David Buskins' row on the Users tab: listed?, its "Roles" lines, the heading's count line. */
async function personRow(users) {
    const row = users.row(PERSON.email);
    const count = await row.count();
    return {
        listed: count,
        roles: count ? await users.cellLines(users.rolesCell(row.first())) : null,
        pagingLine: await users.pagingLine(),
        rowsShown: await users.rows().count(),
    };
}

/**
 * Press the "Users" tab (no reload) and wait until its panel shows, counting the users-list
 * requests the press sends within the wait for the page to be idle.
 */
async function pressUsersTab(page, users) {
    let fetched = 0;
    const onRequest = (r) => {
        if (/\/api\/v1\/users\?/.test(r.url()) && r.method() === 'GET') fetched++;
    };
    page.on('request', onRequest);
    await page.getByRole('tab', {name: 'Users', exact: true}).click();
    await expect(users.table).toBeVisible({timeout: 30_000});
    await idle(page);
    // the list's own redraw, when one went out, has finished: no loading line in the panel
    await page.waitForLoadState('networkidle');
    page.off('request', onRequest);
    return fetched;
}

/** Rename a role in its "Edit" window; returns the answer's status and the notices shown. */
async function rename(page, roles, from, to) {
    const win = await roles.openEdit(from);
    await win.nameBox().fill(to);
    const status = (await win.save()).status();
    await idle(page);
    const shown = await screen(page);
    return {status, notices: shown.notices, newRow: await roles.row(to).count(), oldRow: await roles.row(from).count()};
}

/** The person invited in invitation.js: a dataset author without the role (OJS dataset). */
const INVITEE = {name: 'Alan Mwandenga', email: 'amwandenga@mailinator.com'};

/**
 * Settings > Users & Roles, "Invite to a role": search the existing account by its email, choose
 * the role with today's start date, "Save And Continue", "Invite user to the role"; waits for the
 * "Invitation Sent" window. The invitation stays pending (nobody accepts it).
 */
async function invite(page, app, {email, roleName}) {
    const T = 30_000;
    const today = new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
    await page.getByRole('button', {name: 'Invite to a role'}).click();
    await page.getByLabel(/Search for a user by email address/).fill(email);
    await page.getByRole('button', {name: 'Search User', exact: true}).click();
    const newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).first();
    await newRow.waitFor({timeout: T});
    await idle(page);
    await newRow.getByRole('combobox').first().selectOption({label: roleName});
    await newRow.getByRole('textbox').fill(today);
    await newRow.getByRole('combobox').last().selectOption({index: 1});
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    await page.locator('input[name="subject"]').waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T});
}

/** The invitee's row in the "Invitations" table: listed?, and the roles it names. */
async function invitationRow(users, email) {
    const row = users.invitationRow(email);
    const count = await row.count();
    return {listed: count, roles: count ? await users.cellLines(users.cells(row.first()).nth(2)) : null};
}

module.exports = {CASES, NEW_NAME, PERSON, INVITEE, tabs, personRow, pressUsersTab, rename, invite, invitationRow};
