// Issue report U53 A5: on Settings › Users & Roles the "…" button at the end
// of every row of "Current Users" is announced to screen readers as the raw
// code "##userAccess.management.options##" instead of a name.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   1-2  rvaca: Settings › Users & Roles, the "Users" tab
//   3-4  Tab to the first row's "…" button; its name as the browser's own
//        accessibility tree gives it (what a screen reader announces), and the
//        names of every row's button
//   5    Enter: the row's menu opens; its items
// Neighbour check (fix in and out): every other named control on the tab
// (buttons, search box, headings, the table's name) as the accessibility
// tree lists them, and the menu's items, are the same with the fix in and
// out; only the row buttons' name changes.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/users-row-button-raw-code-name/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, --feature issues-3_5 and
// PROBE_FEATURE=issues-3_5.
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops
// (rebuilds the JavaScript), reset the dataset, walk, then
// node bin/try-fix.js revert ojs omp ops.
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const RAW = '##userAccess.management.options##';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line, dataset: app.dataset, startedAt: new Date().toISOString()};
    const {page, close} = await launch(app);

    // The browser's own accessibility tree: every named node's role and name,
    // and the node that has the focus.
    const axTree = async () => {
        const cdp = await page.context().newCDPSession(page);
        try {
            await cdp.send('Accessibility.enable');
            const {nodes} = await cdp.send('Accessibility.getFullAXTree');
            const live = nodes.filter((n) => !n.ignored && n.name?.value);
            const focused = nodes.filter((n) => n.role?.value !== 'RootWebArea'
                && (n.properties || []).some((p) => p.name === 'focused' && p.value?.value)).pop();
            return {
                named: live.map((n) => ({role: n.role?.value, name: n.name.value})),
                focused: focused ? {role: focused.role?.value, name: focused.name?.value} : null,
            };
        } finally {
            await cdp.detach().catch(() => {});
        }
    };

    try {
        // 1-2.
        await signIn(page, 'rvaca');
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/access`));
        const users = page.getByRole('table', {name: /^Current Users \(/});
        await expect(users.locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
        const s = await screen(page);
        record('users-list', s);
        facts.heading = (s.text.main || '').match(/Current Users \(\d+\)/)?.[0] || null;
        const rows = users.locator('tbody tr');
        facts.rows = await rows.count();
        facts.firstRow = (await rows.first().locator('td').first().innerText()).trim();

        // 3. Tab from the search box until the first row's last button has the focus.
        const rowButton = rows.first().getByRole('button').last();
        await page.getByRole('searchbox').first().focus();
        let tabs = 0;
        for (; tabs < 40; tabs++) {
            if (await rowButton.evaluate((el) => el === document.activeElement)) break;
            await page.keyboard.press('Tab');
        }
        facts.tabsToButton = tabs;
        facts.buttonHasFocus = await rowButton.evaluate((el) => el === document.activeElement);

        // 4. Its name: the accessibility tree's, and the attribute it comes from.
        const ax = await axTree();
        facts.focused = ax.focused;
        facts.ariaLabel = await rowButton.getAttribute('aria-label');
        facts.visibleText = (await rowButton.innerText()).trim();
        const rowButtonNames = await rows.evaluateAll((trs) => trs.map((tr) => {
            const b = [...tr.querySelectorAll('button')].pop();
            return b ? b.getAttribute('aria-label') : null;
        }));
        facts.rowButtonNames = [...new Set(rowButtonNames)];
        facts.rowButtonsNamedRaw = rowButtonNames.filter((n) => n === RAW).length;
        facts.axButtonsNamedRaw = ax.named.filter((n) => n.role === 'button' && n.name === RAW).length;
        const rowName = facts.rowButtonNames.length === 1 ? facts.rowButtonNames[0] : null;
        facts.axButtonsNamedAsRow = rowName ? ax.named.filter((n) => n.role === 'button' && n.name === rowName).length : null;

        // Neighbour: every other named control on the tab, with the row buttons left out.
        facts.otherNamed = ax.named
            .filter((n) => ['button', 'searchbox', 'textbox', 'heading', 'table', 'tab', 'link', 'columnheader'].includes(n.role))
            .filter((n) => !(n.role === 'button' && n.name === rowName))
            .map((n) => `${n.role}: ${n.name}`);

        // 5. Enter opens the menu.
        await page.keyboard.press('Enter');
        await page.getByRole('menuitem').first().waitFor({timeout: 10_000});
        facts.menu = (await page.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
        record('row-menu', await screen(page));
        await page.keyboard.press('Escape');
        await sleep(300);
    } catch (e) {
        facts.error = String(e && e.stack || e).slice(0, 800);
        throw e;
    } finally {
        record('facts', facts);
        console.log(JSON.stringify({app: app.name, line: app.line, heading: facts.heading, rows: facts.rows,
            focused: facts.focused, ariaLabel: facts.ariaLabel, rowButtonNames: facts.rowButtonNames,
            raw: facts.rowButtonsNamedRaw, axRaw: facts.axButtonsNamedRaw, menu: facts.menu,
            otherNamed: (facts.otherNamed || []).length}));
        await close();
    }
});
