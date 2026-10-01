// Issue report U53 A12: on Settings › Users & Roles, "Users" tab, the ORCID
// icon and the red "disabled" icon after a user's name have no name for a
// screen reader, so a disabled account or an ORCID holder sounds like any
// other user.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   pre  "Minoti Inoue" (minoue) gets an ORCID iD: SQL writing what ORCID's
//        authorization stores (AuthorizeUserData::execute(), targetOp
//        "profile"), since no screen on main lets anyone type one
//   1-2  rvaca: Settings › Users & Roles, the "Users" tab
//   3    "David Buskins"'s row › "…" › "Disable User", reason, "OK"
//   4    the two rows' "Name" cells: the icons drawn after the name
//   5    the cells as the browser's own accessibility tree gives them to a
//        screen reader (Chrome DevTools Protocol Accessibility.getFullAXTree):
//        the cell's name and every node under it, ignored ones included
//   ctl  the row menus: "Enable User" for David Buskins, "Disable User" else
// Neighbour check (fix in and out): an ordinary row's "Name" cell ("Ramiro
// Vaca") reads the name alone, the icons are still drawn (size on screen),
// and every other named control on the tab reads the same.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/users-status-icons-unnamed/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, --feature issues-3_5 and
// PROBE_FEATURE=issues-3_5.
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops
// (rebuilds the JavaScript), reset the dataset, walk, then
// node bin/try-fix.js revert <this folder>/fix.diff ojs omp ops.
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');
const {closeMenu} = require('../../../support/menus');

const ORCID_USER = ['minoue', 'Minoti Inoue'];
const DISABLED_USER = ['dbuskins', 'David Buskins'];
const PLAIN_USER = ['rvaca', 'Ramiro Vaca'];
const ORCID_ID = 'https://orcid.org/0000-0002-1825-0097';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();

