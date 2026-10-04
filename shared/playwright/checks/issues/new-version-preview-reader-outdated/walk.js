// Issue report docs/issues/U13-A13-new-version-preview-reader-called-outdated.md
// (U13 A13): the PDF (and, on a journal, HTML) reader opened from a new,
// unpublished version's preview says "This is an outdated version published
// on {date}". Takes the report's Steps on PKP's default test dataset:
//   OJS: dbarnes, submission 17, "Create New Version", "Galleys" › "Add
//        galley" "HTML" (u13a13-article.html), "Title & Abstract",
//        "Preview", "PDF", back, "HTML".
//   OPS: dbarnes, submission 2, the same without the HTML galley.
//   OMP: dbarnes, submission 14, the same; the preview's "PDF" format link.
//   Also read (no step): OJS submission 1's own unpublished version 1.1,
//   whose preview's "PDF Version 2" opens the reader.
// WALK=nb (main only; the neighbour check a fix must leave alone):
//   OPS: signed out, submission 3's current and older posted versions' PDF.
//   OJS: dbarnes on submission 17 makes 1.1 with an HTML galley, publishes
//        it, makes 1.2 and publishes it; signed out, the current version's
//        PDF and HTML, version 1.1's PDF and HTML, version 1.0's PDF.
// Reset the dataset fleet first; the walk changes the dataset.
// Run:     PROBE_FEATURE=issues-u13a13 PROBE_AGENT=u13a13 node bin/probe.js all shared/playwright/checks/issues/new-version-preview-reader-outdated/walk.js
// 3.5:     PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u13a13-3_5 PROBE_AGENT=u13a13 node bin/probe.js all …/walk.js
// Neighbour: WALK=nb PROBE_RUN=nb-out PROBE_FEATURE=issues-u13a13 PROBE_AGENT=u13a13 node bin/probe.js ojs,ops …/walk.js
const {forEachApp, launch, signIn, signOut, record, idle, note} = require('../../../probe');
const {flat, rel, HTML_FILE, createNewVersion, openPreview, readPage, pressFile, snap} = require('./lib');

const MODE = process.env.WALK || 'steps';
const SUBMISSION = {ojs: 17, omp: 14, ops: 2};
const GROUP = {ojs: 'Publication', omp: 'Publication', ops: 'Preprint'};
const ITEM = {ojs: 'article/view', omp: 'catalog/book', ops: 'preprint/view'};

function log(app, facts, key, value) {
    facts[key] = value;
    console.log(`[fact] ${app.name} ${key}: ${JSON.stringify(value)}`);
}

async function stepsWalk(app, page, facts) {
    const stable35 = app.line === 'stable-3_5_0';
    const sid = SUBMISSION[app.name];
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: GROUP[app.name]}});

    // 1-2. dbarnes opens the submission's workflow.
    await signIn(page, 'dbarnes');
    await frame.gotoEditorial(sid);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);

    // 3. "Create New Version".
    log(app, facts, 'step3 create', await createNewVersion(page, frame, stable35));
    await snap(page, 'step3-created');

    // 4. OJS: an "HTML" galley on the new version.
    if (app.name === 'ojs') {
        const {addGalleyToLatestVersion} = require('../lens-formulas-not-typeset/lib');
        log(app, facts, 'step4 html galley', await addGalleyToLatestVersion(page, app, sid, {label: 'HTML', component: 'Article Text', file: HTML_FILE, name: 'u13a13-article.html'}));
        await frame.gotoEditorial(sid);
        await frame.expectVersionLoaded().catch(() => {});
        await idle(page);
    }

    // 5. "Title & Abstract", "Preview".
    log(app, facts, 'step5 preview', await openPreview(page, frame, stable35));
    await snap(page, 'step5-preview');
    const previewUrl = page.url();

    // 6. "PDF".
    log(app, facts, 'step6 pdf reader', await pressFile(page, 'PDF'));
    await snap(page, 'step6-pdf-reader');

    // 7. OJS: back to the preview, "HTML".
    if (app.name === 'ojs') {
        await page.goto(previewUrl);
        await idle(page);
        log(app, facts, 'step7 html reader', await pressFile(page, 'HTML'));
        await snap(page, 'step7-html-reader');

        // Read, not a step: submission 1's own unpublished version 1.1 (the dataset's).
        const {sql} = require('../../../probe');
        const pubId = Number(sql(app, `select publication_id from publications where submission_id = 1 and status <> 3 order by publication_id desc limit 1`).trim());
        await page.goto(app.url(`/index.php/${app.contextPath}/${ITEM.ojs}/1/version/${pubId}`));
        await idle(page);
        const p1 = await readPage(page);
        log(app, facts, 'read sub1 preview', p1);
        const label = (p1.files[0] || {}).text;
        if (label) log(app, facts, 'read sub1 reader', await pressFile(page, label));
        await snap(page, 'read-sub1-reader');
    }
    await signOut(page);
}

