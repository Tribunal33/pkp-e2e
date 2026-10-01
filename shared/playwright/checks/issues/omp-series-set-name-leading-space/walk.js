// Issue report walk: docs/issues/U19-OMP6-omp-series-set-name-leading-space.md
// (spec U19 register OMP6). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), OMP only: OJS
// sections and OPS sections have no "Prefix". The dataset's five series
// all have an empty "Prefix"; the kit builds nothing.
//   1-2. ListSets, raw answer: each series' <setName>
//   3.   Atom feed: the series <category term> of book 14
//   4.   RSS 2.0 feed: the series <category>
//   5-6. control: sign in as rvaca, Settings > Press > Series, edit
//        "History", Prefix "u19w22", Save
//   7.   ListSets again
//
// `neighbour` as the script's argument runs the neighbour check instead,
// for the fix trial: the same prefix set on screen, then the screens that
// show a series' name keep it (ListSets and the series grid read
// "u19w22 History", book 14's "Series" line "Psychology", the press's own
// set name unchanged), and the series pages keep answering: their heading
// is blank on main (a series found by its path loses its title, U17 OMP9),
// and the fix must not turn that into a server error.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w22 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-w22 PROBE_AGENT=w22 node bin/probe.js omp shared/playwright/checks/issues/omp-series-set-name-leading-space/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w22-3_5 PROBE_AGENT=w22 node bin/probe.js omp shared/playwright/checks/issues/omp-series-set-name-leading-space/walk.js
// Fix trial:    node bin/try-fix.js apply shared/playwright/checks/issues/omp-series-set-name-leading-space/fix.diff omp
//               reset, walk and neighbour, then node bin/try-fix.js revert omp
// Facts: .reports/<feature>/w22/facts[-neighbour][-<run>]-omp.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const mode = process.argv[2] === 'neighbour' ? 'neighbour' : 'walk';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 20000;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name !== 'omp') { console.log(`[${app.name}] no series prefix on this app: nothing to walk`); return; }
    const {page, close} = await launch(app);
    const facts = {fleet: {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, mode}};
    let n = 0;
    const snap = async (label) => {
        const name = `${mode}-${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e)}); }
        await shot(page, name).catch(() => {});
    };
    // Types the address (after /index.php/) and reads the raw answer the
    // browser received (its "view source"), since the styled view collapses
    // spaces.
    const raw = async (label, address) => {
        // A feed the browser offers as a download is read through the
        // browser's own request context instead.
        let r = await page.goto(app.url(`/index.php/${address}`)).catch(() => null);
        if (!r) r = await page.request.get(app.url(`/index.php/${address}`));
        await idle(page).catch(() => {});
        // The XML a harvester reads (the page source) is the same GET's raw
        // answer, fetched again from the address landed at: for an answer
        // styled by its XSL, Chromium's response body is the styled HTML.
        const body = await (await page.request.get(r.url())).text().catch(() => '');
        await snap(label);
        return {status: r ? r.status() : null, body};
    };
    const listSets = async (label) => {
        const {status, body} = await raw(label, `${app.contextPath}/oai?verb=ListSets`);
        const sets = [...body.matchAll(/<setSpec>([^<]*)<\/setSpec>\s*<setName>([^<]*)<\/setName>/g)]
            .map((m) => ({setSpec: m[1], setName: m[2], json: JSON.stringify(m[2])}));
        const out = {status, sets, shown: (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400)};
        console.log(`[omp] ${label}: ${status} ${sets.map((s) => `${s.setSpec}=${s.json}`).join(' | ')}`);
        return out;
    };
    const setPrefix = async () => {
        await signIn(page, 'rvaca');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/context`));
        const tab = page.getByRole('tab', {name: 'Series', exact: true}).first();
        await tab.waitFor({timeout: T}); await tab.click();
        const grid = page.locator('#seriesGridContainer');
        const row = grid.locator('tr.gridRow').filter({hasText: 'History'}).first();
        await row.waitFor({timeout: T});
        await snap('5-series-grid');
        await row.locator('a.show_extras').click();
        await grid.getByRole('link', {name: 'Edit', exact: true}).first().click();
        const form = page.locator('form#seriesForm');
        const prefix = form.locator('input[name="prefix[en]"]');
        await prefix.waitFor({timeout: T});
        await idle(page); await pause(500);
        facts.formBefore = {prefix: await prefix.inputValue(), title: await form.locator('input[name="title[en]"]').inputValue()};
        await prefix.fill('u19w22');
        await snap('6-series-form');
        await form.getByRole('button', {name: 'Save'}).click();
        await form.waitFor({state: 'hidden', timeout: T});
        await idle(page); await pause(500);
        await snap('6-series-saved');
        facts.gridAfter = (await grid.locator('tr.gridRow').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
        console.log(`[omp] form before ${JSON.stringify(facts.formBefore)}; grid after ${JSON.stringify(facts.gridAfter)}`);
    };
    try {
        if (mode === 'walk') {
            facts.listSets = await listSets('1-listsets');
            const atom = await raw('3-atom', `${app.contextPath}/gateway/plugin/WebFeedGatewayPlugin/atom`);
            facts.atom = {status: atom.status, series: [...atom.body.matchAll(/<category term="([^"]*)" label="Series"/g)].map((m) => JSON.stringify(m[1]))};
            const rss2 = await raw('4-rss2', `${app.contextPath}/gateway/plugin/WebFeedGatewayPlugin/rss2`);
            facts.rss2 = {status: rss2.status, series: [...rss2.body.matchAll(/<category domain="[^"]*\/category\/section">([^<]*)<\/category>/g)].map((m) => JSON.stringify(m[1]))};
            console.log(`[omp] atom ${JSON.stringify(facts.atom)}; rss2 ${JSON.stringify(facts.rss2)}`);
            await setPrefix();
            facts.listSetsAfterPrefix = await listSets('7-listsets-after-prefix');
        } else {
            await setPrefix();
            facts.listSets = await listSets('n1-listsets');
            const heading = async (label, address) => {
                const {status} = await raw(label, address);
                const out = {status, h1: await page.locator('h1').first().evaluate((e) => e.textContent).catch(() => null), title: await page.title()};
                console.log(`[omp] ${label}: ${JSON.stringify(out)}`);
                return out;
            };
            facts.seriesHis = await heading('n2-series-history', `${app.contextPath}/en/catalog/series/his`);
            facts.seriesPsy = await heading('n3-series-psychology', `${app.contextPath}/en/catalog/series/psy`);
            await raw('n4-book-14', `${app.contextPath}/en/catalog/book/14`);
            facts.book14Series = (await page.locator('.item.series .value, .series .value').first().innerText().catch(() => null));
            console.log(`[omp] grid ${JSON.stringify(facts.gridAfter)}; book 14 series ${JSON.stringify(facts.book14Series)}`);
        }
    } finally {
        record(mode === 'walk' ? 'facts' : 'facts-neighbour', facts);
        await close();
    }
});
