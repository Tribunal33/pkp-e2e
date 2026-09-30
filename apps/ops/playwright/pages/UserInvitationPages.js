/**
 * @file playwright/pages/UserInvitationPages.js
 *
 * OPS feature POMs for the user-invitations suite (U6).
 *
 * Three surfaces:
 * - UsersRolesPage — Settings → Users & Roles (Users tab): the Invitations
 *   table + "Invite to a role" button (UserInvitationManager.vue) above the
 *   Current Users list (UserAccessManager.vue).
 * - SendInvitationWizard — {ctx}/invitation/create/userRoleAssignment (and the
 *   edit/editUser modes of the same wizard).
 * - AcceptInvitationWizard — the emailed accept-link flow
 *   ({ctx}/invitation/accept?id=…&key=…).
 *
 * Selector sources: lib/ui-library/src/managers/UserInvitationManager/*,
 * src/pages/userInvitation/*, src/pages/acceptInvitation/*; English strings
 * from lib/pkp/locale/en/invitation.po + the OPS overrides in
 * locale/en/invitation.po ("Create OPS account", "Accept And Continue to OPS",
 * "Server Masthead", "The user does not have a role in this server", …).
 */
const {expect} = require('@playwright/test');
const {BasePage} = require('../../../../shared/playwright/pages/BasePage.js');

exports.UsersRolesPage = class UsersRolesPage extends BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        super(page);
        this.contextPath = contextPath;
        this.inviteToRoleButton = page.getByRole('button', {name: 'Invite to a role'});
        this.invitationsHeading = page.getByRole('heading', {name: /^Invitations/});
        this.currentUsersHeading = page.getByRole('heading', {name: /^Current Users/});
        // The Current Users search (the Invitations table has none).
        this.userSearchInput = page.getByRole('searchbox');
        // The two tables, by their counted accessible names ("Invitations (1)",
        // "Current Users (2)"); a settled read of a list bounded by a row it
        // must hold (PRINCIPLES M4).
        this.invitationsTable = page.getByRole('table', {name: /Invitations \(/});
        this.usersTable = page.getByRole('table', {name: /Current Users \(/});
    }

    /** The h3 label above the Invitations table with its count, e.g. "Invitations (1)". */
    invitationsCountHeading(count) {
        return this.page.getByRole('heading', {name: `Invitations (${count})`});
    }

    /**
     * Navigate to Users & Roles and wait for the Invitations table fetch.
     * With a `locale` the address names it
     * (`/{context}/{locale}/management/settings/access`); the page's
     * headings are then translated or raw keys (U03 screen-notes), so the
     * language-neutral search box is the landmark instead. Opening the
     * screen in another language flips the session's language for every
     * later screen, so a later English read names `/en/` itself.
     *
     * @param {{locale?: string|null}} [options]
     */
    async goto({locale = null} = {}) {
        const invitationsFetch = this.page.waitForResponse(
            (r) => r.url().includes('/invitations/userRoleAssignment') && r.request().method() === 'GET'
        );
        const localePart = locale ? `/${locale}` : '';
        await this.page.goto(
            this.contextUrl(this.contextPath, `${localePart}/management/settings/access`)
        );
        await invitationsFetch;
        if (locale) {
            await expect(this.userSearchInput.first()).toBeVisible({timeout: 30_000});
        } else {
            await expect(this.invitationsHeading).toBeVisible();
        }
    }

    /**
     * Switch to the "Roles" tab (a legacy grid, `#roleGridContainer`) and
     * wait for its first row. Call after `goto()`.
     */
    async openRolesTab() {
        await this.page.getByRole('tab', {name: 'Roles', exact: true}).click();
        await expect(this.roleRows().first()).toBeVisible({timeout: 30_000});
    }

    /** The Roles grid's data rows. */
    roleRows() {
        return this.page.locator('#roleGridContainer tr.gridRow');
    }

    /**
     * The "Role Name" cell of every row, top to bottom: the cell's text
     * without its "Settings" arrow (the manager row has none). One read for
     * "the screen lists these roles and no other".
     */
    async roleNames() {
        return this.roleRows().evaluateAll((rows) =>
            rows.map((row) => {
                const cell = row.querySelector('td');
                return (cell ? cell.textContent || '' : '')
                    .replace(/\s+/g, ' ')
                    .replace(/^\s*Settings\s+/, '')
                    .trim();
            })
        );
    }

    /**
     * A pending-invitation row (status cell always reads "Invited {date}",
     * which distinguishes it from a Current Users row with the same email).
     *
     * @param {string} email
     */
    invitationRow(email) {
        return this.page.getByRole('row').filter({hasText: email}).filter({hasText: 'Invited'});
    }

    /**
     * Open an action from a pending invitation row's ⋯ menu.
     *
     * @param {string} email
     * @param {string} actionLabel 'Edit' | 'Cancel Invite'
     */
    async openInvitationAction(email, actionLabel) {
        await this.invitationRow(email)
            .getByRole('button', {name: 'Invitation management options'})
            .click();
        await this.page.getByRole('menuitem', {name: actionLabel, exact: true}).click();
    }

    /**
     * Filter the Current Users list. The Search component submits the phrase
     * only on Enter (Search.vue), so type and press Enter.
     *
     * @param {string} phrase
     */
    async searchUsers(phrase) {
        await this.userSearchInput.fill('');
        await this.userSearchInput.pressSequentially(phrase, {delay: 20});
        await this.userSearchInput.press('Enter');
    }

    /**
     * A Current Users row: carries at least one held role name, never the
     * "Invited {date}" status text.
     *
     * @param {string} text e.g. the user's unique given name
     */
    userRow(text) {
        return this.page
            .getByRole('row')
            .filter({hasText: text})
            .filter({hasNotText: 'Invited'});
    }

    /**
     * Open the row's ⋯ menu → Edit on a Current Users row (routes to the send
     * wizard in editUser mode at management/settings/user/{id}).
     * The row has exactly one button (the actions dropdown); its accessible
     * name is not relied on (the label's locale key renders raw — spec A7).
     *
     * @param {string} text unique row text (given name)
     */
    async openUserEdit(text) {
        const row = this.userRow(text);
        await expect(row).toBeVisible();
        await row.getByRole('button').click();
        await this.page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        await this.page.waitForURL(/management\/settings\/user\/\d+/, {waitUntil: 'commit'});
    }
};

