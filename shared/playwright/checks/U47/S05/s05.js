// U47 claim check, chunk S05 (upstream sync 2026-10-05): a book's HTML file opened from the book page
// after omp 8c807c919 (pkp/pkp-lib#13444, CatalogBookHandler::download() builds its UsageEvent with the
// local $publication). Spec: docs/specs/U47-media-files.md Settings bullet 6 (line 392), register OMP1
// (1021-1028); footnotes m, q27, f-omp1.
//
//   PROBE_FEATURE=U47 PROBE_AGENT=ccS05 PROBE_RUN=r1 node bin/probe.js all shared/playwright/checks/U47/S05/s05.js
//   (run twice, r1 and r2; each run seeds its own scratch contexts, so two runs never share data;
//   PHASES=unsaved with ONLY=ojs,omp runs only the Website settings tab left unsaved, the 2026-10-05 runs r1u, r2u)
//
// Per app, one scratch context with a manager (mg) and a reader (rd):
//   OMP  a published book with an "HTML" format (article.html, which names figure.png), a "Notes" format
//        (notes.md, a file no viewer plugin takes) and a web figure.png on its "Media" page.
//   OJS  a published article (Vol. 1 No. 1 2026) with an "HTML" galley (article.html) and a web figure.png.
//   OPS  read-only control: the Plugins list (no HTML galley plugin, note q27).
// For OMP and OJS: the Plugins row as it arrives, then the visitor (signed out), the Reader and the manager
// open the HTML file from the book (article) page, with the plugin on, off, and on again; each read records
// the screen, the catalog/article responses (status, type, disposition), any download, the usage log lines
// and the server log lines written since. No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, serverLog} = require('../../../probe');
const {usageLog} = require('../../issues/book-file-open-download-fails/lib');

