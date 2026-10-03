// Helpers of walk.js (U10 A12: the settings upload boxes show Dropzone's own English texts, not the
// interface language's). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {idle} = require('../../../probe');

const T = 30_000;
const FIXTURES = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files');

/** The walk's files under <dir>/files: u10i-logo.pdf and u10i-logo.png, as the Steps name them. */
function makeFiles(dir) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const pdf = path.join(d, 'u10i-logo.pdf');
    const png = path.join(d, 'u10i-logo.png');
    fs.copyFileSync(path.join(FIXTURES, 'article.pdf'), pdf);
    fs.copyFileSync(path.join(FIXTURES, 'profile-image-400.png'), png);
    return {pdf, png};
}

/** Settings › Website in interface language `locale`, the "Appearance" tab, then its side tab `sub` ("setup" | "advanced"). */
async function openAppearance(page, app, sub, locale) {
    await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/management/settings/website`));
    await idle(page);
    await page.locator('[id="appearance-button"]').first().click();
    const side = page.locator(`[id="${sub === 'setup' ? 'appearance-setup' : sub}-button"]`).first();
    await side.waitFor({timeout: T});
    await side.click();
    await idle(page);
    return {sideTab: (await side.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()};
}

/** Every upload box in the side tab panel `panelId`: its label, its drop area's text and whether it shows, its button. */
async function readBoxes(page, panelId) {
    const panel = page.locator(`[id="${panelId}"]`);
    await panel.locator('.pkpFormField--upload').first().waitFor({timeout: T});
    await page.waitForTimeout(500);
    return panel.locator('.pkpFormField--upload').evaluateAll((els) => els.map((f) => {
        const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
        const msg = f.querySelector('.dz-message');
        return {
            label: t(f.querySelector('.pkpFormFieldLabel')),
            dropArea: t(msg),
            dropAreaShown: !!(msg && (msg.offsetWidth || msg.offsetHeight)),
            button: t(f.querySelector('.pkpFormField--upload__addFile')),
        };
    }));
}

module.exports = {T, makeFiles, openAppearance, readBoxes};
