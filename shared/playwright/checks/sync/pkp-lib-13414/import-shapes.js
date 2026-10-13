// rr13414: regression read of pkp-lib#13414 (issue #13412), suspicions S1-S3 of suspicions.md.
//   PROBE_FEATURE=sync PROBE_AGENT=rr13414 node bin/probe.js ojs shared/playwright/checks/sync/pkp-lib-13414/import-shapes.js (ONLY=ojs,omp with 'all')
// Seeds its own scratch context (manager only); publicknowledge untouched.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {dbName} = require('../../../../../bin/apps.js');
const {forEachApp, launch, signIn, signOut, record, note, idle, tag, outDir, shot} = require('../../../probe');

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
    const t = tag('rr13414');
    const ctx = `${t}c`;
    await app.api.createContext({tag: ctx, context: {name: `RR13414 ${t}`, acronym: 'RR', contactName: 'RR Contact', contactEmail: `${t}contact@mail.test`}, users: [{username: `${t}m`, roles: ['manager']}]});
    note(`rr13414 [${app.name}]: scratch context ${ctx}, manager ${t}m`);
    const ctxId = `(select ${isOMP ? 'press_id from presses' : 'journal_id from journals'} where path = '${ctx}')`;
    const uid = (u) => `(select user_id from users where username = '${u}')`;
    const uug = (u) => sql(`select uug.user_user_group_id, (select setting_value from user_group_settings s where s.user_group_id = ug.user_group_id and s.setting_name='name' and s.locale='en'), uug.date_start, uug.date_end, uug.masthead from user_user_groups uug join user_groups ug on ug.user_group_id = uug.user_group_id where uug.user_id = ${uid(u)} and ug.context_id = ${ctxId} order by 1`).split('\n').filter(Boolean);
    const facts = {ctx};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}:`, JSON.stringify(v).slice(0, 1500)); };
    const u = (s) => `${t}${s}`;
    const file = (name, users) => { const f = path.join(outDir(), `rr13414-${name}-${app.name}.xml`); fs.writeFileSync(f, usersFile(users)); return f; };

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
        const f = path.join(outDir(), `rr13414-${label}-${app.name}.xml`);
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

        if (process.env.RR_PHASE !== 's3') {
        // S1: parseable dates in other spellings, through the Results tab, then the CLI
        const s1 = (sfx) => [
            userXml({username: u(`a${sfx}`), roles: [{ref: SE, start: '2024-01-05T09:30:00'}]}),
            userXml({username: u(`b${sfx}`), roles: [{ref: SE, start: '2024-1-5'}]}),
            userXml({username: u(`c${sfx}`), roles: [{ref: SE, start: '2024-01-05 09:30'}]}),
        ];
        fact('s1-ui-import', await importFile(file('s1-ui', s1('u')), 's1-ui'));
        for (const x of ['au', 'bu', 'cu']) fact(`s1-ui-db-${x}`, {exists: sql(`select count(*) from users where username = '${u(x)}'`), rows: uug(u(x))});
        const f1c = file('s1-cli', s1('k'));
        fact('s1-cli-run', runCli(f1c));
        for (const x of ['ak', 'bk', 'ck']) fact(`s1-cli-db-${x}`, {exists: sql(`select count(*) from users where username = '${u(x)}'`), rows: uug(u(x))});
        // what the pre-change model cast made of the same strings (Eloquent asDateTime: Y-m-d regex, else Carbon parse)
        fact('s1-carbon-before', execFileSync('php', ['-r', `require 'lib/pkp/lib/vendor/autoload.php'; foreach (['2024-01-05T09:30:00','2024-1-5','2024-01-05 09:30'] as $v) { echo $v, ' => ', (preg_match('/^(\\d{4})-(\\d{1,2})-(\\d{1,2})$/', $v) ? \\Carbon\\Carbon::createFromFormat('Y-m-d', $v)->startOfDay() : \\Carbon\\Carbon::parse($v))->format('Y-m-d H:i:s'), "; "; }`], {cwd: app.root, encoding: 'utf8'}).trim());

        // S2: an active role with a future end, then a file with no dates for it
        fact('s2-1-import', await importFile(file('s2-1-dated', [userXml({username: u('d'), roles: [{ref: SE, start: '2020-01-01 00:00:00', end: '2027-12-31 00:00:00'}]})]), 's2-1-dated'));
        fact('s2-1-db', uug(u('d')));
        fact('s2-2-import', await importFile(file('s2-2-nodates', [userXml({username: u('d'), roles: [{ref: SE}]})]), 's2-2-nodates'));
        fact('s2-2-db', uug(u('d')));

        }
        // S3: a legacy (NULL start) row that was ended, and a legacy open row as control; export, re-import
        // E and F also hold an open Reader role, so the Export Users grid (active roles only) lists them
        fact('s3-seed-import', await importFile(file('s3-seed', [userXml({username: u('e'), roles: [{ref: SE}, {ref: 'Reader'}]}), userXml({username: u('f'), roles: [{ref: SE}, {ref: 'Reader'}]})]), 's3-seed'));
        fact('s3-legacy-e', sql(`update user_user_groups set date_start = NULL, date_end = '2026-01-01 00:00:00' where user_id = ${uid(u('e'))} and user_group_id in (select user_group_id from user_groups where context_id = ${ctxId} and role_id = 17) returning user_user_group_id, date_start, date_end`));
        fact('s3-legacy-f', sql(`update user_user_groups set date_start = NULL, date_end = NULL where user_id = ${uid(u('f'))} and user_group_id in (select user_group_id from user_groups where context_id = ${ctxId} and role_id = 17) returning user_user_group_id, date_start, date_end`));
        fact('s3-db-before', {e: uug(u('e')), f: uug(u('f'))});
        const fx = await exportUsers([u('e'), u('f')], 's3-export');
        const xml = fs.readFileSync(fx, 'utf8');
        fact('s3-export-roles', (xml.match(/<user_user_group>[\s\S]*?<\/user_user_group>/g) || []).map((s) => flat(s, 300)));
        fact('s3-reimport', await importFile(fx, 's3-reimport'));
        fact('s3-db-after', {e: uug(u('e')), f: uug(u('f'))});
        await signOut(page).catch(() => {});
    } finally {
        record('rr13414-facts', facts, {merge: true});
        await close();
    }
});
