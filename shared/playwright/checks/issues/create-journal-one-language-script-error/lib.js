// Helpers for walk.js (U57 A7). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per-app screen words. */
const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

/** Collect the page's uncaught errors and console errors from now on (the developer console's view). */
function scriptErrors(page) {
    const errs = [];
    page.on('pageerror', (e) => errs.push(`pageerror: ${flat(e.message, 160)}`));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${flat(m.text(), 160)}`); });
    return errs;
}

/**
 * Site Settings › "Site Setup" › "Languages" (open): set a row's "Enable" box,
 * answering "OK" when the site asks; returns what the list then shows.
 */
async function setEnabled(site, code, on) {
    const box = site.enableBox(code);
    let asked = null;
    if ((await box.isChecked()) !== on) {
        const answered = site.page.waitForResponse((r) => r.request().method() === 'POST' && /admin-language-grid\//.test(r.url()), {timeout: T}).catch(() => null);
        await box.click();
        const q = site.page.getByRole('dialog').last();
        if (await q.isVisible().catch(() => false)) {
            asked = flat(await q.innerText());
            await site.answer((await q.getByRole('heading').first().innerText().catch(() => 'Disable')).trim(), 'OK');
        } else {
            await answered;
        }
        await idle(site.page).catch(() => {});
    }
    await site.reload();
    return {asked, enabled: await site.enableBox(code).isChecked()};
}

/** Type into a box key by key, as a person does, then leave it. */
async function keyIn(box, text) {
    await box.click();
    await box.pressSequentially(text, {delay: 20});
    await box.blur();
}

/**
 * Fill each field of the create window, one field at a time, counting the
 * script errors each one gives. `typed` types the text boxes key by key (a
 * person typing); otherwise each box takes its whole value at once (a paste).
 */
async function fillCounting(win, errs, {name, initials, path, email}, {typed = false} = {}) {
    const out = [];
    const put = typed ? keyIn : (box, text) => win.type(box, text);
    const step = async (label, fn, chars = null) => {
        errs.splice(0);
        await fn();
        await sleep(400);
        out.push({field: label, chars, scriptErrors: errs.splice(0)});
    };
    await step('title', () => put(win.title('en'), name), name.length);
    await step('initials', () => put(win.initials('en'), initials), initials.length);
    await step('contact name', () => put(win.contactName, 'u57u3 Contact'), 'u57u3 Contact'.length);
    await step('contact email', () => put(win.contactEmail, email), email.length);
    await step('country', () => win.country.selectOption({label: 'Canada'}));
    await step('path', () => put(win.path, path), path.length);
    if (await win.languageBox('en').count()) {
        await step('Languages: English', () => win.setBox(win.languageBox('en'), true));
        await step('Primary locale: English', () => win.setBox(win.primaryChoice('en'), true));
    }
    return out.map((o) => ({field: o.field, chars: o.chars, errors: o.scriptErrors.length, first: o.scriptErrors[0] ? o.scriptErrors[0].slice(0, 90) : null}));
}

/**
 * On the two-language window: "Languages" English only, "Primary locale"
 * French, "Save": the reason under "Primary locale"; then French ticked
 * under "Languages": whether the reason goes.
 */
async function primaryNotInLanguages(win, errs) {
    errs.splice(0);
    await win.setBox(win.languageBox('en'), true);
    if (await win.languageBox('fr_CA').isChecked()) await win.setBox(win.languageBox('fr_CA'), false);
    await win.setBox(win.primaryChoice('fr_CA'), true);
    const r = await win.pressSave();
    await expect(win.error('primaryLocale')).toBeVisible({timeout: T}).catch(() => {});
    const afterSave = {status: r.status(), errors: await win.errorMap()};
    await win.setBox(win.languageBox('fr_CA'), true);
    await sleep(800);
    const afterTick = {errors: await win.errorMap(), primaryReasonShown: await win.error('primaryLocale').isVisible()};
    return {afterSave, afterTick, scriptErrors: errs.splice(0)};
}

module.exports = {T, sleep, flat, WORDS, scriptErrors, setEnabled, fillCounting, primaryNotInLanguages};
