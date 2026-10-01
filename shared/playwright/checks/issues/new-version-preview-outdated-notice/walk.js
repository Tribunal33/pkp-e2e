// Issue report docs/issues/U13-OPS1-new-version-preview-called-outdated.md
// (U13 OPS1, U69 A4): previewing a new, unpublished version of a published
// preprint or book shows the preview notice and under it "This is an outdated
// version published on {today}". Takes the report's Steps on PKP's default
// test dataset:
//   OPS: dbarnes, submission 2, "Create New Version", "Title & Abstract", "Preview"
//   (on stable-3_5_0 "Create New Version" is a button answered "Yes").
//   OMP: dbarnes, submission 14, the same.
//   OJS (control, nothing created): dbarnes, submission 1, whose workflow opens
//   on its unpublished version 1.1; "Title & Abstract", "Preview".
// Then the reach read: the preview page's first galley / format link (the
// file viewer's own outdated banner).
// Then the neighbour check a fix must leave as it is (OMP, OPS): the new version
// is published ("Publish"), and, signed out, the older version's page still
// carries the outdated notice with its own date while the current page carries
// none.
// Reset the dataset fleet first; the walk changes the dataset.
// Run: PROBE_FEATURE=issues-ir5 PROBE_AGENT=ir5 node bin/probe.js all shared/playwright/checks/issues/new-version-preview-outdated-notice/walk.js
const {expect} = require('@playwright/test');
const {forEachApp, launch, signIn, signOut, screen, record, idle, note} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SUBMISSION = {ojs: 1, omp: 14, ops: 2};
const GROUP = {ojs: 'Publication', omp: 'Publication', ops: 'Preprint'};

/** The two notices and the label/date lines as a reader sees them. */
async function readNotices(page) {
    const notices = await page.locator('.cmp_notification').allInnerTexts().catch(() => []);
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        title: await page.title(),
        notices: notices.map((t) => flat(t)),
        preview: /This is a preview and has not been published\./.test(body),
        outdated: (body.match(/This is an outdated version published on [^\n]*/) || [null])[0],
        notFound: /404 Not Found/.test(body),
    };
}

async function createNewVersion(page, stable35) {
    // main: a menu entry opening a window with "Publication Stage"; 3.5: a
    // button over the publication pages that asks for a confirmation.
    const opener = stable35
        ? page.getByRole('button', {name: 'Create New Version', exact: true}).first()
        : page.getByRole('link', {name: 'Create New Version', exact: true}).first();
    await opener.click();
    const w = stable35
        ? page.getByRole('dialog').filter({has: page.getByRole('button', {name: /^(Confirm|Yes|OK)$/})}).last()
        : page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
    await w.waitFor({state: 'visible', timeout: T});
    await idle(page);
    await sleep(800);
    const window = await screen(page);
    record('step3-create-new-version-window', window);
    const resp = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
    await w.getByRole('button', {name: /^(Confirm|Yes|OK)$/}).last().click();
    const r = await resp;
    let newPub = null;
    if (r) {
        try {
            const j = await r.json();
            newPub = {id: j.id, status: j.status, datePublished: j.datePublished, version: j.versionString || j.version};
        } catch { /* none */ }
    }
    await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    return {status: r ? r.status() : null, newPub, windowText: flat(window.text.dialog, 600)};
}

