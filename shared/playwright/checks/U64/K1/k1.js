// U64 claim check K1: framing and the pipeline. Purpose and Actors &
// permissions (who reaches each Statistics page, per role, every app),
// Rules 1–5 (which visits the install records, the day's log), Side
// effects, Cross-feature interactions, the canonical preamble, OMP1.
//
// Seeds its own scratch context per app (usage figures through the
// `usage[]` keys, scenarios.md), with one throwaway account per role the
// app ships, signs in as each and records every screen with screen().
// Read-only on `publicknowledge` (manager.maya reads its empty pages; a
// signed-out visit to an OMP series page writes one log line there and
// nothing else). Never changes the site's settings. td6 unticks and
// re-ticks the scratch journal's own "Public API" box.
//
// Run: PROBE_FEATURE=U64 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U64/K1/k1.js
// ONLY=ojs narrows; PHASES=seed,access,signedout,download,td6,reports,site,tab,leave,visits,files,tasks,versions,chart,sweep picks
// steps (seed runs when named or when no state-<app>.json exists yet).
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, tag, outDir} = require('../../../probe');

const PHASES = (process.env.PHASES || 'access,signedout,download,td6,reports,site,tab,leave,visits,files,tasks,versions,chart,sweep').split(',');
let facts = {};
function fact(key, value) {
    facts[key] = value;
    console.log(`[fact] ${key}: ${JSON.stringify(value).slice(0, 900)}`);
}
async function step(name, fn) {
    try {
        return await fn();
    } catch (e) {
        const msg = String((e && e.message) || e).split('\n').slice(0, 3).join(' | ');
        fact(`ERR ${name}`, msg);
        return {error: msg};
    }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');

async function snap(page, name) {
    const s = await screen(page);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

// ---------------------------------------------------------------------------
// Roles per app: key -> scenario role key (users.md section 2)

const ROLES = {
    ojs: {mgr: 'manager', ed: 'editor', pe: 'productionEditor', se: 'sectionEditor', ge: 'guestEditor',
        ce: 'copyeditor', au: 'author', rv: 'externalReviewer', rd: 'reader', sm: 'subscriptionManager'},
    omp: {mgr: 'manager', ed: 'editor', pe: 'productionEditor', se: 'sectionEditor',
        ce: 'copyeditor', au: 'author', ve: 'volumeEditor', rv: 'externalReviewer', rd: 'reader'},
    ops: {mgr: 'manager', se: 'sectionEditor', eb: 'editorialBoardMember', au: 'author', rd: 'reader'},
};
const STATS_ROLES = ['mgr', 'ed', 'pe', 'se', 'ge'];

const REPS = {
    ojs: {galleys: [{label: 'PDF', file: 'article.pdf'}, {label: 'HTML', file: 'article.html'}, {label: 'Data', file: 'notes.md', genre: 'Data Set'}]},
    omp: {publicationFormats: [{name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript'}, {name: 'HTML', file: 'article.html', genre: 'Book Manuscript'}, {name: 'Appendix', file: 'notes.md'}]},
    ops: {galleys: [{label: 'PDF', file: 'preprint.pdf'}, {label: 'HTML', file: 'preprint.html'}, {label: 'Data', file: 'not-an-image.txt', genre: 'Data Set'}]},
};
const SECTIONS = {ojs: [{abbrev: 'ART', title: 'Articles'}, {abbrev: 'REV', title: 'Reviews'}], ops: [{abbrev: 'PRE', title: 'Preprints'}, {abbrev: 'NOTE', title: 'Notes'}]};

const stateFile = (app) => path.join(outDir(), `state-${app.name}.json`);
function loadState(app) {
    try {
        return JSON.parse(fs.readFileSync(stateFile(app), 'utf8'));
    } catch {
        return null;
    }
}

async function seed(app) {
    const T = tag('u64k1');
    const roles = ROLES[app.name];
    const users = Object.entries(roles).map(([k, r]) => {
        const u = {username: `${T}${k}`, givenName: k.toUpperCase(), familyName: 'Kone', roles: [r]};
        if (k === 'se' && SECTIONS[app.name]) u.sections = [SECTIONS[app.name][0].abbrev];
        return u;
    });
    const body = {tag: T, context: {name: {en: `K1 Context ${T}`}}, users,
        usage: [{daysAgo: 1, views: 4}, {daysAgo: 3, views: 2}],
        themeOptions: {displayStats: 'bar'}};
    if (SECTIONS[app.name]) body.sections = SECTIONS[app.name];
    if (app.name === 'ojs') {
        body.issues = [
            {volume: 1, number: '1', year: 2025, published: true, galleys: [{label: 'Issue PDF', file: 'article.pdf'}],
                usage: [{daysAgo: 2, views: 3, galleyDownloads: [2]}]},
            {volume: 1, number: '2', year: 2026, published: false},
        ];
    }
    const c = await app.api.createContext(body);
    const place = (i) => {
        const o = {};
        if (SECTIONS[app.name]) o.section = SECTIONS[app.name][i].abbrev;
        if (app.name === 'ojs') o.issue = {volume: 1, number: '1', year: 2025};
        return o;
    };
    const w1 = await app.api.createSubmission({tag: `${T}w1`, context: T, submitter: `${T}au`, title: 'K1 First Work (section one)', published: true,
        ...REPS[app.name], ...place(0), ...(app.name === 'ojs' ? {jats: {file: 'article.xml', makePublic: true}} : {}),
        usage: [{daysAgo: 1, abstractViews: 5, fileViews: [2, 1, 1], ...(app.name === 'ojs' ? {jatsViews: 1} : {})}, {daysAgo: 40, fileViews: [3, 0, 0]}]});
    const w2 = await app.api.createSubmission({tag: `${T}w2`, context: T, submitter: `${T}au`, title: 'K1 Second Work (section two)', published: true,
        ...place(SECTIONS[app.name] ? 1 : 0), usage: [{daysAgo: 2, abstractViews: 3}]});
    const w3 = await app.api.createSubmission({tag: `${T}w3`, context: T, submitter: `${T}au`, title: 'K1 Unpublished Work', published: false,
        ...(SECTIONS[app.name] ? {section: SECTIONS[app.name][0].abbrev} : {})});
    const st = {T, path: c.path || T, contextId: c.contextId, issues: c.issues || [], users: Object.fromEntries(Object.keys(roles).map((k) => [k, `${T}${k}`])),
        works: {w1: {id: w1.submissionId, publicationId: w1.publicationId, reps: (w1.galleys || w1.publicationFormats || []).map((g) => g.id)},
            w2: {id: w2.submissionId, publicationId: w2.publicationId}, w3: {id: w3.submissionId, publicationId: w3.publicationId}}};
    fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
    return st;
}

// ---------------------------------------------------------------------------
// Page helpers

// "Reports" is read as the manager-level roles and the administrator only: who else opens it is
// *Statistics — editorial activity & reports*' question, not this chunk's.
function pages(app, k = 'mgr') {
    return ['stats/publications/publications', 'stats/context/context', ...(app.name === 'ojs' ? ['stats/issues/issues'] : []),
        'stats/counterR5/counterR5', ...(['se', 'ge'].includes(k) ? [] : ['stats/reports']), 'stats/editorial/editorial', 'stats/users/users'];
}

async function sideNav(page) {
    return page.locator('nav a, .p-panelmenu a').evaluateAll((as) => as.map((a) => `${a.textContent.trim().replace(/\s+/g, ' ')} -> ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}`)).catch(() => null);
}

async function visit(page, name, url, {waitApi} = {}) {
    const got = waitApi ? page.waitForResponse((r) => waitApi.test(r.url()), {timeout: 20_000}).catch(() => null) : null;
    let status = null;
    try {
        const resp = await page.goto(url);
        status = resp ? resp.status() : null;
    } catch (e) {
        status = `ERR ${String(e.message).split('\n')[0]}`;
    }
    if (got) await got;
    await idle(page).catch(() => {});
    const s = await snap(page, name);
    const h1 = await page.locator('main h1, h1').first().innerText().catch(() => null);
    const body = (s.text && (s.text.main || s.text.body)) || '';
    return {status, final: rel(page.url()), title: await page.title().catch(() => null), h1, head: String(body).replace(/\s+/g, ' ').slice(0, 220)};
}

async function articlesRows(page) {
    return page.locator('.pkpStats__panel table tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.children].map((c) => c.innerText.trim().replace(/\s+/g, ' ')).join(' | '))).catch(() => null);
}

async function counterList(page) {
    await page.locator('.counterReportsListPanel').first().waitFor({timeout: 10_000}).catch(() => {});
    await idle(page).catch(() => {});
    return page.locator('.counterReportsListPanel .listPanel__item').evaluateAll((els) => els.map((e) => e.innerText.trim().replace(/\s+/g, ' '))).catch(() => null);
}

async function errorDialog(page) {
    const d = page.getByRole('dialog').filter({hasText: /Error|not authorized/});
    if (await d.count()) return (await d.first().innerText().catch(() => '')).replace(/\s+/g, ' ');
    return null;
}

// ---------------------------------------------------------------------------
// The day's usage log (Rules 1–4): read the file the listener writes.

function logDir(app) {
    const root = path.isAbsolute(app.root) ? app.root : path.resolve(app.root);
    const cfg = fs.readFileSync(path.join(root, 'config.test.inc.php'), 'utf8');
    const m = cfg.match(/^files_dir\s*=\s*(.+)$/m);
    return path.join(m[1].trim(), 'usageStats', 'usageEventLogs');
}
function readLog(app) {
    const dir = logDir(app);
    const files = fs.readdirSync(dir).filter((f) => /^usage_events_\d{8}\.log$/.test(f)).sort();
    const f = files[files.length - 1];
    const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean).map((l) => {
        try {
            return JSON.parse(l);
        } catch {
            return null;
        }
    }).filter(Boolean);
    return {file: f, lines, dirFiles: fs.readdirSync(dir)};
}
function slim(l) {
    return {time: l.time, assocType: l.assocType, contextId: l.contextId, submissionId: l.submissionId, representationId: l.representationId,
        submissionFileId: l.submissionFileId, fileType: l.fileType, issueId: l.issueId, issueGalleyId: l.issueGalleyId,
        url: rel(l.canonicalUrl), ua: String(l.userAgent || '').slice(0, 40), country: l.country, region: l.region, city: l.city, institutionIds: l.institutionIds};
}
async function logged(app, contextId, fn) {
    const before = readLog(app).lines.length;
    const r = await fn();
    await sleep(800);
    const after = readLog(app);
    const fresh = after.lines.slice(before).filter((l) => contextId == null || l.contextId === contextId).map(slim);
    return {result: r, file: after.file, lines: fresh};
}

// ---------------------------------------------------------------------------

async function accessPhase(app, page, S, R) {
    R.access = {};
    const who = [...Object.keys(ROLES[app.name]), 'admin'];
    for (const k of who) {
        const user = k === 'admin' ? 'admin' : S.users[k];
        const out = {};
        await step(`access ${k}`, async () => {
            await signIn(page, user);
            // The backend landing's side menu (Statistics group or not)
            out.landing = await visit(page, `acc-${k}-landing`, app.url(`/index.php/${S.path}/en/submissions`));
            const nav = await sideNav(page);
            out.navStats = (nav || []).filter((t) => /\/stats\//.test(t));
            out.navCount = (nav || []).length;
            for (const p of pages(app, k)) {
                const short = p.split('/')[1];
                const v = await visit(page, `acc-${k}-${short}`, app.url(`/index.php/${S.path}/en/${p}`), {waitApi: /\/api\/v1\/stats\//});
                if (short === 'publications' && /\/stats\//.test(v.final)) v.rows = await articlesRows(page);
                if (short === 'counterR5' && /\/stats\//.test(v.final)) {
                    v.list = await counterList(page);
                    v.errorDialog = await errorDialog(page);
                }
                if (short === 'reports' && /\/stats\//.test(v.final)) {
                    v.links = await page.locator('main a').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}`)).catch(() => null);
                }
                out[short] = v;
            }
        });
        R.access[k] = out;
        fact(`access ${k}`, {nav: out.navStats, pages: Object.fromEntries(Object.entries(out).filter(([x]) => !['navStats', 'navCount', 'landing'].includes(x)).map(([x, v]) => [x, `${v.final} :: ${v.h1}`]))});
    }
    await signOut(page).catch(() => {});
}

async function signedOutPhase(app, page, S, R) {
    R.signedOut = {};
    await signOut(page).catch(() => {});
    for (const p of pages(app)) {
        const short = p.split('/')[1];
        R.signedOut[short] = await step(`so ${short}`, () => visit(page, `so-${short}`, app.url(`/index.php/${S.path}/en/${p}`)));
    }
    fact('signedOut', Object.fromEntries(Object.entries(R.signedOut).map(([k, v]) => [k, v.final])));
}

async function downloadPhase(app, page, S, R) {
    R.download = {};
    const roles = STATS_ROLES.filter((k) => ROLES[app.name][k] && k !== 'mgr');
    for (const k of roles) {
        R.download[k] = await step(`dl ${k}`, async () => {
            await signIn(page, S.users[k]);
            await visit(page, `dl-${k}-articles`, app.url(`/index.php/${S.path}/en/stats/publications/publications`), {waitApi: /\/api\/v1\/stats\//});
            await page.getByRole('button', {name: 'Download Report', exact: true}).click();
            const dlg = page.getByRole('dialog').filter({hasText: 'Download a CSV'});
            await dlg.waitFor({state: 'visible', timeout: 10_000});
            await idle(page);
            await snap(page, `dl-${k}-window`);
            const first = dlg.locator('.pkpStats__reportAction button').first();
            const label = (await first.innerText()).trim();
            const dlP = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
            await first.click();
            const dl = await dlP;
            let lines = null;
            if (dl) {
                const p = await dl.path().catch(() => null);
                if (p) lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
            }
            const closed = await dlg.waitFor({state: 'hidden', timeout: 5000}).then(() => true).catch(() => false);
            return {button: label, file: dl ? dl.suggestedFilename() : null, lineCount: lines ? lines.length : null, rows: lines ? lines.slice(-3) : null, closed};
        });
        fact(`download ${k}`, R.download[k]);
    }
    await signOut(page).catch(() => {});
}

async function openDistributionStats(page, app, S, name) {
    await visit(page, `${name}-distribution`, app.url(`/index.php/${S.path}/en/management/settings/distribution`));
    const tab = page.locator('[id="statistics-button"]');
    const has = await tab.count();
    if (has) {
        await tab.first().click();
        await idle(page);
        await sleep(400);
    }
    const s = await snap(page, `${name}-stats-tab`);
    const panel = page.locator('[role="tabpanel"]:visible').last();
    const boxes = await panel.locator('input').evaluateAll((is) => is.map((i) => ({name: i.name, type: i.type, value: i.value, checked: i.checked, label: (i.closest('label') || {}).innerText || null}))).catch(() => null);
    const tabs = await page.getByRole('tab').evaluateAll((ts) => ts.map((t) => t.innerText.trim())).catch(() => null);
    return {hasTab: has, tabs, boxes, text: (s.text && s.text.main || '').replace(/\s+/g, ' ').slice(0, 1200), panel};
}

async function savePanel(page, panel) {
    const btn = panel.getByRole('button', {name: 'Save', exact: true});
    const putP = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
    await btn.click();
    const put = await putP;
    const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
    return {put: put ? {status: put.status(), method: put.request().method(), override: put.request().headers()['x-http-method-override'] || null, body: (put.request().postData() || '').slice(0, 300)} : null, saved};
}

async function sushiGet(req, app, S, route, query = '') {
    const r = await req.get(app.url(`/index.php/${S.path}/api/v1/stats/sushi/${route}${query}`), {failOnStatusCode: false}).catch((e) => ({err: String(e.message)}));
    if (r.err) return r;
    const txt = await r.text().catch(() => '');
    return {status: r.status(), type: r.headers()['content-type'] || null, len: txt.length, head: txt.slice(0, 160)};
}

function lastMonth() {
    const d = new Date();
    const y = d.getUTCMonth() === 0 ? d.getUTCFullYear() - 1 : d.getUTCFullYear();
    const m = d.getUTCMonth() === 0 ? 12 : d.getUTCMonth();
    const mm = String(m).padStart(2, '0');
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return {begin: `${y}-${mm}-01`, end: `${y}-${mm}-${last}`};
}

async function counterAs(page, app, S, k, name) {
    const user = k === 'admin' ? 'admin' : S.users[k];
    await signIn(page, user);
    const reportsReq = page.waitForResponse((r) => /\/stats\/sushi\/reports(\?|$)/.test(r.url()), {timeout: 20_000}).catch(() => null);
    const v = await visit(page, `${name}-${k}-counter`, app.url(`/index.php/${S.path}/en/stats/counterR5/counterR5`));
    const rr = await reportsReq;
    v.reportsFetch = rr ? {status: rr.status()} : null;
    v.list = await counterList(page);
    v.errorDialog = await errorDialog(page);
    if (v.errorDialog) await snap(page, `${name}-${k}-counter-error`);
    return v;
}

async function counterDownload(page, name) {
    // Open the first report's "Edit" window and press "Download" with its defaults.
    const edit = page.locator('.counterReportsListPanel .listPanel__item').first().getByRole('button', {name: 'Edit'});
    if (!(await edit.count())) return {noRow: true};
    await edit.click();
    const dlg = page.getByRole('dialog').filter({hasText: 'Report Settings'});
    await dlg.first().waitFor({timeout: 10_000}).catch(() => {});
    await idle(page);
    await snap(page, `${name}-window`);
    const respP = page.waitForResponse((r) => /\/stats\/sushi\/reports\//.test(r.url()), {timeout: 20_000}).catch(() => null);
    const dlP = page.waitForEvent('download', {timeout: 20_000}).catch(() => null);
    await dlg.first().getByRole('button', {name: 'Download', exact: true}).click().catch(() => {});
    const resp = await respP;
    const dl = await dlP;
    await idle(page);
    const s = await snap(page, `${name}-after`);
    let head = null;
    if (dl) {
        const p = await dl.path().catch(() => null);
        if (p) head = fs.readFileSync(p, 'utf8').split('\n').slice(0, 14);
    }
    return {resp: resp ? {url: rel(resp.url()).replace(/\?.*/, ''), status: resp.status()} : null, file: dl ? dl.suggestedFilename() : null, head,
        notice: await page.locator('[role="alert"], .pkpNotification, .app__notifications').allInnerTexts().catch(() => null), dialog: s.text.dialog ? s.text.dialog.slice(0, 600) : null};
}

async function td6Phase(app, page, S, R) {
    const T = {};
    R.td6 = T;
    const req = page.context().request;
    // Public (the default): manager's tab, every statistics role's list, signed-out SUSHI reads
    await signIn(page, S.users.mgr);
    T.tabBefore = await step('tab before', async () => {
        const o = await openDistributionStats(page, app, S, 'td6-0-mgr');
        delete o.panel;
        return o;
    });
    T.figuresBefore = await step('figures before', async () => {
        await visit(page, 'td6-0-mgr-articles', app.url(`/index.php/${S.path}/en/stats/publications/publications`), {waitApi: /\/api\/v1\/stats\//});
        return articlesRows(page);
    });
    const roles = [...STATS_ROLES.filter((k) => ROLES[app.name][k]), 'admin'];
    T.public = {};
    for (const k of roles) T.public[k] = await step(`public ${k}`, () => counterAs(page, app, S, k, 'td6-1-public'));
    T.publicDl = {};
    for (const k of ['se', 'ge'].filter((x) => ROLES[app.name][x])) {
        T.publicDl[k] = await step(`public dl ${k}`, async () => {
            await counterAs(page, app, S, k, 'td6-1b-public');
            return counterDownload(page, `td6-1b-public-${k}-dl`);
        });
    }
    await signOut(page).catch(() => {});
    const lm = lastMonth();
    T.sushiPublicSignedOut = {
        status: await sushiGet(req, app, S, 'status'),
        reports: await sushiGet(req, app, S, 'reports'),
        pr: await sushiGet(req, app, S, 'reports/pr', `?begin_date=${lm.begin}&end_date=${lm.end}`),
    };
    fact('td6 public', {tab: T.tabBefore, lists: Object.fromEntries(Object.entries(T.public).map(([k, v]) => [k, (v.list || []).length + (v.errorDialog ? ' ERR ' + v.errorDialog : '')])), dl: T.publicDl, sushi: T.sushiPublicSignedOut});
    // Restrict: the manager unticks "Public API" and saves
    await signIn(page, S.users.mgr);
    T.untick = await step('untick', async () => {
        const o = await openDistributionStats(page, app, S, 'td6-2-mgr');
        const box = o.panel.locator('input[name="isSushiApiPublic"]');
        if (!(await box.count())) return {noBox: true};
        await box.first().uncheck();
        const sv = await savePanel(page, o.panel);
        await snap(page, 'td6-2-mgr-saved');
        const reread = await openDistributionStats(page, app, S, 'td6-2b-mgr-reload');
        return {save: sv, afterReload: reread.boxes};
    });
    fact('td6 untick', T.untick);
    T.restricted = {};
    for (const k of roles) T.restricted[k] = await step(`restricted ${k}`, () => counterAs(page, app, S, k, 'td6-3-restricted'));
    T.restrictedDl = {};
    T.restrictedDl.mgr = await step('restricted dl mgr', async () => {
        await counterAs(page, app, S, 'mgr', 'td6-3b-restricted');
        return counterDownload(page, 'td6-3b-restricted-mgr-dl');
    });
    // Side effects 407–408: the figures already kept, after the save
    T.figuresAfter = await step('figures after', async () => {
        await signIn(page, S.users.mgr);
        await visit(page, 'td6-3c-mgr-articles', app.url(`/index.php/${S.path}/en/stats/publications/publications`), {waitApi: /\/api\/v1\/stats\//});
        return articlesRows(page);
    });
    const mgrReq = page.context().request;
    T.sushiRestrictedMgr = {reports: await sushiGet(mgrReq, app, S, 'reports'), pr: await sushiGet(mgrReq, app, S, 'reports/pr', `?begin_date=${lm.begin}&end_date=${lm.end}`)};
    await signIn(page, 'admin');
    T.sushiRestrictedAdmin = {reports: await sushiGet(page.context().request, app, S, 'reports')};
    await signOut(page).catch(() => {});
    T.sushiRestrictedSignedOut = {
        status: await sushiGet(req, app, S, 'status'),
        reports: await sushiGet(req, app, S, 'reports'),
        pr: await sushiGet(req, app, S, 'reports/pr', `?begin_date=${lm.begin}&end_date=${lm.end}`),
    };
    fact('td6 restricted', {lists: Object.fromEntries(Object.entries(T.restricted).map(([k, v]) => [k, `${(v.list || []).length} fetch ${v.reportsFetch && v.reportsFetch.status}${v.errorDialog ? ' ERR ' + v.errorDialog : ''}`])),
        dl: T.restrictedDl, sushiMgr: T.sushiRestrictedMgr, sushiAdmin: T.sushiRestrictedAdmin, sushiSO: T.sushiRestrictedSignedOut, figs: [T.figuresBefore, T.figuresAfter]});
    // Put back: tick again, the Section editor's list again
    await signIn(page, S.users.mgr);
    T.retick = await step('retick', async () => {
        const o = await openDistributionStats(page, app, S, 'td6-4-mgr');
        const box = o.panel.locator('input[name="isSushiApiPublic"]');
        await box.first().check();
        const sv = await savePanel(page, o.panel);
        const reread = await openDistributionStats(page, app, S, 'td6-4b-mgr-reload');
        return {save: sv, afterReload: reread.boxes};
    });
    T.reticked = {};
    for (const k of ['se', 'ge'].filter((x) => ROLES[app.name][x])) T.reticked[k] = await step(`reticked ${k}`, () => counterAs(page, app, S, k, 'td6-5-public-again'));
    fact('td6 retick', {retick: T.retick, lists: Object.fromEntries(Object.entries(T.reticked).map(([k, v]) => [k, (v.list || []).length]))});
    await signOut(page).catch(() => {});
}

async function reportsPhase(app, page, S, R) {
    R.reports = {};
    for (const k of ['mgr', 'ed', 'pe', 'admin'].filter((x) => x === 'admin' || ROLES[app.name][x])) {
        R.reports[k] = await step(`reports ${k}`, async () => {
            await signIn(page, k === 'admin' ? 'admin' : S.users[k]);
            const v = await visit(page, `rep-${k}-reports`, app.url(`/index.php/${S.path}/en/stats/reports`));
            v.links = await page.locator('main a').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}`)).catch(() => null);
            const counter = page.locator('main a').filter({hasText: 'COUNTER Reports'});
            v.counterLink = await counter.count();
            if (v.counterLink) {
                await counter.first().click();
                await page.waitForLoadState('load').catch(() => {});
                await idle(page);
                const s = await snap(page, `rep-${k}-counter`);
                v.counterPage = {url: rel(page.url()), h1: await page.locator('main h1, h1').first().innerText().catch(() => null), text: (s.text.main || s.text.body || '').replace(/\s+/g, ' ').slice(0, 900)};
            }
            return v;
        });
        fact(`reports ${k}`, R.reports[k]);
    }
    await signOut(page).catch(() => {});
}

async function sitePhase(app, page, S, R) {
    R.site = {};
    for (const k of ['mgr', 'ed']) {
        if (!ROLES[app.name][k]) continue;
        R.site[k] = await step(`site ${k}`, async () => {
            await signIn(page, S.users[k]);
            return visit(page, `site-${k}-admin-settings`, app.url('/index.php/index/en/admin/settings'));
        });
    }
    R.site.admin = await step('site admin', async () => {
        await signIn(page, 'admin');
        const v = await visit(page, 'site-admin-settings', app.url('/index.php/index/en/admin/settings'));
        v.tabs = await page.getByRole('tab').evaluateAll((ts) => ts.map((t) => `${t.innerText.trim()}#${t.id}`)).catch(() => null);
        const stat = page.getByRole('tab', {name: 'Statistics', exact: true}).first();
        v.statTab = await stat.count();
        if (v.statTab) {
            await stat.click();
            await idle(page);
            await sleep(400);
            const s = await snap(page, 'site-admin-statistics');
            v.statText = (s.text.main || '').replace(/\s+/g, ' ').slice(0, 1500);
            v.saveButtons = await page.locator('[role="tabpanel"]:visible').getByRole('button', {name: 'Save'}).count();
        }
        return v;
    });
    fact('site', R.site);
    await signOut(page).catch(() => {});
}

async function tabPhase(app, page, S, R) {
    R.tab = {};
    for (const k of Object.keys(ROLES[app.name]).filter((x) => ['mgr', 'ed', 'pe', 'se', 'ge'].includes(x))) {
        R.tab[k] = await step(`tab ${k}`, async () => {
            await signIn(page, S.users[k]);
            const o = await openDistributionStats(page, app, S, `tab-${k}`);
            delete o.panel;
            o.final = rel(page.url());
            return o;
        });
        fact(`tab ${k}`, {final: R.tab[k].final, hasTab: R.tab[k].hasTab, boxes: R.tab[k].boxes});
    }
    await signOut(page).catch(() => {});
}

// Rules 1–4: visits driven on screen, read from the day's usage log.
async function visitsPhase(app, page, S, R) {
    const V = {};
    R.visits = V;
    const cid = S.contextId;
    const w1 = S.works.w1;
    const workUrl = {ojs: `article/view/${w1.id}`, omp: `catalog/book/${w1.id}`, ops: `preprint/view/${w1.id}`}[app.name];
    await signOut(page).catch(() => {});
    V.logDir = logDir(app);
    V.home = await step('home', () => logged(app, cid, () => visit(page, 'v-home', app.url(`/index.php/${S.path}`))));
    if (app.name === 'omp') V.catalog = await step('catalog', () => logged(app, cid, () => visit(page, 'v-catalog', app.url(`/index.php/${S.path}/catalog`))));
    V.work = await step('work', () => logged(app, cid, () => visit(page, 'v-work', app.url(`/index.php/${S.path}/${workUrl}`))));
    V.repeat = await step('repeat', () => logged(app, cid, async () => {
        await page.reload();
        await idle(page);
        return rel(page.url());
    }));
    // Each file link on the work's page, as a reader presses it
    const labels = app.name === 'omp' ? ['PDF', 'HTML', 'Appendix'] : ['PDF', 'HTML', 'Data'];
    V.files = {};
    for (const lab of labels) {
        V.files[lab] = await step(`file ${lab}`, () => logged(app, cid, async () => {
            await page.goto(app.url(`/index.php/${S.path}/${workUrl}`));
            await idle(page);
            const links = page.locator('main a, .page a, a').filter({hasText: new RegExp(`^\\s*${lab}\\s*$`)});
            const n = await links.count();
            if (!n) return {noLink: true, links: await page.locator('a.obj_galley_link, .pub_format a, .files a').evaluateAll((as) => as.map((a) => a.innerText.trim() + ' -> ' + a.getAttribute('href')))};
            const href = rel(await links.first().getAttribute('href'));
            const dlP = page.waitForEvent('download', {timeout: 8000}).catch(() => null);
            await links.first().click().catch(() => {});
            await page.waitForLoadState('load').catch(() => {});
            await sleep(2500);
            const dl = await dlP;
            await snap(page, `v-file-${lab}`);
            return {href, landed: rel(page.url()), download: dl ? dl.suggestedFilename() : null};
        }));
    }
    if (app.name === 'ojs') {
        V.jats = await step('jats', () => logged(app, cid, async () => {
            await page.goto(app.url(`/index.php/${S.path}/${workUrl}`));
            await idle(page);
            const l = page.getByRole('link', {name: /JATS/});
            const n = await l.count();
            if (!n) return {noLink: true};
            const href = rel(await l.first().getAttribute('href'));
            const dlP = page.waitForEvent('download', {timeout: 8000}).catch(() => null);
            await l.first().click().catch(() => {});
            await sleep(2500);
            const dl = await dlP;
            await snap(page, 'v-jats');
            return {href, landed: rel(page.url()), download: dl ? dl.suggestedFilename() : null};
        }));
        const pub = S.issues.find((i) => i.published) || S.issues[0];
        const unpub = S.issues.find((i) => !i.published);
        V.issue = await step('issue toc', () => logged(app, cid, async () => {
            await page.goto(app.url(`/index.php/${S.path}/issue/archive`));
            await idle(page);
            await snap(page, 'v-archive');
            const l = page.locator('a').filter({hasText: /Vol\. 1 No\. 1/}).first();
            await l.click();
            await idle(page);
            await snap(page, 'v-issue');
            return rel(page.url());
        }));
        V.issueGalley = await step('issue galley', () => logged(app, cid, async () => {
            const l = page.locator('a').filter({hasText: 'Issue PDF'}).first();
            if (!(await l.count())) return {noLink: true};
            const dlP = page.waitForEvent('download', {timeout: 8000}).catch(() => null);
            await l.click().catch(() => {});
            await sleep(2500);
            const dl = await dlP;
            await snap(page, 'v-issue-galley');
            return {landed: rel(page.url()), download: dl ? dl.suggestedFilename() : null};
        }));
        V.unpubIssueMgr = await step('unpub issue', () => logged(app, cid, async () => {
            await signIn(page, S.users.mgr);
            return visit(page, 'v-unpub-issue-mgr', app.url(`/index.php/${S.path}/issue/view/${unpub.id}`));
        }));
        V.pubIssueId = pub.id;
    }
    // An unpublished work, opened by its editor from the page's address
    V.unpubWorkMgr = await step('unpub work', () => logged(app, cid, async () => {
        await signIn(page, S.users.mgr);
        const u = {ojs: `article/view/${S.works.w3.id}`, omp: `catalog/book/${S.works.w3.id}`, ops: `preprint/view/${S.works.w3.id}`}[app.name];
        const a = await visit(page, 'v-unpub-work-mgr', app.url(`/index.php/${S.path}/${u}`));
        const b = await visit(page, 'v-unpub-work-mgr-version', app.url(`/index.php/${S.path}/${u}/version/${S.works.w3.publicationId}`));
        return {plain: a, version: b};
    }));
    // A signed-in reader
    V.readerSignedIn = await step('reader', () => logged(app, cid, async () => {
        await signIn(page, S.users.rd);
        return visit(page, 'v-work-reader', app.url(`/index.php/${S.path}/${workUrl}`));
    }));
    await signOut(page).catch(() => {});
    // Do Not Track, and a known robot's user agent, each in its own browser context
    const browser = page.context().browser();
    for (const [key, opts] of [['dnt', {extraHTTPHeaders: {DNT: '1'}}], ['gpc', {extraHTTPHeaders: {'Sec-GPC': '1'}}], ['robot', {userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'}]]) {
        V[key] = await step(key, () => logged(app, cid, async () => {
            const ctx = await browser.newContext({baseURL: app.baseURL, ...opts});
            const p = await ctx.newPage();
            const r = await p.goto(app.url(`/index.php/${S.path}/${workUrl}`));
            await p.waitForLoadState('load');
            const out = {status: r && r.status(), url: rel(p.url())};
            await ctx.close();
            return out;
        }));
    }
    if (app.name === 'omp') {
        V.series = await step('series', () => logged(app, null, () => visit(page, 'v-series-pk', app.url('/index.php/publicknowledge/catalog/series/monographs'))));
        V.series.lines = (V.series.lines || []).filter((l) => /series/.test(l.url));
    }
    // Rule 2: today's visits are not on the page; the range ends yesterday
    V.pageAfter = await step('page after', async () => {
        await signIn(page, S.users.mgr);
        const v = await visit(page, 'v-articles-after', app.url(`/index.php/${S.path}/en/stats/publications/publications`), {waitApi: /\/api\/v1\/stats\//});
        v.range = await page.locator('.pkpDateRange__current').first().innerText().catch(() => null);
        v.rows = await articlesRows(page);
        const j = await visit(page, 'v-context-after', app.url(`/index.php/${S.path}/en/stats/context/context`), {waitApi: /\/api\/v1\/stats\//});
        v.contextRows = await articlesRows(page);
        v.contextRange = await page.locator('.pkpDateRange__current').first().innerText().catch(() => null);
        return v;
    });
    const logNow = readLog(app);
    V.logFiles = logNow.dirFiles;
    V.todayFile = logNow.file;
    fact('visits', Object.fromEntries(Object.entries(V).map(([k, v]) => [k, v && v.lines ? v.lines.map((l) => `${l.assocType}:${l.url}:${l.fileType || ''}:${l.ua}`) : v])));
    await signOut(page).catch(() => {});
}

// Rule 1 "any of its versions": a second version made and published on screen, then the
// earlier version's page read from its address signed out.
async function versionsPhase(app, page, S, R) {
    const w = S.works.w2;
    const V = {};
    R.versions = V;
    const wfUrl = (key) => app.url(`/index.php/${S.path}/dashboard/editorial?workflowSubmissionId=${w.id}${key ? `&workflowMenuKey=${key}` : ''}`);
    if (!w.v2Published) {
        await signIn(page, S.users.mgr);
        V.make = w.v2 ? {v2: w.v2, earlier: true} : await step('new version', async () => {
            await page.goto(wfUrl(`publication_${w.publicationId}_titleAbstract`));
            await idle(page);
            await sleep(1500);
            const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
            await link.waitFor({state: 'visible', timeout: 20_000});
            await link.click();
            const d = page.getByRole('dialog').filter({hasText: 'Which version should metadata be copied from?'}).last();
            await d.getByRole('button', {name: 'Confirm', exact: true}).waitFor({timeout: 20_000});
            await idle(page);
            await sleep(800);
            const stage = d.locator('select[name="versionStage"]');
            if ((await stage.count()) && !(await stage.inputValue())) await stage.selectOption('VoR');
            const minor = d.locator('select[name="versionIsMinor"]');
            if ((await minor.count()) && (await minor.isVisible().catch(() => false)) && !(await minor.inputValue())) await minor.selectOption('false');
            const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: 20_000}).catch(() => null);
            await d.getByRole('button', {name: 'Confirm', exact: true}).click();
            const resp = await r;
            let v2 = null;
            try {
                v2 = (await resp.json()).id;
            } catch {
                /* none */
            }
            return {status: resp && resp.status(), v2};
        });
        const v2 = V.make && V.make.v2;
        if (v2) {
            V.publish = await step('publish v2', async () => {
                await page.goto(wfUrl(`publication_${v2}_titleAbstract`));
                await idle(page);
                await sleep(1500);
                if (app.name === 'ojs') {
                    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
                    const ps = new PublicationScreen(page, S.path);
                    const pr = page.waitForResponse((x) => x.url().includes('/publish') && x.request().method() !== 'GET', {timeout: 60_000}).catch(() => null);
                    await ps.publish({backIssueLabel: /Vol\. 1 No\. 1/});
                    return {status: (await pr)?.status()};
                }
                const label = app.name === 'ops' ? 'Post' : 'Publish';
                const btn = page.getByRole('button', {name: label, exact: true}).first();
                await btn.waitFor({timeout: 20_000});
                await btn.click();
                const conf = page.getByRole('dialog').filter({hasText: /Are you sure you want to (post|publish) this\?|make this catalog entry public/});
                await conf.waitFor({timeout: 20_000}).catch(() => {});
                await snap(page, 'ver-publish-confirm');
                const pr = page.waitForResponse((x) => /\/publish/.test(x.url()) && x.request().method() !== 'GET', {timeout: 30_000}).catch(() => null);
                await conf.getByRole('button', {name: label, exact: true}).last().click();
                const st = (await pr)?.status();
                await sleep(1500);
                await idle(page);
                return {status: st};
            });
            w.v2 = v2;
            w.v2Published = !!(V.publish && V.publish.status === 200);
            fs.writeFileSync(stateFile(app), JSON.stringify(S, null, 2));
        }
        await signOut(page).catch(() => {});
    }
    const base = {ojs: `article/view/${w.id}`, omp: `catalog/book/${w.id}`, ops: `preprint/view/${w.id}`}[app.name];
    V.older = await step('older version', () => logged(app, S.contextId, () => visit(page, 'ver-older', app.url(`/index.php/${S.path}/${base}/version/${w.publicationId}`))));
    V.current = await step('current version', () => logged(app, S.contextId, () => visit(page, 'ver-current', app.url(`/index.php/${S.path}/${base}`))));
    fact('versions', {make: V.make, publish: V.publish, older: V.older && {final: V.older.result && V.older.result.final, lines: (V.older.lines || []).map((l) => `${l.assocType}:${l.url}`)},
        current: V.current && {lines: (V.current.lines || []).map((l) => `${l.assocType}:${l.url}`)}});
}

// Leaving a tabbed settings page with a change unsaved: another tab, then another page.
async function leavePhase(app, page, S, R) {
    R.leave = {};
    const dialogs = [];
    const onDialog = (d) => {
        dialogs.push({type: d.type(), message: d.message().slice(0, 200)});
        d.accept().catch(() => {});
    };
    page.on('dialog', onDialog);
    try {
        await signIn(page, S.users.mgr);
        R.leave.journal = await step('leave journal tab', async () => {
            const o = await openDistributionStats(page, app, S, 'lv-mgr');
            const box = o.panel.locator('input[name="isSushiApiPublic"]').first();
            await box.uncheck();
            await page.locator('[id="license-button"]').first().click();
            await idle(page);
            await sleep(500);
            const s1 = await snap(page, 'lv-mgr-other-tab');
            await page.locator('[id="statistics-button"]').first().click();
            await sleep(500);
            const still = await box.isChecked();
            const n0 = dialogs.length;
            await page.goto(app.url(`/index.php/${S.path}/en/stats/publications/publications`)).catch((e) => null);
            await idle(page);
            const back = await openDistributionStats(page, app, S, 'lv-mgr-back');
            return {otherTabDialog: s1.text.dialog, checkedAfterTabSwitch: still, leaveDialogs: dialogs.slice(n0), afterReturn: (back.boxes || []).filter((b) => b.name)};
        });
        await signIn(page, 'admin');
        R.leave.site = await step('leave site tab', async () => {
            await page.goto(app.url('/index.php/index/en/admin/settings'));
            await idle(page);
            await page.getByRole('tab', {name: 'Statistics', exact: true}).first().click();
            await idle(page);
            await sleep(400);
            const panel = page.locator('[role="tabpanel"]:visible').last();
            const radio = panel.getByLabel('Collect the visitor\'s country', {exact: false}).first();
            const has = await radio.count();
            if (has) await radio.check();
            await page.getByRole('tab', {name: 'Site Setup', exact: true}).first().click();
            await sleep(500);
            await page.getByRole('tab', {name: 'Statistics', exact: true}).first().click();
            await sleep(400);
            const kept = has ? await radio.isChecked() : null;
            const n0 = dialogs.length;
            await page.goto(app.url('/index.php/index/en/admin')).catch(() => null);
            await idle(page);
            await page.goto(app.url('/index.php/index/en/admin/settings'));
            await idle(page);
            await page.getByRole('tab', {name: 'Statistics', exact: true}).first().click();
            await sleep(400);
            const s2 = await snap(page, 'lv-admin-site-back');
            const checked = await page.locator('[role="tabpanel"]:visible input[type=radio]:checked').evaluateAll((is) => is.map((i) => i.value));
            return {radioFound: has, keptAfterTabSwitch: kept, leaveDialogs: dialogs.slice(n0), checkedAfterReturn: checked};
        });
    } finally {
        page.off('dialog', onDialog);
    }
    fact('leave', R.leave);
    await signOut(page).catch(() => {});
}

// Rule 1: "Download Files" names each file's type (Primary / Supplementary).
async function filesPhase(app, page, S, R) {
    R.files = await step('download files', async () => {
        await signIn(page, S.users.mgr);
        await visit(page, 'f-mgr-articles', app.url(`/index.php/${S.path}/en/stats/publications/publications`), {waitApi: /\/api\/v1\/stats\//});
        await page.getByRole('button', {name: 'Download Report', exact: true}).click();
        const dlg = page.getByRole('dialog').filter({hasText: 'Download a CSV'});
        await dlg.waitFor({state: 'visible', timeout: 10_000});
        await idle(page);
        const btn = dlg.getByRole('button', {name: 'Download Files', exact: true});
        const dlP = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
        await btn.click();
        const dl = await dlP;
        let lines = null;
        if (dl) {
            const p = await dl.path().catch(() => null);
            if (p) lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean);
        }
        await signOut(page).catch(() => {});
        return {file: dl ? dl.suggestedFilename() : null, lines};
    });
    fact('files', R.files);
}

// Rule 4: the location database's routine task, by the name its report email carries (the one run
// the test API offers, which ends in error at its download: scenarios.md "POST scenarios/task").
async function tasksPhase(app, page, S, R) {
    R.tasks = await step('task', async () => {
        const r = await app.api.runTask({result: 'error'});
        const m = await app.mail.find({to: 'admin@mail.test', subject: String(r.processId)});
        return {name: r.name, task: r.task, subject: m && (m.Subject || m.subject)};
    });
    fact('tasks', R.tasks);
}

// Cross-feature: the article page's "Downloads" chart (themeOptions displayStats bar) against the page's figures
async function chartPhase(app, page, S, R) {
    // The chart counts from the work's first publication date on, so a work published today (the
    // seed's default) shows none of its past visits: a second work, published before its visits.
    if (!S.works.w4) {
        const w4 = await app.api.createSubmission({tag: `${S.T}w4`, context: S.T, submitter: `${S.T}au`, title: 'K1 Fourth Work (published earlier)', published: true,
            datePublished: '2026-07-01', ...REPS[app.name], ...(SECTIONS[app.name] ? {section: SECTIONS[app.name][0].abbrev} : {}),
            ...(app.name === 'ojs' ? {issue: {volume: 1, number: '1', year: 2025}} : {}),
            usage: [{daysAgo: 1, abstractViews: 2, fileViews: [2, 1, 1]}, {daysAgo: 40, fileViews: [3, 0, 0]}]});
        S.works.w4 = {id: w4.submissionId, publicationId: w4.publicationId};
        fs.writeFileSync(stateFile(app), JSON.stringify(S, null, 2));
    }
    R.chart4 = await step('chart4', async () => {
        const u = {ojs: `article/view/${S.works.w4.id}`, omp: `catalog/book/${S.works.w4.id}`, ops: `preprint/view/${S.works.w4.id}`}[app.name];
        await signOut(page).catch(() => {});
        const v = await visit(page, 'c-work4-chart', app.url(`/index.php/${S.path}/${u}`));
        v.data = await page.evaluate(() => (typeof pkpUsageStats === 'undefined' ? 'undefined' : {data: pkpUsageStats.data, config: pkpUsageStats.config})).catch((e) => String(e.message));
        v.unavailableShown = await page.locator('.usageStatsUnavailable').first().isVisible().catch(() => null);
        await signIn(page, S.users.mgr);
        const a = await visit(page, 'c-work4-articles', app.url(`/index.php/${S.path}/en/stats/publications/publications`), {waitApi: /\/api\/v1\/stats\//});
        // "Last 90 days" takes in both seeded days
        const got = page.waitForResponse((r) => /\/api\/v1\/stats\/publications\?/.test(r.url()), {timeout: 15_000}).catch(() => null);
        await page.locator('.pkpDateRange__button').first().click();
        await page.locator('.pkpDateRange__option').filter({hasText: 'Last 90 days'}).first().click();
        await got;
        await idle(page);
        await snap(page, 'c-work4-articles-90');
        v.articles90 = await articlesRows(page);
        await signOut(page).catch(() => {});
        return v;
    });
    fact('chart4', {data: R.chart4.data, unavailable: R.chart4.unavailableShown, rows: R.chart4.articles90});
    const w1 = S.works.w1;
    const workUrl = {ojs: `article/view/${w1.id}`, omp: `catalog/book/${w1.id}`, ops: `preprint/view/${w1.id}`}[app.name];
    await signOut(page).catch(() => {});
    R.chart = await step('chart', async () => {
        const v = await visit(page, 'c-work-chart', app.url(`/index.php/${S.path}/${workUrl}`));
        v.data = await page.evaluate(() => (typeof pkpUsageStats === 'undefined' ? 'undefined' : {data: pkpUsageStats.data, config: pkpUsageStats.config})).catch((e) => String(e.message));
        v.unavailableShown = await page.locator('.usageStatsUnavailable').first().isVisible().catch(() => null);
        v.canvas = await page.locator('canvas').count();
        v.block = await page.locator('.item.downloads_chart, [class*="downloads_chart"], [class*="usageStats"]').allInnerTexts().catch(() => null);
        return v;
    });
    fact('chart', R.chart);
}

// Cross-feature sweeps: the other Statistics pages' date range / download window; the plugins grid's "Usage event"; admin in the users list.
async function sweepPhase(app, page, S, R) {
    R.sweep = {};
    await signIn(page, S.users.mgr);
    for (const p of ['stats/editorial/editorial', 'stats/users/users']) {
        const short = p.split('/')[1];
        R.sweep[short] = await step(`sweep ${short}`, async () => {
            const v = await visit(page, `sw-mgr-${short}`, app.url(`/index.php/${S.path}/en/${p}`), {waitApi: /\/api\/v1\/stats\//});
            v.dateRange = await page.locator('.pkpDateRange__current').allInnerTexts().catch(() => null);
            v.filters = await page.getByRole('button', {name: 'Filters'}).count();
            v.download = await page.getByRole('button', {name: /Download|Export/}).allInnerTexts().catch(() => null);
            const exp = page.getByRole('button', {name: 'Export', exact: true});
            if (await exp.count()) {
                await exp.first().click();
                const d = page.getByRole('dialog').last();
                await d.waitFor({timeout: 10_000}).catch(() => {});
                await idle(page);
                const s2 = await snap(page, `sw-mgr-${short}-export`);
                v.exportWindow = (s2.text.dialog || '').replace(/\s+/g, ' ').slice(0, 700);
                const close = d.getByRole('button', {name: /^(Close|Cancel)$/}).first();
                if (await close.count()) await close.click().catch(() => {});
                await sleep(600);
            }
            return v;
        });
    }
    R.sweep.usersList = await step('users list', async () => {
        const v = await visit(page, 'sw-mgr-users-roles', app.url(`/index.php/${S.path}/en/management/settings/access`));
        const box = page.getByRole('searchbox').first();
        if (await box.count()) {
            await box.fill('admin');
            await box.press('Enter');
            await idle(page);
            await sleep(800);
        }
        const s = await snap(page, 'sw-mgr-users-admin');
        v.rows = await page.locator('table tbody tr').allInnerTexts().catch(() => null);
        return v;
    });
    await signOut(page).catch(() => {});
    R.sweep.pkUsersList = await step('pk users list', async () => {
        await signIn(page, 'manager.maya');
        const v = await visit(page, 'sw-pk-users-roles', app.url('/index.php/publicknowledge/en/management/settings/access'));
        const box = page.getByRole('searchbox').first();
        if (await box.count()) {
            await box.fill('admin');
            await box.press('Enter');
            await idle(page);
            await sleep(800);
        }
        await snap(page, 'sw-pk-users-admin');
        v.rows = await page.locator('table tbody tr').allInnerTexts().catch(() => null);
        // Rule 5: publicknowledge's own Articles page (never seeded)
        const a = await visit(page, 'sw-pk-articles', app.url('/index.php/publicknowledge/en/stats/publications/publications'), {waitApi: /\/api\/v1\/stats\//});
        v.pkArticles = {rows: await articlesRows(page), head: a.head};
        const c = await visit(page, 'sw-pk-context', app.url('/index.php/publicknowledge/en/stats/context/context'), {waitApi: /\/api\/v1\/stats\//});
        v.pkContext = {rows: await articlesRows(page), head: c.head};
        return v;
    });
    R.sweep.plugins = await step('plugins', async () => {
        await signIn(page, 'admin');
        const v = await visit(page, 'sw-admin-plugins', app.url(`/index.php/${S.path}/en/management/settings/website#plugins`));
        const tab = page.locator('[id="plugins-button"]');
        if (await tab.count()) {
            await tab.first().click();
            await idle(page);
            await sleep(1500);
        }
        await snap(page, 'sw-admin-plugins-tab');
        const row = page.locator('tr').filter({hasText: 'Usage event'});
        v.usageEventRows = await row.count();
        v.usageEvent = v.usageEventRows ? await row.first().evaluate((tr) => ({text: tr.innerText.replace(/\s+/g, ' ').slice(0, 300), boxes: [...tr.querySelectorAll('input[type=checkbox]')].map((i) => ({checked: i.checked, disabled: i.disabled}))})) : null;
        const jr = page.locator('tr').filter({hasText: 'JATS Template Plugin'});
        v.jats = (await jr.count()) ? await jr.first().evaluate((tr) => ({text: tr.innerText.replace(/\s+/g, ' ').slice(0, 200), boxes: [...tr.querySelectorAll('input[type=checkbox]')].map((i) => ({checked: i.checked, disabled: i.disabled}))})) : null;
        const reports = page.locator('tr').filter({hasText: /Report/});
        v.reportRows = await reports.evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').slice(0, 120))).catch(() => null);
        return v;
    });
    fact('sweep', R.sweep);
    await signOut(page).catch(() => {});
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    facts = {};
    const R = {app: app.name};
    let S = PHASES.includes('seed') ? null : loadState(app);
    if (!S) {
        const t0 = Date.now();
        S = await seed(app);
        fact('seed', {path: S.path, contextId: S.contextId, seconds: Math.round((Date.now() - t0) / 1000), works: S.works});
    }
    R.seed = S;
    const {page, close} = await launch(app);
    try {
        if (PHASES.includes('access')) await accessPhase(app, page, S, R);
        if (PHASES.includes('signedout')) await signedOutPhase(app, page, S, R);
        if (PHASES.includes('download')) await downloadPhase(app, page, S, R);
        if (PHASES.includes('td6')) await td6Phase(app, page, S, R);
        if (PHASES.includes('reports')) await reportsPhase(app, page, S, R);
        if (PHASES.includes('site')) await sitePhase(app, page, S, R);
        if (PHASES.includes('tab')) await tabPhase(app, page, S, R);
        if (PHASES.includes('visits')) await visitsPhase(app, page, S, R);
        if (PHASES.includes('leave')) await leavePhase(app, page, S, R);
        if (PHASES.includes('files')) await filesPhase(app, page, S, R);
        if (PHASES.includes('tasks')) await tasksPhase(app, page, S, R);
        if (PHASES.includes('versions')) await versionsPhase(app, page, S, R);
        if (PHASES.includes('chart')) await chartPhase(app, page, S, R);
        if (PHASES.includes('sweep')) await sweepPhase(app, page, S, R);
    } finally {
        record('k1', {...R, facts}, {merge: true});
        await close();
    }
});
