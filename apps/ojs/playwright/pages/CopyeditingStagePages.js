// @ts-check
/**
 * @file playwright/pages/CopyeditingStagePages.js
 *
 * OJS-local Page Objects for the Copyediting stage (spec:
 * docs/specs/U32-copyediting-stage.md). The frame (header, side menu,
 * columns, status box) is the shared `WorkflowPage`
 * (`shared/playwright/pages/WorkflowPage.js`), held as `frame`; the review
 * stage's helpers (`DecisionPage`, `uploadViaWizard`, `assignParticipant`,
 * the row menus, the legacy jQuery idle) come from `ReviewStagePages.js`.
 *
 * Surfaces:
 * - CopyeditingStagePage — the stage's main column: the notice box (an h3
 *   "Notification" with one paragraph, inside a bordered box that the frame's
 *   `anyStatusBox()` also matches, so a "no status box" read here goes by
 *   the "Status" heading), the two file lists ("Draft Files", "Copyedited
 *   Files": a heading, a description paragraph, an "Upload/Select Files"
 *   button and a table), the discussions panel, the two decision buttons,
 *   the Participants rows and their "Edit Assignment" window.
 * - SelectFilesWindow — the legacy "Upload/Select Files" side window a list's
 *   button opens: its title, the "Upload File" link, the "Show files from all
 *   accessible workflow stages." box, the grid of stage groups and file rows
 *   with tick boxes, "OK" (button) and "Cancel" (link).
 * - The decision wizard's completion: `recordDecision` presses "Record
 *   Decision" and returns the completion dialog ("Sent to Production", "Sent
 *   Back from Copyediting") so the caller can read it; `leaveCompletion`
 *   follows its "View Submission Summary" link back to the workflow.
 *
 * DOM shapes were read from the U32 claim-check snapshots (.reports/U32/ccK*)
 * and one live probe (.reports/U32/tojs, 2026-09-19).
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {motionEnded} = require('../../../../shared/playwright/support/motion.js');
const {WorkflowPage: WorkflowFrame} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {
    DecisionPage,
    uploadViaWizard,
    uploadWizardDialog,
    clickRowAction,
    fileName,
    waitForJQueryIdle,
} = require('./ReviewStagePages.js');

/** The stage's `workflowMenuKey` (WORKFLOW_STAGE_ID_EDITING = 4). */
const COPYEDITING_MENU_KEY = 'workflow_4';

const NOTICE_ASSIGN = 'Assign a copyeditor using the Assign link in the Participants list.';
const NOTICE_AWAITING = 'Awaiting Copyedits.';
const DRAFT_FILES = 'Draft Files';
const COPYEDITED_FILES = 'Copyedited Files';
const DISCUSSIONS = 'Copyediting Tasks & Discussions';
const DRAFT_DESCRIPTION = 'These are files from the review stage which are to be copyedited';
const COPYEDITED_DESCRIPTION = 'These are edited files that will be taken to the production stage';
const SEND_TO_PRODUCTION = 'Send To Production';
const MOVE_TO_REVIEW = 'Move to Review';
const DELETE_QUESTION = 'Are you sure you wish to delete this item? This action cannot be undone.';
const NOT_INITIATED = 'The Copyediting stage has not yet been initiated.';
const IN_PRODUCTION = 'The submission is currently in the Production stage.';
const ALL_STAGES_LABEL = 'Show files from all accessible workflow stages.';
const STEPS_LIST = 'Complete the following steps to take this decision';

exports.COPYEDITING_MENU_KEY = COPYEDITING_MENU_KEY;
exports.NOTICE_ASSIGN = NOTICE_ASSIGN;
exports.NOTICE_AWAITING = NOTICE_AWAITING;
exports.DRAFT_FILES = DRAFT_FILES;
exports.COPYEDITED_FILES = COPYEDITED_FILES;
exports.DISCUSSIONS = DISCUSSIONS;
exports.DRAFT_DESCRIPTION = DRAFT_DESCRIPTION;
exports.COPYEDITED_DESCRIPTION = COPYEDITED_DESCRIPTION;
exports.SEND_TO_PRODUCTION = SEND_TO_PRODUCTION;
exports.MOVE_TO_REVIEW = MOVE_TO_REVIEW;
exports.DELETE_QUESTION = DELETE_QUESTION;
exports.NOT_INITIATED = NOT_INITIATED;
exports.IN_PRODUCTION = IN_PRODUCTION;
exports.ALL_STAGES_LABEL = ALL_STAGES_LABEL;

