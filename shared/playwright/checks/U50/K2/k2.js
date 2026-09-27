const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U50 claim check, chunk K2 — issue galleys, publishing and its effects
// (docs/specs/U50-issues.md body lines 243–307 Rules 14–20, 359–391 Side effects, 436–444 Settings bullets 7–8,
// register A2 563–571 and A3 572–586). Chunk plan: .reports/U50/claimcheck-chunks.md.
//
//   PROBE_FEATURE=U50 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U50/K2/k2.js
//   PHASES=seed,galley,… narrows (state in .reports/U50/ccK2/k2-state-<app>.json; seed runs once per state file,
//   and each mutating phase once per state: delete the state file to drive a later build afresh). The full run
//   outlasts the Bash tool's 600 s cap: run it detached (patterns.md "Probe kit"). Phase order matters on P:
//   seed notif galley publish current dated unpub unpub2 unpub3 del del2 order ids stats none ctl.
//   The script drains the fleet's job queue (support/jobs.js) after the publishes: run it alone on the fleet.
//
// OJS scratch journals (tag prefix u50k2), every one created through `POST scenarios/context`:
//   G   UI languages English + French, forms English only; manager mg. Issues Vol. 1 No. 1 (2026) (empty) and
//       Vol. 1 No. 2 (2026) with one seeded galley "PDF". Rules 14–15 (td9), the window left with an unsaved change.
//   G2  UI and forms English + French; manager mg; one issue. td9's other end (French accepted).
//   P   manager mg, editor ed, section editor se, layout editor le, author au, readers rd / rn / re.
//       Issues P1 Vol. 1 No. 1 (2024) published 2024-03-01 (article B), P2 Vol. 1 No. 2 (2025) published 2025-03-01
//       (current; article R), P3 Vol. 2 No. 1 (2026) unpublished (article A scheduled; article E published into it at
//       once on screen), P4 Vol. 0 No. 9 (2020) unpublished and empty.
//       Rules 16–18 (td10, td11), A2, Side effects (issue email, notification, released articles, nothing else),
//       Settings 7 (rn turns the row off, re its email off, on their own Profile › Notifications).
//   D   manager mg, author au. D1 2024, D2 2025, D3 2026 (current; article C, a galley, a cover) published, D4 2027
//       unpublished (article S scheduled). Rule 19 (td12), A3.
//   O   manager mg. O1 2024-06-01, O2 2025-06-01, O3 2026-06-01, O4 2023-06-01 unpublished; published on screen.
//       Rule 20 (td13), then Rule 19's "top of Back Issues" after a custom order.
//   I   manager mg; publisher IDs for issues and issue galleys, URN plugin on for issues; issue I1 with a galley.
//       Settings 8, Side effects "Identifiers" (URN; DOI after ticking "Issues" on Settings › Distribution › DOIs),
//       "Statistics" (the issue page and "Full Issue" opened as a visitor; the usage log read from the install).
// OMP, OPS: read-only controls on publicknowledge as manager.maya (Profile › Notifications rows, Statistics menu,
//   Settings › Distribution Publisher ID boxes); OJS gets the same reads as its positive control.
// Database reads (psql SELECT) and the files directory are read for evidence only; nothing is written there.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');
const {runJobs} = require('../../../support/jobs.js');

