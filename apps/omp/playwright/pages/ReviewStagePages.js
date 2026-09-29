// @ts-check
/**
 * @file playwright/pages/ReviewStagePages.js
 *
 * App-local helpers for the OMP External Review stage & rounds suite (U26).
 * Screen shapes verified live against the OMP fleet (2026-07-31): the
 * workflow renders as a side modal ([data-cy="active-modal"]); legacy grid
 * and wizard modals stack above it; decision wizards are full-page flows
 * ending in a completion panel with a "View Submission Summary" link.
 *
 * For U34 (2026-09-20) the file also holds `DecisionWorkflow`: what a
 * decision scenario reads and builds around the wizard on a press (the
 * decision buttons of the internal and external rounds, the "Request
 * Revisions" choice window, the minimum-reviews dialog, "Read Review" ›
 * "Mark as Complete", the "Recommendation" box and "Change decision", the
 * recommend-only flag, the discussions rows, the author's "Notifications"
 * list and "Read Review" window, the Library and the stage uploads).
 */
const {expect} = require('../support/fixtures.js');
const {WorkflowPage: WorkflowFrame} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {waitForJQueryIdle} = require('../../../../shared/playwright/support/legacy.js');
const {waitForEditorReady, editorIdOf} = require('../../../../shared/playwright/support/richtext.js');

/** Round status sentences (lib/pkp locale, editor wording — Rule 5). */
const STATUS = {
    waiting: 'Waiting for reviewers to be assigned.',
    awaitingResponses: 'Awaiting responses from reviewers.',
    newReviews: 'New reviews have been submitted.',
    reviewsConfirmed: 'All reviews are confirmed and a decision is needed.',
    revisionsRequested: 'Revisions have been requested.',
    revisionsSubmitted: 'Revisions have been submitted and a decision is needed.',
    resubmitRequested:
        'Revisions requested from the author to be taken to a new review round.',
    resubmitSubmitted:
        'Revisions submitted. A new review round needs to be created.',
    awaitingRecommendations: 'Awaiting recommendations from editors.',
    recommendationsIn: 'All recommendations are in and a decision is needed.',
    declined: 'Submission declined.',
    advancedToNextRound:
        'The submission has been advanced to the next round of review',
    inCopyediting: 'The submission is currently in the Copyediting stage.',
    advancedAndAccepted:
        'The submission advanced to the next review round, was accepted, and is currently in the Copyediting stage.',
    minimumConfirmed:
        'Minimum required number of reviews have been confirmed. A decision is needed.',
};

/**
 * The status box's first line on a press whose "Minimum Confirmed Reviews
 * Required" is above 0 (`dashboard.minimumConfirmedReviewsRequired`,
 * S15). A press at the default of 0 renders no such line.
 */
function minimumLine(number) {
    return `Minimum number of confirmed reviews required: ${number}.`;
}

/** The five external-review decision buttons (Rule 11, OMP labels). */
const DECISIONS = {
    requestRevisions: 'Request Revisions',
    accept: 'Accept Submission',
    newRound: 'Create New Review Round',
    cancelRound: 'Cancel Review Round',
    decline: 'Decline Submission',
    revertDecline: 'Revert Decline',
    delete: 'Delete',
};

function editorialUrl(contextPath, submissionId) {
    return `/index.php/${contextPath}/en/dashboard/editorial?workflowSubmissionId=${submissionId}`;
}

function authorUrl(contextPath, submissionId) {
    return `/index.php/${contextPath}/en/dashboard/mySubmissions?workflowSubmissionId=${submissionId}`;
}

/** The workflow side-modal (bottom of the modal stack). */
function workflowModal(page) {
    return page.locator('[data-cy="active-modal"]').first();
}

/** The top-most modal (legacy wizards/grids stack above the workflow). */
function topModal(page) {
    return page.locator('[data-cy="active-modal"]').last();
}

function primaryRegion(modal) {
    return modal.locator('[data-cy="workflow-primary-items"]');
}

function actionsRegion(modal) {
    return modal.locator('[data-cy="workflow-action-items"]');
}

function secondaryRegion(modal) {
    return modal.locator('[data-cy="workflow-secondary-items"]');
}

function decisionButton(modal, label) {
    return actionsRegion(modal).getByRole('button', {name: label, exact: true});
}

/** Open the editorial view of a submission's workflow; resolves the modal. */
async function openEditorial(page, contextPath, submissionId) {
    await page.goto(editorialUrl(contextPath, submissionId));
    const modal = workflowModal(page);
    await expect(
        modal.getByRole('heading', {name: /^Workflow:/}).first()
    ).toBeVisible({timeout: 20_000});
    return modal;
}

/** Open the author (My Submissions) view of the same workflow. */
async function openAuthorView(page, contextPath, submissionId) {
    await page.goto(authorUrl(contextPath, submissionId));
    const modal = workflowModal(page);
    await expect(
        modal.getByRole('heading', {name: /^Workflow:/}).first()
    ).toBeVisible({timeout: 20_000});
    return modal;
}

/** Assert the "Round {N} Status" box carries the given sentence. */
async function expectRoundStatus(modal, round, sentence) {
    const primary = primaryRegion(modal);
    await expect(
        primary.getByRole('heading', {name: `Round ${round} Status`, exact: true})
    ).toBeVisible({timeout: 15_000});
    await expect(primary.getByText(sentence, {exact: true})).toBeVisible();
}

