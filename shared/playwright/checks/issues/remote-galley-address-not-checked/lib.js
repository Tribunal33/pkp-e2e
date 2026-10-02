// Helpers for walk.js (U46 A6). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/**
 * Press a legacy window's submit button and say what came of it, without
 * assuming the outcome: the saves sent (POSTs whose address matches
 * `saveRe`), the first one's status, whether the window is still open
 * after a settle, and the error texts shown in the form.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{button: import('@playwright/test').Locator, dialog: import('@playwright/test').Locator, form: import('@playwright/test').Locator, saveRe: RegExp}} at
 */
async function pressAndRead(page, {button, dialog, form, saveRe}) {
    const sent = [];
    const onRequest = (r) => {
        if (r.method() === 'POST' && saveRe.test(r.url())) sent.push(r);
    };
    page.on('request', onRequest);
    try {
        await button.click();
        // Either the window goes (a save the server took) or an error shows in it.
        const deadline = Date.now() + 10_000;
        while (Date.now() < deadline) {
            if ((await dialog.count()) === 0) break;
            if (await form.locator('label.error:visible, .error:visible, .pkp_form_error:visible, .notifyFormError:visible').count().catch(() => 0)) break;
            await sleep(250);
        }
        await sleep(800);
        await idle(page);
    } finally {
        page.off('request', onRequest);
    }
    let status = null;
    if (sent.length) {
        const resp = await sent[0].response().catch(() => null);
        status = resp ? resp.status() : null;
    }
    const open = (await dialog.count()) > 0;
    const errors = open
        ? [...new Set((await form.locator('label.error:visible, .error:visible, .pkp_form_error:visible, .notifyFormError:visible').allInnerTexts().catch(() => [])).map((s) => flat(s, 200)).filter(Boolean))]
        : [];
    return {sent: sent.length, status, windowOpen: open, errors};
}

/**
 * The item's own page as a reader: press its galley link reading `label`
 * and say where the browser landed (the main frame's navigation answers,
 * the address, the page title and the start of its text).
 */
async function pressLandingGalley(page, label) {
    const link = page.locator('a.obj_galley_link').filter({hasText: label}).first();
    if ((await link.count()) === 0) return {offered: false};
    const href = rel(await link.getAttribute('href'));
    const answers = [];
    const onResponse = (r) => {
        if (r.request().isNavigationRequest() && r.request().frame() === page.mainFrame()) answers.push(`${r.status()} ${rel(r.url())}`);
    };
    page.on('response', onResponse);
    await link.click();
    await page.waitForLoadState('load').catch(() => {});
    await sleep(1000);
    page.off('response', onResponse);
    return {
        offered: true,
        href,
        answers,
        url: page.url(),
        title: await page.title().catch(() => null),
        heading: flat(await page.locator('h1, .page h2').first().innerText().catch(() => null), 120),
        text: flat(await page.locator('body').innerText().catch(() => ''), 300),
    };
}

module.exports = {T, sleep, flat, rel, expect, pressAndRead, pressLandingGalley};
