// @ts-check
/**
 * @file playwright/tests/U02-registration-and-account-validation.spec.js
 *
 * U02 — Registration & account validation, OMP suite (spec:
 * docs/specs/U02-registration-and-account-validation.md). One test per
 * canonical scenario the spec runs on a press (common scenarios 1–8, in OMP
 * vocabulary: press, Press Manager, External Reviewer — glossary
 * substitution). The spec lists no OMP-only scenario; OMP1 and OMP2 are
 * register findings, not scenarios.
 *
 * Not covered, by register ID (the spec's Coverage section is the record
 * of everything else left out): A1, A2 (the activation pages are asserted
 * by their sentences, never by a heading), A3, A4, A5, A6 (S7 sets the
 * technical support contact first, as fn-s says), A7, OMP1 (S6 never
 * provokes the site-level consent refusal), OMP2 (S6 asserts the press
 * shape the register describes, the consent lines on screen from the
 * start, without asserting when they appeared).
 *
 * Seeding: scenario endpoints only. S1–S3 and S8 register throwaway
 * accounts on the read-only `publicknowledge` press (registering there
 * changes no setting; the roster users are only read). S4–S7 use a scratch
 * press with a throwaway Press Manager, because they change a setting
 * (privacy statement, registration, technical support contact); S5 seeds a
 * second scratch press disabled since its creation. Every registrant has a
 * unique username and mailbox naming app + test (Mailpit is shared across
 * the three fleets — never cleared). S6's two reviewing interests carry the
 * test's tag: a word two accounts typed on the site-level page is stored
 * once per account (Rule 8, fn-s). Every registration and every sign-in
 * that follows one runs in a browser context the test opens itself
 * (`freshPage`), never the cached `.auth` storage state; "a second browser"
 * is a second such context, and S7's browser without JavaScript is one
 * created with `javaScriptEnabled: false` (fn-s). S7 runs against the
 * validation-variant server (`variants.validation`, same DB; harness.md),
 * the only place `require_validation` and the ALTCHA check are on.
 */
const {test: baseTest, expect} = require('../support/fixtures.js');
const {
    RegisterPage,
    RegistrationCompletePage,
    ProfileRolesTab,
    ProfileNotificationsTab,
    ProfileNameTabs,
    ActivationPage,
    loginFormRegisterLink,
    ACCESS_DENIED,
} = require('../pages/RegistrationPages.js');
const {expectTextsInAnyOrder} = require('../../../../shared/playwright/support/order.js');

const PK = 'publicknowledge';
const PK_NAME = 'Public Knowledge Press';
/** The site's contact, the sender of site-level mail (fn-s). */
const SITE_CONTACT = {name: 'Open Monograph Press', email: 'admin@mail.test'};

const MSG = {
    usernameTaken: 'The selected username is already in use by another user.',
    emailTaken: 'The selected email address is already in use by another user.',
    passwordsDiffer: 'The passwords do not match.',
    passwordShort: 'The password must be at least 6 characters.',
    consentRequired: 'You must agree to the terms of the privacy statement.',
    registrationClosed: 'This press is currently not accepting user registrations.',
    spamCheck: 'You must complete the validation check used to prevent spam submissions.',
    errorsHeading: 'Errors occurred processing this form:',
    reviewerOptin:
        'Yes, I would like to be contacted with requests to review submissions to this press.',
    privacyConsent:
        'Yes, I agree to have my data collected and stored according to the privacy statement.',
    contextConsent:
        "Yes, I agree to have my data collected and stored according to this press's privacy statement.",
    pendingTitle: 'Registration awaiting verification',
    invitationUnavailable: 'Invitation Unavailable',
};

/** Parallel-safe unique tag: single alphanumeric token, ≤32 chars. */
function makeTag(testInfo, scenarioKey) {
    const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6);
    return `${scenarioKey}ompw${testInfo.parallelIndex}${rand}`;
}

/** A throwaway registrant: username `u02<case>-omp-…` (spec note s). */
function makeRegistrant(tag, suffix = '') {
    const username = `${tag.replace('omp', '-omp-')}${suffix}`;
    return {
        username,
        email: `${username}@mail.test`,
        password: `pw-${username}`,
        givenName: `Reg${tag}${suffix}`,
    };
}

/** The signed-out / signed-in user block of the reader-site header. */
const headerNav = (page) => page.locator('#navigationUser');

/** Fill the login form the page shows and submit it (no landing wait). */
async function submitLoginForm(page, username, password) {
    await page.locator('form#login input#username').fill(username);
    const passwordInput = page.locator('form#login input#password');
    await passwordInput.evaluate((el) => el.removeAttribute('maxlength'));
    await passwordInput.fill(password);
    await page.locator('form#login button[type="submit"]').click();
}

/** Submit the login form and wait for the redirect away from /login. */
async function signInAndLand(page, username, password) {
    await submitLoginForm(page, username, password);
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
        timeout: 20_000,
        waitUntil: 'commit',
    });
}

/**
 * Scratch press with a throwaway Press Manager (scenarios 4–7). The
 * default privacy statement and open registration come with it.
 */
