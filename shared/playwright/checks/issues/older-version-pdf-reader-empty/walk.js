// Kept walk for docs/issues/U13-A2-older-version-pdf-reader-empty.md (spec U13 register A2).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   OJS: as `dbarnes`, submission 1 "Signalling Theory Dividends": open its unpublished version 2,
//     "Publish" (keep "Vol. 1 No. 2 (2014)"), "Confirm", "Publish"; sign out.
//   Signed out (OJS submission 1, OPS submission 3, which has two published versions): the article's
//     page, "Versions" › the older version, "PDF", then the reader's "Download".
//   Control (and the fix's neighbour check): the current version's "PDF" from the article's own page,
//     its reader and its "Download"; with the fix in, its file address must stay unversioned.
// Records every screen with screen(); per reader: the viewer's file address (the iframe's `file=`),
// the viewer's page counter, the file request's status chain, the console lines and the download.
// Run (main): PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/older-version-pdf-reader-empty/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front (a stable-3_5_0 dataset fleet's feature).
//   PHASE=neighbour in front takes the control alone on a fresh load (no publish, no older version):
//   the current version's reader, for the fix's neighbour check with the fix in and out.
//   PHASE=wayround in front (on a fresh load; OJS publishes version 2 first, as in the walk): signed out,
//   the older galley's address with the version part typed in the address bar, then, as the manager
//   `rvaca`, Settings › Website › "Plugins": untick "PDF.JS PDF Viewer"; signed out, the older version's "PDF".
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PHASE = process.env.PHASE || 'walk';
const CONF = {ojs: {sid: 1, noun: 'article'}, ops: {sid: 3, noun: 'preprint'}};

