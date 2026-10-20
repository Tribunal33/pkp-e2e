// @ts-check
/**
 * @file playwright/pages/LoginSessionsPages.js
 *
 * OJS-local page objects for the Login & sessions suite (U01): the top-right
 * user menu and its "Logout" / "Logout as" entries, the reader-facing
 * pages' user menu, the Login As confirmation dialog, the Users & Roles row
 * menu, the lost-password and set-a-new-password pages, the forced "Change
 * Password" form, the review stage's "Create New Reviewer" form, the two
 * refusal pages of a hand-built Login As address, the Login form's refusal
 * line (the generic failure, the disabled-account sentence), and the session helpers
 * (an anonymous context, a fresh UI sign-in, a "browser restart" that
 * carries only the expiry-dated cookies).
 *
 * The Login form itself is the shared `LoginPage`; the workflow's
 * Participants panel is `ReviewStagePages.WorkflowPage.participantMoreActions`;
 * the Users & Roles table is `UserInvitationPages.UsersRolesPage`.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');

const LOGIN_AS_CONFIRM =
    'Log in as this user? All actions you perform will be attributed to this user.';
const LOGGED_IN_AS = 'You are currently logged in as';
const GENERIC_LOGIN_ERROR = 'Invalid username/email or password. Please try again.';
const ACCOUNT_DISABLED =
    'Your account has been disabled. Please contact the administrator for more information.';

/**
 * The top-right user menu (initials button + its dropdown). While
 * impersonating, the button carries both usernames and two initials badges
 * (the impersonator's own, muted, with the impersonated account's overlaid
 * in a warning color), and the dropdown reads "You are currently logged in
 * as {username}" with "Logout as {username}" links (two: one in that
 * sentence, one in the entry list after "Edit Profile", where "Logout"
 * stood) and no plain "Logout" (Rules 6, 13).
 */
