// Helpers of walk.js here (issue report
// docs/issues/U06-A11-invitation-promises-masthead-for-unlisted-roles.md). Requiring this file runs
// nothing. Every helper drives the screens as a person does: the manager's Settings > Users & Roles
// "Invite to a role" wizard, the invitation email, the public "Editorial Masthead" page.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 3000) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const CASES = {
    ojs: {
        invitee: {name: 'David Buskins', email: 'dbuskins@mailinator.com'},
        listedRole: 'Section editor',
        neighbour: {name: 'Carlo Corino', email: 'ccorino@mailinator.com'},
    },
    omp: {
        invitee: {name: 'David Buskins', email: 'dbuskins@mailinator.com'},
        listedRole: 'Series editor',
        neighbour: {name: 'Arthur Clark', email: 'aclark@mailinator.com'},
    },
    ops: {
        invitee: {name: 'David Buskins', email: 'dbuskins@mailinator.com'},
        listedRole: 'Moderator',
        neighbour: {name: 'Carlo Corino', email: 'ccorino@mailinator.com'},
    },
};
const INVITER = 'rvaca';

function today() {
    return new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
}

/** About > "Editorial Masthead" as the current browser sees it: the text of the page's main part. */
async function mastheadPage(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/about/editorialMasthead`));
    await idle(page);
    const shown = await screen(page);
    const main = page.locator('.page_masthead, .page').first();
    const text = (await main.count()) ? await main.innerText() : shown.text.main;
    const headings = await page.locator('.page h2, .page h3, .page h4').allInnerTexts().catch(() => []);
    return {url: page.url(), text: flat(text, 4000), headings: headings.map((h) => h.trim()), screen: shown};
}

/**
 * Settings > Users & Roles > "Invite to a role": search `email`, read the roles table; in the new
 * role row pick `role`, today, `masthead` ("Appear on the masthead" by default); "Save And
 * Continue"; read the compose step; "Invite user to the role". Returns what each step showed.
 * Records nothing itself; never throws on what the screens show after the send.
 */
async function invite(page, app, {email, role, masthead = 'Appear on the masthead'}) {
    const out = {email, role, masthead};
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
    await page.getByRole('heading', {name: 'Users & Roles'}).first().waitFor({timeout: T});
    await idle(page);
    await page.getByRole('button', {name: 'Invite to a role'}).click();
    await page.getByLabel(/Search for a user by email address/).fill(email);
    await page.getByRole('button', {name: 'Search User', exact: true}).click();
    const newRow = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
    await newRow.waitFor({timeout: T});
    await idle(page);
    out.details = await screen(page);
    out.rolesTable = flat(await page.getByRole('table').first().innerText().catch(() => ''), 1500);
    out.header = flat(await page.locator('main').innerText(), 600);
    await newRow.getByLabel(/^Select a new role/).selectOption({label: role});
    await newRow.getByRole('textbox').fill(today());
    out.mastheadOptions = await newRow.getByRole('combobox').last().locator('option').allInnerTexts();
    await newRow.getByRole('combobox').last().selectOption({label: masthead});
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    await page.locator('input[name="subject"]').waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    out.compose = await screen(page);
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
    await sent.waitFor({timeout: T}).catch(() => {});
    out.sentText = (await sent.count()) ? flat(await sent.innerText(), 400) : null;
    if (out.sentText) {
        await sent.getByRole('button', {name: 'View All Users'}).click();
        await idle(page);
    }
    return out;
}

/**
 * The invitation email to `to` since `since` whose links point at this install (every fleet of the
 * slot mails the one mail catcher): subject, its text, the masthead sentences, the accept link.
 */
async function invitationEmail(app, to, since) {
    const host = new URL(app.baseURL).host;
    const deadline = Date.now() + T;
    for (;;) {
        const found = await app.mail._search({to, since});
        for (const m of found.messages || []) {
            const full = await app.mail.fullMessage(m.ID);
            const html = full.HTML || '';
            if (!html.includes(host) || !/\/invitation\/accept\?/.test(html)) continue;
            const hit = html.match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i);
            const text = flat(full.Text || html.replace(/<[^>]+>/g, ' '), 4000);
            return {
                subject: full.Subject,
                text,
                sentences: text.match(/Your name will (?:not )?appear in [^.]*\./g) || [],
                accept: hit ? hit[1].replace(/&amp;/g, '&') : null,
            };
        }
        if (Date.now() > deadline) return {subject: null, text: null, sentences: [], accept: null};
        await new Promise((r) => setTimeout(r, 1000));
    }
}

module.exports = {CASES, INVITER, flat, today, mastheadPage, invite, invitationEmail};
