// Helpers of walk.js (issue report docs/issues/U51-A16-subscription-manager-offered-institutions-refused.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or types an address.
const {idle, signOut, drainJobs} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));
const DENIED = /The current role does not have access to this operation\./;
const today = () => new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());

/** The side menu ("Site Navigation"): its entries in order, and whether it links the Institutions page. */
async function sideMenu(page) {
    const nav = page.getByRole('navigation', {name: 'Site Navigation'});
    if (!(await nav.count().catch(() => 0))) return {present: false};
    return nav.first().evaluate((el) => {
        const tx = (e) => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim();
        const links = [...el.querySelectorAll('a')].map((a) => ({text: tx(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}));
        const groups = [...el.querySelectorAll('[role="button"][aria-controls]')].map(tx);
        return {
            present: true,
            entries: [...groups, ...links.map((l) => l.text)].filter((x, i, a) => x && a.indexOf(x) === i),
            institutions: links.some((l) => /management\/settings\/institutions/.test(l.href)),
            payments: links.some((l) => /\/payments(\/|$|\?)/.test(l.href)),
        };
    });
}

/** Press a side menu link whose address matches `hrefPart`, and wait for the next page. */
async function pressMenuLink(page, hrefPart) {
    const link = page.getByRole('navigation', {name: 'Site Navigation'}).locator(`a[href*="${hrefPart}"]`).first();
    const before = page.url();
    await Promise.all([page.waitForURL((u) => u.href !== before, {timeout: T}), link.click()]);
    await idle(page);
    await pause(400);
}

/**
 * Settings › Users & Roles › "Users", "Invite to a role" for an existing account by its email,
 * the role from today, "Save And Continue", "Invite user to the role"; then the user, signed
 * out, opens "Accept Invitation" from the email and presses "Accept And Continue to …".
 * Returns the invitation email's subject and the accept button's text.
 */
async function inviteAndAccept(page, app, {email, roleName, mark}) {
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const startedAt = Date.now();
    await page.goto(cu('/management/settings/access'));
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
    if (mark) await mark('invite-details');
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    await page.locator('input[name="subject"]').waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T});
    if (mark) await mark('invitation-sent');
    // The newest message to the address naming the role, sent after the invitation was started.
    const fresh = async (ms) => {
        const end = Date.now() + ms;
        for (;;) {
            const m = await app.mail.find({to: email, contains: roleName, timeoutMs: 1000}).catch(() => null);
            if (m && Date.parse(m.Created) >= startedAt - 2000) return m;
            if (Date.now() > end) return null;
            await pause(500);
        }
    };
    let msg = await fresh(15_000);
    let drained = false;
    if (!msg) { await drainJobs(app); drained = true; msg = await fresh(15_000); }
    if (!msg) throw new Error(`no invitation email to ${email} after ${new Date(startedAt).toISOString()}`);
    const full = await app.mail.fullMessage(msg.ID);
    const accept = app.mail.extractLink(full.HTML, 'Accept Invitation');
    await signOut(page);
    await page.goto(accept.replace(/^https?:\/\/[^/]+/, app.baseURL));
    await idle(page);
    const acceptBtn = page.getByRole('button', {name: /^Accept And Continue to/});
    await acceptBtn.waitFor({timeout: T});
    const button = await acceptBtn.innerText();
    await acceptBtn.click();
    await page.getByRole('dialog').filter({hasText: /assigned a new role/}).waitFor({timeout: T});
    if (mark) await mark('invitation-accepted');
    return {subject: full.Subject, button, drained};
}

module.exports = {T, pause, rel, DENIED, today, sideMenu, pressMenuLink, inviteAndAccept};
