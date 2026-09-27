// U64 claim check K4: "Counter R5", its "Report Settings" window, the SUSHI
// address and {OJS} Statistics › "Reports" › "COUNTER Reports" (spec body
// 122–160, Rules 19–25 at 315–368, A3, A5, OJS1).
//
// Seeds its own scratch contexts per app (published works with past
// publication dates and usage figures through the `usage[]` keys,
// scenarios.md), signs in from the roster and the scratch users, and records
// every screen with screen(). Phases, one process each or together:
//   seed      scratch context T (every permission level, two published works,
//             visits in 2025 and June–August 2026; OJS institutions) and T2
//             (one work published 2026-08-10)
//   td4       publicknowledge as manager.maya (read-only): the page, the
//             window, "Download" as filled; admin's System Information
//   fields    every report's window on T; Customer ID with the site's
//             institutional statistics off and on (POST site, put back);
//             OMP/OPS institutions added on Settings › Institutions
//   refusals  td5/td10 on publicknowledge (nothing saved: a download only)
//   sushi     Rule 23, A5, td6: the SUSHI address per role, public and
//             restricted (the journal's box on screen, the site's through
//             POST site, put back in a finally)
//   live      the fleets are installed this month, so no date is ever
//             allowed (Rule 21). This phase sets the site's
//             `counterR5StartDate` (what an upgrade from 3.3 stores) straight
//             in the test database for the phase's length and deletes it in
//             a finally, then downloads the reports (Rules 20, 22, 24, A3)
//             and ticks the site's "Platform" on screen (put back).
//   ojs1      Statistics › "Reports" › "COUNTER Reports" (OJS; OMP/OPS
//             controls)
// Run: PROBE_FEATURE=U64 PROBE_AGENT=ccK4 node bin/probe.js all shared/playwright/checks/U64/K4/k4.js
// (ONLY=ojs narrows; PHASES=seed,td4 picks steps; seed must run first once)
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const LIVE_PLATFORM_ONLY = process.env.LIVE_PLATFORM_ONLY === '1';
const PHASES = (process.env.PHASES || 'seed,td4,fields,refusals,sushi,live,ojs1').split(',');
const T = 20_000;
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sql = (app, q) => execFileSync('psql', ['-X', '-d', `${app.name}_test`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const ROLES = {
    ojs: [['mgr', 'manager'], ['ed', 'editor'], ['se', 'sectionEditor'], ['ge', 'guestEditor'], ['au', 'author'], ['rd', 'reader'], ['as', 'copyeditor']],
    omp: [['mgr', 'manager'], ['ed', 'editor'], ['se', 'sectionEditor'], ['au', 'author'], ['rd', 'reader'], ['as', 'copyeditor']],
    ops: [['mgr', 'manager'], ['se', 'sectionEditor'], ['au', 'author'], ['rd', 'reader'], ['as', 'editorialBoardMember']],
};
const FILE = {
    ojs: {galleys: [{label: 'PDF', file: 'article.pdf'}]},
    omp: {publicationFormats: [{name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript'}]},
    ops: {galleys: [{label: 'PDF', file: 'preprint.pdf'}]},
};
const REPORTS = {
    ojs: ['PR', 'PR_P1', 'TR', 'TR_J3', 'IR', 'IR_A1'],
    omp: ['PR', 'PR_P1', 'TR', 'TR_B3'],
    ops: ['PR', 'PR_P1', 'IR'],
};
const INSTITUTIONS = [{name: 'K4 Institute Alpha', ipRanges: ['10.99.0.0/16']}, {name: 'K4 Institute Beta', ipRanges: ['10.98.0.0/16']}];

let facts = {};
function fact(key, value) {
    facts[key] = value;
    console.log(`[fact] ${key}: ${flat(JSON.stringify(value), 700)}`);
}
async function step(name, fn) {
    try {
        return await fn();
    } catch (e) {
        fact(`ERR ${name}`, String((e && e.message) || e).split('\n').slice(0, 4).join(' | '));
        return null;
    }
}
async function snap(page, name) {
    const s = await screen(page);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}
function seedFile(app) {
    return path.join(outDir(), `seed-${app.name}.json`);
}
function loadSeed(app) {
    return JSON.parse(fs.readFileSync(seedFile(app), 'utf8'));
}

// ---------------------------------------------------------------- seed
async function seed(app) {
    const S = tag('u64k4');
    const ojs = app.name === 'ojs';
    const ctx = {
        tag: S,
        context: {name: {en: `K4 Journal ${S}`}},
        users: ROLES[app.name].map(([s, r]) => ({username: `${S}${s}`, givenName: s.toUpperCase(), familyName: 'K4', roles: [r]})),
    };
    if (ojs) {
        ctx.issues = [
            {volume: 1, number: '1', year: 2025, published: true, datePublished: '2025-03-01'},
            {volume: 2, number: '1', year: 2026, published: true, datePublished: '2026-06-10'},
        ];
        ctx.institutions = INSTITUTIONS;
    }
    const c = await app.api.createContext(ctx);
    const s1 = await app.api.createSubmission({
        tag: `${S}a`, context: S, submitter: `${S}au`, published: true, datePublished: '2026-06-10', title: 'K4 Summer Work', ...FILE[app.name],
        ...(ojs ? {issue: {volume: 2, number: '1', year: 2026}} : {}),
        usage: [{date: '2026-06-20', abstractViews: 2, fileViews: [1]}, {date: '2026-07-14', abstractViews: 5, fileViews: [3]}, {date: '2026-08-05', abstractViews: 4, fileViews: [2]}],
    });
    const s2 = await app.api.createSubmission({
        tag: `${S}b`, context: S, submitter: `${S}au`, published: true, datePublished: '2025-03-01', title: 'K4 Older Work', ...FILE[app.name],
        ...(ojs ? {issue: {volume: 1, number: '1', year: 2025}} : {}),
        usage: [{date: '2025-05-10', abstractViews: 3, fileViews: [2]}, {date: '2026-07-20', abstractViews: 1, fileViews: [1]}],
    });
    // T2: one work published 2026-08-10 (Rule 21, the "first publication, if later" end).
    const S2 = tag('u64k4b');
    const ctx2 = {tag: S2, context: {name: {en: `K4 Late Journal ${S2}`}}, users: [{username: `${S2}au`, roles: ['author']}]};
    if (ojs) ctx2.issues = [{volume: 1, number: '1', year: 2026, published: true, datePublished: '2026-08-10'}];
    await app.api.createContext(ctx2);
    await app.api.createSubmission({
        tag: `${S2}a`, context: S2, submitter: `${S2}au`, published: true, datePublished: '2026-08-10', title: 'K4 Late Work', ...FILE[app.name],
        ...(ojs ? {issue: {volume: 1, number: '1', year: 2026}} : {}),
        usage: [{date: '2026-08-20', abstractViews: 2, fileViews: [1]}],
    });
    const out = {
        S, path: c.path || S, contextId: c.contextId, S2,
        users: Object.fromEntries(ROLES[app.name].map(([s]) => [s, `${S}${s}`])),
        subs: [s1.submissionId, s2.submissionId],
        institutions: c.institutions || null,
    };
    fs.writeFileSync(seedFile(app), JSON.stringify(out, null, 2));
    fact('seed', out);
    return out;
}

// ---------------------------------------------------------------- page helpers
function counterURL(app, ctx) {
    return app.url(`/index.php/${ctx}/en/stats/counterR5/counterR5`);
}
async function goCounter(page, app, ctx) {
    const list = page.waitForResponse((r) => /\/stats\/sushi\/reports(\?|$)/.test(r.url()), {timeout: 15_000}).catch(() => null);
    const resp = await page.goto(counterURL(app, ctx));
    const lr = await list;
    await idle(page);
    let listBody = null;
    if (lr) listBody = flat(await lr.text().catch(() => null), 400);
    return {status: resp && resp.status(), url: page.url().replace(/^https?:\/\/[^/]+/, ''), listStatus: lr ? lr.status() : null, listBody};
}
async function counterRead(page) {
    return page.evaluate(() => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const main = document.querySelector('main') || document.body;
        const panel = main.querySelector('.counterReportsListPanel');
        return {
            h1: t(main.querySelector('h1')),
            lines: [...main.querySelectorAll('p')].map(t).filter(Boolean).slice(0, 5),
            links: [...main.querySelectorAll('a')].map((a) => ({text: t(a), href: a.getAttribute('href'), target: a.getAttribute('target')})).filter((a) => a.text),
            notices: [...main.querySelectorAll('[class*="otification"]')].map(t).filter(Boolean),
            listTitle: panel ? t(panel.querySelector('h2')) : null,
            rows: panel ? [...panel.querySelectorAll('.listPanel__item')].map((li) => ({text: t(li), id: (li.querySelector('span[id]') || {}).id || null, buttons: [...li.querySelectorAll('button')].map(t)})) : null,
            panelText: panel ? t(panel) : null,
            sideMenu: [...document.querySelectorAll('nav a, [role="navigation"] a')].map((a) => ({text: t(a) || a.textContent.trim(), href: a.getAttribute('href')})).filter((a) => /stats\//.test(a.href || '')),
        };
    });
}
function reportDialog(page) {
    return page.getByRole('dialog').filter({hasText: 'Report Settings'});
}
async function openReport(page, id) {
    const btn = page.locator('.listPanel__item', {has: page.locator(`span[id="${id}"]`)}).getByRole('button', {name: 'Edit'});
    await btn.click();
    const dlg = reportDialog(page);
    await dlg.getByRole('button', {name: 'Download', exact: true}).waitFor({timeout: T});
    await idle(page);
    return dlg;
}
async function closeReport(page) {
    const dlg = reportDialog(page);
    await dlg.getByRole('button', {name: /^Close$/}).first().click();
    await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await pause(700); // the modal store's slot (patterns pitfall 4)
}
async function formRead(page) {
    const dlg = reportDialog(page);
    return dlg.evaluate((root) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const title = t(root.querySelector('h1, h2, [class*="title"]'));
        const fields = [...root.querySelectorAll('.pkpFormField')].map((f) => {
            const head = f.querySelector('.pkpFormField__heading, legend');
            return {
                label: t(head),
                required: !!f.querySelector('.pkpFormFieldLabel__required'),
                desc: t(f.querySelector('.pkpFormField__description')),
                err: t(f.querySelector('.pkpFieldError')),
                inputs: [...f.querySelectorAll('input, select, textarea')].filter((i) => i.type !== 'hidden').map((i) => ({
                    tag: i.tagName.toLowerCase(), type: i.type, name: i.name, value: i.value, checked: i.checked,
                    label: i.labels && i.labels[0] ? t(i.labels[0]) : null,
                    options: i.tagName === 'SELECT' ? [...i.options].map((o) => ({text: t(o), value: o.value, selected: o.selected})) : undefined,
                })),
            };
        });
        const formErrors = [...root.querySelectorAll('.pkpFormPage__status, .pkpForm__errors, [role="alert"], .pkpFormPage__footer')].map(t).filter(Boolean);
        const buttons = [...root.querySelectorAll('button')].map((b) => ({text: t(b) || b.getAttribute('aria-label'), disabled: b.disabled}));
        return {title, fields, formErrors, buttons};
    });
}
function fieldErrors(form) {
    return (form.fields || []).filter((f) => f.err).map((f) => `${f.label} => ${f.err}`);
}

/** Press "Download": the request, its status and body (when not a file), the download if one comes. */
async function pressDownload(page, app, name) {
    const dlg = reportDialog(page);
    const seen = [];
    const onResp = async (r) => {
        if (!/\/stats\/sushi\/reports\//.test(r.url())) return;
        const h = r.headers();
        let body = null;
        if (!/attachment/.test(h['content-disposition'] || '')) body = flat(await r.text().catch(() => null), 1200);
        seen.push({url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status(), ct: h['content-type'], disp: h['content-disposition'] || null, accept: r.request().headers()['accept'], body});
    };
    page.on('response', onResp);
    const dl = page.waitForEvent('download', {timeout: 15_000}).catch(() => null);
    const resp = page.waitForResponse((r) => /\/stats\/sushi\/reports\//.test(r.url()), {timeout: 15_000}).catch(() => null);
    const btn = dlg.getByRole('button', {name: 'Download', exact: true});
    const disabled = await btn.isDisabled().catch(() => null);
    if (disabled) {
        page.off('response', onResp);
        return {disabled: true};
    }
    await btn.click();
    const r = await resp;
    let d = null;
    if (r && r.status() === 200) d = await dl;
    await idle(page);
    await pause(300);
    page.off('response', onResp);
    const out = {status: r ? r.status() : null, requests: seen, windowOpen: await dlg.isVisible().catch(() => false)};
    if (d) {
        out.file = d.suggestedFilename();
        const p = path.join(outDir(), `dl-${app.name}-${name}.tsv`);
        await d.saveAs(p);
        out.saved = path.basename(p);
        out.content = fs.readFileSync(p, 'utf8');
    }
    if (out.windowOpen) out.form = await formRead(page).catch((e) => ({err: e.message}));
    out.notices = await page.locator('.pkpNotify, [class*="notify"], [role="status"]').allInnerTexts().then((a) => a.map((x) => flat(x, 300)).filter(Boolean)).catch(() => []);
    return out;
}
async function setText(page, name, value) {
    const box = reportDialog(page).locator(`input[name="${name}"]`);
    await box.fill(value);
    await box.blur().catch(() => {});
}

/** One refusal case in a fresh window: open, change, "Download", read. */
async function refusal(page, app, ctxPath, reportId, label, change) {
    const dlg = await openReport(page, reportId);
    await change(dlg);
    const res = await pressDownload(page, app, `${ctxPath}-${reportId}-${label}`);
    await snap(page, `ref-${reportId}-${label}`);
    const summary = {status: res.status, errors: res.form ? fieldErrors(res.form) : null, file: res.file || null, windowOpen: res.windowOpen, body: (res.requests[0] || {}).body, url: (res.requests[0] || {}).url, notices: res.notices, disabled: res.disabled};
    fact(`refusal ${reportId} ${label}`, summary);
    if (res.windowOpen) await closeReport(page);
    else await pause(700);
    return summary;
}

// ---------------------------------------------------------------- phases
async function td4(app) {
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'manager.maya');
        const nav = await goCounter(page, app, app.contextPath);
        await snap(page, 'td4-page');
        fact('td4 page', {nav, read: await counterRead(page)});
        await loc(page, 'Counter R5 list rows', page.locator('.counterReportsListPanel .listPanel__item'));
        await loc(page, 'Counter R5 warning notice', page.locator('main [class*="otification"]'));
        await loc(page, 'Edit on the PR row', page.locator('.listPanel__item', {has: page.locator('span[id="PR"]')}).getByRole('button', {name: 'Edit'}));
        await openReport(page, 'PR');
        await snap(page, 'td4-pr-window');
        await loc(page, 'Report Settings window', reportDialog(page));
        await loc(page, 'Start Date box', reportDialog(page).locator('input[name="begin_date"]'));
        fact('td4 PR window', await formRead(page));
        const d = await pressDownload(page, app, 'td4-pr-asfilled');
        await snap(page, 'td4-pr-download');
        fact('td4 PR download as filled', {status: d.status, file: d.file, errors: d.form ? fieldErrors(d.form) : null, windowOpen: d.windowOpen, req: d.requests, notices: d.notices});
        if (d.windowOpen) await closeReport(page);
        // The fleet's installation date.
        await signIn(page, 'admin');
        await page.goto(app.url('/index.php/index/en/admin/systemInfo'));
        await idle(page);
        const s = await snap(page, 'td4-systeminfo');
        const txt = s.text && s.text.main ? s.text.main : '';
        fact('td4 system info (version rows)', flat(txt.slice(0, 1500), 1500));
        fact('td4 versions table (db)', sql(app, "select product, date_installed from versions where product_type='core'"));
    } finally {
        await close();
    }
}

async function addInstitutionsOnScreen(page, app, sd) {
    await page.goto(app.url(`/index.php/${sd.path}/en/management/settings/institutions`));
    await idle(page);
    await snap(page, 'fields-institutions-page');
    for (const inst of INSTITUTIONS) {
        await page.getByRole('button', {name: 'Add Institution'}).click();
        const dlg = page.getByRole('dialog').filter({hasText: 'Add Institution'});
        await dlg.getByRole('button', {name: 'Save'}).waitFor({timeout: T});
        await dlg.getByLabel('Name', {exact: false}).first().fill(inst.name);
        const ip = dlg.locator('textarea[name="ipRanges"], textarea').first();
        await ip.fill(inst.ipRanges.join('\n'));
        const w = page.waitForResponse((r) => /api\/v1\/institutions/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'Save'}).click();
        const r = await w;
        fact(`fields institution add ${inst.name}`, r ? r.status() : null);
        await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await pause(700);
    }
    await idle(page);
    await snap(page, 'fields-institutions-after');
}

async function fields(app) {
    const sd = loadSeed(app);
    const {page, close} = await launch(app);
    try {
        await signIn(page, sd.users.mgr, {contextPath: sd.path});
        if (app.name !== 'ojs') await step('institutions on screen', () => addInstitutionsOnScreen(page, app, sd));
        const nav = await goCounter(page, app, sd.path);
        await snap(page, 'fields-page');
        fact('fields page', {nav, read: await counterRead(page)});
        for (const id of REPORTS[app.name]) {
            await step(`fields ${id}`, async () => {
                await openReport(page, id);
                await snap(page, `fields-${id}`);
                fact(`fields ${id}`, await formRead(page));
                await closeReport(page);
            });
        }
        // Left once with something changed and unsaved: the window reopened.
        await step('fields unsaved change', async () => {
            const dlg = await openReport(page, 'PR');
            await setText(page, 'begin_date', '2026-01');
            await dlg.locator('input[name="metric_type"]').first().uncheck().catch(() => {});
            await closeReport(page);
            fact('fields dialogs on close', 'see run record dialogs');
            await openReport(page, 'PR');
            await snap(page, 'fields-pr-reopened');
            const f = await formRead(page);
            fact('fields PR reopened after unsaved change', f.fields.map((x) => ({label: x.label, inputs: x.inputs.map((i) => (i.type === 'checkbox' ? `${i.label}:${i.checked}` : i.value))})));
            await closeReport(page);
        });
        // Customer ID with the site's institutional statistics on.
        try {
            fact('fields site institutional on', await app.api.setSite({enableInstitutionUsageStats: true}));
            await goCounter(page, app, sd.path);
            await openReport(page, 'PR');
            await snap(page, 'fields-pr-inst-on');
            const f = await formRead(page);
            fact('fields PR Customer ID (site institutional on)', f.fields.filter((x) => /Customer/.test(x.label || '')));
            await closeReport(page);
        } finally {
            fact('fields site institutional restored', await app.api.setSite({enableInstitutionUsageStats: false}).catch((e) => e.message));
        }
    } finally {
        await close();
    }
}

async function refusals(app) {
    const sd = loadSeed(app);
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'manager.maya');
        await goCounter(page, app, app.contextPath);
        const ctx = app.contextPath;
        await step('start 2001-01', () => refusal(page, app, ctx, 'PR', 'start-2001-01', () => setText(page, 'begin_date', '2001-01')));
        await step('end 2099-01', () => refusal(page, app, ctx, 'PR', 'end-2099-01', () => setText(page, 'end_date', '2099-01')));
        await step('start 2026-13-01', () => refusal(page, app, ctx, 'PR', 'start-2026-13-01', () => setText(page, 'begin_date', '2026-13-01')));
        await step('start 2026/07/01', () => refusal(page, app, ctx, 'PR', 'start-slashes', () => setText(page, 'begin_date', '2026/07/01')));
        await step('end empty', () => refusal(page, app, ctx, 'PR', 'end-empty', () => setText(page, 'end_date', '')));
        await step('start after end', () => refusal(page, app, ctx, 'PR', 'start-after-end', async () => {
            await setText(page, 'begin_date', '2026-08-01');
            await setText(page, 'end_date', '2026-07-01');
        }));
        await step('metric none', () => refusal(page, app, ctx, 'PR', 'metric-none', async (dlg) => {
            for (const box of await dlg.locator('input[name="metric_type"]').all()) await box.uncheck();
        }));
        if (REPORTS[app.name].includes('TR')) {
            await step('yop 1999-', () => refusal(page, app, ctx, 'TR', 'yop-1999-', () => setText(page, 'yop', '1999-')));
            await step('yop valid', () => refusal(page, app, ctx, 'TR', 'yop-valid', () => setText(page, 'yop', '2020|2021-2022')));
        }
        if (REPORTS[app.name].includes('IR')) {
            await step('item 999999', () => refusal(page, app, ctx, 'IR', 'item-999999', () => setText(page, 'item_id', '999999')));
            await step('item other journal', () => refusal(page, app, ctx, 'IR', 'item-otherjournal', () => setText(page, 'item_id', String(sd.subs[0]))));
        }
    } finally {
        await close();
    }
}

const SUSHI_PATHS = ['status', 'members', 'reports', 'reports/pr'];
async function sushiGets(page, app, ctxPath, who) {
    const out = {};
    for (const p of SUSHI_PATHS) {
        const r = await page.request.get(app.url(`/index.php/${ctxPath}/api/v1/stats/sushi/${p}`), {headers: {Accept: 'application/json'}}).catch((e) => ({err: e.message}));
        if (r.err) {
            out[p] = r.err;
            continue;
        }
        const body = await r.text().catch(() => '');
        out[p] = `${r.status()} ${flat(body, 160)}`;
    }
    fact(`sushi GET as ${who}`, out);
    return out;
}
async function distributionStats(page, app, ctxPath) {
    await page.goto(app.url(`/index.php/${ctxPath}/en/management/settings/distribution`));
    await idle(page);
    const btn = page.locator('#statistics-button').first();
    if (!(await btn.count())) return null;
    await btn.click();
    const panel = page.locator('#statistics');
    await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return panel;
}
async function setJournalPublic(page, app, sd, value, label) {
    await signIn(page, sd.users.mgr, {contextPath: sd.path});
    const panel = await distributionStats(page, app, sd.path);
    await snap(page, `sushi-dist-${label}-before`);
    const box = panel.getByLabel('Make the COUNTER SUSHI statistics publicly available');
    fact(`sushi journal box before (${label})`, {count: await box.count(), checked: await box.isChecked().catch(() => null)});
    if (value) await box.check();
    else await box.uncheck();
    const w = page.waitForResponse((r) => /api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: T}).catch(() => {});
    const saved = await snap(page, `sushi-dist-${label}-saved`);
    const panel2 = await distributionStats(page, app, sd.path);
    await snap(page, `sushi-dist-${label}-reload`);
    fact(`sushi journal box saved (${label})`, {status: r ? r.status() : null, afterReload: await panel2.getByLabel('Make the COUNTER SUSHI statistics publicly available').isChecked().catch(() => null)});
    return saved;
}
async function roleCounter(browserPage, app, sd, user, label) {
    const page = browserPage;
    if (user) await signIn(page, user, {contextPath: sd.path});
    const nav = await goCounter(page, app, sd.path);
    await snap(page, `sushi-counter-${label}`);
    const read = await counterRead(page);
    const dialogs = await page.getByRole('dialog').allInnerTexts().catch(() => []);
    fact(`sushi Counter R5 as ${label}`, {nav, h1: read.h1, rows: read.rows && read.rows.map((r) => r.text), panelText: read.panelText, notices: read.notices, dialogs: dialogs.map((d) => flat(d, 300)), menu: read.sideMenu.map((a) => a.text)});
    return read;
}

