// Helpers for Tools › Import/Export › "Users XML Plugin" {OJS OMP} on a dataset fleet: the users files the
// issue reports' Steps give in full, the tool's "Import Users" upload and press, and Settings › Users & Roles ›
// "Users" searched. Shared by this folder's walk.js and the sibling A21 walk. Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {screen, shot, record, idle, sql, outFile} = require('../../../probe');

const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

// ------------------------------------------------------------------------------------------------ the files
// 3.5's format requires <show_title> in a group, which main's refuses (the one difference of the Steps' files).
const groups = (line) => `  <user_groups>
    <user_group>
      <role_id>1048576</role_id>
      <context_id>1</context_id>
      <is_default>true</is_default>
${line === 'stable-3_5_0' ? '      <show_title>true</show_title>\n' : ''}      <permit_self_registration>true</permit_self_registration>
      <permit_metadata_edit>false</permit_metadata_edit>
      <name locale="en">Reader</name>
      <abbrev locale="en">Read</abbrev>
      <stage_assignments></stage_assignments>
      <masthead>false</masthead>
    </user_group>
  </user_groups>
`;
/** One <user>. `password: false` leaves <password> out, `dateRegistered: false` leaves <date_registered> out,
 *  `extra` is inserted after <username>. */
function userXml(u, {password = true, dateRegistered = true, extra = ''} = {}) {
    return `    <user>
      <givenname locale="en">${u.given}</givenname>
      <familyname locale="en">${u.family}</familyname>
      <email>${u.username}@mailinator.com</email>
      <username>${u.username}</username>
${extra}${password ? `      <password must_change="true">
        <value>${u.username}${u.username}</value>
      </password>
` : ''}${dateRegistered ? '      <date_registered>2026-01-15 10:00:00</date_registered>\n' : ''}      <user_user_group>
        <user_group_ref>Reader</user_group_ref>
        <masthead>false</masthead>
      </user_user_group>
    </user>
`;
}
const usersFile = (line, users) => `<?xml version="1.0" encoding="UTF-8"?>
<PKPUsers xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd">
${groups(line)}  <users>
${users.join('')}  </users>
</PKPUsers>
`;
const P = (username, given, family) => ({username, given, family});
/** The report's files on a line (main unless `line` is 'stable-3_5_0'), by name: their text exactly as the Steps give it. */
const files = (line) => ({
    'u63ir4-good.xml': usersFile(line, [userXml(P('u63ir4g', 'Grace', 'Good'))]),
    'u63ir4-nopassword.xml': usersFile(line, [userXml(P('u63ir4p', 'Paula', 'Nopass'), {password: false})]),
    'u63ir4-unknown.xml': usersFile(line, [userXml(P('u63ir4u', 'Uma', 'Unknown'), {extra: '      <nickname>Umi</nickname>\n'})]),
    // dbarnes's username with another address: the line "The username … do not match …" (the neighbour check)
    'u63ir4-mismatch.xml': usersFile(line, [userXml(P('dbarnes', 'Daniel', 'Barnes')).replace('dbarnes@mailinator.com', 'u63ir4m@mailinator.com')]),
    'u63ir4-notusers.txt': 'username,email\nu63ir4t,u63ir4t@mailinator.com\n',
    'u63ir4-nodate.xml': usersFile(line, [
        userXml(P('u63ir4a', 'Anna', 'First')),
        userXml(P('u63ir4b', 'Ben', 'Nodate'), {dateRegistered: false}),
        userXml(P('u63ir4c', 'Cleo', 'Third')),
    ]),
});
/** Write a file of `files(app.line)` into the run folder; returns its path. */
function writeFile(app, name) {
    const f = outFile(name);
    fs.writeFileSync(f, files(app.line)[name]);
    return f;
}

// ------------------------------------------------------------------------------------------------ the server log
/** The dataset fleet's server log: its size now, and its PHP error lines since a size. */
function serverLog(app) {
    const file = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const size = () => { try { return fs.statSync(file).size; } catch { return 0; } };
    const since = (from) => {
        try {
            return fs.readFileSync(file).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP (Fatal|Warning|Notice|Deprecated)|Uncaught/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 12);
        } catch (e) { return [`(no log: ${flat(e.message, 100)})`]; }
    };
    return {file, size, since};
}

// ------------------------------------------------------------------------------------------------ the screens
const toolTabs = (page) => page.locator('#importExportTabs > ul > li').evaluateAll((ls) => ls.map((l) => `${l.textContent.replace(/\s+/g, ' ').trim()}${l.getAttribute('aria-selected') === 'true' ? '*' : ''}`)).catch(() => []);
const panelText = async (page) => flat(await page.locator('#importExportTabs > [role="tabpanel"]:visible').first().innerText().catch(() => null), 3000);

