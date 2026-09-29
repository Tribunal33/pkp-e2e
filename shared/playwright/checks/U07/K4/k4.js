// U07 claim check, chunk K4: "Editorial Masthead", "Peer Reviewers in Previous Year",
// "Editorial History" and the two masthead choices behind them, on all three apps.
// Spec: docs/specs/U07-journal-identity-and-about-pages.md — Rules 14–16 (313–377),
// Settings bullets 2–4 (483–505), scenarios 7, 8, 9, 12, register A4, A5, A6, A10,
// OPS4; footnotes e, r, s, t, z, td11–td14, f-a4, f-a5, f-a6, f-a10.
// 2026-09-29 (s29, upstream sync pkp-lib#13370 / #13390): the "Enrollment-based
// Masthead" and "Enable listing of reviewers on the masthead" boxes (phases
// reviewers, enroll, upgraded), a start date reached (later), "Merge user" (merge),
// scenario 12 on OPS (ops12).
//
// Seeds per app (tag prefix u07s29k4; RUN=r1 suffixes every record so two runs keep
// their own facts):
//   M  the main scratch context: a manager; Section editors (OMP "Series editor", OPS
//      "Moderator") Zulu / Alpha / Mike (td11), one with affiliation + verified ORCID,
//      one with an unverified ORCID, one holding two listed roles, one "Does not
//      appear", one to disable (A4), one to "Remove Role" (td14), one to "Remove User",
//      one whose masthead choice is changed on screen; an Author (a role unticked by
//      default); past members (2019–2024; two periods; one "Does not appear"); two
//      readers to invite (today; a later start date, A5); [OJS/OMP] reviewers who
//      completed a review last year (two, plus one cancelled on screen afterwards),
//      one this year, one declined; [OMP] one internal-review reviewer last year.
//   D  a fresh context: a manager and one Section editor with a verified ORCID
//      (ORCID off on the context), for the defaults and the empty history page.
//   U  (phase upgraded) a context whose two masthead settings rows are deleted, as a
//      context created before pkp-lib#13370 has them: a Section editor, a past member,
//      [OJS/OMP] a reviewer with a review completed last year.
// Phases (PHASES=a,b to narrow; the seed is kept in k4-state-<app>.json, RESEED=1):
//   defaults  D: every role's "Consider role in masthead list" box; D's pages
//   pk        publicknowledge signed out: masthead (no reviewer block) and history
//   initial   M signed out, as a member and as the manager: masthead and history
//   profile   M: "Mike" sets a Preferred Public Name, a homepage and a picture
//   histtext  M: "Editorial History" text saved on Settings › Journal › Masthead (td14)
//   remove    M: "Remove Role" on a Section editor (td14)
//   choice    M: a member's masthead choice changed on the Edit page (bullet 3, 14e)
//   disable   M: A4 — disable a listed member, reload; "Remove User" on another; enable
//   roles     M: tick Author, untick Section editor, untick Reviewer (bullet 2); leave unsaved
//   cancel    M [OJS/OMP]: "Cancel Reviewer" on a review completed last year (Rule 15)
//   invite    M: invitations accepted, start today and a later start date (14b, A5)
//   order     M: Appearance › "Editorial Masthead" order changed (14a)
//   leave     M: the Edit page left with an unsaved new role row
//   reviewers M: "Enable listing of reviewers on the masthead" ticked (Rule 15), the
//             Reviewer role's box unticked with it (bullet 2), a listed reviewer disabled
//   later     M: the later start date reached (the row's date moved to yesterday), A5
//   enroll    M/D: the reviewers box and "Present a masthead based on user enrollments"
//             unticked and ticked again; the form left unsaved; editorialHistory address
//   merge     M: "Merge user" of a listed member into the Author
//   upgraded  U: the pages and the form with no settings rows, then the box saved
//   order2    M: a second role ended, so "Editorial History" shows the saved order too
//   ops12     OPS publicknowledge as manager.maya (read only): scenario 12
//   french    publicknowledge in French (read only): OPS4, OJS and OMP the control
// Run: PROBE_FEATURE=U07 PROBE_AGENT=ccK4s29 RUN=r1 node bin/probe.js all shared/playwright/checks/U07/K4/k4.js
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record: rec0, loc, note, idle, tag, outDir} =
    require('../../../probe');
const record = (name, data, opts) => rec0(`${name}${SFX}`, data, opts);

const ALL = ['defaults', 'pk', 'initial', 'profile', 'histtext', 'a4', 'roles', 'reviewers', 'cancel', 'invite', 'later', 'order', 'order2', 'enroll', 'leave', 'again', 'horcid', 'merge', 'upgraded', 'ops12', 'french', 'final'];
const SFX = process.env.RUN ? `-${process.env.RUN}` : '';
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL;
const on = (p) => PHASES.includes(p);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30_000;
const flat = (s, n = 4000) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const stateFile = (app) => path.join(outDir(), `k4-state${SFX}-${app.name}.json`);
const NOW = new Date();
const YEAR = NOW.getFullYear();
const LAST = YEAR - 1;
const ymd = (d) => d.toISOString().slice(0, 10);
const TODAY = ymd(NOW);
const LATER = ymd(new Date(NOW.getTime() + 30 * 86400_000));
const log = (...a) => console.log('[k4]', new Date().toISOString().slice(11, 19), ...a);
const REPO = path.resolve(__dirname, '../../../../..');

// ---------------------------------------------------------------------------

async function snap(page, name, extra = {}) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 300)}; }
    Object.assign(s, extra);
    record(name, s);
    await shot(page, `${name}${SFX}`).catch(() => {});
    return s;
}

/** The masthead / history page as data. */
async function readList(page) {
    return page.evaluate(() => {
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const root = document.querySelector('.page_masthead') || document.querySelector('.pkp_structure_main') || document.body;
        const out = {h1: [...root.querySelectorAll('h1')].map(txt), title: document.title, crumbs: txt(document.querySelector('.cmp_breadcrumbs'))};
        out.sequence = [...root.children].map((e) => ({tag: e.tagName, cls: e.className, text: txt(e).slice(0, 300)}));
        out.sections = [];
        let cur = null;
        for (const e of root.children) {
            if (e.tagName === 'H2') { cur = {heading: txt(e), items: []}; out.sections.push(cur); }
            if (e.tagName === 'UL' && cur) {
                for (const li of e.querySelectorAll(':scope > li')) {
                    const a = li.querySelector('.orcid a');
                    cur.items.push({
                        text: txt(li),
                        date: txt(li.querySelector('.date_start')),
                        name: txt(li.querySelector('.name')),
                        affiliation: txt(li.querySelector('.affiliation')),
                        orcid: a ? {href: a.getAttribute('href'), target: a.getAttribute('target'), aria: a.getAttribute('aria-label'), hasSvg: !!a.querySelector('svg, img')} : null,
                        imgs: li.querySelectorAll('img').length,
                        links: [...li.querySelectorAll('a')].map((x) => x.getAttribute('href')),
                        html: li.innerHTML.replace(/\s+/g, ' ').slice(0, 600),
                    });
                }
            }
        }
        const ps = [...root.querySelectorAll(':scope > p')];
        out.paragraphs = ps.map((p) => ({text: txt(p), links: [...p.querySelectorAll('a')].map((a) => ({text: txt(a), href: a.getAttribute('href')}))}));
        out.hr = root.querySelectorAll('hr').length;
        out.nav = [...document.querySelectorAll('#navigationPrimary a')].map((a) => [txt(a), a.getAttribute('href')]);
        out.editLinks = [...root.querySelectorAll('a.cmp_edit_link, a[href*="management/settings"]')].map((a) => ({text: txt(a), href: a.getAttribute('href')}));
        out.mailto = [...root.querySelectorAll('a[href^="mailto"]')].length;
        out.imgs = [...root.querySelectorAll('img')].map((i) => i.getAttribute('src'));
        out.pageText = txt(root);
        return out;
    }).catch((e) => ({error: String(e.message || e)}));
}

async function openPage(page, app, ctx, which, name) {
    const url = app.url(`/index.php/${ctx}/about/${which === 'history' ? 'editorialHistory' : 'editorialMasthead'}`);
    let status = null;
    try { const r = await page.goto(url); status = r ? r.status() : null; } catch (e) { return {error: String(e.message)}; }
    await idle(page).catch(() => {});
    const s = await snap(page, name);
    const data = await readList(page);
    const out = {status, url: page.url(), ...data};
    record(`${name}-data`, out);
    return out;
}

/** Compact: "heading: a | b" lines. */
function brief(d) {
    if (!d || !d.sections) return d;
    if (d.status && d.status !== 200) return [`STATUS ${d.status}`];
    return d.sections.map((s) => `${s.heading}: ${s.items.map((i) => i.text).join(' | ')}`);
}

// Users & Roles helpers -------------------------------------------------------

