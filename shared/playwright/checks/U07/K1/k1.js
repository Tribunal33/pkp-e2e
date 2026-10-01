// U07 claim check, chunk K1: who reaches the Settings pages, and how, on all
// three apps. Spec: docs/specs/U07-journal-identity-and-about-pages.md —
// Purpose (10–29), Actors & permissions (31–55), Rules 1–6 (125–192), Settings
// bullet 1 (380–386), Cross-feature interactions (441–470), Coverage (477–535),
// register A2, OMP1; footnotes a, b, c, d, e, k, l, m, v, td2, td3, td5–td7,
// f-a2, f-omp1.
//
// Seeds its own scratch contexts per app:
//   S  the main scratch: a manager, (OJS/OMP) an Editor and a Production editor,
//      a Section editor, an assistant-level role, an author, (OJS/OMP) a
//      reviewer, a reader; masthead members (one "Does not appear", one past
//      member); (OJS/OMP) two reviewers who completed a review, one last
//      calendar year and one today; announcements and public comments on;
//      (OJS/OMP) the Information block placed in the sidebar.
//   P  a journal/press whose manager unticks "Permit changes to Settings" on
//      the Editor and Production editor roles through the Roles screen.
//   A  a context with its own manager, for the about phase's restricted
//      access.
//   N  a context that is not enabled (Rule 22 end of Actors row 4).
// The seeded `publicknowledge` is only read.
//
// Phases (PHASES=a,b,…; default all; later phases reuse k1-state-<app>.json):
//   seed     the scratch contexts
//   menu     manager.maya on publicknowledge: side menu, the five Settings pages
//            (heading, title, every tab and side tab, the address per tab),
//            reload keeps the tab (td5), a tab opened by address, the unknown
//            address (td6), the users list's "Edit", the upgrade notice's absence
//   levels   every roster level on publicknowledge (+ S's Production editor):
//            login landing, side menu, the five Settings addresses, the About
//            pages' "Edit" link; signed out the same addresses
//   edit     manager.maya: each About page's "Edit" pressed, where it lands (td3)
//   saves    on S: a save of the Masthead / Contact / Information / Privacy
//            Statement tabs by each level that opens the pages (Actors rows 2, 3)
//   rule5    on S: unsaved changes across tabs and out of the page (td7)
//   rule4    on S: submissions switched off; the notice on the five pages
//   rule6    after the saves: publicknowledge and P unchanged, the site privacy page
//   permit   on P: the Roles grid, the Editor / Production editor rows' "Edit"
//            window, the box unticked through the screen; the Editor and the
//            Production editor then: side menu, Settings addresses,
//            Announcements / Comments / Institutions, the About "Edit" link (A2)
//   masthead on S: the masthead and history pages (Actors row 6)
//   about    Actors row 4: the About pages signed out and signed in on
//            publicknowledge; N (not enabled) and A with "Users must be
//            registered…" ticked, signed out; OPS: no Information tab, pages or
//            block (Purpose 27–29)
//   xfeat    the Profile's privacy links (Cross-feature bullet 3)
//   inst     Rule 3: where the Institutions entry comes from (Distribution ›
//            Statistics on S as its manager; the site's Statistics tab read by admin)
//
//   PROBE_FEATURE=U07 PROBE_AGENT=ccK1 node bin/probe.js <app|all> shared/playwright/checks/U07/K1/k1.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL_PHASES = ['seed', 'menu', 'levels', 'edit', 'saves', 'rule5', 'rule4', 'rule6', 'permit', 'masthead', 'about', 'xfeat', 'inst'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL_PHASES;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k1]', new Date().toISOString().slice(11, 19), ...a);
const stateFile = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30_000;
const SLUGS = ['context', 'website', 'workflow', 'distribution', 'access'];
const DENIED_ROLE = /does not have access to this operation/i;
const DENIED_PLAIN = /Access denied\./;
// The tabs write the chosen tab into the address a beat after the click (not at once).
const HASH_MS = 1500;
const LAST_YEAR = new Date().getFullYear() - 1;

// ---------------------------------------------------------------------------
// Reading helpers

async function snap(page, name, extra = {}) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), title: await page.title().catch(() => null), error: String(e.message).slice(0, 300)};
    }
    Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

/** The editorial side menu (PrimeVue panelmenu), read without clicking. */
async function readNav(page) {
    const nav = page.getByRole('navigation', {name: 'Site Navigation'});
    if (!(await nav.count().catch(() => 0))) return {present: false, groups: [], groupLabels: [], settingsGroup: null};
    const groups = await nav.locator('[role="button"][aria-controls]').evaluateAll((els) => els.map((e) => {
        const region = document.getElementById(e.getAttribute('aria-controls') || '');
        const link = e.querySelector('a');
        return {
            label: e.getAttribute('aria-label') || e.textContent.replace(/\s+/g, ' ').trim(),
            href: link ? link.getAttribute('href') : null,
            items: region ? [...region.querySelectorAll('[role="treeitem"]')].map((li) => ({
                label: li.getAttribute('aria-label') || li.textContent.replace(/\s+/g, ' ').trim(),
                href: li.querySelector('a') ? li.querySelector('a').getAttribute('href') : null,
            })) : [],
        };
    })).catch(() => []);
    const settings = groups.find((g) => /^Settings$/i.test(g.label)) || null;
    return {
        present: true,
        groups,
        groupLabels: groups.map((g) => `${g.label}${g.items.length ? ' › ' + g.items.map((i) => i.label).join(', ') : ''}`),
        settingsGroup: settings ? settings.items.map((i) => i.label) : null,
    };
}

async function bodyText(page) {
    return (await page.locator('body').innerText().catch(() => '')) || '';
}

/** Classify the page a Settings address answered. */
async function classify(page) {
    const text = await bodyText(page);
    const url = page.url();
    return {
        url,
        title: await page.title().catch(() => null),
        h1: await page.locator('main h1, h1').allInnerTexts().catch(() => []),
        loginForm: (await page.locator('input[name="username"], #username').count()) > 0 && /\/login/.test(url),
        deniedRole: DENIED_ROLE.test(text),
        deniedPlain: DENIED_PLAIN.test(text),
        notFound: /404 Not Found/i.test(text),
        deniedSnippet: (text.match(/[^\n]*(access|denied|not found)[^\n]*/gi) || []).slice(0, 4),
    };
}

