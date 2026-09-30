// @ts-check
/**
 * @file playwright/pages/ReviewerAssignmentPages.js
 *
 * App-local helpers for the OMP Reviewer assignment & management suite (U27).
 * The Reviewers panel is the Vue ReviewerManager ([data-cy="reviewer-manager"])
 * inside the workflow side modal; every window it opens is a legacy jQuery
 * modal stacked above it (topModal), except Log Response and — since the
 * pkp/pkp-lib#13156 rework — the "Review Details" / "Modify Review" pair,
 * which are Vue side modals anchored by their dialog role and title (their
 * [data-cy="active-modal"] wrapper computes visibility:hidden, so topModal's
 * visibility assertions would never pass against them).
 *
 * Date entry is CALENDAR PICKS ONLY by design of these tests: the pickers
 * discard typed dates (register finding A16), so pickDate() drives the
 * jQuery UI datepicker the way a user does and verifies the hidden altField
 * received the ISO date.
 */
const {expect} = require('../support/fixtures.js');
const {topModal} = require('./ReviewStagePages.js');
const {waitForJQueryIdle, waitForLegacyFormSettled} = require('../../../../shared/playwright/support/legacy.js');
const {waitForEditorReady, editorIdOf} = require('../../../../shared/playwright/support/richtext.js');

/** The Reviewers panel of a workflow modal. */
function reviewerPanel(modal) {
    return modal.locator('[data-cy="reviewer-manager"]');
}

/** A reviewer row identified by the reviewer's display name. */
function reviewerRow(modal, name) {
    return reviewerPanel(modal).getByRole('row').filter({hasText: name});
}

/** Open a row's "More Actions" menu (portals to the document root). */
async function openRowMenu(page, row) {
    await row.getByRole('button', {name: 'More Actions'}).click();
    return page.getByRole('menu').last();
}

/**
 * Open the Add Reviewer window from the Reviewers panel. The opening list
 * arrives server-preloaded (no XHR — only searches fetch), so readiness is
 * the "Locate a Reviewer" panel with its search box.
 */
async function openAddReviewer(page, modal) {
    await reviewerPanel(modal)
        .getByRole('button', {name: 'Add Reviewer', exact: true})
        .click();
    const addModal = topModal(page);
    await expect(
        addModal.getByRole('heading', {name: 'Locate a Reviewer'})
    ).toBeVisible({timeout: 20_000});
    await expect(addModal.getByRole('searchbox').first()).toBeVisible();
    return addModal;
}

/**
 * Run a name search in the Add Reviewer list. The Search component commits
 * on Enter only; the list's own filtered response bounds presence AND
 * absence assertions after this call (PRINCIPLES M4).
 */
async function searchReviewerList(page, addModal, phrase) {
    const box = addModal.getByRole('searchbox').first();
    const settled = page.waitForResponse(
        (r) =>
            r.url().includes('users/reviewers') &&
            decodeURIComponent(r.url()).includes(`searchPhrase=${phrase}`)
    );
    await box.fill(phrase);
    await box.press('Enter');
    await settled;
}

/** A reviewer entry in the Add Reviewer list, by display name. */
function reviewerListEntry(addModal, name) {
    return addModal.locator('.listPanel__item').filter({hasText: name});
}

/**
 * The entry's select control. Its accessible name is "Select {full name}"
 * (aria-label overrides the visible "Select Reviewer" text).
 */
function selectButton(entry) {
    return entry.getByRole('button', {name: /^Select /});
}

/**
 * Select a reviewer from the (already searched) list and wait for the
 * request form below — its prefilled letter included — to be ready to
 * submit (an AJAX-loading TinyMCE letter fails server-side if submitted
 * too early: locator pitfall "AJAX-loaded email templates").
 */
async function selectReviewerAndAwaitForm(page, addModal, name) {
    await awaitLetterEditorReady(page);
    await selectButton(reviewerListEntry(addModal, name)).click();
    await awaitRequestFormReady(page, addModal);
}

/**
 * Wait for the Add Reviewer window's request-letter editor (TinyMCE on the
 * hidden `personalMessage` textarea) to be initialized. The selection
 * handler prefills the letter through the editor's API, so a Select or
 * Reassign clicked earlier silently loses the prefill (patterns.md
 * "Reviewer-select copies the email template into TinyMCE client-side");
 * a search's own round trip used to mask the race, an unsearched pick
 * (a later round's "Reassign") does not.
 */
