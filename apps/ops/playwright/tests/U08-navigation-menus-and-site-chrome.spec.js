// @ts-check
/**
 * @file playwright/tests/U08-navigation-menus-and-site-chrome.spec.js
 *
 * Navigation menus & site chrome — OPS suite, one test per canonical
 * scenario the spec runs on a preprint server, in the server's own words
 * ("About the Server", "Preprints", "Server", "Open Preprint Systems"):
 * the common scenarios 1–7 and 9–11, with scenario 10's preprint trail
 * {OPS}. Scenario 8 changes the site's own items, which every test on the
 * fleet shares, and runs alone in serial/U08-navigation-menus-and-site-chrome.spec.js
 * (`@solo`). Scenario 2's Reviewer bullet is {OJS OMP}: a preprint server
 * has no Reviewer, and its assistant is the Editorial Board Member; the
 * primary menu of a preprint server is "Announcements", "Archives",
 * "About", and a new server's "Content" group is absent (OPS1).
 * Spec: docs/specs/U08-navigation-menus-and-site-chrome.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: S2 presses the help icon by its `target=_blank` link, never by
 *   its name, and asserts the guide's address only.
 * - A11 ✅ (retired 2026-10-07: the refusal notices are a Planned assertion), A12 🐞: S5 asserts each refused save by the window staying
 *   open and nothing stored, never by the absence of a message or by the
 *   line under the type list.
 * - A13 🐞: S3 reads the warning's notice up to its first sentence; the
 *   rest speaks of a journal on a preprint server.
 * - A15 🐞: S4 and S7 read the "Navigation" cells after a reload only.
 * - A17 ✅ (retired 2026-10-07), A18 🐞: every browser question is accepted by a handler; S5
 *   reads the item window's question after a change was typed only.
 * - OPS1 ✅: S2 reads the manager's side menu without "Content", as the
 *   scenario states.
 * - A2–A10, A14, A16, A21–A24, OJS1, OPS2, OPS3: no scenario of this app
 *   presses them (A14 is S8's, in the serial file).
 *
 * Seeding: scenario endpoints only. S1–S3 read the seeded server
 * `publicknowledge` with roster accounts and change nothing there; every
 * other test seeds its own scratch server with throwaway accounts
 * (footnote y): S10 three posted preprints (`published: true`), S11 the
 * "Developed By" block plugin enabled (`plugins`) and, on a second server,
 * placed in the sidebar (`sidebar`). S10's "Items per page" is the
 * scenario's own action (Settings bullet 16) and is saved on screen.
 * Signed-out reads run in a browser context with an empty storage state
 * (patterns.md, parallel lesson 8); each actor gets its own `asUser`
 * context. Addresses outside the install that a press would open (PKP's
 * documentation, https://pkp.sfu.ca) are answered by a local stub, so no
 * test depends on an external service; the address itself is the claim.
 */
