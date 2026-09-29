// @ts-check
/**
 * @file shared/playwright/pages/RolesConfigurationPages.js
 *
 * Page objects for U54 "Roles configuration" (docs/specs/U54-roles-configuration.md),
 * shared by the OJS, OMP and OPS suites. App-neutral (PRINCIPLES M2): every
 * on-screen word that differs per app (the stage columns, the level names,
 * the "Site Access Options" labels, role names) is passed in by the suite;
 * the locators are the markup the three apps share. The Users & Roles page's
 * "Users" tab and "Invite to a role" are U53's `UsersListPage`
 * (UsersManagementPages.js); the invitation wizard is each app's own.
 *
 * Surfaces:
 * - RolesTab — Settings › Users & Roles › "Roles": the legacy grid
 *   `#roleGridContainer` with its "Current Roles" header, the "Search" and
 *   "Create New Role" links, the filter form behind "Search", the rows (name,
 *   level, one stage box per column), the paging line, "Items per page:" and
 *   the page links, each row's "Settings" arrow with "Edit" / "Remove", and
 *   the notices at the top right.
 * - RoleWindow — the role window (`form#userGroupForm`), titled "Create New
 *   Role" or "Edit": "Permission level", "Role Name", "Abbreviation", "Stage
 *   Assignment", "Role Options", "Cancel" and "OK".
 * - RemoveRoleDialog — the "Confirm" window of a row's "Remove".
 * - SiteAccessTab — the "Site Access Options" tab: its groups, boxes,
 *   radios, "Save" and "Saved".
 *
 * DOM facts the locators rely on (U54 claim check, 2026-09-26, three apps;
 * `.reports/U54/screen-notes.md`):
 * - rows are `tbody tr.gridRow`; a row's name is `[id$="-name"] .label`, its
 *   level `[id$="-roleId"] .label`; the stage boxes are unlabelled checkboxes
 *   in column order (register A8); the arrow is `a.show_extras` (then
 *   `a.hide_extras`), and "Edit" / "Remove" live in the NEXT `tr`;
 * - the filter form `#userGroupSearchForm` is hidden until the header's
 *   "Search" link is pressed and folds away again after every choice;
 *   every choice (filter, per page, page link) redraws through
 *   `user-group-grid/fetch-grid`;
 * - a pressed stage box keeps its old look until the page is reloaded
 *   (register A5), so a box is read after `reload()`;
 * - the role window's "Stage Assignment" (`#userGroupStageContainer`) shows
 *   and hides with a 600 ms jQuery animation the CSS motion switch does not
 *   reach, so a level change is read once no element is `:animated`;
 * - notices come as `.app__notifications` toasts whose text ends "× Close".
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {afterWindowClose} = require('./UsersManagementPages.js');

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
 * Wait until jQuery is idle and no jQuery animation is running.
 *
 * @param {import('@playwright/test').Page} page
 */
async function settle(page) {
    await waitForJQueryIdle(page);
    // eslint-disable-next-line no-undef
    await page.waitForFunction(() => !window.jQuery || window.jQuery(':animated').length === 0, null, {timeout: T});
}

/** Predicate for the grid's redraw request. */
const isFetchGrid = (r) => r.url().includes('user-group-grid/fetch-grid');

/**
 * What `RolesTab.openRowActions()` throws when the role asked for is the
 * first row of the Roles list: the row has no "Settings" arrow, so no
 * "Edit" or "Remove" (register A1), and where a role lands is the
 * database's storage order (A13), which no screen changes.
 */
class FirstRowError extends Error {
    /** @param {string} role */
    constructor(role) {
        super(
            `"${role}" is the first row of this page of the Roles list, which has no "Settings" arrow, so no "Edit" or "Remove" (register A1). The list keeps no fixed order (A13) and no filter or page size moves a first row down; the role landed first in this context's storage order.`
        );
        this.name = 'FirstRowError';
        this.role = role;
    }
}

/**
 * Run a U54 scenario from its seeding, and run it again on a fresh scratch
 * context when, and only when, a role it opens landed first in the Roles
 * list (`FirstRowError`, register A1 met through A13's order), at most
 * `attempts` times. Every attempt seeds its own context and asserts
 * everything; each landing is kept as an `app-defect` annotation and a log
 * line. Any other red, and the last attempt's, is thrown as it is.
 * Mechanism: `.reports/flake-2026-09-29/u54s3/diagnosis.md` (a created
 * role stored on an earlier heap page than its context's own rows).
 *
 * @template T
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {(attempt: number) => Promise<T>} body
 * @param {{attempts?: number}} [options]
 * @returns {Promise<T>}
 */
