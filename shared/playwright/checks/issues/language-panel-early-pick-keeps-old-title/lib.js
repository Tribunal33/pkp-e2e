// Helpers for walk.js (U40 A15). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The dataset submission each app's walk uses (unpublished, one version, no French title). */
const SUBMISSIONS = {
    ojs: {id: 4, title: 'Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice'},
    omp: {id: 3, title: 'The Political Economy of Workplace Injury in Canada'},
    ops: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'},
};

/** Open a submission's workflow by address (the dashboard's "View") and its side menu's "Title & Abstract". */
async function openTitleAbstract(page, app, id) {
    const locale = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en';
    await page.goto(app.url(`/index.php/${app.contextPath}${locale}/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page);
    const entry = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
    await entry.waitFor({state: 'attached', timeout: T}).catch(() => {});
    if (!(await entry.isVisible().catch(() => false))) {
        await page.getByRole('link', {name: /^(Publication|Preprint)$/}).first().click();
    }
    await entry.click();
    await page.getByText('Current Submission Language:', {exact: false}).first().waitFor({state: 'visible', timeout: T});
    await idle(page);
}

/** The "Current Submission Language: …" line's text on the page behind (null when absent). */
async function readout(page) {
    const line = page.getByText('Current Submission Language:', {exact: false}).first();
    if (!(await line.isVisible().catch(() => false))) return null;
    return flat(await line.locator('xpath=..').innerText(), 200);
}

/** The "Change Submission Language For" side panel. */
const panel = (page) => page.getByRole('dialog', {name: /Change Submission Language/i});

/**
 * DevTools-style network throttling through the Chrome DevTools protocol, the
 * same call DevTools' throttling menu makes: `kbitDown`/`kbitUp` as in a custom
 * profile, or null for "No throttling".
 */
async function throttle(cdp, profile) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', profile
        ? {offline: false, latency: profile.latency || 0, downloadThroughput: (profile.kbitDown * 1000) / 8, uploadThroughput: (profile.kbitUp * 1000) / 8}
        : {offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1});
}

/**
 * What the open panel holds now: the line under its heading (the dialog's
 * description), each TinyMCE editor inside it (id, initialized, content), the
 * picked language, and the dialog's text (descriptions, errors).
 */
async function panelState(page) {
    return page.evaluate(() => {
        const dialog = [...document.querySelectorAll('[role="dialog"]')].find((d) => /Change Submission Language/i.test((document.getElementById(d.getAttribute('aria-labelledby')) || {}).textContent || ''));
        if (!dialog) return {open: false};
        const descId = dialog.getAttribute('aria-describedby');
        const desc = descId ? document.getElementById(descId) : null;
        const editors = (window.tinymce?.get() || [])
            .filter((e) => dialog.contains(e.getElement()))
            .map((e) => ({id: e.id, initialized: !!e.initialized, content: e.initialized ? e.getContent() : null}));
        const picked = dialog.querySelector('input[type="radio"]:checked');
        const pickedLabel = picked ? (picked.closest('label') || {}).textContent : null;
        return {
            open: true,
            subtitle: desc ? desc.textContent.replace(/\s+/g, ' ').trim() : null,
            picked: pickedLabel ? pickedLabel.replace(/\s+/g, ' ').trim() : picked && picked.value,
            radios: dialog.querySelectorAll('input[type="radio"]').length,
            editors,
            text: dialog.innerText.replace(/\s+/g, ' ').trim().slice(0, 2500),
        };
    });
}

/** Type `text` into the panel's TinyMCE editor `id` from the keyboard. */
async function typeInto(page, id, text) {
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type(text);
}

/**
 * On the open Title & Abstract form: press the language bar's button for `label`, type the
 * other language's title (and abstract, where the form has one) and "Save". Returns what was typed
 * and whether "Saved" showed.
 */
async function saveOtherLanguage(page, label, locale, {title, abstract}) {
    const save = page.getByRole('button', {name: 'Save', exact: true}).last();
    const form = page.locator('form').filter({has: save}).last();
    await form.getByRole('button', {name: label, exact: true}).click();
    const ids = await page.waitForFunction((loc) => {
        const eds = (window.tinymce?.get() || []).filter((e) => new RegExp(`-(title|abstract)-control-${loc}$`).test(e.id) && e.getElement().isConnected);
        return eds.length && eds.every((e) => e.initialized) ? eds.map((e) => e.id) : null;
    }, locale, {timeout: T}).then((h) => h.jsonValue()).catch(() => []);
    const typed = {};
    for (const id of ids) {
        const text = /-abstract-/.test(id) ? abstract : title;
        await typeInto(page, id, text);
        typed[id] = text;
    }
    await save.click();
    const saved = await form.locator('.pkpFormPage__status', {hasText: 'Saved'}).waitFor({state: 'visible', timeout: T}).then(() => true).catch(() => false);
    await idle(page);
    return {typed, saved};
}

module.exports = {T, flat, SUBMISSIONS, openTitleAbstract, readout, panel, throttle, panelState, typeInto, saveOtherLanguage};
