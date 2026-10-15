// PR review of pkp/pkp-lib#13537 (issue pkp/pkp-lib#13536, with the pointer bump pkp/ojs#5940): which
// identifiers (DOI, arXiv ID, handle, URL, URN) a reference gets on each path that stores one, walked the
// same way at the PR's base and its head. As `dbarnes` on PKP's default dataset for `main`, on the
// submission of ../../issues/citation-author-row-kept-after-close/lib.js SUBMISSION, through the API calls
// the Publication's screens make:
//   lookup off (as the dataset arrives):
//   1. The publication's "References" box saved with REFS (PUT …/publications/{id}, importCitations()).
//   2. References "Add" with ADD (POST …/citations/importAdditionalCitations).
//   3. A reference's text edited (PUT …/citations/{id} with rawCitation alone, the raw "Edit citation" form).
//   lookup on (Settings › Workflow › "Metadata": "Enable references structuring and metadata lookup", "Save"):
//   4. A reference's DOI corrected by hand (PUT …/citations/{id}, the structured "Edit citation" form).
//   5. References "Add" with ON (the lookup is queued: the control, not changed by the PR).
// After each: the answer's status, the job rows it added, every pr13537 reference's identifiers and status.
//
// Reset first:  npm run fleet-prep -- --feature sync-13536 --dataset 1 --reset
// Run:          PROBE_FEATURE=sync-13536 PROBE_AGENT=pr13537 PROBE_RUN=<base|head> node bin/probe.js <app|all> shared/playwright/checks/sync/pkp-lib-13537/paths.js
// Facts: .reports/sync-13536/pr13537/paths-facts-<run>-<app>.json; extract.sh reads the references this leaves.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, sql, serverLog, outDir} = require('../../../probe');
const L = require('../../issues/citation-author-row-kept-after-close/lib');

const REFS = [
    'pr13537 Alpha, A. Study a. Journal of Tests. 2020;1:1-2. http://dx.doi.org/10.1234/pr13537.a',
    'pr13537 Beta, B. Study b. Preprint. 2021. arXiv:2101.12345v2',
    'pr13537 Gamma, G. Thesis c. 2019. hdl:1885/12345',
    'pr13537 Delta, D. Report d. 2018. Available from: https://example.org/reports/d.pdf',
    'pr13537 Epsilon, E. Book e. 2017. urn:nbn:de:101:1-2019072802401757702913',
    'pr13537 Zeta, Z. Study f. Journal of Tests. 2022;3:5-6. doi:10.1234/pr13537.f https://publisher.example.com/article/f',
    'pr13537 Eta, E. Study g. Test Press; 2016.',
    'pr13537 Theta, T. Study h. 2015. HTTP://DOI.ORG/10.1234/PR13537.H',
];
const ADD = [
    'pr13537 Iota, I. Study i. 2014. https://doi.org/10.1234/pr13537.i',
    'pr13537 Kappa, K. Study k. 2013. https://arxiv.org/abs/2202.00001',
];
const EDITED = 'pr13537 Alpha, A. Study a, corrected. Journal of Tests. 2020;1:1-2. https://doi.org/10.1234/pr13537.a2 https://example.org/a2';
const ON = ['pr13537 Lambda, L. Study l. 2012. https://doi.org/10.1234/pr13537.l https://example.org/l'];
const FIXED_DOI = '10.1234/pr13537.f-corrected';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('paths.js runs on a dataset fleet (fleet-prep --dataset)');
    const run = process.env.PROBE_RUN || 'run';
    const facts = {app: app.name, run};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const log = serverLog(app, {match: /PHP (Warning|Fatal|Deprecated|Notice)|Undefined|\[5\d\d\]/});
    const {page, close} = await launch(app);
    const sub = L.SUBMISSION[app.name].id;
    const publicationId = Number(sql(app, `select current_publication_id from submissions where submission_id = ${sub}`));
    const base = app.url(`/index.php/${app.contextPath}/api/v1/submissions/${sub}/publications/${publicationId}`);
    const lastJob = () => Number(sql(app, 'select coalesce(max(id), 0) from jobs'));
    const refs = () => sql(app, `select split_part(c.raw_citation, ' ', 2) || ' ' || coalesce(string_agg(cs.setting_name || '=' || cs.setting_value, ' ' order by cs.setting_name), '-') from citations c left join citation_settings cs on cs.citation_id = c.citation_id and cs.setting_name in ('doi', 'arxiv', 'handle', 'url', 'urn', 'processingStatus') where c.publication_id = ${publicationId} and c.raw_citation like 'pr13537 %' group by c.citation_id, c.seq, c.raw_citation order by c.seq`).split('\n');
    const idOf = (word) => Number(sql(app, `select citation_id from citations where publication_id = ${publicationId} and raw_citation like 'pr13537 ${word},%'`));
    const call = async (key, method, url, data) => {
        const from = log.mark();
        const mark = lastJob();
        const csrfToken = await page.evaluate(() => window.pkp.currentUser.csrfToken);
        const r = await page.request.fetch(url, {method, headers: {'X-Csrf-Token': csrfToken}, data, failOnStatusCode: false});
        fact(key, {
            status: r.status(),
            jobsAdded: Number(sql(app, `select count(*) from jobs where id > ${mark}`)),
            references: refs(),
            log: log.since(from).map((l) => L.flat(l.replace(/^\[[^\]]*\]\s*/, ''), 200)),
        });
    };

    try {
        fact('lookup at start', sql(app, `select coalesce(max(setting_value), 'unset') from ${app.contextTables.settings} where setting_name = 'citationsMetadataLookup'`));
        await signIn(page, 'dbarnes');
        await L.openPublicationPage(page, app, 'References');
        await call('s1 lookup off: References box saved (importCitations)', 'PUT', base, {citationsRaw: REFS.join('\n')});
        await call('s2 lookup off: Add (importAdditionalCitations)', 'POST', `${base}/citations/importAdditionalCitations`, {rawCitations: ADD.join('\n')});
        await call('s3 lookup off: Alpha text edited (raw Edit citation)', 'PUT', `${base}/citations/${idOf('Alpha')}`, {rawCitation: EDITED});
        fact('s4a lookup on', await L.tickMetadata(page, app, ['lookup']));
        await call('s4 lookup on: Zeta DOI corrected by hand (structured Edit citation)', 'PUT', `${base}/citations/${idOf('Zeta')}`, {doi: FIXED_DOI});
        await call('s5 lookup on: Add (control: lookup queued)', 'POST', `${base}/citations/importAdditionalCitations`, {rawCitations: ON.join('\n')});
    } catch (e) {
        fact('error', L.flat(e.message, 400));
    } finally {
        fs.writeFileSync(path.join(outDir(), `paths-facts-${run}-${app.name}.json`), JSON.stringify(facts, null, 2));
        await close();
    }
});
