// @ts-check
/**
 * @file playwright/tests/U01-login-and-sessions.spec.js
 *
 * U01 — Login & sessions, OMP suite (spec:
 * docs/specs/U01-login-and-sessions.md). One test per canonical scenario
 * the spec runs on a press (common scenarios 1–8, in OMP vocabulary:
 * press, Press Manager, Series Editor — glossary substitution).
 *
 * Not covered, by register ID (the spec's Coverage section is the record
 * of everything else left out): A1, A2, A4, A5, A7, A8, A10, A11,
 * A13, A14.
 *
 * Seeding: scenario endpoints only. Scratch submissions ride the read-only
 * `publicknowledge` press; S1 adds a scratch press with no users so the
 * site hosts a second press; S4, S5, S6 and S8 use scratch presses with
 * throwaway users because a roster password must never change and every
 * mail assertion needs a unique throwaway recipient naming app + test
 * (Mailpit is one shared instance across the three fleets — never cleared).
 * Every sign-in, sign-out and impersonation runs in a FRESH browser context
 * the test opens itself (`freshPage`), never the cached `.auth` storage
 * state: `signInAs`/`signOutAs`/`signOut` migrate or destroy the session
 * they run in, and a cached session shared with parallel tests must not be
 * the one destroyed. "A second browser" (S2, S4) is a second such context;
 * S1's "browser restart" is a fresh context seeded with the signed-in
 * context's expiry-dated cookies (spec fn-s).
 */
const {test: baseTest, expect} = require('../support/fixtures.js');
const {
    MSG: SESSION_MSG,
    siteHomeUrl,
    siteLoginUrl,
    usersScreenUrl,
    signInAsUserUrl,
    keepMeLoggedIn,
    loginPageBody,
    lostPasswordEmail,
    changePasswordForm,
    publicUserMenu,
    logoutFromPublicMenu,
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
    userNavAvatars,
    AVATAR,
    avatarLook,
    userMenuEntries,
} = require('../pages/LoginSessionsPages.js');

const PK = 'publicknowledge';
const EDITOR = {username: 'editor.diana', password: 'editor.dianaeditor.diana'};
const MANAGER = {username: 'manager.maya', password: 'manager.mayamanager.maya'};
const ADMIN = {username: 'admin', password: 'admin'};
const READER = {username: 'reader.rosa', password: 'reader.rosareader.rosa'};
/** The site's contact address, the sender of the reset email (Side effects). */
const SITE_CONTACT_EMAIL = 'admin@mail.test';

const MSG = {
    genericError: 'Invalid username/email or password. Please try again.',
    resetRequested:
        'A confirmation has been sent to your email address if a matching account was found. Please follow the instructions in the email to reset your password.',
    passwordUpdated:
        'Password has been updated successfully. Please login with updated password.',
    staleLink:
        'Sorry, the link you clicked on has expired or is not valid. Please try resetting your password again.',
    mustChange: 'You must choose a new password before you can log in to this site',
    wrongCurrent: 'The current password you entered was incorrect.',
    confirmLoginAs: SESSION_MSG.confirmLoginAs,
};

/** Parallel-safe unique tag: single alphanumeric token, ≤32 chars. */
function makeTag(testInfo, scenarioKey) {
    const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6);
    return `${scenarioKey}ompw${testInfo.parallelIndex}${rand}`;
}

const loginUrl = (contextPath) => `/index.php/${contextPath}/en/login`;
const editorialUrl = (contextPath) => `/index.php/${contextPath}/en/dashboard/editorial`;
const mySubmissionsUrl = (contextPath) => `/index.php/${contextPath}/en/dashboard/mySubmissions`;

/**
 * Fill and submit the login form the page is currently showing. Lifts the
 * password box's maxlength attribute first (register finding A1 — the cap is
 * a recorded bug, not something to trip over or assert).
 */
async function submitLoginForm(page, username, password) {
    await page.locator('input#username').fill(username);
    const passwordInput = page.locator('input#password');
    await passwordInput.evaluate((el) => el.removeAttribute('maxlength'));
    await passwordInput.fill(password);
    await page.locator('form#login button[type="submit"]').click();
}

/** Sign the page's context in through the press login form and land. */
async function signIn(page, {username, password, contextPath = PK}) {
    await page.goto(loginUrl(contextPath));
    await submitLoginForm(page, username, password);
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
        timeout: 15_000,
        waitUntil: 'commit',
    });
}

/** The plain Login page, signed out: the form, on a `/login` address. */
async function expectLoginPage(page) {
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('form#login')).toBeVisible();
}

/**
 * The top-nav user menu. `.last()`: the workflow side modal renders its own
 * copy of the top nav above the page's — the last one is the interactive one.
 */
const userNav = (page) => page.locator('[data-cy="app-user-nav"]').last();

/** Open the user menu and return its nav element. */
async function openUserMenu(page) {
    await userNav(page).locator('> button').click();
    const nav = userNav(page).locator('nav');
    await expect(nav).toBeVisible();
    return nav;
}

/**
 * Close the user menu by toggling its button — NEVER via Escape, which also
 * closes the workflow side modal underneath.
 */
async function closeUserMenu(page) {
    await userNav(page).locator('> button').click();
}

/** The user menu's plain "Logout" entry (absent while impersonating). */
const logoutLink = (nav) => nav.getByRole('link', {name: 'Logout', exact: true});

/**
 * The user menu holds no "You are currently logged in as" line: the
 * session is the account's own. The plain "Logout" entry is the positive
 * control (the menu rendered).
 */
async function expectOwnSession(page) {
    const nav = await openUserMenu(page);
    await expect(logoutLink(nav)).toBeVisible();
    await expect(nav.getByText(/logged in as/)).toHaveCount(0);
    await closeUserMenu(page);
}

/** Press the user menu's "Logout": the Login page, signed out (Rule 6). */
async function logoutFromMenu(page) {
    const nav = await openUserMenu(page);
    await logoutLink(nav).click();
    await page.waitForURL(/\/login/, {timeout: 15_000});
    await expect(page.locator('form#login')).toBeVisible();
}

/** The workflow side modal (bottom of the modal stack), awaited. */
async function awaitWorkflow(page) {
    const modal = page.locator('[data-cy="active-modal"]').first();
    await expect(
        modal.getByRole('heading', {name: /^Workflow:/}).first()
    ).toBeVisible({timeout: 20_000});
    return modal;
}

/** Assert the "Login As" dialog (title + verbatim warning, OK and Cancel). */
async function expectLoginAsDialog(page) {
    const dialog = loginAsDialog(page);
    await expect(dialog.getByText(MSG.confirmLoginAs)).toBeVisible();
    await expect(dialog.getByRole('button', {name: 'OK'})).toBeVisible();
    await expect(dialog.getByRole('button', {name: 'Cancel'})).toBeVisible();
    return dialog;
}

