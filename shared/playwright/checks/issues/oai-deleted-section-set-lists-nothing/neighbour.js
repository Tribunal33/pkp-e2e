// Neighbour check for docs/issues/U19-A19-oai-deleted-section-set-lists-nothing.md
// (spec U19 register A19): what the fix must leave alone. A deleted record
// in a section that still exists stays in that section's set and in no
// other; a set that never existed stays empty. Walked with the fix in and
// out, main, OJS and OPS, on PKP's default test dataset:
//   n1  dbarnes: OJS submission 17 (in "Articles") › "Unpublish"
//       (OPS: submission 2, in "Preprints", › "Unpost")
//   n2  signed out: ListIdentifiers oai_dc set=publicknowledge:ART (OPS :PRE)
//   n3  signed out: set=publicknowledge:REV (OJS only; the other live section)
//   n4  signed out: set=publicknowledge:NOPE (never existed)
//   n5  signed out: set=publicknowledge (the journal's / server's own set)
// Expected with the fix as without: article/17 (deleted) in ART and the
// journal's set, in no other; NOPE and REV "No matching records".
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w17 --dataset 3 --reset
// Run:          PROBE_RUN=<fix|nofix> PROBE_FEATURE=issues-w17 PROBE_AGENT=w17 ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

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
    return {error: (body.match(/<error code="([^"]+)">([^<]*)<\/error>/) || [null]).slice(1).join(': ') || null, records};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name === 'omp') return;
    if ((app.line || 'main') !== 'main') throw new Error('neighbour.js is main only');
    const ojs = app.name === 'ojs';
    const ctx = app.contextPath;
    const id = ojs ? 17 : 2;
    const live = ojs ? 'ART' : 'PRE';
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    fact('fleet', {line: 'main', dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null});
    let n = 0;
    const rec = async (page, label) => {
        const name = `n${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
    };
    const oai = async (label, q) => {
        const {page, close} = await launch(app);
        try {
            const rel = `/index.php/${ctx}/oai?${q}`;
            await page.goto(app.url(rel));
            await pause(200);
            await rec(page, `oai-${label}`);
            const res = await page.request.get(app.url(rel));
            const o = parseOai(await res.text());
            return {address: rel, status: res.status(), error: o.error,
                records: o.records.map((r) => `${r.identifier.replace(/^oai:[^:]+:/, '')}${r.deleted ? ' (deleted)' : ''} [${r.setSpecs.join(', ')}]`)};
        } finally { await close(); }
    };

    // n1: withdraw an item in a section that stays.
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${id}`));
            await idle(page); await pause(1500);
            const ta = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
            if (!(await ta.isVisible().catch(() => false))) await page.getByRole('link', {name: /^(Publication|Preprint)$/}).first().click();
            await ta.click();
            await idle(page); await pause(1000);
            const right = page.locator('[data-cy="workflow-controls-right"]');
            const button = right.getByRole('button', {name: /^(Unpublish|Unpost)$/});
            await button.first().waitFor({timeout: T});
            const word = flat(await button.first().innerText());
            await button.first().click();
            const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: word, exact: true})}).last();
            await dialog.waitFor({timeout: T});
            const done = page.waitForResponse((r) => /\/unpublish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
            await dialog.getByRole('button', {name: word, exact: true}).last().click();
            const r = await done;
            await idle(page); await pause(800);
            await rec(page, 'unpublished');
            fact(`n1 ${word} ${id}`, {answer: r.status(), status: flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => ''))});
            await signOut(page);
        } finally { await close(); }
    }

    const q = (set) => `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${set}`;
    fact(`n2 set=${live}`, await oai('n2-live', q(`${ctx}:${live}`)));
    if (ojs) fact('n3 set=REV', await oai('n3-rev', q(`${ctx}:REV`)));
    fact('n4 set=NOPE', await oai('n4-nope', q(`${ctx}:NOPE`)));
    fact('n5 set=context', await oai('n5-context', q(ctx)));
    record('neighbour-facts', facts);
});