/**
 * The "Round {N} Status" box itself (heading, optional minimum line,
 * sentence), for reads of the whole box's text: the heading's bordered
 * parent (`WorkflowSubmissionStatus.vue`).
 */
function roundStatusBox(modal, round) {
    return primaryRegion(modal)
        .getByRole('heading', {name: `Round ${round} Status`, exact: true})
        .locator('..');
}

/**
 * The "Round {N} Status" box's lines under its heading, in order: the
 * optional minimum line first, then the round's own sentence
 * (`WorkflowSubmissionStatus.vue` prints each in its own paragraph).
 * Waits for the heading first, so the read is settled.
 */
async function roundStatusLines(modal, round) {
    const box = roundStatusBox(modal, round);
    await expect(box.getByRole('heading', {name: `Round ${round} Status`, exact: true})).toBeVisible({timeout: 15_000});
    const text = await box.innerText();
    return text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line && line !== `Round ${round} Status`);
}

/**
 * Assert the "Round {N} Status" box opens with `first` (its first line
 * under the heading; U29 S1 and S13: "Minimum number of confirmed reviews
 * required: N.") and, when given, carries `second` as the line under it.
 */
async function expectRoundStatusOpensWith(modal, round, first, second = null) {
    const box = roundStatusBox(modal, round);
    await expect(box.getByText(first, {exact: true})).toBeVisible({timeout: 15_000});
    await expect(async () => {
        const lines = await roundStatusLines(modal, round);
        expect(lines[0]).toBe(first);
        if (second !== null) {
            expect(lines[1]).toBe(second);
        }
    }).toPass({timeout: 15_000});
}

/** Assert the past-round / past-stage box: plain "Status" heading + sentence. */
async function expectPlainStatus(modal, sentence) {
    const primary = primaryRegion(modal);
    await expect(
        primary.getByRole('heading', {name: 'Status', exact: true})
    ).toBeVisible({timeout: 15_000});
    await expect(primary.getByText(sentence)).toBeVisible();
}

/**
 * Wait for any email composer on the current wizard step to finish loading
 * its template (submitting against a still-loading composer fails
 * server-side — locator pitfall "AJAX-loaded email templates").
 */
async function awaitComposerReady(page) {
    if (await page.getByText('Email Templates').count()) {
        const editorBody = page
            .frameLocator('iframe.tox-edit-area__iframe')
            .last()
            .locator('body');
        await expect(editorBody).toContainText(/\w/, {timeout: 20_000});
    }
}

/**
 * Walk a full-page decision wizard to its completion panel, clicking
 * Continue through intermediate steps and Record Decision at the end.
 * The caller has already reached the wizard (heading "…: …").
 */
async function walkDecisionWizard(page, {maxSteps = 6} = {}) {
    const completion = page.getByText('View Submission Summary');
    for (let i = 0; i < maxSteps; i++) {
        if (await completion.count()) {
            return;
        }
        await awaitComposerReady(page);
        const record = page.getByRole('button', {
            name: /Record (Editorial )?(Decision|Recommendation)/,
        });
        if (await record.count()) {
            // The wizard can re-render under the click (the same
            // click-lost-to-re-render disease as the contributors panel;
            // observed once in the full-suite gate: wizard still open, no
            // decisions POST in any worker log). Outcome-keyed bounded
            // re-click: success is the completion panel appearing; stop
            // clicking once the decisions POST is on the wire (recording a
            // decision twice is not idempotent); click errors (detached
            // nodes mid-re-render) are swallowed and retried.
            let posted = false;
            page.waitForRequest(
                (r) => r.url().includes('/decisions') && r.method() === 'POST',
                {timeout: 60_000}
            ).then(
                () => (posted = true),
                () => {}
            );
            await expect(async () => {
                if (!(await completion.count()) && !posted) {
                    try {
                        await record.first().click({timeout: 2_000});
                    } catch {
                        // retried by toPass; success is the completion text
                    }
                }
                expect(await completion.count()).toBeGreaterThan(0);
            }).toPass({intervals: [500, 1_000, 2_000], timeout: 60_000});
            return;
        }
        await page.getByRole('button', {name: 'Continue', exact: true}).click();
        await page.waitForTimeout(400);
    }
    throw new Error('Decision wizard did not reach its completion panel');
}

/**
 * Press "Request Revisions", pick the round path in the entry dialog
 * (asserting the no-new-round choice arrives preselected — Rule 11), and
 * complete the wizard. The wizard's "Notify Reviewers" email is sent, so
 * the reviewer's row reads "Reviewer Thanked" afterwards.
 */
async function requestRevisions(page, modal, {newRound = false} = {}) {
    await decisionButton(modal, DECISIONS.requestRevisions).click();
    const dlg = page
        .getByRole('dialog')
        .filter({hasText: 'Require New Review Round'});
    await expect(
        dlg.getByText('Revisions will not be subject to a new round of peer reviews.')
    ).toBeVisible({timeout: 10_000});
    await expect(dlg.getByRole('radio').first()).toBeChecked();
    if (newRound) {
        await dlg
            .getByText('Revisions will be subject to a new round of peer reviews.')
            .click();
    }
    await dlg.getByRole('button', {name: 'Next'}).click();
    // The page heading is "{Decision}" alone on single-step wizards and
    // "{Decision}: {Step}" on multi-step ones.
    await expect(
        page.getByRole('heading', {
            level: 1,
            name: /(Request Revisions|Resubmit for Review)/,
        })
    ).toBeVisible({timeout: 15_000});
    await walkDecisionWizard(page);
}

