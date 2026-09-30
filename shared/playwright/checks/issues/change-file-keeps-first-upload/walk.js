// Issue report walk: docs/issues/U36-A14-change-file-keeps-first-upload.md
// (spec U36 register A14). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own context `publicknowledge`, as `dbarnes`. The kit builds
// nothing; the steps create files (and, on OPS, one galley) through the
// screens. The database is read (sql) only to record what was stored.
//
// Steps, OJS and OMP (OMP in brackets): "Uploading a new file"
//   1  sign in as dbarnes
//   2  open submission 4 (OMP 8, "Editorial") in its workflow
//   3  "Submission Files" › "Upload": "Upload Submission File", "1. Upload File"
//   4  component "Article Text" ("Book Manuscript"), not a revision,
//      pick u36r16-first.pdf, wait for the upload
//   5  "Change File": pick u36r16-second.pdf, wait              <- the fault
//   6  "Continue", "Continue", "Complete"
//   7  read "Submission Files"
// Steps, a galley's first file (OPS always; OJS with PATH_GROUP=galley, on
// submission 5 "Genetic transformation of forest trees"):
//   1  sign in as dbarnes
//   2  the submission's "Galleys" page, from the side menu
//   3  "Add galley", label u36r16, "Save": the upload window opens
//   4  "Preprint Text" / "Article Text", u36r16-first.pdf; "Change File",
//      u36r16-second.pdf
//   5  "Continue", "Continue", "Complete"; read the galley list, which file
//      the galley points at, and whether each pick is still stored (row and
//      file on disk)
// NEIGHBOUR=1 adds the paths a fix must leave alone, walked with the fix in
// and out:
//   N1 (OJS, OMP files path) "Upload", revise the dataset's file,
//      u36r16-rev-one.pdf, "Change File" u36r16-rev-two.pdf, "Continue",
//      "Continue", "Complete": the file keeps its row and number and its
//      original upload; which picks stayed among its revisions is recorded.
//   N2 (galley path) a second new galley u36r16c, one pick, then "Cancel".
// Every request the "Change File" and "Cancel" paths send
// (manage-file-api delete-file / cancel-file-upload) is recorded with what
// it posted and what came back.
//
// Reset first:  npm run fleet-prep -- --feature issues-r16 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-r16 PROBE_AGENT=r16 node bin/probe.js all shared/playwright/checks/issues/change-file-keeps-first-upload/walk.js
//               (NEIGHBOUR=1 in front for the neighbour paths; PATH_GROUP=galley for OJS's galley)
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r16-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r16-3_5 PROBE_AGENT=r16 node bin/probe.js all <this file>
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, outFile, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const NEIGHBOUR = !!process.env.NEIGHBOUR;
// PATH_GROUP=galley takes the galley group on OJS too (OPS always takes it).
const GALLEY_PATH = process.env.PATH_GROUP === 'galley';

