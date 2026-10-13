// PR review of pkp-lib#13414 (issue #13412): the Users XML import's role dates and periods (OJS OMP).
// Each case below is one bullet of the issue's "Proposed solution"; the 13390 kept check covers the two reported cases.
//   PROBE_FEATURE=sync PROBE_AGENT=pr13412 ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/sync/pkp-lib-13414/role-periods.js
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
    const r = roles.map((x) => `\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>${x.ref}</user_group_ref>\n${x.start !== undefined ? `\t\t\t\t<date_start>${x.start}</date_start>\n` : ''}${x.end !== undefined ? `\t\t\t\t<date_end>${x.end}</date_end>\n` : ''}\t\t\t\t<masthead>true</masthead>\n\t\t\t</user_user_group>\n`).join('');
    return `\t\t<user>\n\t\t\t<givenname locale="en">RR${username.slice(-2)}</givenname>\n\t\t\t<familyname locale="en">Probe</familyname>\n\t\t\t<email>${username}@mail.test</email>\n\t\t\t<username>${username}</username>\n\t\t\t<password is_disabled="false" must_change="false">\n\t\t\t\t<value>${username}${username}</value>\n\t\t\t</password>\n\t\t\t<date_registered>2020-01-02 03:04:05</date_registered>\n${r}\t\t</user>\n`;
}
const usersFile = (users) => `<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers ${NS}>\n\t<user_groups>\n${grp}\t</user_groups>\n\t<users>\n${users.join('')}\t</users>\n</PKPUsers>\n`;

