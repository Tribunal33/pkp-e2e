/**
 * @file playwright/pages/RegistrationPages.js
 *
 * OMP page objects for U02 — Registration & account validation: the
 * press-level and site-level "Register" form (form#register), the
 * "Registration complete" page, and the profile's Roles tab (where a new
 * account's roles and reviewing interests are read back: `interestChips`,
 * `interestsLabel`, `expectInterests()`). A press's block on the site-level
 * form is read whole by `expectContextListed()`: its name and role boxes on
 * screen, the words "Request the following roles." a screen reader's only.
 *
 * Selectors follow lib/pkp/templates/frontend/pages/userRegister.tpl,
 * frontend/components/registrationForm.tpl, registrationFormContexts.tpl,
 * userRegisterComplete.tpl and lib/pkp/templates/user/userGroups.tpl.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {expectTextsInAnyOrder} = require('../../../../shared/playwright/support/order.js');

/**
 * What a screen reader reads before a press's role boxes on the site-level
 * form: the legend of the block's `fieldset.roles`, which the theme draws
 * off the page (`.pkp_screen_reader`: absolute, 2000px to the left, clipped).
 */
const ROLES_PROMPT = 'Request the following roles.';

exports.RegisterPage = class RegisterPage extends BasePage {
    constructor(page) {
        super(page);
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
        // Press-level consent + opt-ins (fieldset.consent / fieldset.reviewer).
        this.privacyConsent = this.form.locator('input[name="privacyConsent"]');
        this.emailConsent = this.form.locator('input[name="emailConsent"]');
        this.reviewerOptin = this.form.locator('#reviewerOptinGroup input[type="checkbox"]');
        this.reviewerInterests = this.form.locator('#reviewerInterests');
        this.interests = this.form.locator('input#interests');
        // Site-level: the presses list and the site's own consent box.
        this.contextsLegend = this.form.getByText(
            'Which presses on this site would you like to register with?'
        );
        this.siteConsent = this.form.locator(
            ':scope > .fields .optin-privacy input[type="checkbox"]'
        );
        // Site-level: the interests box, a plain text box found by the
        // question it sits under (on screen whatever is ticked, Rule 8; the
        // press-level `#reviewerInterests` block is not on this page).
        this.siteInterests = this.form
            .locator('.reviewer_nocontext_interests')
            .getByLabel(
                'If you requested to be a reviewer for any press, please enter your subject interests.',
                {exact: true}
            );
        // Spam check (only on the validation-variant server).
        this.altchaWidget = this.form.locator('altcha-widget');
        this.submitButton = this.form.getByRole('button', {name: 'Register', exact: true});
        this.loginLink = this.form.getByRole('link', {name: 'Login', exact: true});
        this.errorsHeading = page.locator('#formErrors .pkp_form_error');
        this.errorLines = page.locator('#formErrors li');
    }

    /** Press-level Register address (Rule 1); scratch presses are single-locale. */
    static contextUrl(contextPath) {
        return `/index.php/${contextPath}/user/register`;
    }

    /** Site-level Register address (Rule 1). */
    static siteUrl() {
        return '/index.php/index/user/register';
    }

    /**
     * The press's French Register address (Rule 1: the language code sits
     * where "/en" does; the seeded press carries fr_CA as a UI language).
     */
    static contextUrlFr(contextPath) {
        return `/index.php/${contextPath}/fr_CA/user/register`;
    }

    /**
     * Fill the "Profile" and "Login" sections.
     *
     * `countryCode` picks the Country by its option value (the ISO code),
     * which is the same on every language of the page; `country` picks it by
     * its English label.
     *
     * @param {{givenName: string, familyName?: string, affiliation?: string, country?: string, countryCode?: string, email: string, username: string, password: string, password2?: string}} values
     */
    async fillIdentity({
        givenName,
        familyName = 'Tester',
        affiliation = 'Public Knowledge Project',
        country = 'Iceland',
        countryCode = null,
        email,
        username,
        password,
        password2 = password,
    }) {
        await this.givenName.fill(givenName);
        await this.familyName.fill(familyName);
        await this.affiliation.fill(affiliation);
        await this.country.selectOption(countryCode ? {value: countryCode} : {label: country});
        await this.email.fill(email);
        await this.username.fill(username);
        await this.password.fill(password);
        await this.password2.fill(password2);
    }

    /** The site-level block for one press (li.context), by the press's name. */
    contextBlock(name) {
        return this.form.locator('li.context').filter({
            has: this.page.locator('.name', {hasText: name}),
        });
    }

    /** The press's name as its site-level block shows it (`li.context > .name`). */
    contextName(name) {
        return this.contextBlock(name).locator('.name');
    }

    /**
     * The group a screen reader announces before a press's role boxes: the
     * block's `fieldset.roles`, named by its legend "Request the following
     * roles.".
     */
    contextRolesGroup(name) {
        return this.contextBlock(name).getByRole('group', {name: ROLES_PROMPT, exact: true});
    }

    /**
     * A press's block on the site-level form, as scenario 6 states it: the
     * press listed by its name, its role boxes (exactly `roles`) on screen
     * under the name, and the words "Request the following roles." read by
     * a screen reader before those boxes and not on screen.
     *
     * The words are the accessible name of the group that holds the boxes.
     * Their legend is drawn off the page, where Playwright still calls it
     * visible, so "not on screen" is a viewport read, taken with the name
     * above and every role box below in the viewport (the positive control:
     * a legend drawn in place would sit between them). Geometry needs the
     * theme's stylesheet in (patterns.md parallel lesson 16).
     *
     * @param {string} name the press's name
     * @param {string[]} roles the labels of its role boxes
     */
    async expectContextListed(name, roles) {
        await this.stylesApplied();
        await expect(this.contextBlock(name)).toHaveCount(1);
        const nameLine = this.contextName(name);
        await expect(nameLine).toHaveText(name);

        // A screen reader: one group named by the words, holding the role boxes.
        const group = this.contextRolesGroup(name);
        await expect(group).toHaveCount(1);
        await expect(group.getByRole('checkbox')).toHaveCount(roles.length);
        const boxes = roles.map((role) => group.getByRole('checkbox', {name: role, exact: true}));

        // On screen: the name and, under it, the role boxes.
        await nameLine.scrollIntoViewIfNeeded();
        await expect(nameLine).toBeInViewport();
        for (const box of boxes) {
            await expect(box).toBeVisible();
            await expect(box).toBeInViewport();
        }
        await expect
            .poll(async () => {
                const line = await nameLine.boundingBox();
                const tops = await Promise.all(boxes.map(async (box) => (await box.boundingBox())?.y));
                return !!line && tops.every((top) => top !== undefined && top >= line.y + line.height);
            })
            .toBe(true);

        // Not on screen: the words themselves.
        const legend = group.locator('legend');
        await expect(legend).toHaveText(ROLES_PROMPT);
        await expect(legend).not.toBeInViewport();
    }

    /** A role box inside a press's site-level block. */
    contextRoleBox(name, role) {
        return this.contextBlock(name).getByRole('checkbox', {name: role, exact: true});
    }

    /** Every role box of a press's site-level block (`readerGroup[…]`, `reviewerGroup[…]`). */
    contextRoleBoxes(name) {
        return this.contextBlock(name).locator(
            'input[name^="readerGroup"], input[name^="reviewerGroup"]'
        );
    }

    /** The per-press consent line inside a press's site-level block. */
    contextConsent(name) {
        return this.contextBlock(name).locator('input[name^="privacyConsent"]');
    }

    /** The per-press consent sentence (the label beside the line's box). */
    contextConsentText(name) {
        return this.contextBlock(name).locator('.context_privacy');
    }

    async submit() {
        await this.submitButton.click();
    }

    /**
     * Press the form's submit button whatever language the page is in (the
     * French page's button reads "S'inscrire"; the page's own strings are
     * not asserted).
     */
    async submitInPageLanguage() {
        await this.form.locator('button.submit[type="submit"]').click();
    }
};

