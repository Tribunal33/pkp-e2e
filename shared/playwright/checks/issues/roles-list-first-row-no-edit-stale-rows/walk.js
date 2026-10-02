// Issue report docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md (U54 A1, A5):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), as the dataset's manager `rvaca`, on its own
// context `publicknowledge`. The kit builds nothing; the one role the steps need is made with
// "Create New Role".
//   The first row (steps 1-4): every row's "Settings" arrow on page 1; the second row's arrow
//      opened; "Items per page:" "10" and page "2" (not on a preprint server, five roles);
//      "Search" › "List roles assigned to" "Production".
//   A stage box pressed twice (steps 5-9): the Copyeditor's (OPS: Editorial Board Member's)
//      "Production" box pressed twice; a reload; pressed twice again.
//   A removed role (steps 10-13): "Create New Role" "u54a Spare desk"; "Remove" › "OK" twice; a
//      reload.
// Besides the screens it reads each request's answer the browser received.
//
// Reset first:  npm run fleet-prep -- --feature issues-u54a --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u54a PROBE_AGENT=u54a node bin/probe.js all shared/playwright/checks/issues/roles-list-first-row-no-edit-stale-rows/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u54a-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u54a-3_5 PROBE_AGENT=u54a node bin/probe.js all shared/playwright/checks/issues/roles-list-first-row-no-edit-stale-rows/walk.js
// Facts: .reports/<feature>/u54a/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const tab = H.rolesTab(page, app);

        // 1-2. Page 1 of the list, and the second row's arrow.
        await tab.goto();
        facts.page1 = await H.listState(tab);
        record('01-page1', await screen(page));
        await shot(page, '01-page1');
        const secondName = facts.page1.rows[1] && facts.page1.rows[1].name;
        if (secondName) {
            facts.secondRowActions = {name: secondName, labels: await tab.rowActionLabels(secondName)};
        }

        // 3. "Items per page:" 10, page 2.
        if (facts.page1.itemsPerPageShown) {
            await tab.chooseItemsPerPage('10');
            facts.per10page1 = await H.listState(tab);
            await tab.gotoListPage('2');
            facts.per10page2 = await H.listState(tab);
            record('02-page2', await screen(page));
            await shot(page, '02-page2');
        } else {
            facts.per10 = 'no "Items per page:" on this list';
        }

        // 4. "Search" › "List roles assigned to" "Production".
        await tab.reload();
        await tab.chooseFilter('stage', 'Production');
        facts.filteredProduction = await H.listState(tab);
        record('03-filtered', await screen(page));
        await shot(page, '03-filtered');

        // 5-8. A stage box pressed twice, then a reload.
        await tab.reload();
        await screen(page); // drop the notices of earlier steps
        facts.boxPress1 = await H.pressBox(page, tab, c.boxRole, c.boxStage);
        record('04-box-pressed-once', await screen(page));
        await shot(page, '04-box-pressed-once');
        facts.boxPress2 = await H.pressBox(page, tab, c.boxRole, c.boxStage);
        record('05-box-pressed-twice', await screen(page));
        await shot(page, '05-box-pressed-twice');
        facts.boxPress3 = await H.pressBox(page, tab, c.boxRole, c.boxStage); // "once more": not pressed when greyed
        await tab.reload();
        facts.boxAfterReload = (await tab.boxStates(c.boxRole))[c.boxStage];

        // 9. The ticked box pressed twice.
        await screen(page);
        facts.untickPress1 = await H.pressBox(page, tab, c.boxRole, c.boxStage);
        facts.untickPress2 = await H.pressBox(page, tab, c.boxRole, c.boxStage);
        await tab.reload();
        facts.boxAfterSecondReload = (await tab.boxStates(c.boxRole))[c.boxStage];

        // 10. "Create New Role".
        const win = await tab.openCreate();
        await win.chooseLevel(H.NEW_ROLE.level);
        await win.nameBox().fill(H.NEW_ROLE.name);
        await win.abbrevBox().fill(H.NEW_ROLE.abbrev);
        facts.create = {status: (await win.save()).status()};
        await idle(page);
        facts.afterCreate = await H.listState(tab);
        facts.createNotices = (await screen(page)).notices;

        // 11. "Remove" › "OK".
        let dialog;
        try {
            dialog = await tab.openRemove(H.NEW_ROLE.name);
        } catch (error) {
            facts.removeUnreachable = String(error.message || error).slice(0, 400);
        }
        if (dialog) {
            facts.remove1 = {status: (await dialog.ok()).status()};
            await idle(page);
            facts.remove1.notices = (await screen(page)).notices;
            facts.remove1.rowStillListed = await tab.row(H.NEW_ROLE.name).count();
            record('06-removed-once', await screen(page));
            await shot(page, '06-removed-once');

        }

        // 12. "Remove" › "OK" on the same row again, while the row is still listed (with the fix,
        // and on 3.5, it has left). The window may stay open when the removal fails: read it, then
        // "Cancel".
        if (dialog && facts.remove1.rowStillListed) {
            dialog = await tab.openRemove(H.NEW_ROLE.name);
            const answer = page.waitForResponse((r) => r.url().includes('remove-user-group'), {timeout: 30_000});
            await dialog.okButton.click();
            facts.remove2 = {status: (await answer).status()};
            await idle(page);
            facts.remove2.confirmStillOpen = await dialog.dialog.isVisible();
            const shown = await screen(page);
            facts.remove2.notices = shown.notices;
            facts.remove2.rowStillListed = await tab.row(H.NEW_ROLE.name).count();
            record('07-removed-twice', shown);
            await shot(page, '07-removed-twice');
            if (facts.remove2.confirmStillOpen) {
                await dialog.cancel();
            }
        }

        // 13. Reload.
        await tab.reload();
        facts.afterReload = {rowListed: await tab.row(H.NEW_ROLE.name).count(), pagingLine: await tab.pagingLine()};
        record('walk', facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record('walk', facts);
        throw error;
    } finally {
        await close();
    }
});
