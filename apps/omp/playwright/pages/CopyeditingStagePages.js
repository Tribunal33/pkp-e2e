// @ts-check
/**
 * @file playwright/pages/CopyeditingStagePages.js
 *
 * App-local helpers for the OMP Copyediting stage suite (U32): the stage's
 * panels and their descriptions, the notice box, the two file lists with
 * their "Upload/Select Files" window and upload wizard, the row menu's
 * "Delete", and the two decision wizards ("Send To Production", "Move to
 * Review"). The workflow frame (opening, header, menu, status box) is
 * `ReviewStagePages.js`'s and the shared `WorkflowPage.js`'s; this file adds
 * only what the Copyediting stage shows once open. Screen shapes from the
 * U32 claim check (2026-09-18/19, `.reports/U32/screen-notes.md`).
 */
const {expect} = require('../support/fixtures.js');
const {
    editorialUrl,
    authorUrl,
    workflowModal,
    topModal,
    primaryRegion,
    actionsRegion,
    decisionButton,
    awaitComposerReady,
    walkDecisionWizard,
} = require('./ReviewStagePages.js');

/** The workflow menu key of the Copyediting stage entry. */
const COPYEDITING_MENU_KEY = 'workflow_4';

/** The two decision buttons of the stage (Rules 8–9). */
const COPYEDITING_DECISIONS = {
    sendToProduction: 'Send To Production',
    moveToReview: 'Move to Review',
};

/** The notice box's two sentences (Rule 3). */
const NOTICES = {
    assign: 'Assign a copyeditor using the Assign link in the Participants list.',
    awaiting: 'Awaiting Copyedits.',
};

/** The status-box sentences the "Copyediting" entry shows off the stage (Rules 9b, 10). */
const STAGE_STATUS = {
    notInitiated: 'The Copyediting stage has not yet been initiated.',
    inProduction: 'The submission is currently in the Production stage.',
};

/** The main-column panels, top to bottom (Rule 1). */
const LISTS = {
    draft: 'Draft Files',
    copyedited: 'Copyedited Files',
};
const DISCUSSIONS_PANEL = 'Copyediting Tasks & Discussions';
const PRODUCTION_READY = 'Production Ready Files';

/** The line under each list's heading (Rule 1). */
const LIST_DESCRIPTIONS = {
    [LISTS.draft]: 'These are files from the review stage which are to be copyedited',
    [LISTS.copyedited]: 'These are edited files that will be taken to the production stage',
};

/** The select window's titles per list (Rule 5). */
const SELECT_WINDOW_TITLES = {
    [LISTS.draft]: 'Upload/Select Files',
    [LISTS.copyedited]: 'Upload/Select Files',
};

/** The upload wizard's titles per list (Rule 5b). */
const UPLOAD_WIZARD_TITLES = {
    [LISTS.draft]: 'Upload File',
    [LISTS.copyedited]: 'Upload Copyedited File',
};

const UPLOAD_WIZARD_STEPS = ['1. Upload File', '2. Review Details', '3. Confirm'];

/** The "Select Files" page's heading line of "Send To Production" (Rule 8). */
const SELECT_FILES_PROMPT = 'Select files that should be sent to the production stage.';

/** The completion dialogs of the two decisions (Rules 8–9). */
const COMPLETIONS = {
    sentToProduction: {
        title: 'Sent to Production',
        message: (title) =>
            `The submission, ${title}, was sent to the production stage. The author has been notified, unless you chose to skip that email.`,
    },
    sentBack: {
        title: 'Sent Back from Copyediting',
        message: (title) =>
            `The submission, ${title}, was sent back from the copyediting stage. The author has been notified, unless you chose to skip that email.`,
    },
};

/** The two decisions' emails to the authors (Side effects). */
const AUTHOR_MAILS = {
    sentToProduction: 'Next steps for publishing your submission',
    movedToReview: 'Your submission has been moved to review',
};

/** The "Request Copyedit" message's email and Tasks-panel rows (Side effects). */
const REQUEST_COPYEDIT = {
    template: 'Request Copyedit',
    subject: 'Request Copyedit',
    bodyOpening: 'A new submission is ready to be copyedited:',
    task: (title) => `You have been asked to review copyedits for "${title}".`,
    discussionRow: /started a discussion: Request Copyedit/,
};

