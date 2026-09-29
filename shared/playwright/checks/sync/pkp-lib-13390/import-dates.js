// rr13390 regression reproduction, S1 and S2 of suspicions.md (Users XML Plugin import, OJS OMP).
//   PROBE_FEATURE=sync PROBE_AGENT=rr13390 ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/sync/pkp-lib-13390/import-dates.js
// Seeds its own scratch context per app (manager only); publicknowledge untouched.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {dbName} = require('../../../../../bin/apps.js');
const {forEachApp, launch, signIn, signOut, record, note, idle, tag, outDir, screen, shot} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 2000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NS = 'xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd"';
// 3.5's users schema wants <show_title> in a user group (main's dropped it).
const grp = `\t\t<user_group>\n\t\t\t<role_id>1048576</role_id>\n\t\t\t<context_id>1</context_id>\n\t\t\t<is_default>true</is_default>\n${process.env.PKP_E2E_LINE === 'stable-3_5_0' ? '\t\t\t<show_title>true</show_title>\n' : ''}\t\t\t<permit_self_registration>false</permit_self_registration>\n\t\t\t<permit_metadata_edit>false</permit_metadata_edit>\n\t\t\t<name locale="en">Reader</name>\n\t\t\t<abbrev locale="en">Read</abbrev>\n\t\t\t<stage_assignments></stage_assignments>\n\t\t\t<masthead>false</masthead>\n\t\t</user_group>\n`;
function userXml({username, roles}) {
    const r = roles.map((x) => `\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>${x.ref}</user_group_ref>\n${x.start !== undefined ? `\t\t\t\t<date_start>${x.start}</date_start>\n` : ''}\t\t\t\t<masthead>true</masthead>\n\t\t\t</user_user_group>\n`).join('');
    return `\t\t<user>\n\t\t\t<givenname locale="en">RR${username.slice(-2)}</givenname>\n\t\t\t<familyname locale="en">Probe</familyname>\n\t\t\t<email>${username}@mail.test</email>\n\t\t\t<username>${username}</username>\n\t\t\t<password is_disabled="false" must_change="false">\n\t\t\t\t<value>${username}${username}</value>\n\t\t\t</password>\n\t\t\t<date_registered>2020-01-02 03:04:05</date_registered>\n${r}\t\t</user>\n`;
}
const usersFile = (users) => `<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers ${NS}>\n\t<user_groups>\n${grp}\t</user_groups>\n\t<users>\n${users.join('')}\t</users>\n</PKPUsers>\n`;

