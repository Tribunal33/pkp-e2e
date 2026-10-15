// U15 claim check H15 (incidentals row): the Search page's "Published After" / "Published Before"
// on a site whose time zone is east of UTC. Code reading: SearchHandler / SubmissionSearchResult
// build the limit with mktime() in the site's zone (PKPRequest::getUserDateVar), and DatabaseEngine
// turns it into `new \Carbon\Carbon($timestamp)`, which is UTC, then whereDate() keeps its Y-m-d.
//
// One run = for each zone in ZONES (default UTC, Europe/Prague, America/Vancouver): `time_zone` under
// [general] in the dataset fleet's own config file set to that zone, then a visitor searches with an
// empty box and one date filter at a time (full dates and partial ones) on
//   - a scratch journal / server seeded by this run with five items published 2024-12-31, 2025-01-01,
//     2025-01-30, 2025-01-31 and 2025-02-01;
//   - `publicknowledge` (read-only): the dataset's own published items, all on one day D, under
//     "Published After" D+1 / D and "Published Before" D / D+1.
// The config's time_zone is put back to what it held at the start (what the fleet reset wrote).
// Runs on a dataset fleet (PKP's default test dataset), OJS and OPS (a press has no date filters):
//   bin/app-lock.sh shared ojs -- env PROBE_FEATURE=U15 PKP_E2E_DATASET=3 PROBE_AGENT=cc15a PROBE_RUN=r1 \
//     node bin/probe.js ojs shared/playwright/checks/U15/H15/h15.js
// Never run two runs of it at once on one fleet: the time zone is the fleet's config.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, screen, shot, record, loc, note, idle, drainJobs, sql, serverLog, tag} =
    require('../../../probe');

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const T = 30_000;
const ZONES = (process.env.ZONES || 'UTC,Europe/Prague,America/Vancouver').split(',').filter(Boolean);
const ITEMS = {i1: '2024-12-31', i2: '2025-01-01', i3: '2025-01-30', i4: '2025-01-31', i5: '2025-02-01'};
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const full = (pre, iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return {[`${pre}Year`]: String(y), [`${pre}Month`]: MON[m - 1], [`${pre}Day`]: String(d)};
};
const plusDay = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

const SCRATCH_CASES = [
    ['F1 After 2025-01-31', full('dateFrom', '2025-01-31')],
    ['F2 Before 2025-01-31', full('dateTo', '2025-01-31')],
    ['F3 After 2025-01-01', full('dateFrom', '2025-01-01')],
    ['F4 Before 2025-01-01', full('dateTo', '2025-01-01')],
    ['F5 After 2025-02-01', full('dateFrom', '2025-02-01')],
    ['P1 After Year 2025', {dateFromYear: '2025'}],
    ['P2 After 2025 + Jan', {dateFromYear: '2025', dateFromMonth: 'Jan'}],
    ['P3 Before Year 2025', {dateToYear: '2025'}],
    ['P4 Before 2025 + Feb', {dateToYear: '2025', dateToMonth: 'Feb'}],
];

function configPath(app) {
    return path.isAbsolute(app.configFile) ? app.configFile : path.join(REPO_ROOT, app.configFile);
}
function readZone(app) {
    const m = fs.readFileSync(configPath(app), 'utf8').match(/^time_zone\s*=\s*(.*)$/m);
    return m ? m[1].trim() : null;
}
function writeZone(app, value) {
    const file = configPath(app);
    const text = fs.readFileSync(file, 'utf8');
    if (!/^time_zone\s*=.*$/m.test(text)) throw new Error(`no time_zone line in ${file}`);
    fs.writeFileSync(file, text.replace(/^time_zone\s*=.*$/m, `time_zone = ${value}`));
}

async function readSelects(page, prefix) {
    const out = {};
    for (const part of ['Year', 'Month', 'Day']) {
        const sel = page.locator(`select[name="${prefix}${part}"]`);
        out[part] = (await sel.count())
            ? await sel.evaluate((s) => (s.selectedIndex < 0 ? null : s.options[s.selectedIndex].text.trim()))
            : 'no such select';
    }
    return out;
}

