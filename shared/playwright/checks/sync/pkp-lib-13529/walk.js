// PR review pkp/pkp-lib#13528 (pkp-lib#13529, ui-library#1017, ojs#5937): the issue's "Steps to
// Reproduce" and "Expected Result" on a dataset fleet freshly reset to PKP's default test dataset,
// in all three apps. Records absence, so it runs unchanged at the base and the head (side.sh).
//   1. sign in as dbarnes; OJS and OPS: tick "Crossref Manager Plugin", DOIs › "Registration":
//      Crossref with a depositor; all apps: DOIs › "Setup": "DOI Prefix" 10.1234
//   2. PMUR (OJS 2, OMP 2, both at external review with one round; OPS has no such stage): its
//      current version set to "Published Manuscript Under Review" 1.0 with the round associated and
//      published, through the publication API the publish panel calls
//   3. DOIs page: "Assign DOIs" on PMUR and on the control CTRL (a published Version of Record:
//      OJS 1, OMP 5, OPS 5)
//   4. per item: the submission's and its current version's status (database), the row's badge,
//      the expanded row's agency sentence and buttons
//   5. filters: "Unregistered" (the list's ids and the fetch's query), and on a press or preprint
//      server "Published" and "Unpublished"
//      (a trial of the OMP/OPS filter fix: fix-omp.diff, fix-ops.diff with bin/try-fix.js), and the
//      unfiltered list, its declined items and the items neither filter lists
//   6. OJS and OPS: "Deposit DOIs" on PMUR alone: the answer and the DOI's status (the fleet's
//      [proxy] is dead, so nothing reaches Crossref)
// Run (side.sh does it):
//   PROBE_FEATURE=pr-13528 PROBE_AGENT=pr PROBE_RUN=<side> node bin/probe.js all <this file>
// Facts: .reports/pr-13528/pr/walk-<side>-<app>.json, screenshots beside them.
const path = require('path');
const {forEachApp, launch, signIn, record, sql, outDir} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const ITEMS = {ojs: {pmur: 2, ctrl: 1}, omp: {pmur: 2, ctrl: 5}, ops: {pmur: null, ctrl: 5}};
const AGENCY = {ojs: true, omp: false, ops: true};
const PUBLISHED_FILTER = {ojs: null, omp: 'Published', ops: 'Posted'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoiSettings, DoisPage} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const side = process.env.PROBE_RUN || 'run';
    const pre = `${side}-${app.name}`;
    const {pmur, ctrl} = ITEMS[app.name];
    const ids = [pmur, ctrl].filter(Boolean);
    const facts = {app: app.name, side, items: ITEMS[app.name]};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1600)}`);
    };
    const state = (id) => String(sql(app, `select s.status, p.status, coalesce(p.version_stage,'-'), coalesce(d.doi,'-'), coalesce(d.status,0)
        from submissions s join publications p on p.publication_id = s.current_publication_id left join dois d on d.doi_id = p.doi_id
        where s.submission_id = ${id}`)).trim();

    const {page, close} = await launch(app);
    const fetches = [];
    page.on('request', (r) => {
        if (r.method() === 'GET' && /\/api\/v1\/_?submissions\?/.test(r.url())) fetches.push(decodeURIComponent(r.url().replace(/^.*\?/, '')));
    });
    try {
        const settings = new DoiSettings(page, app.contextPath);
        const dois = new DoisPage(page, app.contextPath);
        const listIds = async () => (await dois.rows().evaluateAll((els) => els.map((e) => e.id.replace(/^list-item-submission-/, '')))).map(Number);

        // 1
        await signIn(page, 'dbarnes');
        if (AGENCY[app.name]) {
            await settings.gotoPlugins('crossrefplugin');
            await settings.setPluginEnabled('crossrefplugin', true);
        }
        await settings.goto('Setup');
        fact('1 kinds', await settings.kinds().catch((e) => `unread: ${flat(e.message, 120)}`));
        await settings.prefixBox().fill('10.1234');
        await settings.save(settings.setup);
        if (AGENCY[app.name]) {
            await settings.goto('Registration');
            await settings.chooseAgency('Crossref');
            for (const [name, value] of Object.entries({depositorName: 'Public Knowledge Project', depositorEmail: 'dbarnes@mailinator.com'})) {
                await expect(settings.field(name)).toBeVisible({timeout: T});
                await settings.field(name).fill(value);
            }
            await settings.save(settings.registration);
        }

        // 2
        if (pmur) {
            await dois.goto();
            const meta = await page.evaluate(() => ({api: pkp.context.apiBaseUrl, csrf: pkp.currentUser.csrfToken}));
            const h = {headers: {'X-Csrf-Token': meta.csrf, 'Content-Type': 'application/json'}};
            const pubId = Number(String(sql(app, `select current_publication_id from submissions where submission_id = ${pmur}`)).trim());
            const round = Number(String(sql(app, `select review_round_id from review_rounds where submission_id = ${pmur} order by round desc limit 1`)).trim());
            const x1 = await page.request.put(`${meta.api}submissions/${pmur}/publications/${pubId}`,
                {...h, data: {versionStage: 'PMUR', versionMajor: 1, versionMinor: 0, reviewRoundIds: [round]}});
            const x2 = await page.request.put(`${meta.api}submissions/${pmur}/publications/${pubId}/publish`, h);
            fact('2 pmur publish', {edit: x1.status(), editBody: x1.ok() ? null : flat(await x1.text(), 300),
                publish: x2.status(), publishBody: x2.ok() ? null : flat(await x2.text(), 300), state: state(pmur)});
        }

        // 3
        await dois.goto();
        await dois.row(ctrl).waitFor({timeout: T});
        const assigned = await dois.runBulk('Assign DOIs', ids);
        await dois.reload();
        fact('3 assign', {status: assigned.status(), state: Object.fromEntries(ids.map((id) => [id, state(id)]))});

        // 4
        for (const [k, id] of [['pmur', pmur], ['ctrl', ctrl]]) {
            if (!id) continue;
            const row = dois.row(id);
            const out = {state: state(id), badge: flat(await dois.rowBadge(row).innerText().catch(() => null))};
            await dois.expand(row, id);
            out.agencySentence = flat(await dois.agencySentence(row).innerText().catch(() => null));
            out.agencyButtons = await dois.agencyButtons(row).allInnerTexts().then((a) => a.map((s) => flat(s))).catch(() => []);
            await row.screenshot({path: path.join(outDir(), `${pre}-4-${k}.png`)}).catch(() => {});
            await dois.collapse(row, id);
            fact(`4 ${k}`, out);
        }

        // 5
        const filterRead = async (name) => {
            fetches.length = 0;
            await dois.pressFilter(name);
            const out = {ids: await listIds(), query: fetches.slice(-1)[0] || null};
            await dois.panel().screenshot({path: path.join(outDir(), `${pre}-5-${name.toLowerCase()}.png`)}).catch(() => {});
            await dois.clearFilter(name);
            return out;
        };
        await dois.goto();
        const all = await listIds();
        const declined = String(sql(app, `select submission_id from submissions where status = 4 order by 1`)).trim().split(/\s+/).filter(Boolean).map(Number);
        const filters = {Unregistered: await filterRead('Unregistered')};
        if (PUBLISHED_FILTER[app.name]) {
            filters[PUBLISHED_FILTER[app.name]] = await filterRead(PUBLISHED_FILTER[app.name]);
            filters.Unpublished = await filterRead('Unpublished');
        }
        for (const v of Object.values(filters)) {
            v.pmurListed = pmur ? v.ids.includes(pmur) : null;
            v.ctrlListed = v.ids.includes(ctrl);
        }
        fact('5 list', {all, declinedOnPage: declined.filter((id) => all.includes(id)),
            unfiltered: all.filter((id) => !Object.entries(filters).some(([k, v]) => k !== 'Unregistered' && v.ids.includes(id)))});
        fact('5 filters', filters);

        // 6
        if (pmur && AGENCY[app.name]) {
            await dois.goto();
            const r = await dois.runBulk('Deposit DOIs', [pmur]);
            const open = page.getByRole('dialog');
            const win = (await open.count()) ? flat(await open.last().innerText(), 600) : null;
            fact('6 deposit pmur', {status: r.status(), body: flat(await r.text().catch(() => ''), 300), window: win, state: state(pmur)});
        }
    } finally {
        record(`walk-${pre}`, facts);
        await close();
    }
});
