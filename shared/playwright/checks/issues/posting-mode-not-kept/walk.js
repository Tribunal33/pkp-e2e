// Issue report docs/issues/U51-OPS1-posting-mode-not-kept.md (U51 OPS1, U08
// OPS2, U15 OPS2): a preprint server's "Posting Mode" says "Saved" and keeps
// nothing. On PKP's default test dataset (a dataset fleet, reset first):
//   1. sign in as `dbarnes` (Preprint Server manager)
//   2. Settings › Distribution › "Access": read the "Posting Mode" choices
//   3. choose "OPS will not be used to post the server's contents online.",
//      "Save" (the save's request and answer are read off the browser's own
//      traffic)
//   4. reload, "Access" again: which choice is marked
//   5. sign out, open the home page: the header's items, the archive search box
//   6. press "Archives"
//   7. open preprint 2
//   8. sign in as `ckwantes` (Author, Reader), press "Search"
// Neighbour (the fix must not reach further):
//   9. as `dbarnes`, the preprints list and the Search page still open
//  10. choose "The server will provide open access to its contents.", "Save",
//      reload: kept; signed out, "Archives" is in the header
// OJS runs steps 1–5 and 10 as the control (its journal's "Publishing Mode").
// OMP has no "Access" tab: skipped.
// Run: PROBE_FEATURE=issues-w8 PROBE_AGENT=w8 node bin/probe.js all shared/playwright/checks/issues/posting-mode-not-kept/walk.js
//      (PROBE_RUN=fixin / r35 to keep other runs apart)
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const LABEL = {
    ops: {none: /OPS will not be used to post/, open: /server will provide open access/},
    ojs: {none: /OJS will not be used to publish/, open: /journal will provide open access/},
};

