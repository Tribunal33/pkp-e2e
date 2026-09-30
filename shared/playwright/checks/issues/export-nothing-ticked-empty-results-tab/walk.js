// Issue report walk: docs/issues/U63-A12-export-nothing-ticked-empty-results-tab.md
// (spec U63 register A12, spec U74 register A16). Takes the report's Steps
// through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), on its own context `publicknowledge` and
// its manager `rvaca`.
//
// The kit builds nothing. Everything goes through the screens:
//   press only (precondition for the ONIX tool): Settings › Press ›
//      "Masthead", the four "Publisher Identity" fields, "Save"
//   steps: Tools › "Native XML Plugin" › "Export Articles" ("Export
//      Submissions", "Export Preprints"), nothing ticked, the button;
//      journal: "Export Issues", nothing ticked, the button; press:
//      Tools › "ONIX 3.0 Monograph Export Plugin" › "Export", nothing
//      ticked, "Export Submissions" with the validation box ticked, then
//      unticked
//   control and neighbour check (also walked with fix.diff applied): one
//      line ticked on each list, the same button; the export must go on
//      as before (the Native XML file; on the press's ONIX tool the
//      failure the spec records as U74 A1)
// Records every screen with screen(); each press's requests, the browser
// dialog it raised and the server log lines it wrote go into the facts.
//
// Trying the fix (REPORT.md "Proposed fix", harness.md "Trying a fix"):
//   the fix touches pkp-lib and two apps, so it is one diff per app root:
//   for a in ojs omp ops; do node bin/try-fix.js apply shared/playwright/checks/issues/export-nothing-ticked-empty-results-tab/fix-$a.diff $a; done
//   reset, run as below with PROBE_RUN=fix, then: node bin/try-fix.js revert ojs omp ops
//   The neighbour presses alone, without the fix: NEIGHBOUR_ONLY=1 in front of the run.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u63a12 node bin/probe.js all shared/playwright/checks/issues/export-nothing-ticked-empty-results-tab/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u63a12 node bin/probe.js all shared/playwright/checks/issues/export-nothing-ticked-empty-results-tab/walk.js
// Facts: .reports/<feature>/u63a12/facts[-<run>]-<app>.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, tag} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const REPO = path.resolve(__dirname, '../../../../..');
// NEIGHBOUR_ONLY=1 takes only the control and neighbour presses (one line ticked).
const NEIGHBOUR_ONLY = process.env.NEIGHBOUR_ONLY === '1';

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const t = tag('u63a12');
    const ctx = app.contextPath; // publicknowledge
    const loc = app.line && /3_4|3_3/.test(app.line) ? '' : '/en';
    const cu = (p) => app.url(`/index.php/${ctx}${loc}${p}`);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, context: ctx, tag: t});
    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            const buf = fs.readFileSync(logFile);
            return buf.slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP|Error|Exception|Stack|#\d|\[5\d\d\]/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 14);
        } catch { return [`(no log at ${logFile})`]; }
    };

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); });
    let n = 0;
    async function snap(name) {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        return s;
    }
    const tabTitles = () => page.locator('.ui-tabs-nav li').evaluateAll((ls) => ls.map((l) => l.textContent.replace(/\s+/g, ' ').trim()));

    async function openTool(toolName) {
        // Side menu "Tools", then the tool's name on "Import/Export".
        await page.goto(cu('/submissions'));
        await idle(page);
        const nav = page.getByRole('navigation', {name: 'Site Navigation'});
        const toolsLink = nav.getByRole('link', {name: 'Tools', exact: true});
        if (await toolsLink.count()) {
            await Promise.all([page.waitForURL(/management\/tools/, {timeout: T}), toolsLink.first().click()]);
        } else {
            await page.goto(cu('/management/tools'));
            fact(`${toolName}: side menu had no "Tools" link, address typed`, true);
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

    // Press the export button of a form; record the bounce, the tab request,
    // the dialog, the tabs and the new tab's text, and the server log.
    async function pressExport(label, formSel, buttonName) {
        const form = page.locator(formSel);
        const tabsBefore = await tabTitles();
        const from = logSize();
        const d0 = dialogs.length;
        const reqs = [];
        const onResp = (r) => {
            const u = r.url();
            if (/\/plugin\/[A-Za-z0-9]+ExportPlugin\//.test(u) && !/fetchGrid|\.js|\.css/.test(u)) {
                reqs.push({method: r.request().method(), url: u.replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]+/, 'csrfToken=…'), status: r.status()});
            }
        };
        page.on('response', onResp);
        // The page's notices (the toasts at the page's foot) live 5 s: read them while waiting.
        const notices = new Set();
        let watching = true;
        const watch = (async () => {
            while (watching) {
                const txt = await page.locator('.app__notifications').allInnerTexts().catch(() => []);
                txt.map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean).forEach((x) => notices.add(x));
                await pause(200);
            }
        })();
        await form.getByRole('button', {name: buttonName, exact: true}).first().click();
        // The bounce answers first; the tab's own request follows when a tab is added.
        await page.waitForResponse((r) => /Bounce/.test(r.url()), {timeout: T}).catch(() => null);
        await page.waitForResponse((r) => /\/(exportSubmissions|exportIssues)\?/.test(r.url()), {timeout: 4000}).catch(() => null);
        await idle(page); await pause(1500);
        watching = false;
        await watch;
        page.off('response', onResp);
        const tabsAfter = await tabTitles();
        const active = page.locator('.ui-tabs-panel:visible').last();
        const panelText = ((await active.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 500);
        const download = await active.getByRole('button', {name: 'Download Exported File'}).count().catch(() => 0);
        const s = await snap(`${label}`);
        await shot(page, label);
        fact(label, {
            tabsBefore, tabsAfter,
            activeTab: await page.locator('.ui-tabs-nav li.ui-tabs-active, .ui-tabs-nav li.ui-state-active').first().innerText().catch(() => null),
            panelText, downloadButton: download,
            requests: reqs,
            dialogs: dialogs.slice(d0),
            notices: [...notices],
            serverLog: logSince(from),
        });
        return s;
    }

    async function tickFirstListLine(formSel) {
        const box = page.locator(`${formSel} input[name="selectedSubmissions[]"]`).first();
        await box.waitFor({timeout: T});
        await box.check();
        const title = await box.locator('xpath=..').innerText().catch(() => null);
        return (title || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    }

    async function closeResultTabs() {
        // Reload the tool page: result tabs are not kept, ticks are cleared.
        await page.reload();
        await idle(page); await pause(500);
    }

    try {
        await signIn(page, 'rvaca', {contextPath: ctx});

        // Native XML tool.
        await openTool('Native XML Plugin');
        // The button: "Export Articles", "Export Submissions", "Export Preprints";
        // the tab carries the same name, except on a press, where it is "Export".
        const exportName = {ojs: 'Export Articles', omp: 'Export Submissions', ops: 'Export Preprints'}[app.name];
        const exportTab = app.name === 'omp' ? 'Export' : exportName;
        fact('native tabs', await tabTitles());
        await openTab(exportTab);
        await page.locator('#exportXmlForm input[name="selectedSubmissions[]"]').first().waitFor({timeout: T});
        fact('native list ticked before press', await page.locator('#exportXmlForm input[name="selectedSubmissions[]"]:checked').count());
        await snap('native-export-tab-nothing-ticked');
        if (!NEIGHBOUR_ONLY) await pressExport('native-nothing-ticked', '#exportXmlForm', exportName);

        if (app.name === 'ojs' && !NEIGHBOUR_ONLY) {
            await openTab('Export Issues');
            await page.locator('#exportIssuesXmlForm input[type="checkbox"]').first().waitFor({timeout: T});
            fact('issues grid rows', (await page.locator('#exportIssuesXmlForm tr.gridRow').allInnerTexts()).map((x) => x.replace(/\s+/g, ' ').trim()));
            fact('issues ticked before press', await page.locator('#exportIssuesXmlForm input[type="checkbox"]:checked').count());
            await pressExport('issues-nothing-ticked', '#exportIssuesXmlForm', 'Export Issues');
        }

        // Control / neighbour: one line ticked, the export goes on.
        await closeResultTabs();
        await openTab(exportTab);
        fact('native control ticked', await tickFirstListLine('#exportXmlForm'));
        await pressExport('native-one-ticked', '#exportXmlForm', exportName);
        if (app.name === 'ojs') {
            await openTab('Export Issues');
            const row = page.locator('#exportIssuesXmlForm tr.gridRow').filter({hasText: 'Vol. 1 No. 2 (2014)'}).first();
            await row.locator('input[type="checkbox"]').check();
            fact('issues control ticked', 'Vol. 1 No. 2 (2014)');
            await pressExport('issues-one-ticked', '#exportIssuesXmlForm', 'Export Issues');
        }

        if (app.name === 'omp') {
            // Precondition: the press's four ONIX details, Settings › Press › "Masthead".
            await page.goto(cu('/management/settings/context'));
            await idle(page); await pause(500);
            const mh = page.locator('#masthead');
            await mh.getByLabel('Press Publisher Name').first().fill('Public Knowledge Press');
            await mh.getByLabel('Geographical Location').first().fill('Vancouver');
            await mh.getByLabel('Publisher Code Type').first().selectOption({label: 'ARK (35)'});
            await mh.getByLabel('Publisher Code', {exact: true}).first().fill(t);
            const w = page.waitForResponse((r) => /api\/v1\/contexts/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await mh.getByRole('button', {name: 'Save', exact: true}).first().click();
            const r = await w;
            await idle(page); await pause(600);
            await snap('press-masthead-saved');
            fact('masthead saved', {status: r ? r.status() : null});

            await openTool('ONIX 3.0 Monograph Export Plugin');
            fact('onix tabs', await tabTitles());
            await page.locator('#exportXmlForm input[name="selectedSubmissions[]"]').first().waitFor({timeout: T});
            const v = page.locator('#exportXmlForm input[name="validation"]');
            fact('onix validation box', {checked: await v.isChecked(), label: await page.locator('label[for="validation"], #exportXmlForm label:has(input[name="validation"])').first().innerText().catch(() => null)});
            await snap('onix-export-tab-nothing-ticked');
            if (!NEIGHBOUR_ONLY) {
                await pressExport('onix-nothing-ticked-validation-on', '#exportXmlForm', 'Export Submissions');
                await openTab('Export');
                await v.uncheck();
                await pressExport('onix-nothing-ticked-validation-off', '#exportXmlForm', 'Export Submissions');
            }
            // Neighbour: one book ticked (the export itself fails as U74 A1 records, before and after the fix).
            await closeResultTabs();
            await openTab('Export');
            fact('onix control ticked', await tickFirstListLine('#exportXmlForm'));
            await pressExport('onix-one-ticked', '#exportXmlForm', 'Export Submissions');
        }
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
