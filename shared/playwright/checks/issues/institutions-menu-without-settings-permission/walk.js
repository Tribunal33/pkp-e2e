// Issue report walk: docs/issues/3-institutions-menu-without-settings-permission.md
// (spec U66 register A1). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own context `publicknowledge` and its own users: `admin` (site
// administrator), `rvaca` (the manager), `dbarnes` (Journal editor / Press
// editor) and, on a preprint server, `dbuskins` (Moderator).
//
// The kit builds nothing. Everything goes through the screens:
//   precondition: as admin, Administration › Site Settings › Statistics,
//      "Enable institutional statistics", "Save"; as rvaca, Settings ›
//      Distribution › Statistics, the same box, "Save"
//   journal, press: as rvaca, Roles › "Journal editor" / "Press editor" ›
//      "Edit", untick "Permit changes to Settings", "OK"
//   preprint server: as rvaca, Roles › "Create New Role" (Manager level,
//      "Associate Manager <tag>", "AM"), Users › "Invite to a role" for
//      dbuskins@mailinator.com, and dbuskins accepts from the emailed link
//   control: rvaca's side menu, "Institutions" pressed
//   steps: dbarnes (dbuskins on OPS) signs in, the side menu is read,
//      "Institutions" pressed; then Settings › Website by its address
// Records every screen with screen().
//
// Reset first:  npm run fleet-prep -- --feature issues-rv3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-rv3 PROBE_AGENT=rv3 node bin/probe.js all shared/playwright/checks/issues/institutions-menu-without-settings-permission/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-rv3-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-rv3-3_5 PROBE_AGENT=rv3 node bin/probe.js all shared/playwright/checks/issues/institutions-menu-without-settings-permission/walk.js
// Facts: .reports/<feature>/rv3/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, tag, drainJobs} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const DENIED = /The current role does not have access to this operation\./;
const today = () => new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());

forEachApp(async (app) => {
    const ops = app.name === 'ops';
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const t = tag('u66');
    const path = app.contextPath; // publicknowledge
    const second = ops ? 'dbuskins' : 'dbarnes';
    fact('fleet', {line: app.line, dataset: app.dataset, context: path, tag: t});
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
        if (label !== 'rvaca') await shot(page, `${label}-institutions-pressed`);
    }
    async function statsBox(url, label) {
        await page.goto(url);
        await idle(page);
        await page.locator('#setup-button').first().click().catch(() => {});
        await page.locator('#statistics-button').first().click();
        const panel = page.locator('#statistics');
        await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page); await pause(400);
        const tabs = await page.locator('[role="tab"]').evaluateAll((es) => es.map((e) => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
        const box = panel.getByLabel('Enable institutional statistics', {exact: true});
        const was = await box.isChecked();
        if (!was) {
            await box.check();
            const w = page.waitForResponse((r) => /api\/v1\/(site|contexts)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await panel.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
            fact(`${label} statistics box ticked`, {tabs, status: r ? r.status() : null, saved});
        } else {
            fact(`${label} statistics box already ticked`, {tabs});
        }
        await snap(`${label}-statistics`);
    }
    async function rolesTab() {
        await page.goto(cu('/management/settings/access'));
        await idle(page);
        await page.locator('#roles-button').first().click();
        await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: T});
        await idle(page);
    }
    try {
        // Precondition: the site's box, as the Site Administrator.
        await signIn(page, 'admin');
        await statsBox(app.url('/index.php/index/en/admin/settings'), 'site');
        // Precondition: the context's box, as the manager.
        await signIn(page, 'rvaca', {contextPath: path});
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
            const roleName = `Associate Manager ${t}`;
            await page.locator('#roleGridContainer').getByRole('link', {name: 'Create New Role'}).click();
            const form = page.locator('form#userGroupForm');
            await form.waitFor({state: 'visible', timeout: T});
            await idle(page); await pause(400);
            const levels = await form.locator('select[name="roleId"] option').evaluateAll((os) => os.map((o) => ({v: o.value, t: o.textContent.trim()})));
            await form.locator('select[name="roleId"]').selectOption('16');
            await pause(600);
            await form.locator('input[name="name[en]"]').fill(roleName);
            await form.locator('input[name="abbrev[en]"]').fill('AM');
            const box = form.locator('input[name="permitSettings"]');
            fact('new role window', {levels, permitSettings: (await box.count()) ? {checked: await box.isChecked(), disabled: await box.isDisabled()} : 'absent'});
            await snap('new-role-window');
            await form.getByRole('button', {name: 'OK', exact: true}).click();
            await form.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page); await pause(600);
            // Invite dbuskins to it.
            await page.goto(cu('/management/settings/access'));
            await idle(page);
            await page.getByRole('button', {name: 'Invite to a role'}).click();
            await page.getByLabel(/Search for a user by email address/).fill('dbuskins@mailinator.com');
            await page.getByRole('button', {name: 'Search User', exact: true}).click();
            const newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).first();
            await newRow.waitFor({timeout: T});
            await idle(page);
            await newRow.getByRole('combobox').first().selectOption({label: roleName});
            await newRow.getByRole('textbox').fill(today());
            await newRow.getByRole('combobox').last().selectOption({index: 1});
            await snap('invite-details');
            await page.getByRole('button', {name: 'Save And Continue'}).click();
            await page.locator('input[name="subject"]').waitFor({timeout: T});
            await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
            await page.getByRole('button', {name: 'Invite user to the role'}).click();
            await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T});
            await snap('invitation-sent');
            // The dataset runs its jobs on web requests; drainJobs only if the mail is late.
            let msg = await app.mail.find({to: 'dbuskins@mailinator.com', contains: t, timeoutMs: 15_000}).catch(() => null);
            if (!msg) { await drainJobs(app); msg = await app.mail.find({to: 'dbuskins@mailinator.com', contains: t}); fact('mail needed drainJobs', true); }
            const full = await app.mail.fullMessage(msg.ID);
            const accept = app.mail.extractLink(full.HTML, 'Accept Invitation');
            fact('invitation email', {subject: full.Subject, accept: accept && accept.replace(/key=[^&]+/, 'key=…')});
            // dbuskins, signed out, accepts from the emailed link.
            await signOut(page);
            await page.goto(accept.replace(/^https?:\/\/[^/]+/, app.baseURL));
            await idle(page);
            const acceptBtn = page.getByRole('button', {name: /^Accept And Continue to/});
            await acceptBtn.waitFor({timeout: T});
            await snap('accept-review');
            fact('accept button', await acceptBtn.innerText());
            await acceptBtn.click();
            await page.getByRole('dialog').filter({hasText: /assigned a new role/}).waitFor({timeout: T});
            await snap('accepted');
        }
        // Control: the manager.
        await signIn(page, 'rvaca', {contextPath: path});
        await menuAndPress('rvaca');
        // The steps: the role without the permission.
        await signIn(page, second, {contextPath: path});
        await menuAndPress(second);
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
        record('facts', facts);
        await close();
    }
});