async function awaitLetterEditorReady(page) {
    await page.waitForFunction(() => {
        const textarea = document.querySelector(
            '#reviewerFormFooter textarea[name="personalMessage"]'
        );
        // eslint-disable-next-line no-undef
        const mce = window.tinyMCE || window.tinymce;
        return !!(textarea && mce?.get(textarea.id)?.initialized);
    }, undefined, {timeout: 30_000});
}

/** Wait for the shared request form (letter + date pickers) to be live. */
async function awaitRequestFormReady(page, addModal) {
    await expect(
        addModal.getByRole('button', {name: 'Add Reviewer', exact: true})
    ).toBeVisible({timeout: 20_000});
    // The letter is AJAX-fetched into TinyMCE; wait for a non-empty body
    // (30 s, as the OJS helper does: under full-suite load the fetch can
    // take longer than 20 s).
    const letter = page
        .frameLocator('iframe[id^="personalMessage"]')
        .last()
        .locator('body');
    await expect(letter).toContainText(/\w/, {timeout: 30_000});
    // The FormHandler renamed the visible date inputs (init complete).
    await expect(
        addModal.locator('input[name="responseDueDate-removed"]')
    ).toBeAttached({timeout: 10_000});
    // The footer's "Files To Be Reviewed" grid and its warning move the
    // form's buttons until they have landed (a press between is lost).
    await waitForLegacyFormSettled(page, addModal);
}

/**
 * Add a reviewer to the open round through the "Add Reviewer" window:
 * search the list by name, select the entry, wait for the request letter to
 * settle (app-changes row 4: OMP answers 500 when the letter editor has not
 * initialised), press the footer's "Add Reviewer" and wait for the row. The
 * window's "Files To Be Reviewed" boxes arrive ticked, so every file already
 * in the round's "Files for Review" list is granted to the reviewer.
 */
async function addReviewerFromList(page, modal, {search, name}) {
    const addModal = await openAddReviewer(page, modal);
    await searchReviewerList(page, addModal, search);
    await selectReviewerAndAwaitForm(page, addModal, name);
    await addModal.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    const row = reviewerRow(modal, name);
    await expect(row).toBeVisible({timeout: 20_000});
    await expect(row).toContainText('Request Sent');
    return row;
}

/**
 * Open the reviewer row's "Edit" window (More Actions › Edit,
 * form#editReviewForm) and return it, settled on its "Review Type" group.
 */
async function openEditReview(page, row) {
    const menu = await openRowMenu(page, row);
    await menu.getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const editModal = topModal(page);
    await expect(editModal.getByText('Review Type')).toBeVisible({timeout: 20_000});
    // Its "Files To Be Reviewed" grid lands above "OK" after the form.
    await waitForLegacyFormSettled(page, editModal);
    return editModal;
}

/**
 * Grant one of the round's review files to a reviewer: the Edit window's
 * "Files To Be Reviewed" box for `fileName` is ticked (a file added after
 * the assignment arrives unticked) and "OK" saves. The window closes on
 * success; the reviewer's wizard then lists the file.
 */
async function grantFileToReviewer(page, row, fileName) {
    const editModal = await openEditReview(page, row);
    await expect(editReviewFileBox(editModal, fileName)).toBeVisible({timeout: 20_000});
    await setEditReviewFile(editModal, fileName, true);
    await editModal.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(editModal.getByText('Review Type')).toBeHidden({timeout: 20_000});
}

/**
 * The "Files To Be Reviewed" checkbox of one file in an Edit window.
 *
 * @param {import('@playwright/test').Locator} editModal from openEditReview
 * @param {string} fileName the listed file name
 */
function editReviewFileBox(editModal, fileName) {
    return editModal
        .getByRole('row')
        .filter({hasText: fileName})
        .locator('input[type="checkbox"]')
        .first();
}

/**
 * Tick or untick one file in an Edit window's "Files To Be Reviewed" grid,
 * and return once the window has stopped moving. Every change slides the
 * "No Files Selected" warning, which sits above the grid, in or out over
 * 250 ms (a jQuery animation the harness does not stop), and the grid
 * itself lands after the form: a press while a box is still to move, or
 * moving, loses its button-up and the box keeps its state ("Clicking the
 * checkbox did not change its state", the box left focused; U27 S6, U28 S4,
 * `.reports/flake-0930/u27s6/diagnosis.md`). So the press waits for the
 * window to settle, and so does the next read or press after it.
 *
 * @param {import('@playwright/test').Locator} editModal from openEditReview
 * @param {string} fileName the listed file name
 * @param {boolean} checked the state wanted
 */
