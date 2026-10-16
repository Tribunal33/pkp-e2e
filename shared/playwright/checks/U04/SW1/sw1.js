// U04 drift sweep 2026-10-16, chunk SW1 (.reports/U04/sweep-chunks.md): the ORCID settings
// tabs (Settings › Users & Roles › "ORCID", Administration › Site Settings › "ORCID"), ORCID
// off for a journal, and the rules of the chunk's lines that name other screens (the
// contributor's ORCID iD field per role, the profile's own "Delete", the Reviewers table, the
// request emails, deposits, the riders of Rule 15, the bundled plugin of Rule 16).
// Spec: docs/specs/U04-orcid-integration.md, Purpose, Actors, Fields, Rules 1–4, 11, 13–17,
// Settings; scenarios S1, S7, S8. Report: .reports/U04/cc-SW1.md.
//
// Each phase seeds its own scratch contexts (tag prefix u04sw1), signs in from the roster or
// as the scratch users, and records every screen with screen() + shot(). Run each phase
// twice, under PROBE_RUN=r1 and r2 (fresh scratch data per run):
//   PROBE_RUN=r1 PHASES=site PROBE_FEATURE=U04 PROBE_AGENT=ccSW1 \
//     bin/app-lock.sh exclusive ojs -- node bin/probe.js ojs shared/playwright/checks/U04/SW1/sw1.js
// The `site` phase changes the site record (the redirect box, the site-wide switch) and puts it
// back before it ends (finally): run it under the app lock `exclusive`, one app per call, and
// never beside a walk that reads ORCID addresses (MAINTENANCE "The housekeeping session").
// Every other phase writes only to its own scratch contexts (`deposit`, `rule13`, `contrib`, `verify`,
// `city` drain the fleet's job queue). Site-record runs:
//   shared/playwright/checks/U04/SW1/wait-run.sh <app> <run> site   (or redirectwide)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, sql, drainJobs, serverLog, outDir} =
    require('../../../probe');

const RUN = process.env.PROBE_RUN || 'r1';
// Default: every phase that writes only to its own scratch contexts. `site` and `redirectwide`
// (the shared site record) run only when named, through wait-run.sh beside this file.
const PHASES = (process.env.PHASES || 'access,journal,s7,contrib,own,review,rule13,emails,deposit,riders,icons,verify,city').split(',');
const on = (p) => PHASES.includes(p);
const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 1500) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const log = (...a) => console.log(`[u04 sw1 ${RUN}]`, ...a);
const VERIFIED = 'https://sandbox.orcid.org/0000-0002-1825-0097';
const CLIENT_ID = 'APP-TEST';
const CLIENT_SECRET = 'test-secret';
const ORCID_SITE = /^https:\/\/(sandbox\.)?orcid\.org\//;

