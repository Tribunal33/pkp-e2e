// @ts-check
/**
 * @file shared/playwright/pages/PluginsPages.js
 *
 * Page objects for U62 "Plugins management"
 * (docs/specs/U62-plugins-management.md), shared by the OJS, OMP and OPS
 * suites. App-neutral (PRINCIPLES M2): the category headings, the context's
 * name in Hosted Journals (Presses, Servers) and every other per-app word
 * are passed in by the suite; the locators are the markup the three apps
 * share (one lib/pkp code path, the legacy plugin grids).
 *
 * Surfaces:
 * - PluginsList — the "Installed Plugins" list, whichever page shows it
 *   (a journal's Settings › Website › "Plugins", Administration › "Site
 *   Settings" › "Plugins", the Settings Wizard's "Plugins"): its title,
 *   header links ("Search", "Upload A New Plugin"), column headings,
 *   category headings with their rows or "No Items", a row's name, box,
 *   arrow and line of links, the filter, the box presses with the
 *   "Disable" window, "Upload A New Plugin", a row's "Upgrade" and
 *   "Delete" with its window.
 * - PluginUploadWindow — the "Upload A New Plugin" / "Upgrade Plugin"
 *   window: the file field, "Upload File" / "Change File", "Save",
 *   "Cancel", "Close".
 * - WebsitePluginsPage — a context's Settings › Website › "Plugins".
 * - SitePluginsPage — Administration › "Site Settings" › "Plugins" (U60's
 *   SiteSettingsPage for the shell).
 * - WizardPluginsPage — Administration › Hosted Journals › a context's
 *   "Settings wizard" › "Plugins" (U10's SettingsWizard for the shell).
 * - notices(), markNotices(), expectFreshNotice(), closeNotices() — the
 *   notices at the top right, by text, fresh ones only after a mark; closed
 *   before any press under them.
 *
 * DOM facts the locators rely on (U62 claim check K1–K3, 2026-09-27, three
 * apps; `.reports/U62/screen-notes.md`):
 * - the list is a legacy grid, `settingsplugingrid` on a context's pages
 *   and in the wizard, `adminplugingrid` on the site's; each category is a
 *   `tbody.category_grid_body` whose first `tr.gridRow` is the heading row,
 *   followed by a `tbody.category_placeholder` that shows "No Items" only
 *   while the category is empty;
 * - a plugin row is `tr.gridRow[id$="-row-<plugin id>"]` (the plugin's
 *   name: its class name in lower case for a generic or block plugin); its
 *   arrow is `a.show_extras` (`a.hide_extras` while open) and its links sit
 *   in the next `tr.row_controls`;
 * - the filter form is hidden at landing; the header's "Search" shows it,
 *   and every search re-fetches the grid (`…-plugin-grid/fetch-grid`) and
 *   hides it again;
 * - a box press posts `…-plugin-grid/enable` at once, or opens the
 *   "Disable" confirmation first, whose "OK" posts `…/disable`; "Upload A
 *   New Plugin" and "Upgrade" open a legacy window whose file goes up
 *   through `upload-plugin-file` and whose "Save" posts
 *   `save-upload-plugin`; "Delete" opens a confirmation whose "OK" posts
 *   `delete-plugin`; component calls are hyphenated in the address;
 * - every landing on these pages also fetches the Plugin Gallery's list,
 *   which answers 500 on the test installs (spec A1): nothing here waits
 *   on it.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {SiteSettingsPage} = require('./SiteSettingsPages.js');
const {SettingsWizard} = require('./AppearancePages.js');
const {waitForJQueryIdle} = require('../support/legacy.js');

const T = 30_000;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A whole text, white space around it allowed. */
const exactText = (s) => new RegExp(`^\\s*${escapeRegExp(s)}\\s*$`);

