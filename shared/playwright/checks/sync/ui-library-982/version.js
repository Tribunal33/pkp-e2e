// PR review of pkp/pkp-lib#13308, round 2 (pkp-lib#13318 `097ba6b943`, ui-library#982 `0185ab12`): a
// new version taken while its references' lookups are still under way. `copyCitations()` copies each
// reference with its stored status (QUEUED or a lookup stage), but the queued jobs carry the original
// references' ids, so the copies never finish and the new version's box would stay below its total.
//
// OJS only, on PKP's default dataset for `main`, as `dbarnes`, on the published submission 17 (its one
// publication 18). Lookup on; the publication unpublished, three references added, published again
// (REST, as the workflow's buttons do), "Create New Version" (REST). Then the SQL stands in for the
// original references' lookups finishing (processingStatus 5, what IsProcessedJob::handle() writes)
// and the new version's References page is read. Every other database call is a read.
//
// Reset first:  npm run fleet-prep -- --feature sync --dataset 7 --reset --apps ojs
// Run:          PROBE_FEATURE=sync PROBE_AGENT=pr982 node bin/probe.js ojs shared/playwright/checks/sync/ui-library-982/version.js
// Facts: .reports/sync/pr982/version-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, record, shot, idle, sql} = require('../../../probe');
const L = require('../../issues/citation-author-row-kept-after-close/lib');

const LINES = ['one', 'two', 'three'].map((n) => `u42r9 Reference ${n}. Test Press; 2020.`);
const SUB = 17;
const PUB = 18;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('version.js runs on a dataset fleet (fleet-prep --dataset)');
    if (app.name !== 'ojs') throw new Error('version.js walks OJS submission 17 only');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 600)}`);
    };
    const {page, close} = await launch(app);
    const gets = [];
    page.on('request', (r) => {
        if (r.method() === 'GET' && /\/api\/v1\/submissions\/\d+/.test(r.url())) gets.push(Date.now());
    });
    const api = async (method, path) => {
        const token = await page.evaluate(() => (window.pkp && pkp.currentUser && pkp.currentUser.csrfToken) || null);
        const r = await page.request.fetch(`${app.baseURL}/index.php/${app.contextPath}/api/v1/${path}`, {method, headers: {'X-Csrf-Token': token}});
        const body = await r.json().catch(() => null);
        return {status: r.status(), id: body && body.id, publicationStatus: body && body.status};
    };
    const statuses = (where) =>
        sql(app, `select c.publication_id, c.citation_id, coalesce((select setting_value from citation_settings t where t.citation_id = c.citation_id and t.setting_name = 'processingStatus'), '(none)') from citations c where c.raw_citation like 'u42r9%' ${where} order by 1, 2`).split('\n').filter(Boolean);
    const jobCitationIds = () =>
        sql(app, `select substring(payload from 'citationId\\\\";i:(\\d+)') from jobs where payload like '%citation%'`).split('\n').filter(Boolean);
    const openRefs = async () => {
        const wf = L.workflow(page, app);
        await wf.gotoEditorial(SUB);
        await idle(page);
        const C = require('../../../pages/CitationsPages.js');
        const pg = new C.ReferencesPage(page, wf);
        await pg.open();
        await idle(page);
        await L.sleep(1500);
        return pg;
    };
    const box = async () => {
        const t = page.getByText(/^(Processing references - \d+\/\d+|All \d+ references successfully processed|\d+ of \d+ references processed, \d+ incomplete)$/).first();
        return (await t.isVisible().catch(() => false)) ? L.flat(await t.innerText()) : null;
    };
    const refreshes = async (ms) => {
        const t0 = Date.now();
        await L.sleep(ms);
        return gets.filter((t) => t >= t0).length;
    };

    try {
        await signIn(page, 'dbarnes');
        fact('v1 lookup on', await L.tickMetadata(page, app, ['lookup']));
        await page.goto(`${app.baseURL}/index.php/${app.contextPath}/dashboard/editorial`);
        fact('v2 unpublish', await api('PUT', `submissions/${SUB}/publications/${PUB}/unpublish`));
        let refs = await openRefs();
        await refs.add(LINES);
        await idle(page);
        await L.sleep(3000);
        fact('v3 stored status after Add (publication|citation|status)', statuses(''));
        fact('v3 box', await box());
        fact('v4 publish', await api('PUT', `submissions/${SUB}/publications/${PUB}/publish`));
        const v = await api('POST', `submissions/${SUB}/publications/${PUB}/version`);
        fact('v5 new version', v);
        fact('v5 stored status after the new version', statuses(''));
        fact('v5 citation ids the queued jobs carry', jobCitationIds());
        // The original references' lookups finish; the jobs write only those ids.
        sql(app, `UPDATE citation_settings SET setting_value = '5' WHERE setting_name = 'processingStatus' AND citation_id IN (SELECT citation_id FROM citations WHERE publication_id = ${PUB} AND raw_citation LIKE 'u42r9%')`);
        fact('v6 stored status, the originals finished', statuses(''));
        refs = await openRefs();
        fact('v6 box on the new version', await box());
        await shot(page, `pr982-v6${run}`);
        fact('v6 refresh in 22 s', await refreshes(22000));
    } catch (e) {
        fact('error', L.flat(e.message, 400));
        await shot(page, `pr982-version-error${run}`).catch(() => {});
    } finally {
        record(`version-facts${run}`, facts);
        await close();
    }
});
