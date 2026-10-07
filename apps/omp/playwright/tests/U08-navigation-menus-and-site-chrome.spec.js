// @ts-check
/**
 * @file playwright/tests/U08-navigation-menus-and-site-chrome.spec.js
 *
 * Navigation menus & site chrome — OMP suite, one test per canonical
 * scenario the spec runs on a press (scenarios 1–11, all common; scenario
 * 2's Reviewer bullet is run, scenario 10's preprint trail is OPS-only),
 * in the press's own vocabulary: "Catalog" where a journal has "Current"
 * and "Archives", "About the Press", "Monographs" and "Press" in the
 * side menu's "Statistics", "Catalog" in its "Content" group, "Learning
 * OMP", "…by OMP/PKP." and "Open Monograph Press". Scenario 8 (the
 * site's own items, shared by every test on the fleet) is in
 * `serial/U08-navigation-menus-and-site-chrome.spec.js`, run alone.
 * Spec: docs/specs/U08-navigation-menus-and-site-chrome.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: S2 finds the "i" icon as the header's one new-tab link and reads
 *   where it leads; nothing reads its accessible name.
 * - A2 🐞: no test presses a Series editor's "Dashboard" in the public
 *   header (S2 reads the Series editor's landing on the Dashboard only).
 * - A3 🐞: S9 reads the access-denied page's sentence and address only,
 *   never its heading or its trail's last step.
 * - A4, A7, A8, A10, A16, A21, A22, A23, A24 🐞: no test reaches
 *   those states (the site's menu window is S8's, which opens none).
 * - A5, A9, A10 ❓: not driven.
 * - A11 ✅ (retired 2026-10-07: the refusal notices are a Planned assertion), A12 🐞: S5 reads each refused save through the window staying
 *   open, the save's own `status: false` answer and nothing stored; it
 *   never asserts that no message shows, nor the type's description line.
 * - A13 🐞: S3 reads the warning notice's opening sentence only, never the
 *   journal wording a press is given.
 * - A14 ❓: S8 (serial file) opens the site's item window without reading
 *   its type list.
 * - A15 🐞: S4 and S7 never read the "Navigation" cells between an item's
 *   save or removal and a reload.
 * - A18 🐞: S5's back arrow is pressed with a browser-dialog handler that
 *   answers "OK" if the box comes; nothing asserts that it does.
 * - OJS1, OPS1, OPS2, OPS3, OPS4: another app's territory.
 *
 * Seeding: scenario endpoints only. S1–S3 read the seeded press
 * `publicknowledge` with roster accounts and change nothing there
 * (footnote y); every other test seeds its own scratch press with a
 * throwaway manager (and author), through `POST scenarios/context`
 * (`plugins`, `sidebar`) and, for S10's three books, `POST
 * scenarios/submission` with `published: true`. S10's "Items per page" is
 * saved on screen as the scenario's action (Settings bullet 16). S11 seeds
 * the "Developed By" block's plugin enabled (`plugins`) and its placement
 * (`sidebar`) on one press, and on a second press the plugin enabled and
 * not placed for the "before" control, since no key places the block after
 * the press exists. Signed-out reads run in a browser context with an
 * empty storage state (patterns.md, parallel lesson 8); each actor gets
 * its own `asUser` context. Addresses outside the install (the Remote URL
 * item's https://pkp.sfu.ca, the help link's documentation) are answered
 * by a route stub in the browser context, so a press follows the link
 * without the test leaving the machine.
 */
const {test: base, expect} = require('../support/fixtures.js');
const {
    NavigationTab,
    PublicChrome,
    EditorialChrome,
    whole,
} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {closeTab} = require('../../../../shared/playwright/support/tabs.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');

const PRESS = 'publicknowledge';
const PRESS_NAME = 'Public Knowledge Press';
const T = 30_000;

const HELP_URL = 'https://docs.pkp.sfu.ca/learning-omp/en/';
const PKP_URL = 'https://pkp.sfu.ca/';
const BRAND_ALT = 'More information about the publishing system, Platform and Workflow by OMP/PKP.';
const APP_NAME = 'Open Monograph Press';

const REQUIRED = 'This field is required.';
const REMOVE_QUESTION = 'Are you sure you wish to delete this item? This action cannot be undone.';
const CHANGED_QUESTION = 'The data on this form has changed. Do you wish to continue without saving?';
const FORM_NOT_SAVED = 'The form was not saved because 1 error(s) were encountered. Please correct these errors and try again.';
const ITEM_ADDED = 'Navigation menu item was successfully added';
const ITEM_UPDATED = 'Navigation menu item was successfully updated';
const ITEM_REMOVED = 'Navigation menu item was successfully removed';
const MENU_ADDED = 'Navigation menu was successfully added';
const MENU_UPDATED = 'Navigation menu was successfully updated';
const MENU_REMOVED = 'Navigation menu was successfully removed';
const NO_ITEMS_ASSIGNED = 'No items assigned to this menu. Drag items from Unassigned Menu Items.';
const ANNOUNCEMENTS_NOTICE = 'This link will only be displayed if you have enabled announcements under Settings > Website.';
/** The warning notice's opening sentence (its journal wording on a press is A13). */
const WARNING_NOTICE_START = "When a menu item opens a submenu, it's link can not be followed on all devices.";

/** The installed items of a press (Rule 2): the primary menu, the user menu, "Search". */
const ABOUT_CHILDREN = ['About the Press', 'Submissions', 'Editorial Masthead', 'Privacy Statement', 'Contact'];
const PRIMARY_OUTLINE = ['Catalog', 'Announcements', 'About', ...ABOUT_CHILDREN.map((t) => `  ${t}`)];
const PRIMARY_CELL = 'Catalog, About the Press, Submissions, Announcements, About, Editorial Masthead, Privacy Statement, Contact';
const userItems = (username) => ['Register', 'Login', username, 'Dashboard', 'View Profile', 'Administration', 'Logout'];
const userCell = (username) => `Dashboard, Register, View Profile, Login, ${username}, Administration, Logout`;
const allItems = (username) => ['Catalog', 'Announcements', 'About', ...ABOUT_CHILDREN, ...userItems(username), 'Search'];

/** The Press Manager's side menu on the seeded press (Rule 30). */
const MANAGER_SIDE = ['Editor Dashboard', 'Start A New Submission', 'DOIs', 'Settings', 'Content', 'Statistics', 'Tools'];
const STATISTICS = ['Monographs', 'Press', 'Editorial Activity', 'Users', 'Counter R5', 'Reports'];

const sorted = (list) => [...list].sort();

/** The access-denied page's sentences: the site-level refusal (Rule 26c) and the role refusal (Rule 26a). */
const NO_PRESS = 'No press was found that matched your request.';
const ROLE_DENIED = 'The current role does not have access to this operation.';

/** A visitor's page: a second browser context with no session at all (parallel lesson 8). */
const test = base.extend({
    visitor: async ({browser, baseURL}, use) => {
        const context = await browser.newContext({
            baseURL,
            storageState: {cookies: [], origins: []},
            reducedMotion: 'reduce',
        });
        await stubOutside(context);
        const page = await context.newPage();
        await use(page);
        await context.close();
    },
});

