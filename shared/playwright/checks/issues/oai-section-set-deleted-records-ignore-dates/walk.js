// Issue report walk: docs/issues/U19-A20-oai-section-set-deleted-records-ignore-dates.md
// (spec U19 register A20). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// OJS and OPS (OMP's deleted-records query has no such condition): its
// `dbarnes`, `publicknowledge`, OJS submission 17 "Antimicrobial, heavy metal
// resistance …" (section "Articles", ART) and OPS submission 2 "The Facets Of
// Job Satisfaction …" (section "Preprints", PRE). Nothing is created beyond
// what the steps say; the kit builds nothing. Step numbers are the report's:
//   1  signed out: ListIdentifiers set=<ctx>:<SEC> from=2030-01-01 (before)
//   2  dbarnes: the submission › "Title & Abstract"
//   3  "Unpublish" (OPS "Unpost") and its confirmation
//   4  signed out: step 1's address again
//   5  the same with until=2000-01-01
//   6  step 4 at the site-wide address /index.php/index/oai
//   7  step 4 with verb=ListRecords
//   8  control: step 4 with the journal's set (set=<ctx>)
// Neighbour (after the steps; walked with the fix in and out): the section's
// set with no dates, and with from=yesterday, still lists the
// deleted record; with from=2030-01-01 and no set, nothing.
// Each OAI read records the browser view (screen()) and the raw answer's
// headers; beside it (Evidence only) the stored tombstone rows.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w18 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w18 PROBE_AGENT=w18 ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w18-3_5 PROBE_AGENT=w18 ONLY=ojs,ops node bin/probe.js all <this file>
// Facts: .reports/<feature>/w18/walk-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const day = (offset) => new Date(Date.now() + offset * 86400_000).toISOString().slice(0, 10);

/** The OAI answer as data: error and headers. */
function parseOai(body) {
    const records = [];
    const re = /<header( status="deleted")?>([\s\S]*?)<\/header>/g;
    let m;
    while ((m = re.exec(body))) {
        const inner = m[2];
        records.push({
            identifier: (inner.match(/<identifier>([^<]+)<\/identifier>/) || [])[1] || null,
            datestamp: (inner.match(/<datestamp>([^<]+)<\/datestamp>/) || [])[1] || null,
            deleted: !!m[1],
            setSpecs: [...inner.matchAll(/<setSpec>([^<]+)<\/setSpec>/g)].map((x) => x[1]),
        });
    }
    return {error: (body.match(/<error code="([^"]+)">([^<]*)<\/error>/) || [null]).slice(1).join(': ') || null, records};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name === 'omp') return;
    const ojs = app.name === 'ojs';
    const line = app.line || 'main';
    const ctx = app.contextPath;
    const id = ojs ? 17 : 2;
    const sec = `${ctx}:${ojs ? 'ART' : 'PRE'}`;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    fact('fleet', {line, dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null});
    let n = 0;
    const rec = async (page, label) => {
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
    };
    const tombs = () => (sql(app, "select t.oai_identifier||' set_spec='||t.set_spec||' date_deleted='||t.date_deleted from data_object_tombstones t order by t.tombstone_id") || '').trim().split('\n').filter(Boolean);

    // Signed out: a browser types the OAI address; the raw answer comes from the same context.
    const oai = async (label, where, q) => {
        const {page, close} = await launch(app);
        try {
            const rel = `/index.php/${where}/oai?${q}`;
            await page.goto(app.url(rel));
            await pause(200);
            await rec(page, `oai-${label}`);
            const res = await page.request.get(app.url(rel));
            const body = await res.text();
            record(`${String(n).padStart(2, '0')}-oai-${label}-raw`, {address: rel, body: body.slice(0, 6000)});
            const o = parseOai(body);
            return {address: rel, status: res.status(), error: o.error,
                records: o.records.map((r) => `${r.identifier.replace(/^oai:[^:]+:/, '')}${r.deleted ? ' (deleted)' : ''} ${r.datestamp} [${r.setSpecs.join(', ')}]`)};
        } finally { await close(); }
    };
    const ids = (q) => `verb=ListIdentifiers&metadataPrefix=oai_dc&${q}`;

    // ---- the workflow (from the U19 A11 and A19 walks) ----
    const right = (page) => page.locator('[data-cy="workflow-controls-right"]');
    const status = async (page) => flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => ''));
    const openTitleAbstract = async (page) => {
        await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${id}`));
        await idle(page); await pause(1000);
        const link = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
        if (!(await link.isVisible().catch(() => false))) {
            await page.getByRole('link', {name: /^(Publication|Preprint)$/}).first().click().catch(() => {});
        }
        await link.click();
        await page.locator('h2', {hasText: 'Title & Abstract'}).first().waitFor({timeout: T});
        await idle(page); await pause(1000);
        await rec(page, `workflow-${id}`);
    };
    const unpublish = async (page) => {
        const button = right(page).getByRole('button', {name: /^(Unpublish|Unpost)$/});
        await button.first().waitFor({timeout: T});
        const word = flat(await button.first().innerText());
        await button.first().click();
        const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: word, exact: true})}).last();
        await dialog.waitFor({timeout: T});
        await rec(page, 'unpublish-confirm');
        const question = flat(await dialog.innerText()).slice(0, 200);
        const done = page.waitForResponse((r) => /\/unpublish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await dialog.getByRole('button', {name: word, exact: true}).last().click();
        const r = await done;
        await idle(page); await pause(800);
        await rec(page, 'unpublished');
        return {pressed: word, question, answer: r.status(), status: await status(page)};
    };

    // Step 1: before anything is deleted.
    fact('step 1 set=section from=2030 (before)', await oai('s1', ctx, ids(`set=${sec}&from=2030-01-01`)));

    // Steps 2-3: dbarnes unpublishes the submission.
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            await openTitleAbstract(page);
            fact('step 3 unpublish', await unpublish(page));
            await signOut(page);
        } finally { await close(); }
    }
    fact('tombstones after step 3', tombs());

    // Steps 4-8: signed out, the OAI addresses.
    fact('step 4 set=section from=2030', await oai('s4', ctx, ids(`set=${sec}&from=2030-01-01`)));
    fact('step 5 set=section until=2000', await oai('s5', ctx, ids(`set=${sec}&until=2000-01-01`)));
    fact('step 6 site-wide set=section from=2030', await oai('s6', 'index', ids(`set=${sec}&from=2030-01-01`)));
    fact('step 7 ListRecords set=section from=2030', await oai('s7', ctx, `verb=ListRecords&metadataPrefix=oai_dc&set=${sec}&from=2030-01-01`));
    fact('step 8 set=journal from=2030 (control)', await oai('s8', ctx, ids(`set=${ctx}&from=2030-01-01`)));

    // Neighbour: the deleted record stays in its section's set when the dates include it.
    fact('n1 set=section (no dates)', await oai('n1', ctx, ids(`set=${sec}`)));
    // `from` only: on OPS any `until` fails with a server error (U19 OPS1, a report of its own).
    fact('n2 set=section from=yesterday', await oai('n2', ctx, ids(`set=${sec}&from=${day(-1)}`)));
    fact('n3 no set from=2030', await oai('n3', ctx, ids('from=2030-01-01')));
    record('walk-facts', facts);
});
