// @ts-check
/**
 * @file playwright/pages/LoginSessionsPages.js
 *
 * U01 — Login & sessions, the OMP-side locators the suite needs beyond the
 * shared `LoginPage` (owned elsewhere): the Login page's "Keep me logged
 * in" box, the site-level Login page and site home, the Users & Roles
 * "Current Users" table (a Vue `<user-access-manager>`: search box, rows,
 * the per-row "More Actions" menu), the "Login As" page dialog, the
 * `login/signInAsUser/{id}` address and the two refusal pages it answers
 * with, the cookie filter that plays a browser restart (spec fn-s), the
 * user menu's impersonation reads and "Logout as {username}" (shared with
 * U03's S11), the top bar's initials (Rule 13), the Login page's own
 * region, the lost-password page's box and the public pages' user menu,
 * the disabled account's refusal (Rule 2) and the site-level Login page
 * reached from the site's own homepage (Rule 1).
 *
 * Function exports, the shape of `ReviewStagePages.js`; every function
 * takes the page (or a locator) it works on.
 */
const {expect} = require('@playwright/test');

const MSG = {
    accessDenied: 'The current role does not have access to this operation.',
    noAdminRights: 'Sorry, you do not have administrative rights over this user.',
    noAdminRightsCause: 'The user is active in presses you do not manage',
    /** The refusal's opening sentence whole, its listed causes and its closing line. */
    noAdminRightsLead:
        'Sorry, you do not have administrative rights over this user. This may be because:',
    noAdminRightsCauses: [
        'The user is a site administrator',
        'The user is active in presses you do not manage',
    ],
    noAdminRightsRemedy: 'This task must be performed by a site administrator.',
    lostPasswordInstruction:
        'Enter your account email address below and an email will be sent with instructions on how to reset your password.',
    confirmLoginAs:
        'Log in as this user? All actions you perform will be attributed to this user.',
    /** A disabled account's correct password, no reason recorded (Rule 2). */
    accountDisabled:
        'Your account has been disabled. Please contact the administrator for more information.',
};

/** The site's own home page (the press list) and its Login page. */
const siteHomeUrl = () => '/index.php/index';
const siteLoginUrl = () => '/index.php/index/en/login';

/** A press's Users & Roles screen. */
const usersScreenUrl = (contextPath) => `/index.php/${contextPath}/management/settings/access`;

/** The Login As address as the browser visits it from a users row. */
const signInAsUserUrl = (contextPath, userId) =>
    `/index.php/${contextPath}/login/signInAsUser/${userId}`;

/**
 * Open the site's own homepage and press "Login" at its top right: the
 * site-level Login page (Rule 1), its form shown.
 */
async function openSiteLogin(page) {
    await page.goto(siteHomeUrl());
    await page.getByRole('link', {name: 'Login', exact: true}).first().click();
    await expect(page).toHaveURL(new RegExp(`${siteLoginUrl()}$`));
    await expect(page.locator('form#login')).toBeVisible();
}

/** The Login page's answer to a disabled account's correct password (Rule 2). */
const accountDisabledMessage = (page) => page.getByText(MSG.accountDisabled);

/** The Login page's "Keep me logged in" box. */
const keepMeLoggedIn = (page) => page.getByLabel('Keep me logged in');

/**
 * The Login page's own region (the theme's `.page_login`: breadcrumb,
 * heading, any sentence above the form, the form), for reading whether a
 * held address added anything to the plain form (Rule 4).
 */
const loginPageBody = (page) => page.locator('.page_login');

/** The lost-password page's one box, by its label. */
const lostPasswordEmail = (page) => page.getByLabel("Registered user's email");

/** The forced "Change Password" form (Rule 11). */
const changePasswordForm = (page) => page.locator('form#loginChangePassword');

/**
 * The public pages' user menu (the theme's, top right of the site and press
 * home pages): the signed-in username, a drop-down under it.
 */
const publicUserMenu = (page) => page.locator('#navigationUser');

/**
 * Press "Logout" in the public pages' user menu: the Login page, signed out.
 * The name is a plain link until the theme's script turns it into a
 * drop-down (`data-toggle="dropdown"`, default theme `js/main.js`); a press
 * before that follows the link and the menu never opens (CI 37724191553),
 * so the press waits for the marker.
 */