/** Answer the addresses outside the install a press follows (the Remote URL item, the help link). */
async function stubOutside(context) {
    await context.route(/^https:\/\/(docs\.)?pkp\.sfu\.ca\//, (route) =>
        route.fulfill({status: 200, contentType: 'text/html', body: '<html><head><title>stub</title></head><body>stub</body></html>'})
    );
}

/** An `asUser` page with the outside addresses stubbed. */
async function actorPage(asUser, username) {
    const context = await asUser(username);
    await stubOutside(context);
    return context.newPage();
}

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u8${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A scratch press with a throwaway Press Manager (and any further users). */
async function seedPress(ompApi, tag, extra = {}) {
    const {users = [], ...rest} = extra;
    await ompApi.createContext({
        tag,
        users: [{username: `${tag}mg`, givenName: 'Mona', familyName: 'Manager', email: `${tag}mg@mail.test`, roles: ['manager']}, ...users],
        ...rest,
    });
    return `${tag}mg`;
}

/**
 * `page` is on the access-denied page for a settings address opened at the
 * site's level (Rules 26a, 26c): the site's `authorizationDenied` address,
 * the press-not-found sentence, and, once that is on screen, not the role
 * sentence it replaces.
 */
async function expectNoPressPage(page, who) {
    await expect(page, `${who}: the access-denied page`).toHaveURL(/\/index\.php\/index(\/en)?\/user\/authorizationDenied\b/, {timeout: T});
    const main = page.locator('.pkp_structure_main');
    await expect(main.getByText(NO_PRESS, {exact: true}), `${who}: "${NO_PRESS}"`).toBeVisible({timeout: T});
    await expect(main.getByText(ROLE_DENIED), `${who}: no "${ROLE_DENIED}"`).toHaveCount(0);
}

/** An address's path, for URL assertions on a context-relative page. */
function pathOf(page) {
    return new URL(page.url()).pathname;
}

test.describe('navigation menus & site chrome', () => {
    test('S1: a visitor moves around the seeded press', {tag: '@smoke'}, async ({visitor}) => {
        test.slow();
        const chrome = new PublicChrome(visitor, PRESS, {locale: 'en'});
        await chrome.goto();

        // The header, left to right: the name as a text link home, the
        // primary menu without "Announcements", "Search", then "Register"
        // and "Login" (Rules 2, 15, 15a, 17, 18).
        await expect(chrome.siteNameLink).toHaveText(whole(PRESS_NAME));
        await expect(chrome.siteNameLink).toHaveClass(/is_text/);
        await expect(chrome.siteNameLink).toHaveAttribute('href', new RegExp(`/index\\.php/${PRESS}/en/index\\s*$`));
        await expect(chrome.primaryTopLinks).toHaveText([whole('Catalog'), whole('About')]);
        await expect(chrome.topLink('primary', 'Announcements')).toHaveCount(0);
        await expect(chrome.searchLink).toHaveText(whole('Search'));
        await expect(chrome.userTopLinks).toHaveText([whole('Register'), whole('Login')]);
        const order = await visitor.evaluate(() => {
            const parts = ['.pkp_site_name a', '#navigationPrimary', '.pkp_navigation_search_wrapper a', '#navigationUser'].map((s) => document.querySelector(s));
            return parts.every((p, i) => i === 0 || !!(parts[i - 1].compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING));
        });
        expect(order).toBe(true);
        const home = {name: await chrome.siteNameLink.innerText(), primary: await chrome.topTitles('primary'), user: await chrome.topTitles('user')};

        // The "About" list: pointing opens it; pressing it then leaves it
        // open, the pointer gone too, and the page stays (T-omp-1: the
        // scenario says the press closes it); Escape closes it; pressed
        // again, it opens (Rules 2, 16).
        const about = chrome.topLink('primary', 'About');
        const aboutList = chrome.submenu('primary', 'About');
        const homeUrl = visitor.url();
        await chrome.pointAt('primary', 'About');
        await expect(aboutList).toBeVisible();
        await expect(chrome.submenuLinks('primary', 'About')).toHaveText(ABOUT_CHILDREN.map(whole));
        await chrome.pressTop('primary', 'About');
        await chrome.pointAway();
        await expect(aboutList).toBeVisible();
        expect(visitor.url()).toBe(homeUrl);
        // lint-ok: escape Rule 16 claims the key; the theme's list (no window around it) takes it on the page
        await visitor.keyboard.press('Escape');
        await expect(aboutList).toBeHidden();
        await chrome.pressTop('primary', 'About');
        await chrome.pointAway();
        await expect(aboutList).toBeVisible();
        expect(visitor.url()).toBe(homeUrl);
        // lint-ok: escape Rule 16 claims the key, as above
        await visitor.keyboard.press('Escape');
        await expect(aboutList).toBeHidden();

        // A page and its trail: "Home / About the Press", the last step not
        // a link; "Home" leads back to the home page, which has no trail
        // (Rule 23).
        await chrome.pointAt('primary', 'About');
        await chrome.submenuLink('primary', 'About', 'About the Press').click();
        await expect(chrome.heading).toHaveText(whole('About the Press'));
        expect(await chrome.trail()).toEqual(['Home', 'About the Press']);
        await expect(chrome.currentCrumb).toHaveText(whole('About the Press'));
        await expect(chrome.breadcrumbs.getByRole('link', {name: 'About the Press'})).toHaveCount(0);
        await expect(chrome.crumbLink('Home')).toBeVisible();
        const aboutPage = {name: await chrome.siteNameLink.innerText(), primary: await chrome.topTitles('primary'), user: await chrome.topTitles('user')};
        await chrome.crumbLink('Home').click();
        await expect(chrome.header).toBeVisible();
        expect(pathOf(visitor)).toMatch(new RegExp(`/index\\.php/${PRESS}/en/index$`));
        await expect(chrome.main).toBeVisible();
        await expect(chrome.breadcrumbs).toHaveCount(0);

        // The skip links, on "About the Press": Tab shows each in turn;
        // Enter on "Skip to site footer", then Tab: the focus is in the
        // footer (Rule 22).
        await chrome.goto('/about');
        await expect(chrome.heading).toHaveText(whole('About the Press'));
        const skip = (label) => chrome.skipLinks.filter({hasText: whole(label)});
        await visitor.keyboard.press('Tab');
        await expect(skip('Skip to main content')).toBeFocused();
        await expect(skip('Skip to main content')).toBeVisible();
        await visitor.keyboard.press('Tab');
        await expect(skip('Skip to main navigation menu')).toBeFocused();
        await expect(skip('Skip to main navigation menu')).toBeVisible();
        await visitor.keyboard.press('Tab');
        await expect(skip('Skip to site footer')).toBeFocused();
        await expect(skip('Skip to site footer')).toBeVisible();
        await visitor.keyboard.press('Enter');
        await visitor.keyboard.press('Tab');
        await expect
            .poll(() => visitor.evaluate(() => !!document.activeElement && !!document.activeElement.closest('.pkp_structure_footer_wrapper')))
            .toBe(true);
        await expect(chrome.footerBrandLink).toBeFocused();

        // The footer: the application's logo, read as the OMP sentence; it
        // opens the page about the publishing software (Rule 20).
        await expect(chrome.footerBrandImage).toHaveAttribute('alt', BRAND_ALT);
        await expect(chrome.footerBrandLink).toHaveAccessibleName(BRAND_ALT);
        await chrome.footerBrandLink.click();
        await expect(chrome.heading).toHaveText(whole('About Open Monograph Press'));
        expect(pathOf(visitor)).toBe(`/index.php/${PRESS}/en/about/aboutThisPublishingSystem`);

        // "Search": the Search page, whose header has no "Search" link
        // (Rule 17).
        await chrome.searchLink.click();
        await expect(visitor).toHaveURL(new RegExp(`/index\\.php/${PRESS}/en/search`));
        await expect(chrome.heading).toBeVisible();
        await expect(chrome.searchLink).toHaveCount(0);
        await expect(chrome.primaryTopLinks).toHaveText([whole('Catalog'), whole('About')]);
        const searchPage = {name: await chrome.siteNameLink.innerText(), primary: await chrome.topTitles('primary'), user: await chrome.topTitles('user')};

        // Control: the same name, primary menu and user menu on the three
        // pages (Rule 15).
        expect(aboutPage).toEqual(home);
        expect(searchPage).toEqual(home);
    });

    test('S2: each role\'s user menu, "Dashboard" and side menu', async ({asUser}) => {
        test.slow();
        test.setTimeout(300_000);
        const seenUserLists = {};
        const seenSides = {};

        await test.step('the Press Manager', async () => {
            const page = await actorPage(asUser, 'manager.maya');
            const chrome = new PublicChrome(page, PRESS, {locale: 'en'});
            const ed = new EditorialChrome(page);

            // The press's name in the editorial header opens its home page
            // (Rule 27a); the header shows the username, then a count;
            // pressing it opens "Dashboard", "View Profile", "Logout" and
            // the page stays (Rules 18, 19b).
            await page.goto(`/index.php/${PRESS}/en/submissions`);
            await ed.waitReady();
            await expect(ed.contextTitle).toHaveText(whole(PRESS_NAME));
            await ed.contextTitle.click();
            await expect(chrome.header).toBeVisible({timeout: T});
            expect(pathOf(page)).toMatch(new RegExp(`/index\\.php/${PRESS}/en/index$`));
            const username = chrome.topLink('user', /^\s*manager\.maya\b/);
            await expect(chrome.userTopLinks).toHaveCount(1);
            await expect(username).toHaveText(/^\s*manager\.maya\s+\d+\s*$/);
            await expect(chrome.taskCount(username)).toHaveText(/^\s*\d+\s*$/);
            const before = page.url();
            await chrome.pressTop('user', /^\s*manager\.maya\b/);
            await expect(chrome.submenu('user', /^\s*manager\.maya\b/)).toBeVisible();
            await expect(chrome.submenuLinks('user', /^\s*manager\.maya\b/)).toHaveText([/^\s*Dashboard\b/, whole('View Profile'), whole('Logout')]);
            expect(page.url()).toBe(before);
            seenUserLists.manager = await chrome.submenuLinks('user', /^\s*manager\.maya\b/).allInnerTexts();
            await chrome.submenuLink('user', /^\s*manager\.maya\b/, /^\s*Dashboard\b/).click();
            await expect(page).toHaveURL(/\/dashboard\/editorial/);

            // The editorial header: the first Tab shows the two skip links;
            // the press's name at the left; the "i" icon, Tasks and the
            // initials at the right; the "i" icon opens "Learning OMP" in a
            // new tab (A1 aside); the initials open "Change Language" with
            // English ticked and français, then "Edit Profile" and "Logout"
            // (Rules 27, 27a–27c, 28; Settings bullet 12).
            await ed.waitReady();
            await page.keyboard.press('Tab');
            await expect(ed.skipButtons.first()).toBeFocused();
            await expect(ed.skipButtons).toHaveText([whole('Skip to main content'), whole('Skip to main navigation menu')]);
            await expect(ed.skipButtons.nth(0)).toBeVisible();
            await expect(ed.skipButtons.nth(1)).toBeVisible();
            await expect(ed.contextTitle).toHaveText(whole(PRESS_NAME));
            await expect(ed.helpLink).toBeVisible();
            await expect(ed.tasksButton).toBeVisible();
            await expect(ed.initialsButton).toBeVisible();
            await expect(ed.helpLink).toHaveAttribute('target', '_blank');
            const popupPromise = page.context().waitForEvent('page');
            await ed.helpLink.click();
            const popup = await popupPromise;
            await popup.waitForURL(HELP_URL, {waitUntil: 'commit'});
            expect(popup.url()).toBe(HELP_URL);
            await closeTab(popup);
            await ed.openUserMenu();
            expect(await ed.userMenuLines()).toEqual(['Change Language', 'English', 'français', 'Edit Profile', 'Logout']);
            await expect(ed.userMenuLink('English').locator('svg')).toHaveCount(1);
            await expect(ed.userMenuLink('français').locator('svg')).toHaveCount(0);
            await ed.closeUserMenu();

            // The side menu: its entries top to bottom; "Editor Dashboard"
            // opens with the box "Search submissions"; "Content" holds
            // "Catalog"; "Statistics" its six lines; "Settings" › "Website"
            // opens the group and highlights the entry (Rule 30).
            await expect.poll(() => ed.sideLabels()).toEqual(MANAGER_SIDE);
            const side = await ed.sideMenu();
            expect(side[0].items[0].input).toBe('Search submissions');
            expect(side.find((e) => e.label === 'Content').items.map((i) => i.label)).toEqual(['Catalog']);
            expect(side.find((e) => e.label === 'Statistics').items.map((i) => i.label)).toEqual(STATISTICS);
            for (const absent of ['Announcements', 'Institutions', 'Payments', 'Administration']) {
                expect(side.map((e) => e.label)).not.toContain(absent);
            }
            seenSides.manager = side.map((e) => e.label);
            await ed.chooseSideEntry('Settings', 'Website');
            await expect(page).toHaveURL(/\/management\/settings\/website/);
            await expect
                .poll(async () => {
                    const settings = (await ed.sideMenu()).find((e) => e.label === 'Settings');
                    return {open: settings.open, selected: settings.items.filter((i) => i.selected).map((i) => i.label)};
                })
                .toEqual({open: true, selected: ['Website']});
        });

        /** A role that opens the press's home page, presses the username and then "Dashboard". */
        async function viaPublicDashboard(username, landing) {
            const page = await actorPage(asUser, username);
            const chrome = new PublicChrome(page, PRESS, {locale: 'en'});
            await chrome.goto();
            await expect(chrome.userTopLinks).toHaveCount(1);
            await chrome.pressTop('user', new RegExp(`^\\s*${username.replace('.', '\\.')}\\b`));
            await expect(chrome.submenu('user', new RegExp(`^\\s*${username.replace('.', '\\.')}\\b`))).toBeVisible();
            const links = chrome.submenuLinks('user', new RegExp(`^\\s*${username.replace('.', '\\.')}\\b`));
            await expect(links).toHaveText([/^\s*Dashboard\b/, whole('View Profile'), whole('Logout')]);
            seenUserLists[username] = await links.allInnerTexts();
            await links.first().click();
            await expect(page).toHaveURL(landing);
            return page;
        }

        await test.step('the Funding coordinator (assistant)', async () => {
            const page = await viaPublicDashboard('assistant.rita', /\/dashboard\/editorial/);
            const ed = new EditorialChrome(page);
            await expect.poll(() => ed.sideLabels()).toEqual(['Editor Dashboard', 'Start A New Submission']);
            seenSides.assistant = await ed.sideLabels();
        });

        await test.step('the Series editor', async () => {
            // Signing in lands on the Dashboard (the landing of U22).
            const page = await actorPage(asUser, 'sectioneditor.ana');
            await page.goto(`/index.php/${PRESS}/en/submissions`);
            await expect(page).toHaveURL(/\/dashboard\/editorial/);
            const ed = new EditorialChrome(page);
            await expect.poll(() => ed.sideLabels()).toEqual(['Editor Dashboard', 'Start A New Submission', 'Statistics']);
            const stats = await ed.sideGroupItems('Statistics');
            expect(stats).toEqual(STATISTICS.filter((s) => s !== 'Reports'));
            seenSides.sectionEditor = await ed.sideLabels();
        });

        await test.step('the Author', async () => {
            const page = await viaPublicDashboard('author.alex', /\/dashboard\/mySubmissions/);
            const ed = new EditorialChrome(page);
            await expect.poll(() => ed.sideLabels()).toEqual(['My Submissions as Author', 'Start A New Submission']);
            seenSides.author = await ed.sideLabels();
        });

        await test.step('the Reviewer', async () => {
            const page = await viaPublicDashboard('reviewer.julia', /\/dashboard\/reviewAssignments/);
            const ed = new EditorialChrome(page);
            await expect.poll(() => ed.sideLabels()).toEqual(['My Assignments as Reviewer', 'Start A New Submission']);
            seenSides.reviewer = await ed.sideLabels();
        });

        await test.step('the Reader', async () => {
            const page = await viaPublicDashboard('reader.rosa', /\/user\/profile/);
            const ed = new EditorialChrome(page);
            await expect.poll(() => ed.sideLabels()).toEqual(['Start A New Submission']);
            seenSides.reader = await ed.sideLabels();
        });

        // Control: no username list held "Administration"; only the Press
        // Manager's side menu held "Settings", "DOIs" and "Tools" (Rules 18, 30).
        for (const [who, list] of Object.entries(seenUserLists)) {
            expect(list.map((s) => s.trim()), who).not.toContain('Administration');
            expect(list.length, who).toBe(3);
        }
        for (const [who, labels] of Object.entries(seenSides)) {
            for (const entry of ['Settings', 'DOIs', 'Tools']) {
                if (who === 'manager') expect(labels, who).toContain(entry);
                else expect(labels, who).not.toContain(entry);
            }
        }
    });

    test("S3: the seeded press's Navigation tab", async ({asUser}) => {
        test.slow();
        const page = await actorPage(asUser, 'manager.maya');
        const nav = new NavigationTab(page, PRESS, {locale: 'en'});
        await nav.goto();

        // The menus table: "Navigation" with "Add Menu", the two installed
        // menus in either order, their items cells (Rules 2, 3, 3a).
        await expect(nav.tableHeading('menus')).toHaveText(whole('Navigation'));
        await expect(nav.addMenuLink).toBeVisible();
        await expect.poll(async () => sorted(await nav.rowTitles('menus'))).toEqual(['Primary Navigation Menu', 'User Navigation Menu']);
        expect(await nav.menuItemsSet('Primary Navigation Menu')).toEqual(PRIMARY_CELL.split(', ').sort());
        expect(await nav.menuItemsSet('User Navigation Menu')).toEqual(userCell('manager.maya').split(', ').sort());

        // The items table: "Navigation Menu Items" with "Add item", sixteen
        // items: those of both menus, the username item under the
        // manager's username, and "Search" (Rules 2, 10).
        await expect(nav.tableHeading('items')).toHaveText(whole('Navigation Menu Items'));
        await expect(nav.addItemLink).toBeVisible();
        await expect.poll(async () => sorted(await nav.rowTitles('items'))).toEqual(sorted(allItems('manager.maya')));
        expect(allItems('manager.maya')).toHaveLength(16);

        // A row's arrow: "Edit" and "Remove" under the row (Fields).
        const controls = await nav.openRowControls('menus', 'Primary Navigation Menu');
        await expect(controls.getByRole('link', {name: 'Edit', exact: true})).toBeVisible();
        await expect(controls.getByRole('link', {name: 'Remove', exact: true})).toBeVisible();

        // The menu window: "Edit", the strip atop it, "Title", the area, the
        // two panels (Rules 2, 4, 27).
        const win = await nav.openMenu('Primary Navigation Menu');
        await expect(win.heading).toHaveText(whole('Edit'));
        await expect(win.stripHelpLink).toBeVisible();
        await expect(win.stripTasksButton).toBeVisible();
        await expect(win.stripInitialsButton).toBeVisible();
        await expect(win.titleInput).toHaveValue('Primary Navigation Menu');
        await expect(win.areaSelect).toHaveValue('primary');
        await expect.poll(() => win.outline('assigned')).toEqual(PRIMARY_OUTLINE);
        expect(sorted(await win.titles('unassigned'))).toEqual(sorted(userItems('manager.maya').concat('Search')));

        // The eye: on every item with a condition, on none of the others;
        // its notice for "Announcements" (Rules 7, 7a; item types table).
        const withEye = [...(await win.titlesWithIcon('assigned', 'eye')), ...(await win.titlesWithIcon('unassigned', 'eye'))];
        expect(sorted(withEye)).toEqual(
            sorted(['Announcements', 'About', 'About the Press', 'Privacy Statement', 'Contact', ...userItems('manager.maya')])
        );
        for (const none of ['Catalog', 'Submissions', 'Editorial Masthead', 'Search']) {
            expect(withEye).not.toContain(none);
        }
        await win.eyeIcon('assigned', 'Announcements').click();
        const eyeNotice = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').filter({hasText: ANNOUNCEMENTS_NOTICE}).last();
        await expect(eyeNotice).toBeVisible();
        await expect(eyeNotice).toContainText('Notice');
        await eyeNotice.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(eyeNotice).toBeHidden();

        // The warning: on "About" (the username item, unassigned here,
        // carries the eye alone: T-omp-2); its notice (Rule 7b).
        const withWarning = [...(await win.titlesWithIcon('assigned', 'warning')), ...(await win.titlesWithIcon('unassigned', 'warning'))];
        expect(sorted(withWarning)).toEqual(['About']);
        await win.warningIcon('assigned', 'About').click();
        const warnNotice = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').filter({hasText: WARNING_NOTICE_START}).last();
        await expect(warnNotice).toBeVisible();
        await expect(warnNotice).toContainText('Notice');
        await warnNotice.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(warnNotice).toBeHidden();

        // Control: "Cancel" closes the window at once, nothing having
        // changed, and both tables read as before (Rule 6).
        await win.cancelButton.click();
        await expect(win.editor).toBeHidden();
        await expect(win.warningDialog).toHaveCount(0);
        await expect.poll(async () => sorted(await nav.rowTitles('menus'))).toEqual(['Primary Navigation Menu', 'User Navigation Menu']);
        expect(await nav.menuItemsSet('Primary Navigation Menu')).toEqual(PRIMARY_CELL.split(', ').sort());
        expect(sorted(await nav.rowTitles('items'))).toEqual(sorted(allItems('manager.maya')));
    });

    test('S4: put a new link in the primary menu', async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('4', testInfo);
        const manager = await seedPress(ompApi, tag);
        const page = await actorPage(asUser, manager);
        const nav = new NavigationTab(page, tag);
        const home = new PublicChrome(visitor, tag);
        await home.goto();
        await nav.goto();

        // The item: "Add item", "Save" and no "Cancel"; "Our news", "Remote
        // URL", https://pkp.sfu.ca; saved (Fields; Rule 11).
        const item = await nav.addItem();
        await expect(item.heading).toHaveText(whole('Add item'));
        await expect(item.saveButton).toBeVisible();
        await expect(item.cancelButton).toHaveCount(0);
        await item.titleInput().fill('Our news');
        await item.chooseType('Remote URL');
        await item.urlInput().fill('https://pkp.sfu.ca');
        const saved = await item.save();
        expect(saved.body && saved.body.status).toBe(true);
        await expect(item.form).toBeHidden();
        await expect(nav.notice(ITEM_ADDED)).toBeVisible();
        await expect(nav.row('items', 'Our news')).toHaveCount(1);

        // Outside every menu: "Our news" waits in "Unassigned Menu Items" (Rule 11).
        let win = await nav.openMenu('Primary Navigation Menu');
        await expect.poll(() => win.titles('unassigned')).toContain('Our news');
        expect(await win.titles('assigned')).not.toContain('Our news');

        // Two levels at most: "Our news" onto "Catalog" sits under it;
        // "Search" onto "Our news" does not sit under it; "About" onto
        // "Announcements" does not go under it (Rules 5, 5a).
        await win.drag('unassigned', 'Our news', {panel: 'assigned', item: 'Catalog'});
        await expect.poll(async () => (await win.outline('assigned')).slice(0, 2)).toEqual(['Catalog', '  Our news']);
        await win.drag('unassigned', 'Search', {panel: 'assigned', item: 'Our news'});
        await expect
            .poll(async () => {
                const {items} = await win.read('assigned');
                return {deeper: items.filter((i) => i.level > 1).map((i) => i.title), ourNews: items.find((i) => i.title === 'Our news')?.level};
            })
            .toEqual({deeper: [], ourNews: 1});
        await win.drag('assigned', 'About', {panel: 'assigned', item: 'Announcements'});
        await expect
            .poll(async () => {
                const {items} = await win.read('assigned');
                const at = items.findIndex((i) => i.title === 'Announcements');
                return {about: items.find((i) => i.title === 'About')?.level, underAnnouncements: items[at + 1] && items[at + 1].level > 0 ? items[at + 1].title : null};
            })
            .toEqual({about: 0, underAnnouncements: null});

        // Discarded: "Cancel" asks "Warning"; "Yes" closes; reopened, the
        // menu reads as installed and "Our news" is unassigned again (Rule 6).
        await win.cancelButton.click();
        await expect(win.warningDialog).toBeVisible();
        await expect(win.warningDialog).toContainText('Warning');
        await win.warningDialog.getByRole('button', {name: 'Yes', exact: true}).click();
        await expect(win.editor).toBeHidden();
        win = await nav.openMenu('Primary Navigation Menu');
        await expect.poll(() => win.outline('assigned')).toEqual(PRIMARY_OUTLINE);
        expect(await win.titles('unassigned')).toContain('Our news');

        // Asked, then kept: dragged again, "Cancel", "No": the window stays,
        // "Our news" under "Catalog", no red warning on "Catalog" (Rules 6, 7b).
        await win.drag('unassigned', 'Our news', {panel: 'assigned', item: 'Catalog'});
        await expect.poll(async () => (await win.outline('assigned')).slice(0, 2)).toEqual(['Catalog', '  Our news']);
        await win.cancelButton.click();
        await expect(win.warningDialog).toBeVisible();
        await win.warningDialog.getByRole('button', {name: 'No', exact: true}).click();
        await expect(win.warningDialog).toBeHidden();
        await expect(win.editor).toBeVisible();
        expect((await win.outline('assigned')).slice(0, 2)).toEqual(['Catalog', '  Our news']);
        await expect(win.warningIcon('assigned', 'Catalog')).toHaveCount(0);
        await expect(win.warningIcon('assigned', 'About')).toBeVisible();

        // Control, after "No" and before "Save": the visitor's reloaded home
        // page shows "Catalog" with no list and no "Our news" (Rule 6).
        await home.reload();
        await expect(home.topLink('primary', 'Catalog')).toBeVisible();
        await expect(home.submenu('primary', 'Catalog')).toHaveCount(0);
        await expect(home.header.getByRole('link', {name: 'Our news'})).toHaveCount(0);

        // Saved: the notice, the primary menu's cell names "Our news";
        // reopened, "Catalog" carries the red warning (Rules 6, 7b).
        await win.save();
        await expect(nav.notice(MENU_UPDATED)).toBeVisible();
        await expect.poll(() => nav.menuItemsCell('Primary Navigation Menu')).toContain('Our news');
        win = await nav.openMenu('Primary Navigation Menu');
        await expect.poll(() => win.outline('assigned')).toEqual(['Catalog', '  Our news', ...PRIMARY_OUTLINE.slice(1)]);
        await expect(win.warningIcon('assigned', 'Catalog')).toBeVisible();
        await win.cancelButton.click();
        await expect(win.editor).toBeHidden();

        // The visitor's header: pointing at "Catalog" opens a list with "Our
        // news"; pressing "Catalog" opens no page; "Our news" leaves, in the
        // same tab, for https://pkp.sfu.ca (Rules 11, 16; item types table).
        await home.reload();
        await home.pointAt('primary', 'Catalog');
        await expect(home.submenu('primary', 'Catalog')).toBeVisible();
        await expect(home.submenuLinks('primary', 'Catalog')).toHaveText([whole('Our news')]);
        const homeUrl = visitor.url();
        await home.pressTop('primary', 'Catalog');
        expect(visitor.url()).toBe(homeUrl);
        await expect(home.submenu('primary', 'Catalog')).toBeVisible();
        const pagesBefore = visitor.context().pages().length;
        await home.submenuLink('primary', 'Catalog', 'Our news').click();
        await visitor.waitForURL(PKP_URL, {waitUntil: 'commit'});
        expect(visitor.url()).toBe(PKP_URL);
        expect(visitor.context().pages().length).toBe(pagesBefore);

        // Edited: "Edit" window, "PKP news", saved; "Navigation Menu Items"
        // lists "PKP news" once and no longer "Our news", in no fixed place
        // (Rules 10, 11). The visitor's list holds "PKP news" after a reload
        // (Rule 11).
        const edit = await nav.editItem('Our news');
        await expect(edit.heading).toHaveText(whole('Edit'));
        await expect(edit.titleInput()).toHaveValue('Our news');
        await edit.titleInput().fill('PKP news');
        const renamed = await edit.save();
        expect(renamed.body && renamed.body.status).toBe(true);
        await expect(nav.notice(ITEM_UPDATED)).toBeVisible();
        await expect(nav.row('items', 'PKP news')).toHaveCount(1);
        await expect(nav.row('items', 'Our news')).toHaveCount(0);
        await home.goto();
        await home.pointAt('primary', 'Catalog');
        await expect(home.submenuLinks('primary', 'Catalog')).toHaveText([whole('PKP news')]);
    });

    test('S5: the item window refuses a save', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('5', testInfo);
        const manager = await seedPress(ompApi, tag);
        const page = await actorPage(asUser, manager);
        const nav = new NavigationTab(page, tag);
        await nav.goto();

        // No title: "This field is required." under "Title"; the window stays (Fields).
        let item = await nav.addItem();
        await item.chooseType('Remote URL');
        await item.urlInput().fill('https://pkp.sfu.ca');
        await item.saveButton.click();
        await expect(item.fieldError(REQUIRED)).toBeVisible();
        await expect(item.form).toBeVisible();

        // No type: the window stays and nothing is stored (Fields; A11, A12
        // not asserted).
        await item.titleInput().fill('Our page');
        await item.chooseType('Choose a type...');
        let answer = await item.save();
        expect(answer.body && answer.body.status).toBe(false);
        await expect(item.form).toBeVisible();

        // Not a web address: the window stays (Fields).
        await item.chooseType('Remote URL');
        await item.urlInput().fill('pkp.sfu.ca');
        answer = await item.save();
        expect(answer.body && answer.body.status).toBe(false);
        await expect(item.form).toBeVisible();

        // A path with other characters: the window stays (Fields).
        await item.chooseType('Custom Page');
        await item.pathInput.fill('my page');
        answer = await item.save();
        expect(answer.body && answer.body.status).toBe(false);
        await expect(item.form).toBeVisible();

        // A path accepted: the window closes, the notice, "Our page" listed
        // (Fields; Rule 11).
        await item.pathInput.fill('our-page');
        answer = await item.save();
        expect(answer.body && answer.body.status).toBe(true);
        await expect(item.form).toBeHidden();
        await expect(nav.notice(ITEM_ADDED)).toBeVisible();
        await expect(nav.row('items', 'Our page')).toHaveCount(1);

        // A path already used: the window stays; its back arrow, answered
        // "OK" if the browser asks, closes it (Fields; Rule 11a).
        item = await nav.addItem();
        await item.titleInput().fill('Second page');
        await item.chooseType('Custom Page');
        await item.pathInput.fill('our-page');
        answer = await item.save();
        expect(answer.body && answer.body.status).toBe(false);
        await expect(item.form).toBeVisible();
        await item.close({accept: true});
        await expect(item.form).toBeHidden();

        // Control: "Our page" once, no "Second page": no refused save
        // stored anything (Fields).
        await nav.goto();
        await expect.poll(async () => (await nav.rowTitles('items')).filter((t) => t === 'Our page').length).toBe(1);
        expect(await nav.rowTitles('items')).not.toContain('Second page');
        expect((await nav.rowTitles('items')).length).toBe(17);
    });

    test('S6: add a menu, remove the primary one, and fill its area', async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('6', testInfo);
        const manager = await seedPress(ompApi, tag);
        const page = await actorPage(asUser, manager);
        const nav = new NavigationTab(page, tag);
        const home = new PublicChrome(visitor, tag);
        await home.goto();
        await nav.goto();

        // The new window: "Add Menu", area "None", every item unassigned,
        // the assigned panel's text (Fields; Rule 4).
        let win = await nav.addMenu();
        await expect(win.heading).toHaveText(whole('Add Menu'));
        await expect(win.areaSelect.locator('option:checked')).toHaveText(whole('None'));
        await expect.poll(async () => sorted(await win.titles('unassigned'))).toEqual(sorted(allItems(manager)));
        expect(await win.read('assigned')).toEqual({items: [], text: NO_ITEMS_ASSIGNED});

        // No title: the message, the foot's summary and "Jump to next
        // error"; "Save" greyed until "Title" changes (Fields).
        await win.saveButton.click();
        await expect(win.fieldError(REQUIRED)).toBeVisible();
        await expect(win.errorSummary).toBeVisible();
        await expect(win.errorSummary).toContainText('Please correct one error.');
        await expect(win.jumpToError).toBeVisible();
        await expect(win.saveButton).toBeDisabled();

        // A title in use: its message and the page notice (Fields).
        await win.titleInput.fill('Primary Navigation Menu');
        await expect(win.saveButton).toBeEnabled();
        await win.saveButton.click();
        await expect(win.fieldError('This title already exists for another navigation menu.')).toBeVisible();
        await expect(page.getByText(FORM_NOT_SAVED).first()).toBeVisible();

        // An area in use: its message, the same page notice (Fields).
        await win.titleInput.fill('Footer links');
        await win.areaSelect.selectOption('primary');
        await win.saveButton.click();
        await expect(win.fieldError('A navigation menu is already assigned to this area.')).toBeVisible();
        await expect(page.getByText(FORM_NOT_SAVED).first()).toBeVisible();

        // Saved at "None" with "Search": the notice, the row "Footer links"
        // reading "Search"; the visitor's header unchanged, one "Search"
        // (Rules 6, 8, 17).
        await win.areaSelect.selectOption({label: 'None'});
        await win.drag('unassigned', 'Search', {panel: 'assigned'});
        await expect.poll(() => win.outline('assigned')).toEqual(['Search']);
        await win.save();
        await expect(nav.notice(MENU_ADDED)).toBeVisible();
        await expect.poll(() => nav.rowTitles('menus')).toContain('Footer links');
        expect(await nav.menuItemsCell('Footer links')).toBe('Search');
        await home.reload();
        await expect(home.primaryTopLinks).toHaveText([whole('Catalog'), whole('About')]);
        await expect(home.header.getByRole('link', {name: 'Search'})).toHaveCount(1);
        await expect(home.searchLink).toBeVisible();

        // "Remove", then "Cancel": the window's question; the row stays (Rule 9).
        await nav.openRemove('menus', 'Primary Navigation Menu');
        await expect(nav.removeDialog()).toContainText(REMOVE_QUESTION);
        await expect(nav.removeDialog()).toContainText('Remove');
        await expect(nav.removeDialogButton('OK')).toBeVisible();
        await nav.removeDialogButton('Cancel').click();
        await expect(nav.removeDialog()).toHaveCount(0);
        await expect(nav.row('menus', 'Primary Navigation Menu')).toHaveCount(1);

        // Removed: the notice, the row gone, "Catalog" and "About" kept as
        // items; the visitor's header has no primary links and nothing in
        // their place, and keeps "Search" and the user menu (Rules 8, 9, 15).
        await nav.openRemove('menus', 'Primary Navigation Menu');
        await nav.removeDialogButton('OK').click();
        await expect(nav.notice(MENU_REMOVED)).toBeVisible();
        await expect(nav.row('menus', 'Primary Navigation Menu')).toHaveCount(0);
        expect(sorted(await nav.rowTitles('menus'))).toEqual(['Footer links', 'User Navigation Menu']);
        const items = await nav.rowTitles('items');
        expect(items).toContain('Catalog');
        expect(items).toContain('About');
        await home.reload();
        await expect(home.searchLink).toBeVisible();
        await expect(home.primaryTopLinks).toHaveCount(0);
        await expect(home.header.locator('.pkp_navigation_primary_wrapper a')).toHaveText([whole('Search')]);
        await expect(home.userTopLinks).toHaveText([whole('Register'), whole('Login')]);

        // The area filled again: "Footer links" to "primary"; the visitor
        // sees the menu's "Search" where the primary menu was, then the
        // header's own (Rules 8, 17).
        win = await nav.openMenu('Footer links');
        await win.areaSelect.selectOption('primary');
        await win.save();
        await expect(nav.notice(MENU_UPDATED)).toBeVisible();
        await home.reload();
        await expect(home.primaryTopLinks).toHaveText([whole('Search')]);
        await expect(home.header.locator('.pkp_navigation_primary_wrapper a')).toHaveText([whole('Search'), whole('Search')]);
        await expect(home.header.locator('.pkp_navigation_primary_wrapper a').last()).toHaveClass(/pkp_search/);

        // Control: the seeded press's home page still shows its primary menu (Rule 1).
        const seeded = new PublicChrome(visitor, PRESS, {locale: 'en'});
        await seeded.goto();
        await expect(seeded.primaryTopLinks).toHaveText([whole('Catalog'), whole('About')]);
    });

    test('S7: remove an item that has items under it', async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('7', testInfo);
        const manager = await seedPress(ompApi, tag);
        const page = await actorPage(asUser, manager);
        const nav = new NavigationTab(page, tag);
        const home = new PublicChrome(visitor, tag);
        await home.goto();
        await home.pointAt('primary', 'About');
        await expect(home.submenuLinks('primary', 'About')).toHaveText(ABOUT_CHILDREN.map(whole));
        await nav.goto();

        // Removed: the question, "OK", the notice, "About" out of the table (Rule 13).
        await nav.openRemove('items', 'About');
        await expect(nav.removeDialog()).toContainText(REMOVE_QUESTION);
        await nav.removeDialogButton('OK').click();
        await expect(nav.notice(ITEM_REMOVED)).toBeVisible();
        await expect(nav.row('items', 'About')).toHaveCount(0);

        // The menu window: "Catalog" and "Announcements" assigned; the five
        // former sub-items among the unassigned (Rule 13).
        const win = await nav.openMenu('Primary Navigation Menu');
        await expect.poll(() => win.outline('assigned')).toEqual(['Catalog', 'Announcements']);
        const unassigned = await win.titles('unassigned');
        for (const child of ABOUT_CHILDREN) expect(unassigned).toContain(child);
        await win.cancelButton.click();
        await expect(win.editor).toBeHidden();

        // The visitor's header: "Catalog" alone, no "About", no list (Rule 13).
        await home.reload();
        await expect(home.primaryTopLinks).toHaveText([whole('Catalog')]);
        await expect(home.topLink('primary', 'About')).toHaveCount(0);
        await expect(home.primaryMenu.locator('ul')).toHaveCount(0);

        // Control: the other items stay, "About the Press" and "Contact" among them (Rule 13).
        const items = await nav.rowTitles('items');
        expect(sorted(items)).toEqual(sorted(allItems(manager).filter((t) => t !== 'About')));
        expect(items).toContain('About the Press');
        expect(items).toContain('Contact');
    });

    test('S9: the presses switcher, and a press where the user holds no role', async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('9', testInfo);
        const first = `${tag}a`;
        const second = `${tag}b`;
        const firstName = `First press ${tag}`;
        const secondName = `Second press ${tag}`;
        const author = `${tag}au`;
        await ompApi.createContext({
            tag: first,
            context: {name: {en: firstName}},
            users: [{username: author, givenName: 'Ada', familyName: 'Author', email: `${author}@mail.test`, roles: ['author']}],
        });
        await ompApi.createContext({tag: second, context: {name: {en: secondName}}});

        // No role in the second press: "View Profile" from its header opens
        // the Profile page with the editorial header and no side menu; the
        // bar: the sitemap icon, the press's name linking home, the "i"
        // icon, Tasks, the initials with "Edit Profile" and "Logout" alone
        // (Actors rows 6, 8; Rules 27, 27a, 27b, 28).
        const page = await actorPage(asUser, author);
        const pub = new PublicChrome(page, second);
        const ed = new EditorialChrome(page);
        await pub.goto();
        await pub.pressTop('user', new RegExp(`^\\s*${author}\\b`));
        await pub.submenuLink('user', new RegExp(`^\\s*${author}\\b`), 'View Profile').click();
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${second}/user/profile`));
        await ed.waitReady();
        await expect(ed.sideNav).toHaveCount(0);
        await expect(ed.switcherButton).toBeVisible();
        await expect(ed.contextTitle).toHaveText(whole(secondName));
        await expect(ed.contextTitle).toHaveAttribute('href', new RegExp(`/index\\.php/${second}/index$`));
        await expect(ed.helpLink).toBeVisible();
        await expect(ed.tasksButton).toBeVisible();
        await ed.openUserMenu();
        expect(await ed.userMenuLines()).toEqual(['Edit Profile', 'Logout']);
        await ed.closeUserMenu();

        // The Author's switcher: the first press alone, by name; it opens
        // the first press's My Submissions (Rules 29, 29a).
        await ed.openSwitcher();
        expect(await ed.switcherNames()).toEqual([firstName]);
        await ed.switcherLink(firstName).click();
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${first}/dashboard/mySubmissions`));

        // Nothing to switch to: no sitemap icon on the first press's My
        // Submissions (Rule 29); control: the side menu there (Rule 30).
        await ed.waitReady();
        await expect(ed.contextTitle).toHaveText(whole(firstName));
        await expect(ed.switcher).toHaveCount(0);
        await expect.poll(() => ed.sideLabels()).toEqual(['My Submissions as Author', 'Start A New Submission']);

        // The Site Administrator's switcher on the first press's Settings ›
        // Website: the second press and the seeded press, not the first;
        // the second's Settings › Website opens. From "Edit Profile", the
        // first press in the list opens its Dashboard (Rules 29, 29a).
        const admin = await actorPage(asUser, 'admin');
        const aed = new EditorialChrome(admin);
        await admin.goto(`/index.php/${first}/management/settings/website`);
        await aed.waitReady();
        await aed.openSwitcher();
        const names = await aed.switcherNames();
        expect(names).toContain(secondName);
        expect(names).toContain(PRESS_NAME);
        expect(names).not.toContain(firstName);
        await aed.switcherLink(secondName).click();
        await expect(admin).toHaveURL(new RegExp(`/index\\.php/${second}/management/settings/website`));
        await aed.waitReady();
        await expect(aed.contextTitle).toHaveText(whole(secondName));
        await aed.openUserMenu();
        await aed.userMenuLink('Edit Profile').click();
        await expect(admin).toHaveURL(/\/user\/profile/);
        await aed.waitReady();
        await aed.openSwitcher();
        await aed.switcherLink(firstName).click();
        await expect(admin).toHaveURL(new RegExp(`/index\\.php/${first}/dashboard/editorial`));

        // "Administration": the Site Administrator's username list on the
        // first press holds it; it opens the Administration page (Rule 18).
        const apub = new PublicChrome(admin, first);
        await apub.goto();
        const adminTop = /^\s*admin\b/;
        await apub.pressTop('user', adminTop);
        await expect(apub.submenuLinks('user', adminTop)).toHaveText([/^\s*Dashboard\b/, whole('View Profile'), whole('Administration'), whole('Logout')]);
        await apub.submenuLink('user', adminTop, 'Administration').click();
        await expect(admin).toHaveURL(/\/index\.php\/index(\/en)?\/admin/);
        await expect(admin.locator('main h1, .app__page h1').first()).toHaveText(whole('Administration'));

        // A press's settings address at the site's level: the first press's
        // Settings › Website again, its path replaced by "index" in the
        // address: the access-denied page with "No press was found that
        // matched your request." in place of the role sentence (Rules 26a,
        // 26c). Control: the press's own address opened the Website page.
        await admin.goto(`/index.php/${first}/management/settings/website`);
        await expect(admin).toHaveURL(new RegExp(`/index\\.php/${first}/management/settings/website`));
        await aed.waitReady();
        await expect(aed.contextTitle).toHaveText(whole(firstName));
        const siteLevel = pathOf(admin).replace(`/index.php/${first}/`, '/index.php/index/');
        expect(siteLevel).toBe('/index.php/index/management/settings/website');
        await admin.goto(siteLevel);
        await expectNoPressPage(admin, 'Site Administrator');

        // The visitor, signed out, at the same address: the site's Login
        // page; signing in there as the Author leads to the same page with
        // the same sentence (Rule 26c).
        await visitor.goto(siteLevel);
        await expect(visitor).toHaveURL(/\/index\.php\/index(\/en)?\/login\b/);
        const login = new LoginPage(visitor);
        await login.expectForm();
        await expect(visitor.getByText(NO_PRESS)).toHaveCount(0);
        await login.signIn(author, getPassword(author));
        await expectNoPressPage(visitor, 'the Author signed in from the Login page');
    });

    test('S10: page links on a list longer than a page', async ({asUser, ompApi, visitor}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('10', testInfo);
        const author = `${tag}au`;
        const manager = await seedPress(ompApi, tag, {
            users: [{username: author, givenName: 'Ada', familyName: 'Author', email: `${author}@mail.test`, roles: ['author']}],
        });
        for (let i = 1; i <= 3; i++) {
            await ompApi.createSubmission({tag: `${tag}b${i}`, context: tag, submitter: author, title: `Book ${i} ${tag}`, published: true});
        }
        const home = new PublicChrome(visitor, tag);
        const books = visitor.locator('.cmp_monographs_list .obj_monograph_summary');

        // Control, at 25: "Catalog" lists the three books on one page, with
        // no "Previous", no "Next" and no count (Rule 24).
        await home.goto();
        await home.topLink('primary', 'Catalog').click();
        await expect(home.heading).toHaveText(whole('Catalog'));
        await expect(books).toHaveCount(3);
        await expect(home.pagination).toHaveCount(0);
        await expect(visitor.getByRole('link', {name: 'Next', exact: true})).toHaveCount(0);
        await expect(visitor.getByRole('link', {name: 'Previous', exact: true})).toHaveCount(0);

        // "Items per page" 25 and "Page links" 10 on "Lists"; 1 saved
        // (Settings bullet 16).
        const page = await actorPage(asUser, manager);
        await page.goto(`/index.php/${tag}/management/settings/website`);
        await page.locator('#setup-button').first().click();
        await page.getByRole('tab', {name: 'Lists', exact: true}).filter({visible: true}).first().click();
        const perPage = page.locator('input[name="itemsPerPage"]:visible').first();
        const pageLinks = page.locator('input[name="numPageLinks"]:visible').first();
        await expect(perPage).toHaveValue('25');
        await expect(pageLinks).toHaveValue('10');
        await perPage.fill('1');
        const form = page.locator('form').filter({has: perPage}).first();
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        await expect(form.locator('[role="status"]').filter({hasText: 'Saved'})).toBeVisible();

        // Page by page: one book, "1-1 of 3" and "Next"; "Next": "Previous",
        // "2-2 of 3", "Next"; "Next": "Previous", "3-3 of 3"; "Previous":
        // "2-2 of 3" again (Rule 24).
        await home.goto();
        await home.topLink('primary', 'Catalog').click();
        await expect(books).toHaveCount(1);
        await expect(home.pageCount()).toHaveText(whole('1-1 of 3'));
        await expect(home.nextLink).toHaveText(whole('Next'));
        await expect(home.previousLink).toHaveCount(0);
        await home.nextLink.click();
        await expect(home.pageCount()).toHaveText(whole('2-2 of 3'));
        await expect(books).toHaveCount(1);
        await expect(home.previousLink).toHaveText(whole('Previous'));
        await expect(home.nextLink).toHaveText(whole('Next'));
        await home.nextLink.click();
        await expect(home.pageCount()).toHaveText(whole('3-3 of 3'));
        await expect(books).toHaveCount(1);
        await expect(home.previousLink).toBeVisible();
        await expect(home.nextLink).toHaveCount(0);
        await home.previousLink.click();
        await expect(home.pageCount()).toHaveText(whole('2-2 of 3'));
        await expect(home.previousLink).toBeVisible();
        await expect(home.nextLink).toBeVisible();
    });

    test('S11: the "Developed By" block', async ({ompApi, visitor}, testInfo) => {
        test.slow();
        const tag = makeTag('11', testInfo);
        const control = `${tag}c`;
        const placed = `${tag}p`;
        const plugins = {developedbyblockplugin: {enabled: true}};
        await seedPress(ompApi, control, {plugins});
        await seedPress(ompApi, placed, {plugins, sidebar: ['developedbyblockplugin']});

        // Control, before the block is placed: the plugin enabled alone
        // puts no "Open Monograph Press" link in the sidebar (Rule 21).
        const before = new PublicChrome(visitor, control);
        await before.goto();
        await expect(before.footerBrandLink).toBeVisible();
        await expect(before.developedByLink(APP_NAME)).toHaveCount(0);
        await expect(visitor.locator('.block_developed_by')).toHaveCount(0);

        // Every page: placed, the sidebar holds the link to PKP's page about
        // the application after the hidden heading "Developed By", on the
        // home page, "About the Press" and the Search page (Rule 21).
        const chrome = new PublicChrome(visitor, placed);
        for (const [where, path] of [['home', ''], ['About the Press', '/about'], ['Search', '/search']]) {
            await test.step(where, async () => {
                await chrome.goto(path);
                const block = chrome.sidebar.locator('.block_developed_by');
                await expect(block).toHaveCount(1);
                const link = chrome.developedByLink(APP_NAME);
                await expect(link).toBeVisible();
                await expect(link).toHaveAttribute('href', 'https://pkp.sfu.ca/omp/');
                const heading = block.getByRole('heading', {name: 'Developed By', exact: true});
                await expect(heading).toHaveCount(1);
                await expect(heading).toHaveClass(/pkp_screen_reader/);
                expect(await block.evaluate((b) => {
                    const h = b.querySelector('h2');
                    const a = b.querySelector('a');
                    return !!(h.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
                })).toBe(true);
            });
        }
    });
});
