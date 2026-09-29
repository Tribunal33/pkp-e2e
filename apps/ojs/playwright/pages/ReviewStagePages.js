/**
 * @file playwright/pages/ReviewStagePages.js
 *
 * OJS-local Page Objects and flow helpers for the review stage & rounds
 * feature (spec: lib/pkp/docs/e2e/specs/U26-review-stage-and-rounds.md).
 *
 * Surfaces:
 * - WorkflowPage — the per-submission workflow dialog on the editorial
 *   (dashboard/editorial) and author (dashboard/mySubmissions) dashboards:
 *   round menu, status box, file/reviewer/participant panels, decision
 *   buttons, the Request Revisions entry modal; plus, delegating to the
 *   shared frame (`shared/playwright/pages/WorkflowPage.js`, held as
 *   `frame`), the Submission stage's reads of U25: the stage label, the
 *   status box above "Submission Files" or its absence, the exact ordered
 *   panel headings, the action region's buttons, the "Schedule For
 *   Publication" press to "Title & Abstract" and the return to
 *   "Submission", the "Reviewers Suggested by Author" panel, Delete; and,
 *   for U34 (2026-09-20), what a decision scenario reads around the wizard:
 *   the exact decision-button list, the "Request Revisions" choice window,
 *   the minimum-reviews dialog, the "Recommendation" box and "Change
 *   decision", the Participants row's recommend-only flag, the discussions
 *   rows and a discussion's window, the author's "Notifications" list and
 *   "Read Review" window, the header's "Library" › "Add a file", and the
 *   "Submission Files" and "Revisions Uploaded" uploads. The wizard itself
 *   and its composer are `DecisionWizardPages.js`.
 * - DecisionPage — the full-page decision wizard (decision/record/…):
 *   composer steps, promote-files step, Record Decision, success dialog.
 * - uploadViaWizard / uploadFirstStepOnly / inMemoryFile — the legacy jQuery
 *   file-upload wizard (3 tabs: Upload File → Review Details → Confirm), and
 *   its first step abandoned after the transfer.
 * - openReviewFilesDialog / reviewFilesCheckbox / uploadInReviewFilesDialog /
 *   confirmReviewFilesDialog — the "Files for Review" panel's selection
 *   window ("Current Review Files For Round {N}").
 * - addReviewer / acceptReviewRequest / performReview / assignParticipant —
 *   the legacy grid flows around the review stage (Add Reviewer form,
 *   reviewer steps 1–4, the stage-participant form).
 * - signInAgain — a real login in a session-less context (the daily
 *   revised-version throttle re-arms on a sign-in).
 * - reviewDetailsModal / openReviewDetails / awaitReviewDetailsSettled /
 *   markReviewComplete / closeReviewDetails — the Vue "Review Details" side
 *   modal that replaced the legacy read-review window (form#readReviewForm
 *   is gone; pkp/pkp-lib#13156).
 *
 * Labels are the live locale strings (lib/pkp/locale/en/*.po); the DOM shapes
 * were confirmed against a live install (aria snapshots, 2026-07-31; the
 * Review Details modal re-probed 2026-08-29).
 */