exports.SendInvitationWizard = class SendInvitationWizard extends BasePage {
    constructor(page) {
        super(page);
        this.searchInput = page.getByLabel(/Search for a user by email address/);
        this.searchUserButton = page.getByRole('button', {name: 'Search User', exact: true});
        this.saveAndContinueButton = page.getByRole('button', {name: 'Save And Continue'});
        this.sendButton = page.getByRole('button', {name: 'Invite user to the role'});
        this.addAnotherRoleButton = page.getByRole('button', {name: 'Add Another Role'});
        this.userNotFoundMessage = page.getByText('The user does not have a role in this server');
        this.userFoundMessage = page.getByText('The user already exists in the server');
        // Accessible names of required form fields include the "* Required" suffix.
        this.emailField = page.getByLabel(/^Email/);
        this.subjectInput = page.locator('input[name="subject"]');
        this.sentDialog = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
        this.searchStepText = page.getByText('Search User');
        // New-role rows are the ones carrying the "Select a new role" field
        // (current-role rows render the role and dates as plain text).
        // Matched by text, not label: duplicate field ids across rows break
        // the label-for association on every row after the first.
        this.newRoleRows = page.getByRole('row').filter({hasText: 'Select a new role'});
        // The compose step's Message box is a TinyMCE iframe; its body is the
        // text the step shows (what the sent email's body is compared to).
        this.bodyEditor = page.frameLocator('iframe').locator('body');
        // The steps rail (its list carries a raw locale token as its name,
        // register A7, so it is found by its content).
        this.stepsList = page.locator('main').getByRole('list').filter({hasText: 'Enter details'});
        // Rule 13's immediate-action dialogs on an existing member's roles table.
        this.mastheadDialog = page.getByRole('dialog', {name: 'Confirm masthead visibility change'});
        this.removeRoleDialog = page.getByRole('dialog', {name: 'Remove Role'});
        // The app's generic "Error" dialog (a failed request's raw message):
        // the masthead confirmation answers with it on a preprint server
        // (register OMP1), dismissed with "OK", never asserted as contract.
        this.errorDialog = page
            .getByRole('dialog')
            .filter({has: page.getByRole('heading', {name: 'Error', exact: true})});
        // Rule 14: the disabled-user warning, a heading over its instructions
        // (on the search path and on the users list's Edit path alike).
        this.disabledUserHeading = page.getByRole('heading', {name: 'The user is currently disabled.'});
        this.disabledUserInstructions = page.getByText(
            'You cannot assign them a role while they are disabled. Please enable the user first to invite them to a role.'
        );
        // The read-only details block's first field (existing user): "Email address", or "Email" where a fresh install resolves the twice-defined key `user.email` from user.po.
        this.emailAddressHeading = page.getByRole('heading', {name: /^Email( address)?$/});
        // The "Invitation Sent" dialog's one button (Rule 15).
        this.viewAllUsersButton = this.sentDialog.getByRole('button', {name: 'View All Users'});
    }

    /** A step heading ("STEP 1 - Enter details", the compose step's, ...). */
    stepHeading(name) {
        return this.page.getByRole('heading', {name});
    }

    /** A pill of the steps rail ("Search User", "Enter details", ...). */
    stepPill(name) {
        return this.stepsList.getByRole('listitem').filter({hasText: name});
    }

    /**
     * The visible text of the main region on the "Enter details" step, read
     * once the step is on screen. Two walks for the same address read the
     * same text (Rule 3's "no hint of a pending invitation").
     */
    async readDetailsStep() {
        await expect(this.stepHeading(/Enter details/)).toBeVisible();
        // Read settled, as `readBody()`: the text counts once two reads a
        // beat apart agree, so a step still drawing its fields under the
        // heading is not taken (.reports/flake-s26/fixC/diagnosis.md).
        const read = async () => (await this.page.locator('main').innerText()).replace(/\s+/g, ' ').trim();
        let last = null;
        let text = '';
        await expect
            .poll(
                async () => {
                    text = await read();
                    const same = text === last;
                    last = text;
                    return same;
                },
                {timeout: 30_000, intervals: [250]}
            )
            .toBe(true);
        return text;
    }

    /**
     * The compose step's Message body as the editor shows it (its variables
     * still unsubstituted, e.g. "{$RECIPIENTNAME}"), read settled: non-empty
     * and the same across two reads.
     */
    async readBody() {
        await expect(this.bodyEditor).not.toHaveText('');
        let last = await this.bodyEditor.innerText();
        await expect
            .poll(async () => {
                const now = await this.bodyEditor.innerText();
                const same = now === last;
                last = now;
                return same;
            })
            .toBe(true);
        return last;
    }

    /**
     * A current-role row of an existing member's roles table (editUser mode),
     * by the role's name: the rows carrying a "Server Masthead" select and
     * "Remove Role" (Rule 13); the new-role rows ("Select a new role") are
     * excluded by their text, as `newRoleRows` is matched.
     *
     * @param {string} role the role's visible name ("Author")
     */
    currentRoleRow(role) {
        return this.page.getByRole('row').filter({hasText: role}).filter({hasNotText: 'Select a new role'});
    }

    /** The Server Masthead select of a current-role row (values "true"/"false"). */
    mastheadSelect(row) {
        return row.getByRole('combobox');
    }

    /**
     * The option a current-role row's masthead select shows chosen, by its
     * label ("Does not appear on the masthead").
     */
    mastheadChoice(row) {
        return this.mastheadSelect(row).locator('option:checked');
    }

    /** The "Remove Role" button of a current-role row. */
    removeRoleButton(row) {
        return row.getByRole('button', {name: 'Remove Role'});
    }

    /**
     * The masthead select of the i-th NEW role row (0-based): the row's last
     * combobox (its first is the role select). It carries no accessible name
     * from the second row on (register A8), so it is found by position.
     *
     * @param {number} i
     */
    newRoleMastheadSelect(i) {
        return this.newRoleRows.nth(i).getByRole('combobox').last();
    }

    /**
     * Resolve once `upper` sits above `lower` on the page (both visible),
     * read settled through their boxes: "above the new-role row", "above
     * their details" (Rules 13a, 14).
     *
     * @param {import('@playwright/test').Locator} upper
     * @param {import('@playwright/test').Locator} lower
     */
    async expectAbove(upper, lower) {
        await expect(upper).toBeVisible();
        await expect(lower).toBeVisible();
        await expect
            .poll(async () => {
                const a = await upper.boundingBox();
                const b = await lower.boundingBox();
                return !!a && !!b && a.y + a.height <= b.y;
            })
            .toBe(true);
    }

    /**
     * Change a current-role row's masthead select and wait for "Confirm
     * masthead visibility change" (Rules 13, 13a).
     *
     * @param {import('@playwright/test').Locator} row a `currentRoleRow()`
     * @param {string} label 'Appear on the masthead' | 'Does not appear on the masthead'
     */
    async chooseMasthead(row, label) {
        await this.mastheadSelect(row).selectOption({label});
        await expect(this.mastheadDialog).toBeVisible();
    }

    /** "Cancel" on the open masthead confirmation; resolves once it is gone. */
    async cancelMastheadChange() {
        await this.mastheadDialog.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(this.mastheadDialog).toBeHidden();
    }

    /**
     * "Confirm" on the open masthead confirmation; resolves with the save's
     * status once the confirmation is gone and, when the save failed, the
     * app's "Error" dialog dismissed with "OK" (register OMP1 on a preprint
     * server: dismissed, never asserted). The rows behind an open dialog are
     * aria-hidden, so nothing is read before it closes.
     */
    async confirmMastheadChange() {
        const saved = this.page.waitForResponse((r) => r.url().includes('/masthead/'));
        await this.mastheadDialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        const status = (await saved).status();
        await expect(this.mastheadDialog).toBeHidden();
        if (status >= 400) {
            await this.dismissErrorDialog();
        }
        return status;
    }

    /**
     * Press "View All Users" on the "Invitation Sent" dialog and wait for
     * the browser to reach Users & Roles (Rule 15).
     */
    async pressViewAllUsers() {
        await this.viewAllUsersButton.click();
        await this.page.waitForURL(/\/management\/settings\/access/, {waitUntil: 'commit'});
    }

    /** The inline "This field is required." errors inside a row. */
    requiredErrors(row) {
        return row.getByText('This field is required.');
    }

    /** Press "OK" on the generic "Error" dialog when one is open (OMP1). */
    async dismissErrorDialog() {
        await expect(this.errorDialog).toBeVisible();
        await this.errorDialog.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(this.errorDialog).toBeHidden();
    }

    async expectSearchStep() {
        await expect(this.searchInput).toBeVisible();
    }

    /** Step 1: enter the phrase and advance (one click shows the found/not-found note and moves to Enter details). */
    async searchAndContinue(phrase) {
        await this.searchInput.fill(phrase);
        await this.searchUserButton.click();
    }

    /** New-invitee details form (existing users show read-only text instead). */
    async fillGivenName(name) {
        await this.page.getByLabel(/^Given Name/).first().fill(name);
    }

    /**
     * Fill the i-th NEW role row (0-based). Assumes the row exists — create
     * mode starts with one empty row; use addAnotherRole() otherwise.
     *
     * @param {number} i
     * @param {{role: string, dateStart: string, masthead: string}} options
     *   masthead: 'Appear on the masthead' | 'Does not appear on the masthead'
     */
    async fillNewRoleRow(i, {role, dateStart, masthead}) {
        // All controls located positionally within the row (see newRoleRows
        // note): comboboxes are [role, masthead]; the only textbox is the
        // Start Date input.
        const row = this.newRoleRows.nth(i);
        await row.getByRole('combobox').first().selectOption({label: role});
        await row.getByRole('textbox').fill(dateStart);
        await row.getByRole('combobox').last().selectOption({label: masthead});
    }

    /**
     * Compose step: wait for the stored template to finish loading (filling
     * earlier would be overwritten), then replace the subject.
     */
    async setSubject(subject) {
        await expect(this.subjectInput).toBeVisible();
        await expect(this.page.locator('.composer__loadingTemplateMask')).toHaveCount(0);
        await this.subjectInput.fill(subject);
    }

    /** Final send; resolves once the "Invitation Sent" dialog is up. */
    async sendAndAwaitConfirmation() {
        await this.sendButton.click();
        await expect(this.sentDialog).toBeVisible();
        await expect(this.sentDialog.getByRole('button', {name: 'View All Users'})).toBeVisible();
    }
};

