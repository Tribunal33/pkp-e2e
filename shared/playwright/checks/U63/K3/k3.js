// U63 claim check, chunk K3: the "Users XML Plugin" {OJS OMP}: its tabs and fields, importing (results, which
// accounts, roles, masthead and start date, passwords), the "Current Users" list and its filter, exporting users,
// moving roles between journals, the "Journal Registration" email, and the site's minimum password length.
// Spec docs/specs/U63-import-export.md: 74–85, 235–287, 364–369, 403–407, 525–550; footnotes k, l, m, td13–td15,
// f-a2–f-a4.
//
//   PROBE_FEATURE=U63 PROBE_AGENT=ccK3 node bin/probe.js ojs|omp|ops shared/playwright/checks/U63/K3/k3.js
//   PHASES=seed,ops,fields,list,import,again,logins,export,move,ended,minlen,badfiles,emails,leave (default all, in order;
//   state in k3-state-<app>.json in the output folder, delete it for a fresh seed).
//
// Scratch contexts per app {OJS OMP}: A (source journal: one manager-level account per group, the accounts the
// import matches against, 26 fillers so the list pages), B (import target). Every username carries the tag.
// OPS gets only the read-only control (the tool is absent there). `minlen` sets the site's minimum password length
// to 10 for one import and puts back 6 in a finally. No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, record, loc, note, idle, tag, outDir, screen} = require('../../../probe');
const G = require('../../U62/K1/grid');
const {T, sleep, flat, rel, snap, tabStrips} = G;

