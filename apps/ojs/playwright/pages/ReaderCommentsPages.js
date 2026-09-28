// @ts-check
/**
 * @file playwright/pages/ReaderCommentsPages.js
 *
 * OJS-local Page Objects for Reader comments & moderation (spec:
 * docs/specs/U14-reader-comments-and-moderation.md): the article landing
 * page's two comments blocks with their dialogs (`ArticleCommentsPage`),
 * the "Comments" side tab of Settings › Website › Content
 * (`CommentsSettingsTab`), the editorial side menu's groups (`SideMenu`),
 * the Comments page with its tabs, row menu, comment panel and report
 * panel (`CommentsPage`), and the Users & Roles › Users rows the suite
 * drives for its controls and for Rule 18 (`UsersPage`).
 *
 * DOM facts the locators rely on (claim checks K1–K4 of 2026-09-16,
 * `.reports/U14/screen-notes.md`):
 * - the landing page's main block is `#public-comments` (`h2.label`
 *   "Comments on this publication"); each version part is a level-3
 *   heading holding a button (`aria-expanded`) and, while open, a `region`
 *   named like the heading ("Version of Record 1.0 (2)"); a closed part
 *   has no region in the DOM. A comment is an `article` inside the region:
 *   `[class*="messageBody"]`, `[class*="authorName"]`,
 *   `[class*="authorAffiliation"]`, a `time`, the ORCID link
 *   `a[href*="orcid.org"]`, the pending notice `[class*="NeedsApproval"]`;
 *   its "…" trigger is the article's only button and carries no accessible
 *   name (register A7); the menu portals to the root (`menuitem`s). The
 *   closed-version notice is `[class*="PkpCommentsNotificationNotLatest"]`.
 *   The sidebar block is `.entry_details .item.comments` with the link
 *   "All Comments (N)" (href `#public-comments`) and, signed out, the
 *   button "Log in to comment";
 * - the "Report Comment" and "Delete Comment" dialogs are `role=dialog`
 *   named by their heading; the reason box is the dialog's only textbox
 *   (a `label` element, no aria-label); "Submit" with an empty reason
 *   sends nothing; the delete and approval requests travel as POST with an
 *   `X-Http-Method-Override` header (match `method !== 'GET'`);
 * - the "Comments" side tab's form is the one holding the box "Enable
 *   Public Comments"; its "Save" shows "Saving" and then RELOADS the whole
 *   Website Settings page onto Appearance › Theme, never "Saved"
 *   (patterns.md pitfall 14, register A5);
 * - the side menu is the PrimeVue panelmenu `navigation "Site Navigation"`:
 *   group headers `[role="button"][aria-controls]` with `aria-label`, the
 *   entries `[role="treeitem"]` with `aria-label` inside the header's
 *   region (closed regions are `display:none`, so they are read from the
 *   DOM, never by visibility);
 * - the Comments page (`management/settings/userComments`) keeps all four
 *   tabpanels' tables in the DOM: rows are read from
 *   `main [role="tabpanel"]:visible` only; a "Loading" row shows before
 *   the fetch lands; the paging nav is `nav.pkpPagination` with buttons
 *   named "Go to Page N"; the row menu is the button "More Actions"; the
 *   comment panel is the dialog named "View comment details by" (the
 *   writer's name is the paragraph after the heading), the report panel
 *   "View report details by"; the confirm dialogs "Delete Comment" and
 *   "Delete Report" carry "Delete" / "Cancel"; the notice is the
 *   `.app__notifications` status at the top right (its text and "×" in
 *   one element: substring reads only);
 * - Users & Roles › Users is a Vue table: a row's last button opens its
 *   menu ("Edit", "Email", "Login As", "Remove User", "Disable User",
 *   "Merge user"); "Email" opens the Vue dialog "Email" (Subject, a
 *   TinyMCE body in an iframe, "Send Email"); "Remove User" asks "Remove"
 *   with "OK"; "Merge user" opens the legacy grid window "Merge user"
 *   whose rows carry a "Settings" link revealing "Merge into this User" in
 *   the next `tr`, then a "Confirm" dialog with "OK".
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {waitForJQueryIdle} = require('../../../../shared/playwright/support/legacy.js');
const {EmailUserWindow} = require('../../../../shared/playwright/pages/UsersManagementPages.js');

/** The comment box's placeholder (its only name). */
const BOX_PLACEHOLDER = 'What do you think about this publication? Type your comments here.';
/** The writer's notice on a pending or hidden comment (Rule 6a). */
const PENDING_NOTICE = 'Your comment will be visible when the editor approves it';
/** The older version's notice in place of the box (Rule 4a). */
const CLOSED_NOTICE = 'Discussion is closed on this version, please comment on the latest version above.';
/** The two task sentences (Side effects). */
const COMMENT_TASK = 'A comment has been submitted and is pending review by a moderator.';
const REPORT_TASK = 'A report was submitted for a comment and requires review by a moderator.';
/** The Comments page's notices (Rules 13–15). */
const UPDATED_NOTICE = 'The comment has been updated successfully.';
const COMMENT_DELETED_NOTICE = 'The comment has been deleted successfully.';
const REPORT_DELETED_NOTICE = 'The report has been deleted successfully.';
/** The empty "Reports" table (Rule 15) and the empty comments table (Fields). */
const NO_REPORTS = 'No one has reported this comment yet';
const NO_ITEMS = 'No Items';
/** The comment panel's two notes (Rule 12). */
const APPROVE_NOTE = 'Approving this comment will make it visible to all users on the site';
const APPROVED_NOTE = /^This comment was approved on \d{4}-\d{2}-\d{2} by .+\.$/;
/** The access-denied page's sentence (Actors row 6). */
const ACCESS_DENIED_TEXT = 'The current role does not have access to this operation.';
/** The confirm dialogs' questions. */
const DELETE_COMMENT_QUESTION = 'Are you sure you want to delete this comment? This action cannot be undone.';
const DELETE_REPORT_QUESTION = 'Are you sure you want to delete this report? This action cannot be undone.';
const OWN_DELETE_QUESTION = 'Are you sure you want to delete the following comment?';
const NOT_FOUND_MESSAGE = 'The requested resource was not found.';

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A request that writes (`useFetch` tunnels DELETE and PUT through POST). */
const isWrite = (response) => response.request().method() !== 'GET';

