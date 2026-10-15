// U14 A17: the public comment list hands every report on an approved comment (the reporter's name,
// affiliation, ORCID iD and reason) to anyone who adds `includeReports` to its address.
// Takes the steps of docs/issues/U14-A17-public-comment-list-exposes-reports.md on PKP's default test
// dataset (OJS only: a press and a preprint server have no comment box to write the comment with).
//
//   walk (the report's steps 1-7 and the control):
//     PROBE_FEATURE=issues-h15f PROBE_AGENT=h15f node bin/probe.js ojs shared/playwright/checks/issues/public-comment-list-exposes-reports/walk.js
//   neighbour (the fix must leave the moderators' reading of reports alone): steps 1-4, then as dbarnes
//   the Comments page's report panel and the address of step 6:
//     PROBE_RUN=nb-in PROBE_FEATURE=issues-h15f PROBE_AGENT=h15f node bin/probe.js ojs …/walk.js neighbour
//   on stable-3_5_0 (no comments there: records the settings tab and the address's answer):
//     PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h15f-3_5 PROBE_AGENT=h15f node bin/probe.js ojs …/walk.js
//
// Each step records rather than throws, so a fixed app (no reports in the answer) is read too.
const {forEachApp, launch, signIn, signOut, screen, record, sql, idle} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const EDITOR = 'dbarnes';
const WRITER = 'ccorino';
const REPORTER = 'lchristopher';
const SUBMISSION = 17;
const TEXT = 'h15f comment by ccorino';
const REASON = 'h15f reason typed by lchristopher';

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const line = app.line || 'main';
    const out = {mode: MODE, line};
    const step = (name, data) => { out[name] = data; record(`h15f-${MODE}`, out); };
    const {page, close} = await launch(app);
    try {
        if (line !== 'main') {
            // 3.5 and older: no "Comments" tab and no comments API to ask.
            await signIn(page, EDITOR);
            await page.goto(`/index.php/${ctx}/management/settings/website`);
            await idle(page);
            step('l-website-tabs', await page.locator('main').getByRole('tab').allInnerTexts());
            await signOut(page);
            step('l-address', await H.openAddress(page, `/index.php/${ctx}/api/v1/comments/public?publicationIds=18&includeReports=1`));
            return;
        }
        if (app.name !== 'ojs') {
            record('skipped', {reason: 'no comment box on a press or a preprint server (spec U14 Purpose)'});
            return;
        }
        step('publication', sql(app, `select current_publication_id from submissions where submission_id = ${SUBMISSION}`).trim());

        // 1. Comments on.
        await signIn(page, EDITOR);
        step('s1-enable', await H.enableComments(page, ctx));
        // 2. ccorino writes.
        await signIn(page, WRITER);
        const written = await H.writeComment(page, ctx, SUBMISSION, TEXT);
        step('s2-comment', written);
        const pub = written.pagePublicationIds[0] || '18';
        // 3. dbarnes approves.
        await signIn(page, EDITOR);
        await H.approve(page, ctx, TEXT);
        step('s3-approved', true);
        // 4. lchristopher reports.
        await signIn(page, REPORTER);
        await H.report(page, ctx, SUBMISSION, TEXT, REASON);
        step('s4-reported', true);

        const list = `/index.php/${ctx}/api/v1/comments/public?publicationIds=${pub}`;
        const withReports = `${list}&includeReports=1`;

        if (MODE === 'neighbour') {
            await signIn(page, EDITOR);
            step('n-comments-page', await H.viewReportOnCommentsPage(page, ctx, TEXT, REASON));
            const a = await H.openAddress(page, withReports);
            step('n-moderator-address', {status: a.status, comment: H.commentIn(a, TEXT)});
            await signOut(page);
            const b = await H.openAddress(page, list);
            step('n-signed-out-plain', {status: b.status, comment: H.commentIn(b, TEXT)});
            return;
        }

        // 5. Signed out, the page's own request.
        await signOut(page);
        const s5 = await H.openAddress(page, list);
        step('s5-signed-out-plain', {path: s5.path, status: s5.status, comment: H.commentIn(s5, TEXT)});
        // 6. Signed out, with includeReports.
        const s6 = await H.openAddress(page, withReports);
        step('s6-signed-out-includeReports', {path: s6.path, status: s6.status, comment: H.commentIn(s6, TEXT), screen: await screen(page)});
        // 7. The comment's writer, with includeReports.
        await signIn(page, WRITER);
        const s7 = await H.openAddress(page, withReports);
        step('s7-writer-includeReports', {path: s7.path, status: s7.status, comment: H.commentIn(s7, TEXT)});
        // Control: signed out, the moderators' request for the comment's reports.
        await signOut(page);
        const c = await H.openAddress(page, `/index.php/${ctx}/api/v1/comments/${written.id}/reports`);
        step('control-signed-out-reports-route', {path: c.path, status: c.status, body: c.json || c.text});
    } catch (e) {
        step('error', String(e && e.stack || e).slice(0, 2000));
        throw e;
    } finally {
        await close();
    }
});
