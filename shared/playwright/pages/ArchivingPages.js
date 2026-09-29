// @ts-check
/**
 * @file shared/playwright/pages/ArchivingPages.js
 *
 * Page objects for U67 "Archiving & preservation"
 * (docs/specs/U67-archiving-preservation.md). The feature is a journal's
 * alone ({OJS}); the OMP and OPS suites run only the absence scenario and
 * read the press's and server's addresses with their own helpers, so the
 * words here are the journal's, English, as the templates print them
 * (the manifest pages are not localized on purpose, spec Rule 11).
 *
 * Surfaces:
 * - ArchivingSettings — Settings › Distribution › "Archiving" with its two
 *   side tabs, "PKP Preservation Network (PN)" and "LOCKSS and CLOCKSS":
 *   the boxes, the "Publisher Manifest" links (each opens a new browser
 *   tab), "Save" and "Saved". The Distribution page's address is
 *   SearchEngineMetadataPages' DistributionSettings.url().
 * - ManifestPage — a journal's LOCKSS or CLOCKSS page
 *   (`{journal}/gateway/lockss|clockss`): the year links, the "Archive of
 *   Published Issues: {year}" heading and its issue list, "Front Matter",
 *   the "Metadata" table and the closing lines.
 * - SiteManifestList — the site's list at `index.php/index/gateway/lockss`
 *   (`…/clockss`), one link per journal.
 * - expectJournalHome / expectLoginLanding — where an address lands
 *   instead of the page.
 *
 * DOM facts (U67 claim checks, `.reports/U67/screen-notes.md` ccK1, ccK2,
 * tojs; ojs `templates/gateway/{lockss,clockss}.tpl`, 2026-09-28):
 * - the top tab and the side tabs are `role=tab`; each side tab's panel is
 *   a `tabpanel` named after it; the PN panel is one ui-library form whose
 *   only field is an HTML field (`.pkpFormFieldLabel` then the text) and a
 *   hidden submit input no one can press;
 * - each box is an option of a `fieldset` whose legend is the network's
 *   name, so `getByRole('group', {name: 'LOCKSS'})`; the option label is a
 *   sentence holding the link "Publisher Manifest" (`target=_blank`);
 * - "Save" posts `contexts/{id}` (POST, `X-Http-Method-Override: PUT`) and
 *   shows "Saved" in the panel's `[role=status]`;
 * - the manifest page is `.page.lockss` / `.page.clockss` inside the
 *   frontend's `role=main` region; its first child is the year links'
 *   `p` (a link is `a.action`, plain text `span.disabled`); its headings
 *   are h3; the table is `table.data` of `td.label` / `td.value` rows;
 * - the site's list has the same root with one `ul` of journal links.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {DistributionSettings} = require('./SearchEngineMetadataPages.js');

const T = 30_000;

/** @typedef {'lockss' | 'clockss'} Network */

/** The words the screens print (English; the manifest's words are English in every language). */
const ARCHIVING_TEXT = {
    distributionHeading: 'Distribution Settings',
    archivingTab: 'Archiving',
    pnTab: 'PKP Preservation Network (PN)',
    lockssTab: 'LOCKSS and CLOCKSS',
    pnText:
        'The PKP Preservation Network (PN) provides free preservation services for any OJS journal that meets a few basic criteria. To archive your journal in the PN, ask your administrator to install the PKP|PN Plugin from the Plugin Gallery.',
    /** @param {Network} network */
    boxLabel: (network) =>
        `Enable ${network.toUpperCase()} to store and distribute journal content at participating libraries via a ${network.toUpperCase()} Publisher Manifest page.`,
    manifestLink: 'Publisher Manifest',
    save: 'Save',
    saved: 'Saved',
    /** @param {Network} network */
    pageTitle: (network) => `${network.toUpperCase()} Publisher Manifest`,
    archiveHeading: 'Archive of Published Issues',
    previous: '<< Previous',
    next: 'Next >>',
    yearLinks: '<< Previous | Next >>',
    frontMatter: 'Front Matter',
    frontMatterIntro: 'Front Matter associated with this Archival Unit includes:',
    frontMatterLinks: ['About the Journal', 'Submission Guidelines', 'Contact Information'],
    metadata: 'Metadata',
    metadataIntro: 'Metadata associated with this Archival Unit includes:',
    closing: {
        lockss: 'LOCKSS system has permission to collect, preserve, and serve this Archival Unit.',
        clockss: 'CLOCKSS system has permission to ingest, preserve, and serve this Archival Unit.',
    },
    lockssLogo: 'LOCKSS',
    lockssHref: 'https://www.lockss.org/',
    pkpLogo: 'The Public Knowledge Project',
    pkpHref: 'https://pkp.sfu.ca/',
    pkpLine: 'Open Journal Systems was developed by the Public Knowledge Project.',
};

