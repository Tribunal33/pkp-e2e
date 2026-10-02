// Helpers of walk.js (U48 OMP1: a press's file lists offer "Send to Text Editor", which leads nowhere;
// docs/issues/U48-OMP1-press-send-to-text-editor-leads-nowhere.md). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const VIS = '[role="dialog"]:visible';

/** Open a submission's workflow by the editorial dashboard's address, on a side-menu page when given. */
async function openWorkflow(page, app, id, menuKey = null) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
    await idle(page);
    await page.locator(VIS).first().waitFor({timeout: T}).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15_000}).catch(() => {});
    await idle(page);
    await page.waitForTimeout(500);
}

/** The workflow table named `name` (a file list's title). */
const table = (page, name) => page.locator(VIS).first().getByRole('table', {name, exact: true}).first();

/** The row of `table` whose name cell is `fileName`. */
const fileRow = (page, name, fileName) => table(page, name).getByRole('row').filter({has: page.getByRole('rowheader', {name: fileName, exact: true})}).first();

/**
 * "Upload" above the file list `name`: the component (the first offered when `component` is not
 * among them), the file, "Continue", "Continue", "Complete". Returns what the wizard offered.
 */
async function uploadToList(page, name, file, component) {
    const wrap = page.locator(VIS).first().locator('div').filter({has: page.getByRole('table', {name, exact: true})}).last();
    const btn = wrap.getByRole('button', {name: 'Upload', exact: true}).first();
    await btn.waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    if (!(await btn.count())) return {offered: false};
    await btn.click();
    const w = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
    await w.locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
    await idle(page);
    const out = {offered: true, title: flat(await w.locator('h1').first().innerText().catch(() => null))};
    const g = w.locator('select[id^="genreId"]');
    if (await g.count()) {
        out.components = (await g.locator('option').allInnerTexts()).map((x) => flat(x)).filter(Boolean);
        const pick = out.components.includes(component) ? component : out.components[0];
        await g.selectOption({label: pick}).catch(() => {});
        out.component = pick;
    }
    await w.locator('input[type="file"]').setInputFiles(file);
    const cont = w.getByRole('button', {name: 'Continue', exact: true});
    for (let i = 0; i < 100 && !(await cont.isEnabled().catch(() => false)); i++) await page.waitForTimeout(200);
    await cont.click();
    await idle(page);
    await w.getByRole('tab', {name: /^2\./}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T}).catch(() => {});
    await page.waitForTimeout(500);
    await cont.click();
    await idle(page);
    const complete = w.getByRole('button', {name: 'Complete', exact: true});
    await complete.waitFor({timeout: T}).catch(() => {});
    await complete.click();
    await w.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await page.waitForTimeout(800);
    await idle(page);
    return out;
}

/** Open the row's "More Actions" menu and read its entries; the menu stays open. */
async function openRowMenu(page, row) {
    await row.getByRole('button').last().click();
    await page.getByRole('menuitem').first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    return (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => flat(x));
}

/** Close the open row menu by pressing its button again (an Escape would close the workflow too). */
async function closeRowMenu(page, row) {
    await row.getByRole('button').last().click().catch(() => {});
    await page.getByRole('menu').waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
}

/** The workflow side menu's entries, as shown (label text, top to bottom). */
async function sideMenu(page) {
    return page.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0;
        const root = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
        const nav = root.querySelector('nav') || root;
        return [...nav.querySelectorAll('a, button')].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
    }).catch(() => []);
}

/** The workflow panel's own heading line (the page it shows), read by CSS. */
async function pageHeading(page) {
    return page.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0;
        const root = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
        return [...root.querySelectorAll('h1, h2')].filter(vis).map((h) => h.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 4);
    }).catch(() => []);
}

module.exports = {T, VIS, flat, openWorkflow, table, fileRow, uploadToList, openRowMenu, closeRowMenu, sideMenu, pageHeading};
