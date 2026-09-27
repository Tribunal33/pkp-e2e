// @ts-check
/**
 * @file shared/playwright/pages/InternalReviewPages.js
 *
 * The Internal Review stage of a press's workflow (feature spec:
 * docs/specs/U71-internal-review-stage.md): the stage entry and its rounds
 * in the side menu, the stage bubble and heading, the round's status box,
 * the panels of the editorial and the author's view, the decision and
 * recommend buttons, the "Recommendation" box, the minimum-reviews
 * question, and a walk through the decision wizard those buttons open.
 *
 * Built by composition on the shared frame: `frame` is the
 * `WorkflowPage` (opening, header, menu, main column, action region),
 * `participants` the `ParticipantsPanel` of `StageParticipantsPages.js`
 * (its "Assign" window). Neither is changed here.
 *
 * App neutrality (PRINCIPLES M2): the stage's own label and the label of
 * the review stage that follows it are passed in (`labels.stage`,
 * `labels.nextStage`; their defaults are the press's words, the one app
 * with the stage); every sentence is a lib/pkp locale string, and the
 * stage-naming ones are built from the label given. A journal or preprint
 * server suite uses the absence readers (`stageEntry()`, the frame's
 * `stageLabels()`, `actionButton()`) for its control.
 *
 * DOM facts the locators rely on (U71 claim check, 2026-09-27,
 * `.reports/U71/screen-notes.md`):
 * - the side menu is a tree: a stage entry is `treeitem "<stage>"` and its
 *   rounds are the `treeitem`s of its group; pressing the entry itself
 *   folds its rounds away (the group leaves the tree) and shows the
 *   round-less stage view;
 * - the round's box is a `div.border` headed "Round N Status"; a past
 *   round and the stage entry carry a plain "Status" box;
 * - decision and recommend buttons are in `[data-cy="workflow-action-items"]`;
 *   the deciding editor's "Recommendation" box and "Participants" in
 *   `[data-cy="workflow-secondary-items"]`, the recommending editor's box in
 *   the action region with "Change decision";
 * - a legacy window over the workflow (Add Reviewer, the upload wizard)
 *   leaves the workflow dialog hidden from role queries for a moment after
 *   it closes, so the row readers here are CSS-anchored where they follow
 *   such a window.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {WorkflowPage} = require('./WorkflowPage.js');
const {ParticipantsPanel} = require('./StageParticipantsPages.js');

/** The round status sentences (lib/pkp `submission.reviewRound.*`, editor wording). */
const ROUND_STATUS = {
    waiting: 'Waiting for reviewers to be assigned.',
    awaitingResponses: 'Awaiting responses from reviewers.',
    newReviews: 'New reviews have been submitted.',
    revisionsRequested: 'Revisions have been requested.',
    revisionsSubmitted: 'Revisions have been submitted and a decision is needed.',
    awaitingRecommendations: 'Awaiting recommendations from editors.',
    recommendationsIn: 'All recommendations are in and a decision is needed.',
    declined: 'Submission declined.',
    accepted: 'Submission accepted.',
    returnedToReview: 'Returned back to review.',
    advancedToNextRound: 'The submission has been advanced to the next round of review',
    minimumConfirmed: 'Minimum required number of reviews have been confirmed. A decision is needed.',
};

/** The status box's first line on a context whose review minimum is above 0. */
function minimumLine(number) {
    return `Minimum number of confirmed reviews required: ${number}.`;
}

/** A past round's box once the submission is on another stage. */
function currentlyInStage(stage) {
    return `The submission is currently in the ${stage} stage.`;
}

/** The stage entry's box once the submission has left the stage. */
function advancedAndInStage(stage) {
    return `The submission advanced to the next review round, was accepted, and is currently in the ${stage} stage.`;
}

/** A stage entry that never had a round. */
function notInitiated(stage) {
    return `The ${stage} stage has not yet been initiated.`;
}

