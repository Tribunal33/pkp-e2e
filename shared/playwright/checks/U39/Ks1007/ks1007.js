// U39 claim check, chunk Ks1007 — upstream-sync accommodation for pkp/pkp-lib e60013c77f
// (#13432, "Ensure consistent library file policy checks": the library download moved into
// FileApiHandler::downloadLibraryFile(), an unknown or deleted libraryFileId answers the
// "403 Forbidden" text instead of an empty body).
// docs/specs/U39-submission-and-publisher-libraries.md: Rule 5 (144–154), Rules 8b and 10b's
// "403 Forbidden" pages, register A8 and A10, notes d, f, g, l, f-a8, f-a10, the Coverage rows
// naming A8 and A10, the code-anchor line naming pages/libraryFiles.
//
// Seeds its own scratch contexts per app and run (nothing on publicknowledge):
//   A — manager mg, section editor se (Moderator on OPS), author au (the submitter); OJS/OMP also
//       editor ed, copyeditor ce, marketing and sales coordinator mk, funding coordinator fc;
//       OMP also chapter author ca. Publisher Library: "Ks PL public" (Other, Public Access),
//       "Ks PL private" (Reports), "Ks PL delete" (Permissions, Public Access; deleted here).
//       S1 (Submission stage) with se, ce, mk, fc, ca assigned; Library "Ks S1 notes" (Other) and
//       "Ks S1 delete" (Marketing; deleted here). S2: Library "Ks S2 file" (Reports).
//   B — manager mg; Publisher Library "Ks B public" (Other, Public Access): another journal's file.
//
//   PROBE_FEATURE=U39 PROBE_AGENT=ccKs1007 PROBE_RUN=r1 node bin/probe.js all shared/playwright/checks/U39/Ks1007/ks1007.js
//   PHASES=roles,composer,delete,public (default all, in that order; public reads the file
//   delete removed). No assertions: facts-<run>-<app>.json, the screen snapshots and the console
//   log ([app phase] lines) carry what the report cites.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir, serverLog} = require('../../../probe');

const ALL = 'roles,composer,delete,public';
const PHASES = (process.env.PHASES || ALL).split(',');
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s || '').replace(/\s*\n+\s*/g, ' | ').replace(/[ \t]+/g, ' ').slice(0, n);
const rel = (u) => (u || '').replace(/^.*\/index\.php/, '');

const SUB_GRID = 'div[id^="component-grid-files-submissiondocuments-submissiondocumentsfilesgrid"]';
const PUB_GRID = 'div[id^="component-grid-settings-library-libraryfileadmingrid"]';
const TAB_NAME = {ojs: 'Publisher Library', omp: 'Press Library', ops: 'Preprint Server Library'};
const AUTHOR_LEVEL = ['au', 'ca'];

