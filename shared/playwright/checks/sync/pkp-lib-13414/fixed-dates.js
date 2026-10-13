// rr13414b: regression read of pkp-lib#13414 round 2 (issue #13412), suspicions S1-S2 of suspicions.md.
//   PROBE_FEATURE=sync PROBE_AGENT=rr13414b ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/sync/pkp-lib-13414/fixed-dates.js
// Seeds its own scratch context (manager only); publicknowledge untouched.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {dbName} = require('../../../../../bin/apps.js');
const {forEachApp, launch, signIn, signOut, record, note, idle, tag, outDir, shot, screen} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 2000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NS = 'xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd"';
const grp = `\t\t<user_group>\n\t\t\t<role_id>1048576</role_id>\n\t\t\t<context_id>1</context_id>\n\t\t\t<is_default>true</is_default>\n\t\t\t<permit_self_registration>false</permit_self_registration>\n\t\t\t<permit_metadata_edit>false</permit_metadata_edit>\n\t\t\t<name locale="en">Reader</name>\n\t\t\t<abbrev locale="en">Read</abbrev>\n\t\t\t<stage_assignments></stage_assignments>\n\t\t\t<masthead>false</masthead>\n\t\t</user_group>\n`;
function userXml({username, roles}) {
    const r = roles.map((x) => `\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>${x.ref}</user_group_ref>\n${x.start !== undefined ? `\t\t\t\t<date_start>${x.start}</date_start>\n` : ''}${x.end !== undefined ? `\t\t\t\t<date_end>${x.end}</date_end>\n` : ''}\t\t\t\t<masthead>true</masthead>\n\t\t\t</user_user_group>\n`).join('');
    return `\t\t<user>\n\t\t\t<givenname locale="en">RR${username.slice(-2)}</givenname>\n\t\t\t<familyname locale="en">Probe</familyname>\n\t\t\t<email>${username}@mail.test</email>\n\t\t\t<username>${username}</username>\n\t\t\t<password is_disabled="false" must_change="false">\n\t\t\t\t<value>${username}${username}</value>\n\t\t\t</password>\n\t\t\t<date_registered>2020-01-02 03:04:05</date_registered>\n${r}\t\t</user>\n`;
}
const usersFile = (users) => `<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers ${NS}>\n\t<user_groups>\n${grp}\t</user_groups>\n\t<users>\n${users.join('')}\t</users>\n</PKPUsers>\n`;

