// Issue report docs/issues/U44-OJS1-new-issue-galley-publisher-id-server-error.md (U44 OJS1): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"). The kit builds nothing; OJS only (issues are a journal's).
//   steps 1–6  as `rvaca`: Settings › Workflow › Submission › "Metadata", tick "Enable for Issue
//              Galleys", "Save"; Issues › "Future Issues" › "Vol. 2 No. 1 (2015)" › "Edit" ›
//              "Issue Galleys" › "Create Issue Galley": a PDF, "PDF", Publisher ID "u44a-1", "Save"
//   control    steps 7–8: the same galley with no Publisher ID saves; its "Edit" takes "u44a-1"
//   `neighbour` as the script's argument, on a fresh reset (the fix's reach):
//     N1  a galley "PDF" with no Publisher ID          N2  its "Edit": "u44a-1" saves
//     N3  its "Edit" again, same value, new label: saves (its own value is no duplicate)
//     N4  a new galley "Second" with "u44a-1": refused as already in use
//     N5  a new galley "Third" with "12345": refused as a number
//     N6  a new galley "Third" with "u44a-2": saves
//
// Reset first:  npm run fleet-prep -- --feature issues-u44a --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u44a PROBE_AGENT=u44a node bin/probe.js ojs shared/playwright/checks/issues/new-issue-galley-publisher-id-server-error/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44a-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44a-3_5 PROBE_AGENT=u44a node bin/probe.js ojs shared/playwright/checks/issues/new-issue-galley-publisher-id-server-error/walk.js
// Facts: .reports/<feature>/u44a/ojs1-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn} = require('../../../probe');
const G = require('../issue-galley-interface-language-refused/lib');
const L = require('./lib');
const NEIGHBOUR = process.argv[2] === 'neighbour';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // issues and issue galleys are OJS's alone
    const {record} = require('../../../probe');
    const fact = (k, v) => { record('ojs1-facts', {[k]: v}, {merge: true}); console.log('[ojs1]', k, JSON.stringify(v).slice(0, 1500)); };
    const {page} = await launch(app);
    const step = async (k, fn) => { try { fact(k, await fn()); } catch (e) { fact(k, {threw: String(e).slice(0, 600)}); } };

    // 1. Sign in as rvaca.
    await signIn(page, 'rvaca');
    // 2. Settings › Workflow › Submission › "Metadata": tick "Enable for Issue Galleys", "Save".
    await step('step2-enable-issue-galleys', () => L.enablePublisherIds(page, app, ['Enable for Issue Galleys']));
    // 3–4. Issues › "Future Issues" › the issue's "Edit" › "Issue Galleys".
    const win = await G.openIssueGalleys(page);
    fact('step3-list-before', await G.galleyList(win));

    if (!NEIGHBOUR) {
        // 5–6. "Create Issue Galley": a PDF, "PDF", Publisher ID "u44a-1", "Save".
        await step('step6-new-with-publisher-id', () => L.createGalley(page, app, win, {label: 'PDF', file: G.PDF('u44a.pdf'), publisherId: 'u44a-1'}, 'ojs1-step6'));
        // Control 7: the same galley with no Publisher ID.
        await step('control7-new-without', () => L.createGalley(page, app, win, {label: 'PDF', file: G.PDF('u44a.pdf')}, 'ojs1-control7'));
        // Control 8: its "Edit", Publisher ID "u44a-1".
        await step('control8-edit-with', () => L.editGalley(page, app, win, 'PDF', {publisherId: 'u44a-1'}, 'ojs1-control8'));
        return;
    }

    await step('n1-new-without', () => L.createGalley(page, app, win, {label: 'PDF', file: G.PDF('u44a-n1.pdf')}, 'ojs1-n1'));
    await step('n2-edit-with', () => L.editGalley(page, app, win, 'PDF', {publisherId: 'u44a-1'}, 'ojs1-n2'));
    await step('n3-edit-same-value', () => L.editGalley(page, app, win, 'PDF', {label: 'PDF u44a'}, 'ojs1-n3'));
    await step('n4-new-duplicate', () => L.createGalley(page, app, win, {label: 'Second', file: G.PDF('u44a-n4.pdf'), publisherId: 'u44a-1'}, 'ojs1-n4'));
    await step('n5-new-number', () => L.createGalley(page, app, win, {label: 'Third', file: G.PDF('u44a-n5.pdf'), publisherId: '12345'}, 'ojs1-n5'));
    await step('n6-new-other', () => L.createGalley(page, app, win, {label: 'Third', file: G.PDF('u44a-n6.pdf'), publisherId: 'u44a-2'}, 'ojs1-n6'));
});