async function sushi(app) {
    const sd = loadSeed(app);
    const people = [['rd', sd.users.rd], ['au', sd.users.au], ['as', sd.users.as], ['se', sd.users.se], ...(sd.users.ge ? [['ge', sd.users.ge]] : []), ...(sd.users.ed ? [['ed', sd.users.ed]] : []), ['mgr', sd.users.mgr], ['admin', 'admin']];
    const round = async (state) => {
        // Signed out.
        const out = await launch(app);
        try {
            await sushiGets(out.page, app, sd.path, `signed out (${state})`);
        } finally {
            await out.close();
        }
        const {page, close} = await launch(app);
        try {
            for (const [label, user] of people) {
                await signIn(page, user, {contextPath: sd.path});
                if (['se', 'ge', 'ed', 'mgr', 'admin'].includes(label)) await roleCounter(page, app, sd, null, `${label}-${state}`);
                await sushiGets(page, app, sd.path, `${label} (${state})`);
            }
        } finally {
            await close();
        }
    };
    await round('public');
    // The journal's box unticked on screen.
    const {page, close} = await launch(app);
    try {
        await setJournalPublic(page, app, sd, false, 'off');
    } finally {
        await close();
    }
    try {
        await round('journal-restricted');
    } finally {
        const b = await launch(app);
        try {
            await setJournalPublic(b.page, app, sd, true, 'on');
            await roleCounter(b.page, app, sd, sd.users.se, 'se-journal-public-again');
        } finally {
            await b.close();
        }
    }
    // The site's "Public API" restricted (POST site), put back in a finally.
    try {
        fact('sushi site restricted', await app.api.setSite({isSushiApiPublic: false}));
        const b = await launch(app);
        try {
            await signIn(b.page, sd.users.mgr, {contextPath: sd.path});
            const panel = await distributionStats(b.page, app, sd.path);
            await snap(b.page, 'sushi-dist-site-restricted');
            fact('sushi journal tab while site restricted', {text: panel ? flat(await panel.innerText(), 1500) : null, box: panel ? await panel.getByLabel('Make the COUNTER SUSHI statistics publicly available').count() : null});
        } finally {
            await b.close();
        }
        await round('site-restricted');
    } finally {
        fact('sushi site restored', await app.api.setSite({isSushiApiPublic: true}).catch((e) => e.message));
    }
}

