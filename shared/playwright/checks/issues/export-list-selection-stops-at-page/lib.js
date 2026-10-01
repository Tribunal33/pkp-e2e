// Helpers for the Native XML Plugin's export list past one page (U63 A11), shared by walk.js and
// neighbour.js. The plugin page helpers come from the sibling issue walk's lib.js.
// Requiring this file runs nothing.
const fs = require('fs');
const {idle, outFile} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');

const {sleep, flat, LABELS} = native;
const T = 20_000;
const listTab = (page) => page.locator('#exportSubmissions-tab');
const selectButton = (page) => listTab(page).getByRole('button', {name: /^Select (All|None)$/});

/** What the export list shows: lines, ticked lines (and their ids), page links, the select button's label. */
async function listState(page) {
    return listTab(page).evaluate((el) => {
        const boxes = [...el.querySelectorAll('.listPanel__item input[type=checkbox]')];
        const btn = [...el.querySelectorAll('button')].find((b) => /^Select (All|None)$/.test(b.innerText.trim()));
        const pag = el.querySelector('.pkpPagination');
        const cur = el.querySelector('.pkpPagination [aria-current="true"]');
        return {
            lines: boxes.length,
            ticked: boxes.filter((b) => b.checked).length,
            tickedIds: boxes.filter((b) => b.checked).map((b) => Number(b.value)),
            firstId: boxes.length ? Number(boxes[0].value) : null,
            button: btn ? btn.innerText.trim() : null,
            pagination: pag ? pag.innerText.replace(/\s+/g, ' ').trim() : null,
            currentPage: cur ? cur.innerText.trim() : null,
        };
    });
}

/** Press "Select All" / "Select None" and return the list's state after. */
async function pressSelect(page) {
    await selectButton(page).click();
    await sleep(300);
    return listState(page);
}

/** Press page link `n` under the list and wait for its lines to replace the page's. */
async function goToPage(page, n) {
    const before = (await listState(page)).firstId;
    await listTab(page).locator('.pkpPagination .pkpPagination__page').filter({hasText: new RegExp(`^\\s*${n}\\s*$`)}).first().click();
    for (let i = 0; i < 40; i++) {
        await sleep(250);
        const s = await listState(page);
        if (s.firstId !== before && s.currentPage === String(n)) break;
    }
    await idle(page).catch(() => {});
    return listState(page);
}

/** Tick the list's first line; returns its id and title. */
async function tickFirst(page) {
    const item = listTab(page).locator('.listPanel__item').first();
    const box = item.locator('input[type=checkbox]');
    await box.check();
    return {id: Number(await box.inputValue()), title: flat(await item.locator('.listPanel__itemSubTitle').innerText(), 120)};
}

/** The submission ids a Native XML export file holds (each submission's internal id). */
function fileIds(xml) {
    return [...xml.matchAll(/<(article|monograph|preprint)\b[^>]*>\s*<id type="internal"[^>]*>(\d+)<\/id>/g)].map((m) => Number(m[2]));
}

/** Press the export button, then "Download Exported File"; keeps the file and returns its ids. */
async function exportAndDownload(app, page, name) {
    const before = await page.locator('#importExportTabs > ul [role="tab"]').count();
    await listTab(page).getByRole('button', {name: LABELS[app.name].exportBtn, exact: true}).click();
    const panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
    for (let i = 0; i < 600; i++) {
        await sleep(500);
        if ((await page.locator('#importExportTabs > ul [role="tab"]').count()) > before
            && await panel.getByRole('button', {name: 'Download Exported File'}).isVisible().catch(() => false)) break;
    }
    const text = flat(await panel.innerText().catch(() => null), 300);
    const dlP = page.waitForEvent('download', {timeout: 60_000});
    await panel.getByRole('button', {name: 'Download Exported File'}).click();
    const d = await dlP;
    const file = outFile(`${name}.xml`);
    fs.copyFileSync(await d.path(), file);
    const xml = fs.readFileSync(file, 'utf8');
    return {panel: text, file, ids: fileIds(xml)};
}

/** On the "Import" tab, upload the file and press "Import"; waits for the results and returns how many it lists. */
async function importOnce(page, file) {
    await page.getByRole('tab', {name: 'Import', exact: true}).first().click();
    await idle(page).catch(() => {});
    const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: 60_000});
    await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
    await up;
    await idle(page).catch(() => {});
    await sleep(500);
    const resp = page.waitForResponse((r) => /NativeImportExportPlugin\/import\?/.test(r.url()), {timeout: 300_000});
    await page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}).click();
    const r = await resp;
    await idle(page).catch(() => {});
    await sleep(800);
    const panel = flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 4000) || '';
    return {status: r.status(), imported: [...panel.matchAll(/"(\d+)"\s*-\s*"/g)].length, head: panel.slice(0, 200)};
}

module.exports = {importOnce, T, listTab, listState, pressSelect, goToPage, tickFirst, fileIds, exportAndDownload};
