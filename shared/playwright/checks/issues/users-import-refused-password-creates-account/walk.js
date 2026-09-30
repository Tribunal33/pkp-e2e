// Issue report walk: docs/issues/users-import-refused-password-creates-account.md
// (spec U63 register A4). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own context `publicknowledge`, its manager `rvaca` and its author
// `zzedd`, on OJS and OMP (OPS has no Users XML Plugin).
//
// The kit builds nothing. The script writes the file the Steps give, then:
//   1 sign in as rvaca; 2 Tools › "Users XML Plugin"; 3 "Upload File";
//   4 "Import Users" (the "Results" tab's text and the request's status);
//   5 Settings › "Users & Roles" › "Users", search "u63a4"; 6 search "zzedd";
//   7 sign in as u63a4short with "abc"; 8 sign in as u63a4ok (control).
// After the Steps (not in them): the way round, u63a4short's own
// "Forgot your password?" (the reset email, its link, a new password, sign-in).
// Neighbours for the fix (NEIGHBOUR=1 takes them alone, walked with and
// without fix.diff): a file with a valid plain password (u63a4nb) and an md5
// password (u63a4md5, "stored another way": a new password is made and
// mailed, and the line says "The user has been imported.") must import as
// before, and the existing account `zzedd` given a valid plain password and
// the role Copyeditor must get the role as before.
//
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63a4 ONLY=ojs,omp node bin/probe.js all <this file>
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u63a4 ONLY=ojs,omp node bin/probe.js all <this file>
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/u63a4/facts[-<run>]-<app>.json
const fs = require('fs');
const crypto = require('crypto');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql, outFile} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.env.NEIGHBOUR === '1';

const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n<PKPUsers xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd">\n';
// stable-3_5_0's schema requires <show_title> after <is_default>; main's dropped it (the Steps' bracket).
const SHOW_TITLE = process.env.PKP_E2E_LINE === 'stable-3_5_0' ? '      <show_title>true</show_title>\n' : '';
const GROUPS = '  <user_groups>\n    <user_group>\n      <role_id>1048576</role_id>\n      <context_id>1</context_id>\n      <is_default>true</is_default>\n' + SHOW_TITLE + '      <permit_self_registration>true</permit_self_registration>\n      <permit_metadata_edit>false</permit_metadata_edit>\n      <name locale="en">Reader</name>\n      <abbrev locale="en">Read</abbrev>\n      <stage_assignments></stage_assignments>\n      <masthead>false</masthead>\n    </user_group>\n  </user_groups>\n';
const user = ({username, given = 'Ada', family = username, email = `${username}@mailinator.com`, password, encryption = null, role = 'Reader'}) =>
    `    <user>\n      <givenname locale="en">${given}</givenname>\n      <familyname locale="en">${family}</familyname>\n      <email>${email}</email>\n      <username>${username}</username>\n` +
    `      <password is_disabled="false" must_change="false"${encryption ? ` encryption="${encryption}"` : ''}>\n        <value>${password}</value>\n      </password>\n` +
    // <date_registered> is optional in the schema, but a user without it fails the whole import (not null in the database).
    '      <date_registered>2020-01-02 03:04:05</date_registered>\n' +
    `      <user_user_group>\n        <user_group_ref>${role}</user_group_ref>\n        <masthead>true</masthead>\n      </user_user_group>\n    </user>\n`;
const usersFile = (users) => `${HEAD}${GROUPS}  <users>\n${users.map(user).join('')}  </users>\n</PKPUsers>\n`;