/** Confirm the "Login As" dialog (title + verbatim warning) with OK. */
async function confirmLoginAsDialog(page) {
    const dialog = await expectLoginAsDialog(page);
    await dialog.getByRole('button', {name: 'OK'}).click();
}

/**
 * `freshPage` opens a page in a brand-new, empty-state browser context and
 * (optionally) signs it in through the real login form. Auto-closes every
 * opened context at teardown. Used instead of `asUser` wherever the test is
 * about the session itself (sign-in, sign-out, impersonation, forced
 * change): those flows destroy or migrate the very session they run in, so
 * they must never run on the shared `.auth` storage-state cache.
 * `freshPage(null, {cookies})` seeds the new context with the given cookies
 * (S1's browser restart: the expiry-dated cookies of another context).
 */
const test = baseTest.extend({
    freshPage: async ({browser, baseURL}, use) => {
        const contexts = [];
        await use(async (credentials = null, {cookies = []} = {}) => {
            const context = await browser.newContext({
                baseURL,
                storageState: {cookies: [], origins: []},
            });
            contexts.push(context);
            if (cookies.length) {
                await context.addCookies(cookies);
            }
            const page = await context.newPage();
            if (credentials) {
                await signIn(page, credentials);
            }
            return page;
        });
        await Promise.all(contexts.map((context) => context.close().catch(() => {})));
    },
});

/** Seed a monograph on publicknowledge (series `monographs` auto-assigns
 * the seeded editors on submit: Diana Editor, Ana + Omar Section Editor). */
async function seedMonograph(ompApi, tag, extra = {}) {
    return ompApi.createSubmission({
        tag,
        context: PK,
        submitter: 'author.alex',
        series: 'monographs',
        ...extra,
    });
}

/** A scratch press's name when the seed gives none (scenarios.md). */
const scratchPressName = (tag) => `Scratch context ${tag}`;

/**
 * Scratch press with one throwaway author whose mailbox is per-test, and a
 * throwaway reader to be "another account" (the Login As address of S4).
 * The returned `readerId` is the reader's id from the context response.
 */
async function seedResetActor(ompApi, tag) {
    const username = `rst${tag}`;
    const email = `${tag}@mail.test`;
    const readerUsername = `rdr${tag}`;
    const created = await ompApi.createContext({
        tag,
        users: [
            {
                username,
                roles: ['author'],
                givenName: `Rst${tag}`,
                familyName: 'Reset',
                email,
            },
            {
                username: readerUsername,
                roles: ['reader'],
                givenName: `Rdr${tag}`,
                familyName: 'Reader',
            },
        ],
    });
    const readerId = created.users.find((user) => user.username === readerUsername).id;
    return {
        contextPath: tag,
        pressName: scratchPressName(tag),
        username,
        email,
        password: username + username,
        readerId,
    };
}

/**
 * From the Login page the page is on: press "Forgot your password?", type
 * `email` and submit; the page answers the confirmation sentence with a
 * "Login" link back (Rule 7), whether or not an account holds the address.
 */
async function requestReset(page, email) {
    await page.getByRole('link', {name: 'Forgot your password?'}).click();
    await expect(
        page.getByRole('heading', {name: 'Reset Password'})
    ).toBeVisible();
    await expect(
        page.getByText('Enter your account email address below')
    ).toBeVisible();
    await page.locator('input[name="email"]').fill(email);
    await page.getByRole('button', {name: 'Reset Password'}).click();
    await expect(page.getByText(MSG.resetRequested)).toBeVisible();
    await expect(page.getByRole('link', {name: 'Login'}).first()).toBeVisible();
}

/** Read the "Password Reset Confirmation" email of `email` (scoped read:
 * unique throwaway recipient) and return its link plus the summary. */
async function readResetLink(pkpMail, email) {
    const summary = await pkpMail.find({
        to: email,
        subject: 'Password Reset Confirmation',
    });
    const full = await pkpMail.fullMessage(summary.ID);
    const match = (full.Text || '').match(/https?:\/\/\S*resetPassword\S*/);
    const link = match
        ? match[0]
        : pkpMail.extractLink(full.HTML, /reset/i);
    expect(link, 'reset email carries the reset link').toBeTruthy();
    return {link, summary};
}

/** Request a reset for `email` from `contextPath`'s lost-password page and
 * return the emailed link. */
async function requestResetLink(page, pkpMail, {contextPath, email}) {
    await page.goto(loginUrl(contextPath));
    await requestReset(page, email);
    return (await readResetLink(pkpMail, email)).link;
}

/**
 * Complete the set-a-new-password form the emailed link opens; its browser
 * tab reads "Reset Password | {press name}" (Fields).
 */
async function completeReset(page, link, newPassword, pressName) {
    await page.goto(link);
    await expect(
        page.getByRole('heading', {name: 'Reset Password'})
    ).toBeVisible();
    await expect(page).toHaveTitle(`Reset Password | ${pressName}`);
    await expect(
        page.getByText(/The password must be at least \d+ characters/)
    ).toBeVisible();
    const newPasswordInput = page.locator('input[name="password"]').first();
    await newPasswordInput.evaluate((el) => el.removeAttribute('maxlength'));
    await newPasswordInput.fill(newPassword);
    await page.locator('input[name="password2"]').fill(newPassword);
    await page.getByRole('button', {name: 'Save'}).click();
    await expect(page.getByText(MSG.passwordUpdated)).toBeVisible();
    await expect(page.getByRole('link', {name: 'Login'}).first()).toBeVisible();
}

/**
 * Login As from a users row of Users & Roles, confirmed with OK: the
 * browser visits `login/signInAsUser/{id}` (returned, as the address the
 * scenario copies from the history) and lands on the target's home.
 */
async function loginAsFromUsersRow(page, row) {
    await (await openUserRowMenu(page, row)).filter({hasText: 'Login As'}).click();
    const visited = page.waitForRequest(/\/login\/signInAsUser\/\d+$/);
    await confirmLoginAsDialog(page);
    const request = await visited;
    return request.url();
}

/** The user menu while impersonating `username`: the line, "Logout as", no plain "Logout". */
async function expectImpersonating(page, username) {
    const nav = await openUserMenu(page);
    await expect(nav.getByText(`You are currently logged in as ${username}`)).toBeVisible();
    await expect(nav.getByRole('link', {name: `Logout as ${username}`}).first()).toBeVisible();
    await expect(logoutLink(nav)).toHaveCount(0);
    return nav;
}

/**
 * "Create New Reviewer" from the review stage's "Add Reviewer" window, on
 * the open workflow `modal`: the new reviewer's row joins the Reviewers
 * table and the window is gone before the next step.
 */
