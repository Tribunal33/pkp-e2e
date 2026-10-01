// Helpers for walking the legacy file upload box ("Upload File", controllers/fileUploadContainer.tpl)
// with the keyboard, shared by walk.js and neighbour.js. Requiring this file runs nothing.
const fs = require('fs');
const {outFile, idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A small file to choose, written into the run folder. */
function scratchFile(name = 'u63ir14.xml') {
    const file = outFile(name);
    fs.writeFileSync(file, '<?xml version="1.0" encoding="utf-8"?>\n<u63ir14/>\n');
    return file;
}

const IMPORT = '#import-tab';
const WIZARD = 'div[id^="fileUploadWizard"]';

/** What holds the keyboard focus, as data; inScope says whether it sits inside `scope`. */
function focused(page, scope = IMPORT) {
    return page.evaluate((scope) => {
        const e = document.activeElement;
        if (!e || e === document.body) return {tag: 'body'};
        const label = (e.innerText || e.value || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
        return {
            tag: e.tagName.toLowerCase(), id: e.id || null, type: e.getAttribute('type'), text: label,
            uploadButton: e.classList.contains('pkp_uploader_button'),
            fileInput: e.tagName === 'INPUT' && e.type === 'file',
            inScope: !!e.closest(scope),
        };
    }, scope);
}

const describe = (f) => (f.uploadButton ? '"Upload File" button' : f.fileInput ? 'file input' : `${f.tag}${f.id ? '#' + f.id : ''}${f.text ? ` "${f.text}"` : ''}`);

/** Press Tab (or Shift+Tab) up to n times from where the focus is, stopping once it leaves `scope`. */
async function tabWalk(page, n = 8, shift = false, scope = IMPORT) {
    const stops = [];
    for (let i = 0; i < n; i++) {
        await page.keyboard.press(shift ? 'Shift+Tab' : 'Tab');
        const f = await focused(page, scope);
        stops.push(f);
        if (!f.inScope && i > 0) break;
    }
    return stops;
}

/** The upload box's controls as the page has them: the visible button and plupload's hidden file input. */
function uploadBoxAttrs(page, scope = IMPORT) {
    return page.evaluate((scope) => {
        const box = [...document.querySelectorAll(`${scope} .pkp_controller_fileUpload`)].pop();
        const b = box && box.querySelector('.pkp_uploader_button');
        const i = box && box.querySelector('.moxie-shim input[type=file]');
        return {
            buttonText: b ? b.innerText.replace(/\s+/g, ' ').trim() : null,
            buttonTabindex: b ? b.getAttribute('tabindex') : null,
            inputTabindex: i ? i.getAttribute('tabindex') : null,
            boxClass: box ? box.className : null,
        };
    }, scope);
}

/**
 * With the focus on "Upload File": press a key, count the file pickers it opens, choose `file` in the
 * first, and wait for the box to show it. Returns what happened.
 */
async function chooseWith(page, action, file, scope = IMPORT) {
    const choosers = [];
    const on = (fc) => choosers.push(fc);
    page.on('filechooser', on);
    await action();
    for (let i = 0; i < 20 && !choosers.length; i++) await sleep(150);
    await sleep(1500); // a second picker would open within this window
    page.off('filechooser', on);
    const out = {pickersOpened: choosers.length};
    if (choosers.length) {
        await choosers[0].setFiles(file);
        await page.locator(`${scope} .pkp_controller_fileUpload.complete`).last().waitFor({timeout: 15_000}).catch(() => {});
        await idle(page).catch(() => {});
        out.box = await page.locator(`${scope} .pkp_uploader_drop_zone`).last().innerText().then((t) => t.replace(/\s+/g, ' ').trim()).catch(() => null);
        if (scope === IMPORT) out.temporaryFileId = await page.locator(`${scope} input[name=temporaryFileId]`).inputValue().catch(() => null);
    }
    return out;
}

module.exports = {IMPORT, WIZARD, sleep, scratchFile, focused, describe, tabWalk, uploadBoxAttrs, chooseWith};