forEachApp(async (app) => {
    if (app.name === 'ops') return; // no Users XML Plugin on a preprint server
    const isOMP = app.name === 'omp';
    const SE = isOMP ? 'Series editor' : 'Section editor';
    const sql = (q) => { try { return execFileSync('psql', ['-d', dbName(app.name), '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim(); } catch (e) { return `ERR ${flat(e.message, 200)}`; } };
    const t = tag('rr13390');
    const ctx = `${t}c`;
    await app.api.createContext({tag: ctx, context: {name: `RR13390 ${t}`, acronym: 'RR', contactName: 'RR Contact', contactEmail: `${t}contact@mail.test`}, users: [{username: `${t}m`, roles: ['manager']}]});
    note(`rr13390 [${app.name}]: scratch context ${ctx}, manager ${t}m`);
    const uug = (u) => sql(`select ug.user_group_id, (select setting_value from user_group_settings s where s.user_group_id = ug.user_group_id and s.setting_name='name' and s.locale='en'), uug.date_start, uug.date_end, uug.masthead from user_user_groups uug join user_groups ug on ug.user_group_id = uug.user_group_id join users u on u.user_id = uug.user_id where u.username = '${u}' and ug.context_id = (select ${isOMP ? 'press_id from presses' : 'journal_id from journals'} where path = '${ctx}') order by 1, 3`).split('\n').filter(Boolean);
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}:`, JSON.stringify(v).slice(0, 1500)); };

    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const PLUGIN = app.url(`/index.php/${ctx}/management/importexport/plugin/UserImportExportPlugin`);
    const importFile = async (file, label) => {
        await page.goto(PLUGIN);
        await page.locator('#importXmlForm').waitFor();
        await idle(page).catch(() => {});
        const oldId = await page.locator('#importXmlForm #temporaryFileId').inputValue().catch(() => '');
        await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
        await page.waitForFunction((old) => { const v = (document.querySelector('#importXmlForm #temporaryFileId') || {}).value; return v && v !== old; }, oldId, {timeout: 20_000}).catch(() => {});
        const before = await page.locator('#importExportTabs [role="tab"]').count();
        const respP = page.waitForResponse((x) => /UserImportExportPlugin\/import\?/.test(x.url()), {timeout: 90_000}).catch(() => null);
        await page.locator('#importXmlForm').getByRole('button', {name: 'Import Users'}).click();
        const resp = await respP;
        const o = {file: path.basename(file), importStatus: resp ? resp.status() : null};
        o.responseBody = resp ? flat(await resp.text().catch(() => null), 1500) : null;
        await page.waitForFunction((n) => document.querySelectorAll('#importExportTabs [role="tab"]').length > n, before, {timeout: 20_000}).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(800);
        o.results = flat(await page.locator('#importExportTabs .ui-tabs-panel:visible').first().innerText({timeout: 3000}).catch(() => null), 1500);
        await shot(page, label);
        return o;
    };
    try {
        await signIn(page, `${t}m`, {contextPath: ctx});
        // S1: a future start date, the same file imported twice
        const fu = `${t}fu`;
        const f1 = path.join(outDir(), `rr13390-s1-${app.name}.xml`);
        fs.writeFileSync(f1, usersFile([userXml({username: fu, roles: [{ref: SE, start: '2027-06-01 00:00:00'}]})]));
        fact('s1-first', await importFile(f1, 's1-first-import'));
        fact('s1-db-after-first', uug(fu));
        fact('s1-second', await importFile(f1, 's1-second-import'));
        fact('s1-db-after-second', uug(fu));
        fact('s1-third', await importFile(f1, 's1-third-import'));
        fact('s1-db-after-third', uug(fu));
        // the manager's Users & Roles list row for the user
        await page.goto(app.url(`/index.php/${ctx}/management/settings/access`));
        await page.locator('main table tbody tr').first().waitFor().catch(() => {});
        await idle(page).catch(() => {});
        await sleep(800);
        fact('s1-users-list-row', await page.locator('main table tbody tr').filter({hasText: 'RRfu'}).allInnerTexts().catch(() => []));
        await shot(page, 's1-users-list');
        // control: a past start date imported twice
        const pu = `${t}pu`;
        const f1c = path.join(outDir(), `rr13390-s1c-${app.name}.xml`);
        fs.writeFileSync(f1c, usersFile([userXml({username: pu, roles: [{ref: SE, start: '2020-01-01 00:00:00'}]})]));
        fact('s1c-first', await importFile(f1c, 's1c-first-import'));
        fact('s1c-second', await importFile(f1c, 's1c-second-import'));
        fact('s1c-db', uug(pu));

        // S2: an empty <date_start>
        const eu = `${t}eu`;
        const f2 = path.join(outDir(), `rr13390-s2-${app.name}.xml`);
        fs.writeFileSync(f2, usersFile([userXml({username: eu, roles: [{ref: SE, start: ''}]})]));
        fact('s2-import', await importFile(f2, 's2-empty-date-start'));
        fact('s2-db', uug(eu));
        fact('s2-user-exists', sql(`select user_id, disabled from users where username = '${eu}'`));
        // control: no <date_start> element at all
        const nu = `${t}nu`;
        const f2c = path.join(outDir(), `rr13390-s2c-${app.name}.xml`);
        fs.writeFileSync(f2c, usersFile([userXml({username: nu, roles: [{ref: SE}]})]));
        fact('s2c-import', await importFile(f2c, 's2c-no-date-start'));
        fact('s2c-db', uug(nu));
        await signOut(page).catch(() => {});
    } finally {
        record('rr13390-facts', facts);
        await close();
    }
});