forEachApp(async (app) => {
    const conf = CONF[app.name];
    if (!conf) { console.log(`[${app.name}] no such surface (OMP's reader is CatalogBookHandler's)`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const isMain = !app.line || app.line === 'main';
    const facts = {line: app.line || 'main', phase: PHASE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    const {page, close} = await launch(app);
    const consoleLines = [];
    page.on('console', (m) => consoleLines.push(`${m.type()}: ${flat(m.text(), 300)}`));
    page.on('pageerror', (e) => consoleLines.push(`pageerror: ${flat(e.message, 300)}`));
    let n = 0;
    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        Object.assign(s, extra);
        record(`w-${PHASE === 'walk' ? '' : 'n-'}${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `w-${PHASE === 'walk' ? '' : 'n-'}${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    };
    try {
        // ---- OJS: publish version 2 on screen
        if (app.name === 'ojs' && PHASE !== 'neighbour') {
            await signIn(page, 'dbarnes');
            const draft = Number(sql(app, `select max(publication_id) from publications where submission_id = ${conf.sid}`));
            const key = isMain ? `publication_${draft}_titleAbstract` : 'publication_titleAbstract';
            await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${conf.sid}&workflowMenuKey=${key}`));
            await idle(page); await sleep(1500);
            await snap('ojs-version2-before-publish');
            const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
            const pub = new PublicationScreen(page, app.contextPath);
            const confirmWin = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
            const panel = await pub.pressPublish({or: confirmWin});
            const out = {};
            if (panel) {
                const stage = panel.locator('select[name="versionStage"]');
                if (!(await stage.inputValue())) await stage.selectOption('VoR');
                const minor = panel.locator('select[name="versionIsMinor"]');
                if ((await minor.isVisible().catch(() => false)) && !(await minor.inputValue())) await minor.selectOption('false');
                out.assignment = await panel.locator('input[name="assignment"]:checked').evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null);
                out.issue = await panel.locator('select[name="issueId"] option:checked').innerText().catch(() => null);
                await snap('ojs-publish-panel', {panel: out});
                await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
            }
            await confirmWin.waitFor({timeout: T});
            const r = page.waitForResponse((x) => x.url().includes('/publish') && x.request().method() !== 'GET', {timeout: 60_000}).catch(() => null);
            await confirmWin.getByRole('button', {name: 'Publish', exact: true}).click();
            const resp = await r; out.status = resp && resp.status();
            await page.getByRole('button', {name: 'Unpublish', exact: true}).first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(800);
            await snap('ojs-version2-published', {publish: out});
            fact('publish', {...out, stored: sql(app, `select publication_id || ':' || status from publications where submission_id = ${conf.sid} order by 1`).split('\n')});
            await signOut(page);
        }

        // ---- A reader page: its file address, its page counter, the file request, the console, the download
        async function readReader(name) {
            const fileReqs = [];
            const onResp = (r) => { if (/\/download\//.test(r.url()) || /\/download$/.test(r.url())) fileReqs.push(`${r.status()} ${r.request().method()} ${r.url().replace(app.baseURL, '')}`); };
            page.on('response', onResp);
            const c0 = consoleLines.length;
            await idle(page); await sleep(4000);
            const out = {url: page.url().replace(app.baseURL, '')};
            const iframe = page.locator('#pdfCanvasContainer iframe');
            out.iframeSrc = await iframe.getAttribute('src').catch(() => null);
            out.fileAddress = out.iframeSrc ? decodeURIComponent((out.iframeSrc.split('file=')[1] || '')).replace(app.baseURL, '') : null;
            out.downloadHref = (await page.locator('a.download').getAttribute('href').catch(() => null) || '').replace(app.baseURL, '');
            out.notice = flat(await page.locator('body').innerText().catch(() => ''), 4000).match(/This is an outdated version[^.]*\.[^.]*\./)?.[0] || null;
            const fr = page.frameLocator('#pdfCanvasContainer iframe');
            out.viewer = {
                pageNumber: await fr.locator('#pageNumber').inputValue({timeout: 5000}).catch(() => null),
                numPages: flat(await fr.locator('#numPages').innerText({timeout: 5000}).catch(() => null)),
                pagesRendered: await fr.locator('#viewer .page').count().catch(() => null),
                errorBox: flat(await fr.locator('#errorWrapper:visible, #errorMessage:visible').first().innerText({timeout: 1000}).catch(() => null)),
            };
            await snap(name, {reader: out});
            // "Download"
            const dlP = page.waitForEvent('download', {timeout: 15_000}).catch(() => null);
            await page.locator('a.download').first().click();
            const dl = await dlP;
            out.download = dl ? {suggested: dl.suggestedFilename(), failure: await dl.failure().catch((e) => flat(e.message, 200))} : null;
            await sleep(1500);
            out.afterDownloadUrl = page.url().replace(app.baseURL, '');
            page.off('response', onResp);
            out.fileRequests = fileReqs;
            out.console = consoleLines.slice(c0).filter((l) => !/^(debug|log):/.test(l) || /pdf|PDF|Missing/.test(l)).slice(0, 20);
            fact(name, out);
            return out;
        }

        // ---- What a reader can still reach without the viewer
        async function pressForDownload(name, action) {
            const dlP = page.waitForEvent('download', {timeout: 15_000}).catch(() => null);
            const respP = page.waitForResponse((r) => /\/download\//.test(r.url()) && r.status() !== 302, {timeout: 15_000}).catch(() => null);
            await action();
            const dl = await dlP; const resp = await respP;
            const out = {
                response: resp ? {status: resp.status(), url: resp.url().replace(app.baseURL, ''), type: resp.headers()['content-type'], disposition: resp.headers()['content-disposition']} : null,
                download: dl ? {suggested: dl.suggestedFilename(), failure: await dl.failure().catch((e) => flat(e.message, 200))} : null,
            };
            await sleep(1000);
            out.pageUrl = page.url().replace(app.baseURL, '');
            fact(name, out);
            return out;
        }
        if (PHASE === 'wayround') {
            await page.goto(app.url(`/index.php/${app.contextPath}/${conf.noun}/view/${conf.sid}`));
            await idle(page);
            const older = page.locator('section.versions, .sub_item.versions').first().locator('a').first();
            await older.click(); await idle(page);
            const view = (await page.locator('a.obj_galley_link.pdf').first().getAttribute('href')).replace(app.baseURL, '');
            const fileId = sql(app, `select submission_file_id from publication_galleys where galley_id = ${view.split('/').pop()}`);
            const typed = view.replace(`/${conf.noun}/view/`, `/${conf.noun}/download/`) + '/' + fileId;
            fact('typedAddress', typed);
            await pressForDownload('typed-versioned-download', () => page.goto(app.url(typed)).catch(() => {}));
            await signIn(page, 'rvaca');
            await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`));
            await idle(page);
            await page.locator('#plugins-button').first().click();
            const row = page.locator('#pluginGridContainer tr.gridRow[id$="-row-pdfjsviewerplugin"]');
            await row.waitFor({timeout: T}); await idle(page);
            const box = row.getByRole('checkbox').first();
            const w = page.waitForResponse((r) => /settings-plugin-grid\/(enable|disable)/.test(r.url()), {timeout: T}).catch(() => null);
            await box.click({noWaitAfter: true});
            await sleep(700);
            const dlg = page.locator('[role="dialog"]:visible');
            let confirm = null;
            if (await dlg.count()) {
                confirm = flat(await dlg.last().innerText().catch(() => null), 300);
                const ok = dlg.last().getByRole('button', {name: /^(OK|Yes)$/}).first();
                if (await ok.count()) await ok.click();
            }
            const resp = await w;
            await sleep(1200); await idle(page);
            const st = {confirm, status: resp && resp.status(), checked: await box.isChecked().catch(() => null)};
            await snap('plugins-pdfjs-off', {plugin: st});
            fact('pdfjsOff', st);
            await signOut(page);
            await page.goto(app.url(`/index.php/${app.contextPath}/${conf.noun}/view/${conf.sid}`));
            await idle(page);
            await page.locator('section.versions, .sub_item.versions').first().locator('a').first().click();
            await idle(page);
            await snap('landing-older-viewer-off');
            await pressForDownload('older-pdf-viewer-off', () => page.locator('a.obj_galley_link.pdf').first().click());
            return;
        }

        // ---- Signed out: the article's page, "Versions" › the older version, "PDF"
        if (PHASE === 'walk') {
        await page.goto(app.url(`/index.php/${app.contextPath}/${conf.noun}/view/${conf.sid}`));
        await idle(page);
        const versions = page.locator('section.versions, .sub_item.versions').first();
        const s0 = await snap('landing-current');
        fact('landing', {url: s0.url, versions: flat(await versions.innerText().catch(() => null), 400)});
        const older = versions.locator('a').first();
        fact('olderLink', {text: flat(await older.innerText()), href: (await older.getAttribute('href')).replace(app.baseURL, '')});
        await older.click();
        await idle(page);
        const s1 = await snap('landing-older');
        const pdfLink = page.locator('a.obj_galley_link.pdf').first();
        fact('olderPage', {url: s1.url, pdfHref: (await pdfLink.getAttribute('href')).replace(app.baseURL, '')});
        await pdfLink.click();
        await page.waitForLoadState('load');
        await readReader('reader-older');
        }

        // ---- Control: the current version's "PDF"
        await page.goto(app.url(`/index.php/${app.contextPath}/${conf.noun}/view/${conf.sid}`));
        await idle(page);
        const curPdf = page.locator('a.obj_galley_link.pdf').first();
        fact('currentPage', {pdfHref: (await curPdf.getAttribute('href')).replace(app.baseURL, '')});
        await curPdf.click();
        await page.waitForLoadState('load');
        await readReader('reader-current');
    } finally {
        record(PHASE === 'walk' ? 'facts' : `facts-${PHASE}`, facts);
        await close();
    }
});