exports.BOX_PLACEHOLDER = BOX_PLACEHOLDER;
exports.PENDING_NOTICE = PENDING_NOTICE;
exports.CLOSED_NOTICE = CLOSED_NOTICE;
exports.COMMENT_TASK = COMMENT_TASK;
exports.REPORT_TASK = REPORT_TASK;
exports.UPDATED_NOTICE = UPDATED_NOTICE;
exports.COMMENT_DELETED_NOTICE = COMMENT_DELETED_NOTICE;
exports.REPORT_DELETED_NOTICE = REPORT_DELETED_NOTICE;
exports.NO_REPORTS = NO_REPORTS;
exports.NO_ITEMS = NO_ITEMS;
exports.APPROVE_NOTE = APPROVE_NOTE;
exports.APPROVED_NOTE = APPROVED_NOTE;
exports.ACCESS_DENIED_TEXT = ACCESS_DENIED_TEXT;
exports.DELETE_COMMENT_QUESTION = DELETE_COMMENT_QUESTION;
exports.DELETE_REPORT_QUESTION = DELETE_REPORT_QUESTION;
exports.OWN_DELETE_QUESTION = OWN_DELETE_QUESTION;
exports.NOT_FOUND_MESSAGE = NOT_FOUND_MESSAGE;
exports.escapeRegExp = escapeRegExp;

// -------------------------------------------------------------------------
// The article landing page's two blocks (Rules 3–9)
// -------------------------------------------------------------------------

