// @ts-check
/**
 * @file playwright/tests/U06-user-invitations.spec.js
 *
 * U06 — User invitations, OMP suite (spec:
 * docs/specs/U06-user-invitations.md). One test per canonical scenario the
 * spec runs on a press (common scenarios 1–8, 10 and 11, in OMP vocabulary:
 * press, Press Manager, Press Masthead, "Create OMP account", "Accept And
 * Continue to OMP"; the offered roles Author, External Reviewer and
 * Copyeditor per fn-s); scenario 9 is OPS-only.
 *
 * Not covered, by register ID (the spec's Coverage section is the record
 * of everything else left out): A2, A3, A4, A5, A7, A8, A9, A11, A12,
 * OMP1.
 *
 * All mutating state lives in per-test scratch presses seeded through the
 * scenario endpoints; `publicknowledge` and the seeded roster are untouched.
 * Mailpit assertions are scoped to unique throwaway recipients naming app +
 * test (rcpt<tag>@mail.test, tag = u6s<N>ompw<worker><rand>) plus the
 * subject marker typed on the compose step (Invitation<tag>, fn-s).
 */
const {test, expect} = require('../support/fixtures.js');
const {
    UsersAccessPage,
    SendInvitationWizard,
    AcceptInvitationWizard,
    today,
} = require('../pages/UserInvitationPages.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');

/** Parallel-safe unique tag: single alphanumeric token, ≤32 chars. */
function makeTag(testInfo, scenarioKey) {
    const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6);
    return `${scenarioKey}ompw${testInfo.parallelIndex}${rand}`;
}

/** Scratch press + throwaway manager (+ optional extra users, + context keys such as `orcid`). */
async function seedPress(ompApi, tag, extraUsers = [], extraKeys = {}) {
    const manager = `mgr${tag}`;
    await ompApi.createContext({
        tag,
        ...extraKeys,
        users: [
            {username: manager, roles: ['manager'], givenName: `Mgr${tag}`},
            ...extraUsers,
        ],
    });
    return {path: tag, manager};
}

/**
 * Drive the send wizard for a NEW invitee from Users & Roles through the
 * "Invitation Sent" dialog. Returns the UsersAccessPage and the compose
 * step's body text as it stood at send time.
 */
async function sendNewUserInvitation(mgrPage, {contextPath, email, givenName, role, subject}) {
    const access = new UsersAccessPage(mgrPage, contextPath);
    const wizard = new SendInvitationWizard(mgrPage);
    await access.goto();
    await access.inviteButton.click();
    await expect(wizard.searchField).toBeVisible();
    await wizard.searchFor(email);
    // The wizard reports the user is unknown and moves to "Enter details".
    await expect(
        mgrPage.getByText('The user does not have a role in this press'),
    ).toBeVisible();
    // The searched address arrives typed into the Email field (Fields).
    await expect(wizard.emailField).toHaveValue(email);
    await mgrPage.getByLabel(/Given Name/).first().fill(givenName);
    await wizard.addRole({role});
    await wizard.saveAndContinue();
    const bodyText = await wizard.composeBodyText();
    await wizard.composeAndSend(subject);
    return {access, bodyText};
}

/**
 * Drive the send wizard for an EXISTING press member found by exact email.
 * Never touches the current-role masthead selects (OMP1 boundary).
 */
async function sendExistingUserInvitation(mgrPage, {contextPath, email, role, masthead, subject}) {
    const access = new UsersAccessPage(mgrPage, contextPath);
    const wizard = new SendInvitationWizard(mgrPage);
    await access.goto();
    await access.inviteButton.click();
    await expect(wizard.searchField).toBeVisible();
    await wizard.searchFor(email);
    await expect(
        mgrPage.getByText('The user already exists in the press'),
    ).toBeVisible();
    // Existing users get a read-only summary, not editable personal fields.
    await expect(mgrPage.getByText(email).first()).toBeVisible();
    await expect(mgrPage.getByRole('textbox', {name: /^Email/})).toHaveCount(0);
    await wizard.addRole({role, masthead});
    await wizard.saveAndContinue();
    await wizard.composeAndSend(subject);
    return access;
}

/** Pull the invitation email scoped by recipient + unique subject marker. */
async function fetchInvitationEmail(pkpMail, {to, marker}) {
    const summary = await pkpMail.find({to, contains: marker});
    const full = await pkpMail.fullMessage(summary.ID);
    return {
        from: full.From,
        subject: full.Subject,
        text: full.Text,
        html: full.HTML,
        acceptUrl: pkpMail.extractLink(full.HTML, 'Accept Invitation'),
        declineUrl: pkpMail.extractLink(full.HTML, 'Decline Invitation'),
    };
}

