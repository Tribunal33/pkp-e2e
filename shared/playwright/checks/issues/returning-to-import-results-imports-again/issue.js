// Issue report docs/issues/U63-A7-returning-to-import-results-imports-again.md (U63 A7), the
// "Importing a published issue" group of its Steps: OJS only (the issue export is OJS's), on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), as `dbarnes`.
//
//   1. sign in as dbarnes; Tools › Import/Export › "Native XML Plugin"
//   2. "Export Issues": tick "Vol. 1 No. 2 (2014)", "Export Issues", "Download Exported File"
//   3. "Import": upload the file, "Import"
//   4. choose the "Import" tab, then the "Import Results" tab again
//   5. reload the page
//   6. the public site: Archives, the issue's table of contents, each imported article's page
// Besides the screens it counts, in the database, the issues, the issue's published articles,
// their galleys, files and authors after steps 3, 4 and 5.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir6b --dataset 3 --reset
// Run:          PROBE_FEATURE=issues-ir6b PROBE_AGENT=ir6 node bin/probe.js ojs shared/playwright/checks/issues/returning-to-import-results-imports-again/issue.js
// Facts: .reports/<feature>/ir6/issue[-<run>]-ojs.json
const fs = require('fs');
const {forEachApp, launch, signIn, signOut, record, sql, outFile, idle} = require('../../../probe');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const ISSUE = 'Vol. 1 No. 2 (2014)';
const counts = (app) => ({
    issues: Number(sql(app, 'SELECT count(*) FROM issues')),
    publishedInIssue1: Number(sql(app, 'SELECT count(*) FROM publications WHERE issue_id = 1 AND status = 3')),
    submissions: Number(sql(app, 'SELECT count(*) FROM submissions')),
    galleys: Number(sql(app, 'SELECT count(*) FROM publication_galleys')),
    submissionFiles: Number(sql(app, 'SELECT count(*) FROM submission_files')),
    authors: Number(sql(app, 'SELECT count(*) FROM authors')),
    users: Number(sql(app, 'SELECT count(*) FROM users')),
});

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[issue] ${app.name}: no issues`); return; }
    const f = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const errs = native.scriptErrors(page);
    const w = native.watch(page);
    try {
        f.issue1Articles = sql(app, `SELECT p.submission_id || ' ' || ps.setting_value FROM publications p JOIN publication_settings ps ON ps.publication_id = p.publication_id AND ps.setting_name = 'title' AND ps.locale = 'en' WHERE p.issue_id = 1 AND p.status = 3 ORDER BY 1`);
        f.before = counts(app);
        f.maxIdBefore = Number(sql(app, 'SELECT max(submission_id) FROM submissions'));
        // 1
        await signIn(page, 'dbarnes');
        await native.openNative(app, page);
        // 2
        await page.locator('#importExportTabs > ul a.ui-tabs-anchor', {hasText: /^Export Issues$/}).click();
        await idle(page).catch(() => {});
        const row = page.locator('#exportIssuesXmlForm tr.gridRow').filter({hasText: ISSUE}).first();
        await row.waitFor({timeout: 20_000});
        await row.locator('input[type="checkbox"]').check();
        const before = await page.locator('#importExportTabs > ul [role="tab"]').count();
        await page.locator('#exportIssuesXmlForm').getByRole('button', {name: 'Export Issues', exact: true}).click();
        for (let i = 0; i < 60 && (await page.locator('#importExportTabs > ul [role="tab"]').count()) === before; i++) await native.sleep(500);
        const dlP = page.waitForEvent('download', {timeout: 60_000});
        await page.locator('#importExportTabs [role="tabpanel"]:visible').first().getByRole('button', {name: 'Download Exported File'}).click({timeout: 60_000});
        const d = await dlP;
        const xml = fs.readFileSync(await d.path(), 'utf8');
        const file = outFile('issue.xml');
        fs.writeFileSync(file, xml);
        f.export = {file: d.suggestedFilename(), tabs: await L.tabNames(page), articles: (xml.match(/<article /g) || []).length, galleys: (xml.match(/<article_galley /g) || []).length};
        // 3
        const imp = await native.importFile(page, file);
        f.step3 = {tabs: await L.tabNames(page), panel: native.flat(imp.panel, 1500), numbers: L.importedNumbers(imp.panel), counts: counts(app)};
        f.step3Screen = await native.snap(page, 'issue-step3-import-results');
        // 4
        await L.chooseTab(page, 'Import', 0, w);
        const s4 = await L.chooseTab(page, 'Import Results', 0, w);
        f.step4 = {tabs: await L.tabNames(page), panel: native.flat(s4.panel, 1500), numbers: L.importedNumbers(s4.panel), requests: s4.requests, counts: counts(app)};
        f.step4Screen = await native.snap(page, 'issue-step4-import-results-again');
        // 5
        const m5 = w.seen.length;
        await page.reload();
        await page.locator('#importExportTabs').waitFor({timeout: 20_000});
        await idle(page).catch(() => {});
        await native.sleep(1500);
        f.step5 = {tabs: await L.tabNames(page), requests: w.seen.slice(m5).filter((r) => /\/import\?/.test(r.url)), counts: counts(app)};
        await signOut(page).catch(() => {});
        // 6
        await page.goto(app.url(`/index.php/${app.contextPath}/en/issue/archive`));
        await idle(page).catch(() => {});
        f.archive = native.flat(await page.locator('main, .pkp_structure_main').first().innerText().catch(() => ''), 800);
        f.archiveScreen = await native.snap(page, 'issue-step6-archive');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/issue/view/1`));
        await idle(page).catch(() => {});
        const toc = await page.locator('.obj_issue_toc, main, .pkp_structure_main').first().innerText().catch(() => '');
        f.toc = {text: native.flat(toc, 2500), articleLinks: await page.locator('.obj_article_summary .title a, .obj_issue_toc h3 a').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')}`)).catch(() => [])};
        f.tocScreen = await native.snap(page, 'issue-step6-toc');
        const newIds = sql(app, `SELECT submission_id FROM publications WHERE issue_id = 1 AND status = 3 AND submission_id > ${f.maxIdBefore} ORDER BY 1`).split('\n').filter(Boolean);
        f.articles = [];
        for (const id of newIds.slice(0, 8)) {
            const r = await page.goto(app.url(`/index.php/${app.contextPath}/en/article/view/${id}`));
            await idle(page).catch(() => {});
            f.articles.push({id, status: r ? r.status() : null, title: native.flat(await page.locator('h1').first().innerText().catch(() => null), 150), galleyLinks: await page.locator('.galleys_links a, a.obj_galley_link').allInnerTexts().catch(() => [])});
        }
        if (newIds.length) f.articleScreen = await native.snap(page, 'issue-step6-article');
    } catch (e) {
        f.error = native.flat(e.stack, 900);
        await native.snap(page, 'issue-error').catch(() => {});
    } finally {
        w.stop();
        f.scriptErrors = errs;
        record('issue', f);
        console.log('[issue]', JSON.stringify(f, null, 1).slice(0, 9000));
        await close();
    }
});
