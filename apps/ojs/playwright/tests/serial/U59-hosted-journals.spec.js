// @ts-check
/**
 * @file playwright/tests/serial/U59-hosted-journals.spec.js
 *
 * Hosted journals (site admin) — OJS suite: scenarios 1–7 (all common;
 * scenario 4 carries its {OJS} "Current Issue" steps).
 * Spec: docs/specs/U59-hosted-journals.md
 *
 * Serial project (PRINCIPLES A7, A9; spec footnote s): every scenario
 * creates, changes or removes journals that join or leave the site-wide
 * lists other tests read (the site's home page, Hosted Journals, the
 * journals switcher, Site Settings' "Bulk Emails"). S5 carries `@solo` and
 * runs alone in the `ojs-solo` project: its "Done" rewrites the whole
 * site's order as the page loaded it (harness.md "Project chain").
 *
 * Not asserted here, by register ID: A1, A3, A4, A5, OPS1 (the register
 * carries them, the spec's Coverage section); A2 and A6 are passed by S3
 * and S2, which read the row after a reload and never press "Jump to next
 * error".
 *
 * Seeding (footnote s): scratch journals from `POST scenarios/context`
 * (`enabled`, `country`, `acronym`, `description`, {OJS} `issues[]`,
 * throwaway `users[]` with the username twice as password and
 * `<username>@mail.test`); a journal a test edits is seeded with a
 * country. Every path and name a test seeds or types carries the test's
 * tag, the fleet keeping every journal a run leaves, and every list read
 * is scoped to the test's own rows. The seeded journal is only read. The
 * Site Administrator is `admin`; every signed-in actor is opened through
 * `asUser`, a signed-out visitor is a browser context with an empty
 * storage state (patterns.md "Fixture selection", parallel lesson 8). The
 * no-email checks (S2, S6) read Mailpit by time from the action, for any
 * message that names the test's tag, bounded by a "Forgot your password?"
 * request for a throwaway account that arrives (PRINCIPLES A8).
 */
const {test: base, expect} = require('../../support/fixtures.js');
const {disableMotion} = require('../../../../../shared/playwright/support/motion.js');
const {waitForJQueryIdle} = require('../../../../../shared/playwright/support/legacy.js');
const {LoginPage} = require('../../../../../shared/playwright/pages/LoginPage.js');
const {ProfilePage} = require('../../../../../shared/playwright/pages/ProfilePage.js');
const {SettingsPages} = require('../../../../../shared/playwright/pages/ContextIdentityPages.js');
const {SiteSettingsPage} = require('../../../../../shared/playwright/pages/SiteSettingsPages.js');
const {EditorialChrome} = require('../../../../../shared/playwright/pages/NavigationChromePages.js');
const {LanguageMenu} = require('../../../../../shared/playwright/pages/LanguagesPages.js');
const {UsersListPage} = require('../../../../../shared/playwright/pages/UsersManagementPages.js');
const {SectionsTab, expectNoticeTopRight} = require('../../../../../shared/playwright/pages/SectionsPages.js');
const {TasksPanel, DISCUSSION_TASK} = require('../../../../../shared/playwright/pages/NotificationsPages.js');
const {
    HostedJournalsPage,
    SiteJournalsList,
    SettingsWizardPage,
} = require('../../../../../shared/playwright/pages/HostedJournalsPages.js');

const T = 30_000;

// ---- the OJS words ------------------------------------------------------------------
const LABELS = {hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'};
const WIZARD = {settings: 'Journal Settings', journal: 'Journal'};
const TOP_TABS = ['Journal Settings', 'Plugins', 'Users'];
const SIDE_TABS = ['Journal', 'Appearance', 'Languages', 'Search Indexing', 'Restrict Bulk Emails'];
const PLUGIN_TABS = ['Installed Plugins', 'Plugin Gallery'];
const ENTRY_LINKS = ['View Journal', 'Current Issue'];
const MANAGER_ROLE = 'Journal manager';
const FIRST_SECTION = 'Articles';

const ROLE_DENIED = 'The current role does not have access to this operation.';
const REQUIRED = 'This field is required.';
const BAD_EMAIL = 'This is not a valid email address.';
const PATH_CHARS = 'The path can only include letters, numbers and the characters _ and -. It must begin and end with a letter or number.';
const PATH_TAKEN = 'The path you provided is already in use by another journal.';
const PRIMARY_NOT_SUPPORTED = "The primary locale must be one of the journal's supported locales.";
const NOT_SAVED_ONE = 'The form was not saved because 1 error(s) were encountered. Please correct these errors and try again.';
const NOT_FOUND = '404 Not Found';
const NO_CURRENT_ISSUE = 'No Current Issue';
const SEEDED_JOURNAL = 'publicknowledge';
const SEEDED_JOURNAL_NAME = 'Journal of Public Knowledge';

/** A signed-out visitor: a browser context with no session at all (parallel lesson 8). */
const test = base.extend({
    newVisitor: async ({browser, baseURL}, use) => {
        const made = [];
        await use(async () => {
            const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'});
            await disableMotion(context);
            made.push(context);
            return context.newPage();
        });
        for (const context of made) {
            await context.close();
        }
    },
});

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker + random. */
function makeTag(scenario, testInfo) {
    return `u59s${scenario}w${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 7)}`;
}

/** The roster password rule for throwaway accounts. */
const password = (username) => `${username}${username}`;
const mail = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, roles};
}

/** A signed-in page for an actor (a fresh `asUser` context). */
async function signedIn(asUser, username) {
    return (await asUser(username)).newPage();
}


/** An address that opens a journal's home page. */
const journalHome = (path) => new RegExp(`/index\\.php/${path}(/[a-z]{2}(_[A-Z]{2})?)?(/index)?/?$`);
/** An address that opens the site's home page. */
const SITE_HOME = /\/index\.php\/index(\/en)?(\/index)?\/?$/;

/** The journal's home page is open: its address and its name in the header. */
async function expectJournalHome(page, journal) {
    await expect(page).toHaveURL(journalHome(journal.path), {timeout: T});
    await expect(page.locator('.pkp_site_name')).toContainText(journal.name, {timeout: T});
    await expect(page.locator('form#login')).toHaveCount(0);
}

