// U70 claim check K1: framing and access. Purpose and the OJS/OPS absence
// paragraph (spec lines 12-31, td1), Actors & permissions (36-50: td2, td3,
// td15), Cross-feature interactions (278-311, the behavior pointers),
// the Canonical preamble (315-318) and register A1 (383-392); footnotes
// a, b, c, d, e, s, f-a1.
//
// Phases (PHASES=a,b picks; default all):
//   absence  OJS/OPS: manager.maya on publicknowledge (side menu "Content",
//            the typed manageCatalog address signed in and signed out, a
//            published item's workflow menu and Production stage); OMP
//            publicknowledge as the positive control and the preamble's
//            "the seeded press's catalog holds what earlier runs published".
//   roles    OMP scratch press P: every role's side menu and typed address;
//            the Catalog page's actions (box, Order Features › Save Order,
//            Search, Filters, Add Entry) for each manager-level role, the
//            Site Administrator and a Series editor (A1); the Catalog Entry
//            page and the Production notice per role (td3, td15); the
//            public pages named in Cross-feature interactions.
//   many     OMP scratch press Q with 31 published books: the Series
//            editor's first 30 rows and the page link (A1), the Press
//            manager's page link as the control.
//
// Run: PROBE_FEATURE=U70 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U70/K1/k1.js
// (ONLY=omp narrows; PHASES=roles picks). OMP outlasts 600 s: run detached
// (patterns.md "Probe kit"). Outputs: .reports/U70/ccK1/.
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const PHASES = (process.env.PHASES || 'absence,roles,many').split(',');
const on = (p) => PHASES.includes(p);
const T = 30_000;
const REPO = path.join(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

const FEAT_OFF = 'This monograph is not featured. Make this monograph featured.';
const FEAT_ON = 'This monograph is featured. Make this monograph not featured.';

const facts = {};
function fact(key, value) {
    facts[key] = value;
    record(process.env.FACTS || 'facts', {[key]: value}, {merge: true});
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
    record(name, {...s, ...extra});
    await shot(page, name).catch(() => {});
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
const ctxUrl = (app, P, p = '') => app.url(`/index.php/${P}${p}`);

// ---------------------------------------------------------------- the side menu ("Site Navigation")
async function sideMenu(page) {
    const nav = page.getByRole('navigation', {name: 'Site Navigation'});
    await nav.waitFor({timeout: 15_000}).catch(() => {});
    if (!(await nav.count())) return {nav: false};
    return nav.evaluate((n) => [...n.querySelectorAll('[data-pc-section="panel"]')].map((p) => {
        const h = p.querySelector('[data-pc-section="header"]');
        return {
            label: h ? h.getAttribute('aria-label') : null,
            items: [...p.querySelectorAll('[role="treeitem"]')].map((li) => {
                const a = li.querySelector('a');
                return `${li.getAttribute('aria-label')}${a && a.getAttribute('href') ? ` → ${a.getAttribute('href').replace(/^.*index\.php/, '')}` : ''}`;
            }),
        };
    }));
}
async function landSideMenu(page, app, P, name) {
    await page.goto(ctxUrl(app, P, '/submissions'));
    await idle(page);
    await page.getByRole('navigation', {name: 'Site Navigation'}).waitFor({timeout: 15_000}).catch(() => {});
    await idle(page);
    const s = await snap(page, name);
    return {landed: s.url && s.url.replace(/^.*index\.php/, ''), menu: await sideMenu(page)};
}
/** The typed address of the Catalog page: status, where it lands, what it says. */
async function typedCatalog(page, app, P, name) {
    const r = await page.goto(ctxUrl(app, P, '/manageCatalog'));
    await idle(page);
    await page.locator('.listPanel__item--catalog, .listPanel__empty, h1').first().waitFor({timeout: 15_000}).catch(() => {});
    await idle(page);
    const s = await snap(page, name);
    return {
        status: r ? r.status() : null,
        landed: (s.url || '').replace(/^.*index\.php/, ''),
        title: s.title,
        h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120),
        mainText: flat(s.text && (s.text.main || s.text.body), 300),
        rows: await page.locator('.listPanel__item--catalog').count(),
        loginForm: await page.locator('input[name="username"]').count(),
    };
}

// ---------------------------------------------------------------- the Catalog page
const item = (page, title) => page.locator('.listPanel__item--catalog').filter({has: page.locator('.listPanel__itemSubtitle', {hasText: title})});
async function openCatalog(page, app, P) {
    await page.goto(ctxUrl(app, P, '/manageCatalog'));
    await idle(page);
    await page.locator('.listPanel__item--catalog, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
}
async function rows(page) {
    return page.locator('.listPanel__item--catalog').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => {
        const sub = e.querySelector('.listPanel__itemSubtitle');
        const names = [...e.querySelectorAll('button')].map((b) => (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim()).join(' | ');
        return {title: sub ? sub.innerText.trim() : null, F: /is featured\. Make/.test(names) ? '+' : /not featured\. Make/.test(names) ? '-' : '?'};
    }));
}
const order = async (page) => (await rows(page)).map((r) => r.title);
async function header(page) {
    return page.evaluate(() => {
        const vis = (n) => !!(n && n.offsetParent !== null);
        const scope = document.querySelector('.listPanel--catalog') || document;
        return {
            controls: [...scope.querySelectorAll('.pkpHeader__actions button, .pkpHeader__actions input')].filter(vis).map((b) => (b.getAttribute('aria-label') || b.innerText || b.placeholder || '').replace(/\s+/g, ' ').trim()),
            pageButtons: [...document.querySelectorAll('main button, .app__main button')].filter(vis).map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
            pagination: (() => { const p = document.querySelector('.listPanel--catalog .pkpPagination'); return p ? p.innerText.replace(/\s+/g, ' ').trim() : null; })(),
        };
    });
}
/** Visible windows (reka dialogs, legacy modals) and top-right toasts, as text. */
async function windows(page) {
    return page.evaluate(() => {
        const vis = (n) => !!(n && n.getClientRects().length && getComputedStyle(n).visibility !== 'hidden');
        const txt = (n) => (n.innerText || '').replace(/\s+/g, ' ').trim();
        return {
            dialogs: [...document.querySelectorAll('[role="dialog"], [role="alertdialog"], .pkp_modal_panel')].filter(vis).map((d) => ({role: d.getAttribute('role'), name: d.getAttribute('aria-label') || (d.querySelector('h1,h2,h3') || {}).innerText || null, text: txt(d).slice(0, 300), buttons: [...d.querySelectorAll('button')].filter(vis).map((b) => txt(b) || b.getAttribute('aria-label'))})),
            toasts: [...document.querySelectorAll('.app__notifications')].map(txt).filter(Boolean),
        };
    });
}
/** Close an "Error"-style window by its own button; returns what was pressed. */
async function closeError(page) {
    const dlg = page.locator('[role="dialog"], [role="alertdialog"]').filter({hasText: /Error/}).last();
    if (!(await dlg.isVisible().catch(() => false))) return null;
    const btn = dlg.getByRole('button', {name: /^(OK|Ok|Close|Cancel)$/}).first();
    const label = await btn.innerText().catch(() => null);
    await btn.click().catch(() => {});
    await dlg.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
    await sleep(600);
    return label;
}
const listGet = (page) => page.waitForResponse((r) => /\/_submissions\?/.test(r.url()) && r.request().method() === 'GET', {timeout: 15_000}).catch(() => null);
async function after(page, resp, name) {
    const r = await resp;
    await idle(page);
    await sleep(700);
    const w = await windows(page);
    const s = name ? await snap(page, name) : null;
    return {status: r ? r.status() : null, request: r ? `${r.request().method()} ${decodeURIComponent(r.url().replace(/^.*\/api\/v1/, ''))}`.slice(0, 200) : null, windows: w, orderNow: await order(page), errorClosedWith: await closeError(page), snapshot: !!s};
}
async function pressBox(page, title, name) {
    const it = item(page, title);
    const btn = it.getByRole('button', {name: FEAT_OFF, exact: true}).or(it.getByRole('button', {name: FEAT_ON, exact: true})).first();
    const before = (await btn.getAttribute('aria-label').catch(() => null)) || flat(await btn.innerText().catch(() => ''), 100);
    const resp = page.waitForResponse((r) => /saveDisplayFlags/.test(r.url()), {timeout: 15_000}).catch(() => null);
    await btn.click();
    const out = await after(page, resp, name);
    out.before = /is featured/.test(before) ? 'F+' : 'F-';
    out.rowNow = (await rows(page)).find((r) => r.title === title);
    return out;
}
async function search(page, text, name) {
    const box = page.locator('.listPanel--catalog input.pkpSearch__input');
    await box.fill(text);
    const resp = listGet(page);
    await box.press('Enter');
    return after(page, resp, name);
}
async function filter(page, label, name) {
    const col = page.locator('button.pkpFilter__label').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)});
    if (!(await col.first().isVisible().catch(() => false))) {
        await page.getByRole('button', {name: 'Filters', exact: true}).click();
        await col.first().waitFor({timeout: T});
    }
    const resp = listGet(page);
    await col.first().click();
    return after(page, resp, name);
}
async function orderFeatures(page, name) {
    const out = {offered: await page.getByRole('button', {name: 'Order Features', exact: true}).count()};
    if (!out.offered) return out;
    await page.getByRole('button', {name: 'Order Features', exact: true}).click();
    await page.getByRole('button', {name: 'Save Order', exact: true}).waitFor({timeout: 10_000}).catch(() => {});
    const feat = (await rows(page)).filter((r) => r.F === '+').map((r) => r.title);
    out.featuredShown = feat;
    // move the second featured book up one place (never the last one down: screen-notes)
    if (feat.length >= 2) {
        await item(page, feat[1]).getByRole('button', {name: /Increase position/}).click();
        await sleep(400);
    }
    out.beforeSave = (await rows(page)).filter((r) => r.F === '+').map((r) => r.title);
    const resp = page.waitForResponse((r) => /saveFeaturedOrder/.test(r.url()), {timeout: 15_000}).catch(() => null);
    await page.getByRole('button', {name: 'Save Order', exact: true}).click();
    Object.assign(out, await after(page, resp, name));
    out.headerNow = (await header(page)).controls;
    return out;
}

