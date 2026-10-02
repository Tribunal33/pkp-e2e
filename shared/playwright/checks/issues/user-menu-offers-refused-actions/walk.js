// U53 A1, A2 walk (issue report docs/issues/U53-A1-A2-user-menu-offers-refused-actions.md).
// On PKP's default test dataset, as `rvaca` (the context's manager), Settings > Users & Roles:
//   steps (default): the row "admin admin" (the Site Administrator): its "…" menu; "Disable User"
//     and the window it opens; "Remove User" > "OK" and the dialog that follows, with the
//     request's answer; a reload and the row again. Control: the row of Daniel Barnes (dbarnes),
//     its menu and the "Disable User" window (left with "Cancel").
//   nb (neighbour, alone): what the fix must leave alone. N1 as rvaca on dbarnes's row: the menu,
//     "Disable User" submitted with a reason, then "Enable User" on the same row (left with
//     "Cancel"), then "Remove User" > "OK". N2 as admin (Site Administrator) on rvaca's row: the
//     menu and the "Disable User" window (left with "Cancel"); and the row "admin admin" (own row).
// Each step records what it finds and goes on: with the fix in, an action may be absent.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/user-menu-offers-refused-actions/walk.js [nb]
// 3.5:          PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<line feature> PROBE_AGENT=<id> node bin/probe.js all …/walk.js
// Facts: .reports/<feature>/<id>/a1a2-walk[-<run>]-<app>.json (steps) or a1a2-nb[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');

const mode = process.argv[2] === 'nb' ? 'nb' : 'steps';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode};
    const name = mode === 'nb' ? 'a1a2-nb' : 'a1a2-walk';
    const {page, close} = await launch(app);
    try {
        if (mode === 'steps') {
            // 1–2. rvaca opens Users & Roles
            await signIn(page, 'rvaca');
            let list = await H.openList(page, app);
            record('01-users', await screen(page));

            // 3. the Site Administrator's row and its menu
            let row = await H.findRow(page, list, 'admin', 'pkpadmin@mailinator.com');
            facts.admin = await H.rowFacts(list, row);
            await list.openMenu(row);
            record('02-admin-menu', await screen(page));
            await shot(page, '02-admin-menu');
            await list.closeMenu(row);

            // 4. "Disable User"
            if (facts.admin.menu.includes('Disable User')) {
                facts.disable = await H.disableWindow(page, list, row, {label: 'Disable User', title: 'Disable admin admin'});
                record('03-disable-window', {facts: facts.disable});
            } else facts.disable = 'not offered';

            // 5. "Remove User" > "OK"
            if (facts.admin.menu.includes('Remove User')) {
                facts.remove = await H.removeUser(page, list, row);
                record('04-after-remove', await screen(page));
                await shot(page, '04-after-remove');
            } else facts.remove = 'not offered';

            // 6. reload, the row again
            list = await H.openList(page, app);
            row = await H.findRow(page, list, 'admin', 'pkpadmin@mailinator.com');
            facts.adminAfterReload = await H.rowFacts(list, row);

            // Control: Daniel Barnes's row
            list = await H.openList(page, app);
            row = await H.findRow(page, list, 'Barnes', 'dbarnes@mailinator.com');
            facts.control = await H.rowFacts(list, row);
            if (facts.control.menu.includes('Disable User')) {
                facts.control.disable = await H.disableWindow(page, list, row, {label: 'Disable User', title: 'Disable Daniel Barnes'});
            }
        } else {
            // N1. rvaca on dbarnes's row: Disable (submitted), Enable (cancelled), Remove
            await signIn(page, 'rvaca');
            let list = await H.openList(page, app);
            let row = await H.findRow(page, list, 'Barnes', 'dbarnes@mailinator.com');
            facts.n1 = {before: await H.rowFacts(list, row)};
            if (facts.n1.before.menu.includes('Disable User')) {
                facts.n1.disable = await H.disableWindow(page, list, row, {label: 'Disable User', title: 'Disable Daniel Barnes', submit: 'u53r1 neighbour'});
                list = await H.openList(page, app);
                row = await H.findRow(page, list, 'Barnes', 'dbarnes@mailinator.com');
                facts.n1.afterDisable = await H.rowFacts(list, row);
                if (facts.n1.afterDisable.menu.includes('Enable User')) {
                    facts.n1.enable = await H.disableWindow(page, list, row, {label: 'Enable User', title: 'Enable Daniel Barnes'});
                }
            }
            if (facts.n1.before.menu.includes('Remove User')) {
                list = await H.openList(page, app);
                row = await H.findRow(page, list, 'Barnes', 'dbarnes@mailinator.com');
                facts.n1.remove = await H.removeUser(page, list, row);
                list = await H.openList(page, app);
                row = await H.findRow(page, list, 'Barnes', 'dbarnes@mailinator.com');
                facts.n1.afterRemove = await H.rowFacts(list, row);
            }
            record('n1-dbarnes', await screen(page));

            // N2. admin (Site Administrator) on rvaca's row and on the own row
            await signOut(page);
            await signIn(page, 'admin');
            list = await H.openList(page, app);
            row = await H.findRow(page, list, 'Vaca', 'rvaca@mailinator.com');
            facts.n2 = {rvaca: await H.rowFacts(list, row)};
            if (facts.n2.rvaca.menu.includes('Disable User')) {
                facts.n2.disable = await H.disableWindow(page, list, row, {label: 'Disable User', title: 'Disable Ramiro Vaca'});
            }
            list = await H.openList(page, app);
            row = await H.findRow(page, list, 'admin', 'pkpadmin@mailinator.com');
            facts.n2.own = await H.rowFacts(list, row);
            record('n2-admin', await screen(page));
        }
        record(name, facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record(name, facts);
        throw error;
    } finally {
        await close();
    }
});