exports.UserMenu = class UserMenu extends BasePage {
    constructor(page) {
        super(page);
        this.root = page.locator('[data-cy="app-user-nav"]');
        this.button = this.root.getByRole('button').first();
        this.logoutLink = this.root.getByRole('link', {name: 'Logout', exact: true});
        this.loggedInAsLine = this.root.getByText(LOGGED_IN_AS);
        // The initials badges on the button: one outside an impersonation,
        // two during one (the button holds no other block element).
        this.initials = this.button.locator(':scope > div');
        // The menu's own entries, under the language list when the journal
        // has more than one language: "Edit Profile", then the way out.
        this.entries = this.root
            .getByRole('list')
            .filter({has: page.getByRole('link', {name: 'Edit Profile'})})
            .getByRole('listitem');
    }

    /** "Logout as {username}" (the first of the two identical links). */
    logoutAsLink(username) {
        return this.root.getByRole('link', {name: `Logout as ${username}`}).first();
    }

    /** The second "Logout as {username}": the entry after "Edit Profile". */
    logoutAsEntry(username) {
        return this.entries.getByRole('link', {name: `Logout as ${username}`});
    }

    /** The text color and the fill of one initials badge, as the browser paints them. */
    async badgeColors(index) {
        return this.initials.nth(index).evaluate((el) => {
            const style = getComputedStyle(el);
            return {color: style.color, fill: style.backgroundColor};
        });
    }

    /**
     * The button of a user's own session: one initials badge, the user's
     * own, followed by their username. Returns the badge's colors, the
     * reference `expectImpersonationBadges` reads "muted" against.
     *
     * @param {{initials: string, username: string}} own
     */
    async expectOwnBadge(own) {
        await this.stylesApplied();
        await expect(this.initials).toHaveText([own.initials]);
        await expect(this.button).toContainText(own.username);
        return this.badgeColors(0);
    }

    /**
     * The button while impersonating (Rule 13): two initials badges, the
     * impersonator's own first and muted (the disabled text color, no longer
     * the color it has in their own session), the impersonated account's
     * second, smaller, filled with the warning color and laid over the
     * first; each is followed by its username.
     *
     * @param {{initials: string, username: string}} own the impersonator
     * @param {{initials: string, username: string}} worn the impersonated account
     * @param {{color: string, fill: string}} ownColors what `expectOwnBadge` returned in the impersonator's own session
     */
    async expectImpersonationBadges(own, worn, ownColors) {
        await this.stylesApplied();
        await expect(this.initials).toHaveText([own.initials, worn.initials]);
        // The reading order on the button: each badge, then its username.
        await expect(this.button).toHaveText(
            new RegExp(`^\\s*${own.initials}\\s*${escapeRegExp(own.username)}\\s*${worn.initials}\\s*${escapeRegExp(worn.username)}\\s*$`)
        );
        const base = this.initials.nth(0);
        const overlay = this.initials.nth(1);
        // Muted: the disabled text color, on the fill the badge keeps.
        await expect(base).toHaveClass(/(^|\s)text-disabled(\s|$)/);
        await expect(base).not.toHaveClass(/(^|\s)text-primary(\s|$)/);
        const muted = await this.badgeColors(0);
        expect(muted.color, "the impersonator's initials are no longer in their own-session color").not.toBe(
            ownColors.color
        );
        expect(muted.fill, "the impersonator's badge keeps its fill").toBe(ownColors.fill);
        // The warning color: the negative fill, unlike the base badge's.
        await expect(overlay).toHaveClass(/(^|\s)bg-negative(\s|$)/);
        const warning = await this.badgeColors(1);
        expect(warning.fill, 'the impersonated badge is filled, in another color than the base badge').not.toBe(
            muted.fill
        );
        expect(warning.fill).not.toBe('rgba(0, 0, 0, 0)');
        expect(warning.color, 'the warning badge prints its initials in another color than the muted one').not.toBe(
            muted.color
        );
        // Overlaid: positioned out of the flow, its box cutting into the base badge's.
        await expect(overlay).toHaveCSS('position', 'absolute');
        const [baseBox, overlayBox] = [await base.boundingBox(), await overlay.boundingBox()];
        expect(baseBox && overlayBox, 'both badges have a box').toBeTruthy();
        expect(overlayBox.x, 'the overlay starts inside the base badge').toBeLessThan(baseBox.x + baseBox.width);
        expect(overlayBox.x + overlayBox.width).toBeGreaterThan(baseBox.x);
        expect(overlayBox.y).toBeLessThan(baseBox.y + baseBox.height);
        expect(overlayBox.y + overlayBox.height).toBeGreaterThan(baseBox.y);
        expect(overlayBox.width, 'the overlay is the smaller badge').toBeLessThan(baseBox.width);
    }

    async open() {
        await this.button.click();
        await expect(this.root.getByRole('link', {name: 'Edit Profile'})).toBeVisible();
    }

    /**
     * Close the dropdown by toggling its button again (the component closes
     * on blur/toggle, not on Escape); open, it covers controls beneath it.
     */
    async close() {
        await this.button.click();
        await expect(this.root.getByRole('link', {name: 'Edit Profile'})).toHaveCount(0);
    }

    /** Open the menu, read the href behind "Logout", close it (Rule 15). */
    async captureLogoutHref() {
        await this.open();
        const href = await this.logoutLink.getAttribute('href');
        await this.close();
        expect(href, 'the href behind "Logout"').toBeTruthy();
        return /** @type {string} */ (href);
    }

    /** Press "Logout" and wait for the Login page (Rule 6). */
    async logout() {
        await this.open();
        await this.logoutLink.click();
        await this.page.waitForURL(/\/login/, {waitUntil: 'commit', timeout: 15_000});
    }

    /**
     * Press "Logout as {username}" and wait to land away from /login
     * (Rule 15): the link in the "You are currently logged in as" sentence,
     * or with `entry` the one after "Edit Profile".
     *
     * @param {string} username
     * @param {{entry?: boolean}} [options]
     */
    async logoutAs(username, {entry = false} = {}) {
        await this.open();
        await (entry ? this.logoutAsEntry(username) : this.logoutAsLink(username)).click();
        await this.page.waitForURL((url) => !url.pathname.includes('/login'), {
            waitUntil: 'commit',
            timeout: 30_000,
        });
    }

    /**
     * The menu carries no impersonation line and offers the plain "Logout"
     * (the positive control of the same read). Leaves the menu closed.
     */
    async expectOwnSession() {
        await this.open();
        await expect(this.logoutLink).toBeVisible();
        await expect(this.loggedInAsLine).toHaveCount(0);
        await this.close();
    }

    /**
     * The menu's entry list in a user's own session: "Edit Profile", then
     * "Logout" (the place the second "Logout as" takes while impersonating).
     * Leaves the menu closed.
     */
    async expectOwnEntries() {
        await this.open();
        await expect(this.entries).toHaveText(['Edit Profile', 'Logout']);
        await this.close();
    }

    /**
     * While impersonating, the menu shows "Logout as {username}" twice: in
     * the "You are currently logged in as" sentence, and a second time as
     * the entry after "Edit Profile", where "Logout" stood (Rule 13); both
     * lead to the same address. Leaves the menu closed.
     */
    async expectLogoutAsTwice(username) {
        await this.open();
        const links = this.root.getByRole('link', {name: `Logout as ${username}`});
        await expect(links).toHaveCount(2);
        await expect(this.entries).toHaveText(['Edit Profile', `Logout as ${username}`]);
        await expect(this.logoutAsEntry(username)).toBeVisible();
        // The first one sits in the sentence, outside the entry list.
        await expect(
            this.root.getByText(`${LOGGED_IN_AS} ${username}`).getByRole('link', {name: `Logout as ${username}`})
        ).toBeVisible();
        const hrefs = await links.evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href')));
        expect(hrefs[0], 'both "Logout as" links lead to the same address').toBe(hrefs[1]);
        expect(hrefs[0]).toMatch(/\/login\/signOutAsUser/);
        await this.close();
    }

    /**
     * The menu says "You are currently logged in as {username}", offers
     * "Logout as {username}" and no plain "Logout". Leaves the menu closed.
     */
    async expectImpersonating(username) {
        await expect(this.button).toContainText(username);
        await this.open();
        await expect(this.root.getByText(`${LOGGED_IN_AS} ${username}`)).toBeVisible();
        await expect(this.logoutAsLink(username)).toBeVisible();
        await expect(this.logoutLink).toHaveCount(0);
        await this.close();
    }
};

