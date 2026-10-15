// Helpers of walk.js here (U38 A12: an editor who is also the submission's author is offered no
// "View changes", but the link's address shows them the edited review's old and new text).
// Requiring this file runs nothing. Each helper drives the screens as a person does and records
// what it meets instead of throwing on a control the fix (or an older line) leaves out.
// The edited review and the "View changes" read come from the A11 walk's lib.js
// (../activity-log-view-changes-reads-any-review/lib.js), which reuses the U27 A30/A31 helpers.
const {idle, launch, screen} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Per app, on PKP's default test dataset (docs/process/dataset.md): the submission in Review with
 * a completed review, its reviewer, its own author account (Author and Reader only), the editor
 * role's label, and an assigned Section editor who is not an author (the neighbour's reader).
 */
const CASES = {
    ojs: {
        sub: {id: 10, title: 'Condensing Water Availability Models', reviewer: 'Aisla McCrae'},
        author: {username: 'jnovak', name: 'John Novak'},
        editorRole: 'Section editor',
        managerRole: 'Journal editor', // a manager-level group
        otherEditor: 'dbuskins',
        accept: /^Accept And Continue to/,
    },
    omp: {
        sub: {id: 16, title: "A Designer's Log: Case Studies in Instructional Design", reviewer: 'Adela Gallego'},
        author: {username: 'mpower', name: 'Michael Power'},
        editorRole: 'Series editor',
        managerRole: 'Press editor', // a manager-level group
        otherEditor: null, // no Series editor is assigned to 16 in the dataset
        accept: /^Accept And Continue to/,
    },
};

const mailOf = (username) => `${username}@mailinator.com`;
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Settings › Users & Roles › Users › "Invite to a role": search the address, choose the role in the
 * new role row (start today, on the masthead), "Save And Continue", subject tagged, "Invite user to
 * the role". Returns what each step showed.
 */
async function inviteToRole(page, app, {email, role, subject}) {
    const out = {};
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
    await page.getByRole('heading', {name: 'Users & Roles'}).first().waitFor({timeout: T});
    await idle(page);
    await page.getByRole('button', {name: 'Invite to a role'}).click();
    const search = page.getByLabel(/Search for a user by email address/);
    await search.waitFor({timeout: T});
    await search.fill(email);
    await page.getByRole('button', {name: 'Search User', exact: true}).click();
    await page.getByRole('heading', {name: /Enter details/}).first().waitFor({timeout: T});
    await idle(page);
    let newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).last();
    if (!(await newRow.count())) { await page.getByRole('button', {name: 'Add Another Role'}).click(); await sleep(500); newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).last(); }
    out.roleOptions = (await newRow.getByRole('combobox').first().locator('option').allInnerTexts()).map((t) => flat(t, 60));
    await newRow.getByRole('combobox').first().selectOption({label: role});
    await newRow.getByRole('textbox').fill(today());
    await newRow.getByRole('combobox').last().selectOption({label: 'Appear on the masthead'}).catch(() => {});
    out.details = flat(await page.locator('main').innerText(), 1200);
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    const subj = page.locator('input[name="subject"]');
    await subj.waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page); await sleep(500);
    await subj.fill(subject);
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
    out.sent = await sent.waitFor({timeout: T}).then(() => true).catch(() => false);
    if (out.sent) out.sentText = flat(await sent.innerText(), 300);
    await sent.getByRole('button', {name: 'View All Users'}).click().catch(() => {});
    await idle(page);
    return out;
}

/** Open the invitation email's accept link in a browser of its own and accept (ORCID skipped if asked). */
async function acceptInvitation(app, {email, subject, since, accept}) {
    const out = {};
    const summary = await app.fleetMail.find({to: email, contains: subject, since, timeoutMs: 60_000});
    const full = await app.fleetMail.fullMessage(summary.ID);
    const m = (full.HTML || '').match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i);
    out.subject = summary.Subject;
    out.link = !!m;
    if (!m) return out;
    const inv = await launch(app);
    try {
        const ip = inv.page;
        await ip.goto(m[1].replace(/&amp;/g, '&'));
        await idle(ip);
        const skip = ip.getByRole('button', {name: 'Skip ORCID verification'});
        if (await skip.isVisible().catch(() => false)) { out.orcidSkipped = true; await skip.click(); await idle(ip); }
        const button = ip.getByRole('button', {name: accept});
        await button.waitFor({timeout: T});
        out.review = flat(await ip.locator('main').innerText(), 1200);
        await button.click();
        const done = ip.getByRole('dialog').filter({hasText: /assigned a new role/});
        out.accepted = await done.waitFor({timeout: T}).then(() => true).catch(() => false);
        if (out.accepted) out.acceptedText = flat(await done.innerText(), 300);
        else out.after = await screen(ip).catch(() => null);
    } finally { await inv.close(); }
    return out;
}

/** The workflow's "Participants" › "Assign": the role, the person, "OK". Uses the suites' page object. */
async function assignParticipant(page, app, {id, role, name}) {
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const panel = new ParticipantsPanel(page, app.contextPath);
    await panel.goto(id);
    await idle(page);
    const win = await panel.openAssign();
    const out = {roles: await win.roleOptions().catch(() => null)};
    await win.chooseRole(role);
    await win.search(name).catch(() => {});
    out.people = await win.peopleNames().catch(() => null);
    await win.choosePerson(name);
    await win.ok();
    await panel.reland();
    out.rows = await panel.rowLines().catch(() => null);
    return out;
}

/**
 * "Activity Log" from the open workflow: the review-change lines ("modified in this review"), each
 * with whether its arrow is there and whether its strip offers "View changes"; plus the line count.
 */
async function readReviewChangeLines(page) {
    const out = {};
    const btn = page.getByRole('button', {name: 'Activity Log', exact: true}).first();
    out.offered = await btn.isVisible().catch(() => false);
    if (!out.offered) return out;
    await btn.click();
    const log = page.getByRole('dialog', {name: 'Activity Log & Notes', exact: true});
    await log.waitFor({timeout: T});
    const rows = log.locator('tbody tr.gridRow');
    await rows.first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    out.lineCount = await rows.count();
    out.lines = [];
    const changed = rows.filter({hasText: 'modified in this review'});
    for (let i = 0; i < await changed.count(); i++) {
        const r = changed.nth(i);
        const line = {text: flat(await r.innerText(), 300), arrow: (await r.locator('a.show_extras').count()) > 0};
        if (line.arrow) {
            await r.locator('a.show_extras').click();
            await sleep(400);
            line.viewChanges = (await r.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'View changes', exact: true}).count()) > 0;
        }
        out.lines.push(line);
    }
    out.closeLog = async () => {
        await log.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await log.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    };
    return out;
}

/** Type an address into the address bar: the status, the tab's text, and whether it holds the review change. */
async function typeAddress(page, address, needle) {
    const res = await page.goto(address).catch((e) => ({error: e.message}));
    await idle(page).catch(() => {});
    const content = await page.content();
    const body = flat(await page.locator('body').innerText().catch(() => ''), 900);
    return {
        status: res && res.status ? res.status() : res,
        body,
        isReviewChange: /Updated Comments|Previous Comments|Updated Reviewer Recommendation|Updated Form Responses|Updated Competing Interests/.test(content),
        hasEditedText: needle ? content.includes(needle) : null,
    };
}

module.exports = {T, sleep, flat, CASES, mailOf, today, inviteToRole, acceptInvitation, assignParticipant, readReviewChangeLines, typeAddress};
