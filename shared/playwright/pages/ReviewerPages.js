/**
 * @file shared/playwright/pages/ReviewerPages.js
 *
 * The reviewer's side of a review assignment (spec
 * docs/specs/U28-reviewers-review.md): the "My Assignments as Reviewer"
 * list and the four-step review wizard, including the "Previous Reviews"
 * box and its round-history window. Shared by the OJS and OMP suites: the
 * screens are the same pkp-lib pages on both apps, and every app-specific
 * string (the OJS "Recommendation" list, the private box's label) sits
 * behind an option or a small method, never hard-coded from one app.
 *
 * DOM facts come from the U28 screen notes (`.reports/U28/screen-notes.md`)
 * and the pkp-lib templates under `templates/reviewer/review/`:
 * - the list is the Vue dashboard page in its reviewer flavour; its sidebar
 *   views sit OUTSIDE <main> and their link text starts with the count;
 * - the wizard's tabs are jQuery UI tabs (role=tab, aria-disabled="true"
 *   for steps not reached), the page opens on the furthest step reached;
 * - step 3's boxes are TinyMCE (type through the editor iframe, never
 *   fill() the textarea), "Submit Review" opens an in-page "Confirm"
 *   dialog BEFORE any check, and the refusal after "OK" is the box
 *   `#reviewStep3MessageBox` (review form) or a `label.error` under the
 *   OJS recommendation list;
 * - the "Previous Reviews" box is a div above the tabs with one BUTTON
 *   "Read Round N Review" per earlier round; its window is the last open
 *   dialog and renders its content a beat after the title.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {LoginPage} = require('./LoginPage.js');

/** The six sidebar views, by their `currentViewId` (Rule 2's order). */
const REVIEWER_VIEWS = {
    actionRequired: 'reviewer-action-required',
    all: 'reviewer-assignments-all',
    completed: 'reviewer-assignments-completed',
    declined: 'reviewer-assignments-declined',
    published: 'reviewer-assignments-published',
    archived: 'reviewer-assignments-archived',
};
exports.REVIEWER_VIEWS = REVIEWER_VIEWS;

/** The views' on-screen names, keyed like REVIEWER_VIEWS. */
const REVIEWER_VIEW_NAMES = {
    actionRequired: 'Action Required by me',
    all: 'All assignments',
    completed: 'Completed',
    declined: 'Declined',
    published: 'Published',
    archived: 'Archived',
};
exports.REVIEWER_VIEW_NAMES = REVIEWER_VIEW_NAMES;

/**
 * Sign in on the CONTEXT's own Login page (`/index.php/{path}/login`), the
 * one whose landing is the reviewer's list (screen notes pA: the site
 * login lands on the public home instead). The page must be signed out.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} contextPath
 * @param {string} username
 * @param {string} password
 */
exports.signInAtContext = async function signInAtContext(page, contextPath, username, password) {
    const login = new LoginPage(page);
    await page.goto(login.contextUrl(contextPath, '/login'));
    await expect(login.usernameInput).toBeVisible({timeout: 30_000});
    await login.signIn(username, password);
};

/**
 * "My Assignments as Reviewer": the sidebar group and the list it opens.
 */