/**
 * The user menu of the reader-facing pages (the site home page, a journal's
 * home page): the signed-in username at the top right, which opens a short
 * list ending in "Logout".
 */
exports.SiteUserMenu = class SiteUserMenu extends BasePage {
    constructor(page) {
        super(page);
        this.root = page.locator('#navigationUser');
        this.logoutLink = this.root.getByRole('link', {name: 'Logout', exact: true});
    }

    /** The menu's own link: the signed-in username. */
    toggle(username) {
        return this.root.getByRole('link', {name: username, exact: true});
    }

    /**
     * Open the menu and press "Logout"; lands on the Login page (Rule 6).
     * The name is a plain link until the theme's script turns it into a
     * drop-down (`data-toggle="dropdown"`, default theme `js/main.js`); a
     * press before that follows the link and the menu never opens (seen on
     * the OMP suite, CI 37724191553), so the press waits for the marker.
     */
    async logout(username) {
        await expect(this.toggle(username)).toHaveAttribute('data-toggle', 'dropdown');
        await this.toggle(username).click();
        await expect(this.logoutLink).toBeVisible();
        await this.logoutLink.click();
        await this.page.waitForURL(/\/login/, {waitUntil: 'commit', timeout: 15_000});
    }
};

/** The Login As confirmation dialog (Rule 12): a page dialog of the app. */
exports.LoginAsDialog = class LoginAsDialog extends BasePage {
    constructor(page) {
        super(page);
        this.dialog = page.getByRole('dialog').filter({hasText: LOGIN_AS_CONFIRM});
        this.okButton = this.dialog.getByRole('button', {name: 'OK', exact: true});
        this.cancelButton = this.dialog.getByRole('button', {name: 'Cancel', exact: true});
    }

    async expectOpen() {
        await expect(this.dialog).toBeVisible();
        await expect(this.dialog.getByText(LOGIN_AS_CONFIRM)).toBeVisible();
        await expect(this.okButton).toBeVisible();
        await expect(this.cancelButton).toBeVisible();
    }

    async cancel() {
        await this.cancelButton.click();
        await expect(this.dialog).toHaveCount(0);
    }

    /**
     * Press OK and return the address the browser visited for it
     * (`…/login/signInAsUser/{id}`, a GET that 302s on, so the history never
     * holds it; the request is the only place to copy it from).
     */
    async ok() {
        const request = this.page.waitForRequest((req) => req.url().includes('/login/signInAsUser/'));
        await this.okButton.click();
        return (await request).url();
    }
};

/**
 * The Users & Roles row menu (a headlessui menu that portals to the document
 * root): open it on a row, read its items, close it with Escape.
 */