const path = require('path');
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {WorkflowPage: WorkflowFrame} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {SuggestedReviewersPanel, SUGGESTED_PANEL_HEADING} =
    require('../../../../shared/playwright/pages/ReviewerSuggestionPages.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {waitForEditorReady, editorIdOf} = require('../../../../shared/playwright/support/richtext.js');

/** Default upload fixture (app-local). */
const FIXTURE_PDF = path.join(__dirname, '..', 'fixtures', 'files', 'article.pdf');
const FIXTURE_PDF_NAME = 'article.pdf';

exports.FIXTURE_PDF = FIXTURE_PDF;
exports.FIXTURE_PDF_NAME = FIXTURE_PDF_NAME;

/**
 * An in-memory upload payload for `setInputFiles()`, so a scenario that
 * needs several distinctly named files needs no fixture per name.
 *
 * @param {string} name the file name the screens will list
 */
exports.inMemoryFile = function inMemoryFile(name) {
    return {name, mimeType: 'text/plain', buffer: Buffer.from(`Seeded upload ${name}`)};
};

/** The listed name of a `file` argument (a fixture path or an in-memory payload). */
function fileName(file) {
    return typeof file === 'string' ? path.basename(file) : file.name;
}
exports.fileName = fileName;

exports.WorkflowPage = class WorkflowPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        /**
         * The shared workflow frame (header, side menu, main column, action
         * region: `shared/playwright/pages/WorkflowPage.js`), which the
         * stage-independent reads below delegate to.
         */
        this.frame = new WorkflowFrame(page, contextPath);
    }

    /** Open a submission's workflow on the editorial dashboard. */
    async gotoEditorial(submissionId) {
        await this.page.goto(
            this.contextUrl(this.contextPath, `/dashboard/editorial?workflowSubmissionId=${submissionId}`)
        );
        await this.expectOpen();
    }

    /** Open the author view of the same workflow (My Submissions). */
    async gotoAuthor(submissionId) {
        await this.page.goto(
            this.contextUrl(this.contextPath, `/dashboard/mySubmissions?workflowSubmissionId=${submissionId}`)
        );
        await this.expectOpen();
    }

    /** The workflow dialog is mounted (any stage). */
    async expectOpen() {
        await expect(
            this.page.getByRole('heading', {name: /^Workflow:/})
        ).toBeVisible({timeout: 30_000});
    }

    /** The stage page title, e.g. expectPageTitle('Review (Round 1)'). */
    async expectPageTitle(title) {
        await expect(
            this.page.getByRole('heading', {name: `Workflow: ${title}`})
        ).toBeVisible({timeout: 30_000});
    }

    /** Workflow-menu link for a round entry, e.g. roundLink(2). */
    roundLink(round) {
        return this.page.getByRole('link', {name: `Review Round ${round}`, exact: true});
    }

    async selectRound(round) {
        await this.roundLink(round).click();
        await this.expectPageTitle(`Review (Round ${round})`);
    }

    /**
     * The round status box (WorkflowSubmissionStatus): a bordered box with an
     * h3 heading ("Round {N} Status" on the current round, plain "Status" on
     * past rounds/stages) and the status sentence.
     */
    statusBox(heading) {
        return this.page
            .locator('div.border')
            .filter({has: this.page.getByRole('heading', {name: heading, exact: true})});
    }

    async expectStatus(heading, body) {
        await expect(this.statusBox(heading)).toContainText(body, {timeout: 20_000});
    }

    /**
     * The status box's lines, one `p` each, in screen order: on a journal
     * with a "Minimum Confirmed Reviews Required" the minimum line comes
     * first and the round sentence (when one shows) second. Assert the
     * whole array to read a box "alone" or "first line".
     */
    statusLines(heading) {
        return this.statusBox(heading).locator('p');
    }

    /**
     * A PkpTable panel wrapper (header + controls + table) located via the
     * table's accessible name (aria-labelledby = the panel h3). `.last()`
     * resolves to the innermost wrapping div, which contains the panel's own
     * buttons alongside the table.
     */
    panel(title) {
        return this.page
            .locator('div')
            .filter({has: this.page.getByRole('table', {name: title, exact: true})})
            .last();
    }

    /** A row of the named panel containing the given text. */
    panelRow(title, text) {
        return this.panel(title).getByRole('row').filter({hasText: text});
    }

    /** A decision/action button in the workflow action area. */
    decisionButton(label) {
        return this.page.getByRole('button', {name: label, exact: true});
    }

    /**
     * "Request Revisions" first opens the WorkflowSelectRevisionFormModal with
     * a radio choice; the new-round choice continues under the wizard name
     * "Resubmit for Review" (Rule 11).
     *
     * @param {{newRound?: boolean}} options
     */
    async clickRequestRevisions({newRound = false} = {}) {
        await this.decisionButton('Request Revisions').click();
        const modal = this.page
            .getByRole('dialog')
            .filter({hasText: 'Require New Review Round'});
        const label = newRound
            ? 'Revisions will be subject to a new round of peer reviews.'
            : 'Revisions will not be subject to a new round of peer reviews.';
        await modal.getByRole('radio', {name: label}).check();
        await modal.getByRole('button', {name: 'Next', exact: true}).click();
    }

    /** A participant list item's More Actions button ("{Name} More Actions"). */
    participantMoreActions(name) {
        return this.page.getByRole('button', {name: `${name} More Actions`});
    }

    // ---------------------------------------------------------------------
    // The Submission stage (U25): stage label, status box, panels, shortcut
    // ---------------------------------------------------------------------

    /** The stage label under the title reads exactly this ("Submission", "Declined", …). */
    async expectStage(label) {
        await this.frame.expectStage(label);
    }

    /**
     * No status box on the stage: the quiet state while the submission has
     * not left it (U25 Rule 8). An absence read: the caller pairs it with a
     * panel or button rendered on the same screen.
     */
    async expectNoStatusBox() {
        await this.frame.expectNoStatusBox();
    }

    /** The status box reads `body` and sits directly above "Submission Files" (U25 Rule 8). */
    async expectStatusAboveFiles(body) {
        await this.frame.expectStatusAbovePanel(body, 'Submission Files');
    }

    /** The open panel's level-3 headings are exactly these, in order (U25 Rules 1, 10). */
    async expectPanelHeadings(labels) {
        await this.frame.expectPanelHeadings(labels);
    }

    /** A button of the stage's action region, by exact label (decision buttons and the shortcut). */
    actionButton(label) {
        return this.frame.actionButton(label);
    }

    /** Every button of the action region, left to right ([] when it offers none). */
    async actionButtonLabels() {
        return this.frame.actionButtonLabels();
    }

    /** Press "Schedule For Publication": the panel moves to "Publication: Title & Abstract" (U25 Rule 7). */
    async pressScheduleForPublication() {
        await this.frame.pressShortcutToPage('Schedule For Publication', 'Title & Abstract');
    }

    /** A workflow-menu stage entry by label ("Submission", "Review", "Copyediting", "Production"). */
    stageLink(label) {
        return this.frame.stageLink(label);
    }

    /** Select "Submission" in the workflow menu and wait for "Workflow: Submission". */
    async selectSubmissionStage() {
        await this.frame.selectStage('Submission');
    }

    /** The "Reviewers Suggested by Author" panel under Participants (shared POM). */
    suggestedReviewers() {
        return new SuggestedReviewersPanel(this.page);
    }

    /** The suggestions panel lists the named person with the author's reason (U25 Rule 1). */
    async expectSuggestedReviewer(name, reason) {
        const row = this.suggestedReviewers().row(name);
        await expect(row).toBeVisible({timeout: 30_000});
        await expect(row).toContainText(reason);
    }

    /** No suggestions panel: an absence read, paired by the caller with the panels that do show. */
    async expectNoSuggestedReviewersPanel() {
        await expect(this.suggestedReviewers().heading()).toHaveCount(0);
    }

    /** The stage's "Delete" button and its confirm dialog; on confirm the panel closes (U25 Rule 6). */
    async deleteSubmission({confirm = true} = {}) {
        await this.frame.deleteSubmission({confirm});
    }

    // ---------------------------------------------------------------------
    // The decision buttons, the choice window, the minimum-reviews dialog,
    // the "Recommendation" box (U34, 2026-09-20; spec Rules 13–15)
    // ---------------------------------------------------------------------

    /** The action region's buttons are exactly these, left to right (auto-waited). */
    async expectDecisionButtons(labels) {
        await expect.poll(() => this.frame.actionButtonLabels(), {timeout: 30_000}).toEqual(labels);
    }

    /** The "Request Revisions" side window (Rule 14), a dialog named by its title. */
    requestRevisionsWindow() {
        return this.page.getByRole('dialog', {name: 'Request Revisions', exact: true});
    }

    /**
     * Press "Request Revisions" (or "Recommend Revisions") and wait for the
     * window with its "Require New Review Round" choice; returned open.
     */
    async openRequestRevisionsWindow(buttonLabel = 'Request Revisions') {
        await this.frame.actionButton(buttonLabel).click();
        const win = this.requestRevisionsWindow();
        await expect(win).toBeVisible({timeout: 30_000});
        await expect(win.getByRole('button', {name: 'Next', exact: true})).toBeVisible({timeout: 30_000});
        return win;
    }

    /** One of the window's two options, by its label. */
    revisionOption(win, label) {
        return win.getByRole('radio', {name: label, exact: true});
    }

    /** The window's "Next": the wizard opens for the chosen decision. */
    async pressNext(win) {
        await win.getByRole('button', {name: 'Next', exact: true}).click();
        await expect(win).toBeHidden({timeout: 30_000});
    }

    /** The window's close control (the cross): the choice is abandoned. */
    async closeRequestRevisionsWindow(win) {
        await win.getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(win).toBeHidden({timeout: 30_000});
    }

    /** The "Proceed Without Minimum Confirmed Reviews?" dialog (Rule 15). */
    minimumReviewsDialog() {
        return this.page.getByRole('dialog', {name: 'Proceed Without Minimum Confirmed Reviews?', exact: true});
    }

    /** Press a decision button and wait for the minimum-reviews dialog; returned open. */
    async pressExpectingMinimumDialog(buttonLabel) {
        await this.frame.actionButton(buttonLabel).click();
        const dialog = this.minimumReviewsDialog();
        await expect(dialog).toBeVisible({timeout: 30_000});
        return dialog;
    }

    /** Answer the dialog ("Yes, Continue" or "Cancel"); it closes. */
    async answerMinimumDialog(label) {
        await this.minimumReviewsDialog().getByRole('button', {name: label, exact: true}).click();
        await expect(this.minimumReviewsDialog()).toHaveCount(0, {timeout: 30_000});
    }

    /** The round's "Recommendation" box (a bordered box headed "Recommendation"). */
    recommendationBox() {
        return this.frame
            .dialog()
            .locator('div.border')
            .filter({has: this.page.getByRole('heading', {name: 'Recommendation', exact: true})});
    }

    /** The box's "Change decision" button (the recommending editor's). */
    changeDecisionButton() {
        return this.frame.actionItems().getByRole('button', {name: 'Change decision', exact: true});
    }

    /** A Reviewers panel row by the reviewer's name. */
    reviewerRow(name) {
        return this.panelRow('Reviewers', name);
    }

    /** A Participants row by the person's display name. */
    participantRow(name) {
        return this.frame.secondaryColumn().getByRole('listitem').filter({hasText: name});
    }

    /**
     * Participants row › "Edit" › tick "Assignment privileges" (the
     * recommend-only flag) › "OK": the assignment becomes a recommending one
     * (no seed key; scenarios.md "Decision behaviour worth knowing").
     */
    async setRecommendOnly(name) {
        await exports.clickRowAction(this.page, this.participantRow(name), 'Edit');
        const form = this.page.getByRole('dialog').filter({has: this.page.locator('input[name="recommendOnly"]')});
        const box = form.locator('input[name="recommendOnly"]');
        await expect(box).toBeVisible({timeout: 30_000});
        await box.check();
        await form.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(form).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    // ---------------------------------------------------------------------
    // Discussions, the author's "Notifications" list and "Read Review",
    // the Library, the stage uploads (U34)
    // ---------------------------------------------------------------------

    /** The rows of "Review Tasks & Discussions" carrying `text`. */
    discussionRow(text) {
        return this.frame.panel('Review Tasks & Discussions').getByRole('row').filter({hasText: text});
    }

    /** A discussion's window, a dialog titled with its subject. */
    discussionWindow(subject) {
        return this.page.getByRole('dialog', {name: subject, exact: true});
    }

    /** Open a discussion row's first control: its window, settled on its "Participants" heading. */
    async openDiscussion(row, subject) {
        await row.locator('a, button').first().click();
        const win = this.discussionWindow(subject);
        await expect(win).toBeVisible({timeout: 30_000});
        await expect(win.getByRole('heading', {name: 'Participants', exact: true})).toBeVisible({timeout: 30_000});
        return win;
    }

    /** Close a discussion window through its "Close". */
    async closeDiscussion(win) {
        await win.getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(win).toBeHidden({timeout: 30_000});
    }

    /** The author's "Notifications" heading on their review stage (U26 Rule 16). */
    notificationsHeading() {
        return this.frame.dialog().getByRole('heading', {name: 'Notifications', exact: true});
    }

    /**
     * The list under it (the innermost div holding the heading). The `has`
     * locator is page-level: one scoped to the dialog is re-queried from
     * each candidate div and never matches.
     */
    notificationsList() {
        return this.frame
            .dialog()
            .locator('div')
            .filter({has: this.page.getByRole('heading', {name: 'Notifications', exact: true})})
            .last();
    }

    /** A letter's line in the list, by its subject. */
    notificationItem(subject) {
        return this.notificationsList().getByRole('listitem').filter({hasText: subject});
    }

    /** The author's "Read Review" window (the legacy `readReviewForm`), titled "Review: {title}". */
    authorReadReviewWindow() {
        return this.page.getByRole('dialog').filter({has: this.page.locator('form#readReviewForm')});
    }

    /** Press the reviewer row's "Read Review" as the author and return the window. */
    async openAuthorReadReview(reviewerName) {
        await this.reviewerRow(reviewerName).getByRole('button', {name: 'Read Review', exact: true}).click();
        const win = this.authorReadReviewWindow();
        await expect(win.getByRole('heading', {name: reviewerName})).toBeVisible({timeout: 30_000});
        return win;
    }

    /** The window's "Reviewer Files" grid. */
    authorReviewerFilesGrid(win) {
        return win.locator('[id^="reviewAttachmentsGridContainer"], .pkp_controllers_grid').filter({hasText: 'Reviewer Files'}).first();
    }

    /** The workflow header's "Library" button. */
    libraryButton() {
        return this.frame.headerButton('Library');
    }

    /**
     * "Library" › "Add a file": name, the first real type, the file, "OK";
     * the row then lists in the window, which is closed (footnote s1's
     * given). Returns after the window is gone.
     */
    async addLibraryFile({name, file}) {
        await this.libraryButton().click();
        const win = this.page.getByRole('dialog').filter({hasText: 'Submission Library'}).last();
        const addLink = win.getByRole('link', {name: 'Add a file', exact: true});
        await expect(addLink).toBeVisible({timeout: 30_000});
        await waitForJQueryIdle(this.page);
        await addLink.click();
        const form = this.page.getByRole('dialog').filter({has: this.page.locator('input[name^="libraryFileName"]')}).last();
        const nameBox = form.locator('input[name^="libraryFileName"]').first();
        await expect(nameBox).toBeVisible({timeout: 30_000});
        await nameBox.fill(name);
        const type = form.locator('select[name="fileType"]');
        const options = await type.locator('option').evaluateAll((els) => els.map((o) => /** @type {HTMLOptionElement} */ (o).value));
        await type.selectOption(options.find((v) => v && v !== '') || options[0]);
        await form.locator('input[type="file"]').setInputFiles(file);
        await expect(form.locator('input[name="temporaryFileId"]')).not.toHaveValue('', {timeout: 30_000});
        await form.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(form.locator('input[name^="libraryFileName"]')).toHaveCount(0, {timeout: 30_000});
        await waitForJQueryIdle(this.page);
        await expect(win.getByRole('row').filter({hasText: name})).toBeVisible({timeout: 30_000});
        await win.getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(win).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    /** The Submission stage's "Submission Files" › "Upload": one file through the wizard. */
    async uploadSubmissionFile(file = FIXTURE_PDF) {
        await this.panel('Submission Files').getByRole('button', {name: 'Upload', exact: true}).click();
        await exports.uploadViaWizard(this.page, {file});
        await expect(this.panelRow('Submission Files', fileName(file))).toBeVisible({timeout: 30_000});
    }

    /** The round's "Revisions Uploaded" › "Upload" (the editorial path): one file through the wizard. */
    async uploadRevision(file = FIXTURE_PDF) {
        await this.panel('Revisions Uploaded').getByRole('button', {name: 'Upload', exact: true}).click();
        await exports.uploadViaWizard(this.page, {file});
        await expect(this.panelRow('Revisions Uploaded', fileName(file))).toBeVisible({timeout: 30_000});
    }
};

exports.SUGGESTED_PANEL_HEADING = SUGGESTED_PANEL_HEADING;

/**
 * The full-page decision wizard (decision/record/{id}). Steps render as a
 * jQuery-free Vue page: composer steps ("Notify Authors", …), an optional
 * promote-files step, footer buttons Continue / Record Decision, then a
 * success dialog with a "View Submission" link.
 */
exports.DecisionPage = class DecisionPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.continueButton = page.getByRole('button', {name: 'Continue', exact: true});
        this.recordButton = page.getByRole('button', {name: 'Record Decision', exact: true});
        this.viewSubmissionLink = page.getByRole('link', {name: 'View Submission'});
    }

    /**
     * The wizard page is open under the given decision title. The h1 reads
     * "{Decision}: {Step}" on multi-step wizards and plain "{Decision}" on
     * single-step ones (templates/decision/record.tpl).
     */
    async expectOpen(title) {
        const pattern = title instanceof RegExp
            ? title
            : new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(:|$)`);
        await expect(
            this.page.getByRole('heading', {name: pattern, level: 1})
        ).toBeVisible({timeout: 30_000});
    }

    /**
     * Wait for any email-template composer on the current step to finish
     * loading (locator pitfall: submitting during the load mask posts an empty
     * body that fails server-side validation).
     */
    async awaitComposerLoaded() {
        await expect(this.page.locator('.composer__loadingTemplateMask')).toHaveCount(0, {
            timeout: 30_000,
        });
    }

    /** Advance one step. */
    async continueStep() {
        await this.awaitComposerLoaded();
        await this.continueButton.click();
    }

    /** The promote-files checkbox rendered inside a label naming the file. */
    promoteFileCheckbox(fileName) {
        return this.page
            .locator('label')
            .filter({hasText: fileName})
            .locator('input[type="checkbox"]');
    }

    /** Record the decision and return to the workflow via "View Submission". */
    async record() {
        await this.awaitComposerLoaded();
        // The wizard can re-render under the click (click-lost-to-re-render,
        // observed on the OMP twin in the full-suite gate). Outcome-keyed
        // bounded re-click: success is the success dialog's "View
        // Submission" link; stop clicking once the decisions POST is on the
        // wire (recording a decision twice is not idempotent); click errors
        // (detached nodes mid-re-render) are swallowed and retried.
        let posted = false;
        this.page
            .waitForRequest(
                (r) => r.url().includes('/decisions') && r.method() === 'POST',
                {timeout: 60_000}
            )
            .then(
                () => (posted = true),
                () => {}
            );
        await expect(async () => {
            if (!(await this.viewSubmissionLink.count()) && !posted) {
                try {
                    await this.recordButton.click({timeout: 2_000});
                } catch {
                    // retried by toPass; success is the completion link
                }
            }
            expect(await this.viewSubmissionLink.count()).toBeGreaterThan(0);
        }).toPass({intervals: [500, 1_000, 2_000], timeout: 60_000});
        await this.viewSubmissionLink.click();
        await expect(this.page.getByRole('heading', {name: /^Workflow:/})).toBeVisible({
            timeout: 30_000,
        });
    }

    /**
     * Walk every remaining step with no per-step input: wait out composer
     * loads, Continue until "Record Decision" appears, record, and return to
     * the workflow.
     */
    async completeAll({maxSteps = 6} = {}) {
        for (let i = 0; i < maxSteps; i++) {
            await this.awaitComposerLoaded();
            if (await this.recordButton.isVisible()) {
                await this.record();
                return;
            }
            await this.continueButton.click();
        }
        throw new Error(`DecisionPage.completeAll: no "Record Decision" button within ${maxSteps} steps`);
    }
};

/** The legacy file-upload wizard's side modal. */
function uploadWizardDialog(page) {
    return page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});
}
exports.uploadWizardDialog = uploadWizardDialog;

/** The upload wizard's step tabs ("1. Upload File", "2. Review Details", "3. Confirm"). */
exports.uploadWizardSteps = function uploadWizardSteps(dialog) {
    return dialog.getByRole('tab');
};

/**
 * Any titled heading inside the upload wizard's side modal (the Vue side
 * modal's h1 is filled from the legacy options' title). The revision-upload
 * wizard the author's list opens has no title of its own (U22 Rule 7a), so
 * this locator is expected empty there; the step tabs are the positive
 * control that the dialog's text is being read.
 */
exports.uploadWizardTitles = function uploadWizardTitles(dialog) {
    return dialog.getByRole('heading').filter({hasText: /\S/});
};

/**
 * The wizard's first step: pick the component and attach the file, then
 * wait until the transfer has landed (the step's "Continue" enables only
 * then).
 *
 * @param {import('@playwright/test').Locator} dialog from uploadWizardDialog
 * @param {{genre: string, file: string | {name: string, mimeType: string, buffer: Buffer}}} options
 */
async function attachInWizard(dialog, {genre, file}) {
    const fileInput = dialog.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({timeout: 30_000});
    const genreSelect = dialog.locator('select[id^="genreId"]');
    if (await genreSelect.count()) {
        await genreSelect.selectOption({label: genre});
    }
    await fileInput.setInputFiles(file);
    await expect(dialog.getByRole('button', {name: 'Continue', exact: true})).toBeEnabled({
        timeout: 30_000,
    });
}

/**
 * Attach a file in the already-open upload wizard's first step, then close
 * the window without finishing, through the side modal's own "Close" (the
 * Side-effects claim: the upload stands from the first step). The wizard's
 * bottom "Cancel" link is a different path: the wizard's cancel handler
 * deletes the file it uploaded (FileUploadWizardHandler.wizardCancelRequested),
 * so it is not "closing without finishing".
 *
 * @param {import('@playwright/test').Page} page
 * @param {{genre?: string, file?: string | {name: string, mimeType: string, buffer: Buffer}}} options
 */
exports.uploadFirstStepOnly = async function uploadFirstStepOnly(page, {genre = 'Article Text', file = FIXTURE_PDF} = {}) {
    const dialog = uploadWizardDialog(page);
    await attachInWizard(dialog, {genre, file});
    // A browser confirm() on the way out would be dismissed by default,
    // which keeps the window open; accept one if the screen asks.
    page.once('dialog', (d) => d.accept().catch(() => {}));
    await dialog.getByRole('button', {name: 'Close', exact: true}).click();
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
    await waitForJQueryIdle(page);
};

/**
 * The "Files for Review" panel's selection window, "Current Review Files
 * For Round {N}", opened by the panel's "Upload/Select Files" button. It
 * lists the submission's workflow files with a checkbox each, carries the
 * "Upload Review File" link, and "OK" confirms the selection.
 *
 * @param {import('@playwright/test').Page} page
 */
exports.openReviewFilesDialog = async function openReviewFilesDialog(page) {
    await page.getByRole('button', {name: 'Upload/Select Files', exact: true}).click();
    const dialog = page.getByRole('dialog').filter({hasText: /Current Review Files For Round/});
    await expect(dialog.getByRole('link', {name: 'Upload Review File'})).toBeVisible({timeout: 30_000});
    await waitForJQueryIdle(page);
    return dialog;
};

/**
 * Tick the window's "Show files from all accessible workflow stages." box:
 * the list opens on the review stage's own files, and a file still on the
 * Submission stage is listed only once the box is ticked (seen 2026-09-12,
 * `.reports/U26/test-ojs-findings.md` T-ojs-1). The grid refetches on the
 * tick; the caller waits on the row it needs.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} dialog from openReviewFilesDialog
 */
exports.showFilesFromAllStages = async function showFilesFromAllStages(page, dialog) {
    await dialog.getByRole('checkbox', {name: 'Show files from all accessible workflow stages.'}).check();
    await waitForJQueryIdle(page);
};

/**
 * The checkbox of the named file's row in the review-files window.
 *
 * @param {import('@playwright/test').Locator} dialog from openReviewFilesDialog
 * @param {string} name the listed file name
 */
exports.reviewFilesCheckbox = function reviewFilesCheckbox(dialog, name) {
    return dialog.getByRole('row').filter({hasText: name}).getByRole('checkbox');
};

/**
 * Upload a new file from inside the review-files window ("Upload Review
 * File" opens the same three-step wizard) and wait for its row to appear
 * in the window's list.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} dialog from openReviewFilesDialog
 * @param {{genre?: string, file?: string | {name: string, mimeType: string, buffer: Buffer}}} options
 */
exports.uploadInReviewFilesDialog = async function uploadInReviewFilesDialog(page, dialog, {genre = 'Article Text', file = FIXTURE_PDF} = {}) {
    await dialog.getByRole('link', {name: 'Upload Review File'}).click();
    await exports.uploadViaWizard(page, {genre, file});
    await expect(dialog.getByRole('row').filter({hasText: fileName(file)})).toBeVisible({
        timeout: 30_000,
    });
};

/**
 * Confirm the review-files window with "OK" and wait for it to close. The
 * success notice, "Review files updated.", is the caller's assertion.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} dialog from openReviewFilesDialog
 */
exports.confirmReviewFilesDialog = async function confirmReviewFilesDialog(page, dialog) {
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(dialog).toBeHidden({timeout: 30_000});
    await waitForJQueryIdle(page);
};

/**
 * Accept a review request as the signed-in reviewer and stop on step 2
 * (guidelines), leaving the review under way and not submitted. The
 * wizard steps are jQuery tabs whose past panels stay in the DOM hidden,
 * so every read is visibility-filtered.
 *
 * @param {import('@playwright/test').Page} page an authenticated reviewer page
 * @param {string} contextPath
 * @param {number} submissionId
 */
exports.acceptReviewRequest = async function acceptReviewRequest(page, contextPath, submissionId) {
    await page.goto(`/index.php/${contextPath}/reviewer/submission/${submissionId}`);
    const acceptButton = page
        .getByRole('button', {name: /Accept Review, Continue to Step #2/})
        .filter({visible: true});
    await expect(acceptButton).toBeVisible({timeout: 30_000});
    const privacy = page.locator('input[name="privacyConsent"]').filter({visible: true});
    if (await privacy.count()) {
        await privacy.check();
    }
    await acceptButton.click();
    await expect(
        page.getByRole('button', {name: 'Continue to Step #3'}).filter({visible: true})
    ).toBeVisible({timeout: 30_000});
};

/**
 * A fresh sign-in through the site login form, in a new context that
 * carries no cached session: the app's "signed in since" bookkeeping
 * (the revised-version notice's daily throttle) counts only a real login.
 * The caller closes the returned context.
 *
 * @param {import('@playwright/test').Browser} browser
 * @param {string | undefined} baseURL the worker's server
 * @param {string} username a roster or throwaway account (password rule: the username doubled)
 */
exports.signInAgain = async function signInAgain(browser, baseURL, username) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    const page = await context.newPage();
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(username, getPassword(username));
    return context;
};

/**
 * Drive the legacy 3-tab file-upload wizard (Upload File → Review Details →
 * Confirm) already opened by a panel's Upload control or the author's
 * "Upload revisions" button.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{genre?: string, file?: string | {name: string, mimeType: string, buffer: Buffer}}} options
 *   `file`: a fixture path or an `inMemoryFile()` payload.
 */
exports.uploadViaWizard = async function uploadViaWizard(page, {genre = 'Article Text', file = FIXTURE_PDF} = {}) {
    const dialog = uploadWizardDialog(page);
    await attachInWizard(dialog, {genre, file});
    await dialog.getByRole('button', {name: 'Continue', exact: true}).click();
    // Review Details tab
    await expect(dialog.getByRole('tab', {name: '2. Review Details'})).toHaveAttribute(
        'aria-selected',
        'true',
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Continue', exact: true}).click();
    // Confirm tab
    await expect(dialog.getByRole('tab', {name: '3. Confirm'})).toHaveAttribute(
        'aria-selected',
        'true',
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Complete', exact: true}).click();
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
    await waitForJQueryIdle(page);
};

/**
 * Add a reviewer to the selected round through the Reviewers panel's
 * "Add Reviewer" legacy form (advanced search → select → review type → add).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name the reviewer's display name, e.g. 'Julia Reviewer'
 * @param {{method?: string}} options review type radio label, e.g. 'Open'
 */
exports.addReviewer = async function addReviewer(page, name, {method} = {}) {
    await page.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    const modal = page
        .getByRole('dialog')
        .filter({has: page.locator('.listPanel--selectReviewer')});
    const search = modal.locator('.listPanel--selectReviewer input.pkpSearch__input');
    await expect(search).toBeVisible({timeout: 30_000});
    await search.fill(name);
    await search.press('Enter');
    // Selecting a reviewer copies the Review Request template into the hidden
    // assignment form's TinyMCE editor (AdvancedReviewerSearchHandler
    // #handleReviewerAssign_); the server seeds personalMessage empty. If the
    // editor hasn't finished initializing the content is silently lost and the
    // submit 500s on an empty mail body — a race the side modal's 450ms
    // slide-in used to mask before the harness disabled animations.
    await page.waitForFunction(() => {
        const textarea = document.querySelector(
            '#reviewerFormFooter textarea[name="personalMessage"]'
        );
        const mce = window.tinyMCE || window.tinymce;
        return !!(textarea && mce?.get(textarea.id)?.initialized);
    }, undefined, {timeout: 30_000});
    await modal.getByText(`Select ${name}`).click();
    await waitForJQueryIdle(page);
    // Guard the submit on the message body actually holding the template.
    await expect(
        modal.frameLocator('iframe[id^="personalMessage"]').locator('body')
    ).not.toHaveText('', {timeout: 30_000});
    if (method) {
        await modal.getByRole('radio', {name: method, exact: true}).check();
    }
    await modal.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    await expect(modal).toHaveCount(0, {timeout: 30_000});
    await waitForJQueryIdle(page);
};

/**
 * Complete a review as the signed-in reviewer: open the reviewer page for the
 * submission, walk whatever steps remain (accept invitation, guidelines),
 * optionally fill the two comment fields, pick a recommendation and submit.
 *
 * @param {import('@playwright/test').Page} page an authenticated reviewer page
 * @param {string} contextPath
 * @param {number} submissionId
 * @param {{recommendation?: string, comments?: string, privateComments?: string}} options
 *   comments → "For author and editor"; privateComments → the editor-only box.
 */
exports.performReview = async function performReview(page, contextPath, submissionId, {recommendation = 'Accept Submission', comments, privateComments} = {}) {
    await page.goto(`/index.php/${contextPath}/reviewer/submission/${submissionId}`);
    // Whichever steps remain: a fresh invitation offers "Accept Review,
    // Continue to Step #2"; an already-accepted assignment revisits step 1
    // with "Save and continue"; step 2 offers "Continue to Step #3". The
    // steps are jQuery tabs — past panels stay in the DOM hidden, so every
    // read is visibility-filtered.
    const acceptButton = page.getByRole('button', {name: /Accept Review, Continue to Step #2/});
    const saveButton = page.getByRole('button', {name: 'Save and continue', exact: true});
    const step3Button = page.getByRole('button', {name: 'Continue to Step #3'});
    const submitButton = page.getByRole('button', {name: 'Submit Review', exact: true});
    const anyStepButton = submitButton
        .or(step3Button)
        .or(acceptButton)
        .or(saveButton)
        .filter({visible: true});
    await expect(anyStepButton.first()).toBeVisible({timeout: 30_000});
    // Step 1 (request), when offered. The page is stable right after load, so
    // this sampling races no tab transition.
    const stepOneButton = acceptButton.or(saveButton).filter({visible: true});
    if (await stepOneButton.count()) {
        const privacy = page.locator('input[name="privacyConsent"]').filter({visible: true});
        if (await privacy.count()) {
            await privacy.check();
        }
        await stepOneButton.first().click();
    }
    // Step 2 (guidelines), when offered; then step 3.
    const stepThreeOrSubmit = step3Button.or(submitButton).filter({visible: true});
    await expect(stepThreeOrSubmit.first()).toBeVisible({timeout: 30_000});
    if (await step3Button.filter({visible: true}).count()) {
        await step3Button.filter({visible: true}).first().click();
    }
    await expect(submitButton.filter({visible: true})).toBeVisible({timeout: 30_000});
    // Step 3's comment boxes are TinyMCE-backed: type through the editor
    // (click + key events) — a DOM-level fill() bypasses the editor model
    // and the typed text never reaches the submitted textarea. And only once
    // the editor is `initialized`: its content style sheets arrive after the
    // box is editable and load the empty start value over earlier keys
    // (shared/playwright/support/richtext.js).
    const typeComment = async (frameSelector, text) => {
        const iframe = page.locator(frameSelector).first();
        await waitForEditorReady(page, await editorIdOf(iframe));
        const body = iframe.contentFrame().locator('body');
        await body.click();
        await body.pressSequentially(text);
    };
    if (comments) {
        await typeComment('iframe[id^="comments"]:not([id^="commentsPrivate"])', comments);
    }
    if (privateComments) {
        await typeComment('iframe[id^="commentsPrivate"]', privateComments);
    }
    await page.locator('select[id="reviewerRecommendationId"]').selectOption({label: recommendation});
    await submitButton.click();
    // Legacy confirmation dialog
    await page.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Review Submitted'})).toBeVisible({
        timeout: 30_000,
    });
};

/**
 * A legacy side modal located by the form it carries (the wrapper reports
 * visibility: hidden during transitions — anchor waits on inner content).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} formId e.g. 'editReviewForm', 'sendReminderForm'
 */
exports.legacyModal = function legacyModal(page, formId) {
    return page.getByRole('dialog').filter({has: page.locator(`form#${formId}`)});
};

