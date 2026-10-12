// @ts-check
/**
 * @file playwright/pages/DecisionWizardPages.js
 *
 * The full-page decision wizard on a press (feature U34, spec
 * docs/specs/U34-editorial-decision-recording.md), OMP-owned (PRINCIPLES
 * M1; the OJS and OPS trees keep their own `DecisionWizardPages`, copied
 * here rather than imported across apps; the wizard is one lib/pkp page,
 * so the locators are the journal's and the press's words come from the
 * suite):
 * - `DecisionWizardPage` — the wizard frame: the address a decision is typed
 *   at (Rule 12), the heading "{Decision}: {Page}" or the decision's name
 *   alone (Rule 1), the sentence under it, the breadcrumb, the step rail
 *   (numbered current step, checked visited steps as buttons, plain unreached
 *   steps), the current page's panel with its heading and guidance, the
 *   footer ("Skip this email", "Cancel", "Previous", "Continue" / "Record
 *   Decision"; Rules 3, 10), the refusal banner with "View Error", the
 *   "Cancel Decision" dialog, the stale-page "Error" dialog, the "Select
 *   Files" lists (Rule 9) and the closing window with "View Submission
 *   Summary" (Rule 11). A press has no "Request Payment" page (Rule 16).
 * - `ComposerPage` — the email page's composer (Rules 3–8): the "Email
 *   Templates" list and "Find Template", the "Switch to:" line and its
 *   dialog, the "To" chips and their combobox, "Add CC/BCC", "Subject:", the
 *   letter (TinyMCE, driven directly), the toolbar's "Attach Files" (the
 *   four sources and their windows) and "Insert Content".
 *
 * DOM facts (lib/pkp templates/decision/record.tpl, lib/ui-library
 * Steps.vue, Composer.vue, Autosuggest.vue, FileAttacher*.vue,
 * InsertContent.vue; confirmed live 2026-09-20, .reports/U34/screen-notes.md
 * ccK1–ccK4, OJS and OMP): the h1 is `.app__pageHeading`, the sentence
 * `.app__pageDescription`; the rail is `ol.pkpSteps__buttons` named
 * "Complete the following steps to take this decision", a started step a
 * `button.pkpSteps__step__label` (`--current`, `--completed` with a check
 * icon in place of the number), an unreached one a `span` of that class;
 * each page is a `div.pkpStep`, hidden unless current, so every composer
 * read is scoped to `.pkpStep:not([hidden])` (the wizard keeps every
 * visited page's composer mounted); the refusal banner is
 * `.decision__error` (role alert) with a "View Error" button; the footer is
 * `.decision__footer`, "Skip this email" a `.decision__skipStep` button; the
 * chips are `.pkpAutosuggest__selection` badges with a "Remove {name}"
 * button, the combobox input `.pkpAutosuggest__input` and its options
 * `[role=option]`; the templates are `button.composer__template` with a
 * `.composer__template__name` and a `.composer__template__body` snippet; the
 * side windows are dialogs named by their title; an attach source is a
 * `.fileAttacher` with an `h2`, a sentence and a button; an insert row is
 * `li.insertContent__item`.
 */
const {expect} = require('@playwright/test');
const {motionEnded} = require('../../../../shared/playwright/support/motion.js');

/** The step rail's accessible name (lib/pkp `editor.decision.completeSteps`). */
const STEPS_LIST = 'Complete the following steps to take this decision';

/** The skipped page's notice (lib/pkp `editor.decision.emailSkipped`). */
const SKIPPED_NOTICE = 'This step has been skipped and no email will be sent.';

/** The "Cancel Decision" dialog (lib/pkp `editor.decision.cancelDecision*`). */
const CANCEL_DIALOG = 'Cancel Decision';
const CANCEL_QUESTION = 'Are you sure you want to cancel this decision?';

/** The minimum-reviews dialog (Rule 15). */
const MINIMUM_DIALOG = 'Proceed Without Minimum Confirmed Reviews?';
const MINIMUM_QUESTION =
    'The minimum number of confirmed reviews has not been met. Do you still want to proceed with this editorial decision?';

/** The stale-page refusal (Rules 10, 12). */
const WRONG_STAGE = 'The submission is not at the appropriate stage of the workflow to take this decision.';

/** The window titles. */
const ATTACH_WINDOW = 'Attach Files';
const UPLOAD_WINDOW = 'Upload File';
const INSERT_WINDOW = 'Insert Content';
const REVIEW_FILES_WINDOW = 'Review Files';
const SUBMISSION_FILES_WINDOW = 'Submission Files';
const LIBRARY_FILES_WINDOW = 'Library Files';

/** The field refusals (Fields; Rule 10). */
const REQUIRED_STRING = 'This is not a valid string. This field is required.';
const INVALID_EMAIL = 'This is not a valid email address.';

