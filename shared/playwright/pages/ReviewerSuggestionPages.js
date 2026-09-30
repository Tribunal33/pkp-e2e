// @ts-check
/**
 * @file shared/playwright/pages/ReviewerSuggestionPages.js
 *
 * Shared Page Objects for the reviewer-suggestions feature
 * (spec: docs/specs/U31-reviewer-suggestions.md). App-neutral: every
 * string here is a lib/pkp locale string identical on OJS and OMP; the one
 * per-app label (the reviewer role's name in the Enroll form) is passed in
 * by the suite. The wizard frame itself is each app's SubmissionWizardPage,
 * the workflow frame the shared WorkflowPage, the Add Reviewer window's
 * search list each app's ReviewStagePages.
 *
 * Surfaces:
 * - ReviewerSuggestionStep — the wizard's "Reviewer Suggestions" step: the
 *   guidance paragraph, the panel with "Add Reviewer Suggestion", its
 *   entries with "Edit" / "Delete", and the Review step's summary block.
 * - ReviewerSuggestionWindow — the "Add Reviewer Suggestion" / "Edit" side
 *   window: boxes, the rich-text reason, Save, field errors, the summary,
 *   the header Close.
 * - deleteSuggestionDialog — the "Delete Reviewer Suggestion" dialog.
 * - SuggestedReviewersPanel — the workflow screen's "Reviewers Suggested by
 *   Author" panel (heading + list under Participants), a row's "…" menu
 *   ("{name} More Actions") and its "Add Reviewer".
 * - ReviewerRequestWindow — the legacy Add Reviewer window in its three
 *   prefilled modes ("Selected Reviewer", "Enroll an Existing User as
 *   Reviewer", "Create New Reviewer"), opened from a panel row or from an
 *   entry of the list below; its "Add Reviewer", "Cancel" and header "Close".
 * - SuggestionList — "Select a Reviewer from Reviewer Suggestions" inside
 *   the Reviewers panel's own Add Reviewer window: entries, their "Select
 *   Reviewer" button, the already-assigned notice.
 *
 * DOM shapes from the U31 claim-check snapshots (.reports/U31/cc*, 2026-09-06).
 */
const {expect} = require('@playwright/test');
const {waitForLegacyFormSettled} = require('../support/legacy.js');

/** Escape a string for use inside a RegExp. */
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wait until the TinyMCE editor behind an iframe whose id contains the given
 * fragment reports `initialized` (text typed earlier is wiped: patterns.md).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} idFragment
 */
async function waitForTinyMce(page, idFragment) {
    await page.waitForFunction(
        (fragment) => {
            const frame = document.querySelector(`iframe[id*="${fragment}"]`);
            const mce = window.tinymce || window.tinyMCE;
            if (!frame || !mce) {
                return false;
            }
            const editor = mce.get(frame.id.replace(/_ifr$/, ''));
            return !!(editor && editor.initialized);
        },
        idFragment,
        {timeout: 30_000}
    );
}

// ---------------------------------------------------------------------------
// The wizard step (Rules 1–6)
// ---------------------------------------------------------------------------

