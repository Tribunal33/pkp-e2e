/**
 * @file playwright/pages/UserInvitationPages.js
 *
 * OMP page objects for the user-invitations feature (spec:
 * docs/specs/U06-user-invitations.md, RUNBOOK step 8).
 *
 * Three surfaces:
 * - UsersAccessPage — Settings → Users & Roles (Users tab): the Invitations
 *   table, "Invite to a role", and the Current Users list.
 * - SendInvitationWizard — the send wizard (create / edit / editUser modes).
 * - AcceptInvitationWizard — the recipient-side accept wizard.
 *
 * OMP vocabulary throughout: press, Press Masthead, "Accept And Continue to
 * OMP", "Create OMP account".
 */
const {expect} = require('../support/fixtures.js');

const today = () => new Date().toISOString().slice(0, 10);

class UsersAccessPage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath scratch press urlPath
     */
    constructor(page, contextPath) {
        this.page = page;
        this.contextPath = contextPath;
        this.inviteButton = page.getByRole('button', {name: 'Invite to a role'});
        this.invitationsTable = page.getByRole('table', {name: /Invitations \(\d+\)/});
        this.usersTable = page.getByRole('table', {name: /Current Users \(\d+\)/});
    }

    /**
     * Open the screen; with a `locale` the address names it
     * (`/{context}/{locale}/management/settings/access`), the page's
     * buttons are translated (or raw keys, U03 screen-notes) and the search
     * box is the landmark instead. Opening it in another language flips the
     * session's language for every later screen.
     */
    async goto({locale = null} = {}) {
        const localePart = locale ? `/${locale}` : '';
        await this.page.goto(`/index.php/${this.contextPath}${localePart}/management/settings/access`);
        if (locale) {
            await expect(this.page.getByRole('searchbox').first()).toBeVisible({timeout: 30_000});
        } else {
            await expect(this.inviteButton).toBeVisible();
        }
    }

    /** The invitations-table heading carries the live row count. */
    async expectInvitationCount(n) {
        await expect(
            this.page.getByText(`Invitations (${n})`, {exact: true}),
        ).toBeVisible();
    }

    /** An invitations-table row identified by unique text (recipient email). */
    invitationRow(text) {
        return this.invitationsTable.getByRole('row').filter({hasText: text});
    }

    /** Open the row's ellipsis menu and pick an action (menu portals to the page root). */
    async invitationRowAction(rowText, actionLabel) {
        await this.invitationRow(rowText)
            .getByRole('button', {name: 'Invitation management options'})
            .click();
        await this.page.getByRole('menuitem', {name: actionLabel}).click();
    }

    /**
     * Filter the Current Users list and wait for the list's own response to
     * the full phrase — presence AND absence assertions after this call are
     * bounded by the filter's response (PRINCIPLES M4).
     */
    async searchUsers(phrase) {
        const box = this.page.getByRole('searchbox').first();
        await box.click();
        await box.fill(''); // a second search on the same page starts from an empty box
        await box.pressSequentially(phrase);
        const settled = this.page.waitForResponse(
            (r) =>
                r.url().includes('/users') &&
                decodeURIComponent(r.url()).includes(`searchPhrase=${phrase}`),
        );
        await box.press('Enter'); // the Search component submits on Enter only
        await settled;
    }

    /** The status an invitations row reads on the day of sending ("Invited {date}", Rule 11). */
    invitedOn(date = today()) {
        return `Invited ${date}`;
    }

    /**
     * Filter the users list to one member and open their row's "Edit": the
     * wizard in editUser mode, landed on its details step.
     */
    async openUserEdit(rowText) {
        await this.searchUsers(rowText);
        await this.userRowAction(rowText, 'Edit');
        await expect(this.page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
    }

    /** A Current Users row identified by unique text (seeded given name = tag). */
    userRow(text) {
        return this.usersTable.getByRole('row').filter({hasText: text});
    }

    /**
     * Open the user row's ellipsis menu and pick an action. The dropdown's
     * accessible name currently renders as a raw locale token
     * (##userAccess.management.options## — spec finding A7), so match either
     * the raw token or the fixed translation, without asserting either.
     */
    async userRowAction(rowText, actionLabel) {
        await this.userRow(rowText)
            .getByRole('button', {name: /management[. ]options|^More Actions$/i})
            .click();
        await this.page.getByRole('menuitem', {name: actionLabel}).click();
    }
}

