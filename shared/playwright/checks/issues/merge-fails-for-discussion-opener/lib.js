// Helpers of walk.js here (issue report docs/issues/U53-A15-merge-fails-for-discussion-opener.md) and of
// ../merge-drops-section-editor-assignments/walk.js (U53-A9). Requiring this file runs nothing.
// Every helper drives the screens a person uses, on PKP's default test dataset: Settings › Users & Roles
// and its "Merge user" window (the shared U53 page objects), the sign-in page, the workflow's
// "Tasks & Discussions" panel on main (the shared page objects) and the older discussions grid on
// stable-3_5_0, and Settings › Journal › Sections (Press › Series, Server › Sections).
const {idle, screen, record, signIn, signOut, launch} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Is this process on stable-3_5_0 (the older discussions grid)? */
const is35 = (app) => app.line === 'stable-3_5_0';

/**
 * Settings › Users & Roles: search `search`, the row of `username`'s address, "…" › "Merge user";
 * in the window search `intoSearch`, the row of `into` › "Merge into this User" › "OK".
 * Returns what the screen showed: the "Confirm" sentence, the merge request's status, whether the
 * dialog and the window were still open 3 s later, the page notices, the server log's lines.
 */
async function mergeUser(page, app, {from, search, into, intoSearch, label, log}) {
    const {UsersListPage, MergeUserWindow} = require('../../../pages/UsersManagementPages.js');
    const list = new UsersListPage(page, app.contextPath);
    await list.goto();
    await list.search(search);
    await idle(page);
    const row = list.row(`${from}@mailinator.com`);
    await list.chooseAction(row, 'Merge user');
    const win = new MergeUserWindow(page);
    await win.expectOpen();
    await win.grid.search({text: intoSearch});
    await win.mergeInto(`${into}@mailinator.com`);
    const question = flat(await win.confirmDialog.innerText(), 500);
    record(`${label}-confirm`, await screen(page));
    const from0 = log ? log.mark() : 0;
    const r = await win.confirm();
    let body = null;
    try { body = flat(await r.text(), 300); } catch (e) { body = null; }
    await sleep(3000);
    await idle(page).catch(() => {});
    const s = await screen(page);
    record(`${label}-after-ok`, s);
    const confirmOpen = await win.confirmDialog.isVisible().catch(() => false);
    const windowOpen = await win.dialog.isVisible().catch(() => false);
    return {
        question,
        status: r.status(),
        body: r.status() >= 500 ? body : (body || '').slice(0, 120),
        confirmOpen,
        windowOpen,
        notices: s.notices || [],
        dialogText: flat(s.text && s.text.dialog, 300),
        log: log ? log.since(from0).map((l) => flat(l, 500)) : [],
    };
}

/** Settings › Users & Roles, search `search`: the row of `username`'s address as text, or null. */
async function listRow(page, app, search, username, label) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    const list = new UsersListPage(page, app.contextPath);
    await list.goto();
    await list.search(search);
    await idle(page);
    await sleep(800);
    record(`${label}-list`, await screen(page));
    const row = list.row(`${username}@mailinator.com`);
    return (await row.count()) ? flat(await row.first().innerText(), 300) : null;
}

/**
 * Sign in as `username` (password the username twice) in a fresh browser on the context's sign-in
 * page; returns where it landed and the page's error line, never throws on a refusal.
 */
async function trySignIn(app, username, label) {
    const {page, close} = await launch(app);
    try {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/login`));
        await page.locator('input#username').fill(username);
        await page.locator('input#password').fill(username + username);
        await page.locator('form#login button[type="submit"]').click();
        await page.waitForLoadState('load').catch(() => {});
        await sleep(1500);
        await idle(page).catch(() => {});
        const s = await screen(page);
        record(`${label}-signin`, s);
        const error = flat(await page.locator('.pkp_form_error, [role="alert"], .pkpFormError').first().innerText({timeout: 2000}).catch(() => null), 200);
        const path = new URL(page.url()).pathname;
        return {landed: path, signedIn: !/\/login/.test(path), error};
    } finally {
        await close();
    }
}

// ---------------------------------------------------------------------------------------------
// The discussion: main's "Tasks & Discussions" panel, 3.5's discussions grid.

/** Open the panel (main) or the grid (3.5) of submission `id` at `menuKey`. */
async function openDiscussions(page, app, {id, menuKey, panelTitle}) {
    if (is35(app)) {
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${id}&workflowMenuKey=${menuKey}`));
        await idle(page);
        await page.locator('[id^="component-grid-queries-queriesgrid"]').first().waitFor({timeout: T});
        await idle(page);
        return null;
    }
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: panelTitle});
    await panel.gotoEditorial(id, menuKey);
    await idle(page);
    return panel;
}

/**
 * The discussion `name`: main, its row's "Created by:" line and, through the row menu's "Edit"
 * (closed with "Cancel"), the ticked participants; 3.5, the grid row's text and, from the query
 * window, its participants line. Never throws: a read that fails returns its error.
 */
