// U69 claim check K5: chapter pages, "How to Cite" and French (spec Fields
// "The chapter page", Rules 15–19 and 21, Settings 3–4 and 11–13, register
// A13–A15; footnotes e, l, m, o, r, h, td16–td18, td20, f-a13–f-a15).
//
// OMP: every phase seeds its own scratch press (scenarios.md), signs in as
// that press's roles for the screen actions, and a signed-out visitor reads
// the public pages in a second browser. OJS and OPS: read-only controls on
// publicknowledge (the chapter address) plus a scratch journal / server
// (the "How to Cite" author, the CSL window's defaults, the French item
// page's raw codes) — multi-app rule 4.
//
// Phases (PHASES=a,b,… picks; default all):
//   ctl    OJS/OPS controls (chapter address on publicknowledge; CSL window defaults; French item page; citation author)
//   chap   Fields "The chapter page", Rule 15 (which chapters get a page, 404s), Rule 18's links on a
//          current page, Setting 12 (Chapter Page box, the DOI end), an Edited Volume's chapters and licenses
//   vers   Rules 15–18 across two versions (doiVersioning on, so older chapter pages render), the
//          "Updated on" line, "Versions" suffixes, notices; the default press's older chapter page;
//          Setting 13 (long / short formats) on that book
//   dates  Rule 16 heading, A13 (td16), Setting 11 (Publication Dates), Setting 13 (d/m/Y), CSL off (Setting 3)
//   cite   Rule 19 (td18), A14, Settings 3–4 (the plugin row, the Settings window's defaults)
//   mgsub  A14's axis: a book the Press manager submitted (no Author-role contributor?)
//   fr     Rule 21 (td20), A15
//
// Run: RUN=r1 PROBE_FEATURE=U69 PROBE_AGENT=ccK5 node bin/probe.js all shared/playwright/checks/U69/K5/k5.js
// (ONLY=omp narrows; PHASES=chap,vers picks; RUN names the facts file and the snapshots, so two runs keep
// separate records). OMP outlasts 600 s: run detached (patterns.md "Probe kit").
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, settled} = require('../../../probe');

const PHASES = (process.env.PHASES || 'ctl,chap,vers,dates,cite,mgsub,fr').split(',');
const on = (p) => PHASES.includes(p);
const RUN = process.env.RUN || 'r1';
const T = 30_000;
const REPO = path.join(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php/, '');
const PROD = ['skipExternalReview', 'sendToProduction'];