exports.ReviewerSuggestionStep = class ReviewerSuggestionStep {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
    }

    /** The journal's guidance text above the panel (Rule 1). */
    guidance() {
        return this.page.getByText(
            /^When submitting, you have the option to suggest several potential reviewers\./
        );
    }

    /**
     * The step's list panel (the one carrying "Add Reviewer Suggestion"),
     * matched by text so it still resolves while a side window holds the
     * page behind it aria-hidden (patterns.md pitfall 4).
     */
    panel() {
        return this.page.locator('.listPanel').filter({hasText: 'Add Reviewer Suggestion'});
    }

    panelHeading() {
        return this.panel().getByRole('heading', {name: 'Reviewer Suggestions', exact: true});
    }

    addButton() {
        return this.panel().getByRole('button', {name: 'Add Reviewer Suggestion', exact: true});
    }

    /** "No items found." — the empty panel. */
    emptyText() {
        return this.panel().getByText('No items found.', {exact: true});
    }

    entries() {
        return this.panel().locator('.listPanel__item');
    }

    /** An entry by a text it carries (the address is the unique one). */
    entry(text) {
        return this.entries().filter({hasText: text});
    }

    editButton(entry) {
        return entry.getByRole('button', {name: 'Edit', exact: true});
    }

    deleteButton(entry) {
        return entry.getByRole('button', {name: 'Delete', exact: true});
    }

    /** Press "Add Reviewer Suggestion" and return the window it opens. */
    async openAdd() {
        await this.addButton().click();
        const window = new exports.ReviewerSuggestionWindow(this.page, 'Add Reviewer Suggestion');
        await window.expectOpen();
        return window;
    }

    /** Press an entry's "Edit" and return the "Edit" window. */
    async openEdit(entry) {
        await this.editButton(entry).click();
        const window = new exports.ReviewerSuggestionWindow(this.page, 'Edit');
        await window.expectOpen();
        return window;
    }

    /** Press an entry's "Delete" and return the confirm dialog. */
    async openDelete(entry) {
        await this.deleteButton(entry).click();
        const dialog = exports.deleteSuggestionDialog(this.page);
        await expect(dialog).toBeVisible({timeout: 30_000});
        return dialog;
    }

    /**
     * The Review step's "Reviewer Suggestions" block (Rule 6): heading,
     * "Edit", and either the entries or the no-suggestion warning.
     */
    reviewBlock() {
        return this.page
            .locator('.submissionWizard__reviewPanel')
            .filter({has: this.page.getByRole('heading', {name: 'Reviewer Suggestions', exact: true})});
    }

    reviewBlockEditButton() {
        return this.reviewBlock().getByRole('button', {name: 'Edit', exact: true});
    }

    reviewBlockWarning() {
        return this.reviewBlock().getByText('No reviewers have been suggested for this submission.');
    }

    reviewBlockEntries() {
        return this.reviewBlock().getByRole('listitem');
    }
};

/** The "Delete Reviewer Suggestion" confirm dialog (Rule 5). */
exports.deleteSuggestionDialog = function deleteSuggestionDialog(page) {
    return page.getByRole('dialog', {name: 'Delete Reviewer Suggestion', exact: true});
};

exports.DELETE_SUGGESTION_MESSAGE =
    'Are you sure you want to remove this suggestion? This action can not be undone.';

// ---------------------------------------------------------------------------
// The "Add Reviewer Suggestion" / "Edit" window (Fields, Rules 3–4)
// ---------------------------------------------------------------------------