async function seedPress(ompApi, tag, {enabled = true} = {}) {
    const manager = `mgr${tag}`;
    await ompApi.createContext({
        tag,
        context: {name: {en: `U02 Press ${tag}`}, ...(enabled ? {} : {enabled: false})},
        users: [
            {
                username: manager,
                roles: ['manager'],
                givenName: `Mgr${tag}`,
                familyName: 'Manager',
            },
        ],
    });
    return {path: tag, name: `U02 Press ${tag}`, manager};
}

/** Save a Vue settings form and wait for the contexts API to answer. */
async function saveSettingsForm(page, panel) {
    const saved = page.waitForResponse(
        (r) => r.url().includes('/api/v1/contexts/') && r.ok()
    );
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    await saved;
}

/**
 * The "Validate Your Account" email for an address: its summary, full body
 * and the emailed activation link (`invitation/accept`).
 */
async function validationMail(pkpMail, email) {
    const summary = await pkpMail.find({to: email, subject: 'Validate Your Account'});
    const full = await pkpMail.fullMessage(summary.ID);
    const match = (full.Text || '').match(/https?:\/\/\S*invitation\/accept\S*/);
    const link = (match ? match[0] : pkpMail.extractLink(full.HTML, /activate|accept|http/i)) || '';
    expect(link, 'validation email carries the activation link').toMatch(/invitation\/accept/);
    return {summary, full, link};
}

/**
 * `freshPage` opens a page in a brand-new, signed-out browser context
 * (never the cached `.auth` state — a registration signs the context in).
 * `javaScriptEnabled: false` makes S7's browser without JavaScript.
 * Auto-closes every opened context at teardown.
 */
const test = baseTest.extend({
    freshPage: async ({browser, baseURL}, use) => {
        const contexts = [];
        await use(async ({baseURL: url = baseURL, javaScriptEnabled = true} = {}) => {
            const context = await browser.newContext({
                baseURL: url,
                javaScriptEnabled,
                storageState: {cookies: [], origins: []},
            });
            contexts.push(context);
            return context.newPage();
        });
        await Promise.all(contexts.map((context) => context.close().catch(() => {})));
    },
});

