// Issue report docs/issues/U45-A13-bulk-action-refusal-no-message.md (U45
// A13): a bulk action on the DOIs page that the server refuses closes its
// window and shows no message. Takes the report's Steps through the screens
// on a dataset fleet freshly reset to PKP's default test dataset, as the
// dataset's `dbarnes` on `publicknowledge`. The kit builds nothing.
//
// Nothing ticked (OJS, OMP, OPS):
//   1. sign in as dbarnes; side menu "DOIs"
//   2. tick nothing; "Bulk Actions" › "Mark DOIs Unregistered" (reads "…0 item(s)…")
//   3. press "Mark DOIs Unregistered"
// An unpublished work among the ticked ones, Crossref (OJS, OPS; a press has
// no agency):
//   1. (signed in) Settings › Website › "Plugins": tick "Crossref Manager Plugin"
//   2. DOIs › "Setup": "DOI Prefix" 10.1234, "Save"
//   3. "Registration": Crossref, depositor name and email, "Save"
//   4. "DOIs": tick the published work (OJS 17, OPS 2); "Assign DOIs", so
//      only the unpublished work stands between the next actions and success
//   5. tick the published and the unpublished work (OJS 17 and 5, OPS 2 and
//      1); "Bulk Actions" › "Deposit DOIs" › "Deposit DOIs"
//   6. tick the same two; "Export DOIs" › "Export DOIs"
//   the way round: tick the published work alone, "Export DOIs" (a test
//   install cannot fetch Crossref's schema, so this one is refused too, with
//   the XML validation answer), then "Deposit DOIs" (accepted)
// Neighbours (the paths a fix must leave alone), every app:
//   a. tick the published work alone; "Mark DOIs Unregistered": the success
//      notice, the window closed
//   b. tick the published and the unpublished work; "Mark DOIs Registered":
//      the "DOI Updates Failed" window lists the unpublished one; "OK"
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=ir10 node bin/probe.js all shared/playwright/checks/issues/bulk-action-refusal-no-message/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the line fleet's
//               feature, and PROBE_RUN=r35 in front of the run.
// PROBE_RUN=fix names the run with fix.diff applied.
// Facts: .reports/<feature>/ir10/bulk-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const {watchDialogs, takeDialogs, takeNotices, watchDoiAnswers} = require('./lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const PUBLISHED = {ojs: 17, omp: 5, ops: 2};
const UNPUBLISHED = {ojs: 5, omp: 4, ops: 1};
const CROSSREF = ['ojs', 'ops'];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const ctx = app.contextPath;
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const pub = PUBLISHED[app.name];
    const unpub = UNPUBLISHED[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1400)}`);
    };

    const {page, close} = await launch(app);
    try {
        await recordNotices(page);
        await watchDialogs(page);
        const answers = watchDoiAnswers(page);
        const settings = new DoiSettings(page, ctx);
        const dois = new DoisPage(page, ctx);

        /** Choose a bulk action, read its window, confirm it and read what follows. */
        const bulk = async (step, label, ids) => {
            if (ids.length) await dois.tick(ids);
            const dialog = await dois.chooseBulkAction(label);
            const question = flat(await dialog.innerText());
            await takeDialogs(page);
            const response = await dois.confirmAction(dialog, label);
            await idle(page);
            await sleep(1500);
            const s = await screen(page);
            record(`bulk-${step}${run}`, s);
            await shot(page, `bulk-${step}${run}`).catch(() => {});
            const open = page.getByRole('dialog');
            const out = {
                label, ticked: ids, question,
                answers: answers.take(),
                windowsShownAfterConfirm: await takeDialogs(page),
                windowOpenNow: (await open.count()) ? flat(await open.last().innerText()) : null,
                notices: await takeNotices(page),
                ticks: await dois.rows().locator('.doiListItem__selector input[type="checkbox"]:checked').count(),
                status: response.status(),
            };
            return out;
        };
        const closeOpenWindow = async () => {
            const open = page.getByRole('dialog');
            if (await open.count()) {
                await open.last().getByRole('button', {name: 'OK', exact: true}).click();
                await expect(open).toHaveCount(0, {timeout: T});
            }
        };

        // Nothing ticked
        await signIn(page, 'dbarnes');
        await dois.goto();
        fact('rows', {published: flat(await dois.rowBadge(dois.row(pub)).innerText()), unpublished: flat(await dois.rowBadge(dois.row(unpub)).innerText())});
        fact('empty: Mark DOIs Unregistered', await bulk('empty-unregistered', 'Mark DOIs Unregistered', []));
        await closeOpenWindow();

        if (CROSSREF.includes(app.name)) {
            await settings.gotoPlugins('crossrefplugin');
            await settings.setPluginEnabled('crossrefplugin', true);
            await settings.goto('Setup');
            await settings.prefixBox().fill('10.1234');
            const r2 = await settings.save(settings.setup);
            await settings.goto('Registration');
            await settings.chooseAgency('Crossref');
            await settings.field('depositorName').fill('Public Knowledge Project');
            await settings.field('depositorEmail').fill('dbarnes@mailinator.com');
            const r3 = await settings.save(settings.registration);
            fact('crossref set up', {setup: r2.status(), registration: r3.status(), agency: await settings.agencyState()});
            await dois.goto();
            fact('tabs', (await page.getByRole('tab').allInnerTexts()).map((t) => flat(t)));
            const assigned = await bulk('assign-published', 'Assign DOIs', [pub]);
            assigned.badgeAfter = flat(await dois.rowBadge(dois.row(pub)).innerText());
            fact('Assign DOIs, the published work', assigned);
            await closeOpenWindow();
            const deposit = await bulk('deposit-unpublished', 'Deposit DOIs', [pub, unpub]);
            deposit.badgesAfter = {published: flat(await dois.rowBadge(dois.row(pub)).innerText()), unpublished: flat(await dois.rowBadge(dois.row(unpub)).innerText())};
            fact('Deposit DOIs, an unpublished work ticked', deposit);
            await closeOpenWindow();
            let downloads = 0;
            page.on('download', () => downloads++);
            const exp = await bulk('export-unpublished', 'Export DOIs', [pub, unpub]);
            exp.downloads = downloads;
            fact('Export DOIs, an unpublished work ticked', exp);
            await closeOpenWindow();
            // the way round: the published work alone
            const expAlone = await bulk('export-alone', 'Export DOIs', [pub]);
            expAlone.downloads = downloads;
            fact('way round: Export DOIs, published alone', expAlone);
            await closeOpenWindow();
            const depAlone = await bulk('deposit-alone', 'Deposit DOIs', [pub]);
            depAlone.badgeAfter = flat(await dois.rowBadge(dois.row(pub)).innerText());
            fact('way round: Deposit DOIs, published alone', depAlone);
            await closeOpenWindow();
        }

        // Neighbours
        fact('neighbour a: Mark DOIs Unregistered, published alone', await bulk('nb-unregistered', 'Mark DOIs Unregistered', [pub]));
        await closeOpenWindow();
        fact('neighbour b: Mark DOIs Registered, with an unpublished work', await bulk('nb-registered', 'Mark DOIs Registered', [pub, unpub]));
        await closeOpenWindow();
    } finally {
        record(`bulk-facts${run}`, facts);
        await close();
    }
});
