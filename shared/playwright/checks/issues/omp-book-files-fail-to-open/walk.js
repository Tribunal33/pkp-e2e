// Issue report walk: docs/issues/U69-A9-omp-book-files-fail-to-open.md
// (spec U69 register A9; also U47 OMP1, U20 OMP6, U64 OMP3). Takes the
// report's Steps through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"): its press `publicknowledge`,
// its published book 14 "From Bricks to Brains" (format "PDF", free files),
// its manager `rvaca`. The kit builds nothing.
//   Reading a PDF, signed out: Catalog › the book › Chapter 1's "PDF" (chapter1.pdf; the PDF
//     view page and its viewer), the page's "Download", the address that
//     "Download" points to opened directly
//   A search engine's address, signed out: the book page's citation_pdf_url
//   A PDF with the viewer off: rvaca unticks "PDF.js PDF Viewer"; signed out,
//     Chapter 1's "PDF" again
//   Counting: the lines each step adds to the day's usage event log
//     ({files_dir}/usageStats/usageEventLogs/usage_events_YYYYMMDD.log)
//   Server log: the PHP lines each step adds to the fleet's server log
// OMP only (the book file surface exists on OMP alone). Records every
// screen with screen().
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset 1 --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=r5 node bin/probe.js omp shared/playwright/checks/issues/omp-book-files-fail-to-open/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature <feature-3_5> --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature-3_5> PROBE_AGENT=r5 node bin/probe.js omp shared/playwright/checks/issues/omp-book-files-fail-to-open/walk.js
// Facts: .reports/<feature>/r5/facts[-<run>]-omp.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const BOOK = 'From Bricks to Brains';
const CHAPTER = 'Chapter 1: Mind Control';   // its "PDF" link is chapter1.pdf (file 113)

function tail(file, filter, max = 500) {
    return {
        size: () => (fs.existsSync(file) ? fs.statSync(file).size : 0),
        since(off) {
            if (!fs.existsSync(file)) return [];
            const buf = fs.readFileSync(file).subarray(off).toString('utf8');
            return buf.split('\n').filter((l) => l && filter(l)).map((l) => l.slice(0, max)).slice(0, 20);
        },
    };
}

function usageLog(app) {
    const conf = fs.readFileSync(app.configFile, 'utf8');
    const dir = (conf.match(/^files_dir\s*=\s*"?([^"\n]+)"?/m) || [])[1];
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const f = path.join(dir.trim(), 'usageStats/usageEventLogs', `usage_events_${ymd}.log`);
    // Each line is a JSON record; keep what tells the events apart.
    const t = tail(f, () => true, 100_000);
    return {
        f,
        size: t.size,
        since: (off) => t.since(off).map((l) => {
            try {
                const j = JSON.parse(l);
                return {assocType: j.assocType, canonicalUrl: j.canonicalUrl, submissionId: j.submissionId,
                    representationId: j.representationId, submissionFileId: j.submissionFileId, chapterId: j.chapterId};
            } catch (e) {
                return l;
            }
        }),
    };
}

