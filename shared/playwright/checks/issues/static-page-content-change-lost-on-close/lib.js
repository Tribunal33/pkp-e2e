// Helpers for the U09 A19 walk (static-page-content-change-lost-on-close).
// Plugin switching and the custom block window come from the sibling libs.
// Requiring this file runs nothing.
const {idle} = require('../../../probe');
const L = require('../setup-save-refused-disabled-block/lib');

const {T, sleep, flat} = L;

/** What a rich-text box's editor holds, as plain text. */
async function editorText(page, textarea) {
    const id = await textarea.getAttribute('id', {timeout: T});
    return page.evaluate((x) => window.tinymce.get(x).getContent({format: 'text'}).trim(), id);
}

/**
 * Press a window's close control (the back arrow). Returns whether the
 * browser asked its question and its words, and whether the window closed.
 * `answer` 'cancel' keeps the window ("Cancel"), 'ok' leaves it ("OK").
 */
async function closeWindow(page, closeButton, form, {answer = 'ok'} = {}) {
    let asked = null;
    const handler = async (d) => { asked = d.message(); if (answer === 'ok') await d.accept(); else await d.dismiss(); };
    page.on('dialog', handler);
    await closeButton.click();
    await Promise.race([
        form.waitFor({state: 'hidden', timeout: 5000}).catch(() => {}),
        (async () => { for (let i = 0; i < 50 && asked === null; i++) await sleep(100); })(),
    ]);
    await sleep(500);
    page.off('dialog', handler);
    return {asked, closed: !(await form.isVisible().catch(() => false))};
}

/**
 * Go to another address with the window open. Returns whether the browser
 * asked "Leave site?" (a beforeunload question, answered "Leave").
 */
async function leavePage(page, url) {
    let asked = null;
    const handler = async (d) => { asked = d.type(); await d.accept(); };
    page.on('dialog', handler);
    await page.goto(url, {timeout: T}).catch(() => {});
    await sleep(500);
    page.off('dialog', handler);
    return {asked};
}

/**
 * Press the shaded page beside the open side windows (left of them, half way
 * down). Returns what the pointer met there, whether the browser asked its
 * question and its words, and whether the window holding `form` closed.
 */
async function pressBeside(page, form, {answer = 'ok'} = {}) {
    const point = await page.evaluate(() => {
        const cls = (e) => String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className);
        const name = (e) => (e ? `${e.tagName.toLowerCase()}.${cls(e).replace(/\s+/g, '.').slice(0, 60)}` : null);
        const y = Math.round(window.innerHeight / 2);
        for (let x = 8; x < window.innerWidth / 2; x += 8) {
            const top = document.elementFromPoint(x, y);
            if (top && /DialogOverlay/.test(cls(top))) return {x, y, met: name(top), shade: true};
        }
        return {x: 12, y, met: name(document.elementFromPoint(12, y)), shade: false};
    });
    let asked = null;
    const handler = async (d) => { asked = d.message(); if (answer === 'ok') await d.accept(); else await d.dismiss(); };
    page.on('dialog', handler);
    await page.mouse.click(point.x, point.y);
    await Promise.race([
        form.waitFor({state: 'hidden', timeout: 5000}).catch(() => {}),
        (async () => { for (let i = 0; i < 50 && asked === null; i++) await sleep(100); })(),
    ]);
    await sleep(500);
    page.off('dialog', handler);
    return {met: point.met, shade: point.shade, asked, closed: !(await form.isVisible().catch(() => false))};
}

/**
 * Leave the page by `action` (a reload, another address, a link) with a side
 * window open. Returns every question the browser asked on the way (a
 * page-leave question is type `beforeunload`; each is answered "Leave" or
 * "OK"), whether a new page loaded, and the address afterwards.
 */
async function leaveBy(page, action) {
    const asked = [];
    const handler = (d) => { asked.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); };
    page.on('dialog', handler);
    await page.evaluate(() => { window.__u09a19 = true; }).catch(() => {});
    let did = null;
    try { did = (await action()) || null; } catch (e) { did = {error: flat(String(e.message || e).split('\n')[0], 160)}; }
    await sleep(2500);
    await idle(page).catch(() => {});
    page.off('dialog', handler);
    const same = await page.evaluate(() => window.__u09a19 === true).catch(() => null);
    return {asked: asked.length ? asked : null, newPageLoaded: same === false, url: page.url().replace(/^https?:\/\/[^/]+/, ''), did};
}

/**
 * In a side window (`root`), press the top bar's button of the signed-in user
 * (named by the username), then the menu's link to the Profile page. Returns
 * the link's words, or what the window's top offered when there was none.
 */
async function pressEditProfile(page, root, username) {
    const link = () => page.locator('a[href*="/user/profile"]:visible').last();
    let menuButton = null;
    if (!(await link().isVisible().catch(() => false))) {
        const button = root.getByRole('button', {name: username}).first();
        menuButton = await button.isVisible().catch(() => false);
        if (menuButton) { await button.click(); await sleep(600); }
    }
    if (!(await link().isVisible().catch(() => false))) {
        const buttons = await root.getByRole('button').evaluateAll((els) => els.slice(0, 15).map((e) => (e.getAttribute('aria-label') || e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40)));
        return {pressed: null, menuButton, buttons};
    }
    const pressed = flat(await link().innerText(), 60);
    await link().click();
    return {pressed, menuButton};
}

module.exports = {...L, editorText, closeWindow, leavePage, pressBeside, leaveBy, pressEditProfile, T, sleep, flat};