async function replayWhenFirstRow(testInfo, body, {attempts = 3} = {}) {
    for (let n = 1; ; n++) {
        try {
            return await body(n);
        } catch (error) {
            if (!(error instanceof FirstRowError) || n >= attempts) {
                throw error;
            }
            const description = `U54 A1 (A13's order), attempt ${n}: "${error.role}" was the first row of the Roles list, with no "Settings" arrow; the scenario runs again on a fresh context`;
            testInfo.annotations.push({type: 'app-defect', description});
            // eslint-disable-next-line no-console
            console.log(`[U54 ${testInfo.title.split(':')[0]}] ${description}`);
        }
    }
}

// ---------------------------------------------------------------------------
// Settings › Users & Roles › "Roles"
// ---------------------------------------------------------------------------

class RolesTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{stages: string[]}} options the app's stage columns, in order
     */
    constructor(page, contextPath, {stages}) {
        super(page);
        this.contextPath = contextPath;
        this.stages = stages;
        this.pageHeading = page.locator('main h1').first();
        this.tab = page.getByRole('tab', {name: 'Roles', exact: true});
        this.usersTab = page.getByRole('tab', {name: 'Users', exact: true});
        this.grid = page.locator('#roleGridContainer');
        this.title = this.grid.locator('.header').getByText('Current Roles', {exact: true});
        this.searchLink = this.grid.locator('.header a').filter({hasText: whole('Search')});
        this.createLink = this.grid.getByRole('link', {name: 'Create New Role', exact: true});
        this.filterForm = this.grid.locator('#userGroupSearchForm');
        this.stageFilter = this.filterForm.locator('select[name="selectedStageId"]');
        this.levelFilter = this.filterForm.locator('select[name="selectedRoleId"]');
        this.itemsPerPageBox = this.grid.locator('.gridItemsPerPage');
        this.itemsPerPage = this.grid.locator('select.itemsPerPage');
        this.notices = page.locator('.app__notifications');
    }

    url() {
        return this.contextUrl(this.contextPath, '/management/settings/access');
    }

    /** Open Settings › Users & Roles and its "Roles" tab with its rows. */
    async goto() {
        await this.page.goto(this.url());
        await this.openTab();
    }

    /** Reload the page and open the "Roles" tab again. */
    async reload() {
        await this.page.reload();
        await this.openTab();
    }

    /** Press the "Roles" tab and wait for the list's rows. */
    async openTab() {
        await expect(this.tab).toBeVisible({timeout: T});
        await this.tab.click();
        await expect(this.rows().first()).toBeVisible({timeout: T});
        await settle(this.page);
    }

    /** The column headings, in order. */
    async columns() {
        return (await this.grid.locator('thead th').allInnerTexts()).map(flat);
    }

    /** The visible rows, top to bottom. */
    rows() {
        return this.grid.locator('tbody tr.gridRow:visible');
    }

    /** A row by its role name (whole name). */
    row(name) {
        return this.grid
            .locator('tbody tr.gridRow')
            .filter({has: this.page.locator('[id$="-name"] .label', {hasText: whole(name)})});
    }

    /** The visible rows' names, top to bottom. */
    async rowNames() {
        return (await this.rows().locator('[id$="-name"] .label').allInnerTexts()).map(flat);
    }

    /** A row's "Permission level" cell. */
    level(name) {
        return this.row(name).locator('[id$="-roleId"] .label');
    }

    /** A row's stage boxes, in column order. */
    stageBoxes(name) {
        return this.row(name).locator('input[type="checkbox"]');
    }

    /** A row's box in a stage column (the column's heading). */
    stageBox(name, stage) {
        const index = this.stages.indexOf(stage);
        if (index < 0) {
            throw new Error(`No stage column "${stage}" (${this.stages.join(', ')})`);
        }
        return this.stageBoxes(name).nth(index);
    }

    /** The row's boxes as {stage: {checked, disabled}}. */
    async boxStates(name) {
        const states = await this.stageBoxes(name).evaluateAll((boxes) =>
            boxes.map((b) => ({checked: /** @type {HTMLInputElement} */ (b).checked, disabled: /** @type {HTMLInputElement} */ (b).disabled}))
        );
        return Object.fromEntries(this.stages.map((s, i) => [s, states[i]]));
    }

    /**
     * Press a row's stage box; resolves with the assign-stage /
     * unassign-stage answer.
     */
    async pressStageBox(name, stage) {
        const answer = this.page.waitForResponse((r) => /user-group-grid\/(un)?assign-stage/.test(r.url()), {timeout: T});
        await this.stageBox(name, stage).click();
        return answer;
    }

    /** The line under the rows, "{from} - {to} of {total} items". */
    async pagingLine() {
        const text = await this.grid.innerText();
        const match = text.match(/\d+\s*-\s*\d+\s+of\s+\d+\s+items/);
        return match ? flat(match[0]) : null;
    }

    async expectPagingLine(expected) {
        await expect.poll(() => this.pagingLine(), {timeout: T}).toBe(expected);
    }

    /** The "Items per page:" choices, in order. */
    async itemsPerPageOptions() {
        return (await this.itemsPerPage.locator('option').allInnerTexts()).map(flat);
    }

    /** Choose an "Items per page:" number and wait for the redraw. */
    async chooseItemsPerPage(label) {
        const answer = this.page.waitForResponse(isFetchGrid, {timeout: T});
        await this.itemsPerPage.selectOption({label});
        await answer;
        await settle(this.page);
    }

    /** A page link under the rows ("2", ">", ">>"). */
    pageLink(label) {
        return this.grid.locator('.gridPages a').filter({hasText: whole(label)});
    }

    /** Press a page link and wait for the redraw. */
    async gotoListPage(label) {
        const answer = this.page.waitForResponse(isFetchGrid, {timeout: T});
        await this.pageLink(label).click();
        await answer;
        await settle(this.page);
    }

    /** Press "Search" and wait for the filter form. */
    async openFilters() {
        await this.searchLink.click();
        await expect(this.filterForm).toBeVisible({timeout: T});
    }

    /** A filter's visible label ("List roles assigned to"). */
    filterLabel(text) {
        return this.filterForm.getByText(text, {exact: true});
    }

    /**
     * Choose an entry in a filter list (`which`: 'stage' or 'level'); the list
     * redraws with no button. Opens the form first when it is folded away.
     * Resolves with the redraw's answer.
     */
    async chooseFilter(which, label) {
        if (!(await this.filterForm.isVisible())) {
            await this.openFilters();
        }
        const select = which === 'stage' ? this.stageFilter : this.levelFilter;
        const answer = this.page.waitForResponse(isFetchGrid, {timeout: T});
        await select.selectOption({label});
        const response = await answer;
        await settle(this.page);
        return response;
    }

    /** The entries a filter list offers (`which`: 'stage' or 'level'). */
    async filterOptions(which) {
        const select = which === 'stage' ? this.stageFilter : this.levelFilter;
        return (await select.locator('option').allInnerTexts()).map(flat);
    }

    /** A row's "Settings" arrow. */
    arrow(name) {
        return this.row(name).locator('a.show_extras, a.hide_extras');
    }

    /**
     * Open a row's "Settings" line and return it (the `tr` after the row,
     * which holds "Edit" and "Remove"). An arrow left open by an earlier
     * action is used as it is.
     *
     * The first row of each page has no arrow (register A1), and the list
     * has no fixed order (A13): it is the database's storage order, in which
     * a new context's roles, and a role created or seeded later, can land
     * anywhere, first included (U54 T-ops-1; CI 2026-09-28,
     * `.reports/flake-2026-09-29/u54s3/diagnosis.md`). The level and stage
     * filters and every "Items per page" run the same unordered query with a
     * narrower WHERE or an OFFSET, so they usually keep the rows' relative
     * order, but not always: a row rewritten between two reads (a saved
     * role, or space a parallel test's write reuses) can move, and a page can
     * then repeat or skip a role (U54 Rule 4). No filter or page size moves a
     * first row down, so a role that lands first throws `FirstRowError`
     * (checked: the row has no arrow AND is the list's first row), which
     * `replayWhenFirstRow()` answers with a fresh context; a missing arrow
     * on any other row is a plain failure.
     */
    async openRowActions(name) {
        const row = this.row(name);
        await expect(row).toHaveCount(1, {timeout: T});
        const id = await row.getAttribute('id');
        try {
            await expect(this.arrow(name), `the "Settings" arrow of the "${name}" row`).toHaveCount(1, {timeout: 5_000});
        } catch (error) {
            if (id && id === (await this.rows().first().getAttribute('id'))) {
                throw new FirstRowError(name);
            }
            throw error;
        }
        const line = this.page.locator(`tr[id="${id}"] + tr`);
        const edit = line.getByRole('link', {name: 'Edit', exact: true});
        if (!(await edit.isVisible())) {
            await row.locator('a.show_extras').click();
        }
        await expect(edit).toBeVisible({timeout: T});
        return line;
    }

    /** The labels of a row's "Settings" line. */
    async rowActionLabels(name) {
        const line = await this.openRowActions(name);
        return (await line.getByRole('link').allInnerTexts()).map(flat).filter(Boolean);
    }

    /** "Create New Role": resolves with the window, loaded. */
    async openCreate() {
        await this.createLink.click();
        const win = new RoleWindow(this.page);
        await win.expectReady();
        return win;
    }

    /** A row's "Edit": resolves with the window, loaded. */
    async openEdit(name) {
        const line = await this.openRowActions(name);
        await line.getByRole('link', {name: 'Edit', exact: true}).click();
        const win = new RoleWindow(this.page);
        await win.expectReady();
        return win;
    }

    /** A row's "Remove": resolves with the "Confirm" window. */
    async openRemove(name) {
        const line = await this.openRowActions(name);
        await line.getByRole('link', {name: 'Remove', exact: true}).click();
        const dialog = new RemoveRoleDialog(this.page);
        await dialog.expectOpen();
        return dialog;
    }

    /** A notice at the top right by the sentence it holds. */
    notice(text) {
        return this.notices.getByText(text).first();
    }
}

