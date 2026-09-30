// Issue report docs/issues/1-omp-ops-institution-delete-fails.md (U66 A3, A8):
// the report's Steps to reproduce, walked through the screens as `admin`.
//
// The kit builds only two scratch contexts per app, tagged u66ir1: "Test
// Press <tag>" and "Empty Press <tag>" (journal / server on OJS / OPS),
// each with the site administrator enrolled as its manager, as creating one
// on Administration › Hosted Presses does. Everything else goes through
// the screens:
//   1. the context's Institutions page by its address
//   2. "Add Institution", Name "Campus Library", "Save"
//   3. row "Campus Library" › "Delete" › "Yes"
//   4. "OK" on the window that opens, reload
//   5. Administration › Hosted … › "Test Press" › "Remove" › "OK"
//   6. reload Hosted …
//   7. the Institutions page again, and Settings › Users & Roles › Roles
//   8. control: "Remove" › "OK" on "Empty Press"
// OJS is the control app (a journal): the same steps succeed there.
//
// Run (main):  PROBE_FEATURE=issues PROBE_AGENT=ir1 node bin/probe.js all shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues PROBE_AGENT=ir1 node bin/probe.js all shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js
// Facts: .reports/issues/ir1/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, tag, sql} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const NOUN = {ojs: ['Journal', 'Hosted Journals'], omp: ['Press', 'Hosted Presses'], ops: ['Server', 'Hosted Servers']};

// A server error's own text (a raw database or PHP message) is never kept
// in a file here; only whether one was shown.
const INTERNALS = /SQLSTATE|Stack trace|\.php(:| on line )\d+|relation "|does not exist/;
function scrub(v) {
    if (Array.isArray(v)) return v.map(scrub);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)]));
    if (typeof v === 'string' && INTERNALS.test(v)) return '(server error text; not kept)';
    return v;
}
async function snap(page, name) {
    const s = await screen(page);
    if (INTERNALS.test(JSON.stringify(s))) {
        record(name, {url: s.url, title: s.title, withheld: 'the screen showed a server error text; not kept'});
        return {...scrub(s), name, serverText: true};
    }
    record(name, s);
    await shot(page, name).catch(() => {});
    return {...s, name, serverText: false};
}
function watch(page) {
    const seen = [];
    const on = (r) => {
        const m = r.request().method();
        if (m === 'GET' && r.status() < 400) return;
        if (/\.(js|css|png|svg|woff2?)(\?|$)/.test(r.url())) return;
        seen.push({method: m, override: r.request().headers()['x-http-method-override'] || null, url: rel(r.url()).replace(/\?.*$/, ''), status: r.status()});
    };
    page.on('response', on);
    return {seen, stop: () => page.off('response', on)};
}
const rows = (page) => page.locator('main .listPanel__item');
const rowTexts = async (page) => (await rows(page).allInnerTexts().catch(() => [])).map((x) => flat(x, 120));
const visibleDialogs = (page) => page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')]
    .filter((e) => e.offsetWidth || e.offsetHeight || e.getClientRects().length)
    .map((d) => d.innerText.replace(/\s+/g, ' ').trim().slice(0, 300))).catch(() => []);

