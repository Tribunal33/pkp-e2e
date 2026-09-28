// @ts-check
/**
 * @file playwright/pages/SubmissionWizardPage.js
 *
 * OJS-local Page Objects for the submission wizard feature
 * (spec: docs/specs/U21-submission-wizard.md).
 *
 * Surfaces:
 * - StartSubmissionPage — the "Make a Submission" start screen (`/submission`
 *   with no id): the start form (title, section, checklist, privacy), the
 *   not-accepting notice, the Not Allowed page.
 * - SubmissionWizardPage — the wizard itself (`/submission?id={id}`): step
 *   rail (collapse-aware gotoStep/expectStep per the patterns.md recorded
 *   design), footer buttons, the "Submitting to…" line + Change modal, the
 *   Upload Files panel's dropzone upload, Review panels and their Edit
 *   buttons, the submit and cancel dialogs, save-for-later.
 *
 * Labels are the live locale strings (lib/pkp/locale/en/*.po + OJS
 * overrides); DOM shapes from lib/pkp/templates/submission/*.tpl and
 * lib/ui-library SubmissionWizardPage.vue / Steps.vue, confirmed against the
 * running app while this suite was built (2026-08-25); the Review step's
 * Confirmation section, the Details step's Keywords chips, the footer's
 * autosave status, the For the Editors comments box and the Contributors
 * list's primary-contact badge were added on the 2026-09-07 revision; the
 * start form's field legends and section policy, the rail's unreached
 * entries, the required mark, the Data Availability Statement and Subjects
 * fields and the bare 404 page on 2026-09-12.
 */
const path = require('path');
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {waitForEditorReady} = require('../../../../shared/playwright/support/richtext.js');

/** Default upload fixture (app-local). */
const FIXTURE_PDF = path.join(__dirname, '..', 'fixtures', 'files', 'article.pdf');
const FIXTURE_PDF_NAME = 'article.pdf';

/** End-anchored, escaped name matcher (rail labels are "N Name"). */
function endAnchored(name) {
    return new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

/**
 * Fill a TinyMCE rich-text field by its control id (the editor renders an
 * iframe `{controlId}_ifr` beside the hidden backing textarea), once its
 * editor is initialized: text typed earlier is replaced by the field's old
 * value when the editor's content stylesheets arrive and never reaches the
 * form, so no autosave or save carries it (U21 S3,
 * shared/playwright/support/richtext.js).
 */
async function fillTinyMce(page, controlId, text) {
    await waitForEditorReady(page, controlId);
    const body = page.frameLocator(`#${controlId}_ifr`).locator('body');
    await body.click();
    await body.fill(text);
}

exports.FIXTURE_PDF = FIXTURE_PDF;
exports.FIXTURE_PDF_NAME = FIXTURE_PDF_NAME;

exports.StartSubmissionPage = class StartSubmissionPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    async goto() {
        await this.page.goto(this.contextUrl(this.contextPath, '/submission'));
    }

    heading() {
        return this.page.getByRole('heading', {name: 'Make a Submission'});
    }

    beginButton() {
        return this.page.getByRole('button', {name: 'Begin Submission'});
    }

    /** The one-line rich-text Title (a TinyMCE iframe editor). */
    async fillTitle(text) {
        await fillTinyMce(this.page, 'startSubmission-title-control', text);
    }

    checklistBox() {
        return this.page.getByRole('checkbox', {
            name: 'Yes, my submission meets all of these requirements.',
        });
    }

    privacyBox() {
        return this.page.getByRole('checkbox', {
            name: /I agree to have my data collected and stored/,
        });
    }

    sectionRadio(title) {
        return this.page.getByRole('radio', {name: title, exact: true});
    }

    /** A Submission Language radio (offered with two or more submission languages). */
    languageRadio(name) {
        return this.page.getByRole('radio', {name});
    }

    /**
     * The legend of one of the start form's option groups ("Section",
     * "Submission Language"): the group is on the form only when the
     * journal leaves a choice (Rule 4).
     */
    fieldLegend(label) {
        return this.page
            .locator('legend.pkpFormField--options__legend')
            .filter({hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)});
    }

    /**
     * A section's policy, shown under the "Section" list once that section
     * is picked (an HTML field labelled with the section's title).
     */
    sectionPolicy(text) {
        return this.page.locator('.pkpFormField--html').filter({hasText: text});
    }

    /** The not-accepting notice (submissions disabled). */
    notAcceptingNotice() {
        return this.page.getByText('This journal is not accepting submissions at this time.');
    }

    /** The "Not Allowed" page's heading (Rule 3). */
    notAllowedHeading() {
        return this.page.getByRole('heading', {name: 'Not Allowed'});
    }

    /**
     * Press "Begin Submission" and wait for the wizard to load (the button
     * spins while the draft is created and the redirect lands).
     */
    async begin() {
        await this.beginButton().click();
        await this.page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
    }
};