exports.ArticleCommentsPage = class ArticleCommentsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    /** The article's address (`article/view/{id}`). */
    url(submissionId) {
        return this.contextUrl(this.contextPath, `/article/view/${submissionId}`);
    }

    /** Open the article and wait for its page (the title heading; the frontend has no `main`). */
    async goto(submissionId) {
        await this.page.goto(this.url(submissionId));
        await expect(this.page.locator('h1').first()).toBeVisible({timeout: 30_000});
    }

    /**
     * The article's address answers the bare "404 Not Found" page (Rule 18):
     * the response is a 404 and the page's whole text is that heading.
     */
    async expectNotFound(submissionId) {
        const response = await this.page.goto(this.url(submissionId));
        expect(response, 'a response').toBeTruthy();
        expect(response.status(), `${this.url(submissionId)} answered`).toBe(404);
        await expect(this.page.getByRole('heading', {name: '404 Not Found', exact: true})).toBeVisible();
        await expect(this.page.locator('body')).toHaveText(/^\s*404 Not Found\s*$/);
        await expect(this.mainBlock()).toHaveCount(0);
    }

    // The main block (Rule 3a)

    mainBlock() {
        return this.page.locator('#public-comments');
    }

    mainHeading() {
        return this.mainBlock().locator('h2.label');
    }

    /** Every version part's heading (level 3), newest version first. */
    partHeadings() {
        return this.mainBlock().getByRole('heading', {level: 3});
    }

    /** The part headings' texts, trimmed ("Version of Record 1.0 (2)"). */
    async partLabels() {
        const labels = await this.partHeadings().allInnerTexts();
        return labels.map((label) => label.replace(/\s+/g, ' ').trim());
    }

    /** A part's heading button by its version label ("Version of Record 1.0"). */
    partButton(versionLabel) {
        return this.partHeadings()
            .filter({hasText: new RegExp(`^\\s*${escapeRegExp(versionLabel)} \\(\\d+\\)\\s*$`)})
            .getByRole('button');
    }

    /** A part's open region (absent from the DOM while the part is closed). */
    partRegion(versionLabel) {
        return this.mainBlock().getByRole('region', {
            name: new RegExp(`^${escapeRegExp(versionLabel)} \\(\\d+\\)$`),
        });
    }

    /** The heading of a part reads "{version} ({count})". */
    async expectPartCount(versionLabel, count) {
        await expect(this.partButton(versionLabel)).toHaveText(
            new RegExp(`^\\s*${escapeRegExp(versionLabel)} \\(${count}\\)\\s*$`),
            {timeout: 30_000}
        );
    }

    // Inside a part (Rules 4–6)

    /** The comment box (by its placeholder), in the region or the page. */
    box(scope = this.mainBlock()) {
        return scope.getByRole('textbox', {name: BOX_PLACEHOLDER});
    }

    submitButton(scope = this.mainBlock()) {
        return scope.getByRole('button', {name: 'Submit', exact: true});
    }

    loginButton(scope = this.mainBlock()) {
        return scope.getByRole('button', {name: 'Log in to comment', exact: true});
    }

    closedNotice(scope = this.mainBlock()) {
        return scope.locator('[class*="PkpCommentsNotificationNotLatest"]');
    }

    showMoreButton(scope = this.mainBlock()) {
        return scope.getByRole('button', {name: /^Show more \(\d+\)$/});
    }

    /** Every comment (an `article`) in the scope, newest first. */
    comments(scope = this.mainBlock()) {
        return scope.locator('article');
    }

    /** The comment whose body holds `text`. */
    comment(text, scope = this.mainBlock()) {
        return this.comments(scope).filter({has: this.page.locator('[class*="messageBody"]', {hasText: text})});
    }

    body(article) {
        return article.locator('[class*="messageBody"]');
    }

    author(article) {
        return article.locator('[class*="authorName"]');
    }

    affiliation(article) {
        return article.locator('[class*="authorAffiliation"]');
    }

    time(article) {
        return article.locator('time');
    }

    orcidLink(article) {
        return article.locator('a[href*="orcid.org"]');
    }

    /** The ORCID icon shown before the link (`svg` or `img`). */
    orcidIcon(article) {
        return article.locator('[class*="OrcidDisplay__icon"]');
    }

    pendingNotice(article) {
        return article.locator('[class*="NeedsApproval"]');
    }

    /** The help icon inside the pending notice. */
    pendingIcon(article) {
        return this.pendingNotice(article).locator('svg, img');
    }

    /** The comment's "…" button: the article's only button, unnamed (A7). */
    menuButton(article) {
        return article.getByRole('button');
    }

    /** Press a comment's "…" and wait for its menu; returns the items' texts. */
    async openMenu(article) {
        await this.menuButton(article).click();
        await expect(this.page.getByRole('menuitem').first()).toBeVisible({timeout: 30_000});
        const items = await this.page.getByRole('menuitem').allInnerTexts();
        return items.map((item) => item.trim());
    }

    menuItem(name) {
        return this.page.getByRole('menuitem', {name, exact: true});
    }

    /**
     * Close the open comment menu (a reka-ui `DropdownMenu`) with Escape on
     * the menu itself: its layer takes the key whatever holds the focus, and
     * pressed there the key cannot reach anything else
     * (.reports/flake-s26/esc/diagnosis.md H4).
     */
    async closeMenu() {
        await this.page.getByRole('menu').press('Escape');
        await expect(this.page.getByRole('menuitem')).toHaveCount(0, {timeout: 30_000});
    }

    /**
     * Type `text` into the box and press "Submit", bounded by the comment
     * POST answering OK (Rule 5). Returns the created comment's id.
     */
    async writeComment(text) {
        await this.box().fill(text);
        const posted = this.page.waitForResponse(
            (r) => /\/api\/v1\/comments$/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
            {timeout: 30_000}
        );
        await this.submitButton().click();
        const response = await posted;
        const created = await response.json();
        return created.id;
    }

    // The "…" menu's dialogs (Rules 8, 9)

    reportDialog() {
        return this.page.getByRole('dialog', {name: 'Report Comment', exact: true});
    }

    deleteDialog() {
        return this.page.getByRole('dialog', {name: 'Delete Comment', exact: true});
    }

    /** The reason box: the dialog's only textbox (no aria-label). */
    reasonBox(dialog = this.reportDialog()) {
        return dialog.getByRole('textbox');
    }

    /** Open the "Report" of a comment's menu and wait for the dialog. */
    async openReportDialog(article) {
        await this.openMenu(article);
        await this.menuItem('Report').click();
        await expect(this.reportDialog()).toBeVisible({timeout: 30_000});
        return this.reportDialog();
    }

    /** Open the "Delete Comment" of a comment's menu and wait for the dialog. */
    async openDeleteDialog(article) {
        await this.openMenu(article);
        await this.menuItem('Delete Comment').click();
        await expect(this.deleteDialog()).toBeVisible({timeout: 30_000});
        return this.deleteDialog();
    }

    /** Press the report dialog's "Submit" bounded by the report POST (Rule 8). */
    async submitReport(dialog = this.reportDialog()) {
        const posted = this.page.waitForResponse(
            (r) => /\/reports$/.test(r.url()) && r.request().method() === 'POST' && r.ok(),
            {timeout: 30_000}
        );
        await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
        await posted;
        await expect(this.reportDialog()).toHaveCount(0, {timeout: 30_000});
    }

    /**
     * Press "Submit" and read that no report request leaves within
     * `windowMs` (an empty reason: the dialog stays open, nothing is sent;
     * A3's marked sentence). Returns true when nothing was sent.
     */
    async submitReportSendsNothing(dialog = this.reportDialog(), windowMs = 3_000) {
        const sent = this.page
            .waitForResponse((r) => /\/reports$/.test(r.url()), {timeout: windowMs})
            .then(() => true)
            .catch(() => false);
        await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
        return !(await sent);
    }

    /** Press the delete dialog's "Delete" bounded by the tunnelled DELETE (Rule 9). */
    async confirmDelete(dialog = this.deleteDialog()) {
        const deleted = this.page.waitForResponse(
            (r) => /\/api\/v1\/comments\/\d+$/.test(r.url()) && isWrite(r) && r.ok(),
            {timeout: 30_000}
        );
        await dialog.getByRole('button', {name: 'Delete', exact: true}).click();
        await deleted;
        await expect(this.deleteDialog()).toHaveCount(0, {timeout: 30_000});
    }

    // The sidebar block (Rule 3b)

    sidebarBlock() {
        return this.page.locator('.entry_details .item.comments');
    }

    sidebarHeading() {
        return this.sidebarBlock().locator('h2.label');
    }

    allCommentsLink() {
        return this.sidebarBlock().getByRole('link', {name: /^All Comments \(\d+\)$/});
    }

    sidebarLoginButton() {
        return this.sidebarBlock().getByRole('button', {name: 'Log in to comment', exact: true});
    }

    async expectAllComments(count) {
        await expect(this.allCommentsLink()).toHaveText(`All Comments (${count})`, {timeout: 30_000});
    }

    /** The main block's top edge and the window's scroll offset, in CSS pixels. */
    async mainBlockPosition() {
        return this.page.evaluate(() => {
            const el = document.getElementById('public-comments');
            const rect = el ? el.getBoundingClientRect() : null;
            return {top: rect ? Math.round(rect.top) : null, scrollY: Math.round(window.scrollY), hash: location.hash};
        });
    }
};

