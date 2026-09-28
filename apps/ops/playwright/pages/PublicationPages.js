// @ts-check
/**
 * @file playwright/pages/PublicationPages.js
 *
 * OPS-local Page Object and flow helpers for the Publication metadata
 * feature (spec: docs/specs/U40-publication-metadata.md). App-local by
 * design (PRINCIPLES M1) — nothing here touches the shared POMs.
 *
 * Surfaces:
 * - PublicationScreen — the workflow's Publication-area pages, reached
 *   through the OPS workflow nav group labeled "Preprint" (spec Rule 1):
 *   "Title & Abstract", "Metadata", "Data", "Permissions & Disclosure",
 *   each headed "Preprint: {entry}". Carries the form-field addressing
 *   (FieldBase compileId: `{formId}-{name}-control[-{locale}]`, TinyMCE
 *   iframes at `{controlId}_ifr`), the Save flow bounded by the
 *   publications API + the "Saved" status (patterns.md locator pitfall on the "Saved" status), the
 *   locked-field "Override" affordance (Rule 11), and the "Current
 *   Submission Language" readout with its "Change" panel (Rule 13).
 * - postPreprint / unpostPreprint — the Production stage screen's "Post"
 *   (legacy "Post the preprint" modal wrapping the OPS PublishForm) and
 *   "Unpost" (confirm dialog "Are you sure you don't want this to be
 *   posted?").
 * - openPublicationPage / statusReadout / createNewVersion /
 *   openEditAssignment — one version's page by address (workflowMenuKey),
 *   the header's "Status:" readout, the Preprint group's "Create New
 *   Version" dialog and a participant's "Edit Assignment" window (Rule 2's
 *   "Allow this person to make changes to the publication…" box); added
 *   2026-09-09 for scenario 3's new-version and after-unpost legs.
 * - Added 2026-09-15 (the coverage revision): the form's refusal readouts
 *   (`fieldError`, `errorSummary`, `goToErrorButton`), the Abstract's word
 *   counter (`wordLimit`, `wordLimitErrorMark`), the published-version
 *   warning (`publishedWarning`), `setEditAssignmentPermission` (Rule 2's
 *   box saved through "OK"), `watchPublicationSaves` (a request watcher for
 *   "nothing is sent" claims), `metadataUpdatedLogCount` (the Activity
 *   Log's "Submission metadata updated" lines), `addDiscussion` (the
 *   discussions panel's form, the mail the suite causes as its Mailpit
 *   positive control; `sendMailControl` opens it on a scratch server of
 *   its own, 2026-09-26), `licenseBlock` (the landing page's "License" block)
 *   and `expectPrecedes` (a DOM-order read for "in that order" claims).
 * - Added 2026-09-16 (U49's coverage revision): the preprint page's date
 *   line and "Versions" list (`preprintDateLine`, `preprintVersionsList`;
 *   templates/frontend/objects/preprint_details.tpl) and
 *   `switchOffPublishedEmail` (the Author's Profile › Notifications opt-out
 *   of the "Publication Published" email, saved through the tab's own
 *   Save).
 *
 * Labels are the live locale strings (ops + lib/pkp locale/en/*.po at the
 * pinned commits); DOM shapes from lib/ui-library WorkflowPublicationForm /
 * FieldBase / FieldText / FieldRichTextarea, confirmed against the running
 * OPS fleet while this suite was built (2026-08-28).
 */
const {expect} = require('@playwright/test');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {waitForEditorReady} = require('../../../../shared/playwright/support/richtext.js');

/**
 * Open a submission's workflow panel straight by URL (editorial or author
 * dashboard). The OPS workflow panel has no "Workflow:" heading — arrival is
 * judged on the "Preprint" nav group (apps/ops MySubmissionsPage note).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} contextPath
 * @param {number} submissionId
 * @param {{author?: boolean}} [options]
 */
