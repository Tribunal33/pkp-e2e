// U70 "Catalog management" claim check, chunk K2: the Catalog page's list
// (fields, Rules 1-5), Settings 1-3 and 5, register A3. OMP drives the
// screens; OJS and OPS get the read-only absence controls (phase X).
//
// Run (all phases, or K2_PHASE=A,B,... for some):
//   PROBE_FEATURE=U70 PROBE_AGENT=ccK2 node bin/probe.js omp shared/playwright/checks/U70/K2/k2.js
//   PROBE_FEATURE=U70 PROBE_AGENT=ccK2 K2_PHASE=X node bin/probe.js all shared/playwright/checks/U70/K2/k2.js
// Phases (each seeds its own scratch presses, tag prefix u70k2):
//   A  the page, its rows, what the list holds (td4), 30 per page
//   B  order (Rule 2, Settings 1), filters (Rule 3, td5), order with a filter (Rule 4, A3, td6)
//   C  search (Rule 5, td7)
//   D  Settings 1-3, 5 on a new press; unsaved leave on the Setup tab
//   E  a filter pressed while ordering (the Filters column opened first)
//   F  the rows' titles in the page's language (a bilingual press)
//   G  A3's staff order beside the readers' category, series and catalog pages
//   X  OJS / OPS read-only controls (no Catalog page, no catalog settings)
// Outputs: .reports/U70/ccK2/ (snapshots <name>-<app>.json, shots, facts-<app>.json).
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const PHASES = (process.env.K2_PHASE || 'A,B,C,D,E,F,G,X').split(',').map((s) => s.trim().toUpperCase());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30_000;

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

