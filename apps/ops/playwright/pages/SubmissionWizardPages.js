// @ts-check
/**
 * @file playwright/pages/SubmissionWizardPages.js
 *
 * App-local helpers for the OPS submission wizard suite (U21). Screen shapes
 * from lib/pkp/templates/submission/{start,wizard,complete,saved,cancelled}.tpl
 * + ui-library SubmissionWizardPage[OPS].vue, verified against the running
 * OPS fleet. The steps rail renders started steps as buttons
 * (.pkpSteps__step__label, --current on the open one) and unreached steps as
 * plain spans; the footer's primary button reads "Continue" until the last
 * step, where it reads "Submit".
 *
 * OPS divergences from the OMP twin (register OPS1): the Upload Files step
 * manages the preprint's galleys through the legacy "Files" grid — "Add File"
 * asks for a Galley Label, then the legacy upload wizard demands a Preprint
 * Component before accepting the file; the fourth step is "For Readers"; the
 * submit-confirmation dialog branches on whether the user may post.
 *
 * Added on the 2026-09-12 revision: the rail's reached/unreached entries
 * and "Back", the start form's legends and section policy, the required
 * mark, Review items and the bare 404 page. Added for U22's 2026-09-13
 * revision: `saveForLaterAt` (a draft saved on a named step).
 */
const path = require('path');
const {expect} = require('../support/fixtures.js');
const {waitForEditorReady, editorIdOf} = require('../../../../shared/playwright/support/richtext.js');
const {waitForJQueryIdle} = require('../support/legacy.js');

/** Default upload fixture (app-local). */
const FIXTURE_PDF = path.join(__dirname, '..', 'fixtures', 'files', 'preprint.pdf');

/** The preprint server wizard's step rail labels, in order. */
const STEPS = {
    files: 'Upload Files',
    details: 'Details',
    contributors: 'Contributors',
    readers: 'For Readers',
    reviewerSuggestions: 'Reviewer Suggestions', // never renders on OPS (OPS1)
    review: 'Review',
};

/** The submit-confirmation dialog's two OPS variants (Rule 14 / OPS1). */
const SUBMIT_DIALOGS = {
    moderated: /a moderator will review the preprint before posting it online/,
    canPost: /you will be able to review your submission and post it online/,
};

function startUrl(contextPath, {localePrefix = ''} = {}) {
    return `/index.php/${contextPath}${localePrefix}/submission`;
}

function wizardUrl(contextPath, submissionId, {localePrefix = ''} = {}) {
    return `/index.php/${contextPath}${localePrefix}/submission?id=${submissionId}`;
}

/** The wizard footer button row. */
function footer(page) {
    return page.locator('.submissionWizard__footer');
}

/** The "Submitting to the {section} section… Change" configuration line. */
function submittingToLine(page) {
    return page.locator('#submission-configuration');
}

/** A step's rail entry (started steps are buttons; unreached ones spans). */
function railEntry(page, label) {
    return page
        .locator('.pkpSteps__buttons .pkpSteps__step__label')
        .filter({hasText: label});
}

/**
 * A reached step's rail BUTTON (Rule 8: completed and current steps reopen
 * from the rail; an unreached step renders as a plain span, so this
 * locator counts 0 for it while `railEntry` still finds its label).
 */
function railButton(page, label) {
    return page
        .locator('.pkpSteps__buttons button.pkpSteps__step__label')
        .filter({hasText: label});
}

/** A rail entry not yet reached: a plain span, nothing to click (Rule 8). */
function railUnreached(page, label) {
    return page
        .locator('.pkpSteps__buttons span.pkpSteps__step__label')
        .filter({hasText: label});
}

/** The footer's "Back" button (absent on the first step, Rule 8). */
function backButton(page) {
    return footer(page).getByRole('button', {name: 'Back', exact: true});
}

/** Step back one step with the footer's "Back" and wait for arrival. */
async function backTo(page, label) {
    await backButton(page).click();
    await expectStep(page, label);
}