async function openWorkflow(page, contextPath, submissionId, {author = false} = {}) {
    const dashboard = author ? 'mySubmissions' : 'editorial';
    await page.goto(
        `/index.php/${contextPath}/dashboard/${dashboard}?workflowSubmissionId=${submissionId}`
    );
    await expect(
        page.getByRole('link', {name: 'Preprint', exact: true})
    ).toBeVisible({timeout: 30_000});
}

exports.openWorkflow = openWorkflow;

exports.PublicationScreen = class PublicationScreen {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;
    }

    /** A Publication-area nav entry under the "Preprint" group. */
    navLink(name) {
        return this.page.getByRole('link', {name, exact: true});
    }

    /**
     * Open a Publication page from an open workflow panel and wait for its
     * "Preprint: {entry}" heading. The "Preprint" group is expanded by
     * default — clicking it would COLLAPSE it, so it is only clicked when
     * the entry is hidden (same guard as FundingPages).
     *
     * @param {string} name nav entry ("Title & Abstract", "Metadata", …)
     */
    async openPage(name) {
        const group = this.page.getByRole('link', {name: 'Preprint', exact: true});
        await expect(group).toBeVisible({timeout: 30_000});
        const entry = this.navLink(name);
        if (!(await entry.isVisible())) {
            await group.click();
        }
        await entry.click();
        await expect(
            this.page.getByRole('heading', {name: `Preprint: ${name}`})
        ).toBeVisible({timeout: 30_000});
    }

    /** Open the workflow's Production stage screen (OPS's one stage,
     * editorial view only — the author view has none). Arrival is judged on
     * the stage's Participants panel (the OPS workflow panel carries no
     * "Workflow:" heading — apps/ops MySubmissionsPage note). */
    async openProductionStage() {
        await this.navLink('Production').click();
        await expect(
            this.page.locator('[data-cy="participant-manager"]')
        ).toBeVisible({timeout: 30_000});
    }

    /**
     * A form field's control id (FieldBase compileId): multilingual fields
     * carry the locale key.
     */
    controlId(formId, name, locale = null) {
        return locale ? `${formId}-${name}-control-${locale}` : `${formId}-${name}-control`;
    }

    /** A plain input (FieldText) by its control id. */
    input(formId, name, locale = null) {
        return this.page.locator(`#${this.controlId(formId, name, locale)}`);
    }

    /** The TinyMCE editing body of a rich-text field (iframe `{id}_ifr`). */
    richTextBody(formId, name, locale = null) {
        return this.page
            .frameLocator(`iframe#${this.controlId(formId, name, locale)}_ifr`)
            .locator('body');
    }

    /**
     * Replace a rich-text field's content by typing into its editor body,
     * once its editor is initialized (typed earlier, the text is replaced by
     * the field's old value and never reaches the form:
     * shared/playwright/support/richtext.js).
     */
    async fillRichText(formId, name, locale, text) {
        await waitForEditorReady(this.page, this.controlId(formId, name, locale));
        const body = this.richTextBody(formId, name, locale);
        await body.click();
        await body.press('ControlOrMeta+a');
        await body.press('Delete');
        if (text) {
            await body.fill(text);
            await expect(body).toContainText(text);
        }
        // Commit the editor content to the Vue form model (v-model syncs on
        // TinyMCE change events): without an explicit change, a Save racing
        // the input sync POSTs the field's stale value — 200 + "Saved"
        // toast, old content persisted (observed twice in the full-suite
        // gate on U40 S4: DB kept the seeded abstract). Same idiom as the
        // OJS setRichText helper, which has never exhibited the race.
        const id = this.controlId(formId, name, locale);
        await this.page.evaluate(
            // @ts-ignore tinymce is the page's global
            (fieldId) => window.tinymce?.get(fieldId)?.fire('change'),
            id
        );
    }

    /** Read a rich-text field's stored HTML through the TinyMCE API
     * (server-rendered values never reach the backing textarea —
     * patterns.md). */
    async readRichText(formId, name, locale = null) {
        const id = this.controlId(formId, name, locale);
        // Under load the editor can answer this read before its serializer
        // exists and getContent() throws a TypeError from inside TinyMCE
        // (ci-triage "A rich-text read thrown inside the editor under
        // load", U40 S2, three sightings): wait for the editor's
        // initialized flag and retry the read, bounded. A missing editor
        // still reads as undefined, as before.
        let lastError;
        for (let attempt = 0; attempt < 20; attempt++) {
            try {
                return await this.page.evaluate((fieldId) => {
                    // @ts-ignore tinymce is the page's global
                    const editor = window.tinymce?.get(fieldId);
                    if (!editor) return undefined;
                    if (!editor.initialized) throw new Error('editor not initialized');
                    return editor.getContent();
                }, id);
            } catch (error) {
                lastError = error;
                await this.page.waitForTimeout(500);
            }
        }
        throw lastError;
    }

    /** The field wrapper element around a control (label, description,
     * Override button live here). */
    fieldWrapper(formId, name, locale = null) {
        return this.page
            .locator('.pkpFormField')
            .filter({has: this.page.locator(`#${this.controlId(formId, name, locale)}`)});
    }

    /** A locked field's "Override" button (Rule 11). */
    overrideButton(formId, name, locale = null) {
        return this.fieldWrapper(formId, name, locale).getByRole('button', {
            name: 'Override',
            exact: true,
        });
    }

    /** The open page's Save button (one form per page — Rule 1). */
    saveButton() {
        return this.page.getByRole('button', {name: 'Save', exact: true});
    }

    /**
     * Save the open form, bounded by the publications API answering OK
     * (useFetch tunnels PUT via POST) and the "Saved" status appearing.
     */
    async save() {
        const saved = this.page.waitForResponse(
            (r) =>
                r.url().includes('/publications/') &&
                r.request().method() === 'POST' &&
                r.ok(),
            {timeout: 30_000}
        );
        await this.saveButton().click();
        const savedResponse = await saved;
        await expect(
            this.page.locator('[role="status"]', {hasText: 'Saved'}).first()
        ).toBeVisible({timeout: 30_000});
        // The saved publication JSON — callers can verify what actually
        // persisted (a late component refresh can remount the form and
        // revert an uncommitted editor value before Save serializes it,
        // making the save honestly persist the OLD content).
        return savedResponse;
    }

    /** A field's inline error ("This field is required.", "This is not a
     * valid URL.") — class `pkpFieldError` inside the field wrapper
     * (patterns.md locator pitfall 14). */
    fieldError(formId, name, locale = null) {
        return this.fieldWrapper(formId, name, locale).locator('.pkpFieldError');
    }

    /** The form's error summary ("Please correct one error." / "… {n}
     * errors."), rendered under the form after a refused save. */
    errorSummary() {
        return this.page.getByText(/Please correct (one|\d+) errors?\./);
    }

    /** The summary's "Go to {Field}: {message}" button for one field. */
    goToErrorButton(fieldLabel) {
        return this.page.getByRole('button', {name: new RegExp(`^Go to ${fieldLabel}`)});
    }

    /** The rich-text field's "Word Count: {n}/{limit}" readout (present
     * only when the section sets a limit — Rule 5). */
    wordLimit(formId, name, locale = null) {
        return this.fieldWrapper(formId, name, locale).locator(
            '.pkpFormField--richTextarea__wordLimit'
        );
    }

    /** The counter's error mark, an inline icon rendered only while the
     * count is over the limit (FieldRichTextarea `icon="Error"`). */
    wordLimitErrorMark(formId, name, locale = null) {
        return this.wordLimit(formId, name, locale).locator('svg');
    }

    /** The editorial banner on a published version's pages (Rule 8; the
     * "Warning:" prefix is a sibling element, so the sentence is matched). */
    publishedWarning() {
        return this.page.getByText(
            'This version has been published. Editing it may impact the published content.'
        );
    }

    /** The "Current Submission Language: {language}" readout (Rule 13a).
     * The label and the language name are sibling spans — return their
     * wrapping element so text assertions see both. */
    languageReadout() {
        return this.page
            .getByText('Current Submission Language:')
            .locator('xpath=..');
    }

    /** The readout's "Change" button. */
    changeLanguageButton() {
        return this.page.getByRole('button', {name: 'Change', exact: true});
    }

    /** The "Change Submission Language For" side panel (Rule 13b). */
    changeLanguagePanel() {
        return this.page
            .locator('[data-cy="active-modal"]')
            .filter({has: this.page.getByText('Change Submission Language For')});
    }
};

