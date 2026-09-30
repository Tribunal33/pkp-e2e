// Issue report walk: docs/issues/U36-A25-cancel-upload-after-sent-keeps-file.md
// (spec U36 register A25). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own context `publicknowledge`, as its own author account. The kit
// builds nothing; the steps create one new submission through the screens.
//
// Steps (OJS; OMP in brackets):
//   1  sign in as amwandenga (aclark)
//   2  "Make a Submission" at /index.php/publicknowledge/en/submission
//   3  title "u36r17 cancel", every checklist box, the first submission type
//      offered, "Begin Submission"; "Continue" until "Upload Files" is current
//   4  the developer tools' custom throttling profile "slow answer":
//      Download 1 kbit/s, Upload 100000 kbit/s, Latency 0. The walk sets the
//      same numbers through the DevTools protocol
//      (Network.emulateNetworkConditions: download 125 B/s, upload
//      12 500 000 B/s, latency 0), which is what the DevTools menu sends.
//   5  "Add File", u36r17-article.pdf; wait until the row's bar reads 100
//      while "Cancel upload" is still there
//   6  "Cancel upload"                              <- the fault
//   7  wait a minute (the slowed answer arrives meanwhile), "No throttling",
//      reload: the panel's rows
//   8  "Continue" until "Review": the files it lists
// NEIGHBOUR=1 adds the paths a fix must leave alone (walked with the fix in
// and out), on the same draft, back on "Upload Files":
//   N1 no throttling, "Add File", u36r17-kept.pdf: the upload finishes and
//      its row keeps the file
//   N2 upload throttled to 1 kbit/s (download unthrottled), "Add File",
//      u36r17-held.pdf, "Cancel upload" as soon as its row shows; 20 s
//      waited, with every upload and delete request recorded
//   N3 "No throttling", reload: the rows (u36r17-kept.pdf must stay,
//      u36r17-held.pdf must not be there)
// Every upload (POST .../files) and delete (X-Http-Method-Override: DELETE)
// the page sends is recorded with its outcome in the browser (answered or
// aborted), and the server's own access line for it (php -S logs the
// status once it has answered, whether or not the browser still listens).
//
// Reset first:  npm run fleet-prep -- --feature issues-r17 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-r17 PROBE_AGENT=r17 node bin/probe.js all shared/playwright/checks/issues/cancel-upload-after-sent-keeps-file/walk.js
//               (NEIGHBOUR=1 in front for the neighbour paths)
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r17-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r17-3_5 PROBE_AGENT=r17 node bin/probe.js all <this file>
// OPS has no such panel (its "Upload Files" step is the galley list).
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, outFile} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const NEIGHBOUR = !!process.env.NEIGHBOUR;

