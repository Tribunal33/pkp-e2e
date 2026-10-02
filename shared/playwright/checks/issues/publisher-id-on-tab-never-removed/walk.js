// Issue report docs/issues/U44-A2-publisher-id-on-tab-never-removed.md (U44 A2): a Publisher ID saved
// on a galley's, chapter's or publication format's "Identifiers" tab cannot be removed: the emptied
// box's "Save" closes the window, and the old value is back. The report's Steps, walked through the
// screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), as `rvaca`.
// The kit builds nothing.
//   OJS  steps 1-8  "Enable for Galleys"; submission 1, version 2, "Galleys" › "PDF Version 2" ›
//                   "Edit" › "Identifiers": "u44e-galley-1", "Save", reopen; empty, "Save", reopen
//   OPS  steps 1-8  the same on submission 1's galley "PDF"
//   OMP  steps 1-9  "Enable for Chapters" + "Enable for Publication Formats"; submission 4's chapter
//                   "Introduction: Contexts of Popular Culture", submission 5's format "PDF" (4's
//                   "PDF" is a remote format, which has no "Identifiers" tab), each
//                   "u44e-<kind>-1", "Save", reopen; empty, "Save", reopen
//   `neighbour` as the script's argument, on a fresh reset (the fix's reach), OJS galley and OMP
//   chapter (OPS has no URN plugin, so its tab is gone with the box off):
//     N1 "u44e-<kind>-1" saved, changed to "u44e-<kind>-2", saved, reopened
//     N2 "URN" plugin on, "Articles" + "Galleys" (press "Monographs" + "Chapters"), default patterns
//     N3 the "Publisher ID" box switched off; N4 the tab (no box), the URN assign box unticked, "Save"
//     N5 the box switched on again, the tab reopened: "u44e-<kind>-2" still there
//
// Reset first:  npm run fleet-prep -- --feature issues-u44e --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-u44e PROBE_AGENT=u44e node bin/probe.js all shared/playwright/checks/issues/publisher-id-on-tab-never-removed/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44e-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44e-3_5 PROBE_AGENT=u44e node bin/probe.js all shared/playwright/checks/issues/publisher-id-on-tab-never-removed/walk.js
// Facts: .reports/<feature>/u44e/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');
const NEIGHBOUR = process.argv[2] === 'neighbour';

const ITEMS = {
    ojs: [{kind: 'galley', sid: 1, pubId: 2, item: 'PDF Version 2', id: 2, box: 'Enable for Galleys', urn: ['Articles', 'Galleys']}],
    ops: [{kind: 'galley', sid: 1, pubId: 1, item: 'PDF', id: 1, box: 'Enable for Galleys'}],
    omp: [
        {kind: 'chapter', sid: 4, pubId: 4, item: 'Introduction: Contexts of Popular Culture', id: 13, box: 'Enable for Chapters', urn: ['Monographs', 'Chapters']},
        {kind: 'format', sid: 5, pubId: 5, item: 'PDF', id: 2, box: 'Enable for Publication Formats'},
    ],
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const fact = (k, v) => { record('facts', {[k]: v}, {merge: true}); console.log(`[${app.name}]`, k, JSON.stringify(v).slice(0, 1500)); };
    const step = async (k, fn) => { try { const v = await fn(); fact(k, v); return v; } catch (e) { fact(k, {threw: String(e).slice(0, 600)}); return null; } };
    const items = ITEMS[app.name];
    const {page} = await launch(app);

    // 1. Sign in as rvaca.
    await signIn(page, 'rvaca');

    // Saves `value` on the item's tab and reopens it; returns the save and the reopened tab.
    const saveAndReopen = async (it, value, label, opts) => {
        const win = await L.openTab(page, app, it, `${it.kind}-${label}-tab`);
        const before = await L.readTab(win);
        const save = await L.typeAndSave(page, app, win, value, `${it.kind}-${label}`, opts);
        if (save.windowOpen) await L.closeWindow(page, win);
        const again = await L.openTab(page, app, it, `${it.kind}-${label}-reopened`);
        const reopened = await L.readTab(again);
        await L.closeWindow(page, again);
        return {before, save, reopened, stored: L.stored(app, it.kind, it.id)};
    };

    if (!NEIGHBOUR) {
        // 2. Settings › Workflow › Submission › "Metadata": tick the boxes, "Save".
        await step('step2-enable', () => L.setPublisherIds(page, app, Object.fromEntries(items.map((it) => [it.box, true]))));
        for (const it of items) {
            // 3-6. The tab: type "u44e-<kind>-1", "Save", reopen.
            await step(`${it.kind}-save`, () => saveAndReopen(it, `u44e-${it.kind}-1`, 'save'));
            // 7-8. Empty the box, "Save", reopen.
            await step(`${it.kind}-empty`, () => saveAndReopen(it, '', 'empty'));
        }
        return;
    }

    // Neighbour: OJS galley and OMP chapter only.
    const it = items.find((i) => i.urn);
    if (!it) return;
    await step('n0-enable', () => L.setPublisherIds(page, app, {[it.box]: true}));
    await step('n1-save', () => saveAndReopen(it, `u44e-${it.kind}-1`, 'n1a'));
    await step('n1-change', () => saveAndReopen(it, `u44e-${it.kind}-2`, 'n1b'));
    await step('n2-urn', () => L.setUpUrn(page, app, it.urn));
    await step('n3-box-off', () => L.setPublisherIds(page, app, {[it.box]: false}));
    await step('n4-save-without-box', async () => {
        const win = await L.openTab(page, app, it, `${it.kind}-n4-tab`);
        const before = await L.readTab(win);
        const save = await L.typeAndSave(page, app, win, null, `${it.kind}-n4`, {untickAssign: true});
        if (save.windowOpen) await L.closeWindow(page, win);
        return {before, save, stored: L.stored(app, it.kind, it.id)};
    });
    await step('n5-box-on-again', async () => {
        const settings = await L.setPublisherIds(page, app, {[it.box]: true});
        const win = await L.openTab(page, app, it, `${it.kind}-n5-tab`);
        const tab = await L.readTab(win);
        await L.closeWindow(page, win);
        return {settings: settings.after, tab, stored: L.stored(app, it.kind, it.id)};
    });
});
