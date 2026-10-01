// @ts-check
/**
 * @file shared/playwright/pages/IssuesPages.js
 *
 * Page objects for the Issues feature (spec: docs/specs/U50-issues.md).
 * Issues are a journal's alone, so only the OJS suite drives these; they
 * sit in the shared tree beside `IdentifiersPages.js`, whose `IssuesPage`
 * and `PublishIssueWindow` (U44) they extend rather than duplicate.
 *
 * Surfaces:
 * - IssuesAdmin (extends U44's IssuesPage) — the "Issues" page
 *   (`/manageIssues`): the "Future Issues" and "Back Issues" tabs, each
 *   list's rows (name link, "Published", "Items"), "No Items", "Create
 *   Issue", "Order" with its drag, "Done" and "Cancel ordering", a row's
 *   arrow and its control links, the in-page questions ("Unpublish
 *   Issue", "Current Issue", "Delete") and the "Preview" / "View" tab.
 * - IssueForm — the form of "Create Issue" and of the "Issue Data" tab
 *   (`form#issueForm`): "Date Published", "Volume", "Number", "Year",
 *   "Title" and their four show boxes, "Description" (TinyMCE), "Cover
 *   image" (upload, image, "Alternate text", "Delete"), "URL Path",
 *   "Save" and the form's "Cancel"; a message under a box.
 * - IssueWindow (extends U44's LegacyIdentifiersWindow) — the "Issue
 *   Management: {name}" window: its tabs, the "Table of Contents" tab
 *   (sections, articles, "Open Access", "Order", "Submission",
 *   "Remove"), "Issue Data" (an IssueForm), "Issue Galleys" (the list,
 *   "Create Issue Galley", "Order", "Edit", "Delete") and "Access".
 * - IssueGalleyWindow — "Create Issue Galley" / "Edit Issue Galley".
 * - PublishIssueDialog (extends U44's PublishIssueWindow) — "Publish
 *   Issue": its box, its question, "Cancel" and "OK".
 * - IssueReader — the reader side: the header's "Current" and
 *   "Archives", the issue's page (breadcrumb, heading, "Preview",
 *   cover, description, "Published:", "Full Issue", sections), the "No
 *   Current Issue" page, "Archives" and its issue summaries, the
 *   access-denied page, and the site's home page's journal entries.
 *   The article summaries inside a table of contents are
 *   ArticleLandingPages' `ArticleSummaries`; the PDF reader is its
 *   `GalleyReaderPage`.
 *
 * Browser dialogs (the "Issue Data" tab's "The data on this form has
 * changed…" confirm) are the caller's: register SubmissionFilesPages'
 * `recordBrowserDialogs` before a step that may ask.
 *
 * DOM shapes (U50 claim check, `.reports/U50/screen-notes.md` ccK1–ccK3,
 * and the tojs probes, 2026-09-25): every list is a legacy pkp grid
 * (rows `tr.gridRow`, a row's controls in the next `tr` after the arrow
 * `a.show_extras` is pressed, the name or label in the first cell's
 * `.gridCellContainer`); a table-of-contents section row is a
 * `tr.gridRow` without `.has_extras`; "Order" is `.pkp_linkaction_orderItems`,
 * its "Done" `.order_finish_controls .saveButton` (POST
 * `save-sequence`) and "Cancel ordering" `.cancelFormButton`; the in-page
 * questions are dialogs with "OK" and "Cancel" buttons; a refused or
 * accepted save of "Create Issue" / "Issue Data" shows its message only as
 * a passing notice `.app__notifications .pkpNotification`, and a box's
 * own message is a `label.error` under it. The reader pages have no
 * `main` landmark on some screens, so they are read through the default
 * theme's classes (`.obj_issue_toc`, `.obj_issue_summary`,
 * `.cmp_breadcrumbs`, `.pkp_navigation_primary`).
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {
    IssuesPage,
    PublishIssueWindow,
    LegacyIdentifiersWindow,
    pastCloseWindow,
    questionDialog,
    answerQuestion,
} = require('./IdentifiersPages.js');

const T = 30_000;

/** The journal's strings (OJS and lib/pkp locales). */
const TEXT = {
    noItems: 'No Items',
    saved: 'Your changes have been saved.',
    dateHelp: 'If left empty, the date will be set automatically when the issue is published.',
    identificationRequired:
        'Issue identification is required. Please select at least one of the issue identification options.',
    volumeRequired: 'Volume is required and must be a positive, numeric value.',
    numberRequired: 'Number is required and must be a positive, numeric value.',
    yearRequired: 'Year is required and must be a positive, numeric value.',
    titleRequired: 'Title is required for the issue.',
    dateRequired: 'Date Published is required when the issue is published.',
    urlPathNumber: 'The URL path can not be a number.',
    urlPathUsed: 'The URL path has already been used and can not be used again.',
    urlPathChars: 'This may only contain letters, numbers, dashes, underscores and periods.',
    coverFormat: 'Invalid cover page format. Accepted formats are .gif, .jpg, or .png.',
    confirmDelete: 'Are you sure you wish to delete this item? This action cannot be undone.',
    formChanged: 'The data on this form has changed. Do you wish to continue without saving?',
    mailBox: 'Send an email about this to all registered users.',
    publishQuestion: 'Are you sure you want to publish the new issue?',
    unpublishQuestion: 'Are you sure you want to unpublish this published issue?',
    currentQuestion: 'Are you sure you want to set this issue as current?',
    removeTitle: 'Remove Article From Issue',
    removeQuestion:
        'Are you sure you wish to remove this article from the issue? The article will be available for scheduling in another issue.',
    fileRequired: 'A file upload is required.',
    fieldRequired: 'This field is required.',
    preview: 'Preview',
    noCurrentIssue: 'No Current Issue',
    noIssues: 'This journal has not published any issues.',
    fullIssue: 'Full Issue',
    notOnline: 'This journal does not publish its content online.',
    justPublished: (issue, journal) => `Just published: ${issue} of ${journal}`,
};
exports.ISSUES_TEXT = TEXT;