forEachApp(async (app) => {
    const [noun, hostedNoun] = NOUN[app.name];
    const t = tag('u66ir1');
    const A = `${t}a`;
    const Z = `${t}z`;
    const nameA = `Test ${noun} ${t}`;
    const nameZ = `Empty ${noun} ${t}`;
    const {table, id} = app.contextTables;
    const facts = {app: app.name, tag: t, contexts: {}};
    const fact = (k, v) => {
        facts[k] = scrub(v);
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(facts[k]), 900)}`);
    };
    for (const [k, path, name] of [['A', A, nameA], ['Z', Z, nameZ]]) {
        const r = await app.api.createContext({tag: path, context: {name}});
        facts.contexts[k] = {path, name, id: r.contextId};
    }
    const instUrl = app.url(`/index.php/${A}/en/management/settings/institutions`);
    const hostedUrl = app.url('/index.php/index/en/admin/contexts');
    const dbState = (cid) => ({
        contextRow: sql(app, `select count(*) from ${table} where ${id}=${cid}`),
        institutions: sql(app, `select count(*) from institutions where context_id=${cid}`),
        userGroups: sql(app, `select count(*) from user_groups where context_id=${cid}`),
    });

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');

        // 1
        await page.goto(instUrl);
        await idle(page);
        const s1 = await snap(page, 's1-institutions');
        fact('1 institutions page', {snap: s1.name, h1: flat(await page.locator('main h1').first().innerText().catch(() => null), 80), rows: await rowTexts(page)});

        // 2
        await page.getByRole('button', {name: 'Add Institution'}).click();
        const add = page.getByRole('dialog').filter({hasText: 'Add Institution'});
        await add.getByRole('button', {name: 'Save'}).waitFor({timeout: T});
        await idle(page);
        await add.getByLabel('Name', {exact: false}).first().fill('Campus Library');
        let w = watch(page);
        await add.getByRole('button', {name: 'Save'}).click();
        await add.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await sleep(800);
        await idle(page);
        w.stop();
        const s2 = await snap(page, 's2-added');
        fact('2 add', {snap: s2.name, requests: w.seen, rows: await rowTexts(page)});

        // 3
        await rows(page).filter({hasText: 'Campus Library'}).first().getByRole('button', {name: 'Delete'}).click();
        const confirm = page.getByRole('dialog').filter({hasText: /Are you sure/});
        await confirm.waitFor({timeout: T});
        await sleep(300);
        const confirmText = flat(await confirm.innerText().catch(() => null), 300);
        w = watch(page);
        await confirm.getByRole('button', {name: 'Yes', exact: true}).click();
        await sleep(1500);
        await idle(page);
        w.stop();
        const s3 = await snap(page, 's3-after-yes');
        const dlg3 = await visibleDialogs(page);
        fact('3 delete yes', {snap: s3.name, confirmText, requests: w.seen, dialogs: dlg3, serverTextShown: s3.serverText || INTERNALS.test(dlg3.join(' ')), rows: await rowTexts(page)});

        // 4
        const ok = page.getByRole('dialog').getByRole('button', {name: 'OK', exact: true});
        const okShown = await ok.count();
        if (okShown) await ok.first().click();
        await sleep(500);
        const dlg4 = await visibleDialogs(page);
        await page.reload();
        await idle(page);
        const s4 = await snap(page, 's4-reloaded');
        fact('4 ok and reload', {okShown, dialogsAfterOk: dlg4, snap: s4.name, rows: await rowTexts(page), db: dbState(facts.contexts.A.id)});

        // 5, 6, 8
        const rowOf = (name) => page.locator('tr.gridRow').filter({hasText: name}).first();
        const remove = async (k, name) => {
            await page.goto(hostedUrl);
            await idle(page);
            const r = rowOf(name);
            await r.waitFor({timeout: T});
            const before = await snap(page, `s5-${k}-hosted-before`);
            const ex = r.locator('a.show_extras');
            if (await ex.count()) { await ex.click(); await sleep(400); }
            await r.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Remove', exact: true}).click();
            const conf = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last();
            await conf.waitFor({timeout: T});
            await sleep(300);
            const confText = flat(await conf.innerText().catch(() => null), 300);
            const ww = watch(page);
            await conf.getByRole('button', {name: 'OK', exact: true}).click();
            await sleep(4000);
            await idle(page);
            ww.stop();
            const after = await snap(page, `s5-${k}-after-ok`);
            const res = {hostedTitle: flat(await page.locator('h1').first().innerText().catch(() => null), 80), beforeSnap: before.name, confirmText: confText, requests: ww.seen,
                afterSnap: after.name, dialogsAfter: await visibleDialogs(page), notices: after.notices, rowSamePage: await rowOf(name).count()};
            await page.goto(hostedUrl);
            await idle(page);
            const re = await snap(page, `s6-${k}-hosted-reloaded`);
            res.reloadSnap = re.name;
            res.rowAfterReload = await rowOf(name).count();
            res.db = dbState(facts.contexts[k].id);
            return res;
        };
        fact('5-6 remove Test', await remove('A', nameA));

        // 7
        await page.goto(instUrl);
        await idle(page);
        const s7 = await snap(page, 's7-institutions-after');
        const t7 = `${s7.text.main || ''} ${s7.text.dialog || ''}`;
        await page.goto(app.url(`/index.php/${A}/en/management/settings/access`));
        await idle(page);
        await page.locator('#roles-button').first().click({timeout: 5000}).catch(() => {});
        await idle(page);
        await sleep(800);
        const s7b = await snap(page, 's7-access-after');
        const t7b = `${s7b.text.main || ''} ${s7b.text.dialog || ''}`;
        await page.goto(app.url(`/index.php/${A}`));
        await idle(page);
        const s7c = await snap(page, 's7-home-after');
        fact('7 after failed removal', {
            institutions: {snap: s7.name, denied: (t7.match(/[^.]*does not have access to this operation\./) || [null])[0]},
            access: {snap: s7b.name, denied: (t7b.match(/[^.]*does not have access to this operation\./) || [null])[0], text: flat(s7b.text.main, 300)},
            home: {snap: s7c.name, url: rel(page.url()), title: s7c.title},
        });

        // 8
        fact('8 remove Empty (control)', await remove('Z', nameZ));
    } finally {
        record('facts', facts);
        await close();
    }
});
