// Helpers of walk.js (issue report docs/issues/U51-A13-A26-subscription-block-status-wrong.md).
// Requiring this file runs nothing. Every helper presses what a person presses or opens an address.
const {idle} = require('../../../probe');
const S = require('../purchase-on-active-subscription-removes-access/lib');
const B = require('../custom-block-delete-fails-postgresql/lib');

/** Settings › Website › "Appearance" › "Setup": tick the block whose "Sidebar" label is `label`, "Save". */
async function placeBlockInSidebar(page, app, label) {
    const boxes = await B.openSidebarList(app, page, app.contextPath);
    const box = boxes.find((b) => b.label === label) || boxes.find((b) => b.label.includes(label));
    if (!box) throw new Error(`no "${label}" under "Sidebar": ${JSON.stringify(boxes.map((b) => b.label))}`);
    return {box, saved: await B.placeInSidebar(page, [box.value])};
}

/** The "Subscription" block in the open page's sidebar: its lines (text and class). */
async function readBlock(page) {
    const {SubscriptionBlock} = require('../../../pages/SubscriptionsPages.js');
    const block = new SubscriptionBlock(page);
    if ((await block.root().count()) === 0) return null;
    return block.lines().evaluateAll((ps) => ps.map((p) => ({text: (p.innerText || '').replace(/\s+/g, ' ').trim(), cls: p.className || null})));
}

/** Open an address of the journal and read the block. */
async function blockOn(page, app, tail) {
    await page.goto(S.journalUrl(app, tail));
    await idle(page).catch(() => {});
    return {url: S.rel(page.url()), block: await readBlock(page)};
}

/**
 * Payments › "Individual Subscriptions" › the row holding `text` › "Edit": Status, dates, "Save".
 * `start` / `end` are typed only when given (YYYY-MM-DD).
 */
async function editSubscription(page, app, text, {status, start, end} = {}) {
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const tab = 'Individual Subscriptions';
    const pay = new PaymentsPage(page, app.contextPath);
    await pay.gotoTab(tab);
    const win = await pay.openEditSubscription(tab, text);
    if (status) await win.chooseStatus(status);
    if (start) await win.typeDate('dateStart', start);
    if (end) await win.typeDate('dateEnd', end);
    const r = await win.saveAccepted();
    return {save: r.status(), row: await S.managerRow(page, app, tab, text)};
}

module.exports = {...S, placeBlockInSidebar, readBlock, blockOn, editSubscription};
