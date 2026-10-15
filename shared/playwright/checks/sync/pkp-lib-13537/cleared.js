// PR review of pkp/pkp-lib#13537, round 2 (head d56d57f021): `citationLookup.php extract` fills only
// identifiers that are empty. What it does to one an editor emptied by hand, and to one corrected by hand,
// on a reference not looked up yet. As `dbarnes` on PKP's default dataset for `main`, on the submission of
// ../../issues/citation-author-row-kept-after-close/lib.js SUBMISSION, through the API calls the screens make:
//   1. lookup off: References "Add" REF (DOI and web address picked out at the head).
//   2. Settings › Workflow › "Metadata": "Enable references structuring and metadata lookup", "Save".
//   3. The structured "Edit citation" saved with the "URL" box emptied and the "DOI" box corrected
//      (PUT …/citations/{id}).
//   4. `php lib/pkp/tools/citationLookup.php extract submission <id>` from the app's root.
// After each: the reference's identifiers and status.
// Reset first:  npm run fleet-prep -- --feature sync-13536 --dataset 1 --reset
// Run:          PROBE_FEATURE=sync-13536 PROBE_AGENT=pr13537 PROBE_RUN=<run> node bin/probe.js <app|all> shared/playwright/checks/sync/pkp-lib-13537/cleared.js
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, sql, outDir} = require('../../../probe');
const L = require('../../issues/citation-author-row-kept-after-close/lib');

const REPO = path.resolve(__dirname, '../../../../..');
const REF = 'pr13537c Clear, C. Study c. 2020. https://doi.org/10.1234/pr13537.c https://example.org/c';
const FIXED_DOI = '10.1234/pr13537.c-corrected';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('cleared.js runs on a dataset fleet (fleet-prep --dataset)');
    const run = process.env.PROBE_RUN || 'run';
    const facts = {app: app.name, run};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 900)}`);
    };
    const {page, close} = await launch(app);
    const sub = L.SUBMISSION[app.name].id;
    const publicationId = Number(sql(app, `select current_publication_id from submissions where submission_id = ${sub}`));
    const base = app.url(`/index.php/${app.contextPath}/api/v1/submissions/${sub}/publications/${publicationId}`);
    const id = () => Number(sql(app, `select citation_id from citations where publication_id = ${publicationId} and raw_citation like 'pr13537c %'`));
    const stored = () => sql(app, `select coalesce(string_agg(cs.setting_name || '=' || coalesce(nullif(cs.setting_value, ''), '(empty)'), ' ' order by cs.setting_name), '-') from citations c left join citation_settings cs on cs.citation_id = c.citation_id and cs.setting_name in ('doi', 'url', 'processingStatus') where c.raw_citation like 'pr13537c %'`);
    const call = async (method, url, data) => {
        const csrfToken = await page.evaluate(() => window.pkp.currentUser.csrfToken);
        const r = await page.request.fetch(url, {method, headers: {'X-Csrf-Token': csrfToken}, data, failOnStatusCode: false});
        return r.status();
    };
    try {
        await signIn(page, 'dbarnes');
        await L.openPublicationPage(page, app, 'References');
        fact('1 lookup off: Add', {status: await call('POST', `${base}/citations/importAdditionalCitations`, {rawCitations: REF}), stored: stored()});
        fact('2 lookup on', await L.tickMetadata(page, app, ['lookup']));
        fact('3 Edit citation: URL emptied, DOI corrected', {status: await call('PUT', `${base}/citations/${id()}`, {url: '', doi: FIXED_DOI}), stored: stored()});
        const out = execFileSync('php', ['lib/pkp/tools/citationLookup.php', 'extract', 'submission', String(sub)], {cwd: path.resolve(REPO, app.root), env: {...process.env, PKP_CONFIG_FILE: path.resolve(REPO, app.configFile)}, encoding: 'utf8'});
        fact('4 extract', {out: L.flat(out, 300), stored: stored()});
    } catch (e) {
        fact('error', L.flat(e.message, 400));
    } finally {
        fs.writeFileSync(path.join(outDir(), `cleared-facts-${run}-${app.name}.json`), JSON.stringify(facts, null, 2));
        await close();
    }
});
