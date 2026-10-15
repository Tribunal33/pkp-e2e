// Issue report docs/issues/U49-OJS5-refused-publish-confirm-opens-blank-panel.md: on a journal, a "Confirm" in
// "Review Publishing Details" that the server refuses opens a second, blank copy of the panel over the first. PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), OJS only (OMP and OPS have no such panel).
// Modes (WALK_MODE):
//
//   steps      (default) dbarnes: Settings › Workflow › "Submission" › "Metadata": "Enable plain language summary
//              metadata", "Require the author to provide a plain language summary …", "Save"; "Genetic
//              transformation of forest trees" (ID 5) › "Title & Abstract" › "Schedule For Publication"; in "Review
//              Publishing Details": "Version of Record (VoR)", "Major Revision", "Assign To Current/Back Issue",
//              "Vol. 1 No. 2 (2014)", "Confirm"; then "Cancel" once; then "Schedule For Publication" again
//   copy       the setting and steps up to "Confirm" as above; then the same choices in the copy that opens, "Confirm"
//              (what a second refused Confirm does)
//   control    (also "neighbour") the same panel and choices without the requirement: "Confirm" must still open the
//              "Schedule For Publication" confirmation window (the success path the fix keeps)
//
// Reset first:  npm run fleet-prep -- --feature issues-k12 --dataset 6 --reset
// Run:          PROBE_FEATURE=issues-k12 PROBE_AGENT=k12 node bin/probe.js ojs shared/playwright/checks/issues/refused-publish-confirm-opens-blank-panel/walk.js
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-k12-3_5), the run with PROBE_RUN=r35
// Facts: .reports/<feature>/k12/rp-<mode>[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, record, idle, screen} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK_MODE || 'steps';
const SUBMISSION = 5;
const log = (...a) => console.log('[k12]', ...a);

/** Every "Review Publishing Details" panel's selects on screen, lowest first. */
async function panelValues(page) {
    return page.locator('select[name="versionStage"]').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => {
        const form = e.closest('form');
        const v = (n) => { const s = form && form.querySelector(`select[name="${n}"]`); return s ? s.value : null; };
        const r = form && form.querySelector('input[name="assignment"]:checked');
        return {versionStage: e.value, versionIsMinor: v('versionIsMinor'), issueId: v('issueId'), assignment: r ? r.value : null};
    })).catch(() => null);
}

async function steps(app, page, writes, f) {
    f.setting = await L.requireSummary(app, page);
    await L.snap(page, 'rp-1-setting', f.setting);
    log('setting', JSON.stringify(f.setting));
    if (!f.setting.offered) return;
    await L.openWorkflow(app, page, SUBMISSION);
    await L.openEntry(page, 'Title & Abstract');
    await L.snap(page, 'rp-2-title-abstract');
    const {out} = await L.confirmPublishPanel(app, page, writes, /Vol\. 1 No\. 2/);
    f.confirm = out;
    f.confirm.values = await panelValues(page);
    await L.snap(page, 'rp-3-confirm', f.confirm);
    log('confirm', JSON.stringify(f.confirm).slice(0, 1800));
    if (f.confirm.confirmOpened || !f.confirm.panelsOpen) return;
    // Step 8: "Cancel" once, in the top panel.
    await page.locator('[data-cy="active-modal"]').last().getByRole('button', {name: 'Cancel', exact: true}).last().click({timeout: 10_000});
    await idle(page);
    await L.sleep(800);
    f.afterCancel = {panelsOpen: await L.publishPanelsOpen(page), values: await panelValues(page)};
    await L.snap(page, 'rp-4-cancel', f.afterCancel);
    log('cancel', JSON.stringify(f.afterCancel));
    // Step 9: "Schedule For Publication" again, on the same page.
    await L.wf(page).getByRole('button', {name: 'Schedule For Publication', exact: true}).first().click({timeout: L.T});
    await page.locator('select[name="versionStage"]').first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
    await idle(page);
    await L.sleep(2500);
    f.again = {panelsOpen: await L.publishPanelsOpen(page), values: await panelValues(page)};
    await L.snap(page, 'rp-5-again', f.again);
    log('again', JSON.stringify(f.again));
}

async function copy(app, page, writes, f) {
    f.setting = await L.requireSummary(app, page);
    if (!f.setting.offered) return;
    await L.openWorkflow(app, page, SUBMISSION);
    await L.openEntry(page, 'Title & Abstract');
    const {out} = await L.confirmPublishPanel(app, page, writes, /Vol\. 1 No\. 2/);
    f.confirm = {panelsOpen: out.panelsOpen, writes: out.writes};
    if (out.confirmOpened || out.panelsOpen < 2) return;
    // The same choices in the copy, "Confirm".
    const top = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
    await top.locator('select[name="versionStage"]').last().selectOption('VoR');
    await top.locator('select[name="versionIsMinor"]').last().selectOption('false');
    const issue = top.locator('select[name="issueId"]').last();
    const opt = issue.locator('option').filter({hasText: /Vol\. 1 No\. 2/});
    await opt.first().waitFor({state: 'attached', timeout: L.T}).catch(() => {});
    await issue.selectOption((await opt.first().getAttribute('value').catch(() => null)) || '');
    f.copyValues = await panelValues(page);
    await screen(page).catch(() => null);
    const t = Date.now();
    await top.getByRole('button', {name: 'Confirm', exact: true}).last().click();
    await idle(page);
    await L.sleep(2500);
    const s = await screen(page).catch(() => ({}));
    f.copyConfirm = {writes: writes.since(t), notices: s.notices || [], panelsOpen: await L.publishPanelsOpen(page), values: await panelValues(page),
        confirmOpened: await page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'}).isVisible().catch(() => false)};
    await L.snap(page, 'rp-copy-confirm', f.copyConfirm);
    log('copy', JSON.stringify(f.copyConfirm));
}

async function control(app, page, writes, f) {
    await L.openWorkflow(app, page, SUBMISSION);
    await L.openEntry(page, 'Title & Abstract');
    const {out} = await L.confirmPublishPanel(app, page, writes, /Vol\. 1 No\. 2/);
    f.confirm = out;
    f.confirm.values = await panelValues(page);
    f.confirm.confirmText = out.confirmOpened
        ? L.flat(await page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'}).last().innerText().catch(() => null), 600)
        : null;
    await L.snap(page, 'rp-nb-confirm', f.confirm);
    log('control', JSON.stringify(f.confirm).slice(0, 1800));
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const f = {app: app.name, line: app.line, dataset: app.dataset, mode: MODE};
    const {page, close} = await launch(app);
    const writes = L.watchWrites(page);
    page.on('pageerror', (e) => (f.pageErrors ||= []).push(L.flat(e.message, 200)));
    try {
        await signIn(page, 'dbarnes');
        try { await ({neighbour: control, control, copy}[MODE] || steps)(app, page, writes, f); } catch (e) { f.error = L.flat(e.stack || e.message, 800); await L.snap(page, 'rp-error').catch(() => {}); }
    } finally {
        await signOut(page).catch(() => {});
        await close();
    }
    record(`rp-${MODE}`, f);
});
