// Neighbour check for docs/issues/U13-OJS4-recommend-by-author-list-never-shown.md,
// walked with the fix in and out (trial.sh). On a freshly reset dataset:
// `dbarnes` ticks "Recommend Articles by Author", signs out; the article page
// of "Signalling Theory Dividends" (whose contributors have no other published
// article) must show no "Most read articles by the same author(s)" section and
// log nothing; the Search page for "Signalling", which reads the same search
// results the plugin reads, must still list the article.
// Run: PROBE_FEATURE=issues-ir2 PROBE_AGENT=u13ojs4 PROBE_RUN=<r> node bin/probe.js ojs <this file>
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP|Error|Exception|Plugin |SQLSTATE/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`)); await idle(page);
        await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click(); await idle(page);
        const row = page.locator('tr.gridRow[id$="-row-recommendbyauthorplugin"]').first();
        await row.waitFor({state: 'visible', timeout: T});
        const box = row.locator('input[type=checkbox]');
        if (!(await box.isChecked())) {
            const en = page.waitForResponse((r) => /enable/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await box.click(); await en; await idle(page);
        }
        fact('nb-enabled', await box.isChecked());
        await signOut(page);

        let from = logSize();
        const r = await page.goto(app.url(`/index.php/${app.contextPath}/article/view/1`)); await idle(page);
        const s = await screen(page); record('nb-article-1', s); await shot(page, 'nb-article-1');
        fact('nb-article-1', {status: r ? r.status() : null, sectionCount: await page.locator('#articlesBySameAuthorList').count(),
            headingShown: (s.text.main || '').includes('Most read articles by the same author(s)'), serverLog: logSince(from)});

        from = logSize();
        const r2 = await page.goto(app.url(`/index.php/${app.contextPath}/search/search?query=Signalling`)); await idle(page);
        const s2 = await screen(page); record('nb-search', s2); await shot(page, 'nb-search');
        fact('nb-search', {status: r2 ? r2.status() : null, listsArticle: /Signalling Theory Dividends/.test(s2.text.main || ''),
            results: ((s2.text.main || '').match(/(\d+) Items?|Showing[^\n]*/) || [null])[0], serverLog: logSince(from)});
    } finally {
        record('nb-facts', facts);
        await close();
    }
});
