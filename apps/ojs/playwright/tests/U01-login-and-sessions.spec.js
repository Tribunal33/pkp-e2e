// @ts-check
/**
 * @file playwright/tests/U01-login-and-sessions.spec.js
 *
 * Login & sessions — OJS suite, one test per canonical scenario the spec runs
 * on OJS (scenarios 1–8, all common).
 * Spec: docs/specs/U01-login-and-sessions.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 🐞,
 * A2 🐞, A3 🐞, A4 🐞, A5 ❓, A6 ❓, A7 🐞, A8 🐞. Where a test passes
 * through one (S1 unticks the pre-ticked box, S6 walks a screen that sets
 * the forced-change flag, S4/S5 open the reset page, S2 opens a
 * dashboard address signed out) it asserts the effect the spec states and
 * leaves the finding's own claim unasserted either way. The spec's Coverage
 * section records everything else left out.
 *
 * Session hygiene: every sign-in, sign-out, forced-change and impersonation
 * flow runs in a FRESH browser context with a fresh UI login — never through
 * the shared .auth storage-state cache, whose session rows signOut/signInAs
 * would destroy for parallel tests (the one cached context, S1's Journal
 * Manager, only reads a screen). Password mutations happen only on throwaway
 * users in scratch journals (the roster's passwords are never touched).
 * Mailpit assertions are scoped by unique throwaway recipient addresses
 * carrying app + test in the local part; nobody@mail.test holds no account
 * on any install, so its silence is read as a count after the account's own
 * email arrived (PRINCIPLES A8). Waits are event-based — no hard-coded sleeps.
 */
