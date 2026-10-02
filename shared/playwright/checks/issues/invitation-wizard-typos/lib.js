// Helpers of the U06 A7 walks (issue reports docs/issues/U06-A7-*.md): the send wizard
// (Settings > Users & Roles > "Invite to a role" and a user's "Edit"), the invitation email, the
// accept and decline pages it links to, an editorial decision page and the Activity Log.
// Requiring this file runs nothing. Every helper drives the screens as a person does.
const {idle, screen} = require('../../../probe');

const T = 30_000;

/** The person every walk invites, on PKP's default test dataset: holds a role, no Author role. */
const PERSON = {username: 'dbuskins', name: 'David Buskins', email: 'dbuskins@mailinator.com'};

/** Per app: a dataset submission in the Submission stage (or a moderated preprint) with an author. */
const DECISION = {
    ojs: {submissionId: 4, title: 'Computer Skill Requirements for New and Existing Teachers'},
    omp: {submissionId: 3, title: 'The Political Economy of Workplace Injury in Canada'},
    ops: {submissionId: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'},
};

const flat = (s, n = 4000) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

function today() {
    return new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
}

/** Settings > Users & Roles, in `locale` (default en). */
async function usersAndRoles(page, app, locale = 'en') {
    await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/management/settings/access`));
    await page.locator('main h1').first().waitFor({timeout: T});
    await idle(page);
}

/** Press "Invite to a role" (the button is the first in the Invitations box); wait for step 1. */
async function openInviteWizard(page) {
    await page.locator('main').getByRole('button').filter({hasText: /Invite to a role|Inviter à un rôle/}).first().click();
    await page.locator('input[name="search"]').waitFor({timeout: T});
    await idle(page);
}

/** Step 1's heading and the paragraph under it. */
async function stepIntro(page) {
    const h = page.locator('.pkpStep:not([hidden]) h2').first();
    const p = page.locator('.pkpStep:not([hidden]) p.mt-1').first();
    return {heading: flat(await h.innerText().catch(() => null), 200), description: flat(await p.innerText().catch(() => null), 1000)};
}

/** Type the address into step 1's box and press "Search User"; waits for "Enter details". */
async function searchUser(page, email) {
    await page.locator('input[name="search"]').fill(email);
    await page.getByRole('button', {name: /^(Search User|Rechercher)/}).last().click();
    await page.getByRole('button', {name: /Save And Continue|Enregistrer et continuer/}).waitFor({timeout: T});
    await idle(page);
}

/** On "Enter details": the new role row's role, today, and the masthead choice. */
async function fillNewRole(page, {role, masthead}) {
    const sel = page.locator('select[name="userGroupId"]').last();
    await sel.selectOption({label: role});
    const newRow = page.getByRole('row').filter({has: sel});
    await newRow.getByRole('textbox').fill(today());
    await newRow.locator('select[name="masthead"]').selectOption({label: masthead});
}

/** "Save And Continue" to step 3; its heading and description. */
async function toCompose(page) {
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    await page.locator('input[name="subject"]').waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    return stepIntro(page);
}

/** "Cancel" in the wizard: the dialog's text (null when none opens). Leaves the dialog open. */
async function pressCancel(page) {
    await page.locator('main').getByRole('button', {name: /^(Cancel|Annuler)$/}).last().click();
    const dialog = page.getByRole('dialog');
    await dialog.first().waitFor({timeout: 5_000}).catch(() => {});
    return (await dialog.count()) ? flat(await dialog.first().innerText()) : null;
}

/**
 * Users & Roles > "Invite to a role" for `email`, one new role (`role`, today, `masthead`),
 * "Save And Continue", "Invite user to the role", "View All Users". Returns the sent dialog's text.
 */
async function sendInvitation(page, app, {email, role, masthead}) {
    await usersAndRoles(page, app);
    await openInviteWizard(page);
    await searchUser(page, email);
    await fillNewRole(page, {role, masthead});
    await toCompose(page);
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
    await sent.waitFor({timeout: T});
    const text = flat(await sent.innerText());
    await sent.getByRole('button', {name: 'View All Users'}).click();
    await page.waitForURL(/management\/settings\/access/, {timeout: T}).catch(() => {});
    await idle(page);
    return text;
}

/**
 * The invitation email to `to` sent by this install since `since` (the machine's installs mail the
 * same dataset addresses to one mail catcher): subject, plain text, accept and decline links.
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
            return {subject: full.Subject, text: full.Text || '', accept: grab('accept'), decline: grab('decline')};
        }
        if (Date.now() > deadline) throw new Error(`no invitation email to ${to} from ${host}`);
        await new Promise((r) => setTimeout(r, 1000));
    }
}

/** The email's lines that state a masthead choice ("Your name will …"). */
function mastheadLines(text) {
    return text.split('\n').map((l) => l.trim()).filter((l) => /^Your name will/.test(l));
}

/** Open the emailed accept link (signed out) and wait for its first step. */
async function openAccept(page, link) {
    await page.goto(link);
    await page.locator('.pkpSteps').first().waitFor({timeout: T});
    await idle(page);
    // the list's size sensor may collapse it a moment after the page lands
    await page.waitForTimeout(1500);
}

/**
 * The list of steps as a screen reader and the page's code hold it: the list's accessible name,
 * whether the row is screen-reader-only or collapsed, and the collapsed controls' text and button.
 */
async function stepsFacts(page) {
    const steps = page.locator('.pkpSteps').first();
    if (!(await steps.count())) return null;
    return steps.evaluate((el) => {
        const ol = el.querySelector('ol');
        const wrapper = el.querySelector('.pkpSteps__buttonWrapper');
        const controls = el.querySelector('.pkpSteps__controls');
        const btn = controls && controls.querySelector('button');
        const r = btn && btn.getBoundingClientRect();
        return {
            listName: ol ? ol.getAttribute('aria-label') : null,
            stepButtons: [...el.querySelectorAll('ol button')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()),
            stepItems: [...el.querySelectorAll('ol li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()),
            rowScreenReaderOnly: !!(wrapper && wrapper.classList.contains('-screenReader')),
            collapsed: el.classList.contains('pkpSteps--collapsed'),
            controls: controls
                ? {
                      ariaHidden: controls.getAttribute('aria-hidden'),
                      progress: (controls.querySelector('span') || {}).textContent || null,
                      buttonText: btn ? btn.textContent.replace(/\s+/g, ' ').trim() : null,
                      buttonRect: r ? {w: Math.round(r.width), h: Math.round(r.height)} : null,
                  }
                : null,
        };
    });
}

/** The accessible name of the list of steps in the accessibility tree (null when it has none). */
async function listAccessibleName(page) {
    const snap = await page.locator('.pkpSteps ol').first().ariaSnapshot().catch(() => null);
    return snap ? snap.split('\n')[0] : null;
}

/** Press Tab `n` times from the top of the page: each stop's tag, text, name and size. */
async function tabStops(page, n = 8) {
    await page.evaluate(() => {
        if (document.activeElement) document.activeElement.blur();
        window.scrollTo(0, 0);
    });
    await page.mouse.click(1, 1);
    const out = [];
    for (let i = 0; i < n; i++) {
        await page.keyboard.press('Tab');
        out.push(
            await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) return {tag: 'BODY'};
                const r = el.getBoundingClientRect();
                const cs = getComputedStyle(el.closest('.-screenReader') || el);
                return {
                    tag: el.tagName,
                    text: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
                    ariaLabel: el.getAttribute('aria-label'),
                    insideAriaHidden: !!el.closest('[aria-hidden="true"]'),
                    insideScreenReaderOnly: !!el.closest('.-screenReader'),
                    clip: cs.clip,
                    rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)},
                };
            })
        );
    }
    return out;
}

/** Users & Roles, "Current Users": `email`'s row menu > "Edit"; waits for the details step. */
async function editUser(page, app, {name, email}) {
    await usersAndRoles(page, app);
    await page.getByRole('searchbox').first().fill(name);
    await page.keyboard.press('Enter');
    await idle(page);
    const row = page.getByRole('row').filter({hasText: email}).first();
    await row.waitFor({timeout: T});
    await row.getByRole('button').last().click();
    await page.getByRole('menuitem', {name: 'Edit'}).click();
    await page.getByRole('button', {name: 'Save And Continue'}).waitFor({timeout: T});
    await idle(page);
}

/**
 * On "Enter details" for an existing user: the first current role's masthead select, set to the
 * other value; returns the column heading, the select's values and the dialog's text, then presses
 * the dialog's "Cancel" and reads the select again. Records every PUT the page sends meanwhile.
 */
async function mastheadChange(page) {
    const puts = [];
    const onReq = (r) => {
        if (/\/masthead\//.test(r.url())) puts.push(`${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`);
    };
    page.on('request', onReq);
    const select = page.locator('select[name="masthead"]').first();
    const column = flat(await page.locator('thead th').nth(3).innerText().catch(() => null), 100);
    const before = await select.evaluate((s) => s.options[s.selectedIndex] && s.options[s.selectedIndex].text);
    const other = (await select.evaluate((s) => [...s.options].map((o) => o.text))).find((t) => t !== before);
    await select.selectOption({label: other});
    const dialog = page.getByRole('dialog');
    await dialog.first().waitFor({timeout: T});
    const shown = await screen(page);
    const text = flat(await dialog.first().innerText());
    await dialog.first().getByRole('button', {name: /^(Cancel|Annuler)$/}).click();
    await dialog.first().waitFor({state: 'detached', timeout: T}).catch(() => {});
    await page.waitForTimeout(500);
    const after = await select.evaluate((s) => s.options[s.selectedIndex] && s.options[s.selectedIndex].text);
    page.off('request', onReq);
    return {column, before, chose: other, dialog: text, after, masthead: puts, screen: shown};
}

/** Signed out: the emailed decline link, then "Confirm Decline Invitation"; where it lands. */
async function decline(page, link) {
    await page.goto(link);
    await idle(page);
    const before = flat((await screen(page)).text.main, 600);
    await page.getByRole('button', {name: 'Confirm Decline Invitation'}).click();
    await page.waitForURL(/\/login/, {timeout: T}).catch(() => {});
    await idle(page);
    return {before, landed: page.url().replace(/^https?:\/\/[^/]+/, '')};
}

/** The workflow of `submissionId` as an editor (the dashboard with the workflow window). */
async function openWorkflow(page, app, submissionId) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${submissionId}`));
    await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: /Activity Log/}).first().waitFor({timeout: 60_000});
    await idle(page);
}

/** In the open workflow, press the decision button `name`; wait for the decision page's steps. */
async function openDecision(page, name) {
    await page.locator('[role="dialog"]:visible').first().getByRole('button', {name, exact: true}).click();
    await page.waitForURL(/\/decision\/record\//, {timeout: T});
    await page.locator('.pkpSteps').first().waitFor({timeout: T});
    await idle(page);
    await page.waitForTimeout(1500);
}

module.exports = {
    T, PERSON, DECISION, flat, today, usersAndRoles, openInviteWizard, stepIntro, searchUser, fillNewRole, toCompose,
    pressCancel, sendInvitation, invitationMail, mastheadLines, openAccept, stepsFacts, listAccessibleName, tabStops,
    editUser, mastheadChange, decline, openWorkflow, openDecision,
};