/**
 * Reopen a reached step from the rail. A click swallowed by a footer
 * re-render is retried when the rail has not moved.
 */
async function gotoStep(page, label) {
    for (let attempt = 0; ; attempt++) {
        await railButton(page, label).click();
        try {
            await expect(currentRailStep(page)).toContainText(label, {timeout: 5_000});
            return;
        } catch (error) {
            if (attempt >= 2) {
                throw error;
            }
        }
    }
}

/** The rail's current-step button. */
function currentRailStep(page) {
    return page.locator('.pkpSteps__step__label--current');
}

/** The app header around the wizard (the server's design; a bare 404 has none). */
function appBanner(page) {
    return page.getByRole('banner');
}

/** The "404 Not Found" heading of the bare page a deleted draft's address answers (Rule 16). */
function notFoundHeading(page) {
    return page.getByRole('heading', {name: '404 Not Found'});
}

/**
 * The start form's option-group legend ("Section", "Submission Language"):
 * a group is on the form only when the server leaves a choice (Rule 4).
 */
function startFormLegend(page, text) {
    return page
        .locator('legend.pkpFormField--options__legend')
        .filter({hasText: new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)});
}

/**
 * A section's policy on the start form: an HTML field labelled with the
 * section's title, shown only while that section's radio is checked.
 */
function sectionPolicy(page, text) {
    return page.locator('.pkpFormField--html').filter({hasText: text});
}

/** Assert the rail's current step by its visible label. */
async function expectStep(page, label) {
    await expect(currentRailStep(page)).toContainText(label, {timeout: 20_000});
}

/** Wait for the wizard screen itself (heading + rail). */
async function expectWizardOpen(page) {
    await expect(
        page.getByRole('heading', {name: /Make a Submission/}).first()
    ).toBeVisible({timeout: 20_000});
    await expect(page.locator('.pkpSteps__buttons')).toBeVisible();
}

/**
 * Fill the start form's one-line rich-text Title (TinyMCE renders an iframe;
 * the start screen has exactly one).
 */
async function fillStartTitle(page, title) {
    const iframe = page.locator('iframe.tox-edit-area__iframe').first();
    // Typed before its editor is initialized, the title is wiped and never
    // reaches the form (shared/playwright/support/richtext.js).
    await waitForEditorReady(page, await editorIdOf(iframe));
    const body = iframe.contentFrame().locator('body');
    await body.click();
    await body.fill(title);
    await expect(body).toContainText(title);
}

/**
 * Complete the "Make a Submission" start form and press "Begin Submission".
 * Ticks whatever confirmation boxes the form offers; picks a section and/or
 * submission language when a label is given (both radios render only when
 * the server offers a choice — Rule 4). Resolves once the wizard has opened.
 */
async function beginSubmission(page, {title, section = null, language = null}) {
    await expect(
        page.getByRole('heading', {name: /Make a Submission/}).first()
    ).toBeVisible({timeout: 20_000});
    await fillStartTitle(page, title);
    if (language) {
        await page.getByRole('radio', {name: language, exact: true}).check();
    }
    if (section) {
        await page.getByRole('radio', {name: section, exact: true}).check();
    }
    const requirements = page.getByRole('checkbox', {
        name: /meets all of these requirements/,
    });
    if (await requirements.count()) {
        await requirements.check();
    }
    const privacy = page.getByRole('checkbox', {
        name: /agree to have my data collected/,
    });
    if (await privacy.count()) {
        await privacy.check();
    }
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 30_000});
    await expectWizardOpen(page);
    await expectStep(page, STEPS.files);
}

/**
 * Press a footer button until its outcome shows (ci-triage flake watch,
 * "a wizard press swallowed the instant a step becomes current"): the
 * press issued right as a step mounts occasionally fires nothing, so the
 * outcome gets a short window and the button is pressed again while it is
 * still offered, at most three presses.
 */