async function tsvDownload(page, app, ctxPath, reportId, label, change) {
    const dlg = await openReport(page, reportId);
    if (change) await change(dlg);
    const form = await formRead(page);
    const res = await pressDownload(page, app, `${ctxPath}-${reportId}-${label}`);
    await snap(page, `live-${reportId}-${label}`);
    const lines = res.content ? res.content.split(/\r?\n/) : null;
    fact(`live ${reportId} ${label}`, {status: res.status, file: res.file, saved: res.saved, windowOpen: res.windowOpen, errors: res.form ? fieldErrors(res.form) : null, url: (res.requests[0] || {}).url, accept: (res.requests[0] || {}).accept, ct: (res.requests[0] || {}).ct, disp: (res.requests[0] || {}).disp, body: (res.requests[0] || {}).body, notices: res.notices, dates: form.fields.filter((f) => /Date/.test(f.label || '')).map((f) => ({label: f.label, value: f.inputs[0] && f.inputs[0].value, desc: f.desc})), head: lines ? lines.slice(0, 20) : null});
    if (res.windowOpen) await closeReport(page);
    else await pause(700);
    return res;
}

async function siteStatsTab(page, app) {
    await page.goto(app.url('/index.php/index/en/admin/settings'));
    await idle(page);
    await page.locator('#setup-button').first().click().catch(() => {});
    await page.locator('#statistics-button').first().click();
    const panel = page.locator('#statistics');
    await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page);
    return panel;
}
async function saveSiteTab(page, panel) {
    const w = page.waitForResponse((r) => /api\/v1\/site/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).catch(() => {});
    return r ? r.status() : null;
}

