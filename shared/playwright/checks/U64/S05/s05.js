// U64 claim check S05 (upstream sync S05, 2026-10-05): book files after omp 8c807c919
// (pkp/pkp-lib#13444: CatalogBookHandler::download() builds its UsageEvent with the local
// $publication). Drives what a reader's opening of a work's files writes to the day's usage
// log, then loads those lines through the "Usage statistics file loader task" and reads the
// figures on Statistics › "Articles" ("Monographs", "Preprints") and its "Download Files".
// OMP is the claim (Rule 1's last sentence, register OMP3); OJS and OPS are the read-only
// controls of the exclusivity (a PDF galley opens and counts there).
//
// Seeds its own scratch context per app and run (tag u64s05): a manager, a reader, an
// author; one published work with three files: OMP formats "PDF" (Book Manuscript),
// "HTML" (Book Manuscript), "Appendix" (no genre: the press's first component, Appendix);
// OJS and OPS galleys "PDF", "HTML", "Data" (Data Set). Nothing on publicknowledge or the
// site changes. The "PDF.js PDF Viewer" untick (phase viewer, OMP) is the scratch press's own.
//
// The load (phase load): a test install runs no routine task, and the loader refuses a log
// dated before the install day and skips today's, so the run's own lines (its context's,
// from today's log) are copied into the loader's stage folder as
// `s05<run><tag end>_usage_events_<today>.log` (load_id is varchar(50)) with each line's time moved to yesterday
// (the pages end at yesterday), and the task runs by name (scheduler.php test), its queued
// job chain drained with drainJobs(). The file name names today, a day no figures have,
// because every compile job deletes the figures of its file's day across the site.
//
// Run: PROBE_RUN=r1 PROBE_FEATURE=U64 PROBE_AGENT=ccS05 node bin/probe.js all shared/playwright/checks/U64/S05/s05.js
//      (then PROBE_RUN=r2; ONLY=omp narrows; PHASES=seed,visits,reader,viewer,load,stats picks steps)
// Facts: .reports/U64/ccS05/s05-<run>-<app>.json; snapshots s05-*-<run>-<app>.json
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, tag, outFile, drainJobs, sql, serverLog, note} = require('../../../probe');

const PHASES = (process.env.PHASES || 'seed,visits,reader,viewer,load,stats').split(',');
const RUN = process.env.PROBE_RUN || 'r0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

let facts = {};
function fact(key, value) {
    facts[key] = value;
    console.log(`[fact] ${key}: ${JSON.stringify(value).slice(0, 1200)}`);
}
async function step(name, fn) {
    try {
        return await fn();
    } catch (e) {
        const msg = flat((e && e.message) || e, 400);
        fact(`ERR ${name}`, msg);
        return {error: msg};
    }
}
async function snap(page, name) {
    const s = await screen(page);
    record(`s05-${name}`, s);
    await shot(page, `s05-${name}`).catch(() => {});
    return s;
}

