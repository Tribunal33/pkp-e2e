// Issue report docs/issues/U53-A15-merge-account-opened-discussion-fails.md (U53 A15):
// a manager merges an account that opened a discussion. Takes the report's
// Steps through the screens on a dataset fleet (PKP's default test dataset),
// freshly reset, on OJS, OMP and OPS:
//   precondition (OPS only; the OJS and OMP datasets already hold
//   "Editor Recommendation", opened by minoue): dbuskins opens a discussion
//   on submission 1 at Production, ticking the author ccorino.
//   1. sign in as rvaca; 2. Settings › "Users & Roles";
//   3. the merged account's row › "…" › "Merge user";
//   4. sberardo's row › arrow › "Merge into this User"; 5. "Confirm" › "OK";
//   6. wait, reload the list; 7. the discussion's row and participants;
//   8. sign in as the merged account.
// On 3.5 (PKP_E2E_LINE=stable-3_5_0) the workflow is the older page: the
// discussion is a row of the stage's "Discussions" list (its "From" column),
// and OPS's precondition goes through that list's "Add discussion" form.
// Also reads (for Evidence) the merged user's row, roles and the discussion's
// created_by in the database, before and after.
// Run: PROBE_FEATURE=issues-r3 PROBE_AGENT=r3 node bin/probe.js all shared/playwright/checks/issues/merge-account-opened-discussion-fails/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-r3 --dataset 1 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-r3-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const CASE = {
    ojs: {source: 'minoue', sourceName: 'Minoti Inoue', sid: 2, stage: 3, discussion: 'Editor Recommendation'},
    omp: {source: 'minoue', sourceName: 'Minoti Inoue', sid: 6, stage: 2, discussion: 'Editor Recommendation'},
    ops: {source: 'dbuskins', sourceName: 'David Buskins', sid: 1, stage: 5, discussion: 'u53r3 Figures question', open: true},
};
// 3.5 has the legacy workflow page: discussions are the stage's "Discussions"
// grid ("Add discussion"; columns Name, From, Last Reply, Replies, Closed).
const LEGACY = process.env.PKP_E2E_LINE === 'stable-3_5_0';
const TARGET = 'sberardo';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {UsersListPage, MergeUserWindow} = require('../../../pages/UsersManagementPages.js');
    const {TasksDiscussionsPanel, DiscussionWindow} = require('../../../pages/TasksDiscussionsPages.js');
    const c = CASE[app.name];
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', fix: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const db = () => {
        if (LEGACY) {
            const uid = sql(app, `select user_id from users where username='${c.source}'`);
            return {
                sourceUserId: uid || 'no row',
                sourceRoles: uid ? sql(app, `select count(*) from user_user_groups where user_id=${uid}`) : null,
                targetRoles: sql(app, `select count(*) from user_user_groups uug join users u on u.user_id=uug.user_id where u.username='${TARGET}'`),
                notes: sql(app, `select n.note_id, n.assoc_id, u.username from notes n join users u on u.user_id=n.user_id order by 1`).split('\n').filter(Boolean),
                participants: sql(app, `select p.query_id, u.username from query_participants p join users u on u.user_id=p.user_id order by 1, 2`).split('\n').filter(Boolean),
            };
        }
        const uid = sql(app, `select user_id from users where username='${c.source}'`);
        return {
            sourceUserId: uid || 'no row',
            sourceRoles: uid ? sql(app, `select count(*) from user_user_groups where user_id=${uid}`) : null,
            targetRoles: sql(app, `select count(*) from user_user_groups uug join users u on u.user_id=uug.user_id where u.username='${TARGET}'`),
            tasks: sql(app, `select t.edit_task_id, t.title, coalesce(cu.username, 'null'), coalesce(su.username, '-') from edit_tasks t left join users cu on cu.user_id=t.created_by left join users su on su.user_id=t.started_by order by 1`).split('\n').filter(Boolean),
            participants: sql(app, `select p.edit_task_id, u.username from edit_task_participants p join users u on u.user_id=p.user_id order by 1, 2`).split('\n').filter(Boolean),
        };
    };

    // Opens the submission at its current stage (Production on OPS) and returns the panel holding the discussion.
    const openPanel = async (page) => {
        const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
        const wf = new WorkflowPage(page, ctx);
        await wf.gotoEditorial(c.sid, c.open ? {menuKey: 'workflow_5'} : {});
        const managers = page.locator('[data-cy="discussion-manager"]');
        await managers.first().waitFor({timeout: T});
        const title = flat(await managers.first().locator('h3').first().innerText());
        const panel = new TasksDiscussionsPanel(page, ctx, {title});
        await panel.expectSettled();
        return {panel, title};
    };
    const legacyGrid = async (page) => {
        await page.goto(app.url(`/index.php/${ctx}/en/workflow/index/${c.sid}/${c.stage}`));
        await idle(page);
        const grid = page.locator('[id^="component-grid-queries-queriesgrid"]').first();
        await grid.waitFor({timeout: T});
        return grid;
    };
    const readDiscussion = async (page, label) => {
        if (LEGACY) {
            const grid = await legacyGrid(page);
            const row = grid.locator('tr.gridRow').filter({hasText: c.discussion}).first();
            const out = {rows: await grid.locator('tr.gridRow').filter({hasText: c.discussion}).count()};
            if (out.rows) out.cells = (await row.locator('td').allInnerTexts()).map((x) => flat(x, 80));
            record(`${label}-discussion`, await screen(page));
            return out;
        }
        const {panel, title} = await openPanel(page);
        const rows = panel.row(c.discussion);
        const out = {panel: title, rows: await rows.count()};
        if (out.rows) {
            out.ownerLine = flat(await panel.ownerLine(c.discussion).innerText());
            const win = await panel.openItem(c.discussion);
            out.participants = (await win.participantLines().allInnerTexts()).map((x) => flat(x));
            out.firstMessageHead = flat(await win.messageHead(0).innerText().catch(() => null));
            record(`${label}-discussion`, await screen(page));
            await win.close();
        }
        return out;
    };

    const {page, close} = await launch(app);
    try {
        // Precondition (OPS): dbuskins opens a discussion.
        if (c.open && LEGACY) {
            await signIn(page, 'dbuskins');
            const grid = await legacyGrid(page);
            await grid.locator('a[id*="addQuery"]').first().click();
            const form = page.locator('form#queryForm');
            await form.waitFor({timeout: T});
            await idle(page);
            const labels = (await form.locator('input[name="users[]"]').evaluateAll((bs) => bs.map((b) => (b.closest('li') || b.parentElement).innerText.replace(/\s+/g, ' ').trim())));
            fact('pre offered participants', labels);
            await form.locator('label').filter({hasText: 'Carlo Corino'}).locator('input[name="users[]"]').check();
            await form.locator('input[name="subject"]').fill(c.discussion);
            await page.waitForFunction(() => window.tinymce && window.tinymce.get().some((e) => e.initialized && /comment/.test(e.id)), null, {timeout: T});
            await page.evaluate(() => window.tinymce.get().find((e) => /comment/.test(e.id)).setContent('<p>Could you send the figures as separate files?</p>'));
            await form.getByRole('button', {name: 'OK', exact: true}).click();
            await form.waitFor({state: 'detached', timeout: T});
            await idle(page);
            await signOut(page);
        } else if (c.open) {
            await signIn(page, 'dbuskins');
            const {panel} = await openPanel(page);
            const win = await panel.openAdd();
            await win.nameField().fill(c.discussion);
            fact('pre offered participants', await win.participantUsernames());
            await win.tick('ccorino');
            await win.typeMessage('Could you send the figures as separate files?');
            await win.saveExpectClosed();
            await signOut(page);
        }
        fact('db before', db());

        // 1-2
        await signIn(page, 'rvaca');
        fact('7 before merge', await readDiscussion(page, 'before'));
        const list = new UsersListPage(page, ctx);
        await list.goto();
        const sourceRow = list.row(`${c.source}@mailinator.com`);
        fact('2 list', {sourceRow: await sourceRow.count(), sourceRoles: flat(await list.rolesCell(sourceRow).innerText().catch(() => null))});

        // 3
        await list.chooseAction(sourceRow, 'Merge user');
        const merge = new MergeUserWindow(page);
        await merge.expectOpen();
        // 4
        await merge.mergeInto(`${TARGET}@mailinator.com`);
        const confirmText = LEGACY ? flat(await merge.confirmDialog.innerText()) : await merge.confirmText();
        // 5
        const answer = await merge.confirm();
        const status = answer.status();
        let body = null;
        try {
            body = flat(await answer.text(), 300);
        } catch (e) {
            body = `unreadable: ${flat(e.message, 80)}`;
        }
        await sleep(5000);
        const s5 = await screen(page);
        record('5-after-ok', s5);
        await shot(page, '5-after-ok');
        fact('5 ok', {
            confirmText,
            status,
            body,
            confirmStillOpen: await merge.confirmDialog.isVisible(),
            mergeWindowStillOpen: await merge.dialog.isVisible(),
            notices: s5.notices,
            dialogText: flat(s5.text.dialog, 300),
        });

        // 6
        await list.goto();
        await idle(page);
        const s6 = await screen(page);
        record('6-list-after-reload', s6);
        const targetRow = list.row(`${TARGET}@mailinator.com`);
        fact('6 list after reload', {
            sourceRow: await list.row(`${c.source}@mailinator.com`).count(),
            targetRoles: flat(await list.rolesCell(targetRow).innerText().catch(() => null)),
        });

        // 7
        fact('7 after merge', await readDiscussion(page, 'after'));
        fact('db after', db());

        // 8
        await signOut(page);
        await page.goto(app.url(`/index.php/${ctx}/en/login`));
        await page.locator('input[name="username"]').fill(c.source);
        await page.locator('input[name="password"]').fill(`${c.source}${c.source}`);
        await page.locator('form#login button[type="submit"], form#login button').first().click();
        await sleep(3000);
        await idle(page);
        const s8 = await screen(page);
        record('8-merged-sign-in', s8);
        fact('8 merged account signs in', {
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            refused: /Invalid username\/email or password/.test(s8.text.main || '') || /Invalid username\/email or password/.test(await page.locator('body').innerText()),
        });
    } finally {
        record('facts', facts);
        await close();
    }
});
