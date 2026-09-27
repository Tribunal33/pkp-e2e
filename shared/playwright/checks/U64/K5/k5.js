// U64 claim check K5: the two "Statistics" settings tabs, Administration ›
// Site Settings › "Site Setup" › "Statistics" and Settings › Distribution ›
// "Statistics" (spec body 161–182, Rules 26–30 at 369–398, Settings 1–9 at
// 411–444, A4, A6).
//
// Seeds its own scratch contexts per app (A: every permission level, one
// published work with visits; B: a manager and one work), signs in from the
// roster and the scratch users, and records every screen with screen().
// Every site-wide change is put back in a finally (install values:
// geographical "disabled", institutional off, Public API public, monthly,
// logs left in place, Platform unticked, no Platform ID, no Site Name), and
// the phase prints the site rows from psql afterwards. Phases:
//   seed      contexts A and B (a work published 2026-05-01 each)
//   site      admin on the site's tab: fields at the defaults, a tab left
//             unsaved, td12 (Platform / Platform ID, both ends of the ID's
//             length), the other end of the geographical, institutional,
//             daily and compress fields saved and reopened, "Save" reaching
//             both journals' tabs; a manager typing the address (the site's
//             "Public API" end is driven through POST site in `journal` and
//             `sushi`)
//   journal   td13 (publicknowledge, read-only) and Rule 27's site
//             conditions one by one on A (POST site), read by the manager,
//             an editor and admin
//   geo       td7 / A4 / Settings 1 and 7: the journal's radios, a save of
//             "Do not collect…" and of a shallower level, the "Articles"
//             Download window and its "Geographic" file, controls on B
//   inst      Rule 29 / Settings 2 and 8: the box, the side menu, and what a
//             visit to the work records (the usage event log's institutionIds)
//   sushi     Rule 30 / Settings 5 and 9: the SUSHI address per role with the
//             journal's box unticked and with the site restricted
//   platform  Settings 6: COUNTER PR with the site as platform (the site's
//             counterR5StartDate set in psql for the phase, as K4 did)
//   french    A6: the site's tab and the statistics pages in French
//   roles     the lower roles typing the Distribution address
// Run: PROBE_FEATURE=U64 PROBE_AGENT=ccK5 node bin/probe.js all shared/playwright/checks/U64/K5/k5.js
// (ONLY=ojs narrows; PHASES=seed,site picks steps; seed must run first once)
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const PHASES = (process.env.PHASES || 'seed,site,journal,geo,inst,sushi,platform,french,roles').split(',');
const T = 20_000;
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sql = (app, q) => execFileSync('psql', ['-X', '-d', `${app.name}_test`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const DEFAULTS = {enableGeoUsageStats: 'disabled', enableInstitutionUsageStats: false, isSushiApiPublic: true};
const SITE_ROWS = "select setting_name, setting_value from site_settings where setting_name in ('enableGeoUsageStats','enableInstitutionUsageStats','isSushiApiPublic','keepDailyUsageStats','compressStatsLogs','isSiteSushiPlatform','sushiPlatformID','counterR5StartDate','title') order by 1";

const ROLES = {
    ojs: [['mgr', 'manager'], ['ed', 'editor'], ['se', 'sectionEditor'], ['au', 'author'], ['rd', 'reader']],
    omp: [['mgr', 'manager'], ['ed', 'editor'], ['se', 'sectionEditor'], ['au', 'author'], ['rd', 'reader']],
    ops: [['mgr', 'manager'], ['se', 'sectionEditor'], ['au', 'author'], ['rd', 'reader']],
};
const FILE = {
    ojs: {galleys: [{label: 'PDF', file: 'article.pdf'}]},
    omp: {publicationFormats: [{name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript'}]},
    ops: {galleys: [{label: 'PDF', file: 'preprint.pdf'}]},
};
const WORK_PAGE = {ojs: 'article/view', omp: 'catalog/book', ops: 'preprint/view'};

let facts = {};
function fact(key, value) {
    facts[key] = value;
    console.log(`[fact] ${key}: ${flat(JSON.stringify(value), 900)}`);
}
async function step(name, fn) {
    try {
        return await fn();
    } catch (e) {
        fact(`ERR ${name}`, String((e && e.message) || e).split('\n').slice(0, 4).join(' | '));
        return null;
    }
}
let snapN = 0;
async function snap(page, name) {
    const n = `${String(++snapN).padStart(2, '0')}-${name}`;
    const s = await screen(page);
    record(n, s);
    await shot(page, n).catch(() => {});
    return {name: n, s};
}
function seedFile(app) {
    return path.join(outDir(), `seed-${app.name}.json`);
}
function loadSeed(app) {
    return JSON.parse(fs.readFileSync(seedFile(app), 'utf8'));
}
function dialogLog(page) {
    const seen = [];
    page.on('dialog', async (d) => {
        seen.push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    return seen;
}

// ---------------------------------------------------------------- seed
async function seed(app) {
    const out = {};
    for (const key of ['A', 'B']) {
        const S = tag(`u64k5${key.toLowerCase()}`);
        const roles = key === 'A' ? ROLES[app.name] : [['mgr', 'manager'], ['au', 'author']];
        const ctx = {
            tag: S,
            context: {name: {en: `K5 Journal ${key} ${S}`}},
            users: roles.map(([s, r]) => ({username: `${S}${s}`, givenName: s.toUpperCase(), familyName: `K5${key}`, roles: [r]})),
        };
        if (app.name === 'ojs') ctx.issues = [{volume: 1, number: '1', year: 2026, published: true, datePublished: '2026-05-01'}];
        const c = await app.api.createContext(ctx);
        const w = await app.api.createSubmission({
            tag: `${S}w`, context: S, submitter: `${S}au`, published: true, datePublished: '2026-05-01', title: `K5 Work ${key}`, ...FILE[app.name],
            ...(app.name === 'ojs' ? {issue: {volume: 1, number: '1', year: 2026}} : {}),
            usage: [{date: '2026-06-15', abstractViews: 3, fileViews: [2]}, {date: '2026-07-10', abstractViews: 2, fileViews: [1]}, {daysAgo: 2, abstractViews: 1}],
        });
        out[key] = {S, path: c.path || S, contextId: c.contextId, users: Object.fromEntries(roles.map(([s]) => [s, `${S}${s}`])), work: w.submissionId};
    }
    fs.writeFileSync(seedFile(app), JSON.stringify(out, null, 2));
    fact('seed', out);
    return out;
}

// ---------------------------------------------------------------- readers
/** A Vue settings form, read as data: groups, fields, inputs, errors. */
async function formRead(panel) {
    return panel.evaluate((root) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && e.offsetParent !== null);
        const field = (f) => ({
            label: t(f.querySelector('legend, .pkpFormFieldLabel')),
            visible: vis(f),
            required: !!f.querySelector('.pkpFormFieldLabel__required'),
            desc: t(f.querySelector('.pkpFormField__description')),
            err: t(f.querySelector('.pkpFieldError')),
            inputs: [...f.querySelectorAll('input, select, textarea')].filter((i) => i.type !== 'hidden').map((i) => ({
                type: i.type, name: i.name, value: i.value, checked: i.checked, maxlength: i.getAttribute('maxlength'),
                label: i.labels && i.labels[0] ? t(i.labels[0]) : (i.closest('label') ? t(i.closest('label')) : null),
            })),
        });
        const groups = [...root.querySelectorAll('.pkpFormGroup')].map((g) => ({
            heading: t(g.querySelector('.pkpFormGroup__heading [id$="_label"]')),
            desc: t(g.querySelector('.pkpFormGroup__heading [id$="_description"]')),
            fields: [...g.querySelectorAll('.pkpFormField')].map(field),
        }));
        return {
            groups,
            errors: [...root.querySelectorAll('.pkpFormErrors, .pkpFormPage__status, [role="alert"]')].map(t).filter(Boolean),
            fieldErrors: [...root.querySelectorAll('.pkpFieldError')].map(t).filter(Boolean),
            buttons: [...root.querySelectorAll('button')].filter(vis).map((b) => ({text: t(b), disabled: b.disabled})),
        };
    });
}
function checkedOf(form) {
    const out = {};
    for (const g of form.groups) for (const f of g.fields) {
        if (!f.visible) continue;
        for (const i of f.inputs) {
            if (i.type === 'radio' && i.checked) out[i.name] = i.label;
            if (i.type === 'checkbox') out[i.name] = i.checked;
            if (i.type === 'text') out[i.name] = i.value;
        }
    }
    return out;
}
function fieldList(form) {
    return form.groups.flatMap((g) => g.fields.filter((f) => f.visible).map((f) => f.label));
}
async function sideMenu(page) {
    return page.locator('nav a, .p-panelmenu a').evaluateAll((as) => as.map((a) => a.textContent.trim()).filter(Boolean)).catch(() => []);
}

// ---------------------------------------------------------------- the site's tab
async function siteTab(page, app, locale = 'en') {
    await page.goto(app.url(`/index.php/index/${locale}/admin/settings`));
    await idle(page);
    await page.locator('#setup-button').first().click().catch(() => {});
    await page.locator('#statistics-button').first().click();
    const panel = page.locator('#statistics');
    await panel.getByRole('button', {name: /^(Save|Enregistrer)$/}).first().waitFor({timeout: T});
    await idle(page);
    return panel;
}
async function saveSite(page, panel) {
    const w = page.waitForResponse((r) => /api\/v1\/site/.test(r.url()) && r.request().method() !== 'GET', {timeout: 8000}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    if (r && r.ok()) await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).catch(() => {});
    await idle(page);
    let body = null;
    if (r && !r.ok()) body = flat(await r.text().catch(() => null), 600);
    return {status: r ? r.status() : 'no request', body, post: r ? flat(r.request().postData(), 600) : null, saved: await page.locator('[role="status"]').filter({hasText: 'Saved'}).count(), form: await formRead(panel)};
}
async function restoreSite(app) {
    const r = await step('restore site keys', () => app.api.setSite(DEFAULTS));
    // The other four fields have no POST site key: put them back in SQL only when a phase left them changed.
    const rows = sql(app, SITE_ROWS);
    fact('site rows after restore', {setSite: r, rows});
    return rows;
}

// ---------------------------------------------------------------- the journal's tab
async function distTab(page, app, ctxPath, locale = 'en') {
    await page.goto(app.url(`/index.php/${ctxPath}/${locale}/management/settings/distribution`));
    await idle(page);
    const tabs = await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => flat(x, 60))).catch(() => []);
    const btn = page.locator('#statistics-button').first();
    if (!(await btn.count())) return {present: false, tabs, url: page.url()};
    await btn.click();
    const panel = page.locator('#statistics');
    await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T}).catch(() => {});
    await idle(page);
    const form = await formRead(panel);
    return {present: true, tabs, panel, form, fields: fieldList(form), checked: checkedOf(form)};
}
async function saveDist(page, panel) {
    const w = page.waitForResponse((r) => /api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: 8000}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    if (r && r.ok()) await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).catch(() => {});
    await idle(page);
    const form = await formRead(panel);
    return {status: r ? r.status() : 'no request', post: r ? flat(r.request().postData(), 400) : null, saved: await page.locator('[role="status"]').filter({hasText: 'Saved'}).count(), checked: checkedOf(form), errors: form.errors};
}
function slim(d) {
    if (!d) return d;
    const {panel, form, ...rest} = d;
    return {...rest, groups: form ? form.groups.map((g) => ({heading: g.heading, fields: g.fields.filter((f) => f.visible).map((f) => ({label: f.label, desc: f.desc, inputs: f.inputs.map((i) => `${i.type}:${i.label}${i.checked ? ' [x]' : ''}`)}))})) : undefined};
}