/** The installed-plugins grid, the context's or the site's, whichever shows. */
const GRID =
    '.pkp_controllers_grid[id^="component-grid-settings-plugins-settingsplugingrid-"]:visible, ' +
    '.pkp_controllers_grid[id^="component-grid-admin-plugins-adminplugingrid-"]:visible';

/** A response of the installed list's own component call (`op` hyphenated). */
const isGridCall = (op) => (response) => new RegExp(`/(settings|admin)-plugin-grid/${op}(\\?|$)`).test(response.url());

// ---------------------------------------------------------------------------
// Notices at the top right
// ---------------------------------------------------------------------------

/**
 * The notices at the top right, optionally those reading `text` (a string
 * is the whole notice, its "×" and "Close" aside; a RegExp is matched as
 * given); with `fresh`, only those shown after the last `markNotices`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} [text]
 * @param {{fresh?: boolean}} [options]
 */
function notices(page, text, {fresh = false} = {}) {
    const all = page.locator(`.app__notifications .pkpNotification${fresh ? ':not([data-seen])' : ''}`);
    if (!text) {
        return all;
    }
    // A notice's own white space is kept as the server wrote it (two spaces
    // after a full stop in some), so any run of it matches one space.
    const re =
        typeof text === 'string'
            ? new RegExp(`^\\s*${escapeRegExp(text.trim()).replace(/\s+/g, '\\s+')}\\s*(×\\s*)?(Close\\s*)?$`)
            : text;
    return all.filter({hasText: re});
}

/**
 * Mark every notice now on screen as seen, so a later `fresh` read finds
 * only those an action shows afterwards (an earlier one may still stand).
 *
 * @param {import('@playwright/test').Page} page
 */
async function markNotices(page) {
    await page.evaluate(() => {
        document.querySelectorAll('.app__notifications .pkpNotification').forEach((n) => n.setAttribute('data-seen', '1'));
    });
}

/**
 * Close every notice at the top right with its "×": they stack over the
 * list's top right corner, "Upload A New Plugin" and the boxes included,
 * and a warning stays until closed.
 *
 * @param {import('@playwright/test').Page} page
 */
async function closeNotices(page) {
    const buttons = page.locator('.app__notifications .pkpNotification').getByRole('button', {name: 'Close'});
    while ((await buttons.count()) > 0) {
        const n = await buttons.count();
        await buttons.first().click();
        await expect(buttons).toHaveCount(n - 1, {timeout: T});
    }
}

/**
 * Expect one fresh notice reading `text` (marked before the action by the
 * caller), and return it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} text
 */
async function expectFreshNotice(page, text) {
    const notice = notices(page, text, {fresh: true});
    await expect(notice).toHaveCount(1, {timeout: T});
    return notice;
}

// ---------------------------------------------------------------------------
// "Upload A New Plugin" / "Upgrade Plugin"
// ---------------------------------------------------------------------------

