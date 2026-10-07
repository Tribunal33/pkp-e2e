// @ts-check
/**
 * @file playwright/tests/U01-login-and-sessions.spec.js
 *
 * Login & sessions — OPS suite, one test per canonical scenario of
 * docs/specs/U01-login-and-sessions.md, in OPS vocabulary (preprint server,
 * Moderators; the reduced roster has no editor/reviewer/copyeditor
 * accounts, so the Moderator `sectioneditor.ana` stands in for scenario 1's
 * Editor and `manager.maya` for scenario 8's). Scenario 6 is {OJS OMP}: its
 * Create New Reviewer path does not exist on a preprint server, so it costs
 * one absence test with positive controls (RUNBOOK multi-app rule 3), as
 * does scenario 8's Reviewers-table bullet.
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 🐞,
 * A2 🐞, A3 ✅ (retired), A4 🐞, A5 ❓, A6 ✅, A7 🐞, A8 🐞. Where a test passes
 * through one (S1 unticks the pre-ticked box, S4/S5 open the reset page,
 * S2 opens a dashboard address signed out) it asserts the effect the spec
 * states and leaves the finding's own claim unasserted either way. The
 * spec's Coverage section records everything else left out.
 *
 * Session hygiene: every sign-in, sign-out and impersonation flow runs in a
 * FRESH browser context with a fresh UI login — never through the shared
 * .auth storage-state cache, whose session rows signOut/signInAs would
 * destroy for parallel tests (the one cached context, S1's Preprint Server
 * Manager, only reads a screen). Password mutations happen only on
 * throwaway users in scratch servers. Mailpit assertions are scoped by
 * unique throwaway recipient addresses carrying app + test; nobody@mail.test
 * holds no account on any install, so its silence is read as a count after
 * the account's own email arrived (PRINCIPLES A8). Waits are event-based.
 */
const {test, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {getPassword, getEmail} = require('../../../../shared/playwright/data/users.js');
const {UsersRolesPage} = require('../pages/UserInvitationPages.js');
const {
    UserMenu,
    LoginAsDialog,
    UsersRolesTable,
    LostPasswordPage,
    ResetPasswordPage,
    LoginAsRefusalPage,
    anonContext,
    freshLogin,
    restartedContext,
} = require('../pages/LoginSessionsPages.js');

const APP = 'ops';
const SERVER = 'publicknowledge';
const GENERIC_ERROR = 'Invalid username/email or password. Please try again.';
const NOBODY = 'nobody@mail.test';
const RESET_SUBJECT = 'Password Reset Confirmation';

/** The Dashboard address of a signed-in Moderator or Manager on the seeded server. */
const EDITORIAL = `/index.php/${SERVER}/dashboard/editorial`;

/** Single hyphenless alphanumeric token — tag conventions in patterns.md. */
function makeTag(prefix) {
    return prefix + Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 7);
}

/**
 * Walk the lost-password flow up to the confirmation sentence and return the
 * emailed reset link and the message summary (Rules 7–8). The recipient
 * address is the test's unique throwaway (app + test in the address) — the
 * only Mailpit scoping this install supports.
 */
