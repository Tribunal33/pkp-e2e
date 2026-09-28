// U69 claim check K2: reaching the book's page and its versions (spec Fields
// "The book's page", Rules 1–9 incl. 3a, Settings bullets 6–8, register
// A1–A5; footnotes c, d, g, h, j, r, td2–td9, td23, td24, f-a1–f-a5).
//
// OMP: every phase seeds its own scratch press (scenarios.md), signs in as
// that press's roles for the screen actions, and a signed-out visitor reads
// the public pages in a second browser. OJS and OPS: read-only controls on
// publicknowledge (multi-app rule 4): the book addresses, and an article's
// (preprint's) unknown address (A1's comparison).
//
// Phases (PHASES=a,b,… picks; default all):
//   ctl    td4 on the seeded press (unknown number / path; visitor, reader.rosa); OJS/OPS controls
//   addr   Rules 1, 2 (td2): every link that leads to the page; URL Path; the forward after a path change
//   none   Rules 3, 4 (td3, td6), A2, A3: unpublished, scheduled, Author-Original-only books; version addresses;
//          td7 / A4 and Rule 8's rewrite by a new version
//   bio    Fields: "Author Biography" (one contributor with a biography) and "Author Biographies" (two)
//   ao2    A2: the workflow's status, header and "View" on an Author-Original-only book
//   prev   Rule 5 (td7, part of td5): the preview per role, "View submission", workflow "Preview";
//          a saved date / a future date on an unpublished version (Rule 5's axis, td9)
//   ver    Rules 6, 8, 9 (td8, td9, td23), A5: two published versions with different titles,
//          a third unpublished, the second unpublished again; the press's date formats changed
//   parts  Fields tables, Rule 7 (td24): the minimal book and a full one (cover, series ISSN, DOI,
//          keywords, synopsis, summary, references, chapters, formats, license, How to Cite, chart)
//   set    Settings 6–8: restrictMonographAccess, restrictSiteAccess, a press not enabled
//
// Run: RUN=r1 PROBE_FEATURE=U69 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U69/K2/k2.js
// (ONLY=omp narrows; PHASES=addr,none picks; RUN names the facts file and the snapshots, so two runs
// keep separate records). OMP outlasts 600 s: run detached (patterns.md "Probe kit").
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, drainJobs} = require('../../../probe');

const PHASES = (process.env.PHASES || 'ctl,addr,none,ao2,bio,prev,ver,parts,set').split(',');
const on = (p) => PHASES.includes(p);
const RUN = process.env.RUN || 'r1';
const T = 30_000;
const REPO = path.join(__dirname, '../../../../..');
const FILES = path.join(REPO, 'apps/omp/playwright/fixtures/files');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php/, '');
const PROD = ['skipExternalReview', 'sendToProduction'];

const facts = {};
function fact(key, value) {
    facts[key] = value;
    record(`facts-${RUN}`, {[key]: value}, {merge: true});
    console.log(`[fact] ${key}: ${JSON.stringify(value).slice(0, 1200)}`);
}
async function step(name, fn) {
    const out = {};
    try {
        return await fn(out);
    } catch (e) {
        out.ERR = String((e && e.message) || e).split('\n').slice(0, 4).join(' | ');
        return null;
    } finally {
        if (Object.keys(out).length) fact(name, out);
    }
}
async function snap(page, name, extra = {}) {
    const s = await screen(page).catch((e) => ({screenError: String(e.message || e)}));
    record(`${RUN}-${name}`, {...s, ...extra});
    await shot(page, `${RUN}-${name}`).catch(() => {});
    return s;
}
async function post(app, route, body) {
    const r = await fetch(app.url(`/index.php/index/api/v1/_test/${route}`), {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-Test-Key': app.testApiKey},
        body: JSON.stringify(body),
    });
    const json = await r.json().catch(() => null);
    return {status: r.status, json};
}
async function must(app, route, body) {
    const r = await post(app, route, body);
    if (r.status !== 200) throw new Error(`${route} ${r.status} ${JSON.stringify(r.json).slice(0, 400)}`);
    return r.json;
}
const sql = (app, q) => {
    try {
        return execFileSync('psql', ['-d', app.db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
    } catch (e) {
        return `SQL ERROR ${String(e.stderr).trim()}`;
    }
};
const ctxUrl = (app, P, p = '', lc = '') => app.url(`/index.php/${P}${lc ? `/${lc}` : ''}${p}`);
function today() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function pressSpec(P, extraUsers = [], extra = {}) {
    return {
        tag: P,
        context: {name: {en: `K2 Press ${P}`}, ...(extra.context || {})},
        users: [{username: `${P}mg`, roles: ['manager']}, {username: `${P}au`, roles: ['author']}, {username: `${P}rd`, roles: ['reader']}, ...extraUsers],
        ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'context')),
    };
}
async function seedBook(app, P, key, title, extra = {}) {
    const r = await must(app, 'scenarios/submission', {tag: `${P}${key}`, context: P, submitter: `${P}au`, title, ...extra});
    return {id: r.submissionId, pub: r.publicationId, stageId: r.stageId, status: r.status, formats: r.publicationFormats, chapters: r.chapters};
}

// ---------------------------------------------------------------- the book's page as data
const BOOK = () => {
    const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
    const rect = (e) => { const r = e.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width)}; };
    const full = document.querySelector('.obj_monograph_full');
    const lab = (el) => {
        const l = el.querySelector(':scope > .label, :scope > h2, :scope > .sub_item > .label, :scope > .sub_item > h2');
        return l ? `${l.classList.contains('pkp_screen_reader') ? '(sr)' : ''}${txt(l) || l.textContent.trim()}` : null;
    };
    const item = (el) => ({cls: String(el.className || el.tagName).replace(/\bitem\b\s*/, '').trim() || el.tagName.toLowerCase(), label: lab(el), text: txt(el).slice(0, 260)});
    const main = full && full.querySelector('.main_entry');
    const side = full && full.querySelector('.entry_details');
    const cover = side && side.querySelector('.item.cover');
    const img = cover && cover.querySelector('img');
    const dp = side && side.querySelector('.item.date_published');
    const abs = main && main.querySelector('.item.abstract .value');
    return {
        docTitle: document.title,
        h1: txt(document.querySelector('h1')),
        h1html: full && full.querySelector('h1') ? full.querySelector('h1').innerHTML.replace(/\s+/g, ' ').trim().slice(0, 300) : null,
        trail: txt(document.querySelector('.cmp_breadcrumbs')),
        notices: [...document.querySelectorAll('.obj_monograph_full .cmp_notification, .obj_monograph_full > .cmp_notification')].map((n) => ({text: txt(n), links: [...n.querySelectorAll('a')].map((a) => ({t: txt(a), h: a.getAttribute('href')}))})),
        mainItems: main ? [...main.children].map(item) : null,
        sideItems: side ? [...side.children].map(item) : null,
        headings: [...(full || document.body).querySelectorAll('h1,h2,h3')].map((h) => `${h.tagName}${h.classList.contains('pkp_screen_reader') ? '(sr)' : ''}:${txt(h) || h.textContent.trim()}`),
        cover: img ? {src: (img.getAttribute('src') || '').replace(/^.*\/(public|templates)\//, '$1/'), alt: img.getAttribute('alt'), inLink: !!img.closest('a'), nw: img.naturalWidth, nh: img.naturalHeight} : (cover ? {noImg: txt(cover)} : null),
        dateLabel: dp ? txt(dp.querySelector(':scope > .sub_item:not(.versions) .label')) : null,
        dateValue: dp ? txt(dp.querySelector(':scope > .sub_item:not(.versions) .value')) : null,
        versions: side ? [...side.querySelectorAll('.sub_item.versions li')].map((li) => ({t: txt(li), a: li.querySelector('a') ? li.querySelector('a').getAttribute('href') : null})) : [],
        versionsHeading: side && side.querySelector('.sub_item.versions .label') ? txt(side.querySelector('.sub_item.versions .label')) : null,
        layout: main && side ? {main: rect(main), side: rect(side)} : null,
        abstractHtml: abs ? abs.innerHTML.replace(/\s+/g, ' ').trim().slice(0, 300) : null,
        bookLinks: [...document.querySelectorAll('a[href*="/catalog/book/"]')].map((a) => ({t: txt(a).slice(0, 80), h: a.getAttribute('href')})).slice(0, 30),
        fileLinks: [...document.querySelectorAll('a[href*="/catalog/view/"], a[href*="/catalog/download/"]')].map((a) => ({t: txt(a), h: a.getAttribute('href')})),
        loginForm: !!document.querySelector('form#login, form.cmp_form.login, input[name="username"]'),
        bodyText: txt(document.querySelector('.pkp_structure_main') || document.body).slice(0, 600),
    };
};
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
    const data = await pg.evaluate(BOOK).catch((e) => ({err: String(e.message).slice(0, 200)}));
    return {status: r ? r.status() : err, url: rel(pg.url()), chain, ...data};
}
const brief = (d) => ({status: d.status, url: d.url, chain: d.chain, docTitle: d.docTitle, h1: d.h1, notices: d.notices, dateLabel: d.dateLabel, dateValue: d.dateValue, versions: d.versions,
    login: d.loginForm, body: (d.status === 200 && !d.loginForm && d.h1) ? undefined : flat(d.bodyText, 250)});

