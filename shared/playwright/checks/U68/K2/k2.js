// U68 claim check K2: the catalog page and the book summary (spec fields
// "The catalog page" and "The book summary", Rules 3–6 and 11, Settings
// bullets 1, 3, 4, 10, 11, 13, register A1, A2, A6; footnotes d, g, i, j, o,
// td2, td3, td4, td10, f-a1, f-a2, f-a6).
//
// OMP: every phase seeds its own scratch press (scenarios.md: series[],
// categories[], itemsPerPage, catalogSortOption, displayFeaturedBooks /
// displayNewReleases; published books with featured[] / newRelease[],
// position, urlPath, seriesPosition), signs in as that press's manager for
// the screen actions, and a signed-out visitor reads the public pages.
// OJS and OPS: the read-only control, a signed-out visitor typing the
// catalog addresses on publicknowledge (multi-app rule 4).
//
// Phases (PHASES=a,b,… picks; default all):
//   ctl       OJS/OPS catalog addresses as a visitor
//   empty     a press with no book: the empty catalog, bad page addresses,
//             the header link, the settings tabs' first state, a tab left unsaved
//   list      td2: published / scheduled / unpublished; A1
//   ao        td2: a book whose only published version is "Author Original"
//   order     td3, Rule 4 featured order, Rule 11 links and home lists
//   sort      td10, Settings 1, A6: every "Order of monographs" choice on screen
//   paging    Rule 5, Settings 4
//   seriesnav td4, Rule 6, Settings 3
//   summary   the book summary's parts, Settings 10, 11, 13, A2
//
// Run: PROBE_FEATURE=U68 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U68/K2/k2.js
// (ONLY=omp narrows; PHASES=order,sort picks). OMP outlasts 600 s: run detached (patterns.md "Probe kit").
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const PHASES = (process.env.PHASES || 'ctl,empty,list,ao,order,sort,paging,seriesnav,summary').split(',');
const on = (p) => PHASES.includes(p);
const T = 30_000;
const REPO = path.join(__dirname, '../../../../..');
const FILES = path.join(REPO, 'apps/omp/playwright/fixtures/files');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

const FEAT_OFF = 'This monograph is not featured. Make this monograph featured.';
const NEW_OFF = 'This monograph is not a new release. Make this monograph a new release.';
const PROD = ['skipExternalReview', 'sendToProduction'];

const facts = {};
function fact(key, value) {
    facts[key] = value;
    record('facts', {[key]: value}, {merge: true});
    console.log(`[fact] ${key}: ${JSON.stringify(value).slice(0, 900)}`);
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
function runJobs(app) {
    const env = {...process.env, PKP_CONFIG_FILE: app.configFile};
    for (let i = 0; i < 3; i++) {
        try {
            execFileSync('php', ['lib/pkp/tools/jobs.php', 'work', '--stop-when-empty'], {cwd: app.root, env, stdio: 'ignore', timeout: 120_000});
        } catch (e) {
            /* a failing job of another feature: carry on */
        }
    }
}
async function pngSize(url) {
    try {
        const r = await fetch(url, {cache: 'no-store'});
        const b = Buffer.from(await r.arrayBuffer());
        if (r.status !== 200) return {status: r.status};
        if (b.slice(1, 4).toString() !== 'PNG') return {status: r.status, notPng: true, bytes: b.length};
        return {status: r.status, w: b.readUInt32BE(16), h: b.readUInt32BE(20)};
    } catch (e) {
        return {error: String(e.message || e)};
    }
}
const ctxUrl = (app, P, p = '') => app.url(`/index.php/${P}${p}`);
function pressSpec(P, extra = {}) {
    return {
        tag: P,
        context: {name: {en: `K2 Press ${P}`}},
        users: [{username: `${P}mg`, roles: ['manager']}, {username: `${P}au`, roles: ['author']}, {username: `${P}rd`, roles: ['reader']}],
        ...extra,
    };
}
async function seedBook(app, P, key, title, extra = {}) {
    const r = await must(app, 'scenarios/submission', {tag: `${P}${key}`, context: P, submitter: `${P}au`, title, ...extra});
    return {id: r.submissionId, pub: r.publicationId, stageId: r.stageId, status: r.status};
}

// ---------------------------------------------------------------- the public pages as data
const EXTRACT = () => {
    const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
    const main = document.querySelector('.pkp_structure_main') || document.body;
    const sum = (s) => {
        const r = s.getBoundingClientRect();
        const cover = s.querySelector('a.cover');
        const img = cover && cover.querySelector('img');
        const tl = s.querySelector('.title a');
        const ir = img ? img.getBoundingClientRect() : null;
        return {
            featured: s.classList.contains('is_featured'),
            x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width),
            parts: [...s.children].map((c) => `${c.tagName.toLowerCase()}${c.className ? `.${String(c.className).replace(/\s+/g, '.')}` : ''}`),
            coverHref: cover && cover.getAttribute('href'),
            coverAria: cover && (cover.getAttribute('aria-label') || null),
            img: img && {src: img.getAttribute('src'), alt: img.getAttribute('alt'), nw: img.naturalWidth, nh: img.naturalHeight, w: Math.round(ir.width), h: Math.round(ir.height)},
            seriesPosition: txt(s.querySelector('.seriesPosition')),
            titleTag: s.querySelector('.title') ? s.querySelector('.title').tagName : null,
            title: txt(s.querySelector('.title')),
            titleHref: tl && tl.getAttribute('href'),
            author: txt(s.querySelector('.author')),
            date: txt(s.querySelector('.date')),
        };
    };
    const lists = [...main.querySelectorAll('.cmp_monographs_list')].map((l) => {
        const items = [...l.querySelectorAll('.obj_monograph_summary')].map(sum);
        const rows = {};
        items.forEach((i) => { (rows[i.y] = rows[i.y] || []).push(i.title); });
        return {heading: txt(l.querySelector(':scope > .title')), width: Math.round(l.getBoundingClientRect().width), items, rows: Object.values(rows)};
    });
    const nav = main.querySelector('.pkp_series_nav_menu');
    const pag = main.querySelector('.cmp_pagination');
    return {
        docTitle: document.title,
        trail: txt(document.querySelector('.cmp_breadcrumbs')),
        h1: txt(main.querySelector('h1')),
        count: txt(main.querySelector('.monograph_count')),
        seriesNav: nav ? {text: txt(nav), aria: nav.getAttribute('aria-label'), heading: txt(nav.querySelector('h2')), links: [...nav.querySelectorAll('a')].map((a) => ({t: txt(a), h: a.getAttribute('href')}))} : null,
        headings: [...main.querySelectorAll('h1,h2,h3')].map((h) => `${h.tagName}:${txt(h)}`),
        lists,
        titles: lists.flatMap((l) => l.items.map((i) => i.title)),
        pagination: pag ? {text: txt(pag), aria: pag.getAttribute('aria-label'), links: [...pag.querySelectorAll('a')].map((a) => ({t: txt(a), h: a.getAttribute('href'), cls: a.className}))} : null,
        paras: [...main.querySelectorAll('p')].map(txt).filter(Boolean).slice(0, 6),
        primaryNav: [...document.querySelectorAll('.pkp_navigation_primary > li > a')].map((a) => ({t: txt(a), h: a.getAttribute('href')})),
        mainText: txt(main).slice(0, 900),
    };
};
async function visit(vis, url, name) {
    const r = await vis.goto(url).catch((e) => ({err: String(e.message).slice(0, 200)}));
    await idle(vis).catch(() => {});
    await snap(vis, name);
    const data = await vis.evaluate(EXTRACT).catch((e) => ({err: String(e.message).slice(0, 200)}));
    const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
    return {status: r && typeof r.status === 'function' ? r.status() : (r && r.err) || null, url: rel(vis.url()), ...data};
}
/** The aria snapshot of every book summary (what a screen reader hears for the cover and title links). */
async function summaryAria(vis) {
    const n = await vis.locator('.obj_monograph_summary').count();
    const out = [];
    for (let i = 0; i < n; i++) out.push(await vis.locator('.obj_monograph_summary').nth(i).ariaSnapshot().catch((e) => `ERR ${e.message}`));
    return out;
}
const brief = (d) => ({status: d.status, url: d.url, docTitle: d.docTitle, trail: d.trail, h1: d.h1, count: d.count, seriesNav: d.seriesNav, titles: d.titles, rows: (d.lists || []).map((l) => ({heading: l.heading, rows: l.rows})), pagination: d.pagination, paras: d.paras});

