// Issue report walk: docs/issues/users-import-unreadable-file-empty-results.md
// (spec U63 register A13). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own context `publicknowledge` and its manager `rvaca`, on OJS and
// OMP (OPS has no Users XML Plugin).
//
// The kit builds nothing. The script writes the six files the Steps give
// (five the import cannot read, and the control), then, for each file:
//   Tools › "Users XML Plugin" › "Import Users": "Upload File" (the file),
//   "Import Users"; the "Results" tab's text, the import request's status and
//   the server log lines it wrote; then Settings › "Users & Roles" › "Users",
//   searched for the file's username.
// Neighbours for the fix, walked with and without fix.diff: a complete file
// must import as before ("The import completed successfully. …"), and a file
// whose user is the dataset's `dbarnes` with another email must still give
// the filter's own line under "Import/Export errors:". NEIGHBOUR_ONLY=1 takes
// the two neighbours alone.
//
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-ir3 PROBE_AGENT=u63a13 ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/users-import-unreadable-file-empty-results/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u63a13 ONLY=ojs,omp node bin/probe.js all <this file>
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/u63a13/facts[-<run>]-<app>.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, sql, outFile} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const REPO = path.resolve(__dirname, '../../../../..');
const NEIGHBOUR_ONLY = process.env.NEIGHBOUR_ONLY === '1';

const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd">\n';
// The user group's shape is the line's schema: stable-3_5_0 requires <show_title> after <is_default>,
// which main's schema dropped (pkp/pkp-lib#11971); the Steps name the difference in a bracket.
const SHOW_TITLE = process.env.PKP_E2E_LINE === 'stable-3_5_0' ? '      <show_title>true</show_title>\n' : '';
const GROUPS = '  <user_groups>\n    <user_group>\n      <role_id>1048576</role_id>\n      <context_id>1</context_id>\n      <is_default>true</is_default>\n' + SHOW_TITLE + '      <permit_self_registration>true</permit_self_registration>\n      <permit_metadata_edit>false</permit_metadata_edit>\n      <name locale="en">Reader</name>\n      <abbrev locale="en">Read</abbrev>\n      <stage_assignments></stage_assignments>\n      <masthead>false</masthead>\n    </user_group>\n  </user_groups>\n';
const user = (u, {password = true, masthead = true, extra = ''} = {}) =>
    `    <user>\n      <givenname locale="en">Ada</givenname>\n      <familyname locale="en">${u}</familyname>\n      <email>${u}@mailinator.com</email>\n      <username>${u}</username>\n` +
    (password ? `      <password is_disabled="false" must_change="false">\n        <value>${u}${u}</value>\n      </password>\n` : '') +
    `      <date_registered>2020-01-02 03:04:05</date_registered>\n${extra}` +
    `      <user_user_group>\n        <user_group_ref>Reader</user_group_ref>\n${masthead ? '        <masthead>true</masthead>\n' : ''}      </user_user_group>\n    </user>\n`;
const usersFile = (body) => `${HEAD}${GROUPS}  <users>\n${body}  </users>\n</PKPUsers>\n`;

