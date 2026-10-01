// Issue report walk: docs/issues/U57-A8-omp-ops-french-texts-internal-names.md
// (spec U57 register A8; U07 OPS3, U61 A7, U19 A13). Takes the report's
// Steps through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"): its `admin` and its context
// `publicknowledge`, which already has English and French (Canada) under
// "UI" and "Forms". The steps create nothing; the kit builds nothing.
// OJS takes the same steps as the control. Step numbers are the report's:
//   1  signed out: {context}/fr_CA/about/submissions
//   2  signed out: {context}/fr_CA/about/privacy
//   3  signed out: {context}/fr_CA/oai ListRecords oai_dc (dc:type values)
//   4  admin: /index.php/index/fr_CA/admin ("Gestion du site")
//   5  admin: {context} Settings › Website › Setup › Languages, French row
//      › "Reload defaults" › OK
//   6  signed out: steps 1 and 2 again
//   n  neighbour (what a fix must leave alone): the English twins of steps
//      1–4 (/en/about/submissions, /en/about/privacy, /en/oai dc:type,
//      /index/en/admin)
// Every page records screen() and rawKeys() (the ##key## names on it).
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w24 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w24 PROBE_AGENT=w24 node bin/probe.js all shared/playwright/checks/issues/omp-ops-french-texts-internal-names/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w24-3_5 PROBE_AGENT=w24 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w24/facts[-<run>]-<app>.json (record 'facts')
const {forEachApp, launch, signIn, signOut, screen, record, idle, rawKeys} = require('../../../probe');

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const pk = app.contextPath;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null});
    let n = 0;
    const rec = async (page, label) => {
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        let s;
        try { s = await screen(page); record(name, s); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
        return s;
    };
    // A public page: its heading, the internal names on it, and a text excerpt.
    const readPage = async (page, label, rel, {anchor} = {}) => {
        const resp = await page.goto(app.url(rel));
        await idle(page);
        const s = await rec(page, label);
        const keys = (await rawKeys(page)) || [];
        const text = (s && s.text && s.text.main) || '';
        let excerpt = text.replace(/\s+/g, ' ').trim();
        if (anchor && excerpt.includes(anchor)) excerpt = excerpt.slice(excerpt.indexOf(anchor));
        return {address: rel, status: resp && resp.status(), title: await page.title(), rawKeys: keys, excerpt: excerpt.slice(0, 500)};
    };
    // OAI: the browser opens the address; the raw answer is read beside it for dc:type.
    const readOai = async (page, label, loc) => {
        const rel = `/index.php/${pk}/${loc}/oai?verb=ListRecords&metadataPrefix=oai_dc`;
        await page.goto(app.url(rel));
        await pause(200);
        const s = await rec(page, label);
        // The browser shows the record through the OAI stylesheet; the raw XML is read beside it.
        const res = await page.request.get(app.url(rel));
        const body = await res.text();
        const shown = ((s && s.text && s.text.main) || '').match(/Resource Type\s+(\S+)/g) || [];
        record(`${String(n).padStart(2, '0')}-${label}-raw`, {address: rel, body: body.slice(0, 6000)});
        const types = [...new Set([...body.matchAll(/<dc:type[^>]*>([^<]*)<\/dc:type>/g)].map((m) => m[0]))];
        return {address: rel, status: res.status(), shownResourceType: [...new Set(shown)], dcTypes: types, rawKeys: [...new Set(body.match(/##[^#\s]+##/g) || [])]};
    };

    const {page, close} = await launch(app);
    try {
        // Steps 1–3, signed out.
        fact('step 1 fr about/submissions', await readPage(page, 's1-fr-submissions', `/index.php/${pk}/fr_CA/about/submissions`));
        fact('step 2 fr about/privacy', await readPage(page, 's2-fr-privacy', `/index.php/${pk}/fr_CA/about/privacy`));
        fact('step 3 fr oai dc:type', await readOai(page, 's3-fr-oai', 'fr_CA'));

        // Step 4: admin, Administration in French.
        await signIn(page, 'admin');
        fact('step 4 fr admin', await readPage(page, 's4-fr-admin', '/index.php/index/fr_CA/admin', {anchor: 'Gestion du site'}));

        // Step 5: Reload defaults on the French row of the context's Languages.
        await page.goto(app.url(`/index.php/${pk}/en/management/settings/website`));
        await idle(page);
        const setup = page.locator('#setup-button').first();
        if ((await setup.getAttribute('aria-selected').catch(() => null)) !== 'true') await setup.click();
        await page.locator('#languages-button').filter({visible: true}).first().click();
        const grid = page.locator('#languageGridContainer');
        await grid.locator('.pkp_controllers_grid').first().waitFor({timeout: 20000});
        await idle(page);
        const row = grid.locator('tr.gridRow[id$="-row-fr_CA"]').first();
        await row.locator('a.show_extras').first().click();
        const reload = grid.locator('tr[id$="-row-fr_CA-control-row"] a').filter({hasText: 'Reload defaults'}).first();
        await reload.waitFor({timeout: 10000});
        await rec(page, 's5-fr-row-open');
        await reload.click();
        const dialog = page.locator('[role=dialog]:visible').last();
        await dialog.waitFor({timeout: 10000});
        const question = (await dialog.innerText()).replace(/\s+/g, ' ').trim().slice(0, 300);
        await rec(page, 's5-reload-question');
        const wr = page.waitForResponse((r) => /reload-?locale/i.test(r.url()), {timeout: 30000}).catch(() => null);
        await dialog.getByRole('button', {name: /^(OK|Reload defaults|Yes)$/}).first().click();
        const r = await wr;
        await idle(page);
        const done = await rec(page, 's5-reloaded');
        fact('step 5 reload defaults (fr_CA)', {question, status: r && r.status(), notices: (done && done.notices) || null});
        await signOut(page);

        // Step 6: steps 1 and 2 again.
        fact('step 6a fr about/submissions after reload', await readPage(page, 's6-fr-submissions', `/index.php/${pk}/fr_CA/about/submissions`));
        fact('step 6b fr about/privacy after reload', await readPage(page, 's6-fr-privacy', `/index.php/${pk}/fr_CA/about/privacy`));

        // Neighbour: the English twins, which a fix must leave as they are.
        fact('n1 en about/submissions', await readPage(page, 'n1-en-submissions', `/index.php/${pk}/en/about/submissions`));
        fact('n2 en about/privacy', await readPage(page, 'n2-en-privacy', `/index.php/${pk}/en/about/privacy`));
        fact('n3 en oai dc:type', await readOai(page, 'n3-en-oai', 'en'));
        await signIn(page, 'admin');
        fact('n4 en admin', await readPage(page, 'n4-en-admin', '/index.php/index/en/admin', {anchor: 'Site Management'}));
        await signOut(page);
    } finally {
        await close();
    }
    record('facts', facts);
});
