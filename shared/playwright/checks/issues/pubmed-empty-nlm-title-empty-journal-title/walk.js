// Kept walk for docs/issues/U63-OJS3-pubmed-empty-nlm-title-empty-journal-title.md
// (spec U63 register OJS3). Takes the report's Steps through the screens on a
// fresh load of PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), as `rvaca` (Journal manager) in `publicknowledge`:
//   Saving the Settings tab as it opens: Tools › "PubMed XML Export Plugin";
//     "Export Articles" with "Signalling Theory Dividends" ticked (never
//     saved); "Settings" › "Save" with the box as it opens; export again.
//   Clearing an abbreviation: type "J Pub Knowl", "Save", export; clear the
//     box, "Save", export.
// Each export reads <JournalTitle> from the downloaded file or, where the
// install cannot reach NLM's site (test installs; U63 OJS4), from the file's
// text under "Invalid XML:" on the page the export leaves for.
// NEIGHBOUR_ONLY=1 walks steps 1, 2, 6 and 7 alone: a saved abbreviation must
// still be the file's journal title (walked with the fix in and out).
// OJS only: OMP and OPS have no PubMed tool. The kit builds nothing.
// Records every screen with screen(); no assertions. Facts: facts[-<run>]-ojs.json
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63ojs3 node bin/probe.js ojs shared/playwright/checks/issues/pubmed-empty-nlm-title-empty-journal-title/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u63ojs3 node bin/probe.js ojs shared/playwright/checks/issues/pubmed-empty-nlm-title-empty-journal-title/walk.js
// Fix trial:    trial.sh beside this file.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const REPO = path.resolve(__dirname, '../../../../..');
const NEIGHBOUR_ONLY = process.env.NEIGHBOUR_ONLY === '1';
const ARTICLE = 'Signalling Theory Dividends';
const TOOL = 'PubMed XML Export Plugin';
const ABBREV = 'J Pub Knowl';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the PubMed tool is OJS's only
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const old = ['stable-3_4_0', 'stable-3_3_0'].includes(app.line);
    const cu = (p) => app.url(`/index.php/${app.contextPath}${old ? '' : '/en'}${p}`);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, context: app.contextPath});

    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, s); return s; };

    async function openTool() {
        await page.goto(cu('/management/tools'));
        await idle(page);
        const link = page.getByRole('link', {name: TOOL, exact: true}).first();
        if (!(await link.count())) return false;
        await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
        await idle(page);
        await page.locator('#pubmedSettingsForm').first().waitFor({timeout: T});
        await pause(300);
        return true;
    }
    const box = () => page.locator('#pubmedSettingsForm [name="nlmTitle"]').first();

    async function save(label, value) {
        await openTool();
        const before = await box().inputValue();
        if (value !== null) await box().fill(value);
        const resp = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
        await page.locator('#pubmedSettingsForm').getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await idle(page).catch(() => {});
        await pause(500);
        const s = await snap(label);
        await page.reload(); await idle(page);
        await page.locator('#pubmedSettingsForm').first().waitFor({timeout: T});
        // Evidence only (not a step): the stored row the save wrote.
        let stored;
        try { stored = sql(app, "SELECT setting_type || '|[' || COALESCE(setting_value, 'NULL') || ']' FROM plugin_settings WHERE plugin_name = 'pubmedexportplugin' AND setting_name = 'nlmTitle'") || '(no row)'; } catch (e) { stored = String(e).slice(0, 200); }
        fact(label, {boxBefore: before, typed: value, status: r ? r.status() : null, notices: s.notices, boxAfterReload: await box().inputValue(), storedRow: stored});
        return stored;
    }

    async function exportArticle(label) {
        await openTool();
        await page.getByRole('tab', {name: 'Export Articles', exact: true}).first().click();
        await idle(page); await pause(500);
        const tick = page.locator('#exportXmlForm label').filter({hasText: ARTICLE}).locator('input[name="selectedSubmissions[]"]').first();
        await tick.waitFor({timeout: T});
        await tick.check();
        const dl = page.waitForEvent('download', {timeout: 45_000}).catch(() => null);
        const respP = page.waitForResponse((x) => x.url().includes('/exportSubmissions') && x.request().method() === 'POST', {timeout: 45_000}).catch(() => null);
        await page.locator('#exportXmlForm').getByRole('button', {name: 'Export Articles', exact: true}).click();
        const r = await respP;
        const h = r ? await r.allHeaders().catch(() => ({})) : {};
        const out = {status: r ? r.status() : null, contentDisposition: h['content-disposition'] || null};
        let xml = '';
        if (out.contentDisposition && /attachment/.test(out.contentDisposition)) {
            const d = await dl;
            if (d) {
                const file = path.join(REPO, '.reports', process.env.PROBE_FEATURE || 'x', process.env.PROBE_AGENT || 'x', `${label}${process.env.PROBE_RUN ? '-' + process.env.PROBE_RUN : ''}-${d.suggestedFilename()}`);
                await d.saveAs(file).catch(() => {});
                xml = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
                out.download = d.suggestedFilename();
            }
            out.readFrom = 'downloaded file';
        } else {
            await page.waitForLoadState('load', {timeout: T}).catch(() => {});
            await pause(500);
            const body = await page.locator('body').innerText().catch(() => '');
            out.pageHeadings = (await page.locator('h2, h3').allInnerTexts().catch(() => [])).slice(0, 4);
            const i = body.indexOf('Invalid XML:');
            xml = i >= 0 ? body.slice(i) : body;
            out.readFrom = 'the page\'s "Invalid XML:" text';
            await snap(label);
            await shot(page, label);
        }
        const m = xml.match(/<JournalTitle>([\s\S]*?)<\/JournalTitle>|<JournalTitle\s*\/>/);
        out.journalTitleElement = m ? m[0] : '(no JournalTitle element)';
        out.journalTitle = m ? (m[1] ?? '') : null;
        fact(label, out);
        return out;
    }

    try {
        await signIn(page, 'rvaca');
        if (!(await openTool())) { fact('tool', `no "${TOOL}" on Tools › Import/Export`); return; }
        await snap('settings-open');
        fact('settings as opened', {tabs: await page.getByRole('tab').allInnerTexts(), nlmTitle: await box().inputValue()});
        if (!NEIGHBOUR_ONLY) {
            await exportArticle('step3-export-never-saved');
            await save('step4-save-as-opened', null);
            await exportArticle('step5-export-after-save-as-opened');
        }
        await save('step6-save-abbreviation', ABBREV);
        await exportArticle('step7-export-with-abbreviation');
        if (!NEIGHBOUR_ONLY) {
            await save('step8-save-cleared', '');
            await exportArticle('step9-export-after-clearing');
        }
        await signOut(page).catch(() => {});
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
