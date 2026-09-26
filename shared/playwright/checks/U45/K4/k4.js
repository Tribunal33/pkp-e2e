// U45 claim check, chunk K4: the DOIs "Registration" tab, the agencies, Crossref's own rules, Crossmark.
// Spec: docs/specs/U45-dois.md lines 79–114, 433–509, 579–590, 595–600, 607–609, register A5, A6, OPS2.
//
//   PROBE_FEATURE=U45 PROBE_AGENT=ccK4 node bin/probe.js all shared/playwright/checks/U45/K4/k4.js
//   PHASES=seed,arrive,reg,q6,agencyoff,datacite,config,warn,crossmark,crossmark2,kinds,extra,sched (default all; state in
//   k4-state-<app>.json; a phase runs once per seed: delete the state file for a fresh run).
//
// Scratch contexts per app (tag prefix u45k4):
//   R  (OJS, OPS) prefix, the first kind + galleys ticked, a published item with a galley; mg (OJS also ed, au)
//        → arrival with no agency plugin, enabling Crossref, choosing it, the unsaved leave, q5/A5/A6, the block's
//          refusals and limits, the valid save, q6 (OJS), disabling the chosen agency's plugin (Rule 34)
//   D  (OJS) prefix, Articles + Peer Review + galleys ticked, a published item → DataCite: block, q7, A6, configured
//   C  (OJS) Crossref chosen with the depositor fields, no publisher / ISSN, country CA, a published item
//        → Rule 36/37, Setting 13: the Masthead matrix, the notice, the DOIs page's agency controls
//   P  (OJS) Crossref chosen with the depositor fields, no publisher / ISSN, "Never", two articles in Production
//   P0 (OJS) the same without an agency (control) → Rule 39 / q23
//   X  (OJS) Crossref configured with Crossmark, "Never", two published articles → Rule 42 / q24
//      (OPS) Crossref configured, "Never", one posted and one unposted preprint → controls for Rules 39, 42
//   M  (OMP) a fresh press → the press's Registration tab and Plugins list (control)
// publicknowledge is read only (Plugins list, Registration tab) as its manager and as admin.
// "DOI Versioning" "Yes" is set only inside q6 and set back to "No" before the phase ends (the OJS OAI note).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['seed', 'arrive', 'reg', 'q6', 'agencyoff', 'datacite', 'config', 'warn', 'crossmark', 'crossmark2', 'kinds', 'extra', 'sched'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30000;
const DEP = {depositorName: 'K4 Depositor', depositorEmail: 'k4depositor@mail.test'};
const stateFile = (app) => path.join(outDir(), `k4-state-${app.name}.json`);

async function sect(name, fn) {
    try { await fn(); } catch (e) {
        log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 6).join(' | '));
        record(`${name.replace(/[^a-z0-9]+/gi, '-')}-FAILED`, {error: String(e.stack || e).slice(0, 2000)});
    }
}