async function createNewReviewer(page, modal, {givenName, username, email}) {
    const reviewers = modal.locator('[data-cy="reviewer-manager"]');
    await reviewers.getByRole('button', {name: 'Add Reviewer'}).click();
    const addModal = page.locator('[data-cy="active-modal"]').last();
    await addModal.getByRole('link', {name: 'Create New Reviewer'}).click();
    const form = addModal.locator('form#createReviewerForm');
    await expect(form).toBeVisible({timeout: 20_000});
    // On an external round only one reviewer group is eligible, so the
    // form carries the group as a hidden field — nothing to pick.
    await form.locator('input[name^="givenName"]').first().fill(givenName);
    await form.locator('input[name="username"]').fill(username);
    await form.locator('input[name="email"]').fill(email);
    // The message body loads by AJAX — submitting before it arrives fails
    // server-side (locator pitfall "AJAX-loaded email templates").
    await expect(
        addModal.frameLocator('iframe[id^="personalMessage"]').locator('body')
    ).toContainText(/\w/, {timeout: 20_000});
    await form.getByRole('button', {name: 'Add Reviewer'}).click();
    await expect(reviewers.getByText(givenName).first()).toBeVisible({timeout: 30_000});
    await expect(page.locator('form#createReviewerForm')).toHaveCount(0);
}

/** The username and generated password of a created reviewer's registration email. */
async function readReviewerCredentials(pkpMail, email) {
    const summary = await pkpMail.find({to: email, subject: 'Registration as Reviewer'});
    const full = await pkpMail.fullMessage(summary.ID);
    return {
        username: (full.Text.match(/Username: (\S+)/) || [])[1],
        password: (full.Text.match(/Password: (\S+)/) || [])[1],
    };
}

/**
 * The "Change Password" form a flagged account's sign-in diverts to: its
 * heading, its explanation and the username prefilled.
 */
async function expectForcedChange(page, username) {
    await expect(page.getByRole('heading', {name: 'Change Password'})).toBeVisible();
    await expect(page.getByText(MSG.mustChange)).toBeVisible();
    const form = changePasswordForm(page);
    await expect(form.locator('input[name="username"]')).toHaveValue(username);
    return form;
}

/** Fill the "Change Password" form and press "OK". */
async function submitForcedChange(form, currentPassword, newPassword) {
    await form.locator('input[name="oldPassword"]').fill(currentPassword);
    const newPasswordInput = form.locator('input[name="password"]').first();
    await newPasswordInput.evaluate((el) => el.removeAttribute('maxlength'));
    await newPasswordInput.fill(newPassword);
    await form.locator('input[name="password2"]').fill(newPassword);
    await form.getByRole('button', {name: 'OK'}).click();
}

/** A reviewer's Dashboard landing: the "Action Required by me" view. */
async function expectActionRequiredByMe(page) {
    await page.waitForURL(/\/dashboard\/reviewAssignments/, {
        timeout: 20_000,
        waitUntil: 'commit',
    });
    await expect(
        page.getByRole('heading', {name: /^Action Required by me/})
    ).toBeVisible({timeout: 20_000});
}