const REPO = path.resolve(__dirname, '../../../../..');
const FIX = (f) => path.join(REPO, 'apps/ojs/playwright/fixtures/files', f);
const T = 30_000;
const ALL = ['seed', 'notif', 'galley', 'publish', 'current', 'dated', 'unpub', 'unpub2', 'unpub3', 'del', 'del2', 'order', 'ids', 'stats', 'none', 'ctl'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k2]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k2-state-${app.name}.json`);
const NOTIF_ISSUE = 268435477; // Notification::NOTIFICATION_TYPE_PUBLISHED_ISSUE (0x10000015)
const today = new Date().toISOString().slice(0, 10);

function psql(sql) {
    try {
        return execFileSync('psql', [dbName('ojs'), '-At', '-F', '|', '-c', sql], {encoding: 'utf8'}).trim();
    } catch (e) {
        return `psql error: ${flat(e.message, 200)}`;
    }
}
const filesDir = () => {
    const cfg = fs.readFileSync(path.join(REPO, 'checkouts/ojs/config.test.inc.php'), 'utf8');
    return (cfg.match(/^files_dir\s*=\s*"?([^"\n]+)"?/m) || [])[1].trim();
};

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 2));
    const fact = (k, v) => { record('k2-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const {page, close} = await launch(app);
    const vis = await launch(app); // a signed-out visitor
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

    // ------------------------------------------------------------------ OMP / OPS: read-only controls
    async function controls() {
        await as('manager.maya', app.contextPath);
        const out = {};
        await page.goto(u(app.contextPath, '/user/profile/notificationSettings')); await idle(page);
        await page.locator('form#notificationSettingsForm').waitFor({timeout: T}).catch(() => {});
        const s1 = await snap('ctl-notification-settings');
        out.issueRow = /An issue has been published/.test(s1.text?.main || '');
        out.openAccessRow = /made open access/.test(s1.text?.main || '');
        await page.goto(u(app.contextPath, '/management/settings/distribution')); await idle(page);
        const tabs = await page.getByRole('tab').allInnerTexts().catch(() => []);
        out.distributionTabs = tabs.map((t) => flat(t, 60));
        const idTab = page.getByRole('tab', {name: 'Identifiers', exact: true});
        if (await idTab.count()) { await idTab.first().click(); await idle(page); }
        const s2 = await snap('ctl-distribution-identifiers');
        out.publisherIdBoxes = (s2.text?.main || '').match(/Enable for [A-Za-z ]+/g);
        // Publisher ID boxes live on Settings › Workflow › Submission › "Metadata" (U44 Fields)
        await page.goto(u(app.contextPath, '/management/settings/workflow')); await idle(page);
        await page.getByRole('tab', {name: 'Submission', exact: true}).first().click().catch(() => {}); await idle(page);
        await page.getByRole('tab', {name: 'Metadata', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(800);
        const s4 = await snap('ctl-workflow-metadata');
        out.metadataPublisherIdBoxes = (s4.text?.main || '').match(/Enable for [A-Za-z ]+?(?=\n|$)/gm);
        const nav = await page.locator('nav, [role="navigation"]').allInnerTexts().catch(() => []);
        out.navStatistics = flat(nav.join(' | '), 1200);
        const stats = page.getByRole('link', {name: 'Issues', exact: true});
        out.issuesLinks = await stats.count();
        // Plugins list: URN row
        await page.goto(u(app.contextPath, '/management/settings/website')); await idle(page);
        await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click().catch(() => {}); await idle(page); await sleep(1500);
        const s3 = await snap('ctl-plugins');
        out.urnRow = /\bURN\b/.test(s3.text?.main || '');
        fact('ctl', out);
        await signOut(page); who = null;
    }

    try {
        if (!isOJS) {
            if (on('ctl')) await sect('ctl', controls);
            return;
        }

        // ============================================================ seed
        if (on('seed') && !S.G) await sect('seed', async () => {
            const t = tag('u50k2');
            S.t = t;
            const G = await app.api.createContext({tag: `${t}g`, context: {name: `U50 K2 G ${t}`, supportedLocales: ['en', 'fr_CA']},
                users: [{username: `${t}gmg`, roles: ['manager']}],
                issues: [{volume: 1, number: 1, year: 2026}, {volume: 1, number: 2, year: 2026, galleys: [{label: 'PDF', file: 'article.pdf'}]}]});
            const G2 = await app.api.createContext({tag: `${t}h`, context: {name: `U50 K2 G2 ${t}`, supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
                users: [{username: `${t}hmg`, roles: ['manager']}], issues: [{volume: 1, number: 1, year: 2026}]});
            const pUsers = [['mg', 'manager'], ['ed', 'editor'], ['se', 'sectionEditor'], ['le', 'layoutEditor'], ['au', 'author'], ['rd', 'reader'], ['rn', 'reader'], ['re', 'reader']];
            const P = await app.api.createContext({tag: `${t}p`, context: {name: `U50 K2 P ${t}`},
                users: pUsers.map(([k, r]) => ({username: `${t}p${k}`, roles: [r]})),
                issues: [{volume: 1, number: 1, year: 2024, datePublished: '2024-03-01', published: true},
                    {volume: 1, number: 2, year: 2025, datePublished: '2025-03-01', published: true},
                    {volume: 2, number: 1, year: 2026}, {volume: 0, number: 9, year: 2020}]});
            const D = await app.api.createContext({tag: `${t}d`, context: {name: `U50 K2 D ${t}`},
                users: [{username: `${t}dmg`, roles: ['manager']}, {username: `${t}dau`, roles: ['author']}],
                issues: [{volume: 1, number: 1, year: 2024, datePublished: '2024-01-01', published: true},
                    {volume: 2, number: 1, year: 2025, datePublished: '2025-01-01', published: true},
                    {volume: 3, number: 1, year: 2026, datePublished: '2026-01-01', published: true, coverImage: {file: 'profile-image-400.png'}},
                    {volume: 4, number: 1, year: 2027}]});
            // D3's galley: galleys are seeded before the publish, so D3 is seeded with one through a fresh entry is not
            // possible after the fact; the galley is added on screen in the del phase instead.
            const O = await app.api.createContext({tag: `${t}o`, context: {name: `U50 K2 O ${t}`},
                users: [{username: `${t}omg`, roles: ['manager']}],
                issues: [{volume: 1, number: 1, year: 2024, datePublished: '2024-06-01'}, {volume: 2, number: 1, year: 2025, datePublished: '2025-06-01'},
                    {volume: 3, number: 1, year: 2026, datePublished: '2026-06-01'}, {volume: 4, number: 1, year: 2023, datePublished: '2023-06-01'}]});
            const I = await app.api.createContext({tag: `${t}i`, context: {name: `U50 K2 I ${t}`},
                users: [{username: `${t}img`, roles: ['manager']}, {username: `${t}iau`, roles: ['author']}],
                enablePublisherId: ['issue', 'issueGalley'],
                plugins: {urnpubidplugin: {enabled: true, settings: {enableIssueURN: true, urnPrefix: 'urn:nbn:de:0000-', urnSuffix: 'default', urnCheckNo: false, urnNamespace: 'urn:nbn:de', urnResolver: 'https://nbn-resolving.de/'}}},
                issues: [{volume: 1, number: 1, year: 2026, galleys: [{label: 'PDF', file: 'article.pdf'}]}]});
            S.G = {path: G.path, id: G.contextId, mg: `${t}gmg`, issues: G.issues};
            S.G2 = {path: G2.path, id: G2.contextId, mg: `${t}hmg`, issues: G2.issues};
            S.P = {path: P.path, id: P.contextId, u: Object.fromEntries(pUsers.map(([k]) => [k, `${t}p${k}`])), issues: P.issues};
            S.D = {path: D.path, id: D.contextId, mg: `${t}dmg`, au: `${t}dau`, issues: D.issues};
            S.O = {path: O.path, id: O.contextId, mg: `${t}omg`, issues: O.issues};
            S.I = {path: I.path, id: I.contextId, mg: `${t}img`, issues: I.issues};
            save();
            const sub = async (C, au, key, title, issue, extra = {}) => {
                const r = await app.api.createSubmission({context: C.path, submitter: au, tag: `${t}${key}`, title: `${title} ${t}`, issue, published: true, ...extra});
                return {id: r.submissionId, publicationId: r.publicationId, title: `${title} ${t}`};
            };
            S.subs = {};
            S.subs.A = await sub(S.P, S.P.u.au, 'a', 'K2 Scheduled A', {volume: 2, number: 1, year: 2026});
            S.subs.B = await sub(S.P, S.P.u.au, 'b', 'K2 Published B', {volume: 1, number: 1, year: 2024});
            S.subs.R = await sub(S.P, S.P.u.au, 'r', 'K2 Published R', {volume: 1, number: 2, year: 2025});
            const e = await app.api.createSubmission({context: S.P.path, submitter: S.P.u.au, tag: `${t}e`, title: `K2 Early E ${t}`, decisions: ['skipExternalReview', 'sendToProduction']});
            S.subs.E = {id: e.submissionId, publicationId: e.publicationId, title: `K2 Early E ${t}`};
            S.subs.C = await sub(S.D, S.D.au, 'c', 'K2 Deleted C', {volume: 3, number: 1, year: 2026});
            S.subs.S = await sub(S.D, S.D.au, 's', 'K2 Scheduled S', {volume: 4, number: 1, year: 2027});
            S.subs.Z = await sub(S.I, `${t}iau`, 'z', 'K2 Ident Z', {volume: 1, number: 1, year: 2026});
            save();
            fact('seed', {t, G: S.G, G2: S.G2, P: S.P, D: S.D, O: S.O, I: S.I, subs: S.subs,
                pubs: psql(`select s.submission_id, p.status, p.date_published, p.issue_id from submissions s join publications p on p.publication_id=s.current_publication_id where s.context_id in (${S.P.id},${S.D.id},${S.I.id}) order by 1`)});
        });
        if (!S.G) { log('no state; run the seed phase'); return; }
        const P = S.P;

        // ------------------------------------------------------------ Issues page helpers (legacy grids)
        async function gotoIssues(ctx, tab = 'Future Issues') {
            await page.goto(u(ctx, '/manageIssues')); await idle(page);
            await page.getByRole('tab', {name: tab, exact: true}).click(); await idle(page);
            const panel = page.getByRole('tabpanel', {name: tab});
            await panel.locator('table').first().waitFor({timeout: T});
            await idle(page); await sleep(300);
            return panel;
        }
        const readGrid = (panel) => panel.locator('table').first().evaluate((tb) => {
            const f = (s) => (s || '').split('$(function')[0].replace(/\s+/g, ' ').trim();
            return {heads: [...tb.querySelectorAll('thead th')].map((th) => f(th.innerText)),
                rows: [...tb.querySelectorAll('tbody tr.gridRow')].filter((tr) => tr.offsetParent !== null).map((tr) => [...tr.querySelectorAll(':scope > td')].map((td) => f(td.innerText)).filter(Boolean).join(' | ')),
                empty: [...tb.querySelectorAll('tbody.empty')].filter((b) => b.offsetParent !== null).map((b) => f(b.innerText)).join(' ')};
        });
        const rowOf = (panel, name) => panel.locator('tr.gridRow').filter({hasText: name}).first();
        async function rowActions(panel, name) {
            const row = rowOf(panel, name);
            await row.waitFor({timeout: T});
            const arrow = row.locator('a.show_extras');
            if (await arrow.count()) await arrow.click();
            const ctl = row.locator('xpath=following-sibling::tr[1]');
            await ctl.getByRole('link').first().waitFor({timeout: 10000}).catch(() => {});
            const links = (await ctl.getByRole('link').allInnerTexts()).map((x) => flat(x, 60)).filter(Boolean);
            return {links, ctl};
        }
        const topDialog = () => page.locator('[role="dialog"]:visible').last();
        async function confirm(button = 'OK', urlRe = null) {
            const d = topDialog();
            await d.waitFor({timeout: T});
            await idle(page);
            const text = flat(await d.innerText().catch(() => null), 600);
            const buttons = (await d.locator('button, a.cancelButton, a.pkp_button, a[role="button"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 40)).filter(Boolean);
            const w = urlRe ? page.waitForResponse((r) => r.request().method() === 'POST' && urlRe.test(r.url()), {timeout: T}).catch(() => null) : null;
            if (button === 'OK') await d.getByRole('button', {name: 'OK', exact: true}).click();
            else await d.getByRole('button', {name: 'Cancel', exact: true}).or(d.getByRole('link', {name: 'Cancel', exact: true})).first().click();
            const r = w ? await w : null;
            let body = null;
            if (r) body = flat(await r.text().catch(() => null), 400);
            await idle(page); await sleep(500);
            return {text, buttons, status: r ? r.status() : null, body};
        }
        async function issueWindow(ctx, name, tab) {
            const panel = await gotoIssues(ctx, tab);
            await panel.getByRole('link', {name, exact: true}).click();
            const dlg = page.getByRole('dialog', {name: /^Issue Management/});
            await dlg.waitFor({timeout: T}); await idle(page);
            await dlg.getByRole('tab').first().waitFor({timeout: T}); await idle(page); await sleep(300);
            return dlg;
        }
        async function windowTab(dlg, name) {
            await dlg.getByRole('tab', {name, exact: true}).click(); await idle(page);
            const tp = dlg.getByRole('tabpanel', {name});
            await tp.locator('table, form').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(400);
            return tp;
        }
        const galleyWin = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('input[name="label"]')}).last();
        async function galleyWindowRead() {
            const gd = galleyWin();
            return gd.evaluate((el) => {
                const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
                const sel = el.querySelector('select[name="galleyLocale"]');
                return {heading: f(el.querySelector('h1, h2')?.innerText), label: el.querySelector('input[name="label"]')?.value,
                    urlPath: el.querySelector('input[name="urlPath"]')?.value, publisherId: !!el.querySelector('input[name="publicGalleyId"]'),
                    languageOptions: sel ? [...sel.options].map((o) => `${o.selected ? '*' : ''}${f(o.textContent)}=${o.value}`) : null,
                    fileLinks: [...el.querySelectorAll('a')].filter((a) => a.offsetParent !== null && /download|\.pdf|\.md/i.test(a.href + a.innerText)).map((a) => ({text: f(a.innerText), target: a.target})),
                    fieldLabels: [...el.querySelectorAll('label, .label')].map((l) => f(l.innerText)).filter(Boolean).slice(0, 20),
                    errors: [...el.querySelectorAll('.error, label.error, .pkp_form_error, [class*=error]')].filter((e) => e.offsetParent !== null).map((e) => f(e.innerText)).filter(Boolean)};
            });
        }
        async function galleySave() {
            const gd = galleyWin();
            const w = page.waitForResponse((r) => /issue-galley-grid\/update/.test(r.url()), {timeout: T}).catch(() => null);
            await gd.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            const body = r ? flat(await r.text().catch(() => null), 300) : null;
            await idle(page); await sleep(1200);
            const stillOpen = await galleyWin().isVisible().catch(() => false);
            const read = stillOpen ? await galleyWindowRead().catch(() => null) : null;
            const notices = (await page.locator('.pkpNotification, .ui-pnotify, [role="alert"], [role="status"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean);
            return {status: r ? r.status() : null, body, stillOpen, errors: read ? read.errors : null, notices};
        }
        async function upload(file) {
            const gd = galleyWin();
            const w = page.waitForResponse((r) => /issue-galley-grid\/upload/.test(r.url()), {timeout: T}).catch(() => null);
            await gd.locator('input[type="file"]').setInputFiles(FIX(file));
            const r = await w; await idle(page); await sleep(500);
            return r ? r.status() : null;
        }
        async function closeGalleyWin() {
            const gd = galleyWin();
            if (await gd.isVisible().catch(() => false)) {
                await gd.getByRole('link', {name: 'Cancel', exact: true}).or(gd.getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
                await idle(page); await sleep(800);
            }
        }
        async function dragRowAbove(panel, moving, target) {
            const mb = await rowOf(panel, moving).boundingBox(); const tb = await rowOf(panel, target).boundingBox();
            await page.mouse.move(mb.x + 40, mb.y + mb.height / 2);
            await page.mouse.down();
            await page.mouse.move(mb.x + 40, mb.y + mb.height / 2 - 6, {steps: 4});
            await page.mouse.move(tb.x + 40, tb.y + 4, {steps: 20});
            await page.mouse.move(tb.x + 40, tb.y - 8, {steps: 6});
            await sleep(200);
            await page.mouse.up();
            await sleep(500);
        }
        async function publishRow(ctx, name, {email = false, cancel = false, snapName} = {}) {
            const panel = await gotoIssues(ctx, 'Future Issues');
            const {links, ctl} = await rowActions(panel, name);
            await ctl.getByRole('link', {name: 'Publish Issue', exact: true}).click();
            const d = topDialog();
            await d.locator('#sendIssueNotification').waitFor({timeout: T});
            await idle(page);
            const read = {rowLinks: links, text: flat(await d.innerText(), 800), boxDefault: await d.locator('#sendIssueNotification').isChecked(),
                checkboxes: (await d.getByRole('checkbox').evaluateAll((els) => els.map((e) => `${e.checked ? '[x]' : '[ ]'} ${(e.labels?.[0]?.innerText || e.name).trim()}`)))};
            if (snapName) await snap(snapName, {read});
            if (!email) await d.locator('#sendIssueNotification').uncheck();
            const res = await confirm(cancel ? 'Cancel' : 'OK', /publish-issue/);
            return {read, res};
        }
        async function visit(url, name) {
            const r = await vis.page.goto(url).catch((e) => ({err: flat(e.message, 200)}));
            await idle(vis.page).catch(() => {});
            const s = await snap(name, {}, vis.page);
            return {status: r && r.status ? r.status() : r, url: vis.page.url(), title: await vis.page.title().catch(() => null), text: flat(s.text?.main || s.aria?.main, 700)};
        }
        const issueName = (v, n, y) => `Vol. ${v} No. ${n} (${y})`;
        const dbIssues = (C) => psql(`select issue_id, volume, number, year, published, date_published::date, access_status, url_path from issues where journal_id=${C.id} order by issue_id`);
        const dbCurrent = (C) => psql(`select current_issue_id from journals where journal_id=${C.id}`);
        const dbPub = (sid) => psql(`select s.status, p.status, p.date_published, p.issue_id from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id=${sid}`);
        async function wfReadout(ctx, sub, name) {
            await page.goto(u(ctx, `/dashboard/editorial?workflowSubmissionId=${sub.id}&workflowMenuKey=publication_${sub.publicationId}_issue`));
            const hdr = page.locator('[data-cy="sidemodal-header"]').first();
            await hdr.waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(1000);
            const s = await snap(name);
            const t = s.text?.dialog || '';
            const i = t.indexOf('Status:');
            return {stage: flat((t.match(/\n(Submission|Review|Copyediting|Production|Published|Scheduled|Declined|Incomplete)\n/) || [])[1], 40), status: flat(i >= 0 ? t.slice(i, i + 80) : null, 80),
                buttons: (await page.locator('[data-cy="workflow-controls-right"]').getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 40))};
        }
        async function activityLog(ctx, sub, name) {
            await page.goto(u(ctx, `/dashboard/editorial?workflowSubmissionId=${sub.id}`));
            const hdr = page.locator('[data-cy="sidemodal-header"]').first();
            await hdr.waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(800);
            await hdr.getByRole('button', {name: /^Activity Log$/}).click();
            const lg = page.getByRole('dialog').filter({has: page.locator('.pkp_controllers_informationCenter')}).last();
            await lg.locator('table tbody tr').first().waitFor({timeout: 45000}).catch(() => {});
            await idle(page); await sleep(500);
            const rows = await lg.locator('table').first().evaluate((tb) => [...tb.querySelectorAll('tbody tr.gridRow')].map((tr) => [...tr.querySelectorAll(':scope > td')].map((td) => (td.innerText || '').split('$(function')[0].replace(/\s+/g, ' ').trim()).join(' | '))).catch(() => []);
            await snap(name, {rows});
            return rows;
        }
        const email = (user) => `${user}@mail.test`;
        async function mailList(user) {
            try {
                const r = await app.mail._get('/api/v1/search', {query: `to:"${email(user)}"`, limit: '50'});
                return (r.messages || []).map((m) => ({subject: m.Subject, from: m.From && m.From.Address, created: m.Created, id: m.ID}));
            } catch (e) { return `error ${flat(e.message, 120)}`; }
        }
        async function mailCounts(users) {
            const out = {};
            for (const x of users) { const l = await mailList(x); out[x] = Array.isArray(l) ? l.length : l; }
            return out;
        }
        function drain() {
            process.env.PKP_CONFIG_FILE = app.configFile;
            process.env.TEST_API_KEY = app.testApiKey;
            process.env.PLAYWRIGHT_BASE_PORT = String(app.port);
            try { return flat(runJobs({appRoot: path.resolve(REPO, app.root)}).split('\n').slice(-6).join(' / '), 600); } catch (e) { return `runJobs error ${flat(e.message, 300)}`; }
        }
        async function tasksPanel(ctx, name) {
            const bell = page.getByRole('button', {name: /^Tasks/}).first();
            await bell.waitFor({timeout: T});
            const bellText = flat(await bell.innerText(), 40);
            await bell.click();
            const d = page.locator('[role="dialog"]:visible').last();
            await d.waitFor({timeout: T}); await idle(page); await sleep(1500);
            const s = await snap(name, {bellText});
            await page.keyboard.press('Escape').catch(() => {});
            return {bellText, text: flat(s.text?.dialog, 900)};
        }
        async function notifRow(user, ctx, {enable, mail}, name) {
            await as(user, ctx);
            await page.goto(u(ctx, '/user/profile/notificationSettings')); await idle(page);
            const form = page.locator('form#notificationSettingsForm');
            await form.waitFor({timeout: T});
            const row = await form.evaluate((f) => {
                const boxes = [...f.querySelectorAll('input[type=checkbox]')];
                for (const b of boxes) {
                    const sec = b.closest('.section');
                    if (sec && /An issue has been published/.test(sec.innerText)) {
                        const bx = [...sec.querySelectorAll('input[type=checkbox]')];
                        return {sentence: sec.innerText.replace(/\s+/g, ' ').trim().slice(0, 300), ids: bx.map((x) => x.id), checked: bx.map((x) => x.checked)};
                    }
                }
                return null;
            });
            const out = {before: row};
            if (row && (enable !== undefined || mail !== undefined)) {
                if (enable !== undefined) await form.locator(`#${row.ids[0]}`).setChecked(enable);
                if (mail !== undefined) await form.locator(`#${row.ids[1]}`).setChecked(mail);
                const action = await form.getAttribute('action');
                const w = page.waitForResponse((r) => r.url().startsWith(action.split('?')[0]) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                out.save = (await w)?.status() ?? null;
                await idle(page);
                await page.reload(); await idle(page);
                out.after = await form.evaluate((f, ids) => ids.map((id) => f.querySelector(`#${id}`)?.checked), row.ids);
            }
            await snap(name, {row: out});
            return out;
        }

        // ============================================================ Settings 7: each person's row (before the publish)
        if (on('notif') && !S.notifDone) await sect('notif', async () => {
            const out = {};
            out.rdDefault = await notifRow(P.u.rd, P.path, {}, 'n-rd-default');
            out.rnOff = await notifRow(P.u.rn, P.path, {enable: false}, 'n-rn-off');
            out.reMailOff = await notifRow(P.u.re, P.path, {mail: true}, 'n-re-mail-off');
            await signOut(page); who = null;
            S.notifDone = true; save();
            fact('notif', out);
        });

        // ============================================================ Rules 14–15: issue galleys (G, G2)
        if (on('galley')) await sect('galley', async () => {
            const G = S.G;
            const i1 = issueName(1, 1, 2026), i2 = issueName(1, 2, 2026);
            const out = {};
            await as(G.mg, G.path);
            // the other issue's galley gets the URL Path "full" first
            let dlg = await issueWindow(G.path, i2, 'Future Issues');
            let tp = await windowTab(dlg, 'Issue Galleys');
            out.i2Grid = await readGrid(tp);
            let ra = await rowActions(tp, 'PDF');
            out.galleyRowLinks = ra.links;
            await ra.ctl.getByRole('link', {name: 'Edit', exact: true}).click();
            await galleyWin().waitFor({timeout: T}); await idle(page); await sleep(500);
            out.editWindow = await galleyWindowRead();
            await snap('g-edit-window-i2', {read: out.editWindow});
            await galleyWin().locator('input[name="urlPath"]').fill('full');
            out.i2UrlPathSave = await galleySave();
            await closeGalleyWin();
            // issue 1: the Issue Galleys tab, "Create Issue Galley"
            dlg = await issueWindow(G.path, i1, 'Future Issues');
            out.windowTabs = (await dlg.getByRole('tab').allInnerTexts()).map((x) => flat(x, 40));
            tp = await windowTab(dlg, 'Issue Galleys');
            out.i1GridEmpty = await readGrid(tp);
            await snap('g-galleys-tab-empty');
            await loc(page, 'Issue Galleys tab: "Create Issue Galley"', tp.getByRole('link', {name: 'Create Issue Galley', exact: true}));
            const create = async () => {
                await tp.getByRole('link', {name: 'Create Issue Galley', exact: true}).click();
                await galleyWin().waitFor({timeout: T}); await idle(page); await sleep(500);
            };
            // (a) French (an interface language, not a form language), label PDF, a file
            await create();
            out.createWindow = await galleyWindowRead();
            await snap('g-create-window', {read: out.createWindow});
            await loc(page, 'Create Issue Galley: "Language" list', galleyWin().locator('select[name="galleyLocale"]'));
            out.frUpload = await upload('article.pdf');
            await galleyWin().locator('input[name="label"]').fill('PDF');
            await galleyWin().locator('select[name="galleyLocale"]').selectOption('fr_CA');
            out.french = await galleySave();
            await snap('g-save-french', {res: out.french});
            out.gridAfterFrench = await readGrid(tp);
            // (b) English, no label (file still attached in the same window)
            await galleyWin().locator('select[name="galleyLocale"]').selectOption('en').catch(() => {});
            await galleyWin().locator('input[name="label"]').fill('');
            out.noLabel = await galleySave();
            await snap('g-save-nolabel', {res: out.noLabel});
            await closeGalleyWin();
            out.gridAfterNoLabel = await readGrid(tp);
            // (c) a label, no file
            await create();
            await galleyWin().locator('input[name="label"]').fill('PDF');
            out.noFile = await galleySave();
            await snap('g-save-nofile', {res: out.noFile});
            await closeGalleyWin();
            // (d) URL Path checks: digits only, a bad character, another issue's path (accepted), then this issue's twice
            const tryPath = async (label, file, p) => {
                await create();
                await upload(file);
                await galleyWin().locator('input[name="label"]').fill(label);
                await galleyWin().locator('input[name="urlPath"]').fill(p);
                const r = await galleySave();
                await snap(`g-urlpath-${label}`, {res: r});
                if (r.stillOpen) await closeGalleyWin();
                return r;
            };
            out.pathDigits = await tryPath('D1', 'article.pdf', '123');
            out.pathBadChar = await tryPath('D2', 'article.pdf', 'a b');
            out.pathOtherIssue = await tryPath('PDF', 'article.pdf', 'full');
            out.gridAfterPDF = await readGrid(tp);
            out.pathDuplicate = await tryPath('DUP', 'article.pdf', 'full');
            out.second = await tryPath('EPUB', 'notes.md', '');
            out.gridTwo = await readGrid(tp);
            await snap('g-galleys-two', {grid: out.gridTwo});
            // Rule 15: Edit filled in, replace the file
            const iid1 = G.issues[0].id;
            out.filesBefore = psql(`select f.file_id, f.file_name, f.original_file_name from issue_files f where f.issue_id=${iid1} order by 1`);
            out.galleysBefore = psql(`select galley_id, label, locale, file_id, seq, url_path from issue_galleys where issue_id=${iid1} order by seq`);
            ra = await rowActions(tp, 'PDF');
            await ra.ctl.getByRole('link', {name: 'Edit', exact: true}).click();
            await galleyWin().waitFor({timeout: T}); await idle(page); await sleep(500);
            out.editPDF = await galleyWindowRead();
            await snap('g-edit-pdf', {read: out.editPDF});
            out.replaceUpload = await upload('replacement.pdf');
            out.replaceSave = await galleySave();
            if (out.replaceSave.stillOpen) await closeGalleyWin();
            out.filesAfterReplace = psql(`select f.file_id, f.file_name, f.original_file_name from issue_files f where f.issue_id=${iid1} order by 1`);
            const dir = filesDir();
            const jdir = path.join(dir, 'journals', String(G.id), 'issues', String(iid1), 'public');
            out.diskAfterReplace = fs.existsSync(jdir) ? fs.readdirSync(jdir) : `no dir ${jdir}`;
            ra = await rowActions(tp, 'PDF');
            await ra.ctl.getByRole('link', {name: 'Edit', exact: true}).click();
            await galleyWin().waitFor({timeout: T}); await idle(page); await sleep(500);
            out.editPDFAfter = await galleyWindowRead();
            await snap('g-edit-pdf-after-replace', {read: out.editPDFAfter});
            await closeGalleyWin();
            // Rule 15: Order, Done and Cancel ordering; the issue page (preview) lists them in that order
            const orderLink = tp.locator('.pkp_linkaction_orderItems, a:has-text("Order")').first();
            out.orderOffered = await orderLink.count();
            await orderLink.click(); await sleep(600);
            out.orderingControls = (await tp.locator('.order_finish_controls a, .order_finish_controls button').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
            await snap('g-ordering-mode', {controls: out.orderingControls});
            await dragRowAbove(tp, 'EPUB', 'PDF');
            out.afterDrag = await readGrid(tp);
            const w = page.waitForResponse((r) => /save-sequence|saveSequence/.test(r.url()), {timeout: T}).catch(() => null);
            await tp.locator('.order_finish_controls .saveButton').first().click();
            out.doneStatus = (await w)?.status() ?? null;
            await idle(page); await sleep(800);
            out.afterDone = await readGrid(tp);
            out.seqAfterDone = psql(`select label, seq from issue_galleys where issue_id=${iid1} order by seq, galley_id`);
            await orderLink.click(); await sleep(600);
            await dragRowAbove(tp, 'PDF', 'EPUB');
            out.afterDrag2 = await readGrid(tp);
            await tp.locator('.order_finish_controls .cancelFormButton').first().click(); await idle(page); await sleep(800);
            out.afterCancel = await readGrid(tp);
            out.seqAfterCancel = psql(`select label, seq from issue_galleys where issue_id=${iid1} order by seq, galley_id`);
            await snap('g-after-cancel-ordering', {grid: out.afterCancel});
            // leave the window with an unsaved change: Issue Data "Number" edited, then the Table of Contents tab, then Close
            const idp = await windowTab(dlg, 'Issue Data');
            await idp.locator('input[name="number"]').fill('1x');
            await idp.locator('input[name="number"]').blur();
            await dlg.getByRole('tab', {name: 'Table of Contents', exact: true}).click(); await idle(page); await sleep(800);
            const sLeave = await snap('g-leave-tab-unsaved');
            out.leaveTab = {dialogs: dialogs.slice(-3), visibleDialogs: (await page.locator('[role="dialog"]:visible').count()), text: flat(sLeave.text?.dialog, 300)};
            await dlg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await idle(page); await sleep(800);
            out.leaveClose = {dialogs: dialogs.slice(-3), visibleDialogs: await page.locator('[role="dialog"]:visible').count()};
            out.numberAfterLeave = psql(`select number from issues where issue_id=${iid1}`);
            // the issue page (preview as the manager) lists the galleys
            await page.goto(u(G.path, `/issue/view/${iid1}`)); await idle(page);
            const pv = await snap('g-issue-preview');
            out.previewGalleys = await page.locator('a.obj_galley_link').allInnerTexts().then((a) => a.map((x) => flat(x, 60))).catch(() => []);
            out.previewText = flat(pv.text?.main || pv.aria?.main, 400);
            // Delete a galley
            dlg = await issueWindow(G.path, i1, 'Future Issues');
            tp = await windowTab(dlg, 'Issue Galleys');
            ra = await rowActions(tp, 'EPUB');
            await ra.ctl.getByRole('link', {name: 'Delete', exact: true}).click();
            out.deleteCancel = await confirm('Cancel');
            out.gridAfterDeleteCancel = await readGrid(tp);
            ra = await rowActions(tp, 'EPUB');
            await ra.ctl.getByRole('link', {name: 'Delete', exact: true}).click();
            out.deleteOK = await confirm('OK', /issue-galley-grid\/delete/);
            out.gridAfterDelete = await readGrid(tp);
            out.filesAfterDelete = psql(`select f.file_id, f.file_name, f.original_file_name from issue_files f where f.issue_id=${iid1} order by 1`);
            out.diskAfterDelete = fs.existsSync(jdir) ? fs.readdirSync(jdir) : `no dir ${jdir}`;
            await snap('g-after-delete', {grid: out.gridAfterDelete});
            fact('galley', out);
            // G2: French is a form language too
            const o2 = {};
            await as(S.G2.mg, S.G2.path);
            dlg = await issueWindow(S.G2.path, i1, 'Future Issues');
            tp = await windowTab(dlg, 'Issue Galleys');
            await tp.getByRole('link', {name: 'Create Issue Galley', exact: true}).click();
            await galleyWin().waitFor({timeout: T}); await idle(page); await sleep(500);
            o2.window = await galleyWindowRead();
            await upload('article.pdf');
            await galleyWin().locator('input[name="label"]').fill('PDF');
            await galleyWin().locator('select[name="galleyLocale"]').selectOption('fr_CA');
            o2.french = await galleySave();
            o2.grid = await readGrid(tp);
            await snap('g2-save-french', {res: o2.french, grid: o2.grid});
            fact('galley2', o2);
        });

        // ============================================================ Rule 16, Side effects: publishing P3 (P)
        if (on('publish') && !S.published) await sect('publish', async () => {
            const out = {};
            const U = P.u;
            const everyone = Object.values(U);
            const p3 = issueName(2, 1, 2026), p4 = issueName(0, 9, 2020);
            out.before = {issues: dbIssues(P), current: dbCurrent(P), A: dbPub(S.subs.A.id)};
            out.visitorA = await visit(u(P.path, `/article/view/${S.subs.A.id}`), 'p-visitor-a-before');
            // E: published at once into P3 from its workflow (the U49 path)
            await as(U.mg, P.path);
            try {
                const E = S.subs.E;
                await page.goto(u(P.path, `/dashboard/editorial?workflowSubmissionId=${E.id}&workflowMenuKey=publication_${E.publicationId}_titleAbstract`));
                await idle(page); await sleep(1500); await idle(page);
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
                const issueSel = sels.find((x) => x.options.some((o) => o.t.includes('Vol. 2 No. 1 (2026)')));
                if (issueSel) await page.locator(issueSel.id ? `[id="${issueSel.id}"]` : `select[name="${issueSel.name}"]`).selectOption(issueSel.options.find((o) => o.t.includes('Vol. 2 No. 1 (2026)')).v);
                await snap('p-e-publish-panel', {sels});
                await page.getByRole('button', {name: 'Confirm', exact: true}).last().click();
                const conf = page.getByRole('dialog').filter({hasText: /Are you sure/}).last();
                await conf.waitFor({timeout: 20000}).catch(() => {});
                out.eConfirm = flat(await conf.innerText().catch(() => null), 300);
                const pr = page.waitForResponse((r) => /\/publish/.test(r.url()), {timeout: T}).catch(() => null);
                await conf.getByRole('button', {name: /^(Publish|Schedule|OK)$/}).last().click();
                out.ePublish = (await pr)?.status() ?? null;
                await sleep(1500); await idle(page);
                await snap('p-e-published');
            } catch (e) { out.eError = flat(e.message, 300); }
            out.E0 = dbPub(S.subs.E.id);
            // back-date E's date? No: E keeps what its publish gave it (today); record it.
            // Issue Data: Date Published 2026-01-15 on P3
            let dlg = await issueWindow(P.path, p3, 'Future Issues');
            out.p3Tabs = (await dlg.getByRole('tab').allInnerTexts()).map((x) => flat(x, 40));
            const idp = await windowTab(dlg, 'Issue Data');
            const dp = idp.getByRole('group', {name: 'Date Published'}).getByRole('textbox');
            out.dpHelp = flat(await idp.getByRole('group', {name: 'Date Published'}).innerText().catch(() => null), 200);
            await dp.fill('2026-01-15'); await page.keyboard.press('Escape').catch(() => {});
            out.dpTyped = await dp.inputValue().catch(() => null);
            const w = page.waitForResponse((r) => /update-issue/.test(r.url()), {timeout: T}).catch(() => null);
            await idp.getByRole('button', {name: 'Save', exact: true}).click();
            out.dpSave = (await w)?.status() ?? null;
            await idle(page); await sleep(800);
            await snap('p-p3-issue-data-saved');
            out.p3AfterSave = dbIssues(P);
            // "Publish Issue" › "Cancel"
            const mailsBefore = await mailCounts(everyone);
            out.cancel = await publishRow(P.path, p3, {cancel: true, email: true, snapName: 'p-publish-window'});
            out.afterCancel = {issues: dbIssues(P), future: await readGrid(await gotoIssues(P.path, 'Future Issues'))};
            // "Publish Issue" › "OK", box left ticked
            out.publish = await publishRow(P.path, p3, {email: true});
            const back = await gotoIssues(P.path, 'Back Issues');
            out.backAfter = await readGrid(back);
            await snap('p-back-issues-after-publish', {grid: out.backAfter});
            out.futureAfter = await readGrid(await gotoIssues(P.path, 'Future Issues'));
            out.dbAfter = {issues: dbIssues(P), current: dbCurrent(P), A: dbPub(S.subs.A.id), E: dbPub(S.subs.E.id)};
            // before the queue runs
            out.beforeJobs = {mails: await mailCounts(everyone), notifications: psql(`select u.username, count(*) from notifications n join users u on u.user_id=n.user_id where n.context_id=${P.id} and n.type=${NOTIF_ISSUE} group by 1 order by 1`), mailsBefore};
            out.jobs = drain();
            out.afterJobs = {mails: await mailCounts(everyone), notifications: psql(`select u.username, count(*) from notifications n join users u on u.user_id=n.user_id where n.context_id=${P.id} and n.type=${NOTIF_ISSUE} group by 1 order by 1`),
                adminNotified: psql(`select count(*) from notifications n join users u on u.user_id=n.user_id where n.context_id=${P.id} and n.type=${NOTIF_ISSUE} and u.username='admin'`)};
            out.lists = {};
            for (const x of everyone) out.lists[x] = await mailList(x);
            // the issue email, as the reader got it
            try {
                const m = await app.mail.find({to: email(U.rd), subject: 'Just published', timeoutMs: 20000});
                const full = await app.mail.fullMessage(m.ID);
                const html = full.HTML || '';
                out.issueMail = {subject: m.Subject, from: full.From, to: full.To, links: [...html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((x) => ({href: x[1].replace(/&amp;/g, '&'), text: flat(x[2].replace(/<[^>]+>/g, ''), 100)})), text: flat(full.Text, 2000)};
                record('p-issue-mail', {...out.issueMail, html});
            } catch (e) { out.issueMail = `none: ${flat(e.message, 100)}`; }
            try {
                const m = await app.mail.find({to: 'admin@mail.test', subject: 'Just published', contains: P.path, timeoutMs: 5000});
                out.adminMail = {subject: m.Subject};
            } catch (e) { out.adminMail = `none: ${flat(e.message, 100)}`; }
            // reader side: the issue, the articles, Current
            out.visitorA2 = await visit(u(P.path, `/article/view/${S.subs.A.id}`), 'p-visitor-a-after');
            out.visitorE = await visit(u(P.path, `/article/view/${S.subs.E.id}`), 'p-visitor-e-after');
            out.current = await visit(u(P.path, '/issue/current'), 'p-current-after-p3');
            out.p3Page = await visit(u(P.path, `/issue/view/${P.issues[2].id}`), 'p-p3-page');
            // released article: A's history, the author's tasks
            out.logA = await activityLog(P.path, S.subs.A, 'p-log-a');
            await as(U.au, P.path);
            await page.goto(u(P.path, '/dashboard/mySubmissions')); await idle(page);
            out.authorTasks = await tasksPanel(P.path, 'p-author-tasks').catch((e) => flat(e.message, 200));
            await as(U.rd, P.path);
            await page.goto(u(P.path, '/index')); await idle(page);
            out.readerHome = flat((await snap('p-reader-home')).text?.main || '', 600);
            await as(U.mg, P.path);
            await page.goto(u(P.path, '/dashboard/editorial')); await idle(page);
            out.managerTasks = await tasksPanel(P.path, 'p-manager-tasks').catch((e) => flat(e.message, 200));
            // P4: an older volume, empty date, no article, box unticked
            out.p4 = await publishRow(P.path, p4, {email: false, snapName: 'p-publish-window-p4'});
            out.p4Back = await readGrid(await gotoIssues(P.path, 'Back Issues'));
            await snap('p-back-issues-after-p4', {grid: out.p4Back});
            out.p4Db = {issues: dbIssues(P), current: dbCurrent(P)};
            out.p4Current = await visit(u(P.path, '/issue/current'), 'p-current-after-p4');
            out.p4Jobs = drain();
            out.p4Mails = await mailCounts(everyone);
            S.published = true; save();
            fact('publish', out);
        });

        // ============================================================ Rule 17 and "nothing else sends email" (P)
        if (on('current') && !S.currentDone) await sect('current', async () => {
            const out = {};
            const U = P.u;
            const everyone = Object.values(U);
            await as(U.mg, P.path);
            const p2 = issueName(1, 2, 2025), p4 = issueName(0, 9, 2020);
            const mails0 = await mailCounts(everyone);
            let back = await gotoIssues(P.path, 'Back Issues');
            out.back = await readGrid(back);
            out.rowLinks = {};
            for (const n of [issueName(1, 1, 2024), p2, issueName(2, 1, 2026), p4]) out.rowLinks[n] = (await rowActions(back, n)).links;
            await snap('c-back-rows-expanded', {rowLinks: out.rowLinks});
            back = await gotoIssues(P.path, 'Back Issues');
            let ra = await rowActions(back, p2);
            await ra.ctl.getByRole('link', {name: 'Current Issue', exact: true}).click();
            out.setCurrentCancel = await confirm('Cancel');
            out.afterCancel = dbCurrent(P);
            back = await gotoIssues(P.path, 'Back Issues');
            ra = await rowActions(back, p2);
            await ra.ctl.getByRole('link', {name: 'Current Issue', exact: true}).click();
            out.setCurrent = await confirm('OK', /set-current-issue|setCurrentIssue/);
            out.dbCurrent = {current: dbCurrent(P), issues: dbIssues(P)};
            back = await gotoIssues(P.path, 'Back Issues');
            out.backAfter = await readGrid(back);
            out.rowLinksAfter = {};
            for (const n of [p2, p4]) out.rowLinksAfter[n] = (await rowActions(back, n)).links;
            await snap('c-back-after-set-current', {grid: out.backAfter, rowLinks: out.rowLinksAfter});
            out.current = await visit(u(P.path, '/issue/current'), 'c-current-p2');
            out.home = await visit(u(P.path, '/index'), 'c-home-p2');
            // Create Issue on screen (Title unticked) and edit it: silent
            await gotoIssues(P.path, 'Future Issues');
            await page.getByRole('link', {name: 'Create Issue', exact: true}).click();
            const cd = topDialog();
            await cd.locator('form').first().waitFor({timeout: T}); await idle(page);
            const ident = cd.getByRole('group', {name: 'Identification'});
            await ident.getByRole('textbox', {name: 'Volume', exact: true}).fill('3');
            await ident.getByRole('textbox', {name: 'Number', exact: true}).fill('1');
            await ident.getByRole('textbox', {name: 'Year', exact: true}).fill('2027');
            await ident.getByRole('checkbox', {name: 'Title', exact: true}).uncheck();
            const w = page.waitForResponse((r) => /update-issue/.test(r.url()), {timeout: T}).catch(() => null);
            await cd.getByRole('button', {name: 'Save', exact: true}).click();
            out.create = (await w)?.status() ?? null;
            await idle(page); await sleep(800);
            const dlg = await issueWindow(P.path, issueName(3, 1, 2027), 'Future Issues');
            const idp = await windowTab(dlg, 'Issue Data');
            await idp.locator('input[name="number"]').fill('1A');
            const w2 = page.waitForResponse((r) => /update-issue/.test(r.url()), {timeout: T}).catch(() => null);
            await idp.getByRole('button', {name: 'Save', exact: true}).click();
            out.edit = (await w2)?.status() ?? null;
            await idle(page);
            // "Remove" R from the published P2's table of contents: history, nothing sent
            const dl2 = await issueWindow(P.path, p2, 'Back Issues');
            const toc = await windowTab(dl2, 'Table of Contents');
            ra = await rowActions(toc, S.subs.R.title);
            out.tocRowLinks = ra.links;
            await ra.ctl.getByRole('link', {name: 'Remove', exact: true}).click();
            out.remove = await confirm('OK', /remove-article|removeArticle/);
            out.R = dbPub(S.subs.R.id);
            out.jobs = drain();
            out.mails = {before: mails0, after: await mailCounts(everyone)};
            out.logR = await activityLog(P.path, S.subs.R, 'c-log-r');
            S.currentDone = true; save();
            fact('current', out);
        });

        // ============================================================ Rule 16's other end: a scheduled version that already carries a date (P)
        // F in production; its Publication "Issue" page: "Publication Date" 2023-05-05 saved; then "Schedule For Publication" ›
        // "Assign To Future Issue and Schedule Only" into Vol. 3 No. 1A (2027) (created in the current phase); that issue published.
        if (on('dated') && !S.datedDone) await sect('dated', async () => {
            const out = {};
            const U = P.u;
            const target = 'Vol. 3 No. 1A (2027)';
            if (!S.subs.F) {
                const f = await app.api.createSubmission({context: P.path, submitter: U.au, tag: `${S.t}f`, title: `K2 Dated F ${S.t}`, decisions: ['skipExternalReview', 'sendToProduction']});
                S.subs.F = {id: f.submissionId, publicationId: f.publicationId, title: `K2 Dated F ${S.t}`}; save();
            }
            const F = S.subs.F;
            await as(U.mg, P.path);
            await page.goto(u(P.path, `/dashboard/editorial?workflowSubmissionId=${F.id}&workflowMenuKey=publication_${F.publicationId}_issue`));
            await idle(page); await sleep(1500); await idle(page);
            const s0 = await snap('f-issue-page');
            out.issuePage = flat(s0.text?.dialog, 900);
            const dateBox = page.getByRole('dialog').getByRole('textbox', {name: /Publication Date|Date Published/}).first();
            out.dateBox = await dateBox.count();
            if (out.dateBox) {
                await dateBox.fill('2023-05-05');
                const w = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await page.getByRole('dialog').getByRole('button', {name: 'Save', exact: true}).first().click();
                out.dateSave = (await w)?.status() ?? null;
                await idle(page); await sleep(800);
                out.F0 = dbPub(F.id);
            }
            await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first().click({timeout: 15000});
            await sleep(1500);
            const vs = page.locator('select[name="versionStage"]');
            if (await vs.isVisible({timeout: 5000}).catch(() => false)) {
                await vs.selectOption('VoR').catch(() => {});
                await page.locator('select[name="versionIsMinor"]').selectOption('false').catch(() => {});
            }
            const radio = page.getByRole('radio', {name: 'Assign To Future Issue and Schedule Only'});
            if (await radio.isVisible({timeout: 5000}).catch(() => false)) {
                await radio.check();
                await sleep(800);
                const sels = await page.locator('[role="dialog"] select').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => ({name: e.name, id: e.id, options: [...e.options].map((o) => ({v: o.value, t: o.textContent.trim()}))})));
                const issueSel = sels.find((x) => x.options.some((o) => o.t.includes(target)));
                if (issueSel) await page.locator(issueSel.id ? `[id="${issueSel.id}"]` : `select[name="${issueSel.name}"]`).selectOption(issueSel.options.find((o) => o.t.includes(target)).v);
                out.issueOptions = issueSel ? issueSel.options.map((o) => o.t) : sels.map((x) => x.name);
                await page.getByRole('button', {name: 'Confirm', exact: true}).last().click();
            } else out.noReviewPanel = true;
            const conf = page.getByRole('dialog').filter({hasText: /Are you sure/}).last();
            await conf.waitFor({timeout: 20000}).catch(() => {});
            out.confirm = flat(await conf.innerText().catch(() => null), 300);
            const pr = page.waitForResponse((r) => /\/publish/.test(r.url()), {timeout: T}).catch(() => null);
            await conf.getByRole('button', {name: /^(Publish|Schedule|Schedule For Publication|OK)$/}).last().click();
            out.schedule = (await pr)?.status() ?? null;
            await sleep(1500); await idle(page);
            out.F1 = dbPub(F.id);
            out.publish = (await publishRow(P.path, target, {email: false})).res;
            out.F2 = dbPub(F.id);
            out.pageF = await visit(u(P.path, `/article/view/${F.id}`), 'f-article-page');
            out.issue = dbIssues(P);
            S.datedDone = true; save();
            fact('dated', out);
        });

        // ============================================================ Rule 18, A2 (P)
        if (on('unpub') && !S.unpubDone) await sect('unpub', async () => {
            const out = {};
            const U = P.u;
            const everyone = Object.values(U);
            const p1 = issueName(1, 1, 2024), p2 = issueName(1, 2, 2025);
            await as(U.mg, P.path);
            const mails0 = await mailCounts(everyone);
            out.before = {current: dbCurrent(P), issues: dbIssues(P), B: dbPub(S.subs.B.id)};
            out.homeBefore = await visit(u(P.path, '/index'), 'u-home-before');
            let back = await gotoIssues(P.path, 'Back Issues');
            let ra = await rowActions(back, p1);
            await ra.ctl.getByRole('link', {name: 'Unpublish Issue', exact: true}).click();
            out.cancel = await confirm('Cancel');
            out.afterCancel = dbIssues(P);
            back = await gotoIssues(P.path, 'Back Issues');
            ra = await rowActions(back, p1);
            await ra.ctl.getByRole('link', {name: 'Unpublish Issue', exact: true}).click();
            out.unpublish = await confirm('OK', /unpublish-issue|unpublishIssue/);
            out.after = {current: dbCurrent(P), issues: dbIssues(P), B: dbPub(S.subs.B.id)};
            back = await gotoIssues(P.path, 'Back Issues');
            out.backAfter = await readGrid(back);
            out.p2RowLinks = (await rowActions(back, p2)).links;
            await snap('u-back-after-unpublish', {grid: out.backAfter, p2RowLinks: out.p2RowLinks});
            out.futureAfter = await readGrid(await gotoIssues(P.path, 'Future Issues'));
            await snap('u-future-after-unpublish', {grid: out.futureAfter});
            const dlg = await issueWindow(P.path, p1, 'Future Issues');
            const idp = await windowTab(dlg, 'Issue Data');
            out.p1DateBox = await idp.getByRole('group', {name: 'Date Published'}).getByRole('textbox').inputValue().catch(() => null);
            await snap('u-p1-issue-data');
            out.current = await visit(u(P.path, '/issue/current'), 'u-current-after');
            out.home = await visit(u(P.path, '/index'), 'u-home-after');
            out.archive = await visit(u(P.path, '/issue/archive'), 'u-archive-after');
            out.pageB = await visit(u(P.path, `/article/view/${S.subs.B.id}`), 'u-article-b');
            out.wfB = await wfReadout(P.path, S.subs.B, 'u-wf-b');
            out.logB = await activityLog(P.path, S.subs.B, 'u-log-b');
            out.jobs = drain();
            out.mails = {before: mails0, after: await mailCounts(everyone)};
            // published again: B back, the date kept
            out.republish = await publishRow(P.path, p1, {email: false});
            out.again = {current: dbCurrent(P), issues: dbIssues(P), B: dbPub(S.subs.B.id)};
            out.pageBAgain = await visit(u(P.path, `/article/view/${S.subs.B.id}`), 'u-article-b-again');
            S.unpubDone = true; save();
            fact('unpub', out);
        });

        // ============================================================ Rule 18 again, on P3 (articles that went through the workflow)
        if (on('unpub2') && !S.unpub2Done) await sect('unpub2', async () => {
            const out = {};
            const U = P.u;
            const p3 = issueName(2, 1, 2026);
            await as(U.mg, P.path);
            out.wfEBefore = await wfReadout(P.path, S.subs.E, 'u2-wf-e-before');
            const back = await gotoIssues(P.path, 'Back Issues');
            const ra = await rowActions(back, p3);
            await ra.ctl.getByRole('link', {name: 'Unpublish Issue', exact: true}).click();
            out.unpublish = await confirm('OK', /unpublish-issue|unpublishIssue/);
            out.after = {current: dbCurrent(P), A: dbPub(S.subs.A.id), E: dbPub(S.subs.E.id)};
            out.wfE = await wfReadout(P.path, S.subs.E, 'u2-wf-e');
            out.wfA = await wfReadout(P.path, S.subs.A, 'u2-wf-a');
            out.pageE = await visit(u(P.path, `/article/view/${S.subs.E.id}`), 'u2-article-e');
            await page.goto(u(P.path, '/dashboard/editorial')); await idle(page); await sleep(1000);
            const s = await snap('u2-dashboard');
            out.dashboardRows = (s.text?.main || '').split('\n').filter((l) => l.includes(S.t)).slice(0, 10);
            out.republish = (await publishRow(P.path, p3, {email: false})).res.status;
            out.again = {current: dbCurrent(P), A: dbPub(S.subs.A.id), E: dbPub(S.subs.E.id)};
            out.wfEAgain = await wfReadout(P.path, S.subs.E, 'u2-wf-e-again');
            S.unpub2Done = true; save();
            fact('unpub2', out);
        });

        // ============================================================ Rule 18: the home page's lists (P, the current issue holding F)
        if (on('unpub3') && !S.unpub3Done) await sect('unpub3', async () => {
            const out = {};
            const target = 'Vol. 3 No. 1A (2027)';
            await as(P.u.mg, P.path);
            out.homeBefore = await visit(u(P.path, '/index'), 'u3-home-before');
            const back = await gotoIssues(P.path, 'Back Issues');
            const ra = await rowActions(back, target);
            await ra.ctl.getByRole('link', {name: 'Unpublish Issue', exact: true}).click();
            out.unpublish = await confirm('OK', /unpublish-issue|unpublishIssue/);
            out.homeAfter = await visit(u(P.path, '/index'), 'u3-home-after');
            out.pageF = await visit(u(P.path, `/article/view/${S.subs.F.id}`), 'u3-article-f');
            out.F = dbPub(S.subs.F.id);
            out.mailsO = await mailCounts([S.O.mg, S.D.mg, S.D.au, S.G.mg]);
            S.unpub3Done = true; save();
            fact('unpub3', out);
        });

        // ============================================================ Rule 19, A3 (D)
        if (on('del') && !S.delDone) await sect('del', async () => {
            const D = S.D;
            const out = {};
            const d1 = issueName(1, 1, 2024), d2 = issueName(2, 1, 2025), d3 = issueName(3, 1, 2026), d4 = issueName(4, 1, 2027);
            await as(D.mg, D.path);
            const d3id = D.issues[2].id;
            // a galley on D3, added on screen
            let dlg = await issueWindow(D.path, d3, 'Back Issues');
            const tp = await windowTab(dlg, 'Issue Galleys');
            await tp.getByRole('link', {name: 'Create Issue Galley', exact: true}).click();
            await galleyWin().waitFor({timeout: T}); await idle(page);
            await upload('article.pdf');
            await galleyWin().locator('input[name="label"]').fill('PDF');
            out.galley = await galleySave();
            const dir = filesDir();
            const publicDir = path.join(REPO, 'checkouts/ojs/public/journals', String(D.id));
            const issueDir = path.join(dir, 'journals', String(D.id), 'issues', String(d3id));
            const diskRead = () => ({issueFiles: fs.existsSync(issueDir) ? execFileSync('find', [issueDir, '-type', 'f'], {encoding: 'utf8'}).trim() : 'no dir',
                cover: fs.existsSync(publicDir) ? fs.readdirSync(publicDir).filter((f) => /cover_issue/.test(f)) : 'no dir'});
            out.before = {issues: dbIssues(D), current: dbCurrent(D), C: dbPub(S.subs.C.id), S: dbPub(S.subs.S.id),
                files: psql(`select issue_id, file_id, file_name from issue_files where issue_id in (select issue_id from issues where journal_id=${D.id})`), disk: diskRead()};
            out.pageCBefore = await visit(u(D.path, `/article/view/${S.subs.C.id}`), 'd-article-c-before');
            const mails0 = await mailCounts([D.mg, D.au]);
            let back = await gotoIssues(D.path, 'Back Issues');
            out.backBefore = await readGrid(back);
            let ra = await rowActions(back, d3);
            out.d3RowLinks = ra.links;
            await ra.ctl.getByRole('link', {name: 'Delete', exact: true}).click();
            await snap('d-delete-confirm');
            out.cancel = await confirm('Cancel');
            out.afterCancel = dbIssues(D);
            back = await gotoIssues(D.path, 'Back Issues');
            ra = await rowActions(back, d3);
            await ra.ctl.getByRole('link', {name: 'Delete', exact: true}).click();
            out.deleteD3 = await confirm('OK', /delete-issue|deleteIssue/);
            out.afterD3 = {issues: dbIssues(D), current: dbCurrent(D), C: dbPub(S.subs.C.id),
                files: psql(`select issue_id, file_id, file_name from issue_files where issue_id in (select issue_id from issues where journal_id=${D.id})`), disk: diskRead()};
            back = await gotoIssues(D.path, 'Back Issues');
            out.backAfterD3 = await readGrid(back);
            await snap('d-back-after-d3', {grid: out.backAfterD3});
            out.currentAfterD3 = await visit(u(D.path, '/issue/current'), 'd-current-after-d3');
            out.pageC = await visit(u(D.path, `/article/view/${S.subs.C.id}`), 'd-article-c-after');
            out.wfC = await wfReadout(D.path, S.subs.C, 'd-wf-c');
            out.logC = await activityLog(D.path, S.subs.C, 'd-log-c');
            // D4 (unpublished, S scheduled into it)
            out.wfSBefore = await wfReadout(D.path, S.subs.S, 'd-wf-s-before');
            let fut = await gotoIssues(D.path, 'Future Issues');
            ra = await rowActions(fut, d4);
            await ra.ctl.getByRole('link', {name: 'Delete', exact: true}).click();
            out.deleteD4 = await confirm('OK', /delete-issue|deleteIssue/);
            out.afterD4 = {issues: dbIssues(D), current: dbCurrent(D), S: dbPub(S.subs.S.id)};
            out.wfS = await wfReadout(D.path, S.subs.S, 'd-wf-s-after');
            // D1 (not current), then D2 (current, the last)
            back = await gotoIssues(D.path, 'Back Issues');
            ra = await rowActions(back, d1);
            await ra.ctl.getByRole('link', {name: 'Delete', exact: true}).click();
            out.deleteD1 = await confirm('OK', /delete-issue|deleteIssue/);
            out.afterD1 = {current: dbCurrent(D), issues: dbIssues(D)};
            back = await gotoIssues(D.path, 'Back Issues');
            ra = await rowActions(back, d2);
            await ra.ctl.getByRole('link', {name: 'Delete', exact: true}).click();
            out.deleteD2 = await confirm('OK', /delete-issue|deleteIssue/);
            out.afterD2 = {current: dbCurrent(D), issues: dbIssues(D)};
            out.backEmpty = await readGrid(await gotoIssues(D.path, 'Back Issues'));
            await snap('d-back-empty', {grid: out.backEmpty});
            out.currentNone = await visit(u(D.path, '/issue/current'), 'd-current-none');
            out.jobs = drain();
            out.mails = {before: mails0, after: await mailCounts([D.mg, D.au])};
            S.delDone = true; save();
            fact('del', out);
        });

        // ============================================================ Rule 19 on P3 (not current; E published through the workflow, A released by the issue)
        if (on('del2') && !S.del2Done) await sect('del2', async () => {
            const out = {};
            const U = P.u;
            const p3 = issueName(2, 1, 2026);
            await as(U.mg, P.path);
            out.before = {current: dbCurrent(P), A: dbPub(S.subs.A.id), E: dbPub(S.subs.E.id), stage: psql(`select submission_id, stage_id, status from submissions where submission_id in (${S.subs.A.id},${S.subs.E.id})`)};
            const back = await gotoIssues(P.path, 'Back Issues');
            const ra = await rowActions(back, p3);
            await ra.ctl.getByRole('link', {name: 'Delete', exact: true}).click();
            out.del = await confirm('OK', /delete-issue|deleteIssue/);
            out.after = {current: dbCurrent(P), A: dbPub(S.subs.A.id), E: dbPub(S.subs.E.id), stage: psql(`select submission_id, stage_id, status from submissions where submission_id in (${S.subs.A.id},${S.subs.E.id})`)};
            out.wfE = await wfReadout(P.path, S.subs.E, 'd2-wf-e');
            out.logE = (await activityLog(P.path, S.subs.E, 'd2-log-e')).slice(0, 5);
            out.pageE = await visit(u(P.path, `/article/view/${S.subs.E.id}`), 'd2-article-e');
            out.current = await visit(u(P.path, '/issue/current'), 'd2-current');
            S.del2Done = true; save();
            fact('del2', out);
        });

        // ============================================================ Rule 20 (O), then Rule 19 after a custom order
        if (on('order') && !S.orderDone) await sect('order', async () => {
            const O = S.O;
            const out = {};
            const o1 = issueName(1, 1, 2024), o2 = issueName(2, 1, 2025), o3 = issueName(3, 1, 2026), o4 = issueName(4, 1, 2023);
            await as(O.mg, O.path);
            for (const n of [o1, o2, o3]) out[`pub-${n}`] = (await publishRow(O.path, n, {email: false})).res.status;
            let back = await gotoIssues(O.path, 'Back Issues');
            out.backAfterThree = await readGrid(back);
            let ra = await rowActions(back, o2);
            await ra.ctl.getByRole('link', {name: 'Current Issue', exact: true}).click();
            await confirm('OK', /set-current-issue|setCurrentIssue/);
            back = await gotoIssues(O.path, 'Back Issues');
            out.backDefault = await readGrid(back);
            await snap('o-back-default', {grid: out.backDefault});
            out.archiveDefault = await visit(u(O.path, '/issue/archive'), 'o-archive-default');
            out.db0 = {issues: dbIssues(O), current: dbCurrent(O), orders: psql(`select issue_id, seq from custom_issue_orders where journal_id=${O.id} order by seq`)};
            // Order: Cancel ordering first, then o1 dragged to the top, Done
            const orderLink = back.locator('.pkp_linkaction_orderItems').first();
            out.orderOffered = await orderLink.count();
            await orderLink.click(); await sleep(600);
            out.orderingControls = (await back.locator('.order_finish_controls a, .order_finish_controls button').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
            await snap('o-ordering-mode', {controls: out.orderingControls});
            await dragRowAbove(back, o1, o2);
            out.afterDragCancel = await readGrid(back);
            await back.locator('.order_finish_controls .cancelFormButton').first().click(); await idle(page); await sleep(800);
            out.afterCancel = await readGrid(back);
            await orderLink.click(); await sleep(600);
            await dragRowAbove(back, o1, o2);
            out.afterDrag = await readGrid(back);
            const w = page.waitForResponse((r) => /save-sequence|saveSequence/.test(r.url()), {timeout: T}).catch(() => null);
            await back.locator('.order_finish_controls .saveButton').first().click();
            out.done = (await w)?.status() ?? null;
            await idle(page); await sleep(800);
            back = await gotoIssues(O.path, 'Back Issues');
            out.backCustom = await readGrid(back);
            await snap('o-back-custom', {grid: out.backCustom});
            out.archiveCustom = await visit(u(O.path, '/issue/archive'), 'o-archive-custom');
            out.db1 = psql(`select issue_id, seq from custom_issue_orders where journal_id=${O.id} order by seq`);
            // a fourth issue published later
            out.pubO4 = (await publishRow(O.path, o4, {email: false})).res.status;
            back = await gotoIssues(O.path, 'Back Issues');
            out.backAfterFourth = await readGrid(back);
            await snap('o-back-after-fourth', {grid: out.backAfterFourth});
            out.archiveAfterFourth = await visit(u(O.path, '/issue/archive'), 'o-archive-after-fourth');
            out.db2 = {current: dbCurrent(O), orders: psql(`select issue_id, seq from custom_issue_orders where journal_id=${O.id} order by seq`)};
            // Rule 19 after a custom order: delete the current issue (o4)
            ra = await rowActions(back, o4);
            await ra.ctl.getByRole('link', {name: 'Delete', exact: true}).click();
            out.deleteO4 = await confirm('OK', /delete-issue|deleteIssue/);
            out.db3 = {current: dbCurrent(O), issues: dbIssues(O), orders: psql(`select issue_id, seq from custom_issue_orders where journal_id=${O.id} order by seq`)};
            out.backAfterDelete = await readGrid(await gotoIssues(O.path, 'Back Issues'));
            await snap('o-back-after-delete', {grid: out.backAfterDelete});
            out.currentAfterDelete = await visit(u(O.path, '/issue/current'), 'o-current-after-delete');
            S.orderDone = true; save();
            fact('order', out);
        });

        // ============================================================ Settings 8, Identifiers side effect (I; P as the default)
        if (on('ids') && !S.idsDone) await sect('ids', async () => {
            const I = S.I;
            const out = {};
            const i1 = issueName(1, 1, 2026);
            // the default journal (P): no Identifiers tab, no Publisher ID box
            await as(P.u.mg, P.path);
            let dlg = await issueWindow(P.path, issueName(1, 2, 2025), 'Back Issues');
            out.defaultTabs = (await dlg.getByRole('tab').allInnerTexts()).map((x) => flat(x, 40));
            let tp = await windowTab(dlg, 'Issue Galleys');
            out.defaultGalleyHeads = (await readGrid(tp)).heads;
            await tp.getByRole('link', {name: 'Create Issue Galley', exact: true}).click();
            await galleyWin().waitFor({timeout: T}); await idle(page);
            out.defaultGalleyWindow = await galleyWindowRead();
            await snap('i-default-galley-window', {read: out.defaultGalleyWindow});
            await closeGalleyWin();
            // Settings › Distribution tabs (where the switches are)
            await page.goto(u(P.path, '/management/settings/distribution')); await idle(page);
            out.distributionTabs = (await page.getByRole('tab').allInnerTexts()).map((x) => flat(x, 40));
            await snap('i-distribution-default');
            // I: publisher IDs and URN on
            await as(I.mg, I.path);
            // DOIs: tick "Issues" and give a prefix on Settings › Distribution › DOIs
            await page.goto(u(I.path, '/management/settings/distribution')); await idle(page);
            await page.getByRole('tab', {name: 'DOIs', exact: true}).first().click(); await idle(page); await sleep(800);
            const doiPanel = page.getByRole('tabpanel', {name: 'DOIs'});
            await snap('i-dois-tab');
            const issuesBox = doiPanel.getByRole('checkbox', {name: 'Issues', exact: true});
            out.doiIssuesBox = await issuesBox.count();
            if (out.doiIssuesBox) await issuesBox.check();
            await doiPanel.locator('input[name="doiPrefix"]').fill('10.1234');
            const w = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await doiPanel.getByRole('button', {name: 'Save', exact: true}).first().click();
            out.doiSave = (await w)?.status() ?? null;
            await idle(page);
            await page.getByRole('tab', {name: 'Identifiers', exact: true}).first().click().catch(() => {}); await idle(page);
            await snap('i-identifiers-tab');
            dlg = await issueWindow(I.path, i1, 'Future Issues');
            out.tabs = (await dlg.getByRole('tab').allInnerTexts()).map((x) => flat(x, 40));
            const idTab = await windowTab(dlg, 'Identifiers').catch(() => null);
            if (idTab) out.identifiersTab = flat((await snap('i-identifiers-window-tab')).text?.dialog, 800);
            tp = await windowTab(dlg, 'Issue Galleys');
            out.galleyHeads = (await readGrid(tp)).heads;
            const ra = await rowActions(tp, 'PDF');
            await ra.ctl.getByRole('link', {name: 'Edit', exact: true}).click();
            await galleyWin().waitFor({timeout: T}); await idle(page);
            out.galleyWindow = await galleyWindowRead();
            await snap('i-galley-window', {read: out.galleyWindow});
            await closeGalleyWin();
            out.publish = await publishRow(I.path, i1, {email: false, snapName: 'i-publish-window'});
            out.db = {issue: psql(`select i.issue_id, i.doi_id, (select string_agg(setting_name||'='||setting_value, ', ') from issue_settings s where s.issue_id=i.issue_id and setting_name like 'pub-id%') from issues i where journal_id=${I.id}`),
                doi: psql(`select d.doi_id, d.doi, d.status from dois d join issues i on i.doi_id=d.doi_id where i.journal_id=${I.id}`)};
            dlg = await issueWindow(I.path, i1, 'Back Issues');
            if (await dlg.getByRole('tab', {name: 'Identifiers', exact: true}).count()) { await windowTab(dlg, 'Identifiers'); out.identifiersAfter = flat((await snap('i-identifiers-after')).text?.dialog, 800); }
            await page.goto(u(I.path, '/dois')); await idle(page); await sleep(1000);
            const tabs = (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
            out.doiPageTabs = tabs;
            const it = page.getByRole('tab', {name: 'Issues', exact: true});
            if (await it.count()) { await it.first().click(); await idle(page); await sleep(1500); }
            out.doiPage = flat((await snap('i-doi-page-issues')).text?.main, 800);
            out.issuePage = await visit(u(I.path, `/issue/view/${I.issues[0].id}`), 'i-issue-page');
            // P (DOIs for issues off): its published P3 has no DOI
            out.pIssueDois = psql(`select issue_id, doi_id from issues where journal_id=${P.id} order by 1`);
            S.idsDone = true; save();
            fact('ids', out);
        });

        // ============================================================ Statistics (I)
        if (on('stats')) await sect('stats', async () => {
            const I = S.I;
            const out = {};
            const iid = I.issues[0].id;
            out.issuePage = await visit(u(I.path, `/issue/view/${iid}`), 's-issue-page');
            const link = vis.page.locator('a.obj_galley_link').first();
            out.fullIssueLink = await link.count() ? {text: flat(await link.innerText(), 60), href: (await link.getAttribute('href')).replace(/^.*index\.php/, '')} : null;
            if (out.fullIssueLink) {
                await link.click(); await idle(vis.page); await sleep(1000);
                out.viewer = {url: vis.page.url().replace(/^.*index\.php/, ''), title: await vis.page.title()};
                await snap('s-full-issue', {}, vis.page);
                const dl = vis.page.getByRole('link', {name: /Download/}).first();
                if (await dl.count()) {
                    const dw = vis.page.waitForEvent('download', {timeout: 15000}).catch(() => null);
                    await dl.click().catch(() => {});
                    const d = await dw;
                    out.download = d ? d.suggestedFilename() : null;
                }
            }
            await sleep(1500);
            try {
                const logDir = path.join(filesDir(), 'usageStats', 'usageEventLogs');
                const files = fs.readdirSync(logDir).sort();
                const lines = fs.readFileSync(path.join(logDir, files[files.length - 1]), 'utf8').split('\n').filter((l) => l.includes(I.path));
                out.usageLog = {file: files[files.length - 1], lines: lines.length, sample: lines.slice(-6).map((l) => { try { const o = JSON.parse(l); return {assocType: o.assocType, issueId: o.issueId, issueGalleyId: o.issueGalleyId, canonicalUrl: (o.canonicalUrl || '').replace(/^.*index\.php/, '')}; } catch (e) { return flat(l, 200); } })};
            } catch (e) { out.usageLog = `error ${flat(e.message, 200)}`; }
            await as(I.mg, I.path);
            await page.goto(u(I.path, '/stats/issues')); await idle(page); await sleep(2000);
            out.statsPage = flat((await snap('s-stats-issues')).text?.main, 1200);
            out.metrics = psql(`select count(*) from metrics_issue where context_id=${I.id}`);
            fact('stats', out);
        });

        // ============================================================ Side effects' other end: a journal that does not publish online (N);
        // the "Issue Published Notify" template on Settings › Workflow › "Emails"
        if (on('none') && !S.noneDone) await sect('none', async () => {
            const out = {};
            if (!S.N) {
                const N = await app.api.createContext({tag: `${S.t}n`, context: {name: `U50 K2 N ${S.t}`}, publishingMode: 'none',
                    users: [{username: `${S.t}nmg`, roles: ['manager']}, {username: `${S.t}nrd`, roles: ['reader']}], issues: [{volume: 1, number: 1, year: 2026}]});
                S.N = {path: N.path, id: N.contextId, mg: `${S.t}nmg`, rd: `${S.t}nrd`}; save();
            }
            const N = S.N;
            await as(N.mg, N.path);
            out.publish = await publishRow(N.path, issueName(1, 1, 2026), {email: true, snapName: 'n-publish-window'});
            out.jobs = drain();
            out.mails = await mailCounts([N.mg, N.rd]);
            out.notifications = psql(`select u.username, count(*) from notifications n join users u on u.user_id=n.user_id where n.context_id=${N.id} and n.type=${NOTIF_ISSUE} group by 1`);
            // the template
            await page.goto(u(N.path, '/management/settings/manageEmails')); await idle(page); await sleep(1000);
            const sb = page.getByRole('searchbox', {name: 'Search by name or description'});
            await sb.fill('Issue Published'); await sb.press('Enter'); await idle(page); await sleep(1200);
            const s1 = await snap('n-emails-search');
            out.emailsList = (await page.locator('.listPanel__item').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
            const edit = page.getByRole('button', {name: /^Edit Issue Published Notify/}).first();
            out.editButton = await edit.count();
            if (out.editButton) {
                await edit.click(); await idle(page); await sleep(1500);
                const s2 = await snap('n-mailable-window');
                out.mailable = flat(s2.text?.dialog, 1200);
                const tEdit = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^Edit/}).first();
                if (await tEdit.count()) {
                    await tEdit.click(); await idle(page); await sleep(1500);
                    const s3 = await snap('n-template-window');
                    out.template = flat(s3.text?.dialog, 600);
                    out.subject = await page.locator('[role="dialog"]:visible').last().locator('input[name^="subject"]').first().inputValue().catch(() => null);
                }
            }
            out.searchText = flat(s1.text?.main, 400);
            S.noneDone = true; save();
            fact('none', out);
        });

        if (on('ctl')) await sect('ctl', controls);
    } finally {
        record('k2-dialogs', {dialogs});
        await vis.close().catch(() => {});
        await close();
    }
});
