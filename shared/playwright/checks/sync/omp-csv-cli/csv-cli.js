// Upstream-sync lead 2026-10-01 (issues session, U63 OMP1 revision): OMP's CSV command-line import of the plugin's own
// sample.csv. Seeds a scratch press, points sample.csv's row at it, runs `php tools/importExport.php CSVImportExportPlugin`
// as the press's manager, and records the tool's output and what the database holds afterwards.
//   PROBE_FEATURE=sync PROBE_AGENT=csv01 node bin/probe.js omp shared/playwright/checks/sync/omp-csv-cli/csv-cli.js
const fs = require('fs');
const path = require('path');
const {execFileSync, spawnSync} = require('child_process');
const {dbName} = require('../../../../../bin/apps.js');
const {forEachApp, note, tag, outDir} = require('../../../probe');

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // the CSV importer ships with OMP alone
    const root = path.resolve(__dirname, '../../../../../checkouts/omp');
    const sql = (q) => { try { return execFileSync('psql', ['-d', dbName(app.name), '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim(); } catch (e) { return `ERR ${e.message.slice(0, 200)}`; } };
    const t = tag('csv01');
    const ctx = `${t}p`;
    await app.api.createContext({tag: ctx, context: {name: `CSV ${t}`, acronym: 'CSV', contactName: 'CSV Contact', contactEmail: `${t}contact@mail.test`}, users: [{username: `${t}m`, roles: ['manager']}]});
    const pressId = sql(`select press_id from presses where path = '${ctx}'`);
    const before = sql(`select count(*) from submissions where context_id = ${pressId}`);
    const sample = fs.readFileSync(path.join(root, 'plugins/importexport/csv/sample.csv'), 'utf8').replace(/^publicknowledge,/m, `${ctx},`);
    const csv = path.join(outDir(), `sample-${ctx}.csv`);
    fs.writeFileSync(csv, sample);
    const env = {...process.env, PKP_CONFIG_FILE: path.join(root, 'config.test.inc.php')};
    const r = spawnSync('php', ['tools/importExport.php', 'CSVImportExportPlugin', csv, `${t}m`], {cwd: root, env, encoding: 'utf8'});
    const out = {press: ctx, pressId, submissionsBefore: before, exit: r.status, stdout: (r.stdout || '').slice(0, 3000), stderr: (r.stderr || '').slice(0, 3000)};
    out.submissionsAfter = sql(`select s.submission_id, s.status, s.stage_id, s.submission_progress, s.current_publication_id from submissions s where s.context_id = ${pressId}`);
    out.publications = sql(`select p.publication_id, p.status, (select count(*) from authors a where a.publication_id = p.publication_id) as authors, (select setting_value from publication_settings ps where ps.publication_id = p.publication_id and ps.setting_name = 'title' limit 1) as title from publications p join submissions s on s.submission_id = p.submission_id where s.context_id = ${pressId}`);
    out.submissionFiles = sql(`select count(*) from submission_files sf join submissions s on s.submission_id = sf.submission_id where s.context_id = ${pressId}`);
    fs.writeFileSync(path.join(outDir(), `csv-cli-${ctx}.json`), JSON.stringify(out, null, 2));
    note(`csv01 [omp]: scratch press ${ctx}; CLI exit ${r.status}`);
    console.log(JSON.stringify(out, null, 2));
});
