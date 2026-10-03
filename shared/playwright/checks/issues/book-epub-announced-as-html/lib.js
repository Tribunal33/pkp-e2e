// Helpers of walk.js here (docs/issues/U20-OMP1-book-epub-announced-as-html.md) and of
// ../book-page-announces-one-pdf/walk.js (docs/issues/U20-OMP2-book-page-announces-one-pdf.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads what a
// visitor's browser receives (the page's own <meta> tags, as "View Page Source" shows them).
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const {idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/** A stored (uncompressed) zip of `entries` [{name, data}], `mimetype` first as EPUB asks. */
function storedZip(entries) {
    const locals = [];
    const centrals = [];
    let offset = 0;
    for (const {name, data} of entries) {
        const n = Buffer.from(name);
        const d = Buffer.from(data);
        const crc = zlib.crc32(d);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(d.length, 18);
        local.writeUInt32LE(d.length, 22);
        local.writeUInt16LE(n.length, 26);
        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(d.length, 20);
        central.writeUInt32LE(d.length, 24);
        central.writeUInt16LE(n.length, 28);
        central.writeUInt32LE(offset, 42);
        locals.push(local, n, d);
        centrals.push(central, n);
        offset += 30 + n.length + d.length;
    }
    const cd = Buffer.concat(centrals);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(cd.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, cd, end]);
}

/** The two files a press would upload: a minimal EPUB and an HTML file. Returns their paths. */
function bookFiles() {
    const dir = path.join(os.tmpdir(), 'u20b-files');
    fs.mkdirSync(dir, {recursive: true});
    const xhtml = '<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>u20b</title></head><body><p>u20b book</p></body></html>';
    const epub = storedZip([
        {name: 'mimetype', data: 'application/epub+zip'},
        {name: 'META-INF/container.xml', data: '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'},
        {name: 'content.opf', data: '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">u20b</dc:identifier><dc:title>u20b book</dc:title><dc:language>en</dc:language></metadata><manifest><item id="c" href="c.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c"/></spine></package>'},
        {name: 'c.xhtml', data: xhtml},
    ]);
    const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>u20b book</title>\n</head>\n<body>\n<h1>u20b book</h1>\n<p>The whole book in HTML.</p>\n</body>\n</html>\n';
    const out = {epub: path.join(dir, 'u20b-book.epub'), html: path.join(dir, 'u20b-book.html')};
    fs.writeFileSync(out.epub, epub);
    fs.writeFileSync(out.html, html);
    return out;
}

/** "Publication" › "Publication Formats" of a book, by its workflow address. Returns the page object. */
async function openFormats(page, app, submissionId) {
    return require('../priced-file-link-price-twice-or-missing/lib').openFormats(page, app, submissionId);
}

/**
 * Steps 2-5 of OMP1: "Add publication format" (`name`, "OK"); its "Change File" (component "Book
 * Manuscript", the file, "Continue", "Continue", "Complete"); the file's "Set Terms" › "Open
 * Access" › "Save"; the format's "Not Available" › "OK". Returns what the list shows after.
 */
async function addFormatWithFile(page, app, formats, name, filePath) {
    const {SALES} = require(path.join(app.suiteDir, 'pages', 'PublicationFormatPages.js'));
    const fileName = path.basename(filePath);
    const add = await formats.openAdd();
    await add.typeName(name);
    await add.ok();
    await formats.formatRow(name).waitFor({state: 'visible', timeout: 30_000});
    await formats.uploadWithChangeFile(name, filePath);
    const terms = await formats.openTerms(name, fileName);
    await terms.choose(SALES.openAccess);
    await terms.save();
    await idle(page);
    await formats.rowLink(formats.fileRow(name, fileName), 'Open Access').waitFor({state: 'visible', timeout: 30_000});
    await (await formats.openStatus(formats.formatRow(name), 'Not Available', 'Format Availability')).ok();
    await formats.rowLink(formats.formatRow(name), 'Available').waitFor({state: 'visible', timeout: 30_000});
    await sleep(500);
    return {
        format: (await formats.formatLabel(name).innerText()).replace(/\s+/g, ' ').trim(),
        formatState: (await formats.formatRow(name).locator('a').allInnerTexts()).map((t) => t.trim()).filter(Boolean),
        file: (await formats.fileRow(name, fileName).locator('a').allInnerTexts()).map((t) => t.trim()).filter(Boolean),
    };
}

/**
 * A visitor's view of a catalog page: open `address` (path after the press), read every
 * Google Scholar tag in the page's head and the side column's file links. `citation_*` tags
 * keep their order.
 */
async function readScholarTags(page, app, address) {
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/${address}`));
    await idle(page).catch(() => {});
    const data = await page.evaluate(() => ({
        tags: [...document.querySelectorAll('meta[name^="citation_"]')].map((m) => ({name: m.getAttribute('name'), content: m.getAttribute('content')})),
        files: [...document.querySelectorAll('.obj_monograph_full .entry_details .item.files a.cmp_download_link')].map((a) => ({
            text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
            href: a.getAttribute('href'),
        })),
    }));
    const pick = (n) => data.tags.filter((t) => t.name === n).map((t) => rel(t.content));
    return {
        url: rel(page.url()),
        status: r ? r.status() : null,
        title: await page.title(),
        pdf: pick('citation_pdf_url'),
        html: pick('citation_fulltext_html_url'),
        isbn: pick('citation_isbn'),
        files: data.files.map((f) => ({text: f.text, href: rel(f.href)})),
    };
}

module.exports = {sleep, rel, bookFiles, openFormats, addFormatWithFile, readScholarTags};
