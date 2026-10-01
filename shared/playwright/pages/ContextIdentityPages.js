/**
 * @file shared/playwright/pages/ContextIdentityPages.js
 *
 * Page objects for U07 "Journal identity & about pages"
 * (docs/specs/U07-journal-identity-and-about-pages.md), shared by the OJS,
 * OMP and OPS suites. App-neutral: every on-screen word that differs per
 * app (the page headings, "Journal Title" / "Press Name", the role names)
 * is passed in by the suite; the locators here are the markup the three
 * apps share (lib/pkp templates and the ui-library forms).
 *
 * Surfaces:
 * - AboutPages — the reader's side: the header's "About" menu, the About
 *   pages ("About the Journal", "Editorial Masthead", "Editorial History",
 *   "Contact", "Privacy Statement", the Information pages, the page about
 *   the publishing software), their breadcrumb, heading and "Edit" link,
 *   the masthead and history lists, the Contact blocks, the sidebar's
 *   Information block and the site's list of journals.
 * - SettingsPages — the five Settings pages: addresses, headings, tab rows,
 *   the notice above the tabs, the side menu's "Settings" group and the
 *   access-denied page.
 * - SettingsForm — one Vue settings tab's form (Settings › Journal ›
 *   "Masthead" / "Contact", Settings › Website › "Setup" › "Information" /
 *   "Privacy Statement", Settings › Workflow › "Submission" › "Disable
 *   Submissions"): its boxes, rich-text boxes, "Save", "Saved", the error
 *   summary with its "Go to" buttons and "Jump to next error".
 * - RolesTab — Settings › Users & Roles › "Roles": a role's "Edit" window
 *   and its "Role Options" boxes.
 *
 * DOM shapes confirmed against the running apps by the U07 claim check
 * (.reports/U07/screen-notes.md, the kept scripts under
 * shared/playwright/checks/U07/) and while the OJS suite was built,
 * 2026-09-23.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {waitForJQueryIdle} = require('../support/legacy.js');

const T = 30_000;

/** Select-all on the platform's key (TinyMCE ignores the other modifier). */
const SELECT_ALL = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';

/** The sentence of the access-denied page every refused Settings address shows. */
const ACCESS_DENIED = 'The current role does not have access to this operation.';
exports.ACCESS_DENIED = ACCESS_DENIED;

