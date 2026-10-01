// U63 claim check, chunk S01 (2026-10-01): the Users XML Plugin {OJS OMP} after pkp/pkp-lib#13414 (issue #13412,
// lib/pkp 2e377d27fc): role dates read strictly (an invalid date or a start not before the end reported and that role
// skipped, an empty date treated as missing, a missing start meaning the import day unless the role has already
// ended), re-import detected by an overlap check of the same role, and three new results lines.
// Spec docs/specs/U63-import-export.md (2026-10-01 numbering): Rules 22–28 (297–408), scenarios 5 and 6 (809–913),
// register A13, A15–A18, A21, A22; footnotes k, l, m, td14, td15, f-a17, f-a18, f-a21, f-a22.
// The kept K3 script (shared/playwright/checks/U63/K3/k3.js) covers the rest of the chunk's rules (list, import,
// again, logins, export, move, ended, reviewer, dates, badfiles, pw12, fields, leave, ops) and is run beside this one.
//
//   PROBE_FEATURE=U63 PROBE_AGENT=ccS01 PROBE_RUN=r1 node bin/probe.js ojs|omp|all shared/playwright/checks/U63/S01/s01.js
//   PHASES=seed,s5,s6,dates,again,reads,a21,a22 (default all, in order; OPS is skipped: the tool is absent there,
//   K3's `ops` phase is its control). State: s01-state-<PROBE_RUN>-<app>.json in the output folder (RESEED=1 starts
//   over). Every run seeds its own scratch contexts (tag prefix u63s01<run>), so r1 and r2 run at once.
// Scratch contexts per app and run: C (scenario 5: manager, the Author "kiwi"), A and B (scenario 6: one manager in
// both, A holding moss (Copyeditor) and fern (Author)), D (the role dates: manager m, b current Section/Series
// editor, c ended 2020-01-01–2021-06-30, ex Reader, hold current Section/Series editor, past ended 2020-01-01–2021-06-30;
// `a21` and `a22` reuse I01's row22 and row3 on D). Reads: the screens (snapshots), the database (psql SELECT) and the
// probe server's log beside them. No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outFile, sql} = require('../../../probe');
const {T, REPO, RUN, sleep, flat, rel, openTool, importFile, toolTabs, panelText} = require('../I01/lib');
const I01 = require('../I01/users');

