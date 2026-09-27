// @ts-check
/**
 * @file shared/playwright/pages/SiteSettingsPages.js
 *
 * Page objects for U60 "Site settings" (docs/specs/U60-site-settings.md),
 * shared by the OJS, OMP and OPS suites. App-neutral (PRINCIPLES M2): every
 * word that differs per app (the redirect's label "Journal redirect" /
 * "Press redirect" / "Server redirect", "Hosted Journals", the
 * application's name) is passed in by the suite; the locators are the
 * markup the three apps share (one lib/pkp and ui-library code path).
 *
 * Surfaces:
 * - SiteSettingsPage — Administration › "Site Settings": the heading, the
 *   top tabs and each one's side tabs, the editorial header's site name,
 *   and one form object per side tab this feature owns (`settings`,
 *   `security`, `information`, `bulkEmails`, `theme`, `appearanceSetup`),
 *   plus U64's `statistics` ("Site Setup" › "Statistics", SiteStatisticsForm).
 * - SiteForm — the shared base of those forms (U07's SettingsForm: "Save",
 *   "Saved", the red reasons, the error line with "Jump to next error", the
 *   rich-text boxes), saving through the site's own request.
 * - SiteThemeForm, SiteAppearanceSetupForm — "Appearance" › "Theme" and
 *   "Setup", built on U10's ThemeForm, UploadBox and OrderableList.
 * - SitePublicPage — a public page at the site's address (U10's PublicLook
 *   at the `index` path): the header's name, logo and look, the hidden
 *   heading, "About the Site", the list of journals, the footer, the
 *   sidebar's language block, the style sheets.
 * - putSite() — the site's own save (`PUT index/api/v1/site[/theme]`) sent
 *   from the Site Administrator's page, for a test's `finally` that puts
 *   back what it changed (spec footnote s); `SITE_INSTALL` holds the
 *   install values those saves send.
 *
 * DOM facts the locators rely on (U60 claim check, 2026-09-26, three apps;
 * `.reports/U60/screen-notes.md`):
 * - the top tabs are the first tablist of `main`; each top tab's panel is a
 *   tabpanel named like the tab ("Site Setup"), holding the side tabs'
 *   tablist; "Appearance" › "Setup" shares `#setup-button` with "Site
 *   Setup", so nothing here addresses a tab by id;
 * - the forms' boxes are `siteConfig-*`, `siteSecurity-*`, `siteInfo-*`,
 *   `siteAppearance-*` (`-<locale>` on per-language boxes); the French boxes
 *   are in the DOM only after the form's "French" button; "Maximum
 *   attempts" and "Lockout duration (seconds)" only while "Enable rate
 *   limiting" is ticked;
 * - every tab's "Save" sends `POST index/api/v1/site` with the PUT
 *   override, "Theme"'s `POST index/api/v1/site/theme`; a refusal the
 *   browser makes (an empty required box) sends nothing;
 * - the public header's name link carries white space around its href.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {SettingsForm} = require('./ContextIdentityPages.js');
const {AppearanceForm, ThemeForm, UploadBox, OrderableList, PublicLook} = require('./AppearancePages.js');

const T = 30_000;

/** Is this response a save of the site's settings ("Theme"'s with `theme`)? */
function isSiteSave(response, {theme = false} = {}) {
    const re = theme ? /\/index\/api\/v1\/site\/theme(\?|$)/ : /\/index\/api\/v1\/site(\?|$)/;
    return re.test(response.url()) && response.request().method() === 'POST';
}

/** Is this request a save of the site's settings (either endpoint)? */
function isSiteSaveRequest(request) {
    return /\/index\/api\/v1\/site(\/theme)?(\?|$)/.test(request.url()) && request.method() !== 'GET';
}

/** Press a site form's "Save" and return the save's answer. */
async function pressSiteSave(form, theme) {
    const answered = form.page.waitForResponse((r) => isSiteSave(r, {theme}), {timeout: T});
    await form.saveButton.click();
    return answered;
}

/**
 * Press a site form's "Save" for a refusal the browser makes: waits for the
 * red reason under the control and returns the site saves sent meanwhile
 * (none, when the page refused it itself).
 */
async function saveRefusedInBrowser(form, controlId, message) {
    const sent = [];
    const onRequest = (r) => {
        if (isSiteSaveRequest(r)) sent.push(r.url());
    };
    form.page.on('request', onRequest);
    try {
        await form.saveButton.click();
        // A save the click had sent would be on the wire before its reason
        // could show: the page draws a server's reasons from its answer.
        await expect(form.fieldError(controlId)).toHaveText(message, {timeout: T});
    } finally {
        form.page.off('request', onRequest);
    }
    return sent;
}

