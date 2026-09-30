// @ts-check
/**
 * @file playwright/tests/U40-publication-metadata.spec.js
 *
 * Publication metadata — OMP suite: one test per canonical scenario the
 * spec runs on a press (S1–S8 and S12 common, S10 press-only; S9 is the
 * journal's issue-year scenario and S11 the preprint server's wizard
 * license), in the press's own vocabulary: Press Manager, monograph,
 * catalog book page, series not sections. The press markers ride inside
 * the common tests: no abstract policy or word counter (OMP2, S1), the
 * copyright line printed outside the License block on the book page and
 * the "License" label on a non-CC link (OMP1, S5/S7), the terms-without-
 * license block asserted as the scenario's own sentence (OMP5, S5), the
 * language-change panel asking for the title only (Rule 13b's press leg,
 * S6), the press's own reset-confirm wording asserted only as "not the
 * journal's sentence" (OMP3, S7) and the Edited Volume's chapter field
 * (OMP4, S10). S2's word-limit and no-abstract bullets are {OJS OPS} and
 * do not run here; S12's participant is the press's Copyeditor.
 * Spec: docs/specs/U40-publication-metadata.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 🐞,
 * A2 🐞 (journal/preprint-only; the press's year is asserted as the
 * scenario's own sentence), A13 🐞 (S7's Cancel asserts only that nothing
 * was reset and reloads before pressing again), OJS1 🐞 (journal-only),
 * OMP5 🐞 (S5 asserts the scenario's sentence, never where the link
 * leads), A3 ❓ (S7 asserts the scenario's own sentence on the unpublished
 * and declined items), A5 ❓, A6 ❓, A8 ❓ (a read-only page's fields are
 * asserted typeable only as the scenario's own sentence), A10 ✅ retired 2026-09-21, A11 ❓
 * (S5 matches the contributor's name inside the holder sentence, not the
 * role suffix), A12 ❓, A14 ❓ (journal/preprint-only), A15 ❓, A17 ❓, OMP3 ❓,
 * OPS2 ❓. The spec's Coverage section records everything else left out.
 *
 * Seeding: scenario endpoints only. S3, S4 and S12 run on the seeded press
 * with the ready accounts and only add their own tagged submissions; every
 * other test seeds its own scratch press with throwaway users whose
 * addresses carry app + test (u40omps1w0…@mail.test), because it changes
 * press settings, rewrites every submission in the press, or reads a
 * mailbox (S1's mailbox silence needs a throwaway submitter, footnote s1,
 * so S1 runs on a scratch press). publicknowledge and the 18 seeded users
 * are never changed (A1, A7). Every absence is a settled read paired with a
 * positive control taken the same way; a mailbox silence is bounded by a
 * discussion email the test itself sends to a second throwaway account
 * (A8, `pkpMail.expectNone`). Waits are event-based (publication/context
 * API responses, the form footer's "Saved" status, web-first assertions) —
 * no hard-coded sleeps. Everything runs in the parallel `omp` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {unpublishFromWorkflow: unpublishDialog} = require('../pages/PublicationPages.js');
const {waitForEditorReady} = require('../../../../shared/playwright/support/richtext.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {
    TasksPanel,
    DISCUSSION_TASK,
} = require('../../../../shared/playwright/pages/NotificationsPages.js');

const PK = 'publicknowledge';
const PK_PREFIX = '/en';
const CC_BY = 'https://creativecommons.org/licenses/by/4.0';
const CC_BY_SA = 'https://creativecommons.org/licenses/by-sa/4.0';
const CC_BY_SENTENCE =
    'This work is licensed under a Creative Commons Attribution 4.0 International License.';
const PUBLISHED_WARNING =
    'Warning: This version has been published. Editing it may impact the published content.';
const PUBLISHED_LOCK = 'This version has been published and can not be edited.';
const METADATA_UPDATED = 'Submission metadata updated';
/** The journal's and preprint server's reset confirm sentence (Rule 14). */
const JOURNAL_RESET_CONFIRM =
    'Are you sure you wish to reset permissions data for all articles? This action can not be undone.';

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u40omp${scenario}w${testInfo.parallelIndex}${Math.random()
        .toString(36)
        .slice(2, 8)}`;
}

/** A throwaway user spec for `createContext`; its address names app + test. */
function scratchUser(tag, suffix, givenName, familyName, roles) {
    const username = `${tag}${suffix}`;
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/**
 * Open a monograph's workflow view (editorial or author dashboard) and wait
 * for the Publication group to render.
 */
async function openWorkflow(page, contextPath, submissionId, {author = false} = {}) {
    const dashboard = author ? 'mySubmissions' : 'editorial';
    await page.goto(
        `/index.php/${contextPath}/dashboard/${dashboard}?workflowSubmissionId=${submissionId}`
    );
    await expect(
        page.getByRole('link', {name: 'Publication', exact: true})
    ).toBeVisible({timeout: 30_000});
}

/** From an open workflow view, open a stage screen and wait for its heading. */
async function openStage(page, label) {
    await page.getByRole('link', {name: label, exact: true}).click();
    await expect(
        page.getByRole('heading', {name: `Workflow: ${label}`})
    ).toBeVisible({timeout: 30_000});
}

/**
 * From an open workflow view, open one of the Publication group's pages and
 * wait for its "Publication: {entry}" heading. The group is expanded by
 * default — clicking "Publication" would collapse it, so it is only clicked
 * when the entry is hidden. With two versions both expanded the entry link
 * exists once per version: pass the version's label to scope the click.
 */
async function openPublicationPage(page, entry, {version = null} = {}) {
    const scope = version
        ? page.getByRole('treeitem', {name: version, exact: true})
        : page;
    const link = scope.getByRole('link', {name: entry, exact: true});
    // The menu draws in one pass once the submission is in: read the entry
    // only then, or the "Publication" toggle below folds an open group shut
    // (.reports/flake-s26/fixC/diagnosis.md).
    await expect(link.or(page.getByRole('link', {name: 'Publication', exact: true})).first()).toBeVisible({timeout: 30_000});
    if (!(await link.isVisible())) {
        await page.getByRole('link', {name: 'Publication', exact: true}).click();
    }
    await link.click();
    await expect(
        page.getByRole('heading', {name: `Publication: ${entry}`})
    ).toBeVisible({timeout: 30_000});
}

/** A form field's container, located by its (primary) label text. */
function field(page, labelRe) {
    return page
        .locator('.pkpFormField')
        .filter({has: page.locator('label.pkpFormFieldLabel').filter({hasText: labelRe})});
}

/** The TinyMCE body of a rich-text field (first = submission-language column). */
function richBody(page, labelRe) {
    return field(page, labelRe).frameLocator('iframe').first().locator('body');
}

/** The Prefix box (submission-language column). */
function prefixInput(page) {
    return field(page, /^Prefix/).locator('input').first();
}

/** The publication form's Save button (the only page-level Save). */
function saveButton(page) {
    return page.getByRole('button', {name: 'Save', exact: true});
}

/** The "Current Submission Language: {language}" readout. */
function languageReadout(page, language) {
    return page.getByText(`Current Submission Language: ${language}`);
}

/** The readout's "Change" button (Rule 13a). */
function changeButton(page) {
    return page.getByRole('button', {name: 'Change', exact: true});
}

/** The language panel's Title editor (TinyMCE id). */
const LANGUAGE_PANEL_TITLE_EDITOR = 'changeSubmissionLanguageMetadata-title-control';

/**
 * Press "Change" and return the "Change Submission Language For" panel
 * settled. The panel runs two fetches as it opens: its form
 * (`changeLanguageMetadata`) and the publication, whose texts a language
 * pick copies into the revealed boxes. A pick made before the publication
 * lands keeps the current language's title in the Title box, and a
 * Confirm then sends it as the new language's title (A15, app-changes
 * row 6; the U40 S6 flake, 2026-09-30). So the open waits for both: the
 * form's answer, and the panel's subtitle, which renders the
 * publication's title from that same fetch (the OJS page object's
 * `openChangeLanguagePanel` gate).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} title the item's current title, the panel's subtitle
 */
async function openLanguagePanel(page, title) {
    const formLoaded = page.waitForResponse(
        (r) => r.url().includes('changeLanguageMetadata') && r.ok(),
        {timeout: 30_000}
    );
    await changeButton(page).click();
    const panel = page.getByRole('dialog', {name: /Change Submission Language/});
    await expect(panel).toBeVisible({timeout: 30_000});
    await expect(panel.getByText(title)).toBeVisible({timeout: 30_000});
    await formLoaded;
    return panel;
}

/**
 * Press Save on a publication page's form, bounded by the publications API
 * answering OK (useFetch tunnels PUT via POST) and the footer's "Saved"
 * status appearing.
 */
async function savePublicationForm(page) {
    const saved = page.waitForResponse(
        (r) =>
            /\/submissions\/\d+\/publications\/\d+/.test(r.url()) &&
            r.request().method() === 'POST' &&
            r.ok(),
        {timeout: 30_000}
    );
    await saveButton(page).click();
    await saved;
    await expect(
        page.locator('.pkpFormPage__status', {hasText: 'Saved'})
    ).toBeVisible({timeout: 30_000});
}

/**
 * Open the header's "Activity Log" window and return its rows carrying
 * `text` (the caller counts or reads them, then closes the window).
 */
async function activityLogRows(page, text) {
    await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
    const log = page.getByRole('dialog', {name: /Activity Log/});
    await expect(log.getByText('Event', {exact: true})).toBeVisible({timeout: 30_000});
    return log.getByRole('row').filter({hasText: text});
}

/** Open Settings › Workflow › Metadata on a scratch press. */
async function openMetadataSettings(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/management/settings/workflow`);
    await page.locator('#metadata-button').click();
    await expect(
        page.getByRole('checkbox', {name: 'Enable keyword metadata'})
    ).toBeVisible({timeout: 30_000});
}

