// Helpers of walk.js (issue report docs/issues/U53-A19-remove-user-upcoming-role-error.md).
// Requiring this file runs nothing. Every helper presses what a person presses, types into a
// form, or opens a link from an email; `assignments` only reads the database.
const {idle, signOut, sql, drainJobs} = require('../../../probe');

const T = 30_000;
const FUTURE = '2027-06-01';
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Per app, on PKP's default test dataset: the author who is given an upcoming editorial role
 * (the steps), the role, and a second author with current roles only (the neighbour).
 */
const CASES = {
    ojs: {user: 'amwandenga', name: 'Alan Mwandenga', search: 'Mwandenga', role: 'Section editor', other: {user: 'ccorino', name: 'Carlo Corino', search: 'Corino'}},
    omp: {user: 'aclark', name: 'Arthur Clark', search: 'Clark', role: 'Series editor', other: {user: 'afinkel', name: 'Alvin Finkel', search: 'Finkel'}},
    ops: {user: 'ccorino', name: 'Carlo Corino', search: 'Corino', role: 'Moderator', other: {user: 'ckwantes', name: 'Catherine Kwantes', search: 'Kwantes'}},
};
const email = (username) => `${username}@mailinator.com`;

/**
 * As the signed-in manager: the user's row "…" › "Edit", "Add Another Role", the role from
 * `start`, "Appear on the masthead", "Save And Continue", "Invite user to the role"; then,
 * signed out, the user opens "Accept Invitation" from the email and presses
 * "Accept And Continue to …". Returns what each screen said.
 */
async function inviteUpcoming(page, app, list, c, start = FUTURE) {
    const out = {};
    const row = await findRow(page, list, c.search, email(c.user));
    const since = new Date();
    await list.chooseAction(row, 'Edit');
    await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T});
    await idle(page);
    await page.getByRole('button', {name: 'Add Another Role'}).click();
    const newRow = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
    await newRow.waitFor({timeout: T});
    await newRow.getByLabel(/^Select a new role/).selectOption({label: c.role});
    await newRow.getByRole('textbox').fill(start);
    await newRow.getByRole('combobox').last().selectOption({label: 'Appear on the masthead'}).catch(() => {});
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    await page.getByLabel(/^Subject/).waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
    await sent.waitFor({timeout: T});
    out.sent = flat(await sent.innerText());
    let msg = await app.mail.find({to: email(c.user), since, timeoutMs: 20_000}).catch(() => null);
    if (!msg) {
        await drainJobs(app);
        msg = await app.mail.find({to: email(c.user), since, timeoutMs: 20_000});
    }
    const full = await app.mail.fullMessage(msg.ID);
    out.subject = full.Subject;
    const accept = app.mail.extractLink(full.HTML, 'Accept Invitation');
    await signOut(page);
    await page.goto(accept.replace(/^https?:\/\/[^/]+/, app.baseURL));
    await idle(page);
    const btn = page.getByRole('button', {name: /^Accept And Continue to/});
    await btn.waitFor({timeout: T});
    out.acceptButton = flat(await btn.innerText());
    await btn.click();
    const done = page.getByRole('dialog').first();
    await done.waitFor({timeout: T});
    out.accepted = flat(await done.innerText());
    await pause(500);
    return out;
}

/** Settings > Users & Roles > "Users", opened, with the list's page object. */
async function openList(page, app) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    const list = new UsersListPage(page, app.contextPath);
    await list.goto();
    await idle(page);
    return list;
}

/** Type `phrase` in the list's search box, press Enter, and return the row holding `address`. */
async function findRow(page, list, phrase, address) {
    await list.search(phrase);
    await idle(page);
    const row = list.row(address).first();
    await row.waitFor({timeout: T});
    return row;
}

/** A row's Roles and Start Date lines and its menu's labels. */
async function rowFacts(list, row) {
    return {
        roles: await list.cellLines(list.rolesCell(row)),
        startDate: await list.cellLines(list.startDateCell(row)),
        menu: await list.menuLabels(row),
    };
}

/** "Remove User" › "OK": the request's status and answer, and the dialog that follows (closed with "OK"). */
async function removeUser(page, list, row) {
    const {RemoveUserDialog} = require('../../../pages/UsersManagementPages.js');
    await list.chooseAction(row, 'Remove User');
    const dlg = new RemoveUserDialog(page);
    await dlg.expectOpen();
    const out = {dialog: flat(await dlg.dialog.innerText())};
    const response = await dlg.ok();
    out.status = response.status();
    out.answer = await response.json().catch(() => null);
    const after = page.getByRole('dialog').filter({hasText: /\S/}).last();
    if (await after.waitFor({timeout: 5000}).then(() => true).catch(() => false)) {
        out.after = flat(await after.innerText());
        const ok = after.getByRole('button', {name: 'OK', exact: true});
        if (await ok.count()) await ok.click();
        await pause(600);
    } else out.after = null;
    await idle(page);
    return out;
}

/** The roles page ("…" › "Edit"): each role row's text. */
async function rolesPage(page, list, row) {
    await list.chooseAction(row, 'Edit');
    await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T});
    await idle(page);
    await pause(800);
    return roleRows(page);
}

async function roleRows(page) {
    return page
        .locator('tr')
        .filter({has: page.getByRole('cell')})
        .evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter((t) => /\d{4}-\d{2}-\d{2}|---/.test(t)))
        .catch(() => []);
}

/**
 * On the roles page, "Remove Role" on the row naming `role`, and the dialog it opens: when it
 * offers "Remove Role", press it and wait for the request's answer. Returns the dialog's text,
 * the request's status and the rows after a reload.
 */
async function removeRole(page, role) {
    const out = {};
    const row = page.locator('tr').filter({hasText: role}).filter({has: page.getByRole('button', {name: /Remove Role/})}).first();
    if (!(await row.count())) return {offered: false};
    out.offered = true;
    await row.getByRole('button', {name: /Remove Role/}).click();
    const dlg = page.getByRole('dialog').filter({hasText: /\S/}).last();
    await dlg.waitFor({timeout: T});
    out.dialog = flat(await dlg.innerText());
    const confirm = dlg.getByRole('button', {name: /^Remove Role$/});
    if (await confirm.count()) {
        const answer = page.waitForResponse((r) => /endRole/.test(r.url()), {timeout: T}).catch(() => null);
        await confirm.click();
        const r = await answer;
        out.status = r ? r.status() : null;
        out.answer = r ? await r.json().catch(() => null) : null;
        await idle(page);
        await pause(800);
    } else {
        const close = dlg.getByRole('button', {name: /Close|OK/});
        if (await close.count()) await close.first().click();
        await pause(500);
    }
    await page.reload();
    await idle(page);
    await pause(800);
    out.rowsAfterReload = await roleRows(page);
    return out;
}

/** The user's role assignments in the context, as stored: role | start | end. */
function assignments(app, username) {
    const {table, id} = app.contextTables;
    return sql(
        app,
        `select s.setting_value, to_char(uug.date_start, 'YYYY-MM-DD'), coalesce(to_char(uug.date_end, 'YYYY-MM-DD'), '-')
           from user_user_groups uug
           join users u on u.user_id = uug.user_id
           join user_groups ug on ug.user_group_id = uug.user_group_id
           join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en'
          where u.username = '${username}' and ug.context_id = (select ${id} from ${table} where path = '${app.contextPath}')
          order by uug.user_user_group_id`
    )
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
}

module.exports = {T, FUTURE, CASES, email, flat, inviteUpcoming, openList, findRow, rowFacts, removeUser, rolesPage, roleRows, removeRole, assignments};
