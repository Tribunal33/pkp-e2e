// Claim check U27 H19 (housekeeping 2026-10-19): Rule 15's sentence on what creates the files
// folder's `temp`, the folder "Download Review Form" › the XML entries need (A49). Driven on a
// dataset fleet (PKP's default test dataset as loaded has no `temp`; harness.md "Dataset
// fleets") as `dbarnes`, on the dataset's completed review (OJS submission 10, Aisla McCrae;
// OMP submission 16, Adela Gallego). OPS has no review stage.
//
// ORDER=sub (default)  XML press; a submission file uploaded through the workflow's "Submission
//                      Files" › "Upload" wizard (SubmissionFilesUploadForm, app()->get('file')->add);
//                      XML press; a Publisher Library file through "Add a file"
//                      (LibraryFileGridHandler::uploadFile, TemporaryFileManager::handleUpload);
//                      XML press.
// ORDER=lib            XML press; the library file; XML press; the submission file; XML press.
// The files folder is read for `temp` before the drive and after every step (right after the
// upload finished, after the window's OK/Complete, and after a reload of the list).
//
// Reset the fleet before each run (the drive starts from the dataset as loaded):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run, one app per call on `main`:
//   PROBE_FEATURE=<feature> PKP_E2E_DATASET=<n> PROBE_AGENT=<id> PROBE_RUN=<run> [ORDER=lib] \
//     node bin/probe.js ojs shared/playwright/checks/U27/H19/h19.js
// Facts: .reports/<feature>/<id>/h19-<order>-<run>-<app>.json, snapshots beside it.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, serverLog, outFile, sql} = require('../../../probe');

const ORDER = process.env.ORDER || 'sub';
const T = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

