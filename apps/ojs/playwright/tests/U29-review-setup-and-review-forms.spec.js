// @ts-check
/**
 * @file playwright/tests/U29-review-setup-and-review-forms.spec.js
 *
 * Review setup & review forms — OJS suite, one test per canonical scenario
 * the spec runs on OJS (S1–S8, S12 and S13 common; S9 and S10 {OJS};
 * scenario 11 is OPS's, in that tree).
 * Spec: docs/specs/U29-review-setup-and-review-forms.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 🐞
 * (the daily reminder clock is off; S1 saves a slider and reads it back,
 * no test expects a reminder email), A5 🐞 (no test changes an item's type
 * after adding response options), A9 🐞 (S7 never presses "OK" in the
 * deactivated form's "Edit" window), A2 ❓ (S7 unticks a form in use and
 * asserts only the scenario's own sentence: the notice and the tick gone),
 * A3 ❓ (no deadline is saved as 0 or emptied), A4 ❓ (every reload runs the
 * tab chain again without asserting where the reload landed), A6 ❓ (S10
 * asserts only the scenario's own sentence: the "-" in the section and the
 * title on the line), A7 ❓ (S9 never asserts the toggled row's position),
 * A8 ❓ (no declined request is seeded), A14 ❓ (no test reads the "More
 * Actions" menu of a recommendation a reviewer has only saved for later),
 * OMP1–OMP3 ✅/🐞 (press-only, in the
 * OMP tree). The spec's Coverage section records everything else left out.
 *
 * Seeding: scenario endpoints only. S1–S10 and S13 run on their own scratch
 * journal (`POST scenarios/context`, install defaults unless a `review` /
 * `reviewForms[]` passthrough key names the configured end) with throwaway
 * users whose addresses carry app + test (u29s4ojsw0…@mail.test) and one
 * seeded submission in review; S12 reads the seeded journal with the roster
 * accounts, read-only. publicknowledge and the 18 seeded users are never
 * changed (A1, A7). The reviewer side runs in its own authenticated context
 * (`asUser`), never a sign-out. Every absence is read with a settled locator
 * and paired with a positive control taken the same way (M4, M6): the
 * missing "Review Form" list beside the same window's review-type radios,
 * the missing "More Actions" beside the other row's, the missing sidebar
 * group beside the same sidebar's other group, the missing mail beside a
 * request mail the test sends itself (A8). No hard-coded waits (A5).
 */
const {test, expect} = require('../support/fixtures.js');
const {unordered} = require('../../../../shared/playwright/support/order.js');
const {
    WorkflowPage,
    openAddReviewerModal,
    selectReviewer,
    performReview,
    openEditReview,
    closeSideWindow,
    openReviewDetails,
    awaitReviewDetailsSettled,
    markReviewComplete,
    closeReviewDetails,
    reviewTypeRadio,
    publicVisibilityCheckbox,
    dueDateField,
    reviewFormSelect,
    statusCell,
    recommendationLine,
    recommendationValue,
    reviewItemBlock,
} = require('../pages/ReviewStagePages.js');
const {
    ReviewSettingsPage,
    REQUIRED_ERROR,
} = require('../../../../shared/playwright/pages/ReviewSettingsPages.js');
const {ReviewWizardPage} = require('../../../../shared/playwright/pages/ReviewerPages.js');

const JOURNAL = 'publicknowledge';
const DEFAULT_RECOMMENDATIONS = [
    'Accept Submission',
    'Revisions Required',
    'Resubmit for Review',
    'Resubmit Elsewhere',
    'Decline Submission',
    'See Comments',
];
const SLIDER_LABELS = [
    'Review Request Response - Before Due Date',
    'Review Request Response - After Due Date',
    'Review Submission - Before Due Date',
    'Review Submission - After Due Date',
];
const REFUSED_NOTICE =
    'The form was not saved because 1 error(s) were encountered. Please correct these errors and try again.';
