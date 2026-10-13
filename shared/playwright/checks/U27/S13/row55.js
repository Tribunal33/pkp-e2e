// U27 claim check S13, row 55 (owning spec U38): the submission Activity Log hides the
// "View changes" link from a reader who is an assigned author of the submission
// (EventLogGridRow), but does the op it points at still answer that reader for their OWN
// submission's edited review? The committed A11 walk covers the CROSS-submission case
// (fixed by pkp/pkp-lib#13465); this drives the author-on-the-same-submission case.
//
// A Section Editor cannot be added through the "Assign" participant window (its Author
// user-group grid is empty: authors are the submission's own contributors, not assignable
// stage participants). So the dual role is made the other way: the submission's own author
// account (jnovak owns OJS submission 10) is granted the journal Section-editor role, a
// precondition set directly on this disposable dataset fleet (reset before each run). The
// FINDING itself — the hidden link and the op's answer by address — is driven on screen.
//
// Per run (reset fleet first), twice (PROBE_RUN r1, r2):
//   PKP_E2E_DATASET=3 PROBE_FEATURE=U27 PROBE_AGENT=ccS13 PROBE_RUN=r1 node bin/probe.js ojs <this>
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('../../issues/activity-log-view-changes-reads-any-review/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 800) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

// Per app: the submission whose review the editor edits, and that submission's own author
// account (an assigned Author stage participant). OMP 16's author is mpower.
const CASE = {
    ojs: {sub: 10, reviewer: 'Aisla McCrae', author: 'jnovak', sectionEditorGroupRole: 16 /* SUB_EDITOR */},
    omp: {sub: 16, reviewer: 'Adela Gallego', author: 'mpower', sectionEditorGroupRole: 16},
};

/** Grant a user the journal's Section-editor user group (role_id 17 = ROLE_ID_SUB_EDITOR),
 *  the group dbuskins/sberardo hold, on this disposable dataset fleet. Returns what it did. */
function grantSectionEditor(app, username) {
    const uid = sql(app, `SELECT user_id FROM users WHERE username='${username}'`).trim();
    // The context's Section-editor group: role_id 17 (ROLE_ID_SUB_EDITOR) in this journal.
    const gid = sql(app, `SELECT ug.user_group_id FROM user_groups ug
        JOIN ${app.contextTables.table} j ON j.${app.contextTables.id} = ug.context_id AND j.path='${app.contextPath}'
        WHERE ug.role_id = 17 ORDER BY ug.user_group_id LIMIT 1`).trim();
    const already = sql(app, `SELECT 1 FROM user_user_groups WHERE user_id=${uid} AND user_group_id=${gid}`).trim();
    if (!already) sql(app, `INSERT INTO user_user_groups (user_group_id, user_id) VALUES (${gid}, ${uid})`);
    // Also an editorial stage assignment on the submission (as the section editors have),
    // so the account passes UserAccessibleWorkflowStageRequiredPolicy while keeping its
    // existing Author stage assignment (which sets _isCurrentUserAssignedAuthor).
    const sub = CASE[app.name].sub;
    const hasStage = sql(app, `SELECT 1 FROM stage_assignments WHERE submission_id=${sub} AND user_id=${uid} AND user_group_id=${gid}`).trim();
    if (!hasStage) sql(app, `INSERT INTO stage_assignments (submission_id, user_group_id, user_id, date_assigned, recommend_only, can_change_metadata) VALUES (${sub}, ${gid}, ${uid}, now(), 0, 1)`);
    const stages = sql(app, `SELECT ug.role_id FROM stage_assignments sa JOIN user_groups ug ON ug.user_group_id=sa.user_group_id WHERE sa.submission_id=${sub} AND sa.user_id=${uid} ORDER BY ug.role_id`);
    return {uid, gid, already: !!already, stageRolesOnSubmission: stages.replace(/\n/g, ',')};
}

forEachApp(async (app) => {
    if (app.name === 'ops') { console.log('[row55 ops] no review stage: not driven'); return; }
    const c = CASE[app.name];
    const o = {app: app.name, line: app.line || 'main', submission: c.sub, authorAccount: c.author};
    const {page, close} = await launch(app);
    try {
        // 1-2: editor edits the review and reads the "View changes" entry
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});
        o.edit = await L.editReviewComment(page, app, {id: c.sub, reviewer: c.reviewer});
        o.entry = await L.readViewChanges(page);
        o.logEntryId = o.entry && o.entry.logEntryId;
        record('row55-1-after-edit', await screen(page).catch(() => ({url: page.url()})));
        if (!o.logEntryId) throw new Error('no review-change entry read');
        await signOut(page).catch(() => {});

        // precondition on the disposable fleet: the submission's author also a Section editor
        o.grant = grantSectionEditor(app, c.author);

        // 3: as the author-and-section-editor account, open the submission's Activity Log
        await signIn(page, c.author, {contextPath: app.contextPath});
        await page.goto('about:blank');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${c.sub}`));
        await idle(page);
        await sleep(1000);
        record('row55-3-workflow', await screen(page).catch(() => ({url: page.url()})));
        const logBtn = page.getByRole('button', {name: 'Activity Log', exact: true}).first();
        o.activityLogReachable = await logBtn.isVisible().catch(() => false);
        if (o.activityLogReachable) {
            await logBtn.click();
            const log = page.getByRole('dialog', {name: 'Activity Log & Notes', exact: true});
            await log.waitFor({timeout: T}).catch(() => {});
            await idle(page);
            const changeRow = log.locator('tbody tr.gridRow').filter({hasText: 'modified in this review'}).first();
            o.reviewChangeRowPresent = await changeRow.count().then((n) => n > 0).catch(() => false);
            if (o.reviewChangeRowPresent) {
                await changeRow.locator('a.show_extras').click().catch(() => {});
                await sleep(400);
                const strip = changeRow.locator('xpath=following-sibling::tr[1]');
                o.viewChangesLinkShown = await strip.getByRole('link', {name: 'View changes', exact: true}).count().then((n) => n > 0).catch(() => false);
            }
            record('row55-3-activity-log', await screen(page).catch(() => ({url: page.url()})));
            await shot(page, 'row55-3-activity-log').catch(() => {});
        }

        // 4: navigate to the view-review-change address for THIS submission's own entry
        const addr = `${app.baseURL}/index.php/${app.contextPath}/$$$call$$$/grid/event-log/submission-review-event-log-grid/view-review-change?submissionId=${c.sub}&logEntryId=${o.logEntryId}`;
        const res = await page.goto(addr).catch(() => null);
        await idle(page).catch(() => {});
        const content = await page.content();
        o.byAddress = {
            who: c.author, note: 'author of the submission, also granted Section editor',
            submissionId: c.sub, logEntryId: o.logEntryId,
            status: res && res.status(),
            body: flat(await page.locator('body').innerText().catch(() => ''), 700),
            isReviewHtml: /Updated Comments|Previous Comments|Updated Reviewer Recommendation|Updated Form Responses|Updated Competing Interests/.test(content),
            hasEditedText: content.includes(L.COMMENT),
        };
        record('row55-4-by-address', o.byAddress);
        await shot(page, 'row55-4-by-address').catch(() => {});
        console.log(`[row55 ${app.name}] logEntry=${o.logEntryId} linkShown=${o.viewChangesLinkShown} byAddress`, JSON.stringify(o.byAddress));
        await signOut(page).catch(() => {});
    } catch (e) {
        o.fatal = flat(e.message, 500);
        record('row55-fatal', await screen(page).catch(() => ({url: page.url()})));
        console.log(`[row55 ${app.name}] FATAL`, o.fatal);
    } finally {
        record('row55-facts', o);
        await close();
    }
});
