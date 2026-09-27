// U06 claim check Ks27 (sync s27): pkp/pkp-lib#13397 (issue #13376), the
// invitation email's recipient carries the invitation's given and family name
// for the email's language. Drives, per app, on scratch contexts only:
//   single-language journal S: scenario 1 (send with a name, second send to
//   the same address, send with no name as Author), scenario 2 (accept,
//   "Invitation Unavailable" after), a decline, the inviter's silence with a
//   positive control, the user-row wizard's masthead change and role removal
//   (an enabled and a disabled member) and an existing member's invitation;
//   two-language journal D (en + fr_CA): a name in French only, a name in both.
// Every screen is recorded with screen(); mails are read by recipient + marker.
// Run: PROBE_FEATURE=U06 PROBE_AGENT=ccInvs27 node bin/probe.js all shared/playwright/checks/U06/Ks27/ks27.js
const {forEachApp, launch, signIn, signOut, screen, record, loc, note, idle, tag} = require('../../../probe');

const ROLE = {ojs: 'Copyeditor', omp: 'Author', ops: 'Moderator'};
const ACR = {ojs: 'OJS', omp: 'OMP', ops: 'OPS'};
const MASTHEAD_COL = {ojs: 'Journal Masthead', omp: 'Press Masthead', ops: 'Server Masthead'};