const SUBMISSION = {ojs: GALLEY_PATH ? 5 : 4, omp: 8, ops: 1};
const GENRE = {ojs: 'Article Text', omp: 'Book Manuscript', ops: 'Preprint Text'};

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const ctx = app.contextPath;
    const sid = SUBMISSION[app.name];
    const loc = app.line === 'main' || app.line === 'stable-3_5_0' || !app.line ? '/en' : '';

    const dir = outFile('files');
    fs.mkdirSync(dir, {recursive: true});
    const fixture = path.resolve(__dirname, `../../../../../apps/${app.name}/playwright/fixtures/files/replacement.pdf`);
    const mk = (n) => { const p = path.join(dir, n); fs.copyFileSync(fixture, p); return p; };

    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    }
    // The wizard's own requests: uploads, and what "Change File" / "Cancel" send.
    const calls = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/upload-file|delete-file|cancel-file-upload/.test(u)) return;
        let body = null;
        try { body = flat(await r.text(), 300); } catch (e) { body = `(unreadable: ${String(e.message).slice(0, 80)})`; }
        const sent = /upload-file/.test(u) ? '(multipart)' : flat(r.request().postData(), 400);
        calls.push({at: Date.now(), op: (u.match(/(upload-file|delete-file|cancel-file-upload)/) || [])[1], url: rel(u).replace(/^.*\$\$\$call\$\$\$/, '…').slice(0, 220), sent, status: r.status(), body});
    });
    const callsSince = (t0) => calls.filter((x) => x.at >= t0).map(({at, ...x}) => x);

    const wizard = () => page.getByRole('dialog').filter({has: page.locator('input[type="file"]')}).last();
    const uploaderText = () => wizard().locator('.pkp_uploader_button:visible, .pkpUploaderFilename').allInnerTexts().then((a) => a.map((t) => flat(t, 80))).catch(() => []);
    async function pick(file) {
        const t0 = Date.now();
        const resp = page.waitForResponse((r) => /upload-file/.test(r.url()) && r.request().method() === 'POST', {timeout: 60_000});
        await wizard().locator('input[type="file"]').setInputFiles(file);
        const r = await resp;
        let uploaded = null;
        try { uploaded = JSON.parse(await r.text()).uploadedFile || null; } catch (e) { /* recorded in calls */ }
        await idle(page); await pause(1500);
        return {uploaded: uploaded && {id: uploaded.id, fileId: uploaded.fileId, name: uploaded.name}, calls: callsSince(t0), uploader: await uploaderText()};
    }
    async function continueToEnd(label) {
        for (const [i, name] of [[1, 'Continue'], [2, 'Continue'], [3, 'Complete']]) {
            const btn = wizard().getByRole('button', {name, exact: true});
            await btn.waitFor({state: 'visible', timeout: T});
            await page.waitForFunction((el) => !el.disabled, await btn.elementHandle(), {timeout: T});
            if (i === 3) { fact(`${label} step 3`, flat(await wizard().innerText().catch(() => ''), 300)); }
            await btn.click();
            await idle(page); await pause(1200);
        }
        await wizard().waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page); await pause(800);
    }
    const storedFiles = () => sql(app, `select sf.submission_file_id, sf.file_id, sf.file_stage, coalesce(sf.assoc_type::text,''), coalesce(sf.assoc_id::text,''), (select setting_value from submission_file_settings s where s.submission_file_id=sf.submission_file_id and setting_name='name' and locale='en') from submission_files sf where sf.submission_id=${sid} order by 1`).split('\n').filter(Boolean);
    const revisions = (sfId) => sql(app, `select file_id from submission_file_revisions where submission_file_id=${sfId} order by revision_id desc`).split('\n').filter(Boolean).map(Number);
    const workflow = (extra = '') => app.url(`/index.php/${ctx}${loc}/dashboard/editorial?workflowSubmissionId=${sid}${extra}`);
    const listText = async () => flat((await screen(page)).text.dialog, 1500);

    try {
        const [FIRST, SECOND] = [mk('u36r16-first.pdf'), mk('u36r16-second.pdf')];
        fact('stored before', storedFiles());
        // 1
        await signIn(page, 'dbarnes');
        await idle(page);

        if (app.name !== 'ops' && !GALLEY_PATH) {
            // 2
            await page.goto(workflow()); await idle(page);
            await page.getByRole('heading', {name: 'Submission Files'}).first().waitFor({timeout: T});
            await snap('workflow');
            // 3
            await page.getByRole('button', {name: /^Upload/}).first().click();
            await wizard().locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
            await idle(page); await pause(500);
            fact('3 wizard', flat(await wizard().innerText(), 500));
            // 4
            await wizard().locator('select[name="genreId"]').selectOption({label: GENRE[app.name]});
            fact('4 revise list', await wizard().locator('select[name="revisedFileId"]').locator('option:checked').innerText().catch(() => '(none)'));
            fact('4 first pick', await pick(FIRST));
            await snap('first-pick');
            // 5
            fact('5 change file', await pick(SECOND));
            await snap('second-pick');
            // 6
            await continueToEnd('6');
            // 7
            fact('7 list', await listText());
            await snap('after-complete');
            fact('7 stored', storedFiles());

            if (NEIGHBOUR) {
                const target = storedFiles()[0].split('|');
                const sfId = Number(target[0]);
                const revBefore = revisions(sfId);
                await page.goto(workflow()); await idle(page);
                await page.getByRole('button', {name: /^Upload/}).first().click();
                await wizard().locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
                await idle(page); await pause(500);
                const sel = wizard().locator('select[name="revisedFileId"]');
                const options = await sel.locator('option').evaluateAll((os) => os.map((o) => ({value: o.value, text: o.textContent.trim()})));
                const opt = options.find((o) => Number(o.value) === sfId);
                await sel.selectOption(opt.value);
                const one = await pick(mk('u36r16-rev-one.pdf'));
                const two = await pick(mk('u36r16-rev-two.pdf'));
                await continueToEnd('N1');
                const revAfter = revisions(sfId);
                fact('N1', {file: sfId, option: opt.text, revisionsBefore: revBefore, one, two, revisionsAfter: revAfter,
                    firstPickKept: revAfter.includes(Number(one.uploaded && one.uploaded.fileId)),
                    originalKept: revBefore.every((f) => revAfter.includes(f)),
                    stored: storedFiles().filter((l) => l.startsWith(`${sfId}|`))});
                fact('N1 list', await listText());
                await snap('n1-after-complete');
            }
        } else {
            // 2
            const pub = Number(sql(app, `select current_publication_id from submissions where submission_id=${sid}`));
            const filesDir = path.resolve(__dirname, `../../../../../checkouts${app.line && app.line !== 'main' ? '/' + app.line : ''}/files/${app.name}-test-ds${app.dataset}`);
            const fileState = (fileId) => {
                const p = sql(app, `select path from files where file_id=${Number(fileId)}`);
                return {fileId, row: !!p, onDisk: p ? fs.existsSync(path.join(filesDir, p)) : null};
            };
            const galleyRows = () => sql(app, `select galley_id, coalesce(submission_file_id::text,'null'), label from publication_galleys where publication_id=${pub} order by 1`).split('\n');
            async function galleyFlow(label, mode) {
                await page.goto(workflow()); await idle(page);
                await page.getByRole('navigation').getByRole('link', {name: 'Galleys', exact: true}).click();
                await idle(page);
                const addGalley = page.getByRole('button', {name: /^Add galley$/i}).or(page.getByRole('link', {name: /^Add galley$/i})).first();
                await addGalley.waitFor({timeout: T});
                await snap(`${label}-galleys`);
                // 3
                await addGalley.click();
                const form = page.locator('form:has(input[name="label"])').last();
                await form.locator('input[name="label"]').waitFor({timeout: T});
                await form.locator('input[name="label"]').fill(label);
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                await wizard().locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
                await idle(page); await pause(500);
                fact(`${label} 3 wizard`, flat(await wizard().innerText(), 500));
                // 4
                const genre = wizard().locator('select[name="genreId"]');
                if (await genre.count()) await genre.selectOption({label: GENRE[app.name]});
                const one = await pick(mk(`${label}-first.pdf`));
                fact(`${label} 4 first pick`, one);
                let two = null;
                if (mode === 'change') {
                    two = await pick(mk(`${label}-second.pdf`));
                    fact(`${label} 4 change file`, two);
                    await snap(`${label}-second-pick`);
                    // 5
                    await continueToEnd(`${label} 5`);
                } else {
                    // N2: "Cancel" right after the one pick
                    const t0 = Date.now();
                    await wizard().getByRole('link', {name: 'Cancel', exact: true}).or(wizard().getByRole('button', {name: 'Cancel', exact: true})).first().click();
                    await idle(page); await pause(2000);
                    fact(`${label} cancel`, {calls: callsSince(t0), wizardStillOpen: await wizard().isVisible().catch(() => false)});
                    if (await wizard().isVisible().catch(() => false)) {
                        await page.getByRole('dialog').filter({has: page.locator('input[type="file"]')}).getByRole('button', {name: 'Close'}).first().click().catch(() => {});
                        await idle(page);
                    }
                }
                await page.goto(workflow()); await idle(page);
                await page.getByRole('navigation').getByRole('link', {name: 'Galleys', exact: true}).click();
                await idle(page); await pause(800);
                fact(`${label} galleys`, await listText());
                await snap(`${label}-after`);
                fact(`${label} stored`, storedFiles());
                fact(`${label} galley rows`, galleyRows());
                fact(`${label} files`, [one, two].filter(Boolean).map((x) => fileState(x.uploaded && x.uploaded.fileId)));
            }
            await galleyFlow('u36r16', 'change');
            // N2 (NEIGHBOUR=1): a new galley's single pick, then "Cancel"
            if (NEIGHBOUR) await galleyFlow('u36r16c', 'cancel');
        }
    } catch (err) {
        fact('ERROR', String(err.stack || err).slice(0, 1200));
        await snap('ERROR').catch(() => {});
        throw err;
    } finally {
        fact('calls', calls.map(({at, ...x}) => x));
        record('facts', facts);
        await close();
        fs.rmSync(dir, {recursive: true, force: true});
    }
});
