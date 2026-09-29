// U10 claim check, chunk I29 (housekeeping 2026-09-29): the incidental rows
// for U10 (row 34) and U41 (row 35) in docs/tracking/incidentals.md, on all
// three apps.
//
//   Row 34 (U10 Rule 3, Settings 27, footnotes j, y, td9): the long date a
//     French visitor reads on a book page and a chapter page (and the
//     catalog's list) {OMP}, on a press whose French "Date" was never saved
//     (default), then with French "Date" saved "j F Y" (other end). Second
//     axis: a press with French under "UI" only (no French form), English
//     "Date" saved "j F Y": what the French page prints. OJS article page and
//     OPS preprint page in French for the app scope (they print "Date
//     (Short)").
//   Row 35 (U41 Rule 14, Fields "Role Name", A13, fn-h): the contributor role
//     word a French visitor reads on the landing page, the "Contributor
//     Roles" screen's "Edit Role" French box, then the French name filled
//     and the page reloaded. Contexts: French forms (A), French UI only (B),
//     publicknowledge read-only.
//
// Each run seeds its own two scratch contexts (tag u10i29), signs in as the
// scratch manager for the screens and reads the public pages as a
// signed-out visitor in a second browser; every screen goes through screen().
//
//   RUN=r1 PROBE_FEATURE=U10 PROBE_AGENT=ccI29 node bin/probe.js <ojs|omp|ops> shared/playwright/checks/U10/I29/i29.js
//   PHASES=seed,read0,dates,roles (default all; the later phases need seed)
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const PHASES = (process.env.PHASES || 'seed,read0,dates,roles').split(',');
const on = (p) => PHASES.includes(p);
const RUN = process.env.RUN || 'r1';
const T = 30_000;
const REPO = path.join(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php/, '');