async function pressUntil(button, outcome) {
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

/**
 * Advance one step with the footer's "Continue" and wait for arrival. The
 * footer re-renders when an autosave starts, which can swallow a click
 * (patterns.md, wizard steps rail) — so the press is retried while the
 * rail has not moved (`pressUntil`).
 */
async function continueTo(page, label) {
    await pressUntil(
        footer(page).getByRole('button', {name: 'Continue', exact: true}),
        (timeout) => expect(currentRailStep(page)).toContainText(label, {timeout})
    );
}

/**
 * Add a galley on the Upload Files step (OPS1): "Add File" asks for the
 * Galley Label; saving it auto-opens the legacy upload wizard, which demands
 * the file's Preprint Component before accepting the upload.
 */
async function addGalleyFile(page, {label = 'PDF', genre = 'Preprint Text', file = FIXTURE_PDF} = {}) {
    const labelDialog = page
        .getByRole('dialog')
        .filter({has: page.locator('#preprintGalleyForm')});
    // The grid's jQuery handlers (re)bind after refreshes — retry a click
    // that lands before binding and is silently lost.
    await waitForJQueryIdle(page);
    for (let attempt = 0; ; attempt++) {
        await page.getByRole('link', {name: 'Add File', exact: true}).click();
        try {
            await expect(labelDialog.first()).toBeVisible({timeout: 5_000});
            break;
        } catch (error) {
            if (attempt >= 2) {
                throw error;
            }
        }
    }
    // fbv ids are runtime-suffixed — select by name (patterns.md locator pitfall "fbvElement ids are runtime-suffixed").
    await labelDialog.locator('input[name="label"]').fill(label);
    await labelDialog.getByRole('button', {name: 'Save', exact: true}).click();

    const upload = page
        .getByRole('dialog')
        .filter({has: page.locator('div[id^="fileUploadWizard"]')});
    const genreSelect = upload.locator('select[name="genreId"]').first();
    await expect(genreSelect).toBeVisible({timeout: 30_000});
    await genreSelect.selectOption({label: genre});
    await upload.locator('input[type="file"]').setInputFiles(file);
    const continueButton = upload.getByRole('button', {name: 'Continue', exact: true});
    await expect(continueButton).toBeEnabled({timeout: 30_000});
    await continueButton.click();
    await expect(upload.getByRole('tab', {name: '2. Review Details'})).toHaveAttribute(
        'aria-selected',
        'true',
        {timeout: 30_000}
    );
    await upload.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(upload.getByRole('tab', {name: '3. Confirm'})).toHaveAttribute(
        'aria-selected',
        'true',
        {timeout: 30_000}
    );
    await upload.getByRole('button', {name: 'Complete', exact: true}).click();
    await expect(upload).toHaveCount(0, {timeout: 30_000});
    await waitForJQueryIdle(page);
    // The step's "Files" grid lists the new galley by its label.
    await expect(
        page.locator('.submissionWizard').getByRole('link', {name: label}).first()
    ).toBeVisible({timeout: 20_000});
}

/** Answer the For Readers step's required "Relation status" question. */
async function setRelationStatus(
    page,
    label = 'This preprint has not been published elsewhere.'
) {
    await page.getByRole('radio', {name: label}).check();
}

/**
 * Open the Review step (via Continue or the rail) and wait for the
 * submission check to answer — the check runs every time Review opens.
 */
async function openReview(page, {viaRail = false} = {}) {
    const validated = page.waitForResponse(
        (r) =>
            r.url().includes('/submit') &&
            r.request().method() === 'POST' &&
            r.status() < 500
    );
    const target = viaRail
        ? railEntry(page, STEPS.review)
        : footer(page).getByRole('button', {name: 'Continue', exact: true});
    await pressUntil(target, (timeout) =>
        expect(currentRailStep(page)).toContainText(STEPS.review, {timeout})
    );
    await validated;
    await expect(page.locator('.submissionWizard__loadingReview')).toHaveCount(0, {
        timeout: 20_000,
    });
}

/** The Review step's problems banner. */
function problemsBanner(page) {
    return page.locator('.submissionWizard__review_errors');
}

/** A Review-step summary panel by its heading ("Files", "Details", …). */
function reviewPanel(page, heading) {
    return page
        .locator('.submissionWizard__reviewPanel')
        .filter({has: page.getByRole('heading', {name: heading, exact: true})});
}

/**
 * On the Review step, press Submit, assert the confirmation dialog carries
 * the expected OPS variant message (SUBMIT_DIALOGS), confirm, and wait for
 * the "Submission complete" screen.
 */
async function confirmSubmit(page, {message = SUBMIT_DIALOGS.moderated} = {}) {
    const submit = footer(page).getByRole('button', {name: 'Submit', exact: true});
    await expect(submit).toBeEnabled({timeout: 20_000});
    const dialog = page
        .getByRole('dialog')
        .filter({hasText: 'Are you sure you want to submit'});
    await pressUntil(submit, (timeout) => expect(dialog).toBeVisible({timeout}));
    await expect(dialog).toContainText(message);
    await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
    await expect(
        page.getByRole('heading', {name: 'Submission complete'})
    ).toBeVisible({timeout: 30_000});
}

/**
 * Walk a fresh draft (open on its first step) to a completed submission:
 * add a galley, pass every step, answer the required Relation status, and
 * submit from Review. Returns after the "Submission complete" screen appears.
 */
async function completeAndSubmitDraft(page, {label = 'PDF', message = SUBMIT_DIALOGS.moderated} = {}) {
    await expectStep(page, STEPS.files);
    await addGalleyFile(page, {label});
    await continueTo(page, STEPS.details);
    await continueTo(page, STEPS.contributors);
    await continueTo(page, STEPS.readers);
    await setRelationStatus(page);
    await openReview(page);
    await expect(problemsBanner(page)).toHaveCount(0);
    await confirmSubmit(page, {message});
}

/** Press "Save for Later" (footer) and wait for the Saved for Later screen. */
async function saveForLater(page) {
    await footer(page)
        .getByRole('button', {name: 'Save for Later', exact: true})
        .last()
        .click();
    await expect(
        page.getByRole('heading', {name: 'Saved for Later'})
    ).toBeVisible({timeout: 30_000});
}

/**
 * Continue from the open step to the named step and save there with "Save
 * for Later" (U22 fn-s2: the wizard resumes only at a SAVED step, and the
 * scenario API has no saved-step key). Resolves on the Saved for Later
 * screen.
 */
async function saveForLaterAt(page, label) {
    await continueTo(page, label);
    await saveForLater(page);
}

/** Open the "Change Submission Settings" panel from the header line. */
async function openChangeSettings(page) {
    await submittingToLine(page).getByRole('button', {name: 'Change'}).click();
    const modal = page.locator('[data-cy="active-modal"]').last();
    await expect(
        modal.getByText('Change Submission Settings').first()
    ).toBeVisible({timeout: 10_000});
    return modal;
}

/** The footer's primary "Submit" button (Review step). */
function submitButton(page) {
    return footer(page).getByRole('button', {name: 'Submit', exact: true});
}

/**
 * The Review step's closing "Confirmation" section heading — present only
 * when the server has a copyright notice (Rule 12).
 */
function confirmationHeading(page) {
    return page.getByRole('heading', {name: 'Confirmation', exact: true});
}

/** The Confirmation section's copyright box (Rule 14). */
function copyrightCheckbox(page) {
    return page.getByRole('checkbox', {name: /agree to the copyright statement/});
}

/**
 * Wizard form control ids (TinyMCE renders `{id}_ifr`). The For Readers
 * step's "Comments for the Moderator" box is not multilingual, so it
 * carries no locale suffix (probe `.reports/U21/tops/readers-iframes-ops.json`).
 */
const CONTROLS = {
    title: 'titleAbstract-title-control-en',
    abstract: 'titleAbstract-abstract-control-en',
    keywords: 'titleAbstract-keywords-control-en',
    moderatorNote: 'commentsForTheEditors-commentsForTheEditors-control',
};

/**
 * Fill a wizard TinyMCE box by its control id (replaces its content), once
 * its editor is initialized: every step's editors start with the page, and
 * one typed into before its content stylesheets arrive puts the old value
 * back and never tells the form, so no autosave or save carries the text
 * (U21 S3, shared/playwright/support/richtext.js).
 */
async function fillRichText(page, controlId, text) {
    await waitForEditorReady(page, controlId);
    const body = page.frameLocator(`#${controlId}_ifr`).locator('body');
    await body.click();
    await body.fill(text);
    await expect(body).toContainText(text);
}

/** The rendered text of a wizard TinyMCE box. */
function richTextBody(page, controlId) {
    return page.frameLocator(`#${controlId}_ifr`).locator('body');
}

/** A Details / For Readers form field by its label. */
function wizardField(page, labelRe) {
    return page
        .locator('.pkpFormField')
        .filter({has: page.locator('label.pkpFormFieldLabel').filter({hasText: labelRe})});
}

/**
 * A wizard form field's label element: a required field's label carries
 * the "* Required" mark ("Title * Required"), an optional one does not.
 */
function wizardFieldLabel(page, labelRe) {
    return wizardField(page, labelRe).locator('label.pkpFormFieldLabel');
}

/** A Review-step panel's item by its field label ("Abstract", "Keywords"…). */
function reviewItem(panel, label) {
    return panel.locator('.submissionWizard__reviewPanel__item').filter({hasText: label});
}

/** Add a keyword chip on the Details step (Enter commits the term). */
async function addKeyword(page, term) {
    const input = page.locator(`#${CONTROLS.keywords}`);
    await input.click();
    await input.fill(term);
    await input.press('Enter');
    await expect(page.getByRole('button', {name: `Remove ${term}`})).toBeVisible();
}

/** The Contributors step's list rows. */
function contributorRows(page) {
    return page.locator('.listPanel--contributor li.listPanel__item');
}

/**
 * On the Contributors step, add a person contributor with the Author role
 * (the panel's own mechanics belong to Contributors & affiliations). The
 * server offers more than one contributor role, so the required
 * "Contributor Roles" choice renders. Waits for the save and for the row.
 */
async function addContributor(page, {givenName, email, country = 'Iceland'}) {
    await page.getByRole('button', {name: 'Add Contributor'}).click();
    const modal = page.locator('[data-cy="active-modal"]').last();
    // Required fields' accessible names carry the "* Required" suffix.
    await modal.getByRole('textbox', {name: /^Given Name/}).first().fill(givenName);
    await modal.getByRole('textbox', {name: /^Email/}).fill(email);
    await modal.getByRole('combobox', {name: /^Country/}).selectOption({label: country});
    await modal
        .getByRole('group', {name: /Contributor Roles/})
        .getByRole('checkbox', {name: 'Author', exact: true})
        .check();
    const saved = page.waitForResponse(
        (r) => r.url().includes('/contributors') && r.request().method() === 'POST' && r.ok()
    );
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    await saved;
    await expect(contributorRows(page).filter({hasText: givenName})).toBeVisible({timeout: 20_000});
}

/** A Contributors-step list item by the contributor's full name. */
function contributorItem(page, name) {
    return contributorRows(page).filter({hasText: name});
}

/**
 * The contributor "Edit" side panel of the Contributors step, anchored on
 * the form's own given-name box (the wrapper reports `visibility: hidden`,
 * patterns.md locator pitfall 5). Its boxes are the contributor form's
 * (`ContributorForm.php`, U41): `givenName-en`, `familyName-en`,
 * `preferredPublicName-en`, `email`, `url` as `input[name]`, the country a
 * native `select[name="country"]`, the bio a TinyMCE editor
 * `#contributor-biography-control-{locale}_ifr`, the affiliations a table
 * under `#contributor-affiliations`, and, on a server with ORCID enabled,
 * the "ORCID iD" field with its "Request verification" button (U04).
 */
function contributorEditModal(page) {
    return page
        .locator('[data-cy="active-modal"]')
        .filter({has: page.locator('[id^="contributor-givenName"]')});
}

/** Open a Contributors-step list item's "Edit" and return its panel. */
async function openContributorEdit(page, name) {
    await contributorItem(page, name).getByRole('button', {name: 'Edit', exact: true}).click();
    const modal = contributorEditModal(page);
    await expect(modal.locator('[id^="contributor-givenName"]')).toBeVisible({timeout: 30_000});
    return modal;
}

/** A text box of the contributor form by its field name (`givenName-en`, `email`, `url`, …). */
function contributorInput(modal, fieldName) {
    return modal.locator(`input[name="${fieldName}"]`);
}

function contributorCountry(modal) {
    return modal.locator('select[name="country"]');
}

/** The "Affiliations" field (its table lists each affiliation by institution name). */
function contributorAffiliations(modal) {
    return modal.locator('#contributor-affiliations');
}

/** The bio statement editor's body. */
function contributorBioBody(modal, locale = 'en') {
    return modal.frameLocator(`#contributor-biography-control-${locale}_ifr`).locator('body');
}

/** The ORCID field's "Request verification" button (a contributor with no verified iD). */
function contributorRequestVerificationButton(modal) {
    return modal.getByRole('button', {name: 'Request verification'});
}

/** Close the panel without saving (its "Close" button). */
async function closeContributorEdit(modal) {
    await modal.getByRole('button', {name: 'Close', exact: true}).first().click();
    await expect(modal).toHaveCount(0, {timeout: 30_000});
}

/**
 * Press the footer's "Cancel", confirm the "Cancel submission" dialog with
 * "OK", and wait for the "Submission cancelled" screen (Rule 16; on a
 * preprint server this completes for a manager only — register OPS3).
 */
async function cancelDraft(page) {
    await page.locator('#cancelSubmission').click();
    const dialog = page.getByRole('dialog').filter({hasText: 'Cancel submission'});
    await expect(
        dialog.getByText(
            'Are you sure you wish to cancel this submission? This will delete the submission and all associated data. This action cannot be undone.'
        )
    ).toBeVisible({timeout: 10_000});
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Submission cancelled'})).toBeVisible({
        timeout: 30_000,
    });
}

module.exports = {
    FIXTURE_PDF,
    STEPS,
    SUBMIT_DIALOGS,
    CONTROLS,
    startUrl,
    wizardUrl,
    footer,
    submitButton,
    submittingToLine,
    railEntry,
    railButton,
    railUnreached,
    backButton,
    backTo,
    gotoStep,
    currentRailStep,
    appBanner,
    notFoundHeading,
    startFormLegend,
    sectionPolicy,
    expectStep,
    expectWizardOpen,
    fillStartTitle,
    beginSubmission,
    continueTo,
    addGalleyFile,
    setRelationStatus,
    openReview,
    problemsBanner,
    reviewPanel,
    confirmationHeading,
    copyrightCheckbox,
    fillRichText,
    richTextBody,
    wizardField,
    wizardFieldLabel,
    reviewItem,
    addKeyword,
    contributorRows,
    contributorItem,
    contributorEditModal,
    openContributorEdit,
    contributorInput,
    contributorCountry,
    contributorAffiliations,
    contributorBioBody,
    contributorRequestVerificationButton,
    closeContributorEdit,
    addContributor,
    confirmSubmit,
    completeAndSubmitDraft,
    saveForLater,
    saveForLaterAt,
    cancelDraft,
    openChangeSettings,
};