async function setEditReviewFile(editModal, fileName, checked) {
    const page = editModal.page();
    await waitForLegacyFormSettled(page, editModal);
    await editReviewFileBox(editModal, fileName).setChecked(checked);
    await waitForLegacyFormSettled(page, editModal);
}

/** Local-time ISO date (yyyy-mm-dd) — toISOString() would shift timezones. */
function isoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Today plus n days, local time. */
function daysFromNow(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
}

/**
 * Calendar-pick a date into an fbv datepicker field (scope = the legacy
 * form/modal containing it). Verifies the hidden altField holds the ISO
 * date afterwards — the value the form will actually submit.
 */
async function pickDate(page, scope, fieldName, date) {
    const input = scope.locator(`input[name="${fieldName}-removed"]`).first();
    await input.click();
    const dp = page.locator('#ui-datepicker-div');
    await expect(dp).toBeVisible({timeout: 10_000});
    await dp
        .locator('select.ui-datepicker-year')
        .selectOption(String(date.getFullYear()));
    await dp
        .locator('select.ui-datepicker-month')
        .selectOption(String(date.getMonth()));
    // Bounded: a calendar the window's overlay covers never takes the
    // click, and the default wait would eat the whole test timeout.
    await dp
        .getByRole('link', {name: String(date.getDate()), exact: true})
        .first()
        .click({timeout: 20_000});
    await expect(
        scope.locator(`input[type="hidden"][name="${fieldName}"]`).first()
    ).toHaveValue(isoDate(date));
}

/** The hidden (submitted) value of a datepicker field. */
function dateAltField(scope, fieldName) {
    return scope.locator(`input[type="hidden"][name="${fieldName}"]`).first();
}

/**
 * Complete a review as the signed-in reviewer, filling the shared
 * ("For author and editor") comment and, optionally, the editor-only one.
 * Adapted from the U26 helper; the extra field is this feature's Rule 14.
 */
async function completeReview(
    page,
    contextPath,
    submissionId,
    {comment, privateComment = null}
) {
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
        const consent = page.locator(
            'input[type="checkbox"][name="privacyConsent"]'
        );
        if (await consent.count()) {
            await consent.check();
        }
        await acceptButton.click();
    } else {
        await saveContinue.click();
    }
    await page.getByRole('button', {name: 'Continue to Step #3'}).click();
    const fillRichText = async (frameSelector, text) => {
        const iframe = page.locator(frameSelector).first();
        const body = iframe.contentFrame().locator('body');
        await expect(body).toBeVisible({timeout: 20_000});
        // The box is editable before its editor has fetched its content
        // style sheets, whose arrival loads the empty start value over
        // what was typed: the read-back passes, the review is submitted
        // without the comment, and "Review Details" shows "-" (patterns.md
        // "UI realities", the TinyMCE entry; ci-triage "OMP U27 S9 and
        // S16"). So type only once the editor reports `initialized`.
        await waitForEditorReady(page, await editorIdOf(iframe));
        // Click in and blur after so TinyMCE syncs its backing textarea.
        await body.click();
        await body.fill(text);
        await expect(body).toContainText(text);
    };
    await fillRichText('iframe[id^="comments-"]', comment);
    if (privateComment) {
        await fillRichText('iframe[id^="commentsPrivate-"]', privateComment);
    }
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
 * Wait for a legacy modal's TinyMCE message body to be non-empty before
 * submitting (locator pitfall "AJAX-loaded email templates"). idPrefix is
 * 'personalMessage' (add/unassign/reinstate/resend) or 'message'
 * (thank/reminder/email).
 */
async function awaitTinyMce(page, idPrefix) {
    const body = page
        .frameLocator(`iframe[id^="${idPrefix}"]`)
        .last()
        .locator('body');
    await expect(body).toContainText(/\w/, {timeout: 20_000});
}

/**
 * The Vue "Review Details" side window (Rule 14a). Anchored by its dialog
 * title — never by [data-cy="active-modal"] (the wrapper computes
 * visibility:hidden for this window).
 */
function reviewDetailsModal(page) {
    return page.getByRole('dialog', {name: /^Review Details:/});
}

/**
 * Open the row's Read Review window (the Vue "Review Details" side modal)
 * and wait for it to settle: the footer's "Modify Review" button sits
 * disabled until the assignment and review content finish loading — its
 * enabled state is the load-settled signal. A rating star clicked before
 * then can silently revert (register finding A21, never asserted), so every
 * caller rates only after this resolves. NOTE: the workflow modal's DOM is
 * unmounted while this window (or its stacked "Modify Review" partner) is
 * open — reviewer ROWS can only be asserted after the window closes.
 */