exports.SubmissionWizardPage = class SubmissionWizardPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    wizardUrl(submissionId) {
        return this.contextUrl(this.contextPath, `/submission?id=${submissionId}`);
    }

    async goto(submissionId) {
        await this.page.goto(this.wizardUrl(submissionId));
        await this.expectLoaded();
    }

    /** The wizard page shell is mounted (heading + step rail). */
    async expectLoaded() {
        await expect(
            this.page.getByRole('heading', {name: /Make a Submission/})
        ).toBeVisible({timeout: 30_000});
        await expect(this.page.locator('.pkpSteps')).toBeVisible({timeout: 30_000});
    }

    /** The "{id} / {authors} / {title}" line above the page heading. */
    submissionDetailsLine() {
        return this.page.locator('.submissionWizard__submissionDetails');
    }

    /** The "Submitting to…" line (absent on single-config journals). */
    submittingToLine() {
        return this.page.locator('#submission-configuration');
    }

    changeButton() {
        return this.submittingToLine().getByRole('button', {name: 'Change'});
    }

    footer() {
        return this.page.locator('.submissionWizard__footer');
    }

    continueButton() {
        return this.footer().getByRole('button', {name: 'Continue', exact: true});
    }

    backButton() {
        return this.footer().getByRole('button', {name: 'Back', exact: true});
    }

    submitButton() {
        return this.footer().getByRole('button', {name: 'Submit', exact: true});
    }

    /** The footer Save for Later (a second copy sits in the header). */
    saveForLaterButton() {
        return this.footer().getByRole('button', {name: 'Save for Later', exact: true});
    }

    cancelButton() {
        return this.page.locator('#cancelSubmission');
    }

    /** The current step's rail pill. */
    currentStepLabel() {
        return this.page.locator('.pkpSteps__step__label--current');
    }

    async expectStep(name) {
        await expect(this.currentStepLabel()).toContainText(name, {timeout: 30_000});
    }

    /** A rail entry (button when started, plain span when not yet reached). */
    railEntry(name) {
        return this.page
            .locator('.pkpSteps__step__label')
            .filter({hasText: endAnchored(name)});
    }

    railButton(name) {
        return this.page
            .locator('button.pkpSteps__step__label')
            .filter({hasText: endAnchored(name)});
    }

    /** A rail entry not yet reached: a plain span, nothing to click (Rule 8). */
    railUnreached(name) {
        return this.page
            .locator('span.pkpSteps__step__label')
            .filter({hasText: endAnchored(name)});
    }

    /** The "404 Not Found" heading of the bare page a deleted draft's address answers (Rule 16). */
    notFoundHeading() {
        return this.page.getByRole('heading', {name: '404 Not Found'});
    }

    /** The app header (the journal's design around the wizard). */
    appBanner() {
        return this.page.getByRole('banner');
    }

    /**
     * Open a started step from the rail. Handles the collapsed («n/total
     * steps» + "Show all steps") state and re-render-swallowed clicks
     * (patterns.md recorded design).
     */
    async gotoStep(name) {
        for (let attempt = 0; attempt < 3; attempt++) {
            if (await this.page.locator('.pkpSteps--collapsed').count()) {
                const controls = this.page.locator('.pkpSteps__controls button');
                if (await controls.count()) {
                    await controls.click();
                }
            }
            await this.railButton(name).click();
            try {
                await expect(this.currentStepLabel()).toContainText(name, {timeout: 5_000});
                return;
            } catch (error) {
                if (attempt === 2) {
                    throw error;
                }
            }
        }
    }

    /**
     * Press a footer button until its outcome shows (ci-triage flake watch,
     * "a wizard press swallowed the instant a step becomes current"): the
     * press issued right as a step mounts occasionally fires nothing, so the
     * outcome gets a short window and the button is pressed again while it is
     * still offered, at most three presses.
     */
    async pressUntil(button, outcome) {
        for (let attempt = 0; attempt < 3; attempt++) {
            await button.click();
            try {
                await outcome(8_000);
                return;
            } catch (e) {
                if (attempt === 2 || !(await button.isVisible().catch(() => false))) {
                    break;
                }
            }
        }
        await outcome(30_000);
    }

    /** Press Continue and wait for the named step to become current. */
    async continueTo(name) {
        await this.pressUntil(this.continueButton(), (timeout) =>
            expect(this.currentStepLabel()).toContainText(name, {timeout})
        );
    }

    /**
     * A pending wait for the submission check the Review step runs (the
     * `_validateOnly` PUT to …/submit, tunnelled as POST). Arm BEFORE the
     * action that opens Review.
     */
    armValidation(submissionId) {
        return this.page.waitForResponse(
            (r) =>
                r.url().includes(`/submissions/${submissionId}/submit`) &&
                r.request().method() === 'POST',
            {timeout: 45_000}
        );
    }

    /** Enter the Review step (via Continue) and wait out the check. */
    async continueToReview(submissionId) {
        const validated = this.armValidation(submissionId);
        await this.continueTo('Review');
        await validated;
    }

    /** The "Section Closed" page shown instead of the wizard (Rule 17). */
    sectionClosedHeading() {
        return this.page.getByRole('heading', {name: 'Section Closed'});
    }

    /** The "Submission complete" screen's heading (Rule 15). */
    completeHeading() {
        return this.page.getByRole('heading', {name: 'Submission complete'});
    }

    /**
     * The footer's autosave status ("Saving", "Reconnecting", "Last saved
     * {when}"; Rule 9).
     */
    lastSavedStatus() {
        return this.page.locator('.submissionWizard__lastSaved');
    }

    /**
     * A pending wait for the "Saving" flash in the footer. The flash lasts
     * only as long as the save request, so it is watched frame by frame
     * inside the page rather than by a polled locator read. Arm BEFORE the
     * save is due; the default timeout outlasts the wizard's own one-minute
     * autosave clock.
     */
    waitForSavingFlash(timeout = 120_000) {
        return this.page.waitForFunction(
            () => {
                const status = document.querySelector('.submissionWizard__lastSaved');
                return !!status && status.textContent.includes('Saving');
            },
            null,
            {polling: 'raf', timeout}
        );
    }

    /**
     * A pending wait for the publication autosave the Details form sends
     * (a PUT to …/publications/{id}, tunnelled as POST). Arm BEFORE typing
     * stops; the timeout outlasts the wizard's autosave clock.
     */
    armAutosave(submissionId, timeout = 120_000) {
        return this.page.waitForResponse(
            (r) =>
                r.url().includes(`/submissions/${submissionId}/publications/`) &&
                r.request().method() === 'POST',
            {timeout}
        );
    }

    /**
     * Hand the page the minute its autosave clock waits for.
     *
     * The wizard checks on a half-second timer whether a minute has passed
     * since the last save and, if it has, queues the changed form; the next
     * turn of that timer sends it. `page.clock.install()` must already have
     * run (before the wizard loaded), and the changes must already be typed,
     * so the two jumps below stand in for the minute the test would
     * otherwise idle through.
     */
    async passAutosaveClock() {
        await this.page.clock.fastForward(61_000);
        await this.page.clock.fastForward(1_000);
    }

    /** The Details step's Title editor body (TinyMCE iframe). */
    titleEditorBody(locale = 'en') {
        return this.page.frameLocator(`#titleAbstract-title-control-${locale}_ifr`).locator('body');
    }

    /** Fill the Details step's Title (replaces the current text). */
    async fillTitle(text, locale = 'en') {
        await fillTinyMce(this.page, `titleAbstract-title-control-${locale}`, text);
    }

    /** The Details step's Keywords chip input (present only when asked for). */
    keywordsInput(locale = 'en') {
        return this.page.locator(`#titleAbstract-keywords-control-${locale}`);
    }

    /**
     * The "* Required" mark on a wizard form field, found from the field's
     * control id (the mark sits in the field's label or legend).
     */
    requiredMark(controlId) {
        return this.page
            .locator('.pkpFormField')
            .filter({has: this.page.locator(`#${controlId}, #${controlId}_ifr`)})
            .locator('.pkpFormFieldLabel__required');
    }

    /** The Details step's Data Availability Statement editor (a TinyMCE iframe; shown when asked for). */
    dataAvailabilityEditor(locale = 'en') {
        return this.page.locator(`#dataAvailability-dataAvailability-control-${locale}_ifr`);
    }

    /** The For the Editors step's Subjects chip input (shown when asked for). */
    subjectsInput(locale = 'en') {
        return this.page.locator(`#forTheEditors-subjects-control-${locale}`);
    }

    /** Type one keyword into the chips box (Enter commits the chip). */
    async addKeyword(text, locale = 'en') {
        const input = this.keywordsInput(locale);
        await input.click();
        await input.pressSequentially(text, {delay: 15});
        await input.press('Enter');
        // The chip renders as "Selected: {text}" with a "Remove {text}" button.
        await expect(this.page.getByRole('button', {name: `Remove ${text}`})).toBeVisible({timeout: 30_000});
    }

    /** Fill the For the Editors step's "Comments for the Editor" box. */
    async fillCommentsForEditor(text) {
        await fillTinyMce(this.page, 'commentsForTheEditors-commentsForTheEditors-control', text);
    }

    /** A Contributors-step list item by the contributor's name. */
    contributorItem(name) {
        return this.page.locator('.listPanel__item').filter({hasText: name});
    }

    /** The "Primary Contact" badge on a Contributors-step list item. */
    primaryContactBadge(name) {
        return this.contributorItem(name).getByText('Primary Contact', {exact: true});
    }

    /**
     * The contributor "Edit" side panel of the Contributors step, anchored on
     * the form's own given-name box (the wrapper reports `visibility: hidden`,
     * patterns.md locator pitfall 5). Its boxes are the contributor form's
     * (`ContributorForm.php`, U41): `givenName-en`, `familyName-en`,
     * `preferredPublicName-en`, `email`, `url` as `input[name]`, the
     * country a native `select[name="country"]`, the bio a TinyMCE editor
     * `#contributor-biography-control-{locale}_ifr`, the affiliations a
     * table under `#contributor-affiliations`, and, on a journal with ORCID
     * enabled, the "ORCID iD" field with its "Request verification" button
     * (U04). Read live 2026-09-13 (`.reports/U03/tojs/contributor-fields-ojs.json`).
     */
    contributorEditModal() {
        return this.page
            .locator('[data-cy="active-modal"]')
            .filter({has: this.page.locator('[id^="contributor-givenName"]')});
    }

    /** Open a Contributors-step list item's "Edit" and return its panel. */
    async openContributorEdit(name) {
        await this.contributorItem(name).getByRole('button', {name: 'Edit', exact: true}).click();
        const modal = this.contributorEditModal();
        await expect(modal.locator('[id^="contributor-givenName"]')).toBeVisible({timeout: 30_000});
        return modal;
    }

    /** A text box of the contributor form by its field name (`givenName-en`, `email`, `url`, …). */
    contributorInput(modal, fieldName) {
        return modal.locator(`input[name="${fieldName}"]`);
    }

    contributorCountry(modal) {
        return modal.locator('select[name="country"]');
    }

    /** The "Affiliations" field (its table lists each affiliation by institution name). */
    contributorAffiliations(modal) {
        return modal.locator('#contributor-affiliations');
    }

    /** The bio statement editor's body. */
    contributorBioBody(modal, locale = 'en') {
        return modal.frameLocator(`#contributor-biography-control-${locale}_ifr`).locator('body');
    }

    /** The ORCID field's "Request verification" button (a contributor with no verified iD). */
    contributorRequestVerificationButton(modal) {
        return modal.getByRole('button', {name: 'Request verification'});
    }

    /** Close the panel without saving (its "Close" button). */
    async closeContributorEdit(modal) {
        await modal.getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(modal).toHaveCount(0, {timeout: 30_000});
    }

    /** The Review step's final "Confirmation" section (copyright notice). */
    confirmationHeading() {
        return this.page.getByRole('heading', {name: 'Confirmation', exact: true});
    }

    /** The copyright agreement box in the Confirmation section (Rule 14). */
    copyrightBox() {
        return this.page.getByRole('checkbox', {name: 'Yes, I agree to the copyright statement.'});
    }

    /** The Review step's problems banner. */
    errorBanner() {
        return this.page.getByText(
            'There are one or more problems that need to be fixed before you can submit.'
        );
    }

    /**
     * A Review summary panel by its h3 (Files, Details, Contributors, …). A
     * RegExp matches the per-language panels of a multilingual journal
     * ("Details (English)").
     */
    reviewPanel(name) {
        return this.page
            .locator('.submissionWizard__reviewPanel')
            .filter({has: this.page.getByRole('heading', {name, exact: typeof name === 'string'})});
    }

    /** Jump back to a step through its Review panel's Edit button. */
    async editFromPanel(name) {
        await this.reviewPanel(name).getByRole('button', {name: 'Edit'}).click();
    }

    /**
     * Upload a file on the Upload Files step through the panel's own
     * dropzone ("Add File" opens the OS file chooser) and answer the
     * "What kind of file is this?" prompt with the given file type.
     */
    async uploadFile(filePath = FIXTURE_PDF, genreName = 'Article Text') {
        const [chooser] = await Promise.all([
            this.page.waitForEvent('filechooser'),
            this.page.getByRole('button', {name: 'Add File', exact: true}).click(),
        ]);
        await chooser.setFiles(filePath);
        await this.page.getByRole('button', {name: genreName, exact: true}).click();
        const row = this.page
            .locator('.listPanel__item--submissionFile')
            .filter({hasText: path.basename(filePath)});
        await expect(row.getByText(genreName)).toBeVisible({timeout: 30_000});
    }

    /**
     * Fill a TinyMCE rich-text control of a wizard form (e.g.
     * fillRichText('titleAbstract-abstract-control-en', 'Text…')).
     */
    async fillRichText(controlId, text) {
        await fillTinyMce(this.page, controlId, text);
    }

    /** Press Submit, confirm the dialog, land on "Submission complete". */
    async submitAndConfirm() {
        const dialog = this.page
            .getByRole('dialog')
            .filter({hasText: 'will be submitted to'});
        await this.pressUntil(this.submitButton(), (timeout) => expect(dialog).toBeVisible({timeout}));
        await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
        await expect(
            this.page.getByRole('heading', {name: 'Submission complete'})
        ).toBeVisible({timeout: 45_000});
    }

    /** Press the footer Cancel, confirm, land on "Submission cancelled". */
    async cancelAndConfirm() {
        await this.cancelButton().click();
        const dialog = this.page
            .getByRole('dialog')
            .filter({hasText: 'Are you sure you wish to cancel this submission?'});
        await expect(dialog).toBeVisible({timeout: 30_000});
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(
            this.page.getByRole('heading', {name: 'Submission cancelled'})
        ).toBeVisible({timeout: 45_000});
    }

    /** The "Saved for Later" screen's heading (the answer to Save for Later). */
    savedForLaterHeading() {
        return this.page.getByRole('heading', {name: 'Saved for Later'});
    }

    /** Press Save for Later, land on the "Saved for Later" screen. */
    async saveForLater() {
        await this.saveForLaterButton().click();
        await expect(this.savedForLaterHeading()).toBeVisible({timeout: 45_000});
    }

    /**
     * Walk an open draft's wizard forward to the named step with Continue
     * and press Save for Later there, so "Complete submission" later
     * reopens the wizard at that step (U22 Rule 6, fn-s2: the scenario API
     * has no saved-step key). A seeded draft opens on "Upload Files";
     * "Details" is one Continue on.
     */
    async saveForLaterAt(stepName) {
        await this.continueTo(stepName);
        await this.saveForLater();
    }

    /** The "Change Submission Settings" side panel. */
    reconfigureModal() {
        return this.page
            .locator('[data-cy="active-modal"]')
            .filter({hasText: 'Change Submission Settings'});
    }
};
