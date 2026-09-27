// @ts-check
/**
 * @file shared/playwright/pages/AdminPages.js
 *
 * Page objects for U61 "System administration & jobs"
 * (docs/specs/U61-system-administration.md), shared by the OJS, OMP and OPS
 * suites. App-neutral (PRINCIPLES M2): every word that differs per app (the
 * configuration table's title "OJS Configuration" / "OMP Configuration" /
 * "OPS Configuration", "Hosted Journals" / "Hosted Presses" / "Hosted
 * Servers") is passed in by the suite; the locators are the markup the
 * three apps share (one lib/pkp and ui-library code path). The
 * Administration shell's other page, "Site Settings", is U60's
 * `SiteSettingsPage` (SiteSettingsPages.js).
 *
 * Surfaces:
 * - AdministrationPage — index/admin: the heading, the six action panels
 *   (heading, text, links and buttons), the three form buttons that ask
 *   through the browser's own confirm() and the one that does not
 *   (`press`, `pressAndStay`), the site's user-menu entry
 *   (`gotoFromUserMenu`).
 * - SystemInfoPage — index/admin/systemInfo: "Current version", the three
 *   tables (read as data once Vue has mounted them), the configuration
 *   table by section, "Extended PHP Information" in a new tab.
 * - JobsPage, FailedJobsPage — index/admin/jobs and failedJobs: the table,
 *   its title and total line, the page links, a row found by its "ID"
 *   across the page links (`findRow`), every row's ID across the pages
 *   (`allRows`); Failed Jobs adds "Requeue All Failed Jobs", the row
 *   buttons, the success notice.
 * - FailedJobDetailsPage — index/admin/failedJobDetails/{id}.
 * - The trail every page but Administration carries (`trail`, `trailItems`,
 *   `trailLink`), on the shared base `AdminScreen`.
 *
 * DOM facts the locators rely on (U61 claim check, 2026-09-26/27, three
 * apps; `.reports/U61/screen-notes.md`):
 * - Administration's panels are ui-library ActionPanels: `.actionPanel`
 *   holding an h2, a p and `.actionPanel__actions`; "Expire User
 *   Sessions", "Delete Template Cache" and "Delete Task Logs" are POST form
 *   buttons with `onclick="return confirm(…)"`, "Delete Data Caches" has no
 *   onclick; each POST redirects (to index/admin, or to the site's login
 *   page after "Expire User Sessions");
 * - the trail is `nav` "You are here:" (`nav.app__breadcrumbs`), absent on
 *   Administration; the Administration pages carry no side menu
 *   (`nav#app-nav`);
 * - the Jobs and Failed Jobs lists load once on landing through
 *   `GET index/api/v1/jobs/all` / `jobs/failed/all` (`?page=n` for the page
 *   links, 50 rows a page, no set order), so every read here waits on that
 *   response and learns from its `data` which IDs the page holds; the
 *   tables are aria-labelled by their title and aria-described by the
 *   total line; header cells render in capitals through CSS (their text is
 *   as written); an empty table is one row "No Items";
 * - a row action posts to `jobs/redispatch/{id}` or (DELETE override)
 *   `jobs/{id}`, "Requeue All" to `jobs/redispatch/all`; the success
 *   notice is `.pkpNotification` at the top right, which covers the rows
 *   under it until closed;
 * - System Information's tables are Vue tables mounted from the server's
 *   markup: `table[aria-labelledby=versionHistory|serverInformation|
 *   systemConfiguration]`; each configuration section is its own tbody
 *   whose first row is one bold cell `td.app--admin__systemInfoGroup`.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {PublicChrome} = require('./NavigationChromePages.js');

const T = 30_000;

/** A GET of a jobs list (the landing load or a page link). */
function isListLoad(response, kind) {
    const path = new URL(response.url()).pathname;
    const tail = kind === 'failed' ? '/api/v1/jobs/failed/all' : '/api/v1/jobs/all';
    return response.request().method() === 'GET' && path.endsWith(tail);
}

/** A row action or "Requeue All" sent from the Failed Jobs page. */
function isJobAction(response) {
    return response.request().method() === 'POST' && /\/api\/v1\/jobs\//.test(new URL(response.url()).pathname);
}

// ---------------------------------------------------------------------------
// The shell every Administration page shares
// ---------------------------------------------------------------------------