exports.STEPS_LIST = STEPS_LIST;
exports.SKIPPED_NOTICE = SKIPPED_NOTICE;
exports.CANCEL_DIALOG = CANCEL_DIALOG;
exports.CANCEL_QUESTION = CANCEL_QUESTION;
exports.MINIMUM_DIALOG = MINIMUM_DIALOG;
exports.MINIMUM_QUESTION = MINIMUM_QUESTION;
exports.WRONG_STAGE = WRONG_STAGE;
exports.ATTACH_WINDOW = ATTACH_WINDOW;
exports.UPLOAD_WINDOW = UPLOAD_WINDOW;
exports.INSERT_WINDOW = INSERT_WINDOW;
exports.REVIEW_FILES_WINDOW = REVIEW_FILES_WINDOW;
exports.SUBMISSION_FILES_WINDOW = SUBMISSION_FILES_WINDOW;
exports.LIBRARY_FILES_WINDOW = LIBRARY_FILES_WINDOW;
exports.REQUIRED_STRING = REQUIRED_STRING;
exports.INVALID_EMAIL = INVALID_EMAIL;

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.DecisionWizardPage = class DecisionWizardPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.continueButton = page.getByRole('button', {name: 'Continue', exact: true});
        this.previousButton = page.getByRole('button', {name: 'Previous', exact: true});
        this.recordButton = page.getByRole('button', {name: 'Record Decision', exact: true});
        this.cancelButton = page.locator('.decision__footer').getByRole('button', {name: 'Cancel', exact: true});
        this.viewSubmissionLink = page.getByRole('link', {name: 'View Submission Summary', exact: true});
    }

    /**
     * The wizard's address for a decision typed by hand (Rule 12; footnote
     * s1's numbers: 8 "Decline Submission", 7 "Send To Production", 9
     * "Recommend Accept", 2 "Accept Submission"; a review-stage decision adds
     * its round's id).
     */
    static recordUrl(contextPath, submissionId, decision, reviewRoundId = null) {
        const round = reviewRoundId ? `&reviewRoundId=${reviewRoundId}` : '';
        return `/index.php/${contextPath}/decision/record/${submissionId}?decision=${decision}${round}`;
    }

    // ---------------------------------------------------------------------
    // The heading, the sentence, the breadcrumb (Rule 1)
    // ---------------------------------------------------------------------

    /** The page's level-1 heading. */
    heading() {
        return this.page.locator('h1.app__pageHeading');
    }

    /**
     * The wizard is open under the decision's name: the h1 reads
     * "{Decision}: {Page}" on a multi-page wizard, the name alone on a
     * one-page one (record.tpl).
     */
    async expectOpen(title) {
        await expect(this.heading()).toHaveText(new RegExp(`^${escape(title)}(:|$)`), {timeout: 30_000});
    }

    /** The h1 reads exactly this ("Accept Submission: Notify Authors", or "Decline Submission" alone). */
    async expectTitle(text) {
        await expect(this.heading()).toHaveText(text, {timeout: 30_000});
    }

    /** The sentence under the heading (Rule 11's table). */
    pageDescription() {
        return this.page.locator('.app__pageDescription');
    }

    /** The breadcrumb's items, first to last ("Dashboard", the submission, the decision). */
    breadcrumbItems() {
        return this.page.locator('nav.app__breadcrumbs li');
    }

    /** The breadcrumb's texts, first to last, whitespace collapsed. */
    async breadcrumbTexts() {
        const texts = await this.breadcrumbItems().allInnerTexts();
        return texts
            .map((t) => t.replace(/\s+/g, ' ').replace(/^\/\s*/, '').replace(/\s*\/$/, '').trim())
            .filter(Boolean);
    }

    // ---------------------------------------------------------------------
    // The step rail (Rule 1)
    // ---------------------------------------------------------------------

    /** The rail's list. */
    stepsList() {
        return this.page.getByRole('list', {name: STEPS_LIST});
    }

    /** The rail's items ("1 Notify Authors", …). */
    stepItems() {
        return this.stepsList().getByRole('listitem');
    }

    /**
     * The rail lists exactly these pages, in order (each matched as a
     * substring, so the number or the check is ignored): the one read that
     * states which pages the wizard has and that it has no other.
     */
    async expectSteps(labels) {
        await expect(this.stepItems()).toHaveText(
            labels.map((label) => new RegExp(escape(label))),
            {timeout: 30_000}
        );
    }

    /** A rail item by its page's name. */
    stepItem(label) {
        return this.stepItems().filter({hasText: new RegExp(`${escape(label)}$`)});
    }

    /** A visited or current page's rail button (a `button`). */
    stepButton(label) {
        return this.stepItem(label).getByRole('button', {name: new RegExp(`${escape(label)}$`)});
    }

    /** An unreached page's rail entry (a plain `span`, no button). */
    stepPlain(label) {
        return this.stepItem(label).locator('span.pkpSteps__step__label');
    }

    /** The item's number box ("1", or a check icon on a visited page). */
    stepNumber(label) {
        return this.stepItem(label).locator('.pkpSteps__step__number');
    }

    /** The page is the current one: a numbered button. */
    async expectStepCurrent(label, number) {
        await expect(this.stepButton(label)).toHaveClass(/pkpSteps__step__label--current/, {timeout: 30_000});
        await expect(this.stepNumber(label)).toHaveText(String(number));
    }

    /** The page was visited or skipped: a button showing a check in place of its number. */
    async expectStepCompleted(label) {
        await expect(this.stepButton(label)).toHaveClass(/pkpSteps__step__label--completed/, {timeout: 30_000});
        await expect(this.stepNumber(label)).toHaveText('');
        await expect(this.stepNumber(label).locator('svg')).toHaveCount(1);
    }

    /** The page is not yet reached: plain numbered text, no button. */
    async expectStepUnreached(label, number) {
        await expect(this.stepPlain(label)).toBeVisible({timeout: 30_000});
        await expect(this.stepPlain(label).locator('.pkpSteps__step__number')).toHaveText(String(number));
        await expect(this.stepItem(label).getByRole('button')).toHaveCount(0);
    }

    /** The current page's panel (`.pkpStep` not hidden). */
    currentStep() {
        return this.page.locator('.pkpStep:not([hidden])');
    }

    /** The current page's level-2 heading ("Notify Authors"). */
    stepHeading(label) {
        return this.currentStep().getByRole('heading', {name: label, exact: true, level: 2});
    }

    /** The guidance sentence under the current page's heading. */
    stepDescription() {
        return this.currentStep().locator('.decision__stepHeader p');
    }

    // ---------------------------------------------------------------------
    // The footer (Rules 3, 10)
    // ---------------------------------------------------------------------

    /** The footer's visible buttons, left to right in DOM order. */
    footerButtons() {
        return this.page.locator('.decision__footer').getByRole('button');
    }

    /** The footer's button labels, left to right ("Skip this email", "Cancel", …). */
    async footerLabels() {
        const labels = await this.footerButtons().allInnerTexts();
        return labels.map((s) => s.trim()).filter(Boolean);
    }

    /** The footer holds exactly these buttons, left to right (auto-waited). */
    async expectFooter(labels) {
        await expect.poll(() => this.footerLabels(), {timeout: 30_000}).toEqual(labels);
    }

    /** The footer's "Skip this email" (email pages only). */
    skipButton() {
        return this.page.getByRole('button', {name: 'Skip this email', exact: true});
    }

    /** The skipped page's notice, in place of the letter. */
    skippedNotice() {
        return this.currentStep().getByText(SKIPPED_NOTICE);
    }

    /** The notice's "Don't skip this email" button. */
    dontSkipButton() {
        return this.currentStep().getByRole('button', {name: "Don't skip this email", exact: true});
    }

    /**
     * Press "Skip this email" (Rule 3). On a page followed by another the
     * wizard moves on at once, so the caller reads the landing; on the last
     * page the notice replaces the letter here.
     */
    async skipEmail() {
        await this.awaitComposerLoaded();
        await this.skipButton().click();
    }

    /** Press "Don't skip this email": the default letter is back (Rule 3). */
    async unskipEmail() {
        await this.dontSkipButton().click();
        await expect(this.skippedNotice()).toHaveCount(0, {timeout: 30_000});
        await this.awaitComposerLoaded();
    }

    /**
     * Wait for the current page's composer to finish loading its template
     * (patterns.md pitfall 12: a press during the load mask posts an empty
     * body).
     */
    async awaitComposerLoaded() {
        await expect(this.page.locator('.composer__loadingTemplateMask')).toHaveCount(0, {timeout: 30_000});
    }

    /** Press "Continue" (nothing is checked on the way, Rule 10). */
    async continueStep() {
        await this.awaitComposerLoaded();
        await this.continueButton.click();
    }

    /** Press "Previous". */
    async previous() {
        await this.awaitComposerLoaded();
        await this.previousButton.click();
    }

    /** The refusal banner of a page: "There was a problem with the {page} step." (Rule 10). */
    errorBanner(pageName) {
        return this.page.locator('.decision__error').filter({hasText: `There was a problem with the ${pageName} step.`});
    }

    /** Every refusal banner on the wizard. */
    errorBanners() {
        return this.page.locator('.decision__error');
    }

    /** A banner's "View Error" button, which opens that page. */
    viewErrorButton(pageName) {
        return this.errorBanner(pageName).getByRole('button', {name: 'View Error', exact: true});
    }

    /**
     * Press "Record Decision" and read the refusal: the banner for `pageName`
     * shows and no closing window opens (the banner is the bound).
     */
    async recordRefused(pageName) {
        await this.awaitComposerLoaded();
        await this.recordButton.click();
        await expect(this.errorBanner(pageName)).toBeVisible({timeout: 30_000});
        await expect(this.page.getByRole('dialog')).toHaveCount(0);
    }

    // ---------------------------------------------------------------------
    // Cancelling and finishing (Rule 11); the stale page (Rules 10, 12)
    // ---------------------------------------------------------------------

    /** The "Cancel Decision" dialog. */
    cancelDialog() {
        return this.page.getByRole('dialog', {name: CANCEL_DIALOG, exact: true});
    }

    /** Press the footer's "Cancel": the dialog asks (returned open). */
    async pressCancel() {
        await this.cancelButton.click();
        const dialog = this.cancelDialog();
        await expect(dialog).toBeVisible({timeout: 30_000});
        await expect(dialog).toContainText(CANCEL_QUESTION);
        return dialog;
    }

    /** The dialog's "Keep Working": the wizard stays as it was. */
    async keepWorking() {
        await this.cancelDialog().getByRole('button', {name: 'Keep Working', exact: true}).click();
        await expect(this.cancelDialog()).toHaveCount(0, {timeout: 30_000});
        await expect(this.heading()).toBeVisible();
    }

    /** The dialog's "Cancel Decision": back on the workflow page, nothing recorded. */
    async confirmCancel() {
        await this.cancelDialog().getByRole('button', {name: CANCEL_DIALOG, exact: true}).click();
        await this.page.waitForURL((u) => /\/dashboard\/editorial/.test(u.pathname), {
            waitUntil: 'commit',
            timeout: 30_000,
        });
    }

    /** The completion dialog by its exact title ("Submission Accepted", …). */
    completionDialog(title) {
        return this.page.getByRole('dialog', {name: title, exact: true});
    }

    /**
     * Press "Record Decision" and wait for the completion dialog titled
     * `title`, returned for the caller to read before it is left. The click
     * is retried while the wizard re-renders under it, but never once the
     * decisions POST is on the wire (recording twice is not idempotent).
     */
    async recordDecision(title) {
        await this.awaitComposerLoaded();
        const dialog = this.completionDialog(title);
        let posted = false;
        this.page
            .waitForRequest((r) => r.url().includes('/decisions') && r.method() === 'POST', {timeout: 60_000})
            .then(
                () => (posted = true),
                () => {}
            );
        await expect(async () => {
            if (!(await dialog.count()) && !posted) {
                try {
                    await this.recordButton.click({timeout: 2_000});
                } catch {
                    // retried by toPass; success is the completion dialog
                }
            }
            expect(await dialog.count()).toBeGreaterThan(0);
        }).toPass({intervals: [500, 1_000, 2_000], timeout: 60_000});
        await expect(dialog).toBeVisible();
        return dialog;
    }

    /**
     * Follow the completion dialog's "View Submission Summary" link, its
     * only control, back to the workflow page. The caller asserts the
     * landing (the panel's header).
     */
    async viewSubmissionSummary() {
        await this.viewSubmissionLink.click();
        await this.page.waitForURL((u) => /\/dashboard\/editorial/.test(u.pathname), {
            waitUntil: 'commit',
            timeout: 30_000,
        });
    }

    /** The "Error" dialog a stale wizard answers on "Record Decision" (Rule 10). */
    errorDialog() {
        return this.page.getByRole('dialog', {name: 'Error', exact: true});
    }

    /**
     * Press "Record Decision" on a wizard whose submission moved on: the
     * "Error" dialog reads the wrong-stage sentence and no closing window
     * opens.
     */
    async recordRefusedStale() {
        await this.awaitComposerLoaded();
        await this.recordButton.click();
        const dialog = this.errorDialog();
        await expect(dialog).toBeVisible({timeout: 30_000});
        await expect(dialog).toContainText(WRONG_STAGE);
        await expect(this.viewSubmissionLink).toHaveCount(0);
        return dialog;
    }

    // ---------------------------------------------------------------------
    // "Select Files" (Rule 9)
    // ---------------------------------------------------------------------

    /** A "Select Files" list by its title ("Revisions", "Submission Files"). */
    filesList(title) {
        return this.currentStep()
            .locator('.listPanel')
            .filter({has: this.page.locator('.listPanel__header', {hasText: new RegExp(`^\\s*${escape(title)}\\s*$`)})});
    }

    /** The titles of the current page's lists, in order (each list's header heading). */
    async filesListTitles() {
        const texts = await this.currentStep().locator('.listPanel .listPanel__header').allInnerTexts();
        return texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
    }

    /** A list's file rows. */
    fileRows(title) {
        return this.filesList(title).locator('.selectSubmissionFileListItem');
    }

    /** The row of the named file. */
    fileRow(title, name) {
        return this.fileRows(title).filter({hasText: name});
    }

    /** The tick box of a file row (any list). */
    promoteFileCheckbox(fileName) {
        return this.currentStep()
            .locator('.selectSubmissionFileListItem')
            .filter({hasText: fileName})
            .locator('input[type="checkbox"]');
    }

    /** Every tick box on the "Select Files" page. */
    promoteCheckboxes() {
        return this.currentStep().locator('.selectSubmissionFileListItem input[type="checkbox"]');
    }
};

