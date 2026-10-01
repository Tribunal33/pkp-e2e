// Issue report U53 A11: with the interface in French (Canada), the "Users"
// tab of Settings › Users & Roles prints raw codes for the search box, the
// "Start Date" column and the Invitations section (heading, button, columns).
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   1-2  rvaca: Settings › Users & Roles, "Users" tab, in English (control):
//        the search box, the user list's columns, the Invitations section.
//   3    the initials menu › "français" (the script picks it on the dashboard,
//        then opens the Users page again; on the Users page it reopens at /fr_CA/).
//   then the same tab in French: the same labels, and every `##key##` on the
//        page (text and attributes, screen-reader text included).
// Neighbour check (fix in and out): the English labels and every French
// label other than the codes are the same with the fix in and out.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/users-french-raw-codes/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both.
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops,
// reset the dataset, walk, then node bin/try-fix.js revert <this folder>/fix.diff ojs omp ops.
const {forEachApp, launch, signIn, screen, record, idle, rawKeys} = require('../../../probe');

const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const {LanguageMenu} = require('../../../pages/LanguagesPages.js');
    const facts = {app: app.name, line: app.line, dataset: app.dataset, startedAt: new Date().toISOString()};
    const {page, close} = await launch(app);

    const openTab = async (locale) => {
        await page.goto(app.url(`/index.php/${app.contextPath}/${locale ? `${locale}/` : ''}management/settings/access`));
        // The tab's first table is the user list, the second the invitations.
        await expect(page.locator('main table').first().locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
    };

    // Labels by position, so the read does not depend on the language.
    const readTab = async () => page.evaluate(() => {
        const t = (el) => (el ? (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() : null);
        const main = document.querySelector('main') || document.body;
        // The "Users" tab's panel; the other tabs (Roles, Site Access) hold tables too.
        const panel = main.querySelector('#users') || main;
        const tables = [...panel.querySelectorAll('table')];
        const heads = (tb) => (tb ? [...tb.querySelectorAll('thead th')].map((th) => t(th)) : null);
        const search = main.querySelector('input[type="search"], [role="searchbox"]');
        const searchLabel = search && (search.labels && search.labels[0] ? t(search.labels[0]) : null);
        // The user list is the table with rows; the Invitations table is the other (empty on the dataset).
        const rowsOf = (tb) => tb.querySelectorAll('tbody tr').length;
        const users = tables.slice().sort((a, b) => rowsOf(b) - rowsOf(a))[0] || null;
        const inv = tables.find((tb) => tb !== users) || null;
        // The Invitations section: the nearest ancestor holding a heading, its heading and its buttons outside the table.
        let invHeading = null; let invButtons = [];
        for (let el = inv && inv.parentElement; el && el !== main; el = el.parentElement) {
            const h = el.querySelector('h1,h2,h3,h4');
            if (h) {
                invHeading = t(h);
                invButtons = [...el.querySelectorAll('button')].filter((b) => !inv.contains(b) && !(users && users.contains(b))).map((b) => t(b));
                break;
            }
        }
        return {
            tabs: [...main.querySelectorAll('[role="tab"]')].map((x) => t(x)),
            usersCaption: users ? t(users.querySelector('caption')) : null,
            usersRows: users ? rowsOf(users) : null,
            usersColumns: heads(users),
            searchLabel,
            searchPlaceholder: search ? search.getAttribute('placeholder') : null,
            searchAria: search ? search.getAttribute('aria-label') : null,
            invitationsHeading: invHeading,
            invitationsButtons: invButtons,
            invitationsColumns: heads(inv),
            paging: [...main.querySelectorAll('nav, [class*="pagination"]')].map((n) => t(n)).filter(Boolean).slice(0, 3),
            mainText: t(main).slice(0, 4000),
        };
    });

    try {
        // 1-2. English (control).
        await signIn(page, 'rvaca');
        await openTab();
        facts.english = await readTab();
        facts.englishRaw = await rawKeys(page, {scope: 'main'});
        record('users-tab-en', await screen(page));

        // 3. The initials menu › Français (Canada).
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial`));
        await idle(page);
        const menu = new LanguageMenu(page);
        facts.menuItems = await menu.read().catch((e) => String(e).slice(0, 200));
        await menu.choose(/fran/i, 'fr_CA');
        await idle(page);
        facts.step3Url = page.url().replace(app.baseURL || '', '');

        // 4-6. The same tab in French (the address the menu leaves the session on).
        await openTab();
        facts.frUrl = page.url().replace(app.baseURL || '', '');
        facts.french = await readTab();
        facts.frenchRaw = await rawKeys(page, {scope: 'main'});
        record('users-tab-fr', await screen(page));
    } catch (e) {
        facts.error = String(e && e.stack || e).slice(0, 800);
        throw e;
    } finally {
        record('facts', facts);
        const brief = (r) => r && {search: r.searchLabel || r.searchAria || r.searchPlaceholder, cols: r.usersColumns,
            invHeading: r.invitationsHeading, invButtons: r.invitationsButtons, invCols: r.invitationsColumns};
        console.log(JSON.stringify({app: app.name, line: app.line, en: brief(facts.english), fr: brief(facts.french),
            frUrl: facts.frUrl, enRaw: facts.englishRaw, frRaw: facts.frenchRaw, error: facts.error && facts.error.slice(0, 200)}, null, 1));
        await close();
    }
});
