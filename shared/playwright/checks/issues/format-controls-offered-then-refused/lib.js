// Helpers for the U73 A1/A2 walk {OMP}: the Publication Formats page's availability, terms,
// "Select Files" and "Metadata" windows as a role meets them, refused or not. Requiring this
// file runs nothing; the suite page objects are required inside the calls (they read
// PKP_APP_ROOT, which forEachApp sets).
const path = require('path');
const {idle} = require('../../../probe');

const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pages = (app) => require(path.join(app ? app.suiteDir : process.env.PKP_SUITE_DIR, 'pages', 'PublicationFormatPages.js'));

/** The sub-grid and window requests the walk reads, by the op in their address. */
const OPS = /publication-format-grid\/(set-available|edit-approved-proof|save-approved-proof|select-files|edit-format-metadata|add-format|update-format)|manage-proof-files-grid\/fetch-grid|(identification-code|sales-rights|markets|publication-date)-grid\/fetch-grid/;

/**
 * Watch the page: every browser dialog (accepted, its message kept) and every answer of the
 * requests in OPS with its `status` and `content` head, under the step `mark` names.
 */
function watch(page) {
    const log = {step: null, dialogs: [], calls: []};
    page.on('dialog', (d) => {
        log.dialogs.push({step: log.step, type: d.type(), message: d.message()});
        d.accept().catch(() => {});
    });
    page.on('response', async (r) => {
        const url = r.url();
        const m = url.match(OPS);
        if (!m) return;
        const entry = {step: log.step, op: m[0], method: r.request().method(), status: r.status()};
        try {
            const body = await r.json();
            entry.jsonStatus = body.status;
            entry.content = typeof body.content === 'string' ? flat(body.content.replace(/<[^>]+>/g, ' ')).slice(0, 160) : null;
        } catch (e) {
            entry.content = '(not JSON)';
        }
        log.calls.push(entry);
    });
    return {
        log,
        mark(step) { log.step = step; },
        of(step) { return {dialogs: log.dialogs.filter((d) => d.step === step).map((d) => d.message), calls: log.calls.filter((c) => c.step === step)}; },
    };
}

/** Dashboard › "View" on the book's row (the address when the row is not listed). */
async function openBook(page, app, id, title) {
    return require('../assistant-marketing-work-type-offered-then-refused/lib').openBook(page, app, id, title);
}

/** Side menu "Publication" › "Publication Formats" (the address with the page's key when the menu has no such entry). */
async function openFormatsPage(page, app, submissionId, publicationId) {
    const {PublicationFormatsPage} = pages(app);
    const formats = new PublicationFormatsPage(page, app.contextPath);
    let via = 'menu';
    try {
        await formats.openFromMenu();
    } catch (e) {
        via = 'address';
        await require('../galley-format-moves-in-list-when-saved/lib').openFormats(page, app, submissionId, publicationId);
    }
    await idle(page);
    return {formats, via};
}

/** "Add publication format", the name typed, "OK": the format listed. */
async function addFormat(page, formats, name) {
    const add = await formats.openAdd();
    await add.typeName(name);
    await add.ok();
    await formats.formatRow(name).waitFor({state: 'visible', timeout: 30_000});
    await idle(page);
    return rowState(formats, name);
}

/** A format row's links and cells, as the page shows them. */
async function rowState(formats, name) {
    const row = formats.formatRow(name);
    return {
        links: (await row.locator('a:visible').allInnerTexts()).map(flat).filter(Boolean),
        complete: flat(await formats.cell(row, 1).innerText().catch(() => null)),
        availability: flat(await formats.cell(row, 2).innerText().catch(() => null)),
    };
}

/** The file rows under a format: each one's visible links. */
async function fileRowsState(formats, name) {
    const rows = formats.fileRows(name);
    const out = [];
    for (let i = 0; i < (await rows.count()); i++) out.push((await rows.nth(i).locator('a:visible').allInnerTexts()).map(flat).filter(Boolean));
    return out;
}

/** The window titled `title`: its text, or null when none is open. */
async function windowText(page, title) {
    const {windowByTitle} = pages();
    const win = windowByTitle(page, title);
    if (!(await win.count())) return null;
    return flat(await win.last().innerText());
}

/** Close the window titled `title` by its close button, and wait out the slot it keeps. */
async function closeWindow(page, title) {
    const {windowByTitle} = pages();
    const win = windowByTitle(page, title).last();
    if (!(await win.count())) return false;
    // A side window has its "Close" button; a confirmation ("Format Availability") only "Cancel".
    const closer = win.getByRole('button', {name: 'Close', exact: true});
    const cancel = win.getByRole('link', {name: 'Cancel', exact: true}).or(win.getByRole('button', {name: 'Cancel', exact: true}));
    let how = 'Close';
    if (await closer.count()) await closer.last().click();
    else if (await cancel.last().isEnabled()) { how = 'Cancel'; await cancel.last().click(); }
    else {
        // On 3.5 a refused "OK" leaves "OK" and "Cancel" greyed; the Escape key closes the window.
        how = 'Escape';
        await page.keyboard.press('Escape');
    }
    await win.waitFor({state: 'detached', timeout: 15_000}).catch(() => {});
    await sleep(600);
    return how;
}

/** The buttons of the window titled `title`: each one's label and whether it can be pressed. */
async function windowButtons(page, title) {
    const {windowByTitle} = pages();
    const win = windowByTitle(page, title).last();
    if (!(await win.count())) return null;
    const out = [];
    const b = win.locator('button:visible, a.cancelButton:visible');
    for (let i = 0; i < (await b.count()); i++) out.push({label: flat(await b.nth(i).innerText()), enabled: await b.nth(i).isEnabled()});
    return out;
}

/** Wait until no list or window of the walk shows "Loading" any longer, or `ms` pass. */
async function settle(page, ms = 6_000) {
    await idle(page).catch(() => {});
    await sleep(ms);
}

/** The four lists of an open "Metadata" tab: each one's heading, add link and what it shows. */
async function metadataLists(page) {
    const ids = {codes: 'identificationCodeGridContainer', salesRights: 'salesRightsGridContainer', markets: 'marketsGridContainer', dates: 'publicationDateGridContainer'};
    const form = page.locator('form[id^="publicationMetadataEntryForm-"]').last();
    const out = {};
    for (const [k, id] of Object.entries(ids)) {
        const box = form.locator(`div[id^="${id}"]`).first();
        out[k] = {
            text: flat(await box.innerText().catch(() => null)),
            table: await box.locator('table').count(),
            links: (await box.locator('.header a:visible').allInnerTexts().catch(() => [])).map(flat).filter(Boolean),
        };
    }
    out.saveButton = await form.getByRole('button', {name: 'Save', exact: true}).count();
    return out;
}

/** The format's arrow › "Edit" › the "Metadata" tab, then the lists as they settle. */
async function openMetadata(page, formats, name) {
    const win = await formats.openEdit(name);
    const answered = page.waitForResponse((r) => /publication-format-grid\/edit-format-metadata/.test(r.url()), {timeout: 30_000});
    await win.tab('Metadata').click();
    await answered;
    await page.locator('form[id^="publicationMetadataEntryForm-"]').last().waitFor({state: 'visible', timeout: 30_000});
    await settle(page);
    return metadataLists(page);
}

module.exports = {flat, sleep, pages, watch, openBook, openFormatsPage, addFormat, rowState, fileRowsState, windowText, windowButtons, closeWindow, settle, metadataLists, openMetadata};
