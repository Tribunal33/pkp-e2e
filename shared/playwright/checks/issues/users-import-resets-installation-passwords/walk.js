// Issue report walk: docs/issues/U63-A16-users-import-resets-installation-passwords.md
// (spec U63 register A16). Takes the report's Steps through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), on its own
// context `publicknowledge`, as `admin`, on OJS and OMP (OPS has no Users XML Plugin).
// The server must run PHP older than 8.4 (the VM's system php is 8.3).
//
// The kit builds nothing. Steps:
//   1-2  sign in as admin; Administration › "System Information" (the PHP version)
//   3-4  Tools › "Users XML Plugin" › "Export Users": tick agallego, "Export Users" (the file)
//   5    Settings › "Users & Roles" › "Users": agallego's row menu › "Merge User" › amccrae's "Settings" › "Merge into this User", OK
//   6-7  Tools › "Users XML Plugin" › "Import Users": upload the file, "Import Users"; the "Results" tab
//   8    sign out; sign in as agallego / agallegoagallego
//   9    agallego@mailinator.com's mailbox; the mailed password on the sign-in form
// The other password forms (NEIGHBOUR=1 adds them; NEIGHBOUR_ONLY=1 takes them alone), for the fix trial:
//   a users file a person writes with three new accounts: u63a16p (a plain-text password),
//   u63a16m (an md5 value, encryption="md5") and u63a16t (a bcrypt hash at cost 10,
//   encryption="sha1", as older installations stored). Each signs in with the file's password or not,
//   gets mail or not; the stored hashes are read after the sign-ins (a sign-in raises a cost-10 hash to 12).
//   u63a16m then takes its mailed password through the forced "Change Password" form. Last, dbarnes
//   signs in. With the fix, u63a16p and u63a16t must keep their passwords and u63a16m must still be replaced.
//
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir3 --dataset 3 --reset
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir3 PROBE_AGENT=u63a16 ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/users-import-resets-installation-passwords/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u63a16 ONLY=ojs,omp node bin/probe.js all <this file>
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/u63a16/facts[-<run>]-<app>.json (password values are never recorded, only their shape)
const fs = require('fs');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql, outFile} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.env.NEIGHBOUR === '1' || process.env.NEIGHBOUR_ONLY === '1';
const NEIGHBOUR_ONLY = process.env.NEIGHBOUR_ONLY === '1';
const WHO = 'agallego';
const INTO = 'amccrae';
const shape = (h) => (h ? `${h.slice(0, 7)}… (${h.length} chars)` : h);

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name === 'ops') { console.log('[ops] no Users XML Plugin: skipped'); return; }
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const userRow = (u) => sql(app, `select username, substr(password,1,7), must_change_password, disabled from users where username = '${u}'`);
    const started = new Date();

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

    // Sign in through the login form; return where it lands or the form's error.
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

    // Messages to a dataset user since the walk began, newest first: subject, sender, and the body's text.
    async function mailTo(address) {
        await pause(3000);
        const res = await app.mail._search({to: address});
        const msgs = (res.messages || []).filter((m) => new Date(m.Created) >= started);
        const out = [];
        for (const m of msgs) {
            const full = await app.mail.fullMessage(m.ID);
            out.push({subject: m.Subject, from: m.From && m.From.Address, replyTo: (full.ReplyTo || []).map((x) => x.Address), text: full.Text || ''});
        }
        return out;
    }

    try {
        if (!NEIGHBOUR_ONLY) {
            fact(`${WHO} before`, userRow(WHO));
            // Step 1: sign in as admin.
            await signIn(page, 'admin');
            // Step 2: Administration › System Information.
            await page.goto(app.url('/index.php/index/en/admin/systemInfo'));
            await idle(page);
            const sys = await snap('system-information');
            fact('PHP version on screen', (flat(sys.text && sys.text.main, 20000) || '').match(/PHP version[^A-Za-z]*[\d.]+/i)?.[0] || '(not found)');

            // Steps 3-4: Tools › Users XML Plugin › Export Users; tick agallego; Export Users.
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
            fact('export', {name: dl.suggestedFilename(), users: [...xml.matchAll(/<username>([^<]*)</g)].map((m) => m[1]), passwordAttrs: pw && pw[1].trim(), passwordValue: pw && shape(pw[2]), storedHashShape: shape(sql(app, `select password from users where username='${WHO}'`))});

            // Step 5: Settings › Users & Roles › Users: agallego › Merge User › amccrae › Merge User; OK.
            await page.goto(cu('/management/settings/access'));
            await idle(page);
            const box = page.locator('main').getByRole('searchbox').or(page.locator('main input[type="search"]')).first();
            if (await box.count()) { await box.fill(WHO); await box.press('Enter'); await idle(page); await pause(1500); }
            const urow = page.locator('main table tr').filter({hasText: WHO}).first();
            await urow.waitFor({timeout: T});
            await urow.locator('button').last().click();
            await pause(400);
            await page.getByRole('menuitem', {name: /Merge User/i}).click();
            const dlg = page.getByRole('dialog', {name: 'Merge user'});
            await dlg.waitFor({timeout: T});
            await idle(page); await pause(800);
            const dsearch = dlg.locator('input[name="search"]').first();
            if (await dsearch.isVisible().catch(() => false)) {
                await dsearch.fill(INTO);
                await dlg.getByRole('button', {name: 'Search'}).first().click();
                await idle(page); await pause(1000);
            }
            await snap('merge-window');
            const target = dlg.getByRole('row').filter({hasText: INTO}).first();
            await target.waitFor({timeout: T});
            await target.getByRole('link', {name: 'Settings'}).click();
            await pause(500);
            const controls = target.locator('xpath=following-sibling::tr[1]');
            fact('merge window: the row\'s actions', (await controls.getByRole('link').allInnerTexts().catch(() => [])).map((x) => x.trim()).filter(Boolean));
            const act = controls.getByRole('link', {name: /Merge/i}).first();
            await act.click();
            await pause(600);
            const confirm = page.locator('[role="dialog"]:visible').last();
            const confirmText = flat(await confirm.innerText().catch(() => ''), 500);
            const mergeResp = page.waitForResponse((r) => r.request().method() !== 'GET' && /merge/i.test(r.url()), {timeout: T}).catch(() => null);
            await confirm.getByRole('button', {name: /^(OK|Yes|Merge|Merge User|Confirm)$/}).first().click();
            const mr = await mergeResp;
            await idle(page); await pause(1500);
            await snap('after-merge');
            fact('merge', {confirm: confirmText, request: mr ? mr.status() : 'none', accountRow: userRow(WHO) || '(no account)'});

            // Steps 6-7: import the exported file; the Results tab.
            fact('import', await importFile(file, 'import'));
            fact(`${WHO} after import (database)`, userRow(WHO));

            // Step 8: sign in as agallego with agallegoagallego.
            const login1 = await tryLogin(WHO, WHO + WHO);
            await snap('sign-in-file-password');
            fact(`${WHO} signs in with the file's password`, login1);

            // Step 9: the mailbox; the mailed password on the sign-in form.
            const mails = await mailTo(`${WHO}@mailinator.com`);
            fact(`mail to ${WHO}`, mails.map((m) => ({subject: m.subject, from: m.from, replyTo: m.replyTo, text: flat(m.text.replace(/(Password:\s*)\S+/i, '$1<redacted>'), 800)})));
            const mailed = mails.map((m) => (m.text.match(/Password:\s*(\S+)/i) || [])[1]).find(Boolean);
            if (mailed) {
                const login2 = await tryLogin(WHO, mailed);
                await snap('sign-in-mailed-password');
                fact(`${WHO} signs in with the mailed password`, login2);
            }
            await signOut(page).catch(() => {});
        }

        if (NEIGHBOUR) {
            // The other password forms: a users file with three new accounts, written as a person would write one.
            const showTitle = process.env.PKP_E2E_LINE === 'stable-3_5_0' ? '      <show_title>true</show_title>\n' : '';
            const cost10 = execFileSync('php', ['-r', 'echo password_hash("u63a16tu63a16t", PASSWORD_BCRYPT, ["cost" => 10]);']).toString();
            const md5 = require('crypto').createHash('md5').update('u63a16m' + 'u63a16mu63a16m').digest('hex');
            const user = (u, attrs, value) => `    <user>\n      <givenname locale="en">Ada</givenname>\n      <familyname locale="en">${u}</familyname>\n      <email>${u}@mailinator.com</email>\n      <username>${u}</username>\n      <password is_disabled="false" must_change="false"${attrs}>\n        <value>${value}</value>\n      </password>\n      <date_registered>2020-01-02 03:04:05</date_registered>\n      <user_user_group>\n        <user_group_ref>Reader</user_group_ref>\n        <masthead>true</masthead>\n      </user_user_group>\n    </user>\n`;
            const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd">\n' +
                '  <user_groups>\n    <user_group>\n      <role_id>1048576</role_id>\n      <context_id>1</context_id>\n      <is_default>true</is_default>\n' + showTitle + '      <permit_self_registration>true</permit_self_registration>\n      <permit_metadata_edit>false</permit_metadata_edit>\n      <name locale="en">Reader</name>\n      <abbrev locale="en">Read</abbrev>\n      <stage_assignments></stage_assignments>\n      <masthead>false</masthead>\n    </user_group>\n  </user_groups>\n' +
                '  <users>\n' + user('u63a16p', '', 'u63a16pu63a16p') + user('u63a16m', ' encryption="md5"', md5) + user('u63a16t', ' encryption="sha1"', cost10) + '  </users>\n</PKPUsers>\n';
            const nfile = outFile('u63a16-neighbours.xml');
            fs.writeFileSync(nfile, xml);
            await signIn(page, 'admin');
            fact('neighbour import', await importFile(nfile, 'neighbour-import'));
            fact('neighbour accounts (database)', sql(app, "select username, substr(password,1,7), must_change_password from users where username like 'u63a16%' order by username"));
            for (const u of ['u63a16p', 'u63a16m', 'u63a16t']) fact(`${u} signs in with the file's password`, await tryLogin(u, u + u));
            for (const u of ['u63a16p', 'u63a16m', 'u63a16t']) fact(`mail to ${u}`, (await mailTo(`${u}@mailinator.com`)).map((m) => m.subject));
            // The md5 account's mailed password, then the forced "Change Password" form, whose current-password
            // check is Validation::checkCredentials() › verifyPassword(), the other caller of the fix's helper.
            const mm = (await mailTo('u63a16m@mailinator.com')).map((m) => (m.text.match(/Password:\s*(\S+)/i) || [])[1]).find(Boolean);
            if (mm) {
                const l = await tryLogin('u63a16m', mm);
                const o = {landed: l.url};
                if (/changePassword/.test(l.url)) {
                    for (const [name, v] of [['oldPassword', mm], ['password', 'u63a16mNew2026'], ['password2', 'u63a16mNew2026']]) {
                        const f = page.locator(`input[name="${name}"]`);
                        await f.evaluate((el) => el.removeAttribute('maxlength'));
                        await f.fill(v);
                    }
                    await Promise.all([page.waitForLoadState('load').catch(() => {}), page.locator('form button[type="submit"]').first().click()]);
                    await pause(2000);
                    o.after = page.url().replace(/^https?:\/\/[^/]+/, '');
                    o.errors = (await page.locator('.pkp_form_error, .error, [role="alert"]').allInnerTexts().catch(() => [])).map((e) => flat(e, 200)).filter(Boolean);
                    await snap('neighbour-change-password');
                    o.newPassword = await tryLogin('u63a16m', 'u63a16mNew2026');
                }
                fact('u63a16m: the mailed password, then Change Password', o);
            }
            fact('the file accounts after their sign-ins (database)', sql(app, "select username, substr(password,1,7), must_change_password from users where username like 'u63a16%' order by username"));
            fact('dbarnes signs in with dbarnesdbarnes', await tryLogin('dbarnes', 'dbarnesdbarnes'));
            await signOut(page).catch(() => {});
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
