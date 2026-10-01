// Issue report docs/issues/U09-A17-refused-pasted-picture-kept-embedded.md (U09 A17): the report's
// Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), context `publicknowledge`, as `rvaca`. The kit builds nothing.
//   1. sign in as rvaca
//   2–4. Settings › Website › "Setup" › "Navigation", "Add item", "Custom Page"
//   5. "Title" "u09ir10 Pictures", "Path" "u09ir10-pictures"
//   6–7. drop photo.bmp into "Content"; the notice
//   8. drop notes.png (a text file); the notice
//   9. drop photo.png (the control)
//   10. paste drawing.bmp (the browser's paste event carrying the file); the notice
//   11. "Save"
//   12–13. the public page /index.php/publicknowledge/u09ir10-pictures: its pictures' addresses
// Neighbour (with the fix in and out):
//   n1. "Insert/edit image" › "Upload" › "Browse for an image" with photo.bmp in a new Custom Page
//       window: the small window's message, and nothing inserted.
//   n2. Settings › Website › "Appearance" › "Setup", "Page Footer" (the Vue form's editor): drop
//       photo.bmp; the notice and what the box keeps (not saved).
//   n3. An upload answered without JSON, as a proxy's own "413 Request Entity Too Large" page is
//       (the browser is handed that answer for the upload; the server is not asked): photo.png
//       dropped into a new Custom Page window; the notice, the page's script errors, the box.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir10 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir10 PROBE_AGENT=ir10 node bin/probe.js all shared/playwright/checks/issues/refused-pasted-picture-kept-embedded/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir10-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir10-3_5 PROBE_AGENT=ir10 node bin/probe.js all shared/playwright/checks/issues/refused-pasted-picture-kept-embedded/walk.js
// A17_ONLY=n3 in front runs neighbour n3 alone (signed in as rvaca).
// Facts: .reports/<feature>/ir10/a17-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, outDir, idle} = require('../../../probe');
const L = require('./lib');
const A18 = require('../picture-over-upload-limit-server-error/lib');

forEachApp(async (app) => {
    const fact = (k, v) => { record('a17-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 700)); };
    const files = L.makeFiles(outDir());
    fact('files', files);
    const {page} = await launch(app);
    await signIn(page, 'rvaca');                                                          // 1
    if (process.env.A17_ONLY !== 'n3') {
        const win = await L.openCustomPageWindow(app, page);                                  // 2–4
        await win.typeTitle('en', 'u09ir10 Pictures');                                        // 5
        await win.pathInput.fill('u09ir10-pictures');
        const box = win.content('en');
        const id = await box.ready();

        for (const [step, key] of [['6-7-bmp', 'bmp'], ['8-notes-png', 'fake'], ['9-photo-png', 'png']]) {
            const up = await L.dropFile(page, id, files[key]);                                // 6, 8, 9
            const notices = await L.editorNotices(page);                                     // 7
            record(`a17-${step}`, await screen(page));
            await shot(page, `a17-${step}`);
            await L.editorNotices(page, {dismiss: true});
            fact(step, {upload: up, notices, box: await L.editorPictures(page, id)});
        }

        {
            const up = await L.pasteFile(page, id, files.bmp2);                                // 10
            const notices = await L.editorNotices(page);
            record('a17-10-paste-bmp', await screen(page));
            await shot(page, 'a17-10-paste-bmp');
            await L.editorNotices(page, {dismiss: true});
            fact('10-paste-bmp', {upload: up, notices, box: await L.editorPictures(page, id)});
        }

        await win.blur();                                                                      // 11
        const sent = page.waitForRequest((r) => /update-navigation-menu-item/.test(r.url()) && r.method() === 'POST', {timeout: L.T});
        const saved = await win.save();
        const post = new URLSearchParams((await sent).postData() || '');
        const content = post.get('content[en]') || '';
        fact('11-save', {
            status: saved.status, answer: saved.body && saved.body.status,
            postedPictures: [...content.matchAll(/<img[^>]*src="([^"]*)"/g)].map((m) => L.shortSrc(m[1])),
        });

        const res = await page.goto(app.url(`/index.php/${app.contextPath}/u09ir10-pictures`));   // 12
        await idle(page);
        record('a17-12-public', await screen(page));
        await shot(page, 'a17-12-public');
        fact('12-13-public', {status: res.status(), heading: L.flat(await page.locator('.pkp_structure_main h1').first().innerText().catch(() => null)), pictures: await L.publicPictures(page)});

        // Neighbour n1: the picture window's own upload of the same BMP.
        const win2 = await L.openCustomPageWindow(app, page);
        const box2 = win2.content('en');
        const id2 = await box2.ready();
        const pw = await box2.openImageWindow();
        const r = await A18.uploadAndRead(page, pw, files.bmp.path);
        record('a17-n1-picture-window', await screen(page));
        await shot(page, 'a17-n1-picture-window');
        await r.settle();
        delete r.settle;
        await pw.cancel();
        fact('n1-picture-window', {...r, box: await L.editorPictures(page, id2), notices: await L.editorNotices(page, {dismiss: true})});
        await win2.close();

        // Neighbour n2: the Vue form's editor ("Appearance" › "Setup" › "Page Footer"), not saved.
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
        await idle(page);
        await page.locator('#appearance-button').first().click();
        await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
        await idle(page);
        const fid = await page.locator('textarea[id*="pageFooter"][id$="-en"]').first().getAttribute('id', {timeout: L.T});
        await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, fid, {timeout: L.T});
        const before = await L.editorPictures(page, fid);
        const up = await L.dropFile(page, fid, files.bmp);
        const notices = await L.editorNotices(page);
        record('a17-n2-page-footer', await screen(page));
        await shot(page, 'a17-n2-page-footer');
        fact('n2-page-footer', {upload: up, notices, before, box: await L.editorPictures(page, fid)});

    }

    // Neighbour n3: an upload answered without JSON (a proxy's own 413 page).
    const errors = [];
    page.on('pageerror', (e) => errors.push(L.flat(e.message, 200)));
    const win3 = await L.openCustomPageWindow(app, page);
    const id3 = await win3.content('en').ready();
    await page.route(/_uploadPublicFile/, (route) => route.fulfill({
        status: 413, contentType: 'text/html',
        body: '<html><head><title>413 Request Entity Too Large</title></head><body><h1>413 Request Entity Too Large</h1></body></html>',
    }));
    const up3 = await L.dropFile(page, id3, files.png, {waitIdle: false});
    await L.sleep(1500);
    const notices3 = await L.editorNotices(page);
    await shot(page, 'a17-n3-not-json');   // no screen(): jQuery's request count never ends after the throw
    await page.unroute(/_uploadPublicFile/);
    fact('n3-not-json', {upload: up3, notices: notices3, pageErrors: errors, box: await L.editorPictures(page, id3)});
});