class SendInvitationWizard {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        // Footer buttons live in the ButtonRow; the Steps rail renders same-named
        // step pills as buttons, so scope every wizard-nav click to the row.
        this.footer = page.locator('.buttonRow');
        this.searchField = page.getByLabel(/Search for a user by email address/);
        this.rolesTable = page.getByRole('table');
        this.addRoleButton = page.getByRole('button', {name: 'Add Another Role'});
        this.sentDialog = page
            .locator('[data-cy="dialog"]')
            .filter({hasText: 'Invitation Sent'});
        this.subjectField = page.getByLabel('Subject');
        /** The compose step's body: a TinyMCE editor, its text inside the iframe. */
        this.composeBody = page.frameLocator('iframe').first().locator('body');
        /** Rule 13's masthead confirmation (editUser mode). */
        this.mastheadDialog = page
            .locator('[data-cy="dialog"]')
            .filter({hasText: 'Confirm masthead visibility change'});
        /** Rule 13's Remove Role dialog: the confirmation on a removable row, the refusal on a last role. */
        this.removeRoleDialog = page
            .locator('[data-cy="dialog"]')
            .filter({has: page.getByRole('heading', {name: 'Remove Role'})});
        /** The confirmation's confirm button (absent on the last-role refusal). */
        this.removeRoleConfirmButton = this.removeRoleDialog.getByRole('button', {name: 'Remove Role', exact: true});
        /** The last-role refusal's single button. */
        this.removeRoleCloseButton = this.removeRoleDialog.getByRole('button', {name: 'Close', exact: true});
        /**
         * The app's generic "Error" dialog (a failed request's raw message,
         * spec finding OMP1 on the masthead change). Dismissed, never asserted.
         */
        this.errorDialog = page
            .locator('[data-cy="dialog"]')
            .filter({has: page.getByRole('heading', {name: 'Error', exact: true})});
        /** "Enter details"'s Email field (a new invitee; read-only text for a member). */
        this.emailField = page.getByRole('textbox', {name: /^Email/});
        /** Rule 14's warning heading and the instruction under it. */
        this.disabledWarning = page.getByRole('heading', {name: 'The user is currently disabled.'});
        this.disabledInstructions = page.getByText(
            'You cannot assign them a role while they are disabled. Please enable the user first to invite them to a role.',
        );
        /** The read-only details block's first heading ("Email address", or "Email" where a fresh install resolves the twice-defined key `user.email` from user.po). */
        this.detailsEmailHeading = page.getByRole('heading', {name: /^Email( address)?$/});
        this.saveAndContinueButton = this.footerButton('Save And Continue');
    }

    /** Wait out the modal store's close window (patterns.md pitfall 4) before reopening a dialog. */
    async pastModalCloseWindow() {
        await this.page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));
    }

    /**
     * Collect every masthead request the page sends from now on
     * (`users/{id}/masthead/{userUserGroupId}`, a PUT tunnelled as POST).
     * Returns the live array of their URLs.
     */
    trackMastheadRequests() {
        const urls = [];
        this.page.on('request', (r) => {
            if (/\/users\/\d+\/masthead\//.test(r.url())) urls.push(r.url());
        });
        return urls;
    }

    /** True once `first` sits before `second` in the document (both present). */
    async precedes(first, second) {
        const a = await first.first().elementHandle();
        const b = await second.first().elementHandle();
        if (!a || !b) return false;
        return a.evaluate((x, y) => !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING), b);
    }

    footerButton(name) {
        return this.footer.getByRole('button', {name, exact: true});
    }

    /**
     * The compose step's body as the screen shows it (placeholders such as
     * `{$RECIPIENTNAME}` unsubstituted), after the template has loaded.
     */
    async composeBodyText() {
        await expect(this.subjectField).toBeVisible();
        await expect(
            this.page.locator('.composer__loadingTemplateMask'),
        ).toHaveCount(0);
        return this.composeBody.innerText();
    }

    /**
     * A CURRENT role's row in the editUser wizard's roles table (Rule 13):
     * it carries the masthead select and no role select (a new-role row
     * carries both, and its role options can name a role held earlier).
     */
    currentRoleRow(roleName) {
        return this.page
            .getByRole('row')
            .filter({hasText: roleName})
            .filter({has: this.page.locator('select[name="masthead"]')})
            .filter({hasNot: this.page.locator('select[name="userGroupId"]')});
    }

    /** The masthead select of a current role's row. */
    mastheadSelect(roleName) {
        return this.currentRoleRow(roleName).locator('select[name="masthead"]');
    }

    /**
     * Pick the other masthead value on a current role's row and return it,
     * leaving the confirmation dialog open ("Confirm" / "Cancel").
     */
    async pickOtherMasthead(roleName) {
        const select = this.mastheadSelect(roleName);
        const current = await select.inputValue();
        const other = current === 'true' ? 'false' : 'true';
        await select.selectOption(other);
        await expect(this.mastheadDialog).toBeVisible();
        return other;
    }

    /**
     * Confirm the open masthead dialog and wait for it to close. A press
     * answers with the "Error" dialog (OMP1): it is dismissed with OK when it
     * shows, and nothing about it is asserted.
     */
    async confirmMasthead() {
        await this.mastheadDialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        await expect(this.mastheadDialog).toBeHidden();
        await this.dismissErrorDialog();
    }

    /** Press OK on the generic "Error" dialog when one is open (OMP1). */
    async dismissErrorDialog() {
        if ((await this.errorDialog.count()) > 0) {
            await this.errorDialog.getByRole('button', {name: 'OK', exact: true}).click();
            await expect(this.errorDialog).toBeHidden();
        }
    }

    /** Press "Remove Role" on a current role's row; the dialog that opens is left open. */
    async pressRemoveRole(roleName) {
        await this.currentRoleRow(roleName)
            .getByRole('button', {name: 'Remove Role'})
            .click();
        await expect(this.removeRoleDialog).toBeVisible();
    }

    /** A roles-table row's END DATE cell (third column: role, start, end, masthead). */
    endDateCell(row) {
        return row.locator('td, th').nth(2);
    }

    /** Inline field errors inside one new-role row (`.pkpFieldError__message`). */
    rowFieldErrors(row) {
        return row.locator('.pkpFieldError__message');
    }

    /**
     * "Cancel" on the open masthead confirmation (Rule 13a): the dialog
     * closes; the modal store's close window is waited out.
     */
    async cancelMasthead() {
        await this.mastheadDialog.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(this.mastheadDialog).toBeHidden();
        await this.pastModalCloseWindow();
    }

    /**
     * "Confirm" on the open masthead confirmation, waiting for the masthead
     * request's answer. When the answer is a refusal, the app's "Error"
     * dialog that follows it (OMP1) is dismissed with OK; nothing about it is
     * asserted. Returns the answer's status.
     */
    async confirmMastheadAndSettle() {
        const answered = this.page.waitForResponse((r) => /\/users\/\d+\/masthead\//.test(r.url()));
        await this.mastheadDialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        const response = await answered;
        await expect(this.mastheadDialog).toBeHidden();
        if (!response.ok()) {
            await expect(this.errorDialog).toBeVisible();
            await this.errorDialog.getByRole('button', {name: 'OK', exact: true}).click();
            await expect(this.errorDialog).toBeHidden();
        }
        await this.pastModalCloseWindow();
        return response.status();
    }

    /**
     * Choose a value in a current role's masthead select (`'true'` appear,
     * `'false'` not) and wait for the confirmation to open.
     */
    async pickMasthead(roleName, value) {
        await this.mastheadSelect(roleName).selectOption(value);
        await expect(this.mastheadDialog).toBeVisible();
    }

    /** A new-role row's role select, masthead select and start date box. */
    rowRoleSelect(row) {
        return row.locator('select[name="userGroupId"]');
    }

    rowMastheadSelect(row) {
        return row.locator('select[name="masthead"]');
    }

    /** Fill one new-role row already on screen. masthead: null for a reviewer role (fixed text). */
    async fillRow(row, {role, startDate = today(), masthead = 'Appear on the masthead'}) {
        await this.rowRoleSelect(row).selectOption({label: role});
        await row.locator('input[name="dateStart"]').fill(startDate);
        if (masthead !== null) {
            await this.rowMastheadSelect(row).selectOption({label: masthead});
        }
    }

    /** Press "View All Users" in the "Invitation Sent" dialog and wait for Users & Roles. */
    async viewAllUsers() {
        await this.sentDialog.getByRole('button', {name: 'View All Users'}).click();
        await this.page.waitForURL(/\/management\/settings\/access/, {waitUntil: 'commit'});
    }

    /** Step 1 — enter a search term and advance ("Search User" is the step's own next button). */
    async searchFor(term) {
        await this.searchField.fill(term);
        await this.footerButton('Search User').click();
    }

    /**
     * A new-role row's controls, located by their stable name= attributes:
     * the roles table re-uses form-control ids across rows, so label-based
     * lookups mis-target on every row after the first.
     */
    newRoleRows() {
        return this.page
            .getByRole('row')
            .filter({has: this.page.locator('select[name="userGroupId"]')});
    }

    /**
     * Add one new-role row and fill it. Pass masthead: null for reviewer
     * roles — their masthead is fixed text, not a select.
     */
    async addRole({role, startDate = today(), masthead = 'Appear on the masthead'}) {
        const rows = this.newRoleRows();
        // The details step may pre-render one empty role row (create mode);
        // reuse it. Only press "Add Another Role" when every row is taken, and
        // wait for the appended row before filling — filling races otherwise.
        const before = await rows.count();
        const lastIsEmpty =
            before > 0 &&
            (await rows.last().locator('select[name="userGroupId"]').inputValue()) === '';
        if (!lastIsEmpty) {
            await this.addRoleButton.click();
            await expect(rows).toHaveCount(before + 1);
        }
        await this.fillRow(rows.last(), {role, startDate, masthead});
    }

    async saveAndContinue() {
        await this.footerButton('Save And Continue').click();
    }

    /** Compose step: wait out the template load, set a unique subject, send. */
    async composeAndSend(subject) {
        const subjectField = this.page.getByLabel('Subject');
        await expect(subjectField).toBeVisible();
        await expect(
            this.page.locator('.composer__loadingTemplateMask'),
        ).toHaveCount(0);
        await subjectField.fill(subject);
        await this.footerButton('Invite user to the role').click();
        await expect(this.sentDialog).toBeVisible();
        await expect(
            this.sentDialog.getByRole('button', {name: 'View All Users'}),
        ).toBeVisible();
    }
}

