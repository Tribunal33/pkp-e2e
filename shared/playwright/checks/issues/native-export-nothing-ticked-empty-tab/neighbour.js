// Neighbour check for docs/issues/U63-A12-native-export-nothing-ticked-empty-tab.md: the
// export with something ticked, which the fix must leave alone. Walked with the fix in and out.
// As `dbarnes` on PKP's default test dataset:
//   - Native XML Plugin: tick one submission (OJS 4, OMP 3, OPS 1), press the export button,
//     then "Download Exported File";
//   - {OJS} "Export Issues": tick the first issue, press "Export Issues", download;
//   - {OMP} the four "Publisher Identity" details filled (walk.js step 7), the ONIX tool: tick
//     "The Political Economy of Workplace Injury in Canada", press "Export Submissions".
// Records each results panel, the requests, any alert and the downloaded file's name and root.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir7 --dataset 1 --reset
// Run:          PROBE_FEATURE=issues-ir7 PROBE_AGENT=ir7 [PROBE_RUN=fix] node bin/probe.js all shared/playwright/checks/issues/native-export-nothing-ticked-empty-tab/neighbour.js
const fs = require('fs');
const {forEachApp, launch, signIn, record} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const SUB = {
    ojs: 'Computer Skill Requirements for New and Existing Teachers',
    omp: 'The Political Economy of Workplace Injury in Canada',
    ops: 'The influence of lactation on the quantity and quality of cashmere production',
};

/** Press "Download Exported File" in the open results panel; returns the file's name and root element. */
async function download(page) {
    const btn = page.locator('#importExportTabs [role="tabpanel"]:visible').first().getByRole('button', {name: 'Download Exported File'});
    if (!(await btn.count())) return {button: false};
    const dl = page.waitForEvent('download', {timeout: 20_000});
    await btn.click();
    const d = await dl;
    const xml = fs.readFileSync(await d.path(), 'utf8');
    const root = (xml.match(/<(?!\?)([A-Za-z:]+)[\s>]/) || [])[1];
    return {button: true, file: d.suggestedFilename(), root, bytes: xml.length};
}

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const errs = native.scriptErrors(page);
    const alerts = L.dialogs(page);
    const w = native.watch(page);
    try {
        await signIn(page, 'dbarnes');
        await native.openNative(app, page);
        await native.openExportTab(app, page);
        await page.locator('#exportSubmissions-tab .listPanel__item').filter({hasText: SUB[app.name]}).first().locator('input[type=checkbox]').check();
        f.submissions = await L.pressExport(app, page, 'submissions', w, alerts);
        f.submissions.download = await download(page);
        if (app.name === 'ojs') {
            await L.openIssuesTab(page);
            f.issueTicked = await L.tickFirstIssue(page);
            f.issues = await L.pressExport(app, page, 'issues', w, alerts);
            f.issues.download = await download(page);
        }
        if (app.name === 'omp') {
            f.identitySaved = await L.fillPublisherIdentity(app, page, {publisher: 'Public Knowledge Press', location: 'Vancouver', codeType: 'Proprietary (01)', codeValue: 'u63ir7'});
            await L.openOnix(app, page);
            await page.locator('#export-tab .listPanel__item').filter({hasText: SUB.omp}).first().locator('input[type=checkbox]').check();
            f.onix = await L.pressExport(app, page, 'onix', w, alerts);
            f.onix.download = await download(page);
        }
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'neighbour-error').catch(() => {});
    } finally {
        w.stop();
        f.scriptErrors = errs;
        f.alerts = alerts;
        record('neighbour', f);
        console.log(`[neighbour] ${app.name}`, JSON.stringify(f, null, 1).slice(0, 3000));
        await close();
    }
});
