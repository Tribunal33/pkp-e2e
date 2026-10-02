// Helpers of the U51 A22 walk (issue report
// docs/issues/U51-A22-subscription-search-fields-narrow-nothing.md). Requiring this file
// runs nothing. Every helper presses what a journal manager presses, on OJS (the one app
// with subscriptions).
const {idle, shot} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/[\s ]+/g, ' ').trim().slice(0, n));
const pages = () => require('../../../pages/SubscriptionsPages.js');

/** Institutions › "Add Institution": the name and the IP ranges, "Save". */
async function createInstitution(page, app, {name, ipRanges}) {
    const {InstitutionsPage} = require('../../../pages/InstitutionsPages.js');
    const list = new InstitutionsPage(page, app.contextPath);
    await list.goto();
    const panel = await list.openAdd();
    await panel.nameBox('en').fill(name);
    await panel.ipRangesBox.fill(ipRanges);
    const r = await panel.saveAccepted({refetch: true});
    return {save: r.status(), names: (await list.names.allInnerTexts()).map((t) => flat(t))};
}

/**
 * Payments › `tab` ("Individual Subscriptions" | "Institutional Subscriptions") ›
 * "Create New Subscription": the user found in "Locate a User", the type, "Active", the
 * dates, Membership (individual), Reference Number, Notes (its formatted-text box), and on
 * the institutional tab the institution, a mailing address and the domain; "Save".
 */
async function createSubscription(page, app, s) {
    const {PaymentsPage} = pages();
    const {waitForEditorReady} = require('../../../support/richtext.js');
    const pay = new PaymentsPage(page, app.contextPath);
    await pay.gotoTab(s.tab);
    const win = await pay.openCreateSubscription(s.tab);
    await win.chooseUser(s.username, s.userId);
    await win.chooseType(s.type);
    await win.chooseStatus('Active');
    await win.typeDate('dateStart', s.start);
    await win.typeDate('dateEnd', s.end);
    if (s.institution) {
        await win.chooseInstitution(s.institution);
        await win.mailingAddressBox().fill(s.address);
        await win.domainBox().fill(s.domain);
    }
    if (s.membership) await win.membershipBox().fill(s.membership);
    await win.referenceBox().fill(s.reference);
    const notesId = await win.notesArea().first().getAttribute('id');
    await waitForEditorReady(page, notesId);
    const body = page.frameLocator(`#${notesId}_ifr`).locator('body');
    await body.click();
    await body.fill(s.notes);
    const r = await win.saveAccepted();
    await idle(page).catch(() => {});
    return {save: r.status()};
}

/** The rows of a subscriptions tab: each row's first two cells ("Name", then "Email" or "Subscription Type"). */
async function listed(pay, tab) {
    return pay.rows(tab).evaluateAll((rows) =>
        rows.map((tr) =>
            [...tr.querySelectorAll(':scope > td')]
                .slice(0, 2)
                .map((td) => {
                    const c = td.cloneNode(true);
                    c.querySelectorAll('a.show_extras, a.hide_extras').forEach((a) => a.remove());
                    return (c.textContent || '').replace(/\s+/g, ' ').trim();
                })
                .join(' | ')
        )
    );
}

/**
 * Payments › `tab`: under "Search" the field, the match ("contains" | "is") and the text,
 * "Search". Returns the rows the list shows afterwards and the list's request.
 */
async function search(page, app, tab, {field, match, text}, shotName) {
    const {PaymentsPage} = pages();
    const pay = new PaymentsPage(page, app.contextPath);
    await pay.gotoTab(tab);
    const panel = pay.panel(tab);
    const fieldSelect = panel.locator('select[name="searchField"]');
    if (!(await fieldSelect.isVisible().catch(() => false))) {
        await panel.getByRole('link', {name: /Search/}).first().click();
        await fieldSelect.waitFor({state: 'visible', timeout: T});
    }
    const offered = (await fieldSelect.locator('option').allInnerTexts()).map((t) => flat(t));
    await fieldSelect.selectOption({label: field});
    await panel.locator('select[name="searchMatch"]').selectOption({label: match});
    await panel.locator('input[name="search"]').fill(text);
    const fetched = page.waitForResponse((r) => /fetch-grid|fetchGrid/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await panel.getByRole('button', {name: 'Search', exact: true}).click();
    const r = await fetched;
    await idle(page).catch(() => {});
    if (shotName) await shot(page, shotName).catch(() => {});
    return {field, match, text, status: r ? r.status() : null, rows: await listed(pay, tab), offered};
}

module.exports = {T, flat, createInstitution, createSubscription, listed, search};
