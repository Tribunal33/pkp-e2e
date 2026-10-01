// Issue report U53 A11, the invitation flow in French (Canada): does "Invite
// to a role" still send an invitation, and which codes does it show?
//
// On PKP's default test dataset (a dataset fleet), signed in as `rvaca`:
//   1  the initials menu › "français"; Settings › Users & Roles, "Users" tab.
//   2  the Invitations section's button (English "Invite to a role").
//   3  step 1 of the wizard: the address u53r42.invitee@mailinator.com, the
//      primary button (English "Search User").
//   4  step 2: the given name "u53r42 Invitee", the role "Section editor"
//      (by its French name), today as the start date, the primary button
//      (English "Save And Continue").
//   5  step 3: the email as composed, the primary button (English "Invite user
//      to the role"); the confirmation window and its button.
//   6  back on the "Users" tab: the new invitation's row, its "…" menu and the
//      menu's cancel item's window (closed with its non-destructive button).
// Every step records every `##key##` on the page (text and attributes,
// screen-reader text included) and the visible text. Locators are by
// structure, not by label, since the labels are what is being read.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_RUN=invite PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/users-french-raw-codes/invite.js
// INVITE_FROM_ROW=1 in front starts at step 6, on an install where the invitation was sent.
const {forEachApp, launch, signIn, screen, record, idle, rawKeys} = require('../../../probe');

