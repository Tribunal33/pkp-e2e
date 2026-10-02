// Neighbour check for the fix of docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md:
// what the fix must leave alone, walked with the fix in and out on PKP's default test dataset, as
// `rvaca`. The fix changes only the keys of the "Roles" list's rows, so the rows each page and each
// filter lists, the count lines, the greyed boxes of the manager row and the whole-list redraw after
// a role's "Edit" › "OK" must read the same either way:
//   1. the list at the journal's default "Items per page", then "10" and its page "2" (not on a
//      preprint server): the role names of each page and the count lines;
//   2. "Search" › "With permission level set to" "Assistant": the names and the count line;
//   3. the manager role's row: each stage box's look (greyed out);
//   4. the Copyeditor's (OPS: Editorial Board Member's) "Edit" › "OK" with nothing changed: the
//      notice, the count line and the names after the list redraws.
// Reset first:  npm run fleet-prep -- --feature issues-u54a --dataset 1 --reset
// Run:          PROBE_RUN=<fixed|unfixed> PROBE_FEATURE=issues-u54a PROBE_AGENT=u54a node bin/probe.js all shared/playwright/checks/issues/roles-list-first-row-no-edit-stale-rows/neighbour.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const H = require('./lib.js');

const names = (state) => state.rows.map((r) => r.name);

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const tab = H.rolesTab(page, app);

        // 1. Paging.
        await tab.goto();
        const all = await H.listState(tab);
        facts.default = {pagingLine: all.pagingLine, names: names(all).slice().sort(), arrows: all.rows.filter((r) => r.arrow).length};
        if (all.itemsPerPageShown) {
            await tab.chooseItemsPerPage('10');
            const p1 = await H.listState(tab);
            await tab.gotoListPage('2');
            const p2 = await H.listState(tab);
            const union = [...names(p1), ...names(p2)];
            facts.per10 = {
                page1Line: p1.pagingLine,
                page2Line: p2.pagingLine,
                page1Count: p1.rows.length,
                page2Count: p2.rows.length,
                duplicates: union.filter((n, i) => union.indexOf(n) !== i),
                missing: names(all).filter((n) => !union.includes(n)),
            };
        }

        // 2. A level filter.
        await tab.reload();
        await tab.chooseFilter('level', 'Assistant');
        const assistants = await H.listState(tab);
        facts.levelAssistant = {pagingLine: assistants.pagingLine, names: names(assistants).slice().sort()};

        // 3. The manager row's boxes.
        await tab.reload();
        facts.managerBoxes = await tab.boxStates(c.manager);

        // 4. "Edit" › "OK" with nothing changed: the whole list redraws.
        await screen(page);
        const win = await tab.openEdit(c.boxRole);
        facts.editTitleName = await win.nameBox().inputValue();
        facts.editSave = (await win.save()).status();
        await idle(page);
        facts.editNotices = (await screen(page)).notices;
        const after = await H.listState(tab);
        facts.afterEdit = {pagingLine: after.pagingLine, names: names(after).slice().sort(), arrows: after.rows.filter((r) => r.arrow).length};
        facts.afterEditSameRoles = JSON.stringify(facts.afterEdit.names) === JSON.stringify(facts.default.names);
        record('neighbour', facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record('neighbour', facts);
        throw error;
    } finally {
        await close();
    }
});
