// Helpers for walk.js (issue report docs/issues/U64-OJS2-html-galley-missing-file-counts-view.md).
// Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {expect} = require('@playwright/test');
const {execFileSync} = require('child_process');
const {screen, shot, record, idle, drainJobs, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/** An ordinary desktop browser's name, so neither line's list of robots drops the reader's visit. */
const READER_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

/**
 * The editor adds an "HTML" galley to the submission's newest (unpublished) version, with
 * `dependent` (a file path) uploaded in the wizard's "Review Details" step under "Dependent
 * Files": Publication menu › the newest version › "Galleys" › "Add galley", the label, "Save",
 * the upload window's "Article Text", the file, "Continue", [the dependent file], "Continue",
 * "Complete". Returns the galley list before and after and the dependent upload's words.
 */
async function addHtmlGalleyWithDependent(page, app, submissionId, {file, name, dependent}) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {GalleyManager} = require('../../../pages/GalleysPages.js');
    const {UploadWizard, WIZARD_STEPS} = require('../../../pages/SubmissionFilesPages.js');
    const {pastCloseWindow} = require('../../../pages/IdentifiersPages.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const galleysLink = frame.menuLink('Galleys');
    if (app.line !== 'stable-3_5_0') {
        await expect(frame.latestVersionNode()).toBeVisible({timeout: T});
        if (!(await galleysLink.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    }
    await expect(galleysLink.last()).toBeVisible({timeout: T});
    await galleysLink.last().click();
    const galleys = new GalleyManager(page, frame);
    await galleys.expectLoaded();
    const before = await galleys.labels();
    const win = await galleys.openCreate();
    await win.type(win.labelBox(), 'HTML');
    await win.save();
    const wizard = new UploadWizard(page, 'Upload a File Ready for Publication');
    await wizard.expectOpen();
    await wizard.chooseComponent('Article Text');
    await wizard.attach(file, name);
    await wizard.continueTo(WIZARD_STEPS[1]);
    const dep = dependent ? await uploadDependent(page, {file: dependent, genre: /Image/}) : null;
    await wizard.continueTo(WIZARD_STEPS[2]);
    await wizard.complete();
    await pastCloseWindow(page);
    await idle(page);
    const after = await galleys.labels();
    record('step3-galleys', await screen(page));
    return {before, after, dependent: dep};
}

/**
 * Collect the answers to the article pages' file addresses (`article/view/…`,
 * `article/download/…`) from now on: address, status, content type.
 */
function watchFiles(page) {
    const seen = [];
    const on = (r) => {
        if (!/\/article\/(view|download)\//.test(r.url())) return;
        seen.push({url: rel(r.url()).slice(0, 200), status: r.status(), type: flat(r.headers()['content-type'], 60), kind: r.request().resourceType()});
    };
    page.context().on('response', on);
    return {list: () => seen.slice(), clear: () => seen.splice(0)};
}

/**
 * Signed out, the reader's way to a galley: the article's page, then the galley's link by its
 * label (a string for the whole label, or a RegExp). Waits for the galley page's frame and what the frame asks for. Returns the landing's
 * galley links, the galley page's address, the frame's text and pictures.
 */
async function openGalley(page, app, urlPath, label) {
    await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${urlPath}`));
    await idle(page).catch(() => {});
    const links = await page.locator('a.obj_galley_link').evaluateAll((as) => as.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')})));
    const link = page.locator('a.obj_galley_link', {hasText: label instanceof RegExp ? label : new RegExp(`^\\s*${label}\\s*$`)}).first();
    await link.waitFor({state: 'visible', timeout: T});
    await link.click();
    await page.waitForURL(/\/article\/view\/[^/]+\/[^/]+/, {timeout: T});
    await idle(page).catch(() => {});
    await sleep(3000);
    const out = {landingGalleys: links.map((l) => ({...l, href: rel(l.href)})), url: rel(page.url()), title: await page.title().catch(() => null)};
    const frameEl = page.locator('iframe').first();
    if (await frameEl.count()) {
        out.frameSrc = rel(await frameEl.getAttribute('src').catch(() => null));
        const f = page.frameLocator('iframe').first();
        out.frameText = flat(await f.locator('body').innerText({timeout: 5000}).catch(() => null), 300);
        out.pictures = await f.locator('img').evaluateAll((imgs) => imgs.map((i) => ({src: i.getAttribute('src'), drawn: i.complete && i.naturalWidth > 0}))).catch(() => null);
        out.styleSheets = await f.locator('link[rel="stylesheet"]').evaluateAll((ls) => ls.map((l) => l.getAttribute('href'))).catch(() => null);
    }
    return out;
}

/** The usage lines of the galley's files, slimmed. */
function slimLines(lines) {
    return lines.map((e) => ({time: e.time, assocType: e.assocType, submissionId: e.submissionId, representationId: e.representationId,
        submissionFileId: e.submissionFileId, fileType: e.fileType, url: rel(e.canonicalUrl), ua: flat(e.userAgent, 40)}));
}

/**
 * Statistics › "Articles" as the editor sees it: the range, the columns and the row whose title
 * starts with `title`; then "Download Report" › "Download Files", the file's columns and lines.
 */
async function readArticlesStats(page, app, title, saveAs) {
    const R = {};
    const got = page.waitForResponse((r) => /\/api\/v1\/stats\/publications\?/.test(r.url()), {timeout: T}).catch(() => null);
    await page.goto(app.url(`/index.php/${app.contextPath}/stats/publications/publications`));
    const r = await got;
    await idle(page).catch(() => {});
    await sleep(1000);
    R.request = r ? {url: decodeURIComponent(rel(r.url())).slice(0, 300), status: r.status()} : null;
    R.range = flat(await page.locator('.pkpDateRange__current').first().innerText().catch(() => null), 80);
    const table = await page.locator('.pkpStats__panel table').first().evaluate((tbl) => ({
        head: [...tbl.querySelectorAll('thead th')].map((th) => th.innerText.replace(/\s+/g, ' ').trim()),
        rows: [...tbl.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((td) => td.innerText.replace(/\s+/g, ' ').trim())),
    })).catch((e) => ({err: flat(e.message, 120)}));
    R.head = table.head;
    R.row = (table.rows || []).find((cells) => cells.some((c) => c.includes(title))) || null;
    R.rowCount = (table.rows || []).length;
    record('step7-articles', await screen(page));
    await shot(page, 'step7-articles').catch(() => {});
    await page.getByRole('button', {name: 'Download Report', exact: true}).click();
    const dlg = page.getByRole('dialog').filter({hasText: 'Download a CSV'});
    await dlg.waitFor({state: 'visible', timeout: T});
    record('step8-download-window', await screen(page));
    const dlP = page.waitForEvent('download', {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Download Files', exact: true}).click();
    const d = await dlP;
    if (d) {
        const p = await d.path().catch(() => null);
        const text = p ? fs.readFileSync(p, 'utf8') : '';
        if (p && saveAs) fs.copyFileSync(p, saveAs);
        const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
        R.file = {name: d.suggestedFilename(), lines: lines.slice(0, 12), html: lines.filter((l) => /\.html/i.test(l))};
    } else {
        R.file = null;
    }
    return R;
}


// ---------------------------------------------------------------------------
// Copied from other reports' kept scripts, so this folder stands alone.

// From ../lens-formulas-not-typeset/lib.js.
/**
 * The editor adds a galley with a file to the submission's newest
 * (unpublished) version: Publication menu › the newest version ›
 * "Galleys" › "Add galley", the label, "Save", then the upload window
 * (component, file, "Continue" twice, "Complete").
 */
async function addGalleyToLatestVersion(page, app, submissionId, {label, component, file, name}) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {GalleyManager} = require('../../../pages/GalleysPages.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const galleysLink = frame.menuLink('Galleys');
    if (app.line !== 'stable-3_5_0') {
        await expect(frame.latestVersionNode()).toBeVisible({timeout: T});
        if (!(await galleysLink.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    }
    await expect(galleysLink.last()).toBeVisible({timeout: T});
    await galleysLink.last().click();
    const galleys = new GalleyManager(page, frame);
    await galleys.expectLoaded();
    const before = await galleys.labels();
    await galleys.addGalley({label, component, file, name});
    await idle(page);
    const after = await galleys.labels();
    record('step3-galleys', await screen(page));
    return {before, after};
}

// From ../older-version-pdf-reader-empty/lib.js.
/**
 * The editor publishes a submission's newest (unpublished) version from
 * its workflow: main presses the publish button, keeps what the "Review
 * Publishing Details" window preselects, "Confirm", then "Publish"; 3.5
 * presses "Publish" and the window's own "Publish". Returns the windows'
 * words and the publish request's status.
 */
async function publishLatestVersion(page, app, submissionId) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const stable35 = app.line === 'stable-3_5_0';
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const out = {submissionId, versionNodes: await frame.versionNodeLabels().catch((e) => `error ${e.message}`)};
    // The newest version's "Title & Abstract" (3.5 lists one version's pages).
    const pages = frame.menuLink('Title & Abstract');
    if (!stable35) {
        await expect(frame.latestVersionNode()).toBeVisible({timeout: T});
        if (!(await pages.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    }
    await expect(pages.last()).toBeVisible({timeout: T});
    await pages.last().click();
    await idle(page);
    record('step1-workflow', await screen(page));
    const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 60_000}).catch(() => null);
    const confirmDialog = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
    if (stable35) {
        const button = page.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
        await expect(button).toBeVisible({timeout: T});
        out.button = flat(await button.innerText());
        await button.click();
        const panelPublish = page.getByRole('dialog').getByRole('button', {name: 'Publish', exact: true}).last();
        await panelPublish.waitFor({state: 'visible', timeout: T});
        await sleep(800);
        out.window = flat(await page.getByRole('dialog').last().innerText().catch(() => null), 800);
        record('step2-publish-window', await screen(page));
        await panelPublish.click();
    } else {
        const pub = new PublicationScreen(page, app.contextPath);
        out.button = flat(await pub.publishButton().innerText().catch(() => null));
        const panel = await pub.pressPublish({or: confirmDialog});
        if (panel) {
            await sleep(500);
            out.window = flat(await panel.innerText().catch(() => null), 800);
            out.versionStage = await panel.locator('select[name="versionStage"]').inputValue().catch(() => null);
            out.assignment = await panel.locator('input[name="assignment"]:checked').getAttribute('value').catch(() => null);
            record('step2-publish-window', await screen(page));
            await shot(page, 'step2-publish-window').catch(() => {});
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        }
        await expect(confirmDialog).toBeVisible({timeout: T});
        out.confirm = flat(await confirmDialog.innerText(), 300);
        await confirmDialog.getByRole('button', {name: 'Publish', exact: true}).click();
    }
    const r = await published;
    out.publish = r ? r.status() : null;
    await idle(page);
    await sleep(1500);
    record('step2-published', await screen(page));
    return out;
}

// From ../html-file-omp-links-dead/lib.js.
/**
 * In the upload window's "Review Details" step of an HTML file: the "Dependent Files" list's
 * upload link, then in the window it opens the component (`genre`, else the first offered), the
 * file, "Continue", "Continue", "Complete". Returns the words met and the list's rows after.
 */
async function uploadDependent(page, {file, genre = /Image/}) {
    const out = {};
    const wizards = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});
    const outer = wizards().first();
    const grid = outer.locator('[id^="component-grid-files-dependent"]').first();
    await grid.waitFor({timeout: T});
    out.gridBefore = flat(await grid.innerText().catch(() => null), 200);
    const up = grid.getByRole('link', {name: /Upload/}).first();
    out.link = flat(await up.innerText().catch(() => null), 60);
    await up.click();
    await idle(page);
    await page.waitForFunction(() => document.querySelectorAll('div[id^="fileUploadWizard"]').length > 1, null, {timeout: T});
    const nested = wizards().last();
    await nested.locator('input[type="file"]').waitFor({state: 'attached', timeout: T});
    await idle(page);
    await sleep(600);
    out.window = flat(await nested.innerText().catch(() => null), 300);
    const select = nested.locator('select[id^="genreId"]');
    if (await select.count()) {
        const options = await select.locator('option').evaluateAll((els) => els.map((x) => ({v: x.value, t: x.text.trim()})).filter((x) => x.v));
        const pick = options.find((o) => genre.test(o.t)) || options[0];
        await select.selectOption(pick.v);
        out.component = pick.t;
        out.components = options.map((o) => o.t);
    }
    await nested.locator('input[type="file"]').setInputFiles(file);
    const go = nested.getByRole('button', {name: 'Continue', exact: true});
    await expect(go).toBeEnabled({timeout: T});
    record('add-3b-dependent-window', await screen(page));
    await go.click();
    await idle(page);
    await sleep(800);
    await nested.getByRole('button', {name: 'Continue', exact: true}).click();
    await idle(page);
    await sleep(800);
    await nested.getByRole('button', {name: 'Complete', exact: true}).click();
    await idle(page);
    await page.waitForFunction(() => document.querySelectorAll('div[id^="fileUploadWizard"]').length === 1, null, {timeout: T}).catch(() => {});
    await sleep(1200);
    await idle(page);
    out.gridAfter = flat(await grid.innerText().catch(() => null), 200);
    record('add-3c-dependent-listed', await screen(page));
    return out;
}

// From ../book-file-open-download-fails/lib.js: the fleet's files_dir.
function filesDir(app) {
    const repo = path.join(__dirname, '../../../../..');
    const config = path.isAbsolute(app.configFile) ? app.configFile : path.join(repo, app.configFile);
    const m = fs.readFileSync(config, 'utf8').match(/^files_dir\s*=\s*"?([^"\n]+)"?\s*$/m);
    return m ? m[1].trim() : null;
}

// From ../download-issues-stops-at-30/lib.js.
/**
 * Run the fleet's queued jobs to the end. main: the kit's `drainJobs()`. A stable line: the
 * app's `jobs.php run` until the `jobs` table is empty, because 3.5's `jobs.php work` does not
 * take the kit's `--stop-when-empty` and never ends.
 */
async function runJobs(app, config) {
    if (app.line === 'main') return drainJobs(app).then((r) => ({passes: r.passes, counts: r.counts}));
    let runs = 0;
    for (; runs < 60 && Number(sql(app, 'select count(*) from jobs')) > 0; runs++) {
        execFileSync('php', ['lib/pkp/tools/jobs.php', 'run'], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: config}, encoding: 'utf8', timeout: 120_000});
    }
    return {runs, left: sql(app, 'select count(*) from jobs'), failed: sql(app, 'select count(*) from failed_jobs')};
}

/**
 * The night between the visits and the Statistics page. The Steps say "the next day": the app's
 * daily task (`APP\tasks\UsageStatsLoader`) turns a day's log into figures the day after, and
 * the Statistics pages end their ranges at yesterday. A walk cannot wait, so this moves the
 * lines the app itself logged for the visits one day back (each line's `time`, nothing else),
 * hands the file to the loader's own stage folder under the name the app gave it, and runs the
 * app's own task and job queue on it:
 *   php lib/pkp/tools/scheduler.php test --name=APP\tasks\UsageStatsLoader
 *   php lib/pkp/tools/jobs.php work --stop-when-empty   (a stable line: `jobs.php run` until the queue is empty)
 * Returns the files and lines handed over and the `metrics_issue` rows the app compiled.
 */
async function nextDay(app) {
    const dir = path.join(filesDir(app), 'usageStats');
    const logs = path.join(dir, 'usageEventLogs');
    const stage = path.join(dir, 'stage');
    fs.mkdirSync(stage, {recursive: true});
    const back = (t) => new Date(new Date(`${t.replace(' ', 'T')}Z`).getTime() - 86_400_000).toISOString().slice(0, 19).replace('T', ' ');
    const out = {files: [], lines: 0, issueLines: 0};
    for (const f of fs.existsSync(logs) ? fs.readdirSync(logs).filter((n) => n.endsWith('.log')) : []) {
        const lines = fs.readFileSync(path.join(logs, f), 'utf8').split('\n').filter(Boolean);
        const moved = lines.map((l) => l.replace(/"time":"(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)"/, (_, t) => `"time":"${back(t)}"`));
        fs.writeFileSync(path.join(stage, f), moved.join('\n') + '\n');
        fs.unlinkSync(path.join(logs, f));
        out.files.push(f);
        out.lines += lines.length;
        out.issueLines += lines.filter((l) => /"issueId":\d+/.test(l) && !/"submissionId":\d+/.test(l)).length;
    }
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
    out.metricsIssue = sql(app, 'select count(distinct issue_id), count(*), min(date), max(date), sum(metric) from metrics_issue');
    out.left = Object.fromEntries(['stage', 'processing', 'dispatch', 'reject', 'archive'].map((d) => [d, fs.existsSync(path.join(dir, d)) ? fs.readdirSync(path.join(dir, d)) : null]));
    return out;
}

module.exports = {T, sleep, flat, rel, READER_UA, addHtmlGalleyWithDependent, watchFiles, openGalley, slimLines, readArticlesStats,
    addGalleyToLatestVersion, publishLatestVersion, uploadDependent, filesDir, runJobs, nextDay};
