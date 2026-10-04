// U38 A5 issue walk (issue report docs/issues/U38-A5-review-complete-line-names-recipient.md): when a
// reviewer submits a review, the "Activity Log"'s "History" gains one "Review complete" email line per
// notified editor, each naming that editor under "User", although the journal sent it "From:" its
// contact. On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"); the kit builds
// nothing. A preprint server has no review: not walked. Helpers: ./lib.js.
//
// MODE=walk (default):
//   (OMP precondition) as `dbarnes`: submission 17 › "Participants" › "Assign": "Series editor",
//     David Buskins, "OK" (the submission has no editor);
//   1–4 as `jjanssen`: the review of OJS 12 / OMP 17: accept, step 3, a comment, (OJS) "Accept
//     Submission", "Submit Review", "OK"; 5–6 as `dbarnes`: "Activity Log" › "History", "View Email"
//     on the "Review complete" line and on the reviewer's own "Review accepted" line.
// MODE=nb, the neighbour alone (with the fix in and out), every step recorded, none throwing:
//   as `phudson` on the same submission: accept only; as `dbarnes` "History": the reviewer's
//   "Review accepted" line must keep naming Paul Hudson, and the editor's stored review requests
//   ("Invitation to review" / "Manuscript Review Request") Daniel Barnes.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/review-complete-line-names-recipient/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a5-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) { console.log(`[a5 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => { await d.accept().catch(() => {}); });
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`a5-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a5-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[a5 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 3000));
        return o[key];
    };
    try {
        o.before = L.lastEmailLogId(app);
        if (MODE === 'nb') {
            await signIn(page, c.nb);
            await step('accept', () => L.acceptReview(page, app, c.id));
        } else {
            if (c.assign) {
                await signIn(page, 'dbarnes');
                await step('assign', () => L.assignEditor(page, app, 'a5-0-assign'));
            }
            await signIn(page, c.reviewer);
            await step('accept', () => L.acceptReview(page, app, c.id));
            await step('submit', () => L.submitReview(page, app, {text: 'u38b review comment', recommendation: c.recommendation}));
        }
        o.storedNew = L.storedEmails(app, c.id, o.before);
        await signIn(page, 'dbarnes');
        const views = [...new Set(o.storedNew.filter((e) => /^Review (complete|accepted)/.test(e.subject)).map((e) => `An email has been sent: ${e.subject}`))];
        await step('log', () => L.readLog(page, app, c.id, views, `a5-${MODE}-log`));
        const lines = o.log && o.log.lines ? o.log.lines : [];
        o.reviewComplete = lines.filter((l) => /^An email has been sent: Review complete/.test(l.event));
        o.reviewAccepted = lines.filter((l) => /^An email has been sent: Review accepted/.test(l.event));
        o.reviewRequests = lines.filter((l) => /^An email has been sent: (Invitation to review|Manuscript Review Request)/.test(l.event));
        o.storedReviewComplete = L.storedReviewComplete(app, c.id);
        await signOut(page).catch(() => {});
    } finally {
        record(`a5-facts-${MODE}`, o);
        console.log(JSON.stringify({reviewComplete: o.reviewComplete, reviewAccepted: o.reviewAccepted, reviewRequests: o.reviewRequests, viewed: o.log && o.log.viewed}, null, 1));
        await close();
    }
});
