// @ts-check
/**
 * @file shared/playwright/pages/UsersManagementPages.js
 *
 * Page objects for U53 "Users management" (docs/specs/U53-users-management.md),
 * shared by the OJS, OMP and OPS suites. App-neutral (PRINCIPLES M2): every
 * on-screen word that differs per app ("Hosted Journals" / "Hosted Presses" /
 * "Hosted Servers", "…in this journal." / "…in this press.", role names) is
 * passed in by the suite; the locators are the markup the three apps share.
 *
 * Surfaces:
 * - UsersListPage — Settings › Users & Roles › "Users": the "Invitations"
 *   table and "Invite to a role", the "Current Users (n)" list (rows, cells,
 *   the ORCID and disabled icons), its search box with the × button, the
 *   paging line and page buttons, and each row's "…" menu. The page heading
 *   and tab row come from ContextIdentityPages' `SettingsPages`.
 * - EmailUserWindow — the row menu's "Email" side window.
 * - DisableUserWindow — the legacy side window "Disable {name}" /
 *   "Enable {name}" (the older grid's "Disable User" / "Enable"): the
 *   "Current Roles : …" line, the reason box, "OK" and "Cancel", or the
 *   refusal sentence with only "Close".
 * - RemoveUserDialog — the "Remove" confirmation.
 * - UserGrid — the legacy users grid shared by the "Merge user" window and
 *   the Settings wizard's "Users" tab: rows, the "Search" link and its
 *   filter form, a row's arrow and action links, "Add User", the paging line.
 * - MergeUserWindow — the "Merge user" side window (a UserGrid) and its
 *   "Confirm" dialog.
 * - HostedContextsPage — Administration › "Hosted Journals" (Presses,
 *   Servers): a context's row, its arrow and "Settings wizard", and the
 *   wizard's tabs.
 * - UserDetailsWindow — the older grid's "Add User" (step 1) and "Edit User"
 *   windows (form#userDetailsForm), with step 2 (form#userRoleForm) and the
 *   "User Roles" / "Appear on Masthead" boxes.
 *
 * DOM facts the locators rely on (U53 claim check, 2026-09-25, three apps;
 * `.reports/U53/screen-notes.md`):
 * - the row's "…" button is named `##userAccess.management.options##`
 *   (register A5); the menu is a headlessui menu portalled to the page,
 *   and Escape does not reliably close it: its own button is pressed again;
 * - a closed legacy side window leaves its shell until the next navigation,
 *   and the modal slot is kept ~450 ms after a close, so an opener pressed
 *   within it opens nothing (patterns.md pitfall 4): `afterWindowClose()`;
 * - the legacy grid's filter form is hidden until the header's "Search"
 *   link is pressed and collapses again after some refreshes; its rows'
 *   actions sit in the next `tr` behind the row's `a.show_extras` arrow;
 *   grid links are pressed by CSS text (role queries on a grid return
 *   nothing while a closed window's shell is still in the DOM).
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {SettingsPages} = require('./ContextIdentityPages.js');
const {waitForJQueryIdle} = require('../support/legacy.js');

const T = 30_000;

/** Escape a string for a RegExp. */
function esc(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A RegExp matching the whole (padded) text of an element. */
function whole(text) {
    return new RegExp(`^\\s*${esc(text)}\\s*$`);
}

/** Whitespace-collapsed text. */
function flat(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
}

/**
 * Wait out the modal store's slot after a side window or dialog closed
 * (patterns.md pitfall 4): a page timer longer than the app's 450 ms.
 *
 * @param {import('@playwright/test').Page} page
 */
async function afterWindowClose(page) {
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));
}
exports.afterWindowClose = afterWindowClose;

// ---------------------------------------------------------------------------
// Settings › Users & Roles › "Users"
// ---------------------------------------------------------------------------

