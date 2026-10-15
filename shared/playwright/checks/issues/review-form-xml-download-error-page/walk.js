// Issue walk: U27 A49, "Download Review Form" › the XML entries lead to an error page and no file on an
// install where nothing has written the files folder's `temp` folder yet (PKP's default test dataset as
// loaded). Driven on a dataset fleet (harness.md "Dataset fleets") as `dbarnes`, on a completed review:
// OJS submission 10, Aisla McCrae; OMP submission 16, Adela Gallego. OPS has no review stage.
//
//   MODE=steps (default)  the report's Steps: All Sections XML, Author-Only XML, All Sections PDF,
//                         All Sections XML. The window is reopened when a press left the workflow.
//   MODE=nb               the neighbour: PDF first, then All Sections XML and Author-Only XML (the path
//                         that already works and that the fix must leave as it is; each XML is kept,
//                         with its sha256, to compare fix in and out).
// The files folder is read for `temp` before and after every press (evidence only).
//
// Reset the fleet before each run (the steps start from a freshly loaded dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run, one app per call on `main`:
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<run>] [MODE=nb] \
//     node bin/probe.js ojs shared/playwright/checks/issues/review-form-xml-download-error-page/walk.js
// Facts: .reports/<feature>/<id>/xmldl-<mode>[-<run>]-<app>.json, snapshots and downloads beside them.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {forEachApp, launch, signIn, screen, shot, record, idle, serverLog, outFile} = require('../../../probe');

const MODE = process.env.MODE || 'steps';
const T = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

