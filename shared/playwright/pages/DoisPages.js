// @ts-check
/**
 * @file shared/playwright/pages/DoisPages.js
 *
 * Page objects for the DOIs feature (spec: docs/specs/U45-dois.md), shared
 * by the OJS, OMP and OPS suites. App-neutral: every per-app string (the
 * "DOIs" box's sentence, the kinds' labels, the tab and list titles, the
 * row types "Article" / "Monograph" / "Preprint", the agency names) is
 * passed in by the suite; the strings in DOIS_TEXT are the ones the three
 * apps share (lib/pkp's locale and the ui-library components).
 *
 * Surfaces:
 * - DoiSettings — Settings › Distribution › "DOIs", side tabs "Setup" and
 *   "Registration": the Setup form (the "DOIs" box, "Items with DOIs",
 *   "DOI Prefix", "Automatic DOI Assignment", "DOI Format" with the
 *   "Custom DOI Suffix Pattern" group, "DOI Versioning"), the Registration
 *   form ("Registration Agency", "Automatic Deposit", the agency block's
 *   boxes, the "No Registration Agency Enabled" text, Crossref's
 *   requirements notice), each form's "Save" bounded by its request and
 *   its field refusals; the agency plugins' rows on Settings › Website ›
 *   "Plugins" (enable, and disable through its question).
 * - DoisPage — the DOIs page (`/dois`): heading, the prefix warning and
 *   its link, the kind tabs with their headings and list titles, the
 *   list header ("Search" with "Clear search phrase", "Bulk Actions" with
 *   its items and "Take action on {count} selected item(s).", "Deposit
 *   All"), the "Filters" column (the filter buttons, "Clear filter:
 *   {name}", the "Issues" box), the rows (tick box, name link, number,
 *   badge, expander), an expanded row (version name, the DOI table rows
 *   with their boxes and badges, "Edit" / "Save", "There are {count}
 *   versions." with "View all", the agency panel), the action windows
 *   ("Assign DOIs", "Mark DOIs …", "Export DOIs", "Deposit DOIs",
 *   "Deposit all DOIs"), "DOI Updates Failed", the "DOIs for all versions"
 *   side window and the top-right notices.
 * - The reader side: the "DOI:" line of a work's page and an issue's page,
 *   a book page's format DOI rows, and the article page's Crossmark button.
 *   A book's table of contents and a chapter's page are
 *   `apps/omp/playwright/pages/MonographLandingPages.js`'s.
 *
 * A press's expanded view (Rules 45, 47) adds chapter rows (labelled by the
 * chapter's title), format rows ("Format / {name}") and file rows ("{format}
 * / {file}"), all read through `doiRow`/`doiBox`/`doiBadge`; a chapter
 * without its page has its label greyed (`labelDisabled`), its box disabled
 * after "Edit", and the view carries the note `chapterPageNote` after the
 * table (U45 revision claim checks ccR1/ccR2, 2026-09-29).
 *
 * DOM shapes (U45 claim check, `.reports/U45/screen-notes.md`, ccK1–ccK5,
 * and while the OJS suite was built, 2026-09-26): a row is
 * `[id="list-item-{submission|issue}-{id}"]` (`.listPanel__item--doi`),
 * its tick box an unnamed checkbox (register A8), its expander a button
 * named "Show more details about {id}" / "Hide expanded details about
 * {id}"; an expanded DOI box is a textbox named by its row's type, read
 * only until "Edit"; "Bulk Actions" is a ui-library Dropdown whose items
 * are `.pkpDropdown__action` buttons, closed by pressing it again (Escape
 * does not close it); the list is fetched after the page mounts (a GET to
 * `api/v1/submissions?…` or `api/v1/issues?…`, which every search and
 * filter repeats); a bulk action posts to `api/v1/dois/…/{action}` and
 * the list is fetched again; a DOI box's "Save" posts per changed box
 * (`api/v1/dois` then the item, or `api/v1/dois/{id}`); the notices sit
 * in `.app__notifications` for about five seconds; the Setup "Save" posts
 * to `api/v1/contexts/{id}`, the Registration "Save" to
 * `api/v1/contexts/{id}/registrationAgency`.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {settleDropdown} = require('../support/dropdown.js');

const T = 30_000;

/** The strings the three apps share. */
const DOIS_TEXT = {
    heading: 'DOIs',
    prefixWarning: 'DOIs cannot be assigned unless you provide your assigned DOI prefix. Add DOI prefix.',
    addPrefixLink: 'Add DOI prefix',
    doisOff: 'You cannot call this operation without DOIs enabled.',
    roleDenied: 'The current role does not have access to this operation.',
    prefixRequired: 'A DOI prefix is required',
    notFormatted: 'This is not formatted correctly.',
    patternRequired: 'A DOI suffix pattern is required.',
    patternHelpOpening: 'Enter a custom suffix pattern for each publication type.',
    patternNotSupported: 'Custom pattern not supported',
    noAgency: 'No Registration Agency Enabled',
    noAgencyHelp:
        'DOIs can be automatically minted and deposited with a registration agency. To use this feature, locate and install a plugin from the appropriate registration agency.',
    automaticDeposit: 'Enable automatic depositing',
    requirementsHeading: 'Plugin requirements not met',
    publisherMissing:
        'A journal publisher has not been configured! You must add a publisher institution on the Journal Settings Page.',
    issnMissing: 'A journal ISSN has not been configured! You must add an ISSN on the Journal Settings Page.',
    crossmarkBox:
        'Enable participation in Crossmark to allow readers to check the publication status of articles. Learn more.',
    testDoiPrefixRequired: 'A test DOI prefix is required when using the test system for DOI registration.',
    dataciteIntro: 'Please configure the DataCite export plugin before using it for the first time.',
    updated: 'DOI(s) successfully updated',
    partialFailure: 'Some DOI(s) could not be updated',
    failedTitle: 'DOI Updates Failed',
    assigned: 'Items successfully assigned new DOIs',
    markedRegistered: 'Items successfully marked registered',
    markedUnregistered: 'Items successfully marked unregistered',
    markedStale: 'Items successfully marked needs sync',
    depositQueued: 'Items successfully submitted for deposit',
    takeAction: (count) => `Take action on ${count} selected item(s).`,
    notPublished: 'This item cannot be deposited until it has been published.',
    manuallyRegistered: 'This item has been manually registered with a registration agency.',
    notSubmitted: (agency) => `The metadata for this item has not been submitted to ${agency}.`,
    versionsLine: (count) => `There are ${count} versions.`,
    versionsWindow: 'DOIs for all versions',
    depositAll: 'Deposit All',
    depositAllTitle: 'Deposit all DOIs',
    depositAllQuestion: (agency) =>
        `You are about to schedule all outstanding DOI metadata records to be deposited with ${agency}. Only published items with a DOI will be deposited`,
    exportQuestion: (count, agency) =>
        `You are about to export DOI metadata records for ${count} item(s) for ${agency}. Are you sure you want to export these records?`,
    depositQuestion: (count, agency) =>
        `You are about to send DOI metadata records for ${count} item(s) to ${agency}. Are you sure you want to deposit these records?`,
    markStaleQuestion: (count) =>
        `You are about to mark DOI metadata records for ${count} item(s) as needing to be synced. The Needs Sync status can only be applied to previously submitted DOIs.`,
    columns: ['Type', 'DOIs', 'Status', 'Actions'],
    chapterPageNote: 'Chapters without a landing page cannot have a DOI.',
    disableQuestion: 'Are you sure you want to disable this plugin?',
};
exports.DOIS_TEXT = DOIS_TEXT;

