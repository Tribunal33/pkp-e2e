// Issue report docs/issues/U63-A6-upload-file-out-of-keyboard-reach.md (U63 A6): its Steps, on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), by groups:
//
//   import    (OJS, OMP, OPS) dbarnes: Tools › Import/Export › "Native XML Plugin"; click the "Import"
//             tab's name; Tab, and keep pressing it (then Shift+Tab back); where the focus stops on
//             "Upload File", Enter, choose u63ir14.xml in the file picker, then Tab once more
//   editor    dbarnes: a Production submission's workflow (OJS 5, OMP 4: "Production Ready Files" ›
//             "Upload"; OPS 1: Publication › "Galleys" › "Add Galley", label "u63ir14", "Save");
//             in the upload window choose the component, then Tab / Shift+Tab; Enter on "Upload File"
//   author    (OJS) lkumiega, submission 13 (revisions requested): "Upload revisions"; the same
//   wizard    (OJS) ccorino: "New Submission", start the submission; on "Upload Files", Tab to
//             "Add File" and press Enter (the submission wizard's own file list, a control)
//
// Reset first:  npm run fleet-prep -- --feature issues-ir14 --dataset 2 --reset
// Run:          PROBE_FEATURE=issues-ir14 PROBE_AGENT=ir14 node bin/probe.js all shared/playwright/checks/issues/upload-file-out-of-keyboard-reach/walk.js
//               WALK_GROUPS=editor,author,wizard narrows the groups (default: all four)
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-ir14-3_5), the run with PROBE_RUN=r35
// Facts: .reports/<feature>/ir14/walk[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const GROUPS = (process.env.WALK_GROUPS || 'import,editor,author,wizard').split(',');
const PRODUCTION = {ojs: 5, omp: 4, ops: 1};
const topWin = (page) => page.locator('[role="dialog"]:visible').last();

/** Import group: Steps 1-4 on the Native XML Plugin's "Import" tab. */
async function importGroup(app, page, file) {
    const f = {};
    await signIn(page, 'dbarnes');
    await native.openNative(app, page);
    await page.locator('#import-tab .pkp_controller_fileUpload:not(.loading)').waitFor({timeout: 15_000}).catch(() => {});
    await L.sleep(300); // UploaderHandler wires plupload's input 100 ms after init
    f.landing = await native.snap(page, 'walk-import-tab');
    f.box = await L.uploadBoxAttrs(page);
    await page.locator('#importExportTabs > ul a', {hasText: /^Import$/}).first().click();
    f.startFocus = L.describe(await L.focused(page));
    const forward = await L.tabWalk(page, 8, false);
    f.tabStops = forward.map(L.describe);
    const back = await L.tabWalk(page, 8, true);
    f.shiftTabStops = back.map(L.describe);
    f.reachedUploadFile = [...forward, ...back].some((s) => s.uploadButton || s.fileInput);
    if (f.reachedUploadFile) {
        await page.locator('#importExportTabs > ul a', {hasText: /^Import$/}).first().click();
        for (let i = 0; i < 8; i++) {
            await page.keyboard.press('Tab');
            const s = await L.focused(page);
            if (s.uploadButton || s.fileInput) break;
        }
        f.enter = await L.chooseWith(page, () => page.keyboard.press('Enter'), file);
        f.afterChoose = await native.snap(page, 'walk-import-file-chosen');
        await page.keyboard.press('Tab');
        f.nextTab = L.describe(await L.focused(page));
        f.tabsAfter = await page.locator('#importExportTabs > ul [role="tab"]').allInnerTexts();
    }
    return f;
}

/**
 * In the legacy upload window ("Upload File" wizard) already open: pick the first component (or the
 * file to revise) from the keyboard's starting point, then Tab / Shift+Tab within the window; where the
 * focus stops on "Upload File", press Enter and choose the file.
 */
async function wizardKeys(page, file, label) {
    const f = {};
    const wiz = page.locator(L.WIZARD).last();
    await wiz.waitFor({timeout: 30_000});
    await wiz.locator('.pkp_controller_fileUpload:not(.loading)').waitFor({timeout: 15_000}).catch(() => {});
    await L.sleep(300);
    await idle(page).catch(() => {});
    f.window = native.flat(await topWin(page).innerText().catch(() => null), 500);
    f.box = await L.uploadBoxAttrs(page, L.WIZARD);
    f.openFocus = L.describe(await L.focused(page, L.WIZARD));
    const genre = wiz.locator('select[id^="genreId"]');
    const start = (await genre.count()) ? genre : wiz.locator('select').first();
    if (await start.count()) {
        const opts = await start.locator('option').evaluateAll((els) => els.map((o) => ({t: o.text.trim(), v: o.value})));
        const pick = opts.find((o) => o.v && !/^Select/i.test(o.t));
        if (pick && (await genre.count())) await start.selectOption(pick.v);
        f.chosen = pick ? pick.t : null;
        await start.focus();
    } else {
        // no select in this window: start from the window's first focusable control
        await page.keyboard.press('Tab');
    }
    f.startFocus = L.describe(await L.focused(page, L.WIZARD));
    const forward = await L.tabWalk(page, 8, false, L.WIZARD);
    f.tabStops = forward.map(L.describe);
    const back = await L.tabWalk(page, 8, true, L.WIZARD);
    f.shiftTabStops = back.map(L.describe);
    f.reachedUploadFile = [...forward, ...back].some((s) => s.uploadButton || s.fileInput);
    f.screen = await native.snap(page, `walk-${label}-upload-window`);
    if (f.reachedUploadFile) {
        await start.focus().catch(() => {});
        for (let i = 0; i < 8; i++) {
            const s = await L.focused(page, L.WIZARD);
            if (s.uploadButton || s.fileInput) break;
            await page.keyboard.press('Tab');
        }
        f.enter = await L.chooseWith(page, () => page.keyboard.press('Enter'), file, L.WIZARD);
        await page.keyboard.press('Tab');
        f.nextTab = L.describe(await L.focused(page, L.WIZARD));
        f.afterChoose = await native.snap(page, `walk-${label}-file-chosen`);
    }
    return f;
}

