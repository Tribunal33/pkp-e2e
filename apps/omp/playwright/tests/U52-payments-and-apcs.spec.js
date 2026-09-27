// @ts-check
/**
 * @file playwright/tests/U52-payments-and-apcs.spec.js
 *
 * Payments & APCs — OMP suite. A press does not install fees (the spec's
 * title badge is {OJS}), so the press runs the one scenario written for
 * it, S6 "The press's "Payments" tab, and no fees on a press" {OMP}, in
 * the press's own words: the Press Manager, a monograph on an external
 * review round, Settings › Distribution › "Payments" with the press's
 * "Enable" sentence, and the press's "Accept Submission". S1–S5 are the
 * journal's (OJS tree), S7 the preprint server's absence (OPS tree).
 * Spec: docs/specs/U52-payments-and-apcs.md
 *
 * S6's "Control" bullet is taken on a journal (scenario 1), which the OMP
 * fleet does not serve: the journal half (the same save adding
 * "Institutions" and "Payments" to the side menu, and with a fee
 * "Payments" to the workflow header) is the OJS suite's S1. Here each
 * absence is paired with what the press offers in the same place, read
 * the same way: the side menu's "Distribution", the workflow header's own
 * buttons, and the decision's own pages on its step rail (RUNBOOK
 * multi-app rule 3).
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1–A11: all on a journal's fee screens, which a press does not have.
 *
 * Returned as findings (`.reports/U52/test-omp-findings.md`): T-omp-1 (S6
 * reads the two method groups and the "Payment Plugins" options as sets;
 * a press never saved showed "Paypal Fee Payment" first).
 *
 * Seeding: scenario endpoints only; the seeded press publicknowledge and
 * the seeded roster are never touched. The test seeds its own scratch
 * press with a throwaway Press Manager and Author (the username twice as
 * password), and "Tidal Patterns" through the submission scenario with
 * `decisions: ['sendExternalReview']`, as footnote s0 says. The `payments`
 * key is OJS only (a press answers 400), so the press's tab is saved on
 * screen: that save is the behavior under test.
 *
 * Every absence is read settled (the tab once its form rendered, the side
 * menu after the save's answer and its "Saved", the workflow header once
 * its version loaded, the step rail once the wizard's heading showed) and
 * paired with a positive control taken the same way (M4, M6). The
 * browser's own questions are recorded and answered, and every server
 * failure or page script error on the way is collected and asserted
 * absent at the end. Waits are web-first or bounded by the screen's own
 * answer (A5). Runs in the parallel `omp` project: nothing here changes
 * anything outside the scratch press.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {EditorialSideMenu} = require('../../../../shared/playwright/pages/SubscriptionsPages.js');
const {PAYMENTS_TEXT: TEXT, PaymentSettingsTab, recordDialogs} = require('../../../../shared/playwright/pages/PaymentsPages.js');
const {DecisionWizardPage} = require('../pages/DecisionWizardPages.js');

const TITLE = 'Tidal Patterns';
const INSTRUCTIONS = 'Pay by bank transfer.';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u52${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/**
 * Collect what failed on `page`: every answer of 500 or more and every
 * uncaught page script error (the Frame: a failure is a finding whether
 * or not the screen shows it).
 */
function recordFailures(page) {
    /** @type {string[]} */
    const failures = [];
    page.on('response', (r) => {
        if (r.status() >= 500) {
            failures.push(`${r.status()} ${r.request().method()} ${r.url()}`);
        }
    });
    page.on('pageerror', (e) => failures.push(`page error: ${e.message}`));
    return failures;
}

