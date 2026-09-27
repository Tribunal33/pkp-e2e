const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U60 claim check, chunk K1: Administration › "Site Settings" › "Site Setup" ›
// "Settings" and "Security" (fields, Rules 6–12), Rule 22 (the saves behind the
// tabs), Settings that modify behavior 1–6, register A1, A4, OPS1; all three apps.
// Spec: docs/specs/U60-site-settings.md — body 47–64, 142–213, 292–299, 332–348,
// 492–505, 523–531, 559–571; footnotes d, e, f, g, l, td3–td8, f-a1, f-a4, f-ops1.
//
// The site is one record every checker shares: each phase writes down what it
// changes and puts it back in a `finally` (the Site Name through the harness's
// `pkpApi.setSite({title: ''})`, the install state the tab cannot reach; the rest
// on screen). Rate limiting and password checks use throwaway accounts only.
//
// Seeds per app (tag prefix u60k1), state in k1-state-<app>.json; a full run (no PHASES)
// always seeds afresh, a PHASES run reuses the state unless RESEED=1 (the password phases
// change the throwaways' passwords, so a second PHASES run of them needs RESEED=1):
//   A  "K1 A <t>" (en + fr_CA): mg (manager), au (author), rv (externalReviewer,
//      OJS/OMP; one completed review in A), rd (reader), pw / ka / rs / cp / rl1 / rl2
//      (readers: password, keep-working, reset, compromised, rate limiting)
//   B  "K1 B <t>": mb (manager), ab (author), rv again (externalReviewer), a
//      submission in review with no reviewer (OJS/OMP)
//   D  "K1 D <t>", not enabled publicly
// Phases (PHASES=a,b to narrow):
//   seed       the scratch contexts above
//   settings   "Settings" tab: fields, redirect options, td3 refusals, French-only,
//              leaving unsaved, td4 places before/after a name (header, title,
//              hidden heading, editorial header, login/register pages, OAI, reset mail)
//   redirect   td5: a journal chosen, the site's address and sign-ins; blank again
//   stats      td6: Add Reviewer figures in B, box unticked / ticked (OJS/OMP); OPS box
//   security   "Security" tab: fields, td7 refusals, 4 and 8 saved, the password
//              screens at 8 (Profile, Register, reset, invitation), keep-working; 6 back
//   compromised Rule 11 ticked / unticked on Profile and Register
//   ratelimit  td8: fields, refusals, 2/60 saved, failed sign-ins, reset requests,
//              lockout run out, emptied boxes; restored 5/300 unticked
//   rule22     the Information tab's refused email (traffic only, nothing stored),
//              a Journal Manager on the Site Settings address
//   reread     the site's pages with no Site Name and no logo (read-only)
// Not driven here: exactly one context enabled publicly. Hosted Journals › "Edit"
// cannot save a scratch context without "Journal initials" (none is seeded), so
// disabling the other contexts would change other checkers' contexts for good.
// Run: PROBE_FEATURE=U60 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U60/K1/k1.js
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL = ['seed', 'settings', 'redirect', 'stats', 'security', 'compromised', 'ratelimit', 'rule22', 'reread'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 20_000;
const flat = (s, n = 4000) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const stateFile = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const log = (...a) => console.log('[k1]', new Date().toISOString().slice(11, 19), ...a);
const mailOf = (u) => `${u}@mail.test`;
const pw2 = (u) => `${u}${u}`;
const sql = (app, q) => execFileSync('psql', ['-d', `${dbName(app.name)}`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();
const siteRows = (app, names) => sql(app, `select setting_name, locale, setting_value from site_settings where setting_name in (${names.map((n) => `'${n}'`).join(',')}) order by 1, 2`).split('\n').filter(Boolean);
const SITE_KEYS = ['title', 'disableSharedReviewerStatistics', 'minPasswordLength', 'passwordUncompromisedEnabled', 'rateLimitEnabled', 'rateLimitMaxAttempts', 'rateLimitDecaySeconds', 'contactEmail', 'contactName'];
const siteDb = (app) => ({settings: siteRows(app, SITE_KEYS), site: sql(app, 'select redirect_context_id, min_password_length from site')});

let CUR = 'init';
const CRASH = {};
const DIALOGS = [];
const WRITES = [];
function watch(page) {
    page.on('response', (r) => { if (r.status() >= 500) (CRASH[CUR] = CRASH[CUR] || []).push(`server ${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 200)}`); });
    page.on('pageerror', (e) => { (CRASH[CUR] = CRASH[CUR] || []).push(`script ${String(e.message || e).slice(0, 200)}`); });
    page.on('dialog', (d) => { DIALOGS.push({phase: CUR, type: d.type(), message: d.message()}); d.type() === 'beforeunload' ? d.accept().catch(() => {}) : d.dismiss().catch(() => {}); });
    page.on('request', (r) => { if (/\/api\/v1\/site/.test(r.url()) && r.method() !== 'GET') WRITES.push({phase: CUR, method: r.method(), override: r.headers()['x-http-method-override'] || '', url: r.url().replace(/^https?:\/\/[^/]+/, ''), body: (r.postData() || '').slice(0, 600)}); });
    return page;
}
async function snap(page, name, extra = {}) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 300)}; }
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