const {test, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');
const {
    WorkflowPage,
    waitForJQueryIdle,
} = require('../pages/ReviewStagePages.js');
const {UsersRolesPage} = require('../pages/UserInvitationPages.js');
const {
    UserMenu,
    LoginAsDialog,
    UsersRolesMenu,
    LostPasswordPage,
    ResetPasswordPage,
    LoginAsRefusalPage,
    anonContext,
    freshLogin,
    restartedContext,
} = require('../pages/LoginSessionsPages.js');

const JOURNAL = 'publicknowledge';
const GENERIC_ERROR = 'Invalid username/email or password. Please try again.';
const NOBODY = 'nobody@mail.test';

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u1${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** The Dashboard address of a signed-in Editor on the seeded journal. */
const EDITORIAL = `/index.php/${JOURNAL}/dashboard/editorial`;

/**
 * Drive the lost-password flow for `email` on the given journal and return
 * the emailed reset link and the message summary (Rules 7–8). Starts from
 * the journal's Login page.
 */
async function requestResetLink(page, pkpMail, contextPath, email) {
    const loginPage = new LoginPage(page);
    const lost = new LostPasswordPage(page);
    await loginPage.gotoContext(contextPath);
    await lost.openFromLogin();
    await lost.request(email);

    // One "Password Reset Confirmation" email with the single link (Rule 8).
    const summary = await pkpMail.find({to: email, subject: 'Password Reset Confirmation'});
    const full = await pkpMail.fullMessage(summary.ID);
    const match = (full.HTML || full.Text).match(
        /https?:\/\/[^\s<>"']+\/login\/resetPassword\/[^\s<>"']+/
    );
    expect(match, 'reset link present in the email').toBeTruthy();
    return {link: match[0].replace(/&amp;/g, '&'), summary};
}

test.describe('login & sessions', () => {
    test('S1: sign in and land on the Dashboard', {tag: '@smoke'}, async ({browser, baseURL, ojsApi, asUser}, testInfo) => {
        test.slow();
        // A site that also hosts a second journal: the site-level landing
        // (Rule 3) needs more than one journal to be unable to aim at.
        const tag = makeTag('s1', testInfo);
        await ojsApi.createContext({tag});

        const context = await anonContext(browser, baseURL);
        try {
            const page = await context.newPage();
            const loginPage = new LoginPage(page);
            const userMenu = new UserMenu(page);

            // The journal's Login page (Rule 1).
            await loginPage.gotoContext(JOURNAL);
            await loginPage.expectForm();
            const loginUrl = page.url();

            // An empty box: the browser's own required-field refusal.
            // Nothing reaches the site (no sign-in request is sent, the
            // address stays), and the box is `required` (Rule 2). The wrong
            // password below is the positive control: that submission does
            // reach the site.
            const signInPosts = [];
            page.on('request', (request) => {
                if (request.method() === 'POST' && request.url().includes('/login/signIn')) {
                    signInPosts.push(request.url());
                }
            });
            await loginPage.usernameInput.fill('editor.diana');
            await expect(loginPage.passwordInput).toHaveAttribute('required', '');
            await loginPage.submitButton.click();
            await expect(loginPage.passwordInput).toBeFocused();
            expect(await loginPage.passwordInput.evaluate((el) => el.validity.valueMissing)).toBe(true);
            expect(page.url()).toBe(loginUrl);
            expect(signInPosts).toHaveLength(0);

            // A wrong password: the generic failure, the username kept
            // (Rule 2).
            await loginPage.fillPassword('definitely-not-the-password');
            await loginPage.submitButton.click();
            await expect(page.getByText(GENERIC_ERROR)).toBeVisible();
            await expect(loginPage.usernameInput).toHaveValue('editor.diana');
            expect(signInPosts).toHaveLength(1);

            // The correct password, "Keep me logged in" unticked first,
            // lands on the Dashboard (Rule 3).
            await loginPage.setRememberMe(false);
            await expect(loginPage.rememberMeCheckbox).not.toBeChecked();
            await loginPage.fillPassword(getPassword('editor.diana'));
            await loginPage.submitButton.click();
            await page.waitForURL(/\/dashboard\/editorial/, {waitUntil: 'commit', timeout: 15_000});
            await expect(userMenu.root).toBeVisible();

            // The Login page while signed in: the Dashboard instead of the
            // form (Rule 1).
            await loginPage.gotoContext(JOURNAL);
            await page.waitForURL(/\/dashboard\/editorial/, {waitUntil: 'commit', timeout: 15_000});
            await expect(userMenu.root).toBeVisible();
            await expect(loginPage.form).toHaveCount(0);

            // A browser restart: a fresh context carrying only the cookies
            // that hold an expiry date opens the Dashboard still signed in,
            // the box having been unticked (Rule 5).
            const restarted = await restartedContext(browser, baseURL, context);
            try {
                expect(restarted.carried.length, 'an expiry-dated session cookie carried over').toBeGreaterThan(0);
                const restartedPage = await restarted.context.newPage();
                await restartedPage.goto(EDITORIAL);
                await expect(new UserMenu(restartedPage).root).toBeVisible();
                await expect(new UserMenu(restartedPage).button).toContainText('editor.diana');
                await expect(restartedPage.locator('form#login')).toHaveCount(0);
            } finally {
                await restarted.context.close();
            }

            // The last-login date: the Journal Manager, on a users-management
            // screen, reads the Editor's account (Side effects). Users &
            // Roles is the users-management screen a Journal Manager has;
            // its "Current Users" table shows Name, Email, Roles, Start Date
            // and Affiliation, and no last-login column or label (finding
            // T-ojs-1 in .reports/U01/test-ojs-findings.md), so the Editor's
            // row is read and the last-login date is asserted neither way.
            const managerContext = await asUser('manager.maya');
            const managerPage = await managerContext.newPage();
            const usersRoles = new UsersRolesPage(managerPage, JOURNAL);
            await usersRoles.goto();
            const usersMenu = new UsersRolesMenu(managerPage);
            await usersMenu.search('Diana');
            const editorRow = usersRoles.userRow('editor.diana@mail.test');
            await expect(editorRow).toBeVisible();
            await expect(editorRow).toContainText('Diana Editor');
            await expect(editorRow).toContainText('Journal editor');
            await expect(usersRoles.usersTable.getByRole('columnheader')).toHaveText([
                'Name',
                'Email',
                'Roles',
                'Start Date',
                'Affiliation',
                'More Actions',
            ]);

            // The site-level Login page: sign out, open the site's own
            // homepage and press "Login" at its top right: the same form;
            // signing in lands on the site home page, not the Dashboard
            // (Rules 1, 3).
            await page.goto(EDITORIAL);
            await userMenu.logout();
            await loginPage.expectForm();
            await page.goto('/index.php/index');
            await page.getByRole('navigation').getByRole('link', {name: 'Login', exact: true}).click();
            await page.waitForURL(/\/index\/en\/login/, {waitUntil: 'commit', timeout: 15_000});
            await loginPage.expectForm();
            await loginPage.signIn('editor.diana', getPassword('editor.diana'));
            await page.waitForURL(/\/index\/en\/index$/, {waitUntil: 'commit', timeout: 15_000});
            await expect(page.getByText('Journal of Public Knowledge').first()).toBeVisible();
            await expect(page.getByText(`Scratch context ${tag}`)).toBeVisible();
            expect(page.url()).not.toMatch(/\/dashboard/);

            // Control: sign out, open the journal's Login page and sign in
            // as the Reader: the journal home page, not the Dashboard
            // (Rule 3).
            await page.goto('/index.php/index/login/signOut');
            await loginPage.expectForm();
            await loginPage.gotoContext(JOURNAL);
            await loginPage.signIn('reader.rosa', getPassword('reader.rosa'));
            await page.waitForURL(/\/publicknowledge\/en\/index$/, {waitUntil: 'commit', timeout: 15_000});
            await expect(page.getByText('Current Issue').first()).toBeVisible();
            await expect(page.getByText('reader.rosa').first()).toBeVisible();
            expect(page.url()).not.toMatch(/\/dashboard/);
        } finally {
            await context.close();
        }
    });

    test('S2: sign out', async ({browser, baseURL}) => {
        // Fresh sessions (signing out would kill a cached one for other
        // tests): the same account in two browsers.
        const first = await freshLogin(browser, baseURL, 'editor.diana');
        const second = await freshLogin(browser, baseURL, 'editor.diana');
        try {
            const {page} = first;
            const userMenu = new UserMenu(page);
            await page.goto(EDITORIAL);
            await expect(userMenu.root).toBeVisible();

            // The user menu offers "Logout" (Rule 6).
            await userMenu.logout();

            // Back on the Login page, with the departed account's EMAIL
            // prefilled — the email even though sign-in used the username.
            const loginPage = new LoginPage(page);
            await loginPage.expectForm();
            await expect(loginPage.usernameInput).toHaveValue('editor.diana@mail.test');

            // The second browser: the Dashboard shows, the account still
            // signed in there (Rule 6).
            await second.page.goto(EDITORIAL);
            const secondMenu = new UserMenu(second.page);
            await expect(secondMenu.root).toBeVisible();
            await expect(secondMenu.button).toContainText('editor.diana');
            await expect(second.page.locator('form#login')).toHaveCount(0);

            // Control: in the first browser a dashboard address now shows
            // the Login page, not the dashboard.
            await page.goto(EDITORIAL);
            await loginPage.expectForm();
            await expect(userMenu.root).toHaveCount(0);
        } finally {
            await first.context.close();
            await second.context.close();
        }
    });

    test('S3: a bookmarked private page waits for sign-in', async ({page, ojsApi}, testInfo) => {
        const tag = makeTag('s3', testInfo);
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
        });

        // Signed out, the workflow address shows the plain Login page (Rule 4).
        const workflowPath = `/index.php/${JOURNAL}/dashboard/editorial?workflowSubmissionId=${submissionId}`;
        await page.goto(workflowPath);
        const loginPage = new LoginPage(page);
        await loginPage.expectForm();
        // Control: nothing on the form names the submission being held.
        await expect(page.getByRole('main')).not.toContainText(`Submission ${tag}`);
        await expect(page.getByRole('main')).not.toContainText(String(submissionId));

        // Signing in continues straight to the held submission, not the
        // Dashboard.
        await loginPage.usernameInput.fill('editor.diana');
        await loginPage.fillPassword(getPassword('editor.diana'));
        await loginPage.submitButton.click();
        await page.waitForURL((url) => url.search.includes(`workflowSubmissionId=${submissionId}`), {
            waitUntil: 'commit',
            timeout: 15_000,
        });
        const workflow = new WorkflowPage(page, JOURNAL);
        await workflow.expectOpen();
    });

    test('S4: recover a forgotten password', {tag: '@smoke'}, async ({page, browser, baseURL, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const username = `au${tag}`;
        const email = `${username}@mail.test`;
        const reader = `rd${tag}`;
        const oldPassword = username + username;
        const newPassword = `Recovered${tag}`;
        // A scratch journal with the throwaway Author and a Reader to be
        // "another account" for the hand-built Login As address (fn-s).
        const seeded = await ojsApi.createContext({
            tag,
            users: [
                {username, roles: ['author']},
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

            const loginPage = new LoginPage(page);
            const lost = new LostPasswordPage(page);

            // An address no account holds: the generic answer with a "Login"
            // link back (Rule 7).
            await loginPage.gotoContext(tag);
            await lost.openFromLogin();
            await lost.request(NOBODY);

            // The account's address: "Login", "Forgot your password?" again,
            // the same answer; the email arrives from the site's contact
            // address, and nothing for nobody@mail.test, read after it.
            await lost.loginLink.click();
            await loginPage.expectForm();
            const {link: resetLink, summary} = await requestResetLink(page, pkpMail, tag, email);
            expect(summary.From.Address).toBe('admin@mail.test');
            expect(await pkpMail.count({to: NOBODY})).toBe(0);

            // "Reset Password": save a new password; still signed out
            // (Rule 9).
            await page.goto(resetLink);
            const reset = new ResetPasswordPage(page);
            await reset.setPassword(newPassword);
            await loginPage.gotoContext(tag);
            await loginPage.expectForm();

            // The second browser: My Submissions now shows the Login page;
            // that session ended when the new password was saved (Rule 9).
            await second.page.goto(mySubmissions);
            await expect(second.page.locator('form#login')).toBeVisible();
            await expect(new UserMenu(second.page).root).toHaveCount(0);

            // The new password: a real sign-in lands where an ordinary
            // sign-in would (Rule 3): the author's My Submissions.
            await loginPage.signIn(username, newPassword);
            await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit', timeout: 15_000});
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
            await loginPage.expectForm();
            await expect(refusal.accessDenied).toHaveCount(0);

            // Control: on that Login page the old password now fails.
            await loginPage.submitCredentials(username, oldPassword);
            await expect(page.getByText(GENERIC_ERROR)).toBeVisible();
            await loginPage.expectForm();
        } finally {
            await second.context.close();
        }
    });

    test('S5: a stale or altered reset link is refused', async ({page, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const username = `au${tag}`;
        const email = `${username}@mail.test`;
        const newPassword = `Reset${tag}`;
        await ojsApi.createContext({tag, users: [{username, roles: ['author']}]});

        const {link: resetLink} = await requestResetLink(page, pkpMail, tag, email);

        // Use the link once (the password changes), then sign in with the
        // new password (Rule 8's two early deaths).
        await page.goto(resetLink);
        const reset = new ResetPasswordPage(page);
        await reset.setPassword(newPassword);
        const loginPage = new LoginPage(page);
        await loginPage.gotoContext(tag);
        await loginPage.signIn(username, newPassword);
        await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit', timeout: 15_000});
        const userMenu = new UserMenu(page);
        await expect(userMenu.root).toBeVisible();

        // The link while signed in: the Author's home instead of the form
        // (Rule 1).
        await page.goto(resetLink);
        await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit', timeout: 15_000});
        await expect(userMenu.root).toBeVisible();
        await expect(reset.heading).toHaveCount(0);
        await expect(reset.passwordInput).toHaveCount(0);

        // The link after the change: "Logout", then the used link answers
        // the dead-link page with a "Reset Password" link back (Rule 10).
        await userMenu.logout();
        await page.goto(resetLink);
        await reset.expectDeadLink();

        // A mangled code answers the same.
        const mangled = new URL(resetLink);
        const confirm = mangled.searchParams.get('confirm') || '';
        mangled.searchParams.set('confirm', `deadbeef${confirm.slice(8)}`);
        await page.goto(mangled.toString());
        await reset.expectDeadLink();

        // The back link really leads to the lost-password form.
        await reset.deadLinkBack.click();
        await expect(new LostPasswordPage(page).form).toBeVisible();

        // Control: a fresh request's link opens the "Reset Password" form
        // (Rule 9); the refusal is the stale link's own.
        const fresh = await requestResetLink(page, pkpMail, tag, email);
        expect(fresh.link).not.toBe(resetLink);
        await page.goto(fresh.link);
        await reset.expectForm();
        await expect(reset.deadLink).toHaveCount(0);
    });

    test('S6: forced password change at first sign-in', async ({page, browser, baseURL, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const editor = `edi${tag}`;
        const author = `au${tag}`;
        const reviewerUsername = `rev${tag}`;
        const reviewerEmail = `${reviewerUsername}@mail.test`;
        const newPassword = `Changed${tag}`;
        // Scratch journal: the flagged account is a throwaway (never flag a
        // roster account) and the registration email lands in a throwaway
        // mailbox.
        await ojsApi.createContext({
            tag,
            users: [
                {username: editor, roles: ['editor']},
                {username: author, roles: ['author']},
            ],
        });
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: tag,
            submitter: author,
            title: `Submission ${tag}`,
            decisions: ['sendExternalReview'],
        });

        // The editor creates the reviewer through Add Reviewer → "Create New
        // Reviewer" (the one screen-driven path that sets the flag, Rule 11).
        const editorCtx = await freshLogin(browser, baseURL, editor);
        try {
            const workflow = new WorkflowPage(editorCtx.page, tag);
            await workflow.gotoEditorial(submissionId);
            await editorCtx.page.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
            const modal = editorCtx.page
                .getByRole('dialog')
                .filter({has: editorCtx.page.locator('.listPanel--selectReviewer')});
            await expect(modal.getByRole('link', {name: 'Create New Reviewer'})).toBeVisible({
                timeout: 30_000,
            });
            await modal.getByRole('link', {name: 'Create New Reviewer'}).click();
            // The AJAX reload swaps the search panel for the create form, so
            // the dialog is re-resolved by the form it now carries.
            const createModal = editorCtx.page
                .getByRole('dialog')
                .filter({has: editorCtx.page.locator('form#createReviewerForm')});
            const form = createModal.locator('form#createReviewerForm');
            await expect(form.locator('input[name="username"]')).toBeVisible({timeout: 30_000});
            await form.locator('input[name="givenName[en]"]').fill('Nova');
            await form.locator('input[name="familyName[en]"]').fill('Tester');
            await form.locator('input[name="username"]').fill(reviewerUsername);
            await form.locator('input[name="email"]').fill(reviewerEmail);
            await form.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
            await expect(createModal).toHaveCount(0, {timeout: 30_000});
            await waitForJQueryIdle(editorCtx.page);
            await expect(workflow.panelRow('Reviewers', 'Nova Tester')).toBeVisible();
        } finally {
            await editorCtx.context.close();
        }

        // The registration email delivers the username and a generated
        // password.
        const summary = await pkpMail.find({to: reviewerEmail, subject: 'Registration as Reviewer'});
        const full = await pkpMail.fullMessage(summary.ID);
        const credentials = (full.HTML || '').match(
            /Username:\s*([^<\s]+)\s*<br\s*\/?>\s*Password:\s*([^<\s]+)/i
        );
        expect(credentials, 'emailed username and password').toBeTruthy();
        expect(credentials[1]).toBe(reviewerUsername);
        const emailedPassword = credentials[2];

        // Signing in diverts to "Change Password" instead of landing anywhere.
        const loginPage = new LoginPage(page);
        await loginPage.gotoContext(tag);
        await loginPage.submitCredentials(reviewerUsername, emailedPassword);
        await page.waitForURL(/\/login\/changePassword/, {waitUntil: 'commit', timeout: 15_000});
        await expect(page.getByRole('heading', {name: 'Change Password'})).toBeVisible();
        await expect(
            page.getByText('You must choose a new password before you can log in to this site.')
        ).toBeVisible();
        // The username arrives prefilled.
        await expect(page.locator('form#loginChangePassword input[name="username"]')).toHaveValue(
            reviewerUsername
        );

        // Emailed password as the current one, a new one twice, "OK" — signed
        // in and sent home (a reviewer's home is their review dashboard).
        await page.locator('form#loginChangePassword input[name="oldPassword"]').fill(emailedPassword);
        await page.locator('form#loginChangePassword input[name="password"]').fill(newPassword);
        await page.locator('form#loginChangePassword input[name="password2"]').fill(newPassword);
        await page.locator('form#loginChangePassword').getByRole('button', {name: 'OK', exact: true}).click();
        await page.waitForURL(/\/dashboard/, {waitUntil: 'commit', timeout: 15_000});
        await expect(new UserMenu(page).root).toBeVisible();

        // Control: signing in again with the new password is normal — the
        // Dashboard, no "Change Password" form.
        const secondCtx = await anonContext(browser, baseURL);
        try {
            const secondPage = await secondCtx.newPage();
            const secondLogin = new LoginPage(secondPage);
            await secondLogin.gotoContext(tag);
            await secondLogin.signIn(reviewerUsername, newPassword);
            await secondPage.waitForURL(/\/dashboard/, {waitUntil: 'commit', timeout: 15_000});
            await expect(new UserMenu(secondPage).root).toBeVisible();
            await expect(secondPage.getByRole('heading', {name: 'Change Password'})).toHaveCount(0);
        } finally {
            await secondCtx.close();
        }
    });

    test('S7: administrator impersonates a user and returns', {tag: '@smoke'}, async ({browser, baseURL}) => {
        test.slow();
        // Fresh admin session: signInAs migrates the session, which would
        // destroy the cached admin storage state for parallel tests.
        const {context, page} = await freshLogin(browser, baseURL, 'admin');
        try {
            const userMenu = new UserMenu(page);
            const usersRoles = new UsersRolesPage(page, JOURNAL);
            const usersMenu = new UsersRolesMenu(page);
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
            await usersMenu.search('admin');
            const adminRow = usersRoles.userRow('admin@mail.test');
            await expect(adminRow).toBeVisible();
            await usersMenu.open(adminRow);
            await expect(usersMenu.menuItem('Edit')).toBeVisible();
            await expect(usersMenu.menuItem('Login As')).toHaveCount(0);
            await usersMenu.close();

            // "Login As" on an Author's row: the confirmation dialog warns
            // about attribution, with OK and Cancel (Rule 12).
            await usersMenu.search('Alex');
            const row = usersRoles.userRow('author.alex@mail.test');
            await expect(row).toBeVisible();
            await usersRoles.rowAction(row, 'Login As');
            await dialog.expectOpen();

            // Cancel: the dialog closes and the session is still the
            // administrator's own; no "You are currently logged in as" line
            // (Rule 13).
            await dialog.cancel();
            await expect(usersRoles.pageHeading).toBeVisible();
            await userMenu.expectOwnSession();

            // OK: the browser is now the Author's session: their My
            // Submissions; the top bar carries both identities and the
            // menu offers only "Logout as" — no plain Logout (Rules 6, 13).
            await usersRoles.rowAction(row, 'Login As');
            await dialog.expectOpen();
            const loginAsAddress = await dialog.ok();
            expect(loginAsAddress).toMatch(/\/login\/signInAsUser\/\d+$/);
            await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit', timeout: 30_000});
            await expect(userMenu.root).toBeVisible();
            await expect(userMenu.button).toContainText('author.alex');
            await expect(userMenu.button).toContainText('admin');
            await userMenu.expectImpersonating('author.alex');

            // "Logout as author.alex" restores the administrator, no password
            // asked (Rule 15).
            await userMenu.logoutAs('author.alex');
            await page.goto(EDITORIAL);
            await expect(userMenu.root).toBeVisible();
            await expect(userMenu.button).not.toContainText('author.alex');
            await userMenu.expectOwnSession();

            // Control: impersonate the Author again the same way and type
            // the copied sign-out address instead: the Login page, the
            // browser signed out of both identities; Users & Roles then
            // shows the Login page too (Rules 4, 15).
            await usersRoles.goto();
            await usersMenu.search('Alex');
            await usersRoles.rowAction(row, 'Login As');
            await dialog.expectOpen();
            await dialog.ok();
            await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit', timeout: 30_000});
            await expect(userMenu.button).toContainText('author.alex');
            await page.goto(signOutAddress);
            const loginPage = new LoginPage(page);
            await loginPage.expectForm();
            await expect(userMenu.root).toHaveCount(0);
            await page.goto(`/index.php/${JOURNAL}/management/settings/access`);
            await loginPage.expectForm();
            await expect(usersRoles.pageHeading).toHaveCount(0);
        } finally {
            await context.close();
        }
    });

    test('S8: editor impersonates a participant from the Participants panel', async ({browser, baseURL, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s8', testInfo);
        // A seeded ART submission auto-assigns the section's editors (Diana,
        // Ana, Omar) as participants; the accepted reviewer feeds the
        // Reviewers-table offering check.
        const {submissionId} = await ojsApi.createSubmission({
            tag,
            context: JOURNAL,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
            decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [{username: 'reviewer.julia', status: 'accepted'}]}],
        });
        // The out-of-reach account for the Journal Manager's case: a
        // throwaway holding a role only on a scratch journal (fn-s).
        const scratch = await ojsApi.createContext({
            tag,
            users: [{username: `rd${tag}`, roles: ['reader']}],
        });
        const outOfReachId = scratch.users.find((user) => user.username === `rd${tag}`).id;

        // Fresh editor session (impersonation migrates it).
        const {context, page} = await freshLogin(browser, baseURL, 'editor.diana');
        try {
            const workflow = new WorkflowPage(page, JOURNAL);
            const userMenu = new UserMenu(page);
            const dialog = new LoginAsDialog(page);
            await workflow.gotoEditorial(submissionId);
            const participants = page.locator('[data-cy="participant-manager"]');

            // The Editor's own row offers no Login As (Rule 14), while
            // another participant's row does (positive control). Each menu
            // is toggled closed again — the headlessui items render inline
            // and would otherwise satisfy later menuitem lookups.
            await workflow.participantMoreActions('Diana Editor').first().click();
            await expect(participants.getByRole('menuitem').first()).toBeVisible();
            await expect(participants.getByRole('menuitem', {name: 'Login As'})).toHaveCount(0);
            await workflow.participantMoreActions('Diana Editor').first().click();
            await expect(participants.getByRole('menuitem')).toHaveCount(0);

            // The Reviewers table offers the same row action (scenario 8's
            // OJS leg — offering asserted, not driven).
            const juliaMenuButton = workflow
                .panelRow('Reviewers', 'Julia Reviewer')
                .getByRole('button', {name: /More Actions/});
            await juliaMenuButton.click();
            await expect(page.getByRole('menuitem', {name: 'Login As'})).toBeVisible();
            await juliaMenuButton.click();
            await expect(page.getByRole('menuitem', {name: 'Login As'})).toHaveCount(0);

            // Impersonate the Section Editor participant.
            await workflow.participantMoreActions('Ana Section Editor').first().click();
            await participants.getByRole('menuitem', {name: 'Login As'}).click();
            await dialog.expectOpen();
            await dialog.ok();
            await page.waitForURL(
                (url) =>
                    url.pathname.includes('/dashboard/editorial') &&
                    url.search.includes(`workflowSubmissionId=${submissionId}`),
                {waitUntil: 'commit', timeout: 30_000}
            );

            // Same submission, as that participant; the Participants panel
            // now opens with "Logout as {participant}" (Rule 13).
            await workflow.expectOpen();
            const logoutAsAna = page.getByRole('button', {name: 'Logout as Ana Section Editor'});
            await expect(logoutAsAna).toBeVisible();

            // Pressing it returns to the editor's view of the same submission
            // (Rule 15).
            await logoutAsAna.click();
            await page.waitForURL(
                (url) => url.search.includes(`workflowSubmissionId=${submissionId}`),
                {waitUntil: 'commit', timeout: 30_000}
            );
            await workflow.expectOpen();
            await expect(
                page.getByRole('button', {name: 'Logout as Ana Section Editor'})
            ).toHaveCount(0);
            await userMenu.expectOwnSession();

            // Impersonating the Author instead lands on the author's own My
            // Submissions view, which shows no Participants panel — the way
            // back is the user menu's "Logout as" entry.
            await workflow.participantMoreActions('Alex Author').first().click();
            await participants.getByRole('menuitem', {name: 'Login As'}).click();
            await dialog.expectOpen();
            await dialog.ok();
            await page.waitForURL(
                (url) =>
                    url.pathname.includes('/dashboard/mySubmissions') &&
                    url.search.includes(`workflowSubmissionId=${submissionId}`),
                {waitUntil: 'commit', timeout: 30_000}
            );
            await workflow.expectOpen();
            await expect(page.locator('[data-cy="participant-manager"]')).toHaveCount(0);

            await userMenu.logoutAs('author.alex');
            await page.waitForURL(
                (url) => url.search.includes(`workflowSubmissionId=${submissionId}`),
                {waitUntil: 'commit', timeout: 30_000}
            );
            await workflow.expectOpen();
            await userMenu.expectOwnSession();
        } finally {
            await context.close();
        }

        // Journal Manager, a hand-built address to an out-of-reach user
        // (Rule 14): Login As on the Author's row, the visited address
        // copied, "Logout as", then the address with the number changed to
        // the scratch journal's account.
        const manager = await freshLogin(browser, baseURL, 'manager.maya');
        try {
            const managerPage = manager.page;
            const userMenu = new UserMenu(managerPage);
            const usersRoles = new UsersRolesPage(managerPage, JOURNAL);
            const usersMenu = new UsersRolesMenu(managerPage);
            const dialog = new LoginAsDialog(managerPage);
            await usersRoles.goto();
            await usersMenu.search('Alex');
            const row = usersRoles.userRow('author.alex@mail.test');
            await expect(row).toBeVisible();
            await usersRoles.rowAction(row, 'Login As');
            await dialog.expectOpen();
            const copiedAddress = await dialog.ok();
            expect(copiedAddress).toMatch(/\/login\/signInAsUser\/\d+$/);
            await managerPage.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit', timeout: 30_000});
            await expect(userMenu.button).toContainText('author.alex');
            await userMenu.logoutAs('author.alex');
            await managerPage.goto(EDITORIAL);
            await userMenu.expectOwnSession();

            const refusal = new LoginAsRefusalPage(managerPage);
            await managerPage.goto(copiedAddress.replace(/\/\d+$/, `/${outOfReachId}`));
            await expect(refusal.outOfReach).toBeVisible();
            for (const cause of refusal.causes) {
                await expect(cause).toBeVisible();
            }
            await expect(refusal.usersListLink).toBeVisible();
            await expect(userMenu.root).toHaveCount(0);

            // Control: the copied number, the Author's own, impersonates the
            // Author again and "Logout as" returns the Journal Manager; the
            // refusal is the out-of-reach account's alone.
            await managerPage.goto(copiedAddress);
            await managerPage.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit', timeout: 30_000});
            await expect(refusal.outOfReach).toHaveCount(0);
            await userMenu.expectImpersonating('author.alex');
            await userMenu.logoutAs('author.alex');
            await managerPage.goto(EDITORIAL);
            await expect(userMenu.button).toContainText('manager.maya');
            await userMenu.expectOwnSession();
        } finally {
            await manager.context.close();
        }
    });
});