// ---------------------------------------------------------------------------
// The role window ("Create New Role", a row's "Edit")
// ---------------------------------------------------------------------------

class RoleWindow extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.form = page.locator('form#userGroupForm');
        this.dialog = page.getByRole('dialog').filter({has: this.form});
        this.title = this.dialog.getByRole('heading', {level: 1});
        this.detailsHeading = this.form.getByRole('heading', {name: 'Role details', exact: true});
        this.level = this.form.locator('select[name="roleId"]');
        this.stageSection = this.form.locator('#userGroupStageContainer');
        this.requiredLine = this.form.getByText('Required fields are marked with an asterisk: *', {exact: true});
        this.okButton = this.form.getByRole('button', {name: 'OK', exact: true});
        this.cancelLink = this.form.getByRole('link', {name: 'Cancel', exact: true});
        this.closeButton = this.dialog.getByRole('button', {name: 'Close', exact: true});
    }

    /** Wait for the window's form, loaded and settled. */
    async expectReady() {
        await expect(this.form).toBeVisible({timeout: T});
        await expect(this.level).toBeAttached({timeout: T});
        await expect(this.optionBox('Consider role in masthead list')).toBeAttached({timeout: T});
        await settle(this.page);
    }

    /** "Role Name" in a language (default the primary, `en`). */
    nameBox(locale = 'en') {
        return this.form.locator(`input[name="name[${locale}]"]`);
    }

    /** "Abbreviation" in a language. */
    abbrevBox(locale = 'en') {
        return this.form.locator(`input[name="abbrev[${locale}]"]`);
    }

    /** The chosen "Permission level". */
    async levelLabel() {
        return flat(await this.level.locator('option:checked').innerText());
    }

    /** The levels "Permission level" offers, in order. */
    async levelOptions() {
        return (await this.level.locator('option').allInnerTexts()).map(flat);
    }

    /** Choose a "Permission level" and wait for the window to redraw. */
    async chooseLevel(label) {
        await this.level.selectOption({label});
        await settle(this.page);
    }

    /** A "Stage Assignment" box by its stage name. */
    stageBox(stage) {
        return this.stageSection.getByRole('checkbox', {name: stage, exact: true});
    }

    /** The "Stage Assignment" boxes, in order. */
    stageBoxes() {
        return this.form.locator('input[name="assignedStages[]"]');
    }

    /** The "Stage Assignment" boxes' labels, in order. */
    async stageLabels() {
        return (await this.stageSection.getByRole('listitem').allInnerTexts()).map(flat);
    }

    /** A "Role Options" box by its label. */
    optionBox(label) {
        return this.form.getByRole('checkbox', {name: label, exact: true}).last();
    }

    /** The error under a box ("This field is required."). */
    async errorFor(input) {
        const id = await input.getAttribute('id');
        return this.form.locator(`label.error[for="${id}"]`);
    }

    /** Press "OK" and nothing else (a refusal the window shows itself). */
    async pressOk() {
        await this.okButton.click();
    }

    /**
     * Press "OK" expecting the save: resolves with the answer of
     * update-user-group once the window has closed.
     */
    async save() {
        const answer = this.page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: T});
        await this.okButton.click();
        const response = await answer;
        await expect(this.form).toHaveCount(0, {timeout: T});
        await settle(this.page);
        await afterWindowClose(this.page);
        return response;
    }

    /** Press "Cancel" and wait for the window to close. */
    async cancel() {
        await this.cancelLink.click();
        await this.expectClosed();
    }

    async expectClosed() {
        await expect(this.form).toHaveCount(0, {timeout: T});
        await afterWindowClose(this.page);
    }
}