// ── Site Settings ───────────────────────────────────────────────────────────
async function openSite(page, app, sub, {top = 'setup'} = {}) {
    await page.goto(app.url('/index.php/index/en/admin/settings'));
    await idle(page);
    await page.locator(`#${top}-button`).first().click().catch(() => {});
    await page.locator(`#${sub}-button`).first().click();
    const panel = page.locator(`[role="tabpanel"]#${sub}`).first();
    await panel.getByRole('button', {name: 'Save', exact: true}).first().waitFor({timeout: T});
    await idle(page); await sleep(300);
    return panel;
}
async function formFacts(panel) {
    return panel.evaluate((p) => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => e.offsetParent !== null;
        return {
            groups: [...p.querySelectorAll('.pkpFormGroup')].filter(vis).map((g) => ({
                legend: txt(g.querySelector('legend, .pkpFormGroup__heading')),
                description: txt(g.querySelector('.pkpFormGroup__description')),
            })),
            fields: [...p.querySelectorAll('.pkpFormField')].filter(vis).map((f) => ({
                label: txt(f.querySelector('.pkpFormFieldLabel, legend, label')),
                description: txt(f.querySelector('.pkpFormField__description')),
                controls: [...f.querySelectorAll('input, select, textarea')].filter(vis).map((c) => ({
                    tag: c.tagName.toLowerCase(), type: c.type, name: c.name, id: c.id, value: c.type === 'checkbox' ? c.checked : c.value,
                    label: c.labels && c.labels[0] ? txt(c.labels[0]) : null,
                    options: c.tagName === 'SELECT' ? [...c.options].map((o) => o.text.trim()) : undefined,
                    min: c.getAttribute('min'), required: c.required || c.getAttribute('aria-required'),
                })),
                errors: [...f.querySelectorAll('.pkpFieldError')].map(txt),
            })),
            buttons: [...p.querySelectorAll('button')].filter(vis).map(txt).filter(Boolean),
            text: txt(p).slice(0, 3000),
        };
    }).catch((e) => ({error: String(e.message)}));
}
// Press the panel's Save; returns what was sent and what the page showed.
async function saveTab(page, panel) {
    const before = WRITES.length;
    const resp = page.waitForResponse((r) => /\/api\/v1\/site/.test(r.url()) && r.request().method() !== 'GET', {timeout: 8000}).catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).first().click();
    const r = await resp;
    let body = null;
    if (r) { body = await r.text().catch(() => null); }
    await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: r && r.status() < 300 ? T : 1500}).catch(() => {});
    await sleep(400);
    return {
        status: r ? r.status() : null,
        response: body ? body.slice(0, 600) : null,
        sent: WRITES.slice(before).map((w) => w.body),
        saved: await page.locator('[role="status"]').filter({hasText: 'Saved'}).count() > 0,
        errors: (await panel.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean),
        bar: (await panel.locator('.pkpFormPage__status, .pkpFormErrors, [class*="pkpFormPage__errors"], .pkpForm__errors').allInnerTexts().catch(() => [])).map((x) => flat(x, 300)).filter(Boolean),
    };
}

// ── places where the Site Name shows (Rule 7) ───────────────────────────────
async function sitePlaces(page, app, prefix) {
    const out = {};
    const header = async () => page.locator('.pkp_site_name').first().evaluate((el) => {
        const a = el.querySelector('a');
        const img = el.querySelector('img');
        return {text: el.innerText.trim(), link: a ? a.getAttribute('href').trim() : null, img: img ? {src: img.getAttribute('src'), alt: img.getAttribute('alt')} : null};
    }).catch((e) => `ERR ${e.message.slice(0, 100)}`);
    await page.goto(app.url('/index.php/index'));
    await idle(page);
    const s = await snap(page, `${prefix}-home`);
    out.homeUrl = s.url;
    out.homeTitle = await page.title();
    out.homeHeader = await header();
    out.homeHiddenH1 = await page.locator('h1.pkp_screen_reader').allInnerTexts().catch(() => []);
    for (const [k, p] of [['login', '/index.php/index/en/login'], ['register', '/index.php/index/en/user/register'], ['lost', '/index.php/index/en/login/lostPassword']]) {
        await page.goto(app.url(p)); await idle(page);
        out[`${k}Title`] = await page.title();
        out[`${k}Header`] = await header();
    }
    // OAI: the site-wide address
    const oai = await page.request.get(app.url('/index.php/index/oai?verb=Identify')).catch(() => null);
    const xml = oai ? await oai.text() : '';
    out.oaiStatus = oai ? oai.status() : null;
    out.oaiRepositoryName = (xml.match(/<repositoryName>([\s\S]*?)<\/repositoryName>/) || [null, '(no element)'])[1];
    return out;
}
async function adminPlaces(page, app, prefix) {
    await page.goto(app.url('/index.php/index/en/admin/settings'));
    await idle(page);
    await snap(page, `${prefix}-admin`);
    const h = await page.locator('.app__contextTitle').first().evaluate((el) => ({tag: el.tagName.toLowerCase(), text: el.innerText.trim(), href: el.getAttribute('href')})).catch((e) => `ERR ${e.message.slice(0, 100)}`);
    const out = {adminTitle: await page.title(), adminHeader: h};
    if (h && h.tag === 'a') {
        await page.locator('.app__contextTitle').first().click();
        await page.waitForLoadState('load').catch(() => {}); await idle(page);
        out.adminHeaderLandsOn = page.url().replace(/^https?:\/\/[^/]+/, '');
        out.adminHeaderLandsTitle = await page.title();
    }
    // Administration's own index page too
    await page.goto(app.url('/index.php/index/en/admin')); await idle(page);
    out.adminIndexTitle = await page.title();
    return out;
}
// A site-level reset email: request one at the site's address and read the mail
async function resetMail(page, app, email) {
    await page.goto(app.url('/index.php/index/en/login/lostPassword')); await idle(page);
    const since = Date.now();
    await page.locator('input#email').fill(email);
    await page.locator('form#lostPasswordForm button[type="submit"]').click();
    await page.waitForLoadState('load').catch(() => {}); await idle(page);
    const shown = flat(await page.locator('main, .pkp_structure_main').first().innerText().catch(() => ''), 600);
    let msg = null;
    for (let i = 0; i < 30 && !msg; i++) {
        const res = await app.mail._search({to: email}).catch(() => ({messages: []}));
        msg = (res.messages || []).find((m) => new Date(m.Created).getTime() >= since - 2000) || null;
        if (!msg) await sleep(500);
    }
    if (!msg) return {shown, mail: null};
    const full = await app.mail.fullMessage(msg.ID);
    return {shown, mail: {subject: full.Subject, from: full.From, text: flat(full.Text, 1200), html: full.HTML}};
}

