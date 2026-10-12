/**
 * @file playwright/pages/RegistrationPages.js
 *
 * OJS-local Page Objects for registration & account validation (spec:
 * docs/specs/U02-registration-and-account-validation.md).
 *
 * Surfaces:
 * - RegisterPage — the "Register" form, journal-level ({journal}/user/register)
 *   or site-level (index/user/register), on any server (the fixed
 *   validation-variant server included, via an absolute origin). On the
 *   site-level page each journal's block is read by its name, its role
 *   boxes and the words only a screen reader gets before them.
 * - RegistrationCompletePage — the "Registration complete" landing.
 * - ProfileRolesTab — the profile's Roles tab (journal- or site-level), its
 *   role boxes and the "Reviewing interests" list.
 * - ProfileNotificationsTab — the profile's Notifications tab, the
 *   "Public Announcements" rows' two boxes (Rule 6).
 * - ProfileNameTabs — the Identity and Contact tabs' `[en]` name and
 *   affiliation boxes (Rule 16).
 * - ActivationPage — the emailed link's "Confirm and activate your account"
 *   page, its "Activate Account" button and the thank-you page (Rule 13).
 * - siteHeader(page) — the front-end user navigation (#navigationUser).
 * - loginFormRegisterLink(page) — the "Register" link below the Login form
 *   (the one that carries an interrupted destination, Rule 9).
 *
 * Labels are the live locale strings (lib/pkp/locale/en/user.po).
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {expectTextsInAnyOrder} = require('../../../../shared/playwright/support/order.js');

/** The front-end user navigation: "Register" / "Login" or the username menu. */
function siteHeader(page) {
    return page.locator('#navigationUser');
}

exports.siteHeader = siteHeader;

/**
 * The "Register" link below the Login form (`form#login a.register`), not
 * the header's: it carries the Login page's interrupted destination into
 * the Register form (Rule 9).
 */
function loginFormRegisterLink(page) {
    return page.locator('form#login').getByRole('link', {name: 'Register', exact: true});
}

exports.loginFormRegisterLink = loginFormRegisterLink;

/** The "Public Announcements" rows' setting names on a journal (note e). */
const PUBLIC_ANNOUNCEMENT_SETTINGS = [
    'notificationNewAnnouncement',
    'notificationPublishedIssue',
    'notificationOpenAccess',
];

exports.PUBLIC_ANNOUNCEMENT_SETTINGS = PUBLIC_ANNOUNCEMENT_SETTINGS;