/** The Login page is open. */
async function expectLoginPage(page) {
    await expect(page).toHaveURL(/\/login(\?|$)/, {timeout: T});
    await expect(new LoginPage(page).form).toBeVisible({timeout: T});
}

/** The access-denied page for a role without the Site Administrator's. */
async function expectRoleDenied(page) {
    await expect(page.getByText(ROLE_DENIED, {exact: true})).toBeVisible({timeout: T});
    await expect(page).toHaveURL(/\/user\/authorizationDenied/);
}

/** The "404 Not Found" answer to an address. */
async function expectNotFound(page, address) {
    const response = await page.goto(address);
    expect(response && response.status(), `${address} answers 404`).toBe(404);
    await expect(page.getByRole('heading', {name: NOT_FOUND, exact: true})).toBeVisible({timeout: T});
}

/**
 * The messages Mailpit holds that arrived at or after `since` (ms), newest
 * first; read page by page until one is older.
 */
async function mailSince(pkpMail, since) {
    const out = [];
    for (let start = 0; start < 2000; start += 100) {
        const result = await pkpMail._get('/api/v1/messages', {limit: '100', start: String(start)});
        const messages = result.messages || [];
        for (const m of messages) {
            if (new Date(m.Created).getTime() >= since) out.push(m);
        }
        if (!messages.length || new Date(messages[messages.length - 1].Created).getTime() < since) break;
    }
    return out;
}

/**
 * "No email since `since`" (Side effects): a "Forgot your password?"
 * request for the throwaway `control` account arrives first (the positive
 * control that bounds the wait), then no other message that arrived since
 * names the test's tag in a recipient, the subject or the text.
 */
async function expectNoMailSince(page, pkpMail, since, tag, control) {
    await page.goto('/index.php/index/en/login/lostPassword');
    await page.locator('input[name="email"]').fill(mail(control));
    await page.getByRole('button', {name: /Reset password/i}).click();
    await pkpMail.find({to: mail(control)});
    const recipients = (m) => [...(m.To || []), ...(m.Cc || []), ...(m.Bcc || [])].map((a) => a.Address || '');
    const ours = (await mailSince(pkpMail, since))
        .filter((m) => !recipients(m).includes(mail(control)))
        .filter((m) => recipients(m).some((a) => a.includes(tag)) || `${m.Subject} ${m.Snippet}`.includes(tag))
        .map((m) => `${m.Subject} → ${recipients(m).join(', ')}`);
    expect(ours, 'no email went out').toEqual([]);
}