// The precondition: what AuthorizeUserData::getOrcidOAuthAccessData() hands to
// HasOrcid::setVerifiedOrcidOAuthData() and Repo::user()->edit() stores as
// user_settings rows (locale '', booleans as 1; orcidAccessDenied null, so
// no row). The scope is the public API's, OrcidManager::ORCID_API_SCOPE_PUBLIC.
const orcidSql = (username) => {
    const rows = [
        ['orcid', ORCID_ID],
        ['orcidIsVerified', '1'],
        ['orcidAccessToken', 'f5af9f51-07e6-4332-8f1a-c0c11c1e3728'],
        ['orcidAccessScope', '/authenticate'],
        ['orcidRefreshToken', 'f725f747-3a65-49f6-a231-3e8944ce464d'],
        ['orcidAccessExpiresOn', '2046-09-26 12:00:00'],
    ];
    const values = rows.map(([n, v]) => `((SELECT user_id FROM users WHERE username = '${username}'), '', '${n}', '${v}')`).join(',\n  ');
    return `INSERT INTO user_settings (user_id, locale, setting_name, setting_value) VALUES\n  ${values};`;
};

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line, dataset: app.dataset, startedAt: new Date().toISOString(), rows: {}};
    const {page, close} = await launch(app);

    const users = page.getByRole('table', {name: /^Current Users \(/});
    const rowOf = (username) => users.locator('tbody tr').filter({hasText: `${username}@mailinator.com`});
    const openList = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/access`));
        await expect(users.locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
    };

    // The accessibility tree under one element: its own role and name, and
    // every node below it (ignored nodes with the browser's reason).
    const axUnder = async (locator) => {
        await locator.evaluate((el) => el.setAttribute('data-r43-probe', '1'));
        const cdp = await page.context().newCDPSession(page);
        try {
            await cdp.send('DOM.enable');
            await cdp.send('Accessibility.enable');
            const {result} = await cdp.send('Runtime.evaluate', {expression: 'document.querySelector("[data-r43-probe]")'});
            const {node} = await cdp.send('DOM.describeNode', {objectId: result.objectId});
            const {nodes} = await cdp.send('Accessibility.getFullAXTree');
            const byId = new Map(nodes.map((n) => [n.nodeId, n]));
            const root = nodes.find((n) => n.backendDOMNodeId === node.backendNodeId);
            const out = [];
            const walk = (n, depth) => {
                if (!n) return;
                const reasons = (n.ignoredReasons || []).map((r) => r.name).join(',');
                out.push(`${'  '.repeat(depth)}${n.role?.value || '?'}${n.name?.value ? ` "${n.name.value}"` : ' (no name)'}${n.ignored ? ` [ignored: ${reasons}]` : ''}`);
                for (const c of n.childIds || []) walk(byId.get(c), depth + 1);
            };
            walk(root, 0);
            return {role: root?.role?.value, name: root?.name?.value ?? null, tree: out,
                unnamedImages: out.filter((l) => /^\s*(image|img|graphics-symbol|graphics-document|svgroot)\b.*\(no name\)/i.test(l) && !/ignored/.test(l)).length};
        } finally {
            await locator.evaluate((el) => el.removeAttribute('data-r43-probe')).catch(() => {});
            await cdp.detach().catch(() => {});
        }
    };
    // One row's "Name" cell: text, the icons drawn (size on screen), the a11y tree.
    const readNameCell = async (username) => {
        const cell = rowOf(username).locator('td').first();
        await expect(cell).toBeVisible({timeout: 15_000});
        const drawn = await cell.evaluate((td) => [...td.querySelectorAll('svg')].map((svg) => {
            const r = svg.getBoundingClientRect();
            const wrap = svg.closest('[aria-hidden]');
            return {w: Math.round(r.width), h: Math.round(r.height), color: getComputedStyle(svg).color,
                ariaHidden: wrap ? wrap.getAttribute('aria-hidden') : null};
        }));
        const srOnly = await cell.evaluate((td) => [...td.querySelectorAll('.sr-only')].map((s) => s.textContent.trim()));
        return {text: flat(await cell.innerText()), icons: drawn, srOnly, ax: await axUnder(cell),
            ariaSnapshot: await cell.ariaSnapshot()};
    };
    const rowMenu = async (username) => {
        await rowOf(username).getByRole('button').last().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10_000});
        const items = (await page.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
        await closeMenu(page);
        await sleep(300);
        return items;
    };

    try {
        // Precondition: the ORCID iD.
        sql(app, orcidSql(ORCID_USER[0]));
        facts.orcidStored = sql(app, `SELECT setting_name || '=' || setting_value FROM user_settings WHERE user_id = (SELECT user_id FROM users WHERE username = '${ORCID_USER[0]}') AND setting_name LIKE 'orcid%' ORDER BY setting_name`);

        // 1-2.
        await signIn(page, 'rvaca');
        await openList();
        facts.heading = (flat((await screen(page)).text.main).match(/Current Users \(\d+\)/) || [null])[0];

        // 3. Disable David Buskins.
        await expect(rowOf(DISABLED_USER[0])).toBeVisible({timeout: 15_000});
        await rowOf(DISABLED_USER[0]).getByRole('button').last().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10_000});
        facts.menuBefore = (await page.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
        await page.getByRole('menuitem', {name: 'Disable User', exact: true}).click();
        const dlg = page.getByRole('dialog').last();
        const box = dlg.locator('textarea[name="disableReason"]');
        await expect(box).toBeVisible({timeout: 20_000});
        await idle(page);
        facts.disableTitle = flat(((await screen(page)).text.dialog || '').split('\n')[0]);
        await box.fill('u53r43 test');
        const post = page.waitForResponse((x) => /\/disable-user/.test(x.url()) && x.request().method() === 'POST', {timeout: 30_000});
        await dlg.getByRole('button', {name: 'OK', exact: true}).click();
        facts.disableStatus = (await post).status();
        await idle(page);
        await sleep(800);
        facts.disabledStored = sql(app, `SELECT disabled FROM users WHERE username = '${DISABLED_USER[0]}'`);
        // The list as it stands after the disable, and after a reload.
        facts.rows.afterDisableNoReload = await readNameCell(DISABLED_USER[0]);
        await openList();
        record('users-list', await screen(page));

        // 4-5. The two cells and the neighbour, as drawn and as the a11y tree has them.
        for (const [username] of [DISABLED_USER, ORCID_USER, PLAIN_USER]) {
            facts.rows[username] = await readNameCell(username);
        }

        // Control: the row menus tell the disabled state apart.
        facts.menuDisabled = await rowMenu(DISABLED_USER[0]);
        facts.menuOrcid = await rowMenu(ORCID_USER[0]);

        // Neighbour: every other named control on the tab.
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Accessibility.enable');
        const {nodes} = await cdp.send('Accessibility.getFullAXTree');
        await cdp.detach();
        facts.otherNamed = nodes.filter((n) => !n.ignored && n.name?.value)
            .filter((n) => ['button', 'searchbox', 'textbox', 'heading', 'table', 'tab', 'link', 'columnheader'].includes(n.role?.value))
            .map((n) => `${n.role.value}: ${n.name.value}`);
        facts.cellNames = nodes.filter((n) => !n.ignored && ['cell', 'gridcell'].includes(n.role?.value) && n.name?.value)
            .map((n) => n.name.value).filter((v) => /Inoue|Buskins|Vaca/.test(v));
    } catch (e) {
        facts.error = String(e && e.stack || e).slice(0, 800);
        throw e;
    } finally {
        record('facts', facts);
        const brief = (r) => r && {text: r.text, axName: r.ax?.name, unnamedImages: r.ax?.unnamedImages, icons: (r.icons || []).length, srOnly: r.srOnly};
        console.log(JSON.stringify({app: app.name, line: app.line, heading: facts.heading, disable: facts.disableStatus,
            disabledStored: facts.disabledStored, dbuskins: brief(facts.rows.dbuskins), minoue: brief(facts.rows.minoue),
            rvaca: brief(facts.rows.rvaca), menuDisabled: facts.menuDisabled, menuOrcid: facts.menuOrcid,
            otherNamed: (facts.otherNamed || []).length, cellNames: facts.cellNames}));
        await close();
    }
});
