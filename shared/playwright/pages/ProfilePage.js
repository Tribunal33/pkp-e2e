// @ts-check
/**
 * @file lib/pkp/playwright/pages/ProfilePage.js
 *
 * The Profile page (`{context}/user/profile`, site level `index/user/profile`)
 * and its seven tabs: Identity, Contact, Roles, Public, Password,
 * Notifications and API Key. One shared surface in all three apps
 * (`lib/pkp/templates/user/*.tpl`, `PKP\controllers\tab\user\ProfileTabHandler`,
 * no app override), so the mechanics live here.
 * Feature spec: docs/specs/U03-user-profile.md.
 *
 * App neutrality (PRINCIPLES M2): nothing here gates on an app name and no
 * app-specific string is hard-coded. What differs per app is passed in by
 * the suite:
 * - the Roles tab's box names ("Reviewer" / "External Reviewer" / none) are
 *   arguments of `roleBox()` and `currentContextRoleLabels()`;
 * - the other-contexts fold's link text ("Register with other journals" /
 *   "… presses" / "… servers", and the "Hide …" twin) is judged by the suite
 *   from `otherContextsLink()`; the POM only knows the mechanism
 *   (`isOtherContextsOpen()` reads which of the two spans is shown, because a
 *   collapsed fold still reports its contents visible to `isVisible`).
 *
 * DOM facts the locators rely on (probed live 2026-09-03/04, all three apps,
 * `.reports/U03/pA`, `pB`, `pD`, `pE`, `pF`, `pG`, `pH`):
 * - the page is `layouts/backend.tpl`: `h1.app__pageHeading` "Profile",
 *   `#profileTabs` is a jQuery UI tab set whose links are
 *   `#profileTabs > ul > li > a[name="{anchor}"]` (anchors `identity`,
 *   `contact`, `roles`, `publicProfile`, `changePassword`,
 *   `notificationSettings`, `apiSettings`; the same names open a tab from
 *   the address, `…/user/profile/{anchor}`); the open panel is
 *   `#profileTabs .ui-tabs-panel:visible`;
 * - every tab is one legacy form (`form#identityForm`, `#contactForm`,
 *   `#rolesForm`, `#publicProfileForm`, `#changePasswordForm`,
 *   `#notificationSettingsForm`, `#apiProfileForm`) saved by an
 *   `AjaxFormHandler` POST to `…/profile-tab/save-{op}`; a success answers a
 *   content-less JSON and the toast `[role="status"].app__notifications`
 *   "Your changes have been saved." (Identity and API Key render it in
 *   their in-place block `#identityFormNotification` / `#apiProfileNotification`
 *   instead; a refusal re-renders the form in place);
 * - the multilingual name boxes carry no accessible label
 *   (`input[name="givenName[en]"]`-style names are the anchor); the API key
 *   box is `input[name="apiKey"]`; the homepage box `input[name="userUrl"]`;
 *   the interests box is jQuery tag-it (`#interests ul.tagit li.tagit-new
 *   input`, chips `.tagit-label`);
 * - a browser-side refusal puts `label.error` directly under the box and
 *   sends nothing; the Contact tab's server-side email refusal comes back as
 *   the toast and as the Email box's label text;
 * - the Public tab's uploader is plupload: `#plupload input[type=file]`
 *   accepts `setInputFiles()`; a success reloads the whole page at
 *   `…/user/profile?uniq=…#publicProfile`; a refusal raises a browser
 *   `alert()` (register a dialog handler first) and writes the sentence
 *   into `#plupload .pkpUploaderError`;
 * - the Password tab's three boxes are `input[name="oldPassword"|"password"|
 *   "password2"]`; its refusal notice is the in-tab `.pkp_notification`
 *   headed "Errors occurred processing this form";
 * - leaving a tab whose form has unsaved changes raises the browser's own
 *   confirm (`TabHandler.tabsBeforeActivate`, `form.dataHasChanged`);
 *   `open()` answers it OK;
 * - the Notifications tab pairs `#{settingName}` (allow) with
 *   `#email{SettingName}` (email) and disables the second while the first is
 *   unticked; groups are `h4` elements inside the form, each row a
 *   `.section` whose sentence is the `label` at the top of its
 *   `ul.checkbox_and_radiobutton` (`notificationTable()` reads both in DOM
 *   order).
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('./BasePage.js');
const {waitForJQueryIdle} = require('../support/legacy.js');

/** Tab name → address anchor (also the `a[name]` of the tab link). */
const TAB_ANCHORS = {
    identity: 'identity',
    contact: 'contact',
    roles: 'roles',
    public: 'publicProfile',
    password: 'changePassword',
    notifications: 'notificationSettings',
    apiKey: 'apiSettings',
};

