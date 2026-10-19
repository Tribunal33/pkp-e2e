// U63 claim check H19 (housekeeping 2026-10-19, an incidentals row): OMP's Native XML import from the
// server's command line, against the same file uploaded through Tools › Import/Export › "Native XML Plugin".
// On PKP's default dataset (a dataset fleet, harness.md "Dataset fleets"), context `publicknowledge`. OMP drives
// every step on monograph 5 ("Bomb Canada …", published, one publication format); OJS (article 17) and OPS
// (preprint 2) drive steps 1-3 and 5 only, the read-only controls (no publication formats there).
//
//   1. rvaca: the plugin's "Import" tab (screen)
//   2. CLI export of monograph 5 (`… export <file> publicknowledge monograph 5`): file A
//   3. CLI import of A as admin; new submissions counted in the database
//   4. CLI import of A with its <publication_format> elements removed (the row's variant)
//   5. web, as rvaca: A uploaded, Export tab and back, page left (dialogs), then A imported; results tab,
//      reload, the new book's Dashboard row, its formats in the database
//   6. the press's four ONIX details filled on Settings › Press › "Masthead" (the export's other end: the
//      Native export then builds an ONIX product per format through the request's context too)
//   7. CLI export of monograph 5 again: file B, or the failure
//   8. web export of monograph 5 (Tools › "Native XML Plugin" › "Export"): file C, ONIX product inside
//   9. CLI import of C; 10. web import of C
//
// Mutates the fleet's contexts: reset before each run (one app per locked call on main).
//   npm run fleet-prep -- --feature issues-cc19f --dataset 5 --reset
//   bin/app-lock.sh shared <app> -- env PROBE_FEATURE=issues-cc19f PKP_E2E_DATASET=5 PROBE_AGENT=cc19f PROBE_RUN=r1 \
//       node bin/probe.js <app> shared/playwright/checks/U63/H19/h19.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-cc19f-3_5 --dataset 5 --reset
//        PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=issues-cc19f-3_5 PKP_E2E_DATASET=5 PROBE_AGENT=cc19f PROBE_RUN=s1 \
//            node bin/probe.js all shared/playwright/checks/U63/H19/h19.js
// Facts: .reports/<feature>/cc19f/h19-<run>-omp.json, snapshots beside it.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, record, sql, outFile, serverLog, note, idle} = require('../../../probe');
const N = require('../../issues/unknown-section-import-broken-submission/lib');

const REPO = path.resolve(__dirname, '../../../../..');
const MANAGER = 'rvaca';
// One published submission per app with one version (dataset.md: "Done, published" on main,
// "Production, published" on 3.5). OJS and OPS are the read-only controls of the CLI claim (no publication
// formats) and the other apps of the Dashboard read in step 5.
const SUB = {
    omp: {id: 5, entity: 'monograph', page: 'catalog/book', title: 'Bomb Canada and Other Unkind Remarks in the American Media'},
    ojs: {id: 17, entity: 'article', page: 'article/view'},
    ops: {id: 2, entity: 'preprint', page: 'preprint/view'},
};

