// U58 claim check, chunk K1: Settings › Workflow › "Submission" (the screen,
// who opens it, "Disable Submissions"), the side menu's "Start A New
// Submission", and the Actors rows of the "Submissions" page links and the
// components programming interface. Spec:
// docs/specs/U58-submission-intake-configuration.md — Purpose (10–36), Actors
// (38–55), Fields 57–70, Rules 1–6 (155–213), Settings bullet 1 (380–390),
// Cross-feature 414–450 (pointers); footnotes a, b, c, d, i, j, k, l, td1,
// td9, td11.
//
// Scratch contexts per app (tag prefix u58k1):
//   S  default (one form language): manager, (OJS/OMP) Editor, Production
//      editor, Reviewer; Section editor, assistant, author, reader; a draft by
//      the author; (OJS/OMP) the "Make a Submission" block in the sidebar.
//   P  (OJS/OMP) Editor and Production editor with "Permit changes to
//      Settings" off.
//   M  two form languages (en, fr_CA).
//   R  "Users must be registered and log in to view the journal site." ticked.
// `publicknowledge` and the roster are only read.
//
// Phases (PHASES=a,b; default all; later phases reuse k1-state-<app>.json):
//   seed menu roles levels permit saves rule2 rule3 rule4 about
//
//   PROBE_FEATURE=U58 PROBE_AGENT=ccK1 node bin/probe.js <app|all> shared/playwright/checks/U58/K1/k1.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL_PHASES = ['seed', 'menu', 'reload', 'roles', 'levels', 'permit', 'saves', 'rule2', 'rule3', 'rule4', 'block', 'makeS', 'about'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL_PHASES;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k1]', new Date().toISOString().slice(11, 19), ...a);
const stateFile = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30_000;
const DENIED_ROLE = /does not have access to this operation/i;
const SIDE = ['disableSubmissions', 'instructions', 'metadata', 'components', 'contributorRoles'];

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

async function readNav(page) {
    const nav = page.getByRole('navigation', {name: 'Site Navigation'});
    if (!(await nav.count().catch(() => 0))) return {present: false, labels: [], settings: null, startNew: false};
    const groups = await nav.locator('[role="button"][aria-controls], [role="treeitem"]').evaluateAll((els) => els.map((e) => {
        const region = e.getAttribute('aria-controls') ? document.getElementById(e.getAttribute('aria-controls')) : null;
        return {
            label: (e.getAttribute('aria-label') || e.textContent).replace(/\s+/g, ' ').trim(),
            items: region ? [...region.querySelectorAll('[role="treeitem"]')].map((li) => (li.getAttribute('aria-label') || li.textContent).replace(/\s+/g, ' ').trim()) : null,
        };
    })).catch(() => []);
    const text = (await nav.innerText().catch(() => '')).replace(/\s+/g, ' ');
    const settings = groups.find((g) => /^Settings$/i.test(g.label) && g.items);
    return {
        present: true,
        labels: groups.filter((g) => g.items !== null || true).map((g) => g.label + (g.items && g.items.length ? ' › ' + g.items.join(', ') : '')),
        settings: settings ? settings.items : null,
        startNew: /Start A New Submission/i.test(text),
    };
}

async function bodyText(page) {
    return (await page.locator('body').innerText().catch(() => '')) || '';
}

async function classify(page) {
    const text = await bodyText(page);
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        title: await page.title().catch(() => null),
        h1: await page.locator('h1').allInnerTexts().catch(() => []),
        loginForm: (await page.locator('input[name="username"], #username').count()) > 0,
        deniedRole: DENIED_ROLE.test(text),
        snippet: (text.match(/[^\n]*(access|denied|not found|not accepting|error)[^\n]*/gi) || []).slice(0, 4),
    };
}

async function dismissErrorDialog(page) {
    const dlg = page.getByRole('dialog', {name: 'Error'});
    if (!(await dlg.count().catch(() => 0))) return null;
    const text = (await dlg.innerText().catch(() => '')).replace(/\n+/g, ' | ');
    await dlg.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
    await dlg.waitFor({state: 'hidden', timeout: 5_000}).catch(() => {});
    return text;
}

async function go(page, app, p) {
    const resp = await page.goto(app.url(p)).catch((e) => ({err: e.message}));
    await idle(page);
    return resp && resp.status ? resp.status() : (resp && resp.err) || null;
}

async function dashboard(page, app, ctx, name) {
    const status = await go(page, app, `/index.php/${ctx}/dashboard`);
    const errorDialog = await dismissErrorDialog(page);
    const nav = await readNav(page);
    await snap(page, name, {httpStatus: status, errorDialog, nav});
    return {url: page.url(), status, errorDialog, nav};
}

async function sideTabs(page) {
    return page.locator('[role="tabpanel"]:visible [role="tab"]').evaluateAll((els) => els.map((e) => ({
        id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected'),
    }))).catch(() => []);
}

async function topTabs(page) {
    return page.locator('[role="tab"]').evaluateAll((els) => els
        .filter((e) => !e.parentElement.closest('[role="tabpanel"]'))
        .map((e) => ({id: e.id, text: e.innerText.replace(/\s+/g, ' ').trim(), selected: e.getAttribute('aria-selected')}))).catch(() => []);
}

async function openWorkflow(page, app, ctx, sideId) {
    const status = await go(page, app, `/index.php/${ctx}/management/settings/workflow`);
    await page.locator('[id="submission-button"]').first().click().catch(() => {});
    await idle(page);
    await sleep(600);
    if (sideId) {
        await page.locator(`[id="${sideId}-button"]`).first().click().catch(() => {});
        await idle(page);
        await sleep(1500);
    }
    return status;
}

/** Fields and buttons of one side-tab panel. */
async function panelInfo(page, panelId) {
    const panel = page.locator(`[id="${panelId}"]`);
    return panel.evaluate((p) => ({
        visible: !!p.offsetParent,
        text: p.innerText.slice(0, 1500),
        forms: p.querySelectorAll('form').length,
        labels: [...p.querySelectorAll('.pkpFormFieldLabel, legend, label')].filter((l) => l.offsetParent).map((l) => l.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
        buttons: [...p.querySelectorAll('button, a.pkp_button, a[role="button"], a.pkp_linkaction')].filter((b) => b.offsetParent).map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
        links: [...p.querySelectorAll('a[href]')].filter((a) => a.offsetParent).map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})),
        saveAtFoot: [...p.querySelectorAll('form')].map((f) => {
            const btns = [...f.querySelectorAll('button')].filter((b) => /^Save$/.test(b.innerText.trim()));
            const last = btns[btns.length - 1];
            if (!last) return null;
            const all = [...f.querySelectorAll('*')].filter((e) => e.offsetParent);
            return {saveButtons: btns.length, lastFieldBeforeSave: all.indexOf(last) > all.length - 15};
        }),
        languageButtons: [...p.querySelectorAll('button')].filter((b) => b.offsetParent && /^(English|French|Français|Français \(Canada\))/.test(b.innerText.trim())).map((b) => b.innerText.trim()),
    })).catch((e) => ({error: e.message.slice(0, 200)}));
}