// ---------------------------------------------------------------------------
// A row's "Remove" › "Confirm"
// ---------------------------------------------------------------------------

class RemoveRoleDialog extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.dialog = page.getByRole('dialog').filter({hasText: 'You are about to remove this role'});
        this.okButton = this.dialog.getByRole('button', {name: 'OK', exact: true});
        this.cancelButton = this.dialog.getByRole('button', {name: 'Cancel', exact: true});
    }

    async expectOpen() {
        await expect(this.dialog).toBeVisible({timeout: T});
    }

    /** The window's text, whitespace-collapsed. */
    async text() {
        return flat(await this.dialog.innerText());
    }

    /** The window's buttons' labels. */
    async buttonLabels() {
        return (await this.dialog.getByRole('button').allInnerTexts()).map(flat).filter(Boolean);
    }

    async cancel() {
        await this.cancelButton.click();
        await expect(this.dialog).toHaveCount(0, {timeout: T});
        await afterWindowClose(this.page);
    }

    /** Press "OK"; resolves with the remove request's answer. */
    async ok() {
        const answer = this.page.waitForResponse((r) => r.url().includes('remove-user-group'), {timeout: T});
        await this.okButton.click();
        const response = await answer;
        await expect(this.dialog).toHaveCount(0, {timeout: T});
        await settle(this.page);
        await afterWindowClose(this.page);
        return response;
    }
}

