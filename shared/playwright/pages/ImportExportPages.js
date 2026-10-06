// @ts-check
/**
 * @file shared/playwright/pages/ImportExportPages.js
 *
 * Page objects for U63 "Import & export" (docs/specs/U63-import-export.md),
 * shared by the OJS, OMP and OPS suites. App-neutral (PRINCIPLES M2): every
 * on-screen word that differs per app (the export tab "Export Articles" /
 * "Export" / "Export Preprints", its button "Export Articles" / "Export
 * Submissions" / "Export Preprints", the results tab "Import Results" /
 * "Results") is passed in by the suite through `labels`; the locators are
 * the markup the three apps share.
 *
 * Surfaces:
 * - ToolsPage — the "Tools" page (`management/tools`): its heading, its two
 *   tabs, the "Import/Export" list lines and a tool's link.
 * - ToolPage — what every tool page shares: heading, trail ("Tools" ›
 *   name), the jQuery UI tab strip (`#importExportTabs`, the PubMed tool's
 *   `#exportTabs`), the visible panel, the results tabs with their "Close".
 * - NativeXmlPage (a ToolPage) — "Native XML Plugin": the "Import" upload
 *   box and "Import", the export list (`SubmissionExportList`), the
 *   "Export Issues" list (`IssueExportList`), the results tabs and
 *   "Download Exported File".
 * - UsersXmlPage (a ToolPage) — "Users XML Plugin" {OJS OMP}: "Import
 *   Users", the "Current Users" grid with its header links, filter form,
 *   row boxes, "Export Users", and the "Export All Users" "Confirm" window.
 * - PubMedPage (a ToolPage) — "PubMed XML Export Plugin" {OJS}: the
 *   "NLM Title Abbreviation" form and the two export lists.
 * - DoajPage (a ToolPage) — "DOAJ Export Plugin" {OJS}: the Settings form,
 *   the Articles / Publications grid, its filter, the validation box and
 *   the action buttons ("Register", "Export", "Mark registered").
 * - recordToolNotices() / expectToolNotice() — the notices at the top right
 *   ("Your changes have been saved.", "No objects selected.", "Articles
 *   submitted successfully"), recorded as they show, since a notice
 *   expires after a few seconds.
 * - downloadFrom() — a download a press starts, read as text.
 * - sideMenuEntry() / expectSideMenu() — the editorial side menu's entries.
 *
 * DOM facts the locators rely on (U63 claim check K1–K4, 2026-09-27;
 * `.reports/U63/screen-notes.md`):
 * - the Tools list loads by AJAX into `.pkp_page_importexport_plugins li`;
 * - a tool page's tabs are jQuery UI tabs (role "tab"); a results tab
 *   loads its panel by a GET of its own address (`…/import?…`,
 *   `…/exportSubmissions?…`, `…/exportIssues?…`), and choosing it again
 *   runs that request again (an import imports the file once more,
 *   spec Rule 9), so nothing here ever presses a results tab;
 * - the upload box is `#importXmlForm`: `setInputFiles` on its file input
 *   uploads at once (`uploadImportXML`), filling `#temporaryFileId`; after
 *   an import the form keeps the old id, so a second upload waits until
 *   the id changes;
 * - the Native export list is a Vue list panel in `#exportSubmissions-tab`
 *   fetching `api/v1/submissions`; its "Filters" sidebar is
 *   `.listPanel__sidebar`;
 * - the users, issues and DOAJ lists are legacy grids (`tr.gridRow`,
 *   header links in `.header .actions`, a filter form under the header's
 *   "Search", re-fetched by `fetch-grid`);
 * - the DOAJ actions post `form#exportSubmissionXmlForm` (or
 *   `form#exportPublicationXmlForm`) and land back on the page, the
 *   notice showing after the landing; "Export" answers a download.
 */
const fs = require('fs');
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
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
exports.whole = whole;

// ---------------------------------------------------------------------------
// Notices, downloads, the side menu
// ---------------------------------------------------------------------------

/**
 * Record every notice shown at the top right (a MutationObserver on the
 * page, re-armed on each landing), for `expectToolNotice`. Call once on a
 * fresh page, before its first navigation.
 *
 * @param {import('@playwright/test').Page} page
 */
async function recordToolNotices(page) {
    await page.addInitScript(() => {
        const w = /** @type {any} */ (window);
        w.__toolNotices = [];
        const seen = new WeakSet();
        const scan = () => {
            document.querySelectorAll('.app__notifications .pkpNotification').forEach((n) => {
                if (seen.has(n)) return;
                const text = (n.textContent || '').replace(/\s+/g, ' ').trim();
                if (!text) return;
                seen.add(n);
                w.__toolNotices.push(text);
            });
        };
        new MutationObserver(scan).observe(document, {childList: true, subtree: true, characterData: true});
    });
}
exports.recordToolNotices = recordToolNotices;

/**
 * Expect a notice reading `text` to have shown on the page since its last
 * landing (or since the last notice taken); takes it off the record.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
async function expectToolNotice(page, text) {
    await expect
        .poll(
            () =>
                page.evaluate((wanted) => {
                    const w = /** @type {any} */ (window);
                    const seen = w.__toolNotices || [];
                    const i = seen.findIndex((/** @type {string} */ t) => t.includes(wanted));
                    if (i < 0) return seen;
                    seen.splice(i, 1);
                    return true;
                }, text),
            {timeout: T, message: `the notice "${text}"`}
        )
        .toBe(true);
}
exports.expectToolNotice = expectToolNotice;