const ALL = ['seed', 's5', 's6', 'dates', 'again', 'reads', 'a21', 'a22'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const md5 = (s) => require('crypto').createHash('md5').update(s).digest('hex');

// ---- users file builder: a role's start/end is left out when undefined, written empty when '' --------------------
const NS = 'xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd"';
const GROUPS = '\t<user_groups>\n\t\t<user_group>\n\t\t\t<role_id>1048576</role_id>\n\t\t\t<context_id>1</context_id>\n\t\t\t<is_default>true</is_default>\n\t\t\t<permit_self_registration>false</permit_self_registration>\n\t\t\t<permit_metadata_edit>false</permit_metadata_edit>\n\t\t\t<name locale="en">Reader</name>\n\t\t\t<abbrev locale="en">Read</abbrev>\n\t\t\t<stage_assignments></stage_assignments>\n\t\t\t<masthead>false</masthead>\n\t\t</user_group>\n\t</user_groups>\n';
function userXml({given, family, email, username, pw = {plain: `${username}pw12`}, roles = []}) {
    const p = pw.enc
        ? `\t\t\t<password is_disabled="false" must_change="false" encryption="${pw.enc}">\n\t\t\t\t<value>${pw.hash}</value>\n\t\t\t</password>\n`
        : `\t\t\t<password is_disabled="false" must_change="false">\n\t\t\t\t<value>${pw.plain}</value>\n\t\t\t</password>\n`;
    const r = roles.map((x) => `\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>${x.ref}</user_group_ref>\n${x.start !== undefined ? `\t\t\t\t<date_start>${x.start}</date_start>\n` : ''}${x.end !== undefined ? `\t\t\t\t<date_end>${x.end}</date_end>\n` : ''}\t\t\t\t<masthead>${x.masthead === false ? 'false' : 'true'}</masthead>\n\t\t\t</user_user_group>\n`).join('');
    return `\t\t<user>\n\t\t\t<givenname locale="en">${given}</givenname>\n\t\t\t<familyname locale="en">${family}</familyname>\n\t\t\t<email>${email}</email>\n\t\t\t<username>${username}</username>\n${p}\t\t\t<date_registered>2020-01-02 03:04:05</date_registered>\n${r}\t\t</user>\n`;
}
const usersFile = (users) => `<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers ${NS}>\n${GROUPS}\t<users>\n${users.join('')}\t</users>\n</PKPUsers>\n`;
const parseUsers = (xml) => {
    if (!xml) return null;
    return [...xml.matchAll(/<user>([\s\S]*?)<\/user>/g)].map((m) => {
        const u = m[1];
        const g = (t) => (u.match(new RegExp(`<${t}[^>]*>([^<]*)</${t}>`)) || [])[1];
        return {username: g('username'), email: g('email'),
            roles: [...u.matchAll(/<user_user_group>([\s\S]*?)<\/user_user_group>/g)].map((x) => `${(x[1].match(/<user_group_ref>([^<]*)</) || [])[1]} ${(x[1].match(/<date_start>([^<]*)</) || [])[1] || '-'}..${(x[1].match(/<date_end>([^<]*)</) || [])[1] || '-'} m=${(x[1].match(/<masthead>([^<]*)</) || [])[1]}`)};
    });
};

function makeCtx(app, page) {
    const statePath = outFile('s01-state.json');
    const S = fs.existsSync(statePath) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const T0 = Date.now();
    const log = (...a) => console.log(`[u63s01 ${RUN} ${app.name} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const fact = (k, v) => { record('s01-facts', {[k]: v}, {merge: true}); log(k, flat(JSON.stringify(v), 2500)); };
    let n = 0;
    const snap = async (name, extra = {}) => {
        const label = `s01-${String(++n).padStart(3, '0')}-${name}`;
        const s = await screen(page).catch((e) => ({url: page.url(), screenError: flat(e.message, 300)}));
        record(label, {...s, ...extra});
        await shot(page, label).catch(() => {});
        return {...s, label};
    };
    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-probe.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from, re = /PHP |Fatal|Exception|\[5\d\d\]/) => {
        try { return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n').filter((l) => re.test(l)).map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 25); } catch (e) { return [`(no log: ${flat(e.message, 100)})`]; }
    };
    const q = (s) => { try { return sql(app, s).split('\n').filter(Boolean); } catch (e) { return [`sql error: ${flat(e.message, 300)}`]; } };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const go = async (u) => { let st = null; try { const r = await page.goto(u); st = r && r.status(); } catch (e) { st = flat(e.message, 120); } await idle(page).catch(() => {}); return st; };
    return {app, page, S, save, log, fact, snap, logSize, logSince, q, cu, go, RUN};
}

const CT = {ojs: {table: 'journals', id: 'journal_id'}, omp: {table: 'presses', id: 'press_id'}};
/** username → its role rows in context `ctx`: "Group start..end masthead". */
const rolesIn = (c, username, ctx) => c.q(`select (select setting_value from user_group_settings s where s.user_group_id=uug.user_group_id and s.setting_name='name' and s.locale='en') || ' ' || coalesce(to_char(uug.date_start,'YYYY-MM-DD HH24:MI:SS'),'-') || '..' || coalesce(to_char(uug.date_end,'YYYY-MM-DD HH24:MI:SS'),'-') || ' m=' || coalesce(uug.masthead::text,'null') from user_user_groups uug join user_groups ug on ug.user_group_id=uug.user_group_id where uug.user_id=(select user_id from users where username='${username}') and ug.context_id=(select ${CT[c.app.name].id} from ${CT[c.app.name].table} where path='${ctx}') order by uug.user_group_id, uug.date_start nulls first`);
const account = (c, username) => c.q(`select user_id || ' ' || email || ' mustChange=' || coalesce(must_change_password::text,'null') || ' disabled=' || disabled from users where username='${username}'`)[0] || null;

/** The Users XML Plugin's page through the side menu "Tools"; returns the page's snapshot label. */
async function openUsersTool(c, ctx, name) {
    await openTool(c, ctx, 'Users XML Plugin');
    await c.page.locator('#importXmlForm').waitFor({timeout: T});
    await idle(c.page).catch(() => {});
    return name ? (await c.snap(name)).label : null;
}
/** importFile plus the results' heading and lines, and a snapshot. */
async function importUsers(c, file, name) {
    const r = await importFile(c, file, 'Import Users');
    const panel = c.page.locator('#importExportTabs > [role="tabpanel"]:visible').first();
    r.lines = await panel.locator('li').allInnerTexts().catch(() => []);
    r.snap = (await c.snap(name)).label;
    return r;
}
/** Settings › Users & Roles › "Users", searched for `term` (Enter): heading and the rows. */
async function usersList(c, ctx, term, name) {
    const {page} = c;
    await c.go(c.cu(ctx, '/en/management/settings/access'));
    const table = page.getByRole('table', {name: /Current Users/});
    await table.locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
    if (term) {
        const search = page.locator('main').getByRole('searchbox').first();
        if (await search.count()) { await search.fill(term); await search.press('Enter'); await idle(page).catch(() => {}); await sleep(1200); }
    }
    const s = await c.snap(name);
    const head = await table.locator('thead th').allInnerTexts().catch(() => []);
    const rows = await table.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll('td, th')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()).join(' | '))).catch(() => []);
    const heading = flat(await page.getByRole('heading', {name: /Current Users/}).first().innerText().catch(() => null), 100);
    return {heading, head: head.map((h) => flat(h, 40)), rows, snap: s.label};
}
/** A user's roles page ("Edit" on the users list row), by its address. */
async function rolesPage(c, ctx, username, name) {
    const id = (c.q(`select user_id from users where username='${username}'`)[0] || '').trim();
    if (!id) return {none: true};
    await c.go(c.cu(ctx, `/en/management/settings/user/${id}`));
    await c.page.locator('main table tbody tr').first().waitFor({timeout: T}).catch(() => {});
    await sleep(800);
    const s = await c.snap(name);
    const rows = await c.page.locator('main table tbody tr').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
    return {rows, snap: s.label};
}
/** A sign-in through the context's login form in a fresh browser; where it lands. */
async function tryLogin(app, ctx, username, password) {
    const {page, close} = await launch(app);
    try {
        await page.goto(app.url(`/index.php/${ctx}/en/login`));
        await page.locator('input#username').fill(username);
        const pw = page.locator('input#password');
        await pw.evaluate((el) => el.removeAttribute('maxlength')).catch(() => {});
        await pw.fill(password);
        await Promise.all([page.waitForNavigation({timeout: 20_000}).catch(() => {}), page.locator('form#login button[type="submit"]').click()]);
        await idle(page).catch(() => {});
        await sleep(500);
        const url = rel(page.url());
        const err = flat(await page.locator('.pkp_form_error, [role="alert"]').first().innerText({timeout: 1000}).catch(() => null), 200);
        return {url, signedIn: !/\/login(\/signIn)?$|\/login\?/.test(url) && !err, error: err};
    } finally { await close(); }
}
/** Download from a press; `none` when no file comes; passwords stripped from the saved copy. */
async function download(c, fn, label, ms = 20_000) {
    const {page} = c;
    const dlP = page.waitForEvent('download', {timeout: ms}).catch(() => null);
    const respP = page.waitForResponse((r) => /UserImportExportPlugin\/(export|exportAllUsers)/.test(r.url()), {timeout: ms}).catch(() => null);
    await fn();
    const [dl, resp] = await Promise.all([dlP, respP]);
    const o = {status: resp ? resp.status() : null, disposition: resp ? (resp.headers()['content-disposition'] || null) : null};
    if (!dl) { o.none = true; o.url = rel(page.url()); return o; }
    o.name = dl.suggestedFilename();
    const p = outFile(`s01-dl-${label}.xml`);
    await dl.saveAs(p).catch(() => {});
    const raw = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    Object.defineProperty(o, 'raw', {value: raw, enumerable: false});
    fs.writeFileSync(p, raw.replace(/\s*<password[^>]*>[\s\S]*?<\/password>/g, ''));
    o.saved = path.basename(p);
    o.users = parseUsers(raw);
    return o;
}

forEachApp(async (app) => {
    if (app.name === 'ops') return;
    const isOMP = app.name === 'omp';
    const SE = isOMP ? 'Series editor' : 'Section editor';
    const MGR = isOMP ? 'Press manager' : 'Journal manager';
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push({type: d.type(), message: flat(d.message(), 200), url: rel(page.url())}); (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {}); });
    const c = makeCtx(app, page);
    const {S, save, fact, snap, q} = c;
    const sect = async (name, fn) => {
        if (!on(name)) return;
        c.log('== phase', name);
        try { await fn(); } catch (e) { c.log('phase FAILED', name, flat(e.stack, 900)); fact(`${name}-error`, flat(e.stack, 900)); await snap(`err-${name}`).catch(() => {}); }
        await signOut(page).catch(() => {});
        save();
    };
    const mailCount = async (to) => app.mail.count({to}).catch((e) => `err ${flat(e.message, 80)}`);
    try {
        // ------------------------------------------------------------------------------------------------ seed
        await sect('seed', async () => {
            if (S.t) return;
            const t = tag(`u63s01${RUN}`);
            const U = (k, roles, extra = {}) => ({username: `${t}${k}`, roles, givenName: `S01${k}`, familyName: `Fam${k}`, ...extra});
            const contact = (k, name) => ({name: `U63 S01 ${name} ${t}`, acronym: `S1${k}`, contactName: `S01 ${k} Contact`, contactEmail: `${t}${k}contact@mail.test`, country: 'CA'});
            // C: scenario 5
            await app.api.createContext({tag: `${t}c`, context: contact('c', 'C'), users: [U('m5', ['manager']), U('kiwi', ['author'])]});
            // A and B: scenario 6, one manager in both (as the suite's S6 seeds them: A, then B at once)
            await app.api.createContext({tag: `${t}a`, context: contact('a', 'A'), users: [U('mg', ['manager']), U('moss', ['copyeditor']), U('fern', ['author'])]});
            await app.api.createContext({tag: `${t}b`, context: contact('b', 'B'), users: [{username: `${t}mg`, roles: ['manager']}]});
            // D: the role dates
            await app.api.createContext({tag: `${t}d`, context: contact('d', 'D'), users: [U('m', ['manager']), U('b', ['sectionEditor']),
                U('c', [], {pastRoles: [{role: 'sectionEditor', dateStart: '2020-01-01', dateEnd: '2021-06-30'}]}), U('ex', ['reader']),
                U('hold', ['sectionEditor']), U('past', [], {pastRoles: [{role: 'sectionEditor', dateStart: '2020-01-01', dateEnd: '2021-06-30'}]})]});
            Object.assign(S, {t, C: `${t}c`, A: `${t}a`, B: `${t}b`, D: `${t}d`, U: {path: `${t}d`, t}});
            save();
            // every account of A's list, the manager and kiwi sign in once through the login form (scenario 6's given)
            for (const [u, ctx] of [[`${t}moss`, S.A], [`${t}fern`, S.A], [`${t}mg`, S.A], [`${t}kiwi`, S.C], [`${t}m5`, S.C], [`${t}m`, S.D]]) {
                await signIn(page, u, {contextPath: ctx}); await idle(page).catch(() => {}); await signOut(page).catch(() => {});
            }
            const o = {t, contexts: {A: S.A, B: S.B, C: S.C, D: S.D},
                mgA: rolesIn(c, `${t}mg`, S.A), mgB: rolesIn(c, `${t}mg`, S.B), adminA: rolesIn(c, 'admin', S.A), adminB: rolesIn(c, 'admin', S.B),
                holdD: rolesIn(c, `${t}hold`, S.D), pastD: rolesIn(c, `${t}past`, S.D), hashes: q(`select username || ' ' || substr(password,1,7) from users where username like '${t}%' order by 1`)};
            fact('seed', o);
            note(`ccS01 [${app.name}] ${RUN}: scratch contexts C ${S.C} (manager ${t}m5, Author ${t}kiwi), A ${S.A} and B ${S.B} (manager ${t}mg in both; A: ${t}moss Copyeditor, ${t}fern Author), D ${S.D} (manager ${t}m; ${t}hold current ${SE}, ${t}past ${SE} 2020-01-01–2021-06-30).`);
        });
        const t = S.t;
        const e = (k) => `${t}${k}@mail.test`;

        // ------------------------------------------------------------------------------------------------ s5: scenario 5
        await sect('s5', async () => {
            const o = {};
            await signIn(page, `${t}m5`, {contextPath: S.C});
            o.page = await openUsersTool(c, S.C, 's5-01-users-tool');
            o.tabs = await toolTabs(page);
            o.importTab = await panelText(page, 1200);
            const f1 = outFile('s01-s5-first.xml');
            fs.writeFileSync(f1, usersFile([userXml({given: 'Nova', family: 'Star', email: e('nova'), username: `${t}nova`, pw: {plain: 'novapass1'}, roles: [{ref: 'Copyeditor'}, {ref: 'Reader'}, {ref: 'Quokka Wrangler'}]})]));
            o.first = await importUsers(c, f1, 's5-02-first-results');
            await page.getByRole('tab', {name: 'Import Users'}).first().click(); await sleep(500);
            o.boxAfterFirst = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 2000).slice(-120);
            await loc(page, 'Users XML Plugin › Import Users: "Change File" after an import', page.locator('#importXmlForm').getByRole('button', {name: /Change File/}));
            o.nova = {list: await usersList(c, S.C, `${t}nova`, 's5-03-users-list-nova'), db: rolesIn(c, `${t}nova`, S.C)};
            o.novaLogin = await tryLogin(app, S.C, `${t}nova`, 'novapass1');
            // the second file: wren (an md5 password), kiwi with another email, tui
            await openUsersTool(c, S.C);
            const f2 = outFile('s01-s5-second.xml');
            fs.writeFileSync(f2, usersFile([
                userXml({given: 'Wren', family: 'Bird', email: e('wren'), username: `${t}wren`, pw: {enc: 'md5', hash: md5('wrenpass1')}, roles: [{ref: 'Reader'}]}),
                userXml({given: 'Kiwi', family: 'Other', email: `${t}kiwi.other@mail.test`, username: `${t}kiwi`, pw: {plain: 'kiwipass12'}, roles: [{ref: 'Reader'}]}),
                userXml({given: 'Tui', family: 'Bird', email: e('tui'), username: `${t}tui`, pw: {plain: 'tuipass12'}, roles: [{ref: 'Reader'}]}),
            ]));
            o.second = await importUsers(c, f2, 's5-04-second-results');
            // sweep: "Close" on the Results tab
            const closeLink = page.locator('#importExportTabs > ul > li').filter({hasText: 'Results'}).last().getByText('Close');
            o.closeCount = await closeLink.count();
            if (o.closeCount) { await closeLink.first().click().catch((err) => { o.closeError = flat(err.message, 100); }); await sleep(600); }
            o.tabsAfterClose = await toolTabs(page);
            o.afterCloseSnap = (await snap('s5-05-after-results-close')).label;
            o.accounts = {wren: [account(c, `${t}wren`), ...rolesIn(c, `${t}wren`, S.C)], tui: [account(c, `${t}tui`), ...rolesIn(c, `${t}tui`, S.C)],
                kiwi: [account(c, `${t}kiwi`), ...rolesIn(c, `${t}kiwi`, S.C)], kiwiOther: q(`select username from users where email='${t}kiwi.other@mail.test'`)};
            o.list = await usersList(c, S.C, t, 's5-06-users-list-all');
            await signOut(page).catch(() => {});
            // the email to wren
            try {
                const m = await app.mail.find({to: e('wren'), timeoutMs: 20_000});
                const full = await app.mail.fullMessage(m.ID);
                const pw = ((full.Text || '').match(/Password:\s*(\S+)/) || [])[1] || null;
                o.wrenMail = {subject: m.Subject, from: (full.From || {}).Address, replyTo: (full.ReplyTo || []).map((x) => x.Address), hasPassword: !!pw};
                o.wrenOriginalLogin = await tryLogin(app, S.C, `${t}wren`, 'wrenpass1');
                if (pw) o.wrenMailedLogin = await tryLogin(app, S.C, `${t}wren`, pw);
            } catch (err) { o.wrenMail = {none: flat(err.message, 150)}; }
            o.control = {};
            for (const k of ['nova', 'tui', 'kiwi', 'm5']) o.control[k] = await mailCount(e(k));
            o.control['kiwi.other'] = await mailCount(`${t}kiwi.other@mail.test`);
            fact('s5', o);
        });

        // ------------------------------------------------------------------------------------------------ s6: scenario 6
        await sect('s6', async () => {
            const o = {};
            o.before = {mgA: rolesIn(c, `${t}mg`, S.A), mgB: rolesIn(c, `${t}mg`, S.B), adminB: rolesIn(c, 'admin', S.B)};
            await signIn(page, `${t}mg`, {contextPath: S.A});
            await openUsersTool(c, S.A);
            await page.getByRole('tab', {name: 'Export Users'}).first().click();
            const grid = page.locator('#usersGridContainer .pkp_controllers_grid').first();
            await grid.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            const readGrid = () => grid.evaluate((g) => {
                const vis = (el) => !!(el && el.offsetParent !== null);
                return {title: (g.querySelector('.header h4') || {}).textContent?.replace(/\s+/g, ' ').trim(),
                    headerLinks: [...g.querySelectorAll('.header a')].filter(vis).map((a) => a.textContent.replace(/\s+/g, ' ').trim()),
                    cols: [...g.querySelectorAll('thead th')].map((th) => th.textContent.replace(/\s+/g, ' ').trim()),
                    rows: [...g.querySelectorAll('tr.gridRow')].filter(vis).map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim()).join(' | ')),
                    empty: [...g.querySelectorAll('tbody.empty')].filter(vis).map((x) => x.innerText.trim()),
                    filterShown: vis(g.querySelector('form#userSearchForm'))};
            });
            o.exportTab = {...(await readGrid()), exportButton: await page.locator('#exportXmlForm').getByRole('button', {name: 'Export Users'}).count(), snap: (await snap('s6-01-export-users-tab')).label};
            const form = grid.locator('form#userSearchForm');
            const toggle = async () => { await grid.locator('a.pkp_linkaction_search').first().click(); await sleep(600); };
            const search = async (text, role, name) => {
                if (!(await form.isVisible().catch(() => false))) await toggle();
                if (text !== null) await form.locator('input[name="search"]').fill(text);
                if (role) await form.locator('select[name="userGroup"]').selectOption({label: role});
                const w = page.waitForResponse((r) => /fetch-grid|fetchGrid/.test(r.url()), {timeout: T}).catch(() => null);
                await form.getByRole('button', {name: 'Search', exact: true}).click();
                await w; await idle(page).catch(() => {}); await sleep(600);
                return {...(await readGrid()), snap: (await snap(name)).label};
            };
            await toggle();
            o.filterOpen = {shown: await form.isVisible().catch(() => false), roleList: flat(await form.locator('select[name="userGroup"] option:checked').innerText().catch(() => null), 40),
                options: await form.locator('select[name="userGroup"] option').allInnerTexts().catch(() => []), snap: (await snap('s6-02-filter-open')).label};
            o.searchMoss = await search(`${t}moss`, null, 's6-03-search-moss');
            o.searchAuthor = await search('', 'Author', 's6-04-search-author');
            o.searchAll = await search('', 'All Roles', 's6-05-search-all-roles');
            if (!(await form.isVisible().catch(() => false))) await toggle();
            const shownBefore = await form.isVisible().catch(() => false);
            await toggle();
            o.toggle = {shownBefore, shownAfter: await form.isVisible().catch(() => false)};
            // ticked: moss
            await grid.locator('tr.gridRow').filter({hasText: `${t}moss`}).first().locator('input[type=checkbox]').check();
            o.ticked = await download(c, () => page.locator('#exportXmlForm').getByRole('button', {name: 'Export Users'}).click(), 'ticked-moss');
            await sleep(2500);
            // Export All Users: Cancel, then OK
            await openUsersTool(c, S.A);
            await page.getByRole('tab', {name: 'Export Users'}).first().click();
            await grid.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            const confirm = page.getByRole('dialog', {name: 'Confirm'});
            for (let i = 0; i < 5 && !(await confirm.isVisible().catch(() => false)); i++) { await grid.locator('a.pkp_linkaction_exportAllUsers').click().catch(() => {}); await sleep(1200); }
            o.confirm = {text: flat(await confirm.innerText().catch(() => null), 200), snap: (await snap('s6-06-confirm')).label};
            const cancelDl = page.waitForEvent('download', {timeout: 4000}).then(() => true).catch(() => false);
            await confirm.getByRole('button', {name: 'Cancel', exact: true}).click();
            o.cancel = {downloaded: await cancelDl, open: await confirm.isVisible().catch(() => false)};
            await sleep(1500);
            for (let i = 0; i < 5 && !(await confirm.isVisible().catch(() => false)); i++) { await grid.locator('a.pkp_linkaction_exportAllUsers').click().catch(() => {}); await sleep(1200); }
            const all = await download(c, () => confirm.getByRole('button', {name: 'OK', exact: true}).click(), 'export-all-A');
            o.all = all;
            o.listRows = (await readGrid()).rows;
            const allFile = outFile('s01-s6-all-from-A.tmp.xml');
            fs.writeFileSync(allFile, all.raw || '');
            // B's import
            await openUsersTool(c, S.B);
            const from = c.logSize();
            o.importB = await importUsers(c, allFile, 's6-07-import-into-B');
            o.importB.php = c.logSince(from);
            fs.unlinkSync(allFile);
            o.after = {mgB: rolesIn(c, `${t}mg`, S.B), adminB: rolesIn(c, 'admin', S.B), mossB: rolesIn(c, `${t}moss`, S.B), fernB: rolesIn(c, `${t}fern`, S.B),
                accounts: q(`select username || ' mustChange=' || coalesce(must_change_password::text,'null') from users where username like '${t}%' order by 1`)};
            o.listB = await usersList(c, S.B, null, 's6-08-users-list-B');
            o.mgRolesB = await rolesPage(c, S.B, `${t}mg`, 's6-09-mg-roles-page-B');
            await signOut(page).catch(() => {});
            o.mossLogin = await tryLogin(app, S.B, `${t}moss`, `${t}moss${t}moss`);
            o.control = {moss: await mailCount(e('moss')), fern: await mailCount(e('fern')), mg: await mailCount(e('mg'))};
            fact('s6', o);
        });

        // ------------------------------------------------------------------------------------------------ dates: the new date rules
        const D = S.D;
        const files = {
            // invalid dates: the axis "a word / a date that rolls over / a relative word"; after1 follows them
            invalid: () => usersFile([
                userXml({given: 'S01inv1', family: 'Soon', email: e('inv1'), username: `${t}inv1`, roles: [{ref: SE, start: 'soon'}]}),
                userXml({given: 'S01inv2', family: 'Feb30', email: e('inv2'), username: `${t}inv2`, roles: [{ref: 'Reader'}, {ref: SE, start: '2026-01-01', end: '2027-02-30'}]}),
                userXml({given: 'S01inv3', family: 'Tomorrow', email: e('inv3'), username: `${t}inv3`, roles: [{ref: 'Reader', start: 'tomorrow'}]}),
                userXml({given: 'S01aft1', family: 'After', email: e('aft1'), username: `${t}aft1`, roles: [{ref: 'Reader'}]}),
            ]),
            // the period: equal, reversed, an end only (past and future), both elements empty
            period: () => usersFile([
                userXml({given: 'S01per1', family: 'Equal', email: e('per1'), username: `${t}per1`, roles: [{ref: 'Reader'}, {ref: SE, start: '2025-01-01', end: '2025-01-01'}]}),
                userXml({given: 'S01per2', family: 'Reversed', email: e('per2'), username: `${t}per2`, roles: [{ref: 'Reader'}, {ref: SE, start: '2026-01-01', end: '2025-01-01'}]}),
                userXml({given: 'S01per3', family: 'EndPast', email: e('per3'), username: `${t}per3`, roles: [{ref: 'Reader'}, {ref: SE, end: '2020-06-30'}]}),
                userXml({given: 'S01per4', family: 'EndFuture', email: e('per4'), username: `${t}per4`, roles: [{ref: SE, end: '2030-12-31'}]}),
                userXml({given: 'S01per5', family: 'BothEmpty', email: e('per5'), username: `${t}per5`, roles: [{ref: 'Reader', start: '', end: ''}]}),
            ]),
            // existing accounts: the same role in an overlapping period, a period before, the identical period
            overlap: () => {
                const pastRow = (rolesIn(c, `${t}past`, D)[0] || '').match(/(\S+ \S+)\.\.(\S+ \S+)/) || [];
                return usersFile([
                    userXml({given: 'S01hold', family: 'Famhold', email: e('hold'), username: `${t}hold`, roles: [{ref: SE, start: '2020-01-01'}, {ref: SE, start: '2015-01-01', end: '2016-01-01'}]}),
                    userXml({given: 'S01past', family: 'Fampast', email: e('past'), username: `${t}past`, roles: [{ref: SE, start: '2021-01-01'}, {ref: SE, start: pastRow[1] || '2020-01-01 00:00:00', end: pastRow[2] || '2021-06-30 00:00:00'}]}),
                ]);
            },
        };
        await sect('dates', async () => {
            const o = {};
            await signIn(page, `${t}m`, {contextPath: D});
            for (const k of Object.keys(files)) {
                const f = outFile(`s01-dates-${k}.xml`);
                if (k === 'overlap') o.overlapBefore = {hold: rolesIn(c, `${t}hold`, D), past: rolesIn(c, `${t}past`, D)};
                fs.writeFileSync(f, files[k]());
                await openUsersTool(c, D);
                const from = c.logSize();
                o[k] = await importUsers(c, f, `dates-${k}-results`);
                o[k].php = c.logSince(from);
            }
            o.db = {};
            for (const k of ['inv1', 'inv2', 'inv3', 'aft1', 'per1', 'per2', 'per3', 'per4', 'per5', 'hold', 'past']) o.db[k] = [account(c, `${t}${k}`), ...rolesIn(c, `${t}${k}`, D)];
            fact('dates', o);
        });

        // ------------------------------------------------------------------------------------------------ again: the period file pressed again, then uploaded again
        await sect('again', async () => {
            const o = {};
            await signIn(page, `${t}m`, {contextPath: D});
            await openUsersTool(c, D);
            const f = outFile('s01-dates-period.xml');
            o.first = await importUsers(c, f, 'again-01-period-upload');
            await page.getByRole('tab', {name: 'Import Users'}).first().click(); await sleep(500);
            const answered = page.waitForResponse((r) => /\/import\?/.test(r.url()), {timeout: 60_000}).catch(() => null);
            const n0 = (await toolTabs(page)).length;
            await page.locator('#importXmlForm').getByRole('button', {name: 'Import Users', exact: true}).click();
            const r = await answered;
            for (let i = 0; i < 30 && (await toolTabs(page)).length === n0; i++) await sleep(300);
            await idle(page).catch(() => {}); await sleep(800);
            o.secondPress = {status: r ? r.status() : null, tabs: await toolTabs(page), text: await panelText(page, 1500),
                lines: await page.locator('#importExportTabs > [role="tabpanel"]:visible li').allInnerTexts().catch(() => []), snap: (await snap('again-02-period-second-press')).label};
            o.db = {};
            for (const k of ['per1', 'per2', 'per3', 'per4', 'per5']) o.db[k] = rolesIn(c, `${t}${k}`, D);
            // the overlap file again: the identical period, and the line again?
            await openUsersTool(c, D);
            o.overlapAgain = await importUsers(c, outFile('s01-dates-overlap.xml'), 'again-03-overlap-again');
            o.db.hold = rolesIn(c, `${t}hold`, D);
            o.db.past = rolesIn(c, `${t}past`, D);
            fact('again', o);
        });

        // ------------------------------------------------------------------------------------------------ reads: what the screens show for those roles
        await sect('reads', async () => {
            const o = {};
            await signIn(page, `${t}m`, {contextPath: D});
            o.list = await usersList(c, D, t, 'reads-01-users-list-D');
            for (const k of ['per3', 'per4', 'hold', 'past', 'inv2']) o[`roles-${k}`] = await rolesPage(c, D, `${t}${k}`, `reads-roles-${k}`);
            await c.go(c.cu(D, '/en/about/editorialHistory'));
            o.history = flat((await snap('reads-02-editorial-history-D')).text?.main, 1500);
            await c.go(c.cu(D, '/en/about/editorialMasthead'));
            o.masthead = flat((await snap('reads-03-editorial-masthead-D')).text?.main, 1500);
            // the Export Users list of D: which of these accounts it offers
            await openUsersTool(c, D);
            await page.getByRole('tab', {name: 'Export Users'}).first().click();
            const grid = page.locator('#usersGridContainer .pkp_controllers_grid').first();
            await grid.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await idle(page).catch(() => {});
            o.exportList = {rows: await grid.locator('tr.gridRow:visible').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim())).catch(() => []),
                paging: flat(await grid.locator('.gridPaging').innerText().catch(() => null), 120), snap: (await snap('reads-04-export-users-D')).label};
            await signOut(page).catch(() => {});
            // the account whose only role was refused: does it sign in?
            o.inv1Login = await tryLogin(app, D, `${t}inv1`, `${t}inv1pw12`);
            o.inv3Login = await tryLogin(app, D, `${t}inv3`, `${t}inv3pw12`);
            o.mail = {};
            for (const k of ['inv1', 'inv2', 'inv3', 'aft1', 'per1', 'per2', 'per3', 'per4', 'per5', 'hold', 'past']) o.mail[k] = await mailCount(e(k));
            fact('reads', o);
        });

        // ------------------------------------------------------------------------------------------------ a21, a22: I01's rows 22 and 3 on D
        await sect('a21', async () => { await I01.row22(c); });
        await sect('a22', async () => { await I01.row3(c); });
    } finally {
        record('s01-dialogs', {dialogs});
        await close();
    }
});
