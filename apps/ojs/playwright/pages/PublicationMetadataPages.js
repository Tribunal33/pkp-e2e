// @ts-check
/**
 * @file playwright/pages/PublicationMetadataPages.js
 *
 * OJS-local Page Object and flow helpers for the Publication metadata
 * feature (spec: docs/specs/U40-publication-metadata.md).
 *
 * Surfaces:
 * - PublicationScreen — the workflow's Publication area pages ("Title &
 *   Abstract", "Metadata", "Data", "Permissions & Disclosure", "Publication
 *   Settings"): opening an entry (under a named version when the item has
 *   several), the stage screens, the "Status: {state}" readout, the Vue
 *   form's TinyMCE fields, the bounded Save, the "Current Submission
 *   Language" readout with its "Change" panel, the "Schedule For
 *   Publication" panel (Review Publishing Details), Unpublish, "Create New
 *   Version", and the participant "Edit Assignment" permission (tick, and
 *   a read of the box that leaves it as it was, and a set to either
 *   state), the Participants panel's "Notify" window (the one mail a
 *   test causes itself, the positive control of every mailbox absence),
 *   the refused saves (the server's 4xx and the client-side "This field
 *   is required." that sends nothing), the abstract's word-limit line and
 *   the Permissions & Disclosure fields with their lock state. The U49
 *   PublishScreen extends this class with the publish-flow specifics.
 * - Issue helpers (legacy jQuery grid at /manageIssues) — create a future
 *   issue, publish it without notifying users, and set its published date
 *   through the date-picker calendar (the visible input's altField only
 *   updates through the calendar UI, so the helpers drive it).
 *
 * Labels are the live locale strings; DOM shapes confirmed against the
 * running app while this suite was built (2026-08-28): TinyMCE editor ids
 * follow `{formId}-{field}-control[-{locale}]`; the one-line editors keep
 * their toolbar behind a "Formatting" drop-down that opens a floating
 * toolbar overflow (`.tox-toolbar__overflow`) with Bold / Italic /
 * Underline / Superscript / Subscript buttons; useFetch tunnels PUT via
 * POST, so form saves are matched as POSTs. Revision facts (probed
 * 2026-09-15, `.reports/U40/tojs`): the "Notify" window is the legacy
 * `form#notifyForm` with a "Choose a predefined message" select
 * (`name="template"`) and one TinyMCE box whose id starts `message-`; sent
 * with no template chosen it answers 500, so the helper picks "Discussion
 * (Submission)" (its body fetch fills the box, which the message then
 * replaces) and the mail carries that subject; the word-limit line is
 * `.pkpFormField--richTextarea__wordLimit` ("Word Count: {n}/{limit}",
 * one per rich-text field and locale) and over the limit it gains a
 * `.text-negative` icon; an over-limit abstract is refused by the server
 * (400) while an empty required one is refused in the browser (no
 * request); an invalid License URL is the server's 400 with "This is not
 * a valid URL."; the "Current Submission Language" readout's "Change" is a
 * button inside the readout's own element.
 */
const {expect} = require('@playwright/test');
const {waitForJQueryIdle} = require('../support/legacy.js');

/**
 * Wait for a publications API write to answer OK (PUT rides POST via
 * X-Http-Method-Override).
 *
 * @param {import('@playwright/test').Page} page
 */
function waitForPublicationSave(page) {
    return page.waitForResponse(
        (r) =>
            r.url().includes('/publications/') &&
            r.request().method() === 'POST' &&
            r.ok(),
        {timeout: 30_000}
    );
}

/**
 * Wait for a context-settings form save (Settings › Workflow / Distribution
 * forms POST to /api/v1/contexts/{id}).
 *
 * @param {import('@playwright/test').Page} page
 */
function waitForContextSettingsSave(page) {
    return page.waitForResponse(
        (r) =>
            r.url().includes('/api/v1/contexts/') &&
            r.request().method() === 'POST' &&
            r.ok(),
        {timeout: 30_000}
    );
}

exports.waitForPublicationSave = waitForPublicationSave;
exports.waitForContextSettingsSave = waitForContextSettingsSave;

