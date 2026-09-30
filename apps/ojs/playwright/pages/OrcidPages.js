/**
 * @file playwright/pages/OrcidPages.js
 *
 * OJS-local Page Objects and helpers for the ORCID integration feature
 * (spec: docs/specs/U04-orcid-integration.md).
 *
 * Surfaces:
 * - OrcidSettingsTab — the "ORCID" tab on Settings → Users & Roles
 *   (form panel #orcidSettings, OrcidSettingsForm).
 * - ProfileIdentityPage — the profile's Identity tab ORCID block
 *   (identityForm.tpl + orcidProfile.tpl: connect button, About link,
 *   verified #orcid-link, the unauthenticated iD link, #deleteOrcidButton).
 * - Contributor-panel helpers — the workflow's Publication → Contributors
 *   list (editable or the author's read-only one) and the contributor
 *   add/edit modal's "ORCID iD" field (FieldOrcid) with its "Request
 *   verification" dialog.
 * - AboutOrcidPage — the public "What is ORCID?" page (`/orcid/about`),
 *   its "How and why" section (public- or member-API text).
 *
 * Verbatim strings and DOM anchors were live-confirmed by the U04 probes
 * (2026-08-07); the retained evidence is the U04 spec's footnotes
 * (docs/specs/U04-orcid-integration.md). The read-only list, the request
 * dialog helper and the About page were added on the 2026-09-13 revision.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {pressOrcidConnect} = require('../../../../shared/playwright/support/orcid.js');

exports.OrcidSettingsTab = class OrcidSettingsTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.panel = page.locator('#orcidSettings');
        this.enableCheckbox = this.panel.getByRole('checkbox', {
            name: 'Enable ORCID functionality',
            exact: true,
        });
        this.apiSelect = this.panel.locator('select[name="orcidApiType"]');
        this.clientIdInput = this.panel.locator('input[name="orcidClientId"]');
        this.clientSecretInput = this.panel.locator('input[name="orcidClientSecret"]');
        this.saveButton = this.panel.getByRole('button', {name: 'Save', exact: true});
    }

    /** Settings → Users & Roles, tab "ORCID". */
    async goto() {
        await this.page.goto(this.contextUrl(this.contextPath, '/management/settings/access'));
        await this.page.getByRole('tab', {name: 'ORCID', exact: true}).click();
        await expect(this.enableCheckbox).toBeVisible();
    }

    /** Save the panel and wait for the context API write to settle. */
    async save() {
        const saved = this.page.waitForResponse(
            (response) => response.url().includes('/api/v1/contexts/') && response.ok()
        );
        await this.saveButton.click();
        await saved;
    }
};

exports.ProfileIdentityPage = class ProfileIdentityPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.form = page.locator('form#identityForm');
        // The whole ORCID block renders only while ORCID is enabled for the
        // context ({if $orcidEnabled} in identityForm.tpl) — its absence is
        // the Rule 4 assertion.
        this.orcidContainer = this.form.locator('.orcid_container');
        // Same id for the "Create or Connect…" and "Authorize and Connect…"
        // variants (orcidProfile.tpl).
        this.connectButton = this.form.locator('#connect-orcid-button');
        this.aboutLink = this.orcidContainer.getByRole('link', {name: 'What is ORCID?'});
        // Verified state: the bare-iD link with the solid icon.
        this.orcidLink = this.form.locator('#orcid-link');
        // Unauthenticated state: the hollow-icon link suffixed
        // "(unauthenticated)" beside the "Authorize and Connect…" button
        // (orcidProfile.tpl's `$orcid && !$orcidAuthenticated` branch).
        this.unauthenticatedLink = this.orcidContainer.locator('a[target="_blank"]:not(#orcid-link)');
        this.deleteButton = this.form.locator('#deleteOrcidButton');
    }

    /** The profile page opens on the Identity tab. */
    async goto() {
        await this.page.goto(this.contextUrl(this.contextPath, '/user/profile'));
        await expect(this.form).toBeVisible({timeout: 30_000});
    }

    /**
     * Press the connect (or authorize) button and return the popup it opens.
     * ORCID's site is answered locally in this page's context first
     * (shared support/orcid.js): the popup event waits for the popup's first
     * response, which otherwise comes from the real ORCID sandbox.
     *
     * @returns {Promise<import('@playwright/test').Page>}
     */
    async pressConnect() {
        return pressOrcidConnect(this.page, this.connectButton);
    }
};

/** The Publication → Contributors list panel (editable or read-only). */
exports.contributorsPanel = function contributorsPanel(page) {
    return page.locator('.listPanel--contributor');
};

/**
 * Open the workflow's Publication → Contributors panel (the workflow dialog
 * must already be open, e.g. via WorkflowPage.gotoEditorial). The editable
 * panel is settled on its "Add Contributor" button; the author's read-only
 * one (`editable: false`, WorkflowPage.gotoAuthor) has no such button, so
 * it is settled on the list's own rows instead.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{editable?: boolean}} [options]
 */