const ALL = ['seed', 'ops', 'fields', 'list', 'import', 'again', 'logins', 'export', 'move', 'ended', 'minlen', 'badfiles', 'emails', 'leave'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k3]', new Date().toISOString().slice(11, 19), ...a);
const statePath = (app) => path.join(outDir(), `k3-state-${app.name}.json`);
const sql = (app, q) => { try { return execFileSync('psql', ['-d', `${app.name}_test`, '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim(); } catch (e) { return `ERR ${flat(e.message, 200)}`; } };
const bcrypt = (pw, cost) => execFileSync('php', ['-r', `echo password_hash(${JSON.stringify(pw)}, PASSWORD_BCRYPT${cost ? `, ["cost" => ${cost}]` : ''});`]).toString().trim();
const md5 = (s) => require('crypto').createHash('md5').update(s).digest('hex');

// ---- users file builder ------------------------------------------------------------------------------------------
const NS = 'xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd"';
const grp = (role, name, abbrev) => `\t\t<user_group>\n\t\t\t<role_id>${role}</role_id>\n\t\t\t<context_id>1</context_id>\n\t\t\t<is_default>true</is_default>\n\t\t\t<permit_self_registration>false</permit_self_registration>\n\t\t\t<permit_metadata_edit>false</permit_metadata_edit>\n\t\t\t<name locale="en">${name}</name>\n\t\t\t<abbrev locale="en">${abbrev}</abbrev>\n\t\t\t<stage_assignments></stage_assignments>\n\t\t\t<masthead>false</masthead>\n\t\t</user_group>\n`;
const GROUPS = `\t<user_groups>\n${grp(1048576, 'Reader', 'Read')}\t</user_groups>\n`;
/** One <user>: pw is null (no <password>), {plain} / {empty} / {enc, hash}; roles [{ref, masthead, start}] */
function userXml({given, family, email, username, pw, roles, extra = ''}) {
    let p = '';
    if (pw && pw.plain != null) p = `\t\t\t<password is_disabled="false" must_change="false">\n\t\t\t\t<value>${pw.plain}</value>\n\t\t\t</password>\n`;
    else if (pw && pw.empty) p = `\t\t\t<password is_disabled="false" must_change="false">\n\t\t\t\t<value></value>\n\t\t\t</password>\n`;
    else if (pw && pw.enc) p = `\t\t\t<password is_disabled="false" must_change="false" encryption="${pw.enc}">\n\t\t\t\t<value>${pw.hash}</value>\n\t\t\t</password>\n`;
    const r = (roles || []).map((x) => `\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>${x.ref}</user_group_ref>\n${x.start ? `\t\t\t\t<date_start>${x.start}</date_start>\n` : ''}\t\t\t\t<masthead>${x.masthead === false ? 'false' : 'true'}</masthead>\n\t\t\t</user_user_group>\n`).join('');
    return `\t\t<user>\n\t\t\t<givenname locale="en">${given}</givenname>\n\t\t\t<familyname locale="en">${family}</familyname>\n\t\t\t<email>${email}</email>\n\t\t\t<username>${username}</username>\n${p}\t\t\t<date_registered>2020-01-02 03:04:05</date_registered>\n${extra}${r}\t\t</user>\n`;
}
const usersFile = (users, groups = GROUPS) => `<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers ${NS}>\n${groups}\t<users>\n${users.join('')}\t</users>\n</PKPUsers>\n`;

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k3-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(15_000);
    let dialogAnswer = 'dismiss';
    const browserDialogs = [];
    page.on('dialog', (d) => {
        browserDialogs.push({type: d.type(), message: flat(d.message(), 300), answer: d.type() === 'beforeunload' ? 'accept' : dialogAnswer, url: rel(page.url())});
        (d.type() === 'beforeunload' || dialogAnswer === 'accept' ? d.accept() : d.dismiss()).catch(() => {});
    });
    const as = async (user, ctx, password) => { await signIn(page, user, {contextPath: ctx, password}); await idle(page).catch(() => {}); };
    const out = async () => { await signOut(page).catch(() => {}); };
    const sect = async (name, fn) => { if (!on(name)) return; log(app.name, '== phase', name); try { await fn(); } catch (e) { log(app.name, 'phase FAILED', name, flat(e.stack, 900)); fact(`${name}-error`, flat(e.stack, 900)); await snap(page, `err-${name}`).catch(() => {}); } save(); };
    const go = async (u) => { let r = null; try { r = await page.goto(app.url(u)); } catch (e) { r = flat(e.message, 100); } await idle(page).catch(() => {}); return r; };
    const cu = (ctx, p) => `/index.php/${ctx}${p}`;
    const PLUGIN = '/management/importexport/plugin/UserImportExportPlugin';
    const SE = isOMP ? 'Series editor' : 'Section editor';
    const JM = isOMP ? 'Press manager' : 'Journal manager';
    const uid = (u) => sql(app, `select user_id from users where username = '${u}'`);
    const uug = (u, ctxPath) => sql(app, `select ug.user_group_id, (select setting_value from user_group_settings s where s.user_group_id = ug.user_group_id and s.setting_name='name' and s.locale='en'), uug.date_start, uug.date_end, uug.masthead from user_user_groups uug join user_groups ug on ug.user_group_id = uug.user_group_id join users u on u.user_id = uug.user_id where u.username = '${u}' and ug.context_id = (select ${isOMP ? 'press_id from presses' : 'journal_id from journals'} where path = '${ctxPath}') order by 1`).split('\n').filter(Boolean);

    /** The plugin page, landed and its tabs attached. */
    const openPlugin = async (ctx, name) => {
        const r = await go(cu(ctx, PLUGIN));
        await page.locator('#importExportTabs [role="tab"]').first().waitFor({timeout: 15_000}).catch(() => {});
        await page.locator('#importXmlForm').waitFor({timeout: 10_000}).catch(() => {});
        await idle(page).catch(() => {});
        const o = {status: r && typeof r.status === 'function' ? r.status() : r, url: rel(page.url()), h1: flat(await page.locator('h1').first().innerText().catch(() => null), 120), trail: flat(await page.locator('.app__breadcrumbs').first().innerText({timeout: 2000}).catch(() => null), 200), tabs: await tabStrips(page)};
        if (name) await snap(page, name, o);
        return o;
    };
    const grid = () => page.locator('#usersGridContainer .pkp_controllers_grid').first();
    /** The "Export Users" tab, its grid loaded. */
    const openExportTab = async () => {
        await page.getByRole('tab', {name: 'Export Users'}).first().click();
        await grid().locator('tr.gridRow').first().waitFor({timeout: 20_000}).catch(() => {});
        await idle(page).catch(() => {});
    };
    /** The "Current Users" grid as data. */
    const readUsersGrid = async () => {
        if (!(await grid().count())) return {found: false};
        return grid().evaluate((g) => {
            const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
            const vis = (el) => !!(el && el.offsetParent !== null && getComputedStyle(el).display !== 'none');
            const form = g.querySelector('form.filter, form#userSearchForm');
            return {
                found: true,
                gridId: g.id.replace(/-[0-9a-f]+$/, ''),
                title: txt(g.querySelector('.header h4, .header .pkp_grid_title, h4')),
                headerLinks: [...g.querySelectorAll('.header .actions a, .header a')].filter(vis).map(txt),
                cols: [...g.querySelectorAll('thead th')].filter(vis).map(txt),
                rows: [...g.querySelectorAll('tbody tr.gridRow')].filter(vis).map((tr) => ({cells: [...tr.querySelectorAll('td')].map(txt), box: (tr.querySelector('input[type=checkbox]') || {}).name || null, value: (tr.querySelector('input[type=checkbox]') || {}).value || null})),
                empty: [...g.querySelectorAll('tbody.empty, tr.empty')].filter(vis).map(txt),
                paging: txt(g.querySelector('.gridPaging, .pkp_linkActions + div, [class*="paging"]')),
                pagingLinks: [...g.querySelectorAll('.gridPaging a, [class*="paging"] a')].filter(vis).map((a) => txt(a)),
                filterVisible: form ? vis(form) : null,
                filter: form ? {
                    selects: [...form.querySelectorAll('select')].filter(vis).map((s) => ({name: s.name, selected: s.options[s.selectedIndex] && s.options[s.selectedIndex].text.trim(), options: [...s.options].map((o) => o.text.trim())})),
                    inputs: [...form.querySelectorAll('input:not([type=hidden])')].filter(vis).map((i) => ({type: i.type, name: i.name, value: i.value, placeholder: i.placeholder})),
                    labels: [...form.querySelectorAll('label, .label, legend')].filter(vis).map(txt),
                    buttons: [...form.querySelectorAll('button')].filter(vis).map(txt),
                } : null,
            };
        });
    };
    /** Upload a file into the import form and press "Import Users"; returns the outcome. */
    const importFile = async (file, label) => {
        const o = {file: file ? path.basename(file) : null};
        const before = (await tabStrips(page)).flat().length;
        const oldId = await page.locator('#importXmlForm #temporaryFileId').inputValue().catch(() => '');
        if (file) {
            await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
            await page.waitForFunction((old) => { const v = (document.querySelector('#importXmlForm #temporaryFileId') || {}).value; return v && v !== old; }, oldId, {timeout: 20_000}).catch(() => {});
        }
        o.temporaryFileId = {before: oldId, after: await page.locator('#importXmlForm #temporaryFileId').inputValue().catch(() => '')};
        o.boxAfterUpload = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 500);
        const respP = page.waitForResponse((x) => /UserImportExportPlugin\/import\?/.test(x.url()), {timeout: 90_000}).catch(() => null);
        await page.locator('#importXmlForm').getByRole('button', {name: 'Import Users'}).click();
        const resp = await respP;
        o.importStatus = resp ? resp.status() : null;
        await page.waitForFunction((n) => document.querySelectorAll('#importExportTabs [role="tab"]').length > n, before, {timeout: 20_000}).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(800);
        o.tabs = await tabStrips(page);
        o.results = flat(await page.locator('#importExportTabs .ui-tabs-panel:visible').first().innerText({timeout: 3000}).catch(() => null), 4000);
        o.resultItems = await page.locator('#importExportTabs .ui-tabs-panel:visible li').allInnerTexts().catch(() => []);
        o.resultHeading = await page.locator('#importExportTabs .ui-tabs-panel:visible h2').allInnerTexts().catch(() => []);
        if (label) await snap(page, label, o);
        return o;
    };
    /** Sign in with a password on the context's login page; never throws. */
    const tryLogin = async (username, password, ctx) => {
        await out();
        await page.goto(app.url(cu(ctx, '/en/login'))).catch(() => {});
        await page.locator('input#username').waitFor({timeout: 10_000}).catch(() => {});
        await page.locator('input#username').fill(username);
        await page.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
        await page.locator('input#password').fill(password);
        await page.locator('form#login button[type="submit"]').click();
        await page.waitForURL((u) => !u.pathname.includes('/login') || u.search.includes('error'), {timeout: 12_000, waitUntil: 'commit'}).catch(() => {});
        await page.waitForLoadState('load').catch(() => {});
        await sleep(600);
        const url = rel(page.url());
        const body = flat(await page.locator('body').innerText().catch(() => ''), 400);
        const signedIn = !/\/login(\?|\/|$)/.test(url) || /changePassword/.test(url);
        return {url, signedIn, body: body.slice(0, 300)};
    };
    /** Wait for a download started by fn; returns {name, text} or {none}. */
    const download = async (fn, ms = 20_000) => {
        const dlP = page.waitForEvent('download', {timeout: ms}).catch(() => null);
        const respP = page.waitForResponse((r) => /UserImportExportPlugin\/(export|exportAllUsers)/.test(r.url()), {timeout: ms}).catch(() => null);
        await fn();
        const [dl, resp] = await Promise.all([dlP, respP]);
        const o = {status: resp ? resp.status() : null, disposition: resp ? (resp.headers()['content-disposition'] || null) : null, method: resp ? resp.request().method() : null, posted: resp ? flat(resp.request().postData(), 300) : null};
        if (!dl) { o.none = true; o.url = rel(page.url()); o.body = flat(await page.locator('body').innerText().catch(() => ''), 400); return o; }
        o.name = dl.suggestedFilename();
        const p = path.join(outDir(), `k3-dl-${app.name}-${Date.now()}-${o.name}`);
        await dl.saveAs(p).catch(() => {});
        o.saved = path.basename(p);
        o.text = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
        // the saved copy keeps the accounts' names, groups and roles only
        if (o.text) { Object.defineProperty(o, 'raw', {value: o.text, enumerable: false}); o.text = o.text.replace(/\s*<password[^>]*>[\s\S]*?<\/password>/g, ''); fs.writeFileSync(p, o.text); }
        return o;
    };
    /** What a users file holds: each user's username and groups (ref, start, masthead). */
    const parseUsers = (xml) => {
        if (!xml) return null;
        const users = [...xml.matchAll(/<user>([\s\S]*?)<\/user>/g)].map((m) => {
            const u = m[1];
            const g = (tag) => (u.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`)) || [])[1];
            return {
                username: g('username'), email: g('email'), given: g('givenname'), family: g('familyname'),
                groups: [...u.matchAll(/<user_user_group>([\s\S]*?)<\/user_user_group>/g)].map((x) => ({ref: (x[1].match(/<user_group_ref>([^<]*)</) || [])[1], start: (x[1].match(/<date_start>([^<]*)</) || [])[1] || null, end: (x[1].match(/<date_end>([^<]*)</) || [])[1] || null, masthead: (x[1].match(/<masthead>([^<]*)</) || [])[1]})),
            };
        });
        return {userCount: users.length, groupDefs: (xml.match(/<user_group>/g) || []).length, root: (xml.match(/<(PKPUsers)[^>]*>/) || [])[1] || null, emptyUsers: /<users\s*\/>/.test(xml), users};
    };
    /** The Users & Roles list rows that carry the tag. */
    const usersList = async (ctx, label) => {
        await go(cu(ctx, '/management/settings/access'));
        await page.locator('main table tbody tr').first().waitFor({timeout: 20_000}).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(800);
        const s = label ? await snap(page, label) : null;
        const head = await page.locator('main table thead th').allInnerTexts().catch(() => []);
        const rows = await page.locator('main table tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td, th')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()))).catch(() => []);
        return {head: head.map((x) => flat(x, 60)), rows: rows.filter((r) => r.join(' ').includes(S.t)), all: rows.length, heading: flat(s && s.text && s.text.main, 200)};
    };

    try {
        // ------------------------------------------------------------ seed
        await sect('seed', async () => {
            if (S.t || isOPS) return;
            const t = tag('u63k3');
            S.t = t;
            const U = (k, roles, extra = {}) => ({username: `${t}${k}`, roles, givenName: `K3${k}`, familyName: `Fam${k}`, ...extra});
            const aUsers = [
                U('am', ['manager']), U('ae', ['editor']), U('ap', ['productionEditor']),
                U('ase', ['sectionEditor'], {givenName: 'Hidalgo', familyName: 'Quintero', masthead: {sectionEditor: false}}),
                U('asv', ['sectionEditor']),
                U('aaf', ['author'], {affiliation: 'Zyxwaff Institute'}),
                U('aem', ['reader'], {email: `${t}zq9mail@mail.test`}),
                U('acp', ['copyeditor']),
                U('ex1', ['reader']), U('ex2', ['author']), U('exs', ['reader']),
            ];
            for (let i = 1; i <= 26; i++) aUsers.push(U(`f${String(i).padStart(2, '0')}`, ['reader']));
            const mk = async (k, extra) => {
                const p = `${t}${k}`;
                const r = await app.api.createContext({tag: p, context: {name: `U63 K3 ${k.toUpperCase()} ${t}`, acronym: `K3${k.toUpperCase()}`, contactName: `K3 ${k.toUpperCase()} Contact`, contactEmail: `${t}${k}contact@mail.test`}, ...extra});
                log('seed', k, JSON.stringify(r).slice(0, 200));
                return p;
            };
            S.A = await mk('a', {users: aUsers});
            S.B = await mk('b', {users: [U('bm', ['manager']), U('be', ['editor']), U('exr', ['reader'])]});
            save();
            note(`ccK3 [${app.name}]: scratch contexts A ${S.A} (source: managers ${t}am/ae/ap, section editors ${t}ase (masthead off) and ${t}asv, matching targets ${t}ex1/ex2/exs, 26 fillers), B ${S.B} (import target: ${t}bm, ${t}be, ${t}exr) (tag ${t})`);
        });
        const t = S.t;

        // ------------------------------------------------------------ ops: the read-only control (the tool is absent on a preprint server)
        await sect('ops', async () => {
            if (!isOPS) return;
            const o = {};
            await as('manager.maya', 'publicknowledge');
            await go(cu('publicknowledge', '/management/tools'));
            await page.locator('.pkp_page_importexport_plugins li').first().waitFor({timeout: 15_000}).catch(() => {});
            o.list = await page.locator('.pkp_page_importexport_plugins li').allInnerTexts().catch(() => []);
            await snap(page, 'o-01-tools-ops', o);
            const r = await go(cu('publicknowledge', PLUGIN));
            o.address = {status: r && r.status ? r.status() : r, type: r && r.headers ? r.headers()['content-type'] : null, body: flat(await page.locator('body').innerText().catch(() => ''), 300), tabs: await tabStrips(page)};
            await snap(page, 'o-02-users-plugin-address-ops', o.address);
            await out();
            fact('ops', o);
        });
        if (isOPS) return;

        // ------------------------------------------------------------ fields: Fields table, Rule 21, the filter, per manager-level account; sweep
        await sect('fields', async () => {
            const o = {};
            for (const [who, user, ctx] of [['mgr', `${t}am`, S.A], ['editor', `${t}ae`, S.A], ['prodEditor', `${t}ap`, S.A], ['admin', 'admin', S.A]]) {
                await as(user, ctx);
                const p = await openPlugin(ctx, `f-01-import-tab-${who}`);
                const r = {page: p};
                r.importForm = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 1200);
                r.paragraph = flat(await page.locator('#importXmlForm p').first().innerText().catch(() => null), 600);
                r.sectionTitles = await page.locator('#importXmlForm legend, #importXmlForm .label, #importXmlForm label, #importXmlForm h3').allInnerTexts().catch(() => []);
                r.buttons = await page.locator('#importXmlForm button:visible, #importXmlForm a:visible').allInnerTexts().catch(() => []);
                if (who === 'mgr') {
                    await loc(page, 'Users XML Plugin: tabs', page.locator('#importExportTabs [role="tab"]'));
                    await loc(page, 'Users XML Plugin › Import Users: the file input', page.locator('#importXmlForm input[type=file]'));
                    await loc(page, 'Users XML Plugin › Import Users: "Import Users" button', page.locator('#importXmlForm').getByRole('button', {name: 'Import Users'}));
                    await loc(page, 'Users XML Plugin › Import Users: "Upload File"', page.locator('#importXmlForm').getByRole('button', {name: /Upload File/}));
                    // sweep: "Import Users" with no file up
                    const respP = page.waitForResponse((x) => /UserImportExportPlugin\/(importBounce|import)/.test(x.url()), {timeout: 8000}).catch(() => null);
                    await page.locator('#importXmlForm').getByRole('button', {name: 'Import Users'}).click();
                    const resp = await respP;
                    await idle(page).catch(() => {});
                    await sleep(1200);
                    r.noFile = {status: resp ? `${resp.status()} ${rel(resp.url()).slice(0, 120)}` : null, tabs: await tabStrips(page), visiblePanel: flat(await page.locator('#importExportTabs .ui-tabs-panel:visible').first().innerText().catch(() => null), 600), errors: await page.locator('#importXmlForm .error, #importXmlForm .pkp_form_error, #importXmlForm label.error').allInnerTexts().catch(() => [])};
                    await snap(page, 'f-02-import-no-file', r.noFile);
                    if (r.noFile.tabs.flat().some((x) => /Results/.test(x))) {
                        // a second press with no file: one more tab?
                        await page.getByRole('tab', {name: 'Import Users'}).first().click();
                        await page.locator('#importXmlForm').getByRole('button', {name: 'Import Users'}).click();
                        await idle(page).catch(() => {}); await sleep(1500);
                        r.noFile2 = {tabs: await tabStrips(page), visiblePanel: flat(await page.locator('#importExportTabs .ui-tabs-panel:visible').first().innerText().catch(() => null), 400)};
                    }
                    await openPlugin(ctx);
                }
                await openExportTab();
                r.exportTab = await readUsersGrid();
                r.exportButtons = await page.locator('#exportXmlForm button:visible').allInnerTexts().catch(() => []);
                await snap(page, `f-03-export-tab-${who}`, {grid: r.exportTab});
                // the filter
                const searchLink = grid().locator('a.pkp_linkaction_search');
                r.searchLinkCount = await searchLink.count();
                if (r.searchLinkCount) {
                    await searchLink.first().click();
                    await sleep(700);
                    r.filterShown = (await readUsersGrid());
                    r.filterShown = {filterVisible: r.filterShown.filterVisible, filter: r.filterShown.filter, headerLinks: r.filterShown.headerLinks};
                    await snap(page, `f-04-filter-shown-${who}`, r.filterShown);
                    if (who === 'mgr') {
                        await loc(page, 'Export Users: grid header "Search" link', searchLink);
                        await loc(page, 'Export Users: grid header "Export All Users" link', grid().locator('a.pkp_linkaction_exportAllUsers'));
                        await loc(page, 'Export Users: filter text box', grid().locator('form#userSearchForm input[name="search"]'));
                        await loc(page, 'Export Users: filter role list', grid().locator('form#userSearchForm select[name="userGroup"]'));
                        await loc(page, 'Export Users: filter "Search" button', grid().locator('form#userSearchForm').getByRole('button', {name: 'Search'}));
                        await loc(page, 'Export Users: a row tick box', grid().locator('input[name="selectedUsers[]"]'));
                        await loc(page, 'Export Users: the "Export Users" button', page.locator('#exportXmlForm').getByRole('button', {name: 'Export Users'}));
                        // the header "Search" pressed again: does it hide the filter?
                        await searchLink.first().click().catch(() => {});
                        await sleep(700);
                        r.searchAgain = (await readUsersGrid()).filterVisible;
                    }
                }
                o[who] = r;
                await out();
            }
            fact('fields', o);
        });

        // ------------------------------------------------------------ list: Rule 26 (every account, paging, the filter)
        await sect('list', async () => {
            const o = {};
            await as(`${t}am`, S.A);
            await openPlugin(S.A);
            await openExportTab();
            const g0 = await readUsersGrid();
            o.first = {rows: g0.rows.length, paging: g0.paging, pagingLinks: g0.pagingLinks, firstRows: g0.rows.slice(0, 3).map((r) => r.cells.join(' | '))};
            await snap(page, 'l-01-list-page1', o.first);
            o.dbCount = sql(app, `select count(distinct uug.user_id) from user_user_groups uug join user_groups ug on ug.user_group_id=uug.user_group_id where ug.context_id=(select ${isOMP ? 'press_id from presses' : 'journal_id from journals'} where path='${S.A}')`);
            // page 2
            const next = grid().locator('.gridPaging a, [class*="paging"] a').filter({hasText: /^\s*(2|>|Next|»)\s*$/}).first();
            if (await next.count()) {
                await next.click(); await idle(page).catch(() => {}); await sleep(1000);
                const g1 = await readUsersGrid();
                o.page2 = {rows: g1.rows.length, paging: g1.paging, rowsText: g1.rows.map((r) => r.cells.join(' | '))};
                await snap(page, 'l-02-list-page2', o.page2);
                await loc(page, 'Export Users: paging link', next);
            }
            // search: each end of "name, username or email", plus what else the words reach
            const doSearch = async (label, words, role) => {
                await openPlugin(S.A); await openExportTab();
                await grid().locator('a.pkp_linkaction_search').first().click();
                await sleep(500);
                const f = grid().locator('form#userSearchForm');
                await f.locator('input[name="search"]').fill(words);
                if (role) await f.locator('select[name="userGroup"]').selectOption({label: role});
                const respP = page.waitForResponse((r) => /exportable-users-grid|exportableUsers|fetchGrid|fetch-grid/i.test(r.url()), {timeout: 15_000}).catch(() => null);
                await f.getByRole('button', {name: 'Search'}).click();
                const resp = await respP;
                await idle(page).catch(() => {}); await sleep(900);
                const g = await readUsersGrid();
                const res = {words, role: role || null, status: resp ? resp.status() : null, rows: g.rows.map((r) => r.cells.slice(1).join(' | ')), empty: g.empty, paging: g.paging, filterAfter: g.filter};
                await snap(page, `l-03-search-${label}`, res);
                return res;
            };
            o.search = {};
            o.search.given = await doSearch('given', 'hidalgo');
            o.search.family = await doSearch('family', 'QUINTERO');
            o.search.twoWords = await doSearch('twowords', 'Hidalgo Quintero');
            o.search.twoWordsMixed = await doSearch('twowordsmixed', 'Hidalgo Nomatchzz');
            o.search.username = await doSearch('username', `${t}aem`);
            o.search.email = await doSearch('email', 'zq9mail');
            o.search.affiliation = await doSearch('affiliation', 'Zyxwaff');
            o.search.roleWord = await doSearch('roleword', 'Copyeditor');
            o.search.role = await doSearch('role', '', SE);
            o.search.roleAndWord = await doSearch('roleandword', 'Hidalgo', SE);
            o.search.roleAndWordMiss = await doSearch('roleandwordmiss', 'Hidalgo', 'Reader');
            o.search.none = await doSearch('none', 'nomatchzzqq');
            // the filter's role list, as offered
            o.roleOptions = (o.search.none.filterAfter || {}).selects;
            await out();
            fact('list', o);
        });

        // ------------------------------------------------------------ import: Rules 22–25, td13, td14, A2–A4 (into B)
        await sect('import', async () => {
            const o = {};
            const e = (k) => `${t}${k}@mail.test`;
            const R = (ref, extra = {}) => ({ref, ...extra});
            S.pw = {n1: 'plainpw1', n6: 'abcdef', n5: 'abcde', nabc: 'abc', nbc: 'hashpw12', nmd5: 'md5pw123', nb10: 'oldcost10', nrol: 'rolespw1', exsFile: 'otherpw12'};
            const users = [
                userXml({given: 'K3n1', family: 'New', email: e('n1'), username: `${t}n1`, pw: {plain: S.pw.n1}, roles: [R(SE, {masthead: false, start: '2020-01-01'}), R('Reader', {masthead: false, start: '2020-01-01'})]}),
                userXml({given: 'K3n6', family: 'Six', email: e('n6'), username: `${t}n6`, pw: {plain: S.pw.n6}, roles: [R('Reader')]}),
                userXml({given: 'K3n5', family: 'Five', email: e('n5'), username: `${t}n5`, pw: {plain: S.pw.n5}, roles: [R('Reader')]}),
                userXml({given: 'K3nabc', family: 'Abc', email: e('nabc'), username: `${t}nabc`, pw: {plain: S.pw.nabc}, roles: [R('Author'), R(SE, {masthead: true})]}),
                userXml({given: 'K3nemp', family: 'Empty', email: e('nemp'), username: `${t}nemp`, pw: {empty: true}, roles: [R('Reader')]}),
                userXml({given: 'K3nbc', family: 'Bcrypt', email: e('nbc'), username: `${t}nbc`, pw: {enc: 'sha1', hash: bcrypt(S.pw.nbc)}, roles: [R('Reader')]}),
                userXml({given: 'K3nmd5', family: 'Md5', email: e('nmd5'), username: `${t}nmd5`, pw: {enc: 'md5', hash: md5(S.pw.nmd5)}, roles: [R('Reader')]}),
                userXml({given: 'K3nb10', family: 'Cost10', email: e('nb10'), username: `${t}nb10`, pw: {enc: 'sha1', hash: bcrypt(S.pw.nb10, 10)}, roles: [R('Reader')]}),
                userXml({given: 'K3nrol', family: 'Roles', email: e('nrol'), username: `${t}nrol`, pw: {plain: S.pw.nrol}, roles: [R('Reader'), R('Reader'), R('reader'), R('No Such Role K3'), R(SE.toUpperCase())]}),
                userXml({given: 'Changed', family: 'Renamed', email: e('exs'), username: `${t}exs`, pw: {plain: S.pw.exsFile}, roles: [R('Author')]}),
                userXml({given: 'K3mm1', family: 'Mm', email: e('ex2'), username: `${t}ex1`, pw: {plain: 'mismatch1'}, roles: [R('Author')]}),
                userXml({given: 'K3mm2', family: 'Mm', email: e('mm2'), username: `${t}ex1`, pw: {plain: 'mismatch2'}, roles: [R('Author')]}),
                userXml({given: 'K3mm3', family: 'Mm', email: e('ex2'), username: `${t}mm3`, pw: {plain: 'mismatch3'}, roles: [R('Author')]}),
                userXml({given: 'Changed', family: 'Exr', email: e('exr'), username: `${t}exr`, pw: {plain: 'exrchanged1'}, roles: [R('Reader'), R('Author')]}),
            ];
            const file = path.join(outDir(), `k3-users-main-${app.name}.xml`);
            fs.writeFileSync(file, usersFile(users));
            o.before = {exs: sql(app, `select username, email, (select setting_value from user_settings where user_id=u.user_id and setting_name='givenName' and locale='en') from users u where username='${t}exs'`), exrB: uug(`${t}exr`, S.B)};
            await as(`${t}bm`, S.B);
            await openPlugin(S.B);
            o.main = await importFile(file, 'i-01-import-main-results');
            await loc(page, 'Users XML Plugin: the "Results" tab', page.getByRole('tab', {name: /Results/}));
            await loc(page, 'Users XML Plugin › Results: the visible panel', page.locator('#importExportTabs .ui-tabs-panel:visible'));
            // a second press on the same page: a second "Results" tab (a clean file: one new user)
            const file2 = path.join(outDir(), `k3-users-second-${app.name}.xml`);
            fs.writeFileSync(file2, usersFile([userXml({given: 'K3n2', family: 'Two', email: e('n2'), username: `${t}n2`, pw: {plain: 'secondpw1'}, roles: [R('Reader')]})]));
            await page.getByRole('tab', {name: 'Import Users'}).first().click();
            await sleep(400);
            o.importTabAfterFirst = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 400);
            o.second = await importFile(file2, 'i-02-import-second-results');
            // after a reload
            await openPlugin(S.B, 'i-03-plugin-after-reload');
            o.afterReloadTabs = await tabStrips(page);
            // what the database holds (parity) for each account
            o.db = {};
            for (const k of ['n1', 'n6', 'n5', 'nabc', 'nemp', 'nbc', 'nmd5', 'nb10', 'nrol', 'exs', 'ex1', 'ex2', 'mm3', 'exr', 'n2']) {
                const u = `${t}${k}`;
                o.db[k] = {exists: uid(u) || null, email: sql(app, `select email from users where username='${u}'`) || null, mustChange: sql(app, `select must_change_password from users where username='${u}'`) || null, given: sql(app, `select setting_value from user_settings where user_id=(select user_id from users where username='${u}') and setting_name='givenName' and locale='en'`) || null, rolesB: uug(u, S.B)};
            }
            o.db.mm2email = sql(app, `select username from users where email='${e('mm2')}'`) || null;
            o.after = {exs: sql(app, `select username, email, (select setting_value from user_settings where user_id=u.user_id and setting_name='givenName' and locale='en') from users u where username='${t}exs'`)};
            // Users & Roles › Users of B (Roles, Start Date)
            o.usersList = await usersList(S.B, 'i-04-users-list-B');
            // n1's own roles page (start date)
            const n1 = uid(`${t}n1`);
            if (n1) {
                await go(cu(S.B, `/en/management/settings/user/${n1}`));
                await sleep(1200);
                const s = await snap(page, 'i-05-n1-roles-page');
                o.n1RolesPage = flat(s.text && s.text.main, 1500);
                o.n1RoleRows = await page.locator('main table tbody tr').allInnerTexts().catch(() => []);
                o.n1MastheadSelects = await page.locator('main table tbody tr').evaluateAll((trs) => trs.map((tr) => { const s = tr.querySelector('select'); const r = tr.querySelector('input[type=radio]:checked'); return `${tr.innerText.split('\t')[0]}: ${s ? (s.options[s.selectedIndex] || {}).text : r ? (r.closest('label') || {}).innerText || r.value : '(no control)'}`; })).catch(() => []);
            }
            // nabc's roles page
            const na = uid(`${t}nabc`);
            if (na) {
                await go(cu(S.B, `/en/management/settings/user/${na}`));
                await sleep(1200);
                o.nabcRolesPage = flat((await snap(page, 'i-06-nabc-roles-page')).text.main, 1000);
            }
            // exr's roles page (Reader held already, Author added)
            const xr = uid(`${t}exr`);
            if (xr) {
                await go(cu(S.B, `/en/management/settings/user/${xr}`));
                await sleep(1200);
                o.exrRolesPage = flat((await snap(page, 'i-07-exr-roles-page')).text.main, 1000);
            }
            // B's Editorial Masthead and Editorial History
            await go(cu(S.B, '/en/about/editorialMasthead'));
            o.masthead = flat((await snap(page, 'i-08-masthead-B')).text.main || (await page.locator('body').innerText().catch(() => '')), 2000);
            o.mastheadBody = flat(await page.locator('.page_masthead, .pkp_structure_main').first().innerText().catch(() => null), 2000);
            await go(cu(S.B, '/en/about/editorialHistory'));
            o.history = flat(await page.locator('.page_masthead, .pkp_structure_main').first().innerText().catch(() => null), 2000);
            await snap(page, 'i-09-history-B');
            // the export of n1 from B (td14 control): tick n1 and press "Export Users"
            await openPlugin(S.B);
            await openExportTab();
            const row = grid().locator('tr.gridRow').filter({hasText: `${t}n1`}).first();
            await row.locator('input[type=checkbox]').check().catch(() => {});
            const dl = await download(() => page.locator('#exportXmlForm').getByRole('button', {name: 'Export Users'}).click());
            o.n1Export = {status: dl.status, disposition: dl.disposition, name: dl.name, saved: dl.saved, parsed: parseUsers(dl.text)};
            await out();
            // mail: the md5 and cost-10 accounts are the positive controls
            o.mail = {};
            for (const k of ['nmd5', 'nb10']) {
                try {
                    const m = await app.mail.find({to: e(k), timeoutMs: 20_000});
                    const full = await app.mail.fullMessage(m.ID).catch(() => ({}));
                    const text = full.Text || '';
                    const pw = (text.match(/Password:\s*(\S+)/i) || [])[1] || null;
                    o.mail[k] = {subject: m.Subject, from: (m.From || {}).Address, fromName: (m.From || {}).Name, to: (m.To || []).map((x) => x.Address), replyTo: (full.ReplyTo || []).map((x) => `${x.Name} <${x.Address}>`), text: flat(text, 600), password: pw};
                    if (pw) S.pw[`${k}Mailed`] = pw;
                } catch (err) { o.mail[k] = {error: flat(err.message, 200)}; }
            }
            for (const k of ['n1', 'n6', 'n5', 'nabc', 'nemp', 'nbc', 'nrol', 'exs', 'ex1', 'ex2', 'mm2', 'mm3', 'exr', 'bm', 'n2']) {
                o.mail[k] = await app.mail.count({to: e(k)}).catch((err) => flat(err.message, 100));
            }
            fact('import', o);
        });

        // ------------------------------------------------------------ again: "Import Users" pressed a second time on the same page, with no new file
        await sect('again', async () => {
            const o = {};
            await as(`${t}bm`, S.B);
            await openPlugin(S.B);
            const file = path.join(outDir(), `k3-users-again-${app.name}.xml`);
            fs.writeFileSync(file, usersFile([userXml({given: 'K3n3', family: 'Three', email: `${t}n3@mail.test`, username: `${t}n3`, pw: {plain: 'thirdpw12'}, roles: [{ref: 'Reader'}]})]));
            o.first = await importFile(file, 'a-01-again-first');
            await page.getByRole('tab', {name: 'Import Users'}).first().click();
            await sleep(500);
            o.importTab = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 500);
            await snap(page, 'a-02-again-import-tab', {importTab: o.importTab});
            o.second = await importFile(null, 'a-03-again-second-press');
            o.mailN3 = await app.mail.count({to: `${t}n3@mail.test`}).catch(() => null);
            o.db = uug(`${t}n3`, S.B);
            await out();
            fact('again', o);
        });

        // ------------------------------------------------------------ logins: which passwords sign in (Rule 25, td13, A4, Rule 23 second case)
        await sect('logins', async () => {
            const o = {};
            const pw = S.pw || {};
            const cases = [
                ['n1', `${t}n1`, pw.n1], ['n6', `${t}n6`, pw.n6], ['n5', `${t}n5`, pw.n5], ['nabc', `${t}nabc`, pw.nabc],
                ['nemp-x', `${t}nemp`, 'x'], ['nbc', `${t}nbc`, pw.nbc], ['nmd5-original', `${t}nmd5`, pw.nmd5], ['nmd5-mailed', `${t}nmd5`, pw.nmd5Mailed || 'none'],
                ['nb10-original', `${t}nb10`, pw.nb10], ['nb10-mailed', `${t}nb10`, pw.nb10Mailed || 'none'],
                ['exs-file', `${t}exs`, pw.exsFile], ['exs-own', `${t}exs`, `${t}exs${t}exs`], ['exr-own', `${t}exr`, `${t}exr${t}exr`],
            ];
            for (const [k, u, p] of cases) {
                o[k] = await tryLogin(u, p, S.B);
                if (/mailed|nabc|n5|n1$/.test(k) || k === 'nmd5-mailed') await snap(page, `g-${k}`, o[k]);
                await out();
            }
            fact('logins', o);
        });

        // ------------------------------------------------------------ export: Rule 27, td15 (as A's manager)
        await sect('export', async () => {
            const o = {};
            await as(`${t}am`, S.A);
            await openPlugin(S.A);
            await openExportTab();
            const g = await readUsersGrid();
            o.listPaging = g.paging;
            // "Export All Users": the question, Cancel
            await grid().locator('a.pkp_linkaction_exportAllUsers').first().click();
            const dlg = page.locator('[role="dialog"]:visible, .pkp_modal_panel:visible, [data-cy="dialog"]:visible').last();
            await dlg.waitFor({timeout: 10_000}).catch(() => {});
            await sleep(500);
            o.question = {text: flat(await dlg.innerText().catch(() => null), 400), buttons: await dlg.locator('button:visible, a:visible').allInnerTexts().catch(() => []), browserDialogs: browserDialogs.slice(-2)};
            await snap(page, 'e-01-export-all-question', o.question);
            await loc(page, 'Export All Users: the question window', dlg);
            const cancel = dlg.getByRole('button', {name: 'Cancel'}).or(dlg.getByRole('link', {name: 'Cancel'})).first();
            const dlCancelP = page.waitForEvent('download', {timeout: 4000}).then(() => true).catch(() => false);
            await cancel.click().catch((err) => { o.cancelError = flat(err.message, 200); });
            await sleep(800);
            o.cancel = {downloaded: await dlCancelP, dialogOpen: await page.locator('[role="dialog"]:visible').count(), url: rel(page.url())};
            await snap(page, 'e-02-after-cancel', o.cancel);
            // OK
            await sleep(600);
            await grid().locator('a.pkp_linkaction_exportAllUsers').first().click();
            await dlg.waitFor({timeout: 10_000}).catch(() => {});
            await sleep(500);
            const okBtn = dlg.getByRole('button', {name: /^(OK|Yes|Ok)$/}).first();
            const all = await download(() => okBtn.click());
            o.all = {status: all.status, disposition: all.disposition, name: all.name, saved: all.saved, none: all.none, body: all.body, parsed: parseUsers(all.text)};
            if (o.all.parsed) {
                const p = o.all.parsed;
                o.all.summary = {users: p.userCount, tagged: p.users.filter((u) => (u.username || '').startsWith(t)).length, admin: p.users.find((u) => u.username === 'admin'), exs: p.users.find((u) => u.username === `${t}exs`), ase: p.users.find((u) => u.username === `${t}ase`)};
                o.all.users = p.users.map((u) => `${u.username}:${u.groups.map((x) => `${x.ref}/${x.masthead}/${x.start}`).join(',')}`);
            }
            await snap(page, 'e-03-after-ok', {url: rel(page.url())});
            o.dbCount = sql(app, `select count(distinct uug.user_id) from user_user_groups uug join user_groups ug on ug.user_group_id=uug.user_group_id where ug.context_id=(select ${isOMP ? 'press_id from presses' : 'journal_id from journals'} where path='${S.A}')`);
            // ticked rows
            await openPlugin(S.A); await openExportTab();
            for (const k of ['ase', 'exs']) await grid().locator('tr.gridRow').filter({hasText: `${t}${k}`}).first().locator('input[type=checkbox]').check().catch(() => {});
            const ticked = await download(() => page.locator('#exportXmlForm').getByRole('button', {name: 'Export Users'}).click());
            o.ticked = {status: ticked.status, disposition: ticked.disposition, name: ticked.name, saved: ticked.saved, none: ticked.none, parsed: parseUsers(ticked.text)};
            await snap(page, 'e-04-after-ticked-export', {url: rel(page.url())});
            // a ticked row on page 2 plus one on page 1 (does the tick survive paging?)
            // none ticked (td15)
            await openPlugin(S.A); await openExportTab();
            const none = await download(() => page.locator('#exportXmlForm').getByRole('button', {name: 'Export Users'}).click(), 15_000);
            o.none = {status: none.status, disposition: none.disposition, name: none.name, saved: none.saved, none: none.none, body: none.body, parsed: parseUsers(none.text), raw: none.text ? flat(none.text, 600) : null};
            await snap(page, 'e-05-after-none-ticked', o.none);
            // the page after the downloads: still the plugin page?
            o.after = {url: rel(page.url()), tabs: await tabStrips(page)};
            await out();
            fact('export', o);
        });

        // ------------------------------------------------------------ move: Rule 28 and A2's export side (A's file into B)
        await sect('move', async () => {
            const o = {};
            // A's manager exports ase and exs (ticked); the unredacted text goes to a temporary file for B's import only
            await as(`${t}am`, S.A);
            await openPlugin(S.A); await openExportTab();
            for (const k of ['ase', 'exs']) await grid().locator('tr.gridRow').filter({hasText: `${t}${k}`}).first().locator('input[type=checkbox]').check().catch(() => {});
            const dl = await download(() => page.locator('#exportXmlForm').getByRole('button', {name: 'Export Users'}).click());
            if (!dl.raw) { fact('move', {skipped: 'no ticked export', dl: {status: dl.status, none: dl.none}}); return; }
            const file = path.join(outDir(), `k3-move-tmp-${app.name}.xml`);
            fs.writeFileSync(file, dl.raw);
            o.file = parseUsers(dl.text);
            await out();
            o.before = {ase: {rowA: uug(`${t}ase`, S.A), rowB: uug(`${t}ase`, S.B), hash: sql(app, `select left(password, 7) from users where username='${t}ase'`)}, exs: {rowB: uug(`${t}exs`, S.B)}};
            await as('admin', S.A);
            await go(cu(S.A, '/en/about/editorialMasthead'));
            o.mastheadA = flat(await page.locator('.page_masthead, .pkp_structure_main').first().innerText().catch(() => null), 1500);
            await snap(page, 'm-01-masthead-A');
            await as(`${t}bm`, S.B);
            await openPlugin(S.B);
            o.import = await importFile(file, 'm-02-move-import-results');
            fs.unlinkSync(file);
            o.after = {ase: {rowB: uug(`${t}ase`, S.B), given: sql(app, `select setting_value from user_settings where user_id=(select user_id from users where username='${t}ase') and setting_name='givenName' and locale='en'`), mustChange: sql(app, `select must_change_password from users where username='${t}ase'`)}, exs: {rowB: uug(`${t}exs`, S.B)}};
            o.usersList = await usersList(S.B, 'm-03-users-list-B-after-move');
            await go(cu(S.B, '/en/about/editorialMasthead'));
            o.mastheadB = flat(await page.locator('.page_masthead, .pkp_structure_main').first().innerText().catch(() => null), 2000);
            await snap(page, 'm-04-masthead-B-after-move');
            await out();
            o.aseLogin = await tryLogin(`${t}ase`, `${t}ase${t}ase`, S.B);
            await out();
            o.mail = {ase: await app.mail.count({to: `${t}ase@mail.test`}).catch(() => null)};
            fact('move', o);
        });

        // ------------------------------------------------------------ ended: A3's "Editorial History": a role the file gives as ended (start and end in the past)
        await sect('ended', async () => {
            const o = {};
            const e = (k) => `${t}${k}@mail.test`;
            const file = path.join(outDir(), `k3-users-ended-${app.name}.xml`);
            fs.writeFileSync(file, usersFile([userXml({given: 'K3hist', family: 'Ended', email: e('hist'), username: `${t}hist`, pw: {plain: 'endedpw12'}, roles: [{ref: SE, start: '2019-01-01', masthead: true}, {ref: 'Reader'}], extra: ''}).replace('<user_group_ref>' + SE + '</user_group_ref>\n\t\t\t\t<date_start>2019-01-01</date_start>', '<user_group_ref>' + SE + '</user_group_ref>\n\t\t\t\t<date_start>2019-01-01</date_start>\n\t\t\t\t<date_end>2020-12-31</date_end>')]));
            o.fileHasEnd = fs.readFileSync(file, 'utf8').includes('<date_end>2020-12-31</date_end>');
            await as(`${t}bm`, S.B);
            await openPlugin(S.B);
            o.import = await importFile(file, 'h-01-ended-import-results');
            o.db = uug(`${t}hist`, S.B);
            await go(cu(S.B, '/en/about/editorialHistory'));
            o.history = flat(await page.locator('.page_masthead, .pkp_structure_main').first().innerText().catch(() => null), 1500);
            await snap(page, 'h-02-editorial-history-B');
            await go(cu(S.B, '/en/about/editorialMasthead'));
            o.masthead = flat(await page.locator('.page_masthead, .pkp_structure_main').first().innerText().catch(() => null), 1500);
            o.usersList = await usersList(S.B, 'h-03-users-list-B');
            o.usersList = o.usersList.rows.filter((r) => r.join(' ').includes('hist'));
            await out();
            fact('ended', o);
        });

        // ------------------------------------------------------------ minlen: Settings bullet 8 (10 for one import, then 6 again)
        await sect('minlen', async () => {
            const o = {};
            const siteSettings = cu('index', '/en/admin/settings');
            const openSecurity = async () => {
                await go(siteSettings);
                await page.locator('#setup-button').first().click().catch(() => {});
                await page.locator('#security-button').first().click();
                const panel = page.locator('[role="tabpanel"]#security').first();
                await panel.getByRole('button', {name: 'Save', exact: true}).first().waitFor({timeout: T});
                await idle(page); await sleep(300);
                return panel;
            };
            const setMin = async (v) => {
                const panel = await openSecurity();
                await panel.locator('#siteSecurity-minPasswordLength-control').fill(String(v));
                const resp = page.waitForResponse((r) => /\/api\/v1\/site/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await panel.getByRole('button', {name: 'Save', exact: true}).last().click();
                const r = await resp;
                const saved = await page.locator('[role="status"]').filter({hasText: /Saved/}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
                return {status: r ? r.status() : null, saved, db: sql(app, 'select min_password_length from site')};
            };
            o.before = sql(app, 'select min_password_length from site');
            await as('admin', S.B);
            let panel = await openSecurity();
            o.securityTab = {text: flat(await panel.innerText().catch(() => null), 1200), value: await panel.locator('#siteSecurity-minPasswordLength-control').inputValue().catch(() => null), label: flat(await panel.locator('label[for="siteSecurity-minPasswordLength-control"]').innerText().catch(() => null), 120)};
            await snap(page, 'n-01-site-security', o.securityTab);
            await loc(page, 'Site Setup › Security: "Minimum password length (characters)"', panel.locator('#siteSecurity-minPasswordLength-control'));
            try {
                o.set10 = await setMin(10);
                const e = (k) => `${t}${k}@mail.test`;
                const file = path.join(outDir(), `k3-users-minlen-${app.name}.xml`);
                fs.writeFileSync(file, usersFile([
                    userXml({given: 'K3m8', family: 'Eight', email: e('m8'), username: `${t}m8`, pw: {plain: 'eightch1'}, roles: [{ref: 'Reader'}]}),
                    userXml({given: 'K3m9', family: 'Nine', email: e('m9'), username: `${t}m9`, pw: {plain: 'ninechar1'}, roles: [{ref: 'Reader'}]}),
                    userXml({given: 'K3m10', family: 'Ten', email: e('m10'), username: `${t}m10`, pw: {plain: 'tencharsp1'}, roles: [{ref: 'Reader'}]}),
                ]));
                await as(`${t}bm`, S.B);
                await openPlugin(S.B);
                o.import = await importFile(file, 'n-02-import-min10-results');
                await out();
            } finally {
                await as('admin', S.B).catch(() => {});
                o.restore = await setMin(6).catch((err) => ({error: flat(err.message, 200)}));
                if (!o.restore || o.restore.db !== '6') o.restoreDb = sql(app, 'update site set min_password_length = 6 returning min_password_length');
                panel = await openSecurity().catch(() => null);
                o.after = panel ? await panel.locator('#siteSecurity-minPasswordLength-control').inputValue().catch(() => null) : null;
                await out();
            }
            o.logins = {};
            for (const [k, p] of [['m8', 'eightch1'], ['m9', 'ninechar1'], ['m10', 'tencharsp1']]) { o.logins[k] = await tryLogin(`${t}${k}`, p, S.B); await out(); }
            o.db = Object.fromEntries(['m8', 'm9', 'm10'].map((k) => [k, uid(`${t}${k}`) || null]));
            fact('minlen', o);
        });

        // ------------------------------------------------------------ badfiles: Rule 22's "Validation errors:" branch
        await sect('badfiles', async () => {
            const o = {};
            const e = (k) => `${t}${k}@mail.test`;
            const files = {
                nopassword: usersFile([`\t\t<user>\n\t\t\t<givenname locale="en">K3bp</givenname>\n\t\t\t<familyname locale="en">Nopw</familyname>\n\t\t\t<email>${e('bp')}</email>\n\t\t\t<username>${t}bp</username>\n\t\t\t<date_registered>2020-01-02 03:04:05</date_registered>\n\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>Reader</user_group_ref>\n\t\t\t\t<masthead>true</masthead>\n\t\t\t</user_user_group>\n\t\t</user>\n`]),
                unknownelement: usersFile([userXml({given: 'K3bu', family: 'Unknown', email: e('bu'), username: `${t}bu`, pw: {plain: 'unknownpw1'}, roles: [{ref: 'Reader'}], extra: '\t\t\t<shoesize>42</shoesize>\n'})]),
                otherroot: `<?xml version="1.0" encoding="UTF-8"?>\n<articles xmlns="http://pkp.sfu.ca"><article/></articles>\n`,
                notxml: 'This is not an XML file at all.\n',
            };
            await as(`${t}bm`, S.B);
            for (const [k, xml] of Object.entries(files)) {
                const file = path.join(outDir(), `k3-users-bad-${k}-${app.name}.${k === 'notxml' ? 'txt' : 'xml'}`);
                fs.writeFileSync(file, xml);
                await openPlugin(S.B);
                o[k] = await importFile(file, `b-${k}-results`);
            }
            o.db = {bp: uid(`${t}bp`) || null, bu: uid(`${t}bu`) || null};
            await out();
            fact('badfiles', o);
        });

        // ------------------------------------------------------------ emails: the template (Side effects) as B's manager
        await sect('emails', async () => {
            const o = {};
            await as(`${t}bm`, S.B);
            await go(cu(S.B, '/management/settings/workflow'));
            const tab = page.getByRole('tab', {name: 'Emails', exact: true}).or(page.locator('#emails-button')).first();
            if (await tab.count()) { await tab.click(); await idle(page); }
            o.emailsTab = flat((await snap(page, 't-01-workflow-emails-tab')).text.main, 800);
            await go(cu(S.B, '/management/settings/manageEmails'));
            const main = page.locator('main');
            await main.locator('.listPanel__item').first().waitFor({timeout: 30_000}).catch(() => {});
            const search = main.getByRole('searchbox').or(main.locator('input[type="search"]')).first();
            await search.fill('User Created'); await search.press('Enter'); await idle(page); await sleep(800);
            o.items = await main.locator('.listPanel__item').evaluateAll((els) => els.map((x) => x.innerText.replace(/\s+/g, ' ').trim().slice(0, 300)));
            await snap(page, 't-02-manage-emails-user-created', o);
            const item = main.locator('.listPanel__item').filter({hasText: 'User Created'}).first();
            if (await item.count()) {
                const btn = item.getByRole('button', {name: /^Edit/}).first();
                if (await btn.count()) {
                    await btn.click(); await idle(page); await sleep(1500);
                    const d = page.locator('[role="dialog"]:visible').last();
                    o.edit = {text: flat(await d.innerText().catch(() => null), 1200), inputs: await d.locator('input:visible').evaluateAll((els) => els.map((x) => `${x.name || x.id}=${x.value}`)).catch(() => [])};
                    await snap(page, 't-03-user-created-template', o.edit);
                }
            }
            await out();
            fact('emails', o);
        });

        // ------------------------------------------------------------ leave: a file up but not imported, then another tab, then away
        await sect('leave', async () => {
            const o = {};
            const file = path.join(outDir(), `k3-users-leave-${app.name}.xml`);
            fs.writeFileSync(file, usersFile([userXml({given: 'K3lv', family: 'Leave', email: `${t}lv@mail.test`, username: `${t}lv`, pw: {plain: 'leavepw12'}, roles: [{ref: 'Reader'}]})]));
            await as(`${t}bm`, S.B);
            await openPlugin(S.B);
            await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
            await page.waitForFunction(() => (document.querySelector('#importXmlForm #temporaryFileId') || {}).value, null, {timeout: 20_000}).catch(() => {});
            await sleep(500);
            o.afterUpload = {box: flat(await page.locator('#importXmlForm').innerText().catch(() => null), 500), buttons: await page.locator('#importXmlForm button:visible, #importXmlForm a:visible').allInnerTexts().catch(() => [])};
            await snap(page, 'v-01-file-up', o.afterUpload);
            await loc(page, 'Users XML Plugin › Import Users: "Change File" after an upload', page.locator('#importXmlForm').getByRole('button', {name: /Change File/}));
            const n0 = browserDialogs.length;
            await page.getByRole('tab', {name: 'Export Users'}).first().click();
            await sleep(1000);
            o.tabSwitch = {dialogs: browserDialogs.slice(n0), tabs: await tabStrips(page)};
            await page.getByRole('tab', {name: 'Import Users'}).first().click();
            await sleep(700);
            o.back = {box: flat(await page.locator('#importXmlForm').innerText().catch(() => null), 500), tempId: await page.locator('#importXmlForm #temporaryFileId').inputValue().catch(() => null)};
            await snap(page, 'v-02-back-on-import', o.back);
            await page.locator('#importXmlForm').click({position: {x: 5, y: 5}}).catch(() => {});
            const n1 = browserDialogs.length;
            await go(cu(S.B, '/management/settings/access'));
            o.leave = {dialogs: browserDialogs.slice(n1), url: rel(page.url())};
            await openPlugin(S.B);
            o.returned = {box: flat(await page.locator('#importXmlForm').innerText().catch(() => null), 400), tabs: await tabStrips(page)};
            await snap(page, 'v-03-returned', o.returned);
            o.db = uid(`${t}lv`) || null;
            await out();
            fact('leave', o);
        });
    } finally {
        record('k3-dialogs', {browserDialogs});
        await close();
    }
});