/** The tab tree of a Settings page: top tabs, and for each (clicked) its side tabs and the address after the click. */
async function readTabTree(page, {panelText = false} = {}) {
    const topTabs = await page.locator('[role="tab"]').evaluateAll((els) => els
        .filter((e) => !e.parentElement.closest('[role="tabpanel"]'))
        .map((e) => ({id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected'), controls: e.getAttribute('aria-controls')})));
    const tree = [];
    for (const t of topTabs) {
        const btn = page.locator(`[id="${t.id}"]`).first();
        await btn.click().catch(() => {});
        await idle(page);
        await sleep(HASH_MS);
        const entry = {tab: t.text, id: t.id, urlAfterClick: page.url()};
        entry.sideTabs = await page.locator(`[id="${t.controls}"]`).first().evaluate((panel) => [...panel.querySelectorAll('[role="tab"]')]
            .filter((e) => e.parentElement.closest('[role="tabpanel"]') === panel)
            .map((e) => ({id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), controls: e.getAttribute('aria-controls')}))).catch(() => []);
        if (panelText) entry.panelText = (await page.locator(`[id="${t.controls}"]`).first().innerText().catch(() => '')).slice(0, 3000);
        // click each side tab for its address
        for (const s of entry.sideTabs) {
            await page.locator(`[id="${s.id}"]`).first().click().catch(() => {});
            await idle(page);
            await sleep(HASH_MS);
            s.urlAfterClick = page.url();
            if (panelText) s.panelText = (await page.locator(`[id="${s.controls}"]`).first().innerText().catch(() => '')).slice(0, 2000);
        }
        tree.push(entry);
    }
    return tree;
}

async function selectedTabs(page) {
    return page.locator('[role="tab"][aria-selected="true"]').allInnerTexts().catch(() => []);
}

/** "Edit" links on a public page (the shared editLink component). */
async function editLinks(page) {
    return page.locator('a').evaluateAll((as) => as
        .filter((a) => /(^|\s)Edit(\s|$)/.test(a.innerText) || /management\/settings/.test(a.getAttribute('href') || ''))
        .map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'), aria: a.getAttribute('aria-label'), cls: a.className}))).catch(() => []);
}

function aboutPaths(app, ctx) {
    const p = [
        ['about', `/index.php/${ctx}/about`],
        ['history', `/index.php/${ctx}/about/editorialHistory`],
        ['contact', `/index.php/${ctx}/about/contact`],
        ['masthead', `/index.php/${ctx}/about/editorialMasthead`],
        ['privacy', `/index.php/${ctx}/about/privacy`],
        ['software', `/index.php/${ctx}/about/aboutThisPublishingSystem`],
    ];
    if (app.name !== 'ops') p.push(['info-readers', `/index.php/${ctx}/information/readers`]);
    return p;
}

async function readSettingsAddresses(page, app, ctx, prefix) {
    const out = {};
    for (const slug of SLUGS) {
        const resp = await page.goto(app.url(`/index.php/${ctx}/management/settings/${slug}`)).catch(() => null);
        await idle(page);
        const s = await snap(page, `${prefix}-settings-${slug}`);
        out[slug] = {status: resp ? resp.status() : null, ...(await classify(page)), tabs: await page.getByRole('tab').allInnerTexts().catch(() => [])};
        void s;
    }
    return out;
}

async function readAboutEditLinks(page, app, ctx, prefix) {
    const out = {};
    for (const [key, p] of aboutPaths(app, ctx)) {
        const resp = await page.goto(app.url(p)).catch(() => null);
        await idle(page);
        await snap(page, `${prefix}-about-${key}`);
        out[key] = {status: resp ? resp.status() : null, url: page.url(), title: await page.title().catch(() => null), edit: await editLinks(page)};
    }
    return out;
}

async function dismissErrorDialog(page) {
    const dlg = page.getByRole('dialog', {name: 'Error'});
    if (!(await dlg.count().catch(() => 0))) return null;
    const text = (await dlg.innerText().catch(() => '')).replace(/\n+/g, ' | ');
    await dlg.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
    await dlg.waitFor({state: 'hidden', timeout: 5_000}).catch(() => {});
    return text;
}

async function dashboard(page, app, ctx, name) {
    const resp = await page.goto(app.url(`/index.php/${ctx}/submissions`)).catch(() => null);
    await idle(page);
    const errorDialog = await dismissErrorDialog(page);
    const nav = await readNav(page);
    await snap(page, name, {httpStatus: resp ? resp.status() : null, errorDialog, nav});
    return {url: page.url(), status: resp ? resp.status() : null, errorDialog, nav};
}

/** Save the form in the visible tab panel that holds `field`; poll the status and notices. */
async function saveForm(page, field, name) {
    const form = page.locator('form').filter({has: field}).first();
    const save = form.getByRole('button', {name: 'Save', exact: true});
    const out = {requests: [], statuses: [], notices: [], fieldErrors: []};
    const onResp = (r) => {
        if (/\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET') out.requests.push({method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null, status: r.status(), url: r.url().replace(/^.*\/index\.php/, '')});
    };
    page.on('response', onResp);
    out.saveEnabled = await save.isEnabled({timeout: 10_000}).catch(() => 'err');
    await save.click({timeout: 10_000}).catch((e) => { out.clickError = e.message.slice(0, 120); });
    const start = Date.now();
    const seen = new Set();
    while (Date.now() - start < 6_000) {
        for (const t of (await page.locator('[role="status"], .pkpFormPage__status').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean)) seen.add(t);
        if (seen.has('Saved')) break;
        await sleep(300);
    }
    out.statuses = [...seen];
    out.notices = await page.locator('[role="alert"], .pkpNotification').allInnerTexts().catch(() => []);
    out.fieldErrors = await form.locator('.pkpFieldError, .pkpFormField__error').allInnerTexts().catch(() => []);
    out.formErrors = await form.locator('.pkpFormErrors, .pkpFormPage__errors').allInnerTexts().catch(() => []);
    page.off('response', onResp);
    record(name, out);
    log(name, JSON.stringify({saveEnabled: out.saveEnabled, statuses: out.statuses, requests: out.requests, fieldErrors: out.fieldErrors, notices: out.notices}));
    return out;
}

async function openTab(page, app, ctx, slug, topId, sideId) {
    const resp = await page.goto(app.url(`/index.php/${ctx}/management/settings/${slug}`)).catch(() => null);
    await idle(page);
    if (topId) { await page.locator(`[id="${topId}-button"]`).first().click().catch(() => {}); await idle(page); await sleep(HASH_MS); }
    if (sideId) { await page.locator(`[id="${sideId}-button"]`).first().click().catch(() => {}); await idle(page); await sleep(HASH_MS); }
    return resp;
}

async function typeRich(page, editorId, text, {replace = false} = {}) {
    await page.waitForFunction((id) => !!(window.tinymce && window.tinymce.get(id) && window.tinymce.get(id).initialized), editorId, {timeout: T}).catch(() => {});
    const body = page.locator('.pkpFormField').filter({has: page.locator(`[id="${editorId}"]`)}).frameLocator('iframe').first().locator('body');
    await body.click();
    if (replace) { await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace'); } else { await page.keyboard.press('ControlOrMeta+End'); }
    await page.keyboard.type(text);
}

/** Fields of the visible tab panel: label, id, type, value (non-rich). */
async function panelFields(page) {
    return page.locator('[role="tabpanel"]:visible .pkpFormField, [role="tabpanel"]:visible fieldset legend').evaluateAll((els) => els.map((e) => {
        if (e.tagName === 'LEGEND') return {legend: e.innerText.trim()};
        const lab = e.querySelector('label, legend, .pkpFormFieldLabel');
        const ctl = e.querySelector('input, select, textarea');
        return {label: lab ? lab.innerText.replace(/\s+/g, ' ').trim() : null, id: ctl ? ctl.id : null, type: ctl ? (ctl.tagName + ':' + (ctl.type || '')) : null, value: ctl && ctl.tagName !== 'TEXTAREA' ? ctl.value : null};
    })).catch(() => []);
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    const isOjs = app.name === 'ojs', isOps = app.name === 'ops';
    const PK = app.contextPath;
    await app.api.bootstrapProbe(PK);
    let st;
    if (on('seed')) {
        const s = tag('u07k1');
        const sec = isOjs ? ['ART'] : isOps ? ['PRE'] : undefined;
        const users = [
            {username: `${s}mgr`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
            {username: `${s}se`, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Subeditor', ...(sec ? {sections: sec} : {})},
            {username: `${s}as`, roles: [isOps ? 'editorialBoardMember' : 'copyeditor'], givenName: 'Asa', familyName: 'Assistant'},
            {username: `${s}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            {username: `${s}rd`, roles: ['reader'], givenName: 'Rita', familyName: 'Reader'},
            {username: `${s}mhno`, roles: ['sectionEditor'], givenName: 'Hana', familyName: 'Hidden', masthead: {sectionEditor: false}},
            {username: `${s}past`, roles: ['reader'], givenName: 'Paul', familyName: 'Pastmember', pastRoles: [{role: 'sectionEditor'}]},
        ];
        if (!isOps) {
            users.push({username: `${s}ed`, roles: ['editor'], givenName: 'Eve', familyName: 'Editor'});
            users.push({username: `${s}pe`, roles: ['productionEditor'], givenName: 'Pat', familyName: 'Production'});
            users.push({username: `${s}rv`, roles: ['externalReviewer'], givenName: 'Rex', familyName: 'Reviewer'});
            users.push({username: `${s}rvl`, roles: ['externalReviewer'], givenName: 'Lara', familyName: 'Lastyear'});
            users.push({username: `${s}rvt`, roles: ['externalReviewer'], givenName: 'Tom', familyName: 'Thisyear'});
        }
        const S = await app.api.createContext({
            tag: s, users, enableAnnouncements: true, enablePublicComments: true,
            ...(isOps ? {} : {sidebar: ['informationblockplugin']}),
        });
        let sub = null;
        if (!isOps) {
            sub = await app.api.createSubmission({
                tag: `${s}s`, context: s, submitter: `${s}au`, title: `K1 reviewed ${s}`,
                decisions: ['sendExternalReview'],
                reviewRounds: [{reviewers: [
                    {username: `${s}rvl`, status: 'completed', dateCompleted: `${LAST_YEAR}-06-15`},
                    {username: `${s}rvt`, status: 'completed'},
                ]}],
            });
        }
        const p = tag('u7p');
        const pUsers = [{username: `${p}mgr`, roles: ['manager'], givenName: 'Pia', familyName: 'Manager'}];
        if (!isOps) {
            pUsers.push({username: `${p}ed`, roles: ['editor'], givenName: 'Ed', familyName: 'Nopermit'});
            pUsers.push({username: `${p}pe`, roles: ['productionEditor'], givenName: 'Pe', familyName: 'Nopermit'});
        }
        const P = await app.api.createContext({tag: p, users: pUsers, enableAnnouncements: true, enablePublicComments: true});
        const a = tag('u7a');
        const A = await app.api.createContext({tag: a, users: [
            {username: `${a}mgr`, roles: ['manager'], givenName: 'Ari', familyName: 'Manager'},
        ]});
        const n = tag('u7n');
        const N = await app.api.createContext({tag: n, context: {enabled: false}, users: [{username: `${n}mgr`, roles: ['manager']}]});
        st = {S: s, P: p, A: a, N: n, sub, created: {S, P, A, N}};
        fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
        record('seed', st);
        log('seeded', JSON.stringify({S: s, P: p, A: a, N: n, sub: sub && sub.submissionId}));
    } else {
        st = JSON.parse(fs.readFileSync(stateFile(app), 'utf8'));
    }
    const S = st.S, P = st.P, A = st.A, N = st.N;

    const {page, close} = await launch(app);
    const browserDialogs = [];
    page.on('dialog', async (d) => { browserDialogs.push({type: d.type(), message: d.message(), url: page.url()}); await d.dismiss().catch(() => {}); });
    try {
        // ── menu ────────────────────────────────────────────────────────────
        if (on('menu')) {
            await signIn(page, 'manager.maya', {contextPath: PK});
            const d = await dashboard(page, app, PK, 'menu-mgr-dashboard');
            const out = {nav: d.nav, pages: {}};
            // press each Settings entry from the side menu
            const nav = page.getByRole('navigation', {name: 'Site Navigation'});
            const header = nav.locator('[role="button"][aria-label="Settings"]');
            for (const label of (d.nav.settingsGroup || [])) {
                await dashboard(page, app, PK, `menu-mgr-dash-before-${label.replace(/\W+/g, '')}`).catch(() => {});
                if (await header.count()) { if ((await header.first().getAttribute('aria-expanded')) !== 'true') await header.first().click().catch(() => {}); await sleep(400); }
                const link = nav.getByRole('link', {name: label, exact: true}).first();
                const pressed = {count: await link.count()};
                if (pressed.count) {
                    await link.click().catch((e) => { pressed.err = e.message.slice(0, 100); });
                    await page.waitForLoadState('load').catch(() => {});
                    await idle(page);
                }
                const nm = `menu-mgr-page-${label.replace(/\W+/g, '')}`;
                await snap(page, nm);
                pressed.page = await classify(page);
                pressed.tree = await readTabTree(page, {panelText: /Journal|Press|Server/.test(label)});
                pressed.urlAtEnd = page.url();
                out.pages[label] = pressed;
                record(`${nm}-tree`, pressed);
                log(nm, JSON.stringify({h1: pressed.page.h1, title: pressed.page.title, url: pressed.page.url, tabs: pressed.tree.map((t) => `${t.tab}[${t.sideTabs.map((x) => x.text).join('|')}]`)}));
            }
            // td5: Contact tab address and reload
            const td5 = {};
            await openTab(page, app, PK, 'context', null, null);
            td5.headingContext = await page.locator('main h1, h1').allInnerTexts().catch(() => []);
            td5.upgradeNotice = (await bodyText(page)).match(/new version of [^\n]*/i);
            td5.notices = await page.locator('.pkpNotification, [role="alert"], .notification').allInnerTexts().catch(() => []);
            await page.locator('#contact-button').first().click();
            await idle(page);
            td5.contactUrlAtOnce = page.url();
            await sleep(HASH_MS);
            td5.contactUrl = page.url();
            await page.reload();
            await idle(page);
            td5.afterReloadSelected = await selectedTabs(page);
            td5.afterReloadUrl = page.url();
            await snap(page, 'td5-contact-after-reload');
            await openTab(page, app, PK, 'website', 'setup', 'privacy');
            td5.privacyUrl = page.url();
            td5.privacySelected = await selectedTabs(page);
            await page.reload();
            await idle(page);
            td5.privacyAfterReloadSelected = await selectedTabs(page);
            td5.privacyAfterReloadUrl = page.url();
            await snap(page, 'td5-privacy-after-reload');
            // a tab opened directly by address from another page
            await page.goto(app.url(`/index.php/${PK}/submissions`));
            await idle(page);
            await page.goto(app.url(`/index.php/${PK}/management/settings/website#setup/privacy`));
            await idle(page);
            td5.directPrivacySelected = await selectedTabs(page);
            td5.directPrivacyUrl = page.url();
            await snap(page, 'td5-direct-privacy');
            await page.goto(app.url(`/index.php/${PK}/submissions`));
            await idle(page);
            await page.goto(app.url(`/index.php/${PK}/management/settings/workflow#review`));
            await idle(page);
            td5.directWorkflowReviewSelected = await selectedTabs(page);
            await snap(page, 'td5-direct-workflow-review');
            record('td5', td5);
            log('td5', JSON.stringify(td5));
            // td6: unknown address
            const r6 = await page.goto(app.url(`/index.php/${PK}/management/settings/nothing`)).catch(() => null);
            await idle(page);
            await snap(page, 'td6-unknown');
            const td6 = {status: r6 ? r6.status() : null, ...(await classify(page))};
            // and the Announcements / Institutions / Comments addresses as the manager (announcements, comments off on publicknowledge)
            for (const slug of ['announcements', 'institutions', 'userComments']) {
                const r = await page.goto(app.url(`/index.php/${PK}/management/settings/${slug}`)).catch(() => null);
                await idle(page);
                await snap(page, `rule3-mgr-${slug}`);
                td6[slug] = {status: r ? r.status() : null, ...(await classify(page)), errorDialog: await dismissErrorDialog(page)};
            }
            record('td6', td6);
            log('td6', JSON.stringify(td6));
            // Rule 3: a user's "Edit" in the users list
            await page.goto(app.url(`/index.php/${PK}/management/settings/access`));
            await idle(page);
            const row = page.getByRole('row', {name: /Rosa Reader|reader\.rosa/}).first();
            const r3 = {rowCount: await row.count()};
            if (r3.rowCount) {
                await row.getByRole('button').last().click();
                await idle(page);
                r3.menu = await page.getByRole('menuitem').allInnerTexts().catch(() => []);
                await page.getByRole('menuitem', {name: 'Edit'}).first().click().catch(() => {});
                await page.waitForURL(/management\/settings\/user/, {timeout: 15_000}).catch(() => {});
                await idle(page);
                r3.url = page.url();
                r3.h1 = await page.locator('main h1, h1').allInnerTexts().catch(() => []);
                r3.buttons = await page.getByRole('button').allInnerTexts().catch(() => []);
                await snap(page, 'rule3-users-edit');
            }
            record('rule3-users-edit-read', r3);
            log('rule3-users-edit', JSON.stringify(r3));
            record('menu', out);
            await signOut(page);
        }

        // ── levels ──────────────────────────────────────────────────────────
        if (on('levels')) {
            const roster = ['admin', 'manager.maya', ...(isOps ? [] : ['editor.diana']), 'sectioneditor.ana', 'assistant.rita', ...(isOps ? [] : ['copyeditor.carla', 'reviewer.julia']), 'author.alex', 'reader.rosa'];
            const res = {};
            for (const u of roster) {
                await signIn(page, u, {contextPath: PK});
                await idle(page);
                const landing = page.url();
                const d = await dashboard(page, app, PK, `levels-${u}-dashboard`);
                const settings = await readSettingsAddresses(page, app, PK, `levels-${u}`);
                const about = await readAboutEditLinks(page, app, PK, `levels-${u}`);
                res[u] = {landing, dashboard: {url: d.url, errorDialog: d.errorDialog, settingsGroup: d.nav.settingsGroup, groups: d.nav.groupLabels}, settings: Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, {status: v.status, url: v.url, h1: v.h1, title: v.title, deniedRole: v.deniedRole, deniedPlain: v.deniedPlain, loginForm: v.loginForm, notFound: v.notFound}])), aboutEdit: Object.fromEntries(Object.entries(about).map(([k, v]) => [k, v.edit.map((e) => e.href)]))};
                log('levels', u, JSON.stringify({settingsGroup: res[u].dashboard.settingsGroup, settings: Object.fromEntries(Object.entries(res[u].settings).map(([k, v]) => [k, v.deniedRole ? 'ROLE-DENIED' : v.deniedPlain ? 'ACCESS-DENIED' : v.loginForm ? 'LOGIN' : (v.h1 || []).join('/')])), edit: res[u].aboutEdit}));
                await signOut(page);
            }
            // S's Production editor (no roster account at that level)
            if (!isOps) {
                const u = `${S}pe`;
                await signIn(page, u, {contextPath: S});
                const d = await dashboard(page, app, S, 'levels-pe-dashboard');
                const settings = await readSettingsAddresses(page, app, S, 'levels-pe');
                const about = await readAboutEditLinks(page, app, S, 'levels-pe');
                res.productionEditor = {settingsGroup: d.nav.settingsGroup, groups: d.nav.groupLabels, settings: Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, {h1: v.h1, deniedRole: v.deniedRole, deniedPlain: v.deniedPlain}])), aboutEdit: Object.fromEntries(Object.entries(about).map(([k, v]) => [k, v.edit.map((e) => e.href)]))};
                log('levels pe', JSON.stringify(res.productionEditor));
                await signOut(page);
            }
            // signed out
            const so = {};
            for (const slug of SLUGS) {
                const r = await page.goto(app.url(`/index.php/${PK}/management/settings/${slug}`)).catch(() => null);
                await idle(page);
                await snap(page, `levels-anon-settings-${slug}`);
                so[slug] = {status: r ? r.status() : null, ...(await classify(page))};
            }
            so.about = await readAboutEditLinks(page, app, PK, 'levels-anon');
            res.signedOut = so;
            log('levels anon', JSON.stringify(Object.fromEntries(SLUGS.map((k) => [k, so[k].loginForm ? 'LOGIN ' + so[k].url : so[k].url]))), JSON.stringify(Object.fromEntries(Object.entries(so.about).map(([k, v]) => [k, v.edit.length]))));
            record('levels', res);
        }

        // ── edit (td3) ──────────────────────────────────────────────────────
        if (on('edit')) {
            const res = {};
            for (const [who, ctx] of [['manager.maya', PK], ...(isOps ? [] : [['editor.diana', PK]])]) {
                await signIn(page, who, {contextPath: ctx});
                for (const [key, p] of aboutPaths(app, ctx)) {
                    await page.goto(app.url(p));
                    await idle(page);
                    const links = await editLinks(page);
                    const r = {links, headingNear: await page.locator('h1, h2').allInnerTexts().catch(() => [])};
                    const link = page.locator('a').filter({hasText: /^\s*Edit\s*$/}).or(page.locator('a.pkp_button_edit, a[href*="management/settings"]')).first();
                    if (await link.count()) {
                        await loc(page, `"Edit" link on ${key}`, link);
                        await link.click();
                        await page.waitForLoadState('load').catch(() => {});
                        await idle(page);
                        r.landed = page.url();
                        r.selected = await selectedTabs(page);
                        r.page = await classify(page);
                        await snap(page, `edit-${who}-${key}-landed`);
                    }
                    res[`${who}:${key}`] = r;
                    log('edit', who, key, JSON.stringify({links: links.map((l) => `${l.text}→${l.href}`), landed: r.landed, selected: r.selected}));
                }
                await signOut(page);
            }
            record('edit', res);
        }

        // ── saves (Actors rows 2, 3) ────────────────────────────────────────
        if (on('saves')) {
            const res = {};
            // manager: Masthead (Country first) and Contact
            await signIn(page, `${S}mgr`, {contextPath: S});
            await openTab(page, app, S, 'context', 'masthead');
            await snap(page, 'saves-mgr-masthead');
            res.mastheadFields = await panelFields(page);
            // a scratch context has no Country and no initials: the first save of the tab asks for both
            const country = page.locator('#masthead-country-control');
            await loc(page, 'Masthead "Country" select', country);
            await country.selectOption({label: 'Canada'}).catch((e) => { res.countryErr = e.message.slice(0, 100); });
            await page.locator('#masthead-acronym-control-en').fill('K1S');
            const title = page.locator('[id^="masthead-name-control"]').first();
            await loc(page, 'Masthead "Journal Title" box (primary language)', title);
            res.titleBefore = await title.inputValue().catch(() => null);
            await title.fill(`K1 Saved Title ${S}`);
            res.mgrMasthead = await saveForm(page, title, 'saves-mgr-masthead-save');
            await openTab(page, app, S, 'context', 'contact');
            await snap(page, 'saves-mgr-contact');
            res.contactFields = await panelFields(page);
            const supName = page.locator('#contact-supportName-control');
            await supName.fill('K1 Support');
            await page.locator('#contact-supportEmail-control').fill(`support${S}@mail.test`);
            res.mgrContact = await saveForm(page, supName, 'saves-mgr-contact-save');
            await signOut(page);
            // editor (manager level) : Privacy Statement; production editor: Masthead initials
            if (!isOps) {
                await signIn(page, `${S}ed`, {contextPath: S});
                await openTab(page, app, S, 'website', 'setup', 'privacy');
                await snap(page, 'saves-ed-privacy');
                await typeRich(page, 'privacy-privacyStatement-control-en', ` K1 editor ${S}.`);
                res.edPrivacy = await saveForm(page, page.locator('#privacy-privacyStatement-control-en'), 'saves-ed-privacy-save');
                await signOut(page);
                await signIn(page, `${S}pe`, {contextPath: S});
                await openTab(page, app, S, 'context', 'masthead');
                const ini = page.locator('[id^="masthead-acronym-control"]').first();
                await loc(page, 'Masthead "Journal Initials" box', ini);
                await ini.fill('K1PE');
                res.peMasthead = await saveForm(page, ini, 'saves-pe-masthead-save');
                await openTab(page, app, S, 'website', 'setup', 'information');
                await snap(page, 'saves-pe-information');
                res.infoFields = await panelFields(page);
                await typeRich(page, 'information-readerInformation-control-en', ` K1 production ${S}.`);
                res.peInformation = await saveForm(page, page.locator('#information-readerInformation-control-en'), 'saves-pe-information-save');
                await signOut(page);
            } else {
                await signIn(page, `${S}mgr`, {contextPath: S});
                await openTab(page, app, S, 'website', 'setup', 'privacy');
                await snap(page, 'saves-mgr-privacy');
                await typeRich(page, 'privacy-privacyStatement-control-en', ` K1 manager ${S}.`);
                res.mgrPrivacy = await saveForm(page, page.locator('#privacy-privacyStatement-control-en'), 'saves-mgr-privacy-save');
                await signOut(page);
            }
            // admin (a manager role there) : Privacy statement save
            await signIn(page, 'admin', {contextPath: S});
            await openTab(page, app, S, 'website', 'setup', 'privacy');
            await typeRich(page, 'privacy-privacyStatement-control-en', ' K1 admin.');
            res.adminPrivacy = await saveForm(page, page.locator('#privacy-privacyStatement-control-en'), 'saves-admin-privacy-save');
            await signOut(page);
            // readback on the public pages
            for (const [k, p] of [['about', `/index.php/${S}/about`], ['contact', `/index.php/${S}/about/contact`], ['privacy', `/index.php/${S}/about/privacy`]]) {
                await page.goto(app.url(p));
                await idle(page);
                const s = await snap(page, `saves-public-${k}`);
                res[`public-${k}`] = {title: s.title, snippet: (s.text.main || '').slice(0, 600)};
            }
            record('saves', res);
        }

        // ── rule5 (td7) ─────────────────────────────────────────────────────
        if (on('rule5')) {
            const res = {browserDialogsBefore: browserDialogs.length, steps: []};
            await signIn(page, `${S}mgr`, {contextPath: S});
            await openTab(page, app, S, 'context', 'masthead');
            const title = page.locator('[id^="masthead-name-control"]').first();
            res.savedTitle = await title.inputValue();
            await title.fill(`K1 Unsaved ${S}`);
            await page.locator('#contact-button').first().click();
            await idle(page);
            res.steps.push({at: 'contact', url: page.url(), dialogs: await page.locator('[role="dialog"]:visible').allInnerTexts().catch(() => [])});
            await page.locator('#masthead-button').first().click();
            await idle(page);
            res.titleAfterTabSwitch = await title.inputValue();
            await page.locator('#contact-button').first().click();
            await idle(page);
            const phone = page.locator('#contact-supportPhone-control');
            await phone.fill('555-0107');
            res.contactSave = await saveForm(page, phone, 'rule5-contact-save');
            await page.locator('#masthead-button').first().click();
            await idle(page);
            res.titleAfterContactSave = await title.inputValue();
            await page.reload();
            await idle(page);
            await page.locator('#masthead-button').first().click();
            await idle(page);
            res.titleAfterReload = await page.locator('[id^="masthead-name-control"]').first().inputValue();
            await snap(page, 'rule5-masthead-after-reload');
            // type again, leave the page through the side menu
            await page.locator('[id^="masthead-name-control"]').first().fill(`K1 Unsaved again ${S}`);
            const before = browserDialogs.length;
            const nav = page.getByRole('navigation', {name: 'Site Navigation'});
            const header = nav.locator('[role="button"][aria-label="Settings"]');
            if (await header.count() && (await header.first().getAttribute('aria-expanded')) !== 'true') { await header.first().click().catch(() => {}); await sleep(300); }
            await nav.getByRole('link', {name: 'Website', exact: true}).first().click().catch((e) => { res.leaveErr = e.message.slice(0, 100); });
            await page.waitForLoadState('load').catch(() => {});
            await idle(page);
            res.leftTo = page.url();
            res.dialogsOnLeave = browserDialogs.slice(before);
            res.inPageDialogsOnLeave = await page.locator('[role="dialog"]:visible').allInnerTexts().catch(() => []);
            await snap(page, 'rule5-left-to-website');
            await openTab(page, app, S, 'context', 'masthead');
            res.titleAfterReturn = await page.locator('[id^="masthead-name-control"]').first().inputValue();
            await snap(page, 'rule5-masthead-after-return');
            await signOut(page);
            record('rule5', res);
            log('rule5', JSON.stringify(res));
        }

        // ── rule4: not accepting submissions ────────────────────────────────
        if (on('rule4')) {
            const res = {};
            await signIn(page, `${S}mgr`, {contextPath: S});
            await openTab(page, app, S, 'workflow', 'submission');
            res.sideTabs = await page.locator('[role="tabpanel"]:visible [role="tab"]').allInnerTexts().catch(() => []);
            const dis = page.locator('[role="tabpanel"]:visible [role="tab"]').filter({hasText: /Disable|Accept/i}).first();
            if (await dis.count()) { await dis.click(); await idle(page); }
            await snap(page, 'rule4-workflow-submission-disable');
            res.fields = await panelFields(page);
            res.boxes = await page.locator('[role="tabpanel"]:visible input[type="checkbox"], [role="tabpanel"]:visible input[type="radio"]').evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => ({name: e.name, value: e.value, checked: e.checked, label: (e.labels && e.labels[0] ? e.labels[0].innerText : '').trim()})));
            const ctl = page.locator('input[name="disableSubmissions"]');
            if (await ctl.count()) {
                await loc(page, 'the switch that stops submissions', ctl);
                await ctl.check();
                res.save = await saveForm(page, ctl, 'rule4-disable-save');
                for (const slug of SLUGS) {
                    await page.goto(app.url(`/index.php/${S}/management/settings/${slug}`));
                    await idle(page);
                    const s = await snap(page, `rule4-notice-${slug}`);
                    res[slug] = {notice: ((s.text.main || '').match(/[^\n]*(not currently accepting|accepting submissions|disabled|not accepting)[^\n]*/gi) || []), firstLines: (s.text.main || '').split('\n').slice(0, 6), nav: (await readNav(page)).groupLabels.filter((g) => /Submission/.test(g))};
                }
                // restore
                await openTab(page, app, S, 'workflow', 'submission');
                if (await dis.count()) { await dis.click(); await idle(page); }
                await ctl.uncheck();
                res.restore = await saveForm(page, ctl, 'rule4-restore-save');
                await page.goto(app.url(`/index.php/${S}/management/settings/website`));
                await idle(page);
                const after = await snap(page, 'rule4-notice-website-restored');
                res.websiteAfterRestore = (after.text.main || '').split('\n').slice(0, 4);
            }
            await signOut(page);
            record('rule4', res);
            log('rule4', JSON.stringify(res));
        }

        // ── rule6: one set per journal ──────────────────────────────────────
        if (on('rule6')) {
            const res = {};
            for (const [k, ctx] of [['S', S], ['P', P], ['PK', PK]]) {
                await page.goto(app.url(`/index.php/${ctx}/about/contact`));
                await idle(page);
                const c = await snap(page, `rule6-${k}-contact`);
                await page.goto(app.url(`/index.php/${ctx}/about/privacy`));
                await idle(page);
                const pr = await snap(page, `rule6-${k}-privacy`);
                await page.goto(app.url(`/index.php/${ctx}/about`));
                await idle(page);
                const ab = await snap(page, `rule6-${k}-about`);
                res[k] = {contactHasSupport: /K1 Support/.test(c.text.main || ''), privacyHasK1: /K1 (editor|manager|admin)/.test(pr.text.main || ''), aboutTitle: ab.title};
            }
            const r = await page.goto(app.url('/index.php/index/about/privacy')).catch(() => null);
            await idle(page);
            const site = await snap(page, 'rule6-site-privacy');
            res.site = {status: r ? r.status() : null, title: site.title, text: (site.text.main || '').slice(0, 300)};
            record('rule6', res);
            log('rule6', JSON.stringify(res));
        }

        // ── permit (Settings bullet 1; td2 second half; A2) ─────────────────
        if (on('permit')) {
            const res = {};
            await signIn(page, `${P}mgr`, {contextPath: P});
            await page.goto(app.url(`/index.php/${P}/management/settings/access`));
            await idle(page);
            await page.getByRole('tab', {name: 'Roles'}).click();
            await idle(page);
            await snap(page, 'permit-roles-grid');
            res.grid = await page.locator('tr.gridRow').evaluateAll((els) => els.map((e) => ({text: e.innerText.replace(/\s+/g, ' ').trim(), hasControls: !!e.querySelector('a.show_extras')})));
            const levelRows = res.grid.filter((r) => /Journal Manager|Press Manager|Preprint Server Manager|\bManager\b/.test(r.text));
            res.managerLevelRows = levelRows;
            const roleNames = isOps ? [] : (isOjs ? ['Journal editor', 'Production editor'] : ['Press editor', 'Production editor']);
            res.forms = {};
            for (const rn of roleNames) {
                await page.goto(app.url(`/index.php/${P}/management/settings/access`));
                await idle(page);
                await page.getByRole('tab', {name: 'Roles'}).click();
                await idle(page);
                const row = page.getByRole('row', {name: new RegExp(`^Settings ${rn}\\b`)});
                await row.getByRole('link', {name: 'Settings'}).click();
                await page.getByRole('link', {name: 'Edit', exact: true}).first().click();
                await idle(page);
                const form = page.locator('#userGroupForm');
                await form.waitFor({timeout: T});
                const box = form.getByRole('checkbox', {name: 'Permit changes to Settings'});
                await box.waitFor({timeout: 10_000}).catch(() => {});
                const f = {boxes: await form.locator('input[type=checkbox]').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked, disabled: e.disabled, label: e.labels && e.labels[0] ? e.labels[0].innerText.trim() : null})))};
                f.levelSelect = await form.locator('select').evaluateAll((els) => els.map((s) => ({name: s.name, value: s.options[s.selectedIndex] && s.options[s.selectedIndex].text, disabled: s.disabled})));
                await snap(page, `permit-form-${rn.replace(/\W+/g, '')}`);
                if (await box.count()) {
                    await box.uncheck();
                    const resp = page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: 15_000}).catch(() => null);
                    await form.getByRole('button', {name: 'OK'}).click();
                    const rr = await resp;
                    f.saveStatus = rr ? rr.status() : null;
                    await idle(page);
                    await sleep(800);
                    f.notices = await page.locator('[role="alert"], .pkpNotification, .ui-pnotify-text').allInnerTexts().catch(() => []);
                    f.formStillOpen = await form.isVisible().catch(() => false);
                }
                res.forms[rn] = f;
                log('permit form', rn, JSON.stringify(f));
            }
            // the manager row: which controls it offers
            await page.goto(app.url(`/index.php/${P}/management/settings/access`));
            await idle(page);
            await page.getByRole('tab', {name: 'Roles'}).click();
            await idle(page);
            const mRow = page.getByRole('row', {name: /^Settings (Journal|Press|Preprint Server) manager\b/i}).first();
            res.managerRow = {count: await mRow.count(), text: (await mRow.innerText().catch(() => '')).replace(/\s+/g, ' ')};
            if (res.managerRow.count) {
                const lk = mRow.getByRole('link', {name: 'Settings'});
                res.managerRow.settingsLink = await lk.count();
                if (res.managerRow.settingsLink) {
                    await lk.click();
                    await sleep(500);
                    res.managerRow.controlsAfter = await page.locator('tr').filter({has: page.getByRole('link', {name: 'Edit', exact: true})}).allInnerTexts().catch(() => []);
                    res.managerRow.editLinksVisible = await page.getByRole('link', {name: 'Edit', exact: true}).evaluateAll((els) => els.filter((e) => e.offsetParent).length);
                }
                await snap(page, 'permit-manager-row');
            }
            await signOut(page);
            // the unticked roles' members
            for (const who of isOps ? [] : ['ed', 'pe']) {
                const u = `${P}${who}`;
                await signIn(page, u, {contextPath: P});
                const r = {landing: page.url()};
                const d = await dashboard(page, app, P, `permit-${who}-dashboard`);
                r.settingsGroup = d.nav.settingsGroup;
                r.groups = d.nav.groupLabels;
                const s = await readSettingsAddresses(page, app, P, `permit-${who}`);
                r.settings = Object.fromEntries(Object.entries(s).map(([k, v]) => [k, {url: v.url, title: v.title, h1: v.h1, deniedRole: v.deniedRole, deniedPlain: v.deniedPlain, snippet: v.deniedSnippet}]));
                for (const slug of ['announcements', 'userComments', 'institutions']) {
                    const rr = await page.goto(app.url(`/index.php/${P}/management/settings/${slug}`)).catch(() => null);
                    await idle(page);
                    const errorDialog = await dismissErrorDialog(page);
                    await snap(page, `permit-${who}-${slug}`);
                    r[slug] = {status: rr ? rr.status() : null, errorDialog, ...(await classify(page)), tabs: await page.getByRole('tab').allInnerTexts().catch(() => [])};
                }
                // A2: the About page's Edit link and where it leads
                await page.goto(app.url(`/index.php/${P}/about`));
                await idle(page);
                await snap(page, `permit-${who}-about`);
                r.aboutEdit = await editLinks(page);
                const link = page.locator('a[href*="management/settings"]').first();
                if (await link.count()) {
                    await link.click();
                    await page.waitForLoadState('load').catch(() => {});
                    await idle(page);
                    await snap(page, `permit-${who}-about-edit-landed`);
                    r.aboutEditLanded = await classify(page);
                }
                for (const [k, p] of [['history', 'about/editorialHistory'], ['contact', 'about/contact'], ['info', 'information/readers']]) {
                    await page.goto(app.url(`/index.php/${P}/${p}`));
                    await idle(page);
                    await snap(page, `permit-${who}-${k}`);
                    r[`${k}Edit`] = (await editLinks(page)).map((e) => e.href);
                }
                res[who] = r;
                log('permit', who, JSON.stringify({settingsGroup: r.settingsGroup, settings: Object.fromEntries(Object.entries(r.settings).map(([k, v]) => [k, v.deniedRole ? 'ROLE-DENIED' : v.deniedPlain ? 'ACCESS-DENIED' : (v.h1 || []).join('/')])), ann: r.announcements.h1, com: r.userComments.h1, inst: [r.institutions.h1, r.institutions.deniedRole, r.institutions.deniedPlain, r.institutions.notFound], aboutEdit: r.aboutEdit.map((e) => e.href), landed: r.aboutEditLanded}));
                await signOut(page);
            }
            record('permit', res);
        }

        // ── masthead (Actors row 6) ─────────────────────────────────────────
        if (on('masthead')) {
            const res = {};
            for (const [k, p] of [['masthead', 'about/editorialMasthead'], ['history', 'about/editorialHistory']]) {
                await page.goto(app.url(`/index.php/${S}/${p}`));
                await idle(page);
                const s = await snap(page, `masthead-${k}`);
                const t = s.text.main || '';
                res[k] = {
                    text: t.slice(0, 2500),
                    subeditor: /Subeditor/.test(t), hidden: /Hidden/.test(t), past: /Pastmember/.test(t),
                    lastyear: /Lastyear/.test(t), thisyear: /Thisyear/.test(t), reviewerRex: /Rex Reviewer/.test(t),
                    manager: /Mona Manager/.test(t), editor: /Eve Editor/.test(t), pe: /Pat Production/.test(t),
                    peerHeading: (t.match(/[^\n]*Peer Reviewers[^\n]*/g) || []),
                };
            }
            record('masthead', res);
            log('masthead', JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, {...v, text: undefined}]))));
        }

        // ── about (Actors row 4; Purpose 27–29) ─────────────────────────────
        if (on('about')) {
            const res = {};
            const readSet = async (ctx, prefix) => {
                const o = {};
                for (const [k, p] of aboutPaths(app, ctx).concat(isOps ? [['info-readers', `/index.php/${ctx}/information/readers`], ['info-authors', `/index.php/${ctx}/information/authors`]] : [['info-authors', `/index.php/${ctx}/information/authors`], ['info-librarians', `/index.php/${ctx}/information/librarians`]])) {
                    const r = await page.goto(app.url(p)).catch(() => null);
                    await idle(page);
                    const s = await snap(page, `${prefix}-${k}`);
                    o[k] = {status: r ? r.status() : null, url: page.url(), title: s.title, login: /\/login/.test(page.url()), notFound: /404 Not Found/.test(s.text.main || ''), h1: await page.locator('h1').allInnerTexts().catch(() => [])};
                }
                return o;
            };
            res.anonPK = await readSet(PK, 'about-anon-pk');
            await signIn(page, 'reader.rosa', {contextPath: PK});
            res.readerPK = await readSet(PK, 'about-reader-pk');
            await signOut(page);
            res.anonN = await readSet(N, 'about-anon-notenabled');
            // A: tick "Users must be registered and log in to view the … site." through the screen
            await signIn(page, `${A}mgr`, {contextPath: A});
            await openTab(page, app, A, 'access', 'access');
            await snap(page, 'about-a-site-access-options');
            const box = page.getByRole('checkbox', {name: /Users must be registered and log in to view the/});
            res.restrictBox = {count: await box.count(), label: await box.first().evaluate((e) => e.labels && e.labels[0] ? e.labels[0].innerText : null).catch(() => null)};
            if (res.restrictBox.count) {
                await loc(page, 'Site Access Options "Users must be registered and log in…" box', box.first());
                await box.first().check();
                res.restrictSave = await saveForm(page, box.first(), 'about-a-restrict-save');
            }
            await signOut(page);
            res.anonRestricted = await readSet(A, 'about-anon-restricted');
            // Purpose 27–29: Website › Setup side tabs, the Sidebar list, on S as its manager
            await signIn(page, `${S}mgr`, {contextPath: S});
            await openTab(page, app, S, 'website', 'setup');
            res.setupSideTabs = await page.locator('[role="tabpanel"]:visible [role="tab"]').allInnerTexts().catch(() => []);
            await openTab(page, app, S, 'website', 'appearance', 'appearance-setup');
            await snap(page, 'about-s-appearance-setup');
            res.sidebarOptions = await page.locator('[role="tabpanel"]:visible').locator('input[type="checkbox"]').evaluateAll((els) => els.filter((e) => /sidebar/i.test(e.name) || /sidebar/i.test(e.closest('fieldset') ? e.closest('fieldset').innerText : '')).map((e) => ({name: e.name, value: e.value, checked: e.checked, label: e.labels && e.labels[0] ? e.labels[0].innerText.trim() : null}))).catch(() => []);
            res.sidebarText = (await page.locator('[role="tabpanel"]:visible').last().innerText().catch(() => '')).match(/Sidebar[\s\S]{0,600}/);
            await signOut(page);
            await page.goto(app.url(`/index.php/${S}`));
            await idle(page);
            const home = await snap(page, 'about-s-home');
            res.sHomeInfoBlock = ((home.text.main || '').match(/Information[\s\S]{0,120}/) || [null])[0];
            record('about', res);
            log('about', JSON.stringify({anonPK: Object.fromEntries(Object.entries(res.anonPK).map(([k, v]) => [k, `${v.status}${v.login ? ' LOGIN' : ''}${v.notFound ? ' 404' : ''} ${v.h1.join('/')}`])), readerPK: Object.fromEntries(Object.entries(res.readerPK).map(([k, v]) => [k, `${v.status}${v.login ? ' LOGIN' : ''}${v.notFound ? ' 404' : ''}`])), anonN: Object.fromEntries(Object.entries(res.anonN).map(([k, v]) => [k, `${v.status}${v.login ? ' LOGIN' : ''}`])), anonRestricted: Object.fromEntries(Object.entries(res.anonRestricted).map(([k, v]) => [k, `${v.status}${v.login ? ' LOGIN' : ''}`])), restrictBox: res.restrictBox, setupSideTabs: res.setupSideTabs, sidebarOptions: res.sidebarOptions, sHomeInfoBlock: res.sHomeInfoBlock}));
        }

        // ── xfeat: Profile's privacy links ──────────────────────────────────
        if (on('xfeat')) {
            const res = {};
            await signIn(page, 'reader.rosa', {contextPath: PK});
            await page.goto(app.url(`/index.php/${PK}/user/profile`));
            await idle(page);
            for (const t of await page.getByRole('tab').allInnerTexts().catch(() => [])) {
                await page.getByRole('tab', {name: t, exact: true}).first().click().catch(() => {});
                await idle(page);
                res[t] = await page.locator('a[href*="privacy"]').evaluateAll((as) => as.filter((a) => a.offsetParent).map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})));
            }
            await snap(page, 'xfeat-profile');
            await signOut(page);
            record('xfeat', res);
            log('xfeat', JSON.stringify(res));
        }
        // ── inst: the Institutions entry (Rule 3) ───────────────────────────
        if (on('inst')) {
            const res = {};
            await signIn(page, `${S}mgr`, {contextPath: S});
            await openTab(page, app, S, 'distribution', 'statistics');
            await snap(page, 'inst-s-distribution-statistics');
            res.fields = await panelFields(page);
            res.boxes = await page.locator('[role="tabpanel"]:visible input[type="checkbox"], [role="tabpanel"]:visible input[type="radio"]').evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => ({name: e.name, value: e.value, checked: e.checked, label: (e.labels && e.labels[0] ? e.labels[0].innerText : '').trim().slice(0, 120)})));
            res.nav = (await dashboard(page, app, S, 'inst-s-dashboard')).nav.groupLabels;
            await signOut(page);
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/admin/settings'));
            await idle(page);
            const stat = page.getByRole('tab', {name: 'Statistics', exact: true}).first();
            if (await stat.count()) { await stat.click().catch(() => {}); await idle(page); }
            await snap(page, 'inst-site-statistics');
            res.siteBoxes = await page.locator('[role="tabpanel"]:visible input[type="checkbox"], [role="tabpanel"]:visible input[type="radio"]').evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => ({name: e.name, value: e.value, checked: e.checked, label: (e.labels && e.labels[0] ? e.labels[0].innerText : '').trim().slice(0, 120)})));
            await signOut(page);
            record('inst', res);
            log('inst', JSON.stringify({boxes: res.boxes, siteBoxes: res.siteBoxes, nav: res.nav}));
        }
    } finally {
        record('browser-dialogs', browserDialogs);
        await close();
    }
});
