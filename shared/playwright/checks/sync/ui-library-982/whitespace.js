// PR review of pkp/pkp-lib#13308, round 3 (pkp-lib#13318 `8653c678b7`): a References box holding a
// line of spaces only. `CitationListTokenizerFilter` trims each line, so such a line became an empty
// string that never matches a stored citation; `Repository::importCitations()` then saw a changed list
// on every save and deleted and re-inserted every citation (new ids, structured details gone, lookups
// queued again). The PR drops those lines.
//
// On PKP's default dataset for `main`, as `dbarnes`, on ../../issues/citation-author-row-kept-after-close/lib.js
// SUBMISSION. The saves are the PUT of `citationsRaw` the submission wizard's "References" box sends
// (Rule 16), made by REST twice with the same text, lookup off (the dataset's default); the stored
// citation ids before and after the second save tell a kept list from a deleted and re-inserted one.
// Every database call is a read.
//
// Reset first:  npm run fleet-prep -- --feature sync --dataset 7 --reset
// Run:          PROBE_FEATURE=sync PROBE_AGENT=pr982 node bin/probe.js <app|all> shared/playwright/checks/sync/ui-library-982/whitespace.js
// Facts: .reports/sync/pr982/whitespace-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, sql} = require('../../../probe');
const L = require('../../issues/citation-author-row-kept-after-close/lib');

const RAW = 'u42w Reference one. Test Press; 2020.\n   \nu42w Reference two. Test Press; 2020.';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('whitespace.js runs on a dataset fleet (fleet-prep --dataset)');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 600)}`);
    };
    const sub = L.SUBMISSION[app.name].id;
    const pub = Number(sql(app, `select current_publication_id from submissions where submission_id = ${sub}`));
    const stored = () =>
        sql(app, `select c.citation_id, c.raw_citation, coalesce((select setting_value from citation_settings t where t.citation_id = c.citation_id and t.setting_name = 'doi'), '') from citations c where c.publication_id = ${pub} order by c.seq`)
            .split('\n').filter(Boolean);
    const {page, close} = await launch(app);
    const put = async () => {
        const token = await page.evaluate(() => (window.pkp && pkp.currentUser && pkp.currentUser.csrfToken) || null);
        const r = await page.request.fetch(`${app.baseURL}/index.php/${app.contextPath}/api/v1/submissions/${sub}/publications/${pub}`, {
            method: 'PUT', headers: {'X-Csrf-Token': token}, data: {citationsRaw: RAW},
        });
        return r.status();
    };
    try {
        await signIn(page, 'dbarnes');
        await page.goto(`${app.baseURL}/index.php/${app.contextPath}/dashboard/editorial`);
        fact('w1 first save', await put());
        fact('w1 stored (id|text|doi)', stored());
        await page.goto(`${app.baseURL}/index.php/${app.contextPath}/dashboard/editorial`);
        fact('w3 the same text saved again', await put());
        fact('w3 stored (id|text|doi)', stored());
    } catch (e) {
        fact('error', L.flat(e.message, 400));
    } finally {
        record(`whitespace-facts${run}`, facts);
        await close();
    }
});