/** Escape a string for a RegExp. */
function esc(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A whole-text matcher that tolerates the templates' surrounding whitespace. */
function whole(text) {
    return new RegExp(`^\\s*${esc(text)}\\s*$`);
}
exports.whole = whole;

// ---------------------------------------------------------------------------
// The reader's side
// ---------------------------------------------------------------------------

/** The About pages by key, and the address each opens at (after the context path). */
const ABOUT_PATHS = {
    about: '/about',
    masthead: '/about/editorialMasthead',
    history: '/about/editorialHistory',
    contact: '/about/contact',
    privacy: '/about/privacy',
    software: '/about/aboutThisPublishingSystem',
    submissions: '/about/submissions',
    readers: '/information/readers',
    authors: '/information/authors',
    librarians: '/information/librarians',
};
exports.ABOUT_PATHS = ABOUT_PATHS;

exports.AboutPages = class AboutPages extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath the journal's path, or 'index' for the site
     * @param {{locale?: string}} [options] a locale segment ('en') for a
     *   multilingual context's prefixed addresses; none on a one-language
     *   scratch context (patterns.md, parallel lesson 9)
     */
    constructor(page, contextPath, {locale = ''} = {}) {
        super(page);
        this.contextPath = contextPath;
        this.locale = locale;
        this.main = page.locator('.pkp_structure_main');
        this.heading = this.main.locator('h1');
        this.breadcrumb = this.main.locator('nav.cmp_breadcrumbs');
        this.pageBody = this.main.locator('.page').first();
        // The "Edit" link of Rule 21: the words "Edit" plus a screen-reader
        // span "Edit {page name}".
        this.editLink = this.main.locator('a.cmp_edit_link');
        this.headerTitle = page.locator('.pkp_site_name');
        this.primaryNav = page.locator('#navigationPrimary');
        this.aboutToggle = this.primaryNav.locator('> li > a[data-toggle="dropdown"]').filter({hasText: whole('About')});
        this.aboutItems = this.aboutToggle.locator('xpath=following-sibling::ul[1]').locator('> li > a');
        this.footerLogoLink = page.locator('.pkp_brand_footer a').filter({has: page.locator('img')});
        this.infoBlock = page.locator('.pkp_structure_sidebar .block_information');
        this.infoBlockHeading = this.infoBlock.locator('h2');
        this.infoBlockLinks = this.infoBlock.locator('a');
    }

    /** The address of an About page (key of ABOUT_PATHS), relative to the base URL. */
    url(which) {
        const prefix = this.locale ? `/${this.locale}` : '';
        return this.contextUrl(this.contextPath, `${prefix}${ABOUT_PATHS[which]}`);
    }

    /** The journal's home page address. */
    homeUrl() {
        return this.contextUrl(this.contextPath, this.locale ? `/${this.locale}` : '');
    }

    /** Open an About page by address and wait for its heading; returns the response. */
    async goto(which) {
        const response = await this.page.goto(this.url(which));
        await expect(this.heading).toBeVisible({timeout: T});
        return response;
    }

    /** Open the journal's home page and wait for the main region. */
    async gotoHome() {
        const response = await this.page.goto(this.homeUrl());
        await expect(this.main).toBeVisible({timeout: T});
        return response;
    }

    /**
     * The breadcrumb's entries as read ("Home", "About the Journal"),
     * without the separators.
     */
    async breadcrumbTrail() {
        await expect(this.breadcrumb).toBeVisible({timeout: T});
        const items = await this.breadcrumb.locator('li').evaluateAll((lis) =>
            lis.map((li) => {
                const clone = li.cloneNode(true);
                clone.querySelectorAll('.separator').forEach((s) => s.remove());
                return clone.textContent.replace(/\s+/g, ' ').trim();
            })
        );
        return items;
    }

    /**
     * The text of the page body after the breadcrumb, whitespace-collapsed
     * (the heading included).
     */
    async bodyText() {
        return this.pageBody.evaluate((page) => {
            const clone = page.cloneNode(true);
            clone.querySelectorAll('nav.cmp_breadcrumbs, script').forEach((n) => n.remove());
            return clone.textContent.replace(/\s+/g, ' ').trim();
        });
    }

    /** Open the header's "About" menu; waits for its first item to show. */
    async openAboutMenu() {
        await expect(this.aboutToggle).toBeVisible({timeout: T});
        // A second press would close it again.
        if (!(await this.aboutItems.first().isVisible())) {
            await this.aboutToggle.click();
        }
        await expect(this.aboutItems.first()).toBeVisible({timeout: T});
    }

    /** An item of the header's "About" menu by its exact label. */
    aboutItem(label) {
        return this.aboutItems.filter({hasText: whole(label)});
    }

    /** Choose an item of the header's "About" menu and wait for the page's heading. */
    async chooseFromAboutMenu(label) {
        await this.openAboutMenu();
        await this.aboutItem(label).click();
        await expect(this.heading).toBeVisible({timeout: T});
    }

    // --- "Editorial Masthead" and "Editorial History" ---------------------

    /** Every level-2 heading of the masthead or history page, in page order. */
    listHeadings() {
        return this.main.locator('.page_masthead > h2');
    }

    /** The level-2 heading of a role (or of the peer reviewers). */
    listHeading(name) {
        return this.listHeadings().filter({hasText: whole(name)});
    }

    /** The entries (`li`) of the list under a heading. */
    listEntries(name) {
        return this.listHeading(name).locator('xpath=following-sibling::ul[1]').locator('> li');
    }

    /** The entry under a heading whose name reads `name`. */
    listEntry(heading, name) {
        return this.listEntries(heading).filter({has: this.page.locator('.name', {hasText: name})});
    }

    /** The parts of one entry (Rule 14c). */
    entryParts(entry) {
        return {
            dateStart: entry.locator('.date_start'),
            name: entry.locator('.name'),
            orcidLink: entry.locator('.orcid a'),
            affiliation: entry.locator('.affiliation'),
            pictures: entry.locator('img, svg:not(.orcid_icon)'),
            emailLinks: entry.locator('a[href^="mailto:"]'),
        };
    }

    /** The names listed under a heading, in page order (without the ORCID words). */
    async listNames(heading) {
        return this.listEntries(heading).locator('.name').evaluateAll((names) =>
            names.map((n) => {
                const clone = n.cloneNode(true);
                clone.querySelectorAll('.orcid').forEach((o) => o.remove());
                return clone.textContent.replace(/\s+/g, ' ').trim();
            })
        );
    }

    /** The masthead's "View Editorial History" line (Rule 14d). */
    historyLine() {
        return this.main.locator('.page_masthead > p').filter({has: this.page.locator('a')}).filter({hasText: /View/});
    }

    /** The link words "Editorial History" of that line. */
    historyLink() {
        return this.historyLine().getByRole('link', {name: 'Editorial History', exact: true});
    }

    /** The horizontal rule after the history line. */
    rule() {
        return this.main.locator('.page_masthead > hr');
    }

    /** A paragraph of the masthead or history page by its text. */
    paragraph(text) {
        return this.main.locator('.page_masthead > p').filter({hasText: text});
    }

    // --- "Contact" ----------------------------------------------------------

    /** The "Mailing Address" block at the top of the Contact page. */
    contactAddress() {
        return this.main.locator('.page_contact .address');
    }

    /** The "Principal Contact" block (`primary`) or the "Support Contact" block (`support`). */
    contactBlock(which) {
        const block = this.main.locator(`.page_contact .contact.${which}`);
        return {
            block,
            heading: block.locator('h2'),
            name: block.locator('.name'),
            affiliation: block.locator('.affiliation'),
            phoneLabel: block.locator('.phone .label'),
            phoneValue: block.locator('.phone .value'),
            emailLink: block.locator('.email a[href^="mailto:"]'),
        };
    }

    // --- The page about the publishing software -----------------------------

    /** The software page's one paragraph. */
    softwareParagraph() {
        return this.pageBody.locator('p').first();
    }

    // --- The site's own list of journals ------------------------------------

    /** The site index's entry title for a context, found by its path. */
    siteListEntry(contextPath) {
        return this.page.locator(`.page_index_site .journals h3 a[href$="/index.php/${contextPath}"]`);
    }
};