async function gotoAccess(page, app, ctx) {
    await page.goto(app.url(`/index.php/${ctx}/management/settings/access`));
    await page.getByRole('heading', {name: 'Users & Roles'}).waitFor({timeout: T});
    await page.getByRole('table', {name: /Current Users \(/}).waitFor({timeout: T});
    await idle(page);
}
function userRow(page, email) {
    return page.getByRole('table', {name: /Current Users \(/}).getByRole('row').filter({hasText: email});
}
async function openRowMenu(page, email) {
    await userRow(page, email).getByRole('button', {name: /management.options|options/i}).click();
    await page.getByRole('menuitem').first().waitFor({timeout: T});
    return (await page.getByRole('menuitem').allInnerTexts()).map((t) => flat(t));
}
async function dialogButtons(page) {
    return page.getByRole('dialog').last().getByRole('button').allInnerTexts().catch(() => []);
}

async function openRolesTab(page, app, ctx) {
    await page.goto(app.url(`/index.php/${ctx}/management/settings/access`));
    await idle(page);
    await page.getByRole('tab', {name: 'Roles'}).click();
    await idle(page);
    await page.getByRole('row').filter({has: page.getByRole('link', {name: 'Settings'})}).first().waitFor({timeout: T});
}

/** Open a role's window from the Roles grid; returns the form locator. */
async function openRoleForm(page, app, ctx, roleName) {
    await openRolesTab(page, app, ctx);
    const row = page.getByRole('row', {name: new RegExp(`^Settings ${roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `)}).first();
    await row.getByRole('link', {name: 'Settings'}).click();
    const next = row.locator('xpath=following-sibling::tr[1]');
    await next.getByRole('link', {name: 'Edit', exact: true}).click();
    const form = page.locator('#userGroupForm');
    await form.waitFor({timeout: T});
    await idle(page);
    return form;
}

async function setRoleBox(page, app, ctx, roleName, label, value, name) {
    const form = await openRoleForm(page, app, ctx, roleName);
    const box = form.getByRole('checkbox', {name: label});
    const before = await box.isChecked();
    if (value) await box.check(); else await box.uncheck();
    await snap(page, `${name}-form`);
    const w = page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'OK'}).click();
    const r = await w;
    await idle(page);
    const msg = await page.locator('.pkp_notification, [role=status], .ui-pnotify').allInnerTexts().catch(() => []);
    return {before, after: value, status: r ? r.status() : null, msg: msg.map((m) => flat(m, 200))};
}

