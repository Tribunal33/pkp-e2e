// Helpers of the U51 subscription-window walks (issue reports
// docs/issues/U51-A28-refused-form-date-box-shows-today.md,
// U51-A4-subscription-email-refusal-names-setup.md,
// U51-A21-subscription-end-before-start-saved.md): walk.js here,
// ../subscription-email-refusal-names-setup/walk.js and
// ../subscription-end-before-start-saved/walk.js. Requiring this file runs nothing. Every
// helper presses what a person presses, or reads what the screen shows, on OJS (the one app
// with subscriptions). The page-level helpers (type, galley, access, issue) are the
// purchase walks' (../purchase-on-active-subscription-removes-access/lib.js).
const {idle, sql} = require('../../../probe');
const P = require('../purchase-on-active-subscription-removes-access/lib');

const {T, flat, sleep} = P;
const TYPE = 'u51sb7 Online Year';
const pages = () => require('../../../pages/SubscriptionsPages.js');

/** A date as YYYY-MM-DD, `days` from today and `years` on (UTC, the test installs' time zone). */
function dayFrom({days = 0, months = 0, years = 0} = {}) {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() + years, d.getUTCMonth() + months, d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/** The dataset user's id (to find their round button in "Locate a User"). */
function userId(app, username) {
    return Number(String(sql(app, `select user_id from users where username = '${username}'`)).trim());
}

/** "Payments" › "Subscription Types" › "Create New Subscription Type": the walks' type, 10 USD, Online, 12 months, Individual. */
function createType(page, app) {
    return P.createType(page, app, {name: TYPE, cost: '10'});
}

/** "Payments" › a subscriptions tab › "Create New Subscription": the window. */
async function openCreate(page, app, tab = 'Individual Subscriptions') {
    const {PaymentsPage} = pages();
    const pay = new PaymentsPage(page, app.contextPath);
    await pay.gotoTab(tab);
    return pay.openCreateSubscription(tab);
}

/** A subscriptions tab › the row's "Edit": the window. */
async function openEdit(page, app, text, tab = 'Individual Subscriptions') {
    const {PaymentsPage} = pages();
    const pay = new PaymentsPage(page, app.contextPath);
    await pay.gotoTab(tab);
    return pay.openEditSubscription(tab, text);
}

/**
 * Type a date into a date box as a person does: click it, select all, Delete, the date key by
 * key, Tab. Returns what the box then shows and what the form will send (the hidden field
 * named after the box, lib/pkp textInput.tpl).
 */
async function typeDate(page, win, which, value) {
    const box = win.dateBox(which);
    await box.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    await box.pressSequentially(value, {delay: 40});
    await page.keyboard.press('Tab');
    await sleep(200);
    return {typed: value, ...(await readDate(win, which))};
}

/** A date box: what it shows and what the form sends. */
async function readDate(win, which) {
    return {
        shows: await win.dateBox(which).inputValue().catch(() => null),
        sends: await win.dialog.locator(`input[type="hidden"][name="${which}"]`).inputValue().catch(() => null),
    };
}

/** The window as the person sees it: the error box at its top, the field messages, the two dates. */
async function readWindow(win) {
    const open = (await win.dialog.count()) > 0;
    if (!open) return {open};
    // The refusal's box at the window's top ("Errors occurred processing this form" and its list).
    const text = (await win.dialog.innerText().catch(() => '')) || '';
    const at = text.indexOf('Errors occurred processing this form');
    const errorBox = at < 0 ? null : flat(text.slice(at, text.indexOf('Locate a User', at) > at ? text.indexOf('Locate a User', at) : at + 600), 600);
    return {
        open,
        errorBox,
        fieldErrors: (await win.fieldErrors().allInnerTexts().catch(() => [])).map((t) => flat(t, 200)),
        user: await win.dialog.locator('input[type="radio"][name="userId"]:checked').getAttribute('value').catch(() => null),
        type: flat(await win.typeSelect().locator('option:checked').innerText().catch(() => null), 80),
        status: flat(await win.statusSelect().locator('option:checked').innerText().catch(() => null), 40),
        dateStart: await readDate(win, 'dateStart'),
        dateEnd: await readDate(win, 'dateEnd'),
    };
}

/** "Save" and what follows: the answer, the page notices, and the window (or the list when it closed). */
async function save(page, win) {
    const notices = [];
    const on = async (r) => {
        if (/update-subscription(\?|$)/.test(r.url())) {
            const body = await r.text().catch(() => '');
            notices.push({status: r.status(), refused: /<form/.test(body)});
        }
    };
    page.on('response', on);
    try {
        await win.save();
    } finally {
        await idle(page).catch(() => {});
        await sleep(400);
        page.off('response', on);
    }
    const notice = flat(await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => []).then((a) => a.join(' | ')), 300);
    return {answers: notices, notice, window: await readWindow(win)};
}

module.exports = {T, TYPE, P, flat, sleep, dayFrom, userId, createType, openCreate, openEdit, typeDate, readDate, readWindow, save};
