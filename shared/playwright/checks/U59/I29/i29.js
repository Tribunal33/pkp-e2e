// U59 housekeeping chunk I29: the incidentals rows filed against Hosted
// journals (and one against U08), driven on the three apps.
//
//   Row 1 / Row 31  Rule 11 bullet 2 (td8): a signed-out visitor at the
//                   pages of a context NOT enabled publicly lands on its
//                   Login page; does the Login address carry `source`, and
//                   where does signing in there lead? Control (other end):
//                   a context enabled publicly but closed by "Users must be
//                   registered and log in to view the … site."
//                   (restrictSiteAccess). Home, item, file, About, OJS
//                   issue, OMP version and chapter addresses.
//   Row 2           Rule 14 / Side effects "Removing a journal": "Remove" on
//                   a context holding an institution (and a control without
//                   one), as the Site Administrator, all three apps.
//   Row 3           U08 Rule 26: a context page typed at the site level
//                   (`index/…/management/settings/institutions`,
//                   `…/settings/context`), as admin, a signed-in reader and
//                   signed out; the other end under a context's own address.
//
// Phases (PHASES=seed,login,remove,site; default all). RUN names the run:
// each run seeds its own scratch contexts (tag prefix u59i29) and writes
// its facts to facts-<RUN>-<app>.json and snapshots <RUN>-*.
//
// Run: RUN=r1 PROBE_FEATURE=U59 PROBE_AGENT=ccI29 node bin/probe.js all shared/playwright/checks/U59/I29/i29.js
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signOut, screen, shot, record, loc, note, idle, tag, outDir, users} = require('../../../probe');
const {dbName} = require('../../../../../bin/apps.js');

