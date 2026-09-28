// U50 claim check, housekeeping chunk I28 (2026-09-28): incidentals row L119 of
// docs/tracking/incidentals.md (.reports/hk28/chunks/U50.md), found by U18 claim check K1 (K1-13).
// Spec: docs/specs/U50-issues.md — Rule 23 ("Which articles a published issue lists"), Rule 9 (the
// editors' "Table of Contents" tab and the "Items" column), footnote w.
//
// {OJS} only (the app with issues). Seeds its own scratch journal per run, signs in as its throwaway
// manager, reads the public pages signed out, and records every screen with screen().
//   J  sections "Articles" (ART) and "Second Section" (SEC); issue Vol. 1 No. 1 (2024) published (current);
//      the web feed plugin on. Articles published into the issue:
//        A (ART)  v2 created on screen, retitled, published with "Don't Assign To An Issue"   <- the row
//        B (SEC)  v2 created on screen, retitled, published keeping its issue choice           <- the other end
//        C (ART)  untouched (order and control)
//        D (ART)  published at once with no issue: the feeds' mode control (they are set to the current issue)
// Phases (one process, in order): before · v2 (versions created, retitled; A's Title & Abstract left once
// with an unsaved change) · control (public reads with the v2s unpublished) · publish · after (public reads:
// TOC, A's link and landing page, v1's version page, the three current-issue feeds, Archives, home) ·
// backend (Issues › Back Issues "Items", the issue window's "Table of Contents" tab) · remove (the tab's "Remove" on
// A, then the tab, "Items", A's workflow, the public TOC, A's pages and the feeds).
// Run twice, each under its own facts name, fresh scratch journal per RUN:
//   RUN=r1 PROBE_FEATURE=U50 PROBE_AGENT=ccI28 node bin/probe.js ojs shared/playwright/checks/U50/I28/i28.js
//   RUN=r2 …   (r1 and r2 of 2026-09-28 ran before the feed setting and D were added: their feeds read the recent list)
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 600) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const log = (...a) => console.log(`[i28 ${RUN}]`, ...a);
const N = (name) => `${RUN}-${name}`;
const vis = '[role="dialog"]:visible';

