// Helpers of walk.js (issue report docs/issues/U64-A16-sushi-ir-authors-share-orcid.md).
// ../counter-ir-authors-last-only/lib.js is the same file for the A15 report, whose Steps share the
// preconditions and visits. Requiring this file runs nothing. Every helper presses what
// a person presses, except `prepare()`'s SQL (the preconditions the Steps give as SQL) and the month the
// Steps wait out (`monthLater()` of the OJS5 walk, see its comment).
const fs = require('fs');
const {idle, sql, screen, record} = require('../../../probe');
const {flat, rel, readArticle, monthLater, splitLine} = require('../ir-a1-lists-investigation-rows/lib');
const {AGE_SQL, attempt, editReport, closeWindow} = require('../counter-report-tsv-comma-separated/lib');
const {openCounterR5} = require('../section-editor-counter-r5-error-while-restricted/lib');

const T = 30_000;
const INSTALLED = '2026-06-15';
const VISIT_DAY = '2026-09-15';
const RANGE = 'begin_date=2026-07-01&end_date=2026-09-30&customer_id=0';
const ORCID = 'https://orcid.org/0000-0002-1825-0097';
// The reader's browser on a stable line: stable-3_5_0's robot list holds "HeadlessChrome" (the kit's
// browser), and a robot's visits are dropped.
const READER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

/** The two works the reader opens, per app, and the author whose ORCID iD the Steps' SQL sets. */
const WORKS = {
    ojs: {first: 'The Signalling Theory Dividends', second: 'Antimicrobial, heavy metal resistance', orcidSubmission: 1, orcidEmail: 'amwandenga@mailinator.com'},
    ops: {first: 'The Facets Of Job Satisfaction', second: 'Computer Skill Requirements for New and Existing Teachers', orcidSubmission: 2, orcidEmail: 'ckwantes@mailinator.com'},
};

/**
 * The Steps' second SQL: the author's ORCID iD on record, the one `orcid` row `IR` reads
 * (`Identity::getOrcid()`). The app stores this row when an author verifies an iD through ORCID's
 * sign-in (`PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData()`, with token rows beside
 * it) and alone when a Native XML import brings an author's `<orcid>`
 * (`NativeXmlPKPAuthorFilter`); no screen of a test install reaches ORCID.
 */
const ORCID_SQL = (submissionId, email) => `INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
SELECT a.author_id, '', 'orcid', '${ORCID}'
FROM authors a JOIN submissions s ON s.current_publication_id = a.publication_id
WHERE s.submission_id = ${submissionId} AND a.email = '${email}'`;