/**
 * Post the open workflow's preprint (live-probed 2026-08-28): the stage
 * screen's "Post the preprint" action navigates to the publication screen,
 * whose header carries the "Post" primary control (already there when a
 * publication page is open); "Post" opens the legacy "Post the preprint"
 * modal wrapping the OPS PublishForm ("All requirements have been met. Are
 * you sure you want to post this?"), whose submit button reads "Post".
 * Bounded by the publish API answering OK and the header's "Unpost"
 * control appearing.
 *
 * @param {import('@playwright/test').Page} page
 */
async function postPreprint(page) {
    const stageAction = page.getByRole('button', {
        name: 'Post the preprint',
        exact: true,
    });
    const postControl = page.getByRole('button', {name: 'Post', exact: true});
    await expect(stageAction.or(postControl).first()).toBeVisible({timeout: 30_000});
    if (await stageAction.isVisible()) {
        await stageAction.click();
    }
    await expect(postControl).toBeVisible({timeout: 30_000});
    await postControl.click();
    const confirm = page
        .getByRole('dialog')
        .filter({hasText: 'Are you sure you want to post this?'});
    await expect(confirm).toBeVisible({timeout: 30_000});
    const posted = page.waitForResponse(
        (r) => /\/publications\/\d+\/publish/.test(r.url()) && r.ok(),
        {timeout: 30_000}
    );
    await confirm.getByRole('button', {name: 'Post', exact: true}).last().click();
    await posted;
    await expect(
        page.getByRole('button', {name: 'Unpost', exact: true})
    ).toBeVisible({timeout: 30_000});
}

