// Helpers of walk.js (issue report docs/issues/U08-A2-section-editor-dashboard-opens-profile.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const {idle} = require('../../../probe');
// The invitation wizard and the accept wizard: ../newcomer-not-signed-in-after-accepting/lib.js.
const N = require('../newcomer-not-signed-in-after-accepting/lib.js');

/** The Guest editor the steps invite on OJS (names tagged u08h20d; the password is the username twice). */
const GUEST = {email: 'u08h20d@example.com', givenName: 'Gwen', familyName: 'Guest-u08h20d', username: 'u08h20d',
    password: 'u08h20du08h20d', country: 'Canada', role: 'Guest editor'};

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** The editorial header's bell as it reads after signing in ("Tasks 2"), and the page it is on. */
async function readBell(page) {
    await idle(page);
    const bell = page.getByRole('button', {name: /^Tasks/}).first();
    await bell.waitFor({timeout: T}).catch(() => {});
    return {address: rel(page.url()), bell: (await bell.count()) ? flat(await bell.innerText()) : null};
}

/** Open a public page by its address (the journal's home page, or a site page) and wait for the header. */
async function openPublic(page, app, path) {
    const r = await page.goto(app.url(path));
    const header = await page.locator('header.pkp_structure_head').waitFor({timeout: T}).then(() => true, () => false);
    await idle(page);
    return {asked: path, status: r ? r.status() : null, address: rel(page.url()), header,
        title: await page.title()};
}

/**
 * The header's user menu: the name as shown (with its count, when it has one), then pressed open,
 * the entries under it with their addresses.
 */
async function readUserMenu(page) {
    const wrapper = page.locator('#navigationUserWrapper');
    const toggle = wrapper.locator('#navigationUser > li > a').first();
    await toggle.waitFor({timeout: T});
    const name = flat(await toggle.innerText());
    const nameCount = (await toggle.locator('span.task_count').count())
        ? flat(await toggle.locator('span.task_count').innerText()) : null;
    await toggle.click();
    const list = wrapper.locator('#navigationUser > li > ul').first();
    const opened = await list.waitFor({state: 'visible', timeout: 8000}).then(() => true, () => false);
    const links = list.getByRole('link');
    const entries = [];
    for (let i = 0; i < (await links.count()); i++) {
        const a = links.nth(i);
        entries.push({text: flat(await a.innerText()), href: rel(await a.getAttribute('href'))});
    }
    return {name, nameCount, opened, entries};
}

/**
 * The same page in a window narrower than 992 px (a phone or a narrow browser): reload, press "Open Menu",
 * read the user menu as displayed (innerText skips what the theme hides), then the window back to its width.
 */
async function readUserMenuNarrow(page, width = 800) {
    const size = page.viewportSize();
    await page.setViewportSize({width, height: size.height});
    try {
        await page.reload();
        await page.locator('header.pkp_structure_head').waitFor({timeout: T});
        await idle(page);
        const toggle = page.locator('button.pkp_site_nav_toggle');
        const toggled = await toggle.isVisible().catch(() => false);
        if (toggled) await toggle.click();
        await pause(400);
        const top = page.locator('#navigationUser > li > a').first();
        const entries = (await page.locator('#navigationUser > li > ul a').allInnerTexts()).map(flat);
        return {width, openMenuButton: toggled, name: flat(await top.innerText()), entries};
    } finally {
        await page.setViewportSize(size);
        await page.reload();
        await page.locator('header.pkp_structure_head').waitFor({timeout: T});
        await idle(page);
    }
}

/** Press "Dashboard" in the open user menu; where it lands. */
async function pressDashboard(page) {
    const entry = page.locator('#navigationUser > li > ul').getByRole('link', {name: /^Dashboard(\s+\d+)?$/}).first();
    const before = page.url();
    await entry.click();
    await page.waitForURL((u) => String(u) !== before, {timeout: T}).catch(() => {});
    await idle(page);
    await pause(300);
    return {
        address: rel(page.url()),
        title: await page.title(),
        heading: await page.locator('h1').first().innerText().then(flat, () => null),
    };
}