forEachApp(async (app) => {
    if (app.name !== 'omp') {
        console.log(`[${app.name}] no book files on this app: skipped`);
        return;
    }
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null});
    const ctx = app.contextPath;
    const cu = (p) => app.url(`/index.php/${ctx}/en${p}`);
    const slog = tail(path.join(__dirname, '../../../../../apps', app.name, 'playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`),
        (l) => /PHP|Fatal|Exception|\[500\]/.test(l));
    const ulog = usageLog(app);
    fact('usage log', ulog.f.replace(/^.*\/checkouts\//, 'checkouts/'));
    let n = 0;
    let page;
    const snap = async (name) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, s); await shot(page, `${String(n).padStart(2, '0')}-${name}`); return s; };
    const mark = () => ({s: slog.size(), u: ulog.size()});
    const logsSince = (m) => ({server: slog.since(m.s), usage: ulog.since(m.u)});

    // A response listener: the status and headers of each document or file
    // answer the page gets (download addresses included).
    const answers = [];
    const listen = (p) => p.on('response', async (r) => {
        const u = r.url();
        if (/\/catalog\/(view|download|book)\//.test(u) || r.request().resourceType() === 'document') {
            const h = r.headers();
            answers.push({url: u.replace(/^https?:\/\/[^/]+/, ''), status: r.status(), type: h['content-type'] || null,
                disposition: h['content-disposition'] || null, length: h['content-length'] || null});
        }
    });
    const answersSince = (i) => answers.slice(i);

    // Opens the book from the Catalog and returns Chapter 1's "PDF" link.
    const openBook = async () => {
        await page.goto(cu('/catalog'));
        await idle(page);
        await page.getByRole('link', {name: new RegExp(BOOK)}).first().click();
        await page.waitForURL(/\/catalog\/book\//, {timeout: T});
        await idle(page);
        return page.locator('li').filter({hasText: CHAPTER}).last().getByRole('link', {name: 'PDF', exact: true}).first();
    };

    const s1 = await launch(app);
    page = s1.page; listen(page);
    try {
        // Reading a PDF, signed out. 1. Catalog › the book.
        let m = mark(); let a = answers.length;
        const link = await openBook();
        const book = await snap('book-page');
        const meta = await page.locator('meta[name="citation_pdf_url"]').evaluateAll((els) => els.map((e) => e.getAttribute('content')));
        fact('1 book page', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), h1: await page.locator('h1').first().innerText().catch(() => null),
            fileLinks: await page.locator('a.cmp_download_link').evaluateAll((els) => els.map((e) => `${e.innerText.trim()} -> ${e.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')}`)),
            citation_pdf_url: meta.map((u) => u.replace(/^https?:\/\/[^/]+/, '')), logs: logsSince(m)});

        // 2. Press Chapter 1's "PDF": the PDF view page and its viewer.
        m = mark(); a = answers.length;
        await link.click();
        await page.waitForURL(/\/catalog\/view\//, {timeout: T});
        await idle(page);
        const frame = page.frameLocator('iframe').first();
        let viewer = {};
        for (let i = 0; i < 30; i++) {
            await pause(500);
            viewer = {
                errorBar: await frame.locator('#errorWrapper').isVisible().catch(() => false)
                    ? await frame.locator('#errorMessage').innerText().catch(() => null) : null,
                numPages: await frame.locator('#numPages').innerText().catch(() => null),
                pagesRendered: await frame.locator('.page canvas, .page .canvasWrapper').count().catch(() => 0),
            };
            if (viewer.errorBar || (viewer.numPages && !/of 0\b/.test(viewer.numPages) && viewer.pagesRendered)) break;
        }
        const moreInfo = await frame.locator('#errorMoreInfo').inputValue().catch(() => null);
        await snap('pdf-view-page');
        fact('2 view page', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title(), viewer, moreInfo,
            answers: answersSince(a), logs: logsSince(m)});

        // 3. Press "Download" in the page's top bar.
        m = mark(); a = answers.length;
        const dl = page.locator('header a.download').first();
        const dlHref = (await dl.getAttribute('href')) || '';
        const dlEvent = page.waitForEvent('download', {timeout: 15_000}).catch(() => null);
        await dl.click();
        const d = await dlEvent;
        let dlFact = {href: dlHref.replace(/^https?:\/\/[^/]+/, ''), downloadEvent: !!d};
        if (d) {
            dlFact.suggestedFilename = d.suggestedFilename();
            dlFact.failure = await d.failure();
            if (!dlFact.failure) dlFact.size = fs.statSync(await d.path()).size;
        }
        await pause(1000);
        dlFact.urlAfter = page.url().replace(/^https?:\/\/[^/]+/, '');
        await snap('after-download');
        fact('3 Download pressed', {...dlFact, answers: answersSince(a), logs: logsSince(m)});

        // 4. The address "Download" points to, opened directly.
        const openAddress = async (label, url) => {
            m = mark(); a = answers.length;
            let err = null;
            const dEv = page.waitForEvent('download', {timeout: 8000}).catch(() => null);
            try {
                await page.goto(url, {timeout: T});
            } catch (e) {
                err = e.message.split('\n')[0];
            }
            const dd = await dEv;
            await pause(500);
            const body = await page.locator('body').innerText({timeout: 3000}).catch(() => null);
            await snap(label);
            fact(label, {url: url.replace(/^https?:\/\/[^/]+/, ''), gotoError: err, download: dd ? {name: dd.suggestedFilename(), failure: await dd.failure()} : null,
                pageUrl: page.url().replace(/^https?:\/\/[^/]+/, ''), bodyText: body === null ? null : body.slice(0, 200),
                answers: answersSince(a), logs: logsSince(m)});
        };
        await openAddress('4 download address opened', new URL(dlHref, page.url()).toString());

        // 5. The book page's citation_pdf_url, opened directly.
        if (meta.length) await openAddress('5 citation_pdf_url opened', meta[0]);
        else fact('5 citation_pdf_url opened', 'the book page carries no citation_pdf_url');
    } finally {
        await s1.close();
    }

    // A PDF with the viewer off. 6. rvaca unticks "PDF.js PDF Viewer".
    const s2 = await launch(app);
    page = s2.page; listen(page);
    try {
        await signIn(page, 'rvaca');
        await page.goto(cu('/management/settings/website'));
        await idle(page);
        await page.locator('#plugins-button').first().click();
        const row = page.locator('tr.gridRow').filter({hasText: 'PDF.js PDF Viewer'}).first();
        await row.waitFor({timeout: T});
        const box = row.locator('input[type="checkbox"]').first();
        fact('6 plugin ticked before', await box.isChecked());
        await box.click();
        const dlg = page.locator('[role="dialog"]').filter({hasText: /disable/i}).last();
        await dlg.waitFor({timeout: T});
        const dlgText = (await dlg.innerText()).replace(/\s+/g, ' ').trim();
        await dlg.getByRole('button', {name: /^(OK|Disable|Yes)$/}).first().click();
        await idle(page); await pause(800);
        await snap('plugins-after-untick');
        fact('6 plugin unticked', {dialog: dlgText.slice(0, 200),
            ticked: await page.locator('tr.gridRow').filter({hasText: 'PDF.js PDF Viewer'}).first().locator('input[type="checkbox"]').first().isChecked()});
        await signOut(page);

        // 7. Signed out, Chapter 1's "PDF" again.
        let m = mark(); let a = answers.length;
        const link = await openBook();
        const dEv = page.waitForEvent('download', {timeout: 8000}).catch(() => null);
        let err = null;
        await link.click();
        await page.waitForURL(/\/catalog\/view\//, {timeout: T}).catch((e) => { err = e.message.split('\n')[0]; });
        const dd = await dEv;
        await pause(800);
        const body = await page.locator('body').innerText({timeout: 3000}).catch(() => null);
        await snap('viewer-off-file-pressed');
        fact('7 viewer off, Chapter 1 PDF pressed', {pageUrl: page.url().replace(/^https?:\/\/[^/]+/, ''), waitError: err,
            download: dd ? {name: dd.suggestedFilename(), failure: await dd.failure()} : null,
            bodyText: body === null ? null : body.slice(0, 200), answers: answersSince(a), logs: logsSince(m)});
    } finally {
        record('facts', facts);
        await s2.close();
    }
});
