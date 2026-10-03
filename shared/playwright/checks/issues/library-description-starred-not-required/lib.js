// Helpers of the U39 A3 walk (the libraries' "Description" starred, yet saved empty):
// library-description-starred-not-required/walk.js. Requiring this file runs nothing. The library
// openers and readers are the A11 walk's (../library-add-file-refused-closes-unasked/lib.js); these
// add the label read and an "OK" that records what follows rather than throwing.
const {expect} = require('@playwright/test');
const A11 = require('../library-add-file-refused-closes-unasked/lib.js');

/**
 * The open "Add a file" or "Edit" window's field labels as drawn (star included), whether each
 * carries the required-field star, whether its box carries the browser's `required`, the boxes'
 * values, and the note under the fields.
 */
async function formRead(page) {
    return page.evaluate(() => {
        const vis = (e) => !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const txt = (e) => (e ? (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim() : null);
        const form = [...document.querySelectorAll('form')].filter((f) => f.querySelector('input[name^="libraryFileName"]') && vis(f)).pop();
        if (!form) return {windowOpen: false};
        const fields = {};
        for (const id of ['name', 'type', 'description', 'file']) {
            const fs = form.querySelector(`fieldset#${id}`);
            const label = fs && fs.querySelector('.section > label');
            const box = fs && fs.querySelector('input:not([type=hidden]):not([type=file]), select, textarea');
            fields[id] = {label: txt(label), starred: !!label && /\*\s*$/.test(txt(label)),
                boxRequired: !!box && box.hasAttribute('required'), value: box ? box.value : null};
        }
        const note = [...form.querySelectorAll('.formRequired')].map(txt).filter(Boolean);
        return {windowOpen: true, fields, note,
            fieldRefusals: [...form.querySelectorAll('label.error')].filter(vis).map(txt)};
    });
}

/**
 * Press "OK" and record what follows: whether the window closed within ten seconds, and when it
 * stayed, its refusals and boxes; the save's answer (`watchSaves`) and the page notices seen.
 */
async function okRead(page, win, net, step, {screen} = {}) {
    if (screen) await screen(page); // drop earlier notices
    net.step = step;
    const from = net.calls.length;
    const out = {};
    await win.okButton().click({timeout: 10_000}).catch((e) => { out.clickError = A11.flat(e.message, 200); });
    out.closed = await expect(page.getByRole('dialog', {name: win.title, exact: true})).toHaveCount(0, {timeout: 10_000})
        .then(() => true, () => false);
    if (out.closed) {
        const {markClosed} = require('../../../pages/LibraryPages.js');
        await markClosed(page).catch(() => {});
    } else {
        await A11.sleep(500);
        out.form = await formRead(page).catch((e) => ({error: A11.flat(e.message, 200)}));
    }
    if (screen) out.notices = (await screen(page).catch(() => ({notices: null}))).notices;
    await A11.sleep(300); // the save's body is read after its answer lands
    // the call objects themselves: a body still being read is in them when the facts are written
    out.saves = net.calls.slice(from).filter((c) => c.kind === 'save');
    return out;
}

module.exports = {...A11, formRead, okRead};
