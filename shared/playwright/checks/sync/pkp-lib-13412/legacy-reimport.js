// pkp-lib#13412 (pkp-lib#13414 main, #13413 stable-3_5_0): a users file imported before pkp-lib#13390 and imported again after
// #13412 gains each ended role a second time (sync rr13412 S1; the "before" row written by the old importer itself, no SQL).
//   PHASE=first  — run with lib/pkp BEFORE pkp-lib#13390 (stable-3_5_0: `d3216eed72`; main: `b9d803100c^1`): seeds a scratch
//                  context, imports the file (U and V: an ended role 2018-01-01..2020-01-01 plus Reader); state in legacy-state-<app>.json
//   PHASE=again  — run with lib/pkp at the tip: imports the same file into the same context again
//   On a dataset fleet (harness.md "Dataset fleets") it imports into publicknowledge as dbarnes instead of a scratch context.
//   PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=sync-3_5 PROBE_AGENT=s01-13412 PHASE=first|again node bin/probe.js ojs|omp shared/playwright/checks/sync/pkp-lib-13412/legacy-reimport.js
// Fixed when the `again` phase leaves U with one row for the role (and Editorial History one period per person).
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, record, note, idle, tag, outDir, shot, screen, sql: kitSql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 2000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NS = 'xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd"';
const grp = `\t\t<user_group>\n\t\t\t<role_id>1048576</role_id>\n\t\t\t<context_id>1</context_id>\n\t\t\t<is_default>true</is_default>\n${process.env.PKP_E2E_LINE === 'stable-3_5_0' ? '\t\t\t<show_title>true</show_title>\n' : ''}\t\t\t<permit_self_registration>false</permit_self_registration>\n\t\t\t<permit_metadata_edit>false</permit_metadata_edit>\n\t\t\t<name locale="en">Reader</name>\n\t\t\t<abbrev locale="en">Read</abbrev>\n\t\t\t<stage_assignments></stage_assignments>\n\t\t\t<masthead>false</masthead>\n\t\t</user_group>\n`;
function userXml({username, roles}) {
    const r = roles.map((x) => `\t\t\t<user_user_group>\n\t\t\t\t<user_group_ref>${x.ref}</user_group_ref>\n${x.start !== undefined ? `\t\t\t\t<date_start>${x.start}</date_start>\n` : ''}${x.end !== undefined ? `\t\t\t\t<date_end>${x.end}</date_end>\n` : ''}\t\t\t\t<masthead>true</masthead>\n\t\t\t</user_user_group>\n`).join('');
    return `\t\t<user>\n\t\t\t<givenname locale="en">RR${username.slice(-2)}</givenname>\n\t\t\t<familyname locale="en">Probe</familyname>\n\t\t\t<email>${username}@mail.test</email>\n\t\t\t<username>${username}</username>\n\t\t\t<password is_disabled="false" must_change="false">\n\t\t\t\t<value>${username}${username}</value>\n\t\t\t</password>\n\t\t\t<date_registered>2020-01-02 03:04:05</date_registered>\n${r}\t\t</user>\n`;
}
const usersFile = (users) => `<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers ${NS}>\n\t<user_groups>\n${grp}\t</user_groups>\n\t<users>\n${users.join('')}\t</users>\n</PKPUsers>\n`;

forEachApp(async (app) => {
    if (app.name === 'ops') return;
    const isOMP = app.name === 'omp';
    const SE = isOMP ? 'Series editor' : 'Section editor';
    const sql = (q) => { try { return kitSql(app, q); } catch (e) { return `ERR ${flat(e.message, 200)}`; } };
    const PHASE = process.env.PHASE || 'first';
    const stateFile = path.join(outDir(), `legacy-state-${app.name}.json`);
    let t;
    const DS = !!app.dataset; // a dataset fleet: the dataset's own journal and its manager dbarnes, no scratch context
    if (PHASE === 'first') {
        t = tag('l13412');
        if (!DS) await app.api.createContext({tag: `${t}c`, context: {name: `L13412 ${t}`, acronym: 'LR', contactName: 'LR Contact', contactEmail: `${t}contact@mail.test`}, users: [{username: `${t}m`, roles: ['manager']}]});
        fs.writeFileSync(stateFile, JSON.stringify({t}));
    } else {
        ({t} = JSON.parse(fs.readFileSync(stateFile, 'utf8')));
    }
    const ctx = DS ? 'publicknowledge' : `${t}c`;
    const manager = DS ? 'dbarnes' : `${t}m`;
    note(`l13412 [${app.name}] ${PHASE}: scratch context ${ctx}, manager ${t}m`);
    const ctxId = `(select ${isOMP ? 'press_id from presses' : 'journal_id from journals'} where path = '${ctx}')`;
    const uid = (u) => `(select user_id from users where username = '${u}')`;
    const uug = (u) => sql(`select uug.user_user_group_id, (select setting_value from user_group_settings s where s.user_group_id = ug.user_group_id and s.setting_name='name' and s.locale='en'), uug.date_start, uug.date_end, uug.masthead from user_user_groups uug join user_groups ug on ug.user_group_id = uug.user_group_id where uug.user_id = ${uid(u)} and ug.context_id = ${ctxId} order by 1`).split('\n').filter(Boolean);
    const facts = {ctx};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}:`, JSON.stringify(v).slice(0, 1500)); };
    const u = (s) => `${t}${s}`;
    const file = (name, users) => { const f = path.join(outDir(), `l13412-${name}-${app.name}.xml`); fs.writeFileSync(f, usersFile(users)); return f; };

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

    try {
        await signIn(page, manager, {contextPath: ctx});
        const roles = [{ref: SE, start: '2018-01-01 00:00:00', end: '2020-01-01 00:00:00'}, {ref: 'Reader'}];
        const f = file('legacy', [userXml({username: u('u'), roles}), userXml({username: u('v'), roles})]);
        fact(`${PHASE}-lib-pkp`, execFileSync('git', ['-C', path.join(app.root || '', 'lib/pkp'), 'log', '-1', '--format=%h %s'], {encoding: 'utf8'}).trim());
        fact(`${PHASE}-import`, await importFile(f, `${PHASE}-import`));
        fact(`${PHASE}-db`, {u: uug(u('u')), v: uug(u('v'))});
        await page.goto(app.url(`/index.php/${ctx}/about/editorialHistory`));
        await idle(page).catch(() => {});
        fact(`${PHASE}-editorialHistory`, flat((await screen(page)).text.main, 1500));
        await shot(page, `${PHASE}-editorialHistory`);
        await signOut(page).catch(() => {});
    } finally {
        record(`legacy-facts-${PHASE}`, facts, {merge: true});
        await close();
    }
});