exports.UsersRolesMenu = class UsersRolesMenu extends BasePage {
    constructor(page) {
        super(page);
        this.searchBox = page.getByRole('searchbox');
        this.items = page.getByRole('menuitem');
    }

    /** Narrow the Current Users table by a name (the search commits on Enter). */
    async search(term) {
        await this.searchBox.fill(term);
        await this.searchBox.press('Enter');
    }

    menuItem(name) {
        return this.items.filter({hasText: name});
    }

    /** @param {import('@playwright/test').Locator} row */
    async open(row) {
        await row.getByRole('button', {name: /management.options|^More Actions$/i}).click();
        await expect(this.items.first()).toBeVisible();
    }

    async close() {
        // headlessui moves focus into the menu a frame after the button's
        // click and handles Escape only there; an Escape sent to the page
        // in that frame hits the button and is ignored (ci-triage, U01 S7,
        // 2026-09-13). Pressing it on the menu itself focuses it first.
        await this.items.first().locator('xpath=ancestor::*[@role="menu"][1]').press('Escape');
        await expect(this.items).toHaveCount(0);
    }
};

/** "Forgot your password?" → the lost-password form (title "Reset Password"). */
exports.LostPasswordPage = class LostPasswordPage extends BasePage {
    constructor(page) {
        super(page);
        this.heading = page.getByRole('heading', {name: 'Reset Password'});
        this.instruction = page.getByText(
            'Enter your account email address below and an email will be sent with instructions on how to reset your password.'
        );
        this.form = page.locator('form#lostPasswordForm');
        this.emailInput = page.locator('input#email');
        // The box as the page names it: "Registered user's email".
        this.emailField = this.form.getByLabel("Registered user's email");
        this.submitButton = this.form.locator('button[type="submit"]');
        this.confirmation = page.getByText(
            'A confirmation has been sent to your email address if a matching account was found. Please follow the instructions in the email to reset your password.'
        );
        // Scoped to the message body: the site nav carries its own Login link.
        this.loginLink = page.getByRole('main').getByRole('link', {name: 'Login', exact: true});
        this.forgotLink = page.getByRole('link', {name: 'Forgot your password?'});
    }

    async gotoContext(contextPath) {
        await this.page.goto(this.contextUrl(contextPath, '/login/lostPassword'));
    }

    /**
     * The lost-password page is on screen, asking for "Registered user's
     * email": its heading, its instruction and the labelled box, empty.
     */
    async expectForm() {
        await this.page.waitForURL(/\/login\/lostPassword/, {waitUntil: 'commit', timeout: 15_000});
        await expect(this.heading).toBeVisible();
        await expect(this.instruction).toBeVisible();
        await expect(this.form).toBeVisible();
        await expect(this.emailField).toBeVisible();
        await expect(this.emailField).toHaveValue('');
        await expect(this.emailField).toHaveAttribute('id', 'email');
    }

    /** From the Login page, press "Forgot your password?" (Rule 7). */
    async openFromLogin() {
        await this.forgotLink.click();
        await expect(this.heading).toBeVisible();
        await expect(this.instruction).toBeVisible();
    }

    /** Type an address and submit; the generic answer with its Login link. */
    async request(email) {
        await this.emailInput.fill(email);
        await this.submitButton.click();
        await expect(this.confirmation).toBeVisible();
        await expect(this.loginLink).toBeVisible();
    }
};

/** The set-a-new-password form the emailed link opens (Rule 9). */
exports.ResetPasswordPage = class ResetPasswordPage extends BasePage {
    constructor(page) {
        super(page);
        this.heading = page.getByRole('heading', {name: 'Reset Password'});
        this.passwordInput = page.locator('input[name="password"]');
        this.password2Input = page.locator('input[name="password2"]');
        this.saveButton = page.getByRole('button', {name: 'Save', exact: true});
        this.updated = page.getByText(
            'Password has been updated successfully. Please login with updated password.'
        );
        this.loginLink = page.getByRole('main').getByRole('link', {name: 'Login', exact: true});
        this.deadLink = page.getByText(
            'Sorry, the link you clicked on has expired or is not valid. Please try resetting your password again.'
        );
        this.deadLinkBack = page.getByRole('link', {name: 'Reset Password', exact: true});
    }

    async expectForm() {
        await expect(this.heading).toBeVisible();
        await expect(this.passwordInput).toBeVisible();
    }

    async setPassword(password) {
        await this.expectForm();
        await this.passwordInput.fill(password);
        await this.password2Input.fill(password);
        await this.saveButton.click();
        await expect(this.updated).toBeVisible();
        await expect(this.loginLink).toBeVisible();
    }

    async expectDeadLink() {
        await expect(this.deadLink).toBeVisible();
        await expect(this.deadLinkBack).toBeVisible();
    }
};