/** Save a settings form, bounded by the contexts API answering OK. */
async function saveSettingsForm(page, form) {
    const saved = page.waitForResponse(
        (r) =>
            r.url().includes('/api/v1/contexts/') &&
            r.request().method() === 'POST' &&
            r.ok(),
        {timeout: 30_000}
    );
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    await saved;
}

/** The metadata settings form (scoped by a checkbox it always carries). */
function metadataSettingsForm(page) {
    return page
        .locator('form')
        .filter({has: page.getByRole('checkbox', {name: 'Enable keyword metadata'})});
}

/**
 * Set the press's Settings › Distribution › License form: copyright holder
 * radio, license radio, and optionally License Terms.
 */
async function setLicenseSettings(page, contextPath, {holder, license, terms} = {}) {
    await page.goto(`/index.php/${contextPath}/management/settings/distribution`);
    await page.locator('#license-button').click();
    const form = page.locator('form').filter({
        has: page.getByRole('radio', {name: 'CC Attribution 4.0', exact: true}),
    });
    await expect(form).toBeVisible({timeout: 30_000});
    if (holder) {
        await form.getByRole('radio', {name: holder, exact: true}).check();
    }
    if (license) {
        await form.getByRole('radio', {name: license, exact: true}).check();
    }
    if (terms) {
        const termsBody = form.frameLocator('iframe').first().locator('body');
        await termsBody.click();
        await termsBody.fill(terms);
    }
    await saveSettingsForm(page, form);
}

/**
 * Publish the open workflow's current publication through the "Publish"
 * header action and its "Schedule For Publication" modal; resolved when the
 * workflow shows the published state (Unpublish offered).
 */
async function publishFromWorkflow(page) {
    await page.getByRole('button', {name: 'Publish', exact: true}).click();
    const modal = page.getByRole('dialog', {name: /Schedule For Publication/});
    await expect(modal).toBeVisible({timeout: 30_000});
    const published = page.waitForResponse(
        (r) => r.url().includes('/publish') && r.ok(),
        {timeout: 30_000}
    );
    await modal.getByRole('button', {name: 'Publish', exact: true}).click();
    await published;
    await expect(
        page.getByRole('button', {name: 'Unpublish', exact: true})
    ).toBeVisible({timeout: 30_000});
}

/**
 * Unpublish the open workflow's current publication (the shared page
 * object's dialog), resolved once the header offers "Publish" again.
 */
async function unpublishFromWorkflow(page) {
    await unpublishDialog(page);
    await expect(
        page.getByRole('button', {name: 'Publish', exact: true})
    ).toBeVisible({timeout: 30_000});
}

/** The workflowMenuKey suffix of a Publication page. */
const PAGE_KEYS = {'Title & Abstract': 'titleAbstract', Metadata: 'metadata'};

/**
 * Open one version's Publication page straight by address, through the
 * app's own workflowMenuKey parameter (`publication_{publicationId}_{page}`),
 * so a submission with two versions lands on the intended one; resolved on
 * the page heading AND the form's Save button, which renders after its own
 * fetch (a Save read straight after the heading is still absent).
 */
async function openVersionPage(
    page,
    contextPath,
    submissionId,
    publicationId,
    {author = false, entry = 'Title & Abstract'} = {}
) {
    const dashboard = author ? 'mySubmissions' : 'editorial';
    await page.goto(
        `/index.php/${contextPath}/dashboard/${dashboard}?workflowSubmissionId=${submissionId}&workflowMenuKey=publication_${publicationId}_${PAGE_KEYS[entry]}`
    );
    await expect(
        page.getByRole('heading', {name: `Publication: ${entry}`})
    ).toBeVisible({timeout: 30_000});
    await expect(saveButton(page)).toBeVisible({timeout: 30_000});
}

/** The Publication head's status readout ("Status:" + state label). */
function statusReadout(page) {
    return page.locator('div:has(> span:text-is("Status:"))');
}

/**
 * "Create New Version" from the open workflow's Publication group, confirmed
 * untouched (Rule 9's editor step; the dialog's answers belong to *Publish,
 * schedule & versions*). Returns the new publication's id from the app's
 * own POST …/version response.
 */