/**
 * The Vue "Review Details" side modal (replaced the legacy readReviewForm
 * window, pkp/pkp-lib#13156). Anchored by the dialog's accessible name —
 * the [data-cy="active-modal"] wrapper computes visibility:hidden, so the
 * role+name anchor is the reliable one.
 *
 * @param {import('@playwright/test').Page} page
 */
exports.reviewDetailsModal = function reviewDetailsModal(page) {
    return page.getByRole('dialog', {name: /^Review Details:/});
};

/**
 * Open a reviewer row's "Review Details" window through its "Read Review"
 * button. Merely opening it marks a submitted review viewed — the row
 * behind updates to "Review Viewed" at once.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} row the reviewer's panel row
 */
exports.openReviewDetails = async function openReviewDetails(page, row) {
    await row.getByRole('button', {name: 'Read Review', exact: true}).click();
    const modal = exports.reviewDetailsModal(page);
    await expect(modal).toBeVisible({timeout: 30_000});
    return modal;
};

/**
 * The window's load-settled signal: "Modify Review" renders disabled until
 * the assignment and review content finish loading, then enables. Waiting
 * on it (never a timer) also walks around the early-rating-click race
 * (register A21 of the reviewer-assignment spec — never asserted).
 *
 * @param {import('@playwright/test').Locator} modal from reviewDetailsModal
 */
