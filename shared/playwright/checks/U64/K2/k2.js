// U64 claim check K2: the "Articles" page ("Monographs", "Preprints") —
// its fields, the date range and the Custom Range refusals, Rules 6–13,
// Settings bullet 10 ("JATS Template Plugin"), A1, A2, OMP2, OPS1.
//
// Run: PROBE_FEATURE=U64 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U64/K2/k2.js [seed]
//   `seed` forces fresh scratch contexts; without it the contexts recorded
//   in .reports/U64/ccK2/state-<app>.json are reused when present.
//   BLOCKS=arrive,range,... runs a subset (names below).
// Scratch contexts only (seed.js); publicknowledge is read, never changed.
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle} = require('../../../probe');
const {seedContexts, seedWorks, loadState, saveState} = require('./seed');

const T = 15000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000));
const BLOCKS = (process.env.BLOCKS || '').split(',').filter(Boolean);
const want = (b) => !BLOCKS.length || BLOCKS.includes(b);

// Everything the page shows that the K2 lines talk about, read from the DOM.
async function readStats(page) {
    return page.evaluate(() => {
        const q = (s, r = document) => r.querySelector(s);
        const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const tl = qa('.pkpStats__graph table tbody tr').map((tr) => [txt(tr.querySelector('th')), txt(tr.querySelector('td'))]);
        const sidebar = q('.pkpStats__sidebar');
        const sb = sidebar ? sidebar.getBoundingClientRect() : null;
        const headerBtns = qa('.pkpStats > .pkpHeader button, .pkpStats > header button').map((b) => txt(b));
        const filtersBtn = qa('button').find((b) => txt(b) === 'Filters' && !b.closest('.pkpStats__sidebar'));
        const author = q('.pkpStats__itemAuthors');
        const link = q('.pkpStats__itemLink');
        const err = q('.pkpDateRange__form .text-base-normal');
        return {
            heading: txt(q('h1')),
            range: txt(q('.pkpDateRange__current')),
            calOpen: !!q('.pkpDateRange__options'),
            calText: txt(q('.pkpDateRange__options')),
            calInputs: qa('.pkpDateRange__input').map((i) => ({value: i.value, placeholder: i.placeholder, invalid: i.getAttribute('aria-invalid')})),
            calError: txt(err),
            headerBtns,
            filtersBtn: filtersBtn ? {text: txt(filtersBtn), cls: filtersBtn.className} : null,
            sidebar: sidebar ? {cls: sidebar.className, x: Math.round(sb.x), w: Math.round(sb.width), visibleStyle: getComputedStyle(sidebar).visibility, display: getComputedStyle(sidebar).display,
                sets: qa('.pkpStats__filterSet', sidebar).map((fs) => ({heading: txt(q('h3', fs)), names: qa('.pkpFilter', fs).map((f) => ({name: txt(q('.pkpFilter__label', f)), active: q('.pkpFilter__label', f).classList.contains('-isActive'), remove: txt(q('.pkpFilter__remove', f))}))}))} : null,
            selectors: qa('.pkpStats__graphSelectors button').map((b) => ({label: txt(b), pressed: b.getAttribute('aria-pressed'), disabled: b.disabled})),
            chartShown: !!q('.pkpStats__graph'),
            caption: txt(q('.pkpStats__graph table caption')),
            tlHead: qa('.pkpStats__graph table thead th').map(txt),
            tlCount: tl.length, tlFirst: tl[0] || null, tlLast: tl[tl.length - 1] || null,
            tlSum: tl.reduce((a, [, v]) => a + (parseInt(v, 10) || 0), 0),
            tlNonZero: tl.filter(([, v]) => v !== '0').slice(0, 40),
            detailsHeading: txt(q('#publicationDetailTableLabel')),
            count: txt(q('.pkpStats__itemsOfTotal')),
            cols: qa('.pkpStats__panel table thead th').map(txt),
            sortButtons: qa('.pkpStats__panel table thead th button').map(txt),
            rows: qa('.pkpStats__panel table tbody tr').map((tr) => qa('td', tr).map(txt)),
            authorWeight: author ? getComputedStyle(author).fontWeight : null,
            titleWeight: q('.pkpStats__itemTitle') ? getComputedStyle(q('.pkpStats__itemTitle')).fontWeight : null,
            link: link ? {href: link.getAttribute('href'), target: link.getAttribute('target')} : null,
            pagination: txt(q('.pkpPagination')),
            paginationCurrent: txt(q('.pkpPagination [aria-current]')),
            dialogs: qa('[role="dialog"]').filter((d) => d.offsetParent !== null || getComputedStyle(d).position === 'fixed').map(txt),
        };
    });
}