/** The recommending editor's box without a deciding editor (Rule 14a). */
const NO_DECIDING_EDITOR =
    'You can not make a recommendation until an editor is assigned with permission to record a decision.';

/** The minimum-reviews question (Settings bullet 1). */
const MINIMUM_QUESTION_TITLE = 'Proceed Without Minimum Confirmed Reviews?';

/** The wizard's "Cancel" question. */
const CANCEL_DECISION = 'Cancel Decision';

/**
 * The decision buttons of an active round, left to right, the press's
 * labels; `recommend` the recommending editor's four.
 */
const DECISIONS = {
    requestRevisions: 'Request Revisions',
    sendExternal: 'Send to External Review',
    accept: 'Accept Submission',
    newRound: 'Create New Review Round',
    cancelRound: 'Cancel Review Round',
    decline: 'Decline Submission',
    revertDecline: 'Revert Decline',
    delete: 'Delete',
    sendInternal: 'Send to Internal Review',
    recommendRevisions: 'Recommend Revisions',
    recommendAccept: 'Recommend Accept',
    recommendDecline: 'Recommend Decline',
    recommendSendExternal: 'Recommend Send to External Review',
    recommendResubmit: 'Recommend Resubmit for Review',
    changeDecision: 'Change decision',
};

/** Rule 8's six, in order (the five of a round with a response lack "Cancel Review Round"). */
const ROUND_DECISIONS = [
    DECISIONS.requestRevisions,
    DECISIONS.sendExternal,
    DECISIONS.accept,
    DECISIONS.newRound,
    DECISIONS.cancelRound,
    DECISIONS.decline,
];
const ROUND_DECISIONS_NO_CANCEL = ROUND_DECISIONS.filter((l) => l !== DECISIONS.cancelRound);

/** Rule 14a's four. */
const RECOMMEND_BUTTONS = [
    DECISIONS.recommendRevisions,
    DECISIONS.recommendAccept,
    DECISIONS.recommendDecline,
    DECISIONS.recommendSendExternal,
];

exports.ROUND_STATUS = ROUND_STATUS;
exports.minimumLine = minimumLine;
exports.currentlyInStage = currentlyInStage;
exports.advancedAndInStage = advancedAndInStage;
exports.notInitiated = notInitiated;
exports.NO_DECIDING_EDITOR = NO_DECIDING_EDITOR;
exports.MINIMUM_QUESTION_TITLE = MINIMUM_QUESTION_TITLE;
exports.DECISIONS = DECISIONS;
exports.ROUND_DECISIONS = ROUND_DECISIONS;
exports.ROUND_DECISIONS_NO_CANCEL = ROUND_DECISIONS_NO_CANCEL;
exports.RECOMMEND_BUTTONS = RECOMMEND_BUTTONS;

