// Helpers of walk.js here (issue report docs/issues/U48-A1-jats-make-available-offered-then-refused.md)
// and of ../body-text-save-offered-then-refused/walk.js. Requiring this file runs nothing. Each helper
// presses what a person presses and records what the screen shows; a control the page does not offer
// is recorded as such, never forced.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The "Error" window, if one opens within `ms`: its text, then "OK" pressed. */
async function errorWindow(page, ms = 8_000) {
    const dialog = page.getByRole('dialog', {name: 'Error', exact: true});
    try {
        await dialog.waitFor({state: 'visible', timeout: ms});
    } catch (e) {
        return null;
    }
    const text = flat(await dialog.innerText());
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await dialog.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await sleep(600);
    return text;
}

/** Wait for a response matching `test` while `press` runs: {status, method, override, body} or null. */
async function pressAndAnswer(page, test, press, timeout = 20_000) {
    const answered = page.waitForResponse(test, {timeout}).catch(() => null);
    await press();
    const r = await answered;
    if (!r) return null;
    let body = null;
    try {
        body = flat(await r.text(), 300);
    } catch (e) {
        // no body
    }
    return {status: r.status(), method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null, body};
}

/** Side menu › the version › `label` ("JATS XML", "Body Text"): heading read, or the reason it was not reached. */
async function openPage(frame, label) {
    try {
        await frame.selectPage(label);
        return {reached: true};
    } catch (e) {
        return {reached: false, error: flat(String(e), 300)};
    }
}

/**
 * The "Make available with publication" box as the screen shows it: whether it is there, greyed,
 * ticked for assistive technology (the input) and ticked as drawn (the icon, which follows the
 * component's saved state).
 */
async function boxState(jats) {
    const box = jats.makePublicBox();
    if (!(await box.count())) return {present: false};
    const drawnTicked = await jats
        .makePublicLabel()
        .locator('xpath=ancestor-or-self::label[1]')
        .locator('svg path')
        .first()
        .getAttribute('d')
        .then((d) => (d || '').startsWith('M18.75'))
        .catch(() => null);
    return {present: true, disabled: await box.isDisabled(), checked: await box.isChecked(), drawnTicked};
}

module.exports = {sleep, flat, errorWindow, pressAndAnswer, openPage, boxState};