exports.RegisterPage = class RegisterPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string|null} contextPath journal path, or null for the site-level page
     * @param {{origin?: string}} [options] absolute origin (the variant server); default: baseURL
     */
    constructor(page, contextPath, {origin = ''} = {}) {
        super(page);
        this.contextPath = contextPath;
        this.origin = origin;
        this.form = page.locator('form#register');
        this.heading = page.getByRole('heading', {name: 'Register', exact: true});
        this.givenName = this.form.locator('input[name="givenName"]');
        this.familyName = this.form.locator('input[name="familyName"]');
        this.affiliation = this.form.locator('input[name="affiliation"]');
        this.country = this.form.locator('select[name="country"]');
        this.email = this.form.locator('input[name="email"]');
        this.username = this.form.locator('input[name="username"]');
        this.password = this.form.locator('input[name="password"]');
        this.password2 = this.form.locator('input[name="password2"]');
        // Journal-level consent and opt-in boxes.
        this.privacyConsent = this.form.locator('input[name="privacyConsent"]');
        this.emailConsent = this.form.locator('input[name="emailConsent"]');
        this.privacyStatementLink = this.form.getByRole('link', {name: 'privacy statement'});
        // The reviewer offer (one box on a default journal) and its interests.
        this.reviewerOptin = this.form.locator('#reviewerOptinGroup input[type="checkbox"]');
        this.reviewerInterests = this.form.locator('#reviewerInterests');
        this.interests = this.form.locator('input#interests');
        // Site-level: the journal list and the site-wide consent box.
        this.contextsLegend = this.form.getByText(
            'Which journals on this site would you like to register with?'
        );
        this.siteConsent = this.form.locator('input[name="privacyConsent[0]"]');
        // Site-level: the interests box, a plain text box found by the
        // question it sits under (shown whatever is ticked, Rule 8).
        this.siteInterests = this.form
            .locator('.reviewer_nocontext_interests')
            .getByLabel(
                'If you requested to be a reviewer on any journal, please enter your subject interests.',
                {exact: true}
            );
        this.submitButton = this.form.locator('button.submit');
        this.loginLink = this.form.getByRole('link', {name: 'Login', exact: true});
        // The interrupted destination the Login page's link carried in (Rule 9).
        this.sourceField = this.form.locator('input[name="source"]');
        this.errors = page.locator('#formErrors');
        this.errorLines = page.locator('#formErrors li');
    }

    /** The page's own address (Rule 1), typed as a visitor would. */
    url() {
        const path = this.contextPath
            ? this.contextUrl(this.contextPath, '/user/register')
            : this.siteUrl('/user/register');
        return `${this.origin}${path}`;
    }

    async goto() {
        await this.page.goto(this.url());
    }

    /**
     * The page's address with a language code where "/en" sits
     * (`{context}/fr_CA/user/register`, Rule 1); journal-level only.
     *
     * @param {string} locale
     */
    localeUrl(locale) {
        return `${this.origin}/index.php/${this.contextPath}/${locale}/user/register`;
    }

    async gotoLocale(locale) {
        await this.page.goto(this.localeUrl(locale));
    }

    async expectForm() {
        await expect(this.heading).toBeVisible();
        await expect(this.form).toBeVisible();
    }

    /** The "Profile" section. */
    async fillProfile({givenName = 'Test', familyName = 'Registrant', affiliation = 'PKP', country = 'Canada'} = {}) {
        await this.givenName.fill(givenName);
        await this.familyName.fill(familyName);
        await this.affiliation.fill(affiliation);
        await this.country.selectOption({label: country});
    }

    /** The "Login" section. `password2` defaults to `password`. */
    async fillLogin({email, username, password, password2 = password}) {
        await this.email.fill(email);
        await this.username.fill(username);
        await this.password.fill(password);
        await this.password2.fill(password2);
    }

    /** A site-level journal block, by the journal's name. */
    contextBlock(journalName) {
        return this.form.locator('li.context').filter({
            has: this.page.locator('.name', {hasText: journalName}),
        });
    }

    /** The journal's name, the line that heads a site-level block. */
    contextName(block) {
        return block.locator('.name');
    }

    /** The labels of a site-level block's role boxes, in page order. */
    contextRoleLabels(block) {
        return block.locator('fieldset.roles label');
    }

    /**
     * The words a screen reader reads before a site-level block's role
     * boxes: the legend of the fieldset that holds them. The theme draws it
     * for screen readers only (`pkp_screen_reader`: clipped to 1px and set
     * 2000px left of the page), so `toBeVisible()` and `toContainText()`
     * pass on it though nothing of it is on screen.
     */
    contextRolesLegend(block) {
        return block.locator('fieldset.roles > legend');
    }

    /** A site-level block's group of role boxes, by the name a screen reader gives it. */
    contextRolesGroup(block, prompt) {
        return block.getByRole('group', {name: prompt, exact: true});
    }

    /**
     * A journal is listed by its name with exactly these role boxes under
     * the name, name and boxes on screen (scenario 6).
     *
     * @param {import('@playwright/test').Locator} block
     * @param {string} journalName
     * @param {string[]} roleNames the boxes' labels, in page order
     */
    async expectContextListed(block, journalName, roleNames) {
        const name = this.contextName(block);
        await expect(name).toHaveText(journalName);
        await name.scrollIntoViewIfNeeded();
        await expect(name).toBeInViewport();
        await expect(this.contextRoleLabels(block)).toHaveText(roleNames);
        for (const roleName of roleNames) {
            await expect(this.contextRoleBox(block, roleName)).toBeInViewport();
        }
        // Under the name: no box starts above the name's lower edge.
        await expect
            .poll(() =>
                block.evaluate((li) => {
                    const nameBox = li.querySelector('.name');
                    const boxes = [...li.querySelectorAll('fieldset.roles input[type="checkbox"]')];
                    if (!nameBox || boxes.length === 0) return false;
                    const lowerEdge = nameBox.getBoundingClientRect().bottom;
                    return boxes.every((box) => box.getBoundingClientRect().top >= lowerEdge);
                })
            )
            .toBe(true);
    }

    /**
     * The words before a block's role boxes are a screen reader's only
     * (scenario 6): they name the group holding the boxes, and they are
     * not on screen while the journal's name and those boxes are (the
     * positive control of the same read). Their box ends left of the
     * page's left edge, where no scrolling reaches.
     *
     * @param {import('@playwright/test').Locator} block
     * @param {string} prompt
     * @param {string[]} roleNames the boxes the group holds
     */
    async expectRolesPromptForScreenReaderOnly(block, prompt, roleNames) {
        const legend = this.contextRolesLegend(block);
        const group = this.contextRolesGroup(block, prompt);
        await expect(legend).toHaveText(prompt);
        await expect(group).toHaveCount(1);
        const name = this.contextName(block);
        await name.scrollIntoViewIfNeeded();
        await expect(name).toBeInViewport();
        for (const roleName of roleNames) {
            await expect(group.getByRole('checkbox', {name: roleName, exact: true})).toBeInViewport();
        }
        await expect(legend).not.toBeInViewport();
        await expect
            .poll(() => legend.evaluate((el) => el.getBoundingClientRect().right + window.scrollX))
            .toBeLessThan(0);
    }

    /** The per-journal consent line inside a site-level block. */
    contextConsent(block) {
        return block.locator('.context_privacy');
    }

    /** The consent box inside a site-level block's consent line. */
    contextConsentBox(block) {
        return this.contextConsent(block).locator('input[type="checkbox"]');
    }

    /** A role box inside a site-level block ("Reader", "Reviewer"). */
    contextRoleBox(block, name) {
        return block.getByRole('checkbox', {name, exact: true});
    }

    /**
     * The consent lines shown on the site-level page. A line that is not
     * shown is parked off-screen (`left: -9999px`), not hidden, so it still
     * counts as visible to Playwright; the theme marks a shown line with
     * `context_privacy_visible` and the viewport read confirms it.
     */
    visibleConsentLines() {
        return this.form.locator('.context_privacy.context_privacy_visible');
    }

    /** No consent line under this block (nothing of its roles ticked, Rule 5). */
    async expectConsentHidden(block) {
        const line = this.contextConsent(block);
        await expect(line).toHaveCount(1);
        await expect(line).not.toHaveClass(/context_privacy_visible/);
        await expect(line).not.toBeInViewport();
    }

    /** The block's consent line is on screen (a role of it ticked, Rule 5). */
    async expectConsentShown(block) {
        const line = this.contextConsent(block);
        await expect(line).toHaveClass(/context_privacy_visible/);
        await line.scrollIntoViewIfNeeded();
        await expect(line).toBeInViewport();
    }

    /**
     * Press "Register" on a server where the ALTCHA spam check is on. The
     * widget verifies in the browser on submit and posts the form itself
     * (spec, "Spam check"), so the only thing to wait for at the source is the
     * widget's script being live before the press.
     */
    async submitWithSpamCheck() {
        await expect(this.form.locator('altcha-widget')).toHaveCount(1);
        await this.page.waitForFunction(() => !!customElements.get('altcha-widget'), undefined, {
            timeout: 30_000,
        });
        await this.submitButton.click();
    }

    /**
     * Assert the refusal list: "Errors occurred processing this form:" then
     * exactly these lines, in this order.
     *
     * @param {string[]} lines
     */
    async expectErrors(lines) {
        await expect(this.errors).toContainText('Errors occurred processing this form:');
        await expect(this.errorLines).toHaveText(lines);
    }
};

