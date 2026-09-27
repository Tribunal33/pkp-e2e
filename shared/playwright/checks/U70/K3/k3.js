// U70 claim check K3: the Catalog page's "Featured" / "New release" boxes
// and "Order Features" (spec Rules 6–11, the side effect of ticking a box
// and "Save Order", register A4; footnotes j, k, td8–td12, f-a4).
//
// OMP: every phase seeds its own scratch press (series[], categories[],
// published books with featured[] / newRelease[] + position, scenarios.md),
// signs in as that press's manager (one phase also as its Press editor),
// and a signed-out visitor reads the public pages. OJS and OPS: the
// read-only control, manager.maya typing the Catalog page's address on
// publicknowledge (multi-app rule 4).
//
// Phases (PHASES=a,b,… picks; default all):
//   controls  OJS/OPS (and OMP publicknowledge) Catalog page address as manager.maya
//   flags     td8: Rules 6–7 and the side effect (press A)
//   catpub    Rules 6–7: a category's and a series' public page (press F)
//   lists     td9: Rule 8 / A4 (press B)
//   unpub     td10: Rule 9 (press C)
//   order     td11: Rule 10 (press D)
//   order2    td11/td12 second runs: arrows, a row drag, a filter while ordering (press G)
//   place     td12: Rule 11 (press E)
//
// Run: PROBE_FEATURE=U70 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U70/K3/k3.js
// (ONLY=omp narrows; PHASES=flags,order picks). OMP outlasts 600 s: run detached (patterns.md "Probe kit").
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const PHASES = (process.env.PHASES || 'controls,flags,catpub,lists,unpub,order,order2,place').split(',');
const on = (p) => PHASES.includes(p);
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

const FEAT_OFF = 'This monograph is not featured. Make this monograph featured.';
const FEAT_ON = 'This monograph is featured. Make this monograph not featured.';
const NEW_OFF = 'This monograph is not a new release. Make this monograph a new release.';
const NEW_ON = 'This monograph is a new release. Make this monograph not a new release.';

