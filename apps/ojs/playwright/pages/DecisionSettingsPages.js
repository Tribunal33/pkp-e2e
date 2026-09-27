// @ts-check
/**
 * @file playwright/pages/DecisionSettingsPages.js
 *
 * The settings screens the decision-recording scenarios (feature U34, spec
 * docs/specs/U34-editorial-decision-recording.md, "Settings that modify
 * behavior") set on a scratch journal before their first step, since no
 * scenario key covers them yet (scenarios.md "Field shapes not built yet":
 * `notifyAllAuthors`, the email templates, payments). OJS-owned (PRINCIPLES
 * M1): a press shares the first two screens but has no fee page.
 *
 * - `ManageEmailsPage`, `WorkflowEmailsSettingsPage` — Settings › Workflow ›
 *   "Emails" and "Manage Emails", now in the shared
 *   `shared/playwright/pages/EmailsPages.js` (U56) and re-exported here.
 * - `PaymentsSetupPage` — Settings › Distribution › "Payments" ("Enable",
 *   "Currency", "Payment Plugins", the manual plugin's "Manual Payment
 *   Instructions", "Save") and the "Payments" page's "Payment Types" tab
 *   ("Article Processing Charge"), set in one call each; the screens'
 *   locators are the shared `PaymentsPages.js` (U52).
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {
    PaymentSettingsTab,
    JournalPaymentsPage,
    PAYMENTS_TEXT,
} = require('../../../../shared/playwright/pages/PaymentsPages.js');

// Moved to the shared tree for U56 (Emails management); re-exported here
// so the U34 suite's imports stay as they were.
const {ManageEmailsPage, WorkflowEmailsSettingsPage} = require('../../../../shared/playwright/pages/EmailsPages.js');

exports.ManageEmailsPage = ManageEmailsPage;
exports.WorkflowEmailsSettingsPage = WorkflowEmailsSettingsPage;

exports.PaymentsSetupPage = class PaymentsSetupPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    /**
     * Settings › Distribution › Payments: enable payments in US Dollars
     * through the manual plugin with its instructions filled (an empty box
     * leaves the plugin unconfigured and no "Request Payment" page shows;
     * seed-facts), and save. The tab's locators are U52's
     * (`PaymentSettingsTab`).
     */
    async enableManualPayments({instructions}) {
        const tab = new PaymentSettingsTab(this.page, this.contextPath);
        await tab.goto();
        await tab.enableBox().check();
        await tab.currencySelect().selectOption({label: 'US Dollar'});
        await tab.pluginSelect().selectOption({label: 'Manual Fee Payment'});
        await expect(tab.instructionsBox()).toBeVisible({timeout: 30_000});
        await tab.instructionsBox().fill(instructions);
        await tab.save();
    }

    /**
     * The "Payments" page's "Payment Types" tab: set the "Article Processing
     * Charge", save, and read it back after a reload (U52's
     * `JournalPaymentsPage` and `PaymentTypesTab`).
     */
    async setPublicationFee(amount) {
        const payments = new JournalPaymentsPage(this.page, this.contextPath);
        await payments.goto();
        const types = await payments.showPaymentTypes();
        await types.box(PAYMENTS_TEXT.apc).fill(String(amount));
        const saved = await types.save();
        expect(saved.ok()).toBe(true);
        await payments.goto();
        const reloaded = await payments.showPaymentTypes();
        await expect(reloaded.box(PAYMENTS_TEXT.apc)).toHaveValue(String(amount), {timeout: 30_000});
    }
};
