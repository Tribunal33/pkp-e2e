// Issue report walk: docs/issues/U36-A21-upload-over-request-limit-server-error.md
// (spec U36 register A21, U47 A4). Takes the report's Steps through the
// screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), on its own context `publicknowledge`, as its own users. The kit
// builds nothing; the files chosen are local files of the sizes the steps
// name, sized from the PHP limits the fleet's server runs under
// (upload_max_filesize U, post_max_size P; read with the same `php` and
// environment the server was started with).
//
// PART=media (OJS, OMP, OPS; U47 A4): dbarnes opens the dataset submission's
//   "Media", "Add Media File", "Click to upload files", and chooses
//     M1  a file 1 MiB larger than P       (the fault: over post_max_size)
//     M2  a file 1 MiB larger than U, when that is still under P (control:
//         over upload_max_filesize only)
// PART=panel (OJS, OMP; U36 A21): the dataset author starts a new submission
//   ("New Submission", title "u36r6 upload limit", "Begin Submission",
//   "Continue" to "Upload Files"), then "Add File" with
//     F1  a file of exactly U bytes
//     F2  a file 1 MiB larger than U (control: refused in the browser)
//   and reopens the draft to read what was stored.
// Unset PART runs both. Each upload's request is recorded with its status,
// content type and the first 300 characters of the body the browser got.
//
// Limits: the fleet runs on the machine's PHP (U 2M, P 8M, PHP's shipped
// values), where F1 is stored. A21 needs P <= U, which the steps set on the
// install's PHP; here, the dataset fleet's server is restarted with an extra
// ini directory (the servers pass the environment through):
//   mkdir -p .reports/issues-r6/php-eq && printf 'upload_max_filesize=4M\npost_max_size=4M\n' > .reports/issues-r6/php-eq/zz.ini
//   npm run probe-servers -- --stop --dataset 2
//   PHP_INI_SCAN_DIR=:$PWD/.reports/issues-r6/php-eq npm run probe-servers -- --start --dataset 2
//   PHP_INI_SCAN_DIR=:$PWD/.reports/issues-r6/php-eq PART=panel PROBE_RUN=eq PROBE_FEATURE=issues-r6 PROBE_AGENT=r6 node bin/probe.js all <this file>
//
// Neighbour check (the fix must reach no further): the same script on PHP's
// shipped limits (U 2M, P 8M), with the fix in and out: F1 (exactly U) is
// stored, M2 (over U, under P) keeps its 400 "Files larger than 2MB can not be
// uploaded.", F2 is refused in the browser as before.
// Fix trial:    node bin/try-fix.js apply shared/playwright/checks/issues/upload-over-request-limit-server-error/fix.diff ojs omp ops
//               (reset, the runs above with PROBE_RUN=fixeq / fixstock), then node bin/try-fix.js revert ojs omp ops
// Step 2 of the panel steps ("Start A New Submission") is taken by opening its
// address, /index.php/publicknowledge/en/submission.
//
// Reset first:  npm run fleet-prep -- --feature issues-r6 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-r6 PROBE_AGENT=r6 node bin/probe.js all shared/playwright/checks/issues/upload-over-request-limit-server-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r6-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r6-3_5 PROBE_AGENT=r6 node bin/probe.js all <this file>
const fs = require('fs');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, idle, outFile} = require('../../../probe');

const T = 30_000;
const MiB = 1024 * 1024;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const PART = process.env.PART || 'all';

// The dataset's submission for the media steps, and its author for the panel steps.
const MEDIA_SUB = {ojs: 5, omp: 4, ops: 1};
const AUTHOR = {ojs: 'ccorino', omp: 'aclark'};