// ---------------------------------------------------------------- the workflow (as U70 K5)
async function openWorkflow(page, app, P, sid, menuKey) {
    await page.goto(ctxUrl(app, P, `/dashboard/editorial?workflowSubmissionId=${sid}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
    await idle(page);
    await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(600);
}
const entryForm = (page) => page.locator('form').filter({has: page.locator('input[name="urlPath"]')}).first();
async function saveEntry(page) {
    const resp = page.waitForResponse((r) => /\/submissions\/\d+\/publications\/\d+(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await entryForm(page).getByRole('button', {name: 'Save', exact: true}).click();
    const r = await resp;
    await idle(page);
    await sleep(800);
    return r ? r.status() : null;
}
/** "Publish" in the workflow header, choosing the version stage when the app asks for one. */
async function publishOnScreen(page, stage = 'VoR') {
    const s = {};
    const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
    await btn.waitFor({state: 'visible', timeout: T});
    s.button = flat(await btn.innerText(), 60);
    await sleep(600);
    await btn.click();
    const vs = page.locator('select[name="versionStage"]');
    const confirm = page.getByRole('dialog').filter({hasText: /Are you sure|publish/i}).filter({has: page.getByRole('button', {name: 'Publish', exact: true})}).last();
    const which = await Promise.race([
        vs.waitFor({state: 'visible', timeout: 20_000}).then(() => 'stage'),
        confirm.waitFor({state: 'visible', timeout: 20_000}).then(() => 'confirm'),
    ]).catch(() => null);
    s.opened = which;
    if (which === 'stage') {
        s.stageOptions = await vs.locator('option').allInnerTexts().catch(() => []);
        await vs.selectOption(stage);
        const minor = page.locator('select[name="versionIsMinor"]');
        if (await minor.isVisible().catch(() => false)) await minor.selectOption('false').catch(() => {});
        await snap(page, `wf-version-stage-${stage}`);
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

// ---------------------------------------------------------------- Settings › Website (as U10 K4)
const SIDE = {Setup: ['appearance', 'appearance-setup'], Theme: ['appearance', 'theme'], Advanced: ['appearance', 'advanced'], Lists: ['setup', 'lists'], 'Date & Time': ['setup', 'dateTime']};
async function openSide(page, app, P, side) {
    const [top, id] = SIDE[side];
    await page.goto(ctxUrl(app, P, '/management/settings/website'));
    await idle(page);
    await page.locator(`#${top}-button`).first().click();
    await idle(page); await sleep(400);
    await page.locator(`#${id}-button`).first().click();
    await idle(page); await sleep(700);
    return page.locator(`[role="tabpanel"]#${id}`).first();
}
async function formDump(root) {
    return root.evaluate((el) => {
        const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const fields = [...el.querySelectorAll('.pkpFormField')].filter((f) => !f.parentElement.closest('.pkpFormField')).filter(vis).map((f) => ({
            label: txt(f.querySelector('legend, .pkpFormFieldLabel, label')),
            description: [...f.querySelectorAll('.pkpFormField__description')].map(txt).filter(Boolean),
            inputs: [...f.querySelectorAll('input, select')].filter((i) => i.type !== 'hidden').map((i) => {
                const lab = i.id ? el.querySelector(`label[for="${i.id}"]`) : i.closest('label');
                return {type: i.type, name: i.name, value: i.value, checked: ['radio', 'checkbox'].includes(i.type) ? i.checked : undefined, label: lab ? txt(lab) : null};
            }),
        }));
        return {text: txt(el).slice(0, 2500), fields};
    });
}
async function saveForm(page, root) {
    const form = root.locator('form').first();
    const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 10_000}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).last().click({timeout: 8000});
    const r = await w;
    const saved = await form.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 6000}).then(() => true).catch(() => false);
    await sleep(400);
    const errors = await form.locator('.pkpFieldError').allInnerTexts().catch(() => []);
    return {status: r ? r.status() : null, saved, errors};
}
async function tickShowSeries(page, app, P, want = true) {
    const pn = await openSide(page, app, P, 'Theme');
    const box = pn.getByRole('checkbox', {name: "Add list of links to all of the press's series on the catalog page"});
    await box.waitFor({timeout: T});
    const before = await box.isChecked();
    if (before !== want) await box.click();
    const save = await saveForm(page, pn);
    const pn2 = await openSide(page, app, P, 'Theme');
    const after = await pn2.getByRole('checkbox', {name: "Add list of links to all of the press's series on the catalog page"}).isChecked().catch(() => null);
    return {before, save, afterReload: after};
}
async function pickSort(page, app, P, value) {
    const pn = await openSide(page, app, P, 'Setup');
    await pn.locator(`input[type=radio][name="catalogSortOption"][value="${value}"]`).first().check();
    const save = await saveForm(page, pn);
    return save;
}

