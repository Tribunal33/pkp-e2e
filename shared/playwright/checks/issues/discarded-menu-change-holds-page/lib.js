// Helpers of walk.js (U08 A17, not reproduced 2026-10-03).
// Requiring this file runs nothing. Each helper drives or reads the screens a person uses and
// records what it saw rather than throwing, so a fix trial reads the state the fix brings.
// The menu window is the Vue window on `main` and the legacy form on 3.5; both are handled.
const {idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const VUE_EDITOR = '[data-cy="navigation-menu-editor"]';
const LEGACY_FORM = '#navigationMenuForm';

/**
 * The page's `beforeunload` listeners on `window`, read through the DevTools protocol:
 * how many, and the first words of each handler's source, so a read tells the menu
 * window's handler from the page's own. Diagnostic only; it changes nothing.
 */
async function unloadListeners(page) {
    try {
        const cdp = await page.context().newCDPSession(page);
        const {result} = await cdp.send('Runtime.evaluate', {expression: 'window'});
        const {listeners} = await cdp.send('DOMDebugger.getEventListeners', {objectId: result.objectId});
        const out = [];
        for (const l of listeners.filter((x) => x.type === 'beforeunload')) {
            let src = null;
            if (l.handler && l.handler.objectId) {
                const r = await cdp.send('Runtime.callFunctionOn', {
                    objectId: l.handler.objectId,
                    functionDeclaration: 'function(){ return String(this).slice(0, 160); }',
                    returnByValue: true,
                }).catch(() => null);
                src = r && r.result ? r.result.value : null;
            }
            out.push({line: l.lineNumber, column: l.columnNumber, source: flat(src, 160)});
        }
        await cdp.detach().catch(() => {});
        return {count: out.length, listeners: out};
    } catch (e) {
        return {error: flat(e.message, 200)};
    }
}

/** Which menu window is open now: 'vue', 'legacy' or null. */
async function openWindow(page) {
    if (await page.locator(`${VUE_EDITOR}:visible`).count()) return 'vue';
    if (await page.locator(`${LEGACY_FORM}:visible`).count()) return 'legacy';
    return null;
}

/** Press "Add Menu" until a menu window shows; returns which window it is. */
async function openAddMenu(page, link) {
    const either = page.locator(`${VUE_EDITOR}:visible, ${LEGACY_FORM}:visible`).first();
    for (let i = 0; i < 6; i++) {
        if (!(await either.isVisible())) await link.click({timeout: 5_000}).catch(() => {});
        if (await either.waitFor({state: 'visible', timeout: 5_000}).then(() => true, () => false)) break;
    }
    await idle(page).catch(() => {});
    await sleep(800); // the Vue window fetches its areas and items, then marks its first state
    return openWindow(page);
}

/** The open window's form root. */
function windowRoot(page) {
    return page.locator('[role="dialog"]:visible').filter({has: page.locator(`${VUE_EDITOR}, ${LEGACY_FORM}`)}).last();
}

/** Choose an area in "Active Theme Navigation Areas" (either window). */
async function chooseArea(page, area) {
    const sel = windowRoot(page).locator('select[name="areaName"]').first();
    await sel.selectOption({label: area});
    await sel.blur().catch(() => {});
    return sel.evaluate((s) => s.options[s.selectedIndex].text.trim());
}

/** Type a title into "Title" (either window). */
async function typeTitle(page, text) {
    const box = windowRoot(page).locator('input[name="title"]').first();
    await box.fill(text);
    await box.blur().catch(() => {});
    return box.inputValue();
}

/**
 * "Cancel", then the window's question answered "Yes" (the Vue window's "Warning")
 * or "OK" (the browser's box the older form opens). Returns what asked, and whether
 * the window closed.
 */
async function cancelAndDiscard(page, dialogs, {wait = 3_000} = {}) {
    const out = {};
    const before = dialogs.length;
    const root = windowRoot(page);
    await root.getByRole('button', {name: 'Cancel', exact: true}).or(root.getByRole('link', {name: 'Cancel', exact: true})).first()
        .click({timeout: 5_000}).catch((e) => { out.cancelError = flat(e.message, 160); });
    const warning = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible')
        .filter({hasText: 'The data on this form has changed. Do you wish to continue without saving?'}).last();
    if (await warning.waitFor({state: 'visible', timeout: 2_500}).then(() => true, () => false)) {
        out.asked = {kind: 'page', text: flat(await warning.innerText(), 300)};
        await warning.getByRole('button', {name: 'Yes', exact: true}).click().catch((e) => { out.yesError = flat(e.message, 160); });
        out.answered = 'Yes';
    } else if (dialogs.length > before) {
        out.asked = {kind: 'browser', ...dialogs[dialogs.length - 1]};
        out.answered = 'OK';
    } else {
        out.asked = null;
    }
    out.closed = await page.locator(`${VUE_EDITOR}:visible, ${LEGACY_FORM}:visible`).first()
        .waitFor({state: 'hidden', timeout: 10_000}).then(() => true, () => false);
    // A closed side window keeps its component about half a second (patterns.md, Probe kit):
    // a page-leave question read after this wait is the page's own.
    await sleep(wait);
    out.windowStillInPage = await page.locator(`${VUE_EDITOR}, ${LEGACY_FORM}`).count();
    return out;
}

/** The "Navigation" table's menu titles (nothing stored shows as an unchanged list). */
async function menuTitles(tab) {
    return tab.rowTitles('menus').catch((e) => `read failed: ${flat(e.message, 120)}`);
}

/**
 * Leave Settings › Website the way a manager does: the side menu's Settings › "Workflow".
 * Returns whether the browser asked before leaving (and with which words) and where the
 * page ended. The script's dialog listener accepts the question, so the move completes.
 */
async function leaveToWorkflow(page, dialogs) {
    const {EditorialChrome} = require('../../../pages/NavigationChromePages.js');
    const out = {};
    const before = dialogs.length;
    try {
        await new EditorialChrome(page).chooseSideEntry('Settings', 'Workflow');
        out.via = 'side menu Settings › Workflow';
    } catch (e) {
        // The older backend (3.5) names its side menu differently: its own "Workflow" link.
        await page.getByRole('link', {name: 'Workflow', exact: true}).first().click({timeout: 5_000})
            .then(() => { out.via = 'link "Workflow"'; })
            .catch((e2) => { out.error = `${flat(e.message, 120)} / ${flat(e2.message, 120)}`; });
    }
    await page.waitForURL(/settings\/workflow/, {timeout: 15_000}).catch(() => {});
    await sleep(500);
    const asked = dialogs.slice(before).filter((d) => d.type === 'beforeunload');
    out.leaveQuestion = asked.length > 0;
    out.dialogs = dialogs.slice(before);
    out.url = page.url().replace(/^https?:\/\/[^/]+/, '');
    return out;
}

module.exports = {sleep, flat, unloadListeners, openWindow, openAddMenu, chooseArea, typeTitle, cancelAndDiscard, menuTitles, leaveToWorkflow};