function bytes(v) {
    const m = String(v).trim().match(/^(\d+)\s*([KMG]?)/i);
    if (!m) return null;
    return Number(m[1]) * ({'': 1, K: 1024, M: MiB, G: 1024 * MiB})[m[2].toUpperCase()];
}
function limits() {
    const out = execFileSync('php', ['-r', 'echo ini_get("upload_max_filesize"), "|", ini_get("post_max_size");'], {encoding: 'utf8'});
    const [u, p] = out.split('|');
    return {upload_max_filesize: u, post_max_size: p, U: bytes(u), P: bytes(p)};
}
function mkFile(name, size) {
    const dir = outFile('files'); // one folder per app and run, the file keeps its own name
    fs.mkdirSync(dir, {recursive: true});
    const fp = require('path').join(dir, name);
    const fd = fs.openSync(fp, 'w');
    fs.ftruncateSync(fd, size);
    fs.closeSync(fd);
    return fp;
}

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const ctx = app.contextPath;
    const L = limits();
    fact('php limits', L);
    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        if (extra) Object.assign(s, extra);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    }
    // Every upload request the page sends, with what came back.
    const uploads = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (r.request().method() !== 'POST' || !/\/api\/v1\/(temporaryFiles|submissions\/\d+\/files)\b/.test(u)) return;
        let body = null;
        try { body = flat(await r.text(), 300); } catch (e) { body = `(unreadable: ${String(e.message).slice(0, 80)})`; }
        uploads.push({at: Date.now(), url: rel(u), status: r.status(), contentType: r.headers()['content-type'] || null, body,
            requestLength: Number(r.request().headers()['content-length'] || 0) || null});
    });
    const uploadsSince = (t0) => uploads.filter((x) => x.at >= t0).map(({at, ...x}) => x);
    const vis = '[role="dialog"]:visible';
    const wf = () => page.locator(vis).first();

    try {
        // ================================================================ Media (U47 A4)
        if (PART === 'all' || PART === 'media') {
            const id = MEDIA_SUB[app.name];
            // 1
            await signIn(page, 'dbarnes');
            // 2
            await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${id}`));
            await idle(page);
            await wf().waitFor({timeout: T});
            await idle(page);
            fact('M2 workflow heading', flat(await wf().locator('h1, h2').first().innerText().catch(() => null), 200));
            // 3
            await wf().getByRole('link', {name: 'Media', exact: true}).or(wf().getByRole('button', {name: 'Media', exact: true})).first().click();
            await idle(page); await pause(600);
            await page.getByRole('button', {name: 'Add Media File', exact: true}).waitFor({timeout: T});
            await snap('media-page');
            const uploadWin = () => page.getByRole('dialog').filter({hasText: 'Upload Media File'}).last();
            const cards = () => uploadWin().locator('div.mb-4.rounded.bg-tertiary');
            const cardsRead = () => cards().evaluateAll((els) => els.map((c) => ({
                text: (c.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300),
                errors: [...c.querySelectorAll('.pkpFieldError__message, [class*="rror"]')].map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
                selects: c.querySelectorAll('select').length,
            })));
            async function tryFile(label, name, size) {
                // 4
                await page.getByRole('button', {name: 'Add Media File', exact: true}).click();
                await uploadWin().waitFor({timeout: T}); await idle(page); await pause(400);
                const fp = mkFile(name, size);
                const t0 = Date.now();
                const chooserP = page.waitForEvent('filechooser', {timeout: T});
                await uploadWin().getByRole('button', {name: 'Click to upload files', exact: true}).click();
                // 5
                await (await chooserP).setFiles(fp);
                const until = Date.now() + 90_000;
                let c = [];
                while (Date.now() < until) {
                    c = await cardsRead().catch(() => []);
                    if (c.length && c.every((x) => x.selects || x.errors.length)) break;
                    await pause(500);
                }
                await idle(page);
                const upBtn = uploadWin().getByRole('button', {name: 'Upload Files', exact: true});
                const res = {file: name, size, cards: await cardsRead().catch(() => []), uploadFilesDisabled: await upBtn.isDisabled().catch(() => null), requests: uploadsSince(t0)};
                fact(label, res);
                await snap(`media-${label}`, res);
                // leave the window without adding anything
                await uploadWin().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                await pause(700);
                const warn = page.locator('[role=dialog]:visible, [role=alertdialog]:visible').filter({has: page.getByRole('button', {name: 'Yes', exact: true})}).last();
                if (await warn.isVisible().catch(() => false)) await warn.getByRole('button', {name: 'Yes', exact: true}).click();
                await uploadWin().waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
                await idle(page); await pause(500);
            }
            await tryFile('M1 over post_max_size', 'u36r6-over-post.png', L.P + MiB);
            if (L.U + MiB < L.P) await tryFile('M2 over upload_max_filesize only', 'u36r6-over-upload.png', L.U + MiB);
            else fact('M2 over upload_max_filesize only', 'skipped: U + 1 MiB is not under P on this PHP');
        }

        // ================================================================ Files panel (U36 A21)
        if ((PART === 'all' || PART === 'panel') && AUTHOR[app.name]) {
            // 1
            await signIn(page, AUTHOR[app.name]);
            await idle(page);
            // 2
            const newSub = page.getByRole('link', {name: 'New Submission', exact: true}).or(page.getByRole('button', {name: 'New Submission', exact: true})).first();
            if (await newSub.isVisible().catch(() => false)) await newSub.click();
            else { fact('P2 note', 'no "New Submission" on the landing page; opened /submission'); await page.goto(app.url(`/index.php/${ctx}/en/submission`)); }
            await page.getByRole('button', {name: 'Begin Submission'}).waitFor({timeout: T});
            await idle(page);
            const {waitForEditorReady} = require('../../../support/richtext.js');
            const tid = 'startSubmission-title-control';
            await page.locator(`#${tid}_ifr`).waitFor({state: 'visible', timeout: T});
            await waitForEditorReady(page, tid);
            await page.frameLocator(`#${tid}_ifr`).locator('body').click();
            await page.keyboard.type('u36r6 upload limit');
            for (const box of await page.locator('main input[type=checkbox]:visible').all()) if (!(await box.isChecked())) await box.check();
            const radios = await page.locator('main input[type=radio]').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked})));
            for (const g of [...new Set(radios.map((r) => r.name))]) if (!radios.some((r) => r.name === g && r.checked)) await page.locator(`main input[type=radio][name="${g}"]`).first().check();
            await snap('start-filled');
            await page.getByRole('button', {name: 'Begin Submission'}).click();
            await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
            const subId = Number(new URL(page.url()).searchParams.get('id'));
            fact('P2 draft', subId);
            await page.locator('.pkpSteps').waitFor({timeout: T}); await idle(page);
            // 3
            const current = () => page.locator('.pkpSteps__step__label--current').first().innerText().then((t) => flat(t, 60)).catch(() => '');
            for (let i = 0; i < 3 && !/Upload Files/.test(await current()); i++) {
                await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click();
                await idle(page); await pause(500);
            }
            const panel = () => page.locator('.submissionFilesListPanel').first();
            await panel().waitFor({timeout: T});
            fact('P3 step', await current());
            const rowsRead = () => panel().locator('.listPanel__item--submissionFile').evaluateAll((els) => els.map((r) => ({
                text: (r.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300),
                stored: !!r.querySelector('.listPanel__item--submissionFile__link'),
            }))).catch(() => []);
            await snap('upload-files-step');
            async function tryFile(label, name, size) {
                // 4
                const fp = mkFile(name, size);
                const t0 = Date.now();
                const [chooser] = await Promise.all([page.waitForEvent('filechooser', {timeout: T}), panel().getByRole('button', {name: 'Add File', exact: true}).click()]);
                await chooser.setFiles(fp);
                const until = Date.now() + 90_000;
                let r;
                while (Date.now() < until) {
                    r = (await rowsRead()).find((x) => x.text.includes(name));
                    if (r && (r.stored || /too big|Invalid JSON|error|rror/i.test(r.text))) break;
                    await pause(500);
                }
                await idle(page);
                const res = {file: name, size, row: (await rowsRead()).filter((x) => x.text.includes(name)), requests: uploadsSince(t0)};
                fact(label, res);
                await snap(`panel-${label}`, res);
            }
            await tryFile('F1 exactly upload_max_filesize', 'u36r6-at-limit.pdf', L.U);
            await tryFile('F2 1 MiB over upload_max_filesize', 'u36r6-over-limit.pdf', L.U + MiB);
            // what was stored: the draft reopened
            await page.reload(); await idle(page);
            for (let i = 0; i < 3 && !/Upload Files/.test(await current()); i++) {
                await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click();
                await idle(page); await pause(500);
            }
            await panel().waitFor({timeout: T}).catch(() => {});
            await idle(page); await pause(800);
            fact('P5 draft reopened: rows', await rowsRead());
            await snap('panel-reopened');
        }
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