exports.ReviewerSuggestionWindow = class ReviewerSuggestionWindow {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} title 'Add Reviewer Suggestion' | 'Edit'
     */
    constructor(page, title) {
        this.page = page;
        this.title = title;
    }

    /** The side window, anchored by its level-1 heading. */
    dialog() {
        return this.page
            .getByRole('dialog')
            .filter({has: this.page.getByRole('heading', {name: this.title, exact: true, level: 1})});
    }

    async expectOpen() {
        await expect(this.dialog().getByRole('heading', {name: this.title, exact: true, level: 1})).toBeVisible({
            timeout: 30_000,
        });
    }

    async expectClosed() {
        await expect(this.dialog()).toHaveCount(0, {timeout: 30_000});
    }

    givenName() {
        return this.dialog().getByRole('textbox', {name: /^Given Name/}).first();
    }

    familyName() {
        return this.dialog().getByRole('textbox', {name: /^Family Name/}).first();
    }

    email() {
        return this.dialog().getByRole('textbox', {name: /^Email/}).first();
    }

    orcid() {
        return this.dialog().getByRole('textbox', {name: /ORCID/}).first();
    }

    affiliation() {
        return this.dialog().getByRole('textbox', {name: /^Affiliation/}).first();
    }

    /** The rich-text "Reasons for suggesting reviewer" body (the first, visible, iframe). */
    reasonBody() {
        return this.dialog().frameLocator('iframe[id*="suggestionReason"]').first().locator('body');
    }

    /** Type the reason once the editor is initialized (patterns.md). */
    async fillReason(text) {
        await waitForTinyMce(this.page, 'suggestionReason');
        const body = this.reasonBody();
        await body.click();
        await body.fill(text);
    }

    /** Fill every box the suite passes; keys: givenName, familyName, email, affiliation, reason, orcid. */
    async fill({givenName, familyName, email, affiliation, reason, orcid} = {}) {
        if (givenName !== undefined) {
            await this.givenName().fill(givenName);
        }
        if (familyName !== undefined) {
            await this.familyName().fill(familyName);
        }
        if (email !== undefined) {
            await this.email().fill(email);
        }
        if (orcid !== undefined) {
            await this.orcid().fill(orcid);
        }
        if (affiliation !== undefined) {
            await this.affiliation().fill(affiliation);
        }
        if (reason !== undefined) {
            await this.fillReason(reason);
        }
    }

    saveButton() {
        return this.dialog().getByRole('button', {name: 'Save', exact: true});
    }

    /** Press Save and wait for the window to go (a refused save keeps it open: use saveButton()). */
    async save() {
        await this.saveButton().click();
        await this.expectClosed();
    }

    /** Every field error shown in the window (class pkpFieldError, pitfall 14). */
    fieldErrors() {
        return this.dialog().locator('.pkpFieldError');
    }

    /** The error under one box, by the box's label text. */
    fieldError(label) {
        return this.dialog()
            .locator('.pkpFormField')
            .filter({has: this.page.getByText(new RegExp(`^${escapeRegExp(label)}`))})
            .locator('.pkpFieldError');
    }

    /** The "Please correct {N} errors." line at the top of the form. */
    errorSummary() {
        return this.dialog().getByText(/Please correct (one|\d+) errors?\./);
    }

    jumpToNextErrorButton() {
        return this.dialog().getByRole('button', {name: 'Jump to next error', exact: true});
    }

    /** The header "Close" control (discards what was typed, asks nothing). */
    closeButton() {
        return this.dialog().getByRole('button', {name: 'Close', exact: true});
    }

    async close() {
        await this.closeButton().click();
        await this.expectClosed();
    }
};

// ---------------------------------------------------------------------------
// The workflow screen's "Reviewers Suggested by Author" panel (Rule 8)
// ---------------------------------------------------------------------------

exports.SUGGESTED_PANEL_HEADING = 'Reviewers Suggested by Author';

/** The panel's list fetch, `GET …/submissions/{id}/reviewers/suggestions[?approved=false]`. */
const SUGGESTIONS_LIST = /\/submissions\/\d+\/reviewers\/suggestions(\?|$)/;

/**
 * Follow the panel's list fetches on a page (once per page): which are out,
 * and whether one has answered since the page last loaded.
 *
 * @param {import('@playwright/test').Page} page
 */
function trackSuggestionFetches(page) {
    if (!page.__suggestionFetches) {
        const state = {load: 0, answeredLoad: -1, pending: new Map()};
        const isList = (request) => request.method() === 'GET' && SUGGESTIONS_LIST.test(request.url());
        const done = (request) => {
            if (state.pending.has(request)) {
                const load = state.pending.get(request);
                state.pending.delete(request);
                if (load === state.load) {
                    state.answeredLoad = load;
                }
            }
        };
        page.on('request', (request) => {
            // A new document (not a same-document URL change) starts a new load.
            // The old document's fetches are dropped: one cut off by the
            // navigation does not always report back.
            if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
                state.load++;
                state.pending.clear();
            } else if (isList(request)) {
                state.pending.set(request, state.load);
            }
        });
        page.on('requestfinished', done);
        page.on('requestfailed', (request) => state.pending.delete(request));
        page.__suggestionFetches = state;
    }
    return page.__suggestionFetches;
}

