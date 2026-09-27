// U14 claim check Ks27 (sync s27): pkp/pkp-lib 26ae6431b5 (#12401, OJS only
// on this build) makes a comment's deletion clear only the tasks of that
// comment and of its own reports. The kept check ../../delete-tasks/collide.js
// covers the report-side collision from the Comments page. This script adds,
// on scratch contexts only:
//   MODE=comment (all apps): the comment-side collision. Journal A holds a
//     comment numbered a; journal B a comment whose one report is numbered a.
//     B's manager deletes B's comment on B's Comments page. Read: A's
//     "pending review" row for its comment, and B's own two rows (the
//     deleted comment's and its report's), before and after.
//   MODE=moderation (all apps): report deletion, approve, hide, and a writer's
//     account merged away (the Site Administrator), each read on the Tasks panel.
//   MODE=landing (OJS): the report-side collision through the landing page:
//     B's writer deletes their own comment c from the article page's "…" ›
//     "Delete Comment"; journal A holds reports c (target) and c+1 (control).
// Run: MODE=comment PROBE_FEATURE=U14 PROBE_AGENT=ccInvs27 node bin/probe.js all shared/playwright/checks/U14/Ks27/ks27.js
//      MODE=landing PROBE_FEATURE=U14 PROBE_AGENT=ccInvs27 node bin/probe.js ojs shared/playwright/checks/U14/Ks27/ks27.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../../../..');
const {forEachApp, launch, signIn, screen, record, note, idle, tag} = require('../../../probe');

const MODE = process.env.MODE || 'comment';