exports.PublicationScreen = class PublicationScreen {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {string} contextPath
     */
    constructor(page, contextPath) {
        this.page = page;
        this.contextPath = contextPath;
    }

    /**
     * Open a submission's workflow (editorial or author view). Waits on the
     * "Publication" menu group, not the "Workflow:" heading — a published
     * submission's workflow can open on a Publication page without it.
     */
    async gotoWorkflow(submissionId, {author = false} = {}) {
        const dashboard = author ? 'mySubmissions' : 'editorial';
        await this.page.goto(
            `/index.php/${this.contextPath}/dashboard/${dashboard}?workflowSubmissionId=${submissionId}`
        );
        await expect(
            this.page.getByRole('link', {name: 'Publication', exact: true})
        ).toBeVisible({timeout: 30_000});
    }

    /**
     * Open a stage screen ("Submission", "Production", …) from the side
     * menu and wait for its "Workflow: {name}" heading. A published item's
     * workflow opens on a Publication page, so the Participants panel needs
     * this first. The menu's link is the last of that name (the header's
     * navigation carries the same word).
     */
    async openStage(name) {
        await this.page.getByRole('link', {name, exact: true}).last().click();
        await expect(
            this.page.getByRole('heading', {name: `Workflow: ${name}`})
        ).toBeVisible({timeout: 30_000});
    }

    /** The workflow's left controls (carry the "Status: {state}" readout). */
    leftControls() {
        return this.page.locator('[data-cy="workflow-controls-left"]');
    }

    /** The workflow's top-right controls (publish/unpublish/unschedule). */
    rightControls() {
        return this.page.locator('[data-cy="workflow-controls-right"]');
    }

    /** Assert the shown version's status readout ("Unscheduled", …). */
    async expectStatus(state) {
        await expect(this.leftControls()).toContainText(`Status: ${state}`, {
            timeout: 30_000,
        });
    }

    /** The Publication-area menu entry for a page ("Title & Abstract", …). */
    entryLink(name) {
        return this.page.getByRole('link', {name, exact: true});
    }

    /** A version's side-menu treeitem (accessible name = version name). */
    versionMenuItem(versionLabel) {
        return this.page.getByRole('treeitem', {name: versionLabel, exact: true});
    }

    /**
     * Open a Publication entry under a specific version's submenu (the
     * side menu nests each version's entries inside its treeitem; clicking
     * the version's own link expands the group). With two versions the
     * plain entryLink is ambiguous, so a two-version item always opens its
     * pages this way.
     */
    async openVersionEntry(versionLabel, entryName) {
        const item = this.versionMenuItem(versionLabel);
        await expect(item).toBeVisible({timeout: 30_000});
        const entry = item.getByRole('link', {name: entryName, exact: true});
        if (!(await entry.isVisible())) {
            await item.getByRole('link', {name: versionLabel, exact: true}).click();
        }
        await expect(entry).toBeVisible({timeout: 30_000});
        await entry.click();
        await expect(
            this.page.getByRole('heading', {name: `Publication: ${entryName}`})
        ).toBeVisible({timeout: 30_000});
    }

    /** The side menu's "Create New Version" link. */
    createNewVersionLink() {
        return this.page.getByRole('link', {name: 'Create New Version', exact: true});
    }

    /**
     * Press "Create New Version", optionally pick the Publication Stage
     * and Revision Significance (left untouched, a published Version of
     * Record 1.0 yields "Version of Record 1.1"), Confirm, and wait for the
     * version POST, the dialog closing and the new version's treeitem.
     *
     * @param {{versionStage?: string, versionIsMinor?: string, expectLabel: string}} options
     */
    async createNewVersion({versionStage, versionIsMinor, expectLabel}) {
        const link = this.createNewVersionLink();
        if (!(await link.isVisible())) {
            await this.page.getByRole('link', {name: 'Publication', exact: true}).click();
        }
        await link.click();
        const dialog = this.page
            .getByRole('dialog')
            .filter({hasText: 'Which version should metadata be copied from?'});
        await expect(dialog.locator('select[name="versionStage"]')).toBeVisible({
            timeout: 30_000,
        });
        if (versionStage) {
            await dialog.locator('select[name="versionStage"]').selectOption(versionStage);
        }
        if (versionIsMinor) {
            await dialog.locator('select[name="versionIsMinor"]').selectOption(versionIsMinor);
        }
        const created = this.page.waitForResponse(
            (r) =>
                r.url().includes('/version') &&
                r.request().method() === 'POST' &&
                r.ok(),
            {timeout: 30_000}
        );
        await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        await created;
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
        await expect(this.versionMenuItem(expectLabel)).toBeVisible({timeout: 30_000});
    }

    /**
     * Press "Create New Version" and Confirm its dialog untouched (U49 Rule
     * 11: an untouched Confirm answers everything). On a never-published
     * item the dialog arrives with the source "Unassigned version ({date})"
     * and no stage, so the copy is a second "Unassigned version ({date})"
     * with the same name as its source (read live 2026-09-16,
     * `.reports/U41/tojs/after-new-version-ojs.json`); the copy is told
     * apart by the id the version POST answers with, not by name. Returns
     * the new publication's id.
     *
     * @returns {Promise<number>}
     */
    async createNewVersionUntouched() {
        const link = this.createNewVersionLink();
        if (!(await link.isVisible())) {
            await this.page.getByRole('link', {name: 'Publication', exact: true}).click();
        }
        await link.click();
        const dialog = this.page
            .getByRole('dialog')
            .filter({hasText: 'Which version should metadata be copied from?'});
        await expect(dialog.locator('select[name="versionSource"]')).toBeVisible({
            timeout: 30_000,
        });
        const created = this.page.waitForResponse(
            (r) =>
                r.url().includes('/version') &&
                r.request().method() === 'POST' &&
                r.ok(),
            {timeout: 30_000}
        );
        await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        const response = await created;
        const publication = await response.json();
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
        return publication.id;
    }

    /**
     * Open one version's Publication page by address: the workflow reads
     * `workflowMenuKey` from the URL (`publication_{publicationId}_{page}`,
     * useWorkflowNavigationConfigOJS.js), which is the only way to tell two
     * same-named versions apart. Waits for the "Publication: {name}"
     * heading.
     *
     * @param {number} submissionId
     * @param {number} publicationId
     * @param {'contributors'|'titleAbstract'|'metadata'} pageKey
     * @param {string} heading the page's heading name ("Contributors")
     */
    async gotoVersionPage(submissionId, publicationId, pageKey, heading) {
        await this.page.goto(
            `/index.php/${this.contextPath}/dashboard/editorial?workflowSubmissionId=${submissionId}&workflowMenuKey=publication_${publicationId}_${pageKey}`
        );
        await expect(
            this.page.getByRole('heading', {name: `Publication: ${heading}`})
        ).toBeVisible({timeout: 30_000});
    }

    /**
     * Open a Publication entry and wait for its "Publication: {name}" page
     * heading. The Publication group is expanded by default; clicking the
     * group header would collapse it, so it is only clicked when the entry
     * is hidden.
     */
    async openEntry(name) {
        const entry = this.entryLink(name);
        if (!(await entry.isVisible())) {
            await this.page.getByRole('link', {name: 'Publication', exact: true}).click();
        }
        await entry.click();
        await expect(
            this.page.getByRole('heading', {name: `Publication: ${name}`})
        ).toBeVisible({timeout: 30_000});
    }

    /** The current form's Save button. */
    saveButton() {
        return this.page.getByRole('button', {name: 'Save', exact: true});
    }

    /** Press Save and wait for the API write plus the "Saved" footer note. */
    async save() {
        const saved = waitForPublicationSave(this.page);
        await this.saveButton().click();
        const response = await saved;
        await expect(
            this.page.locator('[role="status"]:has-text("Saved")')
        ).toBeVisible({timeout: 30_000});
        return response;
    }

    /**
     * Press Save on a form the server refuses: waits for the publications
     * write to answer with a non-OK status and returns that response. The
     * caller asserts the field message and the summary.
     */
    async saveRefusedByServer() {
        const refused = this.page.waitForResponse(
            (r) =>
                r.url().includes('/publications/') &&
                r.request().method() === 'POST' &&
                !r.ok(),
            {timeout: 30_000}
        );
        await this.saveButton().click();
        return refused;
    }

    /**
     * Press Save on a form the browser refuses before sending anything:
     * counts the publications writes fired from the press until the given
     * refusal message is on screen (the bound), and returns that count (0
     * when nothing was sent).
     *
     * @param {import('@playwright/test').Locator} refusal the message that bounds the wait
     * @returns {Promise<number>}
     */
    async saveRefusedInPlace(refusal) {
        let sent = 0;
        const onRequest = (request) => {
            if (request.url().includes('/publications/') && request.method() === 'POST') {
                sent += 1;
            }
        };
        this.page.on('request', onRequest);
        try {
            await this.saveButton().click();
            await expect(refusal).toBeVisible({timeout: 30_000});
        } finally {
            this.page.off('request', onRequest);
        }
        return sent;
    }

    /** The error summary's "Go to {field}" jump button. */
    goToFieldButton(field) {
        return this.page.getByRole('button', {name: new RegExp(`^Go to ${field}`)});
    }

    /** A field's inline error (`.pkpFieldError`) carrying the given text. */
    fieldError(text) {
        return this.page.locator('.pkpFieldError').filter({hasText: text});
    }

    /**
     * The first rich-text field's "Word Count: {n}/{limit}" line (the
     * Abstract's on Title & Abstract; a Plain Language Summary line follows
     * it when that field is enabled).
     */
    wordLimitLine() {
        return this.page.locator('.pkpFormField--richTextarea__wordLimit').first();
    }

    /** The red error mark the word-count line gains over the limit. */
    wordLimitErrorIcon() {
        return this.wordLimitLine().locator('.text-negative');
    }

    /**
     * The Permissions & Disclosure fields and their lock furniture: the
     * three inputs, every "Override" link on the page, and the three
     * automatic-value descriptions.
     */
    permissionsFields() {
        return {
            holder: this.page.locator('input[name="copyrightHolder-en"]'),
            year: this.page.locator('input[name="copyrightYear"]'),
            licenseUrl: this.page.locator('input[name="licenseUrl"]'),
            overrides: this.page.getByRole('button', {name: 'Override', exact: true}),
            holderDescription: this.page.getByText(/Copyright will be assigned automatically to/),
            yearDescription: this.page.getByText(
                'The copyright year will be set automatically when this is published in an issue.'
            ),
            licenseDescription: this.page.getByText(/The license will be set automatically to/),
        };
    }

    /**
     * Set a TinyMCE field's content the way a save reads it (the backing
     * textarea never updates — patterns.md). Waits for the editor to
     * initialize first.
     *
     * @param {string} editorId e.g. 'titleAbstract-abstract-control-en'
     * @param {string} html
     */
    async setRichText(editorId, html) {
        await this.page.waitForFunction(
            (id) => !!window.tinymce?.get(id)?.initialized,
            editorId,
            {timeout: 30_000}
        );
        await this.page.evaluate(
            ([id, value]) => {
                const editor = window.tinymce.get(id);
                editor.setContent(value);
                editor.fire('change');
            },
            [editorId, html]
        );
    }

    /** Read a TinyMCE field's current content. */
    async richTextContent(editorId) {
        await this.page.waitForFunction(
            (id) => !!window.tinymce?.get(id)?.initialized,
            editorId,
            {timeout: 30_000}
        );
        return this.page.evaluate((id) => window.tinymce.get(id).getContent(), editorId);
    }

    /**
     * Apply a Formatting-menu command to a one-line editor: click into the
     * editor, select everything, open the "Formatting" drop-down and press
     * the command's button in the floating toolbar it opens.
     *
     * @param {string} editorId
     * @param {string} command accessible name, e.g. 'Italic'
     */
    async applyFormattingCommand(editorId, command) {
        await this.page.frameLocator(`#${editorId}_ifr`).locator('body').click();
        await this.page.keyboard.press('ControlOrMeta+a');
        await this.page.getByRole('button', {name: 'Formatting'}).click();
        const overflow = this.page.locator('.tox-toolbar__overflow');
        await expect(overflow).toBeVisible({timeout: 30_000});
        await overflow.getByRole('button', {name: command, exact: true}).click();
    }

    /** The "Current Submission Language: {language}" readout's line. */
    languageReadoutLine() {
        return this.page
            .getByText('Current Submission Language:', {exact: false})
            .locator('xpath=..');
    }

    /** The readout's "Change" button (editorial Publication pages only). */
    changeLanguageButton() {
        return this.page.getByRole('button', {name: 'Change', exact: true});
    }

    /** The "Change" button inside the readout's own line (absent for a
     * viewer who may not edit; the bare changeLanguageButton() sweeps the
     * page). */
    readoutChangeButton() {
        return this.languageReadoutLine().getByRole('button', {name: 'Change', exact: true});
    }

    /** The "Change Submission Language For" side panel. */
    changeLanguageDialog() {
        return this.page.getByRole('dialog', {name: /Change Submission Language/i});
    }

    /**
     * Open the Change Submission Language panel and wait until it is fully
     * initialized. The panel loads the publication in the background and a
     * language picked before that load lands leaves the revealed boxes
     * describing the OLD language; the publication's title in the panel's
     * subtitle renders from the same load, so it is the settle gate.
     *
     * @param {string} expectedTitle the submission's title
     */
    async openChangeLanguagePanel(expectedTitle) {
        await this.changeLanguageButton().click();
        const dialog = this.changeLanguageDialog();
        await expect(
            dialog.getByRole('button', {name: 'Confirm', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(dialog.getByText(expectedTitle).first()).toBeVisible({
            timeout: 30_000,
        });
        return dialog;
    }

    /**
     * The top-right publish button in the Publication area's controls (its
     * label is "Schedule For Publication" until the submission itself counts
     * as published, then "Publish"). Scoped to the right-controls container
     * so the stage views' same-labeled navigation shortcut never matches.
     */
    publishButton() {
        return this.page
            .locator('[data-cy="workflow-controls-right"]')
            .getByRole('button', {name: /^(Schedule For Publication|Publish)$/});
    }

    /** The "Review Publishing Details" side panel (open or not). */
    publishPanel() {
        return this.page
            .locator('[data-cy="active-modal"]')
            .filter({hasText: 'Review Publishing Details'})
            .last();
    }

    /**
     * The panel's "Issue Assignment" radio group. It is on screen in the
     * same render as the version selects on a journal that has issues and
     * never on one without, so a count taken once the version select shows
     * decides which panel this is.
     */
    issueAssignmentGroup(panel) {
        return panel.getByRole('group', {name: /^Issue Assignment/});
    }

    /**
     * Press the publish button and wait for what it opens: the "Review
     * Publishing Details" panel, returned settled (see
     * `awaitPublishPanelSettled`), or `or`, a locator for what the button
     * opens instead (the confirmation window, for a version whose panel was
     * confirmed before), in which case null is returned. The FIRST press is
     * occasionally swallowed (nothing opens, no request fires — U49 spec
     * fn-k), so the press is retried once when nothing has appeared.
     * The button shows only on a publication page ("Title & Abstract", …):
     * the stage view a `workflowSubmissionId` address opens on (a Production
     * submission, or one just unpublished) has none, so open a publication
     * page first (`entryLink()`, `openVersionEntry()`; U13, U19, U45, U50
     * issue walks).
     *
     * @param {{or?: import('@playwright/test').Locator}} [options]
     * @returns {Promise<import('@playwright/test').Locator | null>}
     */
    async pressPublish({or = null} = {}) {
        const button = this.publishButton();
        await expect(button).toBeVisible({timeout: 30_000});
        // Armed before the press: the panel asks for it as it mounts. A
        // panel without the issue group (or no panel) never asks, so the
        // wait ends in null instead of a rejection nobody awaits.
        const statusAnswer = this.page
            .waitForResponse(
                (r) => r.url().includes('/issueAssignmentStatus') && r.request().method() === 'GET',
                {timeout: 60_000}
            )
            .catch(() => null);
        const panel = this.publishPanel();
        const stage = panel.locator('select[name="versionStage"]');
        const opened = or ? stage.or(or).first() : stage;
        await button.click();
        try {
            await expect(opened).toBeVisible({timeout: 5_000});
        } catch {
            await button.click();
        }
        await expect(opened).toBeVisible({timeout: 30_000});
        if (or && !(await stage.isVisible())) {
            return null;
        }
        await this.awaitPublishPanelSettled(panel, statusAnswer);
        return panel;
    }

    /**
     * Wait until the open panel's "Issue Assignment" carries the value the
     * panel preselects for it. The group is required and mounts empty; the
     * panel fills it (and the hidden status the publish needs) only when
     * its `issueAssignmentStatus` GET answers, so a "Confirm" pressed
     * before that is refused in place ("This field is required." under the
     * group, no request, no confirmation window; the U13 S3 flake,
     * `.reports/flake-s26/u13s3/diagnosis.md`). Waits for that answer, then
     * for the radios (their own options fetch) and, when the answer's
     * assignment is among them, for it to be checked. A panel without the
     * group (a journal with no issues) is settled as soon as it shows.
     *
     * @param {import('@playwright/test').Locator} panel
     * @param {Promise<import('@playwright/test').Response | null>} statusAnswer
     */
    async awaitPublishPanelSettled(panel, statusAnswer) {
        if ((await this.issueAssignmentGroup(panel).count()) === 0) {
            return;
        }
        const response = await statusAnswer;
        if (!response || !response.ok()) {
            throw new Error(
                `the publish panel's issueAssignmentStatus answered ${response ? response.status() : 'nothing'}`
            );
        }
        const {assignmentType} = await response.json();
        const radios = panel.locator('input[name="assignment"]');
        await expect(radios.first()).toBeVisible({timeout: 30_000});
        const preselected = panel.locator(`input[name="assignment"][value="${assignmentType}"]`);
        if ((await preselected.count()) > 0) {
            await expect(preselected).toBeChecked({timeout: 30_000});
        }
    }

    /**
     * The "Review Publishing Details" side panel, opened by the publish
     * button from a Publication page and returned settled
     * (`awaitPublishPanelSettled`).
     */
    async openPublishPanel() {
        return this.pressPublish();
    }

    /**
     * Fill the panel's required version details (Publication Stage and
     * Revision Significance; "Minor Revision" is disabled for a first
     * Version of Record, so the major option is picked).
     *
     * @param {import('@playwright/test').Locator} panel
     */
    async fillVersionDetails(panel) {
        await panel.locator('select[name="versionStage"]').selectOption('VoR');
        await panel.locator('select[name="versionIsMinor"]').selectOption('false');
    }

    /**
     * Pick an option in the panel/page "Issue *" select once its async
     * option list carries a label matching the given pattern.
     *
     * @param {import('@playwright/test').Locator} scope
     * @param {RegExp} issueLabel
     */
    async selectIssueOption(scope, issueLabel) {
        const issueSelect = scope.locator('select[name="issueId"]');
        await expect(issueSelect).toBeVisible({timeout: 30_000});
        const option = issueSelect.locator('option').filter({hasText: issueLabel});
        await expect(option).toHaveCount(1, {timeout: 30_000});
        await issueSelect.selectOption((await option.getAttribute('value')) || '');
    }

    /**
     * Publish the current submission through the panel. With no issue
     * assigned the journal publishes immediately (continuous publication);
     * pass an issue label regex to pick "Assign To Current/Back Issue"
     * first. Ends on the workflow with "Status: Published".
     *
     * On a journal that has issues the panel carries a required "Issue
     * Assignment" radio group (its preselection arrives by fetch, which
     * `openPublishPanel` waits out); without issues the group never
     * appears, so the no-issue choice is ticked only where it is.
     *
     * @param {{backIssueLabel?: RegExp, futureIssueLabel?: RegExp}} options
     *   backIssueLabel picks "Assign To Current/Back Issue" and that issue;
     *   futureIssueLabel picks "Assign To Future Issue and Publish
     *   Immediately" and that issue.
     */
    /**
     * Wait for the panel's Issue Assignment group to finish its async
     * preselection (touching the radios earlier races the fetch and the
     * Confirm then submits an inconsistent status).
     *
     * @param {import('@playwright/test').Locator} panel
     */
    async awaitAssignmentPreselected(panel) {
        await expect(panel.locator('input[name="assignment"]:checked')).toHaveCount(1, {
            timeout: 30_000,
        });
    }

    async publish({backIssueLabel, futureIssueLabel} = {}) {
        const panel = await this.openPublishPanel();
        await this.fillVersionDetails(panel);
        if (futureIssueLabel) {
            // "Assign To Future Issue and Publish Immediately": continuous
            // publication into a not-yet-published issue.
            const futureRadio = panel.getByRole('radio', {
                name: 'Assign To Future Issue and Publish Immediately',
            });
            await expect(futureRadio).toBeVisible({timeout: 30_000});
            await this.awaitAssignmentPreselected(panel);
            await futureRadio.check();
            await this.selectIssueOption(panel, futureIssueLabel);
        } else if (backIssueLabel) {
            const backRadio = panel.getByRole('radio', {
                name: 'Assign To Current/Back Issue',
            });
            await expect(backRadio).toBeVisible({timeout: 30_000});
            await this.awaitAssignmentPreselected(panel);
            await backRadio.check();
            await this.selectIssueOption(panel, backIssueLabel);
        } else if ((await this.issueAssignmentGroup(panel).count()) > 0) {
            // The panel came back settled, so the group's presence is
            // known (it shows with the version selects) and its
            // preselection is in: no timed guess at its radios.
            await panel.getByRole('radio', {name: "Don't Assign To An Issue"}).check();
        }
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        const confirmDialog = this.page
            .getByRole('dialog')
            .filter({hasText: 'Are you sure you want to publish this?'});
        const published = this.page.waitForResponse(
            (r) => r.url().includes('/publish') && r.ok(),
            {timeout: 30_000}
        );
        await confirmDialog
            .getByRole('button', {name: 'Publish', exact: true})
            .click();
        await published;
        await expect(
            this.page.getByRole('button', {name: 'Unpublish', exact: true})
        ).toBeVisible({timeout: 30_000});
    }

    /**
     * Schedule the current submission to a future issue WITHOUT publishing:
     * the dependable route (spec scenario seeding) saves "Assign To Future
     * Issue and Schedule Only" on the Publication Settings page first, then
     * re-picks the same choice in the "Review Publishing Details" panel.
     * Ends with "Status: Scheduled".
     *
     * @param {RegExp} issueLabel matches the future issue's option label
     */
    async scheduleToFutureIssue(issueLabel) {
        await this.openEntry('Publication Settings');
        const pickScheduleOnly = async (scope) => {
            const scheduleOnly = scope.getByRole('radio', {
                name: 'Assign To Future Issue and Schedule Only',
            });
            await expect(scheduleOnly).toBeVisible({timeout: 30_000});
            await scheduleOnly.check();
            await this.selectIssueOption(scope, issueLabel);
        };
        await pickScheduleOnly(this.page);
        const saved = waitForPublicationSave(this.page);
        await this.saveButton().click();
        await saved;

        const panel = await this.openPublishPanel();
        await this.fillVersionDetails(panel);
        await this.awaitAssignmentPreselected(panel);
        await pickScheduleOnly(panel);
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        const confirmDialog = this.page
            .getByRole('dialog')
            .filter({hasText: 'Are you sure you want to schedule this for publication?'});
        const scheduled = this.page.waitForResponse(
            (r) => r.url().includes('/publish') && r.ok(),
            {timeout: 30_000}
        );
        await confirmDialog
            .getByRole('button', {name: 'Schedule For Publication', exact: true})
            .click();
        await scheduled;
        await expect(
            this.page.getByRole('button', {name: 'Unschedule', exact: true})
        ).toBeVisible({timeout: 30_000});
    }

    /** Unpublish the current version through its confirmation dialog. */
    async unpublish() {
        await this.page.getByRole('button', {name: 'Unpublish', exact: true}).click();
        const dialog = this.page
            .getByRole('dialog')
            .filter({hasText: "Are you sure you don't want this to be published?"});
        const unpublished = this.page.waitForResponse(
            (r) => r.url().includes('/unpublish') && r.ok(),
            {timeout: 30_000}
        );
        await dialog.getByRole('button', {name: 'Unpublish', exact: true}).click();
        await unpublished;
        await expect(
            this.page.getByRole('button', {name: 'Schedule For Publication', exact: true})
        ).toBeVisible({timeout: 30_000});
    }

    /**
     * On a stage screen's Participants panel, open a participant's "Edit
     * Assignment" form and tick "Allow this person to make changes to the
     * publication…" (legacy jQuery form).
     *
     * @param {string} displayName e.g. 'Ada Author'
     */
    async allowParticipantMetadataEdit(displayName) {
        await this.page
            .getByRole('button', {name: `${displayName} More Actions`})
            .first()
            .click();
        await this.page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const dialog = this.page
            .getByRole('dialog')
            .filter({hasText: 'Edit Assignment'});
        const checkbox = dialog.locator('input[name="canChangeMetadata"]');
        await expect(checkbox).toBeVisible({timeout: 30_000});
        await checkbox.check();
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(checkbox).toHaveCount(0, {timeout: 30_000});
        await waitForJQueryIdle(this.page);
    }

    /**
     * Open a participant's "Edit Assignment" form, read whether "Allow this
     * person to make changes to the publication…" is ticked, and leave the
     * form through its Cancel (a link on this legacy form) so nothing is
     * saved. Returns the box's state.
     *
     * @param {string} displayName e.g. 'Ada Author'
     * @returns {Promise<boolean>}
     */
    async participantMetadataEditAllowed(displayName) {
        await this.page
            .getByRole('button', {name: `${displayName} More Actions`})
            .first()
            .click();
        await this.page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const dialog = this.page
            .getByRole('dialog')
            .filter({hasText: 'Edit Assignment'});
        const checkbox = dialog.locator('input[name="canChangeMetadata"]');
        await expect(checkbox).toBeVisible({timeout: 30_000});
        const allowed = await checkbox.isChecked();
        await dialog.getByRole('link', {name: 'Cancel', exact: true}).click();
        await expect(checkbox).toHaveCount(0, {timeout: 30_000});
        await waitForJQueryIdle(this.page);
        return allowed;
    }

    /**
     * Open a participant's "Edit Assignment" form, set "Allow this person to
     * make changes to the publication…" to the wanted state and press OK.
     * Returns the state the box arrived in.
     *
     * @param {string} displayName e.g. 'Carla Copyeditor'
     * @param {boolean} allowed
     * @returns {Promise<boolean>}
     */
    async setParticipantMetadataEdit(displayName, allowed) {
        await this.page
            .getByRole('button', {name: `${displayName} More Actions`})
            .first()
            .click();
        await this.page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const dialog = this.page
            .getByRole('dialog')
            .filter({hasText: 'Edit Assignment'});
        const checkbox = dialog.locator('input[name="canChangeMetadata"]');
        await expect(checkbox).toBeVisible({timeout: 30_000});
        const arrived = await checkbox.isChecked();
        await checkbox.setChecked(allowed);
        await dialog.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(checkbox).toHaveCount(0, {timeout: 30_000});
        await waitForJQueryIdle(this.page);
        return arrived;
    }

    /**
     * On a stage screen's Participants panel, open a participant's "Notify"
     * window, pick the "Discussion (Submission)" template, replace the
     * message and press "Notify": the one mail a test sends itself (the
     * positive control of a mailbox absence, PRINCIPLES A8) and one
     * discussion task for the participant. Bounded by the send answering OK.
     *
     * @param {string} displayName e.g. 'Xena Spare'
     * @param {string} message html, e.g. '<p>Control u40s1…</p>'
     */
    async notifyParticipant(displayName, message) {
        await this.page
            .getByRole('button', {name: `${displayName} More Actions`})
            .first()
            .click();
        await this.page.getByRole('menuitem', {name: 'Notify', exact: true}).click();
        const form = this.page.locator('form#notifyForm');
        const notifyButton = form.getByRole('button', {name: 'Notify', exact: true});
        await expect(notifyButton).toBeVisible({timeout: 30_000});
        const bodyFetched = this.page.waitForResponse(
            (r) => /fetch-template-body/.test(r.url()) && r.ok(),
            {timeout: 30_000}
        );
        await form.locator('select[name="template"]').selectOption({label: 'Discussion (Submission)'});
        await bodyFetched;
        await waitForJQueryIdle(this.page);
        // The template's body lands in the box a beat after its fetch
        // answers; a message set before that is overwritten by it. Wait for
        // the box to hold the template, then replace it and read it back.
        // A closed Notify window leaves its editor registered in TinyMCE,
        // so the box is the one inside the form that is on screen now.
        // Under load the box sometimes keeps its one empty paragraph after
        // the fetch answered (ci-triage "The Notify window's template body
        // never landing in the editor under load"), so when the wait runs
        // out once, the template's change handler is fired again, its fetch
        // awaited, and the wait repeated: a content-verified bounded retry.
        const templateInBox = () => {
            const form = document.querySelector('form#notifyForm');
            const editor = (window.tinymce?.get() || []).find(
                (e) =>
                    /^message/.test(e.id) &&
                    e.initialized &&
                    form?.contains(e.getElement()) &&
                    e.getContent().trim() !== ''
            );
            return editor ? editor.id : null;
        };
        let id = null;
        for (let attempt = 1; id === null; attempt++) {
            try {
                const editorId = await this.page.waitForFunction(templateInBox, undefined, {
                    timeout: attempt === 1 ? 15_000 : 30_000,
                });
                id = await editorId.jsonValue();
            } catch (error) {
                if (attempt >= 2) throw error;
                const refetched = this.page.waitForResponse(
                    (r) => /fetch-template-body/.test(r.url()) && r.ok(),
                    {timeout: 30_000}
                );
                await form.locator('select[name="template"]').dispatchEvent('change');
                await refetched;
                await waitForJQueryIdle(this.page);
            }
        }
        await this.page.evaluate(
            ([editor, value]) => {
                const box = window.tinymce.get(editor);
                box.setContent(value);
                box.fire('change');
            },
            [id, message]
        );
        await expect
            .poll(() => this.page.evaluate((editor) => window.tinymce.get(editor).getContent(), id), {
                timeout: 30_000,
            })
            .toBe(message);
        const sent = this.page.waitForResponse(
            (r) => /send-notification/.test(r.url()) && r.ok(),
            {timeout: 30_000}
        );
        await notifyButton.click();
        await sent;
        await waitForJQueryIdle(this.page);
    }

    /** Open the workflow's "Activity Log" modal ("Activity Log & Notes"). */
    async openActivityLog() {
        await this.page
            .getByRole('button', {name: 'Activity Log', exact: true})
            .click();
        const dialog = this.page
            .getByRole('dialog')
            .filter({hasText: 'Activity Log & Notes'});
        await expect(dialog.getByText('Event', {exact: true})).toBeVisible({
            timeout: 30_000,
        });
        return dialog;
    }
};

/**
 * Create an issue through Issues › Future Issues › "Create Issue" (legacy
 * grid). Leaves the page on /manageIssues.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} contextPath
 * @param {{volume: string, number: string, year: string, title: string}} data
 */
exports.createIssue = async function createIssue(page, contextPath, {volume, number, year, title}) {
    await page.goto(`/index.php/${contextPath}/manageIssues`);
    await page.getByRole('link', {name: 'Create Issue'}).click();
    const modal = page
        .getByRole('dialog')
        .filter({has: page.locator('input[name="volume"]')});
    await expect(modal.locator('input[name="volume"]')).toBeVisible({timeout: 30_000});
    await modal.locator('input[name="volume"]').fill(volume);
    await modal.locator('input[name="number"]').fill(number);
    await modal.locator('input[name="year"]').fill(year);
    await modal.locator('input[name="title[en]"]').fill(title);
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    await expect(modal.locator('input[name="volume"]')).toHaveCount(0, {timeout: 30_000});
    await waitForJQueryIdle(page);
};

/**
 * Publish the future issue whose row carries the given identification,
 * unticking "Send an email about this to all registered users." so the
 * shared Mailpit stays quiet. Assumes the page is on /manageIssues.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} identification e.g. 'Vol. 2 No. 1 (2025)'
 */
exports.publishIssue = async function publishIssue(page, identification) {
    const row = page.locator('tr.gridRow').filter({hasText: identification});
    await row.locator('a.show_extras').click();
    await waitForJQueryIdle(page);
    await page.getByRole('link', {name: 'Publish Issue'}).click();
    const dialog = page
        .getByRole('dialog')
        .filter({hasText: 'Are you sure you want to publish the new issue?'});
    const mailToggle = dialog.locator('input[type="checkbox"]').first();
    await expect(mailToggle).toBeVisible({timeout: 30_000});
    await mailToggle.uncheck();
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
    await waitForJQueryIdle(page);
};

/**
 * Set a back issue's Date Published through the Issue Data form's
 * date-picker calendar (typing alone never syncs the hidden altField the
 * form submits). Assumes the page is on /manageIssues.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} identification issue row text to match
 * @param {{year: string, monthIndex: string, day: string}} date
 *   monthIndex is the calendar's 0-based month value ('5' = June).
 */
exports.setBackIssueDate = async function setBackIssueDate(page, identification, {year, monthIndex, day}) {
    await page.getByRole('tab', {name: 'Back Issues'})
        .or(page.getByRole('link', {name: 'Back Issues'}))
        .first()
        .click();
    await waitForJQueryIdle(page);
    const row = page.locator('tr.gridRow').filter({hasText: identification});
    await row.locator('a.show_extras').click();
    await waitForJQueryIdle(page);
    await page.getByRole('link', {name: 'Edit', exact: true}).click();
    const modal = page.getByRole('dialog').filter({hasText: 'Issue Management'});
    await expect(modal.getByRole('link', {name: 'Issue Data'}).first()).toBeVisible({
        timeout: 30_000,
    });
    await modal.getByRole('link', {name: 'Issue Data'}).first().click();
    const dateField = modal.locator('input[name="datePublished-removed"]');
    await expect(dateField).toBeVisible({timeout: 30_000});
    await dateField.click();
    const calendar = page.locator('#ui-datepicker-div');
    await expect(calendar).toBeVisible({timeout: 30_000});
    await calendar.locator('select.ui-datepicker-year').selectOption(year);
    await calendar.locator('select.ui-datepicker-month').selectOption(monthIndex);
    await calendar.locator('td a').filter({hasText: new RegExp(`^${day}$`)}).click();
    await expect(modal.locator('input[name="datePublished"]')).toHaveValue(
        new RegExp(`^${year}-`)
    );
    // Component-router op URLs are kebab-cased (patterns.md).
    const saved = page.waitForResponse(
        (r) => /update-issue/.test(r.url()) && r.ok(),
        {timeout: 30_000}
    );
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    await saved;
    await waitForJQueryIdle(page);
    // The Issue Management modal is left open (its Close button re-renders
    // and can stay "unstable" after the save) and the form can still be
    // flagged dirty, which turns the next navigation into a beforeunload
    // confirm; Playwright's default dismisses that and the navigation would
    // hang. Accept beforeunload prompts on this page from here on.
    page.on('dialog', (dialog) => {
        const handle =
            dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss();
        handle.catch(() => {});
    });
};
