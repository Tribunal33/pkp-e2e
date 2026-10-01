// Issue report walk: docs/issues/U54-A13-roles-list-order-changes.md (spec
// U54 register A13). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// signed in as `rvaca` (the context's manager):
//   Saving a role: 1-2 Settings › Users & Roles › "Roles" (the order on
//     landing); 3-4 "Copyeditor" (OPS: "Author") › "Edit", tick "Consider
//     role in masthead list", "OK"; 5 reload.
//   Two pages (OJS, OMP): 6 "Items per page" 10; 7 in a second tab,
//     "Designer" › "Edit", tick the same box, "OK"; 8 the first tab's page
//     link "2".
// Neighbour (the paths a fix must leave alone), after step 8: the first
// tab reloaded, the level filter "Assistant" and the stage filter
// "Production" (rows and count line), and paging at 10 per page (both pages,
// no role twice or missing). The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   npm run fleet-prep -- --feature issues-w50 --dataset 6 --reset
//   PROBE_FEATURE=issues-w50 PROBE_AGENT=w50 node bin/probe.js all shared/playwright/checks/issues/roles-list-order-changes/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w50-3_5 --dataset 6 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w50-3_5 PROBE_AGENT=w50 node bin/probe.js all shared/playwright/checks/issues/roles-list-order-changes/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix.diff ojs omp ops), run with PROBE_RUN=fix.
// Facts: .reports/<feature>/w50/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const MASTHEAD = 'Consider role in masthead list';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const SAVED = app.name === 'ops' ? 'Author' : 'Copyeditor';
    const SECOND = 'Designer';
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (p, name) => {
        const s = await screen(p);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(p, `${String(n).padStart(2, '0')}-${name}`);
        return s;
    };
    const notices = async (p) => ((await p.locator('.app__notifications').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    // Save a role's window with the masthead box ticked.
    const saveWithMasthead = async (tab, name) => {
        const win = await tab.openEdit(name);
        const box = win.optionBox(MASTHEAD);
        const before = await box.isChecked();
        await box.check();
        const r = await win.save();
        await pause(800);
        return {wasTicked: before, status: r.status(), notice: await notices(tab.page)};
    };
    try {
        await signIn(page, 'rvaca');
        const roles = new RolesTab(page, app.contextPath, {stages: []});
        await roles.goto();
        const landing = await roles.rowNames();
        fact('02-order on landing', landing);
        fact('02-paging line', await roles.pagingLine());
        await snap(page, 'roles-landing');

        // Saving a role.
        fact('04-save', await saveWithMasthead(roles, SAVED));
        const afterSave = await roles.rowNames();
        fact('04-order after OK', afterSave);
        fact('04-position', {before: landing.indexOf(SAVED) + 1, after: afterSave.indexOf(SAVED) + 1, of: afterSave.length});
        await snap(page, 'after-ok');
        await roles.reload();
        const afterReload = await roles.rowNames();
        fact('05-order after reload', afterReload);
        fact('05-position', afterReload.indexOf(SAVED) + 1);
        await snap(page, 'after-reload');

        // Two pages.
        if (await roles.itemsPerPage.isVisible()) {
            await roles.chooseItemsPerPage('10');
            const page1 = await roles.rowNames();
            fact('06-page 1', {line: await roles.pagingLine(), rows: page1});
            await snap(page, 'page-1');

            const page2tab = await page.context().newPage();
            const other = new RolesTab(page2tab, app.contextPath, {stages: []});
            await other.goto();
            fact('07-second tab save', await saveWithMasthead(other, SECOND));
            fact('07-second tab order', await other.rowNames());
            await snap(page2tab, 'second-tab-after-ok');
            await page2tab.close();

            await page.bringToFront();
            await roles.gotoListPage('2');
            const p2 = await roles.rowNames();
            fact('08-page 2', {line: await roles.pagingLine(), rows: p2});
            const all = new Set([...page1, ...p2]);
            fact('08-pages compared', {
                onBoth: page1.filter((r) => p2.includes(r)),
                onNeither: afterReload.filter((r) => !all.has(r)),
            });
            await snap(page, 'page-2');
        } else {
            fact('06-paging', 'no "Items per page:" on this list');
        }

        // Neighbour: the filters and the paging, on a fresh read.
        await roles.reload();
        const fresh = await roles.rowNames();
        fact('N1-order on a fresh read', fresh);
        await roles.chooseFilter('level', 'Assistant');
        fact('N2-level Assistant', {line: await roles.pagingLine(), rows: await roles.rowNames()});
        await roles.reload();
        const stageOptions = await (async () => { await roles.openFilters(); return roles.filterOptions('stage'); })();
        const production = stageOptions.find((o) => /Production/.test(o));
        await roles.chooseFilter('stage', production);
        fact('N3-stage Production', {line: await roles.pagingLine(), rows: await roles.rowNames()});
        await snap(page, 'N3-stage-filter');
        await roles.reload();
        if (await roles.itemsPerPage.isVisible()) {
            await roles.chooseItemsPerPage('10');
            const a = await roles.rowNames();
            const lineA = await roles.pagingLine();
            await roles.gotoListPage('2');
            const b = await roles.rowNames();
            fact('N4-paging, nothing saved between', {page1: {line: lineA, rows: a}, page2: {line: await roles.pagingLine(), rows: b},
                onBoth: a.filter((r) => b.includes(r)), onNeither: fresh.filter((r) => !a.includes(r) && !b.includes(r))});
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