exports.RegistrationCompletePage = class RegistrationCompletePage extends BasePage {
    constructor(page) {
        super(page);
        this.heading = page.getByRole('heading', {name: 'Registration complete'});
        this.instructions = page.getByText('Thanks for registering! What would you like to do next?');
        this.actions = page.locator('ul.registration_complete_actions');
    }

    async expectOpen() {
        await expect(this.heading).toBeVisible();
        await expect(this.instructions).toBeVisible();
    }

    link(name) {
        return this.actions.getByRole('link', {name, exact: true});
    }

    /** Assert exactly these links, in order. */
    async expectLinks(names) {
        await expect(this.actions.getByRole('link')).toHaveText(names);
    }
};

exports.ProfileRolesTab = class ProfileRolesTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string|null} contextPath journal path, or null for the site-level profile
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.form = page.locator('form#rolesForm');
        this.tab = page.locator('#profileTabs').getByRole('tab', {name: 'Roles', exact: true});
        this.interestChips = this.form.locator('#interests ul.interests .tagit-label');
        // The label under the interests list ("Reviewing interests").
        this.interestsLabel = this.form.locator('label[for="interests"]');
    }

    /** Open the profile and switch to the Roles tab (jQuery UI tabs, AJAX-loaded). */
    async goto() {
        const path = this.contextPath
            ? this.contextUrl(this.contextPath, '/user/profile')
            : this.siteUrl('/user/profile');
        await this.page.goto(path);
        await this.open();
    }

    /** From the profile page (e.g. after "Edit My Profile"), select the Roles tab. */
    async open() {
        await expect(this.page.getByRole('heading', {name: 'Profile', exact: true})).toBeVisible();
        await this.tab.click();
        await expect(this.form).toBeVisible();
    }

    /**
     * A role box of the current journal. The journal-level tab renders the
     * current journal's roles as the form's first section and folds the other
     * journals under "Register with other journals" after it (their boxes
     * carry the same labels), so the lookup is scoped to that first section.
     */
    roleBox(name) {
        const scope = this.contextPath ? this.form.locator('.section').first() : this.form;
        return scope.getByRole('checkbox', {name, exact: true});
    }

    /** The site-level form's block for one journal (sections titled by journal name). */
    journalSection(journalName) {
        return this.form.locator('.section').filter({
            has: this.page.locator('label', {hasText: journalName}),
        });
    }

    /** Every role box of the form, the folded other journals' included. */
    allBoxes() {
        return this.form.locator('input[type="checkbox"]');
    }

    /** The ticked role boxes of the form, any journal. */
    checkedBoxes() {
        return this.form.locator('input[type="checkbox"]:checked');
    }

    /**
     * "Reviewing interests" lists exactly these interests, each once. In
     * either order: the interests are read with no ORDER BY (fix list B).
     *
     * @param {string[]} interests
     */
    async expectInterests(interests) {
        await expect(this.interestsLabel).toHaveText('Reviewing interests');
        await expectTextsInAnyOrder(this.interestChips, interests);
    }
};