// -------------------------------------------------------------------------
// Settings › Website › Content › "Comments" (Rule 2)
// -------------------------------------------------------------------------

exports.CommentsSettingsTab = class CommentsSettingsTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    url() {
        return this.contextUrl(this.contextPath, '/management/settings/website');
    }

    /** Open the Website settings and its Content › Comments side tab. */
    async goto() {
        await this.page.goto(this.url());
        await this.openCommentsTab();
    }

    contentTab() {
        return this.page.getByRole('tab', {name: 'Content', exact: true});
    }

    appearanceTab() {
        return this.page.getByRole('tab', {name: 'Appearance', exact: true});
    }

    setupTab() {
        return this.page.getByRole('tab', {name: 'Setup', exact: true}).first();
    }

    commentsSideTab() {
        return this.page.getByRole('tab', {name: 'Comments', exact: true});
    }

    themeSideTab() {
        return this.page.getByRole('tab', {name: 'Theme', exact: true});
    }

    /** Press the "Content" tab and its "Comments" side tab; wait for the box. */
    async openCommentsTab() {
        await expect(this.contentTab()).toBeVisible({timeout: 30_000});
        await this.contentTab().click();
        await this.commentsSideTab().click();
        await expect(this.box()).toBeVisible({timeout: 30_000});
    }

    box() {
        return this.page.getByRole('checkbox', {name: 'Enable Public Comments', exact: true});
    }

    form() {
        return this.page.locator('form').filter({has: this.box()});
    }

    saveButton() {
        return this.form().getByRole('button', {name: 'Save', exact: true});
    }

    /** The form's inline "Saving" status. */
    savingStatus() {
        return this.form().locator('.pkpFormPage__status', {hasText: 'Saving'});
    }

    savedStatus() {
        return this.page.locator('[role="status"]', {hasText: 'Saved'});
    }

    /**
     * Press "Save": the form's POST answers OK and the whole Website
     * Settings page reloads (a `load` event on the same address) and lands
     * on Appearance › Theme (Rule 2a, A5's marked sentence). Never waits
     * for "Saved". Returns whether "Saving" was seen on the way.
     */
    async save() {
        const saving = this.savingStatus()
            .waitFor({state: 'attached', timeout: 10_000})
            .then(() => true)
            .catch(() => false);
        const posted = this.page.waitForResponse(
            (r) => r.url().includes('/api/v1/contexts/') && isWrite(r) && r.ok(),
            {timeout: 30_000}
        );
        const reloaded = this.page.waitForEvent('load', {timeout: 30_000});
        await this.saveButton().click();
        await posted;
        await reloaded;
        await expect(this.appearanceTab()).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        await expect(this.themeSideTab()).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        return saving;
    }
};