async function logoutFromPublicMenu(page, username) {
    const menu = publicUserMenu(page);
    const name = menu.getByRole('link', {name: new RegExp(`^${username}`)}).first();
    await expect(name).toHaveAttribute('data-toggle', 'dropdown');
    await name.click();
    await menu.getByRole('link', {name: 'Logout', exact: true}).click();
    await page.waitForURL(/\/login/, {timeout: 15_000});
    await expect(page.locator('form#login')).toBeVisible();
}

/** The "Current Users" table of Users & Roles. */
const usersTable = (page) => page.getByRole('table', {name: /Current Users/});

/** The "Current Users" table's column headers, in order. */
const usersColumnHeaders = (page) => usersTable(page).getByRole('columnheader');

/**
 * Search the "Current Users" list (Enter commits) and wait for the list's
 * own response, so a row read afterwards is settled.
 * @returns {Promise<import('@playwright/test').Response>} the users API response
 */
async function searchUsers(page, phrase) {
    const box = page.getByRole('searchbox').first();
    await box.click();
    await box.fill('');
    await box.pressSequentially(phrase);
    const settled = page.waitForResponse((response) =>
        decodeURIComponent(response.url()).includes(`searchPhrase=${phrase}`)
    );
    await box.press('Enter');
    const response = await settled;
    await expect(usersTable(page)).toBeVisible();
    return response;
}

/** A "Current Users" row by a text it carries (a name or an address). */
const userRow = (page, text) => usersTable(page).getByRole('row').filter({hasText: text}).first();

/** Open a users row's "More Actions" menu; the items portal to the page. */
async function openUserRowMenu(page, row) {
    await row.getByRole('button', {name: /management[. ]options|^More Actions$/i}).click();
    await expect(page.getByRole('menuitem').first()).toBeVisible();
    return page.getByRole('menuitem');
}

/** Close an open row menu by pressing its button again (never Escape near a workflow dialog). */
async function closeUserRowMenu(row) {
    await row.getByRole('button', {name: /management[. ]options|^More Actions$/i}).click();
}

/** The "Login As" confirmation, a page dialog of the app (not a browser dialog). */
const loginAsDialog = (page) => page.locator('[data-cy="dialog"]').filter({hasText: 'Login As'});

/** The access-denied sentence of Rule 17 (the `user/authorizationDenied` page). */
const accessDeniedMessage = (page) => page.getByText(MSG.accessDenied);

/** The Rule 14 refusal for an out-of-reach user, its causes list and its way back. */
const noAdminRightsMessage = (page) => page.getByText(MSG.noAdminRights);
const noAdminRightsCause = (page) => page.getByText(MSG.noAdminRightsCause);
const usersListLink = (page) => page.getByRole('link', {name: 'All Enrolled Users'});
/** The refusal's opening sentence, its list of possible causes and its closing line. */
const noAdminRightsLead = (page) => page.getByText(MSG.noAdminRightsLead);
const noAdminRightsCauses = (page) => page.locator('.page_error .description li');
const noAdminRightsRemedy = (page) => page.getByText(MSG.noAdminRightsRemedy);

/**
 * The cookies a browser restart keeps: those carrying an expiry date. A
 * session-only cookie (`expires: -1`) dies with the browser.
 */
async function persistentCookies(context) {
    const cookies = await context.cookies();
    return cookies.filter((cookie) => cookie.expires > 0);
}

/**
 * The top-nav user menu (`TopNavActions.vue`). `.last()`: the workflow side
 * modal renders its own copy of the top nav above the page's, and the last
 * one is the interactive one.
 */
const userNav = (page) => page.locator('[data-cy="app-user-nav"]').last();

/**
 * The initials in the top bar's user button (`InitialsAvatar`): one, the
 * account's own; while impersonating two, the impersonator's own first and
 * the impersonated account's laid over it (Rule 13).
 */
const userNavAvatars = (page) => userNav(page).locator('> button > div');

/**
 * What tells the two initials apart while impersonating: the base one's
 * muted text (`text-disabled`) and the overlaid one's warning background
 * (`bg-negative`), the design system's own tokens.
 */
const AVATAR = {muted: /(^|\s)text-disabled(\s|$)/, warning: /(^|\s)bg-negative(\s|$)/};

/** The computed text and background colours of an avatar, and its box. */
async function avatarLook(avatar) {
    return avatar.evaluate((el) => {
        const style = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return {
            color: style.color,
            background: style.backgroundColor,
            position: style.position,
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
        };
    });
}