const facts = {};
function fact(key, value) {
    facts[key] = value;
    record('facts', {[key]: value}, {merge: true});
    console.log(`[fact] ${key}: ${JSON.stringify(value).slice(0, 700)}`);
}
/** Run a phase with its fact object; the object is recorded even when the phase throws. */
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
        return execFileSync('psql', ['-d', app.db || `${app.name}_test`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
    } catch (e) {
        return `SQL ERROR ${String(e.stderr).trim()}`;
    }
};
/** Drain the queue (category pages list a book only after the jobs ran, U16 Rule 8a). */
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
async function mailCount(app, email) {
    const r = await fetch(`${app.mailpitUrl.replace(/\/$/, '')}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const j = await r.json().catch(() => null);
    return j ? {total: j.messages_count ?? j.total, subjects: (j.messages || []).map((m) => m.Subject)} : null;
}

const ctxUrl = (app, P, p = '') => app.url(`/index.php/${P}${p}`);

// ---------------------------------------------------------------- the Catalog page
async function openCatalog(page, app, P) {
    await page.goto(ctxUrl(app, P, '/manageCatalog'));
    await idle(page);
    await page.locator('.listPanel__item--catalog, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
}
const item = (page, title) => page.locator('.listPanel__item--catalog').filter({has: page.locator('.listPanel__itemSubtitle', {hasText: title})});

/** Every row as data: title, visible, the two boxes' names, visible buttons and links. */
async function rows(page) {
    return page.locator('.listPanel__item--catalog').evaluateAll((els) => els.map((e) => {
        const vis = (n) => !!(n && n.offsetParent !== null);
        const sub = e.querySelector('.listPanel__itemSubtitle');
        return {
            title: sub ? sub.innerText.trim() : null,
            shown: vis(e),
            cls: e.className,
            boxes: [...e.querySelectorAll('button')].filter((b) => /monograph/.test(b.innerText + (b.getAttribute('aria-label') || ''))).map((b) => ({name: (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim(), shown: vis(b)})),
            controls: [...e.querySelectorAll('button, a')].filter(vis).map((b) => (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
        };
    }));
}
const order = async (page) => (await rows(page)).filter((r) => r.shown).map((r) => r.title);
/** The box states in one line: title F/N (+/-). */
async function boxes(page) {
    return (await rows(page)).filter((r) => r.shown).map((r) => {
        const names = r.boxes.map((b) => b.name).join(' | ');
        const f = names.includes(FEAT_ON) ? 'F+' : names.includes(FEAT_OFF) ? 'F-' : 'F?';
        const n = names.includes(NEW_ON) ? 'N+' : names.includes(NEW_OFF) ? 'N-' : 'N?';
        return `${r.title} ${f} ${n}`;
    });
}
/** The page's header controls and the notice line, as shown. */
async function header(page) {
    return page.evaluate(() => {
        const vis = (n) => !!(n && n.offsetParent !== null);
        const panel = document.querySelector('.listPanel--catalog') || document.querySelector('.listPanel');
        const scope = panel || document;
        return {
            buttons: [...scope.querySelectorAll('.listPanel__header button, .pkpHeader button, .listPanel__header input')].filter(vis).map((b) => (b.getAttribute('aria-label') || b.innerText || b.placeholder || '').replace(/\s+/g, ' ').trim()),
            search: vis(scope.querySelector('input[type="search"], .pkpSearch input')),
            headings: [...scope.querySelectorAll('.listPanel__itemsHeader, .listPanel__header, [class*="catalogListPanel__"]')].filter(vis).map((h) => h.innerText.replace(/\s+/g, ' ').trim()).slice(0, 6),
            notices: [...document.querySelectorAll('.pkpNotification, [role="alert"], .pkp_notification, [class*="toast"], [class*="Toast"], .listPanel__notice, .pkpNotice, [class*="orderingNotice"], [class*="Notice"]')].filter(vis).map((n) => n.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
            filtersColumn: vis(document.querySelector('.listPanel__filter, .pkpFilter')),
        };
    });
}
/** Press a row's box; returns the response status and what shows at once (no reload). */
async function press(page, title, name) {
    const done = page.waitForResponse((r) => /saveDisplayFlags/.test(r.url()), {timeout: T}).catch(() => null);
    await item(page, title).getByRole('button', {name, exact: true}).click();
    const r = await done;
    await idle(page);
    const dialogs = await page.locator('[role="dialog"]:visible').allInnerTexts().catch(() => []);
    return {status: r ? r.status() : null, orderNow: await order(page), boxesNow: await boxes(page), notices: (await header(page)).notices, dialogs: dialogs.map((d) => flat(d, 200))};
}
async function filter(page, label) {
    const col = page.locator('button.pkpFilter__label', {hasText: label});
    if (!(await col.first().isVisible().catch(() => false))) {
        await page.getByRole('button', {name: 'Filters', exact: true}).click();
        await col.first().waitFor({timeout: T});
    }
    const got = page.waitForResponse((r) => /_submissions\?/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
    await col.first().click();
    await got;
    await idle(page);
}
async function catalogWith(page, app, P, label) {
    await openCatalog(page, app, P);
    if (label) await filter(page, label);
    return {order: await order(page), boxes: await boxes(page)};
}

// ---------------------------------------------------------------- public pages
async function visit(vis, url, name) {
    await vis.goto(url);
    await idle(vis);
    const s = await snap(vis, name);
    const data = await vis.evaluate(() => {
        const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        return {
            h1: txt(document.querySelector('h1')),
            lists: [...document.querySelectorAll('.cmp_monographs_list')].map((m) => ({heading: txt(m.querySelector('h2, h3, .title')), items: [...m.querySelectorAll('.obj_monograph_summary .title')].map(txt)})),
            featured: [...document.querySelectorAll('.featured .obj_monograph_summary .title, .cmp_monographs_list.featured .title')].map(txt),
            all: [...document.querySelectorAll('.obj_monograph_summary .title')].map(txt),
            headings: [...document.querySelectorAll('.pkp_structure_main h2, .pkp_structure_main h3')].map(txt),
        };
    });
    return {url: s.url, ...data};
}
const pub = {
    catalog: (vis, app, P, n) => visit(vis, ctxUrl(app, P, '/catalog'), n),
    newReleases: (vis, app, P, n) => visit(vis, ctxUrl(app, P, '/catalog/newReleases'), n),
    home: (vis, app, P, n) => visit(vis, ctxUrl(app, P, '/index'), n),
    category: (vis, app, P, path, n) => visit(vis, ctxUrl(app, P, `/catalog/category/${path}`), n),
    series: (vis, app, P, path, n) => visit(vis, ctxUrl(app, P, `/catalog/series/${path}`), n),
};

// ---------------------------------------------------------------- settings and workflow
async function setHomeLists(page, app, P, want) {
    await page.goto('about:blank');
    await page.goto(ctxUrl(app, P, '/management/settings/website'));
    await idle(page);
    const top = page.locator('#appearance-button').first();
    await top.waitFor({timeout: T});
    if ((await top.getAttribute('aria-selected')) !== 'true') { await top.click(); await idle(page); }
    const side = page.locator('#appearance-setup-button').first();
    await side.waitFor({timeout: T});
    if ((await side.getAttribute('aria-selected')) !== 'true') { await side.click(); await idle(page); }
    const panel = page.locator('[role="tabpanel"]#appearance-setup').first();
    const f = panel.getByRole('checkbox', {name: 'Display featured books on the home page'});
    const n = panel.getByRole('checkbox', {name: 'Display new releases on the home page'});
    await f.waitFor({timeout: T});
    if (want.featured !== undefined) await (want.featured ? f.check() : f.uncheck());
    if (want.newReleases !== undefined) await (want.newReleases ? n.check() : n.uncheck());
    const resp = page.waitForResponse((r) => /^(PUT|POST)$/.test(r.request().method()) && /\/contexts\/\d+/.test(r.url()), {timeout: T}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).last().click();
    const r = await resp;
    await idle(page);
    return r ? r.status() : null;
}
async function openWorkflow(page, app, P, sid) {
    await page.goto(ctxUrl(app, P, `/dashboard/editorial?workflowSubmissionId=${sid}`));
    await idle(page);
    await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
}
async function openPubPage(page, label) {
    await page.getByRole('link', {name: label, exact: true}).last().click();
    await idle(page);
    await sleep(500);
}
async function activityLog(page) {
    await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
    const dlg = page.getByRole('dialog').filter({hasText: 'Activity Log & Notes'});
    await dlg.getByText('Event', {exact: true}).waitFor({timeout: T});
    await idle(page);
    const lines = (await dlg.getByRole('row').allInnerTexts()).map((s) => flat(s, 200));
    await dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
    await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await sleep(600);
    return lines;
}
async function unpublish(page) {
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Unpublish', exact: true}).click();
    const dlg = page.getByRole('dialog', {name: 'Unpublish', exact: true});
    await dlg.waitFor({timeout: T});
    const done = page.waitForResponse((r) => /\/unpublish/.test(r.url()), {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Unpublish', exact: true}).click();
    const r = await done;
    await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    return r ? r.status() : null;
}
async function publish(page) {
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Publish', exact: true}).click();
    const dlg = page.getByRole('dialog', {name: /Schedule For Publication/}).last();
    await dlg.waitFor({timeout: T});
    await idle(page);
    const text = flat(await dlg.innerText(), 500);
    const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Publish', exact: true}).click();
    const r = await done;
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Unpublish', exact: true}).waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return {status: r ? r.status() : null, text};
}
async function authorTasks(page, app, P) {
    await page.goto(ctxUrl(app, P, '/dashboard/mySubmissions'));
    await idle(page);
    const btn = page.getByRole('button', {name: /Tasks/});
    const label = flat(await btn.first().innerText().catch(() => ''), 60);
    await btn.first().click().catch(() => {});
    const dlg = page.getByRole('dialog').filter({hasText: 'Tasks'});
    await dlg.first().waitFor({timeout: 10_000}).catch(() => {});
    await idle(page);
    const text = flat(await dlg.first().innerText().catch(() => ''), 800);
    return {label, text};
}

// ---------------------------------------------------------------- seeding
function pressSpec(P, extra = {}) {
    return {
        tag: P,
        context: {name: {en: `K3 Press ${P}`}},
        categories: [{path: 'sci', title: 'Science'}, {path: 'arts', title: 'Arts'}],
        series: [{path: 'hist', title: 'History'}, {path: 'phil', title: 'Philosophy'}],
        users: [{username: `${P}mg`, roles: ['manager']}, {username: `${P}ed`, roles: ['editor']}, {username: `${P}au`, roles: ['author']}],
        ...extra,
    };
}
async function seedBook(app, P, i, title, date, extra = {}) {
    const r = await must(app, 'scenarios/submission', {tag: `${P}b${i}`, context: P, submitter: `${P}au`, title, published: true, datePublished: date, ...extra});
    return r.submissionId;
}

// ================================================================= the drive
forEachApp(async (app) => {
    const isOmp = app.name === 'omp';
    const mg = await launch(app);
    const vs = await launch(app);
    const page = mg.page;
    const vis = vs.page;
    try {
        // ------------------------------------------------ controls (multi-app rule 4)
        if (on('controls')) {
            await step('controls', async () => {
                await signIn(page, 'manager.maya');
                const r = await page.goto(app.url(`/index.php/${app.contextPath}/manageCatalog`));
                await idle(page);
                const s = await snap(page, 'ctl-manageCatalog');
                const menu = await page.locator('nav, [aria-label="Site Navigation"]').first().innerText().catch(() => '');
                fact(`controls-${app.name}`, {status: r ? r.status() : null, url: s.url, title: s.title, main: flat(s.text && s.text.main, 300), catalogInMenu: /\bCatalog\b/.test(menu), rows: await page.locator('.listPanel__item--catalog').count()});
                await signOut(page);
            });
        }
        if (!isOmp) return;

        // ------------------------------------------------ flags (td8: Rules 6, 7, side effect)
        if (on('flags')) {
            await step('flags', async (out) => {
                const P = `${tag('u70k3')}a`;
                await must(app, 'scenarios/context', pressSpec(P));
                const A = 'K3a Alpha', B = 'K3a Beta', G = 'K3a Gamma';
                const ids = {};
                ids[A] = await seedBook(app, P, 1, A, '2024-01-10', {categories: ['sci'], series: 'hist'});
                ids[B] = await seedBook(app, P, 2, B, '2024-02-10', {categories: ['sci']});
                ids[G] = await seedBook(app, P, 3, G, '2024-03-10', {categories: ['arts'], series: 'hist'});
                runJobs(app);
                note(`ccK3 flags: press ${P}, books ${JSON.stringify(ids)}`);
                Object.assign(out, {P, ids});
                const au = `${P}au@mail.test`, mgm = `${P}mg@mail.test`, edm = `${P}ed@mail.test`;
                out.mail0 = {au: await mailCount(app, au), mg: await mailCount(app, mgm), ed: await mailCount(app, edm)};

                // author's Tasks before, in the visitor browser
                await signIn(vis, `${P}au`);
                out.tasks0 = await authorTasks(vis, app, P);
                await snap(vis, 'a-author-tasks-0');
                await signOut(vis);

                await signIn(page, `${P}mg`);
                await openWorkflow(page, app, P, ids[A]);
                out.log0 = await step('log0', () => activityLog(page));

                await openCatalog(page, app, P);
                const s0 = await snap(page, 'a-catalog-0');
                out.anatomy = {header: await header(page), rows: await rows(page), order: await order(page)};
                await loc(page, 'Catalog: a row by title', item(page, A));
                await loc(page, 'Catalog: "Featured" box (off)', item(page, A).getByRole('button', {name: FEAT_OFF, exact: true}));
                await loc(page, 'Catalog: "New release" box (off)', item(page, A).getByRole('button', {name: NEW_OFF, exact: true}));
                out.anatomy.main = flat(s0.text && s0.text.main, 1500);

                // public, before
                out.pub0 = {catalog: await pub.catalog(vis, app, P, 'a-pub-catalog-0'), newReleases: await pub.newReleases(vis, app, P, 'a-pub-new-0'), home: await pub.home(vis, app, P, 'a-pub-home-0')};

                // Rule 6: tick "Featured" on the last book in the list
                out.featOn = await press(page, A, FEAT_OFF);
                await snap(page, 'a-catalog-featured-at-once', {press: out.featOn});
                await loc(page, 'Catalog: "Featured" box (on)', item(page, A).getByRole('button', {name: FEAT_ON, exact: true}));
                out.featOnReload = await catalogWith(page, app, P);
                await snap(page, 'a-catalog-featured-reload');
                out.pubFeat = {catalog: await pub.catalog(vis, app, P, 'a-pub-catalog-feat'), homeUnticked: await pub.home(vis, app, P, 'a-pub-home-feat-setting-off')};

                // Rule 7: tick "New release" on Alpha, then Beta (newer), to read the New Releases order
                await openCatalog(page, app, P);
                out.newOnA = await press(page, A, NEW_OFF);
                out.newOnB = await press(page, B, NEW_OFF);
                await snap(page, 'a-catalog-new-at-once');
                out.newReload = await catalogWith(page, app, P);
                out.pubNew = {newReleases: await pub.newReleases(vis, app, P, 'a-pub-new-on'), homeUnticked: await pub.home(vis, app, P, 'a-pub-home-new-setting-off')};

                // "Featured Books" and "New Releases" ticked: the home page
                out.setupSave = await setHomeLists(page, app, P, {featured: true, newReleases: true});
                await snap(page, 'a-setup-ticked');
                out.pubHomeTicked = await pub.home(vis, app, P, 'a-pub-home-ticked');

                // category and series lists
                await openCatalog(page, app, P);
                await filter(page, 'Science');
                await snap(page, 'a-catalog-filter-science');
                out.sciHeader = await header(page);
                out.sciFeat = await press(page, A, FEAT_OFF);
                out.sciNew = await press(page, A, NEW_OFF);
                out.sciReload = await catalogWith(page, app, P, 'Science');
                out.noFilterAfterSci = await catalogWith(page, app, P);
                await openCatalog(page, app, P);
                await filter(page, 'History');
                await snap(page, 'a-catalog-filter-history');
                out.histHeader = await header(page);
                out.histFeat = await press(page, G, FEAT_OFF);
                out.histNew = await press(page, G, NEW_OFF);
                out.histReload = await catalogWith(page, app, P, 'History');
                runJobs(app);
                out.pubCat = {sci: await pub.category(vis, app, P, 'sci', 'a-pub-cat-sci-on'), hist: await pub.series(vis, app, P, 'hist', 'a-pub-series-hist-on'), newReleases: await pub.newReleases(vis, app, P, 'a-pub-new-with-cat')};

                // Press editor level: tick and reload
                await signIn(page, `${P}ed`);
                await openCatalog(page, app, P);
                out.edFeat = await press(page, B, FEAT_OFF);
                out.edReload = await catalogWith(page, app, P);
                await snap(page, 'a-catalog-editor');
                out.edUnfeat = await press(page, B, FEAT_ON);
                await signIn(page, `${P}mg`);

                // untick everything
                await openCatalog(page, app, P);
                out.featOff = await press(page, A, FEAT_ON);
                out.newOffA = await press(page, A, NEW_ON);
                out.newOffB = await press(page, B, NEW_ON);
                out.offReload = await catalogWith(page, app, P);
                await filter(page, 'Science');
                out.sciOff = [await press(page, A, FEAT_ON), await press(page, A, NEW_ON)];
                await openCatalog(page, app, P);
                await filter(page, 'History');
                out.histOff = [await press(page, G, FEAT_ON), await press(page, G, NEW_ON)];
                out.pubOff = {catalog: await pub.catalog(vis, app, P, 'a-pub-catalog-off'), newReleases: await pub.newReleases(vis, app, P, 'a-pub-new-off'), home: await pub.home(vis, app, P, 'a-pub-home-off'), sci: await pub.category(vis, app, P, 'sci', 'a-pub-cat-sci-off'), hist: await pub.series(vis, app, P, 'hist', 'a-pub-series-hist-off')};

                // side effect: Activity Log, mail, the author's Tasks
                await openWorkflow(page, app, P, ids[A]);
                out.log1 = await step('log1', () => activityLog(page));
                await snap(page, 'a-workflow-alpha-after');
                await sleep(3000);
                out.mail1 = {au: await mailCount(app, au), mg: await mailCount(app, mgm), ed: await mailCount(app, edm)};
                await signIn(vis, `${P}au`);
                out.tasks1 = await authorTasks(vis, app, P);
                await snap(vis, 'a-author-tasks-1');
                await signOut(vis);
                out.rows = {features: sql(app, `select submission_id, assoc_type, assoc_id, seq from features where submission_id in (${Object.values(ids).join(',')}) order by 1`), newReleases: sql(app, `select submission_id, assoc_type, assoc_id from new_releases where submission_id in (${Object.values(ids).join(',')}) order by 1`)};
            });
        }

        // ------------------------------------------------ catpub (Rules 6–7's last clauses: a category's and a series' public page)
        if (on('catpub')) {
            await step('catpub', async (out) => {
                const P = `${tag('u70k3')}f`;
                await must(app, 'scenarios/context', pressSpec(P));
                const A = 'K3f Alpha', B = 'K3f Beta', G = 'K3f Gamma';
                const ids = {};
                ids[A] = await seedBook(app, P, 1, A, '2024-01-10', {categories: ['sci'], series: 'hist'});
                ids[B] = await seedBook(app, P, 2, B, '2024-02-10', {categories: ['sci'], series: 'hist'});
                ids[G] = await seedBook(app, P, 3, G, '2024-03-10', {categories: ['sci'], series: 'hist'});
                runJobs(app);
                note(`ccK3 catpub: press ${P}, books ${JSON.stringify(ids)}`);
                Object.assign(out, {P, ids});
                await signIn(page, `${P}mg`);
                out.c0 = {sci: await catalogWith(page, app, P, 'Science'), hist: await catalogWith(page, app, P, 'History')};
                out.p0 = {sci: await pub.category(vis, app, P, 'sci', 'f-pub-cat-0'), hist: await pub.series(vis, app, P, 'hist', 'f-pub-series-0')};
                // the book listed last on each public page, featured there and made a new release there
                const lastSci = out.p0.sci.all[out.p0.sci.all.length - 1];
                const lastHist = out.p0.hist.all[out.p0.hist.all.length - 1];
                out.picked = {lastSci, lastHist};
                await openCatalog(page, app, P);
                await filter(page, 'Science');
                out.sciF = await press(page, lastSci, FEAT_OFF);
                out.sciN = await press(page, lastSci, NEW_OFF);
                await openCatalog(page, app, P);
                await filter(page, 'History');
                out.histF = await press(page, lastHist, FEAT_OFF);
                out.histN = await press(page, lastHist, NEW_OFF);
                out.p1 = {sci: await pub.category(vis, app, P, 'sci', 'f-pub-cat-1'), hist: await pub.series(vis, app, P, 'hist', 'f-pub-series-1')};
                // off again; then a whole-catalog feature only, on the book first listed on the category page
                await openCatalog(page, app, P);
                await filter(page, 'Science');
                await press(page, lastSci, FEAT_ON);
                await press(page, lastSci, NEW_ON);
                await openCatalog(page, app, P);
                await filter(page, 'History');
                await press(page, lastHist, FEAT_ON);
                await press(page, lastHist, NEW_ON);
                out.p2 = {sci: await pub.category(vis, app, P, 'sci', 'f-pub-cat-2'), hist: await pub.series(vis, app, P, 'hist', 'f-pub-series-2')};
                await openCatalog(page, app, P);
                out.wholeF = await press(page, lastSci, FEAT_OFF);
                out.p3 = {sci: await pub.category(vis, app, P, 'sci', 'f-pub-cat-3'), hist: await pub.series(vis, app, P, 'hist', 'f-pub-series-3'), catalog: await pub.catalog(vis, app, P, 'f-pub-catalog-3')};
                // leaving the page mid-ordering, with a move unsaved (second run of order's o4)
                await openCatalog(page, app, P);
                const other = [A, B, G].find((t) => t !== lastSci);
                await press(page, other, FEAT_OFF);
                await openCatalog(page, app, P);
                await page.getByRole('button', {name: 'Order Features', exact: true}).click();
                await page.getByRole('button', {name: 'Save Order', exact: true}).waitFor({timeout: T});
                const l0 = await order(page);
                await item(page, l0[0]).getByRole('button', {name: /Decrease position/}).click();
                await sleep(300);
                const dialogs = [];
                const onDlg = (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); };
                page.on('dialog', onDlg);
                out.leave = {before: l0, moved: await order(page)};
                await page.goto(ctxUrl(app, P, '/dashboard/editorial')).catch((e) => dialogs.push({gotoErr: flat(e.message, 200)}));
                await idle(page);
                page.off('dialog', onDlg);
                out.leave.dialogs = dialogs;
                out.leave.back = await catalogWith(page, app, P);
            });
        }

        // ------------------------------------------------ lists (td9: Rule 8, A4)
        if (on('lists')) {
            await step('lists', async (out) => {
                const P = `${tag('u70k3')}b`;
                await must(app, 'scenarios/context', pressSpec(P));
                const A = 'K3b Alpha', B = 'K3b Beta', S = 'K3b Mover';
                const ids = {};
                ids[A] = await seedBook(app, P, 1, A, '2024-01-10', {categories: ['sci', 'arts'], series: 'hist'});
                ids[B] = await seedBook(app, P, 2, B, '2024-02-10', {categories: ['sci', 'arts'], series: 'hist'});
                ids[S] = await seedBook(app, P, 3, S, '2024-03-10', {categories: ['sci'], series: 'hist', featured: [{in: 'series', path: 'hist'}], newRelease: [{in: 'series', path: 'hist'}]});
                runJobs(app);
                note(`ccK3 lists: press ${P}, books ${JSON.stringify(ids)}`);
                Object.assign(out, {P, ids});
                const flagRows = () => ({features: sql(app, `select submission_id, assoc_type, assoc_id, seq from features where submission_id in (${Object.values(ids).join(',')}) order by 1,2,3`), newReleases: sql(app, `select submission_id, assoc_type, assoc_id from new_releases where submission_id in (${Object.values(ids).join(',')}) order by 1,2,3`)});
                await signIn(page, `${P}mg`);

                // Featured in category: Science, then Arts, then Science again
                await openCatalog(page, app, P);
                await filter(page, 'Science');
                out.f1 = {press: await press(page, A, FEAT_OFF)};
                out.f1.reload = await catalogWith(page, app, P, 'Science');
                out.f1.rows = flagRows();
                await openCatalog(page, app, P);
                await filter(page, 'Arts');
                out.f2 = {before: await boxes(page)};
                await snap(page, 'b-arts-before-press');
                const artsBtn = (await boxes(page)).find((l) => l.startsWith(A)) || '';
                out.f2.press = await press(page, A, artsBtn.includes('F+') ? FEAT_ON : FEAT_OFF);
                await snap(page, 'b-arts-after-press');
                out.f2.reload = await catalogWith(page, app, P, 'Arts');
                out.f2.rows = flagRows();
                out.f3 = {science: await catalogWith(page, app, P, 'Science')};
                await snap(page, 'b-science-after-arts');
                out.f3.rows = flagRows();
                // press again in Arts: now nothing in a category → ticks
                await openCatalog(page, app, P);
                await filter(page, 'Arts');
                const a2 = (await boxes(page)).find((l) => l.startsWith(A)) || '';
                out.f4 = {press: await press(page, A, a2.includes('F+') ? FEAT_ON : FEAT_OFF)};
                out.f4.reload = await catalogWith(page, app, P, 'Arts');
                out.f4.science = await catalogWith(page, app, P, 'Science');
                out.f4.rows = flagRows();
                runJobs(app);
                out.f4.pub = {sci: await pub.category(vis, app, P, 'sci', 'b-pub-cat-sci'), arts: await pub.category(vis, app, P, 'arts', 'b-pub-cat-arts')};
                // untick in Science (box empty there): what happens to Arts
                await openCatalog(page, app, P);
                await filter(page, 'Science');
                const s2 = (await boxes(page)).find((l) => l.startsWith(A)) || '';
                out.f5 = {sciBox: s2, press: await press(page, A, s2.includes('F+') ? FEAT_ON : FEAT_OFF)};
                out.f5.arts = await catalogWith(page, app, P, 'Arts');
                out.f5.science = await catalogWith(page, app, P, 'Science');
                out.f5.rows = flagRows();

                // New release in category: the same walk
                const nb = async (label) => ((await catalogWith(page, app, P, label)).boxes.find((l) => l.startsWith(A)) || '');
                const pressNew = async (label) => {
                    await openCatalog(page, app, P);
                    await filter(page, label);
                    const l = (await boxes(page)).find((x) => x.startsWith(A)) || '';
                    return {before: l, press: await press(page, A, l.includes('N+') ? NEW_ON : NEW_OFF)};
                };
                out.n1 = await pressNew('Science');
                out.n1.science = await nb('Science');
                out.n2 = await pressNew('Arts');
                out.n2.arts = await nb('Arts');
                out.n2.science = await nb('Science');
                out.n2.rows = flagRows();
                // clean the category flags for the next part
                for (const label of ['Science', 'Arts']) {
                    for (let k = 0; k < 2; k++) {
                        await openCatalog(page, app, P);
                        await filter(page, label);
                        const l = (await boxes(page)).find((x) => x.startsWith(A)) || '';
                        if (l.includes('F+')) await press(page, A, FEAT_ON);
                        if (l.includes('N+')) await press(page, A, NEW_ON);
                    }
                }
                out.cleanRows = flagRows();

                // independence: whole catalog + category + series on Beta
                await openCatalog(page, app, P);
                out.i1 = await press(page, B, FEAT_OFF);
                await filter(page, 'Science');
                out.i2 = await press(page, B, FEAT_OFF);
                await openCatalog(page, app, P);
                await filter(page, 'History');
                out.i3 = await press(page, B, FEAT_OFF);
                out.iRead = {none: await catalogWith(page, app, P), sci: await catalogWith(page, app, P, 'Science'), arts: await catalogWith(page, app, P, 'Arts'), hist: await catalogWith(page, app, P, 'History')};
                out.iRows = flagRows();
                // untick in Science: the catalog and series flags stay?
                await openCatalog(page, app, P);
                await filter(page, 'Science');
                out.i4 = await press(page, B, FEAT_ON);
                out.i4read = {none: await catalogWith(page, app, P), hist: await catalogWith(page, app, P, 'History')};
                out.i4rows = flagRows();

                // two series: Mover featured + new release in History; unpublish, move to Philosophy, publish
                out.s0 = {hist: await catalogWith(page, app, P, 'History'), phil: await catalogWith(page, app, P, 'Philosophy')};
                await openWorkflow(page, app, P, ids[S]);
                await openPubPage(page, 'Title & Abstract');
                out.s1 = {unpub: await unpublish(page)};
                await openPubPage(page, 'Catalog Entry');
                const sel = page.locator('select[name="seriesId"]');
                await sel.waitFor({timeout: T});
                out.s1.seriesOptions = await sel.locator('option').allInnerTexts();
                await sel.selectOption({label: 'Philosophy'});
                const saved = page.waitForResponse((r) => /publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await page.locator('form').filter({has: sel}).getByRole('button', {name: 'Save', exact: true}).click();
                out.s1.save = (await saved)?.status() ?? null;
                await idle(page);
                await openPubPage(page, 'Title & Abstract');
                out.s1.pub = await publish(page);
                out.s1.rows = flagRows();
                runJobs(app);
                out.s2 = {phil: await catalogWith(page, app, P, 'Philosophy')};
                await snap(page, 'b-phil-before-press');
                const m = out.s2.phil.boxes.find((l) => l.startsWith(S)) || '';
                out.s2.pressF = await press(page, S, m.includes('F+') ? FEAT_ON : FEAT_OFF);
                out.s2.after = await catalogWith(page, app, P, 'Philosophy');
                await snap(page, 'b-phil-after-press');
                out.s2.hist = await catalogWith(page, app, P, 'History');
                out.s2.rows = flagRows();
                const m2 = out.s2.after.boxes.find((l) => l.startsWith(S)) || '';
                await openCatalog(page, app, P);
                await filter(page, 'Philosophy');
                out.s2.pressN = await press(page, S, m2.includes('N+') ? NEW_ON : NEW_OFF);
                out.s2.afterN = await catalogWith(page, app, P, 'Philosophy');
                out.s2.rowsN = flagRows();
                runJobs(app);
                out.s2.pub = {phil: await pub.series(vis, app, P, 'phil', 'b-pub-series-phil'), hist: await pub.series(vis, app, P, 'hist', 'b-pub-series-hist')};
            });
        }

        // ------------------------------------------------ unpub (td10: Rule 9)
        if (on('unpub')) {
            await step('unpub', async (out) => {
                const P = `${tag('u70k3')}c`;
                await must(app, 'scenarios/context', pressSpec(P));
                const A = 'K3c Alpha', B = 'K3c Beta', G = 'K3c Gamma';
                const ids = {};
                ids[A] = await seedBook(app, P, 1, A, '2024-01-10', {categories: ['sci'], featured: [{in: 'catalog'}, {in: 'category', path: 'sci'}], newRelease: [{in: 'catalog'}]});
                ids[B] = await seedBook(app, P, 2, B, '2024-02-10', {categories: ['sci']});
                ids[G] = await seedBook(app, P, 3, G, '2024-03-10', {featured: [{in: 'catalog'}], newRelease: [{in: 'catalog'}]});
                note(`ccK3 unpub: press ${P}, books ${JSON.stringify(ids)}`);
                Object.assign(out, {P, ids});
                const flagRows = () => ({features: sql(app, `select submission_id, assoc_type, assoc_id, seq from features where submission_id in (${Object.values(ids).join(',')}) order by 1,2,3`), newReleases: sql(app, `select submission_id, assoc_type, assoc_id from new_releases where submission_id in (${Object.values(ids).join(',')}) order by 1,2,3`)});
                const au = `${P}au@mail.test`;
                out.mail0 = await mailCount(app, au);
                await signIn(page, `${P}mg`);
                out.c0 = {none: await catalogWith(page, app, P), sci: await catalogWith(page, app, P, 'Science')};
                out.rows0 = flagRows();
                await openWorkflow(page, app, P, ids[A]);
                await openPubPage(page, 'Title & Abstract');
                out.unpub = await unpublish(page);
                await snap(page, 'c-alpha-unpublished');
                out.c1 = {none: await catalogWith(page, app, P), sci: await catalogWith(page, app, P, 'Science')};
                await snap(page, 'c-catalog-after-unpublish');
                out.rows1 = flagRows();
                out.pub1 = {catalog: await pub.catalog(vis, app, P, 'c-pub-catalog-unpub'), newReleases: await pub.newReleases(vis, app, P, 'c-pub-new-unpub')};
                await openWorkflow(page, app, P, ids[A]);
                await openPubPage(page, 'Title & Abstract');
                out.republish = await publish(page);
                await snap(page, 'c-alpha-republished');
                out.c2 = {none: await catalogWith(page, app, P), sci: await catalogWith(page, app, P, 'Science')};
                await snap(page, 'c-catalog-after-republish');
                out.rows2 = flagRows();
                out.pub2 = {catalog: await pub.catalog(vis, app, P, 'c-pub-catalog-repub'), newReleases: await pub.newReleases(vis, app, P, 'c-pub-new-repub')};
                await sleep(3000);
                out.mail1 = await mailCount(app, au);

                // delete: Gamma (featured, a new release) unpublished, declined on its stage, then "Delete"
                await openWorkflow(page, app, P, ids[G]);
                await openPubPage(page, 'Title & Abstract');
                out.gUnpub = await unpublish(page);
                const stageButtons = async () => page.locator('[data-cy="workflow-action-items"] button').evaluateAll((els) => els.filter((b) => b.offsetParent !== null).map((b) => b.innerText.trim()));
                await openWorkflow(page, app, P, ids[G]);
                out.gAfterUnpub = {stage: await stageButtons()};
                await snap(page, 'c-gamma-unpublished-workflow');
                out.rowsG0 = flagRows();
                await page.locator('[data-cy="workflow-action-items"]').getByRole('button', {name: 'Decline Submission', exact: true}).click();
                await page.getByRole('heading', {name: 'Decline Submission'}).first().waitFor({timeout: T});
                await idle(page);
                await page.locator('.composer__loadingTemplateMask').first().waitFor({state: 'detached', timeout: T}).catch(() => {});
                const dec = page.waitForResponse((r) => /\/decisions/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                await page.getByRole('button', {name: 'Record Decision', exact: true}).click();
                out.gDecline = (await dec)?.status() ?? null;
                await page.getByText('View Submission Summary').first().waitFor({timeout: T}).catch(() => {});
                await openWorkflow(page, app, P, ids[G]);
                out.gAfterDecline = {stage: await stageButtons()};
                out.rowsG1 = flagRows();
                const del = page.locator('[data-cy="workflow-action-items"]').getByRole('button', {name: 'Delete', exact: true});
                if (await del.count()) {
                    await del.click();
                    const dlg = page.getByRole('dialog', {name: 'Delete', exact: true});
                    await dlg.waitFor({timeout: T});
                    const gone = page.waitForResponse((r) => /\/submissions\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                    await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
                    out.gDelete = (await gone)?.status() ?? null;
                    await idle(page);
                }
                out.rowsG2 = flagRows();
                out.c3 = await catalogWith(page, app, P);
            });
        }

        // ------------------------------------------------ order (td11: Rule 10)
        if (on('order')) {
            await step('order', async (out) => {
                const P = `${tag('u70k3')}d`;
                await must(app, 'scenarios/context', pressSpec(P));
                const M1 = 'K3d M1', M2 = 'K3d M2', M3 = 'K3d M3';
                const ids = {};
                ids[M2] = await seedBook(app, P, 2, M2, '2024-02-10', {categories: ['sci'], series: 'hist', featured: [{in: 'catalog', position: 1}, {in: 'category', path: 'sci'}, {in: 'series', path: 'hist'}]});
                ids[M1] = await seedBook(app, P, 1, M1, '2024-01-10', {categories: ['sci'], series: 'hist', featured: [{in: 'catalog', position: 1}, {in: 'category', path: 'sci'}]});
                ids[M3] = await seedBook(app, P, 3, M3, '2024-03-10', {categories: ['sci'], series: 'hist'});
                runJobs(app);
                note(`ccK3 order: press ${P}, books ${JSON.stringify(ids)}`);
                Object.assign(out, {P, ids});
                const featRows = () => sql(app, `select submission_id, assoc_type, seq from features where submission_id in (${Object.values(ids).join(',')}) order by 2, 3`);
                await signIn(page, `${P}mg`);
                out.setup = await setHomeLists(page, app, P, {featured: true});
                await openCatalog(page, app, P);
                out.o0 = {order: await order(page), boxes: await boxes(page), header: await header(page)};
                await snap(page, 'd-catalog-0');
                out.rows0 = featRows();
                out.pub0 = {catalog: await pub.catalog(vis, app, P, 'd-pub-catalog-0'), home: await pub.home(vis, app, P, 'd-pub-home-0')};

                // start ordering
                await page.getByRole('button', {name: 'Order Features', exact: true}).click();
                await idle(page);
                const so = await snap(page, 'd-ordering');
                out.o1 = {order: await order(page), rows: await rows(page), header: await header(page), main: flat(so.text && so.text.main, 1200)};
                out.o1.arrowLabels = await page.locator('.listPanel__item--catalog button').evaluateAll((els) => els.filter((b) => b.offsetParent !== null).map((b) => b.getAttribute('aria-label') || b.innerText.trim()));
                await loc(page, 'Ordering: "Save Order"', page.getByRole('button', {name: 'Save Order', exact: true}));
                await loc(page, 'Ordering: "Cancel"', page.getByRole('button', {name: 'Cancel', exact: true}));
                await loc(page, 'Ordering: up arrow of a row', item(page, M2).getByRole('button', {name: /Increase position/}));
                await loc(page, 'Ordering: drag handle', page.locator('.orderer__dragDrop'));
                // first book's up arrow, last book's down arrow
                const cur = await order(page);
                await item(page, cur[0]).getByRole('button', {name: /Increase position/}).click();
                await sleep(300);
                out.o1.afterFirstUp = await order(page);
                await item(page, cur[cur.length - 1]).getByRole('button', {name: /Decrease position/}).click();
                await sleep(300);
                out.o1.afterLastDown = await order(page);
                // drag M2 onto M1
                const handle = item(page, M2).locator('.orderer__dragDrop, [class*="drag"]').first();
                out.o1.handleCount = await item(page, M2).locator('.orderer__dragDrop, [class*="drag"]').count();
                if (out.o1.handleCount) {
                    await handle.dragTo(item(page, M1)).catch((e) => { out.o1.dragErr = flat(e.message, 200); });
                } else {
                    await item(page, M2).dragTo(item(page, M1)).catch((e) => { out.o1.dragErr = flat(e.message, 200); });
                }
                await sleep(500);
                out.o1.afterDrag = await order(page);
                // make sure M2 goes up once from the current order via its arrow
                if ((await order(page))[0] !== M2) {
                    await item(page, M2).getByRole('button', {name: /Increase position/}).click();
                    await sleep(300);
                }
                out.o1.beforeSave = await order(page);
                const sv = page.waitForResponse((r) => /saveFeaturedOrder/.test(r.url()), {timeout: T}).catch(() => null);
                await page.getByRole('button', {name: 'Save Order', exact: true}).click();
                const r = await sv;
                await idle(page);
                out.o2 = {status: r ? r.status() : null, order: await order(page), header: await header(page)};
                await snap(page, 'd-after-save-order');
                out.o2.reload = await catalogWith(page, app, P);
                out.o2.rows = featRows();
                out.o2.pub = {catalog: await pub.catalog(vis, app, P, 'd-pub-catalog-saved'), home: await pub.home(vis, app, P, 'd-pub-home-saved')};

                // again: move the first down, Cancel
                await openCatalog(page, app, P);
                await page.getByRole('button', {name: 'Order Features', exact: true}).click();
                await idle(page);
                const c0 = await order(page);
                await item(page, c0[0]).getByRole('button', {name: /Decrease position/}).click();
                await sleep(300);
                out.o3 = {moved: await order(page)};
                const cancelReq = page.waitForResponse((r) => /_submissions/.test(r.url()), {timeout: 10_000}).catch(() => null);
                await page.getByRole('button', {name: 'Cancel', exact: true}).click();
                out.o3.cancelRefetch = !!(await cancelReq);
                await idle(page);
                out.o3.afterCancel = await order(page);
                out.o3.header = await header(page);
                await snap(page, 'd-after-cancel');
                out.o3.reload = await catalogWith(page, app, P);
                out.o3.rows = featRows();

                // leave with an unsaved move
                await openCatalog(page, app, P);
                await page.getByRole('button', {name: 'Order Features', exact: true}).click();
                await idle(page);
                const l0 = await order(page);
                await item(page, l0[0]).getByRole('button', {name: /Decrease position/}).click();
                await sleep(300);
                const dialogs = [];
                const onDlg = (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); };
                page.on('dialog', onDlg);
                await page.goto(ctxUrl(app, P, '/dashboard/editorial')).catch((e) => dialogs.push({gotoErr: flat(e.message, 200)}));
                await idle(page);
                page.off('dialog', onDlg);
                out.o4 = {moved: await (async () => l0)(), dialogs, landed: page.url()};
                out.o4.back = await catalogWith(page, app, P);
                out.o4.rows = featRows();

                // with a category and a series as the filter
                await openCatalog(page, app, P);
                await filter(page, 'Science');
                out.o5 = {order: await order(page), boxes: await boxes(page)};
                await page.getByRole('button', {name: 'Order Features', exact: true}).click();
                await idle(page);
                const sc = await snap(page, 'd-ordering-science');
                out.o5.header = await header(page);
                out.o5.main = flat(sc.text && sc.text.main, 800);
                out.o5.ordering = await order(page);
                await item(page, M2).getByRole('button', {name: /Increase position/}).click();
                await sleep(300);
                const sv2 = page.waitForResponse((r) => /saveFeaturedOrder/.test(r.url()), {timeout: T}).catch(() => null);
                await page.getByRole('button', {name: 'Save Order', exact: true}).click();
                out.o5.saveStatus = (await sv2)?.status() ?? null;
                await idle(page);
                out.o5.after = {order: await order(page), header: await header(page)};
                out.o5.reload = await catalogWith(page, app, P, 'Science');
                out.o5.none = await catalogWith(page, app, P);
                out.o5.rows = featRows();
                runJobs(app);
                out.o5.pub = await pub.category(vis, app, P, 'sci', 'd-pub-cat-sci');
                await openCatalog(page, app, P);
                await filter(page, 'History');
                await page.getByRole('button', {name: 'Order Features', exact: true}).click();
                await idle(page);
                const hs = await snap(page, 'd-ordering-history');
                out.o6 = {header: await header(page), main: flat(hs.text && hs.text.main, 800), ordering: await order(page)};
                await page.getByRole('button', {name: 'Cancel', exact: true}).click();
                await idle(page);
                // Arts: nothing featured there → is "Order Features" offered?
                out.o7 = {arts: await catalogWith(page, app, P, 'Arts'), header: await header(page)};
            });
        }

        // ------------------------------------------------ order2 (td11 second run: an arrow straight away, a row drag,
        // a filter pressed while ordering; td12 second and third runs after an on-screen "Save Order")
        if (on('order2')) {
            await step('order2', async (out) => {
                const P = `${tag('u70k3')}g`;
                await must(app, 'scenarios/context', pressSpec(P));
                const M = ['K3g M1', 'K3g M2', 'K3g M3', 'K3g M4'];
                const ids = {};
                ids[M[2]] = await seedBook(app, P, 3, M[2], '2024-03-10', {categories: ['sci'], series: 'hist', featured: [{in: 'catalog', position: 1}, {in: 'category', path: 'sci'}]});
                ids[M[1]] = await seedBook(app, P, 2, M[1], '2024-02-10', {categories: ['sci'], series: 'hist', featured: [{in: 'catalog', position: 1}, {in: 'category', path: 'sci'}]});
                ids[M[0]] = await seedBook(app, P, 1, M[0], '2024-01-10', {categories: ['sci'], series: 'hist', featured: [{in: 'catalog', position: 1}]});
                ids[M[3]] = await seedBook(app, P, 4, M[3], '2024-04-10', {categories: ['sci']});
                runJobs(app);
                note(`ccK3 order2: press ${P}, books ${JSON.stringify(ids)}`);
                Object.assign(out, {P, ids});
                const featRows = () => sql(app, `select submission_id, assoc_type, seq from features where submission_id in (${Object.values(ids).join(',')}) order by 2, 3, 1`);
                const startOrdering = async () => {
                    await page.getByRole('button', {name: 'Order Features', exact: true}).click();
                    await page.getByRole('button', {name: 'Save Order', exact: true}).waitFor({timeout: T});
                    await idle(page);
                };
                const saveOrder = async () => {
                    const sv = page.waitForResponse((r) => /saveFeaturedOrder/.test(r.url()), {timeout: T}).catch(() => null);
                    await page.getByRole('button', {name: 'Save Order', exact: true}).click();
                    const r = await sv;
                    await idle(page);
                    return {status: r ? r.status() : null, header: await header(page), order: await order(page)};
                };
                await signIn(page, `${P}mg`);
                out.setup = await setHomeLists(page, app, P, {featured: true});
                await openCatalog(page, app, P);
                out.a0 = await order(page);
                out.rows0 = featRows();
                // a) M3's up arrow straight away (M3 is last of M1, M2, M3)
                await startOrdering();
                await item(page, M[2]).getByRole('button', {name: /Increase position/}).click();
                await sleep(400);
                out.a1 = {afterUp: await order(page)};
                await item(page, M[2]).getByRole('button', {name: /Increase position/}).click();
                await sleep(400);
                out.a1.afterUp2 = await order(page);
                await snap(page, 'g-ordering-moved');
                out.a1.save = await saveOrder();
                await snap(page, 'g-after-save-order');
                out.a1.reload = await catalogWith(page, app, P);
                out.a1.rows = featRows();
                out.a1.pub = {catalog: await pub.catalog(vis, app, P, 'g-pub-catalog'), home: await pub.home(vis, app, P, 'g-pub-home')};
                // b) the first's up and the last's down, then a real move, then Cancel
                await openCatalog(page, app, P);
                await startOrdering();
                const b0 = await order(page);
                await item(page, b0[0]).getByRole('button', {name: /Increase position/}).click();
                await sleep(300);
                await item(page, b0[b0.length - 1]).getByRole('button', {name: /Decrease position/}).click();
                await sleep(300);
                out.b = {start: b0, afterEnds: await order(page)};
                await item(page, b0[1]).getByRole('button', {name: /Decrease position/}).click();
                await sleep(300);
                out.b.afterMove = await order(page);
                await page.getByRole('button', {name: 'Cancel', exact: true}).click();
                await idle(page);
                out.b.afterCancel = await order(page);
                // b2) the last book's down arrow once, then its up arrow once and twice (a hidden, not-featured book below?)
                await startOrdering();
                const b2 = await order(page);
                const last = b2[b2.length - 1];
                await item(page, last).getByRole('button', {name: /Decrease position/}).click();
                await sleep(300);
                out.b2 = {start: b2, afterLastDown: await order(page)};
                await item(page, last).getByRole('button', {name: /Increase position/}).click();
                await sleep(300);
                out.b2.afterUp1 = await order(page);
                await item(page, last).getByRole('button', {name: /Increase position/}).click();
                await sleep(300);
                out.b2.afterUp2 = await order(page);
                await snap(page, 'g-ordering-after-last-down');
                await page.getByRole('button', {name: 'Cancel', exact: true}).click();
                await idle(page);
                out.b2.afterCancel = await order(page);
                // c) a mouse drag of a row (the drag handle is hidden while ordering)
                await startOrdering();
                const c0 = await order(page);
                out.c = {start: c0, handleVisible: await item(page, c0[2]).locator('.orderer__dragDrop').isVisible().catch(() => null)};
                const from = await item(page, c0[2]).boundingBox();
                const to = await item(page, c0[0]).boundingBox();
                if (from && to) {
                    await page.mouse.move(from.x + 40, from.y + from.height / 2);
                    await page.mouse.down();
                    await page.mouse.move(to.x + 40, to.y + 5, {steps: 15});
                    await page.mouse.up();
                }
                await sleep(500);
                out.c.afterDrag = await order(page);
                await snap(page, 'g-after-drag');
                await page.getByRole('button', {name: 'Cancel', exact: true}).click();
                await idle(page);
                // e) td12 again: "Save Order" on the whole catalog, tick M4, reload
                await openCatalog(page, app, P);
                await startOrdering();
                out.e = {save1: await saveOrder(), rows1: featRows()};
                await openCatalog(page, app, P);
                out.e.tick1 = (await press(page, M[3], FEAT_OFF)).status;
                out.e.place1 = await catalogWith(page, app, P);
                out.e.rows1b = featRows();
                await press(page, M[3], FEAT_ON);
                await openCatalog(page, app, P);
                await startOrdering();
                out.e.save2 = await saveOrder();
                out.e.rows2 = featRows();
                await openCatalog(page, app, P);
                out.e.tick2 = (await press(page, M[3], FEAT_OFF)).status;
                out.e.place2 = await catalogWith(page, app, P);
                out.e.rows2b = featRows();
                // d) Science as the filter, ordering, then another filter pressed in the still-open column:
                //    History (nothing featured there), then back to Science, then Arts (M4 only, not featured)
                await openCatalog(page, app, P);
                await filter(page, 'Science');
                await startOrdering();
                out.d = {science: await order(page), header: await header(page)};
                const flt = (label) => page.locator('button.pkpFilter__label', {hasText: label}).first();
                const pressFilter = async (label) => {
                    const got = page.waitForResponse((r) => /_submissions\?/.test(r.url()), {timeout: 10_000}).catch(() => null);
                    await flt(label).click();
                    const refetch = !!(await got);
                    await idle(page);
                    return {refetch, order: await order(page), header: await header(page), rows: (await rows(page)).map((r) => [r.title, r.shown, r.boxes.map((b) => b.shown)])};
                };
                out.d.histVisible = await flt('History').isVisible().catch(() => false);
                out.d.toHistory = await pressFilter('History');
                await snap(page, 'g-ordering-filter-switched');
                out.d.toScience = await pressFilter('Science');
                await snap(page, 'g-ordering-filter-back');
                out.d.reload = await catalogWith(page, app, P);
                out.d.rows = featRows();
            });
        }

        // ------------------------------------------------ place (td12: Rule 11)
        if (on('place')) {
            await step('place', async (out) => {
                const P = `${tag('u70k3')}e`;
                await must(app, 'scenarios/context', pressSpec(P));
                const M = ['K3e M1', 'K3e M2', 'K3e M3', 'K3e M4', 'K3e M5'];
                const ids = {};
                ids[M[2]] = await seedBook(app, P, 3, M[2], '2024-03-10', {featured: [{in: 'catalog', position: 1}]});
                ids[M[1]] = await seedBook(app, P, 2, M[1], '2024-02-10', {featured: [{in: 'catalog', position: 1}]});
                ids[M[0]] = await seedBook(app, P, 1, M[0], '2024-01-10', {featured: [{in: 'catalog', position: 1}]});
                ids[M[3]] = await seedBook(app, P, 4, M[3], '2024-04-10');
                ids[M[4]] = await seedBook(app, P, 5, M[4], '2024-05-10');
                note(`ccK3 place: press ${P}, books ${JSON.stringify(ids)}`);
                Object.assign(out, {P, ids});
                const featRows = () => sql(app, `select submission_id, seq from features where submission_id in (${Object.values(ids).join(',')}) order by seq, submission_id`);
                await signIn(page, `${P}mg`);
                out.p0 = await catalogWith(page, app, P);
                // "Save Order" on screen as the list stands (M1, M2, M3)
                await page.getByRole('button', {name: 'Order Features', exact: true}).click();
                await idle(page);
                const sv = page.waitForResponse((r) => /saveFeaturedOrder/.test(r.url()), {timeout: T}).catch(() => null);
                await page.getByRole('button', {name: 'Save Order', exact: true}).click();
                out.p0.save = (await sv)?.status() ?? null;
                await idle(page);
                out.p0.rows = featRows();
                // tick M4
                await openCatalog(page, app, P);
                out.p1 = {press: await press(page, M[3], FEAT_OFF)};
                out.p1.reload = await catalogWith(page, app, P);
                await snap(page, 'e-after-tick-m4');
                out.p1.rows = featRows();
                out.p1.pub = await pub.catalog(vis, app, P, 'e-pub-catalog-m4');
                // untick and tick again
                await openCatalog(page, app, P);
                out.p2 = {off: await press(page, M[3], FEAT_ON)};
                out.p2.on = await press(page, M[3], FEAT_OFF);
                out.p2.reload = await catalogWith(page, app, P);
                out.p2.rows = featRows();
                // the list made by ticks only (no Save Order since): tick M5
                await openCatalog(page, app, P);
                out.p3 = {press: await press(page, M[4], FEAT_OFF)};
                out.p3.reload = await catalogWith(page, app, P);
                out.p3.rows = featRows();
                await snap(page, 'e-after-tick-m5');
                // "Order Features" moves the new book (M5 to the end)
                await page.getByRole('button', {name: 'Order Features', exact: true}).click();
                await idle(page);
                for (let k = 0; k < 5; k++) {
                    const o = await order(page);
                    if (o[o.length - 1] === M[4]) break;
                    await item(page, M[4]).getByRole('button', {name: /Decrease position/}).click();
                    await sleep(250);
                }
                const sv2 = page.waitForResponse((r) => /saveFeaturedOrder/.test(r.url()), {timeout: T}).catch(() => null);
                await page.getByRole('button', {name: 'Save Order', exact: true}).click();
                out.p4 = {save: (await sv2)?.status() ?? null};
                await idle(page);
                out.p4.reload = await catalogWith(page, app, P);
                out.p4.rows = featRows();
            });
        }
    } finally {
        await mg.close();
        await vs.close();
    }
});