// -------------------------------------------------------------------------
// The editorial side menu (Rule 3c)
// -------------------------------------------------------------------------

exports.SideMenu = class SideMenu extends BasePage {
    nav() {
        return this.page.getByRole('navigation', {name: 'Site Navigation'});
    }

    /** Every group header's label, in order. */
    async groupLabels() {
        await expect(this.nav()).toBeVisible({timeout: 30_000});
        return this.nav()
            .locator('[role="button"][aria-controls]')
            .evaluateAll((headers) =>
                headers.map((header) => header.getAttribute('aria-label') || (header.textContent || '').replace(/\s+/g, ' ').trim())
            );
    }

    /**
     * The "Content" group's entries (their labels), read from the DOM
     * whether or not the group is open; null when there is no such group.
     */
    async contentEntries() {
        await expect(this.nav()).toBeVisible({timeout: 30_000});
        return this.nav().evaluate((nav) => {
            const header = [...nav.querySelectorAll('[role="button"][aria-controls]')].find(
                (h) => (h.getAttribute('aria-label') || (h.textContent || '').trim()) === 'Content'
            );
            if (!header) {
                return null;
            }
            const region = document.getElementById(header.getAttribute('aria-controls') || '');
            return region
                ? [...region.querySelectorAll('[role="treeitem"]')].map(
                      (item) => item.getAttribute('aria-label') || (item.textContent || '').replace(/\s+/g, ' ').trim()
                  )
                : [];
        });
    }

    contentHeader() {
        return this.nav().locator('[role="button"][aria-label="Content"]');
    }

    /** The "Comments" entry's link inside the Content group. */
    commentsEntry() {
        return this.nav().getByRole('link', {name: 'Comments', exact: true});
    }

    /** Open the "Content" group and press "Comments". */
    async openComments() {
        await this.contentHeader().click();
        await expect(this.commentsEntry()).toBeVisible({timeout: 30_000});
        await this.commentsEntry().click();
    }
};

// -------------------------------------------------------------------------
// The Comments page (Rules 10–16)
// -------------------------------------------------------------------------

/** Tab name → its address hash. */
const TAB_HASHES = {
    All: 'all',
    Approved: 'approved',
    'Hidden/Needs Approval': 'needsApproval',
    Reported: 'reported',
};

exports.TAB_HASHES = TAB_HASHES;