async function readResults(page) {
    const items = await page.locator('.page_search .search_results > li, .page_search .cmp_article_list > li')
        .evaluateAll((lis) => lis.map((li) => {
            const a = li.querySelector('a[href*="/article/view/"], a[href*="/preprint/view/"]');
            return {title: a ? a.textContent.replace(/\s+/g, ' ').trim() : null, text: li.innerText.replace(/\s+/g, ' ').trim().slice(0, 300)};
        }));
    const notice = flat(await page.locator('.page_search .cmp_notification').first().innerText({timeout: 2000}).catch(() => null), 200);
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        listed: items.length,
        items,
        notice,
        dateFrom: await readSelects(page, 'dateFrom'),
        dateTo: await readSelects(page, 'dateTo'),
    };
}

/** The Search page of `ctxPath`: through the header's "Search" link from the home page. */
async function openSearch(app, page, ctxPath) {
    await page.goto(app.url(`/index.php/${ctxPath}`));
    await idle(page).catch(() => {});
    const link = page.locator('header a[href*="/search"]').first();
    if (await link.isVisible().catch(() => false)) {
        await Promise.all([page.waitForEvent('load', {timeout: T}), link.click()]);
        await idle(page).catch(() => {});
        return 'header link';
    }
    await page.goto(app.url(`/index.php/${ctxPath}/search`));
    await idle(page).catch(() => {});
    return 'address';
}