async function readDiscussion(page, app, where, name, label) {
    try {
        const panel = await openDiscussions(page, app, where);
        if (is35(app)) {
            const grid = page.locator('[id^="component-grid-queries-queriesgrid"]').first();
            const row = grid.locator('tbody tr.gridRow').filter({hasText: name}).last();
            const rowText = (await row.count()) ? flat(await row.innerText(), 300) : null;
            record(`${label}-discussions`, await screen(page));
            let participants = null;
            if (rowText) {
                await row.locator('a').filter({hasText: name}).first().click();
                const dlg = page.locator('[role="dialog"]').filter({has: page.locator('[id^="component-grid-queries-querynotesgrid"]')}).last();
                await dlg.waitFor({timeout: T});
                await idle(page);
                await sleep(800);
                const s = await screen(page);
                record(`${label}-discussion-window`, s);
                participants = flat((s.text && s.text.dialog) || '', 1200);
                await dlg.getByRole('button', {name: /Close/}).first().click().catch(() => {});
                await sleep(800);
            }
            return {row: rowText, window: participants};
        }
        const ownerLine = (await panel.row(name).count()) ? flat(await panel.ownerLine(name).innerText(), 200) : null;
        record(`${label}-discussions`, await screen(page));
        let participants = null;
        if (ownerLine !== null) {
            const win = await panel.openEdit(name, 'Edit');
            participants = (await win.participants()).filter((p) => p.checked).map((p) => flat(p.label, 120));
            record(`${label}-edit-window`, await screen(page));
            await win.cancelUntouched().catch(() => {});
        }
        return {ownerLine, participants};
    } catch (e) {
        return {error: flat(String(e && e.message), 300)};
    }
}

/**
 * "Add" on the panel (main) or "Add discussion" on the grid (3.5): `name`, `participant` ticked
 * (main: username; 3.5: full name), `message`, "Save". Returns the save's status.
 */
async function addDiscussion(page, app, where, {name, participant, participantName, message, label}) {
    const panel = await openDiscussions(page, app, where);
    if (is35(app)) {
        const grid = page.locator('[id^="component-grid-queries-queriesgrid"]').first();
        await grid.getByText(/Add discussion/i).first().click();
        const form = page.locator('form#queryForm').last();
        await form.waitFor({timeout: T});
        await idle(page);
        await form.locator('label', {hasText: participantName}).locator('input[type="checkbox"]').first().check();
        await form.locator('input[name="subject"]').fill(name);
        const id = await form.locator('textarea[name="comment"]').getAttribute('id');
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T});
        await page.frameLocator(`#${id}_ifr`).locator('body').click();
        await page.keyboard.type(message);
        record(`${label}-add-filled`, await screen(page));
        const resp = page.waitForResponse((r) => /update-?query/i.test(r.url()), {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: /^(Save|OK)$/}).last().click();
        const r = await resp;
        await sleep(1500);
        await idle(page);
        return {status: r ? r.status() : null};
    }
    const win = await panel.openAdd();
    await win.nameField().fill(name);
    await win.tick(participant);
    await win.typeMessage(message);
    record(`${label}-add-filled`, await screen(page));
    const answer = await win.saveAndAnswer();
    await win.root.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    return {status: answer.status()};
}

// ---------------------------------------------------------------------------------------------
// Settings › Journal › Sections (Press › Series, Server › Sections): the section's "Edit" window.

const SECTION_TAB = {ojs: 'Sections', omp: 'Series', ops: 'Sections'};

/**
 * The "Edit" window of section `title`: every "Assign … as …" box with its label and state.
 * With `tick`, the box whose label holds that name is ticked and the window saved; else "Cancel".
 */
async function sectionEditors(page, app, title, {label, tick = null} = {}) {
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const tab = new SectionsTab(page, app.contextPath, {tab: SECTION_TAB[app.name]});
    await tab.goto();
    const controls = await tab.rowControls(title);
    await controls.getByRole('link', {name: 'Edit', exact: true}).click();
    const form = page.locator(`form#${app.name === 'omp' ? 'seriesForm' : 'sectionForm'}`).last();
    await form.locator('input[name^="subEditors"]').first().waitFor({state: 'attached', timeout: T});
    await idle(page);
    await sleep(600);
    const boxes = await form.locator('input[name^="subEditors"]').evaluateAll((els) => els.map((e) => ({
        label: ((e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || {}).innerText || '').replace(/\s+/g, ' ').trim(),
        checked: e.checked,
    })));
    record(`${label}-section-edit`, await screen(page));
    let saved = null;
    if (tick) {
        await form.locator('label').filter({hasText: tick}).locator('input[name^="subEditors"]').first().check();
        const answer = page.waitForResponse((r) => /update-?(section|series)/i.test(r.url()), {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await answer;
        saved = r ? r.status() : null;
        await form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page);
    } else {
        await form.getByRole('link', {name: 'Cancel', exact: true}).or(form.getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
        await sleep(800);
    }
    return {assigned: boxes.filter((b) => b.checked).map((b) => b.label), offered: boxes.map((b) => b.label), saved};
}

module.exports = {T, sleep, flat, is35, mergeUser, listRow, trySignIn, openDiscussions, readDiscussion, addDiscussion, sectionEditors, signIn, signOut};