exports.openContributors = async function openContributors(page, {editable = true} = {}) {
    await page.getByRole('link', {name: 'Contributors', exact: true}).click();
    if (editable) {
        await expect(page.getByRole('button', {name: 'Add Contributor'})).toBeVisible({
            timeout: 30_000,
        });
    } else {
        await expect(exports.contributorsPanel(page).locator('li.listPanel__item').first()).toBeVisible({
            timeout: 30_000,
        });
    }
};

/**
 * The contributor edit side modal, anchored on the contributor form's own
 * given-name control (the workflow page is itself a dialog — pitfall 6).
 *
 * @param {import('@playwright/test').Page} page
 */
exports.contributorEditorModal = function contributorEditorModal(page) {
    return page
        .locator('[data-cy="active-modal"]')
        .filter({has: page.locator('[id^="contributor-givenName"]')});
};

/**
 * Open the contributor edit modal for the list item naming the contributor.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name contributor display name (or a unique fragment)
 * @returns {Promise<import('@playwright/test').Locator>} the edit modal
 */
exports.openContributorEditor = async function openContributorEditor(page, name) {
    const item = page.locator('.listPanel__item').filter({hasText: name});
    await item.getByRole('button', {name: 'Edit', exact: true}).click();
    const modal = exports.contributorEditorModal(page);
    await expect(modal.locator('[id^="contributor-givenName"]')).toBeVisible({
        timeout: 30_000,
    });
    return modal;
};

/**
 * The "ORCID iD" form field wrapper inside the contributor edit modal.
 *
 * @param {import('@playwright/test').Locator} modal from openContributorEditor
 */
exports.orcidField = function orcidField(modal) {
    return modal.locator('.pkpFormField').filter({hasText: 'ORCID iD'});
};

/** The Rule 8 question every "Request verification" press asks. */
exports.REQUEST_QUESTION =
    'Would you like to send an email to this author requesting they verify their ORCID?';

/** The line the dialog adds on a contributor not yet saved (Rule 8). */
exports.REQUEST_WAITS_FOR_SAVE = 'The email will be sent once the author has been created.';

/** The field's text once a request was confirmed (Rule 8). */
exports.REQUESTED_TEXT = 'ORCID Verification has been requested!';

/**
 * Press the ORCID iD field's "Request verification", answer the dialog's
 * question with "Yes" and wait for the field to report the request. On a
 * saved contributor the press posts `orcid/requestAuthorVerification/…`
 * and the wait is bounded by that response; on a contributor still being
 * added (`saved: false`) nothing is posted until the form's Save, so only
 * the dialog and the field are read.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} field from orcidField()
 * @param {{saved?: boolean}} [options]
 * @returns {Promise<import('@playwright/test').Locator>} the (closed) dialog
 */
exports.requestVerification = async function requestVerification(page, field, {saved = true} = {}) {
    await field.getByRole('button', {name: 'Request verification'}).click();
    const dialog = page.getByRole('dialog').filter({hasText: exports.REQUEST_QUESTION});
    await expect(dialog).toContainText('Request ORCID verification');
    if (saved) {
        await expect(dialog).not.toContainText(exports.REQUEST_WAITS_FOR_SAVE);
        const requested = page.waitForResponse(
            (response) => response.url().includes('/orcid/requestAuthorVerification/') && response.ok()
        );
        await dialog.getByRole('button', {name: 'Yes', exact: true}).click();
        await requested;
    } else {
        await expect(dialog).toContainText(exports.REQUEST_WAITS_FOR_SAVE);
        await dialog.getByRole('button', {name: 'Yes', exact: true}).click();
    }
    await expect(dialog).toHaveCount(0);
    await expect(field).toContainText(exports.REQUESTED_TEXT);
    return dialog;
};

exports.AboutOrcidPage = class AboutOrcidPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.heading = page.getByRole('heading', {name: 'What is ORCID?'});
        this.howAndWhyHeading = page.getByRole('heading', {name: 'How and why we collect ORCID iDs?'});
        this.displayHeading = page.getByRole('heading', {name: 'Where are ORCID iDs displayed?'});
        this.body = page.locator('.page_message');
    }

    /** The journal's own `/orcid/about` address (Rule 10). */
    url() {
        return this.contextUrl(this.contextPath, '/orcid/about');
    }

    async goto() {
        await this.page.goto(this.url());
        await expect(this.heading).toBeVisible();
    }

    /**
     * Open the page by an address taken from an email (its host is the
     * install's configured base URL, which need not be this worker's server,
     * so only the path is followed, on the worker's own server).
     *
     * @param {string} href
     */
    async gotoLink(href) {
        const link = new URL(href);
        await this.page.goto(`${link.pathname}${link.search}`);
        await expect(this.heading).toBeVisible();
    }

    /**
     * The "How and why we collect ORCID iDs?" section's text: the page's
     * text between its heading and the next one (the public-API branch
     * renders the text bare, the member-API one inside a div, so the read
     * slices the page's own text rather than anchoring on a wrapper).
     */
    async howAndWhyText() {
        await expect(this.howAndWhyHeading).toBeVisible();
        await expect(this.displayHeading).toBeVisible();
        const text = await this.body.innerText();
        const start = text.indexOf('How and why we collect ORCID iDs?');
        const end = text.indexOf('Where are ORCID iDs displayed?');
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);
        return text.slice(start, end).trim();
    }
};
