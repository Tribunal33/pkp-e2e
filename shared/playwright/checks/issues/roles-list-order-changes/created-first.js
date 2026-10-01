// Diagnostic beside walk.js (docs/issues/U54-A13-roles-list-order-changes.md,
// Cause): a role just created on a journal can be listed first. Not one of
// the report's Steps, because one action is the database's own maintenance
// (`VACUUM user_groups`, what PostgreSQL's autovacuum runs by itself once
// enough rows of the table have changed); everything else goes through the
// screens, signed in as `admin`:
//   1 publicknowledge › Users & Roles › "Roles" › "Create New Role":
//     Assistant, "u54w50 Spare desk" / "u54w50";
//   2 Administration › Hosted Journals (Presses, Servers) › Create: "u54w50
//     Second", path u54w50, enabled (its roles are stored after step 1's);
//   3 publicknowledge: "u54w50 Spare desk" › "Remove" › "OK";
//   4 VACUUM user_groups (the space step 1's row held becomes free);
//   5 u54w50 › Users & Roles › "Roles" › "Create New Role": Assistant,
//     "u54w50 Data editor" / "u54w50de". The list read after the save and
//     after a reload: where the new role is, and whether its row has the
//     "Settings" arrow. The rows' storage positions (ctid) are read too.
// Run on a freshly reset dataset fleet (it creates a context):
//   npm run fleet-prep -- --feature issues-w50 --dataset 6 --reset
//   PROBE_RUN=first PROBE_FEATURE=issues-w50 PROBE_AGENT=w50 node bin/probe.js all shared/playwright/checks/issues/roles-list-order-changes/created-first.js
// (stable-3_5_0: PKP_E2E_LINE=stable-3_5_0, feature issues-w50-3_5, PROBE_RUN=first35.)
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const {createSecondContext} = require('../language-block-lands-on-site-home/lib.js');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('created-first.js drives a dataset fleet (fleet-prep --dataset)');
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const ctx = app.contextTables;
    const storage = () => sql(app, `select ug.ctid, ug.user_group_id, c.path, coalesce(s.setting_value, '') from user_groups ug
        left join ${ctx.table} c on c.${ctx.id} = ug.context_id
        left join user_group_settings s on s.user_group_id = ug.user_group_id and s.setting_name = 'name' and s.locale = 'en'
        where ug.ctid >= '(0,18)' order by ug.ctid`).split('\n');
    const create = async (roles, name, abbrev) => {
        const win = await roles.openCreate();
        const assistant = (await win.levelOptions()).find((l) => /^Assistant$/.test(l));
        await win.chooseLevel(assistant);
        await win.nameBox('en').fill(name);
        await win.abbrevBox('en').fill(abbrev);
        const r = await win.save();
        await pause(800);
        return r.status();
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        const home = new RolesTab(page, app.contextPath, {stages: []});
        await home.goto();
        fact('1-create spare', await create(home, 'u54w50 Spare desk', 'u54w50'));
        fact('2-second context', await createSecondContext(page, app, {path: 'u54w50', name: 'u54w50 Second'}));
        await home.goto();
        const dialog = await home.openRemove('u54w50 Spare desk');
        const removed = await dialog.ok();
        await pause(800);
        fact('3-remove spare', {status: removed.status()});
        fact('3-storage before vacuum (from (0,18))', storage());
        sql(app, 'VACUUM user_groups');
        const second = new RolesTab(page, 'u54w50', {stages: []});
        await second.goto();
        fact('5-order before', await second.rowNames());
        fact('5-create', await create(second, 'u54w50 Data editor', 'u54w50de'));
        const read = async (label) => {
            const first = second.rows().first();
            fact(label, {rows: await second.rowNames(),
                firstRowArrow: await first.locator('a.show_extras, a.hide_extras').count(),
                newRoleArrow: await second.arrow('u54w50 Data editor').count()});
        };
        await read('5-order after OK');
        await second.reload();
        await read('5-order after reload');
        await shot(page, 'created-first');
        record('created-first-screen', await screen(page));
        fact('5-storage (from (0,18))', storage());
    } finally {
        record('facts-first', facts);
        await close();
    }
});