const {test, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {SettingsForm} = require('../../../../shared/playwright/pages/ContextIdentityPages.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');
const {
    whole,
    flat,
    PublicChrome,
    EditorialChrome,
    NavigationTab,
} = require('../../../../shared/playwright/pages/NavigationChromePages.js');
const {closeTab} = require('../../../../shared/playwright/support/tabs.js');

const T = 30_000;
const SERVER = 'publicknowledge';
const SERVER_NAME = 'Public Knowledge Preprint Server';
const ABOUT_ITEMS = ['About the Server', 'Submissions', 'Editorial Masthead', 'Privacy Statement', 'Contact'];
const PRIMARY_OUTLINE = ['Announcements', 'Archives', 'About', ...ABOUT_ITEMS.map((t) => `> ${t}`)];
const USER_ITEMS = (username) => ['Register', 'Login', username, 'Dashboard', 'View Profile', 'Administration', 'Logout'];
const ALL_ITEMS = (username) => [...PRIMARY_OUTLINE.map((t) => t.replace(/^> /, '')), ...USER_ITEMS(username), 'Search'];
const FOOTER_ALT = 'More information about this system, Platform and Workflow by OPS/PKP.';
const CHANGED = 'The data on this form has changed. Do you wish to continue without saving?';
const REMOVE_TEXT = 'Are you sure you wish to delete this item? This action cannot be undone.';
const LEARNING = 'https://docs.pkp.sfu.ca/learning-ops/en/';
const PKP = 'https://pkp.sfu.ca/';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u8${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for a scratch server (users.md: `<username>@mail.test`). */
function account(tag, suffix, givenName, familyName, roles) {
    return {username: `${tag}${suffix}`, givenName, familyName, email: `${tag}${suffix}@mail.test`, roles};
}

/** A signed-out browser page (no inherited storage state). */
async function signedOutPage(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'});
    return context.newPage();
}

/** Answer an outside address with a local stub page (no external service in a test). */
async function stubOutside(context, pattern) {
    await context.route(pattern, (route) =>
        route.fulfill({status: 200, contentType: 'text/html', body: '<html><body><h1>stub</h1></body></html>'})
    );
}

/** Accept every browser question on a page (A18; A17 retired) and keep their messages. */
function acceptDialogs(page) {
    const seen = [];
    page.on('dialog', async (dialog) => {
        seen.push(dialog.message());
        await dialog.accept().catch(() => {});
    });
    return seen;
}

/** The user menu's top-level entry of a signed-in user (the username carries the task count after it). */
function userTop(username) {
    return new RegExp(`^\\s*${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
}

/** Press the username in the user menu and wait for its list. */
async function openUserMenu(chrome, username) {
    await chrome.pressTop('user', userTop(username));
    await expect(chrome.submenuLinks('user', userTop(username)).first()).toBeVisible({timeout: T});
}

/** The labels of the open user-menu list, the unread count stripped from "Dashboard". */
async function userListLabels(chrome, username) {
    const links = chrome.submenuLinks('user', userTop(username));
    await expect(links.first()).toBeVisible({timeout: T});
    return links.evaluateAll((as) =>
        as.map((a) => {
            const c = a.cloneNode(true);
            c.querySelectorAll('.task_count').forEach((s) => s.remove());
            return c.textContent.replace(/\s+/g, ' ').trim();
        })
    );
}

/** The side menu's group labels once it has rendered. */
async function sideLabels(page) {
    const ed = new EditorialChrome(page);
    await ed.waitSideMenu();
    return ed.sideLabels();
}

/** A menu window panel's items top to bottom: {title, level, eye, warning}. */
async function panelItems(win, which) {
    return (await win.read(which)).items.map((i) => ({
        title: i.title,
        level: i.level,
        eye: i.icons.includes('eye'),
        warning: i.icons.includes('warning'),
    }));
}

/** A menu window panel's items as "title" (top level) and "> title" (one level down). */
async function outline(win, which) {
    return (await win.read(which)).items.map((i) => `${'> '.repeat(i.level)}${i.title}`);
}

test.describe('navigation menus & site chrome', () => {
    test('S1: a visitor moves around the seeded server', {tag: '@smoke'}, async ({browser, baseURL}) => {
        test.slow();
        const visitor = await signedOutPage(browser, baseURL);
        const chrome = new PublicChrome(visitor, SERVER, {locale: 'en'});

        // The header: the server's name as text, a link to this home page;
        // "Archives" and "About", no "Announcements" (announcements off);
        // "Search"; "Register" and "Login" at the top right (Rules 2, 15,
        // 15a, 17, 18).
        await chrome.goto();
        await expect(chrome.siteNameLink).toHaveText(whole(SERVER_NAME));
        await expect(chrome.siteNameLink).toHaveClass(/\bis_text\b/);
        expect(flat(await chrome.siteNameLink.getAttribute('href'))).toMatch(new RegExp(`/index\\.php/${SERVER}/en(/index)?$`));
        await expect(chrome.primaryTopLinks).toHaveText([whole('Archives'), whole('About')]);
        await expect(chrome.topLink('primary', 'Announcements')).toHaveCount(0);
        await expect(chrome.searchLink).toHaveText(whole('Search'));
        await expect(chrome.userTopLinks).toHaveText([whole('Register'), whole('Login')]);
        const box = async (loc) => (await loc.boundingBox()) || {x: -1, y: -1};
        const archivesBox = await box(chrome.topLink('primary', 'Archives'));
        const aboutBox = await box(chrome.topLink('primary', 'About'));
        const searchBox = await box(chrome.searchLink);
        expect(archivesBox.x).toBeLessThan(aboutBox.x);
        expect(aboutBox.x).toBeLessThan(searchBox.x);
        const viewport = visitor.viewportSize() || {width: 1280};
        for (const label of ['Register', 'Login']) {
            expect((await box(chrome.topLink('user', label))).x, `${label} at the top right`).toBeGreaterThan(viewport.width / 2);
        }
        const home = {name: flat(await chrome.siteNameLink.textContent()), primary: await chrome.topTitles('primary'), user: await chrome.topTitles('user')};

        // The "About" list: pointing at "About" opens it with the five
        // entries; pressed, with the pointer moved off the header, it stays
        // open and the page stays as it was; Escape closes it; pressed
        // again, it opens; Escape closes it (Rules 2, 16).
        const aboutList = chrome.submenu('primary', 'About');
        await expect(aboutList).toBeHidden();
        await chrome.pointAt('primary', 'About');
        await expect(aboutList).toBeVisible();
        await expect(chrome.submenuLinks('primary', 'About')).toHaveText(ABOUT_ITEMS.map(whole));
        const before = visitor.url();
        await chrome.pressTop('primary', 'About');
        await chrome.pointAway();
        await expect(aboutList).toBeVisible();
        expect(visitor.url()).toBe(before);
        // lint-ok: escape Rule 16 claims the key; the theme's list (no window around it) takes it on the page
        await visitor.keyboard.press('Escape');
        await expect(aboutList).toBeHidden();
        await chrome.pressTop('primary', 'About');
        await chrome.pointAway();
        await expect(aboutList).toBeVisible();
        expect(visitor.url()).toBe(before);
        // lint-ok: escape Rule 16 claims the key, as above
        await visitor.keyboard.press('Escape');
        await expect(aboutList).toBeHidden();

        // A page and its trail: "Home / About the Server", the last step
        // no link; "Home" opens the home page, which has no trail (Rule 23).
        await chrome.pressTop('primary', 'About');
        await chrome.submenuLink('primary', 'About', 'About the Server').click();
        await expect(chrome.heading).toHaveText(whole('About the Server'));
        expect(await chrome.trail()).toEqual(['Home', 'About the Server']);
        await expect(chrome.breadcrumbs.locator('li').last().getByRole('link')).toHaveCount(0);
        await expect(chrome.crumbLink('Home')).toHaveCount(1);
        const aboutPage = {name: flat(await chrome.siteNameLink.textContent()), primary: await chrome.topTitles('primary'), user: await chrome.topTitles('user')};
        await chrome.crumbLink('Home').click();
        await expect(visitor).toHaveURL(new RegExp(`/index\\.php/${SERVER}/en(/index)?$`));
        await expect(chrome.primaryTopLinks.first()).toBeVisible();
        await expect(chrome.breadcrumbs).toHaveCount(0);

        // The skip links on "About the Server": Tab shows "Skip to main
        // content", then "Skip to main navigation menu", then "Skip to site
        // footer"; Enter on it, then Tab: the focus is in the footer (Rule 22).
        await chrome.goto('/about');
        await expect(chrome.heading).toHaveText(whole('About the Server'));
        const skips = ['Skip to main content', 'Skip to main navigation menu', 'Skip to site footer'];
        for (const label of skips) {
            await visitor.keyboard.press('Tab');
            await expect(chrome.skipLinks.filter({hasText: whole(label)})).toBeFocused();
            await expect(chrome.skipLinks.filter({hasText: whole(label)})).toBeInViewport();
        }
        await visitor.keyboard.press('Enter');
        await visitor.keyboard.press('Tab');
        await expect.poll(async () => (await chrome.focused()).inFooter).toBe(true);

        // The footer: the logo read as the application's sentence; pressed,
        // the page about the publishing software (Rule 20).
        await expect(chrome.footerBrandImage).toHaveAttribute('alt', FOOTER_ALT);
        await chrome.footerBrandLink.click();
        await expect(chrome.heading).toHaveText(whole('About Open Preprint Systems'));

        // "Search" opens the Search page, whose header has no "Search" link;
        // the control: "About the Server" and the Search page carry the
        // same name, primary menu and user menu as the home page (Rules 15,
        // 17).
        await chrome.searchLink.click();
        await expect(visitor).toHaveURL(/\/search(\/search)?(\?|$)/);
        await expect(chrome.primaryTopLinks.first()).toBeVisible();
        await expect(chrome.searchLink).toHaveCount(0);
        const searchPage = {name: flat(await chrome.siteNameLink.textContent()), primary: await chrome.topTitles('primary'), user: await chrome.topTitles('user')};
        expect(aboutPage).toEqual(home);
        expect(searchPage).toEqual(home);
    });

    test('S2: each role\'s user menu, "Dashboard" and side menu', async ({browser, baseURL, asUser}) => {
        test.slow();
        test.setTimeout(300_000);
        const lists = {};
        const sideMenus = {};

        // The Preprint Server Manager's user menu: from the Dashboard, the
        // server's name in the editorial header opens its home page; the
        // username with the Tasks number (read as a number, as on OJS and
        // OMP: other tests' discussions on the seeded server give
        // `manager.maya` tasks, so "0" holds only on a fresh fleet);
        // pressed, "Dashboard", "View Profile", "Logout", the page
        // unchanged; "Dashboard" opens the Dashboard (Rules 18, 19a, 19b,
        // 27a).
        const managerContext = await asUser('manager.maya');
        const manager = await managerContext.newPage();
        const ed = new EditorialChrome(manager);
        await manager.goto(`/index.php/${SERVER}/en/dashboard/editorial`);
        await expect(ed.contextTitle).toHaveText(whole(SERVER_NAME));
        await ed.contextTitle.click();
        const pub = new PublicChrome(manager, SERVER, {locale: 'en'});
        await expect(manager).toHaveURL(new RegExp(`/index\\.php/${SERVER}(/en)?(/index)?$`));
        const username = pub.topLink('user', userTop('manager.maya'));
        await expect(username).toHaveText(/^\s*manager\.maya\s+\d+\s*$/);
        await expect(pub.taskCount(username)).toHaveText(/^\s*\d+\s*$/);
        const homeUrl = manager.url();
        await pub.pressTop('user', userTop('manager.maya'));
        lists.manager = await userListLabels(pub, 'manager.maya');
        expect(lists.manager).toEqual(['Dashboard', 'View Profile', 'Logout']);
        expect(manager.url()).toBe(homeUrl);
        await pub.submenuLink('user', userTop('manager.maya'), /^\s*Dashboard\b/).click();
        await expect(manager).toHaveURL(/\/dashboard\/editorial/);

        // The editorial header: Tab shows the two skip buttons; the dark
        // bar holds the server's name at the left and the "i" icon, the
        // Tasks bell and the initials at the right; the "i" icon opens
        // "Learning OPS" in a new tab (A1: pressed by its link, not its
        // name); the initials open "Change Language" with the two
        // interface languages, English ticked, then "Edit Profile" and
        // "Logout" (Rules 27, 27a–27c, 28).
        await expect(ed.initialsButton).toBeVisible({timeout: T});
        await manager.keyboard.press('Tab');
        await expect(ed.skipButtons.filter({hasText: 'Skip to main content'})).toBeFocused();
        await manager.keyboard.press('Tab');
        await expect(ed.skipButtons.filter({hasText: 'Skip to main navigation menu'})).toBeFocused();
        await expect(ed.contextTitle).toHaveText(whole(SERVER_NAME));
        const left = (await ed.contextTitle.boundingBox()).x;
        const helpX = (await ed.helpLink.boundingBox()).x;
        const tasksX = (await ed.tasksButton.boundingBox()).x;
        const initialsX = (await ed.initialsButton.boundingBox()).x;
        expect(left).toBeLessThan(helpX);
        expect(helpX).toBeLessThan(tasksX);
        expect(tasksX).toBeLessThan(initialsX);
        await stubOutside(managerContext, /docs\.pkp\.sfu\.ca/);
        const [guide] = await Promise.all([managerContext.waitForEvent('page'), ed.helpLink.click()]);
        await guide.waitForURL(LEARNING, {waitUntil: 'commit'});
        expect(guide.url()).toBe(LEARNING);
        await closeTab(guide);
        await ed.openUserMenu();
        const lines = await ed.userMenuItems();
        expect(lines.map((l) => l.text)).toEqual(['Change Language', 'English', 'français', 'Edit Profile', 'Logout']);
        expect(lines.find((l) => l.text === 'English').ticked).toBe(true);
        expect(lines.find((l) => l.text === 'français').ticked).toBe(false);
        await ed.closeUserMenu();

        // The manager's side menu, top to bottom, with no "Content",
        // "Announcements", "Institutions", "Payments" or "Administration";
        // "Statistics" holds the six entries; "Settings" › "Website" leaves
        // the group open and "Website" highlighted (Rule 30; OPS1).
        await ed.waitSideMenu();
        const menu = await ed.sideMenu();
        sideMenus.manager = menu.map((g) => g.label);
        expect(sideMenus.manager).toEqual(['Editor Dashboard', 'Start A New Submission', 'DOIs', 'Settings', 'Statistics', 'Tools']);
        const dashboardGroup = menu.find((g) => g.label === 'Editor Dashboard');
        expect(dashboardGroup.items[0].input).toMatch(/^Search submissions/);
        expect(menu.find((g) => g.label === 'Statistics').items.map((i) => i.label)).toEqual([
            'Preprints',
            'Server',
            'Editorial Activity',
            'Users',
            'Counter R5',
            'Reports',
        ]);
        await ed.chooseSideEntry('Settings', 'Website');
        await expect(manager).toHaveURL(/\/management\/settings\/website/);
        await expect(ed.sideEntry('Settings')).toHaveAttribute('aria-expanded', 'true');
        await expect
            .poll(async () => (await ed.sideMenu()).find((g) => g.label === 'Settings').items.filter((i) => i.selected).map((i) => i.label))
            .toEqual(['Website']);

        // The assistant (Editorial Board Member): the same three entries;
        // "Dashboard" opens the Dashboard; its side menu holds "Editor
        // Dashboard" and "Start A New Submission" alone (Rules 18, 19a, 30).
        // The Author: "Dashboard" opens My Submissions; "My Submissions as
        // Author" and "Start A New Submission" (Rules 19a, 30). The Reader:
        // "Dashboard" opens the Profile page; "Start A New Submission"
        // alone (Rules 19a, 30).
        const viaHome = [
            {who: 'assistant.rita', key: 'assistant', lands: /\/dashboard\/editorial/, side: ['Editor Dashboard', 'Start A New Submission']},
            {who: 'author.alex', key: 'author', lands: /\/dashboard\/mySubmissions/, side: ['My Submissions as Author', 'Start A New Submission']},
            {who: 'reader.rosa', key: 'reader', lands: /\/user\/profile/, side: ['Start A New Submission']},
        ];
        for (const r of viaHome) {
            await test.step(r.who, async () => {
                const page = await (await asUser(r.who)).newPage();
                const theirs = new PublicChrome(page, SERVER, {locale: 'en'});
                await theirs.goto();
                await openUserMenu(theirs, r.who);
                lists[r.key] = await userListLabels(theirs, r.who);
                expect(lists[r.key]).toEqual(['Dashboard', 'View Profile', 'Logout']);
                await theirs.submenuLink('user', userTop(r.who), /^\s*Dashboard\b/).click();
                await expect(page).toHaveURL(r.lands);
                sideMenus[r.key] = await sideLabels(page);
                expect(sideMenus[r.key]).toEqual(r.side);
                await page.context().close();
            });
        }

        // The Moderator (the Section Editor of a server): signing in opens
        // the Dashboard; "Editor Dashboard", "Start A New Submission" and
        // "Statistics", whose list has no "Reports" (Rule 30).
        await test.step('sectioneditor.ana', async () => {
            const page = await signedOutPage(browser, baseURL);
            const login = new LoginPage(page);
            await login.gotoContext(SERVER);
            await login.signIn('sectioneditor.ana', getPassword('sectioneditor.ana'));
            await expect(page).toHaveURL(/\/dashboard\/editorial/);
            const edSe = new EditorialChrome(page);
            await edSe.waitSideMenu();
            const menuSe = await edSe.sideMenu();
            sideMenus.sectionEditor = menuSe.map((g) => g.label);
            expect(sideMenus.sectionEditor).toEqual(['Editor Dashboard', 'Start A New Submission', 'Statistics']);
            const stats = menuSe.find((g) => g.label === 'Statistics').items.map((i) => i.label);
            expect(stats).toContain('Preprints');
            expect(stats).not.toContain('Reports');
            const theirs = new PublicChrome(page, SERVER, {locale: 'en'});
            await theirs.goto();
            await openUserMenu(theirs, 'sectioneditor.ana');
            lists.sectionEditor = await userListLabels(theirs, 'sectioneditor.ana');
            await page.context().close();
        });

        // Control: no role's username list held "Administration", and only
        // the manager's side menu held "Settings", "DOIs" and "Tools"
        // (Rules 18, 30).
        for (const [key, list] of Object.entries(lists)) {
            expect(list, key).toContain('View Profile');
            expect(list, key).not.toContain('Administration');
        }
        for (const [key, labels] of Object.entries(sideMenus)) {
            for (const entry of ['Settings', 'DOIs', 'Tools']) {
                if (key === 'manager') expect(labels, key).toContain(entry);
                else expect(labels, key).not.toContain(entry);
            }
        }
    });

    test('S3: the seeded server\'s Navigation tab', async ({asUser}) => {
        test.slow();
        const page = await (await asUser('manager.maya')).newPage();
        acceptDialogs(page);
        const tab = new NavigationTab(page, SERVER);

        // The menus table: "Navigation" above "Navigation Menu Items", "Add
        // Menu" above it; the two installed menus in either order, with
        // their items cells (Rules 2, 3, 3a).
        await tab.goto();
        await expect(tab.tableHeading('menus')).toHaveText(whole('Navigation'));
        await expect(tab.tableHeading('items')).toHaveText(whole('Navigation Menu Items'));
        const menusBox = await tab.menusTable.boundingBox();
        const itemsBox = await tab.itemsTable.boundingBox();
        expect(menusBox.y).toBeLessThan(itemsBox.y);
        await expect(tab.addMenuLink).toBeVisible();
        await expect(tab.rows('menus')).toHaveCount(2);
        // Each cell compared as a set: its items tie on `seq` (fix list B).
        const menus = await tab.menuSets();
        expect(menus).toEqual([
            {
                title: 'Primary Navigation Menu',
                items: 'Announcements, About the Server, Submissions, Archives, About, Editorial Masthead, Privacy Statement, Contact'.split(', ').sort(),
            },
            {
                title: 'User Navigation Menu',
                items: 'Dashboard, Register, View Profile, Login, manager.maya, Administration, Logout'.split(', ').sort(),
            },
        ]);

        // The items table: "Add item" above it, sixteen items: every item
        // of the two menus, the username item as manager.maya, and "Search"
        // (Rules 2, 10).
        await expect(tab.addItemLink).toBeVisible();
        await expect(tab.rows('items')).toHaveCount(16);
        const items = await tab.rowTitles('items');
        expect([...items].sort()).toEqual([...ALL_ITEMS('manager.maya')].sort());

        // A row's arrow: "Edit" and "Remove" under the row (Fields).
        const controls = await tab.openRowControls('menus', 'Primary Navigation Menu');
        await expect(controls.getByRole('link', {name: 'Edit', exact: true})).toBeVisible();
        await expect(controls.getByRole('link', {name: 'Remove', exact: true})).toBeVisible();

        // The menu window: headed "Edit", the strip with the "i" icon, the
        // Tasks bell and the initials; "Title" and the area; the assigned
        // tree and the unassigned rest (Rules 2, 4, 27).
        const win = await tab.openMenu('Primary Navigation Menu');
        await expect(win.heading).toHaveText(whole('Edit'));
        await expect(win.stripHelpLink).toBeVisible();
        await expect(win.stripTasksButton).toBeVisible();
        await expect(win.stripInitialsButton).toBeVisible();
        await expect(win.titleInput).toHaveValue('Primary Navigation Menu');
        await expect(win.areaSelect.locator('option:checked')).toHaveText(whole('primary'));
        await expect.poll(() => outline(win, 'assigned')).toEqual(PRIMARY_OUTLINE);
        expect((await outline(win, 'unassigned')).sort()).toEqual(
            ['Register', 'Login', 'manager.maya', 'Dashboard', 'View Profile', 'Administration', 'Logout', 'Search'].sort()
        );

        // The eye and the warning, per item; the eye on "Announcements"
        // and the warning on "About" open "Notice" windows closed by "OK"
        // (Rules 7, 7a, 7b; A13: the warning read to its first sentence).
        const every = [...(await panelItems(win, 'assigned')), ...(await panelItems(win, 'unassigned'))];
        const withEye = every.filter((i) => i.eye).map((i) => i.title).sort();
        expect(withEye).toEqual(
            [
                'Announcements',
                'About',
                'About the Server',
                'Privacy Statement',
                'Contact',
                'Register',
                'Login',
                'manager.maya',
                'Dashboard',
                'View Profile',
                'Administration',
                'Logout',
            ].sort()
        );
        // The scenario gives the username item the warning here too; in the
        // primary menu's window it has no items under it and carries none
        // (T-ops-2); the warning is read on "About", the item with items
        // under it in this menu (Rule 7b).
        expect(every.filter((i) => i.warning).map((i) => i.title).sort()).toEqual(['About']);
        for (const none of ['Archives', 'Submissions', 'Editorial Masthead', 'Search']) {
            expect(every.find((i) => i.title === none), none).toMatchObject({eye: false, warning: false});
        }
        await win.eyeIcon('assigned', 'Announcements').click();
        await expect(win.noticeDialog).toBeVisible();
        await expect(win.noticeDialog).toContainText(
            'This link will only be displayed if you have enabled announcements under Settings > Website.'
        );
        await win.noticeDialog.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(win.noticeDialog).toHaveCount(0);
        await win.warningIcon('assigned', 'About').click();
        await expect(win.noticeDialog).toBeVisible();
        await expect(win.noticeDialog).toContainText('When a menu item opens a submenu, it\'s link can not be followed on all devices.');
        await win.noticeDialog.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(win.noticeDialog).toHaveCount(0);

        // Control: "Cancel" closes the window at once, nothing having
        // changed, and both tables read as before (Rule 6).
        await win.cancelButton.click();
        await expect(win.warningDialog).toHaveCount(0);
        await expect(win.editor).toHaveCount(0);
        await expect.poll(() => tab.menuSets()).toEqual(menus);
        await expect.poll(async () => [...(await tab.rowTitles('items'))].sort()).toEqual([...items].sort());
    });

    test('S4: put a new link in the primary menu', async ({browser, baseURL, asUser, opsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        await opsApi.createContext({tag, users: [account(tag, 'mg', 'Mona', 'Manager', ['manager'])]});
        const page = await (await asUser(`${tag}mg`)).newPage();
        acceptDialogs(page);
        const tab = new NavigationTab(page, tag);
        const visitor = await signedOutPage(browser, baseURL);
        await stubOutside(visitor.context(), /^https:\/\/pkp\.sfu\.ca\//);
        const header = new PublicChrome(visitor, tag);
        await header.goto();
        await expect(header.primaryTopLinks).toHaveText([whole('Archives'), whole('About')]);

        // The item: "Add item" opens "Add item" with "Save" and no "Cancel";
        // "Our news", "Remote URL", https://pkp.sfu.ca, "Save": the window
        // closes, the notice, and the table lists "Our news" (Fields; Rule 11).
        await tab.goto();
        const item = await tab.addItem();
        await expect(item.heading).toHaveText(whole('Add item'));
        await expect(item.saveButton).toBeVisible();
        // No "Cancel", as a button or as a link (the locator is either).
        await expect(item.cancelButton).toHaveCount(0);
        await item.titleInput().fill('Our news');
        await item.chooseType('Remote URL');
        await item.urlInput().fill('https://pkp.sfu.ca');
        await tab.noticeDuring('Navigation menu item was successfully added', () => item.save());
        await expect(item.form).toHaveCount(0);
        await expect(tab.row('items', 'Our news')).toHaveCount(1);

        // Outside every menu: "Our news" is in "Unassigned Menu Items" (Rule 11).
        let win = await tab.openMenu('Primary Navigation Menu');
        await expect(win.item('unassigned', 'Our news')).toBeVisible();
        await expect(win.item('assigned', 'Our news')).toHaveCount(0);

        // Two levels at most: "Our news" onto "Archives" sits under it;
        // "Search" onto "Our news" does not; "About" onto "Announcements"
        // does not take its items under "Announcements" (Rules 5, 5a).
        const nested = ['Announcements', 'Archives', '> Our news', 'About', ...ABOUT_ITEMS.map((t) => `> ${t}`)];
        await win.drag('unassigned', 'Our news', {panel: 'assigned', item: 'Archives'});
        await expect.poll(() => outline(win, 'assigned')).toEqual(nested);
        await win.drag('unassigned', 'Search', {panel: 'assigned', item: 'Our news'});
        await expect.poll(() => outline(win, 'assigned')).not.toContain('> > Search');
        expect((await panelItems(win, 'assigned')).filter((i) => i.level > 1)).toEqual([]);
        await win.drag('assigned', 'About', {panel: 'assigned', item: 'Announcements'});
        await expect.poll(() => outline(win, 'assigned')).toEqual(nested);

        // Discarded: "Cancel" asks "Warning"; "Yes" closes; reopened, "Our
        // news" is back in "Unassigned Menu Items", the menu as installed
        // (Rule 6).
        await win.cancelButton.click();
        await expect(win.warningDialog).toBeVisible();
        await expect(win.warningDialog).toContainText(CHANGED);
        await win.warningDialog.getByRole('button', {name: 'Yes', exact: true}).click();
        await expect(win.editor).toHaveCount(0);
        win = await tab.openMenu('Primary Navigation Menu');
        await expect(win.item('unassigned', 'Our news')).toBeVisible();
        await expect.poll(() => outline(win, 'assigned')).toEqual(PRIMARY_OUTLINE);

        // Asked, then kept: dragged again, "Cancel", "No": the window is
        // back with "Our news" under "Archives", and "Archives" carries no
        // red warning icon (Rules 6, 7b).
        await win.drag('unassigned', 'Our news', {panel: 'assigned', item: 'Archives'});
        await expect.poll(() => outline(win, 'assigned')).toEqual(nested);
        await win.cancelButton.click();
        await expect(win.warningDialog).toBeVisible();
        await expect(win.warningDialog).toContainText(CHANGED);
        await win.warningDialog.getByRole('button', {name: 'No', exact: true}).click();
        await expect(win.warningDialog).toHaveCount(0);
        await expect(win.editor).toBeVisible();
        await expect.poll(() => outline(win, 'assigned')).toEqual(nested);
        await expect(win.warningIcon('assigned', 'Archives')).toHaveCount(0);
        await expect(win.warningIcon('assigned', 'About')).toHaveCount(1);

        // Control: after "No" and before "Save", the visitor's reloaded home
        // page shows "Archives" with no list and no "Our news" (Rule 6).
        await header.goto();
        await expect(header.primaryTopLinks).toHaveText([whole('Archives'), whole('About')]);
        await expect(header.submenu('primary', 'Archives')).toHaveCount(0);
        await expect(visitor.getByRole('link', {name: 'Our news', exact: true})).toHaveCount(0);

        // Saved: the window closes, the notice, the cell names "Our news"
        // (read after a reload, A15); reopened, "Archives" carries the red
        // warning icon (Rules 6, 7b).
        await tab.noticeDuring('Navigation menu was successfully updated', () => win.save());
        await tab.goto();
        expect((await tab.menus()).find((m) => m.title === 'Primary Navigation Menu').items.split(', ')).toContain('Our news');
        win = await tab.openMenu('Primary Navigation Menu');
        await expect(win.warningIcon('assigned', 'Archives')).toHaveCount(1);
        await win.cancelButton.click();
        await expect(win.editor).toHaveCount(0);

        // The visitor's header: pointing at "Archives" opens a list holding
        // "Our news"; pressing "Archives" opens no page; "Our news" leaves,
        // in the same tab, for https://pkp.sfu.ca (Rules 11, 16; item types).
        await header.goto();
        await header.topLink('primary', 'Archives').hover();
        await expect(header.submenuLinks('primary', 'Archives')).toHaveText([whole('Our news')]);
        const homeUrl = visitor.url();
        await header.pressTop('primary', 'Archives');
        expect(visitor.url()).toBe(homeUrl);
        const ourNews = header.submenuLink('primary', 'Archives', 'Our news');
        await expect(ourNews).toBeVisible();
        expect(await ourNews.getAttribute('target')).toBeNull();
        const pages = visitor.context().pages().length;
        await ourNews.click();
        await expect(visitor).toHaveURL(PKP);
        expect(visitor.context().pages().length).toBe(pages);

        // Edited: "Edit" opens "Edit"; "PKP news" saved: the notice, and
        // the table lists "PKP news" once and no longer "Our news", in no
        // fixed place (Rules 10, 11); the visitor's "Archives" list holds
        // "PKP news" (Rule 11).
        const edit = await tab.editItem('Our news');
        await expect(edit.heading).toHaveText(whole('Edit'));
        await edit.titleInput().fill('PKP news');
        await tab.noticeDuring('Navigation menu item was successfully updated', () => edit.save());
        await expect(edit.form).toHaveCount(0);
        await expect(tab.row('items', 'PKP news')).toHaveCount(1);
        await expect(tab.row('items', 'Our news')).toHaveCount(0);
        await header.goto();
        await header.topLink('primary', 'Archives').hover();
        await expect(header.submenuLinks('primary', 'Archives')).toHaveText([whole('PKP news')]);
    });

    test('S5: the item window refuses a save', async ({asUser, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        await opsApi.createContext({tag, users: [account(tag, 'mg', 'Mona', 'Manager', ['manager'])]});
        const page = await (await asUser(`${tag}mg`)).newPage();
        const questions = acceptDialogs(page);
        const tab = new NavigationTab(page, tag);
        await tab.goto();
        const before = await tab.rowTitles('items');

        // No title: "This field is required." under "Title"; the window
        // stays (Fields).
        const item = await tab.addItem();
        await item.chooseType('Remote URL');
        await item.urlInput().fill('https://pkp.sfu.ca');
        await item.saveButton.click();
        await expect(item.fieldError('This field is required.')).toBeVisible();
        await expect(item.form).toBeVisible();

        // No type, not a web address, a path with other characters: each
        // "Save" leaves the window open and stores nothing (Fields; A11,
        // A12 not asserted).
        await item.titleInput().fill('Our page');
        await item.chooseType('Choose a type...');
        await item.save();
        await expect(item.form).toBeVisible();
        await item.chooseType('Remote URL');
        await item.urlInput().fill('pkp.sfu.ca');
        await item.save();
        await expect(item.form).toBeVisible();
        await item.chooseType('Custom Page');
        await item.pathInput.fill('my page');
        await item.save();
        await expect(item.form).toBeVisible();

        // A path accepted: "our-page" saves: the window closes, the notice,
        // and the table lists "Our page" (Fields; Rule 11).
        await item.pathInput.fill('our-page');
        await tab.noticeDuring('Navigation menu item was successfully added', () => item.save());
        await expect(item.form).toHaveCount(0);
        await expect(tab.row('items', 'Our page')).toHaveCount(1);

        // A path already used: the window stays; the back arrow closes it
        // (Fields; Rule 11a). The scenario's browser question before the
        // close is not asked right after a refused "Save" (T-ops-3); a
        // question, if one comes, is accepted by the handler.
        const second = await tab.addItem();
        await second.titleInput().fill('Second page');
        await second.chooseType('Custom Page');
        await second.pathInput.fill('our-page');
        await second.save();
        await expect(second.form).toBeVisible();
        await second.closeButton.click();
        await expect(second.form).toHaveCount(0);
        expect(questions.every((q) => q === CHANGED)).toBe(true);

        // Control: "Our page" once, no "Second page": no refused save
        // stored anything (Fields).
        await tab.goto();
        const after = await tab.rowTitles('items');
        expect(after.filter((t) => t === 'Our page')).toHaveLength(1);
        expect(after).not.toContain('Second page');
        expect(after).toHaveLength(before.length + 1);
    });

    test('S6: add a menu, remove the primary one, and fill its area', async ({browser, baseURL, asUser, opsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        await opsApi.createContext({tag, users: [account(tag, 'mg', 'Mona', 'Manager', ['manager'])]});
        const page = await (await asUser(`${tag}mg`)).newPage();
        acceptDialogs(page);
        const tab = new NavigationTab(page, tag);
        const visitor = await signedOutPage(browser, baseURL);
        const header = new PublicChrome(visitor, tag);
        await header.goto();
        await expect(header.primaryTopLinks).toHaveText([whole('Archives'), whole('About')]);
        await tab.goto();
        const allItems = await tab.rowTitles('items');

        // The new window: "Add Menu", area "None", every item unassigned,
        // the assigned panel's text (Fields; Rule 4).
        const win = await tab.addMenu();
        await expect(win.heading).toHaveText(whole('Add Menu'));
        await expect(win.areaSelect.locator('option:checked')).toHaveText(whole('None'));
        await expect.poll(async () => (await outline(win, 'unassigned')).sort()).toEqual([...allItems].sort());
        expect(await panelItems(win, 'assigned')).toEqual([]);
        await expect(win.panel('assigned')).toHaveText(whole('No items assigned to this menu. Drag items from Unassigned Menu Items.'));

        // No title: "This field is required.", "Please correct one error."
        // with "Jump to next error"; "Save" greyed until "Title" changes
        // (Fields).
        await win.saveButton.click();
        await expect(win.fieldErrorFor('Title')).toHaveText(whole('This field is required.'));
        await expect(win.form).toContainText('Please correct one error.');
        await expect(win.form.getByText('Jump to next error', {exact: true})).toBeVisible();
        await expect(win.saveButton).toBeDisabled();

        // A title in use: refused under the box, with the page notice (Fields).
        await win.titleInput.fill('Primary Navigation Menu');
        await expect(win.saveButton).toBeEnabled();
        await tab.noticeDuring('The form was not saved because 1 error(s) were encountered. Please correct these errors and try again.', () =>
            win.saveButton.click()
        );
        await expect(win.fieldErrorFor('Title')).toHaveText(whole('This title already exists for another navigation menu.'));

        // An area in use: "Footer links" at "primary", refused under the
        // list, with the same notice (Fields).
        await win.titleInput.fill('Footer links');
        await win.areaSelect.selectOption({label: 'primary'});
        await tab.noticeDuring('The form was not saved because 1 error(s) were encountered. Please correct these errors and try again.', () =>
            win.saveButton.click()
        );
        await expect(win.fieldErrorFor('Active Theme Navigation Areas')).toHaveText(whole('A navigation menu is already assigned to this area.'));

        // Saved at "None" with "Search": the notice, the row "Footer links"
        // reading "Search"; the visitor's header: the primary menu as
        // before and one "Search" link (Rules 6, 8, 17).
        await win.areaSelect.selectOption({label: 'None'});
        await win.drag('unassigned', 'Search', {panel: 'assigned'});
        await expect.poll(() => outline(win, 'assigned')).toEqual(['Search']);
        await tab.noticeDuring('Navigation menu was successfully added', () => win.save());
        await expect(tab.row('menus', 'Footer links')).toHaveCount(1);
        expect((await tab.menus()).find((m) => m.title === 'Footer links').items).toBe('Search');
        await header.goto();
        await expect(header.primaryTopLinks).toHaveText([whole('Archives'), whole('About')]);
        await expect(visitor.getByRole('link', {name: 'Search', exact: true})).toHaveCount(1);

        // "Remove", then "Cancel": the window "Remove" with "OK" and
        // "Cancel"; the row stays (Rule 9).
        let dialog = await tab.openRemove('menus', 'Primary Navigation Menu');
        await expect(dialog).toContainText(REMOVE_TEXT);
        await expect(dialog.getByRole('button', {name: 'OK', exact: true})).toBeVisible();
        await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(tab.removeDialog()).toHaveCount(0);
        await expect(tab.row('menus', 'Primary Navigation Menu')).toHaveCount(1);

        // Removed: the notice, the row gone; the items stay; the visitor's
        // header has no primary links and keeps its "Search" and user menu
        // (Rules 8, 9, 15).
        dialog = await tab.openRemove('menus', 'Primary Navigation Menu');
        await tab.noticeDuring('Navigation menu was successfully removed', () =>
            dialog.getByRole('button', {name: 'OK', exact: true}).click()
        );
        await expect(tab.row('menus', 'Primary Navigation Menu')).toHaveCount(0);
        await expect(tab.row('menus', 'Footer links')).toHaveCount(1);
        for (const title of ['Archives', 'About']) {
            await expect(tab.row('items', title)).toHaveCount(1);
        }
        await header.goto();
        await expect(header.searchLink).toBeVisible();
        await expect(header.primaryTopLinks).toHaveCount(0);
        await expect(header.userTopLinks).toHaveText([whole('Register'), whole('Login')]);

        // The area filled again: "Footer links" at "primary": the notice;
        // the visitor's header shows the menu's "Search" and then its own
        // (Rules 8, 17).
        const edit = await tab.openMenu('Footer links');
        await edit.areaSelect.selectOption({label: 'primary'});
        await tab.noticeDuring('Navigation menu was successfully updated', () => edit.save());
        await header.goto();
        await expect(header.primaryTopLinks).toHaveText([whole('Search')]);
        const searches = visitor.getByRole('link', {name: 'Search', exact: true});
        await expect(searches).toHaveCount(2);
        expect(await searches.first().evaluate((a) => !!a.closest('#navigationPrimary'))).toBe(true);
        expect(await searches.last().evaluate((a) => !!a.closest('.pkp_navigation_search_wrapper'))).toBe(true);

        // Control: the seeded server's home page still shows its primary
        // menu (Rule 1).
        const seeded = new PublicChrome(visitor, SERVER, {locale: 'en'});
        await seeded.goto();
        await expect(seeded.primaryTopLinks).toHaveText([whole('Archives'), whole('About')]);
    });

    test('S7: remove an item that has items under it', async ({browser, baseURL, asUser, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        await opsApi.createContext({tag, users: [account(tag, 'mg', 'Mona', 'Manager', ['manager'])]});
        const page = await (await asUser(`${tag}mg`)).newPage();
        acceptDialogs(page);
        const tab = new NavigationTab(page, tag);
        const visitor = await signedOutPage(browser, baseURL);
        const header = new PublicChrome(visitor, tag);
        await header.goto();
        await header.topLink('primary', 'About').hover();
        await expect(header.submenuLinks('primary', 'About')).toHaveText(ABOUT_ITEMS.map(whole));

        // Removed: "Remove" asks; "OK": the notice and "About" leaves the
        // table (Rule 13; A15 not read).
        await tab.goto();
        const before = await tab.rowTitles('items');
        const dialog = await tab.openRemove('items', 'About');
        await expect(dialog).toContainText(REMOVE_TEXT);
        await tab.noticeDuring('Navigation menu item was successfully removed', () =>
            dialog.getByRole('button', {name: 'OK', exact: true}).click()
        );
        await expect(tab.row('items', 'About')).toHaveCount(0);

        // The menu window: "Announcements" and "Archives" assigned, the five
        // former sub-items among the unassigned (Rule 13).
        const win = await tab.openMenu('Primary Navigation Menu');
        await expect.poll(() => outline(win, 'assigned')).toEqual(['Announcements', 'Archives']);
        const unassigned = await outline(win, 'unassigned');
        for (const title of ABOUT_ITEMS) {
            expect(unassigned, title).toContain(title);
        }
        await win.cancelButton.click();
        await expect(win.editor).toHaveCount(0);

        // The visitor's header: "Archives" alone, no "About" and no list (Rule 13).
        await header.goto();
        await expect(header.primaryTopLinks).toHaveText([whole('Archives')]);
        await expect(header.submenu('primary', 'Archives')).toHaveCount(0);
        await expect(visitor.getByRole('link', {name: 'About the Server', exact: true})).toHaveCount(0);

        // Control: the other items stay, "About the Server" and "Contact"
        // among them (Rule 13).
        await tab.goto();
        const after = await tab.rowTitles('items');
        expect([...after].sort()).toEqual(before.filter((t) => t !== 'About').sort());
        expect(after).toEqual(expect.arrayContaining(['About the Server', 'Contact']));
    });

    test('S9: the journals switcher, and a server where the user holds no role', async ({asUser, opsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tagA = makeTag('s9a', testInfo);
        const tagB = makeTag('s9b', testInfo);
        const nameA = `U08 First ${tagA}`;
        const nameB = `U08 Second ${tagB}`;
        const author = `${tagA}au`;
        await opsApi.createContext({tag: tagA, context: {name: {en: nameA}}, users: [account(tagA, 'au', 'Ada', 'Author', ['author'])]});
        await opsApi.createContext({tag: tagB, context: {name: {en: nameB}}});

        // No role in the server: the Author opens the second server's home
        // page, the username, "View Profile": the Profile page with the
        // editorial header and no side menu; the switcher, the second
        // server's name (a link to its home page), the "i" icon, the Tasks
        // bell and the initials, which open "Edit Profile" and "Logout"
        // alone (Actors rows 6, 8; Rules 27, 27a, 27b, 28).
        const page = await (await asUser(author)).newPage();
        const pub = new PublicChrome(page, tagB);
        await pub.goto();
        await openUserMenu(pub, author);
        await pub.submenuLink('user', userTop(author), 'View Profile').click();
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${tagB}/user/profile`));
        const ed = new EditorialChrome(page);
        await expect(ed.bar).toBeVisible();
        await expect(ed.contextTitle).toHaveText(whole(nameB));
        expect(await ed.contextTitle.getAttribute('href')).toMatch(new RegExp(`/index\\.php/${tagB}(/index)?$`));
        await expect(ed.switcherButton).toBeVisible();
        await expect(ed.helpLink).toBeVisible();
        await expect(ed.tasksButton).toBeVisible();
        await expect(ed.initialsButton).toBeVisible();
        await expect(ed.sideNav).toHaveCount(0);
        await ed.openUserMenu();
        const lines = await ed.userMenuItems();
        expect(lines.map((l) => l.text)).toEqual(['Edit Profile', 'Logout']);
        await ed.closeUserMenu();

        // The Author's switcher: the first server alone, by name; chosen,
        // its My Submissions opens (Rules 29, 29a).
        await ed.openSwitcher();
        expect(await ed.switcherNames()).toEqual([nameA]);
        await ed.switcherLink(nameA).click();
        await expect(page).toHaveURL(new RegExp(`/index\\.php/${tagA}/dashboard/mySubmissions`));

        // Nothing to switch to: no sitemap icon on the first server's My
        // Submissions; control: the Author's side menu there (Rules 29, 30).
        expect(await sideLabels(page)).toEqual(['My Submissions as Author', 'Start A New Submission']);
        await expect(ed.initialsButton).toBeVisible();
        await expect(ed.switcher).toHaveCount(0);

        // The Site Administrator's switcher on the first server's Settings ›
        // Website: the second server and the seeded one, not the first;
        // the second chosen: its Settings › Website. "Edit Profile", then
        // the first server: its Dashboard (Rules 29, 29a).
        const admin = await (await asUser('admin')).newPage();
        const adminEd = new EditorialChrome(admin);
        await admin.goto(`/index.php/${tagA}/management/settings/website`);
        await expect(admin.getByRole('main').getByRole('tab').first()).toBeVisible({timeout: T});
        await adminEd.openSwitcher();
        const entries = await adminEd.switcherNames();
        expect(entries).toEqual(expect.arrayContaining([nameB, SERVER_NAME]));
        expect(entries).not.toContain(nameA);
        await adminEd.switcherLink(nameB).click();
        await expect(admin).toHaveURL(new RegExp(`/index\\.php/${tagB}/management/settings/website`));
        await adminEd.openUserMenu();
        await adminEd.userMenuLink('Edit Profile').click();
        await expect(admin).toHaveURL(new RegExp(`/index\\.php/${tagB}/user/profile`));
        await adminEd.openSwitcher();
        await adminEd.switcherLink(nameA).click();
        await expect(admin).toHaveURL(new RegExp(`/index\\.php/${tagA}/dashboard/editorial`));

        // "Administration": the first server's home page, the username:
        // "Dashboard", "View Profile", "Administration", "Logout";
        // "Administration" opens the Administration page (Rule 18).
        const adminPub = new PublicChrome(admin, tagA);
        await adminPub.goto();
        await openUserMenu(adminPub, 'admin');
        expect(await userListLabels(adminPub, 'admin')).toEqual(['Dashboard', 'View Profile', 'Administration', 'Logout']);
        await adminPub.submenuLink('user', userTop('admin'), 'Administration').click();
        await expect(admin).toHaveURL(/\/index\.php\/index\/(en\/)?admin/);
        await expect(admin.locator('main h1, h1').first()).toHaveText(whole('Administration'));
    });

    test('S10: page links on a list longer than a page', async ({browser, baseURL, asUser, opsApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s10', testInfo);
        await opsApi.createContext({
            tag,
            users: [account(tag, 'mg', 'Mona', 'Manager', ['manager']), account(tag, 'au', 'Ada', 'Author', ['author'])],
        });
        for (const n of [1, 2, 3]) {
            await opsApi.createSubmission({tag: `${tag}p${n}`, context: tag, submitter: `${tag}au`, title: `Preprint ${n} ${tag}`, published: true});
        }
        const visitor = await signedOutPage(browser, baseURL);
        const header = new PublicChrome(visitor, tag);
        const entries = visitor.locator('.cmp_preprint_list > li');

        // Control first: at 25 the list shows the three on one page, with
        // no "Previous", no "Next" and no count (Rule 24).
        await header.goto();
        await header.topLink('primary', 'Archives').click();
        await expect(visitor).toHaveURL(new RegExp(`/index\\.php/${tag}/preprints$`));
        await expect(entries).toHaveCount(3);
        await expect(header.pagination).toHaveCount(0);
        await expect(visitor.getByRole('link', {name: 'Next', exact: true})).toHaveCount(0);

        // "Items per page": 25 and "Page links" 10; 1 saved (Settings bullet 16).
        const page = await (await asUser(`${tag}mg`)).newPage();
        await page.goto(`/index.php/${tag}/management/settings/website#setup/lists`);
        const lists = new SettingsForm(page, 'input[name="itemsPerPage"]');
        await lists.ready();
        await expect(lists.form.locator('input[name="itemsPerPage"]')).toHaveValue('25');
        await expect(lists.form.locator('input[name="numPageLinks"]')).toHaveValue('10');
        await lists.form.locator('input[name="itemsPerPage"]').fill('1');
        await lists.save();

        // Page by page (Rule 24).
        await header.goto();
        await header.topLink('primary', 'Archives').click();
        await expect(entries).toHaveCount(1);
        await expect(header.pageCount()).toHaveText(whole('1-1 of 3'));
        await expect(header.nextLink).toHaveText(whole('Next'));
        await expect(header.previousLink).toHaveCount(0);
        await header.nextLink.click();
        await expect(header.pageCount()).toHaveText(whole('2-2 of 3'));
        await expect(entries).toHaveCount(1);
        await expect(header.previousLink).toHaveText(whole('Previous'));
        await expect(header.nextLink).toHaveText(whole('Next'));
        await header.nextLink.click();
        await expect(header.pageCount()).toHaveText(whole('3-3 of 3'));
        await expect(header.previousLink).toHaveText(whole('Previous'));
        await expect(header.nextLink).toHaveCount(0);
        await header.previousLink.click();
        await expect(header.pageCount()).toHaveText(whole('2-2 of 3'));

        // A preprint's trail {OPS}: "Home / Preprints" (Rule 23).
        const title = entries.first().locator('.title a, h3 a, h2 a').first();
        const preprintTitle = flat(await title.textContent());
        await title.click();
        await expect(visitor.locator('.pkp_structure_main h1').first()).toHaveText(whole(preprintTitle));
        expect(await header.trail()).toEqual(['Home', 'Preprints']);
    });

    test('S11: the "Developed By" block', async ({browser, baseURL, asUser, opsApi}, testInfo) => {
        test.slow();
        const tagOff = makeTag('s11a', testInfo);
        const tag = makeTag('s11b', testInfo);
        const plugins = {developedbyblockplugin: {enabled: true}};
        await opsApi.createContext({tag: tagOff, plugins, users: [account(tagOff, 'mg', 'Mona', 'Manager', ['manager'])]});
        await opsApi.createContext({tag, plugins, sidebar: ['developedbyblockplugin'], users: [account(tag, 'mg', 'Mona', 'Manager', ['manager'])]});
        const visitor = await signedOutPage(browser, baseURL);

        // Control: enabled and not placed, the home page's sidebar has no
        // "Open Preprint Systems" link; the manager's "Sidebar" list offers
        // the block unticked (Rule 21; Settings bullet 15).
        const off = new PublicChrome(visitor, tagOff);
        await off.goto();
        await expect(off.developedByLink('Open Preprint Systems')).toHaveCount(0);
        await expect(visitor.getByRole('link', {name: 'Open Preprint Systems', exact: true})).toHaveCount(0);
        const managerOff = await (await asUser(`${tagOff}mg`)).newPage();
        await managerOff.goto(`/index.php/${tagOff}/management/settings/website#appearance/appearance-setup`);
        const boxOff = managerOff.locator('input[name="sidebar"][value="developedbyblockplugin"]');
        await expect(boxOff).toBeVisible({timeout: T});
        await expect(boxOff).not.toBeChecked();

        // Placed (seeded through `sidebar`, the list's save): the manager's
        // "Sidebar" list has the block ticked (Settings bullet 15).
        const manager = await (await asUser(`${tag}mg`)).newPage();
        await manager.goto(`/index.php/${tag}/management/settings/website#appearance/appearance-setup`);
        const box = manager.locator('input[name="sidebar"][value="developedbyblockplugin"]');
        await expect(box).toBeVisible({timeout: T});
        await expect(box).toBeChecked();

        // Every page: the sidebar link "Open Preprint Systems" to PKP's page
        // about the application, after the heading "Developed By" that is
        // not shown on screen; "About the Server" and the Search page carry
        // the same link (Rule 21).
        const on = new PublicChrome(visitor, tag);
        for (const path of ['', '/about', '/search']) {
            await test.step(path || 'home', async () => {
                await on.goto(path);
                const link = on.developedByLink('Open Preprint Systems');
                await expect(link).toHaveCount(1);
                await expect(link).toHaveAttribute('href', 'https://pkp.sfu.ca/ops/');
                const heading = on.sidebar.getByRole('heading', {name: 'Developed By', exact: true});
                await expect(heading).toHaveCount(1);
                await expect(heading).not.toBeInViewport();
                await link.scrollIntoViewIfNeeded();
                await expect(link).toBeInViewport();
                expect(await heading.evaluate((h, a) => !!(h.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING), await link.elementHandle())).toBe(true);
            });
        }
    });
});
