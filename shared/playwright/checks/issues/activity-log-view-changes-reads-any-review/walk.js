// U38 A11 issue walk: the submission Activity Log's "View changes" opens any edited review by its
// log-entry number, not only those on this submission's own history. A Section/Series editor
// assigned to one submission reads the edited review of another; the submission-access check guards
// the request's submissionId, which viewReviewChange() ignores (it loads the logEntryId by primary
// key). Issue report: docs/issues/U38-A11-activity-log-view-changes-reads-any-review.md.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal/press
// `publicknowledge`. The kit builds nothing: the edited review is made on screen. A preprint server
// has no review stage: not walked. Helpers: lib.js and ../modify-review-offered-then-refused/lib.js.
//
// MODE=walk (default): OJS sub 10 (Aisla McCrae) / OMP sub 16 (Adela Gallego):
//   1-2 `dbarnes` edits the review's comment, reads the "View changes" address and window (the entry E);
//   3   `minoue` (editor of 19/6, not 10/16): the same request with submissionId=19/6, logEntryId=E
//       -> the leak (expected: refused);
//   4   controls: minoue with submissionId=10/16 (no access) -> refused; `svogt`/`author` (no editor
//       role) with submissionId=19/6 -> refused; `dbarnes` with submissionId=10/16 -> 200 (legit).
// MODE=nb, the neighbour alone (with a fix in and out): the legit read (dbarnes, own submission) and
//   the two refusals (minoue no-access, author role) must keep their answers; only the leak flips to 404.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=x4 node bin/probe.js ojs,omp shared/playwright/checks/issues/activity-log-view-changes-reads-any-review/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/x4/a11-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (app.name === 'ops') { console.log('[a11 ops] no review stage: not walked'); return; }
    const c = L.CASES[app.name];
    const o = {app: app.name, line: app.line || 'main', mode: MODE, edit: c.edit.id, accessible: c.accessible.id, probes: {}};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); }
        catch (e) { o[key] = {threw: L.flat(e.message, 400)}; await shot(page, `a11-${MODE}-${key}-threw`).catch(() => {}); }
        console.log(`[a11 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        return o[key];
    };
    const probe = async (label, who, args) => {
        const r = await L.probeViewReviewChange(page, app, o.href, args);
        o.probes[label] = {who, ...r};
        console.log(`[a11 ${app.name} ${MODE}] probe ${label} (${who})`, JSON.stringify(o.probes[label]).slice(0, 700));
        return r;
    };
    try {
        // 1-2: the editor edits the review and reads the entry
        await step('edit', async () => { await signIn(page, c.editor, {contextPath: app.contextPath}); return L.editReviewComment(page, app, c.edit); });
        await step('entry', async () => L.readViewChanges(page));
        if (!o.entry || !o.entry.href || !o.entry.logEntryId) throw new Error('no View changes entry found');
        o.href = o.entry.href;
        o.logEntryId = o.entry.logEntryId;
        await step('stored', async () => sql(app, `SELECT log_id, assoc_type, assoc_id FROM event_log
            WHERE log_id = ${Number(o.logEntryId) || 0}`));
        record(`a11-${MODE}-2-view-changes`, o.entry);
        await shot(page, `a11-${MODE}-2-activity-log`).catch(() => {});
        await signOut(page).catch(() => {});

        if (MODE !== 'nb') {
            // 3: the leak — minoue, editor of the accessible submission, reads the edit submission's entry
            await signIn(page, c.subEditor, {contextPath: app.contextPath});
            await probe('leak', c.subEditor, {submissionId: c.accessible.id, logEntryId: o.logEntryId});
            // 4: controls
            await probe('noAccess', c.subEditor, {submissionId: c.edit.id, logEntryId: o.logEntryId});
            await signOut(page).catch(() => {});
        }

        // controls kept in both modes (the neighbour's "must-stay" cases)
        await signIn(page, c.assistant, {contextPath: app.contextPath});
        await probe('roleAssistant', c.assistant, {submissionId: c.accessible.id, logEntryId: o.logEntryId});
        await signOut(page).catch(() => {});
        await signIn(page, c.author, {contextPath: app.contextPath});
        await probe('roleAuthor', c.author, {submissionId: c.accessible.id, logEntryId: o.logEntryId});
        await signOut(page).catch(() => {});
        // legit: the submission's own editor
        await signIn(page, c.editor, {contextPath: app.contextPath});
        await probe('legit', c.editor, {submissionId: c.edit.id, logEntryId: o.logEntryId});
    } catch (e) {
        o.fatal = L.flat(e.message, 400);
        record(`a11-${MODE}-fatal`, await screen(page).catch(() => ({url: page.url()})));
    } finally {
        record(`a11-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