async function live(app) {
    const sd = loadSeed(app);
    const before = sql(app, "select setting_name, setting_value from site_settings where setting_name in ('counterR5StartDate','isSiteSushiPlatform','sushiPlatformID','title') order by 1");
    fact('live site rows before', before);
    try {
        sql(app, "insert into site_settings (setting_name, locale, setting_value) values ('counterR5StartDate', '', '2026-05-01')");
        const {page, close} = await launch(app);
        try {
            await signIn(page, sd.users.mgr, {contextPath: sd.path});
            const nav = await goCounter(page, app, sd.path);
            await snap(page, 'live-page');
            fact('live page', {nav, read: await counterRead(page)});
            if (!LIVE_PLATFORM_ONLY) await liveDownloads(page, app, sd);
            // Rule 24: the site as the platform.
            await livePlatform(page, app, sd);
        } finally {
            await close();
        }
    } finally {
        sql(app, "delete from site_settings where setting_name = 'counterR5StartDate'");
        const after = sql(app, "select setting_name, setting_value from site_settings where setting_name in ('counterR5StartDate','isSiteSushiPlatform','sushiPlatformID','title') order by 1");
        fact('live site rows after', after);
    }
}

async function liveDownloads(page, app, sd) {
    {
        {
            await tsvDownload(page, app, sd.path, 'PR', 'default');
            await tsvDownload(page, app, sd.path, 'PR', 'midmonth', async () => {
                await setText(page, 'begin_date', '2026-07-14');
                await setText(page, 'end_date', '2026-08-20');
            });
            await tsvDownload(page, app, sd.path, 'PR', 'yyyymm', async () => {
                await setText(page, 'begin_date', '2026-07');
                await setText(page, 'end_date', '2026-08');
            });
            await tsvDownload(page, app, sd.path, 'PR', 'totals', async (dlg) => {
                await dlg.getByLabel('Exclude Monthly Details').check();
            });
            await tsvDownload(page, app, sd.path, 'PR', 'attributes', async (dlg) => {
                for (const box of await dlg.locator('input[name="attributes_to_show"]').all()) await box.check();
            });
            await step('live institution', () => tsvDownload(page, app, sd.path, 'PR', 'institution', async (dlg) => {
                await dlg.locator('select[name="customer_id"]').selectOption({label: 'K4 Institute Alpha'});
            }));
            for (const id of REPORTS[app.name].filter((x) => x !== 'PR')) await step(`live ${id}`, () => tsvDownload(page, app, sd.path, id, 'default'));
            if (REPORTS[app.name].includes('IR')) {
                await step('live IR item', () => tsvDownload(page, app, sd.path, 'IR', 'item', () => setText(page, 'item_id', String(sd.subs[0]))));
                await step('live IR parent', () => tsvDownload(page, app, sd.path, 'IR', 'parent', async (dlg) => {
                    const box = dlg.getByLabel('Include Parent Details');
                    if (await box.count()) await box.check();
                }));
            }
            if (REPORTS[app.name].includes('TR')) {
                await step('live TR yop 2025', () => tsvDownload(page, app, sd.path, 'TR', 'yop2025', () => setText(page, 'yop', '2025')));
            }
            // A3 isolated: only one date out of range.
            await step('live start before earliest', () => refusal(page, app, sd.path, 'PR', 'live-start-2026-01', () => setText(page, 'begin_date', '2026-01')));
            await step('live end after last', () => refusal(page, app, sd.path, 'PR', 'live-end-2026-09', () => setText(page, 'end_date', '2026-09-30')));
            await step('live end current month yyyy-mm', () => refusal(page, app, sd.path, 'PR', 'live-end-2026-09m', () => setText(page, 'end_date', '2026-09')));
            // The section editor's download while public (Actors), and the
            // SUSHI address's JSON report signed out (Rule 23, "the same reports").
            await step('live SE download', async () => {
                await signIn(page, sd.users.se, {contextPath: sd.path});
                await goCounter(page, app, sd.path);
                await tsvDownload(page, app, sd.path, 'PR', 'as-se');
                await signIn(page, sd.users.mgr, {contextPath: sd.path});
                await goCounter(page, app, sd.path);
            });
            await step('live SUSHI JSON signed out', async () => {
                const o = await launch(app);
                try {
                    const q = 'customer_id=0&begin_date=2026-06&end_date=2026-08';
                    for (const p of ['reports/pr', 'reports/pr_p1', 'members?customer_id=0']) {
                        const r = await o.page.request.get(app.url(`/index.php/${sd.path}/api/v1/stats/sushi/${p}${p.includes('?') ? '' : `?${q}`}`), {headers: {Accept: 'application/json'}});
                        const body = await r.text();
                        fs.writeFileSync(path.join(outDir(), `sushi-json-${app.name}-${p.replace(/[^a-z0-9_]/gi, '_')}.json`), body);
                        fact(`live SUSHI JSON signed out ${p}`, `${r.status()} ${flat(body, 900)}`);
                    }
                } finally {
                    await o.close();
                }
            });
            // Rule 21's "first publication, if later" end: T2 (published 2026-08-10), as admin.
            await step('live T2', async () => {
                await signIn(page, 'admin');
                const n2 = await goCounter(page, app, sd.S2);
                await snap(page, 'live-t2-page');
                fact('live T2 page', {nav: n2, read: await counterRead(page)});
                await openReport(page, 'PR');
                const f = await formRead(page);
                fact('live T2 PR dates', f.fields.filter((x) => /Date/.test(x.label || '')).map((x) => ({label: x.label, value: x.inputs[0] && x.inputs[0].value, desc: x.desc})));
                await closeReport(page);
                await signIn(page, sd.users.mgr, {contextPath: sd.path});
            });
        }
    }
}

