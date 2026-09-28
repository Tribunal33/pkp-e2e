// U13 claim check, housekeeping chunk I28 (2026-09-28): the incidental rows for U13 in
// .reports/hk28/chunks/U13.md.
//   L130b  (U27 row, from U45 claim check K2): "Mark as Complete" on a review with "Publicly Show Reviewer
//          Comments" ticked reads "This review will be made publicly visible alongside the article.", yet the
//          published article's page showed no review text. Lands at U13 (article page), pointer from U27 Rule 14a.
//   U50-I28 (from U50 claim check I28): after the issue's "Remove" unpublished an article's first version, its page
//          still reads "Published {v1 date} — Updated on {v2 date}" while "Versions" lists only the later one.
//          Lands at U13 Rule 7 (the date line) and Rule 8 ("Versions").
//
// Phases (PHASES=review,dates,control; default all, in that order), each seeding its own scratch context per RUN:
//   review  {OJS}  journal J1, review type "Open", public-visibility default off. Two articles in review, each with
//                  one completed Open review whose "For author and editor" text carries a unique token:
//                    R1  the row: "Edit" -> tick "Publicly Show Reviewer Comments" -> Save; "Read Review" ->
//                        "Mark as Complete"; "Accept Submission"; publish ("Don't Assign To An Issue")
//                    R2  control: the box left unticked, the rest the same
//                  The Edit window is left once with the box changed and unsaved (its Close). Reads of each
//                  article's page signed out, after a reload, as the journal's Reader and as its manager: the
//                  review token in the rendered text and in the page source, review words, /peerReviews traffic.
//   dates   {OJS OPS} context J2 (OJS: issue Vol. 1 No. 1 (2024) published). Articles (preprints) seeded published:
//                    A (OJS)  v1 in the issue, 2024-03-01; v2 created and published with "Don't Assign To An Issue";
//                             then the issue's "Table of Contents" "Remove" on A  <- the row
//                    C        v1 2024-03-03; v2 created and published (OJS keeping the issue); then v1 "Unpublish"
//                             ("Unpost") from its own workflow                     <- the ordinary route, other end
//                  The date line and "Versions" read before, between and after, signed out, and after a reload.
//   control {OMP OPS} read-only controls for the review half: OPS has no review; OMP's book page is read for the
//                  review token of a seeded, published book whose completed review is publicly shown.
// Run twice, each under its own facts name, a fresh scratch context per RUN:
//   RUN=r1 PROBE_FEATURE=U13 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U13/I28/i28.js
//   RUN=r2 …
// No assertions: the script records, the reader judges. Database reads (psql SELECT) are evidence only.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ALL = ['review', 'dates', 'control'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const T = 30_000;
const T0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const N = (name) => `${RUN}-${name}`;
const vis = '[role="dialog"]:visible';

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const log = (...a) => console.log(`[i28 ${RUN} ${app.name} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const sf = path.join(outDir(), `i28-state-${RUN}-${app.name}.json`);
    const S = (!process.env.RESEED && fs.existsSync(sf)) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i28-facts-${RUN}`, {[k]: v}, {merge: true}); log(`[${k}]`, JSON.stringify(v).slice(0, 2500)); };
    function db(q) {
        const cfg = fs.readFileSync(app.configFile, 'utf8');
        const sec = cfg.split(/^\[database\]/m)[1] || '';
        const get = (k) => ((sec.match(new RegExp(`^${k}\\s*=\\s*(.*)$`, 'm')) || [])[1] || '').trim().replace(/^"|"$/g, '');
        try {
            return execFileSync('psql', ['-h', get('host') || '127.0.0.1', '-U', get('username'), get('name'), '-At', '-F', '|', '-c', q],
                {env: {...process.env, PGPASSWORD: get('password')}, encoding: 'utf8', timeout: 20_000}).trim().split('\n').filter(Boolean);
        } catch (e) { return [`ERROR ${flat(e.message, 300)}`]; }
    }
    const dbPubs = (sid) => db(`select publication_id, status, version_stage, version_major, version_minor, ${isOJS ? 'issue_id' : "'-'"}, date_published from publications where submission_id=${sid} order by publication_id`);
    const dbReviews = (sid) => db(`select review_id, reviewer_id, review_method, is_review_publicly_visible, considered, date_completed is not null from review_assignments where submission_id=${sid} order by review_id`);
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php\//, '');
    const wfUrl = (ctx, sid, key) => cu(ctx, `/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);
    const itemPath = (sid, pub) => `${isOJS ? `/article/view/${sid}` : isOMP ? `/catalog/book/${sid}` : `/preprint/view/${sid}`}${pub ? `/version/${pub}` : ''}`;

    await app.api.bootstrapProbe(app.contextPath);

    // ------------------------------------------------------------------ browser
    const {page, close} = await launch(app);
    const jsDialogs = [], net = [], pageErrors = [];
    let dialogAnswer = null; // 'accept' | 'dismiss' | null (null: accept beforeunload, dismiss the rest)
    page.on('dialog', async (d) => {
        jsDialogs.push({at: Date.now(), type: d.type(), message: flat(d.message(), 300)});
        if (d.type() === 'beforeunload' || dialogAnswer === 'accept') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    page.on('response', (r) => { const u = r.url(); if (r.status() >= 400 || /\/api\//.test(u)) net.push({at: Date.now(), m: r.request().method(), u: strip(u).slice(0, 200), s: r.status()}); });
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), text: flat(e.message, 200), url: strip(page.url())}));
    const since = (arr, t0) => arr.filter((x) => x.at >= t0).map(({at, ...x}) => x);
    let snapN = S.snapN || 0;
    async function snap(name, extra, {png = true} = {}) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), text: {}, screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const n = N(`${String(++snapN).padStart(3, '0')}-${name}`);
        S.snapN = snapN; save();
        record(n, s);
        if (png) await shot(page, n).catch(() => {});
        s.name = `${n}-${app.name}`;
        return s;
    }
    async function sect(name, fn) {
        if (!on(name)) return;
        const t0 = Date.now();
        log(`== ${name}`);
        try { await fn(); } catch (e) {
            fact(`${name}.FAILED`, flat(e.stack || e, 1500));
            await snap(`zz-failed-${name}`).catch(() => {});
        }
        const b = since(net, t0).filter((r) => r.s >= 500), pe = since(pageErrors, t0);
        fact(`${name}.crashes`, {server: b, script: pe});
        const b4 = since(net, t0).filter((r) => r.s >= 400 && r.s < 500);
        if (b4.length) fact(`${name}.4xx`, b4.slice(0, 40));
        const d = since(jsDialogs, t0);
        if (d.length) fact(`${name}.dialogs`, d);
        save();
    }
    const go = async (url) => { const r = await page.goto(url).catch((e) => ({err: flat(e.message, 200)})); await idle(page).catch(() => {}); return r; };
    let who = null;
    const as = async (user, ctx) => { if (who === `${user}@${ctx}`) return; await signIn(page, user, {contextPath: ctx}); await idle(page).catch(() => {}); who = `${user}@${ctx}`; };
    const visitor = async () => { if (who === null) return; await signOut(page).catch(() => {}); await idle(page).catch(() => {}); who = null; };
    const wf = () => page.locator(vis).first();
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    async function openWf(ctx, sid, key) {
        await go(wfUrl(ctx, sid, key));
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await sleep(1200);
    }
    const wfButtons = async () => (await wf().getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean);

    // ------------------------------------------------------------------ seeds
    async function mkCtx(key, extra = {}, roles = []) {
        if (S[key]) return S[key];
        const t = tag(`u13i28${key.toLowerCase()}`).slice(0, 26) + RUN;
        const base = [['mg', ['manager'], 'Mona', 'Manager'], ['au', ['author'], 'Ada', 'Author'], ['rd', ['reader'], 'Rosa', 'Reader'], ...roles];
        const {context: cx = {}, ...rest} = extra;
        const res = await app.api.createContext({tag: t, context: {name: `U13 I28 ${key} ${t}`, acronym: 'I28J', contactName: 'Pat Principal', contactEmail: `${t}pc@mail.test`, country: 'CA', ...cx},
            users: base.map(([u, r, g, f]) => ({username: `${t}${u}`, roles: r, givenName: g, familyName: f})), ...rest});
        S[key] = {path: res.path || t, id: res.contextId, issues: res.issues || null, u: Object.fromEntries(base.map(([u]) => [u, `${t}${u}`])), subs: {}};
        save();
        fact(`seed-${key}`, {path: S[key].path, id: S[key].id, issues: S[key].issues});
        return S[key];
    }
    async function mkSub(C, key, spec) {
        if (C.subs[key]) return C.subs[key];
        const title = spec.title || `I28 ${key} ${C.path}`;
        try {
            const {submitter, ...r} = spec;
            const res = await app.api.createSubmission({tag: `${C.path}${key}`.slice(0, 32), context: C.path, submitter: submitter || C.u.au, title, ...r});
            C.subs[key] = {id: res.submissionId, pub: res.publicationId, title};
        } catch (e) {
            C.subs[key] = {error: flat(e.message, 500), title};
            log(`[seed ${key}]`, flat(e.message, 400));
        }
        save();
        return C.subs[key];
    }

    // ------------------------------------------------------------------ workflow actions (after U45 K2, U50 I28)
    async function decide(ctx, sid, button, name) {
        await openWf(ctx, sid);
        const out = {buttons: await wfButtons()};
        const b = page.getByRole('button', {name: button, exact: true}).last();
        if (!(await b.isVisible().catch(() => false))) { out.missing = button; await snap(`${name}-nobutton`); return out; }
        await b.click();
        await page.waitForURL(/decision/, {timeout: T}).catch(() => {});
        await idle(page);
        const cont = page.getByRole('button', {name: 'Continue', exact: true});
        const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
        out.steps = [];
        for (let i = 0; i < 6 && !(await rec.isVisible().catch(() => false)); i++) {
            await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await sleep(1500);
            out.steps.push(flat((await page.locator('main h2, main h1').allInnerTexts().catch(() => [])).join(' | '), 200));
            await cont.click().catch(() => {}); await idle(page);
        }
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await sleep(800);
        await snap(`${name}-last-step`);
        const wr = page.waitForResponse((x) => /decisions/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await rec.click();
        const rr = await wr;
        await sleep(2500); await idle(page);
        out.status = rr ? rr.status() : null;
        if (rr && rr.status() >= 400) out.body = flat(await rr.text().catch(() => ''), 400);
        await snap(name, {decide: out});
        return out;
    }
    async function fillVersion(scope) {
        for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
            const el = scope.locator(sel);
            if ((await el.count()) && (await el.isVisible().catch(() => false)) && !(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {});
        }
    }
    /** Publish the version open on the workflow. assign: 'none' ("Don't Assign To An Issue"), 'keep' (the panel's preselection). */
    async function publish(ctx, sid, pub, name, {assign = 'none'} = {}) {
        await openWf(ctx, sid, pub ? `publication_${pub}_titleAbstract` : null);
        const out = {};
        const button = controls().getByRole('button', {name: /^(Schedule For Publication|Publish|Post)$/}).first();
        await button.waitFor({state: 'visible', timeout: T}).catch(() => {});
        if (!(await button.isVisible().catch(() => false))) { out.noButton = await controls().getByRole('button').allInnerTexts().catch(() => []); await snap(`${name}-nobutton`); return out; }
        out.button = flat(await button.innerText(), 40);
        await sleep(800);
        await button.click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to|will not prevent publishing|following requirements/}).last();
        const which = () => Promise.race([
            panel.locator('select[name="versionStage"], input[name="assignment"]').first().waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
            confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm'),
        ]).catch(() => null);
        let opened = await which();
        if (!opened) { out.secondPress = true; await button.click({timeout: 5_000}).catch(() => {}); opened = await which(); }
        out.opened = opened;
        await idle(page); await sleep(800);
        if (opened === 'panel') {
            await sleep(2500); await idle(page);
            await fillVersion(panel);
            if (assign === 'none') {
                const none = panel.getByRole('radio', {name: /Don't Assign/i});
                if (await none.isVisible().catch(() => false)) await none.check().catch(() => {});
            }
            out.panel = flat(await panel.innerText().catch(() => ''), 900);
            await snap(`${name}-panel`);
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
            await confirm.waitFor({state: 'visible', timeout: T}).catch(() => {});
        }
        await idle(page); await sleep(800);
        await fillVersion(confirm);
        out.confirm = flat(await confirm.innerText().catch(() => ''), 900);
        await snap(`${name}-confirm`);
        const w = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await confirm.getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/}).last().click().catch((e) => { out.clickErr = flat(e.message, 150); });
        const r = await w;
        out.status = r ? r.status() : null;
        if (r && r.status() >= 400) out.body = flat(await r.text().catch(() => ''), 500);
        await controls().getByRole('button', {name: /^(Unpublish|Unpost|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        out.controls = await controls().getByRole('button').allInnerTexts().catch(() => []);
        await snap(name, {publish: out});
        return out;
    }
    async function unpublish(ctx, sid, pub, name) {
        await openWf(ctx, sid, `publication_${pub}_titleAbstract`);
        const out = {head: flat(await wf().innerText().catch(() => ''), 400)};
        await snap(`${name}-before`);
        const b = controls().getByRole('button', {name: /^(Unpublish|Unpost)$/}).first();
        if (!(await b.isVisible().catch(() => false))) { out.noButton = await controls().getByRole('button').allInnerTexts().catch(() => []); return out; }
        await b.click();
        const d = page.getByRole('dialog').filter({hasText: /don't want this to be|unpublish|unpost/i}).last();
        await d.waitFor({timeout: T}).catch(() => {});
        out.dialog = flat(await d.innerText().catch(() => ''), 300);
        await snap(`${name}-dialog`);
        const w = page.waitForResponse((r) => /\/unpublish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: /^(Unpublish|Unpost|OK|Yes)$/}).last().click().catch((e) => { out.clickErr = flat(e.message, 150); });
        const r = await w;
        out.status = r ? r.status() : null;
        await sleep(1500); await idle(page);
        out.controls = await controls().getByRole('button').allInnerTexts().catch(() => []);
        await snap(name, {unpublish: out});
        return out;
    }
    async function newVersion(ctx, sid, pub, name) {
        await openWf(ctx, sid, `publication_${pub}_titleAbstract`);
        const link = wf().getByRole('link', {name: 'Create New Version', exact: true}).or(wf().getByRole('button', {name: 'Create New Version', exact: true})).first();
        await link.waitFor({state: 'visible', timeout: T}).catch(() => {});
        if (!(await link.isVisible().catch(() => false))) { await snap(`${name}-nooffer`); return {offered: false}; }
        await sleep(1200);
        await link.click();
        const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
        await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
        await idle(page); await sleep(1000);
        await fillVersion(w);
        await snap(`${name}-window`);
        const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: 'Confirm', exact: true}).click();
        const resp = await r;
        let newPub = null;
        if (resp) { try { newPub = (await resp.json()).id; } catch { /* none */ } }
        await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page); await sleep(800);
        await snap(name);
        return {offered: true, status: resp && resp.status(), newPub};
    }

    // ------------------------------------------------------------------ the article page
    /** Read the item page (as whoever is signed in): date line, Versions, label line, headings, review words and tokens. */
    async function readItem(ctx, sid, pub, name, {tokens = [], reload = false} = {}) {
        const t0 = Date.now();
        const r = await go(cu(ctx, `/en${itemPath(sid, pub)}`));
        const status = r && typeof r.status === 'function' ? r.status() : r;
        let html = r && typeof r.text === 'function' ? await r.text().catch(() => '') : '';
        if (reload) { await page.reload().catch(() => {}); await idle(page); html = await page.content().catch(() => html); }
        const s = await snap(name);
        const d = await page.evaluate(() => {
            const f = (x) => (x || '').replace(/\s+/g, ' ').trim();
            const dl = document.querySelector('.item.published > .sub_item:not(.versions)');
            return {
                h1: f(document.querySelector('h1')?.innerText),
                dateLine: dl ? f(dl.innerText) : null,
                publishedBlock: f(document.querySelector('.item.published')?.innerText) || null,
                versions: [...document.querySelectorAll('.item.published .versions li')].map((li) => ({text: f(li.innerText), href: li.querySelector('a')?.getAttribute('href') || null})),
                label: f(document.querySelector('span.preprint_label')?.innerText) || null,
                notice: [...document.querySelectorAll('.cmp_notification')].map((n) => f(n.innerText)),
                headings: [...document.querySelectorAll('h1, h2, h3')].filter((h) => h.getClientRects().length && !h.classList.contains('pkp_screen_reader')).map((h) => f(h.innerText)).filter(Boolean),
                side: [...document.querySelectorAll('.entry_details > *')].map((e) => f(e.innerText).slice(0, 120)),
                main: [...document.querySelectorAll('.main_entry > *')].map((e) => f(e.innerText).slice(0, 120)),
                vueMounts: [...document.querySelectorAll('[data-v-app], pkp-open-review, pkp-open-review-summary')].map((e) => e.tagName + '.' + e.className).slice(0, 10),
            };
        }).catch((e) => ({error: flat(e.message, 200)}));
        const text = String((s.text && (s.text.main || s.text.body)) || '');
        const out = {status, url: strip(page.url()), title: s.title, ...d, snap: s.name,
            tokensShown: tokens.filter((t) => text.includes(t)), tokensInSource: tokens.filter((t) => html.includes(t)),
            reviewWordsShown: [...new Set((text.match(/[^.\n]*\b(peer[- ]review\w*|reviewer\w*|review report|open review|reviews?)\b[^.\n]*/gi) || []).map((x) => flat(x, 140)))].slice(0, 10),
            sourceHasOpenReviewConfig: /openReview|submissionPeerReviews|PkpOpenReview/.test(html),
            peerReviewTraffic: since(net, t0).filter((x) => /peerReviews/i.test(x.u)),
            bad: since(net, t0).filter((x) => x.s >= 400)};
        return out;
    }

    // ====================================================================== review (OJS): L130b
    await sect('review', async () => {
        if (!isOJS) return;
        const out = S.review = S.review || {};
        const J = await mkCtx('J1', {review: {defaultReviewMode: 'open', defaultReviewPublicVisibility: false}},
            [['rv1', ['externalReviewer'], 'Rhea', 'Openreviewer'], ['rv2', ['externalReviewer'], 'Ravi', 'Closedreviewer']]);
        const tok = (k) => `I28TOKEN${k}${J.path}`;
        const R1 = await mkSub(J, 'r1', {title: `I28 Public Review Article ${J.path}`, decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [{username: J.u.rv1, status: 'completed', comments: `Open review text ${tok('R1')} for the public.`}]}]});
        const R2 = await mkSub(J, 'r2', {title: `I28 Private Review Article ${J.path}`, decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [{username: J.u.rv2, status: 'completed', comments: `Open review text ${tok('R2')} kept private.`}]}]});
        if (R1.error || R2.error) { fact('review.seedError', {R1, R2}); return; }
        if (!out.seedDb) { out.seedDb = {R1: dbReviews(R1.id), R2: dbReviews(R2.id)}; fact('review.seedDb', out.seedDb); }
        await as(J.u.mg, J.path);
        const revRow = (n) => wf().getByRole('row').filter({hasText: n}).first();
        async function openEdit(sub, reviewer) {
            await openWf(J.path, sub.id);
            await revRow(reviewer).getByRole('button', {name: 'More Actions'}).click();
            await sleep(500);
            const items = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
            await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            const edit = page.getByRole('dialog').filter({has: page.locator('form#editReviewForm')});
            const box = edit.locator('input[name="isReviewPubliclyVisible"]');
            await box.waitFor({timeout: T}); await idle(page); await sleep(600);
            return {edit, box, items};
        }
        // the review stage as it arrives
        if (!out.stage) {
            await openWf(J.path, R1.id);
            const s = await snap('r1-review-stage');
            out.stage = {buttons: await wfButtons(), row: flat(await revRow('Rhea Openreviewer').innerText().catch(() => ''), 300), text: flat(s.text.dialog, 600)};
            save();
        }
        // sweep: the Edit window left once with the box changed and unsaved (its "Close")
        if (!out.leave) {
            const {edit, box, items} = await openEdit(R1, 'Rhea Openreviewer');
            const was = await box.isChecked();
            const label = flat(await edit.locator('form#editReviewForm').evaluate((f) => { const b = f.querySelector('input[name="isReviewPubliclyVisible"]'); const fs = b.closest('fieldset'); return fs ? fs.innerText : b.closest('label')?.innerText; }).catch(() => null), 400);
            const formText = flat(await edit.innerText().catch(() => ''), 1500);
            await snap('r1-edit-window', {was, label});
            await loc(page, 'Reviewer row "Edit" window: "Publicly Show Reviewer Comments" box', box);
            await box.check(); await box.blur().catch(() => {}); await sleep(400);
            const t0 = Date.now();
            dialogAnswer = 'dismiss';
            const closeBtn = edit.getByRole('button', {name: 'Close', exact: true}).first();
            await closeBtn.click().catch(() => {});
            await sleep(1200);
            const afterDismiss = {dialogs: since(jsDialogs, t0), stillOpen: await edit.isVisible().catch(() => false)};
            await snap('r1-edit-window-close-dismissed', afterDismiss);
            const t1 = Date.now();
            dialogAnswer = 'accept';
            if (afterDismiss.stillOpen) { await closeBtn.click().catch(() => {}); await sleep(1500); }
            dialogAnswer = null;
            const afterAccept = {dialogs: since(jsDialogs, t1), stillOpen: await edit.isVisible().catch(() => false)};
            await snap('r1-edit-window-closed', afterAccept);
            await sleep(600);
            const again = await openEdit(R1, 'Rhea Openreviewer');
            const reopened = await again.box.isChecked();
            await snap('r1-edit-window-reopened', {reopened});
            await again.edit.getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
            await sleep(800);
            out.leave = {menu: items, was, label, formText, afterDismiss, afterAccept, reopened, db: dbReviews(R1.id)};
            save();
            fact('review.editLeave', out.leave);
        }
        // R1: tick and save
        if (!out.tick) {
            const {edit, box} = await openEdit(R1, 'Rhea Openreviewer');
            await box.check();
            const t0 = Date.now();
            const w = page.waitForResponse((x) => x.request().method() === 'POST' && /updateReview|editReview|review/i.test(x.url()), {timeout: T}).catch(() => null);
            await edit.getByRole('button', {name: /^(Save|OK)$/}).first().click();
            await sleep(1200);
            const confirm = page.getByRole('dialog').filter({hasText: /Save changes|Are you sure/}).last();
            let confirmText = null;
            if (await confirm.isVisible().catch(() => false)) { confirmText = flat(await confirm.innerText(), 300); await confirm.getByRole('button', {name: /^(Save|OK|Yes|Confirm)/}).first().click().catch(() => {}); }
            const resp = await w;
            await sleep(1500); await idle(page);
            out.tick = {confirmText, status: resp ? resp.status() : null, traffic: since(net, t0), db: dbReviews(R1.id)};
            await snap('r1-edit-saved', out.tick);
            const again = await openEdit(R1, 'Rhea Openreviewer');
            out.tick.reopened = await again.box.isChecked();
            await again.edit.getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
            await sleep(800);
            save();
            fact('review.tick', out.tick);
        }
        // "Mark as Complete" on both (Review stage, before the accept)
        for (const [sub, reviewer, key] of [[R1, 'Rhea Openreviewer', 'c1'], [R2, 'Ravi Closedreviewer', 'c2']]) {
            if (out[key]) continue;
            await openWf(J.path, sub.id);
            const row = revRow(reviewer);
            const read = row.getByRole('button', {name: 'Read Review'});
            if (!(await read.count())) { out[key] = {noRead: true, row: flat(await row.innerText().catch(() => ''), 300)}; await snap(`${key}-noread`); save(); continue; }
            await read.click(); await idle(page); await sleep(1500);
            const rd = await snap(`${key}-review-details`);
            await page.getByRole('button', {name: 'Mark as Complete'}).last().click();
            await sleep(1000);
            const conf = page.getByRole('dialog').filter({hasText: 'Mark this review as complete?'});
            const confText = flat(await conf.innerText().catch(() => null), 500);
            await snap(`${key}-confirm`);
            const t0 = Date.now();
            if (await conf.count()) await conf.getByRole('button', {name: 'Mark as Complete'}).click();
            await sleep(2000); await idle(page);
            out[key] = {details: flat(rd.text.dialog, 900), confirm: confText, traffic: since(net, t0).filter((x) => x.m !== 'GET'), db: dbReviews(sub.id)};
            await snap(`${key}-completed`, out[key]);
            await openWf(J.path, sub.id);
            out[key].rowAfter = flat(await revRow(reviewer).innerText().catch(() => ''), 300);
            save();
            fact(`review.${key}`, out[key]);
        }
        // Accept, then publish, each article
        for (const [sub, k] of [[R1, 'R1'], [R2, 'R2']]) {
            if (!out[`${k}accept`]) { out[`${k}accept`] = await decide(J.path, sub.id, 'Accept Submission', `${k.toLowerCase()}-accept`); save(); fact(`review.${k}accept`, out[`${k}accept`]); }
            if (!out[`${k}pub`]) { out[`${k}pub`] = await publish(J.path, sub.id, sub.pub, `${k.toLowerCase()}-publish`); out[`${k}pub`].db = dbPubs(sub.id); save(); fact(`review.${k}pub`, out[`${k}pub`]); }
        }
        // Reads: visitor, reload, Reader, manager; both articles, both tokens on each
        const tokens = [tok('R1'), tok('R2')];
        const reads = {};
        await visitor();
        for (const [sub, k] of [[R1, 'R1'], [R2, 'R2']]) {
            reads[`${k}visitor`] = await readItem(J.path, sub.id, null, `${k.toLowerCase()}-page-visitor`, {tokens});
            reads[`${k}visitorReload`] = await readItem(J.path, sub.id, null, `${k.toLowerCase()}-page-visitor-reload`, {tokens, reload: true});
        }
        await loc(page, 'Article page: date line', page.locator('.item.published > .sub_item:not(.versions)'));
        await as(J.u.rd, J.path);
        for (const [sub, k] of [[R1, 'R1'], [R2, 'R2']]) reads[`${k}reader`] = await readItem(J.path, sub.id, null, `${k.toLowerCase()}-page-reader`, {tokens});
        await as(J.u.mg, J.path);
        for (const [sub, k] of [[R1, 'R1'], [R2, 'R2']]) reads[`${k}manager`] = await readItem(J.path, sub.id, null, `${k.toLowerCase()}-page-manager`, {tokens});
        // the journal's issue archive / search are not this row; the home page lists both (Latest Publications)
        await visitor();
        await go(cu(J.path, '/en'));
        const home = await snap('j1-home-visitor');
        reads.homeTokens = tokens.filter((t) => String(home.text.main || home.text.body || '').includes(t));
        out.reads = reads;
        out.finalDb = {R1: dbReviews(R1.id), R2: dbReviews(R2.id)};
        save();
        fact('review.reads', reads);
        fact('review.finalDb', out.finalDb);
    });

    // ====================================================================== dates (OJS, OPS): U50-I28 and the ordinary other end
    await sect('dates', async () => {
        if (isOMP) return;
        const out = S.dates = S.dates || {};
        const J = await mkCtx('J2', isOJS ? {issues: [{volume: 1, number: 1, year: 2024, published: true}]} : {});
        const issue = isOJS ? {issue: {volume: 1, number: 1, year: 2024}} : {};
        const subs = isOJS ? [['A', '2024-03-01'], ['C', '2024-03-03']] : [['C', '2024-03-03']];
        for (const [k, date] of subs) {
            await mkSub(J, k, {title: `${k} v1 article ${J.path}`, published: true, datePublished: date, ...issue});
        }
        if (Object.values(J.subs).some((s) => s.error)) { fact('dates.seedError', J.subs); return; }
        const read = async (k, label, opts = {}) => {
            const s = J.subs[k];
            const o = {page: await readItem(J.path, s.id, null, `${k}-${label}`, opts)};
            if (opts.reload) o.reloaded = await readItem(J.path, s.id, null, `${k}-${label}-reload`, {reload: true});
            o.v1 = await readItem(J.path, s.id, s.pub, `${k}-${label}-v1-page`);
            o.db = dbPubs(s.id);
            return o;
        };
        await visitor();
        if (!out.before) { out.before = {}; for (const [k] of subs) out.before[k] = await read(k, 'before'); save(); fact('dates.before', out.before); }
        // v2 created and published: A with "Don't Assign To An Issue", C keeping the panel's preselection
        await as(J.u.mg, J.path);
        for (const [k] of subs) {
            const s = J.subs[k];
            if (!s.v2) { const nv = await newVersion(J.path, s.id, s.pub, `${k}-new-version`); s.v2 = nv.newPub; s.nv = nv; save(); fact(`dates.${k}.newVersion`, nv); }
            if (!s.v2) continue;
            if (!s.v2pub) { s.v2pub = await publish(J.path, s.id, s.v2, `${k}-v2-publish`, {assign: k === 'A' ? 'none' : 'keep'}); save(); fact(`dates.${k}.v2publish`, s.v2pub); }
        }
        await visitor();
        if (!out.between) { out.between = {}; for (const [k] of subs) out.between[k] = await read(k, 'between'); save(); fact('dates.between', out.between); }
        // A: the issue's "Table of Contents" › "Remove" (OJS), the row
        if (isOJS && !out.remove) {
            await as(J.u.mg, J.path);
            const o = {};
            const issueId = J.issues && J.issues[0] && J.issues[0].id;
            await go(cu(J.path, '/manageIssues'));
            await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page);
            const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
            await panel.locator('table').first().waitFor({timeout: T});
            await idle(page); await sleep(500);
            await panel.getByRole('link', {name: 'Vol. 1 No. 1 (2024)', exact: true}).first().click();
            const dlg = page.getByRole('dialog', {name: /^Issue Management/});
            await dlg.waitFor({timeout: T}); await idle(page); await sleep(500);
            await dlg.getByRole('tab', {name: 'Table of Contents', exact: true}).click(); await idle(page);
            await dlg.getByRole('tabpanel', {name: 'Table of Contents'}).locator('table').first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await sleep(800);
            await snap('A-issue-toc-tab');
            const row = dlg.getByRole('tabpanel', {name: 'Table of Contents'}).locator('tr.gridRow').filter({hasText: `A v1 article ${J.path}`}).first();
            await row.waitFor({timeout: T}).catch(() => {});
            o.rowText = flat(await row.innerText().catch(() => ''), 200);
            const arrow = row.locator('a.show_extras');
            if (await arrow.count()) await arrow.click();
            const ctl = row.locator('xpath=following-sibling::tr[1]');
            await ctl.getByRole('link').first().waitFor({timeout: 10000}).catch(() => {});
            await ctl.getByRole('link', {name: 'Remove', exact: true}).click();
            const d = page.locator(vis).last();
            await d.waitFor({timeout: T}); await idle(page); await sleep(500);
            o.confirmText = flat(await d.innerText().catch(() => null), 500);
            await snap('A-remove-confirm');
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /remove-article|removeArticle/.test(r.url()), {timeout: T}).catch(() => null);
            await d.getByRole('button', {name: 'OK', exact: true}).click();
            const r = await w;
            o.status = r ? r.status() : null;
            o.body = r ? flat(await r.text().catch(() => null), 300) : null;
            await idle(page); await sleep(1200);
            await snap('A-remove-done');
            o.issueId = issueId;
            o.db = dbPubs(J.subs.A.id);
            out.remove = o; save();
            fact('dates.A.remove', o);
        }
        // C: v1 unpublished from its own workflow (the ordinary route)
        if (!out.unpub && J.subs.C.v2) {
            await as(J.u.mg, J.path);
            out.unpub = await unpublish(J.path, J.subs.C.id, J.subs.C.pub, 'C-v1-unpublish');
            out.unpub.db = dbPubs(J.subs.C.id);
            save();
            fact('dates.C.unpublish', out.unpub);
        }
        await visitor();
        out.after = {};
        for (const [k] of subs) out.after[k] = await read(k, 'after', {reload: true});
        save();
        fact('dates.after', out.after);
    });

    // ====================================================================== control (OMP, OPS): the review half on the other apps
    await sect('control', async () => {
        if (isOJS) return;
        const out = S.control = S.control || {};
        if (isOPS) {
            // no review stage: a posted preprint's page, read for review words (read-only, a scratch server)
            const J = await mkCtx('J3', {});
            const P = await mkSub(J, 'p', {title: `I28 Posted Preprint ${J.path}`, published: true});
            await visitor();
            out.page = P.error ? {seedError: P.error} : await readItem(J.path, P.id, null, 'ops-preprint-visitor');
            // a preprint server's workflow offers no review: the manager's view of the preprint
            if (!P.error) {
                await as(J.u.mg, J.path);
                await openWf(J.path, P.id);
                const s = await snap('ops-workflow-manager');
                out.workflowButtons = await wfButtons();
                out.workflowReviewWords = (String(s.text.dialog || '').match(/[^\n]*review[^\n]*/gi) || []).map((x) => flat(x, 120)).slice(0, 10);
            }
            save();
            fact('control.ops', out);
            return;
        }
        // OMP: a book with a completed, publicly shown Open review, published by the seed
        const J = await mkCtx('J4', {review: {defaultReviewMode: 'open', defaultReviewPublicVisibility: true}}, [['rv1', ['externalReviewer'], 'Rhea', 'Openreviewer']]);
        const token = `I28TOKENOMP${J.path}`;
        const B = await mkSub(J, 'b', {title: `I28 Open Review Book ${J.path}`, decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [{username: J.u.rv1, status: 'completed', comments: `Open review text ${token} for the public.`}]}], published: true});
        out.seed = B;
        if (!B.error) {
            out.db = dbReviews(B.id);
            await visitor();
            out.page = await readItem(J.path, B.id, null, 'omp-book-visitor', {tokens: [token]});
        }
        save();
        fact('control.omp', out);
    });

    fact('run.crashes', {server: net.filter((x) => x.s >= 500).map(({at, ...x}) => x), script: pageErrors.map(({at, ...x}) => x)});
    await close();
});