/**
 * Run `press` and read the download it starts: `{name, text}`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {() => Promise<unknown>} press
 */
async function downloadFrom(page, press) {
    const download = page.waitForEvent('download', {timeout: T});
    await press();
    const file = await download;
    const path = await file.path();
    return {name: file.suggestedFilename(), text: fs.readFileSync(path, 'utf8')};
}
exports.downloadFrom = downloadFrom;

/** The editorial side menu's entry header by its label ("Tools", "Settings", …). */
function sideMenuEntry(page, label) {
    return page.locator(`nav#app-nav [data-pc-section="header"][aria-label="${label}"]`);
}
exports.sideMenuEntry = sideMenuEntry;

/** Wait for the editorial side menu to render its entries. */
async function expectSideMenu(page) {
    await expect(page.locator('nav#app-nav [data-pc-section="header"]').first()).toBeVisible({timeout: T});
}
exports.expectSideMenu = expectSideMenu;

/** The access-denied page's sentence (Actors). */
function deniedSentence(page) {
    return page.getByText('The current role does not have access to this operation.', {exact: true});
}
exports.deniedSentence = deniedSentence;

// ---------------------------------------------------------------------------
// The Tools page
// ---------------------------------------------------------------------------

class ToolsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    url() {
        return this.contextUrl(this.contextPath, '/management/tools');
    }

    /** Open the page by address and wait for its list. */
    async goto() {
        await this.page.goto(this.url());
        await this.expectLoaded();
    }

    /** The page is up: its heading and the list's first line. */
    async expectLoaded() {
        await expect(this.heading()).toBeVisible({timeout: T});
        await expect(this.lines().first()).toBeVisible({timeout: T});
    }

    heading() {
        return this.page.getByRole('heading', {name: 'Tools', exact: true, level: 1});
    }

    /** The page's tabs, in order ("Import/Export", "Permissions"). */
    tabs() {
        return this.page.getByRole('main').getByRole('tab');
    }

    tab(name) {
        return this.page.getByRole('main').getByRole('tab', {name, exact: true});
    }

    /** The "Import/Export" list's lines, "{name}: {description}" each. */
    lines() {
        return this.page.locator('.pkp_page_importexport_plugins li');
    }

    /** The lines' texts, white space collapsed, in screen order. */
    async lineTexts() {
        return this.lines().evaluateAll((lis) => lis.map((li) => (li.textContent || '').replace(/\s+/g, ' ').trim()));
    }

    /**
     * Expect exactly these lines, in any order. The list's order is not
     * fixed: the tools a generic plugin registers (DOAJ, Crossref, DataCite)
     * come in the order of an unordered plugin query, the others in the
     * order the file system lists their folders (U63 T-ojs-2).
     *
     * @param {string[]} lines "{name}: {description}" each
     */
    async expectLineSet(lines) {
        await expect(this.lines().first()).toBeVisible({timeout: T});
        await expect.poll(async () => (await this.lineTexts()).sort(), {timeout: T}).toEqual([...lines].sort());
    }

    /** A line by the tool's name. */
    line(name) {
        return this.lines().filter({has: this.page.getByRole('link', {name, exact: true})});
    }

    /** A tool's name link. */
    toolLink(name) {
        return this.page.locator('.pkp_page_importexport_plugins').getByRole('link', {name, exact: true});
    }

    /** Press a tool's name and wait for its page's heading. */
    async openTool(name) {
        await this.toolLink(name).click();
        await expect(this.page.getByRole('heading', {name, exact: true, level: 1})).toBeVisible({timeout: T});
    }
}
exports.ToolsPage = ToolsPage;

// ---------------------------------------------------------------------------
// A tool page
// ---------------------------------------------------------------------------

class ToolPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {string} plugin the tool's class name in its address ("NativeImportExportPlugin")
     * @param {string} name the tool's name, its page heading ("Native XML Plugin")
     */
    constructor(page, contextPath, plugin, name) {
        super(page);
        this.contextPath = contextPath;
        this.plugin = plugin;
        this.name = name;
    }

    url() {
        return this.contextUrl(this.contextPath, `/management/importexport/plugin/${this.plugin}`);
    }

    /** Open the page by address and wait for its first tab. */
    async goto() {
        await this.page.goto(this.url());
        await this.expectLoaded();
    }

    /** The page is up: its heading and tab strip. */
    async expectLoaded() {
        await expect(this.heading()).toBeVisible({timeout: T});
        await expect(this.tabs().first()).toBeVisible({timeout: T});
    }

    heading() {
        return this.page.getByRole('heading', {name: this.name, exact: true, level: 1});
    }

    /** The trail above the heading ("Tools / {name}"). */
    trail() {
        return this.page.locator('.app__breadcrumbs');
    }

    /** The trail's "Tools" link. */
    trailToolsLink() {
        return this.trail().getByRole('link', {name: 'Tools', exact: true});
    }

    /** The tab strip's tabs, in order. */
    tabs() {
        return this.page.getByRole('main').getByRole('tablist').first().getByRole('tab');
    }

    /** A tab by its exact name (the last one when several share it). */
    tab(name) {
        return this.tabs().filter({has: this.page.getByRole('link', {name, exact: true})}).last();
    }

    /** Every tab of that name (the results tabs repeat theirs). */
    tabsNamed(name) {
        return this.tabs().filter({has: this.page.getByRole('link', {name, exact: true})});
    }

    /** The tab names, in order (a results tab's "Close" left out). */
    async tabNames() {
        await expect(this.tabs().first()).toBeVisible({timeout: T});
        return this.tabs().evaluateAll((tabs) => tabs.map((t) => ((t.querySelector('a') || t).textContent || '').replace(/\s+/g, ' ').trim()));
    }

    /** Expect the tabs to read `names`, in order. */
    async expectTabs(names) {
        await expect.poll(() => this.tabNames(), {timeout: T}).toEqual(names);
    }

    /** Expect the tab `name` (the last of that name) to be the open one. */
    async expectSelected(name) {
        await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true', {timeout: T});
    }

    /** Press a (non-results) tab and wait for it to open. */
    async openTab(name) {
        await this.tab(name).getByRole('link', {name, exact: true}).click();
        await this.expectSelected(name);
    }

    /** The open tab's panel. */
    visiblePanel() {
        return this.page.locator('#importExportTabs [role="tabpanel"]:visible, #exportTabs [role="tabpanel"]:visible').first();
    }

    /** A results tab's "Close" (the last tab of that name). */
    closeLink(name) {
        return this.tab(name).locator('a').filter({hasText: /^\s*Close\s*$/});
    }

    /** Press "Close" on the last results tab named `name`. */
    async closeResultsTab(name) {
        const before = await this.tabsNamed(name).count();
        await this.closeLink(name).click();
        await expect(this.tabsNamed(name)).toHaveCount(before - 1, {timeout: T});
    }

    // --- the upload box (Native "Import", Users "Import Users") ----------

    importForm() {
        return this.page.locator('#importXmlForm');
    }

    fileInput() {
        return this.importForm().locator('input[type=file]');
    }

    uploadButton() {
        return this.importForm().getByRole('button', {name: 'Upload File', exact: true});
    }

    changeFileButton() {
        return this.importForm().getByRole('button', {name: 'Change File', exact: true});
    }

    /** The box's hint "Drag and drop a file here to begin upload". */
    dropHint() {
        return this.importForm().getByText('Drag and drop a file here to begin upload', {exact: true});
    }

    /**
     * Choose `file` in the upload box (the file picker "Upload File" opens,
     * or "Change File" after a first file): it goes up at once, and the
     * form's file id changes.
     *
     * @param {string} file an absolute path
     */
    async upload(file) {
        const idBox = this.importForm().locator('#temporaryFileId');
        const before = (await idBox.count()) > 0 ? await idBox.inputValue() : '';
        const uploaded = this.page.waitForResponse((r) => r.url().includes('uploadImportXML') && r.request().method() === 'POST', {timeout: T});
        await this.fileInput().setInputFiles(file);
        expect((await uploaded).ok(), 'the upload answered').toBe(true);
        await expect(idBox).not.toHaveValue(before, {timeout: T});
        await expect(idBox).not.toHaveValue('', {timeout: T});
    }

    /**
     * Press the import button (`label`) and wait for the results tab it
     * adds (`tabName`) to open and load; returns that tab's panel.
     *
     * @param {string} label "Import" or "Import Users"
     * @param {string} tabName "Import Results", "Results"
     */
    async pressImport(label, tabName) {
        const before = await this.tabsNamed(tabName).count();
        const answered = this.page.waitForResponse((r) => /\/import\?/.test(r.url()) && r.request().method() === 'GET', {timeout: 90_000});
        await this.importForm().getByRole('button', {name: label, exact: true}).click();
        const response = await answered;
        await expect(this.tabsNamed(tabName)).toHaveCount(before + 1, {timeout: T});
        await this.expectSelected(tabName);
        await waitForJQueryIdle(this.page);
        return {panel: this.visiblePanel(), status: response.status()};
    }
}
exports.ToolPage = ToolPage;

// ---------------------------------------------------------------------------
// The submissions export list (Native XML, PubMed)
// ---------------------------------------------------------------------------

/** Is this the export list's own fetch? */
function isSubmissionsFetch(r) {
    return /\/api\/v1\/submissions(\?|$)/.test(r.url()) && r.request().method() === 'GET';
}