// ---------------------------------------------------------------------------
// The Settings pages
// ---------------------------------------------------------------------------

/** The five Settings pages by key: the address segment after `management/settings/`. */
const SETTINGS_SLUGS = {
    journal: 'context',
    website: 'website',
    workflow: 'workflow',
    distribution: 'distribution',
    usersRoles: 'access',
};
exports.SETTINGS_SLUGS = SETTINGS_SLUGS;

exports.SettingsPages = class SettingsPages extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     * @param {{locale?: string}} [options]
     */
    constructor(page, contextPath, {locale = ''} = {}) {
        super(page);
        this.contextPath = contextPath;
        this.locale = locale;
        this.mainRegion = page.getByRole('main');
        this.heading = page.locator('main h1').first();
        this.topTabs = this.mainRegion.getByRole('tablist').first().getByRole('tab');
        this.deniedMessage = page.getByText(ACCESS_DENIED, {exact: true});
        this.nav = page.getByRole('navigation', {name: 'Site Navigation'});
        this.settingsGroupHeader = this.nav.locator('[role="button"][aria-label="Settings"]');
        this.loginForm = page.locator('form#login');
    }

    /** A Settings page's address (key of SETTINGS_SLUGS), optionally with a tab hash. */
    url(which, hash = '') {
        const prefix = this.locale ? `/${this.locale}` : '';
        return this.contextUrl(this.contextPath, `${prefix}/management/settings/${SETTINGS_SLUGS[which]}${hash}`);
    }

    /** Open a Settings page and wait for its tab row. */
    async goto(which, hash = '') {
        await this.page.goto(this.url(which, hash));
        await expect(this.topTabs.first()).toBeVisible({timeout: T});
    }

    /** Open a Settings page expecting the access-denied page. */
    async gotoExpectingDenied(which) {
        await this.page.goto(this.url(which));
        await expect(this.deniedMessage).toBeVisible({timeout: T});
    }

    /** Open a Settings page signed out, expecting the Login page. */
    async gotoExpectingLogin(which) {
        await this.page.goto(this.url(which));
        await expect(this.loginForm).toBeVisible({timeout: T});
    }

    /** The top tabs' names, in page order. */
    async topTabNames() {
        await expect(this.topTabs.first()).toBeVisible({timeout: T});
        return (await this.topTabs.allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
    }

    /** A notice above the tabs by its sentence. */
    notice(text) {
        return this.mainRegion.getByText(text, {exact: true});
    }

    /**
     * The side menu's "Settings" group entries, read from the DOM whether
     * the group is open or closed (patterns.md, locator pitfall 2).
     */
    async settingsGroupItems() {
        await expect(this.nav).toBeVisible({timeout: T});
        return this.settingsGroupHeader.first().evaluate((header) => {
            const region = document.getElementById(header.getAttribute('aria-controls') || '');
            return region
                ? [...region.querySelectorAll('[role="treeitem"]')].map((li) =>
                      (li.getAttribute('aria-label') || li.textContent).replace(/\s+/g, ' ').trim()
                  )
                : [];
        });
    }

    /** Press an entry of the side menu's "Settings" group, opening the group first. */
    async openSettingsEntry(label) {
        const header = this.settingsGroupHeader.first();
        await expect(header).toBeVisible({timeout: T});
        if ((await header.getAttribute('aria-expanded')) !== 'true') {
            await header.click();
            await expect(header).toHaveAttribute('aria-expanded', 'true');
        }
        const region = this.page.locator(`[id="${await header.getAttribute('aria-controls')}"]`);
        await region.getByRole('link', {name: label, exact: true}).click();
        await expect(this.topTabs.first()).toBeVisible({timeout: T});
    }

    /** A top tab by name. */
    tab(name) {
        return this.mainRegion.getByRole('tab', {name, exact: true}).first();
    }

    /** The selected side tab of the open top tab. */
    selectedSideTab(topPanelName) {
        return this.mainRegion
            .getByRole('tabpanel', {name: topPanelName, exact: true})
            .getByRole('tab', {selected: true});
    }

    // --- The forms ------------------------------------------------------------

    /** Settings › Journal › "Masthead". */
    mastheadForm() {
        return new SettingsForm(this.page, '[id^="masthead-name-control"]');
    }

    /** Settings › Journal › "Contact". */
    contactForm() {
        return new SettingsForm(this.page, '#contact-contactName-control');
    }

    /** Settings › Website › "Setup" › "Information". */
    informationForm() {
        return new SettingsForm(this.page, '[id^="information-readerInformation-control"]');
    }

    /** Settings › Website › "Setup" › "Privacy Statement". */
    privacyForm() {
        return new SettingsForm(this.page, '[id^="privacy-privacyStatement-control"]');
    }

    /** Settings › Workflow › "Submission" › "Disable Submissions". */
    disableSubmissionsForm() {
        return new SettingsForm(this.page, 'input[name="disableSubmissions"]');
    }

    /** Open Settings › Journal on a top tab ("Masthead", "Contact") and return its form. */
    async openJournalTab(tabName) {
        await this.goto('journal');
        const tab = this.tab(tabName);
        if ((await tab.getAttribute('aria-selected')) !== 'true') {
            await tab.click();
        }
        const form = tabName === 'Contact' ? this.contactForm() : this.mastheadForm();
        await form.ready();
        return form;
    }

    /**
     * Open a Settings › Website › "Setup" side tab by the address naming
     * both tabs (Rule 1: `#setup/information`, `#setup/privacy`) and return
     * its form.
     */
    async openWebsiteSetupTab(sideId) {
        await this.page.goto(this.url('website', `#setup/${sideId}`));
        const form = sideId === 'information' ? this.informationForm() : this.privacyForm();
        await form.ready();
        return form;
    }

    /** Open Settings › Workflow › "Submission" › "Disable Submissions" and return its form. */
    async openDisableSubmissions() {
        await this.page.goto(this.url('workflow', '#submission'));
        await expect(this.topTabs.first()).toBeVisible({timeout: T});
        const side = this.mainRegion.getByRole('tab', {name: 'Disable Submissions', exact: true});
        await expect(side).toBeVisible({timeout: T});
        if ((await side.getAttribute('aria-selected')) !== 'true') {
            await side.click();
        }
        const form = this.disableSubmissionsForm();
        await form.ready();
        return form;
    }
};

