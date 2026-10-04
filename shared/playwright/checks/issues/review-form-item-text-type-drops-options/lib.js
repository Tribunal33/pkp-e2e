// Helpers of walk.js here (spec U29, register A5). Requiring this file runs nothing. Every helper
// drives the screens a person uses: Settings › Workflow › "Review" › "Review Forms", a form's
// "Edit" window, its "Form Items" tab and an item's window ("Item type", "Response Options").
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const RADIO = 'Radio buttons (you can only choose one)';
const CHECKBOXES = 'Checkboxes (you can choose one or more)';
const DROPDOWN = 'Drop-down box';
const TEXTAREA = 'Extended text box';
const TEXTLINE = 'Single line text box';

function settingsPage(page, app) {
    const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
    return new ReviewSettingsPage(page, app.contextPath);
}

/** Settings › Workflow › "Review" › "Review Forms", "Create Review Form" with the title, then the
 * row's "Edit" › "Form Items". Returns the page object's forms list, the window open. */
async function createFormAndOpenItems(page, app, title) {
    const settings = settingsPage(page, app);
    const forms = settings.forms;
    await settings.goto('Review Forms');
    await idle(page);
    await forms.createForm(title);
    const controls = await forms.rowControls(forms.row(title).first());
    await forms.control(controls, 'Edit').click();
    await forms.windowHeading().waitFor({timeout: T});
    await forms.openWindowTab('Form Items');
    return forms;
}

/** "Add Item" under "Response Options", the text typed into the row's English box, Enter. The
 * dataset's context has two languages, so a new row carries a box per language (the page object's
 * addResponseOption expects one). */
async function addOption(page, forms, text) {
    const {expect} = require('@playwright/test');
    const inputs = forms.itemForm.locator('input[name^="newRowId[possibleResponse]"]');
    const before = await inputs.count();
    await forms.itemAddOptionLink.dispatchEvent('mousedown');
    await expect.poll(() => inputs.count(), {timeout: T}).toBeGreaterThan(before);
    const box = forms.itemForm.locator('input[name^="newRowId[possibleResponse]"][name$="[en]"]').last();
    await box.fill(text);
    await box.press('Enter');
    await idle(page);
    await forms.responseOptionRow(text).first().waitFor({timeout: T});
}

/** "Create New Item": the question, the type and the options typed through "Add Item", "Save". */
async function createItem(page, forms, {question, type, options = []}) {
    await forms.openCreateItem();
    await forms.fillItem({question, type});
    for (const option of options) await addOption(page, forms, option);
    const saved = await saveOpenItem(page, forms);
    return {...saved, items: (await forms.itemRows().allInnerTexts()).map((t) => flat(t, 120))};
}

/** The open item window as a person reads it: the chosen type, whether "Response Options" and its
 * "Add Item" are shown, and the rows listed under it. */
async function itemState(forms) {
    const form = forms.itemForm;
    const select = forms.itemTypeSelect;
    const section = form.locator('#elementOptions');
    const rows = form.locator('#elementOptionsListbuilderContainer tbody tr.gridRow');
    const texts = [];
    for (const r of await rows.all()) texts.push(flat(await r.innerText().catch(() => ''), 80));
    return {
        type: flat(await select.locator('option:checked').innerText().catch(() => null), 80),
        optionsShown: await section.isVisible().catch(() => null),
        addItemShown: await forms.itemAddOptionLink.isVisible().catch(() => null),
        rows: texts,
        rowsVisible: await rows.first().isVisible().catch(() => false),
    };
}

/** An item row's "Edit": the item window open, its editor ready and its options list loaded. */
async function openItemEdit(page, forms, question) {
    const row = forms.itemRow(question).first();
    const controls = await forms.rowControls(row);
    await forms.control(controls, 'Edit').click();
    await forms.awaitItemWindowReady();
    await forms.itemForm.locator('#elementOptionsListbuilderContainer .pkp_controllers_grid, #elementOptionsListbuilderContainer table').first().waitFor({state: 'attached', timeout: T});
    await idle(page);
    return {heading: flat(await forms.itemWindowHeading().innerText().catch(() => null), 80), ...(await itemState(forms))};
}

/** Choose a type in "Item type" as a person does (the list's change event fires). */
async function chooseType(page, forms, label) {
    await forms.itemTypeSelect.selectOption({label});
    await sleep(800);
    await idle(page);
    return itemState(forms);
}

/** The item window's "Save": the answer, the notice, whether the window closed. */
async function saveOpenItem(page, forms) {
    const saved = page.waitForResponse((r) => r.url().includes('/update-review-form-element') && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await forms.itemSaveButton.click();
    const response = await saved;
    const out = {http: response ? response.status() : null};
    if (response) {
        const body = await response.json().catch(() => null);
        out.status = body ? body.status : null;
    }
    out.notice = await forms.savedNotice().waitFor({timeout: 10_000}).then(() => 'Your changes have been saved.', () => null);
    out.closed = await forms.itemForm.waitFor({state: 'hidden', timeout: T}).then(() => true, () => false);
    await idle(page);
    return out;
}

/** The item window's bottom "Cancel" (a link on a legacy form). */
async function cancelOpenItem(page, forms) {
    await forms.itemForm.getByRole('link', {name: 'Cancel', exact: true}).click();
    await forms.itemForm.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
}

module.exports = {T, sleep, flat, RADIO, CHECKBOXES, DROPDOWN, TEXTAREA, TEXTLINE, createFormAndOpenItems, addOption, createItem, itemState, openItemEdit, chooseType, saveOpenItem, cancelOpenItem};