exports.ReviewerAssignmentsPage = class ReviewerAssignmentsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.sidebar = page.getByRole('navigation', {name: 'Site Navigation'});
        this.reviewerGroup = this.sidebar.getByRole('region', {name: 'My Assignments as Reviewer'});
        this.editorGroup = this.sidebar.getByRole('region', {name: 'Editor Dashboard'});
        this.table = page.locator('main table');
        this.searchBox = page.getByRole('textbox', {name: /Search submissions, ID/});
        this.filtersButton = page.locator('main').getByRole('button', {name: 'Filters', exact: true});
        this.startNewSubmissionLink = this.sidebar.getByRole('link', {name: 'Start A New Submission', exact: true});
    }

    /** Every link of the sidebar, in DOM order (the group's own toggle, the six views, "Start A New Submission"). */
    sidebarLinks() {
        return this.sidebar.getByRole('link');
    }

    /** The reviewer group's six view links in the sidebar's order (their text starts with the count). */
    viewLinks() {
        return this.reviewerGroup.getByRole('treeitem').getByRole('link');
    }

    /** The table's tick boxes (bulk controls): none on the reviewer's list. */
    bulkBoxes() {
        return this.table.getByRole('checkbox');
    }

    /** Press "Filters" and return the open "Filters" window (its form holds the journal's groups). */
    async openFilters() {
        await this.filtersButton.click();
        const dialog = this.page.getByRole('dialog').filter({hasText: 'Apply Filters'});
        await expect(dialog.getByRole('button', {name: 'Apply Filters', exact: true})).toBeVisible({timeout: 30_000});
        return dialog;
    }

    /** Close the "Filters" window without applying (its header "Close"). */
    async closeFilters(dialog) {
        await dialog.getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(dialog).toBeHidden({timeout: 30_000});
    }

    /** Text shown above the table about an applied filter or search ("Filters:", "Search:"); none by default. */
    appliedFiltersText() {
        return this.page.locator('main').getByText(/^(Filters?|Search):/);
    }

    /** The list's address for a view (a key of REVIEWER_VIEWS, or a raw id). */
    url(view = 'actionRequired') {
        const id = REVIEWER_VIEWS[view] || view;
        return this.contextUrl(this.contextPath, `/dashboard/reviewAssignments?currentViewId=${id}`);
    }

    /**
     * Arm a wait for the list's own fetch (`GET …/_submissions/reviewerAssignments`),
     * before the navigation or click that starts it.
     */
    waitForList() {
        return this.page.waitForResponse(
            (r) => /\/_submissions\/reviewerAssignments\b/.test(r.url()) && r.request().method() === 'GET',
            {timeout: 30_000}
        );
    }

    /** Open a view by address and wait for its own list to arrive and render. */
    async goto(view = 'actionRequired') {
        const listed = this.waitForList();
        await this.page.goto(this.url(view));
        await listed;
        await this.expectSettled();
    }

    /**
     * The table has finished loading: the page's list fetch has answered,
     * the "Loading" row is gone and either a data cell or the empty-state
     * text is on screen. Every presence and absence read is bounded by this.
     * The fetch comes first because the table mounts showing "No Items"
     * before its fetch starts (the store's fetch is debounced and the empty
     * text reads "No Items" while nothing is loading yet, ui-library
     * `dashboardPageStore.js`, `DashboardTable.vue`), so the text alone can
     * settle on a list that has not been asked for; and a roster reviewer's
     * whole list comes in that one answer (the endpoint ignores paging).
     */
    async expectSettled() {
        await expect(this.table).toBeVisible({timeout: 30_000});
        await expect
            .poll(
                () =>
                    this.page.evaluate(() =>
                        performance
                            .getEntriesByType('resource')
                            .some((entry) => /\/_submissions\/reviewerAssignments\b/.test(entry.name))
                    ),
                {message: 'the list fetch answered', timeout: 30_000}
            )
            .toBe(true);
        await expect(this.table).not.toContainText('Loading', {timeout: 30_000});
        await expect(this.table.locator('tbody tr td').or(this.page.getByText('No Items')).first()).toBeVisible({
            timeout: 30_000,
        });
    }

    /** The page heading, "{View} ({count})". */
    heading() {
        return this.page.locator('main h1, main h2').first();
    }

    /**
     * A sidebar view's link. The link's own text carries the count FIRST
     * ("3 Action Required by me"), so it is reached through its treeitem.
     *
     * @param {string} view a key of REVIEWER_VIEWS
     */
    viewLink(view) {
        return this.reviewerGroup
            .getByRole('treeitem', {name: REVIEWER_VIEW_NAMES[view], exact: true})
            .getByRole('link');
    }

    /** Select a sidebar view and wait for that view's own list (the previous view's rows stay until it lands). */
    async selectView(view) {
        const listed = this.waitForList();
        await this.viewLink(view).click();
        await this.page.waitForURL((url) => url.searchParams.get('currentViewId') === REVIEWER_VIEWS[view], {
            waitUntil: 'commit',
        });
        await listed;
        await this.expectSettled();
    }

    /**
     * The count a sidebar view's link shows ("3 Declined" → 3). The counts
     * arrive in their own fetch (`_submissions/viewsCount`) after the links
     * render with "-" in their place, so the read waits for the number.
     */
    async viewCount(view) {
        await expect(this.viewLink(view)).toHaveText(/^\s*\d+\s/, {timeout: 30_000});
        const text = (await this.viewLink(view).innerText()).trim();
        const match = text.match(/^(\d+)\s/);
        return match ? Number(match[1]) : null;
    }

    /** A row of the list by any text it carries (the seed tag in the title). */
    row(text) {
        return this.table.getByRole('row').filter({hasText: text});
    }

    /** A row's single "Actions" button ("Respond to request", "Finish review", "View"). */
    rowAction(row, name) {
        return row.getByRole('button', {name, exact: true});
    }

    /** Every button in a row's "Actions" cell (zero for a declined or archived row). */
    rowActions(row) {
        return row.locator('td:last-child button');
    }

    /** The row's "Editorial Activity" sentence. */
    async rowActivity(row) {
        return (await row.innerText()).replace(/\s+/g, ' ').trim();
    }

    /** Open the wizard from a row's action button. */
    async openWizard(row, name) {
        await this.rowAction(row, name).click();
        await this.page.waitForURL(/\/reviewer\/submission\//, {waitUntil: 'commit'});
    }

    /** Assert which of the six views list (or do not list) a row's text. */
    async expectInViews(text, listedIn) {
        for (const view of Object.keys(REVIEWER_VIEWS)) {
            await this.goto(view);
            const count = listedIn.includes(view) ? 1 : 0;
            await expect(this.row(text), `${REVIEWER_VIEW_NAMES[view]} lists "${text}"`).toHaveCount(count);
        }
    }
};

