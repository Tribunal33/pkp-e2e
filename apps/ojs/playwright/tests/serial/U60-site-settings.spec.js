// @ts-check
/**
 * @file playwright/tests/serial/U60-site-settings.spec.js
 *
 * Site settings — OJS suite: scenarios 1–11 (1–9 common, 10 {OJS OMP},
 * 11 {OJS OPS}).
 * Spec: docs/specs/U60-site-settings.md
 *
 * Serial project, alone (PRINCIPLES A7, A9): every scenario reads or
 * changes the site's settings, one record every worker, fleet page and
 * scratch journal shares (scenarios.md "`POST site`"), so each test carries
 * `@solo` and runs by itself in the `ojs-solo` project after the serial one
 * (harness.md "Project chain"). Each test puts back every site value it
 * changed in a `finally`, even when it fails midway: the Site Name through
 * `pkpApi.setSite({title: ''})` (the install state, which no screen returns
 * to), everything else through the site's own save sent from the Site
 * Administrator's page (`putSite`, spec footnote s). Scenario 7's ticked
 * journal stays ticked until the fleet is reset (footnote s).
 *
 * Not asserted here, by register ID: A2, A3, A4, A5, A7, A8 (every one
 * carried by the register alone, the spec's Coverage section); A6 is
 * passed by scenario 11, which reads the pages' link to the removed sheet,
 * never the file; A9 by scenario 8, whose visitor opens the site only after
 * the save.
 *
 * Seeding (footnote s): scratch journals from `POST scenarios/context`
 * with throwaway `users[]` (the username twice as password unless given,
 * `<username>@mail.test`); a scratch journal beside `publicknowledge` is
 * what makes the site's address open the site's home page. The Site
 * Administrator is `admin`. Every signed-in actor is opened through
 * `asUser`; a signed-out visitor is a browser context with an empty
 * storage state (patterns.md "Fixture selection", parallel lesson 8).
 * Scenario 4 asks Have I Been Pwned over the network (footnote g).
 */
const fs = require('fs');
const path = require('path');
const {test: base, expect} = require('../../support/fixtures.js');
const {LoginPage} = require('../../../../../shared/playwright/pages/LoginPage.js');
const {ProfilePage, SAVED_MESSAGE} = require('../../../../../shared/playwright/pages/ProfilePage.js');
const {SettingsPages, ACCESS_DENIED} = require('../../../../../shared/playwright/pages/ContextIdentityPages.js');
const {PublicLook} = require('../../../../../shared/playwright/pages/AppearancePages.js');
const {
    SiteSettingsPage,
    SitePublicPage,
    SITE_INSTALL,
    putSite,
} = require('../../../../../shared/playwright/pages/SiteSettingsPages.js');
const {WorkflowPage, openAddReviewerModal, searchReviewerList, closeSideWindow} = require('../../pages/ReviewStagePages.js');

const T = 30_000;

// ---- the OJS words and the install values -------------------------------------------
const APP_NAME = 'Open Journal Systems';
const REDIRECT_LABEL = 'Journal redirect';
const REDIRECT_DESCRIPTION =
    'Requests to the main site will be redirected to this journal. This may be useful if the site is hosting only a single journal, for example.';
const HOSTED = 'Hosted Journals';
const BULK_END =
    'Further restrictions on this feature can be enabled for each journal by visiting its settings wizard in the list of Hosted Journals.';
const THEME_DESCRIPTION = 'New themes may be installed from the Plugins tab at the top of this page.';
/** "Appearance" › "Theme" as installed, the fields the tab's "Save" sends (seed-facts; footnote s). */
const THEME_INSTALL = {
    themePluginPath: 'default',
    typography: 'notoSans',
    baseColour: '#1E6292',
    showDescriptionInJournalIndex: 'false',
    'journalContentOrganization[]': '1',
    useHomepageImageAsHeader: 'false',
    displayStats: 'none',
};

const TOP_TABS = ['Site Setup', 'Appearance', 'Announcements', 'Plugins'];
const SIDE_TABS = {
    'Site Setup': ['Settings', 'Security', 'Information', 'Languages', 'Navigation', 'Highlights', 'Bulk Emails', 'Statistics', 'ORCID'],
    Appearance: ['Theme', 'Setup'],
    Announcements: ['Settings', 'Announcements', 'Announcement Types'],
    Plugins: ['Installed Plugins', 'Plugin Gallery'],
};

const REQUIRED = 'This field is required.';
const ONE_ERROR = 'Please correct one error.';
const NOT_SAVED_ONE = 'The form was not saved because 1 error(s) were encountered. Please correct these errors and try again.';
const ACCESS_DENIED_JOURNAL = 'Access denied.';
const NO_CONTEXT = 'You cannot call this operation without a context (press, journal, conference, etc).';
const LOGIN_REFUSED = 'Invalid username/email or password. Please try again.';
const LEAKED = 'This password has appeared in data leaks. Please choose a different, strong password.';
const CONSENT = 'Yes, I agree to have my data collected and stored according to the privacy statement.';
const LATO = 'Lato: A popular modern sans-serif font.';
const DARK_RED = 'rgb(139, 0, 0)';