forEachApp(async (app) => {
    if (app.name === 'ops') return;
    const isOMP = app.name === 'omp';
    const SE = isOMP ? 'Series editor' : 'Section editor';
    const sql = (q) => { try { return execFileSync('psql', ['-d', dbName(app.name), '-tA', '-F', '|', '-c', q], {encoding: 'utf8'}).trim(); } catch (e) { return `ERR ${flat(e.message, 200)}`; } };
    const t = tag('rr13414b');
    const ctx = `${t}c`;
    await app.api.createContext({tag: ctx, context: {name: `RR13414B ${t}`, acronym: 'RR', contactName: 'RR Contact', contactEmail: `${t}contact@mail.test`}, users: [{username: `${t}m`, roles: ['manager']}]});
    note(`rr13414b [${app.name}]: scratch context ${ctx}, manager ${t}m`);
    const ctxId = `(select ${isOMP ? 'press_id from presses' : 'journal_id from journals'} where path = '${ctx}')`;
    const uid = (u) => `(select user_id from users where username = '${u}')`;
    const uug = (u) => sql(`select uug.user_user_group_id, (select setting_value from user_group_settings s where s.user_group_id = ug.user_group_id and s.setting_name='name' and s.locale='en'), uug.date_start, uug.date_end, uug.masthead from user_user_groups uug join user_groups ug on ug.user_group_id = uug.user_group_id where uug.user_id = ${uid(u)} and ug.context_id = ${ctxId} order by 1`).split('\n').filter(Boolean);
    const facts = {ctx};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}:`, JSON.stringify(v).slice(0, 1500)); };
    const u = (s) => `${t}${s}`;
    const file = (name, users) => { const f = path.join(outDir(), `rr13414b-${name}-${app.name}.xml`); fs.writeFileSync(f, usersFile(users)); return f; };

    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const PLUGIN = app.url(`/index.php/${ctx}/management/importexport/plugin/UserImportExportPlugin`);
    const importFile = async (f, label) => {
        await page.goto(PLUGIN);
        await page.locator('#importXmlForm').waitFor();
        await idle(page).catch(() => {});
        const oldId = await page.locator('#importXmlForm #temporaryFileId').inputValue().catch(() => '');
        await page.locator('#importXmlForm input[type=file]').first().setInputFiles(f);
        await page.waitForFunction((old) => { const v = (document.querySelector('#importXmlForm #temporaryFileId') || {}).value; return v && v !== old; }, oldId, {timeout: 20_000}).catch(() => {});
        const before = await page.locator('#importExportTabs [role="tab"]').count();
        const respP = page.waitForResponse((x) => /UserImportExportPlugin\/import\?/.test(x.url()), {timeout: 90_000}).catch(() => null);
        await page.locator('#importXmlForm').getByRole('button', {name: 'Import Users'}).click();
        const resp = await respP;
        const o = {file: path.basename(f), importStatus: resp ? resp.status() : null};
        await page.waitForFunction((n) => document.querySelectorAll('#importExportTabs [role="tab"]').length > n, before, {timeout: 20_000}).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(800);
        o.results = flat(await page.locator('#importExportTabs .ui-tabs-panel:visible').first().innerText({timeout: 3000}).catch(() => null), 1500);
        await shot(page, label);
        return o;
    };
    const exportUsers = async (usernames, label) => {
        await page.goto(PLUGIN);
        await idle(page).catch(() => {});
        await page.locator('#importExportTabs').getByRole('tab', {name: 'Export Users'}).click();
        await page.locator('#exportXmlForm input[name="selectedUsers[]"]').first().waitFor({timeout: 20_000});
        await idle(page).catch(() => {});
        for (const un of usernames) {
            const id = sql(`select user_id from users where username = '${un}'`);
            await page.locator(`#exportXmlForm input[name="selectedUsers[]"][value="${id}"]`).check();
        }
        await shot(page, `${label}-selected`);
        const dlP = page.waitForEvent('download', {timeout: 30_000});
        await page.locator('#exportXmlForm').getByRole('button', {name: 'Export Users'}).click();
        const dl = await dlP;
        const f = path.join(outDir(), `rr13414b-${label}-${app.name}.xml`);
        await dl.saveAs(f);
        return f;
    };
    const runCli = (f) => {
        try {
            const out = execFileSync('php', ['tools/importExport.php', 'UserImportExportPlugin', 'import', f, ctx], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
            return {exit: 0, output: flat(out, 1500)};
        } catch (e) {
            return {exit: e.status, output: flat(`${e.stdout || ''} ${e.stderr || ''}`, 1500)};
        }
    };
    try {
        await signIn(page, `${t}m`, {contextPath: ctx});

        // S1: fixed dates with a weekday name, an ISO week date, a Unix timestamp;
        // round 3 (2e377d27fc): a Sunday, and a weekday that contradicts its date (f, refused by the issue)
        const s1 = {a: 'Fri, 05 Jan 2024 09:30:00 +0000', b: 'Fri, 05 Jan 2024 09:30:00 GMT', c: 'Friday, January 5, 2024', d: '2024-W01-5', e: '1704447000', f: 'Mon, 05 Jan 2024 09:30:00 +0000', h: 'Sun, 07 Jan 2024'};
        fact('s1-import', await importFile(file('s1', Object.entries(s1).map(([k, v]) => userXml({username: u(k), roles: [{ref: SE, start: v}]}))), 's1'));
        for (const k of Object.keys(s1)) fact(`s1-db-${k}`, {value: s1[k], exists: sql(`select count(*) from users where username = '${u(k)}'`), rows: uug(u(k))});
        fact('s1-cast-before', execFileSync('php', ['-r', `require 'lib/pkp/lib/vendor/autoload.php'; date_default_timezone_set('UTC'); class M extends \\Illuminate\\Database\\Eloquent\\Model { protected $casts=['d'=>'datetime']; public function getDateFormat(){return 'Y-m-d H:i:s';} } foreach (${JSON.stringify(Object.values(s1)).replace(/"/g, "'")} as $v) { echo $v, ' => ', (new M)->fromDateTime($v), '; '; }`], {cwd: app.root, encoding: 'utf8'}).trim());

        // S2: a no-start past-end period plus two dated past periods and an open Reader role
        fact('s2-import', await importFile(file('s2', [userXml({username: u('g'), roles: [
            {ref: SE, end: '2020-01-01 00:00:00'},
            {ref: SE, start: '2021-01-01 00:00:00', end: '2023-01-01 00:00:00'},
            {ref: SE, start: '2024-01-01 00:00:00', end: '2025-01-01 00:00:00'},
            {ref: 'Reader'},
        ]})]), 's2-import'));
        fact('s2-db', uug(u('g')));
        const gid = sql(`select user_id from users where username = '${u('g')}'`);

        await page.goto(app.url(`/index.php/${ctx}/about/editorialHistory`));
        await idle(page).catch(() => {});
        const eh = await screen(page);
        fact('s2-editorialHistory', {url: page.url(), text: flat(eh.text && eh.text.main, 1500)});
        await shot(page, 's2-editorialHistory');

        await page.goto(app.url(`/index.php/${ctx}/management/settings/access`));
        await idle(page).catch(() => {});
        await sleep(1500);
        const ul = await screen(page);
        const ulText = (ul.text && ul.text.main) || '';
        const gi = ulText.indexOf(`RR${u('g').slice(-2)}`);
        fact('s2-usersList', {found: gi >= 0, around: flat(ulText.slice(Math.max(0, gi - 50), gi + 400), 600)});
        await shot(page, 's2-usersList');

        await page.goto(app.url(`/index.php/${ctx}/management/settings/user/${gid}`));
        await idle(page).catch(() => {});
        await sleep(1500);
        const ed = await screen(page);
        fact('s2-editPage', {url: page.url(), text: flat(ed.text && ed.text.main, 1500)});
        await shot(page, 's2-editPage');

        const fx = await exportUsers([u('g')], 's2-export');
        fact('s2-export-roles', (fs.readFileSync(fx, 'utf8').match(/<user_user_group>[\s\S]*?<\/user_user_group>/g) || []).map((s) => flat(s, 300)));
        await signOut(page).catch(() => {});
    } finally {
        record('rr13414b-facts', facts, {merge: true});
        await close();
    }
});