// ---------------------------------------------------------------- the Catalog page (management)
async function manageCatalogTitles(page, app, P) {
    await page.goto(ctxUrl(app, P, '/manageCatalog'));
    await idle(page);
    await page.locator('.listPanel__item--catalog, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return page.locator('.listPanel__item--catalog .listPanel__itemSubtitle').allInnerTexts().then((a) => a.map((t) => flat(t, 80))).catch(() => []);
}
async function pressBox(page, app, P, title, name) {
    await manageCatalogTitles(page, app, P);
    const row = page.locator('.listPanel__item--catalog').filter({has: page.locator('.listPanel__itemSubtitle', {hasText: title})});
    const done = page.waitForResponse((r) => /saveDisplayFlags/.test(r.url()), {timeout: T}).catch(() => null);
    await row.getByRole('button', {name, exact: true}).click();
    const r = await done;
    await idle(page);
    return r ? r.status() : null;
}

// ================================================================= the drive
forEachApp(async (app) => {
    const isOmp = app.name === 'omp';
    const mg = await launch(app);
    const vs = await launch(app);
    const page = mg.page;
    const vis = vs.page;
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), url: page.url()});
        await d.accept().catch(() => {});
    });
    try {
        // ------------------------------------------------ ctl (multi-app rule 4)
        if (on('ctl') && !isOmp) {
            await step(`ctl-${app.name}`, async (out) => {
                for (const [k, p] of [['catalog', '/catalog'], ['page2', '/catalog/page/2'], ['newReleases', '/catalog/newReleases'], ['series', '/catalog/series/monographs']]) {
                    const d = await visit(vis, ctxUrl(app, app.contextPath, p), `ctl-${k}`);
                    out[k] = {status: d.status, url: d.url, docTitle: d.docTitle, h1: d.h1, count: d.count, summaries: (d.titles || []).length, primaryNav: (d.primaryNav || []).map((a) => a.t)};
                }
            });
        }
        if (!isOmp) return;

        // ------------------------------------------------ empty press
        if (on('empty')) {
            const P = `${tag('u68k2')}e`;
            await step('empty-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P));
                out.P = P;
                note(`ccK2 [omp] empty: press ${P} (no book, no series)`);
            });
            await step('empty-visitor', async (out) => {
                // the header's "Catalog" from the home page
                const home = await visit(vis, ctxUrl(app, P), 'e-01-home');
                out.homeNav = home.primaryNav;
                const link = vis.locator('.pkp_navigation_primary').getByRole('link', {name: 'Catalog', exact: true});
                await loc(vis, 'public header: "Catalog" link', link);
                await link.click();
                await idle(vis);
                out.headerCatalogLands = vis.url().replace(app.baseURL, '');
                const d = await visit(vis, ctxUrl(app, P, '/catalog'), 'e-02-catalog-empty');
                out.catalog = brief(d);
                out.catalog.headings = d.headings;
                await loc(vis, 'catalog: count', vis.locator('.monograph_count'));
                await loc(vis, 'catalog: heading', vis.locator('.pkp_structure_main h1'));
                await loc(vis, 'catalog: trail', vis.locator('.cmp_breadcrumbs'));
                for (const [k, p] of [['page1', '/catalog/page/1'], ['page2', '/catalog/page/2'], ['page0', '/catalog/page/0'], ['pageX', '/catalog/page/abc'], ['pageNone', '/catalog/page']]) {
                    const x = await visit(vis, ctxUrl(app, P, p), `e-03-${k}`);
                    out[k] = {status: x.status, url: x.url, docTitle: x.docTitle, h1: x.h1, count: x.count, paras: x.paras};
                }
            });
            await step('empty-settings-first-state', async (out) => {
                await signIn(page, `${P}mg`, {contextPath: P});
                for (const [k, side] of [['setup', 'Setup'], ['theme', 'Theme'], ['advanced', 'Advanced'], ['lists', 'Lists'], ['dateTime', 'Date & Time']]) {
                    const pn = await openSide(page, app, P, side);
                    await snap(page, `e-04-settings-${k}`);
                    const f = await formDump(pn);
                    const pick = (re) => f.fields.filter((x) => re.test(x.label || ''));
                    out[k] = k === 'setup' ? pick(/Order of monographs|Featured|New Releases/) : k === 'theme' ? pick(/Show Series/) : k === 'advanced' ? pick(/Cover Image/) : k === 'lists' ? pick(/Items per page|Page links/) : pick(/^Date/);
                }
                await loc(page, 'Appearance › Setup: "Order of monographs" radios', page.locator('input[type=radio][name="catalogSortOption"]'));
                out.db = sql(app, `select setting_name, setting_value from press_settings where press_id=(select press_id from presses where path='${P}') and setting_name in ('catalogSortOption','itemsPerPage','coverThumbnailsMaxWidth','coverThumbnailsMaxHeight','dateFormatLong')`);
            });
            await step('empty-leave-unsaved', async (out) => {
                // a tabbed settings screen left once with something changed and unsaved
                const pn = await openSide(page, app, P, 'Setup');
                await pn.locator('input[type=radio][name="catalogSortOption"][value="title-ASC"]').first().check();
                const n0 = dialogs.length;
                await page.locator('#theme-button').first().click();
                await idle(page); await sleep(700);
                out.afterTabSwitch = {dialogs: dialogs.slice(n0), visibleDialogs: (await page.locator('[role="dialog"]:visible').allInnerTexts().catch(() => [])).map((t) => flat(t, 200))};
                await snap(page, 'e-05-left-setup-for-theme');
                await page.locator('#appearance-setup-button').first().click();
                await idle(page); await sleep(500);
                out.backOnSetup = await page.locator('input[type=radio][name="catalogSortOption"]:checked').evaluate((e) => e.value).catch(() => 'none');
                const n1 = dialogs.length;
                await page.goto(ctxUrl(app, P, '/management/settings/context')).catch((e) => { out.gotoErr = flat(e.message, 200); });
                await idle(page);
                out.afterLeave = dialogs.slice(n1);
                const pn2 = await openSide(page, app, P, 'Setup');
                out.reopened = await pn2.locator('input[type=radio][name="catalogSortOption"]:checked').evaluate((e) => e.value).catch(() => 'none');
            });
            await step('empty-show-series-none', async (out) => {
                out.tick = await tickShowSeries(page, app, P, true);
                const d = await visit(vis, ctxUrl(app, P, '/catalog'), 'e-06-catalog-showseries-noseries');
                out.catalog = brief(d);
            });
            await signOut(page).catch(() => {});
        }

        // ------------------------------------------------ list (td2, A1)
        if (on('list')) {
            const P = `${tag('u68k2')}l`;
            const S = {};
            await step('list-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P, {
                    series: [{path: 'hist', title: 'History'}, {path: 'phil', title: 'Philosophy'}, {path: 'geo', title: 'Geography'}, {path: 'art', title: 'Art'}],
                    categories: [{path: 'sci', title: 'Science'}],
                }));
                S.l1 = await seedBook(app, P, 'b1', 'K2 L1 Published', {published: true, datePublished: '2024-01-10', series: 'hist', categories: ['sci'], newRelease: [{in: 'catalog'}, {in: 'series', path: 'hist'}]});
                S.l2 = await seedBook(app, P, 'b2', 'K2 L2 Scheduled', {published: true, datePublished: '2031-01-10', series: 'geo'});
                S.l3 = await seedBook(app, P, 'b3', 'K2 L3 Unpublished', {published: true, datePublished: '2024-02-10', series: 'art'});
                S.l4 = await seedBook(app, P, 'b4', 'K2 L4 Author Original', {decisions: PROD, series: 'phil'});
                Object.assign(out, {P, S});
                note(`ccK2 [omp] list: press ${P}, books ${JSON.stringify(S)}`);
            });
            await step('list-screen-actions', async (out) => {
                await signIn(page, `${P}mg`, {contextPath: P});
                await openWorkflow(page, app, P, S.l3.id, `publication_${S.l3.pub}_catalogEntry`);
                out.unpublish = await unpublishOnScreen(page);
                await snap(page, 'l-01-l3-unpublished');
                await openWorkflow(page, app, P, S.l4.id, `publication_${S.l4.pub}_catalogEntry`);
                out.publishAO = await publishOnScreen(page, 'AO');
                await snap(page, 'l-02-l4-published-ao');
                out.tick = await tickShowSeries(page, app, P, true);
                out.db = sql(app, `select s.submission_id, s.status, p.status as pub_status, p.version_stage, p.series_id, p.date_published from submissions s join publications p on p.submission_id=s.submission_id where s.context_id=(select press_id from presses where path='${P}') order by s.submission_id`);
                out.manage = await manageCatalogTitles(page, app, P);
                await snap(page, 'l-03-manage-catalog');
                const asMgr = await visit(page, ctxUrl(app, P, '/catalog'), 'l-04-catalog-as-manager');
                out.catalogAsManager = brief(asMgr);
                await signIn(page, `${P}rd`, {contextPath: P});
                const asRd = await visit(page, ctxUrl(app, P, '/catalog'), 'l-05-catalog-as-reader');
                out.catalogAsReader = brief(asRd);
                await signOut(page).catch(() => {});
            });
            await step('list-visitor', async (out) => {
                out.catalog = brief(await visit(vis, ctxUrl(app, P, '/catalog'), 'l-06-catalog-visitor'));
                out.page2 = brief(await visit(vis, ctxUrl(app, P, '/catalog/page/2'), 'l-07-catalog-page2-beyond'));
                out.seriesHist = brief(await visit(vis, ctxUrl(app, P, '/catalog/series/hist'), 'l-08-series-hist-one'));
                out.seriesPhil = brief(await visit(vis, ctxUrl(app, P, '/catalog/series/phil'), 'l-09-series-phil-ao'));
                out.newReleases = brief(await visit(vis, ctxUrl(app, P, '/catalog/newReleases'), 'l-10-newreleases-one'));
                for (const s of [S.l2, S.l3, S.l4]) {
                    const b = await visit(vis, ctxUrl(app, P, `/catalog/book/${s.id}`), `l-11-book-${s.id}`);
                    out[`book${s.id}`] = {status: b.status, url: b.url, docTitle: b.docTitle, main: flat(b.mainText, 200)};
                }
                runJobs(app);
                out.category = brief(await visit(vis, ctxUrl(app, P, '/catalog/category/sci'), 'l-12-category-one'));
            });
        }

        // ------------------------------------------------ ao (td2's fourth book: only an "Author Original" published)
        // The first "Publish" on a press assigns "Version of Record 1.0" with no choice (list phase), so
        // the state is reached as U70 K2 reached it: Create New Version "Author Original (AO)", publish
        // it, unpublish the Version of Record.
        if (on('ao')) {
            const P = `${tag('u68k2')}a`;
            const S = {};
            await step('ao-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P, {series: [{path: 'hist', title: 'History'}, {path: 'mus', title: 'Music'}]}));
                S.h = await seedBook(app, P, 'b1', 'K2 A1 In History', {published: true, datePublished: '2024-01-10', series: 'hist'});
                S.m = await seedBook(app, P, 'b2', 'K2 A2 Only AO', {published: true, datePublished: '2024-02-10', series: 'mus'});
                Object.assign(out, {P, S});
                note(`ccK2 [omp] ao: press ${P}, books ${JSON.stringify(S)}`);
            });
            await step('ao-screen', async (out) => {
                const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
                await signIn(page, `${P}mg`, {contextPath: P});
                out.tick = await tickShowSeries(page, app, P, true);
                out.before = brief(await visit(vis, ctxUrl(app, P, '/catalog'), 'a-01-catalog-before'));
                const wf = new WorkflowPage(page, P);
                await page.goto(ctxUrl(app, P, `/dashboard/editorial?workflowSubmissionId=${S.m.id}`));
                await idle(page);
                const item = await wf.revealPublicationEntry('Create New Version');
                await wf.expectVersionLoaded();
                await item.click();
                const dlg = page.getByRole('dialog', {name: 'Create New Version'});
                await dlg.getByLabel('Publication Stage').waitFor({timeout: T});
                out.stageOptions = await dlg.getByLabel('Publication Stage').locator('option').allInnerTexts();
                await dlg.getByLabel('Publication Stage').selectOption({label: 'Author Original (AO)'});
                const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
                const newId = (await (await created).json()).id;
                out.aoPub = newId;
                await idle(page);
                await openWorkflow(page, app, P, S.m.id, `publication_${newId}_titleAbstract`);
                out.aoPublish = await publishOnScreen(page, 'AO');
                await openWorkflow(page, app, P, S.m.id, `publication_${S.m.pub}_titleAbstract`);
                out.vorUnpublish = await unpublishOnScreen(page);
                await snap(page, 'a-02-workflow-after');
                out.db = sql(app, `select s.submission_id, s.status, p.publication_id, p.status, p.version_stage, p.series_id from submissions s join publications p on p.submission_id=s.submission_id where s.submission_id=${S.m.id} order by p.publication_id`);
                out.manage = await manageCatalogTitles(page, app, P);
                await signOut(page).catch(() => {});
                const d = await visit(vis, ctxUrl(app, P, '/catalog'), 'a-03-catalog-after');
                out.after = brief(d);
                out.musPage = brief(await visit(vis, ctxUrl(app, P, '/catalog/series/mus'), 'a-04-series-mus'));
                const b = await visit(vis, ctxUrl(app, P, `/catalog/book/${S.m.id}`), 'a-05-book-ao');
                out.book = {status: b.status, docTitle: b.docTitle, main: flat(b.mainText, 300)};
            });
        }

        // ------------------------------------------------ order (td3, Rule 4, Rule 11)
        if (on('order')) {
            const P = `${tag('u68k2')}o`;
            const S = {};
            await step('order-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P, {series: [{path: 'hist', title: 'History'}], displayFeaturedBooks: true, displayNewReleases: true}));
                S.oak = await seedBook(app, P, 'b1', 'K2 Oak', {published: true, datePublished: '2024-01-10', featured: [{in: 'catalog', position: 1}]});
                S.pine = await seedBook(app, P, 'b2', 'K2 Pine', {published: true, datePublished: '2024-02-10', featured: [{in: 'catalog', position: 1}]});
                S.spruce = await seedBook(app, P, 'b3', 'K2 Spruce', {published: true, datePublished: '2024-03-10', urlPath: 'spruce-book', newRelease: [{in: 'catalog'}]});
                S.willow = await seedBook(app, P, 'b4', 'K2 Willow', {published: true, datePublished: '2024-04-10', series: 'hist', featured: [{in: 'series', path: 'hist'}], newRelease: [{in: 'catalog'}]});
                Object.assign(out, {P, S});
                out.features = sql(app, `select submission_id, assoc_type, seq from features where submission_id in (${Object.values(S).map((s) => s.id).join(',')}) order by assoc_type, seq`);
                note(`ccK2 [omp] order: press ${P}, books ${JSON.stringify(S)}`);
            });
            await step('order-wide', async (out) => {
                const d = await visit(vis, ctxUrl(app, P, '/catalog'), 'o-01-catalog-1280');
                out.catalog = brief(d);
                out.items = d.lists && d.lists[0] && d.lists[0].items.map((i) => ({t: i.title, featured: i.featured, x: i.x, y: i.y, w: i.w, cover: i.coverHref, title: i.titleHref}));
                out.listWidth = d.lists && d.lists[0] && d.lists[0].width;
                await loc(vis, 'catalog: a featured book summary', vis.locator('.obj_monograph_summary.is_featured'));
                await loc(vis, 'catalog: book summaries', vis.locator('.obj_monograph_summary'));
                const h = await visit(vis, ctxUrl(app, P), 'o-02-home-1280');
                out.home = (h.lists || []).map((l) => ({heading: l.heading, width: l.width, rows: l.rows, items: l.items.map((i) => ({t: i.title, featured: i.featured, w: i.w}))}));
            });
            await step('order-narrow', async (out) => {
                await vis.setViewportSize({width: 800, height: 900});
                const d = await visit(vis, ctxUrl(app, P, '/catalog'), 'o-03-catalog-800');
                out.catalog = {listWidth: d.lists && d.lists[0] && d.lists[0].width, rows: d.lists && d.lists[0] && d.lists[0].rows, items: d.lists && d.lists[0] && d.lists[0].items.map((i) => ({t: i.title, featured: i.featured, w: i.w}))};
                const h = await visit(vis, ctxUrl(app, P), 'o-04-home-800');
                out.home = (h.lists || []).map((l) => ({heading: l.heading, width: l.width, rows: l.rows, items: l.items.map((i) => ({t: i.title, w: i.w}))}));
                await vis.setViewportSize({width: 1200, height: 900});
                const d2 = await visit(vis, ctxUrl(app, P, '/catalog'), 'o-05-catalog-1200');
                out.at1200 = {listWidth: d2.lists && d2.lists[0] && d2.lists[0].width, rows: d2.lists && d2.lists[0] && d2.lists[0].rows};
                await vis.setViewportSize({width: 1280, height: 900});
            });
            await step('order-links', async (out) => {
                await vis.goto(ctxUrl(app, P, '/catalog'));
                await idle(vis);
                const spruce = vis.locator('.obj_monograph_summary').filter({hasText: 'K2 Spruce'});
                await spruce.locator('a.cover').click();
                await idle(vis);
                out.spruceCover = {url: vis.url().replace(app.baseURL, ''), title: await vis.title()};
                await snap(vis, 'o-06-spruce-cover-landed');
                await vis.goBack(); await idle(vis);
                await vis.locator('.obj_monograph_summary').filter({hasText: 'K2 Oak'}).locator('.title a').click();
                await idle(vis);
                out.oakTitle = {url: vis.url().replace(app.baseURL, ''), title: await vis.title()};
                await snap(vis, 'o-07-oak-title-landed');
                const byId = await visit(vis, ctxUrl(app, P, `/catalog/book/${S.spruce.id}`), 'o-08-spruce-by-number');
                out.spruceById = {status: byId.status, url: byId.url, docTitle: byId.docTitle};
            });
        }

        // ------------------------------------------------ sort (td10, Settings 1, A6)
        if (on('sort')) {
            const P = `${tag('u68k2')}q`;
            await step('sort-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P, {series: [{path: 'hist', title: 'History'}]}));
                const S = {};
                S.alder = await seedBook(app, P, 'b1', 'K2 Alder', {published: true, datePublished: '2024-01-10', series: 'hist', seriesPosition: 'Book 2'});
                S.birch = await seedBook(app, P, 'b2', 'K2 Birch', {published: true, datePublished: '2024-04-10', series: 'hist', seriesPosition: 'Book 10'});
                S.cedar = await seedBook(app, P, 'b3', 'K2 Cedar', {published: true, datePublished: '2024-02-10', series: 'hist', seriesPosition: 'Book 1'});
                S.dogwood = await seedBook(app, P, 'b4', 'K2 Dogwood', {published: true, datePublished: '2024-03-10', series: 'hist', seriesPosition: 'Book 3'});
                S.elm = await seedBook(app, P, 'b5', 'K2 Elm', {published: true, datePublished: '2023-12-01', featured: [{in: 'catalog'}]});
                S.fir = await seedBook(app, P, 'b6', 'K2 Fir', {published: true, datePublished: '2023-11-01'});
                Object.assign(out, {P, S});
                note(`ccK2 [omp] sort: press ${P}, books ${JSON.stringify(S)}`);
            });
            await step('sort-default', async (out) => {
                const d = await visit(vis, ctxUrl(app, P, '/catalog'), 's-01-catalog-default');
                out.titles = d.titles;
                out.positions = (d.lists[0] || {items: []}).items.map((i) => `${i.title}|${i.seriesPosition || ''}`);
            });
            await step('sort-choices', async (out) => {
                await signIn(page, `${P}mg`, {contextPath: P});
                const pn = await openSide(page, app, P, 'Setup');
                out.radios = (await formDump(pn)).fields.filter((f) => /Order of monographs/.test(f.label || ''));
                let first = true;
                for (const v of ['seriesPosition-ASC', 'seriesPosition-DESC', 'title-ASC', 'title-DESC', 'datePublished-ASC', 'datePublished-DESC']) {
                    const save = await pickSort(page, app, P, v);
                    let reread;
                    if (first) {
                        const pn2 = await openSide(page, app, P, 'Setup');
                        reread = await pn2.locator('input[type=radio][name="catalogSortOption"]:checked').evaluate((e) => e.value).catch(() => 'none');
                        await snap(page, 's-02-setup-reloaded');
                        first = false;
                    }
                    const d = await visit(vis, ctxUrl(app, P, '/catalog'), `s-03-catalog-${v}`);
                    out[v] = {save, reread, titles: d.titles, featured: (d.lists[0] || {items: []}).items.filter((i) => i.featured).map((i) => i.title)};
                }
                out.db = sql(app, `select setting_value from press_settings where press_id=(select press_id from presses where path='${P}') and setting_name='catalogSortOption'`);
                await signOut(page).catch(() => {});
            });
        }

        // ------------------------------------------------ paging (Rule 5, Settings 4)
        if (on('paging')) {
            const P = `${tag('u68k2')}p`;
            await step('paging-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P, {series: [{path: 'hist', title: 'History'}], itemsPerPage: 2}));
                const S = {};
                S.p1 = await seedBook(app, P, 'b1', 'K2 P1', {published: true, datePublished: '2024-01-10', series: 'hist', featured: [{in: 'catalog', position: 1}], newRelease: [{in: 'catalog'}]});
                S.p2 = await seedBook(app, P, 'b2', 'K2 P2', {published: true, datePublished: '2024-02-10', series: 'hist', featured: [{in: 'catalog', position: 2}], newRelease: [{in: 'catalog'}]});
                S.p3 = await seedBook(app, P, 'b3', 'K2 P3', {published: true, datePublished: '2024-03-10', series: 'hist', featured: [{in: 'catalog', position: 3}], newRelease: [{in: 'catalog'}]});
                S.p4 = await seedBook(app, P, 'b4', 'K2 P4', {published: true, datePublished: '2024-04-10', series: 'hist'});
                S.p5 = await seedBook(app, P, 'b5', 'K2 P5', {published: true, datePublished: '2024-05-10', series: 'hist'});
                Object.assign(out, {P, S});
                note(`ccK2 [omp] paging: press ${P} (itemsPerPage 2), books ${JSON.stringify(S)}`);
            });
            await step('paging-walk', async (out) => {
                out.p1 = brief(await visit(vis, ctxUrl(app, P, '/catalog'), 'p-01-catalog-p1'));
                await loc(vis, 'catalog: page links', vis.locator('.cmp_pagination'));
                await loc(vis, 'catalog: "Next"', vis.locator('.cmp_pagination a.next'));
                await vis.locator('.cmp_pagination a.next').click();
                await idle(vis);
                out.nextLands = vis.url().replace(app.baseURL, '');
                out.p2 = brief(await visit(vis, vis.url(), 'p-02-catalog-p2'));
                out.p2featured = await vis.locator('.obj_monograph_summary.is_featured .title').allInnerTexts();
                await vis.locator('.cmp_pagination a.prev').click();
                await idle(vis);
                out.prevLands = vis.url().replace(app.baseURL, '');
                out.p3 = brief(await visit(vis, ctxUrl(app, P, '/catalog/page/3'), 'p-03-catalog-p3'));
                await vis.locator('.cmp_pagination a.prev').click();
                await idle(vis);
                out.prevFrom3 = vis.url().replace(app.baseURL, '');
                out.p4 = brief(await visit(vis, ctxUrl(app, P, '/catalog/page/4'), 'p-04-catalog-p4-beyond'));
                const p1 = await visit(vis, ctxUrl(app, P, '/catalog/page/1'), 'p-05-catalog-page1');
                out.page1 = {status: p1.status, docTitle: p1.docTitle, h1: p1.h1};
                out.newReleases = brief(await visit(vis, ctxUrl(app, P, '/catalog/newReleases'), 'p-06-newreleases-ipp2'));
                out.series1 = brief(await visit(vis, ctxUrl(app, P, '/catalog/series/hist'), 'p-07-series-p1'));
                out.series2 = brief(await visit(vis, ctxUrl(app, P, '/catalog/series/hist/2'), 'p-08-series-p2'));
            });
            await step('paging-setting', async (out) => {
                await signIn(page, `${P}mg`, {contextPath: P});
                const pn = await openSide(page, app, P, 'Lists');
                await snap(page, 'p-09-settings-lists');
                out.lists = (await formDump(pn)).fields;
                await loc(page, 'Setup › Lists: "Items per page"', pn.locator('input[name="itemsPerPage"]'));
                // the other end of the axis: 3 on screen, then back to 25
                await pn.locator('input[name="itemsPerPage"]').fill('3');
                out.save3 = await saveForm(page, pn);
                out.at3 = brief(await visit(vis, ctxUrl(app, P, '/catalog'), 'p-10-catalog-ipp3'));
                const pn2 = await openSide(page, app, P, 'Lists');
                await pn2.locator('input[name="itemsPerPage"]').fill('25');
                out.save25 = await saveForm(page, pn2);
                out.at25 = brief(await visit(vis, ctxUrl(app, P, '/catalog'), 'p-11-catalog-ipp25'));
                await signOut(page).catch(() => {});
            });
        }

        // ------------------------------------------------ seriesnav (td4, Rule 6, Settings 3)
        if (on('seriesnav')) {
            const P = `${tag('u68k2')}s`;
            const P1 = `${tag('u68k2')}t`;
            await step('seriesnav-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P, {series: [{path: 'alpha', title: 'Alpha'}, {path: 'beta', title: 'Beta'}, {path: 'gamma', title: 'Gamma'}]}));
                const S = {};
                S.a = await seedBook(app, P, 'b1', 'K2 In Alpha', {published: true, datePublished: '2024-01-10', series: 'alpha'});
                S.b = await seedBook(app, P, 'b2', 'K2 In Beta', {published: true, datePublished: '2024-02-10', series: 'beta'});
                await must(app, 'scenarios/context', pressSpec(P1, {series: [{path: 'alpha', title: 'Alpha'}, {path: 'gamma', title: 'Gamma'}]}));
                S.t = await seedBook(app, P1, 'b1', 'K2 T In Alpha', {published: true, datePublished: '2024-01-10', series: 'alpha'});
                Object.assign(out, {P, P1, S});
                note(`ccK2 [omp] seriesnav: presses ${P} (Alpha, Beta with a book, Gamma none) and ${P1} (Alpha with a book, Gamma none), books ${JSON.stringify(S)}`);
            });
            await step('seriesnav-unticked', async (out) => {
                out.catalog = brief(await visit(vis, ctxUrl(app, P, '/catalog'), 'n-01-catalog-unticked'));
            });
            await step('seriesnav-ticked', async (out) => {
                const {SectionsTab} = require(path.join(REPO, 'shared/playwright/pages/SectionsPages.js'));
                await signIn(page, `${P}mg`, {contextPath: P});
                const tab = new SectionsTab(page, P, {tab: 'Series', addLabel: 'Add Series'});
                await tab.goto();
                const win = await tab.openEdit('Alpha');
                await win.type('prefix[en]', 'The');
                out.prefixSave = (await win.saveAndClose()).status();
                await tab.goto();
                out.rowsAfterPrefix = (await tab.titleCells().allInnerTexts()).map((t) => flat(t, 60));
                await snap(page, 'n-02-series-tab');
                out.tick = await tickShowSeries(page, app, P, true);
                await snap(page, 'n-03-theme-ticked');
                const d = await visit(vis, ctxUrl(app, P, '/catalog'), 'n-04-catalog-ticked');
                out.catalog = brief(d);
                await loc(vis, 'catalog: "Series:" line', vis.locator('.pkp_series_nav_menu'));
                // order: Beta above Alpha, then Alpha above Beta (both ends)
                await tab.goto();
                await tab.startOrdering();
                await tab.drag('Beta', 'The Alpha');
                out.order1 = (await tab.done()).status();
                await tab.goto();
                out.rowsOrder1 = (await tab.titleCells().allInnerTexts()).map((t) => flat(t, 60));
                out.catalogOrder1 = brief(await visit(vis, ctxUrl(app, P, '/catalog'), 'n-05-catalog-beta-first')).seriesNav;
                await tab.goto();
                await tab.startOrdering();
                await tab.drag('The Alpha', 'Beta');
                out.order2 = (await tab.done()).status();
                await tab.goto();
                out.rowsOrder2 = (await tab.titleCells().allInnerTexts()).map((t) => flat(t, 60));
                out.catalogOrder2 = brief(await visit(vis, ctxUrl(app, P, '/catalog'), 'n-06-catalog-alpha-first')).seriesNav;
                // Beta inactive (the row's box)
                await tab.goto();
                const cw = await tab.pressInactive('Beta');
                out.inactive = (await tab.confirm(cw)).status();
                out.rowsInactive = (await tab.grid().locator('tr.gridRow').allInnerTexts()).map((t) => flat(t, 80));
                await snap(page, 'n-07-beta-inactive');
                out.catalogInactive = brief(await visit(vis, ctxUrl(app, P, '/catalog'), 'n-08-catalog-beta-inactive')).seriesNav;
                const bp = await visit(vis, ctxUrl(app, P, '/catalog/series/beta'), 'n-09-series-beta-inactive');
                out.betaPage = {status: bp.status, url: bp.url, count: bp.count, titles: bp.titles, docTitle: bp.docTitle};
                // a link pressed
                await vis.goto(ctxUrl(app, P, '/catalog')); await idle(vis);
                await vis.locator('.pkp_series_nav_menu a').first().click(); await idle(vis);
                out.firstLinkLands = {url: vis.url().replace(app.baseURL, ''), count: flat(await vis.locator('.monograph_count').innerText().catch(() => null), 40)};
                // unticked again
                out.untick = await tickShowSeries(page, app, P, false);
                out.catalogUntickedAgain = brief(await visit(vis, ctxUrl(app, P, '/catalog'), 'n-10-catalog-unticked-again')).seriesNav;
                await signOut(page).catch(() => {});
            });
            await step('seriesnav-one', async (out) => {
                await signIn(page, `${P1}mg`, {contextPath: P1});
                out.tick = await tickShowSeries(page, app, P1, true);
                out.catalog = brief(await visit(vis, ctxUrl(app, P1, '/catalog'), 'n-11-catalog-one-series'));
                await signOut(page).catch(() => {});
            });
        }

        // ------------------------------------------------ summary (fields 102–106, Rule 11, Settings 10, 11, 13, A2)
        if (on('summary')) {
            const P = `${tag('u68k2')}c`;
            const S = {};
            await step('summary-seed', async (out) => {
                await must(app, 'scenarios/context', pressSpec(P, {
                    series: [{path: 'hist', title: 'History'}], categories: [{path: 'sci', title: 'Science'}],
                    displayFeaturedBooks: true, displayNewReleases: true,
                }));
                S.c1 = await seedBook(app, P, 'b1', 'K2 C1 Cover', {decisions: PROD, series: 'hist', seriesPosition: 'Vol. 3', categories: ['sci']});
                S.c2 = await seedBook(app, P, 'b2', 'K2 C2 Alt', {decisions: PROD});
                S.c3 = await seedBook(app, P, 'b3', 'K2 C3 Plain', {published: true, datePublished: '2024-01-10'});
                Object.assign(out, {P, S});
                note(`ccK2 [omp] summary: press ${P}, books ${JSON.stringify(S)}`);
            });
            await step('summary-screen-c1', async (out) => {
                await signIn(page, `${P}mg`, {contextPath: P});
                // subtitle (Title & Abstract)
                await openWorkflow(page, app, P, S.c1.id, `publication_${S.c1.pub}_titleAbstract`);
                const subField = page.locator('.pkpFormField').filter({has: page.locator('label', {hasText: /^\s*Subtitle/})}).first();
                await subField.waitFor({timeout: T});
                await page.waitForFunction(() => window.tinymce && window.tinymce.get().some((e) => /subtitle/.test(e.id) && e.initialized), null, {timeout: T}).catch(() => {});
                await subField.frameLocator('iframe').locator('body').click();
                await page.keyboard.type('A Subtitle');
                const tForm = page.locator('form').filter({has: subField}).first();
                const tr = page.waitForResponse((r) => /\/publications\/\d+(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await tForm.getByRole('button', {name: 'Save', exact: true}).click();
                out.subtitleSave = (await tr) ? 'sent' : 'none';
                await idle(page); await sleep(600);
                // contributors: one more ticked, one unticked for lists
                const {ContributorsScreen} = require(path.join(app.suiteDir, 'pages', 'ContributorPages.js'));
                await openWorkflow(page, app, P, S.c1.id, `publication_${S.c1.pub}_contributors`);
                const cs = new ContributorsScreen(page);
                await cs.addContributor({given: 'Zed', family: 'Second', email: `${P}zed@mail.test`, roles: ['Author', 'Translator']}).catch((e) => { out.zedErr = flat(e.message, 200); });
                const dlg = await cs.openAdd();
                await cs.fillPersonFields(dlg, {given: 'Una', family: 'Hidden', email: `${P}una@mail.test`, country: 'Canada'});
                await cs.setRole(dlg, 'Author', true);
                const box = cs.publicationListsBox(dlg);
                out.unaBoxDefault = await box.isChecked().catch(() => null);
                await box.uncheck();
                await cs.savePanel(dlg);
                await snap(page, 'c-01-contributors');
                out.contributors = sql(app, `select a.author_id, a.include_in_browse, a.seq from authors a where a.publication_id=${S.c1.pub} order by a.seq`);
                // cover, no alt text (Catalog Entry)
                await openWorkflow(page, app, P, S.c1.id, `publication_${S.c1.pub}_catalogEntry`);
                await page.locator('input[name="urlPath"]').waitFor({timeout: T});
                const up = page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: 20_000}).catch(() => null);
                await entryForm(page).locator('input[type="file"]').first().setInputFiles(path.join(FILES, 'figure.png'));
                await up; await sleep(1200);
                out.coverSave = await saveEntry(page);
                await snap(page, 'c-02-c1-entry-cover');
                out.publish = await publishOnScreen(page, 'VoR');
            });
            await step('summary-screen-c2', async (out) => {
                await openWorkflow(page, app, P, S.c2.id, `publication_${S.c2.pub}_catalogEntry`);
                await page.locator('input[name="urlPath"]').waitFor({timeout: T});
                const up = page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: 20_000}).catch(() => null);
                await entryForm(page).locator('input[type="file"]').first().setInputFiles(path.join(FILES, 'figure.png'));
                await up; await sleep(1200);
                const alt = entryForm(page).getByRole('textbox', {name: /Alternate text/}).first();
                await alt.fill('Cover of C2');
                out.coverSave = await saveEntry(page);
                out.publish = await publishOnScreen(page, 'VoR');
                // featured and new release on the Catalog page, by hand
                out.featC1 = await pressBox(page, app, P, 'K2 C1 Cover', FEAT_OFF);
                out.newC1 = await pressBox(page, app, P, 'K2 C1 Cover', NEW_OFF);
                out.newC3 = await pressBox(page, app, P, 'K2 C3 Plain', NEW_OFF);
                await snap(page, 'c-03-manage-catalog');
            });
            await step('summary-visitor', async (out) => {
                runJobs(app);
                for (const [k, p] of [['catalog', '/catalog'], ['series', '/catalog/series/hist'], ['newReleases', '/catalog/newReleases'], ['category', '/catalog/category/sci'], ['home', '']]) {
                    const d = await visit(vis, ctxUrl(app, P, p), `c-04-${k}`);
                    out[k] = {status: d.status, count: d.count, lists: (d.lists || []).map((l) => ({heading: l.heading, items: l.items.map((i) => ({title: i.title, parts: i.parts, sp: i.seriesPosition, author: i.author, date: i.date, img: i.img, cover: i.coverHref, titleHref: i.titleHref, featured: i.featured}))}))};
                    out[`${k}Aria`] = await summaryAria(vis);
                }
                await loc(vis, 'book summary: cover link', vis.locator('.obj_monograph_summary a.cover'));
                await loc(vis, 'book summary: author line', vis.locator('.obj_monograph_summary .author'));
                await loc(vis, 'book summary: date', vis.locator('.obj_monograph_summary .date'));
                await loc(vis, 'book summary: series position', vis.locator('.obj_monograph_summary .seriesPosition'));
                const c = await visit(vis, ctxUrl(app, P, '/catalog'), 'c-05-catalog-covers');
                out.thumbs = {};
                for (const i of (c.lists[0] || {items: []}).items) if (i.img) out.thumbs[i.title] = {src: i.img.src.replace(/^https?:\/\/[^/]+/, ''), file: await pngSize(i.img.src.startsWith('http') ? i.img.src : app.url(i.img.src))};
            });
            await step('summary-settings', async (out) => {
                // "Date" (Settings 11)
                let pn = await openSide(page, app, P, 'Date & Time');
                out.dateRadios = (await formDump(pn)).fields.filter((f) => /^Date$/.test(f.label || ''));
                await pn.locator('input[type=radio][name="dateFormatLong-en"][value="j F Y"]').first().check();
                out.dateSave = await saveForm(page, pn);
                pn = await openSide(page, app, P, 'Date & Time');
                out.dateReread = await pn.locator('input[type=radio][name="dateFormatLong-en"]:checked').evaluate((e) => e.value).catch(() => 'none');
                const d1 = await visit(vis, ctxUrl(app, P, '/catalog'), 'c-06-catalog-date-jFY');
                out.datesAfter = (d1.lists[0] || {items: []}).items.map((i) => `${i.title}|${i.date}`);
                const h1 = await visit(vis, ctxUrl(app, P), 'c-07-home-date-jFY');
                out.homeDatesAfter = (h1.lists || []).map((l) => l.items.map((i) => `${i.title}|${i.date}`));
                // cover size (Settings 10)
                pn = await openSide(page, app, P, 'Advanced');
                out.coverFields = (await formDump(pn)).fields.filter((f) => /Cover Image/.test(f.label || ''));
                await pn.locator('input[name="coverThumbnailsMaxWidth"]').fill('50');
                await pn.locator('input[name="coverThumbnailsMaxHeight"]').fill('300');
                out.sizeSave = await saveForm(page, pn);
                const ctx = await launch(app);
                try {
                    const c = await visit(ctx.page, ctxUrl(app, P, '/catalog'), 'c-08-catalog-covers-50');
                    out.thumbsAfter = {};
                    for (const i of (c.lists[0] || {items: []}).items) if (i.img) out.thumbsAfter[i.title] = {src: i.img.src.replace(/^https?:\/\/[^/]+/, ''), nw: i.img.nw, nh: i.img.nh, file: await pngSize(i.img.src.startsWith('http') ? i.img.src : app.url(i.img.src))};
                } finally {
                    await ctx.close();
                }
                await signOut(page).catch(() => {});
            });
        }
    } finally {
        if (dialogs.length) fact(`dialogs-${app.name}`, dialogs);
        await mg.close();
        await vs.close();
    }
});
