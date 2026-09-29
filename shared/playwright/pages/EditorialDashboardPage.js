/**
 * @file lib/pkp/playwright/pages/EditorialDashboardPage.js
 *
 * The editorial submissions dashboard (dashboard/editorial) — the same
 * ui-library DashboardPage that serves the author's list, so the list
 * mechanics (heading, sidebar views, in-page search, rows, workflow panel,
 * bulk delete) are inherited from MySubmissionsPage. This subclass rebinds
 * the sidebar to the "Editor Dashboard" group (view links are disambiguated
 * by their dashboard/editorial href — an account holding Author too has a
 * second group with colliding view names) and adds the editorial-only
 * surfaces. App differences are WHICH views/filters exist (spec U23 Rule 2 /
 * Fields table) and each app's vocabulary; per-app suites pass their own
 * names — the mechanics below are one ui-library everywhere. The only
 * genuine app divergence is OPS's workflow panel (no "Workflow:" heading),
 * carried by apps/ops/playwright/pages/EditorialDashboardPage.js.
 * Feature spec: docs/specs/U23-submissions-dashboard.md.
 *
 * Editorial-only surfaces covered:
 * - the sidebar's global "Search submissions" box and the "Search Results"
 *   view it opens (U23 Rule 7);
 * - the search/filter chips row above the table and its clear controls;
 * - the Filters side panel's editors-only fields (U23 Rule 8; the button,
 *   the panel and its plain fields are inherited);
 * - the sortable ID / Days column headers and the pager (U23 Rules 4–5);
 * - activity-cell action buttons ("Assign Editor", "Assign Reviewers") and
 *   the per-reviewer activity indicators with their popovers (U23 Rules
 *   9–10);
 * - the column headers and a row's Stage / Editorial Activity cells (U23
 *   Rule 5), the Filters panel's suggest-list and checkbox fields, the
 *   pager's page buttons, the sidebar badges' color variant (U23 Rule 1)
 *   and the "More Actions" menu's grayed state (U23 Rule 12).
 */
const {expect} = require('@playwright/test');
const {MySubmissionsPage} = require('./MySubmissionsPage.js');