/** A whole-text matcher (trimmed, inner white space collapsed by the caller). */
function whole(text) {
    return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

/** The requests the screens send, for `waitForResponse`. */
const REQUEST = {
    saveIssue: /update-issue/,
    uploadCover: /issues\/(future|back)-issue-grid\/upload-file/,
    deleteCover: /delete-cover-image/,
    publish: /publish-issue/,
    unpublish: /unpublish-issue/,
    current: /set-current-issue/,
    deleteIssue: /delete-issue/,
    removeArticle: /remove-article/,
    openAccess: /set-access-status/,
    saveAccess: /update-access/,
    saveSequence: /save-sequence/,
    galleyUpload: /issue-galley-grid\/upload/,
    galleySave: /issue-galley-grid\/update/,
    galleyDelete: /issue-galley-grid\/delete/,
};
exports.ISSUES_REQUEST = REQUEST;

/** Wait for the POST whose address matches `pattern`; returns its response. */
function postTo(page, pattern) {
    return page.waitForResponse((r) => pattern.test(r.url()) && r.request().method() === 'POST', {timeout: T});
}

/**
 * A passing notice at the top right (`.pkpNotification`), by its text.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
function notice(page, text) {
    return page.locator('.app__notifications .pkpNotification').filter({hasText: text});
}
exports.notice = notice;

/**
 * The visible rows of a legacy grid, read as text in order: a section
 * row (no row arrow) as `# {title}`, any other row as its first cell.
 *
 * @param {import('@playwright/test').Locator} grid
 */
async function gridOutline(grid) {
    return grid.evaluate((root) =>
        [...root.querySelectorAll('tr.gridRow')]
            .filter((tr) => tr.getClientRects().length)
            .map((tr) => {
                const cell = tr.querySelector('td .gridCellContainer');
                const text = ((cell && cell.textContent) || '').replace(/\s+/g, ' ').trim();
                return tr.classList.contains('has_extras') ? text : `# ${text}`;
            })
    );
}

/**
 * Drag a legacy grid row (in the grid's ordering mode) above `target`,
 * with mouse steps so jQuery UI's sortable sees the pointer travel.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} moving
 * @param {import('@playwright/test').Locator} target
 */
async function dragRowAbove(page, moving, target) {
    await moving.scrollIntoViewIfNeeded();
    const from = await moving.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) {
        throw new Error('dragRowAbove: a row has no box');
    }
    const x = from.x + 40;
    await page.mouse.move(x, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, from.y + from.height / 2 - 6, {steps: 4});
    await page.mouse.move(x, to.y + 4, {steps: 20});
    await page.mouse.move(x, to.y - 8, {steps: 6});
    await page.mouse.up();
}

/**
 * Drag a legacy grid row below `target` (the mirror of dragRowAbove).
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} moving
 * @param {import('@playwright/test').Locator} target
 */
async function dragRowBelow(page, moving, target) {
    await moving.scrollIntoViewIfNeeded();
    const from = await moving.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) {
        throw new Error('dragRowBelow: a row has no box');
    }
    const x = from.x + 40;
    await page.mouse.move(x, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, from.y + from.height / 2 + 6, {steps: 4});
    await page.mouse.move(x, to.y + to.height - 4, {steps: 20});
    await page.mouse.move(x, to.y + to.height + 8, {steps: 6});
    await page.mouse.up();
}

/**
 * Reveal a grid row's controls (behind its arrow) and return their row.
 * The arrow's handler binds after the grid renders, so a press that
 * leaves the controls hidden is repeated (patterns.md pitfall 10).
 *
 * @param {import('@playwright/test').Locator} row
 */