class AdminScreen extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.main = page.locator('main');
        this.heading = page.locator('main h1').first();
        this.trail = page.getByRole('navigation', {name: 'You are here:'});
        this.trailItems = this.trail.getByRole('listitem');
        this.trailLinks = this.trail.getByRole('link');
        this.sideMenu = page.locator('nav#app-nav');
        this.editorialHeader = page.locator('header.app__header');
    }

    /** A link of the trail, by its name. */
    trailLink(name) {
        return this.trail.getByRole('link', {name, exact: true});
    }

    /** The trail's "Administration", and wait for that page. */
    async backToAdministration() {
        await this.trailLink('Administration').click();
        const admin = new AdministrationPage(this.page);
        await admin.expectOpen();
        return admin;
    }
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

class AdministrationPage extends AdminScreen {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.panels = this.main.locator('.actionPanel');
        this.panelHeadings = this.panels.locator('h2');
    }

    /** The page's address (`index/admin`), or with another path in place of "index". */
    url(contextPath = 'index') {
        return `/index.php/${contextPath}/en/admin`;
    }

    /** Type the address and wait for the panels. */
    async goto() {
        await this.page.goto(this.url());
        await this.expectOpen();
    }

    /** The heading and the six panels are up. */
    async expectOpen() {
        await expect(this.heading).toHaveText('Administration', {timeout: T});
        await expect(this.panelHeadings).toHaveCount(6, {timeout: T});
    }

    /**
     * From a public page already open, the user menu's "Administration"
     * (the theme's user menu: the username, then its list).
     *
     * @param {string} username the signed-in account, the menu's top item
     * @param {string} contextPath the public page's path ('index' for the site)
     */
    async gotoFromUserMenu(username, contextPath = 'index') {
        const chrome = new PublicChrome(this.page, contextPath, {locale: 'en'});
        const top = new RegExp(`^\\s*${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        await chrome.pressTop('user', top);
        await expect(chrome.submenu('user', top)).toBeVisible({timeout: T});
        await chrome.submenuLink('user', top, 'Administration').click();
        await this.page.waitForURL(/\/admin(\/index)?$/, {timeout: T, waitUntil: 'commit'});
        await this.expectOpen();
    }

    /** A panel, by its heading. */
    panel(heading) {
        return this.panels.filter({has: this.page.locator('h2', {hasText: new RegExp(`^\\s*${heading}\\s*$`)})});
    }

    /** A panel's text under its heading. */
    panelText(heading) {
        return this.panel(heading).locator('p').first();
    }

    /** A panel's links and buttons, in order. */
    panelControls(heading) {
        return this.panel(heading).locator('.actionPanel__actions').locator('a, button');
    }

    /** A link of the page, by its exact name. */
    link(name) {
        return this.main.getByRole('link', {name, exact: true});
    }

    /** A form button of the page, by its exact name. */
    button(name) {
        return this.main.getByRole('button', {name, exact: true});
    }

    /**
     * Press a form button and follow the page it lands on. The browser's
     * own confirmation box, when one opens, is accepted; every box's text
     * is returned, so a caller asserts whether one asked.
     *
     * @param {string} name
     * @returns {Promise<{dialogs: string[], status: number | null}>} the
     *   boxes' texts and the landed page's status
     */
    async press(name) {
        const dialogs = [];
        const onDialog = (dialog) => {
            dialogs.push(dialog.message());
            dialog.accept().catch(() => {});
        };
        this.page.on('dialog', onDialog);
        try {
            const [response] = await Promise.all([
                this.page.waitForNavigation({waitUntil: 'load', timeout: T}),
                this.button(name).click(),
            ]);
            return {dialogs, status: response ? response.status() : null};
        } finally {
            this.page.off('dialog', onDialog);
        }
    }

    /**
     * Press a form button that asks, and answer "Cancel". Returns the box's
     * text, whether the page stayed (a mark set in the window before the
     * press survives, so no navigation followed), and every POST the page
     * sent meanwhile.
     *
     * @param {string} name
     * @returns {Promise<{dialogs: string[], stayed: boolean, posts: string[]}>}
     */
    async pressAndCancel(name) {
        const dialogs = [];
        const posts = [];
        const onDialog = (dialog) => {
            dialogs.push(dialog.message());
            dialog.dismiss().catch(() => {});
        };
        const onRequest = (request) => {
            if (request.method() === 'POST') {
                posts.push(request.url());
            }
        };
        this.page.on('dialog', onDialog);
        this.page.on('request', onRequest);
        try {
            await this.page.evaluate(() => {
                // @ts-ignore
                window.__u61Stay = true;
            });
            await this.button(name).click();
            await expect(this.heading).toHaveText('Administration');
            // @ts-ignore
            const stayed = await this.page.evaluate(() => window.__u61Stay === true);
            return {dialogs, stayed, posts};
        } finally {
            this.page.off('dialog', onDialog);
            this.page.off('request', onRequest);
        }
    }

    /** The page's text in `main`, for a before/after comparison. */
    async mainText() {
        await this.expectOpen();
        return this.main.innerText();
    }
}

// ---------------------------------------------------------------------------
// System Information
// ---------------------------------------------------------------------------

class SystemInfoPage extends AdminScreen {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {{configTitle: string}} labels the configuration table's title
     *   ("OJS Configuration", "OMP Configuration", "OPS Configuration")
     */
    constructor(page, {configTitle}) {
        super(page);
        this.configTitle = configTitle;
        this.currentVersion = this.main.locator('h2').first();
        this.sectionHeadings = this.main.locator('h2');
        this.checkForUpdates = this.main.getByRole('link', {name: 'Check for updates', exact: true});
        this.phpInfoLink = this.main.getByRole('link', {name: 'Extended PHP Information', exact: true});
        this.versionHistory = this.main.getByRole('table', {name: 'Version history', exact: true});
        this.serverInfo = this.main.getByRole('table', {name: 'Server Information', exact: true});
        this.configuration = this.main.getByRole('table', {name: configTitle, exact: true});
    }

    url() {
        return this.siteUrl('/en/admin/systemInfo');
    }

    async goto() {
        await this.page.goto(this.url());
        await this.expectOpen();
    }

    /** The heading, and the configuration table mounted with its rows. */
    async expectOpen() {
        await expect(this.heading).toHaveText('System Information', {timeout: T});
        await expect(this.configuration.locator('td.app--admin__systemInfoGroup').first()).toBeVisible({timeout: T});
        await expect(this.phpInfoLink).toBeVisible({timeout: T});
    }

    /** A table's column headers (their text as written; CSS shows capitals). */
    columns(table) {
        return table.getByRole('columnheader');
    }

    /**
     * A two-or-more-column table's body rows as arrays of cell texts.
     *
     * @param {import('@playwright/test').Locator} table
     * @returns {Promise<string[][]>}
     */
    async rows(table) {
        await expect(table.locator('tbody tr').first()).toBeVisible({timeout: T});
        return table.locator('tbody tr').evaluateAll((trs) =>
            trs.map((tr) => [...tr.querySelectorAll('td, th')].map((c) => (c.textContent || '').replace(/\s+/g, ' ').trim())),
        );
    }

    /**
     * The configuration table by section, in page order: each section's
     * name, whether its name cell is bold and spans the table, and its
     * settings as [name, value] pairs.
     *
     * @returns {Promise<{section: string, bold: boolean, spans: boolean, settings: [string, string][]}[]>}
     */
    async configSections() {
        await this.expectOpen();
        return this.configuration.locator('tbody').evaluateAll((bodies) =>
            bodies.map((body) => {
                const trs = [...body.querySelectorAll('tr')];
                const group = body.querySelector('td.app--admin__systemInfoGroup');
                const weight = group ? parseInt(getComputedStyle(group).fontWeight, 10) : 0;
                const text = (c) => (c.textContent || '').replace(/\s+/g, ' ').trim();
                return {
                    section: group ? text(group) : '',
                    bold: weight >= 600,
                    spans: group ? group.getAttribute('colspan') === '2' : false,
                    settings: trs
                        .filter((tr) => !tr.querySelector('td.app--admin__systemInfoGroup'))
                        .map((tr) => {
                            const cells = [...tr.querySelectorAll('td')];
                            return [text(cells[0]), cells[1] ? text(cells[1]) : ''];
                        }),
                };
            }),
        );
    }

    /**
     * "Extended PHP Information": the new tab it opens, loaded.
     *
     * @returns {Promise<import('@playwright/test').Page>}
     */
    async openPhpInfo() {
        const [tab] = await Promise.all([this.page.context().waitForEvent('page', {timeout: T}), this.phpInfoLink.click()]);
        await tab.waitForLoadState('load');
        return tab;
    }
}

// ---------------------------------------------------------------------------
// Jobs and Failed Jobs
// ---------------------------------------------------------------------------

class JobsListPage extends AdminScreen {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {{kind: 'queued'|'failed', op: string, title: string, heading: string, viewLink: string}} shape
     */
    constructor(page, shape) {
        super(page);
        this.shape = shape;
        this.table = this.main.getByRole('table', {name: shape.title, exact: true});
        this.bodyRows = this.table.locator('tbody tr');
        this.noItems = this.table.getByRole('row', {name: 'No Items', exact: true});
        this.pageLinks = this.main.getByRole('navigation', {name: 'View additional pages'});
        /** The last list the page loaded: {data, total, pagination}. */
        this.list = null;
    }

    url() {
        return this.siteUrl(`/en/admin/${this.shape.op}`);
    }

    /** Wait for a list load armed before the action that sends it. */
    async _settle(loaded) {
        const response = await loaded;
        expect(response.status(), `the list answers ${response.status()}`).toBe(200);
        this.list = await response.json();
        await expect(this.heading).toHaveText(this.shape.heading, {timeout: T});
        const ids = this.list.data.map((row) => String(row.id));
        if (ids.length) {
            await expect(this.row(ids[0])).toBeVisible({timeout: T});
        } else {
            await expect(this.noItems).toBeVisible({timeout: T});
        }
        return this.list;
    }

    _armList() {
        return this.page.waitForResponse((r) => isListLoad(r, this.shape.kind), {timeout: T});
    }

    /** Type the address (or reload) and wait for the first page's rows. */
    async goto() {
        const loaded = this._armList();
        await this.page.goto(this.url());
        return this._settle(loaded);
    }

    /** From Administration, its "View …" link. */
    async openFromAdministration() {
        const loaded = this._armList();
        await this.main.getByRole('link', {name: this.shape.viewLink, exact: true}).click();
        return this._settle(loaded);
    }

    /** Reload the page and wait for the first page's rows. */
    async reload() {
        const loaded = this._armList();
        await this.page.reload();
        return this._settle(loaded);
    }

    /** The column headers (their text as written; CSS shows capitals). */
    columns() {
        return this.table.getByRole('columnheader');
    }

    /** The line under the title ("There's a total of N …"). */
    async totalLine() {
        const id = await this.table.getAttribute('aria-describedby');
        return this.page.locator(`[id="${id}"]`);
    }

    /** The bold total inside that line. */
    async totalBold() {
        return (await this.totalLine()).locator('strong');
    }

    /** A row of the page shown, by its exact "ID". */
    row(id) {
        return this.bodyRows.filter({
            has: this.page.locator('td').first().filter({hasText: new RegExp(`^\\s*${id}\\s*$`)}),
        });
    }

    /** A row's cells. */
    cells(id) {
        return this.row(id).getByRole('cell');
    }

    /**
     * Show list page `n` through its page link and wait for its rows. The
     * links show page 1, the current page's neighbours and the last; a
     * farther page is reached with `nextPage()`.
     */
    async showPage(n) {
        const loaded = this._armList();
        await this.pageLinks.getByRole('button', {name: `Go to Page ${n}`, exact: true}).click();
        return this._settle(loaded);
    }

    /** The page links' "Next", and wait for that page's rows. */
    async nextPage() {
        const loaded = this._armList();
        await this.pageLinks.getByRole('button', {name: 'Next', exact: true}).click();
        return this._settle(loaded);
    }

    /**
     * Find a row by its "ID", going through the page links when the list
     * has more than one page; the row is on screen when this returns.
     * Null when no page holds it.
     *
     * @param {number|string} id
     */
    async findRow(id) {
        if (!this.list) {
            throw new Error('findRow before the list loaded');
        }
        const has = () => this.list.data.some((row) => String(row.id) === String(id));
        if (!has() && this.list.pagination.currentPage !== 1) {
            await this.showPage(1);
        }
        while (!has() && this.list.pagination.currentPage < this.list.pagination.lastPage) {
            await this.nextPage();
        }
        if (!has()) {
            return null;
        }
        await expect(this.row(id)).toBeVisible({timeout: T});
        return this.row(id);
    }

    /**
     * Every row of the list, all pages, as the page's list loads gave them
     * ({id, displayName, queue, attempts|connection, …}); leaves page 1
     * shown.
     */
    async allRows() {
        if (!this.list) {
            throw new Error('allRows before the list loaded');
        }
        if (this.list.pagination.currentPage !== 1) {
            await this.showPage(1);
        }
        const rows = [...this.list.data];
        while (this.list.pagination.currentPage < this.list.pagination.lastPage) {
            rows.push(...(await this.nextPage()).data);
        }
        if (this.list.pagination.currentPage !== 1) {
            await this.showPage(1);
        }
        return rows;
    }
}

class JobsPage extends JobsListPage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page, {kind: 'queued', op: 'jobs', title: 'View queued jobs', heading: 'Jobs', viewLink: 'View Jobs'});
    }
}

class FailedJobsPage extends JobsListPage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page, {kind: 'failed', op: 'failedJobs', title: 'View Failed Jobs', heading: 'Failed Jobs', viewLink: 'View Failed Jobs'});
        this.requeueAll = this.main.getByRole('button', {name: 'Requeue All Failed Jobs', exact: true});
        this.notices = page.locator('.pkpNotification');
        this.errorDialog = page.getByRole('dialog', {name: 'Error'});
    }

    /** A row's button ("Try Again", "Delete") or its "Details" link. */
    rowControl(id, name) {
        return name === 'Details'
            ? this.row(id).getByRole('link', {name: 'Details', exact: true})
            : this.row(id).getByRole('button', {name, exact: true});
    }

    /**
     * Press a row's "Try Again" or "Delete" (or, with no id, "Requeue All
     * Failed Jobs"); every browser box that opens is recorded and
     * dismissed. Returns the action's answer and the boxes' texts. Open
     * notices are closed first: they cover the rows under them.
     *
     * @param {number|string|null} id
     * @param {string} name
     */
    async pressAction(id, name) {
        await this.closeNotices();
        const dialogs = [];
        const onDialog = (dialog) => {
            dialogs.push(dialog.message());
            dialog.dismiss().catch(() => {});
        };
        this.page.on('dialog', onDialog);
        try {
            const answered = this.page.waitForResponse(isJobAction, {timeout: T});
            await (id === null ? this.requeueAll : this.rowControl(id, name)).click();
            const response = await answered;
            return {status: response.status(), body: await response.json().catch(() => null), dialogs};
        } finally {
            this.page.off('dialog', onDialog);
        }
    }

    /** "Requeue All Failed Jobs", then the reload of page 1 it makes. */
    async pressRequeueAll() {
        const reloaded = this._armList();
        const result = await this.pressAction(null, 'Requeue All Failed Jobs');
        await this._settle(reloaded);
        return result;
    }

    /** Close every open success notice. */
    async closeNotices() {
        const buttons = this.notices.getByRole('button', {name: 'Close'});
        while ((await buttons.count()) > 0) {
            await buttons.first().click();
        }
    }

    /** The newest notice. */
    notice() {
        return this.notices.last();
    }

    /**
     * The newest notice reads `text`, besides its close button ("×", and
     * "Close" for screen readers).
     *
     * @param {string} text
     */
    async expectNotice(text) {
        const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        await expect(this.notice()).toHaveText(new RegExp(`^\\s*${escaped}\\s*(×\\s*Close)?\\s*$`), {timeout: T});
    }

    /** A row's "Details", in the same tab. */
    async openDetails(id) {
        await this.rowControl(id, 'Details').click();
        const details = new FailedJobDetailsPage(this.page);
        await details.expectOpen(id);
        return details;
    }
}

// ---------------------------------------------------------------------------
// Failed Job Details
// ---------------------------------------------------------------------------

class FailedJobDetailsPage extends AdminScreen {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.table = this.main.locator('table').first();
    }

    url(id) {
        return this.siteUrl(`/en/admin/failedJobDetails/${id}`);
    }

    async goto(id) {
        await this.page.goto(this.url(id));
        await this.expectOpen(id);
    }

    async expectOpen(id) {
        await this.page.waitForURL(new RegExp(`/admin/failedJobDetails/${id}$`), {timeout: T, waitUntil: 'commit'});
        await expect(this.heading).toHaveText('Failed Job Details', {timeout: T});
        await expect(this.attributeRow('Exception')).toBeVisible({timeout: T});
    }

    /** The table by its title ("View Failed Job:{id} Details"). */
    titled(id) {
        return this.main.getByRole('table', {name: `View Failed Job:${id} Details`, exact: true});
    }

    /** A row by its "Attribute". */
    attributeRow(attribute) {
        return this.table.locator('tbody tr').filter({
            has: this.page.locator('td').first().filter({hasText: new RegExp(`^\\s*${attribute}\\s*$`)}),
        });
    }

    /** A row's "Attribute Value", as written (line breaks kept). */
    async value(attribute) {
        await expect(this.attributeRow(attribute)).toBeVisible({timeout: T});
        return this.attributeRow(attribute).locator('td').nth(1).evaluate((td) => td.textContent || '');
    }

    /** The attributes, top to bottom. */
    attributes() {
        return this.table.locator('tbody tr > td:first-child');
    }
}

module.exports = {
    AdminScreen,
    AdministrationPage,
    SystemInfoPage,
    JobsListPage,
    JobsPage,
    FailedJobsPage,
    FailedJobDetailsPage,
    isListLoad,
    isJobAction,
};
