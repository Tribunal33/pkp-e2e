// PR review of pkp/pkp-lib#13504 (issue pkp/pkp-lib#13503, with the pointer bump pkp/ojs#5926): the four
// callers that now hand reprocessCitation() the context instead of letting it load the citation's own,
// walked the same way at the PR's base and its head. As `dbarnes` on PKP's default dataset for `main`, on
// the submission of ../../issues/citation-author-row-kept-after-close/lib.js SUBMISSION:
//   1. Settings › Workflow › "Metadata": "Enable references structuring and metadata lookup", "Save".
//   2. References "Add" (POST …/citations/importAdditionalCitations) with two references.
//   3. "Reprocess all references" (POST …/citations/reprocessCitationsByPublicationId).
//   4. "Reprocess" on one reference (POST …/citations/{id}/reprocessCitation; not changed by the PR: the control).
//   5. The publication's "References" box saved with a third line (PUT …/publications/{id}, importCitations()).
// After each: the answer's status, the job rows it added (the contextId and contactEmail their chains
// carry, one row per reference), the references' statuses, the server log's PHP warnings and errors.
//
// Reset first:  npm run fleet-prep -- --feature sync-13503 --dataset 1 --reset
// Run:          PROBE_FEATURE=sync-13503 PROBE_AGENT=pr13504 PROBE_RUN=<base|head> node bin/probe.js <app|all> shared/playwright/checks/sync/pkp-lib-13504/paths.js
// Facts: .reports/sync-13503/pr13504/paths-facts-<run>-<app>.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, sql, serverLog, outDir} = require('../../../probe');
const L = require('../../issues/citation-author-row-kept-after-close/lib');

const REFS = [
    'pr13504 Delta, D. Study d. Journal of Tests. 2020;1:1-2. https://doi.org/10.1234/pr13504.d',
    'pr13504 Epsilon, E. Study e. Test Press; 2021.',
];
const THIRD = 'pr13504 Zeta, Z. Study z. Journal of Tests. 2022;3:5-6.';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('paths.js runs on a dataset fleet (fleet-prep --dataset)');
    const run = process.env.PROBE_RUN || 'run';
    const facts = {app: app.name, run, libPkp: null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 900)}`);
    };
    const log = serverLog(app, {match: /PHP (Warning|Fatal|Deprecated|Notice)|Undefined|\[5\d\d\]/});
    const {page, close} = await launch(app);
    const sub = L.SUBMISSION[app.name].id;
    const publicationId = Number(sql(app, `select current_publication_id from submissions where submission_id = ${sub}`));
    const base = app.url(`/index.php/${app.contextPath}/api/v1/submissions/${sub}/publications/${publicationId}`);
    const lastJob = () => Number(sql(app, 'select coalesce(max(id), 0) from jobs'));
    const jobsSince = (id) => {
        const rows = sql(app, `select substring(payload from 'citationId[^;]*;i:([0-9]+)') || ' ' || substring(payload from 'contextId[^;]*;i:([0-9]+)') || ' ' || coalesce(substring(payload from 'contactEmail[^;]*;s:[0-9]+:[^a-zA-Z0-9]*([^\\\\"]+)'), '?') from jobs where id > ${id} order by id`);
        const list = rows ? rows.split('\n').map((r) => r.split(' ')) : [];
        return {
            rows: list.length,
            references: [...new Set(list.map((r) => r[0]))].length,
            contextIds: [...new Set(list.map((r) => r[1]))],
            contactEmails: [...new Set(list.map((r) => r[2]))],
        };
    };
    const statuses = () => sql(app, `select coalesce(cs.setting_value, 'none') || ':' || count(*) from citations c left join citation_settings cs on cs.citation_id = c.citation_id and cs.setting_name = 'processingStatus' and cs.locale = '' where c.publication_id = ${publicationId} group by cs.setting_value order by 1`).split('\n').join(' ');
    const call = async (key, method, url, data) => {
        const from = log.mark();
        const mark = lastJob();
        const csrfToken = await page.evaluate(() => window.pkp.currentUser.csrfToken);
        const r = await page.request.fetch(url, {method, headers: {'X-Csrf-Token': csrfToken}, data, failOnStatusCode: false});
        fact(key, {status: r.status(), jobs: jobsSince(mark), statuses: statuses(), log: log.since(from).map((l) => L.flat(l.replace(/^\[[^\]]*\]\s*/, ''), 200))});
    };

    try {
        fact('context contactEmail', sql(app, `select setting_value from ${app.contextTables.settings} where setting_name = 'contactEmail'`));
        await signIn(page, 'dbarnes');
        fact('s1 lookup on', await L.tickMetadata(page, app, ['lookup']));
        await L.openPublicationPage(page, app, 'References');
        await call('s2 Add (importAdditionalCitations)', 'POST', `${base}/citations/importAdditionalCitations`, {rawCitations: REFS.join('\n')});
        await call('s3 Reprocess all (reprocessCitationsByPublicationId)', 'POST', `${base}/citations/reprocessCitationsByPublicationId`, {});
        const one = Number(sql(app, `select min(citation_id) from citations where publication_id = ${publicationId}`));
        await call('s4 Reprocess one (reprocessCitation, the control)', 'POST', `${base}/citations/${one}/reprocessCitation`, {});
        await call('s5 References box saved (importCitations)', 'PUT', base, {citationsRaw: [...REFS, THIRD].join('\n')});
    } catch (e) {
        fact('error', L.flat(e.message, 400));
    } finally {
        fs.writeFileSync(path.join(outDir(), `paths-facts-${run}-${app.name}.json`), JSON.stringify(facts, null, 2));
        await close();
    }
});
