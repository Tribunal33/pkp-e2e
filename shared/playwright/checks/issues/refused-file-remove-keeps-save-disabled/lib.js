// Helpers of walk.js (U10 A15: after a refused file, the box's hidden "Remove file" frees "Upload File" but
// leaves the tab's "Save" disabled). The box helpers are U10 A7's (refused-upload-locks-box/lib.js); this file
// adds the walk's own files, the hover-and-click on "Remove file" and the form's language switch. Requiring it
// runs nothing.
const fs = require('fs');
const path = require('path');
const A7 = require('../refused-upload-locks-box/lib');

const FIXTURES = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files');

/** The walk's files under <dir>/files: a PDF and a PNG, named as the Steps name them. */
function makeFiles(dir) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const pdf = path.join(d, 'u10r9-logo.pdf');
    const png = path.join(d, 'u10r9-logo.png');
    fs.copyFileSync(path.join(FIXTURES, 'article.pdf'), pdf);
    fs.copyFileSync(path.join(FIXTURES, 'profile-image-400.png'), png);
    return {pdf, png};
}

/** Move the pointer over the box's refused-file frame (step 4); returns what the "Remove file" link shows then. */
async function hoverFrame(page, b) {
    const frame = b.dropzone.locator('.dz-preview').first();
    if (!(await frame.count())) return {frame: false};
    await frame.hover({timeout: 5000}).catch(() => null);
    await A7.sleep(800);
    return {frame: true, link: await A7.removeLink(page, b)};
}

/** Click the frame's "Remove file" link (step 5), as a person does with the pointer already over the frame. */
async function clickRemoveFile(page, b) {
    const link = b.dropzone.locator('a.dz-remove').first();
    if (!(await link.count())) return {clicked: 'no "Remove file" link'};
    await b.dropzone.locator('.dz-preview').first().hover({timeout: 5000}).catch(() => null);
    const clicked = await link.click({timeout: 5000}).then(() => true).catch((e) => String(e.message).split('\n')[0]);
    await A7.sleep(800);
    return {clicked};
}

/** Show a second language's fields on the form holding `b` (the form's language button, e.g. "French"). */
async function showLocale(page, b, labelRe) {
    const btn = b.form.locator('button.pkpFormLocales__locale').filter({hasText: labelRe}).first();
    if (!(await btn.count())) return {clicked: false};
    const active = /isActive/.test((await btn.getAttribute('class')) || '');
    if (!active) await btn.click();
    await A7.sleep(600);
    return {clicked: !active, label: A7.tidy(await btn.innerText())};
}

module.exports = {makeFiles, hoverFrame, clickRemoveFile, showLocale};
