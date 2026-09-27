// U06 Ks27 sweep, run after ks27.js (reads its facts-<app>.json for the
// French-only invitee's accept link):
//   1. "Search User" with text that is no email address: what the Email box holds.
//   2. The French-only invitee's accept wizard "Enter details": the name boxes.
//   PART=2: 5. Reviewer in the role row; 6. the existing member accepts.
//   4. An existing member's accept link, opened and left (the steps line).
//   3. Leaving the send wizard with a name typed and unsaved: "Cancel", then
//      a typed address (goto) away from a second walk.
// Run: PROBE_FEATURE=U06 PROBE_AGENT=ccInvs27 node bin/probe.js all shared/playwright/checks/U06/Ks27/sweep.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, record, idle, outDir} = require('../../../probe');

const ACR = {ojs: 'OJS', omp: 'OMP', ops: 'OPS'};

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const facts = JSON.parse(fs.readFileSync(path.join(outDir(), `facts-${app.name}.json`), 'utf8'));
    const S = facts.contexts.S;
    const T = facts.tag;
    const out = {app: app.name};
    const snap = async (page, name) => { const s = await screen(page); record(`sweep-${name}`, s); return s; };
    const {page, close} = await launch(app);
    const {page: vp, close: closeV} = await launch(app);
    try {
        await signIn(page, `mgr${T}`);
        if (process.env.PART === '2') {
            // 5. Scenario 1's aside: Reviewer picked in the role row (masthead cell).
            const reviewer = {ojs: 'Reviewer', omp: 'External Reviewer', ops: null}[app.name];
            await page.goto(`/index.php/${S}/management/settings/access`);
            await page.getByRole('button', {name: 'Invite to a role'}).click();
            await page.getByLabel(/Search for a user by email address/).fill(`rcpt${T}r@mail.test`);
            await page.getByRole('button', {name: 'Search User', exact: true}).click();
            await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            const row = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
            out.roleOptions = await row.getByLabel(/^Select a new role/).locator('option').allInnerTexts();
            if (reviewer && out.roleOptions.includes(reviewer)) {
                await row.getByLabel(/^Select a new role/).selectOption({label: reviewer});
                await idle(page);
                const r = await snap(page, 'reviewer-row');
                out.reviewerRow = {text: await row.innerText(), comboboxes: await row.getByRole('combobox').count(),
                    aria: (r.aria.main.match(/row "Select a new role[^\n]*/) || [null])[0]};
            }
            // 6. The existing member (Mira) accepts the pending invitation from ks27.js.
            if (facts.existing && facts.existing.mail && facts.existing.mail.accept) {
                await vp.goto(facts.existing.mail.accept);
                await expect(vp.getByRole('heading', {name: /Review & create account/})).toBeVisible({timeout: 30_000});
                await vp.getByRole('button', {name: new RegExp(`Accept And Continue to ${ACR[app.name]}`)}).click();
                await expect(vp.getByRole('dialog')).toBeVisible({timeout: 30_000});
                const d = await snap(vp, 'existing-member-accepted');
                out.existingAccepted = d.text.dialog;
                await page.goto(`/index.php/${S}/management/settings/access`);
                await expect(page.getByRole('table', {name: /^Current Users \(/}).locator('tbody tr').first()).toBeVisible({timeout: 30_000});
                await idle(page);
                await snap(page, 'existing-member-after');
                out.existingRow = await page.getByRole('table', {name: /^Current Users \(/}).locator('tbody tr').filter({hasText: `mem${T}@mail.test`}).allInnerTexts();
                out.existingInvRow = await page.getByRole('table', {name: /^Invitations \(/}).locator('tbody tr').filter({hasText: `mem${T}@mail.test`}).count();
            }
            record('sweep2', out);
            return;
        }
        const openWizard = async () => {
            await page.goto(`/index.php/${S}/management/settings/access`);
            await page.getByRole('button', {name: 'Invite to a role'}).click();
            await expect(page.getByRole('heading', {name: /Search User/})).toBeVisible({timeout: 30_000});
        };
        // 1. Non-email search text.
        await openWizard();
        await page.getByLabel(/Search for a user by email address/).fill(`nobody${T}`);
        await page.getByRole('button', {name: 'Search User', exact: true}).click();
        await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
        await idle(page);
        const s1 = await snap(page, 'nonemail-details');
        out.nonEmailEmailBox = await page.getByLabel(/^Email address/).inputValue();
        out.nonEmailMessage = (s1.text.main.match(/The user [^\n]*/) || [null])[0];

        // 3a. Leave with a name typed: Cancel.
        await page.getByLabel(/^Given Name/).first().fill('Unsaved');
        const dialogs = [];
        page.on('dialog', (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); });
        await page.getByRole('button', {name: 'Cancel', exact: true}).click();
        await page.waitForTimeout(1500);
        await idle(page);
        const c1 = await snap(page, 'leave-cancel');
        out.cancel = {url: c1.url, dialog: c1.text.dialog, browserDialogs: [...dialogs]};
        if (c1.text.dialog) {
            // A confirmation of its own: record its buttons, then confirm the leave.
            out.cancel.buttons = await page.getByRole('dialog').last().getByRole('button').allInnerTexts();
            await page.getByRole('dialog').last().getByRole('button').first().click();
            await page.waitForTimeout(1500);
            await idle(page);
            out.cancel.afterConfirm = (await snap(page, 'leave-cancel-confirmed')).url;
        }
        // 3b. Leave with a name typed: a typed address.
        await openWizard();
        await page.getByLabel(/Search for a user by email address/).fill(`rcpt${T}z@mail.test`);
        await page.getByRole('button', {name: 'Search User', exact: true}).click();
        await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
        await page.getByLabel(/^Given Name/).first().fill('Unsaved');
        await page.getByLabel(/^Given Name/).first().blur();
        dialogs.length = 0;
        await page.goto(`/index.php/${S}/management/settings/access`);
        await idle(page);
        const c2 = await snap(page, 'leave-goto');
        out.leaveGoto = {url: c2.url, browserDialogs: [...dialogs],
            invitationRows: await page.getByRole('table', {name: /^Invitations \(/}).locator('tbody tr').allInnerTexts()};

        // 4. An existing member's accept link (Mira, pending from ks27.js), opened signed out, not accepted.
        if (facts.existing && facts.existing.mail && facts.existing.mail.accept) {
            await vp.goto(facts.existing.mail.accept);
            await idle(vp);
            const ex = await snap(vp, 'existing-member-accept');
            out.existingMemberStepLines = ex.text.main.match(/[^\n]*steps[^\n]*/g) || [];
        }
        // 2. The French-only invitee's accept wizard.
        const link = facts.frOnly && facts.frOnly.mail && facts.frOnly.mail.accept;
        if (link && !process.env.SKIP_FR) {
            await vp.goto(link);
            await expect(vp.getByRole('heading', {name: new RegExp(`Create ${ACR[app.name]} account`)})).toBeVisible({timeout: 30_000});
            await vp.getByLabel(/^Username/).fill(`fr${T}`);
            await vp.getByLabel(/^Password/).fill(`Password${T}`);
            await vp.getByRole('checkbox').check();
            await vp.getByRole('button', {name: 'Save and continue'}).click();
            await expect(vp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(vp);
            const a = await snap(vp, 'fronly-accept-details');
            out.frOnlyAccept = {
                textboxes: a.aria.main.match(/textbox "[^"]*"(: [^\n]*)?/g),
                buttons: a.aria.main.match(/button "[^"]*"/g),
            };
        }
        record('sweep', out);
    } finally {
        record('sweep', out);
        await close();
        await closeV();
    }
});