/** The plugin's CLI, as the team runs it from the app's directory; output kept without the per-file skip lines and PHP notices. */
function cli(app, args) {
    const root = path.resolve(REPO, app.root);
    const env = {...process.env, PKP_CONFIG_FILE: path.resolve(REPO, app.configFile)};
    let out, code = 0;
    const t0 = Date.now();
    try {
        out = execFileSync('php', ['tools/importExport.php', 'NativeImportExportPlugin', ...args], {cwd: root, env, encoding: 'utf8', timeout: 300_000, maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
    } catch (e) {
        code = e.status; out = `${e.stdout || ''}${e.stderr || ''}`;
    }
    const lines = String(out).split('\n');
    const skipped = lines.filter((l) => /^- The submission file \d+ was skipped/.test(l)).length;
    const notices = lines.filter((l) => /^PHP (Notice|Warning|Deprecated)/.test(l)).length;
    const kept = lines.filter((l) => l.trim() && !/^- The submission file \d+ was skipped/.test(l) && !/^PHP (Notice|Deprecated):\s+tempnam/.test(l));
    return {cmd: `php tools/importExport.php NativeImportExportPlugin ${args.map((a) => (a.includes('/') ? path.basename(a) : a)).join(' ')}`, exit: code, ms: Date.now() - t0, output: kept.slice(0, 40), skippedLines: skipped, phpNotices: notices};
}

const maxSub = (app) => Number(sql(app, 'select coalesce(max(submission_id), 0) from submissions'));
function newBooks(app, mark) {
    const rows = sql(app, `select s.submission_id, s.status, s.stage_id, p.publication_id, p.status,
        ${app.name === 'omp' ? '(select count(*) from publication_formats pf where pf.publication_id = p.publication_id)' : "(select count(*) from publication_galleys g where g.publication_id = p.publication_id)"},
        (select setting_value from publication_settings ps where ps.publication_id = p.publication_id and ps.setting_name = 'title' and ps.locale = 'en' limit 1)
        from submissions s join publications p on p.submission_id = s.submission_id where s.submission_id > ${mark} order by 1, 4`);
    return String(rows || '').split('\n').filter(Boolean).map((r) => {
        const [sub, sStatus, stage, pub, pStatus, formats, title] = r.split('|');
        return {sub: Number(sub), subStatus: Number(sStatus), stage: Number(stage), pub: Number(pub), pubStatus: Number(pStatus), formats: Number(formats), title};
    });
}
const fileFacts = (xml) => ({bytes: xml.length, publicationFormats: (xml.match(/<publication_format\b/g) || []).length, onixProduct: (xml.match(/<Product\b/g) || []).length, root: (xml.match(/<(monographs|monograph)\b/) || [])[1] || null});
const stripFormats = (xml) => xml.replace(/<publication_format\b[\s\S]*?<\/publication_format>/g, '');

forEachApp(async (app) => {
    const S = SUB[app.name];
    const omp = app.name === 'omp';
    const f = {app: app.name, line: app.line || 'main', dataset: app.dataset, lib: null, submission: S.id};
    try { f.lib = execFileSync('git', ['-C', path.resolve(REPO, app.root, 'lib/pkp'), 'rev-parse', '--short=10', 'HEAD'], {encoding: 'utf8'}).trim(); } catch (e) { /* not a checkout */ }
    if (omp) f.onixBefore = sql(app, "select setting_name || '=' || setting_value from press_settings where setting_name in ('publisher','location','codeType','codeValue') order by 1") || '(none)';
    const log = serverLog(app);
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const errs = N.scriptErrors(page);
    const w = N.watch(page);
    const step = async (name, fn) => {
        const from = log.mark();
        try { f[name] = await fn(); } catch (e) { f[name] = {error: N.flat(e.stack, 900)}; await N.snap(page, `h19-${name}-error`).catch(() => {}); }
        const s = log.since(from);
        if (s && s.length) (f.serverLog = f.serverLog || {})[name] = s.slice(0, 8).map((l) => N.flat(l, 240));
    };
    try {
        // 1
        await step('s1ImportTab', async () => {
            await signIn(page, MANAGER, {contextPath: app.contextPath});
            await N.openNative(app, page);
            return {tabs: (await page.locator('#importExportTabs > ul [role="tab"]').allInnerTexts()).map((t) => t.trim()), snap: await N.snap(page, 'h19-01-native-import-tab')};
        });
        // 2
        const fileA = outFile('h19-A-cli-export.xml');
        await step('s2CliExport', async () => {
            const r = cli(app, ['export', fileA, app.contextPath, S.entity, String(S.id)]);
            return {...r, file: fs.existsSync(fileA) ? fileFacts(fs.readFileSync(fileA, 'utf8')) : 'not written'};
        });
        const haveA = fs.existsSync(fileA);
        // 3
        await step('s3CliImportA', async () => {
            const mark = maxSub(app);
            const r = cli(app, ['import', fileA, app.contextPath, 'admin']);
            return {...r, newBooks: newBooks(app, mark)};
        });
        // 4
        const fileA2 = outFile('h19-A-no-formats.xml');
        if (haveA && omp) fs.writeFileSync(fileA2, stripFormats(fs.readFileSync(fileA, 'utf8')));
        if (omp) await step('s4CliImportNoFormats', async () => {
            const mark = maxSub(app);
            const r = cli(app, ['import', fileA2, app.contextPath, 'admin']);
            return {file: fileFacts(fs.readFileSync(fileA2, 'utf8')), ...r, newBooks: newBooks(app, mark)};
        });
        // 5
        await step('s5WebImportA', async () => {
            const o = {};
            await N.openNative(app, page);
            // the box with A up, another tab, back, then the page left
            const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: 30_000});
            await page.locator('#importXmlForm input[type=file]').first().setInputFiles(fileA);
            o.uploadStatus = (await up).status();
            await idle(page).catch(() => {});
            o.boxAfterUpload = N.flat(await page.locator('#importXmlForm').innerText().catch(() => null), 300);
            await N.openExportTab(app, page);
            await page.getByRole('tab', {name: 'Import', exact: true}).first().click();
            await idle(page).catch(() => {});
            o.boxAfterTabRoundTrip = N.flat(await page.locator('#importXmlForm').innerText().catch(() => null), 300);
            const dialogs = [];
            const onDialog = (d) => { dialogs.push({type: d.type(), message: N.flat(d.message(), 200)}); d.accept().catch(() => {}); };
            page.on('dialog', onDialog);
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
            await idle(page).catch(() => {});
            page.off('dialog', onDialog);
            o.leaveDialogs = dialogs;
            await N.openNative(app, page);
            o.boxOnReturn = N.flat(await page.locator('#importXmlForm').innerText().catch(() => null), 300);
            o.marksAfterLeave = maxSub(app);
            // the import itself
            const mark = maxSub(app);
            const m = w.seen.length;
            const imp = await N.importFile(page, fileA);
            o.import = {uploaded: imp.uploaded, tabs: imp.tabs, panel: imp.panel, requests: w.seen.slice(m)};
            o.snapResults = await N.snap(page, 'h19-05-web-import-A-results');
            o.newBooks = newBooks(app, mark);
            await page.reload(); await page.locator('#importExportTabs').waitFor().catch(() => {}); await idle(page).catch(() => {});
            o.afterReload = {tabs: (await page.locator('#importExportTabs > ul [role="tab"]').allInnerTexts()).map((t) => t.trim()), box: N.flat(await page.locator('#importXmlForm').innerText().catch(() => null), 200)};
            o.snapReload = await N.snap(page, 'h19-05b-web-import-after-reload');
            if (o.newBooks.length) {
                const id = o.newBooks[0].sub;
                // where the Dashboard lists the imported copy and the source: "Published", "Active submissions"
                o.dashboard = {};
                for (const view of ['published', 'active']) {
                    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?currentViewId=${view}`));
                    await idle(page).catch(() => {});
                    await page.locator('main table tbody tr').first().waitFor({timeout: 20_000}).catch(() => {});
                    await N.sleep(1000); await idle(page).catch(() => {});
                    const ids = await page.locator('main table tbody tr').evaluateAll((rs) => rs.map((r) => (r.querySelector('td, th') || r).innerText.trim()));
                    const heading = N.flat(await page.locator('main h1, main h2').first().innerText().catch(() => null), 80);
                    o.dashboard[view] = {heading, rowIds: ids.slice(0, 40), imported: ids.includes(String(id)), source: ids.includes(String(S.id))};
                    o.dashboard[view].snap = await N.snap(page, `h19-05c-dashboard-${view}`);
                }
                // the search box of each view, by the copy's number
                o.search = {};
                for (const view of ['active', 'published']) {
                    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?currentViewId=${view}`));
                    await idle(page).catch(() => {});
                    const box = page.getByRole('searchbox', {name: /^Search submissions/}).first();
                    await box.waitFor({timeout: 20_000});
                    await box.fill(String(id)); await box.press('Enter');
                    await N.sleep(1500); await idle(page).catch(() => {});
                    await page.locator('main table tbody tr').first().waitFor({timeout: 10_000}).catch(() => {});
                    await N.sleep(500);
                    const ids = await page.locator('main table tbody tr').evaluateAll((rs) => rs.map((r) => (r.querySelector('td, th') || r).innerText.trim()));
                    o.search[view] = {heading: N.flat(await page.locator('main h1, main h2').first().innerText().catch(() => null), 80), rowIds: ids.slice(0, 20), imported: ids.includes(String(id)), text: N.flat(await page.locator('main table').first().innerText().catch(() => null), 300)};
                    o.search[view].snap = await N.snap(page, `h19-05e-dashboard-search-${view}`);
                }
                // the copy's workflow, by the address the Dashboard's "View" opens
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
                await idle(page).catch(() => {});
                await page.getByRole('dialog').first().waitFor({timeout: 15_000}).catch(() => {});
                await N.sleep(1500); await idle(page).catch(() => {});
                o.workflowCopy = await N.snap(page, 'h19-05f-workflow-copy');
                o.workflowCopyText = N.flat(await page.getByRole('dialog').first().innerText().catch(() => null), 500);
                o.stageOfCopy = sql(app, `select stage_id || '/' || status from submissions where submission_id = ${id}`);
                o.stageOfSource = sql(app, `select stage_id || '/' || status from submissions where submission_id = ${S.id}`);
                await page.goto(app.url(`/index.php/${app.contextPath}/en/${S.page}/${id}`));
                await idle(page).catch(() => {});
                o.snapPublicPage = await N.snap(page, 'h19-05d-public-page');
                o.publicPageTitle = await page.title();
            }
            return o;
        });
        if (!omp) return;
        // 6
        await step('s6Masthead', async () => {
            const {SettingsPages, SettingsForm} = require('../../../pages/ContextIdentityPages.js');
            const settings = new SettingsPages(page, app.contextPath);
            await settings.goto('journal');
            const tab = settings.tab('Masthead');
            if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
            const form = new SettingsForm(page, '[name="publisher"]');
            await form.ready();
            await form.form.locator('[name="publisher"]').fill('H19 Press');
            await form.form.locator('[name="location"]').fill('Vancouver');
            await form.form.locator('select[name="codeType"]').selectOption({label: 'Proprietary (01)'});
            await form.form.locator('[name="codeValue"]').fill('H19-01');
            await form.save();
            const snap = await N.snap(page, 'h19-06-masthead-saved');
            return {snap, stored: sql(app, "select setting_name || '=' || setting_value from press_settings where setting_name in ('publisher','location','codeType','codeValue') order by 1")};
        });
        // 7
        const fileB = outFile('h19-B-cli-export-onix.xml');
        await step('s7CliExportOnix', async () => {
            const r = cli(app, ['export', fileB, app.contextPath, S.entity, String(S.id)]);
            return {...r, file: fs.existsSync(fileB) ? fileFacts(fs.readFileSync(fileB, 'utf8')) : 'not written'};
        });
        // 8
        const fileC = outFile('h19-C-web-export-onix.xml');
        await step('s8WebExportOnix', async () => {
            await N.openNative(app, page);
            const ex = await N.exportOne(app, page, S.title);
            fs.writeFileSync(fileC, ex.xml);
            const snap = await N.snap(page, 'h19-08-web-export-onix');
            return {download: ex.file, tabs: ex.res.tabs, panel: N.flat(ex.res.panel, 400), file: fileFacts(ex.xml), snap};
        });
        // 9
        await step('s9CliImportC', async () => {
            if (!fs.existsSync(fileC)) return 'no file C';
            const mark = maxSub(app);
            const r = cli(app, ['import', fileC, app.contextPath, 'admin']);
            return {...r, newBooks: newBooks(app, mark)};
        });
        // 10
        await step('s10WebImportC', async () => {
            if (!fs.existsSync(fileC)) return 'no file C';
            await N.openNative(app, page);
            const mark = maxSub(app);
            const m = w.seen.length;
            const imp = await N.importFile(page, fileC);
            const snap = await N.snap(page, 'h19-10-web-import-C-results');
            return {tabs: imp.tabs, panel: imp.panel, requests: w.seen.slice(m), snap, newBooks: newBooks(app, mark)};
        });
    } finally {
        w.stop();
        f.scriptErrors = errs;
        record('h19', f);
        console.log('[h19]', JSON.stringify(f, null, 1).slice(0, 12000));
        await close();
    }
});
