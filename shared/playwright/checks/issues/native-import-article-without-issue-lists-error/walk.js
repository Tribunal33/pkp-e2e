// Issue report walk: docs/issues/U63-A8-native-import-article-without-issue-lists-error.md
// (spec U63 register A8). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own context `publicknowledge`, as its own manager `rvaca`. The kit
// builds nothing; everything goes through the screens:
//   1–2  sign in as rvaca, Tools › "Native XML Plugin"
//   3–4  the export tab: tick the submission, export, "Download Exported File"
//   5–6  "Import" tab, "Upload File" (the downloaded file), "Import"; the results tab is read
// Per app:
//   OJS  submission 8 (in no issue: the Steps) and submission 17 (published in
//        Vol. 1 No. 2 (2014): the control, and the neighbour check for the fix:
//        its copy must still land in that issue with no line under the success text)
//   OMP  submission 3, OPS submission 1 (controls: no issues on a press or a server)
// Besides the screens it reads, from the database, the issue each imported copy sits in.
//
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63a8 node bin/probe.js all shared/playwright/checks/issues/native-import-article-without-issue-lists-error/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u63a8 node bin/probe.js all shared/playwright/checks/issues/native-import-article-without-issue-lists-error/walk.js
// NEIGHBOUR_ONLY=1 walks OJS submission 17 alone (the neighbour check).
// Fix trial:    trial.sh beside this file.
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, idle, sql, outFile} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const TABS = {
    ojs: {exportTab: 'Export Articles', exportBtn: 'Export Articles', results: 'Import Results'},
    omp: {exportTab: 'Export', exportBtn: 'Export Submissions', results: 'Results'},
    ops: {exportTab: 'Export Preprints', exportBtn: 'Export Preprints', results: 'Import Results'},
};
const SUBS = {
    ojs: [{id: 8, title: 'Traditions and Trends in the Study of the Commons'},
        {id: 17, title: 'Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran'}],
    omp: [{id: 3, title: 'The Political Economy of Workplace Injury in Canada'}],
    ops: [{id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'}],
};
const IMPORT_RE = /NativeImportExportPlugin\/import\?/;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const L = TABS[app.name];
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1200)}`); };
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    let step = 'start';
    const errors = [];
    page.on('pageerror', (e) => errors.push({step, kind: 'pageerror', text: flat(e.message, 300)}));
    page.on('response', (r) => {
        if (r.status() >= 400) errors.push({step, kind: 'http', text: `${r.status()} ${r.request().method()} ${rel(r.url()).replace(/csrfToken=[^&]+/, 'csrf').slice(0, 200)}`});
    });
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    };
    const tabNames = () => page.locator('#importExportTabs > ul > li a.ui-tabs-anchor').evaluateAll((as) => as.map((a) => a.innerText.trim()));
    const panel = () => page.locator('#importExportTabs > [role="tabpanel"]:visible').first();
    const openPlugin = async () => {
        await page.goto(cu('/management/tools'));
        await idle(page);
        await page.getByRole('link', {name: 'Native XML Plugin', exact: true}).first().click();
        await page.locator('#importExportTabs').waitFor({timeout: T});
        await idle(page);
    };
    const chooseTab = async (name) => {
        await page.locator('#importExportTabs > ul > li a.ui-tabs-anchor').filter({hasText: new RegExp(`^${name}$`)}).first().click();
        await idle(page); await pause(1000); await idle(page);
    };
    try {
        step = '1 sign in';
        await signIn(page, 'rvaca');
        // NEIGHBOUR_ONLY=1 takes submission 17 alone (the fix trial's walk without the fix).
        for (const S of SUBS[app.name].filter((x) => !process.env.NEIGHBOUR_ONLY || x.id === 17)) {
            const maxBefore = Number(sql(app, 'select max(submission_id) from submissions'));
            step = `2 plugin (${S.id})`;
            await openPlugin();
            step = `3-4 export ${S.id}`;
            await chooseTab(L.exportTab);
            await page.locator('#exportSubmissions-tab .listPanel__item').first().waitFor({timeout: T});
            await page.locator('#exportSubmissions-tab .listPanel__item').filter({hasText: S.title}).first().locator('input[type=checkbox]').check();
            await page.locator('#exportSubmissions-tab').getByRole('button', {name: L.exportBtn, exact: true}).click();
            const dlBtn = panel().getByRole('button', {name: 'Download Exported File'});
            await dlBtn.waitFor({timeout: 60_000});
            const dl = page.waitForEvent('download', {timeout: T});
            await dlBtn.click();
            const d = await dl;
            const file = outFile(`u63a8-sub${S.id}.xml`);
            fs.writeFileSync(file, fs.readFileSync(await d.path(), 'utf8'));
            const xml = fs.readFileSync(file, 'utf8');
            fact(`file ${S.id}`, {downloaded: d.suggestedFilename(), bytes: xml.length, issueIdentification: (xml.match(/<issue_identification>[\s\S]*?<\/issue_identification>/) || [null])[0], status: (xml.match(/<publication [^>]*\sstatus="(\d+)"/) || [])[1] || null});

            step = `5 upload ${S.id}`;
            await chooseTab('Import');
            const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
            await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
            await up; await idle(page);

            step = `6 import ${S.id}`;
            const before = (await tabNames()).length;
            const answered = page.waitForResponse((r) => IMPORT_RE.test(r.url()), {timeout: 60_000}).catch(() => null);
            await page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}).click();
            const r = await answered;
            for (let i = 0; i < 20 && (await tabNames()).length === before; i++) await pause(300);
            await idle(page); await pause(800);
            const resultsText = await panel().innerText().catch(() => null);
            const copies = sql(app, `select s.submission_id, p.status, ${app.name === 'ojs' ? 'p.issue_id' : 'null'} from submissions s join publications p on p.submission_id = s.submission_id where s.submission_id > ${maxBefore} order by p.publication_id`).split('\n').filter(Boolean);
            fact(`import ${S.id}`, {importStatus: r ? r.status() : 'no request', tabs: await tabNames(), resultsText, resultsLines: String(resultsText || '').split('\n').map((l) => l.trim()).filter(Boolean),
                errorsOccured: /Errors occured:/.test(resultsText || ''), copies});
            await snap(`import-results-sub${S.id}`);
        }
    } catch (e) {
        fact('walk error', {step, error: flat(e.message, 500)});
        await snap('error').catch(() => {});
    } finally {
        fact('errors', errors);
        record('facts', facts);
        await close();
    }
});