const DEACTIVATE_FORM = 'Are you sure you wish to deactivate this review form? It will no longer be available for new review assignments.';
const ACTIVATE_FORM = "Are you sure you wish to activate this review form? Once it's assigned to a review you will no longer be able to deactivate it.";
const COPY_FORM = 'Are you sure you wish to create a copy of this review form?';
const DELETE_FORM = 'Are you sure you wish to delete this review form?';
const RADIO_TYPE = 'Radio buttons (you can only choose one)';
const TEXTAREA_TYPE = 'Extended text box';
const TEXTFIELD_TYPE = 'Single line text box';
const NONE_FORM = 'None / Free Form Review';
const ANONYMOUS_MODE = 'Anonymous Reviewer/Anonymous Author';
const ACCESS_DENIED = 'The current role does not have access to this operation.';
/** The round status box's first line on a journal whose minimum of confirmed reviews is 1 (Rule 8). */
const MINIMUM_LINE = 'Minimum number of confirmed reviews required: 1.';
const CONFIRMED_LINE = 'Minimum required number of reviews have been confirmed. A decision is needed.';
const REQUEST_SUBJECT = 'Invitation to review';

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u29${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (scenarios.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** Local date as the app's short format (Y-m-d). */
function ymd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function daysFromNow(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
}

/**
 * A scratch journal with a manager, an author and one throwaway reviewer
 * per `reviewers[]` entry (each `{status, reviewForm}` a request on the
 * seeded submission's round 1; the first entry is `reviewer`), plus a spare
 * reviewer with no request when `spare` is set (a reviewer on the round
 * leaves the Add Reviewer search, scenarios.md "reviewRounds[]"); one
 * submission in external review round 1. Returns the names the screens show.
 */
async function seedJournal(ojsApi, tag, {review, reviewForms, reviewers = [], spare = false} = {}) {
    const manager = `mgr${tag}`;
    const author = `au${tag}`;
    const spec = {
        tag,
        users: [
            {username: manager, roles: ['manager']},
            {username: author, roles: ['author']},
        ],
    };
    const surnames = ['Probe', 'Second', 'Third'];
    const seeded = reviewers.map((entry, i) => ({
        username: `rev${i ? i + 1 : ''}${tag}`,
        name: `${surnames[i]} Reviewer${tag}`,
        givenName: surnames[i],
        entry,
    }));
    for (const r of seeded) {
        spec.users.push({username: r.username, roles: ['externalReviewer'], givenName: r.givenName, familyName: `Reviewer${tag}`});
    }
    const spareUser = spare ? {username: `spare${tag}`, name: `Spare Reviewer${tag}`} : null;
    if (spareUser) {
        spec.users.push({username: spareUser.username, roles: ['externalReviewer'], givenName: 'Spare', familyName: `Reviewer${tag}`});
    }
    if (review) spec.review = review;
    if (reviewForms) spec.reviewForms = reviewForms;
    await ojsApi.createContext(spec);
    const {submissionId} = await ojsApi.createSubmission({
        tag,
        context: tag,
        submitter: author,
        title: `Submission ${tag}`,
        decisions: ['sendExternalReview'],
        reviewRounds: [{
            reviewers: seeded.map((r) => ({
                username: r.username,
                status: r.entry.status,
                ...(r.entry.reviewForm ? {reviewForm: r.entry.reviewForm} : {}),
            })),
        }],
    });
    return {
        manager,
        author,
        submissionId,
        reviewers: seeded.map(({username, name}) => ({username, name})),
        reviewer: seeded[0]?.username ?? null,
        reviewerName: seeded[0]?.name ?? null,
        spare: spareUser,
    };
}

/**
 * Open the submission's "Add Reviewer" window and select the reviewer, so
 * the request form (review type, dates, the "Review Form" list) is on
 * screen. Returns the window.
 */
async function openRequestForm(page, tag, submissionId, reviewerName) {
    const workflow = new WorkflowPage(page, tag);
    await workflow.gotoEditorial(submissionId);
    const modal = await openAddReviewerModal(page);
    await selectReviewer(page, modal, reviewerName);
    return modal;
}

/** Close the "Add Reviewer" window (it has no "Cancel"; never Escape). */
async function closeRequestForm(modal) {
    await modal.getByRole('button', {name: /^Close/}).first().click();
    await expect(modal).toBeHidden({timeout: 30_000});
}

/**
 * Send the open request form as it stands: press its "Add Reviewer" once
 * the letter's editor holds the template (the prefill lands through
 * TinyMCE; an empty body 500s), and wait for the window to go.
 */
async function sendRequestForm(modal) {
    await expect(modal.frameLocator('iframe[id^="personalMessage"]').locator('body')).not.toHaveText('', {timeout: 30_000});
    await modal.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    await expect(modal).toHaveCount(0, {timeout: 30_000});
}

/** A seeded acceptance opens on step 1; walk the wizard to step 3. */
async function walkToStep3(wizard) {
    await wizard.expectStep(1);
    await wizard.saveAndContinueButton.click();
    await wizard.expectStep(2);
    await wizard.continueToStep3();
}

/** The two free-text boxes of step 3 (absent while a review form is carried). */
function freeTextBoxes(page) {
    return page.locator('#reviewStep3Form iframe[id^="comments"]');
}

/** The backend sidebar. */
function siteNav(page) {
    return page.getByRole('navigation', {name: 'Site Navigation'});
}

test.describe('review setup & review forms', () => {
    test('S1: save the review setup', {tag: '@smoke'}, async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s1', testInfo);
        // The earlier request, made before any change, at the defaults; a
        // spare reviewer for the Add Reviewer read.
        const {manager, reviewer, reviewerName, spare, submissionId} = await seedJournal(ojsApi, tag, {
            reviewers: [{status: 'invited'}],
            spare: true,
        });
        const page = await (await asUser(manager)).newPage();
        const settings = new ReviewSettingsPage(page, tag);
        const setup = settings.setup;
        await settings.goto('Setup');

        // Control: the install defaults are on screen before the save.
        await expect(setup.modeRadio(ANONYMOUS_MODE)).toBeChecked();
        await expect(setup.publicCommentsBox).not.toBeChecked();
        await expect(setup.field('Default Response Deadline')).toHaveValue('4');
        await expect(setup.field('Default Completion Deadline')).toHaveValue('4');
        await expect(setup.field('Minimum Confirmed Reviews Required')).toHaveValue('0');
        for (const label of SLIDER_LABELS) {
            await expect(setup.sliderReadout(label)).toHaveText('No reminder set');
        }

        // The edits, then "Save": "Saved" beside the button.
        await setup.modeRadio('Open').check();
        await setup.publicCommentsBox.check();
        await setup.field('Default Response Deadline').fill('2');
        await setup.field('Minimum Confirmed Reviews Required').fill('1');
        await setup.setSliderByKeyboard('Review Request Response - Before Due Date', 3);
        await expect(setup.sliderReadout('Review Request Response - Before Due Date')).toHaveText('3 days before due date');
        await setup.save();

        // Reload and open "Review" › "Setup" again: every value shows as saved.
        await settings.reloadAndOpen('Setup');
        await expect(setup.modeRadio('Open')).toBeChecked();
        await expect(setup.publicCommentsBox).toBeChecked();
        await expect(setup.field('Default Response Deadline')).toHaveValue('2');
        await expect(setup.field('Minimum Confirmed Reviews Required')).toHaveValue('1');
        await expect(setup.slider('Review Request Response - Before Due Date')).toHaveAttribute('aria-valuetext', '3 days before due date');
        await expect(setup.sliderReadout('Review Request Response - Before Due Date')).toHaveText('3 days before due date');

        // Add Reviewer: "Open" preselected, the public box ticked, the
        // response due date two weeks out (control: the completion deadline
        // was left at its default of four weeks).
        const modal = await openRequestForm(page, tag, submissionId, spare.name);
        await expect(reviewTypeRadio(modal, 'Open')).toBeChecked();
        await expect(publicVisibilityCheckbox(modal)).toBeChecked();
        await expect(dueDateField(modal, 'responseDueDate')).toHaveValue(ymd(daysFromNow(14)));
        await expect(dueDateField(modal, 'reviewDueDate')).toHaveValue(ymd(daysFromNow(28)));
        // The request goes out as read: its email to the spare is the
        // mailbox bullet's positive control (A8), sent by this test.
        await sendRequestForm(modal);

        // The round status now opens with the minimum line.
        const workflow = new WorkflowPage(page, tag);
        await expect(workflow.statusLines('Round 1 Status').first()).toHaveText(MINIMUM_LINE, {timeout: 30_000});

        // The earlier request's "Edit" window keeps what it was made with.
        const row = workflow.panelRow('Reviewers', reviewerName);
        const editModal = await openEditReview(page, row);
        await expect(reviewTypeRadio(editModal, ANONYMOUS_MODE)).toBeChecked();
        await expect(reviewTypeRadio(editModal, 'Open')).not.toBeChecked();
        await expect(publicVisibilityCheckbox(editModal)).not.toBeChecked();
        await expect(dueDateField(editModal, 'responseDueDate')).toHaveValue(ymd(daysFromNow(28)));
        await closeSideWindow(editModal);

        // The Reviewer's mailbox: nothing from the save, bounded by the
        // spare's request mail arriving.
        await pkpMail.expectNone({
            to: mailOf(reviewer),
            afterControl: {to: mailOf(spare.username), subject: REQUEST_SUBJECT},
        });
    });

    test('S2: a refused deadline saves nothing', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const {manager} = await seedJournal(ojsApi, tag);
        const page = await (await asUser(manager)).newPage();
        const settings = new ReviewSettingsPage(page, tag);
        const setup = settings.setup;
        await settings.goto('Setup');

        // Letters in the deadline plus a mode change in the same edit.
        await setup.field('Default Completion Deadline').fill('abc');
        await setup.modeRadio('Anonymous Reviewer/Disclosed Author').check();
        await setup.saveButton.click();
        await expect(setup.fieldError('Default Completion Deadline')).toContainText('This is not a valid integer.', {timeout: 30_000});
        await expect(setup.errorSummary).toContainText('Please correct one error.');
        await expect(setup.jumpToErrorButton).toBeVisible();
        await expect(settings.notice(REFUSED_NOTICE)).toBeVisible({timeout: 30_000});
        await expect(setup.saveButton).toBeDisabled();
        // Control: no "Saved" appeared beside the button.
        await expect(setup.savedStatus).toHaveCount(0);

        // Nothing was saved, not even the mode that passed.
        await settings.reloadAndOpen('Setup');
        await expect(setup.field('Default Completion Deadline')).toHaveValue('4');
        await expect(setup.modeRadio(ANONYMOUS_MODE)).toBeChecked();
        await expect(setup.modeRadio('Anonymous Reviewer/Disclosed Author')).not.toBeChecked();

        // A negative number is refused with the other message.
        await setup.field('Default Completion Deadline').fill('-1');
        await setup.saveButton.click();
        await expect(setup.fieldError('Default Completion Deadline')).toContainText('This must be at least 0.', {timeout: 30_000});
        await expect(setup.errorSummary).toContainText('Please correct one error.');
    });

    test('S3: unsaved edits survive a tab switch, not a reload', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const {manager} = await seedJournal(ojsApi, tag);
        const page = await (await asUser(manager)).newPage();
        const settings = new ReviewSettingsPage(page, tag);
        const setup = settings.setup;
        // Any browser prompt (a beforeunload on the reload) would be recorded here.
        const prompts = [];
        page.on('dialog', (dialog) => {
            prompts.push(dialog.type());
            dialog.dismiss().catch(() => {});
        });
        await settings.goto('Setup');
        await expect(setup.field('Default Response Deadline')).toHaveValue('4');

        // Edit, switch side tabs and come back: no warning, the edit is still there.
        await setup.field('Default Response Deadline').fill('6');
        await settings.openSideTab('Reviewer Guidance');
        await expect(settings.guidance.saveButton).toBeVisible();
        await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0);
        await settings.openSideTab('Setup');
        await expect(setup.field('Default Response Deadline')).toHaveValue('6');
        await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0);

        // A reload drops the edit with no prompt: the saved value is back.
        await settings.reloadAndOpen('Setup');
        await expect(setup.field('Default Response Deadline')).toHaveValue('4');
        expect(prompts).toEqual([]);
    });

    test('S4: guidance reaches the reviewer', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const guidelines = 'Judge the method first.';
        const policy = 'Declare any funding link.';
        const {manager, reviewer, submissionId} = await seedJournal(ojsApi, tag, {reviewers: [{status: 'invited'}]});

        // Manager: both texts saved on "Reviewer Guidance".
        const page = await (await asUser(manager)).newPage();
        const settings = new ReviewSettingsPage(page, tag);
        await settings.goto('Reviewer Guidance');
        await settings.guidance.typeInto('reviewGuidelines', guidelines);
        await settings.guidance.typeInto('competingInterests', policy);
        await settings.guidance.save();

        // Reviewer: step 1's "Competing Interests" block, its window, then step 2's guidelines.
        const reviewerPage = await (await asUser(reviewer)).newPage();
        const wizard = new ReviewWizardPage(reviewerPage, tag);
        await wizard.goto(submissionId);
        const step1 = reviewerPage.locator('#reviewStep1Form');
        await expect(step1).toContainText('Competing Interests');
        await expect(step1.getByText('I do not have any competing interests')).toBeVisible();
        await expect(step1.getByText('I may have competing interests (Specify below)')).toBeVisible();
        await expect(wizard.noCompetingInterestsRadio).toBeChecked();
        await expect(step1).not.toContainText(policy);
        await wizard.competingInterestsLink.click();
        const policyWindow = reviewerPage.getByRole('dialog').filter({hasText: policy});
        await expect(policyWindow).toBeVisible({timeout: 30_000});
        await policyWindow.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(policyWindow).toBeHidden({timeout: 30_000});
        await wizard.accept();
        const step2 = reviewerPage.locator('#reviewStep2Form');
        await expect(step2).toContainText('Reviewer Guidelines');
        await expect(step2).toContainText(guidelines);
        const text = await step2.innerText();
        expect(text.indexOf('Reviewer Guidelines')).toBeLessThan(text.indexOf(guidelines));
        await expect(step2).not.toContainText('This publisher has not set any reviewer guidelines.');
    });

    test('S5: the guidelines box per app', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const {manager} = await seedJournal(ojsApi, tag);
        const page = await (await asUser(manager)).newPage();
        const settings = new ReviewSettingsPage(page, tag);
        const guidance = settings.guidance;
        await settings.goto('Reviewer Guidance');

        // A journal's "Review" lists the four side tabs, the recommendations tab last.
        expect(await settings.sideTabNames()).toEqual(['Setup', 'Reviewer Guidance', 'Review Forms', 'Reviewer Recommendations']);

        // A journal has the one "Review Guidelines" box (no per-stage boxes).
        const headings = await guidance.headings();
        expect(headings).toContain('Review Guidelines');
        expect(headings).toContain('Competing Interests');
        expect(headings).not.toContain('Internal Review Guidelines');
        expect(headings).not.toContain('External Review Guidelines');

        // Tick the anonymizing box, save, reload: it stays ticked.
        await expect(guidance.anonymizeBox).not.toBeChecked();
        await guidance.anonymizeBox.check();
        await guidance.save();
        await settings.reloadAndOpen('Reviewer Guidance');
        await expect(guidance.anonymizeBox).toBeChecked();

        // The words in the sentence open the instructions; "Close" closes them,
        // and there is no "OK" (control: "Close" is there). The box stays as it was.
        await guidance.anonymizeWords.click();
        const window = guidance.instructionsWindow();
        await expect(window).toBeVisible({timeout: 30_000});
        await expect(window.getByRole('heading', {name: 'How to ensure all files are anonymized'})).toBeVisible();
        await expect(window.getByRole('button', {name: 'Close', exact: true})).toBeVisible();
        await expect(window.getByRole('button', {name: 'OK', exact: true})).toHaveCount(0);
        await window.getByRole('button', {name: 'Close', exact: true}).click();
        await expect(window).toBeHidden({timeout: 30_000});
        await expect(guidance.anonymizeBox).toBeChecked();
    });

    test('S6: build a review form and offer it', {tag: '@smoke'}, async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const title = 'Method check';
        const question = 'Is the method sound?';
        const scratch = 'Scratch question';
        const reworded = 'Scratch question, reworded';
        const {manager, spare, submissionId} = await seedJournal(ojsApi, tag, {spare: true});
        const page = await (await asUser(manager)).newPage();
        const settings = new ReviewSettingsPage(page, tag);
        const forms = settings.forms;
        await settings.goto('Review Forms');
        await expect(forms.noItems).toBeVisible();

        // A refused form: "Save" with "Title" empty keeps the window open
        // with "This field is required." under the box.
        await forms.openCreateForm();
        await forms.pressFormSave();
        await expect(forms.formFieldErrors().first()).toBeVisible({timeout: 30_000});
        await expect(forms.titleInput).toBeVisible();

        // The title typed and saved: the notice, the row with 0 / 0 and no tick.
        await forms.saveOpenForm(title);
        await expect(forms.savedNotice()).toBeVisible({timeout: 30_000});
        const row = forms.row(title).first();
        expect(await forms.rowCounts(row)).toEqual({inReview: 0, completed: 0});
        await expect(forms.activeBox(row)).not.toBeChecked();

        // "Edit" › "Form Items" reads "No Items"; a refused item, twice: the
        // type unchosen ("This field is required." under "Item type"), then
        // the type chosen and "Item" empty (the notice, nothing under the box).
        const controls = await forms.rowControls(row);
        await forms.control(controls, 'Edit').click();
        await expect(forms.windowHeading()).toHaveText('Edit', {timeout: 30_000});
        await forms.openWindowTab('Form Items');
        await expect(forms.itemsGrid().getByText('No Items')).toBeVisible({timeout: 30_000});
        await forms.openCreateItem();
        await forms.pressItemSave();
        await expect(forms.itemFieldErrors()).toHaveCount(1, {timeout: 30_000});
        await expect(forms.itemFieldErrors().first()).toBeVisible();
        await expect(forms.itemForm).toBeVisible();
        await forms.fillItem({type: RADIO_TYPE});
        await forms.pressItemSave();
        await expect(forms.itemQuestionNotice()).toBeVisible({timeout: 30_000});
        await expect(forms.itemFieldErrors()).toHaveCount(0);
        await expect(forms.itemForm).toBeVisible();

        // The items: a required radio item with two options, then a text item under it.
        await forms.saveItem({question, required: true, type: RADIO_TYPE, options: ['Yes', 'No']});
        await expect(forms.savedNotice()).toBeVisible({timeout: 30_000});
        await forms.openCreateItem();
        await forms.saveItem({question: 'Other remarks', type: TEXTAREA_TYPE});
        await expect(forms.itemRows()).toHaveCount(2);
        await expect(forms.itemRows().nth(0)).toContainText(question);
        await expect(forms.itemRows().nth(1)).toContainText('Other remarks');

        // Edit and delete a third item: its "Edit" window (headed "Edit")
        // saves the reworded question, its "Delete" asks and removes it.
        await forms.openCreateItem();
        await forms.saveItem({question: scratch, type: TEXTFIELD_TYPE});
        await expect(forms.itemRows()).toHaveCount(3);
        const scratchControls = await forms.rowControls(forms.itemRow(scratch));
        await forms.control(scratchControls, 'Edit').click();
        await expect(forms.itemWindowHeading()).toHaveText('Edit', {timeout: 30_000});
        await forms.saveItem({question: reworded});
        await expect(forms.savedNotice()).toBeVisible({timeout: 30_000});
        await expect(forms.itemRows()).toHaveCount(3);
        await expect(forms.itemRows().nth(2)).toContainText(reworded);
        await forms.deleteItem(forms.itemRow(reworded));
        await expect(forms.itemRows()).toHaveCount(2, {timeout: 30_000});
        await expect(forms.itemRow(scratch)).toHaveCount(0);

        // "Preview Form": the title, the starred question with two radios, the text box.
        await forms.openWindowTab('Preview Form');
        await expect(forms.previewForm).toBeVisible({timeout: 30_000});
        await expect(forms.previewForm.getByRole('heading', {name: title})).toBeVisible();
        await expect(forms.previewForm).toContainText(`${question}*`);
        await expect(forms.previewRadio('Yes')).toBeVisible();
        await expect(forms.previewRadio('No')).toBeVisible();
        await expect(forms.previewForm).toContainText('Other remarks');
        await expect(forms.previewForm.locator('textarea')).toHaveCount(1);
        await forms.closeWindow();

        // Inactive: "Add Reviewer" has no "Review Form" list (control: the
        // same form's review type radios are there).
        let modal = await openRequestForm(page, tag, submissionId, spare.name);
        await expect(modal.locator('#regularReviewerForm input[name="reviewMethod"]').first()).toBeVisible();
        await expect(reviewFormSelect(modal)).toHaveCount(0);
        await closeRequestForm(modal);

        // Tick "Active" › "OK": the notice, and the list now offers the form.
        await settings.goto('Review Forms');
        await forms.activeBox(forms.row(title).first()).click();
        await forms.answerConfirm(ACTIVATE_FORM, 'OK');
        await expect(forms.savedNotice()).toBeVisible({timeout: 30_000});
        await expect(forms.activeBox(forms.row(title).first())).toBeChecked();
        modal = await openRequestForm(page, tag, submissionId, spare.name);
        await expect(reviewFormSelect(modal)).toBeVisible({timeout: 30_000});
        await expect(reviewFormSelect(modal).locator('option')).toHaveText([NONE_FORM, title]);
        await expect(reviewFormSelect(modal).locator('option:checked')).toHaveText(NONE_FORM);
    });

    test('S7: a form in use is frozen', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const title = 'Method check';
        const items = ['Is the method sound?', 'Other remarks'];
        // The Reviewer's open request carries the form; a second Reviewer's
        // free-form review is already submitted; a spare for Add Reviewer.
        const {manager, reviewer, reviewers, spare, submissionId} = await seedJournal(ojsApi, tag, {
            reviewForms: [{
                title,
                elements: [
                    {question: items[0], type: 'radiobuttons', required: true, options: ['Yes', 'No']},
                    {question: items[1], type: 'textarea'},
                ],
            }],
            reviewers: [{status: 'accepted', reviewForm: title}, {status: 'completed'}],
            spare: true,
        });
        const page = await (await asUser(manager)).newPage();
        const settings = new ReviewSettingsPage(page, tag);
        const forms = settings.forms;
        await settings.goto('Review Forms');

        // In Review 1; "Copy" and "Preview" only.
        const row = forms.row(title).first();
        expect(await forms.rowCounts(row)).toEqual({inReview: 1, completed: 0});
        await expect(forms.activeBox(row)).toBeChecked();
        let controls = await forms.rowControls(row);
        await expect(forms.control(controls, 'Copy')).toBeVisible();
        await expect(forms.control(controls, 'Preview')).toBeVisible();
        await expect(forms.control(controls, 'Edit')).toHaveCount(0);
        await expect(forms.control(controls, 'Delete')).toHaveCount(0);

        // "Preview": the window headed "Preview" on "Preview Form", the other
        // two greyed; pressing them does nothing.
        await forms.control(controls, 'Preview').click();
        await expect(forms.windowHeading()).toHaveText('Preview', {timeout: 30_000});
        await expect(forms.windowTab('Preview Form')).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        await expect(forms.windowTab('Review Form')).toHaveAttribute('aria-disabled', 'true');
        await expect(forms.windowTab('Form Items')).toHaveAttribute('aria-disabled', 'true');
        await forms.pressGreyedWindowTab('Review Form');
        await forms.pressGreyedWindowTab('Form Items');
        await expect(forms.windowTab('Preview Form')).toHaveAttribute('aria-selected', 'true');
        await expect(forms.previewForm).toContainText(`${items[0]}*`);
        await forms.closeWindow();

        // "Copy" › "OK": a second, unticked row at the bottom with "Edit" and
        // "Delete", carrying the same items.
        controls = await forms.rowControls(forms.row(title).first());
        await forms.control(controls, 'Copy').click();
        await forms.answerConfirm(COPY_FORM, 'OK');
        await expect(forms.savedNotice()).toBeVisible({timeout: 30_000});
        await expect(forms.row(title)).toHaveCount(2, {timeout: 30_000});
        const copy = forms.rows().last();
        await expect(copy).toContainText(title);
        expect(await forms.rowCounts(copy)).toEqual({inReview: 0, completed: 0});
        await expect(forms.activeBox(copy)).not.toBeChecked();
        const copyControls = await forms.rowControls(copy);
        await expect(forms.control(copyControls, 'Edit')).toBeVisible();
        await expect(forms.control(copyControls, 'Delete')).toBeVisible();
        await forms.control(copyControls, 'Edit').click();
        await expect(forms.windowHeading()).toHaveText('Edit', {timeout: 30_000});
        await forms.openWindowTab('Form Items');
        await expect(forms.itemRows()).toHaveCount(2, {timeout: 30_000});
        await expect(forms.itemRows().nth(0)).toContainText(items[0]);
        await expect(forms.itemRows().nth(1)).toContainText(items[1]);
        await forms.closeWindow();

        // The open request's "Edit" window: "Method check" selected, not the
        // first entry; the completed request's window has no list at all
        // (control: its public-visibility box, read the same way, is there).
        const workflow = new WorkflowPage(page, tag);
        await workflow.gotoEditorial(submissionId);
        const openEdit = await openEditReview(page, workflow.panelRow('Reviewers', reviewers[0].name));
        await expect(reviewFormSelect(openEdit)).toBeVisible({timeout: 30_000});
        await expect(reviewFormSelect(openEdit).locator('option').first()).toHaveText(NONE_FORM);
        await expect(reviewFormSelect(openEdit).locator('option:checked')).toHaveText(title);
        await closeSideWindow(openEdit);
        const doneEdit = await openEditReview(page, workflow.panelRow('Reviewers', reviewers[1].name));
        await expect(publicVisibilityCheckbox(doneEdit)).toBeVisible();
        await expect(reviewFormSelect(doneEdit)).toHaveCount(0);
        await closeSideWindow(doneEdit);

        // Deactivate while carried: the question, "OK", the notice, the tick
        // gone (the scenario's own sentence; A2 is asserted neither way).
        await settings.goto('Review Forms');
        await forms.activeBox(forms.row(title).first()).click();
        await forms.answerConfirm(DEACTIVATE_FORM, 'OK');
        await expect(forms.savedNotice()).toBeVisible({timeout: 30_000});
        await expect(forms.activeBox(forms.row(title).first())).not.toBeChecked();

        // The Reviewer's step 3 still shows the form instead of the two boxes.
        const reviewerPage = await (await asUser(reviewer)).newPage();
        const wizard = new ReviewWizardPage(reviewerPage, tag);
        await wizard.goto(submissionId);
        await walkToStep3(wizard);
        await expect(wizard.step3Form.getByRole('heading', {name: title})).toBeVisible({timeout: 30_000});
        await expect(wizard.formRadio('Yes')).toBeVisible();
        await expect(wizard.formRadio('No')).toBeVisible();
        await expect(wizard.step3Form).toContainText(items[1]);
        await expect(freeTextBoxes(reviewerPage)).toHaveCount(0);

        // Control: "Add Reviewer" now has no "Review Form" list, the copy
        // being inactive (the review type radios are there).
        const modal = await openRequestForm(page, tag, submissionId, spare.name);
        await expect(modal.locator('#regularReviewerForm input[name="reviewMethod"]').first()).toBeVisible();
        await expect(reviewFormSelect(modal)).toHaveCount(0);
    });

    test('S8: deactivate and delete an unused form', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s8', testInfo);
        const title = 'Style check';
        const {manager, spare, submissionId} = await seedJournal(ojsApi, tag, {
            reviewForms: [{title, active: true, elements: [{question: 'Is the style consistent?', type: 'textarea'}]}],
            spare: true,
        });
        const page = await (await asUser(manager)).newPage();
        const settings = new ReviewSettingsPage(page, tag);
        const forms = settings.forms;

        // Control for the absence below: while the form is active the list is
        // offered, "Style check" under "None / Free Form Review".
        let modal = await openRequestForm(page, tag, submissionId, spare.name);
        await expect(reviewFormSelect(modal)).toBeVisible({timeout: 30_000});
        await expect(reviewFormSelect(modal).locator('option')).toHaveText([NONE_FORM, title]);
        await closeRequestForm(modal);

        // Untick "Active": the deactivation question, "OK", the notice, the tick gone.
        await settings.goto('Review Forms');
        const row = forms.row(title).first();
        await expect(forms.activeBox(row)).toBeChecked();
        await forms.activeBox(row).click();
        await expect(forms.confirmWindow(DEACTIVATE_FORM)).toBeVisible({timeout: 30_000});
        await forms.answerConfirm(DEACTIVATE_FORM, 'OK');
        await expect(forms.savedNotice()).toBeVisible({timeout: 30_000});
        await expect(forms.activeBox(forms.row(title).first())).not.toBeChecked();

        // With no other active form, "Add Reviewer" has no "Review Form" list.
        modal = await openRequestForm(page, tag, submissionId, spare.name);
        await expect(modal.locator('#regularReviewerForm input[name="reviewMethod"]').first()).toBeVisible();
        await expect(reviewFormSelect(modal)).toHaveCount(0);
        await closeRequestForm(modal);

        // "Delete" › "OK": the row is gone.
        await settings.goto('Review Forms');
        const controls = await forms.rowControls(forms.row(title).first());
        await forms.control(controls, 'Delete').click();
        await forms.answerConfirm(DELETE_FORM, 'OK');
        await expect(forms.row(title)).toHaveCount(0, {timeout: 30_000});
        await expect(forms.noItems).toBeVisible({timeout: 30_000});
    });

    test('S9: add and retire a recommendation', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s9', testInfo);
        const custom = 'Accept with minor changes';
        const {manager, reviewer, submissionId} = await seedJournal(ojsApi, tag, {reviewers: [{status: 'accepted'}]});
        const page = await (await asUser(manager)).newPage();
        const settings = new ReviewSettingsPage(page, tag);
        const table = settings.recommendations;
        await settings.goto('Reviewer Recommendations');

        // The six starting entries, in no fixed order (A7), all ticked.
        expect(unordered(await table.titles())).toEqual(unordered(DEFAULT_RECOMMENDATIONS));
        for (const title of DEFAULT_RECOMMENDATIONS) {
            await expect(table.tick(table.row(title))).toBeChecked();
        }

        // A refused entry: "Save" with the boxes empty shows the reason under
        // both boxes, "Please correct 2 errors." with "Jump to next error";
        // the window stays open and "Save" is greyed out until the boxes are
        // filled.
        await table.openAdd();
        await expect(table.saveButton).toBeEnabled();
        await table.saveButton.click();
        await expect(table.fieldError('title')).toContainText(REQUIRED_ERROR, {timeout: 30_000});
        await expect(table.fieldError('type')).toContainText(REQUIRED_ERROR);
        await expect(table.errorSummary).toContainText('Please correct 2 errors.');
        await expect(table.jumpToErrorButton).toBeVisible();
        await expect(table.titleInput).toBeVisible();
        await expect(table.saveButton).toBeDisabled();

        // The new entry: filled, "Save" enables; the table lists seven rows,
        // the new one among them (its place is not fixed, A7), ticked.
        await table.saveOpenWindow({title: custom, type: 'Approved'});
        await expect.poll(async () => unordered(await table.titles())).toEqual(unordered([...DEFAULT_RECOMMENDATIONS, custom]));
        await expect(table.tick(table.row(custom))).toBeChecked();

        // Untick "See Comments" › "Yes": the row is unticked; the other rows
        // keep their ticks (where the toggled row lands is A7: not fixed, so
        // no order is asserted here).
        await table.tick(table.row('See Comments')).click();
        await table.answerConfirm('Are you sure you want to deactivate the recommendation See Comments', 'Yes');
        await expect(table.tick(table.row('See Comments'))).not.toBeChecked({timeout: 30_000});
        expect((await table.titles()).sort()).toEqual([...DEFAULT_RECOMMENDATIONS, custom].sort());
        for (const title of DEFAULT_RECOMMENDATIONS.filter((t) => t !== 'See Comments')) {
            await expect(table.tick(table.row(title))).toBeChecked();
        }

        // Reviewer: step 3's list offers the new entry and has no "See
        // Comments"; control: the five entries left ticked are all there.
        const reviewerPage = await (await asUser(reviewer)).newPage();
        const wizard = new ReviewWizardPage(reviewerPage, tag);
        await wizard.goto(submissionId);
        await walkToStep3(wizard);
        const options = (await wizard.recommendationSelect.locator('option').allInnerTexts()).map((s) => s.trim());
        expect(options).toContain(custom);
        expect(options).not.toContain('See Comments');
        for (const title of DEFAULT_RECOMMENDATIONS.filter((t) => t !== 'See Comments')) {
            expect(options).toContain(title);
        }
    });

    test('S10: a recommendation in use loses its menu', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s10', testInfo);
        const inUse = 'Accept with minor changes';
        const unused = 'Needs a native speaker';
        const {manager, reviewer, reviewerName, submissionId} = await seedJournal(ojsApi, tag, {reviewers: [{status: 'accepted'}]});

        // The two custom entries, made through the tab's own "Add
        // Recommendation" window (the context API has no key for them).
        const page = await (await asUser(manager)).newPage();
        const settings = new ReviewSettingsPage(page, tag);
        const table = settings.recommendations;
        await settings.goto('Reviewer Recommendations');
        await table.add({title: inUse, type: 'Approved'});
        await table.add({title: unused, type: 'With Comments'});
        await expect(table.tick(table.row(inUse))).toBeChecked();
        await expect(table.tick(table.row(unused))).toBeChecked();

        // The reviewer submits a review choosing the first entry.
        const reviewerPage = await (await asUser(reviewer)).newPage();
        await performReview(reviewerPage, tag, submissionId, {recommendation: inUse, comments: `Review ${tag}`});

        // The entry in use has no "More Actions" (control: the unused row's
        // menu, read the same way, is there).
        await settings.goto('Reviewer Recommendations');
        await expect(table.tick(table.row(inUse))).toBeVisible({timeout: 30_000});
        await expect(table.menuButton(table.row(unused))).toBeVisible();
        await expect(table.menuButton(table.row(inUse))).toHaveCount(0);

        // Deactivate the entry in use: the Reviewers panel still prints it
        // under "Review Submitted"; "Read Review" lists it on its
        // "Recommendation:" line while the "Reviewer Recommendation" section
        // prints "-" (the scenario's own sentence; A6 is not asserted beyond it).
        await table.tick(table.row(inUse)).click();
        await table.answerConfirm(`Are you sure you want to deactivate the recommendation ${inUse}`, 'Yes');
        await expect(table.tick(table.row(inUse))).not.toBeChecked({timeout: 30_000});
        const workflow = new WorkflowPage(page, tag);
        await workflow.gotoEditorial(submissionId);
        const row = workflow.panelRow('Reviewers', reviewerName);
        await expect(statusCell(row)).toContainText('Review Submitted');
        await expect(statusCell(row)).toContainText(inUse);
        let readModal = await openReviewDetails(page, row);
        await awaitReviewDetailsSettled(readModal);
        await expect(recommendationLine(readModal)).toContainText(`Recommendation: ${inUse}`);
        await expect(recommendationValue(readModal)).toHaveText('-');
        await closeReviewDetails(page, readModal);

        // The unused entry offers "Edit" and "Delete"; "Delete" › "Yes" removes it.
        await settings.goto('Reviewer Recommendations');
        const items = await table.openMenu(table.row(unused));
        await expect(items).toHaveText(['Edit', 'Delete']);
        await page.getByRole('menuitem', {name: 'Delete', exact: true}).click();
        await table.answerConfirm(`Are you sure you want to delete the recommendation ${unused}`, 'Yes');
        await expect(table.row(unused)).toHaveCount(0, {timeout: 30_000});
        expect((await table.titles()).sort()).toEqual([...DEFAULT_RECOMMENDATIONS, inUse].sort());

        // Control: ticked again, the section prints the title again.
        await table.tick(table.row(inUse)).click();
        await table.answerConfirm(`Are you sure you want to activate the recommendation ${inUse}`, 'Yes');
        await expect(table.tick(table.row(inUse))).toBeChecked({timeout: 30_000});
        await workflow.gotoEditorial(submissionId);
        readModal = await openReviewDetails(page, workflow.panelRow('Reviewers', reviewerName));
        await awaitReviewDetailsSettled(readModal);
        await expect(recommendationValue(readModal)).toHaveText(inUse);
        await expect(recommendationLine(readModal)).toContainText(`Recommendation: ${inUse}`);
    });

    test('S12: the other roles are refused the screen', async ({asUser}) => {
        test.slow();
        const settingsUrl = `/index.php/${JOURNAL}/management/settings/workflow`;
        const roles = [
            {username: 'sectioneditor.ana', landing: `/index.php/${JOURNAL}/dashboard/editorial`},
            {username: 'assistant.rita', landing: `/index.php/${JOURNAL}/dashboard/editorial`},
            {username: 'reviewer.julia', landing: `/index.php/${JOURNAL}/dashboard/reviewAssignments`},
            {username: 'author.alex', landing: `/index.php/${JOURNAL}/dashboard/mySubmissions`},
        ];
        for (const {username, landing} of roles) {
            const page = await (await asUser(username)).newPage();
            // The sidebar has no "Settings" group (control: the same sidebar's
            // own groups are there, read the same way).
            await page.goto(landing);
            const nav = siteNav(page);
            await expect(nav).toBeVisible({timeout: 30_000});
            await expect(nav.getByRole('button').first()).toBeVisible();
            await expect(nav.getByRole('button', {name: 'Settings', exact: true})).toHaveCount(0);
            // The typed address lands on the refusal.
            await page.goto(settingsUrl);
            await expect(page.getByText(ACCESS_DENIED, {exact: true})).toBeVisible({timeout: 30_000});
            await expect(page.getByRole('heading', {name: 'Workflow Settings'})).toHaveCount(0);
            await page.close();
        }

        // Control: the Journal Manager's collapsed "Settings" group lists
        // "Workflow", which leads to the page with its "Review" tab.
        const page = await (await asUser('manager.maya')).newPage();
        await page.goto(`/index.php/${JOURNAL}/dashboard/editorial`);
        const nav = siteNav(page);
        const settingsGroup = nav.getByRole('button', {name: 'Settings', exact: true});
        await expect(settingsGroup).toBeVisible({timeout: 30_000});
        await expect(nav.getByRole('link', {name: 'Workflow', exact: true})).toHaveCount(0);
        await settingsGroup.click();
        const workflowLink = nav.getByRole('link', {name: 'Workflow', exact: true});
        await expect(workflowLink).toBeVisible({timeout: 30_000});
        await workflowLink.click();
        const settings = new ReviewSettingsPage(page, JOURNAL);
        await expect(settings.heading).toBeVisible({timeout: 30_000});
        await expect(settings.reviewTab).toBeVisible();
        await expect(page.getByText(ACCESS_DENIED, {exact: true})).toHaveCount(0);
    });

    test('S13: a submitted review on a form with an item kept from the author', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s13', testInfo);
        const title = 'Method check';
        const question = 'Is the method sound?';
        const remark = 'The sample is small.';
        const {manager, reviewer, reviewerName, submissionId} = await seedJournal(ojsApi, tag, {
            review: {numReviewsPerSubmission: 1},
            reviewForms: [{
                title,
                elements: [
                    {question, type: 'radiobuttons', options: ['Yes', 'No']},
                    {question: 'Other remarks', type: 'textarea', included: false},
                ],
            }],
            reviewers: [{status: 'accepted', reviewForm: title}],
        });

        // The form's row before the review: 1 / 0.
        const page = await (await asUser(manager)).newPage();
        const settings = new ReviewSettingsPage(page, tag);
        const forms = settings.forms;
        await settings.goto('Review Forms');
        expect(await forms.rowCounts(forms.row(title).first())).toEqual({inReview: 1, completed: 0});

        // The Reviewer's step 3: the form instead of the two boxes; answered
        // and submitted through the wizard's own confirmation.
        const reviewerPage = await (await asUser(reviewer)).newPage();
        const wizard = new ReviewWizardPage(reviewerPage, tag);
        await wizard.goto(submissionId);
        await walkToStep3(wizard);
        await expect(wizard.step3Form.getByRole('heading', {name: title})).toBeVisible({timeout: 30_000});
        await expect(wizard.step3Form).toContainText(question);
        await expect(wizard.formRadio('Yes')).toBeVisible();
        await expect(wizard.formRadio('No')).toBeVisible();
        await expect(wizard.step3Form).toContainText('Other remarks');
        const remarksBox = wizard.step3Form.locator('textarea[name^="reviewFormResponses"]');
        await expect(remarksBox).toBeVisible();
        await expect(freeTextBoxes(reviewerPage)).toHaveCount(0);
        await wizard.formRadio('Yes').check();
        await remarksBox.fill(remark);
        await wizard.chooseRecommendation('Accept Submission');
        await wizard.submitReview();
        await wizard.expectCompleted();

        // The form's row after the review: 0 / 1.
        await settings.goto('Review Forms');
        expect(await forms.rowCounts(forms.row(title).first())).toEqual({inReview: 0, completed: 1});

        // The round status opens with the minimum line; control: with the
        // review submitted but not confirmed, the line under it is not the
        // confirmed sentence.
        const workflow = new WorkflowPage(page, tag);
        await workflow.gotoEditorial(submissionId);
        const lines = workflow.statusLines('Round 1 Status');
        await expect(lines.first()).toHaveText(MINIMUM_LINE, {timeout: 30_000});
        await expect(lines).toHaveCount(2);
        await expect(workflow.statusBox('Round 1 Status')).not.toContainText(CONFIRMED_LINE);

        // "Read Review": both items with their answers, whatever the item's box.
        const row = workflow.panelRow('Reviewers', reviewerName);
        await expect(statusCell(row)).toContainText('Review Submitted');
        const readModal = await openReviewDetails(page, row);
        await awaitReviewDetailsSettled(readModal);
        await expect(reviewItemBlock(readModal, question)).toContainText('Yes');
        await expect(reviewItemBlock(readModal, 'Other remarks')).toContainText(remark);

        // "Mark as Complete": the first line stays and the round's own line
        // reads the confirmed sentence.
        await markReviewComplete(page, readModal);
        await closeReviewDetails(page, readModal);
        await page.reload();
        await workflow.expectOpen();
        await expect(workflow.statusLines('Round 1 Status')).toHaveText([MINIMUM_LINE, CONFIRMED_LINE], {timeout: 30_000});
    });
});
