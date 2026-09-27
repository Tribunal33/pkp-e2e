const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U18 claim check, chunk K1: the feed documents — channel, items, order, number, identifiers, language.
// Spec: docs/specs/U18-web-feeds.md — Fields (44–84: the three feeds, the channel table, the item table),
// Rules 2–10 (109–153), Settings 3–5 (237–249), Settings 9 (262–269), register A1 (361–369), A3 (378–386);
// footnotes c, f, g, td1–td9, f-a1, f-a3.
//
//   PROBE_FEATURE=U18 PROBE_AGENT=ccK1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U18/K1/k1.js
//   PHASES=seed,fresh,... (default: all, in the order below). State in k1-state-<app>.json under the output
//   folder, so a phase re-runs alone; delete it (or RESEED=1) for a fresh seed. One app per process keeps a
//   run under the Bash tool's 600 s cap: seed,fresh | channel | items | list | order,cap,republish | extra,noabs,leave |
//   isbn,identon,french,identoff | issue,issue2,parity (isbn is OMP only; noabs OJS/OPS; issue, issue2 OJS only).
//   Phases: seed · fresh (td1, td5, the window's arrival values, publicknowledge) · channel (td7, Settings 9) · items (td6,
//   Rule 7: a second contributor unticked in lists, OJS pages, OMP terms typed, the link followed, a v2 titled and then
//   published) · list (td2: unpublish, a licence and DOIs, publish on screen; td1's Reader) · order (td3) · cap (31 items)
//   · republish (the cut item unpublished and published again: is a publish a "change"?) · extra (a second listed
//   contributor; an abstract emptied, OMP) · noabs (a section without required abstracts, OJS/OPS) · leave (tabbed
//   settings left unsaved) · isbn (OMP ISBN-13 on the format) · identon / french (td9) / identoff (td8) · issue (td4) ·
//   issue2 (a clean two-section issue: feed order against the table of contents) · parity (the `plugins` key's rows).
//
// Scratch contexts per app (tag prefix u18k1), each with its own manager (mg), reader (rd) and author (au):
//   F  fresh: no plugin key, nothing published (td1, td5, the window's arrival values).
//   M  main: en + fr_CA (UI and forms), categories "Cat One"/"Cat Two" (fr "Cat Un"/"Cat Deux"), the
//      metadata items keywords/subjects/disciplines on; OJS sections ART "Articles" and SEC "Second Section",
//      issues Vol 1 No 1 (2024, published) and Vol 1 No 2 (2025, unpublished); OPS section PRE; OMP a series
//      made on screen; the box and the Language Toggle Block placed through `sidebar`. Submissions:
//        rich    published 2024-03-05 (OJS: Vol 1 No 1, ART), title/abstract en+fr, terms, both categories; a
//                second contributor with "Include this contributor…" unticked is added on screen (td6)
//        pending submitted, never published (published on screen in the list phase, td2)
//        retract published, then unpublished on screen (td2)
//        sched   OJS: into the unpublished Vol 1 No 2 (scheduled); OMP/OPS: datePublished 2030-01-01 (scheduled)
//        second  OJS: published in Vol 1 No 1, section SEC (td4)
//        noissue OJS: published without an issue (td4)
//   O  order: "Older" published 2024-06-01, then "Newer-dated" published 2024-01-01 (td3); also "another journal".
//   C  cap: 31 published items, the default number 30 (Rule 4's other end).
//   P  the context scenario's `plugins.webfeedplugin.settings` key, for the stored-type comparison (parity).
// publicknowledge is read only (its three feeds, signed out).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30_000;
const ALL = ['seed', 'fresh', 'channel', 'items', 'list', 'order', 'cap', 'republish', 'extra', 'noabs', 'leave', 'isbn', 'identon', 'french', 'identoff', 'issue', 'issue2', 'parity'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[k1 +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const FEEDS = ['atom', 'rss2', 'rss'];

// ---------------------------------------------------------------------------
// XML as data (run in the page): element → object; repeated tags become lists; attributes as "@name"; text as "#".
const XML2JSON = (xml) => {
    let doc;
    try { doc = new DOMParser().parseFromString(xml, 'application/xml'); } catch (e) { return {parseError: String(e)}; }
    const pe = doc.getElementsByTagName('parsererror')[0];
    if (pe) return {parseError: pe.textContent.slice(0, 400)};
    const conv = (el) => {
        const o = {};
        for (const a of el.attributes) if (!a.name.startsWith('xmlns')) o['@' + a.name] = a.value;
        const kids = [...el.children];
        const text = kids.length ? null : el.textContent.replace(/\s+/g, ' ').trim();
        if (!kids.length) { if (!Object.keys(o).length) return text; o['#'] = text; return o; }
        for (const k of kids) {
            const v = conv(k);
            if (k.tagName in o) { if (!Array.isArray(o[k.tagName]) || !o[k.tagName].__list) { const arr = [o[k.tagName]]; Object.defineProperty(arr, '__list', {value: true}); o[k.tagName] = arr; } o[k.tagName].push(v); } else o[k.tagName] = v;
        }
        return o;
    };
    return {root: doc.documentElement.tagName, data: conv(doc.documentElement)};
};
const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const txt = (v) => (v == null ? null : typeof v === 'string' ? v : v['#'] ?? null);

/** A compact, format-aware summary of a parsed feed. */
function summarize(type, parsed) {
    if (!parsed || !parsed.data) return null;
    const d = parsed.data;
    if (type === 'atom') {
        return {
            channel: {title: txt(d.title), subtitle: txt(d.subtitle), updated: txt(d.updated), author: d.author || null,
                links: list(d.link).map((l) => ({rel: l['@rel'], href: l['@href']})), generator: txt(d.generator), id: txt(d.id)},
            items: list(d.entry).map((e) => ({title: txt(e.title), id: txt(e.id), link: list(e.link).map((l) => l['@href']),
                authors: list(e.author).map((a) => txt(a.name)), summary: txt(e.summary), updated: txt(e.updated), published: txt(e.published),
                terms: list(e.category).map((c) => `${c['@label']}=${c['@term']}`), rights: txt(e.rights)})),
        };
    }
    if (type === 'rss2') {
        const c = d.channel || {};
        return {
            channel: {title: txt(c.title), link: txt(c.link), description: txt(c.description), language: txt(c.language), copyright: txt(c.copyright),
                managingEditor: txt(c.managingEditor), webMaster: txt(c.webMaster), pubDate: txt(c.pubDate), generator: txt(c.generator)},
            items: list(c.item).map((i) => ({title: txt(i.title), link: txt(i.link), creator: txt(i['dc:creator']), description: txt(i.description),
                terms: list(i.category).map((x) => `${(x['@domain'] || '').split('/').pop()}=${txt(x)}`), rights: txt(i['dc:rights']),
                license: i['cc:license'] && i['cc:license']['@rdf:resource'] || null, guid: txt(i.guid), pubDate: txt(i.pubDate)})),
        };
    }
    const c = d.channel || {};
    return {
        channel: {title: txt(c.title), link: txt(c.link), description: txt(c.description), publisher: txt(c['dc:publisher']), language: txt(c['dc:language']),
            publicationName: txt(c['prism:publicationName']), issn: txt(c['prism:issn']), copyright: txt(c['prism:copyright'])},
        items: list(d.item).map((i) => ({title: txt(i.title), link: txt(i.link), creators: list(i['dc:creator']).map(txt), description: txt(i.description),
            terms: list(i['dc:subject']).map((s) => { const r = s && s['rdf:Description']; return r ? `${((r['taxo:topic'] || {})['@rdf:resource'] || '').split('/').pop()}=${txt(r['rdf:value'])}` : null; }),
            rights: txt(i['dc:rights']), license: i['cc:license'] && i['cc:license']['@rdf:resource'] || null, date: txt(i['dc:date']),
            publicationDate: txt(i['prism:publicationDate']), startingPage: txt(i['prism:startingPage']), endingPage: txt(i['prism:endingPage']), doi: txt(i['prism:doi'])})),
    };
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const RESEED = process.env.RESEED === '1';
    const S = !RESEED && fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k1-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const strip = (u) => (u || '').replace(app.baseURL, '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '');
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const feedUrl = (ctx, type, locale = '') => cu(ctx, `${locale ? '/' + locale : ''}/gateway/plugin/WebFeedGatewayPlugin/${type}`);
    const TABLE = isOJS ? 'journals' : isOMP ? 'presses' : 'servers';
    const IDCOL = isOJS ? 'journal_id' : isOMP ? 'press_id' : 'server_id';
    const db = (sql) => { try { return execFileSync('psql', [`${dbName(app.name)}`, '-AtF', '|', '-c', sql], {encoding: 'utf8'}).trim(); } catch (e) { return `db error: ${String(e.message).slice(0, 200)}`; } };
    const pluginRows = (ctxPath) => db(`select ps.setting_name, ps.setting_value, ps.setting_type from plugin_settings ps join ${TABLE} c on c.${IDCOL}=ps.context_id where c.path='${ctxPath}' and ps.plugin_name='webfeedplugin' order by 1`).split('\n');

    await app.api.bootstrapProbe(app.contextPath);
    const {page, close} = await launch(app);
    const jsDialogs = [];
    page.on('dialog', (d) => { jsDialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 300)}); d.accept().catch(() => {}); });
    const gateway = [];
    page.context().on('response', (r) => { if (/\/gateway/.test(r.url())) gateway.push({at: Date.now(), url: strip(r.url()), status: r.status(), ct: r.headers()['content-type'] || null, nav: r.request().isNavigationRequest()}); });
    const since = (arr, t0) => arr.filter((x) => x.at >= t0);

    async function snap(name, extra = {}, {png = false} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        Object.assign(s, extra);
        record(name, s);
        if (png) await shot(page, name).catch(() => {});
        return s;
    }
    async function sect(name, fn) {
        try { return await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            fact(`${name}.FAILED`, String(e.message || e).slice(0, 600));
            await snap(`zz-failed-${name}`, {}, {png: true}).catch(() => {});
            return null;
        }
    }
    let who = 'visitor';
    const as = async (user, ctx) => { await signIn(page, user, {contextPath: ctx}); await idle(page); who = user; };
    const visitor = async () => { await signOut(page).catch(() => {}); who = 'visitor'; };
    const vis = '[role="dialog"]:visible';
    const wf = () => page.locator(vis).first();
    const wfUrl = (ctx, sid, key) => cu(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);
    const go = async (url) => { const r = await page.goto(url).catch((e) => ({err: String(e.message).slice(0, 200)})); await idle(page).catch(() => {}); return r && typeof r.status === 'function' ? r.status() : r; };

    // ------------------------------------------------------------------ feeds
    /** One feed opened the way a browser opens it: the page shown (or the download), the status, the parsed document. */
    async function readFeed(url, name, {click} = {}) {
        const t0 = Date.now();
        const out = {who, asked: strip(url)};
        const dlP = page.waitForEvent('download', {timeout: 12_000}).catch(() => null);
        let err = null, resp = null;
        if (click) {
            out.href = strip(await click.getAttribute('href').catch(() => null));
            const nav = page.waitForNavigation({timeout: 12_000}).catch((e) => ({err: String(e.message).slice(0, 120)}));
            await click.click().catch((e) => { err = String(e.message).slice(0, 200); });
            const n = await Promise.race([nav, dlP.then((d) => (d ? {download: d} : null))]);
            if (n && n.download) err = 'Download is starting';
            else if (n && typeof n.status === 'function') resp = n;
        } else {
            try { resp = await page.goto(url); } catch (e) { err = String(e.message).slice(0, 200); }
        }
        let body = null;
        if (err && /Download is starting/.test(err)) {
            const dl = await dlP;
            out.mode = 'download';
            out.suggestedFilename = dl ? dl.suggestedFilename() : null;
            try { body = dl ? fs.readFileSync(await dl.path(), 'utf8') : null; } catch (e) { out.dlErr = String(e.message).slice(0, 120); }
        } else if (resp) {
            out.mode = 'page';
            body = await resp.text().catch(() => null);
        } else out.err = err;
        await idle(page).catch(() => {});
        out.gateway = since(gateway, t0);
        const last = out.gateway.filter((g) => g.nav).pop() || out.gateway[out.gateway.length - 1] || null;
        out.status = resp ? resp.status() : last ? last.status : null;
        out.contentType = resp ? resp.headers()['content-type'] : last ? last.ct : null;
        out.finalUrl = strip(page.url());
        out.tabTitle = await page.title().catch(() => null);
        out.bodyLength = body ? body.length : 0;
        out.bodyHead = body ? body.slice(0, 700) : null;
        const src = out.asked || out.href || out.finalUrl;
        const type = /\/atom\b/.test(src) ? 'atom' : /\/rss2\b/.test(src) ? 'rss2' : 'rss';
        out.type = type;
        const parsed = body ? await page.evaluate(XML2JSON, body).catch((e) => ({parseError: String(e.message).slice(0, 200)})) : null;
        out.parseError = parsed && parsed.parseError || null;
        out.summary = summarize(type, parsed);
        out.itemTitles = out.summary ? out.summary.items.map((i) => i.title) : null;
        if (out.mode === 'page') await snap(name, {feed: out});
        else record(name, out);
        return out;
    }
    async function readFeeds(ctx, name, {locale} = {}) {
        const res = {};
        for (const t of FEEDS) res[t] = await readFeed(feedUrl(ctx, t, locale), `${name}-${t}`);
        const brief = Object.fromEntries(Object.entries(res).map(([k, v]) => [k, {status: v.status, mode: v.mode, ct: v.contentType, n: v.itemTitles ? v.itemTitles.length : null, titles: v.itemTitles && v.itemTitles.slice(0, 40), channel: v.summary && v.summary.channel, err: v.parseError || (v.status >= 400 ? flat(v.bodyHead, 300) : undefined)}]));
        fact(name, brief);
        return res;
    }

    // ------------------------------------------------------------------ the plugin's settings window (the screen that sets what the feeds carry)
    const dialog = () => page.locator('[role="dialog"]:visible').last();
    async function openWebsite(ctx, top) {
        await go(cu(ctx, '/management/settings/website'));
        await page.locator(`#${top}-button`).click();
        await idle(page); await sleep(600);
    }
    const feedRow = () => page.locator('#pluginGridContainer tr.gridRow').filter({hasText: 'Web Feed Plugin'}).first();
    async function pluginRow(ctx, name) {
        await openWebsite(ctx, 'plugins');
        await feedRow().waitFor({timeout: T});
        const row = await feedRow().evaluate((r) => {
            const box = r.querySelector('input[type=checkbox]');
            let cat = r.previousElementSibling; while (cat && !/category/i.test(cat.className)) cat = cat.previousElementSibling;
            return {text: r.innerText.replace(/\s+/g, ' ').trim(), enabled: box ? box.checked : null, category: cat ? cat.innerText.replace(/\s+/g, ' ').trim() : null,
                links: [...r.querySelectorAll('a')].map((a) => a.innerText.trim()).filter(Boolean)};
        }).catch((e) => ({error: String(e.message)}));
        const exp = feedRow().locator('a.show_extras').first();
        if (await exp.count()) { await exp.click(); await sleep(500); }
        row.actions = await page.locator('#pluginGridContainer tr.row_controls:visible').first().getByRole('link').allInnerTexts().then((a) => a.map((x) => x.trim())).catch(() => []);
        await snap(name, {row}, {png: true});
        return row;
    }
    async function windowState() {
        const d = dialog();
        if (!(await d.count())) return {open: false};
        return d.evaluate((root) => {
            const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
            const lab = (i) => (root.querySelector(`label[for="${i.id}"]`) || i.closest('label') || {}).innerText?.replace(/\s+/g, ' ').trim() ?? null;
            return {open: true, heading: t(root.querySelector('h1, .pkp_modal_panel > .header, [class*="header"] h2')),
                radios: [...root.querySelectorAll('input[type=radio]')].map((r) => ({name: r.name, value: r.value, checked: r.checked, label: lab(r)})),
                text: [...root.querySelectorAll('input[type=text]')].map((i) => ({name: i.name, value: i.value, label: lab(i)})),
                boxes: [...root.querySelectorAll('input[type=checkbox]')].map((i) => ({name: i.name, checked: i.checked, label: lab(i)})),
                errors: [...root.querySelectorAll('.error, .pkp_form_error, label.error')].map(t).filter(Boolean),
                all: t(root)};
        });
    }
    async function openWindow(ctx) {
        await openWebsite(ctx, 'plugins');
        await feedRow().waitFor({timeout: T});
        const exp = feedRow().locator('a.show_extras').first();
        if (await exp.count()) { await exp.click(); await sleep(500); }
        const settings = page.locator('#pluginGridContainer tr.row_controls:visible').first().getByRole('link', {name: 'Settings', exact: true}).first();
        await loc(page, 'Website › Plugins: the expanded "Web Feed Plugin" row\'s "Settings" action', settings);
        await settings.click();
        await dialog().locator('input[name="recentItems"]').waitFor({timeout: T});
        await idle(page); await sleep(400);
        return windowState();
    }
    /** Set the window's fields and press "OK"; the answer, the notice, and the window reopened after a reload. */
    async function setWindow(ctx, vals, name) {
        const before = await openWindow(ctx);
        const d = dialog();
        if (vals.displayPage) await d.locator(`input[type=radio][name="displayPage"][value="${vals.displayPage}"]`).check();
        if (vals.displayItems) await d.locator(`input[type=radio][name="displayItems"][value="${vals.displayItems}"]`).check();
        if (vals.recentItems !== undefined) await d.locator('input[name="recentItems"]').fill(String(vals.recentItems));
        if (vals.includeIdentifiers !== undefined) { const b = d.locator('input[name="includeIdentifiers"]'); if (vals.includeIdentifiers) await b.check(); else await b.uncheck(); }
        const filled = await windowState();
        const t0 = Date.now();
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: 'OK', exact: true}).click();
        const resp = await w;
        let json = null; try { json = resp ? await resp.json() : null; } catch { json = null; }
        await sleep(1000); await idle(page);
        const notices = await page.locator('.ui-pnotify-text, .pkpNotification, [role="alert"]').allInnerTexts().then((a) => a.map((x) => flat(x, 200)).filter(Boolean)).catch(() => []);
        const stillOpen = (await page.locator('[role="dialog"]:visible').count()) > 0;
        const out = {before: {radios: before.radios, text: before.text, boxes: before.boxes}, filled: {radios: filled.radios, text: filled.text, boxes: filled.boxes},
            post: resp ? resp.status() : null, jsonStatus: json && json.status, notices, stillOpen, crashes: since(gateway, t0).filter((g) => g.status >= 500)};
        await snap(`${name}-after-ok`, {window: out}, {png: true});
        if (stillOpen) { out.openState = await windowState(); await closeWin(); }
        await page.reload(); await idle(page);
        out.reopened = await openWindow(ctx);
        await snap(`${name}-reopened`, {window: out.reopened});
        await closeWin();
        out.db = pluginRows(ctx);
        fact(name, {vals, post: out.post, jsonStatus: out.jsonStatus, notices, stillOpen, reopened: {radios: out.reopened.radios, text: out.reopened.text, boxes: out.reopened.boxes}, db: out.db});
        return out;
    }
    async function closeWin() {
        const d = dialog();
        if (!(await d.count())) return;
        const c = d.getByRole('link', {name: 'Cancel', exact: true}).first();
        if (await c.count()) await c.click(); else await d.getByRole('button', {name: /Close/}).first().click().catch(() => page.keyboard.press('Escape'));
        await page.locator('[role="dialog"]:visible').waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await sleep(600);
    }

    // ------------------------------------------------------------------ Vue settings forms (Masthead, Contact, Search Indexing, License)
    async function openSettingsTab(ctx, slug, tabName, sideName) {
        await go(cu(ctx, `/management/settings/${slug}`));
        await page.getByRole('tab', {name: tabName, exact: true}).first().click();
        await idle(page); await sleep(700);
        if (sideName) { await page.getByRole('tab', {name: sideName, exact: true}).first().click(); await idle(page); await sleep(700); }
    }
    async function saveVue(field, name) {
        const form = page.locator('form').filter({has: field}).first();
        const t0 = Date.now();
        const r = page.waitForResponse((x) => /\/api\/v1\/contexts\//.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const resp = await r;
        const seen = new Set(); const start = Date.now();
        while (Date.now() - start < 5_000) { for (const s of await page.locator('[role="status"], .pkpFormPage__status').allInnerTexts().catch(() => [])) if (s.trim()) seen.add(s.trim()); if (seen.has('Saved')) break; await sleep(250); }
        let body = null; if (resp && resp.status() >= 400) body = flat(await resp.text().catch(() => ''), 600);
        const out = {status: resp ? resp.status() : null, statuses: [...seen], body, fieldErrors: await form.locator('.pkpFieldError, .pkpFormField__error').allInnerTexts().catch(() => []), formErrors: await page.locator('.pkpFormErrors, .pkpFormPage__errors, [role="alert"]').allInnerTexts().catch(() => []), crashes: since(gateway, t0)};
        await snap(name, {save: out});
        return out;
    }
    async function typeRich(idPrefix, text, {replace = false} = {}) {
        const iframe = page.locator(`iframe[id^="${idPrefix}"]`).first();
        if (!(await iframe.count())) return {typed: false, idPrefix};
        const id = (await iframe.getAttribute('id')).replace(/_ifr$/, '');
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
        await page.frameLocator(`#${id}_ifr`).locator('body').click();
        if (replace) { await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Delete'); } else await page.keyboard.press('ControlOrMeta+End');
        await page.keyboard.type(text);
        await sleep(300);
        return {typed: true, id, after: await page.evaluate((i) => window.tinymce.get(i).getContent(), id).catch(() => null)};
    }

    // ------------------------------------------------------------------ workflow: publish, unpublish, versions, publication pages
    async function fillVersionIfPresent(scope) {
        for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
            const el = scope.locator(sel);
            if (await el.isVisible().catch(() => false)) { if (!(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {}); }
        }
    }
    const controlsRight = () => page.locator('[data-cy="workflow-controls-right"]');
    async function publishNow(name) {
        const s = {};
        const waitPublish = () => page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        const button = controlsRight().getByRole('button', {name: /^(Schedule For Publication|Publish|Post)$/}).first();
        await button.waitFor({state: 'visible', timeout: T});
        s.button = flat(await button.innerText().catch(() => null), 60);
        await sleep(800);
        await button.click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to (publish|post) this|make this catalog entry public/}).last();
        const which = () => Promise.race([
            panel.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
            confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm'),
        ]).catch(() => null);
        let opened = await which();
        if (!opened) { s.secondPress = true; await button.click({timeout: 5_000}).catch(() => {}); opened = await which(); }
        s.opened = opened;
        await idle(page);
        if (opened === 'panel') {
            await fillVersionIfPresent(panel);
            const dontAssign = panel.getByRole('radio', {name: "Don't Assign To An Issue"});
            if (await dontAssign.waitFor({state: 'visible', timeout: 5_000}).then(() => true).catch(() => false)) {
                await expectCount(panel.locator('input[name="assignment"]:checked'), 1);
                await dontAssign.check();
            }
            s.panel = flat(await panel.innerText().catch(() => ''), 900);
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
            await confirm.waitFor({state: 'visible', timeout: T});
        }
        await idle(page); await sleep(500);
        await fillVersionIfPresent(confirm);
        s.confirm = flat(await confirm.innerText().catch(() => ''), 600);
        const done = waitPublish();
        await confirm.getByRole('button', {name: /^(Publish|Post)$/}).last().click();
        const r = await done;
        s.status = r ? r.status() : null;
        await controlsRight().getByRole('button', {name: /^(Unpublish|Unpost)$/}).waitFor({state: 'visible', timeout: T}).catch(() => {});
        await idle(page);
        s.controls = await controlsRight().getByRole('button').allInnerTexts().catch(() => []);
        await snap(name, {publish: s}, {png: true});
        return s;
    }
    async function expectCount(locator, n, timeout = T) {
        const start = Date.now();
        while (Date.now() - start < timeout) { if ((await locator.count().catch(() => 0)) === n) return true; await sleep(250); }
        return false;
    }
    async function unpublishNow(name) {
        const s = {};
        const b = controlsRight().getByRole('button', {name: /^(Unpublish|Unpost)$/}).first();
        await b.waitFor({state: 'visible', timeout: T});
        s.button = await b.innerText();
        await b.click();
        const d = page.getByRole('dialog').filter({hasText: /Are you sure you don't want this to be (published|posted)/}).last();
        await d.waitFor({state: 'visible', timeout: T});
        s.dialog = flat(await d.innerText(), 400);
        const r = page.waitForResponse((x) => /\/unpublish/.test(x.url()), {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: /^(Unpublish|Unpost)$/}).last().click();
        const resp = await r;
        s.status = resp ? resp.status() : null;
        await sleep(1200); await idle(page);
        s.controls = await controlsRight().getByRole('button').allInnerTexts().catch(() => []);
        await snap(name, {unpublish: s}, {png: true});
        return s;
    }
    async function openPubPage(ctx, sid, pub, entry) {
        await go(wfUrl(ctx, sid, `publication_${pub}_titleAbstract`));
        await sleep(800);
        if (entry && entry !== 'Title & Abstract') {
            const l = wf().getByRole('link', {name: entry, exact: true}).last();
            await l.waitFor({state: 'visible', timeout: T});
            await l.click();
            await idle(page); await sleep(900);
        }
    }
    async function pressPubSave(name) {
        const button = wf().getByRole('button', {name: 'Save', exact: true}).last();
        const r = page.waitForResponse((x) => /\/publications\/\d+/.test(x.url()) && ['POST', 'PUT'].includes(x.request().method()), {timeout: T}).catch(() => null);
        await button.click();
        const resp = await r;
        await page.locator('[role="status"]:has-text("Saved")').first().waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
        await sleep(400);
        let body = null; if (resp && resp.status() >= 400) body = flat(await resp.text().catch(() => ''), 600);
        const out = {status: resp ? resp.status() : null, body, errors: await page.locator('.pkpFieldError').allInnerTexts().catch(() => [])};
        if (name) await snap(name, {save: out});
        return out;
    }
    async function addContributor(ctx, sid, pub, {given, family, email, inLists}, name) {
        const out = {};
        await openPubPage(ctx, sid, pub, 'Contributors');
        const panel = page.locator('.listPanel--contributor');
        await panel.waitFor({timeout: T});
        out.rowsBefore = await panel.locator('li.listPanel__item').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
        await snap(`${name}-panel-before`);
        await panel.getByRole('button', {name: 'Add Contributor', exact: true}).click();
        const d = page.getByRole('dialog', {name: 'Add Contributor'});
        await d.waitFor({state: 'visible', timeout: T});
        await d.locator('input[name^="givenName"]').first().fill(given);
        await d.locator('input[name^="familyName"]').first().fill(family);
        await d.locator('input[name="email"]').fill(email);
        const country = d.locator('select[name="country"]');
        if (await country.count()) await country.selectOption({label: 'Canada'}).catch(() => {});
        await d.getByRole('checkbox', {name: 'Author', exact: true}).first().check().catch((e) => { out.roleErr = String(e.message).slice(0, 120); });
        const box = d.getByRole('checkbox', {name: 'Include this contributor when identifying authors in lists of publications.'});
        out.listBoxDefault = await box.isChecked().catch(() => null);
        if (!inLists) await box.uncheck();
        out.listBoxSet = await box.isChecked().catch(() => null);
        await snap(`${name}-form`, {facts: out});
        const r = page.waitForResponse((x) => x.url().includes('/contributors') && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: 'Save', exact: true}).click();
        const resp = await r;
        out.status = resp ? resp.status() : null;
        if (resp && resp.status() >= 400) out.body = flat(await resp.text().catch(() => ''), 500);
        await d.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await sleep(800);
        out.rowsAfter = await panel.locator('li.listPanel__item').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
        await snap(`${name}-panel-after`, {facts: out}, {png: true});
        return out;
    }
    async function createNewVersion(name) {
        const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
        await link.waitFor({state: 'visible', timeout: T}).catch(() => {});
        if (!(await link.isVisible().catch(() => false))) return {offered: false};
        await sleep(1200);
        await link.click();
        const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
        await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
        await idle(page); await sleep(800);
        await fillVersionIfPresent(w);
        await snap(`${name}-window`);
        const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: 'Confirm', exact: true}).click();
        const resp = await r;
        let newPub = null; if (resp) { try { newPub = (await resp.json()).id; } catch { /* none */ } }
        await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page);
        return {offered: true, status: resp && resp.status(), newPub};
    }
    /** A term chip typed into a Vue controlled-vocabulary field ("Keywords", …) on the open publication page. */
    async function typeTerms(label, terms) {
        const f = wf().locator('.pkpFormField').filter({has: page.locator('legend, label').filter({hasText: new RegExp(`^${label}`)})}).first();
        if (!(await f.count())) return {field: false, label};
        const input = f.locator('input[type="text"], input:not([type])').first();
        for (const t of terms) { await input.click(); await input.fill(t); await sleep(400); await page.keyboard.press('Enter'); await sleep(500); }
        return {field: true, label, chips: await f.innerText().then((x) => flat(x, 300)).catch(() => null)};
    }

    // ------------------------------------------------------------------ public pages
    async function home(ctx, name, locale) {
        const st = await go(cu(ctx, locale ? `/${locale}` : ''));
        const box = await page.evaluate(() => {
            const b = document.querySelector('.block_web_feed');
            return {box: b ? {heading: b.querySelector('h2, .title')?.innerText.trim() ?? null, links: [...b.querySelectorAll('a')].map((a) => ({href: a.getAttribute('href'), alt: a.querySelector('img')?.getAttribute('alt') ?? null}))} : null,
                alternates: [...document.querySelectorAll('head link[rel="alternate"]')].map((l) => ({type: l.getAttribute('type'), href: l.getAttribute('href')})),
                lang: document.documentElement.lang,
                localeLinks: [...document.querySelectorAll('a')].filter((a) => /setLocale|\/fr_CA|\/en(\/|$)/.test(a.getAttribute('href') || '') || /Français|English/.test(a.innerText)).map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})).slice(0, 12)};
        }).catch((e) => ({err: String(e.message)}));
        await snap(name, {status: st, ...box}, {png: true});
        return {status: st, ...box};
    }

    const T_ = (k) => `${S.t}${k}`.slice(0, 32);
    const seedSub = async (ctxKey, key, spec) => {
        S.subs = S.subs || {}; S.pubs = S.pubs || {}; S.subErr = S.subErr || {};
        if (S.subs[key]) return;
        const C = S[ctxKey];
        try {
            const r = await app.api.createSubmission({tag: T_(key), context: C.path, submitter: `${C.path}au`, ...spec});
            S.subs[key] = r.submissionId; S.pubs[key] = r.publicationId; delete S.subErr[key]; log('sub', key, r.submissionId, r.status);
        } catch (e) { S.subErr[key] = String(e.message).slice(0, 600); log('sub FAILED', key, S.subErr[key]); }
        save();
    };

    try {
        // ============================================================ seed
        if (on('seed')) await sect('seed', async () => {
            if (!S.t) { S.t = tag('u18k1'); save(); }
            const t = S.t;
            const users = (p) => [
                {username: `${p}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
                {username: `${p}rd`, roles: ['reader'], givenName: 'Rita', familyName: 'Reader'},
                {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            ];
            const mk = async (key, extra = {}) => {
                if (S[key]) return;
                // M's path is "mn": a refused build of M once left its path behind (the context row stayed although the request answered 400)
                const p = `${t}${key === 'M' ? 'mn' : key.toLowerCase()}`.slice(0, 32);
                try {
                    const r = await app.api.createContext({tag: p, users: users(p), ...extra, context: {name: `K1 ${key} ${t}`, contactName: 'Paula Principal', contactEmail: `principal${p}@mail.test`, ...(extra.context || {})}});
                    S[key] = {path: r.path, id: r.contextId}; log('ctx', key, r.path, r.contextId);
                } catch (e) { S[`${key}Err`] = String(e.message).slice(0, 800); log('ctx FAILED', key, S[`${key}Err`]); }
                save();
            };
            await mk('F');
            const sec = isOJS ? {sections: [{abbrev: 'ART', title: {en: 'Articles', fr_CA: 'Articles FR'}}, {abbrev: 'SEC', title: {en: 'Second Section', fr_CA: 'Deuxième section'}}]}
                : isOPS ? {sections: [{abbrev: 'PRE', title: {en: 'Preprints', fr_CA: 'Prépublications'}}]} : {};
            await mk('M', {
                context: {primaryLocale: 'en', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']},
                ...sec,
                categories: [{path: 'catone', title: {en: 'Cat One', fr_CA: 'Cat Un'}}, {path: 'cattwo', title: {en: 'Cat Two', fr_CA: 'Cat Deux'}}],
                metadata: {keywords: 'request', subjects: 'request', disciplines: 'request'},
                ...(isOJS ? {issues: [{volume: 1, number: 1, year: 2024, published: true}, {volume: 1, number: 2, year: 2025, published: false}]} : {}),
                // the builder asks the block list outside the context, where the default-enabled plugin has registered no block: the key is needed
                plugins: {webfeedplugin: {enabled: true}},
                sidebar: ['WebFeedBlockPlugin', 'languagetoggleblockplugin'],
            });
            await mk('O');
            await mk('C');
            await mk('P', {plugins: {webfeedplugin: {enabled: true, settings: {displayPage: 'all', displayItems: 'recent', recentItems: 7, includeIdentifiers: true}}}});
            // OMP: the press's series, made on screen (the context scenario has no series key)
            if (isOMP && S.M && !S.seriesMade) {
                await as(`${S.M.path}mg`, S.M.path);
                await go(cu(S.M.path, '/management/settings/context'));
                await page.getByRole('tab', {name: 'Series', exact: true}).first().click(); await idle(page);
                const grid = page.locator('#seriesGridContainer');
                await grid.waitFor({timeout: T});
                await grid.getByRole('link', {name: /Add Series/}).first().click();
                const form = page.locator('form#seriesForm');
                await form.locator('input[name^="title"]').first().waitFor({timeout: T});
                await idle(page); await sleep(800);
                await form.locator('input[name="title[en]"]').fill('K1 Series');
                const fr = form.locator('input[name="title[fr_CA]"]'); if (await fr.count()) await fr.fill('Série K1').catch(() => {});
                await form.locator('input[name="path"]').fill('k1series');
                const r = page.waitForResponse((x) => x.request().method() === 'POST' && /(update|save)-?series/i.test(x.url()), {timeout: T}).catch(() => null);
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                const resp = await r;
                await sleep(1200);
                S.seriesMade = resp ? resp.status() : 'no response'; save();
                await snap('seed-omp-series', {status: S.seriesMade}, {png: true});
                await visitor();
            }
            if (S.M) {
                const rich = {title: {en: `Rich article ${t}`, fr_CA: `Article riche ${t}`}, abstract: {en: `<p>Rich abstract EN ${t}.</p>`, fr_CA: `<p>Résumé riche FR ${t}.</p>`},
                    published: true, datePublished: '2024-03-05', categories: ['catone', 'cattwo']};
                if (isOJS) Object.assign(rich, {section: 'ART', issue: {volume: 1, number: 1, year: 2024}, keywords: {en: ['kw one', 'kw two'], fr_CA: ['mot un']}, subjects: {en: ['subj one']}, disciplines: {en: ['disc one']}});
                if (isOPS) Object.assign(rich, {section: 'PRE', keywords: {en: ['kw one', 'kw two'], fr_CA: ['mot un']}, subjects: {en: ['subj one']}, disciplines: {en: ['disc one']}});
                if (isOMP) Object.assign(rich, {series: 'k1series', publicationFormats: [{name: 'PDF'}]});
                await seedSub('M', 'rich', rich);
                await seedSub('M', 'pending', {title: `Pending article ${t}`, ...(isOJS ? {section: 'ART'} : {})});
                await seedSub('M', 'retract', {title: `Retracted article ${t}`, published: true, datePublished: '2024-02-02', ...(isOJS ? {section: 'ART'} : {})});
                await seedSub('M', 'sched', isOJS ? {title: `Scheduled article ${t}`, published: true, section: 'ART', issue: {volume: 1, number: 2, year: 2025}} : {title: `Scheduled item ${t}`, published: true, datePublished: '2030-01-01'});
                if (isOJS) {
                    await seedSub('M', 'second', {title: `Second-section article ${t}`, published: true, section: 'SEC', issue: {volume: 1, number: 1, year: 2024}, datePublished: '2024-03-06'});
                    await seedSub('M', 'noissue', {title: `No-issue article ${t}`, published: true, section: 'ART', datePublished: '2024-03-07'});
                }
            }
            if (S.O) {
                await seedSub('O', 'older', {title: `Older ${t}`, published: true, datePublished: '2024-06-01'});
                await sleep(1500);
                await seedSub('O', 'newer', {title: `Newer-dated ${t}`, published: true, datePublished: '2024-01-01'});
            }
            if (S.C) for (let i = 1; i <= 31; i++) { await seedSub('C', `cap${String(i).padStart(2, '0')}`, {title: `Cap ${String(i).padStart(2, '0')} ${t}`, published: true, datePublished: `2023-01-${String(i).padStart(2, '0')}`}); }
            fact('seed', {t: S.t, F: S.F, M: S.M, O: S.O, C: S.C, P: S.P, subs: S.subs, subErr: S.subErr, errs: Object.fromEntries(Object.entries(S).filter(([k]) => /Err$/.test(k))), series: S.seriesMade});
            fact('seed-db-status', db(`select s.submission_id, s.status, p.date_published, s.last_modified from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id in (${Object.values(S.subs || {}).join(',') || 0}) order by s.last_modified`));
        });
        if (!S.t) throw new Error('no seed state');
        const M = S.M, F = S.F, O = S.O, C = S.C;
        const mg = (X) => `${X.path}mg`;

        // ============================================================ fresh: td1, td5, the window's arrival values, publicknowledge
        if (on('fresh')) await sect('fresh', async () => {
            const out = {};
            await as(mg(F), F.path);
            out.row = await pluginRow(F.path, 'f-01-plugins-row');
            out.window = await openWindow(F.path);
            await snap('f-02-window-arrival', {window: out.window}, {png: true});
            await closeWin();
            out.db = pluginRows(F.path);
            // a leave with something changed and unsaved: change the number, then press Cancel and reopen
            await openWindow(F.path);
            await dialog().locator('input[name="recentItems"]').fill('9');
            await closeWin();
            out.afterCancel = await openWindow(F.path);
            await snap('f-03-window-after-cancel', {window: out.afterCancel});
            await closeWin();
            fact('fresh-row-window', {row: out.row, radios: out.window.radios, text: out.window.text, boxes: out.window.boxes, all: out.window.all, db: out.db, afterCancelNumber: out.afterCancel.text});
            await visitor();
            out.feedsF = await readFeeds(F.path, 'f-10-fresh-signed-out');
            out.feedsPK = await readFeeds(app.contextPath, 'f-11-publicknowledge-signed-out');
            out.pkPublished = db(`select count(*) from submissions s join ${TABLE} c on c.${IDCOL}=s.context_id where c.path='${app.contextPath}' and s.status=3`);
            fact('fresh-pk-published-count', out.pkPublished);
        });

        // ============================================================ channel: td7, Settings 9 — the journal's own texts, empty then filled on screen
        if (on('channel')) await sect('channel', async () => {
            // each step runs once (flags in the state file); the feeds are read after each
            const out = S.channel || {};
            const done = (k, v) => { out[k] = v; S.channel = out; save(); };
            if (!out.c0) { await visitor(); await readFeeds(M.path, 'c-00-defaults'); done('c0', true); }
            if (!out.searchSave) {
                await as(mg(M), M.path);
                await openSettingsTab(M.path, 'distribution', 'Search Indexing');
                await snap('c-01-search-indexing-tab', {}, {png: true});
                const desc = page.locator('[id^="searchIndexing-searchDescription-control"], textarea[name^="searchDescription"], input[name^="searchDescription"]').first();
                await loc(page, 'Distribution › Search Indexing: the "Description" box', desc);
                if (await desc.count()) { await desc.fill(`K1 search description ${S.t}`); done('searchSave', await saveVue(desc, 'c-02-search-indexing-saved')); } else done('searchSave', 'no Description box');
                await visitor();
                await readFeeds(M.path, 'c-03-search-description-only');
            }
            if (!out.mastheadSave || out.mastheadSave.status !== 200) {
                await as(mg(M), M.path);
                await openSettingsTab(M.path, 'context', 'Masthead');
                await snap('c-04-masthead-tab', {}, {png: true});
                out.mastheadFields = await page.locator('[role="tabpanel"]:visible .pkpFormField').evaluateAll((els) => els.map((e) => { const l = e.querySelector('label, legend'); const c = e.querySelector('input, select, textarea'); return {label: l ? l.innerText.replace(/\s+/g, ' ').trim() : null, id: c ? c.id : null}; })).catch(() => []);
                const ini = page.locator('[id^="masthead-acronym-control-en"]').first();
                if (await ini.count() && !(await ini.inputValue())) await ini.fill('K1M');
                const country = page.locator('[id^="masthead-country-control"]').first();
                if (await country.count()) await country.selectOption({label: 'Canada'}).catch((e) => { out.countryErr = String(e.message).slice(0, 100); });
                out.summaryTyped = await typeRich('masthead-description-control-en', `K1 journal summary ${S.t}`, {replace: true});
                if (isOJS) {
                    await page.locator('[id^="masthead-publisherInstitution-control"]').first().fill(`K1 Publisher Inc ${S.t}`).catch((e) => { out.pubErr = String(e.message).slice(0, 100); });
                    await page.locator('[id^="masthead-onlineIssn-control"]').first().fill('2049-3630').catch((e) => { out.onlineErr = String(e.message).slice(0, 100); });
                }
                if (isOMP) await page.locator('[id^="masthead-publisher-control"]').first().fill(`K1 Press Publisher ${S.t}`).catch((e) => { out.pubErr = String(e.message).slice(0, 100); });
                done('mastheadSave', await saveVue(page.locator('[id^="masthead-name-control"]').first(), 'c-05-masthead-saved'));
                await visitor();
                await readFeeds(M.path, 'c-06-summary-publisher-online-issn');
            }
            if (isOJS && (!out.printSave || out.printSave.status !== 200)) {
                await as(mg(M), M.path);
                await openSettingsTab(M.path, 'context', 'Masthead');
                await page.locator('[id^="masthead-printIssn-control"]').first().fill('0378-5955');
                done('printSave', await saveVue(page.locator('[id^="masthead-name-control"]').first(), 'c-07-print-issn-saved'));
                await visitor();
                const r = await readFeed(feedUrl(M.path, 'rss'), 'c-08-print-issn-rss');
                done('printIssnRss', r.summary && r.summary.channel);
            }
            if (!out.contactSave) {
                await as(mg(M), M.path);
                await openSettingsTab(M.path, 'context', 'Contact');
                await snap('c-09-contact-tab', {}, {png: true});
                await page.locator('[id^="contact-supportName-control"]').first().fill('Sam Support');
                await page.locator('[id^="contact-supportEmail-control"]').first().fill(`support${S.t}@mail.test`);
                done('contactSave', await saveVue(page.locator('[id^="contact-supportName-control"]').first(), 'c-10-contact-saved'));
            }
            if (!out.licenseSave) {
                await as(mg(M), M.path);
                await openSettingsTab(M.path, 'distribution', 'License');
                await snap('c-11-license-tab', {}, {png: true});
                out.licenseTyped = await typeRich('license-licenseTerms-control-en', `K1 license terms ${S.t}`);
                done('licenseSave', await saveVue(page.locator('[id^="license-licenseTerms-control"]').first(), 'c-12-license-saved'));
            }
            await visitor();
            await readFeeds(M.path, 'c-13-support-license');
            fact('channel', {searchSave: out.searchSave, mastheadFields: out.mastheadFields, summaryTyped: out.summaryTyped && out.summaryTyped.typed, mastheadSave: out.mastheadSave, printSave: out.printSave, printIssnRss: out.printIssnRss, contactSave: out.contactSave, licenseSave: out.licenseSave});
        });

        // ============================================================ items: td6, Rule 7 — the item's parts; the second contributor; the current version
        if (on('items')) await sect('items', async () => {
            const out = {};
            const sid = S.subs.rich, pub = S.pubs.rich;
            await as(mg(M), M.path);
            if (!S.contribAdded) {
                out.contrib = await addContributor(M.path, sid, pub, {given: 'Bela', family: 'Unlisted', email: `bela${S.t}@mail.test`, inLists: false}, 'i-01-contributor');
                S.contribAdded = out.contrib.status; save();
            }
            if (isOJS && !S.pagesSet) {
                await openPubPage(M.path, sid, pub, 'Publication Settings');
                await snap('i-02-publication-settings-page', {}, {png: true});
                const pages = wf().locator('input[name="pages"]').first();
                await loc(page, 'Publication › Publication Settings: the "Pages" box', pages);
                if (await pages.count()) { await pages.fill('12-34'); out.pagesSave = await pressPubSave('i-03-pages-saved'); } else out.pagesSave = 'no Pages box';
                S.pagesSet = true; save();
            }
            if (isOMP && !S.ompTerms) {
                await openPubPage(M.path, sid, pub, 'Metadata');
                await snap('i-04-omp-metadata-page', {}, {png: true});
                out.kw = await typeTerms('Keywords', ['kw one', 'kw two']);
                out.subj = await typeTerms('Subjects', ['subj one']);
                out.disc = await typeTerms('Disciplines', ['disc one']);
                out.ompTermsSave = await pressPubSave('i-05-omp-metadata-saved');
                S.ompTerms = true; save();
            }
            await visitor();
            out.feeds1 = await readFeeds(M.path, 'i-10-items');
            // the item's link, followed the way a feed reader opens it
            const atomItem = out.feeds1.atom.summary && out.feeds1.atom.summary.items.find((i) => /Rich article/.test(i.title || ''));
            if (atomItem) {
                const link = (atomItem.link || [])[0];
                const st = await go(app.url(strip(link)));
                out.linkLanding = {link: strip(link), status: st, url: strip(page.url()), h1: await page.locator('h1').allInnerTexts().catch(() => [])};
                await snap('i-11-item-link-landing', {landing: out.linkLanding}, {png: true});
            }
            // a later version, not yet published, with its own title; then published
            if (!S.v2) {
                await as(mg(M), M.path);
                await openPubPage(M.path, sid, pub, 'Title & Abstract');
                const nv = await createNewVersion('i-12-new-version');
                out.newVersion = nv;
                if (nv.newPub) {
                    S.v2 = nv.newPub; save();
                    await openPubPage(M.path, sid, nv.newPub, 'Title & Abstract');
                    out.v2Title = await typeRich('titleAbstract-title-control-en', `Rich article v2 ${S.t}`, {replace: true});
                    out.v2Save = await pressPubSave('i-13-v2-title-saved');
                }
            }
            await visitor();
            out.feeds2 = await readFeeds(M.path, 'i-14-v2-unpublished');
            if (S.v2 && !S.v2Published) {
                await as(mg(M), M.path);
                await openPubPage(M.path, sid, S.v2, 'Title & Abstract');
                out.v2Publish = await publishNow('i-15-v2-published');
                S.v2Published = out.v2Publish.status; save();
            }
            await visitor();
            out.feeds3 = await readFeeds(M.path, 'i-16-v2-published');
            const pick = (fs_) => Object.fromEntries(Object.entries(fs_).map(([k, v]) => [k, v.summary ? v.summary.items.filter((i) => /Rich article/.test(i.title || '')) : v.bodyHead]));
            fact('items', {contrib: out.contrib, pagesSave: out.pagesSave, ompTerms: out.kw && [out.kw, out.subj, out.disc, out.ompTermsSave], linkLanding: out.linkLanding, newVersion: out.newVersion, v2Save: out.v2Save, v2Publish: out.v2Publish,
                rich1: pick(out.feeds1), rich2: pick(out.feeds2), rich3: pick(out.feeds3)});
        });

        // ============================================================ list: td2, Rule 3 (+ td1's signed-in reader)
        if (on('list')) await sect('list', async () => {
            const out = {};
            await visitor();
            out.l0 = await readFeeds(M.path, 'l-00-before');
            await as(`${M.path}rd`, M.path);
            out.readerAtom = await readFeed(feedUrl(M.path, 'atom'), 'l-01-reader-signed-in-atom');
            await visitor();
            out.visitorAtom = await readFeed(feedUrl(M.path, 'atom'), 'l-02-visitor-atom');
            const norm = (f) => JSON.stringify(f.summary);
            out.readerSame = norm(out.readerAtom) === norm(out.visitorAtom);
            await as(mg(M), M.path);
            if (!S.retracted) {
                await openPubPage(M.path, S.subs.retract, S.pubs.retract, 'Title & Abstract');
                out.unpublish = await unpublishNow('l-03-retract-unpublished');
                S.retracted = out.unpublish.status; save();
            }
            await visitor();
            out.l1 = await readFeeds(M.path, 'l-04-after-unpublish');
            await as(mg(M), M.path);
            // before the on-screen publish: a licence (Distribution › License) and DOIs (Distribution › DOIs), so the newly published item carries both
            if (!S.licDoi) {
                const o = {};
                await openSettingsTab(M.path, 'distribution', 'License');
                const lic = page.locator('input[name="licenseUrl"][value*="by/4.0"]').first();
                o.licenseOptions = await page.locator('input[name="licenseUrl"]').evaluateAll((els) => els.map((e) => e.value)).catch(() => []);
                if (await lic.count()) { await lic.check({force: true}).catch((e) => { o.licErr = String(e.message).slice(0, 120); }); o.licenseSave = await saveVue(page.locator('input[name="licenseUrl"]').first(), 'l-10-license-url-saved'); }
                await openSettingsTab(M.path, 'distribution', 'DOIs');
                await snap('l-11-dois-tab', {}, {png: true});
                const en = page.getByRole('checkbox', {name: /Enable DOIs|DOIs/}).first();
                o.enableBox = await en.count() ? await en.isChecked().catch(() => null) : 'none';
                if (o.enableBox === false) { await en.check().catch(() => {}); await sleep(800); }
                const prefix = page.locator('input[name="doiPrefix"]').first();
                if (await prefix.count()) { await prefix.fill('10.1234'); o.doiSave = await saveVue(prefix, 'l-12-dois-saved'); } else o.doiSave = 'no prefix box';
                o.doiFields = await page.locator('[role="tabpanel"]:visible .pkpFormField').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
                S.licDoi = o; save();
                fact('list-license-doi', o);
            }
            if (!S.pendingPublished) {
                await openPubPage(M.path, S.subs.pending, S.pubs.pending, 'Title & Abstract');
                await snap('l-05-pending-publication-page', {}, {png: true});
                out.publish = await publishNow('l-06-pending-published');
                S.pendingPublished = out.publish.status; save();
            }
            await visitor();
            out.l2 = await readFeeds(M.path, 'l-07-after-publish');
            out.statuses = db(`select s.submission_id, s.status, p.date_published, s.last_modified from submissions s join publications p on p.publication_id=s.current_publication_id where s.context_id=${M.id} order by s.last_modified desc`);
            fact('list', {readerSame: out.readerSame, unpublish: out.unpublish, publish: out.publish, statuses: out.statuses,
                l0: Object.fromEntries(FEEDS.map((k) => [k, out.l0[k].itemTitles])), l1: Object.fromEntries(FEEDS.map((k) => [k, out.l1[k].itemTitles])), l2: Object.fromEntries(FEEDS.map((k) => [k, out.l2[k].itemTitles]))});
        });

        // ============================================================ order: td3, Rule 4 (number 30 → 1)
        if (on('order')) await sect('order', async () => {
            const out = {};
            await visitor();
            out.o0 = await readFeeds(O.path, 'o-00-default-number');
            out.lm = db(`select s.submission_id, p.date_published, s.last_modified from submissions s join publications p on p.publication_id=s.current_publication_id where s.context_id=${O.id} order by s.last_modified desc`);
            await as(mg(O), O.path);
            out.set1 = await setWindow(O.path, {recentItems: 1}, 'o-01-number-1');
            await visitor();
            out.o1 = await readFeeds(O.path, 'o-02-number-1');
            fact('order', {lastModified: out.lm, o0: Object.fromEntries(FEEDS.map((k) => [k, {titles: out.o0[k].itemTitles, dates: out.o0[k].summary && out.o0[k].summary.items.map((i) => [i.updated || i.pubDate || i.date, i.published])}])), o1: Object.fromEntries(FEEDS.map((k) => [k, out.o1[k].itemTitles]))});
        });

        // ============================================================ cap: 31 items at the default number (Rule 4's other end)
        if (on('cap')) await sect('cap', async () => {
            await visitor();
            const c = await readFeeds(C.path, 'k-00-31-items');
            fact('cap', Object.fromEntries(FEEDS.map((k) => [k, {n: c[k].itemTitles && c[k].itemTitles.length, first: c[k].itemTitles && c[k].itemTitles[0], last: c[k].itemTitles && c[k].itemTitles.slice(-1)[0], missing: c[k].itemTitles && Array.from({length: 31}, (_, i) => `Cap ${String(i + 1).padStart(2, '0')}`).filter((x) => !c[k].itemTitles.some((tt) => tt.startsWith(x)))}])));
        });

        // ============================================================ republish: the cut item ("Cap 01") unpublished and published again on screen —
        // does a publish count as the item's "last change" (Rule 4)?
        if (on('republish')) await sect('republish', async () => {
            const out = {};
            const sid = S.subs.cap01;
            const lm = () => db(`select s.last_modified, p.last_modified, p.date_published, s.status from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id=${sid}`);
            out.before = lm();
            await as(mg(C), C.path);
            await openPubPage(C.path, sid, S.pubs.cap01, 'Title & Abstract');
            out.unpublish = await unpublishNow('k-01-cap01-unpublished');
            out.afterUnpublish = lm();
            await sleep(1500);
            out.publish = await publishNow('k-02-cap01-republished');
            out.afterPublish = lm();
            await visitor();
            const f = await readFeeds(C.path, 'k-03-after-republish');
            fact('republish', {before: out.before, afterUnpublish: out.afterUnpublish, afterPublish: out.afterPublish, unpublish: out.unpublish && out.unpublish.status, publish: out.publish && out.publish.status,
                feeds: Object.fromEntries(FEEDS.map((k) => [k, {n: f[k].itemTitles && f[k].itemTitles.length, first: f[k].itemTitles && f[k].itemTitles[0], cap01At: f[k].itemTitles && f[k].itemTitles.findIndex((x) => x.startsWith('Cap 01'))}]))});
        });

        // ============================================================ extra: a second listed contributor (RSS 2.0's separator); an item with its abstract emptied (no summary)
        if (on('extra')) await sect('extra', async () => {
            const out = {};
            await as(mg(M), M.path);
            if (!S.thirdAdded) {
                out.third = await addContributor(M.path, S.subs.rich, S.v2 || S.pubs.rich, {given: 'Cara', family: 'Listed', email: `cara${S.t}@mail.test`, inLists: true}, 'x-01-third-contributor');
                S.thirdAdded = out.third.status; save();
            }
            await visitor();
            const f1 = await readFeeds(M.path, 'x-02-three-contributors');
            out.rich = Object.fromEntries(FEEDS.map((k) => [k, f1[k].summary && f1[k].summary.items.filter((i) => /Rich article/.test(i.title || '')).map((i) => i.authors || i.creator || i.creators)]));
            // the abstract emptied on "Title & Abstract" (C's "Cap 31", the first item listed), identifiers unticked
            await as(mg(C), C.path);
            if (!S.abstractEmptied) {
                await openPubPage(C.path, S.subs.cap31, S.pubs.cap31, 'Title & Abstract');
                const cleared = await typeRich('titleAbstract-abstract-control-en', '', {replace: true});
                out.abstractSave = await pressPubSave('x-03-abstract-emptied');
                out.abstractCleared = cleared.after;
                await page.reload(); await idle(page); await sleep(1500);
                out.abstractAfterReload = await page.evaluate(() => { const ed = window.tinymce && window.tinymce.editors && [...window.tinymce.editors].find((e) => /abstract-control-en/.test(e.id)); return ed ? ed.getContent() : 'no editor'; }).catch(() => null);
                await snap('x-04-abstract-after-reload', {abstractAfterReload: out.abstractAfterReload});
                S.abstractEmptied = out.abstractSave.status; save();
            }
            out.dbAbstract = db(`select locale, setting_value from publication_settings where publication_id=${S.pubs.cap31} and setting_name='abstract'`);
            await visitor();
            const f2 = await readFeeds(C.path, 'x-05-no-abstract');
            out.cap31 = Object.fromEntries(FEEDS.map((k) => [k, f2[k].summary && f2[k].summary.items.filter((i) => /^Cap 31/.test(i.title || '')).map((i) => ({summary: i.summary === undefined ? 'absent' : i.summary, description: i.description === undefined ? 'absent' : i.description}))]));
            out.cap31Raw = (f2.rss2.bodyHead || '').length ? null : null;
            fact('extra', out);
        });

        // ============================================================ noabs (OJS, OPS): a section that does not require abstracts, so the abstract can be emptied on screen
        if (on('noabs') && !isOMP) await sect('noabs', async () => {
            const out = {};
            if (!S.Q) {
                const p = `${S.t}q`;
                const r = await app.api.createContext({tag: p, users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author']}],
                    sections: [{abbrev: isOJS ? 'ART' : 'PRE', title: 'No Abstract Section', abstractsNotRequired: true}], context: {name: `K1 Q ${S.t}`}});
                S.Q = {path: r.path, id: r.contextId}; save();
                await seedSub('Q', 'qa', {title: `Abstract-less ${S.t}`, published: true, datePublished: '2024-05-05'});
            }
            const Q = S.Q;
            await as(mg(Q), Q.path);
            if (!S.qEmptied) {
                await openPubPage(Q.path, S.subs.qa, S.pubs.qa, 'Title & Abstract');
                await typeRich('titleAbstract-abstract-control-en', '', {replace: true});
                out.save = await pressPubSave('q-01-abstract-emptied');
                S.qEmptied = out.save.status; save();
            }
            out.db = db(`select locale, setting_value from publication_settings where publication_id=${S.pubs.qa} and setting_name='abstract'`);
            await visitor();
            const f = await readFeeds(Q.path, 'q-02-no-abstract');
            out.items = Object.fromEntries(FEEDS.map((k) => [k, {hasSummaryTag: /<(summary|description)[\s>]/.test((f[k].summary && JSON.stringify(f[k].summary.items)) || '') , items: f[k].summary && f[k].summary.items.map((i) => ({title: i.title, summary: i.summary, description: i.description}))}]));
            out.raw = Object.fromEntries(FEEDS.map((k) => [k, /<entry|<item/.test(f[k].bodyHead || '') ? null : null]));
            fact('noabs', out);
        });

        // ============================================================ leave: the tabbed screens this chunk typed into, left once with a change unsaved
        if (on('leave')) await sect('leave', async () => {
            const out = {};
            await as(mg(O), O.path);
            const t0 = Date.now();
            // Distribution › Search Indexing: type, press the "License" tab, come back
            await openSettingsTab(O.path, 'distribution', 'Search Indexing');
            const desc = page.locator('[id^="searchIndexing-searchDescription-control"]').first();
            await desc.fill('K1 unsaved description');
            await page.getByRole('tab', {name: 'License', exact: true}).first().click(); await idle(page); await sleep(700);
            await snap('v-01-distribution-left-to-license', {}, {png: true});
            await page.getByRole('tab', {name: 'Search Indexing', exact: true}).first().click(); await idle(page); await sleep(700);
            out.tabBack = await desc.inputValue().catch(() => null);
            // then leave the page for the dashboard and return
            await go(cu(O.path, '/submissions'));
            await openSettingsTab(O.path, 'distribution', 'Search Indexing');
            out.afterLeave = await page.locator('[id^="searchIndexing-searchDescription-control"]').first().inputValue().catch(() => null);
            await snap('v-02-distribution-after-leave', {facts: out});
            // Journal › Contact: a change, then a reload
            await openSettingsTab(O.path, 'context', 'Contact');
            const sup = page.locator('[id^="contact-supportName-control"]').first();
            await sup.fill('Unsaved Support');
            await sup.blur().catch(() => {});
            await page.reload().catch((e) => { out.reloadErr = String(e.message).slice(0, 120); }); await idle(page);
            await page.getByRole('tab', {name: 'Contact', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(700);
            out.contactAfterReload = await page.locator('[id^="contact-supportName-control"]').first().inputValue().catch(() => null);
            await snap('v-03-contact-after-reload', {facts: out});
            out.dialogs = jsDialogs.filter((d) => d.at >= t0);
            fact('leave', out);
        });

        // ============================================================ isbn (OMP): an ISBN on the book's format, typed on screen
        if (on('isbn') && isOMP) await sect('isbn', async () => {
            const out = {};
            await as(mg(M), M.path);
            await openPubPage(M.path, S.subs.rich, S.v2 || S.pubs.rich, 'Publication Formats');
            await snap('b-01-formats-page', {}, {png: true});
            out.menu = await wf().getByRole('link').allInnerTexts().catch(() => []);
            if (!S.isbnDone) {
                const grid = wf().locator('[id^="component-grid-catalogentry-publicationformatgrid"]').first();
                const row = wf().locator('tr.gridRow').filter({hasText: 'PDF'}).first();
                await row.getByRole('link', {name: 'Settings', exact: true}).first().click();
                await sleep(700);
                const rowId = await row.getAttribute('id');
                out.rowActions = await page.locator(`tr#${rowId} + tr`).getByRole('link').allInnerTexts().then((a) => a.map((x) => x.trim())).catch(() => []);
                await snap('b-02-format-row-actions', {rowActions: out.rowActions}, {png: true});
                const edit = page.locator(`tr#${rowId} + tr`).getByRole('link', {name: /^Edit/}).first();
                await edit.click();
                const d = page.locator('[role="dialog"]:visible').last();
                await d.getByRole('tab').first().waitFor({timeout: T}).catch(() => {});
                await idle(page); await sleep(800);
                out.tabs = await d.getByRole('tab').allInnerTexts().catch(() => []);
                await snap('b-03-format-edit-window', {tabs: out.tabs}, {png: true});
                const codes = d.getByRole('tab', {name: /Identification Code|^Metadata$/}).first();
                if (await codes.count()) {
                    await codes.click(); await idle(page); await sleep(900);
                    await snap('b-04-identification-codes-tab', {}, {png: true});
                    const add = page.locator('[role="dialog"]:visible').last().getByRole('link', {name: /Add Code|Add Identification/}).first();
                    out.metadataLinks = await page.locator('[role="dialog"]:visible').last().getByRole('link').allInnerTexts().catch(() => []);
                    out.addOffered = await add.count();
                    if (out.addOffered) {
                        await add.click(); await sleep(1200); await idle(page);
                        const f = page.locator('form#identificationCodeForm, form[id*="dentificationCode"]').last();
                        await f.waitFor({timeout: T}).catch(() => {});
                        const sel = f.locator('select').first();
                        out.codeOptions = await sel.locator('option').allInnerTexts().catch(() => []);
                        const isbn13 = out.codeOptions.find((o) => /^ISBN-13/.test(o.trim()));
                        if (isbn13) await sel.selectOption({label: isbn13});
                        await f.locator('input[name="value"]').fill('9780306406157');
                        await snap('b-05-code-form', {codeOptions: out.codeOptions}, {png: true});
                        const r = page.waitForResponse((x) => x.request().method() === 'POST' && /identification-code/i.test(x.url()), {timeout: T}).catch(() => null);
                        await f.getByRole('button', {name: /^(Save|OK)$/}).first().click();
                        const resp = await r;
                        out.codeSave = resp ? resp.status() : null;
                        await sleep(1200); await idle(page);
                        await snap('b-06-code-saved', {codeSave: out.codeSave}, {png: true});
                    }
                }
                S.isbnDone = true; save();
            }
            out.dbCodes = db(`select ic.code, ic.value, pf.publication_id from identification_codes ic join publication_formats pf on pf.publication_format_id=ic.publication_format_id where pf.publication_id in (${S.pubs.rich}, ${S.v2 || 0})`);
            fact('isbn', out);
        });

        // ============================================================ identon: td8 ticked
        if (on('identon')) await sect('identon', async () => {
            await as(mg(M), M.path);
            const w = await setWindow(M.path, {includeIdentifiers: true}, 'd-01-identifiers-on');
            await visitor();
            const f = await readFeeds(M.path, 'd-02-identifiers-on');
            fact('identon', {window: {post: w.post, notices: w.notices}, items: Object.fromEntries(FEEDS.map((k) => [k, f[k].summary && f[k].summary.items.map((i) => ({title: i.title, summary: i.summary || i.description, terms: i.terms}))]))});
        });

        // ============================================================ french: td9, Rule 10 — the language menu, then "Atom logo" in the box
        if (on('french')) await sect('french', async () => {
            const out = {};
            await visitor();
            out.homeEn = await home(M.path, 'r-01-home-en');
            const fr = page.locator('a').filter({hasText: /^\s*fran[cç]ais/i}).first();
            await loc(page, 'sidebar Language block: the "français" link', fr);
            if (await fr.count()) {
                if (!(await fr.isVisible().catch(() => false))) { const menu = page.getByRole('button', {name: /English|Language/}).first(); if (await menu.count()) await menu.click().catch(() => {}); await sleep(400); }
                out.frHref = strip(await fr.getAttribute('href').catch(() => null));
                await fr.click().catch((e) => { out.frClickErr = String(e.message).slice(0, 150); });
                await idle(page);
                out.afterFrClick = {url: strip(page.url()), title: await page.title().catch(() => null)};
                await snap('r-01b-after-francais-click', {afterFrClick: out.afterFrClick}, {png: true});
                // on the fleet the block's link lands on the site's page (its "source" lacks the port): back to the journal, whose pages are now French
                if (!page.url().includes(`/${M.path}`)) await go(cu(M.path));
            }
            out.homeFr = {url: strip(page.url()), ...(await page.evaluate(() => ({lang: document.documentElement.lang, box: (() => { const b = document.querySelector('.block_web_feed'); return b ? {heading: b.querySelector('h2')?.innerText.trim(), links: [...b.querySelectorAll('a')].map((a) => ({href: a.getAttribute('href'), alt: a.querySelector('img')?.getAttribute('alt')}))} : null; })()})).catch(() => ({})))};
            await snap('r-02-home-fr', {homeFr: out.homeFr}, {png: true});
            const boxLinks = page.locator('.block_web_feed a');
            out.atomFromBox = await readFeed(null, 'r-03-fr-atom-from-box', {click: boxLinks.nth(0)});
            await go(page.url().includes('gateway') ? cu(M.path) : page.url());
            await home(M.path, 'r-04-home-again');
            out.rss2FromBox = await readFeed(null, 'r-05-fr-rss2-from-box', {click: page.locator('.block_web_feed a').nth(1)});
            out.addr = await readFeeds(M.path, 'r-06-fr-address', {locale: 'fr_CA'});
            // back to English for the next reads
            await go(cu(M.path, '/en'));
            fact('french', {homeEn: out.homeEn && {box: out.homeEn.box, lang: out.homeEn.lang}, frHref: out.frHref, afterFrClick: out.afterFrClick, homeFr: out.homeFr, frClickErr: out.frClickErr,
                atomFromBox: {href: out.atomFromBox.href, finalUrl: out.atomFromBox.finalUrl, status: out.atomFromBox.status, channel: out.atomFromBox.summary && out.atomFromBox.summary.channel, items: out.atomFromBox.summary && out.atomFromBox.summary.items.map((i) => ({title: i.title, summary: i.summary, terms: i.terms}))},
                rss2FromBox: {href: out.rss2FromBox.href, finalUrl: out.rss2FromBox.finalUrl, status: out.rss2FromBox.status, channel: out.rss2FromBox.summary && out.rss2FromBox.summary.channel, items: out.rss2FromBox.summary && out.rss2FromBox.summary.items.map((i) => ({title: i.title, description: i.description, terms: i.terms, creator: i.creator}))},
                addrRss: out.addr.rss.summary && {channel: out.addr.rss.summary.channel, items: out.addr.rss.summary.items.map((i) => i.title)}});
        });

        // ============================================================ identoff: td8 unticked again
        if (on('identoff')) await sect('identoff', async () => {
            await as(mg(M), M.path);
            const w = await setWindow(M.path, {includeIdentifiers: false}, 'd-03-identifiers-off');
            await visitor();
            const f = await readFeeds(M.path, 'd-04-identifiers-off');
            fact('identoff', {window: {post: w.post, notices: w.notices}, items: Object.fromEntries(FEEDS.map((k) => [k, f[k].summary && f[k].summary.items.map((i) => ({title: i.title, summary: i.summary || i.description, terms: i.terms}))]))});
        });

        // ============================================================ issue (OJS): td4, Rule 5; the no-issue end (A1's second case)
        if (on('issue') && isOJS) await sect('issue', async () => {
            const out = {};
            await as(mg(M), M.path);
            out.setM = await setWindow(M.path, {recentItems: 1, displayItems: 'issue'}, 'u-01-current-issue-number-1');
            await visitor();
            out.feedsM = await readFeeds(M.path, 'u-02-current-issue');
            const st = await go(cu(M.path, '/issue/current'));
            out.toc = {status: st, url: strip(page.url()), titles: await page.locator('.obj_article_summary .title, .cmp_article_list .title').allInnerTexts().then((a) => a.map((x) => flat(x, 120))).catch(() => []), sections: await page.locator('.section h2, .sections h2').allInnerTexts().catch(() => [])};
            await snap('u-03-current-issue-toc', {toc: out.toc}, {png: true});
            await as(mg(O), O.path);
            out.setO = await setWindow(O.path, {displayItems: 'issue'}, 'u-04-no-issue-current-issue');
            await visitor();
            out.feedsO = await readFeeds(O.path, 'u-05-no-published-issue');
            out.issues = db(`select issue_id, volume, number, published, date_published from issues where journal_id=${M.id}`) + ' / current: ' + db(`select current_issue_id from journals where journal_id=${M.id}`);
            fact('issue', {setM: {post: out.setM.post, reopened: out.setM.reopened && {radios: out.setM.reopened.radios, text: out.setM.reopened.text}}, toc: out.toc, issues: out.issues,
                m: Object.fromEntries(FEEDS.map((k) => [k, {titles: out.feedsM[k].itemTitles, channelDate: out.feedsM[k].summary && (out.feedsM[k].summary.channel.updated || out.feedsM[k].summary.channel.pubDate)}])),
                o: Object.fromEntries(FEEDS.map((k) => [k, {status: out.feedsO[k].status, n: out.feedsO[k].itemTitles && out.feedsO[k].itemTitles.length, head: out.feedsO[k].status >= 400 ? flat(out.feedsO[k].bodyHead, 200) : undefined}]))});
        });

        // ============================================================ issue2 (OJS): a clean issue (two seeded articles, two sections, no later version): feed order against the table of contents
        if (on('issue2') && isOJS) await sect('issue2', async () => {
            const out = {};
            if (!S.R) {
                const p = `${S.t}r`;
                const r = await app.api.createContext({tag: p, users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author']}],
                    sections: [{abbrev: 'ART', title: 'Articles'}, {abbrev: 'SEC', title: 'Second Section'}], issues: [{volume: 2, number: 1, year: 2024, published: true}], context: {name: `K1 R ${S.t}`}});
                S.R = {path: r.path, id: r.contextId}; save();
                await seedSub('R', 'r1', {title: `R first ART ${S.t}`, published: true, section: 'ART', issue: {volume: 2, number: 1, year: 2024}});
                await seedSub('R', 'r2', {title: `R second SEC ${S.t}`, published: true, section: 'SEC', issue: {volume: 2, number: 1, year: 2024}});
                await seedSub('R', 'r3', {title: `R third ART ${S.t}`, published: true, section: 'ART', issue: {volume: 2, number: 1, year: 2024}});
            }
            const R = S.R;
            await as(mg(R), R.path);
            out.set = await setWindow(R.path, {displayItems: 'issue'}, 'u-10-clean-issue-current-issue');
            await visitor();
            const f = await readFeeds(R.path, 'u-11-clean-issue-feeds');
            const st = await go(cu(R.path, '/issue/current'));
            out.toc = {status: st, titles: await page.locator('.obj_article_summary .title').allInnerTexts().then((a) => a.map((x) => flat(x, 120))).catch(() => []), sections: await page.locator('.section h2').allInnerTexts().catch(() => [])};
            await snap('u-12-clean-issue-toc', {toc: out.toc}, {png: true});
            out.seq = db(`select p.submission_id, p.seq, p.section_id, p.issue_id from publications p join submissions s on s.current_publication_id=p.publication_id where s.context_id=${R.id} order by p.seq, p.submission_id`);
            fact('issue2', {toc: out.toc, seq: out.seq, feeds: Object.fromEntries(FEEDS.map((k) => [k, f[k].itemTitles]))});
        });

        // ============================================================ parity: the `plugins` key's stored rows against the window's
        if (on('parity')) await sect('parity', async () => {
            fact('parity', {fresh: pluginRows(F.path), pluginKey: S.P ? pluginRows(S.P.path) : 'no P', windowSaved: pluginRows(O.path), main: pluginRows(M.path), publicknowledge: pluginRows(app.contextPath)});
            if (S.P) {
                await as(mg(S.P), S.P.path);
                const w = await openWindow(S.P.path);
                await snap('p-01-plugin-key-window', {window: w}, {png: true});
                await closeWin();
                fact('parity-window', {radios: w.radios, text: w.text, boxes: w.boxes});
            }
        });
        fact('dialogs', jsDialogs);
    } finally {
        await close();
    }
});