// ---------------------------------------------------------------- "Add Entry"
const BOX = 'Find monographs to add to the catalog';
const panel = (page) => page.getByRole('dialog', {name: 'Add Entry'});
const pbox = (page) => panel(page).getByRole('combobox', {name: BOX});
async function suggest(page, text) {
    const b = pbox(page);
    await b.click();
    await b.fill('');
    const got = page.waitForResponse((r) => /\/_?submissions\?/.test(r.url()) && r.request().method() === 'GET', {timeout: 10_000}).catch(() => null);
    await b.pressSequentially(text, {delay: 30});
    const r = await got;
    await idle(page);
    await sleep(700);
    const options = (await panel(page).getByRole('option').allInnerTexts().catch(() => [])).map((t) => flat(t, 100));
    return {typed: text, status: r ? r.status() : null, request: r ? decodeURIComponent(r.url().replace(/^.*\/api\/v1/, '')).slice(0, 200) : null, options};
}
async function addEntry(page, typeText, chooseTitle, name) {
    const out = {};
    await page.getByRole('button', {name: 'Add Entry', exact: true}).click();
    await pbox(page).waitFor({timeout: T});
    await idle(page);
    out.suggestions = [];
    for (const t of [].concat(typeText)) out.suggestions.push(await suggest(page, t));
    if (chooseTitle) {
        await suggest(page, chooseTitle);
        const opt = panel(page).getByRole('option', {name: chooseTitle}).first();
        if (await opt.count()) {
            await opt.click();
            await idle(page);
            await sleep(400);
            const resp = page.waitForResponse((r) => /addToCatalog/.test(r.url()), {timeout: 15_000}).catch(() => null);
            await panel(page).getByRole('button', {name: 'Save', exact: true}).click();
            Object.assign(out, await after(page, resp, name));
            out.panelOpen = await panel(page).isVisible().catch(() => false);
        } else {
            out.chooseMissing = chooseTitle;
        }
    }
    if (await panel(page).isVisible().catch(() => false)) {
        await panel(page).getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(600);
    }
    return out;
}