exports.AcceptInvitationWizard = class AcceptInvitationWizard extends BasePage {
    constructor(page) {
        super(page);
        this.skipOrcidButton = page.getByRole('button', {name: 'Skip ORCID verification'});
        // The ORCID step (Rules 5, 7): shown only when ORCID is on for the
        // server and the recipient has no verified iD. Exact: the rail's
        // current pill is also a button named "1 Verify ORCID iD".
        this.verifyOrcidButton = page.getByRole('button', {name: 'Verify ORCID iD', exact: true});
        this.orcidStepHeading = page.getByRole('heading', {name: /Verify ORCID iD/});
        this.createAccountHeading = page.getByRole('heading', {name: /Create OPS account/});
        // "Create OPS account" (Rules 5, 9; Fields "Accept wizard").
        this.passwordHint = page.getByText(/^It should be at least \d+ characters long/);
        this.privacyStatementLink = page.getByRole('link', {name: 'Privacy Statement'});
        // The steps rail, found by the review step every recipient gets.
        this.stepsList = page.locator('main').getByRole('list').filter({hasText: 'Review & create account'});
        // Required-field accessible names carry the "* Required" suffix.
        this.usernameInput = page.getByLabel(/^Username/);
        this.passwordInput = page.getByLabel(/^Password/);
        this.privacyCheckbox = page.getByRole('checkbox');
        this.saveAndContinueButton = page.getByRole('button', {name: 'Save and continue'});
        this.reviewHeading = page.getByRole('heading', {name: /Review & create account/});
        this.acceptButton = page.getByRole('button', {name: 'Accept And Continue to OPS'});
        this.acceptedDialog = page
            .getByRole('dialog')
            .filter({hasText: "You've been assigned a new role in OPS"});
        this.refusalDialog = page
            .getByRole('dialog')
            .filter({hasText: "Invitation not accepted. You're logged in as a different user."});
        // "Enter details" (new invitee): the name the manager entered arrives here.
        this.givenNameInput = page.getByLabel(/^Given Name/).first();
        // Rule 17: the steps' "Cancel" and its question.
        this.cancelButton = page.getByRole('button', {name: 'Cancel', exact: true});
        this.cancelDialog = page.getByRole('dialog', {name: 'Cancel Role Invitation Process?'});
        this.cancelProcessButton = this.cancelDialog.getByRole('button', {name: 'Cancel Invitation Process'});
        this.goBackButton = this.cancelDialog.getByRole('button', {name: 'Go Back'});
    }

    /** Press the step's "Cancel"; resolves once "Cancel Role Invitation Process?" is open. */
    async openCancelDialog() {
        await this.cancelButton.click();
        await expect(this.cancelDialog).toBeVisible();
    }

    /**
     * Open an emailed accept link and wait for the wizard's invitation fetch.
     * Passes the ORCID step if the server offers it (the shipped test
     * contexts have ORCID off, so it normally does not appear — Rule 5).
     */
    async open(url) {
        const receive = this.page.waitForResponse((r) => /\/invitations\/\d+\/key\//.test(r.url()));
        await this.page.goto(url);
        await receive.catch(() => {});
        if (await this.skipOrcidButton.isVisible().catch(() => false)) {
            await this.skipOrcidButton.click();
        }
    }

    /** A pill of the steps rail ("Verify ORCID iD", "Create OPS account", ...). */
    stepPill(name) {
        return this.stepsList.getByRole('listitem').filter({hasText: name});
    }

    /** An inline field error by its text. */
    fieldError(text) {
        return this.page.getByText(text);
    }

    /**
     * Fill the account step and press "Save and continue" without expecting
     * the next step (for a refused password, whose inline error is read by
     * `fieldError`).
     */
    async submitAccount({username, password}) {
        await expect(this.createAccountHeading).toBeVisible();
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.privacyCheckbox.check();
        await this.saveAndContinueButton.click();
    }

    /** "Create OPS account" step for a new invitee. */
    async createAccount({username, password}) {
        await expect(this.createAccountHeading).toBeVisible();
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.privacyCheckbox.check();
        await this.saveAndContinueButton.click();
    }

    /** "Enter details" step for a new invitee. */
    async fillDetails({givenName, country}) {
        await this.givenNameInput.fill(givenName);
        await this.page.getByLabel('Country of affiliation').selectOption({label: country});
        await this.saveAndContinueButton.click();
    }

    /** Final accept; resolves once the new-role dialog is up. */
    async acceptAndAwaitConfirmation() {
        await this.acceptButton.click();
        await expect(this.acceptedDialog).toBeVisible();
        await expect(
            this.acceptedDialog.getByRole('button', {name: 'View All Submissions'})
        ).toBeVisible();
    }
};

/** The generic invitation-link landing for spent links (Rule 4). */
exports.InvitationUnavailablePage = class InvitationUnavailablePage extends BasePage {
    constructor(page) {
        super(page);
        this.heading = page.getByRole('heading', {name: 'Invitation Unavailable'});
        this.description = page.getByText('This invitation is no longer available');
        this.loginButton = page.getByRole('link', {name: 'Login', exact: true});
        this.registerButton = page.getByRole('link', {name: 'Register', exact: true});
    }

    async expectShown() {
        await expect(this.heading).toBeVisible();
        await expect(this.description).toBeVisible();
        await expect(this.loginButton).toBeVisible();
        await expect(this.registerButton).toBeVisible();
    }
};

/** The emailed decline-link confirmation page (Rule 10). */
exports.DeclineInvitationPage = class DeclineInvitationPage extends BasePage {
    constructor(page) {
        super(page);
        this.heading = page.getByRole('heading', {name: 'Decline Invitation'});
        this.description = page.getByText('Are you sure you want to decline this invitation?');
        this.confirmButton = page.getByRole('button', {name: 'Confirm Decline Invitation'});
    }
};
