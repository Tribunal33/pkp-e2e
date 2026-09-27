// @ts-check
/**
 * @file playwright/tests/U52-payments-and-apcs.spec.js
 *
 * Payments & APCs — OJS suite, one test per canonical scenario the journal
 * runs (S1–S5). S6 is the press's (OMP tree), S7 the preprint server's
 * absence (OPS tree); their journal-side controls are S1 here.
 * Spec: docs/specs/U52-payments-and-apcs.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A4 🐞: S2 never reads the "Required fields are marked with an
 *   asterisk: *" line nor the boxes' missing asterisks.
 * - A10 🐞: S5 reads the PayPal page's error sentence and that it is not
 *   the manual page; its missing heading is not asserted.
 * - A1 🐞: S2 never reads the "Reader Fees" and "General Fees" sentences
 *   (they promise About the Journal).
 * - A2, A3, A5–A9, A11, OMP1: not on these scenarios' paths.
 *
 * Returned as findings (`.reports/U52/test-ojs-findings.md`): T-ojs-1 (S1
 * reads "Institutions" leaving the side menu after a reload, not on the
 * same page), T-ojs-2 (S4's publish windows are the Journal Manager's,
 * the Section Editor's publication page having no publish button),
 * T-ojs-3 (S2 reads the refused box's message where its label was).
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are never touched. Every test seeds its own scratch journal with
 * throwaway accounts (the username twice as password), as footnote s0
 * says: the `payments` key (S1 `{enabled: false, publicationFee: 50}`, S2
 * the manual method in US dollars, S3–S5 the same with `publicationFee:
 * 50`), in S3 also `publishingMode`, `subscriptionTypes[]` and a
 * published `issues[]` entry; "Tidal Patterns" through the submission
 * scenario (`participants[]`, and in S4 `decisions: ['skipExternalReview',
 * 'sendToProduction']`). Each journal also names its own principal
 * contact ("Paula Contact" at a throwaway address), so the mail the
 * contact sends and receives is scoped by recipient (PRINCIPLES A8)
 * instead of the shared "Site Admin" address the U51 suite also mails.
 * S5's request is made on screen, as s0 says.
 *
 * Every absence is read settled (the workflow header once its version has
 * loaded, the settings form once rendered, the list once its tab showed,
 * a refusal once its save answered) and paired with a positive control
 * taken the same way (M4, M6); S4's mailbox silence is bounded by a
 * password reset the test asks for the journal's own manager afterwards
 * (A8). The browser's own questions are recorded and answered on every
 * actor's page. The signed-out payer is the fixture's own page, which
 * carries no session in a test that sets no `user` (patterns.md lesson 8);
 * every other actor is an `asUser` context. Waits are web-first or bounded
 * by the screen's own answer (A5).
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {TasksPanel} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {
    EditorialSideMenu,
    MySubscriptionsPage,
    PurchasePage,
} = require('../../../../shared/playwright/pages/SubscriptionsPages.js');
const {
    PAYMENTS_TEXT: TEXT,
    PaymentSettingsTab,
    JournalPaymentsPage,
    WorkflowPaymentsMenu,
    PayerPage,
    recordDialogs,
    flat,
} = require('../../../../shared/playwright/pages/PaymentsPages.js');
const {DecisionWizardPage} = require('../pages/DecisionWizardPages.js');
const {PublishScreen} = require('../pages/PublishSchedulePages.js');

const TITLE = 'Tidal Patterns';
const INSTRUCTIONS = 'Pay by bank transfer.';
const PAY = {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: INSTRUCTIONS};
const CONTACT_NAME = 'Paula Contact';
const ISSUE = 'Vol. 1 No. 1 (2026)';
const REQUEST_50 = TEXT.requestFee(50, 'USD');
const ALL_MET = 'All publication requirements have been met.';

/**
 * The workflow header's buttons with and without the "Payments" menu, on
 * a submission at the Submission stage and on one past acceptance, whose
 * header also offers "Preview" (Rule 5; Actors row 4; U24's Rule 6).
 */