// ---------------------------------------------------------------- the "Articles" Download window
async function openDownload(page, app, ctxPath, name) {
    const got = page.waitForResponse((r) => /\/api\/v1\/stats\//.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
    await page.goto(app.url(`/index.php/${ctxPath}/en/stats/publications/publications`));
    await got;
    await idle(page);
    await page.getByRole('button', {name: 'Download Report', exact: true}).click();
    const dlg = page.getByRole('dialog').filter({hasText: 'Download a CSV'});
    await dlg.waitFor({state: 'visible', timeout: 10_000});
    await idle(page);
    const s = await snap(page, name);
    const panels = await dlg.locator('.pkpStats__reportAction').evaluateAll((ps) => ps.map((p) => ({
        heading: (p.querySelector('h2') || {}).innerText, line: (p.querySelector('p') || {}).innerText,
        buttons: [...p.querySelectorAll('button')].map((b) => b.innerText.trim()),
    })));
    return {dlg, snap: s.name, panels};
}
async function pressDownload(page, dlg, buttonName) {
    const reqP = page.waitForResponse((r) => /\/api\/v1\/stats\//.test(r.url()) && /text\/csv/.test(r.request().headers().accept || ''), {timeout: 30_000}).catch(() => null);
    const dlP = page.waitForEvent('download', {timeout: 30_000}).catch(() => null);
    await dlg.getByRole('button', {name: buttonName, exact: true}).click();
    const resp = await reqP;
    const dl = await dlP;
    let content = null;
    let name = null;
    if (dl) {
        name = dl.suggestedFilename();
        const p = await dl.path().catch(() => null);
        if (p) content = fs.readFileSync(p, 'utf8');
    }
    await dlg.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
    await pause(600);
    return {name, status: resp ? resp.status() : null, url: resp ? decodeURIComponent(resp.url().replace(/^https?:\/\/[^/]+/, '')) : null, head: content == null ? null : content.split('\n').slice(0, 8)};
}
async function closeDownload(page, dlg) {
    await dlg.getByRole('button', {name: /^Close$/}).first().click().catch(() => {});
    await dlg.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
    await pause(600);
}
async function geoWindow(page, app, ctxPath, name) {
    const W = await openDownload(page, app, ctxPath, name);
    const out = {snap: W.snap, panels: W.panels.map((p) => p.heading)};
    const geo = W.panels.find((p) => /^Geographic/.test(p.heading || ''));
    out.geoPanel = geo || null;
    if (geo) out.file = await pressDownload(page, W.dlg, 'Download Geographic');
    else await closeDownload(page, W.dlg);
    return out;
}

// ---------------------------------------------------------------- phases
async function phaseSite(app, sd) {
    const {page, close} = await launch(app);
    const dialogs = dialogLog(page);
    const R = {};
    try {
        await signIn(page, 'admin');
        let panel = await siteTab(page, app);
        const s0 = await snap(page, 'site-tab-defaults');
        R.defaults = {snap: s0.name, form: await formRead(panel), text: flat(await panel.innerText(), 4000)};
        await loc(page, 'Site Settings › Statistics panel', panel);
        await loc(page, 'Site Statistics: Platform box', panel.getByRole('checkbox', {name: /Use the site as the platform for all/}));
        await loc(page, 'Site Statistics: Save', panel.getByRole('button', {name: 'Save', exact: true}));
        fact('site defaults checked', checkedOf(R.defaults.form));

        // Leave the tab once with a change unsaved: another side tab, then another page.
        R.leave = await step('site leave unsaved', async () => {
            const d0 = dialogs.length;
            await panel.getByLabel('Compress the log files', {exact: true}).check();
            await page.getByRole('tab', {name: 'Languages'}).first().click().catch(() => {});
            await idle(page);
            await page.locator('#statistics-button').first().click();
            await idle(page);
            const back = checkedOf(await formRead(panel));
            await page.goto(app.url('/index.php/index/en/admin')).catch(() => {});
            await idle(page);
            panel = await siteTab(page, app);
            const s = await snap(page, 'site-tab-after-leave');
            return {afterTabSwitch: back.compressStatsLogs, afterLeave: checkedOf(await formRead(panel)).compressStatsLogs, dialogs: dialogs.slice(d0), snap: s.name};
        });
        fact('site leave', R.leave);

        // td12: Platform and Platform ID.
        R.td12 = await step('td12', async () => {
            const out = {};
            const box = panel.getByRole('checkbox', {name: /Use the site as the platform for all/});
            out.idBoxBefore = await panel.locator('input[name="sushiPlatformID"]').count();
            out.idVisibleBefore = await panel.locator('input[name="sushiPlatformID"]').isVisible().catch(() => false);
            await box.check();
            const idBox = panel.locator('input[name="sushiPlatformID"]');
            await idBox.waitFor({state: 'visible', timeout: 5000}).catch(() => {});
            out.idVisibleTicked = await idBox.isVisible().catch(() => false);
            out.tickedSnap = (await snap(page, 'site-td12-ticked')).name;
            out.tickedField = (await formRead(panel)).groups.flatMap((g) => g.fields).find((f) => (f.inputs[0] || {}).name === 'sushiPlatformID');
            await loc(page, 'Site Statistics: Platform ID box', idBox);
            out.empty = await saveSite(page, panel);
            out.emptySnap = (await snap(page, 'site-td12-empty-save')).name;
            out.empty.rows = sql(app, SITE_ROWS);
            for (const [k, v] of [['space', 'has space'], ['len18', 'K5_plat.id/1234567'], ['len17', 'K5_plat.id/123456']]) {
                await idBox.fill(v);
                const r = await saveSite(page, panel);
                r.snap = (await snap(page, `site-td12-${k}`)).name;
                r.rows = sql(app, SITE_ROWS);
                r.typed = v;
                out[k] = r;
            }
            panel = await siteTab(page, app);
            out.reload17 = {checked: checkedOf(await formRead(panel)), snap: (await snap(page, 'site-td12-reload17')).name};
            // Untick with the ID still typed: what "Save" keeps, and what a new tick shows.
            await panel.getByRole('checkbox', {name: /Use the site as the platform for all/}).uncheck();
            out.untickKeepId = await saveSite(page, panel);
            out.untickKeepId.rows = sql(app, SITE_ROWS);
            panel = await siteTab(page, app);
            await panel.getByRole('checkbox', {name: /Use the site as the platform for all/}).check();
            out.retickShows = await panel.locator('input[name="sushiPlatformID"]').inputValue().catch(() => null);
            // Untick with an invalid ID typed (the hidden box).
            await panel.locator('input[name="sushiPlatformID"]').fill('bad id!');
            await panel.getByRole('checkbox', {name: /Use the site as the platform for all/}).uncheck();
            out.untickInvalidHidden = await saveSite(page, panel);
            out.untickInvalidHidden.rows = sql(app, SITE_ROWS);
            out.untickInvalidSnap = (await snap(page, 'site-td12-untick-invalid')).name;
            // Back to the defaults on screen: tick, clear, untick, save.
            panel = await siteTab(page, app);
            const b2 = panel.getByRole('checkbox', {name: /Use the site as the platform for all/});
            await b2.check();
            await panel.locator('input[name="sushiPlatformID"]').fill('');
            await b2.uncheck();
            out.restore = await saveSite(page, panel);
            out.restore.rows = sql(app, SITE_ROWS);
            for (const k of Object.keys(out)) if (out[k] && out[k].form) delete out[k].form;
            return out;
        });
        fact('td12', R.td12);

        // Each radio's other end, saved and reopened; then the journals' tabs.
        R.ends = await step('site other ends', async () => {
            panel = await siteTab(page, app);
            await panel.getByLabel('Collect the visitor\'s country', {exact: true}).check();
            await panel.getByLabel('Enable institutional statistics', {exact: true}).check();
            await panel.getByLabel('Track daily and monthly statistics', {exact: true}).check();
            await panel.getByLabel('Compress the log files', {exact: true}).check();
            const before = checkedOf(await formRead(panel));
            const save = await saveSite(page, panel);
            const sameSnap = (await snap(page, 'site-ends-saved')).name;
            const rows = sql(app, SITE_ROWS);
            panel = await siteTab(page, app);
            const reload = checkedOf(await formRead(panel));
            const reloadSnap = (await snap(page, 'site-ends-reload')).name;
            // The journals' tabs under these values (every journal: A and B).
            const m = await launch(app);
            const J = {};
            try {
                for (const key of ['A', 'B']) {
                    await signIn(m.page, sd[key].users.mgr, {contextPath: sd[key].path});
                    const d = await distTab(m.page, app, sd[key].path);
                    J[key] = {...slim(d), snap: (await snap(m.page, `site-ends-journal${key}`)).name, menu: (await sideMenu(m.page)).filter((x) => /Institution/.test(x))};
                }
            } finally {
                await m.close();
            }
            delete save.form;
            return {before, save, sameSnap, rows, reload, reloadSnap, journals: J};
        });
        fact('site ends', R.ends);

        // Back to the install values on screen, then reopened.
        R.back = await step('site back to defaults', async () => {
            panel = await siteTab(page, app);
            await panel.getByLabel('Do not collect any geographical data', {exact: true}).check();
            await panel.getByLabel('Enable institutional statistics', {exact: true}).uncheck();
            await panel.getByLabel('Only track monthly statistics', {exact: true}).check();
            await panel.getByLabel('Leave the log files in place', {exact: true}).check();
            await panel.getByLabel('Make the COUNTER SUSHI statistics publicly available', {exact: true}).check();
            const save = await saveSite(page, panel);
            delete save.form;
            panel = await siteTab(page, app);
            return {save, reload: checkedOf(await formRead(panel)), rows: sql(app, SITE_ROWS), snap: (await snap(page, 'site-back-reload')).name};
        });
        fact('site back', R.back);

    } finally {
        R.dialogs = dialogs;
        record('k5-site', R, {merge: true});
        await close();
        await restoreSite(app);
        // The fields POST site has no key for: back through SQL if left changed.
        const rows = sql(app, SITE_ROWS);
        if (/keepDailyUsageStats\|1|compressStatsLogs\|1|isSiteSushiPlatform\|1|sushiPlatformID/.test(rows)) {
            sql(app, "update site_settings set setting_value='0' where setting_name in ('keepDailyUsageStats','compressStatsLogs','isSiteSushiPlatform')");
            sql(app, "delete from site_settings where setting_name='sushiPlatformID'");
            fact('site rows fixed by SQL', sql(app, SITE_ROWS));
        }
    }
    // A manager typing the site's address.
    const m = await launch(app);
    try {
        await signIn(m.page, sd.A.users.mgr, {contextPath: sd.A.path});
        const resp = await m.page.goto(app.url('/index.php/index/en/admin/settings')).catch(() => null);
        await idle(m.page);
        const s = await snap(m.page, 'site-tab-as-manager');
        fact('site address as manager', {status: resp && resp.status(), url: m.page.url().replace(/^https?:\/\/[^/]+/, ''), text: flat(s.s.text.main, 300), snap: s.name});
    } finally {
        await m.close();
    }
}

async function phaseJournal(app, sd) {
    const R = {};
    // td13: publicknowledge, read-only.
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'manager.maya');
            const d = await distTab(page, app, 'publicknowledge');
            R.td13 = {...slim(d), snap: (await snap(page, 'td13-publicknowledge')).name};
            if (d.panel) await loc(page, 'Distribution › Statistics: Public API box', d.panel.getByLabel('Make the COUNTER SUSHI statistics publicly available'));
            fact('td13', R.td13);
        } finally {
            await close();
        }
    }
    const cases = [
        ['defaults', DEFAULTS],
        ['restricted-only', {enableGeoUsageStats: 'disabled', enableInstitutionUsageStats: false, isSushiApiPublic: false}],
        ['restricted-geo', {enableGeoUsageStats: 'country', enableInstitutionUsageStats: false, isSushiApiPublic: false}],
        ['restricted-inst', {enableGeoUsageStats: 'disabled', enableInstitutionUsageStats: true, isSushiApiPublic: false}],
        ['all-on', {enableGeoUsageStats: 'country+region+city', enableInstitutionUsageStats: true, isSushiApiPublic: true}],
    ];
    const who = [['mgr', sd.A.users.mgr], ...(sd.A.users.ed ? [['ed', sd.A.users.ed]] : []), ['admin', 'admin']];
    const {page, close} = await launch(app);
    const dialogs = dialogLog(page);
    try {
        for (const [label, site] of cases) {
            fact(`journal case ${label} site`, await app.api.setSite(site));
            const users = label === 'all-on' || label === 'defaults' ? who : who.slice(0, 1);
            for (const [k, u] of users) {
                if (u === 'admin') await signIn(page, 'admin');
                else await signIn(page, u, {contextPath: sd.A.path});
                const d = await distTab(page, app, sd.A.path);
                R[`${label}-${k}`] = {...slim(d), snap: (await snap(page, `journal-${label}-${k}`)).name};
                fact(`journal ${label} ${k}`, {present: d.present, fields: d.fields, checked: d.checked, tabs: d.tabs});
            }
        }
        // Leave the journal's tab once with a change unsaved (all-on): another tab, then another page.
        R.leave = await step('journal leave unsaved', async () => {
            await signIn(page, sd.A.users.mgr, {contextPath: sd.A.path});
            const d = await distTab(page, app, sd.A.path);
            const d0 = dialogs.length;
            await d.panel.getByLabel('Enable institutional statistics', {exact: true}).check();
            await page.getByRole('tab', {name: 'License'}).first().click().catch(() => {});
            await idle(page);
            await page.locator('#statistics-button').first().click();
            const back = checkedOf(await formRead(d.panel));
            await page.goto(app.url(`/index.php/${sd.A.path}/en/management/settings/website`)).catch(() => {});
            await idle(page);
            const d2 = await distTab(page, app, sd.A.path);
            return {afterTabSwitch: back.enableInstitutionUsageStats, afterLeave: d2.checked.enableInstitutionUsageStats, dialogs: dialogs.slice(d0), snap: (await snap(page, 'journal-after-leave')).name};
        });
        fact('journal leave', R.leave);
    } finally {
        R.dialogs = dialogs;
        record('k5-journal', R, {merge: true});
        await close();
        await restoreSite(app);
    }
}