exports.SuggestedReviewersPanel = class SuggestedReviewersPanel {
    /**
     * Build it before the page lands on the workflow: it follows the panel's
     * list fetch from then on.
     *
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
        this.fetches = trackSuggestionFetches(page);
    }

    /**
     * The editorial view's panel renders only once its list fetch has
     * answered, and only when the list is not empty
     * (`ReviewerSuggestionManager.vue` `v-if`), so a read of it right after a
     * landing waits for that answer first: under load it can take longer
     * than a plain read's 10 s, and an absence read taken before it proves
     * nothing. Call it right after a landing on an editorial view of a
     * journal or press with the setting on; the author's view, a stage
     * without the panel (OMP's internal review) and a context with the
     * setting off make no such fetch.
     */
    async loaded() {
        await expect
            .poll(() => this.fetches.answeredLoad === this.fetches.load && this.fetches.pending.size === 0, {
                timeout: 30_000,
                message: 'the "Reviewers Suggested by Author" list fetch answers',
            })
            .toBe(true);
    }

    /**
     * The panel heading (level 3, under Participants), matched by text so it
     * still resolves while an Add Reviewer window holds the workflow behind
     * it aria-hidden (patterns.md pitfall 6).
     */
    heading() {
        return this.page.getByText(exports.SUGGESTED_PANEL_HEADING, {exact: true});
    }

    /** The list right after the heading. */
    list() {
        return this.heading().locator('xpath=following::ul[1]');
    }

    rows() {
        return this.list().locator('li');
    }

    /** A row by the person's full name. */
    row(name) {
        return this.rows().filter({hasText: name});
    }

    /** The row's "…" menu button, labelled "{name} More Actions". */
    moreActionsButton(name) {
        return this.page.getByRole('button', {name: `${name} More Actions`, exact: true});
    }

    /** Open a row's menu and return its items (headlessui: portalled, page-scoped). */
    async openMenu(name) {
        await this.moreActionsButton(name).click();
        const items = this.page.getByRole('menuitem');
        await expect(items.first()).toBeVisible({timeout: 30_000});
        return items;
    }

    /** Row menu › "Add Reviewer": returns the request window it opens. */
    async addReviewerFromRow(name) {
        await this.openMenu(name);
        await this.page.getByRole('menuitem', {name: 'Add Reviewer', exact: true}).click();
        const window = new exports.ReviewerRequestWindow(this.page);
        await window.expectOpen();
        return window;
    }
};

// ---------------------------------------------------------------------------
// The legacy Add Reviewer window in its prefilled modes (Rules 9–10)
// ---------------------------------------------------------------------------

exports.ASSIGNED_NOTICE = 'This reviewer has already been assigned to this review round.';