class SubmissionExportList extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} buttonLabel the export button ("Export Articles", "Export Submissions", "Export Preprints")
     */
    constructor(page, buttonLabel) {
        super(page);
        this.panel = page.locator('#exportSubmissions-tab');
        this.buttonLabel = buttonLabel;
    }

    /** The list's title ("Articles", "Monographs", "Preprints"). */
    title() {
        return this.panel.getByRole('heading', {level: 2}).first();
    }

    searchBox() {
        return this.panel.getByRole('searchbox', {name: 'Search', exact: true});
    }

    filtersButton() {
        return this.panel.getByRole('button', {name: 'Filters', exact: true});
    }

    /** The lines of the list. */
    items() {
        return this.panel.locator('.listPanel__item');
    }

    /** A line by its title. */
    item(title) {
        return this.items().filter({has: this.page.getByRole('checkbox', {name: title, exact: true})});
    }

    /** A line's tick box, by the title. */
    box(title) {
        return this.panel.getByRole('checkbox', {name: title, exact: true});
    }

    /** A line's "View", by the title. */
    viewLink(title) {
        return this.item(title).getByRole('link', {name: 'View', exact: true});
    }

    /** The titles listed, read settled (the list's own fetch has answered). */
    async titles() {
        // A line reads "{title} View".
        return this.items().evaluateAll((lines) =>
            lines.map((li) => ((/** @type {HTMLElement} */ (li)).innerText || '').replace(/\s+/g, ' ').trim().replace(/\s*View$/, ''))
        );
    }

    /** Expect exactly these titles, in any order (the list is not ordered by the claim). */
    async expectTitles(titles) {
        await expect.poll(async () => (await this.titles()).sort(), {timeout: T}).toEqual([...titles].sort());
        await expect(this.items()).toHaveCount(titles.length);
    }

    /** "Select All" / "Select None" (one button; its label flips). */
    selectButton() {
        return this.panel.getByRole('button', {name: /^Select (All|None)$/});
    }

    exportButton() {
        return this.panel.getByRole('button', {name: this.buttonLabel, exact: true});
    }

    /** The "Filters" sidebar. */
    sidebar() {
        return this.panel.locator('.listPanel__sidebar');
    }

    /** The sidebar's group headings, in order ("Stages", "Activity", …). */
    sidebarHeadings() {
        return this.sidebar().getByRole('heading', {level: 4});
    }

    /** A filter button of the sidebar by its label ("Review", "Articles"). */
    filterButton(label) {
        return this.sidebar().getByRole('button', {name: label, exact: true});
    }

    /** The "Add filter: Days since last activity" button. */
    addActivityFilterButton() {
        return this.sidebar().getByRole('button', {name: 'Add filter: Days since last activity', exact: true});
    }

    /** Open the export tab's list: the list or its empty line is there, fetched. */
    async expectLoaded() {
        await expect(this.panel).toBeVisible({timeout: T});
        await expect(this.exportButton()).toBeVisible({timeout: T});
        await expect(this.items().first().or(this.panel.locator('.listPanel__empty')).first()).toBeVisible({timeout: T});
    }

    /** Press "Filters" and wait for the sidebar. */
    async openFilters() {
        await this.filtersButton().click();
        await expect(this.sidebar()).toBeVisible({timeout: T});
    }

    /** Press a filter button; resolves once the list's fetch answered. */
    async pressFilter(label) {
        const fetched = this.page.waitForResponse(isSubmissionsFetch, {timeout: T});
        await this.filterButton(label).click();
        await fetched;
    }

    /** Type in the search box without committing. */
    async typeSearch(text) {
        await this.searchBox().fill(text);
    }

    /** Press Enter in the search box; resolves once the list's fetch answered. */
    async commitSearch() {
        const fetched = this.page.waitForResponse((r) => isSubmissionsFetch(r) && r.url().includes('searchPhrase='), {timeout: T});
        await this.searchBox().press('Enter');
        await fetched;
    }

    /**
     * Press the export button and wait for the results tab it adds
     * ("Export Submissions Results") to load; returns the tab's panel.
     *
     * @param {ToolPage} tool
     */
    async pressExport(tool) {
        return pressExportTo(tool, this.exportButton(), 'Export Submissions Results', /\/exportSubmissions\?/);
    }
}
exports.SubmissionExportList = SubmissionExportList;

/** Press an export button and wait for its results tab (see pressExport). */
async function pressExportTo(tool, button, tabName, urlPattern) {
    const page = tool.page;
    const before = await tool.tabsNamed(tabName).count();
    const answered = page.waitForResponse((r) => urlPattern.test(r.url()), {timeout: 90_000});
    await button.click();
    await answered;
    await expect(tool.tabsNamed(tabName)).toHaveCount(before + 1, {timeout: T});
    await tool.expectSelected(tabName);
    await waitForJQueryIdle(page);
    return tool.visiblePanel();
}

// ---------------------------------------------------------------------------
// The issues export list {OJS}
// ---------------------------------------------------------------------------

class IssueExportList extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.panel = page.locator('#exportIssues-tab');
        this.grid = this.panel.locator('.pkp_controllers_grid').first();
    }

    columns() {
        return this.grid.getByRole('columnheader');
    }

    rows() {
        return this.grid.locator('tr.gridRow').filter({visible: true});
    }

    /** A row by the issue's name ("Vol. 1 No. 1 (2025)"). */
    row(name) {
        return this.rows().filter({has: this.page.getByRole('link', {name, exact: true})});
    }

    /** A row's "Items" cell. */
    itemsCell(name) {
        return this.row(name).getByRole('cell').last();
    }

    box(name) {
        return this.row(name).getByRole('checkbox');
    }

    exportButton() {
        return this.panel.getByRole('button', {name: 'Export Issues', exact: true});
    }

    /** The list is fetched: a row or its empty line. */
    async expectLoaded() {
        await expect(this.exportButton()).toBeVisible({timeout: T});
        await expect(this.rows().first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** Press "Export Issues" and wait for "Export Issues Results"; returns its panel. */
    async pressExport(tool) {
        return pressExportTo(tool, this.exportButton(), 'Export Issues Results', /\/exportIssues\?/);
    }
}
exports.IssueExportList = IssueExportList;

// ---------------------------------------------------------------------------
// Native XML Plugin
// ---------------------------------------------------------------------------

class NativeXmlPage extends ToolPage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{exportTab: string, exportButton: string, importResults: string}} labels
     *   the app's words: "Export Articles" / "Export" / "Export Preprints";
     *   "Export Articles" / "Export Submissions" / "Export Preprints";
     *   "Import Results" / "Results"
     */
    constructor(page, contextPath, labels) {
        super(page, contextPath, 'NativeImportExportPlugin', 'Native XML Plugin');
        this.labels = labels;
        this.list = new SubmissionExportList(page, labels.exportButton);
        this.issues = new IssueExportList(page);
    }

    /** The box's heading "Upload XML file to import". */
    uploadHeading() {
        return this.importForm().getByText('Upload XML file to import', {exact: true});
    }

    importButton() {
        return this.importForm().getByRole('button', {name: 'Import', exact: true});
    }

    /** Press "Import"; returns the new results tab's panel once loaded. */
    async pressImport() {
        const {panel} = await super.pressImport('Import', this.labels.importResults);
        await expect(panel).toContainText(/completed successfully|process failed/, {timeout: T});
        return panel;
    }

    /** Open the export tab and wait for its list. */
    async openExportTab() {
        await this.openTab(this.labels.exportTab);
        await this.list.expectLoaded();
    }

    /** Open "Export Issues" and wait for its list. */
    async openIssuesTab() {
        await this.openTab('Export Issues');
        await this.issues.expectLoaded();
    }

    /** A results panel's "Download Exported File". */
    downloadButton(panel) {
        return panel.getByRole('button', {name: 'Download Exported File', exact: true});
    }

    /** Press a results panel's "Download Exported File"; returns `{name, text}`. */
    async download(panel) {
        return downloadFrom(this.page, () => this.downloadButton(panel).click());
    }
}
exports.NativeXmlPage = NativeXmlPage;