const CASES = {
    ojs: {id: 10, reviewer: 'Aisla McCrae'},
    omp: {id: 16, reviewer: 'Adela Gallego'},
};
const SEQ = {
    steps: ['allXml', 'authorXml', 'allPdf', 'allXml'],
    nb: ['allPdf', 'allXml', 'authorXml'],
};
const KINDS = {
    allXml: /All Review Sections.*XML/i,
    allPdf: /All Review Sections.*PDF/i,
    authorXml: /Author-Only.*XML/i,
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { record(`xmldl-${MODE}`, {skipped: `${app.name} has no review stage`}); return; }
    const {page, close} = await launch(app);
    const u = (p) => app.url(`/index.php/${app.contextPath}${p}`);
    const net = [];
    page.on('response', (r) => {
        if (/\/reviews\//.test(r.url())) net.push({t: Date.now(), m: r.request().method(), s: r.status(), u: r.url().replace(/^https?:\/\/[^/]+/, ''), cd: r.headers()['content-disposition'] || null});
    });
    const since = (t0) => net.filter((e) => e.t >= t0).map(({m, s, u: url, cd}) => `${m} ${s} ${url}${cd ? ` [${cd}]` : ''}`);
    const log = serverLog(app);
    const filesDir = (() => {
        const m = fs.readFileSync(app.configFile, 'utf8').match(/^files_dir\s*=\s*"?([^"\n]+?)"?\s*$/m);
        return m ? m[1] : null;
    })();
    const tempState = () => {
        const dir = filesDir && path.join(filesDir, 'temp');
        if (!dir || !fs.existsSync(dir)) return {exists: false};
        return {exists: true, files: fs.readdirSync(dir).slice(0, 20)};
    };
    const snap = async (label) => {
        const s = await screen(page).catch((e) => ({error: flat(e.message)}));
        record(`xmldl-${label}`, s);
        await shot(page, `xmldl-${label}`).catch(() => {});
        return s;
    };

    const wf = () => page.locator('[role="dialog"]:visible').first();
    const rd = () => page.getByRole('dialog', {name: /^Review( Details)?:/}).last();
    async function openWorkflow() {
        // the address the dashboard's "View" opens
        await page.goto(u(`/dashboard/editorial?workflowSubmissionId=${c.id}`));
        await idle(page);
        await wf().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    }
    async function openReviewDetails() {
        const row = page.getByRole('table', {name: 'Reviewers', exact: true}).getByRole('row').filter({hasText: c.reviewer}).first();
        await row.waitFor({timeout: T}).catch(() => {});
        const read = row.getByRole('button', {name: 'Read Review', exact: true});
        let via = 'Read Review';
        if (await read.count()) await read.click();
        else {
            via = 'More Actions › Review Details';
            await row.getByRole('button', {name: /More Actions/}).first().click();
            await page.getByRole('menuitem', {name: 'Review Details', exact: true}).click();
        }
        await rd().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => {
            const d = [...document.querySelectorAll('[role=dialog]')].filter((x) => /^Review( Details)?:/.test(x.getAttribute('aria-label') || '')).pop();
            return d && [...d.querySelectorAll('button')].some((x) => /Download Review Form/.test(x.textContent));
        }, null, {timeout: T}).catch(() => {});
        await idle(page);
        return via;
    }
    async function press(kind, label) {
        const out = {kind, tempBefore: tempState()};
        const t0 = Date.now();
        const from = log.mark();
        const btn = rd().getByRole('button', {name: /Download Review Form/});
        await btn.first().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        out.items = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => flat(x, 80));
        const item = page.getByRole('menuitem').filter({hasText: KINDS[kind]}).first();
        out.pressed = flat(await item.innerText({timeout: 5000}).catch(() => '(none)'), 80);
        const arrived = page.waitForEvent('download', {timeout: 15000}).catch((e) => ({err: flat(e.message, 100)}));
        await item.click({timeout: 5000}).catch((e) => { out.itemClick = flat(e.message, 160); });
        const d = await arrived;
        await sleep(1500);
        out.urlAfter = page.url().replace(/^https?:\/\/[^/]+/, '');
        if (d && !d.err) {
            const file = await d.path().catch(() => null);
            out.file = d.suggestedFilename();
            out.bytes = file ? fs.statSync(file).size : null;
            if (file) {
                const buf = fs.readFileSync(file);
                fs.writeFileSync(outFile(`xmldl-${label}${path.extname(out.file) || ''}`), buf);
                if (/\.xml$/i.test(out.file)) {
                    out.sha256 = crypto.createHash('sha256').update(buf).digest('hex');
                    out.xmlHead = flat(buf.toString('utf8'), 200);
                    out.anonymous = /<anonymous\s*\/>/.test(buf.toString('utf8'));
                }
            }
            out.stillInWorkflow = await rd().isVisible().catch(() => false);
        } else {
            out.noFile = d && d.err;
            out.pageText = flat(await page.locator('body').innerText().catch(() => ''), 300);
            await snap(`${label}-no-file`);
        }
        out.requests = since(t0);
        out.serverLog = log.since(from).map((l) => flat(l, 300));
        out.tempAfter = tempState();
        return out;
    }

    const o = {mode: MODE, filesDir, submission: c.id, reviewer: c.reviewer, tempAtStart: tempState(), presses: []};
    try {
        await signIn(page, 'dbarnes');
        await openWorkflow();
        await snap(`${MODE}-workflow`);
        o.openedVia = await openReviewDetails();
        const s = await snap(`${MODE}-review-details`);
        o.windowText = flat(s.text && s.text.dialog, 800);
        let i = 0;
        for (const kind of SEQ[MODE]) {
            i++;
            if (!(await rd().isVisible().catch(() => false))) {
                // the previous press left the workflow: back to it, and the window again
                await openWorkflow();
                await openReviewDetails();
            } else if (await page.getByRole('menuitem').first().isVisible().catch(() => false)) {
                await page.keyboard.press('Escape').catch(() => {});
                await idle(page);
            }
            const r = await press(kind, `${MODE}-${i}-${kind}`).catch((e) => ({kind, threw: flat(e.message)}));
            o.presses.push(r);
            console.log(`[xmldl ${MODE} ${app.name}] ${i} ${kind}`, JSON.stringify({file: r.file, noFile: r.noFile, urlAfter: r.urlAfter, requests: r.requests, page: r.pageText, log: r.serverLog, temp: [r.tempBefore && r.tempBefore.exists, r.tempAfter && r.tempAfter.exists]}).slice(0, 1500));
        }
        o.tempAtEnd = tempState();
    } finally {
        record(`xmldl-${MODE}`, o);
        await close();
    }
});
