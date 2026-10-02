// Helpers of the U51 expiry-reminder walks (issue reports U51 A27 and A8). Requiring this
// file runs nothing. The shared screen and command helpers are those of the open-access
// walk (../open-access-email-sent-twice/lib.js); these add the subscription screens.
const {idle, shot} = require('../../../probe');
const base = require('../open-access-email-sent-twice/lib.js');

const {CTX, flat} = base;

/** Payments › "Subscription Types" › "Create New Subscription Type": a type ("Individual" unless `institutional`), "Save". */
async function createType(page, {name, cost, currency = 'US Dollar', duration, institutional = false}) {
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const payments = new PaymentsPage(page, CTX);
    await payments.gotoTab('Subscription Types');
    const win = await payments.openCreateType();
    await win.nameBox().fill(name);
    if (institutional) await win.dialog.locator('input#institutional').check();
    const options = (await win.currencySelect().locator('option').allInnerTexts()).map((t) => flat(t));
    const label = options.find((o) => /\(USD\)$/.test(o)) || options.find((o) => o.startsWith(currency));
    await win.currencySelect().selectOption({label});
    await win.costBox().fill(String(cost));
    await win.durationBox().fill(String(duration));
    const saved = page.waitForResponse((r) => /update-subscription-type|updateSubscriptionType/i.test(r.url()) && r.request().method() === 'POST', {timeout: base.T}).catch(() => null);
    await win.saveButton().click();
    const r = await saved;
    await idle(page).catch(() => {});
    await payments.gotoTab('Subscription Types');
    const row = flat(await payments.row('Subscription Types', name).first().innerText().catch(() => ''));
    return {currency: label, save: r ? r.status() : null, row};
}

/**
 * Payments › "Individual Subscriptions" › "Create New Subscription": the user found by
 * username in "Locate a User", the type, "Status" "Active", "Start date" and "End date"
 * typed, "Save". Returns the list row.
 */
async function createSubscription(page, {username, userId, type, start, end, institution = null}) {
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const payments = new PaymentsPage(page, CTX);
    const tab = institution ? 'Institutional Subscriptions' : 'Individual Subscriptions';
    await payments.gotoTab(tab);
    const win = await payments.openCreateSubscription(tab);
    await win.chooseUser(username, userId);
    await win.chooseType(type);
    await win.chooseStatus('Active');
    await win.typeDate('dateStart', start);
    await win.typeDate('dateEnd', end);
    if (institution) {
        await win.chooseInstitution(institution);
        await win.mailingAddressBox().fill('2 Harbour Road');
        await win.domainBox().fill('harbour.ac.uk');
    }
    const r = await win.save();
    await idle(page).catch(() => {});
    await shot(page, `subscription-${username}`).catch(() => {});
    await payments.gotoTab(tab);
    const rows = (await payments.rows(tab).allInnerTexts()).map((t) => flat(t, 200));
    return {save: r.status(), rows};
}

/** Settings › "Institutions" (the journal's institutions list) › "Add Institution": the name, "Save". */
async function createInstitution(page, name) {
    const {InstitutionsPage} = require('../../../pages/InstitutionsPages.js');
    const list = new InstitutionsPage(page, CTX);
    await list.goto();
    const panel = await list.openAdd();
    await panel.nameBox('en').fill(name);
    const r = await panel.saveAccepted({refetch: true});
    return {save: r.status(), names: (await list.names.allInnerTexts()).map((t) => flat(t))};
}

/** A date as YYYY-MM-DD, from a JS Date in UTC. */
const ymd = (d) => d.toISOString().slice(0, 10);

/** The day the task's "1 Months" before-reminder looks for when run on `d` (same day, next month). */
function oneMonthAfter(d) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
}

module.exports = {...base, createType, createSubscription, createInstitution, ymd, oneMonthAfter};
