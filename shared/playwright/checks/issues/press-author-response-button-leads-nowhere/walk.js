// Kept walk for docs/issues/U30-OMP1-press-author-response-button-leads-nowhere.md (spec U30, register OMP1).
// On PKP's default test dataset (a dataset fleet), OMP. The kit builds nothing.
// External Review, submission 16 (author mpower, round id 18):
//   1 dbarnes opens External Review round 1: the headings, no "Author Response" table;
//   2 "Request Revisions" ("Revisions will not be subject to a new round of peer reviews."), the steps,
//   "Record Decision"; 3 mpower presses the decision email's "Submit Author Response".
// Internal Review, submission 12 (author lelder, round id 12):
//   4 dbarnes opens Internal Review round 1; 5 the "Request Author Response" page by its address,
//   "Submit Request"; 6 "Request Revisions", the steps, "Record Decision"; 7 lelder presses
//   "Submit Author Response" in each of the two emails.
// Each read also lists the unknown <authorresponsemanager>/<authorresponserequestmanager> elements a
// workflow page leaves when its stage configuration names a component the page does not register.
// WALK_MODE=neighbour (a fix trial's check that the fix reaches no further; the fix's files are the
// press's alone): OMP, submission 2 (afinkel, External Review, reviews outstanding): dbarnes reads the
// round (with the fix: the table reads "Awaiting reviews" with "Request Response" greyed), and
// afinkel's round shows no card.
// Run:
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/press-author-response-button-leads-nowhere/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, the 3.5 fleet's feature)
const {forEachApp, launch, signIn, screen, shot, record, note} = require('../../../probe');
const K = require('../author-response-gone-after-revisions-upload/lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const CASES = {
    steps: {
        omp: {
            external: {id: 16, stageId: 3, roundId: 18, author: 'mpower'},
            internal: {id: 12, stageId: 2, roundId: 12, author: 'lelder'},
        },
    },
    neighbour: {
        omp: {waiting: {id: 2, stageId: 3, roundId: null, author: 'afinkel'}},
    },
};

forEachApp(async (app) => {
    const c = (CASES[MODE] || {})[app.name];
    if (!c) { console.log(`[omp1 ${app.name} ${MODE}] nothing to walk on this app`); return; }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const id = `omp1-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, await screen(page).catch((e) => ({url: page.url(), error: K.flat(e.message)})));
        await shot(page, id).catch(() => {});
    };
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) {
            facts[key] = {threw: K.flat(e.message, 400)};
            note(`U30 OMP1 walk (${app.name}, ${MODE}): step ${key} threw: ${K.flat(e.message, 200)}`);
            await snap(`${key}-threw`).catch(() => {});
        }
        console.log(`[omp1 ${app.name} ${MODE}] ${key}`, JSON.stringify(facts[key]).slice(0, 1200));
        return facts[key];
    };
    const key = (s) => (s.roundId ? `workflow_${s.stageId}_${s.roundId}` : null);
    const press = async (name, s, subject, since) => {
        const mail = await step(`${name}-mail`, () => K.mailButton(app, `${s.author}@mailinator.com`, subject, since));
        if (mail && mail.button) {
            await step(`${name}-button`, async () => {
                const out = await K.pressButton(page, mail.button);
                await snap(`${name}-button`);
                return out;
            });
        }
    };
    try {
        if (MODE === 'neighbour') {
            if (c.waiting) {
                const s = c.waiting;
                await signIn(page, 'dbarnes');
                await step('n2-editor', async () => { const o = await K.editorView(page, app, s.id, null); await snap('n2-editor'); return o; });
                await signIn(page, s.author);
                await step('n2-author', async () => { const o = await K.authorView(page, app, s.id); await snap('n2-author'); return o; });
            }
            return;
        }
        // External Review
        const ext = c.external;
        let since = new Date();
        await signIn(page, 'dbarnes');                                                              // 1
        await step('e1-editor', async () => { const o = await K.editorView(page, app, ext.id, key(ext)); await snap('e1-editor'); return o; });
        await step('e2-decision', async () => {                                                     // 2
            const o = await K.decide(page, app, ext.id, 'Request Revisions', {menuKey: key(ext)});
            await snap('e2-recorded');
            return o;
        });
        await signIn(page, ext.author);                                                             // 3
        await press('e3', ext, K.DECISION_SUBJECT, since);
        await step('e3-author-own', async () => K.authorView(page, app, ext.id, {menuKey: key(ext)}));
        // Internal Review
        const int = c.internal;
        since = new Date();
        await signIn(page, 'dbarnes');                                                              // 4
        await step('i4-editor', async () => { const o = await K.editorView(page, app, int.id, key(int)); await snap('i4-editor'); return o; });
        await step('i5-typed-request', async () => {                                                // 5
            const o = await K.typedRequest(page, app, int);
            await snap('i5-sent');
            return o;
        });
        await step('i6-decision', async () => {                                                     // 6
            const o = await K.decide(page, app, int.id, 'Request Revisions', {menuKey: key(int)});
            await snap('i6-recorded');
            return o;
        });
        await signIn(page, int.author);                                                             // 7
        await press('i7-request', int, K.REQUEST_SUBJECT, since);
        await press('i7-decision', int, K.DECISION_SUBJECT, since);
    } finally {
        record(`omp1-facts-${MODE}`, facts);
    }
});
