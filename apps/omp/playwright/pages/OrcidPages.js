// @ts-check
/**
 * @file playwright/pages/OrcidPages.js
 *
 * OMP-local Page Objects and helpers for the ORCID integration feature
 * (spec: docs/specs/U04-orcid-integration.md, read in press vocabulary per
 * the application glossary).
 *
 * Surfaces:
 * - OrcidSettingsTab — the "ORCID" tab on Settings → Users & Roles
 *   (form panel #orcidSettings, OrcidSettingsForm; identical on the press,
 *   probe-groupA item 1).
 * - ProfileIdentityPage — the profile's Identity tab ORCID block
 *   (identityForm.tpl + orcidProfile.tpl: connect button, About link,
 *   verified #orcid-link, the unauthenticated iD link with its
 *   "(unauthenticated)" suffix, #deleteOrcidButton; OMP spot in
 *   probe-groupB items 5 and 7).
 * - AboutOrcidPage — the public "What is ORCID?" page (orcidAbout.tpl),
 *   reached by URL or from the request email's link; its "How and why"
 *   section is the member-vs-public difference of Rule 10.
 * - Request-verification helpers — the "Request ORCID verification"
 *   confirm dialog of the contributor form (FieldOrcid), on a saved
 *   contributor (the request leaves at once) and on the add form (the
 *   request waits for the save), and the request email's two links.
 * - Contributor-panel helpers — the workflow's Publication → Contributors
 *   list and the contributor edit modal's "ORCID iD" field (FieldOrcid —
 *   the shared component, rendered identically on the press per
 *   probe-groupC items 10 and 14).
 *
 * The workflow itself is opened with the U26 helpers
 * (playwright/pages/ReviewStagePages.js — openEditorial).
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
        // Unauthenticated state: the iD link (hollow icon) suffixed
        // "(unauthenticated)", beside the "Authorize and Connect" button.
        this.unauthenticatedLink = this.orcidContainer
            .locator('a[target="_blank"]')
            .filter({hasText: '(unauthenticated)'});
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

/**
 * Open the workflow's Publication → Contributors panel (the workflow side
 * modal must already be open, e.g. via ReviewStagePages.openEditorial).
 *
 * @param {import('@playwright/test').Page} page
 */
exports.openContributors = async function openContributors(page) {
    await page.getByRole('link', {name: 'Contributors', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Add Contributor'})).toBeVisible({
        timeout: 30_000,
    });
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

/** The "What is ORCID?" public page (Rule 10; `{context}/orcid/about`). */
exports.AboutOrcidPage = class AboutOrcidPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        super(page);
        this.body = page.locator('.page_message');
        this.heading = page.getByRole('heading', {name: 'What is ORCID?'});
        this.howAndWhyHeading = page.getByRole('heading', {
            name: 'How and why we collect ORCID iDs?',
        });
        this.displayHeading = page.getByRole('heading', {name: 'Where are ORCID iDs displayed?'});
    }

    /** Open the page by its address (a context path, or an absolute link from an email). */
    async goto(target) {
        const url = /^https?:/.test(target) ? target : `/index.php/${target}/orcid/about`;
        await this.page.goto(url);
        await expect(this.heading).toBeVisible();
        await expect(this.howAndWhyHeading).toBeVisible();
        await expect(this.displayHeading).toBeVisible();
    }

    /**
     * The text of the "How and why" section: what sits between its heading
     * and the next one (the member-API wording is wrapped in a description
     * box, the public-API wording is bare, so the read is by text).
     */
    async howAndWhyText() {
        const text = await this.body.innerText();
        const start = text.indexOf('How and why we collect ORCID iDs?');
        const end = text.indexOf('Where are ORCID iDs displayed?');
        if (start < 0 || end < start) {
            throw new Error('AboutOrcidPage: the "How and why" section was not found');
        }
        return text.slice(start + 'How and why we collect ORCID iDs?'.length, end).trim();
    }
};

/**
 * The "Request ORCID verification" confirm dialog a contributor form's
 * "Request verification" opens (Rule 8).
 *
 * @param {import('@playwright/test').Page} page
 */
exports.orcidRequestDialog = function orcidRequestDialog(page) {
    return page
        .getByRole('dialog')
        .filter({hasText: 'Would you like to send an email to this author requesting they verify their ORCID?'});
};

/**
 * Press "Request verification" on a contributor form's ORCID iD field and
 * confirm its dialog with "Yes". On a saved contributor the request leaves
 * at once (the confirm is bounded by the request answering OK); on the add
 * form it is only remembered (`saved: false`), so nothing is awaited.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} field from orcidField()
 * @param {{saved?: boolean}} [options]
 * @returns {Promise<string>} the dialog's text, read before it was confirmed
 */
exports.requestVerification = async function requestVerification(page, field, {saved = true} = {}) {
    await field.getByRole('button', {name: 'Request verification'}).click();
    const dialog = exports.orcidRequestDialog(page);
    await expect(dialog).toContainText('Request ORCID verification');
    const dialogText = await dialog.innerText();
    const requested = saved
        ? page.waitForResponse(
              (response) =>
                  response.url().includes('/orcid/requestAuthorVerification/') && response.ok()
          )
        : Promise.resolve();
    await dialog.getByRole('button', {name: 'Yes', exact: true}).click();
    await requested;
    await expect(dialog).toHaveCount(0);
    return dialogText;
};

/** The requested state of the field (Rule 8): the disabled button's text and the resend link. */
exports.REQUESTED_TEXT = 'ORCID Verification has been requested!';
exports.RESEND_LINK_TEXT = 'Resend Verification Email';

/**
 * The two links every ORCID request email carries (Rule 14): the personal
 * authorization link (leading to ORCID's site) and the What-is-ORCID link,
 * read by their hrefs because the two templates word the link texts
 * differently.
 *
 * @param {string} html the message's HTML body
 * @returns {{authorization: string|null, about: string|null}}
 */
exports.orcidEmailLinks = function orcidEmailLinks(html) {
    const hrefs = [];
    const anchorRe = /<a\b[^>]*href=(["'])([^"']+)\1/gi;
    let match;
    while ((match = anchorRe.exec(html)) !== null) {
        hrefs.push(match[2].replace(/&amp;/g, '&'));
    }
    return {
        authorization: hrefs.find((href) => /orcid\.org\/oauth\/authorize/.test(href)) || null,
        about: hrefs.find((href) => /\/orcid\/about/.test(href)) || null,
    };
};
