// Helpers of walk.js (U36 A9: step 1 of the upload window as a screen reader gets it). Requiring this
// file runs nothing. The window itself is opened and found with the helpers of
// ../change-file-keeps-first-upload/lib.js.
const fs = require('fs');
const {idle, outFile} = require('../../../probe');
const A14 = require('../change-file-keeps-first-upload/lib');

const flat = A14.flat;

/** A small file to upload, written into the run folder. */
function scratchFile(name = 'u36k-file.txt') {
    const file = outFile(name);
    fs.writeFileSync(file, 'u36k\n');
    return file;
}

/** OPS: Publication › "Galleys" › "Add galley", the label, "Save"; the upload window then opens. */
async function addGalley(page, app, id, label) {
    await A14.openWorkflow(page, app, id, app.line === 'stable-3_5_0' ? 'publication_galleys' : 'publication_1_galleys');
    const manager = page.locator('[data-cy="galley-manager"]').first();
    await manager.locator('table').first().waitFor({timeout: A14.T});
    await manager.locator('button').filter({hasText: /^\s*Add galley\s*$/}).click();
    const box = page.getByRole('dialog').locator('input[name="label"]').last();
    await box.waitFor({timeout: A14.T});
    await idle(page);
    await box.fill(label);
    await page.getByRole('dialog').filter({has: page.locator('input[name="label"]')}).last().getByRole('button', {name: 'Save', exact: true}).last().click();
}

/** Wait until the open upload window's box is wired (plupload has added its hidden file input). */
async function wizardReady(page) {
    await A14.uploadBox(page).waitFor({state: 'attached', timeout: A14.T});
    await A14.wizard(page).locator('.pkp_controller_fileUpload:not(.loading)').first().waitFor({state: 'attached', timeout: A14.T});
    await A14.wizard(page).locator('.moxie-shim input[type=file]').first().waitFor({state: 'attached', timeout: 10_000}).catch(() => {});
    await idle(page);
}

/**
 * Step 1 as a sighted user and as a screen reader get it: the window's accessibility snapshot, each
 * drop-down with its label and its accessible name, and the upload box on screen and in the tree.
 */
async function readStepOne(page) {
    const w = A14.wizard(page);
    const form = w.locator('form.pkp_form').first();
    const aria = await form.ariaSnapshot();
    const selects = await form.locator('select').evaluateAll((els) => els.map((s) => {
        const section = s.closest('.section');
        const label = section && section.querySelector('label');
        return {
            id: s.id,
            label: label ? label.innerText.replace(/\s+/g, ' ').trim() : null,
            labelFor: label ? label.getAttribute('for') : null,
            labelsTied: s.labels ? s.labels.length : 0,
            ariaLabel: s.getAttribute('aria-label'),
            ariaLabelledby: s.getAttribute('aria-labelledby'),
            title: s.getAttribute('title'),
            chosen: s.options[s.selectedIndex] ? s.options[s.selectedIndex].text.trim() : null,
            disabled: s.disabled,
        };
    }));
    for (const s of selects) {
        // the first line of the select's own snapshot: `- combobox "<accessible name>"`, or a bare `- combobox`
        const own = (await form.locator(`select[id="${s.id}"]`).ariaSnapshot()).split('\n')[0];
        const m = own.match(/^- combobox(?: "((?:[^"\\]|\\.)*)")?/);
        s.snapshotLine = flat(own, 200);
        s.accessibleName = m && m[1] !== undefined ? m[1] : '';
    }
    const box = await A14.uploadBox(page).evaluate((b) => {
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        const btn = b.querySelector('.pkp_uploader_button');
        const input = b.querySelector('.moxie-shim input[type=file]');
        return {
            className: b.className,
            display: cs.display, visibility: cs.visibility, position: cs.position, clip: cs.clip,
            rect: {left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height)},
            onScreen: r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight && cs.display !== 'none' && cs.visibility !== 'hidden',
            ariaHidden: b.getAttribute('aria-hidden'),
            buttonTabindex: btn ? btn.getAttribute('tabindex') : null,
            inputTabindex: input ? input.getAttribute('tabindex') : null,
        };
    });
    // role locators match only what the accessibility tree holds
    const inTree = {
        dragText: /Drag and drop a file here to begin upload/.test(aria),
        uploadFileButton: await form.getByRole('button', {name: 'Upload File'}).count(),
        chooseFileButton: await form.getByRole('button', {name: /Choose File/}).count(),
        comboboxes: await form.getByRole('combobox').count(),
    };
    return {aria, selects, box, inTree};
}

module.exports = {flat, scratchFile, addGalley, wizardReady, readStepOne};
