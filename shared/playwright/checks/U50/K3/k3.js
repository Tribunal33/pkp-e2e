const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U50 claim check, chunk K3 — what readers see and the settings behind it
// (docs/specs/U50-issues.md body lines 122–142 the issue's page fields, 308–358 Rules 21–28,
// 392–435 Settings bullets 1–6, 445–477 Cross-feature interactions, 478–539 Canonical preamble and Coverage).
// Chunk plan: .reports/U50/claimcheck-chunks.md.
//
//   PROBE_FEATURE=U50 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U50/K3/k3.js
//   PHASES=seed,edit,… narrows (state in .reports/U50/ccK3/k3-state-<app>.json; seed runs once per state file and
//   each mutating phase once per state: delete the state file to drive a later build afresh). The full run can outlast
//   the Bash tool's 600 s cap: run it detached (patterns.md "Probe kit"). Phase order:
//   seed edit reader preview galley empty pages sub none ctl.
//   The job queue is never drained (another checker may share the fleet); the "none" phase reads the jobs table.
//
// OJS scratch journals (tag prefix u50k3), every one created through `POST scenarios/context`:
//   R  open access. Sections Articles (ART), Hidden (HID, hideTitle), Third (THD), Empty (EMP, no article).
//      Users mg manager, se sectionEditor, ce copyeditor, au author, rd reader, sm subscriptionManager,
//      rv externalReviewer. Issues R1 Vol. 1 No. 1 (2024) published 2024-03-01, cover with alt text, article B;
//      R2 Vol. 1 No. 2 (2025) published 2025-03-01 (current), cover without alt text, galleys "PDF" (article.pdf)
//      and "Notes" (notes.md); articles A1 (ART), H1 (HID), T1 (THD), X1 (ART, unpublished on screen from its
//      workflow), V1 (ART, a new version created on screen and left unpublished); R3 Vol. 2 No. 1 (2026)
//      unpublished, article S1 scheduled, article E1 published into it at once on screen.
//      On screen (edit): R1 "Title" ticked + title, description, URL Path "k3spring"; R2's TOC sections ordered
//      Third above Articles; one issue created on screen (born open access).
//   E  open access, no issue (No Current Issue, empty Archives, site home, the Access radios of a fresh journal,
//      the theme's "Journal Content Organization" before and after the first issue created on screen).
//   M  three published issues 2021–2023; "Items per page" set to 2 on screen, "Date (Short)" set to d.m.Y.
//   S  publishingMode subscription; S1, S2 unpublished (article in S1); Delayed Open Access left "Disabled" for S1's
//      publish, then 6 months for S2's; one issue created on screen.
//   N  publishingMode none; N1 published (article), N2 unpublished; users mg se ce au rd sm. Pages per role,
//      "Publish Issue" with the box ticked (jobs table read, no drain), one issue created on screen.
//   A  restrictArticleAccess on; A1 published with a PDF galley; users mg, rd.
//   P  PDF.JS PDF Viewer off; P1 published with a PDF galley.
// Read-only: publicknowledge (the seeded issues, Canonical preamble) and K2's scratch journal "I" (URN/DOI lines).
// OMP, OPS: read-only controls on publicknowledge (issue addresses, site home, Access tab, Journal Content
// Organization, section/series form boxes, Site Access Options).
// Database reads (psql SELECT) are evidence only; nothing is written there. No assertions: the script records.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir, users} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30_000;
const ALL = ['seed', 'edit', 'order', 'reader', 'preview', 'galley', 'galley2', 'empty', 'pages', 'sub', 'none', 'lang', 'leave', 'ctl'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k3]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k3-state-${app.name}.json`);
const DENIED = /does not have access to this operation|Invalid issue requested|does not publish its content online|not authorized|Access denied/i;

function psql(sql) {
    try {
        return execFileSync('psql', [dbName('ojs'), '-At', '-F', '|', '-c', sql], {encoding: 'utf8'}).trim();
    } catch (e) {
        return `psql error: ${flat(e.message, 200)}`;
    }
}

// What a reader page offers, read in the page (issue page, archive, current, home, site home).
const PARTS = () => {
    const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const q = (sel, root = document) => root.querySelector(sel);
    const qa = (sel, root = document) => [...root.querySelectorAll(sel)];
    const vis = (e) => e && e.getClientRects().length > 0;
    const out = {title: document.title, h1: qa('h1').filter(vis).map((e) => f(e.innerText))};
    const bc = q('.cmp_breadcrumbs');
    if (bc) out.breadcrumb = {text: f(bc.innerText), links: qa('a', bc).map((a) => ({t: f(a.innerText), href: a.getAttribute('href')}))};
    out.notices = qa('.cmp_notification').filter(vis).map((e) => f(e.innerText));
    const toc = q('.obj_issue_toc');
    if (toc) {
        out.toc = {
            topBlocks: [...toc.children].map((e) => e.className),
            headingBlocks: qa('.heading > *', toc).map((e) => e.className),
            cover: qa('.heading .cover img', toc).map((i) => ({alt: i.getAttribute('alt'), linked: !!i.closest('a')})),
            description: f(q('.heading .description', toc)?.innerText),
            pubIds: qa('.heading .pub_id', toc).map((e) => f(e.innerText)),
            published: f(q('.heading .published', toc)?.innerText),
            fullIssue: q('.galleys', toc) ? {heading: f(q('.galleys h2, .galleys h3, .galleys h4', toc)?.innerText), links: qa('.galleys a', toc).map((a) => ({t: f(a.innerText), href: a.getAttribute('href'), cls: a.className}))} : null,
            sections: qa('.sections > .section', toc).map((s) => ({heading: f(q(':scope > h2, :scope > h3, :scope > h4, :scope > h5', s)?.innerText) || null, articles: qa('.obj_article_summary .title', s).map((t) => f(t.innerText))})),
        };
    }
    const arch = qa('.obj_issue_summary');
    if (arch.length) out.archive = arch.map((s) => ({coverHref: q('a.cover', s)?.getAttribute('href') || null, coverAlt: q('.cover img', s)?.getAttribute('alt') ?? null, heading: f(q('h2, h3', s)?.innerText), titleLink: f(q('a.title', s)?.innerText), titleHref: q('a.title', s)?.getAttribute('href'), series: f(q('.series', s)?.innerText) || null, desc: f(q('.description', s)?.innerText) || null}));
    const pag = q('.cmp_pagination');
    if (pag) out.pagination = {text: f(pag.innerText), links: qa('a', pag).map((a) => ({t: f(a.innerText), href: a.getAttribute('href')}))};
    const cur = q('.current_issue');
    if (cur) out.homeCurrent = {text: f(cur.innerText).slice(0, 900), headings: qa('h2,h3,h4,h5', cur).map((e) => `${e.tagName}:${f(e.innerText)}`), links: qa('a', cur).map((a) => f(a.innerText)).filter(Boolean).slice(0, 40), cover: qa('.cover img', cur).map((i) => i.getAttribute('alt')), sections: qa('.sections > .section', cur).map((s) => ({heading: f(q(':scope > h2, :scope > h3, :scope > h4, :scope > h5', s)?.innerText) || null, articles: qa('.obj_article_summary .title', s).map((t) => f(t.innerText))}))};
    const nav = q('.pkp_navigation_primary');
    if (nav) out.nav = qa('a', nav).map((a) => ({t: f(a.innerText), href: a.getAttribute('href')}));
    const main = q('.pkp_structure_main') || document.body;
    out.mainText = f(main.innerText).slice(0, 900);
    return out;
};

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 2));
    const fact = (k, v) => { record('k3-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 4000)); };
    const {page, close} = await launch(app);
    const vis = await launch(app); // a signed-out visitor, or a reader signed in on it
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), url: page.url()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });

    async function snap(name, extra = {}, p = page) {
        let s;
        try { s = await screen(p); } catch (e) { s = {url: p.url(), screenError: flat(e.message, 300)}; }
        Object.assign(s, extra);
        record(name, s);
        await shot(p, name).catch(() => {});
        return s;
    }
    async function sect(name, fn) {
        log(`--- ${name}`);
        try { await fn(); } catch (e) {
            fact(`${name}-error`, flat(e.stack || e.message, 1500));
            await snap(`err-${name}`).catch(() => {});
        }
    }
    const u = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    let who = null;
    async function as(user, ctx) {
        if (who === `${user}@${ctx}`) return;
        await signIn(page, user, {contextPath: ctx});
        await idle(page);
        who = `${user}@${ctx}`;
    }
    let vwho = null;
    async function vas(user, ctx) {
        if (vwho === `${user}@${ctx}`) return;
        if (user) { await signIn(vis.page, user, {contextPath: ctx}); await idle(vis.page); }
        else if (vwho) { await signOut(vis.page); }
        vwho = user ? `${user}@${ctx}` : null;
    }
    /** Open an address on page p, follow what it does, record the screen and the reader parts. */
    async function land(p, url, name, {shotIt = true} = {}) {
        const chain = [];
        const onResp = (r) => { try { if (r.request().isNavigationRequest() && r.frame() === p.mainFrame()) chain.push({url: r.url().replace(app.baseURL, ''), status: r.status()}); } catch (e) { /* none */ } };
        p.on('response', onResp);
        const resp = await p.goto(url.startsWith('http') ? url : app.url(url)).catch((e) => ({err: flat(e.message, 200)}));
        await idle(p).catch(() => {});
        p.off('response', onResp);
        let s;
        try { s = await screen(p); } catch (e) { s = {screenError: flat(e.message, 200)}; }
        const parts = await p.evaluate(PARTS).catch((e) => ({err: flat(e.message, 200)}));
        const body = await p.locator('body').innerText().catch(() => '');
        const d = {status: resp && typeof resp.status === 'function' ? resp.status() : (resp && resp.err) || null, finalUrl: p.url().replace(app.baseURL, ''), chain,
            denied: DENIED.test(body), login: /\/login(\?|$|\/)/.test(p.url()), notFound: /404 Not Found/i.test(body), parts};
        record(name, {...s, land: d});
        if (shotIt) await shot(p, name).catch(() => {});
        return d;
    }
    const short = (d) => ({status: d.status, finalUrl: d.finalUrl, title: d.parts?.title, h1: d.parts?.h1, denied: d.denied, login: d.login, notFound: d.notFound, notices: d.parts?.notices, main: flat(d.parts?.mainText, 300)});

    // ---------------------------------------------------------------- Issues page helpers (legacy grids)
    const W = () => page.locator('[role="dialog"]:visible').last();
    async function gotoIssues(ctx, tab = 'Future Issues') {
        await page.goto(u(ctx, '/manageIssues')); await idle(page);
        await page.getByRole('tab', {name: tab, exact: true}).click(); await idle(page);
        const panel = page.getByRole('tabpanel', {name: tab});
        await panel.locator('table').first().waitFor({timeout: T});
        await idle(page); await sleep(300);
        return panel;
    }
    const rowOf = (panel, name) => panel.locator('tr.gridRow').filter({hasText: name}).first();
    async function openIssue(ctx, name, tab = 'Future Issues') {
        const panel = await gotoIssues(ctx, tab);
        await panel.getByRole('link', {name, exact: true}).first().click();
        const dlg = page.getByRole('dialog', {name: /^Issue Management/});
        await dlg.waitFor({timeout: T}); await idle(page);
        await dlg.getByRole('tab').first().waitFor({timeout: T}); await idle(page); await sleep(400);
        return dlg;
    }
    async function windowTab(dlg, name) {
        await dlg.getByRole('tab', {name, exact: true}).click(); await idle(page);
        const tp = dlg.getByRole('tabpanel', {name});
        await tp.locator('table, form').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(500);
        return tp;
    }
    async function closeWindow() {
        const w = W();
        if (!(await w.isVisible().catch(() => false))) return;
        await w.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await idle(page); await sleep(700);
    }
    const gridRead = (loc0) => loc0.evaluate((tb) => {
        const f = (s) => (s || '').split('$(function')[0].replace(/\s+/g, ' ').trim();
        const isCat = (tr) => /category/.test(tr.className) || (tr.parentElement && tr.parentElement.classList.contains('category_grid_body') && tr === tr.parentElement.firstElementChild);
        return {heads: [...tb.querySelectorAll('thead th')].map((th) => f(th.innerText)),
            rows: [...tb.querySelectorAll('tbody tr')].filter((tr) => tr.getClientRects().length && !tr.classList.contains('row_controls')).map((tr) => `${isCat(tr) ? '# ' : ''}${f(tr.innerText)}`).filter((x) => x && x !== '#')};
    }).catch((e) => ({err: flat(e.message, 200)}));
    async function publishRow(ctx, name, {email = false} = {}) {
        const panel = await gotoIssues(ctx, 'Future Issues');
        const row = rowOf(panel, name);
        await row.waitFor({timeout: T});
        const arrow = row.locator('a.show_extras');
        if (await arrow.count()) await arrow.click();
        const ctl = row.locator('xpath=following-sibling::tr[1]');
        await ctl.getByRole('link', {name: 'Publish Issue', exact: true}).click();
        const d = page.locator('[role="dialog"]:visible').last();
        await d.locator('#sendIssueNotification').waitFor({timeout: T});
        await idle(page);
        const box = await d.locator('#sendIssueNotification').isChecked();
        if (!email && box) await d.locator('#sendIssueNotification').uncheck();
        if (email && !box) await d.locator('#sendIssueNotification').check();
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /publish-issue/.test(r.url()), {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await w;
        await idle(page); await sleep(700);
        return {boxArrived: box, status: r ? r.status() : null, body: r ? flat(await r.text().catch(() => null), 200) : null};
    }
    async function createIssueOnScreen(ctx, {v, n, y}, name) {
        const panel = await gotoIssues(ctx, 'Future Issues');
        await panel.getByRole('link', {name: 'Create Issue', exact: true}).click();
        const f = page.locator('form#issueForm:visible').last();
        await f.locator('input[name=volume]').waitFor({timeout: T}); await idle(page); await sleep(300);
        const tabs = (await W().getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
        await f.locator('input[name=volume]').fill(String(v));
        await f.locator('input[name=number]').fill(String(n));
        await f.locator('input[name=year]').fill(String(y));
        const tb = f.getByRole('checkbox', {name: 'Title', exact: true});
        if (await tb.isChecked().catch(() => false)) await tb.click();
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /update-issue/.test(r.url()), {timeout: T}).catch(() => null);
        await f.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w; await idle(page); await sleep(800);
        await snap(name, {createTabs: tabs});
        await closeWindow();
        return {tabs, status: r ? r.status() : null};
    }
    const dbIssues = (id) => psql(`select issue_id, volume, number, year, published, date_published::date, access_status, open_access_date::date, url_path from issues where journal_id=${id} order by issue_id`);

    // ---------------------------------------------------------------- workflow helpers
    async function openWorkflow(ctx, sub, key = 'titleAbstract') {
        await page.goto(u(ctx, `/dashboard/editorial?workflowSubmissionId=${sub.id}&workflowMenuKey=publication_${sub.publicationId}_${key}`));
        await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(1500); await idle(page);
    }

    try {
        if (!isOJS) {
            if (on('ctl')) await sect('ctl', controls);
            return;
        }

        // ============================================================ seed
        if (on('seed') && !S.R) await sect('seed', async () => {
            const t = tag('u50k3');
            S.t = t;
            const rUsers = [['mg', 'manager'], ['se', 'sectionEditor'], ['ce', 'copyeditor'], ['au', 'author'], ['rd', 'reader'], ['sm', 'subscriptionManager'], ['rv', 'externalReviewer']];
            const R = await app.api.createContext({tag: `${t}r`, context: {name: `U50 K3 R ${t}`},
                sections: [{abbrev: 'ART', title: 'Articles'}, {abbrev: 'HID', title: 'Hidden Sec', hideTitle: true}, {abbrev: 'THD', title: 'Third Sec'}, {abbrev: 'EMP', title: 'Empty Sec'}],
                users: rUsers.map(([k, r]) => ({username: `${t}r${k}`, roles: [r]})),
                issues: [{volume: 1, number: 1, year: 2024, datePublished: '2024-03-01', published: true, coverImage: {file: 'profile-image-400.png', altText: 'K3 cover alt'}},
                    {volume: 1, number: 2, year: 2025, datePublished: '2025-03-01', published: true, coverImage: {file: 'profile-image-400.png'},
                        galleys: [{label: 'PDF', file: 'article.pdf'}, {label: 'Notes', file: 'notes.md'}]},
                    {volume: 2, number: 1, year: 2026}]});
            S.R = {path: R.path, id: R.contextId, u: Object.fromEntries(rUsers.map(([k]) => [k, `${t}r${k}`])), issues: R.issues};
            const E = await app.api.createContext({tag: `${t}e`, context: {name: `U50 K3 E ${t}`}, users: [{username: `${t}emg`, roles: ['manager']}]});
            S.E = {path: E.path, id: E.contextId, mg: `${t}emg`, name: `U50 K3 E ${t}`};
            const M = await app.api.createContext({tag: `${t}m`, context: {name: `U50 K3 M ${t}`}, users: [{username: `${t}mmg`, roles: ['manager']}],
                issues: [{volume: 1, number: 1, year: 2021, datePublished: '2021-05-01', published: true}, {volume: 2, number: 1, year: 2022, datePublished: '2022-05-01', published: true},
                    {volume: 3, number: 1, year: 2023, datePublished: '2023-05-01', published: true}]});
            S.M = {path: M.path, id: M.contextId, mg: `${t}mmg`, issues: M.issues};
            const Sj = await app.api.createContext({tag: `${t}s`, context: {name: `U50 K3 S ${t}`}, publishingMode: 'subscription',
                users: [{username: `${t}smg`, roles: ['manager']}, {username: `${t}sau`, roles: ['author']}],
                issues: [{volume: 1, number: 1, year: 2026}, {volume: 1, number: 2, year: 2026}]});
            S.S = {path: Sj.path, id: Sj.contextId, mg: `${t}smg`, au: `${t}sau`, issues: Sj.issues};
            const nUsers = [['mg', 'manager'], ['se', 'sectionEditor'], ['ce', 'copyeditor'], ['au', 'author'], ['rd', 'reader'], ['sm', 'subscriptionManager']];
            const N = await app.api.createContext({tag: `${t}n`, context: {name: `U50 K3 N ${t}`}, publishingMode: 'none',
                users: nUsers.map(([k, r]) => ({username: `${t}n${k}`, roles: [r]})),
                issues: [{volume: 1, number: 1, year: 2025, published: true}, {volume: 1, number: 2, year: 2026}]});
            S.N = {path: N.path, id: N.contextId, u: Object.fromEntries(nUsers.map(([k]) => [k, `${t}n${k}`])), issues: N.issues};
            const A = await app.api.createContext({tag: `${t}a`, context: {name: `U50 K3 A ${t}`}, restrictArticleAccess: true,
                users: [{username: `${t}amg`, roles: ['manager']}, {username: `${t}ard`, roles: ['reader']}],
                issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: [{label: 'PDF', file: 'article.pdf'}]}]});
            S.A = {path: A.path, id: A.contextId, mg: `${t}amg`, rd: `${t}ard`, issues: A.issues};
            const P = await app.api.createContext({tag: `${t}p`, context: {name: `U50 K3 P ${t}`}, plugins: {pdfjsviewerplugin: {enabled: false}},
                users: [{username: `${t}pmg`, roles: ['manager']}],
                issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: [{label: 'PDF', file: 'article.pdf'}]}]});
            S.P = {path: P.path, id: P.contextId, mg: `${t}pmg`, issues: P.issues};
            save();
            const sub = async (C, au, key, title, issue, extra = {}) => {
                const r = await app.api.createSubmission({context: C.path, submitter: au, tag: `${t}${key}`, title: `${title} ${t}`, issue, published: true, ...extra});
                return {id: r.submissionId, publicationId: r.publicationId, title: `${title} ${t}`};
            };
            const au = S.R.u.au;
            const r1 = {volume: 1, number: 1, year: 2024}, r2 = {volume: 1, number: 2, year: 2025}, r3 = {volume: 2, number: 1, year: 2026};
            S.subs = {};
            S.subs.B = await sub(S.R, au, 'b', 'K3 Back B', r1);
            S.subs.A1 = await sub(S.R, au, 'a1', 'K3 Art A1', r2, {section: 'ART'});
            S.subs.H1 = await sub(S.R, au, 'h1', 'K3 Hid H1', r2, {section: 'HID'});
            S.subs.T1 = await sub(S.R, au, 't1', 'K3 Third T1', r2, {section: 'THD'});
            S.subs.X1 = await sub(S.R, au, 'x1', 'K3 Unpub X1', r2, {section: 'ART'});
            S.subs.V1 = await sub(S.R, au, 'v1', 'K3 Version V1', r2, {section: 'ART'});
            S.subs.S1 = await sub(S.R, au, 's1', 'K3 Sched S1', r3, {section: 'ART'});
            const e = await app.api.createSubmission({context: S.R.path, submitter: au, tag: `${t}e1`, title: `K3 Early E1 ${t}`, section: 'ART', decisions: ['skipExternalReview', 'sendToProduction']});
            S.subs.E1 = {id: e.submissionId, publicationId: e.publicationId, title: `K3 Early E1 ${t}`};
            S.subs.SS = await sub(S.S, S.S.au, 'ss', 'K3 Sub SS', {volume: 1, number: 1, year: 2026});
            S.subs.N1 = await sub(S.N, S.N.u.au, 'n1', 'K3 None N1', {volume: 1, number: 1, year: 2025});
            S.subs.MA = await sub(S.M, S.M.mg, 'ma', 'K3 M MA', {volume: 3, number: 1, year: 2023});
            save();
            fact('seed', {t, R: S.R, E: S.E, M: S.M, S: S.S, N: S.N, A: S.A, P: S.P, subs: S.subs});
        });
        if (!S.R) { log('no state; run the seed phase'); return; }
        const R = S.R;
        const RU = R.u;
        const rid = (i) => R.issues[i].id;
        const n1 = 'Vol. 1 No. 1 (2024)', n2 = 'Vol. 1 No. 2 (2025)', n3 = 'Vol. 2 No. 1 (2026)';

        // ============================================================ edit (on-screen changes on R, as its manager)
        if (on('edit') && !S.editDone) await sect('edit', async () => {
            const out = {};
            await as(RU.mg, R.path);
            // R1: Title ticked + typed, a description, URL Path
            let dlg;
            if (!S.r1Done) {
            dlg = await openIssue(R.path, n1, 'Back Issues');
            out.r1Tabs = (await dlg.getByRole('tab').allInnerTexts()).map((x) => flat(x, 40));
            const tp = await windowTab(dlg, 'Issue Data');
            const f = tp.locator('form#issueForm');
            await f.locator('input[name=volume]').waitFor({timeout: T});
            const tb = f.getByRole('checkbox', {name: 'Title', exact: true});
            if (!(await tb.isChecked())) await tb.click();
            await f.locator('input[name^="title"]').first().fill('K3 Spring Title');
            const frame = f.frameLocator('iframe').first();
            await frame.locator('body').click();
            await page.keyboard.type('K3 issue description text');
            await f.locator('input[name=urlPath]').fill('k3spring');
            out.r1Alt = await f.locator('input[name^="coverImageAltText"]').first().inputValue().catch(() => null);
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /update-issue/.test(r.url()), {timeout: T}).catch(() => null);
            await f.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            out.r1Save = r ? {status: r.status(), body: flat(await r.text().catch(() => null), 200)} : null;
            await idle(page); await sleep(800);
            await snap('e-01-r1-issue-data-saved');
            await closeWindow();
            S.r1Done = true; save();
            }
            // R1 checks: the "Access" tab absent on an open journal; R2's TOC header (no "Open Access")
            dlg = await openIssue(R.path, n2, 'Back Issues');
            out.r2Tabs = (await dlg.getByRole('tab').allInnerTexts()).map((x) => flat(x, 40));
            let toc = await windowTab(dlg, 'Table of Contents');
            await toc.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            out.r2TocBefore = await gridRead(toc.locator('table').first());
            await snap('e-02-r2-toc', {toc: out.r2TocBefore});
            await closeWindow();
            // X1: unpublished from its own workflow
            if (!S.x1Done) try {
                await openWorkflow(R.path, S.subs.X1);
                await page.getByRole('button', {name: 'Unpublish', exact: true}).click({timeout: 15000});
                const d = page.getByRole('dialog').filter({hasText: "Are you sure you don't want this to be published?"}).last();
                await d.waitFor({timeout: T});
                const pr = page.waitForResponse((x) => x.url().includes('/unpublish') && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await d.getByRole('button', {name: 'Unpublish', exact: true}).click();
                out.x1Unpublish = (await pr)?.status() ?? null;
                S.x1Done = true; save();
                await idle(page); await sleep(800);
                await snap('e-04-x1-unpublished');
            } catch (e) { out.x1Err = flat(e.message, 300); }
            // V1: a new version created and left unpublished
            if (!S.v1Done) try {
                await openWorkflow(R.path, S.subs.V1);
                const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
                await link.click({timeout: 15000});
                const vw = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
                await vw.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
                await idle(page); await sleep(1200);
                const st = vw.locator('select[name="versionStage"]');
                if (!(await st.inputValue())) await st.selectOption('VoR');
                const mn = vw.locator('select[name="versionIsMinor"]');
                if (await mn.isVisible().catch(() => false)) { if (!(await mn.inputValue())) await mn.selectOption('false'); }
                const vr = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
                await vw.getByRole('button', {name: 'Confirm', exact: true}).click();
                const resp = await vr;
                out.v1Version = resp ? resp.status() : null;
                S.v1Done = true; save();
                await idle(page); await sleep(1000);
                await snap('e-05-v1-new-version');
            } catch (e) { out.v1Err = flat(e.message, 300); }
            // E1: published at once into the unpublished R3 (the U49 path)
            if (!S.e1Done) try {
                const E1 = S.subs.E1;
                await openWorkflow(R.path, E1);
                await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first().click({timeout: 15000});
                await sleep(1500);
                const vs = page.locator('select[name="versionStage"]');
                if (await vs.isVisible({timeout: 5000}).catch(() => false)) {
                    await vs.selectOption('VoR').catch(() => vs.selectOption({index: 1}).catch(() => {}));
                    await page.locator('select[name="versionIsMinor"]').selectOption('false').catch(() => {});
                }
                await page.getByRole('radio', {name: 'Assign To Future Issue and Publish Immediately'}).check();
                await sleep(800);
                const sels = await page.locator('[role="dialog"] select').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => ({name: e.name, id: e.id, options: [...e.options].map((o) => ({v: o.value, t: o.textContent.trim()}))})));
                const issueSel = sels.find((x) => x.options.some((o) => o.t.includes(n3)));
                if (issueSel) await page.locator(issueSel.id ? `[id="${issueSel.id}"]` : `select[name="${issueSel.name}"]`).selectOption(issueSel.options.find((o) => o.t.includes(n3)).v);
                await page.getByRole('button', {name: 'Confirm', exact: true}).last().click();
                const conf = page.getByRole('dialog').filter({hasText: /Are you sure/}).last();
                await conf.waitFor({timeout: 20000}).catch(() => {});
                const pr = page.waitForResponse((x) => /\/publish/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await conf.getByRole('button', {name: /^(Publish|Schedule|OK)$/}).last().click();
                out.e1Publish = (await pr)?.status() ?? null;
                S.e1Done = true; save();
                await sleep(1500); await idle(page);
                await snap('e-06-e1-published');
            } catch (e) { out.e1Err = flat(e.message, 300); }
            // one issue created on screen on the open journal (born open access)
            if (!S.rCreateDone) { out.rCreate = await createIssueOnScreen(R.path, {v: 9, n: 9, y: 2029}, 'e-07-r-created'); S.rCreateDone = true; save(); }
            out.db = dbIssues(R.id);
            out.pubs = psql(`select s.submission_id, s.current_publication_id, p.publication_id, p.status, p.issue_id, p.version_major, p.version_minor from submissions s join publications p on p.submission_id=s.submission_id where s.context_id=${R.id} order by 1,3`);
            S.editDone = true; save();
            fact('edit', out);
        });

        // ============================================================ order (R2's sections: Third above Articles, for Rule 23's section order)
        if (on('order') && !S.orderDone) await sect('order', async () => {
            const out = {};
            await as(RU.mg, R.path);
            let dlg = await openIssue(R.path, n2, 'Back Issues');
            let toc = await windowTab(dlg, 'Table of Contents');
            await toc.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await toc.getByRole('link', {name: 'Order', exact: true}).click(); await idle(page); await sleep(500);
            out.tbodies = await toc.locator('table').first().evaluate((t) => [...t.querySelectorAll('tbody')].map((b) => `${b.className}: ${(b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40)}`));
            const catBody = (title) => toc.locator('tbody.category_grid_body').filter({hasText: title}).first();
            out.tries = [];
            for (const frac of [0.1, 0.4, -0.2]) {
                const src = catBody('Third Sec').locator('tr').first().locator('.label').first();
                const a = await src.boundingBox(); const b = await catBody('Articles').locator('tr').first().boundingBox();
                if (!a || !b) break;
                const x = a.x + 10, y0 = a.y + a.height / 2, y1 = b.y + b.height * frac;
                await page.mouse.move(x, y0); await page.mouse.down();
                await page.mouse.move(x + 2, y0 - 3, {steps: 3});
                for (let i = 1; i <= 30; i++) { await page.mouse.move(x + 2, y0 + (y1 - y0) * (i / 30)); await sleep(50); }
                await sleep(400); await page.mouse.up(); await sleep(700);
                const g = await gridRead(toc.locator('table').first());
                out.tries.push({frac, first: g.rows && g.rows[0]});
                if (g.rows && g.rows[0] === '# Third Sec') break;
            }
            out.dragged = await gridRead(toc.locator('table').first());
            await snap('e-03a-r2-toc-dragged', {toc: out.dragged});
            const sr = page.waitForResponse((x) => /save-sequence|saveSequence/i.test(x.url()), {timeout: T}).catch(() => null);
            await toc.getByRole('link', {name: 'Done', exact: true}).or(toc.getByRole('button', {name: 'Done', exact: true})).first().click();
            const r = await sr;
            out.save = r ? {status: r.status(), url: r.url().replace(app.baseURL, '').slice(0, 200), post: flat(r.request().postData(), 400)} : null;
            await idle(page); await sleep(600);
            await closeWindow();
            dlg = await openIssue(R.path, n2, 'Back Issues');
            toc = await windowTab(dlg, 'Table of Contents');
            await toc.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            out.after = await gridRead(toc.locator('table').first());
            await snap('e-03-r2-toc-ordered', {toc: out.after});
            await closeWindow();
            out.db = psql(`select * from custom_section_orders where issue_id=${rid(1)}`);
            S.orderDone = true; save();
            fact('order', out);
        });

        // ============================================================ reader (visitor pages on R, publicknowledge, K2's I)
        if (on('reader')) await sect('reader', async () => {
            const out = {};
            await vas(null);
            out.r2 = await land(vis.page, `/index.php/${R.path}/issue/view/${rid(1)}`, 'r-01-r2-issue-page');
            out.r1ById = await land(vis.page, `/index.php/${R.path}/issue/view/${rid(0)}`, 'r-02-r1-by-id');
            out.r1ByPath = await land(vis.page, `/index.php/${R.path}/issue/view/k3spring`, 'r-03-r1-by-urlpath');
            out.r2ByNumber = short(await land(vis.page, `/index.php/${R.path}/issue/view/2`, 'r-04-issue-view-2', {shotIt: false}));
            out.current = await land(vis.page, `/index.php/${R.path}/issue/current`, 'r-05-current');
            out.issueBare = short(await land(vis.page, `/index.php/${R.path}/issue`, 'r-06-issue-bare', {shotIt: false}));
            out.archive = await land(vis.page, `/index.php/${R.path}/issue/archive`, 'r-07-archive');
            out.home = await land(vis.page, `/index.php/${R.path}`, 'r-08-home');
            // the header's "Current" and "Archives", pressed
            const cur = vis.page.locator('.pkp_navigation_primary').getByRole('link', {name: 'Current', exact: true});
            await loc(vis.page, 'Journal header: "Current"', cur);
            if (await cur.count()) { await cur.first().click(); await idle(vis.page); out.currentPressed = vis.page.url().replace(app.baseURL, ''); }
            const arc = vis.page.locator('.pkp_navigation_primary').getByRole('link', {name: 'Archives', exact: true});
            if (await arc.count()) { await arc.first().click(); await idle(vis.page); out.archivesPressed = vis.page.url().replace(app.baseURL, ''); }
            // an article page: breadcrumb and "Issue" line
            out.article = await land(vis.page, `/index.php/${R.path}/article/view/${S.subs.A1.id}`, 'r-09-article-a1');
            out.articleLinks = await vis.page.evaluate(() => {
                const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
                return {breadcrumb: [...document.querySelectorAll('.cmp_breadcrumbs a')].map((a) => ({t: f(a.innerText), href: a.getAttribute('href')})),
                    issueLine: [...document.querySelectorAll('.item.issue a, .issue a')].map((a) => ({t: f(a.innerText), href: a.getAttribute('href')}))};
            }).catch(() => null);
            // the editors' Table of Contents still shows the hidden section (Settings 4) — read in the edit phase TOC
            // publicknowledge (Canonical preamble, s0)
            out.pkArchive = await land(vis.page, `/index.php/${app.contextPath}/issue/archive`, 'r-10-pk-archive');
            out.pkCurrent = short(await land(vis.page, `/index.php/${app.contextPath}/issue/current`, 'r-11-pk-current'));
            // K2's journal I (URN / DOI lines), read as its manager (unpublished, preview) and as a visitor
            try {
                const k2 = JSON.parse(fs.readFileSync(path.join(REPO, '.reports/U50/ccK2/k2-state-ojs.json'), 'utf8'));
                if (k2.I) {
                    out.iVisitor = short(await land(vis.page, `/index.php/${k2.I.path}/issue/view/${k2.I.issues[0].id}`, 'r-12-k2i-visitor'));
                    out.iVisitor.toc = null;
                    await vas(k2.I.mg, k2.I.path);
                    out.iManager = await land(vis.page, `/index.php/${k2.I.path}/issue/view/${k2.I.issues[0].id}`, 'r-13-k2i-manager');
                    out.iDb = psql(`select i.issue_id, i.published, (select string_agg(setting_name||'='||setting_value, ', ') from issue_settings s where s.issue_id=i.issue_id and setting_name like 'pub-id%'), i.doi_id from issues i where i.issue_id=${k2.I.issues[0].id}`);
                    await vas(null);
                }
            } catch (e) { out.iErr = flat(e.message, 200); }
            fact('reader', {r2: out.r2.parts, r2Title: out.r2.parts?.title, r1ById: out.r1ById.parts?.toc, r1ByPath: short(out.r1ByPath), r2ByNumber: out.r2ByNumber,
                current: short(out.current), issueBare: out.issueBare, archive: out.archive.parts?.archive, archiveH1: out.archive.parts?.h1, archiveTitle: out.archive.parts?.title, archiveBc: out.archive.parts?.breadcrumb,
                home: out.home.parts?.homeCurrent, nav: out.home.parts?.nav, currentPressed: out.currentPressed, archivesPressed: out.archivesPressed,
                articleLinks: out.articleLinks, pkArchive: out.pkArchive.parts?.archive, pkCurrent: out.pkCurrent,
                iVisitor: out.iVisitor, iManager: out.iManager ? {pubIds: out.iManager.parts?.toc?.pubIds, notices: out.iManager.parts?.notices, headingBlocks: out.iManager.parts?.toc?.headingBlocks} : null, iDb: out.iDb, iErr: out.iErr});
        });

        // ============================================================ preview (Rule 22 per permission level)
        if (on('preview')) await sect('preview', async () => {
            const out = {};
            const url = `/index.php/${R.path}/issue/view/${rid(2)}`;
            await vas(null);
            out.signedOut = short(await land(vis.page, url, 'p-00-signed-out'));
            for (const [k, user] of [['mg', RU.mg], ['se', RU.se], ['ce', RU.ce], ['admin', 'admin'], ['au', RU.au], ['rd', RU.rd], ['sm', RU.sm], ['rv', RU.rv]]) {
                await vas(user, R.path);
                const d = await land(vis.page, url, `p-${k}`);
                out[k] = {...short(d), toc: d.parts?.toc ? {sections: d.parts.toc.sections, published: d.parts.toc.published, topBlocks: d.parts.toc.topBlocks} : null};
                if (k === 'mg') {
                    // the Issues row's "Preview"
                    await as(RU.mg, R.path);
                    const panel = await gotoIssues(R.path, 'Future Issues');
                    const row = rowOf(panel, n3);
                    await row.locator('a.show_extras').click();
                    const ctl = row.locator('xpath=following-sibling::tr[1]');
                    const pv = ctl.getByRole('link', {name: 'Preview', exact: true});
                    await loc(page, 'Issues row: "Preview"', pv);
                    const [popup] = await Promise.all([page.context().waitForEvent('page', {timeout: 15000}).catch(() => null), pv.click().catch(() => {})]);
                    if (popup) { await popup.waitForLoadState().catch(() => {}); await idle(popup).catch(() => {}); out.rowPreview = {url: popup.url().replace(app.baseURL, ''), title: await popup.title()}; await snap('p-row-preview', {}, popup); await popup.close(); }
                    else out.rowPreview = {samePage: page.url().replace(app.baseURL, '')};
                }
            }
            await vas(null);
            fact('preview', out);
        });

        // ============================================================ galley (Rule 26; Settings 3 and 5)
        if (on('galley')) await sect('galley', async () => {
            const out = {};
            async function pressGalley(p, issueUrl, label, name) {
                await p.goto(app.url(issueUrl)); await idle(p);
                const link = p.locator('.obj_issue_toc .galleys a').filter({hasText: label}).first();
                const href = await link.getAttribute('href').catch(() => null);
                const heads = [];
                const onResp = (r) => { if (/issue\/(download|view)/.test(r.url())) heads.push({url: r.url().replace(app.baseURL, ''), status: r.status(), type: r.headers()['content-type'], disp: r.headers()['content-disposition']}); };
                p.on('response', onResp);
                const dl = p.waitForEvent('download', {timeout: 12000}).catch(() => null);
                await link.click().catch(() => {});
                const d = await dl;
                await idle(p).catch(() => {}); await sleep(800);
                p.off('response', onResp);
                const res = {href, download: d ? d.suggestedFilename() : null, url: p.url().replace(app.baseURL, ''), title: await p.title().catch(() => null), responses: heads};
                res.reader = await p.evaluate(() => {
                    const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
                    const h = document.querySelector('.header_view');
                    if (!h) return null;
                    return {text: f(h.innerText), links: [...h.querySelectorAll('a')].map((a) => ({t: f(a.innerText), sr: f(a.querySelector('.pkp_screen_reader')?.innerText), cls: a.className, href: a.getAttribute('href'), aria: a.getAttribute('aria-label')})), iframe: !!document.querySelector('iframe')};
                }).catch(() => null);
                await snap(name, {press: res}, p);
                return res;
            }
            await vas(null);
            const r2url = `/index.php/${R.path}/issue/view/${rid(1)}`;
            out.pdf = await pressGalley(vis.page, r2url, 'PDF', 'g-01-r2-pdf');
            if (out.pdf.reader) {
                // the reader's links: the arrow and the name lead back
                const back = vis.page.locator('.header_view a.return');
                await loc(vis.page, 'PDF reader: return arrow', back);
                await loc(vis.page, 'PDF reader: "Download"', vis.page.locator('.header_view a.download'));
                await back.click().catch(() => {}); await idle(vis.page);
                out.pdf.returnLands = vis.page.url().replace(app.baseURL, '');
            }
            out.txt = await pressGalley(vis.page, r2url, 'Notes', 'g-02-r2-notes');
            out.bad = short(await land(vis.page, `${r2url}/999`, 'g-03-r2-galley-999'));
            // Settings 3 ticked (A): signed out, then Reader through the Login page it lands on
            const A = S.A;
            const aurl = `/index.php/${A.path}/issue/view/${A.issues[0].id}`;
            out.aPage = short(await land(vis.page, aurl, 'g-04-a-issue-signed-out'));
            out.aPdf = await pressGalley(vis.page, aurl, 'PDF', 'g-05-a-pdf-signed-out');
            if (/\/login/.test(vis.page.url())) {
                await vis.page.locator('input#username').fill(A.rd);
                await vis.page.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
                await vis.page.locator('input#password').fill(users.getPassword(A.rd));
                const dl = vis.page.waitForEvent('download', {timeout: 12000}).catch(() => null);
                await vis.page.locator('form#login button[type="submit"]').click();
                const d = await dl;
                await idle(vis.page).catch(() => {}); await sleep(800);
                out.aAfterLogin = {url: vis.page.url().replace(app.baseURL, ''), title: await vis.page.title().catch(() => null), download: d ? d.suggestedFilename() : null};
                await snap('g-06-a-after-login', {}, vis.page);
                vwho = `${A.rd}@${A.path}`;
            }
            await vas(null);
            // Settings 5 off (P)
            const P = S.P;
            out.pOff = await pressGalley(vis.page, `/index.php/${P.path}/issue/view/${P.issues[0].id}`, 'PDF', 'g-07-p-pdfjs-off');
            fact('galley', out);
        });

        // ============================================================ galley2 (Rule 26's last sentence, both shapes of a missing galley)
        if (on('galley2')) await sect('galley2', async () => {
            const out = {};
            await vas(null);
            out.byIdNumeric = short(await land(vis.page, `/index.php/${R.path}/issue/view/${rid(1)}/999`, 'g-08-r2-galley-999-again', {shotIt: false}));
            out.byIdWord = short(await land(vis.page, `/index.php/${R.path}/issue/view/${rid(1)}/nosuch`, 'g-09-r2-galley-word', {shotIt: false}));
            out.byPathNumeric = short(await land(vis.page, `/index.php/${R.path}/issue/view/k3spring/999`, 'g-10-r1path-galley-999', {shotIt: false}));
            out.otherIssueGalley = short(await land(vis.page, `/index.php/${R.path}/issue/view/${rid(0)}/18`, 'g-11-r1-with-r2-galley', {shotIt: false}));
            fact('galley2', out);
        });

        // ============================================================ empty (E: no issue; Rule 24/25 other end, Rule 27, Settings 1 default, U10 OJS2)
        if (on('empty')) await sect('empty', async () => {
            const out = {};
            const E = S.E;
            await vas(null);
            out.current = await land(vis.page, `/index.php/${E.path}/issue/current`, 'm-01-e-current');
            out.archive = short(await land(vis.page, `/index.php/${E.path}/issue/archive`, 'm-02-e-archive'));
            out.home = short(await land(vis.page, `/index.php/${E.path}`, 'm-03-e-home'));
            // the site's home page
            const site = await land(vis.page, '/index.php/index', 'm-04-site-home', {shotIt: false});
            out.site = {status: site.status, finalUrl: site.finalUrl, h1: site.parts?.h1, title: site.parts?.title};
            out.siteEntries = await vis.page.evaluate((names) => {
                const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
                const lis = [...document.querySelectorAll('.journals > ul > li, .journals li')];
                const pick = (nm) => { const li = lis.find((l) => f(l.innerText).includes(nm)); return li ? {text: f(li.innerText).slice(0, 300), links: [...li.querySelectorAll('.links a, a')].map((a) => ({t: f(a.innerText), href: a.getAttribute('href')}))} : null; };
                return {count: document.querySelectorAll('.journals > ul > li').length, entries: Object.fromEntries(names.map((n) => [n, pick(n)])), pagination: f(document.querySelector('.cmp_pagination')?.innerText)};
            }, [E.name, `U50 K3 R ${S.t}`]).catch((e) => ({err: flat(e.message, 200)}));
            await shot(vis.page, 'm-04-site-home').catch(() => {});
            const cur = vis.page.locator('.journals li').filter({hasText: E.name}).getByRole('link', {name: 'Current Issue', exact: true});
            await loc(vis.page, 'Site home: a journal\'s "Current Issue"', cur);
            if (await cur.count()) { await cur.first().click(); await idle(vis.page); out.siteCurrentE = {url: vis.page.url().replace(app.baseURL, ''), h1: await vis.page.locator('h1').allInnerTexts().catch(() => [])}; await snap('m-05-site-current-e', {}, vis.page); }
            const curR = vis.page.url() && null;
            await land(vis.page, '/index.php/index', 'm-06-site-home-again', {shotIt: false});
            const cR = vis.page.locator('.journals li').filter({hasText: `U50 K3 R ${S.t}`}).getByRole('link', {name: 'Current Issue', exact: true});
            if (await cR.count()) { await cR.first().click(); await idle(vis.page); out.siteCurrentR = {url: vis.page.url().replace(app.baseURL, ''), h1: await vis.page.locator('h1').allInnerTexts().catch(() => [])}; }
            void curR;
            // the manager: Distribution › Access on a fresh journal; the theme's "Journal Content Organization"
            await as(E.mg, E.path);
            await page.goto(u(E.path, '/management/settings/distribution')); await idle(page);
            await page.getByRole('tab', {name: 'Access', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(600);
            out.access = await page.locator('[role="tabpanel"]:visible form').first().evaluate((fm) => ({radios: [...fm.querySelectorAll('input[type=radio]')].map((r) => `${r.checked ? '(x)' : '( )'} ${(r.labels?.[0]?.innerText || r.value).trim()}`), selects: [...fm.querySelectorAll('select')].filter((s) => s.getClientRects().length).map((s) => s.name), text: fm.innerText.replace(/\s+/g, ' ').slice(0, 600)})).catch((e) => ({err: flat(e.message, 200)}));
            await snap('m-07-e-access-fresh', {access: out.access});
            const readTheme = async (name) => {
                await page.goto(u(E.path, '/management/settings/website')); await idle(page);
                await page.locator('#appearance-button').first().click().catch(() => {}); await idle(page); await sleep(500);
                await page.getByRole('tab', {name: 'Theme', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(1000);
                const fs0 = page.locator('fieldset').filter({hasText: 'Journal Content Organization'}).first();
                const v = await fs0.evaluate((x) => [...x.querySelectorAll('input[type=checkbox]')].map((c) => `${c.checked ? '[x]' : '[ ]'} ${(c.labels?.[0]?.innerText || c.value).trim()}`)).catch(() => null);
                await snap(name, {jco: v});
                return v;
            };
            out.themeBefore = await readTheme('m-08-e-theme-before');
            out.create = await createIssueOnScreen(E.path, {v: 1, n: 1, y: 2026}, 'm-09-e-created');
            out.themeAfter = await readTheme('m-10-e-theme-after');
            out.db = dbIssues(E.id);
            fact('empty', out);
        });

        // ============================================================ pages (M: Items per page, a page past the last, the short date format)
        if (on('pages')) await sect('pages', async () => {
            const out = {};
            const M = S.M;
            await vas(null);
            out.p1Default = await land(vis.page, `/index.php/${M.path}/issue/archive`, 'n-01-m-archive-default');
            out.issue3Default = (await land(vis.page, `/index.php/${M.path}/issue/view/${M.issues[2].id}`, 'n-02-m-issue-date-default')).parts?.toc?.published;
            if (!S.pagesDone) {
                await as(M.mg, M.path);
                await page.goto(u(M.path, '/management/settings/website')); await idle(page);
                await page.locator('#setup-button').first().click(); await idle(page); await sleep(500);
                await page.getByRole('tab', {name: 'Lists', exact: true}).filter({visible: true}).first().click(); await idle(page); await sleep(500);
                const ipp = page.locator('input[name="itemsPerPage"]').first();
                out.ippBefore = await ipp.inputValue().catch(() => null);
                await ipp.fill('2');
                const form = page.locator('form').filter({has: ipp}).first();
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                out.ippSaved = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
                await snap('n-03-m-lists-saved');
                await page.locator('#setup').getByRole('tab', {name: /Date/}).first().click(); await idle(page); await sleep(500);
                const panel = page.locator('#setup [role="tabpanel"]:visible').first();
                const radio = panel.locator('input[type=radio][name^="dateFormatShort"][value="d.m.Y"]').first();
                await radio.check({force: true}).catch(() => {});
                await panel.getByRole('button', {name: 'Save', exact: true}).click();
                out.dateSaved = await panel.locator('[role="status"]:has-text("Saved"), .pkpFormPage__status:has-text("Saved")').first().waitFor({timeout: T}).then(() => true).catch(() => false);
                await snap('n-04-m-date-saved');
                S.pagesDone = true; save();
            }
            await vas(null);
            out.p1 = await land(vis.page, `/index.php/${M.path}/issue/archive`, 'n-05-m-archive-p1');
            const next = out.p1.parts?.pagination?.links?.find((l) => /^2$|next/i.test(l.t));
            out.p2 = await land(vis.page, next ? next.href : `/index.php/${M.path}/issue/archive/2`, 'n-06-m-archive-p2');
            out.p3 = short(await land(vis.page, `/index.php/${M.path}/issue/archive/3`, 'n-07-m-archive-p3'));
            out.p9 = short(await land(vis.page, `/index.php/${M.path}/issue/archive/9`, 'n-08-m-archive-p9', {shotIt: false}));
            out.issue3After = (await land(vis.page, `/index.php/${M.path}/issue/view/${M.issues[2].id}`, 'n-09-m-issue-date-dmy')).parts?.toc?.published;
            fact('pages', {p1Default: {h1: out.p1Default.parts?.h1, title: out.p1Default.parts?.title, archive: out.p1Default.parts?.archive?.map((a) => a.titleLink), pagination: out.p1Default.parts?.pagination},
                issue3Default: out.issue3Default, ippBefore: out.ippBefore, ippSaved: out.ippSaved, dateSaved: out.dateSaved,
                p1: {h1: out.p1.parts?.h1, title: out.p1.parts?.title, archive: out.p1.parts?.archive?.map((a) => a.titleLink), pagination: out.p1.parts?.pagination},
                p2: {url: out.p2.finalUrl, status: out.p2.status, h1: out.p2.parts?.h1, title: out.p2.parts?.title, bc: out.p2.parts?.breadcrumb, archive: out.p2.parts?.archive?.map((a) => a.titleLink), pagination: out.p2.parts?.pagination},
                p3: out.p3, p9: out.p9, issue3After: out.issue3After});
        });

        // ============================================================ sub (S: subscriptions; Settings 1 and 2)
        if (on('sub')) await sect('sub', async () => {
            const out = {};
            const J = S.S;
            const s1 = 'Vol. 1 No. 1 (2026)', s2 = 'Vol. 1 No. 2 (2026)';
            await as(J.mg, J.path);
            const accessTab = async (name, tab, snapName) => {
                const dlg = await openIssue(J.path, name, tab);
                const tabs = (await dlg.getByRole('tab').allInnerTexts()).map((x) => flat(x, 40));
                const tp = await windowTab(dlg, 'Access');
                await tp.locator('form').first().waitFor({timeout: T}).catch(() => {});
                await sleep(500);
                const v = await tp.locator('form').first().evaluate((fm) => ({
                    text: fm.innerText.replace(/\s+/g, ' ').slice(0, 400),
                    selects: [...fm.querySelectorAll('select')].map((s) => ({name: s.name, value: s.value, shown: s.options[s.selectedIndex]?.textContent.trim(), options: [...s.options].map((o) => o.textContent.trim())})),
                    inputs: [...fm.querySelectorAll('input:not([type=hidden])')].map((i) => ({name: i.name, value: i.value}))})).catch((e) => ({err: flat(e.message, 200)}));
                await snap(snapName, {tabs, access: v});
                await closeWindow();
                return {tabs, access: v};
            };
            if (!S.subDone) {
                out.s1Before = await accessTab(s1, 'Future Issues', 's-01-s1-access-before');
                const dlg = await openIssue(J.path, s1, 'Future Issues');
                const toc = await windowTab(dlg, 'Table of Contents');
                await toc.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                out.s1Toc = await gridRead(toc.locator('table').first());
                await snap('s-02-s1-toc', {toc: out.s1Toc});
                await closeWindow();
                // Distribution › Access: the radios and "Delayed Open Access"
                const openAccessSettings = async () => {
                    await page.goto(u(J.path, '/management/settings/distribution')); await idle(page);
                    await page.getByRole('tab', {name: 'Access', exact: true}).first().click(); await idle(page); await sleep(600);
                    return page.locator('[role="tabpanel"]:visible form').first();
                };
                let fm = await openAccessSettings();
                const readAcc = () => fm.evaluate((x) => ({radios: [...x.querySelectorAll('input[type=radio]')].map((r) => `${r.checked ? '(x)' : '( )'} ${(r.labels?.[0]?.innerText || r.value).trim()}`), selects: [...x.querySelectorAll('select')].filter((s) => s.getClientRects().length).map((s) => ({name: s.name, value: s.value, shown: s.options[s.selectedIndex]?.textContent.trim(), n: s.options.length, first: [...s.options].slice(0, 3).map((o) => o.textContent.trim()), last: s.options[s.options.length - 1]?.textContent.trim()})), label: x.innerText.replace(/\s+/g, ' ').slice(0, 500)}));
                out.settingsBefore = await readAcc();
                await snap('s-03-access-settings', {acc: out.settingsBefore});
                // publish S1 with "Disabled"
                out.pubS1 = await publishRow(J.path, s1);
                out.s1After = await accessTab(s1, 'Back Issues', 's-04-s1-access-after-publish-disabled');
                // Delayed Open Access 6 months, then publish S2
                fm = await openAccessSettings();
                const sel = fm.locator('select').filter({visible: true}).first();
                await sel.selectOption({index: 6}).catch(() => {});
                out.delayedPicked = await sel.evaluate((s) => s.options[s.selectedIndex]?.textContent.trim()).catch(() => null);
                await fm.getByRole('button', {name: 'Save', exact: true}).click();
                out.delayedSaved = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
                await snap('s-05-access-settings-6m');
                out.pubS2 = await publishRow(J.path, s2);
                out.s2After = await accessTab(s2, 'Back Issues', 's-06-s2-access-after-publish-6m');
                out.create = await createIssueOnScreen(J.path, {v: 5, n: 5, y: 2030}, 's-07-s-created');
                out.s3 = await accessTab('Vol. 5 No. 5 (2030)', 'Future Issues', 's-08-s3-access-born');
                out.db = dbIssues(J.id);
                S.subDone = true; save();
            }
            // the visitor's issue page and "Full Issue"-less TOC of a subscription issue
            await vas(null);
            out.s1Page = short(await land(vis.page, `/index.php/${J.path}/issue/view/${J.issues[0].id}`, 's-09-s1-visitor'));
            fact('sub', out);
        });

        // ============================================================ none (N: not publishing online; Settings 1 third bullet, td16)
        if (on('none')) await sect('none', async () => {
            const out = {};
            const N = S.N;
            const NU = N.u;
            const pages = [['archive', '/issue/archive'], ['current', '/issue/current'], ['issue', `/issue/view/${N.issues[0].id}`], ['home', ''], ['article', `/article/view/${S.subs.N1.id}`]];
            for (const [k, user] of [['out', null], ['rd', NU.rd], ['au', NU.au], ['se', NU.se], ['ce', NU.ce], ['sm', NU.sm], ['mg', NU.mg]]) {
                await vas(user, N.path);
                out[k] = {};
                for (const [pk, p] of pages) {
                    const d = await land(vis.page, `/index.php/${N.path}${p}`, `o-${k}-${pk}`, {shotIt: pk === 'archive' || k === 'rd'});
                    out[k][pk] = {status: d.status, url: d.finalUrl, h1: d.parts?.h1, denied: d.denied, login: d.login, main: flat(d.parts?.mainText, 200), nav: (d.parts?.nav || []).map((x) => x.t).join('|')};
                }
            }
            await vas(null);
            if (!S.noneDone) {
                await as(NU.mg, N.path);
                const since = psql('select now()');
                out.jobsBefore = psql("select count(*) from jobs");
                out.publish = await publishRow(N.path, 'Vol. 1 No. 2 (2026)', {email: true});
                out.jobsAfter = psql("select count(*) from jobs");
                out.jobsNew = psql(`select id, queue, substring(payload from '"displayName":"([^"]+)"') from jobs where to_timestamp(created_at) >= '${since}'::timestamptz - interval '2 seconds'`);
                out.notifications = psql(`select type, count(*) from notifications where context_id=${N.id} group by 1`);
                out.create = await createIssueOnScreen(N.path, {v: 7, n: 7, y: 2031}, 'o-created');
                out.db = dbIssues(N.id);
                S.noneDone = true; save();
            }
            fact('none', out);
        });

        // ============================================================ lang (a cover for the primary language only, read in French; R's section form)
        if (on('lang')) await sect('lang', async () => {
            const out = {};
            if (!S.L) {
                const L = await app.api.createContext({tag: `${S.t}l`, context: {name: `U50 K3 L ${S.t}`, supportedLocales: ['en', 'fr_CA']}, users: [{username: `${S.t}lmg`, roles: ['manager']}],
                    issues: [{volume: 1, number: 1, year: 2026, published: true, coverImage: {file: 'profile-image-400.png', altText: 'K3 L alt'}}]});
                S.L = {path: L.path, id: L.contextId, issues: L.issues}; save();
            }
            await vas(null);
            const id = S.L.issues[0].id;
            const en = await land(vis.page, `/index.php/${S.L.path}/en/issue/view/${id}`, 'c-01-l-issue-en');
            const fr = await land(vis.page, `/index.php/${S.L.path}/fr_CA/issue/view/${id}`, 'c-02-l-issue-fr');
            const frArch = await land(vis.page, `/index.php/${S.L.path}/fr_CA/issue/archive`, 'c-03-l-archive-fr');
            await vis.page.goto(app.url(`/index.php/${S.L.path}/en/issue/archive`)); await idle(vis.page);
            out.en = {cover: en.parts?.toc?.cover, h1: en.parts?.h1};
            out.fr = {cover: fr.parts?.toc?.cover, h1: fr.parts?.h1, bc: fr.parts?.breadcrumb?.text, published: fr.parts?.toc?.published};
            out.frArchive = frArch.parts?.archive;
            // R: Settings › Journal › Sections › "Hidden Sec" › Edit
            await as(RU.mg, R.path);
            await page.goto(u(R.path, '/management/settings/context')); await idle(page);
            await page.getByRole('tab', {name: 'Sections', exact: true}).first().click(); await idle(page); await sleep(800);
            const panel = page.getByRole('tabpanel', {name: 'Sections'});
            const row = panel.locator('tr.gridRow').filter({hasText: 'Hidden Sec'}).first();
            await row.locator('a.show_extras').click().catch(() => {});
            await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click().catch(() => {});
            await page.locator('[role="dialog"]:visible form').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(800);
            out.hidBoxes = await page.locator('[role="dialog"]:visible form').first().evaluate((fm) => [...fm.querySelectorAll('input[type=checkbox]')].slice(0, 7).map((c) => `${c.checked ? '[x]' : '[ ]'} ${(c.labels?.[0]?.innerText || c.name).replace(/\s+/g, ' ').trim()}`)).catch(() => null);
            await snap('c-04-r-hidden-section-form', {boxes: out.hidBoxes});
            await closeWindow();
            fact('lang', out);
        });

        // ============================================================ leave (Distribution › Access left with an unsaved change; M's Back Issues order)
        if (on('leave')) await sect('leave', async () => {
            const out = {};
            const E = S.E;
            await as(E.mg, E.path);
            await page.goto(u(E.path, '/management/settings/distribution')); await idle(page);
            await page.getByRole('tab', {name: 'Access', exact: true}).first().click(); await idle(page); await sleep(600);
            out.tabs = (await page.getByRole('tab').allInnerTexts()).map((x) => flat(x, 40));
            const fm = page.locator('[role="tabpanel"]:visible form').first();
            await fm.getByText('The journal will require subscriptions to access some or all of its contents.', {exact: true}).click();
            await sleep(400);
            out.revealed = await fm.locator('select').filter({visible: true}).evaluateAll((els) => els.map((e) => e.name)).catch(() => null);
            const d0 = dialogs.length;
            const other = page.getByRole('tab').filter({hasNotText: 'Access'}).filter({visible: true}).first();
            out.otherTab = flat(await other.innerText().catch(() => null), 40);
            await other.click(); await idle(page); await sleep(600);
            out.afterTabSwitch = {dialogs: dialogs.slice(d0)};
            await page.getByRole('tab', {name: 'Access', exact: true}).first().click(); await idle(page); await sleep(500);
            out.backOnAccess = await page.locator('[role="tabpanel"]:visible form').first().evaluate((x) => [...x.querySelectorAll('input[type=radio]')].filter((r) => r.name === 'publishingMode').map((r) => `${r.checked ? '(x)' : '( )'} ${r.value}`)).catch(() => null);
            await snap('l-01-e-access-unsaved');
            const d1 = dialogs.length;
            await page.goto(u(E.path, '/manageIssues')).catch((e) => { out.gotoErr = flat(e.message, 200); });
            await idle(page).catch(() => {});
            out.afterLeave = {dialogs: dialogs.slice(d1), url: page.url().replace(app.baseURL, '')};
            await page.goto(u(E.path, '/management/settings/distribution')); await idle(page);
            await page.getByRole('tab', {name: 'Access', exact: true}).first().click(); await idle(page); await sleep(600);
            out.reopened = await page.locator('[role="tabpanel"]:visible form').first().evaluate((x) => [...x.querySelectorAll('input[type=radio]')].filter((r) => r.name === 'publishingMode').map((r) => `${r.checked ? '(x)' : '( )'} ${r.value}`)).catch(() => null);
            await snap('l-02-e-access-reopened');
            // M: Back Issues against Archives
            await as(S.M.mg, S.M.path);
            await page.goto(u(S.M.path, '/manageIssues')); await idle(page);
            await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page);
            const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
            await panel.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            out.mBack = await gridRead(panel.locator('table').first());
            await snap('l-03-m-back-issues', {grid: out.mBack});
            out.mCurrent = psql(`select current_issue_id from journals where journal_id=${S.M.id}`);
            await page.goto(u(R.path, '/manageIssues')).catch(() => {});
            await as(RU.mg, R.path);
            await page.goto(u(R.path, '/manageIssues')); await idle(page);
            await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page);
            const p2 = page.getByRole('tabpanel', {name: 'Back Issues'});
            await p2.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            out.rBack = await gridRead(p2.locator('table').first());
            await snap('l-04-r-back-issues', {grid: out.rBack});
            fact('leave', out);
        });

        if (on('ctl')) await sect('ctl', controls);
    } finally {
        record('k3-dialogs', {dialogs});
        await close();
        await vis.close();
    }

    // ------------------------------------------------------------------ OMP / OPS (and OJS) read-only controls
    async function controls() {
        const out = {};
        const ctx = app.contextPath;
        await vas(null);
        for (const [k, p] of [['current', '/issue/current'], ['archive', '/issue/archive'], ['view', '/issue/view/1'], ['home', '']]) {
            const d = await land(vis.page, `/index.php/${ctx}${p}`, `ctl-${k}`, {shotIt: k !== 'view'});
            out[k] = {...short(d), nav: (d.parts?.nav || []).map((x) => x.t).join('|'), homeCurrent: !!d.parts?.homeCurrent};
        }
        const site = await land(vis.page, '/index.php/index', 'ctl-site-home', {shotIt: false});
        out.site = {status: site.status, url: site.finalUrl, h1: site.parts?.h1};
        out.siteLinks = await vis.page.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const li = document.querySelector('.journals li, .page_index_site li');
            return {first: li ? f(li.innerText).slice(0, 200) : null, linkTexts: [...new Set([...document.querySelectorAll('.page_index_site .links a')].map((a) => f(a.innerText)))]};
        }).catch(() => null);
        await as('manager.maya', ctx);
        await page.goto(u(ctx, '/management/settings/distribution')); await idle(page);
        out.distributionTabs = (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
        await snap('ctl-distribution');
        const acc = page.getByRole('tab', {name: 'Access', exact: true});
        if (await acc.count()) {
            await acc.first().click(); await idle(page); await sleep(600);
            const sa0 = await snap('ctl-distribution-access');
            out.accessTab = flat(sa0.text?.main, 500);
        }
        await page.goto(u(ctx, '/management/settings/website')); await idle(page);
        await page.locator('#appearance-button').first().click().catch(() => {}); await idle(page); await sleep(500);
        await page.getByRole('tab', {name: 'Theme', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(1000);
        const th = await snap('ctl-theme');
        out.themeHasJco = /Journal Content Organization/.test(th.text?.main || '');
        await page.goto(u(ctx, '/management/settings/access')); await idle(page);
        await page.getByRole('tab', {name: 'Site Access Options', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(600);
        const sa = await snap('ctl-site-access');
        out.siteAccess = flat((sa.text?.main || '').match(/View [A-Za-z]+ Content[\s\S]{0,120}/)?.[0], 200);
        out.siteAccessBoxes = await page.locator('[role="tabpanel"]:visible form').first().evaluate((fm) => [...fm.querySelectorAll('input[type=checkbox]')].map((c) => `${c.checked ? '[x]' : '[ ]'} ${(c.labels?.[0]?.innerText || c.name).replace(/\s+/g, ' ').trim()}`)).catch(() => null);
        // Settings › Website › Plugins: the PDF viewer row
        await page.goto(u(ctx, '/management/settings/website')); await idle(page);
        await page.locator('#plugins-button').first().click().catch(() => {}); await idle(page); await sleep(1500);
        out.pdfRow = await page.locator('tr.gridRow').filter({hasText: /PDF\.?JS PDF Viewer/i}).first().evaluate((tr) => ({text: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 160), enabled: tr.querySelector('input[type=checkbox]')?.checked})).catch(() => null);
        await snap('ctl-plugins-pdf', {pdfRow: out.pdfRow});
        // the section (series) form's boxes
        await page.goto(u(ctx, '/management/settings/context')); await idle(page);
        const tabName = app.name === 'omp' ? 'Series' : 'Sections';
        await page.getByRole('tab', {name: tabName, exact: true}).first().click().catch(() => {}); await idle(page); await sleep(800);
        const panel = page.getByRole('tabpanel', {name: tabName});
        const row = panel.locator('tr.gridRow').first();
        await row.locator('a.show_extras').click().catch(() => {});
        await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click().catch(() => {});
        await page.locator('[role="dialog"]:visible form').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(800);
        out.sectionBoxes = await page.locator('[role="dialog"]:visible form').first().evaluate((fm) => [...fm.querySelectorAll('input[type=checkbox]')].map((c) => `${c.checked ? '[x]' : '[ ]'} ${(c.labels?.[0]?.innerText || c.name).replace(/\s+/g, ' ').trim()}`)).catch(() => null);
        await snap('ctl-section-form', {boxes: out.sectionBoxes});
        await closeWindow();
        await signOut(page); who = null;
        fact('ctl', out);
    }
});
