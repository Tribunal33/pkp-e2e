// U31 A1 and A5 issue walk (docs/issues/U31-A5-funding-coordinator-create-reviewer-from-suggestion-does-nothing.md):
// a Funding coordinator on a submission whose author suggested reviewers. On PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), context `publicknowledge`. The kit builds
// nothing: every state is made through the screens. A preprint server has no reviewer
// suggestions (spec U31 Purpose): OPS is not walked. Every step is recorded and none throws, so
// the same script reads the state a fix brings (a button gone) and the 3.5 screens.
//
// Setup (both modes), the Steps' 1-5:
//   1 admin ticks "Allow authors to suggest potential reviewers at submission process" (Settings >
//   Workflow > Review > Setup); 2 admin gives svogt "Funding coordinator" (Administration > Hosted
//   Journals (Presses) > Settings wizard > Users > Edit User); 3 ccorino (OMP aclark) makes the
//   submission "u31q1 Reviewer suggestions" suggesting Nova Newcomer (no account) and Adela Gallego
//   (the dataset's reviewer); 4 dbarnes sends it to review; 5 dbarnes assigns Sarah Vogt as
//   Funding coordinator.
// MODE=walk (default): 6 svogt opens the submission (Review Round 1), 7 the Submission stage (A1);
//   8 "Add Reviewer", "Select Reviewer" on Nova Newcomer; 9 the username, "Add Reviewer" (A5);
//   10 the stage panel's "Nova Newcomer" "..." > "Add Reviewer", the same; control: dbarnes
//   creates Nova Newcomer from the list.
// MODE=nb, the neighbours alone (with a fix in and out): svogt's "Select Reviewer" on Adela
//   Gallego (an account with the Reviewer role) still adds her; dbarnes still sees Nova's "..."
//   menu and "Select Reviewer", and creating her from the list still works.
// MODE=multi: admin creates a second journal (press) and makes svogt its manager; svogt, still
//   only Funding coordinator on publicknowledge, reads Nova's controls there (the fix must hide them).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   ONLY=ojs,omp PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/funding-coordinator-create-reviewer-from-suggestion-does-nothing/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/q1-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`[q1 ${app.name}] no reviewer suggestions on this app: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try {
            o.steps[key] = await fn();
        } catch (e) {
            o.steps[key] = {error: H.flat(e.message, 400)};
            await shot(page, `q1-${MODE}-${key}`).catch(() => {});
        }
        console.log(`[q1 ${app.name} ${MODE}] ${key}: ${JSON.stringify(o.steps[key]).slice(0, 600)}`);
        return o.steps[key];
    };
    let id = null;
    try {
        // ---- Setup: Steps 1-5 ----
        await step('s1Setting', async () => {
            await signIn(page, 'admin');
            return H.enableSuggestions(page, app);
        });
        await step('s2Role', async () => H.giveCoordinatorRole(page, app));
        const sub = await step('s3Submit', async () => {
            await signIn(page, c.author);
            return H.submitWithSuggestions(page, app, [H.NOVA, H.ADELA]);
        });
        id = sub && sub.id;
        if (!id) throw new Error('no submission made');
        await step('s4Review', async () => {
            await signIn(page, 'dbarnes');
            return H.sendToReview(page, app, id);
        });
        await step('s5Assign', async () => H.assignCoordinator(page, app, id));
        const people = [H.NOVA, H.ADELA];

        if (MODE === 'walk') {
            // ---- 6-7: the stages as the coordinator (A1) ----
            await step('s6Review', async () => {
                await signIn(page, H.COORD.username);
                const r = await H.openStage(page, app, id, {people});
                record(`q1-${MODE}-s6-screen`, await screen(page));
                await shot(page, `q1-${MODE}-s6`);
                return r;
            });
            await step('s7Submission', async () => {
                const r = await H.openStage(page, app, id, {entry: 'Submission', people});
                await shot(page, `q1-${MODE}-s7`);
                return r;
            });
            // ---- 8-9: the list inside "Add Reviewer" (A5) ----
            let list = null;
            await step('s8Select', async () => {
                const back = await H.openStage(page, app, id, {entry: c.round, people});
                const opened = await H.openAddReviewer(page);
                list = opened.list;
                const sel = await H.selectSuggestion(page, list, H.NOVA);
                await shot(page, `q1-${MODE}-s8`);
                return {stage: back.heading, window: opened.read, select: sel};
            });
            await step('s9Create', async () => {
                if (!o.steps.s8Select || !o.steps.s8Select.select || !o.steps.s8Select.select.create) return {skipped: 'no Create New Reviewer form open'};
                const r = await H.createFromWindow(page, H.NOVA.username);
                record(`q1-${MODE}-s9-screen`, await screen(page));
                await shot(page, `q1-${MODE}-s9`);
                await H.closeAll(page);
                return {...r, reviewersAfter: await H.reviewerRows(page)};
            });
            // ---- 10: the stage panel's row menu (the second way in) ----
            await step('s10PanelRow', async () => {
                const back = await H.openStage(page, app, id, {entry: c.round, people});
                const opened = await H.addFromPanelRow(page, H.NOVA);
                let create = null;
                if (opened.offered && opened.create) {
                    create = await H.createFromWindow(page, H.NOVA.username);
                    await shot(page, `q1-${MODE}-s10`);
                    await H.closeAll(page);
                }
                return {stage: back.heading, panel: back.panel, opened, create, reviewersAfter: await H.reviewerRows(page)};
            });
            // ---- Control: the editor on the same round ----
            await step('control', async () => {
                await signIn(page, 'dbarnes');
                const back = await H.openStage(page, app, id, {entry: c.round, people});
                const opened = await H.openAddReviewer(page);
                const sel = await H.selectSuggestion(page, opened.list, H.NOVA);
                const create = sel.create ? await H.createFromWindow(page, H.NOVA.username) : null;
                await H.closeAll(page);
                return {stage: back.heading, errorDialog: back.errorDialog, panel: back.panel, window: opened.read, select: sel, create, reviewersAfter: await H.reviewerRows(page)};
            });
        } else if (MODE === 'multi') {
            // ---- A coordinator here who manages another context of the install ----
            await step('multiSecondContext', async () => {
                const B = require('../section-editors-not-assigned-second-journal/lib.js');
                await signIn(page, 'admin');
                const status = await B.createContext(page, app, {name: 'u31q1 Second', initials: 'U31Q', path: 'u31q1second', email: 'u31q1@mailinator.com'});
                const role = app.name === 'omp' ? 'Press manager' : 'Journal manager';
                const given = await B.giveRole(page, app, {username: H.COORD.username, role});
                return {status, role, given};
            });
            await step('multiCoordinator', async () => {
                await signIn(page, H.COORD.username);
                const back = await H.openStage(page, app, id, {entry: c.round, people});
                const opened = await H.openAddReviewer(page);
                await H.closeAll(page);
                return {stage: back.heading, panel: back.panel, window: opened.read};
            });
        } else {
            // ---- Neighbours ----
            await step('nbCoordinatorAdela', async () => {
                await signIn(page, H.COORD.username);
                const back = await H.openStage(page, app, id, {entry: c.round, people});
                const opened = await H.openAddReviewer(page);
                const sel = await H.selectSuggestion(page, opened.list, H.ADELA);
                let answer = null;
                if (sel.selected) {
                    const {ReviewerRequestWindow} = require('../../../pages/ReviewerSuggestionPages.js');
                    const resp = await new ReviewerRequestWindow(page).submit();
                    answer = {status: resp.status()};
                    await H.sleep(2500);
                }
                await H.closeAll(page);
                return {stage: back.heading, panel: back.panel, window: opened.read, select: sel, answer, reviewersAfter: await H.reviewerRows(page)};
            });
            await step('nbEditorNova', async () => {
                await signIn(page, 'dbarnes');
                const back = await H.openStage(page, app, id, {entry: c.round, people});
                const opened = await H.openAddReviewer(page);
                const sel = await H.selectSuggestion(page, opened.list, H.NOVA);
                const create = sel.create ? await H.createFromWindow(page, H.NOVA.username) : null;
                await H.closeAll(page);
                return {stage: back.heading, panel: back.panel, window: opened.read, select: sel, create, reviewersAfter: await H.reviewerRows(page)};
            });
        }
    } catch (e) {
        o.fatal = H.flat(e.message, 400);
    } finally {
        o.submissionId = id;
        record(`q1-${MODE}`, o);
        await close();
    }
});
