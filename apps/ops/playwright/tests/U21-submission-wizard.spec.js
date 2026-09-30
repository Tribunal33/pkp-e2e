// @ts-check
/**
 * @file playwright/tests/U21-submission-wizard.spec.js
 *
 * U21 — Submission wizard, OPS suite (spec:
 * docs/specs/U21-submission-wizard.md). One test per canonical scenario a
 * preprint server runs, in OPS vocabulary (server, preprint, moderator,
 * galley, "Comments for the Moderator" — glossary substitution): common
 * scenarios 1–11, 16 and 17, then the OPS-specific scenarios 12
 * (closed/restricted sections) and 15 (the galley intake and its can-post
 * control), plus one absence test covering scenario 13's stated OPS control
 * ("on a preprint server always — no such step appears"), scenario 14's
 * press-only Submission Type intake, and scenario 1's "Preprint server"
 * bullet (no "Make a Submission" block plugin, no such block on the reader
 * site). What the scenarios leave out is the spec's Coverage section.
 *
 * Not covered (register IDs; PRINCIPLES M3): OPS2, OPS3, OPS4, OPS5, OPS6,
 * OPS7, A1, A2, A4, A5, A6, A7, A8.
 *
 * Seeding: scenario endpoints only. Drafts (`submitted: false`) on the
 * read-only `publicknowledge` server for author-only flows; scratch servers
 * (with throwaway users carrying unique mail.test addresses) wherever a
 * setting differs from the install default (seeded through the context
 * passthrough keys: `copyrightNotice`, `metadata`,
 * `submissionAcknowledgement` and its copies, `sections[]` with
 * `wordCount`, `policy` and `abstractsNotRequired`,
 * `supportedSubmissionLocales`; a second scratch server at the builder's
 * defaults is scenario 5's one-section, one-language server), a section is
 * mutated, or Mailpit is read (PRINCIPLES A8 — every mail assertion is
 * scoped by a unique throwaway recipient). The settings scenarios 7, 8, 9
 * and 12 switch their setting through the manager's own screen, as the
 * spec's bullets say. All tests run in the parallel `ops` project; nothing
 * global is touched.
 */
const {test, expect} = require('../support/fixtures.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {
    STEPS,
    SUBMIT_DIALOGS,
    CONTROLS,
    startUrl,
    wizardUrl,
    footer,
    submitButton,
    submittingToLine,
    railEntry,
    railButton,
    railUnreached,
    backButton,
    backTo,
    gotoStep,
    appBanner,
    notFoundHeading,
    startFormLegend,
    sectionPolicy,
    expectStep,
    expectWizardOpen,
    beginSubmission,
    continueTo,
    addGalleyFile,
    setRelationStatus,
    openReview,
    problemsBanner,
    reviewPanel,
    confirmationHeading,
    copyrightCheckbox,
    fillRichText,
    richTextBody,
    wizardField,
    wizardFieldLabel,
    reviewItem,
    addKeyword,
    contributorRows,
    addContributor,
    confirmSubmit,
    completeAndSubmitDraft,
    saveForLater,
    cancelDraft,
    openChangeSettings,
} = require('../pages/SubmissionWizardPages.js');
const {MySubmissionsPage} = require('../pages/MySubmissionsPage.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');

const PK = 'publicknowledge';
const PK_PREFIX = '/en';

const ACK_SUBJECT = 'Thank you for your submission';
/** OPS's seeded co-author template title (OJS's reads "Submission confirmation"). */
const COAUTHOR_ACK_SUBJECT = 'Submission Acknowledgement';
const NEEDS_EDITOR_SUBJECT = 'needs an editor to be assigned';
/** The server's comments box, discussion and email title. */
const MODERATOR_NOTE = 'Comments for the Moderator';
/** OPS wording of the log's submit entry (ops locale.po overrides lib/pkp's). */
const SUBMITTED_LOG_LINE = 'Preprint submitted';
const PROBLEMS_BANNER = 'There are one or more problems that need to be fixed before you can submit.';
const LONG_ABSTRACT =
    'This abstract has more words than the section allows, fourteen of them in all.';

/** Parallel-safe unique tag: single alphanumeric token, ≤32 chars. */
function makeTag(testInfo, scenarioKey) {
    const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6);
    return `${scenarioKey}opsw${testInfo.parallelIndex}${rand}`;
}

/**
 * Seed a scratch preprint server whose path is the tag, with throwaway users
 * (usernames prefixed by the tag so their mail.test addresses are unique per
 * run) and any context passthrough keys (`settings`) the scenario's given
 * names. Returns {path, users: {key: {username, email, name}}}.
 */
async function seedServer(
    opsApi,
    tag,
    userKeys,
    {locales = null, submissionLocales = null, sections = null, settings = {}, context = {}} = {}
) {
    const roleByKey = {
        manager: ['manager'],
        moderator: ['sectionEditor'],
        author: ['author'],
        reader: ['reader'],
        reader2: ['reader'],
    };
    const users = {};
    const specs = userKeys.map((key) => {
        const username = `${tag}${key}`;
        const givenName = `U21${key}`;
        users[key] = {username, email: `${username}@mail.test`, name: `${givenName} Tester`};
        return {
            username,
            givenName,
            familyName: 'Tester',
            email: `${username}@mail.test`,
            roles: roleByKey[key],
        };
    });
    const contextSpec = {name: {en: `U21 Server ${tag}`}, ...context};
    if (locales) {
        contextSpec.supportedLocales = locales;
    }
    if (submissionLocales) {
        contextSpec.supportedSubmissionLocales = submissionLocales;
    }
    const spec = {tag, context: contextSpec, users: specs, ...settings};
    if (sections) {
        spec.sections = sections;
    }
    await opsApi.createContext(spec);
    return {path: tag, users};
}

/** Seed a wizard-resumable draft; returns the scenario response. */
async function seedDraft(opsApi, tag, {context = PK, submitter = 'author.alex', ...rest} = {}) {
    return opsApi.createSubmission({
        tag,
        context,
        submitter,
        submitted: false,
        ...rest,
    });
}

/**
 * As the manager of a scratch server, tick or untick the workflow settings'
 * "Disable Submissions" box (Settings → Workflow → Submission).
 */
async function setDisableSubmissions(page, contextPath, disabled) {
    await page.goto(`/index.php/${contextPath}/management/settings/workflow`);
    const checkbox = page.getByRole('checkbox', {name: 'Disable Submissions'});
    await expect(checkbox).toBeVisible({timeout: 20_000});
    if (disabled) {
        await checkbox.check();
    } else {
        await checkbox.uncheck();
    }
    const saved = page.waitForResponse(
        (r) => r.url().includes('/api/v1/contexts/') && r.ok()
    );
    await page.getByRole('button', {name: 'Save', exact: true}).click();
    await saved;
}