/**
 * The Login page's "Register" link BELOW the form (`form#login a.register`),
 * the one that carries the page's interrupted destination into the
 * Register form (Rule 9). The header's "Register" is a different link.
 */
exports.loginFormRegisterLink = (page) => page.locator('form#login a.register');

/** The refusal page a Reader meets at a private address (Rule 9). */
exports.ACCESS_DENIED = 'The current role does not have access to this operation.';

/**
 * The activation page the emailed link opens ("Confirm and activate your
 * account" with the "Activate Account" control, an anchor styled as a
 * button; spec fn-i) and the thank-you page after it.
 */
exports.ActivationPage = class ActivationPage extends BasePage {
    constructor(page) {
        super(page);
        this.description = page.getByText('Confirm and activate your account');
        this.activateButton = page.getByRole('link', {name: 'Activate Account'});
        this.activated = page.getByText(
            'Thank you for activating your account. You may now log in using the credentials you supplied when you created your account.'
        );
    }

    /** The absolute address the "Activate Account" control leads to. */
    async activateHref() {
        const href = await this.activateButton.getAttribute('href');
        return new URL(href || '', this.page.url()).toString();
    }
};

exports.RegistrationCompletePage = class RegistrationCompletePage extends BasePage {
    constructor(page) {
        super(page);
        this.heading = page.getByRole('heading', {name: 'Registration complete'});
        this.instructions = page.getByText(
            'Thanks for registering! What would you like to do next?'
        );
        this.actions = page.locator('ul.registration_complete_actions');
        this.viewSubmissions = this.actions.getByRole('link', {name: 'View Submissions'});
        this.newSubmission = this.actions.getByRole('link', {name: 'Make a New Submission'});
        this.editProfile = this.actions.getByRole('link', {name: 'Edit My Profile'});
        this.continueBrowsing = this.actions.getByRole('link', {name: 'Continue Browsing'});
    }
};

