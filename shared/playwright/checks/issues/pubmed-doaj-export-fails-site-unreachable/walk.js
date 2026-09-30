// Issue report walk: docs/issues/U63-OJS4-OJS7-pubmed-doaj-export-fails-site-unreachable.md
// (spec U63 register OJS4, OJS7). Takes the report's Steps through the
// screens on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), on its own journal `publicknowledge` and its manager
// `rvaca`. OJS only: OMP and OPS have neither tool.
//
// Precondition, not built by this script: the server cannot reach NLM's or
// DOAJ's site. A dataset fleet's config sets `[proxy]` `http_proxy` and
// `https_proxy` to "http://127.0.0.1:9", where nothing answers.
//
// The kit builds nothing. Everything goes through the screens:
//   steps: Tools › "PubMed XML Export Plugin" › "Export Articles", tick
//      "Signalling Theory Dividends", "Export Articles"; "Export Issues",
//      tick "Vol. 1 No. 2 (2014)", "Export Issues"; Tools › "DOAJ Export
//      Plugin" › "Articles", tick "Signalling Theory Dividends", the
//      validation box as it opens, "Export"
//   control: the DOAJ "Export" with the validation box unticked
//   neighbour (also walked with fix.diff applied): PubMed "Export Articles"
//      with nothing ticked, a file the PubMed DTD itself rejects (an empty
//      ArticleSet): it must stay refused with the fix in
// Each press records the response (status, Content-Disposition), the
// download (name, size, head) or the page it left for, and the server log.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-ir3 PROBE_AGENT=u63ojs4 node bin/probe.js ojs shared/playwright/checks/issues/pubmed-doaj-export-fails-site-unreachable/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u63ojs4 node bin/probe.js ojs shared/playwright/checks/issues/pubmed-doaj-export-fails-site-unreachable/walk.js
// Fix trial:    trial.sh beside this file (NEIGHBOUR_ONLY=1 takes the neighbour press alone).
// Facts: .reports/<feature>/u63ojs4/facts[-<run>]-ojs.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const REPO = path.resolve(__dirname, '../../../../..');
const NEIGHBOUR_ONLY = process.env.NEIGHBOUR_ONLY === '1';
const ARTICLE = 'Signalling Theory Dividends';
const ISSUE = 'Vol. 1 No. 2 (2014)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the PubMed and DOAJ tools are OJS's only
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const ctx = app.contextPath;
    const cu = (p) => app.url(`/index.php/${ctx}/en${p}`);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, context: ctx});
    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP|Error|Exception|#\d|\[5\d\d\]/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 300)).slice(0, 12);
        } catch { return [`(no log at ${logFile})`]; }
    };

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, s); return s; };

    async function openTool(toolName) {
        await page.goto(cu('/submissions'));
        await idle(page);
        const nav = page.getByRole('navigation', {name: 'Site Navigation'});
        const tools = nav.getByRole('link', {name: 'Tools', exact: true});
        if (await tools.count()) {
            await Promise.all([page.waitForURL(/management\/tools/, {timeout: T}), tools.first().click()]);
        } else {
            await page.goto(cu('/management/tools'));
            fact(`${toolName}: no "Tools" in the side menu, address typed`, true);
        }
        await idle(page);
        const link = page.getByRole('link', {name: toolName, exact: true}).first();
        await link.waitFor({timeout: T});
        await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
        await idle(page); await pause(500);
    }
    async function openTab(name) {
        await page.locator('.ui-tabs-nav').getByRole('link', {name, exact: true}).first().click();
        await idle(page); await pause(800);
    }

    // Press a button that posts the export form; the answer is a download or a page.
    async function pressExport(label, button, urlPart) {
        const from = logSize();
        let resp = null;
        const onResp = (r) => { if (r.url().includes(urlPart) && r.request().method() === 'POST') resp = r; };
        page.on('response', onResp);
        const dl = page.waitForEvent('download', {timeout: 45_000}).catch(() => null);
        await button.click();
        const r = await page.waitForResponse((x) => x.url().includes(urlPart) && x.request().method() === 'POST', {timeout: 45_000}).catch(() => resp);
        const h = r ? await r.allHeaders().catch(() => ({})) : {};
        const out = {
            request: r ? `${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}` : null,
            status: r ? r.status() : null,
            contentDisposition: h['content-disposition'] || null,
            contentType: h['content-type'] || null,
        };
        if (out.contentDisposition && /attachment/.test(out.contentDisposition)) {
            const d = await dl;
            if (d) {
                const file = path.join(REPO, '.reports', process.env.PROBE_FEATURE || 'x', process.env.PROBE_AGENT || 'x', `${label}${process.env.PROBE_RUN ? '-' + process.env.PROBE_RUN : ''}-${d.suggestedFilename()}`);
                await d.saveAs(file).catch(() => {});
                const body = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
                Object.assign(out, {download: d.suggestedFilename(), bytes: body.length, head: body.slice(0, 400)});
            }
            out.urlAfter = page.url().replace(/^https?:\/\/[^/]+/, '');
        } else {
            await page.waitForLoadState('load', {timeout: T}).catch(() => {});
            await pause(500);
            out.download = null;
            out.urlAfter = page.url().replace(/^https?:\/\/[^/]+/, '');
            out.headings = await page.locator('h2, h3').allInnerTexts().catch(() => []);
            out.errors = (await page.locator('body > p').allInnerTexts().catch(() => [])).slice(0, 8);
            out.xmlHead = ((await page.locator('pre').first().innerText().catch(() => '')) || '').slice(0, 600);
        }
        page.off('response', onResp);
        out.serverLog = logSince(from);
        await snap(label);
        await shot(page, label);
        fact(label, out);
        return out;
    }
    async function backToTool(toolName) {
        await page.goBack({timeout: T}).catch(() => null);
        await idle(page).catch(() => {});
        if (!/importexport\/plugin/.test(page.url())) await openTool(toolName);
        await pause(500);
    }

    try {
        await signIn(page, 'rvaca', {contextPath: ctx});

        // PubMed
        await openTool('PubMed XML Export Plugin');
        fact('pubmed tabs', await page.locator('.ui-tabs-nav li').allInnerTexts());
        await snap('pubmed-tool');
        if (!NEIGHBOUR_ONLY) {
            await openTab('Export Articles');
            const box = page.locator('#exportXmlForm label').filter({hasText: ARTICLE}).locator('input[name="selectedSubmissions[]"]').first();
            await box.waitFor({timeout: T});
            await box.check();
            fact('pubmed articles ticked', await page.locator('#exportXmlForm input[name="selectedSubmissions[]"]:checked').count());
            await snap('pubmed-export-articles-ticked');
            await pressExport('pubmed-export-articles', page.locator('#exportXmlForm').getByRole('button', {name: 'Export Articles', exact: true}), '/exportSubmissions');

            await backToTool('PubMed XML Export Plugin');
            await openTab('Export Issues');
            const row = page.locator('#exportIssuesXmlForm tr.gridRow').filter({hasText: ISSUE}).first();
            await row.waitFor({timeout: T});
            await row.locator('input[type="checkbox"]').check();
            await snap('pubmed-export-issues-ticked');
            await pressExport('pubmed-export-issues', page.locator('#exportIssuesXmlForm').getByRole('button', {name: 'Export Issues', exact: true}), '/exportIssues');

            // DOAJ
            await openTool('DOAJ Export Plugin');
            fact('doaj tabs', await page.locator('.ui-tabs-nav li').allInnerTexts());
            await openTab('Articles');
            const form = page.locator('#exportSubmissionXmlForm');
            const drow = form.locator('tr.gridRow').filter({hasText: ARTICLE}).first();
            await drow.waitFor({timeout: T});
            await drow.locator('input[type="checkbox"]').check();
            const v = form.locator('input[name="validation"]');
            fact('doaj validation box as it opens', {checked: await v.isChecked(), label: (await form.locator('label').filter({has: v}).first().innerText().catch(() => null)) || await form.locator('label[for^="validation"]').first().innerText().catch(() => null)});
            await snap('doaj-articles-ticked');
            await pressExport('doaj-export-validated', form.getByRole('button', {name: 'Export', exact: true}), '/exportSubmissions');

            // Control: the validation box unticked.
            await backToTool('DOAJ Export Plugin');
            await openTab('Articles');
            const f2 = page.locator('#exportSubmissionXmlForm');
            const r2 = f2.locator('tr.gridRow').filter({hasText: ARTICLE}).first();
            await r2.waitFor({timeout: T});
            await r2.locator('input[type="checkbox"]').check();
            await f2.locator('input[name="validation"]').uncheck();
            await pressExport('doaj-export-unvalidated', f2.getByRole('button', {name: 'Export', exact: true}), '/exportSubmissions');
            await openTool('PubMed XML Export Plugin');
        }

        // Neighbour: a file the PubMed DTD itself rejects (nothing ticked: an empty ArticleSet).
        await openTab('Export Articles');
        await page.locator('#exportXmlForm input[name="selectedSubmissions[]"]').first().waitFor({timeout: T});
        fact('neighbour: pubmed ticked', await page.locator('#exportXmlForm input[name="selectedSubmissions[]"]:checked').count());
        await pressExport('neighbour-pubmed-nothing-ticked', page.locator('#exportXmlForm').getByRole('button', {name: 'Export Articles', exact: true}), '/exportSubmissions');
    } catch (err) {
        fact('ERROR', String(err.stack || err).slice(0, 1200));
        await snap('ERROR').catch(() => {});
        await shot(page, 'ERROR').catch(() => {});
        throw err;
    } finally {
        record('facts', facts);
        await close();
    }
});