const RUN = process.env.RUN || 'r1';
const PHASES = (process.env.PHASES || 'seed,login,remove,site').split(',');
const on = (p) => PHASES.includes(p);
const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const norm = (u) => String(u || '').split('?')[0].replace(/\/en(?=\/|$)/, '').replace(/\/index$/, '');
const sql = (app, q) => {
    try {
        return execFileSync('psql', ['-X', '-d', dbName(app.name), '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
    } catch (e) {
        return `SQL ERROR ${String(e.stderr).trim().slice(0, 200)}`;
    }
};
const CTX = {ojs: ['journals', 'journal_id'], omp: ['presses', 'press_id'], ops: ['servers', 'server_id']};
// A server error's own text is never kept (security-verify.md "The private file").
const INTERNALS = /SQLSTATE|Stack trace|\.php(:| on line )\d+/;
function scrub(v) {
    if (Array.isArray(v)) return v.map(scrub);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)]));
    if (typeof v === 'string' && INTERNALS.test(v)) return '(server error text; not kept)';
    return v;
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const stateFile = path.join(outDir(), `state-${RUN}-${app.name}.json`);
    let S = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
    const save = () => fs.writeFileSync(stateFile, JSON.stringify(S, null, 2));
    const fact = (k, v) => {
        v = scrub(v);
        record(`facts-${RUN}`, {[k]: v}, {merge: true});
        console.log(`[fact ${app.name}] ${k}: ${flat(JSON.stringify(v), 700)}`);
    };
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            fact(`ERR ${name}`, String((e && e.message) || e).split('\n').slice(0, 3).join(' | '));
            return null;
        }
    };
    const snap = async (page, name) => {
        const s = await screen(page).catch((e) => ({screenError: String(e.message || e), text: {}}));
        const n = `${RUN}-${name}`;
        if (INTERNALS.test(JSON.stringify(s))) {
            record(n, {url: s.url, title: s.title, withheld: 'server error text; not kept'});
        } else {
            record(n, s);
            await shot(page, n).catch(() => {});
        }
        return {...scrub(s), name: n};
    };
    const cu = (p, rest = '') => app.url(`/index.php/${p}${rest}`);

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.t) {
        const t = tag('u59i29');
        S.t = t;
        const issue = {volume: 1, number: 1, year: 2026};
        const mk = async (k, {context = {}, extra = {}, item = false} = {}) => {
            const p = `${t}${k}`;
            const us = [{username: `${p}mg`, roles: ['manager']}, {username: `${p}rd`, roles: ['reader']}, {username: `${p}au`, roles: ['author']}];
            const spec = {tag: p, context: {name: `I29 ${k.toUpperCase()} ${t}`, ...context}, users: us, ...extra};
            if (isOJS && item) spec.issues = [{...issue, published: true}];
            const r = await app.api.createContext(spec);
            S[k] = {path: p, id: r.contextId || r.id, name: spec.context.name, institutions: r.institutions || null};
            if (item) {
                const sp = {tag: `${p}s`, context: p, submitter: `${p}au`, title: `I29 ${k.toUpperCase()} item`, published: true};
                if (isOJS) { sp.issue = issue; sp.galleys = [{label: 'PDF', file: 'article.pdf'}]; }
                if (isOPS) sp.galleys = [{label: 'PDF', file: 'preprint.pdf'}];
                if (isOMP) {
                    sp.publicationFormats = [{name: 'PDF', file: 'article.pdf'}];
                    sp.chapters = [{title: 'Chapter One', page: true, authors: [`${p}au`]}];
                }
                const s = await app.api.createSubmission(sp);
                S[k].item = {id: s.submissionId, pub: s.publicationId};
            }
            save();
        };
        await step('seed', async () => {
            await mk('n', {context: {enabled: false}, item: true});        // not enabled publicly
            await mk('r', {extra: {restrictSiteAccess: true}, item: true}); // enabled, closed to visitors
            await mk('h', {extra: {institutions: [{name: 'I29 Probe Library', ipRanges: ['10.9.9.0/24']}]}});
            await mk('z');                                                  // no institution
            fact('seed', S);
            fact('seed db', sql(app, `select path, enabled from ${CTX[app.name][0]} where path like '${t}%' order by 1`));
            fact('seed institutions', sql(app, `select context_id, count(*) from institutions where context_id in (${S.h.id},${S.z.id}) group by 1`));
            note(`ccI29 [${app.name}] ${RUN}: scratch contexts ${t}n (enabled: false), ${t}r (restrictSiteAccess), ${t}h (one institution), ${t}z (none); each with {path}mg manager, {path}rd reader, {path}au author`);
        });
    }
    // RM_SUFFIX=x: fresh institution / no-institution contexts for another "Remove" pass of the same run
    if (on('seed') && S.t && process.env.RM_SUFFIX && !(S.h && S.h.path.endsWith(`h${process.env.RM_SUFFIX}`))) {
        await step('reseed remove', async () => {
            for (const [k, extra] of [['h', {institutions: [{name: 'I29 Probe Library', ipRanges: ['10.9.9.0/24']}]}], ['z', {}]]) {
                const p = `${S.t}${k}${process.env.RM_SUFFIX}`;
                const r = await app.api.createContext({tag: p, context: {name: `I29 ${k.toUpperCase()}${process.env.RM_SUFFIX} ${S.t}`}, users: [{username: `${p}mg`, roles: ['manager']}], ...extra});
                S[k] = {path: p, id: r.contextId || r.id, name: `I29 ${k.toUpperCase()}${process.env.RM_SUFFIX} ${S.t}`, institutions: r.institutions || null};
            }
            save();
            fact(`reseed remove ${process.env.RM_SUFFIX}`, {h: S.h, z: S.z});
        });
    }
    if (!S.t) { console.log(`[i29] ${app.name}: no state for ${RUN}; run the seed phase`); return; }
    const t = S.t;

    const {page, close} = await launch(app);
    const jsDialogs = [];
    page.on('dialog', async (d) => { jsDialogs.push({type: d.type(), message: flat(d.message(), 200)}); await d.dismiss().catch(() => {}); });
    const chainOf = async (url) => {
        const chain = [];
        const onResp = (r) => {
            try {
                if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${rel(r.url())}`);
            } catch { /* detached */ }
        };
        page.on('response', onResp);
        const resp = await page.goto(url).catch((e) => ({err: String(e.message).split('\n')[0]}));
        await idle(page).catch(() => {});
        page.off('response', onResp);
        return {resp, chain};
    };
    const loginInfo = async () => page.evaluate(() => {
        const f = document.querySelector('form#login');
        const src = document.querySelector('form#login input[name="source"]');
        const h1 = document.querySelector('h1');
        const links = [...document.querySelectorAll('form#login a, .page_login a')].map((a) => ({text: (a.innerText || '').trim(), href: a.getAttribute('href')}));
        return {form: !!f, action: f ? f.getAttribute('action') : null, sourceInput: src ? src.value : null, h1: h1 ? h1.innerText.trim() : null, links};
    }).catch(() => null);
    const visit = async (url, name) => {
        const {resp, chain} = await chainOf(url);
        const s = await snap(page, name);
        const u = new URL(page.url());
        return {asked: rel(url), status: resp && resp.status ? resp.status() : resp, landed: rel(page.url()), source: u.searchParams.get('source'), chain, title: s.title, snap: s.name, login: await loginInfo()};
    };
    const signInAs = async (username, ctxPath) => {
        await signOut(page).catch(() => {});
        await page.goto(cu(ctxPath || 'index', '/en/login'));
        await page.locator('input#username').fill(username);
        await page.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
        await page.locator('input#password').fill(users.getPassword(username));
        await page.locator('form#login button[type="submit"]').click();
        await page.waitForURL((u) => !u.pathname.includes('/login'), {timeout: T, waitUntil: 'commit'}).catch(() => {});
        await idle(page).catch(() => {});
    };
    // sign in on the Login page the visitor landed on (the form as it is)
    const signInHere = async (username) => {
        await page.locator('input#username').fill(username);
        await page.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
        await page.locator('input#password').fill(users.getPassword(username));
        const nav = [];
        const onResp = (r) => { try { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) nav.push(`${r.status()} ${rel(r.url())}`); } catch { /* none */ } };
        page.on('response', onResp);
        await page.locator('form#login button[type="submit"]').click();
        await page.waitForURL((u) => !u.pathname.includes('/login'), {timeout: T, waitUntil: 'commit'}).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(500);
        page.off('response', onResp);
        return {landed: rel(page.url()), nav};
    };

    try {
        // -------------------------------------------------------------- login (Rows 1, 31)
        if (on('login')) {
            for (const k of ['n', 'r']) {
                const C = S[k];
                const addrs = {};
                // what a signed-in role reads from the pages: the item's links
                await step(`${k} addresses`, async () => {
                    await signInAs(`${C.path}mg`, C.path);
                    addrs.home = cu(C.path, '/en');
                    addrs.about = cu(C.path, '/en/about');
                    const itemPath = isOJS ? `/en/article/view/${C.item.id}` : isOMP ? `/en/catalog/book/${C.item.id}` : `/en/preprint/view/${C.item.id}`;
                    addrs.item = cu(C.path, itemPath);
                    await page.goto(addrs.item);
                    await idle(page);
                    const s = await snap(page, `${k}-mg-item`);
                    const links = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.href));
                    const file = links.find((h) => /\/(article|preprint)\/view\/\d+\/\d+|\/catalog\/view\/\d+\//.test(h));
                    if (file) addrs.file = file;
                    const dl = links.find((h) => /\/(article|preprint)\/download\/\d+\/\d+|\/catalog\/download\//.test(h));
                    if (dl) addrs.download = dl;
                    if (isOJS) {
                        const iss = links.find((h) => /\/issue\/view\/\d+/.test(h));
                        if (iss) addrs.issue = iss;
                    }
                    if (isOMP) {
                        addrs.version = cu(C.path, `/en/catalog/book/${C.item.id}/version/${C.item.pub}`);
                        const ch = links.find((h) => /\/chapter\/\d+/.test(h));
                        if (ch) addrs.chapter = ch;
                    }
                    fact(`${k} addresses`, {snap: s.name, title: s.title, addrs: Object.fromEntries(Object.entries(addrs).map(([a, u]) => [a, rel(u)]))});
                });
                // signed out: every address
                await step(`${k} visitor`, async () => {
                    await signOut(page).catch(() => {});
                    const out = {};
                    for (const [a, u] of Object.entries(addrs)) out[a] = await visit(u, `${k}-out-${a}`);
                    fact(`${k} visitor`, out);
                });
                // sign in on the Login page reached from the item (manager) and from About (reader)
                for (const [a, who] of [['item', 'mg'], ['about', 'rd'], ...(addrs.file ? [['file', 'rd']] : [])]) {
                    await step(`${k} sign-in from ${a}`, async () => {
                        await signOut(page).catch(() => {});
                        const v = await visit(addrs[a], `${k}-out-${a}-before-signin`);
                        if (!v.login || !v.login.form) { fact(`${k} sign-in from ${a}`, {skipped: 'no login form', v}); return; }
                        const r = await signInHere(`${C.path}${who}`);
                        const s = await snap(page, `${k}-signin-from-${a}-${who}`);
                        fact(`${k} sign-in from ${a}`, {asked: rel(addrs[a]), loginAddress: v.landed, source: v.source, sourceInput: v.login.sourceInput, as: `${C.path}${who}`, landed: r.landed, nav: r.nav, back: norm(r.landed) === norm(rel(addrs[a])), title: s.title, snap: s.name});
                    });
                }
                // sweep: the Login page's own links, and "Register" pressed, signed out
                await step(`${k} login sweep`, async () => {
                    await signOut(page).catch(() => {});
                    const v = await visit(addrs.about, `${k}-out-login-sweep`);
                    await loc(page, 'Login page reached signed out: form#login', page.locator('form#login'));
                    await loc(page, 'Login page: hidden input[name=source]', page.locator('form#login input[name="source"]'));
                    const reg = page.getByRole('link', {name: /^Register/}).first();
                    let pressed = null;
                    if (await reg.count()) {
                        const href = await reg.getAttribute('href');
                        await reg.click();
                        await page.waitForLoadState('domcontentloaded').catch(() => {});
                        await idle(page).catch(() => {});
                        const s = await snap(page, `${k}-out-register-pressed`);
                        pressed = {href: rel(href), landed: rel(page.url()), title: s.title, snap: s.name, h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120), form: await page.locator('form#register, form.register').count()};
                    }
                    // the page's other links pressed: "Home" (the breadcrumb) and "Forgot your password?"
                    const more = {};
                    for (const [nm, lk] of [['home', page.locator('.cmp_breadcrumbs a, nav.cmp_breadcrumbs a').filter({hasText: 'Home'}).first()], ['lost', page.getByRole('link', {name: 'Forgot your password?'})]]) {
                        await visit(addrs.about, `${k}-out-login-sweep-${nm}-before`);
                        if (!(await lk.count())) { more[nm] = 'absent'; continue; }
                        const href = rel(await lk.getAttribute('href'));
                        await lk.click();
                        await page.waitForLoadState('domcontentloaded').catch(() => {});
                        await idle(page).catch(() => {});
                        const s = await snap(page, `${k}-out-${nm}-pressed`);
                        more[nm] = {href, landed: rel(page.url()), title: s.title, snap: s.name, h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120)};
                    }
                    fact(`${k} login sweep`, {loginAddress: v.landed, title: v.title, links: v.login && v.login.links, register: pressed, ...more});
                });
            }
            // publicknowledge, read-only: its About signed out opens (the enabled end, no gate)
            await step('pk about visitor', async () => {
                await signOut(page).catch(() => {});
                const v = await visit(cu(app.contextPath, '/en/about'), 'pk-out-about');
                fact('pk about visitor', {landed: v.landed, status: v.status, title: v.title});
            });
        }

        // -------------------------------------------------------------- remove (Row 2)
        if (on('remove')) {
            const [tbl, idc] = CTX[app.name];
            await step('remove signin', async () => signInAs('admin'));
            const hosted = async () => {
                await page.goto(cu('index', '/en/admin/contexts'));
                await idle(page);
                await page.locator('tr.gridRow').first().waitFor({timeout: T});
            };
            const rowOf = (name) => page.locator('tr.gridRow').filter({hasText: name}).first();
            for (const k of ['h', 'z']) {
                await step(`${k} remove`, async () => {
                    const C = S[k];
                    if (C.removed) { console.log(`[i29] ${k} already removed in ${RUN}`); return; }
                    await hosted();
                    const before = await snap(page, `${k}-hosted-before`);
                    const r = rowOf(C.name);
                    await r.waitFor({timeout: T});
                    await r.locator('a.show_extras').click();
                    await sleep(400);
                    const ctl = r.locator('xpath=following-sibling::tr[1]');
                    const links = (await ctl.getByRole('link').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean);
                    await ctl.getByRole('link', {name: 'Remove', exact: true}).click();
                    const conf = page.locator('[role="dialog"]:visible').last();
                    await conf.waitFor({timeout: T});
                    await sleep(400);
                    const c = await snap(page, `${k}-confirm`);
                    await loc(page, 'Hosted list: "Remove" confirm window', conf);
                    const calls = [];
                    const onResp = async (x) => {
                        if (x.request().method() !== 'GET') {
                            let body = null;
                            if (x.status() >= 500) body = '(body not kept)';
                            else body = flat(await x.text().catch(() => null), 300);
                            calls.push({status: x.status(), method: x.request().method(), url: rel(x.url()).replace(/^.*\$\$\$call\$\$\$/, ''), body});
                        }
                    };
                    page.on('response', onResp);
                    const t0 = Date.now();
                    await conf.getByRole('button', {name: 'OK', exact: true}).click();
                    await sleep(4000);
                    await idle(page).catch(() => {});
                    page.off('response', onResp);
                    const after = await snap(page, `${k}-after-ok`);
                    const windowOpen = await page.locator('[role="dialog"]:visible').count();
                    const rowSame = await rowOf(C.name).count();
                    // sweep: the window still open? press its "Cancel"
                    let cancel = null;
                    if (windowOpen) {
                        const cb = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: 'Cancel', exact: true});
                        if (await cb.count()) {
                            await cb.click().catch(() => {});
                            await sleep(800);
                            const s = await snap(page, `${k}-after-ok-cancel`);
                            cancel = {windowsLeft: await page.locator('[role="dialog"]:visible').count(), rowSame: await rowOf(C.name).count(), snap: s.name, notices: s.notices};
                        }
                    }
                    await hosted();
                    const s2 = await snap(page, `${k}-hosted-reloaded`);
                    const rowReload = await rowOf(C.name).count();
                    const res = {rowLinks: links, confirmText: c.text && c.text.dialog, beforeSnap: before.name, calls, ms: Date.now() - t0,
                        afterSnap: after.name, afterNotices: after.notices, afterDialogText: after.text && after.text.dialog, windowOpenAfterOk: windowOpen, rowSamePage: rowSame, cancel,
                        rowAfterReload: rowReload, reloadSnap: s2.name, jsDialogs: jsDialogs.slice(),
                        db: {context: sql(app, `select count(*) from ${tbl} where ${idc}=${C.id}`), institutions: sql(app, `select count(*) from institutions where context_id=${C.id}`),
                            userGroups: sql(app, `select count(*) from user_groups where context_id=${C.id}`)}};
                    if (!rowReload) { C.removed = true; save(); }
                    // what the context answers now, as the Site Administrator and signed out
                    const pages = {};
                    for (const [a, p] of [['settings', '/en/management/settings/context'], ['institutions', '/en/management/settings/institutions'], ['access', '/en/management/settings/access'], ['home', '/en']]) {
                        const v = await visit(cu(C.path, p), `${k}-after-remove-admin-${a}`);
                        pages[a] = {status: v.status, landed: v.landed, title: v.title, h1: flat(await page.locator('main h1, h1').first().innerText().catch(() => null), 120),
                            denied: /does not have access to this operation/.test(await page.locator('body').innerText().catch(() => '')), snap: v.snap};
                    }
                    res.adminPages = pages;
                    if (rowReload) {
                        // sweep: the row's other actions after the failed removal, then "Remove" a second time
                        await step(`${k} after-failure row`, async () => {
                            await hosted();
                            const row = rowOf(C.name);
                            await row.locator('a.show_extras').click();
                            await sleep(400);
                            const ctl2 = row.locator('xpath=following-sibling::tr[1]');
                            await ctl2.getByRole('link', {name: 'Settings wizard', exact: true}).click();
                            await page.waitForLoadState('domcontentloaded').catch(() => {});
                            await idle(page).catch(() => {});
                            const w = await snap(page, `${k}-after-failure-wizard`);
                            res.wizardAfterFailure = {landed: rel(page.url()), title: w.title, h1: flat(await page.locator('main h1, h1').first().innerText().catch(() => null), 120), nameValue: await page.locator('[id^="context-name-control"]').first().inputValue().catch(() => null)};
                            await hosted();
                            const row2 = rowOf(C.name);
                            await row2.locator('a.show_extras').click();
                            await sleep(400);
                            await row2.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Remove', exact: true}).click();
                            const conf2 = page.locator('[role="dialog"]:visible').last();
                            await conf2.waitFor({timeout: T});
                            const calls2 = [];
                            const on2 = (x) => { if (x.request().method() !== 'GET') calls2.push({status: x.status(), url: rel(x.url()).replace(/^.*\$\$\$call\$\$\$/, '')}); };
                            page.on('response', on2);
                            await conf2.getByRole('button', {name: 'OK', exact: true}).click();
                            await sleep(4000);
                            await idle(page).catch(() => {});
                            page.off('response', on2);
                            const a2 = await snap(page, `${k}-second-remove-after-ok`);
                            const open2 = await page.locator('[role="dialog"]:visible').count();
                            if (open2) await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
                            await hosted();
                            res.secondRemove = {calls: calls2, windowOpen: open2, snap: a2.name, rowAfterReload: await rowOf(C.name).count(),
                                db: {context: sql(app, `select count(*) from ${tbl} where ${idc}=${C.id}`), institutions: sql(app, `select count(*) from institutions where context_id=${C.id}`)}};
                        });
                    }
                    fact(`${k} remove`, res);
                });
            }
            await step('remove visitor', async () => {
                await signOut(page).catch(() => {});
                const out = {};
                for (const k of ['h', 'z']) {
                    const v = await visit(cu(S[k].path, '/en'), `${k}-after-remove-visitor-home`);
                    out[k] = {status: v.status, landed: v.landed, title: v.title};
                }
                fact('remove visitor', out);
            });
        }

        // -------------------------------------------------------------- site (Row 3)
        if (on('site')) {
            const addr = [['institutions', '/management/settings/institutions'], ['context', '/management/settings/context'], ['website', '/management/settings/website']];
            const readDenied = async () => page.evaluate(() => {
                const t = (s) => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; };
                return {h1: t('h1'), crumbs: t('.cmp_breadcrumbs, nav.cmp_breadcrumbs'), main: t('.page_message, .page, main') || null, body: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 400), header: !!document.querySelector('header, .pkp_structure_head'), links: [...document.querySelectorAll('.page a, main a, .page_message a')].map((a) => a.innerText.trim()).filter(Boolean).slice(0, 10)};
            }).catch((e) => ({err: String(e.message)}));
            for (const who of ['admin', 'reader.rosa', null]) {
                await step(`site ${who || 'visitor'}`, async () => {
                    if (who) await signInAs(who); else await signOut(page).catch(() => {});
                    const out = {};
                    for (const [a, p] of addr) {
                        for (const lc of ['', '/en']) {
                            const v = await visit(cu('index', `${lc}${p}`), `site-${who || 'visitor'}-${a}${lc ? '-en' : ''}`);
                            out[`${a}${lc}`] = {status: v.status, landed: v.landed, chain: v.chain, title: v.title, read: await readDenied(), snap: v.snap};
                        }
                    }
                    // the other end: the same address under a context's own path (a scratch one of this run)
                    const own = S.r ? S.r.path : app.contextPath;
                    for (const [a, p] of addr.slice(0, 2)) {
                        const v = await visit(cu(own, `/en${p}`), `site-${who || 'visitor'}-own-${a}`);
                        out[`own ${a}`] = {status: v.status, landed: v.landed, title: v.title, h1: flat(await page.locator('main h1, h1').first().innerText().catch(() => null), 120), snap: v.snap};
                    }
                    if (!who) {
                        // signed out: sign in on the site Login page the context page sent us to
                        const v = await visit(cu('index', '/en/management/settings/institutions'), 'site-visitor-institutions-before-signin');
                        if (v.login && v.login.form) {
                            const r = await signInHere('admin');
                            const s = await snap(page, 'site-visitor-signin-admin');
                            out['signin admin'] = {loginAddress: v.landed, sourceInput: v.login.sourceInput, landed: r.landed, nav: r.nav, title: s.title, read: await readDenied(), snap: s.name};
                        }
                    }
                    fact(`site ${who || 'visitor'}`, out);
                });
            }
        }
    } finally {
        fact('jsDialogs', jsDialogs);
        await close();
    }
});