// the public item page as data: dates, the authors block, the role words
const ITEM = () => {
    const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
    const main = document.querySelector('.pkp_structure_main') || document.body;
    const authors = main.querySelector('.item.authors');
    return {
        docTitle: document.title,
        lang: document.documentElement.lang,
        h1: txt(main.querySelector('h1')),
        dates: [...main.querySelectorAll('.item.date_published, .item.published, .item.date, .date_published, .obj_monograph_summary .date, .obj_article_summary .published, .obj_preprint_summary .published')]
            .filter((e) => !e.parentElement.closest('.item.date_published, .item.published'))
            .map((e) => txt(e)).slice(0, 20),
        authorsHeading: authors ? [...authors.querySelectorAll('h2, h3, .label')].map((h) => `${h.classList.contains('pkp_screen_reader') ? '(sr)' : ''}${txt(h) || h.textContent.trim()}`) : null,
        authors: authors ? txt(authors) : null,
        roles: [...main.querySelectorAll('.contributor_roles .value, .contributor_roles')].map(txt),
        raw: [...new Set((document.body.innerText || '').match(/##[^#\s]+##/g) || [])],
        text: txt(main).slice(0, 1500),
    };
};

forEachApp(async (app) => {
    const isOmp = app.name === 'omp';
    const isOjs = app.name === 'ojs';
    const facts = {};
    const crashes = [];
    let curStep = '';
    function fact(key, value) {
        facts[key] = value;
        record(`facts-${RUN}`, {[key]: value}, {merge: true});
        console.log(`[fact ${app.name}] ${key}: ${JSON.stringify(value).slice(0, 2500)}`);
    }
    async function step(name, fn) {
        const out = {};
        curStep = name;
        const c0 = crashes.length;
        try {
            return await fn(out);
        } catch (e) {
            out.ERR = String((e && e.message) || e).split('\n').slice(0, 4).join(' | ');
            return null;
        } finally {
            if (crashes.length > c0) out.CRASHES = crashes.slice(c0);
            if (Object.keys(out).length) fact(name, out);
        }
    }
    async function post(route, body) {
        const r = await fetch(app.url(`/index.php/index/api/v1/_test/${route}`), {
            method: 'POST', headers: {'Content-Type': 'application/json', 'X-Test-Key': app.testApiKey}, body: JSON.stringify(body),
        });
        return {status: r.status, json: await r.json().catch(() => null)};
    }
    async function must(route, body) {
        const r = await post(route, body);
        if (r.status !== 200) throw new Error(`${route} ${r.status} ${JSON.stringify(r.json).slice(0, 500)}`);
        return r.json;
    }
    const ctxUrl = (P, p = '', lc = '') => app.url(`/index.php/${P}${lc ? `/${lc}` : ''}${p}`);
    const itemPath = (id) => (isOmp ? `/catalog/book/${id}` : isOjs ? `/article/view/${id}` : `/preprint/view/${id}`);
    const listPath = isOmp ? '/catalog' : isOjs ? '/issue/current' : '/preprints';

    const mg = await launch(app);
    const vs = await launch(app);
    const page = mg.page;
    const vis = vs.page;
    const jsDialogs = [];
    for (const [who, p] of [['mg', page], ['vis', vis]]) {
        p.on('dialog', async (d) => {
            jsDialogs.push({who, step: curStep, type: d.type(), message: flat(d.message(), 300), url: rel(p.url())});
            await d.accept().catch(() => {});
        });
        p.on('response', (r) => { if (r.status() >= 500) crashes.push({who, status: r.status(), method: r.request().method(), url: rel(r.url()).slice(0, 200)}); });
        p.on('pageerror', (e) => crashes.push({who, script: flat(e.message, 200), url: rel(p.url())}));
    }
    async function snap(pg, name, extra = {}) {
        const s = await screen(pg).catch((e) => ({screenError: String(e.message || e)}));
        record(`${RUN}-${name}`, {...s, ...extra});
        await shot(pg, `${RUN}-${name}`).catch(() => {});
        return s;
    }
    async function readItem(url, name) {
        let status = null;
        try { const r = await vis.goto(url); status = r ? r.status() : null; } catch (e) { status = flat(e.message, 120); }
        await idle(vis).catch(() => {});
        await snap(vis, name);
        const d = await vis.evaluate(ITEM).catch((e) => ({err: flat(e.message, 200)}));
        return {status, url: rel(vis.url()), ...d, text: undefined, textHead: d.text ? d.text.slice(0, 700) : undefined};
    }
    const asMgr = async (who, P) => { await signOut(page).catch(() => {}); await signIn(page, who, {contextPath: P}); await idle(page).catch(() => {}); };

    // ---- Settings › Website › Setup › Date & Time (as U10 K4)
    const openSide = async (P, urlPart, top, id) => {
        await page.goto(ctxUrl(P, urlPart));
        await idle(page);
        await page.locator(`#${top}-button`).first().click();
        await idle(page); await sleep(400);
        await page.locator(`#${id}-button`).first().click();
        await idle(page); await sleep(700);
        return page.locator(`[role="tabpanel"]#${id}`).first();
    };
    const dateTab = (P) => openSide(P, '/management/settings/website', 'setup', 'dateTime');
    const groupState = async (pn, group) => pn.locator(`input[type=radio][name="${group}"]`).evaluateAll((els) => els.map((e) => {
        const lab = e.closest('label'); return {value: e.value, checked: e.checked, label: lab ? lab.innerText.replace(/\s+/g, ' ').trim() : null};
    }));
    const checked = async (pn, group) => { const g = await groupState(pn, group); const c = g.find((x) => x.checked); return c ? `${c.value} (${c.label})` : `none of ${g.length}`; };
    const pick = async (pn, group, value) => { await pn.locator(`input[type=radio][name="${group}"][value="${value}"]`).first().check(); await sleep(400); };
    const locales = async (pn) => pn.locator('.pkpFormLocales button').allInnerTexts().catch(() => []);
    const toFrench = async (pn) => { const b = pn.locator('.pkpFormLocales button').filter({hasText: 'French'}).first(); if (!(await b.count())) return false; await b.click(); await sleep(500); return true; };
    const saveForm = async (root) => {
        const form = root.locator('form').first();
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 10_000}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).last().click({timeout: 8000});
        const r = await w;
        let body = null;
        try { body = r ? await r.json() : null; } catch { body = null; }
        const saved = await form.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 6000}).then(() => true).catch(() => false);
        const errors = await form.locator('.pkpFieldError').allInnerTexts().catch(() => []);
        return {status: r ? r.status() : null, saved, errors, dateFormatLong: body && body.dateFormatLong, dateFormatShort: body && body.dateFormatShort};
    };

    // ---- Settings › Workflow › Submission › Contributor Roles
    const rolesTab = (P) => openSide(P, '/management/settings/workflow', 'submission', 'contributorRoles');
    const roleRows = async (pn) => pn.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('th, td')].map((c) => c.innerText.trim()).filter(Boolean).join(' | ')));
    const roleWindow = () => page.getByRole('dialog').filter({hasText: /Role Name/}).last();
    const openEditRole = async (pn, name) => {
        const row = pn.locator('tbody tr').filter({has: page.locator('th', {hasText: new RegExp(`^\\s*${name}\\s*$`)})}).first();
        await row.getByRole('button', {name: 'More Actions'}).click();
        await sleep(300);
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const w = roleWindow();
        await w.waitFor({timeout: T});
        await idle(page); await sleep(800);
        return w;
    };
    const dumpWindow = async (w) => w.evaluate((el) => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
        return {
            title: txt(el.querySelector('h1, h2, [data-cy="sidemodal-header"]')),
            text: txt(el).slice(0, 1500),
            inputs: [...el.querySelectorAll('input, select, textarea')].map((i) => ({tag: i.tagName, name: i.name, id: i.id, type: i.type, value: i.value, visible: vis(i),
                label: (() => { const l = i.id && el.querySelector(`label[for="${i.id}"]`); return l ? txt(l) : null; })(),
                options: i.tagName === 'SELECT' ? [...i.options].map((o) => o.textContent.trim()) : undefined})),
            buttons: [...el.querySelectorAll('button')].filter(vis).map((b) => txt(b) || b.getAttribute('aria-label')),
        };
    });
    const frenchIn = async (w) => {
        const b = w.getByRole('button', {name: 'French', exact: true});
        if (!(await b.count())) return false;
        await b.first().click(); await sleep(500);
        return true;
    };
    const frBox = (w) => w.locator('input[name="name-fr_CA"]').first();
    const closeWindow = async (w) => {
        const c = w.getByRole('button', {name: 'Cancel', exact: true});
        if (await c.count()) await c.first().click(); else await w.getByRole('button', {name: /Close/}).first().click();
        await sleep(1200);
    };

    // ---- a second version (OMP, as U69 K5)
    async function openWorkflow(P, sid, menuKey) {
        await page.goto(ctxUrl(P, `/dashboard/editorial?workflowSubmissionId=${sid}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
        await idle(page);
        await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(600);
    }
    async function createVersion() {
        const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
        const wf = new WorkflowPage(page, null);
        const item = await wf.revealPublicationEntry('Create New Version');
        await wf.expectVersionLoaded();
        await item.click();
        const dlg = page.getByRole('dialog', {name: 'Create New Version'});
        await dlg.getByLabel('Publication Stage').waitFor({timeout: T});
        const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
        const resp = await created;
        const info = {status: resp.status(), id: (await resp.json().catch(() => ({}))).id};
        await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page);
        return info;
    }
    async function publishOnScreen() {
        const s = {};
        const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
        await btn.waitFor({state: 'visible', timeout: T});
        await sleep(600);
        await btn.click();
        const vsel = page.locator('select[name="versionStage"]');
        const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Publish', exact: true})}).last();
        const which = await Promise.race([
            vsel.waitFor({state: 'visible', timeout: 20_000}).then(() => 'stage'),
            confirm.waitFor({state: 'visible', timeout: 20_000}).then(() => 'confirm'),
        ]).catch(() => null);
        if (which === 'stage') {
            const opts = await vsel.locator('option').evaluateAll((os) => os.map((o) => ({v: o.value, t: o.textContent.trim()})));
            const p = opts.find((o) => /Version of Record/.test(o.t));
            if (p) await vsel.selectOption(p.v);
            await page.getByRole('button', {name: 'Confirm', exact: true}).last().click();
            await confirm.waitFor({state: 'visible', timeout: T});
        }
        await idle(page);
        const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T}).catch(() => null);
        await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
        const r = await done;
        s.status = r ? r.status() : null;
        await idle(page);
        return s;
    }

    const base = `${tag('u10i29')}${RUN.replace(/\W/g, '')}`.slice(0, 26);
    const A = `${base}a`;
    const B = `${base}b`;
    const S = {};

    try {
        // ------------------------------------------------ seed: A (French forms), B (French UI only)
        if (on('seed')) {
            for (const [P, forms] of [[A, true], [B, false]]) {
                await step(`seed-${P === A ? 'A' : 'B'}`, async (out) => {
                    const context = {name: {en: `I29 ${P}`}, acronym: 'IXX', supportedLocales: ['en', 'fr_CA']};
                    if (forms) context.supportedFormLocales = ['en', 'fr_CA'];
                    const spec = {tag: P, context, users: [
                        {username: `${P}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
                        {username: `${P}au`, roles: ['author'], givenName: 'Ada', familyName: 'Quillfeather'},
                    ]};
                    if (isOjs) spec.issues = [{volume: 1, number: 1, year: 2024, published: true}];
                    await must('scenarios/context', spec);
                    const sub = {tag: `${P}s1`, context: P, submitter: `${P}au`, title: 'I29 Dated Item', published: true, datePublished: '2024-03-05'};
                    if (isOjs) sub.issue = {volume: 1, number: 1, year: 2024};
                    if (isOmp) sub.chapters = [{title: 'Tides', page: true, authors: [`${P}au`]}];
                    const r = await must('scenarios/submission', sub);
                    S[P] = {id: r.submissionId, pub: r.publicationId, chapters: r.chapters};
                    out.P = P; out.forms = forms; out.item = S[P];
                });
            }
            note(`ccI29 [${app.name}] ${RUN}: A=${A} (French forms) B=${B} (French UI only), items ${JSON.stringify(S)}`);
            // OMP: a second version of A's book, published on screen, so the "updated" line shows
            if (isOmp && S[A]) {
                await step('seed-A-v2', async (out) => {
                    await asMgr(`${A}mg`, A);
                    await openWorkflow(A, S[A].id);
                    const v = await createVersion();
                    out.version = v;
                    await openWorkflow(A, S[A].id, `publication_${v.id}_titleAbstract`);
                    out.publish = await publishOnScreen();
                    await snap(page, 'a-v2-published');
                });
            }
        }
        const chapterId = (P) => {
            const c = (S[P] && S[P].chapters) || [];
            return c.length ? (c[0].id || c[0].chapterId) : null;
        };

        // the whole set of public reads for a context, both languages
        const readAll = async (P, label) => {
            const o = {};
            for (const lc of ['fr_CA', 'en']) {
                o[`item-${lc}`] = await readItem(ctxUrl(P, itemPath(S[P].id), lc), `${label}-item-${lc}`);
                if (isOmp && chapterId(P)) o[`chapter-${lc}`] = await readItem(ctxUrl(P, `${itemPath(S[P].id)}/chapter/${chapterId(P)}`, lc), `${label}-chapter-${lc}`);
                const l = await readItem(ctxUrl(P, listPath, lc), `${label}-list-${lc}`);
                o[`list-${lc}`] = {status: l.status, dates: l.dates, authorsLine: flat(l.textHead, 400)};
            }
            return o;
        };

        // ------------------------------------------------ read0: defaults, before any save
        if (on('read0') && S[A]) {
            await step('read0-A', async (out) => Object.assign(out, await readAll(A, 'r0-A')));
            await step('read0-B', async (out) => Object.assign(out, await readAll(B, 'r0-B')));
            await step('read0-pk', async (out) => {
                // publicknowledge, read-only: the first item the list links to, French and English
                await vis.goto(ctxUrl('publicknowledge', listPath, 'en')); await idle(vis);
                const href = await vis.locator(`a[href*="${isOmp ? '/catalog/book/' : isOjs ? '/article/view/' : '/preprint/view/'}"]`).first().getAttribute('href').catch(() => null);
                out.href = rel(href);
                const id = href ? href.match(/\/(\d+)(?:\/|$)/) : null;
                if (id) {
                    out.fr = await readItem(ctxUrl('publicknowledge', itemPath(id[1]), 'fr_CA'), 'r0-pk-item-fr_CA');
                    out.en = await readItem(ctxUrl('publicknowledge', itemPath(id[1]), 'en'), 'r0-pk-item-en');
                }
            });
        }

        // ------------------------------------------------ dates: Row 34
        if (on('dates') && S[A]) {
            await step('dates-A-tab', async (out) => {
                await asMgr(`${A}mg`, A);
                const pn = await dateTab(A);
                out.locales = await locales(pn);
                out.enLong = await checked(pn, 'dateFormatLong-en');
                out.enShort = await checked(pn, 'dateFormatShort-en');
                await snap(page, 'd-A-tab-en');
                await loc(page, 'Date & Time: language switch', pn.locator('.pkpFormLocales button'));
                out.fr = await toFrench(pn);
                out.frLongGroup = await groupState(pn, 'dateFormatLong-fr_CA');
                out.frShort = await checked(pn, 'dateFormatShort-fr_CA');
                out.frDateTimeLong = await checked(pn, 'datetimeFormatLong-fr_CA');
                await snap(page, 'd-A-tab-fr');
                await loc(page, 'Date & Time: French "Date" j F Y', pn.locator('input[type=radio][name="dateFormatLong-fr_CA"][value="j F Y"]'));
                // left once with a change unsaved: another side tab and back, then away and back
                await pick(pn, 'dateFormatLong-fr_CA', 'j F Y');
                out.frPicked = await checked(pn, 'dateFormatLong-fr_CA');
                out.frDateTimeLongAfterPick = await checked(pn, 'datetimeFormatLong-fr_CA');
                await page.locator('#lists-button').first().click(); await idle(page); await sleep(500);
                await page.locator('#dateTime-button').first().click(); await idle(page); await sleep(600);
                out.afterSideTabShownLocale = await pn.locator('.pkpFormLocales button[aria-pressed="true"], .pkpFormLocales button.pkpButton--isActive').allInnerTexts().catch(() => []);
                out.frAfterSideTab = await checked(pn, 'dateFormatLong-fr_CA');
                await snap(page, 'd-A-tab-back-from-lists');
                const d0 = jsDialogs.length;
                await page.goto(ctxUrl(A, '/management/settings/context')); await idle(page);
                out.leaveDialogs = jsDialogs.slice(d0);
                const pn2 = await dateTab(A);
                await toFrench(pn2);
                out.frAfterLeaving = await checked(pn2, 'dateFormatLong-fr_CA');
                // the save
                await pick(pn2, 'dateFormatLong-fr_CA', 'j F Y');
                out.save = await saveForm(pn2);
                out.samePage = {frLong: await checked(pn2, 'dateFormatLong-fr_CA'), enLong: await checked(pn2, 'dateFormatLong-en')};
                await snap(page, 'd-A-saved-same-page');
                const pn3 = await dateTab(A);
                out.reload = {enLong: await checked(pn3, 'dateFormatLong-en')};
                await toFrench(pn3);
                out.reload.frLong = await checked(pn3, 'dateFormatLong-fr_CA');
                out.reload.frShort = await checked(pn3, 'dateFormatShort-fr_CA');
                await snap(page, 'd-A-saved-reloaded-fr');
            });
            await step('dates-A-read', async (out) => Object.assign(out, await readAll(A, 'd1-A')));
            await step('dates-B-tab', async (out) => {
                await asMgr(`${B}mg`, B);
                const pn = await dateTab(B);
                out.locales = await locales(pn);
                out.enLong = await checked(pn, 'dateFormatLong-en');
                out.frGroup = (await groupState(pn, 'dateFormatLong-fr_CA')).length;
                await snap(page, 'd-B-tab');
                await pick(pn, 'dateFormatLong-en', 'j F Y');
                out.save = await saveForm(pn);
                const pn2 = await dateTab(B);
                out.reloadEnLong = await checked(pn2, 'dateFormatLong-en');
                await snap(page, 'd-B-saved-reloaded');
            });
            await step('dates-B-read', async (out) => Object.assign(out, await readAll(B, 'd1-B')));
        }

        // ------------------------------------------------ roles: Row 35
        if (on('roles') && S[A]) {
            for (const [P, label] of [[A, 'A'], [B, 'B']]) {
                await step(`roles-${label}-screen`, async (out) => {
                    await asMgr(`${P}mg`, P);
                    const pn = await rolesTab(P);
                    out.rows = await roleRows(pn);
                    await snap(page, `ro-${label}-list`);
                    await loc(page, 'Contributor Roles: a row\'s "More Actions"', pn.locator('tbody tr').first().getByRole('button', {name: 'More Actions'}));
                    const w = await openEditRole(pn, 'Author');
                    out.window = await dumpWindow(w);
                    await snap(page, `ro-${label}-edit-author`);
                    await loc(page, 'Edit Role window', roleWindow());
                    // the French box, if any, as the window shows it
                    const fr = w.locator('input[name*="fr_CA"], input[id*="fr_CA"]');
                    out.frBoxes = await fr.count();
                    if (P === A && out.frBoxes) {
                        out.frVisibleBefore = await frBox(w).isVisible();
                        await loc(page, 'Edit Role: the window\'s "French" language button', w.getByRole('button', {name: 'French', exact: true}));
                        out.frToggle = await frenchIn(w);
                        out.frVisibleAfter = await frBox(w).isVisible();
                        out.frValue = await frBox(w).inputValue();
                        await snap(page, `ro-${label}-edit-author-french`);
                        await loc(page, 'Edit Role: French "Role Name" box', frBox(w));
                        // left with a change unsaved
                        await frBox(w).fill('Auteur-e');
                        const d0 = jsDialogs.length;
                        await closeWindow(w);
                        out.cancelDialogs = jsDialogs.slice(d0);
                        out.cancelWindowOpen = await roleWindow().isVisible().catch(() => false);
                        out.rowsAfterCancel = await roleRows(pn);
                        const wR = await openEditRole(pn, 'Author');
                        out.frAfterCancel = await frBox(wR).inputValue();
                        out.enAfterCancel = await wR.locator('input[name="name-en"]').inputValue();
                        await frenchIn(wR);
                        await snap(page, `ro-${label}-reopened-after-close`);
                        await closeWindow(wR);
                        // the same window after a reload of the page: was the typed name kept anywhere?
                        const pnL = await rolesTab(P);
                        const w2 = await openEditRole(pnL, 'Author');
                        out.frAfterCloseReload = await frBox(w2).inputValue();
                        await snap(page, `ro-${label}-after-close-reload`);
                        // fill and save
                        await frenchIn(w2);
                        await frBox(w2).fill('Auteur-e');
                        const resp = page.waitForResponse((r) => /contributorRoles/.test(r.url()) && r.request().method() !== 'GET', {timeout: 10_000}).catch(() => null);
                        await w2.getByRole('button', {name: 'Save', exact: true}).click();
                        const r = await resp;
                        out.saveStatus = r ? r.status() : null;
                        await idle(page); await sleep(1000);
                        const s = await snap(page, `ro-${label}-saved`);
                        out.savedNotices = s.notices;
                        out.rowsSamePage = await roleRows(pnL);
                        const pn2 = await rolesTab(P);
                        out.rowsReloaded = await roleRows(pn2);
                        const w3 = await openEditRole(pn2, 'Author');
                        out.frReloaded = await frBox(w3).inputValue();
                        await snap(page, `ro-${label}-reloaded-edit`);
                        await closeWindow(w3);
                        // the other roles' French names as they arrived
                        out.otherFr = {};
                        for (const r of out.rows.map((x) => x.split(' | ')[0]).filter((x) => x !== 'Author')) {
                            const pnX = await rolesTab(P);
                            const wx = await openEditRole(pnX, r);
                            out.otherFr[r] = {en: await wx.locator('input[name="name-en"]').inputValue(), fr: await frBox(wx).inputValue()};
                            await closeWindow(wx);
                        }
                    } else {
                        await closeWindow(w);
                    }
                });
            }
            await step('roles-A-read', async (out) => {
                for (const lc of ['fr_CA', 'en']) {
                    const i = await readItem(ctxUrl(A, itemPath(S[A].id), lc), `ro-A-item-after-${lc}`);
                    out[`item-${lc}`] = {roles: i.roles, authorsHeading: i.authorsHeading, authors: i.authors};
                    const l = await readItem(ctxUrl(A, listPath, lc), `ro-A-list-after-${lc}`);
                    out[`list-${lc}`] = flat(l.textHead, 300);
                    if (isOmp && chapterId(A)) {
                        const c = await readItem(ctxUrl(A, `${itemPath(S[A].id)}/chapter/${chapterId(A)}`, lc), `ro-A-chapter-after-${lc}`);
                        out[`chapter-${lc}`] = {roles: c.roles, authorsHeading: c.authorsHeading, authors: c.authors};
                    }
                }
            });
            await step('roles-pk-screen', async (out) => {
                // publicknowledge, read-only: the list and the Author window, closed unsaved
                await asMgr('manager.maya', 'publicknowledge');
                const pn = await rolesTab('publicknowledge');
                out.rows = await roleRows(pn);
                await snap(page, 'ro-pk-list');
                const w = await openEditRole(pn, 'Author');
                out.window = await dumpWindow(w);
                await snap(page, 'ro-pk-edit-author');
                await closeWindow(w);
            });
        }
    } finally {
        fact('crashes', crashes);
        fact('jsDialogs', jsDialogs);
        await mg.close().catch(() => {});
        await vs.close().catch(() => {});
    }
});