/** The file-row "Delete" dialog (Rule 4). */
const DELETE_DIALOG_TEXT = 'Are you sure you wish to delete this item? This action cannot be undone.';

/**
 * Open the submission's "Copyediting" entry in the editorial view, whatever
 * the submission's current stage, and wait for its heading.
 */
async function openCopyediting(page, contextPath, submissionId) {
    await page.goto(`${editorialUrl(contextPath, submissionId)}&workflowMenuKey=${COPYEDITING_MENU_KEY}`);
    const modal = workflowModal(page);
    await expect(modal.getByRole('heading', {name: 'Workflow: Copyediting'})).toBeVisible({
        timeout: 20_000,
    });
    return modal;
}

/** The same entry in the author's (My Submissions) view. */
async function openAuthorCopyediting(page, contextPath, submissionId) {
    await page.goto(`${authorUrl(contextPath, submissionId)}&workflowMenuKey=${COPYEDITING_MENU_KEY}`);
    const modal = workflowModal(page);
    await expect(modal.getByRole('heading', {name: 'Workflow: Copyediting'})).toBeVisible({
        timeout: 20_000,
    });
    return modal;
}

/** Select a stage entry of the workflow menu and wait for its heading. */
async function selectStage(modal, label) {
    await modal.getByRole('navigation').getByRole('link', {name: label, exact: true}).click();
    await expect(modal.getByRole('heading', {name: `Workflow: ${label}`})).toBeVisible({
        timeout: 20_000,
    });
}

// ---------------------------------------------------------------------
// The notice box (Rule 3)
// ---------------------------------------------------------------------

/** The notice box's level-3 heading "Notification" (absent when no notice applies). */
function noticeHeading(modal) {
    return primaryRegion(modal).getByRole('heading', {name: 'Notification', exact: true});
}

/** The notice box: the heading's parent, holding the sentence under it. */
function noticeBox(modal) {
    return noticeHeading(modal).locator('..');
}

async function expectNotice(modal, sentence) {
    await expect(noticeBox(modal)).toContainText(sentence, {timeout: 20_000});
}

/**
 * No notice box at all. An absence read: the caller pairs it with a
 * positive control on the same screen (a list heading, a button).
 */
async function expectNoNotice(modal) {
    await expect(noticeHeading(modal)).toHaveCount(0);
}

/**
 * The main column's panel headings, in order, among the four the stage can
 * show: the notice's "Notification", then the lists and the discussions
 * panel. `toHaveText` on the array asserts order and count.
 */
function mainHeadings(modal) {
    return primaryRegion(modal).getByRole('heading', {
        name: /^(Notification|Draft Files|Copyediting Tasks & Discussions|Copyedited Files)$/,
    });
}

/** The "Status" or "Round N Status" heading of any status box in the main column. */
function statusHeading(modal) {
    return primaryRegion(modal).getByRole('heading', {name: /Status$/});
}

// ---------------------------------------------------------------------
// The two file lists (Rules 4, 6) and the discussions panel (Rule 7)
// ---------------------------------------------------------------------

/** A list's table, by its accessible name ("Draft Files", "Copyedited Files", "Production Ready Files"). */
function fileList(modal, listName) {
    return primaryRegion(modal).getByRole('table', {name: listName, exact: true});
}

/**
 * The panel wrapping one list: the innermost block of the main column that
 * holds both the list's heading and its table, so the "Upload/Select
 * Files" button and the description line found inside it are that list's
 * own (the two lists carry identically named buttons).
 */
function filePanel(modal, listName) {
    const page = modal.page();
    return primaryRegion(modal)
        .locator('div')
        .filter({has: page.getByRole('heading', {name: listName, exact: true})})
        .filter({has: page.getByRole('table', {name: listName, exact: true})})
        .last();
}

function listHeading(modal, listName) {
    return primaryRegion(modal).getByRole('heading', {name: listName, exact: true});
}

/** The line under a list's heading (Rule 1). */
function listDescription(modal, listName) {
    return filePanel(modal, listName).getByText(LIST_DESCRIPTIONS[listName], {exact: true});
}

/** The list's "Upload/Select Files" button. */
function uploadSelectButton(modal, listName) {
    return filePanel(modal, listName).getByRole('button', {name: 'Upload/Select Files', exact: true});
}

/** The row(s) of a list carrying `fileName`. */
function fileRow(modal, listName, fileName) {
    return fileList(modal, listName).getByRole('row').filter({hasText: fileName});
}