/** A preprint from the server's home page: its title, then (with `pdf`) "PDF". */
async function readPreprint(reader, app, title, {pdf = false} = {}) {
    const out = {title: flat(title, 60)};
    const r = await reader.goto(app.url(`/index.php/${app.contextPath}/en`));
    out.home = r ? r.status() : null;
    await idle(reader).catch(() => {});
    await reader.locator('a[id^="preprint-"]').filter({hasText: title}).first().click();
    await reader.waitForURL(/\/preprint\/view\/[^/]+$/, {timeout: T});
    await idle(reader).catch(() => {});
    out.page = rel(reader.url());
    out.heading = flat(await reader.locator('h1').first().innerText().catch(() => null), 80);
    if (pdf) {
        const served = reader.waitForResponse((res) => /\/preprint\/download\//.test(res.url()), {timeout: T}).catch(() => null);
        await reader.locator('.obj_preprint_details a.obj_galley_link.pdf, a.obj_galley_link.pdf').first().click();
        const file = await served;
        out.pdf = file ? {address: rel(file.url()), status: file.status()} : null;
        await reader.waitForTimeout(500);
    }
    return out;
}

/** The authors of the two works as stored (name order, iD), for the facts. */
function storedAuthors(app) {
    return sql(app, `select s.submission_id, a.seq, fn.setting_value || ' ' || ln.setting_value, coalesce(o.setting_value, '')
        from submissions s join authors a on a.publication_id = s.current_publication_id
        left join author_settings fn on fn.author_id = a.author_id and fn.setting_name = 'givenName' and fn.locale = 'en'
        left join author_settings ln on ln.author_id = a.author_id and ln.setting_name = 'familyName' and ln.locale = 'en'
        left join author_settings o on o.author_id = a.author_id and o.setting_name = 'orcid'
        where s.submission_id in (select distinct submission_id from metrics_counter_submission_monthly) order by 1, 2`).split('\n');
}

/**
 * The shared preconditions and visits of both reports' Steps: the two SQL statements, a signed-out
 * reader opening each work and its PDF (steps 1, 2), and the month between (step 3).
 */
async function prepare(page, app) {
    const w = WORKS[app.name];
    const facts = {};
    for (const q of AGE_SQL(INSTALLED)) sql(app, q);
    sql(app, ORCID_SQL(w.orcidSubmission, w.orcidEmail));
    facts.aged = sql(app, "select date_installed from versions where product_type = 'core' order by date_installed");
    const context = await page.context().browser().newContext(app.line && app.line !== 'main' ? {userAgent: READER} : {});
    const reader = await context.newPage();
    const open = app.name === 'ojs' ? readArticle : readPreprint;
    facts.visit1 = await attempt(() => open(reader, app, w.first, {pdf: true}));
    record('reader-first', await screen(reader).catch(() => null));
    facts.visit2 = await attempt(() => open(reader, app, w.second, {pdf: true}));
    record('reader-second', await screen(reader).catch(() => null));
    await context.close();
    const later = await attempt(() => monthLater(app, VISIT_DAY));
    facts.monthLater = {staged: later.staged, files: later.files, loaderError: later.loaderError, jobs: later.jobs, monthly: later.monthly, error: later.error};
    facts.authors = await attempt(() => storedAuthors(app));
    return facts;
}

/** A COUNTER file: its header lines, the table's columns and its rows as {column: value}. */
function readTable(name, text) {
    const body = text.replace(/^﻿/, '');
    const sep = body.includes('\t') ? '\t' : ',';
    const lines = body.split(/\r?\n/);
    const gap = lines.findIndex((l) => l.trim() === '');
    const header = Object.fromEntries((gap >= 0 ? lines.slice(0, gap) : lines).map((l) => { const v = splitLine(l, sep); return [v[0], v.slice(1).join(sep)]; }));
    const table = (gap >= 0 ? lines.slice(gap + 1) : []).filter((l) => l.trim() !== '').map((l) => splitLine(l, sep));
    const columns = table[0] || [];
    const rows = table.slice(1).map((v) => Object.fromEntries(columns.map((c, i) => [c, v[i]])));
    return {
        name,
        reportId: header.Report_ID,
        attributes: header.Report_Attributes,
        columns,
        rows: rows.map((r) => ({Item: flat(r.Item, 50), Authors: r.Authors, Metric_Type: r.Metric_Type, Reporting_Period_Total: r.Reporting_Period_Total})),
        authorsByItem: Object.fromEntries(rows.map((r) => [flat(r.Item, 50), r.Authors === undefined ? '(no Authors column)' : r.Authors])),
        lines: lines.filter((l) => /Authors|Signalling|Antimicrobial|Facets|Computer Skill/.test(l)).slice(0, 12).map((l) => l.slice(0, 400)),
    };
}

/**
 * Statistics › "Counter R5" › "Edit" on `report`, with "Authors" under "Attributes To Show" ticked
 * when `authors`, then "Download": the request, its status and the file, read.
 */
async function downloadReport(page, report, {authors = true} = {}) {
    return attempt(async () => {
        const win = await editReport(page, report);
        const box = win.dialog.getByRole('checkbox', {name: 'Authors', exact: true});
        const offered = (await box.count()) > 0;
        if (authors && offered) await box.check();
        const ticked = offered ? await box.isChecked() : null;
        record(`window-${report.replace(/\W+/g, '-').toLowerCase()}`, await screen(page));
        const arrived = page.waitForEvent('download', {timeout: 15_000}).catch(() => null);
        const answered = page.waitForResponse((r) => /\/api\/v1\/stats\/sushi\/reports\/[a-z0-9_]+/i.test(r.url()), {timeout: T}).catch(() => null);
        await win.dialog.getByRole('button', {name: 'Download', exact: true}).click();
        const r = await answered;
        const out = {report, authorsBox: {offered, ticked}};
        if (r) {
            out.request = `${r.request().method()} ${rel(r.url()).replace(/^.*\/api\/v1/, '/api/v1')}`;
            out.status = r.status();
        }
        const file = r && r.status() >= 400 ? null : await arrived;
        out.file = file ? readTable(file.suggestedFilename(), fs.readFileSync(await file.path(), 'utf8')) : null;
        await closeWindow(page, win.dialog);
        return out;
    });
}

/** The SUSHI address typed in the browser: each item's title and its contributors as answered. */
async function typeSushi(page, app, query) {
    const url = app.url(`/index.php/${app.contextPath}/api/v1/stats/sushi/reports/ir?${query}`);
    const r = await page.goto(url);
    const body = r ? await r.text().catch(() => '') : '';
    const out = {address: rel(url).replace(/^.*\/index\.php/, '/index.php'), status: r ? r.status() : null};
    try {
        const j = JSON.parse(body);
        out.attributes = (j.Report_Header && j.Report_Header.Report_Attributes) || null;
        out.exceptions = ((j.Report_Header && j.Report_Header.Exceptions) || []).map((e) => `${e.Code}:${e.Message}`);
        out.items = (j.Report_Items || []).map((i) => ({title: flat(i.Title, 50), contributors: i.Item_Contributors === undefined ? '(none)' : i.Item_Contributors}));
        out.excerpt = flat(JSON.stringify((j.Report_Items || []).map((i) => ({Title: i.Title, Item_Contributors: i.Item_Contributors}))), 1500);
    } catch {
        out.start = flat(body, 300);
    }
    return out;
}

module.exports = {T, RANGE, ORCID, WORKS, ORCID_SQL, flat, attempt, prepare, readPreprint, readTable, downloadReport, typeSushi, openCounterR5};
