// Issue report docs/issues/U13-A2-older-version-pdf-reader-empty.md (U13 A2):
// an older version's "PDF" opens the PDF reader with an empty viewer ("0 of
// 0"), and the reader's "Download" gets no file. Takes the report's Steps on
// PKP's default test dataset:
//   OJS: dbarnes publishes submission 1's version 1.1 (workflow, "Publish"),
//        then, signed out, article "mwandenga" › "Versions" › the older entry
//        › "PDF" › the viewer › "Download".
//   OPS: nothing created; signed out, preprint 3 › "Versions" › the older
//        entry › "PDF" › the viewer › "Download".
// Then the control a fix must leave as it is (the neighbour check): the
// current version's "PDF" reader shows the document and its "Download" saves
// the file.
// Reset the dataset fleet first; the walk changes the dataset (OJS).
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/older-version-pdf-reader-empty/walk.js
//      (OMP is skipped: its book pages build a versioned file address)
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const {sleep, rel, publishLatestVersion, readLanding, readReader, watch, pressDownload} = require('./lib');

const SUBMISSION = {ojs: 1, ops: 3};
const PAGE = {ojs: 'article', ops: 'preprint'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (!SUBMISSION[app.name]) {
        console.log(`[fact] ${app.name}: no article galleys; skipped`);
        return;
    }
    const ctx = app.contextPath;
    const sid = SUBMISSION[app.name];
    const facts = {app: app.name, line: app.line || 'main', submission: sid};

    // OJS steps 1-3: the editor publishes version 1.1.
    if (app.name === 'ojs') {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            facts.publish = await publishLatestVersion(page, app, sid);
            console.log(`[fact] ojs publish: ${JSON.stringify(facts.publish)}`);
            await signOut(page);
        } finally {
            await close();
        }
    }

    // Steps 4-8, signed out.
    const {page, close} = await launch(app);
    const watched = watch(page);
    try {
        await page.goto(app.url(`/index.php/${ctx}/${PAGE[app.name]}/view/${sid}`));
        await idle(page);
        record('step4-current-page', await screen(page));
        facts.current = await readLanding(page);
        console.log(`[fact] ${app.name} current: ${JSON.stringify(facts.current)}`);

        // 5. "Versions": the older entry.
        const older = facts.current.versions[0];
        if (!older) throw new Error('no older version link on the current page');
        await page.locator(`a[href$="${older.href}"]`).first().click();
        await idle(page);
        record('step5-older-page', await screen(page));
        facts.older = await readLanding(page);
        console.log(`[fact] ${app.name} older: ${JSON.stringify(facts.older)}`);

        // 6-7. "PDF" and the viewer.
        watched.splice(0);
        await page.locator('a.obj_galley_link').filter({hasText: /PDF/}).first().click();
        facts.olderReader = await readReader(page, watched);
        record('step6-older-reader', await screen(page));
        await shot(page, 'step7-older-reader');
        console.log(`[fact] ${app.name} older reader: ${JSON.stringify(facts.olderReader)}`);

        // 8. "Download".
        facts.olderDownload = await pressDownload(page, watched);
        console.log(`[fact] ${app.name} older download: ${JSON.stringify(facts.olderDownload)}`);
    } finally {
        await close();
    }

    // Control / neighbour: the current version's reader and its "Download".
    const ctl = await launch(app);
    const watched2 = watch(ctl.page);
    try {
        await ctl.page.goto(app.url(`/index.php/${ctx}/${PAGE[app.name]}/view/${sid}`));
        await idle(ctl.page);
        watched2.splice(0);
        await ctl.page.locator('a.obj_galley_link').filter({hasText: /PDF/}).first().click();
        facts.currentReader = await readReader(ctl.page, watched2);
        record('control-current-reader', await screen(ctl.page));
        await shot(ctl.page, 'control-current-reader');
        console.log(`[fact] ${app.name} current reader: ${JSON.stringify(facts.currentReader)}`);
        facts.currentDownload = await pressDownload(ctl.page, watched2);
        console.log(`[fact] ${app.name} current download: ${JSON.stringify(facts.currentDownload)}`);
    } finally {
        await ctl.close();
    }
    await sleep(100);
    record('facts', facts);
    console.log(`[fact] ${app.name} done ${rel(app.baseURL)}`);
});
