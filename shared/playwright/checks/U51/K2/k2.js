const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U51 claim check, chunk K2 — the publishing mode and what is restricted
// (docs/specs/U51-subscriptions.md body lines 10–43, 69–80, 193–325, 553–564, Settings bullets 1–3, 5–6, 11, 14,
// register A1, A5, A7, A14, OPS1). Chunk plan: .reports/U51/claimcheck-chunks.md.
//
//   PROBE_FEATURE=U51 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U51/K2/k2.js
//   PHASES=seed,access,… narrows (state in .reports/U51/ccK2/k2-state-<app>.json; the seed runs once per state
//   file, the mutating phases once per state: delete the state file to drive a later build afresh). The full run
//   outlasts the Bash tool's 600 s cap: run it detached (patterns.md "Probe kit").
//   The "mail" phase runs the OpenAccessNotification task (lib/pkp/tools/scheduler.php test) and drains the
//   fleet's job queue (lib/pkp/tools/jobs.php run): run it alone on the fleet.
//
// OJS scratch journals (tag prefix u51k2), every one created through `POST scenarios/context`:
//   A   fresh (no publishingMode row); mg; one published issue with an article and a "Full Issue" PDF.
//       Access tab (td4, A1, Rules 1, 5), then saved to "subscriptions required".
//   S   subscriptions required, payments off, Partial expiry on, the Subscription Block placed; one account per
//       role level (mg ed pe se ge ce le eb sm au au2 tr rv rd) plus sb (active individual subscription) and
//       ex (expired 2026-06-01). Issues I1 (2026, Subscription, Full Issue PDF+HTML; articles R: PDF, HTML,
//       "Data Set" file, references; O: "Open Access" ticked), I2 (open access; P), I3 (Subscription, open
//       access date 2026-01-01; Q), I4 (Subscription, published 2025-06-01, open access date 2027-01-01,
//       Full Issue PDF; F, and T published on screen into it dated 2025-09-01). Rules 7–12, 11a, A5, A7, td9.
//   P0  payments set up, no fee.   P1  + "Purchase Article" 5, "Purchase Issue" 20.   PM  + membership 7 only.
//   PX  fees 5 / 20 saved with payments not enabled.   Rules 10, 12 (td6, td7, td8).
//   PD  payments + "Only Restrict Access to PDF…", no fee; PD2 + fees 5 / 20; PD3 + membership 7. td23, A14.
//   I   subscriptions + "Users must be registered…" + an institution covering 127.0.0.1 with an active
//       institutional subscription. Rules 11 (institution), 13's exception.
//   R   subscriptions + "Users must be registered…"; I1 Subscription (R restricted, O open), I2 open (P). td24.
//   N   not online; mg se ce sm au au2 rv tr rd. Rule 4.
//   D   subscriptions; E published open earlier, U1/U2 unpublished with a scheduled article each. td5 (Rule 6).
//   O   subscriptions with a Subscription issue, then switched to open access on screen. Rule 2.
//   M   subscriptions, principal contact set; r1 r2 r3; I1 open access date today, I2 Subscription (switched to
//       "Open access" on screen), I3 with an article whose "Open Access" box is ticked on screen. M0 the same
//       with the policy box unticked. The open-access email (Settings 11, 14).
// OMP, OPS: read-only controls on publicknowledge (Distribution tabs, side menu, Roles, the subscription
//   addresses signed out); a scratch press with payments on (side menu, /payments); a scratch server for OPS1.
// Database reads (psql SELECT) are for evidence only; nothing is written there. No assertions.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir, users} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'access', 'smgr', 'roles', 'pay', 'pdf', 'inst', 'reg', 'none', 'doa', 'open', 'partial', 'settings', 'newissue', 'mail', 'search', 'absence', 'ops1'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k2]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k2-state-${app.name}.json`);
const today = new Date().toISOString().slice(0, 10);
const NOTIF_OA = 50331659; // Notification::NOTIFICATION_TYPE_OPEN_ACCESS (0x300000B)

