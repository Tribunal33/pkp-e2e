// U63 I01, the Users XML Plugin rows {OJS OMP}: 3 (the "Export Users" grid and roles not yet begun), 22 (a <user>
// without <date_registered>), 23 (username/email mismatch: the PHP warning). Scratch context U per app and run.
const fs = require('fs');
const {signIn, signOut, idle, tag, outFile, note} = require('../../../probe');
const {T, sleep, flat, rel, openTool, importFile, toolTabs, panelText} = require('./lib');

const FUTURE = '2027-06-01';
const ACR = {ojs: 'OJS', omp: 'OMP', ops: 'OPS'};
const NS = 'xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd"';
const GROUPS = '\t<user_groups>\n\t\t<user_group>\n\t\t\t<role_id>1048576</role_id>\n\t\t\t<context_id>1</context_id>\n\t\t\t<is_default>true</is_default>\n\t\t\t<permit_self_registration>false</permit_self_registration>\n\t\t\t<permit_metadata_edit>false</permit_metadata_edit>\n\t\t\t<name locale="en">Reader</name>\n\t\t\t<abbrev locale="en">Read</abbrev>\n\t\t\t<stage_assignments></stage_assignments>\n\t\t\t<masthead>false</masthead>\n\t\t</user_group>\n\t</user_groups>\n';
/** One <user>; `dateRegistered: false` leaves the element out (optional in pkp-users.xsd). */
function userXml({given, family, email, username, password, roles, dateRegistered = '2020-01-02 03:04:05'}) {
    const r = roles.map((x) => `\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>${x.ref}</user_group_ref>\n${x.start ? `\t\t\t\t<date_start>${x.start} 00:00:00</date_start>\n` : ''}${x.end ? `\t\t\t\t<date_end>${x.end} 00:00:00</date_end>\n` : ''}\t\t\t\t<masthead>true</masthead>\n\t\t\t</user_user_group>\n`).join('');
    return `\t\t<user>\n\t\t\t<givenname locale="en">${given}</givenname>\n\t\t\t<familyname locale="en">${family}</familyname>\n\t\t\t<email>${email}</email>\n\t\t\t<username>${username}</username>\n\t\t\t<password is_disabled="false" must_change="false">\n\t\t\t\t<value>${password}</value>\n\t\t\t</password>\n${dateRegistered ? `\t\t\t<date_registered>${dateRegistered}</date_registered>\n` : ''}${r}\t\t</user>\n`;
}
const usersFile = (users) => `<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers ${NS}>\n${GROUPS}\t<users>\n${users.join('')}\t</users>\n</PKPUsers>\n`;

async function seedU(c) {
    const {app, S, save, fact} = c;
    if (S.U) return S.U;
    const t = tag(`u63i01${c.RUN}`);
    const U = (k, roles, extra = {}) => ({username: `${t}${k}`, roles, givenName: `I01${k}`, familyName: `Fam${k}`, ...extra});
    await app.api.createContext({tag: t, context: {name: `U63 I01 users ${t}`, acronym: 'I01', contactName: 'I01 Contact', contactEmail: `${t}contact@mail.test`, country: 'CA'},
        users: [U('m', ['manager']), U('b', ['sectionEditor']), U('c', [], {pastRoles: [{role: 'sectionEditor', dateStart: '2020-01-01', dateEnd: '2021-06-30'}]}), U('ex', ['reader'])]});
    S.U = {path: t, t};
    save();
    fact('seedU', S.U);
    note(`scratch users context ${t} (manager ${t}m; b current Section/Series editor, c ended 2020-01-01–2021-06-30, ex Reader).`);
    return S.U;
}

