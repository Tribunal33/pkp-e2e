// Helpers for the issue walk in this folder (docs/issues/U54-A11-*.md).
// Requiring this file runs nothing.
//
// inviteToRole(): Settings › Users & Roles › "Users" › "Invite to a role" for
// an existing user of the context, through the screens (the flow the U66 A1
// walk takes, institutions-menu-without-settings-permission/walk.js).
// acceptInvitation(): the invited user, signed out, opens the emailed
// "Accept Invitation" link and accepts.
const {idle, drainJobs, signOut} = require('../../../probe');

const T = 20_000;

/** Today as YYYY-MM-DD, the invitation's start date. */
function today() {
    return new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
}

/**
 * Invite an existing user (by email) to a role, signed in as a manager.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} app the probe kit's app bag
 * @param {{email: string, roleName: string, snap?: (name: string) => Promise<any>}} options
 */
async function inviteToRole(page, app, {email, roleName, snap = async () => {}}) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
    await idle(page);
    await page.getByRole('button', {name: 'Invite to a role'}).click();
    await page.getByLabel(/Search for a user by email address/).fill(email);
    await page.getByRole('button', {name: 'Search User', exact: true}).click();
    const newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).first();
    await newRow.waitFor({timeout: T});
    await idle(page);
    await newRow.getByRole('combobox').first().selectOption({label: roleName});
    await newRow.getByRole('textbox').fill(today());
    await newRow.getByRole('combobox').last().selectOption({index: 1});
    await snap('invite-details');
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    await page.locator('input[name="subject"]').waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T});
    await snap('invitation-sent');
}

/**
 * The invited user accepts from the emailed link (signs the page out first).
 * Resolves with the email's subject.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} app
 * @param {{email: string, contains: string, snap?: (name: string) => Promise<any>}} options
 */
async function acceptInvitation(page, app, {email, contains, snap = async () => {}}) {
    // The dataset runs its jobs on web requests; drainJobs only if the mail is late.
    let msg = await app.mail.find({to: email, contains, timeoutMs: 15_000}).catch(() => null);
    if (!msg) {
        await drainJobs(app);
        msg = await app.mail.find({to: email, contains});
    }
    const full = await app.mail.fullMessage(msg.ID);
    const accept = app.mail.extractLink(full.HTML, 'Accept Invitation');
    await signOut(page);
    await page.goto(accept.replace(/^https?:\/\/[^/]+/, app.baseURL));
    await idle(page);
    const acceptBtn = page.getByRole('button', {name: /^Accept And Continue to/});
    await acceptBtn.waitFor({timeout: T});
    await snap('accept-review');
    await acceptBtn.click();
    await page.getByRole('dialog').filter({hasText: /assigned a new role/}).waitFor({timeout: T});
    await snap('accepted');
    return full.Subject;
}

module.exports = {inviteToRole, acceptInvitation, today};
