// Issue report docs/issues/U19-A24-oai-driver-list-says-more-results.md (U19 A24) {OJS}: the
// report's steps 1 to 6, a `driver` set of more than a hundred records (the size of one
// part of an OAI list), walked through the screens on PKP's default test dataset as `admin`.
// The kit builds nothing; the hundred copies come from the journal's own export, as the Steps say.
//
//   1. sign in as admin
//   2. Tools › "Native XML Plugin" › "Export Articles": tick submission 17, "Export Articles",
//      "Download Exported File"
//   3. in a text editor, repeat the file's <article>…</article> element until it holds 34 (the
//      file stays under PHP's default upload limit of 2 MB) and put the 34 inside one
//      <articles xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
//      xsi:schemaLocation="http://pkp.sfu.ca native.xsd"> … </articles> element
//   4. Tools › "Native XML Plugin" › "Import": upload the file, "Import"; three times (102 copies,
//      published in "Vol. 1 No. 2 (2014)", each with the galley of 17)
//   5. Settings › Website › "Plugins" › "Generic Plugins": tick "DRIVER"
//   6. …/oai?verb=ListRecords&metadataPrefix=oai_dc&set=driver, "Resume" until the list ends;
//      the same without set=driver (the control); ListIdentifiers both ways (one part holds 500)
//
// Reset first:  npm run fleet-prep -- --feature issues-a23 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-a23 PROBE_AGENT=a24large node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-list-says-more-results/large.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-a23-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-a23-3_5 PROBE_AGENT=a24large node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-list-says-more-results/large.js
const fs = require('fs');
const {forEachApp, launch, signIn, record, outFile, idle, shot} = require('../../../probe');
const L = require('../oai-driver-set-lists-article-without-galley/lib');
const native = require('../unknown-section-import-broken-submission/lib');

const TITLE = 'Antimicrobial, heavy metal resistance and plasmid profile of coliforms';
const COPIES = 34;
const TIMES = 3;
const IDS = 'verb=ListIdentifiers&metadataPrefix=oai_dc';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return console.log(`[walk] ${app.name}: no "DRIVER" plugin; not walked`);
    if (!app.dataset) throw new Error('large.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const f = {app: app.name, line: app.line || 'main', lists: {}};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1200)}`);
    };
    const list = async (name, params) => {
        const parts = await L.askAll(app, name, params, 12);
        const all = parts.flatMap((p) => p.headers.map((h) => h.replace(/ \[.*$/, '')));
        const out = {
            parts: parts.map((p) => ({records: p.count, token: p.token, error: p.error})),
            listed: all.length,
            distinct: new Set(all).size,
        };
        f.lists[name] = {...out, identifiers: all};
        console.log(`[fact] ${app.name} ${name}: ${JSON.stringify(out)}`);
        return out;
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, 'admin');
        await native.openNative(app, page);
        const out = await native.exportOne(app, page, TITLE);
        const m = out.xml.match(/<article[\s>][\s\S]*<\/article>/);
        if (!m) throw new Error('the export holds no <article> element');
        const file = outFile('copies.xml');
        const root = '<articles xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca native.xsd">';
        fs.writeFileSync(file, out.xml.replace(m[0], `${root}\n${Array(COPIES).fill(m[0]).join('\n')}\n</articles>`));
        fact('3 file', {articleElements: COPIES, megabytes: Math.round(fs.statSync(file).size / 1e5) / 10});
        const imports = [];
        for (let i = 1; i <= TIMES; i++) {
            await native.openNative(app, page);
            await page.getByRole('tab', {name: 'Import', exact: true}).first().click();
            await idle(page).catch(() => {});
            const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: 120_000});
            await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
            const uploaded = (await up).status();
            await idle(page).catch(() => {});
            await L.sleep(800);
            const before = await page.locator('#importExportTabs [role="tab"]').count();
            await page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}).click();
            let panel = '';
            for (let t = 0; t < 480; t++) {
                await L.sleep(1000);
                if ((await page.locator('#importExportTabs [role="tab"]').count()) <= before) continue;
                panel = await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => '');
                if (/completed|failed|error/i.test(panel)) break;
            }
            await shot(page, `import-results-${i}`).catch(() => {});
            imports.push({
                uploaded,
                says: L.flat(panel, 120),
                submissionsNamed: (panel.match(/"\d+" - "/g) || []).length,
                errors: L.flat((panel.match(/Errors? occur+ed:[\s\S]*/) || [''])[0], 300),
            });
        }
        fact('4 imports', imports);
        fact('5 DRIVER ticked', await L.setDriver(page, true));
        await list('6 ListIdentifiers, no set', IDS);
        await list('6 ListIdentifiers, set=driver', `${IDS}&set=driver`);
        await list('6 ListRecords, set=driver', `${L.LIST}&set=driver`);
        await list('6 ListRecords, no set', L.LIST);
        fact('6 browser view, set=driver', (await L.view(page, app, '6 records set=driver', `${L.LIST}&set=driver`, 4)).map((p) => ({part: p.part, moreResults: p.moreResults, resume: p.resume, error: p.error})));
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 800);
        console.log(`[walk] ${app.name} ERROR ${f.error}`);
    } finally {
        record('facts-large', f);
        await close();
    }
});
