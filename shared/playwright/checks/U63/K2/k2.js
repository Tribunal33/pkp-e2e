// U63 claim check, chunk K2: the Native XML Plugin (its tabs and Filters, importing, the export list, Select All,
// exporting and the one download, issues {OJS}, the press's ONIX reminder {OMP}, what the file carries), the side
// effects "An import adds" and "Exports change nothing", Settings 7 and OMP2.
// Spec docs/specs/U63-import-export.md: 58–73, 151–234, 359–363, 370–371, 397–402, 582–591; footnotes e–j,
// td5–td12, td18, f-omp2.
//
//   PROBE_FEATURE=U63 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U63/K2/k2.js
//   PHASES=seed,tabs,... (default all, in order; state in k2-state-<app>.json in the output folder, delete it for a
//   fresh seed).
//
// Scratch contexts per app: A (the source: five submissions in five states, OJS two issues), B (import target, empty
// until the import phase), C (failed and problem imports), P (101 submissions, the list's second page), O {OMP} (the
// ONIX details filled). `publicknowledge` is only read (td11's issue list and an issue export, which writes nothing
// but a temporary file). No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, record, loc, note, idle, tag, outDir, screen} = require('../../../probe');
const G = require('../../U62/K1/grid');
const {sleep, flat, rel, DENIED, snap, tabStrips} = G;

const ALL = ['seed', 'tabs', 'upload', 'nofile', 'notxml', 'list', 'selectall', 'page2', 'export', 'versions', 'issues', 'pkissues', 'import', 'importissue', 'failed', 'problems', 'onix', 'leave'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k2]', new Date().toISOString().slice(11, 19), ...a);
const statePath = (app) => path.join(outDir(), `k2-state-${app.name}.json`);
const filePath = (app, name) => path.join(outDir(), `${name}-${app.name}.xml`);

/** innerText of the first match, or null at once when there is none. */
async function quick(locator, fn = 'innerText') {
    if (!(await locator.count().catch(() => 0))) return null;
    return locator.first()[fn]({timeout: 3000}).catch(() => null);
}

