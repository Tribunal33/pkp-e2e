// @ts-check
/**
 * @file playwright/tests/U21-submission-wizard.spec.js
 *
 * U21 — Submission wizard, OMP suite (spec:
 * docs/specs/U21-submission-wizard.md). One test per canonical scenario a
 * press runs, in OMP vocabulary (press, monograph, Submission Type, "Cover
 * Note to Editor" — glossary substitution): common scenarios 1–11, 16 and
 * 17, then the OMP-specific scenarios 13 and 14 plus the press absence of
 * scenario 12's section machinery (OMP1). Scenario 15 is OPS-only (galley
 * intake) and has no press analogue. What the scenarios leave out is the
 * spec's Coverage section.
 *
 * Deliberate non-coverage (register IDs from the spec's Findings register —
 * 🐞 findings are never asserted as contract; ❓-parked claims are not
 * coverage gaps):
 * - A4 (🐞): S3 waits for the autosave itself; nothing is asserted about the
 *   footer's "Last saved" reading before a save has run.
 * - A5 (🐞): S16 reads the activity log's copyright entry by its tail
 *   ("agreed to the copyright terms"); its leading placeholder is not
 *   asserted either way.
 * - A6 (🐞): no double-submit is attempted.
 * - A7 (🐞): S10's "Off" leg asserts the silence only; nothing is asserted
 *   about the completion screen's email sentence with acknowledgements off.
 * - A2 (❓): S3 asserts the ordinary case (the submitting author presses
 *   "Save for Later"); who gets the email when a manager presses it is not
 *   asserted either way.
 * - A1 (❓ on intent): S8 asserts the as-built behavior the spec's canonical
 *   scenario 8 describes (a draft outlives the closing).
 * - A8 (🐞): S11's auto-assignment half runs on the seeded press — the
 *   install's oldest context, where assignment works; nothing is asserted
 *   about auto-assignment on scratch presses.
 *
 * Seeding: scenario endpoints only. Drafts (`submitted: false`) on the
 * read-only `publicknowledge` press for author-only flows; scratch presses
 * (with throwaway users carrying unique mail.test addresses) wherever a
 * setting differs from the install default (seeded through the context
 * passthrough keys: `copyrightNotice`, `metadata`,
 * `submissionAcknowledgement` and its copies, `supportedSubmissionLocales`)
 * or Mailpit is read (PRINCIPLES A8 — every mail assertion is scoped by a
 * unique throwaway recipient). S5 runs on two scratch presses (two
 * submission languages; the builder's defaults) as its given says. The
 * settings scenarios 7, 8, 9 and 13 switch their setting through the
 * manager's own screen, as the spec's bullets say. All tests run in the
 * parallel `omp` project; nothing global is touched.
 */
const {test, expect} = require('../support/fixtures.js');
const {
    STEPS,
    CONTROLS,
    startUrl,
    wizardUrl,
    footer,
    submitButton,
    submittingToLine,
    railEntry,
    railButton,
    backButton,
    backTo,
    expectStep,
    gotoStep,
    expectWizardOpen,
    beginSubmission,
    continueTo,
    uploadWizardFile,
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
    startFormLegend,
    addKeyword,
    contributorRows,
    addContributor,
    confirmSubmit,
    completeAndSubmitDraft,
    saveForLater,
    cancelDraft,
    openChangeSettings,
} = require('../pages/SubmissionWizardPages.js');
const {
    openEditorial,
    openAuthorView,
    secondaryRegion,
    openTasksPanel,
} = require('../pages/ReviewStagePages.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {MySubmissionsPage} = require('../../../../shared/playwright/pages/MySubmissionsPage.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');

const PK = 'publicknowledge';
const PK_PREFIX = '/en';

const WORK_TYPES = {
    monograph: 'Monograph: Authors are associated with the book as a whole.',
    editedVolume: 'Edited Volume: Authors are associated with their own chapter.',
};

const ACK_SUBJECT = 'Thank you for your submission';
const COAUTHOR_ACK_SUBJECT = 'Submission confirmation';
const NEEDS_EDITOR_SUBJECT = 'needs an editor to be assigned';
/** The press's "Comments for the Editor" box, discussion and email title. */
const EDITOR_NOTE = 'Cover Note to Editor';
const SUBMITTED_LOG_LINE = 'Initial submission completed.';

/** Parallel-safe unique tag: single alphanumeric token, ≤32 chars. */
function makeTag(testInfo, scenarioKey) {
    const rand = Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 6);
    return `${scenarioKey}ompw${testInfo.parallelIndex}${rand}`;
}

/**
 * Seed a scratch press whose path is the tag, with throwaway users
 * (usernames prefixed by the tag so their mail.test addresses are unique
 * per run) and any context passthrough keys (`settings`) the scenario's
 * given names. Returns {path, users: {key: {username, email, name}}}.
 */
