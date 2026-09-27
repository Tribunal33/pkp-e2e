// U71 claim check, chunk K1: getting into the Internal Review stage, who sees it, the rounds.
// Spec: docs/specs/U71-internal-review-stage.md lines 10–91 (Purpose with the OJS/OPS absence
// paragraph, Actors & permissions, Rules 1–2), footnotes a, p, b, c, d, e, f, g, r1, r2, td-pool.
//
// OMP: context A (install review defaults: double-anonymous, suggestions off) with one account per
// role of the press registry, and
//   S0   queued at Submission, se1 assigned                    → "Send to Internal Review" on screen (Rule 1), the wizard left unsaved
//   S0r  queued at Submission, serec recommend-only + se1       → the recommending editor's "Send to Internal Review" records a decision
//   S1   Internal Review Round 1: ri1 completed, ri2 invited; se1, fc, pe, ce, ve, tr assigned → the by-role reads, the Assign roles,
//        the file panels (fc uploads a revision), the author's view, the pool (er1 external-only, ri3 internal-only)
//   S2   internal Round 2 (newInternalReviewRound)             → Rule 2 N=2, a past round
//   S3   two internal rounds, then External Review             → external "Review Round 1", internal rounds off the active stage
//   S4   skipInternalReview ("Send to External Review")         → Internal Review not initiated
//   S5   skipExternalReview ("Accept and Skip Review")          → Internal Review not initiated
//   S6   declined on Internal Review                           → "Delete" by level
//   S7   revisions requested on Internal Review                → the author's "Upload revisions" (both ends with S1)
//   S8   internal round, serec recommend-only + se1 deciding    → the four recommend buttons, the "Recommendation" box before/after
//   S9   internal round, serec recommend-only alone             → recommending with no deciding editor
// context B (review open, reviewer suggestions on):
//   B1   internal round: ri1 completed, ri2 accepted (open); a suggestion carrying er1's address → author reads, the pool with suggestions
// OJS / OPS: a scratch context with a queued submission (OJS also one in review) → the absence controls.
//
//   PROBE_FEATURE=U71 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U71/K1/k1.js
//   PHASES=seed,access,assign,send,rounds,author,files,rec,delete,pool,extra,absence   (default all; later phases reuse k1-state-<app>.json)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const PDF = path.join(REPO, 'apps/omp/playwright/fixtures/files/article.pdf');
const ALL = ['seed', 'access', 'assign', 'send', 'rounds', 'author', 'files', 'rec', 'delete', 'pool', 'extra', 'absence'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log(...a);
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));
const stateFile = (app) => path.join(outDir(), `k1-state-${app.name}.json`);

async function sect(name, fn) {
    try { await fn(); } catch (e) { log(`[${name} FAILED]`, String(e.stack || e).split('\n').slice(0, 4).join(' | ')); record(`${name.replace(/[^a-z0-9]+/gi, '-')}-FAILED`, {error: String(e.stack || e).slice(0, 1200)}); }
}
async function snap(page, name, extra) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
    if (extra) Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}
const visDialogs = (page) => page.locator('[role="dialog"]:visible');
const topWin = (page) => visDialogs(page).last();
const menuItems = (page) => page.locator('[role="menuitem"]:visible').evaluateAll((els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))).catch(() => []);
const dialogTexts = (page) => visDialogs(page).evaluateAll((els) =>
    els.map((d) => ({
        name: d.getAttribute('aria-label') || (d.getAttribute('aria-labelledby') && document.getElementById(d.getAttribute('aria-labelledby'))?.innerText) || null,
        text: d.innerText.slice(0, 5000),
        buttons: [...d.querySelectorAll('button, a[role=button], a.pkp_button, input[type=submit]')].filter((b) => b.getClientRects().length).map((b) => (b.getAttribute('aria-label') || b.innerText || b.value || '').trim()).filter(Boolean).slice(0, 60),
        headings: [...d.querySelectorAll('h1,h2,h3,h4')].filter((h) => h.getClientRects().length).map((h) => h.innerText.trim()).filter(Boolean).slice(0, 30),
    }))).catch(() => []);

// The workflow dialog as data: the side menu (every entry, open or folded), the bubble, the heading, the
// action buttons, the secondary column, the primary panels (tables with their names, columns, rows and the
// buttons around them), the status box and every box with a heading.
const wfInfo = (page) => page.evaluate(() => {
    const vis = (e) => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const dlgs = [...document.querySelectorAll('[role=dialog]')].filter(vis);
    const root = dlgs[0] || document.body;
    const nav = root.querySelector('nav');
    const navItems = nav ? [...nav.querySelectorAll('a, button, [role=treeitem], [role=menuitem], li > div, li > span')].map((e) => ({text: f(e.innerText || e.textContent).slice(0, 80), visible: vis(e), current: e.getAttribute('aria-current') || null, expanded: e.getAttribute('aria-expanded')})).filter((x) => x.text) : [];
    const navText = nav ? f(nav.innerText) : null;
    const navAll = nav ? f(nav.textContent) : null;
    const h2 = [...root.querySelectorAll('h2')].filter(vis).map((h) => f(h.innerText));
    const bubble = [...root.querySelectorAll('span[class*="bg-stage-"]')].filter((e) => e.getAttribute('aria-hidden') === 'true').map((e) => f(e.parentElement.innerText)).filter(Boolean);
    const sec = (q) => { const el = root.querySelector(q); return el ? {text: f(el.innerText).slice(0, 2500), buttons: [...el.querySelectorAll('button, a')].filter(vis).map((b) => f(b.innerText || b.getAttribute('aria-label'))).filter(Boolean)} : null; };
    const tables = [...root.querySelectorAll('table')].filter(vis).map((t) => {
        const name = t.getAttribute('aria-label') || (t.getAttribute('aria-labelledby') && document.getElementById(t.getAttribute('aria-labelledby'))?.innerText.trim()) || (t.querySelector('caption') || {}).innerText?.trim() || null;
        let c = t.parentElement; for (let i = 0; i < 4 && c && c.parentElement && !c.querySelector('h2,h3,h4'); i++) c = c.parentElement;
        return {
            name,
            columns: [...t.querySelectorAll('thead th')].map((th) => f(th.innerText)),
            rows: [...t.querySelectorAll('tbody tr')].map((tr) => f(tr.innerText).slice(0, 240)),
            rowButtons: [...t.querySelectorAll('tbody tr button, tbody tr a')].filter(vis).map((b) => f(b.getAttribute('aria-label') || b.innerText)).filter(Boolean).slice(0, 30),
            aroundButtons: c ? [...c.querySelectorAll('button, a')].filter((b) => vis(b) && !t.contains(b)).map((b) => f(b.innerText || b.getAttribute('aria-label'))).filter(Boolean).slice(0, 20) : [],
        };
    });
    const hs = [...root.querySelectorAll('h1,h2,h3,h4')].filter(vis);
    const boxes = hs.map((h) => ({h: f(h.innerText), next: h.nextElementSibling ? f(h.nextElementSibling.innerText).slice(0, 400) : null})).filter((x) => x.h).slice(0, 40);
    return {
        dialogCount: dlgs.length,
        preTitle: f((root.innerText || '').split('\n').slice(0, 6).join(' | ')).slice(0, 300),
        navItems, navText, navAll, h2, bubble,
        primary: sec('[data-cy="workflow-primary-items"]'),
        actions: sec('[data-cy="workflow-action-items"]'),
        secondary: sec('[data-cy="workflow-secondary-items"]'),
        headerControls: sec('[data-cy="workflow-controls-right"]'),
        tables, boxes,
        text: f(root.innerText).slice(0, 6000),
    };
});