class PluginUploadWindow extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {'Upload A New Plugin'|'Upgrade Plugin'} name
     */
    constructor(page, name) {
        super(page);
        this.name = name;
        this.dialog = page.getByRole('dialog', {name, exact: true});
        this.heading = this.dialog.getByRole('heading', {name, exact: true});
        this.form = this.dialog.locator('form').first();
        this.fieldLabel = this.dialog.locator('label').filter({hasText: 'Select plugin file'}).first();
        this.dropText = this.dialog.getByText('Drag and drop a file here to begin upload', {exact: true});
        this.uploadButton = this.dialog.getByRole('button', {name: 'Upload File', exact: true});
        this.changeButton = this.dialog.getByRole('button', {name: 'Change File', exact: true});
        this.fileInput = this.dialog.locator('input[type=file]').first();
        this.temporaryFileId = this.dialog.locator('input[name=temporaryFileId]');
        this.saveButton = this.dialog.getByRole('button', {name: 'Save', exact: true});
        this.cancelLink = this.dialog.getByRole('link', {name: 'Cancel', exact: true});
        this.closeButton = this.dialog.getByRole('button', {name: 'Close', exact: true});
        this.requiredLine = this.dialog.getByText('Required fields are marked with an asterisk: *', {exact: true});
    }

    /** The window is up with its file field ready. */
    async ready() {
        await expect(this.heading).toBeVisible({timeout: T});
        await expect(this.fileInput).toBeAttached({timeout: T});
        await expect(this.uploadButton.or(this.changeButton)).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** The window's text between its heading and "Save", as shown (white space collapsed). */
    async formText() {
        await expect(this.saveButton).toBeVisible({timeout: T});
        return (await this.form.innerText()).replace(/\s+/g, ' ').trim();
    }

    /**
     * Choose a file through "Upload File" (the file field under it): the
     * upload's answer awaited and the field's file id set.
     *
     * @param {string} file absolute path
     */
    async chooseFile(file) {
        const uploaded = this.page.waitForResponse((r) => /upload-plugin-file/.test(r.url()), {timeout: T});
        await this.fileInput.setInputFiles(file);
        expect((await uploaded).status()).toBe(200);
        await expect(this.temporaryFileId).not.toHaveValue('', {timeout: T});
        await expect(this.changeButton).toBeVisible({timeout: T});
    }

    /** Press "Save" and return the save's response. */
    async save() {
        const saved = this.page.waitForResponse(isGridCall('save-upload-plugin'), {timeout: T});
        await this.saveButton.click();
        const response = await saved;
        await waitForJQueryIdle(this.page);
        return response;
    }
}

// ---------------------------------------------------------------------------
// "Installed Plugins"
// ---------------------------------------------------------------------------

