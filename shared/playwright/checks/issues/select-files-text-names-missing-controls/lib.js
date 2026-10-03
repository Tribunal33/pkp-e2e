// Helpers of walk.js (U73 A19: the "Select Files" window's text names an "Include checkbox" and a
// "Search" it does not have; docs/issues/U73-A19-select-files-text-names-missing-controls.md).
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The "Select Files" window (the legacy side window holding form#manageProofFilesForm). */
const selectFilesWindow = (page) => page.getByRole('dialog').filter({has: page.locator('form#manageProofFilesForm')}).last();

/** A format's "Select Files", waiting for the window's list and its all-stages box. */
async function openSelectFiles(page, formats, format) {
    await formats.rowLink(formats.formatRow(format), 'Select Files').click();
    const win = selectFilesWindow(page);
    await win.locator('input[name="allStages"]').waitFor({state: 'visible', timeout: T});
    await win.locator('table').first().waitFor({state: 'attached', timeout: T});
    await idle(page);
    await sleep(500);
    return win;
}

/**
 * The window as data: its title, the text above the list, the list's heading, column heads and
 * rows (with each row's tick state), every check box with its label, every button and link, and
 * whether any control is called "Include" or "Search".
 */
async function readSelectFiles(page) {
    return await selectFilesWindow(page).evaluate((w) => {
        const vis = (e) => e.getClientRects().length > 0;
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const form = w.querySelector('form#manageProofFilesForm');
        const boxes = [...w.querySelectorAll('input[type=checkbox]')].filter(vis).map((b) => {
            const l = b.id ? w.querySelector(`label[for="${b.id}"]`) : null;
            return {name: b.name, label: t(l) || t(b.closest('label')) || null, checked: b.checked};
        });
        const controls = [...w.querySelectorAll('button, a, input[type=submit], input[type=button]')].filter(vis)
            .map((b) => t(b) || b.value || b.getAttribute('aria-label') || '').filter(Boolean);
        const named = (re) => [...w.querySelectorAll('button, a, input, label, th')].filter(vis)
            .map((e) => t(e) || e.value || '').filter((s) => re.test(s));
        return {
            title: t(w.querySelector('h1, h2')),
            text: t(form && form.querySelector(':scope > p')),
            listHeading: t(w.querySelector('h4')),
            columns: [...w.querySelectorAll('thead th')].filter(vis).map(t),
            rows: [...w.querySelectorAll('tbody tr')].filter(vis).map((tr) => {
                const cb = tr.querySelector('input[type=checkbox]');
                return t(tr).slice(0, 160) + (cb ? (cb.checked ? ' [x]' : ' [ ]') : '');
            }).filter((s) => s.trim()),
            boxes,
            controls,
            calledInclude: named(/\binclude\b/i),
            calledSearch: named(/\bsearch\b/i),
        };
    });
}

/**
 * Tick "Show files from all accessible workflow stages." and record what follows without any
 * other action: the list requests the box sends (address and status) in the next 4 seconds.
 */
async function tickAllStages(page) {
    const sent = [];
    const on = (r) => { if (/fetch-grid/.test(r.url())) sent.push({op: r.url().replace(/^.*\$\$\$call\$\$\$\//, '').replace(/\?.*$/, ''), status: r.status()}); };
    page.on('response', on);
    await selectFilesWindow(page).getByRole('checkbox', {name: 'Show files from all accessible workflow stages.'}).check();
    await sleep(4_000);
    await idle(page);
    page.off('response', on);
    return sent;
}

/** "Cancel" in the window. */
async function cancel(page) {
    const win = selectFilesWindow(page);
    await win.locator('a:visible, button:visible').filter({hasText: /^\s*Cancel\s*$/}).last().click();
    await win.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
}

module.exports = {T, flat, sleep, selectFilesWindow, openSelectFiles, readSelectFiles, tickAllStages, cancel};