async function openReadReview(page, modal, reviewerName) {
    // "Modify Review" is enabled exactly when the window's two GETs
    // (`reviewAssignments/{id}` and `…/{id}/review`) have both settled
    // (ui-library ReviewDetailsModal.vue, `isLoadingReview`). A red here
    // has never been reproduced (ci-triage "OMP U27 S9 and S16"), so the
    // helper records those loads and a failed wait names them: pending,
    // answered with a status, or failed.
    const loads = new Map();
    const isLoad = (request) =>
        request.method() === 'GET' &&
        /\/reviewAssignments\/\d+(\/review)?(\?|$)/.test(request.url());
    const onRequest = (request) => {
        if (isLoad(request)) loads.set(request, 'pending');
    };
    const onFinished = async (request) => {
        if (!isLoad(request)) return;
        const response = await request.response().catch(() => null);
        loads.set(request, response ? String(response.status()) : 'no response');
    };
    const onFailed = (request) => {
        if (isLoad(request)) loads.set(request, `failed (${request.failure()?.errorText})`);
    };
    page.on('request', onRequest);
    page.on('requestfinished', onFinished);
    page.on('requestfailed', onFailed);
    try {
        await reviewerRow(modal, reviewerName)
            .getByRole('button', {name: 'Read Review'})
            .click();
        const readModal = reviewDetailsModal(page);
        await expect(readModal).toBeVisible({timeout: 20_000});
        await expect(
            readModal.getByRole('button', {name: 'Modify Review', exact: true})
        ).toBeEnabled({timeout: 20_000});
        return readModal;
    } catch (error) {
        const seen = [...loads].map(
            ([request, state]) => `GET ${new URL(request.url()).pathname}: ${state}`
        );
        error.message += `\nReview Details loads since "Read Review": ${seen.join('; ') || 'none'}`;
        throw error;
    } finally {
        page.off('request', onRequest);
        page.off('requestfinished', onFinished);
        page.off('requestfailed', onFailed);
    }
}

/**
 * Click a "Reviewer rating" star (1–5) in the settled Review Details window
 * and wait for the inline save. The app sends the PUT as a POST with
 * X-Http-Method-Override, so the bounding response is matched as POST; the
 * "Reviewer rating saved" toast is client-emitted (no shared server queue).
 */
async function rateReview(page, readModal, stars) {
    const radio = readModal.getByRole('radio', {name: `${stars} out of 5 stars`});
    // The window marks the review viewed on opening (PUT `…/consider`,
    // outside the loads "Modify Review" waits for), and its answer replaces
    // the window's assignment, which resets the rating radios to the value
    // it carries (ReviewDetailsRating.vue's watch). A press landing before
    // that answer is handled flips back to "No rating" ("Clicking the
    // checkbox did not change its state"; register A21, ci-triage "Review
    // Details window's star-rating radio not registering the click under
    // load"; .reports/flake-2026-09-29/u27s9/diagnosis.md H4). The app's
    // own race, so: press and re-check the radio's state in a bounded
    // retry, at most three presses.
    await waitForJQueryIdle(page);
    const saved = page.waitForResponse(
        (r) =>
            r.url().includes('/reviewAssignments/') &&
            !r.url().includes('/consider') &&
            r.request().method() === 'POST'
    );
    for (let attempt = 1; ; attempt++) {
        try {
            await radio.check({timeout: 10_000});
            break;
        } catch (error) {
            if (attempt >= 3 || !/did not change its state/.test(String(error.message))) throw error;
            await waitForJQueryIdle(page);
        }
    }
    await expect(radio).toBeChecked();
    await saved;
    await expect(page.getByText('Reviewer rating saved').first()).toBeVisible({
        timeout: 20_000,
    });
}

/**
 * Press "Mark as Complete" in the Review Details window and confirm the
 * "Mark this review as complete?" dialog (Rule 14a). The window stays open
 * afterwards — callers close it with its "Cancel" button.
 */
async function markReviewComplete(page, readModal) {
    await readModal
        .getByRole('button', {name: 'Mark as Complete', exact: true})
        .click();
    const dialog = page
        .locator('[data-cy="dialog"]')
        .filter({hasText: 'Mark this review as complete?'});
    await expect(
        dialog.getByText(
            'You can still modify this review after marking it as complete.'
        )
    ).toBeVisible({timeout: 10_000});
    await dialog
        .getByRole('button', {name: 'Mark as Complete', exact: true})
        .click();
    await expect(
        page.getByText('The review has been marked as complete.').first()
    ).toBeVisible({timeout: 20_000});
}