exports.CommentsPage = class CommentsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    /** The page's address, with an optional query ("?commentId=5"). */
    url(query = '') {
        return this.contextUrl(this.contextPath, `/management/settings/userComments${query}`);
    }

    /** Open the page and wait for its heading and a settled table. */
    async goto(query = '') {
        await this.page.goto(this.url(query));
        await this.expectOpen();
    }

    async expectOpen() {
        await expect(this.heading()).toBeVisible({timeout: 30_000});
        await this.tableSettled();
    }

    /**
     * The page's "Comments" heading, by CSS: opened at a comment's address the
     * comment panel lands on top at once, and as a modal it hides the page
     * behind it from role queries (red on CI on both attempts, 2026-09-17,
     * where the panel wins the race the VM loses).
     */
    heading() {
        return this.page.locator('main h1', {hasText: /^\s*Comments\s*$/});
    }

    tabs() {
        return this.page.locator('main').getByRole('tab');
    }

    tab(name) {
        return this.page.locator('main').getByRole('tab', {name, exact: true});
    }

    /** Press a tab and wait for its table to settle. */
    async openTab(name) {
        await this.tab(name).click();
        await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
        await this.tableSettled();
    }

    async expectTab(name) {
        await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
    }

    /** The visible tab's panel (the other three keep their tables in the DOM). */
    panel() {
        return this.page.locator('main [role="tabpanel"]:visible').first();
    }

    table() {
        return this.panel().locator('table').first();
    }

    /** Wait until the table shows rows or "No Items", never "Loading". */
    async tableSettled() {
        await expect(this.panel().locator('tbody tr', {hasText: /^\s*Loading\s*$/})).toHaveCount(0, {
            timeout: 30_000,
        });
        await expect(this.panel().locator('tbody tr').first()).toBeVisible({timeout: 30_000});
    }

    columnHeaders() {
        return this.table().locator('thead th');
    }

    /** The column labels as written (the cells render them in capitals through CSS). */
    async columnLabels() {
        return this.columnHeaders().evaluateAll((cells) =>
            cells.map((cell) => (cell.textContent || '').replace(/\s+/g, ' ').trim())
        );
    }

    /** Every data row of the visible tab. */
    rows() {
        return this.table().locator('tbody tr');
    }

    /** The row(s) whose "Comment" cell holds `text`. */
    row(text) {
        return this.rows().filter({has: this.page.locator('td', {hasText: text})});
    }

    noItems() {
        return this.panel().getByText(NO_ITEMS, {exact: true});
    }

    /** A row's cells as trimmed texts: [Submission, Comment, User, Status, Actions]. */
    async cells(row) {
        const cells = await row.locator('td').allInnerTexts();
        return cells.map((cell) => cell.replace(/\s+/g, ' ').trim());
    }

    statusCell(row) {
        return row.locator('td').nth(3);
    }

    submissionCell(row) {
        return row.locator('td').nth(0);
    }

    userCell(row) {
        return row.locator('td').nth(2);
    }

    // Paging (Rule 10c)

    pagination() {
        return this.panel().locator('nav.pkpPagination');
    }

    pageButton(n) {
        return this.pagination().getByRole('button', {name: `Go to Page ${n}`, exact: true});
    }

    showingLine() {
        return this.panel().getByText(/^Showing \d+ to \d+ of \d+/);
    }

    /** Press a page's link and wait for the table. */
    async openPage(n) {
        await this.pageButton(n).click();
        await expect(this.pageButton(n)).toHaveAttribute('aria-current', 'true', {timeout: 30_000});
        await this.tableSettled();
    }

    // The row menu (Rule 11)

    rowMenuButton(row) {
        return row.getByRole('button', {name: 'More Actions'});
    }

    /** Open a row's "…" menu; returns the items' texts. */
    async openRowMenu(row) {
        await this.rowMenuButton(row).click();
        await expect(this.page.getByRole('menuitem').first()).toBeVisible({timeout: 30_000});
        const items = await this.page.getByRole('menuitem').allInnerTexts();
        return items.map((item) => item.trim());
    }

    menuItem(name) {
        return this.page.getByRole('menuitem', {name, exact: true});
    }

    /** "…" › "View Comment" on a row: the comment panel opens (Rule 12). */
    async viewComment(row) {
        await this.openRowMenu(row);
        await this.menuItem('View Comment').click();
        await expect(this.commentPanel()).toBeVisible({timeout: 30_000});
        return this.commentPanel();
    }

    // The panels (Rules 12–15)

    commentPanel() {
        return this.page.getByRole('dialog', {name: /^View comment details by/});
    }

    reportPanel() {
        return this.page.getByRole('dialog', {name: /^View report details by/});
    }

    /**
     * The comment panel while the report panel is stacked over it: a role
     * read returns nothing for a dialog under another (patterns.md pitfall
     * 6), so it is read through CSS; both stacked panels stay `:visible`.
     */
    commentPanelBehind() {
        return this.page.locator('[role="dialog"]:visible').filter({hasText: 'View comment details by'});
    }

    confirmDialog(name) {
        return this.page.getByRole('dialog', {name, exact: true});
    }

    errorDialog() {
        return this.page.getByRole('dialog', {name: 'Error', exact: true});
    }

    /** The submission line above the panel's title. */
    panelSubmissionLine(panel = this.commentPanel()) {
        return panel.locator('h1').locator('xpath=preceding-sibling::*[1]');
    }

    /** The writer's (or reporter's) name: the paragraph after the heading. */
    panelPerson(panel = this.commentPanel()) {
        return panel.locator('h1').locator('xpath=following-sibling::p[1]');
    }

    approveButton() {
        return this.commentPanel().getByRole('button', {name: 'Approve Comment', exact: true});
    }

    hideButton() {
        return this.commentPanel().getByRole('button', {name: 'Hide Comment', exact: true});
    }

    deleteCommentButton() {
        return this.commentPanel().getByRole('button', {name: 'Delete Comment', exact: true});
    }

    deleteReportButton() {
        return this.reportPanel().getByRole('button', {name: 'Delete Report', exact: true});
    }

    closeButton(panel) {
        return panel.getByRole('button', {name: 'Close', exact: true});
    }

    /** The panel's note on the right (either of Rule 12's two texts). */
    note() {
        return this.commentPanel().getByText(/Approving this comment will|This comment was approved on/);
    }

    reportsTable() {
        return this.commentPanel().getByRole('table', {name: 'Reports'});
    }

    reportRows() {
        return this.reportsTable().locator('tbody tr').filter({hasNot: this.page.getByText(NO_REPORTS)});
    }

    reportRow(reason) {
        return this.reportsTable().locator('tbody tr').filter({has: this.page.locator('td', {hasText: reason})});
    }

    noReports() {
        return this.reportsTable().getByText(NO_REPORTS, {exact: true});
    }

    orcidLink(panel = this.commentPanel()) {
        return panel.locator('a[href*="orcid.org"]');
    }

    /** The list refetch that follows an action closing the panel. */
    listRefetch() {
        return this.page.waitForResponse(
            (r) => /\/api\/v1\/comments(\?|$)/.test(r.url()) && r.request().method() === 'GET' && r.ok(),
            {timeout: 30_000}
        );
    }

    /** Press "Approve Comment" or "Hide Comment": the setApproval write, the notice, the panel closed, the table refetched. */
    async setApproval(buttonName) {
        const button = buttonName === 'Approve Comment' ? this.approveButton() : this.hideButton();
        const written = this.page.waitForResponse(
            (r) => r.url().includes('/setApproval') && isWrite(r) && r.ok(),
            {timeout: 30_000}
        );
        const refetched = this.listRefetch();
        await button.click();
        await written;
        await expect(this.notice(UPDATED_NOTICE)).toBeVisible({timeout: 30_000});
        await expect(this.commentPanel()).toHaveCount(0, {timeout: 30_000});
        await refetched;
        await this.tableSettled();
    }

    /** The top-right notice holding `text` (substring: the element also holds its "×"). */
    notice(text) {
        return this.page.locator('.app__notifications').getByText(text).last();
    }

    /** "Delete Comment" from the row's menu, then "Delete" (Rule 14). */
    async deleteFromRow(row) {
        await this.openRowMenu(row);
        await this.menuItem('Delete Comment').click();
        const dialog = this.confirmDialog('Delete Comment');
        await expect(dialog).toBeVisible({timeout: 30_000});
        await expect(dialog).toContainText(DELETE_COMMENT_QUESTION);
        await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        await this.confirmDeleteComment(dialog);
    }

    /** "Delete Comment" from the open panel, then "Delete" (Rule 14). */
    async deleteFromPanel() {
        await this.deleteCommentButton().click();
        const dialog = this.confirmDialog('Delete Comment');
        await expect(dialog).toBeVisible({timeout: 30_000});
        await expect(dialog).toContainText(DELETE_COMMENT_QUESTION);
        await this.confirmDeleteComment(dialog);
        await expect(this.commentPanel()).toHaveCount(0, {timeout: 30_000});
    }

    async confirmDeleteComment(dialog) {
        const deleted = this.page.waitForResponse(
            (r) => /\/api\/v1\/comments\/\d+$/.test(r.url()) && isWrite(r) && r.ok(),
            {timeout: 30_000}
        );
        const refetched = this.listRefetch();
        await dialog.getByRole('button', {name: 'Delete', exact: true}).click();
        await deleted;
        await expect(this.notice(COMMENT_DELETED_NOTICE)).toBeVisible({timeout: 30_000});
        await refetched;
        await this.tableSettled();
    }

    /** "…" › "View Report" on a report row: the report panel opens over the comment panel (Rule 15). */
    async viewReport(reportRow) {
        await this.openRowMenu(reportRow);
        await this.menuItem('View Report').click();
        await expect(this.reportPanel()).toBeVisible({timeout: 30_000});
        return this.reportPanel();
    }

    /**
     * Wait out the modal store's close window. The store keeps a closed side
     * modal's slot for 450 ms on a timer, and its `isSideModalOpened()` reads
     * the slot, not the open flag; a "Delete Report" confirmed from a row
     * inside that window takes the "close the report panel" branch and never
     * refetches the table, which keeps the deleted row (red in every local
     * full run of 2026-09-17, green alone, on CI and under tracing). A page
     * timer set now with a longer delay is due after the app's, so it fires
     * after it whatever the load; no hand can be this fast.
     */
    async pastSideModalCloseWindow() {
        await this.page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));
    }

    /** "Delete Report" from a report row's menu, then "Delete" (Rule 15). */
    async deleteReportFromRow(reportRow) {
        await this.pastSideModalCloseWindow();
        await this.openRowMenu(reportRow);
        await this.menuItem('Delete Report').click();
        await this.confirmDeleteReport();
    }

    /** "Delete Report" from the open report panel, then "Delete" (Rule 15). */
    async deleteReportFromPanel() {
        await this.deleteReportButton().click();
        await this.confirmDeleteReport();
        await expect(this.reportPanel()).toHaveCount(0, {timeout: 30_000});
    }

    async confirmDeleteReport() {
        const dialog = this.confirmDialog('Delete Report');
        await expect(dialog).toBeVisible({timeout: 30_000});
        await expect(dialog).toContainText(DELETE_REPORT_QUESTION);
        await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        const deleted = this.page.waitForResponse(
            (r) => /\/reports\/\d+$/.test(r.url()) && isWrite(r) && r.ok(),
            {timeout: 30_000}
        );
        const reportsRefetched = this.page.waitForResponse(
            (r) => /\/api\/v1\/comments\/\d+\/reports(\?|$)/.test(r.url()) && r.request().method() === 'GET' && r.ok(),
            {timeout: 30_000}
        );
        await dialog.getByRole('button', {name: 'Delete', exact: true}).click();
        await deleted;
        await expect(this.notice(REPORT_DELETED_NOTICE)).toBeVisible({timeout: 30_000});
        await reportsRefetched;
    }

    /**
     * Press the comment panel's "Close". The table reloads only when something
     * changed in the panel (a report deleted); pass `changed` then (Rule 12).
     */
    async closeCommentPanel({changed = false} = {}) {
        const refetched = changed ? this.listRefetch() : null;
        await this.closeButton(this.commentPanel()).click();
        await expect(this.commentPanel()).toHaveCount(0, {timeout: 30_000});
        await refetched;
        await this.tableSettled();
    }

    /** Press the report panel's "Close"; the comment panel stays (Rule 15). */
    async closeReportPanel() {
        await this.closeButton(this.reportPanel()).click();
        await expect(this.reportPanel()).toHaveCount(0, {timeout: 30_000});
        await expect(this.commentPanel()).toBeVisible();
    }
};