/** The profile page's "Roles" tab (form#rolesForm, fieldset#userGroups). */
exports.ProfileRolesTab = class ProfileRolesTab extends BasePage {
    constructor(page) {
        super(page);
        this.tab = page.getByRole('tab', {name: 'Roles'});
        this.form = page.locator('form#rolesForm');
        this.userGroups = this.form.locator('#userGroups');
        // Press-level profile: the current press's own role list comes first;
        // the other presses are folded under "Register with other presses".
        this.currentContextRoles = this.userGroups.locator('ul.checkbox_and_radiobutton').first();
        this.checkedBoxes = this.userGroups.locator('input[type="checkbox"]:checked');
        // Every role box on the tab, the current press's and the folded
        // presses' alike (the positive control of a "no role ticked" read).
        this.allBoxes = this.userGroups.locator('input[type="checkbox"]');
        this.interestChips = this.form.locator('#interests li.tagit-choice .tagit-label');
        // The label under the interests list ("Reviewing interests").
        this.interestsLabel = this.form.locator('label[for="interests"]');
    }

    /** Open the tab from the profile at `contextPath` (`index` = site level). */
    async open(contextPath) {
        await this.page.goto(`/index.php/${contextPath}/user/profile`);
        await this.tab.click();
        await this.userGroups.waitFor({state: 'visible', timeout: 20_000});
    }

    /** Press the tab on the profile page already open. */
    async select() {
        await this.tab.click();
        await this.userGroups.waitFor({state: 'visible', timeout: 20_000});
    }

    /** A role box in the current press's own list. */
    currentContextBox(role) {
        return this.currentContextRoles.getByRole('checkbox', {name: role, exact: true});
    }

    /** Site-level profile: one press's section, by name. */
    contextSection(name) {
        return this.userGroups.locator('.section').filter({
            has: this.page.locator('label', {hasText: name}),
        });
    }

    contextBox(name, role) {
        return this.contextSection(name).getByRole('checkbox', {name: role, exact: true});
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

/**
 * The profile page's "Notifications" tab (form#notificationSettingsForm).
 * Each row pairs an "Enable these types of notifications." box
 * (`#{settingName}`) with a "Do not send me an email for these types of
 * notifications." box (`#email{SettingName}`); the "Public Announcements"
 * group holds the announcement row on a press (spec fn-e).
 */
exports.ProfileNotificationsTab = class ProfileNotificationsTab extends BasePage {
    constructor(page) {
        super(page);
        this.tab = page.getByRole('tab', {name: 'Notifications'});
        this.form = page.locator('form#notificationSettingsForm');
        this.publicAnnouncementsHeading = this.form.getByRole('heading', {
            name: 'Public Announcements',
        });
    }

    /** Press the tab on the profile page already open. */
    async select() {
        await this.tab.click();
        await this.form.waitFor({state: 'visible', timeout: 20_000});
    }

    /** The "Enable these types of notifications." box of a row (`notificationNewAnnouncement`). */
    allowBox(settingName) {
        return this.form.locator(`input#${settingName}`);
    }

    /** The "Do not send me an email…" box of a row (`emailNotificationNewAnnouncement`). */
    emailBox(settingName) {
        const emailSettingName = `email${settingName.charAt(0).toUpperCase()}${settingName.slice(1)}`;
        return this.form.locator(`input#${emailSettingName}`);
    }
};

/**
 * The profile page's "Identity" and "Contact" tabs, read for the `[en]`
 * boxes a registration on another language's page copied into (Rule 16).
 */
exports.ProfileNameTabs = class ProfileNameTabs extends BasePage {
    constructor(page) {
        super(page);
        this.identityTab = page.getByRole('tab', {name: 'Identity'});
        this.identityForm = page.locator('form#identityForm');
        this.contactTab = page.getByRole('tab', {name: 'Contact'});
        this.contactForm = page.locator('form#contactForm');
    }

    /** The profile's English address (the boxes are `[en]` whichever language the page is in). */
    static url(contextPath) {
        return `/index.php/${contextPath}/en/user/profile`;
    }

    async selectIdentity() {
        await this.identityTab.click();
        await this.identityForm.waitFor({state: 'visible', timeout: 20_000});
    }

    async selectContact() {
        await this.contactTab.click();
        await this.contactForm.waitFor({state: 'visible', timeout: 20_000});
    }

    givenName(locale = 'en') {
        return this.identityForm.locator(`input[name="givenName[${locale}]"]`);
    }

    familyName(locale = 'en') {
        return this.identityForm.locator(`input[name="familyName[${locale}]"]`);
    }

    affiliation(locale = 'en') {
        return this.contactForm.locator(`input[name="affiliation[${locale}]"]`);
    }
};
