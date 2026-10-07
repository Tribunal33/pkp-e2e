// @ts-check
/**
 * @file playwright/tests/U03-user-profile.spec.js
 *
 * User profile — OPS suite, one test per canonical scenario the spec runs on
 * a preprint server (scenarios 1–12, all common, read with the spec's server
 * vocabulary: "server" for "journal", Preprint Server Manager for Journal
 * Manager, Moderator for Section Editor, and no reviewer role at all; the
 * spec lists no OPS-only scenario).
 * Spec: docs/specs/U03-user-profile.md
 *
 * OPS form of scenario 6 (register OPS1 ✅, an intended difference): the
 * spec names a "Reviewer" box and a "Reviewing interests" tag box. A
 * preprint server offers "Reader" and "Author" only and shows no interests
 * box, so S6 runs the absence form (RUNBOOK multi-app rule 3, PRINCIPLES
 * M4): no reviewer box, no interests box and no interest suggested to
 * another user, each paired with a positive control taken the same way (the
 * two boxes that are offered, in the same section; the fold that ends the
 * tab). The fold reads "Register with other servers" / "Hide other servers".
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap):
 * A2 🐞, A18 🐞, A4 🐞, A5 ❓, A6 ❓, A7 🐞, A8 ❓, A9 ❓, A10 🐞, A11 🐞,
 * A12 🐞, A14 🐞, OPS2 🐞. Where a test passes through one (S3 presses a
 * tab after the refused Contact save, A17; S7 saves the corrected homepage
 * (A15 retired); S4 reads the confirmation where the app delivers it, A8; S8 saves
 * after the refusals, A11) it asserts the effect the spec states and leaves
 * the finding's own claim unasserted either way. S12 reads the first
 * contributor's name and ORCID field as the screen shows them today, the
 * given-plus-family name with an empty preferred-name box and "Request
 * verification", because the register's A13 ❓ and A16 ❓ describe exactly
 * that; the read is a record of today's screen, never a pass of the hint's
 * promise. The spec's Coverage section records everything else left out.
 *
 * Isolation: every account that changes is a throwaway user in a scratch
 * server seeded through the scenario endpoint (unique tags naming the app;
 * the scenario API rejects reviewer roles on OPS, and none is asked for);
 * the roster and `publicknowledge` are only read (S1). Scenario 10 runs as
 * a scratch server's own Preprint Server Manager rather than `manager.maya`,
 * so no seeded user's notification choices are touched (PRINCIPLES A7).
 * Every sign-in that a scenario may end (sign-out, password change,
 * impersonation) or move into French (S2's manager reads Users & Roles in
 * French, which flips that session's language) happens in the test's own
 * fresh browser context through the real Login form, never through the
 * shared .auth cache; the cached identities used are `reader.rosa` (S1's
 * control read) and the scratch managers that only read (S6). Mailpit reads
 * are scoped by the throwaway recipient (PRINCIPLES A8) and every silence
 * claim is bounded by a message the test itself triggers. A refused image
 * upload raises a browser alert (Rule 9a), so S7 records every dialog
 * before its uploads; S3 answers the unsaved-changes question itself; S9
 * answers the delete question. No hard-coded waits.
 */