forEachApp(async (app) => {
    const REPO = path.join(__dirname, '../../../../..');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('facts', {[k]: v}, {merge: true}); };
    const {page, close} = await launch(app);
    const snap = async (name) => { const s = await screen(page); record(name, s); await shot(page, name); return s; };
    const guard = async (label, fn) => {
        try { return await fn(); } catch (e) { fact(`ERROR ${label}`, String(e.stack || e).slice(0, 800)); console.error(`[k2] ${label}: ${e}`); return null; }
    };
    const apiLog = [];
    page.on('response', (r) => {
        const u = r.url();
        if (/\/api\/v1\//.test(u) && !/_test\//.test(u)) apiLog.push({m: r.request().method(), s: r.status(), u: u.replace(/^.*\/index\.php/, '')});
    });

    // ---------------------------------------------------------------- helpers
    const catalogUrl = (p) => app.url(`/index.php/${p}/manageCatalog`);
    const openCatalog = async (p) => {
        await page.goto(catalogUrl(p));
        await idle(page);
        await page.locator('.listPanel--catalog').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    };
    const rows = () => page.locator('.listPanel__item--catalog').evaluateAll((els) => els.map((e) => ({
        num: (e.querySelector('.listPanel__item--catalog__id') || {}).innerText?.trim(),
        authors: (e.querySelector('.listPanel__itemTitle') || {}).innerText?.trim(),
        title: (e.querySelector('.listPanel__itemSubtitle') || {}).innerText?.trim(),
        links: [...e.querySelectorAll('a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})),
        boxes: [...e.querySelectorAll('button .-screenReader')].map((s) => s.innerText.trim()),
        visible: e.offsetParent !== null,
    })));
    const titles = async () => (await rows()).filter((r) => r.visible).map((r) => r.title);
    const headings = () => page.locator('.listPanel--catalog__heading').evaluateAll((els) => els.map((e) => ({text: e.innerText.trim(), visible: e.offsetParent !== null})));
    const headerControls = () => page.locator('.listPanel--catalog .pkpHeader__actions').first().evaluate((el) => [...el.querySelectorAll('button, input')].map((b) => ({
        tag: b.tagName, text: (b.innerText || b.getAttribute('placeholder') || '').trim(), visible: b.offsetParent !== null,
    })));
    const listGet = () => page.waitForResponse((r) => /\/_submissions\?/.test(r.url()) && r.request().method() === 'GET', {timeout: T});
    const openFilters = async () => {
        if (!(await page.locator('.pkpFilter__label').first().isVisible().catch(() => false))) {
            await page.getByRole('button', {name: 'Filters', exact: true}).click();
            await page.locator('.listPanel__sidebar, .pkpFilter__label').first().waitFor({timeout: T}).catch(() => {});
        }
    };
    const filterLabel = (label) => page.locator('button.pkpFilter__label').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)});
    const pressFilter = async (label) => {
        await openFilters();
        const got = listGet();
        await filterLabel(label).click();
        const r = await got;
        await idle(page);
        await sleep(300);
        return decodeURIComponent(r.url().replace(/^.*\?/, ''));
    };
    const sidebar = () => page.evaluate(() => {
        const side = document.querySelector('.listPanel__sidebar');
        if (!side) return null;
        return {visible: side.offsetParent !== null, text: side.innerText, filters: [...side.querySelectorAll('.pkpFilter__label')].map((b) => ({text: b.innerText.trim(), active: b.classList.contains('-isActive')})), groups: [...side.querySelectorAll('h4')].map((h) => h.innerText.trim())};
    });
    const search = async (text) => {
        const box = page.locator('.listPanel--catalog input.pkpSearch__input');
        await box.fill(text);
        const got = listGet();
        await box.press('Enter');
        const r = await got;
        await idle(page);
        await sleep(300);
        return decodeURIComponent(r.url().replace(/^.*\?/, ''));
    };
    const pagination = () => page.evaluate(() => {
        const p = document.querySelector('.listPanel--catalog .pkpPagination');
        return p ? {text: p.innerText.replace(/\s+/g, ' ').trim(), buttons: [...p.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') || b.innerText.trim())} : null;
    });
    const empty = () => page.locator('.listPanel--catalog .listPanel__empty').evaluateAll((els) => els.map((e) => e.innerText.trim()));
    const pressCtx = async (p, extra = {}) => must(app, 'scenarios/context', {
        tag: p,
        context: {name: {en: `K2 ${p}`}},
        users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author']}, ...(extra.users || [])],
        ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== 'users')),
    });
    const book = (p, n, title, extra = {}) => must(app, 'scenarios/submission', {tag: `${p}b${n}`, context: p, submitter: `${p}au`, title, published: true, ...extra});
    const pageData = (p) => page.evaluate(() => {
        const s = window.pkp?.registry?._instances?.app?.components?.catalog || window.pkp?.registry?._instances?.app?.$data?.components?.catalog;
        return s ? {getParams: s.getParams, catalogSortBy: s.catalogSortBy, catalogSortDir: s.catalogSortDir, filters: (s.filters || []).map((g) => ({heading: g.heading, f: g.filters.map((f) => [f.title, f.sortBy, f.sortDir])}))} : null;
    });

    if (PHASES.includes('X')) {
        // ------------------------------------------------------------ X: controls (OMP is the positive control)
        await signIn(page, 'manager.maya');
        await guard('X catalog address', async () => {
            const resp = await page.goto(app.url('/index.php/publicknowledge/manageCatalog'));
            await idle(page);
            fact('X.catalogStatus', resp && resp.status());
            await snap('x-manageCatalog');
        });
        await guard('X appearance setup', async () => {
            const {WebsiteSettings} = require(path.join(REPO, 'shared/playwright/pages/AppearancePages.js'));
            const s = new WebsiteSettings(page, 'publicknowledge', {thumbnailField: {ojs: 'journalThumbnail', omp: 'pressThumbnail', ops: 'serverThumbnail'}[app.name]});
            await page.goto(app.url('/index.php/publicknowledge/management/settings/website'));
            await idle(page);
            await s.openSideTab('appearance-setup');
            await idle(page);
            await snap('x-appearance-setup');
            const panel = s.panel('appearance-setup');
            fact('X.setupLabels', await panel.locator('legend, label.pkpFormFieldLabel, .pkpFormField__heading').allInnerTexts());
            fact('X.setupHasCatalogSort', await panel.locator('input[name="catalogSortOption"]').count());
            fact('X.setupHasFeaturedBooks', await panel.locator('input[name="displayFeaturedBooks"], input[name="displayNewReleases"]').count());
        });
        await guard('X side menu', async () => {
            await page.goto(app.url('/index.php/publicknowledge/submissions'));
            await idle(page);
            // the side menu's closed groups are display:none: count the links in the DOM
            fact('X.sideMenuCatalogLinks', await page.locator('a').filter({hasText: /^\s*Catalog\s*$/}).evaluateAll((els) => els.map((a) => a.getAttribute('href'))));
        });
    }
    if (app.name !== 'omp') {
        await close();
        return;
    }

    try {
        // ============================================================ A
        if (PHASES.includes('A')) {
            const P1 = tag('u70k2');
            await pressCtx(P1);
            fact('A.P1', P1);
            await signIn(page, `${P1}mg`);
            // A1 empty press
            await guard('A empty', async () => {
                await openCatalog(P1);
                await snap('a1-empty');
                fact('A1.empty', await empty());
                fact('A1.headerControls', await headerControls());
                fact('A1.headings', await headings());
                fact('A1.tabs', await page.getByRole('tab').allInnerTexts());
                fact('A1.h1', await page.locator('main h1, h1.app__pageHeading').allInnerTexts());
                fact('A1.listTitle', await page.locator('.listPanel--catalog .pkpHeader h2').allInnerTexts());
                // Filters column with no category and no series
                await page.getByRole('button', {name: 'Filters', exact: true}).click();
                await sleep(400);
                fact('A1.sidebarNoGroups', await sidebar());
                await snap('a1-empty-filters');
                await page.getByRole('button', {name: 'Filters', exact: true}).click();
                await sleep(400);
                fact('A1.sidebarAfterSecondPress', await sidebar());
            });
            // A2 membership (td4)
            const pub = await book(P1, 1, 'Published Harbour Book', {datePublished: '2024-02-01'});
            const sched = await book(P1, 2, 'Scheduled Book', {datePublished: '2030-01-01', decisions: ['skipExternalReview', 'sendToProduction']});
            const unpub = await post(app, 'scenarios/submission', {tag: `${P1}b3`, context: P1, submitter: `${P1}au`, title: 'Unpublished Production Book', decisions: ['skipExternalReview', 'sendToProduction']});
            const nonfinal = await book(P1, 4, 'Non Final Book', {decisions: ['skipExternalReview', 'sendToProduction']});
            fact('A2.ids', {pub: pub.submissionId, sched: sched.submissionId, unpub: unpub.status === 200 ? unpub.json.submissionId : unpub, nonfinal: nonfinal.submissionId, nonfinalPub: nonfinal.publicationId});
            await guard('A membership before non-final', async () => {
                await openCatalog(P1);
                await snap('a2-membership');
                fact('A2.rows', await rows());
                fact('A2.headerControls', await headerControls());
                fact('A2.headings', await headings());
            });
            // Make "Non Final Book" hold only a published non-final version:
            // Create New Version as "Author Original", publish it, unpublish the Version of Record.
            await guard('A non-final version', async () => {
                const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
                const wf = new WorkflowPage(page, P1);
                await page.goto(app.url(`/index.php/${P1}/dashboard/editorial?workflowSubmissionId=${nonfinal.submissionId}`));
                await idle(page);
                const item = await wf.revealPublicationEntry('Create New Version');
                await wf.expectVersionLoaded();
                await item.click();
                const dlg = page.getByRole('dialog', {name: 'Create New Version'});
                await dlg.getByLabel('Publication Stage').waitFor({timeout: T});
                await dlg.getByLabel('Publication Stage').selectOption({label: 'Author Original (AO)'});
                const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
                const cr = await created;
                const newId = (await cr.json()).id;
                fact('A2.aoPublicationId', newId);
                await idle(page);
                await page.goto(app.url(`/index.php/${P1}/dashboard/editorial?workflowSubmissionId=${nonfinal.submissionId}&workflowMenuKey=publication_${newId}_titleAbstract`));
                await idle(page);
                await page.getByRole('button', {name: 'Publish', exact: true}).click();
                const modal = page.getByRole('dialog', {name: /Schedule For Publication/});
                await modal.waitFor({timeout: T});
                await idle(page);
                const pubResp = page.waitForResponse((r) => r.url().includes('/publish'), {timeout: T});
                await modal.getByRole('button', {name: 'Publish', exact: true}).click();
                fact('A2.aoPublish', (await pubResp).status());
                await idle(page);
                await page.goto(app.url(`/index.php/${P1}/dashboard/editorial?workflowSubmissionId=${nonfinal.submissionId}&workflowMenuKey=publication_${nonfinal.publicationId}_titleAbstract`));
                await idle(page);
                await page.getByRole('button', {name: 'Unpublish', exact: true}).click();
                const ud = page.getByRole('dialog', {name: 'Unpublish'});
                await ud.waitFor({timeout: T});
                const un = page.waitForResponse((r) => r.url().includes('/unpublish'), {timeout: T});
                await ud.getByRole('button', {name: 'Unpublish', exact: true}).click();
                fact('A2.vorUnpublish', (await un).status());
                await idle(page);
                await snap('a2-nonfinal-workflow');
                fact('A2.versionLinks', await page.getByRole('link', {name: /^(Version of Record|Author Original|Unassigned)/}).allInnerTexts());
            });
            await guard('A membership after non-final', async () => {
                await openCatalog(P1);
                await snap('a2-membership-after');
                fact('A2.rowsAfter', await rows());
            });
            // A3 row parts, links
            await guard('A row parts', async () => {
                await openCatalog(P1);
                const row = page.locator('.listPanel__item--catalog').filter({hasText: 'Published Harbour Book'});
                await loc(page, 'Catalog page: a row by its title', row);
                await loc(page, 'Catalog page: row "View Submission"', row.getByRole('link', {name: 'View Submission', exact: true}));
                await loc(page, 'Catalog page: row "View Entry"', row.getByRole('link', {name: 'View Entry', exact: true}));
                await loc(page, 'Catalog page: row Featured box (by screen-reader text)', row.getByRole('button', {name: /monograph is not featured/}));
                await loc(page, 'Catalog page: row New release box', row.getByRole('button', {name: /not a new release/}));
                await loc(page, 'Catalog page: Search box', page.locator('.listPanel--catalog input.pkpSearch__input'));
                await loc(page, 'Catalog page: Filters button', page.getByRole('button', {name: 'Filters', exact: true}));
                await loc(page, 'Catalog page: Add Entry button', page.getByRole('button', {name: 'Add Entry', exact: true}));
                fact('A3.rowAria', await row.ariaSnapshot());
                fact('A3.buttonNames', await row.getByRole('button').evaluateAll((els) => els.map((b) => b.innerText.trim())));
                await row.getByRole('link', {name: 'View Submission', exact: true}).click();
                await page.waitForLoadState('domcontentloaded');
                await idle(page);
                fact('A3.viewSubmissionUrl', page.url().replace(/^.*\/index\.php/, ''));
                await snap('a3-view-submission');
                await openCatalog(P1);
                await page.locator('.listPanel__item--catalog').filter({hasText: 'Published Harbour Book'}).getByRole('link', {name: 'View Entry', exact: true}).click();
                await page.waitForLoadState('domcontentloaded');
                await idle(page);
                fact('A3.viewEntryUrl', page.url().replace(/^.*\/index\.php/, ''));
                fact('A3.viewEntryTitle', await page.title());
                await snap('a3-view-entry');
            });
            // A4 the admin on the same page (a second level for the sweep)
            await guard('A admin', async () => {
                await signIn(page, 'admin');
                await openCatalog(P1);
                await snap('a4-admin');
                fact('A4.adminRows', (await rows()).map((r) => r.title));
                fact('A4.adminHeader', await headerControls());
                await signIn(page, `${P1}mg`);
            });
            // A5 30 per page (both ends: 30 books, then 31)
            const P2 = tag('u70k2');
            await pressCtx(P2);
            fact('A.P2', P2);
            for (let i = 1; i <= 30; i++) {
                await book(P2, i, `Paged Book ${String(i).padStart(2, '0')}`, {datePublished: `2023-01-${String(i).padStart(2, '0')}`});
            }
            await signIn(page, `${P2}mg`);
            await guard('A 30 books', async () => {
                await openCatalog(P2);
                await snap('a5-30');
                fact('A5.count30', (await rows()).length);
                fact('A5.pagination30', await pagination());
            });
            await book(P2, 31, 'Paged Book 31', {datePublished: '2023-02-01'});
            await guard('A 31 books', async () => {
                await openCatalog(P2);
                await snap('a5-31');
                const r = await rows();
                fact('A5.count31', r.length);
                fact('A5.first31', r.slice(0, 2).map((x) => x.title));
                fact('A5.last31', r.slice(-2).map((x) => x.title));
                fact('A5.pagination31', await pagination());
                await loc(page, 'Catalog page: pagination nav', page.locator('.listPanel--catalog .pkpPagination'));
                const got = listGet();
                await page.locator('.listPanel--catalog .pkpPagination').getByRole('button', {name: /2/}).first().click();
                const resp = await got;
                await idle(page);
                fact('A5.page2Get', decodeURIComponent(resp.url().replace(/^.*\?/, '')));
                await snap('a5-31-page2');
                fact('A5.page2', (await rows()).map((x) => x.title));
                fact('A5.pagination31p2', await pagination());
            });
        }

        // ============================================================ B
        if (PHASES.includes('B')) {
            const P3 = tag('u70k2');
            await pressCtx(P3, {
                categories: [{path: 'science', title: 'Science', children: [{path: 'physics', title: 'Physics'}]}, {path: 'arts', title: 'Arts'}],
                series: [{path: 'hist', title: 'History'}],
            });
            fact('B.P3', P3);
            // dates: date DESC = Epsilon, Delta, Alpha, Gamma, Beta, Zeta, Eta
            await book(P3, 1, 'Alpha', {datePublished: '2024-03-01', categories: ['science'], series: 'hist'});
            await book(P3, 2, 'Beta', {datePublished: '2024-01-01', categories: ['science'], series: 'hist'});
            await book(P3, 3, 'Gamma', {datePublished: '2024-02-01', categories: ['science'], series: 'hist'});
            await book(P3, 4, 'Delta', {datePublished: '2024-04-01', featured: [{in: 'catalog', position: 1}], newRelease: [{in: 'catalog'}]});
            await book(P3, 5, 'Epsilon', {datePublished: '2024-05-01', featured: [{in: 'catalog', position: 1}]});
            await book(P3, 6, 'Zeta', {datePublished: '2023-12-01', categories: ['arts'], featured: [{in: 'category', path: 'arts'}]});
            await book(P3, 7, 'Eta', {datePublished: '2023-11-01', categories: ['physics']});
            await signIn(page, `${P3}mg`);
            await guard('B default order', async () => {
                await openCatalog(P3);
                await snap('b1-default');
                fact('B1.order', await titles());
                fact('B1.rows', await rows());
                fact('B1.headings', await headings());
                fact('B1.headerControls', await headerControls());
                fact('B1.pageData', await pageData());
            });
            // Filters (td5)
            await guard('B filters', async () => {
                await openCatalog(P3);
                await openFilters();
                await sleep(300);
                fact('B2.sidebar', await sidebar());
                await snap('b2-filters');
                await loc(page, 'Catalog page: a filter entry', filterLabel('Science'));
                fact('B2.getScience', await pressFilter('Science'));
                await snap('b2-science');
                fact('B2.scienceOrder', await titles());
                fact('B2.scienceHeadings', await headings());
                fact('B2.scienceHeader', await headerControls());
                fact('B2.scienceSidebar', await sidebar());
                fact('B2.scienceRows', await rows());
                fact('B2.getPhysics', await pressFilter('Physics'));
                fact('B2.physicsOrder', await titles());
                fact('B2.getArts', await pressFilter('Arts'));
                await snap('b2-arts');
                fact('B2.artsOrder', await titles());
                fact('B2.artsSidebar', await sidebar());
                fact('B2.artsHeader', await headerControls());
                fact('B2.artsRows', await rows());
                fact('B2.getArtsAgain', await pressFilter('Arts'));
                await snap('b2-arts-again');
                fact('B2.afterRemoveOrder', await titles());
                fact('B2.afterRemoveHeadings', await headings());
                fact('B2.afterRemoveSidebar', await sidebar());
                fact('B2.getHistory', await pressFilter('History'));
                await snap('b2-history');
                fact('B2.historyOrder', await titles());
                fact('B2.historyHeadings', await headings());
                fact('B2.historyHeader', await headerControls());
                // the filter's own remove cross
                const cross = page.locator('.pkpFilter__remove');
                fact('B2.removeCrossName', await cross.evaluateAll((els) => els.map((e) => e.innerText.trim())));
                const got = listGet();
                await cross.first().click();
                fact('B2.getCross', decodeURIComponent((await got).url().replace(/^.*\?/, '')));
                await idle(page);
                fact('B2.afterCrossOrder', await titles());
                // "Filters" pressed again closes the column; does the filter stay?
                await pressFilter('Science');
                await page.getByRole('button', {name: 'Filters', exact: true}).click();
                await sleep(400);
                fact('B2.columnClosedWithFilter', {sidebar: await sidebar(), order: await titles(), headings: await headings()});
                await snap('b2-column-closed');
            });
            // Order with a filter (td6): Science on "Publication date (newest first)" (default), then "Title (A-Z)", then "Publication date (oldest first)"
            const {CategoriesTab} = require(path.join(REPO, 'shared/playwright/pages/CategoriesPages.js'));
            const {SectionsTab} = require(path.join(REPO, 'shared/playwright/pages/SectionsPages.js'));
            const setCategoryOrder = async (name, label) => {
                const tab = new CategoriesTab(page, P3);
                await tab.goto();
                const win = await tab.openEdit(name);
                fact(`B3.categoryOrderBefore.${label}`, await win.orderChosen());
                fact('B3.categoryOrderOptions', await win.orderSelect().locator('option').allInnerTexts());
                fact('B3.categoryOrderLabel', await win.label('Order of').innerText().catch(() => null));
                await win.orderSelect().selectOption({label});
                await win.save();
                await idle(page);
            };
            const setSeriesOrder = async (name, label) => {
                const tab = new SectionsTab(page, P3, {tab: 'Series', addLabel: 'Add Series'});
                await tab.goto();
                const win = await tab.openEdit(name);
                fact(`B3.seriesOrderBefore.${label}`, await win.selectedOption('sortOption').innerText());
                fact('B3.seriesOrderOptions', await win.select('sortOption').locator('option').allInnerTexts());
                await win.select('sortOption').selectOption({label});
                await win.save();
                await idle(page);
            };
            await guard('B science default', async () => {
                await openCatalog(P3);
                fact('B3.scienceDefaultGet', await pressFilter('Science'));
                fact('B3.scienceDefault', await titles());
                await snap('b3-science-default');
            });
            await guard('B science A-Z', async () => {
                await setCategoryOrder('Science', 'Title (A-Z)');
                await openCatalog(P3);
                fact('B3.scienceAZGet', await pressFilter('Science'));
                fact('B3.scienceAZ', await titles());
                await snap('b3-science-az');
            });
            await guard('B science Z-A', async () => {
                await setCategoryOrder('Science', 'Title (Z-A)');
                await openCatalog(P3);
                fact('B3.scienceZAGet', await pressFilter('Science'));
                fact('B3.scienceZA', await titles());
            });
            await guard('B science oldest', async () => {
                await setCategoryOrder('Science', 'Publication date (oldest first)');
                await openCatalog(P3);
                fact('B3.scienceOldestGet', await pressFilter('Science'));
                fact('B3.scienceOldest', await titles());
                await snap('b3-science-oldest');
            });
            await guard('B series default', async () => {
                await openCatalog(P3);
                fact('B3.historyDefaultGet', await pressFilter('History'));
                fact('B3.historyDefault', await titles());
                await snap('b3-history-default');
            });
            await guard('B series newest', async () => {
                await setSeriesOrder('History', 'Publication date (newest first)');
                await openCatalog(P3);
                fact('B3.historyNewestGet', await pressFilter('History'));
                fact('B3.historyNewest', await titles());
            });
            await guard('B series position', async () => {
                await setSeriesOrder('History', 'Series position (lowest first)');
                await openCatalog(P3);
                fact('B3.historyPosLowGet', await pressFilter('History'));
                fact('B3.historyPosLow', await titles());
            });
            // Press "Order of monographs" = Title (A-Z), set on screen (Settings 1)
            await guard('B press A-Z', async () => {
                const {WebsiteSettings} = require(path.join(REPO, 'shared/playwright/pages/AppearancePages.js'));
                const site = new WebsiteSettings(page, P3, {thumbnailField: 'pressThumbnail'});
                await site.goto();
                await site.openSideTab('appearance-setup');
                const setup = site.panel('appearance-setup');
                fact('B4.sortBefore', await setup.locator('input[name="catalogSortOption"]').evaluateAll((els) => els.map((e) => ({v: e.value, checked: e.checked}))));
                await setup.getByRole('radio', {name: 'Title (A-Z)', exact: true}).check();
                const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET');
                await setup.getByRole('button', {name: 'Save', exact: true}).click();
                fact('B4.save', (await saved).status());
                await idle(page);
                await openCatalog(P3);
                await snap('b4-press-az');
                fact('B4.pressAZ', await titles());
                fact('B4.pageData', await pageData());
                // search with no filter ever chosen keeps the press order?
                fact('B4.searchGet', await search('a'));
                fact('B4.searchOrder', await titles());
                await page.getByRole('button', {name: 'Clear search'}).click();
                await listGet().catch(() => {});
                await idle(page);
                fact('B4.clearedOrder', await titles());
                // choose Science then remove it
                fact('B4.scienceGet', await pressFilter('Science'));
                fact('B4.scienceOrder', await titles());
                fact('B4.removeGet', await pressFilter('Science'));
                await snap('b4-after-remove');
                fact('B4.afterRemove', await titles());
                await page.reload();
                await idle(page);
                await page.locator('.listPanel__item--catalog').first().waitFor({timeout: T});
                fact('B4.afterReload', await titles());
            });
            // Press "Order of monographs" = Publication date (oldest first): page opens in it, filter removal loses it
            await guard('B press oldest', async () => {
                const {WebsiteSettings} = require(path.join(REPO, 'shared/playwright/pages/AppearancePages.js'));
                const site = new WebsiteSettings(page, P3, {thumbnailField: 'pressThumbnail'});
                await site.goto();
                await site.openSideTab('appearance-setup');
                const setup = site.panel('appearance-setup');
                await setup.getByRole('radio', {name: 'Publication date (oldest first)', exact: true}).check();
                const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET');
                await setup.getByRole('button', {name: 'Save', exact: true}).click();
                fact('B5.save', (await saved).status());
                await idle(page);
                await openCatalog(P3);
                fact('B5.pressOldest', await titles());
                await snap('b5-press-oldest');
                // page 2 not reachable here; "Physics" chosen and removed
                await pressFilter('Physics');
                fact('B5.removeGet', await pressFilter('Physics'));
                fact('B5.afterRemove', await titles());
                await snap('b5-after-remove');
            });
            // Unsaved leave: start ordering, move a book, leave the page
            await guard('B ordering leave', async () => {
                await openCatalog(P3);
                const dialogs = [];
                const onDialog = async (d) => { dialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); };
                page.on('dialog', onDialog);
                await page.getByRole('button', {name: 'Order Features', exact: true}).click();
                await sleep(300);
                fact('B6.orderingHeader', await headerControls());
                fact('B6.orderingSidebar', await sidebar());
                fact('B6.orderingVisible', await titles());
                await snap('b6-ordering');
                await page.locator('.listPanel__item--catalog').filter({hasText: 'Delta'}).getByRole('button', {name: /Increase position/}).click();
                await sleep(300);
                fact('B6.movedOrder', await titles());
                await page.goto(app.url(`/index.php/${P3}/submissions`));
                await idle(page);
                fact('B6.leaveUrl', page.url().replace(/^.*\/index\.php/, ''));
                fact('B6.dialogs', dialogs);
                await openCatalog(P3);
                fact('B6.orderAfterReturn', await titles());
                page.off('dialog', onDialog);
            });
        }

        // ============================================================ E
        // "Filters" while ordering: the column opened before "Order Features".
        if (PHASES.includes('E')) {
            const P7 = tag('u70k2');
            await pressCtx(P7, {categories: [{path: 'arts', title: 'Arts'}]});
            fact('E.P7', P7);
            await book(P7, 1, 'Orderable One', {datePublished: '2024-01-01', categories: ['arts'], featured: [{in: 'catalog', position: 1}]});
            await book(P7, 2, 'Orderable Two', {datePublished: '2024-02-01', categories: ['arts'], featured: [{in: 'catalog', position: 1}]});
            await book(P7, 3, 'Plain Three', {datePublished: '2024-03-01', categories: ['arts']});
            await signIn(page, `${P7}mg`);
            await guard('E ordering with the column open', async () => {
                await openCatalog(P7);
                await openFilters();
                await page.getByRole('button', {name: 'Order Features', exact: true}).click();
                await sleep(400);
                fact('E1.header', await headerControls());
                fact('E1.sidebar', await sidebar());
                fact('E1.visible', await titles());
                await snap('e1-ordering-column-open');
                await page.locator('.listPanel__item--catalog').filter({hasText: 'Orderable One'}).getByRole('button', {name: /Increase position/}).click();
                await sleep(300);
                fact('E1.moved', await titles());
                const got = listGet();
                await filterLabel('Arts').click();
                const r = await got.catch(() => null);
                await idle(page);
                await sleep(300);
                fact('E1.filterDuringOrderingGet', r && decodeURIComponent(r.url().replace(/^.*\?/, '')));
                fact('E1.afterFilterHeader', await headerControls());
                fact('E1.afterFilterVisible', await titles());
                fact('E1.afterFilterHeadings', await headings());
                fact('E1.afterFilterNotice', await page.locator('.listPanel--catalog .pkpNotification, .listPanel--catalog [role="status"]').allInnerTexts().catch(() => []));
                await snap('e1-filter-during-ordering');
                // the way out: the active filter pressed again
                const got2 = listGet();
                await filterLabel('Arts').click();
                const r2 = await got2.catch(() => null);
                await idle(page);
                await sleep(300);
                fact('E1.removeGet', r2 && decodeURIComponent(r2.url().replace(/^.*\?/, '')));
                fact('E1.afterRemoveHeader', await headerControls());
                fact('E1.afterRemoveVisible', await titles());
                fact('E1.afterRemoveNotice', await page.locator('.listPanel--catalog .pkpNotification').allInnerTexts().catch(() => []));
                await snap('e1-after-remove-during-ordering');
                // reload: what order was kept?
                await openCatalog(P7);
                fact('E1.afterReload', await titles());
            });
        }

        // ============================================================ F
        // "in the page's language": a bilingual press, one book titled in both languages, one in English only.
        if (PHASES.includes('F')) {
            const P8 = tag('u70k2');
            await pressCtx(P8, {context: {name: {en: `K2 ${P8}`}, supportedLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']}});
            fact('F.P8', P8);
            await book(P8, 1, {en: 'Both Languages Book', fr_CA: 'Livre en deux langues'}, {datePublished: '2024-02-01'});
            await book(P8, 2, 'English Only Book', {datePublished: '2024-01-01'});
            await signIn(page, `${P8}mg`);
            await guard('F locale', async () => {
                await page.goto(app.url(`/index.php/${P8}/en/manageCatalog`));
                await idle(page);
                await page.locator('.listPanel__item--catalog').first().waitFor({timeout: T});
                fact('F1.en', await titles());
                await snap('f1-en');
                await page.goto(app.url(`/index.php/${P8}/fr_CA/manageCatalog`));
                await idle(page);
                await page.locator('.listPanel__item--catalog').first().waitFor({timeout: T});
                fact('F1.fr', await titles());
                fact('F1.frHeader', await headerControls());
                fact('F1.frHeadings', await headings());
                await snap('f1-fr');
                // a search in French keeps the page's language
                fact('F1.frSearchGet', await search('Livre'));
                fact('F1.frSearch', await titles());
            });
        }

        // ============================================================ G
        // A3's "different order than readers": the staff's filtered lists beside the public category, series and catalog pages.
        if (PHASES.includes('G')) {
            const P9 = tag('u70k2');
            await pressCtx(P9, {categories: [{path: 'science', title: 'Science'}], series: [{path: 'hist', title: 'History'}], catalogSortOption: 'title-ASC'});
            fact('G.P9', P9);
            await book(P9, 1, 'Alpha', {datePublished: '2024-03-01', categories: ['science'], series: 'hist'});
            await book(P9, 2, 'Beta', {datePublished: '2024-01-01', categories: ['science'], series: 'hist'});
            await book(P9, 3, 'Gamma', {datePublished: '2024-02-01', categories: ['science'], series: 'hist'});
            await signIn(page, `${P9}mg`);
            const {CategoriesTab} = require(path.join(REPO, 'shared/playwright/pages/CategoriesPages.js'));
            const publicOrder = async (p) => {
                await page.goto(app.url(`/index.php/${P9}/${p}`));
                await idle(page);
                return page.locator('.obj_monograph_summary .title').allInnerTexts();
            };
            await guard('G staff vs readers', async () => {
                const tab = new CategoriesTab(page, P9);
                await tab.goto();
                const win = await tab.openEdit('Science');
                await win.orderSelect().selectOption({label: 'Title (A-Z)'});
                await win.save();
                await idle(page);
                await openCatalog(P9);
                fact('G1.staffFirstLoad', await titles());
                await pressFilter('Science');
                fact('G1.staffScience', await titles());
                await pressFilter('History');
                fact('G1.staffHistory', await titles());
                await pressFilter('History');
                fact('G1.staffAfterRemove', await titles());
                await snap('g1-staff-after-remove');
                fact('G1.readerCatalog', await publicOrder('catalog'));
                fact('G1.readerSeries', await publicOrder('catalog/series/hist'));
                let cat = await publicOrder('catalog/category/science');
                if (!cat.length) {
                    // the category page lists a book after the queued jobs have run (U16 Rule 8)
                    const {execFileSync} = require('child_process');
                    try { execFileSync('php', ['lib/pkp/tools/jobs.php', 'work', '--stop-when-empty'], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 180_000}); } catch (e) { fact('G1.jobsError', String(e).slice(0, 300)); }
                    cat = await publicOrder('catalog/category/science');
                    fact('G1.jobsRun', true);
                }
                fact('G1.readerCategory', cat);
                await snap('g1-reader-category');
            });
        }

        // ============================================================ C
        if (PHASES.includes('C')) {
            const P5 = tag('u70k2');
            await pressCtx(P5, {
                categories: [{path: 'sea', title: 'Sea'}, {path: 'land', title: 'Land'}],
                users: [{username: `${P5}nr`, roles: ['author'], givenName: 'Nova', familyName: 'Reed'}],
            });
            fact('C.P5', P5);
            const h = await must(app, 'scenarios/submission', {tag: `${P5}b1`, context: P5, submitter: `${P5}nr`, title: 'Harbour Currents', published: true, datePublished: '2024-01-01', categories: ['sea']});
            const t2 = await book(P5, 2, 'Tidal Patterns', {datePublished: '2024-02-01', abstract: 'A study of coralline shelves.', categories: ['land']});
            fact('C.ids', {harbour: h.submissionId, tidal: t2.submissionId});
            await signIn(page, `${P5}mg`);
            await guard('C search', async () => {
                await openCatalog(P5);
                fact('C1.start', await rows());
                fact('C1.harbourGet', await search('Harbour'));
                await snap('c1-harbour');
                fact('C1.harbour', await titles());
                fact('C1.clearButton', await page.getByRole('button', {name: 'Clear search'}).count());
                await loc(page, 'Catalog page: Search clear cross', page.getByRole('button', {name: 'Clear search'}));
                const got = listGet();
                await page.getByRole('button', {name: 'Clear search'}).click();
                fact('C1.clearGet', decodeURIComponent((await got).url().replace(/^.*\?/, '')));
                await idle(page);
                await snap('c1-cleared');
                fact('C1.cleared', await titles());
                fact('C1.boxAfterClear', await page.locator('.listPanel--catalog input.pkpSearch__input').inputValue());
                fact('C1.reedGet', await search('Reed'));
                fact('C1.reed', await titles());
                fact('C1.novaGet', await search('nova'));
                fact('C1.nova', await titles());
                fact('C1.numberGet', await search(String(t2.submissionId)));
                await snap('c1-number');
                fact('C1.number', await titles());
                fact('C1.abstractGet', await search('coralline'));
                fact('C1.abstract', await titles());
                fact('C1.twoWordsGet', await search('Harbour Tidal'));
                fact('C1.twoWords', await titles());
                fact('C1.twoWordsEmpty', await empty());
                fact('C1.bothWordsGet', await search('Harbour Currents'));
                fact('C1.bothWords', await titles());
                fact('C1.partialGet', await search('arbou'));
                fact('C1.partial', await titles());
                // typed, not submitted
                const box = page.locator('.listPanel--catalog input.pkpSearch__input');
                await box.fill('');
                await box.fill('Tidal');
                await sleep(1500);
                fact('C1.typedNoEnter', await titles());
                // backspace to empty + Enter
                await box.fill('');
                const g2 = listGet();
                await box.press('Enter');
                fact('C1.emptyEnterGet', decodeURIComponent((await g2).url().replace(/^.*\?/, '')));
                await idle(page);
                fact('C1.emptyEnter', await titles());
            });
            await guard('C search with filter', async () => {
                await openCatalog(P5);
                await search('Harbour');
                fact('C2.searchThenSeaGet', await pressFilter('Sea'));
                fact('C2.searchThenSea', await titles());
                fact('C2.boxWithSea', await page.locator('.listPanel--catalog input.pkpSearch__input').inputValue());
                await snap('c2-search-then-sea');
                fact('C2.searchThenLandGet', await pressFilter('Land'));
                fact('C2.searchThenLand', await titles());
                fact('C2.searchThenLandEmpty', await empty());
                await snap('c2-search-then-land');
                fact('C2.removeLandGet', await pressFilter('Land'));
                fact('C2.afterRemove', await titles());
                // filter first, then search
                await openCatalog(P5);
                await pressFilter('Land');
                fact('C2.landThenTidalGet', await search('Tidal'));
                fact('C2.landThenTidal', await titles());
                fact('C2.landThenHarbourGet', await search('Harbour'));
                fact('C2.landThenHarbour', await titles());
            });
        }

        // ============================================================ D
        if (PHASES.includes('D')) {
            const P6 = tag('u70k2');
            await pressCtx(P6);
            fact('D.P6', P6);
            await book(P6, 1, 'Settings Book One', {datePublished: '2024-01-01'});
            await book(P6, 2, 'Settings Book Two', {datePublished: '2024-02-01'});
            await signIn(page, `${P6}mg`);
            const {WebsiteSettings} = require(path.join(REPO, 'shared/playwright/pages/AppearancePages.js'));
            await guard('D setup tab', async () => {
                const site = new WebsiteSettings(page, P6, {thumbnailField: 'pressThumbnail'});
                await site.goto();
                await site.openSideTab('appearance-setup');
                await idle(page);
                await snap('d1-setup');
                const setup = site.panel('appearance-setup');
                fact('D1.sortRadios', await setup.locator('input[name="catalogSortOption"]').evaluateAll((els) => els.map((e) => ({v: e.value, checked: e.checked, label: (e.closest('label') || {}).innerText?.trim()}))));
                fact('D1.sortFieldText', await setup.locator('fieldset').filter({has: page.locator('input[name="catalogSortOption"]')}).first().innerText().catch(() => null));
                fact('D1.flagBoxes', await setup.locator('input[name="displayFeaturedBooks"], input[name="displayNewReleases"]').evaluateAll((els) => els.map((e) => ({n: e.name, checked: e.checked, label: (e.closest('label') || {}).innerText?.trim()}))));
                fact('D1.flagFieldText', await setup.locator('fieldset').filter({has: page.locator('input[name="displayFeaturedBooks"]')}).first().innerText().catch(() => null));
                await loc(page, 'Website › Appearance › Setup: "Order of monographs" radio', setup.getByRole('radio', {name: 'Title (A-Z)', exact: true}));
            });
            await guard('D catalog before flags', async () => {
                await openCatalog(P6);
                const s = await snap('d2-catalog-before');
                fact('D2.before', {rows: await rows(), header: await headerControls(), headings: await headings(), main: s.text && s.text.main});
            });
            await guard('D tick Featured Books / New Releases', async () => {
                const site = new WebsiteSettings(page, P6, {thumbnailField: 'pressThumbnail'});
                await site.goto();
                await site.openSideTab('appearance-setup');
                const setup = site.panel('appearance-setup');
                for (const n of ['displayFeaturedBooks', 'displayNewReleases']) await setup.locator(`input[name="${n}"]`).check();
                const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET');
                await setup.getByRole('button', {name: 'Save', exact: true}).click();
                fact('D3.save', (await saved).status());
                await idle(page);
                await site.goto();
                await site.openSideTab('appearance-setup');
                fact('D3.reopen', await site.panel('appearance-setup').locator('input[name="displayFeaturedBooks"], input[name="displayNewReleases"]').evaluateAll((els) => els.map((e) => ({n: e.name, checked: e.checked}))));
                await openCatalog(P6);
                const s = await snap('d3-catalog-after');
                fact('D3.after', {rows: await rows(), header: await headerControls(), headings: await headings(), main: s.text && s.text.main});
            });
            // Settings 2, 3: a new category's and a new series' "Order of monographs"
            await guard('D new category window', async () => {
                const {CategoriesTab} = require(path.join(REPO, 'shared/playwright/pages/CategoriesPages.js'));
                const tab = new CategoriesTab(page, P6);
                await tab.goto();
                const win = await tab.openAdd();
                await idle(page);
                await snap('d4-add-category');
                fact('D4.categoryOrderChosen', await win.orderChosen());
                fact('D4.categoryOrderOptions', await win.orderSelect().locator('option').allInnerTexts());
                fact('D4.categoryOrderField', await win.orderSelect().evaluate((el) => (el.closest('.pkpFormField') || el.parentElement).innerText));
                await loc(page, 'Add Category window: "Order of monographs" list', win.orderSelect());
            });
            await guard('D new series window', async () => {
                const {SectionsTab} = require(path.join(REPO, 'shared/playwright/pages/SectionsPages.js'));
                const tab = new SectionsTab(page, P6, {tab: 'Series', addLabel: 'Add Series'});
                await tab.goto();
                const win = await tab.openAdd();
                await snap('d5-add-series');
                fact('D5.seriesOrderChosen', await win.selectedOption('sortOption').innerText());
                fact('D5.seriesOrderOptions', await win.select('sortOption').locator('option').allInnerTexts());
                fact('D5.seriesOrderField', await win.select('sortOption').evaluate((el) => (el.closest('.section, fieldset, div') || el.parentElement).innerText));
                await loc(page, 'Add Series window: "Order of monographs" list', win.select('sortOption'));
            });
            // Unsaved leave: change the radio on Setup, leave to another tab, then the page
            await guard('D unsaved setup leave', async () => {
                const dialogs = [];
                const onDialog = async (d) => { dialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); };
                page.on('dialog', onDialog);
                const site = new WebsiteSettings(page, P6, {thumbnailField: 'pressThumbnail'});
                await site.goto();
                await site.openSideTab('appearance-setup');
                const setup = site.panel('appearance-setup');
                await setup.getByRole('radio', {name: 'Title (Z-A)', exact: true}).check();
                await site.openSideTab('theme').catch(() => {});
                await sleep(500);
                fact('D6.afterSideTab', {dialogs: [...dialogs], url: page.url().replace(/^.*\/index\.php/, '')});
                await snap('d6-left-tab');
                await site.openSideTab('appearance-setup');
                fact('D6.radioBackOnTab', await site.panel('appearance-setup').locator('input[name="catalogSortOption"]').evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value)));
                await openCatalog(P6);
                fact('D6.afterLeave', {dialogs: [...dialogs], order: await titles()});
                await site.goto();
                await site.openSideTab('appearance-setup');
                fact('D6.radioAfterReturn', await site.panel('appearance-setup').locator('input[name="catalogSortOption"]').evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.value)));
                page.off('dialog', onDialog);
            });
        }
    } finally {
        record('api', apiLog);
        await close();
    }
});
