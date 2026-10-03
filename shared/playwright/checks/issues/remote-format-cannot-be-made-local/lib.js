// Helpers for walk.js (U73 A4) {OMP, OJS control}: a publication format's row and its "Edit"
// tab's remote box, read without assuming the outcome. Requiring this file runs nothing; the
// format pages come from the U74 A11/A18/A19 walk's lib (book 4 of PKP's default test dataset),
// the galley list from the U46 A1/A3 walks' lib.
const {idle} = require('../../../probe');
const F = require('../native-import-loses-trade-details/lib');
const G = require('../remote-galley-asked-for-file/lib');

const {flat, BOOK, openFormats} = F;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The address box inside the remote box's group, whatever its name (`remoteURL`, or `urlRemote` once renamed). */
const addressBox = (form) => form.locator('#remote input').first();

/** A format's row as the list shows it: name a link (and where to), the line under it, its links. */
async function readRow(pf, name) {
    const row = pf.formatRow(name);
    if (!(await row.count())) return {present: false};
    const link = pf.remoteLink(name);
    const body = pf.formatBody(name);
    return {
        present: true,
        nameIsLink: (await link.count()) > 0,
        href: (await link.count()) ? await link.first().getAttribute('href') : null,
        lineUnder: flat(await pf.lineUnder(name).innerText().catch(() => null), 200),
        links: [...new Set((await body.locator('a').allInnerTexts().catch(() => [])).map((s) => flat(s, 60)).filter(Boolean))],
    };
}

/** The "Edit" tab's remote box, the address box (value, shown) and "URL Path" (shown). */
async function readRemote(win) {
    const form = win.form();
    return {
        ticked: await win.remoteBox().isChecked().catch(() => null),
        addressName: await addressBox(form).getAttribute('name').catch(() => null),
        address: await addressBox(form).inputValue().catch(() => null),
        addressShown: await addressBox(form).isVisible().catch(() => null),
        urlPathShown: await win.urlPathBox().isVisible().catch(() => null),
    };
}

/** Untick (or tick) the remote box and let the form's show/hide finish. */
async function setRemote(win, want) {
    if (want) await win.remoteBox().check();
    else await win.remoteBox().uncheck();
    await sleep(400);
}

/** "OK", and the list redrawn. */
async function ok(page, win) {
    await win.ok();
    await idle(page).catch(() => {});
}

module.exports = {flat, sleep, BOOK, openFormats, addressBox, readRow, readRemote, setRemote, ok, openGalleys: G.openGalleys};