exports.ReviewerRequestWindow = class ReviewerRequestWindow {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {{index?: number}} [options] which of the stacked "Add Reviewer"
     *   dialogs (default: the topmost)
     */
    constructor(page, {index = -1} = {}) {
        this.page = page;
        this.index = index;
    }

    /** Every open "Add Reviewer" dialog (the workflow page is a dialog too: pitfall 7). */
    static all(page) {
        return page.getByRole('dialog', {name: /Add Reviewer/i});
    }

    dialog() {
        const all = exports.ReviewerRequestWindow.all(this.page);
        return this.index < 0 ? all.last() : all.nth(this.index);
    }

    /**
     * The window is open and its form has arrived (the legacy form loads by
     * AJAX after the dialog opens, and every message editor it carries must
     * be initialized before anything is typed or submitted: patterns.md).
     * Pass `{form: false}` for the outer list window, whose "Add Reviewer"
     * appears only once a reviewer is selected. With the form, it also waits
     * for the form to stop moving (`settled()`), so a later press lands.
     */
    async expectOpen({form = true} = {}) {
        await expect(this.dialog()).toBeVisible({timeout: 30_000});
        if (form) {
            await expect(this.addReviewerButton()).toBeVisible({timeout: 30_000});
        }
        await exports.waitForRequestEditors(this.page);
        if (form) {
            await this.settled();
        }
    }

    /**
     * The form's footer loads its "Files To Be Reviewed" grid by AJAX once
     * the form's handler binds, above "Add Reviewer" and "Cancel", and
     * slides the "No Files Selected" warning in over 250 ms when it lands:
     * both push the buttons down, and a press whose button-up comes after
     * the push is lost without a sound (no request, the button only
     * focused). Wait until the window has stopped moving.
     */
    async settled() {
        await waitForLegacyFormSettled(this.page, this.dialog());
    }

    /** The mode readouts. */
    selectedReviewerLabel() {
        return this.dialog().getByText('Selected Reviewer', {exact: true});
    }

    selectedReviewerName() {
        return this.dialog().locator('[id^="selectedReviewerName"]');
    }

    enrollHeading() {
        return this.dialog().getByRole('heading', {name: 'Enroll an Existing User as Reviewer', exact: true});
    }

    createHeading() {
        return this.dialog().getByRole('heading', {name: 'Create New Reviewer', exact: true});
    }

    locateHeading() {
        return this.dialog().getByRole('heading', {name: 'Locate a Reviewer', exact: true});
    }

    backToSearchLink() {
        return this.dialog().getByRole('link', {name: 'Back to Search', exact: true});
    }

    /** The predefined-message combobox ("Review Request"). */
    templateSelect() {
        return this.dialog().getByRole('combobox', {name: /Choose a predefined message/});
    }

    /** The two date boxes (the visible datepicker inputs). */
    responseDueDate() {
        return this.dialog().locator('input.datepicker[id^="responseDueDate"]');
    }

    reviewDueDate() {
        return this.dialog().locator('input.datepicker[id^="reviewDueDate"]');
    }

    /** Enroll form: "Search By Name" and the reviewer role select. */
    searchByName() {
        return this.dialog().locator('input[id^="userId_input"]');
    }

    userGroupSelect() {
        return this.dialog().locator('select[name="userGroupId"]');
    }

    /** Create form boxes (locale-suffixed names: match by prefix). */
    createGivenName() {
        return this.dialog().locator('input[name^="givenName"]').first();
    }

    createFamilyName() {
        return this.dialog().locator('input[name^="familyName"]').first();
    }

    createEmail() {
        return this.dialog().locator('input[name="email"]');
    }

    createAffiliation() {
        return this.dialog().locator('input[name^="affiliation"]').first();
    }

    username() {
        return this.dialog().locator('input[name="username"]');
    }

    suggestUsernameButton() {
        return this.dialog().getByRole('button', {name: 'Suggest', exact: true});
    }

    /** The form's own "Add Reviewer" (the last one: the panel's sits behind). */
    addReviewerButton() {
        return this.dialog().getByRole('button', {name: 'Add Reviewer', exact: true}).last();
    }

    /** A pending wait for the grid's answer to the form; arm before pressing. */
    armSubmit() {
        return this.page.waitForResponse(
            (r) => /\/reviewer-grid\//.test(r.url()) && r.request().method() === 'POST',
            {timeout: 45_000}
        );
    }

    /** Press "Add Reviewer" and wait for the grid's answer (the window's fate is the caller's to read). */
    async submit() {
        await this.settled();
        const answered = this.armSubmit();
        await this.addReviewerButton().click();
        return answered;
    }

    /** The form's "Cancel" (a link on the request form, a button on the Create form). */
    cancelControl() {
        return this.dialog()
            .locator('a.cancelButton, button')
            .filter({hasText: /^\s*Cancel\s*$/})
            .last();
    }

    /**
     * Press "Cancel" and wait for one window fewer (counted, as `close()`
     * does: a `.last()` handle re-resolves to the outer window once a
     * stacked inner one is gone, so a visibility wait on it never ends).
     */
    async cancel() {
        await this.settled();
        const before = await exports.ReviewerRequestWindow.all(this.page).count();
        await this.cancelControl().click();
        await expect(exports.ReviewerRequestWindow.all(this.page)).toHaveCount(Math.max(0, before - 1), {
            timeout: 30_000,
        });
    }

    /** The header "Close" arrow (the window's first Close). */
    closeButton() {
        return this.dialog().getByRole('button', {name: /^Close$/}).first();
    }

    async close() {
        const before = await exports.ReviewerRequestWindow.all(this.page).count();
        await this.closeButton().click();
        await expect(exports.ReviewerRequestWindow.all(this.page)).toHaveCount(Math.max(0, before - 1), {
            timeout: 30_000,
        });
    }

    /** A field error text inside the form ("This field is required."). */
    formError(text) {
        return this.dialog().getByText(text, {exact: true});
    }

    /**
     * The "Review Request" message body: the window's one visible editor
     * iframe (a hidden twin with the same id exists: U31 screen notes).
     */
    messageBody() {
        return this.dialog().frameLocator('iframe:visible').first().locator('body');
    }

    /** Type at the end of the "Review Request" message (the editor is initialized by expectOpen). */
    async appendToMessage(text) {
        const body = this.messageBody();
        await body.click();
        await this.page.keyboard.press('Control+End');
        await this.page.keyboard.type(text);
        await expect(body).toContainText(text);
    }
};