exports.UsersListPage = class UsersListPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        /** Heading and tab row of the Settings page. */
        this.settings = new SettingsPages(page, contextPath);
        this.pageHeading = page.locator('main h1').first();
        this.usersPanel = page.getByRole('tabpanel', {name: 'Users'});
        this.inviteButton = page.getByRole('button', {name: 'Invite to a role'});
        this.invitationsTable = page.getByRole('table', {name: /^Invitations \(/});
        this.table = page.getByRole('table', {name: /^Current Users \(/});
        this.searchBox = page.getByRole('searchbox', {name: /Enter a user's name/});
        this.clearSearchButton = page.getByRole('button', {name: 'Clear search phrase'});
        this.pagingNav = page.getByRole('navigation', {name: 'View additional pages'});
        this.menuItems = page.getByRole('menuitem');
    }

    /** Open Settings › Users & Roles and wait for the list's first row. */
    async goto() {
        await this.page.goto(this.contextUrl(this.contextPath, '/management/settings/access'));
        await expect(this.table.locator('tbody tr').first()).toBeVisible({timeout: T});
    }

    /** The heading above the list, "Current Users ({count})". */
    usersHeading(count) {
        return this.page.getByRole('heading', {name: `Current Users (${count})`, exact: true});
    }

    /** The heading above the Invitations table. */
    invitationsHeading() {
        return this.page.getByRole('heading', {name: /^Invitations \(\d+\)$/});
    }

    /** The list's body rows, top to bottom. */
    rows() {
        return this.table.locator('tbody tr');
    }

    /** A row by text it contains (an email address is unique). */
    row(text) {
        return this.rows().filter({hasText: text});
    }

    /** An Invitations-table row by text it contains. */
    invitationRow(text) {
        return this.invitationsTable.locator('tbody tr').filter({hasText: text});
    }

    /** A row's cells: Name, Email, Roles, Start Date, Affiliation, "…". */
    cells(row) {
        return row.getByRole('cell');
    }

    nameCell(row) {
        return this.cells(row).nth(0);
    }

    emailCell(row) {
        return this.cells(row).nth(1);
    }

    rolesCell(row) {
        return this.cells(row).nth(2);
    }

    startDateCell(row) {
        return this.cells(row).nth(3);
    }

    affiliationCell(row) {
        return this.cells(row).nth(4);
    }

    /** The lines of a cell (one role per line), empty lines dropped. */
    async cellLines(cell) {
        return (await cell.innerText())
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
    }

    /** The ORCID icon after a name (an icon that is not the disabled one). */
    orcidIcon(row) {
        return this.nameCell(row).locator('.pkpIcon--inline:not(.text-negative)');
    }

    /** The red crossed-out person icon after a disabled account's name. */
    disabledIcon(row) {
        return this.nameCell(row).locator('.pkpIcon--inline.text-negative');
    }

    /** The line under the list, whitespace-collapsed ("Showing 1 to 25 of 32"). */
    async pagingLine() {
        const text = await this.usersPanel.innerText();
        const match = text.match(/Showing\s+\d+\s+to\s+\d+\s+of\s+\d+/);
        return match ? flat(match[0]) : null;
    }

    /** Wait until the line under the list reads `expected`. */
    async expectPagingLine(expected) {
        await expect.poll(() => this.pagingLine(), {timeout: T}).toBe(expected);
    }

    /** A page button, "Go to Page {n}". */
    pageButton(n) {
        return this.pagingNav.getByRole('button', {name: `Go to Page ${n}`, exact: true});
    }

    /** Press a page button and wait for the list's answer. */
    async gotoListPage(n) {
        const answer = this.page.waitForResponse(
            (r) => /\/api\/v1\/users\?/.test(r.url()) && r.request().method() === 'GET',
            {timeout: T}
        );
        await this.pageButton(n).click();
        await answer;
    }

    /** Type into the search box without pressing Enter. */
    async typeSearch(text) {
        await this.searchBox.fill(text);
    }

    /** Type a phrase and press Enter; resolves with the list's answer. */
    async search(text) {
        await this.searchBox.fill(text);
        const answer = this.page.waitForResponse(
            (r) => /\/api\/v1\/users\?/.test(r.url()) && r.url().includes('searchPhrase='),
            {timeout: T}
        );
        await this.searchBox.press('Enter');
        return answer;
    }

    /** Press the × at the box's end; resolves with the list's answer. */
    async clearSearch() {
        const answer = this.page.waitForResponse((r) => /\/api\/v1\/users\?/.test(r.url()), {timeout: T});
        await this.clearSearchButton.click();
        return answer;
    }

    /** A row's "…" button (named by the raw code of register A5). */
    menuButton(row) {
        return row.getByRole('button', {name: /management\.options/i});
    }

    /** Open a row's menu and wait for its items. */
    async openMenu(row) {
        await expect(this.menuItems).toHaveCount(0);
        await this.menuButton(row).click();
        await expect(this.menuItems.first()).toBeVisible({timeout: T});
    }

    /** Close the open menu by pressing its button again. */
    async closeMenu(row) {
        await this.menuButton(row).click();
        await expect(this.menuItems).toHaveCount(0, {timeout: T});
    }

    /** The labels a row's menu offers, in order (opens and closes it). */
    async menuLabels(row) {
        await this.openMenu(row);
        const labels = (await this.menuItems.allInnerTexts()).map(flat);
        await this.closeMenu(row);
        return labels;
    }

    /** Open a row's menu and press one of its actions. */
    async chooseAction(row, label) {
        await this.openMenu(row);
        await this.page.getByRole('menuitem', {name: label, exact: true}).click();
    }
};

// ---------------------------------------------------------------------------
// The "Email" window (Rule 9)
// ---------------------------------------------------------------------------

exports.EmailUserWindow = class EmailUserWindow extends BasePage {
    constructor(page) {
        super(page);
        this.dialog = page.getByRole('dialog', {name: 'Email'});
        this.form = page.locator('#sendEmailForm');
        this.subject = this.form.locator('input[name="subject"]');
        this.to = this.form.locator('input[name="user"]');
        this.sendButton = this.form.getByRole('button', {name: 'Send Email'});
        this.cancelLink = this.form.getByRole('link', {name: 'Cancel', exact: true});
    }

    /**
     * The window is open and its Body editor is ready for typing: this
     * window's own editor (its textarea inside the open `#sendEmailForm`,
     * never an earlier window's) reports `initialized`. The editor's body
     * is visible and editable before that, while TinyMCE still fetches its
     * content stylesheets; the initial (empty) content it then loads wipes
     * anything typed, and the send is refused (flake-s28 u14s5-email).
     */
    async expectOpen() {
        await expect(this.form).toBeVisible({timeout: T});
        await this.page.waitForFunction(
            () => {
                const form = document.querySelector('#sendEmailForm');
                return ((window.tinymce && window.tinymce.get()) || []).some(
                    (e) => /^message/.test(e.id) && e.initialized && !!form && form.contains(e.getElement())
                );
            },
            undefined,
            {timeout: T}
        );
    }

    /** Wait for the window to be ready, then fill Subject and type Body. */
    async compose({subject, body}) {
        await this.expectOpen();
        await this.subject.fill(subject);
        await this.typeBody(body);
    }

    async expectClosed() {
        await expect(this.form).toHaveCount(0, {timeout: T});
    }

    /** The Body editor's content as HTML. */
    async bodyContent() {
        return this.page.evaluate(() => {
            const e = ((window.tinymce && window.tinymce.get()) || []).find((x) => /^message/.test(x.id));
            return e ? e.getContent() : null;
        });
    }

    /** Type into Body (at the editor's end). */
    async typeBody(text) {
        await this.form.frameLocator('iframe').first().locator('body').click();
        await this.page.keyboard.type(text);
    }

    /** Empty Body from the keyboard. */
    async clearBody() {
        await this.form.frameLocator('iframe').first().locator('body').click();
        await this.page.keyboard.press('ControlOrMeta+a');
        await this.page.keyboard.press('Delete');
        await expect.poll(() => this.bodyContent(), {timeout: T}).toBe('');
    }

    /** The error line under a field, by its text. */
    fieldError(text) {
        return this.form.locator('label.error, .pkp_form_error, .error').filter({hasText: text});
    }

    /** Press "Send Email" and wait for the send request's answer. */
    async sendAndWait() {
        const answer = this.page.waitForResponse(
            (r) => r.url().includes('send-email') && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.sendButton.click();
        return answer;
    }

    /**
     * "Send Email" for a message the form accepts: the answer is read, not
     * just awaited (a refusal answers 200 with `status: false` and an
     * alert the browser dismisses, leaving the window open), then the
     * window's close. Returns the response.
     */
    async sendAndExpectSent() {
        const answer = await this.sendAndWait();
        expect(answer.ok(), `the send answered ${answer.status()}`).toBe(true);
        const json = await answer.json();
        expect(json.status, `the send was refused: ${json.content}`).toBe(true);
        await this.expectClosed();
        return answer;
    }

    async cancel() {
        await this.cancelLink.click();
        await this.expectClosed();
        await afterWindowClose(this.page);
    }
};

// ---------------------------------------------------------------------------
// "Disable {name}" / "Enable {name}" (Rules 10–13)
// ---------------------------------------------------------------------------

exports.DisableUserWindow = class DisableUserWindow extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} title the window's heading ("Disable Quinn Ashdown", "Enable User", …)
     */
    constructor(page, title) {
        super(page);
        this.dialog = page.getByRole('dialog', {name: title, exact: true});
        this.heading = this.dialog.getByRole('heading', {name: title, exact: true});
        this.reason = this.dialog.locator('textarea[name="disableReason"]');
        this.okButton = this.dialog.getByRole('button', {name: 'OK', exact: true});
        this.cancelLink = this.dialog.getByRole('link', {name: 'Cancel', exact: true});
        this.closeButton = this.dialog.getByRole('button', {name: 'Close', exact: true});
    }

    /** Wait for the window and its form (or refusal) to arrive. */
    async expectOpen() {
        await expect(this.heading).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** Wait for the window's reason box. */
    async expectForm() {
        await this.expectOpen();
        await expect(this.reason).toBeVisible({timeout: T});
    }

    /** The "Current Roles : …" line. */
    rolesLine(text) {
        return this.dialog.getByText(text, {exact: true});
    }

    /** A sentence in the window. */
    sentence(text) {
        return this.dialog.getByText(text, {exact: true});
    }

    /** Press "OK" and wait for the window to close. */
    async ok() {
        await this.okButton.click();
        await expect(this.heading).toHaveCount(0, {timeout: T});
        await afterWindowClose(this.page);
    }

    async cancel() {
        await this.cancelLink.click();
        await expect(this.heading).toHaveCount(0, {timeout: T});
        await afterWindowClose(this.page);
    }
};

// ---------------------------------------------------------------------------
// The "Remove" dialog (Rules 14, 15)
// ---------------------------------------------------------------------------

exports.RemoveUserDialog = class RemoveUserDialog extends BasePage {
    constructor(page) {
        super(page);
        this.dialog = page.getByRole('dialog', {name: 'Remove', exact: true});
        this.okButton = this.dialog.getByRole('button', {name: 'OK', exact: true});
        this.cancelButton = this.dialog.getByRole('button', {name: 'Cancel', exact: true});
    }

    async expectOpen() {
        await expect(this.dialog).toBeVisible({timeout: T});
    }

    sentence(text) {
        return this.dialog.getByText(text, {exact: true});
    }

    async cancel() {
        await this.cancelButton.click();
        await expect(this.dialog).toHaveCount(0, {timeout: T});
        await afterWindowClose(this.page);
    }

    /** Press "OK"; resolves with the remove request's answer. */
    async ok() {
        const answer = this.page.waitForResponse(
            (r) => r.url().includes('remove-user') && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.okButton.click();
        const response = await answer;
        await expect(this.dialog).toHaveCount(0, {timeout: T});
        await afterWindowClose(this.page);
        return response;
    }
};

// ---------------------------------------------------------------------------
// The legacy users grid ("Merge user" window, Settings wizard › "Users")
// ---------------------------------------------------------------------------

class UserGrid extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {import('@playwright/test').Locator} scope the element holding the grid
     */
    constructor(page, scope) {
        super(page);
        this.scope = scope;
        this.filterForm = scope.locator('form.filter').first();
        this.searchInput = this.filterForm.locator('input[name="search"]');
        this.roleSelect = this.filterForm.locator('select[name="userGroup"]');
        this.noRoleBox = this.filterForm.locator('input[name="includeNoRole"]');
        this.searchButton = this.filterForm.getByRole('button', {name: 'Search', exact: true});
    }

    /** The grid's title ("Current Users", "Merge into this User"). */
    title(text) {
        return this.scope.locator('.header h4, h4').filter({hasText: whole(text)});
    }

    /** The column headings, in order. */
    async columns() {
        const heads = this.scope.locator('table th');
        await expect(heads.first()).toBeVisible({timeout: T});
        return (await heads.allInnerTexts()).map(flat).filter(Boolean);
    }

    /** Every visible row. */
    rows() {
        return this.scope.locator('tr.gridRow:visible');
    }

    /** A row by text it contains (a username or an email address). */
    row(text) {
        return this.scope.locator('tr.gridRow').filter({hasText: text});
    }

    /** A row's cells as text: Given Name, Family Name, Username, Roles, Email. */
    async rowCells(text) {
        const cells = this.row(text).first().locator('td');
        return (await cells.allInnerTexts()).map(flat).map((c) => c.replace(/^Settings\s*/, ''));
    }

    /** The row's arrow ("Settings" to a screen reader). */
    arrow(text) {
        return this.row(text).first().locator('a.show_extras, a.hide_extras');
    }

    /** The action links of a row (the next `tr`). */
    actionLinks(text) {
        return this.row(text).first().locator('xpath=following-sibling::tr[1]').locator('a');
    }

    /** One action link of a row by its label. */
    actionLink(text, label) {
        return this.actionLinks(text).filter({hasText: whole(label)});
    }

    /** Open a row's actions (its arrow), unless already open. */
    async openRow(text) {
        const arrow = this.row(text).first().locator('a.show_extras');
        if (await arrow.count()) {
            await arrow.click();
        }
        await expect(this.actionLinks(text).first()).toBeVisible({timeout: T});
    }

    /** The labels of a row's action links (opens the row). */
    async actionLabels(text) {
        await this.openRow(text);
        return (await this.actionLinks(text).allInnerTexts()).map(flat).filter(Boolean);
    }

    /** Press one of a row's actions. */
    async chooseAction(text, label) {
        await this.openRow(text);
        await this.actionLink(text, label).click();
    }

    /** The header's "Search" link. */
    searchLink() {
        return this.scope.locator('a').filter({hasText: /^\s*Search\s*$/}).first();
    }

    /** Show the filter form (press "Search" above the list unless it is open). */
    async openSearchForm() {
        if (!(await this.searchInput.isVisible())) {
            await this.searchLink().click();
        }
        await expect(this.searchInput).toBeVisible({timeout: T});
    }

    /** The role select's chosen option. */
    async selectedRole() {
        return flat(await this.roleSelect.evaluate((s) => s.options[s.selectedIndex].text));
    }

    /** The "Include users with no roles in this {context}." label. */
    noRoleLabel(text) {
        return this.filterForm.getByText(text, {exact: true});
    }

    /**
     * Fill the filter form and press its "Search"; resolves once the grid has
     * answered and redrawn.
     */
    async search({text = '', includeNoRole = false} = {}) {
        await this.openSearchForm();
        await this.searchInput.fill(text);
        await this.noRoleBox.setChecked(includeNoRole);
        const answer = this.page.waitForResponse(
            (r) => /fetch-grid/.test(r.url()),
            {timeout: T}
        );
        await this.searchButton.click();
        await answer;
        await waitForJQueryIdle(this.page);
    }

    /** The line under the grid ("Items per page: … 1 - n of n items"), collapsed. */
    async pagingLine() {
        const paging = this.scope.locator('.gridPaging').first();
        await expect(paging).toBeVisible({timeout: T});
        return flat(await paging.innerText());
    }

    /** The page links under the grid. */
    pageLinks() {
        return this.scope.locator('.gridPaging a');
    }

    /** The header's "Add User" link. */
    addUserLink() {
        return this.scope.locator('a').filter({hasText: /^\s*Add User\s*$/}).first();
    }
}
exports.UserGrid = UserGrid;

// ---------------------------------------------------------------------------
// The "Merge user" window (Rules 16, 17)
// ---------------------------------------------------------------------------

exports.MergeUserWindow = class MergeUserWindow extends BasePage {
    constructor(page) {
        super(page);
        this.dialog = page.getByRole('dialog', {name: 'Merge user', exact: true});
        this.grid = new UserGrid(page, this.dialog);
        this.confirmDialog = page.getByRole('dialog', {name: 'Confirm', exact: true});
        this.confirmOk = this.confirmDialog.getByRole('button', {name: 'OK', exact: true});
        this.confirmCancel = this.confirmDialog.getByRole('button', {name: 'Cancel', exact: true});
    }

    /** Wait for the window and its first row. */
    async expectOpen() {
        await expect(this.dialog.getByRole('heading', {name: 'Merge user', exact: true})).toBeVisible({timeout: T});
        await expect(this.dialog.locator('tr.gridRow').first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** "Merge into this User" on a row; waits for the "Confirm" dialog. */
    async mergeInto(text) {
        await this.grid.chooseAction(text, 'Merge into this User');
        await expect(this.confirmDialog).toBeVisible({timeout: T});
    }

    /** The "Confirm" dialog's sentence. */
    async confirmText() {
        return flat(await this.confirmDialog.locator('p').first().innerText());
    }

    async cancelConfirm() {
        await this.confirmCancel.click();
        await expect(this.confirmDialog).toHaveCount(0, {timeout: T});
        await afterWindowClose(this.page);
    }

    /** "OK" on "Confirm"; resolves with the merge request's answer. */
    async confirm() {
        const answer = this.page.waitForResponse(
            (r) => r.url().includes('merge-users') && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.confirmOk.click();
        return answer;
    }

    async expectClosed() {
        await expect(this.dialog).toHaveCount(0, {timeout: T});
        await afterWindowClose(this.page);
    }
};

// ---------------------------------------------------------------------------
// Administration › "Hosted Journals" and the Settings wizard (Rule 19)
// ---------------------------------------------------------------------------

exports.HostedContextsPage = class HostedContextsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {{hostedLabel: string}} labels "Hosted Journals" / "Hosted Presses" / "Hosted Servers"
     */
    constructor(page, {hostedLabel}) {
        super(page);
        this.hostedLabel = hostedLabel;
        this.grid = page.locator('.pkp_controllers_grid').first();
    }

    /** Administration, then its "Hosted …" link; waits for the list. */
    async gotoFromAdministration() {
        await this.page.goto(this.siteUrl('/admin'));
        await this.page.getByRole('link', {name: this.hostedLabel, exact: true}).first().click();
        await this.page.waitForURL(/admin\/contexts/, {timeout: T, waitUntil: 'commit'});
        await expect(this.page.locator('tr.gridRow').first()).toBeVisible({timeout: T});
    }

    /** A context's row, found by its path cell (never by position). */
    row(path) {
        return this.page
            .locator('tr.gridRow')
            .filter({has: this.page.locator('td').filter({hasText: whole(path)})});
    }

    /** The row's arrow, then "Settings wizard"; waits for the wizard. */
    async openSettingsWizard(path) {
        const row = this.row(path).first();
        await row.locator('a.show_extras').click();
        const next = row.locator('xpath=following-sibling::tr[1]');
        await next.getByRole('link', {name: 'Settings wizard', exact: true}).click();
        await this.page.waitForURL(/admin\/wizard\//, {timeout: T, waitUntil: 'commit'});
        await expect(this.page.getByRole('tab').first()).toBeVisible({timeout: T});
    }

    /** On the wizard: press a tab and return the grid its panel holds. */
    async openWizardTab(name) {
        await this.page.getByRole('tab', {name, exact: true}).first().click();
        const panel = this.wizardGridPanel();
        await expect(panel.locator('tr.gridRow').first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
        return new UserGrid(this.page, panel);
    }

    /** The wizard's visible tab panel that holds a legacy grid. */
    wizardGridPanel() {
        return this.page
            .locator('[role="tabpanel"]:visible')
            .filter({has: this.page.locator('.pkp_controllers_grid')})
            .last();
    }

    /** Reload the wizard page and return to a tab (a fresh read of the grid). */
    async reloadWizardTab(name) {
        await this.page.reload();
        await expect(this.page.getByRole('tab').first()).toBeVisible({timeout: T});
        return this.openWizardTab(name);
    }
};

// ---------------------------------------------------------------------------
// "Add User" and "Edit User" (Rules 21–24)
// ---------------------------------------------------------------------------

exports.UserDetailsWindow = class UserDetailsWindow extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} title "Add User" or "Edit User"
     */
    constructor(page, title) {
        super(page);
        this.title = title;
        this.form = page.locator('form#userDetailsForm').last();
        this.dialog = page.getByRole('dialog', {name: title, exact: true}).filter({has: this.form});
        this.roleForm = page.locator('form#userRoleForm').last();
        this.givenName = this.form.locator('input[name="givenName[en]"]');
        this.familyName = this.form.locator('input[name="familyName[en]"]');
        this.username = this.form.locator('input[name="username"]');
        this.email = this.form.locator('input[name="email"]');
        this.password = this.form.locator('input[name="password"]');
        this.password2 = this.form.locator('input[name="password2"]');
        this.generatePassword = this.form.locator('input[name="generatePassword"]');
        this.mustChangePassword = this.form.locator('input[name="mustChangePassword"]');
        this.sendNotify = this.form.locator('input[name="sendNotify"]');
        this.userUrl = this.form.locator('input[name="userUrl"]');
        this.gossip = this.form.locator('textarea[name="gossip"]');
        this.suggestButton = this.form.getByRole('button', {name: 'Suggest', exact: true});
        this.moreDetailsLink = this.form.getByRole('link', {name: /More User Details/});
        this.okButton = this.form.getByRole('button', {name: 'OK', exact: true});
        this.cancelLink = this.form.getByRole('link', {name: 'Cancel', exact: true});
    }

    /** Wait for the window's form (step 1 or "Edit User"). */
    async expectOpen() {
        await expect(this.form).toBeVisible({timeout: T});
        await expect(this.givenName).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    async expectClosed() {
        await expect(this.form).toHaveCount(0, {timeout: T});
        await afterWindowClose(this.page);
    }

    /** A heading inside the window ("Step #1: Fill in User Details", "User Details", …). */
    stepHeading(text) {
        return this.page.locator('form#userDetailsForm, form#userRoleForm').last().locator('h3').filter({hasText: whole(text)});
    }

    /** The window's own "Close" (the × at its top). */
    closeButton() {
        return this.page
            .getByRole('dialog', {name: this.title, exact: true})
            .last()
            .getByRole('button', {name: 'Close', exact: true});
    }

    /**
     * The client-side error line jQuery validation puts under a box
     * (`label.error` pointing at the box's runtime id).
     *
     * @param {import('@playwright/test').Locator} input
     */
    async errorFor(input) {
        const id = await input.getAttribute('id');
        return this.form.locator(`label.error[for="${id}"]`);
    }

    /** A labelled text shown in the form ("Homepage URL", "Editorial Notes", …). */
    label(text) {
        return this.form.getByText(text, {exact: true});
    }

    /** Press "Suggest" and wait for its answer to be written into the box. */
    async suggest() {
        await this.suggestButton.click();
        await waitForJQueryIdle(this.page);
    }

    async openMoreDetails() {
        await this.moreDetailsLink.click();
        await expect(this.userUrl).toBeVisible({timeout: T});
    }

    /** Press "OK" and wait for the page's requests to settle. */
    async pressOk() {
        await this.okButton.click();
        await waitForJQueryIdle(this.page);
    }

    /**
     * A floating notice at the top of the page (`.app__notifications`), by
     * text; several refusals of one "OK" arrive in one notice, and notices
     * pile up across tries.
     */
    notice(text) {
        return this.page.locator('.app__notifications').filter({hasText: text});
    }

    async cancel() {
        await this.cancelLink.click();
        await this.expectClosed();
    }

    // Step 2 and the role boxes of "Edit User" ---------------------------------

    /** The form that holds the role boxes (step 2's, or "Edit User"'s own). */
    rolesForm() {
        return this.title === 'Add User' ? this.roleForm : this.form;
    }

    /** A "User Roles" box by the role's name. */
    roleBox(role) {
        return this.rolesForm()
            .locator('input[name="userGroupIds[]"]')
            .and(this.rolesForm().getByRole('checkbox', {name: role, exact: true}));
    }

    /** An "Appear on Masthead" box by the role's name. */
    mastheadBox(role) {
        return this.rolesForm()
            .locator('input[name="mastheadUserGroupIds[]"]')
            .and(this.rolesForm().getByRole('checkbox', {name: role, exact: true}));
    }

    /** Every "Appear on Masthead" box as {label, checked, disabled}. */
    async mastheadBoxes() {
        return this.rolesForm()
            .locator('input[name="mastheadUserGroupIds[]"]')
            .evaluateAll((els) =>
                els.map((e) => ({
                    label: ((e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || {}).innerText || '')
                        .replace(/\s+/g, ' ')
                        .trim(),
                    checked: e.checked,
                    disabled: e.disabled,
                }))
            );
    }

    /** Wait for step 2 ("Step #2: Add User Roles to {name}"). */
    async expectStep2(name) {
        await expect(this.roleForm).toBeVisible({timeout: T});
        await expect(this.roleForm.locator('h3').filter({hasText: whole(`Step #2: Add User Roles to ${name}`)})).toBeVisible();
        await waitForJQueryIdle(this.page);
    }

    /** Press step 2's "Save" and wait for the page's requests to settle. */
    async pressSave() {
        await this.roleForm.getByRole('button', {name: 'Save', exact: true}).click();
        await waitForJQueryIdle(this.page);
    }
};
