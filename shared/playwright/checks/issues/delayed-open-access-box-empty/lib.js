// Helpers of the U51 A15 and A17 walks (issue reports U51-A17-delayed-open-access-box-empty
// and U51-A15-month-week-lists-read-1-months). Requiring this file runs nothing. Each
// screen helper drives a screen a journal manager uses.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const CTX = 'publicknowledge';
const SUBSCRIPTION_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const REMINDERS = [
    'numMonthsBeforeSubscriptionExpiryReminder',
    'numWeeksBeforeSubscriptionExpiryReminder',
    'numMonthsAfterSubscriptionExpiryReminder',
    'numWeeksAfterSubscriptionExpiryReminder',
];

/** A <select> as the screen shows it: the chosen entry (none when selectedIndex is -1) and the entries. */
async function readSelect(select) {
    return select.evaluate((s) => {
        const opts = [...s.options].map((o) => ({value: o.value, text: o.text.trim()}));
        const label = s.id ? document.querySelector(`label[for="${s.id}"]`) : null;
        return {
            label: label ? label.innerText.replace(/\s+/g, ' ').trim() : null,
            selectedIndex: s.selectedIndex,
            value: s.value,
            shown: s.selectedIndex >= 0 ? s.options[s.selectedIndex].text.trim() : '',
            count: opts.length,
            first: opts.slice(0, 4),
            last: opts.slice(-1),
            all: opts.map((o) => o.text),
        };
    });
}

/** Settings › Distribution, tab "Access" (the AccessSettings page object). */
async function openAccess(page) {
    const {AccessSettings} = require('../../../pages/SubscriptionsPages.js');
    const access = new AccessSettings(page, CTX);
    await access.goto();
    await idle(page).catch(() => {});
    return access;
}

/** "Publishing Mode": the subscriptions choice (not saved). */
async function chooseSubscriptionMode(access) {
    const radio = access.modeRadio(SUBSCRIPTION_MODE);
    await radio.check();
    await access.delayedList().waitFor({state: 'visible', timeout: T});
    return radio.isChecked();
}

/**
 * "Save" on the "Access" tab: its answer, the delayed-open-access value the browser sent
 * (read from the browser's own request) and the value the answer carries back.
 */
async function saveAccess(page, access) {
    const bodies = [];
    const listener = (req) => {
        if (/\/api\/v1\/contexts\/\d+/.test(req.url()) && req.method() !== 'GET') bodies.push(req.postData());
    };
    page.on('request', listener);
    const r = await access.save();
    page.off('request', listener);
    // The Vue form sends the fields form-encoded (a JSON body is read too).
    const body = bodies[0] || '';
    let fields;
    try {
        fields = JSON.parse(body);
    } catch {
        fields = Object.fromEntries(new URLSearchParams(body));
    }
    const sent = Object.prototype.hasOwnProperty.call(fields, 'delayedOpenAccessDuration') ? fields.delayedOpenAccessDuration : '(not sent)';
    let answered = null;
    try {
        answered = (await r.json()).delayedOpenAccessDuration;
    } catch {}
    return {status: r.status(), sent: JSON.stringify(sent), answered: JSON.stringify(answered)};
}

/** The journal's stored value, as the settings table holds it (a read, for Evidence). */
function stored(app, name = 'delayedOpenAccessDuration') {
    const t = app.contextTables;
    const rows = sql(app, `select s.setting_value from ${t.settings} s join ${t.table} j on j.${t.id} = s.${t.id} where j.path = '${CTX}' and s.setting_name = '${name}'`);
    return rows === '' ? '(no row)' : JSON.stringify(rows);
}

/** The "Payments" page's "Subscription Policies" tab; the four reminder lists read. */
async function readReminderLists(page) {
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const payments = new PaymentsPage(page, CTX);
    await payments.gotoTab('Subscription Policies');
    const form = payments.panel('Subscription Policies').locator('form').first();
    const out = {};
    for (const name of REMINDERS) out[name] = await readSelect(form.locator(`select[name="${name}"]`));
    return {payments, form, lists: out};
}

module.exports = {T, CTX, SUBSCRIPTION_MODE, REMINDERS, flat, readSelect, openAccess, chooseSubscriptionMode, saveAccess, stored, readReminderLists};