exports.ComposerPage = class ComposerPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    /** The current page's composer (hidden sibling composers stay mounted). */
    root() {
        return this.page.locator('.pkpStep:not([hidden]) .composer');
    }

    // ---------------------------------------------------------------------
    // "Email Templates", "Find Template", "Switch to:" (Rules 7, 8)
    // ---------------------------------------------------------------------

    /** The "Email Templates" heading over the list. */
    templatesHeading() {
        return this.root().locator('.composer__templates__heading');
    }

    /** The listed template buttons. */
    templateButtons() {
        return this.root().locator('button.composer__template');
    }

    /** The listed templates' names, in order. */
    async templateNames() {
        const names = await this.root().locator('.composer__template__name').allInnerTexts();
        return names.map((s) => s.trim()).filter(Boolean);
    }

    /** The list holds exactly these templates, in order (auto-waited). */
    async expectTemplates(names) {
        await expect(this.templatesHeading()).toHaveText('Email Templates', {timeout: 30_000});
        await expect.poll(() => this.templateNames(), {timeout: 30_000}).toEqual(names);
    }

    /** A template's button by its name. */
    templateButton(name) {
        return this.templateButtons().filter({
            has: this.page.locator('.composer__template__name', {hasText: new RegExp(`^\\s*${escape(name)}\\s*$`)}),
        });
    }

    /** A template entry's snippet (the first 70 characters of its text). */
    templateSnippet(name) {
        return this.templateButton(name).locator('.composer__template__body');
    }

    /**
     * Press a listed template: the letter is greyed while it loads, then
     * "Subject:" and "Message" are replaced (Rule 7). Bounded by the mask
     * going.
     */
    async loadTemplate(name) {
        await this.templateButton(name).click();
        await expect(this.page.locator('.composer__loadingTemplateMask')).toHaveCount(0, {timeout: 30_000});
    }

    /** The "Find Template" search box (commits on Enter only). */
    findTemplateBox() {
        return this.root().locator('.composer__templates__search input');
    }

    /** The "Searching" notice shown while a search runs. */
    searchingNotice() {
        return this.root().locator('.composer__templates__searching');
    }

    /** Type a phrase into "Find Template" and press Enter; the caller reads the results. */
    async searchTemplates(phrase) {
        const box = this.findTemplateBox();
        await box.fill(phrase);
        await box.press('Enter');
    }

    /** The "Switch to:" line under the templates (absent with one form language). */
    switchToLine() {
        return this.root().locator('.composer__locales');
    }

    /** The line's link named after the other language ("French"). */
    switchToLink(language) {
        return this.switchToLine().getByRole('button', {name: language, exact: true});
    }

    /** The "Switch to {language}" dialog. */
    switchDialog(language) {
        return this.page.getByRole('dialog', {name: `Switch to ${language}`, exact: true});
    }

    /** Press the language link: the dialog asks (returned open). */
    async pressSwitchTo(language) {
        await this.switchToLink(language).click();
        const dialog = this.switchDialog(language);
        await expect(dialog).toBeVisible({timeout: 30_000});
        return dialog;
    }

    /** Confirm the dialog: the template reloads in that language (Rule 8). */
    async confirmSwitch(language) {
        await this.switchDialog(language).getByRole('button', {name: `Switch to ${language}`, exact: true}).click();
        await expect(this.switchDialog(language)).toHaveCount(0, {timeout: 30_000});
        await expect(this.page.locator('.composer__loadingTemplateMask')).toHaveCount(0, {timeout: 30_000});
    }

    // ---------------------------------------------------------------------
    // "To", "Add CC/BCC", "Subject:" (Rule 4; Fields)
    // ---------------------------------------------------------------------

    /** The "To" field. */
    recipientsField() {
        return this.root().locator('.composer__recipients');
    }

    /** The recipient chips. */
    recipientChips() {
        return this.recipientsField().locator('.pkpAutosuggest__selection');
    }

    /** The chips' names, in order. */
    async recipientNames() {
        const names = await this.recipientChips().allInnerTexts();
        return names.map((s) => s.replace(/\s*Remove .*$/s, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    }

    /** The "To" list holds exactly these people, in any order (the spec claims no order; the chips' order varied between runs). Auto-waited. */
    async expectRecipients(names) {
        const sorted = (xs) => [...xs].sort();
        await expect.poll(async () => sorted(await this.recipientNames()), {timeout: 30_000}).toEqual(sorted(names));
    }

    /** A chip's remove control ("Remove {name}"). */
    chipRemoveButton(name) {
        return this.recipientChips().getByRole('button', {name: `Remove ${name}`, exact: true});
    }

    /** Every chip remove control on the page. */
    chipRemoveButtons() {
        return this.recipientsField().getByRole('button', {name: /^Remove /});
    }

    /** The "To" list cannot be changed: the field is disabled and no chip has a remove control. */
    async expectRecipientsFixed() {
        await expect(this.recipientsField()).toHaveClass(/pkpAutosuggest--disabled/, {timeout: 30_000});
        await expect(this.chipRemoveButtons()).toHaveCount(0);
    }

    /** Remove a recipient's chip. */
    async removeRecipient(name) {
        await this.chipRemoveButton(name).click();
        await expect(this.chipRemoveButton(name)).toHaveCount(0, {timeout: 30_000});
    }

    /** The "To" box's text input (offers the round's reviewers back). */
    recipientsInput() {
        return this.recipientsField().locator('input.pkpAutosuggest__input');
    }

    /** The options the box offers. */
    recipientOptions() {
        return this.recipientsField().getByRole('option');
    }

    /** Type a name into the emptied box and pick the person offered back. */
    async addRecipient(name) {
        const input = this.recipientsInput();
        await input.click();
        await input.fill(name);
        const option = this.recipientOptions().filter({hasText: name});
        await expect(option).toBeVisible({timeout: 30_000});
        await option.click();
        await expect(this.chipRemoveButton(name)).toBeVisible({timeout: 30_000});
    }

    /** The "Add CC/BCC" link. */
    addCcBccButton() {
        return this.root().getByRole('button', {name: 'Add CC/BCC', exact: true});
    }

    /** Press "Add CC/BCC": the link goes and the two boxes show. */
    async addCcBcc() {
        await this.addCcBccButton().click();
        await expect(this.ccInput()).toBeVisible({timeout: 30_000});
        await expect(this.bccInput()).toBeVisible();
        await expect(this.addCcBccButton()).toHaveCount(0);
    }

    ccInput() {
        return this.root().locator('input[name="cc"]');
    }

    bccInput() {
        return this.root().locator('input[name="bcc"]');
    }

    subjectInput() {
        return this.root().locator('input[name="subject"]');
    }

    /** The message under a box ("This is not a valid string. This field is required."): the field error following the box's wrapper. */
    fieldErrorAfter(input) {
        return input.locator('xpath=ancestor::div[contains(@class, "composer__text")][1]/following-sibling::*[1][contains(@class, "pkpFieldError")]');
    }

    subjectError() {
        return this.fieldErrorAfter(this.subjectInput());
    }

    ccError() {
        return this.fieldErrorAfter(this.ccInput());
    }

    /** Every field error on the composer. */
    fieldErrors() {
        return this.root().locator('.pkpFieldError');
    }

    // ---------------------------------------------------------------------
    // The letter (Rule 5)
    // ---------------------------------------------------------------------

    /**
     * The id of the letter's TinyMCE editor: the initialized editor whose
     * container is on screen (hidden sibling composers keep theirs too).
     */
    async editorId() {
        await this.page.waitForFunction(
            () => {
                const t = /** @type {any} */ (window).tinymce;
                const list = t ? t.get() || [] : [];
                return list.some((e) => {
                    try {
                        const c = e.getContainer();
                        return !!(c && c.getClientRects().length) && e.initialized;
                    } catch {
                        return false;
                    }
                });
            },
            null,
            {timeout: 30_000}
        );
        return this.page.evaluate(() => {
            const t = /** @type {any} */ (window).tinymce;
            const editor = (t.get() || []).find((e) => {
                try {
                    const c = e.getContainer();
                    return !!(c && c.getClientRects().length);
                } catch {
                    return false;
                }
            });
            return editor ? editor.id : null;
        });
    }

    /** The letter's text (placeholders shown as their values). */
    async letterText() {
        const id = await this.editorId();
        return this.settledLetterRead(() =>
            this.page.evaluate((i) => /** @type {any} */ (window).tinymce.get(i).getContent({format: 'text'}), id)
        );
    }

    /**
     * A letter read taken once it has settled: non-empty and the same across
     * two reads a beat apart. The letter reaches the editor after the editor
     * starts (the template's body is fetched, then set into it), so a single
     * read can land on an empty or half-set letter
     * (.reports/flake-s26/fixC/diagnosis.md).
     *
     * @param {() => Promise<string>} read
     */
    async settledLetterRead(read) {
        let last = null;
        let value = '';
        await expect
            .poll(
                async () => {
                    value = await read();
                    const settled = value !== '' && value === last;
                    last = value;
                    return settled;
                },
                {timeout: 30_000, intervals: [250]}
            )
            .toBe(true);
        return value;
    }

    /** The letter's first paragraph's text ("Dear Alex Author,"). */
    async firstParagraphText() {
        const id = await this.editorId();
        return this.settledLetterRead(() =>
            this.page.evaluate((i) => {
                const body = /** @type {any} */ (window).tinymce.get(i).getBody();
                const p = body.firstElementChild || body;
                return (p.innerText || p.textContent || '').trim();
            }, id)
        );
    }

    /** Focus the letter with the cursor at the end of its first paragraph. */
    async placeCursorAtEndOfFirstParagraph() {
        const id = await this.editorId();
        await this.page.evaluate((i) => {
            const editor = /** @type {any} */ (window).tinymce.get(i);
            editor.focus();
            const body = editor.getBody();
            const p = body.firstElementChild || body;
            editor.selection.select(p, true);
            editor.selection.collapse(false);
        }, id);
    }

    /** A TinyMCE toolbar button by its visible text ("Attach Files", "Insert Content"). */
    toolbarButton(label) {
        return this.page.locator('.tox-tbtn:visible').filter({hasText: new RegExp(`^${escape(label)}$`)});
    }

    // ---------------------------------------------------------------------
    // "Attach Files" (Rule 6)
    // ---------------------------------------------------------------------

    attachFilesButton() {
        return this.toolbarButton(ATTACH_WINDOW);
    }

    attachWindow() {
        return this.page.getByRole('dialog', {name: ATTACH_WINDOW, exact: true});
    }

    /** Press "Attach Files" and wait for its window's first source heading. */
    async openAttachWindow() {
        await this.attachFilesButton().click();
        await expect(this.attachWindow()).toBeVisible({timeout: 30_000});
        await expect(this.attachSourceHeadings().first()).toBeVisible({timeout: 30_000});
        return this.attachWindow();
    }

    /** The window's source panels. */
    attachSources() {
        return this.attachWindow().locator('.fileAttacher');
    }

    /** The source headings ("Upload File", "Review Files", …), one per panel. */
    attachSourceHeadings() {
        return this.attachSources().locator('h2');
    }

    async attachSourceLabels() {
        const labels = await this.attachSourceHeadings().allInnerTexts();
        return labels.map((s) => s.trim()).filter(Boolean);
    }

    /** The window offers exactly these sources, in order (auto-waited). */
    async expectAttachSources(labels) {
        await expect.poll(() => this.attachSourceLabels(), {timeout: 30_000}).toEqual(labels);
    }

    /** A source panel by its heading. */
    attachSource(heading) {
        return this.attachSources().filter({has: this.page.getByRole('heading', {name: heading, exact: true, level: 2})});
    }

    /** A source's button ("Upload File", "Attach Review Files", …). */
    attachSourceButton(label) {
        return this.attachWindow().getByRole('button', {name: label, exact: true});
    }

    /** A source window by its title ("Review Files", "Submission Files", "Library Files", "Upload File"). */
    sourceWindow(title) {
        return this.page.getByRole('dialog', {name: title, exact: true});
    }

    /** Press a source's button and wait for its window. */
    async openAttachSource(buttonLabel, windowTitle) {
        await this.attachSourceButton(buttonLabel).click();
        const win = this.sourceWindow(windowTitle);
        await expect(win).toBeVisible({timeout: 30_000});
        await expect(win.getByRole('button', {name: 'Back', exact: true})).toBeVisible({timeout: 30_000});
        // In place before it is handed on: the window slides in from beyond
        // the viewport's right edge and is "visible" there, and the forced
        // tick of a row's box does not wait for it (U34 S3 on CI:
        // "Element is outside of the viewport"; motion.js).
        await motionEnded(win);
        return win;
    }

    /** A source window's "Attach Selected". */
    attachSelectedButton(win) {
        return win.getByRole('button', {name: 'Attach Selected', exact: true});
    }

    /** A source window's "Back": the four panels again. */
    async back(win) {
        await win.getByRole('button', {name: 'Back', exact: true}).click();
        await expect(win).toBeHidden({timeout: 30_000});
        await expect(this.attachSourceHeadings().first()).toBeVisible({timeout: 30_000});
    }

    /** A source window's rows' tick boxes. */
    sourceCheckboxes(win) {
        return win.locator('input[type="checkbox"]');
    }

    /** The tick box of the row carrying `text`. */
    sourceCheckbox(win, text) {
        return win.locator('label').filter({hasText: text}).locator('input[type="checkbox"]');
    }

    /** Tick a row and press "Attach Selected": both windows close and the chip shows. */
    async attachSelected(win, rowText, fileName) {
        await this.sourceCheckbox(win, rowText).check({force: true});
        await expect(this.attachSelectedButton(win)).toBeEnabled({timeout: 30_000});
        await this.attachSelectedButton(win).click();
        await expect(win).toBeHidden({timeout: 30_000});
        await expect(this.attachWindow()).toBeHidden({timeout: 30_000});
        await expect(this.attachmentChip(fileName)).toBeVisible({timeout: 30_000});
    }

    /** The "Other Files" dropdown of the "Submission Files" window. */
    otherFilesButton(win) {
        return win.getByRole('button', {name: 'Other Files', exact: true});
    }

    /** Open "Other Files" and read the groups it offers (deduplicated: each renders twice). */
    async otherFilesGroups(win) {
        await this.otherFilesButton(win).click();
        const items = this.page.locator('.pkpDropdown__content:visible .pkpDropdown__action');
        await expect(items.first()).toBeVisible({timeout: 30_000});
        const texts = (await items.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
        return [...new Set(texts)];
    }

    /** Close the open "Other Files" dropdown by pressing its button again (never Escape: that closes the window). */
    async closeOtherFiles(win) {
        await this.otherFilesButton(win).click();
        await expect(this.page.locator('.pkpDropdown__content:visible')).toHaveCount(0, {timeout: 30_000});
    }

    uploadWindow() {
        return this.sourceWindow(UPLOAD_WINDOW);
    }

    /**
     * "Upload File" › add `filePath` › the window's "Attach Files": both
     * windows close and the file's chip stands under the message (Rule 6).
     */
    async uploadAndAttach(filePath, fileName) {
        await this.attachSourceButton(UPLOAD_WINDOW).click();
        const upload = this.uploadWindow();
        await expect(upload).toBeVisible({timeout: 30_000});
        const attach = upload.getByRole('button', {name: ATTACH_WINDOW, exact: true});
        await expect(attach).toBeDisabled();
        await upload.locator('input[type="file"]').setInputFiles(filePath);
        await expect(upload.getByRole('button', {name: `Remove ${fileName}`})).toBeVisible({timeout: 30_000});
        await expect(attach).toBeEnabled({timeout: 30_000});
        await attach.click();
        await expect(upload).toBeHidden({timeout: 30_000});
        await expect(this.attachWindow()).toBeHidden({timeout: 30_000});
        await expect(this.attachmentChip(fileName)).toBeVisible({timeout: 30_000});
    }

    /** Close the "Attach Files" window with its own "Close". */
    async closeAttachWindow() {
        await this.attachWindow().getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(this.attachWindow()).toBeHidden({timeout: 30_000});
    }

    /** The chips under the message. */
    attachmentChips() {
        return this.root().locator('.composer__attachment');
    }

    attachmentChip(fileName) {
        return this.attachmentChips().filter({hasText: fileName});
    }

    attachmentRemoveButton(fileName) {
        return this.attachmentChip(fileName).getByRole('button', {name: `Remove ${fileName}`});
    }

    /** Press a chip's cross: it is gone. */
    async removeAttachment(fileName) {
        await this.attachmentRemoveButton(fileName).click();
        await expect(this.attachmentChip(fileName)).toHaveCount(0, {timeout: 30_000});
    }

    // ---------------------------------------------------------------------
    // "Insert Content" (Rule 5)
    // ---------------------------------------------------------------------

    insertContentButton() {
        return this.toolbarButton(INSERT_WINDOW);
    }

    insertWindow() {
        return this.page.getByRole('dialog', {name: INSERT_WINDOW, exact: true});
    }

    async openInsertWindow() {
        await this.insertContentButton().click();
        await expect(this.insertWindow()).toBeVisible({timeout: 30_000});
        await expect(this.insertRows().first()).toBeVisible({timeout: 30_000});
        return this.insertWindow();
    }

    insertRows() {
        return this.insertWindow().locator('li.insertContent__item');
    }

    /** A row by its description. */
    insertRow(description) {
        return this.insertRows().filter({
            has: this.page.locator('.insertContent__item__description', {hasText: description}),
        });
    }

    insertRowValue(description) {
        return this.insertRow(description).locator('.insertContent__item__value');
    }

    /** The rows' descriptions, in order. */
    async insertRowDescriptions() {
        const texts = await this.insertRows().locator('.insertContent__item__description').allInnerTexts();
        return texts.map((t) => t.trim());
    }

    insertSearchBox() {
        return this.insertWindow().locator('input[type="search"], input').first();
    }

    /** Type into the window's "Search" and press Enter (the box commits on Enter, like every pkp Search box). */
    async searchInsert(phrase) {
        await this.insertSearchBox().fill(phrase);
        await this.insertSearchBox().press('Enter');
    }

    /** Press a row's "Insert": the window closes and the value stands at the cursor. */
    async insertValue(description) {
        await this.insertRow(description).getByRole('button', {name: 'Insert', exact: true}).click();
        await expect(this.insertWindow()).toBeHidden({timeout: 30_000});
    }
};