/**
 * One Vue settings form, found by a field it holds.
 */
class SettingsForm extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} anchor a CSS selector of a control inside the form
     */
    constructor(page, anchor) {
        super(page);
        this.anchor = anchor;
        this.form = page.locator('form').filter({has: page.locator(anchor)}).first();
        this.saveButton = this.form.getByRole('button', {name: 'Save', exact: true});
        this.savedStatus = this.form.locator('.pkpFormPage__status', {hasText: 'Saved'});
        this.errorSummary = this.form.locator('.pkpFormErrors');
        this.jumpToErrorButton = this.form.getByRole('button', {name: 'Jump to next error'});
    }

    /**
     * Wait until the form shows and its rich-text boxes are initialized.
     * A rich-text box's editor is created after its textarea is drawn, so
     * the box counts as ready only once its editor exists and is
     * initialized; a plain textarea (no rich-text field around it) has none
     * (.reports/flake-s26/fixC/diagnosis.md).
     */
    async ready() {
        await expect(this.form).toBeVisible({timeout: T});
        await this.page.waitForFunction(
            (selector) => {
                const form = [...document.querySelectorAll('form')].find((f) => f.querySelector(selector));
                if (!form) return false;
                const areas = [...form.querySelectorAll('.pkpFormField--richTextarea textarea[id]')];
                if (!areas.length) return true;
                if (!window.tinymce) return false;
                return areas.every((a) => {
                    const ed = window.tinymce.get(a.id);
                    return !!ed && ed.initialized;
                });
            },
            this.anchor,
            {timeout: T}
        );
    }

    /** A control of the form by id (or id prefix for a per-language box: 'masthead-name-control'). */
    control(idOrPrefix) {
        return this.form.locator(`[id="${idOrPrefix}"], [id^="${idOrPrefix}-"]`).first();
    }

    /** The red reason under a control (empty while none). */
    fieldError(idOrPrefix) {
        return this.control(idOrPrefix)
            .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " pkpFormField ")][1]')
            .locator('.pkpFieldError');
    }

    /** A "Go to {label}: {message}" button of the error summary (screen-reader list). */
    goToButton(name) {
        return this.errorSummary.getByRole('button', {name, exact: true});
    }

    /** Every "Go to …" button of the error summary. */
    goToButtons() {
        return this.errorSummary.locator('ul button');
    }

    /** A group of the form by its heading ("Descriptions"). */
    group(name) {
        return this.form.getByRole('group', {name, exact: true});
    }

    /** The editable body of a rich-text box by its textarea id (or id prefix). */
    richBody(idOrPrefix) {
        return this.form.locator(`iframe[id^="${idOrPrefix}"]`).first().contentFrame().locator('body');
    }

    /**
     * A rich-text box's content as the editor holds it (HTML), read once
     * the box's editor exists and is initialized (before that there is no
     * editor to read: null).
     */
    async richContent(idOrPrefix) {
        await this.page.waitForFunction(
            (prefix) => {
                const ed = ((window.tinymce && window.tinymce.get()) || []).find((e) => e.id === prefix || e.id.startsWith(`${prefix}-`));
                return !!ed && ed.initialized;
            },
            idOrPrefix,
            {timeout: T}
        );
        return this.page.evaluate((prefix) => {
            const ed = (window.tinymce.get() || []).find((e) => e.id === prefix || e.id.startsWith(`${prefix}-`));
            return ed ? ed.getContent() : null;
        }, idOrPrefix);
    }

    /** Replace a rich-text box's content by typing; an empty text empties it. */
    async typeRich(idOrPrefix, text) {
        const body = this.richBody(idOrPrefix);
        await body.click();
        await this.page.keyboard.press(SELECT_ALL);
        await this.page.keyboard.press('Delete');
        if (text) {
            await body.pressSequentially(text);
        }
        await expect.poll(async () => (await this.richContent(idOrPrefix)) || '').toContain(text ? text.split('\n')[0] : '');
        if (!text) {
            await expect.poll(async () => ((await this.richContent(idOrPrefix)) || '').replace(/<[^>]+>|&nbsp;|\s/g, '')).toBe('');
        }
    }

    /**
     * Press "Save" and wait for the settings request's answer (a POST with
     * the PUT override to `api/v1/contexts/{id}`); returns the response.
     */
    async pressSave() {
        const answered = this.page.waitForResponse(
            (r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() === 'POST',
            {timeout: T}
        );
        await this.saveButton.click();
        return answered;
    }

    /** Press "Save" and wait for "Saved" beside the button. */
    async save() {
        const response = await this.pressSave();
        expect(response.status(), 'the settings save answers 200').toBe(200);
        await expect(this.savedStatus).toBeVisible({timeout: T});
        return response;
    }
}
exports.SettingsForm = SettingsForm;