/** Open Settings → Server → Sections (the legacy sections grid). */
async function gotoSections(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/management/settings/context`);
    await page.getByRole('tab', {name: 'Sections'}).click();
    await waitForJQueryIdle(page);
    await expect(
        page.getByRole('link', {name: 'Create Section'})
    ).toBeVisible({timeout: 20_000});
}

/**
 * Click a legacy link/control until its AjaxModal answers — the jQuery
 * handlers (re)bind after grid refreshes, and a click that lands before
 * binding is silently lost.
 */
async function openLegacyModal(page, trigger, dialog) {
    await waitForJQueryIdle(page);
    for (let attempt = 0; ; attempt++) {
        await trigger.click();
        try {
            await expect(dialog.first()).toBeVisible({timeout: 5_000});
            return;
        } catch (error) {
            if (attempt >= 2) {
                throw error;
            }
        }
    }
}

/**
 * Set one flag of a section's grid-row Edit form (`editorRestriction` —
 * OPS's spelling of OJS's `editorRestricted` — or `isInactive`) and save.
 * A row's action links live in the NEXT `tr` (patterns.md, legacy grids).
 * Assumes gotoSections() ran.
 */
async function setSectionFlag(page, title, flagName, checked) {
    const row = page.locator('tr').filter({hasText: title}).first();
    await row.locator('a.show_extras').click();
    const dialog = page
        .getByRole('dialog')
        .filter({has: page.locator('#sectionForm')});
    const edit = row
        .locator('xpath=following-sibling::tr[1]')
        .getByRole('link', {name: 'Edit', exact: true});
    await openLegacyModal(page, edit, dialog);
    const box = dialog.locator(`input[name="${flagName}"]`);
    if (checked) {
        await box.check();
    } else {
        await box.uncheck();
    }
    await dialog.getByRole('button', {name: 'Save', exact: true}).click();
    await expect(dialog).toHaveCount(0, {timeout: 20_000});
    await waitForJQueryIdle(page);
}

/**
 * Deactivate a section via its grid row's "Inactive" checkbox (confirm
 * dialog included). Assumes gotoSections() ran.
 */
async function deactivateSection(page, title) {
    const row = page.locator('tr').filter({hasText: title}).first();
    const checkbox = row.locator('input[type="checkbox"]');
    const confirm = page
        .getByRole('dialog')
        .filter({hasText: 'Are you sure you wish to deactivate this section?'});
    await openLegacyModal(page, checkbox, confirm);
    await confirm.getByRole('button', {name: 'OK', exact: true}).click();
    await waitForJQueryIdle(page);
    await expect(checkbox).toBeChecked({timeout: 20_000});
}

/**
 * Open the manager's editorial workflow for a submission (the OPS panel has
 * no "Workflow:" heading; its "Activity Log" button is the landmark).
 */
async function openEditorial(page, contextPath, submissionId) {
    await page.goto(
        `/index.php/${contextPath}/dashboard/editorial?workflowSubmissionId=${submissionId}`
    );
    await expect(
        page.getByRole('button', {name: 'Activity Log', exact: true})
    ).toBeVisible({timeout: 30_000});
}

/**
 * On the open editorial workflow, open "Activity Log" and return the History
 * table's rows (the dialog loads them after it opens; the table bounds the
 * read).
 */
async function activityLogRows(page) {
    await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
    const log = page.getByRole('dialog').filter({hasText: 'Activity Log & Notes'});
    await expect(log.getByRole('table').first()).toBeVisible({timeout: 30_000});
    return log.getByRole('row');
}

/** The author's workflow panel (the preprint's publication tabs). */
function authorWorkflow(page) {
    return page
        .getByRole('dialog')
        .filter({has: page.getByRole('navigation').getByRole('link', {name: 'Preprint', exact: true})});
}

/**
 * Walk a draft to Review with one galley and a second contributor added on
 * the Contributors step, then submit (scenario 10's drafts).
 */
async function submitWithCoauthor(page, contextPath, seeded, tag, contributorEmail) {
    await page.goto(wizardUrl(contextPath, seeded.submissionId));
    await expectWizardOpen(page);
    await addGalleyFile(page);
    await continueTo(page, STEPS.details);
    await continueTo(page, STEPS.contributors);
    await addContributor(page, {givenName: `Coauthor${tag}`, email: contributorEmail});
    await continueTo(page, STEPS.readers);
    await setRelationStatus(page);
    await openReview(page);
    await expect(problemsBanner(page)).toHaveCount(0);
    await confirmSubmit(page);
}

test.describe('Submission wizard (U21)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test('S1: start a submission from the dashboard sidebar', async ({opsApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s1');
        const page = await (await asUser('author.alex')).newPage();

        // The sidebar offers "Start A New Submission" (Rule 1)…
        await page.goto(`/index.php/${PK}${PK_PREFIX}/dashboard/mySubmissions`);
        await page.getByRole('link', {name: 'Start A New Submission'}).click();

        // …which lands on the "Make a Submission" start form; fill it and
        // begin (scenario 1; publicknowledge has one open section and one
        // submission language, so neither choice renders — Rule 4).
        await beginSubmission(page, {title: `Submission ${tag}`});

        // The wizard opened on Upload Files with the submission's number
        // shown above the heading (Rules 5, 7).
        const id = new URL(page.url()).searchParams.get('id');
        expect(Number(id)).toBeGreaterThan(0);
        await expect(
            page.locator('.submissionWizard__submissionDetails')
        ).toContainText(String(id));
        await expect(page).toHaveTitle(/Make a Submission/);

        // No affiliation: a throwaway Author (the seeder creates the account
        // with no affiliation) starts a draft the same way — the wizard
        // opens on Upload Files and Contributors already lists them as the
        // primary contact (Rule 5).
        const server = await seedServer(opsApi, tag, ['author']);
        const author = server.users.author;
        const bare = await (await asUser(author.username)).newPage();
        await bare.goto(startUrl(server.path));
        await beginSubmission(bare, {title: `Submission ${tag}b`});
        await continueTo(bare, STEPS.details);
        await continueTo(bare, STEPS.contributors);
        const row = contributorRows(bare).filter({hasText: author.name});
        await expect(row).toBeVisible({timeout: 20_000});
        await expect(row.locator('.pkpBadge').filter({hasText: 'Primary Contact'})).toBeVisible();
        await expect(contributorRows(bare)).toHaveCount(1);

        // The "Preprint server" bullet (no "Make a Submission" block plugin,
        // none on the reader site) is asserted in the S13+S14 absence test.
    });

    test('S2: fill every step and submit; the acknowledgement arrives', async ({opsApi, pkpMail, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s2');
        const server = await seedServer(opsApi, tag, ['author', 'manager']);
        const author = server.users.author;
        const seeded = await seedDraft(opsApi, tag, {
            context: server.path,
            submitter: author.username,
        });
        const second = await seedDraft(opsApi, `${tag}b`, {
            context: server.path,
            submitter: author.username,
        });

        const page = await (await asUser(author.username)).newPage();
        await page.goto(wizardUrl(server.path, seeded.submissionId));
        await expectWizardOpen(page);

        // Add a galley, pass every step (the required Relation status
        // included) and reach Review: the check clears with no banner, and
        // with no copyright notice on this server Review has no
        // "Confirmation" section (scenario 16's control; positive control:
        // the Files panel read the same way). Submit from Review: the
        // confirmation dialog says a moderator will review the preprint
        // (scenario 2 / OPS1).
        await addGalleyFile(page);
        await continueTo(page, STEPS.details);
        await expect(page).toHaveURL(/#details$/);
        await continueTo(page, STEPS.contributors);
        await expect(page).toHaveURL(/#contributors$/);

        // "Back" and the step rail (Rule 8): on Contributors press "Back":
        // Details shows again, the tab title reads "Make a Submission:
        // Details" and the address's "#…" part follows the step. "Back"
        // once more: Upload Files, which offers no "Back" of its own
        // (positive control: its "Continue", read the same way).
        await backTo(page, STEPS.details);
        await expect(page).toHaveTitle(/^Make a Submission: Details\b/);
        await expect(page).toHaveURL(/#details$/);
        await backTo(page, STEPS.files);
        await expect(page).toHaveTitle(/^Make a Submission: Upload Files\b/);
        await expect(page).toHaveURL(/#files$/);
        await expect(footer(page).getByRole('button', {name: 'Continue', exact: true})).toBeVisible();
        await expect(backButton(page)).toHaveCount(0);

        // In the rail, "Details", already reached, is a button that reopens
        // the step directly; "Review", not yet reached, is plain text, not
        // a button, and pressing its label changes nothing (the current
        // step stays Upload Files).
        await expect(railButton(page, /Details\s*$/)).toHaveCount(1);
        await expect(railUnreached(page, /Review\s*$/)).toBeVisible();
        await expect(railButton(page, /Review\s*$/)).toHaveCount(0);
        await railEntry(page, /Review\s*$/).click();
        await expectStep(page, STEPS.files);
        await expect(page).toHaveURL(/#files$/);
        await gotoStep(page, STEPS.details);
        await expect(page).toHaveURL(/#details$/);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.readers);
        await expect(page).toHaveURL(/#editors$/);
        await setRelationStatus(page);
        await openReview(page);
        await expect(page).toHaveURL(/#review$/);
        await expect(problemsBanner(page)).toHaveCount(0);
        await expect(reviewPanel(page, 'Files').getByRole('heading', {name: 'Files'})).toBeVisible();
        await expect(confirmationHeading(page)).toHaveCount(0);
        await expect(copyrightCheckbox(page)).toHaveCount(0);
        await confirmSubmit(page, {message: SUBMIT_DIALOGS.moderated});

        // The completion screen says the moderator will review the
        // submission and offers the three links (Rule 15 / OPS1).
        await expect(
            page.getByText('Once the moderator has reviewed your submission')
        ).toBeVisible();
        await expect(page.getByRole('link', {name: 'Review this submission'})).toBeVisible();
        await expect(page.getByRole('link', {name: 'Create a new submission'})).toBeVisible();
        await expect(page.getByRole('link', {name: 'Return to your dashboard'})).toBeVisible();

        // The acknowledgement email reaches the submitting author (Side
        // effects; unique throwaway recipient).
        await pkpMail.find({
            to: author.email,
            subject: ACK_SUBJECT,
            timeoutMs: 30_000,
        });

        // "Review this submission" opens the submission's workflow in the
        // author's own view (the preprint's publication tabs).
        await page.getByRole('link', {name: 'Review this submission'}).click();
        await expect(
            authorWorkflow(page).getByRole('navigation').getByText('Title & Abstract')
        ).toBeVisible({timeout: 30_000});

        // The submission's activity log holds the "submission submitted"
        // entry (Side effects; the log is read on the editorial workflow by
        // the server's manager, who has the "Activity Log" control; the
        // author's own view offers none).
        const managerPage = await (await asUser(server.users.manager.username)).newPage();
        await openEditorial(managerPage, server.path, seeded.submissionId);
        await expect(
            (await activityLogRows(managerPage)).filter({hasText: SUBMITTED_LOG_LINE})
        ).toHaveCount(1);

        // The wizard address after submitting answers "Submission complete"
        // with no "Cancel" control (Rules 6, 15, 16); control: the second,
        // unsubmitted draft answers its address with the wizard itself and
        // "Cancel" in its footer.
        await page.goto(wizardUrl(server.path, seeded.submissionId));
        await expect(page.getByRole('heading', {name: 'Submission complete'})).toBeVisible({
            timeout: 20_000,
        });
        await expect(page.locator('#cancelSubmission')).toHaveCount(0);
        await page.goto(wizardUrl(server.path, second.submissionId));
        await expectWizardOpen(page);
        await expect(footer(page).locator('#cancelSubmission')).toBeVisible();

        // Comments for the Moderator: on the second draft (the scratch
        // server has no moderator assigned), type the note in the For
        // Readers step's "Comments for the Moderator" box and submit: the
        // workflow's "Production Tasks & Discussions" shows the note as a
        // discussion, and a copy of it arrives in your mailbox, you being
        // its only participant.
        const note = 'Please note the data set is under embargo.';
        await addGalleyFile(page);
        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.readers);
        await expect(wizardField(page, new RegExp(`^${MODERATOR_NOTE}`))).toBeVisible();
        await fillRichText(page, CONTROLS.moderatorNote, note);
        await setRelationStatus(page);
        await openReview(page);
        await expect(problemsBanner(page)).toHaveCount(0);
        await confirmSubmit(page, {message: SUBMIT_DIALOGS.moderated});
        await page.getByRole('link', {name: 'Review this submission'}).click();
        const workflow = authorWorkflow(page);
        await workflow
            .getByRole('navigation')
            .getByRole('link', {name: 'Production Tasks & Discussions'})
            .click();
        const discussionRow = workflow.getByRole('row').filter({hasText: MODERATOR_NOTE});
        await expect(discussionRow).toBeVisible({timeout: 30_000});
        await expect(discussionRow).toContainText(`Created by: ${author.username}`);
        const copy = await pkpMail.find({
            to: author.email,
            subject: MODERATOR_NOTE,
            contains: 'under embargo',
            timeoutMs: 30_000,
        });
        expect(copy.To.map((r) => r.Address)).toEqual([author.email]);
    });

    test('S3: save for later and resume from the emailed link', async ({opsApi, pkpMail, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s3');
        const server = await seedServer(opsApi, tag, ['author']);
        const author = server.users.author;
        const seeded = await seedDraft(opsApi, tag, {
            context: server.path,
            submitter: author.username,
        });
        const second = await seedDraft(opsApi, `${tag}b`, {
            context: server.path,
            submitter: author.username,
        });

        const page = await (await asUser(author.username)).newPage();
        // The wizard's autosave clock is the page's own: its timer saves
        // when a minute has passed since the last save. Install the browser
        // clock before the wizard loads so the minute can be handed to the
        // page instead of waited out (A5: no sleeps).
        await page.clock.install();
        await page.goto(wizardUrl(server.path, seeded.submissionId));
        await expectWizardOpen(page);
        await continueTo(page, STEPS.details);

        // Autosave: type the title and stop. The wizard saves on its own
        // timer, a minute after the last save (Rule 9): the footer flashes "Saving"
        // and then ticks "Last saved {n} seconds ago". Both waits are bound
        // by the save the wizard itself sends; nothing is pressed.
        const saved = page.waitForResponse(
            (r) =>
                /\/publications\/\d+/.test(r.url()) &&
                ['POST', 'PUT'].includes(r.request().method()) &&
                r.ok(),
            {timeout: 100_000}
        );
        const flashed = page.waitForFunction(
            () =>
                /Saving/.test(
                    document.querySelector('.submissionWizard__footer')?.textContent || ''
                ),
            null,
            {timeout: 100_000, polling: 50}
        );
        await fillRichText(page, CONTROLS.title, 'Autosave check');
        // Typing has stopped; jump the page's clock past the wizard's
        // one-minute mark so its own timer queues the change, and once more
        // so the next turn of that timer sends it.
        await page.clock.fastForward(61_000);
        await page.clock.fastForward(1_000);
        await saved;
        await flashed;
        await expect(footer(page)).toContainText(/Last saved \d+ seconds? ago/);

        // "Save for Later" lands on the Saved for Later screen: a resume
        // link labeled with the draft's contributors and title, and the
        // emailed-copy note (Rule 10).
        await saveForLater(page);
        const resumeLink = page.locator(`a[href*="/submission?id=${seeded.submissionId}"]`);
        await expect(resumeLink).toBeVisible();
        await expect(resumeLink).toContainText('Tester');
        await expect(resumeLink).toContainText('Autosave check');
        await expect(
            page.getByText(`We have emailed a copy of this link to you at ${author.email}.`)
        ).toBeVisible();

        // The email arrives with the resume link (scenario 3).
        const message = await pkpMail.find({
            to: author.email,
            subject: 'Resume your submission',
            timeoutMs: 30_000,
        });
        const full = await pkpMail.fullMessage(message.ID);
        const match = /href="([^"]*\/submission\?id=\d+[^"]*)"/.exec(full.HTML || '');
        expect(match, 'the saved-for-later email carries the wizard link').toBeTruthy();
        const link = match[1].replace(/&amp;/g, '&');

        // Signed out, the emailed link shows the Login page (Actors).
        await page.goto(`/index.php/${server.path}/login/signOut`);
        await page.waitForURL((url) => !url.pathname.endsWith('/signOut'), {
            waitUntil: 'commit',
            timeout: 15_000,
        });
        await page.goto(link);
        await expect(page.locator('form#login')).toBeVisible({timeout: 20_000});
        await expect(page.locator('.pkpSteps__buttons')).toHaveCount(0);

        // Resume: sign in and follow the link: the wizard reopens on
        // "Details", the step you left, with "Autosave check" in "Title".
        await new LoginPage(page).signIn(author.username, getPassword(author.username));
        await page.goto(link);
        await expectWizardOpen(page);
        await expectStep(page, STEPS.details);
        await expect(richTextBody(page, CONTROLS.title)).toContainText('Autosave check');

        // Control: the second draft, moved to "Details" by "Continue" and
        // never saved for later, reopens from My Submissions at "Upload
        // Files" (Rule 6).
        await page.goto(wizardUrl(server.path, second.submissionId));
        await expectWizardOpen(page);
        await continueTo(page, STEPS.details);
        const mySub = new MySubmissionsPage(page, server.path);
        await mySub.goto();
        const row = await mySub.findRowByTag(`${tag}b`);
        await mySub.completeSubmissionButton(row).click();
        await expectWizardOpen(page);
        expect(page.url()).toContain(`id=${second.submissionId}`);
        await expectStep(page, STEPS.files);
    });

    test('S4: the manager cancels another author\'s draft; an assigned moderator gets no Cancel; no email', async ({opsApi, pkpMail, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s4');
        const server = await seedServer(opsApi, tag, ['author', 'manager', 'moderator']);
        const author = server.users.author;
        const manager = server.users.manager;
        // The draft the manager cancels carries an assigned Moderator (the
        // scenario API's participants[] key — the control's seeding, not
        // the surface under test); a spare draft bounds the mailbox read.
        const other = await seedDraft(opsApi, tag, {
            context: server.path,
            submitter: author.username,
            participants: [{username: server.users.moderator.username, role: 'sectionEditor'}],
        });
        const spare = await seedDraft(opsApi, `${tag}c`, {
            context: server.path,
            submitter: author.username,
        });
        const otherUrl = wizardUrl(server.path, other.submissionId);

        // Control: the assigned Moderator gets the wizard — Save for Later
        // and Continue offered — but no "Cancel" (Rule 16).
        const moderatorPage = await (await asUser(server.users.moderator.username)).newPage();
        await moderatorPage.goto(otherUrl);
        await expectWizardOpen(moderatorPage);
        await expect(
            footer(moderatorPage).getByRole('button', {name: 'Continue', exact: true})
        ).toBeVisible();
        await expect(
            footer(moderatorPage).getByRole('button', {name: 'Save for Later', exact: true})
        ).toBeVisible();
        await expect(moderatorPage.locator('#cancelSubmission')).toHaveCount(0);

        // The Preprint Server Manager on another author's draft: the footer
        // offers "Cancel"; the warning dialog, then the "Submission
        // cancelled" screen with its two links (Rule 16; on a preprint
        // server the scenario passes only for a manager — the author's own
        // Cancel is register OPS3 and is not exercised here).
        const managerPage = await (await asUser(manager.username)).newPage();
        await managerPage.goto(otherUrl);
        await expectWizardOpen(managerPage);
        // The address noted from the address bar before cancelling, and the
        // server's design around the wizard (the header, a stylesheet, the
        // step rail): the control for the bare page below, read the same way.
        const deletedAddress = managerPage.url();
        expect(deletedAddress).toContain(`id=${other.submissionId}`);
        await expect(appBanner(managerPage)).toBeVisible();
        await expect(managerPage.locator('link[rel="stylesheet"]').first()).toBeAttached();
        await expect(footer(managerPage).locator('#cancelSubmission')).toBeVisible();
        await cancelDraft(managerPage);
        await expect(managerPage.getByRole('link', {name: 'Create a new submission'})).toBeVisible();
        await expect(managerPage.getByRole('link', {name: 'Return to your dashboard'})).toBeVisible();

        // The deleted draft's address: re-typed, it answers only a bare
        // page-not-found error without the server's design: the whole page
        // is the one line "404 Not Found", no header, no stylesheet, no
        // step rail, no links, no tab title (Rule 16).
        const response = await managerPage.goto(deletedAddress);
        expect(response.status()).toBe(404);
        await expect(notFoundHeading(managerPage)).toBeVisible({timeout: 20_000});
        await expect(managerPage.locator('body')).toHaveText('404 Not Found');
        await expect(appBanner(managerPage)).toHaveCount(0);
        await expect(managerPage.locator('link[rel="stylesheet"]')).toHaveCount(0);
        await expect(managerPage.locator('.pkpSteps')).toHaveCount(0);
        await expect(managerPage.getByRole('link')).toHaveCount(0);
        await expect(managerPage).toHaveTitle('');

        // The draft is gone from the author's My Submissions: the "Active
        // submissions" view counts the spare draft alone and lists it
        // (positive control, read the same way), and no row carries the
        // cancelled draft's title.
        const page = await (await asUser(author.username)).newPage();
        const mySub = new MySubmissionsPage(page, server.path);
        await mySub.goto();
        await mySub.expectViewHeading('Active submissions', 1);
        await expect(mySub.row(`Submission ${tag}c`)).toBeVisible();
        await expect(mySub.row(new RegExp(`Submission ${tag}(?![a-z0-9])`))).toHaveCount(0);

        // Mailboxes: no email arrives on the cancel, in the author's
        // mailbox or the manager's. Positive control taken the same way:
        // the author's "Save for Later" on the spare draft, whose email is
        // sent after the cancel, so it bounds the silence.
        await page.goto(wizardUrl(server.path, spare.submissionId));
        await expectWizardOpen(page);
        await saveForLater(page);
        await pkpMail.find({to: author.email, subject: 'Resume your submission', timeoutMs: 30_000});
        expect(await pkpMail.count({to: author.email})).toBe(1);
        expect(await pkpMail.count({to: manager.email})).toBe(0);
    });

    test('S5: change the submission settings midway (section and language)', async ({opsApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s5');
        // Two open sections and two submission languages, seeded through
        // the context scenario (sections[] + supportedSubmissionLocales).
        const server = await seedServer(opsApi, tag, ['author'], {
            locales: ['en', 'fr_CA'],
            submissionLocales: ['en', 'fr_CA'],
            sections: [
                {abbrev: 'PRE', title: {en: 'Preprints'}},
                {abbrev: 'SEC', title: {en: 'Second Section'}},
            ],
        });

        const seeded = await seedDraft(opsApi, tag, {
            context: server.path,
            submitter: server.users.author.username,
        });

        // With two open sections and two languages, the wizard states what
        // is being submitted, with a "Change" control (Rules 7, 11).
        const page = await (await asUser(server.users.author.username)).newPage();
        await page.goto(wizardUrl(server.path, seeded.submissionId));
        await expectWizardOpen(page);
        await expect(submittingToLine(page)).toContainText(
            'Submitting to the Preprints section in English.'
        );

        // "Change Submission Settings" offers the section and the language;
        // pick the other pair and save: the wizard reloads and the line
        // names the new section and language (scenario 5).
        const modal = await openChangeSettings(page);
        await expect(modal.getByRole('radio', {name: 'Preprints', exact: true})).toBeChecked();
        await modal.getByRole('radio', {name: 'Second Section', exact: true}).check();
        await modal.getByRole('radio', {name: 'French (Canada)', exact: true}).check();
        await modal.getByRole('button', {name: 'Save', exact: true}).click();
        await expect(submittingToLine(page)).toContainText(
            /Submitting to the Second Section section in French/,
            {timeout: 30_000}
        );

        // Review, one panel per language: press "Continue" until Review:
        // the Details and For Readers panels each appear twice, once per
        // language (Rule 12); Files once (positive control, read the same
        // way).
        await expectStep(page, STEPS.files);
        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.readers);
        await openReview(page);
        await expect(reviewPanel(page, /^Details \(/)).toHaveCount(2);
        await expect(reviewPanel(page, 'Details (English)')).toBeVisible();
        await expect(reviewPanel(page, 'Details (French (Canada))')).toBeVisible();
        await expect(reviewPanel(page, /^For Readers \(/)).toHaveCount(2);
        await expect(reviewPanel(page, 'For Readers (English)')).toBeVisible();
        await expect(reviewPanel(page, 'For Readers (French (Canada))')).toBeVisible();
        await expect(reviewPanel(page, 'Files')).toHaveCount(1);

        // Positive control for the one-section bullets: this server's start
        // form offers the "Section" and "Submission Language" lists.
        await page.goto(startUrl(server.path));
        await expect(startFormLegend(page, 'Section')).toBeVisible({timeout: 20_000});
        await expect(startFormLegend(page, 'Submission Language')).toBeVisible();
        await expect(page.getByRole('radio', {name: 'Second Section', exact: true})).toBeVisible();
        await expect(page.getByRole('radio', {name: 'French (Canada)', exact: true})).toBeVisible();

        // One section, one language: the start form. On a second server at
        // the builder's defaults (one section, one submission language),
        // "Make a Submission" shows neither list; a title alone begins the
        // draft, no section having been asked for, and the wizard opens on
        // Upload Files (Rule 4).
        const single = await seedServer(opsApi, `${tag}s`, ['author']);
        const singlePage = await (await asUser(single.users.author.username)).newPage();
        await singlePage.goto(startUrl(single.path));
        await expect(
            singlePage.getByRole('button', {name: 'Begin Submission'})
        ).toBeVisible({timeout: 20_000});
        await expect(startFormLegend(singlePage, 'Section')).toHaveCount(0);
        await expect(startFormLegend(singlePage, 'Submission Language')).toHaveCount(0);
        await expect(singlePage.getByRole('radio')).toHaveCount(0);
        await beginSubmission(singlePage, {title: 'Single section'});

        // One section, one language: the wizard header. Above the step rail
        // no "Submitting to…" line and no "Change" control appear (Rule 11;
        // the first server's line above is the control; the submission's
        // own details line, read the same way, is the landmark).
        await expect(singlePage.locator('.submissionWizard__submissionDetails')).toContainText(
            'Single section'
        );
        await expect(submittingToLine(singlePage)).toHaveCount(0);
        await expect(singlePage.getByText(/^Submitting to the/)).toHaveCount(0);
        await expect(singlePage.getByRole('button', {name: 'Change', exact: true})).toHaveCount(0);

        // Control: the first server's draft, reopened from My Submissions,
        // still names the new section and language.
        const mySub = new MySubmissionsPage(page, server.path);
        await mySub.goto();
        const row = await mySub.findRowByTag(tag);
        await mySub.completeSubmissionButton(row).click();
        await expectWizardOpen(page);
        await expect(submittingToLine(page)).toContainText(
            /Submitting to the Second Section section in French/
        );
    });

    test('S6: validation blocks an empty submission until the file is fixed', async ({opsApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s6');
        const seeded = await seedDraft(opsApi, tag);

        const page = await (await asUser('author.alex')).newPage();
        await page.goto(wizardUrl(PK, seeded.submissionId, {localePrefix: PK_PREFIX}));
        await expectWizardOpen(page);

        // Straight to Review on "Continue" alone (scenario 6).
        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.readers);
        await openReview(page);

        // The problems banner, the missing-galley complaint on the Files
        // panel, and a disabled Submit (Rules 12–14; the required file type
        // is the server's "Preprint Text" component — OPS1).
        await expect(problemsBanner(page)).toContainText(PROBLEMS_BANNER);
        const filesPanel = reviewPanel(page, 'Files');
        await expect(filesPanel).toContainText(
            /upload at least one Preprint Text file/
        );
        await expect(submitButton(page)).toBeDisabled();

        // The panel's "Edit" jumps back to Upload Files; fix the item and
        // return: the complaint is gone and Submit enables.
        await filesPanel.getByRole('button', {name: 'Edit', exact: true}).click();
        await expectStep(page, STEPS.files);
        await addGalleyFile(page);
        await openReview(page, {viaRail: true});
        await expect(problemsBanner(page)).toHaveCount(0);
        await expect(filesPanel).not.toContainText(
            /upload at least one Preprint Text file/
        );
        await expect(submitButton(page)).toBeEnabled();

        // A section that waives abstracts (Rule 13): the seeded server's one
        // section requires an abstract, so a scratch server carries a
        // second section seeded `abstractsNotRequired: true`. A third
        // draft, begun from the start form in that section so nothing is
        // filled in: on Details the "Abstract" label carries no "Required"
        // mark (positive control: "Title" does); straight to Review, the
        // Details panel raises no abstract complaint, its Abstract item
        // reading "None provided", while the Files panel's missing-galley
        // complaint shows the check ran. Positive control, read the same
        // way: a fourth draft begun in the abstract-requiring section,
        // whose Abstract label carries the mark and whose Details panel
        // does complain.
        const waiving = await seedServer(opsApi, `${tag}w`, ['author'], {
            sections: [
                {abbrev: 'PRE', title: {en: 'Preprints'}},
                {abbrev: 'WAV', title: {en: 'Waived'}, abstractsNotRequired: true},
            ],
        });
        const waivingPage = await (await asUser(waiving.users.author.username)).newPage();
        await waivingPage.goto(startUrl(waiving.path));
        await beginSubmission(waivingPage, {title: `Submission ${tag}w`, section: 'Waived'});
        await expect(submittingToLine(waivingPage)).toContainText('Submitting to the Waived section');
        await continueTo(waivingPage, STEPS.details);
        await expect(wizardFieldLabel(waivingPage, /^Title/)).toContainText('Required');
        await expect(wizardFieldLabel(waivingPage, /^Abstract/)).toBeVisible();
        await expect(wizardFieldLabel(waivingPage, /^Abstract/)).not.toContainText('Required');
        await continueTo(waivingPage, STEPS.contributors);
        await continueTo(waivingPage, STEPS.readers);
        await openReview(waivingPage);
        await expect(problemsBanner(waivingPage)).toContainText(PROBLEMS_BANNER);
        await expect(reviewPanel(waivingPage, 'Files')).toContainText(
            /upload at least one Preprint Text file/
        );
        const waivedAbstract = reviewItem(reviewPanel(waivingPage, 'Details'), 'Abstract');
        await expect(waivedAbstract).toContainText('None provided');
        await expect(waivedAbstract).not.toContainText('This field is required.');
        await expect(reviewPanel(waivingPage, 'Details')).not.toContainText('This field is required.');

        await waivingPage.goto(startUrl(waiving.path));
        await beginSubmission(waivingPage, {title: `Submission ${tag}p`, section: 'Preprints'});
        await expect(submittingToLine(waivingPage)).toContainText('Submitting to the Preprints section');
        await continueTo(waivingPage, STEPS.details);
        await expect(wizardFieldLabel(waivingPage, /^Abstract/)).toContainText('Required');
        await continueTo(waivingPage, STEPS.contributors);
        await continueTo(waivingPage, STEPS.readers);
        await openReview(waivingPage);
        await expect(problemsBanner(waivingPage)).toContainText(PROBLEMS_BANNER);
        await expect(reviewItem(reviewPanel(waivingPage, 'Details'), 'Abstract')).toContainText(
            'This field is required.'
        );

        // A contributor named in another language only: on a bilingual
        // scratch server, a second draft's co-author is named in English,
        // then the submission language is switched to French (Canada)
        // through "Change Submission Settings" (Rule 11), so the co-author
        // has a name in another of the server's languages and none in the
        // submission language. Review: the banner, the Contributors panel's
        // complaint, and a disabled Submit (Rule 13).
        const server = await seedServer(opsApi, tag, ['author'], {
            locales: ['en', 'fr_CA'],
            submissionLocales: ['en', 'fr_CA'],
        });
        const author = server.users.author;
        const bilingual = await seedDraft(opsApi, `${tag}b`, {
            context: server.path,
            submitter: author.username,
        });
        const second = await (await asUser(author.username)).newPage();
        await second.goto(wizardUrl(server.path, bilingual.submissionId));
        await expectWizardOpen(second);
        await expect(submittingToLine(second)).toContainText('in English.');
        await addGalleyFile(second);
        await continueTo(second, STEPS.details);
        await continueTo(second, STEPS.contributors);
        await addContributor(second, {givenName: `Coauthor${tag}`, email: `${tag}co@mail.test`});
        const settings = await openChangeSettings(second);
        await settings.getByRole('radio', {name: 'French (Canada)', exact: true}).check();
        await settings.getByRole('button', {name: 'Save', exact: true}).click();
        await expect(submittingToLine(second)).toContainText('French (Canada)', {timeout: 30_000});
        await continueTo(second, STEPS.details);
        await continueTo(second, STEPS.contributors);
        await continueTo(second, STEPS.readers);
        await setRelationStatus(second);
        await openReview(second);
        await expect(problemsBanner(second)).toContainText(PROBLEMS_BANNER);
        await expect(reviewPanel(second, 'Contributors')).toContainText(
            'The given name is missing in French (Canada) for one or more of the contributors.'
        );
        await expect(submitButton(second)).toBeDisabled();
    });

    test('S7: the server stops accepting submissions', async ({opsApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s7');
        const server = await seedServer(opsApi, tag, ['manager', 'author']);

        // Positive control: with submissions open, the author's sidebar
        // offers the entry (Rule 1).
        const authorPage = await (await asUser(server.users.author.username)).newPage();
        await authorPage.goto(`/index.php/${server.path}/dashboard/mySubmissions`);
        await expect(
            authorPage.getByRole('link', {name: 'Start A New Submission'})
        ).toBeVisible({timeout: 20_000});

        // The manager disables submissions (Rule 2).
        const managerPage = await (await asUser(server.users.manager.username)).newPage();
        await setDisableSubmissions(managerPage, server.path, true);

        // The sidebar entry disappears, and the typed start address shows
        // only the not-accepting notice (scenario 7; wording per A3 as
        // shown — server-worded on OPS).
        await authorPage.goto(`/index.php/${server.path}/dashboard/mySubmissions`);
        await expect(
            authorPage.getByRole('link', {name: 'Start A New Submission'})
        ).toHaveCount(0);
        await authorPage.goto(startUrl(server.path));
        await expect(
            authorPage.getByText(
                'This server is not accepting submissions at this time. Visit the workflow settings to allow submissions.'
            )
        ).toBeVisible({timeout: 20_000});
        await expect(
            authorPage.getByRole('button', {name: 'Begin Submission'})
        ).toHaveCount(0);

        // Positive control: re-enabling brings the sidebar entry back.
        await setDisableSubmissions(managerPage, server.path, false);
        await authorPage.goto(`/index.php/${server.path}/dashboard/mySubmissions`);
        await expect(
            authorPage.getByRole('link', {name: 'Start A New Submission'})
        ).toBeVisible({timeout: 20_000});
    });

    test('S8: a draft outlives the closing and still submits', async ({opsApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s8');
        const server = await seedServer(opsApi, tag, ['manager', 'author']);
        const seeded = await seedDraft(opsApi, tag, {
            context: server.path,
            submitter: server.users.author.username,
        });

        // The manager closes submissions after the draft was started.
        const managerPage = await (await asUser(server.users.manager.username)).newPage();
        await setDisableSubmissions(managerPage, server.path, true);

        // The author's draft still opens as the normal wizard, and
        // completing it still submits (scenario 8 — as-built, ⚠ A1 open on
        // intent).
        const page = await (await asUser(server.users.author.username)).newPage();
        await page.goto(wizardUrl(server.path, seeded.submissionId));
        await expectWizardOpen(page);
        await expect(
            page.getByText('This server is not accepting submissions at this time', {
                exact: false,
            })
        ).toHaveCount(0);
        await completeAndSubmitDraft(page);

        // Control: on the same closed server the author's sidebar offers no
        // "Start A New Submission" (scenario 7).
        await page.goto(`/index.php/${server.path}/dashboard/mySubmissions`);
        await expect(page.getByRole('heading', {level: 1})).toBeVisible({timeout: 20_000});
        await expect(page.getByRole('link', {name: 'Start A New Submission'})).toHaveCount(0);
    });

    test('S9: a user with no submitting role is enrolled as Author; without self-registration the start screen refuses', async ({opsApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s9');
        const server = await seedServer(opsApi, tag, ['manager', 'reader', 'reader2']);

        // The bare reader holds no Author role yet: the profile's Roles tab
        // shows the self-registration "Author" box unchecked. (Checked
        // before any visit to the start screen — the enrolment timing
        // itself is register OPS2 and is not asserted.)
        const readerPage = await (await asUser(server.users.reader.username)).newPage();
        await readerPage.goto(`/index.php/${server.path}/user/profile`);
        await readerPage.getByRole('tab', {name: 'Roles'}).click();
        // Other servers' role checkboxes sit collapsed in the tab's
        // "other contexts" drawer (#userGroupExtraFormFields) — this
        // server's own Author box is the one outside it.
        const authorBox = readerPage.locator(
            'xpath=//form[@id="rolesForm"]//input[starts-with(@name, "authorGroup") and not(ancestor::div[@id="userGroupExtraFormFields"])]'
        );
        await expect(authorBox).toBeVisible({timeout: 20_000});
        await expect(authorBox).not.toBeChecked();

        // The start screen admits them and the wizard opens normally
        // (Rule 3, scenario 9).
        await readerPage.goto(startUrl(server.path));
        await beginSubmission(readerPage, {title: `Submission ${tag}`});

        // Afterwards the account holds the server's Author role.
        await readerPage.goto(`/index.php/${server.path}/user/profile`);
        await readerPage.getByRole('tab', {name: 'Roles'}).click();
        await expect(
            readerPage.locator(
                'xpath=//form[@id="rolesForm"]//input[starts-with(@name, "authorGroup") and not(ancestor::div[@id="userGroupExtraFormFields"])]'
            )
        ).toBeChecked({timeout: 20_000});

        // Control: the manager turns off the Author role's
        // self-registration; a second bare reader now gets "Not Allowed".
        const managerPage = await (await asUser(server.users.manager.username)).newPage();
        await managerPage.goto(`/index.php/${server.path}/management/settings/access`);
        await managerPage.locator('#roles-button').click();
        const authorRow = managerPage.locator('tr.gridRow').filter({
            has: managerPage.getByText('Author', {exact: true}),
        });
        await authorRow.locator('a.show_extras').click();
        await managerPage.getByRole('link', {name: 'Edit', exact: true}).click();
        const selfReg = managerPage.getByLabel('Allow user self-registration');
        await expect(selfReg).toBeVisible({timeout: 20_000});
        await selfReg.uncheck();
        await managerPage.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(selfReg).toBeHidden({timeout: 20_000});

        const reader2Page = await (await asUser(server.users.reader2.username)).newPage();
        await reader2Page.goto(startUrl(server.path));
        await expect(
            reader2Page.getByRole('heading', {name: 'Not Allowed'})
        ).toBeVisible({timeout: 20_000});
        // The page's explanation is a raw locale code on a preprint server
        // (register OPS7, not asserted); the start form staying withheld is
        // the control.
        await expect(
            reader2Page.getByRole('button', {name: 'Begin Submission'})
        ).toHaveCount(0);
    });

    test('S10: all contributors are acknowledged', async ({opsApi, pkpMail, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s10');

        // All authors (the default): a second contributor with a distinct
        // throwaway address; two acknowledgements — the submitting
        // author's and the co-author variant to the other contributor
        // (Side effects; the panel's own mechanics belong to Contributors
        // & affiliations).
        const server = await seedServer(opsApi, tag, ['author']);
        const author = server.users.author;
        const contributorEmail = `${tag}contrib@mail.test`;
        const seeded = await seedDraft(opsApi, tag, {
            context: server.path,
            submitter: author.username,
        });
        const page = await (await asUser(author.username)).newPage();
        await submitWithCoauthor(page, server.path, seeded, tag, contributorEmail);
        await pkpMail.find({to: author.email, subject: ACK_SUBJECT, timeoutMs: 30_000});
        await pkpMail.find({
            to: contributorEmail,
            subject: COAUTHOR_ACK_SUBJECT,
            contains: 'named as a co-author',
            timeoutMs: 30_000,
        });

        // Copies: a server whose Emails screen copies the server's contact
        // and an extra address (seeded through the acknowledgement copy
        // keys). Your acknowledgement carries both as blind copies; the
        // other contributor's message goes to them alone.
        const copiesTag = `${tag}c`;
        const contactEmail = `${copiesTag}contact@mail.test`;
        const extraEmail = `${copiesTag}extra@mail.test`;
        const copies = await seedServer(opsApi, copiesTag, ['author'], {
            context: {contactName: 'U21 Contact', contactEmail},
            settings: {copySubmissionAckPrimaryContact: true, copySubmissionAckAddress: extraEmail},
        });
        const copiesDraft = await seedDraft(opsApi, copiesTag, {
            context: copies.path,
            submitter: copies.users.author.username,
        });
        const copiesContributor = `${copiesTag}contrib@mail.test`;
        const copiesPage = await (await asUser(copies.users.author.username)).newPage();
        await submitWithCoauthor(copiesPage, copies.path, copiesDraft, copiesTag, copiesContributor);
        const ack = await pkpMail.find({to: copies.users.author.email, subject: ACK_SUBJECT, timeoutMs: 30_000});
        const ackFull = await pkpMail.fullMessage(ack.ID);
        expect((ackFull.Bcc || []).map((r) => r.Address).sort()).toEqual([contactEmail, extraEmail].sort());
        const coauthorAck = await pkpMail.find({
            to: copiesContributor,
            subject: COAUTHOR_ACK_SUBJECT,
            timeoutMs: 30_000,
        });
        const coauthorFull = await pkpMail.fullMessage(coauthorAck.ID);
        expect(coauthorFull.To.map((r) => r.Address)).toEqual([copiesContributor]);
        expect(coauthorFull.Cc || []).toEqual([]);
        expect(coauthorFull.Bcc || []).toEqual([]);

        // Submitting author only: one email, in your mailbox; none reaches
        // the other contributor (the author's own bounds the wait).
        const onlyTag = `${tag}o`;
        const only = await seedServer(opsApi, onlyTag, ['author'], {
            settings: {submissionAcknowledgement: 'submittingAuthor'},
        });
        const onlyDraft = await seedDraft(opsApi, onlyTag, {
            context: only.path,
            submitter: only.users.author.username,
        });
        const onlyContributor = `${onlyTag}contrib@mail.test`;
        const onlyPage = await (await asUser(only.users.author.username)).newPage();
        await submitWithCoauthor(onlyPage, only.path, onlyDraft, onlyTag, onlyContributor);
        await pkpMail.expectNone({
            to: onlyContributor,
            afterControl: {to: only.users.author.email, subject: ACK_SUBJECT, timeoutMs: 30_000},
        });
        expect(await pkpMail.count({to: only.users.author.email, subject: ACK_SUBJECT})).toBe(1);

        // Off: no acknowledgement arrives, to you or the other contributor
        // (the needs-an-editor email to the server's manager, sent by the
        // same submit, bounds the wait).
        const offTag = `${tag}f`;
        const off = await seedServer(opsApi, offTag, ['author', 'manager'], {
            settings: {submissionAcknowledgement: 'off'},
        });
        const offDraft = await seedDraft(opsApi, offTag, {
            context: off.path,
            submitter: off.users.author.username,
        });
        const offContributor = `${offTag}contrib@mail.test`;
        const offPage = await (await asUser(off.users.author.username)).newPage();
        await submitWithCoauthor(offPage, off.path, offDraft, offTag, offContributor);
        const control = {
            to: off.users.manager.email,
            subject: NEEDS_EDITOR_SUBJECT,
            contains: offTag,
            timeoutMs: 30_000,
        };
        await pkpMail.expectNone({to: off.users.author.email, subject: ACK_SUBJECT, afterControl: control});
        await pkpMail.expectNone({to: offContributor, afterControl: control});

        // Control: under all authors, a submission whose only contributor
        // is you produces one acknowledgement.
        const soloTag = `${tag}s`;
        const solo = await seedDraft(opsApi, soloTag, {
            context: server.path,
            submitter: author.username,
        });
        await page.goto(wizardUrl(server.path, solo.submissionId));
        await expectWizardOpen(page);
        await completeAndSubmitDraft(page);
        await pkpMail.find({
            to: author.email,
            subject: ACK_SUBJECT,
            contains: `Submission ${soloTag}`,
            timeoutMs: 30_000,
        });
        expect(
            await pkpMail.count({to: author.email, subject: ACK_SUBJECT, contains: `Submission ${soloTag}`})
        ).toBe(1);
    });

    test('S11: moderators learn of the new submission', async ({opsApi, pkpMail, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s11');

        // First half — a submission into the seeded server's section, whose
        // configured moderators are auto-assigned (the base server is the
        // install's oldest context, where assignment works — ⚠ A8 elsewhere;
        // the assignment email itself belongs to Stage participants).
        const assigned = await opsApi.createSubmission({
            tag: `${tag}a`,
            context: PK,
            submitter: 'author.alex',
        });
        const mayaPage = await (await asUser('manager.maya')).newPage();
        await mayaPage.goto(
            `/index.php/${PK}${PK_PREFIX}/dashboard/editorial?workflowSubmissionId=${assigned.submissionId}`
        );
        const workflow = mayaPage.locator('[data-cy="active-modal"]').first();
        await expect(
            workflow.getByRole('heading', {name: /^Workflow:/}).first()
        ).toBeVisible({timeout: 20_000});
        const participants = workflow.locator('[data-cy="workflow-secondary-items"]');
        await expect(participants.getByText('Ana Section Editor')).toBeVisible({
            timeout: 20_000,
        });
        await expect(participants.getByText('Ravi Section Editor')).toBeVisible();

        // Second half — a scratch server whose section has no moderators:
        // every manager gets the needs-an-editor email and a task
        // notification (Side effects; unique throwaway recipient).
        const server = await seedServer(opsApi, tag, ['manager', 'author']);
        const draft = await seedDraft(opsApi, tag, {
            context: server.path,
            submitter: server.users.author.username,
        });
        const authorPage = await (await asUser(server.users.author.username)).newPage();
        await authorPage.goto(wizardUrl(server.path, draft.submissionId));
        await expectWizardOpen(authorPage);
        await completeAndSubmitDraft(authorPage);

        await pkpMail.find({
            to: server.users.manager.email,
            subject: NEEDS_EDITOR_SUBJECT,
            contains: tag,
            timeoutMs: 30_000,
        });

        const managerPage = await (await asUser(server.users.manager.username)).newPage();
        await managerPage.goto(`/index.php/${server.path}/dashboard/editorial`);
        await managerPage.getByRole('button', {name: /^Tasks/}).first().click();
        const tasks = managerPage.locator('[data-cy="active-modal"]').last();
        await expect(tasks.getByRole('table').first()).toBeVisible({timeout: 20_000});
        await expect(
            tasks
                .getByText(
                    'A new preprint has been submitted to which a moderator needs to be assigned.'
                )
                .first()
        ).toBeVisible({timeout: 20_000});
    });

    test('S12: closed and restricted sections gate intake and block a draft', async ({opsApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s12');
        // Several open sections, Alpha with an abstract word limit of 10 and
        // Open Extra with a section policy (the `sections[].wordCount` and
        // `sections[].policy` passthroughs).
        const policy = `Open Extra takes short reports only (${tag}).`;
        const server = await seedServer(opsApi, tag, ['manager', 'author'], {
            sections: [
                {abbrev: 'ALP', title: {en: 'Alpha'}, wordCount: 10},
                {abbrev: 'OPN', title: {en: 'Open Extra'}, policy: {en: `<p>${policy}</p>`}},
                {abbrev: 'EDO', title: {en: 'Editors Only'}},
                {abbrev: 'DOO', title: {en: 'Doomed'}},
            ],
        });
        const author = server.users.author;
        const manager = server.users.manager;
        // The author's draft in the section that will be deactivated, one
        // in the word-limited section, and the manager's own drafts in the
        // section to be restricted and the section to be deactivated.
        const seeded = await seedDraft(opsApi, tag, {
            context: server.path,
            submitter: author.username,
            section: 'DOO',
        });
        const limited = await seedDraft(opsApi, `${tag}w`, {
            context: server.path,
            submitter: author.username,
            section: 'ALP',
        });
        const managerRestricted = await seedDraft(opsApi, `${tag}r`, {
            context: server.path,
            submitter: manager.username,
            section: 'EDO',
        });
        const managerDeactivated = await seedDraft(opsApi, `${tag}d`, {
            context: server.path,
            submitter: manager.username,
            section: 'DOO',
        });

        // The manager restricts one section to editors and deactivates
        // another (scenario 12, through the sections grid).
        const managerPage = await (await asUser(manager.username)).newPage();
        await gotoSections(managerPage, server.path);
        await setSectionFlag(managerPage, 'Editors Only', 'editorRestriction', true);
        await deactivateSection(managerPage, 'Doomed');

        // The author's start form offers only the open sections — neither
        // the restricted nor the deactivated one (Rule 3).
        const authorPage = await (await asUser(author.username)).newPage();
        await authorPage.goto(startUrl(server.path));
        await expect(
            authorPage.getByRole('radio', {name: 'Alpha', exact: true})
        ).toBeVisible({timeout: 20_000});
        await expect(
            authorPage.getByRole('radio', {name: 'Open Extra', exact: true})
        ).toBeVisible();
        await expect(
            authorPage.getByRole('radio', {name: 'Editors Only', exact: true})
        ).toHaveCount(0);
        await expect(
            authorPage.getByRole('radio', {name: 'Doomed', exact: true})
        ).toHaveCount(0);

        // A section's policy: picking Open Extra shows its policy under the
        // "Section" list, labelled with the section's title; Alpha, with
        // none, shows no policy (the control, read the same way).
        await expect(startFormLegend(authorPage, 'Section')).toBeVisible();
        await expect(sectionPolicy(authorPage, policy)).toHaveCount(0);
        await authorPage.getByRole('radio', {name: 'Open Extra', exact: true}).check();
        await expect(sectionPolicy(authorPage, policy)).toBeVisible();
        await expect(sectionPolicy(authorPage, policy)).toContainText('Open Extra');
        await authorPage.getByRole('radio', {name: 'Alpha', exact: true}).check();
        await expect(authorPage.getByRole('radio', {name: 'Alpha', exact: true})).toBeChecked();
        await expect(sectionPolicy(authorPage, policy)).toHaveCount(0);

        // The manager is additionally offered the restricted section — but
        // not the deactivated one (Rule 3).
        await managerPage.goto(startUrl(server.path));
        await expect(
            managerPage.getByRole('radio', {name: 'Editors Only', exact: true})
        ).toBeVisible({timeout: 20_000});
        await expect(
            managerPage.getByRole('radio', {name: 'Doomed', exact: true})
        ).toHaveCount(0);

        // Word limit: on the Alpha draft, a 14-word abstract makes Review's
        // Details panel report the abstract as too long; Submit is disabled
        // (Rule 13).
        await authorPage.goto(wizardUrl(server.path, limited.submissionId));
        await expectWizardOpen(authorPage);
        await addGalleyFile(authorPage);
        await continueTo(authorPage, STEPS.details);
        await fillRichText(authorPage, CONTROLS.abstract, LONG_ABSTRACT);
        await continueTo(authorPage, STEPS.contributors);
        await continueTo(authorPage, STEPS.readers);
        await setRelationStatus(authorPage);
        await openReview(authorPage);
        await expect(problemsBanner(authorPage)).toContainText(PROBLEMS_BANNER);
        await expect(reviewPanel(authorPage, 'Details')).toContainText('The abstract is too long');
        await expect(submitButton(authorPage)).toBeDisabled();

        // The author reopening the draft in the deactivated section gets
        // the "Section Closed" page naming the section and the server's
        // contact (Rule 17).
        await authorPage.goto(wizardUrl(server.path, seeded.submissionId));
        await expect(
            authorPage.getByRole('heading', {name: 'Section Closed'})
        ).toBeVisible({timeout: 20_000});
        await expect(
            authorPage.getByText(/is not accepting submissions to the Doomed section/)
        ).toBeVisible();
        await expect(authorPage.getByRole('link', {name: 'Site Admin'})).toBeVisible();

        // An editor's draft: the manager's own draft in the restricted
        // section opens as the wizard, and Review raises no section
        // complaint (the check passes outright).
        await managerPage.goto(wizardUrl(server.path, managerRestricted.submissionId));
        await expectWizardOpen(managerPage);
        await expect(managerPage.getByRole('heading', {name: 'Section Closed'})).toHaveCount(0);
        await addGalleyFile(managerPage);
        await continueTo(managerPage, STEPS.details);
        await continueTo(managerPage, STEPS.contributors);
        await continueTo(managerPage, STEPS.readers);
        await setRelationStatus(managerPage);
        await openReview(managerPage);
        await expect(reviewPanel(managerPage, 'Files')).toContainText('Preprint Text');
        await expect(
            managerPage.getByText(/is not accepting submissions to the Editors Only section/)
        ).toHaveCount(0);
        await expect(problemsBanner(managerPage)).toHaveCount(0);
        await expect(submitButton(managerPage)).toBeEnabled();

        // An editor's draft, the deactivated half: the manager's own draft
        // in the deactivated section answers its wizard address with the
        // same "Section Closed" page the author gets, naming the section,
        // and the wizard never opens (Rule 17; the restricted draft's wizard
        // above is the control).
        await managerPage.goto(wizardUrl(server.path, managerDeactivated.submissionId));
        await expect(
            managerPage.getByRole('heading', {name: 'Section Closed'})
        ).toBeVisible({timeout: 20_000});
        await expect(
            managerPage.getByText(/is not accepting submissions to the Doomed section/)
        ).toBeVisible();
        await expect(managerPage.getByRole('link', {name: 'Site Admin'})).toBeVisible();
        await expect(managerPage.locator('.pkpSteps')).toHaveCount(0);
        await expect(managerPage.getByRole('heading', {name: /Make a Submission/})).toHaveCount(0);

        // Every section closed: the manager deactivates the remaining open
        // sections too; the author's "Make a Submission" is the "Not
        // Allowed" page (Rule 3; the explanation is a raw locale code on a
        // preprint server — register OPS7, not asserted; the withheld start
        // form is the control).
        await gotoSections(managerPage, server.path);
        await deactivateSection(managerPage, 'Alpha');
        await deactivateSection(managerPage, 'Open Extra');
        await authorPage.goto(startUrl(server.path));
        await expect(
            authorPage.getByRole('heading', {name: 'Not Allowed'})
        ).toBeVisible({timeout: 20_000});
        await expect(
            authorPage.getByRole('button', {name: 'Begin Submission'})
        ).toHaveCount(0);

        // Control: reactivating deactivated sections (two, so the form
        // shows a choice at all; Rule 4) offers them to the author again,
        // and still not the one left deactivated.
        await gotoSections(managerPage, server.path);
        await setSectionFlag(managerPage, 'Alpha', 'isInactive', false);
        await setSectionFlag(managerPage, 'Open Extra', 'isInactive', false);
        await authorPage.goto(startUrl(server.path));
        await expect(
            authorPage.getByRole('radio', {name: 'Alpha', exact: true})
        ).toBeVisible({timeout: 20_000});
        await expect(
            authorPage.getByRole('radio', {name: 'Open Extra', exact: true})
        ).toBeVisible();
        await expect(
            authorPage.getByRole('radio', {name: 'Doomed', exact: true})
        ).toHaveCount(0);
    });

    test('S13+S14 (absence): no Reviewer Suggestions step, no Submission Type, no reader-site block', async ({opsApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s13');
        const page = await (await asUser('author.alex')).newPage();

        // The start form intakes by section, never by Submission Type
        // (scenario 14 is press-only — OMP1); positive control: the form
        // itself rendered.
        await page.goto(startUrl(PK, {localePrefix: PK_PREFIX}));
        await expect(
            page.getByRole('button', {name: 'Begin Submission'})
        ).toBeVisible({timeout: 20_000});
        await expect(page.getByText('Submission Type')).toHaveCount(0);

        // A draft's wizard shows exactly the five OPS steps — no Reviewer
        // Suggestions step, ever (scenario 13's stated OPS control; OPS1).
        const seeded = await seedDraft(opsApi, tag);
        await page.goto(wizardUrl(PK, seeded.submissionId, {localePrefix: PK_PREFIX}));
        await expectWizardOpen(page);
        const labels = await page
            .locator('.pkpSteps__buttons .pkpSteps__step__label')
            .allInnerTexts();
        expect(labels.map((label) => label.trim().replace(/^\d+\s*/, ''))).toEqual([
            STEPS.files,
            STEPS.details,
            STEPS.contributors,
            STEPS.readers,
            STEPS.review,
        ]);
        await expect(railEntry(page, STEPS.reviewerSuggestions)).toHaveCount(0);

        // The workflow settings offer no Review tab to enable suggestions
        // from (the setting lives in review settings OPS does not install);
        // positive control: the Submission tab is there.
        const mayaPage = await (await asUser('manager.maya')).newPage();
        await mayaPage.goto(`/index.php/${PK}/management/settings/workflow`);
        await expect(
            mayaPage.getByRole('tab', {name: 'Submission', exact: true})
        ).toBeVisible({timeout: 20_000});
        await expect(mayaPage.getByRole('tab', {name: 'Review', exact: true})).toHaveCount(0);

        // Scenario 1's "Preprint server" bullet: the "Make a Submission"
        // block plugin is not listed under Settings › Website › Plugins
        // (Rule 1); positive control: the plugin list shows its other block
        // plugins.
        await mayaPage.goto(`/index.php/${PK}/management/settings/website`);
        await mayaPage.getByRole('tab', {name: 'Plugins', exact: true}).first().click();
        const pluginsPanel = mayaPage.getByRole('tabpanel', {name: 'Plugins'}).first();
        await expect(
            pluginsPanel.getByText('Language Toggle Block').first()
        ).toBeVisible({timeout: 20_000});
        await expect(pluginsPanel.getByText(/Make a Submission.*Block/)).toHaveCount(0);

        // …and the reader site's sidebar offers no such block; positive
        // control: the site's navigation rendered.
        await mayaPage.goto(`/index.php/${PK}${PK_PREFIX}`);
        await expect(mayaPage.getByRole('link', {name: 'About', exact: true}).first()).toBeVisible({
            timeout: 20_000,
        });
        await expect(mayaPage.getByRole('heading', {name: 'Latest preprints'})).toBeVisible();
        await expect(mayaPage.getByText('Make a Submission')).toHaveCount(0);
    });

    test('S15: the preprint wizard is galley-based; a can-post submitter gets the post-it variant', async ({opsApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s15');
        const server = await seedServer(opsApi, tag, ['manager']);
        const manager = server.users.manager;
        const seeded = await seedDraft(opsApi, tag, {
            context: server.path,
            submitter: manager.username,
        });

        const page = await (await asUser(manager.username)).newPage();
        await page.goto(wizardUrl(server.path, seeded.submissionId));
        await expectWizardOpen(page);

        // The galley flow: "Add File" asks for the Galley Label first, then
        // the upload demands the Preprint Component (scenario 15 / OPS1).
        await addGalleyFile(page, {label: 'PDF'});

        // The fourth step is "For Readers": a License choice, the required
        // "Relation status" question, and "Comments for the Moderator".
        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.readers);
        await expect(page.getByRole('heading', {name: 'License', exact: true})).toBeVisible();
        await expect(page.getByRole('radio', {name: 'CC Attribution 4.0', exact: true})).toBeVisible();
        const relationGroup = page.getByRole('group', {name: /Relation status/});
        await expect(relationGroup).toBeVisible();
        await expect(relationGroup).toContainText('Required');
        await expect(
            page.locator('label').filter({hasText: MODERATOR_NOTE})
        ).toBeVisible();
        await setRelationStatus(page);

        // Review lists the galley under its "Files" panel with its label
        // and component (OPS1).
        await openReview(page);
        await expect(problemsBanner(page)).toHaveCount(0);
        const filesPanel = reviewPanel(page, 'Files');
        await expect(filesPanel.getByRole('link', {name: 'PDF'}).first()).toBeVisible();
        await expect(filesPanel).toContainText('Preprint Text');

        // Control — a submitter who may post their own preprint: the
        // confirmation dialog and the completion screen carry the can-post
        // variant (OPS1; no mail assertion here — register OPS5).
        await confirmSubmit(page, {message: SUBMIT_DIALOGS.canPost});
        await expect(
            page.getByText('Thank you for submitting your preprint. You can now')
        ).toBeVisible();
        await expect(page.getByRole('link', {name: 'post your preprint'})).toBeVisible();
    });

    test('S16: the copyright confirmation gates Submit and is logged', async ({opsApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s16');

        // A server with a copyright notice (seeded through
        // `copyrightNotice`), a complete draft at Review (scenario 16).
        const server = await seedServer(opsApi, tag, ['author', 'manager'], {
            settings: {copyrightNotice: `<p>Copyright notice ${tag}.</p>`},
        });
        const author = server.users.author;
        const seeded = await seedDraft(opsApi, tag, {
            context: server.path,
            submitter: author.username,
        });
        const page = await (await asUser(author.username)).newPage();
        await page.goto(wizardUrl(server.path, seeded.submissionId));
        await expectWizardOpen(page);
        await addGalleyFile(page);
        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.readers);
        await setRelationStatus(page);
        await openReview(page);

        // The check passes with no banner; a final "Confirmation" section
        // asks for the copyright agreement, and "Submit" stays disabled
        // while the box is unticked (Rules 12, 14).
        await expect(problemsBanner(page)).toHaveCount(0);
        await expect(confirmationHeading(page)).toBeVisible();
        await expect(page.getByText(`Copyright notice ${tag}.`)).toBeVisible();
        const box = copyrightCheckbox(page);
        await expect(box).toBeVisible();
        await expect(box).not.toBeChecked();
        await expect(submitButton(page)).toBeDisabled();

        // Tick it, submit, confirm: "Submission complete".
        await box.check();
        await expect(submitButton(page)).toBeEnabled();
        await confirmSubmit(page, {message: SUBMIT_DIALOGS.moderated});

        // "Review this submission" opens the workflow; its activity log
        // holds the "submission submitted" entry and a "copyright agreed"
        // entry (Side effects; the log is read by the server's manager, who
        // has the "Activity Log" control; the entry's leading placeholder
        // is A5's and is not asserted).
        await page.getByRole('link', {name: 'Review this submission'}).click();
        await expect(
            authorWorkflow(page).getByRole('navigation').getByText('Title & Abstract')
        ).toBeVisible({timeout: 30_000});
        const managerPage = await (await asUser(server.users.manager.username)).newPage();
        await openEditorial(managerPage, server.path, seeded.submissionId);
        const rows = await activityLogRows(managerPage);
        await expect(rows.filter({hasText: SUBMITTED_LOG_LINE})).toHaveCount(1);
        await expect(
            rows.filter({hasText: `(${author.username}) agreed to the copyright terms for submission.`})
        ).toHaveCount(1);
    });

    test('S17: required metadata blocks the submit', async ({opsApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s17');

        // A server whose setup requires keywords during submission and asks
        // for subjects and a data availability statement without requiring
        // them (seeded through `metadata: {keywords: 'require', subjects:
        // 'request', dataAvailability: 'request'}`), a complete draft
        // (scenario 17).
        const server = await seedServer(opsApi, tag, ['author'], {
            settings: {metadata: {keywords: 'require', subjects: 'request', dataAvailability: 'request'}},
        });
        const author = server.users.author;
        const seeded = await seedDraft(opsApi, tag, {
            context: server.path,
            submitter: author.username,
        });
        const page = await (await asUser(author.username)).newPage();
        await page.goto(wizardUrl(server.path, seeded.submissionId));
        await expectWizardOpen(page);
        await addGalleyFile(page);

        // "Details" shows a "Keywords" field; leave it empty and reach
        // Review: the problems banner, the keywords complaint on the
        // Details panel, and a disabled Submit (Rule 13).
        await continueTo(page, STEPS.details);
        await expect(wizardField(page, /^Keywords/)).toBeVisible();
        await expect(wizardFieldLabel(page, /^Keywords/)).toContainText('Required');
        // Asked, not required: "Details" also shows a data availability
        // statement and "For Readers" a field for subjects, neither marked
        // required (the Keywords mark above is the control); both stay
        // empty.
        await expect(wizardField(page, /^Data Availability Statement/)).toBeVisible();
        await expect(wizardFieldLabel(page, /^Data Availability Statement/)).not.toContainText('Required');
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.readers);
        await expect(wizardField(page, /^Subjects/)).toBeVisible();
        await expect(wizardFieldLabel(page, /^Subjects/)).not.toContainText('Required');
        await setRelationStatus(page);
        await openReview(page);
        await expect(problemsBanner(page)).toContainText(PROBLEMS_BANNER);
        const detailsPanel = reviewPanel(page, 'Details');
        const keywordsItem = reviewItem(detailsPanel, 'Keywords');
        await expect(keywordsItem).toContainText('This field is required.');
        await expect(submitButton(page)).toBeDisabled();

        // With both left empty, "Review" raises no complaint about either
        // (the keywords complaint above, read the same way, is the
        // control): their items read "None provided" and the For Readers
        // panel flags nothing.
        const dataItem = reviewItem(detailsPanel, 'Data Availability Statement');
        await expect(dataItem).toContainText('None provided');
        await expect(dataItem).not.toContainText('This field is required.');
        const readersPanel = reviewPanel(page, 'For Readers');
        const subjectsItem = reviewItem(readersPanel, 'Subjects');
        await expect(subjectsItem).toContainText('None provided');
        await expect(subjectsItem).not.toContainText('This field is required.');
        await expect(readersPanel).not.toContainText('This field is required.');

        // "Edit" on the Details panel, type the keyword, return: the
        // complaint is gone and Submit is enabled.
        await detailsPanel.getByRole('button', {name: 'Edit', exact: true}).click();
        await expectStep(page, STEPS.details);
        await addKeyword(page, 'wizard');
        await openReview(page, {viaRail: true});
        await expect(problemsBanner(page)).toHaveCount(0);
        await expect(keywordsItem).toContainText('wizard');
        await expect(keywordsItem).not.toContainText('This field is required.');
        await expect(submitButton(page)).toBeEnabled();
        // "Submit" stays enabled with the asked-not-required items still
        // empty: nothing on their panels is flagged after the fix either.
        await expect(dataItem).toContainText('None provided');
        await expect(subjectsItem).toContainText('None provided');
        await expect(readersPanel).not.toContainText('This field is required.');

        // Keywords at the install default: on the seeded server, which asks
        // for keywords without requiring them, "Details" shows a "Keywords"
        // field not marked required (positive control: the "Abstract"
        // label's mark, and the require-server's Keywords mark above, read
        // the same way), and "Review" passes with it empty.
        const alexDraft = await seedDraft(opsApi, `${tag}k`);
        const alex = await (await asUser('author.alex')).newPage();
        await alex.goto(wizardUrl(PK, alexDraft.submissionId, {localePrefix: PK_PREFIX}));
        await expectWizardOpen(alex);
        await addGalleyFile(alex);
        await continueTo(alex, STEPS.details);
        await expect(wizardFieldLabel(alex, /^Abstract/)).toContainText('Required');
        await expect(wizardField(alex, /^Keywords/)).toBeVisible();
        await expect(wizardFieldLabel(alex, /^Keywords/)).not.toContainText('Required');
        await continueTo(alex, STEPS.contributors);
        await continueTo(alex, STEPS.readers);
        await setRelationStatus(alex);
        await openReview(alex);
        await expect(reviewPanel(alex, 'Files')).toContainText('Preprint Text');
        await expect(problemsBanner(alex)).toHaveCount(0);
        await expect(reviewItem(reviewPanel(alex, 'Details'), 'Keywords')).toContainText('None provided');
        await expect(submitButton(alex)).toBeEnabled();

        // Control: on a server whose setup does not ask for keywords (a
        // scratch server seeded `metadata: {keywords: 'off'}`, since the
        // seeded server asks for them by install default), "Details" shows
        // no "Keywords" field (positive control: the Title field, read the
        // same way) and Review passes without one.
        const offTag = `${tag}c`;
        const off = await seedServer(opsApi, offTag, ['author'], {
            settings: {metadata: {keywords: 'off'}},
        });
        const control = await seedDraft(opsApi, offTag, {
            context: off.path,
            submitter: off.users.author.username,
        });
        const offPage = await (await asUser(off.users.author.username)).newPage();
        await offPage.goto(wizardUrl(off.path, control.submissionId));
        await expectWizardOpen(offPage);
        await addGalleyFile(offPage);
        await continueTo(offPage, STEPS.details);
        await expect(wizardField(offPage, /^Title/)).toBeVisible();
        await expect(wizardField(offPage, /^Keywords/)).toHaveCount(0);
        await continueTo(offPage, STEPS.contributors);
        await continueTo(offPage, STEPS.readers);
        await setRelationStatus(offPage);
        await openReview(offPage);
        await expect(problemsBanner(offPage)).toHaveCount(0);
        await expect(submitButton(offPage)).toBeEnabled();
    });
});