// ---------------------------------------------------------------------------
// The forms
// ---------------------------------------------------------------------------

class SiteForm extends SettingsForm {
    /** Press "Save" and return the site save's answer. */
    async pressSave() {
        return pressSiteSave(this, false);
    }

    /** The field's description under its label (by the control's id or id prefix). */
    description(idOrPrefix) {
        return this.control(idOrPrefix)
            .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " pkpFormField ")][1]')
            .locator('.pkpFormField__description')
            .first();
    }

    /** Press "Save" for a refusal the browser makes; returns the saves sent (none expected). */
    async saveRefusedInBrowser(controlId, message) {
        return saveRefusedInBrowser(this, controlId, message);
    }

    /** The form's language button ("French"). */
    languageButton(label) {
        return this.form.locator('.pkpFormLocales button').filter({hasText: label});
    }
}

/** "Site Setup" › "Settings": "Site Name", the redirect, "Reviewer statistics". */
class SiteConfigForm extends SiteForm {
    constructor(page) {
        super(page, '[id^="siteConfig-title-control"]');
        this.redirect = this.form.locator('select[id^="siteConfig-redirectContextId-control"]');
        this.reviewerStatistics = this.form.getByRole('checkbox', {name: 'Disable aggregated reviewer statistics', exact: true});
    }

    /** The "Site Name" box in a language. */
    siteName(locale = 'en') {
        return this.form.locator(`[id="siteConfig-title-control-${locale}"]`);
    }

    /** The redirect list's entries, as read (the blank first one included). */
    async redirectChoices() {
        await expect(this.redirect).toBeVisible({timeout: T});
        return (await this.redirect.locator('option').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
    }

    /** The redirect list's chosen entry, as read ('' for the blank one). */
    async redirectChosen() {
        return this.redirect.evaluate((s) => (s.selectedOptions[0] ? s.selectedOptions[0].textContent.replace(/\s+/g, ' ').trim() : null));
    }
}

/** "Site Setup" › "Security": "Password Policy" and "Rate Limiting". */
class SiteSecurityForm extends SiteForm {
    constructor(page) {
        super(page, '[id="siteSecurity-minPasswordLength-control"]');
        this.minPasswordLength = this.form.locator('[id="siteSecurity-minPasswordLength-control"]');
        this.compromisedCheck = this.form.getByRole('checkbox', {name: 'Check passwords against compromised password databases', exact: true});
        this.rateLimiting = this.form.getByRole('checkbox', {name: 'Enable rate limiting', exact: true});
        this.maxAttempts = this.form.locator('[id="siteSecurity-rateLimitMaxAttempts-control"]');
        this.lockout = this.form.locator('[id="siteSecurity-rateLimitDecaySeconds-control"]');
    }
}

/** "Site Setup" › "Information": "About the Site", the principal contact, "Privacy Statement". */
class SiteInfoForm extends SiteForm {
    constructor(page) {
        super(page, '[id^="siteInfo-contactName-control"]');
    }

    contactName(locale = 'en') {
        return this.form.locator(`[id="siteInfo-contactName-control-${locale}"]`);
    }

    contactEmail(locale = 'en') {
        return this.form.locator(`[id="siteInfo-contactEmail-control-${locale}"]`);
    }

    /** "About the Site"'s id prefix in a language (for the rich-text helpers). */
    aboutId(locale = 'en') {
        return `siteInfo-about-control-${locale}`;
    }

    /** "Privacy Statement"'s id prefix in a language. */
    privacyId(locale = 'en') {
        return `siteInfo-privacyStatement-control-${locale}`;
    }
}

/** "Site Setup" › "Bulk Emails": a box per hosted journal, its description. */
class SiteBulkEmailsForm extends SiteForm {
    constructor(page) {
        super(page, 'input[name="enableBulkEmails"]');
        this.boxes = this.form.locator('input[name="enableBulkEmails"]');
        this.fieldset = this.form.locator('fieldset').filter({has: page.locator('input[name="enableBulkEmails"]')}).first();
        this.descriptionText = this.fieldset.locator('.pkpFormField__description').first();
    }

    /** A journal's box by the journal's name. */
    box(contextName) {
        return this.form.getByRole('checkbox', {name: contextName, exact: true});
    }