/** Escape a string for a RegExp. */
function esc(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A whole-text matcher that tolerates surrounding whitespace. */
function whole(text) {
    return new RegExp(`^\\s*${esc(text)}\\s*$`);
}
exports.whole = whole;

/** A made "Default" DOI: the prefix, "/", eight lower-case letters and digits, the last two digits (Rule 6a). */
function defaultDoiPattern(prefix) {
    return new RegExp(`^${esc(prefix)}/[a-z0-9]{6}[0-9]{2}$`);
}
exports.defaultDoiPattern = defaultDoiPattern;

/** The list's own GET (the first page, a search, a filter): `api/v1/submissions?…` or `api/v1/issues?…`. */
function isListFetch(response, list = 'submissions') {
    const url = response.url();
    return response.request().method() === 'GET' && new RegExp(`/api/v1/${list}\\?`).test(url);
}
exports.isListFetch = isListFetch;

// ---------------------------------------------------------------------------
// Settings › Distribution › "DOIs"
// ---------------------------------------------------------------------------

class DoiSettings extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.doisPanel = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
        this.setup = this.doisPanel.getByRole('tabpanel', {name: 'Setup', exact: true});
        this.registration = this.doisPanel.getByRole('tabpanel', {name: 'Registration', exact: true});
    }

    url() {
        return this.contextUrl(this.contextPath, '/management/settings/distribution#dois');
    }

    /**
     * Open Settings › Distribution › "DOIs" on a side tab ("Setup" or
     * "Registration") and wait for its "Save". Leaves the page first, so a
     * hash-only address reloads (patterns.md pitfall 17).
     */
    async goto(sideTab = 'Setup') {
        await this.page.goto('about:blank');
        await this.page.goto(this.url());
        await this.openSideTab(sideTab);
    }

    /** Switch to a side tab on the open page (an unsaved change stays, Fields). */
    async openSideTab(sideTab) {
        const top = this.page.getByRole('tab', {name: 'DOIs', exact: true});
        await expect(top).toBeVisible({timeout: T});
        if ((await top.getAttribute('aria-selected')) !== 'true') await top.click();
        const side = this.doisPanel.getByRole('tab', {name: sideTab, exact: true});
        await expect(side).toBeVisible({timeout: T});
        if ((await side.getAttribute('aria-selected')) !== 'true') await side.click();
        const panel = sideTab === 'Setup' ? this.setup : this.registration;
        await expect(panel.getByRole('button', {name: 'Save', exact: true})).toBeVisible({timeout: T});
        return panel;
    }

    // --- Setup ------------------------------------------------------------

    /** The "DOIs" box, by the start of its sentence ("Allow Digital Object Identifiers…"). */
    enableBox() {
        return this.setup.getByRole('checkbox', {name: /^Allow Digital Object Identifiers/});
    }

    /** The "Items with DOIs" group. */
    kindsGroup() {
        return this.setup.getByRole('group', {name: 'Items with DOIs', exact: true});
    }

    /** A kind's box by its label ("Articles", "Issues", …). */
    kindBox(label) {
        return this.kindsGroup().getByRole('checkbox', {name: label, exact: true});
    }

    /** The kinds listed, with their state, top to bottom: `[{label, checked}]`. */
    async kinds() {
        await expect(this.kindsGroup().getByRole('checkbox').first()).toBeVisible({timeout: T});
        return this.kindsGroup()
            .locator('input[type="checkbox"]')
            .evaluateAll((boxes) =>
                boxes.map((b) => ({
                    label: ((b.closest('label') || b.parentElement || b).textContent || '').replace(/\s+/g, ' ').trim(),
                    checked: /** @type {HTMLInputElement} */ (b).checked,
                }))
            );
    }

    prefixBox() {
        return this.setup.getByRole('textbox', {name: 'DOI Prefix', exact: true});
    }

    creationTimeSelect() {
        return this.setup.getByRole('combobox', {name: 'Automatic DOI Assignment', exact: true});
    }

    /** The label of the option the list shows. */
    async creationTimeShown() {
        return this.creationTimeSelect().evaluate((s) => {
            const select = /** @type {HTMLSelectElement} */ (s);
            return (select.options[select.selectedIndex]?.text || '').trim();
        });
    }

    /** The list's option labels, in order. */
    async creationTimeOptions() {
        return this.creationTimeSelect().evaluate((s) =>
            [.../** @type {HTMLSelectElement} */ (s).options].map((o) => o.text.trim())
        );
    }

    /** A "DOI Format" radio by the start of its label ("Default", "None", "Custom pattern"). */
    formatRadio(start) {
        return this.setup.getByRole('group', {name: 'DOI Format', exact: true}).getByRole('radio', {name: new RegExp(`^${esc(start)}`)});
    }

    /** The "None" label's "DOI management page" link. */
    managementPageLink() {
        return this.setup.getByRole('group', {name: 'DOI Format', exact: true}).getByRole('link', {name: 'DOI management page', exact: true});
    }

    /** A "DOI Versioning" radio by the start of its label ("Yes", "No"). */
    versioningRadio(start) {
        return this.setup.getByRole('group', {name: 'DOI Versioning', exact: true}).getByRole('radio', {name: new RegExp(`^${esc(start)},`)});
    }

    /** The "Custom DOI Suffix Pattern" group (on screen only with "Custom pattern"). */
    patternGroup() {
        return this.setup.getByRole('group', {name: /^Custom DOI Suffix Pattern/});
    }

    /** A pattern box by its label ("Submissions", "Issues", …). */
    patternBox(label) {
        return this.patternGroup().getByRole('textbox', {name: label, exact: true});
    }

    /** The red reason under a Setup or Registration box (a locator; empty while none). */
    fieldError(box) {
        return box
            .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " pkpFormField ")][1]')
            .locator('.pkpFieldError');
    }

    /** A form's "Saved" status beside its "Save". */
    savedStatus(panel) {
        return panel.locator('[role="status"]').filter({hasText: 'Saved'});
    }

    /**
     * Press a form's "Save" and wait for its request's answer (the Setup
     * form `api/v1/contexts/{id}`, the Registration form
     * `…/registrationAgency`); returns the response.
     *
     * @param {import('@playwright/test').Locator} panel
     */
    async pressSave(panel) {
        const answered = this.page.waitForResponse(
            (r) => /\/api\/v1\/contexts\/\d+(\/registrationAgency)?(\?|$)/.test(r.url()) && r.request().method() !== 'GET',
            {timeout: T}
        );
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        return answered;
    }

    /** Press "Save", expect it accepted: the request answers 200 and "Saved" shows. */
    async save(panel) {
        const response = await this.pressSave(panel);
        expect(response.status(), `the save answers 200 (${await response.text().catch(() => '')})`).toBe(200);
        await expect(this.savedStatus(panel)).toBeVisible({timeout: T});
        return response;
    }

    /** Press "Save", expect the server's refusal (a 400) and `message` under `box`. */
    async saveRefused(panel, box, message) {
        const response = await this.pressSave(panel);
        expect(response.status(), 'the save is refused').toBe(400);
        await expect(this.fieldError(box)).toContainText(message, {timeout: T});
        return response;
    }

    // --- Registration -------------------------------------------------------

    agencySelect() {
        return this.registration.locator('select[name="registrationAgency"]');
    }

    /** The list's value ("" while it shows an empty box) and option labels. */
    async agencyState() {
        await expect(this.agencySelect()).toBeVisible({timeout: T});
        return this.agencySelect().evaluate((s) => {
            const select = /** @type {HTMLSelectElement} */ (s);
            return {value: select.value, options: [...select.options].map((o) => o.text.trim())};
        });
    }

    /** Choose an agency by its label ("Crossref", "DataCite", "None"). */
    async chooseAgency(label) {
        await this.agencySelect().selectOption({label});
    }

    /** A box of the Registration form by its field name (`depositorName`, `testDOIPrefix`, …). */
    field(name) {
        return this.registration.locator(`[name="${name}"]`).first();
    }

    automaticDepositBox() {
        return this.registration.getByRole('checkbox', {name: DOIS_TEXT.automaticDeposit});
    }

    crossmarkBox() {
        return this.registration.getByRole('checkbox', {name: /^Enable participation in Crossmark/});
    }

    /** The agency block's "Testing" box by the start of its label. */
    testingBox(start) {
        return this.registration.getByRole('checkbox', {name: new RegExp(`^${esc(start)}`)});
    }

    /** A text of the Registration tab (the block's heading, a notice line). */
    registrationText(text) {
        return this.registration.getByText(text, {exact: true});
    }

    // --- The agency plugins' rows (Settings › Website › "Plugins") --------

    pluginsUrl() {
        return this.contextUrl(this.contextPath, '/management/settings/website#plugins');
    }

    /** A plugin's row by its id (`crossrefplugin`, `dataciteplugin`). */
    pluginRow(pluginId) {
        return this.page.locator(`tr.gridRow[id$="-row-${pluginId}"]`).first();
    }

    pluginBox(pluginId) {
        return this.pluginRow(pluginId).getByRole('checkbox');
    }

    /** Open Settings › Website › "Plugins" and wait for a plugin's row. */
    async gotoPlugins(pluginId) {
        await this.page.goto('about:blank');
        await this.page.goto(this.pluginsUrl());
        await expect(this.pluginRow(pluginId)).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /**
     * Tick or untick a plugin's "Enabled" box on the open grid; unticking
     * answers the question ("Are you sure you want to disable this
     * plugin?") with "OK". Bounded by the grid's answer.
     */
    async setPluginEnabled(pluginId, want) {
        const answered = this.page.waitForResponse(
            (r) => new RegExp(`plugin-grid/${want ? 'enable' : 'disable'}`).test(r.url()),
            {timeout: T}
        );
        await this.pluginBox(pluginId).click();
        if (!want) {
            const question = this.page.locator('[role="dialog"]').filter({hasText: DOIS_TEXT.disableQuestion});
            await expect(question).toBeVisible({timeout: T});
            await question.getByRole('button', {name: 'OK', exact: true}).click();
        }
        const response = await answered;
        expect(response.ok(), 'the plugin grid answers').toBe(true);
        await waitForJQueryIdle(this.page);
        await expect(this.pluginBox(pluginId)).toBeChecked({checked: want, timeout: T});
    }
}
exports.DoiSettings = DoiSettings;

