// Helpers of walk.js here (issue report
// docs/issues/U06-A5-invitation-sent-promises-decision-updates.md). Requiring this file runs nothing.
// The send wizard is driven through invite() of the U54 A14 walk's lib (Settings > Users & Roles,
// "Invite to a role", an existing account searched by email, one role, today, sent); the users list
// through the U53 page object (shared/playwright/pages/UsersManagementPages.js).
const {idle, screen} = require('../../../probe');
const {invite} = require('../users-tab-keeps-renamed-role-old-name/lib.js');

const T = 30_000;
const ACR = {ojs: 'OJS', omp: 'OMP', ops: 'OPS'};

/** Per app, on PKP's default test dataset (docs/process/dataset.md): the role offered and the people. */
const CASES = {
    ojs: {
        role: 'Copyeditor',
        accepts: {name: 'Carlo Corino', email: 'ccorino@mailinator.com'},
        declines: {name: 'Catherine Kwantes', email: 'ckwantes@mailinator.com'},
        neighbour: {name: 'Domatilia Sokoloff', email: 'dsokoloff@mailinator.com'},
    },
    omp: {
        role: 'Copyeditor',
        accepts: {name: 'Arthur Clark', email: 'aclark@mailinator.com'},
        declines: {name: 'Alvin Finkel', email: 'afinkel@mailinator.com'},
        neighbour: {name: 'Bob Barnetson', email: 'bbarnetson@mailinator.com'},
    },
    ops: {
        role: 'Moderator',
        accepts: {name: 'Carlo Corino', email: 'ccorino@mailinator.com'},
        declines: {name: 'Catherine Kwantes', email: 'ckwantes@mailinator.com'},
        neighbour: {name: 'Domatilia Sokoloff', email: 'dsokoloff@mailinator.com'},
    },
};

const INVITER = {username: 'rvaca', email: 'rvaca@mailinator.com'};

const flat = (s, n = 1500) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** The users list (required inside forEachApp's fn). */
function usersList(page, app) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    return new UsersListPage(page, app.contextPath);
}

/**
 * Users & Roles, "Invite to a role" for `email` with `role`, sent; returns the "Invitation Sent"
 * dialog's title, text and buttons, read before anything is pressed. Leaves the dialog open.
 */
async function sendInvitation(page, app, {email, role}) {
    await usersList(page, app).goto();
    await idle(page);
    await invite(page, app, {email, roleName: role});
    const dialog = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
    const shown = await screen(page);
    return {
        screen: shown,
        text: flat(await dialog.innerText()),
        buttons: await dialog.getByRole('button').allInnerTexts(),
    };
}

/** Press the "Invitation Sent" dialog's "View All Users"; returns the address it lands on. */
async function viewAllUsers(page) {
    await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).getByRole('button', {name: 'View All Users'}).click();
    await page.waitForURL(/management\/settings\/access/, {timeout: T});
    await idle(page);
    return page.url();
}

/**
 * The invitation email to `to` sent by this fleet since `since` (every fleet of the slot mails the
 * one Mailpit, so the message is picked by the fleet's own address in its links): subject, from,
 * and the accept and decline links.
 */
async function invitationMail(app, to, since) {
    const host = new URL(app.baseURL).host;
    const deadline = Date.now() + T;
    for (;;) {
        const found = await app.mail._search({to, since});
        for (const m of found.messages || []) {
            const full = await app.mail.fullMessage(m.ID);
            const html = full.HTML || '';
            if (!html.includes(host)) continue;
            const grab = (op) => {
                const hit = html.match(new RegExp(`href=['"]([^'"]*/invitation/${op}\\?[^'"]+)['"]`, 'i'));
                return hit ? hit[1].replace(/&amp;/g, '&') : null;
            };
            return {subject: full.Subject, from: (full.From || {}).Address, accept: grab('accept'), decline: grab('decline')};
        }
        if (Date.now() > deadline) throw new Error(`no invitation email to ${to} from ${host}`);
        await new Promise((r) => setTimeout(r, 1000));
    }
}

/** Every message to `to` since `since`: subject, sender, and whether it came from this fleet. */
async function inbox(app, to, since) {
    const host = new URL(app.baseURL).host;
    const found = await app.mail._search({to, since});
    const out = [];
    for (const m of found.messages || []) {
        const full = await app.mail.fullMessage(m.ID);
        out.push({subject: full.Subject, from: (full.From || {}).Address, at: m.Created,
            thisFleet: `${full.HTML || ''}${full.Text || ''}`.includes(host)});
    }
    return out;
}

/** Signed out: the emailed accept link, then "Accept And Continue to <app>"; the closing dialog. */
async function accept(page, app, link) {
    await page.goto(link);
    const btn = page.getByRole('button', {name: new RegExp(`^Accept And Continue to ${ACR[app.name]}`)});
    await btn.waitFor({timeout: T});
    await idle(page);
    const before = await screen(page);
    await btn.click();
    const dialog = page.getByRole('dialog');
    await dialog.first().waitFor({timeout: T});
    await idle(page);
    const after = await screen(page);
    return {before, after, dialogText: flat(after.text.dialog)};
}

/** Signed out: the emailed decline link, then "Confirm Decline Invitation"; where it lands. */
async function decline(page, link) {
    await page.goto(link);
    await idle(page);
    const before = await screen(page);
    await page.getByRole('button', {name: 'Confirm Decline Invitation'}).click();
    await page.waitForURL(/\/login/, {timeout: T}).catch(() => {});
    await idle(page);
    const after = await screen(page);
    return {before, after, landed: page.url()};
}

/** The header's "Tasks" button: its text; then pressed, what the panel shows (null when absent). */
async function tasks(page) {
    const btn = page.getByRole('button', {name: /Tasks/}).first();
    if (!(await btn.count())) return {button: null};
    const label = flat(await btn.innerText().catch(() => ''), 100);
    const aria = await btn.getAttribute('aria-label').catch(() => null);
    await btn.click();
    await idle(page);
    const shown = await screen(page);
    return {button: label, aria, panel: flat(shown.text.dialog || shown.text.main, 800), screen: shown};
}

/** Users & Roles: the Invitations table's rows for the people, and their Current Users rows. */
async function usersAndRoles(page, app, people) {
    const list = usersList(page, app);
    await list.goto();
    await idle(page);
    const out = {
        invitationsHeading: flat(await list.invitationsHeading().innerText().catch(() => null), 100),
        invitationRows: flat(await list.invitationsTable.locator('tbody').innerText().catch(() => null), 1200),
        screen: await screen(page),
    };
    for (const p of people) {
        const inv = list.invitationRow(p.email);
        out[p.email] = {
            invitationRows: await inv.count(),
            invitation: (await inv.count()) ? flat(await inv.first().innerText(), 300) : null,
        };
    }
    // Current Users: each person found through the list's search box (the list is paged)
    for (const p of people) {
        await list.search(p.name);
        await idle(page);
        const row = list.row(p.email);
        out[p.email].currentUserRow = (await row.count()) ? flat(await row.first().innerText(), 300) : null;
        out[p.email].roles = (await row.count()) ? await list.cellLines(list.rolesCell(row.first())) : null;
    }
    return out;
}

module.exports = {CASES, INVITER, ACR, flat, usersList, sendInvitation, viewAllUsers, invitationMail, inbox, accept, decline, tasks, usersAndRoles};
