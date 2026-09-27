const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U45 claim check, chunk K5: export, deposit, the agency panel, statuses, the plugins' Tools pages.
// Spec: docs/specs/U45-dois.md lines 369–432 (Rules 29–33), 526–542 (Rule 44; Side effects: deposits,
// downloads), 547–551 (Side effects: head tags), 591–594 (Setting 10), register A4, the Coverage section.
//
// Per app, scratch contexts (tag prefix u45k5), all through POST scenarios/context:
//   CR  (OJS, OPS) Crossref configured: prefix 10.1234, depositor name/email, OJS publisher + ISSN; OJS kinds
//       publication+issue+peerReview, OPS publication. Works: u1 unpublished with a DOI, p1..p8 published (OJS in the
//       published issue Vol. 1 No. 1), OJS pr published with a completed public review. OJS issue Vol. 1 No. 2 unpublished.
//   DC  (OJS) DataCite configured: prefix, kinds publication+issue+representation. Same works (with a PDF galley).
//   DT  (OJS) DataCite with "Testing" ticked and "Test DOI Prefix" 10.5072: one published work (Setting 10).
//   CT  (OJS, OPS) Crossref with "Testing" ticked: one published work (Setting 10).
//   CM  (OJS) Crossref configured with "Crossmark" ticked: one published work (head tags).
//   N   (every app) DOIs on, prefix, no agency: control (no export, no deposit, no panel; OMP has no agency at all).
//   SY  (every app) versioning "No": works for Rule 32 (Registered → unpublish → publish; new version).
//   VY  (every app) versioning "Yes": works for Rule 32's versioning branch. OJS VY is set back to "No" on screen
//       at the end of the phase (an OJS journal left on "Yes" makes every OJS OAI request answer 500).
// Users per context: mg (manager), ed (editor, OJS/OMP), se (sectionEditor), au (author), rv (OJS reviewer).
//
//   PROBE_FEATURE=U45 PROBE_AGENT=ccK5 node bin/probe.js all shared/playwright/checks/U45/K5/k5.js
//   PHASES=seed,tools,panel,export,deposit,jobs1,errors,depositall,jobs2,sync,issue,testing,head,statuses,roles,leave
//   (default all; state in k5-state-<app>.json; a mutating phase runs once per seed: delete the state file for a
//   fresh run). The jobs phases drain the fleet's queue with the app's own worker
//   (php lib/pkp/tools/jobs.php work --stop-when-empty --tries=1): the test fleets run with job_runner Off, and the
//   queue is shared, so the drain also runs other features' queued jobs. No assertions: the script records.
// Database reads (psql SELECT) are evidence only; nothing is written there.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const ALL = ['seed', 'tools', 'panel', 'export', 'deposit', 'jobs1', 'errors', 'depositall', 'jobs2', 'sync', 'issue', 'testing', 'head', 'statuses', 'roles', 'leave'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const T = 30000;
const T0 = Date.now();
const REPO = path.resolve(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const log = (...a) => console.log(`[k5 ${app.name} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const sf = path.join(outDir(), `k5-state-${app.name}.json`);
    const S = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const done = (p) => (S.done || []).includes(p);
    const markDone = (p) => { S.done = [...new Set([...(S.done || []), p])]; save(); };
    const fact = (k, v) => { record('k5-facts', {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 2500)); };
    const appRoot = path.resolve(REPO, app.root);
    const psql = (sql) => {
        try {
            return execFileSync('psql', [`${dbName(app.name)}`, '-At', '-F', '|', '-c', sql], {encoding: 'utf8', timeout: 20000}).trim().split('\n').filter(Boolean);
        } catch (e) { return [`psql error: ${flat(e.message, 200)}`]; }
    };
    const galley = isOMP ? {publicationFormats: [{name: 'PDF', file: 'article.pdf'}]} : {galleys: [{label: 'PDF', file: isOPS ? 'preprint.pdf' : 'article.pdf'}]};
    const toCopy = isOPS ? {} : {decisions: ['skipExternalReview']};

    // ------------------------------------------------------------------ seed
    async function mkCtx(key, extra = {}, {reviewer = false} = {}) {
        if (S[key]) return S[key];
        const t = tag(`u45k5${key.toLowerCase()}`);
        const roles = [['mg', ['manager'], 'Mona', 'Manager'], ['se', ['sectionEditor'], 'Sami', 'Section'], ['au', ['author'], 'Ada', 'Lovelace']];
        if (!isOPS) roles.push(['ed', ['editor'], 'Edda', 'Editor']);
        if (reviewer && isOJS) roles.push(['rv', ['externalReviewer'], 'Rhea', 'Reviewer']);
        const {context: cx = {}, ...rest} = extra;
        try {
            const res = await app.api.createContext({tag: t, context: {name: `U45 K5 ${key} ${t}`, acronym: 'K5J', contactName: 'K5 Contact',
                contactEmail: `${t}c@mail.test`, country: 'CA', ...cx}, users: roles.map(([u, r, g, f]) => ({username: `${t}${u}`, roles: r, givenName: g, familyName: f})), ...rest});
            S[key] = {path: res.path || t, id: res.contextId, issues: res.issues || null, u: Object.fromEntries(roles.map(([u]) => [u, `${t}${u}`])), subs: {}};
        } catch (e) {
            S[key] = {error: flat(e.message, 800)};
            log(`[seed ctx ${key}]`, S[key].error);
        }
        save();
        return S[key];
    }
    async function mkSub(C, key, spec) {
        if (!C || C.error) return null;
        if (C.subs[key]) return C.subs[key];
        const title = spec.title || `K5 ${key} work`;
        try {
            const {submitter, ...r} = spec;
            const res = await app.api.createSubmission({tag: `${C.path}${key}`, context: C.path, submitter: submitter || C.u.au, title, ...r});
            C.subs[key] = {id: res.submissionId, pub: res.publicationId, title, stageId: res.stageId, galleys: res.galleys || null};
        } catch (e) {
            C.subs[key] = {error: flat(e.message, 600), title};
            log(`[seed ${key}]`, C.subs[key].error);
        }
        save();
        return C.subs[key];
    }
    const TITLES = ['Axolotl limb memory', 'Okapi forest census', 'Tapir seed dispersal', 'Wombat burrow geometry', 'Puffin burrow sharing',
        'Walrus haul-out timing', 'Heron wading depth', 'Egret plume moult'];
    const issueOf = (n) => (isOJS ? {issue: {volume: 1, number: n, year: n === 1 ? 2025 : 2026}} : {});
    const ojsIssues = [{volume: 1, number: 1, year: 2025, published: true}, {volume: 1, number: 2, year: 2026}];
    const xrefSettings = (t, more = {}) => ({depositorName: 'K5 Depositor', depositorEmail: `${t}dep@mail.test`, ...more});
    const ojsMasthead = {publisherInstitution: 'K5 Press', onlineIssn: '0378-5955'};

    if (on('seed') && !done('seed')) {
        const t0 = tag('x');
        // agency contexts
        if (!isOMP) {
            const CR = await mkCtx('CR', {doiPrefix: '10.1234', enabledDoiTypes: isOJS ? ['publication', 'issue', 'peerReview'] : ['publication'],
                plugins: {crossrefplugin: {enabled: true, settings: xrefSettings(t0)}}, registrationAgency: 'crossrefplugin',
                ...(isOJS ? {...ojsMasthead, issues: ojsIssues, review: {defaultReviewPublicVisibility: true}} : {})}, {reviewer: true});
            await mkSub(CR, 'u1', {title: 'Narwhal tusk acoustics', ...toCopy});
            for (let i = 1; i <= 8; i++) await mkSub(CR, `p${i}`, {title: TITLES[i - 1], published: true, ...galley, ...issueOf(1)});
            if (isOJS) {
                await mkSub(CR, 'pr', {title: 'Ibex cliff balance', decisions: ['sendExternalReview', 'accept'],
                    reviewRounds: [{reviewers: [{username: CR.u.rv, status: 'completed'}]}], published: true, ...galley, ...issueOf(1)});
            }
            const CT = await mkCtx('CT', {doiPrefix: '10.1234', plugins: {crossrefplugin: {enabled: true, settings: xrefSettings(t0, {testMode: true})}},
                registrationAgency: 'crossrefplugin', ...(isOJS ? {...ojsMasthead, issues: ojsIssues} : {})});
            await mkSub(CT, 'p1', {title: 'Gecko toe adhesion', published: true, ...galley, ...issueOf(1)});
        }
        if (isOJS) {
            const DC = await mkCtx('DC', {doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'issue', 'representation'],
                plugins: {dataciteplugin: {enabled: true, settings: {username: 'K5SYMBOL'}}}, registrationAgency: 'dataciteplugin', issues: ojsIssues});
            await mkSub(DC, 'u1', {title: 'Narwhal tusk acoustics', ...toCopy, ...galley});
            for (let i = 1; i <= 8; i++) await mkSub(DC, `p${i}`, {title: TITLES[i - 1], published: true, ...galley, ...issueOf(1)});
            const DT = await mkCtx('DT', {doiPrefix: '10.1234', plugins: {dataciteplugin: {enabled: true, settings: {username: 'K5SYMBOL',
                testMode: true, testUsername: 'K5TEST', testDOIPrefix: '10.5072'}}}, registrationAgency: 'dataciteplugin', issues: ojsIssues});
            await mkSub(DT, 'p1', {title: 'Kiwi nocturnal foraging', published: true, ...galley, ...issueOf(1)});
            const CM = await mkCtx('CM', {doiPrefix: '10.1234', plugins: {crossrefplugin: {enabled: true, settings: xrefSettings(t0, {crossmark: true, updatePolicyDoi: '10.1234/policy'})}},
                registrationAgency: 'crossrefplugin', ...ojsMasthead, issues: ojsIssues});
            await mkSub(CM, 'p1', {title: 'Otter tool use', published: true, ...galley, ...issueOf(1)});
        }
        // control and status contexts
        const N = await mkCtx('N', {doiPrefix: '10.1234', ...(isOJS ? {issues: ojsIssues} : {})});
        await mkSub(N, 'p1', {title: 'Beaver dam hydrology', published: true, ...galley, ...issueOf(1)});
        await mkSub(N, 'u1', {title: 'Narwhal tusk acoustics', ...toCopy});
        const SY = await mkCtx('SY', {doiPrefix: '10.1234', doiVersioning: false, ...(isOJS ? {enabledDoiTypes: ['publication', 'issue'], issues: ojsIssues} : {})});
        for (const k of ['s1', 's2', 's3', 's4']) await mkSub(SY, k, {title: `Sync work ${k}`, published: true, ...galley});
        S.seeded = true; save();
        markDone('seed');
        fact('seed', Object.fromEntries(Object.entries(S).filter(([k]) => /^[A-Z]{1,2}$/.test(k))));
    }
    // VY is seeded by the sync phase itself (OJS: keep the "Yes" window short)

    const ctxUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    let seq = S.seq || 0;
    const snap = async (name, extra) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const n = `k5-${String(++seq).padStart(3, '0')}-${name}`;
        S.seq = seq; save();
        record(n, s);
        await shot(page, n).catch(() => {});
        return `${n}-${app.name}`;
    };
    let who = null;
    const as = async (user, ctx) => {
        if (who === `${user}@${ctx}`) return;
        await signIn(page, user, {contextPath: ctx});
        await idle(page).catch(() => {});
        who = `${user}@${ctx}`;
    };
    // toasts (they expire after five seconds) and every window the page opens
    await page.addInitScript(() => {
        window.__k5notes = [];
        window.__k5dialogs = [];
        const seen = new WeakSet();
        const seenD = new WeakSet();
        const scan = () => {
            document.querySelectorAll('.app__notifications .pkpNotification, .app__notifications [class*="otification"]').forEach((n) => {
                if (seen.has(n)) return;
                seen.add(n);
                const t = n.innerText.replace(/\s+/g, ' ').trim();
                if (t && t !== '× Close') window.__k5notes.push(t);
            });
            document.querySelectorAll('[role="dialog"], [role="alertdialog"]').forEach((n) => {
                const t = n.innerText.replace(/\s+/g, ' ').trim();
                if (!t) return;
                if (seenD.has(n) && n.__k5t === t) return;
                seenD.add(n); n.__k5t = t;
                window.__k5dialogs.push(t.slice(0, 600));
            });
        };
        new MutationObserver(scan).observe(document, {childList: true, subtree: true, characterData: true});
    });
    const takeNotes = async () => page.evaluate(() => { const n = window.__k5notes || []; window.__k5notes = []; return n; }).catch(() => []);
    const takeDialogs = async () => page.evaluate(() => { const n = window.__k5dialogs || []; window.__k5dialogs = []; return n; }).catch(() => []);
    let traffic = [];
    const crashes = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (r.status() >= 500) crashes.push({status: r.status(), method: r.request().method(), url: u.replace(/^https?:\/\/[^/]+/, '')});
        if (!/\/api\/v1\/(_)?dois/.test(u) && !/\/unpublish|\/publish|\/version/.test(u)) return;
        if (r.request().method() === 'GET' && !/\/exports\//.test(u)) return;
        const e = {method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null,
            url: u.replace(/^https?:\/\/[^/]+/, ''), status: r.status(), post: flat(r.request().postData(), 300)};
        if (/\/exports\//.test(u)) e.headers = {type: r.headers()['content-type'], disposition: r.headers()['content-disposition'], length: r.headers()['content-length']};
        else if (r.status() >= 400 || /deposit|export/.test(u)) e.body = flat(await r.text().catch(() => null), 800);
        traffic.push(e);
    });
    page.on('pageerror', (e) => crashes.push({script: flat(e.message, 200), url: page.url()}));
    const takeTraffic = () => { const t = traffic; traffic = []; return t; };
    const downloads = [];
    page.on('download', async (d) => {
        const name = d.suggestedFilename();
        const dest = path.join(outDir(), `k5-dl-${app.name}-${Date.now()}-${name.replace(/[^a-z0-9._-]/gi, '_')}`);
        const entry = {suggested: name, url: d.url().replace(/^https?:\/\/[^/]+/, ''), saved: path.basename(dest)};
        downloads.push(entry);
        try {
            await d.saveAs(dest);
            const buf = fs.readFileSync(dest);
            entry.bytes = buf.length;
            entry.zip = buf.slice(0, 2).toString('latin1') === 'PK';
            entry.head = entry.zip ? null : flat(buf.slice(0, 700).toString('utf8'), 700);
            const txt = entry.zip ? '' : buf.toString('utf8');
            entry.root = (txt.match(/<([a-z_:]+)[\s>]/gi) || []).filter((x) => !/^<\?/.test(x)).slice(0, 2);
            entry.dois = [...new Set((txt.match(/10\.\d{4,9}\/[^<"\s]+/g) || []))].slice(0, 12);
        } catch (e) { entry.err = flat(e.message, 200); }
    });
    const takeDownloads = () => downloads.splice(0, downloads.length);

    // ------------------------------------------------------------------ DOIs page helpers
    const gotoDois = async (ctx, tab) => {
        await page.goto(ctxUrl(ctx, '/dois'));
        await idle(page).catch(() => {});
        if (tab) { await page.getByRole('tab', {name: tab, exact: true}).click().catch(() => {}); await idle(page).catch(() => {}); }
        await page.locator('.listPanel__item--doi:visible, .listPanel__empty:visible').first().waitFor({timeout: 15000}).catch(() => {});
        await sleep(800);
    };
    const panel = () => page.locator('.doiListPanel:visible').first();
    const rowOf = (id) => page.locator(`[id$="-${id}"].listPanel__item--doi:visible`).first();
    const rowsText = async () => page.locator('.listPanel__item--doi:visible').evaluateAll((els) => els.map((e) => ({
        id: e.id, text: e.querySelector('.listPanel__itemSummary')?.innerText.replace(/\s+/g, ' ').trim().slice(0, 160),
        badge: e.querySelector('.listPanel__itemSummary .doiListItem__itemMetadata--badge')?.innerText.trim(),
    }))).catch(() => []);
    const badgeOf = async (id) => (await rowsText()).find((r) => r.id.endsWith(`-${id}`))?.badge ?? null;
    const expanded = async (id) => rowOf(id).evaluate((e) => {
        const x = e.querySelector('.listPanel__itemExpanded');
        if (!x) return null;
        const dep = x.querySelector('.doiListItem__depositorDetails');
        return {
            text: x.innerText.replace(/\s+/g, ' ').trim().slice(0, 900),
            rows: [...x.querySelectorAll('tbody tr')].map((r) => ({
                type: r.querySelector('td label')?.innerText.trim(), value: r.querySelector('input')?.value,
                badge: r.querySelector('.doiListItem__itemMetadata--badge')?.innerText.trim(), actions: r.querySelectorAll('td')[3]?.innerText.trim(),
            })),
            agencyPanel: dep ? {
                name: dep.querySelector('.doiListItem__depositorName')?.innerText.trim(),
                sentence: dep.querySelector('.doiListItem__depositorDescription')?.innerText.trim(),
                buttons: [...dep.querySelectorAll('button')].map((b) => ({text: b.innerText.trim(), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'})),
            } : null,
            editButtons: [...x.querySelectorAll('.doiListPanel__itemExpandedActions button')].map((b) => ({text: b.innerText.trim(), disabled: b.disabled})),
        };
    }).catch((e) => ({error: flat(e.message, 200)}));
    const expand = async (id) => {
        const r = rowOf(id);
        if (!(await r.count())) return {notListed: true};
        if (!(await r.locator('.listPanel__itemExpanded').count())) {
            await r.getByRole('button', {name: new RegExp(`details about ${id}$`)}).click().catch(() => {});
            await sleep(500);
        }
        return expanded(id);
    };
    const dialogText = async () => page.getByRole('dialog').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 600))).catch(() => []);
    const openBulk = async () => {
        if (!(await page.locator('.pkpDropdown__action:visible').count())) {
            await panel().getByRole('button', {name: 'Bulk Actions'}).click();
            await sleep(400);
        }
        return page.locator('.pkpDropdown__action:visible').allInnerTexts().then((a) => a.map((x) => flat(x, 80))).catch(() => null);
    };
    const closeBulk = async () => {
        if (await page.locator('.pkpDropdown__action:visible').count()) {
            await panel().getByRole('button', {name: 'Bulk Actions'}).click().catch(() => {});
            await sleep(300);
        }
    };
    const tick = async (ids) => { for (const id of ids) await rowOf(id).locator('input[type="checkbox"]').first().check(); await sleep(200); };
    const tickedIds = async () => page.locator('.listPanel__item--doi:visible input[type="checkbox"]:checked').evaluateAll((els) => els.map((e) => e.value)).catch(() => []);
    const closeResult = async () => {
        const ok = page.getByRole('dialog').getByRole('button', {name: /^(OK|Ok|Close)$/}).first();
        if (await ok.count()) { await ok.click().catch(() => {}); await sleep(700); }
    };
    /** A bulk action (or "Deposit All" when label is that): tick, open, snapshot the window, confirm, read what follows. */
    async function runAction(label, ids, name, {confirm = true, fromHeader = false, wait = 2500} = {}) {
        if (ids) await tick(ids);
        let menu = null;
        if (fromHeader) await panel().getByRole('button', {name: label, exact: true}).click();
        else { menu = await openBulk(); await page.locator('.pkpDropdown__action:visible', {hasText: label}).first().click(); }
        const dlg = page.getByRole('dialog').filter({hasText: fromHeader ? 'Deposit all DOIs' : label}).last();
        await dlg.waitFor({timeout: 10000}).catch(() => {});
        await sleep(400);
        const before = {menu, dialog: await dialogText(), buttons: await dlg.getByRole('button').allInnerTexts().catch(() => [])};
        const beforeSnap = await snap(`${name}-window`);
        if (!confirm) {
            await dlg.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
            await sleep(600);
            return {before, beforeSnap, cancelled: true, ticked: await tickedIds()};
        }
        await takeDialogs(); await takeNotes(); takeTraffic();
        const btnName = fromHeader ? /^Deposit All|^Deposit all/ : label;
        await dlg.getByRole('button', typeof btnName === 'string' ? {name: btnName, exact: true} : {name: btnName}).first().click();
        await sleep(wait);
        await idle(page).catch(() => {});
        await sleep(800);
        const after = {traffic: takeTraffic(), dialogsSeen: await takeDialogs(), dialogOpen: await dialogText(), notes: await takeNotes(),
            rows: await rowsText(), ticked: await tickedIds(), downloads: takeDownloads()};
        after.snap = await snap(`${name}-after`);
        await closeResult();
        return {before, beforeSnap, after};
    }
    async function sect(name, fn) {
        if (!on(name)) return;
        const c0 = crashes.length;
        log(`== ${name}`);
        try { await fn(); } catch (e) {
            fact(`${name}.FAILED`, flat(e.stack || e, 1500));
            await snap(`zz-failed-${name}`).catch(() => {});
        }
        if (crashes.length > c0) fact(`${name}.crashes`, crashes.slice(c0));
    }
    const dbDois = (ctx) => psql(`select s.submission_id, p.publication_id, p.status, coalesce(d.doi,'-'), coalesce(d.status::text,'-'), coalesce(ds.setting_value, '-') from submissions s join publications p on p.submission_id=s.submission_id left join dois d on d.doi_id=p.doi_id left join doi_settings ds on ds.doi_id=d.doi_id and ds.setting_name like '%registrationAgency%' where s.context_id=${ctx.id} order by 1,2`);
    const dbDoiSettings = (ctx) => psql(`select d.doi_id, d.doi, d.status, ds.setting_name, left(ds.setting_value, 300) from dois d join doi_settings ds on ds.doi_id=d.doi_id where d.context_id=${ctx.id} order by 1`);
    const worker = () => {
        const env = {...process.env, PKP_CONFIG_FILE: app.configFile};
        const run = (args) => {
            try { return flat(execFileSync('php', ['lib/pkp/tools/jobs.php', ...args], {cwd: appRoot, env, encoding: 'utf8', timeout: 420000, maxBuffer: 32 * 1024 * 1024}), 3000); } catch (e) { return `ERR ${flat(e.stdout || e.message, 1500)}`; }
        };
        // a failed job is released for another attempt five seconds later (BaseJob: tries 3, backoff 5), and
        // --stop-when-empty stops while it waits: pass again until no deposit job is left
        const before = run(['total']);
        const passes = [];
        for (let i = 0; i < 5; i++) {
            const w = run(['work', '--stop-when-empty', '--timeout=60', '--max-time=200']);
            passes.push(flat(w.split(/(?=\[20\d\d-)/).filter((l) => /Deposit|Failed/.test(l)).join(' | '), 1500));
            const left = psql("select count(*) from jobs where payload like '%jobs%doi%Deposit%'")[0];
            if (left === '0') break;
            execFileSync('sleep', ['7']);
        }
        return {before, passes, after: run(['total']),
            failed: psql("select id, left(exception, 180), failed_at from failed_jobs where payload like '%jobs%doi%Deposit%' and failed_at > now() - interval '20 minutes' order by id")};
    };

    try {
        // =========================================================================================
        // tools: Tools › "Import/Export" and the plugin pages (Rule 44, q26), plugin off (N) and on (CR, DC), publicknowledge read-only.
        await sect('tools', async () => {
            const out = {};
            const readTools = async (ctx, key, user) => {
                await as(user, ctx);
                const r = await page.goto(ctxUrl(ctx, '/management/tools')).catch((e) => ({err: e.message}));
                await idle(page).catch(() => {});
                const o = {status: r && r.status ? r.status() : r, url: page.url().replace(/^https?:\/\/[^/]+/, ''), tabs: await page.getByRole('tab').allInnerTexts().catch(() => [])};
                const ie = page.getByRole('tab', {name: /Import\/Export/i}).first();
                if (await ie.count()) { await ie.click(); await idle(page).catch(() => {}); await sleep(1200); }
                o.links = await page.locator('[role=tabpanel]:visible a, main a:visible').evaluateAll((els) => els.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`)).catch(() => []);
                o.links = o.links.filter((x) => /plugin|importexport/i.test(x)).map((x) => x.replace(/https?:\/\/[^/]+/, ''));
                o.snap = await snap(`tools-${key}`);
                return o;
            };
            const openPlugin = async (ctx, key, pluginName, user) => {
                await as(user, ctx);
                const r = await page.goto(ctxUrl(ctx, `/management/importexport/plugin/${pluginName}`)).catch((e) => ({err: e.message}));
                await idle(page).catch(() => {});
                const o = {status: r && r.status ? r.status() : flat(r && r.err, 200), url: page.url().replace(/^https?:\/\/[^/]+/, ''),
                    h1: await page.locator('main h1, h1').first().innerText().catch(() => null),
                    main: flat(await page.locator('main').innerText().catch(() => page.locator('body').innerText()), 700),
                    links: await page.locator('main a').evaluateAll((els) => els.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`)).catch(() => [])};
                o.links = o.links.map((x) => x.replace(/https?:\/\/[^/]+/, ''));
                o.snap = await snap(`plugin-${key}-${pluginName}`);
                // follow the notice's two links
                const noticeLinks = page.locator('main .pkpNotification a, main [class*="otification"] a, main notification a');
                const n = await noticeLinks.count().catch(() => 0);
                o.follow = [];
                for (let i = 0; i < n; i++) {
                    const href = await noticeLinks.nth(i).getAttribute('href').catch(() => null);
                    const text = await noticeLinks.nth(i).innerText().catch(() => null);
                    await noticeLinks.nth(i).click().catch(() => {});
                    await page.waitForLoadState('load').catch(() => {});
                    await idle(page).catch(() => {});
                    await sleep(800);
                    o.follow.push({text, href: String(href).replace(/https?:\/\/[^/]+/, ''), landed: page.url().replace(/^https?:\/\/[^/]+/, ''),
                        heading: await page.locator('main h1').first().innerText().catch(() => null),
                        activeTab: await page.locator('[role=tab][aria-selected=true]').allInnerTexts().catch(() => []), snap: await snap(`plugin-${key}-follow-${i}`)});
                    await page.goBack().catch(() => {});
                    await idle(page).catch(() => {});
                    await sleep(600);
                }
                return o;
            };
            const readPluginsGrid = async (ctx, key, user) => {
                await as(user, ctx);
                await page.goto(ctxUrl(ctx, '/management/settings/website'));
                await idle(page).catch(() => {});
                await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click().catch(() => {});
                await idle(page).catch(() => {});
                await page.locator('tr.gridRow').first().waitFor({timeout: 20000}).catch(() => {});
                await sleep(1000);
                const rows = page.locator('tr.gridRow').filter({hasText: /Crossref|DataCite/i});
                const o = {rows: (await rows.allInnerTexts().catch(() => [])).map((x) => flat(x, 200)), categories: (await page.locator('tr.category, .gridCategory, tbody.category_grid_body th, tr.category_grid_body').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).slice(0, 20)};
                o.rowActions = [];
                const n = await rows.count();
                for (let i = 0; i < n; i++) {
                    const row = rows.nth(i);
                    const ex = row.locator('a.show_extras');
                    if (await ex.count()) { await ex.click().catch(() => {}); await sleep(600); }
                    const actions = await row.locator('xpath=following-sibling::tr[1]').locator('a').evaluateAll((els) => els.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href') || ''}`)).catch(() => []);
                    o.rowActions.push({row: flat(await row.innerText(), 120), actions});
                }
                o.snap = await snap(`plugins-grid-${key}`);
                return o;
            };
            // publicknowledge, read-only, as the seeded manager
            out.pk = await readTools(app.contextPath, 'pk', 'manager.maya');
            if (S.N && !S.N.error) {
                out.N = await readTools(S.N.path, 'N-noagency', S.N.u.mg);
                if (!isOMP) out.Nplugin = await openPlugin(S.N.path, 'N-off', 'CrossrefExportPlugin', S.N.u.mg);
                if (isOMP) out.NpluginOMP = await openPlugin(S.N.path, 'N-omp', 'CrossrefExportPlugin', S.N.u.mg);
                out.Ngrid = await readPluginsGrid(S.N.path, 'N', S.N.u.mg);
            }
            if (S.CR && !S.CR.error) {
                out.CR = await readTools(S.CR.path, 'CR', S.CR.u.mg);
                out.CRplugin = await openPlugin(S.CR.path, 'CR', 'CrossrefExportPlugin', S.CR.u.mg);
                out.CRgrid = await readPluginsGrid(S.CR.path, 'CR', S.CR.u.mg);
                // follow the grid row's own link to the plugin page, when there is one
                const gl = (out.CRgrid.rowActions || []).flatMap((r) => r.actions).find((a) => /importexport\/plugin/.test(a));
                out.CRgridLink = gl || null;
                if (isOJS) out.CRdcOff = await openPlugin(S.CR.path, 'CR-dc-off', 'DataciteExportPlugin', S.CR.u.mg);
                // the other permission levels at the plugin page's address
                out.levels = {};
                for (const k of ['ed', 'se', 'au']) {
                    if (!S.CR.u[k]) continue;
                    await as(S.CR.u[k], S.CR.path);
                    const r = await page.goto(ctxUrl(S.CR.path, '/management/importexport/plugin/CrossrefExportPlugin')).catch((e) => ({err: e.message}));
                    await idle(page).catch(() => {});
                    out.levels[k] = {status: r && r.status ? r.status() : flat(r && r.err, 100), url: page.url().replace(/^https?:\/\/[^/]+/, ''),
                        main: flat(await page.locator('main').innerText().catch(() => page.locator('body').innerText()), 300)};
                    out.levels[k].snap = await snap(`plugin-level-${k}`);
                    const rt = await page.goto(ctxUrl(S.CR.path, '/management/tools')).catch((e) => ({err: e.message}));
                    await idle(page).catch(() => {});
                    out.levels[k].tools = {status: rt && rt.status ? rt.status() : null, main: flat(await page.locator('main').innerText().catch(() => page.locator('body').innerText()), 200)};
                }
            }
            if (S.DC && !S.DC.error) {
                out.DC = await readTools(S.DC.path, 'DC', S.DC.u.mg);
                out.DCplugin = await openPlugin(S.DC.path, 'DC', 'DataciteExportPlugin', S.DC.u.mg);
                out.DCgrid = await readPluginsGrid(S.DC.path, 'DC', S.DC.u.mg);
            }
            fact('tools', out);
        });

        // =========================================================================================
        // panel: the agency panel for each state (Rule 30, q20, A4), Edit greying the buttons; control N.
        await sect('panel', async () => {
            if (done('panel')) return;
            const out = {};
            for (const key of ['CR', 'DC', 'N']) {
                const C = S[key];
                if (!C || C.error) continue;
                const o = out[key] = {};
                await as(C.u.mg, C.path);
                await gotoDois(C.path);
                o.header = await panel().locator('.pkpHeader').first().getByRole('button').allInnerTexts().catch(() => []);
                o.menu = await openBulk(); await closeBulk();
                o.rows = await rowsText();
                o.unpublished = await expand(C.subs.u1.id);
                o.published = await expand(C.subs.p1.id);
                o.snapStates = await snap(`panel-${key}-unpub-pub`);
                await loc(page, `DOIs page (${key}): agency panel of an expanded row`, rowOf(C.subs.p1.id).locator('.doiListItem__depositorDetails'));
                if (key === 'N') continue;
                // Edit greys the panel's buttons
                const r1 = rowOf(C.subs.p1.id);
                await r1.getByRole('button', {name: 'Edit', exact: true}).click().catch(() => {});
                await sleep(400);
                o.editing = await expanded(C.subs.p1.id);
                o.snapEditing = await snap(`panel-${key}-editing`);
                await r1.getByRole('button', {name: 'Save', exact: true}).click().catch(() => {});
                await sleep(1200);
                // Mark DOIs Registered on p2, then its panel
                o.markReg = await runAction('Mark DOIs Registered', [C.subs.p2.id], `panel-${key}-mark-reg`);
                o.markReg.after.rows = undefined;
                o.registeredManual = await expand(C.subs.p2.id);
                o.snapRegistered = await snap(`panel-${key}-registered-manual`);
                // Needs Sync on p7 (Registered first), then its panel
                await gotoDois(C.path);
                await runAction('Mark DOIs Registered', [C.subs.p7.id], `panel-${key}-mark-reg-p7`);
                o.markSync = await runAction('Mark DOIs Needs Sync', [C.subs.p7.id], `panel-${key}-mark-sync`);
                o.markSync.after.rows = undefined;
                o.needsSync = await expand(C.subs.p7.id);
                o.snapNeedsSync = await snap(`panel-${key}-needs-sync`);
                // "Deposit DOI(s)" in p3's panel: the window, then the queued state (read at once and after a reload)
                await gotoDois(C.path);
                await expand(C.subs.p3.id);
                const r3 = rowOf(C.subs.p3.id);
                await takeNotes(); takeTraffic(); await takeDialogs();
                await r3.locator('.doiListItem__depositorDetails').getByRole('button', {name: 'Deposit DOI(s)'}).click();
                const dlg = page.getByRole('dialog').filter({hasText: 'Deposit DOIs'}).last();
                await dlg.waitFor({timeout: 10000}).catch(() => {});
                o.depositWindow = await dialogText();
                o.depositWindowTicked = await tickedIds();
                o.snapDepositWindow = await snap(`panel-${key}-deposit-window`);
                await dlg.getByRole('button', {name: 'Deposit DOIs', exact: true}).click();
                await sleep(2500); await idle(page).catch(() => {});
                o.afterDeposit = {notes: await takeNotes(), traffic: takeTraffic(), dialogs: await takeDialogs(), badge: await badgeOf(C.subs.p3.id), exp: await expand(C.subs.p3.id)};
                o.snapAfterDeposit = await snap(`panel-${key}-after-deposit`);
                await gotoDois(C.path);
                o.afterDepositReload = {badge: await badgeOf(C.subs.p3.id), exp: await expand(C.subs.p3.id)};
                o.snapAfterDepositReload = await snap(`panel-${key}-after-deposit-reload`);
                o.db = dbDois(C);
                o.dbSettings = dbDoiSettings(C);
            }
            fact('panel', out);
            markDone('panel');
        });

        // =========================================================================================
        // export: "Export DOIs" (Rule 29; Side effects: downloads): one item, two items, a peer-reviewed article,
        // an unpublished item, a published item without a DOI, an issue.
        await sect('export', async () => {
            if (done('export')) return;
            const out = {};
            for (const key of ['CR', 'DC']) {
                const C = S[key];
                if (!C || C.error) continue;
                const o = out[key] = {};
                await as(C.u.mg, C.path);
                await gotoDois(C.path);
                o.one = await runAction('Export DOIs', [C.subs.p1.id], `export-${key}-one`, {wait: 4000});
                o.one.after.rows = undefined;
                await gotoDois(C.path);
                o.two = await runAction('Export DOIs', [C.subs.p1.id, C.subs.p4.id], `export-${key}-two`, {wait: 4000});
                o.two.after.rows = undefined;
                if (C.subs.pr && C.subs.pr.id) {
                    o.prDb = psql(`select review_id, is_review_publicly_visible, considered, date_completed is not null, coalesce(d.doi,'-') from review_assignments r left join dois d on d.doi_id=r.doi_id where submission_id=${C.subs.pr.id}`);
                    await gotoDois(C.path);
                    o.prRow = await expand(C.subs.pr.id);
                    o.peer = await runAction('Export DOIs', [C.subs.pr.id], `export-${key}-peer`, {wait: 4000});
                    o.peer.after.rows = undefined;
                }
                await gotoDois(C.path);
                o.unpub = await runAction('Export DOIs', [C.subs.u1.id, C.subs.p1.id], `export-${key}-unpub`, {wait: 3000});
                o.unpub.after.rows = undefined;
                // a published item whose DOI is cleared by hand (p8), alone
                await gotoDois(C.path);
                await expand(C.subs.p8.id);
                const r8 = rowOf(C.subs.p8.id);
                await r8.getByRole('button', {name: 'Edit', exact: true}).click(); await sleep(300);
                await r8.locator('.listPanel__itemExpanded tbody tr input').first().fill('');
                await r8.getByRole('button', {name: 'Save', exact: true}).click();
                await sleep(1500); await idle(page).catch(() => {});
                o.p8cleared = {badge: await badgeOf(C.subs.p8.id), notes: await takeNotes()};
                await gotoDois(C.path);
                o.noDoi = await runAction('Export DOIs', [C.subs.p8.id], `export-${key}-nodoi`, {wait: 3000});
                o.noDoi.after.rows = undefined;
                // the issue tab (OJS): the published issue, then the unpublished one
                if (isOJS) {
                    await gotoDois(C.path, 'Issues');
                    o.issueRows = await rowsText();
                    const ids = o.issueRows.map((r) => r.id.replace(/^.*-/, ''));
                    const pubIssue = (o.issueRows.find((r) => /No\. 1/.test(r.text)) || {}).id?.replace(/^.*-/, '');
                    const unpubIssue = (o.issueRows.find((r) => /No\. 2/.test(r.text)) || {}).id?.replace(/^.*-/, '');
                    o.issueIds = {ids, pubIssue, unpubIssue};
                    if (pubIssue) { o.issuePub = await runAction('Export DOIs', [pubIssue], `export-${key}-issue-pub`, {wait: 4000}); }
                    await gotoDois(C.path, 'Issues');
                    if (unpubIssue) { o.issueUnpub = await runAction('Export DOIs', [unpubIssue], `export-${key}-issue-unpub`, {wait: 3000}); }
                }
                o.db = dbDois(C);
            }
            // the editor (manager level) exports too
            if (S.CR && !S.CR.error && S.CR.u.ed) {
                await as(S.CR.u.ed, S.CR.path);
                await gotoDois(S.CR.path);
                out.editor = await runAction('Export DOIs', [S.CR.subs.p5.id], 'export-CR-editor', {wait: 4000});
                out.editor.after.rows = undefined;
            }
            fact('export', out);
            markDone('export');
        });

        // =========================================================================================
        // deposit: "Deposit DOIs" (Rule 29) on a published item, a set with an unpublished item, a published item without a DOI.
        await sect('deposit', async () => {
            if (done('deposit')) return;
            const out = {};
            for (const key of ['CR', 'DC']) {
                const C = S[key];
                if (!C || C.error) continue;
                const o = out[key] = {};
                await as(C.u.mg, C.path);
                await gotoDois(C.path);
                o.one = await runAction('Deposit DOIs', [C.subs.p4.id], `deposit-${key}-one`);
                o.one.badgeAfter = await badgeOf(C.subs.p4.id);
                o.one.after.rows = (o.one.after.rows || []).filter((r) => r.id.endsWith(`-${C.subs.p4.id}`));
                await gotoDois(C.path);
                o.oneReload = {badge: await badgeOf(C.subs.p4.id), exp: await expand(C.subs.p4.id)};
                await snap(`deposit-${key}-one-reload`);
                await gotoDois(C.path);
                o.mixed = await runAction('Deposit DOIs', [C.subs.u1.id, C.subs.p5.id], `deposit-${key}-mixed`);
                o.mixed.after.rows = (o.mixed.after.rows || []).filter((r) => [C.subs.u1.id, C.subs.p5.id].some((i) => r.id.endsWith(`-${i}`)));
                await gotoDois(C.path);
                o.noDoi = await runAction('Deposit DOIs', [C.subs.p8.id], `deposit-${key}-nodoi`);
                o.noDoi.after.rows = (o.noDoi.after.rows || []).filter((r) => r.id.endsWith(`-${C.subs.p8.id}`));
                if (isOJS) {
                    await gotoDois(C.path, 'Issues');
                    const rows = await rowsText();
                    const unpubIssue = (rows.find((r) => /No\. 2/.test(r.text)) || {}).id?.replace(/^.*-/, '');
                    if (unpubIssue) { o.issueUnpub = await runAction('Deposit DOIs', [unpubIssue], `deposit-${key}-issue-unpub`); o.issueUnpub.after.rows = undefined; }
                }
                o.db = dbDois(C);
                o.queue = psql(`select id, queue, payload::json->>'displayName' from jobs where payload::text like '%DepositSubmission%' or payload::text like '%DepositIssue%' order by id desc limit 12`);
            }
            fact('deposit', out);
            markDone('deposit');
        });

        // =========================================================================================
        // jobs1: the app's own worker drains the queue (the deposits fail at the dead proxy).
        await sect('jobs1', async () => {
            if (done('jobs1') || isOMP) return;
            const out = {worker: worker()};
            for (const key of ['CR', 'DC', 'CT', 'DT']) if (S[key] && !S[key].error) out[key] = dbDois(S[key]);
            out.failed = psql(`select id, left(payload::json->>'displayName', 60), left(exception, 200), failed_at from failed_jobs where failed_at > now() - interval '15 minutes' order by id`);
            fact('jobs1', out);
            markDone('jobs1');
        });

        // =========================================================================================
        // errors: statuses after the background deposit (Rules 32, 33, q22): badge, the row's and the panel's "View Error", the window.
        await sect('errors', async () => {
            const out = {};
            for (const key of ['CR', 'DC']) {
                const C = S[key];
                if (!C || C.error) continue;
                const o = out[key] = {};
                await as(C.u.mg, C.path);
                await gotoDois(C.path);
                o.rows = (await rowsText()).map((r) => `${r.id.replace(/^.*-/, '')}:${r.badge}`);
                for (const k of ['p3', 'p4']) {
                    o[k] = {badge: await badgeOf(C.subs[k].id), exp: await expand(C.subs[k].id)};
                }
                o.snapRows = await snap(`errors-${key}-rows`);
                const r3 = rowOf(C.subs.p3.id);
                const rowVE = r3.locator('.listPanel__itemExpanded tbody tr').first().getByRole('button', {name: 'View Error'});
                const panelVE = r3.locator('.doiListItem__depositorDetails').getByRole('button', {name: 'View Error'});
                o.rowViewError = await rowVE.count();
                o.panelViewError = await panelVE.count();
                await loc(page, `DOIs page (${key}): a row's "View Error" link`, rowVE);
                await loc(page, `DOIs page (${key}): the agency panel's "View Error" button`, panelVE);
                for (const [which, btn] of [['row', rowVE], ['panel', panelVE]]) {
                    if (!(await btn.count())) continue;
                    await takeDialogs();
                    await btn.click(); await sleep(900);
                    const d = page.getByRole('dialog').last();
                    o[`window-${which}`] = {title: await d.locator('h1, h2, [class*="title" i]').first().innerText().catch(() => null), text: await dialogText(),
                        buttons: await d.getByRole('button').allInnerTexts().catch(() => [])};
                    o[`snap-${which}`] = await snap(`errors-${key}-view-error-${which}`);
                    await d.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                    await sleep(700);
                }
                o.dbSettings = dbDoiSettings(C);
            }
            fact('errors', out);
        });

        // =========================================================================================
        // depositall: "Deposit All" (Rule 29) with items Unregistered, Registered, Needs Sync, Error, Submitted, unpublished;
        // then again with nothing outstanding.
        await sect('depositall', async () => {
            if (done('depositall')) return;
            const out = {};
            for (const key of ['CR', 'DC']) {
                const C = S[key];
                if (!C || C.error) continue;
                const o = out[key] = {};
                await as(C.u.mg, C.path);
                await gotoDois(C.path);
                const ids = Object.fromEntries(Object.entries(C.subs).filter(([, v]) => v && v.id).map(([k, v]) => [k, v.id]));
                const readAll = async () => Object.fromEntries(await Promise.all(Object.entries(ids).map(async ([k, id]) => [k, await badgeOf(id)])));
                o.before = await readAll();
                if (isOJS) { await page.getByRole('tab', {name: 'Issues', exact: true}).click().catch(() => {}); await sleep(1000); o.issuesBefore = (await rowsText()).map((r) => `${r.text}:${r.badge}`); await page.getByRole('tab', {name: 'Articles', exact: true}).click().catch(() => {}); await sleep(1000); }
                o.dbBefore = dbDois(C);
                o.all = await runAction('Deposit All', null, `depositall-${key}`, {fromHeader: true});
                o.all.after.rows = undefined;
                await gotoDois(C.path);
                o.afterAll = await readAll();
                if (isOJS) { await page.getByRole('tab', {name: 'Issues', exact: true}).click().catch(() => {}); await sleep(1000); o.issuesAfter = (await rowsText()).map((r) => `${r.text}:${r.badge}`); await page.getByRole('tab', {name: 'Articles', exact: true}).click().catch(() => {}); await sleep(1000); }
                o.snapAfter = await snap(`depositall-${key}-after-reload`);
                o.dbAfter = dbDois(C);
                o.again = await runAction('Deposit All', null, `depositall-${key}-again`, {fromHeader: true});
                o.again.after.rows = undefined;
            }
            fact('depositall', out);
            markDone('depositall');
        });

        // =========================================================================================
        // jobs2: drain again, then read every status on CR and DC.
        await sect('jobs2', async () => {
            if (done('jobs2') || isOMP) return;
            const out = {worker: worker()};
            for (const key of ['CR', 'DC']) {
                const C = S[key];
                if (!C || C.error) continue;
                out[`${key}db`] = dbDois(C);
                await as(C.u.mg, C.path);
                await gotoDois(C.path);
                out[key] = (await rowsText()).map((r) => `${r.id.replace(/^.*-/, '')}:${r.badge}`);
                const pr = C.subs.p7 && C.subs.p7.id;
                if (pr) out[`${key}p7`] = await expand(pr);
                out[`${key}snap`] = await snap(`jobs2-${key}-rows`);
            }
            fact('jobs2', out);
            markDone('jobs2');
        });

        // =========================================================================================
        // sync: Rule 32 (q21): Registered → unpublish → publish again; a new version under "No" and "Yes" (major, minor);
        // the issue (OJS); a "Submitted" deposit unpublished (CR).
        const vis = '[role="dialog"]:visible';
        const wf = () => page.locator(vis).first();
        const controls = () => page.locator('[data-cy="workflow-controls-right"]');
        async function openWf(ctx, sid, pub) {
            await page.goto(ctxUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}${pub ? `&workflowMenuKey=publication_${pub}_titleAbstract` : ''}`));
            await idle(page).catch(() => {});
            await wf().waitFor({timeout: T}).catch(() => {});
            await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
            await sleep(1200);
        }
        async function fillVersion(scope, {minor = false} = {}) {
            const stage = scope.locator('select[name="versionStage"]');
            if (await stage.isVisible().catch(() => false)) { if (!(await stage.inputValue().catch(() => ''))) await stage.selectOption('VoR').catch(() => {}); }
            const m = scope.locator('select[name="versionIsMinor"]');
            if (await m.isVisible().catch(() => false)) { if (!(await m.inputValue().catch(() => ''))) await m.selectOption(minor ? 'true' : 'false').catch(() => {}); }
        }
        async function publish(ctx, sid, pub, name, {issue} = {}) {
            await openWf(ctx, sid, pub);
            const out = {};
            const button = controls().getByRole('button', {name: /^(Schedule For Publication|Publish|Post)$/}).first();
            await button.waitFor({state: 'visible', timeout: T}).catch(() => {});
            if (!(await button.isVisible().catch(() => false))) { out.noButton = await controls().getByRole('button').allInnerTexts().catch(() => []); await snap(`${name}-nobutton`); return out; }
            await sleep(800);
            await button.click();
            const pnl = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
            const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to|make this catalog entry public|will not prevent publishing|following requirements/}).last();
            const which = () => Promise.race([
                pnl.locator('select[name="versionStage"], input[name="assignment"], button').first().waitFor({state: 'visible', timeout: 15000}).then(() => 'panel'),
                confirm.waitFor({state: 'visible', timeout: 15000}).then(() => 'confirm'),
            ]).catch(() => null);
            let opened = await which();
            if (!opened) { await button.click({timeout: 5000}).catch(() => {}); opened = await which(); }
            out.opened = opened;
            await idle(page).catch(() => {}); await sleep(800);
            if (opened === 'panel') {
                await fillVersion(pnl);
                if (issue) {
                    await sleep(4000); await idle(page).catch(() => {});
                    const back = pnl.getByRole('radio', {name: /Assign To Current\/Back Issue/i});
                    if (await back.isVisible().catch(() => false)) await back.check().catch(() => {});
                    await sleep(600);
                    const sel = pnl.locator('select[name="issueId"]');
                    const val = await sel.evaluate((s, re) => { const o = [...s.options].find((x) => x.text.includes(re)); return o ? o.value : null; }, issue).catch(() => null);
                    if (val) await sel.selectOption(val).catch(() => {});
                } else {
                    const none = pnl.getByRole('radio', {name: /Don't Assign|Do not assign/i});
                    if (await none.isVisible().catch(() => false)) await none.check().catch(() => {});
                }
                await snap(`${name}-panel`);
                await pnl.getByRole('button', {name: 'Confirm', exact: true}).click().catch(() => {});
                await confirm.waitFor({state: 'visible', timeout: T}).catch(() => {});
            }
            await idle(page).catch(() => {}); await sleep(800);
            await fillVersion(confirm);
            out.confirm = flat(await confirm.innerText().catch(() => ''), 500);
            const w = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await confirm.getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/}).last().click().catch((e) => { out.clickErr = flat(e.message, 150); });
            const r = await w;
            out.status = r ? r.status() : null;
            if (r && r.status() >= 400) out.body = flat(await r.text().catch(() => ''), 500);
            await controls().getByRole('button', {name: /^(Unpublish|Unpost|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            out.snap = await snap(name);
            return out;
        }
        async function unpublish(ctx, sid, pub, name) {
            await openWf(ctx, sid, pub);
            const out = {};
            const b = controls().getByRole('button', {name: /^(Unpublish|Unpost)$/}).first();
            await b.waitFor({state: 'visible', timeout: 15000}).catch(() => {});
            if (!(await b.isVisible().catch(() => false))) { out.noButton = await controls().getByRole('button').allInnerTexts().catch(() => []); return out; }
            await b.click();
            const d = page.getByRole('dialog').filter({hasText: /don't want this to be|unpublish|unpost/i}).last();
            await d.waitFor({timeout: T}).catch(() => {});
            out.dialog = flat(await d.innerText().catch(() => ''), 300);
            const w = page.waitForResponse((r) => /\/unpublish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await d.getByRole('button', {name: /^(Unpublish|Unpost|OK|Yes)$/}).last().click().catch((e) => { out.clickErr = flat(e.message, 150); });
            const r = await w;
            out.status = r ? r.status() : null;
            await sleep(1500); await idle(page).catch(() => {});
            out.snap = await snap(name);
            return out;
        }
        async function newVersion(ctx, sid, pub, minor, name) {
            await openWf(ctx, sid, pub);
            const link = wf().getByRole('link', {name: 'Create New Version', exact: true}).or(wf().getByRole('button', {name: 'Create New Version', exact: true})).first();
            await link.waitFor({state: 'visible', timeout: T}).catch(() => {});
            if (!(await link.isVisible().catch(() => false))) return {offered: false};
            await sleep(1200);
            await link.click();
            const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
            await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
            await idle(page).catch(() => {}); await sleep(1000);
            const m = w.locator('select[name="versionIsMinor"]');
            if (await m.isVisible().catch(() => false)) {
                const want = await m.evaluate((s, mi) => { const o = [...s.options].find((x) => (mi ? /minor/i : /major/i).test(x.text)); return o ? o.value : null; }, minor);
                if (want !== null) await m.selectOption(want); else await m.selectOption(minor ? 'true' : 'false').catch(() => {});
            }
            const stage = w.locator('select[name="versionStage"]');
            if (!(await stage.inputValue().catch(() => ''))) await stage.selectOption('VoR').catch(() => {});
            const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await w.getByRole('button', {name: 'Confirm', exact: true}).click();
            const resp = await r;
            let newPub = null;
            if (resp) { try { newPub = (await resp.json()).id; } catch { /* none */ } }
            await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page).catch(() => {}); await sleep(800);
            return {offered: true, status: resp && resp.status(), newPub, snap: await snap(name)};
        }
        const viewAll = async (id, name) => {
            await expand(id);
            const b = rowOf(id).getByRole('button', {name: 'View all', exact: true});
            if (!(await b.count())) return {noViewAll: true, exp: await expanded(id)};
            await b.click(); await sleep(1200);
            const d = page.getByRole('dialog').filter({hasText: 'DOIs for all versions'}).last();
            const o = {text: flat(await d.innerText().catch(() => null), 900), snap: await snap(name)};
            await d.getByRole('button', {name: /Close/}).first().click().catch(() => {});
            await sleep(600);
            return o;
        };
        await sect('sync', async () => {
            if (done('sync')) return;
            const out = {};
            const SY = S.SY;
            if (SY && !SY.error) {
                const o = out.SY = {};
                await as(SY.u.mg, SY.path);
                await gotoDois(SY.path);
                await runAction('Mark DOIs Registered', [SY.subs.s1.id, SY.subs.s2.id], 'sync-SY-mark-reg');
                o.start = {s1: await badgeOf(SY.subs.s1.id), s2: await badgeOf(SY.subs.s2.id), s3: await badgeOf(SY.subs.s3.id)};
                // s1: unpublish, then publish again
                o.un1 = await unpublish(SY.path, SY.subs.s1.id, SY.subs.s1.pub, 'sync-SY-s1-unpublish');
                await gotoDois(SY.path);
                o.afterUnpublish = {s1: await badgeOf(SY.subs.s1.id), exp: await expand(SY.subs.s1.id)};
                await snap('sync-SY-after-unpublish');
                o.re1 = await publish(SY.path, SY.subs.s1.id, SY.subs.s1.pub, 'sync-SY-s1-republish');
                await gotoDois(SY.path);
                o.afterRepublish = {s1: await badgeOf(SY.subs.s1.id)};
                // s1 marked Registered again, then published again without unpublishing? (only possible through a new version) — s2: new version under "No"
                o.v2 = await newVersion(SY.path, SY.subs.s2.id, SY.subs.s2.pub, false, 'sync-SY-s2-new-version');
                await gotoDois(SY.path);
                o.afterNewVersion = {s2: await badgeOf(SY.subs.s2.id), exp: await expand(SY.subs.s2.id)};
                if (o.v2.newPub) o.pubV2 = await publish(SY.path, SY.subs.s2.id, o.v2.newPub, 'sync-SY-s2-publish-v2');
                await gotoDois(SY.path);
                o.afterPublishV2 = {s2: await badgeOf(SY.subs.s2.id), exp: await expand(SY.subs.s2.id)};
                o.snapAfter = await snap('sync-SY-after-publish-v2');
                // s3 control: Unregistered through unpublish/publish
                o.un3 = await unpublish(SY.path, SY.subs.s3.id, SY.subs.s3.pub, 'sync-SY-s3-unpublish');
                await gotoDois(SY.path);
                o.s3after = await badgeOf(SY.subs.s3.id);
                o.db = dbDois(SY);
                // the issue (OJS): mark the published issue Registered, then "Unpublish Issue"
                if (isOJS) {
                    await gotoDois(SY.path, 'Issues');
                    const rows = await rowsText();
                    const iss = (rows.find((r) => /No\. 1/.test(r.text)) || {}).id?.replace(/^.*-/, '');
                    o.issueRows = rows;
                    if (iss) {
                        const mk = await runAction('Mark DOIs Registered', [iss], 'sync-SY-issue-mark-reg');
                        o.issueMarked = (mk.after.rows || []).map((r) => `${r.text}:${r.badge}`);
                        await page.goto(ctxUrl(SY.path, '/manageIssues#backIssues'));
                        await idle(page).catch(() => {}); await sleep(1500);
                        const row = page.locator('tr.gridRow').filter({hasText: 'Vol. 1 No. 1'}).first();
                        await row.locator('a.show_extras').click().catch(() => {});
                        await sleep(600);
                        const un = row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Unpublish Issue'});
                        o.unpublishIssueLink = await un.count();
                        if (o.unpublishIssueLink) {
                            await un.click();
                            const d = page.getByRole('dialog').filter({hasText: /unpublish/i}).last();
                            await d.waitFor({timeout: T}).catch(() => {});
                            o.unpubIssueDialog = flat(await d.innerText().catch(() => null), 300);
                            const w = page.waitForResponse((r) => /unpublish/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                            await d.getByRole('button', {name: /^(OK|Yes|Unpublish Issue|Unpublish)$/}).last().click().catch(() => {});
                            const r = await w;
                            o.unpubIssueStatus = r ? r.status() : null;
                            await sleep(1500);
                        }
                        await gotoDois(SY.path, 'Issues');
                        o.issueAfter = (await rowsText()).map((r) => `${r.text}:${r.badge}`);
                        o.snapIssue = await snap('sync-SY-issue-after-unpublish');
                    }
                }
            }
            // a "Submitted" deposit (CR p4 after the deposit phase) unpublished
            const CR = S.CR;
            if (CR && !CR.error && CR.subs.p6) {
                const o = out.CRsubmitted = {};
                await as(CR.u.mg, CR.path);
                await gotoDois(CR.path);
                o.dep = await runAction('Deposit DOIs', [CR.subs.p6.id], 'sync-CR-p6-deposit');
                o.dep.after.rows = undefined;
                o.before = await badgeOf(CR.subs.p6.id);
                o.un = await unpublish(CR.path, CR.subs.p6.id, CR.subs.p6.pub, 'sync-CR-p6-unpublish');
                await gotoDois(CR.path);
                o.after = {badge: await badgeOf(CR.subs.p6.id), exp: await expand(CR.subs.p6.id)};
                o.snap = await snap('sync-CR-p6-after-unpublish');
                o.db = dbDois(CR);
            }
            // versioning "Yes": a Registered work, a new major version published; another, a new minor version published.
            const VY = await mkCtx('VY', {doiPrefix: '10.1234', doiVersioning: true});
            if (VY && !VY.error) {
                try {
                    for (const k of ['v1', 'v2']) await mkSub(VY, k, {title: `Versioned work ${k}`, published: true, ...galley});
                    const o = out.VY = {};
                    await as(VY.u.mg, VY.path);
                    await gotoDois(VY.path);
                    await runAction('Mark DOIs Registered', [VY.subs.v1.id, VY.subs.v2.id], 'sync-VY-mark-reg');
                    o.maj = await newVersion(VY.path, VY.subs.v1.id, VY.subs.v1.pub, false, 'sync-VY-v1-major');
                    if (o.maj.newPub) o.majPub = await publish(VY.path, VY.subs.v1.id, o.maj.newPub, 'sync-VY-v1-major-publish');
                    o.min = await newVersion(VY.path, VY.subs.v2.id, VY.subs.v2.pub, true, 'sync-VY-v2-minor');
                    if (o.min.newPub) o.minPub = await publish(VY.path, VY.subs.v2.id, o.min.newPub, 'sync-VY-v2-minor-publish');
                    await gotoDois(VY.path);
                    o.badges = {v1: await badgeOf(VY.subs.v1.id), v2: await badgeOf(VY.subs.v2.id)};
                    o.v1all = await viewAll(VY.subs.v1.id, 'sync-VY-v1-view-all');
                    await gotoDois(VY.path);
                    o.v2all = await viewAll(VY.subs.v2.id, 'sync-VY-v2-view-all');
                    o.db = psql(`select p.submission_id, p.publication_id, p.version_major, p.version_minor, p.status, coalesce(d.doi,'-'), coalesce(d.status::text,'-') from publications p join submissions s on s.submission_id=p.submission_id left join dois d on d.doi_id=p.doi_id where s.context_id=${VY.id} order by 1,2`);
                } finally {
                    if (isOJS) {
                        // set "DOI Versioning" back to "No" on screen (OJS OAI, screen-notes)
                        await as(VY.u.mg, VY.path);
                        await page.goto(ctxUrl(VY.path, '/management/settings/distribution'));
                        await idle(page).catch(() => {});
                        await page.getByRole('tab', {name: 'DOIs', exact: true}).click();
                        await idle(page).catch(() => {});
                        const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
                        await dois.getByRole('tab', {name: 'Setup', exact: true}).click();
                        const setup = dois.getByRole('tabpanel', {name: 'Setup', exact: true});
                        await setup.getByRole('radio', {name: 'No, all versions of an article should have the same DOI.'}).check();
                        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                        await setup.getByRole('button', {name: 'Save', exact: true}).click();
                        const r = await w;
                        out.VYrestored = r ? r.status() : null;
                        out.VYrestoredDb = psql(`select setting_value from journal_settings where journal_id=${VY.id} and setting_name='doiVersioning'`);
                    }
                }
            }
            fact('sync', out);
            markDone('sync');
        });

        // =========================================================================================
        // issue (OJS): Rule 32's last sentence — SY's published issue, marked "Registered" by the sync phase, unpublished on
        // Issues › "Back Issues", then published again on "Future Issues"; its DOI's status after each step.
        async function issueRowAction(ctx, name, link, tab) {
            await page.goto(ctxUrl(ctx, '/manageIssues'));
            await idle(page).catch(() => {});
            if (tab === 'Back Issues') { await page.getByRole('tab', {name: 'Back Issues'}).click().catch(() => {}); await idle(page).catch(() => {}); await sleep(800); }
            const row = page.locator('tr.gridRow').filter({hasText: name}).filter({visible: true}).first();
            await row.waitFor({timeout: T});
            const id = await row.getAttribute('id');
            await row.locator('a.show_extras').click();
            const l = page.locator(`[id="${id}-control-row"]`).getByRole('link', {name: link, exact: true});
            await l.waitFor({state: 'visible', timeout: T});
            const actions = (await page.locator(`[id="${id}-control-row"] a:visible`).allInnerTexts()).map((x) => x.trim());
            await l.click();
            return actions;
        }
        await sect('issue', async () => {
            if (!isOJS || done('issue')) return;
            const SY = S.SY;
            const out = {};
            await as(SY.u.mg, SY.path);
            await gotoDois(SY.path, 'Issues');
            out.before = (await rowsText()).map((r) => `${r.text}:${r.badge}`);
            out.unActions = await issueRowAction(SY.path, 'Vol. 1 No. 1', 'Unpublish Issue', 'Back Issues');
            const d = page.getByRole('dialog').filter({hasText: /unpublish/i}).last();
            await d.waitFor({timeout: T}).catch(() => {});
            out.unDialog = flat(await d.innerText().catch(() => null), 300);
            const w = page.waitForResponse((r) => /unpublish/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await d.getByRole('button', {name: /^(OK|Yes|Unpublish Issue|Unpublish)$/}).last().click().catch(() => {});
            const r = await w;
            out.unStatus = r ? r.status() : null;
            await sleep(1500);
            await gotoDois(SY.path, 'Issues');
            out.afterUnpublish = (await rowsText()).map((x) => `${x.text}:${x.badge}`);
            const iss = (await rowsText()).find((x) => /No\. 1/.test(x.text));
            if (iss) out.afterUnpublishExp = await expand(iss.id.replace(/^.*-/, ''));
            out.snapUn = await snap('issue-SY-after-unpublish');
            out.pubActions = await issueRowAction(SY.path, 'Vol. 1 No. 1', 'Publish Issue', 'Future Issues');
            const dlg = page.getByRole('dialog', {name: 'Publish Issue', exact: true});
            await dlg.locator('input[name="sendIssueNotification"]').waitFor({timeout: T}).catch(() => {});
            await idle(page).catch(() => {}); await sleep(500);
            await dlg.locator('input[name="sendIssueNotification"]').uncheck().catch(() => {});
            const w2 = page.waitForResponse((x) => /publish-issue|publishIssue/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await dlg.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
            const r2 = await w2;
            out.pubStatus = r2 ? r2.status() : null;
            await sleep(1500);
            await gotoDois(SY.path, 'Issues');
            out.afterRepublish = (await rowsText()).map((x) => `${x.text}:${x.badge}`);
            out.snapRe = await snap('issue-SY-after-republish');
            out.db = psql(`select i.issue_id, i.published, coalesce(d.doi,'-'), coalesce(d.status::text,'-') from issues i left join dois d on d.doi_id=i.doi_id where i.journal_id=${SY.id} order by 1`);
            fact('issue', out);
            markDone('issue');
        });

        // =========================================================================================
        // testing: Setting 10 — "Testing" ticked: where a deposit goes (the stored error message), DataCite's "Test DOI Prefix".
        await sect('testing', async () => {
            if (done('testing')) return;
            const out = {};
            for (const key of ['DT', 'CT']) {
                const C = S[key];
                if (!C || C.error) continue;
                const o = out[key] = {};
                await as(C.u.mg, C.path);
                // the Registration tab as seeded
                await page.goto(ctxUrl(C.path, '/management/settings/distribution'));
                await idle(page).catch(() => {});
                await page.getByRole('tab', {name: 'DOIs', exact: true}).click();
                await idle(page).catch(() => {});
                const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
                await dois.getByRole('tab', {name: 'Registration', exact: true}).click();
                await idle(page).catch(() => {}); await sleep(800);
                const reg = dois.getByRole('tabpanel', {name: 'Registration', exact: true});
                o.tab = flat(await reg.innerText().catch(() => null), 1500);
                o.testing = await reg.getByRole('checkbox', {name: /test/i}).evaluateAll((els) => els.map((e) => ({name: e.closest('label')?.innerText.trim(), checked: e.checked}))).catch(() => null);
                o.snapTab = await snap(`testing-${key}-registration`);
                if (key === 'DT') {
                    // empty "Test DOI Prefix" with "Testing" ticked, Save; then put it back
                    const box = reg.locator('[name="testDOIPrefix"]');
                    const before = await box.inputValue().catch(() => null);
                    await box.fill('');
                    const w = page.waitForResponse((r) => /registrationAgency|contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                    await reg.getByRole('button', {name: 'Save', exact: true}).click();
                    const r = await w;
                    await sleep(1200);
                    o.emptyPrefix = {status: r ? r.status() : null, body: r ? flat(await r.text().catch(() => ''), 400) : null,
                        errors: await reg.locator('.pkpFieldError, .pkpFormPage__status, .pkpFormErrors').allInnerTexts().catch(() => [])};
                    o.snapEmpty = await snap('testing-DT-empty-prefix');
                    await box.fill(before || '10.5072');
                    const w2 = page.waitForResponse((r2) => /registrationAgency|contexts\/\d+/.test(r2.url()) && r2.request().method() !== 'GET', {timeout: T}).catch(() => null);
                    await reg.getByRole('button', {name: 'Save', exact: true}).click();
                    const r2 = await w2;
                    await sleep(1200);
                    o.restored = r2 ? r2.status() : null;
                }
                // deposit its one published work, drain, read the status and the stored message
                await gotoDois(C.path);
                o.dep = await runAction('Deposit DOIs', [C.subs.p1.id], `testing-${key}-deposit`);
                o.dep.after.rows = undefined;
            }
            if (!isOMP && (out.DT || out.CT)) {
                out.worker = worker();
                for (const key of ['DT', 'CT']) {
                    const C = S[key];
                    if (!C || C.error) continue;
                    out[key].db = dbDoiSettings(C);
                    out[key].dbDois = dbDois(C);
                    await as(C.u.mg, C.path);
                    await gotoDois(C.path);
                    out[key].exp = await expand(C.subs.p1.id);
                    const ve = rowOf(C.subs.p1.id).locator('.listPanel__itemExpanded tbody tr').first().getByRole('button', {name: 'View Error'});
                    if (await ve.count()) {
                        await ve.click(); await sleep(900);
                        out[key].window = await dialogText();
                        await snap(`testing-${key}-view-error`);
                        await page.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                    } else out[key].snapNoError = await snap(`testing-${key}-after-jobs`);
                }
            }
            fact('testing', out);
            markDone('testing');
        });

        // =========================================================================================
        // head: Side effects "Head tags" — the article page's head with "Crossmark" ticked (CM) and not (CR); an older version (CM).
        await sect('head', async () => {
            if (!isOJS) return;
            const out = {};
            const headOf = async (url) => {
                const r = await page.request.get(url);
                const html = await r.text();
                const head = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
                return {status: r.status(), doiMeta: (head.match(/<meta[^>]+DC\.Identifier\.DOI[^>]*>/gi) || []), crossmarkScripts: (html.match(/<script[^>]+crossmark[^>]*>/gi) || []).map((x) => flat(x, 200)),
                    crossmarkSection: /class="item crossmark"/.test(html)};
            };
            for (const key of ['CM', 'CR']) {
                const C = S[key];
                if (!C || C.error) continue;
                const sid = C.subs.p1.id;
                const o = out[key] = {};
                await page.goto(ctxUrl(C.path, '/index/login/signOut')).catch(() => {});
                who = null;
                await page.goto(ctxUrl(C.path, `/article/view/${sid}`));
                await idle(page).catch(() => {});
                o.page = {crossmarkBlock: await page.locator('.item.crossmark').count(), snap: await snap(`head-${key}-article`)};
                o.head = await headOf(ctxUrl(C.path, `/article/view/${sid}`));
            }
            // an older version on CM: a new version published (versioning "No"), then the first version's page
            const CM = S.CM;
            if (CM && !CM.error && !done('head-version')) {
                await as(CM.u.mg, CM.path);
                const v = await newVersion(CM.path, CM.subs.p1.id, CM.subs.p1.pub, false, 'head-CM-new-version');
                out.version = v;
                if (v.newPub) out.versionPub = await publish(CM.path, CM.subs.p1.id, v.newPub, 'head-CM-publish-v2', {issue: 'Vol. 1 No. 1'});
                markDone('head-version');
                S.CM.v2 = v.newPub; save();
            }
            if (CM && !CM.error) {
                await page.goto(ctxUrl(CM.path, '/index/login/signOut')).catch(() => {});
                who = null;
                out.CMold = await headOf(ctxUrl(CM.path, `/article/view/${CM.subs.p1.id}/version/${CM.subs.p1.pub}`));
                out.CMcurrent = await headOf(ctxUrl(CM.path, `/article/view/${CM.subs.p1.id}`));
                await page.goto(ctxUrl(CM.path, `/article/view/${CM.subs.p1.id}/version/${CM.subs.p1.pub}`));
                await idle(page).catch(() => {});
                out.CMoldPage = {crossmarkBlock: await page.locator('.item.crossmark').count(), snap: await snap('head-CM-old-version')};
                out.db = psql(`select p.publication_id, p.status, coalesce(d.doi,'-') from publications p left join dois d on d.doi_id=p.doi_id where p.submission_id=${CM.subs.p1.id}`);
            }
            fact('head', out);
        });

        // =========================================================================================
        // statuses: Rule 31 — the "DOI Statuses" window (the round button beside "Filters"), every badge on the agency
        // context's list, and a work whose first row has no DOI while a later row has one (DC p8, OJS).
        await sect('statuses', async () => {
            const out = {};
            const C = S.CR && !S.CR.error ? S.CR : S.N;
            await as(C.u.mg, C.path);
            await gotoDois(C.path);
            out.badges = [...new Set((await rowsText()).map((r) => r.badge))];
            await panel().locator('.doiListPanel__statusInfoButton').click().catch((e) => { out.clickErr = flat(e.message, 120); });
            const d = page.getByRole('dialog').filter({hasText: 'Needs DOI'}).last();
            await d.waitFor({timeout: 10000}).catch(() => {});
            await sleep(600);
            out.window = {text: flat(await d.innerText().catch(() => null), 1500),
                rows: await d.locator('tr').evaluateAll((els) => els.map((r) => [...r.querySelectorAll('th,td')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()).join(' | '))).catch(() => [])};
            out.snap = await snap('statuses-window');
            await d.getByRole('button', {name: /Close|OK/}).first().click().catch(() => {});
            await sleep(500);
            if (S.DC && !S.DC.error) {
                await as(S.DC.u.mg, S.DC.path);
                await gotoDois(S.DC.path);
                out.dcP8 = {badge: await badgeOf(S.DC.subs.p8.id), exp: await expand(S.DC.subs.p8.id)};
                out.dcSnap = await snap('statuses-DC-p8-first-row-empty');
            }
            fact('statuses', out);
        });

        // =========================================================================================
        // roles: the editor and the admin on the agency context's DOIs page (controls offered); OMP and N controls.
        await sect('roles', async () => {
            const out = {};
            const C = S.CR && !S.CR.error ? S.CR : S.N;
            for (const u of [C.u.ed, 'admin', C.u.mg].filter(Boolean)) {
                await as(u, C.path);
                await gotoDois(C.path);
                out[u] = {header: await panel().locator('.pkpHeader').first().getByRole('button').allInnerTexts().catch(() => []), menu: await openBulk()};
                await closeBulk();
                out[u].exp = await expand(C.subs.p5 ? C.subs.p5.id : C.subs.p1.id);
                out[u].snap = await snap(`roles-${u === 'admin' ? 'admin' : u === C.u.ed ? 'editor' : 'manager'}`);
            }
            if (S.N && !S.N.error) {
                await as(S.N.u.mg, S.N.path);
                await gotoDois(S.N.path);
                out.N = {header: await panel().locator('.pkpHeader').first().getByRole('button').allInnerTexts().catch(() => []), menu: await openBulk()};
                await closeBulk();
                out.N.exp = await expand(S.N.subs.p1.id);
                out.N.snap = await snap('roles-N-noagency');
            }
            fact('roles', out);
        });

        // =========================================================================================
        // leave: ticks across the Articles/Issues tabs (OJS) and a page reload; the Registration tab's "Testing" left unsaved.
        await sect('leave', async () => {
            const out = {dialogs: []};
            const C = S.CR && !S.CR.error ? S.CR : S.N;
            const onDialog = async (d) => { out.dialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); };
            page.on('dialog', onDialog);
            try {
                await as(C.u.mg, C.path);
                await gotoDois(C.path);
                await tick([C.subs.p1.id, C.subs.p5 ? C.subs.p5.id : C.subs.u1.id]);
                out.ticked = await tickedIds();
                if (isOJS) {
                    await page.getByRole('tab', {name: 'Issues', exact: true}).click(); await sleep(900);
                    out.issuesMenu = await openBulk(); await closeBulk();
                    await page.getByRole('tab', {name: 'Articles', exact: true}).click(); await sleep(900);
                    out.afterTabSwitch = await tickedIds();
                    out.snapTab = await snap('leave-ticks-after-tab-switch');
                }
                if (!isOMP) {
                    // the Registration tab: tick "Testing" (unsaved), go to Setup, come back; then leave the page
                    await page.goto(ctxUrl(C.path, '/management/settings/distribution'));
                    await idle(page).catch(() => {});
                    await page.getByRole('tab', {name: 'DOIs', exact: true}).click();
                    await idle(page).catch(() => {});
                    const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
                    await dois.getByRole('tab', {name: 'Registration', exact: true}).click();
                    const reg = dois.getByRole('tabpanel', {name: 'Registration', exact: true});
                    const box = reg.getByRole('checkbox', {name: /Use the Crossref test API/});
                    out.testingBefore = await box.isChecked().catch(() => null);
                    await box.click().catch(() => {});
                    out.testingTicked = await box.isChecked().catch(() => null);
                    await dois.getByRole('tab', {name: 'Setup', exact: true}).click(); await sleep(600);
                    await dois.getByRole('tab', {name: 'Registration', exact: true}).click(); await sleep(600);
                    out.testingAfterSideTab = await box.isChecked().catch(() => null);
                    await page.getByRole('tab', {name: 'Statistics', exact: true}).click().catch(() => {}); await sleep(600);
                    await page.getByRole('tab', {name: 'DOIs', exact: true}).click(); await sleep(600);
                    await dois.getByRole('tab', {name: 'Registration', exact: true}).click(); await sleep(600);
                    out.testingAfterTopTab = await box.isChecked().catch(() => null);
                    out.snapReg = await snap('leave-registration-unsaved');
                    await page.goto(ctxUrl(C.path, '/dois')); await idle(page).catch(() => {});
                    out.leftTo = page.url().replace(/^https?:\/\/[^/]+/, '');
                    await page.goto(ctxUrl(C.path, '/management/settings/distribution#dois/doisRegistration')); await idle(page).catch(() => {});
                    await page.getByRole('tab', {name: 'DOIs', exact: true}).click().catch(() => {});
                    await dois.getByRole('tab', {name: 'Registration', exact: true}).click().catch(() => {});
                    await sleep(800);
                    out.testingAfterReturn = await box.isChecked().catch(() => null);
                    out.db = psql(`select setting_name, setting_value from plugin_settings where context_id=${C.id} and plugin_name ilike '%crossref%' and setting_name='testMode'`);
                }
            } finally {
                page.off('dialog', onDialog);
            }
            fact('leave', out);
        });
    } finally {
        fact('crashes', crashes);
        await close();
    }
});