/** Press a visible button of the workflow window from the keyboard: focus it, Enter. */
async function pressByKeyboard(page, button) {
    await button.waitFor({timeout: 20_000});
    await button.focus();
    await page.keyboard.press('Enter');
    await idle(page).catch(() => {});
}

/** Editor group: an upload in a Production workflow. */
async function editorGroup(app, page, file) {
    const f = {submission: PRODUCTION[app.name]};
    await signIn(page, 'dbarnes');
    await native.openWorkflow(app, page, f.submission);
    const dlg = topWin(page);
    if (app.name === 'ops') {
        f.path = 'Publication › Galleys › Add Galley';
        await dlg.getByRole('link', {name: 'Galleys', exact: true}).first().click();
        await idle(page).catch(() => {}); await L.sleep(800);
        await pressByKeyboard(page, topWin(page).getByRole('button', {name: /^Add Galley$/i}).first());
        const form = topWin(page);
        await form.locator('input[name^="label"]').first().waitFor({timeout: 20_000});
        await form.locator('input[name^="label"]').first().fill('u63ir14');
        await form.getByRole('button', {name: 'Save', exact: true}).last().click();
        await idle(page).catch(() => {});
    } else {
        f.path = '"Production Ready Files" › Upload';
        const heading = dlg.getByRole('heading', {name: 'Production Ready Files', exact: true}).first();
        await pressByKeyboard(page, heading.locator('xpath=following::button[normalize-space()="Upload"][1]'));
    }
    Object.assign(f, await wizardKeys(page, file, 'editor'));
    return f;
}

/** Author group (OJS): a revision upload on submission 13. */
async function authorGroup(app, page, file) {
    const f = {submission: 13, user: 'lkumiega'};
    await signIn(page, 'lkumiega');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions?workflowSubmissionId=13`));
    await idle(page).catch(() => {});
    await topWin(page).waitFor({timeout: 20_000});
    await L.sleep(1500); await idle(page).catch(() => {});
    await pressByKeyboard(page, topWin(page).getByRole('button', {name: 'Upload revisions', exact: true}).first());
    Object.assign(f, await wizardKeys(page, file, 'author'));
    return f;
}

/** Submission wizard group (OJS): the "Upload Files" step's "Add File", by keyboard (a control). */
async function wizardGroup(app, page, file) {
    const {waitForEditorReady} = require('../../../support/richtext');
    const f = {user: 'ccorino'};
    await signIn(page, 'ccorino');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/submission`));
    await idle(page).catch(() => {});
    const english = page.getByRole('radio', {name: 'English', exact: true});
    if (await english.count()) await english.check();
    const section = page.getByRole('radio', {name: 'Articles', exact: true});
    if (await section.count()) await section.check();
    await waitForEditorReady(page, 'startSubmission-title-control');
    const body = page.frameLocator('#startSubmission-title-control_ifr').locator('body');
    await body.click();
    await body.fill('u63ir14 keyboard upload');
    for (const name of [/Yes, my submission meets all of these requirements/, /I agree to have my data collected/]) {
        const box = page.getByRole('checkbox', {name});
        if (await box.count()) await box.check();
    }
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
    await idle(page).catch(() => {});
    const add = page.getByRole('button', {name: 'Add File', exact: true});
    await add.waitFor({timeout: 30_000});
    f.step = native.flat(await page.locator('h1, h2').allInnerTexts().then((a) => a.join(' | ')).catch(() => null), 200);
    await page.locator('body').click({position: {x: 5, y: 5}}).catch(() => {});
    const stops = [];
    for (let i = 0; i < 60; i++) {
        await page.keyboard.press('Tab');
        const s = await L.focused(page, 'body');
        stops.push(L.describe(s));
        if (s.text === 'Add File') break;
    }
    f.tabStopsToAddFile = stops.length;
    f.reachedAddFile = stops[stops.length - 1] === 'button "Add File"';
    if (f.reachedAddFile) {
        const choosers = [];
        const on = (fc) => choosers.push(fc);
        page.on('filechooser', on);
        await page.keyboard.press('Enter');
        for (let i = 0; i < 20 && !choosers.length; i++) await L.sleep(150);
        await L.sleep(1000);
        page.off('filechooser', on);
        f.pickersOpened = choosers.length;
    }
    f.screen = await native.snap(page, 'walk-wizard-upload-files');
    return f;
}

forEachApp(async (app) => {
    const out = {app: app.name, line: app.line || 'main'};
    const file = L.scratchFile();
    const groups = {
        import: importGroup,
        editor: editorGroup,
        author: app.name === 'ojs' ? authorGroup : null,
        wizard: app.name === 'ojs' ? wizardGroup : null,
    };
    for (const g of GROUPS) {
        if (!groups[g]) continue;
        const {page, close} = await launch(app);
        page.setDefaultTimeout(20_000);
        const errs = native.scriptErrors(page);
        try {
            out[g] = await groups[g](app, page, file);
            await signOut(page).catch(() => {});
        } catch (e) {
            out[g] = Object.assign(out[g] || {}, {error: native.flat(e.stack, 900)});
            await native.snap(page, `walk-${g}-error`).catch(() => {});
        } finally {
            out[g].scriptErrors = errs;
            await close();
        }
    }
    record('walk', out);
    console.log('[walk]', JSON.stringify(out, null, 1).slice(0, 6000));
});
