// Kept walk of issue report docs/issues/U41-A26-affiliations-print-out-of-order.md (U41 A26): on a
// published item, a contributor's second affiliation is added, contributors are added until the item
// has four, and the item's page is read; "Edit" is read at the end. On PKP's default test dataset.
//
// Modes (argv[2]):
//   steps   (default) the report's Steps 1-7, and the reads beside them: the publication the
//           workflow page fetched, the stored rows by id, the page's citation_author_institution tags.
//   nb      the neighbour check, read only: items that already have several contributors with one
//           affiliation each (OJS 1, OMP 14, OPS 7): each contributor's page line against the
//           stored rows, and the contributors' order.
//
// Run (main):  PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/affiliations-print-out-of-order/walk.js [steps|nb]
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 and PROBE_RUN=r35 in front, the line's feature. Where "Add Contributor"
//              cannot be pressed on the published version, the walk unpublishes first and publishes again
//              after step 5; OJS is skipped there (3.5's side menu has no version entries for step 3).
// Fix trial:   PROBE_RUN=fix (steps), nb-in / nb-out (nb), with fix.diff applied or not.
// Facts:       .reports/<feature>/<id>/a26-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const L = require('./lib');

const mode = process.argv[2] || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = `a26-${mode}${process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : ''}`;
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const old = /3_5/.test(app.line || '');
    const {page, close} = await launch(app);
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: app.name === 'ops' ? 'Preprint' : 'Publication'}});
    try {
        if (mode === 'nb') {
            const n = L.NEIGHBOURS[app.name];
            fact('nb page', await L.readItemPage(page, app, n.page));
            fact(
                'nb stored (contributor seq, name, affiliation ids and names)',
                sql(
                    app,
                    `select a.seq, (select x.setting_value from author_settings x where x.author_id = a.author_id and x.setting_name = 'familyName' and x.locale = 'en'),
                     coalesce((select string_agg(f.author_affiliation_id || '=' || coalesce((select s.setting_value from author_affiliation_settings s where s.author_affiliation_id = f.author_affiliation_id and s.setting_name = 'name' and s.locale = 'en'), '-'), ';' order by f.author_affiliation_id) from author_affiliations f where f.author_id = a.author_id), '-')
                     from authors a where a.publication_id = (select current_publication_id from submissions where submission_id = ${n.id}) order by a.seq`
                ).split('\n')
            );
            record(`${run}-screen`, await screen(page));
            return;
        }
        const c = L.CASES[app.name];
        const family = c.contributor.split(' ').pop();
        const seen = L.watchPublication(page);
        if (old && c.version) {
            // 3.5's side menu has no version entries, so step 3's "Version of Record 1.0" cannot be pressed
            fact('3 skipped on 3.5', 'no version entries in the side menu');
            return;
        }
        // step 1
        await signIn(page, 'dbarnes');
        // steps 2-3
        let opened = await L.openContributors(page, wf, c.id, c.version);
        const unpublished = old && !opened.addEnabled;
        if (unpublished) opened = {before: opened, ...(await L.unpublishThenContributors(page, app, wf, c.id, c.version))};
        fact('3 Contributors page', opened);
        // step 4
        fact('4 second affiliation', await L.addSecondAffiliation(page, wf, c));
        fact('4 stored rows (id, name)', L.storedAffiliations(app, sql, c.id, family));
        fact('4 publication the workflow fetched', seen.last);
        // step 5
        for (let i = 0; i < c.add; i++) fact(`5 add contributor ${L.PEOPLE[i].given}`, await L.addContributor(page, L.PEOPLE[i]));
        fact('5 publication the workflow fetched', seen.last);
        if (unpublished) fact('5b publish again (3.5)', await L.republish(page, app, c.id));
        // step 6
        fact('6 item page', await L.readItemPage(page, app, c.page));
        record(`${run}-6`, await screen(page));
        await shot(page, `${run}-6`);
        fact('6 item page, reloaded', await L.readItemPage(page, app, c.page));
        // step 7
        await L.openContributors(page, wf, c.id, c.version);
        fact('7 Edit lists', await L.readEdit(page, wf, c).catch((e) => `not read: ${L.flat(e.message, 200)}`));
        fact('7 publication the workflow fetched', seen.last);
        fact('7 stored rows (id, name)', L.storedAffiliations(app, sql, c.id, family));
    } finally {
        record(run, facts);
        await close();
    }
});
