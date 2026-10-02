// Issue report docs/issues/U54-A13-roles-list-order-moves-and-pages-repeat.md (U54 A13): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), on its own context `publicknowledge`, as its
// managers `rvaca` and `admin`. The kit builds nothing.
//   A saved role moves down (steps 1-4): `rvaca` reads the "Roles" list, ticks "Consider role in
//      masthead list" in "Copyeditor"'s "Edit" window (OPS: "Author") and presses "OK"; the list
//      is read at once and after a reload.
//   Two managers, a paged list (steps 5-7; OJS and OMP, a preprint server's five roles show no
//      "Items per page:"): `rvaca` chooses "10" per page; `admin`, in a second browser, ticks the
//      same box in "Production editor"'s window and presses "OK"; `rvaca` presses page "2".
// Afterwards (not a step) the whole list is read once more after a reload.
//
// Reset first:  npm run fleet-prep -- --feature issues-u54d --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u54d PROBE_AGENT=u54d node bin/probe.js all shared/playwright/checks/issues/roles-list-order-moves-and-pages-repeat/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u54d-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u54d-3_5 PROBE_AGENT=u54d node bin/probe.js all shared/playwright/checks/issues/roles-list-order-moves-and-pages-repeat/walk.js
// Facts: .reports/<feature>/u54d/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const tab = H.rolesTab(page, app);

        // 1. The list as the dataset holds it.
        await tab.goto();
        facts.step1 = await H.listed(tab);
        facts.step1.savedAt = H.place(facts.step1.names, c.saved);
        record('01-list', await screen(page));

        // 2-3. "Edit", the masthead box ticked, "OK".
        facts.step3 = await H.saveOption(tab, c.saved, H.MASTHEAD, true);
        facts.step3.savedAt = H.place(facts.step3.listAfter.names, c.saved);
        record('02-after-ok', await screen(page));
        await shot(page, '02-after-ok');

        // 4. A reload.
        await tab.reload();
        facts.step4 = await H.listed(tab);
        facts.step4.savedAt = H.place(facts.step4.names, c.saved);
        record('03-after-reload', await screen(page));

        if (c.other) {
            // 5. "Items per page:" 10.
            await tab.chooseItemsPerPage('10');
            facts.step5 = await H.listed(tab);
            facts.step5.otherAt = H.place(facts.step5.names, c.other);
            record('04-page1', await screen(page));

            // 6. A second manager saves a role in another browser.
            const second = await launch(app);
            try {
                await signIn(second.page, c.otherManager);
                const tab2 = H.rolesTab(second.page, app);
                await tab2.goto();
                facts.step6 = await H.saveOption(tab2, c.other, H.MASTHEAD, true);
                facts.step6.otherAt = H.place(facts.step6.listAfter.names, c.other);
            } finally {
                await second.close();
            }

            // 7. Page 2 in the first browser.
            await tab.gotoListPage('2');
            facts.step7 = await H.listed(tab);
            facts.step7.overlap = H.overlap(facts.step5.names, facts.step7.names, facts.step4.names);
            record('05-page2', await screen(page));
            await shot(page, '05-page2');
        }

        // Not a step: the whole list once more.
        await tab.reload();
        facts.end = await H.listed(tab);
    } finally {
        record('walk', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
