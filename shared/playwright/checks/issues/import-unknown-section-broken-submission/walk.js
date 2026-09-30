// Issue report walk: docs/issues/import-unknown-section-broken-submission.md
// (spec U63 register A9). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own context `publicknowledge`, as its own Journal Manager (Preprint
// Server manager) `rvaca`. OJS and OPS; OMP has no such surface (a press's
// file carries the whole series, which the import creates: U63 OMP3).
//
// The kit builds nothing. Everything goes through the screens:
//   1–2  sign in as rvaca, Tools › "Native XML Plugin"
//   3–4  "Export Articles" ("Export Preprints"): tick submission 8 (OPS 1),
//        export, "Download Exported File"
//   5    the downloaded file with section_ref changed to "EDT" (the text
//        editor step), saved as u63a9.xml
//   6–7  "Import" tab, "Upload File" u63a9.xml, "Import"; the results tab
//   8–9  Dashboard › "Active submissions", the newest row, its "View"
//   10   the plugin's export tab again
//   11   neighbour check: the downloaded file unchanged, imported the same
//        way (a known section must still import, with the fix too);
//        NEIGHBOUR_ONLY=1 takes steps 1–4 and 11 alone
// Besides the screens it reads the database: the submissions and
// publications the import left.
//
// Trying the fix (REPORT.md "Proposed fix", harness.md "Trying a fix"):
//   trial.sh beside this file: apply fix.diff to OJS and OPS, reset, walk with
//   PROBE_RUN=fix, revert (in a trap), reset, NEIGHBOUR_ONLY=1 walk without it.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63a9 ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/import-unknown-section-broken-submission/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u63a9 ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/import-unknown-section-broken-submission/walk.js
// Facts: .reports/<feature>/u63a9/facts[-<run>]-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, idle, sql, outFile} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const LABELS = {
    ojs: {exportTab: 'Export Articles', exportBtn: 'Export Articles', sub: 8, title: 'Traditions and Trends in the Study of the Commons', section: 'ART'},
    ops: {exportTab: 'Export Preprints', exportBtn: 'Export Preprints', sub: 1, title: 'The influence of lactation on the quantity and quality of cashmere production', section: 'PRE'},
};

