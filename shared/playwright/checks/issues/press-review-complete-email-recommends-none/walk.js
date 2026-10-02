// U28 OMP2 issue walk: on a press, a reviewer submits a review (step 3 asks for no recommendation)
// and the email that tells the assigned editor reads "… recommends None for #17 …" with a
// "Recommendation: None" line. Issue report:
// docs/issues/U28-OMP2-press-review-complete-email-recommends-none.md.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), press or journal
// `publicknowledge`. The kit builds nothing. A preprint server has no review: not walked.
// Helpers: ./lib.js.
//
// MODE=walk (default). Press, submission 17:
//   1-2 `dbarnes`: the workflow's "Participants" › "Assign", "Press editor", "Search", "Daniel
//       Barnes", "OK" (the email goes to the editors assigned to the submission; 17 has none);
//   3-4 `jjanssen` opens the review, "Accept Review, Continue to Step #2", "Continue to Step #3";
//   5   "Submit Review", "OK";
//   6   the email to dbarnes@mailinator.com.
//   Journal (the control), submission 12, `dbarnes` already assigned: steps 3-6, with "Accept
//   Submission" chosen under "Recommendation" before "Submit Review".
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing: the
//   press's steps 1-2, then `phudson` opens his review of 17 and presses "Accept Review, Continue to
//   Step #2"; the "Review accepted" email to dbarnes@mailinator.com, and the stored default email
//   texts other than "Review complete" (one hash), which a fix must leave alone.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/press-review-complete-email-recommends-none/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/omp2-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) { console.log(`[omp2 ${app.name}] no review: not walked`); return; }
    if (MODE === 'nb' && app.name !== 'omp') { console.log(`[omp2 ${app.name}] the neighbour is the press's: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`omp2-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `omp2-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[omp2 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 3000));
        return o[key];
    };
    const snap = async (label) => { record(label, await screen(page)); await shot(page, label).catch(() => {}); };
    try {
        o.stored = L.storedTemplates(app);
        if (c.assign) {
            await step('assigned', async () => {                                                         // 1-2
                await signIn(page, 'dbarnes');
                const a = await L.assignParticipant(page, app, c.id, c.assign);
                await snap(`omp2-${MODE}-2-assigned`);
                return a;
            });
        }
        if (MODE === 'nb') {
            const since = new Date();
            await step('accepted', async () => { await signIn(page, c.neighbour.username); return L.acceptReview(page, app, c.id); });
            await step('acceptedLetter', async () => L.letter(app, {to: c.editorMail, subject: 'Review accepted', words: c.words, since}));
        } else {
            await step('accepted', async () => { await signIn(page, c.reviewer.username); return L.acceptReview(page, app, c.id); }); // 3-4
            const since = new Date();
            await step('submitted', async () => {                                                        // 4-5
                const s = await L.finishReview(page, app, {recommendation: c.recommendation});
                await snap(`omp2-${MODE}-5-submitted`);
                return s;
            });
            await step('letter', async () => L.letter(app, {to: c.editorMail, subject: 'Review complete', words: c.words, since})); // 6
        }
    } finally {
        record(`omp2-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
