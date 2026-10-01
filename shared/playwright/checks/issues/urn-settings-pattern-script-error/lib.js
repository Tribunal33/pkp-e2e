// Shared helpers for walk.js and neighbour.js (docs/issues/U44-A11-urn-settings-pattern-script-error.md).
// The URN settings window itself is opened and saved with ../urn-suffix-pattern-refusal-text-code/lib.js.
const W = require('../urn-suffix-pattern-refusal-text-code/lib');

/** Collect the page's uncaught script errors, with the first stack line (file and line). */
function watchErrors(page) {
    const all = [];
    page.on('pageerror', (e) => all.push({message: String(e.message || e).slice(0, 200), at: String(e.stack || '').split('\n').slice(1, 2).join('').trim().slice(0, 200)}));
    let seen = 0;
    return {
        all,
        /** The errors raised since the last call. */
        since() { const out = all.slice(seen); seen = all.length; return out; },
    };
}

/** Each pattern box of the window: whether it can be typed in. */
async function boxStates(page, app) {
    const f = W.form(page);
    const out = {};
    for (const k of W.KINDS[app.name]) out[k.label] = (await f.locator(`input[name="${k.box}"]`).isEnabled().catch(() => null)) ? 'open' : 'grey';
    return out;
}

/** Click one control of the window (a kind box, "Check Number" or a suffix choice), then read errors and boxes. */
async function press(page, app, errs, what, locator) {
    errs.since();
    await locator.click();
    await W.sleep(300);
    return {what, checked: await locator.isChecked().catch(() => null), errors: errs.since(), boxes: await boxStates(page, app)};
}

const kindBox = (page, k) => W.form(page).locator(`input[type=checkbox][name="${k.enable}"]`);
const choice = (page, value) => W.form(page).locator(`input[type=radio][name="urnSuffix"][value="${value}"]`);
const checkNo = (page) => W.form(page).locator('input[type=checkbox][name="urnCheckNo"]');

module.exports = {...W, watchErrors, boxStates, press, kindBox, choice, checkNo};
