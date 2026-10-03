// U27 OMP4 issue walk (docs/issues/U27-OMP4-press-mark-complete-closes-unreviewed-request.md): on a
// press, "Mark as Complete" in the Review Details window of a request nobody has answered or
// reviewed is enabled, and confirming it closes the reviewer's request with no review. On PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), `publicknowledge`; the kit
// builds nothing. OJS is the control (its window keeps the button disabled). A preprint server has
// no review: not walked. Every step is recorded and none throws, so the same script reads the state
// a fix brings (the button disabled) and the 3.5 window (its "Confirm").
//
// MODE=walk (default), OMP submission 17 / OJS submission 12:
//   unanswered: dbarnes, Paul Hudson's row, "More Actions" > "Review Details", the footer, "Mark as
//   Complete" > "Mark as Complete", the row; phudson's "My Assignments as Reviewer" and review page.
//   accepted: jjanssen accepts; dbarnes, Julie Janssen's "History", "Review Details", "Mark as
//   Complete", the row, "History"; jjanssen's lists and review page.
// MODE=nb, the neighbour alone (with a fix in and out): dbarnes, "Read Review" on a submitted review
//   (OMP submission 12 / OJS submission 7, Paul Hudson), the footer, "Mark as Complete", the row;
//   and before it, a review that arrived as a file: on Paul Hudson's unanswered request, "Modify
//   Review", a file uploaded under "Reviewer Files", "Cancel", then "Mark as Complete"; phudson's side;
//   {OJS} a reviewer's draft: jjanssen accepts, picks "Revisions Required" on step 3, "Save for Later";
//   dbarnes "Review Details", "Mark as Complete"; jjanssen's side.
// MODE=walk on OMP also takes the way round after the unanswered click: "Cancel Reviewer", "Add
//   Reviewer" searched for "Hudson", "Reinstate Reviewer".
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/press-mark-complete-closes-unreviewed-request/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/omp4-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) { console.log(`[omp4 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: L.flat(e.message, 500)}; }
        console.log(`[omp4 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        record(`omp4-${MODE}-${key}`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `omp4-${MODE}-${key}`).catch(() => {});
        record(`omp4-facts-${MODE}`, o);
        return o[key];
    };
    /** dbarnes on the open workflow: the row, "Review Details", the footer, the completion, the row again. */
    const complete = async (id, who, prefix) => {
        const out = {rowBefore: await L.readRow(page, who.name)};
        out.window = await L.openDetails(page, who.name);
        if (!out.window.opened) return out;
        const f = await L.footer(page);
        out.footer = {states: f.states, tail: f.tail};
        out.windowText = f.text;
        record(`omp4-${MODE}-${prefix}-window`, await screen(page));
        await shot(page, `omp4-${MODE}-${prefix}-window`).catch(() => {});
        out.complete = await L.markComplete(page);
        record(`omp4-${MODE}-${prefix}-completed`, await screen(page));
        await shot(page, `omp4-${MODE}-${prefix}-completed`).catch(() => {});
        await L.closeDetails(page);
        await L.openWorkflow(page, app, id);
        out.rowAfter = await L.readRow(page, who.name);
        out.stored = L.stored(app, id, who.user);
        return out;
    };
    try {
        if (MODE === 'nb') {
            // A review that arrived elsewhere, as a file: uploaded in "Modify Review", then "Mark as Complete"
            await step('nbFile', async () => {
                const u = c.open.unanswered;
                await signIn(page, 'dbarnes');
                await L.openWorkflow(page, app, c.open.id);
                const out = {window: await L.openDetails(page, u.name)};
                if (!out.window.opened || out.window.legacy) return out;
                out.footerBefore = (await L.footer(page)).states;
                const m = await L.G.openModify(page, L.details(page));
                if (!m.dialog) return {...out, modify: 'absent'};
                out.upload = await L.uploadReviewerFile(page, m.dialog);
                const f = await L.footer(page);
                out.footerAfterUpload = {states: f.states, tail: f.tail};
                out.complete = await L.markComplete(page);
                await L.closeDetails(page);
                await L.openWorkflow(page, app, c.open.id);
                out.rowAfter = await L.readRow(page, u.name);
                out.stored = L.stored(app, c.open.id, u.user);
                return out;
            });
            await step('nbFileReviewer', async () => {
                await signIn(page, c.open.unanswered.user);
                return L.reviewerSide(page, app, c.open.title);
            });
            if (app.name === 'ojs') {
                // A journal reviewer's draft with a recommendation ("Save for Later"), then "Mark as Complete"
                await step('nbDraft', async () => {
                    const a = c.open.accepted;
                    await signIn(page, a.user);
                    const out = {accept: await L.reviewerAccept(page, app, c.open.id)};
                    out.draft = await L.reviewerDraftRecommendation(page, app, c.open.id, 'Revisions Required');
                    out.storedDraft = L.stored(app, c.open.id, a.user);
                    await signIn(page, 'dbarnes');
                    await L.openWorkflow(page, app, c.open.id);
                    out.window = await L.openDetails(page, a.name);
                    const f = await L.footer(page);
                    out.footer = {states: f.states, tail: f.tail};
                    out.complete = await L.markComplete(page);
                    await L.closeDetails(page);
                    await L.openWorkflow(page, app, c.open.id);
                    out.rowAfter = await L.readRow(page, a.name);
                    out.stored = L.stored(app, c.open.id, a.user);
                    return out;
                });
                await step('nbDraftReviewer', async () => {
                    await signIn(page, c.open.accepted.user);
                    return L.reviewerSide(page, app, c.open.title);
                });
            }
            await step('nbSubmitted', async () => {
                await signIn(page, 'dbarnes');
                await signIn(page, 'dbarnes');
                await L.openWorkflow(page, app, c.done.id);
                const out = {rowBefore: await L.readRow(page, c.done.reviewer.name), storedBefore: L.stored(app, c.done.id, c.done.reviewer.user)};
                out.opened = await L.openDetailsFromReadReview(page, c.done.reviewer.name);
                if (!out.opened) return out;
                out.footer = (await L.footer(page)).states;
                out.complete = await L.markComplete(page);
                await L.closeDetails(page);
                await L.openWorkflow(page, app, c.done.id);
                out.rowAfter = await L.readRow(page, c.done.reviewer.name);
                out.stored = L.stored(app, c.done.id, c.done.reviewer.user);
                return out;
            });
        } else {
            const u = c.open.unanswered;
            const a = c.open.accepted;
            await step('unanswered', async () => {                                      // 1-6
                await signIn(page, 'dbarnes');
                await L.openWorkflow(page, app, c.open.id);
                return {storedBefore: L.stored(app, c.open.id, u.user), ...(await complete(c.open.id, u, 'unanswered'))};
            });
            await step('unansweredReviewer', async () => {                              // 7-8
                await signIn(page, u.user);
                return L.reviewerSide(page, app, c.open.title);
            });
            if (app.name === 'omp') {
                // The way round: "Cancel Reviewer", "Add Reviewer" for the same person, "Reinstate Reviewer"
                await step('wayRound', async () => {
                    await signIn(page, 'dbarnes');
                    return {...(await L.wayRound(page, app, c.open.id, u)), stored: L.stored(app, c.open.id, u.user)};
                });
            }
            await step('acceptedAccept', async () => {                                  // accepted 1
                await signIn(page, a.user);
                return L.reviewerAccept(page, app, c.open.id);
            });
            await step('acceptedHistoryBefore', async () => {                           // accepted 2
                await signIn(page, 'dbarnes');
                await L.openWorkflow(page, app, c.open.id);
                return {history: await L.history(page, a.name), stored: L.stored(app, c.open.id, a.user)};
            });
            await step('accepted', async () => {                                        // accepted 3-4
                await L.openWorkflow(page, app, c.open.id);
                const out = await complete(c.open.id, a, 'accepted');
                out.historyAfter = await L.history(page, a.name);
                return out;
            });
            await step('acceptedReviewer', async () => {                                // accepted 5
                await signIn(page, a.user);
                return L.reviewerSide(page, app, c.open.title);
            });
        }
    } finally {
        await close();
    }
});
