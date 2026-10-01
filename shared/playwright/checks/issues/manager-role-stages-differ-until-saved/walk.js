// Issue report walk: spec U54 register A2 and A3 (one cause): a Journal
// Manager-level role's stages on Settings › Users & Roles › "Roles".
// Takes the report's Steps through the screens on a dataset fleet (PKP's
// default test dataset, harness.md "Dataset fleets"):
//   C0  `dbarnes` opens submission 17 (OMP 14; Done) — the control before any save
//   1-3 `rvaca`: Settings › Users & Roles › "Roles": the manager-level rows' boxes
//   4   "Search" › "List roles assigned to" › "Submission": the rows kept
//   5   submission 4 (OMP 3) › Participants › "Assign": the role list
//   6-7 "Production editor" › "Edit" › "OK" with nothing changed: the row
//   8   reload, the "Submission" filter again
//   9   submission 4 (OMP 3) › "Assign": the role list again
//   10  "Journal editor" ("Press editor") › "Edit" › "OK" with nothing changed
//   11  `dbarnes` opens submission 17 (OMP 14) again
// OPS has no "Production editor" and its manager row is the list's first
// row on main (no "Edit", U54 A1): it walks 1-4 and C0/11 (submission 2) as
// the control. Group stage rows are read before and after with sql() as
// evidence only (reads; nothing is written outside the screens).
// The neighbour check (a fix must not reach further): NEIGHBOUR=1 runs the
// window of a role below the manager level ("Section editor"; OMP "Series
// editor"; OPS "Moderator") › "Edit" › "OK" with nothing changed: its row's
// boxes stay as they were.
// MANAGER=1 runs the manager role's own window instead: "Edit" › "OK" with
// nothing changed, then its row, the first stage's filter and the stored
// stages (on main the row has no "Edit", U54 A1, and that is recorded).
// The kit builds nothing.
//
// Run (main, then stable-3_5_0); reset the fleet first:
//   npm run fleet-prep -- --feature issues-w47 --dataset 3 --reset
//   PROBE_FEATURE=issues-w47 PROBE_AGENT=w47 node bin/probe.js all shared/playwright/checks/issues/manager-role-stages-differ-until-saved/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w47-3_5 --dataset 3 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w47-3_5 PROBE_AGENT=w47 node bin/probe.js all shared/playwright/checks/issues/manager-role-stages-differ-until-saved/walk.js
// With the fix applied (node bin/try-fix.js apply …/fix-<app>.diff <app>), PROBE_RUN=fix.
// Facts: .reports/<feature>/w47/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