exports.postPreprint = postPreprint;

/**
 * Unpost the open workflow's posted preprint: a posted preprint's workflow
 * opens on its publication screen, whose header carries the "Unpost"
 * control; it opens a confirm dialog ("Are you sure you don't want this to
 * be posted?") whose confirming button also reads "Unpost". Once a second
 * version exists the workflow opens on the NEWEST version, whose header
 * offers no "Unpost": open the posted version by address first
 * (`openPublicationPage`), as U40 S3 does.
 *
 * @param {import('@playwright/test').Page} page
 */
async function unpostPreprint(page) {
    await page.getByRole('button', {name: 'Unpost', exact: true}).click();
    const dialog = page
        .getByRole('dialog')
        .filter({hasText: "Are you sure you don't want this to be posted?"});
    await expect(dialog).toBeVisible({timeout: 30_000});
    const unposted = page.waitForResponse(
        (r) => /\/publications\/\d+\/unpublish/.test(r.url()) && r.ok(),
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Unpost', exact: true}).last().click();
    await unposted;
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
}

exports.unpostPreprint = unpostPreprint;

/**
 * Save a Settings form's tab panel, bounded by the contexts API answering
 * OK (settings forms PUT via the tunneled POST).
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} panel the tab panel holding the form
 */
async function saveSettingsPanel(page, panel) {
    const saved = page.waitForResponse(
        (r) =>
            r.url().includes('/api/v1/contexts/') &&
            r.request().method() === 'POST' &&
            r.ok(),
        {timeout: 30_000}
    );
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    await saved;
}

exports.saveSettingsPanel = saveSettingsPanel;

/** The workflow header's status readout ("Status: Posted" / "Status:
 * Unpublished" …); `toContainText` is case-sensitive, so "Posted" never
 * false-matches "Unposted". */
function statusReadout(page) {
    return page.locator('[data-cy="workflow-controls-left"]');
}

exports.statusReadout = statusReadout;

/**
 * The "Relations" dropdown that ends the publication page's left control
 * region on a preprint server (U24 Rule 17, for the Moderator and the
 * Author alike; the OPS-only item of that region). Live 2026-09-13: a
 * `button` named "Relations" under `[data-cy="workflow-controls-left"]`.
 *
 * @param {import('@playwright/test').Page} page
 */
function relationsControl(page) {
    return page
        .locator('[data-cy="workflow-controls-left"]')
        .getByRole('button', {name: 'Relations', exact: true});
}

exports.relationsControl = relationsControl;

/**
 * Open the workflow straight onto ONE version's Publication page: the side
 * menu mirrors its selection into the `workflowMenuKey` query param
 * (useWorkflowMenu), so a specific version is reached by address without
 * walking the nested version tree. Arrival is judged on the page heading.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} contextPath
 * @param {number} submissionId
 * @param {number} publicationId the version's publication id
 * @param {{author?: boolean, entry?: string, heading?: string}} [options]
 *   `entry` is the menu key suffix (default `titleAbstract`), `heading`
 *   the page heading it opens on (default "Preprint: Title & Abstract")
 */
async function openPublicationPage(
    page,
    contextPath,
    submissionId,
    publicationId,
    {author = false, entry = 'titleAbstract', heading = 'Preprint: Title & Abstract'} = {}
) {
    const dashboard = author ? 'mySubmissions' : 'editorial';
    await page.goto(
        `/index.php/${contextPath}/dashboard/${dashboard}?workflowSubmissionId=${submissionId}&workflowMenuKey=publication_${publicationId}_${entry}`
    );
    await expect(page.getByRole('heading', {name: heading})).toBeVisible({
        timeout: 30_000,
    });
}

exports.openPublicationPage = openPublicationPage;

/**
 * "Create New Version" from the open workflow's Preprint group (the item
 * sits last in the group, offered to editorial roles only): its dialog is
 * anchored on its own version-source control and confirmed untouched
 * (source = the current version, "Minor Revision" — *Publish, schedule &
 * versions*). Bounded by the version POST answering OK; returns the new
 * publication JSON (its `id` addresses the new version's pages).
 *
 * @param {import('@playwright/test').Page} page
 */
async function createNewVersion(page) {
    await page.getByRole('link', {name: 'Create New Version', exact: true}).click();
    const dialog = page
        .getByRole('dialog')
        .filter({has: page.locator('#version-versionSource-control')});
    await expect(dialog.locator('#version-versionSource-control')).toBeVisible({
        timeout: 30_000,
    });
    const created = page.waitForResponse(
        (r) =>
            /\/publications\/\d+\/version/.test(r.url()) &&
            r.request().method() === 'POST' &&
            r.ok(),
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const publication = await (await created).json();
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
    return publication;
}

exports.createNewVersion = createNewVersion;

/**
 * Open a participant's "Edit Assignment" window from the open stage
 * screen's Participants panel ("{name} More Actions" › Edit). The workflow
 * panel is itself an active-modal, so the legacy window is scoped by its
 * own title text. Returns the window; its permission box is
 * `input[name="canChangeMetadata"]` ("Allow this person to make changes to
 * the publication…"), its Cancel is a link and its confirm reads "OK".
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} displayName the participant as the panel names them
 */
async function openEditAssignment(page, displayName) {
    await page.getByRole('button', {name: `${displayName} More Actions`}).click();
    await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const modal = page
        .locator('[data-cy="active-modal"]')
        .filter({hasText: 'Edit Assignment'});
    await expect(modal.getByText('Edit Assignment')).toBeVisible({timeout: 30_000});
    await waitForJQueryIdle(page);
    return modal;
}

exports.openEditAssignment = openEditAssignment;

/**
 * Set a participant's "Allow this person to make changes to the
 * publication…" box (Rule 2) through the open stage screen's "Edit
 * Assignment" window and press "OK". Bounded by the window closing and
 * the legacy grid settling.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} displayName the participant as the panel names them
 * @param {boolean} allowed the box's wanted state
 */
async function setEditAssignmentPermission(page, displayName, allowed) {
    const modal = await openEditAssignment(page, displayName);
    const box = modal.locator('input[name="canChangeMetadata"]');
    await expect(box).toBeVisible({timeout: 30_000});
    if (allowed) {
        await box.check();
    } else {
        await box.uncheck();
    }
    await modal.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(modal).toHaveCount(0, {timeout: 30_000});
    await waitForJQueryIdle(page);
}

exports.setEditAssignmentPermission = setEditAssignmentPermission;

/**
 * Watch the page for publication saves (the tunneled PUT: a POST to
 * `…/publications/{id}`), for "nothing is sent" claims: a refusal made in
 * the browser adds no entry, and the next accepted save adds one — the
 * positive control of the same watcher. `stop()` detaches the listener.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {{seen: string[], stop: () => void}}
 */
function watchPublicationSaves(page) {
    const seen = [];
    const listener = (request) => {
        if (request.method() === 'POST' && /\/publications\/\d+/.test(request.url())) {
            seen.push(request.url());
        }
    };
    page.on('request', listener);
    return {seen, stop: () => page.off('request', listener)};
}

exports.watchPublicationSaves = watchPublicationSaves;

/**
 * Open the workflow header's "Activity Log", count its "Submission
 * metadata updated" lines and close it again (Rule 4 / Side effects: one
 * line per accepted save, none for a refusal). The grid is read once its
 * rows have landed (a seeded submission always carries its submit lines).
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
async function metadataUpdatedLogCount(page) {
    await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
    const logModal = page.locator('[data-cy="active-modal"]').last();
    await expect(logModal.getByText('Activity Log & Notes')).toBeVisible({timeout: 30_000});
    await waitForJQueryIdle(page);
    await expect(logModal.locator('tr.gridRow').first()).toBeVisible({timeout: 30_000});
    const count = await logModal.getByText('Submission metadata updated').count();
    await logModal.getByRole('button', {name: 'Close'}).first().click();
    // The workflow panel is itself an active-modal, so the log's closing
    // is judged on its own title leaving.
    await expect(page.getByText('Activity Log & Notes')).toHaveCount(0, {timeout: 30_000});
    return count;
}

exports.metadataUpdatedLogCount = metadataUpdatedLogCount;

/**
 * Open the workflow header's "Activity Log", read its row count and its
 * "Submission metadata updated" count, and close it again: the "no new
 * entry" reads of U41 (a contributor add, edit or delete writes nothing;
 * "Set Primary Contact" writes one "Submission metadata updated" line, the
 * positive control). Same opener as `metadataUpdatedLogCount`; added
 * 2026-09-16.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{rows: number, metadataUpdated: number}>}
 */
async function activityLogCounts(page) {
    await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
    const logModal = page.locator('[data-cy="active-modal"]').last();
    await expect(logModal.getByText('Activity Log & Notes')).toBeVisible({timeout: 30_000});
    await waitForJQueryIdle(page);
    await expect(logModal.locator('tr.gridRow').first()).toBeVisible({timeout: 30_000});
    const rows = await logModal.locator('tr.gridRow').count();
    const metadataUpdated = await logModal.getByText('Submission metadata updated').count();
    await logModal.getByRole('button', {name: 'Close'}).first().click();
    await expect(page.getByText('Activity Log & Notes')).toHaveCount(0, {timeout: 30_000});
    return {rows, metadataUpdated};
}

exports.activityLogCounts = activityLogCounts;

/**
 * Add a discussion from the open stage screen's "Production Tasks &
 * Discussions" panel: a "Name", the listed participants' boxes (the
 * creator's own box arrives ticked; the form refuses a save with fewer
 * than two, "At least two participants are required for a discussion.",
 * so at least one other is named; every other participant is left as it
 * is), a message, "Save" (`POST …/submissions/{id}/tasks`). Each ticked
 * participant, the creator included, receives the discussion email, which
 * is the mail this suite causes as the positive control of its Mailpit
 * absence reads (PRINCIPLES A8; U05's form, verified there).
 *
 * @param {import('@playwright/test').Page} page
 * @param {{name: string, message: string, participants: string[]}} options
 *   `participants`: usernames whose boxes are ticked besides the creator's
 */
async function addDiscussion(page, {name, message, participants}) {
    const panel = page.locator('[data-cy="discussion-manager"]').first();
    await expect(
        panel.getByRole('heading', {name: 'Production Tasks & Discussions'})
    ).toBeVisible({timeout: 30_000});
    await panel.getByRole('button', {name: 'Add', exact: true}).click();
    const modal = page
        .locator('[data-cy="active-modal"]')
        .filter({has: page.locator('input[name="title"]')});
    await modal.locator('input[name="title"]').fill(name);
    for (const username of participants) {
        const box = modal.getByRole('checkbox', {name: new RegExp(username)});
        await expect(box).toBeVisible({timeout: 30_000});
        await box.check();
    }
    const body = modal.frameLocator('iframe').first().locator('body');
    await body.click();
    await body.fill(message);
    const saved = page.waitForResponse(
        (r) => r.request().method() === 'POST' && /\/submissions\/\d+\/tasks$/.test(r.url()),
        {timeout: 30_000}
    );
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    const response = await saved;
    expect(response.ok(), `discussion save answered ${response.status()}`).toBe(true);
    await expect(modal).toHaveCount(0, {timeout: 30_000});
}

exports.addDiscussion = addDiscussion;

/**
 * The mailbox's positive control (PRINCIPLES A8) on state no other test
 * reads: a scratch server of its own (`{tag}mc`) with a throwaway Preprint
 * Server Manager and a spare Author; the manager opens a discussion on the
 * spare's preprint with the spare's box ticked (`addDiscussion`), whose
 * copy reaches the spare. Returns the `afterControl` for
 * `pkpMail.expectNone`. The roster stays out of it on purpose: a
 * discussion leaves every ticked participant, its creator included, an
 * unread Tasks item (lib/pkp `EditorialTaskController` NEW_QUERY), and
 * *Navigation menus & site chrome* S2 reads `manager.maya`'s Tasks number
 * on the seeded server (flake-s26 fixAD).
 *
 * @param {{asUser: (username: string) => Promise<import('@playwright/test').BrowserContext>, api: any, tag: string}} options
 *   `api`: the suite's `opsApi`; `tag`: the test's own seed tag
 * @returns {Promise<{to: string, subject: string}>}
 */
async function sendMailControl({asUser, api, tag}) {
    const control = `${tag}mc`;
    const manager = `${control}mg`;
    const spare = `${control}x`;
    await api.createContext({
        tag: control,
        users: [
            {username: manager, givenName: 'Mona', familyName: 'Manager', email: `${manager}@mail.test`, roles: ['manager']},
            {username: spare, givenName: 'Xena', familyName: 'Spare', email: `${spare}@mail.test`, roles: ['author']},
        ],
    });
    const {submissionId} = await api.createSubmission({tag: control, context: control, submitter: spare, title: `Preprint ${control}`});
    const page = await (await asUser(manager)).newPage();
    const discussion = `Control ${tag}`;
    await openWorkflow(page, control, submissionId);
    await new exports.PublicationScreen(page).openProductionStage();
    await addDiscussion(page, {name: discussion, message: `Control message ${tag}.`, participants: [spare]});
    await page.close();
    return {to: `${spare}@mail.test`, subject: discussion};
}

exports.sendMailControl = sendMailControl;

/**
 * The landing page's "License" block (`.item.copyright`, Rule 15): the
 * "License" heading, then with a Creative Commons address the
 * "Copyright (c) {year} {holder}" line and the badge, with any other
 * address a link labelled with the statement (or "License"), and the
 * server's License Terms last.
 *
 * @param {import('@playwright/test').Page} page
 */
function licenseBlock(page) {
    return page.locator('.item.copyright');
}

exports.licenseBlock = licenseBlock;

/**
 * Assert `first` comes before `second` in document order (an "after
 * Abstract" field, a "Data Availability Statement" block above the
 * "Funding Statement" one). Both locators must resolve to one element.
 *
 * @param {import('@playwright/test').Locator} first
 * @param {import('@playwright/test').Locator} second
 */
async function expectPrecedes(first, second) {
    await expect(first).toBeVisible({timeout: 30_000});
    await expect(second).toBeVisible({timeout: 30_000});
    const follows = await first.evaluate(
        (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING),
        await second.elementHandle()
    );
    expect(follows, 'the first element precedes the second').toBe(true);
}

exports.expectPrecedes = expectPrecedes;

/**
 * The preprint page's date block ("Posted {date}"; after a later version
 * "{date} — Updated on {date}" — `submission.updatedOn`): `.item.published`
 * of templates/frontend/objects/preprint_details.tpl, rendered only once
 * the shown version carries a date. Read on a signed-out page.
 *
 * @param {import('@playwright/test').Page} page
 */
function preprintDateLine(page) {
    return page.locator('.item.published');
}

exports.preprintDateLine = preprintDateLine;

/**
 * The preprint page's "Versions" list (`.sub_item.versions` inside the
 * date block): one "{date} ({version})" entry per POSTED version, newest
 * first; an unposted draft adds nothing to it.
 *
 * @param {import('@playwright/test').Page} page
 */
function preprintVersionsList(page) {
    return page.locator('.sub_item.versions');
}

exports.preprintVersionsList = preprintVersionsList;

/**
 * As the signed-in user, switch off the email of Profile › Notifications ›
 * "Submission Events" row "A new version of your submission, "Title", was
 * published." and save the tab through its own "Save" (the
 * `…/profile-tab/save-notification-settings` POST). The row's second box
 * reads "Do not send me an email for these types of notifications."
 * (`emailNotificationPublicationPublished`): it arrives UNTICKED and the
 * opt-out is TICKING it (the form stores the ticked ones as
 * `blocked_emailed_notification`; live 2026-09-16, the U49 OPS run's
 * T-ops-1). The task notice is untouched by it (the "Enable these types of
 * notifications." box stays ticked). Reopens the tab and asserts the box
 * stayed ticked. Shared users are never brought here (PRINCIPLES A7): a
 * throwaway account on a scratch server only.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} contextPath
 */
async function switchOffPublishedEmail(page, contextPath) {
    const {ProfilePage} = require('../../../../shared/playwright/pages/ProfilePage.js');
    const profile = new ProfilePage(page, contextPath);
    await profile.goto('notifications');
    const pair = profile.notificationPair('notificationPublicationPublished');
    await expect(pair.allow).toBeChecked({timeout: 30_000});
    await expect(pair.email).not.toBeChecked();
    await pair.email.check();
    await profile.save();
    await profile.goto('notifications');
    await expect(pair.allow).toBeChecked({timeout: 30_000});
    await expect(pair.email).toBeChecked();
}

exports.switchOffPublishedEmail = switchOffPublishedEmail;
