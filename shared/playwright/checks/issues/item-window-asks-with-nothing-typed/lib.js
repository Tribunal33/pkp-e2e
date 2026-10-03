// Helpers of the U08 A18 walks (the navigation item window's question on closing):
// item-window-asks-with-nothing-typed/walk.js and item-window-refused-save-closes-unasked/walk.js.
// Requiring this file runs nothing. Each helper drives or reads the screens a person uses and
// records what it saw rather than throwing, so a fix trial reads the state the fix brings.
const {idle, screen} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** A person's pause between two actions: PACE_MS (0 unless set; the paced walk runs with 4000). */
const pause = () => sleep(Number(process.env.PACE_MS || 0));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * One dialog listener for the page: records every browser dialog with the step it came in, and
 * answers a `confirm()` as `answers.next` says ('accept' by default, reset after each use); a
 * page-leave question is always accepted, so the move completes (patterns.md "Probe kit").
 */
function watchDialogs(page) {
    const state = {dialogs: [], step: null, next: 'accept'};
    page.on('dialog', async (d) => {
        const answer = d.type() === 'beforeunload' ? 'accept' : state.next;
        state.dialogs.push({step: state.step, type: d.type(), message: d.message(), answer});
        state.next = 'accept';
        if (answer === 'accept') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    return state;
}

/** Whether the item window's form is on screen. */
async function windowOpen(page) {
    return page.locator('[role="dialog"]:visible form#navigationMenuItemsForm').count().then((n) => n > 0, () => false);
}

/**
 * Press the item window's back arrow ("Close"), the browser's box (if any) answered `answer`.
 * Returns whether a box asked (and its words) and whether the window closed.
 */
async function backArrow(page, dw, step, {answer = 'accept'} = {}) {
    const out = {step};
    dw.step = step;
    dw.next = answer;
    const before = dw.dialogs.length;
    const close = page.locator('[role="dialog"]:visible').filter({has: page.locator('form#navigationMenuItemsForm')}).first()
        .getByRole('button', {name: 'Close', exact: true});
    await close.click({timeout: 10_000}).catch((e) => { out.clickError = flat(e.message, 200); });
    await page.locator('[role="dialog"]:visible form#navigationMenuItemsForm').first()
        .waitFor({state: 'hidden', timeout: 3_000}).catch(() => {});
    await sleep(500);
    const asked = dw.dialogs.slice(before).filter((d) => d.type === 'confirm');
    out.asked = asked.length ? asked.map((d) => ({message: d.message, answer: d.answer})) : null;
    out.windowOpen = await windowOpen(page);
    dw.next = 'accept';
    return out;
}

/** Wait until no item window is left in the page (a closed side window keeps its form about half a second). */
async function settleClosed(page) {
    await sleep(2_500);
    return page.locator('form#navigationMenuItemsForm').count().catch(() => -1);
}

/**
 * Leave Settings › Website the way a manager can while a side window covers the page: type the
 * address of Settings › "Workflow" (`/index.php/<context>/management/settings/workflow`) into the
 * address bar. With no window open the side menu would do the same; the open window covers it.
 * Returns whether the browser asked before leaving and where the page ended.
 */
async function leaveToWorkflow(page, dw, step) {
    const out = {step, via: 'typed address of Settings › Workflow'};
    dw.step = step;
    const before = dw.dialogs.length;
    const target = page.url().replace(/management\/settings\/website.*$/, 'management/settings/workflow');
    await page.goto(target, {timeout: 20_000}).catch((e) => { out.error = flat(e.message, 200); });
    await page.waitForURL(/settings\/workflow/, {timeout: 15_000}).catch(() => {});
    await sleep(800);
    const asked = dw.dialogs.slice(before).filter((d) => d.type === 'beforeunload');
    out.leaveQuestion = asked.length > 0;
    out.url = page.url().replace(/^https?:\/\/[^/]+/, '');
    return out;
}

/** Settings › Website › "Setup" › "Navigation", landed. */
async function openNavigation(page, contextPath) {
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const tab = new NavigationTab(page, contextPath);
    await tab.goto();
    await idle(page);
    return tab;
}

/** What the open item window shows: its type, title, path, and whether the query box is offered. */
async function windowRead(page) {
    const w = page.locator('[role="dialog"]:visible').filter({has: page.locator('form#navigationMenuItemsForm')}).first();
    if (!(await w.count())) return {open: false};
    return w.evaluate((root) => {
        const vis = (e) => !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const sel = root.querySelector('select[name="menuItemType"]');
        const title = root.querySelector('input[name="title[en]"], input[name="title[en_US]"]');
        const path = root.querySelector('input[name="path"]');
        const q = root.querySelector('.NMI_QUERY_PARAMS');
        return {
            open: true,
            type: sel ? sel.options[sel.selectedIndex]?.text.trim() : null,
            title: title ? title.value : null,
            path: path && vis(path) ? path.value : null,
            pathShown: vis(path),
            queryBoxShown: vis(q),
        };
    }).catch((e) => ({error: flat(e.message, 200)}));
}

/** Press "Save" in the item window; returns the save's answer and the notices it brought. */
async function saveItem(page, win) {
    await screen(page); // drop earlier notices
    let answer;
    try {
        const r = await win.save();
        answer = {status: r.status, body: r.body ? {status: r.body.status, content: flat(r.body.content, 80)} : null};
    } catch (e) { answer = {error: flat(e.message, 200)}; }
    await sleep(1_500);
    const s = await screen(page);
    return {answer, notices: s.notices, windowOpen: await windowOpen(page)};
}

module.exports = {sleep, pause, flat, watchDialogs, windowOpen, backArrow, settleClosed, leaveToWorkflow, openNavigation, windowRead, saveItem};