// ---------------------------------------------------------------------------
// The DOIs page
// ---------------------------------------------------------------------------

class DoisPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.main = page.locator('main');
    }

    url() {
        return this.contextUrl(this.contextPath, '/dois');
    }

    /**
     * Open the DOIs page by its address and wait until the list shown has
     * fetched its items (`list`: 'submissions' for a work tab, 'issues' for
     * the "Issues" tab; the tab shown first is the work tab).
     */
    async goto({list = 'submissions'} = {}) {
        const fetched = this.page.waitForResponse((r) => isListFetch(r, list), {timeout: T});
        await this.page.goto(this.url());
        const response = await fetched;
        expect(response.status(), 'the list fetch answers 200').toBe(200);
        await expect(this.heading()).toBeVisible({timeout: T});
        await this.expectListSettled();
    }

    /** Reload the page (the list fetched again). */
    async reload() {
        const fetched = this.page.waitForResponse((r) => isListFetch(r), {timeout: T});
        await this.page.reload();
        await fetched;
        await expect(this.heading()).toBeVisible({timeout: T});
        await this.expectListSettled();
    }

    /** Open the page by its address expecting the access-denied page with `message`. */
    async gotoExpectingDenied(message) {
        await this.page.goto(this.url());
        await expect(this.page.getByText(message, {exact: true})).toBeVisible({timeout: T});
        await expect(this.heading()).toHaveCount(0);
    }

    /** Open the page signed out: the Login page. */
    async gotoExpectingLogin() {
        await this.page.goto(this.url());
        await expect(this.page.locator('form#login')).toBeVisible({timeout: T});
        await expect(this.page).toHaveURL(/\/login/);
    }

    /** The page's heading ("DOIs"; the tabs' own headings are the level-1 headings inside the tab panels). */
    heading() {
        return this.page.locator('h1.app__pageHeading').filter({hasText: whole(DOIS_TEXT.heading)});
    }

    /** The prefix warning above the tabs. */
    prefixWarning() {
        return this.main.locator('.pkpNotification--backendPage__header');
    }

    addPrefixLink() {
        return this.prefixWarning().getByRole('link', {name: DOIS_TEXT.addPrefixLink, exact: true});
    }

    /** The kind tabs. */
    tabs() {
        return this.main.getByRole('tab');
    }

    tab(name) {
        return this.main.getByRole('tab', {name, exact: true});
    }

    /** Switch to a kind tab and wait for its list's items (lazy fetched once, on mount). */
    async openTab(name) {
        await this.tab(name).click();
        await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true');
        await expect(this.tabPanel(name)).toBeVisible({timeout: T});
        await this.expectListSettled();
    }

    /** A kind tab's panel ("Articles", "Issues", …). */
    tabPanel(name) {
        return this.main.getByRole('tabpanel', {name, exact: true});
    }

    /** The visible list panel. */
    panel() {
        return this.main.locator('.doiListPanel:visible').first();
    }

    /** The shown tab's own heading (level 1 inside the tab panel). */
    tabHeading() {
        return this.panel().locator('xpath=ancestor::*[@role="tabpanel"][1]').locator('h1').first();
    }

    /** The list's title ("Article DOIs", "Issue DOIs", …). */
    listTitle() {
        return this.panel().locator('h2').first();
    }

    /** The list's items, or its empty line, have rendered and no fetch is running. */
    async expectListSettled() {
        const panel = this.panel();
        await expect(panel).toBeVisible({timeout: T});
        await expect(panel.locator('.listPanel__item--doi').or(panel.locator('.listPanel__empty')).first()).toBeVisible({timeout: T});
        await expect(panel.locator('.pkpHeader .pkpSpinner')).toHaveCount(0, {timeout: T});
    }

    /** The empty list's line ("No Items"). */
    emptyLine() {
        return this.panel().locator('.listPanel__empty');
    }

    // --- The header --------------------------------------------------------

    searchBox() {
        return this.panel().getByRole('searchbox', {name: 'Search'});
    }

    clearSearchButton() {
        return this.panel().getByRole('button', {name: 'Clear search phrase'});
    }

    /** Type a phrase and press Enter; waits for the list's fetch carrying it. */
    async search(phrase) {
        await this.searchBox().fill(phrase);
        const fetched = this.page.waitForResponse(
            (r) => isListFetch(r, '(submissions|issues)') && new URL(r.url()).searchParams.get('searchPhrase') === phrase,
            {timeout: T}
        );
        await this.searchBox().press('Enter');
        await fetched;
        await this.expectListSettled();
    }

    /** Press "Clear search phrase"; waits for the list's fetch without a phrase. */
    async clearSearch() {
        const fetched = this.page.waitForResponse(
            (r) => isListFetch(r, '(submissions|issues)') && !new URL(r.url()).searchParams.get('searchPhrase'),
            {timeout: T}
        );
        await this.clearSearchButton().click();
        await fetched;
        await this.expectListSettled();
    }

    bulkActionsButton() {
        return this.panel().getByRole('button', {name: 'Bulk Actions'});
    }

    /** The open "Bulk Actions" menu's items (`.pkpDropdown__action`). */
    bulkItems() {
        return this.page.locator('.pkpDropdown__action:visible');
    }

    /** A "Bulk Actions" item by its words. */
    bulkItem(label) {
        return this.bulkItems().filter({hasText: whole(label)});
    }

    /** The open menu's "Take action on {count} selected item(s)." line. */
    bulkDescription() {
        return this.page.locator('.pkpDropdown__content:visible').getByText(/^Take action on \d+ selected item\(s\)\.$/);
    }

    /** The "Bulk Actions" ui-library Dropdown (its button and, while open, its menu). */
    bulkActionsDropdown() {
        return this.panel().locator('.doiListPanel__bulkActions');
    }

    /**
     * Open "Bulk Actions" (a no-op while open) and wait for its items. A
     * menu still on screen after the focus went elsewhere (a row's tick
     * box) closes itself within a second (support/dropdown.js): it is
     * waited out and pressed, never taken as open.
     */
    async openBulkActions() {
        if (!(await settleDropdown(this.bulkActionsDropdown(), {timeout: T}))) {
            await this.bulkActionsButton().click();
        }
        await expect(this.bulkItems().first()).toBeVisible({timeout: T});
    }

    /** Close the open menu by pressing "Bulk Actions" again (Escape leaves it open; one already closing is waited out). */
    async closeBulkActions() {
        if (await settleDropdown(this.bulkActionsDropdown(), {timeout: T})) {
            await this.bulkActionsButton().click();
        }
        await expect(this.bulkItems()).toHaveCount(0, {timeout: T});
    }

    /** The open menu's items' words, top to bottom. */
    async bulkLabels() {
        await this.openBulkActions();
        return (await this.bulkItems().allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
    }

    depositAllButton() {
        return this.panel().getByRole('button', {name: DOIS_TEXT.depositAll, exact: true});
    }

    // --- The "Filters" column ----------------------------------------------

    filtersHeading() {
        return this.panel().getByRole('heading', {name: 'Filters', level: 3});
    }

    /** A filter's button by its name ("Needs DOI", "Unregistered", …). */
    filter(name) {
        return this.panel().locator('.listPanel__sidebar').getByRole('button', {name, exact: true});
    }

    /** A chosen filter's "Clear filter: {name}" button. */
    clearFilterButton(name) {
        return this.panel().getByRole('button', {name: `Clear filter: ${name}`, exact: true});
    }

    /** Press a filter (choosing it, or lifting it again) and wait for the list's fetch. */
    async pressFilter(name) {
        const fetched = this.page.waitForResponse((r) => isListFetch(r, '(submissions|issues)'), {timeout: T});
        await this.filter(name).click();
        await fetched;
        await this.expectListSettled();
    }

    /** Press a chosen filter's "Clear filter: {name}" and wait for the list's fetch. */
    async clearFilter(name) {
        const fetched = this.page.waitForResponse((r) => isListFetch(r, '(submissions|issues)'), {timeout: T});
        await this.clearFilterButton(name).click();
        await fetched;
        await this.expectListSettled();
    }

    /** The journal's "Issues" filter box. */
    issuesBox() {
        return this.panel().getByRole('combobox', {name: 'Issues'});
    }

    /** Type into the "Issues" box key by key; returns its suggestions (a locator). */
    async typeInIssuesBox(text) {
        await this.issuesBox().click();
        await this.issuesBox().pressSequentially(text);
        return this.page.getByRole('option');
    }

    /** Choose a suggestion of the "Issues" box and wait for the list's fetch. */
    async chooseIssueSuggestion(name) {
        const fetched = this.page.waitForResponse((r) => isListFetch(r), {timeout: T});
        await this.page.getByRole('option', {name, exact: true}).click();
        await fetched;
        await this.expectListSettled();
    }

    // --- The rows -----------------------------------------------------------

    /** Every row of the list shown. */
    rows() {
        return this.panel().locator('.listPanel__item--doi');
    }

    /** A row by the item's number (`type` 'submission' or 'issue'). */
    row(id, type = 'submission') {
        return this.panel().locator(`[id="list-item-${type}-${id}"]`);
    }

    /** The rows' name links' words, top to bottom (a settled read is the caller's: poll it). */
    async rowNames() {
        return this.rows().locator('.listPanel__itemTitle a').allInnerTexts().then((a) => a.map((s) => s.replace(/\s+/g, ' ').trim()));
    }

    /** A row's name link. */
    rowLink(row) {
        return row.locator('.listPanel__itemTitle a');
    }

    /** A row's tick box (no accessible name, register A8). */
    rowCheckbox(row) {
        return row.locator('.doiListItem__selector input[type="checkbox"]');
    }

    /** A row's badge (the item's status, Rule 16). */
    rowBadge(row) {
        return row.locator('.listPanel__itemSummary .doiListItem__itemMetadata--badge');
    }

    /** The summary's actions area, which carries the number, the badge and the expander. */
    rowActions(row) {
        return row.locator('.listPanel__itemSummary .listPanel__itemActions');
    }

    /** A row's expander (either state). */
    expander(row, id) {
        return row.getByRole('button', {name: new RegExp(`details about ${id}$`)});
    }

    /** A row's expanded view (present only while expanded). */
    expanded(row) {
        return row.locator('.listPanel__itemExpanded');
    }

    /** Expand a row (a no-op while expanded) and wait for its DOI table. */
    async expand(row, id) {
        if ((await this.expanded(row).count()) === 0) {
            await row.getByRole('button', {name: `Show more details about ${id}`, exact: true}).click();
        }
        await expect(this.expanded(row).locator('table')).toBeVisible({timeout: T});
        return this.expanded(row);
    }

    /** Collapse a row (a no-op while collapsed). */
    async collapse(row, id) {
        if ((await this.expanded(row).count()) > 0) {
            await row.getByRole('button', {name: `Hide expanded details about ${id}`, exact: true}).click();
        }
        await expect(this.expanded(row)).toHaveCount(0, {timeout: T});
    }

    /** The expanded view's version name line (the first line above the table). */
    versionName(row) {
        return this.expanded(row).locator(':scope > span').first();
    }

    /** The expanded table's column headers. */
    columnHeaders(row) {
        return this.expanded(row).locator('table').first().getByRole('columnheader');
    }

    /** The expanded table's body rows. */
    doiRows(row) {
        return this.expanded(row).locator('table').first().locator('tbody tr');
    }

    /** A DOI table row by its type ("Article", "PDF", "Peer Review 186", "Issue"). */
    doiRow(row, type) {
        return this.doiRows(row).filter({has: this.page.locator('td label', {hasText: whole(type)})});
    }

    /** The types of the expanded table's rows, top to bottom. */
    async doiTypes(row) {
        return this.doiRows(row).locator('td label').allInnerTexts().then((a) => a.map((s) => s.trim()));
    }

    /** A DOI row's type label ("Monograph", a chapter's title, "Format / PDF", "PDF / article.pdf"). */
    doiLabel(row, type) {
        return this.doiRows(row).locator('td label', {hasText: whole(type)});
    }

    /**
     * Expect a press's chapter row greyed (its label `labelDisabled`: the
     * chapter has no page and no DOI, Rule 47) or plain.
     */
    async expectGreyed(row, type, greyed = true) {
        const label = this.doiLabel(row, type);
        await expect(label).toHaveCount(1, {timeout: T});
        if (greyed) await expect(label).toHaveClass(/(^|\s)labelDisabled(\s|$)/);
        else await expect(label).not.toHaveClass(/(^|\s)labelDisabled(\s|$)/);
    }

    /** A press's note under the expanded table, "Chapters without a landing page cannot have a DOI." (Rule 47). */
    chapterPageNote(row) {
        return this.expanded(row).getByText(DOIS_TEXT.chapterPageNote, {exact: true});
    }

    /** A DOI box (the row's text box). */
    doiBox(row, type) {
        return this.doiRow(row, type).locator('input[type="text"]');
    }

    /** A DOI row's status badge. */
    doiBadge(row, type) {
        return this.doiRow(row, type).locator('.doiListItem__itemMetadata--badge');
    }

    /** The expanded view's "Edit" / "Save" button. */
    editButton(row) {
        return this.expanded(row).locator('.doiListPanel__itemExpandedActions').getByRole('button', {name: /^(Edit|Save)$/});
    }

    /** "There are {count} versions." with "View all" (on screen with versioning "Yes" and more than one block). */
    versionsBar(row) {
        return this.expanded(row).locator('.doiListPanel__itemExpandedActions--actionsBar');
    }

    viewAllButton(row) {
        return this.versionsBar(row).getByRole('button', {name: 'View all', exact: true});
    }

    /** The agency panel at the foot of an expanded view. */
    agencyPanel(row) {
        return this.expanded(row).locator('.doiListItem__depositorDetails');
    }

    agencyName(row) {
        return this.agencyPanel(row).locator('.doiListItem__depositorName');
    }

    agencySentence(row) {
        return this.agencyPanel(row).locator('.doiListItem__depositorDescription');
    }

    agencyButtons(row) {
        return this.agencyPanel(row).locator('.doiListItem__depositorActions').getByRole('button');
    }

    /** Press "Edit": the boxes turn editable and the button reads "Save". */
    async startEditing(row) {
        await expect(this.editButton(row)).toHaveText(/^\s*Edit\s*$/);
        await this.editButton(row).click();
        await expect(this.editButton(row)).toHaveText(/^\s*Save\s*$/, {timeout: T});
    }

    /**
     * Press "Save" of an expanded view whose boxes changed; waits until
     * every DOI request it sent has answered and the editing has closed.
     * Returns the statuses of the DOI requests (`api/v1/dois…`).
     */
    async saveEditing(row, {expectRequests = true} = {}) {
        /** @type {number[]} */
        const statuses = [];
        const listener = (/** @type {import('@playwright/test').Response} */ r) => {
            if (/\/api\/v1\/dois(\/\d+)?(\?|$)/.test(r.url()) && r.request().method() !== 'GET') statuses.push(r.status());
        };
        this.page.on('response', listener);
        const first = expectRequests
            ? this.page.waitForResponse((r) => /\/api\/v1\/dois(\/\d+)?(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T})
            : null;
        await this.editButton(row).click();
        if (first) await first;
        await expect(this.editButton(row)).toHaveText(/^\s*Edit\s*$/, {timeout: T});
        this.page.off('response', listener);
        return statuses;
    }

    /** Tick rows by their numbers. */
    async tick(ids, type = 'submission') {
        for (const id of ids) {
            await this.rowCheckbox(this.row(id, type)).check();
        }
    }

    // --- The action windows -----------------------------------------------

    /** A window by its title (the action's name, "DOI Updates Failed", "Deposit all DOIs"). */
    dialog(title) {
        return this.page.getByRole('dialog').filter({has: this.page.getByRole('heading', {name: title, exact: true})}).last();
    }

    /**
     * Choose a "Bulk Actions" item; returns its window, open, with the menu
     * closed behind it. The menu closes only on its button's blur
     * (ui-library `Dropdown.vue` `closeOnBlur`): 100 ms after the press it
     * closes if the focus has left the menu, otherwise it looks again once a
     * second. When the press on the item outlasts those 100 ms (a loaded
     * run), the focus is still on the item then; a window answered before
     * the next look hands the focus back to the item on closing, and the
     * menu stays open over the list's first rows for good, swallowing the
     * next click on a row ("<li> from listPanel__header intercepts pointer
     * events", `.reports/flake-s28/u45-expand/diagnosis.md`). While the
     * window is open it holds the focus, so the menu's next look closes it:
     * wait for that before anything answers the window.
     */
    async chooseBulkAction(label) {
        await this.openBulkActions();
        await this.bulkItem(label).click();
        const dialog = this.dialog(label);
        await expect(dialog).toBeVisible({timeout: T});
        await expect(this.bulkItems()).toHaveCount(0, {timeout: T});
        return dialog;
    }

    /**
     * Press a window's action button (named as the window) and wait for the
     * action's request and the list's fetch that follows it; returns the
     * action's response.
     *
     * @param {import('@playwright/test').Locator} dialog
     * @param {string} label
     */
    async confirmAction(dialog, label, {list = 'submissions'} = {}) {
        const acted = this.page.waitForResponse(
            (r) => /\/api\/v1\/dois\//.test(r.url()) && r.request().method() !== 'GET',
            {timeout: T}
        );
        const refetched = this.page.waitForResponse((r) => isListFetch(r, list), {timeout: T});
        await dialog.getByRole('button', {name: label, exact: true}).click();
        const response = await acted;
        await refetched;
        await expect(dialog).toBeHidden({timeout: T});
        await this.expectListSettled();
        return response;
    }

    /** Tick `ids`, choose a bulk action and confirm it; returns the action's response. */
    async runBulk(label, ids, {type = 'submission', list = 'submissions'} = {}) {
        await this.tick(ids, type);
        const dialog = await this.chooseBulkAction(label);
        return this.confirmAction(dialog, label, {list});
    }

    /** The "DOI Updates Failed" window. */
    failedDialog() {
        return this.dialog(DOIS_TEXT.failedTitle);
    }

    /** Close the "DOI Updates Failed" window with its "OK". */
    async closeFailedDialog() {
        await this.failedDialog().getByRole('button', {name: 'OK', exact: true}).click();
        await expect(this.failedDialog()).toBeHidden({timeout: T});
    }

    /**
     * Expect a top-right notice with `text` to have shown since the last
     * one taken (read from the record `recordNotices` keeps: a notice
     * expires after five seconds, which a loaded run's refetch can
     * outlast). Takes it off the record.
     */
    async expectNotice(text) {
        await expect
            .poll(
                () =>
                    this.page.evaluate((wanted) => {
                        const w = /** @type {any} */ (window);
                        const seen = w.__doiNotices || [];
                        const i = seen.findIndex((/** @type {string} */ t) => t.includes(wanted));
                        if (i < 0) return seen;
                        seen.splice(i, 1);
                        return true;
                    }, text),
                {timeout: T, message: `the notice "${text}"`}
            )
            .toBe(true);
    }

    /** The "DOIs for all versions" side window. */
    versionsWindow() {
        return this.page.getByRole('dialog').filter({hasText: DOIS_TEXT.versionsWindow}).last();
    }

    /** A block of that window by its heading link's words (a RegExp or a string it starts with). */
    versionBlock(heading) {
        const pattern = heading instanceof RegExp ? heading : new RegExp(`^\\s*${esc(heading)}`);
        return this.versionsWindow()
            .locator('.doiListItem__versionContainer')
            .filter({has: this.page.locator('a').filter({hasText: pattern})});
    }

    /** The window's block headings, top to bottom. */
    versionHeadings() {
        return this.versionsWindow().locator('.doiListItem__versionContainer > a');
    }

    /** A block's DOI box by its row type. */
    versionDoiBox(block, type) {
        return block.locator('tbody tr').filter({has: this.page.locator('td label', {hasText: whole(type)})}).locator('input[type="text"]');
    }

    /** The window's "Edit" / "Save". */
    versionsEditButton() {
        return this.versionsWindow().locator('.doiListItem__versionContainer--actionsBar').getByRole('button', {name: /^(Edit|Save)$/});
    }

    /** Open a row's "View all" window. */
    async openVersionsWindow(row) {
        await this.viewAllButton(row).click();
        await expect(this.versionsWindow()).toBeVisible({timeout: T});
        await expect(this.versionHeadings().first()).toBeVisible({timeout: T});
    }

    /** Close the "View all" window through its header "Close". */
    async closeVersionsWindow() {
        await this.versionsWindow().getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(this.versionsWindow()).toBeHidden({timeout: T});
    }
}
exports.DoisPage = DoisPage;