const FILES = [
    {key: 'no-masthead', name: 'u63a13-no-masthead.xml', username: 'u63a13a', xml: usersFile(user('u63a13a', {masthead: false}))},
    {key: 'no-password', name: 'u63a13-no-password.xml', username: 'u63a13b', xml: usersFile(user('u63a13b', {password: false}))},
    {key: 'unknown-element', name: 'u63a13-unknown-element.xml', username: 'u63a13c', xml: usersFile(user('u63a13c', {extra: '      <shoesize>42</shoesize>\n'}))},
    {key: 'other-document', name: 'u63a13-other-document.xml', username: null, xml: '<?xml version="1.0" encoding="UTF-8"?>\n<articles xmlns="http://pkp.sfu.ca"><article/></articles>\n'},
    {key: 'not-xml', name: 'u63a13-not-xml.txt', username: null, xml: 'This is not an XML file.\n'},
];
// Neighbours (walked with and without the fix): a complete file imports; a file whose user is the dataset's
// dbarnes with another email address gives the filter's own line under "Import/Export errors:".
const CONTROL = {key: 'control', name: 'u63a13-complete.xml', username: 'u63a13ok', xml: usersFile(user('u63a13ok'))};
const MISMATCH = {key: 'mismatch', name: 'u63a13-mismatch.xml', username: null, xml: usersFile(user('u63a13ok').replace(/<username>u63a13ok</, '<username>dbarnes<').replace(/<email>u63a13ok@/, '<email>u63a13x@'))};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name === 'ops') { console.log('[ops] no Users XML Plugin: skipped'); return; }
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1200)}`); };
    const lang = app.line && /3_4|3_3/.test(app.line) ? '' : '/en';
    const cu = (p) => app.url(`/index.php/${app.contextPath}${lang}${p}`);
    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP|Error|Exception|\[5\d\d\]/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 500)).slice(0, 8);
        } catch { return [`(no log at ${logFile})`]; }
    };
    const accounts = () => sql(app, "select username from users where username like 'u63a13%' order by username").split('\n').filter(Boolean);

    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        const label = `${String(++n).padStart(2, '0')}-${name}`;
        record(label, s);
        await shot(page, label).catch(() => {});
        return s;
    };
    const tabTitles = () => page.locator('#importExportTabs > ul > li').evaluateAll((ls) => ls.map((l) => l.textContent.replace(/\s+/g, ' ').trim()));

    async function openTool() {
        // Step 2: side menu "Tools", then "Users XML Plugin" on "Import/Export".
        await page.goto(cu('/submissions'));
        await idle(page);
        const toolsLink = page.getByRole('navigation', {name: 'Site Navigation'}).getByRole('link', {name: 'Tools', exact: true});
        if (await toolsLink.count()) {
            await Promise.all([page.waitForURL(/management\/tools/, {timeout: T}), toolsLink.first().click()]);
        } else {
            await page.goto(cu('/management/tools'));
            facts.toolsTyped = true;
        }
        await idle(page);
        const link = page.getByRole('link', {name: 'Users XML Plugin', exact: true}).first();
        await link.waitFor({timeout: T});
        await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
        await page.locator('#importXmlForm').waitFor({timeout: T});
        await idle(page); await pause(500);
    }

    async function importFile(f) {
        const file = outFile(f.name);
        fs.writeFileSync(file, f.xml);
        await openTool();
        // Step 3: "Upload File" and choose the file.
        const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
        await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
        const u = await up;
        await page.waitForFunction(() => (document.querySelector('#importXmlForm #temporaryFileId') || {}).value, null, {timeout: T}).catch(() => {});
        await idle(page);
        // Step 4: "Import Users".
        const before = await tabTitles();
        const from = logSize();
        const answered = page.waitForResponse((r) => /UserImportExportPlugin\/import\?/.test(r.url()), {timeout: 90_000}).catch(() => null);
        await page.locator('#importXmlForm').getByRole('button', {name: 'Import Users', exact: true}).click();
        const r = await answered;
        for (let i = 0; i < 30 && (await tabTitles()).length === before.length; i++) await pause(300);
        await idle(page); await pause(1500);
        const panel = page.locator('#importExportTabs > [role="tabpanel"]:visible').first();
        const o = {
            upload: u ? u.status() : null,
            importRequest: r ? {status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]+/, 'csrfToken=…')} : 'none',
            tabs: await tabTitles(),
            resultsText: await panel.innerText().catch(() => null),
            resultsHtmlLength: (await panel.innerHTML().catch(() => '')).length,
        };
        await snap(`${f.key}-results`);
        await pause(500);
        o.serverLog = logSince(from);
        // Step 5: Settings › "Users & Roles" › "Users", search for the username.
        if (f.username) {
            await page.goto(cu('/management/settings/access'));
            await idle(page);
            const search = page.locator('main').getByRole('searchbox').or(page.locator('main input[type="search"]')).first();
            await search.waitFor({timeout: T}).catch(() => {});
            if (await search.count()) {
                await search.fill('u63a13'); await search.press('Enter');
                await idle(page); await pause(1500);
                o.usersSearch = flat(await page.locator('main').innerText().catch(() => null), 900);
            } else o.usersSearch = '(no search box)';
            await snap(`${f.key}-users-search`);
        }
        o.accounts = accounts();
        fact(f.key, o);
    }

    try {
        fact('accounts before', accounts());
        // Step 1: sign in as rvaca.
        await signIn(page, 'rvaca');
        if (!NEIGHBOUR_ONLY) for (const f of FILES) await importFile(f);
        await importFile(CONTROL);
        await importFile(MISMATCH);
        fact('dbarnes after', sql(app, "select username, email from users where username = 'dbarnes'"));
    } finally {
        record('facts', facts);
        await close();
    }
});
