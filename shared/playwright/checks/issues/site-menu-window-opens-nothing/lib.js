// Helpers of walk.js (issue report docs/issues/U08-A4-site-menu-window-opens-nothing.md).
// Requiring this file runs nothing. Every helper drives or reads the screens a person uses.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Collect the page's uncaught errors and console errors from now on (the developer console's view). */
function scriptErrors(page) {
    const errs = [];
    page.on('pageerror', (e) => errs.push(`pageerror: ${flat(e.message, 200)}`));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${flat(m.text(), 200)}`); });
    return errs;
}

/** A Navigation tab: the site's (`index`) or a context's. Opens it and waits for both tables. */
async function openNavigationTab(page, app, contextPath) {
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const tab = new NavigationTab(page, contextPath, {locale: 'en'});
    await tab.goto();
    await idle(page);
    return tab;
}

/** The open menu window, Vue (main) or legacy (3.5): the visible dialog holding a "Title" box named `title`. */
function menuWindow(page) {
    return page.locator('[role="dialog"]:visible').filter({has: page.locator('input[name="title"]')}).last();
}

/**
 * Press `link` once and read what follows within `waitMs`: whether the menu window
 * opened, what covers the page's middle, whether another control ("Add item") still
 * takes a press, and the script errors raised.
 */
async function pressAndRead(page, link, errs, {waitMs = 8_000, probe} = {}) {
    errs.splice(0);
    await link.click({timeout: T});
    const win = menuWindow(page);
    const opened = await win.waitFor({state: 'visible', timeout: waitMs}).then(() => true, () => false);
    if (opened) await idle(page);
    const cover = await page.evaluate(() => {
        const e = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        return e ? `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${String(e.className || '').split(/\s+/).slice(0, 3).join('.')}` : null;
    });
    let probePress = null;
    if (!opened && probe) {
        probePress = await probe.click({trial: true, timeout: 3_000}).then(() => 'takes a press', (e) => `refused: ${flat(e.message.split('\n').find((l) => /intercepts|not visible|not enabled|Timeout/.test(l)) || e.message, 200)}`);
    }
    return {opened, cover, probePress, scriptErrors: errs.splice(0)};
}

/** The open menu window as read: its heading, "Title" value, area choices and panels' text. */
async function readWindow(page) {
    const win = menuWindow(page);
    const area = win.locator('select[name="areaName"]');
    await sleep(500);
    return {
        heading: flat(await win.locator('h1, h2').first().textContent().catch(() => null), 120),
        title: await win.locator('input[name="title"]').inputValue().catch(() => null),
        areaLabel: flat(await win.getByText('Active Theme Navigation Areas').first().textContent().catch(() => null), 80),
        areaOptions: (await area.count()) ? await area.locator('option').evaluateAll((os) => os.map((o) => o.textContent.trim())) : null,
        text: flat(await win.innerText().catch(() => null), 900),
    };
}

/** Type a title in the open window and press its "Save"; returns the notices and the window's state after. */
async function saveWindow(page, title) {
    const win = menuWindow(page);
    await win.locator('input[name="title"]').fill(title);
    const notice = page.locator('.pkpNotification, [class*="otification"]').filter({hasText: /Navigation menu was successfully/}).first();
    const seen = notice.waitFor({state: 'visible', timeout: T}).then(async () => flat(await notice.textContent()), () => null);
    await win.getByRole('button', {name: 'Save', exact: true}).click();
    const said = await seen;
    await idle(page);
    return {notice: said, windowOpen: await menuWindow(page).isVisible()};
}

/** Close the open window unsaved: its "Cancel" (a button on main, a link on a legacy form). */
async function cancelWindow(page) {
    const win = menuWindow(page);
    const cancel = win.getByRole('button', {name: 'Cancel', exact: true}).or(win.getByRole('link', {name: 'Cancel', exact: true})).first();
    await cancel.click({timeout: 5_000}).catch(() => {});
    await win.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
    await sleep(600); // the modal store keeps a closed window's slot ~450 ms (patterns.md pitfall 4)
}

module.exports = {T, sleep, flat, scriptErrors, openNavigationTab, menuWindow, pressAndRead, readWindow, saveWindow, cancelWindow};