forEachApp(async (app) => {
    const R = {app: app.name, started: new Date().toISOString(), yesterday: daysAgo(1)};
    let st = process.argv.includes('seed') ? null : loadState(app);
    if (!st) st = await seedContexts(app);
    R.state = {M: st.M.tag, E: st.E.tag, P: st.P.tag, J: st.J && st.J.tag};
    const M = st.M.tag;
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const {page, context, close} = await launch(app);
    const statReqs = [];
    page.on('request', (r) => { if (/\/api\/v1\/stats\//.test(r.url())) statReqs.push(r.url().replace(/^.*\/api\/v1\//, '')); });
    const navs = [];
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) navs.push(f.url()); });
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push({type: d.type(), message: d.message()}); if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {}); });
    let n = 0;
    const snap = async (name, extra = {}) => {
        n += 1;
        const nm = `${String(n).padStart(2, '0')}-${name}`;
        const s = await screen(page);
        const stats = await readStats(page).catch((e) => ({err: flat(e.message, 200)}));
        record(nm, {...s, stats, ...extra});
        return {name: `${nm}-${app.name}`, stats, s};
    };
    const statsURL = (ctx, sub = 'publications/publications', loc = '') => app.url(`/index.php/${ctx}/${loc ? loc + '/' : ''}stats/${sub}`);
    const arrive = async (ctx, name, sub, lc) => {
        let r = null;
        await act(async () => { r = await page.goto(statsURL(ctx, sub, lc)); });
        await page.locator('.pkpStats').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        const sn = await snap(name, {status: r && r.status()});
        return {snap: sn.name, status: r && r.status(), title: sn.s.title, ...sn.stats};
    };
    // The list's fetch is debounced: idle() right after an action returns
    // before it starts, so wait for the list's (or the chart's) response.
    const ITEMS = /\/api\/v1\/stats\/(publications|context|issues)\?/;
    const TL = /\/api\/v1\/stats\/[a-z]+\/timeline\?/;
    const act = async (fn, re = ITEMS) => {
        const w = page.waitForResponse((r) => re.test(r.url()), {timeout: 3000}).catch(() => null);
        await fn();
        const r = await w;
        await idle(page);
        return r ? r.status() : null;
    };
    const calBtn = () => page.locator('.pkpDateRange__button');
    const openCal = async () => { if (!(await page.locator('.pkpDateRange__options').count())) await calBtn().click(); await page.locator('.pkpDateRange__options').waitFor({timeout: T}); };
    const preset = async (label) => { await openCal(); await act(() => page.locator('.pkpDateRange__option', {hasText: label}).first().click()); };
    const custom = async (a, b, {enter = false} = {}) => {
        await openCal();
        const s = page.locator('.pkpDateRange__input--start');
        const e = page.locator('.pkpDateRange__input--end');
        await s.fill(a); await e.fill(b);
        const before = statReqs.length;
        const navBefore = navs.length;
        await act(() => (enter ? e.press('Enter') : page.locator('.pkpDateRange__form').getByRole('button').click()));
        return {requests: statReqs.slice(before), navigated: navs.slice(navBefore)};
    };
    const brief = (x) => ({range: x.range, calOpen: x.calOpen, calError: x.calError, selectors: x.selectors, tlCount: x.tlCount, tlFirst: x.tlFirst, tlLast: x.tlLast, tlSum: x.tlSum, count: x.count, rows: x.rows && x.rows.map((r) => r.join(' | ')), pagination: x.pagination, paginationCurrent: x.paginationCurrent});
    const dlWindow = async (name) => {
        await page.locator('.pkpStats__panel .pkpHeader button').last().click();
        const dlg = page.getByRole('dialog').last();
        await dlg.waitFor({timeout: T});
        await idle(page);
        const sn = await snap(name);
        const text = flat(sn.s.text.dialog, 1500);
        await dlg.getByRole('button', {name: /^(Close|Fermer)$/}).first().click().catch(() => {});
        await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await sleep(600);
        return {snap: sn.name, text};
    };
    const block = async (name, fn) => {
        if (!want(name)) return;
        try { R[name] = await fn(); } catch (e) { R[name] = {...(R[name] || {}), error: flat(e.stack || e.message, 900)}; console.error(app.name, name, e.message); }
        record('k2-facts', R, {merge: true});
    };

    try {
        // ---------- OMP: the press's two series are added on screen, then its works seeded
        if (isOMP && !st.M.works) {
            await signIn(page, `${M}mgr`, {contextPath: M});
            R.ompNoSeries = await arrive(M, 'omp-M-before-series');
            st.M.series = [];
            for (const [title, p] of [['Series One', `${M.slice(-4)}s1`], ['Series Two', `${M.slice(-4)}s2`]]) {
                await page.goto(app.url(`/index.php/${M}/en/management/settings/context`));
                const tab = page.getByRole('tab', {name: 'Series', exact: true}).first();
                await tab.waitFor({timeout: T}); await tab.click();
                const grid = page.locator('#seriesGridContainer');
                await grid.getByRole('link', {name: /Add Series/}).click();
                const form = page.locator('form#seriesForm');
                await form.locator('input[name^="title"]').first().waitFor({timeout: T});
                await idle(page); await sleep(400);
                await form.locator('input[name^="title"]').first().fill(title);
                await form.locator('input[name="path"]').fill(p);
                await form.getByRole('button', {name: 'Save'}).click();
                await form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
                await idle(page);
                st.M.series.push(p);
            }
            await snap('omp-M-series-grid');
            st.M.works = await seedWorks(app, M, st.M.series);
            saveState(app, st);
        }
        R.works = st.M.works;

        await signIn(page, `${M}mgr`, {contextPath: M});

        // ---------- Fields: the page on arrival (lines 49–58), Rule 6 menu, Rule 12 rows
        await block('arrive', async () => {
            const a = await arrive(M, 'M-arrive');
            const menu = await page.locator('nav').first().innerText().catch(() => null);
            const statsLinks = await page.locator('nav a[href*="/stats/"]').evaluateAll((as) => as.map((x) => ({text: x.innerText.trim(), href: x.getAttribute('href').replace(/^.*index\.php/, '')})));
            await shot(page, 'M-arrive');
            await loc(page, 'Articles: date range text', page.locator('.pkpDateRange__current'));
            await loc(page, 'Articles: calendar button', calBtn());
            await loc(page, 'Articles: Filters button', page.getByRole('button', {name: 'Filters', exact: true}));
            await loc(page, 'Articles: chart hidden table rows', page.locator('.pkpStats__graph table tbody tr'));
            await loc(page, 'Articles: "{n} of {total}" line', page.locator('.pkpStats__itemsOfTotal'));
            await loc(page, 'Articles: table rows', page.locator('.pkpStats__panel table tbody tr'));
            await loc(page, 'Articles: Total sort button', page.getByRole('button', {name: /^Total/}));
            await loc(page, 'Articles: search box', page.getByRole('searchbox', {name: 'Search by title, author and ID'}));
            // the title link opens a new tab
            let popup = null;
            try {
                const pp = context.waitForEvent('page', {timeout: T});
                await page.locator('.pkpStats__itemLink').first().click();
                const p2 = await pp; await p2.waitForLoadState('domcontentloaded').catch(() => {});
                popup = {url: p2.url().replace(/^.*index\.php/, ''), title: await p2.title().catch(() => null)};
                await p2.close();
            } catch (e) { popup = {error: flat(e.message, 200)}; }
            return {...a, menu: flat(menu, 500), statsLinks, popup};
        });

        // ---------- Rule 10: Abstracts / Files
        await block('chartType', async () => {
            await arrive(M, 'M-arrive-2');
            await page.getByRole('button', {name: isOMP ? 'Catalog Entries' : 'Abstracts', exact: true}).count();
            const files = page.locator('.pkpStats__graphSelector--timelineType button').nth(1);
            await act(() => files.click(), TL);
            const f = await snap('M-chart-files');
            await act(() => page.locator('.pkpStats__graphSelector--timelineType button').nth(0).click(), TL);
            const b = await snap('M-chart-abstracts-again');
            return {files: {snap: f.name, ...brief(f.stats), caption: f.stats.caption, tlHead: f.stats.tlHead, selectors: f.stats.selectors}, back: {snap: b.name, caption: b.stats.caption, tlSum: b.stats.tlSum}};
        });

        // ---------- Fields 80–83, Rule 7 presets, Rule 9 "All dates", Rule 10 Daily/Monthly
        await block('presets', async () => {
            const out = {};
            await arrive(M, 'M-arrive-3');
            await openCal();
            const o = await snap('M-cal-open');
            out.open = {snap: o.name, calText: o.stats.calText, calInputs: o.stats.calInputs, aria: flat(o.s.aria.main.split('group "Custom Range"')[0].split('button "Change date range"')[1], 500)};
            await loc(page, 'Date range: preset option buttons', page.locator('.pkpDateRange__option'));
            await loc(page, 'Date range: Custom Range start box', page.locator('.pkpDateRange__input--start'));
            await loc(page, 'Date range: Apply', page.locator('.pkpDateRange__form').getByRole('button', {name: 'Apply'}));
            for (const label of ['Last 90 days', 'Last 12 months', 'All dates', 'Last 30 days']) {
                const before = statReqs.length;
                await preset(label);
                const s = await snap(`M-preset-${label.replace(/\s+/g, '')}`);
                out[label] = {snap: s.name, ...brief(s.stats), requests: statReqs.slice(before)};
            }
            // the pressed one stops being available: Monthly on Last 90 days, then Last 30 days
            await preset('Last 90 days');
            await act(() => page.locator('.pkpStats__graphSelector--timelineInterval button').nth(1).click(), TL);
            const m90 = await snap('M-90-monthly');
            await preset('Last 30 days');
            const m30 = await snap('M-90-monthly-then-30');
            out.switchBack = {monthlyOn90: {snap: m90.name, selectors: m90.stats.selectors, tlCount: m90.stats.tlCount, tlFirst: m90.stats.tlFirst}, then30: {snap: m30.name, selectors: m30.stats.selectors, tlCount: m30.stats.tlCount}};
            // Last 12 months: Daily pressed? and the 12-month range start
            return out;
        });

        // ---------- Custom Range refusals (Fields 87–95), Rule 8, 8a (A2)
        await block('custom', async () => {
            const out = {};
            const y = daysAgo(1);
            const today = daysAgo(0);
            await arrive(M, 'M-arrive-4');
            const base = await readStats(page);
            const cases = [
                ['format', '2026-9-1', y],
                ['notExist', '2026-02-30', y],
                ['startAfterEnd', daysAgo(5), daysAgo(15)],
                ['beforeMin', '2000-12-31', '2001-01-10'],
                ['afterMax', daysAgo(20), today],
                ['startEmpty', '', daysAgo(11)],
                ['endEmpty', daysAgo(20), ''],
                ['bothEmpty', '', ''],
                ['endFormatAndStartEmpty', '', '2026-9-1'],
                ['span91', daysAgo(92), daysAgo(1)],
                ['start31BeforeYesterday', daysAgo(32), daysAgo(20)],
                ['start32BeforeYesterday', daysAgo(33), daysAgo(20)],
            ];
            for (const [k, a, b] of cases) {
                const r = await custom(a, b);
                const s = await snap(`M-custom-${k}`);
                out[k] = {input: [a, b], snap: s.name, calOpen: s.stats.calOpen, calError: s.stats.calError, calInputs: s.stats.calInputs, range: s.stats.range, selectors: s.stats.selectors, tlCount: s.stats.tlCount, rowsSame: JSON.stringify(s.stats.rows) === JSON.stringify(base.rows), ...r};
                if (!s.stats.calError) { await page.goto(statsURL(M)); await idle(page); }
            }
            // the message stays until the next Apply: refuse, then leave the list and reopen it
            await custom('2026-9-1', y);
            await page.locator('h1').first().click();
            await sleep(1500);
            const closed = await readStats(page);
            await openCal();
            const reopened = await snap('M-custom-reopened-after-refusal');
            out.persist = {afterLeaving: {calOpen: closed.calOpen, range: closed.range}, reopened: {snap: reopened.name, calError: reopened.stats.calError, calInputs: reopened.stats.calInputs}};
            // typing into a box after a refusal without Apply
            await page.locator('.pkpDateRange__input--start').fill(daysAgo(10));
            await sleep(500);
            out.persist.afterTyping = (await readStats(page)).calError;
            // a valid range (td3's 2025-01-01 — 2025-01-20)
            const v = await custom('2025-01-01', '2025-01-20');
            const vs = await snap('M-custom-valid-2025');
            out.valid = {snap: vs.name, ...brief(vs.stats), ...v};
            // a valid range of the last days, Enter instead of Apply
            await page.goto(statsURL(M)); await idle(page);
            const en = await custom(daysAgo(10), daysAgo(2), {enter: true});
            await sleep(1500); await idle(page);
            const es = await snap('M-custom-enter');
            out.enter = {snap: es.name, url: page.url().replace(/^.*index\.php/, ''), ...brief(es.stats), ...en};
            // valid over a range with visits, the table narrows
            await page.goto(statsURL(M)); await idle(page);
            const nr = await custom(daysAgo(3), daysAgo(2));
            const ns = await snap('M-custom-valid-narrow');
            out.narrow = {snap: ns.name, ...brief(ns.stats), ...nr};
            // the lower bound itself and yesterday itself
            await page.goto(statsURL(M)); await idle(page);
            await custom('2001-01-01', y);
            const bs = await snap('M-custom-bounds');
            out.bounds = {snap: bs.name, ...brief(bs.stats)};
            return out;
        });

        // ---------- Rule 12: sorting and the count line; pagination on P
        await block('table', async () => {
            const out = {};
            await arrive(M, 'M-arrive-5');
            const before = statReqs.length;
            await act(() => page.getByRole('button', {name: /^Total/}).click());
            const s1 = await snap('M-sort-1');
            await act(() => page.getByRole('button', {name: /^Total/}).click());
            const s2 = await snap('M-sort-2');
            await act(() => page.getByRole('button', {name: /^Total/}).click());
            const s3 = await snap('M-sort-3');
            out.sort = {first: {snap: s1.name, rows: brief(s1.stats).rows}, second: {snap: s2.name, rows: brief(s2.stats).rows}, third: {snap: s3.name, rows: brief(s3.stats).rows}, requests: statReqs.slice(before), sortButtons: s1.stats.sortButtons};
            // clicking another heading
            await act(() => page.locator('.pkpStats__panel table thead th').nth(1).click());
            out.otherHeading = brief(await readStats(page)).rows;
            // P: 31 works
            await signIn(page, `${st.P.tag}mgr`, {contextPath: st.P.tag});
            const p = await arrive(st.P.tag, 'P-arrive');
            out.P = {snap: p.snap, count: p.count, rowsN: p.rows.length, first: p.rows[0] && p.rows[0].join(' | '), last: p.rows[p.rows.length - 1] && p.rows[p.rows.length - 1].join(' | '), pagination: p.pagination};
            await loc(page, 'Articles: pagination', page.locator('.pkpPagination'));
            await act(() => page.locator('.pkpPagination').getByRole('button', {name: /2/}).first().click());
            const p2 = await snap('P-page-2');
            out.P.page2 = {snap: p2.name, count: p2.stats.count, rows: brief(p2.stats).rows, paginationCurrent: p2.stats.paginationCurrent};
            await preset('Last 90 days');
            const p3 = await snap('P-page-2-then-90days');
            out.P.afterPreset = {snap: p3.name, count: p3.stats.count, rowsN: p3.stats.rows.length, first: p3.stats.rows[0] && p3.stats.rows[0].join(' | '), paginationCurrent: p3.stats.paginationCurrent};
            // page 2 then sort
            await act(() => page.locator('.pkpPagination').getByRole('button', {name: /2/}).first().click());
            await act(() => page.getByRole('button', {name: /^Total/}).click());
            const p4 = await snap('P-page-2-then-sort');
            out.P.afterSort = {snap: p4.name, count: p4.stats.count, first: p4.stats.rows[0] && p4.stats.rows[0].join(' | '), paginationCurrent: p4.stats.paginationCurrent};
            await signIn(page, `${M}mgr`, {contextPath: M});
            return out;
        });

        // ---------- Rule 13: search (td15)
        await block('search', async () => {
            const out = {};
            await arrive(M, 'M-arrive-6');
            const box = page.getByRole('searchbox', {name: 'Search by title, author and ID'});
            const before = statReqs.length;
            await box.fill('Gamma');
            await sleep(1500); await idle(page);
            const t = await readStats(page);
            out.typedNoEnter = {rows: brief(t).rows, requests: statReqs.slice(before)};
            await act(() => box.press('Enter'));
            const g = await snap('M-search-Gamma');
            out.title = {snap: g.name, ...brief(g.stats)};
            out.title.window = await dlWindow('M-search-Gamma-window');
            await loc(page, 'Articles: Clear search phrase', page.getByRole('button', {name: 'Clear search phrase'}));
            await act(() => page.getByRole('button', {name: 'Clear search phrase'}).click());
            const c = await snap('M-search-cleared');
            out.cleared = {snap: c.name, box: await box.inputValue(), ...brief(c.stats)};
            out.cleared.window = await dlWindow('M-search-cleared-window');
            for (const [k, v] of [['author', 'Zephyr'], ['id', String(st.M.works.A.id)], ['zzzz', 'zzzz'], ['partial', 'usage']]) {
                await box.fill(v); await act(() => box.press('Enter'));
                const s = await snap(`M-search-${k}`);
                out[k] = {phrase: v, snap: s.name, ...brief(s.stats), tableText: flat(s.s.text.main.split('Details')[1], 400)};
                if (k === 'zzzz') out.zzzz.window = await dlWindow('M-search-zzzz-window');
            }
            return out;
        });

        // ---------- Rule 11: filters (td14)
        await block('filters', async () => {
            const out = {};
            const a = await arrive(M, 'M-arrive-7');
            out.arrive = {filtersBtn: a.filtersBtn, sidebar: a.sidebar};
            if (!a.filtersBtn) return out;
            await page.getByRole('button', {name: 'Filters', exact: true}).click(); await idle(page); await sleep(500);
            const o = await snap('M-filters-open');
            await shot(page, 'M-filters-open');
            out.open = {snap: o.name, sidebar: o.stats.sidebar, filtersBtn: o.stats.filtersBtn};
            const sets = o.stats.sidebar.sets;
            const nameOf = (i, j) => sets[i] && sets[i].names[j] && sets[i].names[j].name;
            const sb = page.locator('.pkpStats__sidebar');
            const press = async (nm) => act(() => sb.locator('.pkpFilter__label', {hasText: nm}).first().click());
            // one name
            await press(nameOf(0, 0));
            const f1 = await snap('M-filter-1');
            out.one = {name: nameOf(0, 0), snap: f1.name, ...brief(f1.stats), sets: f1.stats.sidebar.sets};
            out.one.window = await dlWindow('M-filter-1-window');
            if (nameOf(0, 1)) {
                await press(nameOf(0, 1));
                const f2 = await snap('M-filter-2');
                out.two = {names: [nameOf(0, 0), nameOf(0, 1)], snap: f2.name, ...brief(f2.stats)};
                out.two.window = await dlWindow('M-filter-2-window');
                // its ×
                const rm = sb.getByRole('button', {name: `Clear filter: ${nameOf(0, 1)}`});
                await loc(page, 'Filters: a chosen name\'s ×', rm);
                await act(() => rm.click());
                const f3 = await snap('M-filter-x');
                out.x = {snap: f3.name, ...brief(f3.stats), sets: f3.stats.sidebar.sets};
            }
            if (sets[1] && sets[1].names.length) {
                const last = sets[1].names[sets[1].names.length - 1].name;
                await press(last);
                const f4 = await snap('M-filter-two-headings');
                out.twoHeadings = {names: [nameOf(0, 0), last], snap: f4.name, ...brief(f4.stats)};
                out.twoHeadings.window = await dlWindow('M-filter-two-headings-window');
                await press(last);
            }
            // the name pressed again
            await press(nameOf(0, 0));
            const f5 = await snap('M-filter-name-again');
            out.again = {snap: f5.name, ...brief(f5.stats), sets: f5.stats.sidebar.sets};
            // choose one, then "Filters" again
            await press(nameOf(0, 0));
            await act(() => page.getByRole('button', {name: 'Filters', exact: true}).click());
            const f6 = await snap('M-filters-closed');
            out.closed = {snap: f6.name, ...brief(f6.stats), sidebar: f6.stats.sidebar, filtersBtn: f6.stats.filtersBtn};
            out.closed.window = await dlWindow('M-filters-closed-window');
            await page.getByRole('button', {name: 'Filters', exact: true}).click(); await idle(page); await sleep(500);
            out.reopened = (await readStats(page)).sidebar;
            return out;
        });

        // ---------- Rule 11 across contexts: publicknowledge (read-only), E, and per app
        await block('filterContexts', async () => {
            const out = {};
            await signIn(page, 'manager.maya', {contextPath: 'publicknowledge'});
            const pk = await arrive('publicknowledge', 'pk-arrive');
            out.publicknowledge = {snap: pk.snap, heading: pk.heading, filtersBtn: pk.filtersBtn, sets: pk.sidebar && pk.sidebar.sets, count: pk.count, selectors: pk.selectors};
            await signIn(page, `${st.E.tag}mgr`, {contextPath: st.E.tag});
            const e = await arrive(st.E.tag, 'E-arrive');
            out.E = {snap: e.snap, filtersBtn: e.filtersBtn, sets: e.sidebar && e.sidebar.sets, count: e.count, rows: e.rows, chartShown: e.chartShown};
            await signIn(page, `${M}mgr`, {contextPath: M});
            return out;
        });

        // ---------- A1 / Rule 9 (td1): "All dates" on a context with nothing published
        await block('allDatesEmpty', async () => {
            const out = {};
            await signIn(page, `${st.E.tag}mgr`, {contextPath: st.E.tag});
            await arrive(st.E.tag, 'E-arrive-2');
            const before = statReqs.length;
            const rec0 = Date.now();
            await preset('All dates');
            await sleep(800); await idle(page);
            const s = await snap('E-alldates');
            await shot(page, 'E-alldates');
            const vis = page.locator('[role="dialog"]:visible');
            out.E = {snap: s.name, dialogCount: await vis.count(), dialog: flat(s.s.text.dialog, 400), ...brief(s.stats), tableText: flat((s.s.text.main || '').split('Details')[1], 300), requests: statReqs.slice(before), took: Date.now() - rec0};
            if (out.E.dialogCount) {
                await loc(page, 'Articles: the "Error" window after "All dates"', vis.last());
                await vis.last().getByRole('button').first().click().catch(() => {});
                await sleep(800);
                out.E.afterClose = {dialogCount: await page.locator('[role="dialog"]:visible').count(), ...brief(await readStats(page))};
            }
            // control: Journal page All dates on E
            await arrive(st.E.tag, 'E-context-arrive', 'context/context');
            await preset('All dates'); await sleep(800); await idle(page);
            const c = await snap('E-context-alldates');
            out.Econtext = {snap: c.name, dialogCount: await page.locator('[role="dialog"]:visible').count(), range: c.stats.range, tlFirst: c.stats.tlFirst, tlCount: c.stats.tlCount};
            // publicknowledge (read-only)
            await signIn(page, 'manager.maya', {contextPath: 'publicknowledge'});
            await arrive('publicknowledge', 'pk-arrive-2');
            await preset('All dates'); await sleep(800); await idle(page);
            const p = await snap('pk-alldates');
            out.publicknowledge = {snap: p.name, dialogCount: await page.locator('[role="dialog"]:visible').count(), dialog: flat(p.s.text.dialog, 300), ...brief(p.stats)};
            await signIn(page, `${M}mgr`, {contextPath: M});
            return out;
        });

        // ---------- Rule 7 / 9 / 10 on "Journal" (and "Issues" on OJS)
        await block('otherPages', async () => {
            const out = {};
            const pages = [['context', 'context/context']];
            if (isOJS) pages.push(['issues', 'issues/issues']);
            for (const [k, sub] of pages) {
                const a = await arrive(M, `M-${k}-arrive`, sub);
                const o = {arrive: {snap: a.snap, heading: a.heading, range: a.range, selectors: a.selectors, tlCount: a.tlCount, tlFirst: a.tlFirst, tlLast: a.tlLast}};
                await openCal();
                o.presets = (await readStats(page)).calText;
                for (const label of ['Last 12 months', 'All dates']) {
                    await preset(label);
                    const s = await snap(`M-${k}-${label.replace(/\s+/g, '')}`);
                    o[label] = {snap: s.name, range: s.stats.range, selectors: s.stats.selectors, tlCount: s.stats.tlCount, tlFirst: s.stats.tlFirst, tlLast: s.stats.tlLast};
                }
                out[k] = o;
            }
            // other pages with the same control: Editorial Activity
            await page.goto(app.url(`/index.php/${M}/stats/editorial/editorial`)); await idle(page);
            await openCal().catch(() => {});
            const ed = await snap('M-editorial-cal');
            out.editorial = {snap: ed.name, range: ed.stats.range, calText: ed.stats.calText};
            return out;
        });

        // ---------- Rule 13's last sentence: the "Issues" search {OJS}
        if (isOJS) {
            await block('issueSearch', async () => {
                const out = {};
                if (!st.I) {
                    const i = `${M}i`.slice(0, 32);
                    const res = await app.api.createContext({tag: i, users: [{username: `${i}mgr`, roles: ['manager']}],
                        issues: [
                            {volume: 7, number: '3', year: 2020, published: true, usage: [{daysAgo: 1, views: 3}]},
                            {volume: 8, number: '4', year: 2021, published: true, usage: [{daysAgo: 2, views: 1}]},
                        ]});
                    st.I = {tag: i, issues: res.issues};
                    saveState(app, st);
                }
                const I = st.I.tag;
                await signIn(page, `${I}mgr`, {contextPath: I});
                // give issue 7/3 a title on screen (Issues › Back Issues › Edit)
                if (!st.I.titled) {
                    await page.goto(app.url(`/index.php/${I}/manageIssues`)); await idle(page);
                    await page.getByRole('tab', {name: 'Back Issues'}).or(page.getByRole('link', {name: 'Back Issues', exact: true})).first().click();
                    await idle(page);
                    const link = page.getByRole('link', {name: 'Vol. 7 No. 3 (2020)', exact: true}).filter({visible: true}).first();
                    await link.waitFor({timeout: T});
                    await link.click();
                    await page.getByRole('tab', {name: 'Issue Data'}).first().click();
                    const form = page.locator('form#issueForm:visible').last();
                    await form.waitFor({timeout: T}); await idle(page); await sleep(800);
                    const showTitle = form.locator('input[name="showTitle"]');
                    if (await showTitle.count() && !(await showTitle.isChecked())) await showTitle.check();
                    await form.locator('input[name^="title"]').first().fill('Winter Special');
                    await form.getByRole('button', {name: 'Save'}).click();
                    await sleep(1500); await idle(page);
                    await snap('I-issue-titled');
                    st.I.titled = true; saveState(app, st);
                }
                const a = await arrive(I, 'I-issues-arrive', 'issues/issues');
                out.arrive = {snap: a.snap, count: a.count, rows: a.rows.map((r) => r.join(' | ')), cols: a.cols};
                const box = page.getByRole('searchbox').first();
                out.boxName = await box.getAttribute('aria-label').catch(() => null) || flat(await page.locator('.pkpStats__panel thead th').first().innerText(), 100);
                for (const [k, v] of [['title', 'Winter'], ['volume', '7'], ['number', '4'], ['year', '2021'], ['ident', 'Vol. 8'], ['numberNo', 'No. 4'], ['volNo', 'Vol. 7 No. 3'], ['full', 'Vol. 8 No. 4 (2021)']]) {
                    await box.fill(v); await act(() => box.press('Enter'));
                    const s = await snap(`I-issues-search-${k}`);
                    out[k] = {phrase: v, snap: s.name, count: s.stats.count, rows: s.stats.rows.map((r) => r.join(' | '))};
                }
                await signIn(page, `${M}mgr`, {contextPath: M});
                return out;
            });
        }

        // ---------- Settings bullet 10: "JATS Template Plugin" {OJS}; JATS column elsewhere
        if (isOJS) {
            await block('jats', async () => {
                const out = {};
                const J = st.J.tag;
                await signIn(page, `${J}mgr`, {contextPath: J});
                const pluginRow = page.locator('tr.gridRow[id$="-row-jatstemplateplugin"]').first();
                const plugins = async () => {
                    await page.goto(app.url(`/index.php/${J}/management/settings/website`)); await idle(page);
                    await page.locator('#plugins-button').first().click(); await idle(page);
                    await pluginRow.waitFor({timeout: T});
                    return pluginRow.getByRole('checkbox').first();
                };
                const download = async (name) => {
                    await page.locator('.pkpStats__panel .pkpHeader button').last().click();
                    const dlg = page.getByRole('dialog').last();
                    await dlg.waitFor({timeout: T}); await idle(page);
                    const dl = page.waitForEvent('download', {timeout: T});
                    await dlg.getByRole('button', {name: /^Download (Articles|Monographs|Preprints)$/}).click();
                    const d = await dl;
                    const p = require('path').join(require('../../../probe').outDir(), `${name}-${app.name}.csv`);
                    await d.saveAs(p);
                    await dlg.getByRole('button', {name: /Close/}).first().click().catch(() => {});
                    await sleep(700);
                    return {file: require('path').basename(p), suggested: d.suggestedFilename(), csv: require('fs').readFileSync(p, 'utf8').slice(0, 800)};
                };
                let box = await plugins();
                out.onAtStart = await box.isChecked();
                if (!out.onAtStart) { await box.click(); await sleep(1500); await idle(page); }
                const on = await arrive(J, 'J-arrive-plugin-on');
                out.on = {snap: on.snap, cols: on.cols, rows: on.rows.map((r) => r.join(' | ')), count: on.count};
                out.on.csv = await download('J-articles-plugin-on');
                box = await plugins();
                await box.click({noWaitAfter: true}); await sleep(900);
                const dlg = page.locator('[role="dialog"]:visible').last();
                if (await dlg.count()) { out.ask = flat(await dlg.innerText(), 300); await dlg.getByRole('button', {name: /^(OK|Yes)$/}).first().click().catch(() => {}); }
                await sleep(1500); await idle(page);
                out.offChecked = await box.isChecked().catch(() => null);
                const off = await arrive(J, 'J-arrive-plugin-off');
                out.off = {snap: off.snap, cols: off.cols, rows: off.rows.map((r) => r.join(' | ')), count: off.count};
                out.off.csv = await download('J-articles-plugin-off');
                box = await plugins();
                await box.click(); await sleep(1500); await idle(page);
                out.restored = await box.isChecked().catch(() => null);
                const back = await arrive(J, 'J-arrive-plugin-on-again');
                out.onAgain = {snap: back.snap, cols: back.cols, rows: back.rows.map((r) => r.join(' | ')), count: back.count};
                await signIn(page, `${M}mgr`, {contextPath: M});
                return out;
            });
        }

        // ---------- every level: sub-editor and site admin on the page
        await block('levels', async () => {
            const out = {};
            for (const u of [`${M}sed`, 'admin']) {
                await signIn(page, u, {contextPath: M});
                const a = await arrive(M, `M-arrive-${u === 'admin' ? 'admin' : 'sed'}`);
                out[u === 'admin' ? 'admin' : 'sectionEditor'] = {snap: a.snap, status: a.status, heading: a.heading, range: a.range, filtersBtn: !!a.filtersBtn, selectors: a.selectors, count: a.count, rows: a.rows.map((r) => r.join(' | ')), cols: a.cols};
            }
            await signIn(page, `${M}mgr`, {contextPath: M});
            return out;
        });

        // ---------- leaving the page with a changed range; reload
        await block('leave', async () => {
            await arrive(M, 'M-arrive-8');
            await preset('Last 90 days');
            const d0 = dialogs.length;
            await page.reload(); await idle(page);
            const r = await snap('M-reload-after-90');
            await preset('Last 12 months');
            await page.goto(app.url(`/index.php/${M}/dashboard/editorial`)).catch(() => {});
            await idle(page);
            await page.goBack().catch(() => {}); await idle(page);
            const b = await snap('M-back-after-12m');
            return {reload: {snap: r.name, range: r.stats.range}, back: {snap: b.name, range: b.stats.range}, dialogs: dialogs.slice(d0)};
        });

        // ---------- td8: the French interface
        await block('french', async () => {
            const out = {};
            for (const [k, sub] of [['articles', 'publications/publications'], ['context', 'context/context']]) {
                const a = await arrive(M, `M-fr-${k}`, sub, 'fr_CA');
                const w = await dlWindow(`M-fr-${k}-window`).catch((e) => ({error: flat(e.message, 200)}));
                await openCal().catch(() => {});
                const c = await readStats(page);
                const main = (await screen(page)).text.main || '';
                out[k] = {snap: a.snap, title: a.title, heading: a.heading, detailsHeading: a.detailsHeading, count: a.count, cols: a.cols, selectors: a.selectors.map((s) => s.label), calText: c.calText, window: w.text,
                    raw: Array.from(new Set(((main + ' ' + (w.text || '') + ' ' + a.title).match(/##[^#]+##/g) || []))), emptyish: {title: a.title, count: a.count, caption: a.caption}};
            }
            return out;
        });
    } catch (e) {
        R.fatal = flat(e.stack || e.message, 1500);
    } finally {
        R.dialogs = dialogs;
        R.statRequests = statReqs.length;
        record('k2-facts', R, {merge: true});
        await close();
    }
});