async function tinyIds(page) {
    return page.evaluate(() => (window.tinymce ? window.tinymce.get().map((e) => e.id) : [])).catch(() => []);
}

async function tinyGet(page, id) {
    return page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent() : null), id).catch(() => null);
}

async function typeRich(page, editorId, text, {replace = false} = {}) {
    await page.waitForFunction((id) => !!(window.tinymce && window.tinymce.get(id) && window.tinymce.get(id).initialized), editorId, {timeout: T}).catch(() => {});
    const body = page.locator('.pkpFormField').filter({has: page.locator(`[id="${editorId}"]`)}).frameLocator('iframe').first().locator('body');
    await body.click();
    if (replace) { await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace'); } else { await page.keyboard.press('ControlOrMeta+End'); }
    await page.keyboard.type(text);
}

/** Press "Save" in the form holding `field`; record statuses, notices and the request. */
async function saveForm(page, field, name) {
    const form = page.locator('form').filter({has: field}).first();
    const save = form.getByRole('button', {name: 'Save', exact: true});
    const out = {requests: [], statuses: [], notices: []};
    const onReq = (r) => {
        if (/\/api\/v1\/contexts\//.test(r.url()) && r.method() !== 'GET') {
            let keys = null;
            try { keys = Object.keys(JSON.parse(r.postData() || '{}')); } catch (e) { keys = (r.postData() || '').split('&').map((kv) => decodeURIComponent(kv.split('=')[0])); }
            out.requests.push({method: r.method(), override: r.headers()['x-http-method-override'] || null, keys});
        }
    };
    const onResp = (r) => {
        if (/\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET') out.responseStatus = r.status();
    };
    page.on('request', onReq);
    page.on('response', onResp);
    out.saveEnabled = await save.isEnabled({timeout: 10_000}).catch(() => 'err');
    await save.click({timeout: 10_000}).catch((e) => { out.clickError = e.message.slice(0, 120); });
    const start = Date.now();
    const seen = [];
    while (Date.now() - start < 7_000) {
        for (const t of (await page.locator('[role="status"], .pkpFormPage__status').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean)) if (!seen.includes(t)) seen.push(t);
        if (seen.includes('Saved')) break;
        await sleep(150);
    }
    out.statuses = seen;
    out.notices = await page.locator('[role="alert"], .pkpNotification, .app__notifications').allInnerTexts().catch(() => []);
    out.fieldErrors = await form.locator('.pkpFieldError, .pkpFormField__error').allInnerTexts().catch(() => []);
    page.off('request', onReq);
    page.off('response', onResp);
    record(name, out);
    log(name, JSON.stringify(out));
    return out;
}

async function submissionsPage(page, app, ctx, name, {locale = ''} = {}) {
    const status = await go(page, app, `/index.php/${ctx}${locale ? '/' + locale : ''}/about/submissions`);
    const s = await snap(page, name);
    const info = await page.evaluate(() => {
        const main = document.querySelector('.page_submissions') || document.querySelector('.pkp_structure_main') || document.body;
        const note = main.querySelector('.cmp_notification');
        return {
            notice: note ? note.innerText.trim() : null,
            noticeLinks: note ? [...note.querySelectorAll('a')].map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})) : [],
            headings: [...main.querySelectorAll('h1, h2, h3')].map((h) => h.innerText.trim()),
            edit: [...main.querySelectorAll('a')].filter((a) => /management\/settings/.test(a.getAttribute('href') || '')).map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'), cls: a.className})),
            text: main.innerText.slice(0, 2500),
        };
    }).catch((e) => ({error: e.message}));
    return {status, url: s.url, ...info};
}

async function pressAndRead(page, locator, name) {
    const out = {present: await locator.count().catch(() => 0)};
    if (!out.present) return out;
    out.href = await locator.first().getAttribute('href').catch(() => null);
    await Promise.all([page.waitForLoadState('load').catch(() => {}), locator.first().click().catch((e) => { out.clickError = e.message.slice(0, 100); })]);
    await page.waitForLoadState('load').catch(() => {});
    await idle(page);
    out.errorDialog = await dismissErrorDialog(page);
    Object.assign(out, await classify(page));
    await snap(page, name, {press: out});
    return out;
}

async function genresApi(page, app, ctx, name) {
    const resp = await page.goto(app.url(`/index.php/${ctx}/api/v1/genres`)).catch(() => null);
    const out = {status: resp ? resp.status() : null};
    const body = resp ? await resp.text().catch(() => '') : '';
    try {
        const j = JSON.parse(body);
        out.itemsMax = j.itemsMax;
        out.items = Array.isArray(j.items) ? j.items.length : undefined;
        out.names = Array.isArray(j.items) ? j.items.map((g) => (g.name && (g.name.en || Object.values(g.name)[0])) || g.key) : undefined;
        out.error = j.error;
        out.errorMessage = j.errorMessage;
    } catch (e) {
        out.body = body.slice(0, 300);
    }
    record(name, out);
    return out;
}

function fixture(app) {
    return app.name === 'ops' ? path.join(app.suiteDir, 'fixtures', 'files', 'preprint.pdf') : path.join(app.suiteDir, 'fixtures', 'files', 'article.pdf');
}

// ---------------------------------------------------------------------------