exports.awaitReviewDetailsSettled = async function awaitReviewDetailsSettled(modal) {
    await expect(modal.getByRole('button', {name: 'Modify Review', exact: true})).toBeEnabled({
        timeout: 30_000,
    });
};

/**
 * Click a "Reviewer rating" star and wait for the save toast ("Reviewer
 * rating saved"). Even after the settle signal, the window's mark-viewed
 * round trip (the consider PUT fired on open) replaces the rating component
 * and can revert a click landing just before the swap — the A21 race.
 * Outcome-keyed bounded re-click (the DecisionPage.record pattern): retry
 * until the radio holds, then wait for the toast; never a timer, and the
 * race itself is asserted neither way.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} modal from reviewDetailsModal
 * @param {number} value 1–5 (0 = "No rating")
 */
exports.rateReview = async function rateReview(page, modal, value) {
    await exports.awaitReviewDetailsSettled(modal);
    const star = modal.locator(`input[name="quality"][value="${value}"]`);
    await expect(async () => {
        await star.check({timeout: 2_000});
        await expect(star).toBeChecked({timeout: 2_000});
    }).toPass({intervals: [250, 500, 1_000], timeout: 30_000});
    await expect(page.getByText('Reviewer rating saved').first()).toBeVisible({
        timeout: 30_000,
    });
};