exports.CopyeditingStagePage = class CopyeditingStagePage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        /** The shared workflow frame (header, side menu, columns, status box). */
        this.frame = new WorkflowFrame(page, contextPath);
    }

    // ---------------------------------------------------------------------
    // Landing
    // ---------------------------------------------------------------------

    /** Open the submission's workflow at its "Copyediting" entry (editorial view). */
    async gotoEditorial(submissionId) {
        await this.frame.gotoEditorial(submissionId, {menuKey: COPYEDITING_MENU_KEY});
        await this.frame.expectStageHeading('Copyediting');
    }

    /** Open the submission's workflow at its "Copyediting" entry in the author's view (My Submissions). */
    async gotoAuthor(submissionId) {
        await this.frame.gotoAuthor(submissionId, {menuKey: COPYEDITING_MENU_KEY});
        await this.frame.expectStageHeading('Copyediting');
    }

    /**
     * Land the same address again. A closed legacy side window leaves a
     * hidden shell over the workflow that hides its tables from role queries
     * until the next navigation (patterns.md locator pitfall 4), so every
     * read after such a window follows a re-landing.
     */
    async reland() {
        await this.page.goto(this.page.url());
        await this.frame.expectOpen();
    }

    // ---------------------------------------------------------------------
    // The notice box (Rule 3)
    // ---------------------------------------------------------------------

    /** The level-3 "Notification" heading of the notice box. */
    noticeHeading() {
        return this.frame.primaryColumn().getByRole('heading', {name: 'Notification', exact: true, level: 3});
    }

    /** The notice box's sentence (the paragraph under "Notification"). */
    notice() {
        return this.frame
            .primaryColumn()
            .locator('div.border')
            .filter({has: this.page.getByRole('heading', {name: 'Notification', exact: true, level: 3})})
            .locator('p');
    }

    async expectNotice(text) {
        await expect(this.notice()).toHaveText(text, {timeout: 30_000});
    }

    /**
     * The main column's level-3 headings are exactly these, in order: the
     * one read that says which panels show, whether a notice or a status box
     * sits above them, and that nothing else does (an auto-waited poll).
     */
    async expectPanelHeadings(labels) {
        await this.frame.expectPanelHeadings(labels);
    }

    /**
     * No status box (heading "Status") on the stage. Read by the heading,
     * because the notice box is a bordered box with an h3 too and the
     * frame's `anyStatusBox()` counts it. The caller pairs it with the
     * notice or a panel read on the same screen.
     */
    async expectNoStatusBox() {
        await expect(this.frame.statusBox('Status')).toHaveCount(0);
    }

    // ---------------------------------------------------------------------
    // The file lists (Rules 4, 6)
    // ---------------------------------------------------------------------

    /**
     * A list's whole panel: the innermost div that holds both the list's
     * level-3 heading and its table, so the description paragraph and the
     * "Upload/Select Files" button between them are read in scope.
     */
    panelWrapper(title) {
        return this.frame
            .dialog()
            .locator('div')
            .filter({has: this.page.getByRole('heading', {name: title, exact: true, level: 3})})
            .filter({has: this.page.getByRole('table', {name: title, exact: true})})
            .last();
    }

    /** The line under a list's heading. */
    panelDescription(title) {
        return this.panelWrapper(title).locator('p').first();
    }

    /** The list's "Upload/Select Files" button (one per list). */
    uploadSelectButton(title) {
        return this.panelWrapper(title).getByRole('button', {name: 'Upload/Select Files', exact: true});
    }

    /** Every "Upload/Select Files" button on the open stage. */
    uploadSelectButtons() {
        return this.frame.dialog().getByRole('button', {name: 'Upload/Select Files', exact: true});
    }

    /** A list's table. */
    table(title) {
        return this.frame.panel(title);
    }

    /** The list's file rows (rows with a file-name row header; the "No Items" row has none). */
    fileRows(title) {
        return this.table(title).locator('tbody tr').filter({has: this.page.getByRole('rowheader')});
    }

    /** The row listing the named file. */
    fileRow(title, name) {
        return this.table(title).getByRole('row').filter({has: this.page.getByRole('rowheader', {name, exact: true})});
    }

    /** The list's empty-state cell. */
    noItems(title) {
        return this.table(title).getByRole('cell', {name: 'No Items', exact: true});
    }

    /** A row's "No" cell text (the file's number). */
    async rowNumber(row) {
        return (await row.getByRole('cell').first().innerText()).trim();
    }

    /**
     * The row shows the file's "No", "File Name", "Date uploaded" and "Type"
     * (Rule 4): a number, the name as the row header, a date and the
     * component ("Article Text" for every upload here).
     */
    async expectFileRow(title, name, {type = 'Article Text'} = {}) {
        const row = this.fileRow(title, name);
        await expect(row).toBeVisible({timeout: 30_000});
        await expect(row.getByRole('cell').nth(0)).toHaveText(/^\s*\d+\s*$/);
        await expect(row.getByRole('rowheader')).toHaveText(name);
        await expect(row.getByRole('cell').nth(1)).toHaveText(/^\d{4}-\d{2}-\d{2}$/);
        await expect(row.getByRole('cell').nth(2)).toHaveText(type);
        return row;
    }

    /** The file-name link of a row. */
    fileNameLink(row) {
        return row.getByRole('rowheader').getByRole('link');
    }

    /**
     * Press the file's name: the file downloads (Rule 4). Returns the
     * download's suggested file name. The click also opens an empty popup
     * (U32 claim check K3), which is closed here.
     */
    async downloadFile(row) {
        const popup = this.page.waitForEvent('popup', {timeout: 30_000}).catch(() => null);
        const [download] = await Promise.all([
            this.page.waitForEvent('download', {timeout: 30_000}),
            this.fileNameLink(row).click(),
        ]);
        const extra = await popup;
        if (extra) {
            await extra.close().catch(() => {});
        }
        return download.suggestedFilename();
    }

    /** A row's "More Actions" menu button. */
    rowMenuButton(row) {
        return row.getByRole('button', {name: 'More Actions'});
    }

    /**
     * Row menu › "Delete": the "Delete" dialog asks the Rule 4 question.
     * Returns the dialog; `confirmDelete()` presses its "OK".
     */
    async openDelete(row) {
        await clickRowAction(this.page, row, 'Delete');
        const dialog = this.deleteDialog();
        await expect(dialog).toBeVisible({timeout: 30_000});
        return dialog;
    }

    deleteDialog() {
        return this.page.getByRole('dialog', {name: 'Delete', exact: true});
    }

    async confirmDelete() {
        const dialog = this.deleteDialog();
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
    }

    // ---------------------------------------------------------------------
    // Discussions and participants (Rule 7)
    // ---------------------------------------------------------------------

    /** The rows of "Copyediting Tasks & Discussions" carrying `text` (a discussion's title). */
    discussionRow(text) {
        return this.table(DISCUSSIONS).getByRole('row').filter({hasText: text});
    }

    /** A Participants row by the person's display name. */
    participantRow(name) {
        return this.frame.secondaryColumn().getByRole('listitem').filter({hasText: name});
    }

    /**
     * Participants row › "Edit" › tick "Assignment privileges" (the
     * recommend-only flag) › "OK": the assignment becomes a recommending one
     * (the roster carries no such assignment, so a scenario sets it here).
     */
    async setRecommendOnly(name) {
        await clickRowAction(this.page, this.participantRow(name), 'Edit');
        const form = this.page.getByRole('dialog').filter({has: this.page.locator('input[name="recommendOnly"]')});
        const box = form.locator('input[name="recommendOnly"]');
        await expect(box).toBeVisible({timeout: 30_000});
        await box.check();
        await form.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(form).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    // ---------------------------------------------------------------------
    // The decision buttons (Rules 8–10)
    // ---------------------------------------------------------------------

    /** A decision button of the stage's action region. */
    decisionButton(label) {
        return this.frame.actionButton(label);
    }

    /** The action region's buttons are exactly these, left to right (auto-waited). */
    async expectDecisionButtons(labels) {
        await expect.poll(() => this.frame.actionButtonLabels(), {timeout: 30_000}).toEqual(labels);
    }

    /** The button is drawn as the primary (highlighted) one. */
    async expectHighlighted(label) {
        await expect(this.decisionButton(label)).toHaveClass(/\bbg-primary\b/);
    }

    async expectNotHighlighted(label) {
        await expect(this.decisionButton(label)).not.toHaveClass(/\bbg-primary\b/);
    }

    /** Press a decision button and wait for its wizard page. */
    async openDecision(label) {
        await this.decisionButton(label).click();
        const decision = new DecisionPage(this.page);
        if (label === 'Move to Review') {
            // U32 A13 (pkp-lib#12798): the page's heading reads "Move to
            // Submission" whatever the destination, until record.tpl passes
            // the submission; the breadcrumb names the destination. Accepted
            // for now by the maintainer (2026-09-26, ci-triage row).
            await decision.expectOpen(/^Move to (Review|Submission)(:|$)/);
            await expect(this.page.getByRole('navigation', {name: 'You are here:'}).getByRole('listitem').last())
                .toHaveText('Move to Review', {timeout: 30_000});
        } else {
            await decision.expectOpen(label);
        }
        await decision.awaitComposerLoaded();
        return decision;
    }
};

