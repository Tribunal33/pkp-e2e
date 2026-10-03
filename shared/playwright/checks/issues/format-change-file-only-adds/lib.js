// Helpers of walk.js (U73 A3: a publication format's "Change File" only adds a file; its window
// offers no way to say which file it replaces; docs/issues/U73-A3-format-change-file-only-adds.md).
// Requiring this file runs nothing.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {idle} = require('../../../probe');
const W = require('../change-file-keeps-first-upload/lib');

/** Two small PDFs under their own names in a temp folder: {first, second}, each {path, name}. */
function twoFiles(prefix = 'u73e') {
    const src = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
    const mk = (name) => { const p = path.join(dir, name); fs.copyFileSync(src, p); return {path: p, name}; };
    return {first: mk(`${prefix}-first.pdf`), second: mk(`${prefix}-second.pdf`)};
}

/**
 * A format's "Change File", then step 1 read as it opens (`step1`), then: the file to replace
 * chosen when the window offers a choice and `replace` names one (by the start of its name), the
 * component chosen when the window asks for one, `file` uploaded, "Continue", "Continue",
 * "Complete". Every stage is recorded; nothing throws past the opening of the window.
 */
async function changeFile(page, formats, format, file, {replace = null, component = 'Book Manuscript'} = {}) {
    const out = {};
    await formats.rowLink(formats.formatRow(format), 'Change File').click();
    await W.uploadBox(page).waitFor({state: 'attached', timeout: W.T});
    await idle(page);
    out.step1 = await W.stepOne(page);
    const wiz = W.wizard(page);
    const revise = wiz.locator('select[id^="revisedFileId"]');
    if (replace && (await revise.count())) {
        const label = (await revise.locator('option').allInnerTexts()).find((t) => t.trim().startsWith(replace));
        if (label) { await revise.selectOption({label}); out.replaceChosen = label.trim(); } else out.replaceChosen = `no option starting "${replace}"`;
        await idle(page);
    } else out.replaceChosen = replace ? 'no choice offered' : null;
    const genre = wiz.locator('select[id^="genreId"]');
    if ((await genre.count()) && (await genre.isVisible()) && (await genre.isEnabled())) {
        await genre.selectOption({label: component});
        out.componentChosen = component;
    } else out.componentChosen = null;
    out.upload = await W.pick(page, file).catch((e) => `FAILED ${String(e).slice(0, 300)}`);
    out.stepOneAfterUpload = await W.stepOne(page).catch(() => null);
    out.finish = await W.finish(page).catch((e) => `FAILED ${String(e).slice(0, 300)}`);
    return out;
}

module.exports = {twoFiles, changeFile};
