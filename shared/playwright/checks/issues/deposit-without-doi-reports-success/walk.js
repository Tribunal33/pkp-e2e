// Issue report docs/issues/U45-A15-deposit-without-doi-reports-success.md
// (U45 A15): "Deposit DOIs" on a published work whose article (preprint) has
// no DOI reports success, and nothing is sent. Takes the report's Steps
// through the screens on a dataset fleet freshly reset to PKP's default test
// dataset (`job_runner` On as the dataset ships it):
//   1.   sign in as dbarnes
//   2.   Settings › Website › "Plugins": tick "Crossref Manager Plugin"
//        (WALK=galley: "DataCite Manager Plugin")
//   3.   DOIs › "Setup": "DOI Prefix" 10.1234 (WALK=galley: also tick
//        "Article galleys, such as a published PDF"), "Save"
//   4.   DOIs › "Registration": Crossref, depositor name and email (WALK=galley:
//        DataCite, "Username (symbol)" u45ir8), "Save"
//   WALK=nodoi (default):
//   5.   DOIs page: the item (OJS 17, OPS 2) reads "Needs DOI"; tick it,
//        "Deposit DOIs"
//   WALK=galley (OJS only: of the agencies, only DataCite takes galley DOIs):
//   5.   "Assign DOIs" on the item; 6. expand, "Edit", empty the "Article"
//        DOI, "Save"; 7. "Deposit DOIs" on it
//   then: reload the DOIs page until the queue is empty (the queue is read
//   from the database to know when to stop; read only), expand the item;
//   sign in as admin: Administration › "Failed Jobs".
// NEIGHBOUR=1 (with WALK=nodoi) is the path the fix must leave alone: the item
// is given a DOI ("Assign DOIs") before "Deposit DOIs", which must still be
// accepted ("Items successfully submitted for deposit", "Submitted", a
// deposit queued), with fix.diff in and out. (The test installs cannot reach
// Crossref, so that deposit then fails at connection, U45 A18.)
// OMP has no registration agency plugin: no surface, skipped.
// Reset first, then run:
//   npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir8 node bin/probe.js all shared/playwright/checks/issues/deposit-without-doi-reports-success/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-ir1-3_5,
// and PROBE_RUN=r35 in front of the run.
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const WALK = process.env.WALK || 'nodoi';
const NEIGHBOUR = !!process.env.NEIGHBOUR;

const ITEM = {ojs: 17, ops: 2};
const AGENCY = WALK === 'galley'
    ? {plugin: 'dataciteplugin', label: 'DataCite', apps: ['ojs'], fields: {username: 'u45ir8'}}
    : {plugin: 'crossrefplugin', label: 'Crossref', apps: ['ojs', 'ops'],
        fields: {depositorName: 'Public Knowledge Project', depositorEmail: 'dbarnes@mailinator.com'}};