exports.EditorialDashboardPage = class EditorialDashboardPage extends MySubmissionsPage {
    async goto(query = '') {
        await this.page.goto(this.url(query));
        await expect(this.heading()).toBeVisible({timeout: 30_000});
    }

    /**
     * The dashboard's own address, `{context}/dashboard/editorial` (plus an
     * optional query): the landing of an account holding an editorial role
     * (U22 Rule 3, scenario 5), which the inherited `url()` would otherwise
     * misreport as the author list's.
     */
    url(query = '') {
        return this.contextUrl(this.contextPath, `/dashboard/editorial${query}`);
    }

    /**
     * The landing an editorial account gets from the context's login or the
     * retired list address (U22 Rule 3, fn-s5): the "Assigned to me" view
     * at this address, with the "Editor Dashboard" group in the sidebar.
     * Pass a count to pin the heading's total.
     */
    async expectLanded(count = null) {
        await expect(this.page).toHaveURL(/\/dashboard\/editorial/, {timeout: 30_000});
        await this.expectViewHeading('Assigned to me', count);
        await expect(this.menuGroupLink()).toBeVisible({timeout: 30_000});
    }

    /** Open the dashboard directly on a view by its address (Rule 4). */
    async gotoView(viewId) {
        await this.goto(`?currentViewId=${viewId}`);
    }

    /** The content area (everything that is not the backend sidebar). */
    contentArea() {
        return this.page.locator('#app-main');
    }

    /** The "Editor Dashboard" sidebar menu group entry. */
    menuGroupLink() {
        return this.sideNav()
            .locator('a')
            .filter({has: this.page.getByText('Editor Dashboard', {exact: true})});
    }

    /**
     * A view entry in the editorial sidebar group. Scoped by the entry's
     * dashboard/editorial href so an Author-holding account's identically
     * named "My Submissions as Author" entries never match.
     */
    viewLink(name) {
        return this.sideNav()
            .locator('a[href*="dashboard/editorial"]')
            .filter({has: this.page.getByText(name, {exact: true})});
    }

    /**
     * A view entry's count badge (the `<Badge>` beside the label). Its
     * classes carry the color variant: `bg-attention` on the entries the
     * sidebar flags for attention ("Reviews overdue", whatever it counts),
     * `bg-secondary` with `text-primary` on the plain ones (U23 Rule 1).
     */
    viewBadge(name) {
        return this.viewLink(name)
            .locator('span')
            .filter({hasText: /^\s*\d+\s*$/})
            .first();
    }

    /** The number a view entry's badge reads right now (U23 Rule 5: the
     * heading's total is expected to match it). */
    async readViewCount(name) {
        const text = await this.viewBadge(name).innerText();
        return Number(text.trim());
    }

    /** The sidebar's global search box (label "Search submissions"). Once a
     * phrase is typed, the clear button appears inside the same label and
     * the accessible name grows to "Search submissions Clear search phrase"
     * — match by prefix, never exactly. The sidebar scope keeps the in-page
     * box ("Search submissions, ID, …" under #app-main) out. */
    globalSearchBox() {
        return this.sideNav().getByRole('searchbox', {name: /^Search submissions/});
    }

    /** Submit a phrase through the sidebar's global search (Enter commit);
     * lands on the "Search Results" view. */
    async globalSearch(phrase) {
        const box = this.globalSearchBox();
        await expect(box).toBeVisible({timeout: 30_000});
        await box.click();
        // Clear any previous phrase without submitting (Enter is the commit).
        await box.fill('');
        await box.pressSequentially(phrase, {delay: 25});
        await box.press('Enter');
        await this.expectViewHeading('Search Results');
    }

    /** The "Search: {phrase}" chip above the table. Pass the phrase to pin
     * the chip's content, omit it to match any active-search chip. */
    searchChip(phrase = '') {
        let chip = this.page
            .locator('div.bg-selection-light')
            .filter({hasText: 'Search:'});
        if (phrase) {
            chip = chip.filter({hasText: phrase});
        }
        return chip;
    }

    /** The search chip's X (scoped to the chip — the sidebar box carries an
     * identically named clear control). */
    searchChipClearButton() {
        return this.searchChip().getByRole('button', {name: 'Clear search phrase'});
    }

    /** Clear the search via the chip's X. */
    async clearSearchChip() {
        await this.searchChipClearButton().click();
    }

    /** A filter chip above the table, matched by its "{field}: {value}" text. */
    filterChip(text) {
        return this.page.locator('div.bg-selection-light').filter({hasText: text});
    }

    /**
     * A filter chip's remove button — its accessible name is
     * "Clear filter: {field}: {value}", so the name doubles as the chip
     * presence assertion.
     */
    filterChipButton(text) {
        return this.page.getByRole('button', {
            name: new RegExp(`^Clear filter: ${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
        });
    }

    /** The chips row's "Clear Filters" button (exists while filters are
     * active; it stays behind an open Filters panel, whose own button then
     * matches too, so press it with the panel closed; U23 I29 check). */
    clearFiltersButton() {
        return this.page.getByRole('button', {name: 'Clear Filters', exact: true});
    }

    /**
     * Set the "Days since last activity" slider (PrimeVue slider — keyboard
     * driven; starts at 0, step 1).
     */
    async setDaysSinceLastActivity(days) {
        // Keyboard-driven (a track click would jump to the pointer position).
        const slider = this.filtersModal().getByRole('slider');
        await slider.focus();
        for (let i = 0; i < days; i++) {
            await slider.press('ArrowRight');
        }
        await expect(slider).toHaveAttribute('aria-valuenow', String(days));
    }

    /** Apply the open Filters panel and wait for it to close. */
    async applyFilters() {
        await this.filtersModal()
            .getByRole('button', {name: 'Apply Filters', exact: true})
            .click();
        await expect(this.filtersModal()).toHaveCount(0, {timeout: 30_000});
    }

    /**
     * A column header by its label ('ID', 'Submissions', 'Stage', 'Days',
     * 'Editorial Activity', 'Actions'). The sortable ones carry a
     * screen-reader "Sort" after the label and CSS upper-cases every
     * header, so the match is a case-insensitive word-anchored prefix.
     */
    columnHeader(name) {
        return this.page.getByRole('columnheader', {
            name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
        });
    }

    /** The small colored dot beside the Stage cell's text (`bg-stage-*`). */
    stageDot(row) {
        return row.locator('[class*="bg-stage-"]');
    }

    /**
     * A suggest-list field of the open Filters panel by its label
     * ("Assigned To Editor"; "Assigned to Moderator" on a preprint server —
     * the suite passes its app's label). Its options render only after a
     * name is typed; read them with `suggestOptions()`.
     */
    filterSuggestField(label) {
        return this.filtersModal().getByRole('combobox', {name: label});
    }

    /** The options a suggest-list field currently offers (page-wide: the
     * list portals out of the field). */
    suggestOptions() {
        return this.page.getByRole('option');
    }

    /** Pick a suggest-list option by its text ("Sela Sectioneditor"); the
     * field then holds the pick and the list closes. */
    async pickSuggestOption(text) {
        const option = this.suggestOptions().filter({hasText: text});
        await expect(option).toBeVisible({timeout: 30_000});
        await option.click();
        await expect(this.suggestOptions()).toHaveCount(0, {timeout: 30_000});
    }

    /**
     * A checkbox option of the open Filters panel by its label: the
     * "Section" field's sections on a journal or preprint server (U23
     * Fields table; a press has no such field), and any other options
     * field the panel grows.
     */
    filterCheckbox(label) {
        return this.filtersModal().getByRole('checkbox', {name: label, exact: true});
    }

    /** The pager's button for page `n` (accessible name "Go to Page n"). */
    pagerPageButton(n) {
        return this.pager().getByRole('button', {name: new RegExp(`Page ${n}$`)});
    }

    /**
     * Open the "More Actions" menu and return its "Delete Incomplete
     * Submissions" entry, which is grayed (`aria-disabled`) while the
     * current page of the list has no incomplete row (U23 Rule 12). Close
     * the menu again with `closeMoreActions()`.
     */
    async openMoreActions() {
        await this.moreActionsButton().click();
        const item = this.bulkDeleteMenuItem();
        await expect(item).toBeVisible({timeout: 30_000});
        return item;
    }

    /** Close an open "More Actions" menu without choosing an entry: a second
     * press on the button toggles the menu shut (Escape leaves a menu whose
     * only entry is grayed open, since nothing in it can take focus). */
    async closeMoreActions() {
        await this.moreActionsButton().click();
        await expect(this.bulkDeleteMenuItem()).toBeHidden({timeout: 30_000});
    }

    /** A sortable column header's sort button ('ID' or 'Days') — the button
     * inside the columnheader carries the label plus a screen-reader "Sort"
     * text (TableColumn.vue). */
    sortButton(columnName) {
        return this.page
            .getByRole('columnheader', {name: columnName})
            .getByRole('button');
    }

    /** All data rows of the submissions table (header row excluded). */
    dataRows() {
        return this.page.locator('table tbody tr');
    }

    /** The topmost submission row of the table (order assertions). */
    firstDataRow() {
        return this.dataRows().first();
    }

    /** The pager under the table (nav "View additional pages"). */
    pager() {
        return this.page.getByRole('navigation', {name: 'View additional pages'});
    }

    /** A row's "Assign Editor" activity-cell button (U23 Rule 9d). */
    assignEditorButton(row) {
        return row.getByRole('button', {name: 'Assign Editor', exact: true});
    }

    /** A row's "Assign Reviewers" activity-cell button (U23 Rule 9e). */
    assignReviewersButton(row) {
        return row.getByRole('button', {name: 'Assign Reviewers', exact: true});
    }

    /**
     * A row's per-reviewer activity indicators (U23 Rule 10). The indicator
     * button's accessible name carries the status headline ("Awaiting
     * Response from the reviewer", "Review completed on {date}", …).
     */
    activityIndicator(row, statusPattern) {
        return row.getByRole('button', {name: statusPattern});
    }

    /**
     * Open the popover of the row's indicator that belongs to a named
     * reviewer and return it. The indicator's accessible name carries only
     * the status headline; the reviewer's name is rendered inside the
     * popover, and a submission's review assignments arrive unordered
     * (Postgres, no ORDER BY), so a positional pick among same-status
     * indicators opens either reviewer. This waits for the row's expected
     * number of `statusPattern` indicators (`count`, when given), then
     * opens each in turn until the popover names `reviewerName`, closing
     * the others.
     */
    async openActivityPopoverFor(row, statusPattern, reviewerName, {count = null} = {}) {
        const indicators = this.activityIndicator(row, statusPattern);
        if (count !== null) {
            await expect(indicators).toHaveCount(count, {timeout: 30_000});
        }
        const total = await indicators.count();
        const panel = this.activityPopover(row);
        for (let i = 0; i < total; i++) {
            await indicators.nth(i).click();
            await expect(panel).toBeVisible({timeout: 30_000});
            if ((await panel.innerText()).includes(reviewerName)) {
                return panel;
            }
            await this.closeActivityPopover(row);
        }
        throw new Error(
            `No ${statusPattern} indicator of the row names "${reviewerName}" (${total} checked)`
        );
    }

    /** A row's Editorial Activity cell (fifth column, U23 Rule 9); empty
     * once a Submission-stage row has its editor (Rule 9i). The ID column
     * is the row's header (`th`) and the editorial list has a "Days"
     * column, so among the row's `cell`s it is the fourth (the fifth is
     * "Actions", whose text reads "View"). */
    activityCell(row) {
        return row.getByRole('cell').nth(3);
    }

    /** The "Review Details: {title}" window a popover's "View details"
     * opens — the same window the workflow's Reviewers panel opens (U23
     * Rule 10). Close it with its own "Close" button. */
    reviewDetailsDialog() {
        return this.page.getByRole('dialog', {name: /^Review Details:/});
    }

    /** Arm a wait for the list's next reload (its submissions fetch — the
     * "Assigned to me" view fetches `_submissions/assigned`, every other
     * view `_submissions`); call before the action that should reload the
     * list and await the promise after it. */
    listReload() {
        return this.page.waitForResponse(
            (r) => r.request().method() === 'GET' && /\/_submissions(\/assigned)?\?/.test(r.url()),
            {timeout: 30_000}
        );
    }
};