/**
 * The lines of an import's results panel: the items imported
 * (`"{n}" - "{title}"`) and each list's lines.
 *
 * @param {import('@playwright/test').Locator} panel
 */
function resultLines(panel) {
    return panel.getByRole('listitem');
}
exports.resultLines = resultLines;

/**
 * Expect a users import's "Results" panel to say that every account of
 * the file was imported, in one of the two forms the server's PHP decides
 * (U63 T-ojs-3): the success sentence alone, or "Import/Export errors:"
 * with the "…password could not be imported as is. … The user has been
 * imported." line for each account of the file and no other line. On PHP
 * 8.4 a file from an installation of this version gives the first; on an
 * older PHP every bcrypt hash counts as "stored another way" and gives the
 * second. Either way every account is imported.
 *
 * `otherLines` are lines the file also earns, such as a role the account
 * already holds in the context (pkp/pkp-lib#13412): with them the panel
 * always takes the second form, the password lines present or not.
 *
 * @param {import('@playwright/test').Locator} panel
 * @param {{usernames: string[], successText: string, newPasswordLine: (username: string) => string, otherLines?: string[]}} expected
 */
async function expectEveryUserImported(panel, {usernames, successText, newPasswordLine, otherLines = []}) {
    const flat = (t) => (t || '').replace(/\s+/g, ' ').trim();
    const passwordLines = usernames.map((u) => flat(newPasswordLine(u)));
    const others = otherLines.map(flat);
    const sets = [[...others], [...passwordLines, ...others]];
    const accepted = sets.filter((set) => set.length).map((set) => JSON.stringify([...set].sort()));
    const successAllowed = !others.length;
    await expect
        .poll(
            async () => {
                const text = flat(await panel.innerText());
                const lines = (await panel.getByRole('listitem').allInnerTexts()).map(flat).sort();
                if (successAllowed && text === flat(successText) && lines.length === 0) return 'every user imported';
                const heading = await panel.getByRole('heading', {name: 'Import/Export errors:', exact: true}).count();
                if (heading === 1 && !text.includes(flat(successText)) && accepted.includes(JSON.stringify(lines))) {
                    return 'every user imported';
                }
                return {text, lines};
            },
            {timeout: T, message: 'every account of the file imported (success sentence, or a new-password line for each, with the other lines expected)'}
        )
        .toBe('every user imported');
}
exports.expectEveryUserImported = expectEveryUserImported;

// ---------------------------------------------------------------------------
// Users XML Plugin {OJS OMP}
// ---------------------------------------------------------------------------