const T = 30_000;
const log = (...a) => console.log('[s05]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php/, '') : u);
const PLUGIN = {omp: 'htmlmonographfileplugin', ojs: 'htmlarticlegalleyplugin'};
// PHASES=unsaved runs the seed, the install read and the unsaved-tab sweep alone (default: everything)
const PHASES = process.env.PHASES || 'all';
const PROBE_RUN_FIRST = (process.env.PROBE_RUN || 'r1') === 'r1';

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOJS = app.name === 'ojs';
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('s05-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 1500)); };

    // ------------------------------------------------------------------ seed
    const t = tag('u47s05');
    const users = [
        {username: `${t}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
        {username: `${t}rd`, roles: ['reader'], givenName: 'Rey', familyName: 'Reader'},
    ];
    const cspec = {tag: t, context: {name: `U47 S05 ${t}`, acronym: 'SFIVE', contactName: 'S05 Contact', contactEmail: `${t}c@mail.test`}, users};
    if (isOJS) cspec.issues = [{volume: 1, number: 1, year: 2026, published: true}];
    const ctx = await app.api.createContext(cspec);
    const C = {path: ctx.path || t, mg: `${t}mg`, rd: `${t}rd`};
    let sub = null;
    if (isOMP) {
        sub = await app.api.createSubmission({tag: `${t}b`, context: C.path, submitter: C.mg, title: `S05 book ${t}`,
            files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction'],
            publicationFormats: [{name: 'HTML', file: 'article.html'}, {name: 'Notes', file: 'notes.md'}, {name: 'Web Text', file: 'article.html', genre: 'Book Manuscript'}],
            mediaFiles: [{file: 'figure.png'}], published: true});
    } else if (isOJS) {
        sub = await app.api.createSubmission({tag: `${t}a`, context: C.path, submitter: C.mg, title: `S05 article ${t}`,
            files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction'],
            galleys: [{label: 'HTML', file: 'article.html'}], mediaFiles: [{file: 'figure.png'}],
            published: true, issue: {volume: 1, number: 1, year: 2026}});
    }
    fact('seed', {context: C.path, submissionId: sub && sub.submissionId, publicationId: sub && sub.publicationId,
        formats: sub && sub.publicationFormats, galleys: sub && sub.galleys, media: sub && sub.mediaFiles});

    // ------------------------------------------------------------------ browser and helpers
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300)}); d.accept().catch(() => {}); });
    const resps = [];
    page.on('response', (r) => {
        const u = r.url();
        if (!/\/(catalog|article|preprint)\/(view|download|book)\/|figure[^/]*\.png/.test(u)) return;
        const h = r.headers();
        resps.push({at: Date.now(), status: r.status(), type: (h['content-type'] || '').split(';')[0], disposition: h['content-disposition'] || null, url: rel(u).slice(0, 200)});
    });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), message: flat(e.message, 200)}));
    const since = (arr, t0) => arr.filter((x) => x.at >= t0).map(({at, ...x}) => x);
    const slog = serverLog(app);
    // the fleet's log, without the Plugin Gallery's dead-[proxy] lines every visit writes (seed-facts "Install defaults")
    const quiet = (lines) => lines.filter((l) => !/pkp\.sfu\.ca|plugin-gallery/.test(l)).map((l) => flat(l, 300)).slice(0, 6);
    const usage = isOMP || isOJS ? usageLog(app) : null;
    const mine = (lines) => lines.filter((l) => l.url && l.url.includes(`/${C.path}/`));

    async function snap(name, extra = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        Object.assign(s, extra);
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    }
    async function sect(name, fn) {
        try { return await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            fact(`${name}.FAILED`, flat(e.message || e, 600));
            await snap(`zz-failed-${name}`).catch(() => {});
            return null;
        }
    }
    let who = null;
    const as = async (user) => {
        if (who === user) return;
        if (user === 'visitor') { await signOut(page).catch(() => {}); who = 'visitor'; return; }
        await signIn(page, user, {contextPath: C.path}); await idle(page); who = user;
    };
    const cUrl = (p) => app.url(`/index.php/${C.path}${p}`);

    // Settings › Website › "Plugins": the HTML plugin's row; tick or untick it, read again after a reload.
    async function pluginRow(want, name) {
        await as(C.mg);
        await page.goto(cUrl('/management/settings/website')); await idle(page);
        await page.locator('#plugins-button').click(); await idle(page);
        await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T});
        const all = await page.locator('#pluginGridContainer tr.gridRow').evaluateAll((els) => els.map((tr) => {
            const box = tr.querySelector('input[type="checkbox"]');
            return {id: tr.id.replace(/^.*-row-/, ''), text: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 90), ticked: box ? box.checked : null};
        }));
        const pid = PLUGIN[app.name];
        const out = {plugins: all.filter((p) => /html|galley|monograph|viewer|lens|pdf/i.test(p.id + p.text))};
        if (!pid) { await snap(name, {plugin: out}); return out; }
        const row = page.locator(`#pluginGridContainer tr.gridRow[id$="-row-${pid}"]`);
        await row.waitFor({timeout: T});
        await loc(page, `Plugins row ${pid}`, row);
        const box = row.getByRole('checkbox').first();
        out.row = flat(await row.innerText(), 200);
        out.before = await box.isChecked();
        if (want !== null && out.before !== want) {
            const t0 = Date.now();
            await box.click({noWaitAfter: true}).catch(() => box.dispatchEvent('click'));
            await sleep(800);
            const dlg = page.locator('[role="dialog"]:visible').last();
            if (await dlg.count()) {
                out.question = flat(await dlg.innerText().catch(() => null), 300);
                await snap(`${name}-question`);
                const ok = dlg.getByRole('button', {name: /^(OK|Yes)$/}).first();
                if (await ok.count()) await ok.click();
            }
            await sleep(1200); await idle(page);
            out.afterSamePage = await row.getByRole('checkbox').first().isChecked().catch(() => null);
            const s = await snap(name, {plugin: out});
            out.notices = s.notices;
            out.dialogs = since(dialogs, t0);
            await page.reload(); await idle(page);
            await page.locator('#plugins-button').click(); await idle(page);
            await row.waitFor({timeout: T});
            out.afterReload = await row.getByRole('checkbox').first().isChecked().catch(() => null);
            await snap(`${name}-reloaded`, {plugin: out});
        } else {
            await snap(name, {plugin: out});
        }
        return out;
    }

    // A frame-hosted or plain HTML page: the figure (alt "Figure 1") and the style sheet, in any frame.
    async function readRender() {
        await idle(page).catch(() => {}); await sleep(800);
        const res = {url: rel(page.url()), title: await page.title().catch(() => null), frames: page.frames().length};
        for (const fr of page.frames()) {
            const d = await fr.evaluate(() => {
                const img = document.querySelector('img[alt="Figure 1"]');
                if (!img) return null;
                return {src: img.getAttribute('src'), complete: img.complete, naturalWidth: img.naturalWidth, h1: document.querySelector('h1')?.innerText, ctype: document.contentType};
            }).catch(() => null);
            if (d) { res.figure = d; res.frameUrl = rel(fr.url()); break; }
        }
        if (res.figure && !res.figure.complete) await sleep(1500);
        res.bodyText = flat(await page.locator('body').innerText().catch(() => ''), 300);
        return res;
    }

    // Press a link on the landing page that should open or save the HTML file.
    async function press(link, name) {
        const t0 = Date.now(); const from = slog.mark(); usage && usage.since();
        const dlP = page.waitForEvent('download', {timeout: 10_000}).catch(() => null);
        await link.click({timeout: 10_000}).catch((e) => log('click', flat(e.message, 120)));
        const d = await dlP;
        let download = null;
        if (d) {
            download = {suggested: d.suggestedFilename(), url: rel(d.url()).slice(0, 200), failure: await d.failure().catch((e) => `error ${flat(e.message, 100)}`)};
            const p = !download.failure && (await d.path().catch(() => null));
            if (p) download.bytes = fs.statSync(p).size;
        }
        await page.waitForLoadState('load').catch(() => {});
        const render = await readRender();
        const s = await snap(name, {render, download});
        const out = {render, download, responses: since(resps, t0), pageErrors: since(pageErrors, t0), dialogs: since(dialogs, t0),
            notices: s.notices, usage: usage ? mine(usage.since()) : null, serverLog: quiet(slog.since(from))};
        return out;
    }

    // A role opens the landing page, presses the HTML link (and on a press the "Notes" link), and types the
    // HTML link's address.
    async function readAs(role, label) {
        const user = role === 'visitor' ? 'visitor' : C[role];
        await as(user);
        const o = {role};
        if (isOMP) {
            await page.goto(cUrl(`/catalog/book/${sub.submissionId}`)); await idle(page);
            const links = await page.locator('a.cmp_download_link').evaluateAll((els) => els.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})));
            o.links = links.map((l) => ({text: l.text, href: rel(l.href)}));
            await snap(`${label}-${role}-book`, {links: o.links});
            const html = page.locator('a.cmp_download_link', {hasText: 'HTML'}).first();
            if (role === 'visitor' && label.endsWith('a')) await loc(page, 'book page HTML format link', html);
            o.href = rel(await html.getAttribute('href').catch(() => null));
            o.pressHtml = await press(html, `${label}-${role}-html`);
            // a page the plugin shows: its header's title link back (sweep)
            if (o.pressHtml.render && /catalog\/view/.test(o.pressHtml.render.url)) {
                const title = page.locator('header.header_viewable_file a.title');
                o.header = {title: flat(await title.innerText().catch(() => null), 200), titleHref: rel(await title.getAttribute('href').catch(() => null)),
                    returnHref: rel(await page.locator('header.header_viewable_file a.return').getAttribute('href').catch(() => null))};
                if (role === 'visitor' && label.endsWith('a')) await loc(page, 'HTML view page header title link', title);
                if (await title.count()) {
                    const t0 = Date.now();
                    await title.click().catch(() => {}); await page.waitForLoadState('load').catch(() => {}); await idle(page).catch(() => {});
                    o.header.titlePressed = {url: rel(page.url()), responses: since(resps, t0)};
                    await snap(`${label}-${role}-html-title-pressed`);
                }
            }
            await page.goto(cUrl(`/catalog/book/${sub.submissionId}`)); await idle(page);
            o.pressNotes = await press(page.locator('a.cmp_download_link', {hasText: 'Notes'}).first(), `${label}-${role}-notes`);
            // the same HTML file in a "Book Manuscript" format (the seed's default component is "Appendix")
            if (role === 'visitor') {
                await page.goto(cUrl(`/catalog/book/${sub.submissionId}`)); await idle(page);
                o.pressManuscript = await press(page.locator('a.cmp_download_link', {hasText: 'Web Text'}).first(), `${label}-${role}-manuscript`);
            }
        } else {
            await page.goto(cUrl(`/article/view/${sub.submissionId}`)); await idle(page);
            const links = await page.locator('a.obj_galley_link').evaluateAll((els) => els.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})));
            o.links = links.map((l) => ({text: l.text, href: rel(l.href)}));
            await snap(`${label}-${role}-article`, {links: o.links});
            const html = page.locator('a.obj_galley_link', {hasText: 'HTML'}).first();
            o.href = rel(await html.getAttribute('href').catch(() => null));
            o.pressHtml = await press(html, `${label}-${role}-html`);
        }
        // the same address typed into the browser
        if (o.href) {
            const t0 = Date.now(); const from = slog.mark(); usage && usage.since();
            const dlP = page.waitForEvent('download', {timeout: 8000}).catch(() => null);
            const r = await page.goto(app.url(`/index.php${o.href}`)).catch((e) => ({error: flat(e.message, 120)}));
            const d = await dlP;
            const render = await readRender();
            await snap(`${label}-${role}-typed`, {render});
            o.typed = {status: r && r.status ? r.status() : r, download: d ? {suggested: d.suggestedFilename()} : null, render: {url: render.url, title: render.title, figure: render.figure, bodyText: render.bodyText},
                responses: since(resps, t0), usage: usage ? mine(usage.since()) : null, serverLog: quiet(slog.since(from)), pageErrors: since(pageErrors, t0)};
        }
        return o;
    }
    const roles = ['visitor', 'rd', 'mg'];
    const sweepRoles = async (label) => {
        const out = {};
        for (const r of roles) out[r] = await sect(`${label}-${r}`, () => readAs(r, label));
        return out;
    };

    try {
        if (!isOMP && !isOJS) {
            fact('ops-plugins', await sect('ops-plugins', () => pluginRow(null, 'p-00-plugins')));
            return;
        }
        fact('plugin-at-install', await sect('install', () => pluginRow(null, 'p-00-plugins-install')));
        // sweep: Setup › "Lists" left with "Items per page" changed and unsaved: press "Plugins", come back, leave
        // the page, then return (each read on the page and after the return)
        fact('unsaved-leave', await sect('unsaved', async () => {
            await as(C.mg);
            await page.goto(cUrl('/management/settings/website')); await idle(page);
            await page.locator('#setup-button').click(); await idle(page);
            await page.getByRole('tab', {name: 'Lists', exact: true}).filter({visible: true}).first().click(); await idle(page); await sleep(500);
            const box = () => page.locator('input[name="itemsPerPage"]:visible').first();
            await box().waitFor({timeout: T});
            if (PROBE_RUN_FIRST) await loc(page, 'Setup › Lists "Items per page"', box());
            const o = {before: await box().inputValue()};
            await box().fill(String(Number(o.before || 25) + 7)); await box().blur();
            o.typed = await box().inputValue();
            await snap('p-00-unsaved-typed');
            const t0 = Date.now();
            await page.locator('#plugins-button').click(); await idle(page); await sleep(800);
            o.afterPluginsTab = {dialogs: since(dialogs, t0), visibleDialog: flat(await page.locator('[role="dialog"]:visible').last().innerText().catch(() => null), 200)};
            await snap('p-00-unsaved-plugins-tab');
            await page.locator('#setup-button').click(); await idle(page);
            await page.getByRole('tab', {name: 'Lists', exact: true}).filter({visible: true}).first().click(); await idle(page); await sleep(300);
            o.backOnTab = await box().inputValue().catch(() => null);
            const t1 = Date.now();
            const nav = await page.goto(cUrl('')).then((r) => r && r.status()).catch((e) => `error ${flat(e.message, 120)}`);
            await idle(page).catch(() => {});
            o.leave = {nav, dialogs: since(dialogs, t1), url: rel(page.url())};
            await page.goto(cUrl('/management/settings/website')); await idle(page);
            await page.locator('#setup-button').click(); await idle(page);
            await page.getByRole('tab', {name: 'Lists', exact: true}).filter({visible: true}).first().click(); await idle(page); await sleep(300);
            o.afterReturn = await box().inputValue().catch(() => null);
            await snap('p-00-unsaved-after-return');
            return o;
        }));
        if (PHASES === 'unsaved') return;
        fact('on', await sweepRoles('a'));
        fact('plugin-off', await sect('off', () => pluginRow(false, 'p-01-plugin-off')));
        fact('off', await sweepRoles('b'));
        fact('plugin-on', await sect('onagain', () => pluginRow(true, 'p-02-plugin-on')));
        fact('onAgain', await sweepRoles('c'));
    } finally {
        await close();
        const what = !sub ? 'Plugins list read' : PHASES === 'unsaved' ? 'Website settings unsaved-leave sweep' : `book/article ${sub.submissionId}; reads a (plugin on), b (off), c (on again) as visitor, rd, mg`;
        note(`S05 ${app.name} (${process.env.PROBE_RUN || 'run'}): context ${C.path}; ${what}`);
    }
});