forEachApp(async (app) => {
    const L = LABELS[app.name];
    if (!L) return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 900)}`); };
    const locale = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en';
    const cu = (p) => app.url(`/index.php/${app.contextPath}${locale}${p}`);
    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    // Script errors and failing requests, by step.
    let step = 'start';
    const errors = [];
    page.on('pageerror', (e) => errors.push({step, kind: 'pageerror', text: flat(e.message, 300)}));
    page.on('console', (m) => { if (m.type() === 'error') errors.push({step, kind: 'console', text: flat(m.text(), 300)}); });
    page.on('response', (r) => { if (r.status() >= 400) errors.push({step, kind: 'http', text: `${r.status()} ${r.request().method()} ${rel(r.url()).replace(/csrfToken=[^&]+/, 'csrf').slice(0, 200)}`}); });
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    };
    const maxSub = () => Number(sql(app, 'select max(submission_id) from submissions'));
    const tabs = () => page.locator('#importExportTabs [role="tab"]').evaluateAll((ts) => ts.map((t) => t.innerText.trim()));
    const panel = () => page.locator('#importExportTabs [role="tabpanel"]:visible').first();
    const openPlugin = async () => {
        await page.goto(cu('/management/tools'));
        await idle(page);
        await page.getByRole('link', {name: 'Native XML Plugin', exact: true}).first().click();
        await page.locator('#importExportTabs').waitFor({timeout: T});
        await idle(page);
    };
    const exportTab = async () => {
        await page.getByRole('tab', {name: L.exportTab, exact: true}).first().click();
        await idle(page);
        await page.locator('#exportSubmissions-tab .listPanel__item, #exportSubmissions-tab .listPanel__empty').first().waitFor({timeout: 10_000}).catch(() => {});
        await idle(page);
    };
    const importFile = async (file, label) => {
        await page.getByRole('tab', {name: 'Import', exact: true}).first().click();
        await idle(page);
        const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
        await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
        const u = await up;
        await idle(page);
        const before = (await tabs()).length;
        const answered = page.waitForResponse((r) => /NativeImportExportPlugin\/import\?/.test(r.url()), {timeout: 60_000}).catch(() => null);
        await page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}).click();
        const r = await answered;
        for (let i = 0; i < 20 && (await tabs()).length === before; i++) await pause(300);
        await idle(page); await pause(800);
        const o = {upload: u ? u.status() : null, importStatus: r ? r.status() : 'no request', tabs: await tabs(), resultsText: flat(await panel().innerText().catch(() => null))};
        await snap(`${label}-results`);
        return o;
    };
    try {
        const before = {max: maxSub(), count: Number(sql(app, 'select count(*) from submissions'))};
        fact('before', before);

        step = '1-2 sign in, plugin';
        await signIn(page, 'rvaca');
        await openPlugin();
        await snap('plugin');

        step = '3-4 export, download';
        await exportTab();
        const item = page.locator('#exportSubmissions-tab .listPanel__item').filter({hasText: L.title}).first();
        await item.locator('input[type=checkbox]').check();
        await page.locator('#exportSubmissions-tab').getByRole('button', {name: L.exportBtn, exact: true}).click();
        const dlBtn = panel().getByRole('button', {name: 'Download Exported File'});
        await dlBtn.waitFor({timeout: 60_000});
        await snap('export-results');
        const dl = page.waitForEvent('download', {timeout: T});
        await dlBtn.click();
        const d = await dl;
        const original = fs.readFileSync(await d.path(), 'utf8');
        const origFile = outFile('exported.xml');
        fs.writeFileSync(origFile, original);

        if (process.env.NEIGHBOUR_ONLY) {
            step = '11 neighbour: unchanged file';
            await openPlugin();
            fact('neighbour import', await importFile(origFile, 'neighbour'));
            const m = maxSub();
            fact('db after neighbour', {newSubmissions: m > before.max ? sql(app, `select submission_id, coalesce(current_publication_id::text,'null') from submissions where submission_id>${before.max}`).split('\n') : []});
            return;
        }

        step = '5 edit file';
        const refs = [...original.matchAll(/section_ref="([^"]*)"/g)].map((m) => m[1]);
        const edited = original.replace(/section_ref="[^"]*"/g, 'section_ref="EDT"');
        const editedFile = outFile('u63a9.xml');
        fs.writeFileSync(editedFile, edited);
        fact('file', {downloaded: d.suggestedFilename(), bytes: original.length, sectionRefsBefore: refs, publications: (original.match(/<publication\s/g) || []).length});

        step = '6-7 import';
        await openPlugin();
        fact('import', await importFile(editedFile, 'import'));
        const after = maxSub();
        const newIds = after > before.max ? sql(app, `select submission_id from submissions where submission_id>${before.max} order by 1`).split('\n').filter(Boolean).map(Number) : [];
        fact('db after import', {newSubmissions: newIds, rows: newIds.map((id) => sql(app, `select submission_id, stage_id, status, coalesce(current_publication_id::text,'null') from submissions where submission_id=${id}`)),
            publications: newIds.map((id) => Number(sql(app, `select count(*) from publications where submission_id=${id}`)))});

        step = '8 dashboard';
        await page.goto(cu('/dashboard/editorial?currentViewId=active'));
        await idle(page);
        await page.locator('table tbody tr').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await pause(800);
        const rows = page.locator('table tbody tr');
        const newest = newIds.length ? rows.filter({has: page.getByRole('cell', {name: String(newIds[0]), exact: true})}).first() : null;
        const rowText = newest && (await newest.count()) ? flat(await newest.innerText()) : null;
        fact('dashboard', {heading: flat(await page.locator('main h1, main h2').first().innerText().catch(() => null), 100), newestRow: rowText, firstRow: flat(await rows.first().innerText().catch(() => null), 300)});
        await snap('dashboard');

        step = '9 view';
        if (newest && (await newest.count())) {
            const urlBefore = rel(page.url());
            await newest.getByRole('button', {name: /View/}).or(newest.getByRole('link', {name: /View/})).first().click();
            await pause(2500); await idle(page).catch(() => {});
            const dialogs = await page.getByRole('dialog').count();
            fact('view', {urlBefore, urlAfter: rel(page.url()), dialogs, dialogText: flat(await page.getByRole('dialog').first().innerText().catch(() => null), 300)});
            await snap('view');
        } else fact('view', 'no new row to view');

        step = '10 export tab again';
        await openPlugin();
        await exportTab();
        const tab = page.locator('#exportSubmissions-tab');
        fact('export tab after', {items: await tab.locator('.listPanel__item').count(), text: flat(await tab.innerText().catch(() => null), 400)});
        await snap('export-tab-after');

        step = '11 neighbour: unchanged file';
        const max2 = maxSub();
        await openPlugin();
        fact('neighbour import', await importFile(origFile, 'neighbour'));
        const max3 = maxSub();
        fact('db after neighbour', {newSubmissions: max3 > max2 ? sql(app, `select submission_id, coalesce(current_publication_id::text,'null') from submissions where submission_id>${max2}`).split('\n') : []});
    } catch (e) {
        fact('walk error', {step, error: flat(e.message, 500)});
        await snap('error').catch(() => {});
    } finally {
        fact('errors', errors);
        record('facts', facts);
        await close();
    }
});