// ---------------------------------------------------------------- the workflow (as U68 K2, U70 K5)
async function openWorkflow(page, app, P, sid, menuKey, {author} = {}) {
    await page.goto(ctxUrl(app, P, `/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${sid}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
    await idle(page);
    await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(600);
}
async function workflowHead(page) {
    return page.evaluate(() => {
        const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
        const out = {};
        const d = document.querySelector('[role="dialog"]');
        const nav = d && d.querySelector('nav');
        out.headButtons = d ? [...d.querySelectorAll('button, a')].filter((e) => !nav || (e.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING)).map((e) => txt(e) || e.getAttribute('aria-label')).filter(Boolean) : null;
        for (const k of ['workflow-controls-left', 'workflow-controls-right']) {
            const r = document.querySelector(`[data-cy="${k}"]`);
            out[k] = r ? [...r.querySelectorAll('a, button')].map((e) => ({tag: e.tagName, t: txt(e) || e.getAttribute('aria-label'), h: e.getAttribute('href'), target: e.getAttribute('target')})) : null;
        }
        return out;
    }).catch((e) => ({err: String(e.message)}));
}
async function createVersion(page, stageLabel = null) {
    const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
    const wf = new WorkflowPage(page, null);
    const item = await wf.revealPublicationEntry('Create New Version');
    await wf.expectVersionLoaded();
    await item.click();
    const dlg = page.getByRole('dialog', {name: 'Create New Version'});
    await dlg.getByLabel('Publication Stage').waitFor({timeout: T});
    const info = {text: flat(await dlg.innerText(), 400), stageOptions: await dlg.getByLabel('Publication Stage').locator('option').allInnerTexts()};
    if (stageLabel) await dlg.getByLabel('Publication Stage').selectOption({label: stageLabel});
    const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
    const resp = await created;
    info.status = resp.status();
    info.id = (await resp.json().catch(() => ({}))).id;
    await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    return info;
}
/** "Publish" in the workflow header, choosing the version stage by label when the app asks for one. */
async function publishOnScreen(page, stageRe = /Version of Record/) {
    const s = {};
    const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
    await btn.waitFor({state: 'visible', timeout: T});
    s.button = flat(await btn.innerText(), 60);
    await sleep(600);
    await btn.click();
    const vs = page.locator('select[name="versionStage"]');
    const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Publish', exact: true})}).last();
    const which = await Promise.race([
        vs.waitFor({state: 'visible', timeout: 20_000}).then(() => 'stage'),
        confirm.waitFor({state: 'visible', timeout: 20_000}).then(() => 'confirm'),
    ]).catch(() => null);
    s.opened = which;
    if (which === 'stage') {
        const opts = await vs.locator('option').evaluateAll((os) => os.map((o) => ({v: o.value, t: o.textContent.trim()})));
        s.stageOptions = opts.map((o) => o.t);
        const pick = opts.find((o) => stageRe.test(o.t));
        if (pick) await vs.selectOption(pick.v);
        const minor = page.locator('select[name="versionIsMinor"]');
        if (await minor.isVisible().catch(() => false)) {
            s.minorOptions = await minor.locator('option').allInnerTexts().catch(() => []);
        }
        s.stageDialog = flat(await page.getByRole('dialog').last().innerText().catch(() => ''), 400);
        await page.getByRole('button', {name: 'Confirm', exact: true}).last().click();
        await confirm.waitFor({state: 'visible', timeout: T});
    }
    await idle(page);
    s.confirmText = flat(await confirm.innerText().catch(() => ''), 500);
    const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T}).catch(() => null);
    await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
    const r = await done;
    s.status = r ? r.status() : null;
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    s.head = flat(await page.locator('[data-cy="workflow-controls-right"]').innerText().catch(() => ''), 200);
    return s;
}
async function unpublishOnScreen(page) {
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Unpublish', exact: true}).click();
    const dlg = page.getByRole('dialog', {name: 'Unpublish', exact: true});
    await dlg.waitFor({timeout: T});
    const done = page.waitForResponse((r) => /\/unpublish/.test(r.url()), {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Unpublish', exact: true}).click();
    const r = await done;
    await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    return {status: r ? r.status() : null, head: flat(await page.locator('[data-cy="workflow-controls-right"]').innerText().catch(() => ''), 200)};
}
const urlBox = (page) => page.locator('input[name="urlPath"]');
const entryForm = (page) => page.locator('form').filter({has: page.locator('input[name="urlPath"]')}).first();
async function saveEntry(page) {
    const resp = page.waitForResponse((r) => /\/submissions\/\d+\/publications\/\d+(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await entryForm(page).getByRole('button', {name: 'Save', exact: true}).click();
    const r = await resp;
    await idle(page);
    await sleep(800);
    const errors = await page.locator('.pkpFieldError, .pkpFormPage__errors').allInnerTexts().catch(() => []);
    return {status: r ? r.status() : null, errors: errors.map((e) => flat(e, 200))};
}
/** Append text to the version's title on "Title & Abstract" and save (as U38 K2). */
async function appendTitle(page, suffix) {
    const ifr = page.locator('iframe[id^="titleAbstract-title-control"]').first();
    await ifr.waitFor({timeout: T});
    const eid = (await ifr.getAttribute('id')).replace(/_ifr$/, '');
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), eid, {timeout: T});
    await page.frameLocator(`#${eid}_ifr`).locator('body').click();
    await page.keyboard.press('End');
    await page.keyboard.type(suffix);
    await sleep(300);
    const saved = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await page.locator('form').filter({has: ifr}).getByRole('button', {name: 'Save', exact: true}).first().click();
    const st = (await saved).status();
    await idle(page);
    await sleep(800);
    return st;
}
/** Press a header control of the workflow and report where it leads (same tab or a new one). */
async function followHeader(page, name, snapName) {
    // the header's "View" / "Preview" are buttons of the workflow dialog's head, outside the controls regions
    const dlg = page.getByRole('dialog').first();
    await dlg.getByRole('button', {name: 'Activity Log', exact: true}).waitFor({timeout: T}).catch(() => {});
    const ctl = dlg.getByRole('button', {name, exact: true}).or(dlg.getByRole('link', {name, exact: true})).first();
    await loc(page, `Workflow header: "${name}"`, ctl);
    if (!(await ctl.count())) return {absent: true};
    const out = {href: await ctl.getAttribute('href').catch(() => null), target: await ctl.getAttribute('target').catch(() => null)};
    const popup = page.context().waitForEvent('page', {timeout: 8000}).catch(() => null);
    await ctl.click();
    const np = await popup;
    const tgt = np || page;
    await tgt.waitForLoadState('domcontentloaded').catch(() => {});
    await idle(tgt).catch(() => {});
    out.newTab = !!np;
    out.landed = rel(tgt.url());
    await snap(tgt, snapName);
    const d = await tgt.evaluate(BOOK).catch(() => ({}));
    out.page = {docTitle: d.docTitle, h1: d.h1, notices: d.notices};
    if (np) await np.close().catch(() => {});
    return out;
}

// ---------------------------------------------------------------- run
forEachApp(async (app) => {
    const isOmp = app.name === 'omp';
    const mg = await launch(app);
    const vs = await launch(app);
    const page = mg.page;
    const vis = vs.page;
    const jsDialogs = [];
    for (const p of [page, vis]) {
        p.on('dialog', async (d) => {
            jsDialogs.push({type: d.type(), message: d.message(), url: rel(p.url())});
            await d.accept().catch(() => {});
        });
    }
    const as = async (who, P) => {
        await signOut(page).catch(() => {});
        if (who) await signIn(page, who, P ? {contextPath: P} : {});
    };
    try {
        // ------------------------------------------------ ctl: td4, A1, multi-app rule 4
        if (on('ctl')) {
            await step(`ctl-${app.name}`, async (out) => {
                const pk = app.contextPath;
                const rows = isOmp
                    ? [['num', '/catalog/book/999999'], ['path', '/catalog/book/no-such-path'], ['numver', '/catalog/book/999999/version/1'], ['book0', '/catalog/book/0']]
                    : [['num', '/catalog/book/999999'], ['book1', '/catalog/book/1'], ['numver', '/catalog/book/1/version/999999'],
                        app.name === 'ojs' ? ['article', '/article/view/999999'] : ['preprint', '/preprint/view/999999'],
                        app.name === 'ojs' ? ['articlepath', '/article/view/no-such-path'] : ['preprintpath', '/preprint/view/no-such-path']];
                await signOut(vis).catch(() => {});
                for (const [k, p] of rows) out[`visitor:${k}`] = brief(await visit(vis, ctxUrl(app, pk, p), `c-${k}-visitor`));
                await as('reader.rosa', pk);
                for (const [k, p] of rows) out[`reader:${k}`] = brief(await visit(page, ctxUrl(app, pk, p), `c-${k}-reader`));
                await as(null);
            });
        }
        if (!isOmp) return;

        // ------------------------------------------------ addr: Rules 1, 2 (td2)
        if (on('addr')) {
            const P = `${tag('u69k2')}a`;
            const S = {};
            await step('addr-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P, [], {
                    series: [{path: 'hist', title: 'History'}], categories: [{path: 'sci', title: 'Science'}],
                    displayFeaturedBooks: true, displayNewReleases: true,
                }));
                S.h = await seedBook(app, P, 'b1', 'K2 Harbour Book', {published: true, datePublished: '2024-03-05', urlPath: 'harbour', series: 'hist', categories: ['sci'],
                    chapters: [{title: 'Chapter One', authors: [`${P}au`], page: true}], featured: [{in: 'catalog'}], newRelease: [{in: 'catalog'}]});
                S.p = await seedBook(app, P, 'b2', 'K2 Plain Book', {published: true, datePublished: '2024-02-01'});
                S.d = await seedBook(app, P, 'b3', 'K2 Draft Book', {decisions: PROD});
                Object.assign(out, {P, S});
                note(`ccK2 [omp] ${RUN} addr: press ${P}, books ${JSON.stringify(S)}`);
            });
            await step('addr-leads', async (out) => {
                await drainJobs(app).catch(() => {});
                const pick = (d) => d.bookLinks.filter((l) => /Harbour|Plain|Draft/.test(l.t) || /harbour|\/\d+$/.test(l.h)).map((l) => `${l.t} -> ${rel(l.h)}`);
                for (const [k, p] of [['home', ''], ['catalog', '/catalog'], ['series', '/catalog/series/hist'], ['category', '/catalog/category/sci'], ['newreleases', '/catalog/newReleases'],
                    ['search', '/search/search?query=Harbour']]) {
                    const d = await visit(vis, ctxUrl(app, P, p), `a-lead-${k}`);
                    out[k] = {status: d.status, links: pick(d)};
                }
                const b = await visit(vis, ctxUrl(app, P, `/catalog/book/${S.h.id}`), 'a-book-by-number');
                out.byNumber = {...brief(b), versions: b.versions};
                const c = await visit(vis, ctxUrl(app, P, '/catalog/book/harbour'), 'a-book-by-path');
                out.byPath = {...brief(c), versions: c.versions, toc: c.bookLinks.map((l) => `${l.t} -> ${rel(l.h)}`)};
                const ch = c.bookLinks.find((l) => /chapter/.test(l.h));
                if (ch) {
                    const cp = await visit(vis, new URL(ch.h, app.url('/')).href, 'a-chapter-page');
                    out.chapter = {status: cp.status, url: cp.url, h1: cp.h1, links: cp.bookLinks.map((l) => `${l.t || '(no text)'} -> ${rel(l.h)}`),
                        coverLink: await vis.evaluate(() => { const i = document.querySelector('.cover img, .item.cover img'); const a = i && i.closest('a'); return a ? {h: a.getAttribute('href'), alt: i.getAttribute('alt')} : null; }).catch(() => null)};
                }
            });
            await step('addr-manager', async (out) => {
                await as(`${P}mg`, P);
                await page.goto(ctxUrl(app, P, '/manageCatalog'));
                await idle(page);
                await page.locator('.listPanel__item--catalog').first().waitFor({timeout: T}).catch(() => {});
                await sleep(600);
                await snap(page, 'a-manage-catalog');
                const row = page.locator('.listPanel__item--catalog').filter({hasText: 'K2 Harbour Book'});
                const ve = row.getByRole('link', {name: 'View Entry', exact: true});
                await loc(page, 'Catalog page: row "View Entry"', ve);
                out.viewEntry = {href: await ve.getAttribute('href').catch(() => null), target: await ve.getAttribute('target').catch(() => null)};
                if (await ve.count()) {
                    const popup = page.context().waitForEvent('page', {timeout: 8000}).catch(() => null);
                    await ve.click();
                    const np = await popup;
                    const tgt = np || page;
                    await tgt.waitForLoadState('domcontentloaded').catch(() => {});
                    out.viewEntry.newTab = !!np;
                    out.viewEntry.landed = rel(tgt.url());
                    if (np) await np.close().catch(() => {});
                }
                await openWorkflow(page, app, P, S.h.id);
                out.headPublished = await workflowHead(page);
                await snap(page, 'a-wf-published-head');
                out.view = await followHeader(page, 'View', 'a-wf-view-landed');
                await openWorkflow(page, app, P, S.d.id);
                out.headDraft = await workflowHead(page);
                out.preview = await followHeader(page, 'Preview', 'a-wf-preview-landed');
            });
            await step('addr-newpath', async (out) => {
                await openWorkflow(page, app, P, S.h.id);
                const v = await createVersion(page);
                S.h2 = v.id;
                out.version = v;
                await openWorkflow(page, app, P, S.h.id, `publication_${v.id}_catalogEntry`);
                await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
                out.urlPathBefore = await urlBox(page).inputValue().catch(() => null);
                out.dateBoxBefore = await page.locator('input[name="datePublished"]').inputValue().catch(() => null);
                await urlBox(page).fill('harbour-2');
                out.save = await saveEntry(page);
                await snap(page, 'a-entry-harbour-2-saved');
                out.urlPathAfterSave = await urlBox(page).inputValue().catch(() => null);
                // mid state: the new path on an unpublished version
                await signOut(vis).catch(() => {});
                out.mid = {};
                for (const [k, p] of [['harbour', '/catalog/book/harbour'], ['harbour2', '/catalog/book/harbour-2'], ['number', `/catalog/book/${S.h.id}`]]) out.mid[k] = brief(await visit(vis, ctxUrl(app, P, p), `a-mid-${k}`));
                out.midManager = brief(await visit(page, ctxUrl(app, P, '/catalog/book/harbour-2'), 'a-mid-harbour2-manager'));
                await openWorkflow(page, app, P, S.h.id, `publication_${v.id}_titleAbstract`);
                out.publish = await publishOnScreen(page);
                out.after = {};
                for (const [k, p] of [['harbour', '/catalog/book/harbour'], ['harbour2', '/catalog/book/harbour-2'], ['number', `/catalog/book/${S.h.id}`],
                    ['oldVersionByPath', `/catalog/book/harbour/version/${S.h.pub}`], ['numberVersion', `/catalog/book/${S.h.id}/version/${S.h.pub}`]]) {
                    const d = await visit(vis, ctxUrl(app, P, p), `a-after-${k}`);
                    out.after[k] = {...brief(d), versions: d.versions};
                }
                const cat = await visit(vis, ctxUrl(app, P, '/catalog'), 'a-after-catalog');
                out.after.catalogLinks = cat.bookLinks.filter((l) => /Harbour/.test(l.t) || /harbour/.test(l.h)).map((l) => `${l.t} -> ${rel(l.h)}`);
                out.db = sql(app, `select publication_id, status, url_path, version_stage, version_major, version_minor from publications where submission_id=${S.h.id} order by publication_id`);
            });
        }

        // ------------------------------------------------ none: Rules 3, 4 (td3, td6), A2, A3, td7/A4, Rule 8 rewrite
        if (on('none')) {
            const P = `${tag('u69k2')}n`;
            const S = {};
            await step('none-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P));
                S.u = await seedBook(app, P, 'b1', 'K2 Unpublished Book', {decisions: PROD});
                S.s = await seedBook(app, P, 'b2', 'K2 Scheduled Book', {published: true, datePublished: '2031-01-10'});
                S.a = await seedBook(app, P, 'b3', 'K2 Only AO Book', {published: true, datePublished: '2024-02-10'});
                S.v = await seedBook(app, P, 'b4', 'K2 Versioned Book', {published: true, datePublished: '2024-03-05'});
                Object.assign(out, {P, S});
                out.db = sql(app, `select s.submission_id, s.status, p.publication_id, p.status, p.date_published from submissions s join publications p on p.submission_id=s.submission_id where s.context_id=(select press_id from presses where path='${P}') order by 1,3`);
                note(`ccK2 [omp] ${RUN} none: press ${P}, books ${JSON.stringify(S)}`);
            });
            await step('none-ao-screen', async (out) => {
                await as(`${P}mg`, P);
                await openWorkflow(page, app, P, S.a.id);
                const v = await createVersion(page, 'Author Original (AO)');
                S.aoPub = v.id;
                out.version = v;
                await openWorkflow(page, app, P, S.a.id, `publication_${v.id}_titleAbstract`);
                out.aoPublish = await publishOnScreen(page, /Author Original/);
                await openWorkflow(page, app, P, S.a.id, `publication_${S.a.pub}_titleAbstract`);
                out.vorUnpublish = await unpublishOnScreen(page);
                await sleep(1500);
                await snap(page, 'n-ao-workflow-after');
                out.head = await workflowHead(page);
                out.view = await followHeader(page, 'View', 'n-ao-wf-view-landed');
                out.db = sql(app, `select s.status, p.publication_id, p.status, p.version_stage from submissions s join publications p on p.submission_id=s.submission_id where s.submission_id=${S.a.id} order by 2`);
            });
            await step('none-newversion', async (out) => {
                // td6's unpublished version, td7's preview, and Rule 8's rewrite
                await openWorkflow(page, app, P, S.v.id);
                const v = await createVersion(page);
                S.v2 = v.id;
                out.version = v;
                out.db = sql(app, `select publication_id, status, date_published, version_stage, version_major, version_minor from publications where submission_id=${S.v.id} order by 1`);
            });
            const addrs = () => [
                ['u', `/catalog/book/${S.u.id}`], ['uver', `/catalog/book/${S.u.id}/version/${S.u.pub}`],
                ['s', `/catalog/book/${S.s.id}`], ['sver', `/catalog/book/${S.s.id}/version/${S.s.pub}`],
                ['ao', `/catalog/book/${S.a.id}`], ['aover', `/catalog/book/${S.a.id}/version/${S.aoPub}`], ['aovor', `/catalog/book/${S.a.id}/version/${S.a.pub}`],
                ['v', `/catalog/book/${S.v.id}`], ['vcur', `/catalog/book/${S.v.id}/version/${S.v.pub}`], ['vnew', `/catalog/book/${S.v.id}/version/${S.v2}`],
                ['v999', `/catalog/book/${S.v.id}/version/999999`], ['vother', `/catalog/book/${S.v.id}/version/${S.u.pub}`], ['vabc', `/catalog/book/${S.v.id}/version/abc`],
            ];
            await step('none-visitor', async (out) => {
                await signOut(vis).catch(() => {});
                for (const [k, p] of addrs()) out[k] = brief(await visit(vis, ctxUrl(app, P, p), `n-${k}-visitor`));
                const cat = await visit(vis, ctxUrl(app, P, '/catalog'), 'n-catalog-visitor');
                out.catalog = cat.bookLinks.map((l) => l.t).filter(Boolean);
            });
            await step('none-reader', async (out) => {
                await as(`${P}rd`, P);
                for (const [k, p] of addrs()) out[k] = brief(await visit(page, ctxUrl(app, P, p), `n-${k}-reader`));
            });
            await step('none-manager', async (out) => {
                await as(`${P}mg`, P);
                for (const [k, p] of addrs()) {
                    const d = await visit(page, ctxUrl(app, P, p), `n-${k}-manager`);
                    out[k] = {...brief(d), sideItems: (d.sideItems || []).map((i) => `${i.cls}:${i.label}`)};
                }
            });
            await step('none-admin', async (out) => {
                await as('admin');
                for (const [k, p] of addrs().filter(([k]) => ['u', 'vnew', 'v999', 'ao'].includes(k))) out[k] = brief(await visit(page, ctxUrl(app, P, p), `n-${k}-admin`));
            });
        }

        // ------------------------------------------------ bio: the "Author Biography" / "Author Biographies" part (one bio, then two)
        if (on('bio')) {
            const G = `${tag('u69k2')}g`;
            const S = {};
            await step('bio', async (out) => {
                await must(app, 'scenarios/context', pressSpec(G));
                const extra = {decisions: PROD, datePublished: '2024-03-05', contributors: [{givenName: 'Second', familyName: 'Person', email: `${G}second@example.org`}]};
                S.one = await seedBook(app, G, 'b1', 'K2 One Bio', extra);
                S.two = await seedBook(app, G, 'b2', 'K2 Two Bios', extra);
                note(`ccK2 [omp] ${RUN} bio: press ${G}, books ${JSON.stringify(S)}`);
                await as(`${G}mg`, G);
                const {ContributorsScreen} = require(path.join(REPO, 'apps/omp/playwright/pages/ContributorPages.js'));
                const addBio = async (b, name, text) => {
                    try {
                        await openWorkflow(page, app, G, b.id, `publication_${b.pub}_contributors`);
                        const cs = new ContributorsScreen(page);
                        const dlg = await cs.openRowEdit(name);
                        const ifr = dlg.locator('iframe[id*="biography"]').first();
                        await ifr.waitFor({timeout: T});
                        const eid = (await ifr.getAttribute('id')).replace(/_ifr$/, '');
                        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), eid, {timeout: T});
                        await page.frameLocator(`#${eid}_ifr`).locator('body').click();
                        await page.keyboard.type(text);
                        await sleep(300);
                        // a seeded submitter's own entry has no Country, which the form requires (seed-facts.md)
                        await cs.fillPersonFields(dlg, {country: 'Canada'}).catch(() => {});
                        await cs.savePanel(dlg);
                        return 'saved';
                    } catch (e) {
                        const sb = await snap(page, `g-bio-failed-${b.id}`);
                        return {err: String(e.message).split('\n')[0], errors: await page.locator('.pkpFieldError').allInnerTexts().catch(() => []), dialog: flat(sb.text && sb.text.dialog, 500)};
                    }
                };
                out.one = await addBio(S.one, `${G}au`, 'First biography.');
                out.two1 = await addBio(S.two, `${G}au`, 'First biography.');
                out.two2 = await addBio(S.two, 'Second Person', 'Second biography.');
                for (const [k, b] of [['one', S.one], ['two', S.two]]) {
                    await openWorkflow(page, app, G, b.id, `publication_${b.pub}_titleAbstract`);
                    out[`${k}Publish`] = (await publishOnScreen(page).catch((e) => ({status: String(e.message).split('\n')[0]}))).status;
                    const d = await visit(vis, ctxUrl(app, G, `/catalog/book/${b.id}`), `g-${k}-bios`);
                    out[`${k}Page`] = {mainItems: (d.mainItems || []).map((i) => `${i.cls} | ${i.label} | ${i.text.slice(0, 140)}`), headings: d.headings};
                }
            });
        }

        // ------------------------------------------------ ao2: A2, the workflow's view of an Author-Original-only book
        if (on('ao2')) {
            const P = `${tag('u69k2')}o`;
            const S = {};
            await step('ao2', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P));
                S.a = await seedBook(app, P, 'b1', 'K2 AO Two', {published: true, datePublished: '2024-02-10'});
                note(`ccK2 [omp] ${RUN} ao2: press ${P}, book ${JSON.stringify(S)}`);
                await as(`${P}mg`, P);
                await openWorkflow(page, app, P, S.a.id);
                const v = await createVersion(page, 'Author Original (AO)');
                S.ao = v.id;
                await openWorkflow(page, app, P, S.a.id, `publication_${v.id}_titleAbstract`);
                out.aoPublish = (await publishOnScreen(page, /Author Original/)).status;
                await openWorkflow(page, app, P, S.a.id, `publication_${S.a.pub}_titleAbstract`);
                out.vorUnpublish = (await unpublishOnScreen(page)).status;
                for (const [k, pub] of [['aoPage', v.id], ['vorPage', S.a.pub]]) {
                    await openWorkflow(page, app, P, S.a.id, `publication_${pub}_titleAbstract`);
                    await sleep(1500);
                    await idle(page);
                    const sn = await snap(page, `o-wf-${k}`);
                    const d = flat(sn.text && sn.text.dialog, 2000);
                    out[k] = {head: (await workflowHead(page)).headButtons, status: (d.match(/Status:\s*\S+(\s+\S+)?/) || [null])[0], dialogHead: d.slice(0, 260)};
                }
                out.view = await followHeader(page, 'View', 'o-wf-view');
                await as(`${P}mg`, P);
                const m = await visit(page, ctxUrl(app, P, `/catalog/book/${S.a.id}`), 'o-book-manager');
                out.managerBook = brief(m);
                await signOut(vis).catch(() => {});
                out.visitorBook = brief(await visit(vis, ctxUrl(app, P, `/catalog/book/${S.a.id}`), 'o-book-visitor'));
                out.db = sql(app, `select s.status, s.stage_id, p.publication_id, p.status, p.version_stage from submissions s join publications p on p.submission_id=s.submission_id where s.submission_id=${S.a.id} order by 3`);
            });
        }

        // ------------------------------------------------ prev: Rule 5 (td7, part of td5), td9 on unpublished versions
        if (on('prev')) {
            const P = `${tag('u69k2')}p`;
            const S = {};
            await step('prev-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P, [
                    {username: `${P}se`, roles: ['sectionEditor']}, {username: `${P}ce`, roles: ['copyeditor']}, {username: `${P}rv`, roles: ['externalReviewer']},
                ]));
                S.u = await seedBook(app, P, 'b1', 'K2 Preview Book', {decisions: PROD});
                S.d = await seedBook(app, P, 'b2', 'K2 Dated Preview', {decisions: PROD, datePublished: '2024-06-01'});
                S.f = await seedBook(app, P, 'b3', 'K2 Future Preview', {decisions: PROD, datePublished: '2031-01-10'});
                S.s = await seedBook(app, P, 'b4', 'K2 Scheduled Preview', {published: true, datePublished: '2031-01-10'});
                Object.assign(out, {P, S});
                note(`ccK2 [omp] ${RUN} prev: press ${P}, books ${JSON.stringify(S)}`);
            });
            const readPreview = async (who, k) => {
                const o = {};
                const d = await visit(page, ctxUrl(app, P, `/catalog/book/${S.u.id}`), `p-u-${k}`);
                o.page = {...brief(d), sideItems: (d.sideItems || []).map((i) => `${i.cls}:${i.label}`), mainItems: (d.mainItems || []).map((i) => `${i.cls}:${i.label}`)};
                const link = page.locator('.obj_monograph_full .cmp_notification a').first();
                if (d.status === 200 && (await link.count())) {
                    await loc(page, 'Book page: preview notice "View submission" link', page.locator('.obj_monograph_full .cmp_notification').getByRole('link', {name: 'View submission'}));
                    await link.click();
                    await page.waitForLoadState('domcontentloaded').catch(() => {});
                    await idle(page).catch(() => {});
                    await sleep(800);
                    const s = await snap(page, `p-u-${k}-view-submission`);
                    o.viewSubmission = {url: rel(page.url()), title: await page.title(), dialog: flat(s.text && s.text.dialog, 200), main: flat(s.text && s.text.main, 250)};
                }
                return o;
            };
            await step('prev-roles', async (out) => {
                for (const [who, k] of [[`${P}mg`, 'manager'], [`${P}au`, 'author'], [`${P}se`, 'serieseditor'], [`${P}ce`, 'copyeditor'], [`${P}rv`, 'reviewer'], [`${P}rd`, 'reader'], ['admin', 'admin']]) {
                    await as(who, who === 'admin' ? null : P);
                    out[k] = await readPreview(who, k);
                }
                await signOut(vis).catch(() => {});
                out.visitor = brief(await visit(vis, ctxUrl(app, P, `/catalog/book/${S.u.id}`), 'p-u-visitor'));
            });
            await step('prev-dates', async (out) => {
                await as(`${P}mg`, P);
                for (const [k, b] of [['dated', S.d], ['future', S.f], ['scheduled', S.s]]) {
                    const d = await visit(page, ctxUrl(app, P, `/catalog/book/${b.id}`), `p-${k}-manager`);
                    out[k] = {...brief(d), sideItems: (d.sideItems || []).map((i) => `${i.cls}:${i.label}`)};
                }
                await openWorkflow(page, app, P, S.u.id);
                out.headUnpublished = await workflowHead(page);
                out.preview = await followHeader(page, 'Preview', 'p-wf-preview');
                await openWorkflow(page, app, P, S.s.id);
                out.headScheduled = await workflowHead(page);
                await snap(page, 'p-wf-scheduled-head');
                out.db = sql(app, `select s.submission_id, s.status, p.status, p.date_published from submissions s join publications p on p.submission_id=s.submission_id where s.submission_id in (${S.d.id},${S.f.id},${S.s.id}) order by 1`);
            });
        }

        // ------------------------------------------------ ver: Rules 6, 8, 9 (td8, td9, td23), A5, date formats
        if (on('ver')) {
            const P = `${tag('u69k2')}v`;
            const S = {};
            const read = async (k, p) => {
                const d = await visit(vis, ctxUrl(app, P, p), `v-${k}`);
                return {...brief(d), versionsHeading: d.versionsHeading, sideItems: (d.sideItems || []).map((i) => `${i.cls}:${i.label}`)};
            };
            await step('ver-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P));
                S.t = await seedBook(app, P, 'b1', 'Tides', {published: true, datePublished: '2024-03-05'});
                Object.assign(out, {P, S, today: today()});
                note(`ccK2 [omp] ${RUN} ver: press ${P}, books ${JSON.stringify(S)}`);
            });
            await step('ver-one', async (out) => {
                await signOut(vis).catch(() => {});
                out.book = await read('01-one-version', `/catalog/book/${S.t.id}`);
                out.versionsAria = await vis.locator('.sub_item.versions').ariaSnapshot().catch(() => null);
                await loc(vis, 'Book page: "Versions" list entries', vis.locator('.item.date_published .sub_item.versions li'));
                await loc(vis, 'Book page: date line value', vis.locator('.item.date_published > .sub_item:not(.versions) .value'));
            });
            await step('ver-two', async (out) => {
                await as(`${P}mg`, P);
                await openWorkflow(page, app, P, S.t.id);
                const v = await createVersion(page);
                S.t2 = v.id;
                out.version = v;
                // the live page right after "Create New Version" (Rule 8's rewrite)
                out.liveAfterCreate = await read('02-live-after-create', `/catalog/book/${S.t.id}`);
                await openWorkflow(page, app, P, S.t.id, `publication_${v.id}_titleAbstract`);
                out.titleSave = await appendTitle(page, ' Revised');
                out.publish = await publishOnScreen(page);
                out.db = sql(app, `select publication_id, status, date_published, version_stage, version_major, version_minor from publications where submission_id=${S.t.id} order by 1`);
                out.current = await read('03-current', `/catalog/book/${S.t.id}`);
                // the older version, reached from the "Versions" list
                const older = vis.locator('.item.date_published .sub_item.versions li a').last();
                out.olderHref = await older.getAttribute('href').catch(() => null);
                await older.click();
                await vis.waitForLoadState('domcontentloaded');
                await idle(vis);
                await snap(vis, 'v-04-older-from-list');
                const d = await vis.evaluate(BOOK);
                out.older = {url: rel(vis.url()), docTitle: d.docTitle, h1: d.h1, notices: d.notices, dateLabel: d.dateLabel, dateValue: d.dateValue, versions: d.versions};
                await loc(vis, 'Book page: older-version notice', vis.locator('.obj_monograph_full .cmp_notification'));
                const recent = vis.locator('.obj_monograph_full .cmp_notification').getByRole('link', {name: 'most recent version'});
                await loc(vis, 'Book page: notice link "most recent version"', recent);
                if (await recent.count()) {
                    await recent.click();
                    await vis.waitForLoadState('domcontentloaded');
                    await idle(vis);
                    out.recentLanded = {url: rel(vis.url()), h1: await vis.locator('h1').first().innerText().catch(() => null)};
                }
            });
            await step('ver-three', async (out) => {
                // a third version not yet published, then the second unpublished
                await openWorkflow(page, app, P, S.t.id);
                const v = await createVersion(page);
                S.t3 = v.id;
                out.version = v;
                out.withUnpublished = await read('05-with-unpublished-third', `/catalog/book/${S.t.id}`);
                out.thirdAddress = await read('06-third-address', `/catalog/book/${S.t.id}/version/${v.id}`);
                await openWorkflow(page, app, P, S.t.id, `publication_${S.t2}_titleAbstract`);
                out.unpublish = await unpublishOnScreen(page).catch((e) => ({err: String(e.message).split('\n')[0]}));
                await snap(page, 'v-07-wf-after-unpublish');
                out.db = sql(app, `select publication_id, status, date_published, version_major, version_minor from publications where submission_id=${S.t.id} order by 1`);
                out.afterUnpublish = await read('08-after-unpublish', `/catalog/book/${S.t.id}`);
                out.secondAddress = await read('09-second-address', `/catalog/book/${S.t.id}/version/${S.t2}`);
                out.firstAddress = await read('10-first-address', `/catalog/book/${S.t.id}/version/${S.t.pub}`);
            });
            await step('ver-republish', async (out) => {
                // back to two published versions for the date-format reads
                await openWorkflow(page, app, P, S.t.id, `publication_${S.t2}_titleAbstract`);
                out.publish = await publishOnScreen(page).catch((e) => ({err: String(e.message).split('\n')[0]}));
                out.db = sql(app, `select publication_id, status, date_published, version_major, version_minor from publications where submission_id=${S.t.id} order by 1`);
                out.current = await read('11-republished', `/catalog/book/${S.t.id}`);
                out.older = await read('12-older-default-format', `/catalog/book/${S.t.id}/version/${S.t.pub}`);
            });
            await step('ver-dateformat', async (out) => {
                await page.goto(ctxUrl(app, P, '/management/settings/website'));
                await idle(page);
                await page.locator('#setup-button').first().click();
                await idle(page);
                await page.locator('#dateTime-button').first().click();
                await idle(page);
                await sleep(500);
                const panel = page.locator('[role="tabpanel"]#dateTime').first();
                await snap(page, 'v-13-datetime-tab');
                const radios = await panel.locator('input[type=radio]').evaluateAll((rs) => rs.map((r) => ({name: r.name, value: r.value, checked: r.checked, label: (r.closest('label') || r.parentElement).innerText.trim()})));
                out.radios = radios.filter((r) => /dateFormat(Short|Long)/.test(r.name)).map((r) => `${r.name}=${r.value}${r.checked ? '*' : ''} (${r.label})`);
                for (const n of ['dateFormatShort', 'dateFormatLong']) {
                    const pick = radios.find((r) => r.name.startsWith(n) && /en/.test(r.name) && !r.checked && r.value !== 'custom' && !/custom/i.test(r.label));
                    if (pick) {
                        await panel.locator(`input[type=radio][name="${pick.name}"][value="${pick.value}"]`).check();
                        out[`picked_${n}`] = `${pick.value} (${pick.label})`;
                    }
                }
                const resp = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await panel.getByRole('button', {name: 'Save', exact: true}).last().click();
                const r = await resp;
                out.save = r ? r.status() : null;
                await sleep(1200);
                out.current = await read('14-current-new-format', `/catalog/book/${S.t.id}`);
                out.older = await read('15-older-new-format', `/catalog/book/${S.t.id}/version/${S.t.pub}`);
            });
        }

        // ------------------------------------------------ parts: Fields, Rule 7 (td24)
        if (on('parts')) {
            const P = `${tag('u69k2')}e`;
            const F = `${tag('u69k2')}f`;
            const S = {};
            const partsOf = (d) => ({docTitle: d.docTitle, h1: d.h1, h1html: d.h1html, trail: d.trail, layout: d.layout, headings: d.headings,
                mainItems: (d.mainItems || []).map((i) => `${i.cls} | ${i.label} | ${i.text.slice(0, 120)}`), sideItems: (d.sideItems || []).map((i) => `${i.cls} | ${i.label} | ${i.text.slice(0, 120)}`),
                cover: d.cover, dateLabel: d.dateLabel, dateValue: d.dateValue, versions: d.versions, abstractHtml: d.abstractHtml, fileLinks: d.fileLinks});
            await step('parts-seed-min', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P));
                S.e = await seedBook(app, P, 'b1', 'K2 Minimal Book', {published: true, datePublished: '2024-03-05'});
                Object.assign(out, {P, S});
            });
            await step('parts-min', async (out) => {
                await signOut(vis).catch(() => {});
                const d = await visit(vis, ctxUrl(app, P, `/catalog/book/${S.e.id}`), 'e-01-minimal');
                Object.assign(out, partsOf(d));
                out.aria = (await vis.locator('.obj_monograph_full').ariaSnapshot().catch(() => '')).slice(0, 1500);
                out.coverFile = d.cover && d.cover.src ? await fetch(app.url('/' + d.cover.src.replace(/^\//, ''))).then((r) => r.status).catch(() => null) : null;
                await loc(vis, 'Book page: cover image', vis.locator('.obj_monograph_full .item.cover img'));
                await loc(vis, 'Book page: main column', vis.locator('.obj_monograph_full .main_entry'));
                await loc(vis, 'Book page: side column', vis.locator('.obj_monograph_full .entry_details'));
            });
            await step('parts-seed-full', async (out) => {
                const base = pressSpec(F, [], {
                    context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']},
                    series: [{path: 'hist', title: 'History'}], categories: [{path: 'sci', title: 'Science'}],
                    enableDois: true, doiPrefix: '10.1234',
                    metadata: {dataAvailability: 'request', fundingStatement: 'request'},
                    themeOptions: {displayStats: 'bar'},
                    plugins: {citationstylelanguageplugin: {enabled: true}},
                });
                let r = await post(app, 'scenarios/context', base);
                if (r.status !== 200) {
                    out.contextFirstTry = {status: r.status, json: JSON.stringify(r.json).slice(0, 300)};
                    delete base.context.supportedSubmissionLocales;
                    r = await post(app, 'scenarios/context', base);
                }
                out.context = r.status;
                const book = {decisions: PROD, datePublished: '2024-03-05', series: 'hist', categories: ['sci'],
                    subtitle: 'A Subtitle', abstract: '<p>First <strong>bold</strong> paragraph.</p><p>Second paragraph.</p>',
                    plainLanguageSummary: 'A plain summary.', keywords: {en: ['alpha', 'beta gamma'], fr_CA: ['alpha-fr']},
                    citationsRaw: ['Reference One. 2020.', 'Reference Two. 2021.'],
                    contributors: [{givenName: 'Second', familyName: 'Person', email: `${F}second@example.org`}],
                    publicationFormats: [{name: 'PDF', file: 'article.pdf'}],
                    chapters: [{title: 'Chapter One', authors: [`${F}au`], files: ['publicationFormats.0']}]};
                let b = await post(app, 'scenarios/submission', {tag: `${F}b1`, context: F, submitter: `${F}au`, title: 'K2 Full Book', ...book});
                if (b.status !== 200) {
                    out.bookFirstTry = {status: b.status, json: JSON.stringify(b.json).slice(0, 300)};
                    book.keywords = ['alpha', 'beta gamma'];
                    b = await post(app, 'scenarios/submission', {tag: `${F}b1`, context: F, submitter: `${F}au`, title: 'K2 Full Book', ...book});
                }
                if (b.status !== 200) throw new Error(`full book ${b.status} ${JSON.stringify(b.json).slice(0, 300)}`);
                S.f = {id: b.json.submissionId, pub: b.json.publicationId, formats: b.json.publicationFormats, chapters: b.json.chapters};
                Object.assign(out, {F, S: S.f});
                note(`ccK2 [omp] ${RUN} parts: presses ${P} (minimal) ${F} (full), books ${JSON.stringify(S)}`);
            });
            await step('parts-full-screen', async (out) => {
                await as(`${F}mg`, F);
                // series prefix and ISSNs on Settings › Press › Series
                try {
                    const {SectionsTab} = require(path.join(REPO, 'shared/playwright/pages/SectionsPages.js'));
                    const tab = new SectionsTab(page, F, {tab: 'Series', addLabel: 'Add Series'});
                    await tab.goto();
                    const win = await tab.openEdit('History');
                    await win.box('prefix[en]').fill('The').catch((e) => { out.prefixErr = String(e.message).split('\n')[0]; });
                    await win.box('onlineIssn').fill('0378-5955');
                    await win.box('printIssn').fill('2049-3630');
                    out.seriesSave = (await win.save()).status();
                } catch (e) {
                    out.seriesErr = String(e.message).split('\n')[0];
                }
                // cover with alternate text on Catalog Entry
                await openWorkflow(page, app, F, S.f.id, `publication_${S.f.pub}_catalogEntry`);
                await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
                try {
                    const up = page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: 20_000}).catch(() => null);
                    await entryForm(page).locator('input[type="file"]').first().setInputFiles(path.join(FILES, 'profile-image-400.png'));
                    const r = await up;
                    out.coverUpload = r ? r.status() : null;
                    await sleep(1200);
                    const alt = entryForm(page).getByRole('textbox', {name: /Alternate text/i}).first();
                    if (await alt.count()) await alt.fill('Cover of the full book');
                    out.entrySave = await saveEntry(page);
                } catch (e) {
                    out.coverErr = String(e.message).split('\n')[0];
                }
                // the biography parts are the `bio` phase's (a press with one form language)
                // the data availability and funding statements, typed where the workflow offers them
                const typeRich = async (entry, idPart, text) => {
                    try {
                        const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
                        await openWorkflow(page, app, F, S.f.id, `publication_${S.f.pub}_titleAbstract`);
                        const wf = new WorkflowPage(page, F);
                        if (entry !== 'Title & Abstract') {
                            const it = await wf.revealPublicationEntry(entry);
                            await it.click();
                            await idle(page);
                            await sleep(800);
                        }
                        const ifr = page.locator(`iframe[id*="${idPart}"]`).first();
                        await ifr.waitFor({timeout: 15_000});
                        const eid = (await ifr.getAttribute('id')).replace(/_ifr$/, '');
                        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), eid, {timeout: T});
                        await page.frameLocator(`#${eid}_ifr`).locator('body').click();
                        await page.keyboard.type(text);
                        await sleep(300);
                        const saved = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
                        await page.locator('form').filter({has: ifr}).getByRole('button', {name: 'Save', exact: true}).first().click();
                        return (await saved).status();
                    } catch (e) {
                        return `ERR ${String(e.message).split('\n')[0]}`;
                    }
                };
                out.das = await typeRich('Data', 'dataAvailability', 'Data are available on request.');
                out.fundingStatement = await typeRich('Metadata', 'fundingStatement', 'Funded by the K2 Foundation.');
                // license on Permissions & Disclosure
                try {
                    const {saveLicenseFields} = require(path.join(REPO, 'apps/omp/playwright/pages/PublicationPages.js'));
                    await openWorkflow(page, app, F, S.f.id, `publication_${S.f.pub}_license`);
                    await saveLicenseFields(page, {licenseUrl: 'https://creativecommons.org/licenses/by/4.0/'});
                    out.license = 'saved';
                } catch (e) {
                    out.licenseErr = String(e.message).split('\n')[0];
                }
                await openWorkflow(page, app, F, S.f.id, `publication_${S.f.pub}_titleAbstract`);
                out.publish = await publishOnScreen(page).catch((e) => ({err: String(e.message).split('\n')[0]}));
            });
            await step('parts-full', async (out) => {
                await signOut(vis).catch(() => {});
                const d = await visit(vis, ctxUrl(app, F, `/catalog/book/${S.f.id}`), 'f-01-full');
                Object.assign(out, partsOf(d));
                out.aria = (await vis.locator('.obj_monograph_full').ariaSnapshot().catch(() => '')).slice(0, 2500);
                out.seriesLinks = await vis.locator('.item.series a').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`)).catch(() => []);
                out.categoryLinks = await vis.locator('.item.categories a').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`)).catch(() => []);
                const fr = await visit(vis, ctxUrl(app, F, `/catalog/book/${S.f.id}`, 'fr_CA'), 'f-02-full-fr');
                out.fr = {status: fr.status, h1: fr.h1, mainItems: (fr.mainItems || []).map((i) => `${i.cls} | ${i.label} | ${i.text.slice(0, 80)}`)};
                const en = await visit(vis, ctxUrl(app, F, `/catalog/book/${S.f.id}`, 'en'), 'f-03-full-en-again');
                out.enAgain = {status: en.status, keywords: (en.mainItems || []).filter((i) => /keywords/.test(i.cls)).map((i) => i.text)};
            });
        }

        // ------------------------------------------------ set: Settings 6–8
        if (on('set')) {
            const P0 = `${tag('u69k2')}s`;
            const P1 = `${tag('u69k2')}m`;
            const P2 = `${tag('u69k2')}r`;
            const P3 = `${tag('u69k2')}d`;
            const S = {};
            const bookSpec = {published: true, datePublished: '2024-03-05', publicationFormats: [{name: 'PDF', file: 'article.pdf'}],
                chapters: [{title: 'Chapter One', page: true}]};
            await step('set-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P0));
                await must(app, 'scenarios/context', pressSpec(P1, [], {restrictMonographAccess: true}));
                await must(app, 'scenarios/context', pressSpec(P2, [], {restrictSiteAccess: true}));
                await must(app, 'scenarios/context', pressSpec(P3, [], {context: {enabled: false}}));
                for (const [k, P] of [['s0', P0], ['s1', P1], ['s2', P2], ['s3', P3]]) {
                    S[k] = await seedBook(app, P, 'b1', `K2 Access Book ${k}`, {...bookSpec, chapters: [{title: 'Chapter One', page: true, authors: [`${P}au`]}]});
                    S[`${k}u`] = await seedBook(app, P, 'b2', `K2 Access Draft ${k}`, {decisions: PROD});
                }
                Object.assign(out, {P0, P1, P2, P3, S});
                note(`ccK2 [omp] ${RUN} set: presses ${P0} (default) ${P1} (restrictMonographAccess) ${P2} (restrictSiteAccess) ${P3} (not enabled), books ${JSON.stringify(S)}`);
            });
            // the addresses a reader reads from the page (the file link, the chapter link), per press
            const addrs = {};
            await step('set-reader-links', async (out) => {
                for (const [k, P] of [['s0', P0], ['s1', P1], ['s2', P2], ['s3', P3]]) {
                    await as(`${P}rd`, P);
                    const d = await visit(page, ctxUrl(app, P, `/catalog/book/${S[k].id}`), `s-${k}-reader-book`);
                    addrs[k] = {book: `/catalog/book/${S[k].id}`, version: `/catalog/book/${S[k].id}/version/${S[k].pub}`,
                        chapter: (d.bookLinks.find((l) => /chapter/.test(l.h)) || {}).h, file: (d.fileLinks[0] || {}).h,
                        unknown: '/catalog/book/999999', draft: `/catalog/book/${S[`${k}u`].id}`};
                    out[k] = {...brief(d), fileLinks: d.fileLinks, chapter: addrs[k].chapter};
                }
            });
            await step('set-visitor', async (out) => {
                await signOut(vis).catch(() => {});
                for (const k of ['s0', 's1', 's2', 's3']) {
                    const P = {s0: P0, s1: P1, s2: P2, s3: P3}[k];
                    out[k] = {};
                    for (const [a, u] of Object.entries(addrs[k])) {
                        if (!u) continue;
                        const url = /^https?:/.test(u) ? u : ctxUrl(app, P, u.replace(/^.*\/index\.php\/[^/]+/, ''));
                        out[k][a] = brief(await visit(vis, url, `s-${k}-visitor-${a}`));
                    }
                }
                // the free file's link pressed from the page (Settings 6)
                for (const k of ['s0', 's1']) {
                    const P = {s0: P0, s1: P1}[k];
                    await visit(vis, ctxUrl(app, P, `/catalog/book/${S[k].id}`), `s-${k}-visitor-book-again`);
                    const link = vis.locator('.item.files a, a[href*="/catalog/view/"]').first();
                    await loc(vis, 'Book page: a file link', link);
                    const resp = vis.waitForResponse((r) => /catalog\/(view|download)/.test(r.url()), {timeout: 15_000}).catch(() => null);
                    await link.click().catch(() => {});
                    const r = await resp;
                    await vis.waitForLoadState('domcontentloaded').catch(() => {});
                    await idle(vis).catch(() => {});
                    await snap(vis, `s-${k}-visitor-file-pressed`);
                    out[`${k}-pressed`] = {firstResponse: r ? `${r.status()} ${rel(r.url())}` : null, landed: rel(vis.url()), title: await vis.title().catch(() => null)};
                }
            });
            await step('set-settings-screens', async (out) => {
                // Settings › Users & Roles › "Site Access Options" as each press's manager; one change left unsaved on P0
                for (const [k, P] of [['s0', P0], ['s1', P1], ['s2', P2]]) {
                    await as(`${P}mg`, P);
                    await page.goto(ctxUrl(app, P, '/management/settings/access'));
                    await idle(page);
                    const tab = page.getByRole('tab', {name: 'Site Access Options', exact: true}).first();
                    if (await tab.count()) { await tab.click(); await idle(page); await sleep(600); }
                    await snap(page, `s-${k}-site-access-options`);
                    out[k] = await page.locator('[role="tabpanel"]:visible input[type=checkbox]').evaluateAll((cs) => cs.map((c) => {
                        const fs = c.closest('fieldset');
                        return `${fs && fs.querySelector('legend') ? fs.querySelector('legend').innerText.trim() + ' › ' : ''}${(c.closest('label') || c.parentElement).innerText.trim()} = ${c.checked}`;
                    })).catch((e) => String(e.message));
                    if (k === 's0') {
                        const box = page.getByRole('checkbox', {name: /log in to view open access content/});
                        await loc(page, 'Site Access Options: "Users must be registered and log in to view open access content."', box);
                        await loc(page, 'Site Access Options: "Users must be registered and log in to view the press site."', page.getByRole('checkbox', {name: /log in to view the press site/}));
                        await box.check();
                        const d0 = jsDialogs.length;
                        await page.goto(ctxUrl(app, P, '/management/settings/website')).catch((e) => { out.leaveErr = String(e.message).split('\n')[0]; });
                        await idle(page).catch(() => {});
                        out.leaveUnsaved = {dialogs: jsDialogs.slice(d0), landed: rel(page.url())};
                        await page.goto(ctxUrl(app, P, '/management/settings/access'));
                        await idle(page);
                        const tab2 = page.getByRole('tab', {name: 'Site Access Options', exact: true}).first();
                        if (await tab2.count()) { await tab2.click(); await idle(page); await sleep(600); }
                        out.afterLeave = await page.getByRole('checkbox', {name: /log in to view open access content/}).isChecked().catch(() => null);
                    }
                }
                // Administration › Hosted Presses › "Edit" as admin: the box on publicknowledge, P0 and P3
                await as('admin');
                const openEdit = async (name) => {
                    await page.goto(app.url('/index.php/index/admin/contexts'));
                    await idle(page);
                    await sleep(400);
                    const row = page.locator('tr.gridRow').filter({hasText: name}).first();
                    await row.locator('a.show_extras').click();
                    await idle(page);
                    await sleep(300);
                    await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
                    const cb = page.getByRole('checkbox', {name: /appear publicly on the site/});
                    await cb.waitFor({timeout: T});
                    await sleep(500);
                    return cb;
                };
                for (const [k, name] of [['pk', 'Public Knowledge Press'], ['s0', `K2 Press ${P0}`], ['s3', `K2 Press ${P3}`]]) {
                    try {
                        const cb = await openEdit(name);
                        out[`hosted-${k}`] = {label: await cb.evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null), checked: await cb.isChecked()};
                        await snap(page, `s-hosted-edit-${k}`);
                        await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(Close|Cancel)/}).first().click().catch(() => {});
                        await sleep(800);
                    } catch (e) {
                        out[`hosted-${k}`] = {err: String(e.message).split('\n')[0]};
                    }
                }
            });
            await step('set-signed-in', async (out) => {
                // the other end: signed-in readers on the closed presses
                for (const [k, P] of [['s2', P2], ['s3', P3]]) {
                    await as(`${P}rd`, P);
                    out[k] = {};
                    for (const [a, u] of Object.entries(addrs[k])) {
                        if (!u || a === 'file') continue;
                        const url = /^https?:/.test(u) ? u : ctxUrl(app, P, u);
                        out[k][a] = brief(await visit(page, url, `s-${k}-reader-${a}`));
                    }
                }
                await as(null);
            });
        }
    } finally {
        record(`${RUN}-js-dialogs`, {jsDialogs});
        await vs.close().catch(() => {});
        await mg.close().catch(() => {});
    }
});
