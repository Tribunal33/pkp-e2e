// Issue report docs/issues/U09-A16-picture-window-ignores-svg-pdf.md (U09 A16): the report's Steps
// to reproduce, walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), context `publicknowledge`, as `rvaca`. The kit builds nothing.
//   1. sign in as rvaca
//   2–4. Settings › Website › "Setup" › "Navigation", "Add item", "Custom Page"
//   5–6. "Content" › "Insert/edit image", the "Upload" tab
//   7. "Browse for an image": drawing.svg
//   8. "Browse for an image": doc.pdf
//   9. drag doc.pdf, then drawing.svg, onto "Drop an image here"
//   c1 (control). "Browse for an image": photo.bmp; the small window's text; "OK"
// Neighbour (with the fix in and out):
//   n1. "Browse for an image": photo.png is stored (the window moves to "General", "Source" filled);
//       "Cancel".
//   n2. drawing.svg, then doc.pdf, dropped into the "Content" box itself: the editor's notice.
//   n3. Settings › Website › "Appearance" › "Setup", "Page Footer" (the Vue form's editor):
//       "Insert/edit image" › "Upload" › "Browse for an image" with drawing.svg, doc.pdf, photo.bmp
//       (nothing saved).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir11 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir11 PROBE_AGENT=ir11 node bin/probe.js all shared/playwright/checks/issues/picture-window-ignores-svg-pdf/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir11-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir11-3_5 PROBE_AGENT=ir11 node bin/probe.js all shared/playwright/checks/issues/picture-window-ignores-svg-pdf/walk.js
// Facts: .reports/<feature>/ir11/a16-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, outDir, idle} = require('../../../probe');
const L = require('./lib');
const A17 = require('../refused-pasted-picture-kept-embedded/lib');

forEachApp(async (app) => {
    const fact = (k, v) => { record('a16-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 700)); };
    const files = L.makeFiles(outDir());
    fact('files', files);
    const {page} = await launch(app);
    await signIn(page, 'rvaca');                                                          // 1
    const item = await A17.openCustomPageWindow(app, page);                                // 2–4
    const box = item.content('en');
    const id = await box.ready();
    const win = await box.openImageWindow();                                               // 5
    await win.openTab('Upload');                                                           // 6
    fact('6-window', {title: L.flat(await win.title.innerText()), tabs: await win.tabNames(),
        zone: L.flat(await win.dropZone.innerText()), accept: await win.fileInput.getAttribute('accept')});

    const steps = [
        ['7-browse-svg', () => L.browse(page, win, files.svg)],
        ['8-browse-pdf', () => L.browse(page, win, files.pdf)],
        ['9a-drop-pdf', () => L.dropOnZone(page, win, files.pdf)],
        ['9b-drop-svg', () => L.dropOnZone(page, win, files.svg)],
        ['c1-browse-bmp', () => L.browse(page, win, files.bmp)],
    ];
    for (const [step, run] of steps) {
        const r = await run();
        record(`a16-${step}`, await screen(page));
        await shot(page, `a16-${step}`);
        await r.settle();
        delete r.settle;
        fact(step, r);
    }

    {
        const r = await L.browse(page, win, files.png);                                   // n1
        delete r.settle;
        fact('n1-browse-png', r);
        await win.cancel();
    }

    for (const [step, key] of [['n2a-box-drop-svg', 'svg'], ['n2b-box-drop-pdf', 'pdf']]) {   // n2
        const r = await L.dropIntoBox(page, id, files[key]);
        await shot(page, `a16-${step}`);
        fact(step, r);
    }

    // Neighbour n3: the Vue form's editor ("Appearance" › "Setup" › "Page Footer"), not saved.
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
    await idle(page);
    await page.locator('#appearance-button').first().click();
    await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
    await idle(page);
    const fid = await page.locator('textarea[id*="pageFooter"][id$="-en"]').first().getAttribute('id', {timeout: L.T});
    await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, fid, {timeout: L.T});
    await page.frameLocator(`[id="${fid}_ifr"]`).locator('body').click();
    const imageButton = page.locator(`[id="${fid}"] ~ .tox-tinymce`).first().getByRole('button', {name: 'Insert/edit image', exact: true});
    await imageButton.click({timeout: L.T});
    const {ImageWindow} = require('../../../pages/CustomContentPages.js');
    const fw = new ImageWindow(page);
    await fw.root.waitFor({timeout: L.T});
    for (const [step, key] of [['n3a-footer-svg', 'svg'], ['n3b-footer-pdf', 'pdf'], ['n3c-footer-bmp', 'bmp']]) {
        const r = await L.browse(page, fw, files[key]);
        await shot(page, `a16-${step}`);
        await r.settle();
        delete r.settle;
        fact(step, r);
    }
    await fw.cancel();
});
