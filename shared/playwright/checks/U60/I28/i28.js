// U60 housekeeping claim check I28 — incidental row L155 (2026-09-28): Administration › "Site Settings" ›
// "Site Setup" › "Settings" › "Journal redirect" ("Press redirect", "Server redirect"): which journals it
// offers, what each option reads (name or path, in which language) and in what order, against creation
// order, name order and the Hosted Journals order (before and after "Order" is used there), and a journal
// not enabled publicly before and after "Enable" in its Hosted Journals "Edit" window.
// Spec: docs/specs/U60-site-settings.md — Fields "Journal redirect" (line 52), footnote e.
//
// Run twice, each run seeding its own journals (RUN names the facts file and the tag):
//   RUN=1 PROBE_FEATURE=U60 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U60/I28/i28.js
//   RUN=2 PROBE_FEATURE=U60 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U60/I28/i28.js
//   PHASES=seed,before,french,sweep,order,enable (default: all). Facts: .reports/U60/ccI28/i28-facts-run<RUN>-<app>.json
//
// Every journal this script creates carries its tag (prefix u60i28); no seeded journal is edited and no
// site setting is saved. The one site-wide change is the Hosted Journals order (this run's own rows are
// dragged, and dragged back at the end).
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {dbName} = require('../../../../../bin/apps.js');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const RUN = process.env.RUN || '1';
const ALL = ['seed', 'before', 'french', 'sweep', 'order', 'enable'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u == null ? '' : u).replace(/^\s*https?:\/\/[^/]+/, '');
const log = (...a) => console.log('[i28]', new Date().toISOString().slice(11, 19), ...a);
const T = 60_000;
const TABLE = {ojs: ['journals', 'journal_id'], omp: ['presses', 'press_id'], ops: ['servers', 'server_id']};
const sql = (app, q) => { try { return execFileSync('psql', ['-d', dbName(app.name), '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); } catch (e) { return `sql error: ${String(e.stderr || e.message).slice(0, 160)}`; } };

forEachApp(async (app) => {
    const [tbl, idCol] = TABLE[app.name];
    const stateFile = path.join(outDir(), `i28-state-run${RUN}-${app.name}.json`);
    const S = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
    const save = () => fs.writeFileSync(stateFile, JSON.stringify(S, null, 2));
    const fact = (k, v) => { record(`i28-facts-run${RUN}`, {[k]: v}, {merge: true}); log(app.name, k, JSON.stringify(v).slice(0, 600)); };

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.t) {
        const t = tag('u60i28');
        S.t = t;
        // creation order Hidden, Zulu, Alpha, Mike; name order Alpha, Hidden, Mike, Zulu; path order Mike(a), Zulu(m), Hidden(q), Alpha(z)
        const mk = async (key, pathSuffix, name, extra = {}) => {
            const p = `${t}${pathSuffix}`;
            const r = await app.api.createContext({tag: p, context: {name, acronym: `I28${key}`, country: 'CA', contactName: `I28 Contact ${key}`, contactEmail: `${p}c@mail.test`, ...extra}});
            S[key] = {key, path: p, id: String(r.contextId || r.id), name: typeof name === 'string' ? name : name.en, names: name};
            save();
        };
        await mk('H', 'q', `Hotel ${t}`, {enabled: false});
        await mk('Z', 'm', `Zulu ${t}`);
        await mk('A', 'z', `Alpha & Omega ${t}`);
        await mk('M', 'a', {en: `Mike ${t}`, fr_CA: `Bravo ${t}`}, {supportedLocales: ['en', 'fr_CA']});
        fact('seed', S);
    }
    if (!S.t) { log('no state; run the seed phase'); return; }
    const t = S.t;
    const ours = ['Z', 'A', 'M', 'H'];

    const {page, close} = await launch(app);
    const CRASH = [];
    const DIALOGS = [];
    page.on('dialog', (d) => { DIALOGS.push({type: d.type(), message: flat(d.message(), 200), url: rel(page.url())}); (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {}); });
    page.on('response', (r) => { if (r.status() >= 500) CRASH.push(`server ${r.status()} ${r.request().method()} ${rel(r.url()).slice(0, 160)} @ ${rel(page.url())}`); });
    page.on('pageerror', (e) => CRASH.push(`script ${flat(e.message || e, 200)} @ ${rel(page.url())}`));
    const snap = async (name, extra = {}) => { const s = await screen(page).catch((e) => ({error: String(e.message || e)})); record(`r${RUN}-${name}`, {...extra, screen: s}); await shot(page, `r${RUN}-${name}`).catch(() => {}); return s; };
    const go = async (url) => { const r = await page.goto(url, {timeout: T}).catch((e) => ({error: String(e.message)})); await idle(page).catch(() => {}); return r && typeof r.status === 'function' ? r.status() : r; };

    // Site Settings › Site Setup › <sub>
    const openSite = async (sub, locale = 'en') => {
        await go(app.url(`/index.php/index/${locale}/admin/settings`));
        await page.locator('#setup-button').first().click().catch(() => {});
        await page.locator(`#${sub}-button`).first().click();
        const panel = page.locator(`[role="tabpanel"]#${sub}`).first();
        await panel.getByRole('button', {name: /^(Save|Enregistrer)$/}).first().waitFor({timeout: T});
        await idle(page).catch(() => {}); await sleep(300);
        return panel;
    };
    const SEL = '#siteConfig-redirectContextId-control';
    const readOptions = (panel) => panel.locator(`${SEL} option`).evaluateAll((os) => os.map((o) => ({v: o.value, t: o.textContent.trim(), sel: o.selected})));
    const hosted = async () => { await go(app.url('/index.php/index/en/admin/contexts')); await page.locator('tr.gridRow').first().waitFor({timeout: T}); await sleep(300); };
    const readRows = () => page.evaluate(() => [...document.querySelectorAll('tr.gridRow')].map((r) => {
        const tds = r.querySelectorAll('td');
        return {id: r.id.replace(/.*-row-/, ''), name: (tds[0] ? tds[0].innerText : '').replace(/\s+/g, ' ').replace(/^Settings /, '').trim(), path: (tds[1] ? tds[1].innerText : '').trim()};
    }));
    const row = (name) => page.locator('tr.gridRow').filter({hasText: name}).first();
    const dbPhysical = () => sql(app, `select ${idCol} from ${tbl} where enabled = 1`).split('\n').filter(Boolean);

    // compare the option list with every candidate order
    const analyse = (opts, grid) => {
        const list = opts.filter((o) => o.v !== '');
        const ids = list.map((o) => o.v);
        const set = new Set(ids);
        const gridIds = grid.map((r) => r.id).filter((id) => set.has(id));
        const idAsc = [...ids].sort((a, b) => Number(a) - Number(b));
        const byName = [...list].sort((a, b) => a.t.localeCompare(b.t)).map((o) => o.v);
        const phys = dbPhysical();
        const firstDiff = (x, y) => { for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return {i, list: x[i], other: y[i]}; return null; };
        const gridById = Object.fromEntries(grid.map((r) => [r.id, r]));
        const mine = {};
        for (const k of ours) {
            const i = ids.indexOf(S[k].id);
            mine[k] = {pos: i, text: i >= 0 ? list[i].t : null, gridPos: grid.findIndex((r) => r.id === S[k].id), gridName: (gridById[S[k].id] || {}).name || null, path: S[k].path};
        }
        const mineOrder = ours.filter((k) => mine[k].pos >= 0).sort((a, b) => mine[a].pos - mine[b].pos).map((k) => S[k].name.split(' ')[0]);
        const mineGridOrder = ours.filter((k) => mine[k].pos >= 0).sort((a, b) => mine[a].gridPos - mine[b].gridPos).map((k) => S[k].name.split(' ')[0]);
        const labelNotName = list.filter((o) => gridById[o.v] && gridById[o.v].name !== o.t).slice(0, 8).map((o) => ({v: o.v, option: o.t, grid: gridById[o.v].name}));
        const labelIsPath = list.filter((o) => gridById[o.v] && gridById[o.v].path === o.t).length;
        return {
            n: list.length, gridRows: grid.length, blankFirst: opts[0] && opts[0].v === '' && opts[0].t === '',
            first5: list.slice(0, 5).map((o) => `${o.v}:${o.t}`), last5: list.slice(-5).map((o) => `${o.v}:${o.t}`),
            equalsGrid: JSON.stringify(ids) === JSON.stringify(gridIds), diffGrid: firstDiff(ids, gridIds),
            equalsIdAsc: JSON.stringify(ids) === JSON.stringify(idAsc), diffIdAsc: firstDiff(ids, idAsc),
            equalsName: JSON.stringify(ids) === JSON.stringify(byName), diffName: firstDiff(ids, byName),
            equalsDbPhysical: JSON.stringify(ids) === JSON.stringify(phys), diffDbPhysical: firstDiff(ids, phys), dbEnabled: phys.length,
            mine, mineOrder, mineGridOrder, labelNotNameCount: list.filter((o) => gridById[o.v] && gridById[o.v].name !== o.t).length, labelNotName, labelIsPath,
            hiddenOffered: ids.includes(S.H.id), hiddenInGrid: grid.some((r) => r.id === S.H.id),
        };
    };
    const readAll = async (label) => {
        await hosted();
        const grid = await readRows();
        await snap(`${label}-hosted`, {rows: grid.length});
        const panel = await openSite('settings');
        const opts = await readOptions(panel);
        await snap(`${label}-settings`, {options: opts.length});
        const bulkPanel = await openSite('bulkEmails');
        const boxLabels = await bulkPanel.locator('input[name="enableBulkEmails"]').evaluateAll((els) => els.map((e) => ({v: e.value, label: e.labels && e.labels[0] ? e.labels[0].innerText.trim() : null})));
        const boxes = boxLabels.map((b) => b.v);
        const set = new Set(grid.map((r) => r.id));
        const mineBulk = Object.fromEntries(ours.map((k) => [k, (boxLabels.find((b) => b.v === S[k].id) || {}).label || null]));
        return {grid, opts, a: {...analyse(opts, grid), mineBulk}, bulkEqualsGrid: JSON.stringify(boxes) === JSON.stringify(grid.map((r) => r.id).filter((id) => boxes.includes(id))), bulkN: boxes.length, bulkAllInGrid: boxes.every((b) => set.has(b))};
    };

    try {
        await signIn(page, 'admin'); await idle(page).catch(() => {});

        // ------------------------------------------------------------------ before: the list as seeded
        if (on('before')) {
            const r = await readAll('b01');
            const panel = await openSite('settings');
            await loc(page, 'Site Setup › Settings: "Journal redirect" select', panel.locator(SEL));
            await loc(page, 'Site Setup › Settings: "Journal redirect" label', panel.locator(`label[for="${SEL.slice(1)}"]`));
            const labelText = flat(await panel.locator(`label[for="${SEL.slice(1)}"]`).innerText().catch(() => ''), 80);
            fact('before', {label: labelText, ...r.a, bulkEqualsGrid: r.bulkEqualsGrid, bulkN: r.bulkN});
        }

        // ------------------------------------------------------------------ french: the options' text in French
        if (on('french')) {
            const panel = await openSite('settings', 'fr_CA');
            const opts = await readOptions(panel);
            await snap('f01-settings-fr_CA', {options: opts.length});
            const label = flat(await panel.locator(`label[for="${SEL.slice(1)}"]`).innerText().catch(() => ''), 80);
            const find = (k) => (opts.find((o) => o.v === S[k].id) || {}).t || null;
            fact('french', {label, n: opts.length - 1, Z: find('Z'), A: find('A'), M: find('M'), H: find('H'), pk: (opts.find((o) => o.v === '1') || {}).t || null});
        }

        // ------------------------------------------------------------------ sweep: the Settings tab, a change left unsaved
        if (on('sweep')) {
            const W = {};
            let panel = await openSite('settings');
            W.form = await panel.evaluate((p) => {
                const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
                return {
                    fields: [...p.querySelectorAll('.pkpFormField')].filter((f) => f.offsetParent).map((f) => ({label: txt(f.querySelector('.pkpFormFieldLabel, legend, label')), description: txt(f.querySelector('.pkpFormField__description')), control: f.querySelector('select') ? 'select' : f.querySelector('input[type=checkbox]') ? 'checkbox' : f.querySelector('input') ? 'input' : '?'})),
                    buttons: [...p.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => txt(b)),
                };
            });
            W.tabs = await page.evaluate(() => [...document.querySelectorAll('[role="tab"]')].filter((t) => t.offsetParent).map((t) => ({id: t.id, text: t.innerText.replace(/\s+/g, ' ').trim(), selected: t.getAttribute('aria-selected')})));
            // pick Alpha, leave unsaved; press another side tab and come back
            await panel.locator(SEL).selectOption({value: S.A.id});
            W.picked = await panel.locator(SEL).inputValue();
            await snap('s01-settings-alpha-picked-unsaved');
            const d0 = DIALOGS.length;
            await page.locator('#info-button').first().click().catch((e) => { W.infoErr = String(e.message).slice(0, 120); });
            await sleep(800);
            await snap('s02-info-tab-after-unsaved');
            W.dialogsOnSideTab = DIALOGS.slice(d0);
            await page.locator('#settings-button').first().click();
            await sleep(500);
            W.backOnSettings = await panel.locator(SEL).inputValue();
            // press "Appearance" (another top tab) and back
            const d1 = DIALOGS.length;
            await page.locator('#appearance-button').first().click().catch((e) => { W.appearanceErr = String(e.message).slice(0, 120); });
            await sleep(800);
            W.dialogsOnTopTab = DIALOGS.slice(d1);
            await page.locator('#setup-button').first().click(); await page.locator('#settings-button').first().click(); await sleep(500);
            W.backFromAppearance = await panel.locator(SEL).inputValue();
            // leave the page
            const d2 = DIALOGS.length;
            await go(app.url('/index.php/index/en/admin'));
            W.dialogsOnLeave = DIALOGS.slice(d2);
            W.leftTo = rel(page.url());
            await snap('s03-admin-after-leave');
            panel = await openSite('settings');
            W.onReturn = await panel.locator(SEL).inputValue();
            W.siteRedirect = sql(app, 'select redirect_context_id from site');
            await snap('s04-settings-return');
            fact('sweep', W);
        }

        // ------------------------------------------------------------------ order: Hosted Journals "Order", then the list again
        if (on('order')) {
            const O = {};
            await hosted();
            const drag = async (srcName, dstName) => {
                const orderBtn = page.getByRole('link', {name: 'Order', exact: true}).first();
                await orderBtn.click(); await sleep(700);
                const src = row(srcName), dst = row(dstName);
                await src.scrollIntoViewIfNeeded();
                const sb = await src.boundingBox(), db = await dst.boundingBox();
                await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
                await page.mouse.down();
                await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2 - 4, {steps: 3});
                await page.mouse.move(db.x + db.width / 2, db.y + 3, {steps: 20});
                await sleep(300); await page.mouse.up(); await sleep(600);
                const done = page.getByRole('button', {name: 'Done', exact: true}).or(page.getByRole('link', {name: 'Done', exact: true})).first();
                const seqResp = page.waitForResponse((r) => /saveSequence|save-sequence/.test(r.url()), {timeout: T}).catch(() => null);
                await done.click();
                const sr = await seqResp;
                await sleep(1000); await idle(page).catch(() => {});
                return {moved: srcName, above: dstName, response: sr ? {status: sr.status(), url: rel(sr.url())} : null};
            };
            O.done = await drag(S.M.name, S.Z.name);
            await snap('o01-hosted-after-done');
            const r = await readAll('o02');
            O.after = {...r.a, bulkEqualsGrid: r.bulkEqualsGrid};
            // drag Mike back below Alpha: the site's order as it was
            await hosted();
            const rows = await readRows();
            const zi = rows.findIndex((x) => x.id === S.Z.id), ai = rows.findIndex((x) => x.id === S.A.id);
            O.gridBeforeRestore = {Z: zi, A: ai, M: rows.findIndex((x) => x.id === S.M.id)};
            // Mike is above Zulu now; drag Alpha above Zulu then Zulu above Alpha would not restore; move Zulu above Mike, then Alpha above Mike
            O.restore1 = await drag(S.Z.name, S.M.name);
            await hosted();
            O.restore2 = await drag(S.A.name, S.M.name);
            await hosted();
            const rows2 = await readRows();
            O.gridRestored = {Z: rows2.findIndex((x) => x.id === S.Z.id), A: rows2.findIndex((x) => x.id === S.A.id), M: rows2.findIndex((x) => x.id === S.M.id)};
            const panel = await openSite('settings');
            const opts = await readOptions(panel);
            await snap('o03-settings-after-restore');
            O.afterRestore = analyse(opts, rows2);
            fact('order', O);
        }

        // ------------------------------------------------------------------ enable: Hotel enabled publicly, then not
        if (on('enable')) {
            const E = {};
            const formDlg = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('form[action*="/api/v1/contexts"]')}).last();
            const setEnabled = async (want) => {
                await hosted();
                const r = row(S.H.name);
                await r.waitFor({timeout: T});
                const ex = r.locator('a.show_extras');
                if (await ex.count()) { await ex.click(); await sleep(400); }
                await r.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
                await formDlg().locator('[id^="context-name-control"]').first().waitFor({timeout: T});
                await idle(page).catch(() => {}); await sleep(500);
                const cb = formDlg().getByRole('checkbox', {name: /appear publicly on the site/});
                if (want) await cb.check(); else await cb.uncheck();
                const resp = page.waitForResponse((x) => /\/api\/v1\/contexts\//.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await formDlg().getByRole('button', {name: 'Save', exact: true}).click();
                const rr = await resp;
                await sleep(1500);
                return {status: rr ? rr.status() : null, enabled: sql(app, `select enabled from ${tbl} where ${idCol} = ${Number(S.H.id)}`)};
            };
            E.on = await setEnabled(true);
            let r = await readAll('e01');
            E.whileEnabled = {hiddenOffered: r.a.hiddenOffered, H: r.a.mine.H, mineOrder: r.a.mineOrder, mineGridOrder: r.a.mineGridOrder, equalsGrid: r.a.equalsGrid, equalsIdAsc: r.a.equalsIdAsc, equalsDbPhysical: r.a.equalsDbPhysical, last5: r.a.last5, n: r.a.n};
            E.off = await setEnabled(false);
            r = await readAll('e02');
            E.afterDisabled = {hiddenOffered: r.a.hiddenOffered, mineOrder: r.a.mineOrder, equalsDbPhysical: r.a.equalsDbPhysical, n: r.a.n};
            fact('enable', E);
        }
    } finally {
        fact('crashes', CRASH);
        fact('dialogs', DIALOGS);
        await close();
    }
});
