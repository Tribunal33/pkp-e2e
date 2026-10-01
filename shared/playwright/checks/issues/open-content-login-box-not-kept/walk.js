// Issue report docs/issues/U54-OPS1-open-content-login-box-not-kept.md (U54
// OPS1): a preprint server's "Users must be registered and log in to view
// open access content." says "Saved", is unticked on the next load, and
// signed-out visitors still open every posted preprint's PDF. On PKP's
// default test dataset (a dataset fleet, reset first):
//   1. sign in as `dbarnes`
//   2. Settings › Users & Roles › "Site Access Options": read the box
//   3. tick it, "Save" (the save's request and answer read off the browser's
//      own traffic)
//   4. reload, "Site Access Options" again: is the box ticked
//   5. sign out, open preprint 2 (OJS: article 1)
//   6. press "PDF": where the visitor lands, and the file's download answer
// Neighbour (the fix must not reach further), OPS only:
//   7. `ckwantes` (Author, Reader) presses preprint 2's "PDF": it opens
//   8. `dbarnes` unticks the box, "Save"; signed out, "PDF" opens again
// OJS takes steps 1–6 as the control; OMP steps 1–4 (the dataset has no
// free file to download).
// Run: PROBE_FEATURE=issues-w52 PROBE_AGENT=w52 node bin/probe.js all shared/playwright/checks/issues/open-content-login-box-not-kept/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=issues-w52-3_5 PROBE_RUN=r35 in front for 3.5;
//       PROBE_RUN=fixin while a fix is applied)
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const FIELD = {ojs: 'restrictArticleAccess', omp: 'restrictMonographAccess', ops: 'restrictPreprintAccess'};
const ITEM = {ojs: '/article/view/1', ops: '/preprint/view/2'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const field = FIELD[app.name];
    const ctx = app.contextPath;
    const u = (p) => app.url(`/index.php/${ctx}/en${p}`);
    const rel = (s) => s.replace(/^https?:\/\/[^/]+/, '');
    const {table, id, settings} = app.contextTables;
    const stored = () => sql(app, `select coalesce(max(s.setting_value), '<no row>') from ${settings} s join ${table} c on c.${id}=s.${id} where c.path='${ctx}' and s.setting_name='${field}'`);
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const box = (page) => page.locator(`input[name="${field}"]`).first();
    const readBox = async (page) => ({
        checked: await box(page).isChecked(),
        label: flat(await box(page).evaluate((e) => (e.closest('label') || e.parentElement).innerText), 120),
        legend: flat(await box(page).evaluate((e) => { const f = e.closest('fieldset'); const l = f && f.querySelector('legend'); return l ? l.innerText : null; }), 80),
    });
    const openTab = async (page) => {
        await page.goto('about:blank');
        await page.goto(u('/management/settings/access'));
        await idle(page);
        await page.locator('[id="access-button"]').first().click();
        await idle(page);
        await box(page).waitFor({state: 'attached', timeout: 20_000});
        await sleep(400);
    };
    const save = async (page, tick, name) => {
        if (tick) await box(page).check({force: true}); else await box(page).uncheck({force: true});
        const traffic = [];
        const onResp = async (r) => {
            if (!/\/api\/v1\/contexts\/\d+/.test(r.url()) || r.request().method() === 'GET') return;
            let body = null;
            try { body = await r.json(); } catch { body = null; }
            let sent = null;
            try { sent = JSON.parse(r.request().postData() || '{}'); } catch { sent = flat(r.request().postData(), 200); }
            traffic.push({method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null, url: rel(r.url()), status: r.status(), sent,
                answered: body && typeof body === 'object' ? (Object.prototype.hasOwnProperty.call(body, field) ? body[field] : '<absent>') : null});
        };
        page.on('response', onResp);
        const form = page.locator('form').filter({has: box(page)}).first();
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
    // Press the item page's "PDF" galley link and report where it leads and
    // what the file's download answered.
    const pressPdf = async (page, name) => {
        const downloads = [];
        const onResp = (r) => {
            if (/\/(preprint|article)\/download\//.test(r.url())) {
                downloads.push({url: rel(r.url()), status: r.status(), type: r.headers()['content-type'] || null, disposition: r.headers()['content-disposition'] || null});
            }
        };
        page.context().on('response', onResp);
        const link = page.locator('a.obj_galley_link').filter({hasText: /PDF/}).first();
        const linkText = flat(await link.innerText().catch(() => null), 60);
        const href = await link.getAttribute('href').catch(() => null);
        if (!href) {
            page.context().off('response', onResp);
            return {linkFound: false};
        }
        await Promise.all([page.waitForLoadState('load').catch(() => {}), link.click()]);
        await idle(page);
        await sleep(2500);
        page.context().off('response', onResp);
        const s = await screen(page);
        record(name, s);
        return {linkText, href: rel(href), landed: rel(page.url()), title: await page.title(),
            h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120),
            loginForm: await page.locator('form#login, form.cmp_form.login, input[name="username"]').count(), downloads};
    };
    const land = async (page, path, name) => {
        const resp = await page.goto(u(path));
        await idle(page);
        const s = await screen(page);
        record(name, s);
        return {status: resp ? resp.status() : null, url: rel(page.url()), title: await page.title()};
    };

    const {page, close} = await launch(app);
    try {
        fact('stored before', stored());
        // 1–2
        await signIn(page, 'dbarnes');
        await openTab(page);
        record('2-site-access', await screen(page));
        fact('2 box on landing', await readBox(page));
        // 3
        fact('3 tick and save', await save(page, true, '3-tick'));
        fact('3 stored after save', stored());
        // 4
        await page.reload();
        await openTab(page);
        record('4-site-access-reloaded', await screen(page));
        fact('4 box after reload', await readBox(page));
        if (!ITEM[app.name]) return;
        // 5–6
        await signOut(page);
        fact('5 item signed out', await land(page, ITEM[app.name], '5-item-signed-out'));
        fact('6 PDF signed out', await pressPdf(page, '6-pdf-signed-out'));
        if (app.name !== 'ops') return;
        // 7
        await signIn(page, 'ckwantes');
        fact('7 item reader', await land(page, ITEM.ops, '7-item-reader'));
        fact('7 PDF reader', await pressPdf(page, '7-pdf-reader'));
        // 8
        await signIn(page, 'dbarnes');
        await openTab(page);
        fact('8 untick and save', await save(page, false, '8-untick'));
        fact('8 stored after untick', stored());
        await signOut(page);
        fact('8 item signed out', await land(page, ITEM.ops, '8-item-signed-out'));
        fact('8 PDF signed out', await pressPdf(page, '8-pdf-signed-out'));
    } finally {
        record('facts', facts);
        await close();
    }
});
