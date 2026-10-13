// U64 claim check H13D (housekeeping 2026-10-13): three incidentals rows, driven on PKP's default
// test dataset (dataset fleet 4; `npm run reset:<app> -- --dataset 4` before a run).
//
// PHASE=files (row 12; all apps): Statistics › "Articles" ("Monographs", "Preprints") as dbarnes,
//   then "Download Report" › "Download Files" three times each with no phrase, a plain phrase and
//   the quoted phrase the A8 walk used. Per press: the stats/publications/files answer (status,
//   length) or the browser's failure text, the file's line count, and the fleet server's log lines
//   written meanwhile (the empty-answer sighting of 2026-10-02 on OMP main, php-src GH-20469).
//
// PHASE=counter (rows 13, 14; OJS and OPS): precondition no screen sets (SQL): the install and the
//   publications aged to 2026-06-15 (COUNTER months exist), and an ORCID iD on the FIRST author (ORCID_ON=last: the last) of
//   the multi-author item (OJS "Signalling Theory Dividends", 3 authors; OPS "The Facets Of Job
//   Satisfaction…", 2 authors). Then a signed-out reader opens the item and its PDF, the visit is
//   handed to the loader as 2026-09-15 (OJS5 walk's monthLater: the app's own loader task and job
//   queue), and dbarnes › Statistics › "Counter R5": "Item Master Report (IR)" with "Authors"
//   ticked › "Download"; OJS also "Journal Article Requests (IR_A1)"; then the IR request the page
//   sent, typed in the browser (the JSON form, its Item_Contributors). OJS only: Statistics ›
//   "Reports" › "COUNTER Reports" › the year link of "Journal Report 1:" and "Article Report 1:":
//   the <Report> element's Created attribute beside the answer's Date header and the clock.
//
// Run (main, one app per lock):
//   bin/app-lock.sh shared omp -- env PKP_E2E_DATASET=4 PHASE=files PROBE_RUN=r1 PROBE_FEATURE=U64 PROBE_AGENT=ccH13D node bin/probe.js omp shared/playwright/checks/U64/H13D/h13d.js
// Run (3.5):  PKP_E2E_LINE=stable-3_5_0 PKP_E2E_DATASET=4 PHASE=counter PROBE_RUN=s1 … node bin/probe.js ojs …
// Facts: .reports/U64/ccH13D/h13d-<phase>-<run>-<app>.json; snapshots h13d-*-<run>-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql, serverLog, note} = require('../../../probe');
const {monthLater, readReport: readTsv} = require('../../issues/ir-a1-lists-investigation-rows/lib');
const {AGE_SQL} = require('../../issues/counter-report-tsv-comma-separated/lib');
const {readReport: readXml} = require('../../issues/counter-release-4-report-name-code-path/lib');