/**
 * Press "Modify Review" in the settled Review Details window, confirm the
 * "Modify this review?" dialog, and resolve the stacked "Modify Review"
 * window once its comment editor holds `settledText` (the window's own
 * load-settle — its one TinyMCE arrives prefilled with the current shared
 * comment). Returns {editModal, commentBody}.
 */
async function openModifyReview(page, readModal, settledText) {
    await readModal
        .getByRole('button', {name: 'Modify Review', exact: true})
        .click();
    const dialog = page
        .locator('[data-cy="dialog"]')
        .filter({hasText: 'Modify this review?'});
    await expect(
        dialog.getByText(/All modifications will be recorded in the activity log/)
    ).toBeVisible({timeout: 10_000});
    await dialog
        .getByRole('button', {name: 'Modify Review', exact: true})
        .click();
    const editModal = page.getByRole('dialog', {name: /^Modify Review/});
    await expect(editModal).toBeVisible({timeout: 20_000});
    const commentFrame = editModal.locator('iframe.tox-edit-area__iframe').first();
    const commentBody = commentFrame.contentFrame().locator('body');
    await expect(commentBody).toContainText(settledText, {timeout: 20_000});
    // Callers type into the box: its editor must be `initialized` first,
    // or its late content style sheets put the old text back over theirs
    // (shared/playwright/support/richtext.js).
    await waitForEditorReady(page, await editorIdOf(commentFrame));
    return {editModal, commentBody};
}

/** One entry of an open row menu, by its exact label. */
function menuEntry(menu, name) {
    return menu.getByRole('menuitem', {name, exact: true});
}

/** Every entry of an open row menu, in screen order (Rule 3's order). */
function menuEntries(menu) {
    return menu.getByRole('menuitem');
}

/**
 * The "Submission Authors" box above the Add Reviewer list
 * (`AdvancedSearchReviewerContainer`): each author row bolds the name
 * (`<strong>`) beside its affiliations (Rule 6).
 */
function authorList(addModal) {
    return addModal.locator('.pkpAdvancedSearchReviewerContainer');
}

/** The bold name of one author row in the box above the list. */
function authorName(addModal, name) {
    return authorList(addModal).locator('li.author_row strong').filter({hasText: name});
}

/**
 * Open the list's "Filters" sidebar (its header button toggles it; the
 * sidebar is closed on arrival) and return it, settled on its heading.
 */
async function openFiltersSidebar(addModal) {
    const sidebar = addModal.locator('.listPanel__sidebar');
    if (!(await sidebar.count())) {
        await addModal.getByRole('button', {name: 'Filters', exact: true}).click();
    }
    await expect(sidebar.getByRole('heading', {name: 'Filters'})).toBeVisible({
        timeout: 10_000,
    });
    return sidebar;
}

/** One slider filter of the sidebar, by its title (Rule 6). */
function filterSlider(sidebar, title) {
    return sidebar.locator('.pkpFilter--slider').filter({hasText: title});
}

/** The range input of a slider filter (disabled until enabled). */
function filterSliderInput(slider) {
    return slider.locator('input[type="range"]');
}

/**
 * The enable button beside a slider filter; its accessible name is
 * "Add filter: {title}" (the visible glyph is decorative), and it turns
 * into "Clear filter: {title}" once pressed.
 */
function filterEnableButton(slider, title) {
    return slider.getByRole('button', {name: `Add filter: ${title}`});
}

/** The clear button of an enabled slider filter ("Clear filter: {title}"). */
function filterClearButton(slider, title) {
    return slider.getByRole('button', {name: `Clear filter: ${title}`});
}

/** Every entry of the Add Reviewer list (one page of it). */
function listEntries(addModal) {
    return addModal.locator('.listPanel__item');
}

/** The list's pagination bar (`nav` named "View additional pages"). */
function paginationBar(addModal) {
    return addModal.getByRole('navigation', {name: 'View additional pages'});
}

/**
 * The "No Files Selected" warning of an Add or Edit window
 * (`#noFilesWarning`, shown once the "Files To Be Reviewed" grid has loaded
 * with nothing ticked).
 */
function noFilesWarning(scope) {
    return scope.locator('#noFilesWarning').getByText('No Files Selected');
}

