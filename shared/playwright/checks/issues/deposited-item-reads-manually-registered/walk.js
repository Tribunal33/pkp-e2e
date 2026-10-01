// Issue report docs/issues/U45-A4-deposited-item-reads-manually-registered.md
// (U45 A4): after "Deposit DOIs" an item reads "Submitted" and its agency
// box says "This item has been manually registered with a registration
// agency.". Takes the report's Steps through the screens on a dataset fleet
// freshly reset to PKP's default test dataset (whose config points `[proxy]`
// at a dead port, so the deposit never connects and the item stays
// "Submitted", the U45 A18 report; `job_runner` On as the dataset ships it):
//   1.   sign in as dbarnes
//   2.   Settings › Website › "Plugins": tick the agency's plugin
//   3.   DOIs › "Setup": "DOI Prefix" 10.1234, "Save"
//   4.   DOIs › "Registration": the agency and its fields, "Save"
//   5.   DOIs page: "Assign DOIs" on the item (OJS 17, OPS 2); expand it and
//        read the agency box (the "not submitted" sentence: the neighbour
//        the fix must leave alone)
//   6.   "Deposit DOIs" on it; read the box at once
//   7.   reload, expand, read the box
//   8.   reload until the queued deposit has given up (the queue is read
//        from the database to know when to stop; read only), expand, read
//   9.   control: "Mark DOIs Registered" on it; read the box (the "manually
//        registered" sentence is right here: the second neighbour)
// WALK=crossref (default; OJS and OPS) or WALK=datacite (OJS only).
// OMP has no registration agency plugin: no agency box, skipped.
// Reset first, then run:
//   npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
//   PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir12 node bin/probe.js all shared/playwright/checks/issues/deposited-item-reads-manually-registered/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, feature
// issues-ir1-3_5, and PROBE_RUN=r35 in front of the run.
// The fix (fix.diff, lib/ui-library): steps 6 to 8 then read "The metadata
// for this item has been submitted to {agency}.", steps 5 and 9 unchanged.
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const WALK = process.env.WALK || 'crossref';

const ITEMS = {ojs: 17, ops: 2};
const AGENCY = {
    crossref: {plugin: 'crossrefplugin', label: 'Crossref', apps: ['ojs', 'ops'],
        fields: {depositorName: 'Public Knowledge Project', depositorEmail: 'dbarnes@mailinator.com'}},
    datacite: {plugin: 'dataciteplugin', label: 'DataCite', apps: ['ojs'], fields: {username: 'u45ir12'}},
};

forEachApp(async (app) => {
    const agency = AGENCY[WALK];
    if (!agency.apps.includes(app.name)) {
        console.log(`[walk] ${app.name}: no ${agency.label} plugin, no agency box; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const ctx = app.contextPath;
    const id = ITEMS[app.name];
    const facts = {app: app.name, line: app.line || 'main', walk: WALK, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1200)}`);
    };
    const stored = () => sql(app, `select d.doi_id, d.doi, d.status, coalesce((select setting_value from doi_settings s where s.doi_id = d.doi_id and s.setting_name = 'registrationAgency'), 'NULL') from dois d order by d.doi_id`).split('\n').filter(Boolean);

    const {page, close} = await launch(app);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(flat(e.message, 300)));
    try {
        await recordNotices(page);
        const dois = new DoisPage(page, ctx);
        const row = dois.row(id);
        /** Expand the item and read its badge and agency box. */
        const box = async (name) => {
            await dois.expand(row, id);
            await expect(dois.agencyPanel(row)).toBeVisible({timeout: T});
            const read = {
                badge: flat(await dois.rowBadge(row).innerText()),
                agency: flat(await dois.agencyName(row).innerText()),
                sentence: flat(await dois.agencySentence(row).innerText()),
                buttons: (await dois.agencyButtons(row).allInnerTexts()).map((t) => flat(t)),
                stored: stored(),
            };
            record(name, await screen(page));
            await shot(page, name).catch(() => {});
            return read;
        };

        // 1
        await signIn(page, 'dbarnes');
        const settings = new DoiSettings(page, ctx);

        // 2
        await settings.gotoPlugins(agency.plugin);
        await settings.setPluginEnabled(agency.plugin, true);
        fact('2 plugin on', await settings.pluginBox(agency.plugin).isChecked());

        // 3
        await settings.goto('Setup');
        await settings.prefixBox().fill('10.1234');
        const r3 = await settings.save(settings.setup);
        fact('3 setup save', {status: r3.status()});

        // 4
        await settings.goto('Registration');
        await settings.chooseAgency(agency.label);
        for (const [name, value] of Object.entries(agency.fields)) {
            await expect(settings.field(name)).toBeVisible({timeout: T});
            await settings.field(name).fill(value);
        }
        const r4 = await settings.save(settings.registration);
        fact('4 registration save', {status: r4.status(), agency: await settings.agencyState()});

        // 5
        await dois.goto();
        await row.waitFor({timeout: T});
        const assigned = await dois.runBulk('Assign DOIs', [id]);
        fact('5 assigned', {status: assigned.status(), name: flat(await dois.rowLink(row).innerText()), ...(await box(`${WALK}-5-assigned`))});

        // 6
        const deposited = await dois.runBulk('Deposit DOIs', [id]);
        fact('6 at once after the deposit', {status: deposited.status(), notices: await page.evaluate(() => window.__doiNotices || []), ...(await box(`${WALK}-6-deposited`))});

        // 7
        await dois.reload();
        fact('7 after a reload', await box(`${WALK}-7-reloaded`));

        // 8: reload until nothing is queued (each web request runs the queue, job_runner On)
        let loads = 0;
        const started = Date.now();
        for (; loads < 30; loads++) {
            await sleep(4000);
            await dois.reload();
            if (Number(sql(app, "select count(*) from jobs where payload like '%Deposit%'") || 0) === 0) break;
        }
        await sleep(2000);
        await dois.reload();
        fact('8 after the background deposit', {
            seconds: Math.round((Date.now() - started) / 1000),
            failedJobs: sql(app, `select substring(payload from 'displayName":"([^"]+)') || ' | ' || split_part(exception, E'\\n', 1) from failed_jobs order by id`).split('\n').filter(Boolean).map((l) => flat(l, 300)),
            ...(await box(`${WALK}-8-after-job`)),
        });

        // 9: the control
        const marked = await dois.runBulk('Mark DOIs Registered', [id]);
        fact('9 marked registered', {status: marked.status(), ...(await box(`${WALK}-9-marked-registered`))});
        fact('page errors', pageErrors);
    } finally {
        record(`${WALK}-facts`, facts);
        await close();
    }
});