async function createNewVersionFromWorkflow(page) {
    const item = await new WorkflowPage(page, null).revealPublicationEntry('Create New Version');
    await item.click();
    const dialog = page.getByRole('dialog', {name: 'Create New Version'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    await expect(dialog.getByLabel('Publication Stage')).toBeVisible({timeout: 30_000});
    const created = page.waitForResponse(
        (r) =>
            /\/publications\/\d+\/version/.test(r.url()) &&
            r.request().method() === 'POST' &&
            r.ok(),
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const body = await (await created).json();
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
    return body.id;
}

/**
 * From an open workflow view, open a stage's Participants panel (Production
 * unless `stage` names another) and the named participant's "Edit
 * Assignment" window. Returns the window and its "Allow this person to make
 * changes to the publication…" box; the caller ticks + OK, or reads +
 * Cancel (a link, pitfall 7).
 */
async function openEditAssignment(page, displayName, {stage = 'Production'} = {}) {
    await openStage(page, stage);
    await page.getByRole('button', {name: new RegExp(`${displayName} More Actions`)}).click();
    await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Edit Assignment'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    const permissionBox = dialog.getByRole('checkbox', {
        name: /Allow this person to make changes to the publication/,
    });
    await expect(permissionBox).toBeVisible({timeout: 30_000});
    return {dialog, permissionBox};
}

/** Tick or untick the assignment's permission box and press OK. */
async function setAssignmentPermission(assignment, on) {
    if (on) {
        await assignment.permissionBox.check();
    } else {
        await assignment.permissionBox.uncheck();
    }
    await assignment.dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await expect(assignment.dialog).toHaveCount(0, {timeout: 30_000});
}

/** Close the "Edit Assignment" window without saving (its Cancel is a link). */
async function cancelEditAssignment(assignment) {
    await assignment.dialog.getByRole('link', {name: 'Cancel', exact: true}).click();
    await expect(assignment.dialog).toHaveCount(0, {timeout: 30_000});
}

/**
 * On the open stage screen, "Add" a discussion in its "… Tasks & Discussions"
 * panel with one participant ticked (the creator's own box arrives ticked)
 * and a message, bounded by the tasks POST. The app emails the ticked
 * participant, which is what the mailbox and Tasks-bell controls use.
 */
async function addDiscussion(page, {name, participantUsername, message}) {
    const panel = page.locator('[data-cy="discussion-manager"]').first();
    await expect(panel.getByRole('heading', {name: /Tasks & Discussions$/})).toBeVisible({
        timeout: 30_000,
    });
    await panel.getByRole('button', {name: 'Add', exact: true}).click();
    const modal = page
        .locator('[data-cy="active-modal"]')
        .filter({has: page.locator('input[name="title"]')});
    await modal.locator('input[name="title"]').fill(name);
    const participantBox = modal.getByRole('checkbox', {name: new RegExp(participantUsername)});
    await expect(participantBox).toBeVisible({timeout: 30_000});
    await participantBox.check();
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

/** The catalog book page URL (publicknowledge is bilingual → /en prefix). */
function bookUrl(contextPath, submissionId) {
    const prefix = contextPath === PK ? PK_PREFIX : '';
    return `/index.php/${contextPath}${prefix}/catalog/book/${submissionId}`;
}

/** The book page's own copyright line and License block (OMP1). */
function copyrightLine(page) {
    return page.locator('.item.copyright');
}
function licenseBlock(page) {
    return page.locator('.item.license');
}

// Traces are kept for this file's failures (docs/tracking/ci-triage.md flake
// watch, 2026-09-15): it holds the hottest single flake on CI, and the option
// is worker-scoped, so it cannot sit on the one test.
test.use({trace: 'retain-on-failure'});

test.describe('Publication metadata (U40)', () => {
    test('S1: edit the title and abstract (press: no abstract policy)', {tag: '@smoke'}, async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const author = scratchUser(tag, 'au', 'Ada', 'Author', ['author']);
        const other = scratchUser(tag, 'b', 'Bea', 'Author', ['author']);
        await ompApi.createContext({
            tag,
            users: [scratchUser(tag, 'mg', 'Mona', 'Manager', ['manager']), author, other],
        });
        const [{submissionId}, otherSubmission] = await Promise.all([
            ompApi.createSubmission({
                tag: `${tag}s`,
                context: tag,
                submitter: author.username,
                title: `Submission ${tag}`,
            }),
            ompApi.createSubmission({
                tag: `${tag}b`,
                context: tag,
                submitter: other.username,
                title: `Other ${tag}`,
            }),
        ]);
        const revisedAbstract = 'Revised abstract.';

        const page = await (await asUser(`${tag}mg`)).newPage();
        await openWorkflow(page, tag, submissionId);
        await openPublicationPage(page, 'Title & Abstract');

        // The page's fixed furniture: Prefix with its guidance, Title,
        // Subtitle, Abstract prefilled with what the author entered.
        await expect(page.getByText('Examples: A, The')).toBeVisible();
        await expect(prefixInput(page)).toBeVisible();
        await expect(field(page, /^Subtitle/)).toBeVisible();
        await expect(richBody(page, /^Title\b/)).toContainText(`Submission ${tag}`);
        await expect(richBody(page, /^Abstract/)).toContainText(`Seeded abstract for ${tag}s.`);

        // The save: prefix, subtitle, the title italicized through the
        // "Formatting" menu that appears once the editor has focus (its
        // options portal to the document root as a toolbar carrying
        // Underline, unlike the Abstract's own toolbar), the abstract
        // replaced. A press shows no word counter (OMP2).
        await prefixInput(page).fill('The');
        const subtitleBody = richBody(page, /^Subtitle/);
        await subtitleBody.click();
        await subtitleBody.fill('A field note');
        const titleBody = richBody(page, /^Title\b/);
        await titleBody.click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.getByRole('button', {name: 'Formatting'}).click();
        const formatMenu = page
            .locator('[role="toolbar"]')
            .filter({has: page.getByRole('button', {name: 'Underline', exact: true})});
        await formatMenu.getByRole('button', {name: 'Italic', exact: true}).click();
        const abstractBody = richBody(page, /^Abstract/);
        await abstractBody.click();
        await abstractBody.fill(revisedAbstract);
        await expect(field(page, /^Abstract/).getByText(/Word Count:/)).toHaveCount(0);
        await savePublicationForm(page);

        // An empty Title is refused in the browser: summary + field
        // message; nothing is sent (the log control below counts).
        await titleBody.click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Delete');
        await saveButton(page).click();
        await expect(page.getByText('Please correct one error.')).toBeVisible({
            timeout: 30_000,
        });
        await expect(
            page.getByRole('button', {name: /^Go to Title: This field is required\./})
        ).toBeVisible();
        await expect(page.getByRole('button', {name: 'Jump to next error'})).toBeVisible();
        await expect(field(page, /^Title\b/).getByText('This field is required.')).toBeVisible();

        // An empty Abstract: restored title (retyped and italicized again:
        // a plain retype loses the formatting the reload below reads),
        // cleared abstract, Save — a press applies no abstract requirement,
        // so the footer reads "Saved" (OMP2, the scenario's own sentence).
        await titleBody.click();
        await titleBody.fill(`Submission ${tag}`);
        await page.keyboard.press('ControlOrMeta+a');
        await page.getByRole('button', {name: 'Formatting'}).click();
        await formatMenu.getByRole('button', {name: 'Italic', exact: true}).click();
        await abstractBody.click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Delete');
        await savePublicationForm(page);

        // After a reload: the abstract restored and saved, everything as
        // saved; the title's italics survived.
        await abstractBody.click();
        await abstractBody.fill(revisedAbstract);
        await savePublicationForm(page);
        await openWorkflow(page, tag, submissionId);
        await openPublicationPage(page, 'Title & Abstract');
        await expect(prefixInput(page)).toHaveValue('The');
        await expect(richBody(page, /^Subtitle/)).toContainText('A field note');
        await expect(richBody(page, /^Abstract/)).toContainText(revisedAbstract);
        await expect(richBody(page, /^Title\b/).locator('i')).toContainText(
            `Submission ${tag}`
        );

        // The dashboard list renders the full title with the prefix (the
        // side-nav global search flips to the cross-status Search Results
        // view; search commits on Enter only).
        await page.goto(`/index.php/${tag}/dashboard/editorial`);
        const search = page
            .getByRole('navigation', {name: 'Site Navigation'})
            .getByRole('searchbox')
            .first();
        await search.fill(tag);
        await search.press('Enter');
        await expect(page.getByText(`The Submission ${tag}`).first()).toBeVisible({
            timeout: 30_000,
        });

        // The log: a new "Submission metadata updated" line.
        await openWorkflow(page, tag, submissionId);
        const logRows = await activityLogRows(page, METADATA_UPDATED);
        await expect(logRows.first()).toBeVisible({timeout: 30_000});

        // Control: the refused save wrote nothing — one line attributed to
        // the saving manager per "Saved" (three), none for the refusal (the
        // seeded wizard walk's own lines carry the submitter's name).
        await expect(logRows.filter({hasText: 'Mona Manager'})).toHaveCount(3);
        await expect(logRows.filter({hasText: 'Ada Author'})).toHaveCount(
            (await logRows.count()) - 3
        );

        // The mailbox: nothing arrived for the submission's Author from the
        // saves, bounded by a discussion email this test sends to the
        // other author on their own monograph (A8).
        const discussion = `Control ${tag}`;
        await openWorkflow(page, tag, otherSubmission.submissionId);
        await addDiscussion(page, {
            name: discussion,
            participantUsername: other.username,
            message: `Control message ${tag}.`,
        });
        await pkpMail.expectNone({
            to: author.email,
            afterControl: {to: other.email, subject: discussion},
        });
    });

    test('S2: the Metadata page mirrors the press\'s metadata setup', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        await ompApi.createContext({
            tag,
            users: [
                scratchUser(tag, 'mg', 'Mona', 'Manager', ['manager']),
                scratchUser(tag, 'au', 'Ada', 'Author', ['author']),
            ],
        });
        const {submissionId} = await ompApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: `${tag}au`,
            title: `Submission ${tag}`,
        });

        const page = await (await asUser(`${tag}mg`)).newPage();

        // Control: on a fresh press the Metadata page shows "Keywords"
        // (enabled by install default) with a Save button.
        await openWorkflow(page, tag, submissionId);
        await openPublicationPage(page, 'Metadata');
        await expect(field(page, /^Keywords/)).toBeVisible();
        await expect(saveButton(page)).toBeVisible();

        // Untick every enabled "Enable … metadata" box and save.
        await openMetadataSettings(page, tag);
        const form = metadataSettingsForm(page);
        const checkedBoxes = form.locator('input[type="checkbox"]:checked');
        for (let i = 0; (await checkedBoxes.count()) > 0 && i < 25; i++) {
            await checkedBoxes.first().uncheck();
        }
        await expect(checkedBoxes).toHaveCount(0);
        await saveSettingsForm(page, form);

        // With nothing enabled the Metadata page is the empty message with
        // no Save button.
        await openWorkflow(page, tag, submissionId);
        await openPublicationPage(page, 'Metadata');
        await expect(
            page.getByText('No metadata fields are currently enabled.')
        ).toBeVisible();
        await expect(saveButton(page)).toHaveCount(0);

        // Enable Keywords and Coverage: the page shows exactly those.
        await openMetadataSettings(page, tag);
        await form.getByRole('checkbox', {name: 'Enable keyword metadata'}).check();
        await form.getByRole('checkbox', {name: 'Enable coverage metadata'}).check();
        await saveSettingsForm(page, form);

        await openWorkflow(page, tag, submissionId);
        await openPublicationPage(page, 'Metadata');
        await expect(field(page, /^Keywords/)).toBeVisible();
        await expect(field(page, /^Coverage/)).toBeVisible();
        await expect(field(page, /^Subjects/)).toHaveCount(0);
        await expect(field(page, /^Source/)).toHaveCount(0);

        // Keywords are chips: Enter adds, "Remove {term}" removes; a term
        // nobody used before is accepted as typed.
        const keywordInput = field(page, /^Keywords/)
            .locator('input.pkpAutosuggest__input')
            .first();
        await keywordInput.click();
        await keywordInput.fill('ocean acidification');
        await keywordInput.press('Enter');
        const removeChip = page.getByRole('button', {name: 'Remove ocean acidification'});
        await expect(removeChip).toBeVisible();
        await removeChip.click();
        await expect(removeChip).toHaveCount(0);
        await keywordInput.fill('ocean acidification');
        await keywordInput.press('Enter');
        await keywordInput.fill(`benthic flux ${tag}`);
        await keywordInput.press('Enter');
        await expect(page.getByRole('button', {name: `Remove benthic flux ${tag}`})).toBeVisible();
        await field(page, /^Coverage/).locator('input').first().fill('Pacific, 2020s');
        await savePublicationForm(page);

        // Reload: both chips and the coverage value are there.
        await openWorkflow(page, tag, submissionId);
        await openPublicationPage(page, 'Metadata');
        await expect(
            page.getByRole('button', {name: 'Remove ocean acidification'})
        ).toBeVisible({timeout: 30_000});
        await expect(page.getByRole('button', {name: `Remove benthic flux ${tag}`})).toBeVisible();
        await expect(field(page, /^Coverage/).locator('input').first()).toHaveValue(
            'Pacific, 2020s'
        );

        // Disabling Coverage hides the field but keeps the value; on
        // re-enabling, the stored value is back.
        await openMetadataSettings(page, tag);
        await form.getByRole('checkbox', {name: 'Enable coverage metadata'}).uncheck();
        await saveSettingsForm(page, form);
        await openWorkflow(page, tag, submissionId);
        await openPublicationPage(page, 'Metadata');
        await expect(field(page, /^Keywords/)).toBeVisible();
        await expect(field(page, /^Coverage/)).toHaveCount(0);

        await openMetadataSettings(page, tag);
        await form.getByRole('checkbox', {name: 'Enable coverage metadata'}).check();
        await saveSettingsForm(page, form);
        await openWorkflow(page, tag, submissionId);
        await openPublicationPage(page, 'Metadata');
        await expect(field(page, /^Coverage/).locator('input').first()).toHaveValue(
            'Pacific, 2020s',
            {timeout: 30_000}
        );

        // Plain Language Summary at "Ask", and the Publisher ID for
        // monographs (the press's "Enable for Monographs" box; a press has
        // no Article Number section).
        await openMetadataSettings(page, tag);
        await form
            .getByRole('checkbox', {name: 'Enable plain language summary metadata'})
            .check();
        await form
            .getByRole('radio', {
                name: 'Ask the author to provide a plain language summary during submission.',
            })
            .check();
        await form.getByRole('checkbox', {name: 'Enable for Monographs', exact: true}).check();
        await expect(form.getByText('Article Number', {exact: true})).toHaveCount(0);
        await saveSettingsForm(page, form);

        // Title & Abstract shows "Plain Language Summary" after Abstract…
        await openWorkflow(page, tag, submissionId);
        await openPublicationPage(page, 'Title & Abstract');
        await expect(field(page, /^Plain Language Summary/)).toBeVisible();
        const labels = await page
            .locator('label.pkpFormFieldLabel')
            .evaluateAll((nodes) => nodes.map((n) => (n.textContent || '').trim()));
        const abstractAt = labels.findIndex((l) => l.startsWith('Abstract'));
        const summaryAt = labels.findIndex((l) => l.startsWith('Plain Language Summary'));
        expect(abstractAt).toBeGreaterThanOrEqual(0);
        expect(summaryAt).toBeGreaterThan(abstractAt);

        // …and the Metadata page also shows "Publisher ID".
        await openPublicationPage(page, 'Metadata');
        await expect(field(page, /^Publisher ID/)).toBeVisible();
        await expect(field(page, /^Keywords/)).toBeVisible();
        await expect(field(page, /^Article Number/)).toHaveCount(0);
    });

    test('S3: the press author before and after publication', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const {submissionId, publicationId: v1} = await ompApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
        });

        // The author view lists "Title & Abstract" and "Metadata" and no
        // "Permissions & Disclosure" (the manager's view below has it).
        const authorPage = await (await asUser('author.alex')).newPage();
        const nativeDialogs = [];
        authorPage.on('dialog', (dialog) => {
            nativeDialogs.push(dialog.type());
            dialog.accept().catch(() => {});
        });
        await openWorkflow(authorPage, PK, submissionId, {author: true});
        await expect(
            authorPage.getByRole('link', {name: 'Title & Abstract', exact: true})
        ).toBeVisible();
        await expect(authorPage.getByRole('link', {name: 'Metadata', exact: true})).toBeVisible();
        await expect(
            authorPage.getByRole('link', {name: 'Permissions & Disclosure', exact: true})
        ).toHaveCount(0);

        // On a press the author's page is read-only from submission on:
        // the fields render, Save is unavailable, and nothing typed
        // persists on reload.
        await openPublicationPage(authorPage, 'Title & Abstract');
        await expect(richBody(authorPage, /^Title\b/)).toContainText(`Submission ${tag}`);
        await expect(saveButton(authorPage)).toBeDisabled();
        await prefixInput(authorPage).fill('The');
        await expect(prefixInput(authorPage)).toHaveValue('The');
        await openWorkflow(authorPage, PK, submissionId, {author: true});
        await openPublicationPage(authorPage, 'Title & Abstract');
        await expect(saveButton(authorPage)).toBeVisible();
        await expect(prefixInput(authorPage)).toHaveValue('');

        // An unsaved edit: "The" typed, Metadata opened and Title &
        // Abstract reopened — no prompt (browser or in-app: the one
        // dialog open stays the workflow window) and Prefix is empty.
        await prefixInput(authorPage).fill('The');
        await expect(prefixInput(authorPage)).toHaveValue('The');
        await openPublicationPage(authorPage, 'Metadata');
        await expect(authorPage.getByRole('dialog')).toHaveCount(1);
        expect(nativeDialogs).toEqual([]);
        await openPublicationPage(authorPage, 'Title & Abstract');
        await expect(saveButton(authorPage)).toBeVisible();
        await expect(prefixInput(authorPage)).toHaveValue('');

        // The press manager publishes the monograph (the Publish control
        // sits on the Publication pages); the head reads "Status: Published".
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        await expect(
            managerPage.getByRole('link', {name: 'Permissions & Disclosure', exact: true})
        ).toBeVisible();
        await openPublicationPage(managerPage, 'Title & Abstract');
        await publishFromWorkflow(managerPage);
        await expect(statusReadout(managerPage)).toContainText('Published', {timeout: 30_000});

        // The author now sees the published-version banner, Save still
        // unavailable.
        await openWorkflow(authorPage, PK, submissionId, {author: true});
        await openPublicationPage(authorPage, 'Title & Abstract');
        await expect(authorPage.getByText(PUBLISHED_LOCK)).toBeVisible();
        await expect(saveButton(authorPage)).toBeDisabled();

        // The manager ticks "Allow this person to make changes to the
        // publication…" on the author's assignment (Rule 2's plain tick;
        // a press leaves it unticked by default, which the read before the
        // tick asserts and which is the control for the later "still
        // ticked" read).
        let assignment = await openEditAssignment(managerPage, 'Alex Author');
        await expect(assignment.permissionBox).not.toBeChecked();
        await setAssignmentPermission(assignment, true);

        // The published version is still read-only for the author, with
        // its banner.
        await openVersionPage(authorPage, PK, submissionId, v1, {author: true});
        await expect(authorPage.getByText(PUBLISHED_LOCK)).toBeVisible();
        await expect(saveButton(authorPage)).toBeDisabled();

        // The manager creates a new version; on it the author finds no
        // banner and Save offered (Rule 9), and an unsaved "The" is dropped
        // on this editable page too when Metadata is opened and the page
        // reopened, with no prompt.
        await openVersionPage(managerPage, PK, submissionId, v1);
        const v2 = await createNewVersionFromWorkflow(managerPage);
        await openVersionPage(authorPage, PK, submissionId, v2, {author: true});
        await expect(saveButton(authorPage)).toBeEnabled({timeout: 30_000});
        await expect(authorPage.getByText(PUBLISHED_LOCK)).toHaveCount(0);
        await prefixInput(authorPage).fill('The');
        await expect(prefixInput(authorPage)).toHaveValue('The');
        await openVersionPage(authorPage, PK, submissionId, v2, {author: true, entry: 'Metadata'});
        await expect(authorPage.getByRole('dialog')).toHaveCount(1);
        expect(nativeDialogs).toEqual([]);
        await openVersionPage(authorPage, PK, submissionId, v2, {author: true});
        await expect(prefixInput(authorPage)).toHaveValue('');

        // The Author's save on the new version, while the other version is
        // still published: "The" as Prefix, the footer reads "Saved", and
        // after a reload Prefix reads "The".
        await prefixInput(authorPage).fill('The');
        await savePublicationForm(authorPage);
        await openVersionPage(authorPage, PK, submissionId, v2, {author: true});
        await expect(prefixInput(authorPage)).toHaveValue('The', {timeout: 30_000});

        // The other version's own copy: the published version still shows
        // the banner and its Prefix is empty.
        await openVersionPage(authorPage, PK, submissionId, v1, {author: true});
        await expect(authorPage.getByText(PUBLISHED_LOCK)).toBeVisible();
        await expect(saveButton(authorPage)).toBeDisabled();
        await expect(prefixInput(authorPage)).toHaveValue('');

        // Control: the lock is the Author's — the manager's Title &
        // Abstract on the published version stays editable, with the
        // editor's warning banner (Rule 8).
        await openVersionPage(managerPage, PK, submissionId, v1);
        await expect(managerPage.getByText(PUBLISHED_WARNING)).toBeVisible();
        await expect(saveButton(managerPage)).toBeEnabled();

        // The manager unpublishes the published version. Nothing is
        // re-ticked: the assignment's box is read as still ticked (the
        // positive control that the permission survived the publish and
        // the unpublish) and closed with Cancel.
        await unpublishFromWorkflow(managerPage);
        assignment = await openEditAssignment(managerPage, 'Alex Author');
        await expect(assignment.permissionBox).toBeChecked();
        await cancelEditAssignment(assignment);

        // The author saves at once on the formerly published version: no
        // banner, "The" as Prefix, Saved, and there after a reload.
        await openVersionPage(authorPage, PK, submissionId, v1, {author: true});
        await expect(saveButton(authorPage)).toBeEnabled({timeout: 30_000});
        await expect(authorPage.getByText(PUBLISHED_LOCK)).toHaveCount(0);
        await prefixInput(authorPage).fill('The');
        await savePublicationForm(authorPage);
        await openVersionPage(authorPage, PK, submissionId, v1, {author: true});
        await expect(prefixInput(authorPage)).toHaveValue('The');

        // The new version still offers Save and keeps the "The" saved on
        // it while the other version was published.
        await openVersionPage(authorPage, PK, submissionId, v2, {author: true});
        await expect(saveButton(authorPage)).toBeEnabled({timeout: 30_000});
        await expect(prefixInput(authorPage)).toHaveValue('The');
    });

    test('S4: editing a published version warns and reaches readers', async ({asUser, ompApi, page}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
            published: true,
        });
        const seededAbstract = `Seeded abstract for ${tag}.`;
        const newAbstract = `Edited abstract ${tag}`;

        // Control: before the save the book page shows the abstract as
        // submitted.
        await page.goto(bookUrl(PK, submissionId));
        await expect(page.getByText(seededAbstract)).toBeVisible({timeout: 30_000});
        await expect(page.getByText(newAbstract)).toHaveCount(0);

        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        await openPublicationPage(managerPage, 'Title & Abstract');
        await expect(managerPage.getByText(PUBLISHED_WARNING)).toBeVisible();

        // The same banner on the other Publication pages.
        await openPublicationPage(managerPage, 'Metadata');
        await expect(managerPage.getByText(PUBLISHED_WARNING)).toBeVisible();
        await openPublicationPage(managerPage, 'Permissions & Disclosure');
        await expect(managerPage.getByText(PUBLISHED_WARNING)).toBeVisible();

        // The form stays editable; a save changes what readers see at once.
        await openPublicationPage(managerPage, 'Title & Abstract');
        const abstractBody = richBody(managerPage, /^Abstract/);
        await abstractBody.click();
        await abstractBody.fill(newAbstract);
        // Commit the editor content to the form model before Save (TinyMCE
        // syncs v-model on change, reliably fired on blur) — without it a
        // racing Save can persist the OLD abstract: 200 + toast, stale DB
        // (the mechanism behind the OPS U40 S4 gate reds).
        await abstractBody.blur();
        await savePublicationForm(managerPage);

        await page.goto(bookUrl(PK, submissionId));
        await expect(page.getByText(newAbstract)).toBeVisible({timeout: 30_000});
        await expect(page.getByText(seededAbstract)).toHaveCount(0);
    });

    test('S5: copyright and license — defaults, override, publish, book page', async ({asUser, ompApi, page}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const controlTag = `${tag}c`;
        const year = String(new Date().getFullYear());
        const controlPressName = `Scratch context ${controlTag}`;

        // Press A: holder "Author", CC BY 4.0, license terms. Press B
        // (control): fresh defaults — no holder, no license, no terms.
        await Promise.all([
            ompApi.createContext({
                tag,
                users: [
                    scratchUser(tag, 'mg', 'Mona', 'Manager', ['manager']),
                    scratchUser(tag, 'au', 'Alice', 'Probe', ['author']),
                ],
            }),
            ompApi.createContext({
                tag: controlTag,
                users: [
                    scratchUser(controlTag, 'mg', 'Mona', 'Manager', ['manager']),
                    scratchUser(controlTag, 'au', 'Ada', 'Author', ['author']),
                ],
            }),
        ]);
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await setLicenseSettings(managerPage, tag, {
            holder: 'Author',
            license: 'CC Attribution 4.0',
            terms: `Terms paragraph ${tag}.`,
        });
        const [{submissionId}, control] = await Promise.all([
            ompApi.createSubmission({
                tag: `${tag}s`,
                context: tag,
                submitter: `${tag}au`,
                title: `Submission ${tag}`,
                decisions: ['skipExternalReview', 'sendToProduction'],
            }),
            ompApi.createSubmission({
                tag: `${controlTag}s`,
                context: controlTag,
                submitter: `${controlTag}au`,
                title: `Submission ${controlTag}`,
                decisions: ['skipExternalReview', 'sendToProduction'],
                published: true,
            }),
        ]);
        const licenseSentence =
            'The license will be set automatically to CC Attribution 4.0 when this is published.';

        // Permissions & Disclosure before publishing: the three fields
        // arrive locked with an Override each, their descriptions naming
        // the values the press will apply.
        await openWorkflow(managerPage, tag, submissionId);
        await openPublicationPage(managerPage, 'Permissions & Disclosure');
        const holderField = field(managerPage, /^Copyright Holder/);
        const yearField = field(managerPage, /^Copyright Year/);
        const licenseField = field(managerPage, /^License URL/);
        const holderInput = holderField.locator('input').first();
        const yearInput = yearField.locator('input').first();
        const licenseInput = licenseField.locator('input').first();
        await expect(holderInput).toBeDisabled();
        await expect(holderField.getByRole('button', {name: 'Override'})).toBeVisible();
        await expect(
            holderField.getByText(/Copyright will be assigned automatically to .*Alice Probe/)
        ).toBeVisible();
        await expect(yearInput).toBeDisabled();
        await expect(
            yearField.getByText(
                'The copyright year will be set automatically based on the publication date.'
            )
        ).toBeVisible();
        await expect(licenseInput).toBeDisabled();
        await expect(licenseField.getByText(licenseSentence)).toBeVisible();

        // Override the holder and save.
        await holderField.getByRole('button', {name: 'Override'}).click();
        await holderInput.fill('Example Society');
        await savePublicationForm(managerPage);

        // A refused License URL: "licence" under Override is refused with
        // the field message and the summary, nothing saved; after a reload
        // the field is locked again with its sentence (the holder override
        // is still there, the positive read).
        await licenseField.getByRole('button', {name: 'Override'}).click();
        await licenseInput.fill('licence');
        await saveButton(managerPage).click();
        await expect(licenseField.getByText('This is not a valid URL.')).toBeVisible({
            timeout: 30_000,
        });
        await expect(managerPage.getByText('Please correct one error.')).toBeVisible();
        await expect(
            managerPage.getByRole('button', {name: /^Go to License URL: This is not a valid URL\./})
        ).toBeVisible();
        await expect(managerPage.getByRole('button', {name: 'Jump to next error'})).toBeVisible();
        await openWorkflow(managerPage, tag, submissionId);
        await openPublicationPage(managerPage, 'Permissions & Disclosure');
        await expect(holderInput).toHaveValue('Example Society');
        await expect(licenseInput).toBeDisabled();
        await expect(licenseInput).toHaveValue('');
        await expect(licenseField.getByRole('button', {name: 'Override'})).toBeVisible();
        await expect(licenseField.getByText(licenseSentence)).toBeVisible();

        // Publish; the empty fields fill from the defaults, the override
        // survives, everything is unlocked.
        await publishFromWorkflow(managerPage);
        await openWorkflow(managerPage, tag, submissionId);
        await openPublicationPage(managerPage, 'Permissions & Disclosure');
        await expect(holderInput).toHaveValue('Example Society');
        await expect(holderInput).toBeEnabled();
        await expect(holderField.getByRole('button', {name: 'Override'})).toHaveCount(0);
        await expect(yearInput).toHaveValue(year);
        await expect(yearInput).toBeEnabled();
        await expect(licenseInput).toHaveValue(CC_BY);
        await expect(licenseInput).toBeEnabled();

        // The book page prints the copyright line as its own line (OMP1)
        // and the License block with the CC badge, its sentence and the
        // terms; no statement blocks, both fields being empty (the License
        // block on the same page is the positive read).
        await page.goto(bookUrl(tag, submissionId));
        await expect(copyrightLine(page)).toContainText(
            `Copyright (c) ${year} Example Society`
        );
        await expect(licenseBlock(page)).toContainText(CC_BY_SENTENCE);
        await expect(licenseBlock(page).locator('img')).toHaveCount(1);
        await expect(licenseBlock(page)).toContainText(`Terms paragraph ${tag}.`);
        await expect(page.locator('.item.dataAvailability')).toHaveCount(0);
        await expect(page.locator('.item.fundingStatement')).toHaveCount(0);
        await expect(page.getByRole('heading', {name: 'Data Availability Statement'})).toHaveCount(0);
        await expect(page.getByRole('heading', {name: 'Funding Statement'})).toHaveCount(0);

        // Another License URL: the block shows a link to that address, on a
        // press labelled "License" (OMP1), the terms below it, the badge
        // sentence gone.
        await licenseInput.fill('https://example.org/license');
        await savePublicationForm(managerPage);
        await page.goto(bookUrl(tag, submissionId));
        const otherLink = licenseBlock(page).getByRole('link', {name: 'License', exact: true});
        await expect(otherLink).toHaveAttribute('href', 'https://example.org/license');
        await expect(licenseBlock(page)).toContainText(`Terms paragraph ${tag}.`);
        await expect(licenseBlock(page)).not.toContainText(CC_BY_SENTENCE);
        await expect(copyrightLine(page)).toContainText(`Copyright (c) ${year} Example Society`);

        // The override cleared: "Saved"; after a reload the holder is
        // locked again with its sentence and "Override"; the book page's
        // link still reads "License" and no "Copyright (c)" line shows.
        await holderInput.fill('');
        await savePublicationForm(managerPage);
        await openWorkflow(managerPage, tag, submissionId);
        await openPublicationPage(managerPage, 'Permissions & Disclosure');
        await expect(holderInput).toBeDisabled();
        await expect(holderField.getByRole('button', {name: 'Override'})).toBeVisible();
        await expect(
            holderField.getByText(/Copyright will be assigned automatically to .*Alice Probe/)
        ).toBeVisible();
        await page.goto(bookUrl(tag, submissionId));
        await expect(
            licenseBlock(page).getByRole('link', {name: 'License', exact: true})
        ).toBeVisible();
        await expect(copyrightLine(page)).toHaveCount(0);
        await expect(page.getByText('Copyright (c)')).toHaveCount(0);

        // Terms without a license: License URL cleared, the block is the
        // heading and the terms; on a press a "License" link sits above the
        // terms (OMP5: the scenario's own sentence, never where it leads).
        await expect(licenseInput).toBeEnabled();
        await licenseInput.fill('');
        await savePublicationForm(managerPage);
        await page.goto(bookUrl(tag, submissionId));
        await expect(licenseBlock(page).getByRole('heading', {name: 'License'})).toBeVisible();
        await expect(licenseBlock(page)).toContainText(`Terms paragraph ${tag}.`);
        await expect(licenseBlock(page)).not.toContainText(CC_BY_SENTENCE);
        await expect(licenseBlock(page).locator('img')).toHaveCount(0);
        await expect(licenseBlock(page).locator('a').filter({hasText: 'License'})).toHaveCount(1);

        // The press without a default license: the published item's
        // Permissions & Disclosure reads the press's name as holder,
        // unlocked, and License URL empty and plain-editable with no
        // description and no "Override".
        const controlManager = await (await asUser(`${controlTag}mg`)).newPage();
        await openWorkflow(controlManager, controlTag, control.submissionId);
        await openPublicationPage(controlManager, 'Permissions & Disclosure');
        const controlHolder = field(controlManager, /^Copyright Holder/);
        const controlLicense = field(controlManager, /^License URL/);
        await expect(controlHolder.locator('input').first()).toHaveValue(controlPressName);
        await expect(controlHolder.locator('input').first()).toBeEnabled();
        await expect(controlHolder.getByRole('button', {name: 'Override'})).toHaveCount(0);
        await expect(controlLicense.locator('input').first()).toHaveValue('');
        await expect(controlLicense.locator('input').first()).toBeEnabled();
        await expect(controlLicense.getByRole('button', {name: 'Override'})).toHaveCount(0);
        await expect(
            controlLicense.getByText(/The license will be set automatically/)
        ).toHaveCount(0);
        // (Press A's holder sentence above is the positive control for the
        // absent description; its Override links for the absent link.)

        // Control: no default license and no terms → no License block at
        // all; the press still prints its copyright line (OMP1's press
        // baseline), which also bounds the absence read.
        await page.goto(bookUrl(controlTag, control.submissionId));
        await expect(copyrightLine(page)).toContainText(
            `Copyright (c) ${year} ${controlPressName}`
        );
        await expect(licenseBlock(page)).toHaveCount(0);
    });

    test('S6: change the submission language (press: title only)', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        await ompApi.createContext({
            tag,
            context: {
                supportedLocales: ['en', 'fr_CA'],
                supportedSubmissionLocales: ['en', 'fr_CA'],
            },
            users: [
                scratchUser(tag, 'mg', 'Mona', 'Manager', ['manager']),
                scratchUser(tag, 'au', 'Ada', 'Author', ['author']),
            ],
        });
        const [{submissionId, publicationId: v1}, published] = await Promise.all([
            ompApi.createSubmission({
                tag: `${tag}s`,
                context: tag,
                submitter: `${tag}au`,
                title: `Submission ${tag}`,
                locale: 'en',
            }),
            ompApi.createSubmission({
                tag: `${tag}p`,
                context: tag,
                submitter: `${tag}au`,
                title: `Submission ${tag}p`,
                decisions: ['skipExternalReview', 'sendToProduction'],
                published: true,
            }),
        ]);
        const frTitle = `Titre ${tag}`;

        const page = await (await asUser(`${tag}mg`)).newPage();
        await openWorkflow(page, tag, submissionId);

        // The stage screen shows the readout without a Change button.
        await expect(languageReadout(page, 'English')).toBeVisible();
        await expect(changeButton(page)).toHaveCount(0);

        // A Publication page shows the readout with the Change button.
        await openPublicationPage(page, 'Title & Abstract');
        await expect(languageReadout(page, 'English')).toBeVisible();
        await expect(changeButton(page)).toBeVisible();

        // Cancel closes the panel with nothing changed. Every open waits
        // for the panel's own loading (openLanguagePanel): a still-loading
        // panel keeps the old language's title in the revealed box (A15 —
        // not asserted either way).
        const panel = await openLanguagePanel(page, `Submission ${tag}`);
        await expect(panel.getByRole('radio', {name: 'English'})).toBeChecked();
        await expect(panel.getByRole('radio', {name: 'French (Canada)'})).toBeVisible();
        await panel.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(panel).toHaveCount(0, {timeout: 30_000});
        await expect(languageReadout(page, 'English')).toBeVisible();

        // Pick French: the warning appears with a required Title box and —
        // on a press — no Abstract box (Rule 13b's press leg).
        await openLanguagePanel(page, `Submission ${tag}`);
        await panel.getByRole('radio', {name: 'French (Canada)'}).check();
        await expect(
            panel.getByText(/Before changing the submission language/)
        ).toBeVisible();
        const titleLabel = panel
            .locator('label.pkpFormFieldLabel')
            .filter({hasText: /^Title\b/});
        await expect(titleLabel.first()).toBeVisible();
        await expect(
            panel.locator('label.pkpFormFieldLabel').filter({hasText: /^Abstract/})
        ).toHaveCount(0);

        // Confirm with the Title empty is refused in the browser. The
        // Title editor is mounted by the pick and loads its content style
        // sheets before it is initialized; keys pressed before that are
        // lost to the init, which writes the box's value back (patterns.md
        // "UI realities"), so the box is cleared once it is ready.
        const titleBox = panel.frameLocator('iframe').first().locator('body');
        await waitForEditorReady(page, LANGUAGE_PANEL_TITLE_EDITOR);
        await titleBox.click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Delete');
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        await expect(panel.getByText('This field is required.').first()).toBeVisible();
        await expect(panel.getByText('Please correct one error.')).toBeVisible();

        // Fill the French title and confirm: the screen reloads on Title &
        // Abstract, now in French, the English copy behind the language bar.
        await titleBox.click();
        await titleBox.fill(frTitle);
        const changed = page.waitForResponse(
            (r) => r.url().includes('/changeLocale') && r.ok(),
            {timeout: 30_000}
        );
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        await changed;
        await expect(
            page.getByRole('heading', {name: 'Publication: Title & Abstract'})
        ).toBeVisible({timeout: 60_000});
        await expect(languageReadout(page, 'French (Canada)')).toBeVisible();
        await expect(richBody(page, /^Title\b/)).toContainText(frTitle);

        // The language bar reveals the English column with the old title
        // (read through the column's own TinyMCE editor — the per-locale
        // control id is stable, the iframe order is not).
        await page.locator('.pkpFormLocales').getByRole('button', {name: 'English'}).click();
        await expect
            .poll(
                () =>
                    page.evaluate(
                        () =>
                            window.tinymce
                                ?.get('titleAbstract-title-control-en')
                                ?.getContent() ?? ''
                    ),
                {timeout: 30_000}
            )
            .toContain(`Submission ${tag}`);

        // The contributor's names were copied into the new language: the
        // Edit form, now opening in French, holds the given and family
        // names. (The affiliation copy has no seed key — a scratch user
        // carries no affiliation and the contributor form's affiliation
        // field is a ROR lookup that dies at the dead-port proxy — so the
        // names are what this test reads; harness need reported.)
        await openPublicationPage(page, 'Contributors');
        const item = page.getByRole('listitem').filter({hasText: 'Ada Author'}).first();
        await item.getByRole('button', {name: 'Edit', exact: true}).click();
        const contributorPanel = page
            .getByRole('dialog')
            .filter({has: page.locator('input[name^="givenName"]')});
        await expect(contributorPanel).toBeVisible({timeout: 30_000});
        await expect(
            contributorPanel.locator('input[name^="givenName"]').first()
        ).toHaveValue('Ada');
        await expect(
            contributorPanel.locator('input[name^="familyName"]').first()
        ).toHaveValue('Author');
        // (No Cancel control on this panel; the next navigation discards it.)

        // Without the button: the published item, and the item with two
        // versions, show neither readout nor Change on their Publication
        // pages, while their stage screens keep the readout without the
        // button (A6 — the scenario's own sentence).
        await openWorkflow(page, tag, published.submissionId);
        await openPublicationPage(page, 'Title & Abstract');
        await expect(page.getByText('Current Submission Language:')).toHaveCount(0);
        await expect(changeButton(page)).toHaveCount(0);
        await openStage(page, 'Production');
        await expect(languageReadout(page, 'English')).toBeVisible({timeout: 30_000});
        await expect(changeButton(page)).toHaveCount(0);

        await openWorkflow(page, tag, submissionId);
        await openVersionPage(page, tag, submissionId, v1);
        await createNewVersionFromWorkflow(page);
        await openVersionPage(page, tag, submissionId, v1);
        await expect(page.getByText('Current Submission Language:')).toHaveCount(0);
        await expect(changeButton(page)).toHaveCount(0);
        await openStage(page, 'Submission');
        await expect(languageReadout(page, 'French (Canada)')).toBeVisible({timeout: 30_000});
        await expect(changeButton(page)).toHaveCount(0);

        // Control: the author's stage screen shows the readout (never the
        // button), and their Publication pages show neither. (The author's
        // view of a published item opens on Title & Abstract, so the stage
        // screen is reached through its link.)
        const authorPage = await (await asUser(`${tag}au`)).newPage();
        await openWorkflow(authorPage, tag, published.submissionId, {author: true});
        await openStage(authorPage, 'Production');
        await expect(languageReadout(authorPage, 'English')).toBeVisible({timeout: 30_000});
        await expect(changeButton(authorPage)).toHaveCount(0);
        await openPublicationPage(authorPage, 'Title & Abstract');
        await expect(authorPage.getByText('Current Submission Language:')).toHaveCount(0);
        await expect(changeButton(authorPage)).toHaveCount(0);
    });

    test('S7: reset every monograph\'s permissions', async ({asUser, ompApi, page, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const year = String(new Date().getFullYear());
        const pressName = `Scratch context ${tag}`;
        const author = scratchUser(tag, 'au', 'Ada', 'Author', ['author']);
        const other = scratchUser(tag, 'b', 'Bea', 'Author', ['author']);
        await ompApi.createContext({
            tag,
            users: [scratchUser(tag, 'mg', 'Mona', 'Manager', ['manager']), author, other],
        });
        // The published item and the declined one are the other author's;
        // the unpublished submission is the Author's whose silence is read.
        const [published, unpublished, declined] = await Promise.all([
            ompApi.createSubmission({
                tag: `${tag}s`,
                context: tag,
                submitter: other.username,
                title: `Submission ${tag}`,
                decisions: ['skipExternalReview', 'sendToProduction'],
                published: true,
            }),
            ompApi.createSubmission({
                tag: `${tag}u`,
                context: tag,
                submitter: author.username,
                title: `Unpublished ${tag}`,
            }),
            ompApi.createSubmission({
                tag: `${tag}d`,
                context: tag,
                submitter: other.username,
                title: `Declined ${tag}`,
                decisions: ['initialDecline'],
            }),
        ]);

        // Override the published item's Copyright Holder.
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await openWorkflow(managerPage, tag, published.submissionId);
        await openPublicationPage(managerPage, 'Permissions & Disclosure');
        const holderInput = field(managerPage, /^Copyright Holder/).locator('input').first();
        const yearInput = field(managerPage, /^Copyright Year/).locator('input').first();
        await expect(holderInput).toBeEnabled();
        await holderInput.fill('Example Society');
        await savePublicationForm(managerPage);

        // Control: before OK the unpublished submission's Copyright Holder
        // and Copyright Year are locked and empty; the unpublished and the
        // declined item's "Submission metadata updated" lines so far (the
        // seeded wizard walk writes its own, attributed to the submitter)
        // are counted for the +1 read after the reset.
        const linesBefore = {};
        for (const item of [unpublished, declined]) {
            await openWorkflow(managerPage, tag, item.submissionId);
            await openPublicationPage(managerPage, 'Permissions & Disclosure');
            await expect(holderInput).toBeDisabled();
            await expect(holderInput).toHaveValue('');
            await expect(yearInput).toBeDisabled();
            await expect(yearInput).toHaveValue('');
            const rows = await activityLogRows(managerPage, METADATA_UPDATED);
            await expect(rows.filter({hasText: 'Mona Manager'})).toHaveCount(0);
            linesBefore[item.submissionId] = await rows.count();
        }

        // Tools › Permissions: the browser's own confirm box, whose
        // sentence on a press is not the journal's (OMP3 — the scenario's
        // own sentence, its wording not asserted). Cancelling resets
        // nothing.
        const confirms = [];
        await managerPage.goto(`/index.php/${tag}/management/tools`);
        await managerPage.getByRole('tab', {name: 'Permissions'}).click();
        const resetButton = managerPage.getByRole('button', {
            name: 'Reset Monograph Permissions',
        });
        await expect(resetButton).toBeVisible({timeout: 30_000});
        managerPage.once('dialog', (dialog) => {
            confirms.push({type: dialog.type(), message: dialog.message()});
            dialog.dismiss();
        });
        await resetButton.click();
        await expect.poll(() => confirms.length).toBe(1);
        expect(confirms[0].type).toBe('confirm');
        expect(confirms[0].message).not.toBe('');
        expect(confirms[0].message).not.toBe(JOURNAL_RESET_CONFIRM);
        await openWorkflow(managerPage, tag, published.submissionId);
        await openPublicationPage(managerPage, 'Permissions & Disclosure');
        await expect(holderInput).toHaveValue('Example Society');

        // Reload the tools page (the Cancel case's button state is A13's
        // — not asserted) and confirm: the reset runs.
        await managerPage.goto(`/index.php/${tag}/management/tools`);
        await managerPage.getByRole('tab', {name: 'Permissions'}).click();
        await expect(resetButton).toBeVisible({timeout: 30_000});
        managerPage.once('dialog', (dialog) => dialog.accept());
        const reset = managerPage.waitForResponse(
            (r) => r.url().includes('resetPermissions') && r.ok(),
            {timeout: 30_000}
        );
        await resetButton.click();
        await reset;
        await expect(
            managerPage.getByText('Monograph permissions were successfully reset.')
        ).toBeVisible({timeout: 30_000});

        // The override is gone: the press's default holder (its own name)
        // and the current year, and the book page's copyright line follows.
        await openWorkflow(managerPage, tag, published.submissionId);
        await openPublicationPage(managerPage, 'Permissions & Disclosure');
        await expect(holderInput).toHaveValue(pressName, {timeout: 30_000});
        await expect(yearInput).toHaveValue(year);

        await page.goto(bookUrl(tag, published.submissionId));
        await expect(copyrightLine(page)).toContainText(
            `Copyright (c) ${year} ${pressName}`
        );

        // Every other submission: the unpublished and the declined one
        // carry filled-in values, unlocked, with the press's current year
        // (A3, A2 — the scenario's own sentences), and each Activity Log
        // gained one "Submission metadata updated" line attributed to the
        // manager.
        for (const item of [unpublished, declined]) {
            await openWorkflow(managerPage, tag, item.submissionId);
            await openPublicationPage(managerPage, 'Permissions & Disclosure');
            await expect(holderInput).toHaveValue(pressName, {timeout: 30_000});
            await expect(holderInput).toBeEnabled();
            await expect(yearInput).toHaveValue(year);
            await expect(yearInput).toBeEnabled();
            const rows = await activityLogRows(managerPage, METADATA_UPDATED);
            await expect(rows).toHaveCount(linesBefore[item.submissionId] + 1, {
                timeout: 30_000,
            });
            await expect(rows.filter({hasText: 'Mona Manager'})).toHaveCount(1);
        }

        // Nobody else is told. The mailbox: nothing arrived for the
        // unpublished submission's Author from the reset, bounded by a
        // discussion email this test sends to the other author on the
        // published item after the reset (A8).
        const discussion = `Control ${tag}`;
        await openWorkflow(managerPage, tag, published.submissionId);
        await openStage(managerPage, 'Production');
        await addDiscussion(managerPage, {
            name: discussion,
            participantUsername: other.username,
            message: `Control message ${tag}.`,
        });
        await pkpMail.expectNone({
            to: author.email,
            afterControl: {to: other.email, subject: discussion},
        });

        // The Author, signed in, finds no notification: the Tasks bell has
        // no badge and its window reads "No Items"; the other author's
        // bell, read the same way, carries the discussion (the positive
        // control).
        const authorPage = await (await asUser(author.username)).newPage();
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const authorTasks = new TasksPanel(authorPage);
        await authorTasks.expectCount(0);
        await authorTasks.open();
        await expect(authorTasks.noItems()).toBeVisible({timeout: 30_000});
        await expect(authorTasks.rows()).toHaveCount(0);

        const otherPage = await (await asUser(other.username)).newPage();
        await otherPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const otherTasks = new TasksPanel(otherPage);
        await expect(otherTasks.bell()).toHaveText(/Tasks\s*[1-9]/, {timeout: 30_000});
        await otherTasks.open();
        await expect(
            otherTasks.row(
                DISCUSSION_TASK({
                    creatorName: 'Mona Manager',
                    name: discussion,
                    message: `Control message ${tag}.`,
                })
            )
        ).toHaveCount(1, {timeout: 30_000});
    });

    test('S8: statements reach the reader', async ({asUser, ompApi, page}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        await ompApi.createContext({
            tag,
            users: [
                scratchUser(tag, 'mg', 'Mona', 'Manager', ['manager']),
                scratchUser(tag, 'au', 'Ada', 'Author', ['author']),
            ],
        });
        const {submissionId} = await ompApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: `${tag}au`,
            title: `Submission ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
            published: true,
        });
        const dataStatement = `Data are held by the authors ${tag}.`;
        const fundingStatement = `Funded by the Example Society ${tag}.`;

        // Control: before anything is filled the book page shows neither
        // block (bounded by the page having rendered its title).
        await page.goto(bookUrl(tag, submissionId));
        await expect(
            page.getByText(`Submission ${tag}`).first()
        ).toBeVisible({timeout: 30_000});
        await expect(page.locator('.item.dataAvailability')).toHaveCount(0);
        await expect(page.locator('.item.fundingStatement')).toHaveCount(0);

        // Enable the data availability statement and the funding statement.
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await openMetadataSettings(managerPage, tag);
        const form = metadataSettingsForm(managerPage);
        await form
            .getByRole('checkbox', {name: 'Enable data availability statement metadata'})
            .check();
        await form
            .getByRole('checkbox', {name: 'Enable funding statement metadata'})
            .check();
        await saveSettingsForm(managerPage, form);

        // The Publication area gains a "Data" entry; enter the statement.
        await openWorkflow(managerPage, tag, submissionId);
        await openPublicationPage(managerPage, 'Data');
        const dataBody = richBody(managerPage, /^Data Availability Statement/);
        await dataBody.click();
        await dataBody.fill(dataStatement);
        await savePublicationForm(managerPage);

        // The Metadata page carries the Funding Statement field.
        await openPublicationPage(managerPage, 'Metadata');
        const fundingBody = richBody(managerPage, /^Funding Statement/);
        await fundingBody.click();
        await fundingBody.fill(fundingStatement);
        await savePublicationForm(managerPage);

        // Both blocks reach the reader, the data availability block first.
        await page.goto(bookUrl(tag, submissionId));
        await expect(page.locator('.item.dataAvailability')).toContainText(dataStatement);
        await expect(page.locator('.item.fundingStatement')).toContainText(
            fundingStatement
        );
        const blocks = page.locator('.item.dataAvailability, .item.fundingStatement');
        await expect(blocks).toHaveCount(2);
        await expect(blocks.nth(0)).toHaveClass(/dataAvailability/);
        await expect(blocks.nth(1)).toHaveClass(/fundingStatement/);

        // Disabling the statement removes the "Data" entry (data citations
        // are off on a fresh press) but readers keep seeing the statement.
        await openMetadataSettings(managerPage, tag);
        await form
            .getByRole('checkbox', {name: 'Enable data availability statement metadata'})
            .uncheck();
        await saveSettingsForm(managerPage, form);

        await openWorkflow(managerPage, tag, submissionId);
        await expect(
            managerPage.getByRole('link', {name: 'Title & Abstract', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(
            managerPage.getByRole('link', {name: 'Data', exact: true})
        ).toHaveCount(0);

        await page.goto(bookUrl(tag, submissionId));
        await expect(page.locator('.item.dataAvailability')).toContainText(dataStatement);
    });

    test('S10: an Edited Volume carries a Default Chapter License URL', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        await ompApi.createContext({
            tag,
            users: [
                scratchUser(tag, 'mg', 'Mona', 'Manager', ['manager']),
                scratchUser(tag, 'au', 'Ada', 'Author', ['author']),
            ],
        });
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await setLicenseSettings(managerPage, tag, {license: 'CC Attribution 4.0'});
        const [volume, monograph] = await Promise.all([
            ompApi.createSubmission({
                tag: `${tag}v`,
                context: tag,
                submitter: `${tag}au`,
                title: `Volume ${tag}`,
                workType: 'editedVolume',
            }),
            ompApi.createSubmission({
                tag: `${tag}m`,
                context: tag,
                submitter: `${tag}au`,
                title: `Monograph ${tag}`,
                workType: 'monograph',
            }),
        ]);

        // The Edited Volume's Permissions & Disclosure adds the fourth
        // field, locked with an Override and the inherited-license sentence.
        await openWorkflow(managerPage, tag, volume.submissionId);
        await openPublicationPage(managerPage, 'Permissions & Disclosure');
        const chapterField = field(managerPage, /^Default Chapter License URL/);
        await expect(chapterField).toBeVisible();
        await expect(chapterField.locator('input').first()).toBeDisabled();
        await expect(chapterField.getByRole('button', {name: 'Override'})).toBeVisible();
        await expect(
            chapterField.getByText(
                'The license will be set automatically to CC Attribution 4.0 when this is published.'
            )
        ).toBeVisible();

        // Override with another license address; the value survives Save
        // and reload, unlocked.
        await chapterField.getByRole('button', {name: 'Override'}).click();
        await chapterField.locator('input').first().fill(CC_BY_SA);
        await savePublicationForm(managerPage);
        await openWorkflow(managerPage, tag, volume.submissionId);
        await openPublicationPage(managerPage, 'Permissions & Disclosure');
        await expect(chapterField.locator('input').first()).toHaveValue(CC_BY_SA, {
            timeout: 30_000,
        });
        await expect(chapterField.locator('input').first()).toBeEnabled();
        await expect(chapterField.getByRole('button', {name: 'Override'})).toHaveCount(0);

        // Control: a Monograph has no such field — bounded by the page's
        // other license fields rendering.
        await openWorkflow(managerPage, tag, monograph.submissionId);
        await openPublicationPage(managerPage, 'Permissions & Disclosure');
        await expect(field(managerPage, /^License URL/)).toBeVisible();
        await expect(field(managerPage, /^Default Chapter License URL/)).toHaveCount(0);
    });

    test('S12: a copyeditor saves only with the permission', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s12', testInfo);
        // A monograph walked to Copyediting (the Copyeditor's stage) with
        // the seeded Copyeditor assigned; the row carries the role's
        // default, which on a press is no permission (footnote s12).
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
            decisions: ['skipExternalReview'],
            participants: [{username: 'copyeditor.carla', role: 'copyeditor'}],
        });

        // The assignment's box arrives unticked for the Copyeditor.
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        let assignment = await openEditAssignment(managerPage, 'Carla Copyeditor', {
            stage: 'Copyediting',
        });
        await expect(assignment.permissionBox).not.toBeChecked();
        await cancelEditAssignment(assignment);

        // Control, before: the Press Manager, who holds no assignment,
        // saves on the page with "Saved" and sees "Change" beside the
        // readout.
        await openPublicationPage(managerPage, 'Title & Abstract');
        await expect(languageReadout(managerPage, 'English')).toBeVisible();
        await expect(changeButton(managerPage)).toBeVisible();
        const managerSubtitle = richBody(managerPage, /^Subtitle/);
        await managerSubtitle.click();
        await managerSubtitle.fill(`Control ${tag}`);
        await savePublicationForm(managerPage);

        // The pages without the permission: Save present but disabled,
        // the fields still typeable (A8 — the scenario's own sentence);
        // "The" typed as Prefix is gone after a reload; the readout with
        // no "Change" after it.
        const copyeditorPage = await (await asUser('copyeditor.carla')).newPage();
        await openWorkflow(copyeditorPage, PK, submissionId);
        await openPublicationPage(copyeditorPage, 'Title & Abstract');
        await expect(saveButton(copyeditorPage)).toBeVisible();
        await expect(saveButton(copyeditorPage)).toBeDisabled();
        await expect(prefixInput(copyeditorPage)).toBeEnabled();
        await prefixInput(copyeditorPage).fill('The');
        await expect(prefixInput(copyeditorPage)).toHaveValue('The');
        await expect(languageReadout(copyeditorPage, 'English')).toBeVisible();
        await expect(changeButton(copyeditorPage)).toHaveCount(0);
        await openWorkflow(copyeditorPage, PK, submissionId);
        await openPublicationPage(copyeditorPage, 'Title & Abstract');
        await expect(saveButton(copyeditorPage)).toBeDisabled();
        await expect(prefixInput(copyeditorPage)).toHaveValue('');
        await expect(richBody(copyeditorPage, /^Subtitle/)).toContainText(`Control ${tag}`);

        // The permission granted: the box ticked and OK.
        await openWorkflow(managerPage, PK, submissionId);
        assignment = await openEditAssignment(managerPage, 'Carla Copyeditor', {
            stage: 'Copyediting',
        });
        await expect(assignment.permissionBox).not.toBeChecked();
        await setAssignmentPermission(assignment, true);

        // The pages with the permission: Save offered; "The" as Prefix
        // saves with "Saved" and is there after a reload; "Change" now
        // follows the readout.
        await openWorkflow(copyeditorPage, PK, submissionId);
        await openPublicationPage(copyeditorPage, 'Title & Abstract');
        await expect(saveButton(copyeditorPage)).toBeEnabled({timeout: 30_000});
        await expect(languageReadout(copyeditorPage, 'English')).toBeVisible();
        await expect(changeButton(copyeditorPage)).toBeVisible();
        await prefixInput(copyeditorPage).fill('The');
        await savePublicationForm(copyeditorPage);
        await openWorkflow(copyeditorPage, PK, submissionId);
        await openPublicationPage(copyeditorPage, 'Title & Abstract');
        await expect(prefixInput(copyeditorPage)).toHaveValue('The', {timeout: 30_000});
        await expect(changeButton(copyeditorPage)).toBeVisible();

        // Control, after: the manager still saves with "Saved" and still
        // sees "Change" beside the readout.
        await openWorkflow(managerPage, PK, submissionId);
        await openPublicationPage(managerPage, 'Title & Abstract');
        await expect(changeButton(managerPage)).toBeVisible();
        await expect(prefixInput(managerPage)).toHaveValue('The');
        await managerSubtitle.click();
        await managerSubtitle.fill(`Control after ${tag}`);
        await savePublicationForm(managerPage);
    });
});