async function phaseGeo(app, sd) {
    const R = {};
    const {page, close} = await launch(app);
    try {
        await signIn(page, sd.A.users.mgr, {contextPath: sd.A.path});
        // Settings 1, the default end: no geographical data, no "Geographic".
        R.disabledA = await step('geo disabled window', () => geoWindow(page, app, sd.A.path, 'geo-disabled-A-window'));
        fact('geo disabled A window', R.disabledA);
        // td7: the site at country.
        fact('geo site country', await app.api.setSite({enableGeoUsageStats: 'country'}));
        let d = await distTab(page, app, sd.A.path);
        R.countryA = {...slim(d), snap: (await snap(page, 'geo-country-A-tab')).name};
        fact('geo country A tab', {fields: d.fields, checked: d.checked, radios: d.form.groups.flatMap((g) => g.fields).flatMap((f) => f.inputs).filter((i) => i.name === 'enableGeoUsageStats').map((i) => `${i.label}${i.checked ? ' [x]' : ''}`)});
        await d.panel.getByLabel('Do not collect any geographical data', {exact: true}).check();
        R.saveDisabled = await saveDist(page, d.panel);
        R.saveDisabled.snap = (await snap(page, 'geo-country-A-saved-disabled')).name;
        R.saveDisabled.row = sql(app, `select setting_value from ${app.name === 'ojs' ? 'journal_settings' : app.name === 'omp' ? 'press_settings' : 'server_settings'} where ${app.name === 'ojs' ? 'journal_id' : app.name === 'omp' ? 'press_id' : 'server_id'}=${sd.A.contextId} and setting_name='enableGeoUsageStats'`);
        d = await distTab(page, app, sd.A.path);
        R.reloadDisabled = {checked: d.checked, snap: (await snap(page, 'geo-country-A-reload')).name};
        fact('geo A saved disabled', {save: R.saveDisabled, reload: R.reloadDisabled});
        R.countrySeedA = await step('geo seed A country', () => app.api.createSubmission({
            tag: `${sd.A.S}g1`, context: sd.A.S, submitter: sd.A.users.au, published: true, title: 'K5 Geo A', ...FILE[app.name],
            ...(app.name === 'ojs' ? {issue: {volume: 1, number: '1', year: 2026}} : {}),
            usage: [{daysAgo: 2, abstractViews: 2, country: 'CA'}],
        }).then((x) => ({ok: x.submissionId})));
        fact('geo seed A country (journal at disabled)', R.countrySeedA);
        R.countryAWindow = await step('geo A window', () => geoWindow(page, app, sd.A.path, 'geo-country-A-window'));
        fact('geo A window (journal disabled, site country)', R.countryAWindow);
        // Control: B left alone.
        const m = await launch(app);
        try {
            await signIn(m.page, sd.B.users.mgr, {contextPath: sd.B.path});
            const dB = await distTab(m.page, app, sd.B.path);
            R.countryB = {checked: dB.checked, snap: (await snap(m.page, 'geo-country-B-tab')).name};
            R.countryBWindow = await step('geo B window', () => geoWindow(m.page, app, sd.B.path, 'geo-country-B-window'));
            fact('geo B control', {tab: R.countryB, window: R.countryBWindow});
            // Settings 7: the site at city; A chooses the country level, B stays.
            fact('geo site city', await app.api.setSite({enableGeoUsageStats: 'country+region+city'}));
            d = await distTab(page, app, sd.A.path);
            R.cityA = {checked: d.checked, radios: d.form.groups.flatMap((g) => g.fields).flatMap((f) => f.inputs).filter((i) => i.name === 'enableGeoUsageStats').map((i) => `${i.label}${i.checked ? ' [x]' : ''}`), snap: (await snap(page, 'geo-city-A-tab')).name};
            await d.panel.getByLabel('Collect the visitor\'s country', {exact: true}).check();
            R.saveCountry = await saveDist(page, d.panel);
            d = await distTab(page, app, sd.A.path);
            R.reloadCountry = {checked: d.checked, snap: (await snap(page, 'geo-city-A-reload-country')).name};
            fact('geo A shallower', {tab: R.cityA, save: R.saveCountry, reload: R.reloadCountry});
            R.citySeedA = await step('geo seed A city', () => app.api.createSubmission({
                tag: `${sd.A.S}g2`, context: sd.A.S, submitter: sd.A.users.au, published: true, title: 'K5 Geo A2', ...FILE[app.name],
                ...(app.name === 'ojs' ? {issue: {volume: 1, number: '1', year: 2026}} : {}),
                usage: [{daysAgo: 2, abstractViews: 1, country: 'DE', region: 'BE', city: 'Berlin'}],
            }).then((x) => ({ok: x.submissionId})));
            fact('geo seed A city (journal at country)', R.citySeedA);
            R.cityAWindow = await step('geo A city window', () => geoWindow(page, app, sd.A.path, 'geo-city-A-window'));
            R.cityBWindow = await step('geo B city window', () => geoWindow(m.page, app, sd.B.path, 'geo-city-B-window'));
            fact('geo windows at city', {A: R.cityAWindow, B: R.cityBWindow});
        } finally {
            await m.close();
        }
    } finally {
        record('k5-geo', R, {merge: true});
        await close();
        await restoreSite(app);
    }
}