// -------------------------------------------------------------------------
// Settings › Users & Roles › Users (Rule 18 and the mail control)
// -------------------------------------------------------------------------

exports.UsersPage = class UsersPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    url() {
        return this.contextUrl(this.contextPath, '/management/settings/access');
    }

    /** Open the Users tab and wait for `username`'s row. */
    async goto(username) {
        await this.page.goto(this.url());
        await expect(this.userRow(username)).toBeVisible({timeout: 30_000});
    }

    /** The table row listing `username`. */
    userRow(username) {
        return this.page
            .locator('table')
            .filter({hasText: username})
            .first()
            .locator('tr')
            .filter({hasText: username})
            .first();
    }

    /** Open a user row's menu; returns the items' texts. */
    async openRowMenu(username) {
        await this.userRow(username).locator('button').last().click();
        await expect(this.page.getByRole('menuitem').first()).toBeVisible({timeout: 30_000});
        const items = await this.page.getByRole('menuitem').allInnerTexts();
        return items.map((item) => item.trim());
    }

    menuItem(name) {
        return this.page.getByRole('menuitem', {name, exact: true});
    }

    /**
     * The row's "Email": fill the subject and the body and press "Send
     * Email", through the shared `EmailUserWindow` (the Body typed only
     * once its editor is initialised; the send's answer read as accepted),
     * then the window closed. The mail then reaches the mail catcher
     * within seconds (the suite's positive control for a silence).
     */
    async sendEmail(username, {subject, body}) {
        await this.openRowMenu(username);
        await this.menuItem('Email').click();
        const emailWindow = new EmailUserWindow(this.page);
        await emailWindow.compose({subject, body});
        await emailWindow.sendAndExpectSent();
    }

    /** The row's "Remove User", confirmed with the "Remove" dialog's "OK". */
    async removeUser(username) {
        await this.openRowMenu(username);
        await this.menuItem('Remove User').click();
        const dialog = this.page.getByRole('dialog', {name: 'Remove', exact: true});
        await expect(dialog).toBeVisible({timeout: 30_000});
        await expect(dialog).toContainText(
            'Remove this user from this journal? This action will unenroll the user from all roles within this journal.'
        );
        const written = this.page.waitForResponse((r) => isWrite(r) && r.ok(), {timeout: 30_000});
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        await written;
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
    }

    /**
     * The row's "Merge user": in the "Merge user" window, `into`'s row's
     * "Settings" reveals "Merge into this User"; the "Confirm" dialog's
     * "OK" merges, bounded by the merge POST.
     */
    async mergeUser(username, into) {
        await this.openRowMenu(username);
        await this.menuItem('Merge user').click();
        const window = this.page.getByRole('dialog', {name: 'Merge user', exact: true});
        await expect(window).toBeVisible({timeout: 30_000});
        await waitForJQueryIdle(this.page);
        const target = window.getByRole('row').filter({hasText: into}).first();
        await expect(target).toBeVisible({timeout: 30_000});
        await target.getByRole('link', {name: 'Settings'}).click();
        const controls = target.locator('xpath=following-sibling::tr[1]');
        const mergeLink = controls.getByRole('link', {name: 'Merge into this User'});
        await expect(mergeLink).toBeVisible({timeout: 30_000});
        await mergeLink.click();
        const confirm = this.page.getByRole('dialog', {name: 'Confirm', exact: true});
        await expect(confirm).toBeVisible({timeout: 30_000});
        await expect(confirm).toContainText(`merge the account with the username "${username}" into the account with the username "${into}"`);
        const merged = this.page.waitForResponse(
            (r) => r.url().includes('merge-users') && r.request().method() === 'POST' && r.ok(),
            {timeout: 30_000}
        );
        await confirm.getByRole('button', {name: 'OK', exact: true}).click();
        await merged;
        await waitForJQueryIdle(this.page);
    }
};