// ---------------------------------------------------------------------------
// Settings › Users & Roles › "Roles"
// ---------------------------------------------------------------------------

exports.RolesTab = class RolesTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.roleWindow = page.locator('form#userGroupForm');
        this.okButton = this.roleWindow.getByRole('button', {name: 'OK', exact: true});
    }

    /**
     * Open Users & Roles on its "Roles" tab. The address carries no hash, so
     * the page really loads even when it is already open on `#roles`
     * (patterns.md, locator pitfall 17): after a window's "OK" the grid
     * redraws the saved role's row without its "Settings" link.
     */
    async goto() {
        await this.page.goto(this.contextUrl(this.contextPath, '/management/settings/access'));
        const tab = this.page.getByRole('tab', {name: 'Roles', exact: true});
        await expect(tab).toBeVisible({timeout: T});
        if ((await tab.getAttribute('aria-selected')) !== 'true') {
            await tab.click();
        }
        await expect(this.roleRow('Author')).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** A role's row of the grid (its first cell reads "Settings {role}"). */
    roleRow(name) {
        return this.page.getByRole('row', {name: new RegExp(`^Settings ${esc(name)}\\b`)});
    }

    /** Open a role's "Edit" window (the row's controls sit in the next row). */
    async openRoleWindow(name) {
        const row = this.roleRow(name).first();
        await row.locator('a.show_extras').click();
        const controls = row.locator('xpath=following-sibling::tr[1]');
        await controls.getByRole('link', {name: 'Edit', exact: true}).click();
        await expect(this.roleWindow).toBeVisible({timeout: T});
        await waitForJQueryIdle(this.page);
    }

    /** A "Role Options" box of the open window by its label. */
    box(label) {
        return this.roleWindow.getByRole('checkbox', {name: label, exact: true});
    }

    /** Set a box of a role's window and save the window with "OK". */
    async setRoleBox(roleName, label, checked) {
        await this.goto();
        await this.openRoleWindow(roleName);
        await this.box(label).setChecked(checked);
        await expect(this.box(label)).toBeChecked({checked});
        const saved = this.page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: T});
        await this.okButton.click();
        expect((await saved).status()).toBe(200);
        await expect(this.roleWindow).toHaveCount(0, {timeout: T});
        await waitForJQueryIdle(this.page);
    }
};