/**
 * The "Change Password" form a flagged account's sign-in diverts to
 * (Rule 11): "Login" prefilled, "Current password", "New password" and
 * "Repeat new password", then "OK".
 */
exports.ChangePasswordPage = class ChangePasswordPage extends BasePage {
    constructor(page) {
        super(page);
        this.heading = page.getByRole('heading', {name: 'Change Password'});
        this.explanation = page.getByText('You must choose a new password before you can log in to this site.');
        this.form = page.locator('form#loginChangePassword');
        this.usernameInput = this.form.locator('input[name="username"]');
        this.currentPasswordInput = this.form.locator('input[name="oldPassword"]');
        this.passwordInput = this.form.locator('input[name="password"]');
        this.password2Input = this.form.locator('input[name="password2"]');
        this.okButton = this.form.getByRole('button', {name: 'OK', exact: true});
    }

    /** The form took the place of a landing; the username arrives prefilled. */
    async expectForm(username) {
        await this.page.waitForURL(/\/login\/changePassword/, {waitUntil: 'commit', timeout: 15_000});
        await expect(this.heading).toBeVisible();
        await expect(this.explanation).toBeVisible();
        await expect(this.usernameInput).toHaveValue(username);
    }

    /** Type the current password and the new one twice, press "OK" (no wait for the landing). */
    async change(currentPassword, newPassword) {
        await this.currentPasswordInput.fill(currentPassword);
        await this.passwordInput.fill(newPassword);
        await this.password2Input.fill(newPassword);
        await this.okButton.click();
    }
};

/**
 * The review stage's "Add Reviewer" window on its "Create New Reviewer"
 * form (Rule 11a): the account it creates is flagged for a password change
 * and emailed a generated password. The form itself belongs to the
 * reviewer-assignment feature; this is the path scenario 6 walks to it.
 */
exports.CreateReviewerWindow = class CreateReviewerWindow extends BasePage {
    constructor(page) {
        super(page);
        this.addReviewerButton = page.getByRole('button', {name: 'Add Reviewer', exact: true});
        this.searchWindow = page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')});
        // "Create New Reviewer" swaps the search list for the form by AJAX,
        // so the window is found again by the form it then carries.
        this.createWindow = page.getByRole('dialog').filter({has: page.locator('form#createReviewerForm')});
        this.form = this.createWindow.locator('form#createReviewerForm');
    }

    /**
     * "Add Reviewer", "Create New Reviewer", the four boxes, "Add Reviewer":
     * the window closes.
     *
     * @param {{givenName: string, familyName: string, username: string, email: string}} reviewer
     */
    async create({givenName, familyName, username, email}) {
        await this.addReviewerButton.click();
        const createLink = this.searchWindow.getByRole('link', {name: 'Create New Reviewer'});
        await expect(createLink).toBeVisible({timeout: 30_000});
        await createLink.click();
        await expect(this.form.locator('input[name="username"]')).toBeVisible({timeout: 30_000});
        await this.form.locator('input[name="givenName[en]"]').fill(givenName);
        await this.form.locator('input[name="familyName[en]"]').fill(familyName);
        await this.form.locator('input[name="username"]').fill(username);
        await this.form.locator('input[name="email"]').fill(email);
        await this.form.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
        await expect(this.createWindow).toHaveCount(0, {timeout: 30_000});
    }
};

/**
 * The two refusal pages of a hand-built `login/signInAsUser/{id}` address
 * (Rules 14, 17): the role gate's access-denied page, and the reach
 * refusal a Journal Manager gets for an out-of-reach user.
 */