class UsersXmlPage extends ToolPage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page, contextPath, 'UserImportExportPlugin', 'Users XML Plugin');
        this.exportPanel = page.locator('#export-tab');
        this.grid = page.locator('#usersGridContainer .pkp_controllers_grid').first();
    }

    /** The "File" heading of the upload box. */
    fileHeading() {
        return this.importForm().getByText('File', {exact: true});
    }

    importButton() {
        return this.importForm().getByRole('button', {name: 'Import Users', exact: true});
    }

    /** Press "Import Users"; returns the new "Results" tab's panel once loaded. */
    async pressImport() {
        const {panel} = await super.pressImport('Import Users', 'Results');
        return panel;
    }

    /** Open "Export Users" and wait for the grid's first row. */
    async openExportTab() {
        await this.openTab('Export Users');
        await expect(this.rows().first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** The grid's title ("Current Users"). */
    gridTitle() {
        return this.grid.locator('.header h4').first();
    }

    /** The header links, in order ("Search", "Export All Users"). */
    headerLinks() {
        return this.grid.locator('.header .actions a').filter({visible: true});
    }

    searchLink() {
        return this.grid.locator('a.pkp_linkaction_search');
    }

    exportAllLink() {
        return this.grid.locator('a.pkp_linkaction_exportAllUsers');
    }

    columns() {
        return this.grid.getByRole('columnheader');
    }

    rows() {
        return this.grid.locator('tr.gridRow').filter({visible: true});
    }

    /** A row by text it holds (an email address is unique). */
    row(text) {
        return this.rows().filter({hasText: text});
    }

    /** A row's tick box. */
    rowBox(text) {
        return this.row(text).locator('input[name="selectedUsers[]"]');
    }

    filterForm() {
        return this.grid.locator('form#userSearchForm');
    }

    filterText() {
        return this.filterForm().locator('input[name="search"]');
    }

    filterRole() {
        return this.filterForm().locator('select[name="userGroup"]');
    }

    filterSearchButton() {
        return this.filterForm().getByRole('button', {name: 'Search', exact: true});
    }

    /** Press the header's "Search" (shows or hides the filter). */
    async toggleFilter() {
        await this.searchLink().click();
    }

    /**
     * Fill the filter and press its "Search"; resolves once the grid
     * re-fetched. Shows the filter first when it is hidden.
     *
     * @param {{text?: string, role?: string}} what
     */
    async search({text = '', role = 'All Roles'}) {
        if (!(await this.filterForm().isVisible())) {
            await this.toggleFilter();
            await expect(this.filterForm()).toBeVisible({timeout: T});
        }
        await this.filterText().fill(text);
        await this.filterRole().selectOption({label: role});
        const fetched = this.page.waitForResponse((r) => /fetch-grid|fetchGrid/.test(r.url()), {timeout: T});
        await this.filterSearchButton().click();
        await fetched;
        await waitForJQueryIdle(this.page);
    }

    exportUsersButton() {
        return this.page.locator('#exportXmlForm').getByRole('button', {name: 'Export Users', exact: true});
    }

    /** The "Confirm" window "Export All Users" opens. */
    confirmWindow() {
        return this.page.getByRole('dialog', {name: 'Confirm'});
    }

    /**
     * Press "Export All Users" until its "Confirm" window shows. The closing
     * window's clean-up runs 0.3 s after "Cancel" and takes down a window
     * opened in between (U63 T-omp-1), so a press that opens nothing is
     * pressed again, bounded by the window's own appearance.
     */
    async openExportAllConfirm() {
        await expect(async () => {
            if (!(await this.confirmWindow().isVisible())) await this.exportAllLink().click();
            await expect(this.confirmWindow()).toBeVisible({timeout: 1_000});
        }).toPass({timeout: T});
    }
}
exports.UsersXmlPage = UsersXmlPage;

// ---------------------------------------------------------------------------
// PubMed XML Export Plugin {OJS}
// ---------------------------------------------------------------------------

class PubMedPage extends ToolPage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page, contextPath, 'PubMedExportPlugin', 'PubMed XML Export Plugin');
        this.settingsPanel = page.locator('#settings-tab');
        this.list = new SubmissionExportList(page, 'Export Articles');
        this.issues = new IssueExportList(page);
    }

    nlmBox() {
        return this.settingsPanel.getByRole('textbox', {name: 'NLM Title Abbreviation', exact: true});
    }

    /** The help above the box, up to its link. */
    nlmHelp() {
        return this.settingsPanel.getByText('The NLM Title Abbreviation for the journal. If you do not know the abbreviation,', {exact: false});
    }

    /** The help's last words, the NLM Catalog link. */
    nlmCatalogLink() {
        return this.settingsPanel.getByRole('link', {name: 'search the NLM Catalog', exact: true});
    }

    saveButton() {
        return this.settingsPanel.getByRole('button', {name: 'Save', exact: true});
    }

    /** The Settings form is loaded (its box shows). */
    async expectSettingsLoaded() {
        await expect(this.nlmBox()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** Press "Save"; resolves once the form's post answered. */
    async save() {
        const saved = this.page.waitForResponse((r) => r.request().method() === 'POST' && /PubMedExportPlugin|manage/.test(r.url()), {timeout: T});
        await this.saveButton().click();
        expect((await saved).ok(), 'the save answered').toBe(true);
        await waitForJQueryIdle(this.page);
    }

    async openExportTab() {
        await this.openTab('Export Articles');
        await this.list.expectLoaded();
    }

    async openIssuesTab() {
        await this.openTab('Export Issues');
        await this.issues.expectLoaded();
    }
}
exports.PubMedPage = PubMedPage;

// ---------------------------------------------------------------------------
// DOAJ Export Plugin {OJS}
// ---------------------------------------------------------------------------

class DoajPage extends ToolPage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page, contextPath, 'DOAJExportPlugin', 'DOAJ Export Plugin');
        this.settingsPanel = page.locator('#settings-tab');
        this.settingsForm = page.locator('#doajSettingsForm');
        this.grid = page.locator('#submissionsListGridContainer .pkp_controllers_grid, #publicationsListGridContainer .pkp_controllers_grid').first();
        this.actionsForm = page.locator('form#exportSubmissionXmlForm, form#exportPublicationXmlForm').first();
    }

    // --- Settings -------------------------------------------------------

    contactLink() {
        return this.settingsPanel.getByRole('link', {name: 'Contact DOAJ for inclusion', exact: true});
    }

    apiKeyBox() {
        return this.settingsForm.locator('input[name=apiKey]');
    }

    autoBox() {
        return this.settingsForm.locator('input[name=automaticRegistration]');
    }

    saveButton() {
        return this.settingsForm.getByRole('button', {name: 'Save', exact: true});
    }

    async expectSettingsLoaded() {
        await expect(this.apiKeyBox()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** Press "Save"; resolves once the form's post answered. */
    async save() {
        const saved = this.page.waitForResponse((r) => r.request().method() === 'POST' && /DOAJExportPlugin|manage/.test(r.url()), {timeout: T});
        await this.saveButton().click();
        expect((await saved).ok(), 'the save answered').toBe(true);
        await waitForJQueryIdle(this.page);
    }

    // --- the list ---------------------------------------------------------

    /** Open "Articles" (or "Publications") and wait for the grid. */
    async openListTab(name = 'Articles') {
        await this.openTab(name);
        await this.expectListLoaded();
    }

    /** The grid is fetched: a row or its empty line. */
    async expectListLoaded() {
        await expect(this.grid.locator('tbody').first()).toBeAttached({timeout: T});
        await expect(this.rows().first().or(this.grid.locator('tbody.empty td').filter({visible: true})).first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    gridTitle() {
        return this.grid.locator('.header h4').first();
    }

    /** The header's "Search" link. */
    searchLink() {
        return this.grid.locator('.header .actions a').filter({hasText: /^\s*Search\s*$/});
    }

    columns() {
        return this.grid.getByRole('columnheader');
    }

    rows() {
        return this.grid.locator('tr.gridRow').filter({visible: true});
    }

    /** A row by text it holds (a title, "VoR 2.0"). */
    row(text) {
        return this.rows().filter({hasText: text});
    }

    /** A row's cells, trimmed, in order. */
    async rowCells(text) {
        await expect(this.row(text)).toHaveCount(1, {timeout: T});
        return this.row(text)
            .locator('td')
            .evaluateAll((tds) => tds.map((td) => ((/** @type {HTMLElement} */ (td)).innerText || '').replace(/\s+/g, ' ').trim()));
    }

    /** A row's "Status" (its last cell). */
    status(text) {
        return this.row(text).locator('td').last();
    }

    rowBox(text) {
        return this.row(text).locator('input[type=checkbox]');
    }

    /** A row's "Author; Title" link. */
    titleLink(text) {
        return this.row(text).getByRole('link', {name: text, exact: true});
    }

    /** The count line under the list ("1 - 2 of 2 items"). */
    pagingLine() {
        return this.grid.locator('.gridPaging');
    }

    validationBox() {
        return this.actionsForm.locator('input[name=validation]');
    }

    /** "Validate XML before the export and registration." by its label. */
    validationLabel() {
        return this.actionsForm.getByText('Validate XML before the export and registration.', {exact: true});
    }

    /** The action buttons under the list, in order. */
    actionButtons() {
        return this.actionsForm.locator('ul.export_actions button');
    }

    /** An action button by its form name ("deposit", "export", "markRegistered"). */
    actionButton(name) {
        return this.actionsForm.locator(`button[name="${name}"]`);
    }

    /**
     * Press an action that lands back on the page ("deposit",
     * "markRegistered", or any with nothing ticked) and wait for the
     * landing's list.
     */
    async pressAndLand(name) {
        const landed = this.page.waitForResponse(
            (r) => r.request().isNavigationRequest() && r.request().method() === 'GET' && r.url().includes(this.plugin),
            {timeout: 90_000}
        );
        await this.actionButton(name).click();
        await landed;
        await this.expectLoaded();
        await this.expectListLoaded();
    }

    // --- the filter ---------------------------------------------------------

    filterForm() {
        return this.grid.locator('form').first();
    }

    /** The filter's lists: the column ("Article Title"), issue and status. */
    filterSelect(name) {
        return this.filterForm().locator(`select[name="${name}"]`);
    }

    filterText() {
        return this.filterForm().locator('input[name="search"]');
    }

    filterSearchButton() {
        return this.filterForm().getByRole('button', {name: 'Search', exact: true});
    }

    /** Show the filter with the header's "Search". */
    async openFilter() {
        await this.searchLink().click();
        await expect(this.filterForm()).toBeVisible({timeout: T});
    }

    /** Choose a status in the filter and press its "Search"; resolves once the grid re-fetched. */
    async filterByStatus(label) {
        await this.filterSelect('statusId').selectOption({label});
        const fetched = this.page.waitForResponse((r) => /fetch-grid|fetchGrid/.test(r.url()), {timeout: T});
        await this.filterSearchButton().click();
        await fetched;
        await waitForJQueryIdle(this.page);
    }
}
exports.DoajPage = DoajPage;

// ---------------------------------------------------------------------------
// Files the tests write (the kept claim-check writers' shapes:
// shared/playwright/checks/U63/K2/k2.js and K3/k3.js)
// ---------------------------------------------------------------------------

const USERS_NS =
    'xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd"';

/** A role definition of `<user_groups>` (the import needs at least one). */
function userGroupXml(roleId, name, abbrev) {
    return (
        '\t\t<user_group>\n' +
        `\t\t\t<role_id>${roleId}</role_id>\n` +
        '\t\t\t<context_id>1</context_id>\n' +
        '\t\t\t<is_default>true</is_default>\n' +
        '\t\t\t<permit_self_registration>false</permit_self_registration>\n' +
        '\t\t\t<permit_metadata_edit>false</permit_metadata_edit>\n' +
        `\t\t\t<name locale="en">${name}</name>\n` +
        `\t\t\t<abbrev locale="en">${abbrev}</abbrev>\n` +
        '\t\t\t<stage_assignments></stage_assignments>\n' +
        '\t\t\t<masthead>false</masthead>\n' +
        '\t\t</user_group>\n'
    );
}

/**
 * A Users XML file (spec footnote sc: `<user_groups>`, a
 * `<date_registered>` and a `<masthead>` per role, which the import needs,
 * A13). Each user: `{givenName, familyName, email, username, password,
 * roles}`; `password` is `{plain}` or `{encryption, hash}`; `roles` the
 * role names as the journal (press) names them. `<user_groups>` defines the
 * Reader role, a role every journal and press has, so the import creates
 * no role of its own.
 *
 * @param {Array<{givenName: string, familyName: string, email: string, username: string, password: {plain?: string, encryption?: string, hash?: string}, roles: string[]}>} users
 */
function usersXmlFile(users) {
    const body = users
        .map((u) => {
            const pw = u.password.encryption
                ? `\t\t\t<password is_disabled="false" must_change="false" encryption="${u.password.encryption}">\n\t\t\t\t<value>${u.password.hash}</value>\n\t\t\t</password>\n`
                : `\t\t\t<password is_disabled="false" must_change="false">\n\t\t\t\t<value>${u.password.plain}</value>\n\t\t\t</password>\n`;
            const roles = u.roles
                .map((r) => `\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>${r}</user_group_ref>\n\t\t\t\t<masthead>true</masthead>\n\t\t\t</user_user_group>\n`)
                .join('');
            return (
                '\t\t<user>\n' +
                `\t\t\t<givenname locale="en">${u.givenName}</givenname>\n` +
                `\t\t\t<familyname locale="en">${u.familyName}</familyname>\n` +
                `\t\t\t<email>${u.email}</email>\n` +
                `\t\t\t<username>${u.username}</username>\n` +
                pw +
                '\t\t\t<date_registered>2020-01-02 03:04:05</date_registered>\n' +
                roles +
                '\t\t</user>\n'
            );
        })
        .join('');
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        `<PKPUsers ${USERS_NS}>\n` +
        `\t<user_groups>\n${userGroupXml(1048576, 'Reader', 'Read')}\t</user_groups>\n` +
        `\t<users>\n${body}\t</users>\n` +
        '</PKPUsers>\n'
    );
}
exports.usersXmlFile = usersXmlFile;

/** An md5 hex digest (a password "stored another way", Rule 25). */
function md5(text) {
    return require('crypto').createHash('md5').update(text).digest('hex');
}
exports.md5 = md5;

/**
 * The users of a Users XML file: `[{username, email, roles}]`, `roles` the
 * `<user_group_ref>` names.
 *
 * @param {string} xml
 */
function usersInFile(xml) {
    return [...xml.matchAll(/<user>([\s\S]*?)<\/user>/g)].map((m) => ({
        username: (m[1].match(/<username>([^<]*)<\/username>/) || [])[1] || null,
        email: (m[1].match(/<email>([^<]*)<\/email>/) || [])[1] || null,
        roles: [...m[1].matchAll(/<user_group_ref>([^<]*)<\/user_group_ref>/g)].map((r) => r[1]),
    }));
}
exports.usersInFile = usersInFile;

/**
 * A Native XML file of one article placed in an issue the journal lacks
 * (spec footnote sc): the export's publication gets a publication date
 * and, last, `<issue_identification>` of `volume`, `number`, `year` {OJS}.
 *
 * @param {string} xml a one-article export
 * @param {{volume: number, number: number, year: number}} issue
 */
function nativeWithIssue(xml, {volume, number, year}) {
    let x = xml.replace(/(<publication\s[^>]*?)(\s*>)/, (all, head, end) =>
        (/date_published=/.test(head) ? head : `${head} date_published="2026-01-02"`) + end
    );
    x = x.replace(
        /(\s*)<\/publication>/,
        `$1  <issue_identification><volume>${volume}</volume><number>${number}</number><year>${year}</year></issue_identification>$1</publication>`
    );
    return x;
}
exports.nativeWithIssue = nativeWithIssue;

/**
 * A Native XML file the format refuses (spec footnote sc): the export's
 * submission renamed `to` and followed by an element the format does not
 * know, inside the submission element (`article`, `monograph`, `preprint`).
 *
 * @param {string} xml a one-submission export
 * @param {{element: string, from: string, to: string}} what
 */
function nativeWithUnknownElement(xml, {element, from, to}) {
    return xml
        .split(from)
        .join(to)
        .replace(new RegExp(`(<${element}\\s[^>]*>)`), '$1<bogus_element>x</bogus_element>');
}
exports.nativeWithUnknownElement = nativeWithUnknownElement;

/**
 * A Native XML file of one monograph naming a series the press lacks
 * {OMP} (spec footnote sc, the way K2 writes it): the export's monograph
 * renamed `to`, its publication ending in `<series>` with `title` and
 * `path`.
 *
 * @param {string} xml a one-monograph export
 * @param {{from: string, to: string, path: string, title: string}} what
 */
function nativeWithSeries(xml, {from, to, path, title}) {
    const x = xml.split(from).join(to);
    const series = `<series><title locale="en">${title}</title><path>${path}</path></series>`;
    if (/<series[\s>]/.test(x)) return x.replace(/<series[\s>][\s\S]*?<\/series>/, series);
    return x.replace(/(\s*)<\/publication>/, `$1  ${series}$1</publication>`);
}
exports.nativeWithSeries = nativeWithSeries;