// Database (scratch contexts only): the fleet's own database, as the kit names it.
const sql = (app, q) => execFileSync('psql', ['-d', app.db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim();
const SETTINGS = {ojs: ['journal_settings', 'journal_id'], omp: ['press_settings', 'press_id'], ops: ['server_settings', 'server_id']};
const mastheadRows = (app, id) => {
    const [tbl, col] = SETTINGS[app.name];
    return sql(app, `select setting_name || '=' || coalesce(setting_value, 'NULL') from ${tbl} where ${col} = ${Number(id)} and setting_name like 'enableEnrollment%' order by 1`).split('\n').filter(Boolean);
};

// Settings › Website › "Appearance" › "Editorial Masthead" -------------------
const ENROLL = 'Present a masthead based on user enrollments';
const REVBOX = 'Enable listing of reviewers on the masthead';

async function openMastheadForm(page, app, ctx) {
    await page.goto(app.url(`/index.php/${ctx}/management/settings/website`));
    await idle(page);
    await page.locator('#appearance-button').click();
    await idle(page);
    await page.getByRole('tab', {name: 'Editorial Masthead', exact: true}).filter({visible: true}).first().click();
    await idle(page); await sleep(500);
    const form = page.locator('#appearance [role="tabpanel"]:visible form').first();
    await form.waitFor({timeout: T});
    return form;
}

async function readMastheadForm(form) {
    const box = async (label) => {
        const b = form.getByRole('checkbox', {name: label, exact: true});
        const n = await b.count();
        return n ? {count: n, checked: await b.first().isChecked(), visible: await b.first().isVisible()} : {count: 0};
    };
    const roles = form.locator('[id^="appearanceMasthead-mastheadUserGroupIds"]');
    return {
        text: flat(await form.innerText(), 2500),
        enroll: await box(ENROLL),
        reviewers: await box(REVBOX),
        rolesCount: await roles.count(),
        rolesVisible: (await roles.count()) ? await roles.first().isVisible() : false,
        legends: (await form.locator('legend, .pkpFormFieldLabel').allInnerTexts().catch(() => [])).map((x) => flat(x, 120)),
    };
}

/** Tick or untick one box of the form and save; read the page again after a reload. */
async function setMastheadBox(page, app, ctx, label, value, name) {
    const o = {label, value};
    let form = await openMastheadForm(page, app, ctx);
    o.before = await readMastheadForm(form);
    const b = form.getByRole('checkbox', {name: label, exact: true});
    if (!(await b.count())) { o.absent = true; await snap(page, `${name}-absent`); return o; }
    if (value) await b.check(); else await b.uncheck();
    await sleep(300);
    o.beforeSave = await readMastheadForm(form);
    await snap(page, `${name}-changed`);
    const w = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await w;
    o.status = r ? r.status() : null;
    o.saved = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
    await idle(page);
    o.samePage = await readMastheadForm(form);
    await snap(page, `${name}-saved`);
    form = await openMastheadForm(page, app, ctx);
    o.afterReload = await readMastheadForm(form);
    await snap(page, `${name}-reloaded`);
    return o;
}

/** Open an address and report the redirect chain (the History page's redirect). */
async function gotoChain(page, url) {
    const r = await page.goto(url);
    await idle(page).catch(() => {});
    const chain = [];
    let req = r ? r.request() : null;
    while (req) {
        const resp = await req.response().catch(() => null);
        chain.unshift({url: req.url(), status: resp ? resp.status() : null, location: resp ? resp.headers().location || null : null});
        req = req.redirectedFrom();
    }
    return {finalUrl: page.url(), status: r ? r.status() : null, chain};
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    const isOjs = app.name === 'ojs', isOmp = app.name === 'omp', isOps = app.name === 'ops';
    const PK = app.contextPath;
    const SE = isOjs ? 'Section editor' : isOmp ? 'Series editor' : 'Moderator';
    const ED = isOjs ? 'Journal editor' : 'Press editor';
    await app.api.bootstrapProbe(PK);
    const R = {app: app.name, errors: []};
    const step = async (name, fn) => {
        log(app.name, 'step', name);
        try { await fn(); } catch (e) { R.errors.push({step: name, error: String(e.message || e).slice(0, 500)}); log(app.name, 'ERROR', name, String(e.message || e).slice(0, 300)); }
    };

    // ── seed ────────────────────────────────────────────────────────────────
    let st = null;
    if (!process.env.RESEED && fs.existsSync(stateFile(app))) st = JSON.parse(fs.readFileSync(stateFile(app), 'utf8'));
    if (!st) {
        const t = tag('u07s29k4');
        const sec = isOjs ? {sections: ['ART']} : isOps ? {sections: ['PRE']} : {};
        const se = (u, g, f, extra = {}) => ({username: `${t}${u}`, roles: ['sectionEditor'], givenName: g, familyName: f, ...sec, ...extra});
        const users = [
            {username: `${t}mgr`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
            se('zu', 'Zed', 'Zulu'),
            se('al', 'Amy', 'Alpha', {affiliation: 'K4 Alpha University', orcid: 'https://orcid.org/0000-0002-1825-0097', orcidIsVerified: true}),
            se('mi', 'Max', 'Mike'),
            se('un', 'Una', 'Unverified', {orcid: 'https://orcid.org/0000-0001-5109-3700', orcidIsVerified: false}),
            {...se('two', 'Tia', 'Twofold'), roles: isOps ? ['sectionEditor', 'editorialBoardMember'] : ['sectionEditor', 'editor']},
            se('hid', 'Hal', 'Hidden', {masthead: {sectionEditor: false}}),
            se('dis', 'Dora', 'Disabled'),
            {...se('rm', 'Rory', 'Removed', {affiliation: 'K4 Removed College'}), roles: ['sectionEditor', 'reader']},
            se('ru', 'Ula', 'Removeuser'),
            se('chg', 'Cato', 'Changer'),
            se('mg', 'Mo', 'Mergedaway'),
            {username: `${t}au`, roles: ['author'], givenName: 'Aya', familyName: 'Author'},
            {username: `${t}p1`, roles: ['reader'], givenName: 'Pia', familyName: 'Pastone', affiliation: 'K4 Past University',
                pastRoles: [{role: 'sectionEditor', dateStart: '2019-03-01', dateEnd: '2024-06-30'}]},
            {username: `${t}p2`, roles: ['reader'], givenName: 'Pat', familyName: 'Pasttwo',
                pastRoles: [{role: 'sectionEditor', dateStart: '2015-01-01', dateEnd: '2016-12-31'}, {role: 'sectionEditor', dateStart: '2020-01-01', dateEnd: '2022-12-31'}]},
            {username: `${t}ph`, roles: ['reader'], givenName: 'Pax', familyName: 'Pasthidden', masthead: {sectionEditor: false},
                pastRoles: [{role: 'sectionEditor', dateStart: '2018-01-01', dateEnd: '2020-12-31'}]},
            {username: `${t}i1`, roles: ['reader'], givenName: 'Ivo', familyName: 'Invitedtoday'},
            {username: `${t}i2`, roles: ['reader'], givenName: 'Ina', familyName: 'Invitedlater'},
        ];
        if (!isOps) {
            users.push({username: `${t}ebh`, roles: ['editorialBoardMember'], givenName: 'Eli', familyName: 'Boardhidden', masthead: {editorialBoardMember: false}});
            users.push({username: `${t}rvy`, roles: ['externalReviewer'], givenName: 'Yuri', familyName: 'Young'});
            users.push({username: `${t}rvb`, roles: ['externalReviewer'], givenName: 'Bea', familyName: 'Brown', affiliation: 'K4 Review Institute', orcid: 'https://orcid.org/0000-0002-1694-233X', orcidIsVerified: true});
            users.push({username: `${t}rvc`, roles: ['externalReviewer'], givenName: 'Cal', familyName: 'Cancelled'});
            users.push({username: `${t}rvn`, roles: ['externalReviewer'], givenName: 'Nia', familyName: 'Now'});
            users.push({username: `${t}rvd`, roles: ['externalReviewer'], givenName: 'Dee', familyName: 'Declined'});
            if (isOmp) users.push({username: `${t}rvi`, roles: ['internalReviewer'], givenName: 'Ian', familyName: 'Internal'});
        }
        const M = await app.api.createContext({tag: t, context: {acronym: 'K4M', name: `K4 Masthead ${t}`}, users});
        const subs = {};
        if (!isOps) {
            subs.ext = await app.api.createSubmission({
                tag: `${t}x`, context: t, submitter: `${t}au`, title: `K4 external ${t}`,
                decisions: ['sendExternalReview'],
                reviewRounds: [{reviewers: [
                    {username: `${t}rvy`, status: 'completed', dateCompleted: `${LAST}-05-10`},
                    {username: `${t}rvb`, status: 'completed', dateCompleted: `${LAST}-11-20`},
                    {username: `${t}rvc`, status: 'completed', dateCompleted: `${LAST}-08-01`},
                    {username: `${t}rvn`, status: 'completed'},
                    {username: `${t}rvd`, status: 'declined'},
                ]}],
            });
            if (isOmp) {
                subs.int = await app.api.createSubmission({
                    tag: `${t}n`, context: t, submitter: `${t}au`, title: `K4 internal ${t}`,
                    decisions: ['sendInternalReview'],
                    reviewRounds: [{stage: 'internal', reviewers: [{username: `${t}rvi`, status: 'completed', dateCompleted: `${LAST}-07-01`}]}],
                });
            }
        }
        const d = tag('u07s29k4d');
        const D = await app.api.createContext({tag: d, context: {acronym: 'K4D'}, users: [
            {username: `${d}mgr`, roles: ['manager'], givenName: 'Dan', familyName: 'Manager'},
            {username: `${d}se`, roles: ['sectionEditor'], givenName: 'Vera', familyName: 'Verified', affiliation: 'K4 D University', orcid: 'https://orcid.org/0000-0002-1825-0097', orcidIsVerified: true, ...sec},
        ]});
        const ids = Object.fromEntries(M.users.map((u) => [u.username.slice(t.length), u.id]));
        st = {M: t, D: d, cid: {M: M.contextId, D: D.contextId}, ids, subs: Object.fromEntries(Object.entries(subs).map(([k, v]) => [k, {id: v.submissionId, ra: v.reviewAssignments}]))};
        fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
        record('seed', {st, M, D});
        log(app.name, 'seeded', JSON.stringify({M: t, D: d}));
    }
    const M = st.M, D = st.D, t = M;
    const mail = (u) => `${t}${u}@mail.test`;
    R.state = st;

    const {page, close, browser} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push({at: page.url(), type: d.type(), message: d.message()}); await d.accept().catch(() => {}); });
    const readM = async (name) => openPage(page, app, M, 'masthead', name);
    const readH = async (name) => openPage(page, app, M, 'history', name);

    try {
        // ── defaults: D's role boxes and pages ─────────────────────────────
        if (on('defaults')) await step('defaults', async () => {
            await signOut(page).catch(() => {});
            R.dMasthead = await openPage(page, app, D, 'masthead', 'd01-d-masthead-anon');
            R.dHistory = await openPage(page, app, D, 'history', 'd02-d-history-anon');
            await signIn(page, `${D}mgr`, {contextPath: D});
            await openRolesTab(page, app, D);
            await snap(page, 'd03-d-roles-grid');
            const names = await page.getByRole('row').filter({has: page.getByRole('link', {name: 'Settings'})}).evaluateAll((rows) => rows.map((r) => {
                const cells = [...r.querySelectorAll('td')].map((c) => c.innerText.replace(/\s+/g, ' ').trim());
                return cells;
            }));
            const allRows = await page.getByRole('row').evaluateAll((rows) => rows.map((r) => r.innerText.replace(/\s+/g, ' ').trim()));
            R.roleRows = allRows;
            R.roleBoxes = [];
            for (const cells of names) {
                const roleName = cells[0].replace(/^Settings\s+/, "");
                const o = {role: roleName, cells};
                try {
                    const form = await openRoleForm(page, app, D, roleName);
                    const box = form.getByRole('checkbox', {name: 'Consider role in masthead list'});
                    o.present = await box.count();
                    if (o.present) { o.checked = await box.isChecked(); o.enabled = await box.isEnabled(); }
                    o.formText = flat(await form.innerText(), 1500);
                    if (roleName === SE || /Reviewer/.test(roleName)) await snap(page, `d04-d-roleform-${roleName.replace(/\W+/g, '')}`);
                    if (/Reviewer/.test(roleName) || roleName === SE) await loc(page, `role window "${roleName}": "Consider role in masthead list"`, box);
                } catch (e) { o.error = String(e.message).slice(0, 200); }
                R.roleBoxes.push(o);
            }
            log(app.name, 'roleBoxes', JSON.stringify(R.roleBoxes.map((o) => `${o.role}=${o.checked}`)));
            // the D pages as the manager: edit link on history
            R.dHistoryMgr = await openPage(page, app, D, 'history', 'd05-d-history-mgr');
            R.dMastheadMgr = await openPage(page, app, D, 'masthead', 'd06-d-masthead-mgr');
            await signOut(page);
        });

        // ── pk: the seeded context ─────────────────────────────────────────
        if (on('pk')) await step('pk', async () => {
            await signOut(page).catch(() => {});
            R.pkMasthead = await openPage(page, app, PK, 'masthead', 'p01-pk-masthead-anon');
            R.pkHistory = await openPage(page, app, PK, 'history', 'p02-pk-history-anon');
        });

        // ── initial: M read signed out (builds the cache), as a member, as the manager ──
        if (on('initial')) await step('initial', async () => {
            await signOut(page).catch(() => {});
            R.m0 = await readM('i01-m-masthead-anon');
            R.h0 = await readH('i02-m-history-anon');
            log(app.name, 'masthead0', JSON.stringify(brief(R.m0)));
            log(app.name, 'history0', JSON.stringify(brief(R.h0)));
            // follow the history link
            const link = page.locator('.page_masthead p a').first();
            await page.goto(app.url(`/index.php/${M}/about/editorialMasthead`));
            await idle(page);
            await loc(page, 'Editorial Masthead: the "Editorial History" link', page.locator('.page_masthead p a').filter({hasText: 'Editorial History'}));
            await loc(page, 'Editorial Masthead: a role heading', page.getByRole('heading', {level: 2, name: SE}));
            await loc(page, 'Editorial Masthead: an ORCID link', page.locator('.page_masthead .orcid a').first());
            await link.click();
            await page.waitForLoadState('load');
            await idle(page);
            R.linkFollow = {url: page.url(), title: await page.title()};
            await snap(page, 'i03-m-history-via-link');
            // ORCID link: a click opens a new tab?
            await page.goto(app.url(`/index.php/${M}/about/editorialMasthead`));
            await idle(page);
            const orc = page.locator('.page_masthead .orcid a').first();
            if (await orc.count()) {
                const popup = page.context().waitForEvent('page', {timeout: 8000}).catch(() => null);
                await orc.click({modifiers: []}).catch(() => {});
                const p2 = await popup;
                R.orcidClick = {newTab: !!p2, url: p2 ? p2.url() : page.url()};
                if (p2) await p2.close().catch(() => {});
            }
            // as a listed member
            await signIn(page, `${t}zu`, {contextPath: M});
            R.m0se = await readM('i04-m-masthead-se');
            R.h0se = await readH('i05-m-history-se');
            await signIn(page, `${t}mgr`, {contextPath: M});
            R.m0mgr = await readM('i06-m-masthead-mgr');
            R.h0mgr = await readH('i07-m-history-mgr');
            await signOut(page);
        });

        // ── profile: Mike's preferred name, homepage, picture ──────────────
        if (on('profile')) await step('profile', async () => {
            const {ProfilePage} = require(path.join(REPO, 'shared/playwright/pages/ProfilePage.js'));
            await signIn(page, `${t}mi`, {contextPath: M});
            const profile = new ProfilePage(page, M);
            await profile.goto('identity');
            await profile.preferredPublicName('en').fill('M. Preferred');
            await profile.save();
            await snap(page, 'r01-mi-identity-saved');
            await profile.open('public');
            await profile.homepage().fill('https://k4.example.org/mike');
            await profile.save();
            await snap(page, 'r02-mi-public-saved');
            try {
                await profile.uploadImage(path.join(REPO, `apps/${app.name}/playwright/fixtures/files/profile-image-400.png`));
                R.pictureUploaded = true;
            } catch (e) { R.pictureUploaded = String(e.message).slice(0, 200); }
            await snap(page, 'r03-mi-public-picture');
            await signOut(page);
            R.m1 = await readM('r04-m-masthead-after-profile');
            log(app.name, 'masthead-after-profile', JSON.stringify(brief(R.m1)));
        });

        // ── histtext: "Editorial History" on Settings › Journal › Masthead ──
        if (on('histtext')) await step('histtext', async () => {
            await signIn(page, `${t}mgr`, {contextPath: M});
            await page.goto(app.url(`/index.php/${M}/management/settings/context`));
            await idle(page);
            await page.locator('#masthead-button').first().click().catch(() => {});
            await idle(page);
            const ta = page.locator('textarea[id^="masthead-editorialHistory-control"]').first();
            const id = await ta.getAttribute('id');
            R.histField = id;
            await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T});
            const body = page.frameLocator(`#${id}_ifr`).locator('body');
            await body.click();
            await page.keyboard.press('Control+a');
            await page.keyboard.press('Delete');
            await page.keyboard.type('Founded in 2001.');
            await sleep(300);
            const country = page.locator('#masthead-country-control');
            if (await country.count() && !(await country.inputValue())) await country.selectOption('CA');
            const w = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await page.locator('form').filter({has: ta}).first().getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            R.histSave = {status: r ? r.status() : null, saved: await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false)};
            await snap(page, 'h01-m-masthead-tab-saved');
            R.h1mgr = await readH('h02-m-history-mgr-text');
            await signOut(page);
            R.h1 = await readH('h03-m-history-anon-text');
            log(app.name, 'history-text', JSON.stringify(R.h1.paragraphs), JSON.stringify(R.h1mgr.sequence.map((s) => s.tag + ':' + s.text.slice(0, 40))));
        });

        // ── a4: disable (A4), "Remove Role" (td14), "Remove User", masthead choice, enable ──
        // Order matters: each step's page reads show which change rebuilt the cached lists.
        if (on('a4')) await step('a4', async () => {
            const A = R.a4 = {};
            const read = async (k, name) => { const m = await readM(name); A[k] = {status: m.status, list: brief(m)}; return m; };
            const readHist = async (k, name) => { const h = await readH(name); A[k] = {status: h.status, list: brief(h)}; return h; };
            const toggleUser = async (u, verb, snapName) => {
                await gotoAccess(page, app, M);
                A[`menu_${u}_${verb}`] = await openRowMenu(page, mail(u));
                await page.getByRole('menuitem', {name: new RegExp(`^${verb}`)}).click();
                const dlg = page.getByRole('dialog').last();
                await dlg.locator('textarea').first().waitFor({timeout: 15000}).catch(() => {});
                await idle(page);
                const s = await snap(page, snapName);
                A[`dialog_${u}_${verb}`] = flat(s.text.dialog, 500);
                const ta = dlg.locator('textarea').first();
                if (await ta.count()) await ta.fill(`K4: ${verb} for the A4 check`);
                await dlg.getByRole('button', {name: /^(OK|Save|Disable|Enable)/}).first().click();
                await dlg.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
                await idle(page);
                await gotoAccess(page, app, M);
                A[`row_${u}_after_${verb}`] = flat(await userRow(page, mail(u)).innerText().catch(() => ''), 300);
            };
            // 1. both lists read and cached
            await signOut(page).catch(() => {});
            await read('m1', 'a01-m-masthead-before');
            await readHist('h1', 'a02-m-history-before');
            // 2. Dora (listed) and Pia (past member) disabled
            await signIn(page, `${t}mgr`, {contextPath: M});
            await toggleUser('dis', 'Disable', 'a03-dis-disable-window');
            await toggleUser('p1', 'Disable', 'a04-p1-disable-window');
            await snap(page, 'a05-users-after-disable');
            A.mgrMasthead = (await readM('a06-m-masthead-after-disable-mgr')).status;
            await signOut(page);
            await read('m2', 'a07-m-masthead-after-disable');
            await readHist('h2', 'a08-m-history-after-disable');
            await sleep(1500);
            await read('m2b', 'a09-m-masthead-after-disable-reload');
            // 3. "Remove Role" on Rory's Section editor role (td14; a change that rebuilds)
            await signIn(page, `${t}mgr`, {contextPath: M});
            await page.goto(app.url(`/index.php/${M}/management/settings/user/${st.ids.rm}`));
            await idle(page);
            await page.getByRole('button', {name: 'Save And Continue'}).waitFor({timeout: T}).catch(() => {});
            await snap(page, 'e01-rm-edit-page');
            const rmRow = page.getByRole('row', {name: new RegExp(`^${SE} `)}).first();
            await rmRow.getByRole('button', {name: 'Remove Role'}).click();
            await idle(page);
            const s1 = await snap(page, 'e02-rm-remove-dialog');
            A.removeDialog = flat(s1.text.dialog, 600);
            const w1 = page.waitForResponse((r) => r.url().includes('/endRole/'), {timeout: T}).catch(() => null);
            await page.getByRole('dialog').getByRole('button', {name: 'Remove Role'}).click();
            const r1 = await w1;
            await idle(page); await sleep(800);
            A.removeStatus = r1 ? r1.status() : null;
            const s2 = await snap(page, 'e03-rm-after-remove');
            A.removeAfterDialog = flat(s2.text.dialog, 300);
            A.removeAfterRows = (await page.getByRole('row').allInnerTexts()).map((x) => flat(x, 200));
            await signOut(page);
            await read('m3', 'e04-m-masthead-after-remove-role');
            await readHist('h3', 'e05-m-history-after-remove-role');
            // 4. "Remove User" on Ula
            await signIn(page, `${t}mgr`, {contextPath: M});
            await gotoAccess(page, app, M);
            A.menuRu = await openRowMenu(page, mail('ru'));
            await page.getByRole('menuitem', {name: /^Remove User/}).click();
            await idle(page);
            const s3 = await snap(page, 'u01-ru-remove-user-dialog');
            A.removeUserDialog = flat(s3.text.dialog, 600);
            await page.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).click();
            await idle(page); await sleep(800);
            await snap(page, 'u02-users-after-remove-user');
            await gotoAccess(page, app, M);
            A.ruRowAfter = flat(await userRow(page, mail('ru')).innerText().catch(() => ''), 300);
            await signOut(page);
            await read('m4', 'u03-m-masthead-after-remove-user');
            await readHist('h4', 'u04-m-history-after-remove-user');
            // 5. Cato's masthead choice → "Does not appear" (bullet 3; a change that rebuilds)
            await signIn(page, `${t}mgr`, {contextPath: M});
            await page.goto(app.url(`/index.php/${M}/management/settings/user/${st.ids.chg}`));
            await idle(page);
            await page.getByRole('button', {name: 'Save And Continue'}).waitFor({timeout: T}).catch(() => {});
            await snap(page, 'c01-chg-edit-page');
            const row = page.getByRole('row', {name: new RegExp(`^${SE} `)}).first();
            const sel = row.getByRole('combobox');
            A.choiceOptions = await sel.locator('option').allInnerTexts();
            A.choiceBefore = await sel.inputValue();
            await sel.selectOption({label: 'Does not appear on the masthead'});
            await idle(page);
            const s4 = await snap(page, 'c02-chg-confirm-dialog');
            A.choiceDialog = flat(s4.text.dialog, 600);
            const w2 = page.waitForResponse((r) => r.url().includes('/masthead/'), {timeout: T}).catch(() => null);
            await page.getByRole('dialog').getByRole('button', {name: 'Confirm'}).click();
            const r2 = await w2;
            await idle(page); await sleep(1000);
            A.choiceStatus = r2 ? r2.status() : null;
            const s5 = await snap(page, 'c03-chg-after-confirm');
            A.choiceAfterDialog = flat(s5.text.dialog, 600);
            await page.reload(); await idle(page);
            await page.getByRole('button', {name: 'Save And Continue'}).waitFor({timeout: T}).catch(() => {});
            A.choiceAfterReload = await page.getByRole('row', {name: new RegExp(`^${SE} `)}).first().getByRole('combobox').inputValue().catch(() => null);
            await snap(page, 'c04-chg-edit-reloaded');
            // the ended row on Rory's page: does it still offer a masthead choice?
            await page.goto(app.url(`/index.php/${M}/management/settings/user/${st.ids.rm}`));
            await idle(page);
            await page.getByRole('button', {name: 'Save And Continue'}).waitFor({timeout: T}).catch(() => {});
            A.rmRowsLater = (await page.getByRole('row').allInnerTexts()).map((x) => flat(x, 200));
            A.rmEndedRowSelects = await page.getByRole('row', {name: new RegExp(`^${SE} `)}).first().getByRole('combobox').count();
            await snap(page, 'c05-rm-edit-page-later');
            await signOut(page);
            await read('m5', 'c06-m-masthead-after-choice');
            await readHist('h5', 'c07-m-history-after-choice');
            // 6. Dora and Pia enabled again
            await signIn(page, `${t}mgr`, {contextPath: M});
            await toggleUser('dis', 'Enable', 'n01-dis-enable-window');
            await toggleUser('p1', 'Enable', 'n02-p1-enable-window');
            await signOut(page);
            await read('m6', 'n03-m-masthead-after-enable');
            await readHist('h6', 'n04-m-history-after-enable');
            log(app.name, 'A4', JSON.stringify(A));
        });

        // ── roles: bullet 2 ─────────────────────────────────────────────────
        if (on('roles')) await step('roles', async () => {
            R.roles = {};
            await signIn(page, `${t}mgr`, {contextPath: M});
            // left unsaved: tick Author's box, close the window without OK
            {
                const form = await openRoleForm(page, app, M, 'Author');
                await form.getByRole('checkbox', {name: 'Consider role in masthead list'}).check();
                await snap(page, 'g00-author-form-unsaved');
                const dlg = page.getByRole('dialog').filter({has: page.locator('#userGroupForm')});
                const cancel = dlg.getByRole('link', {name: 'Cancel'}).or(dlg.getByRole('button', {name: 'Cancel'})).first();
                if (await cancel.count()) await cancel.click(); else await dlg.getByRole('button', {name: /Close/}).first().click();
                await idle(page); await sleep(500);
                await snap(page, 'g00b-after-cancel');
                R.roles.unsavedDialogs = dialogs.slice(-3);
                await signOut(page);
                R.roles.afterUnsaved = brief(await readM('g00c-m-masthead-after-unsaved'));
                await signIn(page, `${t}mgr`, {contextPath: M});
                const f2 = await openRoleForm(page, app, M, 'Author');
                R.roles.authorBoxAfterCancel = await f2.getByRole('checkbox', {name: 'Consider role in masthead list'}).isChecked();
            }
            R.roles.tickAuthor = await setRoleBox(page, app, M, 'Author', 'Consider role in masthead list', true, 'g01-author-tick');
            await signOut(page);
            R.roles.mAuthor = brief(await readM('g02-m-masthead-author-ticked'));
            R.roles.hAuthor = brief(await readH('g03-m-history-author-ticked'));
            await signIn(page, `${t}mgr`, {contextPath: M});
            R.roles.untickSE = await setRoleBox(page, app, M, SE, 'Consider role in masthead list', false, 'g04-se-untick');
            if (!isOps) {
                const rev = isOmp ? 'External Reviewer' : 'Reviewer';
                R.roles.untickRev = await setRoleBox(page, app, M, rev, 'Consider role in masthead list', false, 'g05-rev-untick');
            }
            await signOut(page);
            R.roles.mNoSE = brief(await readM('g06-m-masthead-se-unticked'));
            R.roles.mNoSEdata = (await readList(page));
            R.roles.hNoSE = brief(await readH('g07-m-history-se-unticked'));
            await signIn(page, `${t}mgr`, {contextPath: M});
            R.roles.retickSE = await setRoleBox(page, app, M, SE, 'Consider role in masthead list', true, 'g08-se-retick');
            if (!isOps) {
                const rev = isOmp ? 'External Reviewer' : 'Reviewer';
                R.roles.retickRev = await setRoleBox(page, app, M, rev, 'Consider role in masthead list', true, 'g09-rev-retick');
            }
            await signOut(page);
            R.roles.mBack = brief(await readM('g10-m-masthead-se-reticked'));
            log(app.name, 'roles', JSON.stringify(R.roles));
        });

        // ── reviewers: "Enable listing of reviewers on the masthead" (Rule 15; bullet 2) ──
        if (on('reviewers')) await step('reviewers', async () => {
            const V = R.rev = {};
            await signIn(page, `${t}mgr`, {contextPath: M});
            const form = await openMastheadForm(page, app, M);
            await snap(page, 'q01-appearance-masthead-default');
            V.formDefault = await readMastheadForm(form);
            await loc(page, 'Appearance › Editorial Masthead: the "Present a masthead based on user enrollments" box', form.getByRole('checkbox', {name: ENROLL, exact: true}));
            await loc(page, 'Appearance › Editorial Masthead: the "Enable listing of reviewers on the masthead" box', form.getByRole('checkbox', {name: REVBOX, exact: true}));
            V.rowsDefault = mastheadRows(app, st.cid.M);
            await signOut(page);
            const m0 = await readM('q02-m-masthead-reviewers-default');
            V.m0 = {list: brief(m0), paragraphs: (m0.paragraphs || []).map((p) => p.text), hr: m0.hr};
            if (isOps) { log(app.name, 'reviewers', JSON.stringify(V)); return; }
            await signIn(page, `${t}mgr`, {contextPath: M});
            V.tick = await setMastheadBox(page, app, M, REVBOX, true, 'q03-reviewers-tick');
            await signOut(page);
            const m1 = await readM('q04-m-masthead-reviewers-on');
            const peer = (d) => (d.sections || []).find((x) => /Peer Reviewers/.test(x.heading || ''));
            V.m1 = {list: brief(m1), paragraphs: (m1.paragraphs || []).map((p) => p.text), hr: m1.hr,
                seq: (m1.sequence || []).map((x) => `${x.tag}:${x.text.slice(0, 60)}`),
                peer: peer(m1) ? peer(m1).items.map((i) => ({name: i.name, date: i.date, affiliation: i.affiliation, orcid: i.orcid})) : null};
            // the ORCID icon of a reviewer opens a new tab
            const orc = page.locator('.page_masthead ul').last().locator('.orcid a').first();
            if (await orc.count()) {
                const popup = page.context().waitForEvent('page', {timeout: 8000}).catch(() => null);
                await orc.click().catch(() => {});
                const p2 = await popup;
                V.orcidClick = {newTab: !!p2, url: p2 ? p2.url() : page.url()};
                if (p2) await p2.close().catch(() => {});
            }
            // the Reviewer role's "Consider role in masthead list" unticked: no effect (bullet 2)
            const rev = isOmp ? 'External Reviewer' : 'Reviewer';
            await signIn(page, `${t}mgr`, {contextPath: M});
            V.roleOff = await setRoleBox(page, app, M, rev, 'Consider role in masthead list', false, 'q05-reviewer-role-untick');
            await signOut(page);
            V.m2 = brief(await readM('q06-m-masthead-reviewer-role-off'));
            await signIn(page, `${t}mgr`, {contextPath: M});
            V.roleOn = await setRoleBox(page, app, M, rev, 'Consider role in masthead list', true, 'q07-reviewer-role-tick');
            // a listed reviewer's account disabled (pkp-lib#13387 lists disabled reviewers too)
            await gotoAccess(page, app, M);
            await openRowMenu(page, mail('rvy'));
            await page.getByRole('menuitem', {name: /^Disable/}).click();
            let dlg = page.getByRole('dialog').last();
            await dlg.locator('textarea').first().waitFor({timeout: 15000}).catch(() => {});
            await dlg.locator('textarea').first().fill('K4: a listed reviewer disabled').catch(() => {});
            await dlg.getByRole('button', {name: /^OK/}).first().click();
            await dlg.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
            await idle(page);
            await signOut(page);
            const m3 = await readM('q08-m-masthead-reviewer-disabled');
            V.m3 = {status: m3.status, list: brief(m3)};
            await signIn(page, `${t}mgr`, {contextPath: M});
            await gotoAccess(page, app, M);
            await openRowMenu(page, mail('rvy'));
            await page.getByRole('menuitem', {name: /^Enable/}).click();
            dlg = page.getByRole('dialog').last();
            await dlg.locator('textarea').first().waitFor({timeout: 15000}).catch(() => {});
            await dlg.locator('textarea').first().fill('K4: enabled again').catch(() => {});
            await dlg.getByRole('button', {name: /^OK/}).first().click();
            await dlg.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
            await idle(page);
            await signOut(page);
            log(app.name, 'reviewers', JSON.stringify(V).slice(0, 3000));
        });

        // ── cancel: a completed last-year review cancelled on screen ────────
        if (on('cancel') && !isOps) await step('cancel', async () => {
            R.cancel = {};
            R.cancel.before = brief(await readM('k01-m-masthead-before-cancel'));
            await signIn(page, `${t}mgr`, {contextPath: M});
            await page.goto(app.url(`/index.php/${M}/dashboard/editorial?workflowSubmissionId=${st.subs.ext.id}`));
            await page.getByRole('heading', {name: /^Workflow:/}).first().waitFor({timeout: T});
            await idle(page);
            const table = page.getByRole('table', {name: 'Reviewers', exact: true});
            await table.waitFor({timeout: T});
            await snap(page, 'k02-workflow-reviewers');
            R.cancel.rows = (await table.getByRole('row').allInnerTexts()).map((x) => flat(x, 200));
            const row = table.getByRole('row').filter({hasText: 'Cal Cancelled'});
            await row.getByRole('button', {name: 'More Actions'}).click();
            await page.getByRole('menu').getByRole('menuitem').first().waitFor({timeout: T});
            R.cancel.menu = (await page.getByRole('menu').getByRole('menuitem').allInnerTexts()).map((x) => flat(x));
            await snap(page, 'k03-completed-row-menu');
            await page.getByRole('menu').getByRole('menuitem', {name: 'Cancel Reviewer', exact: true}).click();
            const form = page.locator('form#cancelReviewForm');
            await form.waitFor({timeout: T});
            await idle(page); await sleep(1000);
            await snap(page, 'k04-cancel-form');
            const w = page.waitForResponse((r) => /cancel-review|cancelReview|unassign/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'Cancel Reviewer', exact: true}).click();
            const r = await w;
            R.cancel.status = r ? r.status() : null;
            await form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await idle(page);
            await page.reload();
            await page.getByRole('heading', {name: /^Workflow:/}).first().waitFor({timeout: T});
            await idle(page);
            await table.waitFor({timeout: T});
            R.cancel.rowsAfter = (await table.getByRole('row').allInnerTexts()).map((x) => flat(x, 200));
            await snap(page, 'k05-workflow-after-cancel');
            await signOut(page);
            R.cancel.after = brief(await readM('k06-m-masthead-after-cancel'));
            log(app.name, 'cancel', JSON.stringify(R.cancel));
        });

        // ── invite: accepted invitations, today and later (14b, A5) ─────────
        if (on('invite')) await step('invite', async () => {
            R.inv = {};
            for (const [k, start] of [['i1', TODAY], ['i2', LATER]]) {
                const o = {start};
                await signIn(page, `${t}mgr`, {contextPath: M});
                await gotoAccess(page, app, M);
                await page.getByRole('button', {name: 'Invite to a role'}).click();
                const search = page.getByLabel(/Search for a user by email address/);
                await search.waitFor({timeout: T});
                await search.fill(mail(k));
                await page.getByRole('button', {name: 'Search User', exact: true}).click();
                await page.getByRole('heading', {name: /Enter details/}).first().waitFor({timeout: T});
                await idle(page);
                const newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).last();
                if (!(await newRow.count())) await page.getByRole('button', {name: 'Add Another Role'}).click();
                await newRow.getByRole('combobox').first().selectOption({label: SE});
                await newRow.getByRole('textbox').fill(start);
                o.mastheadOptions = await newRow.getByRole('combobox').last().locator('option').allInnerTexts();
                await newRow.getByRole('combobox').last().selectOption({label: 'Appear on the masthead'});
                await snap(page, `v01-${k}-details`);
                await page.getByRole('button', {name: 'Save And Continue'}).click();
                const subject = page.locator('input[name="subject"]');
                await subject.waitFor({timeout: T}).catch(() => {});
                await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
                await idle(page); await sleep(500);
                o.detailsErrors = await page.getByText('This field is required.').count();
                if (!(await subject.isVisible().catch(() => false))) { await snap(page, `v01b-${k}-details-refused`); R.inv[k] = o; await signOut(page); continue; }
                await subject.fill(`K4 invitation ${k} ${t}`);
                await page.getByRole('button', {name: 'Invite user to the role'}).click();
                const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
                await sent.waitFor({timeout: T});
                await sent.getByRole('button', {name: 'View All Users'}).click().catch(() => {});
                await idle(page);
                await signOut(page);
                const summary = await app.mail.find({to: mail(k), contains: `K4 invitation ${k}`});
                const full = await app.mail.fullMessage(summary.ID);
                const m = full.HTML.match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i);
                o.mailText = flat(full.Text, 1200);
                const accept = m ? m[1].replace(/&amp;/g, '&') : null;
                o.accept = !!accept;
                if (accept) {
                    const inv = await launch(app);
                    try {
                        const ip = inv.page;
                        await ip.goto(accept);
                        await idle(ip);
                        await ip.getByRole('heading', {name: /Review & create account|Review/}).first().waitFor({timeout: T}).catch(() => {});
                        const s = await snap(ip, `v02-${k}-accept-review`);
                        o.acceptText = flat(s.text.main, 2000);
                        o.acceptSelects = await ip.locator('main select').count();
                        await ip.getByRole('button', {name: /^Accept And Continue to/}).click();
                        await ip.getByRole('dialog').filter({hasText: /assigned a new role/}).waitFor({timeout: T}).catch(() => {});
                        const s2 = await snap(ip, `v03-${k}-accepted`);
                        o.acceptedDialog = flat(s2.text.dialog, 400);
                    } finally { await inv.close(); }
                }
                o.masthead = brief(await readM(`v04-m-masthead-after-${k}`));
                R.inv[k] = o;
            }
            // the manager's view of Ina's roles (start date)
            await signIn(page, `${t}mgr`, {contextPath: M});
            await page.goto(app.url(`/index.php/${M}/management/settings/user/${st.ids.i2}`));
            await idle(page);
            await page.getByRole('button', {name: 'Save And Continue'}).waitFor({timeout: T}).catch(() => {});
            await snap(page, 'v05-i2-edit-page');
            R.inv.i2rows = (await page.getByRole('row').allInnerTexts()).map((x) => flat(x, 200));
            await gotoAccess(page, app, M);
            R.inv.i2userRow = flat(await userRow(page, mail('i2')).innerText().catch(() => ''), 300);
            await signOut(page);
            log(app.name, 'invite', JSON.stringify(R.inv));
        });

        // ── later: the later start date reached (A5's open question) ────────
        // No screen moves time: the member's row start is moved to yesterday in the
        // database, as the calendar would move it, and the pages are read before and
        // after the next change that rebuilds the lists.
        if (on('later')) await step('later', async () => {
            const L = R.later = {};
            await signOut(page).catch(() => {});
            L.m0 = brief(await readM('t01-m-masthead-start-ahead'));
            L.rows0 = sql(app, `select user_group_id || ' ' || coalesce(date_start::text, 'NULL') || ' ' || coalesce(date_end::text, 'NULL') || ' ' || coalesce(masthead::text, 'NULL') from user_user_groups where user_id = ${Number(st.ids.i2)} order by 1`);
            sql(app, `update user_user_groups set date_start = date_trunc('day', now()) - interval '1 day' where user_id = ${Number(st.ids.i2)} and date_start > now()`);
            L.rows1 = sql(app, `select user_group_id || ' ' || coalesce(date_start::text, 'NULL') from user_user_groups where user_id = ${Number(st.ids.i2)} order by 1`);
            L.m1 = brief(await readM('t02-m-masthead-start-reached'));
            await sleep(1500);
            L.m1b = brief(await readM('t03-m-masthead-start-reached-reload'));
            await signIn(page, `${t}mgr`, {contextPath: M});
            L.r1 = await setRoleBox(page, app, M, 'Author', 'Consider role in masthead list', false, 't04-author-untick');
            L.r2 = await setRoleBox(page, app, M, 'Author', 'Consider role in masthead list', true, 't05-author-tick');
            await signOut(page);
            L.m2 = brief(await readM('t06-m-masthead-after-rebuild'));
            log(app.name, 'later', JSON.stringify(L));
        });

        // ── order: Appearance › Editorial Masthead ─────────────────────────
        if (on('order')) await step('order', async () => {
            await signIn(page, `${t}mgr`, {contextPath: M});
            await page.goto(app.url(`/index.php/${M}/management/settings/website`));
            await idle(page);
            await page.locator('#appearance-button').click();
            await idle(page);
            await page.getByRole('tab', {name: 'Editorial Masthead', exact: true}).filter({visible: true}).first().click();
            await idle(page); await sleep(500);
            const form = page.locator('#appearance [role="tabpanel"]:visible form').first();
            await snap(page, 'o01-appearance-masthead');
            R.orderBefore = flat(await form.innerText(), 800);
            const target = isOps ? 'Editorial Board Member' : SE;
            await form.locator('button').filter({hasText: `Increase position of ${target}`}).first().click();
            const w = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            R.orderSave = r ? r.status() : null;
            await idle(page);
            await snap(page, 'o02-appearance-masthead-saved');
            await signOut(page);
            R.orderM = brief(await readM('o03-m-masthead-reordered'));
            R.orderH = brief(await readH('o04-m-history-reordered'));
            log(app.name, 'order', JSON.stringify(R.orderM), JSON.stringify(R.orderH));
        });

        // ── order2: the saved order on "Editorial History" with two ended roles (bullet 4) ──
        if (on('order2')) await step('order2', async () => {
            const O = R.order2 = {};
            const second = isOps ? 'Editorial Board Member' : ED;
            // end Tia's second listed role with "Remove Role", so History holds two roles
            await signIn(page, `${t}mgr`, {contextPath: M});
            await page.goto(app.url(`/index.php/${M}/management/settings/user/${st.ids.two}`));
            await idle(page);
            await page.getByRole('button', {name: 'Save And Continue'}).waitFor({timeout: T}).catch(() => {});
            const row = page.getByRole('row', {name: new RegExp(`^${second} `)}).first();
            await row.getByRole('button', {name: 'Remove Role'}).click();
            await idle(page);
            await page.getByRole('dialog').getByRole('button', {name: 'Remove Role'}).click();
            await idle(page); await sleep(800);
            await snap(page, 'o05-two-remove-role');
            let form = await openMastheadForm(page, app, M);
            O.orderNow = flat(await form.innerText(), 700);
            await signOut(page);
            O.h1 = brief(await readH('o06-m-history-two-roles'));
            O.m1 = brief(await readM('o07-m-masthead-two-roles'));
            // move the second role back up and save; read both pages again
            await signIn(page, `${t}mgr`, {contextPath: M});
            form = await openMastheadForm(page, app, M);
            await form.locator('button').filter({hasText: `Increase position of ${second}`}).first().click();
            const w = page.waitForResponse((r) => /\/api\/v1\/contexts/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            O.save = r ? r.status() : null;
            await idle(page);
            await snap(page, 'o08-order-moved-back');
            form = await openMastheadForm(page, app, M);
            O.orderAfter = flat(await form.innerText(), 700);
            await signOut(page);
            O.h2 = brief(await readH('o09-m-history-order-back'));
            O.m2 = brief(await readM('o10-m-masthead-order-back'));
            log(app.name, 'order2', JSON.stringify(O));
        });

        // ── french: the seeded context in French (OPS4; OJS and OMP the control) ──
        if (on('french')) await step('french', async () => {
            const Fr = R.french = {};
            await signOut(page).catch(() => {});
            const m = await openPage(page, app, `${PK}/fr_CA`, 'masthead', 'f01-pk-masthead-fr');
            Fr.masthead = {status: m.status, h1: m.h1, headings: (m.sections || []).map((x) => x.heading), paragraphs: (m.paragraphs || []).map((p) => p.text)};
            const h = await openPage(page, app, `${PK}/fr_CA`, 'history', 'f02-pk-history-fr');
            Fr.history = {status: h.status, h1: h.h1, paragraphs: (h.paragraphs || []).map((p) => p.text)};
            await signIn(page, 'manager.maya');
            await page.goto(app.url(`/index.php/${PK}/fr_CA/management/settings/website`));
            await idle(page);
            await page.locator('#appearance-button').click();
            await idle(page);
            Fr.appearanceTabs = (await page.locator('#appearance [role="tab"]').allInnerTexts().catch(() => [])).map((x) => flat(x));
            const tab = page.locator('#appearance [role="tab"]').filter({hasText: /Entête|Editorial Masthead|Bloc/}).first();
            if (await tab.count()) { await tab.click(); await idle(page); await sleep(500); }
            const form = page.locator('#appearance [role="tabpanel"]:visible form').first();
            Fr.form = flat(await form.innerText().catch(() => ''), 1500);
            await snap(page, 'f03-pk-appearance-masthead-fr');
            await signOut(page);
            log(app.name, 'french', JSON.stringify(Fr));
        });

        // ── enroll: both boxes at both ends; the form left unsaved; the history address ──
        if (on('enroll')) await step('enroll', async () => {
            const E = R.enroll = {};
            const readBoth = async (k, prefix, who) => {
                const m = await readM(`${prefix}-masthead-${who}`);
                E[`${k}m`] = {status: m.status, h1: m.h1, crumbs: m.crumbs, title: m.title, list: brief(m), paragraphs: (m.paragraphs || []).map((p) => p.text),
                    hr: m.hr, editLinks: m.editLinks, nav: m.nav, text: flat(m.pageText, 600)};
                const h = await gotoChain(page, app.url(`/index.php/${M}/about/editorialHistory`));
                await snap(page, `${prefix}-history-${who}`);
                const hd = await readList(page);
                E[`${k}h`] = {...h, h1: hd.h1, list: brief(hd), paragraphs: (hd.paragraphs || []).map((p) => p.text), editLinks: hd.editLinks};
            };
            await signOut(page).catch(() => {});
            await readBoth('0', 'y01', 'anon');
            E.rows0 = mastheadRows(app, st.cid.M);
            await signIn(page, `${t}mgr`, {contextPath: M});
            // the reviewers box unticked (OJS, OMP)
            if (!isOps) {
                E.revOff = await setMastheadBox(page, app, M, REVBOX, false, 'y02-reviewers-untick');
                await signOut(page);
                const m = await readM('y03-m-masthead-reviewers-off');
                E.revOffM = {list: brief(m), paragraphs: (m.paragraphs || []).map((p) => p.text), hr: m.hr};
                await signIn(page, `${t}mgr`, {contextPath: M});
            }
            // left unsaved: the enrollment box unticked, then another Appearance tab, back, then away
            {
                const U = E.unsaved = {};
                let form = await openMastheadForm(page, app, M);
                await form.getByRole('checkbox', {name: ENROLL, exact: true}).uncheck();
                await sleep(300);
                U.afterUntick = await readMastheadForm(form);
                await snap(page, 'y04-form-unticked-unsaved');
                await page.getByRole('tab', {name: 'Theme', exact: true}).filter({visible: true}).first().click().catch((e) => { U.themeErr = String(e.message).slice(0, 200); });
                await idle(page); await sleep(500);
                await snap(page, 'y05-theme-tab');
                await page.getByRole('tab', {name: 'Editorial Masthead', exact: true}).filter({visible: true}).first().click();
                await idle(page); await sleep(500);
                form = page.locator('#appearance [role="tabpanel"]:visible form').first();
                U.backOnTab = await readMastheadForm(form);
                await snap(page, 'y06-form-back-on-tab');
                const before = dialogs.length;
                await page.goto(app.url(`/index.php/${M}/management/settings/context`)).catch((e) => { U.leaveErr = String(e.message).slice(0, 200); });
                await idle(page); await sleep(800);
                U.leaveDialogs = dialogs.slice(before);
                U.leftTo = page.url();
                await snap(page, 'y07-left-to-journal-settings');
                form = await openMastheadForm(page, app, M);
                U.reopened = await readMastheadForm(form);
                await snap(page, 'y08-form-reopened');
            }
            // the enrollment box unticked and saved
            E.enrollOff = await setMastheadBox(page, app, M, ENROLL, false, 'y09-enroll-untick');
            E.rows1 = mastheadRows(app, st.cid.M);
            await loc(page, 'Editorial Masthead page (enrollment off): the heading', page.locator('h1'));
            await readBoth('1mgr', 'y10', 'off-mgr');
            await signIn(page, `${t}zu`, {contextPath: M});
            await readBoth('1se', 'y11', 'off-member');
            await signOut(page);
            await readBoth('1', 'y12', 'off-anon');
            // the History link a visitor still has: the About menu
            await page.goto(app.url(`/index.php/${M}`)); await idle(page);
            E.homeNav = await page.locator('#navigationPrimary a').evaluateAll((as) => as.map((a) => [a.innerText.replace(/\s+/g, ' ').trim(), a.getAttribute('href')]));
            await snap(page, 'y13-home-off');
            // D: the enrollment box off with an empty "Editorial History" text
            await signIn(page, `${D}mgr`, {contextPath: D});
            E.dOff = await setMastheadBox(page, app, D, ENROLL, false, 'y14-d-enroll-untick');
            const dm = await openPage(page, app, D, 'masthead', 'y15-d-masthead-off-mgr');
            E.dOffMgr = {h1: dm.h1, paragraphs: (dm.paragraphs || []).map((p) => p.text), editLinks: dm.editLinks, text: flat(dm.pageText, 400), seq: (dm.sequence || []).map((x) => `${x.tag}:${x.text.slice(0, 60)}`)};
            await signOut(page);
            const da = await openPage(page, app, D, 'masthead', 'y16-d-masthead-off-anon');
            E.dOffAnon = {status: da.status, h1: da.h1, paragraphs: (da.paragraphs || []).map((p) => p.text), text: flat(da.pageText, 400), seq: (da.sequence || []).map((x) => `${x.tag}:${x.text.slice(0, 60)}`)};
            await signIn(page, `${D}mgr`, {contextPath: D});
            E.dOn = await setMastheadBox(page, app, D, ENROLL, true, 'y17-d-enroll-tick');
            await signOut(page);
            E.dOnAnon = brief(await openPage(page, app, D, 'masthead', 'y18-d-masthead-on-anon'));
            // M: ticked again
            await signIn(page, `${t}mgr`, {contextPath: M});
            E.enrollOn = await setMastheadBox(page, app, M, ENROLL, true, 'y19-enroll-tick');
            E.rows2 = mastheadRows(app, st.cid.M);
            await signOut(page);
            await readBoth('2', 'y20', 'on-anon');
            log(app.name, 'enroll', JSON.stringify(E).slice(0, 4000));
        });

        // ── leave: the Edit page left with a new role row unsaved ───────────
        if (on('leave')) await step('leave', async () => {
            await signIn(page, `${t}mgr`, {contextPath: M});
            await page.goto(app.url(`/index.php/${M}/management/settings/user/${st.ids.zu}`));
            await idle(page);
            await page.getByRole('button', {name: 'Save And Continue'}).waitFor({timeout: T}).catch(() => {});
            await page.getByRole('button', {name: 'Add Another Role'}).click().catch(() => {});
            const newRow = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
            await newRow.getByLabel(/^Select a new role/).selectOption({index: 1}).catch(() => {});
            await snap(page, 'l01-zu-edit-new-row');
            const before = dialogs.length;
            await page.locator('main').getByRole('link', {name: 'Users & Roles'}).first().click().catch((e) => { R.leaveClickError = String(e.message).slice(0, 200); });
            await page.waitForLoadState('load').catch(() => {});
            await idle(page); await sleep(800);
            const s = await snap(page, 'l02-after-leave');
            R.leave = {url: page.url(), browserDialogs: dialogs.slice(before), inPageDialog: flat(s.text.dialog, 300)};
            await signOut(page);
        });

        // ── again: a second drive of the cache findings (history 500, enable, Remove User) ──
        if (on('again')) await step('again', async () => {
            const G = R.again = {};
            const rd = async (k, which, name) => { const d = which === 'h' ? await readH(name) : await readM(name); G[k] = {status: d.status, list: brief(d)}; };
            const toggle = async (u, verb) => {
                await gotoAccess(page, app, M);
                await openRowMenu(page, mail(u));
                await page.getByRole('menuitem', {name: new RegExp(`^${verb}`)}).click();
                const dlg = page.getByRole('dialog').last();
                await dlg.locator('textarea').first().waitFor({timeout: 15000}).catch(() => {});
                const ta = dlg.locator('textarea').first();
                if (await ta.count()) await ta.fill(`K4 again: ${verb}`);
                await dlg.getByRole('button', {name: /^(OK|Save|Disable|Enable)/}).first().click();
                await dlg.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
                await idle(page);
            };
            const rebuild = async (tag2) => {   // a change that rebuilds: the Author box unticked and ticked again
                G[`rebuild_${tag2}_1`] = await setRoleBox(page, app, M, 'Author', 'Consider role in masthead list', false, `w-${tag2}-author-untick`);
                G[`rebuild_${tag2}_2`] = await setRoleBox(page, app, M, 'Author', 'Consider role in masthead list', true, `w-${tag2}-author-tick`);
            };
            await signOut(page).catch(() => {});
            await rd('h1', 'h', 'w01-history-built');
            await rd('m1', 'm', 'w02-masthead-built');
            await signIn(page, `${t}mgr`, {contextPath: M});
            await toggle('p2', 'Disable');          // a past member
            await toggle('zu', 'Disable');          // a listed member
            await signOut(page);
            await rd('h2', 'h', 'w03-history-after-disable');
            await rd('m2', 'm', 'w04-masthead-after-disable');
            await signIn(page, `${t}mgr`, {contextPath: M});
            await rebuild('a');
            await signOut(page);
            await rd('h3', 'h', 'w05-history-after-rebuild');
            await rd('m3', 'm', 'w06-masthead-after-rebuild');
            await signIn(page, `${t}mgr`, {contextPath: M});
            await toggle('p2', 'Enable');
            await toggle('zu', 'Enable');
            await gotoAccess(page, app, M);
            await openRowMenu(page, mail('un'));
            await page.getByRole('menuitem', {name: /^Remove User/}).click();
            await page.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).click();
            await idle(page); await sleep(800);
            await signOut(page);
            await rd('h4', 'h', 'w07-history-after-enable-and-remove-user');
            await rd('m4', 'm', 'w08-masthead-after-enable-and-remove-user');
            await signIn(page, `${t}mgr`, {contextPath: M});
            await rebuild('b');
            await signOut(page);
            await rd('h5', 'h', 'w09-history-after-rebuild2');
            await rd('m5', 'm', 'w10-masthead-after-rebuild2');
            log(app.name, 'again', JSON.stringify(G));
        });

        // ── horcid: a member with a verified ORCID ended ("Remove User"), then a rebuild: the History entry ──
        if (on('horcid')) await step('horcid', async () => {
            const H = R.horcid = {};
            await signIn(page, `${t}mgr`, {contextPath: M});
            await gotoAccess(page, app, M);
            await openRowMenu(page, mail('al'));
            await page.getByRole('menuitem', {name: /^Remove User/}).click();
            await page.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).click();
            await idle(page); await sleep(800);
            H.t1 = await setRoleBox(page, app, M, 'Author', 'Consider role in masthead list', false, 'x-author-untick');
            H.t2 = await setRoleBox(page, app, M, 'Author', 'Consider role in masthead list', true, 'x-author-tick');
            await signOut(page);
            const h = await readH('x01-m-history-orcid');
            H.items = (h.sections || []).flatMap((s) => s.items.map((i) => ({role: s.heading, date: i.date, name: i.name, affiliation: i.affiliation, orcid: i.orcid})));
            log(app.name, 'horcid', JSON.stringify(H.items.filter((i) => /Alpha/.test(i.name))));
        });

        // ── merge: "Merge user" of a listed member into the Author (pkp-lib#13387) ──
        if (on('merge')) await step('merge', async () => {
            const G = R.merge = {};
            await signOut(page).catch(() => {});
            G.m0 = brief(await readM('m01-m-masthead-before-merge'));
            await signIn(page, `${t}mgr`, {contextPath: M});
            await gotoAccess(page, app, M);
            await openRowMenu(page, mail('mg'));
            await page.getByRole('menuitem', {name: 'Merge user', exact: true}).click();
            const dlg = page.getByRole('dialog').last();
            await dlg.locator('tr.gridRow').first().waitFor({timeout: T});
            await idle(page);
            await snap(page, 'm02-merge-window');
            let row = dlg.locator('tr.gridRow').filter({hasText: mail('au')}).first();
            if (!(await row.count())) {
                // the window's own search
                const s = dlg.locator('a.pkp_linkaction_search');
                if (await s.count()) await s.first().click();
                const box = dlg.locator('input[name="search"]').first();
                await box.fill(mail('au')).catch(() => {});
                await box.press('Enter').catch(() => {});
                await idle(page); await sleep(800);
                row = dlg.locator('tr.gridRow').filter({hasText: mail('au')}).first();
            }
            G.targetFound = await row.count();
            if (!G.targetFound) { await snap(page, 'm03-merge-no-target'); await signOut(page); return; }
            await row.locator('a.show_extras').click();
            await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Merge into this User'}).click();
            const conf = page.locator('[data-cy="dialog"], .ui-dialog, [role="dialog"]').filter({hasText: 'will not exist afterwards'}).last();
            await conf.waitFor({timeout: T});
            G.confirm = flat(await conf.innerText(), 400);
            const w = page.waitForResponse((r) => r.url().includes('merge-users') && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await conf.getByRole('button', {name: 'OK', exact: true}).click();
            const resp = await w;
            G.status = resp ? resp.status() : null;
            await sleep(1500); await idle(page);
            await snap(page, 'm04-after-merge');
            await signOut(page);
            G.m1 = brief(await readM('m05-m-masthead-after-merge'));
            G.h1 = brief(await readH('m06-m-history-after-merge'));
            log(app.name, 'merge', JSON.stringify(G));
        });

        // ── upgraded: a context with no masthead settings rows ─────────────
        if (on('upgraded')) await step('upgraded', async () => {
            const U = R.upg = {};
            const u = tag('u07s29k4u');
            const sec = isOjs ? {sections: ['ART']} : isOps ? {sections: ['PRE']} : {};
            const users = [
                {username: `${u}mgr`, roles: ['manager'], givenName: 'Uma', familyName: 'Manager'},
                {username: `${u}se`, roles: ['sectionEditor'], givenName: 'Ugo', familyName: 'Upgraded', affiliation: 'K4 Upgrade University', ...sec},
                {username: `${u}p1`, roles: ['reader'], givenName: 'Ulf', familyName: 'Pastupgrade', pastRoles: [{role: 'sectionEditor', dateStart: '2019-03-01', dateEnd: '2024-06-30'}]},
            ];
            if (!isOps) {
                users.push({username: `${u}au`, roles: ['author'], givenName: 'Ula', familyName: 'Author'});
                users.push({username: `${u}rv`, roles: ['externalReviewer'], givenName: 'Uri', familyName: 'Reviewedlastyear'});
            }
            const C = await app.api.createContext({tag: u, context: {acronym: 'K4U', name: `K4 Upgraded ${u}`}, users});
            if (!isOps) {
                await app.api.createSubmission({tag: `${u}x`, context: u, submitter: `${u}au`, title: `K4 upgraded ${u}`,
                    decisions: ['sendExternalReview'],
                    reviewRounds: [{reviewers: [{username: `${u}rv`, status: 'completed', dateCompleted: `${LAST}-06-15`}]}]});
            }
            U.ctx = {path: u, id: C.contextId};
            U.rowsNew = mastheadRows(app, C.contextId);
            const [tbl, col] = SETTINGS[app.name];
            sql(app, `delete from ${tbl} where ${col} = ${Number(C.contextId)} and setting_name in ('enableEnrollmentMasthead', 'enableEnrollmentMastheadReviewers')`);
            U.rowsDeleted = mastheadRows(app, C.contextId);
            const rd = async (k, which, name) => {
                if (which === 'h') {
                    const h = await gotoChain(page, app.url(`/index.php/${u}/about/editorialHistory`));
                    await snap(page, name);
                    const d = await readList(page);
                    U[k] = {...h, h1: d.h1, list: brief(d), paragraphs: (d.paragraphs || []).map((p) => p.text), editLinks: d.editLinks};
                } else {
                    const d = await openPage(page, app, u, 'masthead', name);
                    U[k] = {status: d.status, h1: d.h1, list: brief(d), paragraphs: (d.paragraphs || []).map((p) => p.text), hr: d.hr, editLinks: d.editLinks, text: flat(d.pageText, 500)};
                }
            };
            await signOut(page).catch(() => {});
            await rd('m0', 'm', 'u01-u-masthead-norows-anon');
            await rd('h0', 'h', 'u02-u-history-norows-anon');
            await signIn(page, `${u}mgr`, {contextPath: u});
            await rd('m0mgr', 'm', 'u03-u-masthead-norows-mgr');
            const form = await openMastheadForm(page, app, u);
            await snap(page, 'u04-u-form-norows');
            U.form0 = await readMastheadForm(form);
            U.tick = await setMastheadBox(page, app, u, ENROLL, true, 'u05-u-enroll-tick');
            U.rowsAfterTick = mastheadRows(app, C.contextId);
            await signOut(page);
            await rd('m1', 'm', 'u06-u-masthead-ticked-anon');
            await rd('h1', 'h', 'u07-u-history-ticked-anon');
            log(app.name, 'upgraded', JSON.stringify(U).slice(0, 4000));
        });

        // ── ops12: scenario 12 on the seeded preprint server (read only) ────
        if (on('ops12') && isOps) await step('ops12', async () => {
            const O = R.ops12 = {};
            await signIn(page, 'manager.maya');
            await page.goto(app.url(`/index.php/${PK}/management/settings/website`));
            await idle(page);
            await page.locator('#setup-button').first().click();
            await idle(page); await sleep(500);
            await snap(page, 's01-pk-website-setup');
            O.setupSideTabs = (await page.locator('#setup [role="tab"]').allInnerTexts().catch(() => [])).map((x) => flat(x));
            const priv = page.locator('#setup').getByRole('tab', {name: 'Privacy Statement', exact: true});
            if (await priv.count()) {
                await priv.first().click(); await idle(page); await sleep(500);
                O.privacyBox = await page.locator('[id^="privacy-privacyStatement-control"]').count();
                O.privacyForm = flat(await page.locator('#privacy form, [id="privacy"] form').first().innerText().catch(() => ''), 400);
                await snap(page, 's02-pk-privacy-tab');
            }
            await page.locator('#appearance-button').click(); await idle(page);
            await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).click(); await idle(page); await sleep(500);
            O.sidebar = await page.locator('input[name="sidebar"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || e.parentElement).innerText.trim()})));
            await snap(page, 's03-pk-appearance-setup');
            await signOut(page);
            O.info = {};
            for (const w of ['readers', 'authors', 'librarians']) {
                const r = await page.goto(app.url(`/index.php/${PK}/information/${w}`));
                await idle(page).catch(() => {});
                const s = await snap(page, `s04-pk-information-${w}`);
                O.info[w] = {status: r ? r.status() : null, h1: await page.locator('h1').allInnerTexts().catch(() => []), text: flat(s.text.main || s.text.body || '', 200)};
            }
            const m = await openPage(page, app, PK, 'masthead', 's05-pk-masthead');
            O.masthead = {list: brief(m), seq: (m.sequence || []).map((x) => `${x.tag}:${x.text.slice(0, 60)}`), hr: m.hr};
            await page.goto(app.url(`/index.php/${PK}`)); await idle(page);
            O.nav = await page.locator('#navigationPrimary a').evaluateAll((as) => as.map((a) => [a.innerText.replace(/\s+/g, ' ').trim(), a.getAttribute('href')]));
            const contact = O.nav.find((x) => x[0] === 'Contact');
            if (contact) {
                const r = await page.goto(contact[1]);
                await idle(page);
                await snap(page, 's06-pk-contact');
                O.contact = {status: r ? r.status() : null, url: page.url(), h1: await page.locator('h1').allInnerTexts()};
            }
            log(app.name, 'ops12', JSON.stringify(O).slice(0, 3000));
        });

        // ── final: both pages as they stand, signed out and as the manager ──
        if (on('final')) await step('final', async () => {
            await signOut(page).catch(() => {});
            R.mFinal = await readM('z01-m-masthead-final');
            R.hFinal = await readH('z02-m-history-final');
        });
    } finally {
        R.browserDialogs = dialogs;
        record(process.env.PHASES ? `k4-${PHASES.join('_')}` : 'k4', R);
        await close();
    }
});