/** Tab name → its form id. */
const TAB_FORMS = {
    identity: 'identityForm',
    contact: 'contactForm',
    roles: 'rolesForm',
    public: 'publicProfileForm',
    password: 'changePasswordForm',
    notifications: 'notificationSettingsForm',
    apiKey: 'apiProfileForm',
};

/** Tab name → the in-place notification block's id (`inPlaceNotification.tpl`). */
const TAB_NOTICES = {
    identity: 'identityFormNotification',
    contact: 'contactFormNotification',
    roles: 'rolesFormNotification',
    public: 'publicProfileNotification',
    password: 'changePasswordFormNotification',
    notifications: 'notificationSettingsFormNotification',
    apiKey: 'apiProfileNotification',
};

/** Tab name → the tab's accessible name in the tab bar. */
const TAB_LABELS = {
    identity: 'Identity',
    contact: 'Contact',
    roles: 'Roles',
    public: 'Public',
    password: 'Password',
    notifications: 'Notifications',
    apiKey: 'API Key',
};

/** The saved message, verbatim (`common.changesSaved`). */
const SAVED_MESSAGE = 'Your changes have been saved.';

/** The top-right user menu of the editorial layout (`TopNavActions.vue`). */
function userNav(page) {
    return page.locator('[data-cy="app-user-nav"]');
}

/** The user menu's toggle: the avatar button (its accessible name starts with the initials). */
function userNavButton(page) {
    return userNav(page).getByRole('button').first();
}

/** Open the user menu (a Dropdown that toggles on its button). */
async function openUserNav(page) {
    await userNavButton(page).click();
    await expect(userNav(page).getByRole('link', {name: 'Edit Profile', exact: true})).toBeVisible();
}

/**
 * Arm a wait for the answer to the request `matches` picks, one the caller's
 * next press sends, and resolve with its response. It fails with the
 * request's fate instead of a bare timeout, so the error context tells the
 * three reds apart: the request left and failed in the browser (fails at
 * once with the network error: the worker's `php -S` died serving it, read
 * the `server-crash` annotation; never retried), it left and got no answer
 * in 30 s, or nothing matching left at all (the press sent nothing). CI
 * pkp/ojs 36429431746, U03 S5 at the notice's "Cancel": a bare
 * "waitForResponse: Timeout 30000ms" 12 s into the app pass
 * (`.reports/flake-0930/u03s5/diagnosis.md`). The caller awaits the promise
 * after its click; an early failure is held for it, never unhandled.
 *
 * @param {import('@playwright/test').Page} page
 * @param {(request: import('@playwright/test').Request) => boolean} matches
 * @param {string} what how the error names the request
 * @returns {Promise<import('@playwright/test').Response>}
 */
function waitForAnswer(page, matches, what, timeout = 30_000) {
    const armedAt = Date.now();
    const sent = [];
    let onRequest;
    let onFailed;
    let onClose;
    let timer;
    const answered = new Promise((resolve, reject) => {
        onRequest = (request) => {
            if (matches(request)) {
                sent.push({url: request.url(), at: Date.now() - armedAt});
                request.response().then((response) => response && resolve(response), () => {});
            }
        };
        onFailed = (request) => {
            if (matches(request)) {
                const error = (request.failure() || {}).errorText || 'no answer';
                reject(
                    new Error(
                        `The ${what} ${request.url()} failed in the browser after ${Date.now() - armedAt} ms: ${error}. ` +
                            'The server sent no answer; when the worker server died serving it, the test carries a ' +
                            'server-crash annotation (php -S exit 139). Not retried.'
                    )
                );
            }
        };
        timer = setTimeout(() => {
            reject(
                new Error(
                    sent.length
                        ? `The ${what} was sent (${sent.map((s) => `${s.url} at +${s.at} ms`).join(', ')}) and not answered in ${timeout} ms.`
                        : `No ${what} was sent in ${timeout} ms after the wait was armed: the press sent nothing.`
                )
            );
        }, timeout);
        onClose = () => reject(new Error(`The page closed while waiting for the ${what}.`));
        page.on('request', onRequest);
        page.on('requestfailed', onFailed);
        page.on('close', onClose);
    });
    const out = answered.finally(() => {
        clearTimeout(timer);
        page.off('request', onRequest);
        page.off('requestfailed', onFailed);
        page.off('close', onClose);
    });
    out.catch(() => {});
    return out;
}