async function seed(app) {
    const ops = app.name === 'ops';
    const omp = app.name === 'omp';
    const pdf = ops ? 'preprint.pdf' : 'article.pdf';
    const t = tag('u39s07a');
    const u = (s) => `${t}${s}`;
    const roles = [['mg', 'manager', 'Mona', 'Manager'], ['se', 'sectionEditor', 'Sean', 'Section'], ['au', 'author', 'Ava', 'Author']];
    if (!ops) roles.push(['ed', 'editor', 'Eddie', 'Editor'], ['ce', 'copyeditor', 'Cora', 'Copy'], ['mk', 'marketing', 'Mark', 'Marketing'], ['fc', 'funding', 'Fay', 'Funding']);
    if (omp) roles.push(['ca', 'chapterAuthor', 'Carl', 'Chapter']);
    const users = roles.map(([k, role, g, f]) => ({username: u(k), roles: [role], givenName: g, familyName: f}));
    const CA = await app.api.createContext({tag: t, context: {name: `U39 Ks1007 ${t}`, acronym: 'KSA'}, users, libraryFiles: [
        {name: 'Ks PL public', type: 'Other', publicAccess: true, file: pdf},
        {name: 'Ks PL private', type: 'Reports', publicAccess: false, file: pdf},
        {name: 'Ks PL delete', type: 'Permissions', publicAccess: true, file: pdf},
    ]});
    const A = {t, path: CA.path, users: Object.fromEntries(roles.map(([k, role]) => [k, {username: u(k), role}])), libraryFiles: CA.libraryFiles};
    const parts = roles.filter(([k]) => !['mg', 'ed', 'au'].includes(k)).map(([k, role]) => ({username: u(k), role}));
    A.S1 = await app.api.createSubmission({tag: `${t}s1`, context: A.path, submitter: u('au'), title: `Ks S1 ${t}`, participants: parts,
        libraryFiles: [{name: 'Ks S1 notes', type: 'Other', file: pdf}, {name: 'Ks S1 delete', type: 'Marketing', file: pdf}]});
    A.S2 = await app.api.createSubmission({tag: `${t}s2`, context: A.path, submitter: u('au'), title: `Ks S2 ${t}`,
        participants: [{username: u('se'), role: 'sectionEditor'}], libraryFiles: [{name: 'Ks S2 file', type: 'Reports', file: pdf}]});
    const tb = tag('u39s07b');
    const CB = await app.api.createContext({tag: tb, context: {name: `U39 Ks1007 ${tb}`, acronym: 'KSB'},
        users: [{username: `${tb}mg`, roles: ['manager'], givenName: 'Bea', familyName: 'Manager'}],
        libraryFiles: [{name: 'Ks B public', type: 'Other', publicAccess: true, file: pdf}]});
    const B = {t: tb, path: CB.path, libraryFiles: CB.libraryFiles};
    const S = {A, B};
    record('seed', S);
    return S;
}

