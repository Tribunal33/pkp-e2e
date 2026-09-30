// Neighbour check for docs/issues/U19-A1-oai-journal-deleted-records-first-journal.md
// (spec U19 register A1): what the fix must leave alone, and the series sets
// it also mends on a press. Walked with the fix in and out (trial.sh).
// On PKP's default test dataset, first context only (no second one):
//   1  admin: publicknowledge's published item (OJS 17, OMP 14) › "Unpublish"
//   2  signed out: publicknowledge's list, its list for the item's section
//      (series) set, GetRecord of the deleted identifier; the site-wide list,
//      with set=publicknowledge and with the section's (series') set.
// Every read must list the deleted record, fix in or out, except the press's
// series set (OMP, `publicknowledge:psy`, series id 5): the unfixed query
// joins series id 1 there, so the deleted record is missing until the fix.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w04 --dataset 1 --reset
// Run:          PROBE_RUN=<fix|nofix> PROBE_FEATURE=issues-w04 PROBE_AGENT=w04 node bin/probe.js ojs|omp shared/playwright/checks/issues/oai-journal-deleted-records-first-journal/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const ITEM = {ojs: {id: 17, set: 'publicknowledge:ART'}, omp: {id: 14, set: 'publicknowledge:psy'}};

/** The OAI answer as data: error, headers, earliestDatestamp, set specs. */
function parseOai(body) {
    const records = [];
    const re = /<header( status="deleted")?>([\s\S]*?)<\/header>/g;
    let m;
    while ((m = re.exec(body))) {
        const inner = m[2];
        records.push({
            identifier: (inner.match(/<identifier>([^<]+)<\/identifier>/) || [])[1] || null,
            deleted: !!m[1],
            datestamp: (inner.match(/<datestamp>([^<]+)<\/datestamp>/) || [])[1] || null,
            setSpecs: [...inner.matchAll(/<setSpec>([^<]+)<\/setSpec>/g)].map((x) => x[1]),
        });
    }
    return {
        error: (body.match(/<error code="([^"]+)">([^<]*)<\/error>/) || [null]).slice(1).join(': ') || null,
        records,
        earliestDatestamp: (body.match(/<earliestDatestamp>([^<]+)<\/earliestDatestamp>/) || [])[1] || null,
        setSpecs: [...body.matchAll(/<set>\s*<setSpec>([^<]+)<\/setSpec>/g)].map((x) => x[1]),
    };
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    if (!ITEM[app.name]) return;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    const {id, set} = ITEM[app.name];
    let n = 0;
    const rec = async (page, label) => record(`n${String(++n).padStart(2, '0')}-${label}`, await screen(page).catch((e) => ({error: String(e)})));

    // 1: unpublish the first context's item on its workflow.
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
            await idle(page);
            const link = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
            if (!(await link.isVisible().catch(() => false))) await page.getByRole('link', {name: 'Publication', exact: true}).first().click().catch(() => {});
            await link.click();
            await page.locator('h2', {hasText: 'Title & Abstract'}).first().waitFor({timeout: T});
            await idle(page);
            await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Unpublish', exact: true}).click();
            const dialog = page.getByRole('dialog').filter({hasText: "Are you sure you don't want this to be published?"}).last();
            await dialog.waitFor({timeout: T});
            const done = page.waitForResponse((r) => /\/unpublish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
            await dialog.getByRole('button', {name: 'Unpublish', exact: true}).last().click();
            fact('1 unpublish', {submissionId: id, answer: (await done).status()});
            await idle(page); await pause(500);
            await rec(page, 'unpublished');
            await signOut(page);
        } finally { await close(); }
    }

    // 2: signed out, the reads.
    {
        const {page, close} = await launch(app);
        try {
            const LI = 'verb=ListIdentifiers&metadataPrefix=oai_dc';
            const pk = (q) => `/index.php/${app.contextPath}/oai?${q}`;
            const site = (q) => `/index.php/index/oai?${q}`;
            const read = async (label, rel) => {
                await page.goto(app.url(rel)).catch(() => {});
                await rec(page, `oai-${label}`);
                const raw = await page.request.get(app.url(rel));
                const o = parseOai(await raw.text());
                const deleted = o.records.filter((r) => r.deleted).map((r) => `${r.identifier} [${r.setSpecs.join(',')}]`);
                fact(`2 ${label}`, {status: raw.status(), error: o.error, deleted, live: o.records.filter((r) => !r.deleted).length});
                return o;
            };
            const list = await read('first list', pk(LI));
            await read('first list, item set', pk(`${LI}&set=${encodeURIComponent(set)}`));
            const ident = (list.records.find((r) => r.deleted) || {}).identifier;
            if (ident) await read('first getrecord', pk(`verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(ident)}`));
            await read('site list', site(LI));
            await read('site list, set publicknowledge', site(`${LI}&set=publicknowledge`));
            await read('site list, item set', site(`${LI}&set=${encodeURIComponent(set)}`));
        } finally { record('neighbour-facts', facts); await close(); }
    }
});
