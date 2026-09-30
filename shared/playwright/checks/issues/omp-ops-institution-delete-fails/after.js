// Issue report docs/issues/U66-A3-A8-omp-ops-institution-delete-fails.md (U66 A3, A8):
// what a Site Administrator can still do with a press (server) that walk.js
// left half deleted. Runs on the same dataset fleet right after walk.js, with
// no reset, on OMP and OPS (OJS removed its journal).
//   a. Hosted … › the dataset's context › "Edit": untick "Enable this press
//      to appear publicly on the site", "Save"; then its home page.
//   b. The way round off screen: delete the context's institutions in the
//      database (institution_settings, institution_ip and the usage
//      statistics rows cascade), then "Remove" › "OK" again. Reads what the
//      re-run leaves: the context row, and on OMP data_object_tombstones and
//      the site-wide OAI-PMH list.
// Run: PROBE_FEATURE=issues-rv1 PROBE_AGENT=rv1 ONLY=omp,ops node bin/probe.js all shared/playwright/checks/issues/omp-ops-institution-delete-fails/after.js
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const LABELS = {
    omp: {hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

forEachApp(async (app) => {
    if (!LABELS[app.name]) return;
    if (!app.dataset) throw new Error('after.js runs on a dataset fleet left by walk.js');
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const ctx = app.contextPath;
    const {table, id} = app.contextTables;
    const cid = sql(app, `select ${id} from ${table} where path='${ctx}'`);
    if (!cid) throw new Error(`no context ${ctx}: run walk.js first, without a reset`);
    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const oai = async (page, where) => {
        const r = await page.request.get(app.url(`/index.php/${where}/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`));
        const body = (await r.text()).replace(/\s+/g, ' ');
        return {status: r.status(), headers: [...body.matchAll(/<header( status="deleted")?>\s*<identifier>([^<]*)<\/identifier>/g)].map((m) => `${m[1] ? 'deleted ' : ''}${m[2]}`)};
    };
    const hostedUrl = app.url('/index.php/index/en/admin/contexts');

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        const hosted = new HostedJournalsPage(page, LABELS[app.name]);
        fact('before', {enabled: sql(app, `select enabled from ${table} where ${id}=${cid}`), institutions: sql(app, `select count(*) from institutions where context_id=${cid}`),
            userGroups: sql(app, `select count(*) from user_groups where context_id=${cid}`), tombstones: sql(app, 'select count(*) from data_object_tombstones'), siteOai: await oai(page, 'index')});

        // a. Edit › untick "Enable…" › Save
        await page.goto(hostedUrl);
        await hosted.expectOpen();
        let res = null;
        let err = null;
        try {
            const win = await hosted.openEdit(ctx);
            await win.setBox(win.enableBox, false);
            res = await win.pressSave();
            await sleep(1500);
        } catch (e) {
            err = flat(e.message, 200);
        }
        const s = await screen(page);
        record('a-edit-after-save', s);
        await page.goto(app.url(`/index.php/${ctx}`));
        await idle(page);
        const home = await screen(page);
        record('a-home-after-disable', home);
        fact('a disable', {saveStatus: res ? res.status() : null, error: err, enabled: sql(app, `select enabled from ${table} where ${id}=${cid}`),
            homeUrl: page.url().replace(/^https?:\/\/[^/]+/, ''), homeText: flat(home.text.main, 200)});

        // b. SQL way round, then "Remove" › "OK" again
        sql(app, `delete from institutions where context_id=${cid}`);
        await page.goto(hostedUrl);
        await hosted.expectOpen();
        const controls = await hosted.rowControls(ctx);
        await controls.getByRole('link', {name: 'Remove', exact: true}).click();
        const conf = page.getByRole('dialog', {name: 'Confirm', exact: true});
        await conf.waitFor({timeout: T});
        const answered = page.waitForResponse((r) => /delete-context/.test(r.url()), {timeout: 120_000});
        await conf.getByRole('button', {name: 'OK', exact: true}).click();
        const del = await answered;
        await sleep(2000);
        await page.goto(hostedUrl);
        await idle(page);
        fact('b remove again', {status: del.status(), rowAfterReload: await hosted.row(ctx).count(), contextRow: sql(app, `select count(*) from ${table} where ${id}=${cid}`),
            tombstones: sql(app, 'select data_object_id, oai_identifier from data_object_tombstones order by 1').split('\n').filter(Boolean), siteOai: await oai(page, 'index')});
    } finally {
        record('facts', facts);
        await close();
    }
});
