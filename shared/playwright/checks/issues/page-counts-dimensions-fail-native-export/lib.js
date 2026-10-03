// Helpers for the U73 A17 walk {OMP}: a format's "Metadata" tab with its page counts and
// dimensions typed and saved (or refused), and the book's Native XML export read for its errors
// and its Extent and Measure elements. Requiring this file runs nothing; the suite page objects
// are required inside the calls (they read PKP_APP_ROOT, which forEachApp sets). The format pages,
// `addFormat()` and `openMeta()` come from the U74 A11/A18/A19 walk's lib (book 4 of PKP's default
// test dataset), `flat()`, `step()` and the "Publisher Identity" from the U74 A17 walk's lib.
const path = require('path');
const {idle, screen, shot, sql} = require('../../../probe');
const A17 = require('../market-tax-rate-fails-native-export/lib');
const F = require('../native-import-loses-trade-details/lib');

const ROOT = path.resolve(__dirname, '../../../../..');
const shared = (file) => require(path.join(ROOT, 'shared/playwright/pages', file));

const {flat, step, publisherIdentity} = A17;
const {BOOK, addFormat, openMeta} = F;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The six boxes, by their names on the tab. */
const BOXES = ['frontMatter', 'backMatter', 'height', 'width', 'thickness', 'weight'];

/** What the six boxes hold. */
async function readBoxes(meta) {
    const out = {};
    for (const n of BOXES) out[n] = await meta.form().locator(`input[name="${n}"]`).inputValue().catch(() => null);
    return out;
}

/**
 * Choose `composition` when given, type `values` (keys of BOXES) into the tab, press "Save": the
 * window closed (saved) or still open (refused, with the messages it shows, then "Cancel").
 */
async function saveBoxes(page, meta, values, {composition} = {}) {
    if (composition) await meta.compositionList().selectOption({label: composition});
    for (const [n, v] of Object.entries(values)) await meta.form().locator(`input[name="${n}"]`).fill(v);
    const answered = page.waitForResponse(
        (r) => /publication-format-grid\/update-format-metadata/.test(r.url()) && r.request().method() === 'POST',
        {timeout: 30_000}
    );
    await meta.saveButton().click();
    const response = await answered;
    const out = {status: response.status(), typed: values};
    for (let i = 0; i < 20; i++) {
        if (!(await meta.win.dialog().count())) break;
        await sleep(250);
    }
    await idle(page).catch(() => {});
    out.closed = (await meta.win.dialog().count()) === 0;
    if (!out.closed) {
        out.refused = true;
        out.errorTexts = await meta.form().locator('.error, label.error, .pkp_form_error').evaluateAll((els) =>
            els.map((e) => `${e.tagName.toLowerCase()}.${e.className}: ${(e.textContent || '').replace(/\s+/g, ' ').trim()}`.slice(0, 200)));
        out.dialogText = flat(await meta.win.dialog().innerText().catch(() => null), 1500);
        await shot(page, `refused-${Date.now() % 100000}`).catch(() => {});
    }
    out.screen = await screen(page);
    if (!out.closed) {
        await meta.cancelLink().click().catch(() => {});
        await sleep(500);
        await idle(page).catch(() => {});
        out.afterCancel = await screen(page);
    }
    return out;
}

/** The book's formats' page counts and dimensions as stored (Evidence only). */
function stored(app) {
    return sql(
        app,
        `select pf.publication_format_id, pf.physical_format, coalesce(pf.front_matter,'∅'), coalesce(pf.back_matter,'∅'), coalesce(pf.height,'∅'),
                coalesce(pf.width,'∅'), coalesce(pf.thickness,'∅'), coalesce(pf.weight,'∅')
           from publication_formats pf where pf.publication_id = ${BOOK.publicationId} order by 1`
    );
}

/** Every element named `name` in an XML text, whitespace between tags dropped. */
const elements = (xml, name) =>
    (xml.match(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>[\\s\\S]*?<\\/(?:\\w+:)?${name}>`, 'g')) || []).map((p) => flat(p.replace(/>\s+</g, '><'), 600));

/**
 * Tools › "Import/Export" › "Native XML Plugin" › "Export": tick the book, "Export Submissions";
 * the results tab's first line and its errors, and with "Download Exported File" the file's
 * Extent and Measure elements.
 */
async function nativeExport(app, page, titles = [A17.BOOK.title]) {
    const {NativeXmlPage} = shared('ImportExportPages.js');
    const native = new NativeXmlPage(page, app.contextPath, {exportTab: 'Export', exportButton: 'Export Submissions', importResults: 'Results'});
    await native.goto();
    await native.openExportTab();
    for (const title of titles) await native.list.box(title).check();
    const panel = await native.list.pressExport(native);
    await panel.getByText(/completed successfully|process failed/).first().waitFor({timeout: 60_000}).catch(() => {});
    const text = (await panel.innerText().catch(() => '')) || '';
    const at = text.indexOf('Errors occured');
    const out = {
        completed: /completed successfully/.test(text),
        first: flat(text.split('\n')[0]),
        errors: at >= 0 ? flat(text.slice(at), 3000) : null,
    };
    if (await native.downloadButton(panel).isVisible().catch(() => false)) {
        const file = await native.download(panel);
        out.file = file.name;
        out.extent = elements(file.text, 'Extent');
        out.measure = elements(file.text, 'Measure');
        out.products = (file.text.match(/<(?:\w+:)?Product>/g) || []).length;
    }
    out.screen = await screen(page);
    return out;
}

module.exports = {BOOK, BOXES, flat, step, publisherIdentity, addFormat, openMeta, readBoxes, saveBoxes, stored, nativeExport};