const INVITEE = 'u53r42.invitee@mailinator.com';
const ROLE_FR = {ojs: 'Rédacteur-trice de rubrique', omp: /série/i, ops: /mod/i};
const flat = (s, n = 1500) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('invite.js drives a dataset fleet (fleet-prep --dataset)');
    const {expect} = require('@playwright/test');
    const {LanguageMenu} = require('../../../pages/LanguagesPages.js');
    const facts = {app: app.name, line: app.line, dataset: app.dataset, steps: {}, requests: [], startedAt: new Date().toISOString()};
    const {page, close} = await launch(app);
    page.on('response', (r) => {
        const u = r.url();
        if (/\/api\/v1\/invitations/.test(u) && r.request().method() !== 'GET') {
            facts.requests.push(`${r.request().method()} ${u.replace(/^.*\/api\/v1\//, '')} ${r.status()}`);
        }
    });
    page.on('pageerror', (e) => (facts.pageErrors = facts.pageErrors || []).push(String(e).slice(0, 300)));

    const keep = async (name, scope = 'body') => {
        await idle(page).catch(() => {});
        const raw = (await rawKeys(page, {scope}) || []).filter((x) => !/userAccess\.management\.options/.test(x));
        const text = flat(await page.locator(scope).first().innerText().catch(() => ''));
        facts.steps[name] = {url: page.url().replace(app.baseURL || '', ''), raw: [...new Set(raw.map((x) => x.replace(/ @ .*?\(/, ' (')))], text};
        record(name, await screen(page));
        console.log(`[${app.name}] ${name}: ${JSON.stringify(facts.steps[name].raw)}`);
    };
    const primary = () => page.locator('main button.bg-primary').last();

    try {
        // 1.
        await signIn(page, 'rvaca');
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial`));
        await idle(page);
        await new LanguageMenu(page).choose(/fran/i, 'fr_CA');
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/access`));
        await expect(page.locator('#users table tbody tr').first()).toBeVisible({timeout: 30_000});

        if (!process.env.INVITE_FROM_ROW) {
        // 2.
        await page.locator('#users button').filter({hasText: /inviteToRole|Inviter/}).first().click();
        await page.locator('input[name="search"]').waitFor({timeout: 30_000});
        await keep('wizard-1-search');

        // 3.
        await page.locator('input[name="search"]').fill(INVITEE);
        await primary().click();
        await page.locator('select[name*="userGroupId"]').first().waitFor({timeout: 30_000});
        await keep('wizard-2-details');

        // 4.
        await page.locator('input[name^="givenName"]').first().fill('u53r42 Invitee');
        const row = page.locator('tr').filter({has: page.locator('select[name*="userGroupId"]')}).last();
        await row.locator('select[name*="userGroupId"]').selectOption({label: ROLE_FR[app.name]}).catch(async () => {
            const opts = await row.locator('select[name*="userGroupId"] option').allInnerTexts();
            facts.roleOptions = opts;
            const want = opts.find((o) => (ROLE_FR[app.name] instanceof RegExp ? ROLE_FR[app.name].test(o) : o.trim() === ROLE_FR[app.name]));
            await row.locator('select[name*="userGroupId"]').selectOption({label: want.trim()});
        });
        await row.locator('input[name*="dateStart"]').fill(new Date().toISOString().slice(0, 10));
        const masthead = row.locator('select[name*="masthead"]');
        if (await masthead.count()) await masthead.selectOption({index: 1}).catch(() => {});
        await keep('wizard-2-filled');
        await primary().click();
        await page.locator('input[name="subject"], input[name*="subject"]').first().waitFor({timeout: 30_000});
        // The subject prefills from the email template in the interface language, when it has one.
        await expect(page.locator('input[name*="subject"]').first()).not.toHaveValue('', {timeout: 8_000}).catch(() => {});
        await sleep(500);
        facts.composeSubject = await page.locator('input[name*="subject"]').first().inputValue();
        facts.composeBody = flat(await page.frameLocator('iframe').first().locator('body').innerText().catch(() => null), 300);
        await keep('wizard-3-compose');

        // 5. Send the email as the compose step offers it (in French (Canada)
        // its subject and message open empty: the language has no text for the
        // invitation email); then the confirmation window and its button.
        await primary().click();
        const dialog = page.getByRole('dialog').last();
        await dialog.waitFor({timeout: 30_000});
        await sleep(500);
        facts.sentDialog = flat(await dialog.innerText());
        await keep('wizard-sent-dialog');
        await dialog.getByRole('button').last().click();
        await page.waitForURL(/management\/settings\/access/, {timeout: 30_000});
        await expect(page.locator('#users table tbody tr').first()).toBeVisible({timeout: 30_000});
        }

        // 6.
        const invRow = page.locator('#users table').first().locator('tbody tr').filter({hasText: INVITEE});
        await invRow.first().waitFor({timeout: 30_000});
        facts.invitationRow = flat(await invRow.first().innerText());
        facts.invitationRowButton = await invRow.first().locator('button').last().getAttribute('aria-label');
        await keep('users-tab-with-invitation', '#users');
        await invRow.first().locator('button').last().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10_000});
        facts.invitationMenu = (await page.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
        await keep('invitation-menu', '#users');
        await page.getByRole('menuitem').last().click();
        const cancelWin = page.getByRole('dialog').last();
        await cancelWin.waitFor({timeout: 10_000});
        await sleep(300);
        facts.cancelDialog = flat(await cancelWin.innerText());
        facts.cancelDialogButtons = (await cancelWin.getByRole('button').allInnerTexts()).map((t) => t.trim());
        await keep('cancel-dialog');
        await page.keyboard.press('Escape');
        await sleep(300);
        facts.stillListed = await invRow.count();
    } catch (e) {
        facts.error = String(e && e.stack || e).slice(0, 800);
        await keep('error').catch(() => {});
        throw e;
    } finally {
        record('facts', facts);
        console.log(JSON.stringify({app: app.name, line: app.line, requests: facts.requests, sentDialog: facts.sentDialog,
            composeSubject: facts.composeSubject, composeBody: facts.composeBody, sendEmpty: facts.sendEmpty, invitationRow: facts.invitationRow, invitationRowButton: facts.invitationRowButton, invitationMenu: facts.invitationMenu,
            cancelDialog: facts.cancelDialog, cancelDialogButtons: facts.cancelDialogButtons, pageErrors: facts.pageErrors,
            error: facts.error && facts.error.slice(0, 300)}, null, 1));
        await close();
    }
});