forEachApp(async (app) => {
    const sf = stateFile(app);
    const sc = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(sc, null, 2));
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const isOJS = app.name === 'ojs';
    const ctxUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);
    const wfUrl = (ctx, id, key) => ctxUrl(ctx, `/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const auUrl = (ctx, id, key) => ctxUrl(ctx, `/dashboard/mySubmissions?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const rkey = (s, stageId, n) => { const list = (s.rounds || []).filter((r) => r.stageId === stageId); const r = n ? list.find((x) => x.round === n) || list[n - 1] : list[list.length - 1]; return r ? `workflow_${stageId}_${r.id}` : null; };

    // ---- seed ----------------------------------------------------------------------------------------------
    if (on('seed') && !sc.A) {
        if (isOMP) {
            const t = tag('u71k1');
            const person = (k, roles, g, f) => ({username: `${t}${k}`, roles, givenName: g, familyName: f || 'Kone'});
            const users = [
                person('mgr', ['manager'], 'Mira', 'Manager'), person('ed', ['editor'], 'Eddie', 'Presseditor'),
                person('se1', ['sectionEditor'], 'Sela', 'Deciding'), person('se2', ['sectionEditor'], 'Seth', 'Unassigned'),
                person('serec', ['sectionEditor'], 'Remy', 'Recommender'),
                person('fc', ['funding'], 'Fay', 'Funding'), person('fc2', ['funding'], 'Finn', 'Fundingtwo'),
                person('pe', ['productionEditor'], 'Pia', 'Production'), person('ce', ['copyeditor'], 'Cara', 'Copyeditor'),
                person('le', ['layoutEditor'], 'Lee', 'Layout'), person('pr', ['proofreader'], 'Pru', 'Proofreader'),
                person('des', ['designer'], 'Dee', 'Designer'), person('idx', ['indexer'], 'Ida', 'Indexer'),
                person('mk', ['marketing'], 'Mack', 'Marketing'),
                person('au', ['author'], 'Ava', 'Author'), person('ve', ['volumeEditor'], 'Vic', 'Volumeeditor'),
                person('tr', ['translator'], 'Tess', 'Translator'),
                person('ri1', ['internalReviewer'], 'Ira', 'Internalone'), person('ri2', ['internalReviewer'], 'Ivo', 'Internaltwo'),
                person('ri3', ['internalReviewer'], 'Isla', 'Internalonly'), person('er1', ['externalReviewer'], 'Eric', 'Externalonly'),
                person('rd', ['reader'], 'Rosa', 'Reader'),
            ];
            await app.api.createContext({tag: t, context: {name: `U71 K1 ${t}`, acronym: 'U71K1', contactName: 'K1 Contact', contactEmail: `${t}contact@mail.test`}, users});
            sc.A = t; sc.users = {}; for (const u of users) sc.users[u.username.slice(t.length)] = {username: u.username, name: `${u.givenName} ${u.familyName}`};
            const U = (k) => `${t}${k}`;
            const P = (k, role, extra) => ({username: U(k), role, ...(extra || {})});
            sc.subs = {};
            const sub = async (k, spec, ctx = t, submitter = U('au')) => {
                const body = {tag: `${ctx}${k}`, context: ctx, submitter, title: `K1 ${k.toUpperCase()} ${ctx}`, ...spec};
                try {
                    const r = await app.api.createSubmission(body);
                    sc.subs[k] = {ctx, id: r.submissionId, title: body.title, stageId: r.stageId, rounds: r.reviewRounds || [], raw: JSON.stringify(r).slice(0, 600)};
                } catch (e) { sc.subs[k] = {ctx, error: String(e.message).slice(0, 800)}; }
                save();
                log('[seed]', k, JSON.stringify(sc.subs[k]).slice(0, 400));
            };
            const IR = (reviewers) => ({stage: 'internal', reviewers: reviewers || []});
            await sub('s0', {participants: [P('se1', 'sectionEditor')]});
            await sub('s0b', {participants: [P('se1', 'sectionEditor')]});
            await sub('s0r', {participants: [P('se1', 'sectionEditor'), P('serec', 'sectionEditor', {recommendOnly: true})]});
            await sub('s1', {decisions: ['sendInternalReview'], reviewRounds: [IR([{username: U('ri1'), status: 'completed'}, {username: U('ri2')}])],
                participants: [P('se1', 'sectionEditor'), P('fc', 'funding'), P('pe', 'productionEditor'), P('ce', 'copyeditor'), P('ve', 'volumeEditor'), P('tr', 'translator')]});
            await sub('s2', {decisions: ['sendInternalReview', 'newInternalReviewRound'], reviewRounds: [IR()], participants: [P('se1', 'sectionEditor')]});
            await sub('s3', {decisions: ['sendInternalReview', 'newInternalReviewRound', 'sendExternalReview'], reviewRounds: [IR(), {stage: 'external', reviewers: []}], participants: [P('se1', 'sectionEditor')]});
            await sub('s4', {decisions: ['skipInternalReview'], reviewRounds: [{stage: 'external', reviewers: []}], participants: [P('se1', 'sectionEditor')]});
            await sub('s5', {decisions: ['skipExternalReview'], participants: [P('se1', 'sectionEditor')]});
            await sub('s6', {decisions: ['sendInternalReview', 'declineInternal'], reviewRounds: [IR()], participants: [P('se1', 'sectionEditor')]});
            await sub('s7', {decisions: ['sendInternalReview', 'requestRevisionsInternal'], reviewRounds: [IR()], participants: [P('se1', 'sectionEditor')]});
            await sub('s8', {decisions: ['sendInternalReview'], reviewRounds: [IR()], participants: [P('se1', 'sectionEditor'), P('serec', 'sectionEditor', {recommendOnly: true})]});
            await sub('s9', {decisions: ['sendInternalReview'], reviewRounds: [IR()], participants: [P('serec', 'sectionEditor', {recommendOnly: true})]});
            // context B: open review, reviewer suggestions on
            const b = tag('u71k1b');
            const busers = [
                {username: `${b}mgr`, roles: ['manager'], givenName: 'Mona', familyName: 'Managerb'},
                {username: `${b}ed`, roles: ['editor'], givenName: 'Ezra', familyName: 'Presseditorb'},
                {username: `${b}au`, roles: ['author'], givenName: 'Abby', familyName: 'Authorb'},
                {username: `${b}ri1`, roles: ['internalReviewer'], givenName: 'Iris', familyName: 'Openone'},
                {username: `${b}ri2`, roles: ['internalReviewer'], givenName: 'Ian', familyName: 'Opentwo'},
                {username: `${b}ri3`, roles: ['internalReviewer'], givenName: 'Ines', familyName: 'Internalonlyb'},
                {username: `${b}er1`, roles: ['externalReviewer'], givenName: 'Evan', familyName: 'Externalonlyb'},
            ];
            await app.api.createContext({tag: b, context: {name: `U71 K1 B ${b}`, acronym: 'U71K1B', contactName: 'K1 Contact', contactEmail: `${b}contact@mail.test`}, users: busers,
                review: {defaultReviewMode: 'open', reviewerSuggestionEnabled: true}});
            sc.B = b; for (const u of busers) sc.users[`b${u.username.slice(b.length)}`] = {username: u.username, name: `${u.givenName} ${u.familyName}`};
            await sub('b1', {decisions: ['sendInternalReview'], reviewRounds: [IR([{username: `${b}ri1`, status: 'completed'}, {username: `${b}ri2`, status: 'accepted'}])],
                reviewerSuggestions: [{givenName: 'Evan', familyName: 'Externalonlyb', email: `${b}er1@mail.test`}, {givenName: 'Ines', familyName: 'Internalonlyb', email: `${b}ri3@mail.test`}]}, b, `${b}au`);
            save();
        } else {
            const t = tag(isOJS ? 'u71k1j' : 'u71k1p');
            const users = [
                {username: `${t}mgr`, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
                {username: `${t}se1`, roles: ['sectionEditor'], givenName: 'Sela', familyName: 'Deciding'},
                {username: `${t}au`, roles: ['author'], givenName: 'Ava', familyName: 'Author'},
            ];
            if (isOJS) users.push({username: `${t}er1`, roles: ['externalReviewer'], givenName: 'Eric', familyName: 'Externalonly'});
            await app.api.createContext({tag: t, context: {name: `U71 K1 ${t}`, acronym: 'U71K1', contactName: 'K1 Contact', contactEmail: `${t}contact@mail.test`}, users});
            sc.A = t; sc.users = {}; for (const u of users) sc.users[u.username.slice(t.length)] = {username: u.username, name: `${u.givenName} ${u.familyName}`};
            sc.subs = {};
            const r0 = await app.api.createSubmission({tag: `${t}q`, context: t, submitter: `${t}au`, title: `K1 Q ${t}`, participants: [{username: `${t}se1`, role: 'sectionEditor'}]});
            sc.subs.q = {ctx: t, id: r0.submissionId, stageId: r0.stageId, rounds: r0.reviewRounds || []};
            if (isOJS) {
                const r1 = await app.api.createSubmission({tag: `${t}r`, context: t, submitter: `${t}au`, title: `K1 R ${t}`, decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: `${t}er1`}]}], participants: [{username: `${t}se1`, role: 'sectionEditor'}]});
                sc.subs.r = {ctx: t, id: r1.submissionId, stageId: r1.stageId, rounds: r1.reviewRounds || []};
            }
            save();
            log('[seed]', app.name, JSON.stringify(sc.subs));
        }
    }
    if (!sc.A) { log('no state; run the seed phase'); return; }
    const u = (k) => sc.users[k] && sc.users[k].username;
    const S = sc.subs;

    const {page, close} = await launch(app);
    const jsDialogs = [];
    const calls = [];
    page.on('response', (r) => {
        const url = r.url();
        if (!(/\/api\/|\$\$\$call\$\$\$/.test(url))) return;
        if (r.request().method() === 'GET' && r.status() < 400) return;
        calls.push({at: new Date().toISOString().slice(11, 19), m: r.request().method(), url: url.replace(/^https?:\/\/[^/]+/, '').slice(0, 200), status: r.status()});
    });
    page.on('dialog', async (d) => { jsDialogs.push({at: page.url(), type: d.type(), message: d.message()}); await d.accept().catch(() => {}); });
    const signInAs = async (k, ctx) => { await signIn(page, k === 'admin' ? 'admin' : (u(k) || k), {contextPath: ctx || sc.A}); await idle(page); };

    async function openWf(url, label, extra) {
        await page.goto(url); await idle(page);
        await visDialogs(page).first().waitFor({timeout: 25000}).catch(() => {});
        await page.waitForFunction(() => { const d = document.querySelector('[role=dialog]'); return !d || !/Loading/.test(d.innerText); }, null, {timeout: 15000}).catch(() => {});
        await idle(page); await page.waitForTimeout(400);
        const info = await wfInfo(page).catch((e) => ({error: String(e.message)}));
        const s = await snap(page, label, {info, ...(extra || {})});
        log(`[${label}]`, app.name, '| h2:', JSON.stringify(info.h2), '| bubble:', JSON.stringify(info.bubble), '| actions:', JSON.stringify(info.actions && info.actions.buttons), '| nav:', flat(info.navText, 200), '| tables:', JSON.stringify((info.tables || []).map((t) => `${t.name}[${t.rows.length}]{${t.aroundButtons.join(',')}}`)).slice(0, 500), '| sec:', flat(info.secondary && info.secondary.text, 160), '| url:', page.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 140));
        return {info, s, url: page.url()};
    }
    async function readWizardPage(label) {
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page); await page.waitForTimeout(600);
        const d = await page.evaluate(() => {
            const vis = (e) => e.getClientRects().length > 0;
            const main = document.querySelector('main') || document.body;
            return {
                url: location.href,
                headings: [...main.querySelectorAll('h1,h2,h3,h4,legend')].filter(vis).map((e) => e.innerText.trim()).filter(Boolean).slice(0, 40),
                buttons: [...main.querySelectorAll('button, a.pkp_button, a[role=button]')].filter(vis).map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 60),
                text: main.innerText.slice(0, 5000),
            };
        });
        await snap(page, label, {decision: d});
        return d;
    }
    async function walkAndRecord(label) {
        const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
        const cont = page.getByRole('button', {name: 'Continue', exact: true});
        const pages = [];
        for (let i = 2; i < 8 && !(await rec.isVisible().catch(() => false)); i++) {
            if (!(await cont.count())) break;
            await cont.first().click(); await idle(page);
            const d = await readWizardPage(`${label}-page${i}`);
            pages.push({n: i, headings: d.headings, buttons: d.buttons});
        }
        await rec.click(); await idle(page);
        await visDialogs(page).first().waitFor({timeout: 30000}).catch(() => {});
        await page.waitForTimeout(800); await idle(page);
        const done = await dialogTexts(page);
        await snap(page, `${label}-recorded`, {dialogs: done.map((x) => ({name: x.name, text: flat(x.text, 800), buttons: x.buttons}))});
        log(`[${label} recorded]`, JSON.stringify(done.map((x) => ({name: x.name, text: flat(x.text, 200), buttons: x.buttons}))));
        return {pages, done};
    }
    const actionBtn = (name) => page.locator('[data-cy="workflow-action-items"]').getByRole('button', {name, exact: true}).first();

    // ============================================================================================ OMP phases
    if (isOMP) {
        const A = sc.A;
        const r1 = (s) => rkey(S[s], 2, null);

        // ---- access: who opens S1's internal round, and what they get ---------------------------------------
        if (on('access')) await sect('access', async () => {
            sc.access = {};
            const read = async (who, label, url) => {
                await signInAs(who);
                const o = await openWf(url, label);
                sc.access[label] = {url: o.url.replace(/^https?:\/\/[^/]+/, ''), h2: o.info.h2, bubble: o.info.bubble, actions: o.info.actions && o.info.actions.buttons,
                    tables: (o.info.tables || []).map((t) => ({name: t.name, cols: t.columns, rows: t.rows, around: t.aroundButtons, rowButtons: t.rowButtons})),
                    secondary: o.info.secondary, nav: o.info.navText, text: flat(o.info.text, 1500), dialogCount: o.info.dialogCount};
                save();
                return o;
            };
            for (const who of ['admin', 'mgr', 'ed', 'se1', 'fc']) await read(who, `acc-s1-${who}`, wfUrl(A, S.s1.id, r1('s1')));
            // funding coordinator: the upload controls of the two panels (open the window, do not upload)
            for (const who of ['se2', 'fc2', 'pe', 'ce', 'le', 'rd']) {
                await read(who, `acc-s1-${who}-typed`, wfUrl(A, S.s1.id, r1('s1')));
                await read(who, `acc-s1-${who}-noKey`, wfUrl(A, S.s1.id));
                await page.goto(ctxUrl(A, '/dashboard/editorial')); await idle(page);
                await snap(page, `acc-${who}-dashboard`);
                await page.goto(ctxUrl(A, `/workflow/internalReview/${S.s1.id}`)); await idle(page); await page.waitForTimeout(600);
                await snap(page, `acc-${who}-stage-address`);
            }
            // author-side roles: the author view
            for (const who of ['au', 've', 'tr']) {
                await read(who, `acc-s1-${who}-author`, auUrl(A, S.s1.id, r1('s1')));
                await page.goto(ctxUrl(A, '/dashboard/mySubmissions')); await idle(page);
                await snap(page, `acc-${who}-mysubmissions`);
                await read(who, `acc-s1-${who}-editorial-typed`, wfUrl(A, S.s1.id, r1('s1')));
            }
            // the internal reviewer invited on S1: typed workflow address, then their own list and review page
            await read('ri2', 'acc-s1-ri2-typed', wfUrl(A, S.s1.id, r1('s1')));
            await read('ri2', 'acc-s1-ri2-author-typed', auUrl(A, S.s1.id, r1('s1')));
            await page.goto(ctxUrl(A, '/dashboard/reviewAssignments')); await idle(page); await page.waitForTimeout(600);
            await snap(page, 'acc-ri2-reviewassignments');
            await page.goto(ctxUrl(A, `/reviewer/submission/${S.s1.id}`)); await idle(page); await page.waitForTimeout(600);
            await snap(page, 'acc-ri2-review-page');
            await page.goto(ctxUrl(A, `/workflow/internalReview/${S.s1.id}`)); await idle(page); await page.waitForTimeout(600);
            await snap(page, 'acc-ri2-stage-address');
            await signOut(page);
        });

        // ---- assign: the stage's "Assign" role list ----------------------------------------------------------
        if (on('assign')) await sect('assign', async () => {
            await signInAs('mgr');
            await openWf(wfUrl(A, S.s1.id, r1('s1')), 'asg-s1-mgr');
            const a = page.locator('[data-cy="workflow-secondary-items"]').getByRole('button', {name: 'Assign', exact: true});
            await loc(page, 'Internal Review: Participants "Assign"', a);
            await a.click();
            const w = page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();
            await w.locator('select[name="filterUserGroupId"]').waitFor({timeout: 30000});
            await idle(page);
            const opts = await w.locator('select[name="filterUserGroupId"] option').evaluateAll((els) => els.map((o) => o.text.trim()));
            sc.assignOptions = opts; save();
            await snap(page, 'asg-s1-mgr-window', {opts});
            log('[assign options]', JSON.stringify(opts));
            // sweep: pick a role and leave the window with that unsaved
            if (opts.length > 1) { await w.locator('select[name="filterUserGroupId"]').selectOption({index: 1}); await idle(page); }
            const cancel = w.getByRole('link', {name: /^\s*Cancel\s*$/}).last();
            if (await cancel.count()) { await cancel.click(); } else { await w.getByRole('button', {name: /^(Cancel|Close)$/}).last().click().catch(() => {}); }
            await idle(page); await page.waitForTimeout(500);
            await snap(page, 'asg-s1-mgr-after-cancel', {dialogs: (await dialogTexts(page)).map((d) => ({name: d.name, text: flat(d.text, 300)})), jsDialogs: jsDialogs.slice(-3)});
            await signOut(page);
        });

        // ---- send: "Send to Internal Review" on the Submission stage -----------------------------------------
        if (on('send')) await sect('send', async () => {
            sc.send = {};
            // the sweep: the wizard left with the email changed and unsaved (S0b, se1)
            await signInAs('se1');
            await openWf(wfUrl(A, S.s0b.id, 'workflow_1'), 'send-s0b-se1-before');
            {
                const b = actionBtn('Send to Internal Review');
                await loc(page, 'Submission stage: "Send to Internal Review"', b);
                await b.click(); await page.waitForURL(/decision/, {timeout: 30000}).catch(() => {}); await idle(page);
                const p1 = await readWizardPage('send-s0b-se1-wizard');
                const fr = page.frameLocator('iframe').first();
                await fr.locator('body').click({timeout: 5000}).catch(() => {});
                await page.keyboard.type(' K1 unsaved marker.').catch(() => {});
                const cancel = page.getByRole('button', {name: 'Cancel', exact: true}).or(page.getByRole('link', {name: 'Cancel', exact: true})).first();
                await loc(page, 'decision wizard "Cancel"', cancel);
                const before = jsDialogs.length;
                await cancel.click().catch(() => {}); await idle(page); await page.waitForTimeout(1000);
                const confirm = await dialogTexts(page);
                await snap(page, 'send-s0b-se1-wizard-cancel', {confirm: confirm.map((d) => ({name: d.name, text: flat(d.text, 400), buttons: d.buttons})), jsDialogs: jsDialogs.slice(before)});
                // a Vue confirm: press its confirming button
                const yes = topWin(page).getByRole('button', {name: /^(Yes|OK|Discard|Leave|Cancel Decision|Confirm)/}).first();
                if (confirm.length && (await yes.count())) { await yes.click().catch(() => {}); await idle(page); await page.waitForTimeout(800); }
                await snap(page, 'send-s0b-se1-wizard-after-cancel');
                sc.send.s0bCancel = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), confirm: confirm.map((d) => flat(d.text, 300)), jsDialogs: jsDialogs.slice(before), wizardButtons: p1.buttons, wizardHeadings: p1.headings};
                save();
                await openWf(wfUrl(A, S.s0b.id), 'send-s0b-se1-after-leave');
            }
            // Rule 1: se1 sends S0 into Internal Review
            await openWf(wfUrl(A, S.s0.id, 'workflow_1'), 'send-s0-se1-before');
            await actionBtn('Send to Internal Review').click(); await page.waitForURL(/decision/, {timeout: 30000}).catch(() => {}); await idle(page);
            await readWizardPage('send-s0-se1-wizard-page1');
            const r = await walkAndRecord('send-s0-se1');
            sc.send.s0 = {pages: r.pages, done: r.done.map((d) => ({name: d.name, text: flat(d.text, 400), buttons: d.buttons}))};
            const view = topWin(page).getByRole('link', {name: /View Submission/}).or(topWin(page).getByRole('button', {name: /View Submission/})).first();
            if (await view.count()) { await view.click(); await idle(page); await page.waitForTimeout(1200); await idle(page); }
            const landed = await wfInfo(page).catch(() => ({}));
            await snap(page, 'send-s0-se1-landed', {info: landed});
            sc.send.s0.landed = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), h2: landed.h2, bubble: landed.bubble, nav: landed.navText, actions: landed.actions && landed.actions.buttons};
            const o = await openWf(wfUrl(A, S.s0.id), 'send-s0-se1-reload');
            sc.send.s0.reload = {url: o.url.replace(/^https?:\/\/[^/]+/, ''), h2: o.info.h2, bubble: o.info.bubble, nav: o.info.navText, navAll: o.info.navAll, actions: o.info.actions && o.info.actions.buttons, tables: (o.info.tables || []).map((t) => t.name)};
            save();
            // the recommending editor on S0r
            await signInAs('serec');
            const b0 = await openWf(wfUrl(A, S.s0r.id, 'workflow_1'), 'send-s0r-serec-before');
            sc.send.s0rBefore = {actions: b0.info.actions, secondary: b0.info.secondary && b0.info.secondary.text.slice(0, 600)};
            const sb = actionBtn('Send to Internal Review');
            if (await sb.count()) {
                await sb.click(); await page.waitForURL(/decision/, {timeout: 30000}).catch(() => {}); await idle(page);
                const p1 = await readWizardPage('send-s0r-serec-wizard-page1');
                sc.send.s0rWizard = {headings: p1.headings, buttons: p1.buttons, text: flat(p1.text, 1200)};
                const rr = await walkAndRecord('send-s0r-serec');
                sc.send.s0rDone = rr.done.map((d) => ({name: d.name, text: flat(d.text, 400)}));
                const o2 = await openWf(wfUrl(A, S.s0r.id), 'send-s0r-serec-reload');
                sc.send.s0rAfter = {h2: o2.info.h2, bubble: o2.info.bubble, nav: o2.info.navText, actions: o2.info.actions && o2.info.actions.buttons, secondary: o2.info.secondary && o2.info.secondary.text.slice(0, 600)};
                await signInAs('se1');
                const o3 = await openWf(wfUrl(A, S.s0r.id), 'send-s0r-se1-after');
                sc.send.s0rSe1 = {h2: o3.info.h2, bubble: o3.info.bubble, actions: o3.info.actions && o3.info.actions.buttons, boxes: o3.info.boxes};
                await page.goto(ctxUrl(A, `/dashboard/editorial?workflowSubmissionId=${S.s0r.id}&workflowMenuKey=workflow_1`)); await idle(page);
            } else sc.send.s0rNoButton = true;
            save();
            // the activity log as the manager: who is recorded as having decided
            await signInAs('mgr');
            await openWf(wfUrl(A, S.s0r.id), 'send-s0r-mgr');
            const hist = page.locator('[data-cy="workflow-controls-right"], [role=dialog]').getByRole('button', {name: /Activity Log/}).first();
            if (await hist.count()) {
                await hist.click(); await idle(page); await page.waitForTimeout(1500); await idle(page);
                const d = (await dialogTexts(page)).slice(-1)[0];
                sc.send.s0rLog = flat(d && d.text, 1500);
                await snap(page, 'send-s0r-mgr-activity-log');
            }
            save();
            await signOut(page);
        });

        // ---- rounds: Rule 2 and Rule 1's never-entered ---------------------------------------------------------
        if (on('rounds')) await sect('rounds', async () => {
            sc.rounds = {};
            await signInAs('mgr');
            const keep = (k, o) => { sc.rounds[k] = {url: o.url.replace(/^https?:\/\/[^/]+/, ''), h2: o.info.h2, bubble: o.info.bubble, nav: o.info.navText, navAll: o.info.navAll, navItems: o.info.navItems, actions: o.info.actions && o.info.actions.buttons, primary: o.info.primary && o.info.primary.text.slice(0, 1200), secondary: o.info.secondary && o.info.secondary.text.slice(0, 400)}; save(); };
            keep('s1-default', await openWf(wfUrl(A, S.s1.id), 'rnd-s1-default'));
            keep('s2-default', await openWf(wfUrl(A, S.s2.id), 'rnd-s2-default'));
            keep('s2-r1', await openWf(wfUrl(A, S.s2.id, rkey(S.s2, 2, 1)), 'rnd-s2-round1'));
            keep('s2-r2', await openWf(wfUrl(A, S.s2.id, rkey(S.s2, 2, 2)), 'rnd-s2-round2'));
            keep('s3-default', await openWf(wfUrl(A, S.s3.id), 'rnd-s3-default'));
            keep('s3-ir2', await openWf(wfUrl(A, S.s3.id, rkey(S.s3, 2, 2)), 'rnd-s3-internal-round2'));
            keep('s3-ir1', await openWf(wfUrl(A, S.s3.id, rkey(S.s3, 2, 1)), 'rnd-s3-internal-round1'));
            // S3: press the side menu's "Internal Review" › "Review Round 2" from the External round
            await openWf(wfUrl(A, S.s3.id), 'rnd-s3-default-2');
            const nav = visDialogs(page).first().locator('nav');
            const ir = nav.getByText('Internal Review', {exact: true}).first();
            await loc(page, 'workflow side menu: "Internal Review" entry', ir);
            if (await ir.count()) { await ir.click().catch(() => {}); await idle(page); await page.waitForTimeout(500); }
            const rr = nav.getByText('Review Round 2', {exact: true}).first();
            if (await rr.count()) { await rr.click().catch(() => {}); await idle(page); await page.waitForTimeout(800); }
            keep('s3-menu-click', {info: await wfInfo(page), url: page.url()});
            await snap(page, 'rnd-s3-menu-click');
            // never entered: S4 (Send to External Review), S5 (Accept and Skip Review)
            for (const k of ['s4', 's5']) {
                keep(`${k}-default`, await openWf(wfUrl(A, S[k].id), `rnd-${k}-default`));
                keep(`${k}-ir`, await openWf(wfUrl(A, S[k].id, 'workflow_2'), `rnd-${k}-internal`));
                // press the menu entry itself
                await openWf(wfUrl(A, S[k].id), `rnd-${k}-default-2`);
                const n2 = visDialogs(page).first().locator('nav');
                const e = n2.getByText('Internal Review', {exact: true}).first();
                if (await e.count()) { await e.click().catch(() => {}); await idle(page); await page.waitForTimeout(800); }
                keep(`${k}-ir-click`, {info: await wfInfo(page), url: page.url()});
                await snap(page, `rnd-${k}-internal-click`);
            }
            // the author view of S2 (opens on the current round too?)
            await signInAs('au');
            keep('s2-author', await openWf(auUrl(A, S.s2.id), 'rnd-s2-author-default'));
            keep('s4-author-ir', await openWf(auUrl(A, S.s4.id, 'workflow_2'), 'rnd-s4-author-internal'));
            await signOut(page);
        });

        // ---- author: the author's view on S1 (no revisions), S7 (revisions requested), B1 (open reviews) ----
        if (on('author')) await sect('author', async () => {
            sc.author = {};
            const upRev = () => visDialogs(page).first().getByRole('button', {name: 'Upload revisions', exact: true});
            await signInAs('au');
            const a1 = await openWf(auUrl(A, S.s1.id, r1('s1')), 'au-s1');
            sc.author.s1 = {uploadRevisions: await upRev().count(), tables: (a1.info.tables || []).map((t) => ({name: t.name, cols: t.columns, rows: t.rows, around: t.aroundButtons})), actions: a1.info.actions && a1.info.actions.buttons, text: flat(a1.info.text, 1500)};
            const a7 = await openWf(auUrl(A, S.s7.id, r1('s7')), 'au-s7-before');
            sc.author.s7before = {uploadRevisions: await upRev().count(), tables: (a7.info.tables || []).map((t) => ({name: t.name, rows: t.rows, around: t.aroundButtons})), text: flat(a7.info.text, 1500)};
            save();
            if (await upRev().count()) {
                await loc(page, 'author view: "Upload revisions"', upRev());
                const wiz = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
                await upRev().click();
                await wiz().locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000}); await idle(page);
                const g = wiz().locator('select[id^="genreId"]');
                const genres = (await g.count()) ? await g.locator('option').allInnerTexts() : [];
                await snap(page, 'au-s7-upload-step1', {genres});
                if (await g.count()) await g.selectOption({label: 'Book Manuscript'}).catch(async () => { await g.selectOption({index: 1}); });
                await wiz().locator('input[type="file"]').setInputFiles(PDF);
                const cont = wiz().getByRole('button', {name: 'Continue', exact: true});
                for (let i = 0; i < 60 && !(await cont.isEnabled().catch(() => false)); i++) await page.waitForTimeout(250);
                await cont.click(); await idle(page); await page.waitForTimeout(800);
                await cont.click().catch(() => {}); await idle(page); await page.waitForTimeout(800);
                await snap(page, 'au-s7-upload-step3');
                await wiz().getByRole('button', {name: 'Complete', exact: true}).click().catch(() => {});
                await wiz().waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                await idle(page); await page.waitForTimeout(1200); await idle(page);
                const same = await wfInfo(page);
                await snap(page, 'au-s7-after-upload-same-page', {info: same});
                sc.author.s7same = {uploadRevisions: await upRev().count(), tables: (same.tables || []).map((t) => ({name: t.name, rows: t.rows})), status: flat(same.primary && same.primary.text, 600)};
                const re = await openWf(auUrl(A, S.s7.id, r1('s7')), 'au-s7-after-upload-reload');
                sc.author.s7reload = {uploadRevisions: await upRev().count(), tables: (re.info.tables || []).map((t) => ({name: t.name, rows: t.rows})), status: flat(re.info.primary && re.info.primary.text, 600)};
                save();
            }
            // S2 (no revision request): the author's own "Upload" on the "Revisions Uploaded" panel, pressed and used
            await sect('author panel upload', async () => {
                await openWf(auUrl(A, S.s2.id, rkey(S.s2, 2, null)), 'au-s2-before');
                const box = visDialogs(page).first().locator('div').filter({has: page.getByRole('table', {name: 'Revisions Uploaded', exact: true})}).last();
                const up = box.getByRole('button', {name: 'Upload', exact: true});
                sc.author.s2 = {panelUpload: await up.count(), uploadRevisions: await upRev().count()};
                if (!(await up.count())) { save(); return; }
                await loc(page, 'author view: "Revisions Uploaded" › "Upload"', up);
                const wiz = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
                const resp = [];
                const onR = (r) => { if (r.request().method() !== 'GET' || r.status() >= 400) resp.push({m: r.request().method(), s: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 200)}); };
                page.on('response', onR);
                await up.click();
                await wiz().locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000}).catch(() => {});
                await idle(page); await page.waitForTimeout(600);
                const w1 = (await dialogTexts(page)).slice(-1)[0];
                await snap(page, 'au-s2-panel-upload-window', {win: w1 && {name: w1.name, text: flat(w1.text, 1500), buttons: w1.buttons}});
                sc.author.s2.window = w1 && {name: w1.name, text: flat(w1.text, 800)};
                if (await wiz().locator('input[type="file"]').count()) {
                    const g = wiz().locator('select[id^="genreId"]');
                    if (await g.count()) await g.selectOption({label: 'Book Manuscript'}).catch(async () => { await g.selectOption({index: 1}); });
                    await wiz().locator('input[type="file"]').setInputFiles(PDF);
                    await page.waitForTimeout(3000); await idle(page);
                    const w2 = (await dialogTexts(page)).slice(-1)[0];
                    await snap(page, 'au-s2-panel-upload-after-file', {win: w2 && {name: w2.name, text: flat(w2.text, 1500), buttons: w2.buttons}});
                    sc.author.s2.afterFile = w2 && flat(w2.text, 800);
                    const cont = wiz().getByRole('button', {name: 'Continue', exact: true});
                    if (await cont.isEnabled().catch(() => false)) {
                        await cont.click(); await idle(page); await page.waitForTimeout(800);
                        await cont.click().catch(() => {}); await idle(page); await page.waitForTimeout(800);
                        await wiz().getByRole('button', {name: 'Complete', exact: true}).click().catch(() => {});
                        await wiz().waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                        await idle(page); await page.waitForTimeout(1200);
                    } else {
                        const c = wiz().getByRole('link', {name: 'Cancel', exact: true}).or(wiz().getByRole('button', {name: 'Cancel', exact: true})).first();
                        await c.click().catch(() => {}); await idle(page); await page.waitForTimeout(800);
                    }
                }
                page.off('response', onR);
                sc.author.s2.responses = resp;
                const same = await wfInfo(page);
                await snap(page, 'au-s2-panel-upload-same-page', {info: same});
                sc.author.s2.same = (same.tables || []).map((t) => ({name: t.name, rows: t.rows}));
                const re = await openWf(auUrl(A, S.s2.id, rkey(S.s2, 2, null)), 'au-s2-panel-upload-reload');
                sc.author.s2.reload = (re.info.tables || []).map((t) => ({name: t.name, rows: t.rows}));
                save();
            });
            // B1: open reviews, one completed, one accepted
            await signInAs('bau', sc.B);
            const b = await openWf(auUrl(sc.B, S.b1.id, rkey(S.b1, 2, null)), 'au-b1');
            sc.author.b1 = {tables: (b.info.tables || []).map((t) => ({name: t.name, cols: t.columns, rows: t.rows, rowButtons: t.rowButtons, around: t.aroundButtons})), text: flat(b.info.text, 2000)};
            const rv = visDialogs(page).first().getByRole('button', {name: /Read Review/}).first();
            await loc(page, 'author view: reviewer row "Read Review"', rv);
            if (await rv.count()) {
                await rv.click(); await idle(page); await page.waitForTimeout(1500); await idle(page);
                const d = await dialogTexts(page);
                await snap(page, 'au-b1-read-review', {dialogs: d.map((x) => ({name: x.name, text: flat(x.text, 1500), buttons: x.buttons}))});
                sc.author.b1read = d.slice(1).map((x) => ({name: x.name, text: flat(x.text, 1200), buttons: x.buttons}));
                const c = topWin(page).getByRole('button', {name: /^(Close|Cancel)$/}).last();
                if (await c.count()) { await c.click().catch(() => {}); await idle(page); }
            }
            save();
            await signOut(page);
        });

        // ---- files: the funding coordinator's upload into "Revisions Uploaded" on S1, then the author ---------
        if (on('files')) await sect('files', async () => {
            sc.files = {};
            await signInAs('fc');
            await openWf(wfUrl(A, S.s1.id, r1('s1')), 'fil-s1-fc-before');
            const tableBox = (name) => visDialogs(page).first().locator('div').filter({has: page.getByRole('table', {name, exact: true})}).last();
            for (const name of ['Files for Review', 'Revisions Uploaded']) {
                const box = tableBox(name);
                sc.files[name] = {present: await box.count(), buttons: (await box.count()) ? await box.locator('button:visible').allInnerTexts().then((a) => a.map((x) => flat(x, 60))) : []};
            }
            // Files for Review › Upload/Select Files: the window (no upload)
            const sel = tableBox('Files for Review').getByRole('button', {name: 'Upload/Select Files', exact: true});
            if (await sel.count()) {
                await loc(page, 'Internal Review: "Files for Review" › "Upload/Select Files"', sel);
                await sel.click(); await idle(page); await page.waitForTimeout(1500); await idle(page);
                const d = (await dialogTexts(page)).slice(-1)[0];
                sc.files.selectWindow = {name: d && d.name, text: flat(d && d.text, 1200), buttons: d && d.buttons};
                await snap(page, 'fil-s1-fc-select-window');
                const c = topWin(page).getByRole('link', {name: 'Cancel', exact: true}).or(topWin(page).getByRole('button', {name: 'Cancel', exact: true})).first();
                if (await c.count()) { await c.click().catch(() => {}); await idle(page); await page.waitForTimeout(600); }
            }
            // Revisions Uploaded › Upload: upload one file
            await openWf(wfUrl(A, S.s1.id, r1('s1')), 'fil-s1-fc-before-2');
            const up = tableBox('Revisions Uploaded').getByRole('button', {name: 'Upload', exact: true});
            if (await up.count()) {
                await loc(page, 'Internal Review: "Revisions Uploaded" › "Upload"', up);
                const wiz = () => page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')}).last();
                await up.click();
                await wiz().locator('input[type="file"]').waitFor({state: 'attached', timeout: 30000}); await idle(page);
                const g = wiz().locator('select[id^="genreId"]');
                if (await g.count()) await g.selectOption({label: 'Book Manuscript'}).catch(async () => { await g.selectOption({index: 1}); });
                await wiz().locator('input[type="file"]').setInputFiles(PDF);
                const cont = wiz().getByRole('button', {name: 'Continue', exact: true});
                for (let i = 0; i < 60 && !(await cont.isEnabled().catch(() => false)); i++) await page.waitForTimeout(250);
                await cont.click(); await idle(page); await page.waitForTimeout(800);
                await cont.click().catch(() => {}); await idle(page); await page.waitForTimeout(800);
                await wiz().getByRole('button', {name: 'Complete', exact: true}).click().catch(() => {});
                await wiz().waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                await idle(page); await page.waitForTimeout(1200); await idle(page);
                const same = await wfInfo(page);
                await snap(page, 'fil-s1-fc-after-upload-same-page', {info: same});
                sc.files.fcSame = {tables: (same.tables || []).map((t) => ({name: t.name, rows: t.rows})), status: flat(same.primary && same.primary.text, 500)};
                const re = await openWf(wfUrl(A, S.s1.id, r1('s1')), 'fil-s1-fc-after-upload-reload');
                sc.files.fcReload = {tables: (re.info.tables || []).map((t) => ({name: t.name, rows: t.rows})), status: flat(re.info.primary && re.info.primary.text, 500)};
            } else sc.files.fcNoUpload = true;
            save();
            // the author on S1 now: does a revision the editor uploaded give them "Upload revisions"?
            await signInAs('au');
            const a = await openWf(auUrl(A, S.s1.id, r1('s1')), 'fil-s1-au-after-fc-upload');
            sc.files.auAfter = {uploadRevisions: await visDialogs(page).first().getByRole('button', {name: 'Upload revisions', exact: true}).count(), tables: (a.info.tables || []).map((t) => ({name: t.name, rows: t.rows}))};
            save();
            await signOut(page);
        });

        // ---- rec: recommending editors on S8 (with a deciding editor) and S9 (alone) --------------------------
        if (on('rec')) await sect('rec', async () => {
            sc.rec = {};
            await signInAs('se1');
            const d0 = await openWf(wfUrl(A, S.s8.id, r1('s8')), 'rec-s8-se1-before');
            sc.rec.se1Before = {actions: d0.info.actions, secondary: d0.info.secondary && d0.info.secondary.text.slice(0, 800), boxes: d0.info.boxes};
            await signInAs('serec');
            const r0 = await openWf(wfUrl(A, S.s8.id, r1('s8')), 'rec-s8-serec-before');
            sc.rec.serecBefore = {actions: r0.info.actions, secondary: r0.info.secondary && r0.info.secondary.text.slice(0, 800), boxes: r0.info.boxes};
            const r9 = await openWf(wfUrl(A, S.s9.id, r1('s9')), 'rec-s9-serec');
            sc.rec.s9serec = {actions: r9.info.actions, secondary: r9.info.secondary && r9.info.secondary.text.slice(0, 800), primary: r9.info.primary && r9.info.primary.text.slice(0, 800)};
            save();
            // record "Recommend Accept" on S8
            await openWf(wfUrl(A, S.s8.id, r1('s8')), 'rec-s8-serec-before-2');
            const ra = actionBtn('Recommend Accept');
            if (await ra.count()) {
                await loc(page, 'Internal Review: "Recommend Accept"', ra);
                await ra.click(); await page.waitForURL(/decision/, {timeout: 30000}).catch(() => {}); await idle(page);
                const p1 = await readWizardPage('rec-s8-serec-wizard-page1');
                sc.rec.wizard = {headings: p1.headings, buttons: p1.buttons, text: flat(p1.text, 800)};
                const w = await walkAndRecord('rec-s8-serec');
                sc.rec.done = w.done.map((d) => ({name: d.name, text: flat(d.text, 400)}));
                const r1b = await openWf(wfUrl(A, S.s8.id, r1('s8')), 'rec-s8-serec-after-reload');
                sc.rec.serecAfter = {actions: r1b.info.actions, secondary: r1b.info.secondary && r1b.info.secondary.text.slice(0, 800), boxes: r1b.info.boxes, bubble: r1b.info.bubble, status: flat(r1b.info.primary && r1b.info.primary.text, 600)};
            } else sc.rec.noButton = true;
            save();
            await signInAs('se1');
            const d1 = await openWf(wfUrl(A, S.s8.id, r1('s8')), 'rec-s8-se1-after');
            sc.rec.se1After = {actions: d1.info.actions, secondary: d1.info.secondary && d1.info.secondary.text.slice(0, 800), boxes: d1.info.boxes};
            await signInAs('mgr');
            const m1 = await openWf(wfUrl(A, S.s8.id, r1('s8')), 'rec-s8-mgr-after');
            sc.rec.mgrAfter = {actions: m1.info.actions, secondary: m1.info.secondary && m1.info.secondary.text.slice(0, 800)};
            save();
            await signOut(page);
        });

        // ---- delete: S6 declined on Internal Review, by level --------------------------------------------------
        if (on('delete')) await sect('delete', async () => {
            sc.del = {};
            for (const who of ['admin', 'mgr', 'ed', 'se1']) {
                await signInAs(who);
                const o = await openWf(wfUrl(A, S.s6.id, r1('s6')), `del-s6-${who}`);
                sc.del[who] = {actions: o.info.actions && o.info.actions.buttons, bubble: o.info.bubble, h2: o.info.h2};
                save();
            }
            // the manager's "Delete": the confirmation, then cancelled
            await signInAs('mgr');
            await openWf(wfUrl(A, S.s6.id, r1('s6')), 'del-s6-mgr-2');
            const del = actionBtn('Delete');
            if (await del.count()) {
                await loc(page, 'Internal Review (declined): "Delete"', del);
                await del.click(); await idle(page); await page.waitForTimeout(800);
                const d = await dialogTexts(page);
                sc.del.confirm = d.slice(1).map((x) => ({name: x.name, text: flat(x.text, 400), buttons: x.buttons}));
                await snap(page, 'del-s6-mgr-confirm');
                const c = topWin(page).getByRole('button', {name: /^(Cancel|No)$/}).last();
                if (await c.count()) { await c.click(); await idle(page); await page.waitForTimeout(600); }
                await snap(page, 'del-s6-mgr-after-cancel');
            }
            save();
            await signOut(page);
        });

        // ---- pool: who "Add Reviewer" offers on an internal round (td-pool) ---------------------------------
        if (on('pool')) await sect('pool', async () => {
            sc.pool = {};
            const listInfo = async () => topWin(page).evaluate((root) => {
                const vis = (e) => e.offsetParent !== null;
                return {
                    panels: [...root.querySelectorAll('.listPanel')].filter(vis).map((p) => ({
                        title: (p.querySelector('.listPanel__title, h2, h3') || {}).innerText?.trim() || null,
                        items: [...p.querySelectorAll('.listPanel__item')].filter(vis).map((li) => li.innerText.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6).join(' / ')),
                        empty: (p.querySelector('.listPanel__empty') || {}).innerText?.trim() || null,
                    })),
                    text: root.innerText.slice(0, 3000),
                };
            }).catch((e) => ({error: String(e.message)}));
            const waitList = async () => {
                await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].pop(); return d && (d.querySelector('.listPanel__item') || /No items/.test(d.innerText)); }, null, {timeout: 20000}).catch(() => {});
                await idle(page); await page.waitForTimeout(600);
            };
            const locate = () => topWin(page).locator('.listPanel').filter({hasText: 'Locate a Reviewer'}).first();
            const search = async (phrase) => {
                const box = locate().getByRole('searchbox').or(locate().locator('input[type="search"]')).first();
                await box.fill(phrase); await box.press('Enter'); await idle(page); await page.waitForTimeout(1200); await idle(page);
                return listInfo();
            };
            const run = async (ctx, who, subKey, label, er, ri) => {
                await signInAs(who, ctx);
                await openWf(wfUrl(ctx, S[subKey].id, rkey(S[subKey], 2, null)), `${label}-round`);
                const add = visDialogs(page).first().getByRole('button', {name: 'Add Reviewer', exact: true}).first();
                await loc(page, 'Internal Review: Reviewers panel "Add Reviewer"', add);
                await add.click(); await waitList();
                const open = await listInfo();
                await snap(page, `${label}-add-open`, {list: open});
                const out = {open};
                out.searchEr = await search(er);
                await snap(page, `${label}-search-external`, {list: out.searchEr});
                out.searchRi = await search(ri);
                await snap(page, `${label}-search-internal`, {list: out.searchRi});
                sc.pool[label] = out; save();
                log(`[${label}]`, JSON.stringify(open.panels), '| er:', JSON.stringify(out.searchEr.panels), '| ri:', JSON.stringify(out.searchRi.panels));
                return out;
            };
            // context A (suggestions off): Press Editor on S1
            await run(sc.A, 'ed', 's1', 'pool-A', 'Externalonly', 'Internalonly');
            // add the external-only person when listed
            await sect('pool add A', async () => {
                await search('Externalonly');
                const item = locate().locator('.listPanel__item').filter({hasText: 'Externalonly'}).first();
                if (!(await item.count())) { sc.pool.addA = 'not listed'; save(); return; }
                await item.getByRole('button', {name: /^Select/}).first().click(); await idle(page); await page.waitForTimeout(1500);
                await page.waitForFunction(() => { const ta = document.querySelector('textarea[name="personalMessage"]'); const mce = window.tinyMCE || window.tinymce; return !ta || !!mce?.get(ta.id)?.initialized; }, null, {timeout: 30000}).catch(() => {});
                await idle(page);
                await snap(page, 'pool-A-selected-external');
                const submit = topWin(page).getByRole('button', {name: 'Add Reviewer', exact: true}).last();
                await submit.click(); await idle(page); await page.waitForTimeout(2000); await idle(page);
                for (let i = 0; i < 3 && (await visDialogs(page).count()) > 1; i++) { const c = topWin(page).getByRole('button', {name: /^(Close)$/}).last(); if (await c.count()) { await c.click().catch(() => {}); await idle(page); } else break; }
                const o = await openWf(wfUrl(sc.A, S.s1.id, r1('s1')), 'pool-A-after-add-reload');
                sc.pool.addA = (o.info.tables || []).filter((t) => /Reviewer/i.test(t.name || '') || t.columns.some((c) => /Reviewer/i.test(c))).map((t) => ({name: t.name, rows: t.rows}));
                save();
            });
            // context B (suggestions on, a suggestion carries er1's address)
            await run(sc.B, 'bed', 'b1', 'pool-B', 'Externalonlyb', 'Internalonlyb');
            await sect('pool add B', async () => {
                const sugg = topWin(page).locator('.listPanel').filter({hasText: 'Select a Reviewer from Reviewer Suggestions'}).first();
                const item = sugg.locator('.listPanel__item').filter({hasText: 'Externalonlyb'}).first();
                sc.pool.suggB = {panel: await sugg.count(), item: await item.count(), text: flat(await item.innerText().catch(() => null), 300)};
                save();
                if (!(await item.count())) return;
                await item.getByRole('button', {name: /^Select/}).first().click(); await idle(page); await page.waitForTimeout(1500);
                await page.waitForFunction(() => { const ta = document.querySelector('textarea[name="personalMessage"]'); const mce = window.tinyMCE || window.tinymce; return !ta || !!mce?.get(ta.id)?.initialized; }, null, {timeout: 30000}).catch(() => {});
                await idle(page);
                const d = await dialogTexts(page);
                await snap(page, 'pool-B-selected-suggestion', {dialogs: d.map((x) => ({name: x.name, text: flat(x.text, 600)}))});
                const submit = topWin(page).getByRole('button', {name: 'Add Reviewer', exact: true}).last();
                await submit.click(); await idle(page); await page.waitForTimeout(2000); await idle(page);
                for (let i = 0; i < 3 && (await visDialogs(page).count()) > 1; i++) { const c = topWin(page).getByRole('button', {name: /^(Close)$/}).last(); if (await c.count()) { await c.click().catch(() => {}); await idle(page); } else break; }
                const o = await openWf(wfUrl(sc.B, S.b1.id, rkey(S.b1, 2, null)), 'pool-B-after-add-reload');
                sc.pool.addB = (o.info.tables || []).map((t) => ({name: t.name, rows: t.rows}));
                save();
            });
            await signOut(page);
        });
    }

    // ---- extra: the unsearched list's add (td-pool), the external-only reviewer's own side, the stage entry itself
    if (on('extra')) await sect('extra', async () => {
        sc.extra = sc.extra || {};
        const stageEntry = async (label) => {
            const nav = visDialogs(page).first().locator('nav');
            const e = nav.getByText(isOMP ? 'Internal Review' : 'Review', {exact: true}).first();
            await loc(page, `workflow side menu: the "${isOMP ? 'Internal Review' : 'Review'}" stage entry`, e);
            await e.click().catch(() => {}); await idle(page); await page.waitForTimeout(1000); await idle(page);
            const info = await wfInfo(page);
            await snap(page, label, {info});
            return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), h2: info.h2, bubble: info.bubble, nav: info.navText, actions: info.actions && info.actions.buttons, tables: (info.tables || []).map((t) => ({name: t.name, rows: t.rows, around: t.aroundButtons})), status: flat(info.primary && info.primary.text, 300)};
        };
        if (isOMP && !sc.extra.addReload) {
            const A = sc.A;
            await signInAs('ed');
            await openWf(wfUrl(A, S.s1.id, rkey(S.s1, 2, null)), 'ext-s1-ed-round');
            const add = visDialogs(page).first().getByRole('button', {name: 'Add Reviewer', exact: true}).first();
            await add.click();
            await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].pop(); return d && d.querySelector('.listPanel__item'); }, null, {timeout: 20000}).catch(() => {});
            await idle(page); await page.waitForTimeout(600);
            const item = topWin(page).locator('.listPanel').filter({hasText: 'Locate a Reviewer'}).first().locator('.listPanel__item').filter({hasText: 'Eric Externalonly'}).first();
            sc.extra.unsearchedItem = await item.count();
            if (await item.count()) {
                const sel = item.getByRole('button', {name: /^Select/}).first();
                await loc(page, 'Add Reviewer › "Locate a Reviewer": the external-only entry\'s "Select Reviewer"', sel);
                await sel.click(); await idle(page); await page.waitForTimeout(1500);
                await page.waitForFunction(() => { const ta = document.querySelector('textarea[name="personalMessage"]'); const mce = window.tinyMCE || window.tinymce; return !ta || !!mce?.get(ta.id)?.initialized; }, null, {timeout: 30000}).catch(() => {});
                await idle(page);
                const d = (await dialogTexts(page)).slice(-1)[0];
                await snap(page, 'ext-s1-ed-selected-external', {win: d && {name: d.name, text: flat(d.text, 1500)}});
                const submit = topWin(page).getByRole('button', {name: 'Add Reviewer', exact: true}).last();
                await submit.click(); await idle(page); await page.waitForTimeout(2500); await idle(page);
                const same = await wfInfo(page);
                await snap(page, 'ext-s1-ed-after-add-same-page', {info: same, dialogs: (await dialogTexts(page)).map((x) => ({name: x.name, text: flat(x.text, 300)}))});
                sc.extra.addSame = (same.tables || []).filter((t) => t.name === 'Reviewers').map((t) => t.rows);
                const re = await openWf(wfUrl(A, S.s1.id, rkey(S.s1, 2, null)), 'ext-s1-ed-after-add-reload');
                sc.extra.addReload = (re.info.tables || []).filter((t) => t.name === 'Reviewers').map((t) => t.rows);
            }
            save();
            // the stage entry itself on an active internal round with reviewers (S1) and on a past one (S3)
            await openWf(wfUrl(A, S.s1.id), 'ext-s1-ed-default');
            sc.extra.s1Entry = await stageEntry('ext-s1-ed-stage-entry');
            save();
            // the external-only reviewer's own side
            await signInAs('er1');
            await page.goto(ctxUrl(A, '/dashboard/reviewAssignments')); await idle(page); await page.waitForTimeout(800);
            const l = await snap(page, 'ext-er1-reviewassignments');
            sc.extra.er1List = flat(l.text && l.text.main, 600);
            await page.goto(ctxUrl(A, `/reviewer/submission/${S.s1.id}`)); await idle(page); await page.waitForTimeout(800);
            const rp = await snap(page, 'ext-er1-review-page');
            sc.extra.er1Page = {url: rp.url, text: flat(rp.text && rp.text.main, 800)};
            save();
            await signOut(page);
        }
        if (isOMP) {
            const A = sc.A;
            // "Send to Internal Review" by level: on a queued monograph (S0b), and on the Submission stage of one that left it (S1)
            sc.extra.sendByLevel = {};
            for (const who of ['admin', 'mgr', 'ed']) {
                await signInAs(who);
                const q = await openWf(wfUrl(A, S.s0b.id, 'workflow_1'), `ext-s0b-${who}-submission`);
                const l = await openWf(wfUrl(A, S.s1.id, 'workflow_1'), `ext-s1-${who}-submission`);
                sc.extra.sendByLevel[who] = {queued: q.info.actions && q.info.actions.buttons, left: l.info.actions && l.info.actions.buttons, leftH2: l.info.h2};
            }
            save();
            await signOut(page);
        }
        if (isOJS && !sc.extra.rEntry) {
            await signInAs('mgr');
            await openWf(wfUrl(sc.A, S.r.id), 'ext-ojs-r-default');
            sc.extra.rEntry = await stageEntry('ext-ojs-r-stage-entry');
            save();
            await signOut(page);
        }
        log('[extra]', app.name, JSON.stringify(sc.extra).slice(0, 2500));
    });

    // ============================================================================================ OJS / OPS
    if (!isOMP && on('absence')) await sect('absence', async () => {
        sc.absence = {};
        await signInAs('mgr');
        const q = await openWf(wfUrl(sc.A, S.q.id), `abs-q-mgr`);
        sc.absence.q = {nav: q.info.navText, navAll: q.info.navAll, actions: q.info.actions && q.info.actions.buttons, h2: q.info.h2, bubble: q.info.bubble, sendInternal: /Internal Review/.test(q.info.text)};
        if (isOJS) {
            const r = await openWf(wfUrl(sc.A, S.r.id), `abs-r-mgr`);
            sc.absence.r = {nav: r.info.navText, navAll: r.info.navAll, actions: r.info.actions && r.info.actions.buttons, h2: r.info.h2, bubble: r.info.bubble, internalText: /Internal/.test(r.info.text)};
            const a = page.locator('[data-cy="workflow-secondary-items"]').getByRole('button', {name: 'Assign', exact: true});
            if (await a.count()) {
                await a.click();
                const w = page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();
                await w.locator('select[name="filterUserGroupId"]').waitFor({timeout: 30000}).catch(() => {});
                sc.absence.assignReview = await w.locator('select[name="filterUserGroupId"] option').evaluateAll((els) => els.map((o) => o.text.trim())).catch(() => null);
                await snap(page, 'abs-r-mgr-assign');
                const c = w.getByRole('link', {name: /^\s*Cancel\s*$/}).last(); if (await c.count()) { await c.click(); await idle(page); }
            }
        }
        // Users & Roles › Roles: the role list
        await page.goto(ctxUrl(sc.A, '/management/settings/access')); await idle(page);
        const rb = page.locator('#roles-button');
        if (await rb.count()) { await rb.click(); await idle(page); await page.waitForTimeout(1500); await idle(page); }
        const rolesText = await page.locator('main').first().innerText().catch(() => null);
        sc.absence.roles = flat(rolesText, 3000);
        sc.absence.internalReviewerRole = /Internal Reviewer/i.test(rolesText || '');
        await snap(page, 'abs-roles');
        // the manager's editorial dashboard views
        await page.goto(ctxUrl(sc.A, '/dashboard/editorial')); await idle(page);
        await snap(page, 'abs-dashboard');
        save();
        log('[absence]', app.name, JSON.stringify(sc.absence).slice(0, 1500));
        await signOut(page);
    });
    // OMP control for the roles list
    if (isOMP && on('absence')) await sect('absence-omp', async () => {
        await signInAs('mgr');
        await page.goto(ctxUrl(sc.A, '/management/settings/access')); await idle(page);
        const rb = page.locator('#roles-button');
        if (await rb.count()) { await rb.click(); await idle(page); await page.waitForTimeout(1500); await idle(page); }
        const rolesText = await page.locator('main').first().innerText().catch(() => null);
        sc.rolesOMP = flat(rolesText, 3000); save();
        await snap(page, 'abs-roles');
        await signOut(page);
    });

    record(`k1-calls-${PHASES.join('-').slice(0, 60)}`, {calls, jsDialogs});
    await close();
});
