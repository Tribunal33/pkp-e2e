// Helpers for walk.js (U69 A10). Requiring this file runs nothing.
const {screen, record, idle} = require('../../../probe');
const {flat} = require('../pdf-reader-return-arrow-names-issue/lib');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VISIBLE_DIALOG = '[role="dialog"]:visible';

/**
 * A press editor adds a free, approved, available publication format holding one file to a
 * book, on the workflow's "Publication Formats" page, as a person does: "Add publication
 * format" (the name, "OK"), the format row's "Change File" (first component, the file,
 * "Continue" twice, "Complete"), the file row's "Set Terms" ("Open Access", "Save"), the
 * format row's "Awaiting Approval" and "Not Available", each confirmed with "OK". Returns the words of each row and window met.
 */
async function addFreeFormatFile(page, app, {submissionId, formatName, file, fileName}) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    const out = {};
    const wf = () => page.locator(VISIBLE_DIALOG).first();
    const top = () => page.locator(VISIBLE_DIALOG).last();
    const snap = async (name) => record(name, await screen(page));
    /** Press a row's link, record the window it opens, press the window's confirming button. */
    const pressAndConfirm = async (key, link, {before = null, confirm = /^(OK|Yes|Approve|Save)$/} = {}) => {
        if (!(await link.count())) {
            out[key] = 'no such link';
            return;
        }
        const name = flat(await link.innerText().catch(() => null), 80);
        await link.click();
        await idle(page);
        await sleep(900);
        if (before) await before();
        const question = flat(await top().innerText().catch(() => null), 300);
        const button = top().getByRole('button', {name: confirm}).first();
        const buttonName = flat(await button.innerText().catch(() => null), 40);
        await snap(`add-${key}`);
        await button.click().catch(() => {});
        await idle(page);
        await sleep(1200);
        out[key] = {link: name, window: question, pressed: buttonName};
    };

    // the book's workflow, then "Publication Formats" in the side menu
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const menu = frame.menuLink('Publication Formats');
    if (!(await menu.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    await menu.last().click();
    await idle(page);
    await sleep(800);
    await snap('add-1-formats');

    // "Add publication format": the name, "OK"
    const add = wf().getByRole('link', {name: 'Add publication format'}).first();
    out.addLink = flat(await add.innerText(), 60);
    await add.click();
    await top().locator('input[name^="name"]').first().waitFor({timeout: T});
    await idle(page);
    await top().locator('input[name^="name"]').first().fill(formatName);
    out.formatWindow = flat(await top().innerText().catch(() => null), 400);
    await snap('add-2-format-window');
    await top().getByRole('button', {name: 'OK', exact: true}).click();
    await idle(page);
    await sleep(1500);
    await idle(page);

    // the format's row: its file
    const formatRow = () => wf().locator('tr').filter({hasText: formatName}).filter({has: page.locator('.onix_code')}).first();
    out.formatRowNew = flat(await formatRow().innerText().catch(() => null), 300);
    const change = formatRow().getByRole('link', {name: 'Change File', exact: true}).first();
    out.fileLink = flat(await change.innerText().catch(() => null), 60);
    await change.click();
    const wizard = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
    await wizard.locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
    await idle(page);
    const genre = wizard.locator('select[id^="genreId"]');
    if (await genre.count()) {
        const options = await genre.locator('option').evaluateAll((els) => els.map((x) => ({v: x.value, t: x.text.trim()})).filter((x) => x.v));
        await genre.selectOption(options[0].v);
        out.component = options[0].t;
    }
    await wizard.locator('input[type="file"]').setInputFiles(file);
    await page.waitForFunction(
        () => {
            const b = [...document.querySelectorAll('[role=dialog] button')].find((x) => x.innerText.trim() === 'Continue' && x.getClientRects().length);
            return b && !b.disabled;
        },
        null,
        {timeout: T},
    );
    out.uploadWindow = flat(await wizard.innerText().catch(() => null), 300);
    await snap('add-3-upload-window');
    await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
    await idle(page);
    await sleep(800);
    await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
    await idle(page);
    await sleep(800);
    await wizard.getByRole('button', {name: 'Complete', exact: true}).click();
    await idle(page);
    await sleep(1500);
    await idle(page);

    // the file's row: its terms (the file's own approval is not needed for readers to get it)
    const fileRow = () => wf().locator('tr.gridRow').filter({hasText: fileName}).first();
    out.fileRowNew = flat(await fileRow().innerText().catch(() => null), 200);
    await pressAndConfirm('4-file-terms', fileRow().getByRole('link', {name: 'Set Terms', exact: true}).first(), {
        before: async () => {
            const open = top().locator('input[type="radio"][value="openAccess"]').first();
            if (await open.count()) await open.check();
            out.termsChoices = await top().locator('label:has(input[type="radio"])').evaluateAll((ls) => ls.map((l) => l.textContent.replace(/\s+/g, ' ').trim()));
        },
    });
    out.fileRowReady = flat(await fileRow().innerText().catch(() => null), 200);

    // the format's row: its approval, then its availability
    await pressAndConfirm('5-format-approval', formatRow().getByRole('link', {name: 'Awaiting Approval', exact: true}).first());
    await pressAndConfirm('6-format-availability', formatRow().getByRole('link', {name: 'Not Available', exact: true}).first());
    out.formatRowReady = flat(await formatRow().innerText().catch(() => null), 300);
    await snap('add-6-ready');
    return out;
}

module.exports = {addFreeFormatFile};