exports.LoginAsRefusalPage = class LoginAsRefusalPage extends BasePage {
    constructor(page) {
        super(page);
        this.accessDenied = page.getByText('The current role does not have access to this operation.');
        this.outOfReach = page.getByText(
            'Sorry, you do not have administrative rights over this user. This may be because:'
        );
        this.causes = [
            page.getByText('The user is a site administrator'),
            page.getByText('The user is active in journals you do not manage'),
            page.getByText('This task must be performed by a site administrator.'),
        ];
        this.usersListLink = page.getByRole('link', {name: 'All Enrolled Users'});
    }

    async gotoSignInAs(contextPath, userId) {
        await this.page.goto(this.contextUrl(contextPath, `/login/signInAsUser/${userId}`));
    }
};

/**
 * The Login form's refusal line (`form#login .pkp_form_error`), shown above
 * the boxes when "Login" is refused (Rule 2): the generic failure, or the
 * disabled-account sentence a disabled account's correct password earns.
 * Each read is settled on the form's own answer: the refused form is back
 * (posted to `login/signIn`) with exactly one refusal line, its text the
 * expected sentence, and the other sentence absent from the page (the
 * positive control of that absence is the line itself, read the same way).
 */
exports.LoginRefusal = class LoginRefusal extends BasePage {
    constructor(page) {
        super(page);
        this.form = page.locator('form#login');
        this.line = this.form.locator('.pkp_form_error');
        this.usernameInput = page.locator('input#username');
    }

    /**
     * The refused form shows `sentence` as its one refusal line, keeps the
     * typed username, and shows no `otherSentence`; the user menu of a
     * signed-in page is absent.
     *
     * @param {string} sentence
     * @param {string} otherSentence
     * @param {string} username
     */
    async expectRefused(sentence, otherSentence, username) {
        await this.page.waitForURL(/\/login\/signIn/, {waitUntil: 'commit', timeout: 15_000});
        await expect(this.form).toBeVisible();
        await expect(this.line).toHaveCount(1);
        await expect(this.line).toHaveText(sentence);
        await expect(this.page.getByText(otherSentence)).toHaveCount(0);
        await expect(this.usernameInput).toHaveValue(username);
        await expect(this.page.locator('[data-cy="app-user-nav"]')).toHaveCount(0);
        await expect(this.page.locator('#navigationUser').getByRole('link', {name: 'Logout'})).toHaveCount(0);
    }

    /**
     * A disabled account's correct password: "Your account has been
     * disabled. Please contact the administrator for more information.",
     * not the generic failure (Rule 2).
     *
     * @param {string} username
     */
    async expectDisabled(username) {
        await this.expectRefused(ACCOUNT_DISABLED, GENERIC_LOGIN_ERROR, username);
    }

    /**
     * The generic failure, "Invalid username/email or password. Please try
     * again.", not the disabled sentence (Rule 2).
     *
     * @param {string} username
     */
    async expectGeneric(username) {
        await this.expectRefused(GENERIC_LOGIN_ERROR, ACCOUNT_DISABLED, username);
    }
};

/**
 * A fresh, explicitly-anonymous context (never inherits cached storage
 * state; parallel lesson 8). Callers close it themselves.
 */
exports.anonContext = async function anonContext(browser, baseURL) {
    return browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
};

/**
 * A fresh UI sign-in in its own context, on the site-level Login page or a
 * journal's, for every flow that will end or migrate its session (sign-out,
 * impersonation, a reset), so the shared .auth cache is never poisoned.
 */
exports.freshLogin = async function freshLogin(
    browser,
    baseURL,
    username,
    {password = getPassword(username), contextPath = null} = {}
) {
    const context = await exports.anonContext(browser, baseURL);
    const page = await context.newPage();
    const loginPage = new LoginPage(page);
    if (contextPath) {
        await loginPage.gotoContext(contextPath);
    } else {
        await loginPage.goto();
    }
    await loginPage.signIn(username, password);
    return {context, page};
};

/**
 * "Close the browser and open it again": a new context seeded with only the
 * signed-in context's cookies that carry an expiry date (a session cookie
 * with `expires: -1` dies with the browser, as it would on a real restart).
 * Returns the context and the names of the cookies carried over.
 */
exports.restartedContext = async function restartedContext(browser, baseURL, signedInContext) {
    const persistent = (await signedInContext.cookies()).filter((cookie) => cookie.expires > 0);
    const context = await exports.anonContext(browser, baseURL);
    await context.addCookies(persistent);
    return {context, carried: persistent.map((cookie) => cookie.name)};
};

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.LOGIN_AS_CONFIRM = LOGIN_AS_CONFIRM;
exports.ACCOUNT_DISABLED = ACCOUNT_DISABLED;
