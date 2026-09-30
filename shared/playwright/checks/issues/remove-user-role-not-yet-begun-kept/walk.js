// Issue report U53 A19: a manager's "Remove User" on Settings › Users & Roles does not end a role whose start
// date is still to come: on a user whose only role has not begun it ends in "An unexpected error has occurred…",
// and on a user who also holds current roles it ends those and leaves the future one.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet), as rvaca (the manager):
//   newcomer  "Invite to a role" for u53r12@mailinator.com, role Section editor (OMP Series editor, OPS
//             Moderator) from 2027-06-01; accepted from the emailed link, account u53r12 created; the row's
//             "More Actions" › "Remove User" › "OK", the dialog's "OK", a reload, the menu again; then the row's
//             "Edit" › "Remove Role" on that role (the roles page's own route).
//   partial   zwoods (Zita Woods; zzedd, Zayan Zedd, on OMP): "Edit" › "Add Another Role", the same role from
//             2027-06-01, accepted from the emailed link; then "Remove User" › "OK", a reload, the menu again.
//   endrole   ccorino (Carlo Corino; aclark, Arthur Clark, on OMP): the same invitation, accepted; then on the
//             roles page "Remove Role" on the future role, confirmed.
// The partial and endrole groups are also the neighbour check for the fix: current roles must still be ended
// (kept with today's end date, not deleted), and "Remove User" on them must still succeed with no dialog.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/remove-user-role-not-yet-begun-kept/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, --feature issues-3_5 and PROBE_FEATURE=issues-3_5.
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops, reset the dataset, walk, then
// node bin/try-fix.js revert ojs omp ops.
// PHASES=newcomer,partial,endrole (the default) narrows. No assertions: the script records, the reader judges.
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const FUTURE = '2027-06-01';
const PHASES = (process.env.PHASES || 'newcomer,partial,endrole').split(',');
const ROLE = {ojs: 'Section editor', omp: 'Series editor', ops: 'Moderator'};
const PARTIAL = {ojs: ['zwoods', 'Woods'], omp: ['zzedd', 'Zedd'], ops: ['zwoods', 'Woods']};
const ENDROLE = {ojs: ['ccorino', 'Corino'], omp: ['aclark', 'Clark'], ops: ['ccorino', 'Corino']};
const NEW = {email: 'u53r12@mailinator.com', username: 'u53r12', given: 'U53r12', family: 'Newcomer'};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line, dataset: app.dataset, startedAt: new Date().toISOString()};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    const browserDialogs = [];
    page.on('dialog', (d) => { browserDialogs.push({type: d.type(), message: flat(d.message(), 300)}); d.accept().catch(() => {}); });
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    const rolesOf = (username) => sql(app, `SELECT ugs.setting_value || ' start=' || coalesce(uug.date_start::text, '-') || ' end=' || coalesce(uug.date_end::text, '-')
        FROM user_user_groups uug JOIN users u ON u.user_id = uug.user_id JOIN user_groups ug ON ug.user_group_id = uug.user_group_id
        JOIN user_group_settings ugs ON ugs.user_group_id = ug.user_group_id AND ugs.setting_name = 'name' AND ugs.locale = 'en'
        WHERE u.username = '${username}' AND ug.context_id IS NOT NULL ORDER BY 1`).split('\n').filter(Boolean);
    const users = page.getByRole('table', {name: /^Current Users \(/});
    const rowOf = (email) => users.locator('tbody tr').filter({hasText: email});
    const openList = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/access`));
        await expect(users.locator('tbody tr').first()).toBeVisible({timeout: T});
        await idle(page);
    };
    const findRow = async (email, name, {mayBeGone = false} = {}) => {
        if (await rowOf(email).count()) return 'first page';
        await page.getByRole('searchbox').first().fill(name);
        await page.getByRole('searchbox').first().press('Enter');
        await idle(page);
        if (mayBeGone) {
            // after a removal that leaves no role (with the fix), the user drops out of the list
            const found = await rowOf(email).waitFor({timeout: 10_000}).then(() => true, () => false);
            return found ? `searched "${name}"` : null;
        }
        await expect(rowOf(email)).toBeVisible({timeout: 15_000});
        return `searched "${name}"`;
    };
    const rowText = async (email) => flat(await rowOf(email).innerText().catch(() => ''), 400);
    const menuOf = async (email) => {
        await rowOf(email).getByRole('button').last().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10_000});
        return (await page.getByRole('menuitem').allInnerTexts()).map((t) => t.trim());
    };
    const closeMenu = async () => {
        for (let i = 0; i < 3 && (await page.getByRole('menuitem').count()) > 0; i++) {
            await page.getByRole('menuitem').first().press('Escape').catch(() => {});
            await sleep(300);
        }
    };
    const removeViaMenu = async (email, key) => {
        const out = {};
        out.menu = await menuOf(email);
        await page.getByRole('menuitem', {name: 'Remove User'}).click();
        const dlg = page.getByRole('dialog').filter({hasText: 'Remove this user'});
        await expect(dlg).toBeVisible({timeout: 10_000});
        out.confirm = flat((await snap(`${key}-confirm`)).text.dialog, 400);
        const resp = page.waitForResponse((r) => r.url().includes('remove-user'), {timeout: T});
        await dlg.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await resp;
        out.request = {method: r.request().method(), url: r.url().replace(app.baseURL, ''), status: r.status(),
            body: (await r.text().catch(() => '')).slice(0, 600)};
        await idle(page);
        await sleep(1000);
        out.dialogAfterOk = flat((await snap(`${key}-after-ok`)).text.dialog, 400);
        out.dialogsOpen = await page.getByRole('dialog').count();
        if (out.dialogsOpen) {
            await page.getByRole('dialog').last().getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
            await idle(page);
        }
        out.rowAfter = await rowText(email);
        return out;
    };
    // The newest invitation email to `to` sent after `since` (the one Mailpit serves every fleet of the slot).
    const inviteLink = async (to, since) => {
        const deadline = Date.now() + 60_000;
        for (;;) {
            const res = await app.mail._search({to});
            const m = (res.messages || []).find((x) => new Date(x.Created).getTime() >= since - 2000);
            if (m) {
                const full = await app.mail.fullMessage(m.ID);
                const link = (((full.HTML || '').match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i) || [])[1] || '').replace(/&amp;/g, '&');
                return {subject: full.Subject, startLine: flat(((full.Text || '').match(/[^\n]*(2027|Start)[^\n]*/gi) || []).join(' | '), 300), link};
            }
            if (Date.now() > deadline) throw new Error(`no invitation to ${to} since ${new Date(since).toISOString()}`);
            await sleep(1000);
        }
    };
    const roleRow = () => page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
    const fillRoleRow = async () => {
        const row = roleRow();
        await row.waitFor({timeout: 10_000});
        await row.getByLabel(/^Select a new role/).selectOption({label: ROLE[app.name]});
        await row.getByRole('textbox').fill(FUTURE);
        await row.getByRole('combobox').last().selectOption({label: 'Appear on the masthead'}).catch(() => {});
    };
    const sendInvite = async (key) => {
        await page.getByRole('button', {name: 'Save And Continue'}).click();
        await page.getByLabel(/^Subject/).waitFor({timeout: T});
        await idle(page); await sleep(800);
        const since = Date.now();
        await page.getByRole('button', {name: 'Invite user to the role'}).click();
        await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T}).catch(() => {});
        const sent = flat((await snap(`${key}-sent`)).text.dialog, 300);
        return {since, sent};
    };
    // "Edit" › "Add Another Role", the future role, sent; accepted signed out from the link (an existing account).
    const inviteExisting = async (username, family, key) => {
        const email = `${username}@mailinator.com`;
        const o = {rolesBefore: rolesOf(username)};
        await signIn(page, 'rvaca');
        await openList();
        await findRow(email, family);
        await menuOf(email);
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T});
        await idle(page); await sleep(800);
        await page.getByRole('button', {name: 'Add Another Role'}).click();
        await fillRoleRow();
        const {since, sent} = await sendInvite(`${key}-invite`);
        o.sent = sent;
        await signOut(page);
        const mail = await inviteLink(email, since);
        o.mail = {subject: mail.subject, startLine: mail.startLine};
        await page.goto(mail.link);
        const accept = page.getByRole('button', {name: /^Accept And Continue to/});
        await accept.waitFor({timeout: T});
        await idle(page); await sleep(1000);
        o.review = flat((await snap(`${key}-accept-review`)).text.main, 900);
        await accept.click();
        await page.getByRole('dialog').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
        await idle(page);
        o.accepted = flat((await snap(`${key}-accepted`)).text.dialog, 300);
        o.rolesAfterAccept = rolesOf(username);
        return o;
    };
    // The roles page ("Edit"): "Remove Role" on the future role, confirmed when a confirmation is asked.
    const removeRoleOnRolesPage = async (email, family, key) => {
        const o = {};
        await openList();
        await findRow(email, family);
        await menuOf(email);
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T});
        await idle(page); await sleep(1000);
        o.rolesPage = flat((await snap(`${key}-roles-page`)).text.main, 1500);
        const row = page.getByRole('row').filter({hasText: ROLE[app.name]}).filter({has: page.getByRole('button', {name: 'Remove Role'})}).first();
        o.rowWithRemoveRole = flat(await row.innerText().catch(() => null), 300);
        const endRole = [];
        const onResp = async (r) => { if (/\/endRole\//.test(r.url())) endRole.push({method: r.request().method(), status: r.status(), body: flat(await r.text().catch(() => ''), 300)}); };
        page.on('response', onResp);
        await row.getByRole('button', {name: 'Remove Role'}).click();
        const dlg = page.getByRole('dialog').last();
        await dlg.waitFor({timeout: 10_000});
        o.dialog = flat((await snap(`${key}-remove-role-dialog`)).text.dialog, 400);
        const confirm = dlg.getByRole('button', {name: 'Remove Role'});
        if (await confirm.count()) {
            await confirm.click();
            await idle(page); await sleep(1500);
            o.afterConfirm = flat((await snap(`${key}-remove-role-after`)).text.dialog, 400);
            o.dialogsOpen = await page.getByRole('dialog').count();
        } else {
            await dlg.getByRole('button').first().click().catch(() => {});
        }
        page.off('response', onResp);
        o.endRoleRequests = endRole;
        await page.reload(); await idle(page); await sleep(1000);
        o.rolesPageAfterReload = flat((await snap(`${key}-roles-page-reloaded`)).text.main, 1500);
        return o;
    };
    try {
        if (PHASES.includes('newcomer')) {
            const o = {};
            // 1-3. rvaca invites a newcomer to the role from 2027-06-01.
            await signIn(page, 'rvaca');
            await openList();
            await page.getByRole('button', {name: 'Invite to a role'}).click();
            await page.getByRole('heading', {name: /Search User/}).waitFor({timeout: T});
            await page.getByLabel(/Search for a user by email address/).fill(NEW.email);
            await page.getByRole('button', {name: 'Search User', exact: true}).click();
            await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
            await idle(page);
            await page.getByLabel(/^Given Name/).first().fill(NEW.given);
            await page.getByLabel(/^Family Name/).first().fill(NEW.family).catch(() => {});
            await fillRoleRow();
            await snap('03-newcomer-details');
            const {since, sent} = await sendInvite('03-newcomer');
            o.sent = sent;
            // 4. Sign out; the invitation email's accept link.
            await signOut(page);
            const mail = await inviteLink(NEW.email, since);
            o.mail = {subject: mail.subject, startLine: mail.startLine};
            await page.goto(mail.link);
            // 5. Create the account and accept.
            await page.getByRole('heading', {name: /Create .* account/}).waitFor({timeout: T});
            await idle(page); await sleep(1500);
            for (let i = 0; i < 3; i++) {
                await page.getByLabel(/^Username/).fill(NEW.username);
                await page.getByLabel(/^Password/).fill(NEW.username + NEW.username);
                if ((await page.getByLabel(/^Username/).inputValue()) === NEW.username) break;
                await sleep(1000);
            }
            await page.getByRole('checkbox').check();
            await page.getByRole('button', {name: 'Save and continue'}).click();
            await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
            await idle(page);
            await page.getByLabel(/^Country/).selectOption('CA');
            await page.getByRole('button', {name: 'Save and continue'}).click();
            await page.getByRole('heading', {name: /Review & create account/}).waitFor({timeout: T});
            await idle(page);
            o.review = flat((await snap('05-newcomer-review')).text.main, 900);
            await page.getByRole('button', {name: /^Accept And Continue to/}).click();
            await page.getByRole('dialog').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
            o.accepted = flat((await snap('05-newcomer-accepted')).text.dialog, 300);
            await signOut(page).catch(() => {});
            o.rolesAfterAccept = rolesOf(NEW.username);
            // 6. rvaca's list: the newcomer's row.
            await signIn(page, 'rvaca');
            await openList();
            o.rowFound = await findRow(NEW.email, NEW.family);
            o.row = await rowText(NEW.email);
            await snap('06-newcomer-row');
            // 7-8. "Remove User" › "OK"; the dialog's "OK"; reload; the menu again.
            o.remove = await removeViaMenu(NEW.email, '07-newcomer');
            await openList();
            o.rowFoundAfterReload = await findRow(NEW.email, NEW.family, {mayBeGone: true});
            o.listAfterReload = flat((await snap('08-newcomer-reloaded')).text.main, 600);
            o.rolesAfterRemove = rolesOf(NEW.username);
            if (o.rowFoundAfterReload) {
                o.rowAfterReload = await rowText(NEW.email);
                o.menuAfterReload = await menuOf(NEW.email);
                await closeMenu();
                // 9. Reach: the roles page's "Remove Role" on the only role.
                o.rolesPage = await removeRoleOnRolesPage(NEW.email, NEW.family, '09-newcomer');
            }
            o.rolesAtEnd = rolesOf(NEW.username);
            await signOut(page).catch(() => {});
            facts.newcomer = o;
            record('facts', facts);
        }
        if (PHASES.includes('partial')) {
            const [u, fam] = PARTIAL[app.name];
            const email = `${u}@mailinator.com`;
            // 10-11. A current author given the future role, accepted.
            const o = await inviteExisting(u, fam, '10-partial');
            // 12. "Remove User" › "OK", reload, the menu again.
            await signIn(page, 'rvaca');
            await openList();
            await findRow(email, fam);
            o.row = await rowText(email);
            o.remove = await removeViaMenu(email, '12-partial');
            await openList();
            o.rowFoundAfterReload = await findRow(email, fam, {mayBeGone: true});
            if (o.rowFoundAfterReload) {
                o.rowAfterReload = await rowText(email);
                o.menuAfterReload = await menuOf(email);
                await closeMenu();
            }
            o.rolesAfterRemove = rolesOf(u);
            await signOut(page).catch(() => {});
            facts.partial = {username: u, ...o};
            record('facts', facts);
        }
        if (PHASES.includes('endrole')) {
            const [u, fam] = ENDROLE[app.name];
            const email = `${u}@mailinator.com`;
            // 13. Another author given the future role, accepted; the roles page's "Remove Role" on it.
            const o = await inviteExisting(u, fam, '13-endrole');
            await signIn(page, 'rvaca');
            o.rolesPage = await removeRoleOnRolesPage(email, fam, '13-endrole');
            o.rolesAtEnd = rolesOf(u);
            await signOut(page).catch(() => {});
            facts.endrole = {username: u, ...o};
        }
    } catch (e) {
        facts.error = flat(e.stack, 1200);
        await snap('error').catch(() => {});
    } finally {
        facts.browserDialogs = browserDialogs;
        record('facts', facts);
        await close();
    }
});
