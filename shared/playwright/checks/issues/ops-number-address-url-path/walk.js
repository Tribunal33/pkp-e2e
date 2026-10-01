// Issue report docs/issues/U13-OPS2-OPS3-ops-number-address-url-path.md (U13 OPS2, OPS3):
// once a preprint (or its galley) has a URL Path, an address that uses the
// number loses its galley or version part, and a galley's number answers
// "404 Not Found". Takes the report's Steps on PKP's default test dataset:
//   OPS: dbarnes sets URL Path "u13ir2-path" on submission 3's current
//   version ("Preprint entry"), URL Path "u13ir2-pdf" on its "PDF" galley,
//   adds an "HTML" galley; then, signed out, the number address, the "HTML"
//   link, the older version's number address, the galley's number address
//   and the galley's number under the URL Path, the PDF reader's own
//   "Download" (control); then the neighbour checks
//   (another preprint's galley number, an unknown galley, a preprint with no
//   URL Path) that a fix must leave as they are.
//   OJS (control, nothing created): submission 1 already has the URL Path
//   "mwandenga-signalling-theory"; its number address with the galley number.
//   OMP has no number-to-URL-Path forwarding (CatalogBookHandler), so no surface.
// Reset the dataset fleet first; the walk changes submission 3.
// Run: PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir2 node bin/probe.js all shared/playwright/checks/issues/ops-number-address-url-path/walk.js
const path = require('path');
const {expect} = require('@playwright/test');
const {forEachApp, launch, signIn, signOut, screen, record, idle, note} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PREPRINT_PATH = 'u13ir2-path';
const GALLEY_PATH = 'u13ir2-pdf';
const HTML_FILE = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ops', 'playwright', 'fixtures', 'files', 'preprint.html');