/**
 * Keep a record of every top-right notice the page shows (a
 * MutationObserver on `.app__notifications`), for `expectNotice`. Call
 * once on a fresh page, before its first navigation.
 *
 * @param {import('@playwright/test').Page} page
 */
async function recordNotices(page) {
    await page.addInitScript(() => {
        const w = /** @type {any} */ (window);
        w.__doiNotices = [];
        const seen = new WeakSet();
        const scan = () => {
            document.querySelectorAll('.app__notifications .pkpNotification').forEach((n) => {
                if (seen.has(n)) return;
                const text = (n.textContent || '').replace(/\s+/g, ' ').trim();
                if (!text) return;
                seen.add(n);
                w.__doiNotices.push(text);
            });
        };
        new MutationObserver(scan).observe(document, {childList: true, subtree: true, characterData: true});
    });
}
exports.recordNotices = recordNotices;

// ---------------------------------------------------------------------------
// The side menu and the reader side
// ---------------------------------------------------------------------------

/** The editorial side menu's entry header by its label ("DOIs", "Settings"). */
function sideMenuEntry(page, label) {
    return page.locator(`nav#app-nav [data-pc-section="header"][aria-label="${label}"]`);
}
exports.sideMenuEntry = sideMenuEntry;

/** Wait for the editorial side menu to render its entries. */
async function expectSideMenu(page) {
    await expect(page.locator('nav#app-nav [data-pc-section="header"]').first()).toBeVisible({timeout: T});
}
exports.expectSideMenu = expectSideMenu;