test.describe('Payments & APCs', () => {
    test('S6: the press\'s "Payments" tab, and no fees on a press', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(180_000);
        const tag = makeTag('s6', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        await ompApi.createContext({
            tag,
            context: {name: `Press ${tag}`},
            users: [user(manager, 'Mira', 'Manager', ['manager']), user(author, 'Ava', 'Author', ['author'])],
        });
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: TITLE,
            decisions: ['sendExternalReview'],
        });

        const page = await (await asUser(manager)).newPage();
        const dialogs = recordDialogs(page);
        const failures = recordFailures(page);
        const tab = new PaymentSettingsTab(page, tag);
        const side = new EditorialSideMenu(page);

        // ── The tab ──────────────────────────────────────────────────────
        // Only "Enable", its one box unticked, reading the press's sentence
        // (Fields, the "Payments" tab). The side menu, read now, is the
        // "before" of the save below: "Distribution" is there, "Payments"
        // and "Institutions" are not.
        await tab.goto();
        await expect(tab.groupHeadings()).toHaveText([TEXT.groups.setup]);
        await expect(tab.enableLegend()).toHaveText(TEXT.enable);
        await expect(tab.enableLabel()).toHaveText(TEXT.enablePress);
        await expect(tab.enableBox()).not.toBeChecked();
        await expect(tab.controls()).toHaveCount(1);
        await expect(side.entry('Distribution').first()).toBeAttached();
        await expect(side.entry('Payments')).toHaveCount(0);
        await expect(side.entry('Institutions')).toHaveCount(0);
        const menuBefore = await side.labels();
        expect(menuBefore).toContain('Settings');

        // ── "Enable" ticked ──────────────────────────────────────────────
        // "Currency" with no currency chosen and "Payment Plugins" with
        // "Manual Fee Payment" already chosen (OMP1), then the groups
        // "Manual Fee Payment" with "Manual Payment Instructions" and
        // "Paypal Fee Payment" with "Test Mode", "Account Name", "Client ID"
        // and "Secret" (Fields, the "Payments" tab).
        // The two method groups and the list's two methods are read as
        // sets: on a press never saved they came "Paypal Fee Payment"
        // first, against the scenario's order (T-omp-1).
        await tab.enableBox().check();
        await expect(tab.groupHeadings()).toHaveCount(3);
        await expect(tab.groupHeadings().first()).toHaveText(TEXT.groups.setup);
        await expect.poll(async () => (await tab.groupHeadings().allInnerTexts()).map((t) => t.trim()).sort()).toEqual(
            [TEXT.groups.setup, TEXT.groups.manual, TEXT.groups.paypal].sort()
        );
        const setup = tab.group(TEXT.groups.setup);
        await expect(setup.locator('legend, label.pkpFormFieldLabel')).toHaveText([TEXT.enable, TEXT.currency, TEXT.plugins]);
        await expect(tab.currencySelect()).toBeVisible();
        await expect.poll(() => tab.chosenOption(tab.currencySelect())).toBe('');
        await expect.poll(() => tab.chosenOption(tab.pluginSelect())).toBe(TEXT.manualMethod);
        await expect(tab.pluginSelect().locator('option')).toHaveCount(2);
        await expect.poll(async () => (await tab.pluginSelect().locator('option').allInnerTexts()).map((t) => t.trim()).sort()).toEqual(
            [TEXT.manualMethod, TEXT.paypalMethod].sort()
        );
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
        await expect(tab.controls()).toHaveCount(8);

        // ── Saved ────────────────────────────────────────────────────────
        // The US dollar and "Pay by bank transfer.", "Save": "Saved", and
        // the side menu gains neither "Payments" nor "Institutions" (Rule
        // 1): read once the save has answered and "Saved" shows, it lists
        // exactly the entries it listed before, "Distribution" among them.
        await tab.currencySelect().selectOption('USD');
        await tab.instructionsBox().fill(INSTRUCTIONS);
        await tab.save();
        await expect(tab.savedStatus()).toHaveText(new RegExp(`^\\s*${TEXT.saved}\\s*$`));
        await expect(side.entry('Distribution').first()).toBeAttached();
        await expect(side.entry('Payments')).toHaveCount(0);
        await expect(side.entry('Institutions')).toHaveCount(0);
        await expect.poll(() => side.labels()).toEqual(menuBefore);

        // Reload: "Enable" ticked, the US dollar, "Manual Fee Payment" and
        // "Pay by bank transfer." still there (Rule 1); the reloaded side
        // menu still has neither entry.
        await tab.reload();
        await expect(tab.enableBox()).toBeChecked();
        await expect(tab.currencySelect()).toHaveValue('USD');
        await expect.poll(() => tab.chosenOption(tab.currencySelect())).toBe('US Dollar');
        await expect.poll(() => tab.chosenOption(tab.pluginSelect())).toBe(TEXT.manualMethod);
        await expect(tab.instructionsBox()).toHaveValue(INSTRUCTIONS);
        await expect(side.entry('Distribution').first()).toBeAttached();
        await expect(side.entry('Payments')).toHaveCount(0);
        await expect(side.entry('Institutions')).toHaveCount(0);

        // ── No fees ──────────────────────────────────────────────────────
        // "Tidal Patterns": the header, read once the version has loaded,
        // offers its own buttons ("Activity Log", "Library" and the work
        // type "Monograph", U24) and no "Payments" (Purpose, the absence
        // paragraph).
        const workflow = new WorkflowPage(page, tag);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectVersionLoaded();
        await workflow.expectHeaderButtons(['Activity Log', 'Library', 'Monograph']);
        await expect(workflow.headerButton('Payments')).toHaveCount(0);
        await expect(workflow.headerButton('Library')).toHaveCount(1);

        // "Accept Submission" opens on "Notify Authors", and its step rail
        // lists the decision's own pages with no "Request Payment" among
        // them (Purpose, the absence paragraph).
        await workflow.actionButton('Accept Submission').click();
        const wizard = new DecisionWizardPage(page);
        await wizard.expectTitle('Accept Submission: Notify Authors');
        await wizard.expectSteps(['Notify Authors', 'Select Files']);
        await expect(wizard.stepItem('Request Payment')).toHaveCount(0);
        await expect(wizard.stepItem('Notify Authors')).toHaveCount(1);
        await expect(page.getByRole('heading', {name: /Request Payment/})).toHaveCount(0);

        // Nothing on the way failed on the server or in the page, and the
        // browser asked nothing.
        expect(failures, 'server failures and page errors').toEqual([]);
        expect(dialogs.types(), 'browser questions').toEqual([]);
    });
});