/**
 * Complete a review as the signed-in reviewer: accept if still invited,
 * walk to step 3, enter the author-and-editor comment, submit, confirm.
 */
async function completeReviewAsReviewer(page, contextPath, submissionId, comment) {
    await page.goto(
        `/index.php/${contextPath}/en/reviewer/submission/${submissionId}`
    );
    const acceptButton = page.getByRole('button', {
        name: /Accept Review, Continue to Step #2/,
    });
    const saveContinue = page.getByRole('button', {name: 'Save and continue'});
    await expect(acceptButton.or(saveContinue).first()).toBeVisible({
        timeout: 20_000,
    });
    if (await acceptButton.count()) {
        // A privacy-consent checkbox may gate the accept button.
        const consent = page.locator('input[type="checkbox"][name="privacyConsent"]');
        if (await consent.count()) {
            await consent.check();
        }
        await acceptButton.click();
    } else {
        await saveContinue.click();
    }
    await page.getByRole('button', {name: 'Continue to Step #3'}).click();
    const commentsFrame = page.locator('iframe[id^="comments"]').first();
    const commentsBody = commentsFrame.contentFrame().locator('body');
    await expect(commentsBody).toBeVisible({timeout: 20_000});
    // Typed before the editor is `initialized`, the text is wiped by its
    // late content style sheets and the review is submitted without it
    // (shared/playwright/support/richtext.js).
    await waitForEditorReady(page, await editorIdOf(commentsFrame));
    // Click into the rich-text body before typing and blur afterwards so
    // TinyMCE registers the change and syncs its backing textarea — a bare
    // fill() can be lost on submit.
    await commentsBody.click();
    await commentsBody.fill(comment);
    await expect(commentsBody).toContainText(comment);
    await page.getByRole('heading', {name: /^Review:/}).first().click();
    await page.getByRole('button', {name: 'Submit Review'}).click();
    await expect(
        page.getByText('Are you sure you want to submit this review?')
    ).toBeVisible({timeout: 10_000});
    await page.getByRole('button', {name: 'OK'}).click();
    await expect(page.getByText('Review Submitted')).toBeVisible({
        timeout: 30_000,
    });
}

/**
 * Editor confirms a submitted review from the Reviewers panel: the row's
 * "Read Review" opens the Vue "Review Details" side window
 * (pkp/pkp-lib#13156), whose "Mark as Complete" asks "Mark this review as
 * complete?" in a confirmation dialog. The window is anchored by its dialog
 * title — its [data-cy="active-modal"] wrapper computes visibility:hidden —
 * and its load-settled signal is the "Modify Review" footer button
 * enabling (no timeouts: PRINCIPLES A5). The window stays open after the
 * confirm, so it is closed with its "Cancel" button — and the workflow
 * modal's DOM is unmounted while the window is open, so the row can only
 * be read back after the close.
 */
async function confirmReviewAsEditor(page, modal, reviewerName) {
    const row = modal
        .locator('[data-cy="reviewer-manager"]')
        .getByRole('row')
        .filter({hasText: reviewerName});
    await row.getByRole('button', {name: 'Read Review'}).click();
    const readModal = page.getByRole('dialog', {name: /^Review Details:/});
    await expect(
        readModal.getByRole('button', {name: 'Modify Review', exact: true})
    ).toBeEnabled({timeout: 20_000});
    await readModal
        .getByRole('button', {name: 'Mark as Complete', exact: true})
        .click();
    const dialog = page
        .locator('[data-cy="dialog"]')
        .filter({hasText: 'Mark this review as complete?'});
    await dialog
        .getByRole('button', {name: 'Mark as Complete', exact: true})
        .click();
    // The completion toast (client-emitted) bounds the save; the row is
    // only in the DOM again once the window is closed.
    await expect(
        page.getByText('The review has been marked as complete.').first()
    ).toBeVisible({timeout: 20_000});
    await readModal.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(readModal).toBeHidden({timeout: 20_000});
    await expect(row).toContainText('Complete', {timeout: 20_000});
}

/**
 * Complete the legacy three-step "Upload Review File" wizard that an Upload
 * control has just opened: pick a component, attach an in-memory file, walk
 * Continue → Continue → Complete.
 */
async function completeUploadWizard(page, fileName) {
    const wizard = topModal(page);
    await expect(wizard.getByText(/^Upload .* File$/).first()).toBeVisible({
        timeout: 20_000,
    });
    // The wizard's first select can be the (disabled) "revise a file"
    // chooser; the component select is the genre one.
    const genre = wizard.locator('select[id^="genreId"]');
    await expect(genre).toBeVisible({timeout: 20_000});
    await genre.selectOption({label: 'Book Manuscript'});
    await page.locator('input[type="file"]').last().setInputFiles({
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from(`Revised file ${fileName}`),
    });
    await expect(wizard.getByRole('button', {name: /Change File/})).toBeVisible({
        timeout: 20_000,
    });
    await wizard.getByRole('button', {name: 'Continue'}).click();
    // Step 2 — Review Details (file name arrives prefilled).
    await expect(wizard.getByText('Name the file')).toBeVisible({timeout: 10_000});
    await wizard.getByRole('button', {name: 'Continue'}).click();
    // Step 3 — Confirm.
    await expect(wizard.getByText('File Added')).toBeVisible({timeout: 10_000});
    await wizard.getByRole('button', {name: 'Complete'}).click();
    await expect(page.getByText('File Added')).toBeHidden({timeout: 10_000});
}