/** The site's addresses (footnote s). */
const SITE = {
    address: '/index.php/index',
    login: '/index.php/index/login',
    about: '/index.php/index/en/about',
    privacy: '/index.php/index/en/about/privacy',
    register: '/index.php/index/en/user/register',
    profile: '/index.php/index/en/user/profile',
};
/** A link or address that opens the site's home page. */
const SITE_HOME = /\/index\.php\/index(\/en)?(\/index)?\/?$/;

/** The files of scenarios 9 and 11. */
const LOGO_FILE = {
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: fs.readFileSync(path.join(__dirname, '..', '..', 'fixtures', 'files', 'figure.png')),
};
const CSS_FILE = {name: 'site.css', mimeType: 'text/css', buffer: Buffer.from('h1 { color: rgb(200, 0, 0); }\n')};

/** A signed-out visitor: a browser context with no session at all (parallel lesson 8). */
const test = base.extend({
    newVisitor: async ({browser, baseURL}, use) => {
        const made = [];
        await use(async () => {
            const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'});
            made.push(context);
            return context.newPage();
        });
        for (const context of made) {
            await context.close();
        }
    },
});

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u60s${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** The roster password rule for throwaway accounts. */
const password = (username) => `${username}${username}`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles, more = {}) {
    return {username, givenName, familyName, roles, ...more};
}

/** The default name of a scratch journal. */
const scratchName = (tag) => `Scratch context ${tag}`;

/** A signed-in page for an actor (a fresh `asUser` context). */
async function signedIn(asUser, username) {
    return (await asUser(username)).newPage();
}

/** An address that opens a scratch journal's home page. */
const journalHome = (tag) => new RegExp(`/index\\.php/${tag}(/index)?/?$`);