/** Collapse runs of white space and trim. */
function flat(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

/** A regex matching `text` whole. */
function whole(text) {
    return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

// ---------------------------------------------------------------------------
// Settings › Distribution › "Archiving"
// ---------------------------------------------------------------------------

class ArchivingSettings extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page a signed-in page of someone who opens the Settings pages
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.distribution = new DistributionSettings(page, contextPath);
    }

    /** The Settings › Distribution address. */
    url() {
        return this.distribution.url();
    }

    /** The page's heading, "Distribution Settings". */
    heading() {
        return this.page.getByRole('heading', {level: 1, name: ARCHIVING_TEXT.distributionHeading, exact: true});
    }

    /** A top tab of Settings › Distribution by name. */
    topTab(name) {
        return this.page.getByRole('tab', {name, exact: true});
    }

    /** The top tabs' names, in page order (the page's first tab list). */
    async topTabNames() {
        const tabs = this.page.getByRole('tablist').first().getByRole('tab');
        await expect(tabs.first()).toBeVisible({timeout: T});
        return (await tabs.allInnerTexts()).map(flat);
    }

    /** The "Archiving" top tab. */
    archivingTab() {
        return this.topTab(ARCHIVING_TEXT.archivingTab);
    }

    /** The "Archiving" tab's panel. */
    archivingPanel() {
        return this.page.getByRole('tabpanel', {name: ARCHIVING_TEXT.archivingTab, exact: true});
    }

    /** A side tab of "Archiving" by name. */
    sideTab(name) {
        return this.archivingPanel().getByRole('tab', {name, exact: true});
    }

    /** The side tabs' names, in page order. */
    async sideTabNames() {
        const tabs = this.archivingPanel().getByRole('tab');
        await expect(tabs.first()).toBeVisible({timeout: T});
        return (await tabs.allInnerTexts()).map(flat);
    }

    /** The "PKP Preservation Network (PN)" side tab's panel. */
    pnPanel() {
        return this.page.getByRole('tabpanel', {name: ARCHIVING_TEXT.pnTab, exact: true});
    }

    /** The PN panel's heading (the HTML field's label). */
    pnHeading() {
        return this.pnPanel().locator('.pkpFormFieldLabel');
    }

    /** The PN panel's text under the heading. */
    pnDescription() {
        return this.pnPanel().locator('.pkpFormField__control--html');
    }

    /** The "LOCKSS and CLOCKSS" side tab's panel. */
    lockssPanel() {
        return this.page.getByRole('tabpanel', {name: ARCHIVING_TEXT.lockssTab, exact: true});
    }

    /**
     * Everything a person could press or type into inside a panel: buttons,
     * links, boxes, radios, text boxes and lists (role queries skip the
     * hidden submit input the forms carry).
     *
     * @param {import('@playwright/test').Locator} panel
     */
    pressables(panel) {
        return panel
            .getByRole('button')
            .or(panel.getByRole('link'))
            .or(panel.getByRole('checkbox'))
            .or(panel.getByRole('radio'))
            .or(panel.getByRole('textbox'))
            .or(panel.getByRole('combobox'));
    }

    /**
     * Open Settings › Distribution (leaving any page first: a hash-only
     * goto reloads nothing) and press the "Archiving" top tab; returns once
     * the PN side tab's panel is on screen.
     */
    async open() {
        await this.page.goto('about:blank');
        await this.page.goto(this.url());
        await expect(this.heading()).toBeVisible({timeout: T});
        await this.archivingTab().click();
        await expect(this.archivingTab()).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await expect(this.pnPanel()).toBeVisible({timeout: T});
    }

    /** Press the "LOCKSS and CLOCKSS" side tab; returns once its boxes and "Save" are on screen. */
    async openLockssSideTab() {
        await this.sideTab(ARCHIVING_TEXT.lockssTab).click();
        await expect(this.sideTab(ARCHIVING_TEXT.lockssTab)).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await expect(this.saveButton()).toBeVisible({timeout: T});
        await expect(this.box('lockss')).toBeVisible({timeout: T});
    }

    /** The group of one network's box: its legend ("LOCKSS", "CLOCKSS") and the box. */
    group(/** @type {Network} */ network) {
        return this.lockssPanel().getByRole('group', {name: network.toUpperCase(), exact: true});
    }

    /** The groups' legends, in page order. */
    legends() {
        return this.lockssPanel().locator('legend');
    }

    /** One network's box, by its sentence, inside its group. */
    box(/** @type {Network} */ network) {
        return this.group(network).getByRole('checkbox', {name: ARCHIVING_TEXT.boxLabel(network), exact: true});
    }

    /** The "Publisher Manifest" link in one box's sentence. */
    manifestLink(/** @type {Network} */ network) {
        return this.group(network).getByRole('link', {name: ARCHIVING_TEXT.manifestLink, exact: true});
    }

    /**
     * Press "Publisher Manifest" in one box's sentence; returns the new
     * browser tab it opens, loaded.
     *
     * @param {Network} network
     * @returns {Promise<import('@playwright/test').Page>}
     */
    async pressManifestLink(network) {
        const [popup] = await Promise.all([
            this.page.context().waitForEvent('page', {timeout: T}),
            this.manifestLink(network).click(),
        ]);
        await popup.waitForLoadState('domcontentloaded');
        return popup;
    }

    /** The tab's "Save". */
    saveButton() {
        return this.lockssPanel().getByRole('button', {name: ARCHIVING_TEXT.save, exact: true});
    }

    /** "Saved" beside the button. */
    savedStatus() {
        return this.lockssPanel().locator('[role="status"]').filter({hasText: ARCHIVING_TEXT.saved});
    }

    /**
     * Press "Save": bounded by the save's answer, then "Saved" beside the
     * button. Returns the answer's status.
     */
    async save() {
        const answered = this.page.waitForResponse(
            (r) => /\/api\/v1\/contexts\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.saveButton().click();
        const response = await answered;
        await expect(this.savedStatus()).toBeVisible({timeout: T});
        return response.status();
    }

    /** Tick or untick one box and "Save"; returns the save's status. */
    async setAndSave(/** @type {Network} */ network, /** @type {boolean} */ on) {
        await this.box(network).setChecked(on);
        return this.save();
    }
}

// ---------------------------------------------------------------------------
// A journal's LOCKSS or CLOCKSS page
// ---------------------------------------------------------------------------

class ManifestPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {Network} [network]
     */
    constructor(page, contextPath, network = 'lockss') {
        super(page);
        this.contextPath = contextPath;
        this.network = network;
    }

    /**
     * The page's address: `{journal}[/{locale}]/gateway/{network}[?year=…]`.
     *
     * @param {{locale?: string, year?: string | number}} [options]
     */
    path({locale = '', year} = {}) {
        const query = year === undefined ? '' : `?year=${encodeURIComponent(String(year))}`;
        return this.contextUrl(this.contextPath, `${locale ? `/${locale}` : ''}/gateway/${this.network}${query}`);
    }

    /** Open the address; returns the navigation's answer. */
    async goto(options = {}) {
        return this.page.goto(this.path(options));
    }

    /** The page's own part (`.page.lockss` / `.page.clockss`). */
    root() {
        return this.page.locator(`.page.${this.network}`);
    }

    /** The frontend's main region, which holds the page. */
    main() {
        return this.page.getByRole('main');
    }

    /** The journal's header. */
    banner() {
        return this.page.getByRole('banner');
    }

    /** The journal's footer. */
    footer() {
        return this.page.getByRole('contentinfo');
    }

    /** The first element of the page's own part (the year links on a journal's page). */
    firstPart() {
        return this.root().locator(':scope > *').first();
    }

    /** The year links' line ("<< Previous | Next >>"). */
    yearLinks() {
        return this.root().locator(':scope > p').filter({hasText: 'Previous'}).first();
    }

    /** "<< Previous" or "Next >>" as a link. */
    yearLink(/** @type {'previous' | 'next'} */ which) {
        return this.yearLinks().getByRole('link', {name: ARCHIVING_TEXT[which], exact: true});
    }

    /** "<< Previous" or "Next >>" as plain text, not a link. */
    yearPlain(/** @type {'previous' | 'next'} */ which) {
        return this.yearLinks().locator('span.disabled').filter({hasText: whole(ARCHIVING_TEXT[which])});
    }

    /** The "Archive of Published Issues: {year}" heading. */
    archiveHeading() {
        return this.root().locator('h3').filter({hasText: /^\s*Archive of Published Issues/});
    }

    /** The issue list's items under that heading. */
    issueItems() {
        return this.archiveHeading().locator('xpath=following-sibling::ul[1]').locator('li');
    }

    /** The issue list's links. */
    issueLinks() {
        return this.archiveHeading().locator('xpath=following-sibling::ul[1]').getByRole('link');
    }

    /** The issue list's names, sorted (the page's order is the database's). */
    async issueNames() {
        return (await this.issueLinks().allInnerTexts()).map(flat).sort();
    }

    /** Wait for the heading to read "Archive of Published Issues: {year}" (`year` '' for none). */
    async expectYear(year) {
        await expect(this.archiveHeading()).toHaveText(whole(`${ARCHIVING_TEXT.archiveHeading}: ${year}`.trim()), {
            timeout: T,
        });
    }

    /** One of the page's h3 headings by its exact text ("Front Matter", "Metadata"). */
    sectionHeading(name) {
        return this.root().locator('h3').filter({hasText: whole(name)});
    }

    /** The line under a section heading. */
    sectionIntro(name) {
        return this.sectionHeading(name).locator('xpath=following-sibling::p[1]');
    }

    /** The "Front Matter" links. */
    frontMatterLinks() {
        return this.sectionHeading(ARCHIVING_TEXT.frontMatter).locator('xpath=following-sibling::ul[1]').getByRole('link');
    }

    /** The "Metadata" table. */
    table() {
        return this.root().locator('table.data');
    }

    /** The table's row labels, in order (`td.label`). */
    rowLabelCells() {
        return this.table().locator('td.label');
    }

    /** The table's row labels, in order; read once the table is on screen. */
    async rowLabels() {
        await expect(this.table()).toBeVisible({timeout: T});
        return (await this.rowLabelCells().allInnerTexts()).map(flat);
    }

    /** One row by its label. */
    row(label) {
        return this.table().locator('tr').filter({has: this.page.locator('td.label', {hasText: whole(label)})});
    }

    /** One row's value cell by its label. */
    rowValue(label) {
        return this.row(label).locator('td.value');
    }

    /** One row's value, one entry per line (the "Language(s)" row's `<br>`s). */
    async rowLines(label) {
        await expect(this.rowValue(label)).toBeVisible({timeout: T});
        return (await this.rowValue(label).innerText())
            .split('\n')
            .map(flat)
            .filter(Boolean);
    }

    /** Every row as [label, value] pairs, in order. */
    async rows() {
        await expect(this.table()).toBeVisible({timeout: T});
        return this.table()
            .locator('tr')
            .evaluateAll((trs) =>
                trs.map((tr) =>
                    Array.from(tr.querySelectorAll('td')).map((td) => (td.innerText || '').replace(/\s+/g, ' ').trim())
                )
            );
    }

    /** The LOCKSS logo's link (to lockss.org), by the image's text. */
    lockssLogo() {
        return this.root().getByRole('link', {name: ARCHIVING_TEXT.lockssLogo, exact: true});
    }

    /** The PKP logo's link (to pkp.sfu.ca). */
    pkpLogo() {
        return this.root().getByRole('link', {name: ARCHIVING_TEXT.pkpLogo, exact: true});
    }

    /** A closing line of the page, by its text. */
    closingLine(text) {
        return this.root().locator('p').filter({hasText: whole(text)});
    }

    /** The page's own text, flattened (for reading the order of its parts). */
    async text() {
        await expect(this.root()).toBeVisible({timeout: T});
        return flat(await this.root().innerText());
    }
}

