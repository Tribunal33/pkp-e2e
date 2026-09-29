// U49 claim check, housekeeping chunk I29 (2026-09-29): incidentals rows 14, 15, 18, 23, 24 of
// docs/tracking/incidentals.md (.reports/hk29/chunks/U49.md). Specs: docs/specs/U49-publish-schedule-
// and-versions.md (Rule 3/3a, Rule 5's table, Rule 9, Rule 11, Side effects "Activity log", scenario 1;
// footnotes h, i, q, aa), docs/specs/U18-web-feeds.md (Rule 5) and docs/specs/U45-dois.md (Side
// effects "Activity Log, no mail", fn-r).
//
// Seeds its own scratch contexts per RUN, signs in as their throwaway manager "Mia Manager", reads the
// public pages signed out, records every screen with screen(). Phases:
//   doi    {OJS OMP OPS} rows 23/24. Four contexts: P (DOIs on, prefix 10.1234, "Upon publication"),
//          C ("Upon reaching the copyediting stage" / OPS "…production stage": the DOI is there before
//          the publish), V ("Never"), O (DOIs off). One item each at Production (OPS: submitted); OMP's P
//          item also carries a chapter and a publication format with "Chapters" and "Publication Formats"
//          ticked. The Activity Log's History before and after the workflow publish (OJS: "Review
//          Publishing Details" › "Assign To Current/Back Issue" + the back issue › "Confirm"; the event
//          log is also read while the confirmation window is open, to place the Confirm's own line),
//          and again after a fresh load.
//   ver    {OJS} rows 14/15. Journal with Vol. 1 No. 1 (2025) published (current), the web feed on
//          "Display items in current published issue.". A, B, C in the issue, D published with no issue.
//          A: "Create New Version" untouched, v2 retitled, published with "Don't Assign To An Issue".
//          B: the same, v2 published keeping the panel as it arrives. Public reads (TOC, the three feeds,
//          A's page) signed out before and after. B's v2 "Title & Abstract" is left once unsaved.
//   unpub  {OJS OMP OPS} row 18. v1 and v2 published (OJS: B above; OMP/OPS: a seeded published item,
//          v2 made by an untouched version dialog and published); then "Unpublish" ("Unpost") on v1:
//          v1's readout and controls at once and after a reload, v2's, the side menu, the public page;
//          then v1's publish button pressed once (panel or window read, then Cancel).
// Run twice, each under its own facts name (fresh scratch contexts per RUN), one app per process:
//   RUN=r1 PHASES=doi PROBE_FEATURE=U49 PROBE_AGENT=ccI29 node bin/probe.js ojs shared/playwright/checks/U49/I29/i29.js
//   RUN=r1 PHASES=ver,unpub …ojs…;  RUN=r1 …omp… / …ops… (all phases);  then RUN=r2 …
// No assertions: the script records, the reader judges. Database reads (psql SELECT) are evidence only.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ALL = ['doi', 'stage', 'ver', 'unpub'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const T = 30_000;
const T0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 600) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const N = (name) => `${RUN}-${name}`;
const vis = '[role="dialog"]:visible';
const PUBLISH_RE = /^(Schedule For Publication|Publish|Post)$/;
const UNPUB_RE = /^(Unpublish|Unpost|Unschedule)$/;
const WINDOW_RE = /Are you sure you want to|requirements must be met|requirements have been met/;
const BACK = /Vol\. 1 No\. 1 \(2025\)/;

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const log = (...a) => console.log(`[i29 ${RUN} ${app.name} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const sf = path.join(outDir(), `i29-state-${RUN}-${app.name}.json`);
    const S = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i29-facts-${RUN}`, {[k]: v}, {merge: true}); log(`[${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const sql = (q) => {
        try { return execFileSync('psql', ['-d', app.db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); } catch (e) { return `SQL ERROR ${flat(e.stderr, 300)}`; }
    };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const strip = (u) => (u || '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '');
    const wfUrl = (ctx, id, key) => cu(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const ctxTbl = isOJS ? 'journal' : isOMP ? 'press' : 'server';
    const ctxTbls = isOJS ? 'journals' : isOMP ? 'presses' : 'servers';
    const PROD = isOPS ? {} : {decisions: ['skipExternalReview', 'sendToProduction']};
    if (!S.t) { S.t = tag('u49i29'); save(); }
    const t = S.t;
    const people = (p) => [
        {username: `${p}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
        {username: `${p}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
    ];
    const mkCtx = async (k, spec = {}) => {
        const p = `${t}${k}`;
        const c = await app.api.createContext({tag: p, users: people(p), ...spec,
            context: {name: {en: `I29 ${k} ${p}`}, acronym: 'JI29', contactName: 'Pat Principal', contactEmail: `${p}pc@mail.test`}});
        S[k] = {path: c.path, mg: `${p}mg`, au: `${p}au`, issues: c.issues || null, subs: {}};
        save();
        return S[k];
    };
    const mkSub = async (k, s, extra = {}) => {
        const title = extra.title || `I29 ${k}${s} v1 ${t}`;
        const r = await app.api.createSubmission({tag: `${t}${k}${s}`, context: S[k].path, submitter: S[k].au, title, ...extra});
        S[k].subs[s] = {id: r.submissionId, v1: r.publicationId, title1: title, title2: `I29 ${k}${s} v2 ${t}`, chapters: r.chapters || null, formats: r.publicationFormats || null};
        save();
        return S[k].subs[s];
    };

    const {page, close} = await launch(app);
    const jsDialogs = [];
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300)});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const net = [];
    page.on('response', (r) => {
        const u = r.url();
        if (!/\/api\/v1\/|\/gateway\/|\/issue\/|\/article\/|\/preprint\/|\/catalog\//.test(u)) return;
        const m = r.request().method();
        net.push({at: Date.now(), m, override: r.request().headers()['x-http-method-override'] || null, s: r.status(), u: strip(u).replace(/^.*\/api\/v1/, 'api').slice(0, 160)});
    });
    const netSince = (t0, gets = false) => net.filter((x) => x.at >= t0 && (gets || x.m !== 'GET')).map(({at, ...x}) => x);
    const dialogsSince = (t0) => jsDialogs.filter((d) => d.at >= t0).map(({at, ...d}) => d);

    async function snap(name, extra, {png = false} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        record(N(name), s);
        if (png) await shot(page, N(name)).catch(() => {});
        return s;
    }
    const step = async (name, fn) => {
        const out = {};
        try { await fn(out); } catch (e) { out.FAILED = flat(e.stack || e.message, 700); log('step FAILED', name, out.FAILED); await snap(`zz-failed-${name}`, {}, {png: true}).catch(() => {}); }
        fact(name, out);
        return out;
    };
    const go = async (url) => { const r = await page.goto(url).catch((e) => ({err: flat(e.message, 200)})); await idle(page).catch(() => {}); return r && typeof r.status === 'function' ? r.status() : r; };
    let who = null;
    const as = async (user, ctxPath) => {
        if (who === user) return;
        await signIn(page, user, {contextPath: ctxPath});
        await idle(page);
        who = user;
    };
    const visitor = async () => { await signOut(page).catch(() => {}); await idle(page).catch(() => {}); who = null; };
    const wf = () => page.locator(vis).first();
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    async function openWf(ctxPath, id, key, name) {
        await go(wfUrl(ctxPath, id, key));
        await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        await sleep(900);
        if (name) return snap(name);
        return null;
    }
    const readout = async () => ({
        left: flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 200),
        right: (await controls().getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)),
        rightLinks: (await controls().getByRole('link').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)),
        menu: (await page.getByRole('treeitem').allInnerTexts().catch(() => [])).map((x) => flat(x, 80)).filter((x) => /Version|version|Author Original|Manuscript/.test(x)),
    });
    const COLS = `publication_id, status, version_stage, version_major, version_minor, ${isOJS ? 'issue_id' : 'null'}, date_published`;
    const dbPubs = (sid) => sql(`select ${COLS} from publications where submission_id=${sid} order by publication_id`).split('\n');
    const dbSub = (sid) => sql(`select status, stage_id, current_publication_id from submissions where submission_id=${sid}`);
    const dbLog = (sid) => sql(`select e.log_id, e.assoc_type, e.event_type, e.message, u.username from event_log e left join users u on u.user_id=e.user_id where (e.assoc_type=1048585 and e.assoc_id=${sid}) or (e.assoc_type=515 and e.assoc_id in (select submission_file_id from submission_files where submission_id=${sid})) order by e.log_id`).split('\n');
    const dbDois = (sid, pub) => ({
        publication: sql(`select coalesce(d.doi,'-') from publications p left join dois d on d.doi_id=p.doi_id where p.publication_id=${pub}`),
        ...(isOMP ? {
            chapters: sql(`select c.chapter_id, coalesce(d.doi,'-') from submission_chapters c left join dois d on d.doi_id=c.doi_id where c.publication_id=${pub}`),
            formats: sql(`select f.publication_format_id, coalesce(d.doi,'-') from publication_formats f left join dois d on d.doi_id=f.doi_id where f.publication_id=${pub}`),
        } : {}),
        ...(isOJS || isOPS ? {galleys: sql(`select g.galley_id, coalesce(d.doi,'-') from publication_galleys g left join dois d on d.doi_id=g.doi_id where g.publication_id=${pub}`)} : {}),
    });

    // ---- the Activity Log's History
    async function activityLog(name) {
        const btn = page.getByRole('button', {name: 'Activity Log', exact: true});
        await btn.first().waitFor({timeout: T});
        await btn.first().click();
        const dlg = page.getByRole('dialog').filter({hasText: 'Activity Log & Notes'});
        await dlg.getByText('Event', {exact: true}).first().waitFor({timeout: T});
        await idle(page);
        let rows = [];
        for (let i = 0; i < 12; i++) {
            const r = await dlg.locator('tr.gridRow').allInnerTexts().catch(() => []);
            if (r.length && r.length === rows.length) break;
            rows = r;
            await sleep(400);
        }
        rows = (await dlg.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim())))).map((c) => c.join(' | '));
        const tabs = (await dlg.getByRole('tab').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
        const headers = (await dlg.locator('th').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
        await snap(name, {rows, tabs, headers});
        await dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
        await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await sleep(700);
        return {rows, tabs, headers};
    }
    const newRows = (before, after) => (after.rows || []).filter((r) => !(before.rows || []).includes(r));

    // ---- the publish flow
    const panelLoc = () => page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
    const windowLoc = () => page.getByRole('dialog').filter({hasText: WINDOW_RE}).last();
    async function readAssign(scope) {
        return scope.evaluate((el) => {
            const radios = [...el.querySelectorAll('input[name="assignment"]')].map((r) => ({value: r.value, checked: r.checked, label: (r.closest('label')?.innerText || r.parentElement?.innerText || '').replace(/\s+/g, ' ').trim()}));
            const sel = el.querySelector('select[name="issueId"]');
            return {radios, issue: sel ? {visible: !!sel.getClientRects().length, value: sel.value, chosen: sel.selectedOptions[0]?.innerText.trim() || null} : null};
        }).catch((e) => ({error: flat(e.message, 200)}));
    }
    async function readPanel() {
        const p = panelLoc();
        const sel = async (n) => p.locator(`select[name="${n}"]`).evaluate((s) => ({value: s.value, chosen: s.selectedOptions[0]?.innerText.trim() || null})).catch(() => null);
        return {versionStage: await sel('versionStage'), versionIsMinor: await sel('versionIsMinor'), updateType: await sel('updateType'), assign: await readAssign(p), text: flat(await p.innerText().catch(() => null), 1200)};
    }
    async function readWindow() {
        return windowLoc().evaluate((el) => ({
            text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 1500),
            buttons: [...el.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
        })).catch((e) => ({error: flat(e.message, 200)}));
    }
    async function pressPublish() {
        const button = controls().getByRole('button', {name: PUBLISH_RE}).first();
        await button.waitFor({timeout: T});
        const label = flat(await button.innerText(), 60);
        await sleep(800);
        const t0 = Date.now();
        await button.click();
        const stage = panelLoc().locator('select[name="versionStage"]');
        const any = stage.or(windowLoc()).first();
        let ok = await any.waitFor({state: 'visible', timeout: 8000}).then(() => true).catch(() => false);
        let retried = false;
        if (!ok) { retried = true; await button.click().catch(() => {}); ok = await any.waitFor({state: 'visible', timeout: T}).then(() => true).catch(() => false); }
        await idle(page); await sleep(1200);
        const opened = (await stage.isVisible().catch(() => false)) ? 'panel' : (await windowLoc().isVisible().catch(() => false)) ? 'window' : 'none';
        return {label, opened, retried, writes: netSince(t0)};
    }
    /**
     * Publish the shown version. `choice`: a radio to pick in the panel ('back' = Current/Back Issue + the
     * back issue; "Don't Assign To An Issue"; null = leave the panel as it arrives). `mid(o)` runs while the
     * confirmation window is open.
     */
    async function publish(name, {choice = null, mid = null} = {}) {
        const o = {};
        o.press = await pressPublish();
        if (o.press.opened === 'panel') {
            const p = panelLoc();
            await p.locator('input[name="assignment"]').first().waitFor({state: 'visible', timeout: 6000}).catch(() => {});
            await sleep(800);
            o.panelArrive = await readPanel();
            await snap(`${name}-01-panel`, {panel: o.panelArrive}, {png: true});
            if (choice === 'back') {
                const back = p.getByRole('radio', {name: 'Assign To Current/Back Issue'});
                if (await back.count()) {
                    await back.check();
                    const sel = p.locator('select[name="issueId"]').first();
                    await sel.waitFor({state: 'visible', timeout: T});
                    const opt = sel.locator('option').filter({hasText: BACK});
                    await sel.selectOption((await opt.first().getAttribute('value')) || '');
                }
            } else if (choice) {
                await p.getByRole('radio', {name: choice}).check();
            }
            for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
                const el = p.locator(sel);
                if ((await el.count()) && !(await el.inputValue().catch(() => ''))) { await el.selectOption(val).catch(() => {}); o[`filled_${sel}`] = val; }
            }
            await sleep(300);
            o.panelChosen = await readAssign(p);
            const t0 = Date.now();
            await p.getByRole('button', {name: 'Confirm', exact: true}).click();
            await windowLoc().waitFor({timeout: 20000}).catch(() => {});
            await idle(page); await sleep(900);
            o.confirmWrites = netSince(t0);
        }
        const w = windowLoc();
        if (!(await w.isVisible().catch(() => false))) { o.noWindow = true; await snap(`${name}-02-nowindow`, o, {png: true}); return o; }
        const st = w.locator('select[name="versionStage"]');
        if ((await st.count()) && !(await st.inputValue().catch(() => ''))) await st.selectOption(isOPS ? 'AO' : 'VoR').catch(() => {});
        o.window = await readWindow();
        await snap(`${name}-02-window`, {window: o.window}, {png: true});
        if (mid) o.mid = await mid();
        const b = (o.window.buttons || []).find((x) => PUBLISH_RE.test(x));
        if (!b) { await w.getByRole('button', {name: /^(Cancel|Close)$/}).last().click().catch(() => {}); o.confirmed = false; return o; }
        const t1 = Date.now();
        const resp = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: b, exact: true}).click();
        const r = await resp;
        o.pressed = b;
        o.publishStatus = r ? r.status() : null;
        await controls().getByRole('button', {name: UNPUB_RE}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(900);
        o.writes = netSince(t1);
        o.after = await readout();
        await snap(`${name}-03-published`, {after: o.after}, {png: true});
        return o;
    }

    // ---- versions and titles
    async function createNewVersion(name) {
        const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
        await link.waitFor({state: 'visible', timeout: T});
        await sleep(1000);
        await link.click();
        const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
        await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
        await idle(page); await sleep(1000);
        const arrived = await w.locator('select').evaluateAll((els) => els.map((s) => ({name: s.name, value: s.value, chosen: s.selectedOptions[0]?.innerText.trim() || null, options: [...s.options].map((o) => `${o.value}:${o.innerText.trim()}${o.disabled ? ' (disabled)' : ''}`)})));
        await snap(name, {arrived}, {png: true});
        const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: 'Confirm', exact: true}).click();
        const resp = await r;
        let body = null; if (resp) { try { body = await resp.json(); } catch { /* none */ } }
        await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page); await sleep(1200);
        return {status: resp && resp.status(), newPub: body && body.id, created: body ? {status: body.status, versionStage: body.versionStage, versionMajor: body.versionMajor, versionMinor: body.versionMinor, issueId: body.issueId} : null, arrived, readout: await readout()};
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

    // ---- public reads (OJS)
    async function readToc(C, name) {
        const st = await go(cu(C.path, `/issue/view/${C.issueId}`));
        await snap(name, {}, {png: true});
        const titles = await page.locator('.obj_article_summary .title').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
        const hrefs = await page.locator('.obj_article_summary .title a').evaluateAll((as2) => as2.map((a) => a.getAttribute('href'))).catch(() => []);
        return {status: st, titles, hrefs: hrefs.map(strip)};
    }
    function feedItems(type, body) {
        if (!body) return null;
        const tagName = type === 'atom' ? 'entry' : 'item';
        return [...body.matchAll(new RegExp(`<${tagName}[\\s>][\\s\\S]*?</${tagName}>`, 'g'))].map((m) => {
            const x = m[0];
            const title = (x.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || null;
            const link = type === 'atom' ? ((x.match(/<link[^>]*href="([^"]+)"/) || [])[1] || null) : ((x.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || null);
            return {title: title && flat(title.replace(/<!\[CDATA\[|\]\]>/g, ''), 200), link: strip(link)};
        });
    }
    async function readFeeds(C, name) {
        const out = {};
        for (const type of ['atom', 'rss2', 'rss']) {
            const url = cu(C.path, `/gateway/plugin/WebFeedGatewayPlugin/${type}`);
            let resp = null, err = null, body = null;
            const dlP = page.waitForEvent('download', {timeout: 10_000}).catch(() => null);
            try { resp = await page.goto(url); } catch (e) { err = flat(e.message, 200); }
            if (resp) body = await resp.text().catch(() => null);
            else if (/Download is starting/.test(err || '')) {
                const dl = await dlP;
                try { body = dl ? fs.readFileSync(await dl.path(), 'utf8') : null; } catch { /* none */ }
            }
            out[type] = {status: resp ? resp.status() : (body ? 'download' : null), err: body ? null : err, items: feedItems(type, body)};
            if (type === 'atom') await snap(`${name}-atom`, {feed: out[type]});
        }
        return out;
    }
    async function readLanding(url, name) {
        const st = await go(url);
        const s = await snap(name, {}, {png: true});
        const d = await page.evaluate(() => {
            const f = (x) => (x || '').replace(/\s+/g, ' ').trim();
            return {h1: f(document.querySelector('h1')?.innerText),
                published: f(document.querySelector('.item.published, .item.date_published, .sub_item.date_published, .date_published')?.innerText) || null,
                versions: [...document.querySelectorAll('.versions li, .item.versions li')].map((li) => f(li.innerText)),
                issue: f(document.querySelector('.item.issue')?.innerText) || null};
        }).catch((e) => ({error: flat(e.message, 200)}));
        return {status: st, url: strip(page.url()), title: s.title, ...d};
    }

    try {
        // ================================================================ doi (rows 23/24), all apps
        if (on('doi')) {
            const base = {enableDois: true, doiPrefix: '10.1234'};
            const types = isOMP ? ['publication', 'chapter', 'representation'] : ['publication'];
            const earlyTime = isOPS ? 'production' : 'copyediting';
            const issues = isOJS ? {issues: [{volume: 1, number: 1, year: 2025, published: true}]} : {};
            const specs = {
                P: {...base, enabledDoiTypes: types, doiCreationTime: 'publication', ...issues},
                C: {...base, enabledDoiTypes: ['publication'], doiCreationTime: earlyTime, ...issues},
                V: {...base, enabledDoiTypes: ['publication'], doiCreationTime: 'never', ...issues},
                O: {enableDois: false, ...issues},
            };
            if (!S.doiSeeded) {
                for (const k of Object.keys(specs)) {
                    await mkCtx(k, specs[k]);
                    const extra = (isOMP && k === 'P')
                        ? {publicationFormats: [{name: 'PDF', file: 'article.pdf'}], chapters: [{title: 'Chapter One', page: true}, {title: 'Chapter Two'}]}
                        : {};
                    await mkSub(k, 'p', {...PROD, ...extra});
                    S[k].settings = sql(`select setting_name, setting_value from ${ctxTbl}_settings where ${ctxTbl}_id=(select ${ctxTbl}_id from ${ctxTbls} where path='${S[k].path}') and setting_name in ('enableDois','enabledDoiTypes','doiCreationTime','doiPrefix') order by 1`);
                }
                S.doiSeeded = true; save();
                fact('doi-seed', Object.fromEntries(Object.keys(specs).map((k) => [k, {path: S[k].path, settings: S[k].settings, sub: S[k].subs.p}])));
                note(`ccI29 ${RUN}: doi contexts P=${S.P.path} ("Upon publication"), C=${S.C.path} (${earlyTime}), V=${S.V.path} ("Never"), O=${S.O.path} (DOIs off); manager "Mia Manager" ({path}mg)`);
            }
            for (const k of Object.keys(specs)) {
                if (S[`doiDone${k}`]) continue;
                await step(`doi-${k}`, async (o) => {
                    const C = S[k], s = C.subs.p;
                    await as(C.mg, C.path);
                    await openWf(C.path, s.id, null, `doi-${k}-00-workflow`);
                    o.head0 = await readout();
                    o.log0 = await activityLog(`doi-${k}-01-log-before`);
                    if (k === 'P' && RUN === 'r1') await loc(page, 'workflow header: "Activity Log" button', page.getByRole('button', {name: 'Activity Log', exact: true}));
                    o.db0 = {log: dbLog(s.id), dois: dbDois(s.id, s.v1), sub: dbSub(s.id)};
                    await openWf(C.path, s.id, `publication_${s.v1}_titleAbstract`);
                    o.publish = await publish(`doi-${k}-02`, {choice: isOJS ? 'back' : null, mid: async () => ({log: dbLog(s.id), dois: dbDois(s.id, s.v1)})});
                    o.log1 = await activityLog(`doi-${k}-03-log-after`);
                    o.newRows = newRows(o.log0, o.log1);
                    o.db1 = {log: dbLog(s.id), dois: dbDois(s.id, s.v1), sub: dbSub(s.id), pubs: dbPubs(s.id)};
                    await go(cu(C.path, '/dashboard/editorial'));
                    await openWf(C.path, s.id);
                    o.log2 = await activityLog(`doi-${k}-04-log-reload`);
                    o.newRowsReload = newRows(o.log0, o.log2);
                });
                S[`doiDone${k}`] = true; save();
            }
        }

        // ================================================================ stage {OJS OMP}: row 24's other end
        // "Upon reaching the copyediting stage", prefix set, no DOI yet: the manager records "Accept and Skip
        // Review" on screen; the Activity Log before and after, and the DOI. (OPS makes its DOI at the author's
        // final "Submit", read from the doi phase's seeded context C only.)
        if (on('stage') && !isOPS) {
            if (!S.K) {
                await mkCtx('K', {enableDois: true, doiPrefix: '10.1234', enabledDoiTypes: ['publication'], doiCreationTime: 'copyediting'});
                await mkSub('K', 'k', {});
                note(`ccI29 ${RUN}: stage context K=${S.K.path} ("Upon reaching the copyediting stage"), item at the Submission stage`);
            }
            if (!S.stageDone) {
                await step('stage', async (o) => {
                    const C = S.K, s = C.subs.k;
                    await as(C.mg, C.path);
                    await openWf(C.path, s.id, null, 'stage-00-workflow');
                    o.log0 = await activityLog('stage-01-log-before');
                    o.db0 = {log: dbLog(s.id), dois: dbDois(s.id, s.v1), sub: dbSub(s.id)};
                    await openWf(C.path, s.id);
                    const btn = page.getByRole('button', {name: 'Accept and Skip Review', exact: true});
                    await btn.waitFor({timeout: T});
                    o.buttons = (await page.locator(vis).getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 50)).filter((x) => /Review|Accept|Decline|Send/.test(x));
                    await btn.click();
                    await page.waitForURL(/decision\/record/, {timeout: T, waitUntil: 'commit'});
                    await idle(page); await sleep(800);
                    await snap('stage-02-decision', {}, {png: true});
                    const steps = [];
                    for (let i = 0; i < 6; i++) {
                        await page.locator('.composer__loadingTemplateMask').first().waitFor({state: 'detached', timeout: T}).catch(() => {});
                        await sleep(600);
                        steps.push(flat(await page.locator('h1').first().innerText().catch(() => null), 120));
                        const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
                        if (await rec.isVisible().catch(() => false)) {
                            const posted = page.waitForResponse((r) => /\/decisions/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                            await rec.click();
                            const r = await posted;
                            o.decisionPost = r ? r.status() : null;
                            await page.getByRole('link', {name: 'View Submission'}).first().waitFor({timeout: T}).catch(() => {});
                            await snap('stage-03-recorded', {}, {png: true});
                            break;
                        }
                        await page.getByRole('button', {name: 'Continue', exact: true}).click();
                        await idle(page);
                    }
                    o.steps = steps;
                    await openWf(C.path, s.id, null, 'stage-04-workflow-after');
                    o.log1 = await activityLog('stage-05-log-after');
                    o.newRows = newRows(o.log0, o.log1);
                    o.db1 = {log: dbLog(s.id), dois: dbDois(s.id, s.v1), sub: dbSub(s.id)};
                });
                S.stageDone = true; save();
            }
        }

        // ================================================================ ver (rows 14/15), OJS
        if (on('ver') && isOJS) {
            if (!S.V2) {
                const C = await mkCtx('J', {issues: [{volume: 1, number: 1, year: 2025, published: true}],
                    plugins: {webfeedplugin: {enabled: true, settings: {displayItems: 'issue'}}}});
                C.issueId = C.issues && C.issues[0] && C.issues[0].id;
                const issue = {volume: 1, number: 1, year: 2025};
                for (const [k, d] of [['A', '2025-03-01'], ['B', '2025-03-02'], ['C', '2025-03-03']]) await mkSub('J', k, {published: true, issue, datePublished: d});
                await mkSub('J', 'D', {published: true, datePublished: '2025-03-04', title: `I29 JD noissue ${t}`});
                S.V2 = true; save();
                fact('ver-seed', S.J);
                note(`ccI29 ${RUN}: journal J=${S.J.path} (Vol. 1 No. 1 (2025) id ${S.J.issueId}, feeds on the current issue); A/B/C in the issue, D no issue`);
            }
            const C = S.J;
            if (!S.verBefore) {
                await step('ver-before', async (o) => {
                    await visitor();
                    o.toc = await readToc(C, 'ver-01-toc-before');
                    o.feeds = await readFeeds(C, 'ver-01-feed-before');
                });
                S.verBefore = true; save();
            }
            for (const k of ['A', 'B']) {
                if (S[`ver${k}`]) continue;
                await step(`ver-${k}`, async (o) => {
                    const s = C.subs[k];
                    await as(C.mg, C.path);
                    await openWf(C.path, s.id, `publication_${s.v1}_titleAbstract`, `ver-${k}-01-v1`);
                    o.v1Readout = await readout();
                    o.create = await createNewVersion(`ver-${k}-02-version-dialog`);
                    s.v2 = o.create.newPub; save();
                    await openWf(C.path, s.id, `publication_${s.v2}_titleAbstract`, `ver-${k}-03-v2-title`);
                    o.v2Readout = await readout();
                    await wf().getByRole('button', {name: 'Save', exact: true}).last().waitFor({timeout: T}).catch(() => {});
                    if (k === 'B') {
                        // left once with an unsaved change: another entry of the same version, then back
                        const t0 = Date.now();
                        o.unsaved = await typeTitle(`B unsaved ${t}`);
                        await wf().getByRole('link', {name: 'Contributors', exact: true}).last().click();
                        await idle(page); await sleep(1200);
                        o.leave = {dialogs: dialogsSince(t0), visibleDialogs: await page.locator(vis).count(), url: strip(page.url()).replace(/^.*\?/, '')};
                        await snap(`ver-${k}-04-left-unsaved`, {leave: o.leave});
                        await wf().getByRole('link', {name: 'Title & Abstract', exact: true}).last().click();
                        await idle(page); await sleep(1200);
                        o.titleBack = await readTitle(await titleEditorId());
                        await snap(`ver-${k}-05-back`, {titleBack: o.titleBack});
                    }
                    o.typed = await typeTitle(s.title2);
                    o.save = await pressSave();
                    o.samePage = await readTitle(await titleEditorId());
                    await page.reload(); await idle(page); await sleep(1500);
                    o.afterReload = await readTitle(await titleEditorId());
                    await snap(`ver-${k}-06-v2-title-saved`, {samePage: o.samePage, afterReload: o.afterReload});
                    if (k === 'A' && RUN === 'r1') await loc(page, 'workflow: "Create New Version" side-menu item', page.getByRole('link', {name: 'Create New Version', exact: true}));
                    o.publish = await publish(`ver-${k}-07`, {choice: k === 'A' ? "Don't Assign To An Issue" : null});
                    o.db = dbPubs(s.id);
                    o.current = sql(`select current_publication_id from submissions where submission_id=${s.id}`);
                });
                S[`ver${k}`] = true; save();
            }
            if (!S.verAfter) {
                await step('ver-after', async (o) => {
                    await visitor();
                    o.toc = await readToc(C, 'ver-08-toc-after');
                    await page.reload(); await idle(page);
                    o.tocReload = await page.locator('.obj_article_summary .title').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []);
                    o.feeds = await readFeeds(C, 'ver-08-feed-after');
                    o.aLanding = await readLanding(cu(C.path, `/article/view/${C.subs.A.id}`), 'ver-09-A-landing');
                    o.issueCurrent = await (async () => { await go(cu(C.path, '/issue/current')); await snap('ver-10-issue-current'); return page.locator('.obj_article_summary .title').allInnerTexts().then((a) => a.map((x) => flat(x, 200))).catch(() => []); })();
                });
                S.verAfter = true; save();
            }
        }

        // ================================================================ unpub (row 18), all apps
        if (on('unpub')) {
            let C, s;
            if (isOJS) {
                if (!S.verB) { log('unpub on OJS needs the ver phase first'); return; }
                C = S.J; s = C.subs.B;
            } else {
                if (!S.U) {
                    await mkCtx('U');
                    await mkSub('U', 'u', {...PROD, published: true, datePublished: '2025-03-03'});
                }
                C = S.U; s = C.subs.u;
                if (!s.v2) {
                    await step('unpub-v2', async (o) => {
                        await as(C.mg, C.path);
                        await openWf(C.path, s.id, `publication_${s.v1}_titleAbstract`, 'unpub-00-v1');
                        o.create = await createNewVersion('unpub-01-version-dialog');
                        s.v2 = o.create.newPub; save();
                        await openWf(C.path, s.id, `publication_${s.v2}_titleAbstract`, 'unpub-02-v2');
                        o.publish = await publish('unpub-03');
                        o.db = dbPubs(s.id);
                    });
                }
            }
            await step('unpub', async (o) => {
                await as(C.mg, C.path);
                o.dbBefore = dbPubs(s.id);
                await openWf(C.path, s.id, `publication_${s.v1}_titleAbstract`, 'unpub-10-v1-before');
                o.v1Before = await readout();
                await openWf(C.path, s.id, `publication_${s.v2}_titleAbstract`);
                o.v2Before = await readout();
                await openWf(C.path, s.id, `publication_${s.v1}_titleAbstract`);
                const b = controls().getByRole('button', {name: /^(Unpublish|Unpost)$/}).first();
                if (RUN === 'r1') await loc(page, 'workflow controls: "Unpublish"/"Unpost" on the earlier version', b);
                await b.click();
                const d = page.getByRole('dialog').filter({hasText: /don't want this to be/}).last();
                await d.waitFor({timeout: T}).catch(() => {});
                await idle(page);
                o.dialog = {text: flat(await d.innerText().catch(() => ''), 300), buttons: (await d.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 40))};
                await snap('unpub-11-dialog', o.dialog, {png: true});
                const t0 = Date.now();
                const w = page.waitForResponse((r) => /\/unpublish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await d.getByRole('button', {name: /^(Unpublish|Unpost)$/}).last().click();
                const r = await w;
                o.unpublishStatus = r ? r.status() : null;
                await controls().getByRole('button', {name: PUBLISH_RE}).first().waitFor({timeout: T}).catch(() => {});
                await idle(page); await sleep(1500);
                o.writes = netSince(t0);
                o.v1AtOnce = await readout();
                await snap('unpub-12-v1-at-once', {v1: o.v1AtOnce}, {png: true});
                await page.reload(); await idle(page); await sleep(1500);
                await page.locator('[data-cy="workflow-controls-left"]').first().waitFor({timeout: T}).catch(() => {});
                await sleep(800);
                o.v1Reload = await readout();
                await snap('unpub-13-v1-reload', {v1: o.v1Reload}, {png: true});
                await openWf(C.path, s.id, `publication_${s.v2}_titleAbstract`, 'unpub-14-v2-after');
                o.v2After = await readout();
                o.dbAfter = dbPubs(s.id);
                o.sub = dbSub(s.id);
                // sweep: v1's publish button pressed once, then Cancel
                await openWf(C.path, s.id, `publication_${s.v1}_titleAbstract`);
                o.v1Press = await pressPublish();
                if (o.v1Press.opened === 'panel') {
                    o.v1Panel = await readPanel();
                    await snap('unpub-15-v1-press-panel', o.v1Panel, {png: true});
                    await panelLoc().getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
                } else if (o.v1Press.opened === 'window') {
                    o.v1Window = await readWindow();
                    await snap('unpub-15-v1-press-window', o.v1Window, {png: true});
                    await windowLoc().getByRole('button', {name: /^(Cancel|Close)$/}).last().click().catch(() => {});
                }
                await sleep(1200);
                o.dbAfterPress = dbPubs(s.id);
                // the reader side (U13's facts, one read as a control)
                await visitor();
                const item = isOJS ? `/article/view/${s.id}` : isOMP ? `/catalog/book/${s.id}` : `/preprint/view/${s.id}`;
                o.landing = await readLanding(cu(C.path, item), 'unpub-16-landing');
                o.v1Address = await readLanding(cu(C.path, `${item}/version/${s.v1}`), 'unpub-17-v1-address');
            });
        }
    } finally {
        await close();
    }
});