const usersOf = (c, like) => c.q(`select u.username || ' reg=' || coalesce(to_char(u.date_registered,'YYYY-MM-DD'),'null') || ' [' || coalesce(string_agg((select setting_value from user_group_settings s where s.user_group_id = uug.user_group_id and s.setting_name='name' and s.locale='en') || ' ' || coalesce(to_char(uug.date_start,'YYYY-MM-DD'),'-') || '..' || coalesce(to_char(uug.date_end,'YYYY-MM-DD'),'-'), ', '), '') || ']' from users u left join user_user_groups uug on uug.user_id = u.user_id where u.username like '${like}%' group by u.username, u.date_registered order by u.username`);

async function openUsersTool(c) {
    await openTool(c, c.S.U.path, 'Users XML Plugin');
    await c.page.locator('#importXmlForm').waitFor({timeout: T});
    await idle(c.page).catch(() => {});
}

// ---------------------------------------------------------------------------------------------------------- row 22
async function row22(c) {
    const {S, fact, snap, page, app} = c;
    const t = S.U.t;
    const o = {};
    await signIn(page, `${t}m`, {contextPath: S.U.path});
    const pw = (k) => `${t}${k}pw1234`;
    const mk = (k, dr) => userXml({given: `I01${k}`, family: `Fam${k}`, email: `${t}${k}@mail.test`, username: `${t}${k}`, password: pw(k), roles: [{ref: 'Reader'}], dateRegistered: dr});
    // The file: complete, without <date_registered>, complete.
    const f1 = outFile('i01-r22-nodate.xml');
    fs.writeFileSync(f1, usersFile([mk('d1a', undefined), mk('d1n', false), mk('d1b', undefined)]));
    await openUsersTool(c);
    await snap('r22-01-users-tool');
    o.withoutDate = await importFile(c, f1, 'Import Users');
    o.withoutDate.snap = (await snap('r22-02-results-without-date')).label;
    o.withoutDate.accounts = usersOf(c, `${t}d1`);
    // Control: the same three users, each with <date_registered>.
    const f2 = outFile('i01-r22-control.xml');
    fs.writeFileSync(f2, usersFile([mk('d2a', undefined), mk('d2n', '2020-01-02 03:04:05'), mk('d2b', undefined)]));
    await openUsersTool(c);
    o.control = await importFile(c, f2, 'Import Users');
    o.control.snap = (await snap('r22-03-results-control')).label;
    o.control.accounts = usersOf(c, `${t}d2`);
    // The Users list (Settings › Users & Roles), searched for the file's users: what the manager finds afterwards.
    o.usersList = await usersListSearch(c, `${t}d1`, 'r22-04-users-list-d1');
    fact(`r22-${app.name}`, o);
    await signOut(page).catch(() => {});
}

// ---------------------------------------------------------------------------------------------------------- row 23
async function row23(c) {
    const {S, fact, snap, page, app} = c;
    const t = S.U.t;
    const o = {};
    await signIn(page, `${t}m`, {contextPath: S.U.path});
    const cases = {
        // username of the existing account "ex", another email
        usernameTaken: userXml({given: 'I01mx', family: 'Fammx', email: `${t}mx@mail.test`, username: `${t}ex`, password: `${t}mxpw1234`, roles: [{ref: 'Reader'}]}),
        // the existing account's email, a free username
        emailTaken: userXml({given: 'I01my', family: 'Fammy', email: `${t}ex@mail.test`, username: `${t}my`, password: `${t}mypw1234`, roles: [{ref: 'Reader'}]}),
        // both belong to the existing account (the role list's second case): the clean control
        sameAccount: userXml({given: 'I01ex', family: 'Famex', email: `${t}ex@mail.test`, username: `${t}ex`, password: `${t}expw1234`, roles: [{ref: 'Reader'}]}),
    };
    for (const [k, xml] of Object.entries(cases)) {
        const f = outFile(`i01-r23-${k}.xml`);
        fs.writeFileSync(f, usersFile([xml]));
        await openUsersTool(c);
        o[k] = await importFile(c, f, 'Import Users');
        o[k].snap = (await snap(`r23-${k}-results`)).label;
        o[k].lines = await page.locator('#importExportTabs > [role="tabpanel"]:visible li').allInnerTexts().catch(() => []);
    }
    o.accounts = usersOf(c, `${t}m`).concat(usersOf(c, `${t}ex`));
    fact(`r23-${app.name}`, o);
    await signOut(page).catch(() => {});
}