forEachApp(async (app) => {
    const sf = stateFile(app);
    const sc = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(sc, null, 2));
    const n = app.name;
    const isOJS = n === 'ojs';
    const isOMP = n === 'omp';
    const isOPS = n === 'ops';
    const done = (p) => (sc.done || []).includes(p);
    const markDone = (p) => { sc.done = [...(sc.done || []), p]; save(); };
    const galleyFile = isOPS ? 'preprint.pdf' : 'article.pdf';
    const fact = (k, v) => { record('facts', {[k]: v}, {merge: true}); log(n, k, JSON.stringify(v).slice(0, 700)); };

    // ---- seed ----------------------------------------------------------------------------------
    if (on('seed') && !sc.seeded) {
        const mk = async (key, prefix, spec, users) => {
            const t = tag(`u45k4${prefix}`);
            const res = await app.api.createContext({tag: t, ...spec, context: {acronym: 'JPK', ...(spec.context || {})},
                users: users.map(([u, roles]) => ({username: `${t}${u}`, roles}))});
            sc[key] = {path: t, id: res.contextId, u: Object.fromEntries(users.map(([u]) => [u, `${t}${u}`]))};
            save();
            return t;
        };
        const sub = async (key, s, extra) => {
            const title = `K4 ${key}${s} ${sc[key].path}`;
            const r = await app.api.createSubmission({tag: `${sc[key].path}s${s}`, context: sc[key].path, submitter: sc[key].u.au, title, ...extra});
            sc[key].subs = [...(sc[key].subs || []), {id: r.submissionId, publicationId: r.publicationId, title, galleys: r.galleys}];
            save();
        };
        const MA = [['mg', ['manager']], ['au', ['author']]];
        if (isOMP) {
            await mk('M', 'm', {}, [['mg', ['manager']]]);
        } else {
            await mk('R', 'r', {doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'representation']},
                isOJS ? [['mg', ['manager']], ['ed', ['editor']], ['au', ['author']]] : MA);
            await sub('R', '1', {galleys: [{label: 'PDF', file: galleyFile}], published: true});
            const cm = isOJS ? {crossmark: true} : {};
            await mk('X', 'x', {doiPrefix: '10.1234', doiCreationTime: 'never', plugins: {crossrefplugin: {enabled: true, settings: {...DEP, ...cm}}},
                registrationAgency: 'crossrefplugin', ...(isOJS ? {publisherInstitution: 'K4 Publisher', onlineIssn: '0378-5955', context: {country: 'CA'}} : {})}, MA);
            await sub('X', '1', {published: true});
            await sub('X', '2', isOJS ? {published: true} : {});
        }
        if (isOJS) {
            await mk('D', 'd', {doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'peerReview', 'representation']}, MA);
            await sub('D', '1', {galleys: [{label: 'PDF', file: galleyFile}], published: true});
            await mk('C', 'c', {doiPrefix: '10.1234', plugins: {crossrefplugin: {enabled: true, settings: DEP}}, registrationAgency: 'crossrefplugin',
                context: {country: 'CA'}}, MA);
            await sub('C', '1', {published: true});
            const prod = {decisions: ['skipExternalReview', 'sendToProduction']};
            await mk('P', 'p', {doiPrefix: '10.1234', doiCreationTime: 'never', plugins: {crossrefplugin: {enabled: true, settings: DEP}},
                registrationAgency: 'crossrefplugin'}, MA);
            await sub('P', '1', prod);
            await sub('P', '2', prod);
            await mk('P0', 'q', {doiPrefix: '10.1234', doiCreationTime: 'never'}, MA);
            await sub('P0', '1', prod);
        }
        sc.seeded = true; save();
        log(n, 'seeded', JSON.stringify(sc).slice(0, 2500));
    }
    if (!sc.seeded) { log(n, 'not seeded'); return; }

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), url: page.url()});
        await d.accept().catch(() => {});
    });
    const ctxUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const snap = async (name, extra) => {
        const s = await screen(page);
        record(name, extra ? {...s, extra} : s);
        await shot(page, name).catch(() => {});
        return s;
    };
    const as = async (user, ctx) => {
        if (user === null) { await signOut(page).catch(() => {}); return; }
        await signIn(page, user, ctx ? {contextPath: ctx} : undefined);
        await idle(page);
    };
    const openSetup = async (ctx, sideTab = 'Setup') => {
        await page.goto(ctxUrl(ctx, '/management/settings/distribution')); await idle(page);
        await page.getByRole('tab', {name: 'DOIs', exact: true}).click({timeout: 15000});
        await idle(page);
        const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
        await dois.getByRole('tab', {name: sideTab, exact: true}).click();
        await idle(page);
        const panel = dois.getByRole('tabpanel', {name: sideTab, exact: true});
        await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T}).catch(() => {});
        return panel;
    };
    const readForm = async (panel) => panel.evaluate((root) => {
        const out = [];
        for (const e of root.querySelectorAll('input, select, textarea')) {
            if (e.type === 'hidden') continue;
            let label = e.labels && e.labels[0] ? e.labels[0].innerText : null;
            if (!label && e.getAttribute('aria-labelledby')) {
                label = e.getAttribute('aria-labelledby').split(' ').map((id) => document.getElementById(id)?.innerText || '').join(' | ');
            }
            out.push({name: e.name, type: e.type, value: e.type === 'password' ? '<not read>' : e.value,
                checked: e.checked, label: label && label.replace(/\s+/g, ' ').trim(), maxlength: e.getAttribute('maxlength'),
                required: e.required || e.getAttribute('aria-required'),
                visible: !!(e.offsetParent || e.getClientRects().length), disabled: e.disabled,
                options: e.tagName === 'SELECT' ? [...e.options].map((o) => `${o.value}=${o.text}${o.selected ? ' [selected]' : ''}`) : undefined});
        }
        const links = [...root.querySelectorAll('a')].filter((a) => a.getClientRects().length).map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href'), target: a.getAttribute('target')}));
        const errors = [...root.querySelectorAll('.pkpFieldError, [class*="FieldError"]')].map((x) => x.innerText.trim()).filter(Boolean);
        const fieldErrors = {};
        for (const e of root.querySelectorAll('input, select, textarea')) {
            const wrap = e.closest('.pkpFormField');
            if (!wrap || !e.name) continue;
            const er = [...wrap.querySelectorAll('.pkpFieldError, [class*="FieldError"]')].map((x) => x.innerText.trim()).filter(Boolean);
            if (er.length) fieldErrors[e.name] = er.join(' | ');
        }
        return {inputs: out, links, errors, fieldErrors, text: root.innerText};
    });
    const agencyOf = async (panel) => {
        const sel = panel.locator('select[name="registrationAgency"]');
        if (!(await sel.count())) return null;
        return sel.evaluate((s) => ({value: s.value, text: s.options[s.selectedIndex]?.text, options: [...s.options].map((o) => o.text)}));
    };
    const saveForm = async (panel, urlRe = /\/api\/v1\/contexts\/\d+(\/registrationAgency)?$/) => {
        const btn = panel.getByRole('button', {name: 'Save', exact: true});
        if (await btn.isDisabled()) return {saveDisabled: true, errors: (await readForm(panel)).errors};
        const reqs = [];
        const lis = (r) => { if (r.request().method() !== 'GET' && r.url().includes('/api/v1/')) reqs.push(`${r.request().method()} ${r.url().replace(app.baseURL, '')} ${r.status()}`); };
        page.on('response', lis);
        const w = page.waitForResponse((r) => urlRe.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await btn.click();
        const r = await w;
        const res = {status: r ? r.status() : null, url: r ? r.url().replace(app.baseURL, '') : null, body: r ? await r.text().then((t) => {
            // a refusal keeps its messages; a success keeps only the names of the fields it answered with
            if (r.status() >= 400) return flat(t, 600);
            try { const j = JSON.parse(t); return Array.isArray(j) ? `[${j.length}]` : `keys: ${Object.keys(j).slice(0, 40).join(',')}`; } catch (e) { return flat(t, 80); }
        }).catch(() => null) : null};
        await idle(page);
        await sleep(500);
        page.off('response', lis);
        res.requests = reqs;
        const f = await readForm(panel);
        res.errors = f.errors;
        res.fieldErrors = f.fieldErrors;
        res.saved = await panel.locator('[role="status"]').filter({hasText: 'Saved'}).count();
        res.footer = flat(await panel.locator('.pkpFormPage__footer, .pkpFormPage__status, .pkpFormErrors, [class*="formErrors"]').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 500);
        res.pageNotice = flat(await page.locator('.pkpNotification, .app__notifications').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 300);
        return res;
    };
    const tick = async (panel, label, v = true) => {
        const cb = panel.getByRole('checkbox', {name: label, exact: typeof label === 'string'});
        if (v) await cb.check(); else await cb.uncheck();
    };
    const openDois = async (ctx) => {
        const r = await page.goto(ctxUrl(ctx, '/dois')); await idle(page); await sleep(600);
        return r ? r.status() : null;
    };
    const expandAll = async () => {
        const b = page.getByRole('button', {name: /^Show more details about/});
        for (let i = 0; i < 30 && (await b.count()); i++) { await b.first().click().catch(() => {}); await sleep(250); }
        await sleep(300);
    };
    // the DOIs page's agency controls: "Deposit All", the bulk menu's actions, the expanded rows' text
    const doisControls = async (ctx, name) => {
        const status = await openDois(ctx);
        const o = {status, heading: flat(await page.locator('main h1').first().innerText().catch(() => null), 80)};
        o.tabs = await page.locator('main [role="tab"]').allInnerTexts().catch(() => []);
        o.depositAll = await page.getByRole('button', {name: 'Deposit All', exact: true}).count();
        o.headerButtons = (await page.locator('main button:visible').allInnerTexts().catch(() => [])).map((t) => flat(t, 60)).filter(Boolean).slice(0, 30);
        const bulkBtn = page.getByRole('button', {name: 'Bulk Actions'}).first();
        if (await bulkBtn.count()) {
            await bulkBtn.click(); await sleep(400);
            o.bulk = (await page.locator('.pkpDropdown__action:visible').allInnerTexts().catch(() => [])).map((t) => flat(t, 60));
            await snap(`${name}-bulk`);
            await bulkBtn.click().catch(() => {}); await sleep(300);
        }
        await expandAll();
        const s = await snap(name);
        o.main = flat(s.text.main, 2500);
        o.agencyPanel = await page.locator('.listPanel__itemExpanded').allInnerTexts().then((a) => a.map((t) => flat(t, 600))).catch(() => []);
        return o;
    };
    const grid = async (ctx, label, want, name) => {
        await page.goto(ctxUrl(ctx, '/management/settings/website')); await idle(page);
        await page.getByRole('tab', {name: 'Plugins', exact: true}).click(); await idle(page);
        const row = page.locator('tr').filter({hasText: label});
        const o = {rows: await row.count()};
        if (!o.rows) { if (name) await snap(name); return o; }
        const cb = row.locator('input[type=checkbox]').first();
        await cb.waitFor({timeout: T});
        o.before = await cb.isChecked();
        o.category = await row.first().evaluate((tr) => {
            let g = tr.closest('tbody'); const h = g && g.querySelector('tr'); return h ? h.innerText.trim() : null;
        }).catch(() => null);
        if (want !== undefined && o.before !== want) {
            const w = page.waitForResponse((r) => /enable|disable/.test(r.url()), {timeout: T}).catch(() => null);
            await cb.click();
            await sleep(700);
            const dlg = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible');
            if (await dlg.count()) {
                o.dialog = flat(await dlg.last().innerText(), 300);
                if (name) await snap(`${name}-confirm`);
                await dlg.last().getByRole('button', {name: /^(OK|Yes|Disable|Confirm)$/}).first().click().catch(() => {});
            }
            const r = await w;
            o.response = r ? `${r.request().method()} ${r.url().replace(app.baseURL, '').slice(0, 160)} ${r.status()}` : null;
            await idle(page); await sleep(800);
            o.after = await cb.isChecked();
            o.notices = flat(await page.locator('.pkp_notification, [role="alert"], .pkpNotification, .app__notifications').allInnerTexts().then((a) => a.join(' | ')), 300);
        }
        if (name) await snap(name);
        return o;
    };
    const chooseAgency = async (panel, label) => {
        await panel.locator('select[name="registrationAgency"]').selectOption({label});
        await sleep(600);
    };
    const fillIn = async (panel, name, value) => {
        const box = panel.locator(`[name="${name}"]`).first();
        await box.fill(value);
    };
    // a publish / post window read on a submission's workflow (OJS: the panel and its confirmation; OPS: the Post window)
    const wfUrl = (ctx, id, key) => ctxUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const publishRead = async (ctx, s, name, {publish = false} = {}) => {
        const o = {};
        await page.goto(wfUrl(ctx, s.id, `publication_${s.publicationId}_titleAbstract`)); await idle(page);
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await sleep(600);
        if (isOJS) {
            const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
            const ps = new PublicationScreen(page, ctx);
            // the panel opens without the version selects once the version already has a stage (a seeded
            // production item is "Version of Record 1.0"), so wait on its "Confirm", not on the selects
            const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Schedule For Publication|Publish)$/});
            await btn.waitFor({timeout: T});
            o.button = await btn.innerText();
            const statusAnswer = page.waitForResponse((r) => r.url().includes('/issueAssignmentStatus'), {timeout: 20000}).catch(() => null);
            await btn.click();
            // a version that already has its stage (a seeded Production item, "Version of Record 1.0") skips the
            // "Review Publishing Details" panel and opens the "Schedule For Publication" window at once
            const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
            const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to publish this|requirements must be met/});
            await panel.getByRole('button', {name: 'Confirm', exact: true}).or(confirm).first().waitFor({timeout: T});
            await statusAnswer; await idle(page); await sleep(800);
            o.panelShown = await panel.getByRole('button', {name: 'Confirm', exact: true}).isVisible().catch(() => false);
            if (o.panelShown) {
                const s1 = await snap(`${name}-panel`);
                o.panel = flat(s1.text.dialog, 1500);
                for (const [sel, v] of [['versionStage', 'VoR'], ['versionIsMinor', 'false']]) {
                    const box = panel.locator(`select[name="${sel}"]`);
                    if (await box.isVisible().catch(() => false) && !(await box.inputValue())) await box.selectOption(v);
                }
                if (await panel.getByRole('radio', {name: "Don't Assign To An Issue"}).count()) {
                    await ps.awaitAssignmentPreselected(panel).catch(() => {});
                    await panel.getByRole('radio', {name: "Don't Assign To An Issue"}).check();
                }
                await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
            }
            await confirm.waitFor({state: 'visible', timeout: T}).catch(() => {});
            await idle(page); await sleep(500);
            const s2 = await snap(`${name}-confirm`);
            o.confirm = flat(s2.text.dialog, 1500);
            o.confirmButtons = await confirm.getByRole('button').allInnerTexts().catch(() => []);
            if (publish) {
                const w = page.waitForResponse((r) => r.url().includes('/publish') && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
                const r = await w;
                o.publish = r ? r.status() : null;
                await page.getByRole('button', {name: 'Unpublish', exact: true}).waitFor({state: 'visible', timeout: T}).catch(() => {});
                await idle(page);
                const s3 = await snap(`${name}-published`);
                o.after = flat(s3.text.dialog, 400);
            } else {
                await confirm.getByRole('button', {name: /^(Cancel|Close)$/}).first().click({timeout: 5000}).catch(() => {});
                await sleep(500);
            }
        } else {
            const stageAction = page.getByRole('button', {name: 'Post the preprint', exact: true});
            const postControl = page.getByRole('button', {name: 'Post', exact: true});
            await stageAction.or(postControl).first().waitFor({timeout: T});
            if (await stageAction.isVisible()) { await stageAction.click(); await idle(page); await sleep(600); }
            const s1 = await snap(`${name}-window`);
            o.window = flat(s1.text.dialog, 1500);
            if (await postControl.count()) {
                await postControl.first().click();
                const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to post this|requirements must be met/});
                await confirm.waitFor({state: 'visible', timeout: T}).catch(() => {});
                await sleep(500);
                const s2 = await snap(`${name}-confirm`);
                o.confirm = flat(s2.text.dialog, 1500);
                await confirm.getByRole('button', {name: /^(Cancel|Close)$/}).first().click({timeout: 5000}).catch(() => {});
            }
        }
        return o;
    };
    // the DOIs page: tick one row and run a bulk action through its confirmation
    const bulkOn = async (ctx, title, action, name) => {
        await openDois(ctx);
        await page.getByRole('listitem').filter({hasText: title}).getByRole('checkbox').first().check();
        await page.getByRole('button', {name: 'Bulk Actions'}).first().click();
        await sleep(300);
        await page.locator('.pkpDropdown__action:visible').filter({hasText: action}).first().click();
        await sleep(600);
        const dlg = page.getByRole('dialog').filter({hasText: action}).last();
        const w = page.waitForResponse((r) => /\/api\/v1\/(_)?dois/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
        await dlg.getByRole('button', {name: action, exact: true}).click().catch(() => {});
        const r = await w;
        await idle(page); await sleep(800);
        await expandAll();
        const s = await snap(name);
        return {status: r ? r.status() : null, main: flat(s.text.main, 800)};
    };
    const articleRead = async (ctx, p, name) => {
        const r = await page.goto(ctxUrl(ctx, p)); await idle(page); await sleep(800);
        const s = await snap(name);
        const o = {status: r ? r.status() : null};
        o.crossmark = await page.locator('.item.crossmark').count();
        o.crossmarkHtml = await page.locator('.item.crossmark').first().evaluate((e) => e.outerHTML.slice(0, 800)).catch(() => null);
        o.sideBlocks = await page.evaluate(() => {
            const side = document.querySelector('.entry_details, .article_details .entry_details, .obj_article_details .entry_details');
            return side ? [...side.children].map((c) => (c.className || c.tagName).toString().slice(0, 60)) : null;
        });
        o.doiLine = flat(await page.locator('.item.doi').first().innerText().catch(() => null), 120);
        o.metaDoi = await page.locator('meta[name="DC.Identifier.DOI"]').getAttribute('content').catch(() => null);
        o.crossrefScripts = await page.evaluate(() => [...document.querySelectorAll('script[src]')].map((x) => x.src).filter((x) => /crossref|crossmark/i.test(x)));
        o.text = flat(s.text.main, 300);
        return o;
    };

    try {
        // ---- arrive: publicknowledge read-only, a fresh scratch Registration tab, OMP's press --------------------
        if (on('arrive') && !done('arrive')) await sect('arrive', async () => {
            await as('manager.maya', app.contextPath);
            const pk = {};
            pk.crossref = await grid(app.contextPath, 'Crossref Manager Plugin', undefined, 'a-01-pk-plugins');
            pk.datacite = await grid(app.contextPath, 'DataCite Manager Plugin', undefined, null);
            const reg = await openSetup(app.contextPath, 'Registration');
            const s = await snap('a-02-pk-registration');
            pk.reg = {agency: await agencyOf(reg), text: flat((await readForm(reg)).text, 700)};
            fact('arrive-pk', pk);
            if (isOMP) {
                const M = sc.M.path;
                await as(sc.M.u.mg, M);
                const m = {crossref: await grid(M, 'Crossref Manager Plugin', undefined, 'a-03-press-plugins'),
                    datacite: await grid(M, 'DataCite Manager Plugin', undefined, null)};
                const r2 = await openSetup(M, 'Registration');
                await snap('a-04-press-registration');
                const f = await readForm(r2);
                m.reg = {agency: await agencyOf(r2), inputs: f.inputs, text: flat(f.text, 700)};
                m.dois = await doisControls(M, 'a-05-press-dois');
                fact('arrive-press', m);
                await loc(page, 'Registration tab (press) "No Registration Agency Enabled"', r2.getByText('No Registration Agency Enabled'));
            } else {
                const R = sc.R.path;
                await as(sc.R.u.mg, R);
                const g = {crossref: await grid(R, 'Crossref Manager Plugin', undefined, 'a-03-scratch-plugins'),
                    datacite: await grid(R, 'DataCite Manager Plugin', undefined, null)};
                const reg2 = await openSetup(R, 'Registration');
                await snap('a-04-scratch-registration');
                const f = await readForm(reg2);
                g.reg = {agency: await agencyOf(reg2), inputs: f.inputs, text: flat(f.text, 700)};
                g.dois = await doisControls(R, 'a-05-scratch-dois-noagency');
                fact('arrive-scratch', g);
            }
            markDone('arrive');
        });

        // ---- reg: enable Crossref, choose it, leave unsaved, q5/A5/A6, refusals, limits, the valid save --------
        if (on('reg') && !done('reg') && !isOMP) await sect('reg', async () => {
            const R = sc.R.path;
            await as(sc.R.u.mg, R);
            const r = {};
            const setupKinds = async () => (await readForm(await openSetup(R))).inputs.filter((i) => i.type === 'checkbox').map((i) => `${i.label}:${i.checked}`);
            r.kindsBefore = await setupKinds();
            r.enable = await grid(R, 'Crossref Manager Plugin', true, 'r-01-enable-crossref');
            let reg = await openSetup(R, 'Registration');
            await snap('r-02-reg-list');
            let f = await readForm(reg);
            r.list = {agency: await agencyOf(reg), inputs: f.inputs, text: flat(f.text, 800), links: f.links};
            await loc(page, 'Registration Agency select', reg.locator('select[name="registrationAgency"]'));
            // choose without saving: the block shows at once
            const reqs = [];
            const lis = (x) => { if (x.request().method() !== 'GET') reqs.push(`${x.request().method()} ${x.url().replace(app.baseURL, '')}`); };
            page.on('response', lis);
            await chooseAgency(reg, 'Crossref');
            await idle(page);
            page.off('response', lis);
            await snap('r-03-crossref-chosen-unsaved');
            f = await readForm(reg);
            r.chosen = {requestsOnChoose: reqs, inputs: f.inputs, text: f.text.slice(0, 4000), links: f.links};
            await loc(page, 'Depositor name box', reg.locator('[name="depositorName"]'));
            await loc(page, 'Enable automatic depositing box', reg.getByRole('checkbox', {name: /Enable automatic depositing/}));
            if (isOJS) await loc(page, 'Crossmark box', reg.getByRole('checkbox', {name: /Enable participation in Crossmark/}));
            await loc(page, 'Crossref Testing box', reg.getByRole('checkbox', {name: /Use the Crossref test API/}));
            // leave with an unsaved change: side tab Setup and back, then another page and back
            await fillIn(reg, 'depositorName', 'Unsaved K4');
            const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
            await dois.getByRole('tab', {name: 'Setup', exact: true}).click(); await idle(page); await sleep(400);
            await dois.getByRole('tab', {name: 'Registration', exact: true}).click(); await idle(page); await sleep(400);
            r.backFromSetup = {agency: await agencyOf(reg), depositorName: await reg.locator('[name="depositorName"]').inputValue().catch(() => null)};
            await snap('r-04-back-from-setup');
            const dlgBefore = dialogs.length;
            await reg.locator('[name="depositorName"]').blur().catch(() => {});
            await page.goto(ctxUrl(R, '/management/settings/context')); await idle(page);
            r.leaveDialogs = dialogs.slice(dlgBefore);
            reg = await openSetup(R, 'Registration');
            r.afterLeave = {agency: await agencyOf(reg), depositorVisible: await reg.locator('[name="depositorName"]').isVisible().catch(() => false)};
            await snap('r-05-after-leave');
            // q5 / A5 / A6: 61 characters in "Depositor name", a valid email, auto deposit ticked, Save
            await chooseAgency(reg, 'Crossref');
            await reg.getByRole('checkbox', {name: /Enable automatic depositing/}).check();
            await fillIn(reg, 'depositorName', 'N'.repeat(61));
            await fillIn(reg, 'depositorEmail', DEP.depositorEmail);
            r.q5save = await saveForm(reg);
            await snap('r-06-q5-refused');
            r.q5same = {agency: await agencyOf(reg), auto: await reg.getByRole('checkbox', {name: /Enable automatic depositing/}).isChecked().catch(() => null)};
            await page.reload(); await idle(page);
            reg = await openSetup(R, 'Registration');
            await snap('r-07-q5-reload');
            f = await readForm(reg);
            r.q5reload = {agency: await agencyOf(reg), inputs: f.inputs.map((i) => `${i.name}=${i.type === 'checkbox' ? i.checked : i.value}`)};
            r.q5setup = await setupKinds();
            await snap('r-08-q5-setup');
            r.q5dois = await doisControls(R, 'r-09-q5-dois');
            // empties
            reg = await openSetup(R, 'Registration');
            if ((await agencyOf(reg))?.text !== 'Crossref') await chooseAgency(reg, 'Crossref');
            await fillIn(reg, 'depositorName', '');
            await fillIn(reg, 'depositorEmail', '');
            r.empty = await saveForm(reg);
            await snap('r-10-empty-refused');
            // a malformed email
            await fillIn(reg, 'depositorName', DEP.depositorName);
            await fillIn(reg, 'depositorEmail', 'not-an-email');
            r.badEmail = await saveForm(reg);
            await snap('r-11-bad-email');
            // the limits: email 91, username 121, password 51 (name 60 exactly: accepted?)
            await fillIn(reg, 'depositorName', 'N'.repeat(60));
            await fillIn(reg, 'depositorEmail', `${'e'.repeat(81)}@mail.test`);
            await fillIn(reg, 'username', 'u'.repeat(121));
            await fillIn(reg, 'password', 'p'.repeat(51));
            r.limits = await saveForm(reg);
            await snap('r-12-limits');
            // the other end: email 90, username 120, password 50
            await fillIn(reg, 'depositorEmail', `${'e'.repeat(80)}@mail.test`);
            await fillIn(reg, 'username', 'u'.repeat(120));
            await fillIn(reg, 'password', 'p'.repeat(50));
            r.limitsOk = await saveForm(reg);
            await snap('r-13-limits-ok');
            // the valid save
            await fillIn(reg, 'depositorName', DEP.depositorName);
            await fillIn(reg, 'depositorEmail', DEP.depositorEmail);
            await fillIn(reg, 'username', 'k4user');
            await fillIn(reg, 'password', 'k4secret');
            r.valid = await saveForm(reg);
            f = await readForm(reg);
            r.validSame = f.inputs.map((i) => `${i.name}=${i.type === 'checkbox' ? i.checked : i.value}`);
            await snap('r-14-valid-saved');
            await page.reload(); await idle(page);
            reg = await openSetup(R, 'Registration');
            f = await readForm(reg);
            r.validReload = {agency: await agencyOf(reg), inputs: f.inputs.map((i) => `${i.name}:${i.type}=${i.type === 'checkbox' ? i.checked : i.value}`)};
            await snap('r-15-valid-reload');
            r.validSetup = await setupKinds();
            r.validDois = await doisControls(R, 'r-16-valid-dois');
            fact('reg', r);
            // the editor (manager-level) sees the same tab (read only)
            if (isOJS) {
                await as(sc.R.u.ed, R);
                const rg = await openSetup(R, 'Registration');
                await snap('r-17-editor-registration');
                fact('reg-editor', {agency: await agencyOf(rg), text: flat((await readForm(rg)).text, 400)});
                await as('admin');
                const ra = await openSetup(R, 'Registration');
                await snap('r-18-admin-registration');
                fact('reg-admin', {agency: await agencyOf(ra), text: flat((await readForm(ra)).text, 400)});
            }
            markDone('reg');
        });

        // ---- q6 (OJS): "Update Policy DOI" under versioning No / Yes, Crossmark off / on -----------------------
        if (on('q6') && !done('q6') && isOJS) await sect('q6', async () => {
            const R = sc.R.path;
            await as(sc.R.u.mg, R);
            const q = {};
            const upd = async (reg) => ({visible: await reg.locator('[name="updatePolicyDoi"]').isVisible().catch(() => false),
                label: flat(await reg.locator('[name="updatePolicyDoi"]').evaluate((e) => e.closest('.pkpFormField')?.innerText).catch(() => null), 300)});
            let reg = await openSetup(R, 'Registration');
            q.noOff = await upd(reg);
            await reg.getByRole('checkbox', {name: /Enable participation in Crossmark/}).check(); await sleep(400);
            q.noOn = await upd(reg);
            await snap('q6-01-no-crossmark-on');
            await fillIn(reg, 'updatePolicyDoi', '');
            q.noOnEmpty = await saveForm(reg);
            await fillIn(reg, 'updatePolicyDoi', 'policy');
            q.noOnPolicy = await saveForm(reg);
            await snap('q6-02-policy-refused');
            await fillIn(reg, 'updatePolicyDoi', '10.1234/policy');
            q.noOnGood = await saveForm(reg);
            await snap('q6-03-policy-saved');
            await page.reload(); await idle(page);
            reg = await openSetup(R, 'Registration');
            q.noOnReload = {...(await upd(reg)), value: await reg.locator('[name="updatePolicyDoi"]').inputValue().catch(() => null),
                crossmark: await reg.getByRole('checkbox', {name: /Enable participation in Crossmark/}).isChecked()};
            await reg.getByRole('checkbox', {name: /Enable participation in Crossmark/}).uncheck(); await sleep(400);
            q.noOffAgain = await upd(reg);
            q.noOffSave = await saveForm(reg);
            await snap('q6-04-crossmark-off-saved');
            // DOI Versioning "Yes"
            let setup = await openSetup(R);
            await setup.getByRole('radio', {name: /^Yes, assign a unique DOI/}).check();
            q.versYes = await saveForm(setup);
            try {
                reg = await openSetup(R, 'Registration');
                q.yesOff = await upd(reg);
                await snap('q6-05-yes-crossmark-off');
                await fillIn(reg, 'updatePolicyDoi', '');
                q.yesOffEmpty = await saveForm(reg);
                await snap('q6-06-yes-empty');
                await fillIn(reg, 'updatePolicyDoi', 'policy');
                q.yesOffPolicy = await saveForm(reg);
                await fillIn(reg, 'updatePolicyDoi', '10.1234/policy');
                q.yesOffGood = await saveForm(reg);
                await reg.getByRole('checkbox', {name: /Enable participation in Crossmark/}).check(); await sleep(300);
                q.yesOn = await upd(reg);
                await reg.getByRole('checkbox', {name: /Enable participation in Crossmark/}).uncheck(); await sleep(300);
                await saveForm(reg);
            } finally {
                setup = await openSetup(R);
                await setup.getByRole('radio', {name: /^No, all versions/}).check();
                q.versNo = await saveForm(setup);
                const f = await readForm(await openSetup(R));
                q.versAfter = f.inputs.filter((i) => i.type === 'radio' && i.checked).map((i) => i.label);
            }
            reg = await openSetup(R, 'Registration');
            q.noAfter = {...(await upd(reg)), value: await reg.locator('[name="updatePolicyDoi"]').inputValue().catch(() => null)};
            await snap('q6-07-back-to-no');
            fact('q6', q);
            markDone('q6');
        });

        // ---- agencyoff: disabling the chosen agency's plugin (Rule 34) -------------------------------------------
        if (on('agencyoff') && !done('agencyoff') && !isOMP) await sect('agencyoff', async () => {
            const R = sc.R.path;
            await as(sc.R.u.mg, R);
            const o = {};
            let reg = await openSetup(R, 'Registration');
            o.before = await agencyOf(reg);
            if (isOJS) {
                o.dataciteOn = await grid(R, 'DataCite Manager Plugin', true, 'o-01-datacite-on');
                reg = await openSetup(R, 'Registration');
                o.withBoth = await agencyOf(reg);
                await snap('o-02-both-enabled');
            }
            o.crossrefOff = await grid(R, 'Crossref Manager Plugin', false, 'o-03-crossref-off');
            reg = await openSetup(R, 'Registration');
            const f = await readForm(reg);
            o.afterOff = {agency: await agencyOf(reg), text: flat(f.text, 600)};
            await snap('o-04-reg-after-crossref-off');
            o.setupAfterOff = (await readForm(await openSetup(R))).inputs.filter((i) => i.type === 'checkbox').map((i) => `${i.label}:${i.checked}`);
            o.doisAfterOff = await doisControls(R, 'o-05-dois-after-off');
            o.crossrefOn = await grid(R, 'Crossref Manager Plugin', true, null);
            reg = await openSetup(R, 'Registration');
            o.afterOn = {agency: await agencyOf(reg)};
            if (o.afterOn.agency) {
                await chooseAgency(reg, 'Crossref');
                const g = await readForm(reg);
                o.blockKept = g.inputs.map((i) => `${i.name}=${i.type === 'checkbox' ? i.checked : i.value}`);
            }
            await snap('o-06-reg-after-crossref-on');
            if (isOJS) o.dataciteOff = await grid(R, 'DataCite Manager Plugin', false, null);
            fact('agencyoff', o);
            markDone('agencyoff');
        });

        // ---- datacite (OJS D): the block, q7, A6 with DataCite, configured -----------------------------------
        if (on('datacite') && !done('datacite') && isOJS) await sect('datacite', async () => {
            const D = sc.D.path;
            await as(sc.D.u.mg, D);
            const d = {};
            const setupKinds = async () => (await readForm(await openSetup(D))).inputs.filter((i) => i.type === 'checkbox').map((i) => `${i.label}:${i.checked}`);
            d.kindsBefore = await setupKinds();
            d.enable = await grid(D, 'DataCite Manager Plugin', true, 'd-01-enable-datacite');
            let reg = await openSetup(D, 'Registration');
            d.list = await agencyOf(reg);
            await chooseAgency(reg, 'DataCite');
            await snap('d-02-datacite-chosen');
            let f = await readForm(reg);
            d.block = {inputs: f.inputs, text: f.text.slice(0, 3000), links: f.links};
            await loc(page, 'DataCite Testing box', reg.getByRole('checkbox', {name: /Use the DataCite test system/}));
            // q7 and the limits: Testing ticked, empty test prefix, every box at 51
            await reg.getByRole('checkbox', {name: /Use the DataCite test system/}).check();
            for (const k of ['username', 'password', 'testUsername', 'testPassword']) await fillIn(reg, k, 'x'.repeat(51));
            await fillIn(reg, 'testDOIPrefix', '');
            d.q7empty = await saveForm(reg);
            await snap('d-03-q7-refused');
            await page.reload(); await idle(page);
            reg = await openSetup(D, 'Registration');
            f = await readForm(reg);
            d.afterRefusedReload = {agency: await agencyOf(reg), inputs: f.inputs.map((i) => `${i.name}=${i.type === 'checkbox' ? i.checked : i.value}`)};
            d.kindsAfterRefused = await setupKinds();
            reg = await openSetup(D, 'Registration');
            if ((await agencyOf(reg))?.text !== 'DataCite') await chooseAgency(reg, 'DataCite');
            await reg.getByRole('checkbox', {name: /Use the DataCite test system/}).check();
            for (const k of ['username', 'password', 'testUsername', 'testPassword']) await fillIn(reg, k, 'x'.repeat(50));
            await fillIn(reg, 'testDOIPrefix', '10.5072');
            d.q7good = await saveForm(reg);
            await snap('d-04-q7-saved');
            await page.reload(); await idle(page);
            reg = await openSetup(D, 'Registration');
            f = await readForm(reg);
            d.afterGoodReload = {agency: await agencyOf(reg), inputs: f.inputs.map((i) => `${i.name}:${i.type}=${i.type === 'checkbox' ? i.checked : i.value}`)};
            await snap('d-05-q7-reload');
            d.kindsAfter = await setupKinds();
            await snap('d-06-setup-after');
            d.dois = await doisControls(D, 'd-07-dois-configured');
            // "Testing" unticked: configured by the prefix alone
            reg = await openSetup(D, 'Registration');
            await reg.getByRole('checkbox', {name: /Use the DataCite test system/}).uncheck();
            d.testingOff = await saveForm(reg);
            d.doisTestingOff = await doisControls(D, 'd-08-dois-testing-off');
            fact('datacite', d);
            markDone('datacite');
        });

        // ---- config (OJS C): the Masthead matrix, the notice, the DOIs page's agency controls ----------------
        if (on('config') && !done('config') && isOJS) await sect('config', async () => {
            const C = sc.C.path;
            await as(sc.C.u.mg, C);
            const c = {};
            const masthead = async (vals, name) => {
                await page.goto(ctxUrl(C, '/management/settings/context')); await idle(page);
                for (const [k, v] of Object.entries(vals)) await page.locator(`#masthead-${k}-control`).fill(v);
                const box = page.locator('#masthead-publisherInstitution-control');
                const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await page.locator('form').filter({has: box}).getByRole('button', {name: 'Save', exact: true}).click();
                const r = await w;
                await idle(page);
                await snap(name);
                return r ? r.status() : null;
            };
            const readState = async (key) => {
                const reg = await openSetup(C, 'Registration');
                const f = await readForm(reg);
                const s = await snap(`c-${key}-registration`);
                const o = {agency: await agencyOf(reg), notice: f.text.includes('Plugin requirements not met'),
                    noticeText: flat(f.text.slice(0, 900), 900), links: f.links.filter((l) => /Journal Settings/.test(l.text))};
                o.dois = await doisControls(C, `c-${key}-dois`);
                return o;
            };
            c.none = await readState('01-none');
            // the notice does not stop "Save"
            const reg = await openSetup(C, 'Registration');
            c.saveWithNotice = await saveForm(reg);
            c.pub = {masthead: await masthead({publisherInstitution: 'K4 Publisher'}, 'c-02-masthead-publisher'), ...(await readState('02-publisher'))};
            c.pubPrint = {masthead: await masthead({printIssn: '2049-3630'}, 'c-03-masthead-print'), ...(await readState('03-publisher-print'))};
            c.pubOnline = {masthead: await masthead({printIssn: '', onlineIssn: '0378-5955'}, 'c-04-masthead-online'), ...(await readState('04-publisher-online'))};
            c.onlineOnly = {masthead: await masthead({publisherInstitution: ''}, 'c-05-masthead-nopublisher'), ...(await readState('05-online-only'))};
            // back to configured and press the notice's link once (where it leads)
            c.back = {masthead: await masthead({publisherInstitution: 'K4 Publisher'}, 'c-06-masthead-back')};
            await masthead({publisherInstitution: '', onlineIssn: ''}, 'c-07-masthead-cleared');
            const reg2 = await openSetup(C, 'Registration');
            const link = reg2.getByRole('link', {name: 'Journal Settings Page'}).first();
            c.linkCount = await reg2.getByRole('link', {name: 'Journal Settings Page'}).count();
            if (c.linkCount) {
                await link.click(); await idle(page); await sleep(500);
                c.linkLanded = page.url().replace(app.baseURL, '');
                await snap('c-08-link-landed');
            }
            await masthead({publisherInstitution: 'K4 Publisher', onlineIssn: '0378-5955'}, 'c-09-masthead-final');
            fact('config', c);
            markDone('config');
        });

        // ---- warn (OJS P, P0; OPS X control): the publish window's Crossref warnings -------------------------
        if (on('warn') && !done('warn') && !isOMP) await sect('warn', async () => {
            const w = {};
            if (isOJS) {
                const P = sc.P.path;
                const [p1, p2] = sc.P.subs;
                await as(sc.P0.u.mg, sc.P0.path);
                w.control = await publishRead(sc.P0.path, sc.P0.subs[0], 'w-01-control-noagency');
                await as(sc.P.u.mg, P);
                w.never = await publishRead(P, p1, 'w-02-never');
                const setCreation = async (label) => {
                    const setup = await openSetup(P);
                    await setup.getByRole('combobox', {name: 'Automatic DOI Assignment'}).selectOption({label});
                    return saveForm(setup);
                };
                w.setCopy = await setCreation('Upon reaching the copyediting stage');
                w.copy = await publishRead(P, p1, 'w-03-copyediting');
                w.setPub = await setCreation('Upon publication');
                w.pub = await publishRead(P, p1, 'w-04-upon-publication');
                w.setCopy2 = await setCreation('Upon reaching the copyediting stage');
                // p2 with a DOI assigned on the DOIs page
                w.assign = await bulkOn(P, p2.title, 'Assign DOIs', 'w-05-assign-p2');
                w.withDoi = await publishRead(P, p2, 'w-06-p2-with-doi');
                // "Articles" unticked ("Issues" ticked instead)
                let setup = await openSetup(P);
                await tick(setup, 'Issues', true);
                await tick(setup, 'Articles', false);
                w.noArticles = await saveForm(setup);
                w.articlesOff = await publishRead(P, p1, 'w-07-articles-off');
                setup = await openSetup(P);
                await tick(setup, 'Articles', true);
                await tick(setup, 'Issues', false);
                w.articlesBack = await saveForm(setup);
                // publishing goes ahead with the warnings shown
                w.publish = await publishRead(P, p1, 'w-08-publish', {publish: true});
            } else {
                const X = sc.X.path;
                await as(sc.X.u.mg, X);
                w.opsControl = await publishRead(X, sc.X.subs[1], 'w-01-ops-post');
            }
            fact('warn', w);
            markDone('warn');
        });

        // ---- crossmark (OJS X; OPS X control): the button, versions, agency None, plugin off, box off ----------
        const runCrossmark = async (XC, key, pre) => {
            const X = XC.path;
            const [a1, a2] = XC.subs;
            const art = (s, pub) => (isOJS ? `/article/view/${s.id}${pub ? `/version/${pub}` : ''}` : `/preprint/view/${s.id}${pub ? `/version/${pub}` : ''}`);
            // every step's value is recorded as it is set, so a failed step keeps the earlier ones
            const x = new Proxy({}, {set(t, k, v) { t[k] = v; record('facts', {[key]: t}, {merge: true}); return true; }});
            await as(XC.u.mg, X);
            let reg = await openSetup(X, 'Registration');
            x.reg = (await readForm(reg)).inputs.map((i) => `${i.name}=${i.type === 'checkbox' ? i.checked : i.value}`);
            await snap(`${pre}-01-reg`);
            if (isOPS) {
                x.assign = await bulkOn(X, a1.title, 'Assign DOIs', `${pre}-02-ops-assign`);
                await as(null);
                x.opsVisitor = await articleRead(X, art(a1), `${pre}-03-ops-visitor`);
                return;
            }
            // a2: a DOI assigned; a1 stays without one for now
            x.assign = await bulkOn(X, a2.title, 'Assign DOIs', `${pre}-02-assign-a2`);
            await as(null);
            x.withDoi = await articleRead(X, art(a2), `${pre}-03-visitor-with-doi`);
            x.withoutDoi = await articleRead(X, art(a1), `${pre}-04-visitor-without-doi`);
            // press the button: what opens
            const btn = page.locator('.item.crossmark a, .item.crossmark button').first();
            await articleRead(X, art(a2), `${pre}-05-before-press`);
            if (await btn.count()) {
                const popups = [];
                const reqs = [];
                page.context().on('page', (p) => popups.push(p.url()));
                const lis = (r) => { if (/crossref|crossmark/i.test(r.url())) reqs.push(`${r.method()} ${r.url().slice(0, 160)}`); };
                page.on('request', lis);
                const url0 = page.url();
                await btn.click().catch((e) => { x.pressError = String(e.message).slice(0, 200); });
                await sleep(3000);
                page.off('request', lis);
                x.press = {popups, requests: reqs, urlBefore: url0, urlAfter: page.url(), dialogs: await page.locator('[role="dialog"]:visible, iframe:visible').count(),
                    iframes: await page.locator('iframe').evaluateAll((fs) => fs.map((f) => f.src).filter(Boolean).slice(0, 5))};
                await snap(`${pre}-06-after-press`);
            }
            // a1: a new version gets the DOI, the old version keeps none
            await as(XC.u.mg, X);
            const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
            const ps = new PublicationScreen(page, X);
            await page.goto(wfUrl(X, a1.id)); await idle(page); await sleep(800);
            const newPub = await ps.createNewVersionUntouched();
            x.newPub = newPub;
            x.assignA1 = await bulkOn(X, a1.title, 'Assign DOIs', `${pre}-07-assign-a1-v2`);
            x.publishV2 = await publishRead(X, {id: a1.id, publicationId: newPub}, `${pre}-08-publish-v2`, {publish: true});
            await as(null);
            x.a1Current = await articleRead(X, art(a1), `${pre}-09-a1-current`);
            x.a1Old = await articleRead(X, art(a1, a1.publicationId), `${pre}-10-a1-old-version`);
            // Registration Agency back to "None"
            await as(XC.u.mg, X);
            reg = await openSetup(X, 'Registration');
            await chooseAgency(reg, 'None');
            x.none = await saveForm(reg);
            x.noneSame = await agencyOf(reg);
            await snap(`${pre}-11-agency-none`);
            await page.reload(); await idle(page);
            reg = await openSetup(X, 'Registration');
            x.noneReload = await agencyOf(reg);
            await snap(`${pre}-11b-agency-none-reload`);
            await as(null);
            x.noneVisitor = await articleRead(X, art(a2), `${pre}-12-visitor-agency-none`);
            // the plugin disabled
            await as(XC.u.mg, X);
            x.pluginOff = await grid(X, 'Crossref Manager Plugin', false, null);
            await as(null);
            x.offVisitor = await articleRead(X, art(a2), `${pre}-13-visitor-plugin-off`);
            // plugin on again, Crossref chosen, then "Crossmark" unticked
            await as(XC.u.mg, X);
            x.pluginOn = await grid(X, 'Crossref Manager Plugin', true, null);
            reg = await openSetup(X, 'Registration');
            x.afterOn = await agencyOf(reg);
            await chooseAgency(reg, 'Crossref');
            x.blockOnReturn = (await readForm(reg)).inputs.map((i) => `${i.name}=${i.type === 'checkbox' ? i.checked : i.value}`);
            if (!(await reg.locator('[name="depositorName"]').inputValue())) { await fillIn(reg, 'depositorName', DEP.depositorName); await fillIn(reg, 'depositorEmail', DEP.depositorEmail); }
            x.rechoose = await saveForm(reg);
            await as(null);
            x.rechooseVisitor = await articleRead(X, art(a2), `${pre}-14-visitor-rechosen`);
            await as(XC.u.mg, X);
            reg = await openSetup(X, 'Registration');
            x.beforeBoxOff = await agencyOf(reg);
            if (!x.beforeBoxOff || x.beforeBoxOff.text !== 'Crossref') await chooseAgency(reg, 'Crossref');
            await reg.getByRole('checkbox', {name: /Enable participation in Crossmark/}).uncheck();
            x.boxOff = await saveForm(reg);
            await as(null);
            x.boxOffVisitor = await articleRead(X, art(a2), `${pre}-15-visitor-crossmark-off`);
        };
        if (on('crossmark') && !done('crossmark') && !isOMP) await sect('crossmark', async () => {
            await runCrossmark(sc.X, 'crossmark', 'x');
            markDone('crossmark');
        });
        // crossmark2 (OJS): the same drive on a fresh journal (the second run of every Rule 42 read)
        if (on('crossmark2') && !done('crossmark2') && isOJS) await sect('crossmark2', async () => {
            if (!sc.X2) {
                const t = tag('u45k4y');
                const res = await app.api.createContext({tag: t, doiPrefix: '10.1234', doiCreationTime: 'never',
                    plugins: {crossrefplugin: {enabled: true, settings: {...DEP, crossmark: true}}}, registrationAgency: 'crossrefplugin',
                    publisherInstitution: 'K4 Publisher', onlineIssn: '0378-5955', context: {acronym: 'JPK', country: 'CA'},
                    users: [{username: `${t}mg`, roles: ['manager']}, {username: `${t}au`, roles: ['author']}]});
                sc.X2 = {path: t, id: res.contextId, u: {mg: `${t}mg`, au: `${t}au`}, subs: []};
                for (const n2 of ['1', '2']) {
                    const title = `K4 Y${n2} ${t}`;
                    const r = await app.api.createSubmission({tag: `${t}s${n2}`, context: t, submitter: `${t}au`, title, published: true});
                    sc.X2.subs.push({id: r.submissionId, publicationId: r.publicationId, title});
                }
                save();
            }
            await runCrossmark(sc.X2, 'crossmark2', 'y');
            markDone('crossmark2');
        });

        // ---- kinds (OJS): which kinds survive choosing an agency when the dropped kind is not the last one --------
        //   R2 Crossref with Articles + galleys + Peer Review; D3 DataCite with Articles + Peer Review + galleys (a
        //   second run of the datacite phase's read); D2 DataCite with Articles + galleys (nothing dropped) → Rule 36
        //   for DataCite. The stored row is read with psql (the parity ground truth, scenarios.md), read only.
        if (on('kinds') && !done('kinds') && isOJS) await sect('kinds', async () => {
            const kinds = {R2: ['publication', 'representation', 'peerReview'], D3: ['publication', 'peerReview', 'representation'], D2: ['publication', 'representation']};
            for (const k of Object.keys(kinds)) {
                if (sc[k]) continue;
                const t = tag(`u45k4${k.toLowerCase()}`);
                const res = await app.api.createContext({tag: t, doiPrefix: '10.1234', enabledDoiTypes: kinds[k], context: {acronym: 'JPK'},
                    users: [{username: `${t}mg`, roles: ['manager']}, {username: `${t}au`, roles: ['author']}]});
                const title = `K4 ${k} ${t}`;
                const r = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, title, galleys: [{label: 'PDF', file: galleyFile}], published: true});
                sc[k] = {path: t, id: res.contextId, u: {mg: `${t}mg`}, subs: [{id: r.submissionId, publicationId: r.publicationId, title}]};
                save();
            }
            const row = (id) => execSync(`psql -h 127.0.0.1 -U e2e ${n}_test -Atc "select setting_value from journal_settings where journal_id=${Number(id)} and setting_name='enabledDoiTypes'"`,
                {env: {...process.env, PGPASSWORD: 'e2e'}, timeout: 30000}).toString().trim();
            const setupKinds = async (ctx) => (await readForm(await openSetup(ctx))).inputs.filter((i) => i.type === 'checkbox').map((i) => `${i.label}:${i.checked}`);
            for (const [k, agency, plugin] of [['R2', 'Crossref', 'Crossref Manager Plugin'], ['D3', 'DataCite', 'DataCite Manager Plugin'], ['D2', 'DataCite', 'DataCite Manager Plugin']]) {
                const C = sc[k];
                const o = {};
                await as(C.u.mg, C.path);
                o.kindsBefore = await setupKinds(C.path);
                o.rowBefore = row(C.id);
                o.doisBefore = await doisControls(C.path, `k-${k}-01-dois-before`);
                o.enable = await grid(C.path, plugin, true, null);
                const reg = await openSetup(C.path, 'Registration');
                await chooseAgency(reg, agency);
                if (agency === 'Crossref') { await fillIn(reg, 'depositorName', DEP.depositorName); await fillIn(reg, 'depositorEmail', DEP.depositorEmail); }
                o.save = await saveForm(reg);
                await snap(`k-${k}-02-saved`);
                o.rowAfter = row(C.id);
                o.kindsAfter = await setupKinds(C.path);
                await snap(`k-${k}-03-setup-after`);
                o.doisAfter = await doisControls(C.path, `k-${k}-04-dois-after`);
                if (k === 'D2') {
                    const reg2 = await openSetup(C.path, 'Registration');
                    await reg2.getByRole('checkbox', {name: /Use the DataCite test system/}).check();
                    await fillIn(reg2, 'testDOIPrefix', '10.5072');
                    o.testing = await saveForm(reg2);
                    o.doisTesting = await doisControls(C.path, `k-${k}-05-dois-testing`);
                }
                fact(`kinds-${k}`, o);
            }
            markDone('kinds');
        });

        // ---- extra: "Save" on a tab with no agency plugin; a preprint server with "Preprints" unticked ------------
        if (on('extra') && !done('extra')) await sect('extra', async () => {
            const e = {};
            let ctx; let user;
            if (isOJS) { ctx = sc.P0.path; user = sc.P0.u.mg; }
            if (isOMP) { ctx = sc.M.path; user = sc.M.u.mg; }
            if (isOPS) {
                if (!sc.E) {
                    const t = tag('u45k4e');
                    const res = await app.api.createContext({tag: t, doiPrefix: '10.1234', context: {acronym: 'JPK'}, users: [{username: `${t}mg`, roles: ['manager']}]});
                    sc.E = {path: t, id: res.contextId, u: {mg: `${t}mg`}}; save();
                }
                ctx = sc.E.path; user = sc.E.u.mg;
            }
            await as(user, ctx);
            const reg = await openSetup(ctx, 'Registration');
            e.noAgencySave = await saveForm(reg);
            await snap('e-01-noagency-save');
            if (isOPS) {
                const R = sc.R.path;
                await as(sc.R.u.mg, R);
                let setup = await openSetup(R);
                await tick(setup, 'Preprints', false);
                e.untickPreprints = await saveForm(setup);
                await snap('e-02-preprints-unticked');
                e.doisUnticked = await doisControls(R, 'e-03-dois-preprints-unticked');
                e.sideMenuDois = await page.locator('nav a, aside a').filter({hasText: /^DOIs$/}).count();
                setup = await openSetup(R);
                await tick(setup, 'Preprints', true);
                e.retick = await saveForm(setup);
                e.doisRetick = {depositAll: (await doisControls(R, 'e-04-dois-preprints-reticked')).depositAll};
            }
            fact('extra', e);
            markDone('extra');
        });

        // ---- sched: the install's scheduled tasks (a read-only install tool, no screen shows them) ------------
        if (on('sched') && !done('sched')) await sect('sched', async () => {
            const out = execSync('php lib/pkp/tools/scheduler.php list', {cwd: path.resolve(app.root), env: {...process.env, PKP_CONFIG_FILE: 'config.test.inc.php'}, timeout: 60000}).toString();
            fact('sched', out.split('\n').map((l) => l.replace(/\.{2,}/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean));
            markDone('sched');
        });
    } finally {
        record('dialogs', dialogs);
        await close();
    }
});