/**
 * Press "Mark as Complete" and confirm the "Mark this review as complete?"
 * dialog; returns after the success toast ("The review has been marked as
 * complete."). Waits for the load-settled signal first.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} modal from reviewDetailsModal
 */
exports.markReviewComplete = async function markReviewComplete(page, modal) {
    await exports.awaitReviewDetailsSettled(modal);
    await modal.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
    const dialog = page
        .locator('[data-cy="dialog"]')
        .filter({hasText: 'Mark this review as complete?'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    await dialog.getByRole('button', {name: 'Mark as Complete', exact: true}).click();
    await expect(
        page.getByText('The review has been marked as complete.').first()
    ).toBeVisible({timeout: 30_000});
};

/**
 * Close the Review Details window through its footer "Cancel" button.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} modal from reviewDetailsModal
 */
exports.closeReviewDetails = async function closeReviewDetails(page, modal) {
    await modal.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(modal).toBeHidden({timeout: 30_000});
};

/**
 * Pick a date on a jQuery UI datepicker field the way the screen offers it —
 * a calendar pick (typed dates are discarded by the widget; register A16 of
 * the reviewer-assignment spec, walked but never asserted). The visible
 * input's id is runtime-suffixed, so fields are addressed by id prefix.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} scope the form/modal holding the field
 * @param {string} fieldPrefix 'responseDueDate' | 'reviewDueDate'
 * @param {Date} date
 */
exports.pickDate = async function pickDate(page, scope, fieldPrefix, date) {
    const input = scope.locator(`input.datepicker[id^="${fieldPrefix}"]`);
    await input.click();
    const picker = page.locator('#ui-datepicker-div');
    await expect(picker).toBeVisible({timeout: 30_000});
    await picker.locator('select.ui-datepicker-year').selectOption(String(date.getFullYear()));
    await picker.locator('select.ui-datepicker-month').selectOption(String(date.getMonth()));
    await picker
        .locator('td:not(.ui-datepicker-other-month) a')
        .filter({hasText: new RegExp(`^${date.getDate()}$`)})
        .first()
        .click();
    await expect(picker).toBeHidden({timeout: 30_000});
};

/**
 * The Add Reviewer window (legacy form around the Vue search panel), opened
 * from the Reviewers panel's top button.
 *
 * @param {import('@playwright/test').Page} page
 */
exports.openAddReviewerModal = async function openAddReviewerModal(page) {
    await page.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    const modal = page
        .getByRole('dialog')
        .filter({has: page.locator('.listPanel--selectReviewer')});
    await expect(
        modal.locator('.listPanel--selectReviewer input.pkpSearch__input')
    ).toBeVisible({timeout: 30_000});
    return modal;
};

/**
 * Search the "Locate a Reviewer" list by name (Enter-commit) and return the
 * matching list item.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} modal from openAddReviewerModal
 * @param {string} name
 */
exports.searchReviewerList = async function searchReviewerList(page, modal, name) {
    const search = modal.locator('.listPanel--selectReviewer input.pkpSearch__input');
    await search.fill(name);
    await search.press('Enter');
    const item = modal.locator('.listPanel--selectReviewer .listPanel__item').filter({hasText: name});
    await expect(item).toBeVisible({timeout: 30_000});
    return item;
};

/**
 * Search the "Locate a Reviewer" list and press the entry's Select button.
 * The selection handler prefills the request letter through the TinyMCE API
 * (AdvancedReviewerSearchHandler), so the click must wait for the editor to
 * be initialized — selecting earlier silently loses the prefill.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} modal from openAddReviewerModal
 * @param {string} name
 * @param {{action?: string, search?: boolean}} options `action`: the entry's
 *   button verb, "Select" (default) or, for a previous round's completed
 *   reviewer, "Reassign"; `search: false` takes the entry from the opening
 *   list without a search.
 */
exports.selectReviewer = async function selectReviewer(page, modal, name, {action = 'Select', search = true} = {}) {
    const item = search
        ? await exports.searchReviewerList(page, modal, name)
        : modal.locator('.listPanel--selectReviewer .listPanel__item').filter({hasText: name});
    await expect(item).toBeVisible({timeout: 30_000});
    await page.waitForFunction(() => {
        const textarea = document.querySelector(
            '#reviewerFormFooter textarea[name="personalMessage"]'
        );
        // eslint-disable-next-line no-undef
        const editor = textarea && window.tinyMCE && window.tinyMCE.EditorManager.get(textarea.id);
        // `initialized` matters: get() answers before the async render is
        // done, and a prefill written in that window is wiped when init
        // loads the (still empty) textarea — the letter then posts empty
        // and the add 500s server-side on the empty mail body.
        return !!(editor && editor.initialized);
    });
    // The list re-renders while search fetches settle, which can swallow a
    // click on the just-replaced node — retry until the request form has
    // actually swapped in for the search grid.
    await expect(async () => {
        await item.getByRole('button', {name: `${action} ${name}`}).click({timeout: 5_000});
        await expect(modal.locator('#regularReviewerForm')).toBeVisible({timeout: 3_000});
    }).toPass({timeout: 30_000});
    await expect(modal.locator('[id^="selectedReviewerName"]')).toHaveText(name);
    await waitForJQueryIdle(page);
};

/**
 * Complete an already-open "Assign Participant" legacy form (opened by the
 * Participants panel's "Assign" or the dashboard row's "Assign Editor").
 *
 * @param {import('@playwright/test').Page} page
 * @param {{group: string, name: string, searchName: string, recommendOnly?: boolean, template?: string}} options
 *   group: user-group option label (e.g. 'Journal manager'); name: display
 *   name shown in the results grid; searchName: name fragment to search by;
 *   template: an exact entry of "Choose a predefined message" ("Request
 *   Copyedit"), whose body is fetched into the TinyMCE message box before
 *   the form is saved (U32); without it the message box stays empty.
 */
exports.completeAssignParticipantForm = async function completeAssignParticipantForm(page, {group, name, searchName, recommendOnly = false, template = null}) {
    const modal = page
        .getByRole('dialog')
        .filter({has: page.locator('select[name="filterUserGroupId"]')});
    await expect(modal.locator('select[name="filterUserGroupId"]')).toBeVisible({timeout: 30_000});
    await modal.locator('select[name="filterUserGroupId"]').selectOption({label: group});
    await waitForJQueryIdle(page);
    await modal.locator('input[id^="namegrid-users-userselect-userselectgrid-"]').fill(searchName);
    await modal
        .locator('form[id="searchUserFilter-grid-users-userselect-userselectgrid"]')
        .locator('button[id^="submitFormButton-"]')
        .click();
    await waitForJQueryIdle(page);
    await modal
        .getByRole('row')
        .filter({hasText: name})
        .locator('input[name="userId"]')
        .check();
    if (recommendOnly) {
        await modal.locator('input[name="recommendOnly"]').check();
    }
    if (template) {
        // The template's body arrives by AJAX into the TinyMCE box behind
        // textarea[name="message"]; saving before it lands sends an empty
        // message (U32 claim check K2, 2026-09-18).
        await modal.locator('select[name="template"]').selectOption({label: template});
        await page.waitForFunction(
            () => {
                const textarea = [...document.querySelectorAll('[role="dialog"] textarea[name="message"]')].pop();
                const mce = window.tinyMCE || window.tinymce;
                const editor = textarea && mce?.get(textarea.id);
                return !!(editor && editor.getContent().length > 20);
            },
            undefined,
            {timeout: 30_000}
        );
    }
    await modal.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(modal).toHaveCount(0, {timeout: 30_000});
    await waitForJQueryIdle(page);
};

/**
 * Assign a stage participant through the Participants panel's legacy form.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{group: string, name: string, searchName: string, recommendOnly?: boolean}} options
 */
exports.assignParticipant = async function assignParticipant(page, options) {
    await page.getByRole('button', {name: 'Assign', exact: true}).click();
    await exports.completeAssignParticipantForm(page, options);
};

// ---------------------------------------------------------------------------
// Reviewer row helpers (the reviewer-assignment spec, U27)
// ---------------------------------------------------------------------------

/**
 * Open a reviewer row's "More Actions" menu and return the menu (headlessui
 * portals it to the document root, so its items resolve page-wide).
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} row the reviewer's panel row
 */
exports.openRowMenu = async function openRowMenu(page, row) {
    await row.getByRole('button', {name: 'More Actions'}).click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem').first()).toBeVisible({timeout: 30_000});
    return menu;
};

/**
 * Close an open row menu by pressing its button again (never Escape, which
 * also closes the workflow dialog underneath).
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} row the reviewer's panel row
 */
exports.closeRowMenu = async function closeRowMenu(page, row) {
    await row.getByRole('button', {name: 'More Actions'}).click();
    await expect(page.getByRole('menu')).toHaveCount(0, {timeout: 30_000});
};

/**
 * Open a reviewer row's "More Actions" menu and click one entry by its exact
 * accessible name ("Edit" must not match "Editorial Notes").
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} row the reviewer's panel row
 * @param {string} name the menu entry
 */
exports.clickRowAction = async function clickRowAction(page, row, name) {
    const menu = await exports.openRowMenu(page, row);
    await menu.getByRole('menuitem', {name, exact: true}).click();
};

/**
 * The row's status title span ("Request Sent", "Overdue", …): it carries
 * `text-negative` when the state is shown in red and a `title` tooltip on
 * the declined and cancelled states.
 *
 * @param {import('@playwright/test').Locator} row the reviewer's panel row
 */
exports.statusTitle = function statusTitle(row) {
    return row.locator('span.text-base-bold').first();
};

/**
 * Upload files to the round through the "Files for Review" panel's
 * selection window, tick them and confirm. Returns after the panel lists
 * every file.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('./ReviewStagePages.js').WorkflowPage} workflow
 * @param {Array<string | {name: string, mimeType: string, buffer: Buffer}>} files
 */
exports.uploadReviewFiles = async function uploadReviewFiles(page, workflow, files) {
    const dialog = await exports.openReviewFilesDialog(page);
    for (const file of files) {
        await exports.uploadInReviewFilesDialog(page, dialog, {file});
        await exports.reviewFilesCheckbox(dialog, fileName(file)).check();
    }
    await exports.confirmReviewFilesDialog(page, dialog);
    for (const file of files) {
        await expect(workflow.panelRow('Files for Review', fileName(file))).toBeVisible({
            timeout: 30_000,
        });
    }
};

/**
 * Open a reviewer row's "Edit" window (the legacy "Edit Review" form) and
 * wait for its fields.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} row the reviewer's panel row
 */
exports.openEditReview = async function openEditReview(page, row) {
    await exports.clickRowAction(page, row, 'Edit');
    const modal = exports.legacyModal(page, 'editReviewForm');
    await expect(modal.locator('input[name="isReviewPubliclyVisible"]')).toBeVisible({
        timeout: 30_000,
    });
    return modal;
};

/**
 * Press the Edit Review window's "OK" and wait for the form to go (a
 * successful save closes the window; the caller asserts a refused save by
 * the form staying).
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} modal from openEditReview
 */
exports.saveEditReview = async function saveEditReview(page, modal) {
    await modal.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(modal.locator('form#editReviewForm')).toBeHidden({timeout: 30_000});
    await waitForJQueryIdle(page);
};

/**
 * The Edit Review window's "Files To Be Reviewed" checkbox of one file.
 *
 * @param {import('@playwright/test').Locator} modal from openEditReview
 * @param {string} name the listed file name
 */
exports.editReviewFileCheckbox = function editReviewFileCheckbox(modal, name) {
    return modal.getByRole('row').filter({hasText: name}).locator('input[name="selectedFiles[]"]');
};

/**
 * Record "Create New Review Round" from the workflow's decision area
 * (the wizard titles itself "New Review Round") and return once the
 * workflow shows Round 2.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('./ReviewStagePages.js').WorkflowPage} workflow
 * @param {number} round the round the decision creates
 */
exports.createNewReviewRound = async function createNewReviewRound(page, workflow, round) {
    await workflow.decisionButton('Create New Review Round').click();
    const decision = new exports.DecisionPage(page);
    await decision.expectOpen('New Review Round');
    await decision.completeAll();
    await workflow.expectPageTitle(`Review (Round ${round})`);
};

/**
 * Set a legacy form's TinyMCE box (by its textarea name) once the editor
 * is initialized; text written earlier is wiped by the editor's own init
 * (patterns.md "UI realities"). The editor is saved back to its textarea
 * so the form posts the text.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} textareaName e.g. 'message'
 * @param {string} html
 */
exports.typeRichText = async function typeRichText(page, textareaName, html) {
    const editorId = await page.waitForFunction(
        (name) => {
            const textarea = document.querySelector(`form textarea[name="${name}"]`);
            const mce = window.tinyMCE || window.tinymce;
            const editor = textarea && mce?.get(textarea.id);
            return editor?.initialized ? textarea.id : false;
        },
        textareaName,
        {timeout: 30_000}
    );
    await page.evaluate(
        ([id, value]) => {
            const mce = window.tinyMCE || window.tinymce;
            const editor = mce.get(id);
            editor.setContent(value);
            editor.fire('change');
            editor.save();
        },
        [await editorId.jsonValue(), html]
    );
};

/**
 * The submission's "Activity Log & Notes" window, opened from the workflow
 * header's "Activity Log" button; returns the dialog once its grid answered.
 *
 * @param {import('@playwright/test').Page} page
 */
exports.openActivityLog = async function openActivityLog(page) {
    await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
    const log = page.getByRole('dialog').filter({hasText: 'Activity Log & Notes'});
    await expect(log.getByRole('row').first()).toBeVisible({timeout: 30_000});
    await waitForJQueryIdle(page);
    return log;
};

/**
 * Close a legacy side window (Activity Log, History) through its own
 * "Close" button.
 *
 * @param {import('@playwright/test').Locator} dialog
 */
exports.closeSideWindow = async function closeSideWindow(dialog) {
    await dialog.getByRole('button', {name: 'Close', exact: true}).first().click();
    await expect(dialog).toBeHidden({timeout: 30_000});
};

// ---------------------------------------------------------------------------
// The "Locate a Reviewer" list's aids, the request form's presets, the
// reminder window's schedule, the revert and the Modify Review window
// (U27 revision, 2026-09-13)
// ---------------------------------------------------------------------------

/**
 * The author names shown in bold above the "Locate a Reviewer" list (the
 * first four contributors; `AdvancedSearchReviewerContainer`).
 *
 * @param {import('@playwright/test').Locator} modal from openAddReviewerModal
 */
exports.reviewerSearchAuthors = function reviewerSearchAuthors(modal) {
    return modal.locator('.pkpAdvancedSearchReviewerContainer .author_row strong');
};

/**
 * Open the list's "Filters" sidebar (hidden until its button is pressed)
 * and return it.
 *
 * @param {import('@playwright/test').Locator} modal from openAddReviewerModal
 */
exports.openReviewerSearchFilters = async function openReviewerSearchFilters(modal) {
    const sidebar = modal.locator('.listPanel--selectReviewer .listPanel__sidebar');
    if (!(await sidebar.locator('.pkpFilter').count())) {
        await modal.getByRole('button', {name: 'Filters', exact: true}).click();
    }
    await expect(sidebar.locator('.pkpFilter').first()).toBeVisible({timeout: 30_000});
    return sidebar;
};

/**
 * One slider filter of the "Filters" sidebar, by its title ("Rated at
 * least", "Reviews completed", …). Its range input(s) are `sliders`;
 * `enable` is the "Add filter: {title}" button beside it that enables
 * them, and `clear` the same button once the filter is on, then reading
 * "Clear filter: {title}", which disables them again.
 *
 * @param {import('@playwright/test').Locator} sidebar from openReviewerSearchFilters
 * @param {string} title
 */
exports.reviewerSearchFilter = function reviewerSearchFilter(sidebar, title) {
    const filter = sidebar.locator('.pkpFilter').filter({
        has: sidebar.page().locator('.pkpFilter__inputTitle', {hasText: new RegExp(`^\\s*${title}\\s*$`)}),
    });
    return {
        filter,
        sliders: filter.locator('input[type="range"]'),
        enable: filter.getByRole('button', {name: `Add filter: ${title}`, exact: true}),
        clear: filter.getByRole('button', {name: `Clear filter: ${title}`, exact: true}),
    };
};

/**
 * The entries of the "Locate a Reviewer" list as shown (the page on
 * screen, 30 at most).
 *
 * @param {import('@playwright/test').Locator} modal from openAddReviewerModal
 */
exports.reviewerListItems = function reviewerListItems(modal) {
    return modal.locator('.listPanel--selectReviewer .listPanel__item');
};

/**
 * The list's "View additional pages" bar, shown once the pool exceeds a
 * page.
 *
 * @param {import('@playwright/test').Locator} modal from openAddReviewerModal
 */
exports.reviewerListPagination = function reviewerListPagination(modal) {
    return modal.getByRole('navigation', {name: 'View additional pages'});
};

/**
 * A "Review Type" radio of the Add Reviewer request form or the Edit
 * Review window, by its label ("Open", "Anonymous Reviewer/Anonymous
 * Author", …).
 *
 * @param {import('@playwright/test').Locator} scope the window
 * @param {string} label
 */
exports.reviewTypeRadio = function reviewTypeRadio(scope, label) {
    return scope.getByRole('radio', {name: label, exact: true});
};

/**
 * The "Publicly Show Reviewer Comments" box of the same two windows.
 *
 * @param {import('@playwright/test').Locator} scope the window
 */
exports.publicVisibilityCheckbox = function publicVisibilityCheckbox(scope) {
    return scope.locator('input[name="isReviewPubliclyVisible"]');
};

/**
 * The "No Files Selected" inline warning of the Add Reviewer request form
 * or the Edit Review window (`#noFilesWarning`, shown by the window's own
 * script).
 *
 * @param {import('@playwright/test').Locator} scope the window
 */
exports.noFilesWarning = function noFilesWarning(scope) {
    return scope.locator('#noFilesWarning');
};

/**
 * The file checkboxes of the "Files To Be Reviewed" list in the same two
 * windows (none on a round without files).
 *
 * @param {import('@playwright/test').Locator} scope the window
 */
exports.reviewFileCheckboxes = function reviewFileCheckboxes(scope) {
    return scope.locator('input[name="selectedFiles[]"]');
};

/**
 * Open a row's "Send Reminder" window and wait for its "Review Schedule"
 * section.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} row the reviewer's panel row
 */
exports.openSendReminder = async function openSendReminder(page, row) {
    await row.getByRole('button', {name: 'Send Reminder', exact: true}).click();
    const modal = exports.legacyModal(page, 'sendReminderForm');
    await expect(modal.getByText('Review Schedule')).toBeVisible({timeout: 30_000});
    return modal;
};

/**
 * The read-only date fields of the reminder window's "Review Schedule",
 * as their labels in screen order ("Editor's Request", then "Response Due
 * Date" or "Review Acceptance Date", then "Review Due Date").
 *
 * @param {import('@playwright/test').Locator} modal from openSendReminder
 */
exports.reviewScheduleLabels = function reviewScheduleLabels(modal) {
    return modal
        .locator('form#sendReminderForm')
        .locator('label[for^="dateNotified"], label[for^="dateConfirmed"], label[for^="responseDue"], label[for^="reviewDueDate"]');
};

/**
 * Press the reminder window's own "Send Reminder" and wait for the form to
 * go; the "Notification sent." notice is the caller's assertion.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} modal from openSendReminder
 */
exports.submitSendReminder = async function submitSendReminder(page, modal) {
    await modal
        .locator('form#sendReminderForm')
        .getByRole('button', {name: 'Send Reminder', exact: true})
        .click();
    await expect(modal.locator('form#sendReminderForm')).toBeHidden({timeout: 30_000});
    await waitForJQueryIdle(page);
};

/**
 * Press a row's "Revert Decision" and confirm "Unconsider this Review";
 * returns once the dialog has closed. The row's new state is the caller's
 * assertion.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} row the reviewer's panel row
 */
exports.revertReviewDecision = async function revertReviewDecision(page, row) {
    await row.getByRole('button', {name: 'Revert Decision', exact: true}).click();
    const dialog = page.getByRole('dialog').filter({hasText: 'Unconsider this Review'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(dialog).toBeHidden({timeout: 30_000});
};

/**
 * The "Modify Review" window stacked over the Review Details window.
 *
 * @param {import('@playwright/test').Page} page
 */
exports.modifyReviewModal = function modifyReviewModal(page) {
    return page.getByRole('dialog', {name: 'Modify Review'});
};

/**
 * Press the Review Details window's "Modify Review", confirm the "Modify
 * this review?" dialog and return the "Modify Review" window once open.
 * The dialog's text is the caller's assertion.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} readModal from openReviewDetails
 */
exports.openModifyReview = async function openModifyReview(page, readModal) {
    await exports.awaitReviewDetailsSettled(readModal);
    await readModal.getByRole('button', {name: 'Modify Review', exact: true}).click();
    const confirm = page.locator('[data-cy="dialog"]').filter({hasText: 'Modify this review?'});
    await expect(confirm).toBeVisible({timeout: 30_000});
    await confirm.getByRole('button', {name: 'Modify Review', exact: true}).click();
    const editModal = exports.modifyReviewModal(page);
    await expect(editModal).toBeVisible({timeout: 30_000});
    return editModal;
};

/**
 * Press the "Modify Review" window's "Cancel": the window closes and the
 * view window beneath shows again.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} editModal from openModifyReview
 */
exports.cancelModifyReview = async function cancelModifyReview(page, editModal) {
    await editModal.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(editModal).toBeHidden({timeout: 30_000});
    await expect(exports.reviewDetailsModal(page)).toBeVisible({timeout: 30_000});
};

// ---------------------------------------------------------------------------
// The review setup's effects on the stage: the request windows' presets,
// the round status's lines, the Reviewers row's status cell and the Review
// Details window's recommendation and form-item reads (U29 revision,
// 2026-09-15)
// ---------------------------------------------------------------------------

/**
 * The hidden datepicker altField carrying a due date's submitted Y-m-d
 * value, in the Add Reviewer request form or the reviewer row's "Edit"
 * window (the visible input's id is runtime-suffixed).
 *
 * @param {import('@playwright/test').Locator} scope the window
 * @param {string} fieldPrefix 'responseDueDate' | 'reviewDueDate'
 */
exports.dueDateField = function dueDateField(scope, fieldPrefix) {
    return scope.locator(`input[id^="${fieldPrefix}"][id$="-altField"]`);
};

/**
 * The "Review Form" list of the Add Reviewer request form or the "Edit"
 * window: rendered only while the journal has an active form, and never on
 * a completed review's window (the review-setup spec, Rule 12).
 *
 * @param {import('@playwright/test').Locator} scope the window
 */
exports.reviewFormSelect = function reviewFormSelect(scope) {
    return scope.locator('select[name="reviewFormId"]');
};

/**
 * A Reviewers row's status cell: the status title ("Review Submitted")
 * and, on a journal, the chosen recommendation printed under it.
 *
 * @param {import('@playwright/test').Locator} row the reviewer's panel row
 */
exports.statusCell = function statusCell(row) {
    return row.locator('td').first();
};

/**
 * The Review Details window's "Recommendation: {title}" line near its top
 * (an `h2` "Recommendation:" beside the title), rendered once the window
 * has settled.
 *
 * @param {import('@playwright/test').Locator} modal from reviewDetailsModal
 */
exports.recommendationLine = function recommendationLine(modal) {
    return modal.getByRole('heading', {name: 'Recommendation:', exact: true}).locator('xpath=..');
};

/**
 * The window's "Reviewer Recommendation" section (a journal only): the
 * group headed so, whose "Recommendation" value paragraph prints the
 * chosen entry's title, or "-" while that entry is deactivated.
 *
 * @param {import('@playwright/test').Locator} modal from reviewDetailsModal
 */
exports.recommendationSection = function recommendationSection(modal) {
    return modal.getByRole('group', {name: 'Reviewer Recommendation'});
};

/** The section's value paragraph (the title, or "-"). */
exports.recommendationValue = function recommendationValue(modal) {
    return exports.recommendationSection(modal).locator('p');
};

/**
 * A review form item's block in the window: the `h2` question with the
 * reviewer's answer beneath it (the editor reads every item, whatever its
 * "Included in message to author" box).
 *
 * @param {import('@playwright/test').Locator} modal from reviewDetailsModal
 * @param {string} question the item's text
 */
exports.reviewItemBlock = function reviewItemBlock(modal, question) {
    return modal.getByRole('heading', {name: question, exact: true}).locator('xpath=..');
};

module.exports.waitForJQueryIdle = waitForJQueryIdle;