function eventLog(app) {
    const d = new Date();
    const f = `usage_events_${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}.log`;
    return path.resolve(app.root, '..', 'files', `${app.name}-test`, 'usageStats', 'usageEventLogs', f);
}
async function visitWork(app, sd, label) {
    const file = eventLog(app);
    const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').length : 0;
    const v = await launch(app);
    try {
        const resp = await v.page.goto(app.url(`/index.php/${sd.A.path}/${WORK_PAGE[app.name]}/${sd.A.work}`));
        await idle(v.page);
        await pause(300);
        const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').slice(before - 1).filter(Boolean) : [];
        const mine = lines.map((l) => {
            try {
                return JSON.parse(l);
            } catch {
                return null;
            }
        }).filter((e) => e && e.contextId === sd.A.contextId);
        const out = {status: resp && resp.status(), lines: mine.map((e) => ({assocType: e.assocType, submissionId: e.submissionId, institutionIds: e.institutionIds, country: e.country}))};
        fact(`inst visit ${label}`, out);
        return out;
    } finally {
        await v.close();
    }
}
async function phaseInst(app, sd) {
    const R = {};
    const {page, close} = await launch(app);
    const tbl = app.name === 'ojs' ? ['journal_settings', 'journal_id'] : app.name === 'omp' ? ['press_settings', 'press_id'] : ['server_settings', 'server_id'];
    const row = () => sql(app, `select setting_value from ${tbl[0]} where ${tbl[1]}=${sd.A.contextId} and setting_name='enableInstitutionUsageStats'`);
    try {
        await signIn(page, sd.A.users.mgr, {contextPath: sd.A.path});
        R.menuSiteOff = (await sideMenu(page)).filter((x) => /Institution/.test(x));
        fact('inst site on', await app.api.setSite({enableInstitutionUsageStats: true}));
        let d = await distTab(page, app, sd.A.path);
        R.siteOn = {checked: d.checked, fields: d.fields, menu: (await sideMenu(page)).filter((x) => /Institution/.test(x)), snap: (await snap(page, 'inst-siteon-A-tab')).name, row: row()};
        fact('inst site on, journal as seeded', R.siteOn);
        // An institution whose range holds the browser's address, added on the Institutions page (opened by address).
        R.addInst = await step('inst add', async () => {
            await page.goto(app.url(`/index.php/${sd.A.path}/en/management/settings/institutions`));
            await idle(page);
            await page.getByRole('button', {name: 'Add Institution'}).click();
            const dlg = page.getByRole('dialog').filter({hasText: 'Add Institution'});
            await dlg.getByRole('button', {name: 'Save'}).waitFor({timeout: T});
            await dlg.getByLabel('Name', {exact: false}).first().fill('K5 Localhost Institute');
            await dlg.locator('textarea').first().fill('127.0.0.1');
            const w = page.waitForResponse((r) => /api\/v1\/institutions/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await dlg.getByRole('button', {name: 'Save'}).click();
            const r = await w;
            await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await pause(700);
            return {status: r ? r.status() : null, snap: (await snap(page, 'inst-added')).name};
        });
        fact('inst add', R.addInst);
        R.visitJournalAsSeeded = await visitWork(app, sd, 'site on, journal as seeded');
        d = await distTab(page, app, sd.A.path);
        await d.panel.getByLabel('Enable institutional statistics', {exact: true}).check();
        R.saveOn = await saveDist(page, d.panel);
        R.saveOn.menuSamePage = (await sideMenu(page)).filter((x) => /Institution/.test(x));
        d = await distTab(page, app, sd.A.path);
        R.bothOn = {checked: d.checked, menu: (await sideMenu(page)).filter((x) => /Institution/.test(x)), snap: (await snap(page, 'inst-both-on-reload')).name, row: row()};
        fact('inst both on', {save: R.saveOn, reload: R.bothOn});
        R.visitBoth = await visitWork(app, sd, 'both on');
        // Journal unticked, site on.
        await d.panel.getByLabel('Enable institutional statistics', {exact: true}).uncheck();
        R.saveOff = await saveDist(page, d.panel);
        d = await distTab(page, app, sd.A.path);
        R.journalOff = {checked: d.checked, menu: (await sideMenu(page)).filter((x) => /Institution/.test(x)), snap: (await snap(page, 'inst-journal-off-reload')).name, row: row()};
        fact('inst journal off', {save: R.saveOff, reload: R.journalOff});
        R.visitJournalOff = await visitWork(app, sd, 'journal off');
        // Journal ticked again, then the site off.
        await d.panel.getByLabel('Enable institutional statistics', {exact: true}).check();
        await saveDist(page, d.panel);
        fact('inst site off', await app.api.setSite({enableInstitutionUsageStats: false}));
        d = await distTab(page, app, sd.A.path);
        R.siteOffJournalOn = {present: d.present, fields: d.fields, menu: (await sideMenu(page)).filter((x) => /Institution/.test(x)), snap: (await snap(page, 'inst-siteoff-journalon')).name, row: row()};
        fact('inst site off, journal on', R.siteOffJournalOn);
        R.visitSiteOff = await visitWork(app, sd, 'site off, journal on');
    } finally {
        record('k5-inst', R, {merge: true});
        await close();
        await restoreSite(app);
    }
}

async function sushiAs(app, ctxPath, who, page) {
    const out = {};
    for (const p of ['status', 'reports']) {
        const r = await page.request.get(app.url(`/index.php/${ctxPath}/api/v1/stats/sushi/${p}`), {headers: {Accept: 'application/json'}});
        out[p] = `${r.status()} ${flat(await r.text().catch(() => ''), 120)}`;
    }
    return out;
}
async function sushiMatrix(app, sd, label) {
    const out = {};
    const people = [['signed out', null, null], ['admin', 'admin', null]];
    for (const [k, u] of Object.entries(sd.A.users)) people.push([`A ${k}`, u, sd.A.path]);
    for (const [who, user, ctx] of people) {
        const v = await launch(app);
        try {
            if (user) await signIn(v.page, user, ctx ? {contextPath: ctx} : {});
            out[who] = {A: await sushiAs(app, sd.A.path, who, v.page), B: await sushiAs(app, sd.B.path, who, v.page)};
        } finally {
            await v.close();
        }
    }
    const brief = Object.fromEntries(Object.entries(out).map(([w, x]) => [w, `A ${x.A.status.slice(0, 3)}/${x.A.reports.slice(0, 3)} B ${x.B.status.slice(0, 3)}/${x.B.reports.slice(0, 3)}`]));
    fact(`sushi ${label}`, brief);
    return out;
}
async function phaseSushi(app, sd) {
    const R = {};
    const {page, close} = await launch(app);
    try {
        R.base = await sushiMatrix(app, sd, 'defaults');
        await signIn(page, sd.A.users.mgr, {contextPath: sd.A.path});
        let d = await distTab(page, app, sd.A.path);
        await d.panel.getByLabel('Make the COUNTER SUSHI statistics publicly available', {exact: true}).uncheck();
        R.saveOff = await saveDist(page, d.panel);
        d = await distTab(page, app, sd.A.path);
        R.reloadOff = {checked: d.checked, snap: (await snap(page, 'sushi-A-box-off-reload')).name};
        fact('sushi A box off', {save: R.saveOff, reload: R.reloadOff});
        R.journalOff = await sushiMatrix(app, sd, 'A box off');
        await d.panel.getByLabel('Make the COUNTER SUSHI statistics publicly available', {exact: true}).check();
        R.saveOn = await saveDist(page, d.panel);
        fact('sushi site restricted', await app.api.setSite({isSushiApiPublic: false}));
        R.siteOff = await sushiMatrix(app, sd, 'site restricted');
        const dA = await distTab(page, app, sd.A.path);
        R.siteOffTab = {present: dA.present, tabs: dA.tabs, snap: (await snap(page, 'sushi-site-restricted-A')).name};
        // With a geographical level, the tab is there: is the box?
        fact('sushi site restricted + country', await app.api.setSite({isSushiApiPublic: false, enableGeoUsageStats: 'country'}));
        const dA2 = await distTab(page, app, sd.A.path);
        R.siteOffGeoTab = {present: dA2.present, fields: dA2.fields, snap: (await snap(page, 'sushi-site-restricted-geo-A')).name};
        fact('sushi journal tab, site restricted', {plain: R.siteOffTab, withGeo: R.siteOffGeoTab});
    } finally {
        record('k5-sushi', R, {merge: true});
        await close();
        await restoreSite(app);
    }
}

// COUNTER R5 "PR" through the Counter R5 page's "Report Settings" window.
async function counterPR(page, app, ctxPath, label) {
    const list = page.waitForResponse((r) => /\/stats\/sushi\/reports(\?|$)/.test(r.url()), {timeout: 15_000}).catch(() => null);
    await page.goto(app.url(`/index.php/${ctxPath}/en/stats/counterR5/counterR5`));
    await list;
    await idle(page);
    const btn = page.locator('.counterReportsListPanel .listPanel__item', {has: page.locator('span[id="PR"]')}).getByRole('button', {name: 'Edit'});
    await btn.click();
    const dlg = page.getByRole('dialog').filter({hasText: 'Report Settings'});
    await dlg.getByRole('button', {name: 'Download', exact: true}).waitFor({timeout: T});
    await idle(page);
    // The window's dates: June to July 2026.
    await dlg.locator('input[name="begin_date"]').fill('2026-06');
    await dlg.locator('input[name="end_date"]').fill('2026-07');
    const resp = page.waitForResponse((r) => /\/stats\/sushi\/reports\//.test(r.url()), {timeout: 15_000}).catch(() => null);
    const dl = page.waitForEvent('download', {timeout: 15_000}).catch(() => null);
    await dlg.getByRole('button', {name: 'Download', exact: true}).click();
    const r = await resp;
    let content = null;
    if (r && r.status() === 200) {
        const d = await dl;
        const p = d && (await d.path().catch(() => null));
        if (p) content = fs.readFileSync(p, 'utf8');
    }
    const s = await snap(page, `platform-${label}`);
    const lines = content ? content.split(/\r?\n/) : [];
    const out = {status: r ? r.status() : null, body: r && r.status() !== 200 ? flat(await r.text().catch(() => ''), 300) : null, snap: s.name,
        createdBy: lines.find((l) => /^Created_By/.test(l)) || null, head: lines.slice(0, 16), rows: lines.slice(13).filter(Boolean).slice(0, 4)};
    if (await dlg.isVisible().catch(() => false)) {
        await dlg.getByRole('button', {name: /^Close$/}).first().click().catch(() => {});
    }
    await pause(700);
    fact(`platform ${label}`, out);
    return out;
}
async function phasePlatform(app, sd) {
    const R = {before: sql(app, SITE_ROWS)};
    const {page, close} = await launch(app);
    const a = await launch(app);
    try {
        sql(app, "insert into site_settings (setting_name, locale, setting_value) values ('counterR5StartDate', '', '2026-05-01')");
        await signIn(page, sd.A.users.mgr, {contextPath: sd.A.path});
        R.off = await counterPR(page, app, sd.A.path, 'platform-off');
        await signIn(a.page, 'admin');
        let panel = await siteTab(a.page, app);
        await panel.getByRole('checkbox', {name: /Use the site as the platform for all/}).check();
        await panel.locator('input[name="sushiPlatformID"]').fill('K5PLAT');
        R.tick = await saveSite(a.page, panel);
        delete R.tick.form;
        R.onNoName = await counterPR(page, app, sd.A.path, 'platform-on-no-site-name');
        fact('platform site title', await app.api.setSite({title: 'K5 Site Name'}));
        R.onNamed = await counterPR(page, app, sd.A.path, 'platform-on-site-named');
    } finally {
        await step('platform restore title', () => app.api.setSite({title: ''}));
        await step('platform restore tab', async () => {
            const panel = await siteTab(a.page, app);
            const b = panel.getByRole('checkbox', {name: /Use the site as the platform for all/});
            if (!(await b.isChecked())) await b.check();
            await panel.locator('input[name="sushiPlatformID"]').fill('');
            await b.uncheck();
            const r = await saveSite(a.page, panel);
            return r.status;
        });
        sql(app, "delete from site_settings where setting_name = 'counterR5StartDate'");
        R.after = sql(app, SITE_ROWS);
        fact('platform site rows after', R.after);
        record('k5-platform', R, {merge: true});
        await a.close();
        await close();
    }
}

// "##common.help##" is the editorial header's help link, every page and language (U08 A1): left out.
async function rawCodes(text) {
    return Array.from(new Set((text || '').match(/##[^#\s]+##/g) || [])).filter((c) => c !== '##common.help##');
}
async function phaseFrench(app, sd) {
    const R = {};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        const panel = await siteTab(page, app, 'fr_CA');
        const s = await snap(page, 'fr-site-tab');
        const text = await panel.innerText();
        R.site = {snap: s.name, raw: await rawCodes(text), tabLabel: await page.locator('#statistics-button').first().innerText().catch(() => null), text: flat(text, 3000)};
        fact('fr site tab', {raw: R.site.raw, tabLabel: R.site.tabLabel});
        // The statistics pages and each Download window, in French, as the manager of a
        // scratch context that offers French (A and B offer English alone).
        const F = tag('u64k5f');
        await app.api.createContext({tag: F, context: {name: {en: `K5 French ${F}`}, supportedLocales: ['en', 'fr_CA']},
            users: [{username: `${F}mgr`, roles: ['manager']}, {username: `${F}au`, roles: ['author']}],
            ...(app.name === 'ojs' ? {issues: [{volume: 1, number: '1', year: 2026, published: true}]} : {})});
        await app.api.createSubmission({tag: `${F}w`, context: F, submitter: `${F}au`, published: true, title: 'K5 French Work', ...FILE[app.name],
            ...(app.name === 'ojs' ? {issue: {volume: 1, number: '1', year: 2026}} : {}), usage: [{daysAgo: 2, abstractViews: 2, fileViews: [1]}]});
        R.context = F;
        await signIn(page, `${F}mgr`, {contextPath: F});
        const fpath = F;
        const routes = [['publications', 'publications/publications'], ['context', 'context/context'], ...(app.name === 'ojs' ? [['issues', 'issues/issues']] : [])];
        R.pages = {};
        for (const [k, route] of routes) {
            R.pages[k] = await step(`fr page ${k}`, async () => {
                const got = page.waitForResponse((r) => /\/api\/v1\/stats\//.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
                await page.goto(app.url(`/index.php/${fpath}/fr_CA/stats/${route}`));
                await got;
                await idle(page);
                const p = await snap(page, `fr-${k}-page`);
                const title = await page.title();
                await page.locator('.pkpStats__panel .pkpHeader button').last().click();
                const dlg = page.getByRole('dialog').last();
                await dlg.waitFor({state: 'visible', timeout: 10_000});
                await idle(page);
                const w = await snap(page, `fr-${k}-window`);
                const out = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), title, h1: await page.locator('main h1').first().innerText().catch(() => null), raw: await rawCodes(`${title} ${p.s.text.main} ${w.s.text.dialog}`), snaps: [p.name, w.name]};
                await dlg.getByRole('button', {name: /^(Close|Fermer)$/}).first().click().catch(() => {});
                await pause(700);
                return out;
            });
        }
        fact('fr pages', R.pages);
    } finally {
        record('k5-french', R, {merge: true});
        await close();
    }
}

async function phaseRoles(app, sd) {
    const R = {};
    const {page, close} = await launch(app);
    try {
        for (const k of Object.keys(sd.A.users).filter((x) => !['mgr', 'ed'].includes(x))) {
            await signIn(page, sd.A.users[k], {contextPath: sd.A.path});
            const resp = await page.goto(app.url(`/index.php/${sd.A.path}/en/management/settings/distribution`)).catch(() => null);
            await idle(page);
            const s = await snap(page, `roles-${k}-distribution`);
            R[k] = {status: resp && resp.status(), url: page.url().replace(/^https?:\/\/[^/]+/, ''), text: flat(s.s.text.main, 200), snap: s.name};
        }
        fact('roles typing Distribution', R);
    } finally {
        record('k5-roles', R, {merge: true});
        await close();
    }
}

forEachApp(async (app) => {
    facts = {};
    snapN = 0;
    fact('site rows at start', sql(app, SITE_ROWS));
    let sd = null;
    if (PHASES.includes('seed')) sd = await seed(app);
    else sd = loadSeed(app);
    const table = {site: phaseSite, journal: phaseJournal, geo: phaseGeo, inst: phaseInst, sushi: phaseSushi, platform: phasePlatform, french: phaseFrench, roles: phaseRoles};
    for (const p of PHASES) {
        if (!table[p]) continue;
        snapN = {site: 0, journal: 100, geo: 200, inst: 300, sushi: 400, platform: 500, french: 600, roles: 700}[p];
        await step(`phase ${p}`, () => table[p](app, sd));
    }
    fact('site rows at end', sql(app, SITE_ROWS));
    record('k5-facts', facts, {merge: true});
});