forEachApp(async (app) => {
    if (!LABEL[app.name]) return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const isOps = app.name === 'ops';
    const ctx = app.contextPath;
    const loc = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en';
    const u = (p) => app.url(`/index.php/${ctx}${loc}${p}`);
    const {table, id, settings} = app.contextTables;
    const stored = () => sql(app, `select coalesce(max(s.setting_value), '<no row>') from ${settings} s join ${table} c on c.${id}=s.${id} where c.path='${ctx}' and s.setting_name='publishingMode'`);
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const radios = (page) => page.locator('input[name="publishingMode"]').evaluateAll((els) =>
        els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.trim()})));
    const openAccess = async (page) => {
        await page.goto('about:blank');
        await page.goto(u('/management/settings/distribution'));
        await idle(page);
        await page.locator('[id="access-button"]').first().click();
        await idle(page);
        await page.locator('input[name="publishingMode"]').first().waitFor({state: 'attached', timeout: 20_000});
        await sleep(400);
    };
    const choose = async (page, re, name) => {
        const rs = await radios(page);
        const i = rs.findIndex((r) => re.test(r.label));
        if (i < 0) throw new Error(`no choice ${re}`);
        await page.locator('input[name="publishingMode"]').nth(i).check({force: true});
        const traffic = [];
        const onResp = async (r) => {
            if (!/\/api\/v1\/contexts\/\d+/.test(r.url()) || r.request().method() === 'GET') return;
            let body = null;
            try { body = await r.json(); } catch { body = null; }
            let sent = null;
            try { sent = JSON.parse(r.request().postData() || '{}').publishingMode; } catch { sent = flat(r.request().postData(), 120); }
            traffic.push({method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null, status: r.status(), sentPublishingMode: sent,
                answeredPublishingMode: body && typeof body === 'object' ? (Object.prototype.hasOwnProperty.call(body, 'publishingMode') ? body.publishingMode : '<absent>') : null});
        };
        page.on('response', onResp);
        const form = page.locator('form').filter({has: page.locator('input[name="publishingMode"]')}).first();
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const seen = new Set();
        const t0 = Date.now();
        while (Date.now() - t0 < 8000) {
            for (const t of (await page.locator('[role="status"]').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean)) seen.add(t);
            if (seen.has('Saved') && traffic.length) break;
            await sleep(250);
        }
        await sleep(500);
        page.off('response', onResp);
        record(`${name}-saved`, await screen(page));
        return {statuses: [...seen], traffic};
    };
    const header = async (page) => {
        const nav = page.locator('#navigationPrimary, .pkp_navigation_primary').first();
        const items = (await nav.count()) ? (await nav.locator(':scope > li > a').allInnerTexts()).map((t) => t.trim()) : null;
        return {items, archiveSearchBox: await page.locator('form.pkp_search[aria-label="Preprint Search"], .archive_header form, form[role="search"]').count()};
    };
    const land = async (page, url, name) => {
        const resp = await page.goto(url);
        await idle(page);
        const s = await screen(page);
        record(name, s);
        return {status: resp ? resp.status() : null, url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title(), h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120), text: flat(s.text.main || s.text.body || '', 200)};
    };

    const {page, close} = await launch(app);
    try {
        fact('stored before', stored());
        // 1–2
        await signIn(page, 'dbarnes');
        await openAccess(page);
        record('2-access', await screen(page));
        fact('2 choices on landing', await radios(page));
        // 3
        fact('3 save none', await choose(page, LABEL[app.name].none, '3-none'));
        fact('3 stored after save', stored());
        // 4
        await page.reload();
        await openAccess(page);
        record('4-access-reloaded', await screen(page));
        fact('4 choices after reload', await radios(page));
        // 5
        await signOut(page);
        const home = await land(page, u(''), '5-home-signed-out');
        fact('5 home signed out', {...home, header: await header(page)});
        if (isOps) {
            // 6
            const arch = page.locator('#navigationPrimary a, .pkp_navigation_primary a').filter({hasText: /^\s*Archives\s*$/}).first();
            if (await arch.count()) {
                await arch.click();
                await idle(page);
                const s = await screen(page);
                record('6-archives-signed-out', s);
                fact('6 archives signed out', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120), text: flat(s.text.main || s.text.body, 200)});
            } else {
                fact('6 archives signed out', {pressed: false, direct: await land(page, u('/preprints'), '6-preprints-direct')});
            }
            // 7
            fact('7 preprint 2 signed out', await land(page, u('/preprint/view/2'), '7-preprint-2-signed-out'));
            // 8
            await signIn(page, 'ckwantes');
            await land(page, u(''), '8-home-reader');
            const search = page.locator('a').filter({hasText: /^\s*Search\s*$/}).first();
            if (await search.count()) {
                await search.click();
                await idle(page);
                const s = await screen(page);
                record('8-search-reader', s);
                fact('8 search as reader', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120), text: flat(s.text.main || s.text.body, 300)});
            } else {
                fact('8 search as reader', {linkFound: false, direct: await land(page, u('/search/search'), '8-search-reader-direct')});
            }
            fact('8 reader preprints', await land(page, u('/preprints'), '8-preprints-reader'));
            // 9
            await signIn(page, 'dbarnes');
            fact('9 manager preprints', await land(page, u('/preprints'), '9-preprints-manager'));
            fact('9 manager search', await land(page, u('/search/search'), '9-search-manager'));
            fact('9 manager preprint 2', await land(page, u('/preprint/view/2'), '9-preprint-2-manager'));
        }
        // 10
        await signIn(page, 'dbarnes');
        await openAccess(page);
        fact('10 save open', await choose(page, LABEL[app.name].open, '10-open'));
        fact('10 stored after save', stored());
        await page.reload();
        await openAccess(page);
        fact('10 choices after reload', await radios(page));
        await signOut(page);
        const home2 = await land(page, u(''), '10-home-signed-out');
        fact('10 home signed out', {status: home2.status, header: await header(page)});
    } finally {
        record('facts', facts);
        await close();
    }
});