/** Press the side menu's "DOIs" and wait for the DOIs page's list. */
async function openDoisFromSideMenu(page) {
    const fetched = page.waitForResponse((r) => isListFetch(r), {timeout: T});
    await sideMenuEntry(page, 'DOIs').getByRole('link', {name: 'DOIs'}).click();
    await fetched;
    await expect(page.locator('h1.app__pageHeading').filter({hasText: whole(DOIS_TEXT.heading)})).toBeVisible({timeout: T});
}
exports.openDoisFromSideMenu = openDoisFromSideMenu;

/** A work's page's "DOI:" block (article, preprint: `.item.doi`). */
function readerDoiItem(page) {
    return page.locator('.item.doi');
}
exports.readerDoiItem = readerDoiItem;

/** The "DOI:" block's link. */
function readerDoiLink(page) {
    return readerDoiItem(page).locator('.value a');
}
exports.readerDoiLink = readerDoiLink;

/**
 * A book page's publication-format DOI links: each approved, available
 * format's details block (`.item.publication_format`) carries its "DOI:"
 * row as `.sub_item.pubid` (Rules 43, 54).
 */
function readerFormatDoiLinks(page) {
    return page.locator('.item.publication_format .sub_item.pubid a');
}
exports.readerFormatDoiLinks = readerFormatDoiLinks;

/** A format details block's "DOI:" row heading. */
function readerFormatDoiLabel(block) {
    return block.locator('.sub_item.pubid .label');
}
exports.readerFormatDoiLabel = readerFormatDoiLabel;

/** An issue's page's "DOI:" line (`.pub_id.doi`). */
function issueDoiLink(page) {
    return page.locator('.obj_issue_toc .pub_id.doi a');
}
exports.issueDoiLink = issueDoiLink;

/** The article page's Crossmark block (`.item.crossmark`). */
function crossmarkBlock(page) {
    return page.locator('.item.crossmark');
}
exports.crossmarkBlock = crossmarkBlock;