/** Escape a string for a RegExp. */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('site settings', () => {
    test('S1: who reaches Site Settings @solo', async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(1, testInfo);
        const manager = `m${tag}`;
        await ojsApi.createContext({tag, users: [user(manager, 'Mara', 'Scratchmanager', ['manager'])]});
        const ap = await signedIn(asUser, 'admin');
        const mp = await signedIn(asUser, manager);
        const vp = await newVisitor();
        const site = new SiteSettingsPage(ap);
        try {
            // The page: its heading, top tabs and side tabs (Rule 1).
            await site.gotoFromAdministration();
            const address = ap.url();
            await expect(site.heading).toHaveText('Site Settings');
            await expect(site.topTabs).toHaveText(TOP_TABS);
            for (const [top, sides] of Object.entries(SIDE_TABS)) {
                await site.openTop(top);
                await expect(site.sideTabs(top)).toHaveText(sides);
            }

            // A reload on "Site Setup" › "Security" opens "Security" again (Rule 1).
            await site.open('Site Setup', 'Security');
            await site.reload();
            await expect(site.sideTab('Site Setup', 'Security')).toHaveAttribute('aria-selected', 'true');
            await expect(site.sideTab('Site Setup', 'Settings')).toHaveAttribute('aria-selected', 'false');

            // A journal's path in the address: "Access denied." (Rule 3).
            await ap.goto(address.replace('/index.php/index/', `/index.php/${tag}/`));
            await expect(ap.getByText(ACCESS_DENIED_JOURNAL, {exact: true})).toBeVisible({timeout: T});
            await expect(ap).toHaveURL(/\/user\/authorizationDenied/);

            // The Journal Manager at the copied address (Actors row 1).
            await mp.goto(address);
            await expect(mp.getByText(ACCESS_DENIED, {exact: true})).toBeVisible({timeout: T});
            await expect(mp).toHaveURL(/\/user\/authorizationDenied/);

            // The Journal Manager's save, sent directly with their own session
            // and CSRF token: refused (Actors row 3; Rule 22).
            await mp.goto(`/index.php/${tag}/dashboard/editorial`);
            await mp.waitForFunction(() => !!(window.pkp && window.pkp.currentUser && window.pkp.currentUser.csrfToken), null, {timeout: T});
            const token = await mp.evaluate(() => window.pkp.currentUser.csrfToken);
            const direct = await mp.request.post('/index.php/index/api/v1/site', {
                headers: {'X-Csrf-Token': token, 'X-Http-Method-Override': 'PUT'},
                form: {'title[en]': 'Not the site', 'title[fr_CA]': '', redirectContextId: '', disableSharedReviewerStatistics: 'false'},
            });
            expect(direct.status(), `the Journal Manager's save answers ${direct.status()} ${await direct.text()}`).toBeGreaterThanOrEqual(400);
            expect(direct.status()).toBeLessThan(500);

            // Signed out: the Login page (Actors row 1).
            await vp.goto(address);
            await expect(vp.locator('form#login')).toBeVisible({timeout: T});
            await expect(vp).toHaveURL(/\/login/);

            // Control: the Site Name is still empty (Rules 6, 22).
            await site.goto();
            const form = await site.settings();
            await expect(form.siteName()).toHaveValue('');
        } finally {
            await ojsApi.setSite({title: ''});
        }
    });

    test('S2: the Site Name @solo', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag(2, testInfo);
        const NAME = 'Harbour Scholarly Site';
        await ojsApi.createContext({tag});
        const ap = await signedIn(asUser, 'admin');
        const site = new SiteSettingsPage(ap);
        const home = new SitePublicPage(ap);
        try {
            // Without a Site Name ⚠ A1: an empty title and hidden heading, the
            // application's logo; the editorial header in plain text (Rule 7).
            await home.goto();
            await expect(home.contextList).toBeVisible();
            await expect(ap).toHaveTitle('');
            await expect(home.hiddenHeading).toHaveText('');
            await expect(home.logo).toHaveAttribute('alt', APP_NAME);
            await expect(home.textNameLink).toHaveCount(0);
            await site.gotoFromAdministration();
            await expect(site.contextTitle).toHaveText(APP_NAME);
            await expect(ap.locator('a.app__contextTitle')).toHaveCount(0);
            await expect(ap).toHaveTitle(`Site Settings | ${APP_NAME}`);

            // Refused while empty: nothing sent; reloaded, the redirect is
            // blank (Rules 4a, 6).
            let form = await site.settings();
            await expect(form.siteName()).toHaveValue('');
            await form.redirect.selectOption({label: scratchName(tag)});
            expect(await form.saveRefusedInBrowser('siteConfig-title-control', REQUIRED)).toEqual([]);
            await expect(form.errorSummary).toContainText(ONE_ERROR);
            await expect(form.goToButton(`Go to Site Name: ${REQUIRED}`)).toHaveCount(1);
            await expect(form.jumpToErrorButton).toBeVisible();
            await site.reload();
            form = await site.settings();
            await expect(form.siteName()).toHaveValue('');
            expect(await form.redirectChosen()).toBe('');

            // Saved (Rule 4).
            await form.siteName().fill(NAME);
            await form.save();

            // The site's home page: the title, the hidden heading, the name as
            // a link to the site's home page (Rule 7).
            await home.goto();
            await expect(ap).toHaveTitle(NAME);
            await expect(home.hiddenHeading).toHaveText(NAME);
            await expect(home.textNameLink).toHaveText(NAME);
            await expect(home.logoLink).toHaveCount(0);
            expect(await home.nameLinkHref()).toMatch(SITE_HOME);

            // The Administration screens: the header links to the site's home
            // page; the browser tab carries the name (Rule 7).
            await site.gotoFromAdministration();
            await expect(ap).toHaveTitle(`Site Settings | ${NAME}`);
            const headerLink = ap.locator('a.app__contextTitle');
            await expect(headerLink).toHaveText(NAME);
            await headerLink.click();
            await expect(home.hiddenHeading).toHaveText(NAME, {timeout: T});
            await expect(home.contextList).toBeVisible();

            // Emptied: refused; reloaded, the name stands (Rules 4a, 6).
            await site.goto();
            form = await site.settings();
            await form.siteName().fill('');
            expect(await form.saveRefusedInBrowser('siteConfig-title-control', REQUIRED)).toEqual([]);
            await site.reload();
            form = await site.settings();
            await expect(form.siteName()).toHaveValue(NAME);

            // Control: the scratch journal's header shows its own name (Rule 18).
            const journal = new PublicLook(ap, tag);
            await journal.goto();
            await expect(journal.textNameLink).toHaveText(scratchName(tag));
        } finally {
            await ojsApi.setSite({title: ''});
        }
    });

    test('S3: "Journal redirect" @solo', async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.slow();
        const tagA = makeTag('3a', testInfo);
        const tagB = makeTag('3b', testInfo);
        const reader = `r${tagA}`;
        await ojsApi.createContext({tag: tagA, users: [user(reader, 'Rosa', 'Scratchreader', ['reader'])]});
        await ojsApi.createContext({tag: tagB, context: {enabled: false}});
        await ojsApi.setSite({title: 'Harbour Scholarly Site'});
        const ap = await signedIn(asUser, 'admin');
        const vp = await newVisitor();
        const site = new SiteSettingsPage(ap);
        const home = new SitePublicPage(vp);
        let redirected = false;
        try {
            // Before: the site's home page with its list of journals (Rule 8).
            await vp.goto(SITE.address);
            await expect(home.contextList).toBeVisible({timeout: T});
            await expect(home.contextList.getByRole('link', {name: scratchName(tagA), exact: true}).first()).toBeVisible();

            // The list: its label, the blank first choice selected, the
            // description (Fields).
            let form = await site.goto().then(() => site.settings());
            await expect(form.form.getByRole('combobox', {name: REDIRECT_LABEL, exact: true})).toHaveCount(1);
            expect(await form.redirectChosen()).toBe('');
            expect((await form.redirectChoices())[0]).toBe('');
            await expect(form.description('siteConfig-redirectContextId-control')).toHaveText(REDIRECT_DESCRIPTION);

            // A journal chosen (Rules 4, 8).
            await form.redirect.selectOption({label: scratchName(tagA)});
            await form.save();
            redirected = true;

            // The site's address opens the first journal's home page (Rule 8).
            await vp.goto(SITE.address);
            await expect(vp).toHaveURL(journalHome(tagA));
            await expect(new PublicLook(vp, tagA).textNameLink).toHaveText(scratchName(tagA));

            // The site's Login page stays at the site's address; the Reader
            // signed in there lands on the journal's home page (Rule 8).
            const login = new LoginPage(vp);
            await vp.goto(SITE.login);
            await login.expectForm();
            await expect(vp).toHaveURL(/\/index\.php\/index\/(en\/)?login/);
            await login.signIn(reader, password(reader));
            await expect(vp).toHaveURL(journalHome(tagA));

            // Blank again: the site's address opens the site's home page (Rule 8).
            form = await site.goto().then(() => site.settings());
            await form.redirect.selectOption('');
            await form.save();
            redirected = false;
            await vp.goto(SITE.address);
            await expect(home.contextList).toBeVisible({timeout: T});
            await expect(vp).toHaveURL(/\/index\.php\/index(\/|$)/);

            // Control: the list offers the first journal, not the second,
            // which is not enabled publicly (Fields).
            const choices = await form.redirectChoices();
            expect(choices).toContain(scratchName(tagA));
            expect(choices).not.toContain(scratchName(tagB));
        } finally {
            if (redirected) {
                await putSite(ap, SITE_INSTALL.settings);
            }
            await ojsApi.setSite({title: ''});
        }
    });

    test('S4: the password rules @solo', async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(4, testInfo);
        const quinn = `q${tag}`;
        const quinnPassword = 'Kq7vz2';
        await ojsApi.createContext({tag, users: [user(quinn, 'Quinn', 'Ashdown', ['reader'], {password: quinnPassword})]});
        const ap = await signedIn(asUser, 'admin');
        const qp = await newVisitor();
        const site = new SiteSettingsPage(ap);
        let changed = false;
        try {
            // Numbers refused: 3, 4.5 by the server; an empty box by the page
            // (Fields; Rule 4a).
            await site.goto();
            const form = await site.security();
            await expect(form.minPasswordLength).toHaveValue('6');
            await form.minPasswordLength.fill('3');
            let answer = await form.pressSave();
            expect(answer.status()).toBe(400);
            await expect(ap.getByText(NOT_SAVED_ONE)).toBeVisible();
            await expect(form.fieldError('siteSecurity-minPasswordLength-control')).toHaveText('This must be at least 4.');
            await expect(form.errorSummary).toContainText(ONE_ERROR);
            await expect(form.goToButton('Go to Minimum password length (characters): This must be at least 4.')).toHaveCount(1);
            await expect(form.jumpToErrorButton).toBeVisible();
            await form.minPasswordLength.fill('4.5');
            answer = await form.pressSave();
            expect(answer.status()).toBe(400);
            await expect(form.fieldError('siteSecurity-minPasswordLength-control')).toHaveText('This is not a valid integer.');
            await form.minPasswordLength.fill('');
            expect(await form.saveRefusedInBrowser('siteSecurity-minPasswordLength-control', REQUIRED)).toEqual([]);

            // 8 saved (Rule 4).
            await form.minPasswordLength.fill('8');
            changed = true;
            await form.save();

            // A password chosen before still signs in (Rule 10).
            const login = new LoginPage(qp);
            await login.goto();
            await login.signIn(quinn, quinnPassword);
            await expect(qp).not.toHaveURL(/\/login/);

            // Too short for the new minimum (Rule 10).
            const profile = new ProfilePage(qp, tag);
            await profile.goto('password');
            await profile.fillPasswords({current: quinnPassword, next: 'abcdefg'});
            await profile.save();
            await expect(profile.passwordErrorNotice()).toContainText('The password must be at least 8 characters.');

            // A leaked password, with the check ticked (Rule 11).
            await form.compromisedCheck.check();
            await form.save();
            await profile.fillPasswords({current: quinnPassword, next: 'qwerty123456'});
            await profile.save();
            await expect(profile.passwordErrorNotice()).toContainText(LEAKED);

            // Control: unticked and back to 6, the same password is accepted
            // (Rules 10, 11).
            await form.compromisedCheck.uncheck();
            await form.minPasswordLength.fill('6');
            await form.save();
            changed = false;
            await profile.fillPasswords({current: quinnPassword, next: 'qwerty123456'});
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            await expect(profile.passwordErrorNotice()).toHaveCount(0);
        } finally {
            if (changed) {
                await putSite(ap, SITE_INSTALL.security);
            }
        }
    });

    test('S5: rate limiting @solo', async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(5, testInfo);
        const rui = `r${tag}`;
        const nova = `n${tag}`;
        await ojsApi.createContext({
            tag,
            users: [user(rui, 'Rui', 'Tanaka', ['reader']), user(nova, 'Nova', 'Reyes', ['reader'])],
        });
        const ap = await signedIn(asUser, 'admin');
        const vp = await newVisitor();
        const site = new SiteSettingsPage(ap);
        let changed = false;
        try {
            // The boxes: shown only while ticked, with 5 and 300 (Rule 12).
            await site.goto();
            let form = await site.security();
            await expect(form.rateLimiting).not.toBeChecked();
            await expect(form.maxAttempts).toHaveCount(0);
            await form.rateLimiting.check();
            await expect(form.maxAttempts).toHaveValue('5');
            await expect(form.lockout).toHaveValue('300');
            await form.rateLimiting.uncheck();
            await expect(form.maxAttempts).toHaveCount(0);
            await expect(form.lockout).toHaveCount(0);
            await expect(form.minPasswordLength).toBeVisible();
            await form.rateLimiting.check();

            // Numbers refused (Fields; Rule 4a).
            await form.maxAttempts.fill('0');
            await form.lockout.fill('59');
            const refused = await form.pressSave();
            expect(refused.status()).toBe(400);
            await expect(form.fieldError('siteSecurity-rateLimitMaxAttempts-control')).toHaveText('This must be at least 1.');
            await expect(form.fieldError('siteSecurity-rateLimitDecaySeconds-control')).toHaveText('This must be at least 60.');

            // Both emptied: saved; reloaded, ticked with 5 and 300 (Rule 12).
            await form.maxAttempts.fill('');
            await form.lockout.fill('');
            changed = true;
            await form.save();
            await site.reload();
            form = await site.security();
            await expect(form.rateLimiting).toBeChecked();
            await expect(form.maxAttempts).toHaveValue('5');
            await expect(form.lockout).toHaveValue('300');

            // The lockout: two wrong passwords, then the right one, each
            // refused on the Login page (Rule 12a).
            await form.maxAttempts.fill('2');
            await form.lockout.fill('60');
            await form.save();
            const login = new LoginPage(vp);
            for (const attempt of ['wrong-password', 'wrong-password', password(rui)]) {
                await login.goto();
                const answered = vp.waitForResponse((r) => /\/login\/signIn/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                await login.submitCredentials(rui, attempt);
                await answered;
                await expect(vp.getByText(LOGIN_REFUSED, {exact: true})).toBeVisible({timeout: T});
                await login.expectForm();
                await expect(vp).toHaveURL(/\/login/);
            }
            await vp.goto(SITE.profile);
            await login.expectForm();

            // Control: Nova signs in from the same browser (Rule 12a).
            await login.goto();
            await login.signIn(nova, password(nova));
            await expect(vp).not.toHaveURL(/\/login/);
        } finally {
            if (changed) {
                await putSite(ap, SITE_INSTALL.security);
            }
        }
    });

    test("S6: the site's information @solo", async ({asUser, ojsApi, pkpMail, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(6, testInfo);
        const quinn = `q${tag}`;
        const quinnEmail = `${quinn}@mail.test`;
        await ojsApi.createContext({tag, users: [user(quinn, 'Quinn', 'Ashdown', ['reader'])]});
        const ap = await signedIn(asUser, 'admin');
        const vp = await newVisitor();
        const site = new SiteSettingsPage(ap);
        const home = new SitePublicPage(vp);
        let changed = false;
        try {
            // Refused: an empty name by the page, a bad address by the server;
            // reloaded, the contact as installed (Fields; Rule 4a).
            await site.goto();
            let form = await site.information();
            await expect(form.contactName()).toHaveValue(APP_NAME);
            await form.contactName().fill('');
            expect(await form.saveRefusedInBrowser('siteInfo-contactName-control', REQUIRED)).toEqual([]);
            await form.contactName().fill('Site Help Desk');
            await form.contactEmail().fill('not-an-address');
            const refused = await form.pressSave();
            expect(refused.status()).toBe(400);
            await expect(ap.getByText(NOT_SAVED_ONE)).toBeVisible();
            await expect(form.fieldError('siteInfo-contactEmail-control')).toHaveText('This is not a valid email address.');
            await expect(form.errorSummary).toContainText(ONE_ERROR);
            await expect(form.goToButton('Go to Email of principal contact: This is not a valid email address.')).toHaveCount(1);
            await expect(form.jumpToErrorButton).toBeVisible();
            await site.reload();
            form = await site.information();
            await expect(form.contactName()).toHaveValue(APP_NAME);
            await expect(form.contactEmail()).toHaveValue('admin@mail.test');

            // Saved (Rule 4).
            await form.typeRich(form.aboutId(), 'Welcome to the test site.');
            await form.contactName().fill('Site Help Desk');
            await form.contactEmail().fill('helpdesk@mail.test');
            await form.typeRich(form.privacyId(), 'We keep your data private.');
            changed = true;
            await form.save();

            // The site's home page: the text above the list of journals (Rule 13).
            await home.goto();
            await expect(home.aboutSite).toHaveText('Welcome to the test site.');
            expect(await home.aboutBeforeList()).toBe(true);

            // The site's About address: the Login page signed out, the
            // access-denied page for the Site Administrator (Rule 13).
            await vp.goto(SITE.about);
            await expect(home.loginForm).toBeVisible({timeout: T});
            await expect(vp).toHaveURL(/\/login/);
            await ap.goto(SITE.about);
            await expect(ap.getByText(NO_CONTEXT, {exact: true})).toBeVisible({timeout: T});

            // The privacy statement: the Register page's consent, the Privacy
            // Statement page (Rule 15).
            await vp.goto(SITE.register);
            await expect(vp.getByRole('checkbox', {name: CONSENT})).toBeVisible({timeout: T});
            let response = await vp.goto(SITE.privacy);
            expect(response && response.status()).toBe(200);
            await expect(vp.locator('.pkp_structure_main')).toContainText('We keep your data private.');

            // The password-reset email comes from the contact (Rule 14).
            const login = new LoginPage(vp);
            await login.goto();
            await login.forgotPasswordLink.click();
            await vp.locator('form#lostPasswordForm input#email').fill(quinnEmail);
            await vp.locator('form#lostPasswordForm button[type="submit"]').click();
            const summary = await pkpMail.find({to: quinnEmail, subject: 'Password Reset Confirmation'});
            const message = await pkpMail.fullMessage(summary.ID);
            expect(message.From).toEqual(expect.objectContaining({Name: 'Site Help Desk', Address: 'helpdesk@mail.test'}));

            // Control: emptied and put back; no text above the list, and the
            // Privacy Statement page answers 404 (Rules 13, 15).
            await site.goto();
            form = await site.information();
            await form.typeRich(form.aboutId(), '');
            await form.typeRich(form.privacyId(), '');
            await form.contactName().fill(APP_NAME);
            await form.contactEmail().fill('admin@mail.test');
            await form.save();
            changed = false;
            await home.goto();
            await expect(home.contextList).toBeVisible();
            await expect(home.aboutSite).toHaveCount(0);
            response = await vp.goto(SITE.privacy);
            expect(response && response.status()).toBe(404);
            await expect(vp.getByText('404 Not Found').first()).toBeVisible();
        } finally {
            if (changed) {
                await putSite(ap, SITE_INSTALL.information(APP_NAME));
            }
        }
    });

    test('S7: bulk email for a journal @solo', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tagA = makeTag('7a', testInfo);
        const tagB = makeTag('7b', testInfo);
        const managerA = `m${tagA}`;
        const managerB = `m${tagB}`;
        await ojsApi.createContext({tag: tagA, users: [user(managerA, 'Mara', 'Scratchmanager', ['manager'])]});
        await ojsApi.createContext({tag: tagB, users: [user(managerB, 'Milo', 'Scratchmanager', ['manager'])]});
        const ap = await signedIn(asUser, 'admin');
        const pa = await signedIn(asUser, managerA);
        const pb = await signedIn(asUser, managerB);
        const site = new SiteSettingsPage(ap);

        // The list: a box per hosted journal, the two unticked; the
        // description ends with the "Hosted Journals" link (Fields; Rule 16).
        await site.goto();
        const form = await site.bulkEmails();
        const labels = await form.boxLabels();
        expect(labels).toEqual(expect.arrayContaining([scratchName(tagA), scratchName(tagB), 'Journal of Public Knowledge']));
        expect(labels.filter((l) => !l)).toEqual([]);
        // One box per journal: each of the two appears once (the fleet repeats other suites' names).
        expect(labels.filter((l) => l === scratchName(tagA))).toHaveLength(1);
        expect(labels.filter((l) => l === scratchName(tagB))).toHaveLength(1);
        await expect(form.box(scratchName(tagA))).not.toBeChecked();
        await expect(form.box(scratchName(tagB))).not.toBeChecked();
        await expect(form.descriptionText).toHaveText(new RegExp(`${esc(BULK_END)}\\s*$`));
        await expect(form.descriptionLink(HOSTED)).toBeVisible();

        // Ticked (Rule 4).
        await form.box(scratchName(tagA)).check();
        await form.save();

        // The first Journal Manager has "Notify" (Rule 16).
        const settingsA = new SettingsPages(pa, tagA);
        await settingsA.goto('usersRoles');
        expect(await settingsA.topTabNames()).toContain('Notify');

        // The link opens Administration › "Hosted Journals", which lists as
        // many journals as the tab has boxes (Rule 16).
        await form.descriptionLink(HOSTED).click();
        await ap.waitForURL(/\/admin\/contexts/, {timeout: T, waitUntil: 'commit'});
        await expect(ap).toHaveTitle(new RegExp(`^${HOSTED}`));
        await expect(ap.locator('tr.gridRow').first()).toBeVisible({timeout: T});
        await expect(ap.locator('tr.gridRow')).toHaveCount(labels.length);

        // Control: the second Journal Manager has no "Notify" (Rule 16).
        const settingsB = new SettingsPages(pb, tagB);
        await settingsB.goto('usersRoles');
        const tabsB = await settingsB.topTabNames();
        expect(tabsB).toContain('Roles');
        expect(tabsB).not.toContain('Notify');
    });

    test("S8: the site's theme @solo", async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(8, testInfo);
        await ojsApi.createContext({tag});
        const ap = await signedIn(asUser, 'admin');
        const site = new SiteSettingsPage(ap);
        let changed = false;
        try {
            // The tab: "Default Theme" alone, its description, the theme's own
            // fields below (Fields; Rule 17).
            await site.goto();
            const theme = await site.theme();
            expect(await theme.themeChoices()).toEqual(['Default Theme']);
            await expect(theme.themeDescription).toHaveText(THEME_DESCRIPTION);
            const labels = await theme.fieldLabels();
            expect(labels[0]).toBe('Theme');
            expect(labels.slice(1)).toEqual(expect.arrayContaining(['Typography', 'Colour']));

            // Changed (Rules 4, 17).
            await theme.choice(LATO).check();
            await theme.typeColour('#8B0000');
            changed = true;
            await theme.save();

            // The visitor's first visit: a browser that never opened the site
            // (A9) sees the dark red header and Lato on the site's home and
            // Login pages (Rules 17, 17b).
            const vp = await newVisitor();
            const home = new SitePublicPage(vp);
            for (const pathname of ['', '/login']) {
                await home.goto(pathname);
                expect((await home.headerLook()).background, `the header on "${pathname || 'home'}"`).toBe(DARK_RED);
                expect((await home.fonts()).text, `the text on "${pathname || 'home'}"`).toMatch(/^"?Lato"?(,|$)/);
            }

            // Control: the scratch journal keeps its own look (Rule 17).
            const journal = new PublicLook(vp, tag);
            await journal.goto();
            expect((await journal.headerLook()).background).not.toBe(DARK_RED);
            expect((await journal.fonts()).text).not.toMatch(/Lato/);
        } finally {
            if (changed) {
                await putSite(ap, THEME_INSTALL, {theme: true});
            }
        }
    });

    test("S9: the site's logo, footer and sidebar @solo", async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(9, testInfo);
        const FOOTER = 'Hosted by the test site.';
        await ojsApi.createContext({tag});
        const ap = await signedIn(asUser, 'admin');
        const vp = await newVisitor();
        const site = new SiteSettingsPage(ap);
        const home = new SitePublicPage(vp);
        let changed = false;
        try {
            // Set (Rules 4, 18–20).
            await site.goto();
            const setup = await site.appearanceSetup();
            const logo = setup.logo('en');
            expect(await logo.choose(LOGO_FILE)).toBe(200);
            await logo.altText.fill('Site logo');
            await setup.typeFooter(FOOTER);
            await setup.sidebar.box('Language Toggle Block').check();
            changed = true;
            await setup.save();

            // The site's pages: the logo linking home, the footer, the
            // language block (Rules 18–20).
            for (const pathname of ['', '/login']) {
                await home.goto(pathname);
                await expect(home.logo).toHaveAttribute('alt', 'Site logo');
                expect(((await home.logoLink.getAttribute('href')) || '').trim()).toMatch(SITE_HOME);
                await expect(home.footerContent).toContainText(FOOTER);
                await expect(home.languageBlock).toBeVisible();
            }

            // A journal's pages: its own name, no site logo, no site footer
            // (Rules 18, 19).
            const journal = new PublicLook(vp, tag);
            await journal.goto();
            await expect(journal.textNameLink).toHaveText(scratchName(tag));
            await expect(journal.logoLink).toHaveCount(0);
            await expect(vp.getByText(FOOTER)).toHaveCount(0);

            // The site's French pages: the same logo and footer (Rule 5).
            await home.goto();
            await home.languageLink('français').click();
            await expect(vp.locator('html')).toHaveAttribute('lang', /^fr/, {timeout: T});
            await expect(home.logo).toHaveAttribute('alt', 'Site logo');
            await expect(home.footerContent).toContainText(FOOTER);

            // Control: removed, emptied, unticked; the site's home page shows
            // the application's logo, no footer, no language block (Rules 7,
            // 18–20).
            await logo.removeButton.click();
            await setup.typeFooter('');
            await setup.sidebar.box('Language Toggle Block').uncheck();
            await setup.save();
            changed = false;
            await home.goto();
            await expect(home.contextList).toBeVisible();
            await expect(home.logo).toHaveAttribute('alt', APP_NAME);
            await expect(vp.getByText(FOOTER)).toHaveCount(0);
            await expect(home.languageBlock).toHaveCount(0);
        } finally {
            if (changed) {
                await putSite(ap, SITE_INSTALL.appearance);
            }
        }
    });

    test('S10: "Reviewer statistics" @solo', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tagA = makeTag('10a', testInfo);
        const tagB = makeTag('10b', testInfo);
        const reviewer = `rv${tagA}`;
        const reviewerFamily = `Reviewer${tagA}`;
        const authorA = `a${tagA}`;
        const authorB = `a${tagB}`;
        const manager = `m${tagB}`;
        await ojsApi.createContext({
            tag: tagA,
            users: [user(authorA, 'Ada', 'Author', ['author']), user(reviewer, 'Kayo', reviewerFamily, ['externalReviewer'])],
        });
        await ojsApi.createSubmission({
            tag: `${tagA}s`,
            context: tagA,
            submitter: authorA,
            decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [{username: reviewer, status: 'completed'}]}],
        });
        await ojsApi.createContext({
            tag: tagB,
            users: [
                user(manager, 'Mara', 'Scratchmanager', ['manager']),
                user(authorB, 'Abe', 'Author', ['author']),
                {username: reviewer, roles: ['externalReviewer']},
            ],
        });
        const {submissionId} = await ojsApi.createSubmission({tag: `${tagB}s`, context: tagB, submitter: authorB, decisions: ['sendExternalReview']});
        await ojsApi.setSite({title: 'Harbour Scholarly Site'});
        const ap = await signedIn(asUser, 'admin');
        const mp = await signedIn(asUser, manager);
        const site = new SiteSettingsPage(ap);
        const workflow = new WorkflowPage(mp, tagB);
        let changed = false;

        /** The Reviewer's "reviews completed" in a freshly opened "Add Reviewer". */
        const completedInAddReviewer = async () => {
            const modal = await openAddReviewerModal(mp);
            const item = await searchReviewerList(mp, modal, reviewerFamily);
            return {modal, count: item.locator('.listPanel__item--reviewer__complete')};
        };

        try {
            // Counted across journals: 1 (Rule 9).
            await workflow.gotoEditorial(submissionId);
            let open = await completedInAddReviewer();
            await expect(open.count).toHaveText(/^\s*1\s*$/);

            // Ticked (Rules 4, 9).
            await site.goto();
            const form = await site.settings();
            await expect(form.reviewerStatistics).not.toBeChecked();
            await form.reviewerStatistics.check();
            changed = true;
            await form.save();

            // This journal only: 0 (Rule 9).
            await closeSideWindow(open.modal);
            open = await completedInAddReviewer();
            await expect(open.count).toHaveText(/^\s*0\s*$/);

            // Control: unticked, 1 again (Rule 9).
            await form.reviewerStatistics.uncheck();
            await form.save();
            changed = false;
            await closeSideWindow(open.modal);
            open = await completedInAddReviewer();
            await expect(open.count).toHaveText(/^\s*1\s*$/);
        } finally {
            if (changed) {
                await putSite(ap, SITE_INSTALL.settings);
            }
            await ojsApi.setSite({title: ''});
        }
    });

    test('S11: "Site style sheet" @solo', async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(11, testInfo);
        await ojsApi.createContext({tag});
        const ap = await signedIn(asUser, 'admin');
        const vp = await newVisitor();
        const site = new SiteSettingsPage(ap);
        const pages = [new SitePublicPage(vp), new PublicLook(vp, tag)];
        const isSiteSheet = (href) => /\/public\/site\/styleSheet\.css/.test(href);
        const isThemeSheet = (href) => /css\?name=stylesheet/.test(href);
        let changed = false;
        try {
            // Uploaded (Rules 4, 21).
            await site.goto();
            let setup = await site.appearanceSetup();
            expect(await setup.styleSheet.choose(CSS_FILE)).toBe(200);
            changed = true;
            await setup.save();

            // The public pages load it last, after the theme's own styles (Rule 21).
            for (const pg of pages) {
                await pg.goto();
                const sheets = await pg.styleSheets();
                const theme = sheets.findIndex(isThemeSheet);
                const own = sheets.findIndex(isSiteSheet);
                expect(theme, `the theme's sheet on ${vp.url()}: ${sheets.join(' ')}`).toBeGreaterThanOrEqual(0);
                expect(own, `the site's sheet on ${vp.url()}: ${sheets.join(' ')}`).toBe(sheets.length - 1);
                expect(own).toBeGreaterThan(theme);
            }

            // The editorial screens do not load it (Rule 21).
            await site.goto();
            const adminSheets = await site.styleSheets();
            expect(adminSheets.length).toBeGreaterThan(0);
            expect(adminSheets.filter(isSiteSheet)).toEqual([]);

            // Control: removed; the two pages no longer load it ⚠ A6 (Rule 21).
            setup = await site.appearanceSetup();
            await setup.styleSheet.removeButton.click();
            await setup.save();
            changed = false;
            for (const pg of pages) {
                await pg.goto();
                const sheets = await pg.styleSheets();
                expect(sheets.filter(isThemeSheet).length, `the theme's sheet on ${vp.url()}`).toBe(1);
                expect(sheets.filter(isSiteSheet), `the site's sheet on ${vp.url()}`).toEqual([]);
            }
        } finally {
            if (changed) {
                await putSite(ap, SITE_INSTALL.appearance);
            }
        }
    });
});