async function seedPress(ompApi, tag, userKeys, {settings = {}, context = {}} = {}) {
    const roleByKey = {
        manager: ['manager'],
        author: ['author'],
        seriesEditor: ['sectionEditor'],
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
    await ompApi.createContext({
        tag,
        context: {name: {en: `U21 Press ${tag}`}, ...context},
        users: specs,
        ...settings,
    });
    return {path: tag, users};
}

/** Seed a wizard-resumable draft; returns the scenario response. */
async function seedDraft(ompApi, tag, {context = PK, submitter = 'author.alex', ...rest} = {}) {
    return ompApi.createSubmission({
        tag,
        context,
        submitter,
        submitted: false,
        ...rest,
    });
}

/**
 * As the press manager of a scratch press, tick or untick the workflow
 * settings' "Disable Submissions" box (Settings → Workflow → Submission).
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

/**
 * On the open workflow screen, open "Activity Log" and return the History
 * table's rows (the dialog loads them after it opens; the table bounds the
 * read).
 */
async function activityLogRows(page) {
    await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
    const log = page.getByRole('dialog', {name: /Activity Log/});
    await expect(log.getByRole('table').first()).toBeVisible({timeout: 30_000});
    return log.getByRole('row');
}

/**
 * Walk a draft to Review with one uploaded file and a second contributor
 * added on the Contributors step, then submit (scenario 10's drafts).
 */
async function submitWithCoauthor(page, contextPath, seeded, tag, contributorEmail) {
    await page.goto(wizardUrl(contextPath, seeded.submissionId));
    await expectWizardOpen(page);
    await uploadWizardFile(page, `ms-${tag}.txt`);
    await continueTo(page, STEPS.details);
    await continueTo(page, STEPS.contributors);
    await addContributor(page, {givenName: `Coauthor${tag}`, email: contributorEmail});
    await continueTo(page, STEPS.editors);
    await openReview(page);
    await expect(problemsBanner(page)).toHaveCount(0);
    await confirmSubmit(page);
}

test.describe('Submission wizard (U21)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test('S1: start a submission from the dashboard sidebar', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s1');
        const page = await (await asUser('author.alex')).newPage();

        // The sidebar offers "Start A New Submission" (Rule 1)…
        await page.goto(`/index.php/${PK}${PK_PREFIX}/dashboard/mySubmissions`);
        await page.getByRole('link', {name: 'Start A New Submission'}).click();

        // …which lands on the "Make a Submission" start form; fill it and
        // begin (scenario 1; the Submission Type asked in place of a
        // section is OMP1).
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
        const press = await seedPress(ompApi, tag, ['author']);
        const author = press.users.author;
        const bare = await (await asUser(author.username)).newPage();
        await bare.goto(startUrl(press.path));
        await beginSubmission(bare, {title: `Submission ${tag}b`});
        await continueTo(bare, STEPS.details);
        await continueTo(bare, STEPS.contributors);
        const row = contributorRows(bare).filter({hasText: author.name});
        await expect(row).toBeVisible({timeout: 20_000});
        await expect(row.locator('.pkpBadge').filter({hasText: 'Primary Contact'})).toBeVisible();
        await expect(contributorRows(bare)).toHaveCount(1);
    });

    test('S2: fill every step and submit; the acknowledgement arrives', async ({ompApi, pkpMail, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s2');
        const press = await seedPress(ompApi, tag, ['author', 'manager']);
        const author = press.users.author;
        const seeded = await seedDraft(ompApi, tag, {
            context: press.path,
            submitter: author.username,
        });
        const second = await seedDraft(ompApi, `${tag}b`, {
            context: press.path,
            submitter: author.username,
        });

        const page = await (await asUser(author.username)).newPage();
        await page.goto(wizardUrl(press.path, seeded.submissionId));
        await expectWizardOpen(page);

        // Upload a manuscript, pass every step, reach Review (scenario 2;
        // the press asks no abstract — OMP1): the check clears with no
        // banner, and with no copyright notice on this press Review has no
        // "Confirmation" section (scenario 16's control; positive control:
        // the Files panel read the same way).
        await uploadWizardFile(page, `ms-${tag}.txt`);
        await continueTo(page, STEPS.details);
        const detailsHash = new URL(page.url()).hash;
        const detailsHashRe = new RegExp(`${detailsHash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
        expect(detailsHash, 'each step pushes its own "#…" part').toMatch(/^#./);
        await continueTo(page, STEPS.contributors);

        // "Back" and the step rail (Rule 8): on Contributors the "#…" part
        // of the address has moved on from Details'; "Back" shows Details
        // again, the tab title reads "Make a Submission: Details" and the
        // address carries Details' "#…" part once more. "Back" once more:
        // Upload Files, which offers no "Back" of its own (positive
        // control: its "Continue", read the same way).
        await expect(page).not.toHaveURL(detailsHashRe);
        await backTo(page, STEPS.details);
        await expect(page).toHaveTitle(/^Make a Submission: Details\b/);
        await expect(page).toHaveURL(detailsHashRe);
        await backTo(page, STEPS.files);
        await expect(page).not.toHaveURL(detailsHashRe);
        await expect(footer(page).getByRole('button', {name: 'Continue', exact: true})).toBeVisible();
        await expect(backButton(page)).toHaveCount(0);

        // In the rail, "Details", already reached, is a button and reopens
        // directly; "Review", not yet reached, is plain text, not a button,
        // and pressing its label changes nothing (the current step stays
        // Upload Files).
        await expect(railButton(page, /Details\s*$/)).toHaveCount(1);
        await expect(railEntry(page, /Review\s*$/)).toBeVisible();
        await expect(railButton(page, /Review\s*$/)).toHaveCount(0);
        await railEntry(page, /Review\s*$/).click();
        await expectStep(page, STEPS.files);
        await gotoStep(page, STEPS.details);
        await expect(page).toHaveURL(detailsHashRe);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.editors);
        await openReview(page);
        await expect(problemsBanner(page)).toHaveCount(0);
        await expect(reviewPanel(page, 'Files').getByRole('heading', {name: 'Files'})).toBeVisible();
        await expect(confirmationHeading(page)).toHaveCount(0);
        await expect(copyrightCheckbox(page)).toHaveCount(0);
        await confirmSubmit(page);

        // The completion screen offers the three links (Rule 15).
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
        // author's own view.
        await page.getByRole('link', {name: 'Review this submission'}).click();
        await expect(
            page
                .locator('[data-cy="active-modal"]')
                .getByRole('heading', {name: /^Workflow:/})
                .first()
        ).toBeVisible({timeout: 30_000});

        // The submission's activity log holds the "submission submitted"
        // entry (Side effects; the log is read on the workflow screen by
        // the press manager, who has the "Activity Log" control).
        const managerPage = await (await asUser(press.users.manager.username)).newPage();
        await openEditorial(managerPage, press.path, seeded.submissionId);
        await expect(
            (await activityLogRows(managerPage)).filter({hasText: SUBMITTED_LOG_LINE})
        ).toHaveCount(1);

        // The wizard address after submitting answers "Submission complete"
        // with no "Cancel" control (Rules 6, 15, 16); control: the second,
        // unsubmitted draft answers its address with the wizard itself and
        // "Cancel" in its footer.
        await page.goto(wizardUrl(press.path, seeded.submissionId));
        await expect(page.getByRole('heading', {name: 'Submission complete'})).toBeVisible({
            timeout: 20_000,
        });
        await expect(page.locator('#cancelSubmission')).toHaveCount(0);
        await page.goto(wizardUrl(press.path, second.submissionId));
        await expectWizardOpen(page);
        await expect(footer(page).locator('#cancelSubmission')).toBeVisible();

        // Comments for the Editor: on the second draft (the scratch press
        // has no editor assigned), type the note in the For the Editors
        // step's box — a press labels it "Cover Note to Editor" — and
        // submit: the workflow shows the note as a discussion, and a copy
        // of it arrives in your mailbox, you being its only participant.
        const note = 'Please note the data set is under embargo.';
        await uploadWizardFile(page, `ms-${tag}b.txt`);
        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.editors);
        await expect(wizardField(page, new RegExp(`^${EDITOR_NOTE}`))).toBeVisible();
        await fillRichText(page, CONTROLS.editorNote, note);
        await openReview(page);
        await expect(problemsBanner(page)).toHaveCount(0);
        await confirmSubmit(page);
        await page.getByRole('link', {name: 'Review this submission'}).click();
        const discussions = page.locator('[data-cy="discussion-manager"]').first();
        await expect(
            discussions.getByRole('heading', {name: 'Desk Review Tasks & Discussions'})
        ).toBeVisible({timeout: 30_000});
        const discussionRow = discussions.getByRole('row').filter({hasText: EDITOR_NOTE});
        await expect(discussionRow).toBeVisible({timeout: 30_000});
        await expect(discussionRow).toContainText(`Created by: ${author.username}`);
        const copy = await pkpMail.find({
            to: author.email,
            subject: EDITOR_NOTE,
            contains: 'under embargo',
            timeoutMs: 30_000,
        });
        expect(copy.To.map((r) => r.Address)).toEqual([author.email]);
    });

    test('S3: save for later and resume from the emailed link', async ({ompApi, pkpMail, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s3');
        const press = await seedPress(ompApi, tag, ['author']);
        const author = press.users.author;
        const seeded = await seedDraft(ompApi, tag, {
            context: press.path,
            submitter: author.username,
        });
        const second = await seedDraft(ompApi, `${tag}b`, {
            context: press.path,
            submitter: author.username,
        });

        const page = await (await asUser(author.username)).newPage();
        // The wizard's autosave clock is the page's own: its timer saves
        // when a minute has passed since the last save. Install the browser
        // clock before the wizard loads so the minute can be handed to the
        // page instead of waited out (A5: no sleeps).
        await page.clock.install();
        await page.goto(wizardUrl(press.path, seeded.submissionId));
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
        // link naming the draft's contributors and title, and the
        // emailed-copy note (Rule 10).
        await saveForLater(page);
        const resumeLink = page.locator(`a[href*="/submission?id=${seeded.submissionId}"]`);
        await expect(resumeLink).toBeVisible();
        await expect(resumeLink).toContainText(author.name.split(' ')[1]);
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
        await page.goto(`/index.php/${press.path}/login/signOut`);
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
        await page.goto(wizardUrl(press.path, second.submissionId));
        await expectWizardOpen(page);
        await continueTo(page, STEPS.details);
        const mySub = new MySubmissionsPage(page, press.path);
        await mySub.goto();
        const row = await mySub.findRowByTag(`${tag}b`);
        await mySub.completeSubmissionButton(row).click();
        await expectWizardOpen(page);
        expect(page.url()).toContain(`id=${second.submissionId}`);
        await expectStep(page, STEPS.files);
    });

    test('S4: cancel a draft; a manager cancels another author\'s; an assigned series editor gets no Cancel', async ({ompApi, pkpMail, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s4');
        const press = await seedPress(ompApi, tag, ['author', 'manager', 'seriesEditor']);
        const author = press.users.author;
        const manager = press.users.manager;
        const own = await seedDraft(ompApi, tag, {
            context: press.path,
            submitter: author.username,
        });
        // The manager's and the Series Editor's draft: the editor is
        // assigned as a participant (the given the tooling builds: the
        // same row the Participants panel's "Assign Participant" writes).
        const other = await seedDraft(ompApi, `${tag}b`, {
            context: press.path,
            submitter: author.username,
            participants: [{username: press.users.seriesEditor.username, role: 'sectionEditor'}],
        });
        const spare = await seedDraft(ompApi, `${tag}c`, {
            context: press.path,
            submitter: author.username,
        });
        const ownUrl = wizardUrl(press.path, own.submissionId);
        const otherUrl = wizardUrl(press.path, other.submissionId);

        // Control: the assigned Series Editor gets the wizard — Save for
        // Later and Continue offered — but no "Cancel" (Rule 16).
        const editorPage = await (await asUser(press.users.seriesEditor.username)).newPage();
        await editorPage.goto(otherUrl);
        await expectWizardOpen(editorPage);
        await expect(
            footer(editorPage).getByRole('button', {name: 'Continue', exact: true})
        ).toBeVisible();
        await expect(
            footer(editorPage).getByRole('button', {name: 'Save for Later', exact: true})
        ).toBeVisible();
        await expect(editorPage.locator('#cancelSubmission')).toHaveCount(0);

        // The submitting author cancels their own draft: warning dialog,
        // then the "Submission cancelled" screen with its two links
        // (Rule 16, scenario 4).
        const page = await (await asUser(author.username)).newPage();
        await page.goto(ownUrl);
        await expectWizardOpen(page);
        // (Positive control for the bare 404 below: the wizard page comes
        // dressed in the press's design — stylesheets and the page
        // heading — read the same way there.)
        await expect(page.locator('link[rel="stylesheet"]').first()).toBeAttached();
        await expect(page.getByRole('heading', {level: 1}).first()).toBeVisible();
        await cancelDraft(page);
        await expect(page.getByRole('link', {name: 'Create a new submission'})).toBeVisible();
        await expect(page.getByRole('link', {name: 'Return to your dashboard'})).toBeVisible();

        // The draft is gone from My Submissions: the author's "Active
        // submissions" view counts the two drafts left and lists them
        // (positive control, read the same way), and no row carries the
        // cancelled draft's title.
        const mySub = new MySubmissionsPage(page, press.path);
        await mySub.goto();
        await mySub.expectViewHeading('Active submissions', 2);
        await expect(mySub.row(`Submission ${tag}b`)).toBeVisible();
        await expect(mySub.row(`Submission ${tag}c`)).toBeVisible();
        await expect(mySub.row(new RegExp(`Submission ${tag}(?![a-z0-9])`))).toHaveCount(0);

        // The deleted draft's wizard address, noted before cancelling, now
        // answers only a bare page-not-found error without the press's
        // design: the whole page is the one line "404 Not Found", no
        // stylesheet, no tab title (Rule 16; the wizard page above is the
        // control).
        const response = await page.goto(ownUrl);
        expect(response.status()).toBe(404);
        await expect(page.locator('body')).toHaveText('404 Not Found');
        await expect(page.getByRole('heading', {name: '404 Not Found'})).toBeVisible();
        await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(0);
        await expect(page).toHaveTitle('');

        // The Press Manager on another author's draft: the footer offers
        // "Cancel"; confirming lands on "Submission cancelled".
        const managerPage = await (await asUser(manager.username)).newPage();
        await managerPage.goto(otherUrl);
        await expectWizardOpen(managerPage);
        await expect(footer(managerPage).locator('#cancelSubmission')).toBeVisible();
        await cancelDraft(managerPage);

        // Mailboxes: no email arrives on either cancel, in the author's
        // mailbox or the manager's. Positive control taken the same way:
        // the author's "Save for Later" on the spare draft, whose email is
        // sent after both cancels, so it bounds the silence.
        await page.goto(wizardUrl(press.path, spare.submissionId));
        await expectWizardOpen(page);
        await saveForLater(page);
        await pkpMail.find({to: author.email, subject: 'Resume your submission', timeoutMs: 30_000});
        expect(await pkpMail.count({to: author.email})).toBe(1);
        expect(await pkpMail.count({to: manager.email})).toBe(0);
    });

    test('S5: change the submission settings midway (work type and language — OMP1)', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s5');

        // The first press: two submission languages (the given; a press has
        // no sections — OMP1), a throwaway Author and their draft.
        const press = await seedPress(ompApi, tag, ['author'], {
            context: {supportedLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']},
        });
        const author = press.users.author;
        const seeded = await seedDraft(ompApi, tag, {
            context: press.path,
            submitter: author.username,
        });

        const page = await (await asUser(author.username)).newPage();
        await page.goto(wizardUrl(press.path, seeded.submissionId));
        await expectWizardOpen(page);

        // The press states the work type and the language with a "Change"
        // control (Rules 7, 11 / OMP1).
        await expect(submittingToLine(page)).toContainText('Submitting a Monograph in English.');

        // "Change Submission Settings" offers the Submission Type pair and
        // the language.
        const modal = await openChangeSettings(page);
        const monograph = modal.getByRole('radio', {name: WORK_TYPES.monograph});
        await expect(monograph).toBeChecked();
        await expect(
            modal.getByRole('radio', {name: WORK_TYPES.editedVolume})
        ).toBeVisible();
        await expect(modal.getByRole('radio', {name: 'English', exact: true})).toBeChecked();
        await expect(modal.getByRole('radio', {name: 'French (Canada)', exact: true})).toBeVisible();

        // Pick the other type and the other language and save: the wizard
        // reloads and the line names the new type and language (scenario 5).
        await modal.getByRole('radio', {name: WORK_TYPES.editedVolume}).check();
        await modal.getByRole('radio', {name: 'French (Canada)', exact: true}).check();
        await modal.getByRole('button', {name: 'Save', exact: true}).click();
        await expect(submittingToLine(page)).toContainText(
            'Submitting an Edited Volume in French (Canada).',
            {timeout: 30_000}
        );

        // Review, one panel per language: the Details and For the Editors
        // panels each appear twice, once per language (Rule 12); Files once
        // (positive control, read the same way).
        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.editors);
        await openReview(page);
        await expect(reviewPanel(page, /^Details \(/)).toHaveCount(2);
        await expect(reviewPanel(page, 'Details (English)')).toBeVisible();
        await expect(reviewPanel(page, 'Details (French (Canada))')).toBeVisible();
        await expect(reviewPanel(page, /^For the Editors \(/)).toHaveCount(2);
        await expect(reviewPanel(page, 'For the Editors (English)')).toBeVisible();
        await expect(reviewPanel(page, 'For the Editors (French (Canada))')).toBeVisible();
        await expect(reviewPanel(page, 'Files')).toHaveCount(1);

        // One section, one language: the start form. On a second press at
        // the builder's defaults (one submission language; no section on a
        // press ever), "Make a Submission" shows no "Submission Language"
        // list — the first, bilingual press's start form does (positive
        // control, read the same way) — while a press asks for the
        // Submission Type as always (OMP1). Begin: the wizard opens on
        // Upload Files.
        await page.goto(startUrl(press.path));
        await expect(startFormLegend(page, 'Submission Type')).toBeVisible({timeout: 20_000});
        await expect(startFormLegend(page, 'Submission Language')).toBeVisible();
        const single = await seedPress(ompApi, `${tag}s`, ['author']);
        const singlePage = await (await asUser(single.users.author.username)).newPage();
        await singlePage.goto(startUrl(single.path));
        await expect(startFormLegend(singlePage, 'Submission Type')).toBeVisible({timeout: 20_000});
        await expect(singlePage.getByRole('radio', {name: WORK_TYPES.monograph})).toBeVisible();
        await expect(startFormLegend(singlePage, 'Submission Language')).toHaveCount(0);
        await beginSubmission(singlePage, {title: 'Single section'});

        // One section, one language: the wizard header. With one language
        // the header names no language, but on a press the work-type line
        // and its "Change" control remain (Rule 11 / OMP1).
        await expect(submittingToLine(singlePage)).toHaveText(/^\s*Submitting a Monograph\.\s*Change\s*$/);
        await expect(submittingToLine(singlePage).getByRole('button', {name: 'Change'})).toBeVisible();

        // Control: the first press's draft, reopened from My Submissions,
        // still names the new type and language.
        const mySub = new MySubmissionsPage(page, press.path);
        await mySub.goto();
        const row = await mySub.findRowByTag(tag);
        await mySub.completeSubmissionButton(row).click();
        await expectWizardOpen(page);
        await expect(submittingToLine(page)).toContainText('Submitting an Edited Volume in French (Canada).');
    });

    test('S6: validation blocks an empty submission until the file is fixed', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s6');
        const seeded = await seedDraft(ompApi, tag);

        const page = await (await asUser('author.alex')).newPage();
        await page.goto(wizardUrl(PK, seeded.submissionId, {localePrefix: PK_PREFIX}));
        await expectWizardOpen(page);

        // Straight to Review on "Continue" alone (scenario 6).
        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.editors);
        await openReview(page);

        // The problems banner, the missing-file complaint on the Files
        // panel, and a disabled Submit (Rules 12–14; a press demands no
        // abstract — OMP1).
        await expect(problemsBanner(page)).toContainText(
            'There are one or more problems that need to be fixed before you can submit.'
        );
        const filesPanel = reviewPanel(page, 'Files');
        await expect(filesPanel).toContainText(
            /upload at least one Book Manuscript file/
        );
        await expect(submitButton(page)).toBeDisabled();

        // The panel's "Edit" jumps back to Upload Files; fix the item and
        // return: the complaint is gone and Submit enables.
        await filesPanel.getByRole('button', {name: 'Edit', exact: true}).click();
        await expectStep(page, STEPS.files);
        await uploadWizardFile(page, `ms-${tag}.txt`);
        await openReview(page, {viaRail: true});
        await expect(problemsBanner(page)).toHaveCount(0);
        await expect(filesPanel).not.toContainText(
            /upload at least one Book Manuscript file/
        );
        await expect(submitButton(page)).toBeEnabled();

        // A section that waives abstracts: a press has no section at intake
        // and requires an abstract only if its setup says so (OMP1, Rule
        // 13), so any draft reaches Review with the abstract empty and no
        // abstract complaint. A third draft, begun from the start form so
        // nothing is filled in: on Details the "Abstract" label carries no
        // "Required" mark (positive control: "Title" does); on Review the
        // Details panel's Abstract item reads "None provided" without "This
        // field is required." (positive control: the Files panel's
        // complaint, read the same way on the same screen).
        await page.goto(startUrl(PK, {localePrefix: PK_PREFIX}));
        await beginSubmission(page, {title: `Submission ${tag}w`});
        await continueTo(page, STEPS.details);
        await expect(wizardFieldLabel(page, /^Title/)).toContainText('Required');
        await expect(wizardFieldLabel(page, /^Abstract/)).toBeVisible();
        await expect(wizardFieldLabel(page, /^Abstract/)).not.toContainText('Required');
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.editors);
        await openReview(page);
        await expect(problemsBanner(page)).toBeVisible();
        await expect(reviewPanel(page, 'Files')).toContainText(
            /upload at least one Book Manuscript file/
        );
        const abstractItem = reviewItem(reviewPanel(page, 'Details'), 'Abstract');
        await expect(abstractItem).toContainText('None provided');
        await expect(abstractItem).not.toContainText('This field is required.');
        await expect(reviewPanel(page, 'Details')).not.toContainText('This field is required.');

        // A contributor named in another language only: on a bilingual
        // scratch press, a second draft's co-author is named in English,
        // then the submission language is switched to French (Canada)
        // through "Change Submission Settings" (Rule 11), so the co-author
        // has a name in another of the press's languages and none in the
        // submission language. Review: the banner, the Contributors panel's
        // complaint, and a disabled Submit (Rule 13).
        const press = await seedPress(ompApi, tag, ['author'], {
            context: {supportedLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']},
        });
        const author = press.users.author;
        const bilingual = await seedDraft(ompApi, `${tag}b`, {
            context: press.path,
            submitter: author.username,
        });
        const second = await (await asUser(author.username)).newPage();
        await second.goto(wizardUrl(press.path, bilingual.submissionId));
        await expectWizardOpen(second);
        await expect(submittingToLine(second)).toContainText('Submitting a Monograph in English.');
        await uploadWizardFile(second, `ms-${tag}b.txt`);
        await continueTo(second, STEPS.details);
        await continueTo(second, STEPS.contributors);
        await addContributor(second, {givenName: `Coauthor${tag}`, email: `${tag}co@mail.test`});
        const settings = await openChangeSettings(second);
        await settings.getByRole('radio', {name: 'French (Canada)'}).check();
        await settings.getByRole('button', {name: 'Save', exact: true}).click();
        await expect(submittingToLine(second)).toContainText('French (Canada)', {timeout: 30_000});
        await continueTo(second, STEPS.details);
        await continueTo(second, STEPS.contributors);
        await continueTo(second, STEPS.editors);
        await openReview(second);
        await expect(problemsBanner(second)).toContainText(
            'There are one or more problems that need to be fixed before you can submit.'
        );
        await expect(reviewPanel(second, 'Contributors')).toContainText(
            'The given name is missing in French (Canada) for one or more of the contributors.'
        );
        await expect(submitButton(second)).toBeDisabled();
    });

    test('S7: the press stops accepting submissions', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s7');
        const press = await seedPress(ompApi, tag, ['manager', 'author']);

        // Positive control: with submissions open, the author's sidebar
        // offers the entry (Rule 1).
        const authorPage = await (await asUser(press.users.author.username)).newPage();
        await authorPage.goto(`/index.php/${press.path}/dashboard/mySubmissions`);
        await expect(
            authorPage.getByRole('link', {name: 'Start A New Submission'})
        ).toBeVisible({timeout: 20_000});

        // The manager disables submissions (Rule 2).
        const managerPage = await (await asUser(press.users.manager.username)).newPage();
        await setDisableSubmissions(managerPage, press.path, true);

        // The sidebar entry disappears, and the typed start address shows
        // only the not-accepting notice (scenario 7; wording per A3 as
        // shown).
        await authorPage.goto(`/index.php/${press.path}/dashboard/mySubmissions`);
        await expect(
            authorPage.getByRole('link', {name: 'Start A New Submission'})
        ).toHaveCount(0);
        await authorPage.goto(startUrl(press.path));
        await expect(
            authorPage.getByText(
                'This press is not accepting submissions at this time. Visit the workflow settings to allow submissions.'
            )
        ).toBeVisible({timeout: 20_000});
        await expect(
            authorPage.getByRole('button', {name: 'Begin Submission'})
        ).toHaveCount(0);

        // Positive control: re-enabling brings the sidebar entry back.
        await setDisableSubmissions(managerPage, press.path, false);
        await authorPage.goto(`/index.php/${press.path}/dashboard/mySubmissions`);
        await expect(
            authorPage.getByRole('link', {name: 'Start A New Submission'})
        ).toBeVisible({timeout: 20_000});
    });

    test('S8: a draft outlives the closing and still submits', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s8');
        const press = await seedPress(ompApi, tag, ['manager', 'author']);
        const seeded = await seedDraft(ompApi, tag, {
            context: press.path,
            submitter: press.users.author.username,
        });

        // The manager closes submissions after the draft was started.
        const managerPage = await (await asUser(press.users.manager.username)).newPage();
        await setDisableSubmissions(managerPage, press.path, true);

        // The author's draft still opens as the normal wizard, and
        // completing it still submits (scenario 8 — as-built, ⚠ A1 open on
        // intent).
        const page = await (await asUser(press.users.author.username)).newPage();
        await page.goto(wizardUrl(press.path, seeded.submissionId));
        await expectWizardOpen(page);
        await expect(
            page.getByText('This press is not accepting submissions at this time', {
                exact: false,
            })
        ).toHaveCount(0);
        await completeAndSubmitDraft(page, `ms-${tag}.txt`);

        // Control: on the same closed press the author's sidebar offers no
        // "Start A New Submission" (scenario 7).
        await page.goto(`/index.php/${press.path}/dashboard/mySubmissions`);
        await expect(page.getByRole('heading', {level: 1})).toBeVisible({timeout: 20_000});
        await expect(page.getByRole('link', {name: 'Start A New Submission'})).toHaveCount(0);
    });

    test('S9: a user with no submitting role is enrolled as Author; without self-registration the start screen refuses', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s9');
        const press = await seedPress(ompApi, tag, ['manager', 'reader', 'reader2']);

        // The bare reader holds no Author role yet: the profile's Roles tab
        // shows the self-registration "Author" box unchecked.
        // (The Roles tab lists every context on the site; the current
        // press's list renders first — scope to it.)
        const currentContextAuthorBox = (page) =>
            page
                .getByRole('tabpanel', {name: 'Roles'})
                .getByRole('list')
                .first()
                .getByRole('checkbox', {name: 'Author', exact: true});
        const readerPage = await (await asUser(press.users.reader.username)).newPage();
        await readerPage.goto(`/index.php/${press.path}/user/profile`);
        await readerPage.getByRole('tab', {name: 'Roles'}).click();
        await expect(currentContextAuthorBox(readerPage)).toBeVisible({timeout: 20_000});
        await expect(currentContextAuthorBox(readerPage)).not.toBeChecked();

        // The start screen admits them and the wizard opens normally
        // (Rule 3, scenario 9).
        await readerPage.goto(startUrl(press.path));
        await beginSubmission(readerPage, {title: `Submission ${tag}`});

        // Afterwards the account holds the press's Author role.
        await readerPage.goto(`/index.php/${press.path}/user/profile`);
        await readerPage.getByRole('tab', {name: 'Roles'}).click();
        await expect(currentContextAuthorBox(readerPage)).toBeChecked({timeout: 20_000});

        // Control: the manager turns off self-registration on the press's
        // self-registering author-role groups — OMP ships TWO (Author and
        // Chapter Author), and the gate only closes when no author-role
        // group self-registers; a second bare reader then gets
        // "Not Allowed" (Rule 3).
        const managerPage = await (await asUser(press.users.manager.username)).newPage();
        await managerPage.goto(`/index.php/${press.path}/management/settings/access`);
        await managerPage.locator('#roles-button').click();
        for (const roleName of ['Author', 'Chapter Author']) {
            // (Every author-category row carries an "Author"
            // permission-level cell — match the NAME cell alone.)
            const nameCell = managerPage.locator(
                `tr.gridRow td.first_column:has(span.label:text-is("${roleName}"))`
            );
            await nameCell.locator('a.show_extras').click();
            await managerPage.getByRole('link', {name: 'Edit', exact: true}).click();
            const selfReg = managerPage.getByLabel('Allow user self-registration');
            await expect(selfReg).toBeVisible({timeout: 20_000});
            await selfReg.uncheck();
            await managerPage.getByRole('button', {name: 'OK', exact: true}).click();
            await expect(selfReg).toBeHidden({timeout: 20_000});
        }

        const reader2Page = await (await asUser(press.users.reader2.username)).newPage();
        await reader2Page.goto(startUrl(press.path));
        await expect(
            reader2Page.getByRole('heading', {name: 'Not Allowed'})
        ).toBeVisible({timeout: 20_000});
        await expect(
            reader2Page.getByText(/authors must be registered by the editorial staff/)
        ).toBeVisible();
    });

    test('S10: all contributors are acknowledged', async ({ompApi, pkpMail, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s10');

        // All authors (the default): a second contributor with a distinct
        // throwaway address; two acknowledgements — the submitting
        // author's and the co-author variant to the other contributor
        // (Side effects; the panel's own mechanics belong to Contributors
        // & affiliations).
        const press = await seedPress(ompApi, tag, ['author']);
        const author = press.users.author;
        const contributorEmail = `${tag}contrib@mail.test`;
        const seeded = await seedDraft(ompApi, tag, {
            context: press.path,
            submitter: author.username,
        });
        const page = await (await asUser(author.username)).newPage();
        await submitWithCoauthor(page, press.path, seeded, tag, contributorEmail);
        await pkpMail.find({to: author.email, subject: ACK_SUBJECT, timeoutMs: 30_000});
        await pkpMail.find({to: contributorEmail, subject: COAUTHOR_ACK_SUBJECT, timeoutMs: 30_000});

        // Copies: a press whose Emails screen copies the press contact and
        // an extra address (seeded through the acknowledgement copy keys).
        // Your acknowledgement carries both as blind copies; the other
        // contributor's message goes to them alone.
        const copiesTag = `${tag}c`;
        const contactEmail = `${copiesTag}contact@mail.test`;
        const extraEmail = `${copiesTag}extra@mail.test`;
        const copies = await seedPress(ompApi, copiesTag, ['author'], {
            context: {contactName: 'U21 Contact', contactEmail},
            settings: {copySubmissionAckPrimaryContact: true, copySubmissionAckAddress: extraEmail},
        });
        const copiesDraft = await seedDraft(ompApi, copiesTag, {
            context: copies.path,
            submitter: copies.users.author.username,
        });
        const copiesContributor = `${copiesTag}contrib@mail.test`;
        const copiesPage = await (await asUser(copies.users.author.username)).newPage();
        await submitWithCoauthor(copiesPage, copies.path, copiesDraft, copiesTag, copiesContributor);
        const ack = await pkpMail.find({to: copies.users.author.email, subject: ACK_SUBJECT, timeoutMs: 30_000});
        const ackFull = await pkpMail.fullMessage(ack.ID);
        expect((ackFull.Bcc || []).map((r) => r.Address).sort()).toEqual([contactEmail, extraEmail].sort());
        const coauthorAck = await pkpMail.find({to: copiesContributor, subject: COAUTHOR_ACK_SUBJECT, timeoutMs: 30_000});
        const coauthorFull = await pkpMail.fullMessage(coauthorAck.ID);
        expect(coauthorFull.To.map((r) => r.Address)).toEqual([copiesContributor]);
        expect(coauthorFull.Cc || []).toEqual([]);
        expect(coauthorFull.Bcc || []).toEqual([]);

        // Submitting author only: one email, in your mailbox; none reaches
        // the other contributor (the author's own bounds the wait).
        const onlyTag = `${tag}o`;
        const only = await seedPress(ompApi, onlyTag, ['author'], {
            settings: {submissionAcknowledgement: 'submittingAuthor'},
        });
        const onlyDraft = await seedDraft(ompApi, onlyTag, {
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
        // (the needs-an-editor email to the press manager, sent by the same
        // submit, bounds the wait).
        const offTag = `${tag}f`;
        const off = await seedPress(ompApi, offTag, ['author', 'manager'], {
            settings: {submissionAcknowledgement: 'off'},
        });
        const offDraft = await seedDraft(ompApi, offTag, {
            context: off.path,
            submitter: off.users.author.username,
        });
        const offContributor = `${offTag}contrib@mail.test`;
        const offPage = await (await asUser(off.users.author.username)).newPage();
        await submitWithCoauthor(offPage, off.path, offDraft, offTag, offContributor);
        const control = {to: off.users.manager.email, subject: NEEDS_EDITOR_SUBJECT, contains: offTag, timeoutMs: 30_000};
        await pkpMail.expectNone({to: off.users.author.email, subject: ACK_SUBJECT, afterControl: control});
        await pkpMail.expectNone({to: offContributor, afterControl: control});

        // Control: under all authors, a submission whose only contributor
        // is you produces one acknowledgement.
        const soloTag = `${tag}s`;
        const solo = await seedDraft(ompApi, soloTag, {
            context: press.path,
            submitter: author.username,
        });
        await page.goto(wizardUrl(press.path, solo.submissionId));
        await expectWizardOpen(page);
        await completeAndSubmitDraft(page, `ms-${soloTag}.txt`);
        await pkpMail.find({to: author.email, subject: ACK_SUBJECT, contains: `Submission ${soloTag}`, timeoutMs: 30_000});
        expect(await pkpMail.count({to: author.email, subject: ACK_SUBJECT, contains: `Submission ${soloTag}`})).toBe(1);
    });

    test('S11: editors learn of the new submission', async ({ompApi, pkpMail, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s11');

        // First half — a submission into a series with configured series
        // editors: they are assigned (seeded press, where auto-assignment
        // works; the assignment email itself belongs to Stage
        // participants).
        const assigned = await ompApi.createSubmission({
            tag: `${tag}a`,
            context: PK,
            submitter: 'author.alex',
            series: 'monographs',
        });
        const mayaPage = await (await asUser('manager.maya')).newPage();
        const modal = await openEditorial(mayaPage, PK, assigned.submissionId);
        const participants = secondaryRegion(modal);
        await expect(participants.getByText('Ana Section Editor')).toBeVisible({
            timeout: 20_000,
        });
        await expect(participants.getByText('Diana Editor')).toBeVisible();

        // Second half — no series, nobody assigned: every press manager
        // gets the needs-an-editor email and a task notification (Side
        // effects; scratch press so the recipient is a unique throwaway).
        const press = await seedPress(ompApi, tag, ['manager', 'author']);
        const draft = await seedDraft(ompApi, tag, {
            context: press.path,
            submitter: press.users.author.username,
        });
        const authorPage = await (await asUser(press.users.author.username)).newPage();
        await authorPage.goto(wizardUrl(press.path, draft.submissionId));
        await expectWizardOpen(authorPage);
        await completeAndSubmitDraft(authorPage, `ms-${tag}.txt`);

        await pkpMail.find({
            to: press.users.manager.email,
            subject: NEEDS_EDITOR_SUBJECT,
            contains: tag,
            timeoutMs: 30_000,
        });

        const managerPage = await (await asUser(press.users.manager.username)).newPage();
        await managerPage.goto(`/index.php/${press.path}/dashboard/editorial`);
        const tasks = await openTasksPanel(managerPage);
        await expect(
            tasks.getByText(
                'A new monograph has been submitted to which an editor needs to be assigned.'
            ).first()
        ).toBeVisible({timeout: 20_000});
    });

    test('S12 (absence): a press intakes by work type — no section anywhere', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s12');
        const page = await (await asUser('author.alex')).newPage();

        // The start form asks for the Submission Type (positive control)
        // and offers no Section field (OMP1 — Rule 17 has no press
        // analogue).
        await page.goto(startUrl(PK, {localePrefix: PK_PREFIX}));
        await expect(
            page.getByRole('radio', {name: WORK_TYPES.monograph})
        ).toBeVisible({timeout: 20_000});
        await expect(page.locator('legend', {hasText: 'Section'})).toHaveCount(0);

        // "Change Submission Settings" on a draft likewise offers the type
        // pair (positive control) and no Section choice.
        const seeded = await seedDraft(ompApi, tag);
        await page.goto(wizardUrl(PK, seeded.submissionId, {localePrefix: PK_PREFIX}));
        await expectWizardOpen(page);
        const modal = await openChangeSettings(page);
        await expect(
            modal.getByRole('radio', {name: WORK_TYPES.monograph})
        ).toBeVisible();
        await expect(
            modal.getByRole('radio', {name: WORK_TYPES.editedVolume})
        ).toBeVisible();
        await expect(modal.locator('legend', {hasText: 'Section'})).toHaveCount(0);
    });

    test('S13: the Reviewer Suggestions step appears when the press asks for it', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s13');
        const press = await seedPress(ompApi, tag, ['manager', 'author']);
        const seeded = await seedDraft(ompApi, tag, {
            context: press.path,
            submitter: press.users.author.username,
        });

        // Control: with the setting off (a fresh press's default), the rail
        // shows Review but no Reviewer Suggestions step (Rule 7).
        const page = await (await asUser(press.users.author.username)).newPage();
        await page.goto(wizardUrl(press.path, seeded.submissionId));
        await expectWizardOpen(page);
        await expect(railEntry(page, STEPS.review)).toBeVisible();
        await expect(railEntry(page, STEPS.reviewerSuggestions)).toHaveCount(0);

        // The manager enables "Reviewer Suggestion at Submission"
        // (Settings → Workflow → Review, scenario 13).
        const managerPage = await (await asUser(press.users.manager.username)).newPage();
        await managerPage.goto(`/index.php/${press.path}/management/settings/workflow`);
        await managerPage.locator('#review-button').click();
        const toggle = managerPage.getByRole('checkbox', {
            name: 'Allow authors to suggest potential reviewers at submission process',
        });
        await expect(toggle).toBeVisible({timeout: 20_000});
        await toggle.check();
        const saved = managerPage.waitForResponse(
            (r) => r.url().includes('/api/v1/contexts/') && r.ok()
        );
        await managerPage
            .locator('#reviewSetup')
            .getByRole('button', {name: 'Save', exact: true})
            .click();
        await saved;

        // The draft's wizard now shows the step before Review, and the
        // Review step gains the empty suggestions panel.
        await page.reload();
        await expectWizardOpen(page);
        await expect(railEntry(page, STEPS.reviewerSuggestions)).toBeVisible();
        const labels = await page
            .locator('.pkpSteps__buttons .pkpSteps__step__label')
            .allInnerTexts();
        const order = labels.map((label) => label.trim().replace(/^\d+\s*/, ''));
        expect(order.indexOf(STEPS.reviewerSuggestions)).toBeLessThan(
            order.indexOf(STEPS.review)
        );

        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.editors);
        await continueTo(page, STEPS.reviewerSuggestions);
        await openReview(page);
        await expect(
            page.getByText('No reviewers have been suggested for this submission.')
        ).toBeVisible();
    });

    test('S14: submit a monograph or an edited volume (OMP1)', async ({asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s14');
        const page = await (await asUser('author.alex')).newPage();

        // The start form asks for the Submission Type; choose Edited
        // Volume (scenario 14).
        await page.goto(startUrl(PK, {localePrefix: PK_PREFIX}));
        await beginSubmission(page, {
            title: `Submission ${tag}`,
            workType: WORK_TYPES.editedVolume,
        });
        await expect(submittingToLine(page)).toContainText(
            'Submitting an Edited Volume.'
        );

        // The Details step lists the book's Chapters…
        await continueTo(page, STEPS.details);
        await expect(
            page.getByText('Chapters', {exact: true}).first()
        ).toBeVisible({timeout: 20_000});

        // …and switching back to Monograph changes only the header line —
        // the Chapters section stays.
        const modal = await openChangeSettings(page);
        await modal.getByRole('radio', {name: WORK_TYPES.monograph}).check();
        await modal.getByRole('button', {name: 'Save', exact: true}).click();
        await expect(submittingToLine(page)).toContainText('Submitting a Monograph.', {
            timeout: 30_000,
        });
        await continueTo(page, STEPS.details);
        await expect(
            page.getByText('Chapters', {exact: true}).first()
        ).toBeVisible({timeout: 20_000});

        // For the Editors offers the optional Series choice, "None"
        // preselected (the press has series).
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.editors);
        const noneRadio = page.getByRole('radio', {name: 'None', exact: true});
        await expect(noneRadio).toBeVisible({timeout: 20_000});
        await expect(noneRadio).toBeChecked();
        await expect(page.getByRole('radio', {name: 'Monographs', exact: true})).toBeVisible();
        await expect(page.getByRole('radio', {name: 'Textbooks', exact: true})).toBeVisible();
    });

    test('S16: the copyright confirmation gates Submit and is logged', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s16');

        // A press with a copyright notice (seeded through `copyrightNotice`),
        // a complete draft at Review (scenario 16).
        const press = await seedPress(ompApi, tag, ['author', 'manager'], {
            settings: {copyrightNotice: `<p>Copyright notice ${tag}.</p>`},
        });
        const author = press.users.author;
        const seeded = await seedDraft(ompApi, tag, {
            context: press.path,
            submitter: author.username,
        });
        const page = await (await asUser(author.username)).newPage();
        await page.goto(wizardUrl(press.path, seeded.submissionId));
        await expectWizardOpen(page);
        await uploadWizardFile(page, `ms-${tag}.txt`);
        await continueTo(page, STEPS.details);
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.editors);
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
        await confirmSubmit(page);

        // "Review this submission" opens the workflow; its activity log
        // holds the "submission submitted" entry and a "copyright agreed"
        // entry (Side effects; the log is read by the press manager, who
        // has the "Activity Log" control; the entry's leading placeholder is
        // A5's and is not asserted).
        await page.getByRole('link', {name: 'Review this submission'}).click();
        await expect(
            page
                .locator('[data-cy="active-modal"]')
                .getByRole('heading', {name: /^Workflow:/})
                .first()
        ).toBeVisible({timeout: 30_000});
        const managerPage = await (await asUser(press.users.manager.username)).newPage();
        await openEditorial(managerPage, press.path, seeded.submissionId);
        const rows = await activityLogRows(managerPage);
        await expect(rows.filter({hasText: SUBMITTED_LOG_LINE})).toHaveCount(1);
        await expect(
            rows.filter({hasText: `(${author.username}) agreed to the copyright terms for submission.`})
        ).toHaveCount(1);
    });

    test('S17: required metadata blocks the submit', async ({ompApi, asUser}, testInfo) => {
        const tag = makeTag(testInfo, 'u21s17');

        // A press whose setup requires keywords during submission and asks
        // for subjects and a data availability statement without requiring
        // them (seeded through `metadata: {keywords: 'require', subjects:
        // 'request', dataAvailability: 'request'}`), a complete draft
        // (scenario 17).
        const press = await seedPress(ompApi, tag, ['author'], {
            settings: {metadata: {keywords: 'require', subjects: 'request', dataAvailability: 'request'}},
        });
        const author = press.users.author;
        const seeded = await seedDraft(ompApi, tag, {
            context: press.path,
            submitter: author.username,
        });
        const page = await (await asUser(author.username)).newPage();
        await page.goto(wizardUrl(press.path, seeded.submissionId));
        await expectWizardOpen(page);
        await uploadWizardFile(page, `ms-${tag}.txt`);

        // "Details" shows a "Keywords" field; leave it empty and reach
        // Review: the problems banner, the keywords complaint on the
        // Details panel, and a disabled Submit (Rule 13).
        await continueTo(page, STEPS.details);
        await expect(wizardField(page, /^Keywords/)).toBeVisible();
        await expect(wizardFieldLabel(page, /^Keywords/)).toContainText('Required');
        // Asked, not required: "Details" also shows a data availability
        // statement and "For the Editors" a field for subjects, neither
        // marked required; both stay empty.
        await expect(wizardField(page, /^Data Availability Statement/)).toBeVisible();
        await expect(wizardFieldLabel(page, /^Data Availability Statement/)).not.toContainText('Required');
        await continueTo(page, STEPS.contributors);
        await continueTo(page, STEPS.editors);
        await expect(wizardField(page, /^Subjects/)).toBeVisible();
        await expect(wizardFieldLabel(page, /^Subjects/)).not.toContainText('Required');
        await openReview(page);
        await expect(problemsBanner(page)).toContainText(
            'There are one or more problems that need to be fixed before you can submit.'
        );
        const detailsPanel = reviewPanel(page, 'Details');
        const keywordsItem = reviewItem(detailsPanel, 'Keywords');
        await expect(keywordsItem).toContainText('This field is required.');
        await expect(submitButton(page)).toBeDisabled();

        // With both left empty, "Review" raises no complaint about either
        // (the keywords item above, read the same way, is the positive
        // control): their items read "None provided" and nothing else is
        // flagged on their panels.
        const dataItem = reviewItem(detailsPanel, 'Data Availability Statement');
        await expect(dataItem).toContainText('None provided');
        await expect(dataItem).not.toContainText('This field is required.');
        const editorsPanel = reviewPanel(page, 'For the Editors');
        const subjectsItem = reviewItem(editorsPanel, 'Subjects');
        await expect(subjectsItem).toContainText('None provided');
        await expect(subjectsItem).not.toContainText('This field is required.');
        await expect(editorsPanel).not.toContainText('This field is required.');

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
        // "Submit stays enabled" with the asked-not-required items still
        // empty: nothing on their panels is flagged after the fix either.
        await expect(dataItem).toContainText('None provided');
        await expect(subjectsItem).toContainText('None provided');

        // Keywords at the install default: on the seeded press, which asks
        // for keywords without requiring them, "Details" shows a "Keywords"
        // field not marked required (positive control: the "Title" label's
        // "Required" mark, and the require-press's "Keywords" label above,
        // read the same way), and "Review" passes with it empty.
        const alexDraft = await seedDraft(ompApi, `${tag}d`);
        const alex = await (await asUser('author.alex')).newPage();
        await alex.goto(wizardUrl(PK, alexDraft.submissionId, {localePrefix: PK_PREFIX}));
        await expectWizardOpen(alex);
        await uploadWizardFile(alex, `ms-${tag}d.txt`);
        await continueTo(alex, STEPS.details);
        await expect(wizardFieldLabel(alex, /^Title/)).toContainText('Required');
        await expect(wizardField(alex, /^Keywords/)).toBeVisible();
        await expect(wizardFieldLabel(alex, /^Keywords/)).not.toContainText('Required');
        await continueTo(alex, STEPS.contributors);
        await continueTo(alex, STEPS.editors);
        await openReview(alex);
        await expect(problemsBanner(alex)).toHaveCount(0);
        await expect(reviewItem(reviewPanel(alex, 'Details'), 'Keywords')).toContainText('None provided');
        await expect(submitButton(alex)).toBeEnabled();

        // Control: on a press whose setup does not ask for keywords,
        // "Details" shows no "Keywords" field (positive control: the Title
        // field, read the same way) and Review passes without one. The
        // spec places this control on the seeded press, but the seeded
        // press asks for keywords (optional, the install default) — finding
        // T-omp-2 in .reports/U21/test-omp-findings.md — so the control
        // runs on a scratch press seeded with `metadata: {keywords: 'off'}`.
        const offTag = `${tag}c`;
        const off = await seedPress(ompApi, offTag, ['author'], {
            settings: {metadata: {keywords: 'off'}},
        });
        const control = await seedDraft(ompApi, offTag, {
            context: off.path,
            submitter: off.users.author.username,
        });
        const offPage = await (await asUser(off.users.author.username)).newPage();
        await offPage.goto(wizardUrl(off.path, control.submissionId));
        await expectWizardOpen(offPage);
        await uploadWizardFile(offPage, `ms-${offTag}.txt`);
        await continueTo(offPage, STEPS.details);
        await expect(wizardField(offPage, /^Title/)).toBeVisible();
        await expect(wizardField(offPage, /^Keywords/)).toHaveCount(0);
        await continueTo(offPage, STEPS.contributors);
        await continueTo(offPage, STEPS.editors);
        await openReview(offPage);
        await expect(problemsBanner(offPage)).toHaveCount(0);
        await expect(submitButton(offPage)).toBeEnabled();
    });
});
