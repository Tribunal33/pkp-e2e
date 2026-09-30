// Neighbour check for docs/issues/U63-OJS2-doaj-tool-listed-when-doaj-plugin-off.md
// (spec U63 register OJS2), walked with fix.diff in and out (trial.sh).
// The fix stops "DOAJ Plugin" from registering "DOAJ Export Plugin" in a
// journal where it is switched off. It must not reach the callers that run
// without a journal, which register the tool through the same method:
//   - the command-line tool `php tools/importExport.php list` still names
//     DOAJExportPlugin, with "DOAJ Plugin" off in publicknowledge and on;
//   - the daily DOAJ task (`php lib/pkp/tools/scheduler.php test
//     --name=APP\plugins\generic\doaj\DOAJInfoSender`) still finds the tool
//     and runs (the dataset's journal has no DOAJ API key, so it deposits
//     nothing either way).
// "DOAJ Plugin" is switched off and on through the screens as `rvaca`
// (Settings › Website › Plugins), as in the Steps. The walk's own control
// (the plugin on: Tools list, Plugins list, the tool's page) and the other
// Import/Export rows (Crossref, DataCite, Native XML, PubMed, Users XML) are
// recorded by walk.js.
// Run: flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63ojs2 PROBE_RUN=<fix|nofix> node bin/probe.js ojs shared/playwright/checks/issues/doaj-tool-listed-when-doaj-plugin-off/neighbour.js
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const {flat, snap: snapRaw, readGrid, openWebsitePlugins, pressBox} = require('../../U62/K1/grid');

const REPO = path.resolve(__dirname, '../../../../..');

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const root = path.resolve(REPO, app.root);
    const env = {...process.env, PKP_CONFIG_FILE: path.resolve(REPO, app.configFile)};
    const cli = (args) => {
        try { return {ok: true, out: flat(execFileSync('php', args, {cwd: root, env, encoding: 'utf8', timeout: 180000}), 1500)}; } catch (e) { return {ok: false, out: flat(`${e.stdout || ''} ${e.stderr || ''} ${e.message}`, 1500)}; }
    };
    const reads = (label) => {
        const list = cli(['tools/importExport.php', 'list']);
        fact(`${label}: importExport.php list`, {ok: list.ok, namesDOAJExportPlugin: /DOAJExportPlugin/.test(list.out), out: list.out});
        const task = cli(['lib/pkp/tools/scheduler.php', 'test', '--name=APP\\plugins\\generic\\doaj\\DOAJInfoSender']);
        fact(`${label}: scheduler.php test DOAJInfoSender`, task);
    };
    const {page, close} = await launch(app);
    let n = 0;
    const snap = (name) => snapRaw(page, `nb-${String(++n).padStart(2, '0')}-${name}`);
    const doajRow = async () => {
        await openWebsitePlugins(page, app, app.contextPath);
        const g = await readGrid(page);
        for (const c of g.cats || []) for (const r of c.rows) if (r.name === 'DOAJ Plugin') return r;
        return null;
    };
    try {
        await signIn(page, 'rvaca');
        let row = await doajRow();
        await snap('plugins-doaj-on');
        if (!row) { fact('surface', 'no "DOAJ Plugin" row'); return; }
        reads('DOAJ Plugin on');
        fact('untick DOAJ Plugin', await pressBox(page, row.id, {answer: 'OK'}));
        await snap('doaj-unticked');
        reads('DOAJ Plugin off');
        row = await doajRow();
        fact('tick DOAJ Plugin', await pressBox(page, row.id, {answer: 'OK'}));
        await snap('doaj-ticked');
        await signOut(page);
    } finally {
        record('nb-facts', facts);
        await close();
    }
});
