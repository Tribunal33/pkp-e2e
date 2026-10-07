// @ts-check
/**
 * @file shared/playwright/pages/PaymentsPages.js
 *
 * Page objects for Payments & APCs (spec:
 * docs/specs/U52-payments-and-apcs.md). The settings tab is shared by a
 * journal and a press (the press's own sentence is passed in by its
 * suite, PRINCIPLES M2); everything else is a journal's alone. The
 * "Payments" page, its tab bar, its legacy lists and the reader's
 * purchase pages are Subscriptions' (`SubscriptionsPages.js`) and are
 * extended here, never copied; the decision wizard's "Request Payment"
 * page is the OJS `DecisionWizardPages.js`'s, and the publish window is
 * the OJS `PublishSchedulePages.js`'s.
 *
 * Surfaces:
 * - PaymentSettingsTab — Settings › Distribution › "Payments": the groups
 *   ("Setup", "Manual Fee Payment", "Paypal Fee Payment"), "Enable",
 *   "Currency", "Payment Plugins", "Manual Payment Instructions", "Test
 *   Mode", "Account Name", "Client ID", "Secret", "Save" and its "Saved".
 * - JournalPaymentsPage — the "Payments" page (`/payments`), opened from
 *   the side menu or by address: the "Payment Types" tab
 *   (PaymentTypesTab) and the "Payments" tab's list of payments (its
 *   columns, rows, "No Items" and the paging line).
 * - PaymentTypesTab — the "Payment Types" form: its sections, boxes, the
 *   refusal at the top and under a box, "Save" and the passing notice.
 * - WorkflowPaymentsMenu — the workflow header's "Payments" menu: the
 *   button, its panel, "Publication Fee" with "Waived" / "Paid" /
 *   "Unpaid", "Save" and its "Saved".
 * - PayerPage — the payer's side: the "Manual Fee Payment" page (Title,
 *   Fee, the instructions with their line breaks, "Send notification of
 *   payment"), the "Payment Notification" page that follows ("Payment
 *   notification sent", "Continue"), and the PayPal method's error line.
 * - recordDialogs — the browser's own questions (the "Payment Types"
 *   tab's confirm, the page-leave question), recorded with their type and
 *   answered as queued.
 *
 * DOM shapes (U52 claim check, `.reports/U52/screen-notes.md` ccK1–ccK3,
 * and the tojs probes of 2026-09-27): the settings tab is the Vue form
 * `#payments`, whose groups are `role=group` named by their heading and
 * whose fields under "Enable" are not rendered at all while it is
 * unticked; its "Save" posts `api/v1/_payments`. The "Payment Types" form
 * is the legacy `#paymentTypesForm` (sections `div.section` headed by a
 * bare `label`), saved through `payments/savePaymentTypes`, which answers
 * 200 either way (a refusal returns the form again with a
 * `.notifyFormError` block and a `label.sub_label.error` under the box).
 * The workflow menu is `.pkpWorkflow__submissionPayments`, a dropdown in
 * the header (`[data-cy="sidemodal-header"]`) whose panel is inline, not
 * portaled; its "Save" posts `_submissions/{id}/payment`. The manual page
 * is `.page_payment_form` (the instructions a `<p>` with `<br>`), the
 * notification page `.page_message`.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {settleDropdown} = require('../support/dropdown.js');
const {PaymentsPage, PaymentTypesForm, ManualPaymentPage, EditorialSideMenu} = require('./SubscriptionsPages.js');

const T = 30_000;

/** The strings the payment screens show (OJS, OMP and lib/pkp locales). */
const TEXT = {
    saved: 'Saved',
    typesSaved: 'Your changes have been saved.',
    formError: 'Errors occurred processing this form',
    costsPositive: 'All costs must be positive numeric values (decimal points are allowed)',
    formChanged: 'The data on this form has changed. Do you wish to continue without saving?',
    groups: {setup: 'Setup', manual: 'Manual Fee Payment', paypal: 'Paypal Fee Payment'},
    enable: 'Enable',
    enableJournal: 'Payments will be enabled for this journal. Note that users will be required to log in to make payments.',
    enablePress: 'Payments will be enabled for this press. Note that users will be required to log in to make payments.',
    currency: 'Currency',
    plugins: 'Payment Plugins',
    manualMethod: 'Manual Fee Payment',
    paypalMethod: 'Paypal Fee Payment',
    instructions: 'Manual Payment Instructions',
    testMode: 'Test Mode',
    accountName: 'Account Name',
    clientId: 'Client ID',
    secret: 'Secret',
    authorFees: 'Author Fees',
    authorFeesSentence: 'Enter fee amounts below in order to enable author processing charges.',
    readerFees: 'Reader Fees',
    generalFees: 'General Fees',
    apc: 'Article Processing Charge',
    purchaseIssue: 'Purchase Issue',
    purchaseArticle: 'Purchase Article',
    restrictOnlyPdf: 'Only Restrict Access to PDF version of issues and articles',
    membership: 'Association Membership',
    listColumns: ['User', 'Payment Type', 'Amount', 'Timestamp'],
    noItems: 'No Items',
    emptyPaging: '0 - 0 of 0 items',
    publicationFee: 'Publication Fee',
    feeOptions: ['Waived', 'Paid', 'Unpaid'],
    manualPage: 'Manual Fee Payment',
    sendNotification: 'Send notification of payment',
    notificationHeading: 'Payment Notification',
    notificationSent: 'Payment notification sent',
    continue: 'Continue',
    transactionError: 'A transaction error occurred. Please contact the journal manager for details.',
    feeDue: 'The publication fee is due for payment.',
    feeNotPaid: 'Publication Fee not paid. To schedule item for publication notify author to pay fee or waive fee.',
    requestFee: (amount, currency) => `Request publication fee (${amount} ${currency})`,
    waive: 'Waive',
    paymentRequestSubject: 'Payment Request Notification',
    manualNotificationSubject: 'Manual Payment Notification',
};
exports.PAYMENTS_TEXT = TEXT;

