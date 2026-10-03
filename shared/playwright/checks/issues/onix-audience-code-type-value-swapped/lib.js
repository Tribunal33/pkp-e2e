// Helpers for the U74 A9 walk {OMP}: a book's "Marketing" › "Audience" page, the Native XML
// export of named books with each book's ONIX `Audience` and `AudienceRange` elements, and the
// Native XML import of a file with the new book's "Audience" page read back. Requiring this file
// runs nothing; the suite page objects are required inside the calls (they read PKP_APP_ROOT,
// which forEachApp sets). The press's "Publisher Identity" and `step()` come from the U74 A17
// walk's lib.
const fs = require('fs');
const path = require('path');
const {idle, screen, outFile, sql} = require('../../../probe');
const A17 = require('../market-tax-rate-fails-native-export/lib');

const ROOT = path.resolve(__dirname, '../../../../..');
const omp = (file) => require(path.join(ROOT, 'apps/omp/playwright/pages', file));
const shared = (file) => require(path.join(ROOT, 'shared/playwright/pages', file));

const {BOOK, OTHER_BOOK, flat, step, publisherIdentity} = A17;
const LISTS = ['audience', 'audienceRangeQualifier', 'audienceRangeFrom', 'audienceRangeTo', 'audienceRangeExact'];

/** "Marketing" › "Audience" of submission `id`: the five lists as they show chosen. */
async function readAudience(app, page, id) {
    const {AudiencePage} = omp('OnixPages.js');
    const aud = new AudiencePage(page, app.contextPath);
    await aud.gotoEditorial(id);
    const out = {};
    for (const name of LISTS) {
        // evaluateAll does not wait for a chosen option, which a list left empty never has.
        const chosen = await aud.list(name).locator('option:checked').evaluateAll((os) => os.map((o) => (o.textContent || '').trim()).filter(Boolean)).catch(() => []);
        out[name] = chosen.join(' | ');
    }
    return {page: aud, chosen: out};
}

/** "Marketing" › "Audience" of submission `id`: choose the lists given (by option text), "Save". */
async function setAudience(app, page, id, choices) {
    const {page: aud} = await readAudience(app, page, id);
    for (const [name, option] of Object.entries(choices)) await aud.choose(name, option);
    await aud.save();
    await idle(page).catch(() => {});
    const after = await readAudience(app, page, id);
    return {chosen: after.chosen, screen: await screen(page)};
}

/** Every element named `name` in an XML text, whitespace between tags dropped. */
const elements = (xml, name) =>
    (xml.match(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>[\\s\\S]*?<\\/(?:\\w+:)?${name}>`, 'g')) || []).map((p) => flat(p.replace(/>\s+</g, '><'), 600));

/** Per `<monograph>` of a Native XML file: its title, and the Audience and AudienceRange of its ONIX products. */
function audiences(xml) {
    return xml
        .split(/<monograph\b/)
        .slice(1)
        .map((m) => ({
            title: flat(((m.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1]) || '', 80),
            products: elements(m, 'Product').length,
            audience: elements(m, 'Audience'),
            audienceRange: elements(m, 'AudienceRange'),
        }));
}

/**
 * Tools › "Import/Export" › "Native XML Plugin" › "Export": tick the books titled, "Export
 * Submissions", "Download Exported File"; the result's first line, and each book's audience
 * elements. With `keep`, the file is also written under that name in the run folder.
 */
async function nativeExport(app, page, titles = [BOOK.title], keep = null) {
    const {NativeXmlPage} = shared('ImportExportPages.js');
    const native = new NativeXmlPage(page, app.contextPath, {exportTab: 'Export', exportButton: 'Export Submissions', importResults: 'Results'});
    await native.goto();
    await native.openExportTab();
    for (const title of titles) await native.list.box(title).check();
    const panel = await native.list.pressExport(native);
    await panel.getByText(/completed successfully|process failed/).first().waitFor({timeout: 60_000}).catch(() => {});
    const text = (await panel.innerText().catch(() => '')) || '';
    const out = {completed: /completed successfully/.test(text), first: flat(text.split('\n')[0]), errors: /Errors occured/.test(text) ? flat(text, 2000) : null};
    if (await native.downloadButton(panel).isVisible().catch(() => false)) {
        const file = await native.download(panel);
        out.file = file.name;
        out.books = audiences(file.text);
        if (keep) {
            out.kept = outFile(keep);
            fs.writeFileSync(out.kept, file.text);
        }
    }
    out.screen = await screen(page);
    return out;
}

/**
 * "Native XML Plugin" › "Import": upload `file`, "Import"; the results panel's text and the
 * imported submissions' ids, then each new book's "Audience" page as it shows.
 */
async function nativeImport(app, page, file) {
    const {NativeXmlPage} = shared('ImportExportPages.js');
    const native = new NativeXmlPage(page, app.contextPath, {exportTab: 'Export', exportButton: 'Export Submissions', importResults: 'Results'});
    await native.goto();
    await native.openTab('Import');
    await native.upload(file);
    const panel = await native.pressImport();
    const text = flat(await panel.innerText().catch(() => ''), 2000);
    const ids = [...(text || '').matchAll(/"(\d+)"\s*-\s*"/g)].map((m) => Number(m[1]));
    const out = {completed: /completed successfully/.test(text || ''), text, ids, screen: await screen(page), books: []};
    for (const id of ids) {
        const read = await step(page, `read-imported-${id}`, async () => (await readAudience(app, page, id)).chosen);
        out.books.push({id, audience: read});
    }
    return out;
}

/** The audience settings as stored (Evidence only). */
function stored(app, ids = [BOOK.id]) {
    return sql(app, `select submission_id, setting_name, setting_value from submission_settings where setting_name like 'audience%' and submission_id in (${ids.join(',')}) order by 1, 2`);
}

module.exports = {BOOK, OTHER_BOOK, LISTS, flat, step, publisherIdentity, readAudience, setAudience, audiences, nativeExport, nativeImport, stored};
