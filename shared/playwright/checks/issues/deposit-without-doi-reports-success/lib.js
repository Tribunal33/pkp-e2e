// Helpers for walk.js (issue reports U45 A15 and U45 OJS5). Runs nothing when required.
const fs = require('fs');
const path = require('path');
const {expect} = require('@playwright/test');
const {DOIS_TEXT, isListFetch} = require('../../../pages/DoisPages.js');

const T = 30_000;

/**
 * Press "Deposit All" above the DOIs list and confirm its window with
 * "Deposit all DOIs"; waits for the action's request and the list's refetch.
 * Returns {status, body, window} (the window's text as shown).
 *
 * @param {import('@playwright/test').Page} page
 * @param {any} dois a DoisPage
 */
async function depositAll(page, dois) {
    await dois.depositAllButton().click();
    const dialog = dois.dialog(DOIS_TEXT.depositAllTitle);
    await expect(dialog).toBeVisible({timeout: T});
    const windowText = (await dialog.innerText()).replace(/\s+/g, ' ').trim();
    const acted = page.waitForResponse((r) => /\/api\/v1\/dois\/depositAll/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    const refetched = page.waitForResponse((r) => isListFetch(r), {timeout: T}).catch(() => null);
    await dialog.getByRole('button', {name: DOIS_TEXT.depositAllTitle, exact: true}).click();
    const response = await acted;
    await refetched;
    await expect(dialog).toBeHidden({timeout: T});
    await dois.expectListSettled();
    return {status: response.status(), body: await response.text().catch(() => null), window: windowText};
}
exports.depositAll = depositAll;

/**
 * The export files a deposit left in the install's `files_dir`/temp (read only).
 * An agency plugin writes one XML file per object it deposits and deletes it after
 * the post; a deposit that dies in the post (an exception, an unreachable agency)
 * leaves the file of the object it was depositing, one per try of the job. The
 * file's name says which object (`datacite-<date>-<time>-articles-<submission id>-…`,
 * `…-galleys-<galley id>-…`). Returns the names without their date and time, with
 * the DOI each file's XML carries (null when it carries none), counted.
 *
 * @param {object} app the probe kit's bag
 * @returns {{file: string, doi: string|null, count: number}[]}
 */
function leftExportFiles(app) {
    const root = path.resolve(__dirname, '../../../../..');
    const config = fs.readFileSync(path.isAbsolute(app.configFile) ? app.configFile : path.join(root, app.configFile), 'utf8');
    const filesDir = (config.match(/^files_dir\s*=\s*"?([^"\n]+?)"?\s*$/m) || [])[1];
    const dir = path.join(filesDir || '', 'temp');
    if (!filesDir || !fs.existsSync(dir)) return [];
    const seen = new Map();
    for (const f of fs.readdirSync(dir).filter((n) => /\.xml$/.test(n)).sort()) {
        const xml = fs.readFileSync(path.join(dir, f), 'utf8');
        const doi = (xml.match(/<(?:\w+:)?identifier[^>]*>([^<]*)</) || xml.match(/<doi>([^<]*)</) || [])[1];
        const key = `${f.replace(/-\d{8}-\d{6}-/, '-')} | ${doi ? doi.trim() : ''}`;
        seen.set(key, (seen.get(key) || 0) + 1);
    }
    return [...seen].map(([key, count]) => ({file: key.split(' | ')[0], doi: key.split(' | ')[1] || null, count}));
}
exports.leftExportFiles = leftExportFiles;