/** Follow one typed address (or click) and say where it ended and what it showed. */
async function visit(page, app, label, action, {download = false} = {}) {
    const chain = [];
    const onResponse = (r) => {
        if (r.request().resourceType() === 'document' || r.request().isNavigationRequest()) {
            chain.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`);
        }
    };
    page.on('response', onResponse);
    const dl = download ? page.waitForEvent('download', {timeout: 15_000}).catch(() => null) : null;
    let error = null;
    try {
        await action();
    } catch (e) {
        error = flat(e.message, 200);
    }
    const file = dl ? await dl : null;
    await idle(page).catch(() => {});
    page.off('response', onResponse);
    const s = await screen(page);
    record(label, s);
    const body = flat(s.text.main || s.text.body || '', 2000) || '';
    const out = {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        chain,
        title: await page.title(),
        notFound: /404 Not Found/.test(body) || /not found/i.test(await page.title()),
        pdfReader: (await page.locator('#pdfCanvasContainer').count()) > 0,
        preprintPage: (await page.locator('.obj_article_details, .obj_preprint_details').count()) > 0,
        outdatedNotice: /This is an outdated version/.test(body),
        download: file ? file.suggestedFilename() : null,
        error,
    };
    console.log(`[fact] ${app.name} ${label}: ${JSON.stringify(out)}`);
    return out;
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main'};

    if (app.name === 'omp') {
        note('ir2 walk: OMP skipped, no number-to-URL-Path forwarding (CatalogBookHandler::initialize)');
        return;
    }

    if (app.name === 'ojs') {
        // Control: the journal keeps the galley part.
        const {page, close} = await launch(app);
        try {
            facts.ojsNumberGalley = await visit(page, app, 'ojs-control-number-galley', () =>
                page.goto(app.url(`/index.php/${ctx}/article/view/1/1`)));
            facts.ojsNumber = await visit(page, app, 'ojs-control-number', () =>
                page.goto(app.url(`/index.php/${ctx}/article/view/1`)));
        } finally {
            await close();
        }
        record('facts', facts);
        return;
    }

    // ----- OPS -----
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {GalleyManager} = require('../../../pages/GalleysPages.js');
    const {page, close} = await launch(app);
    try {
        // 1-2. dbarnes opens submission 3's workflow by its address.
        await signIn(page, 'dbarnes');
        const frame = new WorkflowPage(page, ctx, {labels: {publicationGroup: 'Preprint'}});
        await frame.gotoEditorial(3);
        await frame.expectVersionLoaded().catch(() => {});
        const dialog = page.getByRole('dialog').first();

        // 3. "Preprint entry": URL Path, Save.
        await dialog.getByRole('link', {name: 'Preprint entry', exact: true}).click();
        const box = page.locator('#issueEntry-urlPath-control');
        await expect(box).toBeVisible({timeout: T});
        await box.fill(PREPRINT_PATH);
        const saved = page.waitForResponse((r) => /\/api\/v1\/submissions\/3\/publications\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await box.locator('xpath=ancestor::form').getByRole('button', {name: 'Save', exact: true}).click();
        const saveRes = await saved;
        await idle(page);
        facts.urlPathSave = {status: saveRes.status(), url: saveRes.url().replace(/^https?:\/\/[^/]+/, '')};
        record('step3-preprint-entry-saved', await screen(page));

        // 4. "Galleys": "PDF" › Edit › URL Path, Save.
        await dialog.getByRole('link', {name: 'Galleys', exact: true}).click();
        const galleys = new GalleyManager(page, frame);
        await galleys.expectLoaded();
        let win = await galleys.openEdit('PDF');
        await win.type(win.urlPathBox(), GALLEY_PATH);
        const gSave = await win.save();
        facts.galleyPathSave = gSave.status();

        // 5. "Add galley": HTML.
        await galleys.addGalley({label: 'HTML', component: 'Preprint Text', file: HTML_FILE, name: 'preprint.html'});
        await galleys.expectLabels(['PDF', 'HTML']);
        record('step5-galleys', await screen(page));
        await signOut(page);
    } finally {
        await close();
    }

    // 6-10, signed out.
    const reader = await launch(app);
    const r = reader.page;
    try {
        facts.s6Number = await visit(r, app, 's6-number-address', () => r.goto(app.url(`/index.php/${ctx}/preprint/view/3`)));
        const links = await r.locator('a.obj_galley_link, a.obj_galley_link_supplementary').evaluateAll((as) => as.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')})));
        facts.s6GalleyLinks = links;
        console.log(`[fact] ops galley links: ${JSON.stringify(links)}`);
        facts.s7Html = await visit(r, app, 's7-html-link', () => r.locator('a.obj_galley_link', {hasText: 'HTML'}).first().click(), {download: true});
        facts.s8Version = await visit(r, app, 's8-version-number-address', () => r.goto(app.url(`/index.php/${ctx}/preprint/view/3/version/3`)));
        facts.s9GalleyNumber = await visit(r, app, 's9-galley-number-address', () => r.goto(app.url(`/index.php/${ctx}/preprint/view/3/4`)));
        facts.s10GalleyNumberUnderPath = await visit(r, app, 's10-galley-number-under-path', () => r.goto(app.url(`/index.php/${ctx}/preprint/view/${PREPRINT_PATH}/4`)));
        // Controls on the same page: the "PDF" link (its URL Path) opens the reader.
        facts.controlPdfLink = await visit(r, app, 'control-pdf-path', () => r.goto(app.url(`/index.php/${ctx}/preprint/view/${PREPRINT_PATH}/${GALLEY_PATH}`)));
        // The PDF reader's own "Download" (its address carries the URL Paths).
        const dlLink = r.locator('a.download').first();
        const dlHref = (await dlLink.getAttribute('href')).replace(/^https?:\/\/[^/]+/, '');
        facts.readerDownload = {href: dlHref, ...(await visit(r, app, 'control-reader-download', () => dlLink.click(), {download: true}))};

        // Neighbours a fix must leave as they are.
        facts.nAnotherPreprintsGalley = await visit(r, app, 'n1-other-preprints-galley', () => r.goto(app.url(`/index.php/${ctx}/preprint/view/${PREPRINT_PATH}/2`)));
        facts.nNoSuchGalley = await visit(r, app, 'n2-no-such-galley', () => r.goto(app.url(`/index.php/${ctx}/preprint/view/3/nosuchgalley`)));
        facts.nNoUrlPath = await visit(r, app, 'n3-no-url-path', () => r.goto(app.url(`/index.php/${ctx}/preprint/view/2/2`)));
    } finally {
        await reader.close();
    }
    record('facts', facts);
});
