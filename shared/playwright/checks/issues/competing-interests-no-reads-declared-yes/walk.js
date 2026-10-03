// U27 A39 issue walk: "View changes" on a "…Reviewer Competing Interests." line of the Activity Log
// reads "Competing Interests declared: YES" for an answer of "I do not have any competing interests".
// Issue report: docs/issues/U27-A39-competing-interests-no-reads-declared-yes.md.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal or press
// `publicknowledge`; the kit builds nothing: the policy is typed on screen. A preprint server has
// no review: not walked. Helpers: ../review-details-guidance-promises-upload/lib.js.
//
// MODE=walk (default), OJS submission 7 (Paul Hudson) / OMP submission 16 (Adela Gallego):
//   1 `dbarnes`; 2 Settings › Workflow › "Review" › "Reviewer Guidance": "Competing Interests" policy,
//   "Save"; 3 the workflow, "Read Review"; 4 "Modify Review" (answered "Modify Review"), "I do not
//   have any competing interests", "Save Changes"; 5 again, "I may have competing interests (Specify
//   below)" with "u27k7 statement"; 6 again, "I do not have any competing interests"; 7 "Activity
//   Log": each "…Reviewer Competing Interests." line's arrow, "View changes", read, "Close".
// MODE=nb, the neighbour alone (with a fix in and out): the same, with a statement each time
//   ("u27k7 first", then "u27k7 second"): an answer with a statement must keep reading
//   "declared: YES" with it, and a never-answered previous state "declared: NO".
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/competing-interests-no-reads-declared-yes/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a39-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('../review-details-guidance-promises-upload/lib.js');

const MODE = process.env.MODE || 'walk';
const POLICY = 'u27k7 policy: declare any competing interests.';
const ANSWERS = MODE === 'nb' ? ['u27k7 first', 'u27k7 second'] : [null, 'u27k7 statement', null];

forEachApp(async (app) => {
    const c = L.CASES.done[app.name];
    if (!c) { console.log(`[a39 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`a39-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a39-${MODE}-${key}-threw`).catch(() => {});
        }
        console.log(`[a39 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        return o[key];
    };
    const snap = async (label) => { record(label, await screen(page)); await shot(page, label).catch(() => {}); };
    let details = null;
    try {
        await step('policy', async () => { await signIn(page, 'dbarnes'); return L.setCompetingInterestsPolicy(page, app, POLICY); }); // 1-2
        await step('details', async () => {                                                                                    // 3
            await L.openWorkflow(page, app, c.id);
            details = await L.openReadReview(page, c.reviewer);
            const w = await L.readWindow(details);
            return {title: w.title, modifyOffered: w.buttons.includes('Modify Review'), text: w.text.slice(0, 1200)};
        });
        for (let i = 0; i < ANSWERS.length; i++) {                                                                             // 4-6
            const key = `save${i + 1}`;
            const r = await step(key, async () => {
                if (!details) return {offered: false};
                const m = await L.openModify(page, details);
                if (!m.dialog) return {offered: false};
                const out = await L.saveCompetingInterests(page, m.dialog, ANSWERS[i]);
                const w = await L.readWindow(details);
                out.detailsAfter = (w.text.match(/Competing Interests[\s\S]{0,200}/) || [null])[0];
                return {answer: ANSWERS[i] == null ? 'I do not have any competing interests' : ANSWERS[i], ...out};
            });
            if (r && r.offered === false) break;
        }
        await step('stored', async () => sql(app, `SELECT competing_interests_declared, competing_interests FROM review_assignments ra
            JOIN users u ON u.user_id = ra.reviewer_id WHERE ra.submission_id = ${c.id} AND u.username IN ('phudson','agallego')`));
        await step('closed', async () => { if (details && await details.isVisible()) await L.cancelWindow(page, details); return {ok: true}; });
        await step('log', async () => {                                                                                        // 7
            const v = await L.viewChanges(page, 'Reviewer Competing Interests');
            await snap(`a39-${MODE}-7-activity-log`);
            return v;
        });
    } finally {
        record(`a39-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