forEachApp(async (app) => {
    if (app.name !== 'ojs') { log(`${app.name}: no issues in this app, nothing to drive`); return; }
    const sf = path.join(outDir(), `i28-state-${RUN}-${app.name}.json`);
    const S = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i28-facts-${RUN}`, {[k]: v}, {merge: true}); log(`[${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const sql = (q) => {
        try { return execFileSync('psql', ['-d', app.db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); } catch (e) { return `SQL ERROR ${flat(e.stderr, 300)}`; }
    };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const strip = (u) => (u || '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '');
    const wfUrl = (ctx, id, key) => cu(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    // ------------------------------------------------------------------ seed
    if (!S.seeded) {
        const t = tag('u50i28');
        const p = `${t}${RUN}`.slice(0, 30);
        const c = await app.api.createContext({
            tag: p,
            users: [
                {username: `${p}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
                {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            ],
            context: {name: `I28 Issues ${p}`, acronym: 'JI28', contactName: 'Pat Principal', contactEmail: `${p}pc@mail.test`},
            sections: [{abbrev: 'ART', title: {en: 'Articles'}}, {abbrev: 'SEC', title: {en: 'Second Section'}}],
            issues: [{volume: 1, number: 1, year: 2024, published: true}],
            // the feeds in "Display items in current published issue." (a new journal arrives on the recent list, U18 A5)
            plugins: {webfeedplugin: {enabled: true, settings: {displayItems: 'issue'}}},
        });
        S.t = p; S.path = c.path; S.mg = `${p}mg`; S.issues = c.issues || null;
        S.issueId = c.issues && c.issues[0] && c.issues[0].id;
        S.subs = {};
        const issue = {volume: 1, number: 1, year: 2024};
        for (const [k, section, date] of [['A', 'ART', '2024-03-01'], ['B', 'SEC', '2024-03-02'], ['C', 'ART', '2024-03-03']]) {
            const r = await app.api.createSubmission({tag: `${p}${k}`, context: S.path, submitter: `${p}au`, title: `${k} v1 article ${p}`,
                published: true, section, issue, datePublished: date});
            S.subs[k] = {id: r.submissionId, v1: r.publicationId, title1: `${k} v1 article ${p}`, title2: `${k} v2 article ${p}`};
        }
        // D: published at once with no issue, the control that the feeds read the current issue, not the recent list
        const d = await app.api.createSubmission({tag: `${p}D`, context: S.path, submitter: `${p}au`, title: `D noissue article ${p}`, published: true, section: 'ART', datePublished: '2024-03-04'});
        S.noIssue = {id: d.submissionId, v1: d.publicationId};
        S.seeded = true; save();
        fact('seed', S);
        note(`ccI28 ${RUN}: scratch journal ${S.path} (issue ${S.issueId}), A/B/C = ${Object.values(S.subs).map((s) => s.id).join('/')}`);
    }
    const {page, close} = await launch(app);
    const jsDialogs = [];
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300)});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const net = [];
    page.on('response', (r) => { const u = r.url(); if (/\/api\/|\/gateway\/|\/issue\/|\/article\//.test(u)) net.push({at: Date.now(), m: r.request().method(), u: strip(u).slice(0, 180), s: r.status()}); });
    const netSince = (t0) => net.filter((x) => x.at >= t0).map(({at, ...x}) => x);
    const dialogsSince = (t0) => jsDialogs.filter((x) => x.at >= t0).map(({at, ...x}) => x);

    async function snap(name, extra = {}, {png = false} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        Object.assign(s, extra);
        record(N(name), s);
        if (png) await shot(page, N(name)).catch(() => {});
        return s;
    }
    async function step(name, fn) {
        const o = {};
        try { await fn(o); } catch (e) {
            o.FAILED = flat(e.stack || e.message, 700);
            log(`[${name} FAILED]`, o.FAILED);
            await snap(`zz-failed-${name}`, {}, {png: true}).catch(() => {});
        }
        fact(name, o);
        return o;
    }
    const go = async (url) => { const r = await page.goto(url).catch((e) => ({err: flat(e.message, 200)})); await idle(page).catch(() => {}); return r && typeof r.status === 'function' ? r.status() : r; };
    const asMg = async () => { await signIn(page, S.mg, {contextPath: S.path}); await idle(page); };
    const visitor = async () => { await signOut(page).catch(() => {}); await idle(page).catch(() => {}); };
    const wf = () => page.locator(vis).first();
    const dbPubs = (sid) => sql(`select publication_id, status, version_stage, version_major, version_minor, issue_id, section_id, date_published, seq from publications where submission_id=${sid} order by publication_id`).split('\n');
    const dbCurrent = (sid) => sql(`select current_publication_id from submissions where submission_id=${sid}`);

    // ------------------------------------------------------------------ public reads
    async function readToc(name) {
        const t0 = Date.now();
        const st = await go(cu(S.path, `/issue/view/${S.issueId}`));
        const s = await snap(name, {}, {png: true});
        const toc = await page.evaluate(() => {
            const f = (x) => (x || '').replace(/\s+/g, ' ').trim();
            const secs = [...document.querySelectorAll('.obj_issue_toc .sections .section')];
            const art = (a) => ({title: f(a.querySelector('.title')?.innerText), href: a.querySelector('.title a')?.getAttribute('href') || null,
                meta: f(a.querySelector('.meta')?.innerText), galleys: [...a.querySelectorAll('.galleys_links a')].map((g) => f(g.innerText))});
            return {heading: f(document.querySelector('h1')?.innerText), breadcrumb: f(document.querySelector('.cmp_breadcrumbs')?.innerText),
                published: f(document.querySelector('.obj_issue_toc .published')?.innerText),
                sections: secs.map((sec) => ({heading: f(sec.querySelector('h2')?.innerText) || null, articles: [...sec.querySelectorAll('.obj_article_summary')].map(art)})),
                allSummaries: [...document.querySelectorAll('.obj_article_summary')].map(art)};
        }).catch((e) => ({error: flat(e.message, 200)}));
        return {status: st, title: s.title, toc, traffic: netSince(t0).filter((x) => x.s >= 400)};
    }
    function feedItems(type, body) {
        if (!body) return null;
        const tagName = type === 'atom' ? 'entry' : 'item';
        const items = [...body.matchAll(new RegExp(`<${tagName}[\\s>][\\s\\S]*?</${tagName}>`, 'g'))].map((m) => {
            const x = m[0];
            const title = (x.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || null;
            const link = type === 'atom' ? ((x.match(/<link[^>]*href="([^"]+)"/) || [])[1] || null) : ((x.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || null);
            const id = (x.match(/<id>([\s\S]*?)<\/id>/) || [])[1] || null;
            return {title: title && flat(title.replace(/<!\[CDATA\[|\]\]>/g, ''), 200), link: strip(link), id: strip(id)};
        });
        const chan = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || null;
        return {channelTitle: chan && flat(chan.replace(/<!\[CDATA\[|\]\]>/g, ''), 200), items};
    }
    async function readFeeds(name) {
        const out = {};
        for (const type of ['atom', 'rss2', 'rss']) {
            const url = cu(S.path, `/gateway/plugin/WebFeedGatewayPlugin/${type}`);
            let resp = null, err = null, body = null, download = null;
            const dlP = page.waitForEvent('download', {timeout: 10_000}).catch(() => null);
            try { resp = await page.goto(url); } catch (e) { err = flat(e.message, 200); }
            if (resp) body = await resp.text().catch(() => null);
            else if (/Download is starting/.test(err || '')) {
                const dl = await dlP;
                download = dl ? dl.suggestedFilename() : null;
                try { body = dl ? fs.readFileSync(await dl.path(), 'utf8') : null; } catch { /* none */ }
            }
            out[type] = {status: resp ? resp.status() : null, err, download, contentType: resp ? resp.headers()['content-type'] : null, ...feedItems(type, body)};
            if (type === 'atom') await snap(`${name}-atom`, {feed: out[type]});
        }
        return out;
    }
    async function readLanding(url, name) {
        const st = await go(url);
        const s = await snap(name, {}, {png: true});
        const d = await page.evaluate(() => {
            const f = (x) => (x || '').replace(/\s+/g, ' ').trim();
            const items = [...document.querySelectorAll('.obj_article_details .item')].map((it) => ({cls: it.className, text: f(it.innerText).slice(0, 300),
                links: [...it.querySelectorAll('a')].map((a) => `${f(a.innerText).slice(0, 80)} -> ${a.getAttribute('href')}`).slice(0, 6)}));
            return {h1: f(document.querySelector('h1')?.innerText), breadcrumb: f(document.querySelector('.cmp_breadcrumbs')?.innerText),
                breadcrumbLinks: [...document.querySelectorAll('.cmp_breadcrumbs a')].map((a) => `${f(a.innerText)} -> ${a.getAttribute('href')}`),
                notice: f(document.querySelector('.cmp_notification')?.innerText) || null,
                items: items.filter((i) => /issue|versions|published|section/.test(i.cls))};
        }).catch((e) => ({error: flat(e.message, 200)}));
        return {status: st, url: strip(page.url()), title: s.title, ...d};
    }
    const pick = (feeds) => Object.fromEntries(Object.entries(feeds).map(([k, v]) => [k, {status: v.status, download: v.download, titles: (v.items || []).map((i) => i.title), links: (v.items || []).map((i) => i.link)}]));
    async function publicRead(label, {landing = false} = {}) {
        await visitor();
        const o = {};
        o.toc = await readToc(`${label}-toc`);
        await page.reload(); await idle(page);
        o.tocReloadTitles = await page.locator('.obj_article_summary .title').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
        o.feeds = pick(await readFeeds(`${label}-feed`));
        if (landing) {
            const a = (o.toc.toc.allSummaries || []).find((x) => x.href && new RegExp(`/article/view/${S.subs.A.id}(\\b|$)`).test(x.href));
            o.aTocHref = a ? a.href : null;
            o.aTocTitle = a ? a.title : null;
            if (a) {
                // A's link as a reader follows it, by click on the table of contents
                await go(cu(S.path, `/issue/view/${S.issueId}`));
                const link = page.locator(`.obj_article_summary .title a[href="${a.href}"]`).first();
                await loc(page, 'issue TOC: article title link', link);
                await Promise.all([page.waitForNavigation({timeout: T}).catch(() => null), link.click()]);
                await idle(page);
                o.aLanding = await readLanding(page.url(), `${label}-A-landing`);
            }
            o.aV1Page = await readLanding(cu(S.path, `/article/view/${S.subs.A.id}/version/${S.subs.A.v1}`), `${label}-A-v1-version-page`);
            if (S.subs.A.v2) o.aV2Page = await readLanding(cu(S.path, `/article/view/${S.subs.A.id}/version/${S.subs.A.v2}`), `${label}-A-v2-version-page`);
            o.bLanding = await readLanding(cu(S.path, `/article/view/${S.subs.B.id}`), `${label}-B-landing`);
            await go(cu(S.path, '/issue/archive'));
            const ar = await snap(`${label}-archive`);
            o.archive = flat(ar.text && (ar.text.main || ar.text.body), 600);
            await go(cu(S.path));
            const hm = await snap(`${label}-home`, {}, {png: true});
            o.homeCurrentIssue = await page.locator('.current_issue').innerText().then((x) => flat(x, 900)).catch(() => flat(hm.text && hm.text.body, 900));
            await go(cu(S.path, '/issue/current'));
            await snap(`${label}-issue-current`);
            o.issueCurrentTitles = await page.locator('.obj_article_summary .title').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
        }
        return o;
    }

    // ------------------------------------------------------------------ workflow helpers
    async function openWf(key, sid, name) {
        await go(wfUrl(S.path, sid, key));
        await wf().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(1200);
        if (name) await snap(name);
    }
    async function titleEditorId() {
        const iframe = page.locator('iframe[id^="titleAbstract-title-control-en"]').first();
        await iframe.waitFor({state: 'attached', timeout: T});
        const id = (await iframe.getAttribute('id')).replace(/_ifr$/, '');
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
        await sleep(600);
        return id;
    }
    const readTitle = async (id) => page.evaluate((i) => window.tinymce.get(i)?.getContent(), id).catch(() => null);
    async function typeTitle(text) {
        const id = await titleEditorId();
        await page.frameLocator(`#${id}_ifr`).locator('body').click();
        await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Delete');
        await page.keyboard.type(text); await sleep(400);
        return {id, typed: await readTitle(id)};
    }
    async function pressSave() {
        const t0 = Date.now();
        const w = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
        await wf().getByRole('button', {name: 'Save', exact: true}).last().click();
        const r = await w;
        await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 6000}).catch(() => {});
        await sleep(400);
        return {status: r ? r.status() : null, writes: netSince(t0), errors: await page.locator('.pkpFieldError:visible').allInnerTexts().catch(() => [])};
    }
    async function createNewVersion(name) {
        const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
        await link.waitFor({state: 'visible', timeout: T});
        await sleep(1000);
        await link.click();
        const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
        await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
        await idle(page); await sleep(800);
        const sels = await w.locator('select').evaluateAll((els) => els.map((s) => ({name: s.name, value: s.value, chosen: s.selectedOptions[0]?.innerText.trim() || null})));
        for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
            const el = w.locator(sel);
            if ((await el.count()) && !(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {});
        }
        await snap(name, {selects: sels});
        const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: 'Confirm', exact: true}).click();
        const resp = await r;
        let newPub = null; if (resp) { try { newPub = (await resp.json()).id; } catch { /* none */ } }
        await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page);
        return {status: resp && resp.status(), newPub, selectsAsArrived: sels};
    }
    async function readAssign(scope) {
        return scope.evaluate((el) => {
            const radios = [...el.querySelectorAll('input[name="assignment"]')].map((r) => ({value: r.value, checked: r.checked, label: (r.closest('label')?.innerText || r.parentElement?.innerText || '').replace(/\s+/g, ' ').trim()}));
            const sel = el.querySelector('select[name="issueId"]');
            return {radios, issue: sel ? {visible: !!sel.getClientRects().length, value: sel.value, chosen: sel.selectedOptions[0]?.innerText.trim() || null} : null};
        }).catch((e) => ({error: flat(e.message, 200)}));
    }
    const panelLoc = () => page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
    const windowLoc = () => page.getByRole('dialog').filter({hasText: /Are you sure you want to publish|requirements/}).last();
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    async function pressPublish() {
        const button = controls().getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
        await button.waitFor({timeout: T});
        const label = flat(await button.innerText(), 60);
        await sleep(800);
        await button.click();
        const stage = panelLoc().locator('select[name="versionStage"]');
        const any = stage.or(windowLoc()).first();
        let ok = await any.waitFor({state: 'visible', timeout: 8000}).then(() => true).catch(() => false);
        let retried = false;
        if (!ok) { retried = true; await button.click().catch(() => {}); ok = await any.waitFor({state: 'visible', timeout: T}).then(() => true).catch(() => false); }
        await idle(page); await sleep(1000);
        const opened = (await stage.isVisible().catch(() => false)) ? 'panel' : (await windowLoc().isVisible().catch(() => false)) ? 'window' : 'none';
        return {label, opened, retried};
    }
    const windowText = async () => flat(await windowLoc().innerText().catch(() => null), 900);
    async function confirmWindowPublish() {
        const w = windowLoc();
        const t0 = Date.now();
        const resp = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: 'Publish', exact: true}).last().click();
        const r = await resp;
        await controls().getByRole('button', {name: 'Unpublish'}).waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(800);
        return {status: r ? r.status() : null, writes: netSince(t0), controls: await controls().getByRole('button').allInnerTexts().catch(() => [])};
    }
    /** Publish the shown version: `choice` a radio name to pick in the panel, or null to keep the panel's preselection. */
    async function publishVersion(k, choice, name) {
        const o = {};
        o.press = await pressPublish();
        if (o.press.opened === 'panel') {
            const p = panelLoc();
            await p.locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: 8000}).catch(() => {});
            await sleep(800);
            o.panelArrive = await readAssign(p);
            o.panelText = flat(await p.innerText().catch(() => null), 1200);
            await snap(`${name}-01-panel`, {panel: o.panelArrive}, {png: true});
            if (k === 'A') await loc(page, 'Review Publishing Details: "Don\'t Assign To An Issue" radio', p.getByRole('radio', {name: "Don't Assign To An Issue"}));
            if (choice) await p.getByRole('radio', {name: choice}).check();
            for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
                const el = p.locator(sel);
                if ((await el.count()) && !(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {});
            }
            o.panelChosen = await readAssign(p);
            await p.getByRole('button', {name: 'Confirm', exact: true}).click();
            await windowLoc().waitFor({timeout: 20000}).catch(() => {});
            await idle(page); await sleep(800);
        } else if (o.press.opened === 'window' && choice) {
            // straight to the window: the choice goes through Publication Settings first
            o.windowDirect = await windowText();
            await snap(`${name}-01-window-direct`, {}, {png: true});
            await windowLoc().getByRole('button', {name: 'Cancel', exact: true}).last().click().catch(() => {});
            await sleep(1500);
            await openWf(`publication_${S.subs[k].v2}_issue`, S.subs[k].id, `${name}-02-settings`);
            const d = wf();
            await d.locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: T});
            o.settingsArrive = await readAssign(d);
            await d.getByRole('radio', {name: choice}).check();
            o.settingsSave = await pressSave();
            o.settingsAfter = await readAssign(d);
            await snap(`${name}-03-settings-saved`, {save: o.settingsSave});
            o.press2 = await pressPublish();
        }
        o.window = await windowText();
        await snap(`${name}-04-window`, {}, {png: true});
        o.publish = await confirmWindowPublish();
        o.db = dbPubs(S.subs[k].id);
        o.current = dbCurrent(S.subs[k].id);
        await snap(`${name}-05-published`, {publish: o.publish}, {png: true});
        return o;
    }

    async function issueWindowToc() {
        await go(cu(S.path, '/manageIssues'));
        await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page);
        const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
        await panel.locator('table').first().waitFor({timeout: T});
        await idle(page); await sleep(500);
        await panel.getByRole('link', {name: 'Vol. 1 No. 1 (2024)', exact: true}).first().click();
        const dlg = page.getByRole('dialog', {name: /^Issue Management/});
        await dlg.waitFor({timeout: T}); await idle(page); await sleep(500);
        await dlg.getByRole('tab', {name: 'Table of Contents', exact: true}).click(); await idle(page);
        await dlg.getByRole('tabpanel', {name: 'Table of Contents'}).locator('table').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(800);
        return dlg;
    }
    const readTocTab = (dlg) => dlg.getByRole('tabpanel', {name: 'Table of Contents'}).locator('tbody tr').evaluateAll((trs) => trs.filter((tr) => tr.getClientRects().length && !tr.classList.contains('row_controls')).map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch((e) => [`err ${String(e.message).slice(0, 100)}`]);

    try {
        // ============================================================ before (nothing changed)
        if (!S.before) {
            await step('before', async (o) => { Object.assign(o, await publicRead('01-before')); o.db = Object.fromEntries(Object.entries(S.subs).map(([k, s]) => [k, dbPubs(s.id)])); });
            S.before = true; save();
        }
        // ============================================================ v2 (A and B): created, retitled, saved; A's page left once unsaved
        if (!S.v2done) {
            await step('v2', async (o) => {
                await asMg();
                for (const k of ['A', 'B']) {
                    const s = S.subs[k];
                    await openWf(`publication_${s.v1}_titleAbstract`, s.id, `02-${k}-v1-title-abstract`);
                    o[k] = {create: await createNewVersion(`02-${k}-new-version-window`)};
                    s.v2 = o[k].create.newPub; save();
                    await openWf(`publication_${s.v2}_titleAbstract`, s.id, `02-${k}-v2-title-abstract`);
                    await wf().getByRole('button', {name: 'Save', exact: true}).last().waitFor({timeout: T}).catch(() => {});
                    if (k === 'A') {
                        // left once with an unsaved change: another entry of the same version, then back
                        const t0 = Date.now();
                        o.A.unsavedTyped = await typeTitle(`A unsaved title ${S.t}`);
                        await wf().getByRole('link', {name: 'Contributors', exact: true}).last().click();
                        await idle(page); await sleep(1200);
                        o.A.leave = {dialogs: dialogsSince(t0), url: strip(page.url()), dialogsVisible: await page.locator(vis).count()};
                        await snap('02-A-v2-left-unsaved-contributors', {leave: o.A.leave});
                        await wf().getByRole('link', {name: 'Title & Abstract', exact: true}).last().click();
                        await idle(page); await sleep(1200);
                        o.A.titleBack = await readTitle(await titleEditorId());
                        await snap('02-A-v2-back-to-title', {titleBack: o.A.titleBack});
                    }
                    o[k].typed = await typeTitle(s.title2);
                    o[k].save = await pressSave();
                    o[k].samePage = await readTitle(await titleEditorId());
                    await snap(`02-${k}-v2-title-saved`, {save: o[k].save});
                    await page.reload(); await idle(page); await sleep(1500);
                    o[k].afterReload = await readTitle(await titleEditorId());
                    await openWf(`publication_${s.v2}_issue`, s.id, `02-${k}-v2-publication-settings`);
                    await wf().locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
                    await sleep(800);
                    o[k].v2Settings = await readAssign(wf());
                    o[k].db = dbPubs(s.id);
                }
            });
            S.v2done = true; save();
        }
        // ============================================================ control: v2s saved, unpublished
        if (!S.control) {
            await step('control', async (o) => { Object.assign(o, await publicRead('03-control', {landing: true})); });
            S.control = true; save();
        }
        // ============================================================ publish A (Don't Assign) and B (issue choice kept)
        if (!S.published) {
            await step('publish', async (o) => {
                await asMg();
                await openWf(`publication_${S.subs.A.v2}_titleAbstract`, S.subs.A.id, '04-A-v2-before-publish');
                o.A = await publishVersion('A', "Don't Assign To An Issue", '04-A');
                await openWf(`publication_${S.subs.B.v2}_titleAbstract`, S.subs.B.id, '05-B-v2-before-publish');
                o.B = await publishVersion('B', null, '05-B');
                for (const k of ['A', 'B']) {
                    await openWf(`publication_${S.subs[k].v2}_issue`, S.subs[k].id, `06-${k}-v2-settings-after-publish`);
                    await wf().locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: 12000}).catch(() => {});
                    await sleep(800);
                    o[`${k}settingsAfter`] = await readAssign(wf());
                    o[`${k}head`] = flat(await wf().innerText().catch(() => null), 500);
                }
            });
            S.published = true; save();
        }
        // ============================================================ after: public reads
        await step('after', async (o) => { Object.assign(o, await publicRead('07-after', {landing: true})); });
        // ============================================================ backend: Issues page and the issue window
        await step('backend', async (o) => {
            await asMg();
            await go(cu(S.path, '/manageIssues'));
            await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page);
            const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
            await panel.locator('table').first().waitFor({timeout: T});
            await idle(page); await sleep(500);
            await snap('08-back-issues', {}, {png: true});
            o.backIssueRows = await panel.locator('tr.gridRow').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
            await panel.getByRole('link', {name: 'Vol. 1 No. 1 (2024)', exact: true}).first().click();
            const dlg = page.getByRole('dialog', {name: /^Issue Management/});
            await dlg.waitFor({timeout: T}); await idle(page); await sleep(500);
            await dlg.getByRole('tab', {name: 'Table of Contents', exact: true}).click(); await idle(page);
            const tp = dlg.getByRole('tabpanel', {name: 'Table of Contents'});
            await tp.locator('table').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(800);
            await snap('08-issue-window-toc', {}, {png: true});
            await loc(page, 'Issue window: "Table of Contents" tab', dlg.getByRole('tab', {name: 'Table of Contents', exact: true}));
            o.tocTab = await tp.locator('tbody tr').evaluateAll((trs) => trs.filter((tr) => tr.getClientRects().length && !tr.classList.contains('row_controls')).map((tr) => (tr.classList.contains('category') || /category/.test(tr.className) ? '# ' : '') + tr.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch((e) => [`err ${flat(e.message, 100)}`]);
            await dlg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await idle(page); await sleep(600);
            o.dbCurrent = Object.fromEntries(Object.entries(S.subs).map(([k, s]) => [k, {current: dbCurrent(s.id), pubs: dbPubs(s.id)}]));
        });
        // ============================================================ remove: the tab's "Remove" on A (listed although its current version has no issue)
        if (!S.removed) {
            await step('remove', async (o) => {
                await asMg();
                const dlg = await issueWindowToc();
                const row = dlg.getByRole('tabpanel', {name: 'Table of Contents'}).locator('tr.gridRow').filter({hasText: S.subs.A.title2}).first();
                await row.waitFor({timeout: T});
                const arrow = row.locator('a.show_extras');
                if (await arrow.count()) await arrow.click();
                const ctl = row.locator('xpath=following-sibling::tr[1]');
                await ctl.getByRole('link').first().waitFor({timeout: 10000}).catch(() => {});
                o.rowLinks = (await ctl.getByRole('link').allInnerTexts()).map((x) => flat(x, 60)).filter(Boolean);
                await snap('09-toc-tab-A-row-controls');
                await ctl.getByRole('link', {name: 'Remove', exact: true}).click();
                const d = page.locator(vis).last();
                await d.waitFor({timeout: T}); await idle(page); await sleep(500);
                o.confirmText = flat(await d.innerText().catch(() => null), 500);
                await snap('09-remove-confirm', {}, {png: true});
                const t0 = Date.now();
                const w = page.waitForResponse((r) => r.request().method() === 'POST' && /remove-article|removeArticle/.test(r.url()), {timeout: T}).catch(() => null);
                await d.getByRole('button', {name: 'OK', exact: true}).click();
                const r = await w;
                o.removeStatus = r ? r.status() : null;
                o.removeBody = r ? flat(await r.text().catch(() => null), 300) : null;
                await idle(page); await sleep(1200);
                o.traffic = netSince(t0);
                o.tocTabSamePage = await readTocTab(page.getByRole('dialog', {name: /^Issue Management/}));
                await snap('09-toc-tab-after-remove', {}, {png: true});
                o.dbA = dbPubs(S.subs.A.id); o.currentA = dbCurrent(S.subs.A.id);
                const dlg2 = await issueWindowToc();
                o.tocTabReopened = await readTocTab(dlg2);
                await dlg2.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
                await idle(page); await sleep(600);
                const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
                o.backIssueRows = await panel.locator('tr.gridRow').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
                await openWf(`publication_${S.subs.A.v2}_titleAbstract`, S.subs.A.id, '09-A-workflow-after-remove');
                o.aWorkflowHead = flat(await wf().innerText().catch(() => null), 600);
                o.aControls = await controls().getByRole('button').allInnerTexts().catch(() => []);
                await visitor();
                o.toc = (await readToc('10-after-remove-toc')).toc;
                o.aLanding = await readLanding(cu(S.path, `/article/view/${S.subs.A.id}`), '10-after-remove-A-landing');
                o.aV1Page = await readLanding(cu(S.path, `/article/view/${S.subs.A.id}/version/${S.subs.A.v1}`), '10-after-remove-A-v1-page');
                o.feeds = pick(await readFeeds('10-after-remove-feed'));
            });
            S.removed = true; save();
        }
    } finally {
        fact('jsDialogs', jsDialogs.map(({at, ...x}) => x));
        fact('errors4xx5xx', net.filter((x) => x.s >= 400).map(({at, ...x}) => x));
        await close();
    }
});