/** A native XML file read as data: roots, submissions with their parts. */
function readXml(xml) {
    if (!xml) return null;
    const m = (re) => (xml.match(re) || []).length;
    const titles = [...xml.matchAll(/<title locale="[^"]*">([^<]*)<\/title>/g)].map((x) => x[1]);
    const root = (xml.match(/<(\w+)[^>]*xmlns="http:\/\/pkp\.sfu\.ca"/) || [])[1] || null;
    return {
        bytes: xml.length,
        root,
        submissions: m(/<(article|monograph|preprint)\s[^>]*date_submitted|<(article|monograph|preprint) xmlns|<(article|monograph|preprint)\s[^>]*status=/g),
        submissionTags: [...xml.matchAll(/<(article|monograph|preprint)(\s[^>]*)?>/g)].map((x) => flat(x[0], 200)),
        publications: [...xml.matchAll(/<publication(\s[^>]*)?>/g)].map((x) => flat(x[0], 300)),
        titles,
        authors: [...xml.matchAll(/<author\s[^>]*>[\s\S]*?<givenname[^>]*>([^<]*)<\/givenname>[\s\S]*?(?:<familyname[^>]*>([^<]*)<\/familyname>)?/g)].map((x) => `${x[1]} ${x[2] || ''}`.trim()),
        submissionFiles: m(/<submission_file\s/g),
        embeds: m(/<embed\s/g),
        hrefs: m(/<href\s/g),
        galleys: m(/<article_galley\s|<preprint_galley\s/g),
        publicationFormats: m(/<publication_format\s/g),
        issues: [...xml.matchAll(/<issue_identification>([\s\S]*?)<\/issue_identification>/g)].map((x) => flat(x[1].replace(/<[^>]+>/g, ' '), 120)),
        issueRoots: m(/<issue\s[^>]*(xmlns|published)/g),
        ids: [...xml.matchAll(/<id type="([^"]*)"[^>]*>([^<]*)<\/id>/g)].map((x) => `${x[1]}=${x[2]}`).slice(0, 20),
        citations: m(/<citation>/g),
        sectionRefs: [...xml.matchAll(/section_ref="([^"]*)"/g)].map((x) => x[1]),
        series: [...xml.matchAll(/<series[\s>][\s\S]*?<\/series>/g)].map((x) => flat(x[0], 300)),
        head: flat(xml.slice(0, 600), 600),
    };
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k2-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 4000)); };
    let {page, close, context} = await launch(app);
    page.setDefaultTimeout(15_000);
    const browserDialogs = [];
    let dialogAnswer = 'dismiss';
    const attachDialogs = (p) => p.on('dialog', (d) => {
        browserDialogs.push({type: d.type(), message: flat(d.message(), 300), url: rel(p.url())});
        (d.type() === 'beforeunload' || dialogAnswer === 'accept' ? d.accept() : d.dismiss()).catch(() => {});
    });
    attachDialogs(page);
    const as = async (user, ctx) => { await signIn(page, user, {contextPath: ctx}); await idle(page).catch(() => {}); };
    const out = async () => { await signOut(page).catch(() => {}); };
    const sect = async (name, fn) => { if (!on(name)) return; log(app.name, '== phase', name); try { await fn(); } catch (e) { log(app.name, 'phase FAILED', name, flat(e.stack, 900)); fact(`${name}-error`, flat(e.stack, 900)); await snap(page, `err-${name}`).catch(() => {}); } save(); };
    const go = async (u) => { let r = null; try { r = await page.goto(app.url(u)); } catch (e) { r = flat(e.message, 100); } await idle(page).catch(() => {}); return r; };
    const cu = (ctx, p) => `/index.php/${ctx}${p}`;
    const NATIVE = '/management/importexport/plugin/NativeImportExportPlugin';
    const exportTabName = isOJS ? 'Export Articles' : isOMP ? 'Export' : 'Export Preprints';
    const exportBtnName = isOJS ? 'Export Articles' : isOMP ? 'Export Submissions' : 'Export Preprints';
    const importResultsName = isOMP ? 'Results' : 'Import Results';

    /** Open the Native page of ctx; returns status and tabs. */
    const openNative = async (ctx) => {
        const r = await go(cu(ctx, NATIVE));
        await page.locator('#importExportTabs').waitFor({timeout: 15_000}).catch(() => {});
        return {status: r && r.status ? r.status() : r, url: rel(page.url()), tabs: await tabStrips(page)};
    };
    const tabsNow = async () => page.locator('#importExportTabs > ul [role="tab"], #importExportTabs [role="tablist"] > [role="tab"]').evaluateAll((ts) => ts.map((t) => ({text: t.innerText.trim(), selected: t.getAttribute('aria-selected') === 'true', controls: t.getAttribute('aria-controls')}))).catch(() => []);
    const panelText = async () => flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerText().catch(() => null), 3000);

    /** The export list on the export tab, as data. */
    const exportTab = () => page.locator('#exportSubmissions-tab');
    const readExportList = async () => {
        const t = exportTab();
        return t.evaluate((el) => {
            const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const vis = (e) => !!(e && e.offsetParent !== null);
            const items = [...el.querySelectorAll('.listPanel__item')].map((li) => {
                const box = li.querySelector('input[type=checkbox]');
                const a = li.querySelector('a');
                return {text: txt(li), checked: box ? box.checked : null, value: box ? box.value : null, view: a ? {text: txt(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')} : null};
            });
            const header = el.querySelector('.listPanel__header');
            const buttons = [...el.querySelectorAll('button, a.pkpButton')].filter(vis).map((b) => ({text: txt(b), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true' || b.classList.contains('-disabled')}));
            const pagination = el.querySelector('.pkpPagination, nav[aria-label*="agination" i]');
            return {
                title: txt(el.querySelector('.listPanel__title, .pkpHeader__title, h2, h3')),
                header: txt(header),
                items,
                count: items.length,
                checked: items.filter((i) => i.checked).length,
                buttons,
                pagination: pagination ? {text: txt(pagination), links: [...pagination.querySelectorAll('a,button')].map((b) => `${txt(b) || ''}|${b.getAttribute('aria-label') || ''}${b.getAttribute('aria-current') ? '*' : ''}${b.disabled ? '(disabled)' : ''}`)} : null,
                empty: txt(el.querySelector('.listPanel__empty, .pkpListPanel__empty')),
                search: [...el.querySelectorAll('input[type=search], input[type=text]')].map((i) => ({name: i.name, value: i.value, placeholder: i.placeholder, label: i.getAttribute('aria-label') || (i.id && document.querySelector(`label[for="${i.id}"]`) ? document.querySelector(`label[for="${i.id}"]`).innerText.trim() : null)})),
                filtersOpen: vis(el.querySelector('.listPanel__sidebar')),
                filterPanel: txt(el.querySelector('.listPanel__sidebar')),
                activeFilters: [...el.querySelectorAll('.listPanel__sidebar .pkpFilter:not(.pkpFilter--disabled)')].map(txt),
                text: txt(el).slice(0, 3000),
            };
        }).catch((e) => ({error: flat(e.message, 200)}));
    };
    const openExportTab = async () => {
        await page.getByRole('tab', {name: exportTabName, exact: true}).first().click();
        await idle(page).catch(() => {});
        await exportTab().locator('.listPanel__item, .listPanel__empty, .pkpListPanel__empty').first().waitFor({timeout: 15_000}).catch(() => {});
        await idle(page).catch(() => {});
    };
    /** Wait until the export list shows n items or the empty line, reading twice for stability. */
    const listSettle = async () => {
        let last = -1;
        for (let i = 0; i < 30; i++) {
            const n = await exportTab().locator('.listPanel__item').count().catch(() => 0);
            if (n === last) break;
            last = n; await sleep(300);
        }
        await idle(page).catch(() => {});
    };

    /** Upload a file into the import box; returns what the box shows then. */
    const uploadImport = async (file) => {
        const o = {};
        const inp = page.locator('#importXmlForm input[type=file]');
        o.inputs = await inp.count();
        const upResp = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: 30_000}).catch(() => null);
        await inp.first().setInputFiles(file);
        const r = await upResp;
        o.uploadStatus = r ? r.status() : 'no request';
        o.uploadBody = r ? flat(await r.text().catch(() => null), 400) : null;
        await idle(page).catch(() => {});
        await sleep(400);
        o.temporaryFileId = await page.locator('#importXmlForm #temporaryFileId, #importXmlForm input[name=temporaryFileId]').first().inputValue().catch(() => null);
        o.box = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 600);
        o.buttons = await page.locator('#importXmlForm').getByRole('button').allInnerTexts().catch(() => []);
        return o;
    };
    /** Press "Import"; waits for a new results tab and its text. */
    const pressImport = async () => {
        const o = {};
        const before = await tabsNow();
        o.tabsBefore = before.map((t) => t.text);
        const reqs = [];
        const onReq = (r) => { if (/importBounce|\/import(\?|$)|plugin\/NativeImportExportPlugin\/import/.test(r.url())) reqs.push(`${r.method()} ${rel(r.url()).replace(/csrfToken=[^&]+/, 'csrf')}`); };
        page.on('request', onReq);
        const resps = [];
        const onResp = (r) => { if (/NativeImportExportPlugin\/(importBounce|import)/.test(r.url())) resps.push({url: rel(r.url()).replace(/csrfToken=[^&]+/, 'csrf').slice(0, 200), status: r.status()}); };
        page.on('response', onResp);
        await page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}).click();
        // results come by AJAX into a new tab
        for (let i = 0; i < 60; i++) {
            await sleep(500);
            const now = await tabsNow();
            if (now.length > before.length) {
                const txt = await panelText();
                if (txt && /completed|failed|error|warning|imported/i.test(txt)) break;
            }
            if (i === 12 && (await tabsNow()).length === before.length) break; // nothing added after 6 s
        }
        await idle(page).catch(() => {});
        await sleep(500);
        page.off('request', onReq); page.off('response', onResp);
        o.requests = reqs; o.responses = resps;
        const after = await tabsNow();
        o.tabsAfter = after.map((t) => `${t.text}${t.selected ? '*' : ''}`);
        o.added = after.length - before.length;
        o.panel = await panelText();
        o.box = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 400);
        o.formErrors = await page.locator('#importXmlForm .error, #importXmlForm .pkp_form_error, #importXmlForm label.error, .pkp_notification').allInnerTexts().catch(() => []);
        return o;
    };

    /** On the export tab: tick items whose text includes any of the words, press the export button, read the tab, download. */
    const doExport = async (words, name, {download = true, second = false} = {}) => {
        const o = {};
        await openExportTab();
        await listSettle();
        const items = exportTab().locator('.listPanel__item');
        const n = await items.count();
        o.listCount = n;
        o.ticked = [];
        for (let i = 0; i < n; i++) {
            const it = items.nth(i);
            const t = flat(await it.innerText().catch(() => ''), 200);
            if (words.some((w) => t.includes(w))) { await it.locator('input[type=checkbox]').check(); o.ticked.push(t); }
        }
        const before = await tabsNow();
        await exportTab().getByRole('button', {name: exportBtnName, exact: true}).click();
        for (let i = 0; i < 40; i++) {
            await sleep(500);
            if ((await tabsNow()).length > before.length) {
                const txt = await panelText();
                if (txt && /completed|failed|error|Download/i.test(txt)) break;
            }
            if (i === 12 && (await tabsNow()).length === before.length) break;
        }
        await idle(page).catch(() => {});
        const after = await tabsNow();
        o.tabsAfter = after.map((t) => `${t.text}${t.selected ? '*' : ''}`);
        o.added = after.length - before.length;
        o.panel = await panelText();
        await snap(page, `${name}-results`, {facts: o});
        if (!download) return o;
        const panel = page.locator('#importExportTabs [role="tabpanel"]:visible').first();
        const btn = panel.getByRole('button', {name: 'Download Exported File'});
        o.downloadButtons = await btn.count();
        if (!o.downloadButtons) return o;
        const pressDownload = async (label) => {
            const r = {};
            const dlP = page.waitForEvent('download', {timeout: 20_000}).catch(() => null);
            const respP = page.waitForResponse((x) => /downloadExportFile/.test(x.url()), {timeout: 20_000}).catch(() => null);
            await btn.first().click();
            const [d, resp] = await Promise.all([dlP, respP]);
            r.response = resp ? {status: resp.status(), contentType: resp.headers()['content-type'] || null, disposition: resp.headers()['content-disposition'] || null, url: rel(resp.url()).slice(0, 200)} : null;
            if (resp && !d) r.body = flat(await resp.text().catch(() => null), 400);
            if (d) {
                r.file = d.suggestedFilename();
                const p = await d.path().catch(() => null);
                const xml = p ? fs.readFileSync(p, 'utf8') : '';
                r.bytes = xml.length;
                if (xml) fs.writeFileSync(filePath(app, `${name}-${label}`), xml);
                r.xml = readXml(xml);
            }
            await idle(page).catch(() => {});
            await sleep(500);
            r.urlAfter = rel(page.url());
            r.tabsAfter = (await tabsNow()).map((t) => `${t.text}${t.selected ? '*' : ''}`);
            r.panelAfter = await panelText();
            r.bodyAfter = flat(await page.locator('body').innerText().catch(() => null), 400);
            return r;
        };
        o.first = await pressDownload('first');
        await snap(page, `${name}-after-download`, {facts: o.first});
        if (second) {
            // back on the Native page? a download keeps the page; the second press of the same button
            if (await btn.count()) {
                o.second = await pressDownload('second');
                await snap(page, `${name}-after-second-download`, {facts: o.second});
            } else o.second = {button: 'gone'};
        }
        return o;
    };

    /** A Dashboard read: every view's rows mentioning the text. */
    const dashboardFind = async (ctx, text) => {
        const r = {};
        await go(cu(ctx, '/dashboard/editorial'));
        await sleep(1000); await idle(page).catch(() => {});
        r.url = rel(page.url());
        const nav = page.getByRole('navigation', {name: 'Site Navigation'});
        r.views = await nav.evaluate((n) => [...n.querySelectorAll('[role="treeitem"], a')].map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40)).catch(() => []);
        // the global search, which lists every status
        const gs = nav.getByRole('searchbox').or(nav.locator('input[type=search]')).first();
        if (await gs.count()) {
            await gs.fill(text); await gs.press('Enter');
            await sleep(1500); await idle(page).catch(() => {});
        }
        r.main = flat(await page.locator('main').innerText().catch(() => null), 2500);
        r.rows = await page.locator('main table tbody tr').allInnerTexts().then((a) => a.map((x) => flat(x, 300))).catch(() => []);
        return r;
    };

    /** A fresh scratch context with one manager (for a phase that must start from an empty journal). */
    const freshCtx = async (k) => {
        const n = (S.n = (S.n || 0) + 1);
        const p = `${S.t}${k}${n}`;
        await app.api.createContext({tag: p, context: {name: `U63 K2 ${k.toUpperCase()}${n} ${S.t}`, acronym: `K2${k.toUpperCase()}${n}`.slice(0, 8), contactName: 'K2 Contact', contactEmail: `${p}c@mail.test`, country: 'CA'}, users: [{username: `${p}m`, roles: ['manager'], givenName: 'Fen', familyName: 'Manager'}]});
        save();
        return {path: p, mgr: `${p}m`};
    };
    try {
        // ------------------------------------------------------------ seed
        await sect('seed', async () => {
            if (S.A) return;
            const t = tag('u63k2');
            S.t = t;
            const U = (p, k, roles, g, f) => ({username: `${p}${k}`, roles, givenName: g, familyName: f});
            const mk = async (k, extra = {}) => {
                const p = `${t}${k}`;
                const r = await app.api.createContext({tag: p, context: {name: `U63 K2 ${k.toUpperCase()} ${t}`, acronym: `K2${k.toUpperCase()}`, contactName: 'K2 Contact', contactEmail: `${p}c@mail.test`, country: 'CA'}, ...extra});
                log('seed', k, JSON.stringify(r).slice(0, 400));
                return {path: p, name: `U63 K2 ${k.toUpperCase()} ${t}`, id: r.contextId || r.id || (r.context && r.context.id) || null, resp: r};
            };
            // A: the source
            const aExtra = {users: [U(`${t}a`, 'm', ['manager'], 'Kara', 'Manager'), U(`${t}a`, 'au', ['author'], 'Ada', `Lovelace${t.slice(-4)}`)]};
            if (isOJS) aExtra.issues = [{volume: 7, number: 1, year: 2026, published: true}, {volume: 7, number: 2, year: 2026}];
            S.A = await mk('a', aExtra);
            S.A.mgr = `${t}am`; S.A.au = `${t}aau`;
            const sub = async (C, k, title, extra) => {
                const r = await app.api.createSubmission({tag: `${C.path}${k}`, context: C.path, submitter: C.au, title, ...extra});
                return {id: r.submissionId || r.id, title, stageId: r.stageId, status: r.status};
            };
            const file = isOPS ? {} : {files: [{file: 'article.pdf'}]};
            const pubSpec = isOJS ? {decisions: ['skipExternalReview', 'sendToProduction'], galleys: [{label: 'PDF', file: 'article.pdf'}], published: true, issue: {volume: 7, number: 1, year: 2026}}
                : isOMP ? {decisions: ['skipExternalReview', 'sendToProduction'], publicationFormats: [{name: 'PDF', file: 'article.pdf'}], published: true}
                    : {galleys: [{label: 'PDF', file: 'preprint.pdf'}], published: true};
            S.subs = {};
            S.subs.s1 = await sub(S.A, 's1', `Kestrel submitted ${t}`, {...file});
            if (!isOPS) S.subs.s2 = await sub(S.A, 's2', `Axolotl review ${t}`, {...file, decisions: [isOMP ? 'sendInternalReview' : 'sendExternalReview']});
            S.subs.s3 = await sub(S.A, 's3', `Heron published ${t}`, {...file, ...pubSpec});
            S.subs.s4 = await sub(S.A, 's4', `Marmot declined ${t}`, {...file, decisions: [isOPS ? 'decline' : 'initialDecline']});
            S.subs.s5 = await sub(S.A, 's5', `Newt draft ${t}`, {...file, submitted: false});
            // B: the import target, C: failed and problem imports
            S.B = await mk('b', {users: [U(`${t}b`, 'm', ['manager'], 'Bea', 'Manager')]});
            S.B.mgr = `${t}bm`;
            S.C = await mk('c', {users: [U(`${t}c`, 'm', ['manager'], 'Cy', 'Manager')]});
            S.C.mgr = `${t}cm`;
            if (isOMP) { S.O = await mk('o', {users: [U(`${t}o`, 'm', ['manager'], 'Oona', 'Manager')]}); S.O.mgr = `${t}om`; }
            // P: 101 submissions
            S.P = await mk('p', {users: [U(`${t}p`, 'm', ['manager'], 'Pia', 'Manager'), U(`${t}p`, 'au', ['author'], 'Pat', 'Author')]});
            S.P.mgr = `${t}pm`; S.P.au = `${t}pau`;
            save();
            const t0 = Date.now();
            S.P.ids = [];
            for (let i = 1; i <= 101; i++) {
                const r = await app.api.createSubmission({tag: `${S.P.path}n${i}`, context: S.P.path, submitter: S.P.au, title: `Paged item ${String(i).padStart(3, '0')} ${t}`});
                S.P.ids.push(r.submissionId || r.id);
            }
            S.P.seedMs = Date.now() - t0;
            for (const k of ['A', 'B', 'C', 'P', 'O']) if (S[k]) delete S[k].resp;
            save();
            note(`ccK2 [${app.name}]: scratch contexts A ${S.A.path} (source, 5 submissions${isOJS ? ', issues Vol. 7 No. 1 (2026) published and No. 2 unpublished' : ''}), B ${S.B.path} (import target), C ${S.C.path} (failed/problem imports), P ${S.P.path} (101 submissions)${S.O ? `, O ${S.O.path} (ONIX filled)` : ''}; managers {path}m, submitter {path}au (tag ${t})`);
            fact('seed', {t, A: S.A, subs: S.subs, B: S.B.path, C: S.C.path, P: {path: S.P.path, n: S.P.ids.length, ms: S.P.seedMs}, O: S.O ? S.O.path : null});
        });
        const A = S.A;

        // ------------------------------------------------------------ tabs: Fields table, Rule 7, Filters panel, Rule 19 / OMP2 on a new press, control on the others
        await sect('tabs', async () => {
            const o = {};
            await as(A.mgr, A.path);
            o.open = await openNative(A.path);
            o.tabs = await tabsNow();
            o.importPanel = await panelText();
            o.importAria = null;
            const s = await snap(page, 'n-01-native-import-tab', {facts: o});
            await loc(page, 'Native XML: a tab by its name', page.getByRole('tab', {name: 'Import', exact: true}));
            await loc(page, 'Native XML Import: the file input', page.locator('#importXmlForm input[type=file]'));
            await loc(page, 'Native XML Import: the "Upload File" button', page.locator('#importXmlForm').getByRole('button', {name: 'Upload File'}));
            await loc(page, 'Native XML Import: the "Import" button', page.locator('#importXmlForm').getByRole('button', {name: 'Import', exact: true}));
            o.importButtons = await page.locator('#importXmlForm').getByRole('button').evaluateAll((bs) => bs.map((b) => ({text: b.innerText.trim(), id: b.id, cls: b.className, visible: b.offsetParent !== null}))).catch(() => []);
            // export tab
            await openExportTab();
            await listSettle();
            o.exportTab = await readExportList();
            o.exportTabs = await tabsNow();
            await snap(page, 'n-02-native-export-tab', {facts: o.exportTab});
            await loc(page, 'Native XML export tab: the list items', exportTab().locator('.listPanel__item'));
            await loc(page, 'Native XML export tab: an item checkbox', exportTab().locator('.listPanel__item input[type=checkbox]'));
            await loc(page, `Native XML export tab: the "${exportBtnName}" button`, exportTab().getByRole('button', {name: exportBtnName, exact: true}));
            await loc(page, 'Native XML export tab: "Select All"', exportTab().getByRole('button', {name: 'Select All'}));
            await loc(page, 'Native XML export tab: "Filters"', exportTab().getByRole('button', {name: 'Filters'}));
            // ONIX reminder (OMP) or its absence
            o.onixLine = flat(await exportTab().evaluate((el) => {
                const w = [...el.querySelectorAll('*')].find((e) => /missing some required information/i.test(e.textContent) && e.children.length < 3);
                return w ? w.innerText : null;
            }).catch(() => null), 400);
            o.onixLinks = await exportTab().getByRole('link', {name: 'Press Settings'}).evaluateAll((as_) => as_.map((a) => (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''))).catch(() => []);
            o.exportTabTextAll = flat(await exportTab().innerText().catch(() => null), 1500);
            // Filters
            const fb = exportTab().getByRole('button', {name: 'Filters'});
            o.filtersButton = await fb.count();
            if (o.filtersButton) {
                await fb.first().click(); await sleep(600); await idle(page).catch(() => {});
                o.filters = await exportTab().evaluate((el) => {
                    const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
                    const f = el.querySelector('.listPanel__sidebar');
                    const heads = f ? [...f.querySelectorAll('h3, h4')].map(txt) : [];
                    const btns = f ? [...f.querySelectorAll('button')].map((b) => `${txt(b)}${b.closest('.pkpFilter') && !b.closest('.pkpFilter').classList.contains('pkpFilter--disabled') ? '*' : ''}`) : [];
                    const sliders = f ? [...f.querySelectorAll('input[type=range], .vue-slider, [role=slider]')].map((s) => ({role: s.getAttribute('role'), min: s.getAttribute('aria-valuemin') || s.min, max: s.getAttribute('aria-valuemax') || s.max, now: s.getAttribute('aria-valuenow') || s.value})) : [];
                    return {found: !!f, cls: f ? f.className : null, text: txt(f), heads, btns, sliders};
                }).catch((e) => ({error: flat(e.message, 200)}));
                o.filtersAfterOpen = await readExportList();
                await snap(page, 'n-03-native-export-filters', {facts: o.filters});
                await fb.first().click().catch(() => {}); await sleep(400);
            }
            // Export Issues tab (OJS)
            if (isOJS) {
                await page.getByRole('tab', {name: 'Export Issues', exact: true}).first().click();
                await page.locator('#issuesListGridContainer tr.gridRow, #issuesListGridContainer .pkp_controllers_grid').first().waitFor({timeout: 15_000}).catch(() => {});
                await idle(page).catch(() => {});
                o.issuesTab = await page.locator('#exportIssues-tab').evaluate((el) => {
                    const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
                    return {cols: [...el.querySelectorAll('thead th')].map(txt), rows: [...el.querySelectorAll('tbody tr.gridRow')].map(txt), buttons: [...el.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map(txt), text: txt(el).slice(0, 1500)};
                }).catch((e) => ({error: flat(e.message, 200)}));
                await snap(page, 'n-04-native-export-issues-tab', {facts: o.issuesTab});
            }
            await out();
            fact('tabs', o);
        });

        // ------------------------------------------------------------ upload: Rule 8 (file picker, the box after a file, a dropped file, any file)
        await sect('upload', async () => {
            const o = {};
            await as(S.C.mgr, S.C.path);
            await openNative(S.C.path);
            // "Upload File" opens the file picker?
            const upBtn = page.locator('#importXmlForm').getByRole('button', {name: 'Upload File'});
            o.uploadButton = await upBtn.count();
            const fcP = page.waitForEvent('filechooser', {timeout: 5000}).catch(() => null);
            await upBtn.first().click().catch((e) => { o.clickErr = flat(e.message, 200); });
            const fc = await fcP;
            o.fileChooser = fc ? {multiple: fc.isMultiple()} : null;
            if (fc) {
                const txtFile = path.join(outDir(), `k2-plain-${app.name}.txt`);
                fs.writeFileSync(txtFile, 'not xml\n');
                const upResp = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: 20_000}).catch(() => null);
                await fc.setFiles(txtFile);
                const r = await upResp;
                o.chooserUpload = r ? r.status() : 'no request';
                await idle(page).catch(() => {}); await sleep(400);
                o.boxAfterChooser = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 500);
                o.buttonsAfterChooser = await page.locator('#importXmlForm').getByRole('button').allInnerTexts().catch(() => []);
                o.tempIdAfterChooser = await page.locator('#importXmlForm input[name=temporaryFileId]').inputValue().catch(() => null);
                await snap(page, 'u-01-import-after-chooser', {facts: o});
                await loc(page, 'Native XML Import: "Change File" after an upload', page.locator('#importXmlForm').getByRole('button', {name: 'Change File'}));
            }
            // keyboard: Tab from the "Import" tab through the form
            await openNative(S.C.path);
            await page.getByRole('tab', {name: 'Import', exact: true}).first().focus().catch(() => {});
            o.tabOrder = [];
            for (let i = 0; i < 8; i++) {
                await page.keyboard.press('Tab');
                o.tabOrder.push(await page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName}${e.id ? '#' + e.id : ''}${e.type ? '[' + e.type + ']' : ''} "${(e.innerText || e.value || '').trim().slice(0, 30)}"` : null; }));
            }
            o.uploadButtonTabindex = await page.locator('#pkpUploaderButton').getAttribute('tabindex').catch(() => null);
            // "Choose File": what is it?
            o.chooseFile = await page.locator('#importXmlForm').getByRole('button', {name: 'Choose File'}).evaluateAll((bs) => bs.map((b) => ({tag: b.tagName, type: b.type, visible: b.offsetParent !== null, cls: b.className, style: b.getAttribute('style')}))).catch(() => []);
            // a PNG file through the input
            await openNative(S.C.path);
            const png = path.resolve('apps/ojs/playwright/fixtures/files/profile-image-400.png');
            if (fs.existsSync(png)) { o.png = await uploadImport(png); await snap(page, 'u-02-import-png-up', {facts: o.png}); }
            // a dropped file: a synthetic drop of an XML file on the drop zone
            await openNative(S.C.path);
            const dz = page.locator('#importXmlForm .pkp_uploader_drop_zone').first();
            o.dropZone = {count: await dz.count(), cls: await dz.getAttribute('class').catch(() => null), text: flat(await dz.innerText().catch(() => null), 200)};
            const upResp2 = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: 15_000}).catch(() => null);
            o.drop = await page.evaluate(() => {
                const zone = document.querySelector('#importXmlForm .pkp_uploader_drop_zone');
                if (!zone) return 'no zone';
                // Chrome gives a synthetic DataTransfer item no file entry (webkitGetAsEntry() is null), so the uploader's
                // drop handler would find no file; the event carries what a real drop's dataTransfer carries instead.
                const file = new File(['<?xml version="1.0"?><x/>'], 'dropped.xml', {type: 'text/xml'});
                for (const type of ['dragenter', 'dragover', 'drop']) {
                    const ev = new Event(type, {bubbles: true, cancelable: true});
                    Object.defineProperty(ev, 'dataTransfer', {value: {types: ['Files'], files: [file], items: undefined, dropEffect: 'copy'}});
                    zone.dispatchEvent(ev);
                }
                return `dispatched on ${zone.className || zone.id}`;
            }).catch((e) => flat(e.message, 200));
            const r2 = await upResp2;
            o.dropUpload = r2 ? r2.status() : 'no request';
            await idle(page).catch(() => {}); await sleep(500);
            o.boxAfterDrop = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 500);
            o.tempIdAfterDrop = await page.locator('#importXmlForm input[name=temporaryFileId]').inputValue().catch(() => null);
            await snap(page, 'u-03-import-after-drop', {facts: o});
            await out();
            fact('upload', o);
        });

        // ------------------------------------------------------------ nofile: Rule 13 / td5
        await sect('nofile', async () => {
            const o = {};
            await as(S.C.mgr, S.C.path);
            o.dashBefore = await dashboardFind(S.C.path, S.t);
            await openNative(S.C.path);
            o.press = await pressImport();
            await snap(page, 'f-01-import-no-file', {facts: o.press});
            o.pressAgain = await pressImport();
            o.dashAfter = await dashboardFind(S.C.path, S.t);
            await snap(page, 'f-02-dashboard-after-no-file', {facts: o.dashAfter});
            await out();
            fact('nofile', o);
        });

        // ------------------------------------------------------------ notxml: Rule 13 / td6
        await sect('notxml', async () => {
            const o = {};
            await as(S.C.mgr, S.C.path);
            await openNative(S.C.path);
            const txtFile = path.join(outDir(), `k2-plain-${app.name}.txt`);
            fs.writeFileSync(txtFile, 'not xml\n');
            o.up = await uploadImport(txtFile);
            o.press = await pressImport();
            await snap(page, 'f-03-import-not-xml', {facts: o.press});
            // an image
            await openNative(S.C.path);
            const png = path.resolve('apps/ojs/playwright/fixtures/files/profile-image-400.png');
            o.pngUp = await uploadImport(png);
            o.pngPress = await pressImport();
            await snap(page, 'f-04-import-png', {facts: o.pngPress});
            await out();
            fact('notxml', o);
        });

        // ------------------------------------------------------------ list: Rule 14 (every submission, search, Filters narrow, View), Rule 15 empty list
        await sect('list', async () => {
            const o = {};
            await as(A.mgr, A.path);
            await openNative(A.path);
            await openExportTab(); await listSettle();
            o.all = await readExportList();
            o.seeded = S.subs;
            await snap(page, 'l-01-export-list-a', {facts: o.all});
            // search: a word of s2's (OPS s3's) title
            const word = isOPS ? 'Heron' : 'Axolotl';
            const box = exportTab().locator('input[type=search]').first();
            o.searchBoxes = await exportTab().locator('input[type=search]').count();
            if (o.searchBoxes) {
                await loc(page, 'Native XML export tab: the search box', exportTab().locator('input[type=search]'));
                await box.fill(word); await sleep(800); await idle(page).catch(() => {});
                o.afterFillOnly = (await readExportList()).items.map((i) => i.text);
                await box.press('Enter'); await sleep(1200); await idle(page).catch(() => {}); await listSettle();
                o.search = await readExportList();
                await snap(page, 'l-02-export-list-search', {facts: o.search});
                await box.fill(''); await box.press('Enter'); await sleep(1200); await idle(page).catch(() => {}); await listSettle();
                o.afterClear = (await readExportList()).count;
            }
            // Filters: press a stage, then a section
            const fb = exportTab().getByRole('button', {name: 'Filters'});
            if (await fb.count()) {
                await fb.first().click(); await sleep(600);
                const stageName = isOPS ? 'Production' : isOMP ? 'Internal Review' : 'Review';
                const sb = exportTab().locator('.listPanel__sidebar').getByRole('button', {name: stageName, exact: true});
                o.stageButtons = await sb.count();
                if (o.stageButtons) {
                    await sb.first().click(); await sleep(1200); await idle(page).catch(() => {}); await listSettle();
                    o.byStage = await readExportList();
                    await snap(page, `l-03-export-list-filter-stage`, {facts: o.byStage});
                    // a section on top (OJS, OPS)
                    if (!isOMP) {
                        const secName = isOPS ? 'Preprints' : 'Articles';
                        const secB = exportTab().locator('.listPanel__sidebar').getByRole('button', {name: secName, exact: true});
                        o.sectionButtons = await secB.count();
                        if (o.sectionButtons) {
                            await secB.first().click(); await sleep(1200); await idle(page).catch(() => {}); await listSettle();
                            o.byStageAndSection = await readExportList();
                            await snap(page, 'l-04-export-list-filter-stage-section', {facts: o.byStageAndSection});
                        }
                    }
                    await sb.first().click().catch(() => {}); await sleep(800); await idle(page).catch(() => {});
                }
                // two stages in one group: Production alone, then Submission added (narrows or widens?)
                if (!isOPS) {
                    const fbtn = (n) => exportTab().locator('.listPanel__sidebar').getByRole('button', {name: n, exact: true});
                    const read = async () => { const l = await readExportList(); return {items: l.items.map((i) => i.text), active: l.activeFilters}; };
                    // clear the section left pressed above (OJS), then Review alone, then Submission added
                    if (isOJS) { await fbtn('Articles').first().click().catch(() => {}); await sleep(1200); await idle(page).catch(() => {}); await listSettle(); }
                    const second = isOMP ? 'Internal Review' : 'Review';
                    await fbtn(second).first().click(); await sleep(1500); await idle(page).catch(() => {}); await listSettle();
                    o.stageReview = await read();
                    await fbtn('Submission').first().click(); await sleep(1500); await idle(page).catch(() => {}); await listSettle();
                    o.stageReviewAndSubmission = await read();
                    await fbtn('Production').first().click(); await sleep(1500); await idle(page).catch(() => {}); await listSettle();
                    o.stageReviewSubmissionProduction = await read();
                    await snap(page, 'l-05-export-list-two-stages', {facts: {one: o.stageReview, two: o.stageReviewAndSubmission, three: o.stageReviewSubmissionProduction}});
                    for (const n of [second, 'Submission', 'Production']) { await fbtn(n).first().click().catch(() => {}); await sleep(1200); await idle(page).catch(() => {}); }
                    await listSettle();
                    o.afterClearingStages = await read();
                }
                // the Activity slider
                const add = exportTab().locator('.listPanel__sidebar').getByRole('button', {name: /Add filter: Days since last activity/});
                o.sliderAdd = await add.count();
                if (o.sliderAdd) {
                    await add.first().click(); await sleep(1500); await idle(page).catch(() => {}); await listSettle();
                    const sl = exportTab().locator('.listPanel__sidebar input[type=range]').first();
                    o.slider = {disabled: await sl.isDisabled().catch(() => null), value: await sl.inputValue().catch(() => null), min: await sl.getAttribute('min'), max: await sl.getAttribute('max')};
                    o.withSlider = await readExportList();
                    await snap(page, 'l-05b-export-list-activity-slider', {facts: {slider: o.slider, list: o.withSlider.items.map((i) => i.text), active: o.withSlider.activeFilters}});
                    // drag the slider to its minimum (1 day): today's submissions stay?
                    await sl.fill('1').catch((e) => { o.sliderFillErr = flat(e.message, 120); });
                    await sl.dispatchEvent('change').catch(() => {});
                    await sleep(1500); await idle(page).catch(() => {}); await listSettle();
                    o.sliderAt1 = {value: await sl.inputValue().catch(() => null), items: (await readExportList()).items.map((i) => i.text), active: (await readExportList()).activeFilters};
                }
            }
            // View on a line
            await openNative(A.path); await openExportTab(); await listSettle();
            const v = exportTab().locator('.listPanel__item').filter({hasText: 'Kestrel'}).getByRole('link', {name: 'View'});
            o.viewCount = await v.count();
            if (o.viewCount) {
                o.viewHref = rel(await v.first().getAttribute('href'));
                o.viewTarget = await v.first().getAttribute('target');
                await v.first().click(); await page.waitForLoadState('load').catch(() => {}); await sleep(1500); await idle(page).catch(() => {});
                o.afterView = {url: rel(page.url()), dialogs: (await page.locator('[role="dialog"]:visible').allInnerTexts().catch(() => [])).map((x) => flat(x, 300)), title: await page.title()};
                await snap(page, 'l-06-view-opens', {facts: o.afterView});
            }
            // "View" on the draft's line
            await openNative(A.path); await openExportTab(); await listSettle();
            const vd = exportTab().locator('.listPanel__item').filter({hasText: 'Newt draft'}).getByRole('link', {name: 'View'});
            if (await vd.count()) {
                o.draftViewHref = rel(await vd.first().getAttribute('href'));
                await vd.first().click(); await page.waitForLoadState('load').catch(() => {}); await sleep(1500); await idle(page).catch(() => {});
                const sd = await snap(page, 'l-06b-draft-view-opens');
                o.draftView = {url: rel(page.url()), h1: (await page.locator('h1').allInnerTexts().catch(() => [])).map((x) => flat(x, 100)), dialog: flat(sd.text && sd.text.dialog, 300), main: flat(sd.text && sd.text.main, 300)};
            }
            await out();
            // B before import: empty list, Select All
            await as(S.B.mgr, S.B.path);
            await openNative(S.B.path); await openExportTab(); await listSettle();
            o.empty = await readExportList();
            const sa = exportTab().getByRole('button', {name: /^Select (All|None)$/});
            o.emptySelectAll = {count: await sa.count(), disabled: await sa.first().isDisabled().catch(() => null)};
            await snap(page, 'l-07-export-list-empty', {facts: o.empty});
            // the export button with an empty list
            await out();
            fact('list', o);
        });

        // ------------------------------------------------------------ selectall: Rule 15 on A
        await sect('selectall', async () => {
            const o = {};
            await as(A.mgr, A.path);
            await openNative(A.path); await openExportTab(); await listSettle();
            const sa = exportTab().getByRole('button', {name: /^Select (All|None)$/});
            o.before = {label: flat(await sa.first().innerText()), list: (await readExportList()).checked};
            await sa.first().click(); await sleep(400);
            o.afterFirst = {label: flat(await sa.first().innerText()), checked: (await readExportList()).checked, count: (await readExportList()).count};
            await snap(page, 's-01-select-all-pressed', {facts: o.afterFirst});
            await sa.first().click(); await sleep(400);
            o.afterSecond = {label: flat(await sa.first().innerText()), checked: (await readExportList()).checked};
            // tick all by hand: does the label flip?
            const boxes = exportTab().locator('.listPanel__item input[type=checkbox]');
            for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).check();
            o.allByHand = {label: flat(await sa.first().innerText()), checked: (await readExportList()).checked};
            await boxes.first().uncheck();
            o.oneUnticked = {label: flat(await sa.first().innerText()), checked: (await readExportList()).checked};
            // search narrowed list: select all selects the shown ones only?
            const box = exportTab().locator('input[type=search]').first();
            if (await box.count()) {
                for (let i = 0; i < await boxes.count(); i++) await boxes.nth(i).uncheck().catch(() => {});
                await box.fill('Kestrel'); await box.press('Enter'); await sleep(1200); await idle(page).catch(() => {}); await listSettle();
                await sa.first().click(); await sleep(400);
                o.narrowed = {label: flat(await sa.first().innerText()), list: await readExportList()};
                await box.fill(''); await box.press('Enter'); await sleep(1200); await idle(page).catch(() => {}); await listSettle();
                o.narrowedCleared = {label: flat(await sa.first().innerText()), checked: (await readExportList()).checked, items: (await readExportList()).items.map((i) => `${i.checked ? '[x]' : '[ ]'} ${i.text}`)};
                await snap(page, 's-02-select-all-after-search', {facts: o.narrowedCleared});
            }
            await out();
            fact('selectall', o);
        });

        // ------------------------------------------------------------ page2: Rule 14 "100 to a page", Rule 15 on a list of 101
        await sect('page2', async () => {
            const o = {};
            await as(S.P.mgr, S.P.path);
            await openNative(S.P.path); await openExportTab(); await listSettle();
            const l = await readExportList();
            o.first = {count: l.count, pagination: l.pagination, header: l.header, firstItem: l.items[0] && l.items[0].text, lastItem: l.items.length && l.items[l.items.length - 1].text};
            await snap(page, 'p-01-export-list-101', {facts: o.first});
            const sa = exportTab().getByRole('button', {name: /^Select (All|None)$/});
            await sa.first().click(); await sleep(500);
            const l2 = await readExportList();
            o.selectAll = {label: flat(await sa.first().innerText()), checked: l2.checked, count: l2.count};
            await sa.first().click(); await sleep(500);
            o.selectAllSecond = {label: flat(await sa.first().innerText()), checked: (await readExportList()).checked};
            await snap(page, 'p-02-select-all-101', {facts: o.selectAll});
            // page 2
            const p2 = exportTab().locator('.pkpPagination').getByRole('button', {name: /2/}).or(exportTab().locator('.pkpPagination').getByRole('link', {name: /2/})).first();
            o.page2Buttons = await p2.count();
            if (o.page2Buttons) {
                await loc(page, 'Native XML export tab: page 2 link', p2);
                // ticks on page 1 stay?
                await exportTab().locator('.listPanel__item input[type=checkbox]').first().check();
                await p2.click(); await sleep(1200); await idle(page).catch(() => {}); await listSettle();
                const l3 = await readExportList();
                o.page2 = {count: l3.count, items: l3.items.map((i) => i.text), pagination: l3.pagination, label: flat(await sa.first().innerText())};
                await snap(page, 'p-03-export-list-page2', {facts: o.page2});
                await sa.first().click(); await sleep(500);
                o.page2SelectAll = {label: flat(await sa.first().innerText()), checked: (await readExportList()).checked};
                // export from page 2 with the page-1 tick and page-2 select all: what goes in the file
                o.exportMixed = await doExport([], 'p-04-export-mixed', {second: false});
                if (o.exportMixed.first && o.exportMixed.first.xml) o.exportMixed.first.xml = {submissions: o.exportMixed.first.xml.submissionTags.length, titles: o.exportMixed.first.xml.titles.filter((x) => /Paged item/.test(x)).slice(0, 5)};
            }
            // a tick on page 1, then page 2 with one ticked by hand: which go in the file?
            await openNative(S.P.path); await openExportTab(); await listSettle();
            const firstItem = exportTab().locator('.listPanel__item').first();
            o.cross = {page1Ticked: flat(await firstItem.innerText(), 80)};
            await firstItem.locator('input[type=checkbox]').check();
            const p2b = exportTab().locator('.pkpPagination').getByRole('button', {name: /2/}).or(exportTab().locator('.pkpPagination').getByRole('link', {name: /2/})).first();
            if (await p2b.count()) {
                await p2b.click(); await sleep(1200); await idle(page).catch(() => {}); await listSettle();
                const it2 = exportTab().locator('.listPanel__item').first();
                o.cross.page2Ticked = flat(await it2.innerText(), 80);
                await it2.locator('input[type=checkbox]').check();
                const ex = await doExport([], 'p-05-export-across-pages', {second: false});
                o.cross.file = ex.first && ex.first.xml ? ex.first.xml.titles : ex;
                o.cross.panel = ex.panel;
            }
            await out();
            fact('page2', o);
        });

        // ------------------------------------------------------------ export: Rules 16, 17, 20, td8, td9, td10; "Exports change nothing"
        await sect('export', async () => {
            const o = {};
            await as(A.mgr, A.path);
            await openNative(A.path);
            o.one = await doExport(['Kestrel'], 'e-01-export-s1', {second: false});
            S.fileS1 = filePath(app, 'e-01-export-s1-first');
            // a second export on the same page (the first tick kept): how many results tabs
            o.two = await doExport(['Heron'], 'e-02-export-s3', {second: false});
            S.fileS3 = filePath(app, 'e-02-export-s3-first');
            o.tabsAfterTwo = (await tabsNow()).map((t) => t.text);
            // td9 (a): on the second results tab (open), "Download Exported File" pressed again
            const pressDl = async (label) => {
                const btn = page.locator('#importExportTabs [role="tabpanel"]:visible').first().getByRole('button', {name: 'Download Exported File'});
                const dlP = page.waitForEvent('download', {timeout: 10_000}).catch(() => null);
                const respP = page.waitForResponse((x) => /downloadExportFile/.test(x.url()), {timeout: 15_000}).catch(() => null);
                await btn.first().click();
                const [d, resp] = await Promise.all([dlP, respP]);
                await page.waitForLoadState('load').catch(() => {}); await sleep(800);
                const r = {download: d ? d.suggestedFilename() : null, status: resp ? resp.status() : null, contentType: resp ? resp.headers()['content-type'] : null, disposition: resp ? resp.headers()['content-disposition'] || null : null, bodyBytes: resp && !d ? ((await resp.text().catch(() => '')) || '').length : null, urlAfter: rel(page.url()), pageText: flat(await page.locator('body').innerText().catch(() => null), 300), title: await page.title().catch(() => null)};
                if (d) { const pth = await d.path().catch(() => null); const xml = pth ? fs.readFileSync(pth, 'utf8') : ''; r.titles = readXml(xml) ? readXml(xml).titles : null; }
                await snap(page, label, {facts: r});
                return r;
            };
            o.secondPressSameTab = await pressDl('e-05-second-download-press');
            await page.goBack().catch(() => {}); await sleep(1000); await idle(page).catch(() => {});
            o.afterBack = {url: rel(page.url()), tabs: (await tabsNow()).map((t) => t.text)};
            // td9 (b): a results tab left and chosen again, then its button
            await openNative(A.path);
            o.reselect = await doExport(['Kestrel'], 'e-05b-export-for-reselect');
            await page.getByRole('tab', {name: 'Import', exact: true}).first().click(); await sleep(500);
            const reqs = [];
            const onReq = (r) => { if (/NativeImportExportPlugin\/(export|download)/.test(r.url())) reqs.push(`${r.method()} ${rel(r.url()).replace(/csrfToken=[^&]+/, 'csrf').slice(0, 160)}`); };
            page.on('request', onReq);
            await page.locator('#importExportTabs [role="tab"]').filter({hasText: 'Export Submissions Results'}).first().click(); await sleep(1500); await idle(page).catch(() => {});
            o.reselectRequests = [...reqs];
            o.reselectDownload = await pressDl('e-05c-download-after-reselect');
            page.off('request', onReq);
            o.reselectRequestsAll = reqs;
            // a results tab's close control
            await openNative(A.path);
            o.close = await doExport(['Kestrel'], 'e-06-export-for-close', {download: false});
            const closeCtl = page.locator('#importExportTabs [role="tab"]').filter({hasText: 'Export Submissions Results'}).locator('a, button, span').filter({hasText: 'Close'});
            o.closeControls = await closeCtl.count();
            if (o.closeControls) {
                await loc(page, 'Native XML: a results tab\'s Close control', closeCtl);
                await closeCtl.first().click().catch((e) => { o.closeErr = flat(e.message, 150); }); await sleep(800);
                o.afterClose = {tabs: (await tabsNow()).map((t) => `${t.text}${t.selected ? '*' : ''}`), panel: await panelText()};
                await snap(page, 'e-07-after-results-tab-close', {facts: o.afterClose});
            }
            // nothing ticked (a fresh page, nothing ticked)
            await openNative(A.path);
            o.none = await doExport([], 'e-03-export-nothing', {second: false});
            // everything (Select All)
            await openNative(A.path); await openExportTab(); await listSettle();
            await exportTab().getByRole('button', {name: 'Select All'}).first().click(); await sleep(300);
            o.all = await doExport([], 'e-04-export-all', {second: false});
            S.fileAll = filePath(app, 'e-04-export-all-first');
            // the list after exports: unchanged?
            await openNative(A.path); await openExportTab(); await listSettle();
            o.listAfter = (await readExportList()).items.map((i) => i.text);
            await out();
            fact('export', o);
        });

        // ------------------------------------------------------------ versions: Rule 20 with two versions (the published one's "Create New Version")
        await sect('versions', async () => {
            const o = {};
            await as(A.mgr, A.path);
            await go(cu(A.path, `/dashboard/editorial?workflowSubmissionId=${S.subs.s3.id}`));
            await sleep(2000); await idle(page).catch(() => {});
            const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
            o.offered = await link.isVisible().catch(() => false);
            if (o.offered && !S.versioned) {
                await link.click();
                const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
                await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
                await idle(page).catch(() => {}); await sleep(800);
                const sel = w.locator('select[name="versionStage"]');
                if (await sel.count() && !(await sel.inputValue().catch(() => ''))) { const opts = await sel.locator('option').evaluateAll((os) => os.map((x) => x.value).filter(Boolean)); if (opts.length) await sel.selectOption(opts[0]); }
                const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: 20_000}).catch(() => null);
                await w.getByRole('button', {name: 'Confirm', exact: true}).click().catch((e) => { o.confirmErr = flat(e.message, 150); });
                const resp = await r;
                o.versionStatus = resp ? resp.status() : null;
                S.versioned = !!(resp && resp.status() < 300);
                await idle(page).catch(() => {}); await sleep(1000);
                await snap(page, 'e-08-heron-new-version', {facts: o});
            }
            await openNative(A.path);
            o.export = await doExport(['Heron'], 'e-09-export-two-versions');
            const xm = o.export.first && o.export.first.xml;
            o.file = xm ? {publications: xm.publications.length, titles: xm.titles, galleys: xm.galleys, submissionFiles: xm.submissionFiles, publicationFormats: xm.publicationFormats} : null;
            S.fileVersions = filePath(app, 'e-09-export-two-versions-first');
            // import it into a fresh journal and read the versions there
            const V = await freshCtx('v');
            o.ctx = V.path;
            await out();
            await as(V.mgr, V.path);
            await openNative(V.path);
            o.up = await uploadImport(S.fileVersions);
            o.press = await pressImport();
            await snap(page, 'e-10-import-two-versions', {facts: o.press});
            const ids = [...(o.press.panel || '').matchAll(/"(\d+)" - "/g)].map((x) => x[1]);
            if (ids.length) {
                await go(cu(V.path, `/dashboard/editorial?workflowSubmissionId=${ids[0]}`));
                await sleep(2500); await idle(page).catch(() => {});
                const s2 = await snap(page, 'e-11-imported-versions-workflow');
                o.workflow = flat(s2.text && s2.text.dialog, 1500);
            }
            await out();
            fact('versions', o);
        });

        // ------------------------------------------------------------ issues {OJS}: Rule 18 on A
        await sect('issues', async () => {
            if (!isOJS) return;
            const o = {};
            await as(A.mgr, A.path);
            await openNative(A.path);
            const openIssues = async () => {
                await page.getByRole('tab', {name: 'Export Issues', exact: true}).first().click();
                await page.locator('#issuesListGridContainer tr.gridRow').first().waitFor({timeout: 15_000}).catch(() => {});
                await idle(page).catch(() => {});
            };
            await openIssues();
            o.grid = await page.locator('#exportIssues-tab').evaluate((el) => {
                const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
                return {cols: [...el.querySelectorAll('thead th')].map(txt), rows: [...el.querySelectorAll('tbody tr.gridRow')].map((r) => ({text: txt(r), box: !!r.querySelector('input[type=checkbox]'), links: [...r.querySelectorAll('a')].map((a) => `${txt(a)} → ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}`)})), paging: txt(el.querySelector('.gridPaging')), buttons: [...el.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map(txt)};
            });
            await snap(page, 'i-01-export-issues-a', {facts: o.grid});
            await loc(page, 'Native XML Export Issues: a row checkbox', page.locator('#issuesListGridContainer tr.gridRow input[type=checkbox]'));
            await loc(page, 'Native XML Export Issues: the "Export Issues" button', page.locator('#exportIssues-tab').getByRole('button', {name: 'Export Issues'}));
            const exportIssues = async (rowText, name) => {
                const r = {};
                if (rowText) await page.locator('#issuesListGridContainer tr.gridRow').filter({hasText: rowText}).locator('input[type=checkbox]').first().check();
                const before = await tabsNow();
                await page.locator('#exportIssues-tab').getByRole('button', {name: 'Export Issues'}).click();
                for (let i = 0; i < 40; i++) { await sleep(500); if ((await tabsNow()).length > before.length && /completed|failed|error|Download/i.test(await panelText() || '')) break; if (i === 12 && (await tabsNow()).length === before.length) break; }
                await idle(page).catch(() => {});
                r.tabsAfter = (await tabsNow()).map((t) => `${t.text}${t.selected ? '*' : ''}`);
                r.added = (await tabsNow()).length - before.length;
                r.panel = await panelText();
                r.formErrors = await page.locator('#exportIssues-tab .error, #exportIssuesXmlForm label.error, .pkp_form_error').allInnerTexts().catch(() => []);
                await snap(page, `${name}-results`, {facts: r});
                const btn = page.locator('#importExportTabs [role="tabpanel"]:visible').first().getByRole('button', {name: 'Download Exported File'});
                if (await btn.count()) {
                    const dlP = page.waitForEvent('download', {timeout: 20_000}).catch(() => null);
                    const respP = page.waitForResponse((x) => /downloadExportFile/.test(x.url()), {timeout: 20_000}).catch(() => null);
                    await btn.first().click();
                    const [d, resp] = await Promise.all([dlP, respP]);
                    r.response = resp ? {status: resp.status(), disposition: resp.headers()['content-disposition'] || null} : null;
                    if (d) {
                        r.file = d.suggestedFilename();
                        const p = await d.path().catch(() => null);
                        const xml = p ? fs.readFileSync(p, 'utf8') : '';
                        if (xml) fs.writeFileSync(filePath(app, name), xml);
                        r.xml = readXml(xml);
                    }
                }
                return r;
            };
            // sweep: the issue name in a row is a link; what does it open?
            const il = page.locator('#issuesListGridContainer tr.gridRow').filter({hasText: 'No. 1'}).locator('a').first();
            if (await il.count()) {
                await il.click(); await sleep(2000); await idle(page).catch(() => {});
                const dlg = page.locator('[role="dialog"]:visible').last();
                o.issueLink = {dialogs: await page.locator('[role="dialog"]:visible').count(), url: rel(page.url()), text: flat(await dlg.innerText().catch(() => null), 800), tabs: await tabStrips(page)};
                await snap(page, 'i-01b-issue-link-opens', {facts: o.issueLink});
                await openNative(A.path); await openIssues();
            }
            o.published = await exportIssues('No. 1', 'i-02-export-issue-published');
            S.fileIssue = filePath(app, 'i-02-export-issue-published');
            await openNative(A.path); await openIssues();
            o.none = await exportIssues(null, 'i-03-export-issue-none');
            await out();
            fact('issues', o);
        });

        // ------------------------------------------------------------ pkissues {OJS}: td11 on publicknowledge (read, one export)
        await sect('pkissues', async () => {
            if (!isOJS) return;
            const o = {};
            await as('manager.maya', 'publicknowledge');
            await openNative('publicknowledge');
            await page.getByRole('tab', {name: 'Export Issues', exact: true}).first().click();
            await page.locator('#issuesListGridContainer tr.gridRow').first().waitFor({timeout: 15_000}).catch(() => {});
            await idle(page).catch(() => {});
            o.grid = await page.locator('#exportIssues-tab').evaluate((el) => {
                const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
                return {cols: [...el.querySelectorAll('thead th')].map(txt), rows: [...el.querySelectorAll('tbody tr.gridRow')].map(txt), buttons: [...el.querySelectorAll('button')].filter((b) => b.offsetParent !== null).map(txt)};
            });
            await snap(page, 'i-04-export-issues-pk', {facts: o.grid});
            const row = page.locator('#issuesListGridContainer tr.gridRow').filter({hasText: 'Vol. 2 No. 1'});
            o.rowFound = await row.count();
            if (o.rowFound) {
                await row.locator('input[type=checkbox]').first().check();
                const before = await tabsNow();
                await page.locator('#exportIssues-tab').getByRole('button', {name: 'Export Issues'}).click();
                for (let i = 0; i < 40; i++) { await sleep(500); if ((await tabsNow()).length > before.length && /completed|failed|error|Download/i.test(await panelText() || '')) break; }
                o.tabsAfter = (await tabsNow()).map((t) => `${t.text}${t.selected ? '*' : ''}`);
                o.panel = await panelText();
                await snap(page, 'i-05-export-issue-pk-results', {facts: o});
                const btn = page.locator('#importExportTabs [role="tabpanel"]:visible').first().getByRole('button', {name: 'Download Exported File'});
                if (await btn.count()) {
                    const dlP = page.waitForEvent('download', {timeout: 20_000}).catch(() => null);
                    await btn.first().click();
                    const d = await dlP;
                    if (d) { const p = await d.path(); const xml = fs.readFileSync(p, 'utf8'); o.file = d.suggestedFilename(); o.xml = readXml(xml); fs.writeFileSync(filePath(app, 'i-05-pk-issue'), xml); }
                }
            }
            await out();
            fact('pkissues', o);
        });

        // ------------------------------------------------------------ import: Rules 9, 10, td7, td8; "An import adds"; no email
        await sect('import', async () => {
            const o = {};
            const src = S.fileS1;
            if (!src || !fs.existsSync(src)) { o.skipped = 'no exported file from phase export'; fact('import', o); return; }
            o.mailBefore = {tag: await app.mail.count({to: S.t}).catch((e) => flat(e.message, 100)), admin: await app.mail.count({to: 'admin@', contains: S.B.path}).catch(() => null)};
            await as(S.B.mgr, S.B.path);
            await openNative(S.B.path);
            o.up = await uploadImport(src);
            await snap(page, 'm-01-import-file-up', {facts: o.up});
            o.first = await pressImport();
            await snap(page, 'm-02-import-results', {facts: o.first});
            o.resultsHtml = flat(await page.locator('#importExportTabs [role="tabpanel"]:visible').first().innerHTML().catch(() => null), 3000);
            // td8: press Import again, the same file still up?
            await page.getByRole('tab', {name: 'Import', exact: true}).first().click(); await sleep(400);
            o.boxAfterFirst = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 400);
            o.tempIdAfterFirst = await page.locator('#importXmlForm input[name=temporaryFileId]').inputValue().catch(() => null);
            o.second = await pressImport();
            await snap(page, 'm-03-import-second-press', {facts: o.second});
            o.tabsAfterTwo = (await tabsNow()).map((t) => `${t.text}${t.selected ? '*' : ''}`);
            // the Import Results tabs' texts
            o.resultTabs = [];
            const tabs = page.locator('#importExportTabs [role="tab"]');
            for (let i = 0; i < await tabs.count(); i++) {
                const tx = flat(await tabs.nth(i).innerText(), 60);
                if (!/Results/.test(tx)) continue;
                await tabs.nth(i).click(); await sleep(400);
                o.resultTabs.push({tab: tx, panel: await panelText()});
            }
            // after a reload
            await openNative(S.B.path);
            o.tabsAfterReload = (await tabsNow()).map((t) => t.text);
            // the export list of B now
            await openExportTab(); await listSettle();
            o.bList = (await readExportList()).items.map((i) => i.text);
            await snap(page, 'm-04-b-export-list-after-import', {facts: {list: o.bList}});
            // the Dashboard
            o.dash = await dashboardFind(S.B.path, 'Kestrel');
            await snap(page, 'm-05-b-dashboard-after-import', {facts: o.dash});
            // open the imported submission's workflow
            const ids = [...(o.first.panel || '').matchAll(/"(\d+)" - "/g)].map((x) => x[1]);
            o.importedIds = ids;
            if (ids.length) {
                await go(cu(S.B.path, `/dashboard/editorial?workflowSubmissionId=${ids[0]}`));
                await sleep(2500); await idle(page).catch(() => {});
                const s = await snap(page, 'm-06-b-imported-workflow');
                o.workflow = flat(s.text && (s.text.dialog || s.text.main), 2500);
                // contributors
                const contrib = page.getByRole('dialog').getByRole('button', {name: /Contributors/}).or(page.getByRole('dialog').getByRole('link', {name: /Contributors/})).first();
                if (await contrib.count()) {
                    await contrib.click(); await sleep(1500); await idle(page).catch(() => {});
                    const s2 = await snap(page, 'm-07-b-imported-contributors');
                    o.contributors = flat(s2.text && s2.text.dialog, 1500);
                }
                // the submission's public-facing? not needed. Files are on the workflow text read above.
            }
            await out();
            await sleep(5000);
            o.mailAfter = {tag: await app.mail.count({to: S.t}).catch((e) => flat(e.message, 100)), admin: await app.mail.count({to: 'admin@', contains: S.B.path}).catch(() => null)};
            fact('import', o);
        });

        // ------------------------------------------------------------ importissue {OJS}: an issue export into B ("on a journal, also its issues")
        await sect('importissue', async () => {
            if (!isOJS) return;
            const o = {};
            const src = S.fileIssue;
            if (!src || !fs.existsSync(src)) { o.skipped = 'no issue file'; fact('importissue', o); return; }
            await as(S.B.mgr, S.B.path);
            await go(cu(S.B.path, '/manageIssues'));
            await sleep(1500); await idle(page).catch(() => {});
            o.issuesBefore = flat(await page.locator('main').innerText().catch(() => null), 1200);
            await openNative(S.B.path);
            o.up = await uploadImport(src);
            o.press = await pressImport();
            await snap(page, 'm-08-import-issue-results', {facts: o.press});
            await go(cu(S.B.path, '/manageIssues'));
            await sleep(1500); await idle(page).catch(() => {});
            o.issuesAfter = flat(await page.locator('main').innerText().catch(() => null), 1500);
            const bt = page.getByRole('tab', {name: 'Back Issues'});
            if (await bt.count()) { await bt.first().click(); await sleep(1500); await idle(page).catch(() => {}); o.backIssues = flat(await page.locator('#backIssuesGridContainer, main').first().innerText().catch(() => null), 1500); }
            await snap(page, 'm-09-b-issues-after-issue-import', {facts: o});
            await out();
            fact('importissue', o);
        });

        // ------------------------------------------------------------ failed: Rule 11 (schema mismatch; an error part-way, nothing kept)
        await sect('failed', async () => {
            const o = {};
            const src = S.fileS1;
            if (!src || !fs.existsSync(src)) { o.skipped = 'no exported file'; fact('failed', o); return; }
            const xml = fs.readFileSync(src, 'utf8');
            const el = isOJS ? 'article' : isOMP ? 'monograph' : 'preprint';
            // (a) a file the format refuses: an unknown element inside the submission
            const bad = xml.replace(new RegExp(`(<${el}\\s[^>]*>)`), '$1<bogus_element>x</bogus_element>');
            const fa = path.join(outDir(), `k2-invalid-${app.name}.xml`); fs.writeFileSync(fa, bad);
            // (b) two submissions under the plural root of the "all" export: the first fine, the second with a status the
            // database refuses (the schema takes any string)
            const allXml = S.fileAll && fs.existsSync(S.fileAll) ? fs.readFileSync(S.fileAll, 'utf8') : null;
            let two = null;
            if (allXml) {
                const blocks = [...allXml.matchAll(new RegExp(`<${el}\\s[\\s\\S]*?</${el}>`, 'g'))].map((x) => x[0]);
                const kest = blocks.find((b) => b.includes('Kestrel submitted'));
                if (kest) {
                    const first = kest.replace(/Kestrel submitted/g, 'Ibis before failure');
                    // a language code the database refuses: the second submission fails part-way
                    const second = kest.replace(/Kestrel submitted/g, 'Jackal failing').replace(new RegExp(`(<${el}\\s[^>]*?)\\slocale="[^"]*"`), `$1 locale="en_${'X'.repeat(40)}"`);
                    const startIdx = allXml.indexOf(blocks[0]);
                    const last = blocks[blocks.length - 1];
                    const endIdx = allXml.indexOf(last) + last.length;
                    two = allXml.slice(0, startIdx) + first + '\n' + second + allXml.slice(endIdx);
                }
            }
            const fb = path.join(outDir(), `k2-partway-${app.name}.xml`); if (two) fs.writeFileSync(fb, two);
            o.partwayBuilt = !!two;
            o.partwayLocaleAttr = two ? (two.match(/locale="en_XXXX/g) || []).length : null;
            const F = await freshCtx('f');
            o.ctx = F.path;
            await as(F.mgr, F.path);
            await openNative(F.path);
            o.invalidUp = await uploadImport(fa);
            o.invalid = await pressImport();
            await snap(page, 'f-05-import-invalid', {facts: o.invalid});
            if (two) {
                await openNative(F.path);
                o.partwayUp = await uploadImport(fb);
                o.partway = await pressImport();
                // Only the panel's headings and markers are kept.
                const pt = o.partway.panel || '';
                o.partway.panel = {failed: /^The process failed/.test(pt), headings: ['The import completed successfully', 'Errors occured:', 'Validation errors:', 'Warnings encountered:'].filter((h) => pt.includes(h)), namesIbis: pt.includes('Ibis before failure'), length: pt.length};
                o.partway.box = null;
            }
            o.dash = await dashboardFind(F.path, 'Ibis');
            await snap(page, 'f-07-c-dashboard-after-failed', {facts: o.dash});
            o.dashKestrel = await dashboardFind(F.path, 'Kestrel');
            o.dashJackal = await dashboardFind(F.path, 'Jackal');
            await openNative(F.path); await openExportTab(); await listSettle();
            o.cList = (await readExportList()).items.map((i) => i.text);
            await out();
            fact('failed', o);
        });

        // ------------------------------------------------------------ problems: Rule 12 / td18 (an unknown issue {OJS}; an unknown section / series)
        await sect('problems', async () => {
            const o = {};
            const src = S.fileS1;
            if (!src || !fs.existsSync(src)) { o.skipped = 'no exported file'; fact('problems', o); return; }
            const xml = fs.readFileSync(src, 'utf8');
            o.srcPublicationTag = (xml.match(/<publication\s[^>]*>/) || [null])[0];
            const R = await freshCtx('r');
            o.ctx = R.path;
            await as(R.mgr, R.path);
            if (isOJS) {
                // an issue the journal lacks: add issue_identification to the publication and a date_published
                let x = xml.replace(/Kestrel submitted/g, 'Lynx issue problem');
                x = x.replace(/(<publication\s[^>]*?)(\s*>)/, (all, a, b) => (/date_published=/.test(a) ? a : `${a} date_published="2026-01-02"`) + b);
                // issue_identification goes after the publication's <id> elements, before <title>
                x = x.replace(/(\s*)<\/publication>/, '$1  <issue_identification><volume>99</volume><number>9</number><year>2099</year></issue_identification>$1</publication>');
                const f = path.join(outDir(), `k2-issue99-${app.name}.xml`); fs.writeFileSync(f, x);
                await go(cu(R.path, '/manageIssues')); await sleep(1500); await idle(page).catch(() => {});
                o.futureBefore = flat(await page.locator('main').innerText().catch(() => null), 800);
                await openNative(R.path);
                o.issueUp = await uploadImport(f);
                o.issue = await pressImport();
                await snap(page, 'r-01-import-unknown-issue', {facts: o.issue});
                await go(cu(R.path, '/manageIssues')); await sleep(1500); await idle(page).catch(() => {});
                o.futureAfter = flat(await page.locator('main').innerText().catch(() => null), 1200);
                await snap(page, 'r-02-c-future-issues-after', {facts: {text: o.futureAfter}});
                // the imported article's own "Publication Settings": is it in the new issue?
                const lid = ((o.issue.panel || '').match(/"(\d+)" - "Lynx/) || [])[1];
                if (lid) {
                    await go(cu(R.path, `/dashboard/editorial?workflowSubmissionId=${lid}`));
                    await sleep(2500); await idle(page).catch(() => {});
                    const ps = page.getByRole('dialog').getByRole('link', {name: 'Publication Settings'}).or(page.getByRole('dialog').getByRole('button', {name: 'Publication Settings'})).first();
                    if (await ps.count()) { await ps.click(); await sleep(2500); await idle(page).catch(() => {}); }
                    o.lynxIssue = flat(await page.locator('[role="dialog"]:visible').last().innerText().catch(() => null), 1500);
                    await snap(page, 'r-02b-lynx-publication-settings', {facts: {text: o.lynxIssue}});
                }
                o.dashLynx = await dashboardFind(R.path, 'Lynx');
                await snap(page, 'r-03-c-dashboard-lynx', {facts: o.dashLynx});
            }
            if (!isOMP) {
                let x = xml.replace(/Kestrel submitted/g, 'Mink section problem').replace(/section_ref="[^"]*"/g, 'section_ref="ZZZ"');
                const f = path.join(outDir(), `k2-sectionzzz-${app.name}.xml`); fs.writeFileSync(f, x);
                o.sectionRefs = (x.match(/section_ref="[^"]*"/g) || []);
                await openNative(R.path);
                o.sectionUp = await uploadImport(f);
                o.section = await pressImport();
                await snap(page, 'r-04-import-unknown-section', {facts: o.section});
                o.dashMink = await dashboardFind(R.path, 'Mink');
                await snap(page, 'r-05-c-dashboard-mink', {facts: o.dashMink});
                // the Dashboard's "Active submissions" view: a row without a title?
                await go(cu(R.path, '/dashboard/editorial?currentViewId=active'));
                await sleep(1500); await idle(page).catch(() => {});
                o.activeView = {main: flat(await page.locator('main').innerText().catch(() => null), 1200), rows: await page.locator('main table tbody tr').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => [])};
                await snap(page, 'r-05b-c-dashboard-active', {facts: o.activeView});
                const view = page.locator('main table tbody tr').first().getByRole('button', {name: /View/}).or(page.locator('main table tbody tr').first().getByRole('link', {name: /View/})).first();
                if (await view.count()) {
                    await view.click(); await sleep(2500); await idle(page).catch(() => {});
                    o.titlelessWorkflow = {url: rel(page.url()), dialog: flat(await page.locator('[role="dialog"]:visible').last().innerText().catch(() => null), 1000)};
                    await snap(page, 'r-05c-c-titleless-workflow', {facts: o.titlelessWorkflow});
                }
                await openNative(R.path); await openExportTab(); await listSettle();
                o.cListAfterSection = await readExportList();
                await snap(page, 'r-06-c-export-list-after-section', {facts: o.cListAfterSection});
            } else {
                // a series the press lacks
                let x = xml.replace(/Kestrel submitted/g, 'Mink series problem');
                o.srcSeries = (xml.match(/<series[\s\S]*?<\/series>/) || [null])[0];
                if (!/<series[\s>]/.test(x)) {
                    // the publication's children: the series goes where the schema puts it; try after the authors / before representation
                    x = x.replace(/(\s*)<\/publication>/, '$1  <series><title locale="en">Zed Series</title><path>zzz</path></series>$1</publication>');
                } else x = x.replace(/<series([\s\S]*?)<path>[^<]*<\/path>/, '<series$1<path>zzz</path>');
                const f = path.join(outDir(), `k2-serieszzz-${app.name}.xml`); fs.writeFileSync(f, x);
                await openNative(R.path);
                o.seriesUp = await uploadImport(f);
                o.series = await pressImport();
                await snap(page, 'r-04-import-unknown-series', {facts: o.series});
                o.dashMink = await dashboardFind(R.path, 'Mink');
                await snap(page, 'r-05-c-dashboard-mink', {facts: o.dashMink});
                await go(cu(R.path, '/management/settings/context')); await sleep(1500); await idle(page).catch(() => {});
                const st = page.getByRole('tab', {name: 'Series', exact: true});
                if (await st.count()) { await st.first().click(); await sleep(1500); await idle(page).catch(() => {}); o.seriesTab = flat(await page.locator('[role="tabpanel"]:visible').first().innerText().catch(() => null), 1000); }
                await snap(page, 'r-06-c-series-after', {facts: {series: o.seriesTab}});
            }
            await out();
            fact('problems', o);
        });

        // ------------------------------------------------------------ onix {OMP}: Rule 19, Settings 7, OMP2, td12
        await sect('onix', async () => {
            if (!isOMP) return;
            const o = {};
            const O = S.O;
            await as(O.mgr, O.path);
            await openNative(O.path); await openExportTab();
            const readReminder = async () => {
                const t = (await exportTab().innerText().catch(() => '')) || '';
                const m = t.match(/[^\n]*missing some required information[^\n]*/);
                return m ? flat(m[0], 400) : null;
            };
            o.before = await readReminder();
            // on the Export tab only, or also elsewhere on the page?
            o.importTabHasReminder = /missing some required information/i.test(await page.locator('#import-tab').innerText().catch(() => ''));
            await snap(page, 'o-01-omp-export-reminder', {facts: {reminder: o.before}});
            const link = exportTab().getByRole('link', {name: 'Press Settings'});
            o.linkCount = await link.count();
            if (o.linkCount) {
                o.linkHref = rel(await link.first().getAttribute('href'));
                await loc(page, 'Native XML Export (press): the reminder\'s "Press Settings" link', link);
                await link.first().click(); await page.waitForLoadState('load').catch(() => {}); await sleep(1500); await idle(page).catch(() => {});
                o.linkLands = {url: rel(page.url()), tabs: await tabStrips(page)};
                await snap(page, 'o-02-omp-press-settings-from-link', {facts: o.linkLands});
            }
            // fill the four on Settings › Press › Masthead
            await go(cu(O.path, '/management/settings/context'));
            await page.getByRole('tab', {name: 'Masthead'}).first().click().catch(() => {});
            await sleep(1200); await idle(page).catch(() => {});
            const form = page.locator('form#masthead, .pkpForm').filter({has: page.locator('input[name=publisher], [name=publisher]')}).first();
            o.formFound = await form.count();
            const fields = await page.evaluate(() => ['publisher', 'location', 'codeType', 'codeValue'].map((n) => {
                const e = document.querySelector(`[name="${n}"]`);
                if (!e) return {n, found: false};
                const lab = e.id && document.querySelector(`label[for="${e.id}"]`);
                return {n, found: true, tag: e.tagName, value: e.value, label: lab ? lab.innerText.trim() : null, options: e.tagName === 'SELECT' ? [...e.options].slice(0, 6).map((x) => `${x.value}:${x.text.trim()}`) : undefined};
            }));
            o.fields = fields;
            await snap(page, 'o-03-omp-masthead-before', {facts: {fields}});
            const fill = async (n, v) => {
                const e = page.locator(`[name="${n}"]`).first();
                if (!(await e.count())) return 'absent';
                const tagName = await e.evaluate((x) => x.tagName);
                if (tagName === 'SELECT') { const opts = await e.locator('option').evaluateAll((os) => os.map((x) => x.value).filter(Boolean)); await e.selectOption(v || opts[0]); return 'selected'; }
                await e.fill(v); return 'filled';
            };
            o.fill = {publisher: await fill('publisher', 'K2 Publisher'), location: await fill('location', 'Vancouver'), codeType: await fill('codeType', null), codeValue: await fill('codeValue', 'K2CODE')};
            const saveBtn = page.locator('.pkpFormPage, form').filter({has: page.locator('[name=publisher]')}).getByRole('button', {name: 'Save'}).first();
            await saveBtn.click();
            await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 15_000}).catch(() => { o.savedStatus = 'not seen'; });
            o.pageErrors = await page.locator('.pkpFormPage__status, .pkpFieldError, [role="alert"]').allInnerTexts().catch(() => []);
            await snap(page, 'o-04-omp-masthead-saved', {facts: o.fill});
            await openNative(O.path); await openExportTab();
            o.afterFill = await readReminder();
            await snap(page, 'o-05-omp-export-after-fill', {facts: {reminder: o.afterFill}});
            // one blank again (the code)
            await go(cu(O.path, '/management/settings/context'));
            await page.getByRole('tab', {name: 'Masthead'}).first().click().catch(() => {});
            await sleep(1200); await idle(page).catch(() => {});
            await page.locator('[name="codeValue"]').first().fill('');
            await page.locator('.pkpFormPage, form').filter({has: page.locator('[name=publisher]')}).getByRole('button', {name: 'Save'}).first().click();
            await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 15_000}).catch(() => { o.savedStatus2 = 'not seen'; });
            await openNative(O.path); await openExportTab();
            o.oneBlank = await readReminder();
            await snap(page, 'o-06-omp-export-one-blank', {facts: {reminder: o.oneBlank}});
            await out();
            fact('onix', o);
        });

        // ------------------------------------------------------------ leave: the page left with a file up, unsaved
        await sect('leave', async () => {
            const o = {};
            await as(S.C.mgr, S.C.path);
            await openNative(S.C.path);
            const f = S.fileS1 && fs.existsSync(S.fileS1) ? S.fileS1 : path.join(outDir(), `k2-plain-${app.name}.txt`);
            o.up = await uploadImport(f);
            const d0 = browserDialogs.length;
            // switch tab
            await page.getByRole('tab', {name: exportTabName, exact: true}).first().click(); await sleep(800);
            o.tabSwitchDialogs = browserDialogs.slice(d0);
            await page.getByRole('tab', {name: 'Import', exact: true}).first().click(); await sleep(500);
            o.boxAfterTabSwitch = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 300);
            // tick a submission (none in C? C has the problem imports) then leave via the side menu
            const d1 = browserDialogs.length;
            await page.locator('#importXmlForm').click({position: {x: 5, y: 5}}).catch(() => {});
            const nav = page.getByRole('navigation', {name: 'Site Navigation'}).getByRole('link', {name: 'Tools', exact: true});
            if (await nav.count()) { await nav.first().click(); await page.waitForLoadState('load').catch(() => {}); } else await go(cu(S.C.path, '/management/tools'));
            await sleep(800);
            o.leaveDialogs = browserDialogs.slice(d1);
            o.urlAfterLeave = rel(page.url());
            await snap(page, 'v-01-left-native-with-file', {facts: o});
            await page.goBack().catch(() => {}); await sleep(1000); await idle(page).catch(() => {});
            o.backBox = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 300);
            await out();
            fact('leave', o);
        });
    } finally {
        record('k2-dialogs', browserDialogs);
        await close();
    }
});