const CASES = {
    ojs: {id: 10, reviewer: 'Aisla McCrae', component: 'Article Text', library: 'Publisher Library'},
    omp: {id: 16, reviewer: 'Adela Gallego', component: 'Book Manuscript', library: 'Press Library'},
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { record(`h19-${ORDER}`, {skipped: `${app.name} has no review stage`}); return; }
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {PublisherLibraryTab} = require('../../../pages/LibraryPages.js');
    const {page, close} = await launch(app);
    const u = (p) => app.url(`/index.php/${app.contextPath}${p}`);
    const net = [];
    page.on('response', (r) => {
        if (/\/reviews\/|temporaryFiles|uploadFile|upload-file|fileUpload|\/files/.test(r.url())) {
            net.push({t: Date.now(), m: r.request().method(), s: r.status(), u: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 220), cd: r.headers()['content-disposition'] || null});
        }
    });
    const since = (t0) => net.filter((e) => e.t >= t0).map(({m, s, u: url, cd}) => `${m} ${s} ${url}${cd ? ` [${cd}]` : ''}`);
    const log = serverLog(app);
    const filesDir = (() => {
        const m = fs.readFileSync(app.configFile, 'utf8').match(/^files_dir\s*=\s*"?([^"\n]+?)"?\s*$/m);
        return m ? m[1] : null;
    })();
    const temp = () => {
        const dir = filesDir && path.join(filesDir, 'temp');
        if (!dir || !fs.existsSync(dir)) return {exists: false};
        return {exists: true, files: fs.readdirSync(dir).slice(0, 20)};
    };
    const tempRows = async () => {
        try { return (await sql(app, 'SELECT file_id, file_name, original_file_name, file_size FROM temporary_files ORDER BY file_id')).split('\n').filter(Boolean); }
        catch (e) { return [`(sql: ${flat(e.message, 120)})`]; }
    };
    const snap = async (label, extra) => {
        const s = await screen(page).catch((e) => ({error: flat(e.message)}));
        record(`h19-${ORDER}-${label}`, extra ? {...s, extra} : s);
        await shot(page, `h19-${ORDER}-${label}`).catch(() => {});
        return s;
    };
    const wfPage = new WorkflowPage(page, app.contextPath, app.name === 'omp' ? {labels: {reviewStage: 'External Review'}} : {});

    // --- "Download Review Form" › "Editor Form Shows All Review Sections (XML)" -------------
    const rd = () => page.getByRole('dialog', {name: /^Review( Details)?:/}).last();
    async function openReviewDetails() {
        await page.goto(u(`/dashboard/editorial?workflowSubmissionId=${c.id}`));
        await idle(page);
        const row = page.getByRole('table', {name: 'Reviewers', exact: true}).getByRole('row').filter({hasText: c.reviewer}).first();
        await row.waitFor({timeout: T});
        const read = row.getByRole('button', {name: 'Read Review', exact: true});
        if (await read.count()) await read.click();
        else {
            await row.getByRole('button', {name: /More Actions/}).first().click();
            await page.getByRole('menuitem', {name: 'Review Details', exact: true}).click();
        }
        await rd().waitFor({timeout: T});
        await page.waitForFunction(() => {
            const d = [...document.querySelectorAll('[role=dialog]')].filter((x) => /^Review( Details)?:/.test(x.getAttribute('aria-label') || '')).pop();
            return d && [...d.querySelectorAll('button')].some((x) => /Download Review Form/.test(x.textContent));
        }, null, {timeout: T}).catch(() => {});
        await idle(page);
    }
    async function xmlPress(label) {
        await openReviewDetails();
        await snap(`${label}-review-details`);
        const out = {tempBefore: temp()};
        const t0 = Date.now();
        const from = log.mark();
        await rd().getByRole('button', {name: /Download Review Form/}).first().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        out.items = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => flat(x, 80));
        const item = page.getByRole('menuitem').filter({hasText: /All Review Sections.*XML/i}).first();
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
            if (file) fs.writeFileSync(outFile(`h19-${ORDER}-${label}.xml`), fs.readFileSync(file));
            out.stillInWorkflow = await rd().isVisible().catch(() => false);
        } else {
            out.noFile = d && d.err;
            out.pageText = flat(await page.locator('body').innerText().catch(() => ''), 300);
            await snap(`${label}-no-file`);
        }
        out.requests = since(t0);
        out.serverLog = log.since(from).map((l) => flat(l, 300));
        out.tempAfter = temp();
        return out;
    }

    // --- a submission file: Submission stage › "Submission Files" › "Upload" ----------------
    async function submissionUpload(label) {
        const out = {tempBefore: temp()};
        const t0 = Date.now();
        const from = log.mark();
        const name = `h19-${ORDER}-${process.env.PROBE_RUN || 'r'}-${app.name}.pdf`;
        const file = outFile(name);
        fs.writeFileSync(file, '%PDF-1.4\n% cc19k H19 submission file\n%%EOF\n');
        await wfPage.gotoEditorial(c.id, {menuKey: 'workflow_1'});
        await idle(page);
        const list = () => page.getByRole('table', {name: 'Submission Files', exact: true});
        await list().waitFor({timeout: T});
        await snap(`${label}-submission-stage`);
        const wrap = page.locator('[role=dialog] div')
            .filter({has: page.getByRole('heading', {name: 'Submission Files', exact: true, level: 3})})
            .filter({has: page.getByRole('table', {name: 'Submission Files', exact: true})}).last();
        out.listButtons = (await wrap.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
        await wrap.getByRole('button', {name: 'Upload', exact: true}).click();
        const wiz = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
        await wiz.locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
        await idle(page);
        out.wizardTitle = flat(await wiz.getAttribute('aria-label').catch(() => null), 80);
        await snap(`${label}-wizard-step1`);
        const genre = wiz.locator('select[id^="genreId"]');
        if (await genre.count()) await genre.selectOption({label: c.component}).catch(async () => {
            const opts = await genre.locator('option').evaluateAll((els) => els.map((x) => x.value).filter(Boolean));
            await genre.selectOption(opts[0]);
        });
        await wiz.locator('input[type="file"]').first().setInputFiles(file);
        await page.waitForFunction(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find((x) => x.innerText.trim() === 'Continue' && x.getClientRects().length); return b && !b.disabled; }, null, {timeout: T});
        await idle(page);
        out.tempAfterUpload = temp();
        out.uploadRequests = since(t0);
        await snap(`${label}-wizard-uploaded`);
        const cont = wiz.getByRole('button', {name: 'Continue', exact: true});
        await cont.click(); await idle(page); await sleep(800);
        await cont.click(); await idle(page); await sleep(800);
        await snap(`${label}-wizard-step3`);
        await wiz.getByRole('button', {name: 'Complete', exact: true}).click(); await idle(page); await sleep(1500); await idle(page);
        out.tempAfterComplete = temp();
        out.listAfter = flat(await list().innerText().catch(() => null), 500);
        await snap(`${label}-list-after`);
        await page.reload(); await idle(page);
        await list().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        out.listAfterReload = flat(await list().innerText().catch(() => null), 500);
        out.listedAfterReload = out.listAfterReload.includes(name);
        await snap(`${label}-list-reload`);
        out.tempAfterReload = temp();
        out.requests = since(t0);
        out.serverLog = log.since(from).map((l) => flat(l, 300));
        return out;
    }

    // --- a Publisher Library file: Settings › Workflow › library tab › "Add a file" ----------
    async function libraryUpload(label) {
        const out = {tempBefore: temp()};
        const t0 = Date.now();
        const from = log.mark();
        const name = `h19-${ORDER}-${process.env.PROBE_RUN || 'r'}-${app.name}`;
        const file = outFile(`${name}.txt`);
        fs.writeFileSync(file, `${name}\n`);
        const tab = new PublisherLibraryTab(page, app.contextPath, c.library);
        await tab.goto();
        await idle(page);
        await snap(`${label}-library-tab`);
        const list = tab.list();
        const win = await list.openAdd();
        await snap(`${label}-add-a-file`);
        await win.nameBox().fill(name);
        out.typeOptions = await win.typeOptions();
        await win.chooseType(out.typeOptions.includes('Other') ? 'Other' : out.typeOptions.filter(Boolean)[0]);
        await win.upload(file);
        out.tempAfterUpload = temp();
        out.uploadRequests = since(t0);
        await snap(`${label}-add-a-file-uploaded`);
        await win.ok();
        await idle(page); await sleep(800);
        out.tempAfterOk = temp();
        out.listAfter = flat(await list.root().innerText().catch(() => null), 500);
        await snap(`${label}-library-after`);
        await page.reload(); await idle(page);
        await tab.select().catch(() => {});
        await idle(page);
        out.listAfterReload = flat(await list.root().innerText().catch(() => null), 500);
        out.listedAfterReload = out.listAfterReload.includes(name);
        await snap(`${label}-library-reload`);
        out.tempAfterReload = temp();
        out.requests = since(t0);
        out.serverLog = log.since(from).map((l) => flat(l, 300));
        return out;
    }

    const STEPS = ORDER === 'lib'
        ? [['xml', 'x1'], ['lib', 'l1'], ['xml', 'x2'], ['sub', 's1'], ['xml', 'x3']]
        : [['xml', 'x1'], ['sub', 's1'], ['xml', 'x2'], ['lib', 'l1'], ['xml', 'x3']];
    const o = {order: ORDER, filesDir, submission: c.id, reviewer: c.reviewer, tempAtStart: temp(), tempRowsAtStart: await tempRows(), steps: []};
    try {
        await signIn(page, 'dbarnes');
        let i = 0;
        for (const [kind, short] of STEPS) {
            i++;
            const label = `${i}-${short}`;
            const fn = {xml: xmlPress, sub: submissionUpload, lib: libraryUpload}[kind];
            const r = await fn(label).catch((e) => ({threw: flat(e.message, 600), tempNow: temp()}));
            r.step = `${label} ${kind}`;
            o.steps.push(r);
            console.log(`[h19 ${ORDER} ${app.name}] ${label} ${kind}`, JSON.stringify({
                file: r.file, noFile: r.noFile, threw: r.threw, page: r.pageText,
                temp: [r.tempBefore && r.tempBefore.exists, r.tempAfterUpload && r.tempAfterUpload.exists, (r.tempAfter || r.tempAfterReload || {}).exists],
                log: r.serverLog,
            }).slice(0, 1500));
        }
        o.tempAtEnd = temp();
        o.tempRowsAtEnd = await tempRows();
    } finally {
        record(`h19-${ORDER}`, o);
        await close();
    }
});