const AUTHOR = {ojs: 'amwandenga', omp: 'aclark'};
// DevTools' kbit/s in bytes per second, as its throttling menu converts them.
const KBIT = 1000 / 8;
const SLOW_ANSWER = {offline: false, latency: 0, downloadThroughput: 1 * KBIT, uploadThroughput: 100000 * KBIT};
const SLOW_UPLOAD = {offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: 1 * KBIT};
const NO_THROTTLE = {offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1};

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    if (!AUTHOR[app.name]) { fact('skipped', 'no submission files panel on this app'); record('facts', facts); return; }
    const ctx = app.contextPath;
    const logFile = path.resolve(__dirname, `../../../../../apps/${app.name}/playwright/.server-logs/server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch (e) { return 0; } };
    const logSince = (from, re) => {
        try {
            return fs.readFileSync(logFile).subarray(from).toString('utf8').split('\n')
                .filter((l) => re.test(l)).map((l) => l.replace(/^\[[^\]]+\] 127\.0\.0\.1:\d+ /, '').slice(0, 300)).slice(0, 12);
        } catch (e) { return [`(log unreadable: ${e.message})`]; }
    };
    const FILES_RE = /\/api\/v1\/submissions\/\d+\/files/;
    const serverFileLines = (from) => logSince(from, /\[\d{3}\]: (POST|GET) \S*\/api\/v1\/submissions\/\d+\/files/);
    const serverErrors = (from) => logSince(from, /error|exception|fatal|SQLSTATE/i);

    const {page, close} = await launch(app);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    const throttle = async (label, cond) => { await cdp.send('Network.emulateNetworkConditions', cond); fact(`throttle ${label}`, cond); };

    let n = 0;
    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        if (extra) Object.assign(s, extra);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    }

    // Every upload and delete of a submission file the page sends, with its fate in the browser.
    const reqs = [];
    const entry = (req) => reqs.find((x) => x.req === req);
    page.on('request', (req) => {
        if (req.method() !== 'POST' || !FILES_RE.test(req.url())) return;
        const override = req.headers()['x-http-method-override'] || null;
        if (override && override !== 'DELETE') return;
        reqs.push({req, at: Date.now(), kind: override ? 'delete' : 'upload', url: rel(req.url()), outcome: 'pending'});
    });
    page.on('requestfinished', async (req) => {
        const e = entry(req); if (!e) return;
        const r = await req.response().catch(() => null);
        e.outcome = r ? `answered ${r.status()}` : 'finished, no response';
        if (r) e.bytes = (await r.body().catch(() => Buffer.alloc(0))).length;
        try { const b = await r.json(); e.fileId = b.id ?? null; e.name = b.name ? Object.values(b.name)[0] : null; } catch (err) { /* not JSON */ }
    });
    page.on('requestfailed', (req) => { const e = entry(req); if (e) e.outcome = `failed in the browser: ${req.failure()?.errorText}`; });
    const reqsSince = (t0) => reqs.filter((x) => x.at >= t0).map(({req, at, ...x}) => ({...x, sentAfterMs: at - t0}));

    const panel = () => page.locator('.submissionFilesListPanel').first();
    const rowsRead = () => panel().locator('.listPanel__item').evaluateAll((els) => els.map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300))).catch(() => []);
    const panelText = () => panel().innerText().then((t) => flat(t, 600)).catch(() => null);
    const uploadRow = (name) => panel().locator('.fileUploadProgress').filter({hasText: name}).first();
    const current = () => page.locator('.pkpSteps__step__label--current').first().innerText().then((t) => flat(t, 60)).catch(() => '');
    const footerButton = (name) => page.locator('.submissionWizard__footer').getByRole('button', {name, exact: true});
    async function continueUntil(re) {
        for (let i = 0; i < 6 && !re.test(await current()); i++) {
            await footerButton('Continue').click();
            await idle(page); await pause(500);
        }
    }
    async function toUploadStep() {
        await continueUntil(/(^|\s)Upload Files$/);
        await panel().waitFor({timeout: T});
        await idle(page);
    }
    function makeFile(name, bytes) {
        const dir = outFile('files');
        fs.mkdirSync(dir, {recursive: true});
        const fp = path.join(dir, name);
        const head = `%PDF-1.4\n% ${name}\n`;
        fs.writeFileSync(fp, head + '%'.repeat(Math.max(0, bytes - head.length - 6)) + '\n%%EOF');
        return fp;
    }
    async function pick(fp) {
        const [chooser] = await Promise.all([page.waitForEvent('filechooser', {timeout: T}), panel().getByRole('button', {name: 'Add File', exact: true}).click()]);
        await chooser.setFiles(fp);
    }
    const barRead = (name) => uploadRow(name).locator('[role=progressbar]').getAttribute('aria-valuenow').catch(() => null);

    try {
        // 1
        await signIn(page, AUTHOR[app.name]);
        await idle(page);
        // 2
        await page.goto(app.url(`/index.php/${ctx}/en/submission`));
        await page.getByRole('button', {name: 'Begin Submission'}).waitFor({timeout: T});
        await idle(page);
        // 3
        const {waitForEditorReady} = require('../../../support/richtext.js');
        const tid = 'startSubmission-title-control';
        await page.locator(`#${tid}_ifr`).waitFor({state: 'visible', timeout: T});
        await waitForEditorReady(page, tid);
        await page.frameLocator(`#${tid}_ifr`).locator('body').click();
        await page.keyboard.type('u36r17 cancel');
        for (const box of await page.locator('main input[type=checkbox]:visible').all()) if (!(await box.isChecked())) await box.check();
        const radios = await page.locator('main input[type=radio]').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked})));
        for (const g of [...new Set(radios.map((r) => r.name))]) if (!radios.some((r) => r.name === g && r.checked)) await page.locator(`main input[type=radio][name="${g}"]`).first().check();
        await page.getByRole('button', {name: 'Begin Submission'}).click();
        await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
        fact('3 draft', Number(new URL(page.url()).searchParams.get('id')));
        await page.locator('.pkpSteps').waitFor({timeout: T}); await idle(page);
        fact('3 opened on', await current());
        await toUploadStep();
        fact('3 step', await current());
        await snap('upload-files-step');

        // 4
        await throttle('slow answer', SLOW_ANSWER);
        // 5
        const ART = 'u36r17-article.pdf';
        const artPath = makeFile(ART, 600);
        const t5 = Date.now();
        const log5 = logSize();
        await pick(artPath);
        await uploadRow(ART).waitFor({timeout: T});
        await page.waitForFunction((name) => {
            const row = [...document.querySelectorAll('.submissionFilesListPanel .fileUploadProgress')].find((r) => r.innerText.includes(name));
            return row && row.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow') === '100';
        }, ART, {timeout: T});
        await pause(1000);
        const before = {
            msSincePick: Date.now() - t5,
            bar: await barRead(ART),
            cancelShown: await uploadRow(ART).getByRole('button', {name: 'Cancel upload', exact: true}).isVisible(),
            nameIsLink: await panel().getByRole('link', {name: ART}).count(),
            requests: reqsSince(t5),
            serverLinesSoFar: serverFileLines(log5),
        };
        fact('5 bar full, before the cancel', before);
        await snap('bar-full');
        // 6
        await uploadRow(ART).getByRole('button', {name: 'Cancel upload', exact: true}).click();
        await pause(800);
        fact('6 after cancel', {rows: await rowsRead(), panel: await panelText(), requests: reqsSince(t5)});
        await snap('after-cancel');
        await pause(60_000);
        fact('7 a minute later', {files: serverFileLines(log5), errors: serverErrors(log5), requests: reqsSince(t5)});
        // 7
        await throttle('none', NO_THROTTLE);
        await page.reload(); await idle(page);
        await page.locator('.pkpSteps').waitFor({timeout: T});
        fact('7 reopened on', await current());
        await toUploadStep(); await pause(800);
        fact('7 reloaded rows', {rows: await rowsRead(), panel: await panelText()});
        await snap('reloaded');
        // 8
        await continueUntil(/(^|\s)Review$/);
        await idle(page); await pause(800);
        const review = await page.locator('.submissionWizard__reviewPanel, .submissionWizard__step').filter({hasText: /Upload Files|Files/}).first().innerText().then((t) => flat(t, 1200)).catch(() => null);
        fact('8 review', {step: await current(), filesSection: review, mentionsFile: (await page.locator('main').innerText()).includes(ART)});
        await snap('review');

        if (NEIGHBOUR) {
            const back = page.locator('.pkpSteps').getByRole('button', {name: /Upload Files/});
            await back.first().click();
            await idle(page); await panel().waitFor({timeout: T});
            fact('N0 back on', await current());
            // N1
            const KEPT = 'u36r17-kept.pdf';
            const tN1 = Date.now();
            await pick(makeFile(KEPT, 600));
            await panel().locator('.listPanel__item').filter({hasText: KEPT}).getByRole('button', {name: /^Edit/}).first().waitFor({timeout: 60_000});
            await idle(page); await pause(500);
            fact('N1 finished upload', {rows: await rowsRead(), requests: reqsSince(tN1)});
            await snap('n1-kept');
            // N2
            const HELD = 'u36r17-held.pdf';
            await throttle('slow upload', SLOW_UPLOAD);
            const tN2 = Date.now();
            const logN2 = logSize();
            await pick(makeFile(HELD, 600));
            await uploadRow(HELD).waitFor({timeout: T});
            const barN2 = await barRead(HELD);
            const linesAtCancel = serverFileLines(logN2);
            await uploadRow(HELD).getByRole('button', {name: 'Cancel upload', exact: true}).click();
            await pause(800);
            fact('N2 cancel while held', {barAtCancel: barN2, serverLinesAtCancel: linesAtCancel, rows: await rowsRead()});
            await snap('n2-after-cancel');
            await pause(20_000);
            fact('N2 20 s later', {rows: await rowsRead(), requests: reqsSince(tN2), serverFiles: serverFileLines(logN2), serverErrors: serverErrors(logN2)});
            // N3
            await throttle('none', NO_THROTTLE);
            await page.reload(); await idle(page);
            await page.locator('.pkpSteps').waitFor({timeout: T});
            await continueUntil(/(^|\s)Upload Files$/);
            if (!/(^|\s)Upload Files$/.test(await current())) { await back.first().click(); await idle(page); }
            await panel().waitFor({timeout: T}); await pause(800);
            const rowsN3 = await rowsRead();
            fact('N3 reloaded rows', {rows: rowsN3, kept: rowsN3.some((r) => r.includes(KEPT)), held: rowsN3.some((r) => r.includes(HELD)), cancelled: rowsN3.some((r) => r.includes(ART))});
            await snap('n3-reloaded');
        }
        fact('all requests', reqs.map(({req, at, ...x}) => x));
    } catch (err) {
        fact('ERROR', String(err.stack || err).slice(0, 1200));
        await snap('ERROR').catch(() => {});
        throw err;
    } finally {
        record('facts', facts);
        await close();
        fs.rmSync(outFile('files'), {recursive: true, force: true});
    }
});
