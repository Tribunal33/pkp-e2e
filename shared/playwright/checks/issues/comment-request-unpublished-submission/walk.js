// U14 A18: a comment request made by hand (the article page's own `POST comments`) is accepted on a
// submission that is not published, and while "Enable Public Comments" is off; its answer names the
// submission's full title and first author. Takes the steps of
// docs/issues/U14-A18-comment-request-unpublished-submission.md on PKP's default test dataset.
//
//   walk (the report's steps and the control), all three apps:
//     PROBE_FEATURE=issues-h15g PROBE_AGENT=h15g node bin/probe.js all shared/playwright/checks/issues/comment-request-unpublished-submission/walk.js
//   neighbour (the fix must leave commenting on a published article alone): ticks "Enable Public Comments",
//   comments through the article page's box (OJS), then sends the request on the published and the
//   unpublished version:
//     PROBE_RUN=nb-in PROBE_FEATURE=issues-h15g PROBE_AGENT=h15g node bin/probe.js all …/walk.js neighbour
//   on stable-3_5_0 (no comments there: records the Website tabs and the request's answer):
//     PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h15g-3_5 PROBE_AGENT=h15g node bin/probe.js all …/walk.js
//
// Each step records rather than throws, so a fixed app (the requests refused) is read too.
const {forEachApp, launch, signIn, signOut, record, sql, serverLog} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const EDITOR = 'dbarnes';

// Per app: the reader, the unpublished submission's current version, the published one, the reviewer
// under "Anonymous Reviewer/Anonymous Author" and the version they review, and a version that is not
// the submission's current one (the control).
const CASES = {
    ojs: {reader: 'ccorino', unpublished: {submission: 4, publication: 5}, published: {submission: 17, publication: 18},
        reviewer: {username: 'amccrae', submission: 10, publication: 11, familyName: 'Novak'}, notCurrent: {submission: 1, publication: 2}},
    omp: {reader: 'aclark', unpublished: {submission: 3, publication: 3}, published: {submission: 14, publication: 14},
        reviewer: {username: 'agallego', submission: 16, publication: 16, familyName: 'Power'}, notCurrent: null},
    ops: {reader: 'ckwantes', unpublished: {submission: 1, publication: 1}, published: {submission: 17, publication: 18},
        reviewer: null, notCurrent: {submission: 3, publication: 3}},
};

forEachApp(async (app) => {
    const line = app.line || 'main';
    const c = CASES[app.name];
    const out = {mode: MODE, line};
    const step = (name, data) => { out[name] = data; record(`h15g-${MODE}`, out); };
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        step('state', {
            enablePublicComments: sql(app, `select setting_value from ${app.contextTables.settings} where setting_name = 'enablePublicComments'`),
            publications: sql(app, `select s.submission_id || ':' || s.current_publication_id || ':' || p.status from submissions s join publications p on p.publication_id = s.current_publication_id where s.submission_id in (${[c.unpublished.submission, c.published.submission, c.reviewer ? c.reviewer.submission : 0].join(',')}) order by 1`).split('\n'),
        });

        if (line !== 'main') {
            // 3.5 and older: no Comments tab and no comments API.
            await signIn(page, EDITOR);
            step('l-setting', await H.commentsSetting(page, app));
            await signIn(page, c.reader);
            step('l-dashboard', await H.dashboard(page, app, 'mySubmissions'));
            step('l-request', H.answer(await H.comment(page, app, c.unpublished.publication, 'h15g comment on a submission not published')));
            return;
        }

        if (MODE === 'neighbour') {
            await signIn(page, EDITOR);
            step('n1-tick', await H.commentsSetting(page, app, {tick: true}));
            await signIn(page, c.reader);
            if (app.name === 'ojs') step('n2-box', await H.commentThroughBox(page, app, c.published.submission, 'h15g neighbour comment through the box'));
            step('n3-dashboard', await H.dashboard(page, app, 'mySubmissions'));
            step('n3-published', H.answer(await H.comment(page, app, c.published.publication, 'h15g neighbour request on the published version')));
            step('n4-unpublished', H.answer(await H.comment(page, app, c.unpublished.publication, 'h15g neighbour request on a submission not published')));
            await signIn(page, EDITOR);
            step('n5-comments-page', await H.commentsPage(page, app));
            step('kept', sql(app, `select user_comment_id || ':' || publication_id || ':' || is_approved || ':' || comment_text from user_comments order by 1`).split('\n').filter(Boolean));
            return;
        }

        // 1. The setting is off.
        await signIn(page, EDITOR);
        step('s1-setting', await H.commentsSetting(page, app));
        // 2-4. A reader, on a submission not published and on the published article.
        await signIn(page, c.reader);
        step('s2-dashboard', await H.dashboard(page, app, 'mySubmissions'));
        step('s3-unpublished', H.answer(await H.comment(page, app, c.unpublished.publication, 'h15g comment on a submission not published')));
        step('s4-published-comments-off', H.answer(await H.comment(page, app, c.published.publication, 'h15g comment with comments off')));
        // 5-6. The anonymous reviewer, on their own review page.
        if (c.reviewer) {
            await signIn(page, c.reviewer.username);
            step('s5-review-page', await H.reviewPage(page, app, c.reviewer.submission, c.reviewer.familyName));
            // the snippet is pasted on this review page, which carries the reviewer's CSRF token
            step('s6-reviewer', H.answer(await H.comment(page, app, c.reviewer.publication, 'h15g comment by the anonymous reviewer')));
        }
        // 7. Control: a version that is not the submission's current one.
        if (c.notCurrent) {
            await signIn(page, c.reader);
            await H.dashboard(page, app, 'mySubmissions');
            step('s7-control-not-current', H.answer(await H.comment(page, app, c.notCurrent.publication, 'h15g control')));
        }
        // 8. The moderators' Comments page.
        await signIn(page, EDITOR);
        step('s8-comments-page', await H.commentsPage(page, app));
        step('kept', sql(app, `select user_comment_id || ':' || publication_id || ':' || is_approved || ':' || comment_text from user_comments order by 1`).split('\n').filter(Boolean));
        step('tasks', sql(app, `select count(*) from notifications where type = ${0x100002d}`));
    } catch (e) {
        step('error', String((e && e.stack) || e).slice(0, 2000));
        throw e;
    } finally {
        step('serverLog', log.since(from));
        await signOut(page).catch(() => {});
        await close();
    }
});
