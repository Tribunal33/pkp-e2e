// Helpers of walk.js (U36 A5: a galley's "Change File" shows "Current file" with no file name;
// docs/issues/U36-A5-galley-change-file-names-no-current-file.md). Requiring this file runs nothing.
// The upload wizard's own helpers (the window, its upload box, a pick, a list's rows) are
// ../change-file-keeps-first-upload/lib; the "Galleys" page is ../listing-offers-galley-without-file/lib.
const fs = require('fs');
const os = require('os');
const path = require('path');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The file the steps upload, under its own name in a temp folder: {path, name}. */
function replacementFile() {
    const src = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'replacement.pdf');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u36j-'));
    const p = path.join(dir, 'u36j-replacement.pdf');
    fs.copyFileSync(src, p);
    return {path: p, name: 'u36j-replacement.pdf'};
}

/**
 * Step 1 of the open upload wizard, as the person reads it: whether the heading "Current file"
 * is there and what stands in its section beside the heading (`under`, '' when nothing does), the
 * section's markup, and every heading and line of the step in order.
 *
 * @param {import('@playwright/test').Locator} wizard the wizard window
 */
async function currentFile(wizard) {
    const form = wizard.locator('form.pkp_form').filter({has: wizard.page().locator('.pkp_controller_fileUpload')}).first();
    const read = await form.evaluate((f) => {
        const sections = Array.from(f.querySelectorAll('.section'));
        const head = (s) => s.querySelector(':scope > label, :scope > span.label');
        const section = sections.find((s) => head(s) && head(s).textContent.trim() === 'Current file');
        const out = {
            heading: !!section,
            under: null,
            html: null,
            labels: sections.map((s) => (head(s) ? head(s).textContent.trim() : '')).filter(Boolean),
            hiddenRevisedFileId: (f.querySelector('input[type="hidden"][name="revisedFileId"]') || {}).value || null,
        };
        if (section) {
            const copy = section.cloneNode(true);
            const h = copy.querySelector(':scope > label, :scope > span.label');
            if (h) h.remove();
            out.under = copy.textContent.replace(/\s+/g, ' ').trim();
            out.html = section.outerHTML.replace(/\s+/g, ' ').slice(0, 400);
        }
        return out;
    });
    read.lines = (await form.innerText()).split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 12);
    return read;
}

module.exports = {flat, replacementFile, currentFile};
