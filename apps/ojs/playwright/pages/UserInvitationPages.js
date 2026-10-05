/**
 * @file playwright/pages/UserInvitationPages.js
 *
 * OJS-local Page Objects for the user-invitations feature (spec:
 * lib/pkp/docs/e2e/specs/U06-user-invitations.md).
 *
 * Three surfaces:
 * - UsersRolesPage — Settings → Users & Roles (Users tab): the Invitations
 *   table (+ row menu) and the Current Users list (+ row menu).
 * - SendInvitationWizard — {journal}/invitation/create|edit/... and the
 *   editUser mode reached from a user row's Edit action.
 * - AcceptInvitationWizard — the emailed accept-link flow.
 *
 * Labels are the live locale strings (lib/pkp/locale/en/invitation.po,
 * locale/en/invitation.po) — required fields carry a screen-reader
 * "* Required" suffix in their accessible name, hence the ^-anchored regexes.
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
        this.pageHeading = page.getByRole('heading', {name: 'Users & Roles'});
        this.inviteButton = page.getByRole('button', {name: 'Invite to a role'});
        this.invitationsTable = page.getByRole('table', {name: /Invitations \(/});
        this.usersTable = page.getByRole('table', {name: /Current Users \(/});
    }

    async goto() {
        await this.page.goto(this.contextUrl(this.contextPath, '/management/settings/access'));
        await expect(this.pageHeading).toBeVisible();
    }

    /** The h3 label above the Invitations table, e.g. "Invitations (1)". */
    invitationsHeading(count) {
        return this.page.getByRole('heading', {name: `Invitations (${count})`});
    }

    /** Invitations-table row for a recipient email. */
    invitationRow(email) {
        return this.invitationsTable.getByRole('row').filter({hasText: email});
    }

    /** Current-Users row for a user email. */
    userRow(email) {
        return this.usersTable.getByRole('row').filter({hasText: email});
    }

    /**
     * Open a row's actions menu and click one item. Works for both tables:
     * the invitations menu button is named "Invitation management options",
     * the users one renders the raw ##userAccess.management.options## token
     * (register A7) — the regex matches both.
     *
     * @param {import('@playwright/test').Locator} row
     * @param {string|RegExp} itemLabel
     */
    async rowAction(row, itemLabel) {
        await row.getByRole('button', {name: /management.options|^More Actions$/i}).click();
        await this.page.getByRole('menuitem', {name: itemLabel}).click();
    }

    /**
     * Edit on a user's row in the Current Users list: the wizard in editUser
     * mode, on its "Enter details" step with no search step (Rule 13).
     *
     * @param {string} email
     */
    async editUser(email) {
        await this.rowAction(this.userRow(email), /^Edit$/);
        await expect(this.page.getByRole('heading', {name: /STEP 1 - Enter details/})).toBeVisible();
    }
};

