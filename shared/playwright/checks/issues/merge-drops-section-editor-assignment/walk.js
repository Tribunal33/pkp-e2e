// Issue report docs/issues/U53-A9-merge-drops-section-editor-assignment.md (U53 A9):
// a manager merges a section editor's account into another editor's; the
// section loses its editor. Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset), freshly reset, on OJS, OMP and
// OPS. The dataset assigns dbuskins to OJS "Articles", OMP "Library &
// Information Studies" and OPS "Preprints"; minoue holds the same role and is
// not assigned there. Step numbers are the report's:
//   1. sign in as rvaca
//   2. Settings › Journal (Press, Server) › "Sections" ("Series"): the row's
//      "Editors", its "Edit" window's "Editorial Assignments"; "Cancel"
//   3. Settings › "Users & Roles": David Buskins's row › "…" › "Merge user"
//   4. Minoti Inoue's row › arrow › "Merge into this User"; "Confirm" › "OK"
//   5. the section's row and "Edit" window again
//   6. the author (ccorino; OMP aclark) submits "u53r41 Kelp forest recovery"
//      into that section through "Submit"
//   7. rvaca opens the new submission's workflow: its participants
// NEIGHBOUR=1 (the fix's neighbour check): merges dbuskins into sberardo instead
// (OJS, OPS: already ticked on the same section, so the duplicate path; OMP: on
// another series) and reads every section's window before and after; no
// submission.
// Besides the screens it reads, for Evidence, the subeditor_submission_group rows
// and the new submission's stage assignments from the database.
//
// Reset first:  npm run fleet-prep -- --feature issues-r41 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-r41 PROBE_AGENT=r41 node bin/probe.js all shared/playwright/checks/issues/merge-drops-section-editor-assignment/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r41-3_5 PROBE_AGENT=r41 node bin/probe.js all <this file>
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const {submitThroughWizard, sectionWindow} = require('./lib.js');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const PDF = path.join(__dirname, '../../../../../apps/ojs/playwright/fixtures/files/article.pdf');
const NEIGHBOUR = !!process.env.NEIGHBOUR;
const LEGACY = process.env.PKP_E2E_LINE === 'stable-3_5_0';
const TITLE = 'u53r41 Kelp forest recovery';
const SOURCE = 'dbuskins';
const TARGET = NEIGHBOUR ? 'sberardo' : 'minoue';
const CASE = {
    ojs: {section: 'Articles', others: ['Reviews'], author: 'ccorino'},
    omp: {section: 'Library & Information Studies', others: ['Political Economy'], author: 'aclark'},
    ops: {section: 'Preprints', others: [], author: 'ccorino'},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const c = CASE[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, neighbour: NEIGHBOUR, target: TARGET};
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
    const assignments = () => sql(app, `select s.assoc_type, s.assoc_id, u.username, s.user_group_id from subeditor_submission_group s join users u using (user_id) order by 1, 2, 3`).split('\n').filter(Boolean);
    const readSections = async (page, label) => {
        const out = {};
        for (const title of NEIGHBOUR ? [c.section, ...c.others] : [c.section]) {
            const {editors, boxes, win} = await sectionWindow(app, page, title);
            await rec(page, `${label}-${title.replace(/\W+/g, '-')}`);
            await win.cancel();
            await pause(600);
            out[title] = {editors, ticked: boxes.filter((b) => b.ticked).map((b) => b.label), offered: boxes.map((b) => b.label)};
        }
        return out;
    };

    fact('db before', assignments());
    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    try {
        // 1-2
        await signIn(page, 'rvaca');
        fact('2 section before', await readSections(page, 's2'));

        // 3-4
        const {UsersListPage, MergeUserWindow} = require('../../../pages/UsersManagementPages.js');
        const list = new UsersListPage(page, app.contextPath);
        await list.goto();
        await list.chooseAction(list.row(`${SOURCE}@mailinator.com`), 'Merge user');
        const merge = new MergeUserWindow(page);
        await merge.expectOpen();
        await merge.mergeInto(`${TARGET}@mailinator.com`);
        const confirmText = LEGACY ? flat(await merge.confirmDialog.innerText()) : await merge.confirmText();
        const answer = await merge.confirm();
        await pause(3000);
        const s4 = await rec(page, 's4-after-ok');
        fact('4 merge', {
            confirmText,
            status: answer.status(),
            mergeWindowStillOpen: await merge.dialog.isVisible(),
            notices: s4.notices,
        });
        await list.goto();
        fact('4 list', {sourceRow: await list.row(`${SOURCE}@mailinator.com`).count(), targetRoles: flat(await list.rolesCell(list.row(`${TARGET}@mailinator.com`)).innerText().catch(() => null))});

        // 5
        fact('5 section after', await readSections(page, 's5'));
        fact('db after merge', assignments());
        await signOut(page);
        if (NEIGHBOUR) return;

        // 6
        await signIn(page, c.author);
        const {id} = await submitThroughWizard(app, page, {title: TITLE, section: c.section, file: PDF});
        await rec(page, 's6-complete');
        await signOut(page);
        await pause(2000);
        const stage = sql(app, `select string_agg(u.username || ' as ' || (select setting_value from user_group_settings where user_group_id = sa.user_group_id and setting_name = 'name' and locale = 'en'), ', ' order by sa.stage_assignment_id) from stage_assignments sa join users u using (user_id) where sa.submission_id = ${id}`);
        fact('6 submitted', {id, stageAssignmentsDb: stage});

        // 7
        await signIn(page, 'rvaca');
        const where = LEGACY ? `/index.php/${app.contextPath}/en/workflow/access/${id}` : `/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`;
        await page.goto(app.url(where));
        await idle(page);
        await pause(2500);
        await rec(page, 's7-workflow');
        // The workflow's right-hand column (hidden from role queries, so read as CSS); 3.5's
        // workflow/access lands on the same workflow page, whose column holds "Participants".
        const panel = page.locator('[data-cy="workflow-secondary-items"]').or(page.locator('.pkpWorkflow__sidebar, [class*="sidebar"]').filter({hasText: /Participants/i})).first();
        await panel.getByText(/Participants/i).first().waitFor({timeout: T}).catch(() => {});
        const text = flat(await panel.innerText().catch(() => ''), 600);
        fact('7 workflow participants', {
            participants: text,
            listsMinotiInoue: text.includes('Minoti Inoue'),
            listsDavidBuskins: text.includes('David Buskins'),
        });
        await signOut(page);
    } finally {
        record('facts', facts);
        await close();
    }
});
