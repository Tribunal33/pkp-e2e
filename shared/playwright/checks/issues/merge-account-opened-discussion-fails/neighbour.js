// Issue report docs/issues/U53-A15-merge-account-opened-discussion-fails.md (U53 A15):
// the fix's neighbour check, walked with fix.diff in and out, on OJS and OMP
// (whose datasets hold "Editor Recommendation", opened by minoue, with
// dbuskins and dbarnes among its participants). The fix must leave alone a
// discussion the merged account only takes part in:
//   1. sign in as rvaca; Settings › "Users & Roles";
//   2. David Buskins's row › "…" › "Merge user"; dbarnes's row › arrow ›
//      "Merge into this User"; "Confirm" › "OK";
//   3. the list after a reload; the discussion's row ("Created by: minoue")
//      and its participants; dbuskins's sign-in.
// Reset the dataset fleet first.
// Run: PROBE_FEATURE=issues-r3 PROBE_AGENT=r3 ONLY=ojs,omp PROBE_RUN=fixin|fixout node bin/probe.js all shared/playwright/checks/issues/merge-account-opened-discussion-fails/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const SID = {ojs: 2, omp: 6};
const SOURCE = 'dbuskins';
const TARGET = 'dbarnes';
const DISCUSSION = 'Editor Recommendation';

forEachApp(async (app) => {
    if (!SID[app.name]) return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const {UsersListPage, MergeUserWindow} = require('../../../pages/UsersManagementPages.js');
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const ctx = app.contextPath;
    const facts = {app: app.name, fix: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const db = () => ({
        source: sql(app, `select user_id from users where username='${SOURCE}'`) || 'no row',
        tasks: sql(app, `select t.edit_task_id, coalesce(cu.username, 'null') from edit_tasks t left join users cu on cu.user_id=t.created_by order by 1`).split('\n').filter(Boolean),
        participants: sql(app, `select p.edit_task_id, u.username from edit_task_participants p join users u on u.user_id=p.user_id order by 1, 2`).split('\n').filter(Boolean),
    });
    const readDiscussion = async (page) => {
        await new WorkflowPage(page, ctx).gotoEditorial(SID[app.name]);
        const managers = page.locator('[data-cy="discussion-manager"]');
        await managers.first().waitFor({timeout: T});
        const panel = new TasksDiscussionsPanel(page, ctx, {title: flat(await managers.first().locator('h3').first().innerText())});
        await panel.expectSettled();
        const out = {ownerLine: flat(await panel.ownerLine(DISCUSSION).innerText())};
        const win = await panel.openItem(DISCUSSION);
        out.participants = (await win.participantLines().allInnerTexts()).map((x) => flat(x));
        await win.close();
        return out;
    };

    const {page, close} = await launch(app);
    try {
        fact('db before', db());
        await signIn(page, 'rvaca');
        fact('discussion before', await readDiscussion(page));
        const list = new UsersListPage(page, ctx);
        await list.goto();
        await list.chooseAction(list.row(`${SOURCE}@mailinator.com`), 'Merge user');
        const merge = new MergeUserWindow(page);
        await merge.expectOpen();
        await merge.mergeInto(`${TARGET}@mailinator.com`);
        const answer = await merge.confirm();
        await sleep(4000);
        const s = await screen(page);
        record('neighbour-after-ok', s);
        fact('merge', {status: answer.status(), mergeWindowStillOpen: await merge.dialog.isVisible(), notices: s.notices});
        await list.goto();
        await idle(page);
        fact('list after reload', {sourceRow: await list.row(`${SOURCE}@mailinator.com`).count(), targetRoles: flat(await list.rolesCell(list.row(`${TARGET}@mailinator.com`)).innerText().catch(() => null))});
        fact('discussion after', await readDiscussion(page));
        fact('db after', db());
        await signOut(page);
        await page.goto(app.url(`/index.php/${ctx}/en/login`));
        await page.locator('input[name="username"]').fill(SOURCE);
        await page.locator('input[name="password"]').fill(`${SOURCE}${SOURCE}`);
        await page.locator('form#login button').first().click();
        await sleep(3000);
        fact('merged account signs in', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), refused: /Invalid username\/email or password/.test(await page.locator('body').innerText())});
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