/**
 * Settings › Website › "Setup" › "Languages" (U57's page object): press French's box in the "Forms"
 * column once, as the journal's manager; the box before, the list's answer, the box after a fresh load.
 * The page object is required here, inside the walk, because it reads the app's environment.
 */
async function untickFrenchForms(page, ctx) {
    const {JournalLanguagesTab} = require('../../../pages/LanguagesPages.js');
    const tab = new JournalLanguagesTab(page, ctx, {locale: 'en'});
    await tab.goto();
    const box = () => tab.website.cell('fr_CA', 'formLocale');
    const before = await box().isChecked();
    const {response, alerts} = await tab.pressWebsite('fr_CA', 'formLocale');
    await tab.goto();
    const after = await box().isChecked();
    return {before, status: response ? response.status() : null, url: rel(response && response.url()), alerts, after};
}

/**
 * As the signed-in manager: Settings › Users & Roles › "Invite to a role", the newcomer as Guest editor; then,
 * in a browser of their own, the email's accept link: username and password, the privacy box, the country,
 * "Accept And Continue to …". Returns what each step showed.
 */
async function guestEditorJoins(page, app, launch) {
    const since = new Date();
    const invited = await N.invite(page, app, {email: GUEST.email, givenName: GUEST.givenName, familyName: GUEST.familyName, role: GUEST.role});
    const link = await N.acceptLink(app, GUEST.email, since);
    if (!link.accept) throw new Error('no invitation email with an accept link');
    const other = await launch(app);
    try {
        const p = other.page;
        const met = await N.openAccept(p, link.accept);
        await p.getByLabel(/^Username/).fill(GUEST.username);
        await p.getByLabel(/^Password/).fill(GUEST.password);
        await p.getByRole('checkbox').first().check();
        await p.getByRole('button', {name: 'Save and continue'}).click();
        await p.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
        await idle(p);
        await p.getByLabel(/^Country/).first().selectOption({label: GUEST.country});
        await p.getByRole('button', {name: 'Save and continue'}).click();
        await p.getByRole('heading', {name: /Review & create account/}).waitFor({timeout: T});
        await idle(p);
        const accepted = await N.acceptAndLeave(p);
        return {invited: invited.sentText, subject: link.subject, met, accepted: {dialog: accepted.dialog, finalize: accepted.finalize}};
    } finally {
        await other.close();
    }
}

/** Where the Guest editor gets a task on OJS: submission 2, its review round, and the discussion they are added to. */
const GUEST_TASK = {where: {id: 2, menuKey: 'workflow_3_2', panelTitle: 'Review Tasks & Discussions'},
    name: 'u08h20d question', message: 'u08h20d: a question for the Guest editor.'};

/**
 * As the signed-in manager, on submission 2's review round: Participants › "Assign", role "Guest editor",
 * the Guest editor, "OK"; then "Review Tasks & Discussions" › "Add": a name, the Guest editor ticked, a
 * message, "Save". Returns the Participants rows after the assignment and the save's status.
 */
async function guestEditorGetsTask(page, app) {
    const S = require('../../../pages/StageParticipantsPages.js');
    const D = require('../merge-fails-for-discussion-opener/lib.js');
    const panel = new S.ParticipantsPanel(page, app.contextPath);
    await panel.goto(GUEST_TASK.where.id, {menuKey: GUEST_TASK.where.menuKey});
    const win = await panel.openAssign();
    await win.chooseRole(GUEST.role);
    await win.search(GUEST.familyName);
    await win.choosePerson(`${GUEST.givenName} ${GUEST.familyName}`);
    await win.ok();
    await idle(page);
    const rows = await panel.rowLines().catch((e) => String(e).slice(0, 200));
    const discussion = await D.addDiscussion(page, app, GUEST_TASK.where, {name: GUEST_TASK.name, participant: GUEST.username,
        participantName: `${GUEST.givenName} ${GUEST.familyName}`, message: GUEST_TASK.message, label: '7b-guest-task'});
    return {rows, discussion};
}

module.exports = {GUEST, GUEST_TASK, guestEditorJoins, guestEditorGetsTask, readBell, openPublic, readUserMenu, readUserMenuNarrow, pressDashboard, untickFrenchForms};