async function selectTitleAbstract(frame, page, stable35) {
    if (stable35) {
        // 3.5 lists one version's pages, the one "All Versions" picks.
        await frame.menuLink('Title & Abstract').first().click();
        await idle(page);
        return;
    }
    // The newest version node's pages are the last ones listed; unfold it when
    // none is shown.
    const pages = frame.menuLink('Title & Abstract');
    await expect(frame.latestVersionNode()).toBeVisible({timeout: T});
    if (!(await pages.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    await expect(pages.last()).toBeVisible({timeout: T});
    await pages.last().click();
    await idle(page);
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const ctx = app.contextPath;
    const sid = SUBMISSION[app.name];
    const facts = {app: app.name, line: app.line || 'main', submission: sid};
    const stable35 = app.line === 'stable-3_5_0';
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');

    const {page, close} = await launch(app);
    try {
        // 1-2. dbarnes opens the submission's workflow.
        await signIn(page, 'dbarnes');
        const frame = new WorkflowPage(page, ctx, {labels: {publicationGroup: GROUP[app.name]}});
        await frame.gotoEditorial(sid);
        await frame.expectVersionLoaded().catch(() => {});
        await idle(page);

        // 3. "Create New Version" (OMP, OPS).
        if (app.name !== 'ojs') {
            if (stable35) await selectTitleAbstract(frame, page, true);
            else await frame.revealPublicationEntry('Create New Version');
            facts.create = await createNewVersion(page, stable35);
            await frame.expectVersionLoaded().catch(() => {});
            console.log(`[fact] ${app.name} create: ${JSON.stringify(facts.create)}`);
        }
        facts.versionNodes = await frame.versionNodeLabels().catch((e) => `error ${e.message}`);

        // 4. "Title & Abstract" of the newest version, then "Preview".
        await selectTitleAbstract(frame, page, stable35);
        facts.controls = await frame.controlsLeftItems().catch(() => null);
        const previewBtn = stable35
            ? frame.dialog().getByRole('button', {name: 'Preview', exact: true}).first()
            : frame.publishingControl('Preview');
        await expect(previewBtn).toBeVisible({timeout: T});
        record('step4-title-abstract', await screen(page));
        await Promise.all([page.waitForURL((u) => !/dashboard/.test(u.pathname), {timeout: T}), previewBtn.click()]);
        await idle(page);
        record('step4-preview', await screen(page));
        facts.preview = await readNotices(page);
        facts.previewLabelLine = flat(await page.locator('.obj_preprint_details .label, .obj_monograph_full .item.date_published, .obj_article_details .published').first().innerText().catch(() => null), 200);
        console.log(`[fact] ${app.name} preview: ${JSON.stringify(facts.preview)}`);

        // Reach (OMP): the first chapter page linked from the preview.
        const chapterLink = page.locator('a[href*="/chapter/"]').first();
        if (app.name === 'omp' && await chapterLink.count()) {
            const back = page.url();
            await chapterLink.click();
            await idle(page);
            record('reach-chapter', await screen(page));
            facts.reachChapter = await readNotices(page);
            console.log(`[fact] omp chapter: ${JSON.stringify(facts.reachChapter)}`);
            await page.goto(back);
            await idle(page);
        }

        // Reach: the first file link on the preview page.
        const fileLink = page.locator('a.obj_galley_link, .pub_format_single a, .publication_format a, .files a').first();
        if (await fileLink.count()) {
            const href = (await fileLink.getAttribute('href')) || '';
            await Promise.all([page.waitForLoadState('domcontentloaded').catch(() => {}), fileLink.click().catch(() => {})]);
            await idle(page).catch(() => {});
            await sleep(1500);
            record('reach-file-viewer', await screen(page));
            const banner = await page.locator('.galley_view_notice_message, .viewable_file_frame_notice_message, [role="alert"]').allInnerTexts().catch(() => []);
            facts.reachFileViewer = {href: href.replace(/^https?:\/\/[^/]+/, ''), url: page.url().replace(/^https?:\/\/[^/]+/, ''), banner: banner.map((b) => flat(b))};
        } else {
            facts.reachFileViewer = {href: null};
        }
        console.log(`[fact] ${app.name} reach: ${JSON.stringify(facts.reachFileViewer)}`);

        // Neighbour (OMP, OPS): publish the new version, then read the older one's page.
        if (app.name !== 'ojs') {
            await frame.gotoEditorial(sid);
            await frame.expectVersionLoaded().catch(() => {});
            await selectTitleAbstract(frame, page, stable35);
            const publish = page.getByRole('button', {name: /^(Publish|Post)$/}).first();
            await expect(publish).toBeVisible({timeout: T});
            await publish.click();
            const modal = page.getByRole('dialog').filter({has: page.getByRole('button', {name: /^(Publish|Post)$/})}).last();
            await modal.waitFor({state: 'visible', timeout: T});
            await idle(page);
            await sleep(800);
            record('n-publish-window', await screen(page));
            const w = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await modal.getByRole('button', {name: /^(Publish|Post)$/}).last().click();
            const r = await w;
            facts.nPublish = r ? r.status() : null;
            await idle(page);
            await sleep(1000);
            record('n-published', await screen(page));
        }
        await signOut(page);
    } finally {
        await close();
    }

    if (app.name !== 'ojs') {
        const reader = await launch(app);
        const r = reader.page;
        try {
            const base = app.name === 'omp' ? `catalog/book/${sid}` : `preprint/view/${sid}`;
            await r.goto(app.url(`/index.php/${ctx}/${base}`));
            await idle(r);
            record('n-current', await screen(r));
            facts.nCurrent = await readNotices(r);
            const older = await r.locator(`a[href*="/version/"]`).evaluateAll((as) => as.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')})));
            facts.nVersionLinks = older.map((o) => ({...o, href: o.href.replace(/^https?:\/\/[^/]+/, '')}));
            if (older.length) {
                await r.goto(older[0].href);
                await idle(r);
                record('n-older', await screen(r));
                facts.nOlder = await readNotices(r);
            } else {
                note('ir5 walk: no older-version link on the current page after publishing');
            }
        } finally {
            await reader.close();
        }
    }
    console.log(`[fact] ${app.name} facts: ${JSON.stringify(facts)}`);
    record('facts', facts);
});