// ---------------------------------------------------------------------------------------------------------- row 3
/** The legacy "Current Users" grid as rows of cells (every page, by the grid's own page links). */
async function readExportGrid(page) {
    const grid = page.locator('#usersGridContainer .pkp_controllers_grid').first();
    await grid.locator('tr.gridRow, tbody.empty').first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    const one = () => grid.evaluate((g) => {
        const vis = (el) => !!(el && el.offsetParent !== null);
        return {
            title: (g.querySelector('.header h4') || {}).textContent?.replace(/\s+/g, ' ').trim(),
            cols: [...g.querySelectorAll('thead th')].map((th) => th.textContent.replace(/\s+/g, ' ').trim()),
            rows: [...g.querySelectorAll('tr.gridRow')].filter(vis).map((tr) => [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim()).join(' | ')),
            empty: [...g.querySelectorAll('tbody.empty')].filter(vis).map((e) => e.innerText.trim()),
            paging: (g.querySelector('.gridPaging') || {}).innerText?.replace(/\s+/g, ' ').trim(),
        };
    });
    return one();
}

/** Settings › Users & Roles › "Users": search box, Enter; the rows holding `term`. */
async function usersListSearch(c, term, name) {
    const {page} = c;
    await c.go(c.cu(c.S.U.path, '/en/management/settings/access'));
    const table = page.getByRole('table', {name: /Current Users/});
    await table.locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
    const search = page.locator('main').getByRole('searchbox').first();
    if (await search.count()) { await search.fill(term); await search.press('Enter'); await idle(page).catch(() => {}); await sleep(1200); }
    const s = await c.snap(name);
    const rows = await table.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
    const heading = flat(await page.getByRole('heading', {name: /Current Users/}).first().innerText().catch(() => null), 100);
    return {heading, rows, snap: s.label};
}