function today() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- a page as data (book or chapter)
const PAGE = () => {
    const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
    const full = document.querySelector('.obj_monograph_full');
    const main = full && full.querySelector('.main_entry');
    const side = full && full.querySelector('.entry_details');
    const hrefs = (el) => [...el.querySelectorAll('a')].map((a) => ({t: txt(a).slice(0, 80), h: a.getAttribute('href'), img: !!a.querySelector('img')})).slice(0, 14);
    const item = (el) => ({cls: String(el.className || el.tagName).replace(/\bitem\b\s*/, '').trim() || el.tagName.toLowerCase(),
        labels: [...el.querySelectorAll('.label, h2, h3')].map((l) => `${l.classList.contains('pkp_screen_reader') ? '(sr)' : ''}${txt(l) || l.textContent.trim()}`).slice(0, 8),
        text: (txt(el) || '').slice(0, 320), links: hrefs(el)});
    const dp = side && side.querySelector('.item.date_published');
    const bodyText = document.body ? document.body.innerText : '';
    const cite = document.getElementById('citationOutput');
    const toc = [...document.querySelectorAll('.item.chapters > ul > li')].map((li) => {
        const t = li.querySelector('.title');
        const a = t ? t.closest('a') : null;
        return {title: txt(t), link: a ? a.getAttribute('href') : null, text: txt(li).slice(0, 200)};
    });
    return {
        docTitle: document.title,
        isChapter: !!document.querySelector('.obj_chapter'),
        h1: txt(full && full.querySelector('h1')) || txt(document.querySelector('h1')),
        h1html: full && full.querySelector('h1') ? full.querySelector('h1').innerHTML.replace(/\s+/g, ' ').trim().slice(0, 300) : null,
        notices: full ? [...full.querySelectorAll(':scope > .cmp_notification')].map((n) => ({text: txt(n), links: [...n.querySelectorAll('a')].map((a) => ({t: txt(a), h: a.getAttribute('href')}))})) : [],
        mainItems: main ? [...main.children].map(item) : null,
        sideItems: side ? [...side.children].map(item) : null,
        dateLabel: dp ? txt(dp.querySelector(':scope > .sub_item:not(.versions) .label')) : null,
        dateValue: dp ? txt(dp.querySelector(':scope > .sub_item:not(.versions) .value')) : null,
        versionsLabel: dp && dp.querySelector('.sub_item.versions .label') ? txt(dp.querySelector('.sub_item.versions .label')) : null,
        versions: dp ? [...dp.querySelectorAll('.sub_item.versions li')].map((li) => ({t: txt(li), a: li.querySelector('a') ? li.querySelector('a').getAttribute('href') : null, aText: li.querySelector('a') ? txt(li.querySelector('a')) : null})) : [],
        toc,
        cite: cite ? txt(cite) : null,
        citeHeading: cite ? txt((cite.closest('.item, section') || cite.parentElement).querySelector('h2, h3, .label')) : null,
        raw: [...new Set(bodyText.match(/##[^#\s]+##/g) || [])],
        fileLinks: [...document.querySelectorAll('a[href*="/catalog/view/"], a[href*="/catalog/download/"]')].map((a) => ({t: txt(a), h: a.getAttribute('href')})),
        bodyText: (full ? '' : txt(document.querySelector('.pkp_structure_main') || document.body) || '').slice(0, 500),
    };
};
const brief = (d) => ({status: d.status, url: d.url, chain: d.chain, docTitle: d.docTitle, isChapter: d.isChapter, h1: d.h1, notices: d.notices, dateLabel: d.dateLabel, dateValue: d.dateValue,
    versionsLabel: d.versionsLabel, versions: d.versions, cite: d.cite, raw: d.raw, body: d.bodyText || undefined,
    main: (d.mainItems || []).map((i) => `${i.cls} | ${i.labels.join('/')} | ${i.text.slice(0, 160)}`),
    side: (d.sideItems || []).map((i) => `${i.cls} | ${i.labels.join('/')} | ${i.text.slice(0, 160)}`),
    links: [...(d.mainItems || []), ...(d.sideItems || [])].reduce((o, i) => { if (i.links.length) o[i.cls] = i.links.map((l) => `${l.t || (l.img ? '[img]' : '')} -> ${rel(l.h)}`); return o; }, {}),
    toc: d.toc && d.toc.length ? d.toc.map((c) => `${c.title} -> ${c.link ? rel(c.link) : '(plain)'}`) : undefined});

// ---------------------------------------------------------------- the CSL block (as U13 K3)
const BLOCK = () => {
    const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
    const out = document.getElementById('citationOutput');
    if (!out) return {present: false};
    const list = document.getElementById('cslCitationFormats');
    const uls = list ? [...list.querySelectorAll('ul')] : [];
    const side = out.closest('.entry_details');
    return {
        present: true,
        heading: t((out.closest('.item, section') || out.parentElement).querySelector('h2, h3, .label')),
        lastInSide: side ? side.lastElementChild === (out.closest('.item, section') || out.parentElement) || side.lastElementChild.contains(out) : null,
        citation: t(out),
        button: t(document.querySelector('[aria-controls="cslCitationFormats"]')),
        styles: uls[0] ? [...uls[0].querySelectorAll('a')].map(t) : [],
        downloadLabels: list ? [...list.querySelectorAll('.label')].map(t) : [],
        downloads: uls[1] ? [...uls[1].querySelectorAll('a')].map((a) => `${t(a)} -> ${(a.getAttribute('href') || '').replace(/^.*\/index\.php/, '')}`) : [],
    };
};

forEachApp(async (app) => {
    const isOmp = app.name === 'omp';
    const facts = {};
    function fact(key, value) {
        facts[key] = value;
        record(`facts-${RUN}`, {[key]: value}, {merge: true});
        console.log(`[fact ${app.name}] ${key}: ${JSON.stringify(value).slice(0, 1500)}`);
    }
    const crashes = [];
    let curStep = '';
    async function step(name, fn) {
        const out = {};
        curStep = name;
        const c0 = crashes.length;
        try {
            return await fn(out);
        } catch (e) {
            out.ERR = String((e && e.message) || e).split('\n').slice(0, 4).join(' | ');
            return null;
        } finally {
            if (crashes.length > c0) out.CRASHES = crashes.slice(c0);
            if (Object.keys(out).length) fact(name, out);
        }
    }
    async function post(route, body) {
        const r = await fetch(app.url(`/index.php/index/api/v1/_test/${route}`), {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-Test-Key': app.testApiKey},
            body: JSON.stringify(body),
        });
        const json = await r.json().catch(() => null);
        return {status: r.status, json};
    }
    async function must(route, body) {
        const r = await post(route, body);
        if (r.status !== 200) throw new Error(`${route} ${r.status} ${JSON.stringify(r.json).slice(0, 500)}`);
        return r.json;
    }
    const sql = (q) => {
        try {
            return execFileSync('psql', ['-d', app.db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
        } catch (e) {
            return `SQL ERROR ${String(e.stderr).trim()}`;
        }
    };
    const ctxUrl = (P, p = '', lc = '') => app.url(`/index.php/${P}${lc ? `/${lc}` : ''}${p}`);
    const users = (P) => [
        {username: `${P}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
        {username: `${P}au`, roles: ['author'], givenName: 'Ada', familyName: 'Quillfeather'},
        {username: `${P}rd`, roles: ['reader'], givenName: 'Rex', familyName: 'Reader'},
    ];
    const pressSpec = (P, extra = {}) => ({
        tag: P,
        context: {name: {en: `K5 Press ${P}`}, acronym: 'KFP', ...(extra.context || {})},
        users: users(P),
        ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'context')),
    });
    async function seedBook(P, key, title, extra = {}) {
        const r = await must('scenarios/submission', {tag: `${P}${key}`, context: P, submitter: `${P}au`, title, ...extra});
        return {id: r.submissionId, pub: r.publicationId, status: r.status, chapters: r.chapters, formats: r.publicationFormats, contributors: r.contributors};
    }

    const mg = await launch(app);
    const vs = await launch(app);
    const page = mg.page;
    const vis = vs.page;
    const jsDialogs = [];
    for (const [who, p] of [['mg', page], ['vis', vis]]) {
        p.on('dialog', async (d) => {
            jsDialogs.push({who, step: curStep, type: d.type(), message: flat(d.message(), 300), url: rel(p.url())});
            await d.accept().catch(() => {});
        });
        p.on('response', (r) => {
            if (r.status() >= 500) crashes.push({who, status: r.status(), method: r.request().method(), url: rel(r.url()).slice(0, 200)});
        });
        p.on('pageerror', (e) => crashes.push({who, script: flat(e.message, 200), url: rel(p.url())}));
    }
    const dialogsSince = (n) => jsDialogs.slice(n);
    async function snap(pg, name, extra = {}) {
        const s = await screen(pg).catch((e) => ({screenError: String(e.message || e)}));
        record(`${RUN}-${name}`, {...s, ...extra});
        await shot(pg, `${RUN}-${name}`).catch(() => {});
        return s;
    }
    async function visit(pg, url, name) {
        let r = null;
        let err = null;
        try {
            r = await pg.goto(url);
        } catch (e) {
            err = String(e.message).split('\n')[0].slice(0, 200);
        }
        await idle(pg).catch(() => {});
        const chain = [];
        if (r) {
            let q = r.request();
            while (q) {
                const resp = await q.response().catch(() => null);
                chain.unshift(`${resp ? resp.status() : '?'} ${rel(q.url())}`);
                q = q.redirectedFrom();
            }
        }
        await snap(pg, name);
        const data = await pg.evaluate(PAGE).catch((e) => ({err: String(e.message).slice(0, 200)}));
        return {status: r ? r.status() : err, url: rel(pg.url()), chain, ...data};
    }
    const read = async (pg, url, name) => brief(await visit(pg, url, name));
    /** Press a link on the open page and report where it lands. */
    async function follow(pg, locator, name) {
        const out = {count: await locator.count()};
        if (!out.count) return out;
        out.href = rel(await locator.first().getAttribute('href'));
        out.target = await locator.first().getAttribute('target');
        const nav = pg.waitForNavigation({timeout: 15_000}).catch(() => null);
        await locator.first().click();
        const r = await nav;
        await idle(pg).catch(() => {});
        out.status = r ? r.status() : null;
        out.landed = rel(pg.url());
        await snap(pg, name);
        const d = await pg.evaluate(PAGE).catch(() => ({}));
        out.page = {docTitle: d.docTitle, isChapter: d.isChapter, h1: d.h1, notices: (d.notices || []).map((n) => n.text), body: d.bodyText ? d.bodyText.slice(0, 200) : undefined};
        return out;
    }
    const as = async (who, P) => {
        await signOut(page).catch(() => {});
        if (who) await signIn(page, who, P ? {contextPath: P} : {});
    };
    const asVis = async (who, P) => {
        await signOut(vis).catch(() => {});
        if (who) await signIn(vis, who, P ? {contextPath: P} : {});
    };

    // ------------------------------------------------ the workflow (as U69 K2)
    async function openWorkflow(P, sid, menuKey, {author} = {}) {
        await page.goto(ctxUrl(P, `/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${sid}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
        await idle(page);
        await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        await sleep(600);
    }
    async function createVersion() {
        const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
        const wf = new WorkflowPage(page, null);
        const item = await wf.revealPublicationEntry('Create New Version');
        await wf.expectVersionLoaded();
        await item.click();
        const dlg = page.getByRole('dialog', {name: 'Create New Version'});
        await dlg.getByLabel('Publication Stage').waitFor({timeout: T});
        const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
        const resp = await created;
        const info = {status: resp.status(), id: (await resp.json().catch(() => ({}))).id};
        await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page);
        return info;
    }
    async function publishOnScreen(stageRe = /Version of Record/) {
        const s = {};
        const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
        await btn.waitFor({state: 'visible', timeout: T});
        s.button = flat(await btn.innerText(), 60);
        await sleep(600);
        await btn.click();
        const vsel = page.locator('select[name="versionStage"]');
        const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Publish', exact: true})}).last();
        const which = await Promise.race([
            vsel.waitFor({state: 'visible', timeout: 20_000}).then(() => 'stage'),
            confirm.waitFor({state: 'visible', timeout: 20_000}).then(() => 'confirm'),
        ]).catch(() => null);
        if (which === 'stage') {
            const opts = await vsel.locator('option').evaluateAll((os) => os.map((o) => ({v: o.value, t: o.textContent.trim()})));
            const pick = opts.find((o) => stageRe.test(o.t));
            if (pick) await vsel.selectOption(pick.v);
            await page.getByRole('button', {name: 'Confirm', exact: true}).last().click();
            await confirm.waitFor({state: 'visible', timeout: T});
        }
        await idle(page);
        s.confirmText = flat(await confirm.innerText().catch(() => ''), 300);
        const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T}).catch(() => null);
        await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
        const r = await done;
        s.status = r ? r.status() : null;
        await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        return s;
    }
    async function addBio(P, b, name, text) {
        const {ContributorsScreen} = require(path.join(REPO, 'apps/omp/playwright/pages/ContributorPages.js'));
        try {
            await openWorkflow(P, b.id, `publication_${b.pub}_contributors`);
            const cs = new ContributorsScreen(page);
            const dlg = await cs.openRowEdit(name);
            const ifr = dlg.locator('iframe[id*="biography"]').first();
            await ifr.waitFor({timeout: T});
            const eid = (await ifr.getAttribute('id')).replace(/_ifr$/, '');
            await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), eid, {timeout: T});
            await page.frameLocator(`#${eid}_ifr`).locator('body').click();
            await page.keyboard.type(text);
            await sleep(300);
            await cs.fillPersonFields(dlg, {country: 'Canada'}).catch(() => {});
            await cs.savePanel(dlg);
            return 'saved';
        } catch (e) {
            const sb = await snap(page, `bio-failed-${b.id}`);
            return {err: String(e.message).split('\n')[0], dialog: flat(sb.text && sb.text.dialog, 400)};
        }
    }
    /** Tick contributor roles (by label regex) on a version's Contributors page. */
    async function setRoles(P, b, name, want) {
        const {ContributorsScreen} = require(path.join(REPO, 'apps/omp/playwright/pages/ContributorPages.js'));
        try {
            await openWorkflow(P, b.id, `publication_${b.pub}_contributors`);
            const cs = new ContributorsScreen(page);
            await page.locator('.contributorsListPanel').first().waitFor({timeout: T}).catch(() => {});
            await idle(page);
            const dlg = await cs.openRowEdit(name);
            await idle(page);
            await sleep(500);
            const boxes = await dlg.getByRole('checkbox').evaluateAll((els) => els.map((b) => `${(b.closest('label')?.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()}=${b.checked}`));
            for (const [re, v] of want) {
                const box = dlg.getByRole('checkbox', {name: re}).first();
                if (await box.count()) {
                    if (v) await box.check(); else await box.uncheck();
                }
            }
            await snap(page, `roles-${b.id}-${name.replace(/\W+/g, '')}`, {boxes});
            await cs.savePanel(dlg);
            return {boxes};
        } catch (e) {
            await snap(page, `roles-failed-${b.id}`);
            return {err: String(e.message).split('\n')[0]};
        }
    }
    async function saveLicense(P, b, licenseUrl) {
        try {
            const {saveLicenseFields} = require(path.join(REPO, 'apps/omp/playwright/pages/PublicationPages.js'));
            await openWorkflow(P, b.id, `publication_${b.pub}_license`);
            await saveLicenseFields(page, {licenseUrl});
            return 'saved';
        } catch (e) {
            return {err: String(e.message).split('\n')[0]};
        }
    }
    async function chaptersPage(P, sid, pub) {
        const {ChaptersPage} = require(path.join(REPO, 'apps/omp/playwright/pages/ChapterPages.js'));
        await openWorkflow(P, sid, `publication_${pub}_chapters`);
        const cp = new ChaptersPage(page, P);
        await cp.list.expectLoaded();
        await idle(page);
        return cp;
    }
    const chapterRows = (sid) => sql(`select c.chapter_id, c.publication_id, c.source_chapter_id, c.seq, c.doi_id, (select setting_value from submission_chapter_settings s where s.chapter_id=c.chapter_id and s.setting_name='title' and s.locale='en') as title, (select setting_value from submission_chapter_settings s where s.chapter_id=c.chapter_id and s.setting_name='isPageEnabled') as page from submission_chapters c join publications p on p.publication_id=c.publication_id where p.submission_id=${sid} order by c.publication_id, c.seq`);
    const pubRows = (sid) => sql(`select publication_id, status, date_published, version_stage, version_major, version_minor from publications where submission_id=${sid} order by 1`);

    // ---- CSL plugin row and window (as U13 K3) ----
    const cslRow = () => page.locator('#pluginGridContainer tr.gridRow[id$="-row-citationstylelanguageplugin"]');
    const cslForm = () => page.locator('#citationStyleLanguageSettingsForm');
    async function gotoPlugins(P) {
        await page.goto(ctxUrl(P, '/management/settings/website'));
        await idle(page);
        await page.locator('#plugins-button').first().click();
        await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T});
        await idle(page);
        await sleep(400);
    }
    async function cslRowRead() {
        const row = cslRow();
        const out = {count: await row.count()};
        if (!out.count) return out;
        out.text = flat(await row.innerText(), 200);
        out.checked = await row.getByRole('checkbox').first().isChecked().catch(() => null);
        const exp = row.locator('a.show_extras').first();
        if (await exp.count()) {
            await exp.click();
            await sleep(500);
        }
        const controls = page.locator('#pluginGridContainer tr[id$="-row-citationstylelanguageplugin"] + tr');
        out.links = await controls.locator('a').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()).filter(Boolean)).catch(() => []);
        return out;
    }
    async function cslWindowState() {
        return cslForm().evaluate((root) => {
            const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const lab = (i) => { const l = root.querySelector(`label[for="${i.id}"]`) || i.closest('label'); return l ? t(l) : null; };
            return {
                radios: [...root.querySelectorAll('input[type=radio]')].map((i) => `${i.checked ? '[x]' : '[ ]'} ${lab(i)} (${i.value})`),
                styles: [...root.querySelectorAll('input[type=checkbox][name="enabledCitationStyles[]"]')].map((i) => `${i.checked ? '[x]' : '[ ]'} ${lab(i)}`),
                downloads: [...root.querySelectorAll('input[type=checkbox][name="enabledCitationDownloads[]"]')].map((i) => `${i.checked ? '[x]' : '[ ]'} ${lab(i)}`),
                location: (() => { const i = root.querySelector('input[name="publisherLocation"]'); return i ? i.value : null; })(),
                text: t(root).slice(0, 1200),
            };
        });
    }
    async function openCslSettings(P) {
        await gotoPlugins(P);
        const row = await cslRowRead();
        const link = page.locator('#pluginGridContainer tr[id$="-row-citationstylelanguageplugin"] + tr').getByRole('link', {name: 'Settings', exact: true}).first();
        await link.click();
        await cslForm().locator('input[name="publisherLocation"]').waitFor({state: 'visible', timeout: T});
        await settled(page, cslForm().locator('label').first());
        await idle(page);
        await sleep(400);
        return row;
    }
    async function closeCsl(how) {
        const f = cslForm();
        if (how === 'cancel') {
            await f.getByRole('link', {name: 'Cancel', exact: true}).or(f.getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
        } else {
            await page.locator('[role="dialog"]:visible').filter({has: f}).last().getByRole('button', {name: /Close/}).first().click().catch(() => {});
        }
        await f.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        await idle(page);
        await sleep(700);
    }

    // ---- the "How to Cite" block on the visitor's page ----
    const cslTraffic = [];
    vis.on('response', (r) => {
        if (/citationstylelanguage\/(get|download)/.test(r.url())) cslTraffic.push({at: Date.now(), url: rel(r.url()).slice(0, 200), status: r.status(), disposition: r.headers()['content-disposition'] || null});
    });
    page.on('response', (r) => {
        if (/citationstylelanguage\/(get|download)/.test(r.url())) cslTraffic.push({at: Date.now(), who: 'mg', url: rel(r.url()).slice(0, 200), status: r.status(), disposition: r.headers()['content-disposition'] || null});
    });
    const cslSince = (t0) => cslTraffic.filter((x) => x.at >= t0);
    async function chooseStyle(pg, label) {
        const btn = pg.locator('[aria-controls="cslCitationFormats"]').first();
        if (!(await btn.count())) return {offered: false};
        if ((await btn.getAttribute('aria-expanded')) !== 'true') {
            await btn.click();
            await sleep(400);
        }
        const before = flat(await pg.locator('#citationOutput').innerText().catch(() => null), 1500);
        const link = pg.locator('#cslCitationFormats ul').first().locator('a').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)}).first();
        if (!(await link.count())) return {offered: false, styles: await pg.locator('#cslCitationFormats ul').first().locator('a').allInnerTexts()};
        const t0 = Date.now();
        const w = pg.waitForResponse((r) => /citationstylelanguage\/get/.test(r.url()), {timeout: 15_000}).catch(() => null);
        await link.click();
        await w;
        await sleep(900);
        const after = flat(await pg.locator('#citationOutput').innerText().catch(() => null), 1500);
        return {label, before, after, changed: before !== after, url: rel(pg.url()), traffic: cslSince(t0)};
    }
    async function downloadStyle(pg, label) {
        const btn = pg.locator('[aria-controls="cslCitationFormats"]').first();
        if (!(await btn.count())) return {offered: false};
        if ((await btn.getAttribute('aria-expanded')) !== 'true') {
            await btn.click();
            await sleep(400);
        }
        const link = pg.locator('#cslCitationFormats ul').nth(1).locator('a').filter({hasText: label}).first();
        if (!(await link.count())) return {offered: false};
        const out = {href: rel(await link.getAttribute('href'))};
        const t0 = Date.now();
        const dl = pg.waitForEvent('download', {timeout: 15_000}).catch(() => null);
        await link.click();
        const d = await dl;
        if (d) {
            out.filename = d.suggestedFilename();
            const p = await d.path().catch(() => null);
            if (p) out.text = fs.readFileSync(p, 'utf8').slice(0, 900);
        } else {
            out.noDownload = true;
            out.url = rel(pg.url());
        }
        await sleep(500);
        out.traffic = cslSince(t0);
        return out;
    }

    try {
        // =============================================================== OJS / OPS controls
        if (!isOmp) {
            if (on('ctl')) {
                const isOps = app.name === 'ops';
                await step('ctl-chapter-address', async (out) => {
                    await signOut(vis).catch(() => {});
                    for (const [k, p] of [['chapter', '/catalog/book/1/chapter/1'], ['book', '/catalog/book/1']]) {
                        const d = await visit(vis, ctxUrl(app.contextPath, p), `ctl-${k}`);
                        out[k] = {status: d.status, url: d.url, docTitle: d.docTitle, h1: d.h1, body: flat(d.bodyText, 200)};
                    }
                });
                const J = `${tag('u69k5')}j`;
                const S = {};
                await step('ctl-seed', async (out) => {
                    const spec = {tag: J, context: {name: {en: `K5 ${isOps ? 'Server' : 'Journal'} ${J}`}, acronym: 'KFJ', supportedLocales: ['en', 'fr_CA']},
                        users: users(J), plugins: {citationstylelanguageplugin: {enabled: true}}};
                    if (!isOps) spec.issues = [{volume: 1, number: 1, year: 2026, published: true}];
                    await must('scenarios/context', spec);
                    const r = await must('scenarios/submission', {tag: `${J}a1`, context: J, submitter: `${J}au`, title: 'K5 Control Item', published: true, ...(isOps ? {} : {issue: {volume: 1, number: 1, year: 2026}})});
                    S.id = r.submissionId;
                    Object.assign(out, {J, S});
                });
                await step('ctl-item', async (out) => {
                    const u = (lc) => ctxUrl(J, `/${isOps ? 'preprint' : 'article'}/view/${S.id}`, lc);
                    const en = await visit(vis, u('en'), 'ctl-item-en');
                    out.en = {status: en.status, docTitle: en.docTitle, cite: en.cite, raw: en.raw};
                    out.enBlock = await vis.evaluate(BLOCK).catch(() => null);
                    const fr = await visit(vis, u('fr_CA'), 'ctl-item-fr');
                    out.fr = {status: fr.status, docTitle: fr.docTitle, raw: fr.raw, text: flat(await vis.locator('.pkp_structure_main').innerText().catch(() => ''), 900)};
                    await visit(vis, u('en'), 'ctl-item-en-back');
                });
                await step('ctl-csl-window', async (out) => {
                    await as(`${J}mg`, J);
                    out.row = await openCslSettings(J);
                    await snap(page, 'ctl-csl-window');
                    out.window = await cslWindowState();
                    await closeCsl('cancel');
                });
            }
            return;
        }

        // =============================================================== OMP
        // ------------------------------------------------ chap: Fields "The chapter page", Rule 15, Setting 12
        if (on('chap')) {
            const C = `${tag('u69k5')}c`;
            const S = {};
            const bea = `${C}bea@example.org`;
            const lee = `${C}lee@example.org`;
            const cy = `${C}cy@example.org`;
            await step('chap-seed', async (out) => {
                await must('scenarios/context', pressSpec(C, {
                    series: [{path: 'mono', title: 'Monographs'}], categories: [{path: 'sci', title: 'Science'}],
                    doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'chapter', 'representation'],
                    plugins: {citationstylelanguageplugin: {enabled: true}},
                }));
                S.c1 = await seedBook(C, 'b1', 'K5 Chapter Book', {decisions: PROD, datePublished: '2024-03-05', series: 'mono', seriesPosition: '3', categories: ['sci'],
                    contributors: [{givenName: 'Bea', familyName: 'Second', email: bea}],
                    publicationFormats: [{name: 'PDF', file: 'article.pdf'}, {name: 'Online', urlRemote: 'https://example.org/u69k5-online'}],
                    chapters: [
                        {title: 'Tides', subtitle: 'Low and high', abstract: 'Tides chapter abstract.', pages: '1-20', page: true, authors: [`${C}au`], files: ['publicationFormats.0']},
                        {title: 'Harbours', authors: [bea]},
                        {title: 'Coda', page: true, authors: [`${C}au`, bea]},
                    ]});
                S.c2 = await seedBook(C, 'b2', 'K5 Edited Volume', {decisions: PROD, datePublished: '2024-03-05', workType: 'editedVolume',
                    contributors: [{givenName: 'Lee', familyName: 'Editor', email: lee}, {givenName: 'Cy', familyName: 'Writer', email: cy}],
                    chapters: [
                        {title: 'Essay', page: true, authors: [cy], licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/'},
                        {title: 'Second Essay', page: true, authors: [`${C}au`], licenseUrl: 'https://example.org/own-license'},
                        {title: 'Third Essay', page: true, authors: [lee]},
                    ]});
                S.c3 = await seedBook(C, 'b3', 'K5 Tick Book', {decisions: PROD, datePublished: '2024-03-05',
                    chapters: [{title: 'Plain', authors: [`${C}au`]}, {title: 'Paged', page: true, authors: [`${C}au`]}]});
                Object.assign(out, {C, S});
                note(`ccK5 [omp] ${RUN} chap: press ${C}, books ${JSON.stringify(Object.fromEntries(Object.entries(S).map(([k, v]) => [k, {id: v.id, pub: v.pub, chapters: v.chapters}])))}`);
            });
            await step('chap-screen-prep', async (out) => {
                await as(`${C}mg`, C);
                out.license1 = await saveLicense(C, S.c1, 'https://creativecommons.org/licenses/by/4.0/');
                out.bioAda = await addBio(C, S.c1, 'Ada Quillfeather', 'Ada writes about the sea.');
                out.bioBea = await addBio(C, S.c1, 'Bea Second', 'Bea studies harbours.');
                out.leeRoles = await setRoles(C, S.c2, 'Lee Editor', [[/Volume editor/i, true]]);
                out.license2 = await saveLicense(C, S.c2, 'https://creativecommons.org/licenses/by/4.0/');
                for (const k of ['c1', 'c2']) {
                    await openWorkflow(C, S[k].id, `publication_${S[k].pub}_titleAbstract`);
                    out[`${k}Publish`] = await publishOnScreen().catch((e) => ({err: String(e.message).split('\n')[0]}));
                }
                out.c1chapters = chapterRows(S.c1.id);
                out.c2chapters = chapterRows(S.c2.id);
                out.c3chapters = chapterRows(S.c3.id);
                out.pubs = pubRows(S.c1.id);
            });
            await step('chap-book', async (out) => {
                await asVis(null);
                const d = await visit(vis, ctxUrl(C, `/catalog/book/${S.c1.id}`), 'c-01-book');
                Object.assign(out, brief(d));
                await loc(vis, 'Book page: chapter title link in the table of contents', vis.locator('.item.chapters > ul > li a').filter({has: vis.locator('.title')}));
                // opened from the chapter's title in the table of contents
                out.fromToc = await follow(vis, vis.locator('.item.chapters > ul > li a').filter({hasText: 'Tides'}).first(), 'c-02-from-toc');
            });
            const chapNo = {};
            await step('chap-numbers', async (out) => {
                const rows = chapterRows(S.c1.id).split('\n').map((l) => l.split('|'));
                for (const r of rows) chapNo[r[5]] = r[2];
                Object.assign(out, chapNo);
            });
            await step('chap-tides', async (out) => {
                const u = ctxUrl(C, `/catalog/book/${S.c1.id}/chapter/${chapNo.Tides}`);
                const d = await visit(vis, u, 'c-03-tides-visitor');
                out.visitor = brief(d);
                out.visitorAria = (await vis.locator('.obj_chapter').ariaSnapshot().catch(() => '')).slice(0, 2500);
                out.block = await vis.evaluate(BLOCK);
                await loc(vis, 'Chapter page: root .obj_monograph_full.obj_chapter', vis.locator('.obj_monograph_full.obj_chapter'));
                await loc(vis, 'Chapter page: "Volume" link .item.monograph a', vis.locator('.obj_chapter .item.monograph a'));
                await loc(vis, 'Chapter page: cover link .item.cover a', vis.locator('.obj_chapter .item.cover a'));
                await loc(vis, 'Chapter page: date heading .item.date_published > .sub_item:not(.versions) .label', vis.locator('.obj_chapter .item.date_published > .sub_item:not(.versions) .label'));
                await loc(vis, 'Chapter page: DOI link .item.doi a', vis.locator('.obj_chapter .item.doi a'));
                await loc(vis, 'Chapter page: license .item.license', vis.locator('.obj_chapter .item.license'));
                // every role level: a Reader and the Press manager read the same page
                await asVis(`${C}rd`, C);
                out.reader = brief(await visit(vis, u, 'c-04-tides-reader'));
                await asVis(`${C}mg`, C);
                out.manager = brief(await visit(vis, u, 'c-05-tides-manager'));
                await asVis(null);
                await visit(vis, u, 'c-06-tides-visitor-again');
                // each link the page offers, pressed
                out.cover = await follow(vis, vis.locator('.obj_chapter .item.cover a'), 'c-07-cover');
                await visit(vis, u, 'c-06b');
                out.volume = await follow(vis, vis.locator('.obj_chapter .item.monograph a'), 'c-08-volume');
                await visit(vis, u, 'c-06c');
                out.series = await follow(vis, vis.locator('.obj_chapter .item.series a'), 'c-09-series');
                await visit(vis, u, 'c-06d');
                out.category = await follow(vis, vis.locator('.obj_chapter .item.categories a'), 'c-10-category');
                await visit(vis, u, 'c-06e');
                out.file = await follow(vis, vis.locator('.obj_chapter .item.files a').first(), 'c-11-file');
                await visit(vis, u, 'c-06f');
                out.doiHref = await vis.locator('.obj_chapter .item.doi a').first().getAttribute('href').catch(() => null);
                out.licenseHtml = flat(await vis.locator('.obj_chapter .item.license').innerHTML().catch(() => null), 500);
            });
            await step('chap-others', async (out) => {
                out.coda = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c1.id}/chapter/${chapNo.Coda}`), 'c-12-coda'));
                out.harbours = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c1.id}/chapter/${chapNo.Harbours}`), 'c-13-harbours-nopage'));
                out.unknown = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c1.id}/chapter/999999`), 'c-14-unknown'));
                out.otherBook = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c2.id}/chapter/${chapNo.Tides}`), 'c-15-other-books-chapter'));
                out.draftChapter = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c3.id}/chapter/${(chapterRows(S.c3.id).split('\n').map((l) => l.split('|')).find((r) => r[5] === 'Paged') || [])[2]}`), 'c-16-draft-chapter'));
            });
            await step('chap-edited', async (out) => {
                const rows = chapterRows(S.c2.id).split('\n').map((l) => l.split('|'));
                const no = Object.fromEntries(rows.map((r) => [r[5], r[2]]));
                out.book = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c2.id}`), 'c-20-edited-book'));
                out.essay = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c2.id}/chapter/${no.Essay}`), 'c-21-essay'));
                out.essayLicenseHtml = flat(await vis.locator('.obj_chapter .item.license').innerHTML().catch(() => null), 500);
                out.second = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c2.id}/chapter/${no['Second Essay']}`), 'c-22-second-essay'));
                out.secondLicenseHtml = flat(await vis.locator('.obj_chapter .item.license').innerHTML().catch(() => null), 500);
                out.third = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c2.id}/chapter/${no['Third Essay']}`), 'c-23-third-essay'));
                out.thirdLicenseHtml = flat(await vis.locator('.obj_chapter .item.license').innerHTML().catch(() => null), 500);
                out.chapterLicenses = sql(`select c.chapter_id, s.setting_value from submission_chapters c left join submission_chapter_settings s on s.chapter_id=c.chapter_id and s.setting_name='licenseUrl' where c.publication_id=${S.c2.pub} order by c.seq`);
            });
            await step('chap-tick', async (out) => {
                // Setting 12 on screen: tick "Plain", untick "Paged" (which may hold a DOI), then publish
                await as(`${C}mg`, C);
                const cp = await chaptersPage(C, S.c3.id, S.c3.pub);
                await snap(page, 'c-30-chapters-page');
                const boxState = async (win) => ({page: await win.chapterPageBox().isChecked().catch(() => null), disabled: await win.chapterPageBox().isDisabled().catch(() => null),
                    doiNote: await win.doiNote().count(), tabs: await win.tabs().allInnerTexts().catch(() => [])});
                let win = await cp.list.openEdit('Plain');
                out.plainBefore = await boxState(win);
                // leave the window once with a change unsaved
                await win.fill({title: 'Plain Changed'});
                const n0 = jsDialogs.length;
                await win.cancelLink().click().catch(() => {});
                await sleep(1200);
                out.cancelDialogs = dialogsSince(n0);
                await snap(page, 'c-31-after-cancel');
                await win.expectClosed().catch(() => {});
                out.listAfterCancel = flat(await cp.list.grid().innerText().catch(() => ''), 300);
                win = await cp.list.openEdit('Plain');
                await win.chapterPageBox().check();
                await snap(page, 'c-32-plain-ticked');
                await win.save();
                win = await cp.list.openEdit('Plain');
                out.plainReopened = await boxState(win);
                await win.cancel();
                win = await cp.list.openEdit('Paged');
                out.pagedBefore = await boxState(win);
                await snap(page, 'c-33-paged-window');
                await win.chapterPageBox().uncheck().catch((e) => { out.untickErr = String(e.message).split('\n')[0]; });
                await win.save().catch((e) => { out.pagedSaveErr = String(e.message).split('\n')[0]; });
                win = await cp.list.openEdit('Paged');
                out.pagedReopened = await boxState(win);
                await snap(page, 'c-34-paged-reopened');
                await win.cancel();
                await cp.reload().catch(() => {});
                win = await cp.list.openEdit('Paged');
                out.pagedAfterReload = await boxState(win);
                await win.cancel();
                out.rowsBeforePublish = chapterRows(S.c3.id);
                await openWorkflow(C, S.c3.id, `publication_${S.c3.pub}_titleAbstract`);
                out.publish = await publishOnScreen().catch((e) => ({err: String(e.message).split('\n')[0]}));
                out.rowsAfterPublish = chapterRows(S.c3.id);
                const rows = out.rowsAfterPublish.split('\n').map((l) => l.split('|'));
                const no = Object.fromEntries(rows.map((r) => [r[5], r[2]]));
                out.book = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c3.id}`), 'c-35-tick-book'));
                out.plainPage = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c3.id}/chapter/${no.Plain}`), 'c-36-plain-page'));
                out.pagedPage = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c3.id}/chapter/${no.Paged}`), 'c-37-paged-page'));
            });
            await step('chap-doi-untick', async (out) => {
                // Setting 12's other end: a chapter with a DOI (published "Tides") unticked on screen
                await as(`${C}mg`, C);
                const cp = await chaptersPage(C, S.c1.id, S.c1.pub);
                await snap(page, 'c-40-c1-chapters-page');
                out.pageNotice = flat(await page.locator('[role="dialog"]').first().innerText().catch(() => ''), 200);
                let win = await cp.list.openEdit('Tides');
                const st = async (w) => ({page: await w.chapterPageBox().isChecked().catch(() => null), disabled: await w.chapterPageBox().isDisabled().catch(() => null), doiNote: await w.doiNote().count(), tabs: await w.tabs().allInnerTexts().catch(() => [])});
                out.before = await st(win);
                await snap(page, 'c-41-tides-window');
                await win.chapterPageBox().uncheck().catch((e) => { out.untickErr = String(e.message).split('\n')[0]; });
                out.unticked = await st(win);
                await win.save().catch((e) => { out.saveErr = String(e.message).split('\n')[0]; });
                win = await cp.list.openEdit('Tides');
                out.reopened = await st(win);
                await snap(page, 'c-42-tides-reopened');
                await win.cancel().catch(() => {});
                out.rows = chapterRows(S.c1.id);
                const d = await visit(vis, ctxUrl(C, `/catalog/book/${S.c1.id}`), 'c-43-c1-book-after-untick');
                out.toc = brief(d).toc;
                out.tides = brief(await visit(vis, ctxUrl(C, `/catalog/book/${S.c1.id}/chapter/${chapNo.Tides}`), 'c-44-tides-after-untick'));
            });
        }

        // ------------------------------------------------ vers: Rules 15–18 across two versions, Setting 13
        if (on('vers')) {
            const W = `${tag('u69k5')}w`;
            const S = {};
            const no = {};
            await step('vers-seed', async (out) => {
                await must('scenarios/context', pressSpec(W, {doiPrefix: '10.1234', doiVersioning: true, plugins: {citationstylelanguageplugin: {enabled: true}}}));
                S.w = await seedBook(W, 'b1', 'K5 Versions Book', {published: true, datePublished: '2024-03-05', enableChapterPublicationDates: true,
                    chapters: [
                        {title: 'Tides', page: true, authors: [`${W}au`], datePublished: '2024-06-01'},
                        {title: 'Coda', page: true, authors: [`${W}au`]},
                        {title: 'Reef', page: true, authors: [`${W}au`]},
                        {title: 'Plain', authors: [`${W}au`]},
                    ]});
                Object.assign(out, {W, S, today: today()});
            });
            await step('vers-one', async (out) => {
                // a single published version: no "Versions" on the chapter page
                const rows = chapterRows(S.w.id).split('\n').map((l) => l.split('|'));
                for (const r of rows) no[r[5]] = r[2];
                out.no = no;
                await asVis(null);
                out.tides = brief(await visit(vis, ctxUrl(W, `/catalog/book/${S.w.id}/chapter/${no.Tides}`), 'w-01-tides-one-version'));
                out.reef = brief(await visit(vis, ctxUrl(W, `/catalog/book/${S.w.id}/chapter/${no.Reef}`), 'w-02-reef-one-version'));
            });
            await step('vers-two', async (out) => {
                await as(`${W}mg`, W);
                await openWorkflow(W, S.w.id);
                const v = await createVersion();
                S.v2 = v.id;
                out.version = v;
                const cp = await chaptersPage(W, S.w.id, v.id);
                await snap(page, 'w-03-v2-chapters');
                const del = await cp.list.openDelete('Coda');
                await cp.list.confirmDelete(del);
                const win = await cp.list.openAdd();
                await win.fill({title: 'Harbours'});
                await win.chapterPageBox().check();
                await win.contributorBox('Ada Quillfeather').check().catch(() => {});
                await win.save();
                await snap(page, 'w-04-v2-chapters-edited');
                await openWorkflow(W, S.w.id, `publication_${v.id}_titleAbstract`);
                out.publish = await publishOnScreen().catch((e) => ({err: String(e.message).split('\n')[0]}));
                out.pubs = pubRows(S.w.id);
                out.chapters = chapterRows(S.w.id);
                for (const r of out.chapters.split('\n').map((l) => l.split('|'))) if (r[5] === 'Harbours') no.Harbours = r[2];
                out.no = no;
            });
            const B = (p) => ctxUrl(W, `/catalog/book/${S.w.id}${p}`);
            const V1 = () => `/version/${S.w.pub}`;
            await step('vers-read', async (out) => {
                await asVis(null);
                out.bookCur = brief(await visit(vis, B(''), 'w-10-book-current'));
                out.bookV1 = brief(await visit(vis, B(V1()), 'w-11-book-v1'));
                out.tidesCur = brief(await visit(vis, B(`/chapter/${no.Tides}`), 'w-12-tides-current'));
                out.reefCur = brief(await visit(vis, B(`/chapter/${no.Reef}`), 'w-13-reef-current'));
                out.harboursCur = brief(await visit(vis, B(`/chapter/${no.Harbours}`), 'w-14-harbours-current'));
                out.codaCur = brief(await visit(vis, B(`/chapter/${no.Coda}`), 'w-15-coda-current'));
                out.tidesV1 = brief(await visit(vis, B(`${V1()}/chapter/${no.Tides}`), 'w-16-tides-v1'));
                out.codaV1 = brief(await visit(vis, B(`${V1()}/chapter/${no.Coda}`), 'w-17-coda-v1'));
                out.reefV1 = brief(await visit(vis, B(`${V1()}/chapter/${no.Reef}`), 'w-18-reef-v1'));
                out.harboursV1 = brief(await visit(vis, B(`${V1()}/chapter/${no.Harbours}`), 'w-19-harbours-v1'));
                out.plainCur = brief(await visit(vis, B(`/chapter/${no.Plain}`), 'w-20-plain-current'));
                out.v2Address = brief(await visit(vis, B(`/version/${S.v2}/chapter/${no.Tides}`), 'w-21-tides-v2-address'));
            });
            await step('vers-links', async (out) => {
                // Rule 18: the older chapter page's notice, cover and "Volume"; the current page's "Versions" link to v1
                await visit(vis, B(`${V1()}/chapter/${no.Tides}`), 'w-30');
                out.tidesV1Notice = await follow(vis, vis.locator('.obj_chapter > .cmp_notification a'), 'w-31-tides-v1-notice');
                await visit(vis, B(`${V1()}/chapter/${no.Tides}`), 'w-30b');
                out.tidesV1Cover = await follow(vis, vis.locator('.obj_chapter .item.cover a'), 'w-32-tides-v1-cover');
                await visit(vis, B(`${V1()}/chapter/${no.Tides}`), 'w-30c');
                out.tidesV1Volume = await follow(vis, vis.locator('.obj_chapter .item.monograph a'), 'w-33-tides-v1-volume');
                await visit(vis, B(`${V1()}/chapter/${no.Coda}`), 'w-30d');
                out.codaV1Notice = await follow(vis, vis.locator('.obj_chapter > .cmp_notification a'), 'w-34-coda-v1-notice');
                await visit(vis, B(`/chapter/${no.Tides}`), 'w-30e');
                out.tidesCurVersionLink = await follow(vis, vis.locator('.obj_chapter .sub_item.versions li a').first(), 'w-35-tides-cur-versions-link');
                await visit(vis, B(`/chapter/${no.Tides}`), 'w-30f');
                out.tidesCurCover = await follow(vis, vis.locator('.obj_chapter .item.cover a'), 'w-36-tides-cur-cover');
                await visit(vis, B(`/chapter/${no.Harbours}`), 'w-30g');
                out.harboursVersionLinks = await vis.locator('.obj_chapter .sub_item.versions li').evaluateAll((els) => els.map((e) => e.innerHTML.replace(/\s+/g, ' ').trim().slice(0, 300)));
            });
            await step('vers-formats', async (out) => {
                // Setting 13: change "Date (Short)" to Custom d/m/Y and "Date" to another preset
                await as(`${W}mg`, W);
                await page.goto(ctxUrl(W, '/management/settings/website'));
                await idle(page);
                await page.locator('#setup-button').first().click();
                await idle(page);
                await page.locator('#dateTime-button').first().click();
                await idle(page);
                await sleep(600);
                const pn = page.locator('[role="tabpanel"]#dateTime').first();
                await snap(page, 'w-40-datetime');
                const radios = async () => pn.locator('input[type=radio]').evaluateAll((rs) => rs.filter((r) => /^dateFormat(Short|Long)-en/.test(r.name)).map((r) => `${r.name}=${r.value}${r.checked ? '*' : ''} (${(r.closest('label') || r.parentElement).innerText.trim()})`));
                out.before = await radios();
                const longPick = await pn.locator('input[type=radio][name="dateFormatLong-en"]').evaluateAll((rs) => { const r = rs.find((x) => !x.checked && x.value === 'j F Y'); return r ? r.value : null; });
                if (longPick) await pn.locator(`input[type=radio][name="dateFormatLong-en"][value="${longPick}"]`).check();
                out.longPick = longPick;
                const custom = pn.locator('label.pkpFormField--options__option').filter({has: page.locator('input[type=radio][name="dateFormatShort-en"]')}).filter({hasText: 'Custom'}).first();
                await custom.locator('input[type=radio]').check();
                await custom.locator('input[type=text]').fill('d/m/Y');
                const resp = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await pn.getByRole('button', {name: 'Save', exact: true}).last().click();
                const r = await resp;
                out.save = r ? r.status() : null;
                await sleep(1500);
                out.afterSave = await radios();
                out.stored = sql(`select setting_name, locale, setting_value from press_settings where press_id=(select press_id from presses where path='${W}') and setting_name like 'dateFormat%'`);
                await asVis(null);
                out.tidesCur = brief(await visit(vis, B(`/chapter/${no.Tides}`), 'w-41-tides-current-new-formats'));
                out.reefCur = brief(await visit(vis, B(`/chapter/${no.Reef}`), 'w-42-reef-current-new-formats'));
                out.tidesV1 = brief(await visit(vis, B(`${V1()}/chapter/${no.Tides}`), 'w-43-tides-v1-new-formats'));
                out.bookCur = brief(await visit(vis, B(''), 'w-44-book-new-formats'));
            });
            // the default press (DOI versioning off): the older version's chapter page
            const V = `${tag('u69k5')}v`;
            const SV = {};
            await step('vers-default', async (out) => {
                await must('scenarios/context', pressSpec(V));
                SV.b = await seedBook(V, 'b1', 'K5 Default Versions', {published: true, datePublished: '2024-03-05', chapters: [{title: 'Tides', page: true, authors: [`${V}au`]}]});
                const n = chapterRows(SV.b.id).split('\n')[0].split('|')[2];
                await as(`${V}mg`, V);
                await openWorkflow(V, SV.b.id);
                const v = await createVersion();
                await openWorkflow(V, SV.b.id, `publication_${v.id}_titleAbstract`);
                out.publish = await publishOnScreen().catch((e) => ({err: String(e.message).split('\n')[0]}));
                await asVis(null);
                out.cur = brief(await visit(vis, ctxUrl(V, `/catalog/book/${SV.b.id}/chapter/${n}`), 'v-01-tides-current'));
                out.older = brief(await visit(vis, ctxUrl(V, `/catalog/book/${SV.b.id}/version/${SV.b.pub}/chapter/${n}`), 'v-02-tides-v1'));
                await visit(vis, ctxUrl(V, `/catalog/book/${SV.b.id}/chapter/${n}`), 'v-03');
                out.olderByList = await follow(vis, vis.locator('.obj_chapter .sub_item.versions li a').first(), 'v-04-tides-v1-from-list');
                out.bookV1Toc = brief(await visit(vis, ctxUrl(V, `/catalog/book/${SV.b.id}/version/${SV.b.pub}`), 'v-05-book-v1')).toc;
                Object.assign(out, {V, SV, n});
            });
        }

        // ------------------------------------------------ dates: Rule 16 heading, A13, Settings 11 and 13, CSL off
        if (on('dates')) {
            const D = `${tag('u69k5')}d`;
            const S = {};
            const no = {};
            await step('dates-seed', async (out) => {
                await must('scenarios/context', pressSpec(D));
                const ch = (t, extra = {}) => ({title: t, page: true, authors: [`${D}au`], ...extra});
                S.d1 = await seedBook(D, 'b1', 'K5 Year End', {published: true, datePublished: '2024-12-31', chapters: [ch('Tides')]});
                S.d2 = await seedBook(D, 'b2', 'K5 Own Dates', {published: true, datePublished: '2024-12-31', enableChapterPublicationDates: true,
                    chapters: [ch('Own', {datePublished: '2024-06-01'}), ch('NoOwn')]});
                S.d3 = await seedBook(D, 'b3', 'K5 Scheduled', {published: true, datePublished: '2027-01-15', chapters: [ch('Soon')]});
                S.d4 = await seedBook(D, 'b4', 'K5 Early Day', {published: true, datePublished: '2024-03-05', chapters: [ch('March')]});
                S.d5 = await seedBook(D, 'b5', 'K5 Neither Saved', {published: true, datePublished: '2024-12-31', chapters: [ch('Default')]});
                for (const k of Object.keys(S)) for (const r of chapterRows(S[k].id).split('\n').map((l) => l.split('|'))) no[r[5]] = r[2];
                Object.assign(out, {D, S: Object.fromEntries(Object.entries(S).map(([k, v]) => [k, {id: v.id, pub: v.pub, status: v.status}])), no,
                    subs: sql(`select submission_id, status from submissions where submission_id in (${Object.values(S).map((b) => b.id).join(',')}) order by 1`),
                    enableDates: sql(`select submission_id, setting_value from submission_settings where setting_name='enableChapterPublicationDates' and submission_id in (${Object.values(S).map((b) => b.id).join(',')})`)});
            });
            const C = (k, n) => ctxUrl(D, `/catalog/book/${S[k].id}${n ? `/chapter/${no[n]}` : ''}`);
            const readAll = async (label) => {
                const o = {};
                await asVis(null);
                o.d1Chapter = brief(await visit(vis, C('d1', 'Tides'), `d-${label}-d1-chapter`));
                o.d1Book = brief(await visit(vis, C('d1'), `d-${label}-d1-book`));
                o.d2Own = brief(await visit(vis, C('d2', 'Own'), `d-${label}-d2-own`));
                o.d2NoOwn = brief(await visit(vis, C('d2', 'NoOwn'), `d-${label}-d2-noown`));
                o.d4Chapter = brief(await visit(vis, C('d4', 'March'), `d-${label}-d4-chapter`));
                o.d4Book = brief(await visit(vis, C('d4'), `d-${label}-d4-book`));
                o.d3ChapterVisitor = brief(await visit(vis, C('d3', 'Soon'), `d-${label}-d3-chapter-visitor`));
                await asVis(`${D}mg`, D);
                o.d3ChapterManager = brief(await visit(vis, C('d3', 'Soon'), `d-${label}-d3-chapter-manager`));
                o.d3BookManager = brief(await visit(vis, C('d3'), `d-${label}-d3-book-manager`));
                await asVis(null);
                return o;
            };
            await step('dates-default', async (out) => {
                Object.assign(out, await readAll('default'));
                out.cslOff = {d1Chapter: out.d1Chapter.cite, d1Book: out.d1Book.cite};
            });
            await step('dates-csl-off-row', async (out) => {
                await as(`${D}mg`, D);
                await gotoPlugins(D);
                out.row = await cslRowRead();
                await snap(page, 'd-10-plugins-csl-off');
            });
            await step('dates-pubdates', async (out) => {
                // Setting 11: a new book stores neither option; save each and read after the save and after a reload
                const {ChaptersPage, PUBLICATION_DATES} = require(path.join(REPO, 'apps/omp/playwright/pages/ChapterPages.js'));
                const cp = new ChaptersPage(page, D);
                const state = async () => ({book: await cp.publicationDatesRadio(PUBLICATION_DATES.book).isChecked().catch(() => null), chapter: await cp.publicationDatesRadio(PUBLICATION_DATES.chapter).isChecked().catch(() => null)});
                await openWorkflow(D, S.d5.id);
                await cp.openPublicationDates();
                await snap(page, 'd-20-pubdates-d5-new');
                out.d5New = await state();
                out.groupText = flat(await cp.publicationDatesGroup().innerText().catch(() => ''), 300);
                // leave the page once with a change unsaved
                await cp.publicationDatesRadio(PUBLICATION_DATES.chapter).check();
                const n0 = jsDialogs.length;
                await cp.frame.select('Chapters').catch(async () => { await openWorkflow(D, S.d5.id, `publication_${S.d5.pub}_chapters`); });
                await sleep(1000);
                await snap(page, 'd-21-left-unsaved');
                out.leaveDialogs = dialogsSince(n0);
                await cp.openPublicationDates().catch(() => {});
                out.d5Back = await state();
                await openWorkflow(D, S.d5.id);
                await cp.openPublicationDates();
                out.d5Reopened = await state();
                out.d5Stored = sql(`select setting_value from submission_settings where setting_name='enableChapterPublicationDates' and submission_id=${S.d5.id}`);
                // D2: "Each chapter…" as seeded; save "All chapters…"
                await openWorkflow(D, S.d2.id);
                await cp.openPublicationDates();
                out.d2Seeded = await state();
                await cp.savePublicationDates(PUBLICATION_DATES.book);
                out.d2AfterSave = await state();
                await snap(page, 'd-22-d2-saved-book');
                await page.reload();
                await idle(page);
                await sleep(800);
                await cp.openPublicationDates();
                out.d2AfterReload = await state();
                out.d2Stored = sql(`select setting_value from submission_settings where setting_name='enableChapterPublicationDates' and submission_id=${S.d2.id}`);
                await asVis(null);
                out.d2OwnAllChapters = brief(await visit(vis, C('d2', 'Own'), 'd-23-d2-own-all-chapters'));
                await cp.savePublicationDates(PUBLICATION_DATES.chapter);
                out.d2BackToChapter = await state();
                out.d2OwnEachChapter = brief(await visit(vis, C('d2', 'Own'), 'd-24-d2-own-each-chapter'));
            });
            await step('dates-dmy', async (out) => {
                // td16: "Date (Short)" Custom d/m/Y
                await as(`${D}mg`, D);
                await page.goto(ctxUrl(D, '/management/settings/website'));
                await idle(page);
                await page.locator('#setup-button').first().click();
                await idle(page);
                await page.locator('#dateTime-button').first().click();
                await idle(page);
                await sleep(600);
                const pn = page.locator('[role="tabpanel"]#dateTime').first();
                const radios = async (p = pn) => p.locator('input[type=radio]').evaluateAll((rs) => rs.filter((r) => /^dateFormat(Short|Long)-en/.test(r.name)).map((r) => `${r.name}=${r.value}${r.checked ? '*' : ''}`));
                out.before = await radios();
                const custom = pn.locator('label.pkpFormField--options__option').filter({has: page.locator('input[type=radio][name="dateFormatShort-en"]')}).filter({hasText: 'Custom'}).first();
                await custom.locator('input[type=radio]').check();
                await custom.locator('input[type=text]').fill('d/m/Y');
                // leave the tab once with the change unsaved (another side tab, then back)
                await page.locator('#lists-button').first().click().catch(() => {});
                await idle(page);
                await sleep(400);
                await page.locator('#dateTime-button').first().click();
                await idle(page);
                await sleep(400);
                out.afterTabSwitch = {radios: await radios(), custom: await custom.locator('input[type=text]').inputValue().catch(() => null)};
                const resp = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await pn.getByRole('button', {name: 'Save', exact: true}).last().click();
                const r = await resp;
                out.save = r ? r.status() : null;
                await sleep(1500);
                out.afterSave = await radios();
                await snap(page, 'd-30-dmy-saved');
                await page.reload();
                await idle(page);
                await page.locator('#setup-button').first().click();
                await idle(page);
                await page.locator('#dateTime-button').first().click();
                await idle(page);
                await sleep(600);
                out.afterReload = {radios: await radios(), custom: await page.locator('[role="tabpanel"]#dateTime').first().locator('label.pkpFormField--options__option').filter({has: page.locator('input[type=radio][name="dateFormatShort-en"]')}).filter({hasText: 'Custom'}).first().locator('input[type=text]').inputValue().catch(() => null)};
                out.stored = sql(`select setting_name, locale, setting_value from press_settings where press_id=(select press_id from presses where path='${D}') and setting_name like 'dateFormat%'`);
                Object.assign(out, await readAll('dmy'));
            });
        }

        // ------------------------------------------------ cite: Rule 19 (td18), A14, Settings 3–4
        if (on('cite')) {
            const K = `${tag('u69k5')}k`;
            const S = {};
            const bea = `${K}bea@example.org`;
            const lee = `${K}lee@example.org`;
            const tom = `${K}tom@example.org`;
            await step('cite-seed', async (out) => {
                await must('scenarios/context', pressSpec(K, {series: [{path: 'mono', title: 'Monographs'}], plugins: {citationstylelanguageplugin: {enabled: true}}}));
                S.k1 = await seedBook(K, 'b1', 'Tides', {published: true, datePublished: '2024-03-05', series: 'mono', seriesPosition: '3',
                    contributors: [{givenName: 'Bea', familyName: 'Second', email: bea}],
                    chapters: [{title: 'Harbours', page: true, pages: '5-9', authors: [bea]}]});
                S.k2 = await seedBook(K, 'b2', 'Solo Book', {published: true, datePublished: '2024-03-05'});
                S.k3 = await seedBook(K, 'b3', 'Edited Book', {decisions: PROD, datePublished: '2024-03-05', workType: 'editedVolume',
                    contributors: [{givenName: 'Lee', familyName: 'Editor', email: lee}, {givenName: 'Tom', familyName: 'Translator', email: tom}],
                    chapters: [{title: 'Essay', page: true, pages: '1-10', authors: [`${K}au`]}]});
                S.k4 = await seedBook(K, 'b4', 'Draft Book', {decisions: PROD, datePublished: '2024-03-05', chapters: [{title: 'Draft Chapter', page: true, authors: [`${K}au`]}]});
                Object.assign(out, {K, S: Object.fromEntries(Object.entries(S).map(([k, v]) => [k, {id: v.id, pub: v.pub, status: v.status, chapters: v.chapters}]))});
                note(`ccK5 [omp] ${RUN} cite: press ${K}, books ${JSON.stringify(out.S)}`);
            });
            await step('cite-roles', async (out) => {
                await as(`${K}mg`, K);
                out.lee = await setRoles(K, S.k3, 'Lee Editor', [[/^Volume editor$/i, true], [/^Author$/i, false]]);
                out.tom = await setRoles(K, S.k3, 'Tom Translator', [[/^Translator$/i, true], [/^Author$/i, false]]);
                await openWorkflow(K, S.k3.id, `publication_${S.k3.pub}_titleAbstract`);
                out.publish = await publishOnScreen().catch((e) => ({err: String(e.message).split('\n')[0]}));
            });
            const no = (b) => Object.fromEntries(chapterRows(S[b].id).split('\n').map((l) => l.split('|')).map((r) => [r[5], r[2]]));
            const readCite = async (url, name) => {
                const d = await visit(vis, url, name);
                const block = await vis.evaluate(BLOCK).catch(() => null);
                return {status: d.status, docTitle: d.docTitle, contributors: (d.mainItems || []).filter((i) => /authors/.test(i.cls)).map((i) => i.text), block};
            };
            await step('cite-visitor', async (out) => {
                await asVis(null);
                out.k1Book = await readCite(ctxUrl(K, `/catalog/book/${S.k1.id}`), 'k-01-k1-book');
                out.k1BookMla = await chooseStyle(vis, 'MLA');
                out.k1BookBib = await downloadStyle(vis, 'BibTeX');
                out.k1Chapter = await readCite(ctxUrl(K, `/catalog/book/${S.k1.id}/chapter/${no('k1').Harbours}`), 'k-02-k1-chapter');
                out.k1ChapterMla = await chooseStyle(vis, 'MLA');
                await snap(vis, 'k-03-k1-chapter-mla');
                out.k1ChapterBib = await downloadStyle(vis, 'BibTeX');
                out.k1ChapterRis = await downloadStyle(vis, 'RIS');
                out.k2Book = await readCite(ctxUrl(K, `/catalog/book/${S.k2.id}`), 'k-04-k2-solo-book');
                out.k3Book = await readCite(ctxUrl(K, `/catalog/book/${S.k3.id}`), 'k-05-k3-edited-book');
                out.k3BookMla = await chooseStyle(vis, 'MLA');
                out.k3Chapter = await readCite(ctxUrl(K, `/catalog/book/${S.k3.id}/chapter/${no('k3').Essay}`), 'k-06-k3-chapter');
                out.k3ChapterMla = await chooseStyle(vis, 'MLA');
                await loc(vis, 'Book page: "How to Cite" citation #citationOutput', vis.locator('#citationOutput'));
                await loc(vis, 'Book page: "More Citation Formats" [aria-controls="cslCitationFormats"]', vis.locator('[aria-controls="cslCitationFormats"]'));
            });
            await step('cite-seeded', async (out) => {
                // A14's sighting: a seeded published book of publicknowledge, read-only
                await asVis(null);
                await vis.goto(ctxUrl(app.contextPath, '/catalog'));
                await idle(vis);
                const hrefs = await vis.locator('.obj_monograph_summary a[href*="/catalog/book/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))].slice(0, 3));
                out.hrefs = hrefs.map(rel);
                out.books = [];
                for (const [i, h] of hrefs.entries()) out.books.push(await readCite(h, `k-09-seeded-book-${i}`));
            });
            await step('cite-author-preview', async (out) => {
                // td18: the book's Author on an unpublished preview chooses another format
                await asVis(`${K}au`, K);
                out.book = await readCite(ctxUrl(K, `/catalog/book/${S.k4.id}`), 'k-10-author-preview-book');
                out.bookMla = await chooseStyle(vis, 'MLA');
                await snap(vis, 'k-11-author-preview-mla');
                out.bookBib = await downloadStyle(vis, 'BibTeX');
                out.chapter = await readCite(ctxUrl(K, `/catalog/book/${S.k4.id}/chapter/${no('k4')['Draft Chapter']}`), 'k-12-author-preview-chapter');
                out.chapterMla = await chooseStyle(vis, 'MLA');
                // the Press manager, the other level
                await asVis(`${K}mg`, K);
                out.mgBook = await readCite(ctxUrl(K, `/catalog/book/${S.k4.id}`), 'k-13-manager-preview-book');
                out.mgBookMla = await chooseStyle(vis, 'MLA');
                await asVis(null);
            });
            await step('cite-settings', async (out) => {
                // Settings 3–4: the plugin row and the Settings window's defaults on a new press
                await as(`${K}mg`, K);
                out.row = await openCslSettings(K);
                await snap(page, 'k-20-csl-window');
                out.window = await cslWindowState();
                await loc(page, 'CSL settings form #citationStyleLanguageSettingsForm', cslForm());
                // leave once with changes unsaved: Cancel, then reopen
                const f = cslForm();
                await f.locator('input[type=radio][name="primaryCitationStyle"]').nth(2).check().catch(() => {});
                await f.locator('input[type=checkbox][name="enabledCitationDownloads[]"]').first().uncheck().catch(() => {});
                await f.locator('input[name="publisherLocation"]').fill('Prague');
                await f.locator('input[name="publisherLocation"]').blur();
                const n0 = jsDialogs.length;
                await closeCsl('cancel');
                out.cancelDialogs = dialogsSince(n0);
                await snap(page, 'k-21-after-cancel');
                await openCslSettings(K);
                out.reopened = await cslWindowState();
                // the x close too
                await cslForm().locator('input[name="publisherLocation"]').fill('Brno');
                await cslForm().locator('input[name="publisherLocation"]').blur();
                const n1 = jsDialogs.length;
                await closeCsl('x');
                out.closeDialogs = dialogsSince(n1);
                await openCslSettings(K);
                out.reopened2 = await cslWindowState();
                await closeCsl('cancel');
                out.stored = sql(`select setting_name, setting_value from plugin_settings where plugin_name='citationstylelanguageplugin' and context_id=(select press_id from presses where path='${K}')`);
            });
        }

        // ------------------------------------------------ mgsub: A14's axis, a book submitted by the Press manager (as U13 K3 seeded it)
        if (on('mgsub')) {
            const M = `${tag('u69k5')}m`;
            await step('mgsub', async (out) => {
                await must('scenarios/context', pressSpec(M, {plugins: {citationstylelanguageplugin: {enabled: true}}}));
                const r = await must('scenarios/submission', {tag: `${M}b1`, context: M, submitter: `${M}mg`, title: 'Manager Book', published: true, datePublished: '2024-03-05',
                    chapters: [{title: 'Manager Chapter', page: true, authors: [`${M}mg`]}]}).catch((e) => ({err: String(e.message).slice(0, 300)}));
                if (r.err) {
                    out.withChapterErr = r.err;
                    Object.assign(r, await must('scenarios/submission', {tag: `${M}b2`, context: M, submitter: `${M}mg`, title: 'Manager Book', published: true, datePublished: '2024-03-05'}));
                }
                out.M = M;
                out.id = r.submissionId;
                await asVis(null);
                const d = await visit(vis, ctxUrl(M, `/catalog/book/${r.submissionId}`), 'm-01-manager-book');
                out.book = brief(d);
                out.block = await vis.evaluate(BLOCK).catch(() => null);
                out.mla = await chooseStyle(vis, 'MLA');
                const ch = (d.toc || []).find((c) => c.link);
                if (ch) {
                    const c = await visit(vis, ch.link, 'm-02-manager-chapter');
                    out.chapter = brief(c);
                }
                out.authorCount = sql(`select count(*) from authors where publication_id=${r.publicationId}`);
                // the Contributors page as the manager sees it
                await as(`${M}mg`, M);
                await openWorkflow(M, r.submissionId, `publication_${r.publicationId}_contributors`);
                await idle(page);
                await sleep(800);
                const sn = await snap(page, 'm-03-contributors');
                out.contributorsPage = flat(sn.text && sn.text.dialog, 900);
            });
        }

        // ------------------------------------------------ fr: Rule 21 (td20), A15
        if (on('fr')) {
            const F = `${tag('u69k5')}f`;
            const S = {};
            const no = {};
            await step('fr-seed', async (out) => {
                const spec = pressSpec(F, {
                    context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']},
                    series: [{path: 'mono', title: 'Monographs'}], categories: [{path: 'sci', title: 'Science'}],
                    doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'chapter', 'representation'], doiVersioning: true,
                    payments: {enabled: true, currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay by cheque.'},
                });
                let r = await post('scenarios/context', spec);
                if (r.status !== 200) {
                    out.firstTry = {status: r.status, json: JSON.stringify(r.json).slice(0, 300)};
                    delete spec.context.supportedSubmissionLocales;
                    r = await post('scenarios/context', spec);
                }
                if (r.status !== 200) throw new Error(`context ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`);
                S.f1 = await seedBook(F, 'b1', 'K5 French Book', {published: true, datePublished: '2024-03-05', series: 'mono', categories: ['sci'],
                    keywords: ['alpha', 'beta'],
                    publicationFormats: [{name: 'PDF', file: 'article.pdf', price: '25.00'}, {name: 'Free', file: 'replacement.pdf'}],
                    chapters: [{title: 'Tides', page: true, pages: '1-20', authors: [`${F}au`]}, {title: 'Coda', page: true, authors: [`${F}au`]}]});
                S.f2 = await seedBook(F, 'b2', 'K5 Scheduled FR', {published: true, datePublished: '2027-01-15', chapters: [{title: 'Soon', page: true, authors: [`${F}au`]}]});
                S.f3 = await seedBook(F, 'b3', 'K5 Draft FR', {decisions: PROD, chapters: [{title: 'Draft', page: true, authors: [`${F}au`]}]});
                for (const k of Object.keys(S)) for (const r2 of chapterRows(S[k].id).split('\n').map((l) => l.split('|'))) no[r2[5]] = r2[2];
                Object.assign(out, {F, S: Object.fromEntries(Object.entries(S).map(([k, v]) => [k, {id: v.id, pub: v.pub, status: v.status, formats: v.formats}])), no});
                note(`ccK5 [omp] ${RUN} fr: press ${F}, books ${JSON.stringify(out.S)}`);
            });
            await step('fr-screen-prep', async (out) => {
                await as(`${F}mg`, F);
                try {
                    const {SectionsTab} = require(path.join(REPO, 'shared/playwright/pages/SectionsPages.js'));
                    const tab = new SectionsTab(page, F, {tab: 'Series', addLabel: 'Add Series'});
                    await tab.goto();
                    const win = await tab.openEdit('Monographs');
                    await win.box('onlineIssn').fill('0378-5955');
                    await win.box('printIssn').fill('2049-3630');
                    out.seriesSave = (await win.save()).status();
                } catch (e) {
                    out.seriesErr = String(e.message).split('\n')[0];
                }
                await openWorkflow(F, S.f1.id);
                const v = await createVersion();
                S.v2 = v.id;
                const cp = await chaptersPage(F, S.f1.id, v.id);
                const del = await cp.list.openDelete('Coda');
                await cp.list.confirmDelete(del);
                const win = await cp.list.openAdd();
                await win.fill({title: 'Harbours'});
                await win.chapterPageBox().check();
                await win.save();
                await openWorkflow(F, S.f1.id, `publication_${v.id}_titleAbstract`);
                out.publish = await publishOnScreen().catch((e) => ({err: String(e.message).split('\n')[0]}));
                for (const r2 of chapterRows(S.f1.id).split('\n').map((l) => l.split('|'))) no[r2[5]] = r2[2];
                out.no = no;
                out.pubs = pubRows(S.f1.id);
                out.chapters = chapterRows(S.f1.id);
            });
            const U = (p, lc) => ctxUrl(F, `/catalog/book/${S.f1.id}${p}`, lc);
            const frRead = async (url, name) => {
                const d = await visit(vis, url, name);
                const b = brief(d);
                return {...b, fileLinks: d.fileLinks.map((l) => `${l.t} -> ${rel(l.h)}`), text: flat(await vis.locator('.obj_monograph_full').innerText().catch(() => d.bodyText), 1500)};
            };
            await step('fr-toggle', async (out) => {
                // choosing the language on screen, as td20 asks
                await asVis(null);
                await visit(vis, U('', 'en'), 'f-00-book-en');
                const t = vis.getByRole('link', {name: /Français/}).first();
                out.toggleOffered = await t.count();
                out.toggleTexts = await vis.getByRole('link', {name: /Français|English/}).allInnerTexts().catch(() => []);
                if (out.toggleOffered) {
                    out.toggle = await follow(vis, t, 'f-01-after-toggle');
                }
            });
            await step('fr-read', async (out) => {
                out.bookCur = await frRead(U('', 'fr_CA'), 'f-10-book-current-fr');
                out.bookV1 = await frRead(U(`/version/${S.f1.pub}`, 'fr_CA'), 'f-11-book-v1-fr');
                out.tidesCur = await frRead(U(`/chapter/${no.Tides}`, 'fr_CA'), 'f-12-tides-current-fr');
                out.tidesV1 = await frRead(U(`/version/${S.f1.pub}/chapter/${no.Tides}`, 'fr_CA'), 'f-13-tides-v1-fr');
                out.harboursCur = await frRead(U(`/chapter/${no.Harbours}`, 'fr_CA'), 'f-14-harbours-current-fr');
                out.codaV1 = await frRead(U(`/version/${S.f1.pub}/chapter/${no.Coda}`, 'fr_CA'), 'f-14b-coda-v1-fr');
                // the view page of the free file, its tab
                await visit(vis, U('', 'fr_CA'), 'f-15');
                const free = vis.locator('a[href*="/catalog/view/"]').filter({hasText: /Free/}).first();
                out.freeView = await follow(vis, free, 'f-16-free-view-fr');
                out.freeViewTitle = await vis.title().catch(() => null);
                // the English control of the same pages
                out.bookCurEn = await frRead(U('', 'en'), 'f-20-book-current-en');
                out.tidesCurEn = await frRead(U(`/chapter/${no.Tides}`, 'en'), 'f-21-tides-current-en');
                out.harboursCurEn = await frRead(U(`/chapter/${no.Harbours}`, 'en'), 'f-22-harbours-current-en');
            });
            await step('fr-manager', async (out) => {
                // forthcoming (a scheduled book's preview) and the preview notice, in French
                await asVis(`${F}mg`, F);
                out.schedBook = await frRead(ctxUrl(F, `/catalog/book/${S.f2.id}`, 'fr_CA'), 'f-30-scheduled-book-fr');
                out.schedChapter = await frRead(ctxUrl(F, `/catalog/book/${S.f2.id}/chapter/${no.Soon}`, 'fr_CA'), 'f-31-scheduled-chapter-fr');
                out.draftBook = await frRead(ctxUrl(F, `/catalog/book/${S.f3.id}`, 'fr_CA'), 'f-32-draft-book-fr');
                out.draftChapter = await frRead(ctxUrl(F, `/catalog/book/${S.f3.id}/chapter/${no.Draft}`, 'fr_CA'), 'f-33-draft-chapter-fr');
                out.schedChapterEn = await frRead(ctxUrl(F, `/catalog/book/${S.f2.id}/chapter/${no.Soon}`, 'en'), 'f-34-scheduled-chapter-en');
                await asVis(null);
            });
        }
    } finally {
        fact('crashes', crashes);
        fact('jsDialogs', jsDialogs);
        await mg.close().catch(() => {});
        await vs.close().catch(() => {});
    }
});