test.describe('hosted journals', () => {
    test('S1: who reaches Hosted Journals', async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.setTimeout(3 * 60_000);
        const tag = makeTag(1, testInfo);
        const dune = {path: `dunereview${tag}`, name: `Dune Review ${tag}`};
        const marsh = {path: `marshreview${tag}`, name: `Marsh Review ${tag}`};
        const manager = `jm${tag}`;
        await ojsApi.createContext({
            tag: dune.path,
            context: {name: dune.name, acronym: 'DR', country: 'CA'},
            users: [user(manager, 'Dana', 'Dunemanager', ['manager'])],
        });
        await ojsApi.createContext({tag: marsh.path, context: {name: marsh.name, enabled: false}});
        const ap = await signedIn(asUser, 'admin');
        const mp = await signedIn(asUser, manager);
        const vp = await newVisitor();
        const hosted = new HostedJournalsPage(ap, LABELS);

        // The page: the trail, one table "Journals" with "Name" and "Path",
        // "Order" and "Create Journal" above it (Rule 1).
        await hosted.gotoFromAdministration();
        const listAddress = ap.url();
        await expect(hosted.trailItems).toHaveText(HostedJournalsPage.trailWords(['Administration', LABELS.hosted]));
        await expect(hosted.trail.getByRole('link')).toHaveText(['Administration']);
        await expect(hosted.tableHeading).toBeVisible();
        await expect(hosted.grid.locator('table')).toHaveCount(1);
        await expect(hosted.columnHeaders).toHaveText(['Name', 'Path']);
        await expect(hosted.headerLinks).toHaveText(['Order', LABELS.create]);

        // The rows: each journal's name and path, the one not enabled
        // publicly too; nothing in a row says which is which (Rules 1, 2).
        for (const j of [dune, marsh]) {
            await expect.poll(() => hosted.rowName(j.path)).toBe(j.name);
            await expect(hosted.pathCell(j.path)).toHaveText(j.path);
            await expect(hosted.row(j.path).locator('td')).toHaveCount(2);
            await expect(hosted.row(j.path)).not.toContainText(/enabl|public|disabl/i);
        }

        // A row's arrow: "Edit", "Remove", "Settings wizard"; the wizard
        // opens (Rules 2, 16).
        expect(await hosted.rowControlNames(dune.path)).toEqual(['Edit', 'Remove', 'Settings wizard']);
        const wizard = await hosted.openWizard(dune.path, WIZARD);
        await expect(wizard.heading).toHaveText('Settings Wizard');
        const wizardAddress = ap.url().replace(/#.*$/, '');
        // (the control's positive side: the wizard's form holds "Path" and the box)
        const adminForm = await wizard.journalForm();
        await expect(adminForm.control('context-urlPath-control')).toBeVisible();
        await expect(ap.getByRole('checkbox', {name: /appear publicly on the site/})).toHaveCount(1);

        // The Journal Manager at both addresses: the access-denied page
        // (Actors row 1).
        for (const address of [listAddress, wizardAddress]) {
            await mp.goto(address);
            await expectRoleDenied(mp);
        }

        // Signed out: the Login page (Actors row 1).
        for (const address of [listAddress, wizardAddress]) {
            await vp.goto(address);
            await expectLoginPage(vp);
        }

        // Control: the Journal Manager's Settings › Journal, "Masthead" and
        // "Contact", hold neither "Path" nor the box (Actors row 4).
        const settings = new SettingsPages(mp, dune.path);
        for (const tab of ['Masthead', 'Contact']) {
            const form = await settings.openJournalTab(tab);
            await expect(form.form).toBeVisible();
            await expect(settings.tab(tab)).toHaveAttribute('aria-selected', 'true');
            await expect(mp.locator('[id*="urlPath-control"]')).toHaveCount(0);
            await expect(mp.getByRole('checkbox', {name: /appear publicly on the site/})).toHaveCount(0);
        }
    });

    test('S2: creating a journal', async ({asUser, ojsApi, newVisitor, pkpMail}, testInfo) => {
        test.setTimeout(5 * 60_000);
        const tag = makeTag(2, testInfo);
        const tide = {path: `tide${tag}`, name: `Tide Journal ${tag}`};
        const harbour = {path: `harbourreview${tag}`, name: `Harbour Review ${tag}`, fr: `Revue du Port ${tag}`};
        const notes = {path: `harbournotes${tag}`, name: `Harbour Notes ${tag}`};
        const contact = {name: 'Ana Pereira', email: `ana.pereira.${tag}@mail.test`};
        const control = `ctl${tag}`;
        await ojsApi.createContext({
            tag: tide.path,
            context: {name: {en: tide.name}},
            users: [user(control, 'Cal', 'Control', ['author'])],
        });
        const ap = await signedIn(asUser, 'admin');
        const vp = await newVisitor();
        const hosted = new HostedJournalsPage(ap, LABELS);

        // The window: every field empty, "Languages" English and French
        // unticked, no "Primary locale", no country, "Enable…" unticked
        // (Fields; Rule 3; Settings bullet 3).
        await hosted.gotoFromAdministration();
        let win = await hosted.openCreate();
        await expect(win.heading).toHaveText(LABELS.create);
        for (const box of [win.title('en'), win.initials('en'), win.abbreviation('en'), win.contactName, win.contactEmail, win.path]) {
            await expect(box).toHaveValue('');
        }
        await expect(win.form.getByRole('group', {name: /^Languages/}).getByRole('checkbox')).toHaveCount(2);
        await expect(win.form.getByRole('group', {name: /^Languages/}).getByRole('checkbox', {name: 'English', exact: true})).not.toBeChecked();
        await expect(win.form.getByRole('group', {name: /^Languages/}).getByRole('checkbox', {name: 'French', exact: true})).not.toBeChecked();
        await expect(win.primaryChoices).toHaveCount(2);
        await expect(win.form.locator('input[name="primaryLocale"]:checked')).toHaveCount(0);
        await expect.poll(() => win.countryChosen()).toBe('');
        await expect(win.enableLabel).toBeVisible();
        await expect(win.enableBox).not.toBeChecked();

        // The "Country" list: 249 countries, "Czechia" then "Côte d'Ivoire",
        // "Åland Islands" last (Fields).
        await expect(win.countryOptions).toHaveCount(249);
        const countries = (await win.countryOptions.allInnerTexts()).map((s) => s.trim());
        expect(countries[countries.indexOf('Czechia') + 1]).toBe("Côte d'Ivoire");
        expect(countries[countries.length - 1]).toBe('Åland Islands');

        // Closed unsaved: nothing asked, the window opens empty again (Rule 3).
        await win.type(win.title('en'), `Draft Journal ${tag}`);
        expect(await win.close()).toEqual([]);
        win = await hosted.openCreate();
        await expect(win.title('en')).toHaveValue('');

        // Refused empty: seven reasons, "Please correct 7 errors.", "Jump to
        // next error", "Save" disabled; nothing sent (Fields; Rule 4).
        const since = Date.now() - 1000;
        expect(await win.saveRefusedInBrowser('name', 'en')).toEqual([]);
        await expect
            .poll(() => win.errorMap())
            .toEqual({
                'name-en': REQUIRED,
                'acronym-en': REQUIRED,
                contactName: REQUIRED,
                contactEmail: REQUIRED,
                urlPath: REQUIRED,
                supportedLocales: REQUIRED,
                primaryLocale: REQUIRED,
            });
        await expect(win.errorSummary).toContainText('Please correct 7 errors.');
        await expect(win.jumpToErrorButton).toBeVisible();
        await expect(win.saveButton).toBeDisabled();

        // The email address refused by the server (Fields; Rule 4). Typing
        // the title and initials drops their reasons; "Save" stays disabled
        // while the other refused fields' reasons stand (T-ojs-1), and is
        // enabled once each refused field has changed.
        await win.type(win.title('en'), harbour.name);
        await win.type(win.initials('en'), 'HR');
        await expect(win.error('name', 'en')).toHaveCount(0);
        await expect(win.error('acronym', 'en')).toHaveCount(0);
        await expect
            .poll(() => win.errorMap())
            .toMatchObject({contactName: REQUIRED, contactEmail: REQUIRED, urlPath: REQUIRED, supportedLocales: REQUIRED});
        await expect(win.saveButton).toBeDisabled();
        await win.showLanguage('French', 'fr_CA');
        await win.type(win.title('fr_CA'), harbour.fr);
        await win.type(win.initials('fr_CA'), 'RP');
        await win.type(win.contactName, contact.name);
        await win.type(win.contactEmail, 'x');
        await win.country.selectOption({label: 'Canada'});
        await win.type(win.path, harbour.path);
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.languageBox('fr_CA'), true);
        await win.setBox(win.primaryChoice('en'), true);
        await expect(win.saveButton).toBeEnabled();
        const refused = await expectNoticeTopRight(ap, NOT_SAVED_ONE, () => win.pressSave());
        expect(refused.status()).toBe(400);
        await expect(win.error('contactEmail')).toHaveText(BAD_EMAIL);
        await expect.poll(() => win.errorMap()).toEqual({contactEmail: BAD_EMAIL});
        await expect(win.errorSummary).toContainText('Please correct one error.');
        await expect(win.saveButton).toBeDisabled();

        // "Path" refused: its characters, then a path in use (Fields; Rule 4).
        await win.type(win.contactEmail, contact.email);
        await win.type(win.path, 'a b');
        expect((await win.pressSave()).status()).toBe(400);
        await expect(win.error('urlPath')).toHaveText(PATH_CHARS);
        await win.type(win.path, SEEDED_JOURNAL);
        expect((await win.pressSave()).status()).toBe(400);
        await expect(win.error('urlPath')).toHaveText(PATH_TAKEN);

        // The site's language still required, French being the primary
        // locale with its boxes filled (Fields).
        await win.type(win.path, harbour.path);
        await win.setBox(win.primaryChoice('fr_CA'), true);
        await win.type(win.title('en'), '');
        await win.type(win.initials('en'), '');
        await win.saveRefusedInBrowser('name', 'en');
        await expect(win.error('name', 'en')).toHaveText(REQUIRED);
        await expect(win.error('acronym', 'en')).toHaveText(REQUIRED);
        await expect(win.title('fr_CA')).toHaveValue(harbour.fr);

        // "Primary locale" not ticked under "Languages" (Fields; Rule 4).
        await win.type(win.title('en'), harbour.name);
        await win.type(win.initials('en'), 'HR');
        await win.setBox(win.languageBox('fr_CA'), false);
        await expect(win.primaryChoice('fr_CA')).toBeChecked();
        expect((await win.pressSave()).status()).toBe(400);
        await expect(win.error('primaryLocale')).toHaveText(PRIMARY_NOT_SUPPORTED);

        // Accepted: the Settings Wizard, its "Journal" tab in English alone
        // (Rules 3, 5, 17).
        await win.setBox(win.primaryChoice('en'), true);
        await win.setBox(win.languageBox('fr_CA'), true);
        await expect(win.enableBox).not.toBeChecked();
        const created = await win.pressSave();
        expect(created.status()).toBe(200);
        await ap.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T});
        const wizard = new SettingsWizardPage(ap, WIZARD);
        await wizard.expectOpen();
        const journalTab = await wizard.journalForm();
        await expect(journalTab.title('en')).toHaveValue(harbour.name);
        await expect(journalTab.title('fr_CA')).toHaveCount(0);
        await expect(journalTab.frenchBoxes).toHaveCount(0);
        await expect(journalTab.languageButtons()).toHaveCount(0);

        // The new row: last of this test's rows (Rules 2, 5).
        await hosted.goto();
        await expect.poll(() => hosted.rowName(harbour.path)).toBe(harbour.name);
        await expect(hosted.pathCell(harbour.path)).toHaveText(harbour.path);
        await expect.poll(() => hosted.orderOf([tide.path, harbour.path])).toEqual([tide.path, harbour.path]);

        // Read in French: Harbour Review's French name, Tide Journal's
        // English one; English again (Rules 2, 3).
        const language = new LanguageMenu(ap);
        await language.choose('français', 'fr_CA');
        await hosted.expectOpen();
        await expect.poll(() => hosted.rowName(harbour.path)).toBe(harbour.fr);
        await expect.poll(() => hosted.rowName(tide.path)).toBe(tide.name);
        await language.choose('English', 'en');
        await hosted.expectOpen();
        await expect.poll(() => hosted.rowName(harbour.path)).toBe(harbour.name);

        // What the journal starts with: the switcher offers it; the Site
        // Administrator its Journal Manager with no "Start Date"; the typed
        // principal contact and no technical support contact; one section
        // "Articles" (Rule 6; Side effects).
        const chrome = new EditorialChrome(ap);
        await chrome.openSwitcher();
        await expect(chrome.switcherLink(harbour.name)).toHaveCount(1);
        await chrome.switcherLink(harbour.name).click();
        await ap.waitForURL(new RegExp(`/index\\.php/${harbour.path}/`), {timeout: T, waitUntil: 'commit'});
        const users = new UsersListPage(ap, harbour.path);
        await users.goto();
        const adminRow = users.row(mail('admin'));
        await expect(adminRow).toHaveCount(1);
        await expect(users.nameCell(adminRow)).toHaveText('admin admin');
        await expect(users.rolesCell(adminRow)).toHaveText(MANAGER_ROLE);
        await expect(users.startDateCell(adminRow)).toHaveText('');
        const settings = new SettingsPages(ap, harbour.path);
        const contactForm = await settings.openJournalTab('Contact');
        await expect(contactForm.control('contact-contactName-control')).toHaveValue(contact.name);
        await expect(contactForm.control('contact-contactEmail-control')).toHaveValue(contact.email);
        await expect(contactForm.control('contact-supportName-control')).toHaveValue('');
        await expect(contactForm.control('contact-supportEmail-control')).toHaveValue('');
        const sections = new SectionsTab(ap, harbour.path);
        await sections.goto();
        await expect(sections.titleCells()).toHaveText([FIRST_SECTION]);

        // Site Settings' "Bulk Emails" has a box for it (Side effects).
        const site = new SiteSettingsPage(ap);
        await site.goto();
        const bulk = await site.bulkEmails();
        await expect(bulk.box(harbour.name)).toHaveCount(1);
        await expect(bulk.box(tide.name)).toHaveCount(1);

        // Not enabled publicly: off the site's home page, its home page the
        // Login page (Rules 5, 11).
        const home = new SiteJournalsList(vp, LABELS);
        await home.goto();
        await expect(home.entry(tide.name)).toHaveCount(1);
        await expect(home.entry(harbour.name)).toHaveCount(0);
        await vp.goto(`/index.php/${harbour.path}`);
        await expectLoginPage(vp);

        // Enabled on "Create Journal": listed on the site's home page
        // (Rules 5, 20; Settings bullet 1).
        await hosted.goto();
        win = await hosted.openCreate();
        await win.type(win.title('en'), notes.name);
        await win.type(win.initials('en'), 'HN');
        await win.type(win.contactName, contact.name);
        await win.type(win.contactEmail, contact.email);
        await win.country.selectOption({label: 'Canada'});
        await win.type(win.path, notes.path);
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
        await win.setBox(win.enableBox, true);
        expect((await win.pressSave()).status()).toBe(200);
        await ap.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T});
        await wizard.expectOpen();
        await home.goto();
        await expect(home.entry(notes.name)).toHaveCount(1);
        await expect(home.entry(harbour.name)).toHaveCount(0);

        // Control: no email since the first "Save" (Side effects).
        await expectNoMailSince(vp, pkpMail, since, tag, control);
    });

    test('S3: editing a journal, and its one set of values', async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.setTimeout(4 * 60_000);
        const tag = makeTag(3, testInfo);
        const sea = {path: `sealetters${tag}`, name: `Sea Letters ${tag}`};
        const renamed = {path: `sealettersq${tag}`, name: `Sea Letters Quarterly ${tag}`};
        const manager = `jm${tag}`;
        const COAST = 'Letters from the coast.';
        const WHOLE_COAST = 'Letters from the whole coast.';
        await ojsApi.createContext({
            tag: sea.path,
            context: {name: sea.name, acronym: 'SL', country: 'CA'},
            users: [user(manager, 'Mika', 'Seamanager', ['manager'])],
        });
        const ap = await signedIn(asUser, 'admin');
        const mp = await signedIn(asUser, manager);
        const vp = await newVisitor();
        const hosted = new HostedJournalsPage(ap, LABELS);

        // The "Edit" window: the journal's values, no "Languages" or
        // "Primary locale" (Rule 8).
        await hosted.gotoFromAdministration();
        let win = await hosted.openEdit(sea.path);
        await expect(win.heading).toHaveText('Edit');
        await expect(win.title('en')).toHaveValue(sea.name);
        await expect(win.initials('en')).toHaveValue('SL');
        await expect(win.path).toHaveValue(sea.path);
        await expect(win.languageBoxes).toHaveCount(0);
        await expect(win.primaryChoices).toHaveCount(0);

        // Saved: "Saved", the window closes by itself; after a reload the
        // row reads the new name (Rule 8).
        await win.type(win.title('en'), renamed.name);
        await win.type(win.contactName, 'Lena Ortiz');
        await win.typeRich(win.descriptionId('en'), COAST);
        expect((await win.pressSave()).status()).toBe(200);
        await expect(win.savedStatus).toBeVisible({timeout: T});
        await expect(win.root).toHaveCount(0, {timeout: T});
        await hosted.reload();
        await expect.poll(() => hosted.rowName(sea.path)).toBe(renamed.name);

        // The wizard's "Journal" tab shows the same values (Rule 9).
        const wizard = await hosted.openWizard(sea.path, WIZARD);
        const journalTab = await wizard.journalForm();
        await expect(journalTab.title('en')).toHaveValue(renamed.name);
        await expect(journalTab.contactName).toHaveValue('Lena Ortiz');
        expect(await journalTab.richContent(journalTab.descriptionId('en'))).toContain(COAST);

        // The Journal Manager's Settings › Journal (Rule 9; Actors row 4).
        const settings = new SettingsPages(mp, sea.path);
        let masthead = await settings.openJournalTab('Masthead');
        await expect(masthead.control('masthead-name-control-en')).toHaveValue(renamed.name);
        expect(await masthead.richContent('masthead-description-control-en')).toContain(COAST);
        const contactForm = await settings.openJournalTab('Contact');
        await expect(contactForm.control('contact-contactName-control')).toHaveValue('Lena Ortiz');

        // Saved on "Masthead": the "Edit" window shows it (Rule 9).
        masthead = await settings.openJournalTab('Masthead');
        await masthead.typeRich('masthead-description-control-en', WHOLE_COAST);
        await masthead.save();
        await hosted.goto();
        win = await hosted.openEdit(sea.path);
        expect(await win.richContent(win.descriptionId('en'))).toContain(WHOLE_COAST);

        // A new path: every address follows it, the old one answers
        // "404 Not Found" (Rule 10).
        await win.type(win.path, renamed.path);
        expect((await win.pressSave()).status()).toBe(200);
        await expect(win.savedStatus).toBeVisible({timeout: T});
        await expect(win.root).toHaveCount(0, {timeout: T});
        await hosted.reload();
        await expect(hosted.pathCell(renamed.path)).toHaveText(renamed.path);
        await expect(hosted.row(sea.path)).toHaveCount(0);
        await vp.goto(`/index.php/${renamed.path}`);
        await expectJournalHome(vp, renamed);
        await expectNotFound(vp, `/index.php/${sea.path}`);

        // Control: a change closed unsaved is dropped, nothing asked (Rule 8).
        win = await hosted.openEdit(renamed.path);
        await win.type(win.title('en'), `Unsaved Title ${tag}`);
        expect(await win.close()).toEqual([]);
        win = await hosted.openEdit(renamed.path);
        await expect(win.title('en')).toHaveValue(renamed.name);
        expect(await win.close()).toEqual([]);

        // (the positive side of "neither "Languages" nor "Primary locale"":
        // "Create Journal" holds both, read the same way)
        win = await hosted.openCreate();
        await expect(win.languageBoxes).toHaveCount(2);
        await expect(win.primaryChoices).toHaveCount(2);
        expect(await win.close()).toEqual([]);
    });

    test('S4: the site’s list of journals, and a journal taken off it', async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.setTimeout(4 * 60_000);
        const tag = makeTag(4, testInfo);
        const river = {path: `riverreview${tag}`, name: `River Review ${tag}`};
        const hill = {path: `hillnotes${tag}`, name: `Hill Notes ${tag}`};
        const RIVER_TEXT = 'Letters from the river.';
        const year = new Date().getFullYear();
        await ojsApi.createContext({
            tag: river.path,
            context: {name: river.name, acronym: 'RR', country: 'CA', description: RIVER_TEXT},
            issues: [{volume: 1, number: 1, year, published: true}],
        });
        await ojsApi.createContext({tag: hill.path, context: {name: hill.name}});
        const ap = await signedIn(asUser, 'admin');
        const vp = await newVisitor();
        const home = new SiteJournalsList(vp, LABELS);

        // The list: "Journals", River Review above Hill Notes; River
        // Review's name, text and links, Hill Notes' nothing between its
        // name and its links (Rules 13, 19, 20; Settings bullets 2, 4).
        await home.goto();
        await expect(vp).toHaveURL(SITE_HOME);
        await expect(home.heading).toHaveText(LABELS.table);
        await expect.poll(() => home.orderOf([river.name, hill.name])).toEqual([river.name, hill.name]);
        expect(await home.parts(river.name)).toEqual(['name', 'description', 'links']);
        await expect(home.nameLink(river.name)).toHaveText(river.name);
        await expect(home.description(river.name)).toHaveText(RIVER_TEXT);
        await expect(home.entry(river.name).locator('ul.links a')).toHaveText(ENTRY_LINKS);
        expect(await home.parts(hill.name)).toEqual(['name', 'links']);
        await expect(home.description(hill.name)).toHaveCount(0);

        // The links: the name and "View Journal" open the journal's home
        // page (Rule 20).
        await home.nameLink(river.name).click();
        await expectJournalHome(vp, river);
        const riverHome = vp.url();
        await home.goto();
        await home.link(river.name, 'View Journal').click();
        await expectJournalHome(vp, river);
        expect(vp.url()).toBe(riverHome);

        // "Current Issue" {OJS}: River Review's Vol. 1 No. 1, Hill Notes'
        // "No Current Issue" (Rule 20).
        await home.goto();
        await home.link(river.name, 'Current Issue').click();
        await expect(vp.locator('.pkp_structure_main h1').first()).toHaveText(`Vol. 1 No. 1 (${year})`, {timeout: T});
        await home.goto();
        await home.link(hill.name, 'Current Issue').click();
        await expect(vp.locator('.pkp_structure_main h1').first()).toHaveText(NO_CURRENT_ISSUE, {timeout: T});

        // Taken off the site: unticked on "Edit", River Review leaves the
        // list, Hill Notes stays; its home page is the Login page (Rule 11;
        // Settings bullet 1).
        const hosted = new HostedJournalsPage(ap, LABELS);
        await hosted.gotoFromAdministration();
        let win = await hosted.openEdit(river.path);
        await expect(win.enableBox).toBeChecked();
        await win.setBox(win.enableBox, false);
        expect((await win.pressSave()).status()).toBe(200);
        await expect(win.savedStatus).toBeVisible({timeout: T});
        await expect(win.root).toHaveCount(0, {timeout: T});
        await home.goto();
        await expect(home.entry(hill.name)).toHaveCount(1);
        await expect(home.entry(river.name)).toHaveCount(0);
        await vp.goto(`/index.php/${river.path}`);
        await expectLoginPage(vp);

        // Still on Hosted Journals: the row, "Edit" with the box unticked,
        // the Settings Wizard (Rule 11).
        await hosted.reload();
        await expect(hosted.row(river.path)).toHaveCount(1);
        win = await hosted.openEdit(river.path);
        await expect(win.title('en')).toHaveValue(river.name);
        await expect(win.enableBox).not.toBeChecked();
        expect(await win.close()).toEqual([]);
        const wizard = await hosted.openWizard(river.path, WIZARD);
        await expect(wizard.heading).toHaveText('Settings Wizard');

        // Back on the site: ticked and saved, River Review above Hill Notes
        // again (Rules 11, 13).
        await hosted.goto();
        win = await hosted.openEdit(river.path);
        await win.setBox(win.enableBox, true);
        expect((await win.pressSave()).status()).toBe(200);
        await expect(win.savedStatus).toBeVisible({timeout: T});
        await home.goto();
        await expect.poll(() => home.orderOf([river.name, hill.name])).toEqual([river.name, hill.name]);

        // Control: River Review's home page opens, not the Login page (Rule 11).
        await vp.goto(`/index.php/${river.path}`);
        await expectJournalHome(vp, river);
    });

    test('S5: ordering the journals @solo', async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.setTimeout(4 * 60_000);
        const tag = makeTag(5, testInfo);
        const north = {path: `northpapers${tag}`, name: `North Papers ${tag}`};
        const south = {path: `southpapers${tag}`, name: `South Papers ${tag}`};
        const paths = [north.path, south.path];
        const names = [north.name, south.name];
        await ojsApi.createContext({tag: north.path, context: {name: north.name}});
        await ojsApi.createContext({tag: south.path, context: {name: south.name}});
        const ap = await signedIn(asUser, 'admin');
        const vp = await newVisitor();
        const hosted = new HostedJournalsPage(ap, LABELS);

        // "Order": every row a drag handle, the arrows hidden, "Done" and
        // "Cancel ordering"; "Create Journal" and "Order" do nothing (Rule 12).
        await hosted.gotoFromAdministration();
        await expect.poll(() => hosted.orderOf(paths)).toEqual([north.path, south.path]);
        await expect(hosted.row(north.path).locator('a.show_extras')).toBeVisible();
        await hosted.startOrdering();
        await expect(hosted.row(north.path)).toHaveClass(/ui-sortable-handle/);
        await expect(hosted.row(south.path)).toHaveClass(/ui-sortable-handle/);
        await expect(hosted.rows.and(ap.locator(':not(.ui-sortable-handle)'))).toHaveCount(0);
        await expect(hosted.visibleArrows).toHaveCount(0);
        await expect(hosted.doneControl).toBeVisible();
        await expect(hosted.cancelOrderingControl).toBeVisible();
        const opened = [];
        const onRequest = (r) => {
            if (/create-context|order-items|orderItems/.test(r.url())) opened.push(r.url());
        };
        ap.on('request', onRequest);
        await hosted.createLink.click();
        await hosted.orderLink.click();
        await waitForJQueryIdle(ap);
        ap.off('request', onRequest);
        expect(opened).toEqual([]);
        await expect(ap.getByRole('dialog', {name: LABELS.create})).toHaveCount(0);
        await expect(hosted.doneControl).toBeVisible();
        await expect(hosted.visibleArrows).toHaveCount(0);

        // "Done": South Papers above North Papers, the arrows back, kept
        // after a reload (Rules 12, 13).
        await hosted.drag(south.path, north.path);
        await expect.poll(() => hosted.orderOf(paths)).toEqual([south.path, north.path]);
        expect((await hosted.done()).status()).toBe(200);
        await expect(hosted.row(south.path).locator('a.show_extras')).toBeVisible();
        await expect.poll(() => hosted.orderOf(paths)).toEqual([south.path, north.path]);
        await hosted.reload();
        await expect.poll(() => hosted.orderOf(paths)).toEqual([south.path, north.path]);

        // The site's home page (Rules 13, 20).
        const home = new SiteJournalsList(vp, LABELS);
        await home.goto();
        await expect.poll(() => home.orderOf(names)).toEqual([south.name, north.name]);

        // The site's Register page (Rule 13).
        await home.registerLink.click();
        await vp.waitForURL(/\/user\/register/, {timeout: T});
        expect((await home.registerNames()).filter((n) => names.includes(n))).toEqual([south.name, north.name]);

        // The journals switcher (Rule 13).
        const chrome = new EditorialChrome(ap);
        await chrome.openSwitcher();
        await expect(chrome.switcherLink(south.name)).toHaveCount(1);
        expect((await chrome.switcherNames()).filter((n) => names.includes(n))).toEqual([south.name, north.name]);
        await chrome.switcherButton.click();

        // Not kept: dragged back, reloaded without "Done" (Rule 12).
        await hosted.reload();
        await hosted.startOrdering();
        await hosted.drag(north.path, south.path);
        await expect.poll(() => hosted.orderOf(paths)).toEqual([north.path, south.path]);
        await hosted.reload();
        await expect.poll(() => hosted.orderOf(paths)).toEqual([south.path, north.path]);

        // Control: dragged back, "Cancel ordering": the rows go back, each
        // with its arrow (Rule 12).
        await hosted.startOrdering();
        await hosted.drag(north.path, south.path);
        await expect.poll(() => hosted.orderOf(paths)).toEqual([north.path, south.path]);
        await hosted.cancelOrdering();
        await expect.poll(() => hosted.orderOf(paths)).toEqual([south.path, north.path]);
        await expect(hosted.row(south.path).locator('a.show_extras')).toBeVisible();
        await expect(hosted.row(north.path).locator('a.show_extras')).toBeVisible();

        // (the positive side of "no window opens": out of "Order", "Create
        // Journal" opens its window)
        const win = await hosted.openCreate();
        expect(await win.close()).toEqual([]);
    });

    test('S6: removing a journal', async ({asUser, ojsApi, newVisitor, pkpMail}, testInfo) => {
        test.setTimeout(4 * 60_000);
        const tag = makeTag(6, testInfo);
        const old = {path: `oldpierreview${tag}`, name: `Old Pier Review ${tag}`};
        const kept = {path: `newpierreview${tag}`, name: `New Pier Review ${tag}`};
        const rui = `rui${tag}`;
        const nova = `nova${tag}`;
        const manager = `jm${tag}`;
        const control = `ctl${tag}`;
        const title = `Pier Submission ${tag}`;
        // The "Discussion added." row as the panel words it (U37).
        const discussionRow = DISCUSSION_TASK({
            creatorName: 'Pia Piermanager',
            name: `Pier Discussion ${tag}`,
            message: `Seeded message for s${tag}.`,
        });
        await ojsApi.createContext({
            tag: old.path,
            context: {name: old.name},
            users: [
                user(rui, 'Rui', 'Tanaka', ['author']),
                user(nova, 'Nova', 'Reyes', ['author']),
                user(manager, 'Pia', 'Piermanager', ['manager']),
            ],
        });
        await ojsApi.createContext({
            tag: kept.path,
            context: {name: kept.name},
            users: [{username: nova, roles: ['author']}, user(control, 'Cal', 'Control', ['author'])],
        });
        await ojsApi.createSubmission({
            tag: `s${tag}`,
            context: old.path,
            submitter: nova,
            title,
            tasks: [{title: `Pier Discussion ${tag}`, creator: manager, participants: [manager, nova]}],
        });

        // (the Tasks read's positive side: Nova's panel holds the row now)
        const before = await signedIn(asUser, nova);
        await new ProfilePage(before, null).goto();
        const beforePanel = new TasksPanel(before);
        await beforePanel.open();
        await expect(beforePanel.sentence(beforePanel.row(title))).toHaveText(discussionRow);
        await beforePanel.close();

        const ap = await signedIn(asUser, 'admin');
        const hosted = new HostedJournalsPage(ap, LABELS);

        // "Remove", cancelled: the question, the row stays (Rule 14).
        await hosted.gotoFromAdministration();
        await expect(hosted.pathCell(old.path)).toHaveText(old.path);
        let dialog = await hosted.openRemove(old.path);
        await expect(dialog.question).toHaveText(`Are you sure you want to permanently delete ${old.name} and all of its contents?`);
        await expect(dialog.button('OK')).toBeVisible();
        await expect(dialog.button('Cancel')).toBeVisible();
        await hosted.cancelRemove(dialog);
        await expect(hosted.row(old.path)).toHaveCount(1);
        await hosted.reload();
        await expect(hosted.row(old.path)).toHaveCount(1);

        // "Remove", confirmed: the row leaves at once, and after a reload
        // (Rule 14).
        dialog = await hosted.openRemove(old.path);
        const since = Date.now() - 1000;
        expect((await hosted.confirmRemove(dialog)).status()).toBe(200);
        await expect(hosted.row(old.path)).toHaveCount(0);
        await expect(hosted.row(kept.path)).toHaveCount(1);
        await hosted.reload();
        await expect(hosted.row(old.path)).toHaveCount(0);
        await expect(hosted.row(kept.path)).toHaveCount(1);

        // The journal gone: "404 Not Found", off the site's home page and the
        // journals switcher (Rule 14; Side effects).
        await expectNotFound(ap, `/index.php/${old.path}`);
        const vp = await newVisitor();
        const home = new SiteJournalsList(vp, LABELS);
        await home.goto();
        await expect(home.entry(kept.name)).toHaveCount(1);
        await expect(home.entry(old.name)).toHaveCount(0);
        await hosted.goto();
        const chrome = new EditorialChrome(ap);
        await chrome.openSwitcher();
        await expect(chrome.switcherLink(kept.name)).toHaveCount(1);
        await expect(chrome.switcherLink(old.name)).toHaveCount(0);
        await chrome.switcherButton.click();

        // Rui: signs in, lands on the site's home page; no role in Old Pier
        // Review under Profile › "Roles" (Rule 15).
        const rp = await newVisitor();
        await new LoginPage(rp).goto();
        await new LoginPage(rp).signIn(rui, password(rui));
        await expect(rp).toHaveURL(SITE_HOME, {timeout: T});
        await expect(new SiteJournalsList(rp, LABELS).heading).toHaveText(LABELS.table);
        const ruiProfile = new ProfilePage(rp, null);
        await ruiProfile.goto('roles');
        await expect(ruiProfile.contextSection(kept.name)).toHaveCount(1);
        await expect(ruiProfile.contextSection(old.name)).toHaveCount(0);

        // Nova: her Author role in New Pier Review, none in Old Pier Review;
        // her Tasks panel no longer holds the "Discussion added." row
        // (Rule 15; Side effects).
        const np = await newVisitor();
        await new LoginPage(np).goto();
        await new LoginPage(np).signIn(nova, password(nova));
        const novaProfile = new ProfilePage(np, kept.path);
        await novaProfile.goto('roles');
        await expect(np.locator('header.app__header')).toContainText(kept.name);
        await expect(novaProfile.roleBox('Author')).toBeChecked();
        await expect(novaProfile.contextSection(SEEDED_JOURNAL_NAME)).toHaveCount(1);
        await expect(novaProfile.contextSection(old.name)).toHaveCount(0);
        const panel = new TasksPanel(np);
        await panel.open();
        await expect(panel.grid()).toBeVisible();
        await expect(panel.row(title)).toHaveCount(0);
        await panel.close();

        // No email since "OK" (Side effects).
        await expectNoMailSince(vp, pkpMail, since, tag, control);

        // Control: New Pier Review's row and home page (Rule 14).
        await hosted.goto();
        await expect(hosted.row(kept.path)).toHaveCount(1);
        await vp.goto(`/index.php/${kept.path}`);
        await expectJournalHome(vp, kept);
    });

    test('S7: the Settings Wizard', async ({asUser, ojsApi}, testInfo) => {
        test.setTimeout(4 * 60_000);
        const tag = makeTag(7, testInfo);
        const bay = {path: `bayletters${tag}`, name: `Bay Letters ${tag}`};
        const cape = {path: `capeletters${tag}`, name: `Cape Letters ${tag}`};
        await ojsApi.createContext({tag: bay.path, context: {name: bay.name, acronym: 'BL', country: 'CA'}});
        await ojsApi.createContext({tag: cape.path, context: {name: cape.name, acronym: 'CL', country: 'CA'}});
        const ap = await signedIn(asUser, 'admin');
        const hosted = new HostedJournalsPage(ap, LABELS);

        // The page: heading, trail, tabs (Rule 16).
        await hosted.gotoFromAdministration();
        let wizard = await hosted.openWizard(bay.path, WIZARD);
        await expect(wizard.heading).toHaveText('Settings Wizard');
        await expect(wizard.trailItems).toHaveText(HostedJournalsPage.trailWords(['Administration', LABELS.hosted, 'Settings Wizard']));
        await expect(wizard.trail.getByRole('link')).toHaveText(['Administration', LABELS.hosted]);
        await expect(wizard.topTabs).toHaveText(TOP_TABS);
        await expect(wizard.sideTabs(WIZARD.settings)).toHaveText(SIDE_TABS);
        await wizard.openTop('Plugins');
        await expect(wizard.sideTabs('Plugins')).toHaveText(PLUGIN_TABS);

        // The "Journal" tab: the form, "Saved", the page stays (Rule 17).
        let form = await wizard.journalForm();
        await expect(form.title('en')).toHaveValue(bay.name);
        await form.initials('en').fill('BLQ');
        const address = ap.url();
        await form.save();
        expect(ap.url()).toBe(address);
        await expect(wizard.heading).toHaveText('Settings Wizard');

        // A change not saved: kept across tabs, dropped on leaving, nothing
        // asked (Rule 17).
        await form.contactName.fill('Mara Voss');
        await wizard.openTop('Users');
        form = await wizard.journalForm();
        await expect(form.contactName).toHaveValue('Mara Voss');
        const asked = [];
        const onDialog = (d) => {
            asked.push(d.message());
            d.accept().catch(() => {});
        };
        ap.on('dialog', onDialog);
        await wizard.trail.getByRole('link', {name: LABELS.hosted, exact: true}).click();
        await ap.waitForURL(/\/admin\/contexts/, {timeout: T});
        await hosted.expectOpen();
        ap.off('dialog', onDialog);
        expect(asked).toEqual([]);
        wizard = await hosted.openWizard(bay.path, WIZARD);
        form = await wizard.journalForm();
        await expect(form.initials('en')).toHaveValue('BLQ');
        await expect(form.contactName).not.toHaveValue('Mara Voss');
        await expect(form.contactName).toHaveValue('Site Admin');

        // The addresses: "#indexing", "#users", "#plugins" reopen their tab;
        // after "Installed Plugins" a reload opens "Journal" (Rule 18).
        await wizard.openSide(WIZARD.settings, 'Search Indexing');
        await expect(ap).toHaveURL(/#indexing$/);
        await wizard.reload();
        await expect(wizard.sideTab(WIZARD.settings, 'Search Indexing')).toHaveAttribute('aria-selected', 'true');
        await wizard.openTop('Users');
        await expect(ap).toHaveURL(/#users$/);
        await wizard.reload();
        await expect(wizard.topTab('Users')).toHaveAttribute('aria-selected', 'true');
        await wizard.openTop('Plugins');
        await expect(ap).toHaveURL(/#plugins$/);
        await wizard.reload();
        await expect(wizard.topTab('Plugins')).toHaveAttribute('aria-selected', 'true');
        await wizard.sideTab('Plugins', 'Installed Plugins').click();
        await expect(ap).toHaveURL(/#installed$/);
        await wizard.reload();
        await expect(wizard.topTab(WIZARD.settings)).toHaveAttribute('aria-selected', 'true');
        await expect(wizard.sideTab(WIZARD.settings, WIZARD.journal)).toHaveAttribute('aria-selected', 'true');

        // Control: Cape Letters' initials unchanged (Rule 16).
        await hosted.goto();
        wizard = await hosted.openWizard(cape.path, WIZARD);
        form = await wizard.journalForm();
        await expect(form.initials('en')).toHaveValue('CL');
        await expect(form.title('en')).toHaveValue(cape.name);
    });
});
