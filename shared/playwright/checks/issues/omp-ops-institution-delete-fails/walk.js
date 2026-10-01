// Issue report docs/issues/U66-A3-A8-omp-ops-institution-delete-fails.md (U66 A3, A8; U59 A10):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), as
// the dataset's `admin`, on its own context `publicknowledge`.
//
// The kit builds nothing. Everything goes through the screens:
//   precondition: Administration › Hosted … › "Create Press" (Journal /
//      Server): "Empty Press <tag>", Country Canada, path <tag>, English
//      (the control; "Country" is refused empty, U59 A1)
//   1. publicknowledge's Institutions page by its address
//   2. "Add Institution", Name "Campus Library", "Save"
//   3. row "Campus Library" › "Delete" › "Yes"
//   4. "OK" on the window that opens, reload
//   5. Administration › Hosted … › the dataset's context › "Remove" › "OK"
//   6. reload Hosted …
//   6a. (U59 A10) "Remove" › "OK" on the same row again; "Cancel" on the
//      window when it stays open; reload
//   7. the Institutions page again, Settings › Users & Roles, the home page,
//      and (U59 A10) the row's "Settings wizard"
//   8. control: "Remove" › "OK" on "Empty Press <tag>"
// Besides the screens it reads the database (the context row, its
// institutions, user groups and genres, and OMP's publication format
// tombstones) and the context's OAI-PMH ListIdentifiers, before step 5 and
// after step 7, as a harvester would request it.
// OJS is the control app (a journal): the same steps succeed there.
//
// Reset first:  npm run fleet-prep -- --feature issues-rv1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-rv1 PROBE_AGENT=rv1 node bin/probe.js all shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-rv1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-rv1-3_5 PROBE_AGENT=rv1 node bin/probe.js all shared/playwright/checks/issues/omp-ops-institution-delete-fails/walk.js
// Facts: .reports/<feature>/rv1/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, tag, sql} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const LABELS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

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
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const L = LABELS[app.name];
    const ctx = app.contextPath; // publicknowledge
    const t = tag('u66');
    const nameZ = `Empty ${L.noun} ${t}`;
    const {table, id} = app.contextTables;
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, tag: t, contexts: {}};
    const fact = (k, v) => {
        facts[k] = scrub(v);
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(facts[k]), 900)}`);
    };
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const ctxId = (path) => sql(app, `select ${id} from ${table} where path='${path}'`);
    facts.contexts.A = {path: ctx, id: ctxId(ctx)};
    const instUrl = app.url(`/index.php/${ctx}/en/management/settings/institutions`);
    const hostedUrl = app.url('/index.php/index/en/admin/contexts');
    const dbState = (cid) => ({
        contextRow: sql(app, `select count(*) from ${table} where ${id}=${cid}`),
        institutions: sql(app, `select count(*) from institutions where context_id=${cid}`),
        userGroups: sql(app, `select count(*) from user_groups where context_id=${cid}`),
        genres: sql(app, `select count(*) from genres where context_id=${cid}`),
        submissions: sql(app, `select count(*) from submissions where context_id=${cid}`),
        tombstones: sql(app, 'select count(*) from data_object_tombstones'),
    });
    // The raw OAI-PMH answer (the browser's own request context, as a harvester reads it;
    // page.goto would hand back the page the XSL stylesheet draws).
    const oai = async (page, name) => {
        const r = await page.request.get(app.url(`/index.php/${ctx}/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`));
        const body = (await r.text()).replace(/\s+/g, ' ');
        const heads = [...body.matchAll(/<header( status="deleted")?>\s*<identifier>([^<]*)<\/identifier>/g)].map((m) => `${m[1] ? 'deleted ' : ''}${m[2]}`);
        const res = {status: r.status(), headers: heads, error: (body.match(/<error[^>]*>[^<]*/) || [null])[0]};
        record(name, res);
        return res;
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        const hosted = new HostedJournalsPage(page, L);

        // Precondition: the control context, created on screen.
        await page.goto(hostedUrl);
        await hosted.expectOpen();
        const win = await hosted.openCreate();
        await win.type(win.title('en'), nameZ);
        await win.type(win.initials('en'), 'EP');
        await win.type(win.contactName, nameZ);
        await win.type(win.contactEmail, `${t}@mailinator.com`);
        await win.country.selectOption({label: 'Canada'});
        await win.type(win.path, t);
        if (await win.languageBox('en').count()) {
            await win.setBox(win.languageBox('en'), true);
            await win.setBox(win.primaryChoice('en'), true);
        }
        const created = await win.pressSave();
        await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
        facts.contexts.Z = {path: t, name: nameZ, id: ctxId(t)};
        fact('0 create control', {status: created.status(), url: rel(page.url()), id: facts.contexts.Z.id});

        // 1
        await page.goto(instUrl);
        await idle(page);
        const s1 = await snap(page, 's1-institutions');
        fact('1 institutions page', {snap: s1.name, h1: flat(await page.locator('main h1').first().innerText().catch(() => null), 80), rows: await rowTexts(page), db: dbState(facts.contexts.A.id)});

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

        fact('oai before removal', await oai(page, 'oai-before'));

        // 5, 6, 8
        const remove = async (k, shotKey = k) => {
            const path = facts.contexts[k].path;
            await page.goto(hostedUrl);
            await hosted.expectOpen();
            const name = await hosted.rowName(path);
            const before = await snap(page, `s5-${shotKey}-hosted-before`);
            const controls = await hosted.rowControls(path);
            await controls.getByRole('link', {name: 'Remove', exact: true}).click();
            const conf = page.getByRole('dialog', {name: 'Confirm', exact: true});
            await conf.waitFor({timeout: T});
            await sleep(300);
            const confText = flat(await conf.innerText().catch(() => null), 300);
            const ww = watch(page);
            await conf.getByRole('button', {name: 'OK', exact: true}).click();
            await page.waitForResponse((r) => /delete-context/.test(r.url()), {timeout: 120_000}).catch(() => {});
            await sleep(2000);
            await idle(page);
            ww.stop();
            const after = await snap(page, `s5-${shotKey}-after-ok`);
            const res = {rowName: name, beforeSnap: before.name, confirmText: confText, requests: ww.seen,
                afterSnap: after.name, dialogsAfter: await visibleDialogs(page), notices: after.notices, rowSamePage: await hosted.row(path).count()};
            // The window still open: its "Cancel", as a person would close it.
            const confOpen = await conf.isVisible().catch(() => false);
            res.confirmStillOpen = confOpen;
            if (confOpen) {
                await conf.getByRole('button', {name: 'Cancel', exact: true}).click();
                await conf.waitFor({state: 'hidden', timeout: T}).catch(() => {});
                res.cancelClosed = !(await conf.isVisible().catch(() => false));
                res.rowAfterCancel = await hosted.row(path).count();
            }
            await page.goto(hostedUrl);
            await idle(page);
            const re = await snap(page, `s6-${shotKey}-hosted-reloaded`);
            res.reloadSnap = re.name;
            res.rowAfterReload = await hosted.row(path).count();
            res.db = dbState(facts.contexts[k].id);
            return res;
        };
        fact('5-6 remove dataset context', await remove('A'));
        // 6a (U59 A10): the same "Remove" once more.
        fact('6a remove dataset context again', await remove('A', 'A2'));

        // 7
        await page.goto(instUrl);
        await idle(page);
        const s7 = await snap(page, 's7-institutions-after');
        const t7 = `${s7.text.main || ''} ${s7.text.dialog || ''}`;
        await page.goto(app.url(`/index.php/${ctx}/en/management/settings/access`));
        await idle(page);
        await sleep(800);
        const s7b = await snap(page, 's7-access-after');
        const t7b = `${s7b.text.main || ''} ${s7b.text.dialog || ''}`;
        await page.goto(app.url(`/index.php/${ctx}`));
        await idle(page);
        const s7c = await snap(page, 's7-home-after');
        // (U59 A10) the row's "Settings wizard"
        await page.goto(hostedUrl);
        await hosted.expectOpen();
        let wizard = {rowPresent: await hosted.row(ctx).count()};
        if (wizard.rowPresent) {
            const controls = await hosted.rowControls(ctx);
            await controls.getByRole('link', {name: 'Settings wizard', exact: true}).click();
            await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T, waitUntil: 'commit'}).catch(() => {});
            await idle(page);
            await sleep(800);
            const s7d = await snap(page, 's7-wizard-after');
            wizard = {...wizard, snap: s7d.name, url: rel(page.url()), title: s7d.title,
                h1: flat(await page.locator('main h1').first().innerText().catch(() => null), 120),
                tabs: (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 40)),
                text: flat(`${s7d.text.main || ''} ${s7d.text.dialog || ''}`, 300)};
        }
        const denied = (s) => (s.match(/[^.]*does not have access to this operation\./) || [null])[0];
        fact('7 after removal', {
            institutions: {snap: s7.name, url: rel(s7.url), denied: denied(t7)},
            access: {snap: s7b.name, url: rel(s7b.url), denied: denied(t7b), text: flat(s7b.text.main, 300)},
            home: {snap: s7c.name, url: rel(s7c.url), title: s7c.title, text: flat(s7c.text.main, 300)},
            wizard,
        });
        fact('oai after removal', await oai(page, 'oai-after'));

        // 8
        fact('8 remove control', await remove('Z'));
    } finally {
        record('facts', facts);
        await close();
    }
});