/** The requests the screens send, for `waitForResponse`. */
const REQUEST = {
    saveSettings: /\/api\/v1\/_payments(\?|$)/,
    savePaymentTypes: /\/payments\/savePaymentTypes/,
    saveFeeRecord: /\/api\/v1\/_submissions\/\d+\/payment(\?|$)/,
};
exports.PAYMENTS_REQUEST = REQUEST;

/** Wait for the request whose address matches `pattern` (any method but GET). */
function sent(page, pattern) {
    return page.waitForResponse((r) => pattern.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
}

/** Collapse runs of white space (the no-break space included) and trim. */
function flat(text) {
    return String(text || '').replace(/[\s ]+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// The browser's own questions (Rule 4a)
// ---------------------------------------------------------------------------

/**
 * Record every browser dialog on `page` as `{type, message}` and answer it:
 * a queued answer first (`answerNext('dismiss')` for "Cancel"), otherwise
 * "OK". A page-leave question (`beforeunload`) is always accepted, since
 * dismissing it cancels the navigation the test asked for.
 *
 * @param {import('@playwright/test').Page} page
 */
function recordDialogs(page) {
    /** @type {{type: string, message: string}[]} */
    const entries = [];
    /** @type {Array<'accept' | 'dismiss'>} */
    const answers = [];
    page.on('dialog', async (dialog) => {
        entries.push({type: dialog.type(), message: dialog.message()});
        const answer = dialog.type() === 'beforeunload' ? 'accept' : answers.shift() || 'accept';
        await (answer === 'accept' ? dialog.accept() : dialog.dismiss()).catch(() => {});
    });
    return {
        entries,
        /** Queue the answer to the next question that is not a page-leave one. */
        answerNext(/** @type {'accept' | 'dismiss'} */ answer) {
            answers.push(answer);
        },
        /** Forget what was recorded so far. */
        clear() {
            entries.length = 0;
        },
        /** The recorded questions' types, in order (for `expect.poll`). */
        types() {
            return entries.map((e) => e.type);
        },
    };
}
exports.recordDialogs = recordDialogs;

// ---------------------------------------------------------------------------
// Settings › Distribution › "Payments" (Fields; Rules 1–3)
// ---------------------------------------------------------------------------

class PaymentSettingsTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    /** Open Settings › Distribution and its "Payments" tab. */
    async goto() {
        await this.page.goto(this.contextUrl(this.contextPath, '/management/settings/distribution'));
        await this.page.locator('#payments-button').click();
        await expect(this.enableBox()).toBeVisible({timeout: T});
    }

    /** Reload the page and open the tab again. */
    async reload() {
        await this.page.reload();
        await this.page.locator('#payments-button').click();
        await expect(this.enableBox()).toBeVisible({timeout: T});
    }

    /** The tab's panel. */
    panel() {
        return this.page.locator('#payments');
    }

    /** A group of the form by its heading ("Setup", "Manual Fee Payment", "Paypal Fee Payment"). */
    group(name) {
        return this.panel().getByRole('group', {name, exact: true});
    }

    /** Every group's heading, top to bottom (a locator for `toHaveText`). */
    groupHeadings() {
        return this.panel().locator('.pkpFormGroup__heading');
    }

    /** The "Enable" legend over its one box. */
    enableLegend() {
        return this.panel().locator('legend').filter({hasText: TEXT.enable}).first();
    }

    enableBox() {
        return this.panel().locator('input[name="paymentsEnabled"]');
    }

    /** The box's own label (the sentence beside it). */
    enableLabel() {
        return this.panel().locator('label').filter({has: this.page.locator('input[name="paymentsEnabled"]')});
    }

    currencySelect() {
        return this.panel().getByRole('combobox', {name: TEXT.currency, exact: true});
    }

    pluginSelect() {
        return this.panel().getByRole('combobox', {name: TEXT.plugins, exact: true});
    }

    instructionsBox() {
        return this.panel().getByRole('textbox', {name: TEXT.instructions, exact: true});
    }

    /** "Test Mode"'s one box ("Enable", inside the PayPal group). */
    testModeBox() {
        return this.group(TEXT.groups.paypal).getByRole('group', {name: TEXT.testMode, exact: true}).getByRole('checkbox');
    }

    accountNameBox() {
        return this.panel().getByRole('textbox', {name: TEXT.accountName, exact: true});
    }

    clientIdBox() {
        return this.panel().getByRole('textbox', {name: TEXT.clientId, exact: true});
    }

    secretBox() {
        return this.panel().getByRole('textbox', {name: TEXT.secret, exact: true});
    }

    /** Every form control on the tab the payer of a setting can change (boxes, lists, text). */
    controls() {
        return this.panel().locator('input:not([type="hidden"]):not([type="submit"]), select, textarea');
    }

    /** The text of the option a list shows as chosen ('' when none is). */
    async chosenOption(select) {
        return select.evaluate((/** @type {HTMLSelectElement} */ s) => (s.selectedIndex < 0 ? '' : s.options[s.selectedIndex].text.trim()));
    }

    /** "Save" and its "Saved": bounded by the save's answer. */
    async save() {
        const answer = sent(this.page, REQUEST.saveSettings);
        await this.panel().getByRole('button', {name: 'Save', exact: true}).click();
        const response = await answer;
        expect(response.ok(), `the payments save answered ${response.status()}`).toBe(true);
        await expect(this.savedStatus()).toBeVisible({timeout: T});
        return response;
    }

    /** The "Saved" the tab shows after a save. */
    savedStatus() {
        return this.panel().locator('[role="status"]').filter({hasText: TEXT.saved}).first();
    }
}
exports.PaymentSettingsTab = PaymentSettingsTab;

// ---------------------------------------------------------------------------
// The "Payments" page: "Payment Types" and the list of payments (Rules 4, 4a, 17)
// ---------------------------------------------------------------------------

/** The "Payment Types" boxes' labels and the fields they post. */
const FEE_FIELDS = {
    [TEXT.apc]: 'publicationFee',
    [TEXT.purchaseIssue]: 'purchaseIssueFee',
    [TEXT.purchaseArticle]: 'purchaseArticleFee',
    [TEXT.membership]: 'membershipFee',
};

class PaymentTypesTab extends PaymentTypesForm {
    /** The legacy form. */
    form() {
        return this.panel.locator('#paymentTypesForm');
    }

    /** A section of the form by its heading ("Author Fees", "Reader Fees", "General Fees"). */
    section(heading) {
        return this.form()
            .locator('div.section')
            .filter({has: this.page.locator(':scope > label', {hasText: heading})});
    }

    /** A section's heading (the bare label that opens it). */
    sectionHeading(heading) {
        return this.section(heading).locator(':scope > label');
    }

    /** A section's sentence under its heading. */
    sectionSentence(heading) {
        return this.section(heading).locator(':scope > p');
    }

    /**
     * A fee box by its label ("Article Processing Charge", …), found by the
     * field it posts: after a refused save the message replaces the
     * refused box's label, so the label no longer names it.
     */
    box(label) {
        const name = FEE_FIELDS[label];
        if (!name) {
            throw new Error(`PaymentTypesTab.box: unknown box "${label}"`);
        }
        return this.form().locator(`input[name="${name}"]`);
    }

    /** A fee box by its accessible name (its label, while no refusal replaced it). */
    labelledBox(label) {
        return this.form().getByRole('textbox', {name: label, exact: true});
    }

    /** Every fee box, top to bottom. */
    boxes() {
        return this.form().getByRole('textbox');
    }

    /** The refusal block at the top of the form. */
    formError() {
        return this.form().locator('.notifyFormError');
    }

    /** The message under a box (in place of its label, after a refusal). */
    errorUnder(label) {
        return this.form()
            .locator('.pkp_helpers_quarter')
            .filter({has: this.page.locator(`input[name="${FEE_FIELDS[label]}"]`)})
            .locator('label.error');
    }

    /** Every message under a box. */
    errorsUnderBoxes() {
        return this.form().locator('label.sub_label.error');
    }

    /** The passing notice a valid save shows. */
    savedNotice() {
        return this.page.locator('.app__notifications .pkpNotification').filter({hasText: TEXT.typesSaved});
    }

    /** Type into a box and leave it (the legacy form notices a change on blur). */
    async type(label, value) {
        const box = this.box(label);
        await box.fill(value);
        await box.blur();
    }
}
exports.PaymentTypesTab = PaymentTypesTab;

class JournalPaymentsPage extends PaymentsPage {
    /** Press the side menu's "Payments" and wait for the page. */
    async openFromSideMenu() {
        await new EditorialSideMenu(this.page).entry('Payments').click();
        await this.page.waitForURL((u) => /\/payments$/.test(u.pathname), {waitUntil: 'commit', timeout: T});
        await expect(this.heading()).toBeVisible({timeout: T});
        await expect(this.grid('Individual Subscriptions').locator('table')).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** Reload the page: it opens again on its first tab. */
    async reload() {
        await this.page.reload();
        await expect(this.heading()).toBeVisible({timeout: T});
        await expect(this.grid('Individual Subscriptions').locator('table')).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** The "Payment Types" tab's form, its tab shown (the form's boxes loaded). */
    async showPaymentTypes() {
        await this.showTab('Payment Types');
        const tab = this.paymentTypesTab();
        await expect(tab.box(TEXT.apc)).toBeVisible({timeout: T});
        return tab;
    }

    paymentTypesTab() {
        return new PaymentTypesTab(this.page, this.panel('Payment Types'));
    }

    /** The list of payments' column headings (a locator for `toHaveText`). */
    listColumns() {
        return this.grid('Payments').locator('thead th, tr.gridHeader th').filter({hasText: /\S/});
    }

    /** The list's rows. */
    listRows() {
        return this.rows('Payments');
    }

    /** "No Items" in the list. */
    listNoItems() {
        return this.noItems('Payments');
    }

    /** The counting line under the list ("0 - 0 of 0 items"). */
    listPaging() {
        return this.panel('Payments').getByText(/^\s*\d+ - \d+ of \d+ items\s*$/);
    }

    /**
     * The one row of the list read as its cells' texts; waits until the
     * list holds exactly one row.
     *
     * @returns {Promise<string[]>}
     */
    async onlyRowCells() {
        await expect(this.listRows()).toHaveCount(1, {timeout: T});
        return this.listRows()
            .first()
            .locator('> td')
            .evaluateAll((cells) => cells.map((td) => (td.textContent || '').replace(/[\s ]+/g, ' ').trim()));
    }
}
exports.JournalPaymentsPage = JournalPaymentsPage;

// ---------------------------------------------------------------------------
// The workflow header's "Payments" menu (Fields; Rules 13–14)
// ---------------------------------------------------------------------------

class WorkflowPaymentsMenu extends BasePage {
    /** The menu, in the workflow's header. */
    root() {
        return this.page.locator('[data-cy="sidemodal-header"] .pkpWorkflow__submissionPayments');
    }

    button() {
        return this.root().getByRole('button', {name: 'Payments', exact: true});
    }

    /** The small panel the button opens. */
    content() {
        return this.root().locator('.pkpDropdown__content');
    }

    /** The "Publication Fee" choice. */
    choice() {
        return this.content().getByRole('group', {name: TEXT.publicationFee, exact: true});
    }

    /** The choice's options, in order (a locator for `toHaveText` on their labels). */
    optionLabels() {
        return this.choice().locator('label');
    }

    radio(label) {
        return this.choice().getByRole('radio', {name: label, exact: true});
    }

    saveButton() {
        return this.content().getByRole('button', {name: 'Save', exact: true});
    }

    savedStatus() {
        return this.content().locator('[role="status"]').filter({hasText: TEXT.saved}).first();
    }

    /**
     * Press the button and wait for the panel's options. A panel left on
     * screen after the focus went elsewhere closes itself within a second
     * (a ui-library Dropdown, support/dropdown.js): it is waited out and
     * pressed again, never taken as open.
     */
    async open() {
        if (!(await settleDropdown(this.root(), {timeout: T}))) {
            await this.button().click();
        }
        await expect(this.radio('Unpaid')).toBeVisible({timeout: T});
    }

    /** Press the button again: the panel closes (one already closing is waited out instead). */
    async close() {
        if (await settleDropdown(this.root(), {timeout: T})) {
            await this.button().click();
        }
        await expect(this.content()).toBeHidden({timeout: T});
    }

    /** The option the panel shows as chosen. */
    async expectChosen(label) {
        await expect(this.radio(label)).toBeChecked({timeout: T});
        for (const other of TEXT.feeOptions.filter((o) => o !== label)) {
            await expect(this.radio(other)).not.toBeChecked();
        }
    }

    /** Choose an option and press "Save": bounded by the save's answer and its "Saved". */
    async saveOption(label) {
        await this.open();
        await this.radio(label).check();
        const answer = sent(this.page, REQUEST.saveFeeRecord);
        await this.saveButton().click();
        const response = await answer;
        expect(response.ok(), `the fee record's save answered ${response.status()}`).toBe(true);
        await expect(this.savedStatus()).toBeVisible({timeout: T});
        return response;
    }
}
exports.WorkflowPaymentsMenu = WorkflowPaymentsMenu;

// ---------------------------------------------------------------------------
// The payer's pages (Rules 9–10)
// ---------------------------------------------------------------------------

class PayerPage extends ManualPaymentPage {
    /** The manual page's heading. */
    manualHeading() {
        return this.main().locator('h1.page_title');
    }

    /** The instructions as the browser lays them out (line breaks kept). */
    async instructionsText() {
        await expect(this.instructions()).toBeVisible({timeout: T});
        return (await this.instructions().innerText()).replace(/ /g, ' ').trim();
    }

    /** The "Payment Notification" page's heading. */
    notificationHeading() {
        return this.main().locator('.page_message h1');
    }

    /** Its sentence ("Payment notification sent"). */
    notificationMessage() {
        return this.main().locator('.page_message .description');
    }

    continueLink() {
        return this.main().getByRole('link', {name: TEXT.continue, exact: true});
    }

    /** Press "Send notification of payment" and wait for the "Payment Notification" page. */
    async sendNotification() {
        await this.notifyLink().click();
        await expect(this.notificationHeading()).toHaveText(TEXT.notificationHeading, {timeout: T});
    }

    /** The PayPal method's error line. */
    transactionError() {
        return this.main().getByText(TEXT.transactionError, {exact: true});
    }
}
exports.PayerPage = PayerPage;
exports.flat = flat;
