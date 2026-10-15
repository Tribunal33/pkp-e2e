// Issue report docs/issues/U64-A16-sushi-ir-authors-share-orcid.md (U64 A16): the report's Steps to
// reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets").
// OJS and OPS: OMP has no item reports. The kit builds nothing: the visits are a reader's, through
// the screens; the two SQL statements are the Steps' preconditions (lib.js `prepare()`).
//
// Default mode, the Steps:
//   SQL: the install and the publications dated 2026-06-15; the first author's ORCID iD
//        (OJS Alan Mwandenga on submission 1, OPS Catherine Kwantes on submission 2).
//   1, 2. Signed out: each of two works and its "PDF".
//   3. The visits made to count for 2026-09 (the app's loader task and job queue).
//   4. Sign in as `dbarnes`.
//   5. The SUSHI address of "Item Master Report (IR)" with the authors shown, typed in the browser:
//      each work's `Item_Contributors`.
// `neighbour` as the argument (the fix in and out; changes nothing; run it after the Steps, without a
//   reset, on the figures they left):
//   N1 the same address without `attributes_to_show`: no `Item_Contributors`.
//   N2 "Item Master Report (IR)" downloaded with "Authors" ticked: the file's "Authors" cells as before
//      (that loop is the A15 report's).
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-k3 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-k3 PROBE_AGENT=k9 node bin/probe.js ojs,ops shared/playwright/checks/issues/sushi-ir-authors-share-orcid/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-k3-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-k3-3_5 PROBE_AGENT=k9 node bin/probe.js ojs,ops shared/playwright/checks/issues/sushi-ir-authors-share-orcid/walk.js
// Facts: .reports/<feature>/k9/facts-a16[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : 'steps';

forEachApp(async (app) => {
    if (!L.WORKS[app.name]) return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {mode: MODE, line: app.line || 'main', dataset: app.dataset};
    const {page, close} = await launch(app);
    try {
        if (MODE === 'steps') {
            Object.assign(facts, await L.prepare(page, app));
            await signIn(page, 'dbarnes');
            facts.sushi = await L.attempt(() => L.typeSushi(page, app, `${L.RANGE}&attributes_to_show=Authors`));
            record('sushi-ir-authors', await screen(page).catch(() => null));
        } else {
            await signIn(page, 'dbarnes');
            facts.n1 = await L.attempt(() => L.typeSushi(page, app, L.RANGE));
            facts.opened = await L.attempt(async () => (await L.openCounterR5(page, app, app.contextPath)).typed);
            facts.n2 = await L.downloadReport(page, 'Item Master Report (IR)');
        }
    } catch (e) {
        facts.error = L.flat(e.stack || e.message, 800);
        record(`threw-a16-${MODE}`, await screen(page).catch(() => null));
    } finally {
        console.log(JSON.stringify(facts, null, 1));
        record(MODE === 'steps' ? 'facts-a16' : 'facts-a16-neighbour', facts);
        await close();
    }
});
