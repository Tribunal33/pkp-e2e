// U37 OMP1 issue walk (docs/issues/U37-OMP1-external-reviewer-listed-as-internal.md): on a
// press, the External Review stage's reviewer is listed under "Participants" with the wrong
// reviewer role ("Internal Reviewer"), and differently from one window to the next.
//
// Runs on a dataset fleet (PKP's default test dataset, docs/process/dataset.md), OMP, main or 3.5:
//   PROBE_FEATURE=<dataset feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/external-reviewer-listed-as-internal/walk.js
// Reset the fleet first (the walk adds a discussion on main). No assertions: each step is
// recorded with screen(); facts-omp.json holds the participant lines read.
//
// Steps (lib.js OMP):
//  1-4. dbarnes opens submission 16 at External Review, round 1, "Add" under "Review Tasks &
//       Discussions", reads Adela Gallego's line (an External Reviewer who completed her review).
//  5-7. Names the discussion "Figure check u37r16", ticks her, a message, "Save"; the row's
//       "Edit", her line there.
//  8-9. agallego opens her review ("4. Completion"), "Add" in the panel, her own line.
//  10.  Control and neighbour (the fix must leave it alone): dbarnes on submission 12 at
//       Internal Review, "Add": Paul Hudson (Internal Reviewer) reads "Internal Reviewer"; the
//       other participants' lines (dbarnes's "Press editor", the Author) unchanged.
// 3.5 has no "Add" window: the "Discussions" list's "Add discussion" form is read for steps 1-4
// and 10, then cancelled; the reviewer's side is not walked there.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const NAME = 'Figure check u37r16';
const MESSAGE = 'Please look again at figure 2.';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const is35 = app.line === 'stable-3_5_0';
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    const T = require('../../../pages/TasksDiscussionsPages.js');
    const panel = new T.TasksDiscussionsPanel(page, app.contextPath, {title: L.OMP.panel});
    const ext = L.OMP.external;
    const int = L.OMP.internal;
    try {
        await signIn(page, L.OMP.editor);
        if (is35) {
            // 1-4 (3.5): "Add discussion" on External Review.
            const r = await L.readAddDiscussion35(page, app, ext);
            record('01-add-external-35', await screen(page));
            await shot(page, '01-add-external-35');
            facts.externalAdd = r.lines;
            facts.externalReviewerLine = r.lines.find((l) => l.includes(ext.reviewerName)) || null;
            // 10 (3.5): control on Internal Review.
            const c = await L.readAddDiscussion35(page, app, int);
            record('10-add-internal-35', await screen(page));
            facts.internalAdd = c.lines;
            facts.internalReviewerLine = c.lines.find((l) => l.includes(int.reviewerName)) || null;
        } else {
            // 1-4. The editor's "Add" window on External Review.
            await panel.gotoEditorial(ext.id, ext.menuKey);
            record('02-external-review', await screen(page));
            const add = await panel.openAdd();
            facts.externalAdd = await L.participantLines(add, ext.reviewer);
            facts.externalReviewerLine = L.lineOf(facts.externalAdd, ext.reviewer);
            record('04-add-external', await screen(page));
            await shot(page, '04-add-external');

            // 5-7. Save the discussion with her, then "Edit".
            await add.nameField().fill(NAME);
            await add.tick(ext.reviewer);
            await add.typeMessage(MESSAGE);
            const answer = await add.saveAndAnswer();
            facts.save = answer.status();
            await idle(page);
            await panel.reland();
            const edit = await panel.openEdit(NAME);
            facts.externalEdit = await L.participantLines(edit, ext.reviewer);
            facts.externalEditReviewerLine = L.lineOf(facts.externalEdit, ext.reviewer);
            record('07-edit-external', await screen(page));
            await shot(page, '07-edit-external');
            await edit.cancelButton().click().catch(() => {});
            await L.sleep(800);
            await signOut(page);

            // 8-9. The reviewer's own "Add".
            await signIn(page, ext.reviewer);
            await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${ext.id}`));
            await idle(page);
            record('08-review-form', await screen(page));
            const own = await L.openReviewerAdd(page);
            facts.reviewerAdd = await L.participantLines(own, ext.reviewer);
            facts.reviewerOwnLine = L.lineOf(facts.reviewerAdd, ext.reviewer);
            record('09-reviewer-add', await screen(page));
            await shot(page, '09-reviewer-add');
            await own.cancelButton().click().catch(() => {});
            await L.sleep(800);
            await signOut(page);

            // 10. Control and neighbour: Internal Review.
            await signIn(page, L.OMP.editor);
            await panel.gotoEditorial(int.id, int.menuKey);
            const ctl = await panel.openAdd();
            facts.internalAdd = await L.participantLines(ctl, int.reviewer);
            facts.internalReviewerLine = L.lineOf(facts.internalAdd, int.reviewer);
            record('10-add-internal', await screen(page));
            await shot(page, '10-add-internal');
            await ctl.cancelButton().click().catch(() => {});
        }
    } catch (e) {
        facts.error = String(e && e.message).slice(0, 800);
        record('error-screen', await screen(page).catch(() => null));
        await shot(page, 'error-screen').catch(() => {});
    } finally {
        record('facts', facts);
        console.log(`[${app.name}] ${JSON.stringify(facts, null, 1)}`);
        await close();
    }
});
