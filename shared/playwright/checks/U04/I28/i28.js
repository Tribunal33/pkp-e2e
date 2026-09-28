// U04 claim check, housekeeping chunk I28 (2026-09-28): incidentals row L126 of
// docs/tracking/incidentals.md (.reports/hk28/chunks/U04.md): Administration › Site
// Settings, the "Plugiciel de profil ORCID" side tab, French interface, all three apps.
// Spec: docs/specs/U04-orcid-integration.md — Actors row 2, Fields (site-wide rows),
// Rules 1–3, register A9; footnote b.
//
// Seeds its own scratch context per run (en + fr_CA under "UI" and "Forms", ORCID on for
// the journal, so the install hosts more than one context and the site tab shows), with a
// throwaway manager and author, and four submissions (the author's contributor without
// an iD, or with an unauthenticated one). Phases:
//   site     admin: index/fr_CA/admin/settings › Site Setup › the ORCID side tab: the
//            box's label and description, the tab's name; ticked (unsaved), the fields it
//            reveals; "Enregistrer" with the ticked box and empty credentials (any site
//            write it tries is aborted, so the site-wide switch can never turn on); the
//            tab left once with the box ticked and unsaved (another side tab, then another
//            page) and read on return; "Enregistrer" on the untouched, unticked tab (the
//            site's ORCID rows read before and after). Control: the same at index/en.
//   journal  the scratch manager: Settings › Users & Roles › the ORCID tab, fr_CA and en.
//   contrib  the scratch manager: the workflow's Contributors › "Edit" on the author, the
//            ORCID iD field in French: the request button, its question (No, then Yes),
//            the field after and after a reload; an unauthenticated iD's note and its
//            Delete question (Yes), after and after a reload. Control: en, No only.
// Run twice, each under its own facts name (fresh scratch context per RUN):
//   RUN=r1 PROBE_FEATURE=U04 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U04/I28/i28.js
//   RUN=r2 …   (PHASES=site,journal,contrib narrows)
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ALL = ['site', 'journal', 'contrib'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 1500) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const log = (...a) => console.log(`[u04 i28 ${RUN}]`, ...a);
const N = (name) => `${RUN}-${name}`;
const CODES = (s) => [...new Set(String(s || '').match(/##[^#\s]+##/g) || [])];
const UNVERIFIED = 'https://orcid.org/0000-0002-1825-0097';

forEachApp(async (app) => {
    const sf = path.join(outDir(), `i28-state-${RUN}-${app.name}.json`);
    const S = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i28-facts-${RUN}`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const sql = (q) => {
        try { return execFileSync('psql', ['-d', app.db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim(); } catch (e) { return `SQL ERROR ${flat(e.stderr, 300)}`; }
    };
    const siteOrcid = () => sql("select setting_name, coalesce(locale,''), case when setting_name like '%Secret' then '(len ' || length(setting_value) || ')' else setting_value end from site_settings where setting_name like 'orcid%' order by 1, 2");

    // ------------------------------------------------------------------ seed
    if (!S.seeded) {
        const t = tag('u04i28');
        S.t = t;
        const c = await app.api.createContext({
            tag: t,
            context: {name: `U04 I28 ${t}`, acronym: 'UIV', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
            orcid: {enabled: true, apiType: 'publicSandbox'},
            users: [
                {username: `${t}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
                {username: `${t}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            ],
        });
        S.path = c.path || t; S.mg = `${t}mg`; S.au = `${t}au`; S.subs = {};
        for (const [k, author] of [['fr', null], ['frU', {orcid: UNVERIFIED, orcidIsVerified: false}], ['en', null], ['enU', {orcid: UNVERIFIED, orcidIsVerified: false}]]) {
            const r = await app.api.createSubmission({tag: `${t}${k}`, context: S.path, submitter: S.au, title: `U04 I28 ${k} ${t}`, ...(author ? {author} : {})});
            S.subs[k] = {id: r.submissionId, pub: r.publicationId};
        }
        S.seeded = true; save();
        fact('seed', {path: S.path, subs: S.subs, contexts: sql('select count(*) from ' + (app.name === 'ojs' ? 'journals' : app.name === 'omp' ? 'presses' : 'servers'))});
    }

    const {page, close} = await launch(app);
    const CR = [];
    const DIALOGS = [];
    const SITE_WRITES = [];
    page.on('response', (r) => { if (r.status() >= 500) CR.push(`server ${r.status()} ${r.request().method()} ${rel(r.url()).slice(0, 200)}`); });
    page.on('pageerror', (e) => CR.push(`script ${flat(e.message || e, 200)}`));
    page.on('dialog', (d) => { DIALOGS.push({type: d.type(), message: d.message()}); d.type() === 'beforeunload' ? d.accept().catch(() => {}) : d.dismiss().catch(() => {}); });
    page.on('request', (r) => { if (/\/api\/v1\/site/.test(r.url()) && r.method() !== 'GET') SITE_WRITES.push({method: r.method(), url: rel(r.url()), body: flat(r.postData(), 800)}); });

    const snap = async (name) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 300)}; }
        record(N(name), s);
        await shot(page, N(name)).catch(() => {});
        return s;
    };
    const facts = (panel) => panel.evaluate((p) => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => e.getClientRects().length > 0;
        return {
            fields: [...p.querySelectorAll('.pkpFormField, fieldset')].filter(vis).map((f) => ({
                label: txt(f.querySelector('.pkpFormFieldLabel, legend')),
                description: txt(f.querySelector('.pkpFormField__description')),
                options: [...f.querySelectorAll('label')].filter(vis).map(txt).filter(Boolean),
                controls: [...f.querySelectorAll('input, select, textarea')].filter(vis).map((c) => ({name: c.name, type: c.type, disabled: c.disabled, readOnly: c.readOnly, value: c.type === 'checkbox' ? c.checked : c.type === 'password' ? `(len ${c.value.length})` : (c.value || '').slice(0, 80), selected: c.tagName === 'SELECT' ? txt(c.selectedOptions[0]) : undefined})),
                errors: [...f.querySelectorAll('.pkpFieldError')].filter(vis).map(txt),
            })),
            buttons: [...p.querySelectorAll('button')].filter(vis).map((b) => ({t: txt(b), disabled: b.disabled})).filter((b) => b.t),
            status: [...p.querySelectorAll('.pkpFormPage__status, .pkpFormErrors, [role="status"]')].filter(vis).map(txt).filter(Boolean),
            text: txt(p).slice(0, 3000),
        };
    }).catch((e) => ({error: flat(e.message, 300)}));

    // Site Settings › Site Setup › the ORCID side tab, at a locale
    async function openSiteOrcid(locale) {
        await page.goto(app.url(`/index.php/index/${locale}/admin/settings`));
        await idle(page);
        const top = await snap(`s-${locale}-settings`);
        await page.locator('#setup-button').first().click();
        const sideTab = page.locator('#orcidSiteSettings-button').first();
        const tabFacts = {
            topTabs: (await page.locator('[role="tab"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 80)).filter(Boolean),
            sideTabPresent: await sideTab.count(),
            sideTabText: flat(await sideTab.innerText().catch(() => null), 120),
        };
        await sideTab.click();
        const panel = page.locator('[role="tabpanel"]#orcidSiteSettings').first();
        await panel.locator('input[type="checkbox"]').first().waitFor({timeout: T});
        await idle(page); await sleep(300);
        return {panel, tabFacts, topCodes: CODES(top.text && (top.text.main || ''))};
    }

    try {
        // ================================================================ site
        if (on('site')) {
            await signIn(page, 'admin');
            for (const locale of ['fr_CA', 'en']) {
                const R = {dbBefore: siteOrcid()};
                try {
                    const {panel, tabFacts, topCodes} = await openSiteOrcid(locale);
                    R.tab = tabFacts; R.pageCodesBeforeTab = topCodes;
                    const s1 = await snap(`s-${locale}-orcid`);
                    R.untouched = await facts(panel);
                    R.codes = CODES(R.untouched.text);
                    R.mainCodes = CODES(s1.text && s1.text.main);
                    await loc(page, `site ORCID side tab (${locale})`, page.locator('#orcidSiteSettings-button').first());
                    await loc(page, `site ORCID enable box (${locale})`, panel.locator('input[type="checkbox"][name="orcidEnabled"]'));
                    // tick (unsaved): the fields the group reveals
                    const box = panel.locator('input[type="checkbox"]').first();
                    await box.check();
                    await sleep(400);
                    await snap(`s-${locale}-orcid-ticked`);
                    R.ticked = await facts(panel);
                    R.tickedCodes = CODES(R.ticked.text);
                    // Save with empty credentials; any site write is aborted so the switch cannot turn on
                    const writes0 = SITE_WRITES.length;
                    await page.route('**/api/v1/site**', (route) => (route.request().method() === 'GET' ? route.continue() : route.abort()));
                    await panel.getByRole('button', {name: /^(Save|Enregistrer)$/}).first().click();
                    await sleep(1500);
                    await snap(`s-${locale}-orcid-ticked-save`);
                    R.tickedSave = {attemptedWrites: SITE_WRITES.slice(writes0), after: await facts(panel)};
                    await page.unroute('**/api/v1/site**');
                    // leave once: another side tab and back, then another page, then return
                    await page.locator('#info-button').first().click().catch(() => {});
                    await sleep(600);
                    await page.locator('#orcidSiteSettings-button').first().click();
                    await sleep(600);
                    R.backFromSideTab = {checked: await box.isChecked().catch(() => null)};
                    await snap(`s-${locale}-orcid-back`);
                    const d0 = DIALOGS.length;
                    await page.goto(app.url(`/index.php/index/${locale}/admin`)).catch((e) => { R.leaveErr = flat(e.message, 200); });
                    await idle(page).catch(() => {});
                    R.leaveDialogs = DIALOGS.slice(d0);
                    R.leftTo = rel(page.url());
                    await snap(`s-${locale}-left`);
                    const again = await openSiteOrcid(locale);
                    R.onReturn = {checked: await again.panel.locator('input[type="checkbox"]').first().isChecked(), db: siteOrcid()};
                    await snap(`s-${locale}-orcid-return`);
                    // Save on the untouched, unticked tab (French only): what the site keeps
                    if (locale === 'fr_CA' && !R.onReturn.checked) {
                        const w0 = SITE_WRITES.length;
                        const resp = page.waitForResponse((r) => /\/api\/v1\/site/.test(r.url()) && r.request().method() !== 'GET', {timeout: 10000}).catch(() => null);
                        await again.panel.getByRole('button', {name: /^(Save|Enregistrer)$/}).first().click();
                        const r = await resp;
                        await sleep(700);
                        const atOnce = await facts(again.panel);
                        await snap(`s-${locale}-orcid-plainsave`);
                        const after = await openSiteOrcid(locale);
                        R.plainSave = {status: r ? r.status() : null, sent: SITE_WRITES.slice(w0), atOnce: {status: atOnce.status, buttons: atOnce.buttons}, afterReload: {checked: await after.panel.locator('input[type="checkbox"]').first().isChecked()}, dbAfter: siteOrcid()};
                        await snap(`s-${locale}-orcid-plainsave-reload`);
                    }
                } catch (e) {
                    R.error = flat(e.stack || e.message, 600);
                    await page.unroute('**/api/v1/site**').catch(() => {});
                }
                R.dbAfter = siteOrcid();
                fact(`site-${locale}`, R);
            }
            // The site-wide switch must be off after the phase.
            fact('site-db-final', siteOrcid());
        }

        // ============================================================= journal
        if (on('journal')) {
            await signIn(page, S.mg, {contextPath: S.path});
            for (const locale of ['fr_CA', 'en']) {
                const R = {};
                try {
                    await page.goto(app.url(`/index.php/${S.path}/${locale}/management/settings/access`));
                    await idle(page);
                    await snap(`j-${locale}-access`);
                    R.tabs = (await page.locator('[role="tab"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 80)).filter(Boolean);
                    await page.locator('#orcidSettings-button').first().click();
                    const panel = page.locator('[role="tabpanel"]#orcidSettings').first();
                    await panel.locator('input[type="checkbox"]').first().waitFor({timeout: T});
                    await idle(page); await sleep(300);
                    await snap(`j-${locale}-orcid`);
                    R.form = await facts(panel);
                    R.codes = CODES(R.form.text);
                } catch (e) { R.error = flat(e.stack || e.message, 600); }
                fact(`journal-${locale}`, R);
            }
        }

        // ============================================================= contrib
        if (on('contrib')) {
            await signIn(page, S.mg, {contextPath: S.path});
            const formDialog = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('[id^="contributor-givenName"]')}).last();
            const orcidField = () => formDialog().locator('.pkpFormField').filter({has: page.locator('.pkpFormFieldLabel', {hasText: /ORCID/})}).first();
            const fieldFacts = async () => orcidField().evaluate((f) => ({
                label: f.querySelector('.pkpFormFieldLabel')?.innerText.trim(),
                note: f.querySelector('.pkpFormField__description')?.innerText.replace(/\s+/g, ' ').trim() || null,
                buttons: [...f.querySelectorAll('button')].map((b) => ({t: b.innerText.replace(/\s+/g, ' ').trim(), disabled: b.disabled})),
                text: f.innerText.replace(/\s+/g, ' ').trim(),
            })).catch((e) => ({error: String(e.message).slice(0, 200)}));
            const openForm = async (locale, sub, name) => {
                await page.goto(app.url(`/index.php/${S.path}/${locale}/dashboard/editorial?workflowSubmissionId=${sub.id}&workflowMenuKey=publication_${sub.pub}_contributors`));
                await idle(page);
                const list = page.locator('.listPanel--contributor').first();
                await list.locator('li.listPanel__item').first().waitFor({timeout: T});
                await snap(`${name}-list`);
                await list.locator('li.listPanel__item').filter({hasText: 'Ada'}).first().getByRole('button', {name: /^(Edit|Modifier)$/}).click();
                await formDialog().locator('[id^="contributor-givenName"]').first().waitFor({timeout: T});
                await orcidField().waitFor({timeout: T});
                await idle(page); await sleep(400);
                await snap(`${name}-form`);
                return fieldFacts();
            };
            const confirmWindow = async (name) => {
                await sleep(500);
                const s = await snap(name);
                const d = page.locator('[role="dialog"]:visible').last();
                return {text: s.text && s.text.dialog ? flat(s.text.dialog, 600) : null, buttons: (await d.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean)};
            };
            const answer = async (yes) => {
                const d = page.locator('[role="dialog"]:visible').last();
                await d.getByRole('button', {name: yes ? /^(Yes|Oui)$/ : /^(No|Non)$/}).click();
                await sleep(1500); await idle(page).catch(() => {});
            };
            for (const locale of ['fr_CA', 'en']) {
                const fr = locale === 'fr_CA';
                // no iD: the request button and its question
                const R = {};
                try {
                    const sub = S.subs[fr ? 'fr' : 'en'];
                    R.field = await openForm(locale, sub, `c-${locale}-noid`);
                    R.fieldCodes = CODES(R.field.text);
                    await loc(page, `contributor ORCID field (${locale})`, orcidField());
                    await orcidField().getByRole('button').first().click();
                    R.question = await confirmWindow(`c-${locale}-noid-question`);
                    R.questionCodes = CODES(R.question.text);
                    await answer(false);
                    R.afterNo = await fieldFacts();
                    if (fr) {
                        await orcidField().getByRole('button').first().click();
                        await confirmWindow(`c-${locale}-noid-question2`);
                        const req = page.waitForResponse((r) => /orcid/.test(r.url()) && r.request().method() !== 'GET', {timeout: 10000}).catch(() => null);
                        await answer(true);
                        const r = await req;
                        R.yes = {request: r ? `${r.request().method()} ${rel(r.url())} ${r.status()}` : null};
                        R.afterYes = await fieldFacts();
                        R.afterYesCodes = CODES(R.afterYes.text);
                        await snap(`c-${locale}-noid-requested`);
                        R.afterReload = await openForm(locale, sub, `c-${locale}-noid-reload`);
                        R.afterReloadCodes = CODES(R.afterReload.text);
                    }
                } catch (e) { R.error = flat(e.stack || e.message, 600); }
                fact(`contrib-noid-${locale}`, R);
                // an unauthenticated iD: the note and the Delete question
                const U = {};
                try {
                    const sub = S.subs[fr ? 'frU' : 'enU'];
                    U.field = await openForm(locale, sub, `c-${locale}-unv`);
                    U.fieldCodes = CODES(U.field.text);
                    await orcidField().getByRole('button', {name: /^(Delete|Supprimer)$/}).click();
                    U.question = await confirmWindow(`c-${locale}-unv-question`);
                    U.questionCodes = CODES(U.question.text);
                    if (fr) {
                        const req = page.waitForResponse((r) => /orcid/.test(r.url()) && r.request().method() !== 'GET', {timeout: 10000}).catch(() => null);
                        await answer(true);
                        const r = await req;
                        U.yes = {request: r ? `${r.request().method()} ${rel(r.url())} ${r.status()}` : null};
                        U.afterYes = await fieldFacts();
                        U.afterYesCodes = CODES(U.afterYes.text);
                        await snap(`c-${locale}-unv-deleted`);
                        U.afterReload = await openForm(locale, sub, `c-${locale}-unv-reload`);
                        U.db = sql(`select setting_name, setting_value from author_settings where author_id in (select author_id from authors where publication_id = ${sub.pub}) and setting_name like 'orcid%' order by 1`);
                    } else {
                        await answer(false);
                        U.afterNo = await fieldFacts();
                    }
                } catch (e) { U.error = flat(e.stack || e.message, 600); }
                fact(`contrib-unv-${locale}`, U);
            }
        }
    } finally {
        fact('crashes', CR);
        fact('dialogs', DIALOGS);
        await close();
    }
});