// ---------------------------------------------------------------------------
// Settings › Users & Roles › "Site Access Options"
// ---------------------------------------------------------------------------

class SiteAccessTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.tab = page.getByRole('tab', {name: 'Site Access Options', exact: true});
        this.panel = page.getByRole('tabpanel', {name: 'Site Access Options'});
        this.saveButton = this.panel.getByRole('button', {name: 'Save', exact: true});
        this.saved = this.panel.locator('[role="status"]').filter({hasText: 'Saved'});
    }

    url() {
        return this.contextUrl(this.contextPath, '/management/settings/access');
    }

    /** Open Settings › Users & Roles and its "Site Access Options" tab. */
    async goto() {
        await this.page.goto(this.url());
        await this.openTab();
    }

    /** Reload the page and open the tab again. */
    async reload() {
        await this.page.reload();
        await this.openTab();
    }

    async openTab() {
        await expect(this.tab).toBeVisible({timeout: T});
        await this.tab.click();
        await expect(this.saveButton).toBeVisible({timeout: T});
    }

    /** A group of the form by its heading ("Site Access", "User Registration"). */
    group(name) {
        return this.panel.getByRole('group', {name, exact: true});
    }

    /** A box by its label. */
    box(label) {
        return this.panel.getByRole('checkbox', {name: label, exact: true});
    }

    /** A radio by its label. */
    radio(label) {
        return this.panel.getByRole('radio', {name: label, exact: true});
    }

    /** Press "Save"; resolves with the context PUT's answer once "Saved" shows. */
    async save() {
        const answer = this.page.waitForResponse(
            (r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET',
            {timeout: T}
        );
        await this.saveButton.click();
        const response = await answer;
        await expect(this.saved.first()).toBeVisible({timeout: T});
        return response;
    }
}

module.exports = {RolesTab, RoleWindow, RemoveRoleDialog, SiteAccessTab, FirstRowError, replayWhenFirstRow, settleRoles: settle};
