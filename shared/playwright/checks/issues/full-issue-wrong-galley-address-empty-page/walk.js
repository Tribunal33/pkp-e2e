// Issue report walk: docs/issues/U50-A14-full-issue-wrong-galley-address-empty-page.md
// (spec U50 register A14). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no issues): the editor `dbarnes` gives "Vol. 1
// No. 2 (2014)" a "Full Issue" galley "PDF"; signed out, a visitor opens it
// from the issue's page (the reader and its "Download" address noted), then
// the issue's address with a galley number and a word the issue does not
// have; `dbarnes` deletes the galley and the visitor opens the two noted
// addresses again.
//
// Arguments (after the script):
//   (none)      the Steps (1-9).
//   neighbour   the fix check: steps 1-3, then signed out the galley's
//               reader and its "Download" (both must still open the galley),
//               and the unpublished issue's `issue/view/2/999` beside
//               `issue/view/2` (both must stay refused).
//
// The kit builds nothing. Every screen is recorded with screen(); each
// address's status, landing, heading and the fleet's server log lines after
// it go into the facts.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/full-issue-wrong-galley-address-empty-page/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const T = 30_000;
const ISSUE = 'Vol. 1 No. 2 (2014)';
const FILES = path.join(__dirname, '../../../../../apps/ojs/playwright/fixtures/files');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[${app.name}] no issues on this app; nothing to walk`);
        return;
    }
    if (!app.dataset) throw new Error('the walk drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {IssuesAdmin, IssueReader} = require('../../../pages/IssuesPages.js');
    const cp = app.contextPath;
    const ctx = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? `/index.php/${cp}` : `/index.php/${cp}/en`;
    const label = `a14-${MODE}`;
    const facts = {label, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\[5\d\d\]|Fatal|Uncaught|PHP (Warning|Error)/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${label}-${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const here = () => page.url().replace(app.baseURL, '');
    const h1 = () => page.locator('.pkp_structure_main h1, main h1').first().innerText({timeout: 3000}).then(flat).catch(() => null);
    const pageFacts = async () => ({
        landed: here(),
        title: await page.title().catch(() => null),
        h1: await h1(),
        bodyChars: (await page.locator('body').innerText({timeout: 3000}).catch(() => '')).length,
        reader: await page.locator('#pdfCanvasContainer, iframe[src*="pdfJsViewer"]').count(),
        message: flat(await page.locator('.pkp_structure_main .page_message, .pkp_structure_main p').first().innerText({timeout: 1500}).catch(() => null), 300) || null,
    });

    /** Type an address into the bar: its first answer, where it lands, the log. */
    async function visit(name, address) {
        const from = logSize();
        const url = app.url(address);
        const first = page.waitForResponse((r) => r.url() === url, {timeout: 15_000}).catch(() => null);
        const download = page.waitForEvent('download', {timeout: 8_000}).catch(() => null);
        let resp = null; let gotoError = null;
        try { resp = await page.goto(url, {timeout: T}); } catch (e) { gotoError = flat(e.message, 200); }
        const f = await first;
        const dl = gotoError ? await download : null;
        await idle(page).catch(() => {});
        const out = {address, status: resp ? resp.status() : null, gotoError};
        if (f) out.firstAnswer = {status: f.status(), location: f.headers()['location'] || null, disposition: f.headers()['content-disposition'] || null};
        if (dl) out.download = dl.suggestedFilename();
        Object.assign(out, await pageFacts());
        await pause(300);
        out.log = logSince(from);
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }

    try {
        // ------------------------------------------------ steps 1-3: the editor
        await signIn(page, 'dbarnes', {contextPath: cp});
        fact('signed-in', here());
        const issues = new IssuesAdmin(page, cp);
        await issues.goto('Back Issues');
        const win = await issues.openManagement('Back Issues', ISSUE);
        await win.openTab('Issue Galleys');
        const g = await win.openCreateGalley();
        await g.labelBox().fill('PDF');
        const up = await g.upload(path.join(FILES, 'article.pdf'));
        fact('galley-upload', up ? up.status() : null);
        const saved = await g.save();
        fact('galley-save', saved ? saved.status() : null);
        fact('galley-rows', await win.galleyLabels().allInnerTexts());
        await snap('galley-created');
        await win.close().catch(() => {});
        fact('issue-galleys-db', sql(app, 'SELECT galley_id, issue_id, label, url_path FROM issue_galleys ORDER BY 1'));
        await signOut(page);

        // ------------------------------------------------ step 4: the reader
        const reader = new IssueReader(page, cp);
        await reader.gotoHome();
        await reader.pressHeader('Archives');
        await page.locator('.pkp_structure_main').getByRole('link', {name: ISSUE, exact: true}).first().click();
        await page.waitForLoadState('load');
        await idle(page);
        fact('issue-page', await pageFacts());
        await snap('issue-page');
        const fullIssue = page.locator('.obj_issue_toc .galleys .galleys_links a');
        fact('full-issue-links', await fullIssue.allInnerTexts());
        const from4 = logSize();
        await fullIssue.filter({hasText: 'PDF'}).first().click();
        await page.waitForLoadState('load');
        await idle(page);
        const readerAddress = here();
        const downloadLink = page.getByRole('link', {name: /Download/}).first();
        const downloadAddress = ((await downloadLink.getAttribute('href').catch(() => null)) || '').replace(app.baseURL, '');
        fact('step4-reader', {...(await pageFacts()), readerAddress, downloadAddress, log: logSince(from4)});
        await snap('step4-reader');

        if (MODE === 'neighbour') {
            // the galley that exists: its "Download" still serves the file
            const from = logSize();
            const dl = page.waitForEvent('download', {timeout: 15_000}).catch(() => null);
            await downloadLink.click();
            const d = await dl;
            fact('neighbour-download', {file: d ? d.suggestedFilename() : null, log: logSince(from)});
            // the unpublished issue stays refused, with and without a galley number
            await visit('neighbour-unpublished-issue', `${ctx}/issue/view/2`);
            await visit('neighbour-unpublished-issue-999', `${ctx}/issue/view/2/999`);
            return;
        }

        // ------------------------------------------------ steps 5-6: mistyped
        await visit('step5-number', `${ctx}/issue/view/1/999`);
        await visit('step6-word', `${ctx}/issue/view/1/nosuch`);

        // ------------------------------------------------ step 7: delete the galley
        await signIn(page, 'dbarnes', {contextPath: cp});
        const issues2 = new IssuesAdmin(page, cp);
        await issues2.goto('Back Issues');
        const win2 = await issues2.openManagement('Back Issues', ISSUE);
        await win2.openTab('Issue Galleys');
        const q = await win2.openDeleteGalley('PDF');
        const dr = await issues2.answer(q, 'OK', /issue-galley-grid\/delete/);
        await idle(page); await pause(500);
        fact('galley-delete', dr ? dr.status() : null);
        fact('galley-rows-after', await win2.galleyLabels().allInnerTexts());
        await snap('galley-deleted');
        await win2.close().catch(() => {});
        fact('issue-galleys-db-after', sql(app, 'SELECT galley_id, issue_id, label FROM issue_galleys ORDER BY 1'));
        await signOut(page);

        // ------------------------------------------------ steps 8-9: stale
        await visit('step8-stale-reader', readerAddress);
        await visit('step9-stale-download', downloadAddress);
    } finally {
        record(`${label}-facts`, facts);
        await close();
    }
});
