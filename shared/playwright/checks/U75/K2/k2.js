// U75 claim check, chunk K2 — the wizard's "Relation status" question and Review
// panel, the notice on the preprint page and its "Preview", the "Post the
// preprint" window's "Related Publication" line, Crossref (Setting 2, Rules 10
// and 11) and the OJS/OMP absence paragraph (docs/process/briefs/claim-check.md).
//
//   PROBE_FEATURE=U75 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U75/K2/k2.js
//   PHASES=wizard,relset,… re-runs named phases on the saved scratch contexts
//   (state in k2-state-<app>.json in the agent's output folder; FRESH=1 reseeds).
//
// Phases (OPS unless marked):
//   seed      scratch server A (defaults + DOI prefix), D (install defaults), X (Crossref);
//             OJS/OMP: one scratch journal/press for the absence controls
//   wizard    the Author's wizard: "For Readers" question, each answer, the Review
//             panel and its "Edit", a bare DOI, the step left with an unsaved change
//   wizsubmit the screen-started draft given a galley and submitted with the question unanswered;
//             its "Relations" and "Post" window afterwards
//   relset    "Relations" set by the manager on T1..T3, V (posted), N
//   post      "Post" › the window's "Related Publication" line on T1..T4 (manager),
//             T1 as the assigned Moderator; each window closed without posting
//   preview   "Preview" on T1, T2, T3 (manager), T1 as Author and Moderator
//   versions  V: a second version "not published elsewhere", posted
//   reader    signed out: V v1 (older version), V v2, N, Z never answered / "not published"
//   zero      "not entered" saved explicitly on Z (page) and T4 (Post window)
//   dois      X: Setting 2 reads, "Mark DOIs Registered", a relation save, the
//             status after; "Unpost" as control; "Export DOIs" with/without relation
//   repost    X: R1 posted again ("Needs Sync" control for Rule 11)
// Order matters on a fresh seed: wizard, wizsubmit, relset, post, preview, versions,
// reader, zero, dois, repost (the default order below).
//   absence   OJS/OMP: wizard, workflow publication page, article/book page
//
// No assertions: every screen is recorded with screen(); facts per app in
// k2-facts-<app>.json.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ONLY = process.env.PHASES ? process.env.PHASES.split(',') : null;
const on = (p) => !ONLY || ONLY.includes(p);
const T = 30000;
const DOI_URL = 'https://doi.org/10.1234/elsewhere';
const LABEL = {
    unknown: "This preprint's relations have not been entered.",
    none: 'This preprint has not been published elsewhere.',
    published: 'This preprint has been published elsewhere.',
};
const flat = (s, n = 400) => String(s && s.message ? s.message : s).replace(/\s+/g, ' ').slice(0, n);