forEachApp(async (app) => {
    if (!AGENCY.apps.includes(app.name)) {
        console.log(`[walk] ${app.name}: no ${AGENCY.label} plugin taking this path, no surface; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const ctx = app.contextPath;
    const id = ITEM[app.name];
    const pre = `${WALK}${NEIGHBOUR ? '-nb' : ''}`;
    const facts = {app: app.name, line: app.line || 'main', walk: WALK, neighbour: NEIGHBOUR, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1200)}`);
    };
    const doiRows = () => sql(app, 'select doi_id, doi, status from dois order by doi_id').split('\n').filter(Boolean);
    const notices = (page) => page.evaluate(() => {
        const w = /** @type {any} */ (window);
        const seen = w.__doiNotices || [];
        w.__doiNotices = [];
        return seen;
    });

    const {page, close} = await launch(app);
    try {
        await recordNotices(page);
        // 1
        await signIn(page, 'dbarnes');
        const settings = new DoiSettings(page, ctx);
        const dois = new DoisPage(page, ctx);

        // 2
        await settings.gotoPlugins(AGENCY.plugin);
        await settings.setPluginEnabled(AGENCY.plugin, true);
        fact('2 plugin on', await settings.pluginBox(AGENCY.plugin).isChecked());

        // 3
        await settings.goto('Setup');
        await settings.prefixBox().fill('10.1234');
        if (WALK === 'galley') await settings.kindBox('Article galleys, such as a published PDF').check();
        const r3 = await settings.save(settings.setup);
        fact('3 setup save', {status: r3.status(), kinds: await settings.kinds()});

        // 4
        await settings.goto('Registration');
        await settings.chooseAgency(AGENCY.label);
        for (const [name, value] of Object.entries(AGENCY.fields)) {
            await expect(settings.field(name)).toBeVisible({timeout: T});
            await settings.field(name).fill(value);
        }
        const r4 = await settings.save(settings.registration);
        const agency = await settings.agencyState();
        await settings.goto('Setup');
        fact('4 registration save', {status: r4.status(), agency, kindsAfter: await settings.kinds()});

        await dois.goto();
        const row = dois.row(id);
        await row.waitFor({timeout: T});
        fact('5 before', {name: flat(await dois.rowLink(row).innerText()), badge: flat(await dois.rowBadge(row).innerText()), dois: doiRows()});

        if (WALK === 'galley' || NEIGHBOUR) {
            const assigned = await dois.runBulk('Assign DOIs', [id]);
            fact('5 assign', {status: assigned.status(), badge: flat(await dois.rowBadge(row).innerText()), notices: await notices(page), dois: doiRows()});
        }
        if (WALK === 'galley') {
            // 6: empty the article (preprint) DOI, the table's first row
            await dois.expand(row, id);
            const types = await dois.doiTypes(row);
            await dois.startEditing(row);
            const box = dois.doiRows(row).first().locator('input[type="text"]');
            const before = await box.inputValue();
            await box.fill('');
            const statuses = await dois.saveEditing(row, {expectRequests: false});
            await idle(page);
            await sleep(800);
            record(`${pre}-6-article-doi-emptied`, await screen(page));
            fact('6 article doi emptied', {types, before, statuses, notices: await notices(page),
                table: flat(await dois.expanded(row).locator('table').innerText()), dois: doiRows()});
            await dois.collapse(row, id);
        }

        // deposit
        const failedBefore = Number(sql(app, 'select count(*) from failed_jobs') || 0);
        const answer = page.waitForResponse((r) => /\/api\/v1\/dois\/submissions\/deposit/.test(r.url()), {timeout: T});
        const deposited = await dois.runBulk('Deposit DOIs', [id]);
        const body = await (await answer).text().catch(() => null);
        await sleep(800);
        const sDep = await screen(page);
        record(`${pre}-deposit`, sDep);
        await shot(page, `${pre}-deposit`).catch(() => {});
        fact('deposit', {status: deposited.status(), body: flat(body, 300), badge: flat(await dois.rowBadge(row).innerText()),
            notices: await notices(page), dialogs: (sDep.text && sDep.text.dialog) || null,
            queued: sql(app, `select substring(payload from 'displayName":"([^"]+)') from jobs order by id`).split('\n').filter(Boolean),
            dois: doiRows()});

        // reload until nothing is queued (each web request runs the queue, job_runner On)
        let loads = 0;
        const started = Date.now();
        for (; loads < 30; loads++) {
            await sleep(4000);
            await dois.reload();
            if (Number(sql(app, "select count(*) from jobs where payload like '%Deposit%'") || 0) === 0) break;
        }
        await sleep(2000);
        await dois.reload();
        await dois.expand(row, id);
        const sAfter = await screen(page);
        record(`${pre}-after-expanded`, sAfter);
        await shot(page, `${pre}-after-expanded`).catch(() => {});
        fact('after the background job', {
            seconds: Math.round((Date.now() - started) / 1000), reloads: loads + 1,
            badge: flat(await dois.rowBadge(row).innerText()),
            table: flat(await dois.expanded(row).locator('table').innerText()),
            panel: flat(await dois.agencyPanel(row).innerText().catch(() => null)),
            failedJobs: sql(app, `select substring(payload from 'displayName":"([^"]+)') || ' | ' || split_part(exception, E'\\n', 1) from failed_jobs order by id offset ${failedBefore}`)
                .split('\n').filter(Boolean).map((l) => flat(l, 400)),
            jobsLeft: sql(app, 'select count(*) from jobs'),
            dois: doiRows(),
        });

        await signIn(page, 'admin');
        await page.goto(app.url('/index.php/index/admin/failedJobs'));
        await idle(page);
        await sleep(1000);
        const sF = await screen(page);
        record(`${pre}-failed-jobs`, sF);
        await shot(page, `${pre}-failed-jobs`).catch(() => {});
        fact('failed jobs page', {title: sF.title, main: flat(sF.text && sF.text.main, 900)});
    } finally {
        record(`${pre}-facts`, facts);
        await close();
    }
});