class PluginsList extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.grid = page.locator(GRID).first();
        this.title = this.grid.locator('.header h4');
        this.headerLinks = this.grid.locator('.header .actions a:visible');
        this.searchLink = this.grid.locator('.header .actions a').filter({hasText: 'Search'}).first();
        this.uploadLink = this.grid.locator('.header .actions').getByRole('link', {name: 'Upload A New Plugin', exact: true});
        this.columns = this.grid.locator('thead th');
        this.headings = this.grid.locator('tbody.category_grid_body > tr.gridRow:first-child .label');
        this.pluginRows = this.grid.locator('tbody.category_grid_body > tr.gridRow:not(:first-child)');
        this.filterForm = this.grid.locator('form.filter').first();
        this.categorySelect = this.filterForm.locator('select[name="category"]');
        this.nameBox = this.filterForm.locator('input[name="pluginName"]');
        this.filterButton = this.filterForm.getByRole('button', {name: 'Search', exact: true});
        this.disableWindow = page.getByRole('dialog').filter({hasText: 'Are you sure you want to disable this plugin?'});
        this.deleteWindow = page.getByRole('dialog').filter({hasText: 'Are you sure you wish to delete this plugin from the system?'});
    }

    /** The list is up: its title and a first plugin row. */
    async ready() {
        await expect(this.title).toBeVisible({timeout: T});
        await expect(this.pluginRows.first()).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** A category's body (heading row and plugin rows) by its heading. */
    category(heading) {
        return this.grid
            .locator('tbody.category_grid_body')
            .filter({has: this.page.locator('tr.gridRow:first-child .label', {hasText: exactText(heading)})});
    }

    /** A category's plugin rows. */
    categoryRows(heading) {
        return this.category(heading).locator('tr.gridRow:not(:first-child)');
    }

    /** The "No Items" line under a category (shown only while it is empty). */
    emptyLine(heading) {
        return this.category(heading).locator('xpath=following-sibling::tbody[1][contains(@class,"category_placeholder")]');
    }

    /** A plugin's row by its id (`webfeedplugin`, `googleanalyticsplugin`, …). */
    row(id) {
        return this.grid.locator(`tr.gridRow[id$="-row-${id}"]`);
    }

    /** A plugin's row by its id, under one category. */
    rowIn(heading, id) {
        return this.category(heading).locator(`tr.gridRow[id$="-row-${id}"]`);
    }

    /** A row's name. */
    rowName(id) {
        return this.row(id).locator('td').first().locator('.label');
    }

    /** A row's "Enabled" box. */
    box(id) {
        return this.row(id).locator('input[type=checkbox]');
    }

    /** A row's arrow, closed or open. */
    arrow(id) {
        return this.row(id).locator('a.show_extras, a.hide_extras');
    }

    /** A row's line of links (the row after it). */
    rowLinks(id) {
        return this.row(id).locator('xpath=following-sibling::tr[1][contains(@class,"row_controls")]').locator('a:visible');
    }

    /** A link on a row's line by its words. */
    rowLink(id, name) {
        return this.row(id)
            .locator('xpath=following-sibling::tr[1][contains(@class,"row_controls")]')
            .getByRole('link', {name, exact: true});
    }

    /**
     * The list as data: each category's heading, its rows (id, name, box
     * ticked, box pressable, arrow) and whether "No Items" shows. Read
     * through `expect.poll`: the grid redraws after every search.
     */
    async read() {
        return this.grid.evaluate((grid) => {
            const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
            const shown = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
            return [...grid.querySelectorAll('tbody.category_grid_body')].map((body) => {
                const rows = [...body.querySelectorAll(':scope > tr.gridRow')];
                const next = body.nextElementSibling;
                const placeholder = next && next.classList.contains('category_placeholder') ? next : null;
                return {
                    heading: text(rows[0] && rows[0].querySelector('.label')),
                    empty: placeholder && shown(placeholder) ? text(placeholder) : null,
                    rows: rows.slice(1).map((tr) => {
                        const box = tr.querySelector('input[type=checkbox]');
                        return {
                            id: tr.id.replace(/^.*-row-/, ''),
                            name: text(tr.querySelector('td .label')),
                            ticked: box ? box.checked : null,
                            locked: box ? box.disabled : null,
                            arrow: !!tr.querySelector('a.show_extras, a.hide_extras'),
                        };
                    }),
                };
            });
        });
    }

    /** `read()` reduced to heading → row names (and "No Items"), for comparisons. */
    async outline() {
        return (await this.read()).map((c) => ({heading: c.heading, empty: c.empty, names: c.rows.map((r) => r.name)}));
    }

    // ---- the arrow ----------------------------------------------------------

    /** Press a row's closed arrow and wait for its line of links. */
    async openArrow(id) {
        await this.row(id).locator('a.show_extras').click();
        await expect(this.row(id).locator('a.hide_extras')).toBeAttached({timeout: T});
        await expect(this.rowLinks(id).first()).toBeVisible({timeout: T});
    }

    /** Press a row's open arrow and wait for its line to close. */
    async closeArrow(id) {
        await this.row(id).locator('a.hide_extras').click();
        await expect(this.row(id).locator('a.show_extras')).toBeAttached({timeout: T});
        await expect(this.rowLinks(id)).toHaveCount(0, {timeout: T});
    }

    // ---- the filter ---------------------------------------------------------

    /** Show the filter with the header's "Search" (when it is hidden). */
    async openFilter() {
        if (!(await this.filterForm.isVisible())) {
            await this.searchLink.click();
        }
        await expect(this.nameBox).toBeVisible({timeout: T});
    }

    /**
     * Search: the filter shown, the drop-down set to `category` (a label)
     * when given, the box set to `text` when given, then its "Search"
     * pressed (or Enter in the box); returns once the list has redrawn and
     * the filter is hidden again.
     *
     * @param {{text?: string, category?: string, enter?: boolean}} options
     */
    async search({text, category, enter = false} = {}) {
        await this.openFilter();
        if (category !== undefined) {
            await this.categorySelect.selectOption({label: category});
        }
        if (text !== undefined) {
            await this.nameBox.fill(text);
        }
        const fetched = this.page.waitForResponse(isGridCall('fetch-grid'), {timeout: T});
        if (enter) {
            await this.nameBox.press('Enter');
        } else {
            await this.filterButton.click();
        }
        expect((await fetched).status()).toBe(200);
        await expect(this.filterForm).toBeHidden({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    // ---- the boxes ----------------------------------------------------------

    /**
     * Tick an unticked box: the enable request's response (nothing asks
     * first; the caller reads the notice and the window).
     */
    async tick(id) {
        await expect(this.box(id)).not.toBeChecked({timeout: T});
        await closeNotices(this.page);
        const enabled = this.page.waitForResponse(isGridCall('enable'), {timeout: T});
        await this.box(id).click();
        const response = await enabled;
        await expect(this.box(id)).toBeChecked({timeout: T});
        await waitForJQueryIdle(this.page);
        return response;
    }

    /** Untick a ticked box: the "Disable" window opens and is returned. */
    async pressTicked(id) {
        await expect(this.box(id)).toBeChecked({timeout: T});
        await closeNotices(this.page);
        await this.box(id).click();
        await expect(this.disableWindow).toBeVisible({timeout: T});
        return this.disableWindow;
    }

    /** "OK" in the "Disable" window: the disable request's response, the box unticked. */
    async confirmDisable(id) {
        const disabled = this.page.waitForResponse(isGridCall('disable'), {timeout: T});
        await this.disableWindow.getByRole('button', {name: 'OK', exact: true}).click();
        const response = await disabled;
        await expect(this.box(id)).not.toBeChecked({timeout: T});
        await waitForJQueryIdle(this.page);
        return response;
    }

    /**
     * "Cancel" in the "Disable" window: the window closes; returns the
     * disable requests sent meanwhile (none expected).
     */
    async cancelDisable() {
        const sent = [];
        const onRequest = (r) => {
            if (/-plugin-grid\/disable/.test(r.url())) sent.push(r.url());
        };
        this.page.on('request', onRequest);
        await this.disableWindow.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(this.disableWindow).toHaveCount(0, {timeout: T});
        await waitForJQueryIdle(this.page);
        this.page.off('request', onRequest);
        return sent;
    }

    // ---- upload, upgrade, delete -------------------------------------------

    /** "Upload A New Plugin": the window, ready. */
    async openUpload() {
        await closeNotices(this.page);
        await this.uploadLink.click();
        const win = new PluginUploadWindow(this.page, 'Upload A New Plugin');
        await win.ready();
        return win;
    }

    /** A row's "Upgrade" (its arrow opened first when closed): the window, ready. */
    async openUpgrade(id) {
        await closeNotices(this.page);
        if (await this.row(id).locator('a.show_extras').count()) {
            await this.openArrow(id);
        }
        await this.rowLink(id, 'Upgrade').click();
        const win = new PluginUploadWindow(this.page, 'Upgrade Plugin');
        await win.ready();
        return win;
    }

    /** A row's "Delete" (its arrow opened first when closed): the window. */
    async openDelete(id) {
        await closeNotices(this.page);
        if (await this.row(id).locator('a.show_extras').count()) {
            await this.openArrow(id);
        }
        await this.rowLink(id, 'Delete').click();
        await expect(this.deleteWindow).toBeVisible({timeout: T});
        return this.deleteWindow;
    }

    /** "OK" in the "Delete" window: the delete request's response. */
    async confirmDelete() {
        const deleted = this.page.waitForResponse(isGridCall('delete-plugin'), {timeout: T});
        await this.deleteWindow.getByRole('button', {name: 'OK', exact: true}).click();
        const response = await deleted;
        await waitForJQueryIdle(this.page);
        return response;
    }

    /**
     * Upload a package through "Upload A New Plugin" and "Save"; returns
     * the save's response (the window closes on any server answer).
     *
     * @param {string} file
     */
    async upload(file) {
        const win = await this.openUpload();
        await win.chooseFile(file);
        const response = await win.save();
        await expect(win.dialog).toHaveCount(0, {timeout: T});
        await pastModalCloseWindow(this.page);
        return response;
    }

    /**
     * Upload a package through a row's "Upgrade" and "Save".
     *
     * @param {string} id
     * @param {string} file
     */
    async upgrade(id, file) {
        const win = await this.openUpgrade(id);
        await win.chooseFile(file);
        const response = await win.save();
        await expect(win.dialog).toHaveCount(0, {timeout: T});
        await pastModalCloseWindow(this.page);
        return response;
    }
}

/**
 * Wait out the modal store's close slot: an opener pressed again within
 * it opens nothing (patterns.md pitfall 4).
 *
 * @param {import('@playwright/test').Page} page
 */
async function pastModalCloseWindow(page) {
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));
}

// ---------------------------------------------------------------------------
// The three pages
// ---------------------------------------------------------------------------

/** The "Plugins" top tab's inner tabs ("Installed Plugins", "Plugin Gallery"). */
function pluginsInnerTabs(page) {
    return page.getByRole('tabpanel', {name: 'Plugins', exact: true}).getByRole('tablist').first().getByRole('tab');
}

class WebsitePluginsPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath a scratch context (its bare address)
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.topTabs = page.getByRole('main').getByRole('tablist').first().getByRole('tab');
        this.pluginsTab = this.topTabs.filter({hasText: exactText('Plugins')});
        this.innerTabs = pluginsInnerTabs(page);
        this.list = new PluginsList(page);
    }

    url() {
        return this.contextUrl(this.contextPath, '/management/settings/website');
    }

    /** Settings › Website, then its "Plugins" tab; the list ready. */
    async goto() {
        await this.page.goto(this.url());
        await expect(this.pluginsTab).toBeVisible({timeout: T});
        await this.pluginsTab.click();
        await expect(this.pluginsTab).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await this.list.ready();
    }

    /** Reload the page (it lands on "Appearance") and open "Plugins" again. */
    async reload() {
        await this.page.reload();
        await expect(this.pluginsTab).toBeVisible({timeout: T});
        await this.pluginsTab.click();
        await this.list.ready();
    }
}

