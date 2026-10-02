// @ts-check
/**
 * @file playwright/tests/U06-user-invitations.spec.js
 *
 * User invitations — OPS suite, one test per canonical scenario the spec runs
 * on OPS (scenarios 1–8, 10 and 11 in OPS vocabulary — preprint server,
 * Preprint Server Manager, Moderator as the offered role, "Create OPS
 * account" / "Accept And Continue to OPS" — plus the OPS-only scenario 9).
 * Spec: docs/specs/U06-user-invitations.md
 *
 * Deliberately NOT covered (register IDs; the spec's Coverage section is the
 * record of the rest): A2, A3, A4, A5, A7, A8, A9, A11, A12, OMP1.
 * OPS1 is S9's subject, asserted as an absence with a positive control.
 *
 * Every test but S9 seeds its own scratch preprint server (publicknowledge
 * and the seeded roster stay untouched; S9 only browses); Mailpit assertions
 * are scoped by unique throwaway recipient addresses carrying app + test in
 * the tag, plus a subject marker. "Today" is computed in the process's zone;
 * the suite runs with TZ=UTC, the PHP servers' clock (the start date the
 * wizard stamps is compared to it).
 */
const {test, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {MySubmissionsPage} = require('../pages/MySubmissionsPage.js');
const {EditorialDashboardPage} = require('../pages/EditorialDashboardPage.js');
const {
    UsersRolesPage,
    SendInvitationWizard,
    AcceptInvitationWizard,
    InvitationUnavailablePage,
    DeclineInvitationPage,
} = require('../pages/UserInvitationPages.js');

const ROLE = 'Moderator'; // the offered role on OPS (fn-s)
const MASTHEAD_SHOW = 'Appear on the masthead';
const MASTHEAD_HIDE = 'Does not appear on the masthead';
const ORCID_ID = 'https://sandbox.orcid.org/0000-0002-1825-0097'; // fn-s, the sandbox example
const ROLE_ENDED_SUBJECT = 'You have been removed from a role';

/** Unique per-run tag: alphanumeric, carries app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u6${scenario}opsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** Today as YYYY-MM-DD in the process's zone (native date input format; TZ=UTC). */
function today() {
    return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}

/**
 * Seed a scratch preprint server with a throwaway manager (+ extra users,
 * + further context keys such as `orcid`). Seeded users get the email
 * `<username>@mail.test` and the password username-doubled, so asUser() works.
 */
async function seedServer(pkpApi, tag, extraUsers = [], contextKeys = {}) {
    const manager = `mgr${tag}`;
    await pkpApi.createContext({
        tag,
        ...contextKeys,
        users: [{username: manager, roles: ['manager']}, ...extraUsers],
    });
    return {path: tag, manager};
}

/**
 * Drive the send wizard from Users & Roles as the (already signed-in) manager
 * page through the "Invitation Sent" dialog. `existing: true` expects the
 * searched address to resolve to an account (details shown read-only);
 * otherwise the newcomer form is used. Returns the "Enter details" step's
 * text and the compose step's body as shown at send time.
 */
async function sendInvitation(managerPage, path, {search, role = ROLE, subject, givenName, existing = false}) {
    const users = new UsersRolesPage(managerPage, path);
    await users.goto();
    await users.inviteToRoleButton.click();
    const wizard = new SendInvitationWizard(managerPage);
    await wizard.expectSearchStep();
    await wizard.searchAndContinue(search);
    if (existing) {
        await expect(wizard.userFoundMessage).toBeVisible();
    } else {
        await expect(wizard.userNotFoundMessage).toBeVisible();
        await expect(wizard.emailField).toHaveValue(search);
        if (givenName) {
            await wizard.fillGivenName(givenName);
        }
    }
    const detailsText = await wizard.readDetailsStep();
    // The new role row's masthead select starts blank (Fields).
    await expect(wizard.newRoleMastheadSelect(0)).toHaveValue('');
    await wizard.fillNewRoleRow(0, {role, dateStart: today(), masthead: MASTHEAD_SHOW});
    await wizard.saveAndContinueButton.click();
    await wizard.setSubject(subject);
    const body = await wizard.readBody();
    await wizard.sendAndAwaitConfirmation();
    return {wizard, detailsText, body};
}

/**
 * Fetch the invitation email (scoped by recipient + subject marker) and pull
 * both links, the sender, the subject and the plain-text body.
 */
async function invitationLinks(pkpMail, {to, contains}) {
    const summary = await pkpMail.find({to, contains});
    const full = await pkpMail.fullMessage(summary.ID);
    const acceptUrl = pkpMail.extractLink(full.HTML, 'Accept Invitation');
    const declineUrl = pkpMail.extractLink(full.HTML, 'Decline Invitation');
    expect(acceptUrl, 'invitation email must carry the accept link').toContain('/invitation/accept');
    expect(declineUrl, 'invitation email must carry the decline link').toContain('/invitation/decline');
    return {
        acceptUrl,
        declineUrl,
        html: full.HTML,
        text: full.Text.replace(/\s+/g, ' '),
        subject: full.Subject,
        from: full.From,
    };
}

/**
 * The lines of a compose-step body that carry no template variable
 * ("{$RECIPIENTNAME}" is substituted on send), whitespace-collapsed, for
 * comparison with the sent email's text.
 */
function fixedLines(body) {
    return body
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter((line) => line.length > 20 && !line.includes('{$'));
}

/** Sign in afresh (no cached session) on the visitor page and land signed in. */
async function signInFresh(page, username, password) {
    await page.context().clearCookies();
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(username, password);
}

test.describe('user invitations', () => {
    test('S1: manager invites a newcomer to a role', {tag: '@smoke'}, async ({asUser, pkpApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const recipient = `rcpt${tag}@mail.test`;
        const subject = `Invitation${tag}`;
        const {path, manager} = await seedServer(pkpApi, tag);

        const managerPage = await (await asUser(manager)).newPage();
        // "Search User" → "Enter details" with the address already in Email;
        // the new role row's masthead select starts blank (both asserted in
        // sendInvitation). The Reviewer half of the "Enter details" bullet
        // has no OPS run: a preprint server's role select offers no
        // reviewer role (users.md; findings T-ops-1).
        const first = await sendInvitation(managerPage, path, {search: recipient, givenName: 'Nova', subject});

        // "View All Users": the browser returns to Users & Roles, where the
        // Invitations table shows the row as "Invited {date}" (Rule 15).
        const users = new UsersRolesPage(managerPage, path);
        await first.wizard.pressViewAllUsers();
        await expect(users.invitationsCountHeading(1)).toBeVisible();
        const row = users.invitationRow(recipient);
        await expect(row).toBeVisible();
        await expect(row).toContainText(`Invited ${today()}`);
        await expect(row).toContainText(ROLE);

        // The recipient's mailbox holds the invitation, sent from the Preprint
        // Server Manager, listing the offered role with its start date and
        // masthead visibility and the accept and decline links (Side effects).
        const links = await invitationLinks(pkpMail, {to: recipient, contains: subject});
        expect(links.from.Address).toBe(`${manager}@mail.test`);
        expect(links.text).toContain('Newly assigned roles');
        expect(links.text).toContain(ROLE);
        expect(links.text).toContain(`Starting from ${today()}`);
        expect(links.text).toMatch(new RegExp(`masthead as an? ${ROLE}`));

        // The greeting opens "Dear Nova,", the Given Name entered on "Enter
        // details" (Side effects).
        expect(links.text).toContain('Dear Nova,');

        // The subject is the marker typed on the compose step and the body the
        // text that step showed at send time (its variables substituted).
        expect(links.subject).toBe(subject);
        const lines = fixedLines(first.body);
        expect(lines.length).toBeGreaterThanOrEqual(3);
        for (const line of lines) {
            expect(links.text).toContain(line);
        }

        // A second send to the same address: the wizard gives no hint that a
        // pending invitation exists (the "Enter details" step reads exactly as
        // on the first walk), and afterwards the Invitations table holds only
        // the newer row (Rule 3). The second email bounds the table read.
        const second = await sendInvitation(managerPage, path, {search: recipient, givenName: 'Nova', subject});
        expect(second.detailsText).toBe(first.detailsText);
        await expect.poll(() => pkpMail.count({to: recipient, contains: subject})).toBe(2);
        await users.goto();
        await expect(users.invitationsCountHeading(1)).toBeVisible();
        await expect(users.invitationRow(recipient)).toHaveCount(1);

        // Control: under Current Users the address has no row, the manager's
        // own row bounding the list read (Rule 9).
        await expect(users.usersTable.getByRole('row').filter({hasText: `${manager}@mail.test`})).toBeVisible();
        await expect(users.usersTable).not.toContainText(recipient);
    });

    test('S2: newcomer accepts and gets an account', {tag: '@smoke'}, async ({page, asUser, pkpApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const recipient = `rcpt${tag}@mail.test`;
        const subject = `Invitation${tag}`;
        const username = `acc${tag}`;
        const password = `Password${tag}`;
        const {path, manager} = await seedServer(pkpApi, tag);

        const managerPage = await (await asUser(manager)).newPage();
        await sendInvitation(managerPage, path, {search: recipient, givenName: 'Nova', subject});
        const links = await invitationLinks(pkpMail, {to: recipient, contains: subject});

        // Signed out, the accept link opens the wizard on "Create OPS account"
        // with no "Verify ORCID iD" step, ORCID being off on this server
        // (Rule 5; the rail's own "Create OPS account" pill is the control).
        const wizard = new AcceptInvitationWizard(page);
        await wizard.open(links.acceptUrl);
        await expect(wizard.createAccountHeading).toBeVisible();
        await expect(wizard.stepPill('Create OPS account')).toBeVisible();
        await expect(wizard.stepPill('Verify ORCID iD')).toHaveCount(0);
        await expect(page.getByText('Verify ORCID iD')).toHaveCount(0);

        // The Password field states its minimum (six characters on a default
        // install); Pass5 is refused inline and the step does not advance
        // (Settings). The accepted password below is the control.
        await expect(wizard.passwordHint).toHaveText(/at least 6 characters long/);
        await wizard.submitAccount({username, password: 'Pass5'});
        await expect(wizard.fieldError('The password must be at least 6 characters.')).toBeVisible();
        await expect(wizard.createAccountHeading).toBeVisible();
        await expect(page.getByRole('heading', {name: /Enter details/})).toHaveCount(0);

        // The consent checkbox's label links to the server's Privacy
        // Statement page (Settings).
        await expect(wizard.privacyStatementLink).toHaveAttribute('href', new RegExp(`/${path}/about/privacy$`));

        await wizard.createAccount({username, password});
        // "Enter details": Given Name already reads Nova, the name the
        // manager entered (Fields, accept wizard).
        await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible();
        await expect(wizard.givenNameInput).toHaveValue('Nova');
        await wizard.fillDetails({givenName: 'Nova', country: 'Canada'});

        // Review & create account: the summary shows the chosen username and
        // the offered role; its Edit button reopens the details step.
        await expect(wizard.reviewHeading).toBeVisible();
        await expect(page.getByText(username, {exact: true})).toBeVisible();
        await expect(page.getByText(ROLE)).toBeVisible();
        await page.getByRole('button', {name: 'Edit', exact: true}).click();
        await expect(page.getByLabel(/^Given Name/).first()).toBeVisible();
        await wizard.saveAndContinueButton.click();
        await expect(wizard.reviewHeading).toBeVisible();

        await wizard.acceptAndAwaitConfirmation();
        await wizard.acceptedDialog.getByRole('button', {name: 'View All Submissions'}).click();

        // Spec behavior around A4 (not asserted): wherever the dialog button
        // lands, signing in with the new credentials succeeds.
        await signInFresh(page, username, password);

        // Control: the invitation's row is gone from the manager's Invitations
        // table, beside the account now holding the role (Rule 11).
        const users = new UsersRolesPage(managerPage, path);
        await users.goto();
        await expect(users.invitationsCountHeading(0)).toBeVisible();
        await expect(users.invitationRow(recipient)).toHaveCount(0);
        const userRow = users.userRow(recipient);
        await expect(userRow).toBeVisible();
        await expect(userRow).toContainText(ROLE);
    });

    test('S3: existing user accepts an additional role', async ({page, asUser, pkpApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const member = `ex${tag}`;
        const memberEmail = `${member}@mail.test`;
        const disabled = `dis${tag}`;
        const disabledEmail = `${disabled}@mail.test`;
        const subject = `Invitation${tag}`;
        // The member's Author role is seeded "Appear on the masthead" (the
        // `masthead` key omitted); the second Author's account is disabled.
        const {path, manager} = await seedServer(pkpApi, tag, [
            {username: member, roles: ['author']},
            {username: disabled, roles: ['author'], disabled: true},
        ]);

        const managerPage = await (await asUser(manager)).newPage();
        const users = new UsersRolesPage(managerPage, path);
        const sendWizard = new SendInvitationWizard(managerPage);

        // The disabled user on "Search User": "The user is currently
        // disabled." with the instructions to enable them first; no role row
        // can be added ("Add Another Role" and "Save And Continue" shown but
        // inactive, no new-role row); the Author role they hold is listed
        // with an active masthead select and an active "Remove Role", left
        // unpressed (Rule 14).
        await users.goto();
        await users.inviteToRoleButton.click();
        await sendWizard.expectSearchStep();
        await sendWizard.searchAndContinue(disabledEmail);
        await expect(sendWizard.disabledUserHeading).toBeVisible();
        await expect(sendWizard.disabledUserInstructions).toBeVisible();
        await expect(sendWizard.addAnotherRoleButton).toBeVisible();
        await expect(sendWizard.addAnotherRoleButton).toBeDisabled();
        await expect(sendWizard.saveAndContinueButton).toBeVisible();
        await expect(sendWizard.saveAndContinueButton).toBeDisabled();
        const disabledAuthorRow = sendWizard.currentRoleRow('Author');
        await expect(sendWizard.mastheadSelect(disabledAuthorRow)).toBeEnabled();
        await expect(sendWizard.removeRoleButton(disabledAuthorRow)).toBeEnabled();
        await expect(sendWizard.newRoleRows).toHaveCount(0);

        // Edit on the disabled user's row, Users & Roles reached by typing
        // its address: the same warning above their details and current
        // roles, the same two inactive buttons, the Author row again with an
        // active masthead select and "Remove Role", left unpressed (Rule 14).
        await users.goto();
        await users.openUserEdit(disabledEmail);
        await expect(sendWizard.stepHeading(/Enter details/)).toBeVisible();
        await sendWizard.expectAbove(sendWizard.disabledUserHeading, sendWizard.emailAddressHeading);
        await sendWizard.expectAbove(sendWizard.disabledUserHeading, disabledAuthorRow);
        await expect(sendWizard.disabledUserInstructions).toBeVisible();
        await expect(managerPage.getByText(disabledEmail)).toBeVisible();
        await expect(sendWizard.addAnotherRoleButton).toBeDisabled();
        await expect(sendWizard.saveAndContinueButton).toBeDisabled();
        await expect(sendWizard.mastheadSelect(disabledAuthorRow)).toBeEnabled();
        await expect(sendWizard.removeRoleButton(disabledAuthorRow)).toBeEnabled();
        await expect(sendWizard.newRoleRows).toHaveCount(0);

        // "Search User" for the enabled member: the wizard confirms the user
        // exists and shows their details read-only, without the disabled
        // warning (the control for the two reads above).
        await users.goto();
        await users.inviteToRoleButton.click();
        await sendWizard.expectSearchStep();
        await sendWizard.searchAndContinue(memberEmail);
        await expect(sendWizard.userFoundMessage).toBeVisible();
        await expect(managerPage.getByText(memberEmail)).toBeVisible();
        // Read-only: no editable personal fields for an existing user.
        await expect(sendWizard.emailAddressHeading).toBeVisible();
        await expect(managerPage.getByLabel(/^Given Name/)).toHaveCount(0);
        await expect(sendWizard.emailField).toHaveCount(0);
        await expect(sendWizard.disabledUserHeading).toHaveCount(0);

        // The held Author row on "Enter details": listed above the new-role
        // row, with a masthead select (on "Appear on the masthead") and
        // "Remove Role" (Rule 13a).
        const authorRow = sendWizard.currentRoleRow('Author');
        await expect(sendWizard.newRoleRows).toHaveCount(1);
        await sendWizard.expectAbove(authorRow, sendWizard.newRoleRows.first());
        await expect(sendWizard.mastheadSelect(authorRow)).toHaveValue('true');
        await expect(sendWizard.mastheadChoice(authorRow)).toHaveText(MASTHEAD_SHOW);
        await expect(sendWizard.removeRoleButton(authorRow)).toBeVisible();

        // The page's own masthead saves, counted to bound "nothing changed".
        const mastheadSaves = [];
        managerPage.on('request', (r) => {
            if (r.url().includes('/masthead/')) {
                mastheadSaves.push(r.url());
            }
        });

        // "Cancel" on the confirmation: the select is back on "Appear on the
        // masthead" and nothing changed: no save was sent (Rule 13a). The
        // "Confirm" below, sending one, is the control.
        await sendWizard.chooseMasthead(authorRow, MASTHEAD_HIDE);
        await sendWizard.cancelMastheadChange();
        await expect(sendWizard.mastheadSelect(authorRow)).toHaveValue('true');
        await expect(sendWizard.mastheadChoice(authorRow)).toHaveText(MASTHEAD_SHOW);
        expect(mastheadSaves).toHaveLength(0);

        // "Confirm": the change applies at once (one save sent, the select on
        // the new choice). On a preprint server the save answers with an
        // error dialog (register OMP1): dismissed, never asserted; the
        // masthead email is read on OJS only (fn-s).
        await sendWizard.chooseMasthead(authorRow, MASTHEAD_HIDE);
        await sendWizard.confirmMastheadChange();
        expect(mastheadSaves).toHaveLength(1);
        await expect(sendWizard.mastheadSelect(authorRow)).toHaveValue('false');

        // Leaving without sending, by typing the Users & Roles address: no
        // question is asked and the Invitations table gains no row (Rule 15);
        // Edit on the member's row shows "Does not appear on the masthead" on
        // the Author row: the change stays though nothing was sent (Rule 13a).
        const leaveDialogs = [];
        const onDialog = (dialog) => {
            leaveDialogs.push(dialog.type());
            dialog.accept().catch(() => {});
        };
        managerPage.on('dialog', onDialog);
        await users.goto();
        managerPage.off('dialog', onDialog);
        expect(leaveDialogs).toEqual([]);
        await expect(users.invitationsCountHeading(0)).toBeVisible();
        await expect(users.userRow(memberEmail)).toBeVisible();
        await expect(users.invitationRow(memberEmail)).toHaveCount(0);
        await users.openUserEdit(memberEmail);
        await expect(sendWizard.stepHeading(/Enter details/)).toBeVisible();
        await expect(sendWizard.mastheadSelect(authorRow)).toHaveValue('false');
        await expect(sendWizard.mastheadChoice(authorRow)).toHaveText(MASTHEAD_HIDE);

        // "Enter details" and the compose step: back on Users & Roles, the
        // same search, one new role row, sent.
        await sendInvitation(managerPage, path, {search: memberEmail, existing: true, subject});

        // The recipient's mailbox: the email lists the offered role and, as a
        // role already held, Author, whose line carries the sentence of the
        // choice confirmed above (Rule 13a, Side effects).
        const links = await invitationLinks(pkpMail, {to: memberEmail, contains: subject});
        const held = links.text.match(/Already assigned roles(.*)Newly assigned roles(.*)$/);
        expect(held, 'the email lists held roles before the offered ones').not.toBeNull();
        const [, heldPart, newPart] = /** @type {RegExpMatchArray} */ (held);
        expect(heldPart).toContain('Author');
        expect(heldPart).toMatch(/Your name will not appear in .+'s masthead as an? Author\./);
        expect(newPart).toContain(ROLE);
        expect(newPart).toMatch(new RegExp(`Your name will appear in .+'s masthead as an? ${ROLE}\\.`));

        // Recipient (signed out): the review step opens directly — no
        // password prompt, no account fields (Rule 6; ORCID off per Rule 5).
        const wizard = new AcceptInvitationWizard(page);
        await wizard.open(links.acceptUrl);
        await expect(wizard.reviewHeading).toBeVisible();
        await expect(wizard.acceptButton).toBeVisible();
        await expect(page.getByText(ROLE)).toBeVisible();
        await expect(wizard.usernameInput).toHaveCount(0);
        await expect(wizard.passwordInput).toHaveCount(0);

        // The link opened, the accept button not pressed: the manager's row
        // still reads "Invited {date}" (Rule 5).
        await users.goto();
        await expect(users.invitationsCountHeading(1)).toBeVisible();
        await expect(users.invitationRow(memberEmail)).toContainText(`Invited ${today()}`);

        await wizard.acceptAndAwaitConfirmation();

        // Spec behavior around A4 (not asserted): signing in the usual way works.
        await signInFresh(page, member, member + member);

        // The manager sees the member under Current Users with Author and
        // the offered role. Control: the invitation's row is gone (Rule 11),
        // where it still stood before the accept button was pressed.
        await users.goto();
        await expect(users.invitationsCountHeading(0)).toBeVisible();
        await expect(users.invitationRow(memberEmail)).toHaveCount(0);
        const memberRow = users.userRow(memberEmail);
        await expect(memberRow).toBeVisible();
        await expect(memberRow).toContainText('Author');
        await expect(memberRow).toContainText(ROLE);
    });

    test('S4: recipient declines', async ({page, asUser, pkpApi, pkpMail}, testInfo) => {
        const tag = makeTag('s4', testInfo);
        const recipient = `rcpt${tag}@mail.test`;
        const subject = `Invitation${tag}`;
        const {path, manager} = await seedServer(pkpApi, tag);

        const managerPage = await (await asUser(manager)).newPage();
        await sendInvitation(managerPage, path, {search: recipient, givenName: 'Nova', subject});
        const links = await invitationLinks(pkpMail, {to: recipient, contains: subject});

        // The decline link opens a confirmation page; only confirming declines.
        await page.goto(links.declineUrl);
        const decline = new DeclineInvitationPage(page);
        await expect(decline.heading).toBeVisible();
        await expect(decline.description).toBeVisible();

        // The page open, not yet confirmed: the manager's row still reads
        // "Invited {date}" (Rule 10).
        const users = new UsersRolesPage(managerPage, path);
        await users.goto();
        await expect(users.invitationsCountHeading(1)).toBeVisible();
        await expect(users.invitationRow(recipient)).toContainText(`Invited ${today()}`);

        await decline.confirmButton.click();
        // The browser moves to the sign-in page (Rule 10).
        await page.waitForURL(/\/login/, {waitUntil: 'commit'});

        // No role granted, row gone: no account was created for the newcomer
        // (the manager's own row bounds the users list read).
        await users.goto();
        await expect(users.invitationsCountHeading(0)).toBeVisible();
        await expect(users.invitationRow(recipient)).toHaveCount(0);
        await expect(users.usersTable.getByRole('row').filter({hasText: `${manager}@mail.test`})).toBeVisible();
        await expect(users.usersTable).not.toContainText(recipient);

        // Control: both emailed links now show "Invitation Unavailable" (Rule 4).
        const unavailable = new InvitationUnavailablePage(page);
        await page.goto(links.acceptUrl);
        await unavailable.expectShown();
        await page.goto(links.declineUrl);
        await unavailable.expectShown();
    });

    test('S5: manager cancels a pending invitation', async ({page, asUser, pkpApi, pkpMail}, testInfo) => {
        const tag = makeTag('s5', testInfo);
        const recipient = `rcpt${tag}@mail.test`;
        const subject = `Invitation${tag}`;
        const {path, manager} = await seedServer(pkpApi, tag);

        const managerPage = await (await asUser(manager)).newPage();
        await sendInvitation(managerPage, path, {search: recipient, givenName: 'Nova', subject});
        const links = await invitationLinks(pkpMail, {to: recipient, contains: subject});

        const users = new UsersRolesPage(managerPage, path);
        await users.goto();
        await users.openInvitationAction(recipient, 'Cancel Invite');

        // The confirmation dialog recaps the invitee: email, role, status, affiliation.
        const dialog = managerPage.getByRole('dialog').filter({hasText: 'Cancel Invitation'});
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(recipient);
        await expect(dialog).toContainText(ROLE);
        await expect(dialog).toContainText('Invited');
        await expect(dialog).toContainText('Affiliation');

        // Confirm; the row disappears (bounded by the list's own refetch).
        const refetch = managerPage.waitForResponse(
            (r) => r.url().includes('/invitations/userRoleAssignment') && r.request().method() === 'GET'
        );
        await dialog.getByRole('button', {name: 'Cancel Invitation', exact: true}).click();
        await refetch;
        await expect(users.invitationsCountHeading(0)).toBeVisible();
        await expect(users.invitationRow(recipient)).toHaveCount(0);

        // The recipient's accept link now shows "Invitation Unavailable" with
        // Login and Register buttons (Rules 4, 16).
        const unavailable = new InvitationUnavailablePage(page);
        await page.goto(links.acceptUrl);
        await unavailable.expectShown();

        // Control: the same accept link with its end cut off shows a not-found
        // error, never the "Invitation Unavailable" page just read (Rule 4).
        const truncated = await page.goto(links.acceptUrl.slice(0, -3));
        expect(truncated && truncated.status()).toBe(404);
        await expect(page.getByRole('heading', {name: '404 Not Found'})).toBeVisible();
        await expect(unavailable.heading).toHaveCount(0);
    });

    test('S6: manager edits a pending invitation (edit = replace)', async ({page, asUser, pkpApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const recipient = `rcpt${tag}@mail.test`;
        const firstMarker = `${tag}first`;
        const secondMarker = `${tag}second`;
        const {path, manager} = await seedServer(pkpApi, tag);

        const managerPage = await (await asUser(manager)).newPage();
        await sendInvitation(managerPage, path, {search: recipient, givenName: 'Nova', subject: firstMarker});
        const first = await invitationLinks(pkpMail, {to: recipient, contains: firstMarker});

        const users = new UsersRolesPage(managerPage, path);
        await users.goto();
        await users.openInvitationAction(recipient, 'Edit');

        // A dialog warns the current invitation will be canceled and a new one
        // sent (Rule 12). Proceed.
        const editDialog = managerPage.getByRole('dialog').filter({hasText: 'Edit Invitation'});
        await expect(editDialog).toBeVisible();
        await expect(editDialog).toContainText('the current invitation will be canceled');
        await editDialog.getByRole('button', {name: 'Edit Invitation'}).click();
        await managerPage.waitForURL(/\/invitation\/edit\/\d+/, {waitUntil: 'commit'});

        // The wizard reopens prefilled, without the search step.
        const wizard = new SendInvitationWizard(managerPage);
        await expect(wizard.stepHeading(/Enter details/)).toBeVisible();
        await expect(wizard.stepPill('Enter details')).toBeVisible();
        await expect(wizard.stepPill('Search User')).toHaveCount(0);
        await expect(wizard.emailField).toHaveValue(recipient);
        await expect(wizard.searchInput).toHaveCount(0);
        // Change the role set: keep Moderator, add a second role; replace the
        // subject with the second marker and send.
        await wizard.addAnotherRoleButton.click();
        await wizard.fillNewRoleRow(1, {role: 'Author', dateStart: today(), masthead: MASTHEAD_HIDE});
        await wizard.saveAndContinueButton.click();
        await wizard.setSubject(secondMarker);
        await wizard.sendAndAwaitConfirmation();

        // The mailbox holds a second invitation whose links work (the
        // positive control): its accept link opens the accept wizard…
        const second = await invitationLinks(pkpMail, {to: recipient, contains: secondMarker});
        const acceptWizard = new AcceptInvitationWizard(page);
        await acceptWizard.open(second.acceptUrl);
        await expect(acceptWizard.createAccountHeading).toBeVisible();

        // …while the first email's links no longer do (Rule 12; the exact
        // error rendering is register A3, not asserted: the replaced link
        // must not open the accept flow).
        await page.goto(first.acceptUrl);
        await expect(acceptWizard.createAccountHeading).toHaveCount(0);
        await expect(acceptWizard.acceptButton).toHaveCount(0);
    });

    test('S7: wrong person signed in is refused until they log out', async ({asUser, pkpApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const member = `ex${tag}`;
        const memberEmail = `${member}@mail.test`;
        const bystander = `by${tag}`;
        const subject = `Invitation${tag}`;
        const {path, manager} = await seedServer(pkpApi, tag, [
            {username: member, roles: ['author']},
            {username: bystander, roles: ['reader']},
        ]);

        // The member's invitation, as in scenario 3: their mailbox holds the
        // accept link.
        const managerPage = await (await asUser(manager)).newPage();
        await sendInvitation(managerPage, path, {search: memberEmail, existing: true, subject});
        const links = await invitationLinks(pkpMail, {to: memberEmail, contains: subject});

        // A signed-in user who is not the invitee opens the accept link: refused.
        const bystanderPage = await (await asUser(bystander)).newPage();
        const wizard = new AcceptInvitationWizard(bystanderPage);
        await wizard.open(links.acceptUrl);
        await expect(wizard.refusalDialog).toBeVisible();
        await expect(wizard.refusalDialog).toContainText('Invitation not accepted');
        await expect(wizard.refusalDialog).toContainText(
            'Please log out and sign in with the correct account'
        );

        // Control: "Logout" genuinely ends that session (Rule 6)…
        await wizard.refusalDialog.getByRole('button', {name: 'Logout'}).click();
        await bystanderPage.waitForURL((url) => !url.href.includes('/invitation/accept'), {
            waitUntil: 'commit',
        });
        await bystanderPage.goto(`/index.php/${path}/user/profile`);
        await bystanderPage.waitForURL(/\/login/, {waitUntil: 'commit'});

        // …and reopening the link signed out starts the real (existing-user)
        // flow: the review step, no password prompt, no account fields.
        await wizard.open(links.acceptUrl);
        await expect(wizard.reviewHeading).toBeVisible();
        await expect(wizard.acceptButton).toBeVisible();
        await expect(bystanderPage.getByText(ROLE)).toBeVisible();
        await expect(wizard.passwordInput).toHaveCount(0);
    });

    test('S8: manager proposes a role via the user row', async ({page, asUser, pkpApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        const member = `ex${tag}`;
        const memberEmail = `${member}@mail.test`;
        const subject = `Invitation${tag}`;
        const {path, manager} = await seedServer(pkpApi, tag, [{username: member, roles: ['author', 'reader']}]);

        const managerPage = await (await asUser(manager)).newPage();
        const users = new UsersRolesPage(managerPage, path);
        await users.goto();
        await users.openUserEdit(memberEmail);

        // The wizard opens on the member's details with no search step; the
        // roles table shows the current roles with Remove Role and masthead
        // controls (Rule 13).
        const wizard = new SendInvitationWizard(managerPage);
        await expect(wizard.stepHeading(/Enter details/)).toBeVisible();
        await expect(wizard.stepPill('Enter details')).toBeVisible();
        await expect(wizard.stepPill('Search User')).toHaveCount(0);
        await expect(managerPage.getByText(memberEmail).first()).toBeVisible();
        await expect(wizard.searchInput).toHaveCount(0);
        const authorRow = wizard.currentRoleRow('Author');
        const readerRow = wizard.currentRoleRow('Reader');
        await expect(wizard.removeRoleButton(authorRow)).toBeVisible();
        await expect(wizard.removeRoleButton(readerRow)).toBeVisible();
        await expect(wizard.mastheadSelect(authorRow)).toHaveValue('true');
        await expect(wizard.mastheadSelect(readerRow)).toHaveValue('true');

        // The masthead control on the Author row: pick the other value; the
        // confirmation says the member will be notified; confirm. On a
        // preprint server the confirmation answers with an error (register
        // OMP1): it is dismissed, never asserted.
        // The change takes effect at once, read settled: the select holds
        // the new value, and still after a reload (Rule 13). The masthead
        // email is read on OJS only (fn-s).
        await wizard.mastheadSelect(authorRow).selectOption({label: MASTHEAD_HIDE});
        await expect(wizard.mastheadDialog).toBeVisible();
        await expect(wizard.mastheadDialog).toContainText('The user will be notified of this change.');
        const mastheadSaved = managerPage.waitForResponse((r) => r.url().includes('/masthead/'));
        await wizard.mastheadDialog.getByRole('button', {name: 'Confirm'}).click();
        const mastheadStatus = (await mastheadSaved).status();
        await expect(wizard.mastheadDialog).toBeHidden();
        if (mastheadStatus >= 400) {
            await wizard.dismissErrorDialog();
        }
        await expect(wizard.mastheadSelect(authorRow)).toHaveValue('false');
        await managerPage.reload();
        await expect(wizard.stepHeading(/Enter details/)).toBeVisible();
        await expect(wizard.mastheadSelect(authorRow)).toHaveValue('false');

        // Remove Role on the Reader row: the confirmation asks "Are you sure
        // you want to remove this role? …" and says nothing of an email;
        // confirm with "Remove Role": the row stays in the roles table with
        // its End Date set to today and "User Removed From Role" in place of
        // its button (the Author row's button and blank End Date are the
        // control), and the member's mailbox holds "You have been removed
        // from a role" (Rule 13, Side effects).
        await wizard.removeRoleButton(readerRow).click();
        await expect(wizard.removeRoleDialog).toBeVisible();
        await expect(wizard.removeRoleDialog).toContainText(
            'Are you sure you want to remove this role? The user will lose access and permissions associated with it.'
        );
        await expect(wizard.removeRoleDialog).not.toContainText('notified');
        await expect(wizard.removeRoleDialog.getByRole('button')).toHaveText(['Remove Role', 'Cancel']);
        const roleEnded = managerPage.waitForResponse((r) => r.url().includes('/endRole/'));
        await wizard.removeRoleDialog.getByRole('button', {name: 'Remove Role'}).click();
        expect((await roleEnded).status()).toBe(200);
        await expect(wizard.removeRoleDialog).toBeHidden();
        await expect(readerRow).toHaveCount(1);
        await expect(readerRow.getByRole('cell')).toContainText(['Reader', today(), today(), /masthead/, 'User Removed From Role']);
        await expect(wizard.removeRoleButton(readerRow)).toHaveCount(0);
        await expect(authorRow.getByRole('cell').nth(2)).toHaveText('---');
        await expect(wizard.removeRoleButton(authorRow)).toBeVisible();
        await pkpMail.find({to: memberEmail, subject: ROLE_ENDED_SUBJECT});

        // Remove Role on the Author row, now the last active role: no
        // confirmation opens; a "Remove Role" dialog answers "You cannot
        // remove the role. …" with a single "Close" button; after "Close"
        // the row keeps its Remove Role button and masthead select (Rule 13;
        // the Reader removal above is the control).
        await wizard.removeRoleButton(authorRow).click();
        await expect(wizard.removeRoleDialog).toBeVisible();
        await expect(wizard.removeRoleDialog).toContainText(
            'You cannot remove the role. At least one role must be assigned to the user.'
        );
        await expect(wizard.removeRoleDialog).not.toContainText('Are you sure');
        await expect(wizard.removeRoleDialog.getByRole('button')).toHaveText(['Close']);
        await wizard.removeRoleDialog.getByRole('button', {name: 'Close'}).click();
        await expect(wizard.removeRoleDialog).toBeHidden();
        await expect(wizard.removeRoleButton(authorRow)).toBeVisible();
        await expect(wizard.mastheadSelect(authorRow)).toHaveValue('false');
        await expect(authorRow).not.toContainText('User Removed From Role');

        // "Save And Continue" on the details step stays inactive until a new
        // role row is added; an empty row activates it, and pressing it
        // rejects the missing role fields with inline errors (Rule 13).
        await expect(wizard.saveAndContinueButton).toBeDisabled();
        await expect(wizard.newRoleRows).toHaveCount(0);
        await wizard.addAnotherRoleButton.click();
        await expect(wizard.newRoleRows).toHaveCount(1);
        await expect(wizard.saveAndContinueButton).toBeEnabled();
        await wizard.saveAndContinueButton.click();
        await expect(wizard.requiredErrors(wizard.newRoleRows.first())).toHaveCount(3);
        await expect(wizard.stepHeading(/Enter details/)).toBeVisible();
        await expect(wizard.subjectInput).toHaveCount(0);

        // The filled row: fill it in and send: the member receives an
        // invitation email.
        await wizard.fillNewRoleRow(0, {role: ROLE, dateStart: today(), masthead: MASTHEAD_SHOW});
        await wizard.saveAndContinueButton.click();
        await wizard.setSubject(subject);
        await wizard.sendAndAwaitConfirmation();

        // The member is emailed, but the added role is only a proposal: not on
        // the account yet (the visible row bounds the list read).
        const links = await invitationLinks(pkpMail, {to: memberEmail, contains: subject});
        await users.goto();
        await expect(users.invitationsCountHeading(1)).toBeVisible();
        const memberRow = users.userRow(memberEmail);
        await expect(memberRow).toBeVisible();
        await expect(memberRow).toContainText('Author');
        await expect(memberRow).not.toContainText(ROLE);

        // The member accepts (scenario 3's flow) — only then the role lands.
        const acceptWizard = new AcceptInvitationWizard(page);
        await acceptWizard.open(links.acceptUrl);
        await expect(acceptWizard.reviewHeading).toBeVisible();
        await acceptWizard.acceptAndAwaitConfirmation();

        await users.goto();
        await expect(users.invitationsCountHeading(0)).toBeVisible();
        await expect(users.userRow(memberEmail)).toContainText(ROLE);

        // Control: the removal and the masthead change took effect at once,
        // read back on the reopened wizard (Rule 13).
        await users.openUserEdit(memberEmail);
        await expect(wizard.stepHeading(/Enter details/)).toBeVisible();
        await expect(wizard.removeRoleButton(wizard.currentRoleRow(ROLE))).toBeVisible();
        await expect(wizard.mastheadSelect(wizard.currentRoleRow('Author'))).toHaveValue('false');
        await expect(wizard.removeRoleButton(wizard.currentRoleRow('Reader'))).toHaveCount(0);
        await expect(wizard.currentRoleRow('Reader')).toContainText('User Removed From Role');
    });

    test('S9 {OPS}: the invitation template is missing from the Emails screen', async ({asUser}) => {
        // Read-only browsing on the seeded server as its Preprint Server
        // Manager. Deliverability of the invitation email on this same server
        // is scenario 1's assertion (the spec names it as this scenario's
        // send-side positive control).
        const page = await (await asUser('manager.maya')).newPage();
        await page.goto('/index.php/publicknowledge/management/settings/manageEmails');
        await expect(page.getByRole('heading', {name: 'Manage Emails'})).toBeVisible();

        // The Search component submits the phrase only on Enter (Search.vue).
        const search = page.getByRole('searchbox');

        // Positive control, taken the same way: another stored template is
        // findable and offers Edit.
        await search.pressSequentially('Password Reset Confirm', {delay: 20});
        await search.press('Enter');
        await expect(page.getByText('Password Reset Confirm', {exact: true})).toBeVisible();
        await expect(
            page.getByRole('button', {name: 'Edit Password Reset Confirm'})
        ).toBeVisible();
        // The filter is genuinely applied (other templates are gone) before
        // the absence claim is made the same way.
        await expect(page.getByText('Statistics Report Notification', {exact: true})).toHaveCount(0);

        // The invitation template has no row: the list answers "No items found."
        await search.fill('');
        await search.pressSequentially('User Invited to Role Notification', {delay: 20});
        await search.press('Enter');
        await expect(page.getByText('No items found.')).toBeVisible();
        await expect(page.getByText('User Invited to Role Notification')).toHaveCount(0);
    });

    test('S10: the ORCID step shows only to a recipient without a verified iD', async ({page, asUser, pkpApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        const recipient = `rcpt${tag}@mail.test`;
        const member = `ex${tag}`;
        const memberEmail = `${member}@mail.test`;
        const subject = `Invitation${tag}`;
        const {path, manager} = await seedServer(
            pkpApi,
            tag,
            [{username: member, roles: ['author'], orcid: ORCID_ID, orcidIsVerified: true}],
            {orcid: {}}
        );

        const managerPage = await (await asUser(manager)).newPage();

        // A newcomer's invitation, as in scenario 1.
        await sendInvitation(managerPage, path, {search: recipient, givenName: 'Nova', subject});
        const newcomerLinks = await invitationLinks(pkpMail, {to: recipient, contains: subject});

        // The newcomer's accept link, signed out: the wizard opens on "Verify
        // ORCID iD", offering "Verify ORCID iD" and "Skip ORCID verification"
        // and no other Continue button (Rules 5, 7). "Verify ORCID iD" stays
        // unpressed (ORCID's sign-in never completes on a test install).
        await page.goto(newcomerLinks.acceptUrl);
        const wizard = new AcceptInvitationWizard(page);
        await expect(wizard.orcidStepHeading).toBeVisible();
        await expect(wizard.stepPill('Verify ORCID iD')).toBeVisible();
        await expect(wizard.verifyOrcidButton).toBeVisible();
        await expect(wizard.skipOrcidButton).toBeVisible();
        await expect(wizard.saveAndContinueButton).toHaveCount(0);
        await expect(page.getByRole('button', {name: /continue/i})).toHaveCount(0);

        // "Skip ORCID verification": "Create OPS account" opens (Rule 5), with
        // its own "Save and continue" (the control for the step above).
        await wizard.skipOrcidButton.click();
        await expect(wizard.createAccountHeading).toBeVisible();
        await expect(wizard.saveAndContinueButton).toBeVisible();

        // The verified user's invitation, as in scenario 3.
        await sendInvitation(managerPage, path, {search: memberEmail, existing: true, subject});
        const memberLinks = await invitationLinks(pkpMail, {to: memberEmail, contains: subject});

        // Control: that accept link, signed out, opens the review step directly
        // with no "Verify ORCID iD" step (Rule 5).
        await page.goto(memberLinks.acceptUrl);
        await expect(wizard.reviewHeading).toBeVisible();
        await expect(wizard.stepPill('Review & create account')).toBeVisible();
        await expect(wizard.stepPill('Verify ORCID iD')).toHaveCount(0);
        await expect(page.getByText('Verify ORCID iD')).toHaveCount(0);
        await expect(wizard.acceptButton).toBeVisible();
    });

    test('S11: an existing user cancels the accept wizard, and the invitation waits', async ({page, asUser, pkpApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s11', testInfo);
        const member = `ex${tag}`;
        const memberEmail = `${member}@mail.test`;
        const subject = `Invitation${tag}`;
        // ORCID off: the context omits the `orcid` key (fn-s).
        const {path, manager} = await seedServer(pkpApi, tag, [{username: member, roles: ['author']}]);

        // The pending invitation to Moderator, sent as in scenario 3
        // ("Search User", one new role row).
        const managerPage = await (await asUser(manager)).newPage();
        await sendInvitation(managerPage, path, {search: memberEmail, existing: true, subject});
        const links = await invitationLinks(pkpMail, {to: memberEmail, contains: subject});
        const users = new UsersRolesPage(managerPage, path);

        // The user's own browser, signed out (the fixture page: no default
        // user in this file).
        const userPage = page;
        const wizard = new AcceptInvitationWizard(userPage);
        const mySubmissions = new MySubmissionsPage(userPage, path);

        // The accept link, signed out: the wizard opens on "Review &
        // create account", with no "Verify ORCID iD" step (Rule 5; the
        // rail's own review pill is the control).
        await wizard.open(links.acceptUrl);
        await expect(wizard.reviewHeading).toBeVisible();
        await expect(wizard.stepPill('Review & create account')).toBeVisible();
        await expect(wizard.stepPill('Verify ORCID iD')).toHaveCount(0);
        await expect(userPage.getByText('Verify ORCID iD')).toHaveCount(0);

        // "Cancel" and "Go Back": the question, its two buttons; "Go Back"
        // returns to the review step (Rule 17).
        await wizard.openCancelDialog();
        await expect(wizard.cancelDialog).toContainText(
            /Are you sure you want to cancel\? Canceling now will stop the role acceptance process, and you['’]ll need to restart from the invitation email to accept the role again\./
        );
        await expect(wizard.cancelDialog.getByRole('button')).toHaveText(['Cancel Invitation Process', 'Go Back']);
        await wizard.goBackButton.click();
        await expect(wizard.cancelDialog).toBeHidden();
        await expect(wizard.reviewHeading).toBeVisible();
        await expect(wizard.acceptButton).toBeVisible();

        // "Cancel Invitation Process", signed out: the sign-in screen;
        // signing in there opens My Submissions (Rule 17).
        await wizard.openCancelDialog();
        await wizard.cancelProcessButton.click();
        await userPage.waitForURL(/\/login/, {waitUntil: 'commit'});
        const login = new LoginPage(userPage);
        await login.expectForm();
        await login.signIn(member, member + member);
        await expect(userPage).toHaveURL(/\/dashboard\/mySubmissions/);
        await mySubmissions.expectViewHeading('Active submissions');

        // The manager's Users & Roles: the row still reads "Invited
        // {date}", and Edit on the user's row shows Author alone in the
        // roles table: the cancel declined nothing and changed no role
        // (Rule 17).
        await users.goto();
        await expect(users.invitationsCountHeading(1)).toBeVisible();
        await expect(users.invitationRow(memberEmail)).toContainText(`Invited ${today()}`);
        await users.openUserEdit(memberEmail);
        const sendWizard = new SendInvitationWizard(managerPage);
        await expect(sendWizard.stepHeading(/Enter details/)).toBeVisible();
        await expect(sendWizard.removeRoleButton(sendWizard.currentRoleRow('Author'))).toBeVisible();
        await expect(sendWizard.currentRoleRow(ROLE)).toHaveCount(0);

        // The accept link, signed in as the user: the same review step
        // (Rules 6, 17).
        await wizard.open(links.acceptUrl);
        await expect(wizard.reviewHeading).toBeVisible();
        await expect(wizard.acceptButton).toBeVisible();
        await expect(userPage.getByText(ROLE)).toBeVisible();
        await expect(wizard.usernameInput).toHaveCount(0);
        await expect(wizard.passwordInput).toHaveCount(0);

        // "Cancel Invitation Process", signed in: My Submissions opens,
        // the user still signed in (the private list rendered, not the
        // sign-in form) (Rule 17).
        await wizard.openCancelDialog();
        await wizard.cancelProcessButton.click();
        await userPage.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit'});
        await mySubmissions.expectViewHeading('Active submissions');
        await expect(login.form).toHaveCount(0);

        // Control: the link once more, still signed in; accept, then the
        // dialog's "View All Submissions": the Dashboard's "Assigned to
        // me" opens, the user still signed in (Rule 9); on the manager's
        // Users & Roles the row is gone while Edit on the user's row
        // shows Author and the offered role (Rules 8, 11).
        await wizard.open(links.acceptUrl);
        await expect(wizard.reviewHeading).toBeVisible();
        await wizard.acceptAndAwaitConfirmation();
        await wizard.acceptedDialog.getByRole('button', {name: 'View All Submissions'}).click();
        await new EditorialDashboardPage(userPage, path).expectLanded();
        await expect(login.form).toHaveCount(0);

        await users.goto();
        await expect(users.invitationsCountHeading(0)).toBeVisible();
        await expect(users.invitationRow(memberEmail)).toHaveCount(0);
        await users.openUserEdit(memberEmail);
        await expect(sendWizard.stepHeading(/Enter details/)).toBeVisible();
        await expect(sendWizard.removeRoleButton(sendWizard.currentRoleRow('Author'))).toBeVisible();
        await expect(sendWizard.removeRoleButton(sendWizard.currentRoleRow(ROLE))).toBeVisible();
    });
});