async function row3(c) {
    const {S, save, fact, snap, page, app} = c;
    const t = S.U.t;
    const SE = {ojs: 'Section editor', omp: 'Series editor'}[app.name];
    const o = {};
    // the import: aimp (the role starts on FUTURE, its only role), d (2020-01-01 – 2030-12-31: current, ends later)
    if (!S.r3imported) {
        await signIn(page, `${t}m`, {contextPath: S.U.path});
        const f = outFile('i01-r3-users.xml');
        fs.writeFileSync(f, usersFile([
            userXml({given: 'I01aimp', family: 'Famaimp', email: `${t}aimp@mail.test`, username: `${t}aimp`, password: `${t}aimppw1234`, roles: [{ref: SE, start: FUTURE}]}),
            userXml({given: 'I01d', family: 'Famd', email: `${t}d@mail.test`, username: `${t}d`, password: `${t}dpw1234`, roles: [{ref: SE, start: '2020-01-01', end: '2030-12-31'}]}),
        ]));
        await openUsersTool(c);
        o.import = await importFile(c, f, 'Import Users');
        o.import.snap = (await snap('r3-01-import-results')).label;
        S.r3imported = true; save();
        await signOut(page).catch(() => {});
    }
    // the invitation: a new account (ainv) whose only role is the section editor's from FUTURE
    if (!S.r3invited) {
        o.invite = await inviteNew(c, `${t}ainv`, SE);
        S.r3invited = true; save();
    }
    o.db = usersOf(c, t);
    // the reads, as the manager
    await signIn(page, `${t}m`, {contextPath: S.U.path});
    await openUsersTool(c);
    await page.getByRole('tab', {name: 'Export Users'}).first().click();
    const grid = page.locator('#usersGridContainer .pkp_controllers_grid').first();
    await grid.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
    o.grid = await readExportGrid(page);
    o.gridSnap = (await snap('r3-02-export-users-grid')).label;
    // "Search" (header) › text: aimp's name › "Search"
    const searchFor = async (text, name) => {
        const form = grid.locator('form#userSearchForm');
        if (!(await form.isVisible().catch(() => false))) { await grid.locator('a.pkp_linkaction_search').click(); await form.waitFor({state: 'visible', timeout: T}).catch(() => {}); }
        await form.locator('input[name="search"]').fill(text);
        const w = page.waitForResponse((r) => /fetch-grid|fetchGrid/.test(r.url()), {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Search', exact: true}).click();
        await w; await idle(page).catch(() => {}); await sleep(500);
        const g = await readExportGrid(page);
        return {...g, snap: (await snap(name)).label};
    };
    o.searchAimp = await searchFor('I01aimp', 'r3-03-search-aimp');
    o.searchAinv = await searchFor('I01ainv', 'r3-04-search-ainv');
    o.searchD = await searchFor('I01d', 'r3-05-search-d');
    // "Export All Users" › "OK": the file
    await openUsersTool(c);
    await page.getByRole('tab', {name: 'Export Users'}).first().click();
    await grid.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    const confirm = page.getByRole('dialog', {name: 'Confirm'});
    for (let i = 0; i < 5 && !(await confirm.isVisible().catch(() => false)); i++) { await grid.locator('a.pkp_linkaction_exportAllUsers').click().catch(() => {}); await sleep(1200); }
    o.confirmText = flat(await confirm.innerText().catch(() => null), 200);
    const dl = page.waitForEvent('download', {timeout: 60_000}).catch(() => null);
    await confirm.getByRole('button', {name: 'OK', exact: true}).click().catch((e) => { o.okError = flat(e.message, 150); });
    const d = await dl;
    if (d) {
        const f = outFile('i01-r3-export-all.xml');
        await d.saveAs(f);
        const xml = fs.readFileSync(f, 'utf8');
        const users = [...xml.matchAll(/<user>([\s\S]*?)<\/user>/g)].map((m) => m[1]);
        const mine = users.filter((u) => u.includes(t)).map((u) => ({username: (u.match(/<username>([^<]*)</) || [])[1], roles: [...u.matchAll(/<user_user_group>([\s\S]*?)<\/user_user_group>/g)].map((m) => flat(m[1].replace(/<\/?[a-z_]+>/g, ' '), 120))}));
        o.exportAll = {file: d.suggestedFilename(), users: users.length, mine};
    } else o.exportAll = 'no download';
    // the other end: Settings › Users & Roles › "Users" for the same accounts
    o.usersList = await usersListSearch(c, t, 'r3-06-users-roles-list');
    fact(`r3-${app.name}`, o);
    await signOut(page).catch(() => {});
}

/** "Invite to a role" for a new email, the role from FUTURE; accepted from the email's link (the U53 I30 newinv drive). */
async function inviteNew(c, username, SE) {
    const {app, S, page, snap} = c;
    const o = {};
    const to = `${username}@mail.test`;
    await signIn(page, `${S.U.t}m`, {contextPath: S.U.path});
    await c.go(c.cu(S.U.path, '/en/management/settings/access'));
    await page.getByRole('button', {name: 'Invite to a role'}).click();
    await page.getByRole('heading', {name: /Search User/}).waitFor({timeout: T});
    await page.getByLabel(/Search for a user by email address/).fill(to);
    await page.getByRole('button', {name: 'Search User', exact: true}).click();
    await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
    await idle(page).catch(() => {});
    await page.getByLabel(/^Given Name/).first().fill('I01ainv');
    await page.getByLabel(/^Family Name/).first().fill('Famainv').catch(() => {});
    const row = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
    await row.getByLabel(/^Select a new role/).selectOption({label: SE});
    await row.getByRole('textbox').fill(FUTURE);
    await row.getByRole('combobox').last().selectOption({label: 'Appear on the masthead'}).catch(() => {});
    o.details = (await snap('r3-inv-01-details')).label;
    await page.getByRole('button', {name: 'Save And Continue'}).click();
    await page.getByLabel(/^Subject/).waitFor({timeout: T});
    await idle(page).catch(() => {}); await sleep(800);
    await page.getByRole('button', {name: 'Invite user to the role'}).click();
    await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T}).catch(() => {});
    o.sent = flat((await snap('r3-inv-02-sent')).text?.dialog, 300);
    await signOut(page).catch(() => {});
    const m = await app.mail.find({to, timeoutMs: 30_000});
    const full = await app.mail.fullMessage(m.ID);
    const link = (((full.HTML || '').match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i) || [])[1] || '').replace(/&amp;/g, '&');
    await page.goto(link);
    await page.getByRole('heading', {name: new RegExp(`Create ${ACR[app.name]} account`)}).waitFor({timeout: T});
    await idle(page).catch(() => {}); await sleep(1500);
    for (let i = 0; i < 3; i++) {
        await page.getByLabel(/^Username/).fill(username);
        await page.getByLabel(/^Password/).fill(`${username}${username}`);
        if ((await page.getByLabel(/^Username/).inputValue()) === username) break;
        await sleep(1000);
    }
    await page.getByRole('checkbox').check();
    await page.getByRole('button', {name: 'Save and continue'}).click();
    await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
    await idle(page).catch(() => {});
    if (!(await page.getByLabel(/^Given Name/).first().inputValue().catch(() => ''))) await page.getByLabel(/^Given Name/).first().fill('I01ainv');
    await page.getByLabel(/^Country/).selectOption('CA');
    await page.getByRole('button', {name: 'Save and continue'}).click();
    await page.getByRole('heading', {name: /Review & create account/}).waitFor({timeout: T});
    await idle(page).catch(() => {});
    o.review = flat((await snap('r3-inv-03-review')).text?.main, 600);
    await page.getByRole('button', {name: new RegExp(`Accept And Continue to ${ACR[app.name]}`)}).click();
    await page.getByRole('dialog').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    o.accepted = flat((await snap('r3-inv-04-accepted')).text?.dialog, 300);
    await signOut(page).catch(() => {});
    return o;
}

