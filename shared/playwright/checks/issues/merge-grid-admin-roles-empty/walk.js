// Issue report docs/issues/U53-A13-merge-grid-admin-roles-empty.md (U53 A13):
// the "Merge user" window and the Settings wizard's "Users" grid show nothing
// under "Roles" for the Site Administrator, whose manager enrolment (made when
// the journal was created) has no start date. Takes the report's Steps through
// the screens on a dataset fleet (PKP's default test dataset), freshly reset, on
// OJS, OMP and OPS. Step numbers are the report's:
//   1-2. sign in as admin; Settings › "Users & Roles": the admin's and Ramiro
//        Vaca's rows ("Roles", "Start Date")
//   3-5. Ramiro Vaca's row › "More Actions" › "Merge user"; "Search" for
//        `admin`, then `dbarnes`: the rows' cells
//   6-7. Administration › "Hosted Journals" (Presses, Servers) › publicknowledge
//        › "Settings wizard" › "Users": `admin`, `dbarnes` searched the same way
// NEIGHBOUR=1 (the fix's neighbour check, run after a fresh reset): ended roles
// stay out of the cell. "Remove User" on Stephanie Berardo's row (Users & Roles),
// then her row in the "Merge user" window; and on the wizard's "Users" grid the
// grid's own "Remove" on the admin's row (which ends the undated enrolment),
// then the admin's row again.
// Besides the screens it reads, for Evidence, the user_user_groups rows of the
// users it reads.
//
// Reset first:  npm run fleet-prep -- --feature issues-r44 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-r44 PROBE_AGENT=r44 node bin/probe.js all shared/playwright/checks/issues/merge-grid-admin-roles-empty/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r44-3_5 PROBE_AGENT=r44 node bin/probe.js all <this file>
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const NEIGHBOUR = !!process.env.NEIGHBOUR;
const ADMIN = 'pkpadmin@mailinator.com';
const HOSTED = {ojs: 'Hosted Journals', omp: 'Hosted Presses', ops: 'Hosted Servers'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, neighbour: NEIGHBOUR};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const rec = async (page, name) => {
        const s = await screen(page).catch((e) => ({error: flat(e.message, 200)}));
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    };
    const rows = (who) => sql(app, `select u.username, g.context_id, g.role_id, coalesce(s.setting_value, ''), coalesce(uug.date_start::text, 'NULL'), coalesce(uug.date_end::text, 'NULL') from user_user_groups uug join users u using (user_id) join user_groups g using (user_group_id) left join user_group_settings s on s.user_group_id = g.user_group_id and s.setting_name = 'name' and s.locale = 'en' where u.username in (${who.map((w) => `'${w}'`).join(', ')}) order by 1, 2, 3`).split('\n').filter(Boolean);
    const gridRow = async (grid, text, email) => {
        await grid.search({text});
        await pause(300);
        const n = await grid.row(email).count();
        return n ? await grid.rowCells(email) : `no row for ${email}`;
    };

    const who = NEIGHBOUR ? ['admin', 'sberardo'] : ['admin', 'rvaca', 'dbarnes'];
    fact('db before', rows(who));
    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    try {
        const {UsersListPage, MergeUserWindow, HostedContextsPage, RemoveUserDialog} = require('../../../pages/UsersManagementPages.js');
        // 1-2
        await signIn(page, 'admin');
        const list = new UsersListPage(page, app.contextPath);
        await list.goto();
        await idle(page);
        await rec(page, 's2-users-roles');
        const listRow = async (email) => {
            const row = list.row(email);
            if (!(await row.count())) {
                await list.search(email.split('@')[0]);
            }
            return {roles: flat(await list.rolesCell(list.row(email)).innerText()), start: flat(await list.startDateCell(list.row(email)).innerText())};
        };
        fact('2 users & roles', {
            admin: await listRow(ADMIN),
            [NEIGHBOUR ? 'sberardo' : 'rvaca']: await listRow(NEIGHBOUR ? 'sberardo@mailinator.com' : 'rvaca@mailinator.com'),
        });

        if (NEIGHBOUR) {
            await list.goto();
            await list.chooseAction(list.row('sberardo@mailinator.com'), 'Remove User');
            const remove = new RemoveUserDialog(page);
            await remove.expectOpen();
            await remove.ok();
            await pause(1500);
            await idle(page);
            await rec(page, 'n-removed-sberardo');
            fact('n db after remove', rows(['sberardo']));
            await list.goto();
        }

        // 3-5
        const opener = NEIGHBOUR ? 'dbarnes@mailinator.com' : 'rvaca@mailinator.com';
        await list.chooseAction(list.row(opener), 'Merge user');
        const merge = new MergeUserWindow(page);
        await merge.expectOpen();
        await rec(page, 's3-merge-window');
        fact('3 merge columns', await merge.grid.columns());
        const m = {admin: await gridRow(merge.grid, 'admin', ADMIN)};
        await rec(page, 's5-merge-admin');
        if (NEIGHBOUR) {
            m.sberardo = await gridRow(merge.grid, 'sberardo', 'sberardo@mailinator.com');
        } else {
            m.dbarnes = await gridRow(merge.grid, 'dbarnes', 'dbarnes@mailinator.com');
        }
        await rec(page, 's5-merge-other');
        fact('5 merge rows (Given, Family, Username, Roles, Email)', m);

        // 6-7
        const hosted = new HostedContextsPage(page, {hostedLabel: HOSTED[app.name]});
        await hosted.gotoFromAdministration();
        await hosted.openSettingsWizard(app.contextPath);
        let grid = await hosted.openWizardTab('Users');
        await rec(page, 's6-wizard-users');
        fact('6 wizard columns', await grid.columns());
        const w = {admin: await gridRow(grid, 'admin', ADMIN)};
        if (!NEIGHBOUR) w.dbarnes = await gridRow(grid, 'dbarnes', 'dbarnes@mailinator.com');
        await rec(page, 's7-wizard-rows');
        fact('7 wizard rows (Given, Family, Username, Roles, Email)', w);

        if (NEIGHBOUR) {
            await grid.search({text: 'admin'});
            const labels = await grid.actionLabels(ADMIN);
            fact('n admin row actions', labels);
            if (labels.includes('Remove')) {
                let dialogText = null;
                page.once('dialog', async (d) => {
                    dialogText = d.message();
                    await d.accept();
                });
                await grid.actionLink(ADMIN, 'Remove').click();
                const confirm = page.locator('[role="dialog"]').filter({hasText: /Remove|remove/}).last();
                const okButton = confirm.getByRole('button', {name: /^(OK|Yes)$/});
                if (await okButton.first().isVisible({timeout: 5000}).catch(() => false)) {
                    await okButton.first().click();
                }
                await pause(2000);
                await idle(page);
                const s = await rec(page, 'n-admin-removed');
                fact('n admin remove', {dialogText, notices: s.notices, db: rows(['admin'])});
                grid = await hosted.reloadWizardTab('Users');
                fact('n wizard admin row after remove', await gridRow(grid, 'admin', ADMIN));
                await rec(page, 'n-wizard-after-remove');
            }
        }
        await signOut(page);
    } finally {
        record('facts', facts);
        await close();
    }
});
