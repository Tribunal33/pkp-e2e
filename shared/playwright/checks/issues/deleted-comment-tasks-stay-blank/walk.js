// U14 A10: a comment deleted with its submission, or with its writer's merged account, leaves its
// moderation tasks behind, blank and dead. Takes the steps of docs/issues/U14-A10-deleted-comment-tasks-stay-blank.md
// on PKP's default test dataset (OJS only: a press and a preprint server have no comment box).
//
//   default mode (the report's steps 1-18):
//     PROBE_FEATURE=issues-u14b PROBE_AGENT=u14b node bin/probe.js ojs shared/playwright/checks/issues/deleted-comment-tasks-stay-blank/walk.js
//   neighbour mode (the fix must not reach other comments' tasks): two readers comment on submission 17,
//   one of them is merged away; the other's row must keep its text and still open its comment, and the
//   moderator's own "Delete Comment" from that panel must still clear it.
//     PROBE_RUN=nb-in PROBE_FEATURE=issues-u14b PROBE_AGENT=u14b node bin/probe.js ojs …/walk.js neighbour
//   wayround mode (a blank row ticked and "Delete" pressed in the Tasks window): … walk.js wayround
//
// Each step records rather than throws once the deletions are done, so a fixed app (rows gone) is read too.
const {forEachApp, launch, signIn, record, shot, note} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const COMMENT_TASK = 'A comment has been submitted and is pending review by a moderator.';
const REPORT_TASK = 'A report was submitted for a comment and requires review by a moderator.';
const EDITOR = 'dbarnes';

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        record('skipped', {reason: 'no comment box on a press or a preprint server (spec U14 scenario 14)'});
        return;
    }
    const ctx = app.contextPath;
    const {page, close} = await launch(app);
    const out = {mode: MODE, line: app.line || 'main'};
    const step = (name, data) => { out[name] = data; record(`${MODE}`, out); };
    try {
        await signIn(page, EDITOR);
        step('s1-enable', await H.enableComments(page, ctx));

        if (MODE === 'wayround') {
            // The way round: dphillips's comment merged away, then the blank row ticked and "Delete" pressed.
            await signIn(page, 'dphillips');
            step('w-comment', await H.writeComment(page, ctx, 17, 'u14b way round comment by dphillips'));
            await signIn(page, EDITOR);
            step('w-merge', await H.mergeUser(page, ctx, 'dphillips', 'amwandenga'));
            const t = await H.readTasks(page, ctx, {keepOpen: true});
            const blank = H.blankRows(page, t.tasks, COMMENT_TASK);
            const res = {badge: t.badge, blankBefore: await blank.count()};
            if (res.blankBefore) {
                await t.tasks.box(blank.first()).check();
                await t.tasks.act('Delete');
                res.blankAfterInWindow = await H.blankRows(page, t.tasks, COMMENT_TASK).count();
                res.screen = await require('../../../probe').screen(page);
                await t.tasks.close();
                const again = await H.readTasks(page, ctx);
                res.after = {badge: again.badge, rows: again.rows};
            }
            step('w-delete', res);
            return;
        }

        if (MODE === 'neighbour') {
            const mine = 'u14b neighbour comment by dphillips';
            const theirs = 'u14b neighbour comment by ddiouf';
            await signIn(page, 'dphillips');
            step('n-dphillips-comment', await H.writeComment(page, ctx, 17, mine));
            await signIn(page, 'ddiouf');
            const theirId = await H.writeComment(page, ctx, 17, theirs);
            step('n-ddiouf-comment', theirId);
            await signIn(page, EDITOR);
            step('n-tasks-before', (await H.readTasks(page, ctx)).rows);
            step('n-merge', await H.mergeUser(page, ctx, 'dphillips', 'amwandenga'));
            step('n-listed-mine', await H.commentListed(page, ctx, mine));
            step('n-listed-theirs', await H.commentListed(page, ctx, theirs));
            const after = await H.readTasks(page, ctx, {keepOpen: true});
            const theirRow = after.tasks.row(theirs);
            const blank = await H.blankRows(page, after.tasks, COMMENT_TASK).count();
            const res = {badge: after.badge, rows: after.rows, blankCommentRows: blank, theirRowCount: await theirRow.count()};
            if (res.theirRowCount === 1) {
                res.pressTheirs = await H.pressTask(page, ctx, after.tasks, theirRow);
                res.pressTheirs.panelShowsText = await page.getByRole('dialog', {name: /^View comment details by/}).getByText(theirs).count();
                res.pressTheirs.expectedAddress = `commentId=${theirId}`;
            }
            step('n-tasks-after', res);
            // The moderator's own deletion, from the panel the row opened, still clears that row.
            if (res.pressTheirs && res.pressTheirs.commentPanel) {
                const {CommentsPage} = H.po();
                await new CommentsPage(page, ctx).deleteFromPanel();
                const gone = await H.readTasks(page, ctx);
                step('n-own-delete', {badge: gone.badge, rows: gone.rows, theirRowCount: gone.rows.filter((r) => r.title === theirs).length});
            }
            await shot(page, `${MODE}-end`);
            return;
        }

        // Steps 1-2: publish submission 4 from its Submission stage.
        step('s2-publish', (await H.publishFromSubmissionStage(page, ctx, 4)).text.main.slice(0, 600));

        // Steps 3-6: a comment, its approval, a report, the editor's rows.
        const text4 = 'u14b comment on submission 4';
        const reason4 = 'u14b report on submission 4';
        await signIn(page, 'ccorino');
        step('s3-comment-id', await H.writeComment(page, ctx, 4, text4));
        await signIn(page, EDITOR);
        await H.approve(page, ctx, text4);
        step('s4-approved', true);
        await signIn(page, 'ckwantes');
        await H.report(page, ctx, 4, text4, reason4);
        step('s5-reported', true);
        await signIn(page, EDITOR);
        const before = await H.readTasks(page, ctx);
        step('s6-tasks', {badge: before.badge, rows: before.rows});

        // Steps 7-9: unpublish, decline, delete.
        step('s7-9-delete', await H.unpublishDeclineDelete(page, ctx, 4));

        // Step 10: the comment is gone from the Comments page.
        step('s10-listed', await H.commentListed(page, ctx, text4));

        // Steps 11-13: the Tasks window, and pressing the blank rows.
        const after = await H.readTasks(page, ctx, {keepOpen: true});
        const blankComment = H.blankRows(page, after.tasks, COMMENT_TASK);
        const blankReport = H.blankRows(page, after.tasks, REPORT_TASK);
        const s11 = {badge: after.badge, rows: after.rows, blankCommentRows: await blankComment.count(), blankReportRows: await blankReport.count()};
        step('s11-tasks', s11);
        await shot(page, `${MODE}-s11-tasks`);
        if (s11.blankCommentRows) {
            step('s12-press-comment-row', await H.pressTask(page, ctx, after.tasks, blankComment.first()));
            await shot(page, `${MODE}-s12`);
        }
        if (s11.blankReportRows) {
            const again = await H.readTasks(page, ctx, {keepOpen: true});
            step('s13-rows-now', again.rows);
            step('s13-press-report-row', await H.pressTask(page, ctx, again.tasks, H.blankRows(page, again.tasks, REPORT_TASK).first()));
            await shot(page, `${MODE}-s13`);
        }

        // Steps 14-18: a comment by dphillips, then dphillips merged into amwandenga.
        const text17 = 'u14b comment by dphillips';
        await signIn(page, 'dphillips');
        step('s14-comment-id', await H.writeComment(page, ctx, 17, text17));
        await signIn(page, EDITOR);
        const pre = await H.readTasks(page, ctx);
        step('s15-tasks', {badge: pre.badge, rows: pre.rows});
        step('s16-merge', await H.mergeUser(page, ctx, 'dphillips', 'amwandenga'));
        step('s17-listed', await H.commentListed(page, ctx, text17));
        const post = await H.readTasks(page, ctx, {keepOpen: true});
        step('s18-tasks', {
            badge: post.badge,
            rows: post.rows,
            blankCommentRows: await H.blankRows(page, post.tasks, COMMENT_TASK).count(),
            blankReportRows: await H.blankRows(page, post.tasks, REPORT_TASK).count(),
            rowWithText: await post.tasks.row(text17).count(),
        });
        await shot(page, `${MODE}-s18-tasks`);
    } catch (e) {
        out.error = String(e.stack || e).slice(0, 1500);
        record(`${MODE}`, out);
        note(`u14b ${MODE} stopped: ${String(e).slice(0, 200)}`);
        await shot(page, `${MODE}-error`).catch(() => {});
        throw e;
    } finally {
        await close();
    }
});
