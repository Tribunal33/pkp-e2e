// Helpers of walk.js (issue report docs/issues/U64-OJS5-ir-a1-lists-investigation-rows.md).
// Requiring this file runs nothing. Every helper presses what a person presses, except
// `monthLater()`, which stands in for the month the Steps wait out (see its comment).
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {idle, sql} = require('../../../probe');
const {filesDir} = require('../book-file-open-download-fails/lib');
const {flat, rel, runJobs} = require('../download-issues-stops-at-30/lib');

const T = 30_000;
const REPORT_API = /\/api\/v1\/stats\/sushi\/reports\/[a-z0-9_]+/i;

/**
 * A reader on the "Current" issue presses the article's title, then (with `pdf`) "PDF" on the
 * article page. Returns the pages' statuses and whether the PDF file was served.
 */
async function readArticle(reader, app, title, {pdf = false} = {}) {
    const out = {title: flat(title, 60)};
    const r = await reader.goto(app.url(`/index.php/${app.contextPath}/en/issue/current`));
    out.issue = r ? r.status() : null;
    await idle(reader).catch(() => {});
    await reader.locator('.obj_article_summary .title a').filter({hasText: title}).first().click();
    await reader.waitForURL(/\/article\/view\/[^/]+$/, {timeout: T});
    await idle(reader).catch(() => {});
    out.articlePage = rel(reader.url());
    out.heading = flat(await reader.locator('h1').first().innerText().catch(() => null), 80);
    if (pdf) {
        const served = reader.waitForResponse((res) => /\/article\/download\//.test(res.url()), {timeout: T}).catch(() => null);
        await reader.locator('.obj_article_details a.obj_galley_link.pdf').first().click();
        const file = await served;
        out.pdf = file ? {address: rel(file.url()), status: file.status()} : null;
        out.pdfPage = rel(reader.url());
        await reader.waitForTimeout(500);
    }
    return out;
}

/**
 * The month between the visits and the report. The Steps say "after the month has ended": a
 * COUNTER report covers whole past months only, and the app's daily task
 * (`APP\tasks\UsageStatsLoader`) turns a day's log into figures. A walk cannot wait, so this
 * hands the lines the app itself logged for the visits to the loader's stage folder as the log
 * of `day` (the file renamed to that day, each line's `time` moved to it, nothing else), and
 * runs the app's own task and job queue on it:
 *   php lib/pkp/tools/scheduler.php test --name=APP\tasks\UsageStatsLoader
 *   php lib/pkp/tools/jobs.php work --stop-when-empty   (a stable line: `jobs.php run` until the queue is empty)
 * Returns the lines handed over and the monthly COUNTER rows the app compiled.
 */
async function monthLater(app, day) {
    const dir = path.join(filesDir(app), 'usageStats');
    const logs = path.join(dir, 'usageEventLogs');
    const stage = path.join(dir, 'stage');
    fs.mkdirSync(stage, {recursive: true});
    const out = {files: [], lines: []};
    const moved = [];
    for (const f of fs.existsSync(logs) ? fs.readdirSync(logs).filter((n) => n.endsWith('.log')) : []) {
        const lines = fs.readFileSync(path.join(logs, f), 'utf8').split('\n').filter(Boolean);
        for (const l of lines) {
            moved.push(l.replace(/"time":"\d{4}-\d\d-\d\d /, `"time":"${day} `));
            try {
                const j = JSON.parse(l);
                out.lines.push({time: j.time, assocType: j.assocType, submissionId: j.submissionId, representationId: j.representationId, submissionFileId: j.submissionFileId, url: rel(j.canonicalUrl || j.url || '')});
            } catch {
                out.lines.push({raw: flat(l, 120)});
            }
        }
        fs.unlinkSync(path.join(logs, f));
        out.files.push(f);
    }
    const staged = `usage_events_${day.replace(/-/g, '')}.log`;
    if (moved.length) fs.writeFileSync(path.join(stage, staged), moved.join('\n') + '\n');
    out.staged = moved.length ? staged : null;
    const repo = path.join(__dirname, '../../../../..');
    const config = path.isAbsolute(app.configFile) ? app.configFile : path.join(repo, app.configFile);
    try {
        out.loader = flat(execFileSync('php', ['lib/pkp/tools/scheduler.php', 'test', '--name=APP\\tasks\\UsageStatsLoader'], {
            cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: config}, encoding: 'utf8', timeout: 120_000,
        }), 200);
    } catch (e) {
        out.loaderError = flat(`${e.message} ${e.stdout || ''} ${e.stderr || ''}`, 500);
    }
    out.jobs = await runJobs(app, config).catch((e) => ({error: flat(e.message, 300)}));
    out.monthly = sql(app, 'select submission_id, month, metric_investigations, metric_investigations_unique, metric_requests, metric_requests_unique from metrics_counter_submission_monthly order by 1, 2');
    out.left = Object.fromEntries(['stage', 'processing', 'dispatch', 'reject', 'archive'].map((d) => [d, fs.existsSync(path.join(dir, d)) ? fs.readdirSync(path.join(dir, d)) : null]));
    return out;
}

/** One line of a delimited file into its values (double quotes honoured). */
function splitLine(line, sep) {
    const out = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
            if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') quoted = false; else cur += c;
        } else if (c === '"') quoted = true;
        else if (c === sep) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out;
}

/**
 * A downloaded COUNTER file: its "Metric_Types" and "Exceptions" header lines, the table's
 * column names, and each table row as {item, metric, total, months}. The separator is the tab
 * when the file holds one, else the comma (U64 A11).
 */
function readReport(name, text) {
    const body = text.replace(/^﻿/, '');
    const sep = body.includes('\t') ? '\t' : ',';
    const lines = body.split(/\r?\n/);
    const gap = lines.findIndex((l) => l.trim() === '');
    const header = Object.fromEntries((gap >= 0 ? lines.slice(0, gap) : lines).map((l) => { const v = splitLine(l, sep); return [v[0], v.slice(1).join(sep)]; }));
    const table = (gap >= 0 ? lines.slice(gap + 1) : []).filter((l) => l.trim() !== '').map((l) => splitLine(l, sep));
    const columns = table[0] || [];
    const m = columns.indexOf('Metric_Type');
    const rows = table.slice(1).map((v) => ({item: flat(v[0], 50), metric: v[m], total: v[m + 1], months: v.slice(m + 2)}));
    return {
        name,
        separator: sep === '\t' ? 'tab' : 'comma',
        reportId: header.Report_ID,
        metricTypes: header.Metric_Types,
        filters: header.Report_Filters,
        exceptions: header.Exceptions,
        period: header.Reporting_Period,
        columns: columns.slice(Math.max(m, 0)),
        rowCount: rows.length,
        rows,
        metricsInRows: [...new Set(rows.map((r) => r.metric))],
        raw: lines.slice(0, 24).map((l) => l.slice(0, 400)),
    };
}

/** "Download" in the open "Report Settings" window: the request, its status and the file, read. */
async function pressDownload(page, dialog) {
    const arrived = page.waitForEvent('download', {timeout: 15_000}).catch(() => null);
    const answered = page.waitForResponse((r) => REPORT_API.test(r.url()), {timeout: T}).catch(() => null);
    await dialog.getByRole('button', {name: 'Download', exact: true}).click();
    const r = await answered;
    const out = {};
    if (r) {
        out.request = `${r.request().method()} ${rel(r.url()).replace(/^.*\/api\/v1/, '/api/v1')}`;
        out.status = r.status();
    }
    const file = r && r.status() >= 400 ? null : await arrived;
    out.file = file ? readReport(file.suggestedFilename(), fs.readFileSync(await file.path(), 'utf8')) : null;
    await page.waitForTimeout(400);
    return out;
}

/**
 * A report's address typed in the browser: the JSON answer's "Metric_Type" filter and, per
 * item, its title and the metric types of its figures.
 */
async function typeReportAddress(page, url) {
    const r = await page.goto(url);
    const body = r ? await r.text().catch(() => '') : '';
    const out = {address: rel(url), status: r ? r.status() : null, contentType: r ? r.headers()['content-type'] || null : null};
    try {
        const j = JSON.parse(body);
        if (!j.Report_Header) out.start = flat(body, 300);
        const h = j.Report_Header || {};
        out.reportId = h.Report_ID;
        out.metricTypeFilter = (h.Report_Filters || []).filter((f) => f.Name === 'Metric_Type').map((f) => f.Value);
        out.exceptions = (h.Exceptions || []).map((e) => `${e.Code}:${e.Message}`);
        out.items = (j.Report_Items || []).map((i) => ({
            title: flat(i.Title || i.Item || i.Platform, 50),
            figures: (i.Performance || []).map((p) => ({period: p.Period && p.Period.Begin_Date, instances: (p.Instance || []).map((x) => `${x.Metric_Type}=${x.Count}`)})),
        }));
    } catch (e) {
        out.start = flat(body, 300);
    }
    return out;
}

module.exports = {T, flat, rel, readArticle, monthLater, splitLine, readReport, pressDownload, typeReportAddress};
