// Kept walk for docs/issues/U13-OPS2-url-path-preprint-downloads-not-found.md (spec U13 register OPS2;
// spec U20 register OPS1). Takes the report's Steps on a fresh load of PKP's default test dataset (OPS),
// through the screens:
//   As `dbarnes`, submission 3 "Computer Skill Requirements for New and Existing Teachers…" (two posted
//   versions): the current version's "Galleys" › "Add galley" "HTML" with an HTML file ("Preprint Text");
//   its "Preprint entry" › "URL Path" `u13ops2`, "Save" (3.5: "Unpost" first and "Post" after, when the
//   posted version's form is read-only there). Sign out.
//   Signed out: the number address; "HTML"; "PDF" and the reader's "Download" (control); the "PDF" link's
//   number address typed; "Versions" › the first version (control) and its number address typed.
// Records every screen with screen(); per address: the chain of document responses (status, address,
// Location), the download it started, the page it ended on.
// Run (main): PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/url-path-preprint-downloads-not-found/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front (a stable-3_5_0 dataset fleet's feature).
//   PHASE=neighbour in front takes the fix's neighbour check alone on a fresh load (nothing set up):
//   submission 2, which has no URL Path: its number address, its "PDF" link, the reader's "Download",
//   the galley's download address, an unknown galley number and an unknown version; and the reader's
//   addresses of submission 3's older version. Run with the fix in and out: every answer must be the same.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PHASE = process.env.PHASE || 'walk';
const SID = 3;
const URL_PATH = 'u13ops2';
const HTML_NAME = 'u13ops2.html';