/**
 * The review wizard (`{context}/reviewer/submission/{submissionId}`): four
 * steps, the "Previous Reviews" box and the round-history window.
 */
exports.ReviewWizardPage = class ReviewWizardPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{privateBoxLabel?: string}} [options] the app's label of the
     *   editor-only box ("For editor" on OJS, "For editor only" on OMP)
     */
    constructor(page, contextPath, options = {}) {
        super(page);
        this.contextPath = contextPath;
        this.privateBoxLabel = options.privateBoxLabel || 'For editor';

        // Header
        this.previousReviewsBox = page.locator('div').filter({has: page.getByRole('heading', {name: 'Previous Reviews', exact: true})}).last();

        // Step 1
        this.acceptButton = page.getByRole('button', {name: 'Accept Review, Continue to Step #2'});
        this.saveAndContinueButton = page.getByRole('button', {name: 'Save and continue', exact: true});
        this.declineLink = page.getByRole('link', {name: 'Decline Review Request'});
        this.privacyBox = page.locator('input[name="privacyConsent"]');
        this.privacyStatementLink = page.locator('#reviewStep1Form').getByRole('link', {name: 'privacy statement'});
        this.viewAllDetailsLink = page.getByRole('link', {name: 'View All Submission Details'});
        this.aboutDueDatesLink = page.getByRole('link', {name: 'About Due Dates'});
        this.competingInterestsLink = page.getByRole('link', {name: /Competing Interests/}).first();
        this.noCompetingInterestsRadio = page.locator('input[name="competingInterestOption"][value="noCompetingInterests"]');
        this.hasCompetingInterestsRadio = page.locator('input[name="competingInterestOption"][value="hasCompetingInterests"]');
        this.competingInterestsFrame = page.locator('iframe[id^="reviewerCompetingInterests"]');
        this.competingInterestsBody = this.competingInterestsFrame.contentFrame().locator('body');

        // Step 2
        this.continueToStep3Button = page.getByRole('button', {name: 'Continue to Step #3'});
        this.goBackLink = page.getByRole('link', {name: 'Go Back'});

        // Step 3
        this.commentsBody = page.frameLocator('iframe[id^="comments"]:not([id^="commentsPrivate"])').locator('body');
        this.privateCommentsBody = page.frameLocator('iframe[id^="commentsPrivate"]').locator('body');
        this.recommendationSelect = page.locator('select#reviewerRecommendationId');
        this.recommendationError = page.locator('label#reviewerRecommendationId-error.error');
        this.saveForLaterButton = page.getByRole('button', {name: 'Save for Later', exact: true});
        this.submitReviewButton = page.getByRole('button', {name: 'Submit Review', exact: true});
        this.messageBox = page.locator('#reviewStep3MessageBox');
        this.reviewerFilesGrid = page.locator('#reviewAttachmentsGridContainer');
        this.uploadFileLink = this.reviewerFilesGrid.getByRole('link', {name: 'Upload File', exact: true});
        // The grid keeps a hidden "No Files" body once rows exist: read the visible one.
        this.noReviewerFiles = this.reviewerFilesGrid.locator('tbody.empty');
        this.guidelinesLink = page.locator('a[id^="viewGuidelines-viewReviewGuidelines-button"]');
        this.discussionsAddButton = page.locator('main').getByRole('button', {name: 'Add', exact: true});
        this.step3Form = page.locator('#reviewStep3Form');
        this.formTextField = this.step3Form.locator('input[type="text"][name^="reviewFormResponses"]');
        this.formDropdown = this.step3Form.locator('select[name^="reviewFormResponses"]');

        // Step 4
        this.completedHeading = page.getByRole('heading', {name: 'Review Submitted'});
    }

    /** The wizard address, optionally with a typed step. */
    url(submissionId, step = null) {
        const query = step ? `?step=${step}` : '';
        return this.contextUrl(this.contextPath, `/reviewer/submission/${submissionId}${query}`);
    }

    /** Open the wizard by address and wait for its heading. */
    async goto(submissionId, {step = null} = {}) {
        await this.page.goto(this.url(submissionId, step));
        await this.expectOpen();
    }

    /** The page is headed "Review: {title}". */
    async expectOpen(title = null) {
        const name = title ? `Review: ${title}` : /^Review: /;
        await expect(this.page.getByRole('heading', {name, level: 1})).toBeVisible({timeout: 30_000});
    }

    /** A step's tab ("1. Request", …). */
    tab(step) {
        return this.page.getByRole('tab', {name: new RegExp(`^${step}\\.`)});
    }

    /**
     * Wait until `step` is current AND its panel is on screen. The steps are
     * jQuery UI remote tabs, re-fetched on every activation: the tab reads
     * `aria-selected="true"` as soon as the fetch starts, while its panel is
     * still empty (first load) or still shows the step's previous form (a
     * re-activation, as after "Save and continue"), marked `aria-busy`
     * with the tab `ui-tabs-loading` until the answer is in. A read or a
     * press before that finds no privacy box (the accept is then refused
     * in the page, "This field is required.") or hits the stale form, whose
     * answer is lost with it (the next step never opens). The panel's form
     * is live once its validator is attached, which marks it `novalidate`.
     * (ci-triage flake watch, U28 S10; .reports/flake-2026-09-29/u28s10.)
     */
    async expectStep(step) {
        const tab = this.tab(step);
        await expect(tab).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        await expect(tab).not.toHaveClass(/\bui-tabs-loading\b/, {timeout: 30_000});
        const panel = this.page.locator(`[id="${await tab.getAttribute('aria-controls')}"]`);
        await expect(panel).not.toHaveAttribute('aria-busy', 'true', {timeout: 30_000});
        await expect(panel.locator('form.pkp_form:not([novalidate])')).toHaveCount(0, {timeout: 30_000});
    }

    async expectTabDisabled(step) {
        await expect(this.tab(step)).toHaveAttribute('aria-disabled', 'true');
    }

    async expectTabEnabled(step) {
        await expect(this.tab(step)).not.toHaveAttribute('aria-disabled', 'true');
    }

    /** Select a reached step's tab (a step beyond the reached one is disabled). */
    async selectStep(step) {
        await this.tab(step).click();
        await this.expectStep(step);
    }

    /** A step's tab panel ("3. Download & Review"), read whole for what the step shows and in which order. */
    tabPanel(step) {
        return this.page.getByRole('tabpanel', {name: new RegExp(`^${step}\\.`)});
    }

    /**
     * Assert the given texts appear in the panel of `step` in this order
     * (each read on the settled panel; a missing text fails by name).
     */
    async expectOrder(step, texts) {
        const panel = this.tabPanel(step);
        for (const text of texts) {
            await expect(panel, `step ${step} shows "${text}"`).toContainText(text);
        }
        const whole = await panel.innerText();
        let from = 0;
        for (const text of texts) {
            const at = whole.indexOf(text, from);
            expect(at, `"${text}" follows the text before it on step ${step}`).toBeGreaterThanOrEqual(0);
            from = at + text.length;
        }
    }

    // ---------------------------------------------------------------------
    // Step 1 — the request
    // ---------------------------------------------------------------------

    /** The "Review Files" grid of step 1 or 3 (absent on step 1 with "Restrict File Access" on). */
    reviewFilesGrid(step) {
        return this.page.locator(`#reviewFilesStep${step}`);
    }

    /** Wait for a step's "Review Files" grid to finish its own load. */
    async expectReviewFilesSettled(step) {
        const grid = this.reviewFilesGrid(step);
        await expect(grid).toBeVisible({timeout: 30_000});
        await expect(grid).not.toContainText('Loading', {timeout: 30_000});
        await expect(grid.locator('table tbody tr td').or(grid.getByText('No Files')).first()).toBeVisible({timeout: 30_000});
    }

    /** A file's download link in a step's "Review Files" grid. */
    reviewFileLink(step, name) {
        return this.reviewFilesGrid(step).locator('a[href*="download-file"]').filter({hasText: name});
    }

    /** Press a file link and return the download it starts. */
    async downloadReviewFile(step, name) {
        const [download] = await Promise.all([
            this.page.waitForEvent('download', {timeout: 30_000}),
            this.reviewFileLink(step, name).click(),
        ]);
        return download;
    }

    /** The whole step-1 text of a labelled read-only line ("Review Type", "Review Due Date"). */
    async step1Value(label) {
        const text = await this.page.locator('#reviewStep1Form').innerText();
        const match = text.match(new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n?\\s*([^\\n]+)`));
        return match ? match[1].trim() : null;
    }

    /** "View All Submission Details": open the window and wait for its content. */
    async openSubmissionDetails() {
        await this.viewAllDetailsLink.click();
        const dialog = this.page.getByRole('dialog').last();
        await expect(dialog).toBeVisible({timeout: 30_000});
        await this.page.waitForFunction(() => {
            const dialogs = document.querySelectorAll('[role="dialog"]');
            const last = dialogs[dialogs.length - 1];
            return !!last && last.innerText.length > 120;
        }, undefined, {timeout: 30_000});
        return dialog;
    }

    /** "About Due Dates": open the dialog and return it. */
    async openAboutDueDates() {
        await this.aboutDueDatesLink.click();
        const dialog = this.page.getByRole('dialog').filter({
            hasText: 'The editor asks that you either accept or decline the review',
        });
        await expect(dialog).toBeVisible({timeout: 30_000});
        return dialog;
    }

    /** Close a legacy in-page dialog by its "OK" or "Close" control. */
    async closeDialog(dialog) {
        const ok = dialog.getByRole('button', {name: 'OK', exact: true});
        if (await ok.count()) {
            await ok.click();
        } else {
            await dialog.getByRole('button', {name: 'Close', exact: true}).click();
        }
        await expect(dialog).toBeHidden({timeout: 30_000});
    }

    /**
     * Accept the request: tick the privacy box (when shown) and press the
     * accept button; lands on step 2.
     */
    async accept({privacy = true} = {}) {
        // Step 1's panel must be in before the privacy box is counted: read
        // earlier, the count is 0, the box stays unticked and every press
        // is refused in the page (ci-triage flake watch, U28 S10).
        await this.expectStep(1);
        if (privacy && (await this.privacyBox.count())) {
            await this.privacyBox.check();
        }
        await this.acceptButton.click();
        await this.expectStep(2);
    }

    /** The "Decline Review Request" side window (its message is a TinyMCE box). */
    declineDialog() {
        return this.page.getByRole('dialog').filter({
            hasText: 'You may provide the editor with any reasons why you are declining',
        });
    }

    /** The decline window's message body (the editor iframe inside the dialog). */
    declineMessageBody() {
        return this.declineDialog().frameLocator('iframe').locator('body');
    }

    /** Open the decline window and wait for its prefilled message. */
    async openDecline() {
        await this.declineLink.click();
        const dialog = this.declineDialog();
        await expect(dialog).toBeVisible({timeout: 30_000});
        await expect(this.declineMessageBody()).not.toHaveText('', {timeout: 30_000});
        return dialog;
    }

    /**
     * Finish an OPEN decline window: append `appendText` to the prefilled
     * message (or replace it when `replace` is given), press the window's
     * button and wait for the navigation away from the wizard.
     */
    async confirmDecline({appendText = null, replace = null} = {}) {
        const dialog = this.declineDialog();
        const body = this.declineMessageBody();
        if (replace !== null) {
            await body.fill(replace);
        }
        if (appendText) {
            await body.click();
            await this.page.keyboard.press('Control+End');
            await this.page.keyboard.press('Enter');
            await body.pressSequentially(appendText);
        }
        await dialog.getByRole('button', {name: 'Decline Review Request', exact: true}).click();
        await this.page.waitForURL((url) => !url.pathname.includes('/reviewer/'), {
            timeout: 30_000,
            waitUntil: 'commit',
        });
    }

    /** Open the decline window and finish it (openDecline + confirmDecline). */
    async decline(options = {}) {
        await this.openDecline();
        await this.confirmDecline(options);
    }

    // ---------------------------------------------------------------------
    // Step 2 — guidelines
    // ---------------------------------------------------------------------

    /**
     * "Continue to Step #3", then wait for step 3's own form: the tab is
     * selected before its panel's content arrives (jQuery UI tabs load each
     * step by AJAX), so a read of the step's fields right after the tab
     * flips finds nothing (U29 S9 on CI).
     */
    async continueToStep3() {
        await this.continueToStep3Button.click();
        await this.expectStep(3);
        await expect(this.step3Form).toBeVisible({timeout: 30_000});
    }

    // ---------------------------------------------------------------------
    // Step 3 — download & review
    // ---------------------------------------------------------------------

    /**
     * Type into a TinyMCE box through the editor (a fill() bypasses the
     * model). Waits until every editor on screen reports `initialized`
     * (text typed earlier is wiped), verifies the box holds the text, then
     * flushes the editors into their textareas: a submit right after fast
     * typing once posted the statement without its tail under eight
     * workers (tojs note, 2026-09-12).
     */
    async typeInto(body, text) {
        await this.page.waitForFunction(() => {
            const mce = window.tinyMCE || window.tinymce;
            const editors = mce ? mce.get() : [];
            const shown = editors.filter((editor) => {
                const container = editor.getContainer && editor.getContainer();
                return !!container && container.getClientRects().length > 0;
            });
            return shown.length > 0 && shown.every((editor) => editor.initialized);
        }, undefined, {timeout: 30_000});
        // Content-verified bounded retry: the competing-interests editor
        // re-initializes shortly after its radio reveals it, and keystrokes
        // landing during the re-init are lost (the box keeps the head of
        // the text). A retry clears the box first and types again.
        let attempt = 0;
        await expect(async () => {
            if (attempt++ > 0) {
                await body.fill('');
            }
            await body.click();
            await body.pressSequentially(text);
            await expect(body).toContainText(text, {timeout: 3_000});
        }).toPass({intervals: [500, 1_000, 2_000], timeout: 30_000});
        await this.page.evaluate(() => {
            const mce = window.tinyMCE || window.tinymce;
            for (const editor of mce.get()) {
                if (editor.initialized) {
                    editor.fire('change');
                    editor.save();
                }
            }
        });
    }

    async typeComments(text) {
        await this.typeInto(this.commentsBody, text);
    }

    async typePrivateComments(text) {
        await this.typeInto(this.privateCommentsBody, text);
    }

    /** Pick an entry of the OJS "Recommendation" list (absent on a press). */
    async chooseRecommendation(label) {
        await this.recommendationSelect.selectOption({label});
    }

    /** A review-form radio option by its label. */
    formRadio(label) {
        return this.page.getByRole('radio', {name: label, exact: true});
    }

    /** A review-form checkbox-group option by its label. */
    formCheckbox(label) {
        return this.step3Form.getByRole('checkbox', {name: label, exact: true});
    }

    /** The labels of the OJS "Recommendation" list, in order ("Choose One" first). */
    async recommendationOptions() {
        return this.recommendationSelect.locator('option').allInnerTexts();
    }

    /** Step 3's "Review Guidelines" link: open the dialog of that name and return it. */
    async openGuidelines() {
        await this.guidelinesLink.click();
        const dialog = this.page.getByRole('dialog').filter({
            has: this.page.getByRole('heading', {name: 'Review Guidelines', exact: true}),
        });
        await expect(dialog).toBeVisible({timeout: 30_000});
        return dialog;
    }

    /** "Save for Later": press and wait for the toast. */
    async saveForLater() {
        await this.saveForLaterButton.click();
        await expect(this.page.getByText('Your changes have been saved.').first()).toBeVisible({timeout: 30_000});
    }

    /** The in-page "Confirm" dialog "Submit Review" opens. */
    confirmDialog() {
        return this.page.getByRole('dialog').filter({hasText: 'Are you sure you want to submit this review?'});
    }

    /** Press "Submit Review" and wait for the confirmation to appear. */
    async pressSubmitReview() {
        await this.submitReviewButton.click();
        const dialog = this.confirmDialog();
        await expect(dialog).toBeVisible({timeout: 30_000});
        return dialog;
    }

    /** "Submit Review" › "OK". The caller asserts what follows. */
    async submitReview() {
        const dialog = await this.pressSubmitReview();
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(dialog).toBeHidden({timeout: 30_000});
    }

    /** Step 4 is open with "Review Submitted". */
    async expectCompleted() {
        await this.expectStep(4);
        await expect(this.completedHeading).toBeVisible({timeout: 30_000});
    }

    /** Wait for the "Reviewer Files" grid's own load. */
    async expectReviewerFilesSettled() {
        const grid = this.reviewerFilesGrid;
        await expect(grid).toBeVisible({timeout: 30_000});
        await expect(grid).not.toContainText('Loading', {timeout: 30_000});
        await expect(grid.locator('table tbody tr td').or(grid.getByText('No Files')).first()).toBeVisible({timeout: 30_000});
    }

    /** A "Reviewer Files" row by file name. */
    reviewerFileRow(name) {
        return this.reviewerFilesGrid.getByRole('row').filter({hasText: name});
    }

    /**
     * Reveal a "Reviewer Files" row's controls (behind the legacy grid's
     * "Settings" toggle) and return the controls row; read its links by
     * accessible name (`getByRole('link', {name: 'Edit', exact: true})`).
     */
    async reviewerFileActions(row) {
        const toggle = row.locator('a.show_extras');
        if (await toggle.count()) {
            await toggle.click();
        }
        // The controls render in the row's next sibling, a "row_controls"
        // row (templates/controllers/grid/gridRow.tpl).
        const controls = row.locator('xpath=following-sibling::tr[contains(@class, "row_controls")][1]');
        await expect(controls).toBeVisible({timeout: 30_000});
        return controls;
    }

    /**
     * "Upload File" under step 3's "Upload": the reviewer's three-step upload
     * wizard ("1. Upload File", "2. Review Details", "3. Confirm"; no
     * file-type question, the name arrives prefilled). Attaches an in-memory
     * text file and waits for its "Reviewer Files" row.
     */
    async uploadReviewerFile(fileName) {
        const wizard = await this.openReviewerUploadWizard();
        await this.finishReviewerUpload(wizard, fileName);
    }

    /** Press "Upload File" and return the open upload wizard (its "1. Upload File" tab on screen). */
    async openReviewerUploadWizard() {
        await this.uploadFileLink.click();
        const wizard = this.page
            .getByRole('dialog')
            .filter({has: this.page.getByRole('tab', {name: '1. Upload File'})});
        await expect(wizard.getByRole('tab', {name: '1. Upload File'})).toBeVisible({timeout: 30_000});
        return wizard;
    }

    /** The upload wizard's file-type list (the editor's wizard has one; the reviewer's has none). */
    uploadGenreSelect(wizard) {
        return wizard.locator('select[id^="genreId"]');
    }

    /** Attach an in-memory text file in an OPEN upload wizard and finish its three steps. */
    async finishReviewerUpload(wizard, fileName) {
        await this.page.locator('input[type="file"]').last().setInputFiles({
            name: fileName,
            mimeType: 'text/plain',
            buffer: Buffer.from(`Reviewer file ${fileName}`),
        });
        await expect(wizard.getByRole('button', {name: /Change File/})).toBeVisible({timeout: 30_000});
        await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
        await expect(wizard.getByRole('tab', {name: '2. Review Details'})).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
        await expect(wizard.getByRole('tab', {name: '3. Confirm'})).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        await wizard.getByRole('button', {name: 'Complete', exact: true}).click();
        await expect(wizard).toBeHidden({timeout: 30_000});
        await expect(this.reviewerFileRow(fileName)).toBeVisible({timeout: 30_000});
    }

    // ---------------------------------------------------------------------
    // Previous Reviews
    // ---------------------------------------------------------------------

    /** The "Round {N} Review Submitted on …" line. */
    previousReviewLine(round) {
        return this.previousReviewsBox.locator('p').filter({hasText: `Round ${round} Review Submitted on`});
    }

    /** Every "Round {N} Review Submitted on …" line of the box. */
    previousReviewLines() {
        return this.previousReviewsBox.locator('p').filter({hasText: /Round \d+ Review Submitted on/});
    }

    /** "Read Round {N} Review": open the round-history window and wait for its content. */
    async openRoundHistory(round) {
        await this.previousReviewsBox.getByRole('button', {name: `Read Round ${round} Review`}).click();
        const dialog = this.page.getByRole('dialog').last();
        await expect(dialog).toBeVisible({timeout: 30_000});
        await this.page.waitForFunction(() => {
            const dialogs = document.querySelectorAll('[role="dialog"]');
            const last = dialogs[dialogs.length - 1];
            return !!last && last.innerText.length > 150;
        }, undefined, {timeout: 30_000});
        return dialog;
    }

    /** Close the round-history window (its header "Close" is the only control). */
    async closeRoundHistory(dialog) {
        await dialog.getByRole('button', {name: 'Close', exact: true}).click();
        await expect(dialog).toBeHidden({timeout: 30_000});
    }
};
