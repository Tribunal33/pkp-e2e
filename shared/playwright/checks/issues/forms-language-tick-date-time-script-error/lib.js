// Helpers for walk.js (U57 A5). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Collect the page's uncaught errors and console errors from now on (the developer console's view). */
function scriptErrors(page) {
    const errs = [];
    page.on('pageerror', (e) => errs.push(`pageerror: ${flat(e.message)}`));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${flat(m.text())}`); });
    return errs;
}

/** The notices at the top right now on screen. */
async function noticeText(page) {
    return (await page.locator('.pkpNotification').allInnerTexts().catch(() => [])).map((t) => flat(t));
}

/** "Website Languages": each row's "Forms" box, ticked or not. */
async function formsBoxes(tab) {
    const out = {};
    for (const code of await tab.website.codes()) {
        out[code] = await tab.website.cell(code, 'formLocale').isChecked().catch(() => null);
    }
    return out;
}

/**
 * Press "Setup" › "Date & Time" on the open Website page, then the form's
 * "French" button when there is one; read each choice group as shown: its
 * legend, its radios (value and label) and which one is chosen.
 */
async function dateTimeFrench(page) {
    const setup = page.locator('#setup-button').first();
    if ((await setup.getAttribute('aria-selected')) !== 'true') await setup.click();
    const side = page.locator('#dateTime-button:visible').first();
    await side.click();
    await expect(side).toHaveAttribute('aria-selected', 'true', {timeout: T});
    const panel = page.locator('#dateTime').first();
    await expect(panel.locator('form').first()).toBeVisible({timeout: T});
    const buttons = (await panel.locator('.pkpFormLocales button').allInnerTexts()).map((t) => flat(t));
    const french = panel.locator('.pkpFormLocales button').filter({hasText: 'French'}).first();
    let pressedFrench = false;
    if (await french.count()) {
        if ((await french.getAttribute('aria-pressed')) !== 'true') await french.click();
        pressedFrench = true;
        await sleep(800);
    }
    await idle(page).catch(() => {});
    const groups = await panel.locator('fieldset.pkpFormField--options').evaluateAll((fs) => fs
        .filter((f) => f.offsetParent !== null)
        .map((f) => {
            const radios = [...f.querySelectorAll('input[type="radio"]')];
            return {
                legend: (f.querySelector('legend') || {innerText: ''}).innerText.replace(/\s+/g, ' ').trim(),
                name: radios[0] ? radios[0].name : null,
                radios: radios.length,
                choices: [...f.querySelectorAll('label.pkpFormField--options__option')].map((l) => l.innerText.replace(/\s+/g, ' ').trim()),
                checked: radios.findIndex((r) => r.checked),
            };
        }));
    return {languageButtons: buttons, pressedFrench, groups};
}

/** "Save" on the open "Date & Time" form: the answer, and the languages each format was sent in. */
async function saveDateTime(page) {
    const panel = page.locator('#dateTime').first();
    const answered = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/v1\/contexts\/\d+/.test(r.url()), {timeout: T});
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answered;
    const body = new URLSearchParams(r.request().postData() || '');
    const sent = {};
    for (const k of body.keys()) {
        const m = /^(\w+)\[(\w+)\]$/.exec(k);
        if (m) (sent[m[1]] = sent[m[1]] || []).push(m[2]);
    }
    await idle(page).catch(() => {});
    return {status: r.status(), sent};
}

module.exports = {T, sleep, flat, scriptErrors, noticeText, formsBoxes, dateTimeFrench, saveDateTime};
