// U41 A9: on a published article's (book's, preprint's) page, the ROR logo beside a
// registry-backed affiliation or funder is a link with no accessible name.
// The Steps of docs/issues/U41-A9-ror-logo-link-unnamed.md, on PKP's default test dataset, as
// `dbarnes`. Spec: docs/specs/U41-contributors-and-affiliations.md (A9).
//
// Run (reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/ror-logo-link-unnamed/walk.js
// MODE=neighbour runs, alone, the path a fix must leave alone, on the unchanged dataset: the same
// public pages without any ROR link (the authors block's text and accessibility tree), and the
// French article page of OJS submission 1.
// Records the screens; asserts nothing.
const {forEachApp, launch, signIn, record, shot, screen, serverLog, idle} = require('../../../probe');
const A5 = require('../registry-pick-saves-nameless/lib');
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
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 2400)}`);
    };
    const {page, close} = await launch(app);
    const consoleErrors = [];
    page.on('pageerror', (e) => consoleErrors.push(L.flat(e.message, 300)));
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
    const sub = L.SUBMISSION[app.name];

    try {
        if (MODE === 'walk') {
            // Step 1.
            await signIn(page, 'dbarnes');

            // Steps 2-3: open the submission, create a new version.
            await part('S3', async () => {
                await wf.gotoEditorial(sub.id);
                await idle(page);
                if (v35) {
                    await page.getByRole('button', {name: 'Create New Version', exact: true}).first().click();
                    const w = page.getByRole('dialog').filter({hasText: /new version/i}).last();
                    await w.waitFor({timeout: A5.T});
                    const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: A5.T});
                    await w.getByRole('button', {name: 'Yes', exact: true}).click();
                    fact('S3 create version (3.5)', (await created).status());
                } else {
                    const {createVersion} = require('../minor-version-new-galley-dois/lib');
                    fact('S3 create version', await createVersion(page, wf, 'Minor Revision'));
                }
                await idle(page);
            });

            // Steps 4-5: the contributor's affiliation picked from the registry, "Add", "Save".
            await part('S4-5', async () => {
                if (!(await A5.openPage(wf, page, sub.id, 'Contributors'))) return fact('S4 Contributors page', 'absent');
                const dlg = await A5.openContributorEdit(page, wf, sub.contributor);
                fact('S5 search options', (await A5.pickRegistry(page, dlg, L.ORG.affiliation)).options);
                await dlg.getByRole('button', {name: 'Add', exact: true}).first().click();
                fact('S5 error window', await A5.errorWindow(page, 2500));
                fact('S5 affiliations after Add', await A5.affiliationRows(dlg));
                fact('S5 save', await A5.saveContributor(page, dlg));
                fact('S5 row after save', await A5.contributorRow(wf, sub.contributor));
            });

            // Step 6: a funder picked from the registry (no Funding page on 3.5).
            await part('S6', async () => {
                if (!(await A5.openPage(wf, page, sub.id, 'Funding'))) return fact('S6 Funding page', 'absent');
                await wf.dialog().getByRole('table', {name: 'Funders', exact: true}).waitFor({timeout: A5.T});
                fact('S6 add funder', await A5.addFunder(page, wf, L.ORG.funder));
                fact('S6 funders after save', await A5.funderRows(wf));
            });

            // Step 7: publish the new version.
            await part('S7', async () => {
                await wf.gotoEditorial(sub.id);
                await idle(page);
                if (v35) {
                    await page.getByRole('button', {name: sub.post, exact: true}).first().click();
                    const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: sub.post, exact: true})}).last();
                    await confirm.waitFor({timeout: A5.T});
                    const published = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: A5.T});
                    await confirm.getByRole('button', {name: sub.post, exact: true}).last().click();
                    fact('S7 publish (3.5)', (await published).status());
                } else {
                    const {publishLatest} = require('../minor-version-new-galley-dois/lib');
                    const ojsScreen =
                        app.name === 'ojs' ? new (require('../../../../../apps/ojs/playwright/pages/PublishSchedulePages.js').PublishScreen)(page, app.contextPath) : null;
                    fact('S7 publish', await publishLatest(page, wf, sub.post, ojsScreen));
                }
            });

            // Step 8: the public page, each ROR link's accessible name.
            await part('S8', async () => {
                const pub = await L.readPublicPage(app, page, sub);
                fact('S8 public page', pub);
                const first = page.locator('a[href^="https://ror.org/"]').first();
                if (await first.count()) await first.scrollIntoViewIfNeeded().catch(() => {});
                await shot(page, name('S8-public'));
                record(name('S8-public'), await screen(page));
            });
        } else {
            // Neighbour: pages with no ROR link stay as they were (same submission, unchanged dataset),
            // and a French page of OJS submission 1.
            await part('N', async () => {
                const pub = await L.readPublicPage(app, page, sub);
                fact('N public page (no ROR link)', pub);
                fact('N authors text', L.flat(await page.locator('.item.authors').first().innerText().catch(() => null), 800));
                record(name('N-public'), await screen(page));
                if (app.name === 'ojs') {
                    await page.goto(app.url(`/index.php/${app.contextPath}/fr_CA/article/view/1`));
                    await idle(page);
                    fact('N fr article 1 authors aria', L.flat(await page.locator('.item.authors').first().ariaSnapshot().catch(() => null), 800));
                }
            });
        }
        fact('page script errors', consoleErrors);
        fact('server log errors', log.since(from).slice(0, 20));
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
