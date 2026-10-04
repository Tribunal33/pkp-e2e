// Issue walk: U14 A6 — on the Comments page, the comment panel's and the
// report panel's link for a writer or reporter whose ORCID iD is not
// verified opens "<iD>%20(unauthenticated)" instead of the iD's ORCID page.
// Report: docs/issues/U14-A6-comment-panel-unverified-orcid-link-broken.md
//
// Preconditions (PKP's default test dataset, OJS main): zzedd has an ORCID
// iD that is not verified (SQL standing in for a registration through
// "Create or Connect your ORCID iD", lib.js setUnverifiedOrcid()).
// Steps:
//   1-2. rvaca: Settings › Website › Content › Comments, tick "Enable Public
//        Comments", "Save";
//   3-4. zzedd: article 17, comment "u14a comment by Zayan Zedd";
//   5.   ccorino: article 17, comment "u14a comment by Carlo Corino";
//   6-7. rvaca: Content › Comments, Carlo Corino's row "…" › "View
//        Comment", "Approve Comment";
//   8.   zzedd: article 17, Carlo Corino's comment "…" › "Report", reason
//        "u14a report by Zayan Zedd", "Submit";
//   9-10. rvaca: Comments page, Zayan Zedd's row "…" › "View Comment": read
//        the iD line, press the link;
//   11.  Carlo Corino's row "…" › "View Comment", "Reports" row "…" › "View
//        Report": read the iD line, press the link.
//
// Modes (first argument):
//   walk (default)  the precondition and the steps above
//   nb              neighbour check, after a walk (no reset in between):
//                   ccorino's comment panel with no iD (no ORCID line), then
//                   with a verified iD (lib of users-list-status-icons-unnamed
//                   connectOrcid(), the six rows of
//                   VerifyIdentityWithOrcid::setIdentityData()), the link's
//                   text, address and opened tab; zzedd's own view of his
//                   comment on the article page (the icon link under it);
//                   ccorino's iD removed again at the end
//
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs \
//     shared/playwright/checks/issues/comment-panel-unverified-orcid-link-broken/walk.js [walk|nb]
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql, serverLog} = require('../../../probe');
const {setUnverifiedOrcid, clearOrcid, pressOrcidLink, readOrcidLine} = require('./lib');
const {connectOrcid} = require('../users-list-status-icons-unnamed/lib');

const MODE = process.argv[2] || 'walk';
const SUBMISSION = 17;
const ZZ_COMMENT = 'u14a comment by Zayan Zedd';
const CC_COMMENT = 'u14a comment by Carlo Corino';
const REPORT = 'u14a report by Zayan Zedd';
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
const log = (...a) => console.log('[a6]', new Date().toISOString().slice(11, 19), ...a);

/** A step that records what it saw and never throws. */
async function step(R, name, fn) {
    try {
        R[name] = (await fn()) ?? 'ok';
    } catch (e) {
        R[name] = {error: e.message.split('\n')[0]};
        log('step', name, 'ERROR', R[name].error);
    }
}