/** The "Files To Be Reviewed" grid of an Add or Edit window. */
function filesToBeReviewedGrid(scope) {
    return scope.locator('#limitReviewFilesGrid');
}

/** A "Review Type" radio of an Add or Edit window, by its exact label. */
function reviewTypeRadio(scope, label) {
    return scope.getByRole('radio', {name: label, exact: true});
}

/** The "Publicly Show Reviewer Comments" box of an Add or Edit window. */
function publicVisibilityBox(scope) {
    return scope.locator('input[name="isReviewPubliclyVisible"]');
}

/**
 * Press the row's "Send Reminder" button and return the "Review Reminder"
 * window, settled on its "Review Schedule" group with the message loaded
 * (TinyMCE `message`). Callers press "Send Reminder" in the window.
 */
async function openReminder(page, row) {
    await row.getByRole('button', {name: 'Send Reminder', exact: true}).click();
    const reminderModal = topModal(page);
    await expect(reminderModal.getByText('Review Schedule')).toBeVisible({
        timeout: 20_000,
    });
    await awaitTinyMce(page, 'message');
    return reminderModal;
}

/**
 * Press the row's "Revert Decision" and confirm the "Unconsider this
 * Review" dialog (Rule 16). Callers read the row's new state afterwards.
 */
async function revertDecision(page, row) {
    await row.getByRole('button', {name: 'Revert Decision'}).click();
    const dialog = page
        .getByRole('dialog')
        .filter({hasText: 'Unconsider this Review'});
    await expect(dialog).toBeVisible({timeout: 10_000});
    await dialog.getByRole('button', {name: 'OK'}).click();
    await expect(dialog).toBeHidden({timeout: 10_000});
}

/**
 * Close an open row menu without touching the workflow dialog underneath
 * (Escape would close that too — locator pitfall 7): the row's own "More
 * Actions" button toggles the menu shut.
 */
async function closeRowMenu(page, row, menu) {
    await row.getByRole('button', {name: 'More Actions'}).click();
    await expect(menu).toBeHidden();
}

/** The Reviewers panel's column headers (Rule 1), by exact label. */
function columnHeader(modal, name) {
    return reviewerPanel(modal).getByRole('columnheader', {name, exact: true});
}

/**
 * The status cell's title line (`ReviewerManagerCellStatusInfo`): the bold
 * span carrying the state's label; an overdue state adds `text-negative`
 * (the red), a declined or cancelled one a `title` tooltip.
 */
function statusTitle(row, text) {
    return row.locator('span.text-base-bold').filter({hasText: text});
}

/**
 * The toasts on screen (`.pkpNotification`, the app's notification stack;
 * a dismissed or expired one lingers hidden in the DOM, so only visible
 * ones count).
 */
function toasts(page) {
    return page.locator('.pkpNotification:visible');
}

/**
 * Open the row's "Editorial Notes" window (More Actions › Editorial Notes,
 * form#reviewerGossipForm) and return it, settled on its guidance sentence.
 */
async function openEditorialNotes(page, row) {
    const menu = await openRowMenu(page, row);
    await menuEntry(menu, 'Editorial Notes').click();
    const notesModal = topModal(page);
    await expect(
        notesModal.getByText(/Record notes about this reviewer/)
    ).toBeVisible({timeout: 20_000});
    return notesModal;
}

/** Open the row's "History" window and return it, settled on "Request Sent:". */
async function openHistory(page, row) {
    const menu = await openRowMenu(page, row);
    await menuEntry(menu, 'History').click();
    const historyModal = topModal(page);
    await expect(historyModal.getByText('Request Sent:').first()).toBeVisible({
        timeout: 20_000,
    });
    return historyModal;
}

/**
 * Close a legacy (FBV) window through its header "Close" control (its
 * bottom "Cancel" is an `<a>` link and posts a cancel on some forms; the
 * header control only closes). `[data-cy="active-modal"]` marks the top
 * window only, so the close resolves once the workflow modal's own
 * heading is the active one again.
 */
async function closeLegacyWindow(page, modal) {
    await modal.getByRole('button', {name: 'Close', exact: true}).click();
    await expect(
        page
            .locator('[data-cy="active-modal"]')
            .getByRole('heading', {name: /^Workflow:/})
            .first()
    ).toBeVisible({timeout: 20_000});
}

/**
 * Open the submission's Activity Log (the workflow header's "Activity Log"
 * button; a legacy grid in a dialog) and return the dialog, settled on its
 * table.
 */