function today() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const T = tag('u06s27');
    const S = T;
    const D = `${T}d`;
    const facts = {app: app.name, tag: T, today: today()};
    const snaps = {};
    const snap = async (page, name) => {
        const s = await screen(page);
        snaps[name] = s;
        record(`${name}`, s);
        return s;
    };
    const rcpt = (k) => `rcpt${T}${k}@mail.test`;
    const person = (u, given, family, roles) => ({username: u, givenName: given, familyName: family, roles});

    await app.api.createContext({tag: S, users: [
        {username: `mgr${T}`, roles: ['manager']},
        person(`mem${T}`, 'Mira', 'Member', ['author', 'reader']),
        person(`dis${T}`, 'Dora', 'Disabled', ['author', 'reader']),
    ]});
    await app.api.createContext({tag: D, context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
        users: [{username: `mgr${D}`, roles: ['manager']}]});
    facts.contexts = {S, D};

    // Mail helpers ---------------------------------------------------------
    const readMail = async (to, marker, {timeoutMs = 30_000} = {}) => {
        const summary = await app.mail.find({to, contains: marker, timeoutMs});
        const full = await app.mail.fullMessage(summary.ID);
        const text = (full.Text || '').replace(/\r/g, '');
        const grab = (op) => {
            const m = (full.HTML || '').match(new RegExp(`href=['"]([^'"]*/invitation/${op}\\?[^'"]+)['"]`, 'i'));
            return m ? m[1].replace(/&amp;/g, '&') : null;
        };
        const greeting = (text.match(/Dear[^\n]*/) || [null])[0];
        return {id: summary.ID, subject: full.Subject, from: full.From, to: full.To, greeting,
            text: text.slice(0, 4000), accept: grab('accept'), decline: grab('decline')};
    };

    // Screen helpers -------------------------------------------------------
    const gotoAccess = async (page, ctx) => {
        await page.goto(`/index.php/${ctx}/management/settings/access`);
        await expect(page.getByRole('table', {name: /^Current Users \(/}).locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
    };
    const invitationsTable = (page) => page.getByRole('table', {name: /^Invitations \(/});
    const usersTable = (page) => page.getByRole('table', {name: /^Current Users \(/});
    const userRow = (page, text) => usersTable(page).locator('tbody tr').filter({hasText: text});

    // Walk the send wizard from Users & Roles to the "Invitation Sent" dialog.
    const send = async (page, ctx, {to, given, family, role, marker, key, frGiven, frFamily, existing = false, snapAll = false, masthead = 'Appear on the masthead'}) => {
        const out = {};
        await gotoAccess(page, ctx);
        if (snapAll) {
            await snap(page, `${key}-01-users-roles`);
        }
        await page.getByRole('button', {name: 'Invite to a role'}).click();
        await expect(page.getByRole('heading', {name: /Search User/})).toBeVisible({timeout: 30_000});
        if (snapAll) {
            await snap(page, `${key}-02-search-user`);
        }
        await page.getByLabel(/Search for a user by email address/).fill(to);
        await page.getByRole('button', {name: 'Search User', exact: true}).click();
        await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
        await idle(page);
        const details = await snap(page, `${key}-03-enter-details`);
        out.detailsText = details.text.main;
        const row = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
        out.mastheadInitial = await row.getByRole('combobox').last().inputValue().catch((e) => `ERR ${e.message}`);
        out.emailFieldValue = await page.getByLabel(/^Email address/).inputValue().catch(() => null);
        if (!existing) {
            if (given) await page.getByLabel(/^Given Name/).first().fill(given);
            if (family) await page.getByLabel(/^Family Name/).first().fill(family);
            if (frGiven || frFamily) {
                await page.getByRole('button', {name: 'French', exact: true}).click();
                await expect(page.getByLabel(/Given Name in French/)).toBeVisible({timeout: 10_000});
                if (frGiven) await page.getByLabel(/Given Name in French/).fill(frGiven);
                if (frFamily) await page.getByLabel(/Family Name in French/).fill(frFamily);
                await snap(page, `${key}-03b-enter-details-french`);
            }
        }
        await row.getByLabel(/^Select a new role/).selectOption({label: role});
        await row.getByRole('textbox').fill(today());
        const mast = row.getByRole('combobox').last();
        if (await mast.count() && await mast.isEnabled()) {
            await mast.selectOption({label: masthead}).catch(() => {});
        }
        await page.getByRole('button', {name: 'Save And Continue'}).click();
        const subject = page.getByLabel(/^Subject/);
        await expect(subject).toBeVisible({timeout: 30_000});
        await expect(subject).not.toHaveValue('', {timeout: 30_000});
        await idle(page);
        const body = page.frameLocator('iframe').locator('body');
        await expect(body).not.toHaveText('', {timeout: 30_000});
        await snap(page, `${key}-04-compose`);
        out.composeSubject = await subject.inputValue();
        out.composeBody = await body.innerText();
        await subject.fill(marker);
        await page.getByRole('button', {name: 'Invite user to the role'}).click();
        const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
        await expect(sent).toBeVisible({timeout: 30_000});
        const sentSnap = await snap(page, `${key}-05-invitation-sent`);
        out.sentDialog = sentSnap.text.dialog;
        await sent.getByRole('button', {name: 'View All Users'}).click();
        await page.waitForURL(/management\/settings\/access/, {timeout: 30_000});
        await expect(usersTable(page).locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        const back = await snap(page, `${key}-06-after-view-all-users`);
        out.afterUrl = back.url;
        out.invitationRows = await invitationsTable(page).locator('tbody tr').allInnerTexts();
        return out;
    };

    const {page: mp, close: closeM} = await launch(app);
    const {page: vp, close: closeV} = await launch(app);
    try {
        await signIn(mp, `mgr${T}`);

        // Scenario 1: a newcomer with a name --------------------------------
        facts.s1 = await send(mp, S, {to: rcpt('a'), given: 'Nova', family: 'Quill', role: ROLE[app.name],
            marker: `Invitation${T}a1`, key: 's1-first', snapAll: true});
        facts.s1.mail = await readMail(rcpt('a'), `Invitation${T}a1`);
        await loc(mp, 'Users & Roles: Invitations table', invitationsTable(mp));

        // A second send to the same address, walked the same way.
        facts.s1second = await send(mp, S, {to: rcpt('a'), given: 'Nova', family: 'Quill', role: ROLE[app.name],
            marker: `Invitation${T}a2`, key: 's1-second'});
        facts.s1second.mail = await readMail(rcpt('a'), `Invitation${T}a2`);
        facts.s1second.sameDetailsText = facts.s1second.detailsText === facts.s1.detailsText;
        await gotoAccess(mp, S);
        await snap(mp, 's1-07-table-after-second');
        facts.s1second.rowsForAddress = await invitationsTable(mp).locator('tbody tr').filter({hasText: rcpt('a')}).count();
        facts.s1second.currentUsersHasAddress = await usersTable(mp).locator('tbody tr').filter({hasText: rcpt('a')}).count();
        facts.s1second.mailCount = await app.mail.count({to: rcpt('a'), contains: `Invitation${T}a`});

        // No name, Author (the "as a Author" copy item).
        facts.noName = await send(mp, S, {to: rcpt('b'), role: 'Author', marker: `Invitation${T}b1`, key: 'noname'});
        facts.noName.mail = await readMail(rcpt('b'), `Invitation${T}b1`);

        // Given name only / family name only (the other shapes of "a name").
        facts.givenOnly = await send(mp, S, {to: rcpt('g'), given: 'Nova', role: ROLE[app.name], marker: `Invitation${T}g1`, key: 'givenonly'});
        facts.givenOnly.mail = await readMail(rcpt('g'), `Invitation${T}g1`);
        facts.familyOnly = await send(mp, S, {to: rcpt('f'), family: 'Quill', role: ROLE[app.name], marker: `Invitation${T}f1`, key: 'familyonly'});
        facts.familyOnly.mail = await readMail(rcpt('f'), `Invitation${T}f1`);

        // Two-language journal: French only, then both languages.
        await signIn(mp, `mgr${D}`);
        facts.frOnly = await send(mp, D, {to: rcpt('c'), frGiven: 'Noemie', frFamily: 'Plume', role: ROLE[app.name],
            marker: `Invitation${T}c1`, key: 'fronly', snapAll: true});
        facts.frOnly.mail = await readMail(rcpt('c'), `Invitation${T}c1`);
        facts.both = await send(mp, D, {to: rcpt('d'), given: 'Nova', family: 'Quill', frGiven: 'Noemie', frFamily: 'Plume',
            role: ROLE[app.name], marker: `Invitation${T}d1`, key: 'both'});
        facts.both.mail = await readMail(rcpt('d'), `Invitation${T}d1`);
        facts.enOnlyD = await send(mp, D, {to: rcpt('e'), given: 'Nova', family: 'Quill', role: ROLE[app.name],
            marker: `Invitation${T}e1`, key: 'enonlyd'});
        facts.enOnlyD.mail = await readMail(rcpt('e'), `Invitation${T}e1`);
        record('facts', facts);

        // Scenario 2: the newcomer accepts (newest link) ---------------------
        await signIn(mp, `mgr${T}`);
        const acc = {};
        const link = facts.s1second.mail.accept;
        await vp.goto(link);
        await expect(vp.getByRole('heading', {name: new RegExp(`Create ${ACR[app.name]} account`)})).toBeVisible({timeout: 30_000});
        const a1 = await snap(vp, 's2-01-create-account');
        acc.orcidStepShown = /Verify ORCID iD/.test(a1.text.main || '');
        acc.passwordHint = await vp.getByText(/at least \d+ characters long/).first().innerText().catch(() => null);
        acc.privacyHref = await vp.getByRole('link', {name: 'Privacy Statement'}).getAttribute('href').catch(() => null);
        const user = `acc${T}`;
        const pass = `Password${T}`;
        await vp.getByLabel(/^Username/).fill(user);
        await vp.getByLabel(/^Password/).fill('Pass5');
        await vp.getByRole('checkbox').check();
        await vp.getByRole('button', {name: 'Save and continue'}).click();
        await idle(vp);
        const a2 = await snap(vp, 's2-02-pass5-refused');
        acc.pass5Advanced = !/Create .* account/.test(a2.aria.main.split('heading')[1] || '') && /Enter details/.test(a2.text.main) && !/Username/.test(a2.text.main);
        acc.pass5Error = await vp.getByText(/The password must be at least/).first().innerText().catch(() => null);
        await vp.getByLabel(/^Password/).fill(pass);
        await vp.getByRole('button', {name: 'Save and continue'}).click();
        await expect(vp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
        await idle(vp);
        const a3 = await snap(vp, 's2-03-enter-details');
        acc.detailsPrefill = {
            given: await vp.getByLabel(/^Given Name/).first().inputValue().catch(() => null),
            family: await vp.getByLabel(/^Family Name/).first().inputValue().catch(() => null),
        };
        acc.detailsText = a3.text.main;
        // Required fields: press on with both emptied, then fill.
        await vp.getByLabel(/^Given Name/).first().fill('');
        await vp.getByRole('button', {name: 'Save and continue'}).click();
        await idle(vp);
        const a3b = await snap(vp, 's2-03b-enter-details-empty');
        acc.emptyDetailsStayed = /Enter details/.test(a3b.text.main) && !/Review & create account/.test((a3b.aria.main.match(/heading "[^"]*" \[level=2\]/g) || []).join(' '));
        await vp.getByLabel(/^Given Name/).first().fill('Nova');
        await vp.getByLabel(/^Country/).selectOption('CA');
        await vp.getByRole('button', {name: 'Save and continue'}).click();
        await expect(vp.getByRole('heading', {name: /Review & create account/})).toBeVisible({timeout: 30_000});
        const a4 = await snap(vp, 's2-04-review');
        acc.reviewText = a4.text.main;
        await vp.getByRole('button', {name: 'Edit', exact: true}).first().click();
        await idle(vp);
        const a4b = await snap(vp, 's2-04b-review-edit');
        acc.editReopens = /Country/.test(a4b.text.main);
        await vp.getByRole('button', {name: 'Save and continue'}).click();
        await expect(vp.getByRole('heading', {name: /Review & create account/})).toBeVisible({timeout: 30_000});
        await vp.getByRole('button', {name: new RegExp(`Accept And Continue to ${ACR[app.name]}`)}).click();
        const accepted = vp.getByRole('dialog');
        await expect(accepted).toBeVisible({timeout: 30_000});
        const a5 = await snap(vp, 's2-05-accepted-dialog');
        acc.acceptedDialog = a5.text.dialog;
        await accepted.getByRole('button', {name: 'View All Submissions'}).click();
        await vp.waitForLoadState('load');
        await idle(vp);
        const a6 = await snap(vp, 's2-06-after-view-all-submissions');
        acc.afterViewAll = a6.url;
        // The accept link again: the unavailable page.
        await vp.goto(link);
        await idle(vp);
        const a7 = await snap(vp, 's2-07-link-again');
        acc.linkAgainText = a7.text.main;
        // The superseded first link.
        await vp.goto(facts.s1.mail.accept);
        await idle(vp);
        const a7b = await snap(vp, 's2-07b-first-link');
        acc.firstLinkText = (a7b.text.main || '').slice(0, 500);
        // Signing in with the new credentials.
        await signIn(vp, user, {password: pass});
        await idle(vp);
        const a8 = await snap(vp, 's2-08-signed-in');
        acc.signedInUrl = a8.url;
        acc.signedInHeader = a8.text.header;
        // Manager side: row gone, account holds the role.
        await gotoAccess(mp, S);
        await snap(mp, 's2-09-manager-after-accept');
        acc.invRowsForAddress = await invitationsTable(mp).locator('tbody tr').filter({hasText: rcpt('a')}).count();
        acc.userRow = await userRow(mp, rcpt('a')).allInnerTexts();
        // Masthead page.
        await vp.goto(`/index.php/${S}/about/editorialMasthead`);
        await idle(vp);
        const a10 = await snap(vp, 's2-10-masthead-page');
        acc.mastheadListsNova = /Nova/.test(a10.text.main || '');
        facts.accept = acc;
        record('facts', facts);

        // Decline (the no-name invitee) -------------------------------------
        const dec = {};
        await signOut(vp);
        await vp.goto(facts.noName.mail.decline);
        await idle(vp);
        await snap(vp, 'decline-01-page');
        await vp.getByRole('button', {name: 'Confirm Decline Invitation'}).click();
        await vp.waitForURL(/\/login/, {waitUntil: 'commit', timeout: 30_000}).catch(() => {});
        await idle(vp);
        const d2 = await snap(vp, 'decline-02-after');
        dec.after = d2.url;
        await gotoAccess(mp, S);
        await snap(mp, 'decline-03-manager');
        dec.invRowsForAddress = await invitationsTable(mp).locator('tbody tr').filter({hasText: rcpt('b')}).count();
        facts.decline = dec;

        // Masthead listing per the chosen visibility: two Editorial Board
        // Member invitations (a masthead role), one shown, one not, both accepted.
        const acceptNew = async (link, user, pass, key) => {
            await signOut(vp);
            await vp.goto(link);
            await expect(vp.getByRole('heading', {name: new RegExp(`Create ${ACR[app.name]} account`)})).toBeVisible({timeout: 30_000});
            await vp.getByLabel(/^Username/).fill(user);
            await vp.getByLabel(/^Password/).fill(pass);
            await vp.getByRole('checkbox').check();
            await vp.getByRole('button', {name: 'Save and continue'}).click();
            await expect(vp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(vp);
            const prefill = await vp.getByLabel(/^Given Name/).first().inputValue().catch(() => null);
            if (!prefill) await vp.getByLabel(/^Given Name/).first().fill('Filled');
            await vp.getByLabel(/^Country/).selectOption('CA');
            await vp.getByRole('button', {name: 'Save and continue'}).click();
            await expect(vp.getByRole('heading', {name: /Review & create account/})).toBeVisible({timeout: 30_000});
            await vp.getByRole('button', {name: new RegExp(`Accept And Continue to ${ACR[app.name]}`)}).click();
            await expect(vp.getByRole('dialog')).toBeVisible({timeout: 30_000});
            await snap(vp, `${key}-accepted`);
            return {prefill};
        };
        facts.mastheadListing = {};
        for (const [k, vis, given] of [['h', 'Appear on the masthead', 'Hana'], ['i', 'Does not appear on the masthead', 'Ivo']]) {
            const o = await send(mp, S, {to: rcpt(k), given, family: 'Board', role: 'Editorial Board Member', masthead: vis,
                marker: `Invitation${T}${k}1`, key: `mast${k}`});
            o.mail = await readMail(rcpt(k), `Invitation${T}${k}1`);
            o.accept = await acceptNew(o.mail.accept, `acc${T}${k}`, `Password${T}`, `mast${k}`);
            facts.mastheadListing[k] = o;
        }
        await vp.goto(`/index.php/${S}/about/editorialMasthead`);
        await idle(vp);
        const mh = await snap(vp, 'mast-page');
        facts.mastheadListing.page = {hana: /Hana Board/.test(mh.text.main || ''), ivo: /Ivo Board/.test(mh.text.main || ''), text: (mh.text.main || '').slice(0, 1500)};
        record('facts', facts);

        // No notice to the inviter: Tasks panel, then a mailbox read bounded by a control mail.
        const quiet = {};
        await mp.goto(`/index.php/${S}/dashboard/editorial`);
        await idle(mp);
        const bell = mp.getByRole('button', {name: /Tasks/});
        quiet.bell = await bell.first().innerText().catch(() => null);
        await snap(mp, 'quiet-01-dashboard');
        await gotoAccess(mp, S);
        const own = userRow(mp, `mgr${T}@mail.test`);
        await own.getByRole('button').last().click();
        await mp.getByRole('menuitem', {name: 'Email', exact: true}).click();
        await expect(mp.locator('#sendEmailForm')).toBeVisible({timeout: 30_000});
        await mp.waitForFunction(() => ((window.tinymce && window.tinymce.get()) || []).some((e) => /^message/.test(e.id) && e.initialized), undefined, {timeout: 30_000});
        await mp.locator('#sendEmailForm input[name="subject"]').fill(`Control${T}`);
        await mp.locator('#sendEmailForm').frameLocator('iframe').first().locator('body').click();
        await mp.keyboard.type(`Control mail ${T}.`);
        await mp.locator('#sendEmailForm').getByRole('button', {name: 'Send Email'}).click();
        await app.mail.find({to: `mgr${T}@mail.test`, contains: `Control${T}`, timeoutMs: 30_000});
        const inbox = await app.mail._search({to: `mgr${T}@mail.test`});
        quiet.managerInbox = (inbox.messages || []).map((m) => m.Subject);
        facts.quiet = quiet;
        record('facts', facts);

        // The user-row wizard: masthead change and role removal ---------------
        const rowWizard = async (username, key, {disable = false} = {}) => {
            const out = {};
            const email = `${username}@mail.test`;
            await gotoAccess(mp, S);
            if (disable) {
                await userRow(mp, email).getByRole('button').last().click();
                await mp.getByRole('menuitem', {name: 'Disable User', exact: true}).click();
                const dlg = mp.getByRole('dialog').filter({has: mp.locator('textarea[name="disableReason"]')});
                await expect(dlg).toBeVisible({timeout: 30_000});
                await idle(mp);
                await snap(mp, `${key}-00-disable`);
                await dlg.getByRole('button', {name: 'OK', exact: true}).click();
                await expect(dlg).toHaveCount(0, {timeout: 30_000});
                await gotoAccess(mp, S);
            }
            await userRow(mp, email).getByRole('button').last().click();
            await mp.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            await expect(mp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(mp);
            await snap(mp, `${key}-01-edit`);
            const cur = (role) => mp.getByRole('row').filter({hasText: role}).filter({hasNot: mp.getByLabel(/^Select a new role/)});
            const mastSel = cur('Author').getByRole('combobox');
            out.mastheadBefore = await mastSel.inputValue().catch(() => null);
            await mastSel.selectOption({label: 'Does not appear on the masthead'});
            const mdlg = mp.getByRole('dialog', {name: 'Confirm masthead visibility change'});
            await expect(mdlg).toBeVisible({timeout: 30_000});
            const m1 = await snap(mp, `${key}-02-masthead-confirm`);
            out.mastheadDialog = m1.text.dialog;
            const saved = mp.waitForResponse((r) => r.url().includes('/masthead/'), {timeout: 30_000});
            await mdlg.getByRole('button', {name: 'Confirm'}).click();
            out.mastheadStatus = (await saved).status();
            await idle(mp);
            const m2 = await snap(mp, `${key}-03-masthead-after`);
            out.mastheadAfterDialog = m2.text.dialog;
            const errDlg = mp.getByRole('dialog').filter({hasNotText: 'Confirm masthead'});
            if (await errDlg.count()) {
                await errDlg.getByRole('button').first().click().catch(() => {});
            }
            out.mastheadAfter = await mastSel.inputValue().catch(() => null);
            const rdlg = mp.getByRole('dialog', {name: 'Remove Role'});
            await cur('Reader').getByRole('button', {name: 'Remove Role'}).click();
            await expect(rdlg).toBeVisible({timeout: 30_000});
            const r1 = await snap(mp, `${key}-04-remove-confirm`);
            out.removeDialog = r1.text.dialog;
            const ended = mp.waitForResponse((r) => r.url().includes('/endRole/'), {timeout: 30_000});
            await rdlg.getByRole('button', {name: 'Remove Role'}).click();
            out.endRoleStatus = (await ended).status();
            await idle(mp);
            await snap(mp, `${key}-05-remove-after`);
            // Reload: what stuck.
            await mp.reload();
            await expect(mp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(mp);
            await snap(mp, `${key}-06-reloaded`);
            out.mastheadAfterReload = await mastSel.inputValue().catch(() => null);
            // Mails.
            const mastheadMail = await app.mail.find({to: email, subject: 'Your journal masthead visibility has been updated', timeoutMs: 15_000}).catch(() => null);
            const removedMail = await app.mail.find({to: email, subject: 'You have been removed from a role', timeoutMs: 30_000}).catch(() => null);
            out.mastheadMail = mastheadMail ? (await app.mail.fullMessage(mastheadMail.ID)).Text.slice(0, 1500) : null;
            out.removedMail = removedMail ? (await app.mail.fullMessage(removedMail.ID)).Text.slice(0, 1500) : null;
            out.inbox = ((await app.mail._search({to: email})).messages || []).map((m) => m.Subject);
            return out;
        };
        facts.member = await rowWizard(`mem${T}`, 'member');
        record('facts', facts);
        facts.disabled = await rowWizard(`dis${T}`, 'disabled', {disable: true});
        record('facts', facts);

        // An existing member's invitation: the greeting (the existing-user end).
        facts.existing = await send(mp, S, {to: `mem${T}@mail.test`, role: {ojs: 'Copyeditor', omp: 'Copyeditor', ops: 'Moderator'}[app.name],
            marker: `Invitation${T}m1`, key: 'existing', existing: true});
        facts.existing.mail = await readMail(`mem${T}@mail.test`, `Invitation${T}m1`);
        record('facts', facts);

        note(`ccInvs27: [${app.name}] Send wizard "Enter details" in a two-language journal: a "French" button above the fields adds "Given Name in French"/"Family Name in French" boxes; each name field reads "0/2 languages completed". The Email field arrives holding the searched address (${facts.s1.emailFieldValue ? 'prefilled' : 'empty'}).`);
    } finally {
        record('facts', facts);
        await closeM();
        await closeV();
    }
});