async function panelRead(page, panel, label) {
    await idle(page);
    const out = {
        title: flat(await panel.getByRole('heading').first().innerText().catch(() => '')),
        person: flat(await panel.locator('h1').locator('xpath=following-sibling::p[1]').innerText().catch(() => '')),
        orcid: await readOrcidLine(panel),
    };
    record(`a6-${label}`, await screen(page));
    await shot(page, `a6-${label}`);
    const link = panel.locator('a[href*="orcid"]').first();
    if (await link.count()) out.opened = await pressOrcidLink(page, link);
    return out;
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        log(app.name, 'skipped: no screen writes a comment on a press or a preprint server');
        return;
    }
    const {ArticleCommentsPage, CommentsSettingsTab, CommentsPage} = require('../../../../../apps/ojs/playwright/pages/ReaderCommentsPages.js');
    const {page, close} = await launch(app);
    const article = new ArticleCommentsPage(page, app.contextPath);
    const comments = new CommentsPage(page, app.contextPath);
    const slog = serverLog(app);
    const from = slog.mark();
    const R = {mode: MODE, app: app.name};
    try {
        if (MODE === 'walk') {
            R.precondition = setUnverifiedOrcid(app, 'zzedd');
            R.preconditionRows = sql(app, `SELECT setting_name, setting_value FROM user_settings WHERE setting_name LIKE 'orcid%' AND user_id = (SELECT user_id FROM users WHERE username = 'zzedd') ORDER BY 1`);
            // Steps 1, 2.
            log('steps 1-2: rvaca switches comments on');
            await signIn(page, 'rvaca');
            const tab = new CommentsSettingsTab(page, app.contextPath);
            await tab.goto();
            await tab.box().check();
            await step(R, 'step2save', async () => ({sawSaving: await tab.save()}));
            R.enabledInDb = sql(app, `SELECT setting_value FROM journal_settings WHERE setting_name = 'enablePublicComments'`);
            // Steps 3, 4.
            log('steps 3-4: zzedd comments');
            await signIn(page, 'zzedd');
            await article.goto(SUBMISSION);
            await step(R, 'step4comment', async () => ({id: await article.writeComment(ZZ_COMMENT)}));
            // Step 5.
            log('step 5: ccorino comments');
            await signIn(page, 'ccorino');
            await article.goto(SUBMISSION);
            await step(R, 'step5comment', async () => ({id: await article.writeComment(CC_COMMENT)}));
            // Steps 6, 7.
            log('steps 6-7: rvaca approves Carlo Corino\'s comment');
            await signIn(page, 'rvaca');
            await comments.goto();
            await step(R, 'step7approve', async () => {
                await comments.viewComment(comments.row(CC_COMMENT));
                await comments.setApproval('Approve Comment');
            });
            // Step 8.
            log('step 8: zzedd reports it');
            await signIn(page, 'zzedd');
            await article.goto(SUBMISSION);
            await step(R, 'step8report', async () => {
                const dialog = await article.openReportDialog(article.comment(CC_COMMENT));
                await article.reasonBox(dialog).fill(REPORT);
                await article.submitReport(dialog);
            });
            // Steps 9, 10.
            log('steps 9-10: the comment panel');
            await signIn(page, 'rvaca');
            await comments.goto();
            await step(R, 'step10commentPanel', async () => {
                const panel = await comments.viewComment(comments.row(ZZ_COMMENT));
                const out = await panelRead(page, panel, 'step10-comment-panel');
                await comments.closeCommentPanel();
                return out;
            });
            // Step 11.
            log('step 11: the report panel');
            await step(R, 'step11reportPanel', async () => {
                await comments.viewComment(comments.row(CC_COMMENT));
                const reportPanel = await comments.viewReport(comments.reportRow(REPORT));
                return panelRead(page, reportPanel, 'step11-report-panel');
            });
            R.reportsInDb = sql(app, `SELECT COUNT(*) FROM user_comment_reports`);
            await signOut(page);
        } else if (MODE === 'nb') {
            await signIn(page, 'rvaca');
            await comments.goto();
            clearOrcid(app, 'ccorino');
            await step(R, 'noIdPanel', async () => {
                const panel = await comments.viewComment(comments.row(CC_COMMENT));
                const out = await panelRead(page, panel, 'nb-no-id-panel');
                await comments.closeCommentPanel();
                return out;
            });
            R.verifiedRows = connectOrcid(app, 'ccorino');
            await comments.goto();
            await step(R, 'verifiedPanel', async () => {
                const panel = await comments.viewComment(comments.row(CC_COMMENT));
                const out = await panelRead(page, panel, 'nb-verified-panel');
                await comments.closeCommentPanel();
                return out;
            });
            await step(R, 'unverifiedPanelAgain', async () => {
                const panel = await comments.viewComment(comments.row(ZZ_COMMENT));
                const out = await panelRead(page, panel, 'nb-unverified-panel');
                await comments.closeCommentPanel();
                return out;
            });
            await step(R, 'articleAsWriter', async () => {
                await signIn(page, 'zzedd');
                await article.goto(SUBMISSION);
                const own = article.comment(ZZ_COMMENT);
                const cc = article.comment(CC_COMMENT);
                // the comments load after the page: wait for both before reading
                await own.waitFor({timeout: 30_000});
                await cc.waitFor({timeout: 30_000});
                const read = async (a) => ({
                    links: await a.locator('a[href*="orcid"]').evaluateAll((els) =>
                        els.map((x) => ({href: x.getAttribute('href'), name: x.getAttribute('aria-label'), text: x.textContent.trim()}))
                    ),
                });
                const out = {own: await read(own), ccorino: await read(cc)};
                record('a6-nb-article', await screen(page));
                await shot(page, 'a6-nb-article');
                return out;
            });
            clearOrcid(app, 'ccorino');
            await signOut(page);
        } else {
            throw new Error(`unknown mode ${MODE}`);
        }
    } catch (e) {
        R.error = e.message;
        log(app.name, 'ERROR', e.message);
        await shot(page, `a6-${MODE}-error`).catch(() => {});
    } finally {
        R.serverLog = slog.since(from);
        record(`a6-${MODE}`, R);
        log(app.name, JSON.stringify(R, null, 1).slice(0, 4000));
        await close();
    }
});
