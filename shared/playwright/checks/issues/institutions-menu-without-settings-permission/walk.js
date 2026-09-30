// Issue report walk: docs/issues/3-institutions-menu-without-settings-permission.md
// (spec U66 register A1). Takes the report's Steps through the screens. The
// kit creates a scratch journal, press or preprint server (tag u66ir3, one
// per run and app) with its accounts: a manager, and on a journal and a press
// a Journal editor / Press editor, on a preprint server an Author. Everything
// else is done on screen: the site's and the context's "Enable institutional
// statistics", the editor role's "Permit changes to Settings" unticked
// (journal, press), and on a preprint server a new manager-level role created
// on Roles, offered to the Author by "Invite to a role" and accepted from the
// emailed link. Records every screen with screen().
//
// Run:
//   PROBE_FEATURE=issues PROBE_AGENT=ir3 node bin/probe.js all shared/playwright/checks/issues/institutions-menu-without-settings-permission/walk.js
//   stable-3_5_0: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front of the same command.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, tag, drainJobs} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const DENIED = /The current role does not have access to this operation\./;
const today = () => new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());

forEachApp(async (app) => {
    const ops = app.name === 'ops';
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const t = tag('u66ir3');
    const second = ops ? 'mo' : 'ed';
    const ctx = await app.api.createContext({tag: t, users: [
        {username: `${t}mg`, roles: ['manager'], givenName: 'Maya', familyName: 'Manager'},
        ops ? {username: `${t}mo`, roles: ['author'], givenName: 'Mo', familyName: 'Member'}
            : {username: `${t}ed`, roles: ['editor'], givenName: 'Eddie', familyName: 'Editor'},
    ]});
    const path = ctx.path || t;
    fact('context', path);
    const cu = (p) => app.url(`/index.php/${path}/en${p}`);
    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name) {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        return s;
    }
    async function readNav() {
        const nav = page.getByRole('navigation', {name: 'Site Navigation'});
        if (!(await nav.count().catch(() => 0))) return {present: false};
        return nav.first().evaluate((el) => {
            const tx = (e) => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim();
            const groups = [...el.querySelectorAll('[role="button"][aria-controls]')].map(tx);
            const links = [...el.querySelectorAll('a')].map((a) => ({text: tx(a), href: (a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}));
            return {
                present: true,
                groups,
                settings: groups.includes('Settings'),
                institutions: links.some((l) => /management\/settings\/institutions/.test(l.href)),
                entries: [...groups, ...links.map((l) => l.text)].filter((x, i, a) => x && a.indexOf(x) === i),
            };
        });
    }
    async function menuAndPress(label) {
        await page.goto(cu('/submissions'));
        await idle(page); await pause(400);
        const menu = await readNav();
        await snap(`${label}-menu`);
        fact(`${label} side menu`, menu);
        if (!menu.institutions) return;
        const link = page.getByRole('navigation', {name: 'Site Navigation'}).locator('a[href*="management/settings/institutions"]').first();
        const before = page.url();
        await Promise.all([page.waitForURL((u) => u.href !== before, {timeout: T}), link.click()]);
        await idle(page); await pause(400);
        const s = await snap(`${label}-institutions-pressed`);
        const txt = `${s.text.main || ''} ${s.text.dialog || ''}`;
        fact(`${label} pressed Institutions`, {
            url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            denied: DENIED.test(txt),
            h1: await page.locator('main h1, h1').first().innerText().catch(() => null),
            addInstitution: await page.getByRole('button', {name: 'Add Institution', exact: true}).count(),
        });
        if (label.endsWith('editor') || label.endsWith('member')) await shot(page, `${label}-institutions-pressed`);
    }
    async function statsBox(url, label) {
        await page.goto(url);
        await idle(page);
        await page.locator('#setup-button').first().click().catch(() => {});
        await page.locator('#statistics-button').first().click();
        const panel = page.locator('#statistics');
        await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page); await pause(400);
        const box = panel.getByLabel('Enable institutional statistics', {exact: true});
        const was = await box.isChecked();
        if (!was) {
            await box.check();
            const w = page.waitForResponse((r) => /api\/v1\/(site|contexts)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await panel.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
            fact(`${label} statistics box ticked`, {status: r ? r.status() : null, saved});
        } else {
            fact(`${label} statistics box already ticked`, true);
        }
        await snap(`${label}-statistics`);
        return was;
    }
    async function rolesTab() {
        await page.goto(cu('/management/settings/access'));
        await idle(page);
        await page.locator('#roles-button').first().click();
        await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: T});
        await idle(page);
    }
    let siteWas = true;
    try {
        // Site Administrator: the site's box.
        await signIn(page, 'admin');
        siteWas = await statsBox(app.url('/index.php/index/en/admin/settings'), 'site');
        // Manager: the context's box.
        await signIn(page, `${t}mg`, {contextPath: path});
        await statsBox(cu('/management/settings/distribution'), 'context');
        await rolesTab();
        if (!ops) {
            // Untick "Permit changes to Settings" on the editor role.
            const roleName = app.name === 'omp' ? 'Press editor' : 'Journal editor';
            const row = page.locator('#roleGridContainer tr.gridRow').filter({has: page.locator('[id$="-name"] .label', {hasText: new RegExp(`^\\s*${roleName}\\s*$`)})}).first();
            await row.locator('a.show_extras').click();
            await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
            const form = page.locator('form#userGroupForm');
            await form.waitFor({state: 'visible', timeout: T});
            await idle(page); await pause(400);
            const box = form.locator('input[name="permitSettings"]');
            fact('role window', {role: roleName, permitBefore: await box.isChecked(), label: await form.getByText('Permit changes to Settings').first().innerText().catch(() => null)});
            await box.uncheck();
            await snap('role-window-unticked');
            await form.getByRole('button', {name: 'OK', exact: true}).click();
            await form.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page); await pause(600);
        } else {
            // A new role at the manager level.
            await page.locator('#roleGridContainer').getByRole('link', {name: 'Create New Role'}).click();
            const form = page.locator('form#userGroupForm');
            await form.waitFor({state: 'visible', timeout: T});
            await idle(page); await pause(400);
            const levels = await form.locator('select[name="roleId"] option').evaluateAll((os) => os.map((o) => ({v: o.value, t: o.textContent.trim()})));
            await form.locator('select[name="roleId"]').selectOption('16');
            await pause(600);
            await form.locator('input[name="name[en]"]').fill('Associate Manager');
            await form.locator('input[name="abbrev[en]"]').fill('AM');
            const box = form.locator('input[name="permitSettings"]');
            fact('new role window', {levels, permitSettings: (await box.count()) ? {checked: await box.isChecked(), disabled: await box.isDisabled()} : 'absent'});
            await snap('new-role-window');
            await form.getByRole('button', {name: 'OK', exact: true}).click();
            await form.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page); await pause(600);
            // Invite the Author to it.
            await page.goto(cu('/management/settings/access'));
            await idle(page);
            await page.getByRole('button', {name: 'Invite to a role'}).click();
            await page.getByLabel(/Search for a user by email address/).fill(`${t}mo@mail.test`);
            await page.getByRole('button', {name: 'Search User', exact: true}).click();
            const newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).first();
            await newRow.waitFor({timeout: T});
            await idle(page);
            await newRow.getByRole('combobox').first().selectOption({label: 'Associate Manager'});
            await newRow.getByRole('textbox').fill(today());
            await newRow.getByRole('combobox').last().selectOption({index: 1});
            await snap('invite-details');
            await page.getByRole('button', {name: 'Save And Continue'}).click();
            await page.locator('input[name="subject"]').waitFor({timeout: T});
            await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
            await page.getByRole('button', {name: 'Invite user to the role'}).click();
            await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T});
            await snap('invitation-sent');
            let msg = await app.mail.find({to: `${t}mo@mail.test`, timeoutMs: 10_000}).catch(() => null);
            if (!msg) { await drainJobs(app); msg = await app.mail.find({to: `${t}mo@mail.test`}); }
            const full = await app.mail.fullMessage(msg.ID);
            const accept = app.mail.extractLink(full.HTML, 'Accept Invitation');
            fact('invitation email', {subject: full.Subject, accept: accept && accept.replace(/key=[^&]+/, 'key=…')});
            // Mo, signed out, accepts from the emailed link.
            await signOut(page);
            await page.goto(accept.replace(/^https?:\/\/[^/]+/, app.baseURL));
            await idle(page);
            const acceptBtn = page.getByRole('button', {name: /^Accept And Continue to/});
            await acceptBtn.waitFor({timeout: T});
            await snap('accept-review');
            await acceptBtn.click();
            await page.getByRole('dialog').filter({hasText: /assigned a new role/}).waitFor({timeout: T});
            await snap('accepted');
        }
        // Control: the manager.
        await signIn(page, `${t}mg`, {contextPath: path});
        await menuAndPress('manager');
        // The steps: the role without the permission.
        await signIn(page, `${t}${second}`, {contextPath: path});
        await menuAndPress(ops ? 'member' : 'editor');
        // The Settings pages refuse the same user (the rule the entry should follow).
        await page.goto(cu('/management/settings/website'));
        await idle(page);
        const sw = await snap(`${second}-settings-website`);
        fact(`${second} Settings › Website by address`, {denied: DENIED.test(`${sw.text.main || ''}`)});
    } catch (err) {
        fact('ERROR', String(err.stack || err).slice(0, 1200));
        await snap('ERROR').catch(() => {});
        await shot(page, 'ERROR').catch(() => {});
        throw err;
    } finally {
        if (!siteWas) fact('site box put back', await app.api.setSite({enableInstitutionUsageStats: false}).then(() => 'unticked').catch((e) => e.message));
        record('facts', facts);
        await close();
    }
});