forEachApp(async (app) => {
    const pages = require(path.join(ROOT, `apps/${app.name}/playwright/pages/ReaderCommentsPages.js`));
    const {CommentsPage, REPORT_TASK, COMMENT_TASK} = pages;
    const {TasksPanel} = require(path.join(ROOT, 'shared/playwright/pages/NotificationsPages.js'));
    const {expect} = require('@playwright/test');
    const out = {app: app.name, mode: MODE, steps: []};
    const log = (s, d) => { out.steps.push({s, ...d}); console.log(app.name, MODE, s, JSON.stringify(d || {})); };
    const snap = async (page, name) => { const s = await screen(page); record(`${MODE}-${name}`, s); return s; };

    const T = tag('u14s27');
    const A = `${T}a`, B = `${T}b`, P = `${T}p`;
    const u = (ctx, k, roles) => ({username: `${ctx}${k}`, givenName: k, familyName: 'Probe', email: `${ctx}${k}@mail.test`, roles});
    // Journal A also holds an Editor (the second moderator level; OPS has no editor key, users.md).
    const hasEditor = app.name !== 'ops';
    for (const ctx of [A, B, P]) {
        const extra = ctx === A && hasEditor ? [u(ctx, 'ed', ['editor'])] : [];
        await app.api.createContext({tag: ctx, enablePublicComments: true,
            users: [u(ctx, 'mg', ['manager']), u(ctx, 'au', ['author']), u(ctx, 'ra', ['reader']), u(ctx, 'rb', ['reader']), ...extra]});
    }
    const seed = (ctx, sfx, userComments) => app.api.createSubmission({tag: `${ctx}${sfx}`, context: ctx, submitter: `${ctx}au`,
        title: `Article ${ctx}${sfx}`, published: true, userComments});
    const padReportsTo = async (target, attempt) => {
        // Returns the next report id after padding, or null when the report sequence is already past target.
        const probeSeed = await seed(P, `l${attempt}`, [{user: `${P}ra`, text: `pad ${P}.`, approved: true, reports: [{user: `${P}rb`, note: 'pad'}]}]);
        const r0 = probeSeed.userComments[0].reports[0];
        const n = target - r0 - 1;
        log('report seq', {r0, pad: n});
        if (n < 0) return false;
        if (n > 0) {
            await seed(P, `p${attempt}`, [{user: `${P}ra`, text: `pad ${P}.`, approved: true,
                reports: Array.from({length: n}, () => ({user: `${P}rb`, note: 'pad'}))}]);
        }
        return true;
    };

    const readTasks = async (page, ctx, label, rowTexts) => {
        await page.goto(`/index.php/${ctx}/dashboard/editorial`);
        const tasks = new TasksPanel(page);
        await expect(tasks.bell()).toBeVisible({timeout: 30_000});
        await tasks.open();
        await idle(page);
        await snap(page, `tasks-${label}`);
        const counts = {
            comment: await tasks.rowsOpening(COMMENT_TASK).count(),
            report: await tasks.rowsOpening(REPORT_TASK).count(),
        };
        for (const [k, text] of Object.entries(rowTexts)) {
            counts[k] = await tasks.row(text).count();
        }
        await tasks.close();
        log(`tasks ${label}`, counts);
        return counts;
    };

    const {page: am, close: closeA} = await launch(app);
    const {page: bm, close: closeB} = await launch(app);
    try {
        if (MODE === 'comment') {
            // A: the comment whose task should survive. B: a comment whose report carries A's comment number.
            let aText = null, a = null, b = null;
            for (let attempt = 0; attempt < 4 && !b; attempt++) {
                aText = `A comment ${A} ${attempt}.`;
                a = (await seed(A, `y${attempt}`, [{user: `${A}ra`, text: aText, approved: false}])).userComments[0].id;
                log('A comment', {a});
                if (!(await padReportsTo(a, attempt))) continue;
                const bs = await seed(B, `x${attempt}`, [{user: `${B}ra`, text: `B comment ${B} ${attempt}.`, approved: true,
                    reports: [{user: `${B}rb`, note: `B own report ${B} ${attempt}.`}]}]);
                const bc = bs.userComments[0];
                log('B seeded', {comment: bc.id, reports: bc.reports});
                if (bc.reports[0] === a) {
                    b = {id: bc.id, text: `B comment ${B} ${attempt}.`, report: `B own report ${B} ${attempt}.`};
                }
            }
            if (!b) throw new Error('could not line the ids up');
            await signIn(am, `${A}mg`);
            await signIn(bm, `${B}mg`);
            const aBefore = await readTasks(am, A, 'A-before', {aComment: aText});
            const {page: em, close: closeE} = await launch(app);
            let eBefore = null, eAfter = null;
            if (hasEditor) {
                await signIn(em, `${A}ed`);
                eBefore = await readTasks(em, A, 'A-editor-before', {aComment: aText});
            }
            const bBefore = await readTasks(bm, B, 'B-before', {bComment: b.text, bReport: b.report});
            const bc = new CommentsPage(bm, B);
            await bc.goto();
            await snap(bm, 'B-comments-page');
            if (bc.deleteFromRow) {
                await bc.deleteFromRow(bc.row(b.text));
            } else {
                await bc.deleteCommentFromRow(bc.row(b.text));
                await snap(bm, 'B-delete-confirm');
                await bc.confirmDeleteComment();
            }
            await snap(bm, 'B-after-delete');
            log('B deleted', {id: b.id});
            const aAfter = await readTasks(am, A, 'A-after', {aComment: aText});
            if (hasEditor) {
                eAfter = await readTasks(em, A, 'A-editor-after', {aComment: aText});
            }
            await closeE();
            const bAfter = await readTasks(bm, B, 'B-after', {bComment: b.text, bReport: b.report});
            // A's comment itself still listed on A's Comments page.
            const ac = new CommentsPage(am, A);
            await ac.goto();
            await snap(am, 'A-comments-page');
            const aListed = await ac.row(aText).count();
            out.result = {a, b, aBefore, aAfter, eBefore, eAfter, bBefore, bAfter, aListed};
            note(`ccInvs27 U14 comment-side ${app.name}: B deleted comment ${b.id} (its report ${a}); A comment ${a} pending-review rows before ${aBefore.aComment} after ${aAfter.aComment}; B's own rows before ${bBefore.bComment}/${bBefore.bReport} after ${bAfter.bComment}/${bAfter.bReport}`);
        } else if (MODE === 'landing') {
            const {ArticleCommentsPage} = pages;
            // B: comment c (the writer's own). A: a comment with reports c (target) and c+1 (control).
            let c = null, bSub = null, bText = null, aReports = null, aComment = null;
            for (let attempt = 0; attempt < 4 && !aReports; attempt++) {
                bText = `B comment ${B} ${attempt}.`;
                const bs = await seed(B, `x${attempt}`, [{user: `${B}ra`, text: bText, approved: true}]);
                c = bs.userComments[0].id;
                bSub = bs.submissionId;
                log('B comment', {c, bSub, keys: Object.keys(bs)});
                if (!(await padReportsTo(c, attempt))) continue;
                const as = await seed(A, `y${attempt}`, [{user: `${A}ra`, text: `A comment ${A}.`, approved: true,
                    reports: [{user: `${A}rb`, note: `A target report ${A}.`}, {user: `${A}rb`, note: `A control report ${A}.`}]}]);
                log('A seeded', {comment: as.userComments[0].id, reports: as.userComments[0].reports});
                if (as.userComments[0].reports[0] === c) {
                    aReports = as.userComments[0].reports; aComment = as.userComments[0].id;
                }
            }
            if (!aReports) throw new Error('could not line the ids up');
            await signIn(am, `${A}mg`);
            const rows = {target: `A target report ${A}.`, control: `A control report ${A}.`};
            const aBefore = await readTasks(am, A, 'A-before', rows);
            await signIn(bm, `${B}mg`);
            const bBefore = await readTasks(bm, B, 'B-before', {bComment: bText});
            // The writer on the landing page.
            await signIn(bm, `${B}ra`);
            const lp = new ArticleCommentsPage(bm, B);
            await lp.goto(bSub);
            await idle(bm);
            await snap(bm, 'B-landing-before');
            const article = lp.comment(bText);
            const items = await lp.openMenu(article);
            log('writer menu', {items});
            await lp.closeMenu();
            const dialog = await lp.openDeleteDialog(article);
            const d = await snap(bm, 'B-landing-delete-dialog');
            log('delete dialog', {text: d.text.dialog});
            await lp.confirmDelete(dialog);
            await idle(bm);
            const after = await snap(bm, 'B-landing-after');
            const stillShown = await lp.comment(bText).count();
            await bm.reload();
            await idle(bm);
            const reloaded = await snap(bm, 'B-landing-reloaded');
            const shownAfterReload = await bm.getByText(bText).count();
            log('writer deleted', {c, stillShown, shownAfterReload, heading: (after.text.main || '').match(/Comments[^\n]*/g)});
            const aAfter = await readTasks(am, A, 'A-after', rows);
            await signIn(bm, `${B}mg`);
            const bAfter = await readTasks(bm, B, 'B-after', {bComment: bText});
            const aC = new CommentsPage(am, A);
            await aC.goto();
            await aC.openTab('Reported');
            await snap(am, 'A-reported-tab');
            const reportedRow = await aC.row(`A comment ${A}.`).count();
            out.result = {c, aReports, aComment, aBefore, aAfter, bBefore, bAfter, stillShown, shownAfterReload, reportedRow,
                reloadedHeading: (reloaded.text.main || '').match(/Comments[^\n]*/g)};
            note(`ccInvs27 U14 landing ${app.name}: writer deleted own comment ${c} from the article page; A report ${c} row before ${aBefore.target} after ${aAfter.target}, control ${aBefore.control}->${aAfter.control}; B manager's comment row ${bBefore.bComment}->${bAfter.bComment}`);
        }
        if (MODE === 'moderation') {
            // The rest of the deletion rule's lines, untouched by 26ae6431b5, re-read on this build:
            // deleting a report (its task only), approving and hiding (A2), a comment gone with its
            // writer's merged account (A10).
            const X = {C1: `C1 reported ${A}.`, R1: `R1 deleted ${A}.`, R2: `R2 kept ${A}.`, C2: `C2 pending ${A}.`,
                C3: `C3 approved ${A}.`, C4: `C4 merged writer ${A}.`};
            await app.api.createContext({tag: `${A}m`, enablePublicComments: true,
                users: [u(`${A}m`, 'mg', ['manager']), u(`${A}m`, 'au', ['author']), u(`${A}m`, 'ra', ['reader']),
                    u(`${A}m`, 'rb', ['reader']), u(`${A}m`, 'rc', ['reader']), u(`${A}m`, 'rd', ['reader'])]});
            const M = `${A}m`;
            const sm = await app.api.createSubmission({tag: `${M}s`, context: M, submitter: `${M}au`, title: `Article ${M}`, published: true,
                userComments: [
                    {user: `${M}ra`, text: X.C1, approved: true, reports: [{user: `${M}rb`, note: X.R1}, {user: `${M}rb`, note: X.R2}]},
                    {user: `${M}ra`, text: X.C2, approved: false},
                    {user: `${M}ra`, text: X.C3, approved: true},
                    {user: `${M}rc`, text: X.C4, approved: true},
                ]});
            const ids = sm.userComments.map((c) => c.id);
            log('seeded', {ids, reports: sm.userComments[0].reports});
            const rows = {C1: X.C1, R1: X.R1, R2: X.R2, C2: X.C2, C3: X.C3, C4: X.C4};
            await signIn(am, `${M}mg`);
            const t0 = await readTasks(am, M, 'M-before', rows);
            const cp = new CommentsPage(am, M);
            // 1. Delete report R1 from C1's panel.
            await cp.goto(`?commentId=${ids[0]}`);
            await expect(cp.commentPanel()).toBeVisible({timeout: 30_000});
            await snap(am, 'M-c1-panel');
            if (cp.deleteReportFromPanel && app.name === 'ojs') {
                await cp.deleteReportFromRow(cp.reportRow(X.R1));
            } else {
                await cp.deleteReportFromRow(cp.reportRow(X.R1));
                await cp.confirmDeleteReport();
            }
            await snap(am, 'M-after-report-delete');
            const t1 = await readTasks(am, M, 'M-after-report-delete', rows);
            // 2. Approve C2; 3. hide C3.
            await cp.goto(`?commentId=${ids[1]}`);
            await expect(cp.commentPanel()).toBeVisible({timeout: 30_000});
            await cp.setApproval('Approve Comment');
            await snap(am, 'M-after-approve');
            await cp.goto(`?commentId=${ids[2]}`);
            await expect(cp.commentPanel()).toBeVisible({timeout: 30_000});
            await cp.setApproval('Hide Comment');
            await snap(am, 'M-after-hide');
            const t2 = await readTasks(am, M, 'M-after-approve-hide', rows);
            // 4. The Site Administrator merges C4's writer into another account.
            const {UsersPage} = require(path.join(ROOT, 'apps/ojs/playwright/pages/ReaderCommentsPages.js'));
            await signIn(bm, 'admin');
            const up = new UsersPage(bm, M);
            await up.goto(`${M}rc`);
            await up.mergeUser(`${M}rc`, `${M}rd`);
            await snap(bm, 'M-after-merge');
            const c4Gone = await (async () => { await cp.goto(); await snap(am, 'M-comments-after-merge'); return (await cp.row(X.C4).count()) === 0; })();
            const t3 = await readTasks(am, M, 'M-after-merge', rows);
            out.result = {ids, t0, t1, t2, t3, c4Gone};
            note(`ccInvs27 U14 moderation ${app.name}: report delete R1 ${t0.R1}->${t1.R1} (R2 ${t0.R2}->${t1.R2}, C1 ${t0.C1}->${t1.C1}); approve C2 ${t1.C2}->${t2.C2}, hide C3 ${t1.C3}->${t2.C3}; merge: C4 gone from Comments page ${c4Gone}, comment rows ${t2.comment}->${t3.comment}`);
        }
        record(`result-${MODE}`, out);
    } finally {
        record(`result-${MODE}`, out);
        await closeA();
        await closeB();
    }
});