const STEPS_FILE = {name: 'u63a4-passwords.xml', xml: usersFile([
    {username: 'u63a4short', password: 'abc'},
    {username: 'u63a4empty', password: ''},
    {username: 'zzedd', given: 'Zayan', family: 'Zedd', password: 'abc', role: 'Copyeditor'},
    {username: 'u63a4ok', password: 'u63a4oku63a4ok'},
])};
const NEIGHBOUR_FILE = {name: 'u63a4-neighbours.xml', xml: usersFile([
    {username: 'u63a4nb', password: 'u63a4nbu63a4nb'},
    {username: 'u63a4md5', password: crypto.createHash('md5').update('u63a4md5u63a4md5').digest('hex'), encryption: 'md5'},
    {username: 'zzedd', given: 'Zayan', family: 'Zedd', password: 'zzeddzzedd', role: 'Copyeditor'},
])};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name === 'ops') { console.log('[ops] no Users XML Plugin: skipped'); return; }
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, neighbour: NEIGHBOUR};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const accounts = () => sql(app, "select u.username || ' [' || coalesce(string_agg(s.setting_value, ', ' order by s.setting_value), '') || ']' from users u left join user_user_groups uug on uug.user_id = u.user_id left join user_group_settings s on s.user_group_id = uug.user_group_id and s.setting_name = 'name' and s.locale = 'en' where u.username like 'u63a4%' or u.username = 'zzedd' group by u.username order by u.username").split('\n').filter(Boolean);

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

    async function importFile(f) {
        const file = outFile(f.name);
        fs.writeFileSync(file, f.xml);
        // Step 2: side menu "Tools", then "Users XML Plugin".
        await page.goto(cu('/submissions'));
        await idle(page);
        const toolsLink = page.getByRole('navigation', {name: 'Site Navigation'}).getByRole('link', {name: 'Tools', exact: true});
        if (await toolsLink.count()) await Promise.all([page.waitForURL(/management\/tools/, {timeout: T}), toolsLink.first().click()]);
        else { await page.goto(cu('/management/tools')); facts.toolsTyped = true; }
        await idle(page);
        const link = page.getByRole('link', {name: 'Users XML Plugin', exact: true}).first();
        await link.waitFor({timeout: T});
        await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
        await page.locator('#importXmlForm').waitFor({timeout: T});
        await idle(page); await pause(500);
        // Step 3: "Upload File".
        const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
        await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
        const u = await up;
        await page.waitForFunction(() => (document.querySelector('#importXmlForm #temporaryFileId') || {}).value, null, {timeout: T}).catch(() => {});
        await idle(page);
        // Step 4: "Import Users".
        const before = await tabTitles();
        const answered = page.waitForResponse((r) => /UserImportExportPlugin\/import\?/.test(r.url()), {timeout: 90_000}).catch(() => null);
        await page.locator('#importXmlForm').getByRole('button', {name: 'Import Users', exact: true}).click();
        const r = await answered;
        for (let i = 0; i < 30 && (await tabTitles()).length === before.length; i++) await pause(300);
        await idle(page); await pause(1500);
        const panel = page.locator('#importExportTabs > [role="tabpanel"]:visible').first();
        const o = {upload: u ? u.status() : null, importRequest: r ? r.status() : 'none', resultsText: await panel.innerText().catch(() => null)};
        await snap(`${f.name.replace(/\.xml$/, '')}-results`);
        return o;
    }

    async function usersSearch(term) {
        // Steps 5-6: Settings › "Users & Roles" › "Users", search.
        await page.goto(cu('/management/settings/access'));
        await idle(page);
        const search = page.locator('main').getByRole('searchbox').or(page.locator('main input[type="search"]')).first();
        await search.waitFor({timeout: T}).catch(() => {});
        if (!(await search.count())) return '(no search box)';
        await search.fill(term); await search.press('Enter');
        await idle(page); await pause(1500);
        const text = flat(await page.locator('main').innerText().catch(() => null), 1200);
        await snap(`users-search-${term}`);
        return text.replace(/^.*?Current Users/, 'Current Users');
    }

    async function trySignIn(username, password) {
        // Steps 7-8: the sign-in page, typed.
        await signOut(page);
        await page.goto(app.url('/index.php/publicknowledge/en/login'));
        await idle(page);
        await page.locator('form#login input#username').fill(username);
        await page.locator('form#login input#password').fill(password);
        const nav = page.waitForURL((url) => !url.pathname.endsWith('/login'), {timeout: 10_000, waitUntil: 'commit'}).then(() => true).catch(() => false);
        await page.locator('form#login button[type="submit"]').click();
        const left = await nav;
        await idle(page);
        const s = await snap(`signin-${username}`);
        return {signedIn: left && !/\/login/.test(new URL(page.url()).pathname), url: page.url().replace(/^https?:\/\/[^/]+/, ''), text: flat(s.text && s.text.main, 300)};
    }

    async function wayRound() {
        // Not in the Steps: u63a4short resets the password through "Forgot your password?".
        await signOut(page);
        await page.goto(app.url('/index.php/publicknowledge/en/login'));
        await idle(page);
        const since = new Date();
        await page.getByRole('link', {name: 'Forgot your password?'}).click();
        await idle(page);
        await page.locator('input[name="email"]').fill('u63a4short@mailinator.com');
        await page.getByRole('button', {name: /Reset Password/i}).click();
        await idle(page);
        const o = {requested: flat((await screen(page)).text.main, 300)};
        const msg = await app.mail.find({to: 'u63a4short@mailinator.com', timeoutMs: 30_000}).catch((e) => ({error: e.message}));
        if (msg.error) return {...o, mail: msg.error};
        o.mailSubject = msg.Subject;
        o.mailAfterRequest = new Date(msg.Created) >= new Date(since.getTime() - 5000);
        const full = await app.mail.fullMessage(msg.ID);
        const href = (full.HTML || '').match(/href=["']([^"']*resetPassword[^"']*)["']/) || (full.Text || '').match(/(\S*resetPassword\S*)/);
        if (!href) return {...o, link: null};
        const url = new URL(href[1].replace(/&amp;/g, '&'));
        await page.goto(app.url(url.pathname + url.search));
        await idle(page);
        o.resetPage = flat((await snap('reset-page')).text.main, 400);
        const pw = page.locator('input[name="password"]');
        if (await pw.count()) {
            await pw.fill('u63a4resetu63a4reset');
            await page.locator('input[name="password2"]').fill('u63a4resetu63a4reset');
            await page.locator('main').getByRole('button').last().click();
            await idle(page);
            o.afterReset = flat((await snap('reset-done')).text.main, 300);
            o.signIn = await trySignIn('u63a4short', 'u63a4resetu63a4reset');
        }
        return o;
    }

    try {
        fact('accounts before', accounts());
        // Step 1: sign in as rvaca.
        await signIn(page, 'rvaca');
        if (!NEIGHBOUR) {
            fact('import', await importFile(STEPS_FILE));
            fact('search u63a4', await usersSearch('u63a4'));
            fact('search zzedd', await usersSearch('zzedd'));
            fact('accounts after', accounts());
            fact('signin u63a4short abc', await trySignIn('u63a4short', 'abc'));
            fact('signin u63a4ok', await trySignIn('u63a4ok', 'u63a4oku63a4ok'));
            if (accounts().some((a) => a.startsWith('u63a4short '))) fact('way round', await wayRound());
        } else {
            fact('neighbour import', await importFile(NEIGHBOUR_FILE));
            fact('accounts after', accounts());
            fact('md5 mail', await app.mail.find({to: 'u63a4md5@mailinator.com', timeoutMs: 20_000}).then((m) => m.Subject).catch((e) => e.message));
            fact('signin u63a4nb', await trySignIn('u63a4nb', 'u63a4nbu63a4nb'));
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
