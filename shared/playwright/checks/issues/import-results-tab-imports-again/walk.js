// Issue report walk: docs/issues/U63-A7-import-results-tab-imports-again.md
// (spec U63 register A7). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own context `publicknowledge`, as its own manager `rvaca`, on OJS,
// OMP and OPS. The kit builds nothing; everything goes through the screens:
//   1–2  sign in as rvaca, Tools › "Native XML Plugin"
//   3–4  the export tab: tick the submission, export, "Download Exported File"
//   5–6  "Import" tab, "Upload File" (the downloaded file), "Import"; the results tab
//   7–8  the "Import" tab, then the results tab again
//   9    Dashboard › "Active submissions": the rows carrying the title
// Neighbour checks (the fix must not reach further):
//   N1   the plugin page again: upload, "Import" pressed twice; each press
//        still imports once and opens its own results tab
//   N2   Tools: "Permissions", "Import/Export", "Permissions" again; the
//        Permissions tab still reloads from the server
// NEIGHBOUR_ONLY=1 takes steps 1–4 and N1, N2 alone.
// PUBLISHED=1 (OJS only) takes the Steps' "A published article" group
// instead: submission 17, published in Vol. 1 No. 2 (2014), exported and
// imported, the results tab chosen once more, then the issue's public table
// of contents (Archives › "Vol. 1 No. 2 (2014)").
// Besides the screens it counts, from the browser's own traffic, the import
// requests each tab choice sent, and reads the database for the copies.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u63a7 node bin/probe.js all shared/playwright/checks/issues/import-results-tab-imports-again/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u63a7 node bin/probe.js all shared/playwright/checks/issues/import-results-tab-imports-again/walk.js
// Fix trial:    trial.sh beside this file (fix.diff applied, walk, revert, neighbour walk).
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, idle, sql, outFile} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const LABELS = {
    ojs: {exportTab: 'Export Articles', exportBtn: 'Export Articles', results: 'Import Results', sub: 8, title: 'Traditions and Trends in the Study of the Commons'},
    omp: {exportTab: 'Export', exportBtn: 'Export Submissions', results: 'Results', sub: 3, title: 'The Political Economy of Workplace Injury in Canada'},
    ops: {exportTab: 'Export Preprints', exportBtn: 'Export Preprints', results: 'Import Results', sub: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'},
};
const IMPORT_RE = /NativeImportExportPlugin\/import\?/;

const PUB = {title: 'Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran', issue: 'Vol. 1 No. 2 (2014)'};

forEachApp(async (app) => {
    if (process.env.PUBLISHED && app.name !== 'ojs') return;
    const L = process.env.PUBLISHED ? {...LABELS.ojs, title: PUB.title} : LABELS[app.name];
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 900)}`); };
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    let step = 'start';
    const errors = [];
    const importReqs = [];
    page.on('pageerror', (e) => errors.push({step, kind: 'pageerror', text: flat(e.message, 300)}));
    page.on('console', (m) => { if (m.type() === 'error') errors.push({step, kind: 'console', text: flat(m.text(), 300)}); });
    page.on('response', (r) => {
        const u = rel(r.url());
        if (IMPORT_RE.test(u)) importReqs.push({step, status: r.status()});
        if (r.status() >= 400) errors.push({step, kind: 'http', text: `${r.status()} ${r.request().method()} ${u.replace(/csrfToken=[^&]+/, 'csrf').slice(0, 200)}`});
    });
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    };
    const copies = () => Number(sql(app, `select count(distinct s.submission_id) from submissions s join publications p on p.submission_id = s.submission_id join publication_settings ps on ps.publication_id = p.publication_id where ps.setting_name = 'title' and ps.locale = 'en' and ps.setting_value = '${L.title.replace(/'/g, "''")}'`));
    const maxSub = () => Number(sql(app, 'select max(submission_id) from submissions'));
    const tabNames = () => page.locator('#importExportTabs > ul > li a.ui-tabs-anchor').evaluateAll((as) => as.map((a) => a.innerText.trim()));
    const panel = () => page.locator('#importExportTabs > [role="tabpanel"]:visible').first();
    const reqsIn = (s) => importReqs.filter((r) => r.step === s).length;
    const openPlugin = async () => {
        await page.goto(cu('/management/tools'));
        await idle(page);
        await page.getByRole('link', {name: 'Native XML Plugin', exact: true}).first().click();
        await page.locator('#importExportTabs').waitFor({timeout: T});
        await idle(page);
    };
    const chooseTab = async (name, nth = 0) => {
        await page.locator('#importExportTabs > ul > li a.ui-tabs-anchor').filter({hasText: new RegExp(`^${name}$`)}).nth(nth).click();
        await idle(page); await pause(1500); await idle(page);
    };
    const upload = async (file) => {
        await chooseTab('Import');
        const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
        await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
        const u = await up;
        await idle(page);
        return u ? u.status() : null;
    };
    const pressImport = async (label) => {
        const before = (await tabNames()).length;
        const answered = page.waitForResponse((r) => IMPORT_RE.test(r.url()), {timeout: 60_000}).catch(() => null);
        await page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}).click();
        const r = await answered;
        for (let i = 0; i < 20 && (await tabNames()).length === before; i++) await pause(300);
        await idle(page); await pause(800);
        const o = {importStatus: r ? r.status() : 'no request', tabs: await tabNames(), resultsText: flat(await panel().innerText().catch(() => null), 600)};
        await snap(label);
        return o;
    };
    try {
        const start = {copies: copies(), maxSubmission: maxSub()};
        fact('before', start);

        step = '1-2 sign in, plugin';
        await signIn(page, 'rvaca');
        await openPlugin();
        await snap('plugin');

        step = '3-4 export, download';
        await chooseTab(L.exportTab);
        await page.locator('#exportSubmissions-tab .listPanel__item').first().waitFor({timeout: T});
        const item = page.locator('#exportSubmissions-tab .listPanel__item').filter({hasText: L.title}).first();
        await item.locator('input[type=checkbox]').check();
        await page.locator('#exportSubmissions-tab').getByRole('button', {name: L.exportBtn, exact: true}).click();
        const dlBtn = panel().getByRole('button', {name: 'Download Exported File'});
        await dlBtn.waitFor({timeout: 60_000});
        await snap('export-results');
        const dl = page.waitForEvent('download', {timeout: T});
        await dlBtn.click();
        const d = await dl;
        const file = outFile('u63a7.xml');
        fs.writeFileSync(file, fs.readFileSync(await d.path(), 'utf8'));
        fact('file', {downloaded: d.suggestedFilename(), bytes: fs.statSync(file).size});

        if (process.env.PUBLISHED) {
            step = 'P5 upload';
            await openPlugin();
            fact('upload', await upload(file));
            step = 'P6 import';
            const r = await pressImport('p6-import-results');
            fact('P6', {...r, importRequests: reqsIn(step), copies: copies()});
            step = 'P7 import tab';
            await chooseTab('Import');
            step = 'P8 results tab again';
            const again = page.waitForResponse((x) => IMPORT_RE.test(x.url()), {timeout: 15_000}).catch(() => null);
            await chooseTab(L.results);
            await again; await idle(page); await pause(800);
            fact('P8', {importRequests: reqsIn(step), resultsText: flat(await panel().innerText().catch(() => null), 600), copies: copies()});
            await snap('p8-results-again');
            fact('db copies', sql(app, `select s.submission_id, s.status, p.status, p.issue_id, p.date_published from submissions s join publications p on p.publication_id = s.current_publication_id where s.submission_id >= 17 and s.submission_id in (select p2.submission_id from publications p2 join publication_settings ps on ps.publication_id = p2.publication_id where ps.setting_name='title' and ps.setting_value='${PUB.title.replace(/'/g, "''")}') order by 1`).split('\n'));
            step = 'P9 table of contents';
            await page.goto(cu('/issue/archive'));
            await idle(page);
            await page.getByRole('link', {name: PUB.issue}).first().click();
            await idle(page);
            const main = page.getByRole('main');
            const text = await main.innerText();
            fact('P9', {url: rel(page.url()), heading: flat(await main.getByRole('heading', {level: 1}).first().innerText().catch(() => null), 120),
                titleLinks: await main.getByRole('link', {name: PUB.title}).count(), occurrences: text.split(PUB.title).length - 1});
            await snap('p9-issue-toc');
            return;
        }

        if (!process.env.NEIGHBOUR_ONLY) {
            step = '5 upload';
            await openPlugin();
            fact('upload', await upload(file));

            step = '6 import';
            const r6 = await pressImport('06-import-results');
            fact('step 6', {...r6, importRequests: reqsIn(step), copies: copies()});

            step = '7 import tab';
            await chooseTab('Import');
            fact('step 7', {importRequests: reqsIn(step), copies: copies()});

            step = '8 results tab again';
            const again = page.waitForResponse((r) => IMPORT_RE.test(r.url()), {timeout: 15_000}).catch(() => null);
            await chooseTab(L.results);
            await again; await idle(page); await pause(800);
            fact('step 8', {importRequests: reqsIn(step), tabs: await tabNames(), resultsText: flat(await panel().innerText().catch(() => null), 600), copies: copies()});
            await snap('08-results-again');

            step = '9 dashboard';
            await page.goto(cu('/dashboard/editorial'));
            await idle(page);
            await page.getByRole('link', {name: /Active submissions/}).or(page.getByRole('button', {name: /Active submissions/})).first().click();
            await idle(page); await pause(1000);
            await page.locator('table tbody tr').first().waitFor({timeout: T});
            await idle(page); await pause(1000);
            const rows = page.locator('table tbody tr').filter({hasText: L.title});
            fact('step 9', {heading: flat(await page.getByRole('main').getByRole('heading', {level: 1}).first().innerText().catch(() => null), 100),
                rowsWithTitle: await rows.count(), rowTexts: (await rows.allInnerTexts()).map((t) => flat(t, 200)), copies: copies(),
                ids: sql(app, `select submission_id from submissions where submission_id > ${start.maxSubmission} order by 1`).split('\n').filter(Boolean)});
            await snap('09-dashboard');
        }

        step = 'N1 two presses';
        const n1Before = copies();
        await openPlugin();
        await upload(file);
        const p1 = await pressImport('n1-first-press');
        await chooseTab('Import');
        const p2 = await pressImport('n1-second-press');
        fact('N1', {first: {tabs: p1.tabs, text: flat(p1.resultsText, 200)}, second: {tabs: p2.tabs, text: flat(p2.resultsText, 200)}, importRequests: reqsIn(step), copiesBefore: n1Before, copiesAfter: copies()});

        step = 'N2 tools tabs';
        const permReqs = [];
        const onResp = (r) => { if (/\/permissions(\?|$)/.test(rel(r.url()))) permReqs.push(r.status()); };
        page.on('response', onResp);
        await page.goto(cu('/management/tools'));
        await idle(page);
        const toolTab = (name) => page.locator('#managementTabs > ul > li a.ui-tabs-anchor').filter({hasText: name}).first();
        await toolTab('Permissions').click(); await idle(page); await pause(1000);
        const afterFirst = permReqs.length;
        await toolTab('Import/Export').click(); await idle(page); await pause(1000);
        await toolTab('Permissions').click(); await idle(page); await pause(1000);
        page.off('response', onResp);
        fact('N2', {permissionsRequests: permReqs, afterFirstChoice: afterFirst, afterSecondChoice: permReqs.length});
        await snap('n2-permissions-again');
    } catch (e) {
        fact('walk error', {step, error: flat(e.message, 500)});
        await snap('error').catch(() => {});
    } finally {
        fact('errors', errors);
        record('facts', facts);
        await close();
    }
});