const NAMES = {
    ojs: {manager: 'Journal manager', editor: 'Journal editor', production: 'Production editor', sub: 'Section editor',
        stages: ['Submission', 'Review', 'Copyediting', 'Production'], assignSubmission: 4, doneSubmission: 17},
    omp: {manager: 'Press manager', editor: 'Press editor', production: 'Production editor', sub: 'Series editor',
        stages: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'], assignSubmission: 3, doneSubmission: 14},
    ops: {manager: 'Preprint Server manager', editor: null, production: null, sub: 'Moderator',
        stages: ['Production'], assignSubmission: null, doneSubmission: 2},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const N = NAMES[app.name];
    const facts = {line: app.line || 'main', baseURL: app.baseURL};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const groupStages = async () => (await sql(app, `select ug.user_group_id || ':' || coalesce((select setting_value from user_group_settings s where s.user_group_id = ug.user_group_id and setting_name = 'name' and locale = 'en'), '?') || ':' || coalesce(string_agg(ugs.stage_id::text, ',' order by ugs.stage_id), '') from user_groups ug left join user_group_stage ugs on ugs.user_group_id = ug.user_group_id where ug.role_id in (16, 17) group by ug.user_group_id order by ug.user_group_id`)).toString().trim().split('\n');
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`);
        return s;
    };
    const notices = async () => flat(await page.locator('.app__notifications').innerText().catch(() => ''));
    const roles = new RolesTab(page, app.contextPath, {stages: N.stages});
    const rowRead = async (name) => {
        if (!name || !(await roles.row(name).count())) return null;
        const b = await roles.boxStates(name);
        return Object.entries(b).map(([s, v]) => `${s}:${v && v.checked ? 'ticked' : 'empty'}${v && v.disabled ? '/greyed' : ''}`).join(' ');
    };
    const readRows = async (label) => {
        const out = {};
        for (const r of [N.manager, N.editor, N.production, N.sub]) if (r) out[r] = await rowRead(r);
        fact(label, out);
    };
    const stageFilter = async (label) => {
        await roles.chooseFilter('stage', N.stages[0]);
        fact(label, {rows: await roles.rowNames(), line: await roles.pagingLine().catch(() => null)});
        await snap(label);
    };
    const assignRoles = async (label) => {
        if (!N.assignSubmission) return;
        const panel = new ParticipantsPanel(page, app.contextPath);
        await panel.goto(N.assignSubmission);
        const win = await panel.openAssign();
        fact(label, {roles: await win.roleOptions()});
        await snap(label);
        await win.cancel().catch(() => {});
    };
    const openDone = async (label) => {
        const wf = new WorkflowPage(page, app.contextPath);
        let opened = true;
        let err = null;
        try {
            await wf.gotoEditorial(N.doneSubmission);
        } catch (e) {
            opened = false;
            err = e.message.split('\n')[0];
        }
        await idle(page).catch(() => {});
        await pause(1500);
        const s = await snap(label);
        fact(label, {submission: N.doneSubmission, opened, err, text: flat((s.text && (s.text.dialog || s.text.main)) || '', 600)});
    };
    const saveUnchanged = async (label, name) => {
        const win = await roles.openEdit(name);
        const stageSectionVisible = await win.stageSection.isVisible().catch(() => false);
        const resp = await win.save();
        await pause(800);
        fact(label, {status: resp.status(), stageAssignmentShown: stageSectionVisible, notice: await notices(), row: await rowRead(name)});
        await snap(label);
    };
    try {
        fact('00-group stages (sql, before)', await groupStages());
        if (process.env.MANAGER) {
            // The manager role's own window: "Edit" › "OK" with nothing changed
            // (on main its row is the list's first row, without "Edit", U54 A1).
            await signIn(page, 'rvaca');
            await roles.goto();
            await readRows('M1-rows before');
            try {
                await saveUnchanged('M2-manager window saved unchanged', N.manager);
            } catch (e) {
                fact('M2-manager window saved unchanged', {refused: e.name, message: e.message.split('\n')[0].slice(0, 200)});
            }
            fact('M5-group stages (sql, after)', await groupStages());
            // The same save stores "Permit changes to Settings" unticked for the
            // signed-in manager's only Settings role (U54 A11), so `rvaca` may
            // lose the Settings pages here; the stored stages above are the read.
            try {
                await roles.reload();
                await readRows('M3-rows after reload');
                await stageFilter('M4-filter first stage (after)');
            } catch (e) {
                fact('M3-rows after reload', {unreadable: e.message.split('\n')[0].slice(0, 200), url: page.url()});
            }
            return;
        }
        if (process.env.NEIGHBOUR) {
            await signIn(page, 'rvaca');
            await roles.goto();
            await readRows('N1-rows before');
            await saveUnchanged('N2-save sub-editor window unchanged', N.sub);
            await roles.reload();
            await readRows('N3-rows after reload');
            fact('N4-group stages (sql, after)', await groupStages());
            return;
        }
        // C0: the control before any save.
        await signIn(page, 'dbarnes');
        await openDone('C0-dbarnes opens done submission (before)');

        // 1-3.
        await signIn(page, 'rvaca');
        await roles.goto();
        fact('03-row names', await roles.rowNames());
        await readRows('03-manager-level rows');
        await snap('03-roles');
        // 4.
        await stageFilter('04-filter Submission');
        // 5.
        await assignRoles('05-assign roles (before)');
        if (N.production) {
            // 6-7.
            await roles.goto();
            await saveUnchanged('07-production editor saved unchanged', N.production);
            // 8.
            await roles.reload();
            await readRows('08-rows after reload');
            await stageFilter('08-filter Submission (after)');
            // 9.
            await assignRoles('09-assign roles (after)');
            // 10.
            await roles.goto();
            await saveUnchanged('10-editor saved unchanged', N.editor);
        }
        fact('10-group stages (sql, after saves)', await groupStages());
        // 11.
        await signIn(page, 'dbarnes');
        await openDone('11-dbarnes opens done submission (after)');
    } finally {
        record('facts', facts);
        await close();
    }
});