test.describe('Registration & account validation (U02)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(180_000));

    test('S1: register with a press and land on the completion page', async ({freshPage, pkpMail}, testInfo) => {
        const tag = makeTag(testInfo, 'u02s1');
        const who = makeRegistrant(tag);
        const page = await freshPage();

        // Press homepage → header "Register" → the Register form.
        await page.goto(`/index.php/${PK}`);
        await headerNav(page).getByRole('link', {name: 'Register', exact: true}).click();
        const register = new RegisterPage(page);
        await expect(register.heading).toBeVisible();
        await expect(page).toHaveURL(/\/user\/register/);
        await expect(page.getByText('Required fields are marked with an asterisk')).toBeVisible();

        await register.fillIdentity(who);
        await expect(register.privacyConsent).not.toBeChecked();
        await register.privacyConsent.check();
        // The notification box arrives unticked and is left so (Rule 6).
        await expect(register.emailConsent).toBeVisible();
        await expect(register.emailConsent).not.toBeChecked();
        await register.submit();

        // "Registration complete" with three links and no "View Submissions".
        const complete = new RegistrationCompletePage(page);
        await expect(complete.heading).toBeVisible();
        await expect(complete.instructions).toBeVisible();
        await expect(complete.newSubmission).toBeVisible();
        await expect(complete.editProfile).toBeVisible();
        await expect(complete.continueBrowsing).toBeVisible();
        await expect(complete.viewSubmissions).toHaveCount(0);

        // The header now names the new account where "Register"/"Login" were.
        await expect(headerNav(page)).toContainText(who.username);
        await expect(headerNav(page).getByRole('link', {name: 'Register', exact: true})).toHaveCount(0);
        await expect(headerNav(page).getByRole('link', {name: 'Login', exact: true})).toHaveCount(0);

        // "Edit My Profile" › Roles: "Reader" ticked and nothing else.
        await complete.editProfile.click();
        await expect(page.getByRole('heading', {name: 'Profile'})).toBeVisible({timeout: 20_000});
        const roles = new ProfileRolesTab(page);
        await roles.select();
        await expect(roles.currentContextBox('Reader')).toBeChecked();
        await expect(roles.currentContextBox('External Reviewer')).not.toBeChecked();
        await expect(roles.checkedBoxes).toHaveCount(1);

        // Notifications: the press's public-announcement email off ("Do not
        // send me an email…" ticked on the "Public Announcements" row), the
        // in-app notification itself still on; a row of another section at
        // its default (email not blocked) is the contrast (Rule 6, fn-e).
        const notifications = new ProfileNotificationsTab(page);
        await notifications.select();
        await expect(notifications.publicAnnouncementsHeading).toBeVisible();
        await expect(notifications.allowBox('notificationNewAnnouncement')).toBeChecked();
        await expect(notifications.emailBox('notificationNewAnnouncement')).toBeChecked();
        await expect(notifications.allowBox('notificationSubmissionSubmitted')).toBeChecked();
        await expect(notifications.emailBox('notificationSubmissionSubmitted')).not.toBeChecked();

        // The mail catcher: nothing for the new address (no welcome email;
        // the registration's request has long answered, so the read is
        // settled). The positive control that the catcher receives this
        // app's mail is S7's "Validate Your Account" message in the same run.
        expect(await pkpMail.count({to: who.email})).toBe(0);

        // The second visitor: a private address typed while signed out → the
        // Login page; its "Register" link BELOW the form carries the
        // destination; registering there continues to the typed address and
        // is refused as a Reader (Rule 9).
        const second = await freshPage();
        const secondWho = makeRegistrant(tag, 'b');
        await second.goto(`/index.php/${PK}/en/dashboard/mySubmissions`);
        await expect(second.locator('form#login')).toBeVisible();
        await expect(second).toHaveURL(/\/login/);
        await loginFormRegisterLink(second).click();
        const register2 = new RegisterPage(second);
        await expect(register2.heading).toBeVisible();
        await register2.fillIdentity(secondWho);
        await register2.privacyConsent.check();
        await register2.submit();
        await expect(second.getByText(ACCESS_DENIED)).toBeVisible({timeout: 20_000});
        await expect(second).toHaveURL(/\/user\/authorizationDenied/);
        await expect(second).not.toHaveURL(/\/user\/register/);
        await expect(new RegistrationCompletePage(second).heading).toHaveCount(0);
        await expect(headerNav(second)).toContainText(secondWho.username);

        // The third visitor: the press's French Register page; the profile's
        // [en] boxes then show the copy into the site's primary language
        // (Rule 16). The French page's own strings are not asserted.
        const third = await freshPage();
        const thirdWho = makeRegistrant(tag, 'c');
        await third.goto(RegisterPage.contextUrlFr(PK));
        const register3 = new RegisterPage(third);
        await expect(register3.form).toBeVisible();
        await register3.fillIdentity({
            ...thirdWho,
            givenName: 'Prénom',
            familyName: 'Nom',
            affiliation: 'Laboratoire FR',
            countryCode: 'IS',
        });
        await register3.privacyConsent.check();
        await register3.submitInPageLanguage();
        await expect(third.locator('form#register')).toHaveCount(0);
        await expect(headerNav(third)).toContainText(thirdWho.username);
        await third.goto(ProfileNameTabs.url(PK));
        const names = new ProfileNameTabs(third);
        await expect(third.getByRole('heading', {name: 'Profile'})).toBeVisible({timeout: 20_000});
        await names.selectIdentity();
        await expect(names.givenName('en')).toHaveValue('Prénom');
        await expect(names.familyName('en')).toHaveValue('Nom');
        await names.selectContact();
        await expect(names.affiliation('en')).toHaveValue('Laboratoire FR');
    });

    test('S2: the form refuses bad input', async ({freshPage}, testInfo) => {
        const tag = makeTag(testInfo, 'u02s2');
        const who = makeRegistrant(tag);
        const page = await freshPage();
        await page.goto(RegisterPage.contextUrl(PK));
        const register = new RegisterPage(page);
        await expect(register.heading).toBeVisible();

        // A taken username in capitals, a taken email in capitals, a short
        // password and a different repeat (Rules 15, Fields & validation).
        await register.fillIdentity({
            ...who,
            username: 'Reader.Rosa',
            email: 'READER.ROSA@MAIL.TEST',
            password: 'abc',
            password2: 'abcd',
        });
        await register.privacyConsent.check();
        await register.submit();

        await expect(register.errorsHeading).toHaveText(MSG.errorsHeading);
        await expect(register.errorLines).toHaveText([
            MSG.usernameTaken,
            MSG.passwordsDiffer,
            MSG.emailTaken,
        ]);
        await expect(register.username).toHaveValue('Reader.Rosa');
        await expect(register.password).toHaveValue('');
        await expect(register.password2).toHaveValue('');
        // Everything else typed is kept.
        await expect(register.givenName).toHaveValue(who.givenName);
        await expect(register.email).toHaveValue('READER.ROSA@MAIL.TEST');

        // A fresh username and email, the same too-short password twice.
        await register.username.fill(who.username);
        await register.email.fill(who.email);
        await register.password.fill('abc');
        await register.password2.fill('abc');
        await expect(register.privacyConsent).toBeChecked();
        await register.submit();
        await expect(register.errorLines).toHaveText([MSG.passwordShort]);
    });

    test('S3: register as a reviewer', async ({freshPage}, testInfo) => {
        const tag = makeTag(testInfo, 'u02s3');
        const who = makeRegistrant(tag);
        const interests = [`ethics${tag}`, `statistics${tag}`];
        const page = await freshPage();
        await page.goto(RegisterPage.contextUrl(PK));
        const register = new RegisterPage(page);
        await expect(register.heading).toBeVisible();

        await register.fillIdentity(who);
        await register.privacyConsent.check();

        // One self-registering reviewer role on the press → the single box;
        // "Reviewing interests" appears only once it is ticked.
        await expect(register.reviewerOptin).toHaveCount(1);
        await expect(page.getByText(MSG.reviewerOptin)).toBeVisible();
        await expect(register.reviewerInterests).toBeHidden();
        await register.reviewerOptin.check();
        await expect(register.reviewerInterests).toBeVisible();
        await expect(register.reviewerInterests.getByText('Reviewing interests')).toBeVisible();
        await register.interests.fill(interests.join(', '));
        await register.submit();

        // The completion page now leads with "View Submissions" → the
        // reviewer's list headed "Action Required by me".
        const complete = new RegistrationCompletePage(page);
        await expect(complete.heading).toBeVisible();
        await expect(complete.viewSubmissions).toBeVisible();
        await expect(complete.newSubmission).toBeVisible();
        await complete.viewSubmissions.click();
        await page.waitForURL(/\/dashboard\/reviewAssignments/, {
            timeout: 20_000,
            waitUntil: 'commit',
        });
        await expect(
            page.getByRole('heading', {name: /Action Required by me/})
        ).toBeVisible({timeout: 20_000});

        // Roles: External Reviewer ticked, Reader not; two separate interests.
        const roles = new ProfileRolesTab(page);
        await roles.open(PK);
        await expect(roles.currentContextBox('External Reviewer')).toBeChecked();
        await expect(roles.currentContextBox('Reader')).not.toBeChecked();
        await expect(roles.checkedBoxes).toHaveCount(1);
        // In either order: the interests are read with no ORDER BY (fix list B).
        await expectTextsInAnyOrder(roles.interestChips, interests);
    });

    test('S4: privacy consent is required when a statement exists', async ({ompApi, asUser, freshPage}, testInfo) => {
        const tag = makeTag(testInfo, 'u02s4');
        const press = await seedPress(ompApi, tag);
        const first = makeRegistrant(tag, 'a');
        const second = makeRegistrant(tag, 'b');

        // A scratch press comes with the default statement: the box is there
        // and "privacy statement" opens the press's page in a new tab.
        const page = await freshPage();
        await page.goto(RegisterPage.contextUrl(press.path));
        const register = new RegisterPage(page);
        await expect(register.heading).toBeVisible();
        await expect(register.privacyConsent).toBeVisible();
        await expect(page.getByText(MSG.privacyConsent)).toBeVisible();
        const popup = page.context().waitForEvent('page');
        await register.form
            .locator('.optin-privacy')
            .getByRole('link', {name: 'privacy statement'})
            .click();
        const privacyPage = await popup;
        await expect(
            privacyPage.getByRole('heading', {name: 'Privacy Statement'})
        ).toBeVisible({timeout: 20_000});
        await privacyPage.close();

        // Unticked: refused with one line; ticked (passwords retyped): complete.
        await register.fillIdentity(first);
        await register.submit();
        await expect(register.errorLines).toHaveText([MSG.consentRequired]);
        await register.privacyConsent.check();
        await register.password.fill(first.password);
        await register.password2.fill(first.password);
        await register.submit();
        await expect(new RegistrationCompletePage(page).heading).toBeVisible();

        // The Press Manager empties the statement (Settings › Website › Setup
        // › Privacy Statement) and saves.
        const managerPage = await (await asUser(press.manager)).newPage();
        await managerPage.goto(`/index.php/${press.path}/management/settings/website`);
        await managerPage.locator('#setup-button').click();
        await managerPage.locator('#privacy-button').click();
        const privacyPanel = managerPage.locator('#privacy');
        // The rich-text field is a TinyMCE iframe; select all and delete.
        const editor = privacyPanel.frameLocator('iframe').locator('body');
        await expect(editor).toContainText(/\w/, {timeout: 20_000});
        await editor.click();
        await managerPage.keyboard.press('ControlOrMeta+a');
        await managerPage.keyboard.press('Backspace');
        await expect(editor).toHaveText('');
        await saveSettingsForm(managerPage, privacyPanel);
        await expect(managerPage.getByRole('status').filter({hasText: 'Saved'})).toBeVisible({
            timeout: 20_000,
        });

        // A visitor now finds no consent box (the notification box beside it
        // is the positive control) and registers without it.
        const visitor = await freshPage();
        await visitor.goto(RegisterPage.contextUrl(press.path));
        const register2 = new RegisterPage(visitor);
        await expect(register2.heading).toBeVisible();
        await expect(register2.emailConsent).toBeVisible();
        await expect(register2.privacyConsent).toHaveCount(0);
        await expect(visitor.getByText(MSG.privacyConsent)).toHaveCount(0);
        await register2.fillIdentity(second);
        await register2.submit();
        await expect(new RegistrationCompletePage(visitor).heading).toBeVisible();
    });

    test('S5: closed registration', async ({ompApi, asUser, freshPage}, testInfo) => {
        const tag = makeTag(testInfo, 'u02s5');
        const press = await seedPress(ompApi, tag);
        // The second scratch press, disabled since its creation (fn-s).
        const disabled = await seedPress(ompApi, makeTag(testInfo, 'u02s5d'), {enabled: false});

        // Press Manager: Settings › Users & Roles › Site Access Options →
        // "The Press Manager will register all user accounts…" → Save.
        const managerPage = await (await asUser(press.manager)).newPage();
        await managerPage.goto(`/index.php/${press.path}/management/settings/access`);
        await managerPage.locator('#access-button').click();
        const accessPanel = managerPage.locator('#access');
        const closed = accessPanel.getByRole('radio', {
            name: /The Press Manager will register all user accounts/,
        });
        await expect(closed).toBeVisible({timeout: 20_000});
        await closed.check();
        await saveSettingsForm(managerPage, accessPanel);

        // The Press Manager, still signed in, at the closed press's Register
        // address: "Registration complete", "Make a New Submission" included,
        // never the closed message (Rule 4).
        await managerPage.goto(RegisterPage.contextUrl(press.path));
        const managerComplete = new RegistrationCompletePage(managerPage);
        await expect(managerComplete.heading).toBeVisible();
        await expect(managerComplete.newSubmission).toBeVisible();
        await expect(managerPage.getByText(MSG.registrationClosed)).toHaveCount(0);
        await expect(managerPage.locator('form#register')).toHaveCount(0);

        // …and at the disabled press's Register address: "Registration
        // complete" even there (Rules 2 and 4).
        await managerPage.goto(RegisterPage.contextUrl(disabled.path));
        const managerDisabled = new RegistrationCompletePage(managerPage);
        await expect(managerDisabled.heading).toBeVisible();
        await expect(managerPage.locator('form#login')).toHaveCount(0);

        // A visitor: no "Register" in the header (Login stays), none on the
        // Login page (its form stays).
        const page = await freshPage();
        await page.goto(`/index.php/${press.path}`);
        await expect(headerNav(page).getByRole('link', {name: 'Login', exact: true})).toBeVisible();
        await expect(headerNav(page).getByRole('link', {name: 'Register', exact: true})).toHaveCount(0);
        await page.goto(`/index.php/${press.path}/login`);
        await expect(page.locator('form#login')).toBeVisible();
        await expect(page.getByRole('link', {name: 'Register', exact: true})).toHaveCount(0);

        // The typed Register address answers the closed page with a Login link.
        await page.goto(RegisterPage.contextUrl(press.path));
        await expect(page.getByRole('heading', {name: 'Register', exact: true})).toBeVisible();
        await expect(page.getByText(MSG.registrationClosed)).toBeVisible();
        await expect(page.locator('.page_error').getByRole('link', {name: 'Login', exact: true})).toBeVisible();
        await expect(page.locator('form#register')).toHaveCount(0);

        // The disabled press's Register address: its Login page instead, whose
        // own "Register" links (header and in-form) lead straight back to
        // that Login page, with no word that the press is disabled (Rule 2).
        const disabledLogin = new RegExp(`/index.php/${disabled.path}/login`);
        await page.goto(RegisterPage.contextUrl(disabled.path));
        await expect(page.locator('form#login')).toBeVisible();
        await expect(page).toHaveURL(disabledLogin);
        await expect(page.locator('form#register')).toHaveCount(0);
        await expect(page.getByText(/disabled/i)).toHaveCount(0);
        await headerNav(page).getByRole('link', {name: 'Register', exact: true}).click();
        await expect(page.locator('form#login')).toBeVisible();
        await expect(page).toHaveURL(disabledLogin);
        await expect(page.locator('form#register')).toHaveCount(0);
        await loginFormRegisterLink(page).click();
        await expect(page.locator('form#login')).toBeVisible();
        await expect(page).toHaveURL(disabledLogin);
        await expect(page.locator('form#register')).toHaveCount(0);
        await expect(page.getByText(/disabled/i)).toHaveCount(0);

        // The site homepage's "Register" still opens the site-level form,
        // because the seeded press is still open.
        await page.goto('/index.php/index');
        await headerNav(page).getByRole('link', {name: 'Register', exact: true}).click();
        const siteRegister = new RegisterPage(page);
        await expect(siteRegister.heading).toBeVisible();
        await expect(siteRegister.form).toBeVisible();
        await expect(siteRegister.contextsLegend).toBeVisible();
        await expect(siteRegister.contextRoleBox(PK_NAME, 'Reader')).toBeVisible();
    });

    test('S6: register from the site homepage with roles in two presses', async ({ompApi, freshPage}, testInfo) => {
        const tag = makeTag(testInfo, 'u02s6');
        const press = await seedPress(ompApi, tag);
        const who = makeRegistrant(tag);
        const interests = [`glacier${tag}`, `ethics${tag}`];

        // Site homepage (the press list) → header "Register" → site-level form.
        const page = await freshPage();
        await page.goto('/index.php/index');
        await headerNav(page).getByRole('link', {name: 'Register', exact: true}).click();
        const register = new RegisterPage(page);
        await expect(register.heading).toBeVisible();
        await expect(page).toHaveURL(/\/index\/(en\/)?user\/register/);
        await expect(register.contextsLegend).toBeVisible();

        // Both presses listed with "Request the following roles."; before
        // anything is ticked, no role box is ticked under either, and on a
        // press site each press's consent line is on screen from the start
        // (the register's OMP2 shape, asserted as the spec states it).
        for (const name of [PK_NAME, press.name]) {
            await expect(register.contextBlock(name)).toHaveCount(1);
            await expect(
                register.contextBlock(name).getByText('Request the following roles.')
            ).toBeVisible();
            await expect(register.contextRoleBoxes(name)).toHaveCount(2);
            await expect(register.contextBlock(name).locator('input:checked')).toHaveCount(0);
            await expect(register.contextConsentText(name)).toBeVisible();
            await expect(register.contextConsent(name)).not.toBeChecked();
        }
        // The site has no statement of its own: no site consent box (Rule 5).
        await expect(register.siteConsent).toHaveCount(0);

        // Tick "Reader" under the seeded press and "External Reviewer" under
        // the scratch one, then the consent line under each.
        await register.contextRoleBox(PK_NAME, 'Reader').check();
        await register.contextRoleBox(press.name, 'External Reviewer').check();
        await expect(register.contextBlock(PK_NAME).getByText(MSG.contextConsent)).toBeVisible();
        await expect(register.contextBlock(press.name).getByText(MSG.contextConsent)).toBeVisible();
        await register.contextConsent(PK_NAME).check();
        await register.contextConsent(press.name).check();

        // The interests box under "If you requested to be a reviewer for any
        // press, please enter your subject interests.": empty as it arrives,
        // then two interests typed with a comma and a space between them,
        // each word carrying the test's tag so that no other account holds
        // it (Rule 8, fn-s).
        await expect(register.siteInterests).toBeVisible();
        await expect(register.siteInterests).toHaveValue('');
        await register.siteInterests.fill(interests.join(', '));
        await expect(register.siteInterests).toHaveValue(`${interests[0]}, ${interests[1]}`);

        await register.fillIdentity(who);
        await register.submit();

        // Site-level completion: "Edit My Profile" and "Continue Browsing" only.
        const complete = new RegistrationCompletePage(page);
        await expect(complete.heading).toBeVisible();
        await expect(complete.editProfile).toBeVisible();
        await expect(complete.continueBrowsing).toBeVisible();
        await expect(complete.newSubmission).toHaveCount(0);
        await expect(complete.viewSubmissions).toHaveCount(0);

        // Roles: exactly the ticked roles in their presses.
        await complete.editProfile.click();
        await expect(page.getByRole('heading', {name: 'Profile'})).toBeVisible({timeout: 20_000});
        const roles = new ProfileRolesTab(page);
        await roles.select();
        await expect(roles.contextBox(PK_NAME, 'Reader')).toBeChecked();
        await expect(roles.contextBox(PK_NAME, 'External Reviewer')).not.toBeChecked();
        await expect(roles.contextBox(press.name, 'External Reviewer')).toBeChecked();
        await expect(roles.contextBox(press.name, 'Reader')).not.toBeChecked();
        await expect(roles.checkedBoxes).toHaveCount(2);

        // The same tab's "Reviewing interests": the two typed interests,
        // each listed once (Rule 8).
        await roles.expectInterests(interests);

        // The second visitor: the site-level page with nothing ticked, no
        // press and no role; the consent lines stay untouched (on a press
        // they are on screen regardless, OMP2), and the form registers with
        // no consent at all (Rule 5): "Registration complete", then the
        // Roles tab with no role ticked in any press (Rule 8).
        const second = await freshPage();
        const secondWho = makeRegistrant(tag, 'b');
        await second.goto(RegisterPage.siteUrl());
        const register2 = new RegisterPage(second);
        await expect(register2.heading).toBeVisible();
        await expect(register2.contextsLegend).toBeVisible();
        await expect(register2.form.locator('input[type="checkbox"]:checked')).toHaveCount(0);
        await expect(register2.siteConsent).toHaveCount(0);
        await expect(register2.contextConsent(PK_NAME)).toHaveCount(1);
        await register2.fillIdentity(secondWho);
        await register2.submit();
        const complete2 = new RegistrationCompletePage(second);
        await expect(complete2.heading).toBeVisible();
        await expect(register2.errorLines).toHaveCount(0);
        await expect(complete2.editProfile).toBeVisible();
        await expect(complete2.continueBrowsing).toBeVisible();
        await expect(complete2.newSubmission).toHaveCount(0);
        await expect(complete2.viewSubmissions).toHaveCount(0);
        const roles2 = new ProfileRolesTab(second);
        await roles2.open(PK);
        await expect(roles2.currentContextBox('Reader')).toBeVisible();
        // Both presses are listed (the positive control) and no box is ticked.
        await expect(roles2.userGroups.locator('label', {hasText: press.name}).first()).toBeAttached();
        await expect(roles2.allBoxes.first()).toBeAttached();
        await expect(roles2.checkedBoxes).toHaveCount(0);
    });

    test('S7: email validation', async ({ompApi, asUser, pkpMail, freshPage, variants}, testInfo) => {
        const tag = makeTag(testInfo, 'u02s7');
        const press = await seedPress(ompApi, tag);
        const who = makeRegistrant(tag);
        const support = {name: `Support ${tag}`, email: `${tag}-support@mail.test`};

        // The Press Manager sets Settings › Press › Contact › "Technical
        // Support Contact" (the validation mail is sent from it; Rule 12).
        const managerPage = await (await asUser(press.manager)).newPage();
        await managerPage.goto(`/index.php/${press.path}/management/settings/context`);
        await managerPage.locator('#contact-button').click();
        const contactPanel = managerPage.locator('#contact');
        const supportGroup = contactPanel.getByRole('group', {name: 'Technical Support Contact'});
        await expect(supportGroup).toBeVisible({timeout: 20_000});
        await supportGroup.getByRole('textbox', {name: /^Name/}).fill(support.name);
        await supportGroup.getByRole('textbox', {name: /^Email/}).fill(support.email);
        await saveSettingsForm(managerPage, contactPanel);

        const base = variants.validation;
        const registerUrl = `${base}${RegisterPage.contextUrl(press.path)}`;

        // A browser without JavaScript: the ALTCHA widget posts nothing, the
        // form comes back refused with the spam line, no account created.
        const noJs = await freshPage({baseURL: base, javaScriptEnabled: false});
        await noJs.goto(registerUrl);
        const registerNoJs = new RegisterPage(noJs);
        await expect(registerNoJs.heading).toBeVisible();
        await registerNoJs.fillIdentity(who);
        await registerNoJs.privacyConsent.check();
        await registerNoJs.submit();
        await expect(registerNoJs.errorsHeading).toHaveText(MSG.errorsHeading);
        await expect(registerNoJs.errorLines).toHaveText([MSG.spamCheck]);
        await expect(noJs.getByRole('heading', {name: MSG.pendingTitle})).toHaveCount(0);

        // With JavaScript on, the same username and email register: the
        // refused attempt created no account (Rule 15). The ALTCHA widget
        // (on there) verifies as "Register" is pressed and the form goes
        // through to "Registration awaiting verification".
        const page = await freshPage({baseURL: base});
        await page.goto(registerUrl);
        const register = new RegisterPage(page);
        await expect(register.heading).toBeVisible();
        await expect(register.altchaWidget).toHaveCount(1);
        await register.fillIdentity(who);
        await register.privacyConsent.check();
        await register.submit();
        await expect(
            page.getByRole('heading', {name: MSG.pendingTitle})
        ).toBeVisible({timeout: 30_000});
        await expect(
            page.getByText(`We've sent a confirmation email to you at ${who.email}.`)
        ).toBeVisible();
        await expect(page.getByText('Please follow the instructions in that email')).toBeVisible();
        // Still a signed-out site; the page's only link is the breadcrumb's "Home".
        await expect(headerNav(page).getByRole('link', {name: 'Login', exact: true})).toBeVisible();
        await expect(headerNav(page)).not.toContainText(who.username);
        const main = page.locator('.page_message');
        await expect(main.getByRole('link', {name: 'Home'})).toBeVisible();
        await expect(main.getByRole('link')).toHaveCount(1);

        // The same username and email again: the unvalidated account already
        // claims them (Rule 15).
        await page.goto(registerUrl);
        const registerAgain = new RegisterPage(page);
        await expect(registerAgain.heading).toBeVisible();
        await registerAgain.fillIdentity(who);
        await registerAgain.privacyConsent.check();
        await registerAgain.submit();
        await expect(registerAgain.errorsHeading).toHaveText(MSG.errorsHeading, {timeout: 30_000});
        await expect(registerAgain.errorLines).toHaveText([MSG.usernameTaken, MSG.emailTaken]);

        // Signing in before activating is refused with the disabled reason.
        await page.goto(`${base}/index.php/${press.path}/login`);
        await submitLoginForm(page, who.username, who.password);
        await expect(
            page.getByText(
                `Your account has been disabled for the following reason: We've sent a confirmation email to you at ${who.email}.`
            )
        ).toBeVisible({timeout: 20_000});
        await expect(page.locator('form#login')).toBeVisible();

        // The "Validate Your Account" email, from the technical support
        // contact, carries the activation link.
        const mail = await validationMail(pkpMail, who.email);
        expect(mail.summary.From.Address).toBe(support.email);
        expect(mail.summary.From.Name).toBe(support.name);
        expect(mail.full.Text).toContain(`You have created an account with ${press.name}`);

        // The link: "Confirm and activate your account" → "Activate Account";
        // the button's own address is captured at the press.
        await page.goto(mail.link);
        const activation = new ActivationPage(page);
        await expect(activation.description).toBeVisible();
        await expect(activation.activateButton).toBeVisible();
        const activateHref = await activation.activateHref();
        expect(activateHref).toMatch(/\/user\/activateUser\//);
        await activation.activateButton.click();
        await expect(activation.activated).toBeVisible({timeout: 20_000});

        // The button's own address reopened: the Login page, silently (Rule 13).
        await page.goto(activateHref);
        await expect(page.locator('form#login')).toBeVisible();
        await expect(page.getByRole('heading', {name: 'Login', exact: true})).toBeVisible();
        await expect(activation.activated).toHaveCount(0);
        await expect(page.getByRole('heading', {name: MSG.invitationUnavailable})).toHaveCount(0);

        // Sign in on the press's Login page, the same credentials as before
        // activation (Control): it works, landing on the press homepage.
        await page.goto(`${base}/index.php/${press.path}/login`);
        await signInAndLand(page, who.username, who.password);
        await expect(page).toHaveURL(new RegExp(`/index.php/${press.path}(/index)?/?$`));
        await expect(headerNav(page)).toContainText(who.username);

        // The emailed link once more: "Invitation Unavailable" with Login and
        // Register buttons.
        const again = await freshPage({baseURL: base});
        await again.goto(mail.link);
        await expect(
            again.getByRole('heading', {name: MSG.invitationUnavailable})
        ).toBeVisible({timeout: 20_000});
        const unavailable = again.locator('.page_invitation_unavailable');
        await expect(unavailable.getByRole('link', {name: 'Login', exact: true})).toBeVisible();
        await expect(unavailable.getByRole('link', {name: 'Register', exact: true})).toBeVisible();
        await expect(again.getByRole('link', {name: 'Activate Account'})).toHaveCount(0);

        // The second visitor: the variant's site-level page, "Reader" under
        // the seeded press and its consent line → "Registration awaiting
        // verification" (Rule 11); the mail From the site contact reading
        // "an account with , but…" (Rule 12); activate; sign in on the
        // site's Login page, landing on the site's press list (Rule 13).
        const second = await freshPage({baseURL: base});
        const secondWho = makeRegistrant(tag, 'b');
        await second.goto(`${base}${RegisterPage.siteUrl()}`);
        const siteRegister = new RegisterPage(second);
        await expect(siteRegister.heading).toBeVisible();
        await expect(siteRegister.contextsLegend).toBeVisible();
        await siteRegister.contextRoleBox(PK_NAME, 'Reader').check();
        await siteRegister.contextConsent(PK_NAME).check();
        await siteRegister.fillIdentity(secondWho);
        await siteRegister.submit();
        await expect(
            second.getByRole('heading', {name: MSG.pendingTitle})
        ).toBeVisible({timeout: 30_000});
        await expect(
            second.getByText(`We've sent a confirmation email to you at ${secondWho.email}.`)
        ).toBeVisible();
        await expect(headerNav(second)).not.toContainText(secondWho.username);
        // Before activating, the same credentials are refused (Control).
        await second.goto(`${base}/index.php/index/login`);
        await submitLoginForm(second, secondWho.username, secondWho.password);
        await expect(
            second.getByText('Your account has been disabled for the following reason:')
        ).toBeVisible({timeout: 20_000});
        const siteMail = await validationMail(pkpMail, secondWho.email);
        expect(siteMail.summary.From.Address).toBe(SITE_CONTACT.email);
        expect(siteMail.summary.From.Name).toBe(SITE_CONTACT.name);
        expect(siteMail.full.Text).toContain('You have created an account with , but');
        await second.goto(siteMail.link);
        const siteActivation = new ActivationPage(second);
        await expect(siteActivation.description).toBeVisible();
        await siteActivation.activateButton.click();
        await expect(siteActivation.activated).toBeVisible({timeout: 20_000});
        await second.goto(`${base}/index.php/index/login`);
        await signInAndLand(second, secondWho.username, secondWho.password);
        await expect(second).toHaveURL(/\/index.php\/index(\/en)?(\/index)?\/?$/);
        await expect(headerNav(second)).toContainText(secondWho.username);
    });

    test('S8: a signed-in user opening Register sees the completion page', async ({asUser}) => {
        // An Author (no Rule-10 role): three links, no "View Submissions".
        const authorPage = await (await asUser('author.alex')).newPage();
        await authorPage.goto(RegisterPage.contextUrl(PK));
        const authorComplete = new RegistrationCompletePage(authorPage);
        await expect(authorComplete.heading).toBeVisible();
        await expect(authorPage.locator('form#register')).toHaveCount(0);
        await expect(authorComplete.newSubmission).toBeVisible();
        await expect(authorComplete.editProfile).toBeVisible();
        await expect(authorComplete.continueBrowsing).toBeVisible();
        await expect(authorComplete.viewSubmissions).toHaveCount(0);

        // A Series Editor holds a Rule-10 role: "View Submissions" as well,
        // opening the list headed "Assigned to me".
        const editorPage = await (await asUser('sectioneditor.ana')).newPage();
        await editorPage.goto(RegisterPage.contextUrl(PK));
        const editorComplete = new RegistrationCompletePage(editorPage);
        await expect(editorComplete.heading).toBeVisible();
        await expect(editorComplete.viewSubmissions).toBeVisible();
        await expect(editorComplete.newSubmission).toBeVisible();
        await expect(editorComplete.editProfile).toBeVisible();
        await expect(editorComplete.continueBrowsing).toBeVisible();
        await editorComplete.viewSubmissions.click();
        await editorPage.waitForURL(/\/dashboard\/editorial/, {
            timeout: 20_000,
            waitUntil: 'commit',
        });
        await expect(
            editorPage.getByRole('heading', {name: /Assigned to me/})
        ).toBeVisible({timeout: 20_000});

        // The site-level address: "Edit My Profile" and "Continue Browsing"
        // only, for the Series Editor too.
        await editorPage.goto(RegisterPage.siteUrl());
        const siteComplete = new RegistrationCompletePage(editorPage);
        await expect(siteComplete.heading).toBeVisible();
        await expect(siteComplete.editProfile).toBeVisible();
        await expect(siteComplete.continueBrowsing).toBeVisible();
        await expect(siteComplete.newSubmission).toHaveCount(0);
        await expect(siteComplete.viewSubmissions).toHaveCount(0);
    });
});
