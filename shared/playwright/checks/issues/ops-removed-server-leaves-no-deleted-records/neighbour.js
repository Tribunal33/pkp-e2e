// Neighbour check for docs/issues/U19-OPS4-ops-removed-server-leaves-no-deleted-records.md
// (spec U19 register OPS4): what the fix must leave alone. A preprint already
// unposted before the server is removed keeps its one deleted record (no second
// one, no change of identifier), and the removal adds one deleted record per
// posted preprint, never two. Walked on OPS main with the fix in and out, on
// PKP's default test dataset:
//   n1  dbarnes: submission 2 "The Facets Of Job Satisfaction…" › Preprint ›
//       "Unpost" and its confirmation
//   n2  signed out: site-wide ListIdentifiers oai_dc
//   n3  admin: Administration › "Hosted Servers" › publicknowledge › "Remove" › "OK"
//   n4  signed out: site-wide ListIdentifiers oai_dc again
// Expected without the fix: preprint/2 the only deleted record in n2 and n4.
// Expected with the fix: n2 the same; n4 preprint/2 once plus the 16 other
// posted preprints, each once, all deleted.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w23 --dataset 2 --reset
// Run:          PROBE_RUN=<fix|nofix> PROBE_FEATURE=issues-w23 PROBE_AGENT=w23 ONLY=ops node bin/probe.js ops shared/playwright/checks/issues/ops-removed-server-leaves-no-deleted-records/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

function parseOai(body) {
    const records = [];
    const re = /<header( status="deleted")?>([\s\S]*?)<\/header>/g;
    let m;
    while ((m = re.exec(body))) {
        records.push({identifier: (m[2].match(/<identifier>([^<]+)<\/identifier>/) || [])[1] || null, deleted: !!m[1]});
    }
    const err = body.match(/<error code="([^"]+)">([^<]*)<\/error>/);
    return {error: err ? `${err[1]}: ${err[2]}` : null, records,
        token: (body.match(/<resumptionToken[^>]*>([^<]*)<\/resumptionToken>/) || [])[1] || null};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    if (app.name !== 'ops') return;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null});
    let n = 0;
    const rec = async (page, label) => {
        const name = `n${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
    };
    const list = async (label) => {
        const {page, close} = await launch(app);
        try {
            const rel = '/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc';
            await page.goto(app.url(rel));
            await rec(page, label);
            let o = parseOai(await (await page.request.get(app.url(rel))).text());
            const first = o; let all = o.records;
            for (let i = 0; o.token && i < 20; i++) {
                o = parseOai(await (await page.request.get(app.url(`/index.php/index/oai?verb=ListIdentifiers&resumptionToken=${encodeURIComponent(o.token)}`))).text());
                all = all.concat(o.records);
            }
            const ids = all.map((r) => r.identifier);
            return {error: first.error, count: all.length, deleted: all.filter((r) => r.deleted).length,
                duplicates: ids.filter((x, i) => ids.indexOf(x) !== i),
                records: all.map((r) => `${r.identifier.replace(/^oai:[^:]+:/, '')}${r.deleted ? ' (deleted)' : ''}`)};
        } finally { await close(); }
    };

    // n1: dbarnes unposts submission 2.
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=2`));
            await idle(page); await pause(1500);
            const ta = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
            if (!(await ta.isVisible().catch(() => false))) await page.getByRole('link', {name: /^(Publication|Preprint)$/}).first().click();
            await ta.click();
            await idle(page); await pause(1000);
            const button = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^Unpost$/});
            await button.first().waitFor({timeout: T});
            await button.first().click();
            const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Unpost', exact: true})}).last();
            await dialog.waitFor({timeout: T});
            const done = page.waitForResponse((r) => /\/unpublish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
            await dialog.getByRole('button', {name: 'Unpost', exact: true}).last().click();
            const r = await done;
            await idle(page); await pause(800);
            await rec(page, 'unposted');
            fact('n1 Unpost 2', {answer: r.status()});
            await signOut(page);
        } finally { await close(); }
    }
    fact('n2 list', await list('n2-list'));

    // n3: admin removes the server.
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/en/admin/contexts'));
            const grid = page.locator('#contextGridContainer');
            const row = grid.locator('tbody tr.gridRow').filter({has: page.locator('td:nth-child(2)', {hasText: /^\s*publicknowledge\s*$/})});
            await row.waitFor({timeout: T});
            await idle(page);
            await row.locator('a.show_extras').click();
            const remove = row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Remove', exact: true});
            await remove.waitFor({timeout: T});
            await remove.click();
            const dialog = page.getByRole('dialog', {name: 'Confirm', exact: true});
            await dialog.waitFor({timeout: T});
            const done = page.waitForResponse((r) => r.request().method() === 'POST' && /delete-context/.test(r.url()), {timeout: 120_000});
            await dialog.getByRole('button', {name: 'OK', exact: true}).click();
            const r = await done;
            await idle(page); await pause(800);
            await rec(page, 'removed');
            fact('n3 delete-context', {status: r.status(), rowsLeft: await grid.locator('tbody tr.gridRow').count()});
            await signOut(page).catch(() => {});
        } finally { await close(); }
    }
    fact('n4 list', await list('n4-list'));
    fact('db tombstones', {rows: await sql(app, 'SELECT count(*) FROM data_object_tombstones'),
        perObjectMax: await sql(app, 'SELECT coalesce(max(c),0) FROM (SELECT count(*) c FROM data_object_tombstones GROUP BY data_object_id) t')});
    record('neighbour-facts', facts);
});
