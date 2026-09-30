// Issue report walk: docs/issues/U63-A15-users-import-existing-account-told-new-password.md
// (spec U63 register A15). Takes the report's Steps through the screens on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), on its own context `publicknowledge`,
// as `admin`, on OJS and OMP (OPS has no Users XML Plugin).
//
// The kit builds nothing. Steps:
//   1    sign in as admin (Administration › "System Information" is read for the PHP version)
//   2-3  Tools › "Users XML Plugin" › "Export Users": tick agallego, "Export Users" (the file)
//   4    the file's <value> replaced with sha1("agallego" . "agallegoagallego"), the form older
//        versions stored (encryption="sha1" as exported)
//   5-6  Tools › "Users XML Plugin" › "Import Users": upload the edited file, "Import Users"; "Results"
//   7    agallego@mailinator.com's mailbox
//   8    sign out; sign in as agallego / agallegoagallego
//   Path B (the exported file unedited, which PHP 8.2/8.3 flag too: A16): steps 5-8 again.
// Neighbour (NEIGHBOUR=1 adds it; NEIGHBOUR_ONLY=1 takes it alone), for the fix trial: a users file
//   with one new account, u63a15n, whose password is the same sha1 form: it must still get the
//   line, the "Journal Registration" ("Press Registration") email, and the mailed password must sign in
//   onto "Change Password", with and without the fix.
//
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir2 PROBE_AGENT=u63a15 ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/users-import-existing-account-told-new-password/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u63a15 ONLY=ojs,omp node bin/probe.js all <this file>
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/u63a15/facts[-<run>]-<app>.json (password values are never recorded, only their shape)
const fs = require('fs');
const crypto = require('crypto');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql, outFile} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.env.NEIGHBOUR === '1' || process.env.NEIGHBOUR_ONLY === '1';
const NEIGHBOUR_ONLY = process.env.NEIGHBOUR_ONLY === '1';
const WHO = 'agallego';
const legacy = (u, p) => crypto.createHash('sha1').update(u + p).digest('hex');
const shape = (h) => (h ? `${h.slice(0, 7)}… (${h.length} chars)` : h);

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name === 'ops') { console.log('[ops] no Users XML Plugin: skipped'); return; }
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    // The stored password's full value is compared (not recorded) to show it did not change.
    const userRow = (u) => sql(app, `select username, substr(password,1,7), must_change_password, disabled from users where username = '${u}'`);
    const storedHash = (u) => sql(app, `select password from users where username = '${u}'`);
    const started = new Date();

    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    const pageErrors = [];
    const failed = [];
    page.on('pageerror', (e) => pageErrors.push(flat(e.message, 300)));
    page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page);
        const label = `${String(++n).padStart(2, '0')}-${name}`;
        record(label, s);
        await shot(page, label).catch(() => {});
        return s;
    };

    async function openTool(tab) {
        await page.goto(cu('/management/tools'));
        await idle(page);
        const link = page.getByRole('link', {name: 'Users XML Plugin', exact: true}).first();
        await link.waitFor({timeout: T});
        await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
        await page.locator('#importXmlForm').waitFor({timeout: T});
        await idle(page); await pause(500);
        if (tab) {
            await page.getByRole('tab', {name: tab}).first().click();
            await idle(page); await pause(500);
        }
    }

    async function importFile(file, key) {
        await openTool();
        const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
        await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
        await up;
        await page.waitForFunction(() => (document.querySelector('#importXmlForm #temporaryFileId') || {}).value, null, {timeout: T}).catch(() => {});
        await idle(page);
        const before = await page.locator('#importExportTabs [role="tab"]').count();
        const answered = page.waitForResponse((r) => /UserImportExportPlugin\/import\?/.test(r.url()), {timeout: 90_000}).catch(() => null);
        await page.locator('#importXmlForm').getByRole('button', {name: 'Import Users', exact: true}).click();
        const r = await answered;
        for (let i = 0; i < 30 && (await page.locator('#importExportTabs [role="tab"]').count()) === before; i++) await pause(300);
        await idle(page); await pause(1500);
        const panel = page.locator('#importExportTabs > [role="tabpanel"]:visible').first();
        const o = {importRequest: r ? r.status() : 'none', results: flat(await panel.innerText().catch(() => null), 3000)};
        await snap(`${key}-results`);
        return o;
    }

    async function tryLogin(username, password) {
        await signOut(page).catch(() => {});
        await page.goto(cu('/login'));
        await page.locator('input#username').waitFor({timeout: T});
        await page.locator('input#username').fill(username);
        await page.locator('input#password').evaluate((el) => el.removeAttribute('maxlength'));
        await page.locator('input#password').fill(password);
        await Promise.all([page.waitForLoadState('load').catch(() => {}), page.locator('form#login button[type="submit"]').click()]);
        await page.waitForURL((u) => !/\/login\/signIn$/.test(u.pathname), {timeout: 15_000}).catch(() => {});
        await pause(1500);
        const url = page.url().replace(/^https?:\/\/[^/]+/, '');
        const error = await page.locator('.pkp_form_error, .cmp_notification.warning, [role="alert"]').allInnerTexts().catch(() => []);
        const heading = await page.locator('h1').first().innerText().catch(() => null);
        return {url, signedIn: !/\/login/.test(url), heading: flat(heading, 200), error: error.map((e) => flat(e, 300)).filter(Boolean)};
    }

    async function mailTo(address, since = started) {
        await pause(3000);
        const res = await app.mail._search({to: address});
        const msgs = (res.messages || []).filter((m) => new Date(m.Created) >= since);
        const out = [];
        for (const m of msgs) {
            const full = await app.mail.fullMessage(m.ID);
            out.push({subject: m.Subject, from: m.From && m.From.Address, replyTo: (full.ReplyTo || []).map((x) => x.Address), text: full.Text || ''});
        }
        return out;
    }

    // Steps 5-8 for one file: import, results, mailbox, sign-in with the account's own password.
    async function importExisting(file, key) {
        const since = new Date();
        const hashBefore = storedHash(WHO);
        fact(`${key}: import`, await importFile(file, key));
        fact(`${key}: ${WHO} after import (database)`, {row: userRow(WHO), storedPasswordUnchanged: storedHash(WHO) === hashBefore});
        fact(`${key}: mail to ${WHO}`, (await mailTo(`${WHO}@mailinator.com`, since)).map((m) => ({subject: m.subject, from: m.from})));
        fact(`${key}: mail to the importing admin (pkpadmin@mailinator.com)`, (await mailTo('pkpadmin@mailinator.com', since)).map((m) => m.subject));
        const login = await tryLogin(WHO, WHO + WHO);
        await snap(`${key}-sign-in`);
        fact(`${key}: ${WHO} signs in with ${WHO}${WHO}`, login);
        await signOut(page).catch(() => {});
        await signIn(page, 'admin');
    }

    try {
        if (!NEIGHBOUR_ONLY) {
            fact(`${WHO} before`, userRow(WHO));
            // Step 1: sign in as admin; the PHP version from System Information.
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/en/admin/systemInfo'));
            await idle(page);
            const sys = await snap('system-information');
            fact('PHP version on screen', (flat(sys.text && sys.text.main, 20000) || '').match(/PHP version[^A-Za-z]*[\d.]+/i)?.[0] || '(not found)');

            // Steps 2-3: Tools › Users XML Plugin › Export Users; tick agallego; Export Users.
            await openTool('Export Users');
            const grid = page.locator('#exportXmlForm');
            const search = grid.locator('form#userSearchForm input[name="search"]');
            if (!(await search.isVisible().catch(() => false))) {
                await grid.getByRole('link', {name: 'Search'}).first().click().catch(() => {});
                await pause(500);
            }
            if (await search.isVisible().catch(() => false)) {
                await search.fill(WHO);
                await grid.locator('form#userSearchForm').getByRole('button', {name: 'Search'}).click();
                await idle(page); await pause(1000);
            }
            const row = grid.locator('tr.gridRow').filter({hasText: WHO}).first();
            await row.waitFor({timeout: T});
            await row.locator('input[type=checkbox]').check();
            await snap('export-ticked');
            const dlP = page.waitForEvent('download', {timeout: T});
            await grid.getByRole('button', {name: 'Export Users', exact: true}).click();
            const dl = await dlP;
            const file = outFile(`${WHO}-export.xml`);
            await dl.saveAs(file);
            const xml = fs.readFileSync(file, 'utf8');
            const pw = xml.match(/<password([^>]*)>\s*<value>([^<]*)<\/value>/);
            fact('export', {name: dl.suggestedFilename(), users: [...xml.matchAll(/<username>([^<]*)</g)].map((m) => m[1]), passwordAttrs: pw && pw[1].trim(), passwordValue: pw && shape(pw[2])});

            // Step 4: the file's <value> replaced with the older, unsalted sha1 form of the same password.
            const value = legacy(WHO, WHO + WHO);
            const edited = xml.replace(/(<password[^>]*>\s*<value>)[^<]*(<\/value>)/, `$1${value}$2`);
            const efile = outFile(`${WHO}-edited.xml`);
            fs.writeFileSync(efile, edited);
            fact('edited file', {value, passwordAttrs: (edited.match(/<password([^>]*)>/) || [])[1]});

            // Steps 5-8, path A (the edited file), then path B (the file as exported).
            await importExisting(efile, 'A-edited');
            await importExisting(file, 'B-as-exported');
        }

        if (NEIGHBOUR) {
            const showTitle = process.env.PKP_E2E_LINE === 'stable-3_5_0' ? '      <show_title>true</show_title>\n' : '';
            const u = 'u63a15n';
            const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd">\n' +
                '  <user_groups>\n    <user_group>\n      <role_id>1048576</role_id>\n      <context_id>1</context_id>\n      <is_default>true</is_default>\n' + showTitle + '      <permit_self_registration>true</permit_self_registration>\n      <permit_metadata_edit>false</permit_metadata_edit>\n      <name locale="en">Reader</name>\n      <abbrev locale="en">Read</abbrev>\n      <stage_assignments></stage_assignments>\n      <masthead>false</masthead>\n    </user_group>\n  </user_groups>\n' +
                `  <users>\n    <user>\n      <givenname locale="en">Ada</givenname>\n      <familyname locale="en">${u}</familyname>\n      <email>${u}@mailinator.com</email>\n      <username>${u}</username>\n      <password is_disabled="false" must_change="false" encryption="sha1">\n        <value>${legacy(u, u + u)}</value>\n      </password>\n      <date_registered>2020-01-02 03:04:05</date_registered>\n      <user_user_group>\n        <user_group_ref>Reader</user_group_ref>\n        <masthead>true</masthead>\n      </user_user_group>\n    </user>\n  </users>\n</PKPUsers>\n`;
            const nfile = outFile('u63a15-neighbour.xml');
            fs.writeFileSync(nfile, xml);
            await signIn(page, 'admin');
            fact('neighbour import', await importFile(nfile, 'neighbour-import'));
            fact('neighbour account (database)', userRow(u));
            fact(`${u} signs in with the file's password`, await tryLogin(u, u + u));
            const mails = await mailTo(`${u}@mailinator.com`);
            fact(`mail to ${u}`, mails.map((m) => ({subject: m.subject, from: m.from, replyTo: m.replyTo})));
            const mailed = mails.map((m) => (m.text.match(/Password:\s*(\S+)/i) || [])[1]).find(Boolean);
            if (mailed) {
                const l = await tryLogin(u, mailed);
                await snap('neighbour-mailed-password');
                fact(`${u} signs in with the mailed password`, l);
            }
            await signOut(page).catch(() => {});
        }
        fact('server errors (5xx)', failed);
        fact('page script errors', pageErrors);
    } finally {
        record('facts', facts);
        await close();
    }
});
