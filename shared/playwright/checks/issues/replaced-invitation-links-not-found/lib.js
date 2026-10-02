// Helpers of walk.js here (issue report docs/issues/U06-A3-replaced-invitation-links-not-found.md).
// Requiring this file runs nothing. Sending an invitation, its "Invitation Sent" dialog and reading
// the email come from the U06 A5 walk's lib; here: the Invitations table's row menu ("Edit",
// "Cancel Invite") and opening an emailed link signed out.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Per app, on PKP's default test dataset (docs/process/dataset.md): the people and the roles. */
const CASES = {
    ojs: {
        role: 'Copyeditor', editedRole: 'Layout Editor',
        edited: 'ddiouf', resent: 'dphillips', cancelled: 'eostrom',
        neighbour: {first: 'fpaglieri', second: 'jnovak'},
    },
    omp: {
        role: 'Copyeditor', editedRole: 'Layout Editor',
        edited: 'dkennepohl', resent: 'fperini', cancelled: 'jbrower',
        neighbour: {first: 'lelder', second: 'mally'},
    },
    ops: {
        role: 'Moderator', editedRole: 'Editorial Board Member',
        edited: 'ddiouf', resent: 'dphillips', cancelled: 'eostrom',
        neighbour: {first: 'fpaglieri', second: 'jnovak'},
    },
};

const mailOf = (username) => `${username}@mailinator.com`;

/** The users list (required inside forEachApp's fn). */
function usersList(page, app) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    return new UsersListPage(page, app.contextPath);
}

/** Users & Roles, the Invitations row of `email`: open its row menu and press `item`. Returns the menu's items. */
async function invitationRowAction(page, app, email, item) {
    const list = usersList(page, app);
    await list.goto();
    await idle(page);
    const row = list.invitationRow(email).first();
    await row.waitFor({timeout: T});
    await row.getByRole('button', {name: /management.options/i}).click();
    const items = page.getByRole('menuitem');
    await items.first().waitFor({timeout: T});
    const offered = (await items.allInnerTexts()).map((x) => flat(x, 60));
    await page.getByRole('menuitem', {name: item, exact: true}).click();
    return offered;
}

/**
 * The row's "Edit": the "Edit Invitation" warning, then the wizard prefilled; the role row set to
 * `role`; "Save And Continue", "Invite user to the role". Leaves the "Invitation Sent" dialog open.
 * Returns the warning, the wizard's text as it opened, and the sent dialog's text.
 */
async function editInvitation(page, app, email, role) {
    const out = {};
    out.menu = await invitationRowAction(page, app, email, 'Edit');
    const warn = page.getByRole('dialog').filter({hasText: 'Edit Invitation'});
    await warn.waitFor({timeout: T});
    out.warning = flat(await warn.innerText());
    await warn.getByRole('button', {name: 'Edit Invitation', exact: true}).click();
    await page.waitForURL(/invitation\/edit\/\d+/, {timeout: T});
    await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
    await idle(page);
    const opened = await screen(page);
    out.wizardUrl = page.url().replace(/^https?:\/\/[^/]+/, '');
    out.wizardText = flat(opened.text.main, 1500);
    const row = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
    await row.waitFor({timeout: T});
    out.prefilledRole = await row.getByLabel(/^Select a new role/).evaluate((s) => s.options[s.selectedIndex]?.text || null);
    await row.getByLabel(/^Select a new role/).selectOption({label: role});
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    await page.locator('input[name="subject"]').waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
    await sent.waitFor({timeout: T});
    out.sent = flat(await sent.innerText());
    return out;
}

/** The row's "Cancel Invite", then the confirmation's "Cancel Invitation". Returns the confirmation's text. */
async function cancelInvitation(page, app, email) {
    const menu = await invitationRowAction(page, app, email, 'Cancel Invite');
    const dlg = page.getByRole('dialog').filter({hasText: 'Cancel Invitation'});
    await dlg.waitFor({timeout: T});
    const text = flat(await dlg.innerText());
    await dlg.getByRole('button', {name: 'Cancel Invitation', exact: true}).click();
    await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return {menu, text};
}

/**
 * Open an emailed link in a signed-out browser: the answer's status, the page's title and heading,
 * its text, its buttons and links, and whether it is the accept wizard or the "Invitation
 * Unavailable" page. Never throws on the outcome.
 */
async function openLink(page, link) {
    const resp = await page.goto(link).catch((e) => ({error: e.message}));
    await page.waitForLoadState('load').catch(() => {});
    await idle(page);
    // the accept wizard draws its step after the load; give it the time it needs
    await page.getByRole('heading', {name: /^STEP \d|Invitation Unavailable|Decline Invitation/}).first()
        .waitFor({timeout: 10_000}).catch(() => {});
    const shown = await screen(page);
    const body = flat(await page.locator('body').innerText().catch(() => ''), 800);
    return {
        status: resp && typeof resp.status === 'function' ? resp.status() : resp && resp.error,
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        title: await page.title(),
        headings: (await page.getByRole('heading').allInnerTexts().catch(() => [])).map((h) => flat(h, 120)),
        body,
        buttons: (await page.getByRole('button').allInnerTexts().catch(() => [])).map((b) => flat(b, 60)).filter(Boolean),
        links: (await page.getByRole('link').allInnerTexts().catch(() => [])).map((b) => flat(b, 60)).filter(Boolean),
        stylesheets: await page.locator('link[rel="stylesheet"]').count(),
        acceptWizard: (await page.getByRole('heading', {name: /^STEP \d/}).count()) > 0,
        declinePage: (await page.getByRole('button', {name: 'Confirm Decline Invitation'}).count()) > 0,
        unavailable: (await page.getByRole('heading', {name: 'Invitation Unavailable'}).count()) > 0,
        screen: shown,
    };
}

/** The link with one character of its key changed (a link mangled in transit). */
function tamper(link) {
    return link.replace(/([?&]key=)([^&])/, (m, p, c) => p + (c === 'a' ? 'b' : 'a'));
}

module.exports = {CASES, mailOf, flat, usersList, invitationRowAction, editInvitation, cancelInvitation, openLink, tamper};
