// Helpers for walk.js (U21 OPS8, OPS9). Requiring this file runs nothing.
const path = require('path');
const {idle, loc} = require('../../../probe');
const {waitForJQueryIdle} = require('../../../support/legacy.js');

const T = 30_000;
const FILES = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ops', 'playwright', 'fixtures', 'files');
const PDF = path.join(FILES, 'preprint.pdf');
const HTML = path.join(FILES, 'preprint.html');
// A failed page script can leave jQuery's request count up for good, so every wait after "Save" is bounded.
const soft = (page, ms = 5000) => Promise.race([idle(page).catch(() => {}), page.waitForTimeout(ms)]);
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const labelDialog = (page) => page.getByRole('dialog').filter({has: page.locator('#preprintGalleyForm')});
const uploadDialog = (page) => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});

/**
 * Upload Files: "Add File", the Galley Label, "Save"; then in "Upload a File Ready for Publication" the
 * Preprint Component, the file, "Continue", "Continue", "Complete". Never throws on the way: it reports
 * how far it got and what each window showed.
 */
async function addGalley(page, {label, file, genre = 'Preprint Text'}) {
    const r = {label};
    await waitForJQueryIdle(page);
    for (let i = 0; i < 3; i++) {
        await page.getByRole('link', {name: 'Add File', exact: true}).click();
        if (await labelDialog(page).first().waitFor({state: 'visible', timeout: 5000}).then(() => true, () => false)) break;
    }
    await loc(page, 'Upload Files: the Galley Label window', labelDialog(page));
    await labelDialog(page).locator('input[name="label"]').fill(label);
    await labelDialog(page).getByRole('button', {name: 'Save', exact: true}).click();
    const genreSelect = uploadDialog(page).locator('select[name="genreId"]').first();
    r.uploadOpened = await genreSelect.waitFor({state: 'visible', timeout: T}).then(() => true, () => false);
    await soft(page);
    r.labelWindowStillOpen = await labelDialog(page).first().isVisible().catch(() => false);
    if (!r.uploadOpened) return r;
    await genreSelect.selectOption({label: genre});
    await uploadDialog(page).locator('input[type="file"]').setInputFiles(file);
    const cont = uploadDialog(page).getByRole('button', {name: 'Continue', exact: true});
    r.fileAccepted = await cont.waitFor({state: 'visible', timeout: T}).then(async () => {
        for (let i = 0; i < 60; i++) { if (await cont.isEnabled()) return true; await page.waitForTimeout(500); }
        return false;
    }, () => false);
    if (!r.fileAccepted) return r;
    await cont.click();
    const reviewTab = uploadDialog(page).getByRole('tab', {name: '2. Review Details'});
    r.reviewDetailsSelected = await reviewTab.waitFor({timeout: T}).then(() => reviewTab.getAttribute('aria-selected'), () => null);
    await soft(page);
    // The "2. Review Details" panel fills by AJAX: give it the time a slow upload would need.
    const panel = uploadDialog(page).locator('[role="tabpanel"]:visible').first();
    for (let i = 0; i < 20; i++) { if (flat(await panel.innerText().catch(() => ''))) break; await page.waitForTimeout(500); }
    r.reviewDetailsText = flat(await panel.innerText().catch(() => null), 300);
    r.reviewDetailsContinue = (await cont.isEnabled().catch(() => false)) ? 'enabled' : 'disabled';
    if (r.reviewDetailsContinue !== 'enabled' || !r.reviewDetailsText) return r;
    await cont.click();
    const confirmTab = uploadDialog(page).getByRole('tab', {name: '3. Confirm'});
    await confirmTab.waitFor({timeout: T}).catch(() => {});
    await uploadDialog(page).getByRole('button', {name: 'Complete', exact: true}).click({timeout: T});
    r.completed = await uploadDialog(page).first().waitFor({state: 'detached', timeout: T}).then(() => true, () => false);
    await soft(page);
    await soft(page);
    return r;
}

/** The "Files" grid on Upload Files: each row's text and whether its label links to a file. */
async function galleyRows(page) {
    await soft(page);
    return page.locator('.submissionWizard [id^="component-grid-preprintgalleys"] tbody:not(.empty) tr.gridRow').evaluateAll((rows) => rows.map((tr) => ({
        text: tr.innerText.replace(/\s+/g, ' ').trim(),
        links: Array.from(tr.querySelectorAll('a')).map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})),
    })));
}

/** The Review step's "Files" panel: its text, the files it lists, and "Submit". */
async function reviewFiles(page) {
    const body = page.locator('.submissionWizard__reviewPanel__body--files');
    await body.waitFor({timeout: T}).catch(() => {});
    const submit = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true});
    return {
        text: flat(await body.innerText().catch(() => null), 300),
        items: (await body.locator('.submissionWizard__reviewPanel__item__value').allInnerTexts().catch(() => [])).map((x) => flat(x, 80)),
        submit: (await submit.count()) ? ((await submit.isDisabled()) ? 'disabled' : 'enabled') : 'absent',
    };
}

/** The wizard page's initial galley list as the server wrote it into the page: an array or an object keyed by id. */
function galleysShape(html) {
    const m = /"galleys":\s*([[{])/.exec(html || '');
    if (!m) return null;
    return m[1] === '[' ? 'array' : 'object keyed by galley id';
}

module.exports = {T, soft, PDF, HTML, flat, labelDialog, uploadDialog, addGalley, galleyRows, reviewFiles, galleysShape};