forEachApp(async (app) => {
    const fact = (k, v) => { record('sw1-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const q = (s) => sql(app, s);
    const ctxTable = app.contextTables;
    const siteOrcid = () => q("select setting_name || '=' || case when setting_name like '%Secret' then '(len ' || length(coalesce(setting_value,'')) || ')' else coalesce(setting_value,'<null>') end from site_settings where setting_name like 'orcid%' order by 1");

    // The app's own log ([logs] log_channel = daily: <files_dir>/logs/app-<date>.log), where
    // OrcidManager::logError()/logInfo() write; read by byte offset like serverLog().
    const appLog = () => {
        const cfg = fs.readFileSync(app.configFile, 'utf8');
        const dir = (cfg.match(/^files_dir\s*=\s*"?([^"\n]+?)"?\s*$/m) || [])[1];
        const file = () => path.join(dir, 'logs', `app-${new Date().toISOString().slice(0, 10)}.log`);
        const mark = () => { const f = file(); return {f, at: fs.existsSync(f) ? fs.statSync(f).size : 0}; };
        const since = (m) => (fs.existsSync(m.f) ? fs.readFileSync(m.f).subarray(m.at).toString('utf8').split('\n').filter((l) => /^\[\d{4}-/.test(l)).map((l) => flat(l, 400)) : []);
        return {mark, since};
    };
    const {page, close} = await launch(app);
    const CR = [];
    const DIALOGS = [];
    page.on('response', (r) => { if (r.status() >= 500) CR.push(`server ${r.status()} ${r.request().method()} ${rel(r.url()).slice(0, 200)}`); });
    page.on('pageerror', (e) => CR.push(`script ${flat(e.message || e, 200)}`));
    page.on('dialog', (d) => { DIALOGS.push({type: d.type(), message: d.message()}); d.type() === 'beforeunload' ? d.accept().catch(() => {}) : d.dismiss().catch(() => {}); });

    const snap = async (name, p = page) => {
        let s;
        try { s = await screen(p); } catch (e) { s = {url: p.url(), error: flat(e.message, 300)}; }
        record(name, s);
        await shot(p, name).catch(() => {});
        return s;
    };
    // A form panel as data: every shown field, its controls and errors, the buttons, the status.
    const facts = (panel) => panel.evaluate((p) => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => e.getClientRects().length > 0;
        return {
            fields: [...p.querySelectorAll('.pkpFormField, fieldset')].filter(vis).map((f) => ({
                label: txt(f.querySelector('.pkpFormFieldLabel, legend')),
                description: txt(f.querySelector('.pkpFormField__description')),
                controls: [...f.querySelectorAll('input, select, textarea')].filter(vis).map((c) => ({name: c.name, type: c.type, disabled: c.disabled, readOnly: c.readOnly, value: c.type === 'checkbox' || c.type === 'radio' ? c.checked : c.type === 'password' ? `(len ${c.value.length})` : (c.value || '').slice(0, 120), options: c.tagName === 'SELECT' ? [...c.options].map((o) => o.textContent.trim()) : undefined, selected: c.tagName === 'SELECT' ? txt(c.selectedOptions[0]) : undefined, label: (c.type === 'checkbox' || c.type === 'radio') && c.closest('label') ? txt(c.closest('label')) : undefined})),
                errors: [...f.querySelectorAll('.pkpFieldError')].filter(vis).map(txt),
                text: txt(f).slice(0, 600),
            })),
            buttons: [...p.querySelectorAll('button')].filter(vis).map((b) => ({t: txt(b), disabled: b.disabled})).filter((b) => b.t),
            status: [...p.querySelectorAll('.pkpFormPage__status, .pkpFormErrors, [role="status"]')].filter(vis).map(txt).filter(Boolean),
            text: txt(p).slice(0, 3000),
        };
    }).catch((e) => ({error: flat(e.message, 300)}));

    async function stubOrcid(ctx) {
        if (ctx.__orcidStub) return;
        ctx.__orcidStub = true;
        await ctx.route(ORCID_SITE, (route) => {
            const url = new URL(route.request().url());
            if (url.pathname.endsWith('/userStatus.json')) {
                const cb = url.searchParams.get('callback') || '';
                return route.fulfill({status: 200, contentType: 'application/javascript', body: /^[\w$.]+$/.test(cb) ? `${cb}({"loggedIn":false});` : ''});
            }
            return route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>ORCID stand-in</title><p>stand-in</p>'});
        });
    }
    const oauth = (address) => {
        try {
            const u = new URL(address);
            return {address, authorize: `${u.origin}${u.pathname}`, clientId: u.searchParams.get('client_id'), scope: u.searchParams.get('scope'), redirectUri: u.searchParams.get('redirect_uri')};
        } catch (e) { return {address, unparsable: true}; }
    };
    // Press a control running openORCID() and read the popup's address (ORCID's site stubbed).
    async function popupAddress(p, control) {
        await stubOrcid(p.context());
        const [popup] = await Promise.all([p.waitForEvent('popup', {timeout: 20_000}), control.click()]);
        for (let i = 0; i < 40 && !ORCID_SITE.test(popup.url()); i++) await p.waitForTimeout(250);
        const a = popup.url();
        await popup.close().catch(() => {});
        return oauth(a);
    }
    // The profile's Identity tab of a context: the ORCID block as data.
    async function profileOrcid(p, ctxPath, name, {press = false} = {}) {
        await p.goto(app.url(`/index.php/${ctxPath}/en/user/profile`));
        await p.locator('form#identityForm').waitFor({timeout: 30_000});
        await idle(p);
        await snap(name, p);
        const form = p.locator('form#identityForm');
        const out = {
            container: await form.locator('.orcid_container').count(),
            connect: flat(await form.locator('#connect-orcid-button').innerText().catch(() => null), 120),
            about: await form.locator('.orcid_container a').filter({hasText: 'What is ORCID?'}).count(),
            orcidLink: await form.locator('#orcid-link').count(),
            deleteButton: await form.locator('#deleteOrcidButton').count(),
            orcidText: flat(await form.locator('.orcid_container').innerText().catch(() => null), 400),
            icons: await form.locator('.orcid_container img, .orcid_container svg').evaluateAll((n) => n.map((e) => e.getAttribute('src') || e.outerHTML.slice(0, 80))).catch(() => []),
            fieldsWithOrcid: await form.locator('input[name="orcid"]').count(),
        };
        if (press && out.connect) out.popup = await popupAddress(p, form.locator('#connect-orcid-button'));
        return out;
    }
    async function registerOrcid(p, ctxPath, name, {press = false} = {}) {
        await p.goto(app.url(`/index.php/${ctxPath}/en/user/register`));
        await idle(p);
        await snap(name, p);
        const b = p.locator('#connect-orcid-button');
        const out = {connect: (await b.count()) ? flat(await b.innerText(), 120) : null};
        if (press && out.connect) out.popup = await popupAddress(p, b);
        return out;
    }
    // Settings › Users & Roles › the ORCID tab of a context, as data.
    async function journalTab(ctxPath, name, {locale = 'en'} = {}) {
        await page.goto(app.url(`/index.php/${ctxPath}/${locale}/management/settings/access`));
        await idle(page);
        const tabs = (await page.locator('main [role="tab"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 80)).filter(Boolean);
        const btn = page.locator('#orcidSettings-button');
        if (!(await btn.count())) { await snap(`${name}-access`); return {tabs, tabPresent: false}; }
        await btn.first().click();
        const panel = page.locator('#orcidSettings');
        await panel.locator('input[type="checkbox"]').first().waitFor({timeout: T});
        await idle(page); await sleep(300);
        await snap(name);
        const f = await facts(panel);
        return {tabs, tabPresent: true, configuredGlobally: /configured globally/.test(f.text || ''), ...f};
    }

    try {
        // ================================================================ site
        // Administration › Site Settings › Site Setup › "ORCID": the redirect box (refused,
        // saved without and with its closing slash, saved empty) and what each value does to
        // the profile's and the registration page's popup and to the request email's link;
        // then the site-wide switch ticked and saved, its effect on a journal with ORCID on and
        // one with ORCID off, and unticked again. The site record is put back in `finally`.
        if (on('site')) {
            const t = tag('u04sw1s');
            const A = `${t}a`, B = `${t}b`;
            const contact = {contactName: `ORCID Contact ${t}`, contactEmail: `contact-${t}@mail.test`};
            await app.api.createContext({
                tag: A,
                context: {name: `U04 SW1 site A ${t}`, ...contact},
                orcid: {enabled: true, apiType: 'publicSandbox', clientId: 'APP-JOURNALOWN', clientSecret: 'journal-own-secret', city: 'Burnaby'},
                users: [
                    {username: `${A}mg`, roles: ['manager'], givenName: 'Mona', familyName: `Mgr${t}`},
                    {username: `${A}au`, roles: ['author'], givenName: 'Sita', familyName: `Auth${t}`},
                ],
            });
            await app.api.createContext({
                tag: B,
                context: {name: `U04 SW1 site B ${t}`, ...contact},
                users: [{username: `${B}mg`, roles: ['manager'], givenName: 'Bo', familyName: `Mgr${t}`}],
            });
            const subA = await app.api.createSubmission({tag: `${A}s`, context: A, submitter: `${A}au`, title: `U04 SW1 site ${t}`});
            const authorTo = `${A}au@mail.test`;
            fact('site-seed', {A, B, subA});

            const out = {dbStart: siteOrcid()};
            const mgr = await launch(app); // A's manager: the profile popup and the contributor request
            const bmgr = await launch(app); // B's manager: B's profile and tab while site-wide is on
            const visitor = await launch(app, {record: false}); // signed out: A's registration page
            const orcidPanel = () => page.locator('#orcidSiteSettings');
            const openSite = async (name) => {
                await page.goto(app.url('/index.php/index/en/admin/settings'));
                await idle(page);
                await page.locator('#setup-button').first().click();
                await page.locator('#orcidSiteSettings-button').first().click();
                await orcidPanel().locator('input[name="orcidEnabled"]').waitFor({timeout: T});
                await idle(page); await sleep(300);
                if (name) await snap(name);
                return facts(orcidPanel());
            };
            const saveSite = async (name) => {
                const sent = [];
                const onResp = (r) => { if (/\/index\/api\/v1\/site(\?|$)/.test(r.url()) && r.request().method() !== 'GET') sent.push(r); };
                page.on('response', onResp);
                await orcidPanel().getByRole('button', {name: 'Save', exact: true}).click();
                for (let i = 0; i < 32 && !sent.length && !(await orcidPanel().locator('.pkpFieldError').count()); i++) await sleep(250);
                await idle(page); await sleep(600);
                page.off('response', onResp);
                const s = await snap(name);
                const res = {requests: sent.length, notices: s.notices};
                if (sent.length) {
                    res.status = sent[0].status();
                    res.body = flat(sent[0].request().postData(), 500);
                    const j = await sent[0].json().catch(() => null);
                    res.answer = res.status >= 400 ? j : j && {orcidCustomRedirectBaseUrl: j.orcidCustomRedirectBaseUrl, orcidEnabled: j.orcidEnabled, orcidApiType: j.orcidApiType};
                }
                res.atOnce = await facts(orcidPanel());
                res.db = siteOrcid();
                return res;
            };
            // the request email to A's contributor: press, drain, read
            const mailLink = async (label) => {
                const p = mgr.page;
                const since = new Date();
                await p.goto(app.url(`/index.php/${A}/en/dashboard/editorial?workflowSubmissionId=${subA.submissionId}&workflowMenuKey=publication_${subA.publicationId}_contributors`));
                await idle(p);
                const list = p.locator('.listPanel--contributor').first();
                await list.locator('li.listPanel__item').first().waitFor({timeout: T});
                await list.locator('li.listPanel__item').filter({hasText: 'Sita'}).first().getByRole('button', {name: 'Edit', exact: true}).click();
                const dlg = p.locator('[role="dialog"]:visible').filter({has: p.locator('[id^="contributor-givenName"]')}).last();
                await dlg.locator('[id^="contributor-givenName"]').first().waitFor({timeout: T});
                await idle(p); await sleep(400);
                const field = dlg.locator('.pkpFormField').filter({has: p.locator('.pkpFormFieldLabel', {hasText: /ORCID/})}).first();
                const req = field.getByRole('button', {name: /^(Request verification|Resend Verification Email)$/}).last();
                const pressed = flat(await req.innerText(), 60);
                await req.click();
                const q2 = p.locator('[role="dialog"]:visible').filter({hasText: 'verify their ORCID'}).last();
                await q2.waitFor({timeout: T});
                const answered = p.waitForResponse((r) => r.url().includes('/orcid/requestAuthorVerification/'), {timeout: T});
                await q2.getByRole('button', {name: 'Yes', exact: true}).click();
                const r = await answered;
                await idle(p);
                await snap(`site-${label}-requested`, p);
                const drained = await drainJobs(app);
                const m = await app.mail.find({to: authorTo, since, timeoutMs: 20_000}).catch((e) => ({error: flat(e.message, 200)}));
                if (m.error) return {pressed, status: r.status(), drained: drained.counts, mail: m};
                const full = await app.mail.fullMessage(m.ID);
                const hrefs = [...String(full.HTML || '').matchAll(/href=(["'])([^"']*)\1/g)].map((x) => x[2].replace(/&amp;/g, '&'));
                const auth = hrefs.find((h) => /orcid\.org\/oauth\/authorize/.test(h));
                return {pressed, status: r.status(), subject: full.Subject, from: full.From, auth: auth ? oauth(auth) : null};
            };
            const readAddresses = async (label) => {
                const R = {};
                try { R.profile = await profileOrcid(mgr.page, A, `site-${label}-profile`, {press: true}); } catch (e) { R.profile = {error: flat(e.message, 300)}; }
                try { R.register = await registerOrcid(visitor.page, A, `site-${label}-register`, {press: true}); } catch (e) { R.register = {error: flat(e.message, 300)}; }
                try { R.mail = await mailLink(label); } catch (e) { R.mail = {error: flat(e.message, 300)}; }
                return R;
            };
            try {
                await signIn(page, 'admin');
                await signIn(mgr.page, `${A}mg`, {contextPath: A});
                await signIn(bmgr.page, `${B}mg`, {contextPath: B});
                out.untouched = await openSite('site-orcid-untouched');
                out.sideTabs = await page.evaluate(() => {
                    const p = document.querySelector('#setup');
                    return p ? [...p.querySelectorAll('[role="tab"]')].filter((e) => e.getClientRects().length).map((e) => e.textContent.replace(/\s+/g, ' ').trim()) : null;
                });
                out.before = await readAddresses('none');
                // the redirect box: refused, without slash, with slash, emptied
                out.redirect = [];
                for (const [label, value] of [['notaurl', 'not a url'], ['noslash', 'https://example.com'], ['slash', 'https://example.com/'], ['empty', '']]) {
                    const S = {label, value};
                    try {
                        await openSite();
                        const box = orcidPanel().locator('input[name="orcidCustomRedirectBaseUrl"]');
                        await box.fill(value);
                        S.save = await saveSite(`site-redirect-${label}-saved`);
                        S.afterReload = {box: await (async () => { await openSite(`site-redirect-${label}-reload`); return box.inputValue(); })()};
                        if (label === 'noslash') S.journalTab = await journalTab(A, 'site-redirect-noslash-journaltab');
                        if (label !== 'notaurl') S.addresses = await readAddresses(`redirect-${label}`);
                    } catch (e) { S.error = flat(e.stack || e.message, 600); }
                    out.redirect.push(S);
                    fact(`site-redirect-${label}`, S);
                }
                // the site-wide switch: ticked and saved with a placeholder pair
                const W = {};
                try {
                    await openSite();
                    await orcidPanel().locator('input[name="orcidEnabled"]').check();
                    await sleep(300);
                    W.tickedFields = await facts(orcidPanel());
                    await orcidPanel().locator('select[name="orcidApiType"]').selectOption({label: 'Public Sandbox'});
                    await orcidPanel().locator('input[name="orcidClientId"]').fill(CLIENT_ID);
                    await orcidPanel().locator('input[name="orcidClientSecret"]').fill(CLIENT_SECRET);
                    W.save = await saveSite('site-wide-on-saved');
                    W.reload = await openSite('site-wide-on-reload');
                    W.journalA = await journalTab(A, 'site-wide-on-journalA');
                    // a per-journal field still editable: City typed and saved on A's locked tab
                    try {
                        const city = page.locator('#orcidSettings input[name="orcidCity"]');
                        await city.fill(`Surrey ${RUN}`);
                        const resp = page.waitForResponse((r) => r.url().includes('/api/v1/contexts/') && r.request().method() === 'POST', {timeout: T});
                        await page.locator('#orcidSettings').getByRole('button', {name: 'Save', exact: true}).click();
                        const r = await resp;
                        await idle(page); await sleep(500);
                        W.citySave = {status: r.status(), body: flat(r.request().postData(), 400), at: await snap('site-wide-on-journalA-citysaved').then((s) => s.notices)};
                        W.cityRow = q(`select setting_value from ${ctxTable.settings} where setting_name = 'orcidCity' and ${ctxTable.id} = (select ${ctxTable.id} from ${ctxTable.table} where path = '${A}')`);
                        W.ownRowsA = q(`select setting_name || '=' || coalesce(setting_value,'') from ${ctxTable.settings} where setting_name in ('orcidClientId','orcidApiType','orcidEnabled') and ${ctxTable.id} = (select ${ctxTable.id} from ${ctxTable.table} where path = '${A}') order by 1`);
                    } catch (e) { W.citySave = {error: flat(e.message, 300)}; }
                    W.journalB = await journalTab(B, 'site-wide-on-journalB');
                    // the locked box itself, and a Save of B's locked tab (City typed): what B keeps afterwards
                    W.lockedBoxB = await page.locator('#orcidSettings input[name="orcidEnabled"]').evaluate((c) => ({disabled: c.disabled, ariaDisabled: c.getAttribute('aria-disabled'), checked: c.checked, readonly: c.readOnly})).catch((e) => ({error: flat(e.message, 200)}));
                    W.lockedBoxBEnabled = await page.locator('#orcidSettings input[name="orcidEnabled"]').isEnabled().catch(() => null);
                    try {
                        await page.locator('#orcidSettings input[name="orcidCity"]').fill(`Delta ${RUN}`);
                        const resp = page.waitForResponse((r) => r.url().includes('/api/v1/contexts/') && r.request().method() === 'POST', {timeout: T});
                        await page.locator('#orcidSettings').getByRole('button', {name: 'Save', exact: true}).click();
                        const r = await resp;
                        await idle(page); await sleep(500);
                        W.bSave = {status: r.status(), body: flat(r.request().postData(), 400)};
                        await snap('site-wide-on-journalB-saved');
                        W.ownRowsB = q(`select setting_name || '=' || coalesce(setting_value,'') from ${ctxTable.settings} where setting_name like 'orcid%' and setting_name <> 'orcidClientSecret' and ${ctxTable.id} = (select ${ctxTable.id} from ${ctxTable.table} where path = '${B}') order by 1`);
                    } catch (e) { W.bSave = {error: flat(e.message, 300)}; }
                    try { W.profileB = await profileOrcid(bmgr.page, B, 'site-wide-on-profileB', {press: true}); } catch (e) { W.profileB = {error: flat(e.message, 300)}; }
                    try { W.registerB = await registerOrcid(visitor.page, B, 'site-wide-on-registerB'); } catch (e) { W.registerB = {error: flat(e.message, 300)}; }
                    // unticked and saved
                    await openSite();
                    await orcidPanel().locator('input[name="orcidEnabled"]').uncheck();
                    W.off = await saveSite('site-wide-off-saved');
                    W.journalAOff = await journalTab(A, 'site-wide-off-journalA');
                    W.journalBOff = await journalTab(B, 'site-wide-off-journalB');
                    try { W.profileBOff = await profileOrcid(bmgr.page, B, 'site-wide-off-profileB'); } catch (e) { W.profileBOff = {error: flat(e.message, 300)}; }
                    try { W.registerBOff = await registerOrcid(visitor.page, B, 'site-wide-off-registerB', {press: true}); } catch (e) { W.registerBOff = {error: flat(e.message, 300)}; }
                    W.ownRowsBOff = q(`select setting_name || '=' || coalesce(setting_value,'') from ${ctxTable.settings} where setting_name like 'orcid%' and setting_name <> 'orcidClientSecret' and ${ctxTable.id} = (select ${ctxTable.id} from ${ctxTable.table} where path = '${B}') order by 1`);
                } catch (e) { W.error = flat(e.stack || e.message, 600); }
                out.siteWide = W;
                fact('site-wide', W);
            } finally {
                // put the site record back: box unticked, redirect empty
                try {
                    const now = siteOrcid();
                    if (/orcidEnabled=1|orcidCustomRedirectBaseUrl=[^<\n]/.test(now)) {
                        await openSite();
                        const box = orcidPanel().locator('input[name="orcidEnabled"]');
                        if (await box.isChecked()) await box.uncheck();
                        await orcidPanel().locator('input[name="orcidCustomRedirectBaseUrl"]').fill('');
                        out.restore = await saveSite('site-restore');
                    }
                } catch (e) { out.restoreError = flat(e.message, 300); }
                out.dbEnd = siteOrcid();
                await mgr.close(); await bmgr.close(); await visitor.close();
            }
            fact('site', {dbStart: out.dbStart, dbEnd: out.dbEnd, sideTabs: out.sideTabs, untouched: out.untouched, before: out.before, restore: out.restore, restoreError: out.restoreError});
        }

        // ========================================================== redirectwide
        // Rule 2a's other end: the redirect value with the site-wide box ticked. Ticked with the
        // placeholder pair and "https://example.com" saved together, the profile popup's address of
        // a journal; then both put back (finally). Site record: run it like `site`.
        if (on('redirectwide')) {
            const t = tag('u04sw1w');
            await app.api.createContext({tag: t, orcid: {}, users: [{username: `${t}mg`, roles: ['manager']}]});
            const RW = {dbStart: siteOrcid()};
            const mgr = await launch(app);
            const panel = () => page.locator('#orcidSiteSettings');
            const openSite = async () => {
                await page.goto(app.url('/index.php/index/en/admin/settings')); await idle(page);
                await page.locator('#setup-button').first().click();
                await page.locator('#orcidSiteSettings-button').first().click();
                await panel().locator('input[name="orcidEnabled"]').waitFor({timeout: T});
                await idle(page); await sleep(300);
            };
            const save = async (name) => {
                const resp = page.waitForResponse((r) => /\/index\/api\/v1\/site(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await panel().getByRole('button', {name: 'Save', exact: true}).click();
                const r = await resp; await idle(page); await sleep(500); await snap(name);
                return {status: r && r.status(), body: r ? flat(r.request().postData(), 300) : null, db: siteOrcid()};
            };
            try {
                await signIn(page, 'admin');
                await signIn(mgr.page, `${t}mg`, {contextPath: t});
                await openSite();
                await panel().locator('input[name="orcidEnabled"]').check();
                await panel().locator('select[name="orcidApiType"]').selectOption({label: 'Public Sandbox'});
                await panel().locator('input[name="orcidClientId"]').fill(CLIENT_ID);
                await panel().locator('input[name="orcidClientSecret"]').fill(CLIENT_SECRET);
                await panel().locator('input[name="orcidCustomRedirectBaseUrl"]').fill('https://example.com');
                RW.save = await save('rw-saved');
                RW.profile = await profileOrcid(mgr.page, t, 'rw-profile', {press: true});
            } catch (e) { RW.error = flat(e.message, 400); }
            finally {
                try {
                    await openSite();
                    const box = panel().locator('input[name="orcidEnabled"]');
                    await panel().locator('input[name="orcidCustomRedirectBaseUrl"]').fill('');
                    if (await box.isChecked()) await box.uncheck();
                    RW.restore = await save('rw-restored');
                } catch (e) { RW.restoreError = flat(e.message, 300); }
                RW.dbEnd = siteOrcid();
                await mgr.close();
            }
            fact('redirectwide', {...RW, profile: RW.profile && {connect: RW.profile.connect, popup: RW.profile.popup}});
        }
        // ------------------------------------------------------------ helpers (later phases)
        const ROLE_ASSISTANT = app.name === 'ops' ? 'editorialBoardMember' : 'copyeditor';
        const editorialUrl = (ctx, sub, key) => app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${sub.submissionId}${key ? `&workflowMenuKey=${key}` : ''}`);
        // Publication › Contributors › "Edit" on the named contributor (or "Add Contributor"):
        // the open form's fields, the ORCID iD field as data.
        async function contributorForm(p, ctx, sub, who, name, {add = false} = {}) {
            await p.goto(editorialUrl(ctx, sub, `publication_${sub.publicationId}_contributors`));
            await idle(p);
            const list = p.locator('.listPanel--contributor').first();
            await list.locator('li.listPanel__item').first().waitFor({timeout: T});
            await snap(`${name}-list`, p);
            const listFacts = {
                addButton: await p.getByRole('button', {name: 'Add Contributor'}).count(),
                editButtons: await list.getByRole('button', {name: 'Edit', exact: true}).count(),
                items: (await list.locator('li.listPanel__item').allInnerTexts()).map((x) => flat(x, 160)),
            };
            if (add) {
                if (!listFacts.addButton) return {list: listFacts, opened: false};
                await p.getByRole('button', {name: 'Add Contributor'}).first().click();
            } else {
                const edit = list.locator('li.listPanel__item').filter({hasText: who}).first().getByRole('button', {name: 'Edit', exact: true});
                if (!(await edit.count())) return {list: listFacts, opened: false};
                await edit.click();
            }
            const dlg = p.locator('[role="dialog"]:visible').filter({has: p.locator('[id^="contributor-givenName"]')}).last();
            await dlg.locator('[id^="contributor-givenName"]').first().waitFor({timeout: T});
            await idle(p); await sleep(500);
            await snap(`${name}-form`, p);
            return {list: listFacts, opened: true, dlg, ...(await orcidFieldFacts(p, dlg))};
        }
        const orcidFieldOf = (p, dlg) => dlg.locator('.pkpFormField').filter({has: p.locator('.pkpFormFieldLabel', {hasText: /ORCID/})}).first();
        async function orcidFieldFacts(p, dlg) {
            const labels = (await dlg.locator('.pkpFormFieldLabel').allInnerTexts().catch(() => [])).map((x) => flat(x, 80));
            const f = orcidFieldOf(p, dlg);
            if (!(await f.count())) return {labels, field: null};
            const field = await f.evaluate((el) => ({
                label: el.querySelector('.pkpFormFieldLabel')?.innerText.trim(),
                note: [...el.querySelectorAll('.pkpFormField__description, [class*="unverified"], .text-negative, [class*="warning"]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
                links: [...el.querySelectorAll('a')].map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})),
                icons: [...el.querySelectorAll('img, svg, [class*="Icon"], [class*="icon"]')].map((e) => (e.getAttribute('src') || e.getAttribute('class') || e.tagName)).slice(0, 8),
                buttons: [...el.querySelectorAll('button')].map((b) => ({t: b.innerText.replace(/\s+/g, ' ').trim(), disabled: b.disabled})),
                text: el.innerText.replace(/\s+/g, ' ').trim().replace(/ORCID is an independent.*?orcid\.org\. /, '[blurb] '),
            })).catch((e) => ({error: flat(e.message, 200)}));
            return {labels, field};
        }
        // Press a field button, read the question window, answer it; the request and the field after.
        async function answerField(p, dlg, buttonName, yes, name) {
            const f = orcidFieldOf(p, dlg);
            await f.getByRole('button', {name: buttonName}).first().click();
            await sleep(600);
            const q2 = p.locator('[role="dialog"]:visible').last();
            const s = await snap(`${name}-question`, p);
            const question = {text: s.text && s.text.dialog ? flat(s.text.dialog, 600) : null, buttons: (await q2.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean)};
            const reqs = [];
            const onResp = (r) => { if (/\/orcid\//.test(r.url()) && r.request().method() !== 'GET') reqs.push(r); };
            p.on('response', onResp);
            await q2.getByRole('button', {name: yes ? 'Yes' : 'No', exact: true}).click();
            await sleep(1800); await idle(p).catch(() => {});
            p.off('response', onResp);
            const after = await snap(`${name}-after`, p);
            const answers = [];
            for (const r of reqs) answers.push({req: `${r.request().method()} ${rel(r.url())}`, status: r.status(), body: flat(await r.text().catch(() => ''), 300)});
            return {question, answers, dialogAfter: after.text && after.text.dialog ? flat(after.text.dialog, 400) : null, notices: after.notices, field: (await orcidFieldFacts(p, dlg)).field};
        }
        const userRow = (user, extra = {}) => ({username: user, givenName: extra.givenName || user.replace(/[0-9]+/g, '').slice(-6), familyName: extra.familyName || 'Sw1', ...extra});

        // ============================================================== access
        // Settings › Users & Roles (and its "ORCID" tab), and Administration › Site Settings
        // (and its "ORCID" side tab), each typed as one account per permission level.
        if (on('access')) {
            const t = tag('u04sw1a');
            const roles = [['mg', 'manager'], ['se', 'sectionEditor'], ['as', ROLE_ASSISTANT], ...(app.name === 'ops' ? [] : [['rv', 'externalReviewer']]), ['au', 'author'], ['rd', 'reader']];
            await app.api.createContext({tag: t, orcid: {}, users: roles.map(([k, r]) => ({username: `${t}${k}`, roles: [r]}))});
            const R = {};
            for (const who of ['admin', ...roles.map(([k]) => `${t}${k}`)]) {
                const A = {};
                try {
                    await signIn(page, who, who === 'admin' ? {} : {contextPath: t});
                    let r = await page.goto(app.url(`/index.php/${t}/en/management/settings/access`));
                    await idle(page);
                    await snap(`access-${who === 'admin' ? 'admin' : who.slice(t.length)}-journal`);
                    A.journal = {status: r && r.status(), url: rel(page.url()), h1: flat(await page.locator('main h1, h1').first().innerText().catch(() => null), 120), orcidTab: await page.locator('#orcidSettings-button').count()};
                    r = await page.goto(app.url('/index.php/index/en/admin/settings'));
                    await idle(page);
                    await snap(`access-${who === 'admin' ? 'admin' : who.slice(t.length)}-site`);
                    A.site = {status: r && r.status(), url: rel(page.url()), h1: flat(await page.locator('main h1, h1').first().innerText().catch(() => null), 120), orcidTab: await page.locator('#orcidSiteSettings-button').count()};
                } catch (e) { A.error = flat(e.message, 300); }
                R[who === 'admin' ? 'admin' : who.slice(t.length)] = A;
            }
            fact('access', {ctx: t, roles, R});
        }

        // ============================================================= journal
        // A journal with ORCID off (no `orcid` key), its manager: the tab off, ticked, refused,
        // left unsaved, saved (S1), the profile in another tab of the browser, the four API types
        // (the popup's address), the log level, unticked (Rule 4 on the profile, the registration
        // page and the contributor form). The site administrator's view of the same tab.
        if (on('journal')) {
            const t = tag('u04sw1j');
            await app.api.createContext({tag: t, context: {name: `U04 SW1 journal ${t}`}, users: [userRow(`${t}mg`, {roles: ['manager']}), userRow(`${t}au`, {roles: ['author'], givenName: 'Juno'})]});
            const sub = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, title: `U04 SW1 journal ${t}`});
            const J = {ctx: t};
            const tab2 = await page.context().newPage(); // "another browser tab"
            tab2.on('pageerror', (e) => CR.push(`script(tab2) ${flat(e.message || e, 200)}`));
            const visitor = await launch(app, {record: false});
            const panel = page.locator('#orcidSettings');
            const saveTab = async (name) => {
                const sent = [];
                const onResp = (r) => { if (r.url().includes('/api/v1/contexts/') && r.request().method() !== 'GET') sent.push(r); };
                page.on('response', onResp);
                await panel.getByRole('button', {name: 'Save', exact: true}).click();
                for (let i = 0; i < 24 && !sent.length && !(await panel.locator('.pkpFieldError').count()); i++) await sleep(250);
                await sleep(400);
                const statusAtOnce = (await panel.locator('[role="status"], .pkpFormPage__status').allInnerTexts().catch(() => [])).map((x) => flat(x, 80)).filter(Boolean);
                await idle(page); await sleep(400);
                page.off('response', onResp);
                const s = await snap(name);
                const out = {requests: sent.length, statusAtOnce, notices: s.notices, atOnce: await facts(panel)};
                if (sent.length) { out.status = sent[0].status(); out.body = flat(sent[0].request().postData(), 500); }
                return out;
            };
            try {
                await signIn(page, `${t}mg`, {contextPath: t});
                J.off = await journalTab(t, 'j-off');
                await loc(page, 'journal ORCID tab', page.locator('#orcidSettings-button'));
                await loc(page, 'journal ORCID enable box', panel.locator('input[name="orcidEnabled"]'));
                // ticked, unsaved: the fields it reveals
                await panel.locator('input[name="orcidEnabled"]').check();
                await sleep(400);
                await snap('j-ticked');
                J.ticked = await facts(panel);
                // Save with both credentials empty
                J.emptySave = await saveTab('j-empty-save');
                // leave once, unsaved: another tab of the page and back, then another page
                await page.locator('input[name="orcidCity"]').first().fill('Unsaved City');
                await page.getByRole('tab', {name: 'Users', exact: true}).click();
                await sleep(800);
                await page.locator('#orcidSettings-button').click();
                await sleep(800);
                J.backFromTab = {checked: await panel.locator('input[name="orcidEnabled"]').isChecked(), city: await panel.locator('input[name="orcidCity"]').inputValue().catch(() => null)};
                await snap('j-back-from-tab');
                const d0 = DIALOGS.length;
                await page.goto(app.url(`/index.php/${t}/en/management/settings/context`)).catch((e) => { J.leaveErr = flat(e.message, 200); });
                await idle(page).catch(() => {});
                J.leave = {dialogs: DIALOGS.slice(d0), to: rel(page.url())};
                J.afterLeave = await journalTab(t, 'j-after-leave');
                // Save: Public Sandbox, the placeholder pair
                await panel.locator('input[name="orcidEnabled"]').check();
                await panel.locator('select[name="orcidApiType"]').selectOption({label: 'Public Sandbox'});
                await panel.locator('input[name="orcidClientId"]').fill(CLIENT_ID);
                await panel.locator('input[name="orcidClientSecret"]').fill(CLIENT_SECRET);
                J.save = await saveTab('j-saved');
                J.reload = await journalTab(t, 'j-saved-reload');
                J.rows = q(`select setting_name || '=' || case when setting_name like '%Secret' then '(len ' || length(coalesce(setting_value,'')) || ')' else coalesce(setting_value,'<null>') end from ${ctxTable.settings} where setting_name like 'orcid%' and ${ctxTable.id} = (select ${ctxTable.id} from ${ctxTable.table} where path = '${t}') order by 1`);
                // another browser tab: the profile; a visitor: the registration page; the contributor form
                await stubOrcid(page.context());
                J.profileOn = await profileOrcid(tab2, t, 'j-on-profile', {press: true});
                J.registerOn = await registerOrcid(visitor.page, t, 'j-on-register', {press: true});
                const cf = await contributorForm(page, t, sub, 'Juno', 'j-on-contrib');
                J.contribOn = {list: cf.list, labels: cf.labels, field: cf.field};
                // the API types: each saved, the profile popup's address
                J.apiTypes = {};
                for (const api of ['Public', 'Member', 'Member Sandbox', 'Public Sandbox']) {
                    await journalTab(t, `j-api-${api.replace(/ /g, '')}`);
                    await panel.locator('select[name="orcidApiType"]').selectOption({label: api});
                    const sv = await saveTab(`j-api-${api.replace(/ /g, '')}-saved`);
                    const pr = await profileOrcid(tab2, t, `j-api-${api.replace(/ /g, '')}-profile`, {press: true});
                    J.apiTypes[api] = {save: sv.status, popup: pr.popup && {authorize: pr.popup.authorize, scope: pr.popup.scope, clientId: pr.popup.clientId}};
                }
                // the log level: its options, "All" saved, and what a typed verification address writes to the server log under each
                J.log = {};
                for (const level of ['Errors', 'All']) {
                    await journalTab(t, `j-log-${level}`);
                    await panel.locator('select[name="orcidLogLevel"]').selectOption({label: level});
                    const sv = await saveTab(`j-log-${level}-saved`);
                    const L = appLog();
                    const from = L.mark();
                    const rr = await visitor.page.goto(app.url(`/index.php/${t}/orcid/verify?token=sw1nosuchtoken&state=1&author_id=1`));
                    await idle(visitor.page).catch(() => {});
                    await sleep(1500);
                    const pr = await profileOrcid(tab2, t, `j-log-${level}-profile`);
                    J.log[level] = {save: sv.status, body: sv.body, verifyStatus: rr && rr.status(), verifyHeading: flat(await visitor.page.locator('h1, h2').first().innerText().catch(() => null), 80), appLog: L.since(from), profileText: pr.orcidText};
                }
                await journalTab(t, 'j-log-reset');
                await panel.locator('select[name="orcidLogLevel"]').selectOption({label: 'Errors'});
                await saveTab('j-log-reset-saved');
                // unticked and saved (S1 control, Rule 4)
                await journalTab(t, 'j-untick');
                await panel.locator('input[name="orcidEnabled"]').uncheck();
                J.untickSave = await saveTab('j-untick-saved');
                J.offAgain = await journalTab(t, 'j-off-again');
                J.profileOff = await profileOrcid(tab2, t, 'j-off-profile');
                J.registerOff = await registerOrcid(visitor.page, t, 'j-off-register');
                const cf2 = await contributorForm(page, t, sub, 'Juno', 'j-off-contrib');
                J.contribOff = {labels: cf2.labels, field: cf2.field};
                // the site administrator on the same tab
                await signIn(page, 'admin');
                J.admin = await journalTab(t, 'j-admin');
            } catch (e) { J.error = flat(e.stack || e.message, 800); }
            await tab2.close().catch(() => {});
            await visitor.close();
            fact('journal', J);
        }

        // ================================================================== s7
        // S7: a journal with ORCID off and one with it on; the registration pages (the
        // journal's, the site's), registering without connecting, the profile, the contributor form.
        if (on('s7')) {
            const t = tag('u04sw17');
            const F = `${t}f`, N = `${t}n`;
            for (const [c, orcid] of [[F, false], [N, true]]) {
                await app.api.createContext({tag: c, users: [userRow(`${c}mg`, {roles: ['manager']}), userRow(`${c}au`, {roles: ['author'], givenName: 'Sev'})], ...(orcid ? {orcid: {}} : {})});
            }
            const subF = await app.api.createSubmission({tag: `${F}s`, context: F, submitter: `${F}au`});
            const subN = await app.api.createSubmission({tag: `${N}s`, context: N, submitter: `${N}au`});
            const S = {F, N};
            const visitor = await launch(app);
            const vp = visitor.page;
            const regFacts = async (ctxPath, name) => {
                const r = await vp.goto(app.url(`/index.php/${ctxPath}/en/user/register`));
                await idle(vp);
                await snap(name, vp);
                return vp.evaluate(() => {
                    const form = document.querySelector('form#register');
                    const btn = document.querySelector('#connect-orcid-button');
                    const first = form && form.querySelector('input:not([type=hidden]), select');
                    return {
                        form: !!form,
                        connect: btn ? btn.innerText.trim() : null,
                        connectInForm: !!(btn && form && form.contains(btn)),
                        connectBeforeFirstBox: !!(btn && first && (btn.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING)),
                        firstBox: first && first.name,
                        orcidHidden: document.querySelectorAll('input[name="orcid"]').length,
                        contextsLegend: [...document.querySelectorAll('legend')].map((l) => l.innerText.trim()).filter(Boolean),
                        submit: document.querySelector('form#register button.submit, form#register button[type=submit]')?.innerText.trim() || null,
                    };
                }).then((x) => ({status: r && r.status(), ...x}));
            };
            try {
                S.regOff = await regFacts(F, 's7-register-off');
                S.regSite = await regFacts('index', 's7-register-site');
                S.regOn = await regFacts(N, 's7-register-on');
                // register on N without pressing the ORCID button
                const u = `u04s7${app.name}${RUN}${t.slice(-4)}`;
                const form = vp.locator('form#register');
                await form.locator('input[name="givenName"]').fill('Reg');
                await form.locator('input[name="familyName"]').fill('Istrant');
                await form.locator('input[name="affiliation"]').fill('PKP').catch(() => {});
                await form.locator('select[name="country"]').selectOption({label: 'Canada'});
                await form.locator('input[name="email"]').fill(`${u}@mail.test`);
                await form.locator('input[name="username"]').fill(u);
                await form.locator('input[name="password"]').fill(`Pass${u}`);
                await form.locator('input[name="password2"]').fill(`Pass${u}`);
                const pc = form.locator('input[name="privacyConsent"]');
                if (await pc.count()) await pc.check();
                const popups = [];
                vp.on('popup', (pp) => popups.push(pp.url()));
                await form.locator('button.submit').click();
                await vp.waitForLoadState('load').catch(() => {});
                await idle(vp).catch(() => {});
                const s = await snap('s7-registered', vp);
                S.registered = {url: rel(vp.url()), h1: flat(await vp.locator('h1').first().innerText().catch(() => null), 120), header: flat(await vp.locator('#navigationUser, .pkp_navigation_user').first().innerText().catch(() => null), 200), popups, notices: s.notices, userRow: q(`select username || '|' || coalesce((select setting_value from user_settings us where us.user_id=u.user_id and setting_name='orcid' limit 1),'<no orcid>') from users u where username='${u}'`)};
                // profiles
                const pf = await launch(app, {record: false});
                await signIn(pf.page, `${F}au`, {contextPath: F});
                S.profileOff = await profileOrcid(pf.page, F, 's7-profile-off');
                await signIn(pf.page, `${N}au`, {contextPath: N});
                S.profileOn = await profileOrcid(pf.page, N, 's7-profile-on');
                await pf.close();
                // contributor forms
                await signIn(page, `${F}mg`, {contextPath: F});
                const cF = await contributorForm(page, F, subF, 'Sev', 's7-contrib-off');
                S.contribOff = {labels: cF.labels, field: cF.field};
                await signIn(page, `${N}mg`, {contextPath: N});
                const cN = await contributorForm(page, N, subN, 'Sev', 's7-contrib-on');
                S.contribOn = {labels: cN.labels, field: cN.field};
            } catch (e) { S.error = flat(e.stack || e.message, 800); }
            await visitor.close();
            fact('s7', S);
        }

        // ============================================================= contrib
        // The contributor's ORCID iD field (Fields "Contributor's ORCID iD field"; Actors rows 4–5):
        // its three states as a Journal Manager, "Add Contributor"'s deferred request; the field
        // per role: Site Administrator, assigned and unassigned Section Editor, an Assistant
        // allowed to change the publication (A5), the Author (dashboard list; the wizard's step).
        if (on('contrib')) {
            const t = tag('u04sw1c');
            const u = (k) => `${t}${k}`;
            await app.api.createContext({tag: t, context: {contactName: `ORCID Contact ${t}`, contactEmail: `contact-${t}@mail.test`}, orcid: {}, users: [
                userRow(u('mg'), {roles: ['manager']}), userRow(u('se'), {roles: ['sectionEditor']}), userRow(u('sx'), {roles: ['sectionEditor']}),
                userRow(u('as'), {roles: [ROLE_ASSISTANT]}), userRow(u('au'), {roles: ['author'], givenName: 'Cleo', familyName: `Writer${t.slice(-4)}`}),
            ]});
            const parts = [{username: u('se'), role: 'sectionEditor'}, {username: u('as'), role: ROLE_ASSISTANT, canChangeMetadata: true}];
            const mk = async (k, extra = {}) => {
                try { return await app.api.createSubmission({tag: `${t}${k}`, context: t, submitter: u('au'), title: `U04 SW1 contrib ${k} ${t}`, participants: parts, ...extra}); } catch (e) {
                    return app.api.createSubmission({tag: `${t}${k}`, context: t, submitter: u('au'), title: `U04 SW1 contrib ${k} ${t}`, participants: [parts[0]], ...extra}).then((r) => ({...r, noAssistant: flat(e.message, 300)}));
                }
            };
            const s0 = await mk('n'); // no iD: the manager's request
            // the Assistant's two submissions stand where an Assistant works: copyediting (OJS, OMP);
            // on a preprint server the Editorial Board Member role is given the Production stage first
            const toCopyediting = app.name === 'ops' ? {} : {decisions: ['sendExternalReview', 'accept']};
            const s3 = await mk('x', toCopyediting); // no iD: the assistant's request
            const s1 = await mk('u', {author: {orcid: VERIFIED, orcidIsVerified: false}});
            const s2 = await mk('v', {author: {orcid: VERIFIED, orcidIsVerified: true}});
            const s4 = await mk('w', {author: {orcid: VERIFIED, orcidIsVerified: false}, ...toCopyediting}); // the assistant's Delete
            const draft = await app.api.createSubmission({tag: `${t}d`, context: t, submitter: u('au'), title: `U04 SW1 draft ${t}`, submitted: false});
            const C = {ctx: t, noAssistant: s0.noAssistant || null};
            const authorTo = `${u('au')}@mail.test`;
            const novaTo = `nova-${t}@mail.test`;
            const step = async (k, fn) => { try { C[k] = await fn(); } catch (e) { C[k] = {error: flat(e.stack || e.message, 500)}; } log(`[${app.name} contrib ${k}]`, JSON.stringify(C[k]).slice(0, 1500)); };
            await signIn(page, u('mg'), {contextPath: t});
            const since = new Date();
            await step('mgNoId', async () => {
                const f = await contributorForm(page, t, s0, 'Cleo', 'c-mg-noid');
                const no = await answerField(page, f.dlg, 'Request verification', false, 'c-mg-noid-no');
                const yes = await answerField(page, f.dlg, 'Request verification', true, 'c-mg-noid-yes');
                const again = await contributorForm(page, t, s0, 'Cleo', 'c-mg-noid-reopen');
                return {field: f.field, no, yes, reopened: again.field};
            });
            await step('mgAdd', async () => {
                const f = await contributorForm(page, t, s0, null, 'c-mg-add', {add: true});
                const yes = await answerField(page, f.dlg, 'Request verification', true, 'c-mg-add-yes');
                const dlg = f.dlg;
                await dlg.locator('[id^="contributor-givenName"]').first().fill('Nova');
                await dlg.locator('[id^="contributor-email"]').first().fill(novaTo);
                const country = dlg.locator('select[id^="contributor-country"], select[name="country"]').first();
                if (await country.count()) await country.selectOption({label: 'Canada'});
                const author = dlg.getByRole('checkbox', {name: 'Author', exact: true});
                if (await author.count()) await author.first().check().catch(() => {});
                const saved = [];
                const onResp = (r) => { if (/contributors|authors/.test(r.url()) && r.request().method() !== 'GET') saved.push(`${r.request().method()} ${rel(r.url())} ${r.status()}`); };
                page.on('response', onResp);
                await dlg.getByRole('button', {name: 'Save', exact: true}).last().click();
                await sleep(2500); await idle(page);
                page.off('response', onResp);
                const s = await snap('c-mg-add-saved');
                return {question: yes.question, answersBeforeSave: yes.answers, fieldBeforeSave: yes.field, saved, notices: s.notices};
            });
            await step('mgUnauth', async () => {
                const f = await contributorForm(page, t, s1, 'Cleo', 'c-mg-unauth');
                const no = await answerField(page, f.dlg, 'Delete', false, 'c-mg-unauth-del-no');
                return {field: f.field, deleteQuestion: no.question, after: no.field};
            });
            await step('mgVerified', async () => {
                const f = await contributorForm(page, t, s2, 'Cleo', 'c-mg-verified');
                const no = await answerField(page, f.dlg, 'Delete', false, 'c-mg-verified-del-no');
                return {field: f.field, deleteQuestion: no.question, after: no.field};
            });
            await step('mail', async () => {
                const d = await drainJobs(app);
                const read = async (to) => {
                    const list = await app.mail._search({to, since}).catch(() => null);
                    const msgs = (list && (list.messages || list.Messages)) || [];
                    return msgs.map((m) => ({subject: m.Subject, from: m.From && m.From.Address}));
                };
                return {drained: d.counts, author: await read(authorTo), nova: await read(novaTo)};
            });
            // per role, the no-iD field
            for (const [who, k, opts] of [['admin', 'admin', {}], [u('se'), 'se', {contextPath: t}], [u('sx'), 'sx', {contextPath: t}]]) {
                await step(`role-${k}`, async () => {
                    await signIn(page, who, opts);
                    const r = await page.goto(editorialUrl(t, s3, `publication_${s3.publicationId}_contributors`));
                    await idle(page); await sleep(800);
                    const s = await snap(`c-role-${k}-workflow`);
                    const list = page.locator('.listPanel--contributor').first();
                    if (!(await list.count())) return {status: r && r.status(), url: rel(page.url()), list: false, text: flat(s.text && (s.text.dialog || s.text.main), 300)};
                    const f = await contributorForm(page, t, s3, 'Cleo', `c-role-${k}`);
                    return {list: f.list, field: f.field};
                });
            }
            // the assistant (A5): request on s3, Delete on s4
            await step('assistant', async () => {
                let roleEdit = null;
                if (app.name === 'ops') {
                    const S = require('../../../pages/StageParticipantsPages.js');
                    await signIn(page, u('mg'), {contextPath: t});
                    const form = new S.RoleOptionsForm(page, t);
                    await form.gotoRoles();
                    await form.openRole('Editorial Board Member');
                    const stage = form.root.getByRole('checkbox', {name: 'Production', exact: true});
                    roleEdit = {before: await stage.isChecked()};
                    if (!roleEdit.before) await stage.check();
                    await form.save();
                    await idle(page);
                }
                await signIn(page, u('as'), {contextPath: t});
                const f = await contributorForm(page, t, s3, 'Cleo', 'c-as-noid').catch(async (e) => ({opened: false, error: flat(e.message, 200), screen: flat(((await snap('c-as-noid-failed')).text || {}).dialog, 300)}));
                if (!f.opened) return {roleEdit, list: f.list, opened: false, error: f.error, screen: f.screen};
                const yes = await answerField(page, f.dlg, 'Request verification', true, 'c-as-request');
                const again = await contributorForm(page, t, s3, 'Cleo', 'c-as-noid-reopen');
                const g = await contributorForm(page, t, s4, 'Cleo', 'c-as-unauth');
                const del = await answerField(page, g.dlg, 'Delete', true, 'c-as-delete');
                const again2 = await contributorForm(page, t, s4, 'Cleo', 'c-as-unauth-reopen');
                return {roleEdit, field: f.field, request: yes, reopened: again.field, deleteField: g.field, del, reopened2: again2.field,
                    s3Requested: q(`select count(*) from author_settings where setting_name='orcidEmailToken' and author_id in (select author_id from authors where publication_id=${s3.publicationId})`),
                    s4Orcid: q(`select coalesce(setting_value,'') from author_settings where setting_name='orcid' and author_id in (select author_id from authors where publication_id=${s4.publicationId})`)};
            });
            // the Author: the dashboard's list, and the wizard's Contributors step on a draft
            await step('author', async () => {
                await signIn(page, u('au'), {contextPath: t});
                await page.goto(app.url(`/index.php/${t}/en/dashboard/mySubmissions?workflowSubmissionId=${s0.submissionId}&workflowMenuKey=publication_${s0.publicationId}_contributors`));
                await idle(page); await sleep(1000);
                const s = await snap('c-au-dashboard');
                const list = page.locator('.listPanel--contributor').first();
                const L = {present: await list.count(), add: await page.getByRole('button', {name: 'Add Contributor'}).count(), edit: await list.getByRole('button', {name: 'Edit', exact: true}).count(), text: flat(s.text && s.text.dialog, 300)};
                let opsField = null;
                if (L.edit) {
                    await list.getByRole('button', {name: 'Edit', exact: true}).first().click();
                    const dlg = page.locator('[role="dialog"]:visible').filter({has: page.locator('[id^="contributor-givenName"]')}).last();
                    await dlg.locator('[id^="contributor-givenName"]').first().waitFor({timeout: T});
                    await idle(page); await sleep(500);
                    await snap('c-au-dashboard-form');
                    opsField = (await orcidFieldFacts(page, dlg)).field;
                }
                // the wizard
                await page.goto(app.url(`/index.php/${t}/en/submission?id=${draft.submissionId}`));
                await idle(page); await sleep(800);
                const contin = async () => { await page.getByRole('button', {name: 'Continue', exact: true}).first().click(); await sleep(1200); await idle(page); };
                let wiz = null;
                for (let i = 0; i < 4; i++) {
                    const has = await page.locator('.listPanel--contributor, [class*="contributor"] .listPanel').first().isVisible().catch(() => false);
                    if (has) break;
                    await contin();
                }
                await snap('c-au-wizard-contributors');
                const wl = page.locator('.listPanel--contributor').first();
                if (await wl.count()) {
                    await wl.getByRole('button', {name: 'Edit', exact: true}).first().click();
                    const dlg = page.locator('[role="dialog"]:visible').filter({has: page.locator('[id^="contributor-givenName"]')}).last();
                    await dlg.locator('[id^="contributor-givenName"]').first().waitFor({timeout: T});
                    await idle(page); await sleep(500);
                    await snap('c-au-wizard-form');
                    wiz = (await orcidFieldFacts(page, dlg)).field;
                }
                return {dashboardList: L, dashboardField: opsField, wizardField: wiz};
            });
            fact('contrib', C);
        }

        // ================================================================= own
        // Actors row "Remove own iD": the Identity tab of a user whose iD is verified and of one
        // whose iD is unauthenticated; the verified user's "Delete" window (answered "Cancel").
        if (on('own')) {
            const t = tag('u04sw1o');
            await app.api.createContext({tag: t, orcid: {}, users: [
                userRow(`${t}v`, {roles: ['reader'], orcid: VERIFIED, orcidIsVerified: true}),
                userRow(`${t}u`, {roles: ['reader'], orcid: VERIFIED, orcidIsVerified: false}),
            ]});
            const O = {};
            for (const k of ['v', 'u']) {
                try {
                    await signIn(page, `${t}${k}`, {contextPath: t});
                    O[k] = await profileOrcid(page, t, `own-${k}`);
                    O[k].buttons = (await page.locator('form#identityForm button, form#identityForm a.pkp_button').allInnerTexts()).map((x) => flat(x, 60)).filter(Boolean);
                    if (k === 'v' && O[k].deleteButton) {
                        await page.locator('#deleteOrcidButton').click();
                        await sleep(800);
                        const s = await snap('own-v-delete-question');
                        O.v.question = {text: flat(s.text && s.text.dialog, 300), buttons: (await page.locator('[role="dialog"]:visible').last().getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 40))};
                        await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
                        await sleep(800);
                        O.v.afterCancel = await profileOrcid(page, t, 'own-v-after-cancel');
                    }
                } catch (e) { O[k] = {error: flat(e.message, 300)}; }
            }
            fact('own', O);
        }

        // ============================================================== review
        // {OJS} "Send Review To ORCID" on the Reviewers table, per role (Site Administrator,
        // Journal Manager, assigned Section Editor); {OMP} the Press Manager (A1); the rows of a
        // verified, an unauthenticated and an iD-less reviewer (Rule 15). OPS: no Reviewers panel.
        if (on('review')) {
            const t = tag('u04sw1r');
            const u = (k) => `${t}${k}`;
            const V = {};
            if (app.name === 'ops') {
                await app.api.createContext({tag: t, orcid: {}, users: [userRow(u('mg'), {roles: ['manager']}), userRow(u('au'), {roles: ['author']})]});
                const s = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: u('au')});
                await signIn(page, u('mg'), {contextPath: t});
                await page.goto(editorialUrl(t, s));
                await idle(page); await sleep(1500);
                const sc = await snap('rv-ops-workflow');
                V.ops = {reviewerManager: await page.locator('[data-cy="reviewer-manager"]').count(), sendText: await page.getByText('Send Review To ORCID').count(), text: flat(sc.text && sc.text.dialog, 500)};
            } else {
                await app.api.createContext({tag: t, orcid: {}, users: [
                    userRow(u('mg'), {roles: ['manager']}), userRow(u('se'), {roles: ['sectionEditor']}), userRow(u('au'), {roles: ['author']}),
                    userRow(u('r1'), {roles: ['externalReviewer'], givenName: 'Vera', familyName: `Verified${t.slice(-4)}`, orcid: VERIFIED, orcidIsVerified: true}),
                    userRow(u('r2'), {roles: ['externalReviewer'], givenName: 'Una', familyName: `Unauth${t.slice(-4)}`, orcid: VERIFIED, orcidIsVerified: false}),
                    userRow(u('r3'), {roles: ['externalReviewer'], givenName: 'Nell', familyName: `Noid${t.slice(-4)}`}),
                    userRow(u('r4'), {roles: ['externalReviewer'], givenName: 'Vic', familyName: `Verifiedfree${t.slice(-4)}`, orcid: VERIFIED, orcidIsVerified: true}),
                    userRow(u('r5'), {roles: ['externalReviewer'], givenName: 'Ugo', familyName: `Unauthfree${t.slice(-4)}`, orcid: VERIFIED, orcidIsVerified: false}),
                ]});
                const s = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: u('au'), decisions: ['sendExternalReview'], participants: [{username: u('se'), role: 'sectionEditor'}],
                    reviewRounds: [{reviewers: [{username: u('r1'), status: 'accepted'}, {username: u('r2'), status: 'completed'}, {username: u('r3'), status: 'completed'}]}]});
                const {closeMenu} = require('../../../support/menus.js');
                for (const [who, k, opts] of [['admin', 'admin', {}], [u('mg'), 'mg', {contextPath: t}], [u('se'), 'se', {contextPath: t}]]) {
                    const R = {};
                    try {
                        await signIn(page, who, opts);
                        await page.goto('about:blank');
                        await page.goto(editorialUrl(t, s));
                        const modal = page.locator('[data-cy="active-modal"]').first();
                        await modal.locator('[data-cy="reviewer-manager"]').waitFor({timeout: 30_000});
                        await idle(page); await sleep(800);
                        await snap(`rv-${k}-reviewers`);
                        for (const name of ['Vera', 'Una', 'Nell']) {
                            const row = modal.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name}).first();
                            const rowFacts = await row.evaluate((r) => ({text: r.innerText.replace(/\s+/g, ' ').trim(), imgs: [...r.querySelectorAll('img, svg')].map((e) => e.getAttribute('src') || e.getAttribute('class') || e.tagName), links: [...r.querySelectorAll('a')].map((a) => a.getAttribute('href'))})).catch((e) => ({error: flat(e.message, 200)}));
                            let entries = null;
                            try {
                                await row.getByRole('button', {name: 'More Actions'}).click();
                                const menu = page.getByRole('menu').last();
                                await menu.getByRole('menuitem').first().waitFor({timeout: T});
                                entries = (await menu.getByRole('menuitem').allInnerTexts()).map((x) => flat(x, 60));
                                await closeMenu(page).catch(async () => { await row.getByRole('button', {name: 'More Actions'}).click().catch(() => {}); });
                                await sleep(500);
                            } catch (e) { entries = {error: flat(e.message, 200)}; }
                            R[name] = {...rowFacts, entries};
                        }
                        // the Add Reviewer window's list ("Locate a Reviewer"): the two unassigned reviewers' entries
                        if (k === 'mg') {
                            try {
                                await modal.locator('[data-cy="reviewer-manager"]').getByRole('button', {name: 'Add Reviewer', exact: true}).click();
                                const add = page.locator('[role="dialog"]:visible').filter({has: page.getByRole('heading', {name: 'Locate a Reviewer'})}).last();
                                await add.getByRole('heading', {name: 'Locate a Reviewer'}).waitFor({timeout: 30_000});
                                await idle(page); await sleep(800);
                                await snap('rv-mg-add-reviewer');
                                R.addList = await add.evaluate((d, names) => names.map((n) => {
                                    const items = [...d.querySelectorAll('li, .listPanel__item, [class*="reviewer"]')].filter((e) => e.innerText.includes(n));
                                    const el = items.sort((a, b) => a.innerText.length - b.innerText.length)[0];
                                    if (!el) return {name: n, found: false};
                                    return {name: n, text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 300), links: [...el.querySelectorAll('a')].map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})), icons: [...el.querySelectorAll('img, svg')].map((e) => e.getAttribute('src') || (e.outerHTML || '').slice(0, 90))};
                                }), ['Vic', 'Ugo', 'Nell']);
                                const close = add.getByRole('button', {name: /^(Close|Cancel)$/}).first();
                                await close.click().catch(() => {});
                                await sleep(800);
                            } catch (e) { R.addList = {error: flat(e.message, 300)}; }
                        }
                    } catch (e) { R.error = flat(e.message, 400); }
                    V[k] = R;
                }
            }
            fact('review', V);
        }

        // ------------------------------------------------------- mail helpers
        const mailsTo = async (to, since) => {
            const r = await app.mail._search({to, since}).catch(() => null);
            return ((r && r.messages) || []).map((m) => ({id: m.ID, subject: m.Subject, from: m.From && `${m.From.Name} <${m.From.Address}>`}));
        };
        const mailBody = async (id) => {
            const full = await app.mail.fullMessage(id);
            const hrefs = [...String(full.HTML || '').matchAll(/href=(["'])([^"']*)\1[^>]*>([\s\S]*?)<\/a>/g)].map((x) => ({href: x[2].replace(/&amp;/g, '&'), text: x[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}));
            const auth = hrefs.find((h) => /orcid\.org\/oauth\/authorize/.test(h.href));
            return {subject: full.Subject, from: full.From && `${full.From.Name} <${full.From.Address}>`, text: flat(full.Text, 1600), links: hrefs.map((h) => ({text: h.text, href: h.href.slice(0, 160)})), auth: auth ? oauth(auth.href) : null};
        };
        // A decision button in the open workflow, then the decision wizard to "Record Decision".
        async function recordDecision(p, ctx, sub, label, name) {
            await p.goto('about:blank');
            await p.goto(editorialUrl(ctx, sub));
            await idle(p); await sleep(1000);
            const btn = p.getByRole('button', {name: label}).first();
            await btn.waitFor({timeout: 30_000});
            await snap(`${name}-workflow`, p);
            await btn.click();
            const out = {label, steps: []};
            for (let i = 0; i < 8; i++) {
                await p.locator('.composer__loadingTemplateMask').first().waitFor({state: 'detached', timeout: 30_000}).catch(() => {});
                await idle(p); await sleep(700);
                const rec = p.getByRole('button', {name: /^Record (Editorial )?Decision$/});
                if (await rec.count() && await rec.first().isVisible()) {
                    const posted = p.waitForResponse((r) => r.url().includes('/decisions') && r.request().method() === 'POST', {timeout: 60_000}).catch(() => null);
                    await rec.first().click();
                    const r = await posted;
                    out.status = r && r.status();
                    await sleep(1500);
                    await snap(`${name}-recorded`, p);
                    return out;
                }
                const h = flat(await p.locator('h1, h2').first().innerText().catch(() => null), 80);
                out.steps.push(h);
                await p.getByRole('button', {name: 'Continue', exact: true}).first().click();
            }
            out.error = 'no Record Decision';
            return out;
        }

        // =============================================================== rule13
        // Rule 13 {OJS OMP}: the email toggle on — "Accept Submission" in review and "Accept and Skip
        // Review" at the submission stage email each contributor without a verified iD; a verified
        // submitter gets nothing; toggle off — nothing. Rule 14/14a: the mail's subject, sender,
        // greeting, title, signature and links; the member-API "Request verification" mail. OPS: the
        // toggle and the decisions a submitted preprint offers.
        if (on('rule13')) {
            const t = tag('u04sw13');
            const ON = `${t}n`, OFF = `${t}f`, MEM = `${t}m`;
            const R = {};
            const contact = (c) => ({contactName: `ORCID Contact ${c}`, contactEmail: `contact-${c}@mail.test`});
            const ctxName = (c) => `U04 SW1 Rule13 ${c}`;
            if (app.name === 'ops') {
                await app.api.createContext({tag: ON, context: {name: ctxName(ON), ...contact(ON)}, orcid: {sendMailToAuthorsOnPublication: true}, users: [userRow(`${ON}mg`, {roles: ['manager']}), userRow(`${ON}a1`, {roles: ['author']})]});
                const s = await app.api.createSubmission({tag: `${ON}s`, context: ON, submitter: `${ON}a1`});
                await signIn(page, `${ON}mg`, {contextPath: ON});
                R.tab = await journalTab(ON, 'r13-ops-tab');
                await page.goto(editorialUrl(ON, s)); await idle(page); await sleep(1500);
                const sc = await snap('r13-ops-workflow');
                R.decisions = (await page.locator('[data-cy="workflow-action-items"] button, [data-cy="workflow-controls-right"] button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean);
                R.acceptText = await page.getByText(/Accept/).count();
                R.dialogText = flat(sc.text && sc.text.dialog, 400);
            } else {
                const users = (c, extra = []) => [userRow(`${c}mg`, {roles: ['manager']}), userRow(`${c}a1`, {roles: ['author'], givenName: 'Ada', familyName: `Lovelace${c.slice(-3)}`}), ...extra];
                await app.api.createContext({tag: ON, context: {name: ctxName(ON), ...contact(ON)}, orcid: {sendMailToAuthorsOnPublication: true}, users: users(ON, [userRow(`${ON}a2`, {roles: ['author'], givenName: 'Vik', familyName: `Verified${ON.slice(-3)}`})])});
                await app.api.createContext({tag: OFF, context: {name: ctxName(OFF), ...contact(OFF)}, orcid: {sendMailToAuthorsOnPublication: false}, users: users(OFF)});
                await app.api.createContext({tag: MEM, context: {name: ctxName(MEM), ...contact(MEM)}, orcid: {apiType: 'memberSandbox'}, users: users(MEM)});
                const inReview = {decisions: ['sendExternalReview']};
                const sA = await app.api.createSubmission({tag: `${ON}a`, context: ON, submitter: `${ON}a1`, title: `Rule13 review ${ON}`, contributors: [{givenName: 'Cora', familyName: `Coauthor${ON.slice(-3)}`, email: `cora-${ON}@mail.test`}], ...inReview});
                const sB = await app.api.createSubmission({tag: `${ON}b`, context: ON, submitter: `${ON}a1`, title: `Rule13 skip ${ON}`});
                const sC = await app.api.createSubmission({tag: `${ON}c`, context: ON, submitter: `${ON}a2`, title: `Rule13 verified ${ON}`, author: {orcid: VERIFIED, orcidIsVerified: true}, ...inReview});
                const sD = await app.api.createSubmission({tag: `${OFF}d`, context: OFF, submitter: `${OFF}a1`, title: `Rule13 off ${OFF}`, ...inReview});
                const sM = await app.api.createSubmission({tag: `${MEM}m`, context: MEM, submitter: `${MEM}a1`, title: `Rule14 member ${MEM}`});
                R.ctx = {ON, OFF, MEM};
                const since = new Date();
                await signIn(page, `${ON}mg`, {contextPath: ON});
                R.tabOn = (await journalTab(ON, 'r13-on-tab')).fields.filter((f) => /E-Mail/.test(f.label || '')).map((f) => f.controls);
                try { R.acceptA = await recordDecision(page, ON, sA, 'Accept Submission', 'r13-accept-a'); } catch (e) { R.acceptA = {error: flat(e.message, 300)}; }
                try { R.skipB = await recordDecision(page, ON, sB, /Accept and Skip Review/, 'r13-skip-b'); } catch (e) { R.skipB = {error: flat(e.message, 300)}; }
                try { R.acceptC = await recordDecision(page, ON, sC, 'Accept Submission', 'r13-accept-c'); } catch (e) { R.acceptC = {error: flat(e.message, 300)}; }
                await signIn(page, `${OFF}mg`, {contextPath: OFF});
                try { R.acceptD = await recordDecision(page, OFF, sD, 'Accept Submission', 'r13-accept-d'); } catch (e) { R.acceptD = {error: flat(e.message, 300)}; }
                // the member-API request (Rule 14): the manager's "Request verification"
                await signIn(page, `${MEM}mg`, {contextPath: MEM});
                try {
                    const f = await contributorForm(page, MEM, sM, 'Ada', 'r14-member');
                    R.memberRequest = (await answerField(page, f.dlg, 'Request verification', true, 'r14-member-yes')).answers;
                } catch (e) { R.memberRequest = {error: flat(e.message, 300)}; }
                R.queuedBefore = q("select count(*) from jobs where payload like '%SendAuthorMail%'");
                R.drain = (await drainJobs(app)).counts;
                R.mail = {
                    onAuthor: await mailsTo(`${ON}a1@mail.test`, since),
                    onCora: await mailsTo(`cora-${ON}@mail.test`, since),
                    onVerified: await mailsTo(`${ON}a2@mail.test`, since),
                    offAuthor: await mailsTo(`${OFF}a1@mail.test`, since),
                    memberAuthor: await mailsTo(`${MEM}a1@mail.test`, since),
                };
                const pick = (list, re) => (list || []).find((m) => re.test(m.subject));
                const pa = pick(R.mail.onAuthor, /ORCID/); const pm = pick(R.mail.memberAuthor, /ORCID/);
                R.bodyPublic = pa ? await mailBody(pa.id) : null;
                R.bodyMember = pm ? await mailBody(pm.id) : null;
                R.titles = {sA: `Rule13 review ${ON}`, sB: `Rule13 skip ${ON}`, sM: `Rule14 member ${MEM}`, ON: ctxName(ON), MEM: ctxName(MEM)};
            }
            fact('rule13', R);
        }

        // =============================================================== emails
        // Rule 14 / OPS2 / A7: Settings › Workflow › Emails › "Add and edit templates", searched "ORCID".
        if (on('emails')) {
            const t = tag('u04sw1e');
            await app.api.createContext({tag: t, orcid: {}, users: [userRow(`${t}mg`, {roles: ['manager']})]});
            const E = {};
            try {
                await signIn(page, `${t}mg`, {contextPath: t});
                const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
                const m = new ManageEmailsPage(page, t);
                await m.goto();
                await m.waitForList();
                E.total = await m.rows().count();
                await m.search('ORCID');
                await idle(page); await sleep(1000);
                await snap('emails-orcid');
                E.rows = (await m.rows().allInnerTexts()).map((x) => flat(x, 200));
                E.noItems = await m.noItems().isVisible().catch(() => null);
            } catch (e) { E.error = flat(e.message, 400); }
            fact('emails', E);
        }

        // ============================================================== deposit
        // Rule 11 / OMP1: a Member Sandbox context; one publication whose contributors hold a live
        // member-scope iD (the submitter), an expired one, a public-scope one and an unauthenticated
        // one; a second publication whose contributor's work was deposited before (a put-code).
        // The queue before and after the publish (on screen), the drain's failures (the address each
        // deposit tried, through the dead proxy), the re-authorization mail and its return address.
        if (on('deposit')) {
            const t = tag('u04sw1d');
            const D = {ctx: t};
            const issue = app.name === 'ojs' ? {issues: [{volume: 7, number: 1, year: 2026, published: true}]} : {};
            await app.api.createContext({tag: t, context: {contactName: `ORCID Contact ${t}`, contactEmail: `contact-${t}@mail.test`}, orcid: {apiType: 'memberSandbox', city: 'Burnaby'}, ...issue, users: [userRow(`${t}mg`, {roles: ['manager']}), userRow(`${t}a1`, {roles: ['author'], givenName: 'Lia', familyName: `Live${t.slice(-3)}`}), userRow(`${t}a2`, {roles: ['author'], givenName: 'Pat', familyName: `Putcode${t.slice(-3)}`})]});
            const c = (k, n) => ({givenName: n, familyName: `${k}${t.slice(-3)}`, email: `${k.toLowerCase()}-${t}@mail.test`});
            const s1 = await app.api.createSubmission({tag: `${t}1`, context: t, submitter: `${t}a1`, title: `Deposit one ${t}`, author: {orcid: VERIFIED, orcidIsVerified: true}, contributors: [c('Expired', 'Eve'), c('Public', 'Pia'), c('Unauth', 'Uma')]});
            const s2 = await app.api.createSubmission({tag: `${t}2`, context: t, submitter: `${t}a2`, title: `Deposit two ${t}`, author: {orcid: 'https://sandbox.orcid.org/0000-0001-5109-3700', orcidIsVerified: true}});
            const aid = (pub, email) => q(`select author_id from authors where publication_id=${pub} and email='${email}'`);
            const live = aid(s1.publicationId, `${t}a1@mail.test`);
            D.seededLive = q(`select setting_name || '=' || case when setting_name like '%Token' then '(len ' || length(setting_value) || ')' else setting_value end from author_settings where author_id=${live} and setting_name like 'orcid%' order by 1`);
            const copy = (to, overrides) => {
                q(`insert into author_settings (author_id, locale, setting_name, setting_value) select ${to}, locale, setting_name, setting_value from author_settings where author_id=${live} and setting_name in ('orcid','orcidIsVerified','orcidAccessToken','orcidAccessScope','orcidRefreshToken','orcidAccessExpiresOn')`);
                for (const [k, v] of Object.entries(overrides)) q(`update author_settings set setting_value='${v}' where author_id=${to} and setting_name='${k}'`);
            };
            const exp = aid(s1.publicationId, `expired-${t}@mail.test`), pub = aid(s1.publicationId, `public-${t}@mail.test`), una = aid(s1.publicationId, `unauth-${t}@mail.test`);
            copy(exp, {orcidAccessExpiresOn: '2020-01-01 00:00:00', orcid: 'https://sandbox.orcid.org/0000-0002-9079-593X'});
            copy(pub, {orcidAccessScope: '/authenticate', orcid: 'https://sandbox.orcid.org/0000-0003-1419-2405'});
            q(`insert into author_settings (author_id, locale, setting_name, setting_value) values (${una}, '', 'orcid', 'https://sandbox.orcid.org/0000-0002-1694-233X')`);
            const pc = aid(s2.publicationId, `${t}a2@mail.test`);
            q(`insert into author_settings (author_id, locale, setting_name, setting_value) values (${pc}, '', 'orcidWorkPutCode', '424242')`);
            D.authors = {live, exp, pub, una, putcode: pc};
            const jobs = () => q("select id || ' ' || substring(payload from 'orcid[\\\\]+([A-Za-z]+)') from jobs where payload like '%orcid%' order by id").split('\n').filter(Boolean);
            D.jobsBefore = jobs();
            await signIn(page, `${t}mg`, {contextPath: t});
            const pubOnScreen = async (sub, name) => {
                const out = {};
                const answered = [];
                const onResp = (r) => { if (/\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET') answered.push(r.status()); };
                page.on('response', onResp);
                try {
                    await page.goto('about:blank');
                    if (app.name === 'ojs') {
                        await page.goto(editorialUrl(t, sub)); await idle(page);
                        const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
                        const ps = new PublicationScreen(page, t);
                        await ps.openEntry('Title & Abstract');
                        await idle(page);
                        await ps.publish({backIssueLabel: /Vol\. 7 No\. 1 \(2026\)/});
                    } else if (app.name === 'ops') {
                        await page.goto(editorialUrl(t, sub)); await idle(page);
                        const {postPreprint} = require(path.join(app.suiteDir, 'pages', 'PublicationPages.js'));
                        await postPreprint(page);
                    } else {
                        await page.goto(editorialUrl(t, sub, `publication_${sub.publicationId}_titleAbstract`)); await idle(page);
                        const {publishFromWorkflow} = require(path.join(app.suiteDir, 'pages', 'CatalogPages.js'));
                        await publishFromWorkflow(page);
                    }
                } catch (e) { out.error = flat(e.message, 400); }
                page.off('response', onResp);
                await idle(page).catch(() => {});
                await snap(name);
                out.publishAnswers = answered;
                out.status = q(`select status from publications where publication_id=${sub.publicationId}`);
                return out;
            };
            D.publish1 = await pubOnScreen(s1, 'dep-published-1');
            D.publish2 = await pubOnScreen(s2, 'dep-published-2');
            D.jobsAfterPublish = jobs();
            const since = new Date(Date.now() - 120_000);
            const failedBefore = q('select coalesce(max(id),0) from failed_jobs');
            D.drain = (await drainJobs(app)).counts;
            D.failed = q(`select id || ' ' || substring(payload from 'orcid[\\\\]+([A-Za-z]+)') || ' :: ' || coalesce(substring(exception from 'for (https?:[^ ]+)'), substring(exception from 1 for 200)) from failed_jobs where id > ${failedBefore} and payload like '%orcid%' order by id`).split('\n').filter(Boolean).map((x) => flat(x, 400));
            D.settingsAfter = {};
            for (const [k, id] of Object.entries(D.authors)) D.settingsAfter[k] = q(`select setting_name || '=' || case when setting_name like '%Token' then '(set)' else coalesce(setting_value,'') end from author_settings where author_id=${id} and setting_name like 'orcid%' order by 1`).split('\n');
            D.mail = {public: await mailsTo(`public-${t}@mail.test`, since), live: await mailsTo(`${t}a1@mail.test`, since), expired: await mailsTo(`expired-${t}@mail.test`, since), unauth: await mailsTo(`unauth-${t}@mail.test`, since)};
            const up = (D.mail.public || []).find((m) => /updated ORCID/.test(m.subject));
            if (up) {
                D.reauth = await mailBody(up.id);
                const ret = D.reauth.auth && D.reauth.auth.redirectUri;
                if (ret) {
                    const visitor = await launch(app, {record: false});
                    const L = appLog();
                    for (const [k, extra] of [['deny', '&error=access_denied&error_description=User%20denied%20access'], ['code', '&code=sw1code']]) {
                        const m0 = L.mark();
                        const r = await visitor.page.goto(ret.replace(/^https?:\/\/[^/]+/, app.baseURL) + extra).catch((e) => ({error: e.message}));
                        await sleep(800);
                        D[`return-${k}`] = {status: r && r.status ? r.status() : r, bodyLength: (await visitor.page.content().catch(() => '')).length, text: flat(await visitor.page.locator('body').innerText().catch(() => ''), 200), log: L.since(m0).slice(0, 3)};
                    }
                    await visitor.close();
                }
            }
            fact('deposit', D);
        }

        // =============================================================== riders
        // Rule 15: the invitation (send wizard's "Enter details", the accept link's steps) and the
        // wizard's "Add Reviewer Suggestion" window {OJS OMP}, each with ORCID on and off.
        // Rule 16 / OPS3: Settings › Website › Plugins, the installed plugins' ORCID rows.
        if (on('riders')) {
            const t = tag('u04sw1i');
            const RD = {};
            for (const [k, orcid] of [['n', true], ['f', false]]) {
                const c = `${t}${k}`;
                await app.api.createContext({tag: c, ...(orcid ? {orcid: {}} : {}), ...(app.name === 'ops' ? {} : {review: {reviewerSuggestionEnabled: true}}), users: [userRow(`${c}mg`, {roles: ['manager']}), userRow(`${c}au`, {roles: ['author']})]});
                const X = {};
                await signIn(page, `${c}mg`, {contextPath: c});
                // invitation: send, then the accept link signed out
                try {
                    const email = `inv-${c}@mail.test`;
                    await page.goto(app.url(`/index.php/${c}/en/management/settings/access`)); await idle(page);
                    await page.getByRole('button', {name: 'Invite to a role'}).click();
                    await page.getByLabel(/Search for a user by email address/).fill(email);
                    await page.getByRole('button', {name: 'Search User', exact: true}).click();
                    await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
                    await idle(page); await sleep(800);
                    const s = await snap(`inv-${k}-details`);
                    X.detailsOrcid = flat(String((s.text && s.text.main) || '').split(/\n/).filter((l) => /ORCID/i.test(l)).join(' | '), 600);
                    await page.getByLabel(/^Given Name/).first().fill('Ivy');
                    const row = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
                    await row.getByLabel(/^Select a new role/).selectOption({label: 'Author'});
                    const d = new Date(); const pad = (n) => String(n).padStart(2, '0');
                    await row.getByRole('textbox').fill(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                    await row.getByRole('combobox').last().selectOption({index: 1}).catch(() => {});
                    await page.getByRole('button', {name: 'Save And Continue'}).click();
                    await page.getByLabel(/^Subject/).waitFor({timeout: T});
                    const since = new Date();
                    await page.getByRole('button', {name: 'Invite user to the role'}).click();
                    await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T});
                    let m = null;
                    for (let i = 0; i < 2 && !m; i++) { m = await app.mail.find({to: email, since, timeoutMs: 15_000}).catch(() => null); if (!m) await drainJobs(app); }
                    const full = m ? await app.mail.fullMessage(m.ID) : null;
                    const accept = full && (String(full.HTML).match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i) || [])[1];
                    if (accept) {
                        const v = await launch(app, {record: false});
                        await v.page.goto(accept.replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, app.baseURL));
                        await idle(v.page); await sleep(1500);
                        const sv = await snap(`inv-${k}-accept`, v.page);
                        X.acceptSteps = (await v.page.locator('main').getByRole('listitem').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean).slice(0, 10);
                        X.acceptHeading = flat(await v.page.locator('main h1, main h2').first().innerText().catch(() => null), 120);
                        X.acceptOrcidButtons = await v.page.getByRole('button', {name: /ORCID/}).allInnerTexts().catch(() => []);
                        X.acceptText = flat(sv.text && sv.text.main, 400);
                        await v.close();
                    } else X.acceptError = m ? 'no accept link' : 'no mail';
                } catch (e) { X.invError = flat(e.message, 300); }
                // the reviewer-suggestion window {OJS OMP}
                if (app.name !== 'ops') {
                    try {
                        const dr = await app.api.createSubmission({tag: `${c}d`, context: c, submitter: `${c}au`, submitted: false});
                        await signIn(page, `${c}au`, {contextPath: c});
                        await page.goto(app.url(`/index.php/${c}/en/submission?id=${dr.submissionId}`)); await idle(page); await sleep(800);
                        for (let i = 0; i < 6; i++) {
                            if (await page.getByRole('button', {name: 'Add Reviewer Suggestion'}).isVisible().catch(() => false)) break;
                            await page.getByRole('button', {name: 'Continue', exact: true}).first().click();
                            await sleep(1500); await idle(page);
                        }
                        const RS = require('../../../pages/ReviewerSuggestionPages.js');
                        const stepRS = new RS.ReviewerSuggestionStep(page);
                        const w = await stepRS.openAdd();
                        await idle(page); await sleep(600);
                        await snap(`sug-${k}-window`);
                        X.suggestionLabels = (await w.dialog().locator('.pkpFormFieldLabel').allInnerTexts()).map((x) => flat(x, 60));
                        X.orcidBox = await w.orcid().count();
                        if (X.orcidBox) {
                            await w.fill({givenName: 'Sam', familyName: 'Suggest', email: `sug-${c}@mail.test`, affiliation: 'PKP', reason: 'Knows the field.', orcid: '0000-0002-1825-0097'});
                            await w.dialog().getByRole('button', {name: 'Save', exact: true}).click();
                            await sleep(1500); await idle(page);
                            await snap(`sug-${k}-bare-id`);
                            X.bareIdErrors = (await w.dialog().locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((x) => flat(x, 160));
                        }
                    } catch (e) { X.sugError = flat(e.message, 300); }
                }
                RD[k] = X;
            }
            // plugins
            try {
                await signIn(page, `${t}nmg`, {contextPath: `${t}n`});
                await page.goto(app.url(`/index.php/${t}n/en/management/settings/website`)); await idle(page);
                await page.locator('#plugins-button').first().click();
                await idle(page); await sleep(1500);
                await snap('plugins');
                await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                RD.pluginRowsTotal = await page.locator('tr.gridRow').count();
                RD.genericRows = (await page.locator('tr.gridRow').filter({hasText: /Plugin/}).allInnerTexts()).length;
                RD.pluginRows = (await page.locator('tr').filter({hasText: /ORCID/i}).allInnerTexts()).map((x) => flat(x, 200));
                RD.pluginBoxes = await page.locator('tr').filter({hasText: /ORCID/i}).locator('input[type="checkbox"]').evaluateAll((n) => n.map((e) => ({checked: e.checked, disabled: e.disabled})));
            } catch (e) { RD.pluginError = flat(e.message, 300); }
            fact('riders', RD);
        }

        // ================================================================ icons
        // Fields "Unauthenticated iD" / "Verified iD": the ORCID iD field's icon, as an element picture.
        if (on('icons')) {
            const t = tag('u04sw1k');
            await app.api.createContext({tag: t, orcid: {}, users: [userRow(`${t}mg`, {roles: ['manager']}), userRow(`${t}au`, {roles: ['author'], givenName: 'Ike'})]});
            const su = await app.api.createSubmission({tag: `${t}u`, context: t, submitter: `${t}au`, author: {orcid: VERIFIED, orcidIsVerified: false}});
            const sv = await app.api.createSubmission({tag: `${t}v`, context: t, submitter: `${t}au`, author: {orcid: VERIFIED, orcidIsVerified: true}});
            const I = {};
            await signIn(page, `${t}mg`, {contextPath: t});
            for (const [k, s] of [['unauth', su], ['verified', sv]]) {
                try {
                    const f = await contributorForm(page, t, s, 'Ike', `icon-${k}`);
                    const fld = orcidFieldOf(page, f.dlg);
                    await fld.scrollIntoViewIfNeeded();
                    const file = path.join(outDir(), `icon-${k}-field-${RUN}-${app.name}.png`);
                    await fld.screenshot({path: file});
                    I[k] = {file: path.basename(file), svgs: await fld.locator('svg').evaluateAll((n) => n.map((e) => e.outerHTML.replace(/\s+/g, ' ').slice(0, 260)))};
                } catch (e) { I[k] = {error: flat(e.message, 300)}; }
            }
            fact('icons', I);
        }

        // =============================================================== verify
        // Actors rows "Verify via the emailed link" and "Read the public ORCID pages": the request
        // email's return address opened signed out (with a code ORCID did not issue), and
        // {journal}/orcid/about and /orcid/verify typed signed out and as a Reader.
        if (on('verify')) {
            const t = tag('u04sw1v');
            await app.api.createContext({tag: t, context: {contactName: `ORCID Contact ${t}`, contactEmail: `contact-${t}@mail.test`}, orcid: {}, users: [userRow(`${t}mg`, {roles: ['manager']}), userRow(`${t}au`, {roles: ['author'], givenName: 'Vee'}), userRow(`${t}rd`, {roles: ['reader']})]});
            const s = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`});
            const Vf = {};
            await signIn(page, `${t}mg`, {contextPath: t});
            const since = new Date();
            const f = await contributorForm(page, t, s, 'Vee', 'vf-request');
            Vf.request = (await answerField(page, f.dlg, 'Request verification', true, 'vf-request-yes')).answers;
            await drainJobs(app);
            const m = (await mailsTo(`${t}au@mail.test`, since)).find((x) => /ORCID/.test(x.subject));
            const body = m ? await mailBody(m.id) : null;
            Vf.subject = body && body.subject;
            const ret = body && body.auth && body.auth.redirectUri;
            const visitor = await launch(app, {record: false});
            const vp = visitor.page;
            const read = async (url, name) => {
                const r = await vp.goto(url).catch((e) => ({error: e.message}));
                await idle(vp).catch(() => {}); await sleep(500);
                await snap(name, vp);
                return {status: r && r.status ? r.status() : r, url: rel(vp.url()), h: flat(await vp.locator('main h1, main h2, h1, h2').first().innerText().catch(() => null), 100), text: flat(await vp.locator('main, body').first().innerText().catch(() => null), 300), title: await vp.title().catch(() => null)};
            };
            if (ret) {
                const local = ret.replace(/^https?:\/\/[^/]+/, app.baseURL);
                Vf.returnSignedOut = await read(`${local}&code=sw1notissued`, 'vf-return-signedout');
                Vf.tokenAfter = q(`select count(*) from author_settings where setting_name='orcidEmailToken' and author_id in (select author_id from authors where publication_id=${s.publicationId})`);
            }
            Vf.aboutOut = await read(app.url(`/index.php/${t}/orcid/about`), 'vf-about-out');
            Vf.verifyOut = await read(app.url(`/index.php/${t}/orcid/verify`), 'vf-verify-out');
            await signIn(vp, `${t}rd`, {contextPath: t});
            Vf.aboutReader = await read(app.url(`/index.php/${t}/orcid/about`), 'vf-about-reader');
            Vf.verifyReader = await read(app.url(`/index.php/${t}/orcid/verify`), 'vf-verify-reader');
            await visitor.close();
            fact('verify', Vf);
        }

        // ================================================================= city
        // {OJS} Fields "City" / Rule 12's silent requirement: "Send Review To ORCID" on a completed
        // review, Member Sandbox, with City and country set, and with City empty: whether the
        // review deposit job reaches ORCID's address (it fails at the dead proxy) or stops silently.
        if (on('city') && app.name === 'ojs') {
            const CT = {};
            for (const [k, city] of [['set', 'Burnaby'], ['empty', null]]) {
                const t = tag(`u04sw1y${k[0]}`);
                await app.api.createContext({tag: t, context: {country: 'CA'}, orcid: {apiType: 'memberSandbox', ...(city ? {city} : {})}, users: [
                    userRow(`${t}mg`, {roles: ['manager']}), userRow(`${t}au`, {roles: ['author']}),
                    userRow(`${t}r1`, {roles: ['externalReviewer'], givenName: 'Rhea', familyName: `Reviewer${t.slice(-3)}`, orcid: VERIFIED, orcidIsVerified: true}),
                ]});
                const s = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: `${t}r1`, status: 'completed'}]}]});
                const X = {ctx: t, cityRow: q(`select coalesce(setting_value,'') from journal_settings where setting_name='orcidCity' and journal_id=(select journal_id from journals where path='${t}')`), countryRow: q(`select coalesce(setting_value,'') from journal_settings where setting_name='country' and journal_id=(select journal_id from journals where path='${t}')`), scope: q(`select setting_value from user_settings where setting_name='orcidAccessScope' and user_id=(select user_id from users where username='${t}r1')`)};
                try {
                    await signIn(page, `${t}mg`, {contextPath: t});
                    await page.goto('about:blank');
                    await page.goto(editorialUrl(t, s));
                    const modal = page.locator('[data-cy="active-modal"]').first();
                    await modal.locator('[data-cy="reviewer-manager"]').waitFor({timeout: 30_000});
                    await idle(page); await sleep(800);
                    const row = modal.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: 'Rhea'}).first();
                    await row.getByRole('button', {name: 'More Actions'}).click();
                    await page.getByRole('menu').last().getByRole('menuitem', {name: 'Send Review To ORCID'}).click();
                    const dlg = page.getByRole('dialog').filter({hasText: "Send this review to the reviewer's ORCID?"}).last();
                    await dlg.waitFor({timeout: T});
                    const ans = page.waitForResponse((r) => /sendToOrcid/i.test(r.url()), {timeout: T}).catch(() => null);
                    await dlg.getByRole('button', {name: /^(OK|Yes)$/}).click();
                    const r = await ans;
                    await idle(page); await sleep(1000);
                    const sc = await snap(`city-${k}-sent`);
                    X.send = {status: r && r.status(), body: r ? flat(await r.text().catch(() => ''), 200) : null, notices: sc.notices};
                    X.jobs = q("select id || ' ' || substring(payload from 'orcid[\\\\]+([A-Za-z]+)') from jobs where payload like '%orcid%' order by id").split('\n').filter(Boolean);
                    const fb = q('select coalesce(max(id),0) from failed_jobs');
                    X.drain = (await drainJobs(app)).counts;
                    X.failed = q(`select id || ' ' || substring(payload from 'orcid[\\\\]+([A-Za-z]+)') || ' :: ' || coalesce(substring(exception from 'for (https?:[^ ]+)'), substring(exception from 1 for 200)) from failed_jobs where id > ${fb} and payload like '%orcid%' order by id`).split('\n').filter(Boolean).map((x) => flat(x, 300));
                } catch (e) { X.error = flat(e.message, 300); }
                CT[k] = X;
            }
            fact('city', CT);
        }

    } finally {
        fact('crashes', CR);
        fact('dialogs', DIALOGS);
        await close();
    }
});