// ---------------------------------------------------------------------------
// The site's LOCKSS or CLOCKSS list
// ---------------------------------------------------------------------------

class SiteManifestList extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {Network} [network]
     */
    constructor(page, network = 'lockss') {
        super(page);
        this.network = network;
    }

    /** `index.php/index/gateway/{network}` (it redirects to the site's language). */
    path() {
        return this.siteUrl(`/gateway/${this.network}`);
    }

    /** Open the list; returns once its heading is on screen. */
    async goto() {
        await this.page.goto(this.path());
        await expect(this.heading()).toBeVisible({timeout: T});
    }

    root() {
        return this.page.locator(`.page.${this.network}`);
    }

    /** The heading "Archive of Published Issues". */
    heading() {
        return this.root().locator('h3').filter({hasText: whole(ARCHIVING_TEXT.archiveHeading)});
    }

    /** Every journal link of the list. */
    links() {
        return this.root().locator('ul').first().getByRole('link');
    }

    /**
     * One journal's link, by the journal's address: the list is the whole
     * install's, other runs' journals of the same name included.
     */
    journalLink(contextPath) {
        return this.root()
            .locator('ul')
            .first()
            .locator(`a[href*="/index.php/${contextPath}/"][href$="/gateway/${this.network}"]`);
    }
}