// ---------------------------------------------------------------------------
// The "Upload/Select Files" window (Rule 5)
// ---------------------------------------------------------------------------

exports.SelectFilesWindow = class SelectFilesWindow {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    /**
     * The window: the legacy side window that carries the "Show files from
     * all accessible workflow stages." box. The workflow side-modal is itself
     * a [role=dialog] and contains this window, so both match the filter;
     * `.last()` is the inner one (later in the DOM), which scopes the grid to
     * the window and not the workflow behind it.
     */
    dialog() {
        return this.page
            .getByRole('dialog')
            .filter({has: this.page.locator('input[name="allStages"]')})
            .last();
    }

    /**
     * Open the window from a list's "Upload/Select Files" and wait for its
     * grid (the "Upload File" link renders with the grid's first draw).
     *
     * @param {InstanceType<typeof exports.CopyeditingStagePage>} stage
     * @param {string} listTitle "Draft Files" or "Copyedited Files"
     */
    async openFrom(stage, listTitle) {
        await stage.uploadSelectButton(listTitle).click();
        await expect(this.uploadLink()).toBeVisible({timeout: 30_000});
        await expect(this.allStagesBox()).toBeVisible({timeout: 30_000});
        await waitForJQueryIdle(this.page);
        return this;
    }

    /** The window's title (the side modal's level-1 heading). */
    title() {
        return this.dialog().getByRole('heading', {level: 1});
    }

    /** The "Upload File" link at the top of the grid. */
    uploadLink() {
        return this.dialog().getByRole('link', {name: 'Upload File', exact: true});
    }

    /** The "Show files from all accessible workflow stages." box. */
    allStagesBox() {
        return this.dialog().getByRole('checkbox', {name: ALL_STAGES_LABEL});
    }

    /** Tick the box: the grid refetches and regroups by stage. */
    async showAllStages() {
        await this.allStagesBox().check();
        await waitForJQueryIdle(this.page);
    }

    /** Every grid row, group headers and files alike, in screen order. */
    rows() {
        return this.dialog().locator('tr.gridRow');
    }

    /** The group header rows ("Submission", "Review", "Copyediting", "Production": rows without a tick box). */
    categoryRows() {
        return this.rows().filter({hasNot: this.page.locator('input[type="checkbox"]')});
    }

    /** The group header row of the named stage (a row without a tick box carrying the label). */
    groupHeader(name) {
        return this.categoryRows().filter({hasText: name});
    }

    /** The row of the named file (a row with a tick box). */
    fileRow(name) {
        return this.rows()
            .filter({hasText: name})
            .filter({has: this.page.locator('input[type="checkbox"]')});
    }

    /** The named file's tick box in the "Select" column. */
    checkbox(name) {
        return this.fileRow(name).locator('input[type="checkbox"]');
    }

    /**
     * Tick a file (the box sits under a styled label, so the click is
     * forced; a forced click does not wait for the window's slide-in, so
     * that is waited out first: motion.js).
     */
    async tick(name) {
        await motionEnded(this.checkbox(name));
        await this.checkbox(name).check({force: true});
        await expect(this.checkbox(name)).toBeChecked();
    }

    /** The grid rows' texts in screen order, whitespace collapsed (for "listed under its stage" reads). */
    async rowTexts() {
        const texts = await this.rows().allInnerTexts();
        return texts.map((t) => t.replace(/\s+/g, ' ').trim());
    }

    /**
     * Press "Upload File": the three-step upload wizard opens over the
     * window. Returns the wizard dialog for its title and steps.
     */
    async openUploadWizard() {
        await this.uploadLink().click();
        const wizard = uploadWizardDialog(this.page);
        await expect(wizard.getByRole('tab', {name: '1. Upload File'})).toBeVisible({timeout: 30_000});
        return wizard;
    }

    /**
     * Finish the open wizard with `file`, wait until the window's grid has
     * redrawn with the new row, and tick it: the upload adds the row unticked
     * (Rule 5b: the file joins the list only when the window is saved with
     * "OK" over a ticked box). Pressing "OK" before the redraw saves nothing
     * (U32 claim check K4), so this waits for the row first.
     */
    async finishUpload(file) {
        await uploadViaWizard(this.page, {file});
        await expect(this.checkbox(fileName(file))).toBeVisible({timeout: 30_000});
        await this.tick(fileName(file));
    }

    /** Upload a file through the window (link, wizard, redraw) without saving the window yet. */
    async uploadFile(file) {
        await this.openUploadWizard();
        await this.finishUpload(file);
    }

    /** Save the window with "OK" and wait for it to close. */
    async ok() {
        const dialog = this.dialog();
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(dialog).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    /** Leave the window with its "Cancel" link (a legacy form's Cancel is an anchor) and wait for it to close. */
    async cancel() {
        const dialog = this.dialog();
        await dialog.getByRole('link', {name: 'Cancel', exact: true}).click();
        await expect(dialog).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }
};

/**
 * Upload one file into a list through its "Upload/Select Files" window and
 * save the window; the list then shows the row. Re-lands the workflow before
 * returning, so the tables are readable by role again.
 *
 * @param {InstanceType<typeof exports.CopyeditingStagePage>} stage
 * @param {string} listTitle
 * @param {string | {name: string, mimeType: string, buffer: Buffer}} file
 */
exports.uploadIntoList = async function uploadIntoList(stage, listTitle, file) {
    const win = await new exports.SelectFilesWindow(stage.page).openFrom(stage, listTitle);
    await win.uploadFile(file);
    await win.ok();
    await stage.reland();
    await expect(stage.fileRow(listTitle, fileName(file))).toBeVisible({timeout: 30_000});
};

// ---------------------------------------------------------------------------
// The decision wizard's completion (Rules 8–9)
// ---------------------------------------------------------------------------

/** The wizard's step rail ("1 Notify Authors", "2 Select Files"). */
exports.stepItems = function stepItems(page) {
    return page.getByRole('list', {name: STEPS_LIST}).getByRole('listitem');
};

/**
 * Press "Continue" until the wizard's "Select Files" page is current. The
 * pages before it depend on the round: "Notify Authors" alone, or "Notify
 * Authors" and "Notify Reviewers" when a reviewer completed a review.
 *
 * @param {import('@playwright/test').Page} page
 * @param {InstanceType<typeof DecisionPage>} decision
 */
exports.continueToSelectFiles = async function continueToSelectFiles(page, decision) {
    const selectFiles = page.getByRole('heading', {name: 'Select Files', exact: true, level: 2});
    for (let i = 0; i < 4; i++) {
        await decision.awaitComposerLoaded();
        if (await selectFiles.isVisible()) {
            return;
        }
        await decision.continueButton.click();
    }
    await expect(selectFiles).toBeVisible({timeout: 30_000});
};

/** The completion dialog by its title ("Sent to Production", "Sent Back from Copyediting"). */
exports.completionDialog = function completionDialog(page, title) {
    return page.getByRole('dialog', {name: title, exact: true});
};

/**
 * Press "Record Decision" and wait for the completion dialog titled `title`,
 * which is returned for the caller to read. The click is retried while the
 * wizard re-renders under it, but never once the decisions POST is on the
 * wire (recording twice is not idempotent; the guard is `DecisionPage.record`'s).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
exports.recordDecision = async function recordDecision(page, title) {
    const decision = new DecisionPage(page);
    await decision.awaitComposerLoaded();
    const dialog = exports.completionDialog(page, title);
    let posted = false;
    page.waitForRequest((r) => r.url().includes('/decisions') && r.method() === 'POST', {timeout: 60_000}).then(
        () => (posted = true),
        () => {}
    );
    await expect(async () => {
        if (!(await dialog.count()) && !posted) {
            try {
                await decision.recordButton.click({timeout: 2_000});
            } catch {
                // retried by toPass; success is the completion dialog
            }
        }
        expect(await dialog.count()).toBeGreaterThan(0);
    }).toPass({intervals: [500, 1_000, 2_000], timeout: 60_000});
    await expect(dialog).toBeVisible();
    return dialog;
};

/** Follow the completion dialog's "View Submission Summary" link back to the workflow. */
exports.leaveCompletion = async function leaveCompletion(page, dialog) {
    await dialog.getByRole('link', {name: 'View Submission Summary', exact: true}).click();
    await expect(page.getByRole('heading', {name: /^Workflow:/})).toBeVisible({timeout: 30_000});
};