const HEADER_WITH = ['Payments', 'Activity Log', 'Library'];
const HEADER_WITHOUT = ['Activity Log', 'Library'];
const ACCEPTED_WITH = ['Payments', 'Preview', 'Activity Log', 'Library'];
const ACCEPTED_WITHOUT = ['Preview', 'Activity Log', 'Library'];

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u52${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account's password (the username twice). */
const pw = (username) => `${username}${username}`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/** The scratch journal's name and its principal contact's address. */
const journalName = (tag) => `Journal ${tag}`;
const contactOf = (tag) => `${tag}pc@mail.test`;

/** A scratch journal named after the tag, with its own principal contact. */
async function seedJournal(ojsApi, tag, keys) {
    return ojsApi.createContext({
        tag,
        context: {name: journalName(tag), contactName: CONTACT_NAME, contactEmail: contactOf(tag)},
        ...keys,
    });
}

/** "Tidal Patterns" on the scratch journal. */
async function seedTidalPatterns(ojsApi, tag, submitter, extra = {}) {
    const seeded = await ojsApi.createSubmission({tag, context: tag, submitter, title: TITLE, ...extra});
    return seeded.submissionId;
}

/** An actor's page (an `asUser` context), its browser questions recorded. */
async function actorPage(asUser, username) {
    const page = await (await asUser(username)).newPage();
    return {page, dialogs: recordDialogs(page)};
}

/** The date the server writes today (UTC, the config's zone). */
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Open "Tidal Patterns" from the Dashboard and read the header's buttons,
 * left to right, once the version has loaded (the header fills in with it).
 */
async function expectHeader(page, tag, submissionId, labels) {
    const workflow = new WorkflowPage(page, tag);
    await workflow.gotoEditorial(submissionId);
    await workflow.expectVersionLoaded();
    await workflow.expectHeaderButtons(labels);
    return workflow;
}

/**
 * Record "Accept and Skip Review" with "Request publication fee (50 USD)"
 * kept chosen on its "Request Payment" page (Rules 5, 8; U34's Rule 16):
 * the page is read, then "Continue" twice and "Record Decision".
 */
async function acceptRequestingFee(page, tag, submissionId) {
    const workflow = new WorkflowPage(page, tag);
    await workflow.gotoEditorial(submissionId);
    await workflow.actionButton('Accept and Skip Review').click();
    const wizard = new DecisionWizardPage(page);
    await wizard.expectTitle('Accept and Skip Review: Request Payment');
    await expect(wizard.currentStep().getByRole('radio')).toHaveCount(2);
    await expect(wizard.paymentRadio(REQUEST_50)).toBeChecked();
    await expect(wizard.paymentRadio(TEXT.waive)).toBeVisible();
    await expect(wizard.paymentRadio(TEXT.waive)).not.toBeChecked();
    await wizard.continueStep();
    await wizard.expectTitle('Accept and Skip Review: Notify Authors');
    await wizard.continueStep();
    await wizard.expectTitle('Accept and Skip Review: Select Files');
    await wizard.recordDecision('Skipped Review');
    await wizard.viewSubmissionSummary();
    await workflow.expectOpen(submissionId);
}

/**
 * From the stage view, "Schedule For Publication" to the publication
 * page, then its own "Schedule For Publication" to the window the journal
 * answers with: through "Review Publishing Details" when it opens (its
 * version boxes filled, then "Confirm"), straight when the version's
 * details were confirmed before. Returns the window, open (Rule 15; U49's
 * Rule 7).
 */
async function openPublishWindow(page, tag, submissionId) {
    const workflow = new WorkflowPage(page, tag);
    await workflow.gotoEditorial(submissionId);
    await workflow.pressShortcutToPage('Schedule For Publication', 'Title & Abstract');
    const publish = new PublishScreen(page, tag);
    const window = page
        .getByRole('dialog')
        .filter({hasText: /The following requirements must be met before this can be published\.|All publication requirements have been met\./})
        .last();
    const panel = await publish.pressPublish({or: window});
    if (panel) {
        await publish.fillVersionDetails(panel);
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    }
    await expect(window).toBeVisible({timeout: 30_000});
    return {publish, window};
}

/** The window lists the unpaid fee (Rule 15). */
async function expectPublishingRefused(page, tag, submissionId) {
    const {publish, window} = await openPublishWindow(page, tag, submissionId);
    await expect(window.getByText(TEXT.feeNotPaid)).toBeVisible();
    await publish.closeWindow(window);
}

/** The window lists no unpaid fee: every requirement is met (the positive control). */
async function expectPublishingAllowed(page, tag, submissionId) {
    const {publish, window} = await openPublishWindow(page, tag, submissionId);
    await expect(window.getByText(ALL_MET)).toBeVisible();
    await expect(window.getByText(TEXT.feeNotPaid)).toHaveCount(0);
    await publish.closeWindow(window);
}

/** A message's plain text, white space collapsed. */
async function mailText(pkpMail, message) {
    return flat((await pkpMail.fullMessage(message.ID)).Text);
}

/** The payment page's address the "Payment Request Notification" links to, as a path on this server. */
async function paymentLinkOf(pkpMail, message) {
    const html = (await pkpMail.fullMessage(message.ID)).HTML || '';
    const href = [...html.matchAll(/href=(["'])([^"']+)\1/g)].map((m) => m[2].replace(/&amp;/g, '&')).find((h) => /\/payment\/pay\/\d+/.test(h));
    expect(href, 'the email links to a payment page').toBeTruthy();
    const url = new URL(/** @type {string} */ (href));
    return `${url.pathname}${url.search}`;
}

/** The Author's Tasks panel on My Submissions, its fee task pressed (Rules 8, 9). */
async function pressFeeTask(page, tag) {
    await page.goto(`/index.php/${tag}/dashboard/mySubmissions`);
    const tasks = new TasksPanel(page);
    await tasks.open();
    const row = tasks.row(TEXT.feeDue).filter({hasText: TITLE});
    await expect(row).toHaveCount(1);
    await expect(tasks.sentence(row)).toHaveText(TEXT.feeDue);
    await expect(tasks.title(row)).toHaveText(TITLE);
    await tasks.openTask(row);
    await page.waitForURL((u) => /\/payment\/pay\/\d+$/.test(u.pathname), {waitUntil: 'commit', timeout: 30_000});
    return new PayerPage(page, tag);
}

/** The manual page for the APC: heading, "Title", "Fee" and "Send notification of payment" (Fields). */
async function expectApcManualPage(payer) {
    await payer.expectOpen();
    await expect(payer.value('Title')).toHaveText(TEXT.publicationFee);
    await expect(payer.value('Fee')).toHaveText('50.00 (USD)');
    await expect(payer.notifyLink()).toBeVisible();
}

test.describe('Payments & APCs', () => {
    test('S1: payments switched on, set up and switched off', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s1', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        await seedJournal(ojsApi, tag, {
            users: [user(manager, 'Mira', 'Manager', ['manager']), user(author, 'Ava', 'Author', ['author'])],
            payments: {enabled: false, publicationFee: 50},
        });
        const submissionId = await seedTidalPatterns(ojsApi, tag, author);
        const {page} = await actorPage(asUser, manager);
        const tab = new PaymentSettingsTab(page, tag);
        const side = new EditorialSideMenu(page);

        // ── Payments off ─────────────────────────────────────────────────
        // The header offers no "Payments" (Rule 5).
        await expectHeader(page, tag, submissionId, HEADER_WITHOUT);

        // ── The tab ──────────────────────────────────────────────────────
        // Only "Enable", its one box unticked, reading the journal's
        // sentence (Fields); the side menu has neither "Institutions" nor
        // "Payments" (control: "Distribution" is there).
        await tab.goto();
        await expect(tab.groupHeadings()).toHaveText([TEXT.groups.setup]);
        await expect(tab.enableLegend()).toHaveText(TEXT.enable);
        await expect(tab.enableLabel()).toHaveText(TEXT.enableJournal);
        await expect(tab.enableBox()).not.toBeChecked();
        await expect(tab.controls()).toHaveCount(1);
        await expect(side.entry('Distribution').first()).toBeAttached();
        await expect(side.entry('Institutions')).toHaveCount(0);
        await expect(side.entry('Payments')).toHaveCount(0);

        // ── "Enable" ticked ──────────────────────────────────────────────
        // "Setup" holds "Enable", "Currency" (none chosen) and "Payment
        // Plugins" (none chosen); then "Manual Fee Payment" with its
        // instructions and "Paypal Fee Payment" with "Test Mode", "Account
        // Name", "Client ID" and "Secret" (masked) (Fields).
        await tab.enableBox().check();
        await expect(tab.groupHeadings()).toHaveText([TEXT.groups.setup, TEXT.groups.manual, TEXT.groups.paypal]);
        const setup = tab.group(TEXT.groups.setup);
        await expect(setup.locator('legend, label.pkpFormFieldLabel')).toHaveText([TEXT.enable, TEXT.currency, TEXT.plugins]);
        await expect(tab.currencySelect()).toBeVisible();
        expect(await tab.chosenOption(tab.currencySelect())).toBe('');
        expect(await tab.chosenOption(tab.pluginSelect())).toBe('');
        await expect(tab.pluginSelect().locator('option')).toHaveText([TEXT.manualMethod, TEXT.paypalMethod]);
        const manual = tab.group(TEXT.groups.manual);
        await expect(manual.locator('label.pkpFormFieldLabel')).toHaveText([TEXT.instructions]);
        await expect(tab.instructionsBox()).toHaveValue('');
        const paypal = tab.group(TEXT.groups.paypal);
        await expect(paypal.locator('legend, label.pkpFormFieldLabel')).toHaveText([TEXT.testMode, TEXT.accountName, TEXT.clientId, TEXT.secret]);
        await expect(tab.testModeBox()).not.toBeChecked();
        await expect(paypal.getByRole('checkbox', {name: TEXT.enable, exact: true})).toBeVisible();
        for (const box of [tab.accountNameBox(), tab.clientIdBox(), tab.secretBox()]) {
            await expect(box).toHaveValue('');
        }
        await expect(tab.secretBox()).toHaveAttribute('type', 'password');
        await expect(tab.controls()).toHaveCount(8);

        // ── "Enable" alone ───────────────────────────────────────────────
        // "Save": "Saved", and the side menu gains "Institutions" and
        // "Payments" on the same page (Rule 1); the header still offers no
        // "Payments", since no method is set up (Rules 2, 5).
        await tab.save();
        await expect(side.entry('Institutions')).toHaveCount(1);
        await expect(side.entry('Payments')).toHaveCount(1);
        await expectHeader(page, tag, submissionId, HEADER_WITHOUT);

        // ── Set up with "Manual Fee Payment" ─────────────────────────────
        // The US dollar, the manual method and its instructions, "Save":
        // kept after a reload (Rule 1); the header offers "Payments", left
        // of its other buttons (Rule 5; Fields).
        await tab.goto();
        await expect(tab.enableBox()).toBeChecked();
        await tab.currencySelect().selectOption('USD');
        await tab.pluginSelect().selectOption({label: TEXT.manualMethod});
        await tab.instructionsBox().fill(INSTRUCTIONS);
        await tab.save();
        await tab.reload();
        await expect(tab.enableBox()).toBeChecked();
        await expect(tab.currencySelect()).toHaveValue('USD');
        expect(await tab.chosenOption(tab.currencySelect())).toBe('US Dollar');
        expect(await tab.chosenOption(tab.pluginSelect())).toBe(TEXT.manualMethod);
        await expect(tab.instructionsBox()).toHaveValue(INSTRUCTIONS);
        await expectHeader(page, tag, submissionId, HEADER_WITH);

        // ── "Enable" unticked ────────────────────────────────────────────
        // Every field but "Enable" hides; "Save": "Saved", and the side
        // menu loses "Payments" on the same page (Rule 1). Ticked again
        // unsaved, the fields show as they were (Rule 1). After a reload
        // "Enable" reads unticked (the tick was not saved) and the side
        // menu holds neither entry. "Institutions" stays on the same page
        // until that reload (T-ojs-1), so its same-page absence is not
        // asserted.
        await tab.goto();
        await tab.enableBox().uncheck();
        await expect(tab.groupHeadings()).toHaveText([TEXT.groups.setup]);
        await expect(tab.controls()).toHaveCount(1);
        await tab.save();
        await expect(side.entry('Payments')).toHaveCount(0);
        await expect(side.entry('Distribution').first()).toBeAttached();
        await tab.enableBox().check();
        await expect(tab.currencySelect()).toHaveValue('USD');
        expect(await tab.chosenOption(tab.pluginSelect())).toBe(TEXT.manualMethod);
        await expect(tab.instructionsBox()).toHaveValue(INSTRUCTIONS);
        await tab.reload();
        await expect(tab.enableBox()).not.toBeChecked();
        await expect(tab.controls()).toHaveCount(1);
        await expect(side.entry('Distribution').first()).toBeAttached();
        await expect(side.entry('Institutions')).toHaveCount(0);
        await expect(side.entry('Payments')).toHaveCount(0);

        // ── Control ──────────────────────────────────────────────────────
        // With "Enable" saved unticked the header offers no "Payments"
        // again (Rules 2, 5).
        await expectHeader(page, tag, submissionId, HEADER_WITHOUT);
    });

    test('S2: setting the fees on "Payment Types"', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s2', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        await seedJournal(ojsApi, tag, {
            users: [user(manager, 'Mira', 'Manager', ['manager']), user(author, 'Ava', 'Author', ['author'])],
            payments: PAY,
        });
        const submissionId = await seedTidalPatterns(ojsApi, tag, author);
        const {page, dialogs} = await actorPage(asUser, manager);
        const payments = new JournalPaymentsPage(page, tag);

        // ── The tab ──────────────────────────────────────────────────────
        // The side menu's "Payments", then "Payment Types": "Author Fees"
        // with its sentence and "Article Processing Charge"; "Reader Fees"
        // with "Purchase Issue" and "Purchase Article"; the PDF box;
        // "General Fees" with "Association Membership"; every box empty,
        // the tick box unticked (Fields; Settings bullets 6–8).
        await page.goto(`/index.php/${tag}/dashboard/editorial`);
        await payments.openFromSideMenu();
        let types = await payments.showPaymentTypes();
        await expect(types.form().locator('div.section:not(.formButtons)')).toHaveText([
            new RegExp(`^\\s*${TEXT.authorFees}`),
            new RegExp(`^\\s*${TEXT.readerFees}`),
            new RegExp(`^\\s*${TEXT.restrictOnlyPdf}`),
            new RegExp(`^\\s*${TEXT.generalFees}`),
        ]);
        await expect(types.sectionSentence(TEXT.authorFees)).toHaveText(TEXT.authorFeesSentence);
        await expect(types.section(TEXT.authorFees).getByRole('textbox')).toHaveCount(1);
        await expect(types.section(TEXT.authorFees).getByRole('textbox', {name: TEXT.apc, exact: true})).toBeVisible();
        await expect(types.section(TEXT.readerFees).getByRole('textbox')).toHaveCount(2);
        await expect(types.section(TEXT.readerFees).getByRole('textbox', {name: TEXT.purchaseIssue, exact: true})).toBeVisible();
        await expect(types.section(TEXT.readerFees).getByRole('textbox', {name: TEXT.purchaseArticle, exact: true})).toBeVisible();
        await expect(types.section(TEXT.generalFees).getByRole('textbox')).toHaveCount(1);
        await expect(types.section(TEXT.generalFees).getByRole('textbox', {name: TEXT.membership, exact: true})).toBeVisible();
        await expect(types.boxes()).toHaveCount(4);
        for (const label of [TEXT.apc, TEXT.purchaseIssue, TEXT.purchaseArticle, TEXT.membership]) {
            await expect(types.box(label)).toHaveValue('');
        }
        await expect(types.restrictOnlyPdfBox()).not.toBeChecked();

        // ── A fee refused ────────────────────────────────────────────────
        // "abc" and "5", "Save": the refusal at the top and under
        // "Article Processing Charge" alone; both boxes keep what was
        // typed; after a reload both are empty (Rule 4).
        await types.type(TEXT.apc, 'abc');
        await types.type(TEXT.purchaseArticle, '5');
        await types.save();
        await expect(types.formError()).toContainText(TEXT.formError);
        await expect(types.formError()).toContainText(TEXT.costsPositive);
        await expect(types.errorUnder(TEXT.apc)).toHaveText(TEXT.costsPositive);
        await expect(types.errorsUnderBoxes()).toHaveCount(1);
        await expect(types.box(TEXT.apc)).toHaveValue('abc');
        await expect(types.box(TEXT.purchaseArticle)).toHaveValue('5');
        await expect(types.savedNotice()).toHaveCount(0);
        await payments.reload();
        types = await payments.showPaymentTypes();
        await expect(types.box(TEXT.apc)).toHaveValue('');
        await expect(types.box(TEXT.purchaseArticle)).toHaveValue('');

        // ── Other refusals ───────────────────────────────────────────────
        // "-5", then "10,50": each refused with the same messages (Rule 4).
        for (const value of ['-5', '10,50']) {
            await types.type(TEXT.apc, value);
            await types.save();
            await expect(types.box(TEXT.apc)).toHaveValue(value);
            await expect(types.formError()).toContainText(TEXT.formError);
            await expect(types.formError()).toContainText(TEXT.costsPositive);
            await expect(types.errorUnder(TEXT.apc)).toHaveText(TEXT.costsPositive);
            await expect(types.savedNotice()).toHaveCount(0);
        }

        // ── Leaving unsaved, "Cancel" ────────────────────────────────────
        // "33", then the tab "Payments": the question; "Cancel" stays on
        // "Payment Types" with "33" (Rule 4a).
        await payments.reload();
        types = await payments.showPaymentTypes();
        await types.type(TEXT.apc, '33');
        dialogs.clear();
        dialogs.answerNext('dismiss');
        await payments.tab('Payments').click();
        await expect.poll(() => dialogs.entries.map((e) => `${e.type}: ${e.message}`)).toEqual([`confirm: ${TEXT.formChanged}`]);
        await expect(payments.tab('Payment Types')).toHaveAttribute('aria-selected', 'true');
        await expect(payments.tab('Payments')).toHaveAttribute('aria-selected', 'false');
        await expect(types.box(TEXT.apc)).toHaveValue('33');

        // ── Leaving unsaved, "OK" ────────────────────────────────────────
        // The tab "Payments" again, "OK": the list's columns, "No Items"
        // and "0 - 0 of 0 items" (Fields); back on "Payment Types" the box
        // is empty (Rule 4a).
        dialogs.clear();
        dialogs.answerNext('accept');
        await payments.tab('Payments').click();
        await expect.poll(() => dialogs.entries.map((e) => `${e.type}: ${e.message}`)).toEqual([`confirm: ${TEXT.formChanged}`]);
        await expect(payments.tab('Payments')).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        await expect(payments.listColumns()).toHaveText(TEXT.listColumns, {timeout: 30_000});
        await expect(payments.listNoItems()).toBeVisible();
        await expect(payments.listRows()).toHaveCount(0);
        await expect(payments.listPaging()).toHaveText(TEXT.emptyPaging);
        types = await payments.showPaymentTypes();
        await expect(types.box(TEXT.apc)).toHaveValue('');

        // ── Leaving the page ─────────────────────────────────────────────
        // "33" again and a reload: the browser asks whether to leave;
        // left, the box is empty (Rule 4a).
        await types.type(TEXT.apc, '33');
        dialogs.clear();
        await payments.reload();
        await expect.poll(() => dialogs.types()).toEqual(['beforeunload']);
        types = await payments.showPaymentTypes();
        await expect(types.box(TEXT.apc)).toHaveValue('');

        // ── Saved ────────────────────────────────────────────────────────
        // "1e3", "Save": "Your changes have been saved."; after a reload
        // "1000". "12.50": after a reload "12.5" (Rule 4).
        await types.type(TEXT.apc, '1e3');
        await types.save();
        await expect(types.savedNotice()).toBeVisible();
        await expect(types.formError()).toHaveCount(0);
        await payments.reload();
        types = await payments.showPaymentTypes();
        await expect(types.box(TEXT.apc)).toHaveValue('1000');
        await types.type(TEXT.apc, '12.50');
        await types.save();
        await expect(types.savedNotice()).toBeVisible();
        await payments.reload();
        types = await payments.showPaymentTypes();
        await expect(types.box(TEXT.apc)).toHaveValue('12.5');

        // ── The fee in force ─────────────────────────────────────────────
        // "Tidal Patterns"'s header offers "Payments" (Rule 5).
        await expectHeader(page, tag, submissionId, HEADER_WITH);

        // ── Control ──────────────────────────────────────────────────────
        // "0", "Save": the box still reads "0", and after a reload it is
        // empty; the header offers no "Payments" (Rules 4, 5).
        await payments.goto();
        types = await payments.showPaymentTypes();
        await types.type(TEXT.apc, '0');
        await types.save();
        await expect(types.savedNotice()).toBeVisible();
        await expect(types.box(TEXT.apc)).toHaveValue('0');
        await payments.reload();
        types = await payments.showPaymentTypes();
        await expect(types.box(TEXT.apc)).toHaveValue('');
        await expectHeader(page, tag, submissionId, HEADER_WITHOUT);
    });

    test('S3: the APC requested and paid with the manual method', async ({asUser, ojsApi, pkpMail, page}, testInfo) => {
        test.setTimeout(360_000);
        const tag = makeTag('s3', testInfo);
        const editor = `${tag}se`;
        const author = `${tag}au`;
        const coauthor = `${tag}co`;
        const reader = `${tag}rd`;
        const contact = contactOf(tag);
        const journal = journalName(tag);
        await seedJournal(ojsApi, tag, {
            users: [
                user(editor, 'Sam', 'Editor', ['sectionEditor']),
                user(author, 'Ava', 'Author', ['author']),
                user(coauthor, 'Ben', 'Second', ['author']),
                user(reader, 'Rita', 'Reader', ['reader']),
            ],
            payments: {...PAY, manualInstructions: 'Pay by bank transfer.\nAccount 123.', publicationFee: 50},
            publishingMode: 'subscription',
            subscriptionTypes: [{name: 'Online Year', cost: 40, currency: 'USD', duration: 12}],
            issues: [{volume: 1, number: 1, year: 2026, published: true}],
        });
        const submissionId = await seedTidalPatterns(ojsApi, tag, author, {
            participants: [
                {username: editor, role: 'sectionEditor'},
                {username: coauthor, role: 'author'},
            ],
        });
        const {page: editorPage} = await actorPage(asUser, editor);
        const menu = new WorkflowPaymentsMenu(editorPage);

        // ── "Request Payment" ────────────────────────────────────────────
        // "Accept and Skip Review" opens on "Request Payment" with
        // "Request publication fee (50 USD)" chosen and "Waive"; the
        // decision is recorded with the fee requested (Rules 5, 8).
        await acceptRequestingFee(editorPage, tag, submissionId);

        // ── The editorial side ───────────────────────────────────────────
        // "Publication Fee" reads "Unpaid" (Rules 8, 13).
        await menu.open();
        await menu.expectChosen('Unpaid');
        await menu.close();

        // ── The Authors' emails ──────────────────────────────────────────
        // Each Author: one "Payment Request Notification" from the
        // principal contact, "Dear {name}", the title and the journal, the
        // payment link, the guidelines line and the signature (Side
        // effects).
        let paymentPath = '';
        for (const [username, name] of [
            [author, 'Ava Author'],
            [coauthor, 'Ben Second'],
        ]) {
            const message = await pkpMail.find({to: mailOf(username), subject: TEXT.paymentRequestSubject});
            expect(message.From).toEqual({Name: CONTACT_NAME, Address: contact});
            const text = await mailText(pkpMail, message);
            expect(text.startsWith(`Dear ${name},`), text).toBe(true);
            expect(text).toContain(`Congratulations on the acceptance of your submission, ${TITLE}, to ${journal}.`);
            expect(text).toMatch(/To make the payment, please visit \S+\/payment\/pay\/\d+\./);
            expect(text).toContain('If you have any questions, please see our Submission Guidelines');
            expect(text).toContain(`— This is an automated message from ${journal}`);
            expect(await pkpMail.count({to: mailOf(username), subject: TEXT.paymentRequestSubject})).toBe(1);
            if (username === author) {
                paymentPath = await paymentLinkOf(pkpMail, message);
            }
        }

        // ── Signed out ───────────────────────────────────────────────────
        // The email's link opens the Login page; signed in there, the
        // payment page (Rule 9).
        await page.goto(paymentPath);
        await page.waitForURL((u) => /\/login$/.test(u.pathname), {waitUntil: 'commit', timeout: 30_000});
        const login = new LoginPage(page);
        await login.expectForm();
        await login.submitCredentials(author, pw(author));
        await page.waitForURL((u) => /\/payment\/pay\/\d+$/.test(u.pathname), {waitUntil: 'commit', timeout: 30_000});

        // ── The manual page ──────────────────────────────────────────────
        // "Manual Fee Payment": "Publication Fee", "50.00 (USD)", the
        // instructions on two lines, "Send notification of payment"
        // (Fields).
        const payer = new PayerPage(page, tag);
        await expectApcManualPage(payer);
        await expect.poll(() => payer.instructionsText().then((t) => t.split('\n').map((l) => l.trim()))).toEqual([
            'Pay by bank transfer.',
            'Account 123.',
        ]);

        // ── "Send notification of payment" ───────────────────────────────
        // "Payment Notification" with "Payment notification sent" and
        // "Continue" (Rule 10); the principal contact gets "Manual Payment
        // Notification" from the Author's own name and address (Side
        // effects).
        await payer.sendNotification();
        await expect(payer.notificationMessage()).toHaveText(TEXT.notificationSent);
        await expect(payer.continueLink()).toBeVisible();
        const fromAuthor = await pkpMail.find({to: contact, subject: TEXT.manualNotificationSubject, contains: author});
        expect(fromAuthor.From).toEqual({Name: 'Ava Author', Address: mailOf(author)});
        const authorText = await mailText(pkpMail, fromAuthor);
        expect(authorText).toContain(`A manual payment needs to be processed for the journal ${journal} and the user "${author}".`);
        expect(authorText).toContain('The item being paid for is "Publication Fee".');

        // ── The Author's workflow ────────────────────────────────────────
        // "Continue": My Submissions with the workflow open; its header
        // offers no "Payments" (Rule 10; Actors row 4).
        await payer.continueLink().click();
        await page.waitForURL((u) => /\/dashboard\/mySubmissions$/.test(u.pathname), {waitUntil: 'commit', timeout: 30_000});
        const authorWorkflow = new WorkflowPage(page, tag);
        await authorWorkflow.expectOpen(submissionId);
        await authorWorkflow.expectVersionLoaded();
        await authorWorkflow.expectHeaderButtons(['Library']);

        // ── The second Author's task ─────────────────────────────────────
        // The task under "Tidal Patterns" opens the same manual page; its
        // notification names the second Author (Rules 8–10).
        const {page: coPage} = await actorPage(asUser, coauthor);
        const coPayer = await pressFeeTask(coPage, tag);
        await expectApcManualPage(coPayer);
        await coPayer.sendNotification();
        const fromCoauthor = await pkpMail.find({to: contact, subject: TEXT.manualNotificationSubject, contains: coauthor});
        expect(fromCoauthor.From).toEqual({Name: 'Ben Second', Address: mailOf(coauthor)});
        expect(await mailText(pkpMail, fromCoauthor)).toContain(`and the user "${coauthor}".`);

        // ── A Reader's subscription ──────────────────────────────────────
        // "My Subscriptions", "Purchase New Subscription", "Online Year",
        // "Save": the manual page for "Subscription Fee (Online Year)",
        // "40.00 (USD)"; notified, "Continue" opens the current issue
        // (Rule 10); the contact gets a third notification, from the
        // Reader (Side effects).
        const {page: readerPage} = await actorPage(asUser, reader);
        const my = new MySubscriptionsPage(readerPage, tag);
        await my.goto();
        await my.purchaseLink(my.individualPart()).click();
        const purchase = new PurchasePage(readerPage, tag);
        await expect(purchase.form()).toBeVisible({timeout: 30_000});
        await purchase.typeSelect().selectOption({label: 'Online Year (40.00 USD)'});
        await expect(purchase.submitButton()).toHaveText('Save');
        await purchase.submit();
        const readerPayer = new PayerPage(readerPage, tag);
        await readerPayer.expectOpen();
        await expect(readerPayer.value('Title')).toHaveText('Subscription Fee (Online Year)');
        await expect(readerPayer.value('Fee')).toHaveText('40.00 (USD)');
        await readerPayer.sendNotification();
        await readerPayer.continueLink().click();
        await readerPage.waitForURL((u) => /\/issue\/view\/\d+$/.test(u.pathname), {waitUntil: 'commit', timeout: 30_000});
        await expect(readerPayer.main().locator('h1').first()).toHaveText(ISSUE);
        const fromReader = await pkpMail.find({to: contact, subject: TEXT.manualNotificationSubject, contains: reader});
        expect(fromReader.From).toEqual({Name: 'Rita Reader', Address: mailOf(reader)});
        expect(await pkpMail.count({to: contact, subject: TEXT.manualNotificationSubject})).toBe(3);

        // ── Control ──────────────────────────────────────────────────────
        // "Publication Fee" still reads "Unpaid": the notifications
        // recorded nothing (Rule 11).
        const workflow = new WorkflowPage(editorPage, tag);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectVersionLoaded();
        await menu.open();
        await menu.expectChosen('Unpaid');
    });

    test('S4: the APC recorded as paid, waived and unpaid, and publishing', async ({asUser, ojsApi, pkpMail, page}, testInfo) => {
        test.setTimeout(360_000);
        const tag = makeTag('s4', testInfo);
        const manager = `${tag}mg`;
        const editor = `${tag}se`;
        const author = `${tag}au`;
        await seedJournal(ojsApi, tag, {
            users: [
                user(manager, 'Mira', 'Manager', ['manager']),
                user(editor, 'Sam', 'Editor', ['sectionEditor']),
                user(author, 'Ava', 'Author', ['author']),
            ],
            payments: {...PAY, publicationFee: 50},
        });
        const submissionId = await seedTidalPatterns(ojsApi, tag, author, {
            decisions: ['skipExternalReview', 'sendToProduction'],
            participants: [{username: editor, role: 'sectionEditor'}],
        });
        const {page: editorPage} = await actorPage(asUser, editor);
        const {page: managerPage} = await actorPage(asUser, manager);
        const menu = new WorkflowPaymentsMenu(editorPage);
        const payments = new JournalPaymentsPage(managerPage, tag);

        /**
         * The Journal Manager's list of payments, loaded afresh (by its
         * address: the Manager also takes the publish windows, T-ojs-2).
         */
        const reloadList = async () => {
            await payments.goto();
            await payments.showTab('Payments');
            await expect(payments.listColumns()).toHaveText(TEXT.listColumns, {timeout: 30_000});
        };

        // ── The menu ─────────────────────────────────────────────────────
        // "Payments" first in the header; its panel holds "Publication
        // Fee" with "Waived", "Paid" and "Unpaid", "Unpaid" chosen, and
        // "Save" (Fields; Rule 13).
        const workflow = await expectHeader(editorPage, tag, submissionId, ACCEPTED_WITH);
        await workflow.expectStage('Production');
        await menu.open();
        await expect(menu.choice()).toBeVisible();
        await expect(menu.optionLabels()).toHaveText(TEXT.feeOptions);
        await menu.expectChosen('Unpaid');
        await expect(menu.saveButton()).toBeVisible();
        await menu.close();

        // ── Publishing refused ───────────────────────────────────────────
        // The window lists "Publication Fee not paid…" (Rule 15). Every
        // publish window is the Journal Manager's: the Section Editor's
        // publication page offers no "Schedule For Publication" (T-ojs-2).
        await expectPublishingRefused(managerPage, tag, submissionId);

        // ── "Paid" ───────────────────────────────────────────────────────
        // "Saved"; after a reload "Paid" is chosen (Rules 13, 14); the
        // window no longer lists the fee (Rule 15).
        await menu.saveOption('Paid');
        await editorPage.reload();
        await workflow.expectOpen(submissionId);
        await workflow.expectVersionLoaded();
        await menu.open();
        await menu.expectChosen('Paid');
        await menu.close();
        await expectPublishingAllowed(managerPage, tag, submissionId);

        // ── The list of payments ─────────────────────────────────────────
        // One row: the submitting Author, "Publication Fee", "50 USD",
        // today's date and time (Rules 14, 17; Fields).
        await managerPage.goto(`/index.php/${tag}/dashboard/editorial`);
        await payments.openFromSideMenu();
        await payments.showTab('Payments');
        await expect(payments.listColumns()).toHaveText(TEXT.listColumns, {timeout: 30_000});
        const paid = await payments.onlyRowCells();
        expect(paid.slice(0, 3)).toEqual(['Ava Author', TEXT.publicationFee, '50 USD']);
        expect(paid[3]).toMatch(new RegExp(`^${today()} \\d{2}:\\d{2}:\\d{2}$`));

        // ── "Paid" saved again ───────────────────────────────────────────
        // The same one row, the same "Timestamp" (Rule 14).
        await workflow.gotoEditorial(submissionId);
        await workflow.expectVersionLoaded();
        await menu.saveOption('Paid');
        await reloadList();
        expect(await payments.onlyRowCells()).toEqual(paid);

        // ── "Waived" ─────────────────────────────────────────────────────
        // One row: the Section Editor, "Publication Fee", "0" (Rules 14,
        // 17); the window lists no unpaid fee (Rule 15).
        await menu.saveOption('Waived');
        await reloadList();
        const waived = await payments.onlyRowCells();
        expect(waived.slice(0, 3)).toEqual(['Sam Editor', TEXT.publicationFee, '0']);
        await expectPublishingAllowed(managerPage, tag, submissionId);

        // ── "Unpaid" ─────────────────────────────────────────────────────
        // "No Items" (Rule 14); the window lists the unpaid fee again
        // (Rule 15).
        await menu.saveOption('Unpaid');
        await reloadList();
        await expect(payments.listNoItems()).toBeVisible();
        await expect(payments.listRows()).toHaveCount(0);
        await expectPublishingRefused(managerPage, tag, submissionId);

        // ── Control ──────────────────────────────────────────────────────
        // No email to the submitting Author, the Section Editor, the
        // Journal Manager or the principal contact, bounded by a password
        // reset asked afterwards for the Journal Manager, whose inbox then
        // holds that one message (Rule 14; Side effects; A8).
        await page.goto(`/index.php/${tag}/login/lostPassword`);
        await page.locator('form#lostPasswordForm input#email').fill(mailOf(manager));
        await page.locator('form#lostPasswordForm').getByRole('button', {name: 'Reset Password'}).click();
        await pkpMail.find({to: mailOf(manager), subject: 'Password Reset Confirmation'});
        expect(await pkpMail.count({to: mailOf(manager)}), 'the manager received the control alone').toBe(1);
        for (const address of [mailOf(author), mailOf(editor), contactOf(tag)]) {
            expect(await pkpMail.count({to: address}), `no mail to ${address}`).toBe(0);
        }
    });

    test('S5: "Paypal Fee Payment" chosen after the APC was requested', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        await seedJournal(ojsApi, tag, {
            users: [user(manager, 'Mira', 'Manager', ['manager']), user(author, 'Ava', 'Author', ['author'])],
            payments: {...PAY, publicationFee: 50},
        });
        const submissionId = await seedTidalPatterns(ojsApi, tag, author);
        const {page: managerPage} = await actorPage(asUser, manager);
        const {page: authorPage} = await actorPage(asUser, author);
        const tab = new PaymentSettingsTab(managerPage, tag);

        // Given: the APC requested on screen (s0), the Author's task there.
        await acceptRequestingFee(managerPage, tag, submissionId);
        const before = await pressFeeTask(authorPage, tag);
        await expectApcManualPage(before);

        // ── PayPal with no "Account Name" ────────────────────────────────
        // "Saved"; the header offers no "Payments" (Rules 2, 5).
        await tab.goto();
        await tab.pluginSelect().selectOption({label: TEXT.paypalMethod});
        await tab.save();
        await expectHeader(managerPage, tag, submissionId, ACCEPTED_WITHOUT);

        // ── "Account Name" ───────────────────────────────────────────────
        // "test", "Saved"; the header offers "Payments" again (Rules 2, 5;
        // Settings bullet 5).
        await tab.goto();
        expect(await tab.chosenOption(tab.pluginSelect())).toBe(TEXT.paypalMethod);
        await tab.accountNameBox().fill('test');
        await tab.save();
        await expectHeader(managerPage, tag, submissionId, ACCEPTED_WITH);

        // ── The Author's page ────────────────────────────────────────────
        // The task opens the PayPal error sentence, not the manual page
        // (Rules 3, 9).
        const paypal = await pressFeeTask(authorPage, tag);
        await expect(paypal.transactionError()).toBeVisible({timeout: 30_000});
        await expect(paypal.manualHeading()).toHaveCount(0);
        await expect(paypal.notifyLink()).toHaveCount(0);

        // ── "Test Mode" ──────────────────────────────────────────────────
        // Ticked and saved: the same error (Settings bullet 5).
        await tab.goto();
        await tab.testModeBox().check();
        await tab.save();
        const testMode = await pressFeeTask(authorPage, tag);
        await expect(testMode.transactionError()).toBeVisible({timeout: 30_000});
        await expect(testMode.manualHeading()).toHaveCount(0);

        // ── Control ──────────────────────────────────────────────────────
        // "Manual Fee Payment" saved: the task opens the manual page for
        // "Publication Fee", "50.00 (USD)" (Rule 3).
        await tab.goto();
        await tab.pluginSelect().selectOption({label: TEXT.manualMethod});
        await tab.save();
        const manual = await pressFeeTask(authorPage, tag);
        await expectApcManualPage(manual);
        await expect(manual.transactionError()).toHaveCount(0);
    });
});