const FILES = {
    ojs: {galleys: [{label: 'PDF', file: 'article.pdf'}, {label: 'HTML', file: 'article.html'}, {label: 'Data', file: 'notes.md', genre: 'Data Set'}]},
    omp: {publicationFormats: [{name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript'}, {name: 'HTML', file: 'article.html', genre: 'Book Manuscript'}, {name: 'Appendix', file: 'notes.md'}]},
    ops: {galleys: [{label: 'PDF', file: 'preprint.pdf'}, {label: 'HTML', file: 'preprint.html'}, {label: 'Data', file: 'not-an-image.txt', genre: 'Data Set'}]},
};
const LABELS = {ojs: ['PDF', 'HTML', 'Data'], omp: ['PDF', 'HTML', 'Appendix'], ops: ['PDF', 'HTML', 'Data']};
const WORK = {ojs: 'article/view', omp: 'catalog/book', ops: 'preprint/view'};
const SECTIONS = {ojs: [{abbrev: 'ART', title: 'Articles'}], ops: [{abbrev: 'PRE', title: 'Preprints'}]};

// ---------------------------------------------------------------------------
// State and seed

const stateFile = (app) => outFile("s05-state.json");
function loadState(app) {
    try {
        return JSON.parse(fs.readFileSync(stateFile(app), 'utf8'));
    } catch {
        return null;
    }
}
async function seed(app) {
    const T = tag('u64s05');
    const body = {tag: T, context: {name: {en: `S05 Context ${T}`}},
        users: [{username: `${T}mgr`, givenName: 'Mia', familyName: 'Manager', roles: ['manager']},
            {username: `${T}rd`, givenName: 'Rae', familyName: 'Reader', roles: ['reader']},
            {username: `${T}au`, givenName: 'Abe', familyName: 'Author', roles: ['author']}]};
    if (SECTIONS[app.name]) body.sections = SECTIONS[app.name];
    if (app.name === 'ojs') body.issues = [{volume: 1, number: '1', year: 2025, published: true}];
    const c = await app.api.createContext(body);
    const w = await app.api.createSubmission({tag: `${T}w`, context: T, submitter: `${T}au`, title: 'S05 Book Files Work', published: true,
        ...FILES[app.name], ...(SECTIONS[app.name] ? {section: SECTIONS[app.name][0].abbrev} : {}),
        ...(app.name === 'ojs' ? {issue: {volume: 1, number: '1', year: 2025}} : {})});
    const reps = (w.galleys || w.publicationFormats || []);
    const st = {T, path: c.path || T, contextId: c.contextId, users: {mgr: `${T}mgr`, rd: `${T}rd`},
        work: {id: w.submissionId, publicationId: w.publicationId, reps}};
    fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
    return st;
}

// ---------------------------------------------------------------------------
// The day's usage log

function usageDir(app) {
    const cfg = fs.readFileSync(app.configFile, 'utf8');
    const m = cfg.match(/^files_dir\s*=\s*"?([^"\n]+)"?\s*$/m);
    return path.join(m[1].trim(), 'usageStats');
}
const ymd = (d, sep = '') => [d.getUTCFullYear(), String(d.getUTCMonth() + 1).padStart(2, '0'), String(d.getUTCDate()).padStart(2, '0')].join(sep);
function todayLog(app) {
    return path.join(usageDir(app), 'usageEventLogs', `usage_events_${ymd(new Date())}.log`);
}
function readLines(app, contextId) {
    const f = todayLog(app);
    if (!fs.existsSync(f)) return [];
    return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => {
        try {
            return JSON.parse(l);
        } catch {
            return null;
        }
    }).filter((e) => e && e.contextId === contextId);
}
const slim = (e) => ({time: e.time, assocType: e.assocType, submissionId: e.submissionId, representationId: e.representationId,
    submissionFileId: e.submissionFileId, fileType: e.fileType, url: rel(e.canonicalUrl), ua: flat(e.userAgent, 30)});
function logWatch(app, contextId) {
    let seen = readLines(app, contextId).length;
    return () => {
        const all = readLines(app, contextId);
        const fresh = all.slice(seen).map(slim);
        seen = all.length;
        return fresh;
    };
}

// ---------------------------------------------------------------------------
// Reader-side helpers

function watchFiles(page) {
    const seen = [];
    page.on('response', (r) => {
        if (!/\/(download|view)\//.test(r.url())) return;
        seen.push({url: rel(r.url()).slice(0, 160), status: r.status(), type: r.headers()['content-type'] || null, disposition: r.headers()['content-disposition'] || null});
    });
    return seen;
}
async function readViewer(page) {
    await idle(page).catch(() => {});
    await sleep(4000);
    const frameEl = page.locator('iframe').first();
    const hasFrame = await frameEl.count().catch(() => 0);
    const frameSrc = hasFrame ? flat(await frameEl.getAttribute('src').catch(() => null), 300) : null;
    let viewer = null;
    if (hasFrame) {
        const f = page.frameLocator('iframe').first();
        const vis = (l) => l.isVisible({timeout: 3000}).catch(() => false);
        const errorShown = await vis(f.locator('#errorWrapper'));
        viewer = {
            numPages: flat(await f.locator('#numPages').innerText({timeout: 3000}).catch(() => null), 60),
            renderedPages: await f.locator('#viewer .page canvas').count().catch(() => null),
            errorBar: errorShown ? flat(await f.locator('#errorMessage').innerText().catch(() => null), 200) : null,
            bodyHead: flat(await f.locator('body').innerText({timeout: 3000}).catch(() => null), 200),
        };
    }
    return {
        url: rel(page.url()), title: await page.title().catch(() => null),
        bar: flat(await page.locator('header').first().innerText().catch(() => null), 200),
        barLinks: await page.locator('header a').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`)).then((l) => l.map(rel).slice(0, 8)).catch(() => null),
        frameSrc: rel(frameSrc), viewer,
    };
}
async function pressForDownload(page, locator, watched) {
    const dl = page.waitForEvent('download', {timeout: 12_000}).catch(() => null);
    const click = await locator.click({timeout: 10_000}).then(() => null).catch((e) => flat(e.message, 160));
    const d = await dl;
    const out = {clickError: click, download: null};
    if (d) {
        out.download = {suggestedFilename: d.suggestedFilename(), url: rel(d.url()).slice(0, 160), failure: await d.failure().catch((e) => `error ${flat(e.message, 120)}`)};
        if (!out.download.failure) {
            const p = await d.path().catch(() => null);
            if (p) out.download.bytes = fs.statSync(p).size;
        }
    }
    await sleep(1500);
    out.pageAfter = {url: rel(page.url()), title: await page.title().catch(() => null), body: flat(await page.locator('body').innerText().catch(() => ''), 200)};
    out.fileRequests = watched.splice(0);
    return out;
}
function fileLink(page, app, label) {
    const scope = app.name === 'omp' ? page.locator('.obj_monograph_full') : page.locator('body');
    return scope.locator('a').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)}).first();
}
async function openWork(app, page, S, name) {
    const r = await page.goto(app.url(`/index.php/${S.path}/${WORK[app.name]}/${S.work.id}`));
    await idle(page).catch(() => {});
    const s = await snap(page, name);
    const links = await page.locator('a').evaluateAll((as) => as.filter((a) => /\/(download|view)\//.test(a.getAttribute('href') || '')).map((a) => `${a.innerText.trim().replace(/\s+/g, ' ')} -> ${a.getAttribute('href')}`)).then((l) => l.map(rel)).catch(() => null);
    return {status: r && r.status(), title: await page.title(), fileLinks: links, snap: `s05-${name}`, textHead: flat((s.text && (s.text.main || s.text.body)) || '', 200)};
}

// Phase visits: signed out, each file as a reader opens it from the work's page.
async function visitsPhase(app, S, prefix, {signedInAs} = {}) {
    const {page, close} = await launch(app);
    const log = serverLog(app);
    const from = log.mark();
    const lines = logWatch(app, S.contextId);
    const watched = watchFiles(page);
    const errors = [];
    page.on('pageerror', (e) => errors.push(flat(e.message, 200)));
    const V = {};
    try {
        if (signedInAs) {
            await signIn(page, signedInAs, {contextPath: S.path});
            V.signedIn = signedInAs;
        }
        V.work = await step(`${prefix} work`, () => openWork(app, page, S, `${prefix}-work`));
        await sleep(800);
        V.workLines = lines();
        const labels = signedInAs ? ['PDF'] : LABELS[app.name];
        for (const lab of labels) {
            const R = {};
            V[lab] = R;
            await step(`${prefix} ${lab}`, async () => {
                await page.goto(app.url(`/index.php/${S.path}/${WORK[app.name]}/${S.work.id}`));
                await idle(page).catch(() => {});
                lines();
                watched.splice(0);
                errors.splice(0);
                const link = fileLink(page, app, lab);
                R.href = rel(await link.getAttribute('href'));
                if (lab === 'PDF' || lab === 'HTML') {
                    // Opens a view page in the same tab.
                    const doc = page.waitForResponse((r) => r.request().resourceType() === 'document' && /\/view\//.test(r.url()), {timeout: 15_000}).catch(() => null);
                    const dl = page.waitForEvent('download', {timeout: 6000}).catch(() => null);
                    await link.click();
                    const d = await doc;
                    R.viewAnswer = d ? {url: rel(d.url()), status: d.status()} : null;
                    const got = await dl;
                    R.downloadOnClick = got ? got.suggestedFilename() : null;
                    R.view = await readViewer(page);
                    R.snap = (await snap(page, `${prefix}-${lab}-view`)) && `s05-${prefix}-${lab}-view`;
                    R.fileRequests = watched.splice(0);
                    R.scriptErrors = errors.splice(0);
                    await sleep(800);
                    R.viewLines = lines();
                    if (lab === 'PDF') {
                        // The bar's "Download", then the viewer's own.
                        const barDl = page.locator('header a.download, header a', {hasText: /Download/}).first();
                        R.barDownload = await pressForDownload(page, barDl, watched);
                        await sleep(800);
                        R.barDownloadLines = lines();
                        R.viewerDownload = await pressForDownload(page, page.frameLocator('iframe').first().locator('#download, #downloadButton').first(), watched);
                        await sleep(800);
                        R.viewerDownloadLines = lines();
                        R.scriptErrorsAfter = errors.splice(0);
                    }
                } else {
                    R.press = await pressForDownload(page, link, watched);
                    R.scriptErrors = errors.splice(0);
                    await sleep(800);
                    R.lines = lines();
                    R.snap = (await snap(page, `${prefix}-${lab}-after`)) && `s05-${prefix}-${lab}-after`;
                }
            });
            fact(`${prefix} ${lab}`, R);
        }
        V.serverLog = log.since(from);
        fact(`${prefix} server log`, V.serverLog);
    } finally {
        await close();
    }
    return V;
}

// Phase viewer (OMP): "PDF.js PDF Viewer" unticked on the scratch press, the book's "PDF" pressed.
async function viewerPhase(app, S) {
    if (app.name !== 'omp') return null;
    const plugins = require('../../issues/doaj-tool-stays-on-plugins-list-when-off/lib');
    const bag = {...app, contextPath: S.path};
    const ID = 'pdfjsviewerplugin';
    const R = {};
    const {page, close} = await launch(app);
    const watched = watchFiles(page);
    const lines = logWatch(app, S.contextId);
    try {
        await signIn(page, S.users.mgr, {contextPath: S.path});
        await plugins.openPlugins(bag, page);
        R.before = await plugins.rowState(bag, page, ID);
        R.untick = await plugins.setEnabled(bag, page, ID, false);
        R.after = await plugins.rowState(bag, page, ID);
        await signOut(page);
        await page.goto(app.url(`/index.php/${S.path}/${WORK.omp}/${S.work.id}`));
        await idle(page).catch(() => {});
        lines();
        watched.splice(0);
        R.pressPdf = await pressForDownload(page, fileLink(page, app, 'PDF'), watched);
        await sleep(800);
        R.lines = lines();
        R.snap = (await snap(page, 'viewer-off-after')) && 's05-viewer-off-after';
        await signIn(page, S.users.mgr, {contextPath: S.path});
        await plugins.openPlugins(bag, page);
        R.retick = await plugins.setEnabled(bag, page, ID, true);
        R.restored = await plugins.rowState(bag, page, ID);
    } finally {
        await close();
    }
    fact('viewer off', R);
    return R;
}

// ---------------------------------------------------------------------------
// Phase load: the run's lines through the "Usage statistics file loader task".

function loadPhase(app, S) {
    const dir = usageDir(app);
    const mine = readLines(app, S.contextId);
    const y = ymd(new Date(Date.now() - 86400000), '-');
    const moved = mine.map((e) => ({...e, time: `${y}${String(e.time).slice(10)}`}));
    // load_id is a varchar(50): keep the name short.
    const name = `s05${RUN}${S.T.slice(-6)}_usage_events_${ymd(new Date())}.log`;
    fs.mkdirSync(path.join(dir, 'stage'), {recursive: true});
    fs.writeFileSync(path.join(dir, 'stage', name), moved.map((e) => JSON.stringify(e)).join('\n') + '\n');
    const R = {file: name, lines: moved.length, byAssoc: moved.reduce((o, e) => ({...o, [e.assocType]: (o[e.assocType] || 0) + 1}), {})};
    try {
        R.task = flat(execFileSync('php', ['lib/pkp/tools/scheduler.php', 'test', '--name=APP\\tasks\\UsageStatsLoader'],
            {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 180_000}), 800);
    } catch (e) {
        R.taskError = flat(`${e.stdout || ''} ${e.stderr || ''} ${e.message}`, 800);
    }
    return R;
}
async function loadAndDrain(app, S) {
    const R = loadPhase(app, S);
    const d = await drainJobs(app);
    R.drain = {passes: d.passes, counts: d.counts, output: flat(d.output, 600)};
    const dir = usageDir(app);
    R.where = Object.fromEntries(['stage', 'processing', 'dispatch', 'archive', 'reject'].map((f) => [f, fs.existsSync(path.join(dir, f)) && fs.readdirSync(path.join(dir, f)).some((x) => x.startsWith(R.file))]));
    R.metrics = sql(app, `select assoc_type, file_type, representation_id, submission_file_id, to_char(date,'YYYY-MM-DD'), metric from metrics_submission where context_id=${S.contextId} order by assoc_type, representation_id`);
    fact('load', R);
    return R;
}

// ---------------------------------------------------------------------------
// Phase stats: the manager's "Articles" page and its "Download Files" / "Download Articles".

async function statsPhase(app, S, label) {
    const {page, close} = await launch(app);
    const R = {};
    try {
        await signIn(page, S.users.mgr, {contextPath: S.path});
        const got = page.waitForResponse((r) => /\/api\/v1\/stats\/publications\?/.test(r.url()), {timeout: 20_000}).catch(() => null);
        await page.goto(app.url(`/index.php/${S.path}/en/stats/publications/publications`));
        const r = await got;
        await idle(page).catch(() => {});
        R.request = r ? {url: decodeURIComponent(rel(r.url())), status: r.status()} : null;
        await snap(page, `${label}-articles`);
        R.snap = `s05-${label}-articles`;
        R.range = await page.locator('.pkpDateRange__current').first().innerText().catch(() => null);
        R.table = await page.locator('.pkpStats__panel table').first().evaluate((tbl) => ({
            head: [...tbl.querySelectorAll('thead th')].map((th) => th.innerText.replace(/\s+/g, ' ').trim()),
            rows: [...tbl.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td,th')].map((td) => td.innerText.replace(/\s+/g, ' ').trim())),
        })).catch((e) => ({err: flat(e.message, 120)}));
        R.chartButtons = await page.locator('.pkpStats__graphSelectors button').evaluateAll((bs) => bs.map((b) => `${b.innerText.trim()}${b.getAttribute('aria-pressed') === 'true' ? ' (pressed)' : ''}`)).catch(() => null);
        for (const which of ['Download Files', 'Download Articles', 'Download Monographs', 'Download Preprints']) {
            const dlg = page.getByRole('dialog').filter({hasText: 'Download a CSV'});
            const has = await page.getByRole('button', {name: 'Download Report', exact: true}).count();
            if (!has) break;
            await page.getByRole('button', {name: 'Download Report', exact: true}).click();
            await dlg.waitFor({state: 'visible', timeout: 10_000});
            const btn = dlg.getByRole('button', {name: which, exact: true});
            if (!(await btn.count())) {
                await dlg.getByRole('button', {name: /Close/}).first().click().catch(() => {});
                await dlg.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
                await sleep(600);
                continue;
            }
            if (which === 'Download Files') await snap(page, `${label}-download-window`);
            const dlP = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
            await btn.click();
            const d = await dlP;
            let content = null;
            if (d) {
                const p = await d.path().catch(() => null);
                if (p) {
                    content = fs.readFileSync(p, 'utf8');
                    fs.copyFileSync(p, outFile(`s05-${label}-${which.replace(/\s+/g, '_')}.csv`));
                }
            }
            await dlg.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
            await sleep(600);
            R[which] = {name: d && d.suggestedFilename(), lines: content == null ? null : content.split('\n').filter(Boolean)};
        }
    } finally {
        await close();
    }
    fact(`stats ${label}`, R);
    return R;
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    facts = {app: app.name, run: RUN, phases: PHASES};
    let S = loadState(app);
    try {
        if (PHASES.includes('seed') || !S) {
            S = await seed(app);
            fact('seed', {T: S.T, path: S.path, contextId: S.contextId, work: S.work.id, reps: S.work.reps.map((r) => ({id: r.id, submissionFileId: r.submissionFileId, label: r.label || r.name}))});
        }
        if (PHASES.includes('stats')) facts.statsBefore = await step('stats before', () => statsPhase(app, S, 'before'));
        if (PHASES.includes('visits')) facts.visits = await step('visits', () => visitsPhase(app, S, 'out'));
        if (PHASES.includes('reader')) facts.reader = await step('reader', () => visitsPhase(app, S, 'rd', {signedInAs: S.users.rd}));
        if (PHASES.includes('viewer')) facts.viewer = await step('viewer', () => viewerPhase(app, S));
        if (PHASES.includes('load')) facts.load = await step('load', () => loadAndDrain(app, S));
        if (PHASES.includes('stats')) facts.statsAfter = await step('stats after', () => statsPhase(app, S, 'after'));
    } finally {
        record('s05', facts, {merge: true});
    }
});
