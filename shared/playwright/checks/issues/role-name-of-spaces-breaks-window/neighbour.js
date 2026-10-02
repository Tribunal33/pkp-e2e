// Neighbour check of fix.diff (issue report docs/issues/U54-A10-role-name-of-spaces-breaks-window.md):
// what the fix moves (the stage list, the role's id and level, the Settings guard) must still
// show on the window's first draw, and an ordinary save must still save. Walked with the fix
// in and out, each time on a freshly reset dataset fleet.
//   a. `rvaca`: "Copyeditor" (OPS: "Author") > "Edit": its level, its stage boxes, its id; "Cancel".
//   b. `rvaca`: "Create New Role" with "Role Name" left empty, "OK": refused in the browser, nothing sent.
//   c. `dbarnes` (OJS, OMP): "Edit" on his own "Journal editor" / "Press editor": "Permit changes
//      to Settings" ticked and greyed (his only Settings role); "Cancel". The dataset's preprint
//      server has no such role.
//   d. `rvaca`: "Copyeditor" > "Edit", "Abbreviation" changed, "OK": saved, and stored.
//
// Reset first:  npm run fleet-prep -- --feature issues-u54g --dataset 4 --reset
// Run:          PROBE_RUN=<fix|nofix> PROBE_FEATURE=issues-u54g PROBE_AGENT=u54g node bin/probe.js all shared/playwright/checks/issues/role-name-of-spaces-breaks-window/neighbour.js
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const H = require('./lib.js');

const OWN = {ojs: 'Journal editor', omp: 'Press editor', ops: null};

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const tab = H.rolesTab(page, app);
        await tab.goto();

        // a.
        let win = await tab.openEdit(c.edited);
        facts.a = await H.windowState(win);
        facts.a.ticked = await win.stageBoxes().evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value));
        await win.cancel();

        // b.
        win = await tab.openCreate();
        let sent = false;
        const onReq = (r) => { if (r.url().includes('update-user-group')) sent = true; };
        page.on('request', onReq);
        await win.abbrevBox().fill('U54G');
        await win.pressOk();
        await page.locator('form#userGroupForm label.error:visible').first().waitFor({timeout: 10_000}).catch(() => {});
        page.off('request', onReq);
        facts.b = {sent, window: await H.windowState(win)};
        await win.cancel();

        // c.
        if (OWN[app.name]) {
            const other = await launch(app);
            try {
                await signIn(other.page, 'dbarnes');
                const tab2 = H.rolesTab(other.page, app);
                await tab2.goto();
                const w2 = await tab2.openEdit(OWN[app.name]);
                const box = w2.optionBox('Permit changes to Settings');
                facts.c = {role: OWN[app.name], checked: await box.isChecked(), disabled: await box.isDisabled()};
                await w2.cancel();
            } finally {
                await other.close();
            }
        }

        // d.
        await tab.goto();
        win = await tab.openEdit(c.edited);
        await win.abbrevBox().fill(`${c.abbrev}X`);
        facts.d = {ok: await H.pressOk(page, win)};
        facts.d.windowOpen = (await win.form.count()) > 0;
        facts.d.stored = sql(app, `select s.setting_value from user_group_settings s where s.setting_name = 'abbrev' and s.locale = 'en' and s.user_group_id = (select user_group_id from user_group_settings where setting_name = 'name' and locale = 'en' and setting_value = '${c.edited}' limit 1)`).trim();
        record('d-after-save', await screen(page));
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
