// Helpers of walk.js (issue report docs/issues/U63-OJS3-pubmed-empty-nlm-title-empties-journal-title.md).
// Requiring this file runs nothing. The PubMed export helpers come from the sibling PubMed issue walk's lib.js.
const fs = require('fs');
const {idle} = require('../../../probe');
const pubmed = require('../pubmed-doaj-export-needs-outside-sites/lib');

const {T, sleep, flat} = pubmed;

/** Tools › Import/Export › "PubMed XML Export Plugin" on its "Settings" tab (open first); returns the box's value. */
async function openPubMedSettings(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/importexport/plugin/PubMedExportPlugin`));
    await idle(page).catch(() => {});
    await page.locator('#exportTabs > ul').getByRole('tab', {name: 'Settings', exact: true}).click();
    const box = page.locator('#pubmedSettingsForm input[name="nlmTitle"]');
    await box.waitFor({timeout: T});
    await idle(page).catch(() => {});
    return box.inputValue();
}

/** On "Settings": put `value` in "NLM Title Abbreviation" (null leaves the box as it is) and press "Save". */
async function saveNlmTitle(page, value) {
    const form = page.locator('#pubmedSettingsForm');
    if (value !== null) await form.locator('input[name="nlmTitle"]').fill(value);
    const answered = page.waitForResponse((r) => r.request().method() === 'POST' && /verb=save/.test(r.url()), {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const res = await answered;
    await idle(page).catch(() => {});
    await sleep(500);
    return {status: res.status(), boxAfter: await form.locator('input[name="nlmTitle"]').inputValue().catch(() => null)};
}

/** The `<JournalTitle>` element of a saved PubMed file (or of the file text a refused export showed). */
function journalTitle(file) {
    if (!file || !fs.existsSync(file)) return {element: null, note: `no file at ${file}`};
    const xml = fs.readFileSync(file, 'utf8');
    const m = xml.match(/<JournalTitle\s*\/>|<JournalTitle>([\s\S]*?)<\/JournalTitle>/);
    return {element: m ? m[0] : null, text: m ? (m[1] ?? '') : null, count: (xml.match(/<JournalTitle/g) || []).length};
}

/** "Export Articles" with the article of that title ticked; returns the press's record and the file's journal title. */
async function exportArticle(page, app, title, saveTo) {
    await pubmed.openPubMed(page, app, 'Export Articles');
    const ticked = await pubmed.tickPubMedArticle(page, title);
    const press = await pubmed.pressExport(page, app, pubmed.pubMedButton(page, 'Export Articles'), 'PubMedExportPlugin/exportSubmissions', saveTo);
    return {ticked, press, journalTitle: journalTitle(saveTo)};
}

module.exports = {T, sleep, flat, openPubMedSettings, saveNlmTitle, journalTitle, exportArticle};