test.describe('User invitations (U6)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(180_000));

    test('S1: manager invites a newcomer to a role', async ({ompApi, asUser, pkpMail}, testInfo) => {
        const tag = makeTag(testInfo, 'u6s1');
        const recipient = `rcpt${tag}@mail.test`;
        const marker = `Invitation${tag}`;
        const {path, manager} = await seedPress(ompApi, tag);

        const mgrPage = await (await asUser(manager)).newPage();
        const access = new UsersAccessPage(mgrPage, path);
        const wizard = new SendInvitationWizard(mgrPage);

        // "Search User": an address no account uses; the wizard answers that
        // the user has no role here and moves to "Enter details", the
        // address already in its Email field.
        await access.goto();
        await access.inviteButton.click();
        await expect(wizard.searchField).toBeVisible();
        await wizard.searchFor(recipient);
        await expect(
            mgrPage.getByText('The user does not have a role in this press'),
        ).toBeVisible();
        await expect(wizard.emailField).toHaveValue(recipient);

        // "Enter details": Given Name Nova; the role row's masthead select
        // starts blank once the offered role is picked. Picking External
        // Reviewer instead shows "Appear on the masthead" as fixed text with
        // no select (its positive control: the select just read on Author).
        await mgrPage.getByLabel(/Given Name/).first().fill('Nova');
        await expect(wizard.newRoleRows()).toHaveCount(1);
        const roleRow = wizard.newRoleRows().first();
        await wizard.rowRoleSelect(roleRow).selectOption({label: 'Author'});
        await expect(wizard.rowMastheadSelect(roleRow)).toHaveCount(1);
        await expect(wizard.rowMastheadSelect(roleRow)).toHaveValue('');
        await wizard.rowRoleSelect(roleRow).selectOption({label: 'External Reviewer'});
        await expect(wizard.rowMastheadSelect(roleRow)).toHaveCount(0);
        await expect(roleRow).toContainText('Appear on the masthead');
        await wizard.fillRow(roleRow, {role: 'Author'});
        await expect(wizard.rowMastheadSelect(roleRow)).toHaveValue('true');
        await wizard.saveAndContinue();

        // The compose step: the subject marker; "Invite user to the role"
        // shows "Invitation Sent".
        const bodyText = await wizard.composeBodyText();
        await wizard.composeAndSend(marker);

        // "View All Users": the browser returns to Users & Roles, where the
        // pending row reads "Invited {date}".
        await wizard.viewAllUsers();
        await expect(access.inviteButton).toBeVisible();
        await access.expectInvitationCount(1);
        const row = access.invitationRow(recipient);
        await expect(row).toBeVisible();
        await expect(row).toContainText(access.invitedOn());
        await expect(row).toContainText('Author');

        // The recipient's mailbox: sent from the Press Manager, listing the
        // offered role with its start date and masthead visibility, and the
        // accept and decline links.
        const email = await fetchInvitationEmail(pkpMail, {to: recipient, marker});
        expect(email.from.Address).toBe(`${manager}@mail.test`);
        expect(email.from.Name).toBe(`Mgr${tag}`);
        expect(email.text).toMatch(/Newly assigned roles[\s\S]*Author/);
        expect(email.text).toContain(`Starting from ${today()}`);
        expect(email.text).toMatch(/masthead as a Author/);
        expect(email.acceptUrl).toBeTruthy();
        expect(email.declineUrl).toBeTruthy();

        // The greeting: "Dear Nova,", the Given Name entered on "Enter details".
        expect(email.text).toContain('Dear Nova,');

        // The email's subject is the marker typed on the compose step and its
        // body the text that step showed at send time (the placeholders the
        // step shows unsubstituted are the lines left out of the comparison).
        expect(email.subject).toBe(marker);
        const shownLines = bodyText
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0 && !l.includes('{$'));
        expect(shownLines.length).toBeGreaterThan(3);
        const sentText = email.text.replace(/\s+/g, ' ');
        for (const line of shownLines) {
            expect(sentText).toContain(line.replace(/\s+/g, ' '));
        }

        // A second send to the same address: the wizard answers exactly as the
        // first time (positive control) and gives no hint of the pending
        // invitation; afterwards the Invitations table holds only the newer
        // row, one for that address, the count read settled.
        await access.goto();
        await access.inviteButton.click();
        await expect(wizard.searchField).toBeVisible();
        await wizard.searchFor(recipient);
        await expect(
            mgrPage.getByText('The user does not have a role in this press'),
        ).toBeVisible();
        await expect(
            mgrPage.getByText(/pending invitation|already (been )?invited|existing invitation/i),
        ).toHaveCount(0);
        await mgrPage.getByLabel(/Given Name/).first().fill('Nova');
        await wizard.addRole({role: 'Author'});
        await wizard.saveAndContinue();
        await wizard.composeAndSend(`${marker}again`);
        await fetchInvitationEmail(pkpMail, {to: recipient, marker: `${marker}again`});
        await access.goto();
        await access.expectInvitationCount(1);
        await expect(access.invitationRow(recipient)).toHaveCount(1);
        await expect(access.invitationRow(recipient)).toContainText(access.invitedOn());

        // Control: under Current Users the address has no row (Rule 9); the
        // absence read is bounded by the list's own filtered response.
        await access.searchUsers(recipient);
        await expect(access.userRow(recipient)).toHaveCount(0);
        await access.searchUsers(`Mgr${tag}`);
        await expect(access.userRow(`Mgr${tag}`)).toHaveCount(1);
    });

    test('S2: newcomer accepts and gets an account', async ({ompApi, asUser, pkpMail, page}, testInfo) => {
        const tag = makeTag(testInfo, 'u6s2');
        const recipient = `rcpt${tag}@mail.test`;
        const marker = `Invitation${tag}`;
        const {path, manager} = await seedPress(ompApi, tag);

        const mgrPage = await (await asUser(manager)).newPage();
        const {access} = await sendNewUserInvitation(mgrPage, {
            contextPath: path,
            email: recipient,
            givenName: 'Nova',
            role: 'Author',
            subject: marker,
        });

        const {acceptUrl} = await fetchInvitationEmail(pkpMail, {to: recipient, marker});

        // The accept link: the wizard opens on "Create OMP account" with no
        // "Verify ORCID iD" step, ORCID being off on this press (Rule 5); the
        // step rail (positive control) lists the account step and not the
        // ORCID one.
        const wizard = new AcceptInvitationWizard(page);
        const username = `acc${tag}`;
        const password = `Password${tag}`;
        await page.goto(acceptUrl);
        await expect(wizard.stepHeading('Create OMP account')).toBeVisible();
        await expect(wizard.stepsList).toContainText('Create OMP account');
        await expect(wizard.stepsList).not.toContainText('Verify ORCID iD');
        await expect(wizard.verifyOrcidButton).toHaveCount(0);

        // The password's minimum: the field states six characters (a default
        // install); Pass5 is refused and the step does not advance.
        await expect(wizard.passwordDescription).toContainText('at least 6 characters');
        await wizard.submitAccount({username, password: 'Pass5'});
        await expect(wizard.passwordError).toBeVisible();
        await expect(wizard.passwordField).toHaveAttribute('aria-invalid', 'true');
        await expect(wizard.stepHeading('Create OMP account')).toBeVisible();
        await expect(wizard.stepHeading('Enter details')).toHaveCount(0);

        // The consent checkbox's label links to the press's Privacy Statement.
        await expect(wizard.privacyStatementLink).toHaveAttribute(
            'href',
            new RegExp(`/index\\.php/${path}/about/privacy$`),
        );

        // A valid password advances (the refusal's positive control).
        await wizard.submitAccount({username, password});
        await expect(wizard.stepHeading('Enter details')).toBeVisible();
        // "Enter details" arrives holding the name the manager entered.
        await expect(page.getByLabel(/Given Name/).first()).toHaveValue('Nova');
        await wizard.fillDetails({givenName: 'Nova'});

        // Review & create account; its Edit button reopens the details step.
        await expect(wizard.stepHeading('Review & create account')).toBeVisible();
        await expect(page.getByText(username).first()).toBeVisible();
        await page.getByRole('button', {name: 'Edit', exact: true}).click();
        await expect(page.getByLabel('Country of affiliation')).toBeVisible();
        await wizard.footerButton('Save and continue').click();
        await expect(wizard.stepHeading('Review & create account')).toBeVisible();

        await wizard.accept();

        // The sign-in screen: the new credentials (the fn-s pair, not the
        // roster rule) sign in on the press's own Login page; the wizard's own
        // session state after accepting is register finding A4, not asserted.
        const login = new LoginPage(page);
        await login.gotoContext(path);
        await login.signIn(username, password);
        await page.goto(`/index.php/${path}/dashboard`);
        await expect(page).not.toHaveURL(/\/login/);

        // Control: the pending row is gone beside the account now holding the
        // role (Rule 11).
        await access.goto();
        await access.expectInvitationCount(0);
        await expect(access.invitationRow(recipient)).toHaveCount(0);
        await access.searchUsers(recipient);
        const userRow = access.userRow(recipient);
        await expect(userRow).toBeVisible();
        await expect(userRow).toContainText('Nova');
        await expect(userRow).toContainText('Author');
    });

    test('S3: existing user accepts an additional role', async ({ompApi, asUser, pkpMail, page}, testInfo) => {
        testInfo.setTimeout(300_000);
        const tag = makeTag(testInfo, 'u6s3');
        const recipient = `rcpt${tag}@mail.test`;
        const disabledEmail = `rcpt${tag}d@mail.test`;
        const marker = `Invitation${tag}`;
        const invitee = `usr${tag}`;
        const {path, manager} = await seedPress(ompApi, tag, [
            {
                username: invitee,
                roles: ['author'],
                email: recipient,
                givenName: `Inv${tag}`,
                familyName: 'Existing',
            },
            {
                username: `dis${tag}`,
                roles: ['author'],
                email: disabledEmail,
                givenName: `Dis${tag}`,
                familyName: 'Disabled',
                disabled: true,
            },
        ]);
        const pressName = `Scratch context ${tag}`;

        const mgrPage = await (await asUser(manager)).newPage();
        const browserQuestions = [];
        mgrPage.on('dialog', (d) => {
            browserQuestions.push(d.type());
            d.accept().catch(() => {});
        });
        const access = new UsersAccessPage(mgrPage, path);
        const wizard = new SendInvitationWizard(mgrPage);
        const mastheadRequests = wizard.trackMastheadRequests();

        // The disabled user on "Search User": the warning with its
        // instructions, no role row, "Add Another Role" and "Save And
        // Continue" shown but inactive; the Author role they hold listed with
        // an active masthead select and an active "Remove Role", left
        // unpressed (Rule 14). The enabled user's search below is the
        // positive control for the row and the two buttons.
        await access.goto();
        await access.inviteButton.click();
        await expect(wizard.searchField).toBeVisible();
        await wizard.searchFor(disabledEmail);
        await expect(wizard.disabledWarning).toBeVisible();
        await expect(wizard.disabledInstructions).toBeVisible();
        await expect(wizard.addRoleButton).toBeVisible();
        await expect(wizard.addRoleButton).toBeDisabled();
        await expect(wizard.saveAndContinueButton).toBeVisible();
        await expect(wizard.saveAndContinueButton).toBeDisabled();
        await expect(wizard.currentRoleRow('Author')).toHaveCount(1);
        await expect(wizard.mastheadSelect('Author')).toBeEnabled();
        await expect(wizard.currentRoleRow('Author').getByRole('button', {name: 'Remove Role'})).toBeEnabled();
        await expect(wizard.newRoleRows()).toHaveCount(0);

        // Edit on the disabled user's row (Users & Roles reached by typing its
        // address): the same warning above their details and current roles,
        // the two buttons inactive, the Author row's controls active, left
        // unpressed (Rule 14).
        await access.goto();
        await access.openUserEdit(`Dis${tag}`);
        await expect(wizard.disabledWarning).toBeVisible();
        await expect(wizard.disabledInstructions).toBeVisible();
        await expect.poll(() => wizard.precedes(wizard.disabledWarning, wizard.detailsEmailHeading)).toBe(true);
        await expect.poll(() => wizard.precedes(wizard.disabledWarning, wizard.currentRoleRow('Author'))).toBe(true);
        await expect(mgrPage.getByText(disabledEmail)).toBeVisible();
        await expect(wizard.addRoleButton).toBeDisabled();
        await expect(wizard.saveAndContinueButton).toBeDisabled();
        await expect(wizard.mastheadSelect('Author')).toBeEnabled();
        await expect(wizard.currentRoleRow('Author').getByRole('button', {name: 'Remove Role'})).toBeEnabled();
        await expect(wizard.newRoleRows()).toHaveCount(0);

        // "Search User" with the enabled user's exact address: the wizard
        // confirms the user exists and shows their details read-only, with an
        // empty new-role row and both buttons active (the control for the
        // disabled user's).
        await access.goto();
        await access.inviteButton.click();
        await expect(wizard.searchField).toBeVisible();
        await wizard.searchFor(recipient);
        await expect(mgrPage.getByText('The user already exists in the press')).toBeVisible();
        await expect(mgrPage.getByText(recipient).first()).toBeVisible();
        await expect(wizard.emailField).toHaveCount(0);
        await expect(mgrPage.getByRole('textbox', {name: /Given Name/})).toHaveCount(0);
        await expect(wizard.newRoleRows()).toHaveCount(1);
        await expect(wizard.addRoleButton).toBeEnabled();
        await expect(wizard.saveAndContinueButton).toBeEnabled();
        await expect(wizard.disabledWarning).toHaveCount(0);

        // The held Author row on "Enter details": listed above the new-role
        // row with a masthead select and "Remove Role" (Rule 13a).
        await expect(wizard.currentRoleRow('Author')).toHaveCount(1);
        await expect(wizard.mastheadSelect('Author')).toHaveValue('true');
        await expect(wizard.currentRoleRow('Author').getByRole('button', {name: 'Remove Role'})).toBeVisible();
        await expect.poll(() => wizard.precedes(wizard.currentRoleRow('Author'), wizard.newRoleRows())).toBe(true);

        // "Cancel" on the masthead confirmation: the select is back on "Appear
        // on the masthead" and nothing is sent (the masthead request count,
        // read after "Confirm" below sends exactly one, stays at that one).
        await wizard.pickMasthead('Author', 'false');
        await wizard.cancelMasthead();
        await expect(wizard.mastheadSelect('Author')).toHaveValue('true');

        // "Confirm": the change applies at once: the request goes out while
        // the wizard stays open, and the select holds the new choice. (What
        // the press answers is register finding OMP1: dismissed, never
        // asserted; the masthead email is read on OJS only, fn-s.)
        await wizard.pickMasthead('Author', 'false');
        await wizard.confirmMastheadAndSettle();
        expect(mastheadRequests).toHaveLength(1);
        await expect(wizard.mastheadSelect('Author')).toHaveValue('false');
        await expect(mgrPage.getByRole('heading', {name: /Enter details/})).toBeVisible();

        // Leaving without sending: typing the Users & Roles address asks no
        // question and adds no invitation row; Edit on the user's row shows
        // "Does not appear on the masthead" on the Author row (Rules 13a, 15).
        await access.goto();
        expect(browserQuestions).toEqual([]);
        await access.expectInvitationCount(0);
        await expect(access.invitationRow(recipient)).toHaveCount(0);
        await access.openUserEdit(`Inv${tag}`);
        await expect(wizard.currentRoleRow('Author')).toHaveCount(1);
        await expect(wizard.mastheadSelect('Author')).toHaveValue('false');
        expect(mastheadRequests).toHaveLength(1);

        // "Enter details" and the compose step: the invitation to a further
        // role (External Reviewer, whose masthead is fixed text), sent.
        await sendExistingUserInvitation(mgrPage, {
            contextPath: path,
            email: recipient,
            role: 'External Reviewer',
            masthead: null, // reviewer masthead is fixed text, not a select
            subject: marker,
        });

        // The recipient's mailbox lists the offered role and, as a role
        // already held, Author, whose line carries the sentence of the choice
        // confirmed above (Rule 13a).
        const {acceptUrl, text} = await fetchInvitationEmail(pkpMail, {to: recipient, marker});
        expect(text).toMatch(/Already assigned roles[\s\S]*Author[\s\S]*Newly assigned roles[\s\S]*External Reviewer/);
        const heldPart = text.slice(text.indexOf('Already assigned roles'), text.indexOf('Newly assigned roles'));
        expect(heldPart.replace(/\s+/g, ' ')).toContain(
            `Your name will not appear in ${pressName}'s masthead as a Author.`,
        );

        // Signed out, the review step opens directly: no password prompt, no
        // account fields.
        const wizardIn = new AcceptInvitationWizard(page);
        await page.goto(acceptUrl);
        await expect(wizardIn.stepHeading('Review & create account')).toBeVisible();
        await expect(wizardIn.usernameField).toHaveCount(0);
        await expect(wizardIn.passwordField).toHaveCount(0);
        await expect(page.getByText('External Reviewer')).toBeVisible();

        // The link opened, the accept button not pressed: the manager's row
        // still reads "Invited {date}" (Rule 5), the count read settled.
        await access.goto();
        await access.expectInvitationCount(1);
        await expect(access.invitationRow(recipient)).toContainText(access.invitedOn());

        await wizardIn.accept();

        // The sign-in screen: signing in the usual way succeeds (where the
        // accept left the browser is register finding A4, not asserted).
        const login = new LoginPage(page);
        await login.gotoContext(path);
        await login.signIn(invitee, invitee + invitee);
        await expect(page).not.toHaveURL(/\/login/);

        // The user's row under Current Users lists Author and the offered
        // role; Control: the pending row is gone (it stood there before the
        // press).
        await access.goto();
        await access.expectInvitationCount(0);
        await expect(access.invitationRow(recipient)).toHaveCount(0);
        await access.searchUsers(`Inv${tag}`);
        const userRow = access.userRow(`Inv${tag}`);
        await expect(userRow).toBeVisible();
        await expect(userRow).toContainText('Author');
        await expect(userRow).toContainText('External Reviewer');
    });

    test('S4: recipient declines the invitation', async ({ompApi, asUser, pkpMail, page}, testInfo) => {
        const tag = makeTag(testInfo, 'u6s4');
        const recipient = `rcpt${tag}@mail.test`;
        const marker = `Invitation${tag}`;
        const {path, manager} = await seedPress(ompApi, tag);

        const mgrPage = await (await asUser(manager)).newPage();
        const {access} = await sendNewUserInvitation(mgrPage, {
            contextPath: path,
            email: recipient,
            givenName: 'Nova',
            role: 'Author',
            subject: marker,
        });

        const {acceptUrl, declineUrl} = await fetchInvitationEmail(pkpMail, {
            to: recipient,
            marker,
        });

        // The decline link opens a "Decline Invitation" page asking for
        // confirmation.
        await page.goto(declineUrl);
        await expect(
            page.getByRole('heading', {name: 'Decline Invitation'}),
        ).toBeVisible();

        // The page open, not yet confirmed: the manager's row still reads
        // "Invited {date}" (Rule 10).
        await access.goto();
        await access.expectInvitationCount(1);
        await expect(access.invitationRow(recipient)).toContainText(access.invitedOn());

        // Confirming declines: the browser lands on the sign-in page.
        await page
            .getByRole('button', {name: 'Confirm Decline Invitation'})
            .click();
        await page.waitForURL(/\/login/);

        // Control: both emailed links now show "Invitation Unavailable".
        for (const url of [acceptUrl, declineUrl]) {
            await page.goto(url);
            await expect(
                page.getByRole('heading', {name: 'Invitation Unavailable'}),
            ).toBeVisible();
        }

        // No role was granted (no account was created) and the pending row is
        // gone; the absence read is bounded by the user list's own filtered
        // response (searchUsers waits for it).
        await access.goto();
        await access.expectInvitationCount(0);
        await expect(access.invitationRow(recipient)).toHaveCount(0);
        await access.searchUsers(recipient);
        await expect(access.userRow(recipient)).toHaveCount(0);
        await access.searchUsers(`Mgr${tag}`);
        await expect(access.userRow(`Mgr${tag}`)).toHaveCount(1);
    });

    test('S5: manager cancels a pending invitation', async ({ompApi, asUser, pkpMail, page}, testInfo) => {
        const tag = makeTag(testInfo, 'u6s5');
        const recipient = `rcpt${tag}@mail.test`;
        const marker = `Invitation${tag}`;
        const {path, manager} = await seedPress(ompApi, tag);

        const mgrPage = await (await asUser(manager)).newPage();
        const {access} = await sendNewUserInvitation(mgrPage, {
            contextPath: path,
            email: recipient,
            givenName: 'Nova',
            role: 'Author',
            subject: marker,
        });
        const {acceptUrl} = await fetchInvitationEmail(pkpMail, {to: recipient, marker});

        // Row menu → Cancel Invite; the dialog recaps the invitee (email,
        // role, status, affiliation).
        await access.goto();
        await access.expectInvitationCount(1);
        await access.invitationRowAction(recipient, 'Cancel Invite');
        const dialog = mgrPage
            .locator('[data-cy="dialog"]')
            .filter({hasText: 'Cancel Invitation'});
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(recipient);
        await expect(dialog).toContainText('Author');
        await expect(dialog).toContainText('Invited');
        await expect(dialog).toContainText('Affiliation');
        await dialog
            .getByRole('button', {name: 'Cancel Invitation', exact: true})
            .click();

        // The row disappears; the accept link renders the unavailable page
        // with Login and Register.
        await access.expectInvitationCount(0);
        await expect(access.invitationRow(recipient)).toHaveCount(0);
        await page.goto(acceptUrl);
        await expect(
            page.getByRole('heading', {name: 'Invitation Unavailable'}),
        ).toBeVisible();
        await expect(page.getByRole('link', {name: 'Login'})).toBeVisible();
        await expect(page.getByRole('link', {name: 'Register'})).toBeVisible();

        // Control: the same link with its end cut off shows a not-found error,
        // never the "Invitation Unavailable" page (Rule 4); the cancelled
        // link's page just above is the positive control.
        const truncated = acceptUrl.slice(0, -4);
        expect(truncated).not.toBe(acceptUrl);
        const response = await page.goto(truncated);
        expect(response?.status()).toBe(404);
        await expect(page.getByText(/not found/i).first()).toBeVisible();
        await expect(
            page.getByRole('heading', {name: 'Invitation Unavailable'}),
        ).toHaveCount(0);
    });

    test('S6: manager edits a pending invitation, replacing it', async ({ompApi, asUser, pkpMail, page}, testInfo) => {
        const tag = makeTag(testInfo, 'u6s6');
        const recipient = `rcpt${tag}@mail.test`;
        const {path, manager} = await seedPress(ompApi, tag);

        const mgrPage = await (await asUser(manager)).newPage();
        const {access} = await sendNewUserInvitation(mgrPage, {
            contextPath: path,
            email: recipient,
            givenName: 'Nova',
            role: 'Author',
            subject: `Invitation${tag}first`,
        });
        const first = await fetchInvitationEmail(pkpMail, {to: recipient, marker: `${tag}first`});

        // Row menu → Edit; a dialog warns the invitation will be replaced.
        await access.goto();
        await access.invitationRowAction(recipient, 'Edit');
        const editDialog = mgrPage
            .locator('[data-cy="dialog"]')
            .filter({hasText: 'Edit Invitation'});
        await expect(editDialog).toContainText(/current invitation will be canceled/);
        await editDialog
            .getByRole('button', {name: 'Edit Invitation', exact: true})
            .click();

        // The wizard reopens prefilled, without the search step.
        const wizard = new SendInvitationWizard(mgrPage);
        await expect(mgrPage.getByRole('textbox', {name: /^Email/})).toHaveValue(recipient);
        await expect(
            mgrPage.getByRole('button', {name: 'Search User'}),
        ).toHaveCount(0);

        // Change the role set, type the second marker and send.
        await wizard.addRole({role: 'Copyeditor'});
        await wizard.saveAndContinue();
        await wizard.composeAndSend(`Invitation${tag}second`);

        // The recipient's mailbox holds a second invitation email whose links
        // work: its accept link opens the accept wizard...
        const second = await fetchInvitationEmail(pkpMail, {to: recipient, marker: `${tag}second`});
        expect(second.acceptUrl).not.toBe(first.acceptUrl);
        const acceptWizard = new AcceptInvitationWizard(page);
        await page.goto(second.acceptUrl);
        await expect(acceptWizard.stepHeading('Create OMP account')).toBeVisible();

        // ...the first email's links no longer do (the dead link's bare 404 is
        // register finding A3 — assert only that the accept flow does not
        // open, in either page shape).
        await page.goto(first.acceptUrl);
        await expect(
            page.getByText(/not found|Invitation Unavailable/i).first(),
        ).toBeVisible();
        await expect(acceptWizard.stepHeading('Create OMP account')).toHaveCount(0);
        await expect(page.getByLabel('Username')).toHaveCount(0);
    });

    test('S7: wrong person signed in is refused and can log out', async ({ompApi, asUser, pkpMail}, testInfo) => {
        const tag = makeTag(testInfo, 'u6s7');
        const recipient = `rcpt${tag}@mail.test`;
        const marker = `Invitation${tag}`;
        const invitee = `usr${tag}`;
        const {path, manager} = await seedPress(ompApi, tag, [
            {
                username: invitee,
                roles: ['author'],
                email: recipient,
                givenName: `Inv${tag}`,
                familyName: 'Existing',
            },
        ]);

        const mgrPage = await (await asUser(manager)).newPage();
        await sendExistingUserInvitation(mgrPage, {
            contextPath: path,
            email: recipient,
            role: 'External Reviewer',
            masthead: null,
            subject: marker,
        });
        const {acceptUrl} = await fetchInvitationEmail(pkpMail, {to: recipient, marker});

        // The signed-in manager (the bystander, not the invitee) opens the
        // accept link.
        await mgrPage.goto(acceptUrl);
        await expect(
            mgrPage.getByText(
                "Invitation not accepted. You're logged in as a different user.",
            ),
        ).toBeVisible();

        // Control: "Logout" genuinely ends the session...
        await mgrPage.getByRole('button', {name: 'Logout'}).click();
        await mgrPage.waitForURL(/\/login/);
        await mgrPage.goto(`/index.php/${path}/management/settings/access`);
        await expect(mgrPage).toHaveURL(/\/login/);

        // ...and reopening the link starts the real flow (Rule 6).
        const wizard = new AcceptInvitationWizard(mgrPage);
        await mgrPage.goto(acceptUrl);
        await expect(wizard.stepHeading('Review & create account')).toBeVisible();
        await expect(wizard.acceptButton).toBeVisible();
    });

    test('S8: manager proposes a role via the user row', async ({ompApi, asUser, pkpMail, page}, testInfo) => {
        const tag = makeTag(testInfo, 'u6s8');
        const recipient = `rcpt${tag}@mail.test`;
        const marker = `Invitation${tag}`;
        const member = `usr${tag}`;
        const {path, manager} = await seedPress(ompApi, tag, [
            {
                username: member,
                roles: ['author', 'reader'],
                email: recipient,
                givenName: `Inv${tag}`,
                familyName: 'Member',
            },
        ]);

        const mgrPage = await (await asUser(manager)).newPage();
        const access = new UsersAccessPage(mgrPage, path);
        const wizard = new SendInvitationWizard(mgrPage);

        // Users list → row Edit opens the wizard on the member's details, with
        // no search step; the roles table shows the current roles with Remove
        // Role and masthead controls.
        await access.goto();
        await access.searchUsers(`Inv${tag}`);
        await access.userRowAction(`Inv${tag}`, 'Edit');
        await expect(
            mgrPage.getByRole('button', {name: 'Search User'}),
        ).toHaveCount(0);
        for (const role of ['Author', 'Reader']) {
            await expect(wizard.currentRoleRow(role)).toHaveCount(1);
            await expect(
                wizard.currentRoleRow(role).getByRole('button', {name: 'Remove Role'}),
            ).toBeVisible();
            await expect(wizard.mastheadSelect(role)).toBeVisible();
        }

        // The masthead control on the Author row: pick the other value; the
        // confirmation says the member will be notified; confirm. On a press
        // the confirmation answers with an error (OMP1): it is dismissed and
        // never asserted. The change takes effect at once: the select holds
        // the new value, and still after a reload.
        const other = await wizard.pickOtherMasthead('Author');
        await expect(wizard.mastheadDialog).toContainText('The user will be notified of this change.');
        await wizard.confirmMasthead();
        await expect(wizard.mastheadSelect('Author')).toHaveValue(other);
        await mgrPage.reload();
        await expect(wizard.currentRoleRow('Author')).toHaveCount(1);
        await expect(wizard.mastheadSelect('Author')).toHaveValue(other);

        // Remove Role on the Reader row: the confirmation asks the removal
        // question and says nothing of an email; confirm with "Remove Role".
        // The row stays in the roles table with its End Date set to today and
        // "User Removed From Role" in place of its button, and the member's
        // mailbox holds "You have been removed from a role" (Rule 13).
        await wizard.pressRemoveRole('Reader');
        await expect(wizard.removeRoleDialog).toContainText(
            'Are you sure you want to remove this role? The user will lose access and permissions associated with it.',
        );
        await expect(wizard.removeRoleDialog).not.toContainText(/notified|email/i);
        await expect(wizard.removeRoleConfirmButton).toBeVisible();
        await wizard.removeRoleConfirmButton.click();
        await expect(wizard.removeRoleDialog).toBeHidden();
        const readerRow = wizard.currentRoleRow('Reader');
        await expect(readerRow).toHaveCount(1);
        await expect(readerRow.getByRole('button', {name: 'Remove Role'})).toHaveCount(0);
        await expect(readerRow).toContainText('User Removed From Role');
        await expect(wizard.endDateCell(readerRow)).toHaveText(today());
        await expect(wizard.endDateCell(wizard.currentRoleRow('Author'))).toHaveText('---');
        const removal = await pkpMail.find({to: recipient, contains: 'You have been removed from a role'});
        const removalFull = await pkpMail.fullMessage(removal.ID);
        expect(removalFull.Subject).toBe('You have been removed from a role');
        expect(removalFull.Text).toContain('Reader');

        // Remove Role on the Author row, now the last active role: no
        // confirmation opens; a "Remove Role" dialog answers the refusal with
        // a single "Close" button. After "Close" the row keeps its Remove Role
        // button and masthead select (the Reader removal just above is the
        // positive control for a confirmation that does open).
        await wizard.pressRemoveRole('Author');
        await expect(wizard.removeRoleDialog).toContainText(
            'You cannot remove the role. At least one role must be assigned to the user.',
        );
        await expect(wizard.removeRoleDialog.getByRole('button')).toHaveCount(1);
        await expect(wizard.removeRoleConfirmButton).toHaveCount(0);
        await expect(wizard.removeRoleCloseButton).toBeVisible();
        await wizard.removeRoleCloseButton.click();
        await expect(wizard.removeRoleDialog).toBeHidden();
        await expect(wizard.currentRoleRow('Author')).toHaveCount(1);
        await expect(
            wizard.currentRoleRow('Author').getByRole('button', {name: 'Remove Role'}),
        ).toBeVisible();
        await expect(wizard.mastheadSelect('Author')).toBeVisible();
        await expect(wizard.mastheadSelect('Author')).toHaveValue(other);
        await expect(wizard.currentRoleRow('Author')).not.toContainText('User Removed From Role');

        // "Save And Continue" on the details step stays inactive until a new
        // role row is added.
        const saveAndContinue = wizard.footerButton('Save And Continue');
        await expect(saveAndContinue).toBeDisabled();
        await expect(wizard.newRoleRows()).toHaveCount(0);

        // An empty role row: add one and leave it empty: the button activates;
        // press it: the missing role fields are rejected with inline errors
        // and the step stays.
        await wizard.addRoleButton.click();
        await expect(wizard.newRoleRows()).toHaveCount(1);
        await expect(saveAndContinue).toBeEnabled();
        await saveAndContinue.click();
        const emptyRow = wizard.newRoleRows().first();
        await expect(wizard.rowFieldErrors(emptyRow)).toHaveCount(3);
        await expect(wizard.rowFieldErrors(emptyRow).first()).toHaveText('This field is required.');
        await expect(mgrPage.getByRole('heading', {name: /Enter details/})).toBeVisible();
        await expect(wizard.subjectField).toHaveCount(0);

        // The filled row: fill it in and send: the member receives an
        // invitation email.
        await wizard.addRole({role: 'Copyeditor'});
        await wizard.saveAndContinue();
        await wizard.composeAndSend(marker);
        const {acceptUrl} = await fetchInvitationEmail(pkpMail, {to: recipient, marker});

        // Control: the role is NOT on the account yet (the removal and the
        // masthead change above took effect at once; the proposal waits).
        await access.goto();
        await access.expectInvitationCount(1);
        await access.searchUsers(`Inv${tag}`);
        const rowBefore = access.userRow(`Inv${tag}`);
        await expect(rowBefore).toBeVisible();
        await expect(rowBefore).toContainText('Author');
        await expect(rowBefore).not.toContainText('Copyeditor');

        // The member accepts (scenario 3's flow) — only then the role lands.
        const acceptWizard = new AcceptInvitationWizard(page);
        await page.goto(acceptUrl);
        await expect(acceptWizard.stepHeading('Review & create account')).toBeVisible();
        await acceptWizard.accept();

        await access.goto();
        await access.expectInvitationCount(0);
        await access.searchUsers(`Inv${tag}`);
        const rowAfter = access.userRow(`Inv${tag}`);
        await expect(rowAfter).toBeVisible();
        await expect(rowAfter).toContainText('Copyeditor');
    });

    test('S10: the ORCID step shows only to a recipient without a verified iD', async ({ompApi, asUser, pkpMail, page}, testInfo) => {
        const tag = makeTag(testInfo, 'u6s10');
        const newcomer = `rcpt${tag}@mail.test`;
        const verifiedEmail = `rcpt${tag}v@mail.test`;
        const verifiedUser = `usr${tag}`;
        const {path, manager} = await seedPress(
            ompApi,
            tag,
            [
                {
                    username: verifiedUser,
                    roles: ['author'],
                    email: verifiedEmail,
                    givenName: `Ver${tag}`,
                    familyName: 'Verified',
                    orcid: 'https://sandbox.orcid.org/0000-0002-1825-0097',
                    orcidIsVerified: true,
                },
            ],
            {orcid: {}},
        );

        // A newcomer's invitation, as in scenario 1.
        const mgrPage = await (await asUser(manager)).newPage();
        await sendNewUserInvitation(mgrPage, {
            contextPath: path,
            email: newcomer,
            givenName: 'Nova',
            role: 'Author',
            subject: `Invitation${tag}`,
        });
        const newcomerMail = await fetchInvitationEmail(pkpMail, {to: newcomer, marker: `Invitation${tag}`});

        // The newcomer's accept link, signed out: the wizard opens on "Verify
        // ORCID iD", offering "Verify ORCID iD" and "Skip ORCID verification"
        // and no other Continue button (Rules 5, 7). "Verify ORCID iD" is
        // never pressed (ORCID's sign-in cannot complete on a test install).
        const wizard = new AcceptInvitationWizard(page);
        await page.goto(newcomerMail.acceptUrl);
        await expect(wizard.stepHeading('Verify ORCID iD')).toBeVisible();
        await expect(wizard.stepsList).toContainText('Verify ORCID iD');
        await expect(wizard.verifyOrcidButton).toBeVisible();
        await expect(wizard.skipOrcidButton).toBeVisible();
        await expect(wizard.footerButton('Cancel')).toBeVisible();
        await expect(wizard.footerButton('Save and continue')).toHaveCount(0);
        await expect(page.getByRole('button', {name: /continue/i})).toHaveCount(0);

        // "Skip ORCID verification": "Create OMP account" opens, with the
        // footer's own Continue button (the positive control for its absence
        // on the ORCID step).
        await wizard.skipOrcidButton.click();
        await expect(wizard.stepHeading('Create OMP account')).toBeVisible();
        await expect(wizard.footerButton('Save and continue')).toBeVisible();

        // The verified user's invitation to a further role, as in scenario 3.
        await sendExistingUserInvitation(mgrPage, {
            contextPath: path,
            email: verifiedEmail,
            role: 'External Reviewer',
            masthead: null,
            subject: `Invitation${tag}v`,
        });
        const verifiedMail = await fetchInvitationEmail(pkpMail, {to: verifiedEmail, marker: `Invitation${tag}v`});

        // Control: that accept link, signed out, opens the review step
        // directly with no "Verify ORCID iD" step (Rule 5).
        await page.goto(verifiedMail.acceptUrl);
        await expect(wizard.stepHeading('Review & create account')).toBeVisible();
        await expect(wizard.stepsList).not.toContainText('Verify ORCID iD');
        await expect(wizard.verifyOrcidButton).toHaveCount(0);
        await expect(wizard.skipOrcidButton).toHaveCount(0);
        await expect(page.getByText('External Reviewer')).toBeVisible();
        await expect(wizard.acceptButton).toBeVisible();
    });

    test('S11: an existing user cancels the accept wizard, and the invitation waits', async ({ompApi, asUser, pkpMail, page}, testInfo) => {
        testInfo.setTimeout(240_000);
        const tag = makeTag(testInfo, 'u6s11');
        const recipient = `rcpt${tag}@mail.test`;
        const marker = `Invitation${tag}`;
        const invitee = `usr${tag}`;
        const {path, manager} = await seedPress(ompApi, tag, [
            {
                username: invitee,
                roles: ['author'],
                email: recipient,
                givenName: `Inv${tag}`,
                familyName: 'Existing',
            },
        ]);

        // The pending invitation to a further role, sent by the Press Manager
        // through "Search User" and one new role row (Copyeditor, fn-s).
        const mgrPage = await (await asUser(manager)).newPage();
        const access = await sendExistingUserInvitation(mgrPage, {
            contextPath: path,
            email: recipient,
            role: 'Copyeditor',
            subject: marker,
        });
        const {acceptUrl} = await fetchInvitationEmail(pkpMail, {to: recipient, marker});
        const mgrWizard = new SendInvitationWizard(mgrPage);

        // The accept link, signed out (the user's own browser, `page`): the
        // wizard opens on "Review & create account" with no "Verify ORCID iD"
        // step, ORCID being off (Rule 5).
        const wizard = new AcceptInvitationWizard(page);
        await page.goto(acceptUrl);
        await expect(wizard.stepHeading('Review & create account')).toBeVisible();
        await expect(wizard.stepsList).toContainText('Review & create account');
        await expect(wizard.stepsList).not.toContainText('Verify ORCID iD');
        await expect(wizard.verifyOrcidButton).toHaveCount(0);

        // "Cancel" and "Go Back": the question and its two buttons; "Go Back"
        // returns to the review step (Rule 17).
        await wizard.openCancelDialog();
        // (the screen's apostrophe is the typographic one)
        await expect(wizard.cancelDialog).toContainText(
            /Are you sure you want to cancel\? Canceling now will stop the role acceptance process, and you[’']ll need to restart from the invitation email to accept the role again\./,
        );
        await expect(wizard.cancelProcessButton).toBeVisible();
        await expect(wizard.goBackButton).toBeVisible();
        await wizard.goBack();
        await expect(wizard.stepHeading('Review & create account')).toBeVisible();
        await expect(wizard.acceptButton).toBeVisible();

        // "Cancel Invitation Process", signed out: the sign-in screen; signing
        // in there as the user opens My Submissions (Rule 17).
        await wizard.openCancelDialog();
        await wizard.cancelProcess();
        await expect(page).toHaveURL(/\/login/);
        const login = new LoginPage(page);
        await login.expectForm();
        await login.signIn(invitee, invitee + invitee);
        await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit'});
        await expect(page.getByRole('heading', {level: 1})).toContainText('Active submissions');

        // The manager's Users & Roles: the row still reads "Invited {date}",
        // and Edit on the user's row shows Author alone in the roles table
        // (the Copyeditor row the accept adds below is the positive control).
        await access.goto();
        await access.expectInvitationCount(1);
        await expect(access.invitationRow(recipient)).toContainText(access.invitedOn());
        await access.openUserEdit(`Inv${tag}`);
        await expect(mgrWizard.currentRoleRow('Author')).toHaveCount(1);
        await expect(mgrWizard.currentRoleRow('Copyeditor')).toHaveCount(0);

        // The accept link, signed in as the user: the same review step opens
        // (Rules 6, 17).
        await page.goto(acceptUrl);
        await expect(wizard.stepHeading('Review & create account')).toBeVisible();
        await expect(wizard.acceptButton).toBeVisible();
        await expect(wizard.usernameField).toHaveCount(0);

        // "Cancel Invitation Process", signed in: My Submissions opens, the
        // user still signed in (Rule 17).
        await wizard.openCancelDialog();
        await wizard.cancelProcess();
        await page.waitForURL(/\/dashboard\/mySubmissions/, {waitUntil: 'commit'});
        await expect(page.getByRole('heading', {level: 1})).toContainText('Active submissions');
        await expect(page).not.toHaveURL(/\/login/);

        // Control: the link once more, still signed in; "Accept And Continue
        // to OMP", then "View All Submissions": the Dashboard's "Assigned to
        // me", still signed in (Rule 9); the row leaves the Invitations table
        // and Edit on the user's row shows Author and Copyeditor (Rules 8, 11).
        await page.goto(acceptUrl);
        await expect(wizard.stepHeading('Review & create account')).toBeVisible();
        await wizard.accept();
        await wizard.viewAllSubmissions();
        await expect(page).toHaveURL(/\/dashboard\/editorial\?.*currentViewId=assigned-to-me/);
        await expect(page.getByRole('heading', {level: 1})).toContainText('Assigned to me');

        await access.goto();
        await access.expectInvitationCount(0);
        await expect(access.invitationRow(recipient)).toHaveCount(0);
        await access.openUserEdit(`Inv${tag}`);
        await expect(mgrWizard.currentRoleRow('Author')).toHaveCount(1);
        await expect(mgrWizard.currentRoleRow('Copyeditor')).toHaveCount(1);
    });
});