/** Signed out: the item page at `path`, then each file label's reader. */
async function readReaders(app, page, facts, key, path, labels) {
    await page.goto(app.url(`/index.php/${app.contextPath}/${path}`));
    await idle(page);
    const out = {page: await readPage(page)};
    const pageUrl = page.url();
    for (const label of labels) {
        out[label] = await pressFile(page, label);
        await snap(page, `${key}-${label.toLowerCase()}`);
        await page.goto(pageUrl);
        await idle(page);
    }
    log(app, facts, key, out);
    return out;
}

/** The item's version links on its current page, oldest last as listed. */
async function versionLinks(page) {
    return page.locator('a[href*="/version/"]').evaluateAll((as) => as.map((a) => ({text: a.textContent.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})))
        .then((xs) => xs.filter((x) => !/\/version\/\d+\/\d+/.test(x.href)).map((x) => ({...x, href: rel(x.href)})));
}

async function neighbourWalk(app, page, facts) {
    if (app.line && app.line !== 'main') throw new Error('WALK=nb runs on main only');
    if (app.name === 'ops') {
        const sid = 3;
        await readReaders(app, page, facts, 'nb current', `${ITEM.ops}/${sid}`, ['PDF']);
        await page.goto(app.url(`/index.php/${app.contextPath}/${ITEM.ops}/${sid}`));
        await idle(page);
        const links = await versionLinks(page);
        log(app, facts, 'nb version links', links);
        const older = links.find((l) => /\/version\/\d+$/.test(l.href));
        if (older) await readReaders(app, page, facts, 'nb older', older.href.replace(/^.*\/index\.php\/[^/]+\/(en\/)?/, ''), ['PDF']);
        else note('u13a13 nb: OPS submission 3 shows no older-version link');
        return;
    }
    if (app.name !== 'ojs') return;
    const sid = 17;
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {publishLatest} = require('../minor-version-new-galley-dois/lib');
    const {addGalleyToLatestVersion} = require('../lens-formulas-not-typeset/lib');
    const {PublishScreen} = require('../../../../../apps/ojs/playwright/pages/PublishSchedulePages.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    await signIn(page, 'dbarnes');
    await frame.gotoEditorial(sid);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    log(app, facts, 'nb create 1.1', await createNewVersion(page, frame, false));
    log(app, facts, 'nb html galley', await addGalleyToLatestVersion(page, app, sid, {label: 'HTML', component: 'Article Text', file: HTML_FILE, name: 'u13a13-article.html'}));
    for (const v of ['1.1', '1.2']) {
        await frame.gotoEditorial(sid);
        await frame.expectVersionLoaded().catch(() => {});
        await idle(page);
        if (v === '1.2') log(app, facts, 'nb create 1.2', await createNewVersion(page, frame, false));
        log(app, facts, `nb publish ${v}`, await publishLatest(page, frame, 'Publish', new PublishScreen(page, app.contextPath)).catch((e) => `error ${flat(e.message, 200)}`));
        await snap(page, `nb-published-${v}`);
    }
    await signOut(page);
    await readReaders(app, page, facts, 'nb current', `${ITEM.ojs}/${sid}`, ['PDF', 'HTML']);
    await page.goto(app.url(`/index.php/${app.contextPath}/${ITEM.ojs}/${sid}`));
    await idle(page);
    const links = await versionLinks(page);
    log(app, facts, 'nb version links', links);
    for (const l of links) {
        const m = l.href.match(/\/version\/(\d+)$/);
        if (!m) continue;
        await readReaders(app, page, facts, `nb version ${m[1]}`, `${ITEM.ojs}/${sid}/version/${m[1]}`, ['PDF', 'HTML']);
    }
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    try {
        if (MODE === 'nb') await neighbourWalk(app, page, facts);
        else await stepsWalk(app, page, facts);
    } catch (e) {
        facts.error = flat(e.stack || e.message, 800);
        await snap(page, 'error');
        throw e;
    } finally {
        record(MODE === 'nb' ? 'nb-facts' : 'facts', facts);
        await close();
    }
});
