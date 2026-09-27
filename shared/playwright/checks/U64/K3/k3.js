// U64 claim check K3: the "Journal" ("Press", "Server") and "Issues" {OJS}
// Statistics pages, every "Download" window and the downloaded spreadsheets
// (spec body 60–79, 98–121, Rules 14–18 at 291–314).
//
// Seeds its own scratch context per app (usage figures through the
// `usage[]` keys, scenarios.md), signs in as the scratch manager, the
// scratch section editor and `admin`, and records every screen with
// screen(). Rule 18 changes the site's Geographical level through
// `POST site` and puts back the install value in a `finally`. td9 is also
// driven as written, read-only, on `publicknowledge` as manager.maya.
//
// Run: PROBE_FEATURE=U64 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U64/K3/k3.js
// (ONLY=ojs etc. narrows; PHASES=seed,journal,issues,articles,geo,se,td9 picks steps)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const PHASES = (process.env.PHASES || 'journal,issues,articles,geo,se,td9').split(',');
const N_ARTICLES = 31;
const N_ISSUES = 31;

const FILES = {
    ojs: {rich: {galleys: [{label: 'PDF', file: 'article.pdf'}, {label: 'HTML', file: 'article.html'}, {label: 'Data', file: 'notes.md', genre: 'Data Set'}]},
        plain: {galleys: [{label: 'PDF', file: 'article.pdf'}]}},
    omp: {rich: {publicationFormats: [{name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript'}, {name: 'HTML', file: 'article.html', genre: 'Book Manuscript'}, {name: 'Other', file: 'notes.md'}]},
        plain: {publicationFormats: [{name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript'}]}},
    ops: {rich: {galleys: [{label: 'PDF', file: 'preprint.pdf'}, {label: 'HTML', file: 'preprint.html'}, {label: 'Data', file: 'not-an-image.txt', genre: 'Data Set'}]},
        plain: {galleys: [{label: 'PDF', file: 'preprint.pdf'}]}},
};
const SECOND_SECTION = {ojs: {abbrev: 'REV', title: 'Reviews'}, ops: {abbrev: 'NOTE', title: 'Notes'}};
const FIRST_SECTION = {ojs: {abbrev: 'ART', title: 'Articles'}, ops: {abbrev: 'PRE', title: 'Preprints'}};

const facts = {};
function fact(key, value) {
    facts[key] = value;
    console.log(`[fact] ${key}: ${JSON.stringify(value).slice(0, 600)}`);
}

async function step(name, fn) {
    try {
        return await fn();
    } catch (e) {
        fact(`ERR ${name}`, String(e && e.message || e).split('\n').slice(0, 3).join(' | '));
        return null;
    }
}

async function snap(page, name) {
    const s = await screen(page);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

/** Seed the scratch context: context visits, OJS issues with visits, articles with visits. */
async function seed(app) {
    const T = tag('u64k3');
    const ctx = {
        tag: T,
        context: {name: {en: `K3 Journal ${T}`}},
        users: [
            {username: `${T}mgr`, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
            {username: `${T}se`, givenName: 'Sid', familyName: 'Section', roles: ['sectionEditor']},
            {username: `${T}au`, givenName: 'Ada', familyName: 'Author', roles: ['author']},
            {username: `${T}rd`, givenName: 'Rex', familyName: 'Reader', roles: ['reader']},
        ],
        usage: [{daysAgo: 1, views: 3}, {daysAgo: 10, views: 2}, {daysAgo: 45, views: 4}, {daysAgo: 400, views: 1}],
    };
    if (SECOND_SECTION[app.name]) ctx.sections = [FIRST_SECTION[app.name], SECOND_SECTION[app.name]];
    if (app.name === 'ojs') {
        ctx.issues = [];
        for (let i = 1; i <= N_ISSUES; i++) {
            const e = {volume: 1, number: String(i), year: 2020, published: true, usage: [{daysAgo: 2, views: i}]};
            if (i === 1) {
                e.galleys = [{label: 'Issue PDF', file: 'article.pdf'}];
                e.usage = [{daysAgo: 2, views: 1, galleyDownloads: [40]}];
            }
            ctx.issues.push(e);
        }
        ctx.issues.push({volume: 2, number: '1', year: 2021, published: true, usage: [{daysAgo: 60, views: 100}]});
        ctx.issues.push({volume: 2, number: '2', year: 2021, published: true});
        ctx.issues.push({volume: 3, number: '1', year: 2022, published: false});
    }
    const t0 = Date.now();
    const c = await app.api.createContext(ctx);
    const subs = [];
    const base = (i) => ({
        tag: `${T}s${i}`, context: T, submitter: `${T}au`, published: true,
        ...(app.name === 'ojs' ? {issue: {volume: 1, number: '1', year: 2020}} : {}),
    });
    // The rich one: second section, three files, JATS on OJS.
    const rich = {
        ...base(0), title: 'K3 "Quoted", Rich Work', ...FILES[app.name].rich,
        ...(SECOND_SECTION[app.name] ? {section: SECOND_SECTION[app.name].abbrev} : {}),
        ...(app.name === 'ojs' ? {jats: {file: 'article.xml', makePublic: true}} : {}),
        usage: [{daysAgo: 3, abstractViews: 50, fileViews: [4, 2, 1], ...(app.name === 'ojs' ? {jatsViews: 1} : {})},
            {daysAgo: 50, abstractViews: 7}],
    };
    subs.push(await app.api.createSubmission(rich));
    for (let i = 1; i <= N_ARTICLES; i++) {
        subs.push(await app.api.createSubmission({...base(i), title: `K3 Work ${String(i).padStart(2, '0')}`, ...FILES[app.name].plain,
            usage: [{daysAgo: 3, abstractViews: i, fileViews: [1]}]}));
    }
    const out = {T, path: c.path || T, contextId: c.contextId, issues: (c.issues || []).map((x) => ({id: x.id, volume: x.volume, number: x.number, year: x.year, published: x.published})),
        subs: subs.map((s) => ({id: s.submissionId, galleys: (s.galleys || s.publicationFormats || []).map((g) => g.id)})), seconds: Math.round((Date.now() - t0) / 1000)};
    record('seed', out, {merge: true});
    return out;
}

function statsURL(app, ctxPath, route) {
    return app.url(`/index.php/${ctxPath}/en/stats/${route}`);
}

async function goStats(page, app, ctxPath, route) {
    const got = page.waitForResponse((r) => /\/api\/v1\/stats\//.test(r.url()) && r.request().method() === 'GET', {timeout: 20_000}).catch(() => null);
    const resp = await page.goto(statsURL(app, ctxPath, route));
    await got;
    await idle(page);
    return resp;
}

async function mainTable(page) {
    return page.locator('.pkpStats__panel table').first();
}

async function tableRead(page) {
    const t = await mainTable(page);
    return t.evaluate((tbl) => ({
        head: [...tbl.querySelectorAll('thead th')].map((th) => th.innerText.replace(/\s+/g, ' ').trim()),
        rows: [...tbl.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((td) => td.innerText.replace(/\s+/g, ' ').trim())),
        links: [...tbl.querySelectorAll('tbody a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href'), target: a.getAttribute('target')})),
    })).catch((e) => ({err: e.message}));
}

async function rangeText(page) {
    return page.locator('.pkpDateRange__current').first().innerText().catch(() => null);
}

/** Choose a preset of the date range, waiting for the refetch. */
async function chooseRange(page, label) {
    await page.locator('.pkpDateRange__button').first().click();
    const opts = await page.locator('.pkpDateRange__option').allInnerTexts();
    const got = page.waitForResponse((r) => /\/api\/v1\/stats\//.test(r.url()), {timeout: 15_000}).catch(() => null);
    await page.locator('.pkpDateRange__option', {hasText: label}).first().click();
    await got;
    await idle(page);
    return opts;
}

async function tooltipRead(page, locator) {
    await locator.hover();
    // floating-vue shows the tip after its hover delay; the icon's aria-describedby names it.
    const tip = page.locator('.v-popper__popper--shown .v-popper__inner').last();
    await tip.waitFor({state: 'visible', timeout: 5000}).catch(() => {});
    const text = await tip.innerText().catch(() => null);
    const info = await locator.evaluate((el) => ({tag: el.tagName, role: el.getAttribute('role'), tabindex: el.getAttribute('tabindex'), sr: el.innerText.trim()})).catch(() => null);
    await page.mouse.move(0, 0);
    return {text, info};
}

async function sideNav(page) {
    // The side menu's every entry is in the DOM (closed groups hidden), so read textContent of each link.
    return page.locator('nav a, nav [role="menuitem"], .p-panelmenu a').evaluateAll((as) => as.map((a) => `${a.textContent.trim()} -> ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}`).filter((t) => /stats|Statistic/i.test(t))).catch(() => null);
}

async function openDownload(page, name) {
    await page.getByRole('button', {name: 'Download Report', exact: true}).click();
    const dlg = page.getByRole('dialog').filter({hasText: 'Download a CSV'});
    await dlg.waitFor({state: 'visible', timeout: 10_000});
    await idle(page);
    const s = await snap(page, name);
    const panels = await dlg.locator('.pkpStats__reportAction').evaluateAll((ps) => ps.map((p) => ({
        heading: (p.querySelector('h2') || {}).innerText,
        line: (p.querySelector('p') || {}).innerText,
        buttons: [...p.querySelectorAll('button')].map((b) => b.innerText.trim()),
        tooltip: [...p.querySelectorAll('.tooltipButton')].map((t) => t.innerText.trim()),
    })));
    const params = await dlg.locator('table tr').evaluateAll((trs) => trs.map((tr) => [...tr.children].map((c) => c.innerText.trim())));
    const title = await dlg.locator('h2, h1').first().innerText().catch(() => null);
    return {dlg, s, panels, params, title, text: s.text.dialog};
}

/** Press a report button in the open Download window: the file, the request, whether the window closed. */
async function pressDownload(page, dlg, buttonName) {
    const reqP = page.waitForResponse((r) => /\/api\/v1\/stats\//.test(r.url()) && /text\/csv/.test(r.request().headers().accept || ''), {timeout: 30_000}).catch(() => null);
    const dlP = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
    const clickedAt = new Date().toISOString();
    await dlg.getByRole('button', {name: buttonName, exact: true}).click();
    const resp = await reqP;
    const dl = await dlP;
    let content = null;
    let name = null;
    if (dl) {
        name = dl.suggestedFilename();
        const p = await dl.path().catch(() => null);
        if (p) {
            content = fs.readFileSync(p, 'utf8');
            // Keep the file itself (bytes matter: a byte-order mark, the encoding).
            const keep = path.join(outDir(), `dl-${process.env.PKP_APP_NAME || 'x'}-${name.replace(/[^A-Za-z0-9_.-]+/g, '_')}`);
            fs.copyFileSync(p, keep);
        }
    }
    const closed = await dlg.waitFor({state: 'hidden', timeout: 5000}).then(() => true).catch(() => false);
    // The modal store keeps a closed side window's slot for 450 ms (patterns.md pitfall 4).
    await page.waitForTimeout(600);
    const lines = content == null ? null : content.split('\n');
    return {
        clickedAt, name, closed,
        request: resp ? {url: resp.url().replace(/^https?:\/\/[^/]+/, ''), status: resp.status(), disposition: resp.headers()['content-disposition'] || null, type: resp.headers()['content-type']} : null,
        lineCount: lines ? lines.filter((l) => l.length).length : null,
        head: lines ? lines.slice(0, 8) : null,
        tail: lines ? lines.slice(-3) : null,
    };
}

async function closeDownload(page, dlg) {
    const btn = dlg.getByRole('button', {name: /Close/}).first();
    await btn.click().catch(() => {});
    await dlg.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
    await page.waitForTimeout(600);
}

async function chartButtons(page) {
    return page.locator('.pkpStats__graphSelectors button').evaluateAll((bs) => bs.map((b) => ({text: b.innerText.trim(), pressed: b.getAttribute('aria-pressed'), disabled: b.disabled})));
}

async function pressChart(page, label) {
    const got = page.waitForResponse((r) => /\/timeline/.test(r.url()), {timeout: 10_000}).catch(() => null);
    await page.locator('.pkpStats__graphSelectors button', {hasText: label}).first().click();
    const r = await got;
    await idle(page);
    return r ? r.url().replace(/^https?:\/\/[^/]+/, '') : null;
}

// ---------------------------------------------------------------------------
// The "Journal" page

async function journalPage(app, page, S, who, prefix) {
    const R = {};
    const resp = await goStats(page, app, S.path, 'context/context');
    R.status = resp && resp.status();
    const s = await snap(page, `${prefix}-journal-landing`);
    R.title = s.title;
    R.h1 = await page.locator('main h1').first().innerText().catch(() => null);
    R.range = await rangeText(page);
    R.chart = await chartButtons(page);
    R.chartShown = await page.locator('.pkpStats__graph canvas').count();
    R.h2 = await page.locator('#contextDetailTableLabel').innerText().catch(() => null);
    R.tooltip = await step('journal tooltip', () => tooltipRead(page, page.locator('#contextDetailTableLabel .tooltipButton')));
    R.table = await tableRead(page);
    R.downloadBtnInHeader = await page.locator('.pkpStats__panel .pkpHeader').first().getByRole('button', {name: 'Download Report'}).count();
    R.itemsOfTotal = await page.locator('.pkpStats__panel .pkpStats__itemsOfTotal').count();
    await loc(page, 'Journal page heading', page.locator('main h1').first());
    await loc(page, 'Journal page Views table', page.getByRole('table'));
    await loc(page, 'Journal page Download Report', page.getByRole('button', {name: 'Download Report', exact: true}));
    await loc(page, 'Journal page info icon', page.locator('#contextDetailTableLabel .tooltipButton'));
    if (who !== 'mgr') return R;

    // The row's link: new tab?
    R.rowLink = await step('journal row link', async () => {
        const popP = page.context().waitForEvent('page', {timeout: 8000}).catch(() => null);
        await page.locator('.pkpStats__panel table tbody a').first().click();
        const pop = await popP;
        if (!pop) return {popup: false, url: page.url()};
        await pop.waitForLoadState('domcontentloaded').catch(() => {});
        const u = pop.url();
        const ttl = await pop.title().catch(() => null);
        await pop.close();
        return {popup: true, url: u.replace(/^https?:\/\/[^/]+/, ''), title: ttl};
    });
    // Date range axis: default (Last 30 days) vs the other presets.
    R.presets = await step('journal presets', () => chooseRange(page, 'All dates'));
    R.allDates = {range: await rangeText(page), table: await tableRead(page), chart: await chartButtons(page)};
    await snap(page, `${prefix}-journal-alldates`);
    await step('journal 90', () => chooseRange(page, 'Last 90 days'));
    R.last90 = {range: await rangeText(page), table: await tableRead(page), chart: await chartButtons(page)};
    await step('journal 12m', () => chooseRange(page, 'Last 12 months'));
    R.last12 = {range: await rangeText(page), table: await tableRead(page), chart: await chartButtons(page)};
    await step('journal 30', () => chooseRange(page, 'Last 30 days'));
    R.last30 = {range: await rangeText(page), table: await tableRead(page)};
    // The Download window at Last 30 days (Daily; Monthly is disabled there).
    const W = await step('journal window', () => openDownload(page, `${prefix}-journal-window`));
    if (W) {
        R.window = {title: W.title, text: W.text, params: W.params, panels: W.panels};
        await loc(page, 'Journal Download window', W.dlg);
        R.dlJournal = await step('Download Journal', () => pressDownload(page, W.dlg, W.panels[0].buttons[0]));
        await snap(page, `${prefix}-journal-after-download`);
    }
    const W2 = await step('journal window 2', () => openDownload(page, `${prefix}-journal-window2`));
    if (W2) R.dlTimelineDaily = await step('Download Timeline daily', () => pressDownload(page, W2.dlg, 'Download Timeline'));
    // Last 90 days: both intervals enabled; Monthly, then Daily.
    await step('journal 90 b', () => chooseRange(page, 'Last 90 days'));
    R.chart90 = await chartButtons(page);
    R.monthlyReq = await step('journal monthly', () => pressChart(page, 'Monthly'));
    R.chartAfterMonthly = await chartButtons(page);
    await snap(page, `${prefix}-journal-monthly`);
    const W3 = await step('journal window 3', () => openDownload(page, `${prefix}-journal-window3`));
    if (W3) {
        R.window3 = {params: W3.params, panels: W3.panels};
        R.dlTimelineMonthly = await step('Download Timeline monthly', () => pressDownload(page, W3.dlg, 'Download Timeline'));
    }
    R.dailyReq = await step('journal daily', () => pressChart(page, 'Daily'));
    const W3b = await step('journal window 3b', () => openDownload(page, `${prefix}-journal-window3b`));
    if (W3b) {
        R.window3b = {params: W3b.params, panels: W3b.panels};
        R.dlTimelineDaily90 = await step('Download Timeline daily 90', () => pressDownload(page, W3b.dlg, 'Download Timeline'));
    }
    // All dates: the window's range and the file.
    await step('journal all 2', () => chooseRange(page, 'All dates'));
    const W4 = await step('journal window 4', () => openDownload(page, `${prefix}-journal-window-alldates`));
    if (W4) {
        R.window4 = {params: W4.params, panels: W4.panels};
        R.dlJournalAll = await step('Download Journal all', () => pressDownload(page, W4.dlg, W4.panels[0].buttons[0]));
    }
    const W5 = await step('journal window 5', () => openDownload(page, `${prefix}-journal-window-alldates-2`));
    if (W5) R.dlTimelineAll = await step('Download Timeline all', () => pressDownload(page, W5.dlg, 'Download Timeline'));
    // The window's own close control.
    const W6 = await step('journal window 6', () => openDownload(page, `${prefix}-journal-window-close`));
    if (W6) {
        R.windowButtons = await W6.dlg.getByRole('button').allInnerTexts();
        await closeDownload(page, W6.dlg);
        R.closedByClose = (await page.getByRole('dialog').filter({hasText: 'Download a CSV'}).count()) === 0;
    }
    // Custom Range typed, not applied, then leave the page.
    R.leave = await step('journal leave', async () => {
        const dialogs = [];
        const h = (d) => { dialogs.push(`${d.type()}: ${d.message()}`); d.accept().catch(() => {}); };
        page.on('dialog', h);
        await page.locator('.pkpDateRange__button').first().click();
        await page.locator('.pkpDateRange__input--start').fill('2026-01-01');
        const r = await page.goto(app.url(`/index.php/${S.path}/en/stats/publications/publications`));
        await idle(page);
        page.off('dialog', h);
        return {dialogs, landed: page.url().replace(/^https?:\/\/[^/]+/, ''), status: r && r.status()};
    });
    return R;
}

// ---------------------------------------------------------------------------
// The "Issues" page {OJS}

async function issuesPage(app, page, S, who, prefix) {
    const R = {};
    const resp = await goStats(page, app, S.path, 'issues/issues');
    R.status = resp && resp.status();
    const s = await snap(page, `${prefix}-issues-landing`);
    R.title = s.title;
    if (app.name !== 'ojs') {
        R.text = s.text.main.slice(0, 400);
        return R;
    }
    R.h1 = await page.locator('main h1').first().innerText().catch(() => null);
    R.range = await rangeText(page);
    R.chart = await chartButtons(page);
    R.h2 = await page.locator('#issueDetailTableLabel').innerText().catch(() => null);
    R.tooltip = await step('issues tooltip', () => tooltipRead(page, page.locator('#issueDetailTableLabel .tooltipButton')));
    R.itemsOfTotal = await page.locator('.pkpStats__itemsOfTotal').first().innerText().catch(() => null);
    R.search = await page.locator('.pkpStats__titleSearch input').first().evaluate((i) => ({placeholder: i.placeholder, aria: i.getAttribute('aria-label'), id: i.id, labels: [...(i.labels || [])].map((l) => l.innerText)})).catch((e) => ({err: e.message}));
    R.table = await tableRead(page);
    R.pagination = await page.locator('.pkpPagination, nav[aria-label*="agination"]').first().innerText().catch(() => null);
    await loc(page, 'Issues page heading', page.locator('main h1').first());
    await loc(page, 'Issues search box', page.getByRole('searchbox'));
    await loc(page, 'Issues table', page.getByRole('table'));
    await loc(page, 'Issues info icon', page.locator('#issueDetailTableLabel .tooltipButton'));
    await loc(page, 'Issues Total sort', page.getByRole('columnheader', {name: /Total/}));
    if (who !== 'mgr') return R;

    // The row link.
    R.rowLink = await step('issue row link', async () => {
        const popP = page.context().waitForEvent('page', {timeout: 8000}).catch(() => null);
        await page.locator('.pkpStats__panel table tbody a').first().click();
        const pop = await popP;
        if (!pop) return {popup: false, url: page.url()};
        await pop.waitForLoadState('domcontentloaded').catch(() => {});
        const u = pop.url();
        const ttl = await pop.title().catch(() => null);
        await pop.close();
        return {popup: true, url: u.replace(/^https?:\/\/[^/]+/, ''), title: ttl};
    });
    // Page 2.
    R.page2 = await step('issues page 2', async () => {
        const got = page.waitForResponse((r) => /\/stats\/issues\?/.test(r.url()) || /\/stats\/issues$/.test(r.url()), {timeout: 10_000}).catch(() => null);
        const btn = page.locator('.pkpPagination button, .pkpPagination a').filter({hasText: /^\s*2\s*$/}).first();
        const names = await page.locator('.pkpPagination').first().getByRole('button').allInnerTexts().catch(() => []);
        await btn.click();
        const r = await got;
        await idle(page);
        await snap(page, `${prefix}-issues-page2`);
        return {names, req: r && r.url().replace(/^https?:\/\/[^/]+/, ''), table: await tableRead(page), itemsOfTotal: await page.locator('.pkpStats__itemsOfTotal').first().innerText().catch(() => null)};
    });
    await goStats(page, app, S.path, 'issues/issues');
    // "Total" reverses the order.
    R.sort = await step('issues sort', async () => {
        const hdr = page.getByRole('columnheader', {name: /Total/});
        const before = await hdr.getAttribute('aria-sort').catch(() => null);
        const got = page.waitForResponse((r) => /\/stats\/issues\?/.test(r.url()), {timeout: 10_000}).catch(() => null);
        const b = hdr.getByRole('button');
        if (await b.count()) await b.first().click(); else await hdr.click();
        const r = await got;
        await idle(page);
        await snap(page, `${prefix}-issues-sorted`);
        return {before, after: await hdr.getAttribute('aria-sort').catch(() => null), req: r && r.url().replace(/^https?:\/\/[^/]+/, ''), table: await tableRead(page)};
    });
    // The window with the sorted order: the file keeps the order?
    const Wsorted = await step('issues window sorted', () => openDownload(page, `${prefix}-issues-window-sorted`));
    if (Wsorted) R.dlIssuesSorted = await step('Download Issues sorted', () => pressDownload(page, Wsorted.dlg, 'Download Issues'));
    await goStats(page, app, S.path, 'issues/issues');
    // The Download window, default range: every issue?
    const W = await step('issues window', () => openDownload(page, `${prefix}-issues-window`));
    if (W) {
        R.window = {title: W.title, text: W.text, params: W.params, panels: W.panels};
        await loc(page, 'Issues Download window', W.dlg);
        R.dlIssues = await step('Download Issues', () => pressDownload(page, W.dlg, 'Download Issues'));
    }
    // Downloads on the chart, then the timeline.
    R.downloadsReq = await step('issues downloads', () => pressChart(page, 'Downloads'));
    R.chartAfterDownloads = await chartButtons(page);
    const W2 = await step('issues window 2', () => openDownload(page, `${prefix}-issues-window-downloads`));
    if (W2) {
        R.window2Panels = W2.panels;
        R.dlTimelineDownloads = await step('Download Timeline downloads', () => pressDownload(page, W2.dlg, 'Download Timeline'));
    }
    await step('issues views', () => pressChart(page, 'Views'));
    await step('issues 90', () => chooseRange(page, 'Last 90 days'));
    await step('issues monthly', () => pressChart(page, 'Monthly'));
    const W3 = await step('issues window 3', () => openDownload(page, `${prefix}-issues-window-views-monthly`));
    if (W3) {
        R.window3Panels = W3.panels;
        R.dlTimelineViewsMonthly = await step('Download Timeline views monthly', () => pressDownload(page, W3.dlg, 'Download Timeline'));
    }
    // Search: the Vol./No. form, a bare number, a year, nothing found.
    const search = async (phrase) => {
        const box = page.locator('.pkpStats__titleSearch input').first();
        await box.fill(phrase);
        const got = page.waitForResponse((r) => /\/stats\/issues\?/.test(r.url()), {timeout: 10_000}).catch(() => null);
        await box.press('Enter');
        const r = await got;
        await idle(page);
        return {phrase, req: r && decodeURIComponent(r.url().replace(/^https?:\/\/[^/]+/, '')), table: await tableRead(page), itemsOfTotal: await page.locator('.pkpStats__itemsOfTotal').first().innerText().catch(() => null), empty: await page.locator('.pkpStats__panel').first().innerText().then((t) => /No issues were found/.test(t)).catch(() => null)};
    };
    R.searchVolNo = await step('search vol no', () => search('Vol. 1 No. 7'));
    await snap(page, `${prefix}-issues-search`);
    const W4 = await step('issues window search', () => openDownload(page, `${prefix}-issues-window-search`));
    if (W4) {
        R.window4 = {params: W4.params, panels: W4.panels};
        R.dlIssuesSearch = await step('Download Issues search', () => pressDownload(page, W4.dlg, 'Download Issues'));
    }
    const W5 = await step('issues window search 2', () => openDownload(page, `${prefix}-issues-window-search-2`));
    if (W5) R.dlTimelineSearch = await step('Download Timeline search', () => pressDownload(page, W5.dlg, 'Download Timeline'));
    R.searchBare = await step('search bare', () => search('7'));
    R.searchYear = await step('search year', () => search('(2021)'));
    R.searchNone = await step('search none', () => search('Vol. 9 No. 9'));
    await snap(page, `${prefix}-issues-none`);
    R.clear = await step('search clear', async () => {
        const c = page.getByRole('button', {name: /Clear search phrase/});
        const n = await c.count();
        const got = page.waitForResponse((r) => /\/stats\/issues\?/.test(r.url()), {timeout: 10_000}).catch(() => null);
        if (n) await c.first().click();
        await got;
        await idle(page);
        return {n, itemsOfTotal: await page.locator('.pkpStats__itemsOfTotal').first().innerText().catch(() => null)};
    });
    // A range where only the older issue has visits, then All dates.
    await step('issues all', () => chooseRange(page, 'All dates'));
    R.allDates = {range: await rangeText(page), itemsOfTotal: await page.locator('.pkpStats__itemsOfTotal').first().innerText().catch(() => null), first: (await tableRead(page)).rows.slice(0, 2), chart: await chartButtons(page)};
    // A range with no visits at all.
    R.emptyRange = await step('issues empty range', async () => {
        await page.locator('.pkpDateRange__button').first().click();
        await page.locator('.pkpDateRange__input--start').fill('2010-01-01');
        await page.locator('.pkpDateRange__input--end').fill('2010-01-31');
        const got = page.waitForResponse((r) => /\/stats\/issues\?/.test(r.url()), {timeout: 10_000}).catch(() => null);
        await page.getByRole('button', {name: 'Apply', exact: true}).click();
        await got;
        await idle(page);
        await snap(page, `${prefix}-issues-emptyrange`);
        return {range: await rangeText(page), panel: (await page.locator('.pkpStats__panel').first().innerText()).slice(0, 400), chartShown: await page.locator('.pkpStats__graph').count()};
    });
    const W6 = await step('issues window empty', () => openDownload(page, `${prefix}-issues-window-empty`));
    if (W6) R.dlIssuesEmpty = await step('Download Issues empty', () => pressDownload(page, W6.dlg, 'Download Issues'));
    return R;
}

// ---------------------------------------------------------------------------
// The "Articles" page's Download window and its files

async function articlesWindow(app, page, S, who, prefix, {filterName} = {}) {
    const R = {};
    const resp = await goStats(page, app, S.path, 'publications/publications');
    R.status = resp && resp.status();
    const s = await snap(page, `${prefix}-articles-landing`);
    R.h1 = await page.locator('main h1').first().innerText().catch(() => null);
    R.itemsOfTotal = await page.locator('.pkpStats__itemsOfTotal').first().innerText().catch(() => null);
    R.filterButton = await page.getByRole('button', {name: /^Filters?$/}).count();
    const W = await step('articles window', () => openDownload(page, `${prefix}-articles-window`));
    if (W) {
        R.window = {title: W.title, text: W.text, params: W.params, panels: W.panels};
        await loc(page, 'Articles Download window', W.dlg);
        if (who !== 'mgr') {
            R.dlArticles = await step('Download Articles', () => pressDownload(page, W.dlg, W.panels[0] && W.panels[0].buttons[0]));
            return R;
        }
        R.dlArticles = await step('Download Articles', () => pressDownload(page, W.dlg, W.panels[0].buttons[0]));
    }
    const W2 = await step('articles window 2', () => openDownload(page, `${prefix}-articles-window2`));
    if (W2) R.dlFiles = await step('Download Files', () => pressDownload(page, W2.dlg, 'Download Files'));
    const W3 = await step('articles window 3', () => openDownload(page, `${prefix}-articles-window3`));
    if (W3) R.dlTimeline = await step('Download Timeline', () => pressDownload(page, W3.dlg, 'Download Timeline'));
    // "Files" and "Monthly" on the chart, then the timeline.
    R.chart = await chartButtons(page);
    const filesLabel = (R.chart.find((b) => /Files|Downloads/.test(b.text)) || {}).text || 'Files';
    R.filesReq = await step('articles files', () => pressChart(page, filesLabel));
    await step('articles 90', () => chooseRange(page, 'Last 90 days'));
    await step('articles monthly', () => pressChart(page, 'Monthly'));
    const W4 = await step('articles window 4', () => openDownload(page, `${prefix}-articles-window-files-monthly`));
    if (W4) {
        R.window4Panels = W4.panels;
        R.dlTimelineFilesMonthly = await step('Download Timeline files monthly', () => pressDownload(page, W4.dlg, 'Download Timeline'));
    }
    // A filter and a search phrase applied: the window's rows and the files' preamble.
    if (filterName && R.filterButton) {
        R.filter = await step('articles filter', async () => {
            await page.getByRole('button', {name: /^Filters?$/}).first().click();
            const got = page.waitForResponse((r) => /\/stats\/publications\?/.test(r.url()), {timeout: 10_000}).catch(() => null);
            await page.locator('.pkpStats__filterSet').getByRole('button', {name: filterName}).first().click();
            const r = await got;
            await idle(page);
            await snap(page, `${prefix}-articles-filtered`);
            return {req: r && decodeURIComponent(r.url().replace(/^https?:\/\/[^/]+/, '')), itemsOfTotal: await page.locator('.pkpStats__itemsOfTotal').first().innerText().catch(() => null)};
        });
    }
    R.search = await step('articles search', async () => {
        const box = page.locator('.pkpStats__titleSearch input').first();
        await box.fill('"Quoted"');
        const got = page.waitForResponse((r) => /\/stats\/publications\?/.test(r.url()), {timeout: 10_000}).catch(() => null);
        await box.press('Enter');
        const r = await got;
        await idle(page);
        return {req: r && decodeURIComponent(r.url().replace(/^https?:\/\/[^/]+/, '')), itemsOfTotal: await page.locator('.pkpStats__itemsOfTotal').first().innerText().catch(() => null)};
    });
    const W5 = await step('articles window filtered', () => openDownload(page, `${prefix}-articles-window-filtered`));
    if (W5) {
        R.window5 = {params: W5.params, panels: W5.panels};
        R.dlArticlesFiltered = await step('Download Articles filtered', () => pressDownload(page, W5.dlg, W5.panels[0].buttons[0]));
    }
    const W6 = await step('articles window filtered 2', () => openDownload(page, `${prefix}-articles-window-filtered2`));
    if (W6) R.dlTimelineFiltered = await step('Download Timeline filtered', () => pressDownload(page, W6.dlg, 'Download Timeline'));
    const W7 = await step('articles window filtered 3', () => openDownload(page, `${prefix}-articles-window-filtered3`));
    if (W7) R.dlFilesFiltered = await step('Download Files filtered', () => pressDownload(page, W7.dlg, 'Download Files'));
    // All dates.
    await goStats(page, app, S.path, 'publications/publications');
    await step('articles all', () => chooseRange(page, 'All dates'));
    const W8 = await step('articles window all', () => openDownload(page, `${prefix}-articles-window-alldates`));
    if (W8) {
        R.window8Params = W8.params;
        R.dlArticlesAll = await step('Download Articles all', () => pressDownload(page, W8.dlg, W8.panels[0].buttons[0]));
    }
    return R;
}

/** The "Geographic" panel and its file at one site (and journal) level. */
async function geoProbe(app, page, S, label) {
    await goStats(page, app, S.path, 'publications/publications');
    const W = await step(`geo window ${label}`, () => openDownload(page, `mgr-geo-${label}-window`));
    if (!W) return null;
    const out = {panels: W.panels.map((p) => p.heading)};
    const geo = W.panels.find((p) => /^Geographic/.test(p.heading || ''));
    out.geoPanel = geo || null;
    if (geo) {
        out.tooltip = await step(`geo tooltip ${label}`, () => tooltipRead(page, W.dlg.locator('.pkpStats__reportAction').filter({hasText: 'Geographic'}).locator('.tooltipButton')));
        out.dl = await step(`Download Geographic ${label}`, () => pressDownload(page, W.dlg, 'Download Geographic'));
    } else {
        await closeDownload(page, W.dlg);
    }
    return out;
}

async function setJournalGeo(app, page, S, optionLabel) {
    await page.goto(app.url(`/index.php/${S.path}/en/management/settings/distribution#statistics`));
    await idle(page);
    const tab = page.getByRole('tab', {name: 'Statistics', exact: true}).first();
    if (await tab.count()) await tab.click();
    await idle(page);
    const s = await snap(page, `mgr-distribution-statistics-${optionLabel.replace(/\W+/g, '').slice(0, 20)}`);
    const radios = await page.locator('input[name="enableGeoUsageStats"]').evaluateAll((rs) => rs.map((r) => ({value: r.value, checked: r.checked, label: r.parentElement.innerText.trim()})));
    await page.getByLabel(optionLabel, {exact: true}).check();
    const form = page.locator('form').filter({has: page.locator('input[name="enableGeoUsageStats"]')});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    await page.locator('[role="status"]', {hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
    return {radios, text: s.text.main.slice(0, 200)};
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    const R = {app: app.name};
    let S = null;
    // Reuse an existing seed when SEED_PATH names one (a rerun of one phase).
    if (process.env[`SEED_${app.name.toUpperCase()}`]) {
        S = JSON.parse(process.env[`SEED_${app.name.toUpperCase()}`]);
    } else {
        S = await seed(app);
    }
    R.seed = S;
    fact('seed', {path: S.path, contextId: S.contextId, seconds: S.seconds, issues: S.issues.length, subs: S.subs.length});
    const {page, close} = await launch(app);
    try {
        if (PHASES.includes('journal')) {
            await signIn(page, `${S.T}mgr`);
            R.nav = await sideNav(page);
            R.journalMgr = await journalPage(app, page, S, 'mgr', 'mgr');
            fact('journalMgr', R.journalMgr);
        }
        if (PHASES.includes('issues')) {
            await signIn(page, `${S.T}mgr`);
            await page.goto(app.url(`/index.php/${S.path}/en/stats/publications/publications`));
            await idle(page);
            R.navStats = await sideNav(page);
            R.issuesMgr = await issuesPage(app, page, S, 'mgr', 'mgr');
            fact('issuesMgr', R.issuesMgr);
        }
        if (PHASES.includes('articles')) {
            await signIn(page, `${S.T}mgr`);
            R.articlesMgr = await articlesWindow(app, page, S, 'mgr', 'mgr', {filterName: SECOND_SECTION[app.name] && SECOND_SECTION[app.name].title});
            fact('articlesMgr', R.articlesMgr);
        }
        if (PHASES.includes('geo')) {
            R.geo = {};
            try {
                await signIn(page, `${S.T}mgr`);
                R.geo.disabled = await geoProbe(app, page, S, 'site-disabled');
                R.geo.siteCity = await app.api.setSite({enableGeoUsageStats: 'country+region+city'});
                // Visits with places, seeded while the site collects cities.
                R.geo.seed = await step('geo seed', () => app.api.createSubmission({
                    tag: `${S.T}g${Date.now() % 100000}`, context: S.T, submitter: `${S.T}au`, published: true, title: 'K3 Geo Work',
                    ...(app.name === 'ojs' ? {issue: {volume: 1, number: '1', year: 2020}} : {}), ...FILES[app.name].plain,
                    usage: [{daysAgo: 2, abstractViews: 3, country: 'CA', region: 'BC', city: 'Vancouver'},
                        {daysAgo: 2, abstractViews: 2, country: 'CA', region: 'ON'},
                        {daysAgo: 2, abstractViews: 1, fileViews: [1], country: 'DE'}],
                }).then((x) => x.submissionId));
                R.geo.city = await geoProbe(app, page, S, 'site-city');
                // The journal's own level, below the site's, then "disabled".
                R.geo.journalCountryForm = await step('journal geo country', () => setJournalGeo(app, page, S, "Collect the visitor's country"));
                R.geo.journalCountry = await geoProbe(app, page, S, 'site-city-journal-country');
                R.geo.journalDisabledForm = await step('journal geo disabled', () => setJournalGeo(app, page, S, 'Do not collect any geographical data'));
                R.geo.journalDisabled = await geoProbe(app, page, S, 'site-city-journal-disabled');
                R.geo.journalCityForm = await step('journal geo city', () => setJournalGeo(app, page, S, "Collect the visitor's country, region and city"));
                await app.api.setSite({enableGeoUsageStats: 'country+region'});
                R.geo.region = await geoProbe(app, page, S, 'site-region');
                await app.api.setSite({enableGeoUsageStats: 'country'});
                R.geo.country = await geoProbe(app, page, S, 'site-country');
            } finally {
                R.geo.restored = await app.api.setSite({enableGeoUsageStats: 'disabled'});
            }
            R.geo.disabledAfter = await geoProbe(app, page, S, 'site-disabled-after');
            fact('geo', R.geo);
        }
        if (PHASES.includes('se')) {
            await signIn(page, `${S.T}se`);
            R.navSe = await sideNav(page);
            R.journalSe = await step('journal se', () => journalPage(app, page, S, 'se', 'se'));
            R.journalSeWindow = await step('journal se window', async () => {
                const W = await openDownload(page, 'se-journal-window');
                return {params: W.params, panels: W.panels, dl: await pressDownload(page, W.dlg, W.panels[0].buttons[0])};
            });
            R.issuesSe = await step('issues se', () => issuesPage(app, page, S, 'se', 'se'));
            if (app.name === 'ojs') {
                R.issuesSeWindow = await step('issues se window', async () => {
                    const W = await openDownload(page, 'se-issues-window');
                    return {params: W.params, panels: W.panels, dl: await pressDownload(page, W.dlg, 'Download Issues')};
                });
            }
            R.articlesSe = await step('articles se', () => articlesWindow(app, page, S, 'se', 'se'));
            // The site administrator: one download per page.
            await signIn(page, 'admin');
            R.journalAdmin = await step('journal admin', () => journalPage(app, page, S, 'admin', 'admin'));
            R.journalAdminWindow = await step('journal admin window', async () => {
                const W = await openDownload(page, 'admin-journal-window');
                return {params: W.params, panels: W.panels, dl: await pressDownload(page, W.dlg, W.panels[0].buttons[0])};
            });
            if (app.name === 'ojs') R.issuesAdmin = await step('issues admin', () => issuesPage(app, page, S, 'admin', 'admin'));
            // A reader of the journal: the pages refuse.
            await signIn(page, `${S.T}rd`);
            R.reader = {};
            for (const route of ['context/context', 'issues/issues']) {
                const r = await page.goto(statsURL(app, S.path, route));
                await idle(page);
                R.reader[route] = {status: r && r.status(), url: page.url().replace(/^https?:\/\/[^/]+/, ''), text: (await page.locator('main, body').first().innerText()).slice(0, 200)};
            }
            await snap(page, 'reader-issues');
            fact('se', {journalSe: R.journalSe, journalSeWindow: R.journalSeWindow, issuesSe: R.issuesSe, issuesSeWindow: R.issuesSeWindow, articlesSe: R.articlesSe, journalAdmin: R.journalAdmin && R.journalAdmin.table, journalAdminWindow: R.journalAdminWindow, reader: R.reader});
        }
        if (PHASES.includes('td9')) {
            // td9 as written: publicknowledge, manager.maya, read-only.
            await signIn(page, 'manager.maya');
            R.td9 = {};
            await goStats(page, app, app.contextPath, 'publications/publications');
            await snap(page, 'td9-articles');
            R.td9.range = await rangeText(page);
            const W = await step('td9 window', () => openDownload(page, 'td9-articles-window'));
            if (W) {
                R.td9.window = {params: W.params, panels: W.panels};
                R.td9.dlArticles = await step('td9 Download Articles', () => pressDownload(page, W.dlg, W.panels[0].buttons[0]));
            }
            const chart = await chartButtons(page);
            const filesLabel = (chart.find((b) => /Files|Downloads/.test(b.text)) || {}).text || 'Files';
            R.td9.filesReq = await step('td9 files', () => pressChart(page, filesLabel));
            const W2 = await step('td9 window 2', () => openDownload(page, 'td9-articles-window-files'));
            if (W2) R.td9.dlTimeline = await step('td9 Download Timeline', () => pressDownload(page, W2.dlg, 'Download Timeline'));
            // A filter on publicknowledge (OMP's series, OJS's sections).
            R.td9.filterButton = await page.getByRole('button', {name: /^Filters?$/}).count();
            if (R.td9.filterButton) {
                R.td9.filter = await step('td9 filter', async () => {
                    await page.getByRole('button', {name: /^Filters?$/}).first().click();
                    const sets = await page.locator('.pkpStats__filterSet').evaluateAll((fs) => fs.map((f) => f.innerText.replace(/\s+/g, ' ').trim()));
                    // Titles first: an active filter gains a remove button, which shifts any index.
                    const titles = (await page.locator('.pkpStats__filterSet').first().getByRole('button').allInnerTexts()).map((t) => t.trim()).slice(0, 2);
                    for (const title of titles) {
                        const got = page.waitForResponse((r) => /\/stats\/publications\?/.test(r.url()), {timeout: 10_000}).catch(() => null);
                        await page.locator('.pkpStats__filterSet').first().getByRole('button', {name: title, exact: true}).click();
                        await got;
                        await idle(page);
                    }
                    await idle(page);
                    await snap(page, 'td9-articles-filtered');
                    const W3 = await openDownload(page, 'td9-articles-window-filtered');
                    return {sets, titles, params: W3.params, dl: await pressDownload(page, W3.dlg, W3.panels[0].buttons[0])};
                });
            }
            await goStats(page, app, app.contextPath, 'context/context');
            await snap(page, 'td9-journal');
            const W4 = await step('td9 journal window', () => openDownload(page, 'td9-journal-window'));
            if (W4) R.td9.dlJournal = await step('td9 Download Journal', () => pressDownload(page, W4.dlg, W4.panels[0].buttons[0]));
            fact('td9', R.td9);
        }
        if (PHASES.includes('extra')) {
            // Keyboard reach of the information icons, the file's bytes, Issues' lack of filters.
            await signIn(page, `${S.T}mgr`);
            R.extra = {};
            await goStats(page, app, S.path, 'context/context');
            R.extra.keyboard = await step('keyboard', async () => {
                const seen = [];
                await page.getByRole('button', {name: 'Download Report', exact: true}).focus();
                for (let i = 0; i < 4; i++) {
                    await page.keyboard.press('Shift+Tab');
                    seen.push(await page.evaluate(() => {
                        const e = document.activeElement;
                        return `${e.tagName}.${(e.className || '').toString().split(' ')[0]} "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 40)}"`;
                    }));
                }
                const tipShown = await page.locator('.v-popper__popper--shown').count();
                return {seen, tipShown};
            });
            const W = await step('extra window', () => openDownload(page, 'extra-journal-window'));
            // The page's own CSV request: the bytes the server sent, before the page's script decodes them.
            const csvResp = page.waitForResponse((r) => /\/api\/v1\/stats\//.test(r.url()) && /text\/csv/.test(r.request().headers().accept || ''), {timeout: 30_000}).catch(() => null);
            if (W) R.extra.dl = await step('extra dl', () => pressDownload(page, W.dlg, W.panels[0].buttons[0]));
            R.extra.serverBytes = await step('server bytes', async () => {
                const r = await csvResp;
                const b = r ? await r.body() : null;
                return b ? {status: r.status(), first8: b.subarray(0, 8).toString('hex')} : null;
            });
            if (R.extra.dl && R.extra.dl.name) {
                const f = path.join(outDir(), `dl-${app.name}-${R.extra.dl.name.replace(/[^A-Za-z0-9_.-]+/g, '_')}`);
                const b = fs.readFileSync(f);
                R.extra.bytes = {first8: b.subarray(0, 8).toString('hex'), bomAnywhere: b.indexOf(Buffer.from([0xef, 0xbb, 0xbf])), size: b.length};
            }
            if (app.name === 'ojs') {
                await goStats(page, app, S.path, 'issues/issues');
                R.extra.issuesFilters = await page.getByRole('button', {name: /^Filters?$/}).count();
                R.extra.issuesKeyboardTip = await page.locator('#issueDetailTableLabel .tooltipButton').evaluate((e) => e.tabIndex);
            }
            fact('extra', R.extra);
        }
        await signOut(page).catch(() => {});
    } finally {
        record('k3', R, {merge: true});
        await close();
    }
});
