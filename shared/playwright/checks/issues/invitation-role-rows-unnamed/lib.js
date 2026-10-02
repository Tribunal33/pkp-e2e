// Helpers of walk.js here (issue report docs/issues/U06-A8-invitation-role-rows-unnamed.md).
// Requiring this file runs nothing. Settings > Users & Roles through the U53 page object
// (shared/playwright/pages/UsersManagementPages.js); the invitation's details step read as the
// browser builds it (ids, label associations) and as a screen reader is given it (aria snapshots).
const {idle} = require('../../../probe');

const T = 30_000;

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const CASES = {
    ojs: {member: {name: 'Carlo Corino', email: 'ccorino@mailinator.com'}, masthead: 'Journal Masthead'},
    omp: {member: {name: 'Arthur Clark', email: 'aclark@mailinator.com'}, masthead: 'Press Masthead'},
    ops: {member: {name: 'Carlo Corino', email: 'ccorino@mailinator.com'}, masthead: 'Server Masthead'},
};
const INVITER = 'rvaca';
const NEWCOMER = 'u06e.newcomer@mailinator.com';
const NB_NEWCOMER = 'u06e.nb@mailinator.com';

const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** The users list (required inside forEachApp's fn). */
function usersList(page, app) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    return new UsersListPage(page, app.contextPath);
}

/** The details step's roles table (the one holding a masthead or role select). */
function rolesTable(page) {
    return page.locator('table:has(select[name="masthead"]), table:has(select[name="userGroupId"])').first();
}

/** Step 1 of the send wizard: the search box's id and name, then the search for `email`. */
async function searchInWizard(page, email) {
    await page.getByRole('button', {name: 'Invite to a role'}).click();
    const box = page.getByLabel(/Search for a user by email address/);
    await box.waitFor({timeout: T});
    const searchBox = {id: await box.getAttribute('id'), name: flat(await box.ariaSnapshot(), 200)};
    await box.fill(email);
    await page.getByRole('button', {name: 'Search User', exact: true}).click();
    await page.locator('select[name="userGroupId"]').first().waitFor({timeout: T});
    await idle(page);
    return searchBox;
}

/** "Add Another Role"; waits until the table holds `rows` role selects. */
async function addAnotherRole(page, rows) {
    await page.getByRole('button', {name: 'Add Another Role'}).click();
    await page.locator('select[name="userGroupId"]').nth(rows - 1).waitFor({timeout: T});
    await idle(page);
}

/**
 * The roles table, row by row: each select and input with its id, whether that id resolves to it,
 * how many elements in the page carry the id, the labels the browser ties to it (their text), the
 * label shown in its own cell and the row its label points at; then each row's aria snapshot, as a
 * screen reader is given it.
 */
async function readTable(page) {
    const table = rolesTable(page);
    const dom = await table.evaluate((t) => {
        const rows = [...t.querySelectorAll('tbody tr')];
        const rowOf = (el) => rows.findIndex((r) => r.contains(el));
        return rows.map((r, i) => ({
            row: i + 1,
            cells: flat0([...r.querySelectorAll('td')].map((c) => c.innerText).join(' | ')),
            controls: [...r.querySelectorAll('select, input')].map((el) => {
                const own = el.closest('.pkpFormField')?.querySelector('label');
                const target = own ? document.getElementById(own.htmlFor) : null;
                return {
                    tag: el.tagName.toLowerCase(),
                    name: el.getAttribute('name'),
                    id: el.id,
                    idResolvesHere: document.getElementById(el.id) === el,
                    elementsWithId: document.querySelectorAll(`[id="${el.id}"]`).length,
                    labelsTied: [...(el.labels || [])].map((l) => flat0(l.innerText)),
                    ownLabel: own ? {text: flat0(own.innerText), for: own.htmlFor, pointsAtRow: target ? rowOf(target) + 1 : null, pointsAtSelf: target === el} : null,
                    describedBy: el.getAttribute('aria-describedby'),
                };
            }),
        }));
        function flat0(s) {
            return (s || '').replace(/\s+/g, ' ').trim().slice(0, 200);
        }
    });
    const rows = table.locator('tbody tr');
    const aria = [];
    for (let i = 0; i < (await rows.count()); i++) aria.push(await rows.nth(i).ariaSnapshot());
    const dupIds = await page.evaluate(() => {
        const seen = {};
        for (const el of document.querySelectorAll('[id]')) seen[el.id] = (seen[el.id] || 0) + 1;
        return Object.fromEntries(Object.entries(seen).filter(([, n]) => n > 1));
    });
    return {rows: dom, aria, duplicateIdsInPage: dupIds};
}