forEachApp(async (app) => {
    const isOPS = app.name === 'ops';
    const stateFile = path.join(outDir(), `k2-state-${app.name}.json`);
    let S = (!process.env.FRESH && fs.existsSync(stateFile)) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : null;
    const save = () => fs.writeFileSync(stateFile, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k2-facts', {[k]: v}, {merge: true}); console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };

    // ------------------------------------------------------------------ seed
    async function mkCtx(key, extra = {}) {
        const t = tag(`u75k2${key.toLowerCase()}`);
        const roles = [['mg', ['manager'], 'Mira', 'Manager'], ['se', ['sectionEditor'], 'Mo', 'Moderator'], ['au', ['author'], 'Ari', 'Author']];
        const res = await app.api.createContext({tag: t, context: {name: `U75 K2 ${key} ${t}`, acronym: 'K2', contactName: 'K2 Contact',
            contactEmail: `${t}c@mail.test`, country: 'CA'}, users: roles.map(([u, r, g, f]) => ({username: `${t}${u}`, roles: r, givenName: g, familyName: f})), ...extra});
        return {path: res.path || t, id: res.contextId, u: Object.fromEntries(roles.map(([u]) => [u, `${t}${u}`])), subs: {}};
    }
    async function mkSub(C, key, spec) {
        const title = spec.title || `K2 ${key} ${C.path}`;
        const res = await app.api.createSubmission({tag: `${C.path}${key.toLowerCase()}`, context: C.path, submitter: C.u.au, title,
            participants: [{username: C.u.se, role: 'sectionEditor'}], ...spec});
        C.subs[key] = {id: res.submissionId, pub: res.publicationId, title};
        return C.subs[key];
    }
    if (!S) {
        S = {};
        const galley = isOPS ? {galleys: [{label: 'PDF', file: 'preprint.pdf'}]} : {};
        if (isOPS) {
            S.A = await mkCtx('A', {doiPrefix: '10.1234'});
            await mkSub(S.A, 'W', {submitted: false, title: 'K2 Wizard draft'});
            for (const k of ['T1', 'T2', 'T3', 'T4']) await mkSub(S.A, k, {...galley, title: `K2 ${k} unposted`});
            for (const k of ['V', 'N', 'Z']) await mkSub(S.A, k, {...galley, published: true, title: `K2 ${k} posted`});
            S.D = await mkCtx('D');
            S.X = await mkCtx('X', {doiPrefix: '10.1234', plugins: {crossrefplugin: {enabled: true, settings: {depositorName: 'K2 Depositor', depositorEmail: 'k2dep@mail.test'}}},
                registrationAgency: 'crossrefplugin'});
            await mkSub(S.X, 'R1', {...galley, published: true, title: 'K2 R1 with relation'});
            await mkSub(S.X, 'R2', {...galley, published: true, title: 'K2 R2 without relation'});
        } else {
            S.A = await mkCtx('A');
            await mkSub(S.A, 'W', {submitted: false, title: 'K2 Wizard draft', participants: []});
            await mkSub(S.A, 'S', {title: 'K2 S submitted'});
            await mkSub(S.A, 'P', {published: true, title: 'K2 P published'});
        }
        save();
        fact('seed', S);
    }

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push({type: d.type(), message: d.message(), at: page.url().replace(/^https?:\/\/[^/]+/, '')}); await d.accept().catch(() => {}); });
    const snap = async (name, extra) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e, 200)}; }
        record(name, extra ? {...s, extra} : s);
        await shot(page, name).catch(() => {});
        return s;
    };
    const as = async (C, k) => { await signIn(page, C.u[k], {contextPath: C.path}); await idle(page).catch(() => {}); };
    const visitor = async () => { await signOut(page).catch(() => {}); };
    const wfUrl = (C, sid, pub, author) => app.url(`/index.php/${C.path}/en/dashboard/${author ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${sid}${pub ? `&workflowMenuKey=publication_${pub}_titleAbstract` : ''}`);
    const wf = () => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
    const openWf = async (C, sub, {pub, author} = {}) => {
        await page.goto(wfUrl(C, sub.id, pub === null ? null : (pub || sub.pub), author));
        await wf().locator('[data-cy="sidemodal-header"]').waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !/Loading|Refreshing data/.test((document.querySelector('[data-cy="sidemodal-header"]') || {}).innerText || ''), null, {timeout: 15000}).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(800);
    };
    const controls = async () => page.evaluate(() => {
        const h = [...document.querySelectorAll('h2')].find((x) => /^(Preprint|Publication)\b/i.test(x.innerText.trim()));
        const region = h ? h.parentElement : null;
        return {heading: h ? h.innerText.trim() : null, regionText: region ? region.innerText.replace(/\s+/g, ' ').slice(0, 300) : null,
            buttons: [...document.querySelectorAll('[role="dialog"] button')].filter((b) => b.getClientRects().length).map((b) => b.innerText.trim()).filter(Boolean)};
    }).catch((e) => ({err: flat(e, 200)}));
    const sect = async (name, fn) => {
        if (!on(name)) return;
        console.log(`[${app.name}] == ${name}`);
        try { await fn(); } catch (e) { fact(`${name}.FAILED`, flat(e.stack || e, 1200)); await snap(`zz-failed-${name}`).catch(() => {}); }
        if (dialogs.length) { fact(`${name}.dialogs`, dialogs.splice(0)); }
    };

    // "Relations" on the open workflow page: pick a status, type a DOI (or not), Save.
    const relBox = () => page.locator('.pkpWorkflow__publicationRelation');
    const relButton = () => page.getByRole('button', {name: 'Relations', exact: true}).first();
    async function readRelations() {
        return page.evaluate(() => {
            const radios = [...document.querySelectorAll('input[name="relationStatus"]')].filter((r) => r.getClientRects().length);
            const doi = [...document.querySelectorAll('input[name="vorDoi"]')].find((r) => r.getClientRects().length);
            return {radios: radios.map((r) => ({label: (r.closest('label') || r.parentElement).innerText.trim(), checked: r.checked})),
                doi: doi ? doi.value : null, errors: [...document.querySelectorAll('.pkpWorkflow__publicationRelation .pkpFieldError, .pkpDropdown__content .pkpFieldError')].map((e) => e.innerText.trim())};
        }).catch((e) => ({err: flat(e, 200)}));
    }
    async function setRelation(status, doi, name) {
        const out = {};
        if (!(await page.locator('input[name="relationStatus"]:visible').count())) { await relButton().click(); await sleep(700); }
        out.before = await readRelations();
        await page.getByRole('radio', {name: LABEL[status], exact: true}).first().check();
        await sleep(300);
        if (doi !== undefined) {
            const f = page.locator('input[name="vorDoi"]:visible').first();
            if (await f.count()) await f.fill(doi);
            else out.noDoiBox = true;
        }
        const w = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 20000}).catch(() => null);
        await page.locator('.pkpDropdown__content:visible, .pkpWorkflow__publicationRelation').getByRole('button', {name: 'Save', exact: true}).first().click();
        const resp = await w;
        out.status = resp ? resp.status() : null;
        await sleep(1000);
        out.after = await readRelations();
        out.statusLine = await page.locator('.pkpFormPage__status, [role="status"]').allInnerTexts().then((a) => a.map((x) => x.trim()).filter(Boolean)).catch(() => []);
        if (name) await snap(name, out);
        // close the dropdown with its own button
        if (await page.locator('input[name="relationStatus"]:visible').count()) { await relButton().click().catch(() => {}); await sleep(400); }
        return out;
    }

    // The "Post" window: its text, the "Related Publication" table and its link; closed without posting.
    async function readPost(name) {
        const out = {};
        const post = page.getByRole('button', {name: 'Post', exact: true}).first();
        out.offered = await post.count();
        if (!out.offered) { await snap(`${name}-no-post`); return out; }
        await post.click();
        const dlg = page.getByRole('dialog').filter({hasText: 'Related Publication'}).last();
        await dlg.waitFor({timeout: T}).catch(() => {});
        await sleep(1000);
        out.window = await dlg.evaluate((d) => {
            const table = [...d.querySelectorAll('table')].find((t) => /Related Publication/.test(t.innerText));
            return {title: (d.querySelector('h1,h2,[class*="title"]') || {}).innerText || null, text: d.innerText.replace(/\s+/g, ' ').trim().slice(0, 1500),
                table: table ? {head: [...table.querySelectorAll('th')].map((x) => x.innerText.trim()), rows: [...table.querySelectorAll('tbody tr')].map((x) => x.innerText.trim()),
                    links: [...table.querySelectorAll('a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel')}))} : null,
                buttons: [...d.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean)};
        }).catch((e) => ({err: flat(e, 200)}));
        await snap(name, out);
        await loc(page, 'Post the preprint window: "Related Publication" table', dlg.locator('table').filter({hasText: 'Related Publication'}));
        const cancel = dlg.getByRole('button', {name: /^(Cancel|Close)$/}).first();
        if (await cancel.count()) await cancel.click().catch(() => {});
        await sleep(900);
        out.closedWith = await cancel.count() ? 'Cancel/Close' : 'none';
        out.stillOpen = await page.getByRole('dialog').filter({hasText: 'Related Publication'}).count();
        return out;
    }

    // The preprint page: notices, their order against the label line and the title, links.
    const PAGE_PARTS = () => {
        const root = document.querySelector('.obj_preprint_details') || document.body;
        const seq = [...root.querySelectorAll('.cmp_notification, .preprint_label, h1.page_title, h1')]
            .map((e) => (e.matches('.cmp_notification') ? `notice: ${e.innerText.replace(/\s+/g, ' ').trim()}` : e.matches('.preprint_label') ? `label: ${e.innerText.trim()}` : `title: ${e.innerText.trim()}`));
        const notices = [...document.querySelectorAll('.cmp_notification')].map((n) => ({cls: n.className, text: n.innerText.replace(/\s+/g, ' ').trim(),
            lines: n.innerText.split('\n').map((x) => x.trim()).filter(Boolean),
            links: [...n.querySelectorAll('a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href'), target: a.getAttribute('target')}))}));
        const body = document.body.innerText;
        return {seq, notices, elsewhereAnywhere: /published elsewhere|DOI of the published preprint/i.test(body), url: location.pathname + location.search};
    };
    async function readPage(url, name, p = page) {
        const resp = await p.goto(url).catch((e) => ({err: flat(e, 200)}));
        await idle(p).catch(() => {});
        const d = await p.evaluate(PAGE_PARTS).catch((e) => ({err: flat(e, 200)}));
        d.status = resp && typeof resp.status === 'function' ? resp.status() : resp;
        if (p === page) await snap(name, d); else { record(name, {...(await screen(p).catch(() => ({}))), extra: d}); await shot(p, name).catch(() => {}); }
        return d;
    }

    try {
        // ============================================================ wizard (OPS): Rule 7, A5, Cross-feature 220-223
        if (isOPS) await sect('wizard', async () => {
            const C = S.A;
            const W = C.subs.W;
            const out = {};
            const cur = () => page.locator('.pkpSteps__step__label--current');
            const cont = async (label) => {
                const b = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
                for (let a = 0; ; a++) { await b.click(); try { await cur().filter({hasText: label}).waitFor({timeout: 8000}); await idle(page).catch(() => {}); return; } catch (e) { if (a >= 2) throw e; } }
            };
            const toReview = async () => {
                const validated = page.waitForResponse((r) => r.url().includes('/submit') || r.url().includes('/publications/'), {timeout: 20000}).catch(() => null);
                await cont('Review');
                await validated;
                await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
                await sleep(800);
            };
            const panel = () => page.locator('.submissionWizard__reviewPanel').filter({has: page.locator('h3#review-relation')});
            const readPanel = async () => panel().evaluate((p) => ({heading: p.querySelector('h3').innerText.trim(), text: p.querySelector('.submissionWizard__reviewPanel__body').innerText.replace(/\s+/g, ' ').trim(),
                links: [...p.querySelectorAll('.submissionWizard__reviewPanel__body a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel')})),
                buttons: [...p.querySelectorAll('button')].map((b) => b.innerText.trim())})).catch((e) => ({err: flat(e, 200)}));
            const readStep = async () => page.evaluate(() => {
                const sec = [...document.querySelectorAll('.pkpFormGroup, fieldset, .submissionWizard__section, .pkpForm')].find((x) => /Relation status/.test(x.innerText) && x.querySelector('input[name="relationStatus"]'));
                const radios = [...document.querySelectorAll('input[name="relationStatus"]')];
                const doi = document.querySelector('input[name="vorDoi"]');
                const lgd = [...document.querySelectorAll('legend, .pkpFormFieldLabel, h2, h3')].filter((e) => /Relation status/.test(e.innerText)).map((e) => ({tag: e.tagName, text: e.innerText.replace(/\s+/g, ' ').trim()}));
                return {section: sec ? sec.innerText.replace(/\s+/g, ' ').trim().slice(0, 800) : null, labels: lgd,
                    radios: radios.map((r) => ({label: (r.closest('label') || r.parentElement).innerText.trim(), checked: r.checked, value: r.value})),
                    doi: doi ? {visible: doi.getClientRects().length > 0, value: doi.value} : null,
                    errors: [...document.querySelectorAll('.pkpFieldError')].map((e) => e.innerText.trim()),
                    stepTitles: [...document.querySelectorAll('.submissionWizard__stepHeader, h2')].map((h) => h.innerText.trim()).slice(0, 8)};
            });
            const railGo = async (label) => {
                if (await page.locator('.pkpSteps--collapsed').count()) await page.locator('.pkpSteps__controls button').click().catch(() => {});
                await page.locator('button.pkpSteps__step__label').filter({hasText: new RegExp(`${label}$`)}).first().click();
                await cur().filter({hasText: label}).waitFor({timeout: 8000}).catch(() => {});
                await idle(page).catch(() => {}); await sleep(500);
            };
            const backToForReaders = async () => {
                await panel().getByRole('button', {name: 'Edit'}).click(); await sleep(1000);
                const errDlg = page.getByRole('dialog').filter({hasText: 'An unexpected error has occurred'});
                if (await errDlg.count()) { await errDlg.first().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {}); await sleep(700); }
                if (!/For Readers/.test(await cur().innerText().catch(() => ''))) await railGo('For Readers');
            };
            await as(C, 'au');
            // a draft started on screen: the question as a new submission first shows it
            if (!W.screenDraft) {
                await page.goto(app.url(`/index.php/${C.path}/en/submission`));
                await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
                await idle(page);
                const body = page.frameLocator('iframe.tox-edit-area__iframe').first().locator('body');
                await body.click(); await body.fill('K2 screen-started draft');
                for (const box of [page.getByRole('checkbox', {name: /meets all of these requirements/}), page.getByRole('checkbox', {name: /agree to have my data collected/})]) if (await box.count()) await box.check();
                const radios = await page.getByRole('radio').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked})));
                for (const n of [...new Set(radios.map((r) => r.name))]) if (!radios.some((r) => r.name === n && r.checked)) await page.locator(`input[type=radio][name="${n}"]`).first().check();
                await page.getByRole('button', {name: 'Begin Submission'}).click();
                await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45000});
                W.screenDraft = Number(new URL(page.url()).searchParams.get('id'));
                save();
            }
            await page.goto(app.url(`/index.php/${C.path}/en/submission?id=${W.screenDraft}`));
            await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
            await idle(page); await sleep(500);
            await cont('Details');
            const abs = page.frameLocator('iframe[id*="-abstract-"]').first().locator('body');
            if (await page.locator('iframe[id*="-abstract-"]').count()) { if (!(await abs.innerText().catch(() => '')).trim()) { await abs.click(); await abs.fill('K2 abstract.'); } }
            await cont('Contributors');
            await cont('For Readers');
            out.screenDraftForReaders = await readStep();
            await snap('w-00-screen-draft-for-readers', out.screenDraftForReaders);
            await toReview();
            out.screenDraftReview = await readPanel();
            await snap('w-00b-screen-draft-review', {panel: out.screenDraftReview});
            await page.goto(app.url(`/index.php/${C.path}/en/submission?id=${W.id}`));
            await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
            await idle(page); await sleep(500);
            out.rail = await page.locator('.pkpSteps__step__label').allInnerTexts();
            out.startStep = await cur().innerText().catch(() => null);
            await snap('w-01-start', {rail: out.rail});
            await cont('Details');
            await cont('Contributors');
            await cont('For Readers');
            out.forReaders = await readStep();
            await snap('w-02-for-readers-default', out.forReaders);
            await loc(page, 'wizard For Readers: "Relation status" radios', page.locator('input[name="relationStatus"]'));
            await loc(page, 'wizard For Readers: "published elsewhere" radio', page.getByRole('radio', {name: LABEL.published, exact: true}));
            // 1) as the step opens (default), straight to Review
            await toReview();
            out.reviewDefault = await readPanel();
            out.submitBtn = await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).isDisabled().catch(() => null);
            out.reviewErrors = await page.locator('.submissionWizard__reviewPanel').filter({hasText: /required|error/i}).allInnerTexts().catch(() => []);
            await snap('w-03-review-default', {panel: out.reviewDefault, submitDisabled: out.submitBtn});
            await loc(page, 'wizard Review: "Relation status" panel', panel());
            // 2) the panel's Edit (and, as controls, the "License" and "For Readers" panels' Edit)
            const H3 = {'Relation status': 'h3#review-relation', License: 'h3#review-license', 'For Readers': 'h3#revieweditors'};
            const pressEdit = async (h3text) => {
                const p = page.locator('.submissionWizard__reviewPanel').filter({has: page.locator(H3[h3text])}).first();
                const errs = [];
                const onErr = (e) => errs.push(flat(e, 200));
                page.on('pageerror', onErr);
                await p.getByRole('button', {name: 'Edit'}).first().click();
                await sleep(1500);
                page.off('pageerror', onErr);
                const errDlg = page.getByRole('dialog').filter({hasText: 'An unexpected error has occurred'});
                const o = {step: await cur().innerText().catch(() => null), url: page.url().replace(/^https?:\/\/[^/]+/, ''), pageErrors: errs,
                    errorDialog: await errDlg.count() ? (await errDlg.first().innerText()).replace(/\s+/g, ' ').trim() : null};
                if (o.errorDialog) {
                    await snap(`w-04-edit-error-${h3text.replace(/\W+/g, '').toLowerCase()}`, o);
                    await errDlg.first().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                    await sleep(700);
                }
                return o;
            };
            out.afterEdit = await pressEdit('Relation status');
            await snap('w-04-after-edit', out.afterEdit);
            // the raw page as served: the step id each Review panel's Edit opens
            out.rawOpenStep = await page.request.get(page.url()).then((r) => r.text()).then((h) => [...h.matchAll(/aria-describedby="(review-[^"]+)"[\s\S]{0,160}?openStep\('([^']*)'\)/g)].map((m) => `${m[1]} -> '${m[2]}'`)).catch((e) => flat(e, 200));
            if (!/For Readers/.test(out.afterEdit.step || '')) {
                out.afterEditLicense = await pressEdit('License');
                if (!/Review/.test(out.afterEditLicense.step || '')) await railGo('Review');
                out.afterEditForReaders = await pressEdit('For Readers');
                await snap('w-04b-after-edit-controls', {license: out.afterEditLicense, forReaders: out.afterEditForReaders, raw: out.rawOpenStep});
                if (!/For Readers/.test(out.afterEditForReaders.step || '')) await railGo('For Readers');
            }
            // 3) published elsewhere, no DOI
            await page.getByRole('radio', {name: LABEL.published, exact: true}).check();
            await sleep(400);
            out.publishedPicked = await readStep();
            await snap('w-05-published-picked', out.publishedPicked);
            await toReview();
            out.reviewPublishedNoDoi = await readPanel();
            await snap('w-06-review-published-nodoi', {panel: out.reviewPublishedNoDoi});
            // 4) a bare DOI
            await backToForReaders();
            await page.locator('input[name="vorDoi"]').fill('10.1234/elsewhere');
            const wBare = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
            await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click();
            const rb = await wBare;
            await sleep(1500);
            out.bareDoi = {save: rb ? rb.status() : null, step: await cur().innerText().catch(() => null), errors: await page.locator('.pkpFieldError').allInnerTexts().catch(() => []),
                notices: await page.locator('.pkpFormPage__status, .pkpForm__errors, [role="alert"]').allInnerTexts().catch(() => [])};
            {
                const errDlg = page.getByRole('dialog').filter({hasText: 'An unexpected error has occurred'});
                out.bareDoi.errorDialog = await errDlg.count() ? (await errDlg.first().innerText()).replace(/\s+/g, ' ').trim() : null;
                await snap('w-07-bare-doi-continue', out.bareDoi);
                if (out.bareDoi.errorDialog) { await errDlg.first().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {}); await sleep(900); }
                out.bareDoi.afterOk = {step: await cur().innerText().catch(() => null), panel: /Review/.test(await cur().innerText().catch(() => '')) ? await readPanel() : null};
                await snap('w-07b-bare-doi-after-ok', out.bareDoi.afterOk);
            }
            if (!/For Readers/.test(await cur().innerText().catch(() => ''))) await railGo('For Readers');
            out.bareDoi.backAtStep = await readStep();
            await snap('w-07c-bare-doi-back-at-step', out.bareDoi.backAtStep);
            // 5) the full address
            await page.locator('input[name="vorDoi"]').fill(DOI_URL);
            await toReview();
            out.reviewPublishedDoi = await readPanel();
            await snap('w-08-review-published-doi', {panel: out.reviewPublishedDoi});
            await loc(page, 'wizard Review: relation panel link "published"', panel().locator('a'));
            // the link's click: new tab or same tab
            try {
                const popP = page.context().waitForEvent('page', {timeout: 5000}).catch(() => null);
                await panel().locator('a').first().click({modifiers: []});
                const pop = await popP;
                out.linkClick = {newTab: !!pop, popupUrl: pop ? pop.url() : null, pageUrl: page.url().replace(/^https?:\/\/[^/]+/, '')};
                if (pop) await pop.close().catch(() => {});
            } catch (e) { out.linkClick = {err: flat(e, 200)}; }
            // 6) not published elsewhere
            await backToForReaders();
            await page.getByRole('radio', {name: LABEL.none, exact: true}).check();
            out.nonePicked = await readStep();
            await toReview();
            out.reviewNone = await readPanel();
            await snap('w-09-review-none', {panel: out.reviewNone, step: out.nonePicked});
            // 7) not entered, picked back
            await backToForReaders();
            await page.getByRole('radio', {name: LABEL.unknown, exact: true}).check();
            await toReview();
            out.reviewUnknown = await readPanel();
            await snap('w-10-review-unknown', {panel: out.reviewUnknown});
            // 8) the reload read of Review
            await page.reload(); await idle(page).catch(() => {}); await sleep(1000);
            out.afterReload = {step: await cur().innerText().catch(() => null)};
            out.afterReload.rail = await page.locator('.pkpSteps__step__label').evaluateAll((els) => els.map((e) => `${e.tagName}:${e.innerText.trim()}`));
            await snap('w-11-after-reload', out.afterReload);
            await cont('Details'); await cont('Contributors'); await cont('For Readers');
            out.afterReload.forReaders = await readStep();
            await toReview();
            out.afterReload.panel = await readPanel();
            await snap('w-11b-after-reload-review', out.afterReload);
            // 9) the step left with an unsaved change: tick "published elsewhere" + DOI, then the rail's "Details"
            await backToForReaders();
            await page.getByRole('radio', {name: LABEL.published, exact: true}).check();
            await page.locator('input[name="vorDoi"]').fill('https://doi.org/10.1234/unsaved');
            const putsBefore = [];
            const listener = (r) => { if (r.request().method() !== 'GET' && /\/api\//.test(r.url())) putsBefore.push(`${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')} ${r.status()}`); };
            page.on('response', listener);
            await railGo('Details');
            out.leaveByRail = {step: await cur().innerText().catch(() => null), requests: putsBefore.slice(), dialogs: dialogs.slice()};
            await snap('w-12-left-by-rail', out.leaveByRail);
            await railGo('For Readers');
            out.leaveByRail.backAtForReaders = await readStep();
            await snap('w-13-back-at-for-readers', out.leaveByRail.backAtForReaders);
            // and a reload with the change still unsaved
            await page.getByRole('radio', {name: LABEL.none, exact: true}).check();
            await page.reload(); await idle(page).catch(() => {}); await sleep(1000);
            out.leaveByReload = {step: await cur().innerText().catch(() => null), requests: putsBefore.slice(), dialogs: dialogs.slice()};
            if (!/For Readers/.test(out.leaveByReload.step || '')) { await cont('Details'); await cont('Contributors'); await cont('For Readers'); }
            out.leaveByReload.state = await readStep();
            await snap('w-14-after-unsaved-reload', out.leaveByReload);
            page.off('response', listener);
            // leave the draft at "published elsewhere" + DOI, visible to the Review
            await page.getByRole('radio', {name: LABEL.published, exact: true}).check();
            await page.locator('input[name="vorDoi"]').fill(DOI_URL);
            await toReview();
            out.final = await readPanel();
            await snap('w-15-final-review', {panel: out.final});
            // 10) a saved "published elsewhere" + DOI, the page reloaded: what the step shows, and what its Continue sends
            await page.reload(); await idle(page).catch(() => {}); await sleep(1000);
            await cont('Details'); await cont('Contributors');
            const bodies = [];
            const onReq = (r) => { if (r.method() !== 'GET' && /\/publications\/\d+$/.test(r.url())) bodies.push(r.postData()); };
            page.on('request', onReq);
            await cont('For Readers');
            out.reloadSaved = {step: await readStep()};
            await snap('w-16-reload-saved-for-readers', out.reloadSaved);
            await toReview();
            page.off('request', onReq);
            out.reloadSaved.bodies = bodies.map((b) => (b || '').slice(0, 300));
            out.reloadSaved.panel = await readPanel();
            await snap('w-17-reload-saved-review', out.reloadSaved);
            await page.reload(); await idle(page).catch(() => {}); await sleep(800);
            await cont('Details'); await cont('Contributors'); await cont('For Readers'); await toReview();
            out.reloadSaved.panelAfterSecondPass = await readPanel();
            fact('wizard', out);
        });

        // ============================================================ wizsubmit (OPS): the screen-started draft submitted with the question never answered
        if (isOPS) await sect('wizsubmit', async () => {
            const C = S.A;
            const W = C.subs.W;
            const out = {};
            const cur = () => page.locator('.pkpSteps__step__label--current');
            const cont = async (label) => {
                const b = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
                for (let a = 0; ; a++) { await b.click(); try { await cur().filter({hasText: label}).waitFor({timeout: 8000}); await idle(page).catch(() => {}); return; } catch (e) { if (a >= 2) throw e; } }
            };
            await as(C, 'au');
            await page.goto(app.url(`/index.php/${C.path}/en/submission?id=${W.screenDraft}`));
            await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
            await idle(page); await sleep(500);
            const labelDialog = page.getByRole('dialog').filter({has: page.locator('#preprintGalleyForm')});
            for (let a = 0; ; a++) { await page.getByRole('link', {name: 'Add File', exact: true}).click(); try { await labelDialog.first().waitFor({timeout: 5000}); break; } catch (e) { if (a >= 2) throw e; } }
            await labelDialog.locator('input[name="label"]').fill('PDF');
            await labelDialog.getByRole('button', {name: 'Save', exact: true}).click();
            const upload = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});
            const g = upload.locator('select[name="genreId"]').first();
            await g.waitFor({timeout: T});
            await g.selectOption({label: 'Preprint Text'});
            await upload.locator('input[type="file"]').setInputFiles(path.resolve(__dirname, '../../../../../apps/ops/playwright/fixtures/files/preprint.pdf'));
            await page.waitForFunction(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => x.innerText.trim() === 'Continue'); return b && !b.disabled; }, null, {timeout: T});
            await upload.getByRole('button', {name: 'Continue', exact: true}).click();
            await upload.getByRole('tab', {name: '2. Review Details'}).waitFor({timeout: T});
            await upload.getByRole('button', {name: 'Continue', exact: true}).click();
            await upload.getByRole('tab', {name: '3. Confirm'}).waitFor({timeout: T});
            await upload.getByRole('button', {name: 'Complete', exact: true}).click();
            await upload.waitFor({state: 'hidden', timeout: T});
            await idle(page);
            await cont('Details'); await cont('Contributors'); await cont('For Readers');
            out.step = await page.locator('input[name="relationStatus"]').evaluateAll((els) => els.map((e) => e.checked));
            const v = page.waitForResponse((r) => r.url().includes('/submit'), {timeout: 20000}).catch(() => null);
            await cont('Review');
            const vr = await v;
            out.validate = vr ? {status: vr.status(), body: await vr.text().then((t) => t.slice(0, 500)).catch(() => null)} : null;
            await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
            await sleep(800);
            out.review = (await page.locator('.submissionWizard').innerText()).replace(/\s+/g, ' ').slice(0, 1800);
            const submit = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true});
            out.submitDisabled = await submit.isDisabled();
            await snap('w-20-unanswered-review', out);
            if (!out.submitDisabled) {
                await submit.click();
                const d = page.getByRole('dialog').filter({hasText: /will be submitted to|Are you sure you want to (complete|submit)/});
                await d.waitFor({timeout: T});
                await d.getByRole('button', {name: 'Submit', exact: true}).click();
                await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45000}).catch(() => {});
                await snap('w-21-unanswered-submitted');
                out.submitted = true;
                // the workflow's "Relations" and the "Post" window on that preprint, as the manager
                await as(C, 'mg');
                const sub = {id: W.screenDraft};
                await openWf(C, sub, {pub: null});
                const pubKey = await page.evaluate(() => { const a = [...document.querySelectorAll('a')].find((x) => /Title & Abstract/.test(x.innerText)); return a ? a.innerText : null; });
                await page.getByRole('link', {name: 'Title & Abstract', exact: true}).first().click().catch(() => {});
                await idle(page).catch(() => {}); await sleep(1000);
                await relButton().click(); await sleep(700);
                out.workflowRelations = await readRelations();
                await snap('w-22-unanswered-workflow-relations', out.workflowRelations);
                await relButton().click().catch(() => {}); await sleep(300);
                out.post = await readPost('w-23-unanswered-post-window');
                W.screenSubmitted = true; save();
            }
            fact('wizsubmit', out);
        });

        // ============================================================ relset (OPS): the states the reader, Post and Preview reads need
        if (isOPS) await sect('relset', async () => {
            const C = S.A;
            const out = {};
            await as(C, 'mg');
            const plan = [['T1', 'published', DOI_URL], ['T2', 'published', ''], ['T3', 'none', undefined], ['V', 'published', DOI_URL], ['N', 'published', '']];
            for (const [k, st, doi] of plan) {
                await openWf(C, C.subs[k]);
                if (k === 'T1') { await snap('r-00-t1-control-region', await controls()); await loc(page, 'workflow control region: "Relations"', relButton()); }
                out[k] = await setRelation(st, doi, `r-${k.toLowerCase()}-saved`);
                // reload read
                await openWf(C, C.subs[k]);
                await relButton().click(); await sleep(700);
                out[k].reload = await readRelations();
                await relButton().click().catch(() => {}); await sleep(300);
            }
            // A6/A4 premise on the same box: a bare DOI on T3's twin (Z stays for the reader's before/after)
            fact('relset', out);
            S.relset = true; save();
        });

        // ============================================================ post (OPS): Rule 9, td8
        if (isOPS) await sect('post', async () => {
            const C = S.A;
            const out = {};
            await as(C, 'mg');
            for (const k of ['T1', 'T2', 'T3', 'T4']) {
                await openWf(C, C.subs[k]);
                out[k] = await readPost(`p-${k.toLowerCase()}-post-window-mg`);
                if (k === 'T1' && out[k].window && out[k].window.table && out[k].window.table.links.length) {
                    // the link pressed: new tab or same tab
                    await page.getByRole('button', {name: 'Post', exact: true}).first().click();
                    const dlg = page.getByRole('dialog').filter({hasText: 'Related Publication'}).last();
                    await dlg.waitFor({timeout: T});
                    const popP = page.context().waitForEvent('page', {timeout: 6000}).catch(() => null);
                    await dlg.locator('table a').first().click().catch(() => {});
                    const pop = await popP;
                    out.T1.linkClick = {newTab: !!pop, popupUrl: pop ? pop.url() : null, pageUrl: page.url().replace(/^https?:\/\/[^/]+/, '')};
                    if (pop) await pop.close().catch(() => {});
                    const c = dlg.getByRole('button', {name: /^(Cancel|Close)$/}).first();
                    if (await c.count()) await c.click().catch(() => {});
                    await sleep(800);
                }
                // after closing: still unposted?
                await openWf(C, C.subs[k]);
                out[k].statusAfterClose = await page.locator('text=/Status:/').first().evaluate((e) => e.parentElement.innerText.replace(/\s+/g, ' ').trim()).catch(() => null);
            }
            // the assigned Moderator
            await as(C, 'se');
            await openWf(C, C.subs.T1);
            await snap('p-t1-control-region-se', await controls());
            out.T1se = await readPost('p-t1-post-window-se');
            fact('post', out);
        });

        // ============================================================ preview (OPS): Rule 8's last sentence, td7 end
        if (isOPS) await sect('preview', async () => {
            const C = S.A;
            const out = {};
            const doPreview = async (who, k, name, author) => {
                await openWf(C, C.subs[k], {author});
                const btn = wf().getByRole('button', {name: 'Preview', exact: true}).or(wf().getByRole('link', {name: 'Preview', exact: true}));
                const o = {offered: await btn.count()};
                if (!o.offered) { await snap(`${name}-no-preview`, await controls()); return o; }
                const popP = page.context().waitForEvent('page', {timeout: 8000}).catch(() => null);
                await btn.last().click();
                const pop = await popP;
                const target = pop || page;
                await target.waitForLoadState('domcontentloaded').catch(() => {});
                await idle(target).catch(() => {}); await sleep(800);
                o.newTab = !!pop;
                o.parts = await target.evaluate(PAGE_PARTS).catch((e) => ({err: flat(e, 200)}));
                if (pop) { record(name, {...(await screen(pop).catch(() => ({}))), extra: o}); await shot(pop, name).catch(() => {}); await pop.close().catch(() => {}); } else await snap(name, o);
                return o;
            };
            await as(C, 'mg');
            for (const k of ['T1', 'T2', 'T3', 'T4']) out[`${k}mg`] = await doPreview('mg', k, `v-${k.toLowerCase()}-preview-mg`);
            await as(C, 'se');
            out.T1se = await doPreview('se', 'T1', 'v-t1-preview-se');
            await as(C, 'au');
            out.T1au = await doPreview('au', 'T1', 'v-t1-preview-au', true);
            fact('preview', out);
        });

        // ============================================================ versions (OPS): V gets a second version "not published elsewhere", posted
        if (isOPS) await sect('versions', async () => {
            const C = S.A;
            const V = C.subs.V;
            const out = {};
            // the reader's read of v1 alone first (td7 first part)
            await visitor();
            out.v1Alone = await readPage(app.url(`/index.php/${C.path}/en/preprint/view/${V.id}`), 'x-01-v-v1-alone-visitor');
            await as(C, 'mg');
            await openWf(C, V);
            await page.getByRole('link', {name: 'Create New Version', exact: true}).click();
            const d = page.getByRole('dialog').filter({hasText: /Confirm/}).last();
            await d.getByRole('button', {name: 'Confirm', exact: true}).waitFor({timeout: T});
            await sleep(1000);
            await snap('x-02-create-version-window');
            const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
            await d.getByRole('button', {name: 'Confirm', exact: true}).click();
            const resp = await created;
            out.versionStatus = resp.status();
            V.pub2 = (await resp.json().catch(() => ({}))).id;
            save();
            await sleep(1500);
            await openWf(C, V, {pub: V.pub2});
            await relButton().click(); await sleep(700);
            out.v2Inherited = await readRelations();
            await snap('x-03-v2-relations-inherited', out.v2Inherited);
            await relButton().click().catch(() => {}); await sleep(300);
            out.v2Set = await setRelation('none', undefined, 'x-04-v2-set-none');
            // Post v2
            await openWf(C, V, {pub: V.pub2});
            const post = page.getByRole('button', {name: 'Post', exact: true}).first();
            await post.click();
            const dlg = page.getByRole('dialog').filter({hasText: 'Related Publication'}).last();
            await dlg.waitFor({timeout: T}); await sleep(800);
            out.v2PostWindow = await dlg.evaluate((x) => x.innerText.replace(/\s+/g, ' ').trim().slice(0, 1200)).catch(() => null);
            await snap('x-05-v2-post-window', {text: out.v2PostWindow});
            const posted = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()), {timeout: T});
            await dlg.getByRole('button', {name: 'Post', exact: true}).last().click();
            out.v2PostStatus = (await posted).status();
            await sleep(1500);
            await openWf(C, V, {pub: V.pub2});
            await snap('x-06-v2-posted');
            fact('versions', out);
        });

        // ============================================================ reader (OPS): Rule 8, td7
        if (isOPS) await sect('reader', async () => {
            const C = S.A;
            const out = {};
            const u = (id, pub) => app.url(`/index.php/${C.path}/en/preprint/view/${id}${pub ? `/version/${pub}` : ''}`);
            await visitor();
            const V = C.subs.V;
            if (V.pub2) {
                out.Vv1 = await readPage(u(V.id, V.pub), 'y-01-v-v1-older-visitor');
                out.Vv2 = await readPage(u(V.id, V.pub2), 'y-02-v-v2-visitor');
                out.Vcurrent = await readPage(u(V.id), 'y-03-v-current-visitor');
            }
            out.N = await readPage(u(C.subs.N.id), 'y-04-n-published-nodoi-visitor');
            out.Zunknown = await readPage(u(C.subs.Z.id), 'y-05-z-unknown-visitor');
            // the notice link's click: same tab or new
            try {
                await page.goto(u(V.id, V.pub)); await idle(page);
                const a = page.locator('.cmp_notification').filter({hasText: 'published elsewhere'}).locator('a').first();
                if (await a.count()) {
                    await loc(page, 'preprint page: relation notice link', a);
                    const popP = page.context().waitForEvent('page', {timeout: 5000}).catch(() => null);
                    const nav = page.waitForRequest((r) => r.isNavigationRequest(), {timeout: 5000}).catch(() => null);
                    await a.click({noWaitAfter: true}).catch(() => {});
                    const pop = await popP; const n = await nav;
                    out.noticeLinkClick = {newTab: !!pop, sameTabNavigation: n ? n.url() : null};
                    if (pop) await pop.close().catch(() => {});
                }
            } catch (e) { out.noticeLinkClick = {err: flat(e, 200)}; }
            // Z: "not published elsewhere" saved, then read again
            await as(C, 'mg');
            await openWf(C, C.subs.Z);
            out.Zset = await setRelation('none', undefined, 'y-06-z-set-none');
            await visitor();
            out.Znone = await readPage(u(C.subs.Z.id), 'y-07-z-none-visitor');
            // a signed-in reader level: the Author of V reads v1
            await as(C, 'au');
            out.Vv1au = await readPage(u(V.id, V.pub), 'y-08-v-v1-author');
            fact('reader', out);
        });

        // ============================================================ zero (OPS): "not entered" saved explicitly (stored 0, not the never-answered state)
        if (isOPS) await sect('zero', async () => {
            const C = S.A;
            const out = {};
            await as(C, 'mg');
            await openWf(C, C.subs.Z);
            out.Zset = await setRelation('unknown', undefined, 'z-01-z-set-unknown');
            await openWf(C, C.subs.T4);
            out.T4set = await setRelation('unknown', undefined, 'z-02-t4-set-unknown');
            await openWf(C, C.subs.T4);
            out.T4post = await readPost('z-03-t4-post-window-unknown-saved');
            await visitor();
            out.Zpage = await readPage(app.url(`/index.php/${C.path}/en/preprint/view/${C.subs.Z.id}`), 'z-04-z-unknown-saved-visitor');
            fact('zero', out);
        });

        // ============================================================ dois (OPS): Setting 2, Rules 10–11
        if (isOPS) await sect('dois', async () => {
            const out = {};
            const X = S.X;
            const D = S.D;
            // Setting 2 on D (install defaults)
            await as(D, 'mg');
            await page.goto(app.url(`/index.php/${D.path}/en/management/settings/distribution#dois`)); await idle(page); await sleep(1500);
            out.Dsetup = await page.evaluate(() => [...document.querySelectorAll('input[type=checkbox]')].filter((b) => b.getClientRects().length).map((b) => ({label: (b.closest('label') || b.parentElement).innerText.trim().slice(0, 120), checked: b.checked})));
            await snap('d-01-D-dois-setup', out.Dsetup);
            const regTab = page.getByRole('tab', {name: 'Registration', exact: true}).or(page.getByRole('button', {name: 'Registration', exact: true})).first();
            if (await regTab.count()) { await regTab.click(); await sleep(1200); }
            out.Dreg = await page.locator('[role="tabpanel"]:visible').last().innerText().then((s) => s.replace(/\s+/g, ' ').slice(0, 600)).catch(() => null);
            await snap('d-02-D-dois-registration', {text: out.Dreg});
            // X: the Registration tab with Crossref
            await as(X, 'mg');
            await page.goto(app.url(`/index.php/${X.path}/en/management/settings/distribution#dois`)); await idle(page); await sleep(1500);
            const regTabX = page.getByRole('tab', {name: 'Registration', exact: true}).or(page.getByRole('button', {name: 'Registration', exact: true})).first();
            if (await regTabX.count()) { await regTabX.click(); await sleep(1200); }
            out.Xreg = await page.locator('[role="tabpanel"]:visible').last().innerText().then((s) => s.replace(/\s+/g, ' ').slice(0, 800)).catch(() => null);
            out.XregSelect = await page.locator('select:visible').evaluateAll((els) => els.map((s) => ({name: s.name, value: s.value, selected: s.options[s.selectedIndex] && s.options[s.selectedIndex].text}))).catch(() => []);
            await snap('d-03-X-dois-registration', {text: out.Xreg, selects: out.XregSelect});
            // the DOIs page
            const gotoDois = async () => { await page.goto(app.url(`/index.php/${X.path}/en/dois`)); await idle(page); await page.locator('.listPanel__item--doi').first().waitFor({timeout: 15000}).catch(() => {}); await sleep(900); };
            const rows = async () => page.locator('.listPanel__item--doi:visible').evaluateAll((els) => els.map((e) => ({id: e.id, text: e.querySelector('.listPanel__itemSummary') && e.querySelector('.listPanel__itemSummary').innerText.replace(/\s+/g, ' ').trim()})));
            const rowOf = (id) => page.locator(`[id$="-${id}"].listPanel__item--doi:visible`).first();
            const bulk = async (label, ids, name) => {
                for (const id of ids) await rowOf(id).locator('input[type="checkbox"]').first().check();
                await page.locator('.doiListPanel:visible').getByRole('button', {name: 'Bulk Actions'}).click(); await sleep(400);
                await page.locator('.pkpDropdown__action:visible', {hasText: label}).first().click();
                const dlg = page.getByRole('dialog').filter({hasText: label}).last();
                await dlg.waitFor({timeout: 10000}).catch(() => {}); await sleep(400);
                await snap(`${name}-window`);
                const w = page.waitForResponse((r) => /\/dois/.test(r.url()) && r.request().method() !== 'GET', {timeout: 20000}).catch(() => null);
                const dl = page.waitForEvent('download', {timeout: 8000}).catch(() => null);
                await dlg.getByRole('button', {name: label, exact: true}).click();
                const resp = await w; const d = await dl;
                await idle(page).catch(() => {}); await sleep(1500);
                const o = {status: resp ? resp.status() : null, url: resp ? resp.url().replace(/^https?:\/\/[^/]+/, '') : null, download: d ? d.suggestedFilename() : null,
                    body: resp ? await resp.text().then((t) => t.slice(0, 400)).catch(() => null) : null,
                    dialog: await page.getByRole('dialog').allInnerTexts().then((a) => a.map((x) => x.replace(/\s+/g, ' ').trim().slice(0, 400))).catch(() => [])};
                await snap(`${name}-after`, o);
                const ok = page.getByRole('dialog').getByRole('button', {name: /^(OK|Ok|Close)$/}).first();
                if (await ok.count()) { await ok.click().catch(() => {}); await sleep(700); }
                return o;
            };
            await gotoDois();
            out.rows0 = await rows();
            await snap('d-04-X-dois-page', {rows: out.rows0});
            out.markReg = await bulk('Mark DOIs Registered', [X.subs.R1.id], 'd-05-mark-registered');
            await gotoDois();
            out.rows1 = await rows();
            await snap('d-06-X-after-registered', {rows: out.rows1});
            // a relation saved on R1
            await openWf(X, X.subs.R1);
            out.relSave = await setRelation('published', DOI_URL, 'd-07-R1-relation-saved');
            await gotoDois();
            out.rows2 = await rows();
            await snap('d-08-X-after-relation-save', {rows: out.rows2});
            await page.reload(); await idle(page); await sleep(1000);
            out.rows2reload = await rows();
            // Export DOIs: R1 (relation) and R2 (none)
            out.exportR1 = await bulk('Export DOIs', [X.subs.R1.id], 'd-09-export-R1');
            await gotoDois();
            out.exportR2 = await bulk('Export DOIs', [X.subs.R2.id], 'd-10-export-R2');
            // control: "Unpost" on R1 marks its DOI
            await openWf(X, X.subs.R1);
            const unpost = page.getByRole('button', {name: 'Unpost', exact: true}).first();
            if (await unpost.count()) {
                await unpost.click();
                const c = page.getByRole('dialog').filter({hasText: /unpost|Unpost/}).last();
                await c.waitFor({timeout: 10000}).catch(() => {});
                await snap('d-11-unpost-confirm');
                const w = page.waitForResponse((r) => /\/unpublish/.test(r.url()), {timeout: 20000}).catch(() => null);
                await c.getByRole('button', {name: /^(Unpost|Yes|OK)$/}).last().click().catch(() => {});
                const r = await w; out.unpostStatus = r ? r.status() : null;
                await sleep(1200);
            }
            await gotoDois();
            out.rows3 = await rows();
            await snap('d-12-X-after-unpost', {rows: out.rows3});
            fact('dois', out);
        });

        // ============================================================ repost (OPS): Rule 11's control — R1 posted again after "Unpost"
        if (isOPS) await sect('repost', async () => {
            const X = S.X;
            const out = {};
            await as(X, 'mg');
            await openWf(X, X.subs.R1);
            const post = page.getByRole('button', {name: 'Post', exact: true}).first();
            await post.click();
            const dlg = page.getByRole('dialog').filter({hasText: 'Related Publication'}).last();
            await dlg.waitFor({timeout: T}); await sleep(800);
            out.window = await dlg.evaluate((x) => x.innerText.replace(/\s+/g, ' ').trim().slice(0, 900)).catch(() => null);
            await snap('d-13-R1-repost-window', out);
            const posted = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()), {timeout: T});
            await dlg.getByRole('button', {name: 'Post', exact: true}).last().click();
            out.status = (await posted).status();
            await sleep(1500);
            await page.goto(app.url(`/index.php/${X.path}/en/dois`)); await idle(page); await sleep(1200);
            out.rows = await page.locator('.listPanel__item--doi:visible').evaluateAll((els) => els.map((e) => e.querySelector('.listPanel__itemSummary').innerText.replace(/\s+/g, ' ').trim()));
            await snap('d-14-X-after-repost', out);
            // the export screen: what a manager sees after "Export DOIs"
            fact('repost', out);
        });

        // ============================================================ absence (OJS, OMP): lines 29–32
        if (!isOPS) await sect('absence', async () => {
            const C = S.A;
            const out = {};
            // the wizard, as the Author
            await as(C, 'au');
            await page.goto(app.url(`/index.php/${C.path}/en/submission?id=${C.subs.W.id}`));
            await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
            await idle(page); await sleep(500);
            const cur = () => page.locator('.pkpSteps__step__label--current');
            out.rail = await page.locator('.pkpSteps__step__label').allInnerTexts();
            const cont = async (label) => {
                const b = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
                for (let a = 0; ; a++) { await b.click(); try { await cur().filter({hasText: label}).waitFor({timeout: 8000}); await idle(page).catch(() => {}); return; } catch (e) { if (a >= 2) throw e; } }
            };
            await cont('Details'); await cont('Contributors'); await cont('For the Editors');
            await sleep(600);
            out.editorsStep = {text: (await page.locator('.submissionWizard').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1500),
                relationRadios: await page.locator('input[name="relationStatus"]').count(), relationText: await page.getByText(/Relation status|published elsewhere/).count()};
            await snap('a-01-wizard-for-the-editors', out.editorsStep);
            await cont('Review');
            await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
            await sleep(800);
            out.reviewStep = {panels: await page.locator('.submissionWizard__reviewPanel h3, .submissionWizard__reviewPanel h2').allInnerTexts().catch(() => []),
                relationText: await page.getByText(/Relation status|published elsewhere/).count()};
            await snap('a-02-wizard-review', out.reviewStep);
            // the workflow's publication page, as the manager
            await as(C, 'mg');
            await openWf(C, C.subs.S);
            out.workflowS = {...(await controls()), relations: await page.getByRole('button', {name: /Relations/}).count()};
            await snap('a-03-workflow-publication-S', out.workflowS);
            await openWf(C, C.subs.P);
            out.workflowP = {...(await controls()), relations: await page.getByRole('button', {name: /Relations/}).count()};
            await snap('a-04-workflow-publication-P', out.workflowP);
            // the article / book page, signed out
            await visitor();
            const url = app.name === 'ojs' ? `/index.php/${C.path}/en/article/view/${C.subs.P.id}` : `/index.php/${C.path}/en/catalog/book/${C.subs.P.id}`;
            out.landing = await readPage(app.url(url), 'a-05-landing-visitor');
            fact('absence', out);
        });
    } finally {
        await close();
    }
});