forEachApp(async (app) => {
    const isOjs = app.name === 'ojs', isOps = app.name === 'ops';
    const PK = app.contextPath;
    await app.api.bootstrapProbe(PK);
    let st;
    if (on('seed')) {
        const s = tag('u58k1s');
        const sec = isOjs ? ['ART'] : isOps ? ['PRE'] : undefined;
        const users = [
            {username: `${s}mgr`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
            {username: `${s}se`, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Subeditor', ...(sec ? {sections: sec} : {})},
            {username: `${s}as`, roles: [isOps ? 'editorialBoardMember' : 'copyeditor'], givenName: 'Asa', familyName: 'Assistant'},
            {username: `${s}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            {username: `${s}rd`, roles: ['reader'], givenName: 'Rita', familyName: 'Reader'},
        ];
        if (!isOps) {
            users.push({username: `${s}ed`, roles: ['editor'], givenName: 'Eve', familyName: 'Editor'});
            users.push({username: `${s}pe`, roles: ['productionEditor'], givenName: 'Pat', familyName: 'Production'});
            users.push({username: `${s}rv`, roles: ['externalReviewer'], givenName: 'Rex', familyName: 'Reviewer'});
        }
        const S = await app.api.createContext({tag: s, users, ...(isOps ? {} : {sidebar: ['makesubmissionblockplugin']})});
        const draft = await app.api.createSubmission({
            tag: `${s}d`, context: s, submitter: `${s}au`, title: `K1 draft ${s}`, submitted: false,
            ...(isOps ? {} : {files: [{file: 'article.pdf'}]}),
        });
        let p = null;
        if (!isOps) {
            p = tag('u58k1p');
            await app.api.createContext({tag: p, users: [
                {username: `${p}mgr`, roles: ['manager'], givenName: 'Pia', familyName: 'Manager'},
                {username: `${p}ed`, roles: ['editor'], givenName: 'Ed', familyName: 'Nopermit'},
                {username: `${p}pe`, roles: ['productionEditor'], givenName: 'Pe', familyName: 'Nopermit'},
            ], roles: {editor: {permitSettings: false}, productionEditor: {permitSettings: false}}});
        }
        const m = tag('u58k1m');
        await app.api.createContext({tag: m, context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
            users: [{username: `${m}mgr`, roles: ['manager'], givenName: 'Max', familyName: 'Manager'}]});
        const r = tag('u58k1r');
        await app.api.createContext({tag: r, restrictSiteAccess: true, users: [
            {username: `${r}mgr`, roles: ['manager']}, {username: `${r}rd`, roles: ['reader']}]});
        st = {S: s, P: p, M: m, R: r, draft: draft.submissionId, createdS: S};
        fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
        record('seed', st);
        log('seeded', JSON.stringify(st));
    } else {
        st = JSON.parse(fs.readFileSync(stateFile(app), 'utf8'));
    }
    const {S, P, M, R} = st;

    const {page, close} = await launch(app);
    try {
        // ── menu: manager.maya on publicknowledge, read only (Purpose, Fields, Rule 1) ──
        if (on('menu')) {
            const res = {};
            await signIn(page, 'manager.maya');
            await go(page, app, `/index.php/${PK}/dashboard`);
            const nav = page.getByRole('navigation', {name: 'Site Navigation'});
            await nav.getByRole('button', {name: 'Settings'}).first().click().catch(() => {});
            await sleep(500);
            const wfLink = nav.getByRole('link', {name: 'Workflow', exact: true}).first();
            await loc(page, 'side menu Settings › Workflow', wfLink);
            await Promise.all([page.waitForLoadState('load').catch(() => {}), wfLink.click().catch((e) => { res.navClickError = e.message.slice(0, 100); })]);
            await idle(page);
            await sleep(1500);
            let s = await snap(page, 'm-01-workflow-landing');
            res.landing = {url: s.url, h1: await page.locator('h1').allInnerTexts(), topTabs: await topTabs(page), sideTabs: await sideTabs(page)};
            res.panels = {};
            for (const id of SIDE) {
                const btn = page.locator(`[id="${id}-button"]`).first();
                if (!(await btn.count())) { res.panels[id] = {absent: true}; continue; }
                await btn.click();
                await idle(page);
                await sleep(1500);
                s = await snap(page, `m-02-side-${id}`);
                res.panels[id] = {url: s.url.replace(/^https?:\/\/[^/]+/, ''), selected: (await sideTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text), ...(await panelInfo(page, id))};
                if (id === 'disableSubmissions') {
                    const box = page.locator('input[name="disableSubmissions"]');
                    await loc(page, 'Disable Submissions box', box);
                    res.disableBox = {count: await box.count(), checked: await box.first().isChecked().catch(() => null),
                        label: await box.first().evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null)};
                    res.disableHelp = await page.locator('[id="disableSubmissions"] .pkpFormField__description, [id="disableSubmissions"] [id$="-description"]').allInnerTexts().catch(() => []);
                    res.disableHeading = await page.locator('[id="disableSubmissions"] legend, [id="disableSubmissions"] .pkpFormGroup__heading, [id="disableSubmissions"] h2, [id="disableSubmissions"] h3').allInnerTexts().catch(() => []);
                }
            }
            if (isOps) res.authorScreening = await page.locator('[id="authorScreening-button"]').count();
            else res.authorScreeningControl = await page.locator('[id="authorScreening-button"]').count();
            // reload on Metadata
            await page.locator('[id="metadata-button"]').first().click();
            await idle(page); await sleep(1500);
            res.beforeReloadUrl = page.url();
            await page.reload(); await idle(page); await sleep(1500);
            s = await snap(page, 'm-03-after-reload-on-metadata');
            res.afterReload = {url: page.url(), top: (await topTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text), side: (await sideTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text)};
            // an address carrying the side tab, typed from another page
            await go(page, app, `/index.php/${PK}/dashboard`);
            await page.goto(app.url(`/index.php/${PK}/management/settings/workflow#submission/instructions`));
            await idle(page); await sleep(1500);
            await snap(page, 'm-04-typed-instructions-hash');
            res.typedHash = {url: page.url(), top: (await topTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text), side: (await sideTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text)};
            // the Submissions page's Edit links as the manager (Rule 1 "Edit links open Author Guidance")
            const sp = await submissionsPage(page, app, PK, 'm-05-submissions-page-manager');
            res.submissionsPage = sp;
            res.editLanded = [];
            for (let i = 0; i < (sp.edit || []).length; i++) {
                await go(page, app, `/index.php/${PK}/about/submissions`);
                const a = page.locator('a[href*="management/settings"]').nth(i);
                const href = await a.getAttribute('href');
                await Promise.all([page.waitForLoadState('load').catch(() => {}), a.click()]);
                await idle(page); await sleep(1500);
                await snap(page, `m-06-edit-${i}-landed`);
                res.editLanded.push({href, url: page.url(), top: (await topTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text), side: (await sideTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text)});
            }
            // header About menu (Cross-feature 437)
            await go(page, app, `/index.php/${PK}`);
            res.headerNav = await page.locator('.pkp_navigation_primary, #navigationPrimary').first().evaluate((n) => [...n.querySelectorAll('a')].map((a) => a.innerText.trim() + ' → ' + (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''))).catch(() => []);
            await snap(page, 'm-07-home-manager');
            record('menu', res);
            log('menu', JSON.stringify({landing: res.landing, sides: Object.fromEntries(Object.entries(res.panels).map(([k, v]) => [k, [v.url, v.selected, v.forms, v.saveAtFoot]])), afterReload: res.afterReload, typedHash: res.typedHash, editLanded: res.editLanded, disableBox: res.disableBox, help: res.disableHelp}));
            await signOut(page);
        }

        // ── reload: which tab a reload lands on, per side tab, plus the Review tab's control (Rule 1; U29 A4) ──
        if (on('reload')) {
            const res = {};
            await signIn(page, 'manager.maya');
            for (const id of ['instructions', 'components', 'contributorRoles', 'disableSubmissions']) {
                await openWorkflow(page, app, PK, id);
                const before = page.url();
                await page.reload(); await idle(page); await sleep(2500);
                await snap(page, `rl-${id}`);
                res[id] = {before, after: page.url(), top: (await topTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text), side: (await sideTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text)};
            }
            // control: Review › a side tab
            await go(page, app, `/index.php/${PK}/management/settings/workflow`);
            await page.locator(`[id="${isOps ? 'emails' : 'review'}-button"]`).first().click(); await idle(page); await sleep(1000);
            const rs = await sideTabs(page);
            const second = rs[1] || rs[0];
            if (second) { await page.locator(`[id="${second.id}"]`).first().click(); await idle(page); await sleep(1500); }
            const before = page.url();
            await page.reload(); await idle(page); await sleep(2500);
            await snap(page, 'rl-review-control');
            res.reviewControl = {clicked: second && second.text, before, after: page.url(), top: (await topTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text), side: (await sideTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text)};
            record('reload', res);
            log('reload', JSON.stringify(res));
            await signOut(page);
        }

        // ── roles: the Roles list (line 43) and manager-level "Permit changes to Settings" (Settings 1) ──
        if (on('roles')) {
            const res = {};
            await signIn(page, 'manager.maya');
            await go(page, app, `/index.php/${PK}/management/settings/access`);
            await page.getByRole('tab', {name: 'Roles'}).click(); await idle(page);
            await snap(page, 'r-01-pk-roles-grid');
            res.pkGrid = await page.locator('tr.gridRow').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
            await signOut(page);
            await signIn(page, `${S}mgr`, {contextPath: S});
            await go(page, app, `/index.php/${S}/management/settings/access`);
            await page.getByRole('tab', {name: 'Roles'}).click(); await idle(page);
            await snap(page, 'r-02-s-roles-grid');
            res.sGrid = await page.locator('tr.gridRow').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
            const names = isOjs ? ['Journal manager', 'Journal editor', 'Production editor'] : app.name === 'omp' ? ['Press manager', 'Press editor', 'Production editor'] : ['Preprint Server manager'];
            res.forms = {};
            for (const rn of names) {
                await go(page, app, `/index.php/${S}/management/settings/access`);
                await page.getByRole('tab', {name: 'Roles'}).click(); await idle(page);
                const row = page.getByRole('row', {name: new RegExp(`^Settings ${rn}\\b`, 'i')}).first();
                const f = {rowCount: await row.count()};
                if (f.rowCount) {
                    await row.getByRole('link', {name: 'Settings'}).click().catch(() => {});
                    await sleep(400);
                    const edit = page.getByRole('link', {name: 'Edit', exact: true}).filter({visible: true}).first();
                    f.editVisible = await edit.count();
                    if (f.editVisible) {
                        await edit.click(); await idle(page);
                        const form = page.locator('#userGroupForm');
                        await form.waitFor({timeout: T}).catch(() => {});
                        await sleep(800);
                        f.boxes = await form.locator('input[type=checkbox]').evaluateAll((els) => els.filter((e) => e.offsetParent).map((e) => ({name: e.name, checked: e.checked, disabled: e.disabled, label: e.labels && e.labels[0] ? e.labels[0].innerText.trim() : null})));
                        await snap(page, `r-03-form-${rn.replace(/\W+/g, '')}`);
                    }
                }
                res.forms[rn] = f;
            }
            record('roles', res);
            log('roles', JSON.stringify(res.forms));
            await signOut(page);
        }

        // ── levels: every roster level on publicknowledge (Actors rows 1, 2, 5–8; td9, td11; Cross-feature 448–450) ──
        if (on('levels')) {
            const res = {};
            const who = isOps
                ? ['admin', 'manager.maya', 'sectioneditor.ana', 'assistant.rita', 'author.alex', 'reader.rosa']
                : ['admin', 'manager.maya', 'editor.diana', 'sectioneditor.ana', 'assistant.rita', 'reviewer.julia', 'author.alex', 'reader.rosa'];
            for (const u of who) {
                const k = u.replace(/\W+/g, '');
                const r = {};
                await signIn(page, u);
                r.landing = page.url();
                r.dash = await dashboard(page, app, PK, `l-${k}-01-dashboard`);
                const st1 = await go(page, app, `/index.php/${PK}/management/settings/workflow`);
                r.errorDialogSettings = await dismissErrorDialog(page);
                await snap(page, `l-${k}-02-settings-workflow`);
                r.settings = {status: st1, ...(await classify(page)), side: (await sideTabs(page)).map((t) => t.text)};
                r.subs = await submissionsPage(page, app, PK, `l-${k}-03-submissions`);
                r.view = await pressAndRead(page, page.getByRole('link', {name: 'view your pending submissions'}), `l-${k}-04-view-pending`);
                await go(page, app, `/index.php/${PK}/about/submissions`);
                // The start page can enrol a non-author in the Author role (OPS: on load), so on
                // the shared roster only the accounts that already may submit press it; the other
                // levels press it on S (phase makeS).
                r.make = ['sectioneditor.ana', 'assistant.rita', 'reader.rosa'].includes(u)
                    ? {skipped: 'pressed on S in phase makeS'}
                    : await pressAndRead(page, page.getByRole('link', {name: 'Make a new submission'}), `l-${k}-05-make-new`);
                if (r.make.present) r.make.startForm = {begin: await page.getByRole('button', {name: /Begin Submission/}).count(), notice: await page.getByText(/not accepting submissions/).count()};
                r.genres = await genresApi(page, app, PK, `l-${k}-06-genres`);
                res[u] = r;
                log('level', u, JSON.stringify({nav: r.dash.nav.settings, startNew: r.dash.nav.startNew, settings: [r.settings.h1, r.settings.deniedRole, r.errorDialogSettings], notice: r.subs.notice, edit: (r.subs.edit || []).length, view: [r.view.url, r.view.h1, r.view.deniedRole, r.view.errorDialog], make: [r.make.url, r.make.h1, r.make.deniedRole, r.make.startForm], genres: [r.genres.status, r.genres.itemsMax, r.genres.errorMessage]}));
                await signOut(page);
            }
            // signed out
            const r = {};
            r.subs = await submissionsPage(page, app, PK, 'l-out-03-submissions');
            r.login = await pressAndRead(page, page.locator('.cmp_notification a').filter({hasText: 'Login'}), 'l-out-04-login-link');
            await go(page, app, `/index.php/${PK}/about/submissions`);
            r.register = await pressAndRead(page, page.locator('.cmp_notification a').filter({hasText: 'Register'}), 'l-out-05-register-link');
            r.genres = await genresApi(page, app, PK, 'l-out-06-genres');
            const st2 = await go(page, app, `/index.php/${PK}/management/settings/workflow`);
            r.settings = {status: st2, ...(await classify(page))};
            await snap(page, 'l-out-02-settings-workflow');
            await go(page, app, `/index.php/${PK}`);
            r.headerNav = await page.locator('.pkp_navigation_primary, #navigationPrimary').first().evaluate((n) => [...n.querySelectorAll('a')].map((a) => a.innerText.trim() + ' → ' + (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, ''))).catch(() => []);
            await snap(page, 'l-out-07-home');
            res.signedOut = r;
            log('level', 'signed out', JSON.stringify({notice: r.subs.notice, links: r.subs.noticeLinks, login: [r.login.url, r.login.h1], register: [r.register.url, r.register.h1], genres: [r.genres.status, r.genres.errorMessage], settings: r.settings.url, header: r.headerNav}));
            record('levels', res);
        }

        // ── permit: manager-level roles without "Permit changes to Settings" (OJS, OMP) ──
        if (on('permit') && !isOps) {
            const res = {};
            for (const w of ['ed', 'pe']) {
                const u = `${P}${w}`;
                const r = {};
                await signIn(page, u, {contextPath: P});
                r.dash = await dashboard(page, app, P, `p-${w}-01-dashboard`);
                const st1 = await go(page, app, `/index.php/${P}/management/settings/workflow`);
                r.errorDialog = await dismissErrorDialog(page);
                await snap(page, `p-${w}-02-settings-workflow`);
                r.settings = {status: st1, ...(await classify(page))};
                r.subs = await submissionsPage(page, app, P, `p-${w}-03-submissions`);
                r.edits = [];
                for (let i = 0; i < (r.subs.edit || []).length; i++) {
                    await go(page, app, `/index.php/${P}/about/submissions`);
                    r.edits.push(await pressAndRead(page, page.locator('a[href*="management/settings"]').nth(i), `p-${w}-04-edit-${i}`));
                }
                r.genres = await genresApi(page, app, P, `p-${w}-05-genres`);
                res[w] = r;
                log('permit', w, JSON.stringify({nav: r.dash.nav.settings, settings: [r.settings.url, r.settings.deniedRole, r.settings.h1, r.errorDialog], edits: r.edits.map((e) => [e.href, e.deniedRole, e.h1, e.errorDialog]), genres: [r.genres.status, r.genres.itemsMax]}));
                await signOut(page);
            }
            record('permit', res);
        }

        // ── saves: each level that opens Settings saves on S (Actors rows 1, 2) ──
        if (on('saves')) {
            const res = {};
            const savers = isOps ? [['admin', 'admin']] : [['ed', `${S}ed`], ['pe', `${S}pe`], ['admin', 'admin']];
            for (const [k, u] of savers) {
                const r = {};
                await signIn(page, u, {contextPath: S});
                r.dash = await dashboard(page, app, S, `s-${k}-01-dashboard`);
                r.status = await openWorkflow(page, app, S, 'instructions');
                await snap(page, `s-${k}-02-author-guidance`);
                r.side = (await sideTabs(page)).map((t) => t.text);
                const ids = await tinyIds(page);
                const ag = ids.find((i) => /authorGuidelines/.test(i));
                r.agId = ag;
                if (ag) {
                    await typeRich(page, ag, `Guidelines saved by ${k} ${S}`, {replace: true});
                    r.save = await saveForm(page, page.locator(`[id="${ag}"]`), `s-${k}-03-save-ag`);
                }
                await page.locator('[id="components-button"]').first().click().catch(() => {});
                await idle(page); await sleep(1500);
                await snap(page, `s-${k}-04-components`);
                r.components = await panelInfo(page, 'components');
                r.components.controls = await page.getByRole('tabpanel', {name: 'Components'}).locator('a:visible, button:visible').allInnerTexts().catch(() => []);
                r.components.text = undefined;
                res[k] = r;
                log('saves', k, JSON.stringify({nav: r.dash.nav.settings, side: r.side, save: r.save && [r.save.statuses, r.save.responseStatus, r.save.notices], comps: r.components.controls.filter((x) => !/^Settings$/.test(x.trim()))}));
                await signOut(page);
            }
            record('saves', res);
        }

        // ── rule2: saving a tab stores that tab alone; unsaved text across side tabs and out of the page ──
        if (on('rule2')) {
            const res = {};
            const dialogs = [];
            page.on('dialog', async (d) => { dialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); });
            await signIn(page, `${S}mgr`, {contextPath: S});
            await openWorkflow(page, app, S, 'instructions');
            const ids = await tinyIds(page);
            res.editorIds = ids;
            const ag = ids.find((i) => /authorGuidelines/.test(i));
            res.agPanel = await panelInfo(page, 'instructions');
            res.agPanel.text = undefined;
            res.before = await tinyGet(page, ag);
            await typeRich(page, ag, ' UNSAVEDAG');
            await page.locator('[id="metadata-button"]').first().click(); await idle(page); await sleep(1200);
            // tick "Enable subject metadata" (or the first unticked box) on Metadata
            const mpanel = page.getByRole('tabpanel', {name: 'Metadata'});
            let mbox = mpanel.getByRole('checkbox', {name: 'Enable subject metadata'});
            if (!(await mbox.count())) mbox = mpanel.locator('input[type="checkbox"]:not(:checked)').first();
            res.metaBoxName = await mbox.getAttribute('name').catch(() => null);
            res.metaBoxValue = await mbox.getAttribute('value').catch(() => null);
            res.metaBoxLabel = await mbox.evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null);
            await mbox.check().catch((e) => { res.metaCheckErr = e.message.slice(0, 100); });
            await snap(page, 'r2-01-metadata-changed');
            res.metaSave = await saveForm(page, page.locator('input[type="checkbox"][value="enable"]'), 'r2-02-metadata-save');
            await page.locator('[id="instructions-button"]').first().click(); await idle(page); await sleep(1200);
            res.agAfterTabRoundTrip = await tinyGet(page, ag);
            await snap(page, 'r2-03-ag-after-roundtrip');
            await page.reload(); await idle(page);
            await openWorkflow(page, app, S, 'instructions');
            res.agAfterReload = await tinyGet(page, ag);
            await page.locator('[id="metadata-button"]').first().click(); await idle(page); await sleep(1200);
            res.metaAfterReload = res.metaBoxLabel ? await page.getByRole('tabpanel', {name: 'Metadata'}).getByRole('checkbox', {name: res.metaBoxLabel}).first().isChecked().catch(() => null) : null;
            await snap(page, 'r2-04-after-reload');
            // Author Guidance save: same page, then reload
            await page.locator('[id="instructions-button"]').first().click(); await idle(page); await sleep(1200);
            await typeRich(page, ag, `Guidelines by manager ${S}`, {replace: true});
            res.agSave = await saveForm(page, page.locator(`[id="${ag}"]`), 'r2-05-ag-save');
            res.agSamePage = await tinyGet(page, ag);
            await snap(page, 'r2-06-ag-saved-same-page');
            await openWorkflow(page, app, S, 'instructions');
            res.agReload = await tinyGet(page, ag);
            // the Disable Submissions tab: Save with no change
            await page.locator('[id="disableSubmissions-button"]').first().click(); await idle(page); await sleep(1200);
            res.disableSaveNoChange = await saveForm(page, page.locator('input[name="disableSubmissions"]'), 'r2-07-disable-save-unchanged');
            // leave the page with an unsaved change
            await page.locator('[id="instructions-button"]').first().click(); await idle(page); await sleep(1200);
            await typeRich(page, ag, ' LEAVEUNSAVED');
            await page.locator('h1').first().click().catch(() => {});
            await sleep(500);
            await snap(page, 'r2-08-before-leave');
            const nav = page.getByRole('navigation', {name: 'Site Navigation'});
            const dash = nav.getByRole('link', {name: 'Website', exact: true}).first();
            res.leaveVia = await dash.innerText().catch(() => null);
            const d0 = dialogs.length;
            await Promise.all([page.waitForLoadState('load').catch(() => {}), dash.click().catch((e) => { res.leaveErr = e.message.slice(0, 100); })]);
            await idle(page);
            res.leaveUrl = page.url();
            res.leaveDialogs = dialogs.slice(d0);
            await openWorkflow(page, app, S, 'instructions');
            res.agAfterLeave = await tinyGet(page, ag);
            await snap(page, 'r2-09-after-leave');
            res.dialogs = dialogs;
            record('rule2', res);
            log('rule2', JSON.stringify({meta: [res.metaBoxName, res.metaSave.statuses, res.metaSave.requests, res.metaSave.notices], agRound: /UNSAVEDAG/.test(res.agAfterTabRoundTrip || ''), agReload: /UNSAVEDAG/.test(res.agAfterReload || ''), metaAfterReload: res.metaAfterReload, agSave: [res.agSave.statuses, res.agSave.requests, res.agSave.notices], agSame: res.agSamePage, agReloadRead: res.agReload, dis: [res.disableSaveNoChange.statuses, res.disableSaveNoChange.requests], leave: [res.leaveVia, res.leaveUrl, res.leaveDialogs], agAfterLeave: res.agAfterLeave}));
            page.removeAllListeners('dialog');
            await signOut(page);
        }

        // ── rule3: two form languages (M) vs one (S) ──
        if (on('rule3')) {
            const res = {};
            for (const [k, ctx] of [['one', S], ['two', M]]) {
                await signIn(page, `${ctx}mgr`, {contextPath: ctx});
                await openWorkflow(page, app, ctx, 'instructions');
                await snap(page, `r3-${k}-01-author-guidance`);
                const r = {panel: await panelInfo(page, 'instructions'), editors: await tinyIds(page)};
                r.panel.text = undefined;
                r.localeButtons = await page.locator('[id="instructions"] button').evaluateAll((els) => els.filter((b) => b.offsetParent).map((b) => b.innerText.trim()).filter((t) => /English|French|Fran/.test(t)));
                if (k === 'two') {
                    const fr = (r.editors || []).find((i) => /authorGuidelines.*fr_CA/.test(i));
                    const en = (r.editors || []).find((i) => /authorGuidelines.*-en$/.test(i));
                    r.frId = fr; r.enId = en;
                    const frBtn = page.getByRole('tabpanel', {name: 'Author Guidance'}).getByRole('button', {name: /French|Français/}).first();
                    r.frBtn = await frBtn.count();
                    if (r.frBtn) { await frBtn.click(); await sleep(600); }
                    await snap(page, `r3-${k}-02-french-shown`);
                    if (en) await typeRich(page, en, 'ENGLISHGUIDE', {replace: true});
                    if (fr) {
                        await typeRich(page, fr, 'FRENCHGUIDE', {replace: true}).catch((e) => { r.frTypeErr = e.message.slice(0, 120); });
                    }
                    r.save = await saveForm(page, page.locator(`[id="${en}"]`), `r3-${k}-03-save`);
                }
                // component window's Name
                await page.locator('[id="components-button"]').first().click(); await idle(page); await sleep(1200);
                const add = page.getByRole('link', {name: 'Add a Component'}).or(page.getByRole('button', {name: 'Add a Component'})).first();
                r.addPresent = await add.count();
                if (r.addPresent) {
                    await add.click(); await idle(page);
                    await page.locator('input[name^="name"]').first().waitFor({timeout: T}).catch(() => {});
                    await sleep(800);
                    r.nameInputs = await page.locator('input[name^="name"]').evaluateAll((els) => els.map((e) => ({name: e.name, visible: !!e.offsetParent})));
                    r.nameArea = await page.locator('input[name^="name"]').first().evaluate((e) => (e.closest('.pkp_controllers_form_multilingual_input') || e.closest('.section') || e.parentElement).innerText.slice(0, 300)).catch(() => null);
                    await page.locator('input[name^="name"]').first().focus().catch(() => {});
                    await sleep(500);
                    r.nameInputsFocused = await page.locator('input[name^="name"]').evaluateAll((els) => els.map((e) => ({name: e.name, visible: !!e.offsetParent})));
                    await snap(page, `r3-${k}-04-component-window`);
                }
                res[k] = r;
                await signOut(page);
            }
            // the Submissions page in each language, as a visitor
            res.pageEn = await submissionsPage(page, app, M, 'r3-05-submissions-en', {locale: 'en'});
            res.pageFr = await submissionsPage(page, app, M, 'r3-06-submissions-fr', {locale: 'fr_CA'});
            record('rule3', res);
            log('rule3', JSON.stringify({one: [res.one.localeButtons, res.one.panel.languageButtons, res.one.nameInputs], two: [res.two.localeButtons, res.two.panel.languageButtons, res.two.editors, res.two.save && res.two.save.statuses, res.two.nameInputs, res.two.nameInputsFocused, res.two.nameArea], en: /ENGLISHGUIDE/.test(res.pageEn.text || ''), fr: /FRENCHGUIDE/.test(res.pageFr.text || ''), enHas: (res.pageEn.headings || []), frHas: (res.pageFr.headings || [])}));
        }

        // ── rule4: disable submissions on S, then allow again (Rules 4–6; td1) ──
        if (on('rule4')) {
            const res = {};
            const readSections = async (name) => {
                await go(page, app, `/index.php/${S}/management/settings/context`);
                await page.locator('[id="sections-button"]').first().click().catch(() => {});
                await idle(page); await sleep(1200);
                await snap(page, name);
                return page.locator('[id="sections"]').innerText().catch(() => null);
            };
            await signIn(page, `${S}mgr`, {contextPath: S});
            res.sectionsBefore = await readSections('r4-00-sections-before');
            await openWorkflow(page, app, S, null);
            await snap(page, 'r4-01-disable-tab');
            const box = page.locator('input[name="disableSubmissions"]').first();
            res.boxBefore = await box.isChecked().catch(() => null);
            res.navBefore = await readNav(page);
            await box.check();
            res.disableSave = await saveForm(page, box, 'r4-02-disable-save');
            res.navSamePage = await readNav(page);
            res.noticeSamePage = await page.getByText(/is not accepting submissions at this time/).count();
            await snap(page, 'r4-03-same-page-after-save', {nav: res.navSamePage});
            res.dashAfter = await dashboard(page, app, S, 'r4-04-dashboard-after-disable');
            res.notices = {};
            for (const slug of ['context', 'website', 'workflow', 'distribution', 'access']) {
                await go(page, app, `/index.php/${S}/management/settings/${slug}`);
                const s = await snap(page, `r4-05-notice-${slug}`);
                res.notices[slug] = ((s.text && s.text.main) || '').split('\n').filter((l) => /not accepting|workflow settings/i.test(l));
            }
            // start screen by its address
            await go(page, app, `/index.php/${S}/submission`);
            await snap(page, 'r4-06-start-screen-manager');
            res.startMgr = {...(await classify(page)), begin: await page.getByRole('button', {name: /Begin Submission/}).count(), mainText: (await page.locator('main, .pkp_structure_main, body').first().innerText().catch(() => '')).slice(0, 400)};
            res.subsMgr = await submissionsPage(page, app, S, 'r4-07-submissions-manager');
            // Rule 6: the help's link
            await openWorkflow(page, app, S, null);
            const help = page.locator('[id="disableSubmissions"] a[href]').first();
            res.helpLink = {text: await help.innerText().catch(() => null), href: await help.getAttribute('href').catch(() => null)};
            await Promise.all([page.waitForLoadState('load').catch(() => {}), help.click().catch(() => {})]);
            await idle(page); await sleep(1500);
            await snap(page, 'r4-08-help-link-landed');
            res.helpLanded = {url: page.url(), h1: await page.locator('h1').allInnerTexts(), top: (await topTabs(page)).filter((t) => t.selected === 'true').map((t) => t.text)};
            res.sectionsAfter = await readSections('r4-09-sections-after');
            await signOut(page);
            // the author: side menu, start screen, Submissions page, the draft
            await signIn(page, `${S}au`, {contextPath: S});
            res.dashAu = await dashboard(page, app, S, 'r4-10-dashboard-author');
            await go(page, app, `/index.php/${S}/submission`);
            await snap(page, 'r4-11-start-screen-author');
            res.startAu = {...(await classify(page)), begin: await page.getByRole('button', {name: /Begin Submission/}).count()};
            res.subsAu = await submissionsPage(page, app, S, 'r4-12-submissions-author');
            // 4e: finish the draft
            const d = {};
            await go(page, app, `/index.php/${S}/submission?id=${st.draft}`);
            await sleep(1500);
            await snap(page, 'r4-13-draft-opened');
            d.opened = {...(await classify(page)), steps: await page.locator('.pkpSteps button, .pkpSteps [role="tab"]').allInnerTexts().catch(() => [])};
            if (isOps) {
                // OPS: the Files step's "Add File" is the legacy galley grid (label window, then the upload wizard)
                const W = require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
                await page.locator('.pkpSteps button').filter({hasText: 'Upload Files'}).first().click({force: true}).catch(() => {});
                await idle(page); await sleep(1000);
                d.galleysBefore = await page.locator('.submissionWizard').getByRole('link', {name: 'PDF'}).count();
                if (!d.galleysBefore) await W.addGalleyFile(page, {file: fixture(app)}).then(() => { d.uploaded = true; }).catch((e) => { d.uploadErr = e.message.slice(0, 200); });
            }
            for (let i = 0; i < 8; i++) {
                const rel = page.getByRole('radio', {name: 'This preprint has not been published elsewhere.'});
                if (await rel.isVisible().catch(() => false)) await rel.check().catch(() => {});
                const submitBtn = page.getByRole('button', {name: 'Submit', exact: true});
                if (await submitBtn.isVisible().catch(() => false)) break;
                const cont = page.getByRole('button', {name: 'Continue', exact: true});
                if (!(await cont.isVisible().catch(() => false))) break;
                await cont.click(); await idle(page); await sleep(1200);
            }
            await snap(page, 'r4-14-draft-review-step');
            const confirmBoxes = page.locator('main input[type="checkbox"]:visible:not(:checked), .submissionWizard input[type="checkbox"]:visible:not(:checked)');
            d.confirmBoxes = await confirmBoxes.count();
            for (let i = 0; i < d.confirmBoxes; i++) await confirmBoxes.first().check().catch(() => {});
            d.errorsOnReview = await page.locator('.pkpFormField__error, .submissionWizard__reviewPanel__error, [class*="error"]').filter({visible: true}).allInnerTexts().catch(() => []);
            const submitBtn = page.getByRole('button', {name: 'Submit', exact: true});
            d.submitVisible = await submitBtn.isVisible().catch(() => false);
            d.submitEnabled = await submitBtn.isEnabled().catch(() => null);
            if (d.submitVisible) {
                await submitBtn.click().catch(() => {});
                const dlg = page.getByRole('dialog').filter({hasText: /will be submitted to|Are you sure you want to submit/}).last();
                await dlg.waitFor({timeout: 15_000}).catch(() => {});
                d.dialog = (await dlg.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
                await dlg.getByRole('button', {name: 'Submit', exact: true}).click().catch((e) => { d.dlgErr = e.message.slice(0, 100); });
                await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45_000}).catch(() => {});
                await idle(page);
            }
            await snap(page, 'r4-15-draft-after-submit');
            d.after = await classify(page);
            res.draft = d;
            await signOut(page);
            // reader and visitor
            await signIn(page, `${S}rd`, {contextPath: S});
            res.subsRd = await submissionsPage(page, app, S, 'r4-16-submissions-reader');
            await signOut(page);
            res.subsOut = await submissionsPage(page, app, S, 'r4-17-submissions-visitor');
            await go(page, app, `/index.php/${S}`);
            const blk = page.locator('.block_make_submission a, a.block_make_submission_link');
            res.block = {count: await blk.count(), href: await blk.first().getAttribute('href').catch(() => null)};
            await snap(page, 'r4-18-home-visitor');
            if (res.block.count) res.blockPress = await pressAndRead(page, blk, 'r4-19-block-pressed');
            // Rule 5: allow again
            await signIn(page, `${S}mgr`, {contextPath: S});
            await openWorkflow(page, app, S, null);
            const box2 = page.locator('input[name="disableSubmissions"]').first();
            res.boxWhileDisabled = await box2.isChecked().catch(() => null);
            await box2.uncheck();
            res.enableSave = await saveForm(page, box2, 'r4-20-enable-save');
            res.navSamePage2 = await readNav(page);
            res.noticeSamePage2 = await page.getByText(/is not accepting submissions at this time/).count();
            await snap(page, 'r4-21-same-page-after-enable', {nav: res.navSamePage2});
            res.dashAfter2 = await dashboard(page, app, S, 'r4-22-dashboard-after-enable');
            await go(page, app, `/index.php/${S}/submission`);
            await snap(page, 'r4-23-start-screen-after-enable');
            res.start2 = {...(await classify(page)), begin: await page.getByRole('button', {name: /Begin Submission/}).count()};
            await go(page, app, `/index.php/${S}/management/settings/website`);
            res.websiteNotice2 = await page.getByText(/is not accepting submissions at this time/).count();
            await signOut(page);
            await signIn(page, `${S}au`, {contextPath: S});
            res.subsAu2 = await submissionsPage(page, app, S, 'r4-24-submissions-author-after-enable');
            res.dashAu2 = await dashboard(page, app, S, 'r4-25-dashboard-author-after-enable');
            await signOut(page);
            record('rule4', res);
            log('rule4', JSON.stringify({boxBefore: res.boxBefore, navBefore: res.navBefore.startNew, save: [res.disableSave.statuses, res.disableSave.requests, res.disableSave.notices], navSame: res.navSamePage.startNew, noticeSame: res.noticeSamePage, navDash: res.dashAfter.nav.startNew, notices: res.notices, startMgr: [res.startMgr.h1, res.startMgr.begin, res.startMgr.snippet], subsMgr: res.subsMgr.notice, help: res.helpLink, helpLanded: res.helpLanded, sectionsSame: res.sectionsBefore === res.sectionsAfter, dashAu: res.dashAu.nav.startNew, startAu: [res.startAu.h1, res.startAu.begin, res.startAu.snippet], subsAu: res.subsAu.notice, draft: res.draft, subsRd: res.subsRd.notice, subsOut: res.subsOut.notice, block: res.block, blockPress: res.blockPress && [res.blockPress.url, res.blockPress.h1], enable: [res.enableSave.statuses], navSame2: res.navSamePage2.startNew, noticeSame2: res.noticeSamePage2, navDash2: res.dashAfter2.nav.startNew, start2: [res.start2.h1, res.start2.begin], websiteNotice2: res.websiteNotice2, subsAu2: res.subsAu2.notice, dashAu2: res.dashAu2.nav.startNew}));
        }

        // ── block: the "Make a Submission" block while submissions are disabled (Rule 4f) ──
        if (on('block')) {
            const res = {};
            // the Sidebar list each app offers (S's manager)
            await signIn(page, `${S}mgr`, {contextPath: S});
            await go(page, app, `/index.php/${S}/management/settings/website`);
            await page.locator('[id="appearance-button"]').first().click().catch(() => {});
            await idle(page); await sleep(800);
            await page.locator('[id="appearance"] [id="setup-button"], [role="tabpanel"]:visible [id="setup-button"]').first().click().catch(() => {});
            await idle(page); await sleep(1200);
            await snap(page, 'b-01-appearance-setup');
            res.sidebarOptions = await page.locator('fieldset, .pkpFormField').filter({hasText: /^Sidebar/}).first().innerText().catch(() => null);
            await signOut(page);
            if (!isOps) {
                const b = tag('u58k1b');
                await app.api.createContext({tag: b, plugins: {makesubmissionblockplugin: {enabled: true}}, sidebar: ['makesubmissionblockplugin'],
                    users: [{username: `${b}mgr`, roles: ['manager']}]});
                res.B = b;
                await go(page, app, `/index.php/${b}`);
                const blk = page.locator('.block_make_submission a');
                res.openBlock = {count: await blk.count(), text: await blk.first().innerText().catch(() => null), href: await blk.first().getAttribute('href').catch(() => null)};
                await snap(page, 'b-02-home-open');
                await signIn(page, `${b}mgr`, {contextPath: b});
                await openWorkflow(page, app, b, null);
                await page.locator('input[name="disableSubmissions"]').first().check();
                res.save = await saveForm(page, page.locator('input[name="disableSubmissions"]').first(), 'b-03-disable-save');
                await signOut(page);
                await go(page, app, `/index.php/${b}`);
                res.closedBlock = {count: await blk.count(), text: await blk.first().innerText().catch(() => null), href: await blk.first().getAttribute('href').catch(() => null)};
                await snap(page, 'b-04-home-closed');
                if (res.closedBlock.count) {
                    res.pressed = await pressAndRead(page, blk, 'b-05-block-pressed');
                    res.pressedNotice = await page.locator('.cmp_notification').innerText().catch(() => null);
                }
            }
            record('block', res);
            log('block', JSON.stringify(res));
        }

        // ── makeS: "Make a new submission" pressed by the levels that hold no Author role, on S ──
        if (on('makeS')) {
            const res = {};
            for (const w of ['se', 'as', 'rd']) {
                const u = `${S}${w}`;
                const r = {};
                await signIn(page, u, {contextPath: S});
                await go(page, app, `/index.php/${S}/about/submissions`);
                r.viewBefore = await pressAndRead(page, page.getByRole('link', {name: 'view your pending submissions'}), `ms-${w}-01-view-before`);
                r.genresBefore = await genresApi(page, app, S, `ms-${w}-02-genres-before`);
                await go(page, app, `/index.php/${S}/about/submissions`);
                r.make = await pressAndRead(page, page.getByRole('link', {name: 'Make a new submission'}), `ms-${w}-03-make-new`);
                r.make.startForm = {begin: await page.getByRole('button', {name: /Begin Submission/}).count(), text: (await page.locator('main').innerText().catch(() => '')).slice(0, 600)};
                await go(page, app, `/index.php/${S}/about/submissions`);
                r.viewAfter = await pressAndRead(page, page.getByRole('link', {name: 'view your pending submissions'}), `ms-${w}-04-view-after`);
                r.genresAfter = await genresApi(page, app, S, `ms-${w}-05-genres-after`);
                r.dashAfter = await dashboard(page, app, S, `ms-${w}-06-dashboard-after`);
                res[w] = r;
                log('makeS', w, JSON.stringify({viewBefore: [r.viewBefore.url, r.viewBefore.deniedRole], genresBefore: r.genresBefore.status, make: [r.make.url, r.make.h1, r.make.startForm.begin], viewAfter: [r.viewAfter.url, r.viewAfter.deniedRole], genresAfter: r.genresAfter.status}));
                await signOut(page);
            }
            // the manager's view of the three accounts' roles
            await signIn(page, `${S}mgr`, {contextPath: S});
            await go(page, app, `/index.php/${S}/management/settings/access`);
            await sleep(1500);
            await snap(page, 'ms-07-users-list');
            res.usersList = (await page.locator('main').innerText().catch(() => '')).slice(0, 3000);
            await signOut(page);
            record('makeS', res);
        }

        // ── about: a journal closed to visitors (Actors row 4) ──
        if (on('about')) {
            const res = {};
            res.out = await submissionsPage(page, app, R, 'a-01-restricted-signed-out');
            res.outClass = await classify(page);
            await signIn(page, `${R}rd`, {contextPath: R});
            res.rd = await submissionsPage(page, app, R, 'a-02-restricted-reader');
            await signOut(page);
            record('about', res);
            log('about', JSON.stringify({out: [res.outClass.url, res.outClass.h1, res.outClass.loginForm], rd: [res.rd.url, res.rd.notice, res.rd.headings]}));
        }
    } finally {
        await close();
    }
});