exports.waitForAnswer = waitForAnswer;
exports.TAB_ANCHORS = TAB_ANCHORS;
exports.TAB_LABELS = TAB_LABELS;
exports.SAVED_MESSAGE = SAVED_MESSAGE;
exports.userNav = userNav;
exports.userNavButton = userNavButton;
exports.openUserNav = openUserNav;

exports.ProfilePage = class ProfilePage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string|null} contextPath the journal/press/server path, or null for the site-level profile
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.heading = page.getByRole('heading', {name: 'Profile', exact: true});
        this.tabs = page.locator('#profileTabs');
        this.toast = page.locator('[role="status"].app__notifications');
    }

    // ---------------------------------------------------------------------
    // Opening the page and its tabs (Rules 1–2)
    // ---------------------------------------------------------------------

    /** The page's address, optionally naming a tab (`…/user/profile/{anchor}`). */
    url(tab = null) {
        const suffix = tab ? `/${TAB_ANCHORS[tab]}` : '';
        return this.contextPath
            ? this.contextUrl(this.contextPath, `/user/profile${suffix}`)
            : this.siteUrl(`/user/profile${suffix}`);
    }

    /** Type the address and wait for that tab's form. */
    async goto(tab = 'identity') {
        await this.page.goto(this.url(tab));
        await this.expectOpen(tab);
    }

    /** The page is up with the named tab's form loaded. */
    async expectOpen(tab = 'identity') {
        await expect(this.heading).toBeVisible({timeout: 30_000});
        await expect(this.form(tab)).toBeVisible({timeout: 30_000});
    }

    /** A tab's link in the tab bar. */
    tabLink(tab) {
        return this.tabs.locator(`> ul > li > a[name="${TAB_ANCHORS[tab]}"]`);
    }

    /**
     * Press a tab and wait for its form (each tab reloads its content when
     * opened). When the tab being left holds unsaved changes, the tab handler
     * first asks the browser's own confirm ("The data on this form has
     * changed. Do you wish to continue without saving?", `form.dataHasChanged`); pressing OK there is what a user
     * does to move on, so it is answered OK here. The one-shot handler is
     * removed again so it never answers a later dialog of the test's own.
     */
    async open(tab) {
        const proceed = (dialog) => dialog.accept();
        this.page.once('dialog', proceed);
        try {
            await this.tabLink(tab).click();
            await waitForJQueryIdle(this.page);
            await expect(this.form(tab)).toBeVisible({timeout: 30_000});
        } finally {
            this.page.off('dialog', proceed);
        }
    }

    /**
     * Press a tab while the open tab holds changes that were never sent, and
     * answer the browser's own question ("The data on this form has changed.
     * Do you wish to continue without saving?", Rule 2) yourself: `proceed:
     * false` presses Cancel and leaves the open tab as it is; `proceed: true`
     * presses OK and waits for the pressed tab's form. Returns the question
     * as the browser showed it. Fails when no question comes.
     */
    async openAnswering(tab, {proceed}) {
        // The question blocks the page until it is answered, and the click
        // does not return before then, so the answer is armed first.
        let message = null;
        const answered = this.page.waitForEvent('dialog', {timeout: 30_000}).then(async (dialog) => {
            message = dialog.message();
            if (proceed) {
                await dialog.accept();
            } else {
                await dialog.dismiss();
            }
        });
        await this.tabLink(tab).click();
        await answered;
        if (proceed) {
            await waitForJQueryIdle(this.page);
            await expect(this.form(tab)).toBeVisible({timeout: 30_000});
        }
        return message;
    }

    /** The currently visible tab panel. */
    panel() {
        return this.tabs.locator('.ui-tabs-panel:visible');
    }

    /** A tab's form (present only while that tab is loaded). */
    form(tab) {
        return this.page.locator(`form#${TAB_FORMS[tab]}`);
    }

    /** The visible panel's "Save" button. */
    saveButton() {
        return this.panel().getByRole('button', {name: 'Save', exact: true});
    }

    /**
     * Press "Save" on the visible tab and wait for the write (the
     * `…/profile-tab/save-…` POST) and for jQuery to settle. The caller then
     * asserts the feedback it expects (toast, in-tab block or refusal).
     */
    async save() {
        const saved = this.waitForSave();
        await this.saveButton().click();
        await saved;
        await waitForJQueryIdle(this.page);
    }

    /** Arm a wait for the tab's save POST (any tab); see `waitForAnswer()`. */
    waitForSave() {
        return waitForAnswer(
            this.page,
            (request) => request.method() === 'POST' && /\/profile-tab\/save-/.test(request.url()),
            'profile save POST'
        );
    }

    /** The in-place notification block of a tab (`#identityFormNotification` etc.). */
    inTabNotice(tab) {
        return this.form(tab).locator(`#${TAB_NOTICES[tab]}`);
    }

    /** The tab bar's entry for a tab (role `tab`, named by its label). */
    tabEntry(tab) {
        return this.tabs.getByRole('tab', {name: TAB_LABELS[tab], exact: true});
    }

    /** The named tab is the selected one. */
    async expectSelectedTab(tab) {
        await expect(this.tabEntry(tab)).toHaveAttribute('aria-selected', 'true');
    }

    /** A browser-side refusal under a box: `label.error` carrying the sentence. */
    fieldError(text) {
        return this.panel().locator('label.error', {hasText: text});
    }

    /** The closing sentence's link on the visible tab (Rule 14). */
    privacyLink() {
        return this.panel().getByRole('link', {name: 'privacy statement'});
    }

    /** The closing sentence on the visible tab. */
    privacySentence() {
        return this.panel().getByText('Your data is stored in accordance with our');
    }

    /** The legend "Required fields are marked with an asterisk: *". */
    requiredLegend() {
        return this.panel().getByText('Required fields are marked with an asterisk: *');
    }

    // ---------------------------------------------------------------------
    // Identity (Rules 4–5)
    // ---------------------------------------------------------------------

    /** The username, shown as plain text. */
    usernameText() {
        return this.form('identity').locator('#userNameInfo');
    }

    givenName(locale = 'en') {
        return this.form('identity').locator(`input[name="givenName[${locale}]"]`);
    }

    familyName(locale = 'en') {
        return this.form('identity').locator(`input[name="familyName[${locale}]"]`);
    }

    preferredPublicName(locale = 'en') {
        return this.form('identity').locator(`input[name="preferredPublicName[${locale}]"]`);
    }

    avatarInitials() {
        return this.form('identity').locator('input[name="preferredAvatarInitials"]');
    }

    // ---------------------------------------------------------------------
    // Contact (Rules 6–7)
    // ---------------------------------------------------------------------

    email() {
        return this.form('contact').locator('input[name="email"]');
    }

    /** The Email box's label (it carries the server's refusal text, Fields). */
    emailLabel() {
        return this.form('contact').locator('label[for^="email"]');
    }

    phone() {
        return this.form('contact').getByLabel('Phone');
    }

    affiliation(locale = 'en') {
        return this.form('contact').locator(`input[name="affiliation[${locale}]"]`);
    }

    country() {
        return this.form('contact').locator('select[name="country"]');
    }

    /** The "Working Languages" boxes, one per site language (Rule 7). */
    workingLanguageBoxes() {
        return this.form('contact').locator('input[name="locales[]"]');
    }

    /** One "Working Languages" box by its locale key (`en`, `fr_CA`). */
    workingLanguageBox(locale) {
        return this.form('contact').locator(`input[name="locales[]"][value="${locale}"]`);
    }

    /** The pending-change notice (Rule 6a), with its "Cancel" button. */
    pendingEmailNotice() {
        return this.form('contact').getByText('You have requested a change of your email to');
    }

    cancelPendingEmailButton() {
        return this.form('contact').locator('button[name="action"][value="cancelPendingEmail"]');
    }

    /** Press the notice's "Cancel" (it posts the same save op) and wait for the tab (Rule 6e). */
    async cancelPendingEmail() {
        const saved = this.waitForSave();
        await this.cancelPendingEmailButton().click();
        await saved;
        await waitForJQueryIdle(this.page);
    }

    // ---------------------------------------------------------------------
    // Roles (Rule 8)
    // ---------------------------------------------------------------------

    /**
     * The first section of the Roles tab: the boxes of the context the page
     * was opened in (journal-level profile only; the site-level page lists
     * every context by name instead — `contextSection()`).
     */
    currentContextSection() {
        return this.form('roles').locator('#userGroups .section').first();
    }

    /** The labels of the current context's boxes, in order. */
    async currentContextRoleLabels() {
        const labels = await this.currentContextSection()
            .locator('ul.checkbox_and_radiobutton > li')
            .allInnerTexts();
        return labels.map((label) => label.trim());
    }

    /** A role box of the current context, by its label. */
    roleBox(name) {
        return this.currentContextSection().getByRole('checkbox', {name, exact: true});
    }

    /**
     * A named context's box list (the other-contexts fold, or the site-level
     * list): the `ul.checkbox_and_radiobutton` whose own label is the
     * context's name (the `.section` around it nests inside the fold's
     * section, so the list, never the section, is the anchor).
     */
    contextSection(contextName) {
        return this.form('roles').locator('ul.checkbox_and_radiobutton').filter({
            has: this.page.locator('label', {hasText: contextName}),
        });
    }

    /** A role box under a named context's section (the fold, or the site-level list). */
    contextRoleBox(contextName, name) {
        return this.contextSection(contextName).getByRole('checkbox', {name, exact: true});
    }

    /** The fold's toggle link ("Register with other …" / "Hide other …"). */
    otherContextsLink() {
        return this.form('roles').locator('#userGroupExtras a.toggleExtras');
    }

    /** Press the fold's link (open it, or close it again). */
    async toggleOtherContexts() {
        await this.otherContextsLink().click();
    }

    /**
     * Whether the fold is open. A collapsed fold still reports its contents
     * visible to `isVisible`, so the state is read from which of the link's
     * two spans is shown (`toggleExtras-active` = open).
     */
    async isOtherContextsOpen() {
        return this.otherContextsLink().locator('.toggleExtras-active').isVisible();
    }

    /** The visible text of the fold's link (its inactive or active span). */
    otherContextsLinkText() {
        return this.otherContextsLink().locator(
            '.toggleExtras-inactive:visible, .toggleExtras-active:visible'
        );
    }

    /** The "Reviewing interests" typing box (absent where the app offers none). */
    interestsInput() {
        return this.form('roles').locator('#interests ul.tagit li.tagit-new input');
    }

    /** The saved interest chips, in order. */
    interestChips() {
        return this.form('roles').locator('#interests ul.tagit .tagit-label');
    }

    /**
     * The words offered while typing an interest (the jQuery UI autocomplete
     * menu tag-it opens under the box; Rule 8d).
     */
    interestSuggestions() {
        return this.page.locator('ul.tagit-autocomplete .ui-menu-item-wrapper');
    }

    /** Type into the interests box without ending the word (the suggestions open). */
    async typeInterest(text) {
        const input = this.interestsInput();
        await input.click();
        await input.pressSequentially(text);
    }

    /**
     * Type one interest and end it with Enter or a comma (both add a chip).
     *
     * @param {string} text
     * @param {{terminator?: 'Enter'|','}} [options]
     */
    async addInterest(text, {terminator = 'Enter'} = {}) {
        const input = this.interestsInput();
        await input.click();
        await input.pressSequentially(text);
        if (terminator === 'Enter') {
            await input.press('Enter');
        } else {
            await input.pressSequentially(',');
        }
        await expect(this.interestChips().filter({hasText: text})).toHaveCount(1);
    }

    // ---------------------------------------------------------------------
    // Public (Rule 9)
    // ---------------------------------------------------------------------

    /** The uploader's hidden file input. */
    imageFileInput() {
        return this.form('public').locator('#plupload input[type="file"]');
    }

    /** The uploader's error line (a refused file's sentence). */
    uploaderError() {
        return this.form('public').locator('#plupload .pkpUploaderError');
    }

    /** The "Delete" button under an existing image (absent without one). */
    deleteImageButton() {
        return this.form('public').getByRole('button', {name: 'Delete', exact: true});
    }

    /**
     * Choose an image file. A success reloads the whole page on the Public
     * tab (`?uniq=…#publicProfile`); this waits for that reload and the tab.
     * Register a dialog handler before calling this: a refused file raises a
     * browser alert.
     */
    async uploadImage(filePath) {
        // The success path is a JavaScript redirect to `?uniq=…#publicProfile`:
        // a full page load, awaited as such (the current address may already
        // carry the anchor, so a URL wait would resolve too early).
        const uploaded = waitForAnswer(this.page, (request) => /upload-profile-image/.test(request.url()), 'profile image upload');
        const reloaded = this.page.waitForEvent('load', {timeout: 30_000});
        await this.imageFileInput().setInputFiles(filePath);
        await uploaded;
        await reloaded;
        await this.expectOpen('public');
    }

    /**
     * Choose a file and wait for nothing: the refusal paths (Rule 9a), where
     * the caller reads `uploaderError()`, the browser alert it registered a
     * handler for, and the absence of a reload.
     */
    async chooseImageFile(filePath) {
        await this.imageFileInput().setInputFiles(filePath);
    }

    /** Press "Delete" under the image; the page reloads on the Public tab. */
    async deleteImage() {
        const deleted = waitForAnswer(this.page, (request) => /delete-profile-image/.test(request.url()), 'profile image delete');
        const reloaded = this.page.waitForEvent('load', {timeout: 30_000});
        await this.deleteImageButton().click();
        await deleted;
        await reloaded;
        await this.expectOpen('public');
    }

    /** The bio statement's rich-text editor body (one per form language). */
    bioEditorBody(locale = 'en') {
        return this.form('public')
            .frameLocator(`iframe[id^="biography-${locale}"], iframe[id^="biography"]`)
            .locator('body');
    }

    /** Wait for the bio editor to be ready before typing into it. */
    async expectBioEditorReady() {
        await expect(this.form('public').locator('iframe[id^="biography"]').first()).toBeVisible({
            timeout: 30_000,
        });
        await this.page.waitForFunction(
            () => {
                const editors = (window.tinymce && window.tinymce.get()) || [];
                return editors.some((editor) => /^biography/.test(editor.id) && editor.initialized);
            },
            undefined,
            {timeout: 30_000}
        );
    }

    homepage() {
        return this.form('public').locator('input[name="userUrl"]');
    }

    // ---------------------------------------------------------------------
    // Password (Rule 10)
    // ---------------------------------------------------------------------

    currentPassword() {
        return this.form('password').locator('input[name="oldPassword"]');
    }

    newPassword() {
        return this.form('password').locator('input[name="password"]');
    }

    repeatPassword() {
        return this.form('password').locator('input[name="password2"]');
    }

    /** The in-tab refusal notice headed "Errors occurred processing this form". */
    passwordErrorNotice() {
        return this.form('password').locator('.pkp_notification', {
            hasText: 'Errors occurred processing this form',
        });
    }

    /** The sentence shown under "New password" in place of its hint. */
    newPasswordSubLabel() {
        return this.form('password').locator('label[for^="password-"], label.sub_label[for^="password"]').first();
    }

    /** The tab's "Cancel" link (Rule 10c). */
    passwordCancelLink() {
        return this.form('password').getByRole('link', {name: 'Cancel', exact: true});
    }

    /** Fill the three boxes. */
    async fillPasswords({current, next, repeat = next}) {
        await this.currentPassword().fill(current);
        await this.newPassword().fill(next);
        await this.repeatPassword().fill(repeat);
    }

    // ---------------------------------------------------------------------
    // Notifications (Rule 11)
    // ---------------------------------------------------------------------

    /** The tab's opening sentence (`notification.settingsDescription`). */
    notificationsIntro() {
        return this.form('notifications').locator('p').first();
    }

    /** The tab's group headings, in order. */
    notificationGroups() {
        return this.form('notifications').locator('h4');
    }

    /**
     * One event row: the `.section` holding the row's sentence (a `label`
     * at the top of its `ul.checkbox_and_radiobutton`) and its two boxes.
     */
    notificationRow(sentence) {
        return this.form('notifications')
            .locator('.section')
            .filter({has: this.page.locator('ul.checkbox_and_radiobutton > label', {hasText: sentence})});
    }

    /**
     * The tab as data: `[{group, rows: [sentence, …]}, …]` in screen order
     * (the `h4` headings and the `.section` rows are siblings inside
     * `#notificationSettings`, so the grouping is read from the DOM order).
     */
    async notificationTable() {
        return this.form('notifications').evaluate((form) => {
            const groups = [];
            for (const node of form.querySelectorAll('#notificationSettings > h4, #notificationSettings > .section')) {
                if (node.tagName === 'H4') {
                    groups.push({group: node.textContent.trim(), rows: []});
                    continue;
                }
                const label = node.querySelector('ul.checkbox_and_radiobutton > label');
                if (label && groups.length) {
                    groups[groups.length - 1].rows.push(label.textContent.trim());
                }
            }
            return groups;
        });
    }

    /** Every row's sentence, in screen order, groups flattened. */
    async notificationSentences() {
        const table = await this.notificationTable();
        return table.flatMap((entry) => entry.rows);
    }

    /** All "Enable these types of notifications." boxes. */
    allowBoxes() {
        return this.form('notifications').getByRole('checkbox', {
            name: 'Enable these types of notifications.',
            exact: true,
        });
    }

    /** All "Do not send me an email for these types of notifications." boxes. */
    emailBoxes() {
        return this.form('notifications').getByRole('checkbox', {
            name: 'Do not send me an email for these types of notifications.',
            exact: true,
        });
    }

    /** One row's pair, by its setting name (e.g. `notificationNewAnnouncement`). */
    notificationPair(settingName) {
        const emailName = `email${settingName.charAt(0).toUpperCase()}${settingName.slice(1)}`;
        return {
            allow: this.form('notifications').locator(`input#${settingName}`),
            email: this.form('notifications').locator(`input#${emailName}`),
        };
    }

    // ---------------------------------------------------------------------
    // API Key (Rule 12)
    // ---------------------------------------------------------------------

    apiKeyBox() {
        return this.form('apiKey').locator('input[name="apiKey"]');
    }

    createApiKeyButton() {
        return this.form('apiKey').getByRole('button', {name: 'Create API Key', exact: true});
    }

    deleteApiKeyButton() {
        return this.form('apiKey').getByRole('button', {name: 'Delete', exact: true});
    }

    /** The note under the button (generate warning or remove warning). */
    apiKeyNote() {
        return this.form('apiKey').locator('p').first();
    }

    /** Press "Create API Key" (no confirmation) and wait for the tab to re-render. */
    async createApiKey() {
        const saved = this.waitForSave();
        await this.createApiKeyButton().click();
        await saved;
        await waitForJQueryIdle(this.page);
    }

    /**
     * Press "Delete". It raises the browser's own `confirm()`: with
     * `confirm: true` OK is pressed and the re-render awaited; with
     * `confirm: false` Cancel is pressed, nothing is sent and nothing is
     * awaited (the caller pairs that with its own positive control).
     */
    async deleteApiKey({confirm = true} = {}) {
        const answered = this.page.waitForEvent('dialog', {timeout: 30_000}).then((dialog) =>
            confirm ? dialog.accept() : dialog.dismiss()
        );
        if (!confirm) {
            await this.deleteApiKeyButton().click();
            await answered;
            return;
        }
        const saved = this.waitForSave();
        await this.deleteApiKeyButton().click();
        await answered;
        await saved;
        await waitForJQueryIdle(this.page);
    }
};
