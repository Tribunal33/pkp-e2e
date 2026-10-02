// Issue report docs/issues/U21-A20-plain-summary-required-refuses-other-saves.md, its U49 OJS1 part: on a journal that
// requires a plain language summary, the "Review Publishing Details" panel's "Confirm" (OJS), on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"). Modes (WALK_MODE):
//
//   steps      (default) dbarnes: Settings › Workflow › "Submission" › "Metadata": "Enable plain language summary
//              metadata", "Require the author to provide a plain language summary …", "Save"; submission 5 "Genetic
//              transformation of forest trees", "Title & Abstract", "Schedule For Publication", "Review Publishing
//              Details": Version of Record, "Major Revision", "Assign To Current/Back Issue" "Vol. 1 No. 2 (2014)",
//              "Confirm" ("Publish" when the confirmation opens); else "Cancel" in each open panel, a summary typed on "Title &
//              Abstract", "Save", and the panel again, "Confirm"
//   neighbour  the setting as above; submission 5 "Title & Abstract": a summary typed, "Save"; then emptied, "Save"
//              (the requirement must still refuse the emptied summary, with a fix in or out)
//
// Reset first:  npm run fleet-prep -- --feature issues-v4 --dataset 4 --reset
// Run:          PROBE_FEATURE=issues-v4 PROBE_AGENT=v4 node bin/probe.js ojs shared/playwright/checks/issues/plain-summary-required-refuses-other-saves/publish-confirm.js
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-v4-3_5), the run with PROBE_RUN=r35
// Facts: .reports/<feature>/v4/pc-<mode>[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK_MODE || 'steps';
const SUBMISSION = 5;
const SUMMARY = 'u49v4 plain summary for a general reader';
const log = (...a) => console.log('[v4]', ...a);

async function plsEditorId(page) {
    const f = page.locator('iframe[id*="plainLanguageSummary-control-en"]').first();
    await f.waitFor({state: 'visible', timeout: L.T}).catch(() => {});
    const id = await f.getAttribute('id').catch(() => null);
    return id ? id.replace(/_ifr$/, '') : null;
}

async function storedSummary(page) {
    const id = await plsEditorId(page);
    if (!id) return {field: false};
    const text = await page.evaluate((i) => window.tinymce.get(i).getContent({format: 'text'}), id).catch(() => null);
    return {field: true, text: L.flat(text, 200)};
}

async function steps(app, page, writes, f) {
    await L.openWorkflow(app, page, SUBMISSION);
    await L.openEntry(page, 'Title & Abstract');
    f.summaryBefore = await storedSummary(page);
    await L.snap(page, 'pc-title-abstract', f.summaryBefore);
    // Steps 4-5.
    const first = await L.confirmPublishPanel(app, page, writes);
    f.confirm1 = first.out;
    await L.snap(page, 'pc-confirm1', f.confirm1);
    log('confirm1', JSON.stringify(f.confirm1).slice(0, 1500));
    if (f.confirm1.confirmOpened) {
        const t = Date.now();
        await first.confirm.getByRole('button', {name: 'Publish', exact: true}).click();
        await page.getByRole('button', {name: 'Unpublish', exact: true}).waitFor({timeout: L.T}).catch(() => {});
        await idle(page);
        f.publish1 = {writes: writes.since(t), status: L.flat(await L.wf(page).locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 200)};
        await L.snap(page, 'pc-published1', f.publish1);
        return;
    }
    // Step 6: close the panel, store a summary on "Title & Abstract".
    f.panelsClosed = await L.closePublishPanels(page);
    await L.openEntry(page, 'Title & Abstract');
    let id = await plsEditorId(page);
    if (!id) {
        // The summary box did not come back after the panels closed: record the page, then reload the workflow.
        f.step6NoField = await L.snap(page, 'pc-step6-nofield').then((x) => ({url: x.url, dialog: L.flat(x.text && x.text.dialog, 1500)}));
        await L.openWorkflow(app, page, SUBMISSION);
        await L.openEntry(page, 'Title & Abstract');
        id = await plsEditorId(page);
        f.step6Reloaded = true;
    }
    if (!id) { f.step6 = {field: false}; return; }
    await L.typeRich(page, id, SUMMARY);
    f.step6 = await L.savePage(page, writes);
    await L.snap(page, 'pc-summary-saved', f.step6);
    // Step 7.
    const second = await L.confirmPublishPanel(app, page, writes);
    f.confirm2 = second.out;
    await L.snap(page, 'pc-confirm2', f.confirm2);
    log('confirm2', JSON.stringify(f.confirm2).slice(0, 1500));
    if (f.confirm2.confirmOpened) {
        const t = Date.now();
        await second.confirm.getByRole('button', {name: 'Publish', exact: true}).click();
        await page.getByRole('button', {name: 'Unpublish', exact: true}).waitFor({timeout: L.T}).catch(() => {});
        await idle(page);
        f.publish2 = {writes: writes.since(t)};
        await L.snap(page, 'pc-published2', f.publish2);
    }
}

async function neighbour(app, page, writes, f) {
    await L.openWorkflow(app, page, SUBMISSION);
    await L.openEntry(page, 'Title & Abstract');
    const id = await plsEditorId(page);
    if (!id) { f.neighbour = {field: false}; return; }
    await L.typeRich(page, id, SUMMARY);
    f.typed = await L.savePage(page, writes);
    await L.snap(page, 'pc-nb-typed', f.typed);
    const id2 = await plsEditorId(page);
    await L.typeRich(page, id2, '');
    f.emptied = await L.savePage(page, writes);
    await L.snap(page, 'pc-nb-emptied', f.emptied);
    log('neighbour', JSON.stringify({typed: f.typed, emptied: f.emptied}).slice(0, 1500));
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const f = {app: app.name, line: app.line, dataset: app.dataset, mode: MODE};
    const {page, close} = await launch(app);
    const writes = L.watchWrites(page);
    page.on('pageerror', (e) => (f.pageErrors ||= []).push(L.flat(e.message, 200)));
    try {
        await signIn(page, 'dbarnes');
        f.setting = await L.requireSummary(app, page);
        await L.snap(page, 'pc-setting', f.setting);
        log('setting', JSON.stringify(f.setting));
        if (f.setting.offered) {
            try { await (MODE === 'neighbour' ? neighbour : steps)(app, page, writes, f); } catch (e) { f.error = L.flat(e.stack || e.message, 800); await L.snap(page, 'pc-error').catch(() => {}); }
        }
    } finally {
        await signOut(page).catch(() => {});
        await close();
    }
    record(`pc-${MODE}`, f);
});