test.describe('Login & sessions (U1)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(180_000));

    test('S1: sign in and land on the Dashboard', async ({ompApi, freshPage}, testInfo) => {
        // A site that also hosts a second press (no users: it exists to make
        // the site multi-press, spec fn-s).
        const tag = makeTag(testInfo, 'u1s1');
        await ompApi.createContext({tag});
        const secondPressName = `Scratch context ${tag}`;

        const page = await freshPage();
        // Nothing reaches the site on a browser-refused submission: count the
        // sign-in requests; the wrong-password submission below is the
        // positive control that bounds the read (the counter then moves).
        let signInRequests = 0;
        page.on('request', (request) => {
            if (/\/login\/signIn$/.test(request.url())) signInRequests += 1;
        });
        await page.goto(loginUrl(PK));
        await expect(page.getByRole('heading', {name: 'Login'})).toBeVisible();

        // An empty box: the browser's own required-field refusal.
        const passwordInput = page.locator('input#password');
        await expect(passwordInput).toHaveAttribute('required', '');
        await page.locator('input#username').fill(EDITOR.username);
        await page.locator('form#login button[type="submit"]').click();
        await expect(page).toHaveURL(loginUrl(PK));
        expect(await passwordInput.evaluate((el) => el.validity.valueMissing)).toBe(true);
        expect(await passwordInput.evaluate((el) => el.matches(':invalid'))).toBe(true);
        await expect(page.locator('input#username')).toHaveValue(EDITOR.username);

        // Wrong password: one generic sentence, username kept.
        await submitLoginForm(page, EDITOR.username, 'not-the-password');
        await expect(page.getByText(MSG.genericError)).toBeVisible();
        await expect(page.locator('input#username')).toHaveValue(EDITOR.username);
        expect(signInRequests, 'the empty box sent nothing; the wrong password sent one').toBe(1);

        // Correct password, "Keep me logged in" unticked: lands on the
        // editorial dashboard.
        await keepMeLoggedIn(page).uncheck();
        await expect(keepMeLoggedIn(page)).not.toBeChecked();
        await passwordInput.evaluate((el) => el.removeAttribute('maxlength'));
        await passwordInput.fill(EDITOR.password);
        await page.locator('form#login button[type="submit"]').click();
        await page.waitForURL(/\/dashboard\/editorial/, {
            timeout: 15_000,
            waitUntil: 'commit',
        });
        await expect(
            page.getByRole('heading', {name: /Assigned to me/})
        ).toBeVisible({timeout: 20_000});

        // The Login page while signed in: the Dashboard instead of the form.
        await page.goto(loginUrl(PK));
        await expect(page).toHaveURL(/\/dashboard\/editorial/);
        await expect(
            page.getByRole('heading', {name: /Assigned to me/})
        ).toBeVisible({timeout: 20_000});
        await expect(page.locator('form#login')).toHaveCount(0);

        // A browser restart: a fresh context carrying only the expiry-dated
        // cookies of the signed-in one opens the Dashboard address signed in.
        const kept = await persistentCookies(page.context());
        expect(kept.length, 'the sign-in left a cookie that survives a restart').toBeGreaterThan(0);
        const restarted = await freshPage(null, {cookies: kept});
        await restarted.goto(editorialUrl(PK));
        await expect(restarted).toHaveURL(/\/dashboard\/editorial/);
        await expect(
            restarted.getByRole('heading', {name: /Assigned to me/})
        ).toBeVisible({timeout: 20_000});
        await expect(restarted.locator('form#login')).toHaveCount(0);

        // The Editor's row on Users & Roles: Press Manager, the "Current
        // Users" table searched by the Editor's name (the row settled by
        // the list's own response): the row, its "Roles" cell naming the
        // Editor's role, under six columns, none of them a last-login date
        // (Side effects).
        const managerPage = await freshPage(MANAGER);
        await managerPage.goto(usersScreenUrl(PK));
        await searchUsers(managerPage, 'Diana');
        const editorRow = userRow(managerPage, 'editor.diana@mail.test');
        await expect(editorRow).toBeVisible();
        await expect(editorRow).toContainText('Diana Editor');
        await expect(editorRow).toContainText('Press editor');
        await expect(usersColumnHeaders(managerPage)).toHaveText([
            'Name',
            'Email',
            'Roles',
            'Start Date',
            'Affiliation',
            'More Actions',
        ]);

        // The site-level Login page: sign out, the site's own homepage,
        // "Login" at its top right, the same form; sign in: the site home
        // page (the press list), not the Dashboard (Rule 3).
        await logoutFromMenu(page);
        await page.goto(siteHomeUrl());
        await page.getByRole('link', {name: 'Login', exact: true}).first().click();
        await expect(page).toHaveURL(new RegExp(`${siteLoginUrl()}$`));
        await expect(page.getByRole('heading', {name: 'Login'})).toBeVisible();
        await expect(page.locator('form#login')).toBeVisible();
        await submitLoginForm(page, EDITOR.username, EDITOR.password);
        await page.waitForURL((url) => !url.pathname.includes('/login'), {
            timeout: 15_000,
            waitUntil: 'commit',
        });
        await expect(page).toHaveURL(/\/index\.php\/index\/en(\/index)?$/);
        await expect(page.getByText(secondPressName)).toBeVisible();
        await expect(page).not.toHaveURL(/dashboard/);

        // Control: the Reader lands on the press home page, not the Dashboard.
        await page.goto(`/index.php/${PK}/login/signOut`);
        await page.goto(loginUrl(PK));
        await submitLoginForm(page, READER.username, READER.password);
        await page.waitForURL((url) => !url.pathname.includes('/login'), {
            timeout: 15_000,
            waitUntil: 'commit',
        });
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${PK}/en(/index)?$`));
        await expect(page).toHaveTitle('Public Knowledge Press');
        await expect(page).not.toHaveURL(/dashboard/);
    });

    test('S2: sign out', async ({freshPage}) => {
        const page = await freshPage(EDITOR);
        // The same account signed in in a second browser (context).
        const secondBrowser = await freshPage(EDITOR);

        // User menu (top-right initials) → Logout → back on the Login page.
        const nav = await openUserMenu(page);
        await nav.getByRole('link', {name: 'Logout', exact: true}).click();
        await page.waitForURL(/\/login/, {timeout: 15_000});
        await expect(page.locator('form#login')).toBeVisible();

        // The departed account's EMAIL is prefilled — even though the sign-in
        // above used the username (Rule 6).
        await expect(page.locator('input#username')).toHaveValue(
            'editor.diana@mail.test'
        );

        // The second browser: still signed in; the sign-out ended only the
        // first browser's session (Rule 6).
        await secondBrowser.goto(editorialUrl(PK));
        await expect(secondBrowser).toHaveURL(/\/dashboard\/editorial/);
        await expect(
            secondBrowser.getByRole('heading', {name: /Assigned to me/})
        ).toBeVisible({timeout: 20_000});
        await expect(secondBrowser.locator('form#login')).toHaveCount(0);

        // Control: a dashboard address now shows the Login page, not the
        // dashboard (not the bare "dashboard" address: A7, unasserted).
        await page.goto(editorialUrl(PK));
        await expectLoginPage(page);
    });

    test('S3: a bookmarked private page waits for sign-in', async ({ompApi, freshPage}, testInfo) => {
        const tag = makeTag(testInfo, 'u1s3');
        const seeded = await seedMonograph(ompApi, tag);
        const workflowPath = `/index.php/${PK}/en/dashboard/editorial?workflowSubmissionId=${seeded.submissionId}`;

        // Signed out, the workflow address shows the plain Login page instead.
        const page = await freshPage();
        await page.goto(workflowPath);
        await expect(page).toHaveURL(/\/login/);
        await expect(page.locator('form#login')).toBeVisible();

        // Control: it is the plain form; nothing on it names the submission
        // being held (Rule 4). The Login page opened by its own address in
        // another signed-out browser is the measure: the held page reads
        // the same, word for word, and carries neither the title nor the
        // submission's number.
        const plainPage = await freshPage();
        await plainPage.goto(loginUrl(PK));
        await expect(plainPage.locator('form#login')).toBeVisible();
        const plainText = await loginPageBody(plainPage).innerText();
        expect(plainText).toContain('Username or Email');
        await expect(page.getByRole('heading', {name: 'Login'})).toBeVisible();
        await expect(loginPageBody(page)).toHaveText(plainText, {useInnerText: true});
        await expect(loginPageBody(page)).not.toContainText(`Submission ${tag}`, {
            useInnerText: true,
        });
        await expect(loginPageBody(page)).not.toContainText(String(seeded.submissionId), {
            useInnerText: true,
        });

        // Signing in continues straight to the held submission, not to the
        // dashboard's default view.
        await submitLoginForm(page, 'editor.diana', 'editor.dianaeditor.diana');
        await page.waitForURL(
            new RegExp(`workflowSubmissionId=${seeded.submissionId}`),
            {timeout: 15_000, waitUntil: 'commit'}
        );
        const modal = await awaitWorkflow(page);
        await expect(modal.getByText(`Submission ${tag}`).first()).toBeVisible();
    });

    test('S4: recover a forgotten password', async ({ompApi, pkpMail, freshPage}, testInfo) => {
        const tag = makeTag(testInfo, 'u1s4');
        const actor = await seedResetActor(ompApi, tag);
        const newPassword = 'Recovered1';
        const loginAsAddress = signInAsUserUrl(actor.contextPath, actor.readerId);

        // The same account signed in in a second browser before the reset.
        const secondBrowser = await freshPage({
            username: actor.username,
            password: actor.password,
            contextPath: actor.contextPath,
        });
        await expect(secondBrowser).toHaveURL(/\/dashboard\/mySubmissions/);

        // An address no account holds: the same confirmation sentence.
        const page = await freshPage();
        await page.goto(loginUrl(actor.contextPath));
        await requestReset(page, 'nobody@mail.test');

        // The account's address: the same answer; the email arrives from the
        // site's contact address, and nothing for nobody@mail.test (read
        // after the account's own email arrived, which bounds the silence).
        await page.getByRole('link', {name: 'Login'}).first().click();
        await expect(page.locator('form#login')).toBeVisible();
        await requestReset(page, actor.email);
        const {link, summary} = await readResetLink(pkpMail, actor.email);
        expect(summary.From.Address).toBe(SITE_CONTACT_EMAIL);
        await pkpMail.expectNone({
            to: 'nobody@mail.test',
            contains: tag,
            afterControl: {to: actor.email, subject: 'Password Reset Confirmation'},
        });

        // "Reset Password": the new password saved; still signed out.
        await completeReset(page, link, newPassword, actor.pressName);
        await page.goto(mySubmissionsUrl(actor.contextPath));
        await expectLoginPage(page);

        // The second browser: its next navigation shows the Login page; that
        // session ended when the new password was saved (Rule 9).
        await secondBrowser.goto(mySubmissionsUrl(actor.contextPath));
        await expectLoginPage(secondBrowser);

        // The new password: press "Login" and sign in with it; lands where an
        // ordinary sign-in would (an author: My Submissions).
        await submitLoginForm(page, actor.username, newPassword);
        await page.waitForURL(/\/dashboard\/mySubmissions/, {timeout: 15_000, waitUntil: 'commit'});
        await expectOwnSession(page);

        // Login As by address, as an Author: the access-denied page and
        // nothing of the refused screen (the session stays the author's own).
        await page.goto(loginAsAddress);
        await expect(page).toHaveURL(/user\/authorizationDenied/);
        await expect(accessDeniedMessage(page)).toBeVisible();
        await expect(page.locator('form#login')).toHaveCount(0);
        await page.goto(mySubmissionsUrl(actor.contextPath));
        await expect(page).toHaveURL(/\/dashboard\/mySubmissions/);
        await expectOwnSession(page);

        // The same address, signed out: the Login page instead (Rule 17).
        await logoutFromMenu(page);
        await page.goto(loginAsAddress);
        await expectLoginPage(page);
        await expect(accessDeniedMessage(page)).toHaveCount(0);

        // Control: the old password now fails with the generic error.
        await submitLoginForm(page, actor.username, actor.password);
        await expect(page.getByText(MSG.genericError)).toBeVisible();
        await expectLoginPage(page);
    });

    test('S5: a stale or altered reset link is refused', async ({ompApi, pkpMail, freshPage}, testInfo) => {
        const tag = makeTag(testInfo, 'u1s5');
        const actor = await seedResetActor(ompApi, tag);
        const newPassword = `newpw${tag}`;

        const page = await freshPage();
        const link = await requestResetLink(page, pkpMail, actor);

        // Use the link once (password change), then sign in — either kills it.
        await completeReset(page, link, newPassword, actor.pressName);
        await signIn(page, {
            username: actor.username,
            password: newPassword,
            contextPath: actor.contextPath,
        });

        // The link while signed in: the Author's home instead of the form.
        await page.goto(link);
        await expect(page).toHaveURL(/\/dashboard\/mySubmissions/);
        await expect(page.getByRole('heading', {name: 'Reset Password'})).toHaveCount(0);
        await expect(page.locator('input[name="password"]')).toHaveCount(0);

        // The link after the change: "Logout" in the user menu, then the used
        // link answers the dead-link page, with a way back.
        await logoutFromMenu(page);
        await page.goto(link);
        await expect(page.getByText(MSG.staleLink)).toBeVisible();
        await expect(page.locator('input[name="password"]')).toHaveCount(0);
        const wayBack = page.getByRole('link', {name: 'Reset Password'});
        await expect(wayBack).toBeVisible();

        // Press it: the lost-password page, asking for "Registered user's
        // email" (Rule 10); the refusal sentence is gone.
        await wayBack.click();
        await expect(page).toHaveURL(/\/login\/lostPassword$/);
        await expect(page.getByRole('heading', {name: 'Reset Password'})).toBeVisible();
        await expect(page.getByText(SESSION_MSG.lostPasswordInstruction)).toBeVisible();
        await expect(lostPasswordEmail(page)).toBeVisible();
        await expect(lostPasswordEmail(page)).toHaveValue('');
        await expect(page.getByText(MSG.staleLink)).toHaveCount(0);

        // A link with a mangled code answers the same.
        const mangled = link.replace(/confirm=[0-9a-f]{8}/, 'confirm=deadbeef');
        expect(mangled).not.toBe(link);
        await page.goto(mangled);
        await expect(page.getByText(MSG.staleLink)).toBeVisible();
        await expect(
            page.getByRole('link', {name: 'Reset Password'})
        ).toBeVisible();

        // Control: a fresh request's link opens "Reset Password" (Rule 9);
        // the refusal was the stale link's own.
        const freshLink = await requestResetLink(page, pkpMail, actor);
        expect(freshLink).not.toBe(link);
        await page.goto(freshLink);
        await expect(page.getByRole('heading', {name: 'Reset Password'})).toBeVisible();
        await expect(page.locator('input[name="password"]').first()).toBeVisible();
        await expect(page.getByText(MSG.staleLink)).toHaveCount(0);
    });

    test('S6: forced password change at first sign-in', async ({ompApi, pkpMail, freshPage}, testInfo) => {
        // A scratch press with a throwaway Editor and Author and a
        // submission in review; the seeded press beside it makes the site
        // multi-press (spec fn-s). "nova" and "orin", their addresses and
        // Changed1 / Changed2 are tagged per run.
        const tag = makeTag(testInfo, 'u1s6');
        const editor = {username: `ed${tag}`, password: `ed${tag}ed${tag}`, contextPath: tag};
        const authorUsername = `au${tag}`;
        const nova = {
            givenName: `Nova${tag}`,
            username: `nova${tag}`,
            email: `nova${tag}@mail.test`,
            newPassword: `Changed1${tag}`,
        };
        const orin = {
            givenName: `Orin${tag}`,
            username: `orin${tag}`,
            email: `orin${tag}@mail.test`,
            newPassword: `Changed2${tag}`,
        };
        await ompApi.createContext({
            tag,
            users: [
                {username: editor.username, roles: ['editor'], givenName: `Ed${tag}`, familyName: 'Editor'},
                {username: authorUsername, roles: ['author'], givenName: `Au${tag}`, familyName: 'Author'},
            ],
        });
        const seeded = await ompApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: authorUsername,
            decisions: ['sendExternalReview'],
        });

        // "Create New Reviewer": the Editor creates nova, then orin the
        // same way, each with a throwaway address.
        const editorPage = await freshPage(editor);
        await editorPage.goto(
            `/index.php/${tag}/en/dashboard/editorial?workflowSubmissionId=${seeded.submissionId}`
        );
        const modal = await awaitWorkflow(editorPage);
        await createNewReviewer(editorPage, modal, nova);
        await createNewReviewer(editorPage, modal, orin);

        // The registration email: each delivers a username and a generated
        // password.
        const novaMail = await readReviewerCredentials(pkpMail, nova.email);
        expect(novaMail.username).toBe(nova.username);
        expect(novaMail.password).toBeTruthy();
        const orinMail = await readReviewerCredentials(pkpMail, orin.email);
        expect(orinMail.username).toBe(orin.username);
        expect(orinMail.password).toBeTruthy();
        expect(orinMail.password).not.toBe(novaMail.password);

        // Signing in with them, on the press's Login page, with nova's:
        // "Change Password" instead of landing anywhere.
        const reviewerPage = await freshPage();
        await reviewerPage.goto(loginUrl(tag));
        await submitLoginForm(reviewerPage, novaMail.username, novaMail.password);
        await reviewerPage.waitForURL(/\/login\/changePassword\//, {timeout: 15_000});
        await expect(reviewerPage).toHaveURL(new RegExp(`/index\\.php/${tag}/`));
        const changeForm = await expectForcedChange(reviewerPage, nova.username);

        // A wrong current password errors verbatim (Fields).
        await submitForcedChange(changeForm, 'not-the-password', nova.newPassword);
        await expect(reviewerPage.getByText(MSG.wrongCurrent)).toBeVisible();

        // "Change Password": the emailed password as current and a new one:
        // signed in, on the Dashboard's "Action Required by me" view, the
        // landing the reviewer role earns (Rules 3, 11).
        await submitForcedChange(changeForm, novaMail.password, nova.newPassword);
        await expectActionRequiredByMe(reviewerPage);
        await expectOwnSession(reviewerPage);

        // The site-level Login page, the second reviewer: "Logout" in the
        // user menu, the site's own homepage, "Login" at its top right;
        // orin's emailed username and password: "Change Password" there too.
        await logoutFromMenu(reviewerPage);
        await reviewerPage.goto(siteHomeUrl());
        await reviewerPage.getByRole('link', {name: 'Login', exact: true}).first().click();
        await expect(reviewerPage).toHaveURL(new RegExp(`${siteLoginUrl()}$`));
        await expect(reviewerPage.locator('form#login')).toBeVisible();
        await submitLoginForm(reviewerPage, orinMail.username, orinMail.password);
        await reviewerPage.waitForURL(/\/index\.php\/index\/en\/login\/changePassword\//, {
            timeout: 15_000,
        });
        const siteChangeForm = await expectForcedChange(reviewerPage, orin.username);

        // The emailed password and Changed2, "OK": signed in, on the site
        // home page (the press list), not the Dashboard (Rule 11). The
        // public user menu naming orin is the signed-in read.
        await submitForcedChange(siteChangeForm, orinMail.password, orin.newPassword);
        await reviewerPage.waitForURL((url) => !url.pathname.includes('/login'), {
            timeout: 20_000,
            waitUntil: 'commit',
        });
        await expect(reviewerPage).toHaveURL(/\/index\.php\/index\/en(\/index)?$/);
        await expect(reviewerPage.getByText(scratchPressName(tag))).toBeVisible();
        await expect(reviewerPage.getByText('Public Knowledge Press')).toBeVisible();
        await expect(
            publicUserMenu(reviewerPage).getByRole('link', {name: new RegExp(`^${orin.username}`)})
        ).toBeVisible();
        await expect(changePasswordForm(reviewerPage)).toHaveCount(0);
        await expect(reviewerPage).not.toHaveURL(/dashboard/);

        // Control: "Logout" in the user menu, then on the press's Login
        // page nova with Changed1: a normal sign-in, the Dashboard with no
        // "Change Password" form.
        await logoutFromPublicMenu(reviewerPage, orin.username);
        await reviewerPage.goto(loginUrl(tag));
        await submitLoginForm(reviewerPage, nova.username, nova.newPassword);
        await expectActionRequiredByMe(reviewerPage);
        await expect(reviewerPage).not.toHaveURL(/changePassword/);
        await expect(changePasswordForm(reviewerPage)).toHaveCount(0);
        await expect(reviewerPage.getByRole('heading', {name: 'Change Password'})).toHaveCount(0);
        await expectOwnSession(reviewerPage);
    });

    test('S7: administrator impersonates a user and returns', async ({freshPage}) => {
        // The Author is Bea Author: her initials, "BA", differ from the
        // administrator's ("AA", the installer's "admin admin"; Alex
        // Author's are "AA" too), so the top bar's two sets of initials
        // can be told apart.
        const AUTHOR = {username: 'author.bea', name: 'Bea Author', given: 'Bea', initials: 'BA'};
        // Fresh sign-in: impersonation migrates the session it runs in.
        const page = await freshPage(ADMIN);

        // The user menu before impersonating: it offers "Logout"; the link
        // behind it is the sign-out address (Rule 15), copied now.
        const navBefore = await openUserMenu(page);
        const signOutAddress = await logoutLink(navBefore).getAttribute('href');
        expect(signOutAddress).toMatch(/\/login\/signOut$/);
        // The menu's own list ends "Edit Profile", "Logout"; the top bar
        // shows one set of initials, the administrator's, not muted (the
        // controls for the reads taken while impersonating).
        await expect(userMenuEntries(navBefore)).toHaveText(['Edit Profile', 'Logout']);
        await closeUserMenu(page);
        await expect(userNavAvatars(page)).toHaveCount(1);
        await expect(userNavAvatars(page).first()).not.toHaveClass(AVATAR.muted);
        const ownInitials = (await userNavAvatars(page).first().innerText()).trim();
        expect(ownInitials).toMatch(/^\S{1,3}$/);
        const ownLook = await avatarLook(userNavAvatars(page).first());

        // The administrator's own row on Users & Roles offers no "Login As";
        // "Edit" is the positive control (the menu rendered).
        await page.goto(usersScreenUrl(PK));
        await searchUsers(page, 'admin');
        const ownRow = userRow(page, 'admin@mail.test');
        await expect(ownRow).toBeVisible();
        const ownMenu = await openUserRowMenu(page, ownRow);
        await expect(ownMenu.filter({hasText: 'Edit'})).toBeVisible();
        await expect(ownMenu.filter({hasText: 'Login As'})).toHaveCount(0);
        await closeUserRowMenu(ownRow);

        // "Login As" on an Author's row: the dialog warns, verbatim, with OK
        // and Cancel.
        await searchUsers(page, AUTHOR.given);
        const row = userRow(page, AUTHOR.name);
        await expect(row).toBeVisible();
        await (await openUserRowMenu(page, row)).filter({hasText: 'Login As'}).click();
        const dialog = await expectLoginAsDialog(page);

        // Cancel: the dialog closes; still the administrator's own session.
        await dialog.getByRole('button', {name: 'Cancel'}).click();
        await expect(dialog).toHaveCount(0);
        await expect(page).toHaveURL(/management\/settings\/access/);
        await expectOwnSession(page);

        // OK: the browser is now the Author's session: their name, their My
        // Submissions; the user menu says who is being worn and offers no
        // plain "Logout", only "Logout as {author}".
        await (await openUserRowMenu(page, row)).filter({hasText: 'Login As'}).click();
        await confirmLoginAsDialog(page);
        await page.waitForURL(/\/dashboard\/mySubmissions/, {
            timeout: 20_000,
            waitUntil: 'commit',
        });
        await expect(
            page.getByRole('link', {name: 'My Submissions as Author'})
        ).toBeVisible({timeout: 20_000});
        await expect(page.getByRole('heading', {name: /Active submissions/})).toBeVisible();
        // The top bar: the administrator's initials, muted, with the
        // Author's overlaid in a warning color (Rule 13). The button names
        // both accounts, the administrator first; the first initials are
        // the ones read before, now in the muted text color; the second
        // sit over them on the warning background.
        await expect(userNav(page).locator('> button')).toHaveAccessibleName(/admin.*author\.bea/);
        const avatars = userNavAvatars(page);
        await expect(avatars).toHaveCount(2);
        await expect(avatars.nth(0)).toHaveText(ownInitials);
        await expect(avatars.nth(0)).toHaveClass(AVATAR.muted);
        await expect(avatars.nth(0)).not.toHaveClass(AVATAR.warning);
        await expect(avatars.nth(1)).toHaveText(AUTHOR.initials);
        expect(AUTHOR.initials).not.toBe(ownInitials);
        await expect(avatars.nth(1)).toHaveClass(AVATAR.warning);
        await expect(avatars.nth(1)).not.toHaveClass(AVATAR.muted);
        const mutedLook = await avatarLook(avatars.nth(0));
        const overlaidLook = await avatarLook(avatars.nth(1));
        expect(mutedLook.color, 'the administrator\'s initials changed color: muted').not.toBe(ownLook.color);
        expect(mutedLook.background).toBe(ownLook.background);
        expect(overlaidLook.background, 'the Author\'s initials stand on another color').not.toBe(mutedLook.background);
        expect(overlaidLook.position).toBe('absolute');
        expect(
            overlaidLook.left < mutedLook.right && overlaidLook.right > mutedLook.left &&
                overlaidLook.top < mutedLook.bottom && overlaidLook.bottom > mutedLook.top,
            'the Author\'s initials overlap the administrator\'s'
        ).toBe(true);

        // The user menu: "You are currently logged in as {author}" with a
        // "Logout as {author}" link, the same link a second time after
        // "Edit Profile", where "Logout" stood, and no plain "Logout".
        const nav = await expectImpersonating(page, AUTHOR.username);
        const logoutAsLinks = nav.getByRole('link', {name: `Logout as ${AUTHOR.username}`});
        await expect(logoutAsLinks).toHaveCount(2);
        await expect(userMenuEntries(nav)).toHaveText(['Edit Profile', `Logout as ${AUTHOR.username}`]);
        const firstExit = await logoutAsLinks.nth(0).getAttribute('href');
        expect(firstExit).toMatch(/\/login\/signOutAsUser$/);
        await expect(logoutAsLinks.nth(1)).toHaveAttribute('href', firstExit);

        // "Logout as {author}" restores the administrator, no password asked.
        await nav.getByRole('link', {name: `Logout as ${AUTHOR.username}`}).first().click();
        await page.waitForURL(/\/dashboard\/editorial/, {
            timeout: 20_000,
            waitUntil: 'commit',
        });
        await expect(page.locator('form#login')).toHaveCount(0);
        await expectOwnSession(page);
        // The top bar is the administrator's own again: one set of
        // initials, in the color read before impersonating.
        await expect(userNavAvatars(page)).toHaveCount(1);
        await expect(userNavAvatars(page).first()).toHaveText(ownInitials);
        await expect(userNavAvatars(page).first()).not.toHaveClass(AVATAR.muted);
        expect((await avatarLook(userNavAvatars(page).first())).color).toBe(ownLook.color);

        // Control: impersonate the Author again and type the copied sign-out
        // address instead: the Login page, signed out of both identities;
        // Users & Roles then shows the Login page too (Rules 4, 15).
        await page.goto(usersScreenUrl(PK));
        await searchUsers(page, AUTHOR.given);
        await (await openUserRowMenu(page, userRow(page, AUTHOR.name))).filter({hasText: 'Login As'}).click();
        await confirmLoginAsDialog(page);
        await page.waitForURL(/\/dashboard\/mySubmissions/, {
            timeout: 20_000,
            waitUntil: 'commit',
        });
        await expectImpersonating(page, AUTHOR.username);
        await closeUserMenu(page);
        await page.goto(signOutAddress);
        await expectLoginPage(page);
        await page.goto(editorialUrl(PK));
        await expectLoginPage(page);
        await page.goto(usersScreenUrl(PK));
        await expectLoginPage(page);
    });

    test('S8: editor impersonates a participant from the Participants panel', async ({ompApi, freshPage}, testInfo) => {
        const tag = makeTag(testInfo, 'u1s8');
        const seeded = await seedMonograph(ompApi, tag, {
            decisions: ['skipInternalReview'],
            reviewRounds: [
                {stage: 'external', reviewers: [{username: 'reviewer.julia', status: 'accepted'}]},
            ],
        });
        const editorialPath = `/index.php/${PK}/en/dashboard/editorial?workflowSubmissionId=${seeded.submissionId}`;
        // A throwaway account holding a role only on a scratch press: out of
        // the Press Manager's reach (spec fn-s).
        const scratchTag = makeTag(testInfo, 'u1s8x');
        const scratch = await ompApi.createContext({
            tag: scratchTag,
            users: [{username: `rdr${scratchTag}`, roles: ['reader']}],
        });
        const outOfReachId = scratch.users.find((user) => user.username === `rdr${scratchTag}`).id;

        // Fresh sign-in: impersonation migrates the session it runs in.
        const page = await freshPage(EDITOR);
        await page.goto(editorialPath);
        let modal = await awaitWorkflow(page);

        // The Reviewers table offers the same row action for reviewers
        // (presence only — driven via its own dialog, then cancelled).
        const reviewerRow = modal
            .locator('[data-cy="reviewer-manager"]')
            .getByRole('row')
            .filter({hasText: 'Julia Reviewer'});
        await reviewerRow.getByRole('button', {name: 'More Actions'}).click();
        await modal
            .locator('[data-cy="reviewer-manager"]')
            .getByRole('menuitem', {name: 'Login As'})
            .click();
        const reviewerDialog = page
            .locator('[data-cy="dialog"]')
            .filter({hasText: 'Login As'});
        await expect(reviewerDialog.getByText(MSG.confirmLoginAs)).toBeVisible();
        await reviewerDialog.getByRole('button', {name: 'Cancel'}).click();
        await expect(reviewerDialog).toHaveCount(0);

        // The Editor's own row on the Participants panel offers no "Login As"
        // (Rule 14); the menu's other entries are the positive control.
        const participants = modal.locator('[data-cy="participant-manager"]');
        await participants
            .getByRole('button', {name: /Diana Editor More Actions/})
            .click();
        const ownMenu = participants.getByRole('menuitem');
        await expect(ownMenu.first()).toBeVisible();
        await expect(ownMenu.filter({hasText: 'Login As'})).toHaveCount(0);
        await participants
            .getByRole('button', {name: /Diana Editor More Actions/})
            .click();
        await expect(ownMenu).toHaveCount(0);

        // Participants panel → a Series Editor participant's row → Login As.
        await participants
            .getByRole('button', {name: /Ana Section Editor More Actions/})
            .click();
        await participants.getByRole('menuitem', {name: 'Login As'}).click();
        await confirmLoginAsDialog(page);

        // The browser lands on the SAME submission as that participant…
        await page.waitForURL(
            new RegExp(`dashboard/editorial\\?workflowSubmissionId=${seeded.submissionId}`),
            {timeout: 20_000, waitUntil: 'commit'}
        );
        modal = await awaitWorkflow(page);
        const impersonatedNav = await openUserMenu(page);
        await expect(
            impersonatedNav.getByText('You are currently logged in as sectioneditor.ana')
        ).toBeVisible();
        await closeUserMenu(page);

        // …and the Participants panel's own top entry leads back, to the
        // editor's view of the same submission.
        await modal
            .locator('[data-cy="participant-manager"]')
            .getByRole('button', {name: 'Logout as Ana Section Editor'})
            .click();
        await page.waitForURL(
            new RegExp(`dashboard/editorial\\?workflowSubmissionId=${seeded.submissionId}`),
            {timeout: 20_000, waitUntil: 'commit'}
        );
        modal = await awaitWorkflow(page);
        const restoredNav = await openUserMenu(page);
        await expect(restoredNav.getByText(/logged in as/)).toHaveCount(0);
        await expect(
            restoredNav.getByRole('link', {name: 'Logout', exact: true})
        ).toBeVisible();
        await closeUserMenu(page);

        // Impersonating the submission's Author instead lands on the author's
        // own My Submissions view, which shows no Participants panel — the
        // way back is the user menu's "Logout as {author}" entry.
        await modal
            .locator('[data-cy="participant-manager"]')
            .getByRole('button', {name: /Alex Author More Actions/})
            .click();
        await modal
            .locator('[data-cy="participant-manager"]')
            .getByRole('menuitem', {name: 'Login As'})
            .click();
        await confirmLoginAsDialog(page);
        await page.waitForURL(
            new RegExp(`dashboard/mySubmissions\\?workflowSubmissionId=${seeded.submissionId}`),
            {timeout: 20_000, waitUntil: 'commit'}
        );
        modal = await awaitWorkflow(page); // positive control: the view renders
        await expect(modal.locator('[data-cy="participant-manager"]')).toHaveCount(0);
        const authorNav = await expectImpersonating(page, 'author.alex');
        await authorNav
            .getByRole('link', {name: 'Logout as author.alex'})
            .first()
            .click();
        // The Editor is back in their own session, on the same submission,
        // with no password asked (Rule 15): the editor's view of it, the
        // Participants panel there again, the user menu the Editor's own.
        await page.waitForURL(
            new RegExp(`dashboard/editorial\\?workflowSubmissionId=${seeded.submissionId}`),
            {timeout: 20_000, waitUntil: 'commit'}
        );
        modal = await awaitWorkflow(page);
        await expect(modal.getByText(`Submission ${tag}`).first()).toBeVisible();
        await expect(modal.locator('[data-cy="participant-manager"]')).toBeVisible();
        await expect(page.locator('form#login')).toHaveCount(0);
        await expect(userNav(page).locator('> button')).toHaveAccessibleName(/editor\.diana/);
        await expect(userNav(page).locator('> button')).not.toHaveAccessibleName(/author\.alex/);
        await expectOwnSession(page);

        // Press Manager, a hand-built address to an out-of-reach user: Login
        // As on the Author's row of Users & Roles, the visited address copied
        // (it ends in the Author's id), "Logout as", then the address with
        // the scratch reader's id: the Rule 14 refusal, its causes and the
        // link back to the users list.
        const managerPage = await freshPage(MANAGER);
        await managerPage.goto(usersScreenUrl(PK));
        await searchUsers(managerPage, 'Alex');
        const copiedAddress = await loginAsFromUsersRow(managerPage, userRow(managerPage, 'Alex Author'));
        expect(copiedAddress).toMatch(/\/login\/signInAsUser\/\d+$/);
        await managerPage.waitForURL(/\/dashboard\/mySubmissions/, {
            timeout: 20_000,
            waitUntil: 'commit',
        });
        const wornNav = await expectImpersonating(managerPage, 'author.alex');
        await wornNav.getByRole('link', {name: 'Logout as author.alex'}).first().click();
        await managerPage.waitForURL(/\/dashboard\/editorial/, {
            timeout: 20_000,
            waitUntil: 'commit',
        });
        await expectOwnSession(managerPage);
        const outOfReachAddress = copiedAddress.replace(/\d+$/, String(outOfReachId));
        expect(outOfReachAddress).not.toBe(copiedAddress);
        await managerPage.goto(outOfReachAddress);
        await expect(noAdminRightsMessage(managerPage)).toBeVisible();
        // The possible causes, listed: the opening sentence, the two
        // causes, and who can do it instead.
        await expect(noAdminRightsLead(managerPage)).toBeVisible();
        await expect(noAdminRightsCauses(managerPage)).toHaveText(SESSION_MSG.noAdminRightsCauses);
        await expect(noAdminRightsCause(managerPage)).toBeVisible();
        await expect(noAdminRightsRemedy(managerPage)).toBeVisible();
        await expect(usersListLink(managerPage)).toBeVisible();
        await expect(usersListLink(managerPage)).toHaveAttribute(
            'href',
            new RegExp(`/index\\.php/${PK}/(en/)?management/settings/access$`)
        );
        await expect(managerPage).not.toHaveURL(/dashboard/);

        // Control: the copied number, the Author's own, impersonates the
        // Author again and "Logout as {author}" returns the Press Manager;
        // the refusal is the out-of-reach account's alone.
        await managerPage.goto(copiedAddress);
        await managerPage.waitForURL(/\/dashboard\/mySubmissions/, {
            timeout: 20_000,
            waitUntil: 'commit',
        });
        await expect(noAdminRightsMessage(managerPage)).toHaveCount(0);
        const wornAgain = await expectImpersonating(managerPage, 'author.alex');
        await wornAgain.getByRole('link', {name: 'Logout as author.alex'}).first().click();
        await managerPage.waitForURL(/\/dashboard\/editorial/, {
            timeout: 20_000,
            waitUntil: 'commit',
        });
        await expectOwnSession(managerPage);
    });
});
