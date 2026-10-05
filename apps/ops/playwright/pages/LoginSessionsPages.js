// @ts-check
/**
 * @file playwright/pages/LoginSessionsPages.js
 *
 * OPS-local page objects for the Login & sessions suite (U01): the top-right
 * user menu and its "Logout" / "Logout as" entries, the Login As
 * confirmation dialog, the Users & Roles table's columns and row menu, the
 * lost-password and set-a-new-password pages, the two refusal pages of a
 * hand-built Login As address (OPS wording: "servers you do not manage"),
 * and the session helpers (an anonymous context, a fresh UI sign-in, a
 * "browser restart" that carries only the expiry-dated cookies).
 *
 * The Login form itself is the shared `LoginPage`; the Users & Roles page
 * (its navigation and search) is `UserInvitationPages.UsersRolesPage`; the
 * workflow's Participants panel is read through `[data-cy="participant-manager"]`
 * in the suite.
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');

const LOGIN_AS_CONFIRM =
    'Log in as this user? All actions you perform will be attributed to this user.';
const LOGGED_IN_AS = 'You are currently logged in as';

/**
 * The top-right user menu (initials button + its dropdown). While
 * impersonating, the button carries both usernames and the dropdown reads
 * "You are currently logged in as {username}" with "Logout as {username}"
 * links (two: one in that sentence, one in the entry list) and no plain
 * "Logout" (Rules 6, 13).
 */
exports.UserMenu = class UserMenu extends BasePage {
    constructor(page) {
        super(page);
        this.root = page.locator('[data-cy="app-user-nav"]');
        this.button = this.root.getByRole('button').first();
        this.logoutLink = this.root.getByRole('link', {name: 'Logout', exact: true});
        this.loggedInAsLine = this.root.getByText(LOGGED_IN_AS);
    }

    /** "Logout as {username}" (the first of the two identical links). */
    logoutAsLink(username) {
        return this.root.getByRole('link', {name: `Logout as ${username}`}).first();
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

    /** Press "Logout as {username}" and wait to land away from /login (Rule 15). */
    async logoutAs(username) {
        await this.open();
        await this.logoutAsLink(username).click();
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
 * The Users & Roles "Current Users" table and its row menu (a headlessui
 * menu whose button is labelled by a raw locale key, `##userAccess.management.options##`):
 * the column headers, a row by its text, open a row's menu, read its items,
 * close it, or choose one.
 */
exports.UsersRolesTable = class UsersRolesTable extends BasePage {
    constructor(page) {
        super(page);
        this.pageHeading = page.getByRole('heading', {name: 'Users & Roles'});
        this.table = page.getByRole('table', {name: /Current Users \(/});
        this.columnHeaders = this.table.getByRole('columnheader');
        this.items = page.getByRole('menuitem');
    }

    /** A Current Users row carrying the given text (an email address is unique). */
    row(text) {
        return this.table.getByRole('row').filter({hasText: text});
    }

    menuItem(name) {
        return this.items.filter({hasText: name});
    }

    /** @param {import('@playwright/test').Locator} row */
    async openMenu(row) {
        await row.getByRole('button', {name: /management.options|^More Actions$/i}).click();
        await expect(this.items.first()).toBeVisible();
    }

    async closeMenu() {
        // headlessui moves focus into the menu a frame after the button's
        // click and handles Escape only there; an Escape sent to the page
        // in that frame hits the button and is ignored (ci-triage, U01 S7,
        // 2026-09-13). Pressing it on the menu itself focuses it first.
        await this.items.first().locator('xpath=ancestor::*[@role="menu"][1]').press('Escape');
        await expect(this.items).toHaveCount(0);
    }

    /**
     * Open a row's menu and choose one item.
     *
     * @param {import('@playwright/test').Locator} row
     * @param {string} itemLabel
     */
    async rowAction(row, itemLabel) {
        await this.openMenu(row);
        await this.page.getByRole('menuitem', {name: itemLabel, exact: true}).click();
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
        this.submitButton = this.form.locator('button[type="submit"]');
        this.confirmation = page.getByText(
            'A confirmation has been sent to your email address if a matching account was found. Please follow the instructions in the email to reset your password.'
        );
        // Scoped to the message body: the site nav carries its own Login link.
        this.loginLink = page.getByRole('main').getByRole('link', {name: 'Login', exact: true});
        this.forgotLink = page.getByRole('link', {name: 'Forgot your password?'});
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
        this.deadLinkBack = page.getByRole('main').getByRole('link', {name: 'Reset Password', exact: true});
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
 * The two refusal pages of a hand-built `login/signInAsUser/{id}` address
 * (Rules 14, 17): the role gate's access-denied page, and the reach
 * refusal a Preprint Server Manager gets for an out-of-reach user.
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
            page.getByText('The user is active in servers you do not manage'),
            page.getByText('This task must be performed by a site administrator.'),
        ];
        this.usersListLink = page.getByRole('link', {name: 'All Enrolled Users'});
    }

    async gotoSignInAs(contextPath, userId) {
        await this.page.goto(this.contextUrl(contextPath, `/login/signInAsUser/${userId}`));
    }
};

/**
 * Login As from a "Current Users" row of Users & Roles, confirmed with OK
 * (U03 S11's given): the row's menu, "Login As", the dialog's OK, then the
 * impersonated user's own landing (an Author's My Submissions). Returns the
 * `login/signInAsUser/{id}` address the browser visited.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} row
 */
exports.loginAsFromUsersRow = async function loginAsFromUsersRow(page, row) {
    const usersTable = new exports.UsersRolesTable(page);
    const dialog = new exports.LoginAsDialog(page);
    await usersTable.rowAction(row, 'Login As');
    await dialog.expectOpen();
    const address = await dialog.ok();
    await page.waitForURL(/\/dashboard\//, {waitUntil: 'commit', timeout: 30_000});
    return address;
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
 * server's, for every flow that will end or migrate its session (sign-out,
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

exports.LOGIN_AS_CONFIRM = LOGIN_AS_CONFIRM;