/** Step 2: the left menu's "Tools", then "Users XML Plugin" on "Import/Export". */
async function openUsersTool(app, page) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/submissions`));
    await idle(page).catch(() => {});
    const tools = page.getByRole('navigation', {name: 'Site Navigation'}).getByRole('link', {name: 'Tools', exact: true});
    await Promise.all([page.waitForURL(/management\/tools/, {timeout: T}), tools.first().click()]);
    await idle(page).catch(() => {});
    const link = page.getByRole('link', {name: 'Users XML Plugin', exact: true}).first();
    await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
    await page.locator('#importXmlForm').waitFor({timeout: T});
    await idle(page).catch(() => {});
    await sleep(400);
}

/** Steps 3-4: upload a file into "File" on "Import Users" and press "Import Users"; returns what shows. */
async function importUsers(app, page, file) {
    const log = serverLog(app);
    const idBox = page.locator('#importXmlForm #temporaryFileId');
    const before = (await idBox.count()) ? await idBox.inputValue().catch(() => '') : '';
    const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
    await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
    const u = await up;
    await page.waitForFunction((old) => { const v = (document.querySelector('#importXmlForm #temporaryFileId') || {}).value; return v && v !== old; }, before, {timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    const box = flat(await page.locator('#importXmlForm').innerText().catch(() => null), 300);
    const tabsBefore = (await toolTabs(page)).length;
    const from = log.size();
    const answered = page.waitForResponse((r) => /UserImportExportPlugin\/import\?/.test(r.url()) && r.request().method() === 'GET', {timeout: 120_000}).catch(() => null);
    await page.locator('#importXmlForm').getByRole('button', {name: 'Import Users', exact: true}).click();
    const r = await answered;
    for (let i = 0; i < 40 && (await toolTabs(page)).length === tabsBefore; i++) await sleep(300);
    await idle(page).catch(() => {});
    let text = '';
    for (let i = 0; i < 12; i++) { text = await panelText(page); if (text && text.length > 5) break; await sleep(500); }
    const items = await page.locator('#importExportTabs > [role="tabpanel"]:visible li').allInnerTexts().catch(() => []);
    return {
        upload: u ? u.status() : null,
        box,
        request: r ? `${r.status()} ${rel(r.url()).replace(/temporaryFileId=\d+/, 'temporaryFileId=…').replace(/csrfToken=[^&]+/, 'csrfToken=…').slice(0, 160)}` : 'none',
        status: r ? r.status() : null,
        tabs: await toolTabs(page),
        results: text,
        items: items.map((x) => flat(x, 300)),
        serverLog: log.since(from),
    };
}

/** Settings › Users & Roles › "Users": the search box, the term, Enter; the heading and the rows. */
async function usersList(app, page, term) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
    await idle(page).catch(() => {});
    const table = page.getByRole('table', {name: /Current Users/});
    await table.locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
    const search = page.locator('main').getByRole('searchbox').first();
    await search.fill(term);
    await search.press('Enter');
    await idle(page).catch(() => {});
    await sleep(1200);
    const rows = await table.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
    const heading = flat(await page.getByRole('heading', {name: /Current Users/}).first().innerText().catch(() => null), 100);
    return {heading, rows};
}

/** The accounts whose username starts with `prefix`, with their date registered and roles (Evidence only). */
function accounts(app, prefix) {
    try {
        return sql(app, `select u.username || ' reg=' || coalesce(to_char(u.date_registered,'YYYY-MM-DD'),'null') || ' groups=' || count(uug.user_group_id) from users u left join user_user_groups uug on uug.user_id = u.user_id where u.username like '${prefix}%' group by u.username, u.date_registered order by u.username`).split('\n').filter(Boolean);
    } catch (e) { return [`sql error: ${flat(e.message, 200)}`]; }
}

/** A recorder of numbered screens: `snap(page, name)` writes `<prefix>-NN-name` and returns the label. */
function snapper(prefix) {
    let n = 0;
    return async (page, name) => {
        const label = `${prefix}-${String(++n).padStart(2, '0')}-${name}`;
        const s = await screen(page).catch((e) => ({url: page.url(), screenError: flat(e.message, 300)}));
        record(label, s);
        await shot(page, label).catch(() => {});
        return label;
    };
}

module.exports = {T, sleep, flat, rel, files, writeFile, serverLog, openUsersTool, importUsers, usersList, accounts, snapper};