async function rowControls(row) {
    await expect(row).toBeVisible({timeout: T});
    const controls = row.locator('xpath=following-sibling::tr[contains(@class,"row_controls")][1]');
    for (let attempt = 0; attempt < 3; attempt++) {
        if (await controls.isVisible()) {
            return controls;
        }
        const toggle = row.locator('a.show_extras');
        if (await toggle.count()) {
            await toggle.click();
        }
        try {
            await expect(controls).toBeVisible({timeout: 10_000});
            return controls;
        } catch (e) {
            if (attempt === 2) throw e;
        }
    }
    return controls;
}

/** The ordering mode of a legacy grid: "Order", then "Done" or "Cancel ordering". */
class GridOrdering {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('@playwright/test').Locator} scope the grid's container
     */
    constructor(page, scope) {
        this.page = page;
        this.scope = scope;
    }

    /** "Order" above the list. */
    orderLink() {
        return this.scope.locator('.pkp_linkaction_orderItems').first();
    }

    /** "Done". */
    doneLink() {
        return this.scope.locator('.order_finish_controls .saveButton').first();
    }

    /** "Cancel ordering". */
    cancelLink() {
        return this.scope.locator('.order_finish_controls .cancelFormButton').first();
    }

    /** Press "Order": the list enters ordering mode ("Done" shows). */
    async start() {
        await this.orderLink().click();
        await expect(this.doneLink()).toBeVisible({timeout: T});
    }

    /** Press "Done": bounded by the order's save. */
    async done() {
        const saved = postTo(this.page, REQUEST.saveSequence);
        await this.doneLink().click();
        const response = await saved;
        await expect(this.doneLink()).toBeHidden({timeout: T});
        await waitForJQueryIdle(this.page);
        return response;
    }

    /** Press "Cancel ordering": the list leaves ordering mode. */
    async cancel() {
        await this.cancelLink().click();
        await expect(this.doneLink()).toBeHidden({timeout: T});
        await waitForJQueryIdle(this.page);
    }
}
exports.GridOrdering = GridOrdering;

// ---------------------------------------------------------------------------
// The "Issues" page
// ---------------------------------------------------------------------------

class IssuesAdmin extends IssuesPage {
    /** The Issues page's address. */
    url() {
        return this.contextUrl(this.contextPath, '/manageIssues');
    }

    /** A tab of the page ("Future Issues", "Back Issues"). */
    tab(name) {
        return this.page.getByRole('main').getByRole('tab', {name, exact: true});
    }

    /** A tab's panel. */
    panel(name) {
        return this.page.getByRole('tabpanel', {name, exact: true});
    }

    /** A tab's list (its grid). */
    grid(name) {
        return this.panel(name).locator('.pkp_controllers_grid').first();
    }

    /**
     * Open the page (by address) on `tab`, its list loaded.
     *
     * @param {'Future Issues'|'Back Issues'} [tab]
     */
    async goto(tab = 'Future Issues') {
        await this.page.goto(this.url());
        await this.showTab(tab);
    }