function helpers(app, context, page) {
    const h = {phase: '', facts: {}};
    const log = serverLog(app);
    h.L = (...a) => console.log(`[${app.name}${h.phase ? ' ' + h.phase : ''}]`, ...a);
    h.put = (k, v) => { h.facts[`${h.phase}.${k}`] = v; h.L(k, typeof v === 'string' ? v : JSON.stringify(v).slice(0, 2500)); };
    h.snap = async (name, extra) => { const s = await screen(page); record(name, extra ? {...s, extra} : s); await shot(page, name).catch(() => {}); return s; };
    h.dialogs = [];
    h.acceptConfirm = false;
    page.on('dialog', async (d) => {
        h.dialogs.push({type: d.type(), message: d.message(), phase: h.phase});
        h.L('BROWSER DIALOG', d.type(), d.message());
        if (d.type() === 'beforeunload' || h.acceptConfirm) await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    h.edUrl = (ctx, id) => app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${id}`);
    h.auUrl = (ctx, id) => app.url(`/index.php/${ctx}/en/dashboard/mySubmissions?workflowSubmissionId=${id}`);
    h.wfUrl = (ctx, id, k) => (AUTHOR_LEVEL.includes(k) ? h.auUrl(ctx, id) : h.edUrl(ctx, id));
    h.libButton = () => page.getByRole('button', {name: 'Library', exact: true});
    h.openWf = async (ctx, id, k) => {
        await page.goto(h.wfUrl(ctx, id, k));
        await idle(page);
        await h.libButton().first().waitFor({timeout: 20000}).catch(() => {});
        await idle(page);
        return h.libButton();
    };
    h.subGrid = () => page.locator(SUB_GRID).first();
    h.pubGrid = () => page.locator(PUB_GRID).last();
    h.openLibrary = async () => {
        if (!(await h.libButton().count())) return null;
        await h.libButton().first().click();
        await h.subGrid().waitFor({timeout: 30000});
        await idle(page); await sleep(300);
        return h.subGrid();
    };
    h.openVDL = async () => {
        const b = h.subGrid().getByRole('link', {name: 'View Document Library', exact: true});
        if (!(await b.count())) return null;
        await b.first().click();
        await page.locator(PUB_GRID).first().waitFor({timeout: 30000});
        await idle(page); await sleep(300);
        return h.pubGrid();
    };
    h.closeDialog = async (name) => {
        const d = page.getByRole('dialog', {name, exact: true}).last();
        const c = d.getByRole('button', {name: 'Close', exact: true}).first();
        if (await c.count()) { await c.click(); await d.waitFor({state: 'hidden', timeout: 10000}).catch(() => {}); await idle(page); return true; }
        return false;
    };
    h.openTab = async (ctx) => {
        await page.goto(app.url(`/index.php/${ctx}/en/management/settings/workflow`));
        await idle(page);
        const tab = page.getByRole('tab', {name: TAB_NAME[app.name], exact: true});
        if (!(await tab.count())) return null;
        await tab.click();
        await page.locator(PUB_GRID).first().waitFor({timeout: 30000});
        await idle(page); await sleep(300);
        return h.pubGrid();
    };
    // A legacy library grid as data: groups in order, each row's name, arrow and address.
    h.gridInfo = async (grid) => grid.evaluate((g) => {
        const vis = (e) => !!(e && e.getClientRects().length);
        const text = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const out = {heading: text(g.querySelector('.header h4')), actions: [...g.querySelectorAll('.header a')].filter(vis).map(text), groups: []};
        for (const tb of g.querySelectorAll('tbody.category_grid_body')) {
            const trs = [...tb.querySelectorAll(':scope > tr.gridRow')];
            const label = text(trs[0]);
            const rows = trs.slice(1).filter(vis).map((tr) => {
                const a = tr.querySelector('a.pkp_linkaction_downloadFile') || tr.querySelector('.gridCellContainer a');
                return {name: text(a), arrow: !!tr.querySelector('a.show_extras, a.hide_extras'), href: a ? a.getAttribute('href') : null};
            });
            const ph = document.getElementById(`${tb.id}-emptyPlaceholder`);
            out.groups.push({label, rows, empty: ph && vis(ph) ? text(ph) : null});
        }
        return out;
    });
    h.groups = (gi) => gi.groups.map((x) => `${x.label}: ${x.rows.length ? x.rows.map((r) => r.name + (r.arrow ? '>' : '')).join(', ') : x.empty}`).join(' / ');
    h.hrefOf = (gi, name) => (gi.groups.flatMap((x) => x.rows).find((r) => r.name === name) || {}).href || null;
    h.rowActions = async (grid, name) => {
        const row = grid.locator('tr.gridRow').filter({has: page.getByRole('link', {name, exact: true})}).first();
        const arrow = row.locator('a.show_extras').first();
        const open = await row.locator('a.hide_extras').count(); // the strip stays open after a "Cancel"
        if (!(await arrow.count()) && !open) return null;
        if (!open) await arrow.click();
        const actions = row.locator('xpath=following-sibling::tr[1]');
        await actions.getByRole('link', {name: 'Delete', exact: true}).first().waitFor({timeout: 10000}).catch(() => {});
        return {actions, texts: (await actions.getByRole('link').allInnerTexts().catch(() => [])).map((s) => s.trim()).filter(Boolean),
            del: actions.getByRole('link', {name: 'Delete', exact: true}).first()};
    };
    h.confirm = () => page.locator('[role="dialog"]:visible').filter({hasText: 'Are you sure you wish to delete this item?'}).last();
    h.notices = async () => (await page.locator('.pkpNotification:visible, .app__notifications:visible, [role="alert"]:visible, .ui-pnotify:visible, .pkp_notification:visible').allInnerTexts().catch(() => [])).map((s) => flat(s, 200)).filter(Boolean);
    // Press a link that downloads (in place or in a new tab) or leaves for a page: what came back.
    h.download = async (link, label) => {
        const before = page.url();
        const responses = [];
        const onResp = (r) => {
            if (/download-library-file|libraryFiles/.test(r.url())) responses.push({url: rel(r.url()), status: r.status(), type: r.headers()['content-type'], disp: r.headers()['content-disposition']});
        };
        context.on('response', onResp);
        const from = log.mark();
        const dl = page.waitForEvent('download', {timeout: 15000}).then((d) => ({d})).catch(() => null);
        const nav = page.waitForEvent('framenavigated', {timeout: 15000}).then((f) => (f === page.mainFrame() ? {nav: f.url()} : null)).catch(() => null);
        const pop = context.waitForEvent('page', {timeout: 15000}).then((p) => ({p})).catch(() => null);
        await link.click();
        let out;
        const r = await Promise.race([dl, nav.then(async (n) => { if (!n) return null; await sleep(1500); return n; }), pop]);
        const saved = async (d, where) => ({kind: 'download', where, name: d.suggestedFilename(), url: rel(d.url()), stayed: page.url() === before});
        if (r && r.d) out = await saved(r.d, 'page');
        else if (r && r.p) {
            const p = r.p;
            const d2 = await Promise.race([p.waitForEvent('download', {timeout: 8000}).then((d) => ({d})).catch(() => null),
                p.waitForLoadState('domcontentloaded', {timeout: 8000}).then(() => sleep(1500)).then(() => null).catch(() => null)]);
            if (d2 && d2.d) out = await saved(d2.d, 'new tab');
            else {
                const s = await screen(p).catch(() => null);
                if (s) record(`${label}-tab`, s);
                await shot(p, `${label}-tab`).catch(() => {});
                out = {kind: 'popup', url: rel(p.url()), text: flat(await p.locator('body').innerText({timeout: 5000}).catch(() => null), 300), stayed: page.url() === before};
            }
            await p.close().catch(() => {});
        } else {
            const d2 = await Promise.race([dl, sleep(3000).then(() => null)]);
            if (d2 && d2.d) out = await saved(d2.d, 'page');
            else {
                await page.waitForLoadState('domcontentloaded').catch(() => {});
                const s = await h.snap(`${label}-page`);
                out = {kind: page.url() === before ? 'none' : 'navigated', url: rel(page.url()), text: flat(s.text.main, 300), aria: s.aria.main && s.aria.main.slice(0, 200)};
            }
        }
        context.off('response', onResp);
        out.responses = responses;
        out.serverLog = log.since(from).slice(0, 5);
        if (out.kind === 'download' && out.where === 'page') await sleep(2100); // past PostAndRedirectRequest's two-second timer (A9)
        return out;
    };
    // Type an address into the bar: the answer's status and headers, a download, or the page.
    h.visit = async (addr, label) => {
        if (!addr) return {addr: null};
        const full = addr.startsWith('http') ? addr : app.url(addr.startsWith('/index.php') ? addr : `/index.php${addr}`);
        let info = null;
        const onResp = (rp) => { if (rp.url() === full && rp.request().isNavigationRequest()) info = {status: rp.status(), type: rp.headers()['content-type'], disp: rp.headers()['content-disposition'] || null, length: rp.headers()['content-length'] || null}; };
        page.on('response', onResp);
        const from = log.mark();
        const dl = page.waitForEvent('download', {timeout: 6000}).then((d) => d.suggestedFilename()).catch(() => null);
        const rr = await page.goto(full).catch((e) => ({err: String(e.message || e).split('\n')[0].slice(0, 160)}));
        const download = await Promise.race([dl, sleep(rr && rr.err ? 3000 : 800).then(() => null)]);
        await sleep(300);
        page.off('response', onResp);
        if (!info && rr && rr.status) info = {status: rr.status(), type: rr.headers()['content-type'], disp: rr.headers()['content-disposition'] || null};
        let s = null;
        if (!download) s = await h.snap(label).catch(() => null);
        const out = {addr: rel(full), ...info, err: rr && rr.err, download, url: rel(page.url()),
            text: s ? flat(s.text.main || s.text.header, 200) : null, title: s ? s.title : null, serverLog: log.since(from).slice(0, 5)};
        h.put(`visit:${label}`, out);
        return out;
    };
    // The decision page's "Attach Files" › "Library Files" (Rule 11), as the signed-in user.
    h.libWin = () => page.getByRole('dialog', {name: 'Library Files', exact: true}).last();
    h.libItem = (name) => h.libWin().locator('.selectSubmissionFileListItem').filter({hasText: name}).first();
    h.libraryFiles = async (ctx, sub, label) => {
        const resp = await page.goto(app.url(`/index.php/${ctx}/en/decision/record/${sub.submissionId}?decision=8`)).catch(() => null);
        await idle(page); await sleep(800);
        const attach = page.getByRole('button', {name: 'Attach Files', exact: true}).first();
        const out = {status: resp && resp.status ? resp.status() : null, attach: await attach.count()};
        if (!out.attach) { const s = await h.snap(`${label}-no-attach`); out.page = flat(s.text.main, 300); return out; }
        await attach.click(); await sleep(800); await idle(page);
        const lb = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: 'Attach Library Files', exact: true}).first();
        out.libraryButton = await lb.count();
        if (!out.libraryButton) return out;
        await lb.click(); await sleep(1000); await idle(page);
        await h.libWin().locator('.selectSubmissionFileListItem, :text("No items found.")').first().waitFor({timeout: 20000}).catch(() => {});
        const s = await h.snap(`${label}-library-files`);
        out.items = await h.libWin().locator('.selectSubmissionFileListItem').evaluateAll((els) => els.map((e) => {
            const a = e.querySelector('a');
            return {text: e.innerText.replace(/\s*\n+\s*/g, ' | ').trim(), href: a ? a.getAttribute('href') : null, target: a ? a.getAttribute('target') : null};
        }));
        out.list = flat(s.text.dialog, 800);
        return out;
    };
    return h;
}

forEachApp(async (app) => {
    const ops = app.name === 'ops';
    const omp = app.name === 'omp';
    const S = await seed(app);
    const {A, B} = S;
    console.log(`[${app.name} seed]`, JSON.stringify({A: A.path, S1: A.S1.submissionId, S1lib: A.S1.libraryFiles.map((f) => [f.id, f.name]), S2: A.S2.submissionId,
        S2lib: A.S2.libraryFiles.map((f) => [f.id, f.name]), PL: A.libraryFiles.map((f) => [f.id, f.name]), B: B.path, BPL: B.libraryFiles.map((f) => [f.id, f.name])}));
    const U = (k) => (k === 'admin' ? 'admin' : A.users[k].username);
    const PL = Object.fromEntries(A.libraryFiles.map((f) => [f.name, f]));
    const pubAddr = (ctx, id) => `/${ctx}/libraryFiles/downloadPublic/${id}`;
    const {context, page, close} = await launch(app);
    const h = helpers(app, context, page);
    const sect = async (label, fn) => {
        try { await fn(); } catch (e) {
            h.L('ERROR', label, String(e.stack || e.message).slice(0, 1200));
            h.facts[`${label}.ERROR`] = String(e.message || e).slice(0, 400);
            await h.snap(`error-${label}`).catch(() => {});
        }
    };
    try {
        // =====================================================================
        // Rule 8b, A10, notes d and f: every permission level on S1, a Submission Library file's
        // name and a Publisher Library file's name in "View Document Library".
        if (on('roles')) {
            h.phase = 'roles';
            const keys = ops ? ['admin', 'mg', 'se', 'au'] : ['admin', 'mg', 'ed', 'se', 'fc', 'ce', 'mk', 'au'].concat(omp ? ['ca'] : []);
            for (const k of keys) await sect(`roles-${k}`, async () => {
                await signIn(page, U(k), {contextPath: A.path});
                await h.openWf(A.path, A.S1.submissionId, k);
                const r = {user: U(k), library: await h.libButton().count()};
                if (!r.library) { const s = await h.snap(`roles-${k}-no-library`); r.page = flat(s.text.dialog || s.text.main, 300); h.put(k, r); return; }
                const grid = await h.openLibrary();
                const gi = await h.gridInfo(grid);
                r.sub = h.groups(gi);
                await h.snap(`roles-${k}-sublib`);
                const vdl = await h.openVDL();
                if (vdl) {
                    const vi = await h.gridInfo(vdl);
                    r.vdl = h.groups(vi);
                    await h.snap(`roles-${k}-vdl`);
                    if (k === 'mg') await loc(page, '"View Document Library" file name (download link)', vdl.getByRole('link', {name: 'Ks PL private', exact: true}));
                    r.plDownload = await h.download(h.pubGrid().getByRole('link', {name: 'Ks PL private', exact: true}), `roles-${k}-pl`);
                    if (r.plDownload.kind === 'navigated') { await h.openWf(A.path, A.S1.submissionId, k); await h.openLibrary(); } else await h.closeDialog('View Document Library');
                }
                if (k === 'mg') await loc(page, 'Submission Library file name (download link)', h.subGrid().getByRole('link', {name: 'Ks S1 notes', exact: true}));
                r.slDownload = await h.download(h.subGrid().getByRole('link', {name: 'Ks S1 notes', exact: true}), `roles-${k}-sl`);
                h.put(k, r);
            });
        }

        // =====================================================================
        // Note d ("the composer's Download is the same address"), Rule 8b/A10 on that path.
        if (on('composer')) {
            h.phase = 'composer';
            for (const k of (ops ? ['mg', 'se'] : ['ed', 'se'])) await sect(`composer-${k}`, async () => {
                await signIn(page, U(k), {contextPath: A.path});
                const lf = await h.libraryFiles(A.path, A.S1, `composer-${k}`);
                const r = {list: lf.list, items: lf.items && lf.items.map((i) => `${i.text} -> ${rel(i.href)} target=${i.target}`)};
                if (lf.items) {
                    r.dlSub = await h.download(h.libItem('Ks S1 notes').getByRole('link', {name: 'Download'}), `composer-${k}-sl`);
                    r.dlPub = await h.download(h.libItem('Ks PL private').getByRole('link', {name: 'Download'}), `composer-${k}-pl`);
                }
                h.put(k, r);
            });
        }

        // =====================================================================
        // Rule 5, A8, notes l and f-a8: "Delete" in both libraries, then the old addresses.
        if (on('delete')) {
            h.phase = 'delete';
            const mgr = ops ? 'mg' : 'ed';
            await sect('delete-sl', async () => {
                h.phase = 'delete-sl'; // own fact keys: the two libraries' reads share names
                await signIn(page, U(mgr), {contextPath: A.path});
                h.put('libraryFilesBefore', (await h.libraryFiles(A.path, A.S1, 'delete-sl-before')).list);
                await h.openWf(A.path, A.S1.submissionId, mgr);
                let grid = await h.openLibrary();
                const g0 = await h.gridInfo(grid);
                const href = h.hrefOf(g0, 'Ks S1 delete');
                h.put('before', {groups: h.groups(g0), href: rel(href)});
                h.put('downloadBefore', await h.download(grid.getByRole('link', {name: 'Ks S1 delete', exact: true}), 'delete-sl-dl-before'));
                let ra = await h.rowActions(h.subGrid(), 'Ks S1 delete');
                h.put('strip', ra && ra.texts);
                await ra.del.click();
                await h.confirm().waitFor({timeout: 15000});
                const sc = await h.snap('delete-sl-confirm');
                await loc(page, 'Delete confirmation dialog', h.confirm());
                h.put('confirm', {aria: (sc.aria.dialogs.slice(-1)[0] || '').slice(0, 600), text: flat(sc.text.dialog, 300)});
                await h.confirm().getByRole('button', {name: 'Cancel', exact: true}).click();
                await sleep(800); await idle(page);
                h.put('afterCancel', h.groups(await h.gridInfo(h.subGrid())));
                ra = await h.rowActions(h.subGrid(), 'Ks S1 delete');
                await ra.del.click();
                await h.confirm().waitFor({timeout: 15000});
                const resp = page.waitForResponse((r) => r.request().method() === 'POST' && /delete-file/.test(r.url()), {timeout: 10000}).then((r) => r.status()).catch(() => null);
                await h.confirm().getByRole('button', {name: 'OK', exact: true}).click();
                const st = await resp; await sleep(1200); await idle(page);
                const sa = await h.snap('delete-sl-after-ok');
                h.put('afterOk', {status: st, groups: h.groups(await h.gridInfo(h.subGrid())), notices: sa.notices, visibleNotices: await h.notices()});
                await page.reload(); await idle(page);
                await h.libButton().first().waitFor({timeout: 20000}).catch(() => {});
                grid = await h.openLibrary();
                await h.snap('delete-sl-after-reload');
                h.put('afterReload', h.groups(await h.gridInfo(grid)));
                await h.closeDialog('Submission Library');
                // The old address, opened again; the same address with a number no file has.
                await h.visit(href, 'delete-sl-old-address');
                await h.visit(href && href.replace(/libraryFileId=\d+/, 'libraryFileId=999999'), 'delete-sl-unknown-number');
                h.put('libraryFilesAfter', (await h.libraryFiles(A.path, A.S1, 'delete-sl-after')).list);
            });
            await sect('delete-pl', async () => {
                h.phase = 'delete-pl';
                await signIn(page, U('mg'), {contextPath: A.path});
                let grid = await h.openTab(A.path);
                const g0 = await h.gridInfo(grid);
                const href = h.hrefOf(g0, 'Ks PL delete');
                h.put('tabBefore', {groups: h.groups(g0), href: rel(href)});
                await h.snap('delete-pl-tab-before');
                const pa = pubAddr(A.path, PL['Ks PL delete'].id);
                await h.visit(pa, 'delete-pl-public-before');
                grid = await h.openTab(A.path);
                h.put('downloadBefore', await h.download(grid.getByRole('link', {name: 'Ks PL delete', exact: true}), 'delete-pl-dl-before'));
                const ra = await h.rowActions(h.pubGrid(), 'Ks PL delete');
                await ra.del.click();
                await h.confirm().waitFor({timeout: 15000});
                const sc = await h.snap('delete-pl-confirm');
                h.put('confirm', flat(sc.text.dialog, 300));
                await h.confirm().getByRole('button', {name: 'OK', exact: true}).click();
                await sleep(1200); await idle(page);
                const sa = await h.snap('delete-pl-after-ok');
                h.put('afterOk', {groups: h.groups(await h.gridInfo(h.pubGrid())), notices: sa.notices});
                grid = await h.openTab(A.path);
                h.put('afterReload', h.groups(await h.gridInfo(grid)));
                // Leave the tab once with "Add a file" holding a typed name (the sweep's unsaved exit).
                await grid.getByRole('link', {name: 'Add a file', exact: true}).first().click();
                const f = page.locator('form').filter({has: page.locator('input[name^="libraryFileName"]')}).last();
                await f.waitFor({timeout: 30000}); await idle(page);
                await f.locator('input[name^="libraryFileName"]').first().fill('Ks unsaved');
                await f.locator('input[name^="libraryFileName"]').first().blur();
                const nd = h.dialogs.length;
                await h.visit(href, 'delete-pl-old-address');
                h.put('leaveDialogs', h.dialogs.slice(nd));
                await h.visit(pa, 'delete-pl-public-after-signed-in');
                h.put('libraryFilesAfter', (await h.libraryFiles(A.path, A.S1, 'delete-pl-after')).list);
                await h.openWf(A.path, A.S1.submissionId, 'mg');
                await h.openLibrary();
                const vdl = await h.openVDL();
                h.put('vdlAfter', vdl ? h.groups(await h.gridInfo(vdl)) : null);
                await h.snap('delete-pl-vdl-after');
            });
        }

        // =====================================================================
        // Rule 10b, A10, notes g, f-a10: the public address, signed out (and one signed in).
        if (on('public')) {
            h.phase = 'public';
            await sect('public', async () => {
                await signIn(page, U('mg'), {contextPath: A.path});
                await h.visit(pubAddr(A.path, PL['Ks PL private'].id), 'public-in-unticked');
                await signOut(page);
                await h.visit(pubAddr(A.path, PL['Ks PL public'].id), 'public-out-ticked');
                await h.visit(pubAddr(A.path, PL['Ks PL private'].id), 'public-out-unticked');
                await h.visit(pubAddr(A.path, A.S2.libraryFiles[0].id), 'public-out-sl-file');
                await h.visit(pubAddr(A.path, PL['Ks PL delete'].id), 'public-out-deleted');
                await h.visit(pubAddr(A.path, 999999), 'public-out-unknown');
                await h.visit(pubAddr(A.path, B.libraryFiles[0].id), 'public-out-other-journal');
                await h.visit(pubAddr(B.path, B.libraryFiles[0].id), 'public-out-other-journal-own-address');
            });
        }

    } finally {
        h.facts.dialogs = h.dialogs;
        record('facts', h.facts);
        await close();
    }
});