/** The accessible name a control has, read as its aria snapshot's first line once focused. */
async function focusAndName(page, locator) {
    await locator.focus();
    const focused = page.locator(':focus');
    const snap = await focused.ariaSnapshot().catch((e) => `ERR ${e.message}`);
    return flat(snap.split('\n')[0], 200);
}

/** Every role select, date box and masthead select of the table, focused in turn: row, field, name. */
async function namesByFocus(page) {
    const table = rolesTable(page);
    const out = [];
    const rows = table.locator('tbody tr');
    for (let i = 0; i < (await rows.count()); i++) {
        const controls = rows.nth(i).locator('select, input');
        for (let j = 0; j < (await controls.count()); j++) {
            const c = controls.nth(j);
            out.push({row: i + 1, field: await c.getAttribute('name'), announced: await focusAndName(page, c)});
        }
    }
    return out;
}

/** Click row `n`'s (1-based) visible label `text`; returns the row the focused field sits in. */
async function clickLabel(page, n, text) {
    const table = rolesTable(page);
    const label = table.locator('tbody tr').nth(n - 1).locator('label').filter({hasText: text}).first();
    if (!(await label.count())) return {clicked: false};
    await label.click();
    const where = await table.evaluate((t) => {
        const rows = [...t.querySelectorAll('tbody tr')];
        const el = document.activeElement;
        return {focusedRow: rows.findIndex((r) => r.contains(el)) + 1, focusedName: el?.getAttribute('name'), focusedId: el?.id};
    });
    return {clicked: true, labelRow: n, ...where};
}

/** Users & Roles: search `name`, open the row's menu, "Edit"; waits for the details step's table. */
async function openEdit(page, app, person) {
    const list = usersList(page, app);
    await list.goto();
    await idle(page);
    await list.search(person.name);
    await idle(page);
    const row = list.row(person.email).first();
    await row.waitFor({timeout: T});
    const offered = await list.menuLabels(row);
    await list.chooseAction(row, 'Edit');
    await page.locator('select[name="masthead"]').first().waitFor({timeout: T});
    await idle(page);
    return {offered};
}

/** The first role option that is enabled, has a value, is not a reviewer role and is not `skip`. */
async function pickRole(page, n, skip) {
    const select = page.locator('select[name="userGroupId"]').nth(n);
    const opts = await select.evaluate((s) => [...s.options].map((o) => ({value: o.value, label: o.label, disabled: o.disabled})));
    const pick = opts.find((o) => o.value && !o.disabled && !/Reviewer/.test(o.label) && o.label !== skip);
    await select.selectOption({value: pick.value});
    return pick.label;
}

/** Fill row `n` (0-based) by position: a role, today's date, "Appear on the masthead". */
async function fillRow(page, n, skip) {
    const today = new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
    const role = await pickRole(page, n, skip);
    await page.locator('input[name="dateStart"]').nth(n).fill(today);
    await page.locator('select[name="masthead"]').nth(n).selectOption({index: 1});
    return role;
}

/** "Save And Continue", then "Invite user to the role"; returns the "Invitation Sent" text. */
async function send(page) {
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    await page.locator('input[name="subject"]').waitFor({timeout: T});
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    const dialog = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
    await dialog.waitFor({timeout: T});
    return flat(await dialog.innerText(), 600);
}

module.exports = {CASES, INVITER, NEWCOMER, NB_NEWCOMER, flat, usersList, rolesTable, searchInWizard, addAnotherRole,
    readTable, namesByFocus, clickLabel, openEdit, fillRow, send};
