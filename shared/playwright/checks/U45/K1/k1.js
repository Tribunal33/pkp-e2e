// U45 claim check, chunk K1: the DOIs "Setup" tab, who reaches the DOI screens, the DOI's shape.
// Spec: docs/specs/U45-dois.md lines 10–78, 131–174, 191–212, 552–573, register A1, A2, OPS1.
//
//   PROBE_FEATURE=U45 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U45/K1/k1.js
//   PHASES=seed,arrive,roles,q10,form,q1,rule4,shape,peer,crossmark (default all; state in k1-state-<app>.json;
//   a phase runs once per seed: delete the state file for a fresh run).
//
// Scratch contexts per app (tag prefix u45k1):
//   A  fresh, every roster level (OJS/OMP mg, ed, pe, se, ce, rv, au, rd; OPS mg, se, eb, au, rd)  → arrival, roles, q10
//   B  (OJS, OMP) editor + production editor with "Permit changes to Settings" unticked            → q2 (1)
//   C  fresh, mg                                                                                   → q3, no kind, q4, None link, Issues tab
//   E  (OJS) prefix, mg                                                                            → q1 DataCite on / off
//   G  prefix, galleys (OMP: files) ticked, an item published with a galley (OMP: a format + file) → Rule 4, q11
//   D  prefix, "Default", "Never", two published                                                   → Rule 6a via "Assign DOIs"
//   N  prefix, "None", "Never", two published; N2 prefix, "None", "Upon publication", one published → Rule 6b, q13, A2
//   P  "Custom pattern": OJS acronym JPK %j.v%vi%i.%a (an issue Vol 1 No 2), P2 %j.%p; OMP %p.%m; OPS %j.%a → q14
//   R  (OJS) peer review public by default, "Peer Review" ticked, "Custom pattern"; R2 the same "Default" → A2 peer reviews
//   X  Crossref chosen with Crossmark (OJS), Crossref chosen (OPS control)                          → Actors rows 4–5
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['seed', 'arrive', 'roles', 'q10', 'form', 'q1', 'rule4', 'shape', 'shape2', 'peer2', 'crossmark', 'extra', 'typed', 'last', 'controls', 'hidden'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const T = 30000;
const stateFile = (app) => path.join(outDir(), `k1-state-${app.name}.json`);

const KINDS = {
    ojs: ['Articles', 'Issues', 'Article galleys, such as a published PDF', 'Peer Review'],
    omp: ['Monographs', 'Chapters', 'Publication Formats', 'Files'],
    ops: ['Preprints', 'Preprint galleys, such as a published PDF'],
};
const ENABLE = {
    ojs: /^Allow Digital Object Identifiers/,
    omp: /^Allow Digital Object Identifiers/,
    ops: /^Allow Digital Object Identifiers/,
};

async function sect(name, fn) {
    try { await fn(); } catch (e) {
        log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
        record(`${name.replace(/[^a-z0-9]+/gi, '-')}-FAILED`, {error: String(e.stack || e).slice(0, 1500)});
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
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('facts', {[k]: v}, {merge: true}); log(n, k, JSON.stringify(v).slice(0, 600)); };

    // ---- seed ----------------------------------------------------------------------------------
    if (on('seed') && !sc.seeded) {
        const mk = async (key, prefix, spec, users) => {
            const t = tag(`u45k1${prefix}`);
            const res = await app.api.createContext({tag: t, ...spec, context: {acronym: 'JPK', ...(spec.context || {})},
                users: users.map(([u, roles]) => ({username: `${t}${u}`, roles}))});
            sc[key] = {path: t, id: res.contextId, u: Object.fromEntries(users.map(([u]) => [u, `${t}${u}`]))};
            save();
            return t;
        };
        const roster = isOPS
            ? [['mg', ['manager']], ['se', ['sectionEditor']], ['eb', ['editorialBoardMember']], ['au', ['author']], ['rd', ['reader']]]
            : [['mg', ['manager']], ['ed', ['editor']], ['pe', ['productionEditor']], ['se', ['sectionEditor']], ['ce', ['copyeditor']],
                ['rv', ['externalReviewer']], ['au', ['author']], ['rd', ['reader']]];
        await mk('A', 'a', {}, roster);
        if (!isOPS) await mk('B', 'b', {roles: {editor: {permitSettings: false}, productionEditor: {permitSettings: false}}},
            [['mg', ['manager']], ['ed', ['editor']], ['pe', ['productionEditor']]]);
        await mk('C', 'c', {}, [['mg', ['manager']]]);
        if (isOJS) await mk('E', 'e', {doiPrefix: '10.1234'}, [['mg', ['manager']]]);
        const MA = [['mg', ['manager']], ['au', ['author']]];
        // G: Rule 4 / q11
        if (isOMP) {
            await mk('G', 'g', {doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'file']}, MA);
            const r = await app.api.createSubmission({tag: `${sc.G.path}s`, context: sc.G.path, submitter: sc.G.u.au, title: `K1 G ${sc.G.path}`,
                publicationFormats: [{name: 'PDF', file: 'article.pdf'}], published: true});
            sc.G.sub = {id: r.submissionId, publicationId: r.publicationId};
        } else {
            await mk('G', 'g', {doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'representation']}, MA);
            const r = await app.api.createSubmission({tag: `${sc.G.path}s`, context: sc.G.path, submitter: sc.G.u.au, title: `K1 G ${sc.G.path}`,
                galleys: [{label: 'PDF', file: galleyFile}], published: true});
            sc.G.sub = {id: r.submissionId, publicationId: r.publicationId, galleys: r.galleys};
        }
        save();
        // D, N, N2: the formats
        await mk('D', 'd', {doiPrefix: '10.1234', doiCreationTime: 'never'}, MA);
        await mk('N', 'n', {doiPrefix: '10.1234', doiSuffixType: 'none', doiCreationTime: 'never'}, MA);
        await mk('N2', 'nb', {doiPrefix: '10.1234', doiSuffixType: 'none', doiCreationTime: 'publication'}, MA);
        for (const k of ['D', 'N', 'N2']) {
            sc[k].subs = [];
            for (const s of (k === 'N2' ? ['1'] : ['1', '2'])) {
                const r = await app.api.createSubmission({tag: `${sc[k].path}s${s}`, context: sc[k].path, submitter: sc[k].u.au,
                    title: `K1 ${k}${s} ${sc[k].path}`, published: true});
                sc[k].subs.push({id: r.submissionId, publicationId: r.publicationId, title: `K1 ${k}${s} ${sc[k].path}`});
            }
            save();
        }
        // P: custom pattern
        if (isOJS) {
            await mk('P', 'p', {doiPrefix: '10.1234', doiCreationTime: 'never', doiSuffixType: 'customPattern',
                doiPublicationSuffixPattern: '%j.v%vi%i.%a', issues: [{volume: 1, number: 2, year: 2014}]}, MA);
            const r = await app.api.createSubmission({tag: `${sc.P.path}s`, context: sc.P.path, submitter: sc.P.u.au,
                title: `K1 P1 ${sc.P.path}`, decisions: ['skipExternalReview']});
            sc.P.sub = {id: r.submissionId, publicationId: r.publicationId, title: `K1 P1 ${sc.P.path}`};
            await mk('P2', 'pb', {doiPrefix: '10.1234', doiCreationTime: 'never', doiSuffixType: 'customPattern',
                doiPublicationSuffixPattern: '%j.%p'}, MA);
            const r2 = await app.api.createSubmission({tag: `${sc.P2.path}s`, context: sc.P2.path, submitter: sc.P2.u.au,
                title: `K1 P2 ${sc.P2.path}`, published: true});
            sc.P2.sub = {id: r2.submissionId, publicationId: r2.publicationId, title: `K1 P2 ${sc.P2.path}`};
        } else {
            await mk('P', 'p', {doiPrefix: '10.1234', doiCreationTime: 'never', doiSuffixType: 'customPattern',
                doiPublicationSuffixPattern: isOMP ? '%p.%m' : '%j.%a'}, MA);
            const r = await app.api.createSubmission({tag: `${sc.P.path}s`, context: sc.P.path, submitter: sc.P.u.au,
                title: `K1 P1 ${sc.P.path}`, published: true});
            sc.P.sub = {id: r.submissionId, publicationId: r.publicationId, title: `K1 P1 ${sc.P.path}`};
        }
        save();
        // R, R2: peer review DOIs (OJS)
        if (isOJS) {
            for (const [k, fmt] of [['R', 'customPattern'], ['R2', 'default']]) {
                await mk(k, k === 'R' ? 'r' : 'rb', {doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'peerReview'],
                    doiSuffixType: fmt, ...(fmt === 'customPattern' ? {doiPublicationSuffixPattern: '%j.%a'} : {}),
                    review: {defaultReviewPublicVisibility: true}},
                [['mg', ['manager']], ['au', ['author']], ['rv', ['externalReviewer']]]);
                const r = await app.api.createSubmission({tag: `${sc[k].path}s`, context: sc[k].path, submitter: sc[k].u.au,
                    title: `K1 ${k} ${sc[k].path}`, decisions: ['sendExternalReview'],
                    reviewRounds: [{reviewers: [{username: sc[k].u.rv, status: 'completed'}]}]});
                sc[k].sub = {id: r.submissionId, publicationId: r.publicationId, title: `K1 ${k} ${sc[k].path}`};
                save();
            }
        }
        // X: Crossref chosen (OJS with Crossmark)
        if (!isOMP) {
            const dep = {depositorName: 'K1 Depositor', depositorEmail: 'k1depositor@mail.test', ...(isOJS ? {crossmark: true} : {})};
            await mk('X', 'x', {doiPrefix: '10.1234', plugins: {crossrefplugin: {enabled: true, settings: dep}}, registrationAgency: 'crossrefplugin',
                ...(isOJS ? {publisherInstitution: 'K1 Publisher', onlineIssn: '0378-5955'} : {})}, MA);
            const r = await app.api.createSubmission({tag: `${sc.X.path}s`, context: sc.X.path, submitter: sc.X.u.au,
                title: `K1 X ${sc.X.path}`, published: true});
            sc.X.sub = {id: r.submissionId, publicationId: r.publicationId, title: `K1 X ${sc.X.path}`};
        }
        sc.seeded = true; save();
        log(n, 'seeded', JSON.stringify(sc).slice(0, 2000));
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
        await signIn(page, user, {contextPath: ctx});
        await idle(page);
    };
    const nav = async () => page.evaluate(() => {
        const links = [...document.querySelectorAll('nav a, [role="navigation"] a, aside a')];
        return {
            names: [...new Set(links.map((a) => a.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))],
            dois: links.filter((a) => a.innerText.trim() === 'DOIs').map((a) => ({href: a.getAttribute('href'), visible: !!a.offsetParent})),
        };
    }).catch((e) => ({error: String(e.message).slice(0, 200)}));
    const openSetup = async (ctx, sideTab = 'Setup') => {
        await page.goto(ctxUrl(ctx, '/management/settings/distribution')); await idle(page);
        await page.getByRole('tab', {name: 'DOIs', exact: true}).click({timeout: 15000});
        await idle(page);
        const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
        await dois.getByRole('tab', {name: sideTab, exact: true}).click();
        await idle(page);
        const panel = dois.getByRole('tabpanel', {name: sideTab, exact: true});
        await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
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
            out.push({name: e.name, type: e.type, value: e.value, checked: e.checked, label: label && label.replace(/\s+/g, ' ').trim(),
                visible: !!(e.offsetParent || e.getClientRects().length), disabled: e.disabled,
                options: e.tagName === 'SELECT' ? [...e.options].map((o) => `${o.value}=${o.text}${o.selected ? ' [selected]' : ''}`) : undefined});
        }
        const links = [...root.querySelectorAll('a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')}));
        const errors = [...root.querySelectorAll('.pkpFieldError, [class*="FieldError"]')].map((x) => x.innerText.trim()).filter(Boolean);
        return {inputs: out, links, errors, text: root.innerText};
    });
    const saveForm = async (panel, urlRe = /\/api\/v1\/contexts\/\d+$/) => {
        const btn = panel.getByRole('button', {name: 'Save', exact: true});
        if (await btn.isDisabled()) return {saveDisabled: true, errors: (await readForm(panel)).errors};
        const w = page.waitForResponse((r) => urlRe.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await btn.click();
        const r = await w;
        const res = {status: r ? r.status() : null, body: r ? flat(await r.text().catch(() => ''), 500) : null};
        await idle(page);
        await page.waitForTimeout(400);
        const f = await readForm(panel);
        res.errors = f.errors;
        res.saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).count();
        res.footer = flat(await page.locator('.pkpFormPage__footer, .pkpFormPage__status, .pkpNotification').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 400);
        return res;
    };
    const tick = async (panel, label, v = true) => {
        const cb = panel.getByRole('checkbox', {name: label, exact: typeof label === 'string'});
        if (v) await cb.check(); else await cb.uncheck();
    };
    const openDois = async (ctx) => {
        const r = await page.goto(ctxUrl(ctx, '/dois')); await idle(page); await page.waitForTimeout(500);
        return r ? r.status() : null;
    };
    const expandAll = async () => {
        // each press renames its button ("Hide expanded details…"), so press the first closed one until none is left
        const b = page.getByRole('button', {name: /^Show more details about/});
        for (let i = 0; i < 30 && (await b.count()); i++) { await b.first().click().catch(() => {}); await page.waitForTimeout(250); }
        await page.waitForTimeout(300);
    };
    const doiInputs = async () => page.locator('main').evaluate((m) => [...m.querySelectorAll('input[type="text"], input:not([type])')]
        .map((i) => ({value: i.value, label: i.getAttribute('aria-label') || (i.labels && i.labels[0] && i.labels[0].innerText), disabled: i.disabled})));
    const selectRow = async (title) => {
        await page.getByRole('listitem').filter({hasText: title}).getByRole('checkbox').first().check();
    };
    const bulk = async (action, name) => {
        await page.getByRole('button', {name: 'Bulk Actions'}).first().click();
        await page.waitForTimeout(300);
        const b = page.getByRole('button', {name: action, exact: true});
        const offered = await b.count();
        if (!offered) { await snap(`${name}-menu`); return {offered: 0}; }
        await b.first().click();
        await page.waitForTimeout(600);
        const d = await snap(`${name}-dialog`);
        const dlg = page.getByRole('dialog').last();
        const btns = await dlg.getByRole('button').allInnerTexts().catch(() => []);
        const conf = dlg.getByRole('button', {name: action, exact: true});
        let resp = null;
        const w = page.waitForResponse((r) => /\/api\/v1\/(_)?dois/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
        if (await conf.count()) await conf.click(); else if (await dlg.getByRole('button', {name: /^(OK|Yes)$/}).count()) await dlg.getByRole('button', {name: /^(OK|Yes)$/}).first().click();
        resp = await w;
        await idle(page); await page.waitForTimeout(800);
        const after = await snap(`${name}-after`);
        return {offered, buttons: btns, dialog: flat(d.text.dialog, 600), status: resp ? resp.status() : null,
            respUrl: resp ? resp.url().replace(app.baseURL, '') : null, respBody: resp ? flat(await resp.text().catch(() => ''), 400) : null,
            afterDialog: flat(after.text.dialog, 600)};
    };
    const readerPath = (id) => (isOJS ? `/article/view/${id}` : isOMP ? `/catalog/book/${id}` : `/preprint/view/${id}`);
    const readerDoi = async (ctx, id, name) => {
        await page.goto(ctxUrl(ctx, readerPath(id))); await idle(page);
        const s = await snap(name);
        const links = await page.locator('a[href*="doi.org"]').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})));
        const line = (s.text.main || '').split('\n').filter((l) => /DOI/.test(l)).slice(0, 5);
        return {links, line};
    };

    try {
        // ---- arrive: the new context's Setup tab, side menu, DOIs page (Rule 2, Fields defaults) ----------------
        if (on('arrive') && !done('arrive')) await sect('arrive', async () => {
            const A = sc.A.path;
            await as(sc.A.u.mg, A);
            await page.goto(ctxUrl(A, '/submissions')); await idle(page);
            fact('arrive-nav-mg', await nav());
            await snap('a-01-dashboard-mg');
            const panel = await openSetup(A);
            await snap('a-02-setup-arrive');
            fact('arrive-setup', await readForm(panel));
            await loc(page, 'Setup tab: the "DOIs" box', panel.getByRole('checkbox', {name: ENABLE[n]}));
            await loc(page, 'Setup tab: DOI Prefix box', panel.getByRole('textbox', {name: 'DOI Prefix'}));
            await loc(page, 'Setup tab: Automatic DOI Assignment list', panel.getByRole('combobox', {name: 'Automatic DOI Assignment'}));
            await loc(page, 'Setup tab: DOI Format "None" radio', panel.getByRole('radio', {name: /^None/}));
            // custom pattern group shown without saving (read only)
            await panel.getByRole('radio', {name: /^Custom pattern/}).check();
            await page.waitForTimeout(300);
            fact('arrive-setup-custom-shown', await readForm(panel));
            await snap('a-03-setup-custom-unsaved');
            // untick "DOIs": every field below hidden (not saved)
            await panel.getByRole('checkbox', {name: ENABLE[n]}).uncheck();
            await page.waitForTimeout(300);
            fact('arrive-setup-unticked-unsaved', (await readForm(panel)).inputs.filter((i) => i.visible).map((i) => i.label || i.name));
            await snap('a-04-setup-unticked-unsaved');
            // DOIs page
            fact('arrive-dois-status', await openDois(A));
            const s = await snap('a-05-dois-page');
            fact('arrive-dois-text', flat(s.text.main, 1500));
            const add = page.getByRole('link', {name: 'Add DOI prefix'});
            await loc(page, 'DOIs page: the "Add DOI prefix" link', add);
            fact('arrive-add-link', {count: await add.count(), href: await add.first().getAttribute('href').catch(() => null)});
            await snap('a-05b-dois-bulk-menu', {bulk: await (async () => {
                await page.getByRole('button', {name: 'Bulk Actions'}).first().click().catch(() => {});
                await page.waitForTimeout(300);
                return page.locator('main').getByRole('button').allInnerTexts();
            })()});
            if (await add.count()) {
                await add.first().click(); await idle(page); await page.waitForTimeout(600);
                const l = await snap('a-06-add-prefix-landing');
                fact('arrive-add-landing', {url: l.url, selectedTabs: await page.getByRole('tab', {selected: true}).allInnerTexts()});
            }
            // Registration tab arrival (OMP none)
            const reg = await openSetup(A, 'Registration');
            await snap('a-07-registration-arrive');
            fact('arrive-registration', await readForm(reg));
            // Plugins grid: the agency plugins (q1)
            await page.goto(ctxUrl(A, '/management/settings/website')); await idle(page);
            await page.getByRole('tab', {name: 'Plugins', exact: true}).click(); await idle(page);
            await page.waitForTimeout(800);
            await snap('a-08-plugins-scratch');
            fact('arrive-plugins', await page.locator('tr').filter({hasText: /Crossref|DataCite/}).evaluateAll((rs) => rs.map((r) => ({
                text: r.innerText.replace(/\s+/g, ' ').trim().slice(0, 120),
                checked: [...r.querySelectorAll('input[type=checkbox]')].map((c) => c.checked)}))));
            // publicknowledge, read-only: Setup, Registration, DOIs page, Plugins
            await as('manager.maya', app.contextPath);
            const pk = await openSetup(app.contextPath);
            await snap('a-09-pk-setup');
            fact('pk-setup', (await readForm(pk)).inputs.map((i) => `${i.name}:${i.type === 'checkbox' || i.type === 'radio' ? i.checked : i.value}:${i.label}`));
            const pkr = await openSetup(app.contextPath, 'Registration');
            fact('pk-registration', (await readForm(pkr)).inputs.map((i) => ({name: i.name, value: i.value, options: i.options})));
            await snap('a-10-pk-registration');
            fact('pk-dois-status', await openDois(app.contextPath));
            await snap('a-11-pk-dois');
            await page.goto(ctxUrl(app.contextPath, '/management/settings/website')); await idle(page);
            await page.getByRole('tab', {name: 'Plugins', exact: true}).click(); await idle(page); await page.waitForTimeout(800);
            await snap('a-12-pk-plugins');
            fact('pk-plugins', await page.locator('tr').filter({hasText: /Crossref|DataCite/}).evaluateAll((rs) => rs.map((r) => ({
                text: r.innerText.replace(/\s+/g, ' ').trim().slice(0, 120),
                checked: [...r.querySelectorAll('input[type=checkbox]')].map((c) => c.checked)}))));
            markDone('arrive');
        });

        // ---- roles: side menu, DOIs page and the Setup tab per level (Actors, q2) ---------------------------------
        const roleRead = async (ctxKey, key, user, label) => {
            const ctx = sc[ctxKey].path;
            await as(user, ctx);
            const r = {user: label};
            if (user) {
                await page.goto(ctxUrl(ctx, '/submissions')); await idle(page);
                r.nav = await nav();
                r.landing = page.url();
            }
            r.doisStatus = await openDois(ctx);
            const s = await snap(`r-${ctxKey}-${key}-dois`);
            r.doisUrl = s.url; r.doisText = flat(s.text.main, 300); r.doisTitle = s.title;
            await page.goto(ctxUrl(ctx, '/management/settings/distribution')); await idle(page);
            const s2 = await snap(`r-${ctxKey}-${key}-settings`);
            r.settingsUrl = s2.url; r.settingsText = flat(s2.text.main, 300);
            r.setupTab = await page.getByRole('tab', {name: 'DOIs', exact: true}).count();
            // the tab's own address
            await page.goto(ctxUrl(ctx, '/management/settings/distribution#dois/doisSetup')); await idle(page);
            r.tabAddrUrl = page.url(); r.tabAddrText = flat(await page.locator('main').innerText().catch(() => ''), 200);
            fact(`roles-${ctxKey}-${key}`, r);
            return r;
        };
        if (on('roles') && !done('roles')) await sect('roles', async () => {
            const U = sc.A.u;
            const levels = isOPS ? [['mg', U.mg], ['se', U.se], ['eb', U.eb], ['au', U.au], ['rd', U.rd]]
                : [['mg', U.mg], ['ed', U.ed], ['pe', U.pe], ['se', U.se], ['ce', U.ce], ['rv', U.rv], ['au', U.au], ['rd', U.rd]];
            await roleRead('A', 'admin', 'admin', 'admin');
            for (const [k, u] of levels) await roleRead('A', k, u, k);
            await roleRead('A', 'out', null, 'signed out');
            if (!isOPS) {
                for (const k of ['ed', 'pe']) await roleRead('B', k, sc.B.u[k], `${k} permitSettings off`);
                // the roles tab as B's manager: the flag as the screen shows it
                await as(sc.B.u.mg, sc.B.path);
                await page.goto(ctxUrl(sc.B.path, '/management/settings/access')); await idle(page);
                await page.getByRole('tab', {name: 'Roles', exact: true}).click().catch(() => {}); await idle(page);
                await snap('r-B-roles-tab');
            }
            markDone('roles');
        });

        // ---- q10: no prefix saves, untick / re-tick, the message cleared (Rule 3, A1, Rule 1) ----------------------
        if (on('q10') && !done('q10')) await sect('q10', async () => {
            const A = sc.A.path;
            await as(sc.A.u.mg, A);
            let panel = await openSetup(A);
            const ver = panel.getByRole('radio', {name: /^Yes, assign a unique DOI/});
            const verNo = panel.getByRole('radio', {name: /^No, all versions/});
            const wasYes = await ver.isChecked();
            await (wasYes ? verNo : ver).check();
            fact('q10-versioning-save', {from: wasYes ? 'Yes' : 'No', ...(await saveForm(panel))});
            await snap('q-01-versioning-save');
            // with the prefix message shown, untick "DOIs": does the message go?
            await panel.getByRole('checkbox', {name: ENABLE[n]}).uncheck();
            await page.waitForTimeout(400);
            fact('q10-untick-after-error', (await readForm(panel)).errors);
            await snap('q-02-untick-after-error');
            fact('q10-untick-save', await saveForm(panel));
            await snap('q-03-untick-saved');
            await page.reload(); await idle(page);
            panel = await openSetup(A);
            fact('q10-untick-reload', (await readForm(panel)).inputs.filter((i) => i.visible).map((i) => `${i.label}:${i.checked}`));
            await page.goto(ctxUrl(A, '/submissions')); await idle(page);
            fact('q10-off-nav-mg', await nav());
            fact('q10-off-dois-mg', await openDois(A));
            const s = await snap('q-04-dois-off-mg');
            fact('q10-off-dois-mg-text', {url: s.url, text: flat(s.text.main, 300)});
            // re-tick and save
            panel = await openSetup(A);
            await panel.getByRole('checkbox', {name: ENABLE[n]}).check();
            await page.waitForTimeout(300);
            fact('q10-retick-form', (await readForm(panel)).inputs.filter((i) => i.visible).map((i) => `${i.label}:${i.type === 'checkbox' || i.type === 'radio' ? i.checked : i.value}`));
            fact('q10-retick-save', await saveForm(panel));
            await snap('q-05-retick-save');
            // leave the tab with an unsaved change (the box ticked, refused): side tab, top tab, another page
            await page.getByRole('tabpanel', {name: 'DOIs', exact: true}).getByRole('tab', {name: 'Registration', exact: true}).click();
            await idle(page); await page.waitForTimeout(300);
            await snap('q-06-left-to-registration');
            await page.getByRole('tabpanel', {name: 'DOIs', exact: true}).getByRole('tab', {name: 'Setup', exact: true}).click();
            await idle(page); await page.waitForTimeout(300);
            panel = page.getByRole('tabpanel', {name: 'DOIs', exact: true}).getByRole('tabpanel', {name: 'Setup', exact: true});
            fact('q10-back-to-setup', {box: await panel.getByRole('checkbox', {name: ENABLE[n]}).isChecked(), errors: (await readForm(panel)).errors});
            const tops = await page.getByRole('tablist').first().getByRole('tab').allInnerTexts();
            const other = tops.map((x) => x.trim()).find((x) => x && x !== 'DOIs');
            if (other) {
                await page.getByRole('tab', {name: other, exact: true}).first().click(); await idle(page);
                await snap('q-07-left-to-other-top-tab', {other});
                await page.getByRole('tab', {name: 'DOIs', exact: true}).click(); await idle(page);
                fact('q10-back-from-top-tab', {other, box: await panel.getByRole('checkbox', {name: ENABLE[n]}).isChecked().catch(() => null)});
            }
            const before = dialogs.length;
            await panel.getByRole('checkbox', {name: ENABLE[n]}).focus().catch(() => {});
            await page.locator('body').click({position: {x: 5, y: 5}}).catch(() => {});
            await page.goto(ctxUrl(A, '/submissions')).catch((e) => fact('q10-leave-goto-error', String(e.message).slice(0, 200)));
            await idle(page);
            fact('q10-leave-page-dialogs', dialogs.slice(before));
            panel = await openSetup(A);
            fact('q10-after-leave', (await readForm(panel)).inputs.filter((i) => i.visible).map((i) => `${i.label}:${i.checked}`));
            // Section Editor at the address while DOIs are off
            await as(sc.A.u.se, A);
            fact('q10-off-dois-se', await openDois(A));
            const s2 = await snap('q-08-dois-off-se');
            fact('q10-off-dois-se-text', {url: s2.url, text: flat(s2.text.main, 300)});
            await as(null);
            await openDois(A);
            const s3 = await snap('q-09-dois-off-out');
            fact('q10-off-dois-out', {url: s3.url});
            markDone('q10');
        });

        // ---- form: prefixes (q3), no kind, custom pattern (q4), "None" link, the Issues tab ------------------------
        if (on('form') && !done('form')) await sect('form', async () => {
            const C = sc.C.path;
            await as(sc.C.u.mg, C);
            let panel = await openSetup(C);
            const res = {};
            for (const p of ['10.123', '10.1234567', '10.12345678', '11.1234', '10.1234/', ' 10.1234 ', '10.1234']) {
                await panel.getByRole('textbox', {name: 'DOI Prefix'}).fill(p);
                res[p] = await saveForm(panel);
                res[p].body = res[p].status === 200 ? 'ok' : res[p].body;
                res[p].sameRead = await panel.getByRole('textbox', {name: 'DOI Prefix'}).inputValue();
                if (res[p].status === 200) {
                    await page.reload(); await idle(page);
                    panel = await openSetup(C);
                    res[p].reloadRead = JSON.stringify(await panel.getByRole('textbox', {name: 'DOI Prefix'}).inputValue());
                }
            }
            fact('form-q3-prefixes', res);
            await snap('f-01-prefix-valid-saved');
            await page.reload(); await idle(page);
            panel = await openSetup(C);
            fact('form-q3-prefix-reload', await panel.getByRole('textbox', {name: 'DOI Prefix'}).inputValue());
            // no kind ticked, DOIs on
            for (const k of KINDS[n]) await tick(panel, k, false);
            fact('form-nokind-save', await saveForm(panel));
            await snap('f-02-nokind-saved');
            await page.goto(ctxUrl(C, '/submissions')); await idle(page);
            fact('form-nokind-nav', await nav());
            fact('form-nokind-dois', await openDois(C));
            const s = await snap('f-03-nokind-dois');
            fact('form-nokind-dois-text', {url: s.url, text: flat(s.text.main, 300)});
            panel = await openSetup(C);
            fact('form-nokind-reload', (await readForm(panel)).inputs.filter((i) => i.type === 'checkbox').map((i) => `${i.label}:${i.checked}`));
            await tick(panel, KINDS[n][0], true);
            fact('form-kind-back', await saveForm(panel));
            // custom pattern: group, help, boxes; refusals and passes (q4)
            await panel.getByRole('radio', {name: /^Custom pattern/}).check();
            await page.waitForTimeout(300);
            fact('form-q4-group', await readForm(panel));
            await snap('f-04-custom-group');
            fact('form-q4-all-empty-first-kind', await saveForm(panel));
            await snap('f-05-custom-empty-refused');
            await panel.getByRole('textbox', {name: 'Submissions', exact: true}).fill(isOMP ? '%p.%m' : '%j.%a');
            // a second kind ticked with its box empty
            const second = isOJS ? 'Issues' : isOMP ? 'Files' : 'Preprint galleys, such as a published PDF';
            await tick(panel, second, true);
            fact('form-q4-second-empty', {kind: second, ...(await saveForm(panel))});
            await snap('f-06-custom-second-empty');
            await tick(panel, second, false);
            fact('form-q4-second-unticked-save-disabled', await panel.getByRole('button', {name: 'Save', exact: true}).isDisabled());
            await snap('f-06b-custom-second-unticked-unsaved');
            const r1 = await saveForm(panel);
            if (r1.saveDisabled) {
                // the flagged box changed (typed and emptied) re-enables Save
                const box = panel.getByRole('textbox', {name: second === 'Preprint galleys, such as a published PDF' ? 'Preprint Galleys' : second, exact: true});
                await box.fill('x'); await box.fill('');
                fact('form-q4-second-unticked-save-disabled-after-box', await panel.getByRole('button', {name: 'Save', exact: true}).isDisabled());
            }
            fact('form-q4-second-unticked-empty', {kind: second, first: r1, ...(await saveForm(panel))});
            await snap('f-07-custom-second-unticked');
            // OJS: "Peer Review" ticked under custom pattern (no box)
            if (isOJS) {
                await tick(panel, 'Peer Review', true);
                fact('form-q4-peer-custom', await saveForm(panel));
                await tick(panel, 'Peer Review', false);
                await saveForm(panel);
            }
            await page.reload(); await idle(page);
            panel = await openSetup(C);
            fact('form-q4-reload', (await readForm(panel)).inputs.filter((i) => i.visible).map((i) => `${i.label}:${i.type === 'checkbox' || i.type === 'radio' ? i.checked : i.value}`));
            // "None": the link in its label
            await panel.getByRole('radio', {name: /^None/}).check();
            await page.waitForTimeout(300);
            const noneLink = panel.getByRole('link', {name: 'DOI management page'});
            await loc(page, 'Setup tab: "DOI management page" link in the None label', noneLink);
            fact('form-none-link', {count: await noneLink.count(), href: await noneLink.first().getAttribute('href').catch(() => null),
                target: await noneLink.first().getAttribute('target').catch(() => null)});
            // back to Default, save; OJS: tick "Issues" and read the DOIs page tabs before/after
            await panel.getByRole('radio', {name: /^Default/}).check();
            if (isOJS) {
                await openDois(C);
                fact('form-issues-tabs-before', await page.getByRole('tab').allInnerTexts());
                panel = await openSetup(C);
                await panel.getByRole('radio', {name: /^Default/}).check();
                await tick(panel, 'Issues', true);
                fact('form-issues-save', await saveForm(panel));
                await openDois(C);
                fact('form-issues-tabs-after', await page.getByRole('tab').allInnerTexts());
                await snap('f-08-dois-issues-tab');
            } else {
                fact('form-default-save', await saveForm(panel));
                await openDois(C);
                fact('form-tabs', await page.getByRole('tab').allInnerTexts());
                await snap('f-08-dois-tabs');
            }
            // Automatic DOI Assignment: each option saved and read back after a reload
            panel = await openSetup(C);
            const sel = panel.getByRole('combobox', {name: 'Automatic DOI Assignment'});
            const opts = await sel.evaluate((s) => [...s.options].map((o) => o.text));
            const back = {};
            for (const o of opts) {
                await sel.selectOption({label: o});
                const r = await saveForm(panel);
                await page.reload(); await idle(page);
                panel = await openSetup(C);
                back[o] = {status: r.status, reread: await panel.getByRole('combobox', {name: 'Automatic DOI Assignment'}).evaluate((s) => s.options[s.selectedIndex]?.text)};
            }
            fact('form-creation-options', back);
            markDone('form');
        });

        // ---- q1: agency plugins, DataCite on and off (OJS) -------------------------------------------------------
        if (on('q1') && !done('q1') && isOJS) await sect('q1', async () => {
            const E = sc.E.path;
            await as(sc.E.u.mg, E);
            const grid = async (label, want) => {
                await page.goto(ctxUrl(E, '/management/settings/website')); await idle(page);
                await page.getByRole('tab', {name: 'Plugins', exact: true}).click(); await idle(page);
                const cb = page.locator('tr').filter({hasText: label}).locator('input[type=checkbox]').first();
                await cb.waitFor({timeout: T});
                const before = await cb.isChecked();
                if (before !== want) {
                    await cb.click();
                    await page.waitForTimeout(600);
                    const dlg = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible');
                    let dtext = null;
                    if (await dlg.count()) {
                        dtext = flat(await dlg.last().innerText(), 300);
                        await snap(`q1-grid-${want ? 'on' : 'off'}-confirm`);
                        await dlg.last().getByRole('button', {name: /^(OK|Yes|Disable|Confirm)$/}).first().click().catch(() => {});
                    }
                    await idle(page); await page.waitForTimeout(800);
                    return {before, after: await cb.isChecked(), dialog: dtext, notices: flat(await page.locator('.pkp_notification, [role="alert"], .pkpNotification').allInnerTexts().then((a) => a.join(' | ')), 300)};
                }
                return {before, after: before};
            };
            if (!sc.q1on) {
            let reg = await openSetup(E, 'Registration');
            fact('q1-reg-before', (await readForm(reg)).inputs.filter((i) => i.options).map((i) => i.options));
            fact('q1-datacite-on', await grid('DataCite Manager Plugin', true));
            reg = await openSetup(E, 'Registration');
            const agency = reg.getByRole('combobox', {name: 'Registration Agency'});
            fact('q1-reg-with-datacite', await agency.evaluate((s) => [...s.options].map((o) => o.text)));
            await agency.selectOption({label: 'DataCite'});
            await page.waitForTimeout(500);
            fact('q1-datacite-block', await readForm(reg));
            await snap('q1-01-datacite-chosen');
            fact('q1-datacite-save', await saveForm(reg, /registrationAgency/));
            await snap('q1-02-datacite-saved');
            const setupAfter = await openSetup(E);
            fact('q1-setup-after-datacite', (await readForm(setupAfter)).inputs.filter((i) => i.type === 'checkbox').map((i) => `${i.label}:${i.checked}`));
            fact('q1-datacite-off', await grid('DataCite Manager Plugin', false));
            sc.q1on = true; save();
            }
            const reg = await openSetup(E, 'Registration');
            const offRead = await readForm(reg);
            fact('q1-reg-after-off', {inputs: offRead.inputs.map((i) => ({name: i.name, value: i.value, options: i.options})), text: flat(offRead.text, 400)});
            await snap('q1-03-reg-after-off');
            // with another agency plugin on, the list shows again: which value is selected
            fact('q1-crossref-on', await grid('Crossref Manager Plugin', true));
            const reg2 = await openSetup(E, 'Registration');
            const r2 = await readForm(reg2);
            fact('q1-reg-after-crossref-on', {inputs: r2.inputs.map((i) => ({name: i.name, value: i.value, options: i.options})), text: flat(r2.text, 400)});
            await snap('q1-04-reg-crossref-on');
            markDone('q1');
        });

        // ---- rule4: untick the second kind, mark registered, tick again (q11); OMP files --------------------------
        if (on('rule4') && !done('rule4')) await sect('rule4', async () => {
            const G = sc.G.path;
            await as(sc.G.u.mg, G);
            const title = `K1 G ${G}`;
            await openDois(G);
            await expandAll();
            const s0 = await snap('g-01-dois-both-kinds');
            fact('g-before', {text: flat(s0.text.main, 1500), inputs: await doiInputs()});
            let panel = await openSetup(G);
            const second = isOJS ? 'Article galleys, such as a published PDF' : isOMP ? 'Files' : 'Preprint galleys, such as a published PDF';
            await tick(panel, second, false);
            fact('g-untick-save', await saveForm(panel));
            await openDois(G);
            await expandAll();
            const s1 = await snap('g-02-dois-unticked');
            fact('g-unticked', {text: flat(s1.text.main, 1500), inputs: await doiInputs()});
            await selectRow(title);
            fact('g-mark-registered', await bulk('Mark DOIs Registered', 'g-03-mark'));
            await page.reload(); await idle(page); await expandAll();
            const s2 = await snap('g-04-after-mark-reload');
            fact('g-after-mark', {text: flat(s2.text.main, 1500)});
            panel = await openSetup(G);
            await tick(panel, second, true);
            fact('g-retick-save', await saveForm(panel));
            await openDois(G);
            await expandAll();
            const s3 = await snap('g-05-dois-reticked');
            fact('g-reticked', {text: flat(s3.text.main, 1500), inputs: await doiInputs()});
            // the reader page still shows what the item has
            await as(null);
            fact('g-reader', await readerDoi(G, sc.G.sub.id, 'g-06-reader'));
            markDone('rule4');
        });

        // ---- shape: Default via Assign, None via Assign and via publish, custom patterns (Rule 6, q13, q14, A2) -----
        if (on('shape') && !done('shape')) await sect('shape', async () => {
            const assignAll = async (k, name) => {
                await as(sc[k].u.mg, sc[k].path);
                await openDois(sc[k].path);
                for (const s of sc[k].subs) await selectRow(s.title);
                const r = await bulk('Assign DOIs', name);
                await page.reload(); await idle(page); await expandAll();
                const s = await snap(`${name}-reload`);
                return {...r, text: flat(s.text.main, 1200), inputs: await doiInputs()};
            };
            fact('shape-default-assign', await assignAll('D', 's-01-default'));
            fact('shape-none-assign', await assignAll('N', 's-02-none'));
            // N2: made at publish (seeded) under "None"
            await as(sc.N2.u.mg, sc.N2.path);
            await openDois(sc.N2.path); await expandAll();
            const s = await snap('s-03-none-publish');
            fact('shape-none-publish', {text: flat(s.text.main, 800), inputs: await doiInputs()});
            await as(null);
            fact('shape-none-reader', await readerDoi(sc.N2.path, sc.N2.subs[0].id, 's-04-none-reader'));
            fact('shape-default-reader', await readerDoi(sc.D.path, sc.D.subs[0].id, 's-05-default-reader'));
            // custom patterns
            const P = sc.P.path;
            await as(sc.P.u.mg, P);
            await openDois(P);
            await selectRow(sc.P.sub.title);
            fact('shape-custom-assign-1', await bulk('Assign DOIs', 's-06-custom'));
            await page.reload(); await idle(page); await expandAll();
            fact('shape-custom-after-1', {text: flat((await snap('s-07-custom-reload')).text.main, 800), inputs: await doiInputs()});
            if (isOJS) {
                // assign the article to Vol 1 No 2 on the workflow's Issue form, then Assign again
                const wf = ctxUrl(P, `/dashboard/editorial?workflowSubmissionId=${sc.P.sub.id}&workflowMenuKey=publication_${sc.P.sub.publicationId}_issue`);
                await page.goto(wf); await idle(page); await page.waitForTimeout(1500);
                await snap('s-08-issue-form');
                const dlg = page.getByRole('dialog').first();
                const issueSel = dlg.locator('select[name="issueId"]');
                let issueRes = null;
                if (await issueSel.count()) {
                    const opts = await issueSel.evaluate((s) => [...s.options].map((o) => `${o.value}=${o.text}`));
                    const v = opts.find((o) => /Vol\.? 1 No\.? 2/.test(o));
                    if (v) await issueSel.selectOption(v.split('=')[0]);
                    const w = page.waitForResponse((r) => /publications\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
                    await dlg.getByRole('button', {name: 'Save', exact: true}).first().click().catch(() => {});
                    const r = await w;
                    issueRes = {opts, status: r ? r.status() : null};
                    await idle(page);
                } else issueRes = {noSelect: true};
                await snap('s-09-issue-saved');
                fact('shape-custom-issue', issueRes);
                await openDois(P);
                await selectRow(sc.P.sub.title);
                fact('shape-custom-assign-2', await bulk('Assign DOIs', 's-10-custom2'));
                await page.reload(); await idle(page); await expandAll();
                fact('shape-custom-after-2', {text: flat((await snap('s-11-custom2-reload')).text.main, 800), inputs: await doiInputs()});
                // %j.%p on an article without pages
                await as(sc.P2.u.mg, sc.P2.path);
                await openDois(sc.P2.path);
                await selectRow(sc.P2.sub.title);
                fact('shape-custom-pages-assign', await bulk('Assign DOIs', 's-12-pages'));
                await page.reload(); await idle(page); await expandAll();
                fact('shape-custom-pages-after', {text: flat((await snap('s-13-pages-reload')).text.main, 800), inputs: await doiInputs()});
            }
            // the Setup tab's help as each app shows it under "Custom pattern" (read only, context P)
            await as(sc.P.u.mg, P);
            const panel = await openSetup(P);
            fact('shape-custom-help', flat((await readForm(panel)).text, 2500));
            await snap('s-14-custom-setup');
            markDone('shape');
        });

        // ---- peer: a public completed review's DOI under Custom pattern and Default (OJS; A2) ---------------------
        if (on('peer') && !done('peer') && isOJS) await sect('peer', async () => {
            for (const k of ['R', 'R2']) {
                await as(sc[k].u.mg, sc[k].path);
                await openDois(sc[k].path);
                await expandAll();
                const s = await snap(`p-${k}-01-dois`);
                fact(`peer-${k}-dois`, {text: flat(s.text.main, 1200), inputs: await doiInputs()});
                // the review round as the editor sees it
                const wf = ctxUrl(sc[k].path, `/dashboard/editorial?workflowSubmissionId=${sc[k].sub.id}&workflowMenuKey=workflow_3`);
                await page.goto(wf); await idle(page); await page.waitForTimeout(1500);
                const w = await snap(`p-${k}-02-review-stage`);
                fact(`peer-${k}-review-stage`, flat(w.text.dialog, 1500));
            }
            markDone('peer');
        });

        // ---- shape2 (OJS): the issue-symbol pattern once the article is in an issue; "%p" with and without pages -----
        if (on('shape2') && !done('shape2') && isOJS) await sect('shape2', async () => {
            const wfPage = async (ctx, sub, key) => {
                await page.goto(ctxUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${sub.id}&workflowMenuKey=publication_${sub.publicationId}_${key}`));
                await idle(page); await page.waitForTimeout(1500); await idle(page);
                return page.getByRole('dialog').first();
            };
            const saveDlg = async (dlg) => {
                const w = page.waitForResponse((r) => /publications\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
                await dlg.getByRole('button', {name: 'Save', exact: true}).first().click();
                const r = await w;
                await idle(page); await page.waitForTimeout(600);
                return {status: r ? r.status() : null, body: r && r.status() >= 400 ? flat(await r.text().catch(() => ''), 300) : null};
            };
            const P = sc.P.path;
            await as(sc.P.u.mg, P);
            let dlg = await wfPage(P, sc.P.sub, 'issue');
            await dlg.getByRole('radio', {name: 'Assign To Future Issue and Schedule Only'}).check();
            await page.waitForTimeout(800);
            const sels = await dlg.locator('select').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => ({name: e.name, id: e.id, options: [...e.options].map((o) => ({v: o.value, t: o.textContent.trim()}))})));
            const issueSel = sels.find((x) => x.options.some((o) => /Vol\.? 1 No\.? 2/.test(o.t)));
            if (issueSel) await dlg.locator(issueSel.id ? `[id="${issueSel.id}"]` : `select[name="${issueSel.name}"]`).selectOption(issueSel.options.find((o) => /Vol\.? 1 No\.? 2/.test(o.t)).v);
            await snap('s2-01-issue-chosen');
            const res = await saveDlg(dlg);
            await snap('s2-02-issue-saved');
            fact('shape2-issue', {options: issueSel ? issueSel.options.map((o) => o.t) : sels, ...res});
            await openDois(P);
            await selectRow(sc.P.sub.title);
            fact('shape2-custom-assign', await bulk('Assign DOIs', 's2-03-custom'));
            await page.reload(); await idle(page); await expandAll();
            fact('shape2-custom-after', {text: flat((await snap('s2-04-custom-reload')).text.main, 800), inputs: await doiInputs()});
            // "%j.%p" with pages typed on an unpublished article
            const P2 = sc.P2.path;
            if (!sc.P2.sub2) {
                const r = await app.api.createSubmission({tag: `${P2}t`, context: P2, submitter: sc.P2.u.au, title: `K1 P2 pages ${P2}`, decisions: ['skipExternalReview']});
                sc.P2.sub2 = {id: r.submissionId, publicationId: r.publicationId, title: `K1 P2 pages ${P2}`}; save();
            }
            await as(sc.P2.u.mg, P2);
            dlg = await wfPage(P2, sc.P2.sub2, 'issue');
            await dlg.getByRole('textbox', {name: 'Pages'}).fill('12-34');
            fact('shape2-pages-save', await saveDlg(dlg));
            await openDois(P2);
            await selectRow(sc.P2.sub2.title);
            fact('shape2-pages-assign', await bulk('Assign DOIs', 's2-05-pages'));
            await page.reload(); await idle(page); await expandAll();
            fact('shape2-pages-after', {text: flat((await snap('s2-06-pages-reload')).text.main, 1200), inputs: await doiInputs()});
            markDone('shape2');
        });

        // ---- peer2 (OJS): a completed public review, "Mark as Complete", "Assign DOIs"; Custom pattern (R) and Default (R2)
        if (on('peer2') && !done('peer2') && isOJS) await sect('peer2', async () => {
            for (const k of ['R', 'R2']) {
                const R = sc[k];
                if (!R.sub2) {
                    const r = await app.api.createSubmission({tag: `${R.path}t`, context: R.path, submitter: R.u.au, title: `K1 ${k} review ${R.path}`,
                        decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: R.u.rv, status: 'completed'}]}]});
                    R.sub2 = {id: r.submissionId, publicationId: r.publicationId, title: `K1 ${k} review ${R.path}`}; save();
                }
                await as(R.u.mg, R.path);
                await page.goto(ctxUrl(R.path, `/dashboard/editorial?workflowSubmissionId=${R.sub2.id}`)); await idle(page); await page.waitForTimeout(1500);
                await snap(`p2-${k}-01-review`);
                await page.getByRole('button', {name: 'Read Review'}).click(); await idle(page); await page.waitForTimeout(1200);
                const rd = await snap(`p2-${k}-02-read-review`);
                fact(`peer2-${k}-read`, flat(rd.text.dialog, 1500));
                // the DOIs page while the submission is in review
                await openDois(R.path); await expandAll();
                fact(`peer2-${k}-in-review`, {listed: await page.getByRole('listitem').filter({hasText: R.sub2.title}).count(), text: flat((await snap(`p2-${k}-03-dois-in-review`)).text.main, 900)});
                // "Mark as Complete"
                await page.goto(ctxUrl(R.path, `/dashboard/editorial?workflowSubmissionId=${R.sub2.id}`)); await idle(page); await page.waitForTimeout(1500);
                await page.getByRole('button', {name: 'Read Review'}).click(); await idle(page); await page.waitForTimeout(1200);
                const w = page.waitForResponse((r) => r.request().method() !== 'GET' && /review|\$\$\$call\$\$\$/.test(r.url()), {timeout: 15000}).catch(() => null);
                await page.getByRole('button', {name: 'Mark as Complete'}).last().click();
                await page.waitForTimeout(800);
                const conf = page.getByRole('dialog').filter({hasText: 'Mark this review as complete?'});
                fact(`peer2-${k}-complete-confirm`, flat(await conf.innerText().catch(() => null), 400));
                if (await conf.count()) await conf.getByRole('button', {name: 'Mark as Complete'}).click();
                const r = await w;
                await idle(page); await page.waitForTimeout(1000);
                fact(`peer2-${k}-complete`, {status: r ? r.status() : null, url: r ? r.url().replace(app.baseURL, '') : null});
                await snap(`p2-${k}-04-completed`);
                // "Accept Submission" › "Record Decision": the move to Copyediting is the automatic moment
                await page.goto(ctxUrl(R.path, `/dashboard/editorial?workflowSubmissionId=${R.sub2.id}`)); await idle(page); await page.waitForTimeout(1500);
                await page.getByRole('button', {name: 'Accept Submission', exact: true}).last().click();
                await page.waitForURL(/decision/, {timeout: 30000}).catch(() => {});
                await idle(page);
                await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                const cont = page.getByRole('button', {name: 'Continue', exact: true});
                const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
                for (let i = 0; i < 5 && !(await rec.isVisible().catch(() => false)); i++) {
                    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                    await page.waitForTimeout(1500);
                    await cont.click().catch(() => {}); await idle(page);
                }
                const wr = page.waitForResponse((x) => /decisions/.test(x.url()) && x.request().method() === 'POST', {timeout: 30000}).catch(() => null);
                await rec.click();
                const rr = await wr;
                await page.waitForTimeout(3000); await idle(page);
                fact(`peer2-${k}-decision-post`, {status: rr ? rr.status() : null, body: rr && rr.status() >= 400 ? flat(await rr.text().catch(() => ''), 400) : null});
                fact(`peer2-${k}-accepted`, flat((await snap(`p2-${k}-05-accepted`)).text.dialog || (await screen(page)).text.main, 300));
                await openDois(R.path); await expandAll();
                fact(`peer2-${k}-after-accept`, {text: flat((await snap(`p2-${k}-06-dois-accepted`)).text.main, 1500), inputs: await doiInputs()});
                if (await page.getByRole('listitem').filter({hasText: R.sub2.title}).count()) {
                    await selectRow(R.sub2.title);
                    fact(`peer2-${k}-assign`, await bulk('Assign DOIs', `p2-${k}-07-assign`));
                    await page.reload(); await idle(page); await expandAll();
                    fact(`peer2-${k}-after-assign`, {text: flat((await snap(`p2-${k}-08-dois-assigned`)).text.main, 1500), inputs: await doiInputs()});
                }
            }
            markDone('peer2');
        });

        // ---- extra: the pattern group with "DOIs" off (saved); a DOI typed by hand without a prefix (Rule 2) -----------
        if (on('extra') && !done('extra')) await sect('extra', async () => {
            const C = sc.C.path;
            await as(sc.C.u.mg, C);
            let panel = await openSetup(C);
            await panel.getByRole('radio', {name: /^Custom pattern/}).check();
            await panel.getByRole('textbox', {name: 'Submissions', exact: true}).fill(isOMP ? '%p.%m' : '%j.%a');
            for (const k of KINDS[n].slice(1)) await tick(panel, k, false);
            fact('extra-custom-save', await saveForm(panel));
            await panel.getByRole('checkbox', {name: ENABLE[n]}).uncheck();
            fact('extra-custom-off-save', await saveForm(panel));
            await page.reload(); await idle(page);
            panel = await openSetup(C);
            const f = await readForm(panel);
            fact('extra-custom-off-reload', {visible: f.inputs.filter((i) => i.visible).map((i) => `${i.name}:${i.label}:${i.type === 'checkbox' || i.type === 'radio' ? i.checked : i.value}`), text: flat(f.text, 600)});
            await snap('e-01-custom-off-reload');
            // back on (prefix kept) and Default
            await panel.getByRole('checkbox', {name: ENABLE[n]}).check();
            await panel.getByRole('radio', {name: /^Default/}).check();
            fact('extra-back-on', await saveForm(panel));
            // Z: no prefix, one published item: no DOI made, no "Assign DOIs", a DOI typed by hand
            if (!sc.Z) {
                const t = tag('u45k1z');
                await app.api.createContext({tag: t, context: {acronym: 'JPK'}, users: [{username: `${t}mg`, roles: ['manager']}, {username: `${t}au`, roles: ['author']}]});
                const r = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, title: `K1 Z ${t}`, published: true});
                sc.Z = {path: t, u: {mg: `${t}mg`, au: `${t}au`}, sub: {id: r.submissionId, title: `K1 Z ${t}`}}; save();
            }
            const Z = sc.Z.path;
            await as(sc.Z.u.mg, Z);
            await openDois(Z); await expandAll();
            const z0 = await snap('e-02-noprefix-dois');
            await page.getByRole('button', {name: 'Bulk Actions'}).first().click().catch(() => {});
            await page.waitForTimeout(300);
            fact('extra-noprefix-dois', {text: flat(z0.text.main, 900), inputs: await doiInputs(), bulk: await page.locator('main').getByRole('button').allInnerTexts()});
            await snap('e-03-noprefix-bulk');
            await page.reload(); await idle(page); await expandAll();
            markDone('extra');
        });

        // ---- typed: a DOI typed by hand on a context without a prefix (Rule 2's last sentence) ----------------------
        if (on('typed') && !done('typed')) await sect('typed', async () => {
            const Z = sc.Z.path;
            const kind = isOJS ? 'Article' : isOMP ? 'Monograph' : 'Preprint';
            await as(sc.Z.u.mg, Z);
            await openDois(Z); await expandAll();
            const box = page.getByRole('textbox', {name: kind, exact: true});
            await loc(page, `DOIs page: the ${kind} DOI box of an expanded row`, box);
            const before = {editable: await box.isEditable().catch(() => null)};
            await page.getByRole('button', {name: 'Edit', exact: true}).first().click();
            await page.waitForTimeout(400);
            before.afterEdit = await box.isEditable().catch(() => null);
            before.buttons = await page.locator('main').getByRole('button').allInnerTexts();
            const value = `10.5555/k1${Z.slice(-6)}`;
            await box.fill(value);
            await snap('t-01-noprefix-typed');
            const w = page.waitForResponse((r) => /\/dois/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
            await page.getByRole('button', {name: 'Save', exact: true}).first().click();
            const r = await w;
            await idle(page); await page.waitForTimeout(800);
            const z1 = await snap('t-02-noprefix-saved');
            fact('typed-noprefix', {...before, value, status: r ? r.status() : null, url: r ? r.url().replace(app.baseURL, '') : null,
                body: r && r.status() >= 400 ? flat(await r.text().catch(() => ''), 300) : null, dialog: flat(z1.text.dialog, 300), same: await doiInputs(), text: flat(z1.text.main, 600)});
            await page.reload(); await idle(page); await expandAll();
            fact('typed-noprefix-reload', {text: flat((await snap('t-03-noprefix-reload')).text.main, 900), inputs: await doiInputs()});
            await as(null);
            fact('typed-noprefix-reader', await readerDoi(Z, sc.Z.sub.id, 't-04-noprefix-reader'));
            markDone('typed');
        });

        // ---- last: both "None" rows, DOIs off for every level, DOIs kept when switched off, the Issues tab's rows, a deposit
        if (on('last') && !done('last')) await sect('last', async () => {
            await as(sc.N.u.mg, sc.N.path);
            await openDois(sc.N.path); await expandAll();
            fact('last-none-rows', {text: flat((await snap('l-01-none-rows')).text.main, 1200), inputs: await doiInputs()});
            // A has DOIs off (q10): the other levels at the address
            const U = sc.A.u;
            for (const k of (isOPS ? ['eb', 'au', 'rd'] : ['ed', 'ce', 'rv', 'au', 'rd'])) {
                await as(U[k], sc.A.path);
                await openDois(sc.A.path);
                const s0 = await snap(`l-02-off-${k}`);
                fact(`last-off-${k}`, {url: s0.url, text: flat(s0.text.main, 200).slice(-90)});
            }
            await as('admin', sc.A.path);
            await openDois(sc.A.path);
            fact('last-off-admin', {url: page.url(), text: flat((await snap('l-02-off-admin')).text.main, 200).slice(-90)});
            // D: switch DOIs off, the reader page, the DOIs page; then on again
            const D = sc.D.path;
            await as(sc.D.u.mg, D);
            let panel = await openSetup(D);
            await panel.getByRole('checkbox', {name: ENABLE[n]}).uncheck();
            fact('last-D-off-save', await saveForm(panel));
            await as(null);
            fact('last-D-off-reader', await readerDoi(D, sc.D.subs[0].id, 'l-03-D-off-reader'));
            await as(sc.D.u.mg, D);
            panel = await openSetup(D);
            await panel.getByRole('checkbox', {name: ENABLE[n]}).check();
            fact('last-D-on-save', await saveForm(panel));
            await openDois(D); await expandAll();
            fact('last-D-on-dois', {inputs: await doiInputs()});
            if (isOJS) {
                if (!sc.I) {
                    const t = tag('u45k1i');
                    await app.api.createContext({tag: t, context: {acronym: 'JPK'}, doiPrefix: '10.1234', enabledDoiTypes: ['publication', 'issue'],
                        issues: [{volume: 1, number: 1, year: 2020, published: true}, {volume: 1, number: 2, year: 2021}],
                        users: [{username: `${t}mg`, roles: ['manager']}]});
                    sc.I = {path: t, u: {mg: `${t}mg`}}; save();
                }
                await as(sc.I.u.mg, sc.I.path);
                await openDois(sc.I.path);
                fact('last-I-tabs', await page.getByRole('tab').allInnerTexts());
                await page.getByRole('tab', {name: 'Issues', exact: true}).click(); await idle(page); await page.waitForTimeout(600);
                await expandAll();
                fact('last-I-issues', {text: flat((await snap('l-04-issues-tab')).text.main, 1200), inputs: await doiInputs()});
            }
            if (!isOMP) {
                // X: the item's own "Deposit DOI(s)"
                await as(sc.X.u.mg, sc.X.path);
                await openDois(sc.X.path); await expandAll();
                const dep = page.getByRole('button', {name: 'Deposit DOI(s)'}).first();
                const has = await dep.count();
                let res = {has};
                if (has) {
                    await dep.click(); await page.waitForTimeout(600);
                    const d = await snap('l-05-deposit-dialog');
                    res.dialog = flat(d.text.dialog, 400);
                    const w = page.waitForResponse((r) => /dois/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
                    const dlg = page.getByRole('dialog').last();
                    const b = dlg.getByRole('button', {name: /^Deposit/});
                    if (await b.count()) await b.last().click();
                    const r = await w;
                    res.status = r ? r.status() : null; res.url = r ? r.url().replace(app.baseURL, '') : null;
                    res.body = r ? flat(await r.text().catch(() => ''), 300) : null;
                    await page.waitForTimeout(1500);
                    res.same = flat((await snap('l-06-deposit-same')).text.main, 900);
                    await page.waitForTimeout(5000);
                    await page.reload(); await idle(page); await expandAll();
                    res.reload = flat((await snap('l-07-deposit-reload')).text.main, 900);
                }
                fact('last-X-deposit', res);
            }
            markDone('last');
        });

        // ---- controls (read-only): the site administrator on publicknowledge; "Bulk Actions" with a prefix and no agency (D)
        if (on('controls')) await sect('controls', async () => {
            await as('admin', app.contextPath);
            await page.goto(ctxUrl(app.contextPath, '/submissions')); await idle(page);
            const navA = await nav();
            await openDois(app.contextPath);
            const s = await snap('c-01-pk-admin-dois');
            fact('controls-pk-admin', {navDois: navA.dois, url: s.url, title: s.title});
            await as(sc.D.u.mg, sc.D.path);
            await openDois(sc.D.path);
            await page.getByRole('button', {name: 'Bulk Actions'}).first().click(); await page.waitForTimeout(400);
            await snap('c-02-D-bulk-noagency');
            fact('controls-D-bulk', await page.locator('main').getByRole('button').allInnerTexts());
            if (sc.X && !isOMP) {
                // X after its deposit (phase last): the row's status and its agency panel, read again later
                await as(sc.X.u.mg, sc.X.path);
                await openDois(sc.X.path); await expandAll();
                fact('controls-X-after-deposit', flat((await snap('c-03-X-after-deposit')).text.main, 900));
            }
        });

        // ---- hidden (Z, no prefix): a refused "DOI Versioning" change, then "DOIs" unticked and saved, then ticked again
        if (on('hidden') && !done('hidden')) await sect('hidden', async () => {
            const Z = sc.Z.path;
            await as(sc.Z.u.mg, Z);
            let panel = await openSetup(Z);
            const yes = panel.getByRole('radio', {name: /^Yes, assign a unique DOI/});
            const no = panel.getByRole('radio', {name: /^No, all versions/});
            const wasYes = await yes.isChecked();
            await (wasYes ? no : yes).check();
            await panel.getByRole('combobox', {name: 'Automatic DOI Assignment'}).selectOption({label: 'Never'});
            const r1 = await saveForm(panel);
            await panel.getByRole('checkbox', {name: ENABLE[n]}).uncheck();
            const r2 = await saveForm(panel);
            await page.reload(); await idle(page);
            panel = await openSetup(Z);
            await panel.getByRole('checkbox', {name: ENABLE[n]}).check();
            await page.waitForTimeout(300);
            const read = {versioningYes: await panel.getByRole('radio', {name: /^Yes, assign a unique DOI/}).isChecked(),
                creation: await panel.getByRole('combobox', {name: 'Automatic DOI Assignment'}).evaluate((x) => x.options[x.selectedIndex]?.text)};
            await snap('h-01-retick-read');
            fact('hidden-Z', {wasYes, refused: {status: r1.status, errors: r1.errors}, offSave: r2.status, afterReloadReticked: read});
            // leave it as it was stored: DOIs off (the untick was saved); nothing more saved
            markDone('hidden');
        });

        // ---- crossmark: Actors rows "See an item's DOI" and "See the Crossmark button" -----------------------------
        if (on('crossmark') && !done('crossmark') && !isOMP) await sect('crossmark', async () => {
            const X = sc.X.path;
            await as(sc.X.u.mg, X);
            await openDois(X); await expandAll();
            const s = await snap('x-01-dois');
            fact('x-dois', {text: flat(s.text.main, 800), bulk: await (async () => {
                await page.getByRole('button', {name: 'Bulk Actions'}).first().click().catch(() => {});
                await page.waitForTimeout(300);
                return page.locator('main').getByRole('button').allInnerTexts();
            })()});
            await snap('x-02-dois-bulk');
            await as(null);
            const r = await readerDoi(X, sc.X.sub.id, 'x-03-reader-out');
            r.crossmark = await page.locator('.item.crossmark').count();
            r.crossmarkLink = await page.locator('.item.crossmark a').evaluateAll((as) => as.map((a) => ({href: a.getAttribute('href'), data: a.getAttribute('data-target')})));
            fact('x-reader-out', r);
            await as(sc.X.u.au, X);
            const r2 = await readerDoi(X, sc.X.sub.id, 'x-04-reader-author');
            r2.crossmark = await page.locator('.item.crossmark').count();
            fact('x-reader-author', r2);
            // reader view of A-level visitors on the default-format context (another journal)
            await as(null);
            fact('x-reader-G', await readerDoi(sc.G.path, sc.G.sub.id, 'x-05-reader-G'));
            markDone('crossmark');
        });
    } finally {
        record('dialogs', dialogs);
        await close();
    }
});