exports.SendInvitationWizard = class SendInvitationWizard extends BasePage {
    constructor(page) {
        super(page);
        this.searchInput = page.getByLabel(/Search for a user by email address/);
        // "Search User" also names the step-1 pill; exact match hits the button.
        this.searchContinueButton = page.getByRole('button', {name: 'Search User', exact: true});
        this.saveAndContinueButton = page.getByRole('button', {name: 'Save And Continue'});
        this.addAnotherRoleButton = page.getByRole('button', {name: 'Add Another Role'});
        this.subjectInput = page.getByLabel(/^Subject/);
        this.sendButton = page.getByRole('button', {name: 'Invite user to the role'});
        this.sentDialog = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
        this.emailInput = page.getByLabel(/^Email/);
        // The compose step's Message box is a TinyMCE iframe; its body is the
        // text the step shows (and what the sent email's body is compared to).
        this.bodyEditor = page.frameLocator('iframe').locator('body');
        // The steps rail (its list carries the raw ##invitation.wizard.completeSteps##
        // token as its name, register A7, so it is found by its content).
        this.stepsList = page.locator('main').getByRole('list').filter({hasText: 'Enter details'});
        // Rule 13's immediate-action dialogs on an existing member's roles table.
        this.mastheadDialog = page.getByRole('dialog', {name: 'Confirm masthead visibility change'});
        this.removeRoleDialog = page.getByRole('dialog', {name: 'Remove Role'});
        // "Search User"'s two answers (Fields, Rule 13a).
        this.missNotice = page.getByText('The user does not have a role in this journal');
        this.existingNotice = page.getByText('The user already exists in the journal');
        // Rule 14: the disabled-user warning (a heading) and its instructions,
        // on the search path and on the users list's Edit path alike.
        this.disabledWarning = page.getByRole('heading', {name: 'The user is currently disabled.'});
        this.disabledInstructions = page.getByText(
            'You cannot assign them a role while they are disabled. Please enable the user first to invite them to a role.'
        );
        // Every new-role row's role select (none on a disabled user's step).
        this.newRoleSelects = page.getByLabel(/^Select a new role/);
    }

    stepHeading(name) {
        return this.page.getByRole('heading', {name});
    }

    /** A pill of the steps rail ("Search User", "Enter details", …). */
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
     * by the role's name: the rows that carry a "Journal Masthead" select and
     * "Remove Role" (Rule 13). The new-role rows (a "Select a new role"
     * combobox, whose options also name roles) are excluded.
     *
     * @param {string} role the role's visible name ("Author")
     */
    currentRoleRow(role) {
        return this.page
            .getByRole('row')
            .filter({hasText: role})
            .filter({hasNot: this.page.getByLabel(/^Select a new role/)});
    }

    /** The Journal Masthead select of a current-role row (values "true"/"false"). */
    mastheadSelect(row) {
        return row.getByRole('combobox');
    }

    /** The "Remove Role" button of a current-role row. */
    removeRoleButton(row) {
        return row.getByRole('button', {name: 'Remove Role'});
    }

    /**
     * The roles table's body rows, held and new alike (the header row
     * carries column headers, no cells).
     */
    roleRows() {
        return this.page.locator('main').getByRole('row').filter({has: this.page.getByRole('cell')});
    }

    /**
     * A new-role row's masthead select (the row's last combobox; a Reviewer
     * row has none, only the fixed text "Appear on the masthead").
     */
    newRoleMastheadSelect(row) {
        return row.getByRole('combobox').filter({hasText: 'Does not appear on the masthead'});
    }

    /**
     * Pick a held role's masthead value and wait for its confirmation
     * (Rule 13, 13a) without answering it.
     *
     * @param {import('@playwright/test').Locator} row a current-role row
     * @param {string} label "Appear on the masthead" / "Does not appear on the masthead"
     */
    async pickMasthead(row, label) {
        await this.mastheadSelect(row).selectOption({label});
        await expect(this.mastheadDialog).toBeVisible();
    }

    /**
     * `upper` sits above `lower` on the page, read once both are shown
     * (polled: the step may still be laying out).
     */
    async expectAbove(upper, lower) {
        await expect(upper).toBeVisible();
        await expect(lower).toBeVisible();
        await expect
            .poll(async () => {
                const [a, b] = [await upper.boundingBox(), await lower.boundingBox()];
                return Boolean(a && b && a.y + a.height <= b.y);
            })
            .toBe(true);
    }

    /** The newest new-role row (the one carrying "Select a new role"). */
    newRoleRow() {
        return this.page
            .getByRole('row')
            .filter({has: this.page.getByLabel(/^Select a new role/)})
            .last();
    }

    /** The inline "This field is required." errors inside a row. */
    requiredErrors(row) {
        return row.getByText('This field is required.');
    }

    /** Step 1 — search, then land on "Enter details". */
    async searchAndContinue(email) {
        await expect(this.stepHeading(/Search User/)).toBeVisible();
        await this.searchInput.fill(email);
        await this.searchContinueButton.click();
        await expect(this.stepHeading(/Enter details/)).toBeVisible();
    }

    async fillGivenName(givenName) {
        await this.page.getByLabel(/^Given Name/).first().fill(givenName);
    }

    /**
     * Fill the new-role row (the row that carries a "Select a new role"
     * combobox). Scoping to that row matters in editUser mode, where the
     * current-role rows also carry a Journal Masthead select whose change opens
     * a confirmation dialog (Rule 13) — a global `.last()` would hit it.
     * Within the row the two comboboxes are [role, masthead] in DOM order.
     *
     * @param {{role: string, startDate: string, masthead?: string}} options
     *   role/masthead are the visible option labels; startDate is YYYY-MM-DD.
     */
    async fillRoleRow({role, startDate, masthead = 'Appear on the masthead'}) {
        const row = this.page
            .getByRole('row')
            .filter({has: this.page.getByLabel(/^Select a new role/)})
            .last();
        await row.getByLabel(/^Select a new role/).selectOption({label: role});
        await row.getByRole('textbox').fill(startDate);
        await row.getByRole('combobox').last().selectOption({label: masthead});
    }

    /** Details step → compose step (POST add + PUT populate happen here). */
    async saveAndContinue() {
        await this.saveAndContinueButton.click();
        await expect(this.subjectInput).toBeVisible();
        // The subject prefills from the stored template (or the edited
        // invitation's payload); waiting for it prevents a late prefill from
        // overwriting the subject this test is about to set.
        await expect(this.subjectInput).not.toHaveValue('');
    }

    async setSubject(subject) {
        await this.subjectInput.fill(subject);
    }

    /** Compose step → "Invitation Sent" dialog (PUT populate + PUT invite). */
    async send() {
        await this.sendButton.click();
        await expect(this.sentDialog).toBeVisible();
    }

    /**
     * The success dialog's only button, "View All Users": the browser
     * returns to Users & Roles (Rule 15; the dialog's promise of updates is
     * register A5, not asserted).
     */
    async dismissSentDialog() {
        await this.sentDialog.getByRole('button', {name: 'View All Users'}).click();
        await expect(this.page).toHaveURL(/\/management\/settings\/access(?:[?#]|$)/);
        await expect(this.page.getByRole('heading', {name: 'Users & Roles'})).toBeVisible();
    }
};

exports.AcceptInvitationWizard = class AcceptInvitationWizard extends BasePage {
    constructor(page) {
        super(page);
        this.usernameInput = page.getByLabel(/^Username/);
        this.passwordInput = page.getByLabel(/^Password/);
        this.privacyCheckbox = page.getByRole('checkbox');
        this.saveAndContinueButton = page.getByRole('button', {name: 'Save and continue'});
        this.acceptButton = page.getByRole('button', {name: 'Accept And Continue to OJS'});
        this.acceptedDialog = page
            .getByRole('dialog')
            .filter({hasText: "You've been assigned a new role in OJS"});
        // The ORCID step (Rules 5, 7): shown only when ORCID is on for the
        // journal and the recipient has no verified iD.
        // Exact: the rail's current pill is also a button named "1 Verify ORCID iD".
        this.verifyOrcidButton = page.getByRole('button', {name: 'Verify ORCID iD', exact: true});
        this.skipOrcidButton = page.getByRole('button', {name: 'Skip ORCID verification'});
        // "Create OJS account" (Rules 5, 9; Fields "Accept wizard").
        this.passwordHint = page.getByText(/^It should be at least \d+ characters long/);
        this.privacyStatementLink = page.getByRole('link', {name: 'Privacy Statement'});
        // The steps rail, found by the review step every recipient gets.
        this.stepsList = page.locator('main').getByRole('list').filter({hasText: 'Review & create account'});
        // "Enter details" (new invitees): the name the manager entered arrives here.
        this.givenNameInput = page.getByLabel(/^Given Name/).first();
        // Rule 17: "Cancel" beside the forward button, its question and answers.
        this.cancelButton = page.getByRole('button', {name: 'Cancel', exact: true});
        this.cancelDialog = page.getByRole('dialog').filter({hasText: 'Cancel Role Invitation Process?'});
        this.cancelProcessButton = this.cancelDialog.getByRole('button', {name: 'Cancel Invitation Process'});
        this.goBackButton = this.cancelDialog.getByRole('button', {name: 'Go Back'});
        // The closing dialog's way out (Rules 8, 9).
        this.viewAllSubmissionsButton = this.acceptedDialog.getByRole('button', {name: 'View All Submissions'});
    }

    stepHeading(name) {
        return this.page.getByRole('heading', {name});
    }

    /** A pill of the steps rail ("Verify ORCID iD", "Create OJS account", …). */
    stepPill(name) {
        return this.stepsList.getByRole('listitem').filter({hasText: name});
    }

    async expectOnOrcidStep() {
        await expect(this.stepHeading(/Verify ORCID iD/)).toBeVisible();
    }

    async expectOnAccountStep() {
        await expect(this.stepHeading(/Create OJS account/)).toBeVisible();
    }

    /** "Skip ORCID verification" → the next step (Rule 7). */
    async skipOrcid() {
        await this.skipOrcidButton.click();
    }

    /**
     * Fill the account step and press "Save and continue" without expecting
     * the next step (for a refused password, whose inline error is read by
     * `fieldError`).
     */
    async submitAccount({username, password}) {
        await this.expectOnAccountStep();
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.privacyCheckbox.check();
        await this.saveAndContinueButton.click();
    }

    /** An inline field error by its text. */
    fieldError(text) {
        return this.page.getByText(text);
    }

    /** "Create OJS account" step (new invitees; ORCID is off in test contexts). */
    async createAccount({username, password}) {
        await expect(this.stepHeading(/Create OJS account/)).toBeVisible();
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.privacyCheckbox.check();
        await this.saveAndContinueButton.click();
    }

    async expectOnDetailsStep() {
        await expect(this.stepHeading(/Enter details/)).toBeVisible();
    }

    /** "Cancel" → the "Cancel Role Invitation Process?" question (Rule 17). */
    async openCancelDialog() {
        await this.cancelButton.click();
        await expect(this.cancelDialog).toBeVisible();
    }

    /** "Cancel" → "Cancel Invitation Process"; the caller reads the landing (Rule 17). */
    async cancelProcess() {
        await this.openCancelDialog();
        await this.cancelProcessButton.click();
    }

    /** "Enter details" step (new invitees). */
    async fillDetails({givenName, country}) {
        await expect(this.stepHeading(/Enter details/)).toBeVisible();
        await this.page.getByLabel(/^Given Name/).first().fill(givenName);
        await this.page.getByLabel(/^Country of affiliation/).selectOption(country);
        await this.saveAndContinueButton.click();
    }

    async expectOnReviewStep() {
        await expect(this.stepHeading(/Review & create account/)).toBeVisible();
    }

    /** Final button → "You've been assigned a new role" dialog. */
    async accept() {
        await this.acceptButton.click();
        await expect(this.acceptedDialog).toBeVisible();
    }
};