/** A list's data rows: those with a file-name link (the header row has none). */
function fileRows(modal, listName) {
    return fileList(modal, listName).getByRole('row').filter({has: modal.page().getByRole('link')});
}

/** A row's "No" cell text, trimmed. */
async function rowNumber(row) {
    const text = await row.getByRole('cell').first().innerText();
    return text.trim();
}

/** The list's column headers (the row-menu column's header follows the four named ones). */
function columnHeaders(modal, listName) {
    return fileList(modal, listName).getByRole('columnheader');
}

const FILE_COLUMNS = ['No', 'File Name', 'Date uploaded', 'Type'];

/** A row's "More Actions" menu button (absent in the author's view). */
function rowMenuButton(row) {
    return row.getByRole('button', {name: /More Actions/});
}

/** The discussions panel's table. */
function discussionsPanel(modal) {
    return primaryRegion(modal).getByRole('table', {name: DISCUSSIONS_PANEL, exact: true});
}

/** The discussions panel's row(s) carrying `text` (its group headers are rows too). */
function discussionRow(modal, text) {
    return discussionsPanel(modal).getByRole('row').filter({hasText: text});
}

/** The stage's Participants panel and its heading. */
function participantsPanel(modal) {
    return modal.locator('[data-cy="participant-manager"]');
}

function participantsHeading(modal) {
    return modal.getByRole('heading', {name: 'Participants', exact: true});
}

/**
 * Delete a file through its row menu (Rule 4): "More Actions" › "Delete",
 * the Vue "Delete" dialog with its sentence, "OK". Waits for the row to go.
 */
async function deleteFileRow(page, modal, listName, fileName) {
    const row = fileRow(modal, listName, fileName).first();
    await rowMenuButton(row).click();
    await page.getByRole('menuitem', {name: 'Delete', exact: true}).click();
    const dialog = deleteDialog(page);
    await expect(dialog).toBeVisible({timeout: 20_000});
    await expect(dialog).toContainText(DELETE_DIALOG_TEXT);
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(dialog).toHaveCount(0, {timeout: 20_000});
    await expect(fileRow(modal, listName, fileName)).toHaveCount(0, {timeout: 20_000});
}

/** The row menu's "Delete" confirmation dialog. */
function deleteDialog(page) {
    return page.getByRole('dialog').filter({hasText: DELETE_DIALOG_TEXT});
}

// ---------------------------------------------------------------------
// The "Upload/Select Files" window (Rule 5)
// ---------------------------------------------------------------------

/**
 * Press a list's "Upload/Select Files" and resolve the window (the top
 * modal), settled once its "Upload File" link is on screen. The window's
 * title is read by the test from `page.getByRole('dialog', {name})`.
 */
async function openSelectWindow(page, modal, listName) {
    await uploadSelectButton(modal, listName).click();
    const window = topModal(page);
    await expect(windowUploadLink(window)).toBeVisible({timeout: 20_000});
    return window;
}

/** The legacy window by its title (its accessible name). */
function selectWindowTitled(page, title) {
    return page.getByRole('dialog', {name: title, exact: true});
}

/** The window's "Upload File" link at the top of its grid. */
function windowUploadLink(window) {
    return window.getByRole('link', {name: 'Upload File', exact: true});
}

/** The window's "Show files from all accessible workflow stages." box. */
function allStagesBox(window) {
    return window.getByRole('checkbox', {name: 'Show files from all accessible workflow stages.'});
}

/** The window's group row for a stage ("Copyediting", "Submission", …). */
function windowGroup(window, stageName) {
    return window.getByRole('row').filter({hasText: new RegExp(`^\\s*${stageName}\\s*$`)});
}

/** A listed file's row in the window, and its "Select" box. */
function windowFileRow(window, fileName) {
    return window.getByRole('row').filter({hasText: fileName});
}

function windowFileBox(window, fileName) {
    return windowFileRow(window, fileName).locator('input[type="checkbox"]').first();
}

/** The window's bottom controls: "OK" is a button, "Cancel" a link (a legacy form). */
function windowOk(window) {
    return window.getByRole('button', {name: 'OK', exact: true});
}

function windowCancel(window) {
    return window.getByRole('link', {name: 'Cancel', exact: true});
}

/**
 * Save the window with "OK" and wait for it to close; the caller reads the
 * list behind it.
 */
