// Issue report walk: docs/issues/U63-A11-export-selection-stops-at-page.md (spec U63
// register A11). Takes the report's Steps through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), on its
// own context `publicknowledge` and its manager `rvaca`.
//
// The kit builds nothing. Everything goes through the screens:
//   setup: Tools › "Native XML Plugin": "Select All" + export + "Download
//      Exported File" on the export tab, then that file imported five times
//      on "Import" (more than 100 submissions, so the list has two pages)
//   steps: "Select All" pressed twice on page 1; a line ticked on page 1,
//      one on page 2, back to page 1 (its tick read), page 2 again, export,
//      the file's submissions counted
//   neighbour (WALK=neighbour, on a freshly reset dataset: one page): "Select
//      All" twice, two lines ticked and one unticked, export; the file must
//      hold exactly the one ticked line, with the fix in and out.
//   WALK=pubmed (OJS): the PubMed tool's "Select All" pressed twice, one page;
//      its template changes with the fix. (The press's ONIX tool, whose
//      template changes too, shows only a publisher reminder on the dataset's
//      press and was not walked.)
// Records every screen with screen(); facts go to facts[-<run>]-<app>.json.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-ir3 PROBE_AGENT=u63a11 node bin/probe.js all shared/playwright/checks/issues/export-selection-stops-at-page/walk.js
// Neighbour:    WALK=neighbour in front (after a reset)
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u63a11 node bin/probe.js all shared/playwright/checks/issues/export-selection-stops-at-page/walk.js
// Trying the fix: fix-<app>.diff per app root (bin/try-fix.js apply … <app>).
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, idle, outFile} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const WALK = process.env.WALK || 'full';
const IMPORTS = 5;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {walk: WALK, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); record('facts', facts); };
    const ctx = app.contextPath;
    const cu = (p) => app.url(`/index.php/${ctx}/en${p}`);
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const exportTabName = isOJS ? 'Export Articles' : isOMP ? 'Export' : 'Export Preprints';
    const exportBtnName = isOJS ? 'Export Articles' : isOMP ? 'Export Submissions' : 'Export Preprints';

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); });
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, s); return s; };
    const tabsNow = () => page.locator('#importExportTabs [role="tab"]').evaluateAll((ts) => ts.map((t) => t.innerText.trim()));
    const panelText = async () => flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 2000);

    async function openTool(toolName) {
        // Side menu "Tools", then the tool's name on "Import/Export".
        await page.goto(cu('/submissions'));
        await idle(page);
        const toolsLink = page.getByRole('link', {name: 'Tools', exact: true});
        if (await toolsLink.count()) {
            await Promise.all([page.waitForURL(/management\/tools/, {timeout: T}), toolsLink.first().click()]);
        } else {
            await page.goto(cu('/management/tools'));
            facts.toolsTyped = true;
        }
        await idle(page);
        const link = page.getByRole('link', {name: toolName, exact: true}).first();
        await link.waitFor({timeout: T});
        await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
        await idle(page); await pause(500);
    }
    const list = () => page.locator('#exportXmlForm');
    const listSettle = async () => {
        let last = -1;
        for (let i = 0; i < 40; i++) {
            const c = await list().locator('.listPanel__item').count().catch(() => 0);
            if (c === last && c > 0) break;
            last = c; await pause(400);
        }
        await idle(page);
    };
    async function openExportTab() {
        await page.getByRole('tab', {name: exportTabName, exact: true}).first().click();
        await idle(page);
        await list().locator('.listPanel__item, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
        await listSettle();
    }
    const readList = () => list().evaluate((el) => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const items = [...el.querySelectorAll('.listPanel__item')].map((li) => {
            const box = li.querySelector('input[type=checkbox]');
            return {id: box ? box.value : null, checked: box ? box.checked : null, title: txt(li.querySelector('.listPanel__itemSubTitle'))};
        });
        const pag = el.querySelector('.pkpPagination');
        return {
            lines: items.length,
            ticked: items.filter((i) => i.checked).length,
            first: items[0] || null,
            header: txt(el.querySelector('.listPanel__header, .pkpHeader')),
            pagination: pag ? txt(pag) : null,
            currentPage: pag ? txt(pag.querySelector('[aria-current="true"]')) : null,
        };
    });
    const selectAll = () => list().getByRole('button', {name: /^Select (All|None)$/}).first();
    async function pressSelect(label) {
        await selectAll().click(); await pause(500);
        const o = {button: flat(await selectAll().innerText()), list: await readList()};
        fact(label, o);
        await snap(label);
        return o;
    }
    async function goPage(nr) {
        const b = list().locator('.pkpPagination__page', {hasText: new RegExp(`^\\s*${nr}\\s*$`)}).first();
        await b.click(); await pause(1000); await idle(page); await listSettle();
    }
    // Press the export button, then "Download Exported File"; returns the file's submissions.
    async function exportAndDownload(label) {
        const before = (await tabsNow()).length;
        await list().getByRole('button', {name: exportBtnName, exact: true}).click();
        for (let i = 0; i < 60; i++) {
            await pause(500);
            if ((await tabsNow()).length > before && /completed|Download|error/i.test((await panelText()) || '')) break;
        }
        await idle(page);
        const o = {tabs: await tabsNow(), panel: await panelText()};
        await snap(`${label}-results`);
        const btn = page.locator('#importExportTabs [role="tabpanel"]:visible').first().getByRole('button', {name: 'Download Exported File'});
        if (!(await btn.count())) { o.download = 'no button'; fact(label, o); return o; }
        const dlP = page.waitForEvent('download', {timeout: 60_000});
        await btn.first().click();
        const d = await dlP;
        const file = outFile(`${label}.xml`);
        await d.saveAs(file);
        const xml = fs.readFileSync(file, 'utf8');
        const tagName = isOMP ? 'monograph' : isOJS ? 'article' : 'preprint';
        const subs = xml.match(new RegExp(`<${tagName}[\\s>]`, 'g')) || [];
        o.file = {name: d.suggestedFilename(), bytes: xml.length, submissions: subs.length,
            titles: [...xml.matchAll(/<title locale="en">([^<]*)<\/title>/g)].map((m) => m[1]).slice(0, 6)};
        o.path = file;
        fact(label, o);
        await idle(page);
        return o;
    }

    // The submission ids in a Native XML file: the first internal id after each submission element.
    const subIds = (xml) => {
        const tagName = isOMP ? 'monograph' : isOJS ? 'article' : 'preprint';
        return [...xml.matchAll(new RegExp(`<${tagName}[\\s>][^]*?<id type="internal" advice="ignore">(\\d+)</id>`, 'g'))].map((m) => m[1]);
    };

    try {
        await signIn(page, 'rvaca');
        await openTool('Native XML Plugin');
        await snap('native-tool');

        if (WALK === 'full') {
            // --- setup: export every submission, import the file five times
            await openExportTab();
            const l0 = await readList();
            fact('setup: export list at start', l0);
            await pressSelect('setup: Select All on the full list');
            const all = await exportAndDownload('setup-export-all');
            for (let k = 1; k <= IMPORTS; k++) {
                await openTool('Native XML Plugin');
                await page.getByRole('tab', {name: 'Import', exact: true}).first().click();
                await idle(page);
                const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
                await page.locator('#importXmlForm input[type=file]').first().setInputFiles(all.path);
                const ur = await up;
                await idle(page); await pause(500);
                const before = (await tabsNow()).length;
                await page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}).click();
                let txt = '';
                for (let i = 0; i < 360; i++) {
                    await pause(500);
                    if ((await tabsNow()).length > before) {
                        txt = (await panelText()) || '';
                        if (/completed|failed|Errors|imported/i.test(txt)) break;
                    }
                }
                await idle(page);
                fact(`setup: import ${k}`, {upload: ur ? ur.status() : null, tabs: await tabsNow(), panel: flat(txt, 400)});
                if (k === 1) await snap('setup-import-1-results');
            }

            // --- step 6: the list after the imports
            await openTool('Native XML Plugin');
            await openExportTab();
            const l1 = await readList();
            fact('step 6: export list', l1);
            await snap('step6-export-list');
            await shot(page, 'step6-export-list');
            // --- steps 7, 8
            await pressSelect('step 7: Select All');
            await shot(page, 'step7-select-all');
            await pressSelect('step 8: pressed again');

            // --- steps 9-11: a tick on page 1, a tick on page 2, export
            await openTool('Native XML Plugin');
            await openExportTab();
            const first1 = list().locator('.listPanel__item').first();
            const t1 = {id: await first1.locator('input[type=checkbox]').getAttribute('value'), title: flat(await first1.locator('.listPanel__itemSubTitle').innerText())};
            await first1.locator('input[type=checkbox]').check();
            fact('step 9: ticked on page 1', t1);
            await goPage(2);
            const l2 = await readList();
            const first2 = list().locator('.listPanel__item').first();
            const t2 = {id: await first2.locator('input[type=checkbox]').getAttribute('value'), title: flat(await first2.locator('.listPanel__itemSubTitle').innerText())};
            await first2.locator('input[type=checkbox]').check();
            fact('step 10: page 2, ticked', {list: l2, ticked: t2, button: flat(await selectAll().innerText())});
            await snap('step10-page2-ticked');
            // --- steps 11, 12: back to page 1 (is its tick still shown?), then page 2 again
            const tickedOnScreen = async (id) => list().locator(`input[type=checkbox][value="${id}"]`).isChecked().catch(() => null);
            await goPage(1);
            fact('step 11: back on page 1', {list: await readList(), page1LineTicked: await tickedOnScreen(t1.id)});
            await snap('step11-back-on-page1');
            await goPage(2);
            fact('step 12: page 2 again', {list: await readList(), page2LineTicked: await tickedOnScreen(t2.id)});
            const ex = await exportAndDownload('step13-export');
            const xml = fs.readFileSync(ex.path, 'utf8');
            const idsIn = subIds(xml);
            fact('step 13: the file holds', {submissions: ex.file.submissions, page1Id: t1.id, page1InFile: idsIn.includes(t1.id), page2Id: t2.id, page2InFile: idsIn.includes(t2.id)});
            await snap('step13-after-download');
        } else if (WALK === 'neighbour') {
            // --- neighbour: one page (fresh dataset)
            await openExportTab();
            fact('neighbour: list', await readList());
            await pressSelect('neighbour: Select All');
            await pressSelect('neighbour: pressed again');
            const items = list().locator('.listPanel__item input[type=checkbox]');
            const ids = [];
            for (const i of [0, 1]) { ids.push(await items.nth(i).getAttribute('value')); await items.nth(i).check(); }
            await items.nth(1).uncheck();
            fact('neighbour: ticked two, unticked the second', {ids, list: await readList()});
            const ex = await exportAndDownload('neighbour-export');
            const xml = fs.readFileSync(ex.path, 'utf8');
            const idsIn = subIds(xml);
            fact('neighbour: the file holds', {submissions: ex.file.submissions, tickedInFile: idsIn.includes(ids[0]), untickedInFile: idsIn.includes(ids[1])});
        } else if (WALK === 'pubmed' && isOJS) {
            // --- neighbour: the PubMed tool's "Select All" (its template changes with the fix)
            await openTool('PubMed XML Export Plugin');
            await page.getByRole('tab', {name: 'Export Articles', exact: true}).first().click();
            await idle(page);
            await list().locator('.listPanel__item, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
            await listSettle();
            fact('neighbour: PubMed list', await readList());
            await pressSelect('neighbour: PubMed Select All');
            await pressSelect('neighbour: PubMed pressed again');
        }
        fact('dialogs', dialogs);
    } finally {
        await close();
    }
});
