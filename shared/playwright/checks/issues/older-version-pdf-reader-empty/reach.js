// Reach and neighbour check for docs/issues/U13-A2-older-version-pdf-reader-empty.md
// (U13 A2), OJS: the editor previews a new, unpublished version's PDF. On PKP's
// default test dataset submission 1's version 1.1 is unpublished: dbarnes opens
// its workflow (newest version, "Title & Abstract"), presses "Preview", then
// the preview's "PDF". The PDF reader builds its file address the same way for
// any version other than the current one. Walked with the fix in and out.
// Reset the dataset fleet first.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/older-version-pdf-reader-empty/reach.js
const {expect} = require('@playwright/test');
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const {T, readLanding, readReader, watch} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('reach.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') return;
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const stable35 = app.line === 'stable-3_5_0';
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    const watched = watch(page);
    try {
        await signIn(page, 'dbarnes');
        const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
        await frame.gotoEditorial(1);
        await frame.expectVersionLoaded().catch(() => {});
        await idle(page);
        const pages = frame.menuLink('Title & Abstract');
        if (!stable35) {
            await expect(frame.latestVersionNode()).toBeVisible({timeout: T});
            if (!(await pages.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
        }
        await pages.last().click();
        await idle(page);
        const previewBtn = stable35
            ? frame.dialog().getByRole('button', {name: 'Preview', exact: true}).first()
            : frame.publishingControl('Preview');
        await expect(previewBtn).toBeVisible({timeout: T});
        await Promise.all([page.waitForURL((u) => !/dashboard/.test(u.pathname), {timeout: T}), previewBtn.click()]);
        await idle(page);
        record('reach-preview', await screen(page));
        facts.preview = await readLanding(page);
        console.log(`[fact] preview: ${JSON.stringify(facts.preview)}`);
        watched.splice(0);
        await page.locator('a.obj_galley_link').filter({hasText: /PDF/}).first().click();
        facts.previewReader = await readReader(page, watched);
        record('reach-preview-reader', await screen(page));
        await shot(page, 'reach-preview-reader');
        console.log(`[fact] preview reader: ${JSON.stringify(facts.previewReader)}`);
    } finally {
        await close();
    }
    record('reach-facts', facts);
});
