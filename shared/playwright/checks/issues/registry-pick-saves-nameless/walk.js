// U41 A5 + U43 A3: while the journal's (press's, server's) own server cannot reach the ROR
// registry, an affiliation or a funder picked from the registry search raises "An unexpected
// error has occurred…", is added anyway, and saves with no name; the published page then shows
// a bare ROR-logo link.
// The Steps of docs/issues/U41-A5-registry-pick-saves-nameless.md, on PKP's default test
// dataset, as `dbarnes`. Specs: docs/specs/U41-contributors-and-affiliations.md (A5),
// docs/specs/U43-funding.md (A3).
//
// The dataset fleet's config already points `[proxy]` at a dead port (127.0.0.1:9), so the
// server cannot reach api.ror.org; the browser still can. The walk's first part is the Steps'
// SQL precondition: the two organisations it picks are taken out of the ROR cache.
//
// Run (reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/registry-pick-saves-nameless/walk.js
// MODE=neighbour runs, alone, the path a fix must leave alone, on the unchanged dataset: the same
// picks of organisations the cache holds (server still offline) save with the registry's name
// and store no name of their own; the stored rows are read from the database.
// Records the screens; asserts nothing.
const {forEachApp, launch, signIn, record, shot, screen, serverLog, sql, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const v35 = app.line === 'stable-3_5_0';
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (n) => `${MODE}-${n}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const {page, close} = await launch(app);
    /** One part; a throw is recorded, never fatal (a fix or an older line changes the screen). */
    const part = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${key} error`, L.flat(e.message, 500));
            await shot(page, name(`${key}-error`)).catch(() => {});
        }
    };
    const group = app.name === 'ops' ? 'Preprint' : 'Publication';
    const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: group}});
    const log = serverLog(app);
    const from = log.mark();

    /** Steps 4-8 (and the neighbour's twin): pick the affiliation, "Add", "Save", reopen. */
    const affiliation = async (key, sub, org) => {
        if (!(await L.openPage(wf, page, sub.id, 'Contributors'))) return fact(`${key} Contributors page`, 'absent');
        fact(`${key} row before`, await L.contributorRow(wf, sub.contributor));
        let dlg = await L.openContributorEdit(page, wf, sub.contributor);
        fact(`${key} affiliations before`, await L.affiliationRows(dlg));
        const picked = await L.pickRegistry(page, dlg, org);
        fact(`${key} search options`, picked.options);
        const shownBeforeAdd = L.flat(await dlg.locator('.pkpFormField--affiliations').first().innerText().catch(() => ''), 600);
        fact(`${key} chosen, before Add`, shownBeforeAdd);
        const post = L.rorPost(page);
        await dlg.getByRole('button', {name: 'Add', exact: true}).first().click();
        fact(`${key} Add: cache request`, await post);
        const err = await L.errorWindow(page);
        fact(`${key} Add: error window`, err);
        record(name(`${key}-after-add`), await screen(page));
        fact(`${key} affiliations after Add`, await L.affiliationRows(dlg));
        fact(`${key} Save`, await L.saveContributor(page, dlg));
        fact(`${key} row after save`, await L.contributorRow(wf, sub.contributor));
        const aid = L.authorId(app, sub.id, sub.contributor);
        fact(`${key} stored affiliations (author ${aid})`, L.storedAffiliations(app, aid));
        dlg = await L.openContributorEdit(page, wf, sub.contributor);
        fact(`${key} reopened: affiliations`, await L.affiliationRows(dlg));
        await shot(page, name(`${key}-reopened`));
        record(name(`${key}-reopened`), await screen(page));
        await L.closeForm(page, dlg);
    };

    /** Steps 9-10 (and the neighbour's twin): "Funding", "Add Funder", pick, "Save". */
    const funder = async (key, sub, org) => {
        if (!(await L.openPage(wf, page, sub.id, 'Funding'))) return fact(`${key} Funding page`, 'absent');
        await wf.dialog().getByRole('table', {name: 'Funders', exact: true}).waitFor({timeout: L.T});
        fact(`${key} funders before`, await L.funderRows(wf));
        fact(`${key} add funder`, await L.addFunder(page, wf, org));
        fact(`${key} funders after save`, await L.funderRows(wf));
        record(name(`${key}-funders`), await screen(page));
        await shot(page, name(`${key}-funders`));
        fact(`${key} stored funders`, L.storedFunders(app, sub.id));
    };

    try {
        await signIn(page, 'dbarnes');

        if (MODE === 'walk') {
            const sub = L.SUBMISSION[app.name];
            // Precondition: the two organisations out of the install's ROR cache.
            fact('P uncache', L.uncache(app, [L.ORG.affiliation, L.ORG.funder]));

            // Steps 2-3: open the submission, create a new version.
            await part('S3', async () => {
                await wf.gotoEditorial(sub.id);
                await idle(page);
                if (v35) {
                    const btn = page.getByRole('button', {name: 'Create New Version', exact: true}).first();
                    await btn.click();
                    const w = page.getByRole('dialog').filter({hasText: /new version/i}).last();
                    await w.waitFor({timeout: L.T});
                    const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: L.T});
                    await w.getByRole('button', {name: 'Yes', exact: true}).click();
                    fact('S3 create version (3.5)', (await created).status());
                } else {
                    const {createVersion} = require('../minor-version-new-galley-dois/lib');
                    fact('S3 create version', await createVersion(page, wf, 'Minor Revision'));
                }
                await idle(page);
            });

            await part('S4-8', () => affiliation('S', sub, L.ORG.affiliation));
            await part('S9-10', () => funder('F', sub, L.ORG.funder));

            // Step 11: publish the new version.
            await part('S11', async () => {
                await wf.gotoEditorial(sub.id);
                await idle(page);
                if (v35) {
                    const btn = page.getByRole('button', {name: sub.post, exact: true}).first();
                    await btn.click();
                    const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: sub.post, exact: true})}).last();
                    await confirm.waitFor({timeout: L.T});
                    fact('S11 confirm (3.5)', L.flat(await confirm.innerText(), 400));
                    const published = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: L.T});
                    await confirm.getByRole('button', {name: sub.post, exact: true}).last().click();
                    fact('S11 publish (3.5)', (await published).status());
                } else {
                    const {publishLatest} = require('../minor-version-new-galley-dois/lib');
                    const ojsScreen =
                        app.name === 'ojs' ? new (require('../../../../../apps/ojs/playwright/pages/PublishSchedulePages.js').PublishScreen)(page, app.contextPath) : null;
                    fact('S11 publish', await publishLatest(page, wf, sub.post, ojsScreen));
                }
            });

            // Step 12: the public page.
            await part('S12', async () => {
                const path = {ojs: `article/view/${sub.id}`, omp: `catalog/book/${sub.id}`, ops: `preprint/view/${sub.id}`}[app.name];
                const pub = await L.readPublicPage(page, app.url(`/index.php/${app.contextPath}/en/${path}`));
                fact('S12 public page', pub);
                await shot(page, name('S12-public'));
                record(name('S12-public'), await screen(page));
            });
            fact('cache after (affiliation, funder)', [L.cached(app, L.ORG.affiliation.ror), L.cached(app, L.ORG.funder.ror)]);
        } else {
            const sub = L.NEIGHBOUR[app.name];
            fact('N cache holds both', [L.cached(app, L.ORG.cachedAffiliation.ror), L.cached(app, L.ORG.cachedFunder.ror)]);
            await part('N-aff', () => affiliation('N', sub, L.ORG.cachedAffiliation));
            await part('N-fund', () => funder('NF', sub, L.ORG.cachedFunder));
        }
        fact('server log errors', log.since(from).slice(0, 20));
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