// ---------------------------------------------------------------------------
// Where an address lands instead
// ---------------------------------------------------------------------------

/**
 * The page shows the journal's home page, with no message, and no
 * manifest (the home page's own part read beside the missing one).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} contextPath
 */
async function expectJournalHome(page, contextPath) {
    await expect(page).toHaveURL(new RegExp(`/index\\.php/${contextPath}(/[a-z]{2}(_[A-Z]{2})?)?(/index)?$`), {timeout: T});
    await expect(page.locator('.page_index_journal')).toBeAttached({timeout: T});
    await expect(page.locator('.page.lockss, .page.clockss')).toHaveCount(0);
    await expect(page.locator('.cmp_notification, .pkp_notification')).toHaveCount(0);
}

/**
 * The page shows the journal's Login page: its address and its "Login"
 * heading, the username box there, and no manifest.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} contextPath
 */
async function expectLoginLanding(page, contextPath) {
    await expect(page).toHaveURL(new RegExp(`/index\\.php/${contextPath}(/[a-z]{2}(_[A-Z]{2})?)?/login(\\?|$)`), {
        timeout: T,
    });
    await expect(page.getByRole('heading', {level: 1})).toHaveText(whole('Login'));
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('.page.lockss, .page.clockss')).toHaveCount(0);
}

module.exports = {
    ARCHIVING_TEXT,
    flat,
    ArchivingSettings,
    ManifestPage,
    SiteManifestList,
    expectJournalHome,
    expectLoginLanding,
};