function psql(sql) {
    try {
        return execFileSync('psql', [dbName('ojs'), '-At', '-F', '|', '-c', sql], {encoding: 'utf8'}).trim();
    } catch (e) {
        return `psql error: ${flat(e.message, 200)}`;
    }
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 2));
    const fact = (k, v) => { record('k2-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };

    // ------------------------------------------------------------------ seed (OJS)
    if (on('seed') && isOJS && !S.seeded) {
        const t = tag('u51k2');
        S.t = t; S.C = {}; S.s = {};
        const U = (p, k, role, extra = {}) => ({username: `${p}${k}`, roles: [role], givenName: k.toUpperCase(), familyName: `K2${k}`, ...extra});
        const base = (p, name, extra = {}) => ({name: `U51 K2 ${name}`, acronym: 'KTWO', contactName: 'K2 Principal', contactEmail: `${p}pc@mail.test`, ...extra});
        const PAY = {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Send a cheque to K2.'};
        const mk = async (key, spec) => {
            const p = `${t}${key}`;
            try {
                const r = await app.api.createContext({tag: p, ...spec(p)});
                S.C[key] = {path: r.path || p, p, issues: r.issues || []};
                log('seed ctx', key, S.C[key].path, JSON.stringify(r.issues || []).slice(0, 400));
            } catch (e) { log('seed ctx FAILED', key, String(e.message).slice(0, 900)); S.C[key] = {error: String(e.message).slice(0, 900)}; }
            save();
            return S.C[key];
        };
        const sub = async (key, k, spec) => {
            const C = S.C[key];
            if (!C || C.error) return;
            const title = `K2 ${k} ${key} ${t}`;
            try {
                const r = await app.api.createSubmission({tag: `${t}${key}${k}`, context: C.path, submitter: `${C.p}au`, title, ...spec});
                S.s[`${key}.${k}`] = {id: r.submissionId, pub: r.publicationId, title};
                log('seed sub', key, k, r.submissionId);
            } catch (e) { log('seed sub FAILED', key, k, String(e.message).slice(0, 700)); S.s[`${key}.${k}`] = {error: String(e.message).slice(0, 700)}; }
            save();
        };
        const PDF = {label: 'PDF', file: 'article.pdf'};
        const HTML = {label: 'HTML', file: 'article.html'};
        const DATA = {label: 'Data', file: 'notes.md', genre: 'Data Set'};
        const pubIn = (v, n, y, extra = {}) => ({published: true, issue: {volume: v, number: n, year: y}, ...extra});
        const indiv = {name: 'K2 Individual', cost: 10, currency: 'USD', duration: 12};

        // A — fresh journal
        await mk('A', (p) => ({context: base(p, 'fresh'), users: [U(p, 'mg', 'manager'), U(p, 'au', 'author')],
            issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: [PDF]}]}));
        await sub('A', 'R', pubIn(1, 1, 2026, {galleys: [PDF]}));

        // S — the main subscription journal
        const sRoles = [['mg', 'manager'], ['ed', 'editor'], ['pe', 'productionEditor'], ['se', 'sectionEditor'], ['ge', 'guestEditor'],
            ['ce', 'copyeditor'], ['le', 'layoutEditor'], ['eb', 'editorialBoardMember'], ['sm', 'subscriptionManager'], ['au', 'author'],
            ['au2', 'author'], ['tr', 'translator'], ['rv', 'externalReviewer'], ['rd', 'reader'], ['sb', 'reader'], ['ex', 'reader']];
        await mk('S', (p) => ({context: base(p, 'subscriptions'), publishingMode: 'subscription', sidebar: ['subscriptionblockplugin'],
            subscriptionName: 'K2 Subscriptions Desk', subscriptionEmail: `${p}desk@mail.test`, subscriptionExpiryPartial: true,
            users: sRoles.map(([k, r]) => U(p, k, r)),
            subscriptionTypes: [indiv],
            subscriptions: [{user: `${p}sb`, type: 'K2 Individual'}, {user: `${p}ex`, type: 'K2 Individual', dateStart: '2025-06-01', dateEnd: '2026-06-01'}],
            issues: [
                {volume: 2, number: 2, year: 2025, published: true, datePublished: '2025-06-01', openAccessDate: '2027-01-01', galleys: [PDF]},
                {volume: 2, number: 1, year: 2025, published: true, datePublished: '2025-03-01', openAccessDate: '2026-01-01'},
                {volume: 1, number: 2, year: 2026, published: true, accessStatus: 'open'},
                {volume: 1, number: 1, year: 2026, published: true, galleys: [PDF, HTML]},
            ]}));
        await sub('S', 'R', pubIn(1, 1, 2026, {galleys: [PDF, HTML, DATA], citationsRaw: ['Kestrel, A. (2020). A first reference.', 'Heron, B. (2021). A second reference.']}));
        if (S.C.S && !S.C.S.error) {
            try {
                const r = await app.api.createSubmission({tag: `${t}SO`, context: S.C.S.path, submitter: `${S.C.S.p}au2`, title: `K2 O S ${t}`, ...pubIn(1, 1, 2026, {galleys: [PDF], accessStatus: 'open'})});
                S.s['S.O'] = {id: r.submissionId, pub: r.publicationId, title: `K2 O S ${t}`};
            } catch (e) { S.s['S.O'] = {error: String(e.message).slice(0, 700)}; log('seed sub FAILED S O', e.message.slice(0, 500)); }
        }
        await sub('S', 'P', pubIn(1, 2, 2026, {galleys: [PDF]}));
        await sub('S', 'Q', pubIn(2, 1, 2025, {galleys: [PDF]}));
        await sub('S', 'F', pubIn(2, 2, 2025, {galleys: [PDF]}));
        await sub('S', 'T', {decisions: ['skipExternalReview', 'sendToProduction'], galleys: [PDF]});

        // payments journals
        const payJournal = (key, name, payments, extraGalleys = []) => mk(key, (p) => ({context: base(p, name), publishingMode: 'subscription',
            payments, subscriptionName: 'K2 Subscriptions Desk', subscriptionEmail: `${p}desk@mail.test`,
            users: [U(p, 'mg', 'manager'), U(p, 'au', 'author'), U(p, 'rd', 'reader'), U(p, 'sb', 'reader')],
            subscriptionTypes: [indiv], subscriptions: [{user: `${p}sb`, type: 'K2 Individual'}],
            issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: [PDF, ...extraGalleys]}]}));
        await payJournal('P0', 'payments no fee', {...PAY});
        await sub('P0', 'R', pubIn(1, 1, 2026, {galleys: [PDF]}));
        await payJournal('P1', 'payments fees', {...PAY, purchaseArticleFee: 5, purchaseIssueFee: 20});
        await sub('P1', 'R', pubIn(1, 1, 2026, {galleys: [PDF]}));
        await payJournal('PM', 'payments membership', {...PAY, membershipFee: 7}, [HTML]);
        await sub('PM', 'R', pubIn(1, 1, 2026, {galleys: [PDF, HTML]}));
        await payJournal('PX', 'fees payments off', {...PAY, enabled: false, purchaseArticleFee: 5, purchaseIssueFee: 20});
        await sub('PX', 'R', pubIn(1, 1, 2026, {galleys: [PDF]}));
        await payJournal('PD', 'pdf only', {...PAY, restrictOnlyPdf: true}, [HTML]);
        await sub('PD', 'R', pubIn(1, 1, 2026, {galleys: [PDF, HTML]}));
        await payJournal('PD2', 'pdf only fees', {...PAY, restrictOnlyPdf: true, purchaseArticleFee: 5, purchaseIssueFee: 20}, [HTML]);
        await sub('PD2', 'R', pubIn(1, 1, 2026, {galleys: [PDF, HTML]}));
        await payJournal('PD3', 'pdf only membership', {...PAY, restrictOnlyPdf: true, membershipFee: 7}, [HTML]);
        await sub('PD3', 'R', pubIn(1, 1, 2026, {galleys: [PDF, HTML]}));

        // I — institution covering the browser's address
        await mk('I', (p) => ({context: base(p, 'institution'), publishingMode: 'subscription', restrictArticleAccess: true,
            users: [U(p, 'mg', 'manager'), U(p, 'au', 'author'), U(p, 'rd', 'reader'), U(p, 'ic', 'reader')],
            institutions: [{name: 'K2 Loopback University', ipRanges: ['127.0.0.1']}],
            subscriptionTypes: [{name: 'K2 Institutional', cost: 100, currency: 'USD', duration: 12, institutional: true}],
            subscriptions: [{user: `${p}ic`, type: 'K2 Institutional', institution: 'K2 Loopback University'}],
            issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: [PDF]}]}));
        await sub('I', 'R', pubIn(1, 1, 2026, {galleys: [PDF]}));

        // R — registered readers only
        await mk('R', (p) => ({context: base(p, 'registered'), publishingMode: 'subscription', restrictArticleAccess: true,
            users: [U(p, 'mg', 'manager'), U(p, 'au', 'author'), U(p, 'rd', 'reader')],
            issues: [{volume: 1, number: 2, year: 2026, published: true, accessStatus: 'open', galleys: [PDF]},
                {volume: 1, number: 1, year: 2026, published: true, galleys: [PDF]}]}));
        await sub('R', 'R', pubIn(1, 1, 2026, {galleys: [PDF]}));
        await sub('R', 'O', pubIn(1, 1, 2026, {galleys: [PDF], accessStatus: 'open'}));
        await sub('R', 'P', pubIn(1, 2, 2026, {galleys: [PDF]}));

        // N — not online
        await mk('N', (p) => ({context: base(p, 'not online'), publishingMode: 'none',
            users: [['mg', 'manager'], ['se', 'sectionEditor'], ['ce', 'copyeditor'], ['sm', 'subscriptionManager'], ['au', 'author'],
                ['au2', 'author'], ['rv', 'externalReviewer'], ['tr', 'translator'], ['rd', 'reader']].map(([k, r]) => U(p, k, r)),
            issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: [PDF]}]}));
        await sub('N', 'R', pubIn(1, 1, 2026, {galleys: [PDF]}));

        // D — delayed open access, driven on screen
        await mk('D', (p) => ({context: base(p, 'delayed'), publishingMode: 'subscription',
            users: [U(p, 'mg', 'manager'), U(p, 'au', 'author'), U(p, 'rd', 'reader')],
            issues: [{volume: 1, number: 1, year: 2025, published: true, datePublished: '2025-05-01', accessStatus: 'open'},
                {volume: 3, number: 1, year: 2026, galleys: [PDF]}, {volume: 3, number: 2, year: 2026}]}));
        await sub('D', 'E', pubIn(1, 1, 2025, {galleys: [PDF]}));
        await sub('D', 'U1', pubIn(3, 1, 2026, {galleys: [PDF]}));
        await sub('D', 'U2', pubIn(3, 2, 2026, {galleys: [PDF]}));

        // O — switched to open on screen
        await mk('O', (p) => ({context: base(p, 'to open'), publishingMode: 'subscription', sidebar: ['subscriptionblockplugin'],
            users: [U(p, 'mg', 'manager'), U(p, 'au', 'author'), U(p, 'rd', 'reader')],
            subscriptionTypes: [indiv],
            issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: [PDF]}]}));
        await sub('O', 'R', pubIn(1, 1, 2026, {galleys: [PDF]}));

        // M / M0 — the open-access email
        const mail = (key, name) => mk(key, (p) => ({context: base(p, name), publishingMode: 'subscription',
            users: [U(p, 'mg', 'manager'), U(p, 'au', 'author'), U(p, 'r1', 'reader'), U(p, 'r2', 'reader'), U(p, 'r3', 'reader')],
            issues: [{volume: 1, number: 1, year: 2026, published: true, openAccessDate: today},
                {volume: 1, number: 2, year: 2026, published: true}, {volume: 1, number: 3, year: 2026, published: true}]}));
        await mail('M', 'mail');
        await sub('M', 'A3', pubIn(1, 3, 2026, {galleys: [PDF]}));
        await mail('M0', 'mail off');
        S.seeded = true;
        save();
    }
    if (isOJS && !S.seeded) { log('not seeded'); return; }

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), url: page.url()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const downloads = [];
    page.on('download', (d) => downloads.push({name: d.suggestedFilename(), url: d.url()}));
    let who = 'visitor';

    async function snap(name, extra = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 300)}; }
        Object.assign(s, extra, {who});
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    }
    async function sect(name, fn) {
        log(`--- ${name}`);
        try { return await fn(); } catch (e) {
            log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            fact(`${name}.FAILED`, flat(e.stack || e.message, 1500));
            await snap(`zz-failed-${name}`).catch(() => {});
            return null;
        }
    }
    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const as = async (user, ctx) => {
        await signIn(page, user, {contextPath: ctx}).catch(async (e) => {
            log('signIn landed slowly', user, flat(e.message, 120));
        });
        await idle(page).catch(() => {});
        who = user;
    };
    const visitor = async () => { await signOut(page).catch(() => {}); who = 'visitor'; };

    /** What a reader page shows, read in the page (the frontend has no main landmark). */
    async function readerFacts() {
        return page.evaluate(() => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => e.getClientRects().length > 0;
            const body = document.body ? document.body.innerText : '';
            const galleys = [...document.querySelectorAll('a.obj_galley_link, a.obj_galley_link_supplementary')].filter(vis).map((a) => {
                const b = getComputedStyle(a, '::before');
                const where = a.closest('.obj_issue_toc > .galleys, .obj_issue_toc .galleys:not(.obj_article_summary .galleys)') && !a.closest('.obj_article_summary') ? 'fullIssue'
                    : a.closest('.obj_article_summary') ? `toc:${t((a.closest('.obj_article_summary').querySelector('.title') || {}).innerText).slice(0, 60)}`
                        : a.classList.contains('obj_galley_link_supplementary') ? 'supplementary' : 'article';
                return {where, label: t(a.innerText), cls: a.className, sr: t((a.querySelector('.pkp_screen_reader') || {}).textContent) || null,
                    cost: t((a.querySelector('.purchase_cost') || {}).textContent) || null, href: a.href.replace(location.origin, ''),
                    icon: b.content, iconFont: b.fontFamily.slice(0, 40)};
            });
            return {
                title: document.title,
                h1: [...document.querySelectorAll('h1')].filter(vis).map((e) => t(e.innerText)).filter(Boolean),
                galleyView: !!document.querySelector('header.header_view'),
                pdfFrame: !!document.querySelector('iframe[src*="pdfJsViewer"], iframe[src*="pdf.js"]'),
                htmlFrame: !!document.querySelector('iframe[name="htmlFrame"], #htmlGalleyFrame, .galley_view iframe'),
                nav: [...document.querySelectorAll('.pkp_navigation_primary a, #navigationPrimary a')].map((a) => t(a.innerText)).filter(Boolean),
                userNav: [...document.querySelectorAll('#navigationUser a, .pkp_navigation_user a')].map((a) => t(a.innerText)).filter(Boolean),
                blocks: [...document.querySelectorAll('.pkp_structure_sidebar .pkp_block')].map((b) => t(b.innerText).slice(0, 240)),
                notices: [...document.querySelectorAll('.pkp_notification, .cmp_notification, [role=alert], .pkp_form_error')].filter(vis).map((e) => t(e.innerText)).filter(Boolean),
                denied: /does not have access to this operation|does not publish its content online/i.test(body),
                loginForm: !!document.querySelector('form.cmp_form.login, form#login, .page_login form'),
                abstract: t((document.querySelector('.item.abstract') || {}).innerText).slice(0, 200) || null,
                authors: t((document.querySelector('.item.authors') || {}).innerText).slice(0, 200) || null,
                references: t((document.querySelector('.item.references') || {}).innerText).slice(0, 300) || null,
                tocTitles: [...document.querySelectorAll('.obj_issue_toc .obj_article_summary .title')].map((e) => t(e.innerText).slice(0, 80)),
                bodyStart: t(body).slice(0, 900),
                galleys,
            };
        }).catch((e) => ({err: flat(e.message, 200)}));
    }
    /** Land on an address (typed), record the redirect chain and the screen. */
    async function land(p, name, extra = {}) {
        const chain = [];
        const onResp = (r) => { try { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${r.url().replace(app.baseURL, '')}`); } catch (e) { /* none */ } };
        page.on('response', onResp);
        const dl0 = downloads.length;
        await page.goto(p.startsWith('http') ? p : app.url(p)).catch((e) => chain.push(`goto error ${flat(e.message, 120)}`));
        await idle(page).catch(() => {});
        page.off('response', onResp);
        const f = await readerFacts();
        f.url = page.url().replace(app.baseURL, '');
        f.chain = chain;
        f.download = downloads.slice(dl0).map((d) => d.name);
        await snap(name, {landing: f, ...extra});
        return f;
    }
    /** Press a link on the current page (a galley), follow what happens, record the landing. */
    async function press(a, name, extra = {}) {
        const info = await a.evaluate((e) => ({href: e.href.replace(location.origin, ''), label: e.innerText.replace(/\s+/g, ' ').trim(), from: location.pathname})).catch(() => null);
        if (!info) { const r = {missing: true}; await snap(name, {press: r, ...extra}); return r; }
        const chain = [];
        const onResp = (r) => { try { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${r.url().replace(app.baseURL, '')}`); } catch (e) { /* none */ } };
        page.on('response', onResp);
        const dl0 = downloads.length;
        const what = new Promise((res) => {
            const timer = setTimeout(() => res('none'), 12_000);
            const onNav = (fr) => { if (fr === page.mainFrame()) { clearTimeout(timer); page.off('framenavigated', onNav); res('nav'); } };
            page.on('framenavigated', onNav);
            page.once('download', () => { clearTimeout(timer); res('download'); });
        });
        await a.click().catch((e) => chain.push(`click error ${flat(e.message, 100)}`));
        const kind = await what;
        await page.waitForLoadState('load').catch(() => {});
        await idle(page).catch(() => {});
        await sleep(300);
        page.off('response', onResp);
        const f = await readerFacts();
        f.url = page.url().replace(app.baseURL, '');
        f.chain = chain; f.kind = kind; f.pressed = info;
        f.download = downloads.slice(dl0).map((d) => d.name);
        await snap(name, {press: f, ...extra});
        return f;
    }
    const brief = (f) => f && ({url: f.url, chain: f.chain, kind: f.kind, h1: f.h1, galleyView: f.galleyView, pdf: f.pdfFrame, html: f.htmlFrame,
        denied: f.denied, login: f.loginForm, download: f.download && f.download.length ? f.download : undefined, notices: f.notices && f.notices.length ? f.notices : undefined,
        body: (f.denied || f.loginForm || !f.galleyView) ? flat(f.bodyStart, 420) : undefined});
    const lockOf = (f) => (f.galleys || []).map((g) => ({where: g.where, label: g.label, locked: /restricted/.test(g.cls), sr: g.sr, cost: g.cost, icon: g.icon}));
    const galleyLink = (label, where = 'article') => {
        if (where === 'fullIssue') return page.locator('.obj_issue_toc > .galleys a.obj_galley_link, .obj_issue_toc .heading ~ .galleys a.obj_galley_link').filter({hasText: label}).first();
        if (where === 'supplementary') return page.locator('a.obj_galley_link_supplementary').filter({hasText: label}).first();
        return page.locator('.item.galleys a.obj_galley_link').filter({hasText: new RegExp(`${label}\\s*(\\(|$)`)}).first();
    };
    const tocGalley = (title, label) => page.locator('.obj_article_summary').filter({hasText: title}).locator('a.obj_galley_link').filter({hasText: label}).first();
    /** Sign in on the Login page the browser is on (after a redirect), as the given user. */
    async function signInHere(user) {
        await page.locator('input[name=username]').fill(user);
        await page.locator('input[name=password]').evaluate((e) => e.removeAttribute('maxlength'));
        await page.locator('input[name=password]').fill(users.getPassword(user));
        const chain = [];
        const onResp = (r) => { try { if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${r.url().replace(app.baseURL, '')}`); } catch (e) { /* none */ } };
        page.on('response', onResp);
        await page.locator('form.cmp_form.login button[type=submit], .page_login button[type=submit]').first().click();
        await page.waitForURL((u) => !u.pathname.includes('/login'), {timeout: 15_000, waitUntil: 'commit'}).catch(() => {});
        await page.waitForLoadState('load').catch(() => {});
        await idle(page).catch(() => {});
        page.off('response', onResp);
        who = user;
        const f = await readerFacts();
        f.url = page.url().replace(app.baseURL, ''); f.chain = chain;
        return f;
    }
    const W = () => page.locator('[role="dialog"]:visible').last();

    // ---- Settings › Distribution › Access (Vue form)
    const accessPanel = () => page.locator('#access');
    async function openAccessTab(ctx) {
        await page.goto(cUrl(ctx, '/management/settings/distribution')); await idle(page);
        await page.getByRole('tab', {name: 'Access', exact: true}).click(); await idle(page); await sleep(400);
        await accessPanel().locator('form').first().waitFor({timeout: T});
    }
    async function readAccess() {
        return accessPanel().evaluate((root) => {
            const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const vis = (e) => e.getClientRects().length > 0;
            const radios = [...root.querySelectorAll('input[type=radio]')].map((r) => ({name: r.name, value: r.value, checked: r.checked, label: t((r.closest('label') || {}).innerText), visible: vis(r)}));
            const selects = [...root.querySelectorAll('select')].map((s) => ({name: s.name, visible: vis(s), value: s.value, selected: s.selectedIndex >= 0 ? t(s.options[s.selectedIndex].text) : null,
                label: t((root.querySelector(`label[for="${s.id}"]`) || {}).innerText), count: s.options.length, first: [...s.options].slice(0, 4).map((o) => t(o.text)), last: t((s.options[s.options.length - 1] || {}).text)}));
            const legends = [...root.querySelectorAll('legend, .pkpFormFieldLabel, label.pkpFormFieldLabel')].filter(vis).map((e) => t(e.innerText));
            return {radios, selects, legends, text: t(root.innerText).slice(0, 1500)};
        });
    }
    async function saveAccess(name) {
        const resp = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && ['PUT', 'POST'].includes(r.request().method()), {timeout: T}).catch(() => null);
        await accessPanel().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        const saved = await accessPanel().locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
        const status = await accessPanel().locator('[role="status"]').allInnerTexts().catch(() => []);
        const res = {status: r ? r.status() : null, method: r ? r.request().method() : null, saved, statusTexts: status.map((x) => flat(x, 80)), post: r ? flat(r.request().postData(), 300) : null,
            errors: await accessPanel().locator('.pkpFieldError').allInnerTexts().catch(() => [])};
        await snap(name, {save: res});
        return res;
    }

    // ---- the legacy grids (Issues)
    const gridRows = (scope) => scope.locator('tr.gridRow');
    async function readGrid(scope) {
        return scope.evaluate((root) => [...root.querySelectorAll('table')].filter((t) => t.getClientRects().length).map((t) => ({
            columns: [...t.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
            rows: [...t.querySelectorAll('tbody tr')].filter((tr) => tr.getClientRects().length && !tr.classList.contains('row_controls')).map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()),
        }))).catch((e) => [{err: String(e.message).slice(0, 200)}]);
    }
    async function rowActions(row) {
        const id = await row.getAttribute('id');
        await row.locator('a.show_extras').first().click(); await sleep(350);
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const links = await ctl.locator('a').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.trim())).catch(() => []);
        return {id, links, ctl};
    }
    const issueRow = (scope, name) => gridRows(scope).filter({has: page.getByRole('link', {name, exact: true})}).first();
    async function issuesPage(ctx, tab = 'Future Issues') {
        await page.goto(cUrl(ctx, '/manageIssues')); await idle(page);
        if (tab !== 'Future Issues') { await page.getByRole('tab', {name: tab, exact: true}).click(); await idle(page); }
        const panel = page.getByRole('tabpanel', {name: tab});
        await panel.locator('table').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(200);
        return panel;
    }
    async function openIssue(ctx, name, tab = 'Future Issues') {
        const panel = await issuesPage(ctx, tab);
        await panel.getByRole('link', {name, exact: true}).first().click();
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).pop(); return d && d.querySelector('[role=tab]'); }, null, {timeout: T}).catch(() => {});
        await idle(page); await sleep(400);
        return W();
    }
    async function windowTabs() { return (await W().getByRole('tab').allInnerTexts().catch(() => [])).map((x) => x.trim()); }
    async function windowTab(tabName) {
        await W().getByRole('tab', {name: tabName, exact: true}).click();
        await idle(page); await sleep(500);
        return W().getByRole('tabpanel', {name: tabName});
    }
    async function cancelWindow() {
        const w = W();
        const c = w.getByRole('link', {name: 'Cancel', exact: true});
        if (await c.count()) await c.first().click().catch(() => {});
        else await w.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await idle(page); await sleep(700);
    }
    /** The issue window's Access tab: read its form; optionally set the status and save. */
    async function issueAccess(ctx, name, tab, set, snapName) {
        await openIssue(ctx, name, tab);
        const tabs = await windowTabs();
        if (!tabs.includes('Access')) { await snap(snapName, {tabs}); await cancelWindow(); return {tabs}; }
        const panel = await windowTab('Access');
        const form = panel.locator('form').first();
        await form.locator('select').first().waitFor({timeout: T}).catch(() => {});
        await sleep(300);
        const read = async () => form.evaluate((f) => ({
            status: (() => { const s = f.querySelector('select'); return s ? s.options[s.selectedIndex].text : null; })(),
            date: (f.querySelector('input[name="openAccessDate"]') || f.querySelector('input[type=text]') || {}).value || null,
            text: f.innerText.replace(/\s+/g, ' ').trim().slice(0, 400),
        })).catch((e) => ({err: flat(e.message, 200)}));
        const before = await read();
        let saved = null;
        if (set) {
            await form.locator('select').first().selectOption({label: set});
            const resp = page.waitForResponse((r) => r.request().method() === 'POST' && /access|update/i.test(r.url()), {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await resp; await idle(page); await sleep(700);
            saved = {status: r ? r.status() : null, url: r ? r.url().replace(app.baseURL, '').slice(0, 140) : null};
        }
        await snap(snapName, {tabs, before, saved});
        if (await W().isVisible().catch(() => false)) await cancelWindow();
        return {tabs, before, saved};
    }
    async function publishIssue(ctx, name) {
        const panel = await issuesPage(ctx);
        const ra = await rowActions(issueRow(panel, name));
        await ra.ctl.getByRole('link', {name: 'Publish Issue', exact: true}).click();
        const w = page.locator('[role="dialog"]:visible').filter({has: page.getByRole('heading', {name: 'Publish Issue'})}).last();
        await w.locator('input[name=sendIssueNotification]').waitFor({timeout: T});
        const box = w.locator('input[name=sendIssueNotification]');
        const boxDefault = await box.isChecked();
        if (boxDefault) await box.uncheck();
        const text = flat(await w.innerText().catch(() => ''), 500);
        const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /publish-issue/.test(r.url()), {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: 'OK', exact: true}).click();
        const rp = await posted; await idle(page); await sleep(1000);
        return {status: rp ? rp.status() : null, boxDefault, text};
    }
    /** The editorial side menu, read without clicking. */
    async function readNav() {
        const nav = page.getByRole('navigation', {name: 'Site Navigation'});
        if (!(await nav.count().catch(() => 0))) return {present: false, url: page.url().replace(app.baseURL, '')};
        const groups = await nav.locator('[role="button"][aria-controls]').evaluateAll((els) => els.map((e) => {
            const region = document.getElementById(e.getAttribute('aria-controls') || '');
            return `${(e.getAttribute('aria-label') || e.textContent).replace(/\s+/g, ' ').trim()}${region ? ' › ' + [...region.querySelectorAll('[role="treeitem"]')].map((li) => (li.getAttribute('aria-label') || li.textContent).replace(/\s+/g, ' ').trim()).join(', ') : ''}`;
        })).catch(() => []);
        const single = await nav.locator('a').evaluateAll((els) => els.map((a) => `${a.textContent.replace(/\s+/g, ' ').trim()} -> ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}`)).catch(() => []);
        return {present: true, groups, links: single.filter((l) => /payments|subscription/i.test(l))};
    }
    async function distributionTabs(ctx) {
        await page.goto(cUrl(ctx, '/management/settings/distribution')); await idle(page);
        return (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
    }
    async function rolesList(ctx) {
        await page.goto(cUrl(ctx, '/management/settings/access')); await idle(page);
        const tab = page.getByRole('tab', {name: 'Roles', exact: true});
        if (await tab.count()) { await tab.first().click(); await idle(page); await sleep(800); }
        const text = await page.locator('#roles, [id$="roles"]').first().innerText().catch(() => null);
        await snap('roles-tab');
        return flat(text, 2500);
    }
    async function notifRow(user, ctx, mode, rowRe = /made open access/) {
        await as(user, ctx);
        await page.goto(cUrl(ctx, '/user/profile/notificationSettings')); await idle(page);
        const form = page.locator('form#notificationSettingsForm');
        await form.waitFor({timeout: T});
        const rowBoxes = await form.evaluate((f, src) => {
            const re = new RegExp(src);
            const boxes = [...f.querySelectorAll('input[type=checkbox]')];
            const sec = boxes.map((b) => b.closest('ul')).find((s) => s && re.test(s.innerText));
            const labels = [...f.querySelectorAll('label')].map((l) => l.innerText.replace(/\s+/g, ' ').trim()).filter((x) => re.test(x));
            return {boxes: sec ? [...sec.querySelectorAll('input[type=checkbox]')].map((b) => ({id: b.id, checked: b.checked, label: ((b.closest('label') || document.querySelector(`label[for="${b.id}"]`) || {}).innerText || '').replace(/\s+/g, ' ').trim()})) : [], labels,
                secText: sec ? sec.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : null};
        }, rowRe.source);
        const ids = rowBoxes.boxes.map((b) => b.id);
        if (mode === 'off' && ids[0]) await page.locator(`[id="${ids[0]}"]`).uncheck();
        if (mode === 'emailOff' && ids[1]) await page.locator(`[id="${ids[1]}"]`).check();
        let after = null;
        if (mode !== 'read') {
            const r = page.waitForResponse((x) => x.request().method() === 'POST' && /notification/i.test(x.url()), {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            await r; await idle(page);
            await page.goto(cUrl(ctx, '/user/profile/notificationSettings')); await idle(page);
            after = await page.locator('form#notificationSettingsForm').evaluate((f, list) => list.map((id) => { const b = f.querySelector(`[id="${id}"]`); return {id, checked: b && b.checked}; }), ids).catch(() => null);
        }
        await snap(`notif-${mode}-${user.slice(-3)}`, {rowBoxes, after});
        return {rowBoxes, after};
    }

    const C = S.C || {};
    const P = (k) => (C[k] || {}).path;
    const u = (k, x) => `${(C[k] || {}).p}${x}`;
    const art = (k, x) => S.s[`${k}.${x}`] || {};
    const issueId = (k, v, n, y) => ((C[k] || {}).issues || []).find((i) => String(i.volume) === String(v) && String(i.number) === String(n) && String(i.year) === String(y))?.id;

    try {
        // ================================================================== access (A: td4, A1, Rules 1 and 5)
        if (isOJS && on('access') && !S.accessDone) await sect('access', async () => {
            const out = {};
            const ctx = P('A');
            const R = art('A', 'R');
            // Rule 1: nobody has saved a choice; a visitor reads the published article and its galley
            await visitor();
            let f = await land(`/index.php/${ctx}/article/view/${R.id}`, 'ac-00-visitor-article');
            out.fresh = {locks: lockOf(f), nav: f.nav};
            out.fresh.press = brief(await press(galleyLink('PDF'), 'ac-00b-visitor-pdf'));
            f = await land(`/index.php/${ctx}/issue/current`, 'ac-00c-visitor-issue');
            out.fresh.issueLocks = lockOf(f);
            if (f.galleys.find((g) => g.where === 'fullIssue')) out.fresh.fullIssue = brief(await press(galleyLink('PDF', 'fullIssue'), 'ac-00d-visitor-fullissue'));
            await as(u('A', 'mg'), ctx);
            out.freshIssueWindow = await issueAccess(ctx, 'Vol. 1 No. 1 (2026)', 'Back Issues', null, 'ac-00e-issue-window-fresh');
            // td4: the tab as it arrives
            await openAccessTab(ctx);
            out.arrive = await readAccess();
            await snap('ac-01-access-arrive', {access: out.arrive});
            await loc(page, 'Settings › Distribution › Access: the "Publishing Mode" radios', accessPanel().locator('input[type=radio][name=publishingMode]'));
            // second choice: Delayed Open Access appears
            await accessPanel().getByRole('radio', {name: /require subscriptions/}).check();
            await sleep(400);
            out.second = await readAccess();
            await snap('ac-02-second-chosen', {access: out.second});
            await loc(page, 'Access: "Delayed Open Access" list', accessPanel().locator('select[name=delayedOpenAccessDuration]'));
            // first and third for the axis
            await accessPanel().getByRole('radio', {name: /provide open access/}).check(); await sleep(300);
            out.firstChosen = (await readAccess()).selects;
            await accessPanel().getByRole('radio', {name: /will not be used/}).check(); await sleep(300);
            out.thirdChosen = (await readAccess()).selects;
            await accessPanel().getByRole('radio', {name: /require subscriptions/}).check(); await sleep(300);
            out.save = await saveAccess('ac-03-saved');
            // reload: kept?
            await openAccessTab(ctx);
            out.reload = await readAccess();
            await snap('ac-04-reloaded', {access: out.reload});
            // third, unsaved, then another Distribution tab and back (the sweep's in-page leave)
            await accessPanel().getByRole('radio', {name: /will not be used/}).check(); await sleep(300);
            await page.getByRole('tab', {name: 'License', exact: true}).click(); await idle(page); await sleep(300);
            await page.getByRole('tab', {name: 'Access', exact: true}).click(); await idle(page); await sleep(300);
            out.tabSwitchBack = (await readAccess()).radios.filter((r) => r.checked).map((r) => r.label);
            await snap('ac-05-tab-switch-back');
            // leave Settings › Distribution through the side menu's "Journal"
            const d0 = dialogs.length;
            const nav = page.getByRole('navigation', {name: 'Site Navigation'});
            const journalLink = nav.getByRole('link', {name: 'Journal', exact: true}).first();
            await loc(page, 'Side menu: Settings › "Journal"', journalLink);
            await journalLink.click().catch(async () => { await page.goto(cUrl(ctx, '/management/settings/context')); });
            await page.waitForURL(/settings\/context/, {timeout: T}).catch(() => {});
            await idle(page);
            out.leftTo = page.url().replace(app.baseURL, '');
            out.leaveDialogs = dialogs.slice(d0);
            await snap('ac-06-left-to-journal', {dialogs: out.leaveDialogs});
            const distLink = nav.getByRole('link', {name: 'Distribution', exact: true}).first();
            await distLink.click().catch(async () => { await page.goto(cUrl(ctx, '/management/settings/distribution')); });
            await page.waitForURL(/settings\/distribution/, {timeout: T}).catch(() => {});
            await idle(page);
            await page.getByRole('tab', {name: 'Access', exact: true}).click(); await idle(page); await sleep(400);
            out.backAgain = await readAccess();
            await snap('ac-07-back-to-access', {access: out.backAgain});
            // the published open issue after the save
            out.issueWindowAfter = await issueAccess(ctx, 'Vol. 1 No. 1 (2026)', 'Back Issues', null, 'ac-08-issue-window-after');
            await visitor();
            f = await land(`/index.php/${ctx}/article/view/${R.id}`, 'ac-09-visitor-article-after');
            out.after = {locks: lockOf(f)};
            out.after.press = brief(await press(galleyLink('PDF'), 'ac-10-visitor-pdf-after'));
            note('ccK2 [ojs]: Settings › Distribution › Access: radios `input[type=radio][name=publishingMode]` (getByRole radio by label regex /require subscriptions/ etc.), "Delayed Open Access" is `select[name=delayedOpenAccessDuration]` inside `#access`; Save = `#access` getByRole button "Save", then `[role=status]` "Saved".');
            fact('access', out);
            S.accessDone = true; save();
        });

        // ================================================================== smgr (S as manager: the issue windows, Rules 3, 7, 9)
        if (isOJS && on('smgr')) await sect('smgr', async () => {
            const out = {};
            const ctx = P('S');
            await as(u('S', 'mg'), ctx);
            await openAccessTab(ctx);
            out.accessTab = await readAccess();
            await snap('sm-01-access-tab', {access: out.accessTab});
            for (const [name, key] of [['Vol. 1 No. 1 (2026)', 'I1'], ['Vol. 1 No. 2 (2026)', 'I2'], ['Vol. 2 No. 1 (2025)', 'I3'], ['Vol. 2 No. 2 (2025)', 'I4']]) {
                out[key] = await issueAccess(ctx, name, 'Back Issues', null, `sm-02-${key}-access`);
            }
            // TOC of I1: the "Open Access" column
            await openIssue(ctx, 'Vol. 1 No. 1 (2026)', 'Back Issues');
            await W().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            out.toc = await readGrid(W());
            out.tocBoxes = await W().locator('tr.gridRow input[type=checkbox]').evaluateAll((els) => els.map((e) => ({checked: e.checked, row: e.closest('tr').innerText.replace(/\s+/g, ' ').trim().slice(0, 80)}))).catch(() => []);
            await snap('sm-03-I1-toc', {toc: out.toc, boxes: out.tocBoxes});
            await cancelWindow();
            fact('smgr', out);
        });

        // ================================================================== roles (S: Rules 7–12, 11a, A5, A7, td9, td7 first half)
        if (isOJS && on('roles')) await sect('roles', async () => {
            const out = {};
            const ctx = P('S');
            const R = art('S', 'R'); const O = art('S', 'O');
            const accounts = ['mg', 'ed', 'pe', 'se', 'ge', 'ce', 'le', 'eb', 'sm', 'admin', 'au', 'au2', 'tr', 'rv', 'rd', 'sb', 'ex', 'visitor'];
            const I1 = issueId('S', 1, 1, 2026);
            for (const k of accounts) {
                if (on('onlyvisitor') && k !== 'visitor') continue;
                const o = {};
                if (k === 'visitor') await visitor(); else await as(k === 'admin' ? 'admin' : u('S', k), ctx);
                // the article's page
                let f = await land(`/index.php/${ctx}/article/view/${R.id}`, `ro-${k}-01-article`);
                o.article = {h1: f.h1, abstract: !!f.abstract, authors: !!f.authors, references: flat(f.references, 120), locks: lockOf(f)};
                o.pdf = brief(await press(galleyLink('PDF'), `ro-${k}-02-pdf`));
                await land(`/index.php/${ctx}/article/view/${R.id}`, `ro-${k}-03-article-again`);
                o.html = brief(await press(galleyLink('HTML'), `ro-${k}-04-html`));
                await land(`/index.php/${ctx}/article/view/${R.id}`, `ro-${k}-05-article-again`);
                o.data = brief(await press(galleyLink('Data', 'supplementary'), `ro-${k}-06-data`));
                // the open-access article O
                f = await land(`/index.php/${ctx}/article/view/${O.id}`, `ro-${k}-07-article-O`);
                o.O = {locks: lockOf(f)};
                o.O.pdf = brief(await press(galleyLink('PDF'), `ro-${k}-08-O-pdf`));
                // the issue page
                f = await land(`/index.php/${ctx}/issue/view/${I1}`, `ro-${k}-09-issue`);
                o.issue = {h1: f.h1, toc: f.tocTitles, locks: lockOf(f), blocks: f.blocks, nav: f.nav, userNav: f.userNav};
                o.fullIssue = brief(await press(galleyLink('PDF', 'fullIssue'), `ro-${k}-10-fullissue`));
                await land(`/index.php/${ctx}/issue/view/${I1}`, `ro-${k}-11-issue-again`);
                o.fullIssueHtml = brief(await press(galleyLink('HTML', 'fullIssue'), `ro-${k}-12-fullissue-html`));
                if (['rd', 'sb', 'ex', 'visitor', 'mg'].includes(k)) {
                    // I2 open, I3 past open access date, I4 future date
                    for (const [key, v, n, y, a] of [['I2', 1, 2, 2026, 'P'], ['I3', 2, 1, 2025, 'Q'], ['I4', 2, 2, 2025, 'F']]) {
                        const id = issueId('S', v, n, y);
                        f = await land(`/index.php/${ctx}/issue/view/${id}`, `ro-${k}-13-${key}`);
                        o[key] = {locks: lockOf(f)};
                        o[key].art = brief(await press(tocGalley(art('S', a).title, 'PDF'), `ro-${k}-14-${key}-${a}-pdf`));
                        if (key === 'I4') {
                            await land(`/index.php/${ctx}/issue/view/${id}`, `ro-${k}-15-I4-again`);
                            o.I4.full = brief(await press(galleyLink('PDF', 'fullIssue'), `ro-${k}-16-I4-fullissue`));
                        }
                    }
                }
                if (k === 'visitor' || k === 'rd') {
                    f = await land(`/index.php/${ctx}/issue/current`, `ro-${k}-17-current`); o.current = {h1: f.h1, nav: f.nav};
                    f = await land(`/index.php/${ctx}/issue/archive`, `ro-${k}-18-archive`); o.archive = {h1: f.h1, body: flat(f.bodyStart, 300)};
                    f = await land(`/index.php/${ctx}/search/search?query=${encodeURIComponent(S.t)}`, `ro-${k}-19-search`); o.search = {h1: f.h1, body: flat(f.bodyStart, 500)};
                    f = await land(`/index.php/${ctx}`, `ro-${k}-20-home`); o.home = {blocks: f.blocks, nav: f.nav, userNav: f.userNav};
                    f = await land(`/index.php/${ctx}/user/subscriptions`, `ro-${k}-21-my-subscriptions`); o.mySubs = {url: f.url, chain: f.chain, h1: f.h1, body: flat(f.bodyStart, 300)};
                    f = await land(`/index.php/${ctx}/about/subscriptions`, `ro-${k}-22-subscriptions`); o.subsPage = {url: f.url, chain: f.chain, h1: f.h1};
                    f = await land(`/index.php/${ctx}/user/purchaseSubscription/individual`, `ro-${k}-23-purchase`); o.purchase = {url: f.url, chain: f.chain, h1: f.h1};
                }
                out[k] = o;
                fact(`roles.${k}`, o);
            }
            // td7: signed out, press the locked PDF, then sign in on the Login page as the subscriber
            await visitor();
            await land(`/index.php/${ctx}/article/view/${R.id}`, 'ro-td7-01-article');
            const lp = await press(galleyLink('PDF'), 'ro-td7-02-login');
            out.td7 = {login: brief(lp)};
            if (lp.loginForm) {
                const after = await signInHere(u('S', 'sb'));
                await snap('ro-td7-03-after-signin', {after});
                out.td7.afterSignIn = brief(after);
            }
            // the same with the reader without a subscription
            await visitor();
            await land(`/index.php/${ctx}/article/view/${R.id}`, 'ro-td7-04-article');
            const lp2 = await press(galleyLink('PDF'), 'ro-td7-05-login');
            if (lp2.loginForm) {
                const after = await signInHere(u('S', 'rd'));
                await snap('ro-td7-06-after-signin-rd', {after});
                out.td7.afterSignInReader = brief(after);
            }
            // Full Issue signed out → Login, then sign in as the subscriber
            await visitor();
            await land(`/index.php/${ctx}/issue/view/${I1}`, 'ro-td7-07-issue');
            const lp3 = await press(galleyLink('PDF', 'fullIssue'), 'ro-td7-08-fullissue-login');
            out.td7.fullIssueLogin = brief(lp3);
            if (lp3.loginForm) out.td7.fullIssueAfterSignIn = brief(await signInHere(u('S', 'sb')));
            await snap('ro-td7-09-fullissue-after-signin');
            fact('roles.td7', out.td7);
        });

        // ================================================================== pay (P0, P1, PM, PX: Rule 10 fees, Rule 12, td6, td7, td8)
        if (isOJS && on('pay')) await sect('pay', async () => {
            const out = {};
            for (const key of ['P0', 'P1', 'PM', 'PX']) {
                const ctx = P(key); const R = art(key, 'R'); const I1 = issueId(key, 1, 1, 2026);
                if (!ctx) continue;
                const o = {};
                for (const k of ['visitor', 'rd', 'sb']) {
                    const x = {};
                    if (k === 'visitor') await visitor(); else await as(u(key, k), ctx);
                    let f = await land(`/index.php/${ctx}/article/view/${R.id}`, `pa-${key}-${k}-01-article`);
                    x.articleLocks = lockOf(f); x.userNav = f.userNav;
                    x.pdf = brief(await press(galleyLink('PDF'), `pa-${key}-${k}-02-pdf`));
                    if (key === 'PM') { await land(`/index.php/${ctx}/article/view/${R.id}`, `pa-${key}-${k}-02b-article`); x.html = brief(await press(galleyLink('HTML'), `pa-${key}-${k}-02c-html`)); }
                    f = await land(`/index.php/${ctx}/issue/view/${I1}`, `pa-${key}-${k}-03-issue`);
                    x.issueLocks = lockOf(f);
                    x.full = brief(await press(galleyLink('PDF', 'fullIssue'), `pa-${key}-${k}-04-fullissue`));
                    if (key === 'PM') { await land(`/index.php/${ctx}/issue/view/${I1}`, `pa-${key}-${k}-04b-issue`); x.fullHtml = brief(await press(galleyLink('HTML', 'fullIssue'), `pa-${key}-${k}-04c-fullissue-html`)); }
                    if (k !== 'sb') {
                        f = await land(`/index.php/${ctx}/about/subscriptions`, `pa-${key}-${k}-05-subscriptions`); x.subsPage = {url: f.url, h1: f.h1, body: flat(f.bodyStart, 300)};
                        f = await land(`/index.php/${ctx}/user/subscriptions`, `pa-${key}-${k}-06-my-subscriptions`); x.mySubs = {url: f.url, h1: f.h1};
                    }
                    o[k] = x;
                }
                // signed out → Login → sign in as the subscriber there
                await visitor();
                await land(`/index.php/${ctx}/article/view/${R.id}`, `pa-${key}-li-01-article`);
                const lp = await press(galleyLink('PDF'), `pa-${key}-li-02-login`);
                if (lp.loginForm) o.loginThenSubscriber = brief(await signInHere(u(key, 'sb')));
                await snap(`pa-${key}-li-03-after`);
                out[key] = o;
                fact(`pay.${key}`, o);
            }
        });

        // ================================================================== pdf (PD, PD2, PD3: td23, A14)
        if (isOJS && on('pdf')) await sect('pdf', async () => {
            const out = {};
            for (const key of ['PD', 'PD2', 'PD3']) {
                const ctx = P(key); const R = art(key, 'R'); const I1 = issueId(key, 1, 1, 2026);
                if (!ctx) continue;
                const o = {};
                for (const k of ['visitor', 'rd']) {
                    const x = {};
                    if (k === 'visitor') await visitor(); else await as(u(key, k), ctx);
                    let f = await land(`/index.php/${ctx}/article/view/${R.id}`, `pd-${key}-${k}-01-article`);
                    x.articleLocks = lockOf(f);
                    x.html = brief(await press(galleyLink('HTML'), `pd-${key}-${k}-02-html`));
                    await land(`/index.php/${ctx}/article/view/${R.id}`, `pd-${key}-${k}-03-article`);
                    x.pdf = brief(await press(galleyLink('PDF'), `pd-${key}-${k}-04-pdf`));
                    f = await land(`/index.php/${ctx}/issue/view/${I1}`, `pd-${key}-${k}-05-issue`);
                    x.issueLocks = lockOf(f);
                    x.fullHtml = brief(await press(galleyLink('HTML', 'fullIssue'), `pd-${key}-${k}-06-fullissue-html`));
                    await land(`/index.php/${ctx}/issue/view/${I1}`, `pd-${key}-${k}-07-issue`);
                    x.fullPdf = brief(await press(galleyLink('PDF', 'fullIssue'), `pd-${key}-${k}-08-fullissue-pdf`));
                    o[k] = x;
                }
                out[key] = o;
                fact(`pdf.${key}`, o);
            }
        });

        // ================================================================== inst (I: an institution covering 127.0.0.1, with "Users must be registered…")
        if (isOJS && on('inst')) await sect('inst', async () => {
            const out = {};
            const ctx = P('I'); const R = art('I', 'R'); const I1 = issueId('I', 1, 1, 2026);
            for (const k of ['visitor', 'rd']) {
                const x = {};
                if (k === 'visitor') await visitor(); else await as(u('I', k), ctx);
                let f = await land(`/index.php/${ctx}/article/view/${R.id}`, `in-${k}-01-article`);
                x.locks = lockOf(f); x.blocks = f.blocks;
                x.pdf = brief(await press(galleyLink('PDF'), `in-${k}-02-pdf`));
                f = await land(`/index.php/${ctx}/issue/view/${I1}`, `in-${k}-03-issue`);
                x.issueLocks = lockOf(f);
                x.full = brief(await press(galleyLink('PDF', 'fullIssue'), `in-${k}-04-fullissue`));
                out[k] = x;
            }
            fact('inst', out);
        });

        // ================================================================== reg (R: td24, Rule 13)
        if (isOJS && on('reg')) await sect('reg', async () => {
            const out = {};
            const ctx = P('R'); const I1 = issueId('R', 1, 1, 2026); const I2 = issueId('R', 1, 2, 2026);
            for (const k of ['visitor', 'rd']) {
                const x = {};
                if (k === 'visitor') await visitor(); else await as(u('R', k), ctx);
                for (const a of ['R', 'O', 'P']) {
                    const A = art('R', a);
                    const f = await land(`/index.php/${ctx}/article/view/${A.id}`, `rg-${k}-${a}-01-article`);
                    x[a] = {h1: f.h1, abstract: !!f.abstract, locks: lockOf(f)};
                    x[a].pdf = brief(await press(galleyLink('PDF'), `rg-${k}-${a}-02-pdf`));
                }
                for (const [key, id] of [['I1', I1], ['I2', I2]]) {
                    const f = await land(`/index.php/${ctx}/issue/view/${id}`, `rg-${k}-${key}-03-issue`);
                    x[key] = {h1: f.h1, toc: f.tocTitles, locks: lockOf(f)};
                    x[key].full = brief(await press(galleyLink('PDF', 'fullIssue'), `rg-${k}-${key}-04-fullissue`));
                }
                if (k === 'visitor') {
                    const lp = x.O.pdf;
                    if (lp && lp.login) {
                        await land(`/index.php/${ctx}/article/view/${art('R', 'O').id}`, 'rg-li-01-article-O');
                        const l2 = await press(galleyLink('PDF'), 'rg-li-02-login');
                        if (l2.loginForm) x.loginThenReader = brief(await signInHere(u('R', 'rd')));
                        await snap('rg-li-03-after');
                    }
                }
                out[k] = x;
            }
            fact('reg', out);
        });

        // ================================================================== none (N: Rule 4)
        if (isOJS && on('none')) await sect('none', async () => {
            const out = {};
            const ctx = P('N'); const R = art('N', 'R'); const I1 = issueId('N', 1, 1, 2026);
            for (const k of ['mg', 'se', 'ce', 'sm', 'admin', 'au', 'au2', 'rv', 'tr', 'rd', 'visitor']) {
                const x = {};
                if (k === 'visitor') await visitor(); else await as(k === 'admin' ? 'admin' : u('N', k), ctx);
                for (const [nm, p] of [['home', ''], ['current', '/issue/current'], ['archive', '/issue/archive'], ['issue', `/issue/view/${I1}`],
                    ['article', `/article/view/${R.id}`], ['search', '/search/search?query=K2']]) {
                    const f = await land(`/index.php/${ctx}${p}`, `no-${k}-${nm}`);
                    x[nm] = {url: f.url, chain: f.chain.slice(0, 4), h1: f.h1, denied: f.denied, login: f.loginForm, nav: nm === 'home' ? f.nav : undefined,
                        body: (f.denied || f.loginForm) ? flat(f.bodyStart, 200) : undefined};
                    if (nm === 'article' && !f.denied && !f.loginForm) x.pdf = brief(await press(galleyLink('PDF'), `no-${k}-pdf`));
                    if (nm === 'issue' && !f.denied && !f.loginForm) x.full = brief(await press(galleyLink('PDF', 'fullIssue'), `no-${k}-fullissue`));
                }
                out[k] = x;
                fact(`none.${k}`, x);
            }
        });

        // ================================================================== doa (D: td5, Rule 6)
        if (isOJS && on('doa') && !S.doaDone) await sect('doa', async () => {
            const out = {};
            const ctx = P('D');
            await as(u('D', 'mg'), ctx);
            out.E0 = await issueAccess(ctx, 'Vol. 1 No. 1 (2025)', 'Back Issues', null, 'do-01-E-before');
            await openAccessTab(ctx);
            await accessPanel().locator('select[name=delayedOpenAccessDuration]').selectOption({label: '3 Months'});
            out.setDoa = await saveAccess('do-02-doa-3');
            out.U1set = await issueAccess(ctx, 'Vol. 3 No. 1 (2026)', 'Future Issues', 'Open access', 'do-03-U1-set-open');
            out.U1check = await issueAccess(ctx, 'Vol. 3 No. 1 (2026)', 'Future Issues', null, 'do-04-U1-before-publish');
            out.publishU1 = await publishIssue(ctx, 'Vol. 3 No. 1 (2026)');
            out.U1after = await issueAccess(ctx, 'Vol. 3 No. 1 (2026)', 'Back Issues', null, 'do-05-U1-after-publish');
            out.E1 = await issueAccess(ctx, 'Vol. 1 No. 1 (2025)', 'Back Issues', null, 'do-06-E-after');
            // the reader without a subscription
            await as(u('D', 'rd'), ctx);
            const id1 = issueId('D', 3, 1, 2026);
            let f = await land(`/index.php/${ctx}/issue/view/${id1}`, 'do-07-rd-U1-issue');
            out.rdU1 = {locks: lockOf(f)};
            out.rdU1.art = brief(await press(tocGalley(art('D', 'U1').title, 'PDF'), 'do-08-rd-U1-pdf'));
            await land(`/index.php/${ctx}/issue/view/${id1}`, 'do-09-rd-U1-issue');
            out.rdU1.full = brief(await press(galleyLink('PDF', 'fullIssue'), 'do-10-rd-U1-fullissue'));
            f = await land(`/index.php/${ctx}/article/view/${art('D', 'E').id}`, 'do-11-rd-E-article');
            out.rdE = {locks: lockOf(f)}; out.rdE.pdf = brief(await press(galleyLink('PDF'), 'do-12-rd-E-pdf'));
            // the other end: "Disabled"
            await as(u('D', 'mg'), ctx);
            await openAccessTab(ctx);
            await accessPanel().locator('select[name=delayedOpenAccessDuration]').selectOption({label: 'Disabled'});
            out.setDisabled = await saveAccess('do-13-doa-disabled');
            out.U2set = await issueAccess(ctx, 'Vol. 3 No. 2 (2026)', 'Future Issues', 'Open access', 'do-14-U2-set-open');
            out.publishU2 = await publishIssue(ctx, 'Vol. 3 No. 2 (2026)');
            out.U2after = await issueAccess(ctx, 'Vol. 3 No. 2 (2026)', 'Back Issues', null, 'do-15-U2-after-publish');
            await as(u('D', 'rd'), ctx);
            const id2 = issueId('D', 3, 2, 2026);
            f = await land(`/index.php/${ctx}/issue/view/${id2}`, 'do-16-rd-U2-issue');
            out.rdU2 = {locks: lockOf(f)};
            out.rdU2.art = brief(await press(tocGalley(art('D', 'U2').title, 'PDF'), 'do-17-rd-U2-pdf'));
            fact('doa', out);
            S.doaDone = true; save();
        });

        // ================================================================== open (O: Rule 2 — switched from subscriptions to open access)
        if (isOJS && on('open') && !S.openDone) await sect('open', async () => {
            const out = {};
            const ctx = P('O'); const R = art('O', 'R'); const I1 = issueId('O', 1, 1, 2026);
            const reads = async (tagName) => {
                const x = {};
                await visitor();
                let f = await land(`/index.php/${ctx}/article/view/${R.id}`, `op-${tagName}-01-article`);
                x.locks = lockOf(f); x.blocks = f.blocks;
                x.pdf = brief(await press(galleyLink('PDF'), `op-${tagName}-02-pdf`));
                f = await land(`/index.php/${ctx}/issue/view/${I1}`, `op-${tagName}-03-issue`);
                x.issueLocks = lockOf(f); x.blocks2 = f.blocks;
                x.full = brief(await press(galleyLink('PDF', 'fullIssue'), `op-${tagName}-04-fullissue`));
                await as(u('O', 'rd'), ctx);
                f = await land(`/index.php/${ctx}/user/subscriptions`, `op-${tagName}-05-rd-my-subscriptions`); x.mySubs = {url: f.url, chain: f.chain};
                f = await land(`/index.php/${ctx}`, `op-${tagName}-06-rd-home`); x.rdBlocks = f.blocks; x.userNav = f.userNav;
                await as(u('O', 'mg'), ctx);
                x.window = await issueAccess(ctx, 'Vol. 1 No. 1 (2026)', 'Back Issues', null, `op-${tagName}-07-issue-window`);
                await openIssue(ctx, 'Vol. 1 No. 1 (2026)', 'Back Issues');
                await W().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                x.toc = await readGrid(W());
                x.tocBoxes = await W().locator('tr.gridRow input[type=checkbox]').count().catch(() => null);
                await snap(`op-${tagName}-08-toc`, {toc: x.toc});
                await cancelWindow();
                return x;
            };
            out.before = await reads('before');
            await openAccessTab(ctx);
            await accessPanel().getByRole('radio', {name: /provide open access/}).check(); await sleep(300);
            out.switchForm = await readAccess();
            out.save = await saveAccess('op-09-saved-open');
            out.after = await reads('after');
            fact('open', out);
            S.openDone = true; save();
        });

        // ================================================================== partial (S: T published on screen into I4 dated 2025-09-01; ex reads)
        if (isOJS && on('partial') && !S.partialDone) await sect('partial', async () => {
            const out = {};
            const ctx = P('S'); const Tt = art('S', 'T');
            const wfUrl = (sid, key) => cUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);
            const wf = () => page.locator('[role="dialog"]:visible').first();
            await as(u('S', 'mg'), ctx);
            await page.goto(wfUrl(Tt.id, `publication_${Tt.pub}_titleAbstract`)); await idle(page); await sleep(1200);
            const l = page.getByRole('link', {name: 'Publication Settings', exact: true}).last();
            await l.waitFor({state: 'visible', timeout: T}); await l.click(); await idle(page); await sleep(1000);
            const t0 = Date.now();
            while (Date.now() - t0 < 20000 && !(await wf().getByRole('button', {name: 'Save', exact: true}).count())) await sleep(250);
            const date = page.locator('input[name="datePublished"]').first();
            out.dateBox = await date.count();
            if (out.dateBox) { await date.fill('2025-09-01'); await date.press('Tab').catch(() => {}); }
            const back = page.getByRole('radio', {name: 'Assign To Current/Back Issue'}).first();
            if (await back.isVisible().catch(() => false)) {
                await back.check();
                const sel = page.locator('select[name="issueId"]').first();
                await sel.waitFor({timeout: T}).catch(() => {});
                const opt = sel.locator('option').filter({hasText: /Vol\. 2 No\. 2/});
                await opt.first().waitFor({state: 'attached', timeout: T}).catch(() => {});
                if (await opt.count()) await sel.selectOption(await opt.first().getAttribute('value'));
            }
            const r = page.waitForResponse((x) => /\/publications\/\d+/.test(x.url()) && ['POST', 'PUT'].includes(x.request().method()), {timeout: T}).catch(() => null);
            await wf().getByRole('button', {name: 'Save', exact: true}).last().click();
            const resp = await r; await sleep(800);
            out.save = {status: resp ? resp.status() : null, errors: await page.locator('.pkpFieldError').allInnerTexts().catch(() => [])};
            await snap('pt-01-settings-saved', {partial: out});
            await page.goto(wfUrl(Tt.id, `publication_${Tt.pub}_titleAbstract`)); await idle(page); await sleep(1500);
            const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
            const ps = new PublicationScreen(page, ctx);
            const pr = page.waitForResponse((x) => x.url().includes('/publish') && x.request().method() !== 'GET', {timeout: 60000}).catch(() => null);
            await ps.publish({backIssueLabel: /Vol\. 2 No\. 2/}).catch((e) => { out.publishErr = flat(e.message, 300); });
            out.publish = (await pr)?.status();
            await snap('pt-02-published');
            S.partialDone = true; save();
            // ex (expired 2026-06-01, Partial expiry on) and rd on I4: T (dated 2025-09-01) and F (dated today)
            const id4 = issueId('S', 2, 2, 2025);
            for (const k of ['ex', 'rd', 'sb']) {
                await as(u('S', k), ctx);
                const x = {};
                let f = await land(`/index.php/${ctx}/issue/view/${id4}`, `pt-${k}-03-I4`);
                x.locks = lockOf(f);
                x.T = brief(await press(tocGalley(Tt.title, 'PDF'), `pt-${k}-04-T-pdf`));
                f = await land(`/index.php/${ctx}/article/view/${Tt.id}`, `pt-${k}-05-T-article`);
                x.Tpage = {locks: lockOf(f), published: flat((f.bodyStart.match(/Published\s*\d{4}-\d{2}-\d{2}/) || [])[0], 40)};
                x.Tpage.pdf = brief(await press(galleyLink('PDF'), `pt-${k}-06-T-article-pdf`));
                f = await land(`/index.php/${ctx}/article/view/${art('S', 'F').id}`, `pt-${k}-07-F-article`);
                x.Fpage = {locks: lockOf(f)};
                x.Fpage.pdf = brief(await press(galleyLink('PDF'), `pt-${k}-08-F-pdf`));
                out[k] = x;
            }
            out.db = psql(`select s.submission_id, p.date_published, s.status from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id in (${Tt.id},${art('S', 'F').id})`);
            fact('partial', out);
        });

        // ================================================================== settings (labels: Settings bullets 3, 5, 6, 11, 14; the Payments page by role; Purpose line 20)
        if (isOJS && on('settings')) await sect('settings', async () => {
            const out = {};
            const ctx = P('S');
            await as(u('S', 'mg'), ctx);
            await page.goto(cUrl(ctx, '/management/settings/access')); await idle(page);
            out.usersRolesTabs = (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
            await page.getByRole('tab', {name: 'Site Access Options', exact: true}).click().catch(() => {}); await idle(page); await sleep(500);
            out.siteAccess = flat(await page.locator('#siteAccessOptions, [id*="siteAccess"]').first().innerText().catch(() => null), 1200);
            out.siteAccessBoxes = await page.locator('#siteAccessOptions input[type=checkbox], [id*="siteAccess"] input[type=checkbox]').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked}))).catch(() => []);
            await snap('se-01-site-access', {siteAccess: out.siteAccess, boxes: out.siteAccessBoxes});
            // the Payments page (payments off on S)
            for (const k of ['mg', 'ed', 'pe', 'sm', 'se', 'rd']) {
                await as(u('S', k), ctx);
                const nav = await readNav();
                const f = await land(`/index.php/${ctx}/payments`, `se-02-payments-${k}`);
                const tabs = (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
                out[`payments.${k}`] = {url: f.url, chain: f.chain, h1: f.h1, tabs, denied: f.denied, nav: nav.links, navGroups: nav.groups};
            }
            await as(u('S', 'mg'), ctx);
            await page.goto(cUrl(ctx, '/payments')); await idle(page);
            await page.locator('a[name="paymentTypes"]').first().click().catch(() => {}); await idle(page); await sleep(1200);
            const pt = page.locator('#paymentTypesForm').first();
            await pt.waitFor({timeout: T}).catch(() => {});
            out.paymentTypes = {text: flat(await pt.innerText().catch(() => null), 2000),
                boxes: await pt.locator('input').evaluateAll((els) => els.map((e) => ({name: e.name, type: e.type, value: e.value, checked: e.checked}))).catch(() => [])};
            await snap('se-03-payment-types', out.paymentTypes);
            await page.goto(cUrl(ctx, '/payments')); await idle(page);
            await page.locator('a[name="subscriptionPolicies"]').first().click().catch(() => {}); await idle(page); await sleep(1500);
            const sp = page.locator('#subscriptionPolicySettingsForm, form[id*="ubscriptionPolic"]').first();
            await sp.waitFor({timeout: T}).catch(() => {});
            out.policies = {text: flat(await sp.innerText().catch(() => null), 2500),
                boxes: await sp.locator('input[type=checkbox]').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked, label: ((e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || {}).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160)}))).catch(() => [])};
            await snap('se-04-subscription-policies', out.policies);
            await loc(page, 'Payments › Subscription Policies: the open-access email box', sp.locator('input[name=enableOpenAccessNotification]'));
            // Profile › Notifications, default
            out.notifDefault = await notifRow(u('S', 'rd'), ctx, 'read');
            fact('settings', out);
        });

        // ================================================================== mail (M, M0: the open-access email)
        if (isOJS && on('mail') && !S.mailDone) await sect('mail', async () => {
            const out = {};
            const ctx = P('M'); const ctx0 = P('M0');
            const jobsRun = () => {
                try {
                    return flat(execFileSync('php', ['lib/pkp/tools/jobs.php', 'run'], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 180_000}), 400);
                } catch (e) { return `err ${flat((e.stdout || '') + (e.message || ''), 400)}`; }
            };
            if (!S.mailPrep) {
                out.r2 = await notifRow(u('M', 'r2'), ctx, 'off');
                out.r3 = await notifRow(u('M', 'r3'), ctx, 'emailOff');
            }
            // tick the policy box on M (the tab refuses a save without its contact's Name, Email and Mailing Address)
            await as(u('M', 'mg'), ctx);
            await page.goto(cUrl(ctx, '/payments')); await idle(page);
            await page.locator('a[name="subscriptionPolicies"]').first().click().catch(() => {}); await idle(page); await sleep(1500);
            const sp = page.locator('form#subscriptionPolicies').first();
            await sp.waitFor({timeout: T});
            const box = sp.locator('input[name=enableOpenAccessNotification]');
            out.boxBefore = await box.isChecked().catch(() => null);
            const fillIf = async (name, val) => { const b = sp.locator(`[name="${name}"]`).first(); if (await b.count() && !(await b.inputValue().catch(() => ''))) await b.fill(val); };
            await fillIf('subscriptionName', 'K2 Desk');
            await fillIf('subscriptionEmail', `${u('M', 'desk')}@mail.test`);
            await fillIf('subscriptionMailingAddress', '1 K2 Street');
            await box.check();
            const resp = page.waitForResponse((r) => r.request().method() === 'POST' && /saveSubscriptionPolicies/i.test(r.url()), {timeout: T}).catch(() => null);
            await sp.getByRole('button', {name: 'Save', exact: true}).click();
            const rs = await resp; await idle(page); await sleep(800);
            out.policySave = {status: rs ? rs.status() : null, notices: await page.locator('.pkp_notification:visible, [role=alert]:visible').allInnerTexts().catch(() => []),
                errors: await sp.locator('.error:visible, label.error:visible').allInnerTexts().catch(() => [])};
            await snap('ma-01-policy-saved', out.policySave);
            await page.goto(cUrl(ctx, '/payments')); await idle(page);
            await page.locator('a[name="subscriptionPolicies"]').first().click().catch(() => {}); await idle(page); await sleep(1500);
            out.boxAfterReload = await page.locator('input[name=enableOpenAccessNotification]').first().isChecked().catch(() => null);
            if (!S.mailPrep) {
                // switch I2 to "Open access" and tick the article's box on I3
                out.I2switch = await issueAccess(ctx, 'Vol. 1 No. 2 (2026)', 'Back Issues', 'Open access', 'ma-02-I2-open');
                await openIssue(ctx, 'Vol. 1 No. 3 (2026)', 'Back Issues');
                await W().locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                const cb = W().locator('tr.gridRow input[type=checkbox]').first();
                const set = page.waitForResponse((r) => /set-access-status|setAccessStatus/i.test(r.url()), {timeout: T}).catch(() => null);
                await cb.click().catch(() => {});
                const sr = await set; await idle(page); await sleep(500);
                out.boxTick = {status: sr ? sr.status() : null};
                await snap('ma-03-I3-article-open');
                await cancelWindow();
                S.mailPrep = true; save();
            }
            const counts0 = {M: psql(`select count(*) from notifications where type=${NOTIF_OA} and context_id=(select journal_id from journals where path='${ctx}')`)};
            // before running the task: nothing was mailed for the screen switches
            out.jobsBefore = jobsRun();
            await sleep(1500);
            out.mailAfterSwitches = {};
            for (const k of ['r1', 'mg']) out.mailAfterSwitches[k] = await app.mail.count({to: `${u('M', k)}@mail.test`}).catch((e) => `err ${flat(e.message, 80)}`);
            // the daily task, run by hand
            try {
                out.task = flat(execFileSync('php', ['lib/pkp/tools/scheduler.php', 'test', '--name=APP\\tasks\\OpenAccessNotification'], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 120_000}), 600);
            } catch (e) { out.task = `err ${flat((e.stdout || '') + (e.message || ''), 600)}`; }
            out.jobs = jobsRun();
            await sleep(2000);
            out.mail = {};
            for (const [c, k] of [['M', 'r1'], ['M', 'r2'], ['M', 'r3'], ['M', 'mg'], ['M', 'au'], ['M0', 'r1'], ['M0', 'mg']]) {
                const to = `${u(c, k)}@mail.test`;
                try {
                    const m = await app.mail.find({to, subject: 'Free to read', timeoutMs: (c === 'M' && k === 'r1') ? 20000 : 4000});
                    const full = await app.mail.fullMessage(m.ID);
                    out.mail[`${c}.${k}`] = {subject: full.Subject, from: full.From, text: flat(full.Text, 900), links: (full.HTML || '').match(/href="[^"]+"/g)?.slice(0, 8)};
                } catch (e) { out.mail[`${c}.${k}`] = {none: flat(e.message, 120), count: await app.mail.count({to}).catch(() => null)}; }
            }
            out.notifRows = {before: counts0.M, after: psql(`select user_id, assoc_type, assoc_id from notifications where type=${NOTIF_OA} and context_id=(select journal_id from journals where path='${ctx}')`),
                M0: psql(`select count(*) from notifications where type=${NOTIF_OA} and context_id=(select journal_id from journals where path='${ctx0}')`)};
            // what r1 sees on screen afterwards
            await as(u('M', 'r1'), ctx);
            let f = await land(`/index.php/${ctx}`, 'ma-04-r1-home'); out.r1home = {userNav: f.userNav, notices: f.notices};
            f = await land(`/index.php/${ctx}/user/profile`, 'ma-05-r1-profile'); out.r1profile = {h1: f.h1, url: f.url};
            fact('mail', out);
            S.mailDone = true; save();
        });

        // ================================================================== newissue (A, after "access" saved it to subscriptions: Rule 3's first bullet)
        if (isOJS && on('newissue') && !S.newIssueDone) await sect('newissue', async () => {
            const out = {};
            const ctx = P('A');
            await as(u('A', 'mg'), ctx);
            const panel = await issuesPage(ctx, 'Future Issues');
            await panel.getByRole('link', {name: 'Create Issue', exact: true}).click();
            const f = page.locator('form#issueForm:visible').last();
            await f.locator('input[name=volume]').waitFor({timeout: T});
            await idle(page); await sleep(300);
            out.createTabs = await windowTabs();
            await f.locator('input[name=volume]').fill('5');
            await f.locator('input[name=number]').fill('1');
            await f.locator('input[name=year]').fill('2026');
            const tb = f.getByRole('checkbox', {name: 'Title', exact: true});
            if (await tb.isChecked().catch(() => false)) await tb.click();
            const resp = page.waitForResponse((r) => r.request().method() === 'POST' && /update-issue|updateIssue|update/.test(r.url()), {timeout: T}).catch(() => null);
            await f.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await resp; await idle(page); await sleep(800);
            out.save = r ? r.status() : null;
            await snap('ni-01-created', {createTabs: out.createTabs});
            if (await W().isVisible().catch(() => false)) await cancelWindow();
            out.window = await issueAccess(ctx, 'Vol. 5 No. 1 (2026)', 'Future Issues', null, 'ni-02-new-issue-access');
            fact('newissue', out);
            S.newIssueDone = true; save();
        });

        // ================================================================== pdx (Settings bullet 6's other end: the box ticked, payments not enabled; the DOA list after a save)
        if (isOJS && on('pdx')) await sect('pdx', async () => {
            const out = {};
            if (!S.C.PDX) {
                const p = `${S.t}PDX`;
                try {
                    const r = await app.api.createContext({tag: p, context: {name: 'U51 K2 pdf only payments off', contactName: 'K2 Principal', contactEmail: `${p}pc@mail.test`},
                        publishingMode: 'subscription', payments: {enabled: false, currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Send a cheque to K2.', restrictOnlyPdf: true},
                        users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author']}, {username: `${p}rd`, roles: ['reader']}],
                        issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: [{label: 'PDF', file: 'article.pdf'}, {label: 'HTML', file: 'article.html'}]}]});
                    S.C.PDX = {path: r.path || p, p, issues: r.issues || []};
                    const sr = await app.api.createSubmission({tag: `${p}R`, context: S.C.PDX.path, submitter: `${p}au`, title: `K2 R PDX ${S.t}`, published: true, issue: {volume: 1, number: 1, year: 2026},
                        galleys: [{label: 'PDF', file: 'article.pdf'}, {label: 'HTML', file: 'article.html'}]});
                    S.s['PDX.R'] = {id: sr.submissionId, pub: sr.publicationId, title: `K2 R PDX ${S.t}`};
                } catch (e) { out.seedError = flat(e.message, 600); }
                save();
            }
            if (S.C.PDX && S.C.PDX.path) {
                const ctx = S.C.PDX.path; const R = S.s['PDX.R'];
                const I1 = (S.C.PDX.issues || [])[0]?.id;
                for (const k of ['visitor', 'rd']) {
                    const x = {};
                    if (k === 'visitor') await visitor(); else await as(`${S.C.PDX.p}${k}`, ctx);
                    let f = await land(`/index.php/${ctx}/article/view/${R.id}`, `px-${k}-01-article`);
                    x.articleLocks = lockOf(f);
                    x.html = brief(await press(galleyLink('HTML'), `px-${k}-02-html`));
                    f = await land(`/index.php/${ctx}/issue/view/${I1}`, `px-${k}-03-issue`);
                    x.issueLocks = lockOf(f);
                    x.fullHtml = brief(await press(galleyLink('HTML', 'fullIssue'), `px-${k}-04-fullissue-html`));
                    out[k] = x;
                }
            }
            // D's Access tab after "3 Months" then "Disabled" were saved there
            await as(u('D', 'mg'), P('D'));
            await openAccessTab(P('D'));
            out.dAccess = (await readAccess()).selects;
            await snap('px-05-D-access-after-disabled', {selects: out.dAccess});
            fact('pdx', out);
        });

        // ================================================================== search (S: Rule 8's search results, after the queued jobs ran in "mail")
        if (isOJS && on('search')) await sect('search', async () => {
            const out = {};
            const ctx = P('S');
            for (const k of ['visitor', 'rd']) {
                if (k === 'visitor') await visitor(); else await as(u('S', k), ctx);
                const f = await land(`/index.php/${ctx}/search/search?query=${encodeURIComponent(S.t)}`, `sr-${k}-01-search`);
                out[k] = {results: f.tocTitles, locks: lockOf(f), body: flat(f.bodyStart.replace(/^.*Search Results/, 'Search Results'), 600)};
            }
            fact('search', out);
        });

        // ================================================================== absence (OMP, OPS; OJS control): td1
        if (on('absence')) await sect('absence', async () => {
            const out = {};
            const ctx = app.contextPath;
            await as('manager.maya', ctx);
            out.distributionTabs = await distributionTabs(ctx);
            await snap('ab-01-distribution');
            out.nav = await readNav();
            if (out.distributionTabs.includes('Access')) {
                await page.getByRole('tab', {name: 'Access', exact: true}).click(); await idle(page); await sleep(400);
                out.access = await readAccess().catch((e) => ({err: flat(e.message, 200)}));
                await snap('ab-02-access', {access: out.access});
            }
            if (out.distributionTabs.includes('Payments')) {
                await page.getByRole('tab', {name: 'Payments', exact: true}).click(); await idle(page); await sleep(400);
                out.paymentsTab = flat(await page.locator('#payments').first().innerText().catch(() => null), 800);
                await snap('ab-03-payments-tab');
            }
            out.roles = await rolesList(ctx);
            out.subscriptionManagerRole = /Subscription Manager/.test(out.roles || '');
            out.notif = await notifRow('reader.rosa', ctx, 'read');
            for (const [k, who2] of [['visitor', null], ['reader', 'reader.rosa'], ['manager', 'manager.maya']]) {
                if (who2) await as(who2, ctx); else await visitor();
                for (const [nm, p] of [['aboutSubscriptions', '/about/subscriptions'], ['userSubscriptions', '/user/subscriptions'], ['payments', '/payments'], ['purchase', '/user/purchaseSubscription/individual']]) {
                    const f = await land(`/index.php/${ctx}/en${p}`, `ab-04-${k}-${nm}`);
                    out[`${k}.${nm}`] = {url: f.url, chain: f.chain, h1: f.h1, title: f.title, denied: f.denied, login: f.loginForm, notFound: /404|not found/i.test(f.bodyStart)};
                }
            }
            // a scratch press / server with payments on: the side menu and /payments (OMP, OPS: on screen; OJS: the seeded P0)
            if (!isOJS) {
                if (!S.payCtx) {
                    const p = tag('u51k2p');
                    const r = await app.api.createContext({tag: p, users: [{username: `${p}mg`, roles: ['manager']}]});
                    S.payCtx = {path: r.path || p, p}; save();
                }
                const pc = S.payCtx.path;
                await as(`${S.payCtx.p}mg`, pc);
                const tabs = await distributionTabs(pc);
                out.scratchTabs = tabs;
                if (tabs.includes('Payments')) {
                    await page.getByRole('tab', {name: 'Payments', exact: true}).click(); await idle(page); await sleep(400);
                    const pane = page.locator('#payments').first();
                    const enable = pane.locator('input[name="paymentsEnabled"]').first();
                    out.scratchPaymentsForm = flat(await pane.innerText().catch(() => null), 800);
                    if (await enable.count()) {
                        await enable.check().catch(() => {});
                        await pane.locator('select[name=currency]').selectOption({label: 'US Dollar'}).catch(() => {});
                        await pane.locator('select[name=paymentPluginName]').selectOption({label: 'Manual Fee Payment'}).catch(() => {});
                        await sleep(400);
                        const instr = pane.locator('textarea[name*="manualInstructions"], input[name*="manualInstructions"]').first();
                        if (await instr.count()) await instr.fill('Send a cheque.').catch(() => {});
                        const rs = page.waitForResponse((r) => ['PUT', 'POST'].includes(r.request().method()) && /payments|contexts/.test(r.url()), {timeout: T}).catch(() => null);
                        await pane.getByRole('button', {name: 'Save', exact: true}).click().catch(() => {});
                        const resp = await rs;
                        out.scratchPaymentsSave = {status: resp ? resp.status() : null, saved: await pane.locator('[role=status]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false)};
                        await snap('ab-05-scratch-payments-saved', out.scratchPaymentsSave);
                    }
                }
                await page.goto(cUrl(pc, '/submissions')); await idle(page);
                out.scratchNav = await readNav();
                const f = await land(`/index.php/${pc}/payments`, 'ab-06-scratch-payments-url');
                out.scratchPaymentsUrl = {url: f.url, chain: f.chain, h1: f.h1, title: f.title};
            } else {
                await as(u('P0', 'mg'), P('P0'));
                await page.goto(cUrl(P('P0'), '/submissions')); await idle(page);
                out.scratchNav = await readNav();
                const f = await land(`/index.php/${P('P0')}/payments`, 'ab-06-scratch-payments-url');
                out.scratchPaymentsUrl = {url: f.url, chain: f.chain, h1: f.h1, title: f.title};
            }
            fact('absence', out);
        });

        // ================================================================== ops1 (OPS: "Posting Mode")
        if (isOPS && on('ops1') && !S.ops1Done) await sect('ops1', async () => {
            const out = {};
            if (!S.srv) {
                const p = tag('u51k2s');
                const r = await app.api.createContext({tag: p, users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author']}, {username: `${p}rd`, roles: ['reader']}]});
                const sr = await app.api.createSubmission({tag: `${p}X`, context: r.path || p, submitter: `${p}au`, title: `K2 preprint ${p}`, published: true, galleys: [{label: 'PDF', file: 'preprint.pdf'}]});
                S.srv = {path: r.path || p, p, sub: sr.submissionId, title: `K2 preprint ${p}`}; save();
            }
            const ctx = S.srv.path;
            await as(`${S.srv.p}mg`, ctx);
            await openAccessTab(ctx);
            out.arrive = await readAccess();
            await snap('os-01-access', {access: out.arrive});
            await accessPanel().getByRole('radio', {name: /will not be used/}).check();
            out.save = await saveAccess('os-02-saved-none');
            await openAccessTab(ctx);
            out.reload = await readAccess();
            await snap('os-03-reloaded', {access: out.reload});
            // the other choice, for the axis
            await accessPanel().getByRole('radio', {name: /provide open access/}).check();
            out.saveOpen = await saveAccess('os-04-saved-open');
            await openAccessTab(ctx);
            out.reloadOpen = await readAccess();
            // choose none again and leave it saved, then read as the visitor and the reader
            await accessPanel().getByRole('radio', {name: /will not be used/}).check();
            out.save2 = await saveAccess('os-05-saved-none-again');
            for (const k of ['visitor', 'rd']) {
                if (k === 'visitor') await visitor(); else await as(`${S.srv.p}rd`, ctx);
                let f = await land(`/index.php/${ctx}`, `os-06-${k}-home`);
                out[`${k}.home`] = {nav: f.nav, h1: f.h1, denied: f.denied};
                f = await land(`/index.php/${ctx}/preprint/view/${S.srv.sub}`, `os-07-${k}-preprint`);
                out[`${k}.preprint`] = {url: f.url, h1: f.h1, denied: f.denied, login: f.loginForm, galleys: (f.galleys || []).map((g) => g.label)};
                if (f.galleys && f.galleys.length) out[`${k}.pdf`] = brief(await press(page.locator('a.obj_galley_link').first(), `os-08-${k}-pdf`));
                f = await land(`/index.php/${ctx}/preprints`, `os-09-${k}-archive`);
                out[`${k}.archive`] = {url: f.url, h1: f.h1, denied: f.denied};
            }
            fact('ops1', out);
            S.ops1Done = true; save();
        });
    } finally {
        record('k2-dialogs', dialogs);
        await close();
    }
});
