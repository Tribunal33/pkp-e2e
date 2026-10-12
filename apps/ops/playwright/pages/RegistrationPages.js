/**
 * @file playwright/pages/RegistrationPages.js
 *
 * OPS feature POMs for the registration suite (U2).
 *
 * Surfaces:
 * - RegisterPage — the server-level ({server}/user/register) and site-level
 *   (index/user/register) "Register" form: the "Profile" and "Login"
 *   fieldsets, the consent and opt-in boxes, the site-level server blocks
 *   (each read by its name, its role boxes and the words only a screen
 *   reader gets before them: `expectContextListed()`,
 *   `expectRolesPromptForScreenReaderOnly()`), the error list and the
 *   "Register" button.
 * - RegistrationCompletePage — the "Registration complete" landing.
 * - ProfileRolesTab — the profile's Roles tab (user/profile → "Roles"), read
 *   through its self-registration checkboxes.
 * - ProfileNotificationsTab — the profile's Notifications tab
 *   (form#notificationSettingsForm), read for a row's "Enable these types of
 *   notifications." and "Do not send me an email…" boxes (spec fn-e).
 * - ProfileNameTabs — the profile's Identity and Contact tabs, read for the
 *   `[en]` boxes a registration on the French page copied into (spec fn-k).
 * - ActivationPage — the page the emailed "Validate Your Account" link opens
 *   ("Confirm and activate your account" → "Activate Account", an anchor
 *   styled as a button) and the thank-you page after it (spec fn-i).
 * - loginFormRegisterLink — the Login page's "Register" link BELOW the form,
 *   the one carrying the interrupted destination (spec fn-h).
 * - ServerSettingsPages — the three manager screens this feature's
 *   scenarios drive on a scratch server: Settings › Server › Contact
 *   (technical support contact), Settings › Users & Roles › Site Access
 *   Options (close registration) and Settings › Website › Setup › Privacy
 *   Statement (empty the statement).
 *
 * Selector sources: lib/pkp/templates/frontend/pages/userRegister.tpl,
 * frontend/components/registrationForm.tpl, registrationFormContexts.tpl,
 * userRegisterComplete.tpl, common/formErrors.tpl, user/profile.tpl,
 * user/userGroups.tpl; the Vue settings forms PKPContactForm ('contact'),
 * PKPUserAccessForm ('userAccess') and PKPPrivacyForm ('privacy').
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');

exports.RegisterPage = class RegisterPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        super(page);
        this.form = page.locator('form#register');
        this.heading = page.getByRole('heading', {name: 'Register', exact: true});
        this.givenNameInput = this.form.locator('input#givenName');
        this.familyNameInput = this.form.locator('input#familyName');
        this.affiliationInput = this.form.locator('input#affiliation');
        this.countrySelect = this.form.locator('select#country');
        this.emailInput = this.form.locator('input#email');
        this.usernameInput = this.form.locator('input#username');
        this.passwordInput = this.form.locator('input#password');
        this.password2Input = this.form.locator('input#password2');
        // Server-level consent (the site-level page has one box per server,
        // see contextBlock(), plus the site's own when the site has a statement).
        this.privacyConsentBox = this.form.locator('input[name="privacyConsent"]');
        this.privacyStatementLink = this.form.locator('.optin-privacy a', {hasText: 'privacy statement'});
        this.emailConsentBox = this.form.locator('input[name="emailConsent"]');
        // {OJS OMP} — the reviewer offer; on a preprint server these never render.
        this.reviewerFieldset = this.form.locator('fieldset.reviewer');
        this.reviewerBoxes = this.form.locator('input[name^="reviewerGroup"]');
        this.reviewerInterestsInput = this.form.locator('#reviewerInterests input#interests');
        // Site-level only.
        this.contextsLegend = this.form.locator('fieldset[name="contexts"] > legend');
        // The site's own consent box (SITE_CONTEXT_ID renders as 0).
        this.siteConsentBox = this.form.locator('input[name="privacyConsent[0]"]');
        this.registerButton = this.form.getByRole('button', {name: 'Register', exact: true});
        this.loginLink = this.form.locator('a.login');
        this.errorBox = page.locator('#formErrors');
        this.errorLines = page.locator('#formErrors ul.pkp_form_error_list li');
        // ALTCHA (validation-variant server only): the widget's state holder.
        this.altchaState = this.form.locator('altcha-widget .altcha[data-state]');
    }

    /**
     * @param {string} contextPath a server path, or 'index' for the site-level page
     */
    async goto(contextPath) {
        await this.page.goto(this.contextUrl(contextPath, '/user/register'));
    }

    /**
     * The server's French Register page: the language code sits where "/en"
     * does (Rule 1; the seeded server carries fr_CA as a UI language).
     *
     * @param {string} contextPath
     */
    async gotoFrench(contextPath) {
        await this.page.goto(this.contextUrl(contextPath, '/fr_CA/user/register'));
    }

    /**
     * Fill the "Profile" and "Login" fieldsets. Any key left out is left as is.
     * `country` picks the Country by its English label; `countryCode` by its
     * option value (the ISO code), the same on every language of the page.
     *
     * @param {{givenName?: string, familyName?: string, affiliation?: string, country?: string, countryCode?: string, email?: string, username?: string, password?: string, password2?: string}} values
     */
    async fill(values) {
        if (values.givenName !== undefined) await this.givenNameInput.fill(values.givenName);
        if (values.familyName !== undefined) await this.familyNameInput.fill(values.familyName);
        if (values.affiliation !== undefined) await this.affiliationInput.fill(values.affiliation);
        if (values.countryCode !== undefined) await this.countrySelect.selectOption({value: values.countryCode});
        else if (values.country !== undefined) await this.countrySelect.selectOption({label: values.country});
        if (values.email !== undefined) await this.emailInput.fill(values.email);
        if (values.username !== undefined) await this.usernameInput.fill(values.username);
        if (values.password !== undefined) await this.passwordInput.fill(values.password);
        if (values.password2 !== undefined) await this.password2Input.fill(values.password2);
    }

    /**
     * A site-level server block under "Which servers on this site would you
     * like to register with?", by the server's displayed name.
     *
     * @param {string} name
     */
    contextBlock(name) {
        return this.form.locator('li.context').filter({
            has: this.page.locator('.name', {hasText: name}),
        });
    }

    /** The server's name, the line that heads its site-level block (`li.context > .name`). */
    contextName(name) {
        return this.contextBlock(name).locator('.name');
    }

    /** The labels of a site-level block's role boxes, in page order. */
    contextRoleLabels(name) {
        return this.contextBlock(name).locator('fieldset.roles label');
    }

    /**
     * The words a screen reader reads before a site-level block's role
     * boxes: the legend of the fieldset that holds them. The theme draws it
     * for screen readers only (register.less extends `.pkp_screen_reader`:
     * absolute, 2000px left of the page, clipped to 1px), so `toBeVisible()`
     * and a text read pass on it though nothing of it is on screen.
     */
    contextRolesLegend(name) {
        return this.contextBlock(name).locator('fieldset.roles > legend');
    }

    /**
     * A site-level block's group of role boxes, by the name a screen reader
     * gives it (the legend's words).
     *
     * @param {string} name the server's name
     * @param {string} prompt the group's accessible name
     */
    contextRolesGroup(name, prompt) {
        return this.contextBlock(name).getByRole('group', {name: prompt, exact: true});
    }

    /**
     * A server is listed by its name with exactly these role boxes under
     * the name, name and boxes on screen (scenario 6). Positions need the
     * theme's stylesheet in (patterns.md parallel lesson 16).
     *
     * @param {string} name the server's name
     * @param {string[]} roles the boxes' labels, in page order
     */
    async expectContextListed(name, roles) {
        await this.stylesApplied();
        const nameLine = this.contextName(name);
        await expect(nameLine).toHaveText(name);
        await expect(this.contextRoleLabels(name)).toHaveText(roles);
        const boxes = roles.map((role) =>
            this.contextBlock(name).getByRole('checkbox', {name: role, exact: true})
        );
        await nameLine.scrollIntoViewIfNeeded();
        await expect(nameLine).toBeInViewport();
        for (const box of boxes) await expect(box).toBeInViewport();
        // Under the name: no box starts above the name's lower edge.
        await expect
            .poll(async () => {
                const line = await nameLine.boundingBox();
                const tops = await Promise.all(boxes.map(async (box) => (await box.boundingBox())?.y));
                return !!line && tops.every((top) => top !== undefined && top >= line.y + line.height);
            })
            .toBe(true);
    }

    /**
     * The words before a block's role boxes are a screen reader's only
     * (scenario 6). For a screen reader: they name the one group that holds
     * the role boxes, and their legend comes before every box of it. Not on
     * screen: the legend is outside the viewport while the server's name
     * above and every role box below are in it (the positive control of the
     * same read: a legend drawn in place would sit between them), and its
     * box ends left of the page's left edge, where no scrolling reaches.
     *
     * @param {string} name the server's name
     * @param {string} prompt the words
     * @param {string[]} roles the boxes the group holds
     */
    async expectRolesPromptForScreenReaderOnly(name, prompt, roles) {
        await this.stylesApplied();
        const legend = this.contextRolesLegend(name);
        const group = this.contextRolesGroup(name, prompt);
        await expect(legend).toHaveText(prompt);
        await expect(group).toHaveCount(1);
        await expect(group.getByRole('checkbox')).toHaveCount(roles.length);
        expect(
            await group.evaluate((fieldset) => {
                const words = fieldset.querySelector(':scope > legend');
                const boxes = [...fieldset.querySelectorAll('input[type="checkbox"]')];
                return (
                    !!words &&
                    boxes.length > 0 &&
                    boxes.every(
                        (box) => words.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING
                    )
                );
            }),
            'the words come before every role box of their group'
        ).toBe(true);

        const nameLine = this.contextName(name);
        await nameLine.scrollIntoViewIfNeeded();
        await expect(nameLine).toBeInViewport();
        for (const role of roles) {
            await expect(group.getByRole('checkbox', {name: role, exact: true})).toBeInViewport();
        }
        await expect(legend).not.toBeInViewport();
        await expect
            .poll(() => legend.evaluate((el) => el.getBoundingClientRect().right + window.scrollX))
            .toBeLessThan(0);
    }

    /** The "Reader" box of a site-level server block. */
    readerBox(name) {
        return this.contextBlock(name).getByRole('checkbox', {name: 'Reader', exact: true});
    }

    /** Every role box of a site-level server block (a preprint server offers "Reader" only). */
    contextRoleBoxes(name) {
        return this.contextBlock(name).locator(
            'input[name^="readerGroup"], input[name^="authorGroup"], input[name^="reviewerGroup"]'
        );
    }

    /** Every ticked box of the whole form (site-level: servers, roles, consents). */
    get checkedBoxes() {
        return this.form.locator('input[type="checkbox"]:checked');
    }

    /** The per-server consent line of a site-level server block. */
    contextConsentBox(name) {
        return this.contextBlock(name).locator('input[name^="privacyConsent"]');
    }

    /** The per-server consent line wrapper (off-screen until a role is ticked). */
    contextConsentLine(name) {
        return this.contextBlock(name).locator('.context_privacy');
    }

    /**
     * Whether a server's consent line is on screen. Until a role is ticked
     * the line is parked off the left edge (`.context_privacy` at
     * `left: -9999px`; the theme's register.less), which Playwright's own
     * visibility still counts as visible, so the read is the line's box.
     *
     * @param {string} name
     * @returns {Promise<boolean>}
     */
    async contextConsentLineOnScreen(name) {
        const box = await this.contextConsentLine(name).boundingBox();
        return box !== null && box.x + box.width > 0;
    }

    /**
     * A server's consent line is (true) or is not (false) on screen, polled
     * until it holds. The rule that parks the line off screen is in the
     * theme's style sheet, which PHP serves (`…/page/page/css?name=stylesheet`)
     * and which may still be loading when the form is already drawn: until
     * it applies, every line sits on screen whatever is ticked
     * (.reports/flake-s26/fixC/diagnosis.md).
     *
     * @param {string} name
     * @param {boolean} onScreen
     */
    async expectConsentLineOnScreen(name, onScreen) {
        await expect.poll(() => this.contextConsentLineOnScreen(name), {timeout: 30_000}).toBe(onScreen);
    }

    /** Press "Register". Waits for nothing — the caller asserts the outcome. */
    async submit() {
        await this.registerButton.click();
    }

    /**
     * Press the form's submit button whatever language the page is in (the
     * French page's reads "S'inscrire"; the page's own strings are not
     * asserted).
     */
    async submitInPageLanguage() {
        await this.form.locator('button.submit[type="submit"]').click();
    }

    /**
     * Press "Register" on a page guarded by ALTCHA (the validation-variant
     * server). The floating widget intercepts the submit, verifies in the
     * browser and re-submits with its hidden `altcha` field, so the wait is
     * on the browser's own POST carrying that field — the proof the widget
     * reached "Verified" before the form went through.
     */
    async submitThroughAltcha() {
        await expect(this.altchaState).toHaveAttribute('data-state', 'unverified');
        const verifiedPost = this.page.waitForRequest(
            (request) =>
                request.method() === 'POST' &&
                request.url().includes('/user/register') &&
                /(^|&)altcha=[^&]+/.test(request.postData() || '')
        );
        await this.registerButton.click();
        await verifiedPost;
    }
};