forEachApp(async (app) => {
    const isOps = app.name === 'ops';
    const hasReview = !isOps;
    const st = fs.existsSync(stateFile(app)) && !process.env.RESEED ? JSON.parse(fs.readFileSync(stateFile(app), 'utf8')) : {};
    const saveState = () => fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
    const F = {app: app.name};
    const RESTORED = [];
    const factsName = 'k1-facts';
    const step = async (name, fn) => {
        CUR = name;
        const R = {};
        log(app.name, 'phase', name);
        try { await fn(R); } catch (e) { R.error = String(e.stack || e.message).slice(0, 1500); log(app.name, name, 'ERROR', R.error.slice(0, 300)); }
        R.crashes = CRASH[name] || [];
        R.dialogs = DIALOGS.filter((d) => d.phase === name);
        R.writes = WRITES.filter((w) => w.phase === name);
        F[name] = R;
        record(factsName, {[name]: R, restored: RESTORED}, {merge: true});
    };

    const {page, close} = await launch(app);
    watch(page);
    const OPEN = [];
    const fresh = async () => { const x = await launch(app); watch(x.page); OPEN.push(x); return x.page; };
    try {
        // ── seed ────────────────────────────────────────────────────────────
        if (on('seed') && (!st.t || process.env.RESEED || !process.env.PHASES)) await step('seed', async (R) => {
            const t = tag('u60k1');
            st.t = t;
            const u = (s) => `${t}${s}`;
            const readers = ['rd', 'pw', 'ka', 'rs', 'cp', 'rl1', 'rl2'].map((s) => ({username: u(s), roles: ['reader'], givenName: `K1 ${s}`, familyName: 'Throwaway'}));
            const A = await app.api.createContext({
                tag: `${t}a`,
                context: {name: `K1 A ${t}`, supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
                users: [
                    {username: u('mg'), roles: ['manager']},
                    {username: u('au'), roles: ['author']},
                    ...(hasReview ? [{username: u('rv'), roles: ['externalReviewer'], givenName: 'Kayo', familyName: `Reviewer${t}`}] : []),
                    ...readers,
                ],
            });
            const B = await app.api.createContext({
                tag: `${t}b`,
                context: {name: `K1 B ${t}`},
                users: [
                    {username: u('mb'), roles: ['manager']},
                    {username: u('ab'), roles: ['author']},
                    ...(hasReview ? [{username: u('rv'), roles: ['externalReviewer']}] : []),
                ],
            });
            const D = await app.api.createContext({tag: `${t}d`, context: {name: `K1 D ${t}`, enabled: false}});
            st.A = {path: `${t}a`, id: A.contextId, name: `K1 A ${t}`};
            st.B = {path: `${t}b`, id: B.contextId, name: `K1 B ${t}`};
            st.D = {path: `${t}d`, id: D.contextId, name: `K1 D ${t}`};
            if (hasReview) {
                const sa = await app.api.createSubmission({tag: `${t}sa`, context: st.A.path, submitter: u('au'), decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: u('rv'), status: 'completed'}]}]});
                const sb = await app.api.createSubmission({tag: `${t}sb`, context: st.B.path, submitter: u('ab'), decisions: ['sendExternalReview']});
                st.sa = sa; st.sb = sb;
            }
            saveState();
            R.state = st;
        });
        const t = st.t;
        const u = (s) => `${t}${s}`;

        // ── reread: the site's pages with no Site Name and no logo (read-only) ──
        if (on('reread')) await step('reread', async (R) => {
            R.db = siteRows(app, ['title', 'pageHeaderTitleImage']);
            R.places = await sitePlaces(page, app, 'z01-reread');
        });

        // ── read-only: the two tabs as they load ───────────────────────────
        if (on('read')) await step('read', async (R) => {
            await signIn(page, 'admin');
            let panel = await openSite(page, app, 'settings');
            await snap(page, 's00-settings');
            R.settings = await formFacts(panel);
            panel = await openSite(page, app, 'security');
            await snap(page, 's00-security');
            R.security = await formFacts(panel);
            R.db = siteDb(app);
        });

        // The Site Name back to the install state (the tab cannot reach it).
        const restoreTitle = async (why) => {
            const before = siteRows(app, ['title']);
            await app.api.setSite({title: ''});
            RESTORED.push({what: 'Site Name', why, before, after: siteRows(app, ['title'])});
        };
        // Type a Site Name on the Settings tab (a save there needs one, Rule 6).
        const nameSite = async (panel) => panel.locator('#siteConfig-title-control-en').fill(`K1 Site ${app.name.toUpperCase()}`);

        // ── settings: the "Settings" tab, td3, leaving unsaved, td4 ─────────
        if (on('settings')) await step('settings', async (R) => {
            R.dbBefore = siteDb(app);
            try {
                await signIn(page, 'admin');
                let panel = await openSite(page, app, 'settings');
                await snap(page, 's01-settings');
                R.fields = await formFacts(panel);
                await loc(page, 'Site Setup › Settings: "Site Name" (en) box', panel.locator('#siteConfig-title-control-en'));
                await loc(page, 'Site Setup › Settings: redirect select', panel.locator('#siteConfig-redirectContextId-control'));
                await loc(page, 'Site Setup › Settings: "Disable aggregated reviewer statistics" box', panel.getByRole('checkbox', {name: 'Disable aggregated reviewer statistics'}));
                await loc(page, 'Site Setup › Settings: language toggle "French"', panel.getByRole('button', {name: 'French', exact: true}));
                R.disabledContextListed = R.fields.fields && JSON.stringify(R.fields.fields).includes(st.D.name);
                // td3: empty Site Name, a redirect chosen, Save
                await panel.locator('#siteConfig-redirectContextId-control').selectOption({label: st.B.name});
                R.td3empty = await saveTab(page, panel);
                await snap(page, 's02-settings-empty-refused');
                R.td3emptyFacts = await formFacts(panel);
                R.td3dbAfter = siteDb(app);
                panel = await openSite(page, app, 'settings');
                R.td3afterReload = {redirect: await panel.locator('#siteConfig-redirectContextId-control').inputValue(), title: await panel.locator('#siteConfig-title-control-en').inputValue()};
                // French box only
                await panel.getByRole('button', {name: 'French', exact: true}).click();
                await sleep(400);
                await snap(page, 's03-settings-french-open');
                R.frenchOpenFacts = await formFacts(panel);
                const fr = panel.locator('#siteConfig-title-control-fr_CA');
                await loc(page, 'Site Setup › Settings: "Site Name" (fr_CA) box, after "French"', fr);
                await fr.fill('K1 Nom seulement');
                R.frOnly = await saveTab(page, panel);
                await snap(page, 's04-settings-french-only');
                R.frOnlyFacts = await formFacts(panel);
                R.frOnlyDb = siteDb(app);
                // leaving with something unsaved: side tab, back, then another page
                panel = await openSite(page, app, 'settings');
                await panel.locator('#siteConfig-title-control-en').fill('K1 unsaved');
                await page.locator('#security-button').first().click();
                await sleep(800);
                R.leaveSideTab = {dialogs: DIALOGS.filter((d) => d.phase === 'settings').length, securityShown: await page.locator('[role="tabpanel"]#security').first().isVisible()};
                await snap(page, 's05-settings-left-to-security');
                await page.locator('#settings-button').first().click();
                await sleep(500);
                R.leaveBack = {value: await panel.locator('#siteConfig-title-control-en').inputValue()};
                await page.locator('#siteConfig-title-control-en').blur().catch(() => {});
                await page.goto(app.url('/index.php/index/en/admin')).catch((e) => { R.leaveGotoError = String(e.message).slice(0, 200); });
                await idle(page);
                R.leavePage = {url: page.url(), dialogs: DIALOGS.filter((d) => d.phase === 'settings')};
                R.leaveDb = siteRows(app, ['title']);
                // td4 before: as a visitor, then the admin's screens
                await signOut(page);
                R.placesBefore = await sitePlaces(page, app, 's06-before');
                R.mailBefore = await resetMail(page, app, mailOf(u('rs')));
                if (R.mailBefore.mail) { R.mailBefore.siteLine = (R.mailBefore.mail.text.match(/for the .{0,60}web site/) || [null])[0]; delete R.mailBefore.mail.html; }
                await signIn(page, 'admin');
                R.adminBefore = await adminPlaces(page, app, 's07-before');
                // a name typed and saved
                panel = await openSite(page, app, 'settings');
                await nameSite(panel);
                R.nameSave = await saveTab(page, panel);
                R.nameSameRead = {box: await panel.locator('#siteConfig-title-control-en').inputValue(), header: await page.locator('.app__contextTitle').first().innerText().catch(() => null), title: await page.title()};
                await snap(page, 's08-settings-named-saved');
                await page.reload(); await idle(page);
                panel = await openSite(page, app, 'settings');
                R.nameReloadRead = {box: await panel.locator('#siteConfig-title-control-en').inputValue(), header: await page.locator('.app__contextTitle').first().innerText().catch(() => null), title: await page.title()};
                R.nameDb = siteDb(app);
                R.adminAfter = await adminPlaces(page, app, 's09-after');
                await signOut(page);
                R.placesAfter = await sitePlaces(page, app, 's10-after');
                R.mailAfter = await resetMail(page, app, mailOf(u('rs')));
                if (R.mailAfter.mail) { R.mailAfter.siteLine = (R.mailAfter.mail.text.match(/for the .{0,60}web site/) || [null])[0]; delete R.mailAfter.mail.html; }
            } finally {
                await restoreTitle('settings phase');
                R.dbAfter = siteDb(app);
            }
        });

        // ── redirect: td5 ───────────────────────────────────────────────────
        if (on('redirect')) await step('redirect', async (R) => {
            R.dbBefore = siteDb(app);
            let set = false;
            try {
                await signIn(page, 'admin');
                let panel = await openSite(page, app, 'settings');
                await nameSite(panel);
                await panel.locator('#siteConfig-redirectContextId-control').selectOption({label: st.B.name});
                R.save = await saveTab(page, panel);
                set = true;
                R.db = siteDb(app);
                await snap(page, 'r01-redirect-saved');
                // a visitor
                const anon = await fresh();
                const lands = async (p, label) => {
                    const resp = await anon.goto(app.url(p)).catch((e) => ({err: e.message}));
                    await idle(anon);
                    const s = await snap(anon, `r02-${label}`);
                    return {asked: p, url: s.url.replace(/^https?:\/\/[^/]+/, ''), title: s.title, status: resp && resp.status ? resp.status() : resp};
                };
                R.visitor = [];
                for (const [p, l] of [['/index.php/index', 'site'], ['/index.php/index/en/index', 'site-index'], ['/index.php/index/index/index', 'site-index-index'], ['/', 'root'], ['/index.php/index/en/login', 'site-login'], ['/index.php/index/en/user/register', 'site-register']]) R.visitor.push(await lands(p, l));
                // sign-ins on the Login page at the site's address
                R.signins = {};
                for (const who of ['admin', u('mb'), u('rd')]) {
                    const p2 = await fresh();
                    await p2.goto(app.url('/index.php/index/en/login')); await idle(p2);
                    const atLogin = p2.url().replace(/^https?:\/\/[^/]+/, '');
                    const source = await p2.locator('form#login input[name="source"]').inputValue().catch(() => '(no source field)');
                    await p2.locator('input#username').fill(who);
                    await p2.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
                    await p2.locator('input#password').fill(who === 'admin' ? 'admin' : pw2(who));
                    await p2.locator('form#login button[type="submit"]').click();
                    await p2.waitForURL((x) => !x.pathname.includes('/login'), {timeout: 15000, waitUntil: 'commit'}).catch(() => {});
                    await p2.waitForLoadState('load').catch(() => {}); await idle(p2);
                    const s = await snap(p2, `r03-signin-${who === 'admin' ? 'admin' : who.slice(-2)}`);
                    R.signins[who] = {loginAt: atLogin, source, landed: s.url.replace(/^https?:\/\/[^/]+/, ''), title: s.title};
                }
                // blank again
                panel = await openSite(page, app, 'settings');
                await panel.locator('#siteConfig-redirectContextId-control').selectOption({index: 0});
                R.blankSave = await saveTab(page, panel);
                set = false;
                R.visitorAfter = [await lands('/index.php/index', 'after-blank-site')];
                R.dbAfterBlank = siteDb(app);
            } finally {
                if (set) {
                    const panel = await openSite(page, app, 'settings').catch(() => null);
                    if (panel) { await nameSite(panel); await panel.locator('#siteConfig-redirectContextId-control').selectOption({index: 0}); R.finallyBlank = await saveTab(page, panel); }
                }
                RESTORED.push({what: 'Journal redirect', why: 'redirect phase', after: siteDb(app).site});
                await restoreTitle('redirect phase');
                R.dbAfter = siteDb(app);
            }
        });

        // ── stats: td6 (OJS/OMP), the box on OPS ────────────────────────────
        if (on('stats')) await step('stats', async (R) => {
            R.dbBefore = siteDb(app);
            let ticked = false;
            const readReviewer = async (label) => {
                const p2 = await fresh();
                await signIn(p2, u('mb'));
                const rid = st.sb.reviewRounds[0].id;
                await p2.goto(app.url(`/index.php/${st.B.path}/dashboard/editorial?workflowSubmissionId=${st.sb.submissionId}&workflowMenuKey=workflow_3_${rid}`));
                await idle(p2);
                await p2.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
                await idle(p2);
                const add = p2.getByRole('button', {name: 'Add Reviewer', exact: true}).first();
                await add.waitFor({timeout: T});
                await loc(p2, 'review stage: "Add Reviewer" (manager of B)', add);
                await add.click(); await idle(p2);
                const dlg = p2.getByRole('dialog', {name: /Add Reviewer/i}).last();
                await dlg.waitFor({timeout: 30000});
                await p2.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].pop(); return d && d.innerText.length > 100; }, null, {timeout: 15000}).catch(() => {});
                await idle(p2);
                const search = dlg.getByRole('searchbox').or(dlg.locator('input[type="search"]')).first();
                await loc(p2, 'Add Reviewer window: search box', search);
                await search.fill(`Reviewer${t}`);
                await search.press('Enter');
                await idle(p2); await sleep(1200);
                const item = dlg.locator('.listPanel__item').filter({hasText: `Reviewer${t}`}).first();
                await loc(p2, 'Add Reviewer window: the throwaway reviewer\'s row', item);
                const s = await snap(p2, `t01-add-reviewer-${label}`);
                const txt = await item.innerText().catch(() => null);
                // open the row's details if it has a toggle
                const more = item.getByRole('button', {name: /details|More|Expand|Show/i}).first();
                let detail = null;
                if (await more.count()) { await more.click().catch(() => {}); await sleep(600); detail = await item.innerText().catch(() => null); await snap(p2, `t02-add-reviewer-${label}-details`); }
                return {row: flat(txt, 800), detail: flat(detail, 1200), dialogHas: flat(s.text.dialog, 200)};
            };
            try {
                await signIn(page, 'admin');
                let panel = await openSite(page, app, 'settings');
                const box = panel.getByRole('checkbox', {name: 'Disable aggregated reviewer statistics'});
                R.boxOffered = await box.count();
                R.boxChecked = R.boxOffered ? await box.isChecked() : null;
                await snap(page, 't00-settings-box');
                if (!hasReview) {
                    // OPS: the box is offered; a moderator's workflow has no reviewer search
                    const s = await app.api.createSubmission({tag: `${t}so`, context: st.B.path, submitter: u('ab')});
                    const p2 = await fresh();
                    await signIn(p2, u('mb'));
                    await p2.goto(app.url(`/index.php/${st.B.path}/dashboard/editorial?workflowSubmissionId=${s.submissionId}`));
                    await idle(p2);
                    await p2.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000}).catch(() => {});
                    await idle(p2);
                    const sn = await snap(p2, 't03-ops-workflow');
                    R.opsWorkflow = {addReviewer: await p2.getByRole('button', {name: 'Add Reviewer'}).count(), menu: flat(sn.text.dialog, 600)};
                    return;
                }
                R.unticked = await readReviewer('unticked');
                await nameSite(panel);
                await box.check();
                R.tickSave = await saveTab(page, panel);
                ticked = true;
                R.tickDb = siteDb(app);
                R.ticked = await readReviewer('ticked');
                panel = await openSite(page, app, 'settings');
                await nameSite(panel);
                await panel.getByRole('checkbox', {name: 'Disable aggregated reviewer statistics'}).uncheck();
                R.untickSave = await saveTab(page, panel);
                ticked = false;
                R.untickedAgain = await readReviewer('unticked-again');
            } finally {
                if (ticked) {
                    const panel = await openSite(page, app, 'settings').catch(() => null);
                    if (panel) { await nameSite(panel); await panel.getByRole('checkbox', {name: 'Disable aggregated reviewer statistics'}).uncheck(); R.finallyUntick = await saveTab(page, panel); }
                }
                if (hasReview) { RESTORED.push({what: 'Disable aggregated reviewer statistics', why: 'stats phase', after: siteRows(app, ['disableSharedReviewerStatistics'])}); await restoreTitle('stats phase'); }
                R.dbAfter = siteDb(app);
            }
        });

        // ── password screens (Rules 10, 11) ─────────────────────────────────
        let R_maxlength = null;
        const profilePassword = async (who, oldPw, newPw, label) => {
            const p2 = await fresh();
            await signIn(p2, who, {password: oldPw});
            await p2.goto(app.url(`/index.php/${st.A.path}/en/user/profile/changePassword`));
            await idle(p2);
            const form = p2.locator('form#changePasswordForm');
            await form.waitFor({timeout: T});
            const hint = flat(await form.innerText(), 800);
            R_maxlength = await form.locator('input[type="password"]').evaluateAll((els) => els.map((e) => e.getAttribute('maxlength')));
            await form.locator('input[type="password"]').evaluateAll((els) => els.forEach((e) => e.removeAttribute('maxlength')));
            await form.locator('input[name="oldPassword"]').fill(oldPw);
            await form.locator('input[name="password"]').fill(newPw);
            await form.locator('input[name="password2"]').fill(newPw);
            const resp = p2.waitForResponse((r) => r.request().method() === 'POST' && /profile-tab\/save-/.test(r.url()) || /saveChangePassword|changePassword/.test(r.url()) && r.request().method() === 'POST', {timeout: 8000}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await resp;
            await idle(p2); await sleep(600);
            const s = await snap(p2, `p-${label}`);
            return {
                hint, maxlength: R_maxlength, sent: r ? r.status() : null,
                errors: (await p2.locator('form#changePasswordForm label.error:visible, form#changePasswordForm .pkp_notification:visible, form#changePasswordForm .error:visible').allInnerTexts()).map((x) => flat(x, 300)).filter(Boolean),
                toast: (await p2.locator('[role="status"]:visible').allInnerTexts()).map((x) => flat(x, 200)).filter(Boolean),
                panel: flat(await p2.locator('form#changePasswordForm').innerText().catch(() => ''), 900),
                url: s.url,
            };
        };
        const registerTry = async (password, label) => {
            const p2 = await fresh();
            await p2.goto(app.url('/index.php/index/en/user/register')); await idle(p2);
            const f = p2.locator('form#register');
            const x = `${t}${label.replace(/[^a-z0-9]/g, '').slice(0, 6)}`;
            await f.locator('input[name="givenName"]').fill('K1');
            await f.locator('input[name="familyName"]').fill('Registrant');
            await f.locator('input[name="affiliation"]').fill('PKP');
            await f.locator('select[name="country"]').selectOption({label: 'Canada'});
            await f.locator('input[name="email"]').fill(mailOf(x));
            await f.locator('input[name="username"]').fill(x);
            await f.locator('input[name="password"]').fill(password);
            await f.locator('input[name="password2"]').fill(password);
            const hint = flat(await f.innerText(), 2000).match(/[^.]*least[^.]*\./g);
            await f.locator('button.submit').click();
            await p2.waitForLoadState('load').catch(() => {}); await idle(p2);
            const s = await snap(p2, `g-${label}`);
            return {hint, url: s.url, errors: (await p2.locator('#formErrors li, label.error:visible, .pkp_form_error:visible').allInnerTexts()).map((x2) => flat(x2, 300)).filter(Boolean), stored: sql(app, `select count(*) from users where username='${x}'`)};
        };
        const resetTry = async (email, pwA, pwB, label) => {
            const p2 = await fresh();
            const m = await resetMail(p2, app, email);
            const link = m.mail ? (m.mail.text.match(/https?:\/\/\S+resetPassword\/\S+/) || [null])[0] : null;
            if (!link) return {mail: false};
            await p2.goto(link); await idle(p2);
            const s0 = await snap(p2, `q-${label}-form`);
            const out = {page: flat(s0.text.main, 600)};
            const tryPw = async (pw) => {
                await p2.locator('input[name="password"]').fill(pw);
                await p2.locator('input[name="password2"]').fill(pw);
                await p2.getByRole('button', {name: 'Save', exact: true}).click();
                await p2.waitForLoadState('load').catch(() => {}); await idle(p2);
                const s = await snap(p2, `q-${label}-${pw.length}`);
                return {len: pw.length, url: s.url.replace(/^https?:\/\/[^/]+/, ''), text: flat(s.text.main, 500), errors: (await p2.locator('label.error:visible, #formErrors li, .pkp_form_error:visible').allInnerTexts()).map((x) => flat(x, 300))};
            };
            out.short = await tryPw(pwA);
            if (pwB) out.ok = await tryPw(pwB);
            return out;
        };
        const inviteTry = async (password, label) => {
            const p2 = await fresh();
            await signIn(p2, u('mg'));
            await p2.goto(app.url(`/index.php/${st.A.path}/en/management/settings/access`)); await idle(p2);
            await p2.getByRole('button', {name: 'Invite to a role'}).click();
            const email = mailOf(`${t}iv${label.slice(0, 3)}`);
            await p2.getByLabel(/Search for a user by email address/).first().fill(email);
            await p2.getByRole('button', {name: 'Search User', exact: true}).click();
            await p2.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
            await p2.getByLabel(/^Given Name/).first().fill('Inva');
            const row = p2.getByRole('row').filter({has: p2.locator('select[name="userGroupId"]')}).last();
            await row.locator('select[name="userGroupId"]').selectOption({label: isOps ? 'Moderator' : 'Author'});
            const d = new Date(); const pad = (n) => String(n).padStart(2, '0');
            await row.locator('input[name="dateStart"]').fill(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
            if (await row.locator('select[name="masthead"]').count()) await row.locator('select[name="masthead"]').selectOption({label: 'Appear on the masthead'});
            await p2.getByRole('button', {name: 'Save And Continue'}).click();
            await p2.getByLabel(/^Subject/).first().waitFor({timeout: T});
            await p2.waitForFunction(() => !document.querySelector('.composer__loadingTemplateMask'), null, {timeout: T}).catch(() => {});
            await p2.getByRole('button', {name: 'Invite user to the role'}).click();
            await p2.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T});
            let msg = null;
            for (let i = 0; i < 40 && !msg; i++) { const res = await app.mail._search({to: email}); msg = (res.messages || [])[0]; if (!msg) await sleep(500); }
            const full = await app.mail.fullMessage(msg.ID);
            const acc = (full.HTML.match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i) || [null, null])[1];
            const p3 = await fresh();
            await p3.goto(acc.replace(/&amp;/g, '&')); await idle(p3);
            await p3.getByRole('heading', {name: /Create .* account/}).waitFor({timeout: T});
            const hint = await p3.getByText(/at least \d+ characters/).first().innerText().catch(() => null);
            await p3.getByLabel(/^Username/).fill(`${t}iu${label.slice(0, 3)}`);
            await p3.getByLabel(/^Password/).fill(password);
            await p3.getByRole('checkbox').first().check().catch(() => {});
            await p3.getByRole('button', {name: 'Save and continue'}).click();
            await idle(p3); await sleep(800);
            const s = await snap(p3, `v-${label}`);
            return {hint, errors: (await p3.locator('.pkpFieldError:visible, [class*="error"]:visible').allInnerTexts()).map((x) => flat(x, 300)).filter(Boolean), stillOnAccount: await p3.getByRole('heading', {name: /Create .* account/}).isVisible(), text: flat(s.text.main, 700)};
        };
        const minBox = (panel) => panel.locator('#siteSecurity-minPasswordLength-control');
        const setMin = async (v) => {
            const panel = await openSite(page, app, 'security');
            await minBox(panel).fill(String(v));
            const r = await saveTab(page, panel);
            return r;
        };

        // ── security: the "Security" tab, td7 ───────────────────────────────
        if (on('security')) await step('security', async (R) => {
            R.dbBefore = siteDb(app);
            let changed = false;
            try {
                // keep-working: a 6-character password chosen while 6 is the minimum
                R.ka6 = await profilePassword(u('ka'), pw2(u('ka')), 'k1ka66', 'ka-to-6-at-6');
                await signIn(page, 'admin');
                let panel = await openSite(page, app, 'security');
                await snap(page, 'c01-security');
                R.fields = await formFacts(panel);
                await loc(page, 'Site Setup › Security: "Minimum password length (characters)"', minBox(panel));
                await loc(page, 'Site Setup › Security: "Check passwords against compromised password databases"', panel.getByRole('checkbox', {name: 'Check passwords against compromised password databases'}));
                await loc(page, 'Site Setup › Security: "Enable rate limiting"', panel.getByRole('checkbox', {name: 'Enable rate limiting'}));
                // leaving unsaved
                await minBox(panel).fill('9');
                await page.locator('#settings-button').first().click(); await sleep(700);
                await page.locator('#security-button').first().click(); await sleep(500);
                R.leaveBack = await minBox(panel).inputValue();
                await minBox(panel).blur();
                await page.goto(app.url('/index.php/index/en/admin')); await idle(page);
                R.leaveDialogs = DIALOGS.filter((d) => d.phase === 'security');
                R.leaveDb = siteDb(app).site;
                // td7 refusals
                R.td7 = {};
                for (const v of ['3', 'abc', '', '4.5', '-1']) {
                    changed = true;
                    R.td7[v || '(empty)'] = await setMin(v);
                    await snap(page, `c02-min-${v || 'empty'}`.replace('.', '_'));
                    R.td7[v || '(empty)'].db = siteDb(app).site;
                }
                R.at4 = await setMin(4);
                R.at4db = siteDb(app).site;
                R.at8 = await setMin(8);
                panel = await openSite(page, app, 'security');
                R.at8reload = await minBox(panel).inputValue();
                R.at8db = siteDb(app).site;
                await snap(page, 'c03-min-8-reloaded');
                // the password screens at 8
                R.profile7 = await profilePassword(u('pw'), pw2(u('pw')), 'k1pass7', 'pw-7-at-8');
                R.profile8 = await profilePassword(u('pw'), pw2(u('pw')), 'k1pass88', 'pw-8-at-8');
                st.pwPassword = R.profile8.errors && R.profile8.errors.length ? pw2(u('pw')) : 'k1pass88'; saveState();
                R.register7 = await registerTry('k1reg77', 'reg7at8');
                R.reset = await resetTry(mailOf(u('rs')), 'k1rst77', 'k1rst888', 'reset-at-8');
                if (R.reset.ok && !R.reset.ok.errors.length) { st.rsPassword = 'k1rst888'; saveState(); }
                R.invite7 = await inviteTry('k1inv77', 'at8');
                // keep-working: the 6-character password at 8
                const p2 = await fresh();
                await p2.goto(app.url('/index.php/index/en/login')); await idle(p2);
                await p2.locator('input#username').fill(u('ka'));
                await p2.locator('input#password').fill('k1ka66');
                await p2.locator('form#login button[type="submit"]').click();
                await p2.waitForLoadState('load').catch(() => {}); await idle(p2);
                const s = await snap(p2, 'c04-ka-signin-6-at-8');
                R.kaSignIn = {url: s.url.replace(/^https?:\/\/[^/]+/, ''), header: flat(s.text.header, 200)};
                // the 6 end again: Profile accepts a 6-character password
                R.restore6 = await setMin(6);
                changed = false;
                R.profile6at6 = await profilePassword(u('pw'), st.pwPassword, 'k1pw66', 'pw-6-at-6');
                if (!R.profile6at6.errors.length) { st.pwPassword = 'k1pw66'; saveState(); }
            } finally {
                if (changed) R.finallyRestore = await setMin(6).catch((e) => String(e.message));
                RESTORED.push({what: 'Minimum password length', why: 'security phase', after: siteDb(app).site});
                R.dbAfter = siteDb(app);
            }
        });

        // ── compromised: Rule 11 ────────────────────────────────────────────
        const setBox = async (name, v) => {
            const panel = await openSite(page, app, 'security');
            const box = panel.getByRole('checkbox', {name});
            if (v) await box.check(); else await box.uncheck();
            return saveTab(page, panel);
        };
        if (on('compromised')) await step('compromised', async (R) => {
            R.dbBefore = siteDb(app);
            let changed = false;
            try {
                await signIn(page, 'admin');
                // unticked end first: a leaked password accepted on Register (control)
                R.registerUnticked = await registerTry('qwerty123456', 'rqoff');
                R.tick = await setBox('Check passwords against compromised password databases', true);
                changed = true;
                R.tickDb = siteRows(app, ['passwordUncompromisedEnabled']);
                R.profileTicked = await profilePassword(u('cp'), pw2(u('cp')), 'qwerty123456', 'cp-qwerty-ticked');
                R.profileTickedStrong = await profilePassword(u('cp'), pw2(u('cp')), `Zk1${t}x!`, 'cp-strong-ticked');
                st.cpPassword = R.profileTickedStrong.errors.length ? pw2(u('cp')) : `Zk1${t}x!`; saveState();
                R.registerTicked = await registerTry('qwerty123456', 'rqon');
                R.untick = await setBox('Check passwords against compromised password databases', false);
                changed = false;
                R.profileUnticked = await profilePassword(u('cp'), st.cpPassword, 'qwerty123456', 'cp-qwerty-unticked');
                if (!R.profileUnticked.errors.length) { st.cpPassword = 'qwerty123456'; saveState(); }
            } finally {
                if (changed) R.finallyRestore = await setBox('Check passwords against compromised password databases', false).catch((e) => String(e.message));
                RESTORED.push({what: 'Compromised Password Check', why: 'compromised phase', after: siteRows(app, ['passwordUncompromisedEnabled'])});
                R.dbAfter = siteDb(app);
            }
        });

        // ── ratelimit: td8 ──────────────────────────────────────────────────
        if (on('ratelimit')) await step('ratelimit', async (R) => {
            R.dbBefore = siteDb(app);
            let changed = false;
            const rlFields = async (panel) => ({
                max: await panel.locator('#siteSecurity-rateLimitMaxAttempts-control').isVisible().catch(() => false) ? await panel.locator('#siteSecurity-rateLimitMaxAttempts-control').inputValue() : '(hidden)',
                decay: await panel.locator('#siteSecurity-rateLimitDecaySeconds-control').isVisible().catch(() => false) ? await panel.locator('#siteSecurity-rateLimitDecaySeconds-control').inputValue() : '(hidden)',
            });
            const attempt = async (p2, who, pw, label) => {
                await p2.goto(app.url('/index.php/index/en/login')); await idle(p2);
                await p2.locator('input#username').fill(who);
                await p2.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
                await p2.locator('input#password').fill(pw);
                const resp = p2.waitForResponse((r) => /login\/signIn/.test(r.url()), {timeout: 10000}).catch(() => null);
                await p2.locator('form#login button[type="submit"]').click();
                const r = await resp;
                await p2.waitForLoadState('load').catch(() => {}); await idle(p2);
                const s = await snap(p2, `l-${label}`);
                return {label, at: new Date().toISOString(), status: r ? r.status() : null, url: s.url.replace(/^https?:\/\/[^/]+/, ''), message: flat((await p2.locator('.pkp_form_error, .cmp_notification, [role="alert"], .pkp_notification, form#login .error').allInnerTexts().catch(() => [])).join(' | '), 400), signedIn: (s.text.header || '').includes(who)};
            };
            try {
                await signIn(page, 'admin');
                let panel = await openSite(page, app, 'security');
                R.before = await rlFields(panel);
                const en = panel.getByRole('checkbox', {name: 'Enable rate limiting'});
                await en.check(); await sleep(400);
                R.ticked = await rlFields(panel);
                R.tickedFacts = await formFacts(panel);
                await snap(page, 'k01-ratelimit-ticked');
                await loc(page, 'Site Setup › Security: "Maximum attempts"', panel.locator('#siteSecurity-rateLimitMaxAttempts-control'));
                await loc(page, 'Site Setup › Security: "Lockout duration (seconds)"', panel.locator('#siteSecurity-rateLimitDecaySeconds-control'));
                await en.uncheck(); await sleep(400);
                R.unticked = await rlFields(panel);
                await en.check(); await sleep(300);
                await panel.locator('#siteSecurity-rateLimitMaxAttempts-control').fill('0');
                await panel.locator('#siteSecurity-rateLimitDecaySeconds-control').fill('59');
                changed = true;
                R.refused = await saveTab(page, panel);
                await snap(page, 'k02-ratelimit-0-59');
                R.refusedDb = siteDb(app).settings;
                await panel.locator('#siteSecurity-rateLimitMaxAttempts-control').fill('2');
                await panel.locator('#siteSecurity-rateLimitDecaySeconds-control').fill('60');
                R.saved = await saveTab(page, panel);
                panel = await openSite(page, app, 'security');
                R.savedReload = await rlFields(panel);
                R.savedDb = siteDb(app).settings;
                await snap(page, 'k03-ratelimit-2-60-reloaded');
                // sign-in attempts from one address (the probe's)
                const p2 = await fresh();
                R.attempts = [];
                R.attempts.push(await attempt(p2, u('rl1'), 'wrong-one', 'rl1-wrong1'));
                R.attempts.push(await attempt(p2, u('rl1'), 'wrong-two', 'rl1-wrong2'));
                R.attempts.push(await attempt(p2, u('rl1'), pw2(u('rl1')), 'rl1-right-after-2'));
                const p3 = await fresh();
                R.otherAccount = await attempt(p3, u('rl2'), pw2(u('rl2')), 'rl2-right');
                // password reset requests for one address
                R.resets = [];
                R.resetMailsBefore = await app.mail.count({to: mailOf(u('rl2'))});
                for (let i = 1; i <= 3; i++) {
                    const p4 = await fresh();
                    const m = await resetMail(p4, app, mailOf(u('rl2')));
                    R.resets.push({i, shown: m.shown, mail: !!m.mail});
                    await snap(p4, `l-reset-${i}`);
                }
                await sleep(3000);
                R.resetMailsAfter = await app.mail.count({to: mailOf(u('rl2'))});
                // the lockout runs out (60 s after the last failure)
                const last = new Date(R.attempts[1].at).getTime();
                const wait = Math.max(0, last + 62_000 - Date.now());
                R.waitedMs = wait;
                await sleep(wait);
                const p5 = await fresh();
                R.afterLockout = await attempt(p5, u('rl1'), pw2(u('rl1')), 'rl1-right-after-lockout');
                // emptied boxes
                panel = await openSite(page, app, 'security');
                await panel.locator('#siteSecurity-rateLimitMaxAttempts-control').fill('');
                await panel.locator('#siteSecurity-rateLimitDecaySeconds-control').fill('');
                R.emptied = await saveTab(page, panel);
                panel = await openSite(page, app, 'security');
                R.emptiedReload = await rlFields(panel);
                R.emptiedDb = siteDb(app).settings;
                await snap(page, 'k04-ratelimit-emptied-reloaded');
                // back: 5 and 300, unticked
                panel = await openSite(page, app, 'security');
                if (!(await panel.getByRole('checkbox', {name: 'Enable rate limiting'}).isChecked())) await panel.getByRole('checkbox', {name: 'Enable rate limiting'}).check();
                await panel.locator('#siteSecurity-rateLimitMaxAttempts-control').fill('5');
                await panel.locator('#siteSecurity-rateLimitDecaySeconds-control').fill('300');
                R.back5300 = await saveTab(page, panel);
                panel = await openSite(page, app, 'security');
                await panel.getByRole('checkbox', {name: 'Enable rate limiting'}).uncheck();
                R.untickSave = await saveTab(page, panel);
                changed = false;
            } finally {
                if (changed) {
                    const panel = await openSite(page, app, 'security').catch(() => null);
                    if (panel) {
                        const en = panel.getByRole('checkbox', {name: 'Enable rate limiting'});
                        if (!(await en.isChecked())) await en.check();
                        await panel.locator('#siteSecurity-rateLimitMaxAttempts-control').fill('5');
                        await panel.locator('#siteSecurity-rateLimitDecaySeconds-control').fill('300');
                        await saveTab(page, panel);
                        const p = await openSite(page, app, 'security');
                        await p.getByRole('checkbox', {name: 'Enable rate limiting'}).uncheck();
                        R.finallyRestore = await saveTab(page, p);
                    }
                }
                RESTORED.push({what: 'Rate limiting', why: 'ratelimit phase', after: siteRows(app, ['rateLimitEnabled', 'rateLimitMaxAttempts', 'rateLimitDecaySeconds'])});
                R.dbAfter = siteDb(app);
            }
        });

        // ── rule22: the Information tab's refused email; a manager at the address ──
        if (on('rule22')) await step('rule22', async (R) => {
            R.dbBefore = siteDb(app);
            await signIn(page, 'admin');
            const panel = await openSite(page, app, 'info');
            const email = panel.locator('input[id*="contactEmail"]').first();
            await loc(page, 'Site Setup › Information: "Email of principal contact"', email);
            R.emailBefore = await email.inputValue();
            await email.fill('not-an-address');
            R.badEmail = await saveTab(page, panel);
            await snap(page, 'x01-info-bad-email');
            R.dbAfterBad = siteRows(app, ['contactEmail']);
            // A4's first half: the page refuses the empty required contact fields before sending
            R.emptyContact = {};
            for (const [k, sel] of [['name', 'input[id*="contactName-control-en"]'], ['email', 'input[id*="contactEmail-control-en"]']]) {
                const p = await openSite(page, app, 'info');
                const box = p.locator(sel).first();
                const before = await box.inputValue();
                await box.fill('');
                R.emptyContact[k] = await saveTab(page, p);
                R.emptyContact[k].db = siteRows(app, ['contactName', 'contactEmail']);
                if (R.emptyContact[k].status === 200) {
                    const p2 = await openSite(page, app, 'info');
                    await p2.locator(sel).first().fill(before);
                    R.emptyContact[k].restore = await saveTab(page, p2);
                    RESTORED.push({what: `contact ${k}`, why: 'rule22 phase', after: siteRows(app, ['contactName', 'contactEmail'])});
                }
            }
            await snap(page, 'x03-info-empty-contact');
            await page.goto(app.url('/index.php/index/en/admin')); await idle(page);
            // Journal Manager at the Site Settings address
            const p2 = await fresh();
            await signIn(p2, u('mg'));
            for (const [k, p] of [['settings', '/index.php/index/en/admin/settings'], ['settingsCtx', `/index.php/${st.A.path}/en/admin/settings`]]) {
                const resp = await p2.goto(app.url(p)).catch(() => null);
                await idle(p2);
                const s = await snap(p2, `x02-manager-${k}`);
                R[`manager_${k}`] = {status: resp ? resp.status() : null, url: s.url.replace(/^https?:\/\/[^/]+/, ''), title: s.title, text: flat(s.text.main, 300)};
            }
            R.dbAfter = siteDb(app);
        });
    } finally {
        record(factsName, {crashIndex: CRASH, restored: RESTORED}, {merge: true});
        for (const x of OPEN) await x.close().catch(() => {});
        await close();
    }
});