async function openActivityLog(page) {
    await page
        .getByRole('button', {name: 'Activity Log', exact: true})
        .click();
    const log = page.getByRole('dialog', {name: /Activity Log/});
    await expect(log.getByRole('table').first()).toBeVisible({timeout: 30_000});
    return log;
}

/** The newest activity-log row carrying `text`. */
function activityLogRow(log, text) {
    return log.getByRole('row').filter({hasText: text}).first();
}

/** The "Search By Name" autocomplete input of the Enroll Existing User form. */
function enrollSearchBox(addModal) {
    return addModal.locator('[id^="userId_container"] input[type="text"]').first();
}

/**
 * Type a name into the enroll autocomplete and wait for its own response
 * (`get-users-not-assigned-as-reviewers`), the bound for presence and
 * absence reads alike; returns the suggestion list.
 */
async function enrollAutocomplete(page, addModal, phrase) {
    const box = enrollSearchBox(addModal);
    await box.fill('');
    const answered = page.waitForResponse((r) =>
        r.url().includes('get-users-not-assigned-as-reviewers')
    );
    await box.pressSequentially(phrase, {delay: 20});
    await answered;
    return page.locator('.ui-autocomplete');
}

/** The "Review Form" select of an Add or Edit window (Rule 10). */
function reviewFormSelect(scope) {
    return scope.locator('select[name="reviewFormId"]');
}

/** The selected entry of an Add or Edit window's "Review Form" list. */
function reviewFormSelected(scope) {
    return reviewFormSelect(scope).locator('option:checked');
}

/**
 * Close a row's "Edit" window without saving: its "Cancel" (a legacy
 * form's link, patterns.md pitfall 7). Waits for the window's "Review
 * Type" group to go and the workflow heading to be back.
 */
async function cancelEditReview(page, editModal) {
    await editModal.getByRole('link', {name: 'Cancel', exact: true}).click();
    await expect(editModal.getByText('Review Type')).toBeHidden({timeout: 20_000});
    await expect(
        page.locator('[data-cy="active-modal"]').getByRole('heading', {name: /^Workflow:/}).first()
    ).toBeVisible({timeout: 20_000});
}

/**
 * Close the "Review Details" window with its "Cancel" and wait for the
 * reviewer row (unmounted while the window is open) to be back with
 * `rowText`.
 */
async function closeReadReview(page, modal, readModal, reviewerName, rowText) {
    await readModal.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(readModal).toBeHidden({timeout: 20_000});
    await expect(reviewerRow(modal, reviewerName)).toContainText(rowText, {timeout: 20_000});
}

/**
 * The "Review Details" window's text, whitespace-folded, for order reads
 * (a review-form answer follows its question; U29 S13).
 */
async function reviewDetailsText(readModal) {
    const text = await readModal.innerText();
    return text.replace(/\s+/g, ' ').trim();
}

/** The "Choose a predefined message…" template chooser of a legacy window. */
function templateChooser(scope) {
    return scope.locator('select[name="template"]');
}

/** The "Do not send email to Reviewer." box of a legacy window. */
function skipEmailBox(scope) {
    return scope.locator('input[name="skipEmail"]');
}

/**
 * A later-round entry's "Reassign" button (Rule 8). Its accessible name is
 * "Reassign {full name}" (the visible "Reassign" text is aria-hidden).
 */
function reassignButton(entry) {
    return entry.getByRole('button', {name: /^Reassign /});
}

/**
 * Press the row's "Thank Reviewer" button and return the window, settled on
 * its prefilled message (TinyMCE `message`).
 */
async function openThankReviewer(page, row) {
    await row.getByRole('button', {name: 'Thank Reviewer'}).click();
    const thankModal = topModal(page);
    await expect(
        thankModal.getByRole('button', {name: 'Thank Reviewer', exact: true})
    ).toBeVisible({timeout: 20_000});
    await awaitTinyMce(page, 'message');
    return thankModal;
}

/**
 * "OK" on an open Edit window (form#editReviewForm); resolves once the
 * window has closed. `[data-cy="active-modal"]` marks the top window only,
 * so the close is read as the "Review Type" group leaving the top window.
 * The window refuses silently (stays open, `update-review` 200) when the
 * review due date is earlier than the response due date (screen notes pA).
 */
async function saveEditReview(editModal) {
    // A ticked or unticked file box slides the "No Files Selected" warning.
    await waitForLegacyFormSettled(editModal.page(), editModal);
    await editModal.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(editModal.getByText('Review Type')).toBeHidden({timeout: 20_000});
}

