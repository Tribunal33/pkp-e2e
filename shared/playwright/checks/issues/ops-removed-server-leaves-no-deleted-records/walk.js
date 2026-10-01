// Issue report walk: docs/issues/U19-OPS4-ops-removed-server-leaves-no-deleted-records.md
// (spec U19 register OPS4). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
// OPS shows the fault, OJS and OMP are the control (same steps). The kit
// builds nothing; the steps remove the dataset's own `publicknowledge`.
//   1  signed out: site-wide ListIdentifiers oai_dc (/index.php/index/oai)
//   2  signed out: site-wide GetRecord of one listed identifier (OPS preprint/2)
//   3  admin: Administration › "Hosted Servers" ("Hosted Journals", "Hosted Presses")
//   4  the row of publicknowledge: arrow › "Remove"
//   5  "Confirm" › "OK"
//   6  signed out: step 1 again
//   7  signed out: step 2 again
// Each OAI read records the browser view (screen()) and the raw answer's
// headers; beside it (Evidence only) the stored tombstone rows.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w23 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-w23 PROBE_AGENT=w23 node bin/probe.js all shared/playwright/checks/issues/ops-removed-server-leaves-no-deleted-records/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w23-3_5 PROBE_AGENT=w23 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w23/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const HOSTED = {ojs: 'Hosted Journals', omp: 'Hosted Presses', ops: 'Hosted Servers'};

/** The OAI answer as data: error, headers. */
function parseOai(body) {
    const records = [];
    const re = /<header( status="deleted")?>([\s\S]*?)<\/header>/g;
    let m;
    while ((m = re.exec(body))) {
        const inner = m[2];
        records.push({
            identifier: (inner.match(/<identifier>([^<]+)<\/identifier>/) || [])[1] || null,
            deleted: !!m[1],
            setSpecs: [...inner.matchAll(/<setSpec>([^<]+)<\/setSpec>/g)].map((x) => x[1]),
        });
    }
    const err = body.match(/<error code="([^"]+)">([^<]*)<\/error>/);
    return {error: err ? `${err[1]}: ${err[2]}` : null, records,
        token: (body.match(/<resumptionToken[^>]*>([^<]*)<\/resumptionToken>/) || [])[1] || null};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null});
    let n = 0;
    const rec = async (page, label) => {
        const name = `s${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
    };
    const tombstones = () => sql(app, 'SELECT count(*) FROM data_object_tombstones');
    const contexts = () => sql(app, `SELECT path FROM ${app.contextTables.table}`);

    /** One site-wide OAI read, signed out: the page as a person sees it, then the raw answer. */
    const oai = async (label, q) => {
        const {page, close} = await launch(app);
        try {
            const rel = `/index.php/index/oai?${q}`;
            await page.goto(app.url(rel));
            await pause(200);
            await rec(page, `oai-${label}`);
            let all = [];
            let res = await page.request.get(app.url(rel));
            let o = parseOai(await res.text());
            const first = o;
            all = all.concat(o.records);
            for (let i = 0; o.token && i < 20; i++) {
                res = await page.request.get(app.url(`/index.php/index/oai?verb=${q.match(/verb=(\w+)/)[1]}&resumptionToken=${encodeURIComponent(o.token)}`));
                o = parseOai(await res.text());
                all = all.concat(o.records);
            }
            return {address: rel, status: res.status(), error: first.error, count: all.length,
                deleted: all.filter((r) => r.deleted).length,
                records: all.map((r) => `${r.identifier}${r.deleted ? ' (deleted)' : ''}`)};
        } finally { await close(); }
    };

    // Repository identifier from Identify (the dataset's config).
    let repoId;
    {
        const {page, close} = await launch(app, {record: false});
        try {
            const res = await page.request.get(app.url('/index.php/index/oai?verb=Identify'));
            const body = await res.text();
            repoId = (body.match(/<repositoryIdentifier>([^<]+)<\/repositoryIdentifier>/) || [])[1];
            fact('identify', {repositoryIdentifier: repoId, deletedRecord: (body.match(/<deletedRecord>([^<]+)</) || [])[1]});
        } finally { await close(); }
    }

    fact('db before', {tombstones: await tombstones(), contexts: await contexts()});
    const LIST = 'verb=ListIdentifiers&metadataPrefix=oai_dc';
    const s1 = await oai('1-list', LIST);
    fact('1 ListIdentifiers', s1);
    const own = s1.records.map((r) => r.replace(/ \(deleted\)$/, '')).filter((id) => id.startsWith(`oai:${repoId}:`));
    const target = app.name === 'ops' ? `oai:${repoId}:preprint/2` : own[0];
    const GET = `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(target)}`;
    fact('2 GetRecord', await oai('2-get', GET));

    // Steps 3-5: admin removes the context through Administration.
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            await page.goto(app.url(app.line && app.line !== 'main' && app.line !== 'stable-3_5_0' ? '/index.php/index/admin' : '/index.php/index/en/admin'));
            await idle(page);
            await page.locator('main').getByRole('link', {name: HOSTED[app.name], exact: true}).click();
            await page.waitForURL(/\/admin\/contexts/, {timeout: T, waitUntil: 'commit'});
            const grid = page.locator('#contextGridContainer');
            const row = grid.locator('tbody tr.gridRow').filter({has: page.locator('td:nth-child(2)', {hasText: /^\s*publicknowledge\s*$/})});
            await row.waitFor({timeout: T});
            await idle(page);
            await rec(page, '3-hosted');
            const controls = row.locator('xpath=following-sibling::tr[1]');
            await row.locator('a.show_extras').click();
            const remove = controls.getByRole('link', {name: 'Remove', exact: true});
            await remove.waitFor({timeout: T});
            await remove.click();
            const dialog = page.getByRole('dialog', {name: 'Confirm', exact: true});
            await dialog.waitFor({timeout: T});
            await rec(page, '5-confirm');
            fact('5 confirm', flat(await dialog.innerText()));
            const done = page.waitForResponse((r) => r.request().method() === 'POST' && /delete-context/.test(r.url()), {timeout: 120_000});
            await dialog.getByRole('button', {name: 'OK', exact: true}).click();
            const r = await done;
            let body = '';
            try { body = (await r.text()).slice(0, 600); } catch (e) { body = String(e).slice(0, 200); }
            await idle(page); await pause(800);
            await rec(page, '5-after-ok');
            fact('5 delete-context', {status: r.status(), body,
                rowsLeft: await grid.locator('tbody tr.gridRow').count(),
                notices: await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])});
            await signOut(page).catch(() => {});
        } finally { await close(); }
    }

    fact('db after', {tombstones: await tombstones(), contexts: await contexts(),
        submissions: await sql(app, 'SELECT count(*) FROM submissions')});
    const s6 = await oai('6-list', LIST);
    fact('6 ListIdentifiers', s6);
    fact('7 GetRecord', await oai('7-get', GET));
    record('facts', facts);
});
