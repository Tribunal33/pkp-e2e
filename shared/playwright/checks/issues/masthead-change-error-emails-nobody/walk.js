// Issue report U53 A14 (+ U06 OMP1, U56 OMP1): on a press or preprint server
// the masthead visibility change on a user's roles page ends in an "Error"
// dialog and no email, and the press's "Manage Emails" row for the masthead
// email cannot be edited. OJS is the control.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   1-7  rvaca: Users & Roles › David Buskins › Edit › masthead select changed
//        on his Series editor / Moderator / Section editor row › Confirm ›
//        reload › his mailbox.
//   8-9  rvaca: Settings › Workflow › Emails › "Add and edit templates" ›
//        "Edit" on "User Role Masthead Visibility Update Notification".
// Neighbour check (fix in and out): the Manage Emails list's rows, and on OPS
// that the masthead email stays off the list.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/masthead-change-error-emails-nobody/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, --feature issues-3_5 and
// PROBE_FEATURE=issues-3_5.
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff omp ops, reload
// the dataset, then in checkouts/omp and checkouts/ops
//   PKP_CONFIG_FILE=$PWD/config.test.ds1.inc.php php lib/pkp/tools/installEmailTemplate.php USER_ROLE_MASTHEAD_UPDATE
// (the dataset was built from the unfixed registry), walk, and
// node bin/try-fix.js revert omp ops. The neighbour check is facts.manageRows
// and facts.mastheadListed: the same rows with the fix in and out, and no
// masthead email on OPS's list.
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const ROLE = {ojs: 'Section editor', omp: 'Series editor', ops: 'Moderator'};
const EMAIL = 'dbuskins@mailinator.com';
const SUBJECT = 'Your journal masthead visibility has been updated';
const MASTHEAD_EMAIL = 'User Role Masthead Visibility Update Notification';
const LP = '.manageEmails__listPanel';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line, dataset: app.dataset, startedAt: new Date().toISOString()};
    const start = Date.now();
    facts.templateRowsBefore = sql(app, "SELECT count(*) FROM email_templates_default_data WHERE email_key = 'USER_ROLE_MASTHEAD_UPDATE'");
    const {page, close} = await launch(app);
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    try {
        // 1. Sign in as rvaca.
        await signIn(page, 'rvaca');
        // 2. Settings › Users & Roles.
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/access`));
        const users = page.getByRole('table', {name: /^Current Users \(/});
        await expect(users.locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
        await snap('01-users-roles');
        // 3. David Buskins' row › "…" › "Edit".
        const row = users.locator('tbody tr').filter({hasText: EMAIL});
        facts.rowCount = await row.count();
        await row.getByRole('button').last().click();
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
        await idle(page);
        await snap('03-edit-roles');
        // 4. The role row's masthead select.
        const roleRow = page.getByRole('row').filter({hasText: ROLE[app.name]}).filter({hasNot: page.getByLabel(/^Select a new role/)});
        const sel = roleRow.getByRole('combobox');
        facts.selectCount = await sel.count();
        facts.before = await sel.inputValue();
        facts.options = await sel.locator('option').allInnerTexts();
        const beforeLabel = await sel.locator('option:checked').innerText();
        facts.beforeLabel = beforeLabel.trim();
        const target = /Does not/.test(facts.beforeLabel) ? 'Appear on the masthead' : 'Does not appear on the masthead';
        facts.target = target;
        await sel.selectOption({label: target});
        // 5. "Confirm masthead visibility change" › "Confirm".
        const confirm = page.getByRole('dialog', {name: 'Confirm masthead visibility change'});
        await expect(confirm).toBeVisible({timeout: 30_000});
        facts.confirmText = (await snap('05-confirm')).text.dialog;
        const resp = page.waitForResponse((r) => r.url().includes('/masthead/'), {timeout: 30_000});
        await confirm.getByRole('button', {name: 'Confirm'}).click();
        const r = await resp;
        facts.mastheadRequest = {method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null,
            url: r.url().replace(app.baseURL, ''), status: r.status(), body: (await r.text().catch(() => '')).slice(0, 600)};
        await idle(page);
        await sleep(1000);
        const after = await snap('05-after-confirm');
        facts.afterConfirmDialog = after.text.dialog;
        const err = page.getByRole('dialog').filter({hasNotText: 'Confirm masthead'});
        facts.errorDialogs = await err.count();
        if (facts.errorDialogs) {
            await err.getByRole('button').first().click().catch(() => {});
            await idle(page);
        }
        facts.afterConfirmValue = await sel.inputValue().catch(() => null);
        // 6. Reload.
        await page.reload();
        await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
        await idle(page);
        await snap('06-reloaded');
        facts.afterReloadLabel = (await sel.locator('option:checked').innerText().catch(() => '')).trim();
        facts.dbMasthead = sql(app, `SELECT uug.masthead FROM user_user_groups uug JOIN users u ON u.user_id = uug.user_id WHERE u.username = 'dbuskins' AND uug.user_group_id IN (SELECT user_group_id FROM user_group_settings WHERE setting_name = 'name' AND setting_value = '${ROLE[app.name]}')`);
        // 7. dbuskins' mailbox: masthead emails since this walk started.
        let mails = [];
        const deadline = Date.now() + 20_000;
        while (Date.now() < deadline) {
            const res = await app.mail._search({to: EMAIL, subject: SUBJECT});
            mails = (res.messages || []).filter((m) => Date.parse(m.Created) >= start - 2000);
            if (mails.length) break;
            await sleep(1000);
        }
        facts.mastheadMails = [];
        for (const m of mails) {
            const full = await app.mail.fullMessage(m.ID);
            facts.mastheadMails.push({subject: full.Subject, from: full.From, created: m.Created, text: (full.Text || '').slice(0, 800)});
        }

        // 8. Settings › Workflow › Emails › "Add and edit templates".
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/workflow`));
        await idle(page);
        await page.getByRole('tab', {name: 'Emails', exact: true}).click();
        await idle(page);
        await page.getByRole('link', {name: 'Add and edit templates'}).click();
        await page.locator(`${LP} .listPanel__item`).first().waitFor({timeout: 30_000});
        await idle(page);
        const manage = await snap('08-manage-emails');
        facts.manageEmailsUrl = manage.url.replace(app.baseURL, '');
        facts.manageRows = await page.locator(`${LP} .listPanel__itemTitle`).allInnerTexts();
        facts.manageRows = facts.manageRows.map((t) => t.trim());
        facts.mastheadListed = facts.manageRows.includes(MASTHEAD_EMAIL);
        // 9. "Edit" on the masthead email.
        if (facts.mastheadListed) {
            const item = page.locator(`${LP} .listPanel__item`).filter({has: page.locator('.listPanel__itemTitle', {hasText: MASTHEAD_EMAIL})});
            const tr = page.waitForResponse((x) => /emailTemplates\/|mailables\//.test(x.url()), {timeout: 15_000}).catch(() => null);
            await item.getByRole('button', {name: /Edit/}).first().click();
            const t = await tr;
            facts.editRequest = t && {url: t.url().replace(app.baseURL, ''), status: t.status(), body: (await t.text().catch(() => '')).slice(0, 300)};
            await sleep(6000);
            const e = await snap('09-edit-masthead-email');
            facts.editDialog = e.text.dialog;
            facts.editTemplateOpen = await page.getByRole('dialog').filter({hasText: 'Edit Template'}).count();
            facts.spinnerVisible = await page.locator('[class*="pinner"]:visible').count();
            // Another row's "Edit" still answers?
            const other = page.locator(`${LP} .listPanel__item`).filter({has: page.locator('.listPanel__itemTitle', {hasText: 'User Role End Notification'})});
            facts.otherEditClickable = await other.getByRole('button', {name: /Edit/}).first().click({trial: true, timeout: 3000}).then(() => true).catch((x) => String(x.message).split('\n')[0].slice(0, 160));
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