async function saveSelectWindow(window) {
    await windowOk(window).click();
    await expect(windowOk(window)).toBeHidden({timeout: 20_000});
}

/**
 * The upload wizard the window's "Upload File" opens: the dialog holding
 * the legacy `fileUploadWizard` element (the window and the workflow are
 * dialogs too).
 */
function uploadWizard(page) {
    return page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
}

/**
 * Press the window's "Upload File" and walk the three-step wizard: pick the
 * component, transfer an in-memory file, Continue, Continue, Complete.
 * Returns once the wizard is gone and the new row sits ticked in the
 * window's grid (the grid redraws after "Complete"; an "OK" pressed before
 * that redraw saves nothing).
 */
async function uploadInSelectWindow(page, window, fileName, {expectTitle = null} = {}) {
    await windowUploadLink(window).click();
    const wizard = uploadWizard(page);
    await expect(wizard.getByRole('tab', {name: UPLOAD_WIZARD_STEPS[0]})).toBeVisible({timeout: 20_000});
    if (expectTitle) {
        await expect(page.getByRole('dialog', {name: expectTitle, exact: true})).toBeVisible();
        await expect(wizard.getByRole('tab')).toHaveText(UPLOAD_WIZARD_STEPS);
    }
    const genre = wizard.locator('select[id^="genreId"]');
    await expect(genre).toBeVisible({timeout: 20_000});
    await genre.selectOption({label: 'Book Manuscript'});
    await page.locator('input[type="file"]').last().setInputFiles({
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from(`Copyediting file ${fileName}`),
    });
    await expect(wizard.getByRole('button', {name: /Change File/})).toBeVisible({timeout: 20_000});
    await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(wizard.getByRole('tab', {name: UPLOAD_WIZARD_STEPS[1]})).toHaveAttribute('aria-selected', 'true', {timeout: 20_000});
    await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(wizard.getByRole('tab', {name: UPLOAD_WIZARD_STEPS[2]})).toHaveAttribute('aria-selected', 'true', {timeout: 20_000});
    await wizard.getByRole('button', {name: 'Complete', exact: true}).click();
    await expect(wizard.getByRole('tab', {name: UPLOAD_WIZARD_STEPS[2]})).toBeHidden({timeout: 20_000});
    // The window's grid redraws with the new row; on the press it arrives
    // with its box clear (run 1, 2026-09-19), so tick it: "OK" saves the
    // ticked files into the list.
    const box = windowFileBox(window, fileName);
    await expect(box).toBeVisible({timeout: 20_000});
    if (!(await box.isChecked())) {
        await box.check();
    }
}

/**
 * Upload one file into a list through its window: open, upload, "OK", and
 * wait for the list's row. The one-call form the seeds need (a seeded
 * submission carries no files).
 */
async function uploadIntoList(page, modal, listName, fileName) {
    const window = await openSelectWindow(page, modal, listName);
    await uploadInSelectWindow(page, window, fileName);
    await saveSelectWindow(window);
    await expect(fileRow(modal, listName, fileName).first()).toBeVisible({timeout: 20_000});
}

// ---------------------------------------------------------------------
// The decisions (Rules 8–9)
// ---------------------------------------------------------------------

/**
 * The decision wizard's step rail: a list named "Complete the following
 * steps to take this decision" whose items read "1 Notify Authors",
 * "2 Select Files" (run 2, 2026-09-19).
 */
function wizardSteps(page) {
    return page
        .getByRole('list', {name: 'Complete the following steps to take this decision'})
        .getByRole('listitem');
}

/** The completion dialog of a recorded decision, by its title. */
function completionDialog(page, title) {
    return page.getByRole('dialog', {name: title, exact: true});
}

/** Leave the completion dialog through its one control, the "View Submission Summary" link. */
async function viewSubmissionSummary(page) {
    await page.getByRole('link', {name: 'View Submission Summary'}).click();
    const modal = workflowModal(page);
    await expect(modal.getByRole('heading', {name: /^Workflow:/}).first()).toBeVisible({timeout: 20_000});
    return modal;
}

/**
 * Press "Send To Production" and walk to its "Select Files" page (Rule 8):
 * the "Notify Authors" page first, then "Continue". Returns on the file page
 * with the prompt line visible, the boxes left as they arrive.
 */