async function requestResetLink(page, pkpMail, {contextPath, email}) {
    const loginPage = new LoginPage(page);
    const lost = new LostPasswordPage(page);
    await loginPage.gotoContext(contextPath);
    await lost.openFromLogin();
    await lost.request(email);

    const summary = await pkpMail.find({to: email, subject: RESET_SUBJECT});
    const full = await pkpMail.fullMessage(summary.ID);
    const haystack = `${full.HTML || ''}\n${full.Text || ''}`;
    const match = haystack.match(/https?:\/\/[^\s"'<>]*\/login\/resetPassword\/[^\s"'<>]+/);
    expect(match, 'reset email must carry the single reset link').not.toBeNull();
    return {link: match[0].replace(/&amp;/g, '&'), summary};
}

test.describe('login & sessions (U1) — OPS', () => {
    test('S1: moderator signs in and lands on the Dashboard', async ({browser, baseURL, opsApi, asUser, appContext}) => {
        test.slow();
        // OPS's stand-in for the spec's Editor: a Moderator (sectionEditor).
        const moderator = appContext.seed.actors.sectionEditor;
        // A site that also hosts a second server: the site-level landing
        // (Rule 3) needs more than one server to be unable to aim at.
        const tag = makeTag('u1s1');
        await opsApi.createContext({tag});

        const context = await anonContext(browser, baseURL);
        try {
            const page = await context.newPage();
            const login = new LoginPage(page);
            const userMenu = new UserMenu(page);
            await login.gotoContext(SERVER);
            await login.expectForm();
            const loginUrl = page.url();

            // An empty box: the browser's own required-field refusal. Nothing
            // reaches the site (no sign-in request is sent, the address
            // stays), and the box is `required` (Rule 2). The wrong password
            // below is the positive control: that submission does reach it.
            const signInPosts = [];
            page.on('request', (request) => {
                if (request.method() === 'POST' && request.url().includes('/login/signIn')) {
                    signInPosts.push(request.url());
                }
            });
            await login.usernameInput.fill(moderator);
            await expect(login.passwordInput).toHaveAttribute('required', '');
            await login.submitButton.click();
            await expect(login.passwordInput).toBeFocused();
            expect(await login.passwordInput.evaluate((el) => el.validity.valueMissing)).toBe(true);
            expect(page.url()).toBe(loginUrl);
            expect(signInPosts).toHaveLength(0);

            // Wrong password: the one generic failure, username kept filled (Rule 2).
            await login.fillPassword('not-the-password');
            await login.submitButton.click();
            await expect(page.getByText(GENERIC_ERROR)).toBeVisible();
            await expect(page).toHaveURL(/\/login/);
            await expect(login.usernameInput).toHaveValue(moderator);
            expect(signInPosts).toHaveLength(1);

            // Correct password, "Keep me logged in" unticked first: lands on
            // the Dashboard (Rule 3).
            await login.setRememberMe(false);
            await expect(login.rememberMeCheckbox).not.toBeChecked();
            await login.fillPassword(getPassword(moderator));
            await login.submitButton.click();
            await page.waitForURL(/\/dashboard\/editorial/, {waitUntil: 'commit', timeout: 15_000});
            await expect(userMenu.root).toBeVisible();

            // The Login page while signed in: the Dashboard instead of the
            // form (Rule 1).
            await login.gotoContext(SERVER);
            await page.waitForURL(/\/dashboard\/editorial/, {waitUntil: 'commit', timeout: 15_000});
            await expect(userMenu.root).toBeVisible();
            await expect(login.form).toHaveCount(0);

            // A browser restart: a fresh context carrying only the cookies
            // that hold an expiry date opens the Dashboard still signed in,
            // the box having been unticked (Rule 5).
            const restarted = await restartedContext(browser, baseURL, context);
            try {
                expect(restarted.carried.length, 'an expiry-dated session cookie carried over').toBeGreaterThan(0);
                const restartedPage = await restarted.context.newPage();
                await restartedPage.goto(EDITORIAL);
                const restartedMenu = new UserMenu(restartedPage);
                await expect(restartedMenu.root).toBeVisible();
                await expect(restartedMenu.button).toContainText(moderator);
                await expect(restartedPage.locator('form#login')).toHaveCount(0);
            } finally {
                await restarted.context.close();
            }

            // The last-login date: the Preprint Server Manager, on a
            // users-management screen, reads the Moderator's account (Side
            // effects). Users & Roles is the users-management screen a
            // manager has; its "Current Users" table shows Name, Email,
            // Roles, Start Date, Affiliation and More Actions, and no
            // last-login column or label (finding T-ops-1 in
            // .reports/U01/test-ops-findings.md), so the Moderator's row is
            // read and the last-login date is asserted neither way.
            const managerContext = await asUser('manager.maya');
            const managerPage = await managerContext.newPage();
            const usersRoles = new UsersRolesPage(managerPage, SERVER);
            const usersTable = new UsersRolesTable(managerPage);
            await usersRoles.goto();
            await usersRoles.searchUsers('Ana');
            const moderatorRow = usersTable.row(getEmail(moderator));
            await expect(moderatorRow).toBeVisible();
            await expect(moderatorRow).toContainText('Ana Section Editor');
            await expect(moderatorRow).toContainText('Moderator');
            await expect(usersTable.columnHeaders).toHaveText([
                'Name',
                'Email',
                'Roles',
                'Start Date',
                'Affiliation',
                'More Actions',
            ]);

            // The site-level Login page: sign out, open the site's own
            // homepage and press "Login" at its top right: the same form;
            // signing in lands on the site home page (the servers list),
            // not the Dashboard (Rules 1, 3).
            await page.goto(EDITORIAL);
            await userMenu.logout();
            await login.expectForm();
            await page.goto('/index.php/index');
            await page.getByRole('link', {name: 'Login', exact: true}).first().click();
            await page.waitForURL(/\/index\/en\/login/, {waitUntil: 'commit', timeout: 15_000});
            await login.expectForm();
            await login.signIn(moderator, getPassword(moderator));
            await page.waitForURL(/\/index\/en\/index$/, {waitUntil: 'commit', timeout: 15_000});
            await expect(page.getByText('Public Knowledge Preprint Server').first()).toBeVisible();
            await expect(page.getByText(`Scratch context ${tag}`)).toBeVisible();
            expect(page.url()).not.toMatch(/\/dashboard/);

            // Control: sign out, open the server's Login page and sign in as
            // the Reader: the server home page, not the Dashboard (Rule 3).
            await page.goto('/index.php/index/login/signOut');
            await login.expectForm();
            await login.gotoContext(SERVER);
            const reader = appContext.seed.actors.reader;
            await login.signIn(reader, getPassword(reader));
            await page.waitForURL(/\/publicknowledge\/en\/index$/, {waitUntil: 'commit', timeout: 15_000});
            await expect(page.getByText('Latest preprints').first()).toBeVisible();
            await expect(page.getByText(reader).first()).toBeVisible();
            expect(page.url()).not.toMatch(/\/dashboard/);
        } finally {
            await context.close();
        }
    });

    test('S2: sign out from the user menu', async ({browser, baseURL}) => {
        const username = 'author.alex';
        const mySubmissions = `/index.php/${SERVER}/dashboard/mySubmissions`;
        // Fresh sessions (signing out would kill a cached one for other
        // tests): the same account in two browsers.
        const first = await freshLogin(browser, baseURL, username, {contextPath: SERVER});
        const second = await freshLogin(browser, baseURL, username, {contextPath: SERVER});
        try {
            const {page} = first;
            const userMenu = new UserMenu(page);
            await expect(page).toHaveURL(/\/dashboard/);
            await expect(userMenu.root).toBeVisible();

            // The user menu (top-right initials) offers "Logout" (Rule 6).
            await userMenu.logout();

            // The login form arrives with the departed account's EMAIL prefilled —
            // even though the sign-in above used the username (Rule 6).
            const login = new LoginPage(page);
            await login.expectForm();
            await expect(login.usernameInput).toHaveValue(getEmail(username));

            // The second browser: the Dashboard shows, the account still
            // signed in there; signing out ended only the first browser's
            // session (Rule 6).
            await second.page.goto(mySubmissions);
            const secondMenu = new UserMenu(second.page);
            await expect(secondMenu.root).toBeVisible();
            await expect(secondMenu.button).toContainText(username);
            await expect(second.page.locator('form#login')).toHaveCount(0);

            // Control: a dashboard address now shows the Login page, not the
            // dashboard.
            await page.goto(mySubmissions);
            await page.waitForURL(/\/login/, {waitUntil: 'commit'});
            await login.expectForm();
            await expect(userMenu.root).toHaveCount(0);
        } finally {
            await first.context.close();
            await second.context.close();
        }
    });

    test('S3: a bookmarked private address waits for sign-in', async ({page, opsApi}) => {
        const tag = makeTag('u1s3');
        const manager = `m${tag}`;
        const author = `a${tag}`;
        await opsApi.createContext({
            tag,
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author']},
            ],
        });
        const seeded = await opsApi.createSubmission({tag, context: tag, submitter: author});
        const workflowUrl = `/index.php/${tag}/dashboard/editorial?workflowSubmissionId=${seeded.submissionId}`;

        // Signed out, the workflow address shows the plain Login page (Rule 4).
        await page.goto(workflowUrl);
        await page.waitForURL(/\/login/, {waitUntil: 'commit'});
        const login = new LoginPage(page);
        await expect(login.usernameInput).toBeVisible();
        // Control: nothing on the form names the submission being held.
        await expect(page.getByRole('main')).not.toContainText(`Submission ${tag}`);
        await expect(page.getByRole('main')).not.toContainText(String(seeded.submissionId));

        // Signing in continues to the held address — not to the Dashboard.
        await login.usernameInput.fill(manager);
        await login.fillPassword(getPassword(manager));
        await login.submitButton.click();
        await page.waitForURL(
            (url) => url.search.includes(`workflowSubmissionId=${seeded.submissionId}`),
            {waitUntil: 'commit'}
        );
        await expect(
            page
                .locator('[data-cy="active-modal"]')
                .getByRole('heading', {name: /Workflow: Production/})
        ).toBeVisible();
    });

    test('S4: recover a forgotten password', async ({page, browser, baseURL, opsApi, pkpMail}) => {
        test.slow();
        const tag = makeTag('u1s4');
        const username = `r${tag}`;
        const reader = `d${tag}`;
        const email = `${tag}-${APP}@mail.test`;
        const oldPassword = username + username;
        const newPassword = `Np${tag}`;
        // Scratch user — never reset a roster password (cached sign-ins of
        // other tests depend on the deterministic rule). The throwaway
        // reader is "another account" for the hand-built Login As address
        // (fn-s).
        const seeded = await opsApi.createContext({
            tag,
            users: [
                {username, roles: ['author'], email},
                {username: reader, roles: ['reader']},
            ],
        });
        const readerId = seeded.users.find((user) => user.username === reader).id;

        // The second browser: the same account signed in before the reset
        // is saved; My Submissions opens there (the positive control of the
        // read after the reset).
        const second = await freshLogin(browser, baseURL, username, {contextPath: tag});
        try {
            const mySubmissions = `/index.php/${tag}/dashboard/mySubmissions`;
            await second.page.goto(mySubmissions);
            await expect(new UserMenu(second.page).root).toBeVisible();

            const login = new LoginPage(page);
            const lost = new LostPasswordPage(page);

            // An address no account holds: the generic answer with a "Login"
            // link back (Rule 7).
            await login.gotoContext(tag);
            await lost.openFromLogin();
            await lost.request(NOBODY);

            // The account's address: "Login", "Forgot your password?" again,
            // the same answer; the email arrives from the site's contact
            // address, and nothing for nobody@mail.test, read after it.
            await lost.loginLink.click();
            await login.expectForm();
            const {link: resetUrl, summary} = await requestResetLink(page, pkpMail, {contextPath: tag, email});
            expect(summary.From.Address).toBe('admin@mail.test');
            expect(await pkpMail.count({to: NOBODY})).toBe(0);

            // The link opens the set-a-new-password form ("Reset Password" page
            // heading; the tab title, fixed upstream since A3, is a Planned item, not asserted yet).
            // Saved: the success sentence with a "Login" link — NOT signed in
            // (Rule 9; the login form below rendering at all proves it: a
            // signed-in visitor is bounced off the Login page, Rule 1).
            await page.goto(resetUrl);
            const reset = new ResetPasswordPage(page);
            await reset.setPassword(newPassword);
            await login.gotoContext(tag);
            await login.expectForm();

            // The second browser: My Submissions now shows the Login page;
            // that session ended when the new password was saved (Rule 9).
            await second.page.goto(mySubmissions);
            await expect(second.page.locator('form#login')).toBeVisible();
            await expect(new UserMenu(second.page).root).toHaveCount(0);

            // The old password now fails with the generic error…
            await login.submitCredentials(username, oldPassword);
            await expect(page.getByText(GENERIC_ERROR)).toBeVisible();

            // …and the new one signs in, landing where an ordinary sign-in
            // would (Rule 3): the author's My Submissions.
            await login.signIn(username, newPassword);
            await expect(page).toHaveURL(/\/dashboard\/mySubmissions/);
            const userMenu = new UserMenu(page);
            await expect(userMenu.root).toBeVisible();
            await expect(userMenu.button).toContainText(username);

            // Login As by address, as an Author: the access-denied page, and
            // nothing of the refused screen (Rule 17): the session is still
            // the author's own, the Reader's name nowhere on the page.
            const refusal = new LoginAsRefusalPage(page);
            await refusal.gotoSignInAs(tag, readerId);
            await expect(refusal.accessDenied).toBeVisible();
            await expect(page.getByText(username).first()).toBeVisible();
            await expect(page.getByText(reader)).toHaveCount(0);
            await expect(userMenu.root).toHaveCount(0);

            // The same address, signed out: "Logout" in the user menu, then
            // the address again: the Login page instead (Rule 17).
            await page.goto(mySubmissions);
            await userMenu.logout();
            await refusal.gotoSignInAs(tag, readerId);
            await login.expectForm();
            await expect(refusal.accessDenied).toHaveCount(0);

            // Control: on that Login page the old password fails.
            await login.submitCredentials(username, oldPassword);
            await expect(page.getByText(GENERIC_ERROR)).toBeVisible();
            await login.expectForm();
        } finally {
            await second.context.close();
        }
    });

    test('S5: a stale or altered reset link is refused', async ({page, browser, baseURL, opsApi, pkpMail}) => {
        test.slow();
        const tag = makeTag('u1s5');
        const username = `r${tag}`;
        const email = `${tag}-${APP}@mail.test`;
        await opsApi.createContext({
            tag,
            users: [{username, roles: ['author'], email}],
        });

        const {link: resetUrl} = await requestResetLink(page, pkpMail, {contextPath: tag, email});

        // Positive control in a second signed-out context: the link is live
        // before anything kills it — it opens the set-a-new-password form.
        const visitorContext = await anonContext(browser, baseURL);
        try {
            const visitor = await visitorContext.newPage();
            const visitorReset = new ResetPasswordPage(visitor);
            await visitor.goto(resetUrl);
            await visitorReset.expectForm();

            // The account signs in — an outstanding link dies early (Rule 8).
            const login = new LoginPage(page);
            await login.gotoContext(tag);
            await login.signIn(username, getPassword(username));
            await expect(page).toHaveURL(/\/dashboard\/mySubmissions/);
            const userMenu = new UserMenu(page);
            await expect(userMenu.root).toBeVisible();

            // The link while signed in: the Author's home instead of the
            // form (Rule 1).
            const reset = new ResetPasswordPage(page);
            await page.goto(resetUrl);
            await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit', timeout: 15_000});
            await expect(userMenu.root).toBeVisible();
            await expect(reset.heading).toHaveCount(0);
            await expect(reset.passwordInput).toHaveCount(0);
            await expect(reset.deadLink).toHaveCount(0);

            // The same link, signed out, now answers the dead-link page
            // (Rule 10), with a "Reset Password" link back to the
            // lost-password form.
            await visitor.goto(resetUrl);
            await visitorReset.expectDeadLink();

            // A link with a mangled code answers the same.
            const mangled = resetUrl.replace(
                /confirm=(.{6})/,
                (whole, lead) => `confirm=${lead === 'abcdef' ? 'fedcba' : 'abcdef'}`
            );
            expect(mangled).not.toBe(resetUrl);
            await visitor.goto(mangled);
            await visitorReset.expectDeadLink();

            // The back link really leads to the lost-password form.
            await visitorReset.deadLinkBack.click();
            await expect(new LostPasswordPage(visitor).form).toBeVisible();

            // Control: a link from a fresh "Forgot your password?" request
            // for the same address opens the "Reset Password" form (Rule 9);
            // the refusal is the stale link's own.
            const fresh = await requestResetLink(visitor, pkpMail, {contextPath: tag, email});
            expect(fresh.link).not.toBe(resetUrl);
            await visitor.goto(fresh.link);
            await visitorReset.expectForm();
            await expect(visitorReset.deadLink).toHaveCount(0);
        } finally {
            await visitorContext.close();
        }
    });

    test('S6 {OJS OMP}: no OPS screen offers the Create New Reviewer path that sets the forced-change flag (absence)', async ({asUser, opsApi}) => {
        // A preprint server has no review stage, so the review stage's
        // "Create New Reviewer" path to the forced password change does not
        // exist here (the Site Administrator's Hosted Journals "Users"
        // screen can set the flag, Rule 11a); the flow itself is covered by
        // the OJS and OMP suites.
        const tag = makeTag('u1s6');
        const manager = `m${tag}`;
        const author = `a${tag}`;
        await opsApi.createContext({
            tag,
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author']},
            ],
        });
        const seeded = await opsApi.createSubmission({tag, context: tag, submitter: author});

        const page = await (await asUser(manager)).newPage();
        await page.goto(
            `/index.php/${tag}/dashboard/editorial?workflowSubmissionId=${seeded.submissionId}`
        );
        const workflow = page.locator('[data-cy="active-modal"]');
        await expect(
            workflow.getByRole('heading', {name: /Workflow: Production/})
        ).toBeVisible();

        // Positive control: the workflow's own controls render.
        await expect(
            workflow
                .locator('[data-cy="workflow-action-items"]')
                .getByRole('button', {name: 'Post the preprint'})
        ).toBeVisible();

        // The stage menu offers Production (control, taken the same way) and
        // no Review entry; nothing on the screen offers a reviewer surface —
        // so no "Add Reviewer" window and no "Create New Reviewer" form.
        const stageMenu = workflow.locator('nav');
        await expect(stageMenu.getByText('Production', {exact: true})).toBeVisible();
        await expect(stageMenu.getByText(/review/i)).toHaveCount(0);
        await expect(workflow.getByRole('button', {name: /Add Reviewer/})).toHaveCount(0);
        await expect(workflow.getByText('Create New Reviewer')).toHaveCount(0);
    });

    test('S7: administrator impersonates a user and returns', async ({browser, baseURL}) => {
        test.slow();
        const author = 'author.alex';
        // Fresh UI login — impersonation migrates sessions, so the cached
        // .auth storage states stay out of this test.
        const {context, page} = await freshLogin(browser, baseURL, 'admin', {contextPath: SERVER});
        try {
            const userMenu = new UserMenu(page);
            const usersRoles = new UsersRolesPage(page, SERVER);
            const usersTable = new UsersRolesTable(page);
            const dialog = new LoginAsDialog(page);

            // The user menu before impersonating offers "Logout"; the link
            // behind it is copied now, because the menu no longer offers it
            // while impersonating (Rule 15).
            await page.goto(EDITORIAL);
            const signOutAddress = await userMenu.captureLogoutHref();
            expect(signOutAddress).toMatch(/\/login\/signOut$/);

            // The administrator's own row offers no "Login As" (Rule 14);
            // its menu does open ("Edit" is the positive control).
            await usersRoles.goto();
            await usersRoles.searchUsers('admin');
            const adminRow = usersTable.row('admin@mail.test');
            await expect(adminRow).toBeVisible();
            await usersTable.openMenu(adminRow);
            await expect(usersTable.menuItem('Edit')).toBeVisible();
            await expect(usersTable.menuItem('Login As')).toHaveCount(0);
            await usersTable.closeMenu();

            // "Login As" on an Author's row: the confirmation dialog warns
            // about attribution, with OK and Cancel (Rule 12).
            await usersRoles.searchUsers('Alex');
            const row = usersTable.row(getEmail(author));
            await expect(row).toBeVisible();
            await usersTable.rowAction(row, 'Login As');
            await dialog.expectOpen();

            // Cancel: the dialog closes and the session is still the
            // administrator's own; no "You are currently logged in as" line
            // (Rule 13).
            await dialog.cancel();
            await expect(usersTable.pageHeading).toBeVisible();
            await userMenu.expectOwnSession();

            // OK: the browser is now the Author's session: their My
            // Submissions; the top bar carries both identities and the
            // menu offers only "Logout as" — no plain Logout (Rules 6, 13).
            await usersTable.rowAction(row, 'Login As');
            await dialog.expectOpen();
            const loginAsAddress = await dialog.ok();
            expect(loginAsAddress).toMatch(/\/login\/signInAsUser\/\d+$/);
            await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit', timeout: 30_000});
            await expect(userMenu.root).toBeVisible();
            await expect(userMenu.button).toContainText(author);
            await expect(userMenu.button).toContainText('admin');
            await userMenu.expectImpersonating(author);

            // "Logout as {author}" restores the administrator, no password
            // asked (Rule 15).
            await userMenu.logoutAs(author);
            await page.goto(EDITORIAL);
            await expect(userMenu.root).toBeVisible();
            await expect(userMenu.button).not.toContainText(author);
            await userMenu.expectOwnSession();

            // Restored identity, proven by an administrator-only screen opening.
            await page.goto('/index.php/index/admin');
            await expect(page.getByRole('heading', {name: 'Administration'})).toBeVisible();

            // Control: impersonate the Author again the same way and type
            // the copied sign-out address instead: the Login page, the
            // browser signed out of both identities; Users & Roles then
            // shows the Login page too (Rules 4, 15).
            await usersRoles.goto();
            await usersRoles.searchUsers('Alex');
            await usersTable.rowAction(row, 'Login As');
            await dialog.expectOpen();
            await dialog.ok();
            await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit', timeout: 30_000});
            await expect(userMenu.button).toContainText(author);
            await page.goto(signOutAddress);
            const login = new LoginPage(page);
            await login.expectForm();
            await expect(userMenu.root).toHaveCount(0);
            await page.goto(`/index.php/${SERVER}/management/settings/access`);
            await login.expectForm();
            await expect(usersTable.pageHeading).toHaveCount(0);
        } finally {
            await context.close();
        }
    });

    test('S8: manager impersonates a participant from the Participants panel', async ({browser, baseURL, opsApi}) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('u1s8');
        // Seeded on the shared server, where the real submit auto-assigns the
        // PRE section's Moderators (sectioneditor.ana/ravi) as participants.
        // A scratch server cannot host this scenario: sub-editor
        // auto-assignment silently fails there (SubEditorsDAO::assignEditors
        // group-id filter defect — reported outside this suite), and the
        // participant would never appear. The submission is this test's own;
        // nothing on the seeded server is mutated. The manager is seeded as
        // a participant too, so her own row is on the panel (Rule 14).
        const manager = 'manager.maya';
        const managerFullName = 'Maya Manager';
        const moderator = 'sectioneditor.ana';
        const modFullName = 'Ana Section Editor';
        const author = 'author.alex';
        const authorFullName = 'Alex Author';
        const seeded = await opsApi.createSubmission({
            tag,
            context: SERVER,
            submitter: author,
            participants: [{username: manager, role: 'manager'}],
        });
        // The out-of-reach account for the manager's case: a throwaway
        // holding a role only on a scratch server (fn-s).
        const scratch = await opsApi.createContext({
            tag,
            users: [{username: `d${tag}`, roles: ['reader']}],
        });
        const outOfReachId = scratch.users.find((user) => user.username === `d${tag}`).id;

        const workflowUrl = `/index.php/${SERVER}/dashboard/editorial?workflowSubmissionId=${seeded.submissionId}`;

        // Fresh UI login for the impersonator (never the cached .auth state —
        // impersonation migrates the session it runs in).
        const {context, page} = await freshLogin(browser, baseURL, manager, {contextPath: SERVER});
        try {
            const userMenu = new UserMenu(page);
            const dialog = new LoginAsDialog(page);
            await page.goto(workflowUrl);
            const workflow = page.locator('[data-cy="active-modal"]');
            await expect(
                workflow.getByRole('heading', {name: /Workflow: Production/})
            ).toBeVisible();
            const participants = page.locator('[data-cy="participant-manager"]');
            await expect(participants).toBeVisible();

            // The manager's own row offers no Login As (Rule 14), while the
            // Moderator's row does (positive control). Each menu is toggled
            // closed again — the headlessui items render inline and would
            // otherwise satisfy later menuitem lookups.
            const ownItem = participants.locator('li').filter({hasText: managerFullName});
            await expect(ownItem).toBeVisible();
            const ownMenuButton = ownItem.getByRole('button', {name: `${managerFullName} More Actions`});
            await ownMenuButton.click();
            await expect(participants.getByRole('menuitem').first()).toBeVisible();
            await expect(participants.getByRole('menuitem', {name: 'Login As'})).toHaveCount(0);
            await ownMenuButton.click();
            await expect(participants.getByRole('menuitem')).toHaveCount(0);
            const modItem = participants.locator('li').filter({hasText: modFullName});
            await expect(modItem).toBeVisible();
            const modMenuButton = modItem.getByRole('button', {name: `${modFullName} More Actions`});
            await modMenuButton.click();
            await expect(participants.getByRole('menuitem', {name: 'Login As'})).toBeVisible();
            await modMenuButton.click();
            await expect(participants.getByRole('menuitem')).toHaveCount(0);

            // {OJS OMP} Reviewers table: a preprint server has no review
            // stage, so the workflow offers no Reviewers table — the stage
            // menu lists Production and nothing named review (the rendered
            // Participants panel and the Production entry are the positive
            // controls).
            const stageMenu = workflow.locator('nav');
            await expect(stageMenu.getByText('Production', {exact: true})).toBeVisible();
            await expect(stageMenu.getByText(/review/i)).toHaveCount(0);
            await expect(workflow.getByText('Reviewers', {exact: true})).toHaveCount(0);

            // Moderator participant's row menu → Login As → confirm.
            await modMenuButton.click();
            await participants.getByRole('menuitem', {name: 'Login As'}).click();
            await dialog.expectOpen();
            await dialog.ok();

            // The browser lands on the same preprint as that participant, and the
            // top of the Participants panel offers "Logout as {participant}"
            // (Rule 13 — the label names the impersonated user's full name).
            const logoutAsEntry = participants.getByRole('button', {
                name: `Logout as ${modFullName}`,
            });
            await expect(logoutAsEntry).toBeVisible();
            await expect(page).toHaveURL(
                new RegExp(`workflowSubmissionId=${seeded.submissionId}`)
            );

            // Pressing it returns to the manager's view of the same preprint.
            await logoutAsEntry.click();
            await expect(
                workflow.getByRole('heading', {name: /Workflow: Production/})
            ).toBeVisible();
            await expect(participants).toBeVisible();
            await expect(participants.getByRole('button', {name: /^Logout as /})).toHaveCount(0);
            await expect(page).toHaveURL(
                new RegExp(`workflowSubmissionId=${seeded.submissionId}`)
            );
            await userMenu.expectOwnSession();

            // Author variant: impersonating the preprint's author lands on the
            // author's own view of it, which shows no Participants panel — the
            // way back is the user menu's "Logout as {author}" entry. (A fresh
            // load of the same address keeps the modal render stable after the
            // impersonation round-trip.)
            await page.goto(workflowUrl);
            const authorItem = participants.locator('li').filter({hasText: authorFullName});
            await expect(authorItem).toBeVisible();
            await authorItem.getByRole('button', {name: `${authorFullName} More Actions`}).click();
            await participants.getByRole('menuitem', {name: 'Login As'}).click();
            await dialog.expectOpen();
            await dialog.ok();

            await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit'});
            await expect(page).toHaveURL(
                new RegExp(`workflowSubmissionId=${seeded.submissionId}`)
            );
            // The author's view renders (anchored on inner content — the modal
            // wrapper's visibility is unreliable, patterns.md pitfall 5), and it
            // shows no Participants panel.
            await expect(page.getByText(`Submission ${tag}`).first()).toBeVisible();
            await expect(page.locator('[data-cy="participant-manager"]')).toHaveCount(0);

            await userMenu.expectImpersonating(author);
            await userMenu.logoutAs(author);

            // Back as the manager, on the same preprint's editorial view.
            await page.waitForURL(/\/dashboard\/editorial/, {waitUntil: 'commit'});
            await expect(
                page
                    .locator('[data-cy="active-modal"]')
                    .getByRole('heading', {name: /Workflow: Production/})
            ).toBeVisible();
            await userMenu.expectOwnSession();

            // Preprint Server Manager, a hand-built address to an out-of-reach
            // user (Rule 14): Login As on the Author's row of Users & Roles,
            // the visited address copied, "Logout as", then the address with
            // the number changed to the scratch server's account.
            const usersRoles = new UsersRolesPage(page, SERVER);
            const usersTable = new UsersRolesTable(page);
            await usersRoles.goto();
            await usersRoles.searchUsers('Alex');
            const row = usersTable.row(getEmail(author));
            await expect(row).toBeVisible();
            await usersTable.rowAction(row, 'Login As');
            await dialog.expectOpen();
            const copiedAddress = await dialog.ok();
            expect(copiedAddress).toMatch(/\/login\/signInAsUser\/\d+$/);
            await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit', timeout: 30_000});
            await expect(userMenu.button).toContainText(author);
            await userMenu.logoutAs(author);
            await page.goto(EDITORIAL);
            await userMenu.expectOwnSession();

            const refusal = new LoginAsRefusalPage(page);
            await page.goto(copiedAddress.replace(/\/\d+$/, `/${outOfReachId}`));
            await expect(refusal.outOfReach).toBeVisible();
            for (const cause of refusal.causes) {
                await expect(cause).toBeVisible();
            }
            await expect(refusal.usersListLink).toBeVisible();
            await expect(userMenu.root).toHaveCount(0);

            // Control: the copied number, the Author's own, impersonates the
            // Author again and "Logout as" returns the manager; the refusal
            // is the out-of-reach account's alone.
            await page.goto(copiedAddress);
            await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit', timeout: 30_000});
            await expect(refusal.outOfReach).toHaveCount(0);
            await userMenu.expectImpersonating(author);
            await userMenu.logoutAs(author);
            await page.goto(EDITORIAL);
            await expect(userMenu.button).toContainText(manager);
            await userMenu.expectOwnSession();
        } finally {
            await context.close();
        }
    });
});
