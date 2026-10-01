// Issue report walk: docs/issues/U19-A24-oai-driver-set-complete-list-offers-resume.md
// (spec U19 register A24). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// OJS only (DRIVER is an OJS plugin): `dbarnes`, `publicknowledge`, its two
// published articles 1 and 17. Nothing is created beyond what the steps say;
// the kit builds nothing. One group per run, each from a freshly reset
// dataset (GROUP=A or GROUP=B); step numbers are the report's:
//   A1 / B1  dbarnes: submission 1 (A; its "Version of Record 1.0") or 17 (B) ›
//            "Unpublish" (DRIVER is off)
//   A2 / B2  dbarnes: Settings › Website › Plugins › tick "DRIVER"
//   A3 / B3  signed out: ListRecords set=driver (browser view and raw answer)
//   A4 / B4  "Resume"
// GROUP=C (the 3.5 cap): no withdrawal; tick "DRIVER", then the set and the whole
// list, pressing "Resume" while the token is live. It needs a list longer than one
// answer, so it runs with `oai_max_records = 1`: serve.js of the U19 A4 walk restarts
// the fleet's server with that config copy (`PKP_E2E_DATASET=1 node
// shared/playwright/checks/issues/oai-last-part-offers-resume/serve.js on ojs`, `off`
// after). Groups A and B also run under it, to read a list of several parts.
// Beside them (not steps): the same with ListIdentifiers, and the journal's
// whole list with no set, as the control.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w20 --dataset 1 --reset
// Run (main):   GROUP=A PROBE_RUN=a PROBE_FEATURE=issues-w20 PROBE_AGENT=w20 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-complete-list-offers-resume/walk.js
//               (reset again, then GROUP=B PROBE_RUN=b …)
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 GROUP=A PROBE_RUN=r35a PROBE_FEATURE=issues-w20-3_5 PROBE_AGENT=w20 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/w20/facts-<run>-ojs.json
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const GROUP = (process.env.GROUP || '').toUpperCase();