class AcceptInvitationWizard {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.footer = page.locator('.buttonRow');
        this.usernameField = page.getByLabel('Username');
        this.passwordField = page.getByLabel('Password');
        this.privacyCheckbox = page.getByRole('checkbox');
        this.acceptButton = this.footer.getByRole('button', {
            name: 'Accept And Continue to OMP',
        });
        this.acceptedDialog = page
            .locator('[data-cy="dialog"]')
            .filter({hasText: "You've been assigned a new role in OMP"});
        /** The wizard's step rail (its accessible name is a raw locale key, A7). */
        this.stepsList = page.getByRole('list').filter({hasText: 'Review & create account'}).last();
        /** The ORCID step's two buttons (Rule 7). */
        this.verifyOrcidButton = page.getByRole('button', {name: 'Verify ORCID iD', exact: true});
        this.skipOrcidButton = page.getByRole('button', {name: 'Skip ORCID verification'});
        /** The consent label's link (Settings: Privacy Statement). */
        this.privacyStatementLink = page.getByRole('link', {name: 'Privacy Statement'});
        /** The Password field's helper text stating the site minimum. */
        this.passwordDescription = page.getByText(/It should be at least \d+ characters long/);
        /** The inline error a refused password shows under the field. */
        this.passwordError = page.locator('.pkpFieldError__message').filter({hasText: /password/i});
        /** Rule 17's question behind the footer's "Cancel". */
        this.cancelDialog = page.getByRole('dialog').filter({hasText: 'Cancel Role Invitation Process?'});
        this.cancelProcessButton = this.cancelDialog.getByRole('button', {name: 'Cancel Invitation Process', exact: true});
        this.goBackButton = this.cancelDialog.getByRole('button', {name: 'Go Back', exact: true});
    }

    /** Press the footer's "Cancel" and wait for "Cancel Role Invitation Process?" (Rule 17). */
    async openCancelDialog() {
        await this.footerButton('Cancel').click();
        await expect(this.cancelDialog).toBeVisible();
    }

    /** "Go Back": the question closes; the modal store's close window is waited out before any reopening. */
    async goBack() {
        await this.goBackButton.click();
        await expect(this.cancelDialog).toBeHidden();
        await this.page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));
    }

    /** "Cancel Invitation Process", waiting for the browser to leave the accept page. */
    async cancelProcess() {
        const left = this.page.waitForURL((url) => !/\/invitation\//.test(url.pathname), {waitUntil: 'commit', timeout: 30_000});
        await this.cancelProcessButton.click();
        await left;
    }

    /** The closing dialog's "View All Submissions" (Rule 8), waiting for the browser to leave the accept page. */
    async viewAllSubmissions() {
        const left = this.page.waitForURL((url) => !/\/invitation\//.test(url.pathname), {waitUntil: 'commit', timeout: 30_000});
        await this.acceptedDialog.getByRole('button', {name: 'View All Submissions'}).click();
        await left;
    }

    footerButton(name) {
        return this.footer.getByRole('button', {name, exact: true});
    }

    /** The current step's heading ("STEP n - <name>"). */
    stepHeading(name) {
        return this.page.getByRole('heading', {name: new RegExp(`STEP \\d+ - ${name}`)});
    }

    /** "Create OMP account" step (new invitees only). */
    async fillAccount({username, password}) {
        await this.usernameField.fill(username);
        await this.passwordField.fill(password);
        await this.privacyCheckbox.check();
        await this.footerButton('Save and continue').click();
    }

    /**
     * Type a password on "Create OMP account" and press Save and continue
     * without waiting for the step to change (for a password the step refuses).
     */
    async submitAccount({username, password}) {
        await this.usernameField.fill(username);
        await this.passwordField.fill(password);
        if (!(await this.privacyCheckbox.isChecked())) {
            await this.privacyCheckbox.check();
        }
        await this.footerButton('Save and continue').click();
    }

    /** "Enter details" step (new invitees only). */
    async fillDetails({givenName, country = 'Canada'}) {
        await this.page.getByLabel(/Given Name/).first().fill(givenName);
        await this.page
            .getByLabel('Country of affiliation')
            .selectOption({label: country});
        await this.footerButton('Save and continue').click();
    }

    /** Final step: accept and expect the closing dialog. */
    async accept() {
        await this.acceptButton.click();
        await expect(this.acceptedDialog).toBeVisible();
        await expect(
            this.acceptedDialog.getByRole('button', {name: 'View All Submissions'}),
        ).toBeVisible();
    }
}

module.exports = {UsersAccessPage, SendInvitationWizard, AcceptInvitationWizard, today};