exports.ProfileNotificationsTab = class ProfileNotificationsTab extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath journal path
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.form = page.locator('form#notificationSettingsForm');
        this.tab = page.locator('#profileTabs').getByRole('tab', {name: 'Notifications', exact: true});
    }

    /** From the profile page, select the Notifications tab (AJAX-loaded). */
    async open() {
        await expect(this.page.getByRole('heading', {name: 'Profile', exact: true})).toBeVisible();
        await this.tab.click();
        await expect(this.form).toBeVisible({timeout: 30_000});
    }

    /**
     * A row's two boxes: "Enable these types of notifications." (`#{setting}`)
     * and "Do not send me an email for these types of notifications."
     * (`#email{Setting}`).
     */
    pair(settingName) {
        const emailName = `email${settingName.charAt(0).toUpperCase()}${settingName.slice(1)}`;
        return {
            allow: this.form.locator(`input#${settingName}`),
            email: this.form.locator(`input#${emailName}`),
        };
    }

    /** Every "Enable these types of notifications." box. */
    allowBoxes() {
        return this.form.getByRole('checkbox', {name: 'Enable these types of notifications.'});
    }

    /** Every ticked "Do not send me an email…" box. */
    checkedEmailBoxes() {
        return this.form.locator('input[type="checkbox"][id^="email"]:checked');
    }
};

exports.ProfileNameTabs = class ProfileNameTabs extends BasePage {
    /**
     * The Identity tab (the page opens on it) and the Contact tab, read for
     * the `[en]` boxes: the copy into the site's primary language (Rule 16).
     *
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath journal path
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.heading = page.getByRole('heading', {name: 'Profile', exact: true});
        this.identityForm = page.locator('form#identityForm');
        this.contactForm = page.locator('form#contactForm');
        this.contactTab = page.locator('#profileTabs').locator('> ul > li > a[name="contact"]');
    }

    /** The profile in English (`{context}/en/user/profile`), open on Identity. */
    async goto() {
        await this.page.goto(`/index.php/${this.contextPath}/en/user/profile`);
        await expect(this.heading).toBeVisible({timeout: 30_000});
        await expect(this.identityForm).toBeVisible({timeout: 30_000});
    }

    givenName(locale = 'en') {
        return this.identityForm.locator(`input[name="givenName[${locale}]"]`);
    }

    familyName(locale = 'en') {
        return this.identityForm.locator(`input[name="familyName[${locale}]"]`);
    }

    /** Select the Contact tab (AJAX-loaded). */
    async openContact() {
        await this.contactTab.click();
        await expect(this.contactForm).toBeVisible({timeout: 30_000});
    }

    affiliation(locale = 'en') {
        return this.contactForm.locator(`input[name="affiliation[${locale}]"]`);
    }
};

exports.ActivationPage = class ActivationPage extends BasePage {
    constructor(page) {
        super(page);
        this.confirmText = page.getByText('Confirm and activate your account');
        // An anchor styled as a button (no form), to user/activateUser/… (note i).
        this.activateButton = page.getByRole('link', {name: 'Activate Account', exact: true});
        this.thankYou = page.getByText(
            'Thank you for activating your account. You may now log in using the credentials you supplied when you created your account.'
        );
        this.unavailableHeading = page.getByRole('heading', {name: 'Invitation Unavailable'});
        this.unavailableLanding = page.locator('.page_invitation_unavailable');
    }

    /**
     * Press "Activate Account" and return the absolute address it led to,
     * resolved against the page (the variant server's origin, not the
     * worker's), for the "reopened" read (Rule 13).
     */
    async activate() {
        await expect(this.confirmText).toBeVisible();
        const href = await this.activateButton.getAttribute('href');
        expect(href, 'the address behind "Activate Account"').toBeTruthy();
        const address = new URL(/** @type {string} */ (href), this.page.url()).toString();
        await this.activateButton.click();
        await expect(this.thankYou).toBeVisible();
        return address;
    }
};