/**
 * Move one due date of the row's assignment through its Edit window, by a
 * calendar pick (a typed date is discarded, screen notes pD1): `fieldName`
 * is `responseDueDate` or `reviewDueDate`. The screens' only route to an
 * overdue assignment (U28 footnote s): a past date is accepted, and the
 * reviewer receives "Your review assignment has been changed".
 */
async function moveDueDate(page, row, fieldName, date) {
    const editModal = await openEditReview(page, row);
    await pickDate(page, editModal, fieldName, date);
    await saveEditReview(editModal);
}

/**
 * Press the overdue row's "Send Reminder" (a row control, not a menu
 * entry) and send the "Review Reminder" window as it comes (template
 * preset, message loaded into TinyMCE `message`). Resolves once the window
 * has closed; the reminder email carries its own one-click link when the
 * setting is on (U28 Rule 16).
 */
async function sendReminder(page, row) {
    await row.getByRole('button', {name: 'Send Reminder', exact: true}).click();
    const reminderModal = topModal(page);
    await expect(reminderModal.getByText('Review Schedule')).toBeVisible({timeout: 20_000});
    await awaitTinyMce(page, 'message');
    await reminderModal.getByRole('button', {name: 'Send Reminder', exact: true}).click();
    await expect(reminderModal.getByText('Review Schedule')).toBeHidden({timeout: 20_000});
}

/**
 * "Cancel Reviewer" from an answered row's More Actions (U27 Rule 12): the
 * window (form#cancelReviewForm, a template chooser, the message, the
 * skip box) is sent as it comes. Resolves once the row reads "Request
 * Cancelled".
 */
async function cancelReviewer(page, row) {
    const menu = await openRowMenu(page, row);
    await menuEntry(menu, 'Cancel Reviewer').click();
    const cancelModal = topModal(page);
    await expect(cancelModal.getByText('Choose a predefined message to use')).toBeVisible({timeout: 20_000});
    await awaitTinyMce(page, 'personalMessage');
    await cancelModal.getByRole('button', {name: 'Cancel Reviewer', exact: true}).click();
    await expect(row).toContainText('Request Cancelled', {timeout: 20_000});
}

/**
 * "Resend Review Request" from a declined row's More Actions (U27 Rule
 * 13): the window is sent as it comes (fresh due dates preset, message in
 * TinyMCE `personalMessage`). Resolves once the row reads "Request Resent";
 * the reviewer's list then shows the request as unanswered again.
 */
async function resendReviewRequest(page, row) {
    const menu = await openRowMenu(page, row);
    await menuEntry(menu, 'Resend Review Request').click();
    const resendModal = topModal(page);
    await awaitTinyMce(page, 'personalMessage');
    await resendModal.getByRole('button', {name: 'Resend Review Request', exact: true}).click();
    await expect(row).toContainText('Request Resent', {timeout: 20_000});
}

module.exports = {
    reviewerPanel,
    saveEditReview,
    moveDueDate,
    sendReminder,
    cancelReviewer,
    resendReviewRequest,
    reviewerRow,
    openRowMenu,
    menuEntry,
    menuEntries,
    authorList,
    authorName,
    openFiltersSidebar,
    filterSlider,
    filterSliderInput,
    filterEnableButton,
    filterClearButton,
    listEntries,
    paginationBar,
    noFilesWarning,
    filesToBeReviewedGrid,
    reviewTypeRadio,
    publicVisibilityBox,
    openReminder,
    revertDecision,
    closeRowMenu,
    columnHeader,
    statusTitle,
    toasts,
    openEditorialNotes,
    openHistory,
    closeLegacyWindow,
    openActivityLog,
    activityLogRow,
    enrollSearchBox,
    enrollAutocomplete,
    reviewFormSelect,
    reviewFormSelected,
    cancelEditReview,
    closeReadReview,
    reviewDetailsText,
    templateChooser,
    skipEmailBox,
    reassignButton,
    openThankReviewer,
    openAddReviewer,
    searchReviewerList,
    reviewerListEntry,
    selectButton,
    selectReviewerAndAwaitForm,
    awaitLetterEditorReady,
    awaitRequestFormReady,
    addReviewerFromList,
    openEditReview,
    grantFileToReviewer,
    editReviewFileBox,
    setEditReviewFile,
    isoDate,
    daysFromNow,
    pickDate,
    dateAltField,
    completeReview,
    awaitTinyMce,
    reviewDetailsModal,
    openReadReview,
    rateReview,
    markReviewComplete,
    openModifyReview,
};