exports.RegistrationCompletePage = class RegistrationCompletePage extends BasePage {
    constructor(page) {
        super(page);
        this.heading = page.getByRole('heading', {name: 'Registration complete', exact: true});
        this.instructions = page.getByText('Thanks for registering! What would you like to do next?');
        this.actions = page.locator('ul.registration_complete_actions');
        this.viewSubmissionsLink = this.actions.getByRole('link', {name: 'View Submissions', exact: true});
        this.newSubmissionLink = this.actions.getByRole('link', {name: 'Make a New Submission', exact: true});
        this.editProfileLink = this.actions.getByRole('link', {name: 'Edit My Profile', exact: true});
        this.continueBrowsingLink = this.actions.getByRole('link', {name: 'Continue Browsing', exact: true});
    }

    async expectShown() {
        await expect(this.heading).toBeVisible();
        await expect(this.instructions).toBeVisible();
    }

    /**
     * Assert the exact set of action links, in DOM order.
     *
     * @param {string[]} names
     */
    async expectActions(names) {
        await expect(this.actions.getByRole('link')).toHaveText(names);
    }
};

exports.ProfileRolesTab = class ProfileRolesTab extends BasePage {
    constructor(page) {
        super(page);
        this.tab = page.getByRole('tab', {name: 'Roles', exact: true});
        this.form = page.locator('form#rolesForm');
        this.roleBoxes = this.form.locator(
            'input[type="checkbox"][name^="readerGroup"], input[type="checkbox"][name^="authorGroup"], input[type="checkbox"][name^="reviewerGroup"]'
        );
        // The server-level tab folds the other servers under "Register with
        // other servers"; the boxes outside that drawer are this server's.
        this.ownContextBoxes = this.form.locator(
            'xpath=.//input[@type="checkbox" and (starts-with(@name, "readerGroup") or starts-with(@name, "authorGroup") or starts-with(@name, "reviewerGroup")) and not(ancestor::div[@id="userGroupExtraFormFields"])]'
        );
    }

    /**
     * Open the profile of the given scope and switch to the Roles tab.
     *
     * @param {string} contextPath a server path, or 'index' for the site-level profile
     */
    async goto(contextPath) {
        await this.page.goto(this.contextUrl(contextPath, '/user/profile'));
        await this.tab.click();
        await expect(this.roleBoxes.first()).toBeVisible({timeout: 20_000});
    }

    /** A role box of this server (outside the other-servers drawer), by label. */
    ownBox(label) {
        return this.ownContextBoxes.and(
            this.form.getByRole('checkbox', {name: label, exact: true})
        );
    }

    /**
     * The site-level Roles tab lists every server flat, one fbv section per
     * server titled with its name: that section's boxes.
     *
     * @param {string} contextName
     */
    contextSection(contextName) {
        const exact = new RegExp(`^\\s*${contextName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
        return this.form.locator('div.section').filter({
            has: this.page.locator('ul.checkbox_and_radiobutton > label', {hasText: exact}),
        });
    }
};

/**
 * The Login page's "Register" link BELOW the form (`form#login a.register`),
 * the one carrying the page's interrupted destination (`source`) into the
 * Register form (Rule 9, spec fn-h). The header's "Register" is another link.
 *
 * @param {import('@playwright/test').Page} page
 */
exports.loginFormRegisterLink = (page) => page.locator('form#login a.register');

/**
 * The profile's "Notifications" tab (form#notificationSettingsForm): each
 * row pairs an "Enable these types of notifications." box (`#{settingName}`)
 * with a "Do not send me an email for these types of notifications." box
 * (`#email{SettingName}`); "Public Announcements" holds the announcement
 * row on a preprint server (spec fn-e).
 */
exports.ProfileNotificationsTab = class ProfileNotificationsTab extends BasePage {
    constructor(page) {
        super(page);
        this.tab = page.getByRole('tab', {name: 'Notifications', exact: true});
        this.form = page.locator('form#notificationSettingsForm');
        this.publicAnnouncementsHeading = this.form.getByRole('heading', {name: 'Public Announcements'});
    }

    /** Press the tab on the profile page already open. */
    async select() {
        await this.tab.click();
        await expect(this.form).toBeVisible({timeout: 20_000});
    }

    /** The "Enable these types of notifications." box of a row (`notificationNewAnnouncement`). */
    allowBox(settingName) {
        return this.form.locator(`input#${settingName}`);
    }

    /** The "Do not send me an email…" box of a row (`emailNotificationNewAnnouncement`). */
    emailBox(settingName) {
        return this.form.locator(`input#email${settingName.charAt(0).toUpperCase()}${settingName.slice(1)}`);
    }
};

/**
 * The profile's "Identity" and "Contact" tabs, read for the `[en]` boxes a
 * registration on another language's page copied into (Rule 16, spec fn-k).
 */
exports.ProfileNameTabs = class ProfileNameTabs extends BasePage {
    constructor(page) {
        super(page);
        this.heading = page.getByRole('heading', {name: 'Profile', exact: true});
        this.identityTab = page.getByRole('tab', {name: 'Identity', exact: true});
        this.identityForm = page.locator('form#identityForm');
        this.contactTab = page.getByRole('tab', {name: 'Contact', exact: true});
        this.contactForm = page.locator('form#contactForm');
    }

    /** Open the profile's English address (the boxes are `[en]` whichever language the page is in). */
    async goto(contextPath) {
        await this.page.goto(this.contextUrl(contextPath, '/en/user/profile'));
        await expect(this.heading).toBeVisible({timeout: 20_000});
    }

    async selectIdentity() {
        await this.identityTab.click();
        await expect(this.identityForm).toBeVisible({timeout: 20_000});
    }

    async selectContact() {
        await this.contactTab.click();
        await expect(this.contactForm).toBeVisible({timeout: 20_000});
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

/**
 * The activation page the emailed link opens ("Confirm and activate your
 * account" with the "Activate Account" control, an anchor styled as a
 * button, spec fn-i) and the thank-you page after it.
 */
exports.ActivationPage = class ActivationPage extends BasePage {
    constructor(page) {
        super(page);
        this.description = page.getByText('Confirm and activate your account');
        this.activateButton = page.getByRole('link', {name: 'Activate Account', exact: true});
        this.activated = page.getByText(
            'Thank you for activating your account. You may now log in using the credentials you supplied when you created your account.'
        );
    }

    /** The absolute address the "Activate Account" control leads to. */
    async activateHref() {
        const href = await this.activateButton.getAttribute('href');
        expect(href, 'the href behind "Activate Account"').toBeTruthy();
        return new URL(/** @type {string} */ (href), this.page.url()).toString();
    }
};

exports.ServerSettingsPages = class ServerSettingsPages extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
    }

    /**
     * The save of a context settings form: a PUT to /api/v1/contexts/{id},
     * which useFetch tunnels as POST + X-Http-Method-Override (patterns.md).
     */
    waitForContextSave() {
        return this.page.waitForResponse(
            (r) =>
                r.url().includes('/api/v1/contexts/') &&
                ['PUT', 'POST'].includes(r.request().method()) &&
                r.ok()
        );
    }

    /**
     * Settings › Server › Contact: fill the "Technical Support Contact"
     * name and email and save.
     */
    async setTechnicalSupportContact({name, email}) {
        await this.page.goto(this.contextUrl(this.contextPath, '/management/settings/context'));
        await this.page.locator('#contact-button').click();
        const nameInput = this.page.locator('#contact-supportName-control');
        await expect(nameInput).toBeVisible({timeout: 20_000});
        await nameInput.fill(name);
        await this.page.locator('#contact-supportEmail-control').fill(email);
        const saved = this.waitForContextSave();
        await this.page
            .locator('form')
            .filter({has: nameInput})
            .getByRole('button', {name: 'Save', exact: true})
            .click();
        const response = await saved;
        const body = await response.json();
        expect(body.supportEmail).toBe(email);
    }

    /**
     * Settings › Users & Roles › Site Access Options: choose "The Server
     * Manager will register all user accounts." and save (Rule 2).
     */
    async closeRegistration() {
        await this.page.goto(this.contextUrl(this.contextPath, '/management/settings/access'));
        await this.page.locator('#access-button').click();
        const closed = this.page.getByRole('radio', {
            name: 'The Server Manager will register all user accounts.',
        });
        await expect(closed).toBeVisible({timeout: 20_000});
        await closed.check();
        const saved = this.waitForContextSave();
        await this.page
            .locator('form')
            .filter({has: closed})
            .getByRole('button', {name: 'Save', exact: true})
            .click();
        const response = await saved;
        const body = await response.json();
        expect(body.disableUserReg).toBe(true);
    }

    /**
     * Settings › Website › Setup › Privacy Statement: empty the rich-text
     * statement the way a person would (select all, delete) and save.
     */
    async clearPrivacyStatement() {
        await this.page.goto(this.contextUrl(this.contextPath, '/management/settings/website'));
        await this.page.locator('#setup-button').click();
        await this.page.locator('#privacy-button').click();
        const editorId = 'privacy-privacyStatement-control-en';
        await this.page.waitForFunction(
            (id) => !!window.tinymce?.get(id)?.initialized,
            editorId,
            {timeout: 30_000}
        );
        const editorField = this.page.locator(`#${editorId}`);
        const body = this.page
            .locator('.pkpFormField')
            .filter({has: editorField})
            .frameLocator('iframe')
            .first()
            .locator('body');
        await body.click();
        await this.page.keyboard.press('ControlOrMeta+A');
        await this.page.keyboard.press('Backspace');
        const saved = this.waitForContextSave();
        await this.page
            .locator('form')
            .filter({has: editorField})
            .getByRole('button', {name: 'Save', exact: true})
            .click();
        const response = await saved;
        const saveBody = await response.json();
        const statement = saveBody.privacyStatement?.en ?? '';
        expect(statement.replace(/<[^>]+>|&nbsp;|\s/g, '')).toBe('');
        await expect(this.page.locator('[role="status"]').filter({hasText: 'Saved'})).toBeVisible();
    }
};
