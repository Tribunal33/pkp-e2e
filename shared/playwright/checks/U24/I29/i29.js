// U24 claim check, chunk I29: the housekeeping session's incidental rows for the workflow-screen spec.
// Chunk: .reports/hk29/chunks/U24.md (incidentals rows 16 and 29).
//
//   Row 16  the workflow page in French (`/fr_CA/…`): raw "##key##" codes in the side menu, header,
//           headings and status lines, for the Journal Manager and the Author, on every stage, on a
//           published submission and on a second version; control: the same screens in English.
//   Row 29  OMP: the key (`workflowMenuKey`) and heading of the press's two review stage entries
//           ("Internal Review", "External Review") and their rounds.
//
// One scratch context per app and run (tag u24i29…), UI languages en + fr_CA (context.supportedLocales),
// users mgr (manager), au (author, the submitter of every submission).
// Submissions:  OJS/OMP  S queued at Submission; R review round 1 (OMP: Internal Review round 1);
//                        R2 (OMP) Internal Review round 1 then External Review round 1; C Copyediting;
//                        P Production (queued); X declined at Submission; D published; V published, then
//                        given a second version on screen (phase ver)
//               OPS      P queued preprint; X declined; D posted; V posted, then a second version
// Phases (PHASES=…; one process each, the seed file carries the ids between them):
//   seed   the context and submissions (writes <RUN>-seed-<app>.json)
//   mgr    the Journal Manager, fr_CA: every submission's landing, every stage and round entry pressed;
//          the pages under the newest version of P and D pressed (OMP: the Marketing pages too)
//   en     the same reads in English (the control)
//   au     the Author, fr_CA then en: R, P, D landing; every stage/round entry and page pressed
//   ver    the manager on V, fr_CA: "Create New Version" pressed, its dialog read and confirmed; the new
//          version's node and pages read in fr_CA and en; sweep: a page left with a change unsaved
//   dlg    the frame's dialogs in fr_CA and en: Delete (on X), Return to Workflow (on D, cancelled), the OMP work-type
//          menu; a Title & Abstract change left unsaved (P); then Return to Workflow confirmed on D in fr_CA and
//          Return to Done read in both (rtd alone re-reads the last part)
//   omp2   (OMP) row 29: R2's "Internal Review" / "External Review" entries and rounds, key + heading, en and fr
//
//   RUN=r1 PHASES=seed PROBE_FEATURE=U24 PROBE_AGENT=ccI29 node bin/probe.js ojs shared/playwright/checks/U24/I29/i29.js
//   RUN=r1 PHASES=mgr  … (then en, au, ver, omp2); RUN=r2 … the second, independent run
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const PHASES = (process.env.PHASES || 'seed').split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(`[${RUN}]`, ...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const OUT = path.join(__dirname, '../../../../../.reports', process.env.PROBE_FEATURE || 'U24', process.env.PROBE_AGENT || 'ccI29');

async function sect(name, fn) {
    try { await fn(); } catch (e) { log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | ')); record(`${RUN}-${name}-FAILED`, {error: String(e.stack || e).slice(0, 1500)}); }
}

/** Every "##key##" on the page: rendered text and naming attributes, where it sits, visible or not (from U08 K1). */
const rawKeys = (page) => page.evaluate(() => {
    const re = /##[A-Za-z0-9_.\-]+##/g;
    const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
    const where = (e) => {
        if (e.closest('[data-cy="sidemodal-header"]')) return 'wf-header';
        if (e.closest('nav') && e.closest('[role="dialog"]')) return 'wf-menu';
        if (e.closest('[data-cy="workflow-controls-left"]')) return 'wf-controls-left';
        if (e.closest('[data-cy="workflow-controls-right"]')) return 'wf-controls-right';
        if (e.closest('.pkp-modal-scroll-container h2')) return 'wf-heading';
        if (e.closest('[data-cy="workflow-primary-items"]')) return 'wf-primary';
        if (e.closest('[data-cy="workflow-secondary-items"]')) return 'wf-secondary';
        if (e.closest('[data-cy="workflow-action-items"]')) return 'wf-actions';
        if (e.closest('[role="dialog"]')) return 'dialog';
        if (e.closest('header')) return 'top-header';
        if (e.closest('nav')) return 'side-nav';
        return 'page';
    };
    const found = new Map();
    const add = (k, e, how) => { const key = `${k} @ ${where(e)} (${how}${vis(e) ? '' : ', hidden'})`; found.set(key, true); };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.parentElement && n.parentElement.tagName === 'SCRIPT') continue;
        (n.nodeValue.match(re) || []).forEach((k) => add(k, n.parentElement, 'text'));
    }
    for (const el of document.querySelectorAll('[aria-label],[title],[alt],[placeholder]')) {
        for (const a of ['aria-label', 'title', 'alt', 'placeholder']) {
            const v = el.getAttribute(a);
            if (v) (v.match(re) || []).forEach((k) => add(k, el, a));
        }
    }
    (document.title.match(re) || []).forEach((k) => found.set(`${k} @ <title>`, true));
    return [...found.keys()];
}).catch(() => null);