async function startSendToProduction(page, modal) {
    await decisionButton(modal, COPYEDITING_DECISIONS.sendToProduction).click();
    await expect(page.getByRole('heading', {level: 1, name: /Send To Production/})).toBeVisible({timeout: 15_000});
    await expect(wizardSteps(page)).toHaveText([/Notify Authors/, /Select Files/]);
    await awaitComposerReady(page);
    await page.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Select Files', exact: true})).toBeVisible({timeout: 15_000});
    await expect(page.getByText(SELECT_FILES_PROMPT)).toBeVisible();
}

/** A file's box on the wizard's "Select Files" page. */
function wizardFileBox(page, fileName) {
    return page.getByRole('checkbox', {name: new RegExp(escapeRegExp(fileName))});
}

/**
 * Record the decision from the wizard's last page and wait for the
 * completion dialog named `title`, reading `message` in it.
 */
async function recordAndExpectCompletion(page, {title, message}) {
    await walkDecisionWizard(page);
    const dialog = completionDialog(page, title);
    await expect(dialog).toBeVisible({timeout: 20_000});
    await expect(dialog).toContainText(message);
    return dialog;
}

/**
 * Press "Move to Review" (Rule 9): the wizard opens on its one page,
 * "Notify Authors". Returns on that page.
 */
async function startMoveToReview(page, modal) {
    await decisionButton(modal, COPYEDITING_DECISIONS.moveToReview).click();
    // U32 A13 (pkp-lib#12798): the heading reads "Move to Submission" whatever
    // the destination, until record.tpl passes the submission; the breadcrumb
    // names the destination. Accepted for now (maintainer, 2026-09-26).
    await expect(page.getByRole('heading', {level: 1, name: /^Move to (Review|Submission)/})).toBeVisible({timeout: 15_000});
    await expect(page.getByRole('navigation', {name: 'You are here:'}).getByRole('listitem').last())
        .toHaveText('Move to Review', {timeout: 15_000});
    await awaitComposerReady(page);
}

/** The two decision buttons, in the order the screen shows them. */
async function expectDecisionButtons(modal) {
    await expect(actionsRegion(modal).getByRole('button')).toHaveText([
        COPYEDITING_DECISIONS.sendToProduction,
        COPYEDITING_DECISIONS.moveToReview,
    ]);
}

/**
 * Neither decision button (Rule 10; Actors rows 6–7). An absence read: the
 * caller pairs it with a positive control on the same screen.
 */
async function expectNoDecisionButtons(modal) {
    await expect(decisionButton(modal, COPYEDITING_DECISIONS.sendToProduction)).toHaveCount(0);
    await expect(decisionButton(modal, COPYEDITING_DECISIONS.moveToReview)).toHaveCount(0);
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
    COPYEDITING_MENU_KEY,
    COPYEDITING_DECISIONS,
    NOTICES,
    STAGE_STATUS,
    LISTS,
    DISCUSSIONS_PANEL,
    PRODUCTION_READY,
    LIST_DESCRIPTIONS,
    SELECT_WINDOW_TITLES,
    UPLOAD_WIZARD_TITLES,
    UPLOAD_WIZARD_STEPS,
    SELECT_FILES_PROMPT,
    COMPLETIONS,
    AUTHOR_MAILS,
    REQUEST_COPYEDIT,
    DELETE_DIALOG_TEXT,
    FILE_COLUMNS,
    openCopyediting,
    openAuthorCopyediting,
    selectStage,
    noticeHeading,
    noticeBox,
    expectNotice,
    expectNoNotice,
    mainHeadings,
    statusHeading,
    fileList,
    filePanel,
    listHeading,
    listDescription,
    uploadSelectButton,
    fileRow,
    fileRows,
    rowNumber,
    columnHeaders,
    rowMenuButton,
    discussionsPanel,
    discussionRow,
    participantsPanel,
    participantsHeading,
    deleteFileRow,
    deleteDialog,
    openSelectWindow,
    selectWindowTitled,
    windowUploadLink,
    allStagesBox,
    windowGroup,
    windowFileRow,
    windowFileBox,
    windowOk,
    windowCancel,
    saveSelectWindow,
    uploadWizard,
    uploadInSelectWindow,
    uploadIntoList,
    wizardSteps,
    completionDialog,
    viewSubmissionSummary,
    startSendToProduction,
    wizardFileBox,
    recordAndExpectCompletion,
    startMoveToReview,
    expectDecisionButtons,
    expectNoDecisionButtons,
};