exports.InternalReviewStage = class InternalReviewStage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{appContext?: any, labels?: {stage?: string, nextStage?: string}}} [options]
     */
    constructor(page, contextPath, options = {}) {
        super(page);
        this.contextPath = contextPath;
        const labels = options.labels || {};
        this.stage = labels.stage || 'Internal Review';
        this.nextStage = labels.nextStage || 'External Review';
        /** The shared frame, its review-stage label set to this stage (round selection, headings). */
        this.frame = new WorkflowPage(page, contextPath, {
            appContext: options.appContext,
            labels: {reviewStage: this.stage},
        });
        /** The Participants panel and its "Assign" window. */
        this.participants = new ParticipantsPanel(page, contextPath, {appContext: options.appContext});
    }

    // ---------------------------------------------------------------------
    // Opening
    // ---------------------------------------------------------------------

    /** Open the editorial view (on its active stage, or on `menuKey`). */
    async gotoEditorial(submissionId, {menuKey = null} = {}) {
        await this.frame.gotoEditorial(submissionId, {menuKey});
        await this.expectMenuDrawn();
    }

    /** Open the author's view (My Submissions). */
    async gotoAuthor(submissionId, {menuKey = null} = {}) {
        await this.frame.gotoAuthor(submissionId, {menuKey});
        await this.expectMenuDrawn();
    }

    /** The menu key of a round (`workflow_<stageId>_<roundId>`); the stage's own is `workflow_<stageId>`. */
    static roundMenuKey(stageId, roundId) {
        return `workflow_${stageId}_${roundId}`;
    }

    /** The side menu has drawn its stage entries (built after the panel's own fetch). */
    async expectMenuDrawn() {
        await expect(this.frame.menu().getByRole('treeitem').first()).toBeVisible({timeout: 30_000});
    }

    // ---------------------------------------------------------------------
    // The side menu (Rules 1, 2, 7)
    // ---------------------------------------------------------------------

    /** A stage entry's tree item ("Internal Review", "External Review", "Copyediting"). */
    stageEntry(stage = this.stage) {
        return this.frame.menu().getByRole('treeitem', {name: stage, exact: true});
    }

    /** The stage entry's own link. */
    stageEntryLink(stage = this.stage) {
        return this.stageEntry(stage).getByRole('link', {name: stage, exact: true});
    }

    /** A round's link under a stage entry. */
    roundLink(round, stage = this.stage) {
        return this.stageEntry(stage).getByRole('link', {name: `Review Round ${round}`, exact: true});
    }

    /** The round labels listed under a stage entry, in order ([] when it has none or they are folded). */
    async roundLabels(stage = this.stage) {
        await expect(this.stageEntryLink(stage)).toBeVisible({timeout: 30_000});
        const texts = await this.stageEntry(stage).getByRole('treeitem').getByRole('link').allTextContents();
        return texts.map((t) => t.trim()).filter(Boolean);
    }

    /** The stage entry lists exactly these rounds (auto-waited). */
    async expectRounds(labels, stage = this.stage) {
        await expect.poll(() => this.roundLabels(stage), {timeout: 30_000}).toEqual(labels);
    }

    /** A round's link is the selected menu entry. */
    async expectRoundSelected(round, stage = this.stage) {
        await expect(this.roundLink(round, stage)).toHaveClass(/bg-selection-dark/, {timeout: 30_000});
    }

    /**
     * Select a round. When the stage's rounds are folded (the stage entry
     * was pressed), the entry is pressed once more to unfold them first.
     */
    async selectRound(round, stage = this.stage) {
        const link = this.roundLink(round, stage);
        await expect(this.stageEntryLink(stage)).toBeVisible({timeout: 30_000});
        if (!(await link.isVisible())) {
            await this.stageEntryLink(stage).click();
            await expect(link).toBeVisible({timeout: 30_000});
        }
        await link.click();
        await this.frame.expectHeading(`Workflow: ${stage} (Round ${round})`);
    }

    /** Press the stage entry itself (Rule 7): the round-less stage view. */
    async selectStageEntry(stage = this.stage) {
        await this.stageEntryLink(stage).click();
        await this.frame.expectHeading(`Workflow: ${stage}`);
    }

    // ---------------------------------------------------------------------
    // The header and heading (Rule 2)
    // ---------------------------------------------------------------------

    /** The stage bubble reads "{stage} (Round N)" and the heading "Workflow: {stage} (Round N)". */
    async expectOnRound(round, stage = this.stage) {
        await this.frame.expectStage(`${stage} (Round ${round})`);
        await this.frame.expectHeading(`Workflow: ${stage} (Round ${round})`);
    }

    /** The heading names the round (the bubble may name another, active, stage). */
    async expectRoundHeading(round, stage = this.stage) {
        await this.frame.expectHeading(`Workflow: ${stage} (Round ${round})`);
    }

    // ---------------------------------------------------------------------
    // The status box (Rules 3, 7a; Settings bullet 1)
    // ---------------------------------------------------------------------

    /** The current round's box ("Round N Status"). */
    roundStatusBox(round) {
        return this.frame.statusBox(`Round ${round} Status`);
    }

    /** The box's lines under its heading, in order (each a `p`). */
    statusLines(heading) {
        return this.frame.statusBox(heading).locator('p');
    }

    /** The current round's box reads exactly these lines (the minimum line first when there is one). */
    async expectRoundStatusLines(round, lines) {
        await expect(this.statusLines(`Round ${round} Status`)).toHaveText(lines, {timeout: 30_000});
    }

    /** The current round's box reads this one sentence. */
    async expectRoundStatus(round, sentence) {
        await this.expectRoundStatusLines(round, [sentence]);
    }

    /** A plain "Status" box (a past round, the stage entry) reads exactly this sentence. */
    async expectPlainStatus(sentence) {
        await expect(this.statusLines('Status')).toHaveText([sentence], {timeout: 30_000});
    }

    // ---------------------------------------------------------------------
    // The panels (Rules 4, 5, 15, 16)
    // ---------------------------------------------------------------------

    /** Every h3 of the open view, top to bottom (the box heading, the panels, the right-hand column). */
    async expectHeadings(labels) {
        await this.frame.expectPanelHeadings(labels);
    }

    /** A panel's table by its title ("Revisions Uploaded", "Files for Review", "Reviewers", …). */
    panel(title) {
        return this.frame.panel(title);
    }

    /** A panel's wrapper: heading, controls and table (the innermost div holding the table). */
    panelWrapper(title) {
        return this.frame
            .primaryColumn()
            .locator('div')
            .filter({has: this.page.getByRole('table', {name: title, exact: true})})
            .last();
    }

    /** A panel's data rows (the header row and the "No Items" row left out). */
    panelRows(title) {
        return this.panel(title).locator('tbody tr').filter({hasNotText: /^\s*No Items\s*$/});
    }

    /** A panel's row carrying `text`. */
    panelRow(title, text) {
        return this.panel(title).getByRole('row').filter({hasText: text});
    }

    /** The panel reads "No Items" and holds no data row. */
    async expectPanelEmpty(title) {
        await expect(this.panel(title).getByRole('cell', {name: 'No Items', exact: true})).toBeVisible({timeout: 30_000});
        await expect(this.panelRows(title)).toHaveCount(0);
    }

    /** The file number ("No" column) of a file list's row for `fileName`. */
    async fileNumber(title, fileName) {
        const row = this.panelRow(title, fileName);
        await expect(row).toHaveCount(1, {timeout: 30_000});
        return (await row.getByRole('cell').first().innerText()).trim();
    }

    /** A file list's rows for `fileName` read as their numbers (auto-waited on at least one). */
    async fileNumbers(title, fileName) {
        const rows = this.panelRow(title, fileName);
        await expect(rows.first()).toBeVisible({timeout: 30_000});
        const texts = await rows.evaluateAll((trs) => trs.map((tr) => (tr.querySelector('td')?.textContent || '').trim()));
        return texts;
    }

    /** The Reviewers panel's row for a reviewer (CSS-anchored: it follows the Add Reviewer window). */
    reviewerRow(name) {
        return this.page
            .locator('[data-cy="active-modal"]')
            .first()
            .locator('[data-cy="reviewer-manager"]')
            .getByRole('row')
            .filter({hasText: name});
    }

    /** The author's "Upload revisions" button (top of the right-hand column, Rule 15a). */
    uploadRevisionsButton() {
        return this.frame.dialog().getByRole('button', {name: 'Upload revisions', exact: true});
    }

    /** A panel's own "Upload" (above "Revisions Uploaded"). */
    panelUploadButton(title) {
        return this.panelWrapper(title).getByRole('button', {name: 'Upload', exact: true});
    }

    // ---------------------------------------------------------------------
    // The buttons (Rules 8–10, 14)
    // ---------------------------------------------------------------------

    /** A button of the action region by its label. */
    actionButton(label) {
        return this.frame.actionButton(label);
    }

    /** The action region's buttons are exactly these, left to right (auto-waited). */
    async expectActionButtons(labels) {
        await expect.poll(() => this.frame.actionButtonLabels(), {timeout: 30_000}).toEqual(labels);
    }

    /**
     * None of the round's decision or recommend buttons shows (an absence
     * read: the caller has a settled read of the same view first).
     */
    async expectNoDecisionButtons() {
        for (const label of [...ROUND_DECISIONS, DECISIONS.revertDecline, DECISIONS.delete, ...RECOMMEND_BUTTONS]) {
            await expect(this.actionButton(label)).toHaveCount(0);
        }
    }

    /** The "Recommendation" box (the recommending editor's in the action region, the deciding editor's beside "Participants"). */
    recommendationBox() {
        return this.frame
            .dialog()
            .locator('div.border')
            .filter({has: this.page.getByRole('heading', {name: /^recommendation$/i})});
    }

    /** The recommending editor's "Change decision". */
    changeDecisionButton() {
        return this.frame.actionItems().getByRole('button', {name: DECISIONS.changeDecision, exact: true});
    }

    // ---------------------------------------------------------------------
    // The minimum-reviews question (Settings bullet 1)
    // ---------------------------------------------------------------------

    minimumDialog() {
        return this.page.getByRole('dialog', {name: MINIMUM_QUESTION_TITLE, exact: true});
    }

    /** Press a decision button and wait for the question; returned open. */
    async pressExpectingMinimumDialog(label) {
        await this.actionButton(label).click();
        await expect(this.minimumDialog()).toBeVisible({timeout: 30_000});
        return this.minimumDialog();
    }

    /** Answer the question ("Yes, Continue" or "Cancel"); it closes. */
    async answerMinimumDialog(label) {
        await this.minimumDialog().getByRole('button', {name: label, exact: true}).click();
        await expect(this.minimumDialog()).toHaveCount(0, {timeout: 30_000});
    }

    // ---------------------------------------------------------------------
    // The decision wizard the buttons open (its pages: U34)
    // ---------------------------------------------------------------------

    /** The wizard page's level-1 heading. */
    wizardHeading() {
        return this.page.locator('h1.app__pageHeading');
    }

    /**
     * Press a decision or recommend button and wait for its wizard to open
     * under the decision's name ("{name}" or "{name}: {page}", or the
     * RegExp given).
     *
     * @param {string} label
     * @param {string|RegExp} [wizardTitle]
     */
    async pressDecision(label, wizardTitle = label) {
        await this.actionButton(label).click();
        await this.expectWizard(wizardTitle);
    }

    /**
     * The wizard is open under this decision name ("{name}" alone or
     * "{name}: {page}"); a RegExp is matched as given (a heading that does
     * not carry the button's label).
     */
    async expectWizard(title) {
        const pattern =
            title instanceof RegExp
                ? title
                : new RegExp(`^\\s*${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(:|$)`);
        await expect(this.wizardHeading()).toHaveText(pattern, {timeout: 30_000});
    }

    /** The current wizard page's heading text ("Notify Authors", "Select Files", …). */
    currentWizardPage() {
        return this.page.locator('.pkpStep:not([hidden])').getByRole('heading', {level: 2}).first();
    }

    /** Wait for the current page's letter to finish loading (a press during the load posts an empty body). */
    async awaitComposer() {
        await expect(this.page.locator('.composer__loadingTemplateMask')).toHaveCount(0, {timeout: 30_000});
    }

    /**
     * Walk the open wizard with "Continue" until its "Select Files" page (or
     * return at once when there is none before "Record Decision"); resolves
     * true on "Select Files".
     */
    async continueToSelectFiles() {
        return this._continueUntil((pageName) => pageName === 'Select Files');
    }

    async _continueUntil(stop) {
        const record = this.page.getByRole('button', {name: /^Record (Decision|Recommendation)$/});
        const cont = this.page.getByRole('button', {name: 'Continue', exact: true});
        for (let i = 0; i < 8; i++) {
            await this.awaitComposer();
            const pageHeading = this.currentWizardPage();
            await expect(pageHeading).toBeVisible({timeout: 30_000});
            const name = (await pageHeading.innerText()).trim();
            if (stop && stop(name)) return true;
            await expect(record.or(cont).first()).toBeVisible({timeout: 30_000});
            if (await record.count()) return false;
            await cont.click();
            await expect(pageHeading).not.toHaveText(name, {timeout: 30_000});
        }
        throw new Error('the decision wizard did not reach its last page');
    }

    /**
     * Walk the open wizard to its last page with "Continue", press "Record
     * Decision" and follow the closing window's "View Submission Summary"
     * back to the workflow; resolves the closing window's text. The press is
     * retried while the wizard re-renders under it, never once the
     * decisions POST is on the wire (recording twice is not idempotent).
     */
    async recordDecision() {
        await this._continueUntil(null);
        await this.awaitComposer();
        const record = this.page.getByRole('button', {name: /^Record (Decision|Recommendation)$/});
        const summary = this.page.getByRole('link', {name: 'View Submission Summary', exact: true});
        let posted = false;
        this.page
            .waitForRequest((r) => r.url().includes('/decisions') && r.method() === 'POST', {timeout: 60_000})
            .then(
                () => (posted = true),
                () => {}
            );
        await expect(async () => {
            if (!(await summary.count()) && !posted) {
                try {
                    await record.first().click({timeout: 2_000});
                } catch {
                    // retried; success is the closing window
                }
            }
            expect(await summary.count()).toBeGreaterThan(0);
        }).toPass({intervals: [500, 1_000, 2_000], timeout: 60_000});
        const closing = this.page.getByRole('dialog').filter({has: summary});
        const text = (await closing.innerText()).replace(/\s+/g, ' ').trim();
        await summary.click();
        await this.page.waitForURL((u) => /\/dashboard\//.test(u.pathname), {waitUntil: 'commit', timeout: 30_000});
        await this.frame.expectOpen();
        return text;
    }

    /** Leave the open wizard with its footer "Cancel" and "Cancel Decision": back on the workflow, nothing recorded. */
    async leaveWizard() {
        await this.awaitComposer();
        await this.page.locator('.decision__footer').getByRole('button', {name: 'Cancel', exact: true}).click();
        const dialog = this.page.getByRole('dialog', {name: CANCEL_DECISION, exact: true});
        await expect(dialog).toBeVisible({timeout: 30_000});
        await dialog.getByRole('button', {name: CANCEL_DECISION, exact: true}).click();
        await this.page.waitForURL((u) => /\/dashboard\//.test(u.pathname), {waitUntil: 'commit', timeout: 30_000});
        await this.frame.expectOpen();
    }

    // ---------------------------------------------------------------------
    // "Select Files" (Rule 13)
    // ---------------------------------------------------------------------

    /** The titles of the "Select Files" page's lists, in order. */
    async selectFilesListTitles() {
        const texts = await this.page
            .locator('.pkpStep:not([hidden]) .listPanel .listPanel__header')
            .allInnerTexts();
        return texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
    }

    /** The lists are exactly these (auto-waited). */
    async expectSelectFilesLists(titles) {
        await expect.poll(() => this.selectFilesListTitles(), {timeout: 30_000}).toEqual(titles);
    }

    /** Every file row of the "Select Files" page. */
    selectFileRows() {
        return this.page.locator('.pkpStep:not([hidden]) .listPanel__item');
    }

    /** A file row's tick box on the "Select Files" page. */
    selectFileCheckbox(fileName) {
        return this.selectFileRows().filter({hasText: fileName}).locator('input[type="checkbox"]');
    }
};