forEachApp(async (app) => {
    if (app.name !== 'ops') { console.log(`[${app.name}] not walked: the fault is OPS's PreprintHandler (OJS's ArticleHandler keeps the rest of the address)`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const isMain = !app.line || app.line === 'main';
    const cp = app.contextPath;
    const ctx = `/index.php/${cp}`;
    const facts = {line: app.line || 'main', phase: PHASE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    const {page, close} = await launch(app);
    const consoleLines = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleLines.push(flat(m.text(), 300)); });
    page.on('pageerror', (e) => consoleLines.push(`pageerror: ${flat(e.message, 300)}`));
    let n = 0;
    const pre = PHASE === 'walk' ? 'w' : 'n';
    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        Object.assign(s, extra);
        const nm = `${pre}-${String(++n).padStart(2, '0')}-${name}`;
        record(nm, s);
        await shot(page, nm).catch(() => {});
        return s;
    };
    const rel = (u) => (u || '').replace(app.baseURL, '');

    // Follow one action: every document response on the way (status, address, Location), a download if one
    // starts, the page it ends on and its heading.
    async function follow(name, action) {
        const chain = [];
        const onResp = (r) => {
            const rq = r.request();
            if (rq.resourceType() !== 'document' || rq.frame() !== page.mainFrame()) return;
            chain.push({status: r.status(), url: rel(r.url()), location: r.headers().location ? rel(r.headers().location) : undefined, type: (r.headers()['content-type'] || '').split(';')[0] || undefined});
        };
        page.on('response', onResp);
        const dlP = page.waitForEvent('download', {timeout: 12_000}).catch(() => null);
        await action().catch((e) => chain.push({error: flat(e.message, 160)}));
        const dl = await Promise.race([dlP, sleep(4000).then(() => 'none')]);
        await idle(page).catch(() => {});
        await sleep(600);
        page.off('response', onResp);
        const out = {
            chain,
            download: dl && dl !== 'none' ? {suggested: dl.suggestedFilename(), failure: await dl.failure().catch((e) => flat(e.message, 200))} : null,
            endedAt: rel(page.url()),
            heading: flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null), 200),
            reader: await page.locator('#pdfCanvasContainer iframe').count(),
        };
        await snap(name, {follow: out});
        fact(name, out);
        return out;
    }
    const goTo = (p) => () => page.goto(app.url(p), {waitUntil: 'load'});

    try {
        const pubs = sql(app, `select publication_id from publications where submission_id = ${SID} order by 1`).split('\n').map(Number);
        const [olderPub, currentPub] = pubs;
        fact('publications', pubs);

        if (PHASE === 'walk') {
            // ---- 1–4: as dbarnes, add an HTML galley and a URL Path to the current version
            const htmlFile = path.join(os.tmpdir(), HTML_NAME);
            fs.writeFileSync(htmlFile, '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><title>u13ops2</title></head><body><h1>u13ops2 full text</h1><p>An HTML galley.</p></body></html>\n');
            await signIn(page, 'dbarnes');
            const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
            const {GalleyManager} = require('../../../pages/GalleysPages.js');
            const frame = new WorkflowPage(page, cp, {labels: {publicationGroup: 'Preprint'}});
            const galleys = new GalleyManager(page, frame);
            const key = (k) => (isMain ? `publication_${currentPub}_${k}` : `publication_${k}`);
            await page.goto(app.url(`${ctx}/dashboard/editorial?workflowSubmissionId=${SID}&workflowMenuKey=${key('galleys')}`));
            await idle(page); await sleep(1500);
            await galleys.table().waitFor({timeout: T});
            await snap('galleys-before');
            let unposted = false;
            await galleys.addGalley({label: 'HTML', component: 'Preprint Text', file: htmlFile, name: HTML_NAME});
            await idle(page); await sleep(800);
            fact('galleysAfterAdd', await galleys.labels().catch((e) => flat(e.message, 200)));
            await snap('galleys-after-add');

            await page.goto(app.url(`${ctx}/dashboard/editorial?workflowSubmissionId=${SID}&workflowMenuKey=${key('preprintEntry')}`));
            await idle(page); await sleep(1500);
            const box = page.locator('[id$="-urlPath-control"]').first();
            await box.waitFor({timeout: T});
            await snap('preprint-entry-before');
            fact('urlPathBox', {editable: await box.isEditable().catch(() => null)});
            if (!(await box.isEditable().catch(() => false))) {
                // 3.5: the posted version's form is read-only; "Unpost" opens it
                const unpost = frame.dialog().getByRole('button', {name: /^Unpost$/}).first();
                await unpost.click();
                const q = page.getByRole('dialog').filter({hasText: /Are you sure/}).last();
                await q.waitFor({timeout: T});
                fact('unpostQuestion', flat(await q.innerText(), 300));
                const r = page.waitForResponse((x) => /\/unpublish/.test(x.url()), {timeout: T}).catch(() => null);
                await q.getByRole('button', {name: /^(Unpost|Unpublish|Yes|OK)$/}).last().click();
                const resp = await r; fact('unpost', resp && resp.status());
                await idle(page); await sleep(1500);
                unposted = true;
                await box.waitFor({timeout: T});
            }
            await box.fill(URL_PATH);
            const form = box.locator('xpath=ancestor::form[1]');
            const saveR = page.waitForResponse((x) => /\/publications\/\d+/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const sresp = await saveR;
            await idle(page); await sleep(1000);
            await snap('preprint-entry-saved', {save: sresp && sresp.status()});
            fact('saveUrlPath', {status: sresp && sresp.status(), stored: sql(app, `select publication_id || ':' || coalesce(url_path,'') || ':' || status from publications where submission_id = ${SID} order by 1`).split('\n')});
            if (unposted) {
                const post = frame.dialog().getByRole('button', {name: /^Post$/}).first();
                await post.click();
                const q = page.getByRole('dialog').filter({hasText: /post|Post/}).last();
                await q.waitFor({timeout: T});
                fact('postQuestion', flat(await q.innerText(), 300));
                const r = page.waitForResponse((x) => /\/publish/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await q.getByRole('button', {name: /^(Post|Publish)$/}).last().click();
                const resp = await r; fact('post', resp && resp.status());
                await idle(page); await sleep(1500);
                await snap('reposted');
            }
            await signOut(page);
            const galleyRows = sql(app, `select g.galley_id || ':' || g.publication_id || ':' || g.label || ':' || coalesce(g.submission_file_id::text,'') from publication_galleys g join publications p on p.publication_id = g.publication_id where p.submission_id = ${SID} order by 1`).split('\n');
            fact('galleys', galleyRows);
            const pdfGalley = Number(galleyRows.find((r) => r.split(':')[1] === String(currentPub) && r.split(':')[2] === 'PDF').split(':')[0]);
            const htmlGalley = Number(galleyRows.find((r) => r.split(':')[2] === 'HTML').split(':')[0]);

            // ---- 6: the number address
            await follow('number-address', goTo(`${ctx}/preprint/view/${SID}`));
            const links = await page.locator('a.obj_galley_link').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})));
            fact('galleyLinks', links.map((l) => ({text: l.text, href: rel(l.href)})));
            // ---- 7: "HTML"
            await follow('html-link', () => page.locator('a.obj_galley_link').filter({hasText: /^\s*HTML\s*$/}).first().click());
            // ---- 8: "PDF" and the reader's "Download" (control)
            await page.goto(app.url(`${ctx}/preprint/view/${URL_PATH}`)); await idle(page);
            await follow('pdf-link', () => page.locator('a.obj_galley_link').filter({hasText: /^\s*PDF\s*$/}).first().click());
            await sleep(2500);
            const dlHref = rel(await page.locator('a.download').first().getAttribute('href').catch(() => null));
            fact('readerDownloadHref', dlHref);
            await follow('reader-download', () => page.locator('a.download').first().click());
            // ---- 9: the "PDF" link's number address, typed
            await follow('pdf-number-address', goTo(`${ctx}/preprint/view/${SID}/${pdfGalley}`));
            // the HTML link's own number address (what the page's "HTML" passes through), typed
            await follow('html-download-number-address', goTo(`${ctx}/preprint/download/${SID}/${htmlGalley}`));
            // ---- 10: "Versions" › the first version (control), then its number address typed
            await page.goto(app.url(`${ctx}/preprint/view/${URL_PATH}`)); await idle(page);
            const vlinks = await page.locator('a[href*="/version/"]').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})));
            fact('versionLinks', vlinks.map((l) => ({text: l.text, href: rel(l.href)})));
            const older = page.locator(`a[href$="/version/${olderPub}"]`).first();
            await follow('versions-older', () => older.click());
            await follow('older-number-address', goTo(`${ctx}/preprint/view/${SID}/version/${olderPub}`));
        } else {
            // ---- Neighbour: submission 2, no URL Path; submission 3's older version's reader addresses
            const g2 = Number(sql(app, `select g.galley_id from publication_galleys g join publications p on p.publication_id = g.publication_id where p.submission_id = 2`));
            const f2 = Number(sql(app, `select submission_file_id from publication_galleys where galley_id = ${g2}`));
            const p2 = Number(sql(app, `select current_publication_id from submissions where submission_id = 2`));
            await follow('s2-number-address', goTo(`${ctx}/preprint/view/2`));
            await follow('s2-pdf-link', () => page.locator('a.obj_galley_link').filter({hasText: /^\s*PDF\s*$/}).first().click());
            await sleep(2500);
            fact('s2ReaderDownloadHref', rel(await page.locator('a.download').first().getAttribute('href').catch(() => null)));
            await follow('s2-reader-download', () => page.locator('a.download').first().click());
            await follow('s2-download-address', goTo(`${ctx}/preprint/download/2/${g2}`));
            await follow('s2-download-file-address', goTo(`${ctx}/preprint/download/2/${g2}/${f2}`));
            await follow('s2-own-version-address', goTo(`${ctx}/preprint/view/2/version/${p2}`));
            await follow('s2-unknown-galley', goTo(`${ctx}/preprint/view/2/999999`));
            await follow('s2-unknown-version', goTo(`${ctx}/preprint/view/2/version/999999`));
            const g3old = Number(sql(app, `select galley_id from publication_galleys where publication_id = ${olderPub}`));
            await follow('s3-older-version-page', goTo(`${ctx}/preprint/view/${SID}/version/${olderPub}`));
            await follow('s3-older-pdf', goTo(`${ctx}/preprint/view/${SID}/version/${olderPub}/${g3old}`));
            await follow('s3-older-download', goTo(`${ctx}/preprint/download/${SID}/version/${olderPub}/${g3old}`));
        }
        fact('consoleErrors', consoleLines.slice(0, 20));
    } finally {
        record(PHASE === 'walk' ? 'facts' : `facts-${PHASE}`, facts);
        await close();
    }
});