const PHASE = process.env.PHASE || 'files';
const T = 30_000;
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const attempt = async (fn) => {
    try {
        return await fn();
    } catch (e) {
        return {error: flat(e.message, 400)};
    }
};
const READER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const ORCID = 'https://orcid.org/0000-0002-1825-0097';
const WORDS = {
    ojs: {phrase: 'Signalling Theory', plain: 'Signalling'},
    omp: {phrase: 'Bomb Canada', plain: 'Bomb'},
    ops: {phrase: 'Signalling Theory', plain: 'Signalling'},
};
const ITEM = {
    ojs: {title: 'Signalling Theory Dividends', view: (id) => `article/view/${id}`, download: /\/article\/download\//},
    ops: {title: 'The Facets Of Job Satisfaction', view: (id) => `preprint/view/${id}`, download: /\/preprint\/download\//},
};

/** One press of "Download Files" in the open window: what came back. */
async function pressFiles(page, app, log) {
    const dialog = page.getByRole('dialog').filter({hasText: 'Download a CSV'});
    const out = {};
    const isFiles = (u) => /\/api\/v1\/stats\/publications\/files/.test(u);
    const failed = [];
    const onFail = (r) => isFiles(r.url()) && failed.push({url: rel(r.url()), failure: r.failure() && r.failure().errorText});
    page.on('requestfailed', onFail);
    const from = log.mark();
    const answered = page.waitForResponse((r) => isFiles(r.url()), {timeout: 20_000}).catch(() => null);
    const arrived = page.waitForEvent('download', {timeout: 20_000}).catch(() => null);
    out.at = new Date().toISOString();
    await dialog.getByRole('button', {name: 'Download Files', exact: true}).click();
    const r = await answered;
    if (r) {
        const h = r.headers();
        out.response = {url: rel(r.url()).replace(/^.*\/api\/v1/, '/api/v1'), status: r.status(), type: h['content-type'] || null, disposition: h['content-disposition'] || null, length: h['content-length'] || null};
    }
    const file = await arrived;
    if (file) {
        const text = fs.readFileSync(await file.path(), 'utf8');
        const lines = text.split(/\r?\n/);
        out.file = {name: file.suggestedFilename().replace(/_\d{4}-\d\d-\d\dT[\d_-]+/, '_<time>'), bytes: text.length, lineCount: lines.length, head: lines.slice(0, 7).map((l) => l.slice(0, 160))};
    }
    page.off('requestfailed', onFail);
    out.failed = failed;
    await page.waitForTimeout(800);
    // the server's own lines for the request window: its access line and anything that is no access line
    const lines = fs.existsSync(log.file) ? fs.readFileSync(log.file).subarray(from).toString('utf8').split('\n').filter(Boolean) : [];
    out.serverLines = lines.filter((l) => /publications\/files|error|fatal|segment|signal|exit|warning|exception/i.test(l)).map((l) => flat(l, 300)).slice(0, 12);
    out.serverLineCount = lines.length;
    out.windowOpen = await dialog.isVisible().catch(() => false);
    if (out.windowOpen) {
        out.windowText = flat(await dialog.innerText().catch(() => null), 300);
        await dialog.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await dialog.waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
    }
    await page.waitForTimeout(600);
    return out;
}

async function filesPhase(app, page, facts) {
    const {StatsPage} = require('../../../pages/UsageStatsPages.js');
    const w = WORDS[app.name];
    const stats = new StatsPage(page, app.contextPath, 'articles');
    const log = serverLog(app);
    facts.serverLog = rel(log.file);
    await signIn(page, 'dbarnes');
    facts.opened = await attempt(() => stats.goto());
    record('files-page', await screen(page));
    const cases = [['none', null], ['plain', w.plain], ['quoted', `"${w.phrase}"`]];
    facts.cases = {};
    for (const [key, phrase] of cases) {
        const c = {phrase, presses: []};
        if (phrase) c.search = await attempt(() => stats.search(phrase));
        c.countLine = flat(await stats.itemsOfTotal.innerText().catch(() => null), 80);
        c.rows = (await stats.itemRows.allInnerTexts().catch(() => [])).map((s) => flat(s, 100));
        for (let i = 0; i < 3; i++) {
            c.presses.push(await attempt(async () => {
                const win = await stats.openDownload();
                if (i === 0) {
                    record(`files-window-${key}`, await screen(page));
                    if (key === 'quoted') await shot(page, 'files-window-quoted');
                    c.params = await win.params();
                }
                return pressFiles(page, app, log);
            }));
        }
        facts.cases[key] = c;
        if (phrase) await attempt(() => stats.clearSearch());
    }
    record('files-after', await screen(page));
}

/** A signed-out reader opens the item's page and its PDF. */
async function readItem(app, page, submissionId) {
    const it = ITEM[app.name];
    const context = await page.context().browser().newContext(app.line && app.line !== 'main' ? {userAgent: READER} : {});
    const reader = await context.newPage();
    const out = {};
    try {
        const r = await reader.goto(app.url(`/index.php/${app.contextPath}/${it.view(submissionId)}`));
        out.page = {status: r && r.status(), url: rel(reader.url()), heading: flat(await reader.locator('h1').first().innerText().catch(() => null), 100)};
        await idle(reader).catch(() => {});
        record('counter-reader-item', await screen(reader));
        const file = reader.waitForResponse((res) => it.download.test(res.url()), {timeout: T}).catch(() => null);
        await reader.locator('a.obj_galley_link', {hasText: /PDF/}).first().click();
        const f = await file;
        out.file = f ? {url: rel(f.url()), status: f.status()} : null;
        await idle(reader).catch(() => {});
        await reader.waitForTimeout(800);
    } finally {
        await context.close();
    }
    return out;
}

async function counterPhase(app, page, facts) {
    const it = ITEM[app.name];
    const ctx = app.contextPath;
    const sid = sql(app, `select p.submission_id from publications p join publication_settings s on s.publication_id = p.publication_id and s.setting_name = 'title' and s.locale = 'en' where p.status = 3 and s.setting_value like '${it.title}%' order by p.publication_id desc limit 1`);
    const pid = sql(app, `select current_publication_id from submissions where submission_id = ${sid}`);
    facts.item = {submissionId: sid, publicationId: pid};
    facts.authors = sql(app, `select a.author_id, a.seq, max(case when s.setting_name='givenName' then s.setting_value end), max(case when s.setting_name='familyName' then s.setting_value end), max(case when s.setting_name='orcid' then s.setting_value end) from authors a left join author_settings s on s.author_id = a.author_id and s.locale in ('en','') where a.publication_id = ${pid} group by 1,2 order by 2`).split('\n');
    const already = Number(sql(app, `select count(*) from metrics_counter_submission_monthly where submission_id = ${sid}`));
    if (!already) {
        for (const q of AGE_SQL('2026-06-15')) sql(app, q);
        // ORCID_ON=last puts the iD on the last author instead (the other end of the axis)
        const first = sql(app, `select author_id from authors where publication_id = ${pid} order by seq ${process.env.ORCID_ON === 'last' ? 'desc' : ''} limit 1`);
        sql(app, `delete from author_settings where author_id = ${first} and setting_name = 'orcid'`);
        sql(app, `insert into author_settings (author_id, locale, setting_name, setting_value) values (${first}, '', 'orcid', '${ORCID}')`);
        facts.authorsAfterOrcid = sql(app, `select a.author_id, a.seq, s.setting_value from authors a left join author_settings s on s.author_id = a.author_id and s.setting_name = 'orcid' where a.publication_id = ${pid} order by 2`).split('\n');
        facts.reader = await attempt(() => readItem(app, page, sid));
        facts.monthLater = await attempt(() => monthLater(app, '2026-09-15'));
        if (facts.monthLater && facts.monthLater.lines) facts.monthLater.lines = facts.monthLater.lines.length;
    } else {
        facts.figuresKept = already;
    }
    facts.monthly = sql(app, `select submission_id, month, metric_investigations, metric_requests from metrics_counter_submission_monthly where submission_id = ${sid}`);
    await signIn(page, 'dbarnes');
    const {CounterR5Page} = require('../../../pages/UsageStatsPages.js');
    const r5 = new CounterR5Page(page, ctx);
    facts.r5 = await attempt(async () => ({list: (await r5.goto()).status()}));
    await idle(page);
    record('counter-r5', await screen(page));
    const reports = [['IR', 'Item Master Report (IR)', true]];
    if (app.name === 'ojs') reports.push(['IR_A1', 'Journal Article Requests (IR_A1)', false]);
    facts.reports = {};
    for (const [id, name, tick] of reports) {
        facts.reports[id] = await attempt(async () => {
            const win = await r5.edit(id);
            const o = {};
            if (tick) {
                o.attributesBefore = await win.boxes('attributes_to_show');
                await win.checkbox('Authors').check();
            }
            o.dates = [await win.box('begin_date').inputValue(), await win.box('end_date').inputValue()];
            record(`counter-window-${id}`, await screen(page));
            const arrived = page.waitForEvent('download', {timeout: 20_000}).catch(() => null);
            const answered = page.waitForResponse((r) => /\/api\/v1\/stats\/sushi\/reports\/[a-z0-9_]+/i.test(r.url()), {timeout: T}).catch(() => null);
            await win.downloadButton.click();
            const r = await answered;
            o.request = r ? {url: rel(r.url()).replace(/^.*\/api\/v1/, '/api/v1'), status: r.status()} : null;
            const file = await arrived;
            if (file) {
                const text = fs.readFileSync(await file.path(), 'utf8');
                const t = readTsv(file.suggestedFilename(), text);
                const sep = t.separator === 'tab' ? '\t' : ',';
                const lines = text.replace(/^﻿/, '').split(/\r?\n/);
                const gap = lines.findIndex((l) => l.trim() === '');
                const head = lines[gap + 1] || '';
                o.file = {name: t.name, separator: t.separator, attributes: t.filters, columns: head.slice(0, 400), itemLines: lines.slice(gap + 2).filter((l) => l.includes(it.title.split(' ')[0])).map((l) => l.slice(0, 500)).slice(0, 6), raw: t.raw.slice(0, 13)};
                o.sep = sep === '\t' ? 'tab' : 'comma';
            }
            await page.waitForTimeout(600);
            if (await win.dialog.isVisible().catch(() => false)) await win.close().catch(() => {});
            return o;
        });
    }
    // the request "Download" sent, typed in the browser: the JSON form
    const sent = facts.reports.IR && facts.reports.IR.request && facts.reports.IR.request.url;
    if (sent) {
        facts.irJson = await attempt(async () => {
            const r = await page.goto(app.url(`/index.php/${ctx}${sent}`));
            const body = r ? await r.text().catch(() => '') : '';
            const o = {address: sent, status: r && r.status()};
            try {
                const j = JSON.parse(body);
                o.attributes = (j.Report_Header && j.Report_Header.Report_Attributes) || null;
                o.itemCount = (j.Report_Items || []).length;
                o.items = (j.Report_Items || []).filter((x) => String(x.Title || x.Item || '').includes(it.title.split(' ')[0])).map((x) => ({item: flat(x.Title || x.Item, 60), contributors: x.Item_Contributors || null}));
            } catch {
                o.start = flat(body, 300);
            }
            return o;
        });
        record('counter-ir-json', await screen(page).catch(() => null));
    }
    if (app.name === 'ojs') {
        const {StatsReportsPage, CounterR4Page} = require('../../../pages/UsageStatsPages.js');
        const reportsPage = new StatsReportsPage(page, ctx);
        const r4 = new CounterR4Page(page);
        facts.r4 = await attempt(async () => {
            await reportsPage.goto();
            record('counter-reports-list', await screen(page));
            await reportsPage.reportLink('COUNTER Reports').click();
            await r4.ready();
            record('counter-r4', await screen(page));
            const out = {};
            for (const [code, label] of [['JR1', 'Journal Report 1'], ['AR1', 'Article Report 1']]) {
                out[code] = await attempt(async () => {
                    const years = (await r4.yearLinks(label).allInnerTexts()).map((s) => s.trim());
                    const year = years[years.length - 1];
                    const answered = page.waitForResponse((r) => /counter|reports/i.test(r.url()) && /attachment/.test(r.headers()['content-disposition'] || ''), {timeout: T}).catch(() => null);
                    const before = new Date().toISOString();
                    const file = await r4.downloadYear(label, year);
                    const after = new Date().toISOString();
                    const r = await answered;
                    const x = readXml(file);
                    return {years, pressed: year, name: file.name, created: x.attrs.Created, reportTag: flat(x.reportTag, 300), clockBefore: before, clockAfter: after, dateHeader: r ? r.headers().date : null};
                });
            }
            return out;
        });
    }
    await signOut(page).catch(() => {});
}

forEachApp(async (app) => {
    if (PHASE === 'counter' && !ITEM[app.name]) return;
    const facts = {phase: PHASE, line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, started: new Date().toISOString()};
    const {page, close} = await launch(app);
    try {
        if (PHASE === 'files') await filesPhase(app, page, facts);
        else await counterPhase(app, page, facts);
    } catch (e) {
        facts.error = flat(e.stack || e.message, 800);
        record(`threw-${PHASE}`, await screen(page).catch(() => null));
    } finally {
        facts.ended = new Date().toISOString();
        console.log(JSON.stringify(facts, null, 1).slice(0, 6000));
        record(`h13d-${PHASE}`, facts);
        await close();
    }
});
