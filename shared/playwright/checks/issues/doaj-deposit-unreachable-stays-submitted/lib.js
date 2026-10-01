// Helpers of walk.js (issue report docs/issues/U63-OJS9-doaj-deposit-unreachable-stays-submitted.md,
// U63 OJS9). Requiring this file runs nothing. The DOAJ tool page itself is opened and
// read with the helpers of ../doaj-deposit-takes-other-journals-articles/lib.js.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const LIST = '#submissionsListGridContainer .pkp_controllers_grid, #publicationsListGridContainer .pkp_controllers_grid';
const FORM = 'form#exportSubmissionXmlForm, form#exportPublicationXmlForm';

/** The open DOAJ list's row of a submission ID (its first column). */
const doajRow = (page, id) => page.locator(LIST).first().locator('tbody tr.gridRow')
    .filter({has: page.locator('td:nth-child(2)', {hasText: new RegExp(`^\\s*${id}\\s*$`)})}).first();

/** Tick the row of a submission ID and press a button under the list ("deposit" is "Register"); lands back on the tool. */
async function tickAndPress(page, id, button) {
    await doajRow(page, id).locator('input[type=checkbox]').first().check({timeout: T});
    const landed = page.waitForResponse((r) => r.request().isNavigationRequest() && r.request().method() === 'GET' && r.url().includes('DOAJExportPlugin'), {timeout: 90_000}).catch(() => null);
    await page.locator(FORM).first().locator(`button[name="${button}"]`).click();
    const r = await landed;
    await idle(page).catch(() => {});
    return r ? r.status() : null;
}

/** The list's filter: press "Search" above the list, choose a status by its label, press the form's "Search". Returns the visible rows' text, or the empty line. */
async function filterByStatus(page, label) {
    const grid = page.locator(LIST).first();
    await grid.locator('a.pkp_linkaction_search').first().click();
    const form = grid.locator('form.filter').first();
    const select = form.locator('select[name="statusId"]');
    await select.waitFor({state: 'visible', timeout: T});
    const options = (await select.locator('option').allInnerTexts()).map((t) => flat(t, 80));
    if (!options.includes(label)) return {options, missing: label};
    await select.selectOption({label});
    const w = page.waitForResponse((r) => /fetchGrid/.test(r.url()), {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Search', exact: true}).click();
    await w;
    await idle(page).catch(() => {});
    await sleep(500);
    const rows = await grid.locator('tbody tr.gridRow').evaluateAll((trs) => trs.filter((tr) => tr.offsetParent !== null).map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()));
    const empty = await grid.locator('tbody.empty:visible, tr.empty:visible').first().innerText().catch(() => null);
    return {options, rows, empty: flat(empty, 200)};
}

/** A row's status cell: its text and, when it is a link ("Failed"), the window it opens (heading and text). */
async function readStatus(page, id) {
    const cell = doajRow(page, id).locator('td').last();
    const out = {text: flat(await cell.innerText(), 200)};
    const link = cell.locator('a').first();
    if (await link.count()) {
        await link.click();
        const win = page.locator('[data-cy="active-modal"], .pkp_modal_panel').filter({has: page.locator('pre')}).last();
        await win.locator('pre').first().waitFor({timeout: T}).catch(() => {});
        out.window = flat(await win.innerText().catch(() => null), 900);
        const close = win.getByRole('button', {name: /Close/}).first();
        if (await close.count()) await close.click().catch(() => {});
        await sleep(800);
    }
    return out;
}

module.exports = {T, sleep, flat, doajRow, tickAndPress, filterByStatus, readStatus};