class SitePluginsPage extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.site = new SiteSettingsPage(page);
        this.innerTabs = pluginsInnerTabs(page);
        this.list = new PluginsList(page);
    }

    /** Administration › "Site Settings" › "Plugins"; the list ready. */
    async goto() {
        await this.site.gotoFromAdministration();
        await this.site.openTop('Plugins');
        await this.list.ready();
    }

    /** Reload the page and, on whatever tab it lands, open "Plugins" again. */
    async reload() {
        await this.site.reload();
        await this.site.openTop('Plugins');
        await this.list.ready();
    }
}

class WizardPluginsPage extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.wizard = new SettingsWizard(page);
        this.topTabs = page.getByRole('main').getByRole('tablist').first().getByRole('tab');
        this.pluginsTab = this.topTabs.filter({hasText: exactText('Plugins')});
        this.innerTabs = pluginsInnerTabs(page);
        this.list = new PluginsList(page);
    }

    /**
     * Administration › Hosted Journals (Presses, Servers) › the context's
     * row arrow › "Settings wizard" › "Plugins"; the list ready.
     *
     * @param {string} contextName the context's name as the row shows it
     */
    async goto(contextName) {
        await this.wizard.gotoHostedContexts();
        await this.wizard.openRowActions(contextName);
        await this.wizard.chooseWizard(contextName);
        await expect(this.pluginsTab).toBeVisible({timeout: T});
        await this.pluginsTab.click();
        await expect(this.pluginsTab).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await this.list.ready();
    }
}

module.exports = {
    PluginsList,
    PluginUploadWindow,
    WebsitePluginsPage,
    SitePluginsPage,
    WizardPluginsPage,
    notices,
    markNotices,
    closeNotices,
    expectFreshNotice,
    pastModalCloseWindow,
};