// ---------------------------------------------------------------------------------------------------------- sweep
/** The Users XML page left with a file up and not imported: another tab and back, then the page left. */
async function leaveUnsaved(c, dialogs) {
    const {S, page, snap, fact, app} = c;
    const o = {};
    await signIn(page, `${S.U.t}m`, {contextPath: S.U.path});
    await openUsersTool(c);
    const f = outFile('i01-leave.xml');
    fs.writeFileSync(f, usersFile([userXml({given: 'I01lv', family: 'Famlv', email: `${S.U.t}lv@mail.test`, username: `${S.U.t}lv`, password: `${S.U.t}lvpw1234`, roles: [{ref: 'Reader'}]})]));
    const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
    await page.locator('#importXmlForm input[type=file]').first().setInputFiles(f);
    await up; await idle(page).catch(() => {});
    o.boxAfterUpload = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 5000).slice(-220);
    const n0 = dialogs.length;
    await page.getByRole('tab', {name: 'Export Users'}).first().click(); await idle(page).catch(() => {}); await sleep(500);
    await page.getByRole('tab', {name: 'Import Users'}).first().click(); await idle(page).catch(() => {}); await sleep(500);
    o.boxAfterTabs = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 5000).slice(-220);
    o.tabDialogs = dialogs.slice(n0);
    const n1 = dialogs.length;
    await c.go(c.cu(S.U.path, '/en/management/tools'));
    o.leaveDialogs = dialogs.slice(n1);
    await openUsersTool(c);
    o.boxOnReturn = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 5000).slice(-220);
    o.snap = (await snap('sw-users-return')).label;
    o.account = c.q(`select username from users where username='${S.U.t}lv'`);
    fact(`sweep-leave-${app.name}`, o);
    await signOut(page).catch(() => {});
}

module.exports = {seedU, row3, row22, row23, leaveUnsaved, userXml, usersFile};