/**
 * Upload one review file into the round's "Files for Review" list through
 * the editor's "Upload/Select Files" window ("Current Review Files For
 * Round N": link "Upload Review File" opens the legacy three-step wizard;
 * the new file's box arrives ticked, "OK" saves the selection). The round
 * list then carries the file; a reviewer still needs a grant (their Add
 * Reviewer or Edit window) before it shows on their wizard (patterns.md
 * "Review files are grant-based").
 */
async function uploadRoundReviewFile(page, modal, fileName) {
    await modal.getByRole('button', {name: 'Upload/Select Files'}).click();
    const selectWindow = topModal(page);
    await expect(
        selectWindow.getByRole('link', {name: 'Upload Review File'})
    ).toBeVisible({timeout: 20_000});
    await selectWindow.getByRole('link', {name: 'Upload Review File'}).click();
    // The wizard's first select is the (disabled) "revise a file" chooser;
    // the component select is the genre one.
    const wizard = topModal(page);
    const genre = wizard.locator('select[id^="genreId"]');
    await expect(genre).toBeVisible({timeout: 20_000});
    await genre.selectOption({label: 'Book Manuscript'});
    await page.locator('input[type="file"]').last().setInputFiles({
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from(`Review file ${fileName}`),
    });
    await expect(wizard.getByRole('button', {name: /Change File/})).toBeVisible({timeout: 20_000});
    await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(wizard.getByRole('tab', {name: '2. Review Details'})).toHaveAttribute('aria-selected', 'true', {timeout: 20_000});
    await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(wizard.getByRole('tab', {name: '3. Confirm'})).toHaveAttribute('aria-selected', 'true', {timeout: 20_000});
    await wizard.getByRole('button', {name: 'Complete', exact: true}).click();
    await expect(wizard.getByRole('tab', {name: '3. Confirm'})).toBeHidden({timeout: 20_000});
    const box = selectWindow
        .getByRole('row')
        .filter({hasText: fileName})
        .locator('input[type="checkbox"]')
        .first();
    await expect(box).toBeVisible({timeout: 20_000});
    await box.check();
    await selectWindow.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(
        modal.getByRole('row').filter({hasText: fileName}).first()
    ).toBeVisible({timeout: 20_000});
}

/**
 * Complete the same three-step upload wizard when it opens as a standalone
 * dialog over the dashboard list (the author's "Submit revisions" action,
 * U22). There it has no [data-cy="active-modal"] wrapper and no header text
 * of its own (spec U22 fn-g), so the dialog is anchored by its step tabs.
 */
async function completeStandaloneUploadWizard(page, fileName) {
    const wizard = page
        .getByRole('dialog')
        .filter({has: page.getByRole('tab', {name: '1. Upload File'})});
    await expect(wizard.getByRole('tab', {name: '1. Upload File'})).toBeVisible({
        timeout: 20_000,
    });
    // The wizard's first select can be the (disabled) "revise a file"
    // chooser; the component select is the genre one.
    const genre = wizard.locator('select[id^="genreId"]');
    await expect(genre).toBeVisible({timeout: 20_000});
    await genre.selectOption({label: 'Book Manuscript'});
    await page.locator('input[type="file"]').last().setInputFiles({
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from(`Revised file ${fileName}`),
    });
    await expect(wizard.getByRole('button', {name: /Change File/})).toBeVisible({
        timeout: 20_000,
    });
    await wizard.getByRole('button', {name: 'Continue'}).click();
    // Step 2 — Review Details (file name arrives prefilled).
    await expect(wizard.getByText('Name the file')).toBeVisible({timeout: 10_000});
    await wizard.getByRole('button', {name: 'Continue'}).click();
    // Step 3 — Confirm.
    await expect(wizard.getByText('File Added')).toBeVisible({timeout: 10_000});
    await wizard.getByRole('button', {name: 'Complete'}).click();
    await expect(page.getByText('File Added')).toBeHidden({timeout: 10_000});
}

/**
 * Assign a stage participant through the Participants panel's legacy
 * Assign dialog. `group` is the visible user-group option label. `template`
 * is an exact entry of "Choose a predefined message" ("Request Copyedit" on
 * the Copyediting stage, U32); choosing one fetches the template's body
 * into the message box, so the save waits for the editor to hold it (an
 * empty box after a fetch posts no message). Without it the box is left
 * as it arrives, empty.
 */
async function assignParticipant(
    page,
    modal,
    {group, query, resultName, recommendOnly = false, template = null}
) {
    await modal
        .locator('[data-cy="participant-manager"]')
        .getByRole('button', {name: 'Assign'})
        .click();
    const dlg = topModal(page);
    await expect(dlg.getByRole('heading', {name: 'Locate a User'})).toBeVisible({
        timeout: 20_000,
    });
    await dlg.getByRole('combobox').first().selectOption({label: group});
    await dlg.getByRole('textbox', {name: 'Search User By Name'}).fill(query);
    await dlg.getByRole('button', {name: 'Search', exact: true}).click();
    await expect(dlg.getByText(resultName)).toBeVisible({timeout: 20_000});
    await dlg.getByRole('radio').first().check();
    if (recommendOnly) {
        await dlg.locator('#recommendOnly').check();
    }
    if (template) {
        await dlg.locator('select[name="template"]').selectOption({label: template});
        const messageId = await dlg.locator('textarea[name="message"]').getAttribute('id');
        await expect
            .poll(
                () =>
                    page.evaluate(
                        (id) => (window.tinymce?.get(id)?.getContent() || '').length,
                        messageId
                    ),
                {timeout: 20_000}
            )
            .toBeGreaterThan(20);
    }
    await dlg.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(
        modal.locator('[data-cy="participant-manager"]').getByText(resultName)
    ).toBeVisible({timeout: 20_000});
}