    /** Press a tab and wait for its list. */
    async showTab(name) {
        await this.tab(name).click();
        await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true');
        await expect(this.grid(name).locator('table')).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** "No Items" in a tab's list. */
    noItems(tab) {
        return this.grid(tab).locator('tbody.empty td').filter({hasText: TEXT.noItems});
    }

    /** The rows of a tab's list. */
    rows(tab) {
        return this.grid(tab).locator('tr.gridRow').filter({visible: true});
    }

    /** The issue names of a tab's list, in order (a locator for `toHaveText`). */
    names(tab) {
        return this.rows(tab).locator('[id$="-identification"] a');
    }

    /** A row by the issue's exact name. */
    issueRow(tab, name) {
        return this.rows(tab).filter({has: this.page.getByRole('link', {name, exact: true})});
    }

    /** A row's "Items". */
    items(tab, name) {
        return this.issueRow(tab, name).locator('[id$="-numArticles"]');
    }

    /** A "Back Issues" row's "Published". */
    published(name) {
        return this.issueRow('Back Issues', name).locator('[id$="-published"]');
    }

    /** The editorial side menu ("Site Navigation"). */
    sideMenu() {
        return this.page.getByRole('navigation', {name: 'Site Navigation'});
    }

    /** A side-menu group's region by the group's name ("Content"); every group's entries are in the DOM. */
    async sideMenuGroup(name) {
        const header = this.sideMenu().locator(`[role="button"][aria-label="${name}"]`);
        await expect(header).toHaveCount(1, {timeout: T});
        const id = await header.getAttribute('aria-controls');
        return {header, region: this.sideMenu().locator(`[id="${id}"]`)};
    }

    /** A side-menu entry by its name (in any group, open or closed). */
    sideMenuEntry(name) {
        return this.sideMenu().locator(`[role="treeitem"][aria-label="${name}"]`);
    }

    /** The side-menu entry that opens the Issues page (Statistics has an "Issues" of its own). */
    issuesEntry() {
        return this.sideMenuEntry('Issues').filter({has: this.page.locator('a[href$="/manageIssues"]')});
    }

    /** Open the editorial dashboard (the side menu's page). */
    async gotoDashboard() {
        await this.page.goto(this.contextUrl(this.contextPath, '/dashboard/editorial'));
        await expect(this.sideMenu()).toBeVisible({timeout: T});
    }

    /** Press the side menu's "Content" › "Issues": the Issues page. */
    async openFromSideMenu() {
        const {header, region} = await this.sideMenuGroup('Content');
        const entry = region.getByRole('link', {name: 'Issues', exact: true});
        if (!(await entry.isVisible())) {
            await header.click();
        }
        await entry.click();
        await expect(this.page).toHaveURL(/\/manageIssues/);
        await expect(this.grid('Future Issues').locator('table')).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** "Create Issue". */
    createLink() {
        return this.panel('Future Issues').getByRole('link', {name: 'Create Issue', exact: true});
    }

    /** "Back Issues"' ordering mode. */
    backOrdering() {
        return new GridOrdering(this.page, this.grid('Back Issues'));
    }

    /** Drag a "Back Issues" row above another (in ordering mode). */
    async dragBackIssueAbove(name, target) {
        await dragRowAbove(this.page, this.issueRow('Back Issues', name), this.issueRow('Back Issues', target));
    }

    /** Press a row's arrow; returns the control row. */
    async openRowControls(tab, name) {
        return rowControls(this.issueRow(tab, name));
    }

    /** The visible control links of a row, in order (after `openRowControls`). */
    async rowActionNames(tab, name) {
        const controls = await this.openRowControls(tab, name);
        return (await controls.locator('a').filter({visible: true}).allInnerTexts()).map((t) => t.trim());
    }

    /** A row's control link by name (after `openRowControls`). */
    async rowLink(tab, name, link) {
        const controls = await this.openRowControls(tab, name);
        return controls.getByRole('link', {name: link, exact: true});
    }

    /** Press a row's control link. */
    async pressRowLink(tab, name, link) {
        await (await this.rowLink(tab, name, link)).click();
    }

    /** Press "Create Issue": the window's form. */
    async openCreate() {
        await this.createLink().click();
        const dialog = this.page.getByRole('dialog', {name: 'Create Issue', exact: true});
        const form = new IssueForm(this.page, dialog.locator('form#issueForm'));
        await expect(form.volumeBox()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
        return {dialog, form};
    }

    /** Open a row's "Edit" ("Issue Management: {name}", on "Table of Contents"). */
    async openManagement(tab, name) {
        await this.pressRowLink(tab, name, 'Edit');
        const win = new IssueWindow(this.page, this.editWindow(name));
        await win.expectOpen();
        return win;
    }

    /** Open the window by the row's name link. */
    async openManagementByName(tab, name) {
        await this.issueRow(tab, name).getByRole('link', {name, exact: true}).click();
        const win = new IssueWindow(this.page, this.editWindow(name));
        await win.expectOpen();
        return win;
    }

    /** Open a row's "Publish Issue" window. */
    async openPublish(name) {
        await this.pressRowLink('Future Issues', name, 'Publish Issue');
        const win = new PublishIssueDialog(this.page);
        await expect(win.mailBox()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
        return win;
    }

    /**
     * Press a row's link that asks a question ("Unpublish Issue",
     * "Current Issue", "Delete"); returns the question's dialog.
     */
    async openQuestion(tab, name, link, question) {
        await this.pressRowLink(tab, name, link);
        const dialog = questionDialog(this.page, question);
        await expect(dialog).toBeVisible({timeout: T});
        return dialog;
    }

    /** Answer a question with "OK" (bounded by `request`) or "Cancel". */
    async answer(dialog, answer, request) {
        return answerQuestion(this.page, dialog, answer, request);
    }

    /**
     * Press a row's "Preview" or "View": the issue's page in a new tab,
     * loaded.
     */
    async openInNewTab(tab, name, link) {
        const opened = this.page.context().waitForEvent('page', {timeout: T});
        await this.pressRowLink(tab, name, link);
        const popup = await opened;
        await popup.waitForLoadState('domcontentloaded');
        return popup;
    }
}
exports.IssuesAdmin = IssuesAdmin;

// ---------------------------------------------------------------------------
// The "Create Issue" / "Issue Data" form
// ---------------------------------------------------------------------------

class IssueForm extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('@playwright/test').Locator} form `form#issueForm`
     */
    constructor(page, form) {
        super(page);
        this.form = form;
    }

    /** "Date Published". */
    dateBox() {
        return this.form.getByRole('group', {name: 'Date Published'}).getByRole('textbox');
    }

    /**
     * Type into "Date Published" from the keyboard (select all, delete,
     * the new value, then Tab away). The box is a jQuery UI date picker
     * whose hidden twin (`datePublished`, what "Save" posts) follows only
     * key presses: a `fill()` changes the visible box alone.
     */
    async typeDate(value) {
        const box = this.dateBox();
        await box.click();
        await this.page.keyboard.press('ControlOrMeta+a');
        await this.page.keyboard.press('Delete');
        if (value) {
            await box.pressSequentially(value);
        }
        await this.page.keyboard.press('Tab');
    }

    /** The help line (or its message) under "Date Published". */
    dateLine() {
        return this.form.getByRole('group', {name: 'Date Published'}).locator('label.sub_label');
    }

    volumeBox() {
        return this.form.locator('input[name="volume"]');
    }

    numberBox() {
        return this.form.locator('input[name="number"]');
    }

    yearBox() {
        return this.form.locator('input[name="year"]');
    }

    /** "Title" (the form language's box; it has no accessible name). */
    titleBox() {
        return this.form.locator('input[name^="title["]').first();
    }

    /** A show box ("Volume", "Number", "Year", "Title"). */
    showBox(label) {
        return this.form.getByRole('checkbox', {name: label, exact: true});
    }

    /** Tick or untick show boxes: `{Volume: false, …}`. */
    async setShowBoxes(states) {
        for (const [label, want] of Object.entries(states)) {
            await this.showBox(label).setChecked(want);
        }
    }

    /** "Description"'s editor body. */
    descriptionBody() {
        return this.form.getByRole('group', {name: 'Description'}).frameLocator('iframe').locator('body');
    }

    /** Type into "Description" (the editor initialized first). */
    async typeDescription(text) {
        const body = this.descriptionBody();
        await expect(body).toBeVisible({timeout: T});
        await expect
            .poll(
                () =>
                    this.form.evaluate((form) => {
                        const area = form.querySelector('textarea[name^="description"]');
                        const editor = area && /** @type {any} */ (window).tinymce?.get(area.id);
                        return Boolean(editor && editor.initialized);
                    }),
                {timeout: T}
            )
            .toBe(true);
        await body.click();
        await body.pressSequentially(text);
    }

    /**
     * The editor's content as text, read once the editor exists and is
     * initialized (a form just opened creates it after drawing the
     * textarea; before that the read is null,
     * .reports/flake-s26/fixC/diagnosis.md).
     */
    async descriptionText() {
        await expect
            .poll(
                () =>
                    this.form.evaluate((form) => {
                        const area = form.querySelector('textarea[name^="description"]');
                        const editor = area && /** @type {any} */ (window).tinymce?.get(area.id);
                        return Boolean(editor && editor.initialized);
                    }),
                {timeout: T}
            )
            .toBe(true);
        return this.form.evaluate((form) => {
            const area = form.querySelector('textarea[name^="description"]');
            const editor = area && /** @type {any} */ (window).tinymce?.get(area.id);
            return editor ? editor.getContent({format: 'text'}).trim() : null;
        });
    }

    /** The "Cover image" area. */
    coverArea() {
        return this.form.getByRole('group', {name: 'Cover image'});
    }

    /** The stored cover's image. */
    coverImage() {
        return this.coverArea().locator('img');
    }

    /** "Alternate text". */
    altTextBox() {
        return this.form.locator('input[name^="coverImageAltText"]').first();
    }

    /** The cover's "Delete". */
    coverDeleteLink() {
        return this.coverArea().getByRole('link', {name: 'Delete', exact: true});
    }

    /** "Upload File" with a fixture: the file uploads at once. */
    async uploadCover(file) {
        const uploaded = postTo(this.page, REQUEST.uploadCover);
        await this.coverArea().locator('input[type="file"]').first().setInputFiles(file);
        const response = await uploaded;
        await waitForJQueryIdle(this.page);
        return response;
    }

    /** "URL Path". */
    urlPathBox() {
        return this.form.locator('input[name="urlPath"]');
    }

    saveButton() {
        return this.form.getByRole('button', {name: 'Save', exact: true});
    }

    /** The form's own "Cancel" (a link). */
    cancelLink() {
        return this.form.getByRole('link', {name: 'Cancel', exact: true});
    }

    /** A message under a box (`label.error`). */
    fieldError(text) {
        return this.form.locator('label.error').filter({hasText: text});
    }

    /** Every message under a box. */
    fieldErrors() {
        return this.form.locator('label.error');
    }

    /** Press "Save": bounded by the save's answer. */
    async save() {
        const saved = postTo(this.page, REQUEST.saveIssue);
        await this.saveButton().click();
        const response = await saved;
        await waitForJQueryIdle(this.page);
        return response;
    }

    /**
     * Press "Save" on a form that refuses: the notice `message` shows and
     * the form stays (re-rendered).
     */
    async saveRefused(message) {
        await this.save();
        await expect(notice(this.page, message).first()).toBeVisible({timeout: T});
        await expect(this.saveButton()).toBeVisible();
    }
}
exports.IssueForm = IssueForm;

// ---------------------------------------------------------------------------
// "Issue Management: {name}"
// ---------------------------------------------------------------------------

class IssueWindow extends LegacyIdentifiersWindow {
    /** The window is open on a tab, its content loaded. */
    async expectOpen() {
        await expect(this.tab('Table of Contents')).toBeVisible({timeout: T});
        await expect(this.dialog.locator('[role="tabpanel"]:visible .pkp_controllers_grid, [role="tabpanel"]:visible form').first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** A tab's panel. */
    panel(name) {
        return this.dialog.getByRole('tabpanel', {name, exact: true});
    }

    /** The selected tab. */
    selectedTab() {
        return this.dialog.locator('[role="tab"][aria-selected="true"]');
    }

    /** Press a tab and wait for its content (a list or a form). */
    async openTab(name) {
        await this.tab(name).click();
        await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await expect(this.panel(name).locator('.pkp_controllers_grid, form').first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
        return this.panel(name);
    }

    // --- "Table of Contents" ------------------------------------------------

    tocGrid() {
        return this.panel('Table of Contents').locator('.pkp_controllers_grid').first();
    }

    /** The list's column headings. */
    tocColumns() {
        return this.tocGrid().locator('thead th');
    }

    /** The list read in order: `# {section}` and article titles. */
    async tocOutline() {
        return gridOutline(this.tocGrid());
    }

    /** An article's row. */
    articleRow(title) {
        return this.tocGrid()
            .locator('tr.gridRow.has_extras')
            .filter({has: this.page.locator('.gridCellContainer', {hasText: whole(title)})});
    }

    /** An article's "Open Access" box. */
    openAccessBox(title) {
        return this.articleRow(title).locator('input[type="checkbox"]');
    }

    /** Tick an article's "Open Access": bounded by its save. */
    async tickOpenAccess(title) {
        const saved = postTo(this.page, REQUEST.openAccess);
        // The grid redraws the row on the answer, so a `check()` that reads
        // the box back at once sees the old one: a plain click, then the save.
        await this.openAccessBox(title).click();
        const response = await saved;
        await waitForJQueryIdle(this.page);
        return response;
    }

    /** "No Items" on the tab. */
    tocNoItems() {
        return this.tocGrid().locator('tbody.empty td').filter({hasText: TEXT.noItems});
    }

    /** The tab's ordering mode. */
    tocOrdering() {
        return new GridOrdering(this.page, this.tocGrid());
    }

    /** Drag an article row above or below another (in ordering mode). */
    async dragArticle(title, target, where = 'above') {
        const drag = where === 'above' ? dragRowAbove : dragRowBelow;
        await drag(this.page, this.articleRow(title), this.articleRow(target));
    }

    /** An article row's control link ("Submission", "Remove"). */
    async articleLink(title, link) {
        const controls = await rowControls(this.articleRow(title));
        return controls.getByRole('link', {name: link, exact: true});
    }

    /** "Remove" on an article: the question it asks (not answered). */
    async openRemove(title) {
        await (await this.articleLink(title, 'Remove')).click();
        const dialog = this.page.getByRole('dialog', {name: TEXT.removeTitle});
        await expect(dialog).toBeVisible({timeout: T});
        return dialog;
    }

    // --- "Issue Data" ----------------------------------------------------------

    /**
     * Open "Issue Data": its form. A save the server accepts closes the
     * whole "Issue Management" window, so a later tab means reopening it
     * (issues w30, 2026-10-01).
     */
    async openData() {
        const panel = await this.openTab('Issue Data');
        const form = new IssueForm(this.page, panel.locator('form#issueForm'));
        await expect(form.volumeBox()).toBeVisible({timeout: T});
        return form;
    }

    // --- "Issue Galleys" -------------------------------------------------------

    galleyGrid() {
        return this.panel('Issue Galleys').locator('.pkp_controllers_grid').first();
    }

    /** The galleys' labels in order (a locator for `toHaveText`). */
    galleyLabels() {
        return this.galleyGrid().locator('tr.gridRow').filter({visible: true}).locator('td.first_column .gridCellContainer');
    }

    galleyNoItems() {
        return this.galleyGrid().locator('tbody.empty td').filter({hasText: TEXT.noItems});
    }

    createGalleyLink() {
        return this.panel('Issue Galleys').getByRole('link', {name: 'Create Issue Galley', exact: true});
    }

    galleyRow(label) {
        return this.galleyGrid()
            .locator('tr.gridRow')
            .filter({has: this.page.locator('.gridCellContainer', {hasText: whole(label)})});
    }

    galleyOrdering() {
        return new GridOrdering(this.page, this.galleyGrid());
    }

    async dragGalleyAbove(label, target) {
        await dragRowAbove(this.page, this.galleyRow(label), this.galleyRow(target));
    }

    /** Press "Create Issue Galley": its window. */
    async openCreateGalley() {
        await this.createGalleyLink().click();
        const win = new IssueGalleyWindow(this.page, 'Create Issue Galley');
        await win.expectOpen();
        return win;
    }

    /** A galley row's "Edit": its window. */
    async openEditGalley(label) {
        const controls = await rowControls(this.galleyRow(label));
        await controls.getByRole('link', {name: 'Edit', exact: true}).click();
        const win = new IssueGalleyWindow(this.page, 'Edit Issue Galley');
        await win.expectOpen();
        return win;
    }

    /** A galley row's "Delete": the question (not answered). */
    async openDeleteGalley(label) {
        const controls = await rowControls(this.galleyRow(label));
        await controls.getByRole('link', {name: 'Delete', exact: true}).click();
        const dialog = questionDialog(this.page, TEXT.confirmDelete);
        await expect(dialog).toBeVisible({timeout: T});
        return dialog;
    }

    // --- "Access" --------------------------------------------------------------

    /**
     * Open "Access": its form. Its accepted "Save" closes the whole "Issue
     * Management" window, as "Issue Data"'s does: reopen it for another tab
     * (issues w7, w12, 2026-09-30).
     */
    async openAccess() {
        const panel = await this.openTab('Access');
        return panel.locator('form#issueAccessForm');
    }
}
exports.IssueWindow = IssueWindow;

// ---------------------------------------------------------------------------
// "Create Issue Galley" / "Edit Issue Galley"
// ---------------------------------------------------------------------------

class IssueGalleyWindow extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} title the window's title
     */
    constructor(page, title) {
        super(page);
        this.dialog = page.getByRole('dialog', {name: title, exact: true});
        this.form = this.dialog.locator('form').filter({has: page.locator('input[name="label"]')});
    }

    async expectOpen() {
        await expect(this.labelBox()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** "Galley Label" (no accessible name). */
    labelBox() {
        return this.dialog.locator('input[name="label"]');
    }

    /** "Language". */
    localeSelect() {
        return this.dialog.locator('select[name="galleyLocale"]');
    }

    /** "URL Path". */
    urlPathBox() {
        return this.dialog.locator('input[name="urlPath"]');
    }

    /** The stored file's link under "Issue Galley" (its original name). */
    fileLink(name) {
        return this.dialog.getByRole('link', {name, exact: true});
    }

    /** "Upload File" with a fixture: the file uploads at once. */
    async upload(file) {
        const uploaded = postTo(this.page, REQUEST.galleyUpload);
        await this.dialog.locator('input[type="file"]').first().setInputFiles(file);
        const response = await uploaded;
        await waitForJQueryIdle(this.page);
        return response;
    }

    /** A message under a box (`label.error`). */
    fieldError(text) {
        return this.dialog.locator('label.error').filter({hasText: text});
    }

    saveButton() {
        return this.dialog.getByRole('button', {name: 'Save', exact: true});
    }

    /** Press "Save" on a form the server accepts: the window closes. */
    async save() {
        const saved = postTo(this.page, REQUEST.galleySave);
        await this.saveButton().click();
        const response = await saved;
        await expect(this.dialog).toHaveCount(0, {timeout: T});
        await waitForJQueryIdle(this.page);
        await pastCloseWindow(this.page);
        return response;
    }

    /** Press "Save" on a form the server refuses: the notice shows, the window stays. */
    async saveRefusedByServer(message) {
        const saved = postTo(this.page, REQUEST.galleySave);
        await this.saveButton().click();
        await saved;
        await waitForJQueryIdle(this.page);
        await expect(notice(this.page, message).first()).toBeVisible({timeout: T});
        await expect(this.dialog).toBeVisible();
    }

    /** The form's "Cancel". */
    async cancel() {
        await this.dialog.getByRole('link', {name: 'Cancel', exact: true}).click();
        await expect(this.dialog).toHaveCount(0, {timeout: T});
        await waitForJQueryIdle(this.page);
        await pastCloseWindow(this.page);
    }
}
exports.IssueGalleyWindow = IssueGalleyWindow;

// ---------------------------------------------------------------------------
// "Publish Issue"
// ---------------------------------------------------------------------------

class PublishIssueDialog extends PublishIssueWindow {
    /** The window's question. */
    question() {
        return this.dialog().getByText(TEXT.publishQuestion, {exact: true});
    }

    /** The mail box's label. */
    mailBoxLabel() {
        return this.dialog().getByRole('checkbox', {name: TEXT.mailBox, exact: true});
    }

    /** The window's content in reading order: the box, the question, "Cancel", "OK". */
    async outline() {
        return this.dialog().evaluate((d) => {
            const form = d.querySelector('form') || d;
            return [...form.querySelectorAll('input[type="checkbox"], p, a, button')]
                .filter((e) => e.getClientRects().length)
                .map((e) =>
                    e.tagName === 'INPUT'
                        ? `[${/** @type {HTMLInputElement} */ (e).checked ? 'x' : ' '}] ${((e.closest('label') || e.parentElement)?.textContent || '').replace(/\s+/g, ' ').trim()}`
                        : (e.textContent || '').replace(/\s+/g, ' ').trim()
                )
                .filter(Boolean);
        });
    }

    /** "Cancel": the window closes, nothing sent. */
    async cancel() {
        await this.dialog().getByRole('link', {name: 'Cancel', exact: true}).click();
        await expect(this.dialog()).toHaveCount(0, {timeout: T});
        await waitForJQueryIdle(this.page);
        await pastCloseWindow(this.page);
    }
}
exports.PublishIssueDialog = PublishIssueDialog;

// ---------------------------------------------------------------------------
// The reader side
// ---------------------------------------------------------------------------

class IssueReader extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    /** The journal's address followed by `tail` ("issue/view/7"). */
    url(tail = '') {
        return this.contextUrl(this.contextPath, tail ? `/${tail}` : '');
    }

    /** An issue page's address by its ID or URL Path. */
    issueUrl(idOrPath) {
        return this.url(`issue/view/${idOrPath}`);
    }

    /** Open an address of the journal. */
    async goto(tail = '') {
        return this.page.goto(this.url(tail));
    }

    /** Open the journal's home page. */
    async gotoHome() {
        await this.page.goto(this.url('index'));
        await expect(this.page.locator('.pkp_structure_main')).toBeVisible({timeout: T});
    }

    /** A header link ("Current", "Archives"). */
    headerLink(name) {
        return this.page.locator('.pkp_navigation_primary').getByRole('link', {name, exact: true});
    }

    /** The header's links (all of them, a locator for a positive control). */
    headerLinks() {
        return this.page.locator('.pkp_navigation_primary a');
    }

    /** Press a header link and wait for the page. */
    async pressHeader(name) {
        await this.headerLink(name).click({timeout: T});
        await expect(this.heading()).toBeVisible({timeout: T});
    }

    /** The page's heading. */
    heading() {
        return this.page.locator('.pkp_structure_main h1').first();
    }

    /** The breadcrumb's text. */
    breadcrumb() {
        return this.page.locator('.cmp_breadcrumbs');
    }

    /** The page's notices (".cmp_notification"). */
    notices() {
        return this.page.locator('.pkp_structure_main .cmp_notification');
    }

    // --- the issue's page -------------------------------------------------

    toc() {
        return this.page.locator('.obj_issue_toc');
    }

    /** The "Preview" notice. */
    previewNotice() {
        return this.toc().locator('.cmp_notification');
    }

    coverImage() {
        return this.toc().locator('.heading .cover img');
    }

    description() {
        return this.toc().locator('.heading .description');
    }

    /** "Published: {date}". */
    publishedLine() {
        return this.toc().locator('.heading .published');
    }

    /** The "Full Issue" heading. */
    fullIssueHeading() {
        return this.toc().locator('.galleys #issueTocGalleyLabel');
    }

    /** The "Full Issue" links in order. */
    galleyLinks() {
        return this.toc().locator('.galleys ul.galleys_links a');
    }

    galleyLink(label) {
        return this.galleyLinks().filter({hasText: whole(label)});
    }

    /** The sections, read in order: `# {heading}` (when shown) and article titles. */
    async tocOutline() {
        return this.toc().evaluate((toc) => {
            const out = [];
            for (const section of toc.querySelectorAll('.sections > .section')) {
                const heading = section.querySelector(':scope > h2, :scope > h3, :scope > h4');
                if (heading) out.push(`# ${(heading.textContent || '').replace(/\s+/g, ' ').trim()}`);
                for (const title of section.querySelectorAll('.obj_article_summary .title a')) {
                    out.push((title.textContent || '').replace(/\s+/g, ' ').trim());
                }
            }
            return out;
        });
    }

    /** An article's title link on the issue's page. */
    articleLink(title) {
        return this.toc().locator('.obj_article_summary .title a').filter({hasText: whole(title)});
    }

    // --- "Archives" ----------------------------------------------------------

    /** The archive's paragraphs ("This journal has not published any issues." when empty). */
    archiveParagraphs() {
        return this.page.locator('.page_issue_archive > p');
    }

    /** The archive's issue summaries. */
    summaries() {
        return this.page.locator('.obj_issue_summary');
    }

    /** The summaries' title links, in order. */
    summaryTitles() {
        return this.summaries().locator('a.title');
    }

    /** A summary by its title link's text. */
    summary(title) {
        return this.summaries().filter({has: this.page.locator('a.title', {hasText: whole(title)})});
    }

    // --- the site's home page ----------------------------------------------

    /** A journal's entry on the site's home page, by the journal's name. */
    siteEntry(journalName) {
        return this.page
            .locator('.journals li')
            .filter({has: this.page.getByRole('link', {name: journalName, exact: true})});
    }

    /** Open the site's home page. */
    async gotoSiteHome() {
        await this.page.goto(this.siteUrl(''));
        await expect(this.page.locator('.journals')).toBeVisible({timeout: T});
    }

    // --- the refused pages ---------------------------------------------------

    /** Expect the access-denied page (optionally with its message). */
    async expectDenied(message) {
        await expect(this.page).toHaveURL(/\/user\/authorizationDenied/);
        if (message) {
            await expect(this.page.locator('.pkp_structure_main')).toContainText(message);
        }
    }
}
exports.IssueReader = IssueReader;