// ---------------------------------------------------------------- the workflow
async function openWorkflow(page, app, P, sid, {menuKey, author} = {}) {
    const dash = author ? 'mySubmissions' : 'editorial';
    await page.goto(ctxUrl(app, P, `/dashboard/${dash}?workflowSubmissionId=${sid}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
    await idle(page);
    await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(500);
}
async function wfMenu(page, P) {
    const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
    try {
        return (await new WorkflowPage(page, P).menuEntries()).map((e) => `${'  '.repeat((e.level || 1) - 1)}${e.label}${e.selected ? ' *' : ''}`);
    } catch (e) {
        return [`menu read failed: ${String(e.message).split('\n')[0]}`];
    }
}
async function production(page, app, P, sid, name, {author} = {}) {
    await openWorkflow(page, app, P, sid, {menuKey: 'workflow_5', author});
    await page.getByRole('heading', {name: /Workflow: Production|Production/}).first().waitFor({timeout: 15_000}).catch(() => {});
    await idle(page);
    await sleep(800);
    const s = await snap(page, name);
    const region = page.locator('[data-cy="workflow-primary-items"]').first();
    const data = await region.evaluate((r) => {
        const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
        const heads = [...r.querySelectorAll('h1,h2,h3,h4')].map((h) => txt(h));
        const cm = [...r.querySelectorAll('h1,h2,h3,h4')].find((h) => /Catalog Management|Awaiting approval/.test(h.innerText));
        return {headings: heads, notice: cm ? txt(cm.parentElement) : null, noticeLinks: cm ? [...cm.parentElement.querySelectorAll('a')].map((a) => txt(a)) : [], regionText: txt(r).slice(0, 700)};
    }).catch((e) => ({err: String(e.message || e).split('\n')[0]}));
    return {url: (s.url || '').replace(/^.*index\.php/, ''), ...data};
}
async function publish(page) {
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Publish', exact: true}).click();
    const dlg = page.getByRole('dialog', {name: /Schedule For Publication/}).last();
    await dlg.waitFor({timeout: T});
    await idle(page);
    const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Publish', exact: true}).click();
    const r = await done;
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return {status: r ? r.status() : null};
}
const urlBox = (page) => page.locator('input[name="urlPath"]');
const entryForm = (page) => page.locator('form').filter({has: page.locator('input[name="urlPath"]')}).first();
async function catalogEntry(page, app, P, b, name, {author, save} = {}) {
    await openWorkflow(page, app, P, b.id, {author});
    const o = {menu: await wfMenu(page, P)};
    o.listed = o.menu.some((m) => /Catalog Entry/.test(m));
    o.marketingGroup = o.menu.filter((m) => /^Marketing/.test(m.trim()));
    await openWorkflow(page, app, P, b.id, {menuKey: `publication_${b.pub}_catalogEntry`, author});
    await urlBox(page).waitFor({timeout: 12_000}).catch(() => {});
    await idle(page);
    await sleep(600);
    const s = await snap(page, name);
    o.landedHeading = flat(await page.getByRole('heading', {name: /^(Publication|Workflow): /}).first().innerText({timeout: 3000}).catch(() => null), 100);
    o.formShown = await urlBox(page).count();
    const btn = entryForm(page).getByRole('button', {name: 'Save', exact: true});
    o.save = await btn.count();
    o.saveDisabled = o.save ? await btn.first().isDisabled() : null;
    if (save && o.save && !o.saveDisabled) {
        await page.locator('input[name="seriesPosition"]').fill(`K1 ${name}`);
        const resp = page.waitForResponse((r) => /\/submissions\/\d+\/publications\/\d+(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await btn.first().click();
        const r = await resp;
        await sleep(1500);
        o.saveStatus = r ? r.status() : null;
        o.footer = flat(await entryForm(page).innerText().catch(() => ''), 2000).slice(-120);
        await openWorkflow(page, app, P, b.id, {menuKey: `publication_${b.pub}_catalogEntry`, author});
        await urlBox(page).waitFor({timeout: 12_000}).catch(() => {});
        o.afterReload = await page.locator('input[name="seriesPosition"]').inputValue().catch(() => null);
    }
    o.url = (s.url || '').replace(/^.*index\.php/, '');
    return o;
}

// ---------------------------------------------------------------- public pages
async function visit(vis, url, name) {
    let r = null;
    let err = null;
    try {
        r = await vis.goto(url);
    } catch (e) {
        err = String(e.message || e).split('\n')[0];
    }
    await idle(vis).catch(() => {});
    await snap(vis, name);
    const data = await vis.evaluate(() => {
        const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        return {
            h1: txt(document.querySelector('h1')),
            title: document.title,
            lists: [...document.querySelectorAll('h2, h3')].map(txt).filter(Boolean).slice(0, 12),
            titles: [...document.querySelectorAll('.obj_monograph_summary .title')].map(txt),
            breadcrumb: txt(document.querySelector('.cmp_breadcrumbs')),
        };
    }).catch((e) => ({evalErr: String(e.message || e).split('\n')[0]}));
    return {status: r ? r.status() : null, err, url: vis.url(), ...data};
}

// ================================================================= the drive
forEachApp(async (app) => {
    const isOmp = app.name === 'omp';
    const A = await launch(app);
    const V = await launch(app);
    const page = A.page;
    const vis = V.page;
    const apiLog = [];
    page.on('response', (r) => {
        const u = r.url();
        if (/\/api\/v1\/_?submissions/.test(u) && !/_test\//.test(u)) apiLog.push(`${r.request().method()} ${r.status()} ${decodeURIComponent(u.replace(/^.*\/api\/v1/, '')).slice(0, 140)}`);
    });
    const browserDialogs = [];
    page.on('dialog', async (d) => {
        browserDialogs.push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    try {
        // ------------------------------------------------ absence (td1; lines 24-31, 315-318) and the OMP control
        if (on('absence')) {
            await step(`absence-${app.name}`, async (out) => {
                // signed out first: the typed address
                out.signedOut = await typedCatalog(vis, app, 'publicknowledge', 'ab-signedout-manageCatalog');
                await signIn(page, 'manager.maya');
                out.side = await landSideMenu(page, app, 'publicknowledge', 'ab-sidemenu');
                out.contentGroup = Array.isArray(out.side.menu) ? (out.side.menu.find((g) => g.label === 'Content') || {}).items || null : null;
                out.catalogAnywhere = Array.isArray(out.side.menu) ? out.side.menu.flatMap((g) => g.items).filter((i) => /^Catalog\b/.test(i)) : null;
                out.typed = await typedCatalog(page, app, 'publicknowledge', 'ab-manageCatalog');
                if (isOmp) {
                    // preamble 316-317: the seeded press's catalog holds what earlier runs published
                    out.seededCatalog = {rows: await page.locator('.listPanel__item--catalog').count(), pagination: (await header(page)).pagination, firstTitles: (await order(page)).slice(0, 12)};
                    out.publishedOnSeededPress = sql(app, "select count(*) from submissions s join presses p on p.press_id=s.context_id where p.path='publicknowledge' and s.status=3");
                } else {
                    const table = app.name === 'ojs' ? 'journals' : 'servers';
                    const idc = app.name === 'ojs' ? 'journal_id' : 'server_id';
                    const row = sql(app, `select s.submission_id, s.current_publication_id from submissions s join ${table} c on c.${idc}=s.context_id where c.path='publicknowledge' and s.status=3 order by s.submission_id limit 1`);
                    const [sid, pub] = row.split('|').map(Number);
                    out.published = {sid, pub, raw: row};
                    if (sid) {
                        await openWorkflow(page, app, 'publicknowledge', sid);
                        out.wfMenu = await wfMenu(page, 'publicknowledge');
                        await snap(page, 'ab-workflow');
                        out.production = await production(page, app, 'publicknowledge', sid, 'ab-production');
                        await openWorkflow(page, app, 'publicknowledge', sid, {menuKey: `publication_${pub}_catalogEntry`});
                        const s = await snap(page, 'ab-typed-catalogEntry-key');
                        out.typedEntryKey = {url: (s.url || '').replace(/^.*index\.php/, ''), selected: (await wfMenu(page, 'publicknowledge')).filter((m) => m.endsWith('*')), urlPathBox: await urlBox(page).count()};
                    }
                }
                await signOut(page);
            });
        }
        if (!isOmp) return;

        // ------------------------------------------------ roles (lines 12-22, 36-50, 278-311, A1)
        if (on('roles')) {
            const P = tag('u70k1');
            const S = {};
            const U = (k) => `${P}${k}`;
            await step('roles-seed', async (out) => {
                await must(app, 'scenarios/context', {
                    tag: P, context: {name: {en: `K1 Press ${P}`}},
                    categories: [{path: 'sci', title: 'Science'}, {path: 'arts', title: 'Arts'}],
                    series: [{path: 'hist', title: 'History'}],
                    users: [
                        {username: U('mg'), roles: ['manager']}, {username: U('ed'), roles: ['editor']},
                        {username: U('pe'), roles: ['productionEditor']}, {username: U('se'), roles: ['sectionEditor']},
                        {username: U('mk'), roles: ['marketing']}, {username: U('le'), roles: ['layoutEditor']},
                        {username: U('au'), roles: ['author']}, {username: U('rv'), roles: ['externalReviewer']},
                        {username: U('rd'), roles: ['reader']},
                    ],
                });
                const seed = async (key, title, extra) => {
                    const r = await must(app, 'scenarios/submission', {tag: `${P}${key}`, context: P, submitter: U('au'), title, ...extra});
                    return {id: r.submissionId, pub: r.publicationId};
                };
                const PROD = ['skipExternalReview', 'sendToProduction'];
                S.alpha = await seed('a', 'K1 Alpha', {published: true, datePublished: '2024-01-10', categories: ['sci'], series: 'hist', featured: [{in: 'catalog', position: 1}, {in: 'category', path: 'sci'}]});
                S.beta = await seed('b', 'K1 Beta', {published: true, datePublished: '2024-02-10', featured: [{in: 'catalog', position: 2}], newRelease: [{in: 'catalog'}]});
                S.gamma = await seed('g', 'K1 Gamma', {published: true, datePublished: '2024-03-10', categories: ['arts']});
                S.delta = await seed('d', 'K1 Delta Production', {decisions: PROD, participants: [{username: U('se'), role: 'sectionEditor'}, {username: U('le'), role: 'layoutEditor'}, {username: U('mk'), role: 'marketing'}]});
                S.eps = await seed('e', 'K1 Epsilon Production', {decisions: PROD});
                S.pm = await seed('p1', 'K1 Zeta Production', {decisions: PROD});
                S.pe = await seed('p2', 'K1 Eta Production', {decisions: PROD});
                S.pr = await seed('p3', 'K1 Theta Production', {decisions: PROD});
                S.ad = await seed('p4', 'K1 Iota Production', {decisions: PROD});
                Object.assign(out, {P, ...S});
                note(`ccK1 [omp] roles: press ${P}, books ${JSON.stringify(S)}`);
            });
            const managers = [[U('mg'), 'pressManager'], [U('ed'), 'pressEditor'], [U('pe'), 'productionEditor'], ['admin', 'admin']];
            const others = [[U('mk'), 'marketing'], [U('le'), 'layoutEditor'], [U('au'), 'author'], [U('rv'), 'reviewer'], [U('rd'), 'reader']];

            // signed out: the typed address (line 39)
            await step('signedOut', async (out) => Object.assign(out, await typedCatalog(vis, app, P, 'r-signedout-manageCatalog')));

            // side menu and typed address, every role (lines 18-19, 36-38, 44; A1)
            for (const [who, name] of [...managers, [U('se'), 'seriesEditor'], ...others]) {
                await step(`access-${name}`, async (out) => {
                    await signIn(page, who);
                    out.side = await landSideMenu(page, app, P, `r-side-${name}`);
                    out.content = Array.isArray(out.side.menu) ? (out.side.menu.find((g) => g.label === 'Content') || {}).items || null : null;
                    out.groups = Array.isArray(out.side.menu) ? out.side.menu.map((g) => g.label) : out.side.menu;
                    delete out.side.menu;
                    out.typed = await typedCatalog(page, app, P, `r-typed-${name}`);
                    if (out.typed.rows) {
                        out.header = await header(page);
                        out.rows = await rows(page);
                        out.rowControls = await page.locator('.listPanel__item--catalog').first().evaluate((e) => [...e.querySelectorAll('a, button')].filter((b) => b.offsetParent !== null).map((b) => ({t: (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim(), href: b.getAttribute('href')}))).catch(() => null);
                    }
                });
            }

            // the Series editor's actions (A1, td2 3-5), before any manager publishes the Production books
            await step('se-actions', async (out) => {
                apiLog.length = 0;
                await signIn(page, U('se'));
                await openCatalog(page, app, P);
                out.start = await rows(page);
                out.box = await pressBox(page, 'K1 Gamma', 'r-se-box');
                await openCatalog(page, app, P);
                out.boxAfterReload = (await rows(page)).find((r) => r.title === 'K1 Gamma');
                out.search = await search(page, 'Alpha', 'r-se-search');
                await openCatalog(page, app, P);
                out.filter = await filter(page, 'Science', 'r-se-filter');
                await openCatalog(page, app, P);
                out.order = await orderFeatures(page, 'r-se-saveorder');
                await openCatalog(page, app, P);
                out.orderAfterReload = (await rows(page)).filter((r) => r.F === '+').map((r) => r.title);
                out.addEntry = await addEntry(page, ['Delta', 'Epsilon', 'K1'], 'K1 Delta Production', 'r-se-addentry');
                await openCatalog(page, app, P);
                out.listAfterAdd = await order(page);
                out.deltaStatus = sql(app, `select status from submissions where submission_id=${S.delta.id}`);
                // sweep: the row's "View Submission" for a book the Series editor is not assigned to
                const vs = item(page, 'K1 Gamma').getByRole('link', {name: /View Submission/}).or(item(page, 'K1 Gamma').getByRole('button', {name: /View Submission/})).first();
                out.viewSubmissionCount = await vs.count();
                if (out.viewSubmissionCount) {
                    await vs.click();
                    await idle(page);
                    await sleep(1500);
                    const s = await snap(page, 'r-se-viewsubmission');
                    out.viewSubmission = {url: (s.url || '').replace(/^.*index\.php/, ''), windows: await windows(page), wf: flat(s.text && s.text.dialog, 300)};
                }
                out.api = apiLog.slice();
            });

            // the manager-level roles and the Site Administrator (Actors rows 2-5 control)
            const own = {pressManager: 'K1 Zeta Production', pressEditor: 'K1 Eta Production', productionEditor: 'K1 Theta Production', admin: 'K1 Iota Production'};
            for (const [who, name] of managers) {
                await step(`mgr-actions-${name}`, async (out) => {
                    apiLog.length = 0;
                    await signIn(page, who);
                    await openCatalog(page, app, P);
                    out.box = await pressBox(page, 'K1 Gamma', `r-${name}-box`);
                    await openCatalog(page, app, P);
                    out.boxAfterReload = (await rows(page)).find((r) => r.title === 'K1 Gamma');
                    out.search = await search(page, 'Alpha', null);
                    await openCatalog(page, app, P);
                    out.filter = await filter(page, 'Science', null);
                    await openCatalog(page, app, P);
                    out.order = await orderFeatures(page, `r-${name}-saveorder`);
                    await openCatalog(page, app, P);
                    out.orderAfterReload = (await rows(page)).filter((r) => r.F === '+').map((r) => r.title);
                    out.addEntry = await addEntry(page, ['Production'], own[name], `r-${name}-addentry`);
                    await openCatalog(page, app, P);
                    out.listAfterAdd = await order(page);
                    out.api = apiLog.slice();
                });
            }

            // sweep: leave the Catalog page with "Add Entry" holding a choice (unsaved), as the Press manager
            await step('leave-unsaved', async (out) => {
                await signIn(page, U('mg'));
                await openCatalog(page, app, P);
                await page.getByRole('button', {name: 'Add Entry', exact: true}).click();
                await pbox(page).waitFor({timeout: T});
                await suggest(page, 'Epsilon');
                const opt = panel(page).getByRole('option', {name: 'K1 Epsilon Production'}).first();
                if (await opt.count()) await opt.click();
                await sleep(400);
                const d0 = browserDialogs.length;
                await page.goto(ctxUrl(app, P, '/submissions'));
                await idle(page);
                out.browserDialogs = browserDialogs.slice(d0);
                out.landed = page.url().replace(/^.*index\.php/, '');
                out.epsStatus = sql(app, `select status from submissions where submission_id=${S.eps.id}`);
            });

            // the Production notice before and after publishing (td15; line 50), then who reads it
            await step('notice', async (out) => {
                await signIn(page, U('mg'));
                out.beforePublish = await production(page, app, P, S.delta.id, 'r-notice-before');
                await openWorkflow(page, app, P, S.delta.id, {menuKey: `publication_${S.delta.pub}_titleAbstract`});
                out.publish = await publish(page);
                out.pressManager = await production(page, app, P, S.delta.id, 'r-notice-pressManager');
                for (const [who, name, author] of [[U('se'), 'seriesEditor'], [U('le'), 'layoutEditor'], [U('mk'), 'marketing'], [U('au'), 'author', true], ['admin', 'admin']]) {
                    await signIn(page, who);
                    out[name] = await production(page, app, P, S.delta.id, `r-notice-${name}`, {author});
                }
            });

            // the Catalog Entry page per role (td3; line 49)
            for (const [who, name, opts] of [[U('mg'), 'pressManager', {save: true}], [U('se'), 'seriesEditor', {save: true}], [U('le'), 'layoutEditor', {save: true}], [U('mk'), 'marketing', {save: true}], ['admin', 'admin', {save: true}], [U('au'), 'author', {author: true}]]) {
                await step(`entry-${name}`, async (out) => {
                    await signIn(page, who);
                    Object.assign(out, await catalogEntry(page, app, P, S.delta, `r-entry-${name}`, opts));
                });
            }
            // sweep: the Catalog Entry page left with an edit unsaved (Press manager)
            await step('entry-leave-unsaved', async (out) => {
                await signIn(page, U('mg'));
                await openWorkflow(page, app, P, S.alpha.id, {menuKey: `publication_${S.alpha.pub}_catalogEntry`});
                await urlBox(page).waitFor({timeout: 12_000}).catch(() => {});
                await idle(page);
                const before = await page.locator('input[name="seriesPosition"]').inputValue().catch(() => null);
                await page.locator('input[name="seriesPosition"]').fill('Unsaved K1');
                const d0 = browserDialogs.length;
                await page.getByRole('link', {name: 'Title & Abstract', exact: true}).first().click().catch((e) => { out.clickErr = String(e.message).split('\n')[0]; });
                await idle(page);
                await sleep(800);
                out.windows = await windows(page);
                out.browserDialogs = browserDialogs.slice(d0);
                await openWorkflow(page, app, P, S.alpha.id, {menuKey: `publication_${S.alpha.pub}_catalogEntry`});
                await urlBox(page).waitFor({timeout: 12_000}).catch(() => {});
                out.before = before;
                out.afterReturn = await page.locator('input[name="seriesPosition"]').inputValue().catch(() => null);
            });

            // Purpose (lines 12-22): what the Press manager's two screens hold
            await step('purpose', async (out) => {
                await signIn(page, U('mg'));
                await openCatalog(page, app, P);
                out.header = await header(page);
                out.saveButtonsOnPage = out.header.pageButtons.filter((b) => /^Save$/.test(b));
                out.rows = await rows(page);
                await snap(page, 'r-purpose-catalog');
                out.catFilter = await filter(page, 'Science', 'r-purpose-category');
                out.catRows = await page.locator('.listPanel__item--catalog').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => [...e.querySelectorAll('button')].map((b) => (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim()).filter((t) => /monograph/.test(t))));
                out.catHeadings = await page.locator('.listPanel--catalog__heading').allInnerTexts();
                await openCatalog(page, app, P);
                out.seriesFilter = await filter(page, 'History', 'r-purpose-series');
                out.seriesHeadings = await page.locator('.listPanel--catalog__heading').allInnerTexts();
                const e = await catalogEntry(page, app, P, S.alpha, 'r-purpose-entry', {});
                out.entryListed = e.listed;
                out.marketingGroup = e.marketingGroup;
                out.entryMenu = e.menu;
                out.entryLabels = await entryForm(page).locator('.pkpFormFieldLabel, legend').allInnerTexts().then((a) => a.map((t) => flat(t, 60))).catch(() => null);
                out.entryGroups = await entryForm(page).locator('.pkpFormGroup__heading, .pkpFormGroup__label').allInnerTexts().then((a) => a.map((t) => flat(t, 60))).catch(() => null);
                // "View Entry" on the Catalog page (Cross-feature: Monograph landing page)
                await openCatalog(page, app, P);
                const ve = item(page, 'K1 Alpha').getByRole('link', {name: /View Entry/}).first();
                out.viewEntryHref = await ve.getAttribute('href').catch(() => null);
                out.viewEntryTarget = await ve.getAttribute('target').catch(() => null);
            });

            // Cross-feature pointers (lines 288-296): the public catalog, a category page, a series page
            await step('public', async (out) => {
                await signOut(vis).catch(() => {});
                out.catalog = await visit(vis, ctxUrl(app, P, '/catalog'), 'r-pub-catalog');
                out.categoryRightAfter = await visit(vis, ctxUrl(app, P, '/catalog/category/sci'), 'r-pub-category-sci');
                out.categoryAgain = await visit(vis, ctxUrl(app, P, '/catalog/category/sci'), 'r-pub-category-sci-2');
                out.series = await visit(vis, ctxUrl(app, P, '/catalog/series/hist'), 'r-pub-series-hist');
                if (out.viewEntryHref) out.book = await visit(vis, out.viewEntryHref, 'r-pub-book');
                const href = facts.purpose && facts.purpose.viewEntryHref;
                if (href) out.viewEntry = await visit(vis, href.startsWith('http') ? href : app.url(href), 'r-pub-viewentry');
            });
            await signOut(page).catch(() => {});
        }

        // ------------------------------------------------ catpage (Cross-feature 288-292: the category page's featured-first order; U16 OMP5 after the public catalog)
        if (on('catpage')) {
            const C = tag('u70k1');
            await step('catpage', async (out) => {
                await must(app, 'scenarios/context', {tag: C, context: {name: {en: `K1 Cat ${C}`}}, categories: [{path: 'sci', title: 'Science'}], users: [{username: `${C}mg`, roles: ['manager']}, {username: `${C}au`, roles: ['author']}]});
                const seed = (k, title, extra) => must(app, 'scenarios/submission', {tag: `${C}${k}`, context: C, submitter: `${C}au`, title, published: true, categories: ['sci'], ...extra});
                await seed('o', 'K1 Old Featured', {datePublished: '2022-01-10', featured: [{in: 'category', path: 'sci'}]});
                await seed('n', 'K1 New Plain', {datePublished: '2024-06-10'});
                await seed('m', 'K1 Mid Plain', {datePublished: '2023-06-10'});
                out.C = C;
                const env = {...process.env, PKP_CONFIG_FILE: app.configFile};
                for (let i = 0; i < 3; i++) {
                    try { execFileSync('php', ['lib/pkp/tools/jobs.php', 'work', '--stop-when-empty'], {cwd: app.root, env, stdio: 'ignore', timeout: 120_000}); } catch (e) { /* another feature's job */ }
                }
                for (let i = 1; i <= 3; i++) {
                    const W = await launch(app);
                    try {
                        out[`catalog${i}`] = await visit(W.page, ctxUrl(app, C, '/catalog'), `c-pub-catalog-${i}`);
                        out[`category${i}`] = await visit(W.page, ctxUrl(app, C, '/catalog/category/sci'), `c-pub-category-${i}`);
                    } finally {
                        await W.close();
                    }
                }
                note(`ccK1 [omp] catpage: press ${C}, category sci: "K1 Old Featured" (featured in category, 2022), "K1 Mid Plain" (2023), "K1 New Plain" (2024)`);
            });
        }

        // ------------------------------------------------ many (A1: "the first 30 books"; Rule 1's page link for the Series editor)
        if (on('many')) {
            const Q = tag('u70k1');
            await step('many-seed', async (out) => {
                await must(app, 'scenarios/context', {tag: Q, context: {name: {en: `K1 Many ${Q}`}}, users: [{username: `${Q}mg`, roles: ['manager']}, {username: `${Q}se`, roles: ['sectionEditor']}, {username: `${Q}au`, roles: ['author']}]});
                for (let i = 1; i <= 31; i++) {
                    const n = String(i).padStart(2, '0');
                    await must(app, 'scenarios/submission', {tag: `${Q}m${n}`, context: Q, submitter: `${Q}au`, title: `K1 Many ${n}`, published: true, datePublished: `2023-01-${n === '31' ? '31' : n}`});
                }
                out.Q = Q;
                note(`ccK1 [omp] many: press ${Q}, 31 published books "K1 Many 01".."K1 Many 31"`);
            });
            for (const [who, name] of [[`${Q}se`, 'seriesEditor'], [`${Q}mg`, 'pressManager']]) {
                await step(`many-${name}`, async (out) => {
                    apiLog.length = 0;
                    await signIn(page, who);
                    await openCatalog(page, app, Q);
                    out.rows = await page.locator('.listPanel__item--catalog').count();
                    out.first = (await order(page))[0];
                    out.pagination = (await header(page)).pagination;
                    await snap(page, `m-${name}-page1`);
                    const next = page.locator('.listPanel--catalog .pkpPagination').getByRole('button', {name: 'Go to Page 2'});
                    out.page2Offered = await next.count();
                    if (out.page2Offered) {
                        const resp = listGet(page);
                        await next.click();
                        out.page2 = await after(page, resp, `m-${name}-page2`);
                        out.page2.rows = await page.locator('.listPanel__item--catalog').count();
                        out.page2.pagination = (await header(page)).pagination;
                    }
                    out.api = apiLog.slice();
                });
            }
        }
    } finally {
        fact(`browserDialogs-${app.name}`, browserDialogs);
        await A.close();
        await V.close();
    }
});