    /** The labels of every box, in list order. */
    async boxLabels() {
        await expect(this.boxes.first()).toBeVisible({timeout: T});
        return this.boxes.evaluateAll((inputs) =>
            inputs.map((i) => ((i.labels && i.labels[0]) || i.closest('label') || i.parentElement).textContent.replace(/\s+/g, ' ').trim())
        );
    }

    /** A link in the description ("Hosted Journals"). */
    descriptionLink(label) {
        return this.descriptionText.getByRole('link', {name: label, exact: true});
    }
}

/**
 * "Site Setup" › "Statistics" (U64): "Data Collection", "Data Storage",
 * "Sushi Protocol". Radios and boxes answer their labels; "Platform ID" is
 * in the DOM only while "Platform" is ticked. Words that differ per app
 * (the "Platform" box's "…for all journals." / "presses." / "servers.")
 * are matched by their shared start.
 */
class SiteStatisticsForm extends SiteForm {
    constructor(page) {
        super(page, 'input[name="enableGeoUsageStats"]');
        this.groupHeadings = this.form.locator('.pkpFormGroup__heading [id$="_label"]');
        this.institutionalBox = this.form.getByRole('checkbox', {name: 'Enable institutional statistics', exact: true});
        this.platformBox = this.form.getByRole('checkbox', {name: /^Use the site as the platform for all/});
        this.platformId = this.form.locator('input[name="sushiPlatformID"]');
        this.platformIdField = this.form.locator('.pkpFormField').filter({has: page.locator('input[name="sushiPlatformID"]')}).first();
        this.platformIdError = this.platformIdField.locator('.pkpFieldError');
        this.platformIdRequired = this.platformIdField.locator('.pkpFormFieldLabel__required');
    }

    /** A radio or box by its label. */
    choice(label) {
        return this.form.getByLabel(label, {exact: true});
    }

    /** The checked radio's label of a field (by its input name). */
    async chosen(name) {
        return this.form.locator(`input[name="${name}"]:checked`).evaluate((i) =>
            (i.labels && i.labels[0] ? i.labels[0].textContent : '').replace(/\s+/g, ' ').trim()
        );
    }

    /** The error summary's "Go to {label}: …" entry of a field. */
    goToField(label) {
        return this.errorSummary.getByRole('button', {name: new RegExp(`^Go to ${label}`)});
    }

    /** Press "Save" for a refusal by the server: its answer, once the reason shows under "Platform ID". */
    async saveRefused(message) {
        const response = await this.pressSave();
        await expect(this.platformIdError).toHaveText(message, {timeout: T});
        return response;
    }
}

/** "Appearance" › "Theme" (U10's ThemeForm, saving to the site's theme request). */
class SiteThemeForm extends ThemeForm {
    constructor(page) {
        super(page);
        this.themeDescription = this.themeSelect
            .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " pkpFormField ")][1]')
            .locator('.pkpFormField__description')
            .first();
    }

    async pressSave() {
        return pressSiteSave(this, true);
    }
}

/** "Appearance" › "Setup": "Logo", "Page Footer", "Sidebar", "Site style sheet". */
class SiteAppearanceSetupForm extends AppearanceForm {
    constructor(page) {
        super(page, '[id^="siteAppearance-pageFooter-control"]');
        this.sidebar = new OrderableList(page, this.form.locator('fieldset').filter({has: page.locator('input[name="sidebar"]')}));
        this.styleSheet = new UploadBox(page, 'siteAppearance', 'styleSheet');
    }

    async pressSave() {
        return pressSiteSave(this, false);
    }

    logo(locale = 'en') {
        return new UploadBox(this.page, 'siteAppearance', 'pageHeaderTitleImage', {locale});
    }

    /** "Page Footer"'s id prefix in a language. */
    footerId(locale = 'en') {
        return `siteAppearance-pageFooter-control-${locale}`;
    }

    /** Replace "Page Footer" in a language by typing. */
    async typeFooter(text, locale = 'en') {
        await this.typeRich(this.footerId(locale), text);
    }
}

// ---------------------------------------------------------------------------
// Administration › "Site Settings"
// ---------------------------------------------------------------------------

