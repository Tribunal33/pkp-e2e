// Helpers of walk.js here (issue report docs/issues/U06-A4-newcomer-not-signed-in-after-accepting.md).
// Requiring this file runs nothing. Every helper drives the screens as a person does: the manager's
// Settings > Users & Roles "Invite to a role" wizard, the invitation email's accept link and the
// accept wizard it opens.
const {idle, screen} = require('../../../probe');

const T = 30_000;

/** Per app, on PKP's default test dataset (docs/process/dataset.md): the role offered. */
const ROLE = {ojs: 'Copyeditor', omp: 'Copyeditor', ops: 'Moderator'};

/** Dataset authors who do not hold the role: one opens the link signed out, one signed in. */
const EXISTING = {
    ojs: {signedOut: 'amwandenga', signedIn: 'ccorino'},
    omp: {signedOut: 'aclark', signedIn: 'afinkel'},
    ops: {signedOut: 'ccorino', signedIn: 'ckwantes'},
};

/** The newcomer the steps invite (names tagged u06a). */
const NEWCOMER = {
    email: 'nova.u06a@mailinator.com',
    givenName: 'Nova',
    familyName: 'Quill',
    username: 'novau06a',
    password: 'novau06anovau06a', // the username twice, so the kit's signIn() takes it
    country: 'Canada',
};

const mailOf = (username) => `${username}@mailinator.com`;

function today() {
    return new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
}

/**
 * Settings > Users & Roles > "Invite to a role": search `email`; for a newcomer type the names on
 * "Enter details"; one role row (role, today, "Appear on the masthead"); "Save And Continue";
 * "Invite user to the role". Returns the search answer and the sent dialog's text.
 */
async function invite(page, app, {email, givenName, familyName, role}) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
    await page.getByRole('heading', {name: 'Users & Roles'}).first().waitFor({timeout: T});
    await idle(page);
    await page.getByRole('button', {name: 'Invite to a role'}).click();
    await page.getByLabel(/Search for a user by email address/).fill(email);
    await page.getByRole('button', {name: 'Search User', exact: true}).click();
    const newRow = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
    await newRow.waitFor({timeout: T});
    await idle(page);
    const searchAnswer = (await page.locator('main').innerText())
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /does not have a role|already exists/.test(l));
    if (givenName) {
        await page.getByLabel(/^Given Name/).first().fill(givenName);
        await page.getByLabel(/^Family Name/).first().fill(familyName);
    }
    await newRow.getByLabel(/^Select a new role/).selectOption({label: role});
    await newRow.getByRole('textbox').fill(today());
    await newRow.getByRole('combobox').last().selectOption({label: 'Appear on the masthead'});
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    await page.locator('input[name="subject"]').waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
    await sent.waitFor({timeout: T});
    const sentText = (await sent.innerText()).replace(/\s+/g, ' ').trim();
    await sent.getByRole('button', {name: 'View All Users'}).click();
    await idle(page);
    return {email, searchAnswer, sentText};
}

/**
 * The accept link of the newest invitation email to `email` since `since` whose link points at this
 * install (other installs of the machine mail the same dataset addresses to the same mail catcher).
 */
async function acceptLink(app, email, since) {
    const origin = new URL(app.baseURL).origin;
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        const result = await app.mail._search({to: email, since});
        for (const m of result.messages || []) {
            const full = await app.mail.fullMessage(m.ID);
            const found = (full.HTML || '').match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i);
            const link = found ? found[1].replace(/&amp;/g, '&') : null;
            if (link && link.startsWith(origin)) return {subject: full.Subject, accept: link};
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    return {subject: null, accept: null};
}

/** Where the browser is and whether it is signed in, as the page shows it. */
async function where(page) {
    const shown = await screen(page);
    const url = page.url().replace(/^https?:\/\/[^/]+/, '');
    // the sign-in form's password box; the header names the signed-in user, or offers "Login"
    const loginForm = await page.locator('input[type="password"]:visible').count();
    const header = shown.text && shown.text.header ? shown.text.header.replace(/\s+/g, ' ').trim().slice(0, 300) : null;
    return {url, title: shown.title, loginForm, header};
}

/** The step heading the accept wizard shows now ("STEP 1 - …"), or null. */
async function stepHeading(page) {
    const h = page.getByRole('heading', {name: /^STEP \d/});
    return (await h.count()) ? (await h.first().innerText()).trim() : null;
}

/** Wait for the accept wizard's first step; skip the ORCID step when shown. Returns the headings met. */
async function openAccept(page, link) {
    const met = [];
    await page.goto(link);
    await page.getByRole('heading', {name: /^STEP \d/}).first().waitFor({timeout: T});
    await idle(page);
    met.push(await stepHeading(page));
    const skip = page.getByRole('button', {name: 'Skip ORCID verification'});
    if (await skip.count()) {
        await skip.click();
        await idle(page);
        met.push(await stepHeading(page));
    }
    return met;
}

/** A newcomer's "Create … account" and "Enter details" steps, as the steps say. */
async function newcomerSteps(page) {
    const met = [];
    await page.getByLabel(/^Username/).fill(NEWCOMER.username);
    await page.getByLabel(/^Password/).fill(NEWCOMER.password);
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', {name: 'Save and continue'}).click();
    await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
    await idle(page);
    met.push(await stepHeading(page));
    await page.getByLabel(/^Country/).first().selectOption({label: NEWCOMER.country});
    await page.getByRole('button', {name: 'Save and continue'}).click();
    await page.getByRole('heading', {name: /Review & create account/}).waitFor({timeout: T});
    await idle(page);
    met.push(await stepHeading(page));
    return met;
}

/**
 * "Accept And Continue to …", the closing dialog, "View All Submissions"; returns the dialog's text,
 * the finalize answer and where the browser lands. Never throws on the outcome.
 */
async function acceptAndLeave(page) {
    const out = {};
    const answers = [];
    const onResponse = (r) => {
        if (/\/invitations\/\d+\/key\/[^/]+\/finalize/.test(r.url())) answers.push(r.status());
    };
    page.on('response', onResponse);
    const accept = page.getByRole('button', {name: /^Accept And Continue to/});
    out.acceptLabel = (await accept.innerText()).trim();
    await accept.click();
    const dialog = page.getByRole('dialog').filter({hasText: /assigned a new role/});
    await dialog.waitFor({timeout: T}).catch(() => {});
    out.dialog = (await dialog.count()) ? (await dialog.innerText()).replace(/\s+/g, ' ').trim() : null;
    out.finalize = answers.slice();
    if (out.dialog) {
        await Promise.all([
            page.waitForURL((u) => !/\/invitation\/accept/.test(String(u)), {timeout: T}).catch(() => {}),
            dialog.getByRole('button', {name: 'View All Submissions'}).click(),
        ]);
        await page.waitForLoadState('load').catch(() => {});
        await idle(page);
    }
    page.off('response', onResponse);
    out.landed = await where(page);
    return out;
}

module.exports = {ROLE, EXISTING, NEWCOMER, mailOf, invite, acceptLink, where, stepHeading, openAccept, newcomerSteps, acceptAndLeave};
