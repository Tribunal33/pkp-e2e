// Helpers for walk.js beside this file (U60 A12). Requiring this file runs nothing.
// Every helper drives the screens a Site Administrator uses and never throws: an error comes back
// in `error`.
const {idle} = require('../../../probe');
const {WORDS} = require('../all-dates-error-nothing-published/lib');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Administration › "Hosted Journals": every row's name (the first cell's text), in order. */
async function readHosted(page, app) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, WORDS[app.name]);
    try {
        await hosted.gotoFromAdministration();
        return await hosted.rows.evaluateAll((trs) =>
            trs.map((tr) => {
                const copy = tr.querySelector('td').cloneNode(true);
                copy.querySelectorAll('a, script').forEach((e) => e.remove());
                return copy.textContent.replace(/\s+/g, ' ').trim();
            })
        );
    } catch (e) {
        return {error: flat(e.message)};
    }
}

/**
 * Administration › "Site Settings" › "Site Setup" › "Settings": the redirect list's label and
 * entries as shown (the blank one included), then "Bulk Emails": its boxes' labels.
 */
async function readSiteSettings(page) {
    const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
    const site = new SiteSettingsPage(page);
    const out = {};
    try {
        await site.gotoFromAdministration();
        const form = await site.settings();
        out.redirectLabel = flat(await page.locator('label[for^="siteConfig-redirectContextId-control"]').first().innerText().catch(() => null), 80);
        out.redirect = await form.redirectChoices();
        out.redirectChosen = await form.redirectChosen();
        out.bulkEmails = await (await site.bulkEmails()).boxLabels();
    } catch (e) {
        out.error = flat(e.message);
    }
    return out;
}

/**
 * "Site Setup" › "Settings": choose the entry whose text starts with `prefix` in the redirect list,
 * "Save", reload the page, and read the chosen entry again.
 */
async function chooseRedirect(page, prefix) {
    const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
    const site = new SiteSettingsPage(page);
    const out = {};
    try {
        await site.gotoFromAdministration();
        let form = await site.settings();
        const value = await form.redirect.evaluate((s, p) => {
            const o = [...s.options].find((x) => x.textContent.trim().startsWith(p));
            return o ? o.value : null;
        }, prefix);
        out.value = value;
        await form.redirect.selectOption(value);
        out.chosenBeforeSave = await form.redirectChosen();
        // The dataset's site has no "Site Name", which the form requires before it saves.
        if (!(await form.siteName('en').inputValue())) {
            await form.siteName('en').fill('u60h Site');
            out.siteNameTyped = 'u60h Site';
        }
        const r = await form.pressSave();
        out.status = r.status();
        out.saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
        await site.reload();
        form = await site.settings();
        out.chosenAfterReload = await form.redirectChosen();
    } catch (e) {
        out.error = flat(e.message);
    }
    return out;
}

/**
 * A journal's Settings › Distribution › "Payments" on its French page: tick the enable box
 * (nothing saved) and read the currency and payment method lists' entries holding an apostrophe,
 * an "&" or a code (`&#039;`, `&amp;`), and their counts.
 */
async function readPaymentsFrench(page, app) {
    const out = {};
    try {
        const r = await page.goto(app.url(`/index.php/${app.contextPath}/fr_CA/management/settings/distribution#payments`));
        out.status = r ? r.status() : null;
        await idle(page).catch(() => {});
        const box = page.locator('input[name="paymentsEnabled"]').first();
        if (!(await box.count())) return {...out, payments: 'no Payments form'};
        await box.waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
        if (!(await box.isChecked())) await box.check();
        const currency = page.locator('select[id^="paymentSettings-currency-control"]').first();
        await currency.waitFor({state: 'visible', timeout: 10_000});
        const all = (await currency.locator('option').allInnerTexts()).map((s) => flat(s, 80));
        out.currencyCount = all.length;
        out.currencyMarked = all.filter((s) => /['&’]/.test(s));
        const method = page.locator('select[id^="paymentSettings-paymentPluginName-control"]').first();
        out.paymentMethods = (await method.locator('option').allInnerTexts().catch(() => [])).map((s) => flat(s, 80));
    } catch (e) {
        out.error = flat(e.message);
    }
    return out;
}

module.exports = {flat, readHosted, readSiteSettings, chooseRedirect, readPaymentsFrench};