async function livePlatform(page, app, sd) {
    {
        {
            const a = await launch(app);
            try {
                await signIn(a.page, 'admin');
                const panel = await siteStatsTab(a.page, app);
                await snap(a.page, 'live-site-tab-before');
                await panel.getByRole('checkbox', {name: /Use the site as the platform for all/}).check();
                await snap(a.page, 'live-site-tab-ticked');
                const idBox = panel.getByLabel('Platform ID', {exact: false});
                fact('live site Platform ID box', {count: await idBox.count()});
                // First an empty ID (the required-ID refusal), then an ID.
                const s0 = await saveSiteTab(a.page, panel);
                await snap(a.page, 'live-site-tab-empty-id');
                fact('live site save with empty Platform ID', {status: s0, errors: await panel.locator('.pkpFieldError').allInnerTexts().catch(() => [])});
                await idBox.first().fill('K4PLAT');
                fact('live site save with ID', await saveSiteTab(a.page, panel));
                await siteStatsTab(a.page, app);
                await snap(a.page, 'live-site-tab-reload');
                fact('live site rows platform', sql(app, "select setting_name, setting_value from site_settings where setting_name in ('isSiteSushiPlatform','sushiPlatformID','title') order by 1"));
                await goCounter(page, app, sd.path);
                await tsvDownload(page, app, sd.path, 'PR', 'siteplatform-noname');
                fact('live site title', await app.api.setSite({title: 'K4 Site Name'}));
                await goCounter(page, app, sd.path);
                await tsvDownload(page, app, sd.path, 'PR', 'siteplatform-named');
                if (REPORTS[app.name].includes('TR')) await step('live TR siteplatform', () => tsvDownload(page, app, sd.path, 'TR', 'siteplatform-named'));
            } finally {
                await step('live site restore title', () => app.api.setSite({title: ''}));
                await step('live site restore platform', async () => {
                    const panel = await siteStatsTab(a.page, app);
                    const idBox = panel.getByLabel('Platform ID', {exact: false});
                    if (await idBox.count()) await idBox.first().fill('');
                    await panel.getByRole('checkbox', {name: /Use the site as the platform for all/}).uncheck();
                    fact('live site restore save', await saveSiteTab(a.page, panel));
                });
                await a.close();
            }
        }
    }
}