/** The raw OAI answer as data: error, records and the resumption token. */
function parseOai(body) {
    const records = [];
    const re = /<header( status="deleted")?>([\s\S]*?)<\/header>/g;
    let m;
    while ((m = re.exec(body))) {
        const inner = m[2];
        const id = (inner.match(/<identifier>([^<]+)<\/identifier>/) || [])[1] || '';
        const sets = [...inner.matchAll(/<setSpec>([^<]+)<\/setSpec>/g)].map((x) => x[1]);
        records.push(`${id.replace(/^oai:[^:]+:/, '')}${m[1] ? ' (deleted)' : ''} [${sets.join(', ')}]`);
    }
    const tok = body.match(/<resumptionToken([^>]*?)(\/>|>([^<]*)<\/resumptionToken>)/);
    const attr = (a) => (tok && (tok[1].match(new RegExp(`${a}="([^"]*)"`)) || [])[1]) || null;
    return {
        error: (body.match(/<error code="([^"]+)">([^<]*)<\/error>/) || [null]).slice(1).join(': ') || null,
        records,
        token: tok ? {id: (tok[3] || '').trim() || null, completeListSize: attr('completeListSize'), cursor: attr('cursor')} : null,
    };
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name !== 'ojs') return;
    if (!['A', 'B', 'C'].includes(GROUP)) throw new Error('set GROUP=A, B or C');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    const line = app.line || 'main';
    const ctx = app.contextPath;
    fact('fleet', {line, dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null, group: GROUP});
    let n = 0;
    const rec = async (page, label) => {
        const name = `${GROUP}${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
    };

    // Signed out: a browser opens the OAI address, then presses "Resume" while the answer holds a live token (at most 3 times).
    const oaiList = async (label, q) => {
        const {page, close} = await launch(app);
        try {
            const parts = [];
            await page.goto(app.url(`/index.php/${ctx}/oai?${q}`));
            for (let i = 0; i < 4; i++) {
                await pause(200);
                await rec(page, `${label}-part${i + 1}`);
                const text = await page.locator('body').innerText().catch(() => '');
                const raw = parseOai(await (await page.request.get(page.url())).text());
                const resume = page.getByRole('link', {name: 'Resume', exact: true});
                const offersResume = (await resume.count()) > 0;
                parts.push({address: page.url().replace(/^https?:\/\/[^/]+/, ''), moreResultsShown: text.includes('There are more results.'), offersResume, ...raw});
                // An empty closing token ends the list (its "Resume" in the browser view is U19 A4, not followed).
                if (!offersResume || !(raw.token && raw.token.id) || i === 3) break;
                await resume.first().click();
                await page.waitForLoadState('load');
            }
            return parts;
        } finally { await close(); }
    };

    // ---- workflow helpers (from the U19 A11 walk) ----
    const right = (page) => page.locator('[data-cy="workflow-controls-right"]');
    const status = async (page) => flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => ''));
    const openPublication = async (page, id) => {
        await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${id}`));
        await idle(page); await pause(1000);
        const link = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
        if (!(await link.isVisible().catch(() => false))) {
            await page.getByRole('link', {name: 'Publication', exact: true}).first().click().catch(() => {});
        }
        // Submission 1 opens on its unpublished "Version of Record 1.1"; its published version is 1.0.
        const v10 = page.getByRole('link', {name: 'Version of Record 1.0', exact: true}).first();
        if (id === 1 && (await v10.isVisible().catch(() => false))) {
            await v10.click();
            await idle(page); await pause(500);
        }
        await link.click();
        await page.locator('h2', {hasText: 'Title & Abstract'}).first().waitFor({timeout: T});
        await idle(page); await pause(1000);
        // 3.5 has no version menu: "All Versions" › "Version 1: <date published>".
        const all = page.getByRole('button', {name: 'All Versions', exact: true}).first();
        if (id === 1 && (await all.isVisible().catch(() => false))) {
            await all.click();
            await page.getByRole('menuitem', {name: /^Version 1:/}).first().click();
            await idle(page); await pause(1000);
        }
        await rec(page, `workflow-${id}`);
    };
    const unpublish = async (page) => {
        const button = right(page).getByRole('button', {name: 'Unpublish', exact: true});
        await button.first().waitFor({timeout: T});
        await button.first().click();
        const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Unpublish', exact: true})}).last();
        await dialog.waitFor({timeout: T});
        await rec(page, 'unpublish-confirm');
        const question = flat(await dialog.innerText()).slice(0, 200);
        const done = page.waitForResponse((r) => /\/unpublish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await dialog.getByRole('button', {name: 'Unpublish', exact: true}).last().click();
        const r = await done;
        await idle(page); await pause(500);
        await rec(page, 'unpublished');
        return {question, answer: r.status(), status: await status(page)};
    };
    const asEditor = async (label, fn) => {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            fact(label, await fn(page));
            await signOut(page);
        } finally { await close(); }
    };

    const withdrawn = {A: 1, B: 17}[GROUP];
    // Before step 1 (not a step): the journal's whole list, to show the starting state.
    fact('start whole list', await oaiList('start-all', 'verb=ListRecords&metadataPrefix=oai_dc'));
    // Step 1: dbarnes unpublishes the article while DRIVER is off (group C withdraws nothing).
    if (withdrawn) await asEditor(`step 1 unpublish ${withdrawn}`, async (page) => { await openPublication(page, withdrawn); return unpublish(page); });
    // Step 2: dbarnes ticks "DRIVER".
    await asEditor('step 2 tick DRIVER', async (page) => {
        const {WebsitePluginsPage} = require('../../../pages/PluginsPages.js');
        const plugins = new WebsitePluginsPage(page, ctx);
        await plugins.goto();
        const r = await plugins.list.tick('driverplugin');
        await rec(page, 'driver-ticked');
        return {answer: r.status()};
    });
    // Steps 3 and 4: the driver set, then "Resume".
    fact('steps 3-4 ListRecords set=driver', await oaiList('driver-records', 'verb=ListRecords&metadataPrefix=oai_dc&set=driver'));
    // Beside the steps: ListIdentifiers, and the whole list as the control.
    fact('ListIdentifiers set=driver', await oaiList('driver-ids', 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver'));
    fact('control whole list', await oaiList('all', 'verb=ListRecords&metadataPrefix=oai_dc'));
    record('facts', facts);
});
