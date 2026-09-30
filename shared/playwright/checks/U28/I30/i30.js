// U28 claim check I30 (housekeeping 2026-09-30, incidentals row R2): what an
// account holding a created "Reviewer"-level role meets on a preprint server
// (spec Purpose "OPS does not install…", scenario 17 "A home-made reviewer
// role", register OPS1, footnotes p and f-ops1), with the same shape of
// account on a journal and a press as read-only controls.
//
// Per app, a scratch context of this run's own (tag u28i30) with:
//   cr  only the created Reviewer-level role "I30 Referee" (seeded through
//       customRoles[]; OJS/OMP: its review box(es) ticked, OPS: none, the level
//       has none there)
//   ca  an installed Author plus "I30 Referee"
//   au  an installed Author (submitter of one submission, the wizard address)
//   m   the manager
//   OPS: mod (Moderator), eb (Editorial Board Member), rd (Reader): one account
//        per installed level for the typed addresses; iv, an Author the manager
//        invites on screen to a second Reviewer-level role "I30 Made" that the
//        manager creates on screen (Roles › "Create New Role"), accepted from
//        the email signed out.
//   OJS/OMP: xr, an installed External Reviewer (positive control).
// Phases (PHASES=ui,created,installed; default all):
//   ui         OPS: the manager's "Create New Role" with "Reviewer" chosen, read
//              settled; saved; the invitation to it sent and accepted.
//   created    cr, ca (and OPS iv): sign-in landing (context login and site
//              login), dashboard, dashboard/reviewAssignments (settled and 8 s
//              later), dashboard/editorial, dashboard/mySubmissions,
//              submissions, the wizard address; the sweep on the list page:
//              the "Error" window's "OK", "Filters" › "Apply Filters", the
//              search box, the sidebar group headers, a reload.
//   installed  every other account: landing, the list address, the wizard
//              address, dashboard/editorial (the manager's control).
//
//   RUN=r1 PROBE_FEATURE=U28 PROBE_AGENT=ccI30u28 node bin/probe.js ops shared/playwright/checks/U28/I30/i30.js
//   RUN=r2 …   a second run seeds afresh and writes its facts under its own name.
//   One app per process (OPS about 5 minutes); facts in facts-<RUN>-<app>.json.
// No assertions: every screen is recorded with screen()/shot(); the facts file
// carries what the report cites.
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ONLYP = process.env.PHASES ? process.env.PHASES.split(',') : null;
const phase = (n) => !ONLYP || ONLYP.includes(n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

function today() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const isOPS = app.name === 'ops';
    const isOMP = app.name === 'omp';
    const ACR = {ojs: 'OJS', omp: 'OMP', ops: 'OPS'}[app.name];
    const facts = {app: app.name, run: RUN, errors: {}};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
        record(`facts-${RUN}`, facts);
    };
    const step = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            facts.errors[key] = String(e.stack || e).slice(0, 1200);
            console.error(`[${app.name}] ${key} FAILED: ${e.message}`);
            record(`facts-${RUN}`, facts);
        }
    };

    // ---- seed ---------------------------------------------------------------
    const t = tag('u28i30');
    const stages = isOPS ? undefined : (isOMP ? ['internalReview', 'review'] : ['review']);
    const customRoles = [{key: 'crev', level: 'reviewer', name: 'I30 Referee', abbrev: 'I30R', ...(stages ? {stages} : {})}];
    const U = (k, roles, g) => ({username: `${t}${k}`, roles, givenName: g, familyName: 'Ithirty'});
    const users = [U('cr', ['crev'], 'Cree'), U('ca', ['author', 'crev'], 'Cara'), U('au', ['author'], 'Auda'), U('m', ['manager'], 'Mana')];
    if (isOPS) users.push(U('mod', ['sectionEditor'], 'Modi'), U('eb', ['editorialBoardMember'], 'Ebba'), U('rd', ['reader'], 'Rida'), U('iv', ['author'], 'Ivo'));
    else users.push(U('xr', ['externalReviewer'], 'Xera'));
    const res = await app.api.createContext({tag: t, context: {name: `U28 I30 ${t}`, contactName: 'I30 Contact', contactEmail: `${t}contact@mail.test`}, customRoles, users});
    const sub = await app.api.createSubmission({tag: `${t}s1`, context: t, submitter: `${t}au`, submitted: true, title: `U28 I30 ${t}`});
    fact('seed', {ctx: t, customRoles: res.customRoles, users: users.map((u) => `${u.username}:${u.roles}`), submissionId: sub.submissionId});
    const base = `/index.php/${t}`;
    const short = (u) => rel(u).replace(base, '~');

    const {page, close} = await launch(app);
    let cur = null;
    page.on('response', (r) => {
        if (!cur) return;
        const u = r.url();
        if (/\/api\/v1\//.test(u) || r.status() >= 400) cur.api.push(`${r.request().method()} ${r.status()} ${short(u)}`);
    });
    page.on('console', (m) => {
        if (cur && (m.type() === 'error' || m.type() === 'warning')) cur.console.push(`${m.type()}: ${flat(m.text(), 200)}`);
    });
    page.on('pageerror', (e) => {
        if (cur) cur.pageerror.push(flat(e.message, 200));
    });
    page.on('dialog', async (d) => {
        if (cur) cur.dialogs.push(`${d.type()}: ${flat(d.message(), 120)}`);
        if (d.type() === 'beforeunload') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    const begin = () => (cur = {api: [], console: [], pageerror: [], dialogs: []});
    const end = () => {
        const c = cur;
        cur = null;
        return c;
    };

    async function sideNav() {
        return page.evaluate(() => {
            const nav = document.querySelector('nav') || document.body;
            const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
            return [...nav.querySelectorAll('a, button')].map((a) => `${vis(a) ? '' : '(hidden) '}${(a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ')}${a.getAttribute('href') ? ` -> ${a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')}` : ''}`)
                .filter((x) => x.replace('(hidden) ', '').length);
        }).catch(() => null);
    }
    async function listState() {
        return page.evaluate(() => {
            const m = document.querySelector('main');
            if (!m) return null;
            const h = m.querySelector('h1');
            const th = [...m.querySelectorAll('table thead th')].map((e) => e.innerText.trim().replace(/\s+/g, ' '));
            const rows = [...m.querySelectorAll('table tbody tr')].map((e) => e.innerText.trim().replace(/\s+/g, ' ').slice(0, 120));
            const showing = (m.innerText.match(/Showing[^\n]*/) || [null])[0];
            const buttons = [...m.querySelectorAll('button, a, input, select')].filter((e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length))
                .map((e) => `${e.tagName.toLowerCase()}${e.type ? `[${e.type}]` : ''}: ${(e.innerText || e.value || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 60)}`);
            return {h1: h ? h.innerText.trim() : null, th, rows, showing, controls: buttons};
        }).catch(() => null);
    }
    async function snap(name) {
        await idle(page).catch(() => {});
        await sleep(400);
        const s = await screen(page);
        record(`${RUN}-${name}`, s);
        await shot(page, `${RUN}-${name}`).catch(() => {});
        return s;
    }
    async function read(name, extra = {}) {
        const s = await snap(name);
        return {snap: `${RUN}-${name}-${app.name}`, final: short(page.url()), title: await page.title().catch(() => null),
            dialog: flat(s.text && s.text.dialog, 300), main: flat(s.text && s.text.main, 500), list: await listState(), ...extra};
    }
    async function visit(name, p) {
        begin();
        let status = null;
        try {
            const r = await page.goto(app.url(`${base}/${p}`));
            status = r ? r.status() : null;
        } catch (e) {
            status = `ERR ${flat(e.message, 100)}`;
        }
        const out = await read(name, {typed: p, status});
        out.nav = await sideNav();
        return Object.assign(out, end());
    }
    const errWin = () => page.getByRole('dialog').filter({hasText: 'The current role does not have access'});

    // ---- phase ui (OPS): the manager creates a Reviewer-level role and invites iv to it
    if (isOPS && phase('ui') && phase('created')) {
        await step('ui', async () => {
            const out = {};
            await signIn(page, `${t}m`, {contextPath: t});
            await page.goto(app.url(`${base}/management/settings/access`));
            await idle(page);
            await page.getByRole('tab', {name: 'Roles', exact: true}).click();
            await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: 20000});
            begin();
            const btn = page.locator('#roleGridContainer').getByRole('link', {name: 'Create New Role', exact: true})
                .or(page.locator('#roleGridContainer').getByRole('button', {name: 'Create New Role', exact: true}));
            await loc(page, 'Roles grid: "Create New Role"', btn.first());
            await btn.first().click();
            const form = page.locator('#userGroupForm');
            await form.waitFor({timeout: 15000});
            await idle(page);
            out.levels = await form.locator('#roleId option').allInnerTexts();
            const stageState = async () => form.evaluate((f) => {
                const c = f.querySelector('#userGroupStageContainer');
                const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
                return {containerShown: vis(c), containerText: c ? c.innerText.trim().replace(/\s+/g, ' ') : null,
                    boxes: [...f.querySelectorAll('#userGroupStageContainer input[type=checkbox]')].map((i) => ({label: (i.closest('label') || i.parentElement).innerText.trim(), disabled: i.disabled, checked: i.checked, shown: vis(i)}))};
            });
            out.stagesBefore = await stageState();
            await form.locator('#roleId').selectOption({label: 'Reviewer'});
            await sleep(1500); // read settled, past the 600 ms hide animation (seed-facts, U54)
            out.stagesAfterReviewer = await stageState();
            await form.locator('input[name="name[en]"]').first().fill('I30 Made');
            await form.locator('input[name="abbrev[en]"]').first().fill('I30M');
            out.dialogFilled = await read('ui-create-role-reviewer');
            await form.getByRole('button', {name: 'OK', exact: true}).click();
            out.saved = await page.locator('#roleGridContainer tr.gridRow').filter({hasText: 'I30 Made'}).first().waitFor({timeout: 20000}).then(() => true).catch(() => false);
            await idle(page);
            out.gridAfter = await read('ui-roles-after-save');
            out.gridRow = flat(await page.locator('#roleGridContainer tr.gridRow').filter({hasText: 'I30 Made'}).first().innerText().catch(() => null), 200);
            Object.assign(out, {traffic: end()});
            fact('ui create role', out);

            // The invitation, Users & Roles › "Invite to a role" (U06 I28's walk).
            const inv = {};
            begin();
            await page.goto(app.url(`${base}/management/settings/access`));
            await idle(page);
            await page.getByRole('button', {name: 'Invite to a role'}).click();
            await expect(page.getByRole('heading', {name: /Search User/})).toBeVisible({timeout: 30000});
            await page.getByLabel(/Search for a user by email address/).fill(`${t}iv@mail.test`);
            await page.getByRole('button', {name: 'Search User', exact: true}).click();
            await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30000});
            await idle(page);
            const row = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
            inv.offered = await row.getByLabel(/^Select a new role/).locator('option').allInnerTexts();
            await row.getByLabel(/^Select a new role/).selectOption({label: 'I30 Made'});
            await row.getByRole('textbox').fill(today());
            inv.details = await read('ui-invite-details');
            await page.getByRole('button', {name: 'Save And Continue'}).click();
            const subject = page.getByLabel(/^Subject/);
            await expect(subject).not.toHaveValue('', {timeout: 30000});
            await expect(page.frameLocator('iframe').locator('body')).not.toHaveText('', {timeout: 30000});
            await idle(page);
            await subject.fill(`Invitation${t}iv`);
            await page.getByRole('button', {name: 'Invite user to the role'}).click();
            const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
            inv.sentShown = await sent.waitFor({timeout: 30000}).then(() => true).catch(() => false);
            inv.sent = await read('ui-invite-sent');
            await sent.getByRole('button', {name: 'View All Users'}).click().catch(() => {});
            inv.traffic = end();
            await signOut(page).catch(() => {});

            // Accept from the email, signed out.
            const summary = await app.mail.find({to: `${t}iv@mail.test`, contains: `Invitation${t}iv`, timeoutMs: 30000});
            const full = await app.mail.fullMessage(summary.ID);
            const m = (full.HTML || '').match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i);
            inv.mailSubject = full.Subject;
            inv.acceptLink = !!m;
            if (m) {
                begin();
                await page.goto(m[1].replace(/&amp;/g, '&'));
                const accept = page.getByRole('button', {name: new RegExp(`^Accept And Continue to ${ACR}`)});
                await accept.waitFor({timeout: 30000});
                await idle(page);
                inv.acceptPage = await read('ui-accept-page');
                await sleep(1500);
                await accept.click();
                inv.acceptDialog = await page.getByRole('dialog').first().waitFor({timeout: 30000}).then(() => true).catch(() => false);
                inv.accepted = await read('ui-accept-after');
                inv.acceptTraffic = end();
            }
            fact('ui invite', inv);
            await signOut(page).catch(() => {});
        });
    }

    // ---- an account's whole drive -------------------------------------------
    async function driveCreated(k) {
        const user = `${t}${k}`;
        const out = {};
        // Sign-in through the context's own login page.
        begin();
        await signIn(page, user, {contextPath: t});
        await page.waitForLoadState('load').catch(() => {});
        out.landing = Object.assign(await read(`${k}-landing`), {nav: await sideNav()}, end());
        // The same account signed in through the site-level login page.
        begin();
        await signIn(page, user);
        await page.waitForLoadState('load').catch(() => {});
        out.landingSite = Object.assign(await read(`${k}-landing-site`), end());
        const paths = [['dash', 'dashboard'], ['reviewAssignments', 'dashboard/reviewAssignments'], ['editorial', 'dashboard/editorial'],
            ['mySubmissions', 'dashboard/mySubmissions'], ['submissions', 'submissions']];
        if (isOPS) paths.push(['wizard', `reviewer/submission/${sub.submissionId}`]);
        for (const [v, p] of paths) out[v] = await visit(`${k}-${v}`, p);

        // The list page, read settled and again 8 s later.
        out.list = {};
        out.list.first = await visit(`${k}-list`, 'dashboard/reviewAssignments');
        begin();
        await sleep(8000);
        out.list.late = Object.assign(await read(`${k}-list-late`), end());
        // Sweep: the "Error" window's "OK"; then what is left.
        if (await errWin().count()) {
            out.sweep = {};
            out.sweep.errWindowButtons = await errWin().getByRole('button').allInnerTexts().catch(() => []);
            out.sweep.errWindowHeading = flat(await errWin().getByRole('heading').first().innerText().catch(() => null), 80);
            await loc(page, 'the "Error" window over the reviewer list', errWin());
            begin();
            await errWin().getByRole('button', {name: 'OK', exact: true}).click({timeout: 8000}).catch((e) => cur.console.push(`ok failed: ${flat(e.message, 80)}`));
            await sleep(800);
            out.sweep.afterOk = Object.assign(await read(`${k}-list-after-ok`), end());
        } else {
            out.sweep = {noErrWindow: true};
        }
        const filters = page.locator('main').getByRole('button', {name: 'Filters', exact: true});
        out.sweep.filtersCount = await filters.count();
        if (out.sweep.filtersCount) {
            await loc(page, 'reviewer list: "Filters"', filters.first());
            begin();
            await filters.first().click({timeout: 8000}).catch((e) => cur.console.push(`filters failed: ${flat(e.message, 80)}`));
            await sleep(800);
            out.sweep.filters = Object.assign(await read(`${k}-filters`), end());
            begin();
            const apply = page.getByRole('dialog', {name: 'Filters'}).getByRole('button', {name: 'Apply Filters', exact: true});
            await loc(page, 'Filters window: "Apply Filters"', apply);
            await apply.click({timeout: 8000}).catch((e) => cur.console.push(`apply failed: ${flat(e.message, 80)}`));
            await sleep(1000);
            out.sweep.applied = Object.assign(await read(`${k}-filters-applied`), end());
            if (await errWin().count()) await errWin().getByRole('button', {name: 'OK', exact: true}).click({timeout: 5000}).catch(() => {});
            await sleep(600);
        }
        // The in-page search box: a phrase and Enter.
        const search = page.locator('main').getByRole('searchbox').or(page.locator('main input[type="search"]')).first();
        if (await search.count()) {
            await loc(page, 'reviewer list: the search box', search);
            begin();
            await search.fill('zz');
            await search.press('Enter');
            await sleep(1000);
            out.sweep.search = Object.assign(await read(`${k}-search`), end());
            if (await errWin().count()) await errWin().getByRole('button', {name: 'OK', exact: true}).click({timeout: 5000}).catch(() => {});
        }
        // Sidebar group headers.
        out.sweep.groups = [];
        for (const g of await page.locator('nav').getByRole('button').filter({hasText: /My Assignments as Reviewer|My Submissions as Author/}).all()) {
            begin();
            const name = flat(await g.innerText().catch(() => ''), 60);
            const before = await g.getAttribute('aria-expanded').catch(() => null);
            await g.click({timeout: 5000}).catch((e) => cur.console.push(`group failed: ${flat(e.message, 80)}`));
            await sleep(600);
            out.sweep.groups.push(Object.assign({name, before, after: await g.getAttribute('aria-expanded').catch(() => null), final: short(page.url()), nav: await sideNav()}, end()));
        }
        // A reload of the list.
        begin();
        await page.reload().catch(() => {});
        out.sweep.reload = Object.assign(await read(`${k}-list-reload`), end());
        fact(`account ${k}`, out);
        await signOut(page).catch(() => {});
    }

    async function driveInstalled(k) {
        const user = `${t}${k}`;
        const out = {};
        begin();
        await signIn(page, user, {contextPath: t});
        await page.waitForLoadState('load').catch(() => {});
        out.landing = Object.assign(await read(`${k}-landing`), {nav: await sideNav()}, end());
        out.reviewAssignments = await visit(`${k}-reviewAssignments`, 'dashboard/reviewAssignments');
        if (isOPS) out.wizard = await visit(`${k}-wizard`, `reviewer/submission/${sub.submissionId}`);
        if (k === 'm' || k === 'xr') out.editorial = await visit(`${k}-editorial`, 'dashboard/editorial');
        fact(`account ${k}`, out);
        await signOut(page).catch(() => {});
    }

    try {
        if (phase('created')) {
            const created = ['cr', 'ca'];
            if (isOPS && facts['ui invite'] && facts['ui invite'].accepted) created.push('iv');
            for (const k of created) await step(`created-${k}`, () => driveCreated(k));
        }
        if (phase('installed')) {
            const inst = isOPS ? ['m', 'mod', 'eb', 'au', 'rd'] : ['xr', 'au'];
            for (const k of inst) await step(`installed-${k}`, () => driveInstalled(k));
        }
        if (RUN === 'r1') {
            note(`ccI30u28 [${app.name}] ${today()}: reviewer list page (dashboard/reviewAssignments) for a created Reviewer-level role: the error window is getByRole('dialog').filter({hasText: 'The current role does not have access'}) with an "OK" button; "Filters" is main getByRole('button', {name: 'Filters', exact: true}) and its window getByRole('dialog', {name: 'Filters'}) with "Apply Filters". Script shared/playwright/checks/U28/I30/i30.js.`);
        }
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