async function ojs1(app) {
    const sd = loadSeed(app);
    const {page, close} = await launch(app);
    try {
        await signIn(page, sd.users.mgr, {contextPath: sd.path});
        await page.goto(app.url(`/index.php/${sd.path}/en/stats/reports`));
        await idle(page);
        const rep = await snap(page, 'ojs1-reports');
        fact('ojs1 Reports page (manager)', flat(rep.text && rep.text.main, 1500));
        const link = page.getByRole('link', {name: 'COUNTER Reports', exact: true});
        fact('ojs1 COUNTER Reports link count', await link.count());
        await loc(page, 'Statistics › Reports: COUNTER Reports link', link);
        if (!(await link.count())) {
            // Control on a press or a preprint server: the plugin's address typed.
            const r = await page.goto(app.url(`/index.php/${sd.path}/en/stats/reports/report?pluginName=CounterReportPlugin`));
            await idle(page);
            const s = await snap(page, 'ojs1-typed-plugin');
            fact('ojs1 typed plugin address (no link)', {status: r && r.status(), url: page.url().replace(/^https?:\/\/[^/]+/, ''), main: flat(s.text && s.text.main, 500)});
        }
        if (await link.count()) {
            await link.first().click();
            await page.waitForLoadState('domcontentloaded');
            await idle(page);
            await snap(page, 'ojs1-counter');
            const read = await page.evaluate(() => {
                const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
                const main = document.querySelector('main') || document.body;
                return {url: location.pathname + location.search, h1: t(main.querySelector('h1')), p: t(main.querySelector('.app__contentPanel p')), h2: t(main.querySelector('.app__contentPanel h2')),
                    items: [...main.querySelectorAll('.app__contentPanel li')].map((li) => ({text: t(li), links: [...li.querySelectorAll('a')].map((a) => ({text: t(a), href: a.getAttribute('href')}))})),
                    pLinks: [...main.querySelectorAll('.app__contentPanel p a')].map((a) => ({text: t(a), href: a.getAttribute('href'), target: a.getAttribute('target')})),
                    textTransform: main.querySelector('.app__contentPanel li') ? getComputedStyle(main.querySelector('.app__contentPanel li')).textTransform : null};
            });
            fact('ojs1 COUNTER Reports page (manager, seeded)', read);
            // Each year link: the download.
            let n = 0;
            for (const item of read.items) {
                for (const l of item.links) {
                    n++;
                    await step(`ojs1 year link ${n}`, async () => {
                        const dl = page.waitForEvent('download', {timeout: 15_000}).catch(() => null);
                        await page.locator(`a[href="${l.href}"]`).first().click();
                        const d = await dl;
                        const out = {item: item.text, year: l.text};
                        if (d) {
                            out.file = d.suggestedFilename();
                            const p = path.join(outDir(), `dl-${app.name}-r4-${n}-${out.file}`);
                            await d.saveAs(p);
                            const c = fs.readFileSync(p, 'utf8');
                            out.head = flat(c.slice(0, 600), 600);
                            out.length = c.length;
                        } else {
                            await idle(page);
                            const s = await snap(page, `ojs1-yearlink-${n}`);
                            out.page = flat(s.text && s.text.main, 500);
                            out.url = page.url().replace(/^https?:\/\/[^/]+/, '');
                        }
                        fact(`ojs1 year link ${item.text.slice(0, 20)} ${l.text}`, out);
                    });
                }
            }
            // A year with no figures, typed into the address bar (the link's own shape).
            await step('ojs1 typed year 2001', async () => {
                const first = read.items[0] && read.items[0].links[0];
                const href = first ? first.href.replace(/year=\d{4}/, 'year=2001') : app.url(`/index.php/${sd.path}/en/stats/reports/report?pluginName=CounterReportPlugin&type=fetch&release=4.1&report=jr1&year=2001`);
                await page.goto(href);
                await idle(page);
                await pause(800);
                const s = await snap(page, 'ojs1-typed-2001');
                fact('ojs1 typed year 2001', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), notices: await page.locator('.app__notifications').allInnerTexts().catch(() => []), main: flat(s.text && s.text.main, 600)});
                fact('ojs1 trivial notifications stored (db)', sql(app, `select n.notification_id, n.level, n.type, s.setting_value from notifications n left join notification_settings s on s.notification_id = n.notification_id join users u on u.user_id = n.user_id where u.username = '${sd.users.mgr}' and n.level = 1`));
                // Where does it surface? The next backend page, then the journal's reader side.
                for (const [label, where] of [['next-backend', `/index.php/${sd.path}/en/stats/reports`], ['reader-home', `/index.php/${sd.path}/en/`]]) {
                    await page.goto(app.url(where));
                    await idle(page);
                    await pause(1500);
                    const s2 = await snap(page, `ojs1-typed-2001-${label}`);
                    fact(`ojs1 typed year 2001 then ${label}`, {notices: await page.locator('.app__notifications, .pkp_notification, [class*="notification"]').allInnerTexts().then((a) => a.map((x) => flat(x, 200)).filter(Boolean)).catch(() => []), head: flat(s2.text && (s2.text.main || s2.text.body), 200)});
                }
                fact('ojs1 trivial notifications left (db)', sql(app, `select count(*) from notifications n join users u on u.user_id = n.user_id where u.username = '${sd.users.mgr}' and n.level = 1`));
            });
        }
        // publicknowledge (td11, read-only).
        await signIn(page, 'manager.maya');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/stats/reports`));
        await idle(page);
        await snap(page, 'ojs1-pk-reports');
        const l2 = page.getByRole('link', {name: 'COUNTER Reports', exact: true});
        if (await l2.count()) {
            await l2.first().click();
            await page.waitForLoadState('domcontentloaded');
            await idle(page);
            const s = await snap(page, 'ojs1-pk-counter');
            fact('ojs1 td11 publicknowledge page', flat(s.text && s.text.main, 800));
        } else {
            fact('ojs1 td11 publicknowledge page', 'no COUNTER Reports link');
        }
        // A reader on the scratch journal (typed address).
        for (const who of ['rd']) {
            await step(`ojs1 as ${who}`, async () => {
                await signIn(page, sd.users[who], {contextPath: sd.path});
                const r = await page.goto(app.url(`/index.php/${sd.path}/en/stats/reports`));
                await idle(page);
                const s1 = await snap(page, `ojs1-reports-${who}`);
                const r2 = await page.goto(app.url(`/index.php/${sd.path}/en/stats/reports/report?pluginName=CounterReportPlugin`));
                await idle(page);
                const s2 = await snap(page, `ojs1-counter-${who}`);
                fact(`ojs1 as ${who}`, {reports: {status: r && r.status(), url: page.url(), main: flat(s1.text && s1.text.main, 400)}, counter: {status: r2 && r2.status(), main: flat(s2.text && s2.text.main, 400)}});
            });
        }
    } finally {
        await close();
    }
}

forEachApp(async (app) => {
    facts = {};
    const run = async (phase, fn) => {
        if (!PHASES.includes(phase)) return;
        console.log(`[phase] ${app.name} ${phase}`);
        await step(phase, () => fn(app));
    };
    await run('seed', seed);
    await run('td4', td4);
    await run('fields', fields);
    await run('refusals', refusals);
    await run('sushi', sushi);
    await run('live', live);
    await run('ojs1', ojs1);
    record(`facts-${PHASES.join('+')}`, facts, {merge: true});
});