forEachApp(async (app) => {
    if (app.name === 'ops') return; // no Users XML Plugin on a preprint server
    const isOMP = app.name === 'omp';
    const SE = isOMP ? 'Series editor' : 'Section editor';
    const sql = (q) => { try { return execFileSync('psql', ['-d', dbName(app.name), '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim(); } catch (e) { return `ERR ${flat(e.message, 200)}`; } };
    const t = tag('pr13412');
    const ctx = `${t}c`;
    await app.api.createContext({tag: ctx, context: {name: `PR13412 ${t}`, acronym: 'RR', contactName: 'RR Contact', contactEmail: `${t}contact@mail.test`}, users: [{username: `${t}m`, roles: ['manager']}]});
    note(`pr13412 [${app.name}]: scratch context ${ctx}, manager ${t}m`);
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
        const run = process.env.K3RUN || '';
        const file = (name, users) => { const f = path.join(outDir(), `pr13412-${name}-${app.name}${run}.xml`); fs.writeFileSync(f, usersFile(users)); return f; };
        const u = (s) => `${t}${s}`;
        const exists = (s) => sql(`select count(*) from users where username = '${u(s)}'`);

        // A: a start date that is not a date is reported, the role skipped, the next user still imported
        const fa = file('a-invalid', [userXml({username: u('iv'), roles: [{ref: SE, start: 'soon'}]}), userXml({username: u('ia'), roles: [{ref: SE}]})]);
        fact('a-import', await importFile(fa, 'a-invalid-start'));
        fact('a-db-iv', uug(u('iv'))); fact('a-exists-iv', exists('iv'));
        fact('a-db-ia', uug(u('ia')));
        // B: a rolled-over date (2027-02-30) is reported, not stored as 2027-03-02
        fact('b-import', await importFile(file('b-rollover', [userXml({username: u('ro'), roles: [{ref: SE, start: '2027-02-30'}]})]), 'b-rollover'));
        fact('b-db', uug(u('ro')));
        // C: a start not before the end, and a past end with no start, are reported
        fact('c1-import', await importFile(file('c1-reversed', [userXml({username: u('pe'), roles: [{ref: SE, start: '2027-01-01 00:00:00', end: '2026-01-01 00:00:00'}]})]), 'c1-reversed'));
        fact('c1-db', uug(u('pe')));
        fact('c2-import', await importFile(file('c2-past-end-no-start', [userXml({username: u('pn'), roles: [{ref: SE, end: '2020-01-01 00:00:00'}]})]), 'c2-past-end-no-start'));
        fact('c2-db', uug(u('pn')));
        // C2b (round 2): the same file again, as an export of an ended role with no start date re-imported
        fact('c2b-import', await importFile(file('c2-past-end-no-start', [userXml({username: u('pn'), roles: [{ref: SE, end: '2020-01-01 00:00:00'}]})]), 'c2b-past-end-no-start-again'));
        fact('c2b-db', uug(u('pn')));
        fact('c3-import', await importFile(file('c3-equal', [userXml({username: u('eq'), roles: [{ref: SE, start: '2027-01-01', end: '2027-01-01 00:00:00'}]})]), 'c3-equal'));
        fact('c3-db', uug(u('eq')));
        // D: a date-only start, then the same start written with a time: one row, nothing reported
        fact('d1-import', await importFile(file('d1-date-only', [userXml({username: u('do'), roles: [{ref: SE, start: '2027-06-01'}]})]), 'd1-date-only'));
        fact('d2-import', await importFile(file('d2-date-time', [userXml({username: u('do'), roles: [{ref: SE, start: '2027-06-01 00:00:00'}]})]), 'd2-date-time'));
        fact('d-db', uug(u('do')));
        // E: an active role, then a file whose period overlaps it: reported, one row
        fact('e1-import', await importFile(file('e1-active', [userXml({username: u('ov'), roles: [{ref: SE}]})]), 'e1-active'));
        fact('e2-import', await importFile(file('e2-overlap', [userXml({username: u('ov'), roles: [{ref: SE, start: '2027-06-01 00:00:00'}]})]), 'e2-overlap'));
        fact('e-db', uug(u('ov')));
        // F: an active role, then an earlier ended period of it: imported silently, and silently kept at a re-import
        fact('f1-import', await importFile(file('f1-active', [userXml({username: u('ep'), roles: [{ref: SE}]})]), 'f1-active'));
        const ff = file('f2-earlier', [userXml({username: u('ep'), roles: [{ref: SE, start: '2020-01-01 00:00:00', end: '2021-01-01 00:00:00'}]})]);
        fact('f2-import', await importFile(ff, 'f2-earlier'));
        fact('f3-import', await importFile(ff, 'f3-earlier-again'));
        fact('f-db', uug(u('ep')));
        // G: a file with no start date, re-imported "on a later day" (the row's start moved two days back): silent, one row
        const fg = file('g-no-start', [userXml({username: u('ld'), roles: [{ref: SE}]})]);
        fact('g1-import', await importFile(fg, 'g1-no-start'));
        fact('g-shift', sql(`update user_user_groups set date_start = date_start - interval '2 days' where user_id = (select user_id from users where username = '${u('ld')}') returning date_start`));
        fact('g2-import', await importFile(fg, 'g2-no-start-later-day'));
        fact('g-db', uug(u('ld')));
        // H: an empty <date_end> with a past start: imported with no end
        fact('h-import', await importFile(file('h-empty-end', [userXml({username: u('ee'), roles: [{ref: SE, start: '2020-01-01 00:00:00', end: ''}]})]), 'h-empty-end'));
        fact('h-db', uug(u('ee')));
        // K-M (round 2, date_parse): a relative date, a zero date, a day-first date with dots
        fact('k-import', await importFile(file('k-relative', [userXml({username: u('rl'), roles: [{ref: SE, start: 'tomorrow'}]})]), 'k-relative'));
        fact('k-db', uug(u('rl')));
        fact('l-import', await importFile(file('l-zero', [userXml({username: u('zd'), roles: [{ref: SE, start: '0000-00-00 00:00:00'}]})]), 'l-zero'));
        fact('l-db', uug(u('zd')));
        fact('m-import', await importFile(file('m-dots', [userXml({username: u('dt'), roles: [{ref: SE, start: '5.1.2024'}]})]), 'm-dots'));
        fact('m-db', uug(u('dt')));
        await signOut(page).catch(() => {});
    } finally {
        record('pr13412-facts', facts);
        await close();
    }
});