/**
 * Open the signed-in user's Tasks panel (header button) and wait for its
 * list to answer — the bound for presence and absence reads alike.
 */
async function openTasksPanel(page) {
    await page.getByRole('button', {name: /^Tasks/}).first().click();
    const panel = topModal(page);
    // The task grid arrives server-rendered with its rows (or a visible
    // "No Items" row when empty) — the table itself bounds the read.
    await expect(panel.getByRole('table').first()).toBeVisible({
        timeout: 20_000,
    });
    return panel;
}

/**
 * Close the top side window (the Tasks panel, a window over the workflow)
 * through its own header "Close", never Escape (patterns.md pitfall 7;
 * .reports/flake-s26/esc/diagnosis.md H4), and wait until it is gone: one
 * side-window header fewer than before.
 */
async function closeTopModal(page) {
    const headers = page.locator('[data-cy="sidemodal-header"]');
    const open = await headers.count();
    await topModal(page).getByRole('button', {name: 'Close', exact: true}).first().click();
    await expect(headers).toHaveCount(open - 1, {timeout: 20_000});
}

/**
 * Open the "Files for Review" panel's selection window ("Current Review
 * Files For Round N": the submission's workflow files with checkboxes, an
 * "Upload Review File" link, "OK" to confirm). Resolves the window.
 */
async function openReviewFilesDialog(page, modal) {
    await modal.getByRole('button', {name: 'Upload/Select Files'}).click();
    const dialog = topModal(page);
    await expect(
        dialog.getByRole('link', {name: 'Upload Review File'})
    ).toBeVisible({timeout: 20_000});
    return dialog;
}

/**
 * The review-files window opens listing the review stage's own files only;
 * its "Show files from all accessible workflow stages." box reloads the
 * list with the submission's other workflow files (the Submission stage's
 * among them). Ticks it and waits for `fileName`'s row (seen 2026-09-12,
 * tomp: a submission file not yet under review is absent until then).
 */
async function showAllStageFiles(dialog, fileName) {
    await dialog
        .getByRole('checkbox', {name: 'Show files from all accessible workflow stages.'})
        .check();
    await expect(reviewFileCheckbox(dialog, fileName)).toBeVisible({timeout: 20_000});
}

/** The checkbox of one file's row in the review-files window. */
function reviewFileCheckbox(dialog, fileName) {
    return dialog
        .getByRole('row')
        .filter({hasText: fileName})
        .locator('input[type="checkbox"]')
        .first();
}

/**
 * Confirm the review-files window with "OK", bounded by its save
 * (`…/manage-review-files-grid/update-review-files` answering OK); then wait
 * until the round's "Files for Review" list carries every name in
 * `expectedFiles`. The "Review files updated." notice is the caller's read:
 * it is a trivial notification the server keeps for the account until a
 * page of it fetches it (patterns.md parallel lesson 2), so only a caller
 * signed in as an account no other test uses can rely on it.
 */
