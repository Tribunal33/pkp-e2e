// Neighbour checks for docs/issues/U63-A6-upload-file-out-of-keyboard-reach.md (U63 A6), walked with the
// fix in and out, on PKP's default test dataset, as `dbarnes`, OJS, OMP and OPS:
//   a. Native XML Plugin, "Import": a mouse click on "Upload File" still opens exactly one file picker
//      (the fault the tabindex was added against in 2016 was a picker opening twice), the file goes up,
//      and the form is not submitted (no results tab is added)
//   b. Users XML Plugin, "Import Users" (OJS, OMP): the same upload box; where the Tab key stops in its form
//
// Reset first:  npm run fleet-prep -- --feature issues-ir14 --dataset 2 --reset
// Run:          PROBE_FEATURE=issues-ir14 PROBE_AGENT=ir14 PROBE_RUN=<nofix|fix> node bin/probe.js all shared/playwright/checks/issues/upload-file-out-of-keyboard-reach/neighbour.js
// Facts: .reports/<feature>/ir14/neighbour[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const tabNames = (page) => page.locator('#importExportTabs > ul [role="tab"]').allInnerTexts();

forEachApp(async (app) => {
    const f = {app: app.name, line: app.line || 'main'};
    const file = L.scratchFile();
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const errs = native.scriptErrors(page);
    const w = native.watch(page);
    try {
        await signIn(page, 'dbarnes');
        // a
        await native.openNative(app, page);
        await page.locator('#import-tab .pkp_controller_fileUpload:not(.loading)').waitFor({timeout: 15_000}).catch(() => {});
        await L.sleep(300);
        f.a = {box: await L.uploadBoxAttrs(page), tabsBefore: await tabNames(page)};
        const m = w.seen.length;
        f.a.click = await L.chooseWith(page, () => page.locator('#import-tab .pkp_uploader_button').click(), file);
        f.a.tabsAfter = await tabNames(page);
        f.a.formSubmitted = w.seen.slice(m).some((r) => /importBounce|NativeImportExportPlugin\/import\?/.test(r.url));
        f.a.screen = await native.snap(page, 'neighbour-a-mouse-chosen');
        // b (OPS ships no Users XML Plugin)
        if (app.name !== 'ops') {
            await page.goto(app.url(`/index.php/${app.contextPath}/en/management/importexport/plugin/UserImportExportPlugin`));
            await page.locator('#importExportTabs').waitFor({timeout: 20_000});
            await idle(page).catch(() => {});
            await page.locator('#import-tab .pkp_controller_fileUpload:not(.loading)').waitFor({timeout: 15_000}).catch(() => {});
            await L.sleep(300);
            await page.locator('#importExportTabs > ul a').first().click();
            const stops = await L.tabWalk(page, 10, false);
            f.b = {tab: await page.locator('#importExportTabs > ul a').first().innerText(), box: await L.uploadBoxAttrs(page), tabStops: stops.map(L.describe), reachedUploadFile: stops.some((s) => s.uploadButton || s.fileInput)};
            f.b.screen = await native.snap(page, 'neighbour-b-users-import');
        }
        await signOut(page).catch(() => {});
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'neighbour-error').catch(() => {});
    } finally {
        w.stop();
        f.scriptErrors = errs;
        record('neighbour', f);
        console.log('[neighbour]', JSON.stringify(f, null, 1).slice(0, 4000));
        await close();
    }
});