const path = require('path');
const {test, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {MySubmissionsPage} = require('../../../../shared/playwright/pages/MySubmissionsPage.js');
const {
    ProfilePage,
    SAVED_MESSAGE,
    userNav,
    openUserNav,
} = require('../../../../shared/playwright/pages/ProfilePage.js');
const {UsersRolesPage} = require('../pages/UserInvitationPages.js');
const {UserMenu, loginAsFromUsersRow} = require('../pages/LoginSessionsPages.js');
const wizard = require('../pages/SubmissionWizardPages.js');
const {getPassword, getEmail} = require('../../../../shared/playwright/data/users.js');

const SERVER = 'publicknowledge';
const REQUIRED = 'This field is required.';
const EMAIL_TAKEN = 'The selected email address is already in use by another user.';
const URL_INVALID = 'Please enter a valid URL.';
const UPLOAD_REFUSED = 'The file could not be uploaded or revised.';
const UNSAVED_QUESTION = 'The data on this form has changed. Do you wish to continue without saving?';
const CURRENT_PASSWORD_WRONG = 'The current password you entered was incorrect.';
const PASSWORDS_MISMATCH = 'The passwords do not match.';
const PASSWORD_SAME_AS_OLD = 'Your new password is the same as your old password.';
const PASSWORD_TOO_SHORT = 'The password must be at least 6 characters.';
const ERRORS_HEADING = 'Errors occurred processing this form';
const LOGIN_ERROR = 'Invalid username/email or password. Please try again.';
const CHANGE_EMAIL_SUBJECT = 'Confirm account contact email change request';
const OTHER_SERVERS = 'Register with other servers';
const HIDE_OTHER_SERVERS = 'Hide other servers';
/** The preprint server's self-service boxes, in the tab's order (Rule 8a, OPS1). */
const SERVER_ROLE_BOXES = ['Reader', 'Author'];
const NOTIFICATIONS_INTRO =
    'Select the system events that you wish to be notified about. Unchecking an item will prevent notifications of the event from showing up in the system and also from being emailed to you. Checked events will appear in the system and you have an extra option to receive or not the same notification by email.';
const NOTIFICATION_GROUPS = ['Public Announcements', 'Submission Events', 'Reviewing Events', 'Editors'];
const API_KEY_GENERATE_NOTE = 'Generating a new API key will invalidate any existing key for this user.';
const API_KEY_REMOVE_NOTE = 'Deleting a key will revoke access to any application that uses it.';
const IMAGE_FIXTURE = path.resolve(__dirname, '../fixtures/files/profile-image-400.png');
const TEXT_FIXTURE = path.resolve(__dirname, '../fixtures/files/not-an-image.txt');
const TEXT_AS_IMAGE_FIXTURE = path.resolve(__dirname, '../fixtures/files/not-an-image.png');
const TEST_ORCID = 'https://orcid.org/0000-0002-1825-0097';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u03${scenario}opsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A fresh, explicitly-anonymous context (never inherits cached storage state). */
async function anonContext(browser, baseURL) {
    return browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
}

/**
 * Fresh UI login on a server's Login page, in its own context. Used for
 * every actor whose session this suite may end (sign-out, password change,
 * impersonation) or move into another language, so the shared .auth cache
 * is never poisoned.
 */
async function freshLogin(browser, baseURL, contextPath, username, password = getPassword(username)) {
    const context = await anonContext(browser, baseURL);
    const page = await context.newPage();
    await page.goto(`/index.php/${contextPath}/login`);
    const loginPage = new LoginPage(page);
    await loginPage.signIn(username, password);
    return {context, page};
}

/** Sign out through the user menu's "Logout" and wait for the Login page. */
async function signOut(page) {
    await openUserNav(page);
    await userNav(page).getByRole('link', {name: 'Logout', exact: true}).click();
    await page.waitForURL(/\/login/, {waitUntil: 'commit', timeout: 30_000});
    await expect(page.locator('form#login')).toBeVisible();
}

/** Attempt a sign-in on a server's Login page and expect the generic refusal. */
async function expectSignInRefused(browser, baseURL, contextPath, username, password) {
    const context = await anonContext(browser, baseURL);
    try {
        const page = await context.newPage();
        await page.goto(`/index.php/${contextPath}/login`);
        const loginPage = new LoginPage(page);
        await loginPage.usernameInput.fill(username);
        await loginPage.fillPassword(password);
        await loginPage.submitButton.click();
        await expect(page.getByText(LOGIN_ERROR)).toBeVisible();
    } finally {
        await context.close();
    }
}

/**
 * Count the POSTs matching `pattern` a page sends from now on: the "nothing
 * is sent" claims of a browser-side refusal read this after the refusal
 * shows, and the same test's later accepted request is the positive
 * control.
 */
function countPosts(page, pattern) {
    const counter = {count: 0};
    page.on('request', (request) => {
        if (request.method() === 'POST' && pattern.test(request.url())) {
            counter.count += 1;
        }
    });
    return counter;
}

/** The profile tabs' save POSTs. */
function countSaves(page) {
    return countPosts(page, /\/profile-tab\/save-/);
}

/**
 * Users & Roles (Users tab) of a scratch server, as a manager of it, in the
 * language the address names (none: the session's own). The search is
 * bounded by the list's own response to the username, so the row read
 * after it is current (PRINCIPLES M4); the row is found by the account's
 * email address, which no language changes.
 */
async function usersRolesRow(managerPage, contextPath, username, email, {locale = null} = {}) {
    const usersRoles = new UsersRolesPage(managerPage, contextPath);
    await usersRoles.goto({locale});
    await usersRoles.searchUsers(username);
    const row = usersRoles.userRow(email);
    await expect(row).toBeVisible({timeout: 30_000});
    return row;
}

/**
 * The server's public "Editorial Masthead" page, read for the absence of a
 * name: the heading and the page's own "Editorial History" link are the
 * positive control that the page rendered its content.
 */
async function expectMastheadWithout(page, contextPath, name) {
    await page.goto(`/index.php/${contextPath}/about/editorialMasthead`);
    await expect(page.getByRole('heading', {name: 'Editorial Masthead'})).toBeVisible();
    await expect(page.getByRole('link', {name: 'Editorial History', exact: true})).toBeVisible();
    await expect(page.getByRole('main')).not.toContainText(name);
}

/** Pull the emailed "confirm" and "reject" links out of one change-email message. */
async function changeEmailLinks(pkpMail, summary) {
    const full = await pkpMail.fullMessage(summary.ID);
    const confirm = pkpMail.extractLink(full.HTML, /confirm/i);
    const reject = pkpMail.extractLink(full.HTML, /reject/i);
    expect(confirm, 'confirm link present in the email').toBeTruthy();
    expect(reject, 'reject link present in the email').toBeTruthy();
    return {full, confirm, reject};
}

/** Request an email change on the open Contact tab (Country chosen first: seed-facts). */
async function requestEmailChange(profile, newEmail) {
    await profile.country().selectOption({label: 'Canada'});
    await profile.email().fill(newEmail);
    await profile.save();
    await expect(profile.pendingEmailNotice()).toBeVisible();
    await expect(profile.email()).toHaveAttribute('readonly', /.*/);
}

/** Open the user menu's "Edit Profile" and wait for the Identity tab. */
async function openEditProfile(page, contextPath) {
    await openUserNav(page);
    await userNav(page).getByRole('link', {name: 'Edit Profile', exact: true}).click();
    const profile = new ProfilePage(page, contextPath);
    await profile.expectOpen('identity');
    return profile;
}

/**
 * The absence form of the "Reviewing interests" box on a Roles tab (OPS1):
 * no `#interests` block, no typing box and no label, the fold's link in the
 * same form being the positive control that the tab rendered to its end.
 */
async function expectNoInterestsBox(profile) {
    await expect(profile.otherContextsLink()).toBeVisible();
    await expect(profile.form('roles').locator('#interests')).toHaveCount(0);
    await expect(profile.interestsInput()).toHaveCount(0);
    await expect(profile.form('roles').getByText('Reviewing interests')).toHaveCount(0);
}

test.describe('user profile', () => {
    test('S1: reach the profile and its tabs', {tag: '@smoke'}, async ({browser, baseURL, asUser}) => {
        test.slow();
        // Fresh session: the scenario ends with a sign-out, which would kill a
        // cached session for parallel tests.
        const {context, page} = await freshLogin(browser, baseURL, SERVER, 'author.alex');
        try {
            // On an editorial screen, the user menu's "Edit Profile" (Rule 1).
            await page.goto(`/index.php/${SERVER}/dashboard/mySubmissions`);
            const profile = await openEditProfile(page, SERVER);
            await expect(page).toHaveURL(/\/user\/profile/);
            await profile.expectSelectedTab('identity');
            await expect(profile.tabs.getByRole('tab')).toHaveText([
                'Identity',
                'Contact',
                'Roles',
                'Public',
                'Password',
                'Notifications',
                'API Key',
            ]);

            // Identity: the username as plain text, the names filled.
            await expect(profile.usernameText()).toContainText('author.alex');
            await expect(profile.givenName()).toHaveValue('Alex');
            await expect(profile.familyName()).toHaveValue('Author');
            await expect(profile.saveButton()).toBeVisible();
            await expect(profile.privacySentence()).toBeVisible();
            await expect(profile.privacyLink()).toBeVisible();

            // Each other tab opens with "Save" and ends with the privacy
            // sentence; the API Key tab has its own button instead.
            for (const tab of ['contact', 'roles', 'public', 'password', 'notifications']) {
                await profile.open(tab);
                await profile.expectSelectedTab(tab);
                await expect(profile.saveButton()).toBeVisible();
                await expect(profile.privacySentence()).toBeVisible();
                await expect(profile.privacyLink()).toBeVisible();
            }
            await profile.open('apiKey');
            await profile.expectSelectedTab('apiKey');
            await expect(profile.saveButton()).toHaveCount(0);
            await expect(
                profile.form('apiKey').getByRole('button', {name: /^(Create API Key|Delete)$/})
            ).toBeVisible();
            await expect(profile.privacySentence()).toBeVisible();
            await expect(profile.privacyLink()).toBeVisible();

            // The privacy link opens the server's Privacy Statement in a new
            // browser tab (Rule 14).
            const [privacyTab] = await Promise.all([
                context.waitForEvent('page'),
                profile.privacyLink().click(),
            ]);
            await privacyTab.waitForLoadState();
            await expect(privacyTab).toHaveURL(new RegExp(`/${SERVER}/(en/)?about/privacy`));
            await expect(privacyTab.getByRole('heading', {name: 'Privacy Statement'})).toBeVisible();
            await privacyTab.close();

            // The copied address with a tab named after "profile": a known
            // name opens that tab, an unknown one opens Identity (Rule 2).
            const address = page.url().replace(/[#?].*$/, '');
            expect(address).toMatch(/\/user\/profile$/);
            await page.goto(`${address}/contact`);
            await profile.expectOpen('contact');
            await profile.expectSelectedTab('contact');
            await page.goto(`${address}/nowhere`);
            await profile.expectOpen('identity');
            await profile.expectSelectedTab('identity');
            await expect(profile.tabs.getByRole('tab', {selected: true})).toHaveCount(1);

            // Control: the Reader, in a second browser, at the same address
            // sees their own profile, never the Author's (Actors).
            const readerPage = await (await asUser('reader.rosa')).newPage();
            await readerPage.goto(address);
            const readerProfile = new ProfilePage(readerPage, SERVER);
            await readerProfile.expectOpen('identity');
            await expect(readerProfile.usernameText()).toContainText('reader.rosa');
            await expect(readerProfile.usernameText()).not.toContainText('author.alex');

            // Sign out, paste the address back: the Login page, and signing
            // in continues to the profile (Actors row 1).
            await signOut(page);
            await page.goto(address);
            const loginPage = new LoginPage(page);
            await expect(page.locator('form#login')).toBeVisible();
            await loginPage.signIn('author.alex', getPassword('author.alex'));
            await page.waitForURL(/\/user\/profile/, {waitUntil: 'commit', timeout: 30_000});
            await profile.expectOpen('identity');
        } finally {
            await context.close();
        }
    });

    test('S2: rename yourself and change your initials', async ({browser, baseURL, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const username = `${tag}au`;
        const manager = `${tag}mg`;
        const email = `${username}@mail.test`;
        const preferredName = `Dr. Pat Profile ${tag}`;
        // French among the server's languages, so its French listing address works (fn-s).
        await opsApi.createContext({
            tag,
            context: {supportedLocales: ['en', 'fr_CA']},
            users: [
                {username, givenName: 'Ulla', familyName: 'Bergmann', roles: ['author']},
                {username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
            ],
        });

        const {context, page} = await freshLogin(browser, baseURL, tag, username);
        // The Preprint Server Manager's session is fresh: its French read
        // flips the session's language, which a cached state would leak.
        const managerSession = await freshLogin(browser, baseURL, tag, manager);
        try {
            const profile = new ProfilePage(page, tag);
            await profile.goto('identity');
            const saves = countSaves(page);

            // An empty given name is refused in the browser: the sentence
            // under the box and nothing sent (Fields Identity).
            await profile.givenName().fill('');
            await profile.saveButton().click();
            await expect(profile.fieldError(REQUIRED)).toBeVisible();
            expect(saves.count).toBe(0);

            // Name back, a display name, two lowercase letters that turn into
            // capitals; a third is not accepted (Rule 5).
            await profile.givenName().fill('Ulla');
            await profile.preferredPublicName().fill(preferredName);
            await profile.avatarInitials().fill('');
            await profile.avatarInitials().pressSequentially('zqx');
            await expect(profile.avatarInitials()).toHaveValue('ZQ');
            await profile.save();
            expect(saves.count).toBe(1);

            // Saved inside the tab only, nothing at the top right (Rule 2).
            await expect(profile.inTabNotice('identity')).toContainText(SAVED_MESSAGE);
            await expect(profile.toast).not.toContainText(SAVED_MESSAGE);

            // After a reload the avatar shows the capitals and the top bar
            // still the username, never the preferred name (Rules 4–5).
            await page.reload();
            await profile.expectOpen('identity');
            const avatar = userNav(page).getByRole('button', {name: /^ZQ /});
            await expect(avatar).toBeVisible();
            await expect(avatar).toContainText(username);
            await expect(avatar).not.toContainText(preferredName);

            // The Preprint Server Manager's Users & Roles lists the preferred
            // name (Rule 4).
            const row = await usersRolesRow(managerSession.page, tag, username, email);
            await expect(row).toContainText(preferredName);

            // The same list in French lists the given and family name: a
            // preferred name typed in English does not carry (Rule 4; the
            // row's presence is the control).
            const frenchRow = await usersRolesRow(managerSession.page, tag, username, email, {locale: 'fr_CA'});
            await expect(managerSession.page).toHaveURL(/\/fr_CA\//);
            await expect(frenchRow).toContainText('Ulla Bergmann');
            await expect(frenchRow).not.toContainText(preferredName);

            // The site-level address forwards a one-server user to the
            // server's own profile (Rule 3).
            await page.goto('/index.php/index/user/profile');
            await expect(page).toHaveURL(new RegExp(`/${tag}/(en/)?user/profile`));
            await profile.expectOpen('identity');

            // Cleared again: the avatar returns to the name's initials.
            await profile.preferredPublicName().fill('');
            await profile.avatarInitials().fill('');
            await profile.save();
            await expect(profile.inTabNotice('identity')).toContainText(SAVED_MESSAGE);
            await page.reload();
            await profile.expectOpen('identity');
            const initials = userNav(page).getByRole('button', {name: /^UB /});
            await expect(initials).toBeVisible();
            await expect(initials).toContainText(username);
            await expect(initials).not.toContainText(preferredName);
            // (The French read flipped the manager's session language, so
            // the English list is opened by its own address from here on.)
            const rowAgain = await usersRolesRow(managerSession.page, tag, username, email, {locale: 'en'});
            await expect(rowAgain).toContainText('Ulla Bergmann');
            await expect(rowAgain).not.toContainText(preferredName);

            // The family name cleared as well: the given name's first letter
            // alone (Rule 5).
            await profile.familyName().fill('');
            await profile.save();
            await expect(profile.inTabNotice('identity')).toContainText(SAVED_MESSAGE);
            await page.reload();
            await profile.expectOpen('identity');
            const letter = userNav(page).getByRole('button', {name: /^U /});
            await expect(letter).toBeVisible();
            await expect(letter).toContainText(username);
            await expect(letter).not.toContainText(preferredName);

            // Control: the server's public homepage shows the username in
            // its header as well (Rule 4).
            await page.goto(`/index.php/${tag}`);
            await expect(
                page.getByRole('banner').getByRole('link', {name: new RegExp(`^${username}`)})
            ).toBeVisible();
            await expect(page.getByRole('banner')).not.toContainText(preferredName);
        } finally {
            await context.close();
            await managerSession.context.close();
        }
    });

    test('S3: update contact details', async ({browser, baseURL, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const username = `${tag}au`;
        const email = `${username}@mail.test`;
        await opsApi.createContext({
            tag,
            users: [{username, givenName: 'Cora', familyName: 'Contact', roles: ['author']}],
        });

        const {context, page} = await freshLogin(browser, baseURL, tag, username);
        try {
            const profile = new ProfilePage(page, tag);
            await profile.goto('contact');
            const saves = countSaves(page);

            // A blank Country is refused in the browser; nothing is saved
            // (Fields Contact; a seeded user has no country, seed-facts).
            await profile.country().selectOption({value: ''});
            await profile.phone().fill('555 0100');
            await profile.saveButton().click();
            await expect(profile.fieldError(REQUIRED)).toBeVisible();
            expect(saves.count).toBe(0);

            // Another tab, the change unsent: the browser's own question;
            // Cancel keeps the Contact tab with the phone still typed, OK
            // opens Identity and Contact reopens with Phone as it was (Rule 2).
            const question = await profile.openAnswering('identity', {proceed: false});
            expect(question).toBe(UNSAVED_QUESTION);
            await profile.expectSelectedTab('contact');
            await expect(profile.phone()).toHaveValue('555 0100');
            await profile.openAnswering('identity', {proceed: true});
            await profile.expectSelectedTab('identity');
            await profile.open('contact');
            await expect(profile.phone()).toHaveValue('');
            expect(saves.count).toBe(0);

            // Country, phone and affiliation save; reopening shows them (Rule 7).
            await profile.country().selectOption({label: 'Canada'});
            await profile.phone().fill('555 0100');
            await profile.affiliation().fill('Contact Institute');
            await profile.save();
            expect(saves.count).toBe(1);
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            await profile.open('identity');
            await profile.open('contact');
            await expect(profile.phone()).toHaveValue('555 0100');
            await expect(profile.affiliation()).toHaveValue('Contact Institute');
            await expect(profile.country()).toHaveValue('CA');

            // "Working Languages": one box per site language; the second
            // ticked and saved, held on reopening, the site still shown in
            // English (Rule 7).
            await expect(profile.workingLanguageBoxes()).toHaveCount(2);
            await expect(profile.workingLanguageBox('en')).toBeVisible();
            await profile.workingLanguageBox('fr_CA').check();
            await profile.save();
            expect(saves.count).toBe(2);
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            await profile.open('identity');
            await profile.open('contact');
            await expect(profile.workingLanguageBox('fr_CA')).toBeChecked();
            await expect(profile.heading).toBeVisible();
            await expect(profile.tabEntry('contact')).toBeVisible();
            await expect(profile.saveButton()).toBeVisible();

            // Another account's address: refused by the server at the top
            // right and in the box's label.
            await profile.email().fill(getEmail('author.alex'));
            await profile.phone().fill('555 0199');
            await profile.save();
            expect(saves.count).toBe(3);
            await expect(profile.toast).toContainText(EMAIL_TAKEN);
            await expect(profile.emailLabel()).toContainText(EMAIL_TAKEN);

            // Another tab after the refused save: Identity opens (the tab
            // handler's question, asked or not, is A17's own claim and is
            // answered OK if it comes, never asserted either way).
            await profile.open('identity');
            await profile.expectSelectedTab('identity');

            // Control: Contact again: the address unchanged, the phone as
            // saved; the refused save saved none of the tab's other changes.
            await profile.open('contact');
            await expect(profile.email()).toHaveValue(email);
            await expect(profile.phone()).toHaveValue('555 0100');
            await expect(profile.affiliation()).toHaveValue('Contact Institute');
        } finally {
            await context.close();
        }
    });

    test('S4: change the email address by confirming the emailed link', async ({browser, baseURL, opsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s4', testInfo);
        const username = `${tag}au`;
        const oldEmail = `${username}@mail.test`;
        const newEmail = `${username}new@mail.test`;
        const controlEmail = `${username}ctl@mail.test`;
        await opsApi.createContext({
            tag,
            users: [{username, givenName: 'Dee', familyName: 'Probe', roles: ['author']}],
        });

        // Two browsers signed in as the same account; the second parked on
        // the profile's Contact tab.
        const first = await freshLogin(browser, baseURL, tag, username);
        const second = await freshLogin(browser, baseURL, tag, username);
        try {
            const otherProfile = new ProfilePage(second.page, tag);
            await otherProfile.goto('contact');

            const profile = new ProfilePage(first.page, tag);
            await profile.goto('contact');
            await requestEmailChange(profile, newEmail);

            // The pending notice, "Cancel", the old address read-only (Rule 6a).
            await expect(profile.pendingEmailNotice()).toContainText(
                `You have requested a change of your email to "${newEmail}". We have already sent you an email with directions on how to validate the changed email.`
            );
            await expect(profile.cancelPendingEmailButton()).toBeVisible();
            await expect(profile.email()).toHaveValue(oldEmail);
            await expect(profile.email()).not.toBeEditable();

            // The second browser: "Identity" opens with the account's names;
            // the session carries on through the pending request (Rule 6a).
            await otherProfile.open('identity');
            await expect(otherProfile.givenName()).toHaveValue('Dee');
            await expect(otherProfile.familyName()).toHaveValue('Probe');
            await expect(otherProfile.usernameText()).toContainText(username);

            // One message to the OLD address from the account holder's own
            // name, naming the new address; nothing to the new address (Rule
            // 6b; the control is the message that did arrive). A preprint
            // server sends this message exactly as a journal does (OPS2 is
            // about the emails list, not the sending).
            const summary = await pkpMail.find({to: oldEmail, subject: CHANGE_EMAIL_SUBJECT});
            expect(summary.From.Name).toBe('Dee Probe');
            expect(summary.From.Address).toBe(oldEmail);
            await pkpMail.expectNone({
                to: newEmail,
                subject: CHANGE_EMAIL_SUBJECT,
                afterControl: {to: oldEmail, subject: CHANGE_EMAIL_SUBJECT},
            });
            const {full, confirm} = await changeEmailLinks(pkpMail, summary);
            expect(full.Text || full.HTML).toContain(newEmail);

            // "confirm", still signed in: the Contact tab with the new
            // address, editable (Rule 6c).
            await first.page.goto(confirm);
            await first.page.waitForURL(/\/user\/profile/, {waitUntil: 'commit', timeout: 30_000});
            await profile.expectOpen('contact');
            await expect(profile.email()).toHaveValue(newEmail);
            await expect(profile.email()).toBeEditable();
            await expect(profile.pendingEmailNotice()).toHaveCount(0);
            await expect(profile.toast).toContainText(SAVED_MESSAGE);

            // Sign out; the new address signs in with the unchanged password.
            await signOut(first.page);
            const loginPage = new LoginPage(first.page);
            await loginPage.signIn(newEmail, getPassword(username));
            await expect(first.page).not.toHaveURL(/\/login/);

            // No further email after the confirm (Side effects): a later
            // request, made now, goes to the address current by then (Rule
            // 6b) and bounds the read; until it arrived the old address
            // held its one request and the new address nothing.
            await profile.goto('contact');
            await requestEmailChange(profile, controlEmail);
            await pkpMail.find({to: newEmail, subject: CHANGE_EMAIL_SUBJECT, contains: controlEmail});
            expect(await pkpMail.count({to: oldEmail})).toBe(1);
            expect(await pkpMail.count({to: newEmail})).toBe(1);
            expect(await pkpMail.count({to: controlEmail})).toBe(0);

            // The old address is refused.
            await expectSignInRefused(browser, baseURL, tag, oldEmail, getPassword(username));
        } finally {
            await first.context.close();
            await second.context.close();
        }
    });

    test('S5: cancel, and reject, an email change', async ({browser, baseURL, opsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s5', testInfo);
        const username = `${tag}au`;
        const oldEmail = `${username}@mail.test`;
        const firstNew = `${username}one@mail.test`;
        const secondNew = `${username}two@mail.test`;
        const thirdNew = `${username}three@mail.test`;
        await opsApi.createContext({
            tag,
            users: [{username, givenName: 'Cal', familyName: 'Probe', roles: ['author']}],
        });

        const {context, page} = await freshLogin(browser, baseURL, tag, username);
        const second = await anonContext(browser, baseURL);
        try {
            const profile = new ProfilePage(page, tag);
            await profile.goto('contact');

            // Request, then the tab's "Cancel": saved inside the tab, the
            // notice gone, the old address editable (Rule 6e).
            await requestEmailChange(profile, firstNew);
            const firstMessage = await pkpMail.find({
                to: oldEmail,
                subject: CHANGE_EMAIL_SUBJECT,
                contains: firstNew,
            });
            const firstLinks = await changeEmailLinks(pkpMail, firstMessage);
            await profile.cancelPendingEmail();
            await expect(profile.inTabNotice('contact')).toContainText(SAVED_MESSAGE);
            await expect(profile.pendingEmailNotice()).toHaveCount(0);
            await expect(profile.email()).toHaveValue(oldEmail);
            await expect(profile.email()).toBeEditable();

            // The cancelled message's "confirm" link is dead (Rule 6f).
            await page.goto(firstLinks.confirm);
            await expect(page.getByRole('heading', {name: 'Invitation Unavailable'})).toBeVisible();

            // A second request; its "reject" link asks, then discards (Rule 6d).
            await profile.goto('contact');
            await requestEmailChange(profile, secondNew);
            const secondMessage = await pkpMail.find({
                to: oldEmail,
                subject: CHANGE_EMAIL_SUBJECT,
                contains: secondNew,
            });
            const secondLinks = await changeEmailLinks(pkpMail, secondMessage);
            await page.goto(secondLinks.reject);
            await expect(page.getByRole('heading', {name: 'Decline Invitation'})).toBeVisible();
            await expect(
                page.getByText(
                    'Are you sure you want to decline this invitation? Confirm the decline by clicking the button below.'
                )
            ).toBeVisible();
            await page.getByRole('button', {name: 'Confirm Decline Invitation', exact: true}).click();
            await page.waitForURL(/\/user\/profile/, {waitUntil: 'commit', timeout: 30_000});
            await profile.expectOpen('contact');
            await expect(profile.email()).toHaveValue(oldEmail);
            await expect(profile.email()).toBeEditable();
            await expect(profile.pendingEmailNotice()).toHaveCount(0);
            await expect(profile.toast).toContainText(SAVED_MESSAGE);

            // That message's "confirm" link is now dead too.
            await page.goto(secondLinks.confirm);
            await expect(page.getByRole('heading', {name: 'Invitation Unavailable'})).toBeVisible();

            // A third request; its "confirm" link in the signed-out second
            // browser: the Login page first, and after the sign-in the
            // Contact tab with the third address, already in force (Rule 6c).
            await profile.goto('contact');
            await requestEmailChange(profile, thirdNew);
            const thirdMessage = await pkpMail.find({
                to: oldEmail,
                subject: CHANGE_EMAIL_SUBJECT,
                contains: thirdNew,
            });
            const thirdLinks = await changeEmailLinks(pkpMail, thirdMessage);
            const secondPage = await second.newPage();
            await secondPage.goto(thirdLinks.confirm);
            await expect(secondPage.locator('form#login')).toBeVisible();
            await new LoginPage(secondPage).signIn(username, getPassword(username));
            await secondPage.waitForURL(/\/user\/profile/, {waitUntil: 'commit', timeout: 30_000});
            const secondProfile = new ProfilePage(secondPage, tag);
            await secondProfile.expectOpen('contact');
            await expect(secondProfile.email()).toHaveValue(thirdNew);
            await expect(secondProfile.email()).toBeEditable();
            await expect(secondProfile.pendingEmailNotice()).toHaveCount(0);

            // Control: the old address's mailbox holds the three requests
            // and nothing else; "Cancel" sent no email (Rule 6e).
            expect(await pkpMail.count({to: oldEmail, subject: CHANGE_EMAIL_SUBJECT})).toBe(3);
            expect(await pkpMail.count({to: oldEmail})).toBe(3);
        } finally {
            await context.close();
            await second.close();
        }
    });

    test('S6: take a role and give it up (absence form: no reviewer box, no interests box)', async ({browser, baseURL, opsApi, asUser}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s6', testInfo);
        const tagB = makeTag('s6b', testInfo);
        const username = `${tag}rd`;
        const manager = `${tag}mg`;
        const email = `${username}@mail.test`;
        const name = 'Rae Scratch';
        const contextName = `Scratch context ${tag}`;
        const contextNameB = `Scratch context ${tagB}`;
        // A Reader who holds no other role (the scenario API has no reviewer
        // key on OPS, and none is needed), the same Reader (and the same
        // manager) enrolled in a second scratch server by naming the
        // username again (fn-s).
        await opsApi.createContext({
            tag,
            users: [
                {username, givenName: 'Rae', familyName: 'Scratch', roles: ['reader']},
                {username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
            ],
        });
        await opsApi.createContext({
            tag: tagB,
            users: [
                {username, givenName: 'Rae', familyName: 'Scratch', roles: ['reader']},
                {username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
            ],
        });

        const {context, page} = await freshLogin(browser, baseURL, tag, username);
        try {
            const profile = new ProfilePage(page, tag);
            await profile.goto('roles');

            // Under "Roles": exactly Reader (ticked) and Author on a preprint
            // server (OPS1); no reviewer box and no editorial box; the server
            // not named; a closed fold reading "Register with other servers"
            // (Rules 8a, 8c). The two boxes offered are the positive control
            // for the absent third one, read from the same list.
            await expect(profile.form('roles').getByText('Roles', {exact: true})).toBeVisible();
            expect(await profile.currentContextRoleLabels()).toEqual(SERVER_ROLE_BOXES);
            await expect(profile.roleBox('Reader')).toBeChecked();
            await expect(profile.roleBox('Author')).not.toBeChecked();
            await expect(profile.currentContextSection().getByRole('checkbox', {name: /Reviewer/})).toHaveCount(0);
            await expect(profile.form('roles').getByRole('checkbox', {name: /Reviewer/})).toHaveCount(0);
            await expect(profile.currentContextSection()).not.toContainText(contextName);
            await expect(profile.otherContextsLinkText()).toHaveText(OTHER_SERVERS);
            expect(await profile.isOtherContextsOpen()).toBe(false);

            // No "Reviewing interests" box: the tab ends after the fold
            // (OPS1, Rule 8d). Control: the fold's link, in the same form,
            // is there.
            await expectNoInterestsBox(profile);

            // Tick Author, save, reload: held; Users & Roles lists both roles;
            // the public masthead does not list the account (Rule 8b, Side
            // effects).
            await profile.roleBox('Author').check();
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            // (The address names the tab, so the reload reopens Roles.)
            await page.reload();
            await profile.expectOpen('roles');
            await expect(profile.roleBox('Author')).toBeChecked();
            const managerPage = await (await asUser(manager)).newPage();
            let row = await usersRolesRow(managerPage, tag, username, email);
            await expect(row).toContainText('Reader');
            await expect(row).toContainText('Author');
            await expectMastheadWithout(managerPage, tag, name);

            // Untick Author, save: the role is gone from that list; the
            // masthead still does not list the account.
            await profile.roleBox('Author').uncheck();
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            row = await usersRolesRow(managerPage, tag, username, email);
            await expect(row).toContainText('Reader');
            await expect(row).not.toContainText('Author');
            await expectMastheadWithout(managerPage, tag, name);

            // A role in the other server: the fold opened reads "Hide other
            // servers" and names the second server with its own boxes,
            // Reader ticked; Author ticked there and saved is listed on the
            // second server's Users & Roles (Rule 8c).
            await profile.toggleOtherContexts();
            await expect(profile.otherContextsLinkText()).toHaveText(HIDE_OTHER_SERVERS);
            expect(await profile.isOtherContextsOpen()).toBe(true);
            await expect(profile.contextSection(contextNameB)).toBeVisible();
            await expect(profile.contextRoleBox(contextNameB, 'Reader')).toBeChecked();
            await expect(profile.contextRoleBox(contextNameB, 'Author')).not.toBeChecked();
            await expect(profile.contextSection(contextNameB).getByRole('checkbox', {name: /Reviewer/})).toHaveCount(0);
            await profile.contextRoleBox(contextNameB, 'Author').check();
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            const rowB = await usersRolesRow(managerPage, tagB, username, email);
            await expect(rowB).toContainText('Reader');
            await expect(rowB).toContainText('Author');

            // The site-level Roles tab: the account holding a role in two
            // servers, the page stays at the site level and lists both
            // servers inline, each under its own name, with no fold link
            // (Rule 3; the server-level link above is the control).
            const site = new ProfilePage(page, null);
            await site.goto('identity');
            await expect(page).toHaveURL(/\/index\/(en\/)?user\/profile/);
            await site.open('roles');
            await expect(site.contextSection(contextName)).toBeVisible();
            await expect(site.contextRoleBox(contextName, 'Reader')).toBeChecked();
            await expect(site.contextRoleBox(contextName, 'Author')).not.toBeChecked();
            await expect(site.contextSection(contextNameB)).toBeVisible();
            await expect(site.contextRoleBox(contextNameB, 'Reader')).toBeChecked();
            await expect(site.contextRoleBox(contextNameB, 'Author')).toBeChecked();
            await expect(site.otherContextsLink()).toHaveCount(0);
            await expect(site.form('roles')).not.toContainText(OTHER_SERVERS);

            // The site-level Notifications tab: the first row's "Enable…"
            // box unticked and saved; the first server's own tab shows the
            // box still ticked (Rule 11). Restored afterwards (fn-s).
            await site.open('notifications');
            const sitePair = site.notificationPair('notificationNewAnnouncement');
            await expect(sitePair.allow).toBeChecked();
            await sitePair.allow.uncheck();
            await site.save();
            await expect(site.toast).toContainText(SAVED_MESSAGE);
            await site.open('identity');
            await site.open('notifications');
            await expect(sitePair.allow).not.toBeChecked();
            await profile.goto('notifications');
            await expect(profile.notificationPair('notificationNewAnnouncement').allow).toBeChecked();
            await site.goto('identity');
            await site.open('notifications');
            await sitePair.allow.check();
            await site.save();
            await expect(site.toast).toContainText(SAVED_MESSAGE);

            // An interest suggested to another user: on a preprint server
            // the Preprint Server Manager's own Roles tab has no "Reviewing
            // interests" box to type into either (OPS1, Rule 8d); the
            // manager's two boxes and the fold's link are the control that
            // the tab rendered to its end.
            const managerProfile = new ProfilePage(managerPage, tag);
            await managerProfile.goto('roles');
            await expectNoInterestsBox(managerProfile);
            await expect(managerProfile.interestSuggestions()).toHaveCount(0);

            // Control: the Preprint Server Manager's own Roles tab shows the
            // same boxes, with no "Preprint Server Manager" box (Rule 8a).
            expect(await managerProfile.currentContextRoleLabels()).toEqual(SERVER_ROLE_BOXES);
            await expect(managerProfile.roleBox('Preprint Server Manager')).toHaveCount(0);
            await expect(managerProfile.form('roles').getByText(/Preprint Server manager/i)).toHaveCount(0);
        } finally {
            await context.close();
        }
    });

    test('S7: set a profile image, then remove it', async ({browser, baseURL, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const username = `${tag}au`;
        await opsApi.createContext({
            tag,
            users: [{username, givenName: 'Pia', familyName: 'Public', roles: ['author']}],
        });

        const {context, page} = await freshLogin(browser, baseURL, tag, username);
        try {
            // A refused upload raises a browser alert (Rule 9a): every dialog
            // is recorded and dismissed from here on, so a refusal is read
            // instead of hanging the test.
            /** @type {string[]} */
            const alerts = [];
            page.on('dialog', (dialog) => {
                alerts.push(dialog.message());
                dialog.accept();
            });
            const profile = new ProfilePage(page, tag);
            await profile.goto('public');
            await expect(profile.form('public').getByRole('button', {name: 'Upload File'})).toBeVisible();
            await expect(profile.deleteImageButton()).toHaveCount(0);

            // A .png larger than 150 × 150: the page reloads on the Public tab
            // with "Delete" under "Profile Image" (Rule 9a).
            await profile.uploadImage(IMAGE_FIXTURE);
            await profile.expectSelectedTab('public');
            await expect(profile.deleteImageButton()).toBeVisible();
            expect(alerts).toEqual([]);

            // A file that is not an image (Rule 9a). A plain-text file by its
            // own name: the uploader refuses it before anything is sent, with
            // "File extension error." inside the upload area, no alert and no
            // page reload (T-ops-1 of the 2026-09-13 run, as T-ojs-1 and
            // T-omp-1: the spec's sentence is the server's, see below). The
            // reload that the accepted .png caused above is the control for
            // "no page reload"; the alert of the second refusal below is the
            // control for "no alert".
            let reloaded = false;
            page.once('load', () => {
                reloaded = true;
            });
            const uploads = countPosts(page, /upload-profile-image/);
            await profile.chooseImageFile(TEXT_FIXTURE);
            await expect(profile.uploaderError()).toHaveText('File extension error.');
            expect(uploads.count).toBe(0);
            expect(reloaded).toBe(false);
            expect(alerts).toEqual([]);
            await expect(profile.deleteImageButton()).toBeVisible();

            // The same text under an image's name: sent, refused by the
            // server with "The file could not be uploaded or revised." inside
            // the upload area and as a browser alert, with no page reload;
            // after a reload the "Delete" button is still there, the existing
            // image survives (Rule 9a).
            await profile.chooseImageFile(TEXT_AS_IMAGE_FIXTURE);
            await expect(profile.uploaderError()).toHaveText(UPLOAD_REFUSED);
            await expect.poll(() => alerts).toEqual([UPLOAD_REFUSED]);
            await expect.poll(() => uploads.count).toBe(1);
            expect(reloaded).toBe(false);
            await expect(profile.deleteImageButton()).toBeVisible();
            await page.reload();
            await profile.expectOpen('public');
            await profile.expectSelectedTab('public');
            await expect(profile.deleteImageButton()).toBeVisible();
            // (The error line is an always-present box; the reload empties it.)
            await expect(profile.uploaderError()).toHaveText('');

            // A bio and a homepage without "http://": refused in the browser,
            // nothing sent, the bio stays (Rule 9c).
            const saves = countSaves(page);
            const bio = `Bio statement ${tag}`;
            await profile.expectBioEditorReady();
            await profile.bioEditorBody().click();
            await profile.bioEditorBody().fill(bio);
            await profile.homepage().fill('example.org/home');
            await profile.saveButton().click();
            await expect(profile.fieldError(URL_INVALID)).toBeVisible();
            expect(saves.count).toBe(0);
            await expect(profile.bioEditorBody()).toContainText(bio);

            // Corrected: saved at the top right (that the refusal sentence is
            // gone is a Planned assertion; A15 retired 2026-10-07).
            await profile.homepage().fill('https://example.org/home');
            await profile.save();
            expect(saves.count).toBe(1);
            await expect(profile.toast).toContainText(SAVED_MESSAGE);

            // "Delete": the page reloads without the button; the bio and the
            // homepage stay (Rule 9b).
            await profile.deleteImage();
            await profile.expectSelectedTab('public');
            await expect(profile.form('public').getByRole('button', {name: 'Upload File'})).toBeVisible();
            await expect(profile.deleteImageButton()).toHaveCount(0);
            await expect(profile.homepage()).toHaveValue('https://example.org/home');
            await profile.expectBioEditorReady();
            await expect(profile.bioEditorBody()).toContainText(bio);
        } finally {
            await context.close();
        }
    });

    test('S8: change the password', async ({browser, baseURL, opsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s8', testInfo);
        const username = `${tag}au`;
        const email = `${username}@mail.test`;
        const controlEmail = `${username}ctl@mail.test`;
        // Short passwords on purpose: the boxes cut input at 32 characters (A7).
        const current = `pw${tag}`;
        const next = `new${tag}`;
        await opsApi.createContext({
            tag,
            users: [{username, givenName: 'Pat', familyName: 'Password', roles: ['author'], password: current}],
        });

        // Two browsers signed in as the same account.
        const first = await freshLogin(browser, baseURL, tag, username, current);
        const second = await freshLogin(browser, baseURL, tag, username, current);
        try {
            const other = new ProfilePage(second.page, tag);
            await other.goto('identity');

            const profile = new ProfilePage(first.page, tag);
            await profile.goto('password');
            await expect(profile.form('password').getByText(PASSWORD_TOO_SHORT)).toBeVisible();

            // A wrong current password: the notice with that sentence, the
            // three boxes emptied (Rule 10a).
            await profile.fillPasswords({current: `wrong${tag}`, next});
            await profile.save();
            await expect(profile.passwordErrorNotice()).toContainText(ERRORS_HEADING);
            await expect(profile.passwordErrorNotice()).toContainText(CURRENT_PASSWORD_WRONG);
            await expect(profile.currentPassword()).toHaveValue('');
            await expect(profile.newPassword()).toHaveValue('');
            await expect(profile.repeatPassword()).toHaveValue('');

            // Two different new passwords: "do not match" in the notice and
            // under "New password"; the current-password sentence is gone.
            await profile.fillPasswords({current, next, repeat: `${next}x`});
            await profile.save();
            await expect(profile.passwordErrorNotice()).toContainText(PASSWORDS_MISMATCH);
            await expect(profile.passwordErrorNotice()).not.toContainText(CURRENT_PASSWORD_WRONG);
            await expect(profile.newPasswordSubLabel()).toHaveText(PASSWORDS_MISMATCH);

            // The current password as the new one.
            await profile.fillPasswords({current, next: current});
            await profile.save();
            await expect(profile.passwordErrorNotice()).toContainText(PASSWORD_SAME_AS_OLD);

            // A new password under the minimum: the too-short sentence in the
            // notice and under "New password", in place of the hint (Rule 10a).
            await profile.fillPasswords({current, next: 'np1'});
            await profile.save();
            await expect(profile.passwordErrorNotice()).toContainText(PASSWORD_TOO_SHORT);
            await expect(profile.newPasswordSubLabel()).toHaveText(PASSWORD_TOO_SHORT);
            await expect(profile.form('password').getByText(PASSWORD_TOO_SHORT)).toHaveCount(2);

            // A valid new password: saved at the top right, and the "np1"
            // attempt's notice, visible just above (the positive control), is
            // gone (Rule 10b). The notice stays up beside the toast for a
            // while: it is a trivial notification that fades about 6 s after
            // it appeared (probe 2026-10-06), so the wait covers that. The
            // boxes left filled and the empty line under "New password" are
            // A11's and are not asserted.
            await profile.fillPasswords({current, next});
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            await expect(profile.passwordErrorNotice()).toHaveCount(0, {timeout: 20_000});

            // The other browser's full reload lands on the Login page.
            await second.page.goto(other.url('identity'));
            await expect(second.page.locator('form#login')).toBeVisible();
            await expect(second.page).toHaveURL(/\/login/);

            // The mailbox: no email on a password change (Side effects). The
            // read is bounded by a message the test triggers to the same
            // address afterwards, an email-change request from the session
            // that stays signed in (fn-s): once that arrived, it is the
            // address's only message.
            await profile.open('contact');
            await requestEmailChange(profile, controlEmail);
            await pkpMail.find({to: email, subject: CHANGE_EMAIL_SUBJECT, contains: controlEmail});
            expect(await pkpMail.count({to: email})).toBe(1);

            // The session that changed it stays signed in; after a sign-out
            // the new password works and the old one is refused.
            await signOut(first.page);
            const loginPage = new LoginPage(first.page);
            await loginPage.signIn(username, next);
            await expect(first.page).not.toHaveURL(/\/login/);
            await expectSignInRefused(browser, baseURL, tag, username, current);
        } finally {
            await first.context.close();
            await second.context.close();
        }
    });

    test('S9: create and delete an API key', async ({browser, baseURL, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s9', testInfo);
        const username = `${tag}au`;
        await opsApi.createContext({
            tag,
            users: [{username, givenName: 'Kay', familyName: 'Api', roles: ['author']}],
        });

        const {context, page} = await freshLogin(browser, baseURL, tag, username);
        try {
            const profile = new ProfilePage(page, tag);
            await profile.goto('apiKey');
            const saves = countSaves(page);

            // "None" beside "Create API Key" and the generate note (Rule 12a).
            await expect(profile.apiKeyBox()).toHaveValue('None');
            await expect(profile.createApiKeyButton()).toBeVisible();
            await expect(profile.deleteApiKeyButton()).toHaveCount(0);
            await expect(profile.apiKeyNote()).toHaveText(API_KEY_GENERATE_NOTE);

            // Create: a long key replaces "None", "Delete" and the remove
            // note appear, saved inside the tab (Rule 12b).
            await profile.createApiKey();
            expect(saves.count).toBe(1);
            await expect(profile.apiKeyBox()).toHaveValue(/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/);
            const key = await profile.apiKeyBox().inputValue();
            expect(key.length).toBeGreaterThan(100);
            await expect(profile.deleteApiKeyButton()).toBeVisible();
            await expect(profile.createApiKeyButton()).toHaveCount(0);
            await expect(profile.apiKeyNote()).toHaveText(API_KEY_REMOVE_NOTE);
            await expect(profile.inTabNotice('apiKey')).toContainText(SAVED_MESSAGE);

            // Reloaded: the same key.
            await profile.goto('apiKey');
            await expect(profile.apiKeyBox()).toHaveValue(key);

            // "Delete" then Cancel in the browser's dialog: the key stays and
            // nothing is sent (Rule 12c; the OK press below is the control).
            await profile.deleteApiKey({confirm: false});
            await expect(profile.apiKeyBox()).toHaveValue(key);
            await expect(profile.deleteApiKeyButton()).toBeVisible();
            expect(saves.count).toBe(1);

            // "Delete" then OK: back to "None" with "Create API Key", saved
            // inside the tab.
            await profile.deleteApiKey({confirm: true});
            expect(saves.count).toBe(2);
            await expect(profile.apiKeyBox()).toHaveValue('None');
            await expect(profile.createApiKeyButton()).toBeVisible();
            await expect(profile.deleteApiKeyButton()).toHaveCount(0);
            await expect(profile.inTabNotice('apiKey')).toContainText(SAVED_MESSAGE);

            // A second key differs from the deleted one (Rule 12b).
            await profile.createApiKey();
            expect(saves.count).toBe(3);
            await expect(profile.apiKeyBox()).toHaveValue(/^eyJ[\w-]+\.[\w-]+\.[\w-]+$/);
            const secondKey = await profile.apiKeyBox().inputValue();
            expect(secondKey).not.toBe(key);
            await expect(profile.deleteApiKeyButton()).toBeVisible();

            // Control: throughout, no message at the top right (Rule 2).
            await expect(profile.toast).not.toContainText(SAVED_MESSAGE);
        } finally {
            await context.close();
        }
    });

    test('S10: the Notifications tab is a form of paired boxes', async ({browser, baseURL, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        const username = `${tag}mg`;
        const email = `${username}@mail.test`;
        // A scratch server's own Preprint Server Manager, so no seeded
        // account's choices change (PRINCIPLES A7).
        await opsApi.createContext({
            tag,
            users: [{username, givenName: 'Mona', familyName: 'Manager', roles: ['manager']}],
        });

        const {context, page} = await freshLogin(browser, baseURL, tag, username);
        try {
            const profile = new ProfilePage(page, tag);
            await profile.goto('notifications');

            // The description, the same four groups as a journal, one pair of
            // boxes per row, "Save" (Rule 11).
            await expect(profile.form('notifications').getByText(NOTIFICATIONS_INTRO)).toBeVisible();
            await expect(profile.notificationGroups()).toHaveText(NOTIFICATION_GROUPS);
            const rows = await profile.allowBoxes().count();
            expect(rows).toBeGreaterThan(0);
            await expect(profile.emailBoxes()).toHaveCount(rows);
            await expect(profile.saveButton()).toBeVisible();

            // Unticking an "Enable…" box greys out its email box, unticked.
            const pair = profile.notificationPair('notificationNewAnnouncement');
            await expect(pair.allow).toBeChecked();
            await expect(pair.email).toBeEnabled();
            await pair.allow.uncheck();
            await expect(pair.email).toBeDisabled();
            await expect(pair.email).not.toBeChecked();

            // Save, reopen: still unticked, the pairing applied again.
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            await profile.open('identity');
            await profile.open('notifications');
            await expect(pair.allow).not.toBeChecked();
            await expect(pair.email).toBeDisabled();

            // Tick it again and save to restore.
            await pair.allow.check();
            await expect(pair.email).toBeEnabled();
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);

            // "Save" on the Roles tab with nothing changed: saved, the ticks
            // as they were, and Users & Roles still lists the Preprint Server
            // Manager role the tab never shows (Rule 8b).
            await profile.open('roles');
            expect(await profile.currentContextRoleLabels()).toEqual(SERVER_ROLE_BOXES);
            const ticksBefore = await profile.currentContextSection().getByRole('checkbox').evaluateAll(
                (boxes) => boxes.map((box) => /** @type {HTMLInputElement} */ (box).checked)
            );
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            await profile.open('identity');
            await profile.open('roles');
            const ticksAfter = await profile.currentContextSection().getByRole('checkbox').evaluateAll(
                (boxes) => boxes.map((box) => /** @type {HTMLInputElement} */ (box).checked)
            );
            expect(ticksAfter).toEqual(ticksBefore);
            // (The role reads "Preprint Server manager" on the screen,
            // lowercase m: T-ops-2 of the 2026-09-13 run, as T-ojs-2 and
            // T-omp-2 on a journal and a press.)
            const row = await usersRolesRow(page, tag, username, email);
            await expect(row).toContainText('Preprint Server manager');

            // Control: reopen "Notifications" after the restore: the box is
            // ticked and its email box no longer greyed out (Rule 11).
            await profile.goto('notifications');
            await expect(pair.allow).toBeChecked();
            await expect(pair.email).toBeEnabled();
        } finally {
            await context.close();
        }
    });

    test('S11: a profile edited while impersonating is the impersonated user\'s', async ({browser, baseURL, opsApi}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s11', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        const authorEmail = `${author}@mail.test`;
        await opsApi.createContext({
            tag,
            users: [
                {username: manager, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
                {username: author, givenName: 'Ann', familyName: 'Impersonated', roles: ['author']},
            ],
        });

        // Fresh sessions: Login As migrates the manager's session (U01), and
        // the Author's own browser only reads.
        const managerSession = await freshLogin(browser, baseURL, tag, manager);
        const authorSession = await freshLogin(browser, baseURL, tag, author);
        try {
            const page = managerSession.page;
            const userMenu = new UserMenu(page);

            // The given: the Preprint Server Manager impersonates the Author
            // through Users & Roles › "Login As" and its dialog's OK (fn-s;
            // U01).
            const usersRoles = new UsersRolesPage(page, tag);
            await usersRoles.goto();
            await usersRoles.searchUsers(author);
            const row = usersRoles.userRow(authorEmail);
            await expect(row).toBeVisible({timeout: 30_000});
            await loginAsFromUsersRow(page, row);
            await userMenu.expectImpersonating(author);

            // "Edit Profile" while impersonating: the Author's username as
            // plain text (Actors).
            const profile = await openEditProfile(page, tag);
            await expect(profile.usernameText()).toContainText(author);
            await expect(profile.usernameText()).not.toContainText(manager);
            await expect(profile.givenName()).toHaveValue('Ann');

            // The Author's Contact tab saved while impersonating.
            await profile.open('contact');
            await profile.country().selectOption({label: 'Canada'});
            await profile.affiliation().fill('Impersonated Institute');
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);

            // The Author, in the second browser, reads the change.
            const authorProfile = await openEditProfile(authorSession.page, tag);
            await expect(authorProfile.usernameText()).toContainText(author);
            await authorProfile.open('contact');
            await expect(authorProfile.affiliation()).toHaveValue('Impersonated Institute');
            await expect(authorProfile.country()).toHaveValue('CA');

            // Control: the Preprint Server Manager, back in their own account
            // through "Logout as {username}", reads their own Affiliation
            // unchanged (the seeded account has none; the Author's value is
            // not there).
            await userMenu.logoutAs(author);
            await page.goto(`/index.php/${tag}/dashboard/editorial`);
            await userMenu.expectOwnSession();
            const ownProfile = await openEditProfile(page, tag);
            await expect(ownProfile.usernameText()).toContainText(manager);
            await expect(ownProfile.usernameText()).not.toContainText(author);
            await ownProfile.open('contact');
            await expect(ownProfile.affiliation()).toHaveValue('');
            await expect(ownProfile.affiliation()).not.toHaveValue('Impersonated Institute');
        } finally {
            await managerSession.context.close();
            await authorSession.context.close();
        }
    });

    test('S12: the profile is copied into a new submission\'s first contributor', async ({browser, baseURL, opsApi}, testInfo) => {
        test.slow();
        test.setTimeout(180_000);
        const tag = makeTag('s12', testInfo);
        const username = `${tag}au`;
        const email = `${username}@mail.test`;
        // ORCID enabled on the server and a verified iD on the account (fn-s).
        await opsApi.createContext({
            tag,
            orcid: {enabled: true},
            users: [
                {
                    username,
                    givenName: 'Pat',
                    familyName: 'Profile',
                    roles: ['author'],
                    orcid: TEST_ORCID,
                    orcidIsVerified: true,
                },
            ],
        });

        const {context, page} = await freshLogin(browser, baseURL, tag, username);
        try {
            const profile = new ProfilePage(page, tag);
            await profile.goto('identity');

            // "Preferred Public Name": saved inside the tab.
            await profile.preferredPublicName().fill('Dr. Pat Profile');
            await profile.save();
            await expect(profile.inTabNotice('identity')).toContainText(SAVED_MESSAGE);

            // The Contact tab: a country and an affiliation, saved at the top right.
            await profile.open('contact');
            await profile.country().selectOption({label: 'Canada'});
            await profile.affiliation().fill('Profile Institute');
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);

            // The Public tab: a bio and a homepage, saved at the top right.
            await profile.open('public');
            await profile.expectBioEditorReady();
            await profile.bioEditorBody().click();
            await profile.bioEditorBody().fill('Profile bio.');
            await profile.homepage().fill('https://example.org/profile');
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);

            // A new submission started on screen from My Submissions, the
            // wizard walked to its Contributors step and no further (fn-s).
            const mine = new MySubmissionsPage(page, tag);
            await mine.goto();
            await page.getByRole('link', {name: 'Start A New Submission'}).click();
            await wizard.beginSubmission(page, {title: `Submission ${tag}`});
            await wizard.continueTo(page, wizard.STEPS.details);
            await wizard.continueTo(page, wizard.STEPS.contributors);

            // The first contributor's "Edit" dialog carries the profile's
            // email, country, affiliation, bio statement and homepage (Rule 7).
            await expect(wizard.contributorItem(page, 'Pat Profile')).toBeVisible();
            let modal = await wizard.openContributorEdit(page, 'Pat Profile');
            await expect(wizard.contributorInput(modal, 'email')).toHaveValue(email);
            await expect(wizard.contributorCountry(modal)).toHaveValue('CA');
            await expect(wizard.contributorAffiliations(modal)).toContainText('Profile Institute');
            await expect(wizard.contributorBioBody(modal)).toHaveText('Profile bio.');
            await expect(wizard.contributorInput(modal, 'url')).toHaveValue('https://example.org/profile');

            // The name and the ORCID, as the screen shows them today: the
            // given and family name with an empty preferred-name box although
            // the profile's "Preferred Public Name" is set (A13), and "Request
            // verification" although the profile's iD is verified (A16). A
            // record of today's screen, never a pass of the hint's promise.
            await expect(wizard.contributorInput(modal, 'givenName-en')).toHaveValue('Pat');
            await expect(wizard.contributorInput(modal, 'familyName-en')).toHaveValue('Profile');
            await expect(wizard.contributorInput(modal, 'preferredPublicName-en')).toHaveValue('');
            await expect(wizard.contributorItem(page, 'Pat Profile')).not.toContainText('Dr. Pat Profile');
            await expect(wizard.contributorRequestVerificationButton(modal)).toBeVisible();
            await wizard.closeContributorEdit(modal);

            // Control: the profile's Affiliation changed afterwards; the draft
            // reopened from My Submissions still carries the copied one
            // (Cross-feature interactions). A preprint server lists its
            // drafts under "Active submissions" with "Complete submission"
            // (My Submissions OPS1), not under an "Incomplete" view.
            await profile.goto('contact');
            await profile.affiliation().fill('Later Institute');
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            await profile.open('identity');
            await profile.open('contact');
            await expect(profile.affiliation()).toHaveValue('Later Institute');
            await mine.goto();
            await mine.expectViewHeading('Active submissions');
            const row = await mine.findRowByTag(tag);
            await mine.completeSubmissionButton(row).click();
            await wizard.expectWizardOpen(page);
            // The reopened draft starts again at "Upload Files", the later
            // rail entries unreached, so Continue is the way to Contributors.
            await wizard.expectStep(page, wizard.STEPS.files);
            await wizard.continueTo(page, wizard.STEPS.details);
            await wizard.continueTo(page, wizard.STEPS.contributors);
            modal = await wizard.openContributorEdit(page, 'Pat Profile');
            await expect(wizard.contributorAffiliations(modal)).toContainText('Profile Institute');
            await expect(wizard.contributorAffiliations(modal)).not.toContainText('Later Institute');
            await wizard.closeContributorEdit(modal);
        } finally {
            await context.close();
        }
    });
});