class SiteSettingsPage extends BasePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        super(page);
        this.main = page.getByRole('main');
        this.heading = page.locator('main h1').first();
        this.topTabs = this.main.getByRole('tablist').first().getByRole('tab');
        // The editorial header's site name: plain text without a Site Name,
        // a link to the site's home page with one.
        this.contextTitle = page.locator('.app__contextTitle').first();
    }

    /** The page's address, optionally with a tab hash ('#security'). */
    url(hash = '') {
        return this.siteUrl(`/en/admin/settings${hash}`);
    }

    /** Type the page's address and wait for the tab row. */
    async goto(hash = '') {
        await this.page.goto(this.url(hash));
        await this.expectOpen();
    }

    /** Administration, then its "Site Settings" link. */
    async gotoFromAdministration() {
        await this.page.goto(this.siteUrl('/en/admin'));
        await this.page.getByRole('link', {name: 'Site Settings', exact: true}).first().click();
        await this.page.waitForURL(/\/admin\/settings/, {timeout: T, waitUntil: 'commit'});
        await this.expectOpen();
    }

    /** The page is up: its heading and its tab row. */
    async expectOpen() {
        await expect(this.heading).toBeVisible({timeout: T});
        await expect(this.topTabs.first()).toBeVisible({timeout: T});
    }

    /** Reload and wait for the tab row. */
    async reload() {
        await this.page.reload();
        await this.expectOpen();
    }

    /** A top tab by its name ("Site Setup", "Appearance", …). */
    topTab(name) {
        return this.topTabs.filter({hasText: new RegExp(`^\\s*${name}\\s*$`)});
    }

    /** A top tab's panel. */
    topPanel(name) {
        return this.main.getByRole('tabpanel', {name, exact: true});
    }

    /** A top tab's side tabs (read while that top tab is open). */
    sideTabs(top) {
        return this.topPanel(top).getByRole('tablist').first().getByRole('tab');
    }

    /** A side tab by its name. */
    sideTab(top, side) {
        return this.sideTabs(top).filter({hasText: new RegExp(`^\\s*${side}\\s*$`)});
    }

    /** Press a top tab (when it is not the open one) and wait for its panel. */
    async openTop(top) {
        const tab = this.topTab(top);
        await expect(tab).toBeVisible({timeout: T});
        if ((await tab.getAttribute('aria-selected')) !== 'true') {
            await tab.click();
        }
        await expect(tab).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await expect(this.sideTabs(top).first()).toBeVisible({timeout: T});
    }

    /**
     * Press a top tab, then one of its side tabs. A pressed side tab writes
     * its address (`#security`) about 100 ms later (the tabs' debounced
     * `updateUrl`); the press returns once it has, so a reload keeps it.
     */
    async open(top, side) {
        await this.openTop(top);
        const tab = this.sideTab(top, side);
        if ((await tab.getAttribute('aria-selected')) !== 'true') {
            await tab.click();
            const panel = await tab.getAttribute('aria-controls');
            await expect(this.page).toHaveURL(new RegExp(`[#/]${panel}$`), {timeout: T});
        }
        await expect(tab).toHaveAttribute('aria-selected', 'true', {timeout: T});
    }

    /** "Site Setup" › "Settings", its form ready. */
    async settings() {
        await this.open('Site Setup', 'Settings');
        const form = new SiteConfigForm(this.page);
        await form.ready();
        return form;
    }

    /** "Site Setup" › "Security", its form ready. */
    async security() {
        await this.open('Site Setup', 'Security');
        const form = new SiteSecurityForm(this.page);
        await form.ready();
        return form;
    }

    /** "Site Setup" › "Information", its form and rich-text boxes ready. */
    async information() {
        await this.open('Site Setup', 'Information');
        const form = new SiteInfoForm(this.page);
        await form.ready();
        return form;
    }

    /** "Site Setup" › "Bulk Emails", its boxes shown. */
    async bulkEmails() {
        await this.open('Site Setup', 'Bulk Emails');
        const form = new SiteBulkEmailsForm(this.page);
        await form.ready();
        await expect(form.boxes.first()).toBeVisible({timeout: T});
        return form;
    }

    /** "Site Setup" › "Statistics" (U64), its form ready. */
    async statistics() {
        await this.open('Site Setup', 'Statistics');
        const form = new SiteStatisticsForm(this.page);
        await form.ready();
        await expect(form.saveButton).toBeVisible({timeout: T});
        return form;
    }

    /** "Appearance" › "Theme", its form ready. */
    async theme() {
        await this.open('Appearance', 'Theme');
        const form = new SiteThemeForm(this.page);
        await form.ready();
        return form;
    }

    /** "Appearance" › "Setup", its form and "Page Footer" boxes ready. */
    async appearanceSetup() {
        await this.open('Appearance', 'Setup');
        const form = new SiteAppearanceSetupForm(this.page);
        await form.ready();
        return form;
    }

    /** The style sheets this page loads, in order (absolute addresses). */
    async styleSheets() {
        await this.expectOpen();
        return this.page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((l) => l.href));
    }
}

