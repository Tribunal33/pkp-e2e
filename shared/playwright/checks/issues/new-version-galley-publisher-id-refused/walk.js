// Issue report docs/issues/U44-A5-new-version-galley-publisher-id-refused.md (U44 A5): a new version's
// galley (a press's chapter) carries the Publisher ID of the one it was copied from, and every "Save"
// of its "Identifiers" tab is refused as a duplicate of that earlier copy. Takes the report's Steps on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), as `rvaca`; the kit
// builds nothing.
//   1-2   sign in; Settings › Workflow › "Metadata": "Enable for Galleys" (OMP "Enable for Chapters")
//   3-4   OJS submission 1's version 1.1 galley "PDF Version 2" / OPS submission 1's galley "PDF" /
//         OMP submission 4's chapter "Introduction: Contexts of Popular Culture": "Identifiers",
//         "u44f-<kind>-1", "Save"
//   5     "Publish" ("Post") the version
//   6     "Create New Version" ("Minor Revision"; 3.5: the header's button, "Yes")
//   7-8   the new version's copy: "Identifiers" shows the ID; "Save" unchanged
//   (not a report step) the box emptied, "Save", reopened: the A2 report's fault, recorded as 9-empty
//   9     "u44f-<kind>-2", "Save", reopened (the way round; recorded as 10-other-value)
// WALK=neighbour runs alone on a fresh reset (fix in and out), OJS and OMP: steps 1-4, then the same
// ID typed on another submission's galley (OJS: submission 17's new version 1.1, "PDF") and on
// another chapter of the same book (OMP: "Chapter 1. …"), "Save": refused both ways.
//
// Reset first:  npm run fleet-prep -- --feature issues-u44f --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-u44f PROBE_AGENT=u44f node bin/probe.js all shared/playwright/checks/issues/new-version-galley-publisher-id-refused/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44f-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44f-3_5 PROBE_AGENT=u44f node bin/probe.js all shared/playwright/checks/issues/new-version-galley-publisher-id-refused/walk.js
// Facts: .reports/<feature>/u44f/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const A2 = require('../publisher-id-on-tab-never-removed/lib');
const L = require('./lib');

const MODE = process.env.WALK || 'walk';
const ITEMS = {
    ojs: {kind: 'galley', sid: 1, pubId: 2, item: 'PDF Version 2', box: 'Enable for Galleys', post: 'Publish', neighbour: {kind: 'galley', sid: 17, item: 'PDF', newVersion: true}},
    ops: {kind: 'galley', sid: 1, pubId: 1, item: 'PDF', box: 'Enable for Galleys', post: 'Post'},
    omp: {kind: 'chapter', sid: 4, pubId: 4, item: 'Introduction: Contexts of Popular Culture', box: 'Enable for Chapters', post: 'Publish', neighbour: {kind: 'chapter', sid: 4, pubId: 4, item: 'Chapter 1. A Future for Media Studies: Cultural Labour, Cultural Relations, Cultural Politics'}},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const it = ITEMS[app.name];
    if (MODE === 'neighbour' && !it.neighbour) {
        console.log(`[${app.name}] neighbour: not on this app`);
        return;
    }
    const fact = (k, v) => { record(MODE === 'walk' ? 'facts' : `facts-${MODE}`, {[k]: v}, {merge: true}); console.log(`[${app.name}]`, k, JSON.stringify(v).slice(0, 1500)); };
    const step = async (k, fn) => { try { const v = await fn(); fact(k, v); return v; } catch (e) { fact(k, {threw: String(e).slice(0, 600)}); return null; } };
    const {page} = await launch(app);
    const v1 = `u44f-${it.kind}-1`;

    // The tab of `target`: open, read, optionally type and "Save", reopen when the window closed.
    const tabSave = async (target, value, label) => {
        const win = await A2.openTab(page, app, target, `${label}-tab`);
        const before = await A2.readTab(win);
        const save = await A2.typeAndSave(page, app, win, value, label);
        if (save.windowOpen) await A2.closeWindow(page, win);
        let reopened = null;
        if (!save.windowOpen) {
            const again = await A2.openTab(page, app, target, `${label}-reopened`);
            reopened = await A2.readTab(again);
            await A2.closeWindow(page, again);
        }
        return {before, save, reopened, stored: L.stored(app, target.kind, target.sid)};
    };

    // 1
    await signIn(page, 'rvaca');
    // 2
    await step('2-enable', () => A2.setPublisherIds(page, app, {[it.box]: true}));
    // 3-4
    await step('4-save-first', () => tabSave(it, v1, `${MODE}-4`));

    if (MODE === 'neighbour') {
        const n = {...it.neighbour};
        if (n.newVersion) {
            const made = await step('n-other-new-version', () => L.newVersion(page, app, n.sid));
            n.pubId = made && made.id;
        }
        await step('n-same-id-elsewhere', () => tabSave(n, v1, 'neighbour-n'));
        return;
    }

    // 5
    await step('5-publish', () => L.publishNewest(page, app, it.sid, it.post));
    // 6
    const made = await step('6-new-version', () => L.newVersion(page, app, it.sid));
    const copy = {...it, pubId: made && made.id};
    // 7-8
    await step('8-save-unchanged', () => tabSave(copy, null, `${MODE}-8`));
    // 9
    await step('9-empty', () => tabSave(copy, '', `${MODE}-9`));
    // 10
    await step('10-other-value', () => tabSave(copy, `u44f-${it.kind}-2`, `${MODE}-10`));
});