async function confirmReviewFilesDialog(page, modal, dialog, expectedFiles) {
    const saved = page.waitForResponse(
        (r) => /\/update-review-files\b/.test(r.url()) && r.request().method() === 'POST',
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    const response = await saved;
    expect(response.ok(), `review files save answered ${response.status()}`).toBe(true);
    for (const fileName of expectedFiles) {
        await expect(
            primaryRegion(modal).getByRole('row').filter({hasText: fileName}).first()
        ).toBeVisible({timeout: 20_000});
    }
}

/**
 * Upload a new file from inside the review-files window ("Upload Review
 * File" opens the legacy three-step wizard over it). Returns once the
 * wizard is gone and the new file's row is in the window; its box is left
 * as it arrives (the test reads it).
 */
async function uploadReviewFileInDialog(page, dialog, fileName) {
    await dialog.getByRole('link', {name: 'Upload Review File'}).click();
    const wizard = topModal(page);
    const genre = wizard.locator('select[id^="genreId"]');
    await expect(genre).toBeVisible({timeout: 20_000});
    await genre.selectOption({label: 'Book Manuscript'});
    await page.locator('input[type="file"]').last().setInputFiles({
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from(`Review file ${fileName}`),
    });
    await expect(wizard.getByRole('button', {name: /Change File/})).toBeVisible({timeout: 20_000});
    await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(wizard.getByRole('tab', {name: '2. Review Details'})).toHaveAttribute('aria-selected', 'true', {timeout: 20_000});
    await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(wizard.getByRole('tab', {name: '3. Confirm'})).toHaveAttribute('aria-selected', 'true', {timeout: 20_000});
    await wizard.getByRole('button', {name: 'Complete', exact: true}).click();
    await expect(wizard.getByRole('tab', {name: '3. Confirm'})).toBeHidden({timeout: 20_000});
    await expect(reviewFileCheckbox(dialog, fileName)).toBeVisible({timeout: 20_000});
}

/**
 * The first step only of the legacy upload wizard an Upload control has
 * just opened: pick the component and transfer the file (the "Change File"
 * button is the transfer's own signal). Returns the wizard, still open on
 * step 1.
 */
async function startUploadWizard(page, fileName) {
    const wizard = topModal(page);
    await expect(wizard.getByText(/^Upload .* File$/).first()).toBeVisible({
        timeout: 20_000,
    });
    const genre = wizard.locator('select[id^="genreId"]');
    await expect(genre).toBeVisible({timeout: 20_000});
    await genre.selectOption({label: 'Book Manuscript'});
    await page.locator('input[type="file"]').last().setInputFiles({
        name: fileName,
        mimeType: 'text/plain',
        buffer: Buffer.from(`Revised file ${fileName}`),
    });
    await expect(wizard.getByRole('button', {name: /Change File/})).toBeVisible({
        timeout: 20_000,
    });
    return wizard;
}

/**
 * Close the upload wizard's window without finishing it, through the
 * window's own "Close" control (not the wizard's "Cancel" link, which
 * posts a cancel that discards the transferred file). The page asks "The
 * data on this form has changed. Do you wish to continue without saving?"
 * in a browser confirm, which is accepted (Playwright dismisses it
 * otherwise and the window stays). Live-driven 2026-09-12 (tomp).
 */
async function closeUploadWizard(page, wizard) {
    page.once('dialog', (dialog) => dialog.accept());
    await wizard.getByRole('button', {name: 'Close', exact: true}).click();
    await expect(wizard.locator('select[id^="genreId"]')).toBeHidden({timeout: 20_000});
}

/** The stage's Participants panel (the Vue participant manager). */
function participantPanel(modal) {
    return modal.locator('[data-cy="participant-manager"]');
}

/**
 * Select a review round in the workflow side menu ("Review Round {n}") and
 * wait for the stage heading to name it.
 */
async function selectRound(modal, round, stage = 'External Review') {
    await modal.getByText(`Review Round ${round}`, {exact: true}).first().click();
    await expect(
        modal.getByRole('heading', {name: `Workflow: ${stage} (Round ${round})`})
    ).toBeVisible({timeout: 20_000});
}

/**
 * Record "Create New Review Round" from the current round: the full-page
 * wizard (heading "New Review Round…") walked to its completion panel.
 */
async function createNewReviewRound(page, modal) {
    await decisionButton(modal, DECISIONS.newRound).click();
    await expect(
        page.getByRole('heading', {level: 1, name: /New Review Round/})
    ).toBeVisible({timeout: 15_000});
    await walkDecisionWizard(page);
}

/**
 * The coloured stage label under the submission's title in the workflow
 * header ("Submission", "Declined", "Copyediting", …; U25 Rules 4, 8).
 */
function stageLabel(modal) {
    return modal.locator('[data-cy="sidemodal-header"] span[class*="bg-stage-"] + span');
}

async function expectStageLabel(modal, label) {
    await expect(stageLabel(modal)).toHaveText(label, {timeout: 20_000});
}

/**
 * Any status box in the stage's panel column (a bordered box headed by an
 * h3: "Status" or "Round N Status"); the plain panels are tables, not
 * bordered boxes (`WorkflowSubmissionStatus.vue`).
 */
function anyStatusBox(modal) {
    return primaryRegion(modal).locator('div.border').filter({has: modal.page().locator('h3')});
}

/**
 * The stage's panel column shows no status box at all (U25 Rule 8), the
 * "Submission Files" heading being the settled positive read of the same
 * column.
 */
async function expectNoStatusBox(modal) {
    await expect(
        primaryRegion(modal).getByRole('heading', {name: 'Submission Files'})
    ).toBeVisible({timeout: 20_000});
    await expect(anyStatusBox(modal)).toHaveCount(0);
}

/**
 * The plain "Status" box sits at the top of the panel column, above the
 * "Submission Files" panel, and reads `sentence` (U25 Rules 8–9): an
 * ordered read of the column's headings, then the box's text.
 */
async function expectStatusBoxAboveFiles(modal, sentence) {
    await expect(
        primaryRegion(modal).getByRole('heading', {name: /^(Status|Submission Files)$/})
    ).toHaveText(['Status', 'Submission Files'], {timeout: 20_000});
    await expectPlainStatus(modal, sentence);
}

/**
 * The panel headings of the Submission stage's main column, in order
 * (U25 Rule 1): "Submission Files" then "Desk Review Tasks & Discussions".
 */
const SUBMISSION_PRIMARY_PANELS = ['Submission Files', 'Desk Review Tasks & Discussions'];

async function expectSubmissionPanels(modal) {
    await expect(
        primaryRegion(modal).getByRole('heading', {
            name: /^(Submission Files|Desk Review Tasks & Discussions)$/,
        })
    ).toHaveText(SUBMISSION_PRIMARY_PANELS, {timeout: 20_000});
    await expect(
        secondaryRegion(modal).getByRole('heading', {name: 'Participants', exact: true})
    ).toBeVisible();
}

/**
 * The workflow menu's entries listed under a stage entry ("Review Round 1"
 * under "External Review"), in order: the PanelMenu indentation classes
 * give the level (2 = stage, 3 = round), as the shared WorkflowPage reads
 * them.
 */
async function menuEntriesUnder(modal, stageLabelText) {
    const entries = await modal
        .getByRole('navigation')
        .getByRole('link')
        .evaluateAll((anchors) =>
            anchors.map((a) => {
                const cls = a.className;
                let level = 1;
                if (/!px-(7|9)\b/.test(cls)) level = 2;
                if (/!px-(10|12)\b/.test(cls)) level = 3;
                if (/!px-(14|16)\b/.test(cls)) level = 4;
                return {label: (a.textContent || '').trim(), level};
            })
        );
    const start = entries.findIndex((e) => e.level === 2 && e.label === stageLabelText);
    if (start < 0) return [];
    const out = [];
    for (const e of entries.slice(start + 1)) {
        if (e.level <= 2) break;
        out.push(e.label);
    }
    return out;
}

/** The right-hand column's panel headings, in order ("Participants", then "Reviewers Suggested by Author" when shown). */
function secondaryHeadings(modal) {
    return secondaryRegion(modal).getByRole('heading', {
        name: /^(Participants|Reviewers Suggested by Author)$/,
    });
}

/**
 * The "Reviewers Suggested by Author" panel's heading in the right-hand
 * column, and a suggested reviewer's row (the list right after the
 * heading) by the person's full name (U25 Rule 1; the panel's mechanics
 * are the shared ReviewerSuggestionPages').
 */
function suggestedReviewersHeading(modal) {
    return secondaryRegion(modal).getByRole('heading', {
        name: 'Reviewers Suggested by Author',
        exact: true,
    });
}

function suggestedReviewerRow(modal, name) {
    return suggestedReviewersHeading(modal)
        .locator('xpath=following::ul[1]')
        .locator('li')
        .filter({hasText: name});
}

/** The pre-3.5 author-dashboard address (Rule 17): redirects to My Submissions. */
function oldAuthorDashboardUrl(contextPath, submissionId) {
    return `/index.php/${contextPath}/authorDashboard/submission/${submissionId}`;
}

/** The pre-3.5 per-round address (Rule 17): answers a bare 404 page. */
function oldReviewRoundInfoUrl(contextPath, submissionId = null) {
    return `/index.php/${contextPath}/authorDashboard/reviewRoundInfo` +
        (submissionId === null ? '' : `/${submissionId}`);
}

// ---------------------------------------------------------------------
// Around the decision wizard (U34, 2026-09-20; spec
// docs/specs/U34-editorial-decision-recording.md Rules 13–15): what a
// decision scenario reads and builds on a press's workflow before and
// after the wizard. The wizard itself is `DecisionWizardPages.js`.
// ---------------------------------------------------------------------

/** The heading of a press's review round ("External Review (Round 1)", "Internal Review (Round 1)"). */
function roundTitle(round = 1, stage = 'External Review') {
    return `${stage} (Round ${round})`;
}

/**
 * A press's workflow as a decision scenario uses it: the shared frame
 * (`shared/playwright/pages/WorkflowPage.js`, held as `frame`: the header,
 * the side menu, the action region, the Activity Log, the access-denied
 * page) plus the round's decision buttons, the "Request Revisions" choice
 * window (Rule 14; an external round only), the minimum-reviews dialog
 * (Rule 15), the Reviewers panel's "Read Review" › "Mark as Complete", the
 * "Recommendation" box and "Change decision" (Rule 13), the Participants
 * row's recommend-only flag, the discussions rows and a discussion's
 * window, the author's "Notifications" list and "Read Review" window, the
 * header's "Library" › "Add a file", and the "Submission Files" and
 * "Revisions Uploaded" uploads (footnote s1's givens built on screen).
 */
class DecisionWorkflow {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{appContext?: any}} [options]
     */
    constructor(page, contextPath, {appContext} = {}) {
        this.page = page;
        this.contextPath = contextPath;
        this.frame = new WorkflowFrame(page, contextPath, {appContext});
    }

    /** Open a monograph's workflow on the editorial dashboard. */
    async gotoEditorial(submissionId) {
        await this.frame.gotoEditorial(submissionId);
    }

    /** Open the author's view of the same workflow (My Submissions). */
    async gotoAuthor(submissionId) {
        await this.frame.gotoAuthor(submissionId);
    }

    /** The workflow panel is mounted. */
    async expectOpen() {
        await this.frame.expectOpen();
    }

    /** The main column's heading, e.g. expectPageTitle('External Review (Round 1)'). */
    async expectPageTitle(title) {
        await expect(this.frame.dialog().getByRole('heading', {name: `Workflow: ${title}`, exact: true})).toBeVisible({
            timeout: 30_000,
        });
    }

    /**
     * A panel's wrapper (heading, controls and table), found through the
     * table's accessible name; `.last()` is the innermost wrapping div, so
     * a button found inside is that panel's own.
     */
    panel(title) {
        return this.frame
            .dialog()
            .locator('div')
            .filter({has: this.page.getByRole('table', {name: title, exact: true})})
            .last();
    }

    /** A row of the named panel carrying `text`. */
    panelRow(title, text) {
        return this.panel(title).getByRole('row').filter({hasText: text});
    }

    /** A Reviewers panel row by the reviewer's name. */
    reviewerRow(name) {
        return this.frame.dialog().locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name});
    }

    /** A Participants row by the person's display name. */
    participantRow(name) {
        return this.frame.secondaryColumn().getByRole('listitem').filter({hasText: name});
    }

    /** The lines of a status box ("Round 1 Status"), one `p` each. */
    statusLines(heading) {
        return this.frame.statusBox(heading).locator('p');
    }

    /** The action region's buttons are exactly these, left to right (auto-waited). */
    async expectDecisionButtons(labels) {
        await expect.poll(() => this.frame.actionButtonLabels(), {timeout: 30_000}).toEqual(labels);
    }

    /** The "Request Revisions" side window (Rule 14), a dialog named by its title. */
    requestRevisionsWindow() {
        return this.page.getByRole('dialog', {name: 'Request Revisions', exact: true});
    }

    /**
     * Press "Request Revisions" (or "Recommend Revisions") on an external
     * round and wait for the window with its "Require New Review Round"
     * choice; returned open.
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

    /**
     * The editor's "Read Review" › "Mark as Complete" on a reviewer's row
     * (`confirmReviewAsEditor`); the row then reads "Complete".
     */
    async confirmReview(reviewerName) {
        await confirmReviewAsEditor(this.page, this.frame.dialog(), reviewerName);
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

    /**
     * Participants row › "More Actions" › "Edit" › tick "Assignment
     * privileges" (the recommend-only flag) › "OK": the assignment becomes
     * a recommending one (no seed key; scenarios.md "Decision behaviour
     * worth knowing").
     */
    async setRecommendOnly(name) {
        await this.participantRow(name).getByRole('button', {name: /More Actions/}).click();
        await this.page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const form = this.page.getByRole('dialog').filter({has: this.page.locator('input[name="recommendOnly"]')});
        const box = form.locator('input[name="recommendOnly"]');
        await expect(box).toBeVisible({timeout: 30_000});
        await box.check();
        await form.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(form).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    /** The rows of "Review Tasks & Discussions" carrying `text`. */
    discussionRow(text) {
        return this.panel('Review Tasks & Discussions').getByRole('row').filter({hasText: text});
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

    /**
     * The header's "Library" › "Add a file": name, the first real type, the
     * file, "OK"; the row then lists in the window, which is closed
     * (footnote s1's given). Returns the chosen type's label.
     */
    async addLibraryFile({name, file}) {
        await this.frame.headerButton('Library').click();
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
        const options = await type
            .locator('option')
            .evaluateAll((els) => els.map((o) => ({value: /** @type {HTMLOptionElement} */ (o).value, label: (o.textContent || '').trim()})));
        const chosen = options.find((o) => o.value && o.value !== '') || options[0];
        await type.selectOption(chosen.value);
        await form.locator('input[type="file"]').setInputFiles(file);
        await expect(form.locator('input[name="temporaryFileId"]')).not.toHaveValue('', {timeout: 30_000});
        await form.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(form.locator('input[name^="libraryFileName"]')).toHaveCount(0, {timeout: 30_000});
        await waitForJQueryIdle(this.page);
        await expect(win.getByRole('row').filter({hasText: name})).toBeVisible({timeout: 30_000});
        await win.getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(win).toBeHidden({timeout: 30_000});
        await waitForJQueryIdle(this.page);
        return chosen.label;
    }

    /** A panel's "Upload": one in-memory file through the press's upload wizard ("Book Manuscript"). */
    async uploadIntoPanel(panelTitle, fileName) {
        await this.panel(panelTitle).getByRole('button', {name: 'Upload', exact: true}).click();
        await completeUploadWizard(this.page, fileName);
        await expect(this.panelRow(panelTitle, fileName)).toBeVisible({timeout: 30_000});
    }

    /** The Submission stage's "Submission Files" › "Upload". */
    async uploadSubmissionFile(fileName) {
        await this.uploadIntoPanel('Submission Files', fileName);
    }

    /** The round's "Revisions Uploaded" › "Upload" (the editorial path). */
    async uploadRevision(fileName) {
        await this.uploadIntoPanel('Revisions Uploaded', fileName);
    }
}

module.exports = {
    STATUS,
    DECISIONS,
    editorialUrl,
    authorUrl,
    workflowModal,
    topModal,
    primaryRegion,
    actionsRegion,
    secondaryRegion,
    decisionButton,
    openEditorial,
    openAuthorView,
    minimumLine,
    expectRoundStatus,
    roundStatusBox,
    roundStatusLines,
    expectRoundStatusOpensWith,
    expectPlainStatus,
    awaitComposerReady,
    walkDecisionWizard,
    requestRevisions,
    completeReviewAsReviewer,
    confirmReviewAsEditor,
    completeUploadWizard,
    uploadRoundReviewFile,
    completeStandaloneUploadWizard,
    assignParticipant,
    openTasksPanel,
    closeTopModal,
    openReviewFilesDialog,
    showAllStageFiles,
    reviewFileCheckbox,
    confirmReviewFilesDialog,
    uploadReviewFileInDialog,
    startUploadWizard,
    closeUploadWizard,
    participantPanel,
    selectRound,
    createNewReviewRound,
    oldAuthorDashboardUrl,
    oldReviewRoundInfoUrl,
    stageLabel,
    expectStageLabel,
    anyStatusBox,
    expectNoStatusBox,
    expectStatusBoxAboveFiles,
    SUBMISSION_PRIMARY_PANELS,
    expectSubmissionPanels,
    menuEntriesUnder,
    secondaryHeadings,
    suggestedReviewersHeading,
    suggestedReviewerRow,
    roundTitle,
    DecisionWorkflow,
};