// ---------------------------------------------------------------------------
// The site's public pages
// ---------------------------------------------------------------------------

class SitePublicPage extends PublicLook {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {{locale?: string}} [options] the locale segment of the site's
     *   addresses ('en' on the bilingual test site)
     */
    constructor(page, {locale = 'en'} = {}) {
        super(page, 'index', {locale});
        this.hiddenHeading = page.locator('h1.pkp_screen_reader').first();
        this.siteNameBox = page.locator('.pkp_site_name').first();
        this.aboutSite = page.locator('.about_site');
        this.contextList = page.locator('.journals, .presses, .servers').first();
        this.languageBlock = this.sidebar.locator('.block_language');
        this.loginForm = page.locator('form#login');
    }

    /** The header's name link's address, its white space trimmed. */
    async nameLinkHref() {
        await expect(this.siteNameLink).toBeVisible({timeout: T});
        return ((await this.siteNameLink.getAttribute('href')) || '').trim();
    }

    /** Does "About the Site" stand before the list of journals in the page? */
    async aboutBeforeList() {
        await expect(this.aboutSite).toBeVisible({timeout: T});
        await expect(this.contextList).toBeVisible({timeout: T});
        return this.aboutSite.evaluate((about) => {
            const list = document.querySelector('.journals, .presses, .servers');
            return !!list && !!(about.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING);
        });
    }

    /** A language's link in the sidebar's language block, named in its own words ("English", "français"). */
    languageLink(label) {
        return this.languageBlock.getByRole('link', {name: label, exact: true});
    }
}

// ---------------------------------------------------------------------------
// Putting the site back (a test's `finally`)
// ---------------------------------------------------------------------------

/**
 * The install values each tab's "Save" sends (spec footnote s; seed-facts,
 * U60 claim check). `information` takes the application's name, which a
 * fresh install gives the principal contact in both languages.
 */
const SITE_INSTALL = {
    settings: {redirectContextId: '', disableSharedReviewerStatistics: 'false'},
    security: {
        minPasswordLength: '6',
        passwordUncompromisedEnabled: 'false',
        rateLimitEnabled: 'false',
        rateLimitMaxAttempts: '5',
        rateLimitDecaySeconds: '300',
    },
    information: (appName) => ({
        'about[en]': '',
        'about[fr_CA]': '',
        'contactName[en]': appName,
        'contactName[fr_CA]': appName,
        'contactEmail[en]': 'admin@mail.test',
        'contactEmail[fr_CA]': '',
        'privacyStatement[en]': '',
        'privacyStatement[fr_CA]': '',
    }),
    appearance: {
        'pageHeaderTitleImage[en]': '',
        'pageHeaderTitleImage[fr_CA]': '',
        'pageFooter[en]': '',
        'pageFooter[fr_CA]': '',
        sidebar: '',
        styleSheet: '',
    },
};

/**
 * Send the site's own save from a Site Administrator's page, as a tab's
 * "Save" sends it (a form post with the PUT override and the page's CSRF
 * token), and return its status. For a `finally` that puts back what the
 * test changed; the page is taken to Site Settings first for the token.
 *
 * @param {import('@playwright/test').Page} page a Site Administrator's page
 * @param {Record<string, string>} fields the form fields, as the tab posts them
 * @param {{theme?: boolean}} [options] `theme`: the "Theme" tab's request
 */
async function putSite(page, fields, {theme = false} = {}) {
    await page.goto(new BasePage(page).siteUrl('/en/admin/settings'));
    await page.waitForFunction(() => !!(window.pkp && window.pkp.currentUser && window.pkp.currentUser.csrfToken), null, {timeout: T});
    const token = await page.evaluate(() => window.pkp.currentUser.csrfToken);
    const response = await page.request.post(new BasePage(page).siteUrl(`/api/v1/site${theme ? '/theme' : ''}`), {
        headers: {'X-Csrf-Token': token, 'X-Http-Method-Override': 'PUT'},
        form: fields,
    });
    return response.status();
}

module.exports = {
    SiteSettingsPage,
    SiteForm,
    SiteConfigForm,
    SiteSecurityForm,
    SiteInfoForm,
    SiteBulkEmailsForm,
    SiteStatisticsForm,
    SiteThemeForm,
    SiteAppearanceSetupForm,
    SitePublicPage,
    SITE_INSTALL,
    putSite,
    isSiteSave,
    isSiteSaveRequest,
};