/**
 * The entries of the open user menu's own list (after the language list
 * and the impersonation line): "Edit Profile", then "Logout" or, while
 * impersonating, "Logout as {username}".
 */
const userMenuEntries = (nav) => nav.locator('ul').last().getByRole('link');

/** Open the user menu and return its nav element. */
async function openUserMenu(page) {
    await userNav(page).locator('> button').click();
    const nav = userNav(page).locator('nav');
    await expect(nav).toBeVisible();
    return nav;
}

/** Close the user menu by toggling its button (never Escape near a workflow dialog). */
async function closeUserMenu(page) {
    await userNav(page).locator('> button').click();
}

/** The user menu's plain "Logout" entry (absent while impersonating). */
const logoutLink = (nav) => nav.getByRole('link', {name: 'Logout', exact: true});

/**
 * The user menu holds no "You are currently logged in as" line: the
 * session is the account's own. The plain "Logout" entry is the positive
 * control (the menu rendered). Leaves the menu closed.
 */
async function expectOwnSession(page) {
    const nav = await openUserMenu(page);
    await expect(logoutLink(nav)).toBeVisible();
    await expect(nav.getByText(/logged in as/)).toHaveCount(0);
    await closeUserMenu(page);
}

/**
 * The user menu while impersonating `username`: the "You are currently
 * logged in as" line, "Logout as {username}", no plain "Logout". Leaves the
 * menu closed.
 */
async function expectImpersonating(page, username) {
    const nav = await openUserMenu(page);
    await expect(nav.getByText(`You are currently logged in as ${username}`)).toBeVisible();
    await expect(nav.getByRole('link', {name: `Logout as ${username}`}).first()).toBeVisible();
    await expect(logoutLink(nav)).toHaveCount(0);
    await closeUserMenu(page);
}

/** Confirm the "Login As" dialog with OK (the dialog must be open). */
async function confirmLoginAsDialog(page) {
    const dialog = loginAsDialog(page);
    await expect(dialog.getByText(MSG.confirmLoginAs)).toBeVisible();
    await dialog.getByRole('button', {name: 'OK'}).click();
}

/**
 * Login As from a "Current Users" row of Users & Roles, confirmed with OK:
 * the browser visits `login/signInAsUser/{id}` (returned) and lands on the
 * impersonated user's own home (an Author's My Submissions).
 */
async function loginAsFromUsersRow(page, row) {
    await (await openUserRowMenu(page, row)).filter({hasText: 'Login As'}).click();
    const visited = page.waitForRequest(/\/login\/signInAsUser\/\d+$/);
    await confirmLoginAsDialog(page);
    const request = await visited;
    await page.waitForURL(/\/dashboard\//, {waitUntil: 'commit', timeout: 30_000});
    return request.url();
}

/**
 * Press the user menu's "Logout as {username}": the impersonator's own
 * session is back, no password asked; waits to land on their Dashboard.
 */
async function logoutAs(page, username) {
    const nav = await openUserMenu(page);
    await nav.getByRole('link', {name: `Logout as ${username}`}).first().click();
    await page.waitForURL(/\/dashboard\//, {waitUntil: 'commit', timeout: 30_000});
}

module.exports = {
    MSG,
    siteHomeUrl,
    siteLoginUrl,
    usersScreenUrl,
    signInAsUserUrl,
    openSiteLogin,
    accountDisabledMessage,
    keepMeLoggedIn,
    loginPageBody,
    lostPasswordEmail,
    changePasswordForm,
    publicUserMenu,
    logoutFromPublicMenu,
    usersTable,
    usersColumnHeaders,
    searchUsers,
    userRow,
    openUserRowMenu,
    closeUserRowMenu,
    loginAsDialog,
    accessDeniedMessage,
    noAdminRightsMessage,
    noAdminRightsCause,
    usersListLink,
    noAdminRightsLead,
    noAdminRightsCauses,
    noAdminRightsRemedy,
    persistentCookies,
    userNav,
    userNavAvatars,
    AVATAR,
    avatarLook,
    userMenuEntries,
    openUserMenu,
    closeUserMenu,
    expectOwnSession,
    expectImpersonating,
    confirmLoginAsDialog,
    loginAsFromUsersRow,
    logoutAs,
};
