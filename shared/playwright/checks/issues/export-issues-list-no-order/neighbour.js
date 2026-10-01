// Neighbour check for the fix of docs/issues/U63-OJS10-export-issues-list-no-order.md (U63 OJS10):
// what the fix must leave alone in the "Export Issues" list: its paging (each issue once, the
// pager's count) and the export of an issue ticked on a later page. PKP's default test dataset, as
// `dbarnes`, on `publicknowledge`, OJS only. Run it with the fix in and out (reset first).
//   N0. Issues › "Future Issues" › "Create Issue" nine times: Volumes 4 to 12, Number 1, Years 2017
//       to 2025, Title "u63ir16" (11 issues in all)
//   N1. Tools › Import/Export › "Native XML Plugin" › "Export Issues", "Items per page" 10: page 1,
//       then page "2"
//   N2. on page 2, tick its issue, "Export Issues", "Download Exported File"
// Records each page's issues and pager line and the issue the file holds.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir16 --dataset 2 --reset
// Run:          PROBE_FEATURE=issues-ir16 PROBE_AGENT=ir16 PROBE_RUN=<nofix|fix> node bin/probe.js ojs shared/playwright/checks/issues/export-issues-list-no-order/neighbour.js
// Facts: .reports/<feature>/ir16/neighbour-facts[-<run>]-ojs.json
const fs = require('fs');
const {forEachApp, launch, signIn, record, idle, outFile} = require('../../../probe');
const L = require('./lib');

const tab = (page) => page.locator('#exportIssues-tab');

async function waitForList(page, firstBefore) {
    for (let i = 0; i < 40; i++) {
        await L.sleep(250);
        const s = await L.readIssueList(page).catch(() => null);
        if (s && s.ids[0] !== firstBefore) return s;
    }
    await idle(page).catch(() => {});
    return L.readIssueList(page);
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const f = {app: app.name, line: app.line || 'main', n0: []};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, 'dbarnes');
        const issues = new IssuesAdmin(page, app.contextPath);
        // N0
        for (let v = 4; v <= 12; v++) f.n0.push(await L.createIssue(issues, {volume: v, number: 1, year: 2013 + v, title: 'u63ir16'}));
        f.issuesPage = await L.issuesPageOrder(issues);
        // N1
        await L.openExportIssues(app, page, 'native');
        const first = await L.readIssueList(page);
        await tab(page).locator('select.itemsPerPage').selectOption('10');
        f.page1 = first.ids.length === 10 ? first : await waitForList(page, '__none__');
        if (f.page1.ids.length !== 10) f.page1 = await L.readIssueList(page);
        await L.snap(page, 'n1-page1');
        await tab(page).locator('.gridPaging a').filter({hasText: /^\s*2\s*$/}).first().click();
        f.page2 = await waitForList(page, f.page1.ids[0]);
        await L.snap(page, 'n1-page2');
        const all = [...f.page1.ids, ...f.page2.ids];
        f.n1 = {count: all.length, unique: new Set(all).size};
        // N2
        await tab(page).locator('tr.gridRow input[type=checkbox]').first().check();
        const before = await page.locator('#importExportTabs > ul [role="tab"]').count();
        await tab(page).getByRole('button', {name: 'Export Issues', exact: true}).click();
        const panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
        for (let i = 0; i < 120; i++) {
            await L.sleep(500);
            if ((await page.locator('#importExportTabs > ul [role="tab"]').count()) > before
                && await panel.getByRole('button', {name: 'Download Exported File'}).isVisible().catch(() => false)) break;
        }
        const dl = page.waitForEvent('download', {timeout: 60_000});
        await panel.getByRole('button', {name: 'Download Exported File'}).click();
        const file = outFile('n2-export.xml');
        fs.copyFileSync(await (await dl).path(), file);
        const xml = fs.readFileSync(file, 'utf8');
        f.n2 = {
            ticked: f.page2.issues[0],
            fileIssues: [...xml.matchAll(/<issue_identification>([\s\S]*?)<\/issue_identification>/g)].map((m) => m[1].replace(/<title[\s\S]*?<\/title>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()),
        };
        console.log(`[fact] page1: ${f.page1.issues.join(' | ')} [${f.page1.pager}]`);
        console.log(`[fact] page2: ${f.page2.issues.join(' | ')} [${f.page2.pager}]`);
        console.log(`[fact] n1 ${JSON.stringify(f.n1)} n2 ${JSON.stringify(f.n2)}`);
    } finally {
        record('neighbour-facts', f);
        await close();
    }
});