/** The workflow panel as data (WorkflowPage.js DOM facts). */
const wfInfo = (page) => page.evaluate(() => {
    const vis = (e) => !!(e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden');
    const txt = (e) => (e ? e.innerText.trim().replace(/\s+/g, ' ') : null);
    const header = document.querySelector('[data-cy="sidemodal-header"]');
    const root = header ? header.closest('[role=dialog]') || header.parentElement : null;
    if (!root) return {panel: false, dialogs: [...document.querySelectorAll('[role=dialog]')].filter(vis).map((d) => txt(d).slice(0, 300))};
    const nav = root.querySelector('nav');
    const links = nav ? [...nav.querySelectorAll('a')] : [];
    const menu = links.map((a) => {
        const cls = a.className || '';
        let level = 1;
        if (/!px-(7|9)\b/.test(cls)) level = 2;
        if (/!px-(10|12)\b/.test(cls)) level = 3;
        if (/!px-(14|16)\b/.test(cls)) level = 4;
        return {t: (a.textContent || '').trim().replace(/\s+/g, ' '), level, visible: vis(a), striped: /!border-s-8/.test(cls), selected: /bg-selection-dark/.test(cls), exp: a.getAttribute('aria-expanded'), key: a.closest('[data-p-key], [data-key]')?.getAttribute('data-p-key') || null};
    });
    const h2 = root.querySelector('.pkp-modal-scroll-container h2');
    const prim = root.querySelector('[data-cy="workflow-primary-items"]');
    const statusH = prim ? [...prim.querySelectorAll('h3')].find((x) => /Status|Statut|##/.test(x.innerText) && x.closest('div.border')) : null;
    const box = prim ? prim.querySelector(':scope > div.border, :scope div.border') : null;
    const cl = root.querySelector('[data-cy="workflow-controls-left"]');
    const cr = root.querySelector('[data-cy="workflow-controls-right"]');
    const bubble = header ? header.querySelector('span[class*="bg-stage-"] + span') : null;
    return {
        panel: true,
        headerText: txt(header),
        headerButtons: header ? [...header.querySelectorAll('button')].filter(vis).map((b) => txt(b) || b.getAttribute('aria-label')).filter(Boolean) : [],
        bubble: txt(bubble),
        heading: txt(h2),
        statusBox: statusH ? {h3: txt(statusH), text: txt(statusH.closest('div.border'))} : (box ? {h3: null, text: txt(box)} : null),
        controlsLeft: txt(cl),
        controlsRight: txt(cr),
        primaryStart: prim ? txt(prim).slice(0, 400) : null,
        primaryH3: prim ? [...prim.querySelectorAll('h3')].filter(vis).map(txt).slice(0, 12) : [],
        actions: (() => { const a = root.querySelector('[data-cy="workflow-action-items"]'); return a ? [...a.querySelectorAll('button, a')].filter(vis).map(txt).filter(Boolean) : null; })(),
        secondaryH3: (() => { const s = root.querySelector('[data-cy="workflow-secondary-items"]'); return s ? [...s.querySelectorAll('h3')].filter(vis).map(txt) : null; })(),
        menu,
        dialogText: txt(root).slice(0, 2500),
        otherDialogs: [...document.querySelectorAll('[role=dialog]')].filter((d) => d !== root && vis(d) && !d.contains(root)).map((d) => txt(d).slice(0, 500)),
    };
}).catch((e) => ({error: String(e.message)}));

const menuKey = (page) => { try { return new URL(page.url()).searchParams.get('workflowMenuKey'); } catch (e) { return null; } };

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const seedFile = path.join(OUT, `${RUN}-seed-${app.name}.json`);
    let seed;
    if (on('reseed')) {
        // re-seed some keys into the run's existing context (RESEED=R2,…)
        seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
        const t = seed.context;
        for (const k of (process.env.RESEED || '').split(',').filter(Boolean)) {
            const spec = {R2: {decisions: ['sendInternalReview', 'sendExternalReview']}}[k] || {};
            const r = await app.api.createSubmission({tag: `${t}${k}`, context: t, submitter: seed.au, title: `${k} i29 ${t}`, ...spec});
            seed.subs[k] = {id: r.submissionId, stageId: r.stageId, rounds: (r.reviewRounds || []).map((x) => ({id: x.id, stageId: x.stageId, round: x.round}))};
            log(app.name, 'reseed', k, JSON.stringify(seed.subs[k]));
        }
        fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2));
        return;
    }
    if (on('seed')) {
        const t = tag(`u24i29${RUN}`);
        const u = (k) => `${t}${k}`;
        await app.api.createContext({tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`, supportedLocales: ['en', 'fr_CA']},
            users: [{username: u('mgr'), roles: ['manager']}, {username: u('au'), roles: ['author']}]});
        const subs = {};
        const mk = async (k, spec) => {
            try {
                const r = await app.api.createSubmission({tag: `${t}${k}`, context: t, submitter: u('au'), title: `${k} i29 ${t}`, ...spec});
                subs[k] = {id: r.submissionId, stageId: r.stageId, rounds: (r.reviewRounds || []).map((x) => ({id: x.id, stageId: x.stageId, round: x.round}))};
            } catch (e) { subs[k] = {error: String(e.message).slice(0, 400)}; }
            log(app.name, 'seed', k, JSON.stringify(subs[k]));
        };
        if (isOPS) {
            await mk('P', {});
            await mk('X', {decisions: ['decline']});
            await mk('D', {published: true});
            await mk('V', {published: true});
        } else {
            await mk('S', {});
            await mk('R', {decisions: [isOMP ? 'sendInternalReview' : 'sendExternalReview']});
            if (isOMP) await mk('R2', {decisions: ['sendInternalReview', 'sendExternalReview']});
            await mk('C', {decisions: ['skipExternalReview']});
            await mk('P', {decisions: ['skipExternalReview', 'sendToProduction']});
            await mk('X', {decisions: ['initialDecline']});
            await mk('D', {published: true});
            await mk('V', {published: true});
        }
        seed = {context: t, mgr: u('mgr'), au: u('au'), subs};
        fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2));
        note(`I29 [${app.name}] ${RUN}: scratch context ${t} (UI en + fr_CA), users ${u('mgr')} (manager), ${u('au')} (author); subs ${Object.entries(subs).map(([k, v]) => `${k}=${v.id}`).join(' ')}`);
        return;
    }
    seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    const t = seed.context;
    const S = seed.subs;
    const url = (loc_, p) => app.url(`/index.php/${t}/${loc_}${p}`);
    const wf = (loc_, id, key) => url(loc_, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const awf = (loc_, id, key) => url(loc_, `/dashboard/mySubmissions?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);

    const {page, close} = await launch(app);
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push({at: page.url().replace(/^https?:\/\/[^/]+/, ''), console: m.text().slice(0, 300)}); });
    page.on('pageerror', (e) => errs.push({at: page.url().replace(/^https?:\/\/[^/]+/, ''), pageerror: String(e.message).slice(0, 300)}));
    const bad = [];
    page.on('response', (r) => { if (r.status() >= 400) bad.push({status: r.status(), method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 220)}); });
    const browserDialogs = [];
    page.on('dialog', async (d) => { browserDialogs.push({type: d.type(), message: d.message().slice(0, 200)}); await d.accept().catch(() => {}); });

    async function settle() {
        await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 25000}).catch(() => {});
        await page.waitForFunction(() => {
            const h = document.querySelector('[data-cy="sidemodal-header"]');
            const d = h && h.closest('[role=dialog]');
            return d && d.querySelector('nav a') && !/Loading|Refreshing data|Chargement/.test(d.innerText);
        }, null, {timeout: 20000}).catch(() => {});
        await idle(page); await page.waitForTimeout(600); await idle(page);
    }
    const facts = {};
    const fact = (k, v) => { facts[k] = v; log(app.name, k, JSON.stringify(v).slice(0, 700)); };
    async function snap(label, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        const info = await wfInfo(page);
        const raw = await rawKeys(page);
        record(`${RUN}-${label}`, {...s, info, rawKeys: raw, ...(extra || {})});
        await shot(page, `${RUN}-${label}`).catch(() => {});
        return {info, raw};
    }
    const brief = (info, raw, e0, b0) => ({
        key: menuKey(page), heading: info.heading, bubble: info.bubble, headerButtons: info.headerButtons,
        status: info.statusBox && flat(info.statusBox.text, 220), left: flat(info.controlsLeft, 200), right: flat(info.controlsRight, 200),
        primaryH3: info.primaryH3, actions: info.actions, secondaryH3: info.secondaryH3,
        raw: (raw || []).filter((r) => !/hidden/.test(r)), rawHidden: (raw || []).filter((r) => /hidden/.test(r)),
        otherDialogs: info.otherDialogs && info.otherDialogs.length ? info.otherDialogs.map((d) => flat(d, 200)) : undefined,
        errors: errs.slice(e0).length ? errs.slice(e0) : undefined, bad: bad.slice(b0).length ? bad.slice(b0) : undefined,
    });
    const menuShape = (info) => (info.menu || []).map((m) => `${'  '.repeat(m.level - 1)}${m.t}${m.visible ? '' : ' (hidden)'}${m.striped ? ' [stripe]' : ''}${m.selected ? ' [sel]' : ''}`);

    async function open(u_, label) {
        const e0 = errs.length; const b0 = bad.length;
        await page.goto(u_); await settle();
        const {info, raw} = await snap(label);
        return {landing: brief(info, raw, e0, b0), header: flat(info.headerText, 400), menu: menuShape(info)};
    }
    // Press one menu entry, found by its label and level (nth among equals), and read the screen.
    async function press(label, level, nth, snapLabel) {
        const nav = page.locator('[data-cy="sidemodal-header"]').first().locator('xpath=ancestor::*[@role="dialog"][1]').locator('nav');
        const idx = await nav.locator('a').evaluateAll((as, [lab, lev, n]) => {
            const lv = (a) => { const c = a.className || ''; if (/!px-(7|9)\b/.test(c)) return 2; if (/!px-(10|12)\b/.test(c)) return 3; if (/!px-(14|16)\b/.test(c)) return 4; return 1; };
            const hits = as.map((a, i) => ({i, t: (a.textContent || '').trim().replace(/\s+/g, ' '), l: lv(a)})).filter((x) => x.t === lab && x.l === lev);
            return hits[n] ? hits[n].i : -1;
        }, [label, level, nth]);
        if (idx < 0) return {label, missing: true};
        const e0 = errs.length; const b0 = bad.length;
        await nav.locator('a').nth(idx).click({timeout: 10000}).catch((x) => log('click failed', label, String(x.message).slice(0, 100)));
        await idle(page); await page.waitForTimeout(900); await idle(page);
        const {info, raw} = await snap(snapLabel);
        return {label, ...brief(info, raw, e0, b0)};
    }
    // Walk the menu: every visible stage/round entry (group 1 in the editorial view), and, when
    // `pages`, every page under the newest version node (and the Marketing pages on a press).
    async function walk(prefix, {pages = false} = {}) {
        let info = await wfInfo(page);
        const groups = info.menu.filter((m) => m.level === 1).map((m) => m.t);
        const out = {groups, entries: []};
        // The publication group: the second group when there are two or more, else the only one.
        const pubGroup = groups.length >= 2 ? groups[1] : groups[0];
        // Make sure the newest version node's pages are shown.
        if (pages) {
            const iPub = info.menu.findIndex((m) => m.level === 1 && m.t === pubGroup);
            let end = info.menu.findIndex((m, i) => i > iPub && m.level === 1); if (end < 0) end = info.menu.length;
            const nodes = info.menu.map((m, i) => ({...m, i})).filter((m) => m.i > iPub && m.i < end && m.level === 2);
            const last = nodes.filter((n) => info.menu[n.i + 1] && info.menu[n.i + 1].level === 3).pop();
            if (last && !info.menu[last.i + 1].visible) {
                const nth = nodes.filter((n) => n.t === last.t && n.i < last.i).length;
                await press(last.t, 2, nth, `${prefix}-expand-node`);
                info = await wfInfo(page);
            }
        }
        const seen = {};
        let group = null;
        const targets = [];
        for (const m of info.menu) {
            if (m.level === 1) { group = m.t; continue; }
            const nth = (seen[`${m.t}|${m.level}`] = (seen[`${m.t}|${m.level}`] || 0) + 1) - 1;
            if (!m.visible) continue;
            const inPub = group === pubGroup;
            if (inPub && m.level === 2) continue; // version nodes and "Create New Version"
            if (inPub && !pages) continue;
            if (!inPub && group !== groups[0] && !pages) continue; // Marketing
            targets.push({t: m.t, level: m.level, nth, group});
        }
        let n = 0;
        for (const x of targets) {
            n++;
            // A stage entry pressed folds its rounds away (Rule 8a): unfold by pressing the parent again.
            if (x.level === 3) {
                const now = (await wfInfo(page)).menu;
                const hits = now.map((m, i) => ({...m, i})).filter((m) => m.t === x.t && m.level === 3);
                const me = hits[x.nth];
                if (me && !me.visible) {
                    const parent = now.slice(0, me.i).filter((m) => m.level === 2).pop();
                    if (parent) {
                        const pn = now.slice(0, me.i).filter((m) => m.level === 2 && m.t === parent.t).length - 1;
                        await press(parent.t, 2, pn, `${prefix}-e${String(n).padStart(2, '0')}-unfold`);
                    }
                }
            }
            const r = await press(x.t, x.level, x.nth, `${prefix}-e${String(n).padStart(2, '0')}`);
            out.entries.push({group: x.group, ...r});
        }
        return out;
    }

    async function asUser(who) { await signIn(page, seed[who], {contextPath: t}); await idle(page); }

    try {
        // ------------------------------------------------------------------ mgr / en: the manager, every submission
        for (const lang of ['fr_CA', 'en']) {
            const phase = lang === 'fr_CA' ? 'mgr' : 'en';
            if (!on(phase)) continue;
            await sect(phase, async () => {
                await asUser('mgr');
                const keys = Object.keys(S).filter((k) => S[k].id);
                for (const k of keys) {
                    const pre = `${phase}-${k}`;
                    const o = await open(wf(lang, S[k].id), `${pre}-landing`);
                    o.walk = await walk(pre, {pages: ['P', 'D'].includes(k)});
                    fact(`${lang}:mgr:${k}`, o);
                }
                // the dashboard behind, and the panel closed in this language (address and list)
                const e0 = errs.length; const b0 = bad.length;
                await page.goto(wf(lang, S.P.id)); await settle();
                const closeBtn = page.locator('[data-cy="sidemodal-header"]').first().locator('xpath=ancestor::*[@role="dialog"][1]').getByRole('button').filter({hasText: /Close|Fermer|##/}).first();
                await loc(page, `workflow panel (${lang}): its Close button`, closeBtn);
                const closeLabel = flat(await closeBtn.innerText().catch(() => null), 40) || await closeBtn.getAttribute('aria-label').catch(() => null);
                await closeBtn.click({timeout: 8000}).catch(() => {});
                await idle(page); await page.waitForTimeout(800);
                const s = await snap(`${phase}-closed`);
                fact(`${lang}:mgr:closed`, {closeLabel, url: page.url().replace(/^https?:\/\/[^/]+/, ''), raw: s.raw, errors: errs.slice(e0), bad: bad.slice(b0)});
            });
        }

        // ------------------------------------------------------------------ au: the Author
        if (on('au')) await sect('au', async () => {
            await asUser('au');
            for (const lang of ['fr_CA', 'en']) {
                for (const k of ['R', 'P', 'D'].filter((x) => S[x] && S[x].id)) {
                    const pre = `au-${lang}-${k}`;
                    const o = await open(awf(lang, S[k].id), `${pre}-landing`);
                    o.walk = await walk(pre, {pages: true});
                    fact(`${lang}:au:${k}`, o);
                }
            }
        });

        // ------------------------------------------------------------------ ver: a second version, on screen
        if (on('ver')) await sect('ver', async () => {
            await asUser('mgr');
            const V = S.V.id;
            // English control of the dialog first, cancelled (nothing created)
            for (const lang of ['en', 'fr_CA']) {
                await page.goto(wf(lang, V)); await settle();
                await page.locator('[data-cy="sidemodal-header"] h1 span.underline').first().waitFor({timeout: 20000}).catch(() => {});
                const info = await wfInfo(page);
                const iPub = info.menu.findIndex((m) => m.level === 1 && m === info.menu.filter((x) => x.level === 1)[1]);
                const lastL2 = info.menu.map((m, i) => ({...m, i})).filter((m) => m.i > iPub && m.level === 2).pop();
                const nav = page.locator('[data-cy="sidemodal-header"]').first().locator('xpath=ancestor::*[@role="dialog"][1]').locator('nav');
                const link = nav.getByRole('link', {name: lastL2.t, exact: true}).last();
                await loc(page, `side menu (${lang}): the publication group's last entry ("Create New Version")`, link);
                const e0 = errs.length; const b0 = bad.length;
                await link.click();
                const dlg = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')});
                await dlg.locator('select[name="versionStage"]').waitFor({timeout: 25000}).catch(() => {});
                await idle(page); await page.waitForTimeout(500);
                const d = await dlg.evaluate((el) => ({
                    text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 900),
                    selects: [...el.querySelectorAll('select')].map((s) => ({name: s.name, value: s.value, options: [...s.options].map((o) => `${o.value}=${o.textContent.trim()}`)})),
                    buttons: [...el.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean),
                })).catch((e) => ({error: String(e.message)}));
                const s = await snap(`ver-${lang}-dialog`, {dialogRead: d});
                const out = {entry: lastL2.t, dialog: d, raw: s.raw, errors: errs.slice(e0), bad: bad.slice(b0)};
                const btns = dlg.locator('button');
                if (lang === 'en') {
                    await dlg.getByRole('button', {name: 'Cancel', exact: true}).click({timeout: 8000}).catch(() => {});
                    out.left = 'Cancel';
                } else {
                    // Confirm: the first footer button in the dialog (en "Confirm")
                    const n = await btns.count();
                    let pressed = null;
                    for (let i = 0; i < n; i++) {
                        const b = btns.nth(i); const tx = flat(await b.innerText().catch(() => ''), 40);
                        if (/Confirm|Confirmer|##common.confirm##|OK/i.test(tx)) { pressed = tx; await b.click(); break; }
                    }
                    out.pressed = pressed;
                    await page.waitForTimeout(1500); await idle(page); await settle();
                }
                await page.waitForTimeout(800); await idle(page);
                const after = await snap(`ver-${lang}-after`);
                out.after = {menu: menuShape(after.info), raw: after.raw, heading: after.info.heading, left: flat(after.info.controlsLeft, 200), right: flat(after.info.controlsRight, 200), errors: errs.slice(e0), bad: bad.slice(b0)};
                fact(`${lang}:ver:dialog`, out);
            }
            // The new version, read in both languages: landing, stages, and its pages
            for (const lang of ['fr_CA', 'en']) {
                const o = await open(wf(lang, V), `ver-${lang}-V2-landing`);
                o.walk = await walk(`ver-${lang}-V2`, {pages: true});
                fact(`${lang}:ver:V2`, o);
            }
            // Sweep: French "Title & Abstract" of the new version, a change typed, left unsaved by pressing a stage entry
            await page.goto(wf('fr_CA', V)); await settle();
            const info = await wfInfo(page);
            const sel = info.menu.find((m) => m.selected);
            const box = page.locator('[data-cy="workflow-primary-items"] input[type="text"]:visible').first();
            const had = await box.count();
            const d0 = browserDialogs.length; const e0 = errs.length;
            if (had) { await box.fill('u24i29 unsaved change'); await box.blur().catch(() => {}); }
            const firstStage = info.menu.filter((m) => m.level === 2 && m.visible)[0];
            const r = await press(firstStage.t, 2, 0, 'ver-fr_CA-leave-unsaved');
            await page.waitForTimeout(2000);
            fact('fr_CA:ver:leaveUnsaved', {from: sel && sel.t, typedInto: had ? 'first text box' : 'none', to: firstStage.t, browserDialogs: browserDialogs.slice(d0), otherDialogs: r.otherDialogs, heading: r.heading, errors: errs.slice(e0)});
        });

        // ------------------------------------------------------------------ dlg: the frame's own dialogs and controls, fr_CA and en
        if (on('dlg') || on('rtd')) await sect('dlg', async () => {
            await asUser('mgr');
            const panel = () => page.locator('[data-cy="sidemodal-header"]').first().locator('xpath=ancestor::*[@role="dialog"][1]');
            const readDialog = async () => page.locator('[role="dialog"]:visible').evaluateAll((ds) => ds.filter((d) => !d.querySelector('[data-cy="sidemodal-header"]')).map((d) => ({
                text: d.innerText.replace(/\s+/g, ' ').trim().slice(0, 500),
                buttons: [...d.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean),
            }))).catch(() => []);
            // Press a button found by its English and French labels, read the dialog it opens, leave by its 2nd button (Cancel).
            async function dialogOf(where, re, label, {confirm = false} = {}) {
                const b = where.getByRole('button').filter({hasText: re}).first();
                await loc(page, `${label}: the button`, b);
                if (!(await b.count())) return {absent: true};
                const e0 = errs.length; const b0 = bad.length;
                const buttonText = flat(await b.innerText(), 80);
                await b.click(); await page.waitForTimeout(800); await idle(page);
                const d = await readDialog();
                const s = await snap(`dlg-${label}`);
                const top = page.locator('[role="dialog"]:visible').filter({hasNot: page.locator('[data-cy="sidemodal-header"]')}).last();
                const btns = top.locator('button').filter({hasText: /\S/});
                const n = await btns.count();
                const want = confirm ? /^(Confirm|Confirmer|##common\.confirm##)$/ : /^(Cancel|Annuler|##common\.cancel##)$/;
                let pressed = null;
                for (let i = 0; i < n; i++) { const tx = flat(await btns.nth(i).innerText(), 30); if (want.test(tx)) { pressed = tx; await btns.nth(i).click(); break; } }
                await page.waitForTimeout(1200); await idle(page);
                if (confirm) await settle();
                const after = await wfInfo(page);
                return {buttonText, dialog: d, raw: (s.raw || []).filter((r) => /@ dialog/.test(r)), pressed, afterHeaderButtons: after.headerButtons, afterBubble: after.bubble, errors: errs.slice(e0), bad: bad.slice(b0)};
            }
            if (on('dlg')) for (const lang of ['fr_CA', 'en']) {
                const o = {};
                // Rule 19: the Delete dialog, on the declined submission (cancelled)
                if (S.X && S.X.id) {
                    await page.goto(wf(lang, S.X.id)); await settle();
                    if (isOPS) { const i = await wfInfo(page); const st = i.menu.find((m) => m.level === 2 && m.visible); if (st) await press(st.t, 2, 0, `dlg-${lang}-X-stage`); }
                    o.delete = await dialogOf(panel(), /^\s*(Delete|Supprimer|##common\.delete##)\s*$/, `${lang}-delete`);
                }
                // Rule 18a: Return to Workflow on D (cancelled)
                await page.goto(wf(lang, S.D.id)); await settle();
                o.returnToWorkflow = await dialogOf(panel().locator('[data-cy="sidemodal-header"]'), /Return to Workflow|returnToWorkflow|Retour/, `${lang}-rtw`);
                // OMP: the work-type control's menu (opened, read, closed by pressing it again)
                if (isOMP) {
                    const btn = panel().locator('[data-cy="sidemodal-header"]').getByRole('button').filter({hasText: /Monograph|Edited Volume|##common\.publication##|Monographie|Ouvrage collectif/}).first();
                    await loc(page, `${lang}: the work-type header control`, btn);
                    if (await btn.count()) {
                        const txt = flat(await btn.innerText(), 60);
                        await btn.click(); await page.waitForTimeout(700);
                        const items = await page.getByRole('menuitem').evaluateAll((es) => es.filter((e) => e.getClientRects().length).map((e) => e.innerText.trim()));
                        const s = await snap(`dlg-${lang}-worktype`);
                        await btn.click().catch(() => {}); await page.waitForTimeout(500);
                        o.workType = {buttonText: txt, items, raw: (s.raw || []).filter((r) => !/side-nav|top-header|@ page/.test(r))};
                    }
                }
                fact(`${lang}:dlg`, o);
            }
            // Sweep: Title & Abstract of P, a box changed, left unsaved by pressing a stage entry; read back on return and after a reload
            if (on('dlg')) for (const lang of ['fr_CA', 'en']) {
                await page.goto(wf(lang, S.P.id, `publication_${'x'}`)); await settle();
                const i0 = await wfInfo(page);
                const ta = i0.menu.find((m) => m.level === 3 && m.visible);
                if (ta) await press(ta.t, 3, 0, `dlg-${lang}-P-ta`);
                const box = panel().locator('[data-cy="workflow-primary-items"] input[type="text"]:visible').first();
                const before = await box.inputValue().catch(() => null);
                const d0 = browserDialogs.length;
                await box.fill(`u24i29 unsaved ${lang}`).catch(() => {}); await box.blur().catch(() => {});
                const typed = await box.inputValue().catch(() => null);
                const boxName = await box.evaluate((e) => e.name || e.id).catch(() => null);
                const st = (await wfInfo(page)).menu.find((m) => m.level === 2 && m.visible && !/version|##publication/.test(m.t));
                const r = await press(st.t, 2, 0, `dlg-${lang}-P-left`);
                await page.waitForTimeout(2000);
                const leftDialogs = await readDialog();
                await press(ta.t, 3, 0, `dlg-${lang}-P-back`);
                const onReturn = await box.inputValue().catch(() => null);
                await page.reload(); await settle();
                const i2 = await wfInfo(page);
                const ta2 = i2.menu.find((m) => m.t === ta.t && m.visible);
                if (ta2 && !ta2.selected) await press(ta.t, 3, 0, `dlg-${lang}-P-reload`);
                const afterReload = await box.inputValue().catch(() => null);
                fact(`${lang}:dlg:leaveUnsaved`, {page: ta.t, boxName, before, typed, to: st.t, headingAfterLeave: r.heading, browserDialogs: browserDialogs.slice(d0), leftDialogs, onReturn, afterReload});
            }
            // Rule 18a/18b in fr_CA: confirm Return to Workflow on D, then read "Return to Done" and its dialog (cancelled), both languages
            if (on('dlg')) {
            await page.goto(wf('fr_CA', S.D.id)); await settle();
            const conf = await dialogOf(panel().locator('[data-cy="sidemodal-header"]'), /Return to Workflow|returnToWorkflow|Retour/, 'fr_CA-rtw-confirm', {confirm: true});
            fact('fr_CA:dlg:rtwConfirmed', conf);
            }
            for (const lang of ['fr_CA', 'en']) {
                await page.goto(wf(lang, S.D.id)); await settle();
                const info = await wfInfo(page);
                const rtd = await dialogOf(panel().locator('[data-cy="sidemodal-header"]'), /Return to Done|returnToDone/, `${lang}-rtd`);
                fact(`${lang}:dlg:returnToDone`, {landingKey: menuKey(page), bubble: info.bubble, headerButtons: info.headerButtons, heading: info.heading, left: flat(info.controlsLeft, 200), right: flat(info.controlsRight, 200), status: info.statusBox && flat(info.statusBox.text, 200), dialog: rtd});
            }
        });

        // ------------------------------------------------------------------ omp2: row 29
        if (on('omp2') && isOMP) await sect('omp2', async () => {
            await asUser('mgr');
            for (const lang of ['en', 'fr_CA']) {
                for (const k of ['R2', 'R']) {
                    const o = await open(wf(lang, S[k].id), `omp2-${lang}-${k}-landing`);
                    o.selected = (await wfInfo(page)).menu.filter((m) => m.selected).map((m) => m.t);
                    const info = await wfInfo(page);
                    const g = info.menu.filter((m) => m.level === 2 && m.visible);
                    const stageLabels = g.slice(0, 5).map((m) => m.t);
                    o.stages = stageLabels;
                    o.press = [];
                    // Internal Review (2nd), External Review (3rd); then their rounds (level 3 under each)
                    for (const i of [1, 2]) o.press.push(await press(stageLabels[i], 2, 0, `omp2-${lang}-${k}-stage${i + 1}`));
                    await page.goto(wf(lang, S[k].id)); await settle();
                    const info2 = await wfInfo(page);
                    const rounds = [];
                    let cur = null;
                    for (const m of info2.menu) { if (m.level === 2) cur = m.t; if (m.level === 3 && (cur === stageLabels[1] || cur === stageLabels[2])) rounds.push({under: cur, t: m.t}); }
                    const seen = {};
                    for (const r of rounds) { const nth = (seen[r.t] = (seen[r.t] || 0) + 1) - 1; o.press.push({under: r.under, ...(await press(r.t, 3, nth, `omp2-${lang}-${k}-round-${r.under.replace(/\W+/g, '')}`))}); }
                    fact(`${lang}:omp2:${k}`, o);
                }
            }
        });
    } finally {
        record(`${RUN}-facts-${PHASES.join('+')}`, {facts, errors: errs, bad, browserDialogs}, {merge: true});
        await close();
    }
});