async function searchWith(page, choose) {
    const form = page.locator('.page_search form').filter({has: page.locator('input[name="query"]')}).first();
    await form.locator('input[name="query"]').fill('');
    for (const [name, label] of Object.entries(choose)) await form.locator(`select[name="${name}"]`).selectOption({label});
    await Promise.all([page.waitForEvent('load', {timeout: T}), form.locator('button[type="submit"]').first().click()]);
    await idle(page).catch(() => {});
    return readResults(page);
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('h15.js runs on a dataset fleet (PKP_E2E_DATASET=n)');
    if (app.name === 'omp') return; // a press has no date filters (U15 Rule 9, OMP2)
    const isOPS = app.name === 'ops';
    const run = process.env.PROBE_RUN || 'r0';
    const facts = (k, v) => record('h15-facts', {[k]: v}, {merge: true});
    const original = readZone(app);
    facts('config', {file: app.configFile, timeZoneAtStart: original, zones: ZONES});

    // ---------------------------------------------------------------- seed (scratch context, five items)
    const t = tag('u15h15');
    const ctx = await app.api.createContext({
        tag: t,
        context: {name: `U15 H15 ${t}`, acronym: 'H15'},
        users: [{username: `${t}m`, roles: ['manager']}, {username: `${t}a`, roles: ['author']}],
        ...(isOPS ? {} : {issues: [{volume: 1, number: 1, year: 2025, published: true, datePublished: '2025-01-01'}]}),
    });
    const subs = {};
    for (const [k, d] of Object.entries(ITEMS)) {
        const r = await app.api.createSubmission({
            tag: `${t}${k}`, context: ctx.path, submitter: `${t}a`, title: `H15 ${k} published ${d}`,
            published: true, datePublished: d,
            ...(isOPS ? {} : {issue: {volume: 1, number: 1, year: 2025}}),
        });
        subs[k] = {id: r.submissionId, pub: r.publicationId};
    }
    await drainJobs(app).catch((e) => facts('drainJobs', flat(e.message)));
    const ctxId = sql(app, `select ${app.contextTables.id} from ${app.contextTables.table} where path='${ctx.path}'`);
    facts('seed', {ctx: ctx.path, ctxId, subs, db: sql(app, `select p.submission_id, p.publication_id, p.status, p.date_published from publications p join submissions s on s.submission_id=p.submission_id where s.context_id=${ctxId} order by 1`).split('\n')});

    const pkCtxId = sql(app, `select ${app.contextTables.id} from ${app.contextTables.table} where path='${app.contextPath}'`);
    const D = sql(app, `select distinct p.date_published from publications p join submissions s on s.submission_id=p.submission_id where s.context_id=${pkCtxId} and p.status=3 and p.date_published is not null order by 1`).split('\n');
    facts('dataset-dates', D);
    const d0 = D[D.length - 1];
    const DATASET_CASES = [
        [`D1 After ${plusDay(d0, 1)} (the day after the dataset's date)`, full('dateFrom', plusDay(d0, 1))],
        [`D2 After ${d0} (the dataset's date)`, full('dateFrom', d0)],
        [`D3 Before ${d0}`, full('dateTo', d0)],
        [`D4 Before ${plusDay(d0, 1)}`, full('dateTo', plusDay(d0, 1))],
    ];

    const {page, close} = await launch(app);
    const log = serverLog(app);
    try {
        for (const zone of ZONES) {
            writeZone(app, zone);
            const z = zone.replace(/\W+/g, '');
            const from = log.mark();
            const out = {zone, scratch: {}, dataset: {}};
            for (const [where, ctxPath, cases] of [['scratch', ctx.path, SCRATCH_CASES], ['dataset', app.contextPath, DATASET_CASES]]) {
                const how = await openSearch(app, page, ctxPath);
                const first = await screen(page);
                record(`h15-${where}-${z}-open`, first);
                out[where].openedBy = how;
                out[where].bare = await readResults(page);
                out[where].yearOptions = (await page.locator('select[name="dateFromYear"] option').allInnerTexts().catch(() => [])).map((s) => s.trim());
                if (zone === ZONES[0]) {
                    await shot(page, `h15-${where}-open`);
                    await loc(page, 'Search page: Published After Year select', page.locator('select[name="dateFromYear"]'));
                    await loc(page, 'Search page: Published Before Day select', page.locator('select[name="dateToDay"]'));
                    await loc(page, 'Search page: Search button', page.locator('.page_search form button[type="submit"]').first());
                }
                for (const [name, choose] of cases) {
                    await openSearch(app, page, ctxPath);
                    const res = await searchWith(page, choose);
                    const id = name.split(' ')[0];
                    record(`h15-${where}-${z}-${id}`, await screen(page));
                    if (zone !== 'UTC' && id === 'F1') await shot(page, `h15-${where}-${z}-${id}`);
                    out[where][name] = {chosen: choose, url: res.url, listed: res.listed, titles: res.items.map((i) => i.title), summaries: res.items.map((i) => i.text), notice: res.notice, dateFrom: res.dateFrom, dateTo: res.dateTo};
                    console.log(`[h15 ${run} ${app.name} ${zone}] ${where} ${name}: ${res.listed} ${res.notice ? `"${res.notice}" ` : ''}${res.items.map((i) => (i.title || '').replace(/^H15 /, '')).join(' | ').slice(0, 300)}`);
                }
            }
            out.serverLog = log.since(from);
            facts(`zone-${z}`, out);
        }
    } finally {
        writeZone(app, original);
        facts('config-restored', readZone(app));
        await close();
    }
    const NOTE = 'Search page (dataset fleet, scratch context): the date selects are select[name="date{From,To}{Year,Month,Day}"], options by label ("2025", "Jan", "31"); the form is .page_search form with input[name="query"], submit button[type="submit"]; results are .page_search .search_results > li (OJS/OPS). A probe changing time_zone in config.test.ds<n>.inc.php takes effect on the next request (no server restart).';
    const notes = path.join(REPO_ROOT, '.reports', process.env.PROBE_FEATURE || 'U15', 'screen-notes.md');
    if (!fs.existsSync(notes) || !fs.readFileSync(notes, 'utf8').includes('time_zone in config.test.ds')) note(NOTE);
});
