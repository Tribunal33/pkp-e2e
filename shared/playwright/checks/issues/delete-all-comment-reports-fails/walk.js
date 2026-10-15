// U14 A19: the request that deletes all of a comment's reports at once (DELETE comments/{id}/reports,
// which no screen sends) answers a server error and deletes nothing unless the comment has exactly one
// report. Takes the steps of docs/issues/U14-A19-delete-all-comment-reports-fails.md on PKP's default
// test dataset (OJS only: a press and a preprint server have no comment box to write a comment with).
//
//   walk (the report's steps 1-11):
//     PROBE_FEATURE=issues-h15h PROBE_AGENT=h15h node bin/probe.js ojs shared/playwright/checks/issues/delete-all-comment-reports-fails/walk.js
//   neighbour (the fix must leave another comment's report and every comment's own task alone):
//   steps 1-8, then comment B's report and task, and the "pending review" tasks, read again:
//     PROBE_RUN=nb-in PROBE_FEATURE=issues-h15h PROBE_AGENT=h15h node bin/probe.js ojs …/walk.js neighbour
//   on stable-3_5_0 (no comments there: records the Website settings tabs and the request's answer):
//     PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h15h-3_5 PROBE_AGENT=h15h node bin/probe.js ojs …/walk.js
//
// Each step records rather than throws once the request is sent, so a fixed app is read too.
const {forEachApp, launch, signIn, record, idle, sql, serverLog} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const MANAGER = 'rvaca';
const SUBMISSION = 17;
const A = 'h15h comment A by ccorino';
const B = 'h15h comment B by ckwantes';
const R1 = 'h15h reason 1 on A by lchristopher';
const R2 = 'h15h reason 2 on A by dsokoloff';
const RB = 'h15h reason on B by dsokoloff';
const COMMENT_TASK = 'A comment has been submitted and is pending review by a moderator.';
const REPORT_TASK = 'A report was submitted for a comment and requires review by a moderator.';

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const line = app.line || 'main';
    const out = {mode: MODE, line};
    const step = (name, data) => { out[name] = data; record(`h15h-${MODE}`, out); };
    const {page, close} = await launch(app);
    const db = (commentId) => ({
        reports: sql(app, `select count(*) from user_comment_reports where user_comment_id = ${commentId}`).trim(),
        reportTasks: sql(app, `select count(*) from notifications where assoc_type = ${0x0100011} and assoc_id in (select user_comment_report_id from user_comment_reports where user_comment_id = ${commentId})`).trim(),
    });
    const tasksSummary = (t) => ({
        badge: t.badge,
        commentTasks: t.rows.filter((r) => r.sentence === COMMENT_TASK).map((r) => r.title),
        reportTasks: t.rows.filter((r) => r.sentence === REPORT_TASK).map((r) => r.title),
    });
    try {
        if (line !== 'main') {
            // 3.5 and older: no "Comments" tab and no comments API.
            await signIn(page, MANAGER);
            await page.goto(`/index.php/${ctx}/management/settings/website`);
            await idle(page);
            step('l-website-tabs', await page.locator('main').getByRole('tab').allInnerTexts());
            step('l-request', await page.evaluate(async () => {
                /* global pkp */
                const res = await fetch(`${pkp.context.apiBaseUrl}comments/1/reports`, {
                    method: 'DELETE', headers: {'X-Csrf-Token': pkp.currentUser.csrfToken},
                });
                return {status: res.status, text: (await res.text()).slice(0, 300)};
            }));
            return;
        }
        if (app.name !== 'ojs') {
            record('h15h-skipped', {reason: 'no comment box on a press or a preprint server (spec U14 Purpose)'});
            return;
        }

        // 1. Comments on.
        await signIn(page, MANAGER);
        step('s1-enable', await H.enableComments(page, ctx));
        // 2-3. Two comments.
        await signIn(page, 'ccorino');
        const idA = await H.writeComment(page, ctx, SUBMISSION, A);
        await signIn(page, 'ckwantes');
        const idB = await H.writeComment(page, ctx, SUBMISSION, B);
        step('s2-3-ids', {A: idA, B: idB});
        // 4. Both approved.
        await signIn(page, MANAGER);
        await H.approve(page, ctx, A);
        await H.approve(page, ctx, B);
        step('s4-approved', true);
        // 5-6. Two reports on A, one on B.
        await signIn(page, 'lchristopher');
        await H.report(page, ctx, SUBMISSION, A, R1);
        await signIn(page, 'dsokoloff');
        await H.report(page, ctx, SUBMISSION, A, R2);
        await H.report(page, ctx, SUBMISSION, B, RB);
        step('s5-6-reported', true);
        // 7. The manager's view before the request.
        await signIn(page, MANAGER);
        step('s7-A', await H.readComment(page, ctx, A));
        step('s7-B', await H.readComment(page, ctx, B));
        step('s7-tasks', tasksSummary(await H.readTasks(page, ctx)));
        step('s7-db', {A: db(idA), B: db(idB)});

        // 8. The request for A (two reports).
        let log = serverLog(app), from = log.mark();
        step('s8-request-A', await H.sendDeleteReports(page, ctx, idA));
        step('s8-log', log.since(from));
        // 9. What the screens show after it.
        step('s9-A', await H.readComment(page, ctx, A));
        step('s9-tasks', tasksSummary(await H.readTasks(page, ctx)));
        step('s9-db', {A: db(idA), B: db(idB)});

        if (MODE === 'neighbour') {
            // B's report and task, and every comment's own "pending review" task, must stay.
            step('n-B', await H.readComment(page, ctx, B));
            step('n-db', {A: db(idA), B: db(idB)});
            return;
        }

        // 10. The request for B (one report): the control.
        log = serverLog(app); from = log.mark();
        step('s10-request-B', await H.sendDeleteReports(page, ctx, idB));
        step('s10-log', log.since(from));
        step('s10-B', await H.readComment(page, ctx, B));
        step('s10-tasks', tasksSummary(await H.readTasks(page, ctx)));
        step('s10-db', {A: db(idA), B: db(idB)});
        // 11. The request for B again (no reports left).
        log = serverLog(app); from = log.mark();
        step('s11-request-B-again', await H.sendDeleteReports(page, ctx, idB));
        step('s11-log', log.since(from));
    } catch (e) {
        step('error', String(e && e.stack || e).slice(0, 1500));
        throw e;
    } finally {
        await close();
    }
});