/**
 * Every "personalMessage" editor on the page (one per open Add Reviewer
 * window) reports `initialized`, or there is none yet.
 *
 * @param {import('@playwright/test').Page} page
 */
exports.waitForRequestEditors = async function waitForRequestEditors(page) {
    await page.waitForFunction(
        () => {
            const areas = [...document.querySelectorAll('textarea[name="personalMessage"]')];
            const mce = window.tinymce || window.tinyMCE;
            if (!areas.length) {
                return true;
            }
            return !!mce && areas.every((textarea) => mce.get(textarea.id)?.initialized);
        },
        undefined,
        {timeout: 30_000}
    );
};

// ---------------------------------------------------------------------------
// "Select a Reviewer from Reviewer Suggestions" inside Add Reviewer (Rule 10)
// ---------------------------------------------------------------------------

exports.SUGGESTION_LIST_HEADING = 'Select a Reviewer from Reviewer Suggestions';

exports.SuggestionList = class SuggestionList {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('@playwright/test').Locator} modal the Add Reviewer window
     *   (from the app's openAddReviewerModal)
     */
    constructor(page, modal) {
        this.page = page;
        this.modal = modal;
    }

    heading() {
        return this.modal.getByRole('heading', {name: exports.SUGGESTION_LIST_HEADING, exact: true});
    }

    /** The list panel carrying the heading. */
    panel() {
        return this.modal.locator('.listPanel').filter({hasText: exports.SUGGESTION_LIST_HEADING}).first();
    }

    entries() {
        return this.panel().locator('.listPanel__item');
    }

    entry(name) {
        return this.entries().filter({hasText: name});
    }

    /** The entry's "Select Reviewer" button, by its visible text (its accessible name is register A8's). */
    selectButton(entry) {
        return entry.locator('button').filter({hasText: /Select Reviewer/});
    }

    assignedNotice(entry) {
        return entry.getByText(exports.ASSIGNED_NOTICE);
    }

    /**
     * Press an entry's "Select Reviewer" once the request form's editor is
     * initialized (the selection copies the template client-side).
     */
    async select(name) {
        await exports.waitForRequestEditors(this.page);
        await this.selectButton(this.entry(name)).click();
    }
};

exports.waitForTinyMce = waitForTinyMce;
