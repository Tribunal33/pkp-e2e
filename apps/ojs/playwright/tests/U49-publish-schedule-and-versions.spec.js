// @ts-check
/**
 * @file playwright/tests/U49-publish-schedule-and-versions.spec.js
 *
 * Publish, schedule & versions — OJS suite, one test per canonical
 * scenario the app runs: the common scenarios 1–10, the journal-only
 * scenarios 11–13 and the {OJS OMP} scenarios 17 and 18.
 * Spec: docs/specs/U49-publish-schedule-and-versions.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 ❓
 * (S4 asserts the participating editor's receipt and the reviewer's
 * silence; the submitting author's copy is asserted neither way), A2 ❓
 * (S8 asserts what the screens offer; the server-side roster is a code
 * observation), A3 ❓ (every published version here is a Version of
 * Record; S6's published-submission button reads "Publish" and is matched
 * by regex, never asserted), A4 ❓ (S6 asserts "Minor Revision" greyed for
 * a stage with no versions; the silent re-select is not), A5 🐞 (S5 saves
 * and publishes a summary; its reader-side rendering is asserted neither
 * way), A6 🐞 (S4 reads the date line before the draft only), A7 ❓
 * (press and preprint server only), OJS1 🐞 (no test requires a plain
 * language summary), OJS2 🐞 (S11 and S12 schedule on a journal with a
 * published back issue, or through the Publication-Settings-first route;
 * no test picks "Schedule Only" as a first pick on a published-issue-less
 * journal), OJS3 🐞 (S4 asserts only what a signed-out reader gets at the
 * draft's own address; the mistyped-number crash is not driven), OMP1,
 * OPS1–OPS5 (other apps' trees). The spec's Coverage section records
 * everything else left out.
 *
 * Seeding: scenario endpoints only. publicknowledge is read-only — S9
 * seeds its own submissions there (one scheduled into the seeded,
 * still-unpublished issue Vol. 2 No. 1 (2015), which stays unpublished);
 * every other test runs on a scratch journal with throwaway users.
 * Submissions that need a review round behind them (S4, S6, S17) are seeded
 * `decisions: ['sendExternalReview', 'accept', 'sendToProduction']` with a
 * reviewer on the round (scenarios.md). Mailpit assertions are scoped by
 * unique throwaway recipients (A8); every mailbox silence is bounded by a
 * "Publication Published" the test itself causes the same way, publishing a
 * second scratch submission on the same journal (to the same address for a
 * scheduling silence, to a spare author's for an opt-out silence; M6); the
 * Tasks silences are settled reads of the author's Tasks grid paired with
 * S1's positive read; the Activity Log lines are row reads. No
 * hard waits — flows are bounded by API responses and web-first assertions;
 * the one known timing quirk (the occasionally swallowed first press of
 * "Schedule For Publication", spec fn-k) is absorbed by the POM's bounded
 * re-press. Everything runs in the parallel `ojs` project.
 */
const path = require('path');
const {test, expect} = require('../support/fixtures.js');
const {
    createIssue,
    publishIssue,
    waitForPublicationSave,
} = require('../pages/PublicationMetadataPages.js');
const {PublishScreen, openTasks} = require('../pages/PublishSchedulePages.js');
const {
    EditorialDashboardPage,
} = require('../../../../shared/playwright/pages/EditorialDashboardPage.js');
const {ProfilePage} = require('../../../../shared/playwright/pages/ProfilePage.js');

const JOURNAL = 'publicknowledge';
const FIXTURES = path.join(__dirname, '..', 'fixtures', 'files');
const PMUR_REFUSAL =
    'A PMUR version cannot be published without an associated review round. Please assign a review round to this publication version before proceeding.';
const NO_SUMMARIES = "No saved summaries found for this submission's review revisions.";
const DATE_FORMAT = 'The date must be in the format YYYY-MM-DD, such as 2019-01-01.';
const PUBLISHED_ROW = 'A new version of your submission, "Title", was published.';

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u49${scenario}w${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** Today as the app stamps it (the servers run in UTC) and as the runner's clock says. */
function todays() {
    const now = new Date();
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return [now.toISOString().slice(0, 10), local];
}

/**
 * Seed a scratch journal with a throwaway manager and author (plus any
 * extra users); returns the usernames keyed by their short role.
 */
async function seedJournal(ojsApi, tag, extraUsers = []) {
    await ojsApi.createContext({
        tag,
        users: [
            {
                username: `${tag}mg`,
                givenName: 'Mona',
                familyName: 'Manager',
                email: `${tag}mg@mail.test`,
                roles: ['manager'],
            },
            {
                username: `${tag}au`,
                givenName: 'Ada',
                familyName: 'Author',
                email: `${tag}au@mail.test`,
                roles: ['author'],
            },
            ...extraUsers,
        ],
    });
    return {manager: `${tag}mg`, author: `${tag}au`};
}

/** A throwaway external reviewer's user entry for seedJournal. */
function reviewerUser(tag) {
    return {
        username: `${tag}rv`,
        givenName: 'Rita',
        familyName: 'Reviewer',
        email: `${tag}rv@mail.test`,
        roles: ['externalReviewer'],
    };
}

/**
 * Seed a submission through one external review round (the reviewer
 * accepted), Accept and Send To Production; `published` takes it live.
 */
function seedThroughReview(ojsApi, {tag, context, submitter, reviewer, published = false, participants}) {
    return ojsApi.createSubmission({
        tag,
        context,
        submitter,
        title: `Submission ${tag}`,
        decisions: ['sendExternalReview', 'accept', 'sendToProduction'],
        reviewRounds: [{reviewers: [{username: reviewer, status: 'accepted'}]}],
        ...(participants ? {participants} : {}),
        published,
    });
}

/** The anonymous reader page for an article; returns the HTTP status. */
async function readerStatus(page, contextPath, submissionId) {
    const response = await page.goto(
        `/index.php/${contextPath}/article/view/${submissionId}`
    );
    return response ? response.status() : 0;
}

/** The reader page's "Published" date line (its value under the label). */
function readerDateLine(page) {
    return page.locator('.item.published > .sub_item').first().locator('.value');
}

/** A submission's "was published" rows in a Tasks grid. */
function publishedNoticeRows(tasks, title) {
    return tasks.locator('tr').filter({hasText: 'was published'}).filter({hasText: title});
}

/**
 * The mailbox control every silence is bounded by: the manager publishes a
 * second scratch submission immediately (no issue) on the same journal, and
 * its submitter's "Publication Published" is waited for the same way the
 * silent one would be. Returns that mail.
 */
async function publishControl(pub, pkpMail, {submissionId, to, title}) {
    await pub.gotoWorkflow(submissionId);
    await pub.openEntry('Title & Abstract');
    await pub.publish();
    return pkpMail.find({to, subject: 'Publication Published', contains: title});
}

test.describe('publish, schedule & versions', () => {
    test('S1: publish a submission and see it live', {tag: '@smoke'}, async ({asUser, ojsApi, page, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s1', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag);
        const authorEmail = `${tag}au@mail.test`;
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}s`,
            decisions: ['skipExternalReview', 'sendToProduction'],
        });

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);

        // A published back issue for the "Assign To Current/Back Issue"
        // pick (fn-s1: use a scratch back issue).
        await createIssue(managerPage, tag, {
            volume: '1',
            number: '1',
            year: '2020',
            title: 'Back issue 2020',
        });
        await publishIssue(managerPage, 'Vol. 1 No. 1 (2020)');

        // Control, before the Confirm: the reader page is not there and the
        // Author's Tasks hold no such notice (the grid renders "No Items").
        expect(await readerStatus(page, tag, submissionId)).toBe(404);
        const authorPage = await (await asUser(author)).newPage();
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const tasksBefore = await openTasks(authorPage);
        await expect(tasksBefore.getByText('No Items').first()).toBeVisible({timeout: 30_000});
        await expect(publishedNoticeRows(tasksBefore, `Submission ${tag}s`)).toHaveCount(0);

        // The Publication area heads "Status: Unscheduled".
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Title & Abstract');
        await pub.expectStatus('Unscheduled');

        // "Schedule For Publication" opens "Review Publishing Details":
        // "Assign To Current/Back Issue" arrives preselected before anything
        // is picked; keep it, pick the back issue and fill the stage.
        const panel = await pub.openPublishPanel();
        const backRadio = panel.getByRole('radio', {
            name: 'Assign To Current/Back Issue',
        });
        await expect(backRadio).toBeVisible({timeout: 30_000});
        await pub.awaitAssignmentPreselected(panel);
        await expect(backRadio).toBeChecked();
        await pub.fillVersionDetails(panel);
        await backRadio.check();
        await pub.selectIssueOption(panel, /Vol\. 1 No\. 1 \(2020\)/);
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();

        // The confirmation window: requirements met, the back-issue
        // sentence, and the version to be assigned.
        const confirmation = pub.confirmationDialog(
            'All publication requirements have been met.'
        );
        await expect(
            confirmation.getByText(/This will be published immediately in .*Vol\. 1 No\. 1 \(2020\)/)
        ).toBeVisible({timeout: 30_000});
        await expect(
            confirmation.getByText('Version of Record 1.0').first()
        ).toBeVisible();
        await pub.confirmPublish(confirmation, 'Publish');

        // "Status: Published", Unpublish offered, reader page live.
        await pub.expectStatus('Published');
        await expect(
            pub.rightControls().getByRole('button', {name: 'Unpublish', exact: true})
        ).toBeVisible({timeout: 30_000});
        expect(await readerStatus(page, tag, submissionId)).toBe(200);
        await expect(
            page.getByRole('heading', {name: `Submission ${tag}s`})
        ).toBeVisible({timeout: 30_000});

        // Activity log: "The submission was published." and the Done-stage
        // move in the manager's name.
        const log = await pub.openActivityLog();
        await expect(
            log.getByRole('row').filter({hasText: 'The submission was published.'}).first()
        ).toBeVisible({timeout: 30_000});
        await expect(
            log
                .getByRole('row')
                .filter({hasText: 'Mona Manager moved this submission to the Done stage.'})
                .first()
        ).toBeVisible();
        await log.getByRole('button', {name: 'Close', exact: true}).first().click();

        // The submitting author gets the "Publication Published" email, sent
        // in the journal's name from its principal contact's address (a
        // scratch journal's: admin@mail.test), not the Journal Manager …
        const mail = await pkpMail.find({
            to: authorEmail,
            subject: 'Publication Published',
            contains: tag,
        });
        expect(mail.Subject).toBe('Publication Published');
        expect(mail.From.Name).toBe(`Scratch context ${tag}`);
        expect(mail.From.Address).toBe('admin@mail.test');

        // … and the "was published" task notice.
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const tasks = await openTasks(authorPage);
        await expect(publishedNoticeRows(tasks, `Submission ${tag}s`).first()).toBeVisible({
            timeout: 30_000,
        });
    });

    test('S2: a declined submission cannot be published', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s2', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag);
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}s`,
            decisions: ['initialDecline'],
        });

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Title & Abstract');
        await pub.expectStatus('Unscheduled');

        // The publish button still opens "Review Publishing Details" and
        // insists on the required version fields: an empty Confirm marks
        // both in place.
        const panel = await pub.openPublishPanel();
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        await expect(
            panel.getByText('This field is required.').first()
        ).toBeVisible({timeout: 30_000});

        // Filled, the Confirm continues to the refused window: the
        // requirements heading, the declined line, and no confirm button
        // at all (positive control for the button scope: the same window
        // carries its Close control, and S1's window shows "Publish").
        await pub.fillVersionDetails(panel);
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        const refusal = pub.refusalWindow();
        await expect(
            refusal.getByText('A declined submission can not be published.')
        ).toBeVisible({timeout: 30_000});
        await expect(
            refusal.getByRole('button', {name: 'Publish', exact: true})
        ).toHaveCount(0);
        await expect(
            refusal.getByRole('button', {name: 'Schedule For Publication', exact: true})
        ).toHaveCount(0);
        const closeButton = refusal.getByRole('button', {name: /Cancel|Close/}).last();
        await expect(closeButton).toBeVisible();
        await closeButton.click();
        await expect(refusal).toHaveCount(0, {timeout: 30_000});

        // Not published, not scheduled: the readout shows Rule 1's
        // in-between wording (the panel's Confirm saved the stage onto the
        // declined submission — Rule 7), and no Unpublish/Unschedule is
        // offered while the publish button remains.
        await pub.expectStatus('Unpublished');
        await expect(
            pub.rightControls().getByRole('button', {name: 'Unpublish', exact: true})
        ).toHaveCount(0);
        await expect(
            pub.rightControls().getByRole('button', {name: 'Unschedule', exact: true})
        ).toHaveCount(0);

        // Pressing the button again now SKIPS the panel (Rule 3: a saved
        // stage and confirmed issue choice are in place) and opens the
        // refused window directly — proof the panel's Confirm saved onto
        // the declined submission (Rule 7).
        await pub.publishButton().click();
        const refusal2 = pub.refusalWindow();
        const declinedLine2 = refusal2.getByText(
            'A declined submission can not be published.'
        );
        try {
            await expect(declinedLine2).toBeVisible({timeout: 5_000});
        } catch {
            // fn-k: the first press is occasionally swallowed.
            await pub.publishButton().click();
        }
        await expect(declinedLine2).toBeVisible({timeout: 30_000});
        await expect(
            refusal2.getByText('Review Publishing Details')
        ).toHaveCount(0);
    });

    test('S3: unpublish takes the reader page and the task notice down', async ({asUser, ojsApi, page}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s3', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag);
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}s`,
            published: true,
        });

        // Control: the reader page is live and the author's Tasks carry the
        // "was published" notice before the unpublish.
        expect(await readerStatus(page, tag, submissionId)).toBe(200);
        const authorPage = await (await asUser(author)).newPage();
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const tasksBefore = await openTasks(authorPage);
        await expect(publishedNoticeRows(tasksBefore, `Submission ${tag}s`).first()).toBeVisible({
            timeout: 30_000,
        });

        // The manager unpublishes through the red dialog.
        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Title & Abstract');
        await pub.expectStatus('Published');
        await pub.unpublish();
        await pub.expectStatus('Unscheduled');

        // The reader page is gone and the log gained the unpublish line and
        // the return to the workflow, in the manager's name.
        expect(await readerStatus(page, tag, submissionId)).toBe(404);
        const log = await pub.openActivityLog();
        await expect(
            log
                .getByRole('row')
                .filter({hasText: 'The submission was unpublished.'})
                .first()
        ).toBeVisible({timeout: 30_000});
        await expect(
            log
                .getByRole('row')
                .filter({hasText: 'Mona Manager returned this submission to the workflow.'})
                .first()
        ).toBeVisible();
        await log.getByRole('button', {name: 'Close', exact: true}).first().click();

        // The author's task notice is gone too — their Tasks read
        // "No Items" (the seeded publish's notice was their only one).
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const tasksAfter = await openTasks(authorPage);
        await expect(tasksAfter.getByText('No Items').first()).toBeVisible({
            timeout: 30_000,
        });
        await expect(
            tasksAfter.locator('tr').filter({hasText: 'was published'})
        ).toHaveCount(0);
    });

    test('S4: create a new version', async ({asUser, ojsApi, page, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        const seEmail = `${tag}se@mail.test`;
        const reviewerEmail = `${tag}rv@mail.test`;
        const {manager, author} = await seedJournal(ojsApi, tag, [
            {
                username: `${tag}se`,
                givenName: 'Sena',
                familyName: 'Sectioneditor',
                email: seEmail,
                roles: ['sectionEditor'],
            },
            reviewerUser(tag),
        ]);
        // A published submission with an accepted reviewer left on it and
        // a participating Section Editor (fn-s4), through the review round
        // and on to Production so the draft's Preview is offered (Actors
        // row 4).
        const {submissionId} = await seedThroughReview(ojsApi, {
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            reviewer: `${tag}rv`,
            participants: [{username: `${tag}se`, role: 'sectionEditor'}],
            published: true,
        });

        // Control: the side menu lists the one published version and the
        // reader page's date line carries no "Updated on".
        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);
        await pub.gotoWorkflow(submissionId);
        await expect(pub.versionMenuItem('Version of Record 1.0')).toBeVisible({timeout: 30_000});
        await expect(pub.versionMenuItems()).toHaveCount(1);
        expect(await readerStatus(page, tag, submissionId)).toBe(200);
        await expect(readerDateLine(page)).toHaveText(/\d{4}-\d{2}-\d{2}/, {timeout: 30_000});
        await expect(readerDateLine(page)).not.toContainText('Updated on');

        // The dialog arrives pre-answered: source version, the published
        // version's stage, and "Minor Revision".
        const dialog = await pub.openCreateVersionDialog();
        await expect(
            dialog.locator('select[name="versionSource"] option').filter({
                hasText: 'Version of Record 1.0',
            })
        ).toHaveCount(1);
        await expect(dialog.locator('select[name="versionStage"]')).toHaveValue('VoR');
        await expect(dialog.locator('select[name="versionIsMinor"]')).toHaveValue('true');
        const draftId = await pub.confirmVersionDialog(dialog);

        // The side menu gains "Version of Record 1.1"; its pages open with
        // "Status: Unpublished" and the copied content.
        await pub.openVersionEntry('Version of Record 1.1', 'Title & Abstract');
        await pub.expectStatus('Unpublished');
        expect(await pub.richTextContent('titleAbstract-title-control-en')).toBe(
            `Submission ${tag}s`
        );

        // Readers still get the old version: the page is live and its
        // Versions list shows nothing new (one entry).
        expect(await readerStatus(page, tag, submissionId)).toBe(200);
        await expect(page.locator('.sub_item.versions li')).toHaveCount(1);

        // The draft by address: the address the draft's "Preview" opens is
        // the reader page's with "/version/" and the draft's own number; a
        // signed-out reader is not served the draft there (what the tip
        // answers is recorded in the run; OJS3 stays unasserted as
        // contract).
        const previewUrl = await pub.pressPreview();
        expect(previewUrl).toContain(`/article/view/${submissionId}/version/${draftId}`);
        const draftResponse = await page.goto(previewUrl);
        expect(draftResponse && draftResponse.status()).toBe(404);
        await expect(page.locator('body')).toContainText('404 Not Found');
        await expect(page.getByRole('heading', {name: `Submission ${tag}s`})).toHaveCount(0);

        // The participating editor gets the email and the task notice; the
        // assigned reviewer gets neither (bounded by the editor's receipt).
        const mail = await pkpMail.find({to: seEmail, contains: tag});
        expect(mail.Subject).toContain('A new version was created');
        await pkpMail.expectNone({
            to: reviewerEmail,
            contains: tag,
            afterControl: {to: seEmail, contains: tag},
        });
        const sePage = await (await asUser(`${tag}se`)).newPage();
        await sePage.goto(`/index.php/${tag}/dashboard/editorial`);
        const seTasks = await openTasks(sePage);
        await expect(
            seTasks
                .locator('tr')
                .filter({hasText: 'A new version of a submission was created'})
                .first()
        ).toBeVisible({timeout: 30_000});

        // The Activity Log adds "A new version was created."
        await pub.gotoWorkflow(submissionId);
        const log = await pub.openActivityLog();
        await expect(
            log.getByRole('row').filter({hasText: 'A new version was created.'}).first()
        ).toBeVisible({timeout: 30_000});
    });

    test('S5: publish the new version', async ({asUser, ojsApi, page, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const spareEmail = `${tag}x@mail.test`;
        const {manager, author} = await seedJournal(ojsApi, tag, [
            {
                username: `${tag}x`,
                givenName: 'Xena',
                familyName: 'Spare',
                email: spareEmail,
                roles: ['author'],
            },
        ]);
        const authorEmail = `${tag}au@mail.test`;
        // The Author's published submission, and a spare author's
        // unpublished one for the mailbox control (its "Publication
        // Published" arrives with the email left on).
        const [{submissionId}, spare] = await Promise.all([
            ojsApi.createSubmission({
                tag: `${tag}s`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}s`,
                published: true,
            }),
            ojsApi.createSubmission({
                tag: `${tag}x`,
                context: tag,
                submitter: `${tag}x`,
                title: `Submission ${tag}x`,
            }),
        ]);

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);
        await pub.gotoWorkflow(submissionId);

        // Create the new version (untouched dialog → Version of Record
        // 1.1) and give it a distinguishable abstract.
        const dialog = await pub.openCreateVersionDialog();
        await pub.confirmVersionDialog(dialog);
        await pub.openVersionEntry('Version of Record 1.1', 'Title & Abstract');
        await pub.expectStatus('Unpublished');
        await pub.setRichText(
            'titleAbstract-abstract-control-en',
            `<p>Abstract v2 ${tag}</p>`
        );
        await pub.save();

        // "Insert Content" on the new version's Publication Settings: the
        // submission-language box carries it (one on the page); its side
        // panel reads the empty state; close it.
        await pub.openVersionEntry('Version of Record 1.1', 'Publication Settings');
        await expect(pub.insertContentButton()).toHaveCount(1, {timeout: 30_000});
        const insert = await pub.openInsertContent();
        await expect(insert.getByText(NO_SUMMARIES)).toBeVisible({timeout: 30_000});
        await insert.getByRole('button', {name: 'Close', exact: true}).last().click();
        await expect(insert).toBeHidden({timeout: 30_000});

        // The details: Update Type arrives on "New Version"; choose
        // "Correction", type the summary and save (their reader-side
        // rendering is A5's).
        await expect(pub.updateTypeSelect()).toHaveValue('new_version');
        await pub.updateTypeSelect().selectOption({label: 'Correction'});
        await pub.setRichText(
            'issueEntry-summaryOfChanges-control-en',
            '<p>Figure 2 corrected.</p>'
        );
        await pub.save();

        // The email switched off: the Author, on Profile › Notifications
        // under "Submission Events", ticks the row's "Do not send me an
        // email…" box (the box the row offers) and saves.
        const authorPage = await (await asUser(author)).newPage();
        const profile = new ProfilePage(authorPage, tag);
        await profile.goto('notifications');
        const row = profile.notificationRow(PUBLISHED_ROW);
        await expect(row).toBeVisible({timeout: 30_000});
        const pair = profile.notificationPair('notificationPublicationPublished');
        await expect(pair.email).not.toBeChecked();
        await pair.email.check();
        await profile.save();
        await profile.goto('notifications');
        await expect(
            profile.notificationPair('notificationPublicationPublished').email
        ).toBeChecked({timeout: 30_000});

        // Publish: the panel carries the saved Update Type; the window
        // names "Version of Record 1.1".
        await pub.openVersionEntry('Version of Record 1.1', 'Title & Abstract');
        const panel = await pub.openPublishPanel();
        await expect(panel.locator('select[name="versionStage"]')).toHaveValue('VoR');
        await expect(pub.updateTypeSelect(panel)).toHaveValue('correction');
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        const confirmation = pub.confirmationDialog(
            'Are you sure you want to publish this?'
        );
        await expect(
            confirmation.getByText('Version of Record 1.1').first()
        ).toBeVisible({timeout: 30_000});
        await pub.confirmPublish(confirmation, 'Publish');
        await pub.expectStatus('Published');

        // The reader page serves the new version and its Versions list
        // gains the new entry.
        expect(await readerStatus(page, tag, submissionId)).toBe(200);
        await expect(page.getByText(`Abstract v2 ${tag}`)).toBeVisible({
            timeout: 30_000,
        });
        await expect(page.locator('.sub_item.versions li')).toHaveCount(2);
        await expect(page.locator('.sub_item.versions')).toContainText(
            '(Version of Record 1.1)'
        );

        // The log adds "A new version was published."
        const log = await pub.openActivityLog();
        await expect(
            log
                .getByRole('row')
                .filter({hasText: 'A new version was published.'})
                .first()
        ).toBeVisible({timeout: 30_000});
        await log.getByRole('button', {name: 'Close', exact: true}).first().click();

        // The notice without the email: the Author's Tasks hold the notice,
        // while no "Publication Published" email arrives for them — bounded
        // by the spare author's own "Publication Published", caused the
        // same way with the email left on (as S1's Author got both).
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const tasks = await openTasks(authorPage);
        await expect(publishedNoticeRows(tasks, `Submission ${tag}s`).first()).toBeVisible({
            timeout: 30_000,
        });
        const control = await publishControl(pub, pkpMail, {
            submissionId: spare.submissionId,
            to: spareEmail,
            title: `Submission ${tag}x`,
        });
        expect(control.Subject).toBe('Publication Published');
        expect(
            await pkpMail.count({to: authorEmail, subject: 'Publication Published'})
        ).toBe(0);

        // Unpublish the new version: the reader page stays live serving
        // "Version of Record 1.0", its Versions list one entry shorter.
        await pub.gotoWorkflow(submissionId);
        await pub.openVersionEntry('Version of Record 1.1', 'Title & Abstract');
        await pub.unpublishVersion();
        expect(await readerStatus(page, tag, submissionId)).toBe(200);
        await expect(page.getByText(`Seeded abstract for ${tag}s.`)).toBeVisible({
            timeout: 30_000,
        });
        await expect(page.getByText(`Abstract v2 ${tag}`)).toHaveCount(0);
        await expect(page.locator('.sub_item.versions li')).toHaveCount(1);
        await expect(page.locator('.sub_item.versions')).toContainText(
            '(Version of Record 1.0)'
        );
    });

    test('S6: minor and major numbering', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s6', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag, [reviewerUser(tag)]);
        // The published submission has been through a review round (fn-s6),
        // and a second one, through the same round shape but unpublished,
        // is the review-round control's.
        const [{submissionId}, control] = await Promise.all([
            seedThroughReview(ojsApi, {
                tag: `${tag}s`,
                context: tag,
                submitter: author,
                reviewer: `${tag}rv`,
                published: true,
            }),
            seedThroughReview(ojsApi, {
                tag: `${tag}c`,
                context: tag,
                submitter: author,
                reviewer: `${tag}rv`,
            }),
        ]);

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);
        await pub.gotoWorkflow(submissionId);

        // Control: the side menu lists the one published version before
        // the first "Create New Version".
        await expect(pub.versionMenuItem('Version of Record 1.0')).toBeVisible({timeout: 30_000});
        await expect(pub.versionMenuItems()).toHaveCount(1);

        // Same stage as the existing version: "Minor Revision" selectable
        // (and preselected) → "Version of Record 1.1".
        const first = await pub.openCreateVersionDialog();
        await expect(first.locator('select[name="versionStage"]')).toHaveValue('VoR');
        await expect(
            first.locator('select[name="versionIsMinor"] option[value="true"]')
        ).toBeEnabled();
        await expect(first.locator('select[name="versionIsMinor"]')).toHaveValue('true');
        await pub.confirmVersionDialog(first);
        await expect(pub.versionMenuItem('Version of Record 1.1')).toBeVisible({
            timeout: 30_000,
        });

        // A stage with no versions: "Minor Revision" greyed, the value
        // forced to Major, and the result is that stage's "1.0". (The
        // silent re-select on the way back is A4's — not asserted.)
        const second = await pub.openCreateVersionDialog();
        await second.locator('select[name="versionStage"]').selectOption('AO');
        await expect(
            second.locator('select[name="versionIsMinor"] option[value="true"]')
        ).toBeDisabled();
        await expect(second.locator('select[name="versionIsMinor"]')).toHaveValue('false');
        await pub.confirmVersionDialog(second);
        await expect(pub.versionMenuItem('Author Original 1.0')).toBeVisible({
            timeout: 30_000,
        });

        // A major version in a stage that has versions: "Version of
        // Record" kept and "Major Revision" chosen → "Version of Record
        // 2.0".
        const third = await pub.openCreateVersionDialog();
        await third.locator('select[name="versionStage"]').selectOption('VoR');
        await third.locator('select[name="versionIsMinor"]').selectOption('false');
        await expect(third.locator('select[name="versionIsMinor"]')).toHaveValue('false');
        await pub.confirmVersionDialog(third);
        await expect(pub.versionMenuItem('Version of Record 2.0')).toBeVisible({
            timeout: 30_000,
        });

        // The review round: a "Published Manuscript Under Review" version;
        // on it the publish button (reading "Publish" on this published
        // submission, Rule 2) opens the panel, whose "Associated review
        // round" picker arrives at "Select a review round" with the
        // submission's round listed greyed (it belongs to the version it
        // was opened for); Confirm with the issue fields as they arrive:
        // the window lists the PMUR refusal with no confirm button.
        const fourth = await pub.openCreateVersionDialog();
        await fourth.locator('select[name="versionStage"]').selectOption('PMUR');
        await expect(
            fourth.locator('select[name="versionIsMinor"] option[value="true"]')
        ).toBeDisabled();
        await pub.confirmVersionDialog(fourth);
        await pub.openVersionEntry('Published Manuscript Under Review 1.0', 'Title & Abstract');
        await pub.expectStatus('Unpublished');
        const panel = await pub.openPublishPanel();
        await expect(panel.locator('select[name="versionStage"]')).toHaveValue('PMUR');
        const picker = pub.reviewRoundPicker(panel);
        await expect(picker).toHaveText('Select a review round', {timeout: 30_000});
        const options = await pub.openReviewRoundOptions(panel);
        await expect(options).toHaveCount(1);
        await expect(options.first()).toHaveText(/Round 1 — opened \d{4}-\d{2}-\d{2}/);
        await expect(options.first()).toBeDisabled();
        await pub.closeReviewRoundOptions();
        await expect(picker).toHaveText('Select a review round');
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        const refusal = pub.refusalWindow();
        await expect(refusal.getByText(PMUR_REFUSAL)).toBeVisible({timeout: 30_000});
        await expect(refusal.getByRole('button', {name: 'Publish', exact: true})).toHaveCount(0);
        await expect(
            refusal.getByRole('button', {name: 'Schedule For Publication', exact: true})
        ).toHaveCount(0);
        await pub.closeWindow(refusal);
        await pub.expectStatus('Unpublished');

        // Control: on the version the round was opened for (the second
        // submission's own, still unpublished), the panel's picker arrives
        // pre-filled with "Round 1 — opened {date}"; choosing "Published
        // Manuscript Under Review" and leaving the round as it arrives
        // reaches "All publication requirements have been met." and its
        // "Publish"; close that window without confirming.
        await pub.gotoWorkflow(control.submissionId);
        await pub.openEntry('Title & Abstract');
        await pub.expectStatus('Unscheduled');
        const controlPanel = await pub.openPublishPanel();
        await expect(pub.reviewRoundPicker(controlPanel)).toHaveText(
            /Round 1 — opened \d{4}-\d{2}-\d{2}/,
            {timeout: 30_000}
        );
        await controlPanel.locator('select[name="versionStage"]').selectOption('PMUR');
        await controlPanel.locator('select[name="versionIsMinor"]').selectOption('false');
        await expect(pub.reviewRoundPicker(controlPanel)).toHaveText(/Round 1 — opened/);
        await controlPanel.getByRole('button', {name: 'Confirm', exact: true}).click();
        const allMet = pub.confirmationDialog('All publication requirements have been met.');
        await expect(
            allMet.getByText('Published Manuscript Under Review 1.0').first()
        ).toBeVisible({timeout: 30_000});
        await expect(allMet.getByRole('button', {name: 'Publish', exact: true})).toBeVisible();
        await expect(allMet.getByText(PMUR_REFUSAL)).toHaveCount(0);
        await pub.closeWindow(allMet);
        await pub.expectStatus('Unpublished');
        await expect(
            pub.rightControls().getByRole('button', {name: 'Unpublish', exact: true})
        ).toHaveCount(0);
    });

    test('S7: the version list and the author\'s view', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s7', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag);
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}s`,
            published: true,
        });

        // Two versions: the published 1.0 and an unpublished 1.1.
        const managerPage = await (await asUser(manager)).newPage();
        const managerPub = new PublishScreen(managerPage, tag);
        await managerPub.gotoWorkflow(submissionId);
        const dialog = await managerPub.openCreateVersionDialog();
        await managerPub.confirmVersionDialog(dialog);
        await expect(
            managerPub.versionMenuItem('Version of Record 1.1')
        ).toBeVisible({timeout: 30_000});

        // The author's tracking view lists every version by name; each
        // page heads with the status readout.
        const authorPage = await (await asUser(author)).newPage();
        const authorPub = new PublishScreen(authorPage, tag);
        await authorPub.gotoWorkflow(submissionId, {author: true});
        await expect(
            authorPub.versionMenuItem('Version of Record 1.0')
        ).toBeVisible({timeout: 30_000});
        await expect(
            authorPub.versionMenuItem('Version of Record 1.1')
        ).toBeVisible();
        await authorPub.openVersionEntry('Version of Record 1.1', 'Title & Abstract');
        await authorPub.expectStatus('Unpublished');
        await authorPub.openVersionEntry('Version of Record 1.0', 'Title & Abstract');
        await authorPub.expectStatus('Published');

        // No publish, unpublish or Create-New-Version control anywhere in
        // the author's view (positive control below: the manager's view of
        // the same submission offers Unpublish and Create New Version).
        await expect(
            authorPage.getByRole('button', {name: 'Unpublish', exact: true})
        ).toHaveCount(0);
        await expect(
            authorPage.getByRole('button', {name: 'Publish', exact: true})
        ).toHaveCount(0);
        await expect(
            authorPage.getByRole('button', {name: 'Schedule For Publication', exact: true})
        ).toHaveCount(0);
        await expect(
            authorPage.getByRole('link', {name: 'Create New Version', exact: true})
        ).toHaveCount(0);

        await managerPub.openVersionEntry('Version of Record 1.0', 'Title & Abstract');
        await expect(
            managerPub.rightControls().getByRole('button', {name: 'Unpublish', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(
            managerPage.getByRole('link', {name: 'Create New Version', exact: true})
        ).toBeVisible();
    });

    test('S8: roles without the controls', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s8', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag, [
            {
                username: `${tag}se`,
                givenName: 'Sena',
                familyName: 'Sectioneditor',
                email: `${tag}se@mail.test`,
                roles: ['sectionEditor'],
            },
            {
                username: `${tag}le`,
                givenName: 'Lena',
                familyName: 'Layouteditor',
                email: `${tag}le@mail.test`,
                roles: ['layoutEditor'],
            },
        ]);
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}s`,
            decisions: ['skipExternalReview', 'sendToProduction'],
            participants: [
                {username: `${tag}se`, role: 'sectionEditor'},
                {username: `${tag}le`, role: 'layoutEditor'},
            ],
        });

        // An assigned Section Editor and an assigned Assistant: the
        // Publication pages render (status readout as positive control)
        // but carry no publish controls; the Production stage view still
        // shows them a "Schedule For Publication" button that only lands
        // back on the Publication area.
        for (const username of [`${tag}se`, `${tag}le`]) {
            const rolePage = await (await asUser(username)).newPage();
            const rolePub = new PublishScreen(rolePage, tag);
            await rolePub.gotoWorkflow(submissionId);
            await expect(
                rolePage.getByRole('heading', {name: 'Workflow: Production'})
            ).toBeVisible({timeout: 30_000});
            const shortcut = rolePage
                .locator('[data-cy="workflow-action-items"]')
                .getByRole('button', {name: 'Schedule For Publication', exact: true});
            await expect(shortcut).toBeVisible({timeout: 30_000});
            await shortcut.click();
            await expect(
                rolePage.getByRole('heading', {name: 'Publication: Title & Abstract'})
            ).toBeVisible({timeout: 30_000});
            // Landed on the Publication area: no panel opened …
            await expect(rolePage.getByText('Review Publishing Details')).toHaveCount(0);
            // … the readout is there, the controls are not.
            await rolePub.expectStatus('Unscheduled');
            await expect(rolePub.rightControls()).toHaveCount(0);
            await expect(
                rolePage.getByRole('link', {name: 'Create New Version', exact: true})
            ).toHaveCount(0);
        }

        // Positive control: the manager's same Publication page offers the
        // publish button and the Create New Version item.
        const managerPage = await (await asUser(manager)).newPage();
        const managerPub = new PublishScreen(managerPage, tag);
        await managerPub.gotoWorkflow(submissionId);
        await managerPub.openEntry('Title & Abstract');
        await expect(managerPub.publishButton()).toBeVisible({timeout: 30_000});
        await expect(
            managerPage.getByRole('link', {name: 'Create New Version', exact: true})
        ).toBeVisible();
    });

    test('S9: unschedule a scheduled version', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s9', testInfo);
        // Scheduled state seeded on publicknowledge: publishing into the
        // seeded, still-unpublished issue Vol. 2 No. 1 (2015) lands as
        // "Scheduled" (the issue itself stays untouched); a second, plainly
        // published submission is the control's.
        const [{submissionId}, published] = await Promise.all([
            ojsApi.createSubmission({
                tag,
                context: JOURNAL,
                submitter: 'author.alex',
                title: `Submission ${tag}`,
                decisions: ['skipExternalReview', 'sendToProduction'],
                published: true,
                issue: {volume: 2, number: 1, year: 2015},
            }),
            ojsApi.createSubmission({
                tag: `${tag}p`,
                context: JOURNAL,
                submitter: 'author.alex',
                title: `Submission ${tag}p`,
                published: true,
            }),
        ]);

        const managerPage = await (await asUser('manager.maya')).newPage();
        const pub = new PublishScreen(managerPage, JOURNAL);
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Title & Abstract');
        await pub.expectStatus('Scheduled');

        // The button offered is "Unschedule" (no publish button on a
        // scheduled version); its red dialog asks the scheduled wording.
        await expect(
            pub.rightControls().getByRole('button', {name: 'Unschedule', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(pub.publishButton()).toHaveCount(0);
        await pub.unschedule();
        await pub.expectStatus('Unscheduled');

        // The Activity Log adds the unpublish line (no unschedule wording
        // exists).
        const log = await pub.openActivityLog();
        await expect(
            log.getByRole('row').filter({hasText: 'The submission was unpublished.'}).first()
        ).toBeVisible({timeout: 30_000});
        await log.getByRole('button', {name: 'Close', exact: true}).first().click();

        // Control: on a published version the same place offers
        // "Unpublish" instead.
        await pub.gotoWorkflow(published.submissionId);
        await pub.openEntry('Title & Abstract');
        await pub.expectStatus('Published');
        await expect(
            pub.rightControls().getByRole('button', {name: 'Unpublish', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(
            pub.rightControls().getByRole('button', {name: 'Unschedule', exact: true})
        ).toHaveCount(0);
    });

    test('S10: republish with what was kept', async ({asUser, ojsApi, page}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s10', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag);
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}s`,
        });

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);
        await createIssue(managerPage, tag, {
            volume: '9',
            number: '9',
            year: '2099',
            title: 'Future issue 2099',
        });

        // Publish as continuous publication into the future issue. (With
        // only a future issue and nothing saved, no assignment arrives
        // preselected — the panel open is bounded by its status fetch.)
        // Control: this first publish opens the panel (Rule 3) and stamps
        // today (Rule 8), read below on Publication Settings.
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Title & Abstract');
        const panel = await pub.openPublishPanelExpectingIssueFields();
        await pub.fillVersionDetails(panel);
        const continuous = panel.getByRole('radio', {
            name: 'Assign To Future Issue and Publish Immediately',
        });
        await expect(continuous).toBeVisible({timeout: 30_000});
        await continuous.check();
        await pub.selectIssueOption(panel, /Vol\. 9 No\. 9 \(2099\)/);
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        const confirmation = pub.confirmationDialog(
            'published immediately as continuous publication'
        );
        await pub.confirmPublish(confirmation, 'Publish');
        await pub.expectStatus('Published');
        expect(await readerStatus(page, tag, submissionId)).toBe(200);

        // Unpublish while the issue is still unpublished.
        await pub.unpublish();
        await pub.expectStatus('Unscheduled');
        expect(await readerStatus(page, tag, submissionId)).toBe(404);

        // The entry page: the issue choice and the publication date (today)
        // are still filled; "2030/01/01" is refused with the format
        // message and the kept date stands.
        await pub.openEntry('Publication Settings');
        await expect(
            managerPage.getByRole('radio', {
                name: 'Assign To Future Issue and Publish Immediately',
            })
        ).toBeChecked({timeout: 30_000});
        await expect(
            managerPage.locator('select[name="issueId"] option:checked')
        ).toHaveText(/Vol\. 9 No\. 9 \(2099\)/, {timeout: 30_000});
        await expect(pub.datePublishedInput()).toHaveValue(/^\d{4}-\d{2}-\d{2}$/, {timeout: 30_000});
        const stamped = await pub.datePublishedInput().inputValue();
        expect(todays()).toContain(stamped);
        await pub.datePublishedInput().fill('2030/01/01');
        await pub.saveButton().click();
        await expect(pub.fieldError(DATE_FORMAT)).toBeVisible({timeout: 30_000});
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Publication Settings');
        await expect(pub.datePublishedInput()).toHaveValue(stamped, {timeout: 30_000});

        // Reopening the flow: the panel reopens (the unpublished status is
        // outside Rule 3's ready pair; what the scenario says is returned
        // as a finding) with the kept issue choice pre-checked, and the
        // choice decides again — straight back to "Published" through the
        // same continuous-publication window.
        await pub.openEntry('Title & Abstract');
        const panel2 = await pub.openPublishPanelExpectingIssueFields();
        await expect(
            panel2.getByRole('radio', {
                name: 'Assign To Future Issue and Publish Immediately',
            })
        ).toBeChecked({timeout: 30_000});
        await expect(
            panel2.locator('select[name="issueId"] option:checked')
        ).toHaveText(/Vol\. 9 No\. 9 \(2099\)/);
        await panel2.getByRole('button', {name: 'Confirm', exact: true}).click();
        const confirmation2 = pub.confirmationDialog(
            'published immediately as continuous publication'
        );
        await pub.confirmPublish(confirmation2, 'Publish');
        await pub.expectStatus('Published');
        expect(await readerStatus(page, tag, submissionId)).toBe(200);
        await pub.openEntry('Publication Settings');
        await expect(pub.datePublishedInput()).toHaveValue(stamped, {timeout: 30_000});
    });

    test('S11: schedule into a future issue', async ({asUser, ojsApi, page, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s11', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag);
        const authorEmail = `${tag}au@mail.test`;
        // The article to schedule, and a second one by the same Author for
        // the mailbox control (published immediately below).
        const [{submissionId}, control] = await Promise.all([
            ojsApi.createSubmission({
                tag: `${tag}s`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}s`,
            }),
            ojsApi.createSubmission({
                tag: `${tag}p`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}p`,
            }),
        ]);

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);
        // A published back issue alongside the future issue: on a journal
        // with no published issues the Publication Settings page's FIRST
        // assignment pick falls into OJS2's trap too (probed 2026-08-29:
        // the saved "Schedule Only" comes back as "Publish Immediately"),
        // so this test runs on the journal shape the scenario's Given
        // holds and leaves the 🐞 unasserted.
        await createIssue(managerPage, tag, {
            volume: '1',
            number: '1',
            year: '2020',
            title: 'Back issue 2020',
        });
        await publishIssue(managerPage, 'Vol. 1 No. 1 (2020)');
        await createIssue(managerPage, tag, {
            volume: '9',
            number: '9',
            year: '2099',
            title: 'Future issue 2099',
        });

        // Publication Settings: the arrival and its refused first save,
        // then "Assign To Future Issue and Schedule Only" plus the issue,
        // saved.
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Publication Settings');
        const scheduleOnlyOnPage = managerPage.getByRole('radio', {
            name: 'Assign To Future Issue and Schedule Only',
        });
        await expect(scheduleOnlyOnPage).toBeVisible({timeout: 30_000});
        // The page arrives on "Assign To Current/Back Issue" with "Issue"
        // empty, so a first save with only "Pages" typed is refused in the
        // page: no publications write leaves the browser (Fields).
        await expect(
            managerPage.getByRole('radio', {name: 'Assign To Current/Back Issue'})
        ).toBeChecked({timeout: 30_000});
        await expect(managerPage.locator('select[name="issueId"]')).toHaveValue('');
        await managerPage.getByLabel('Pages', {exact: true}).fill('11-22');
        const sent = await pub.saveRefusedInPlace(pub.fieldError('This field is required.'));
        expect(sent).toBe(0);
        await expect(managerPage.getByText('Please correct one error.')).toBeVisible();
        // Content-verified save (the U40 S4 idiom): a late async publication
        // refresh can remount the form after the picks, so the save POSTs
        // the OLD assignment (200 + toast, stale DB) and the panel below
        // then opens with the radio unchecked (CI 2026-08-30 and
        // 2026-09-01, retries exhausted). Each bounded attempt redoes
        // radio+issue and passes only when the save response's publication
        // JSON holds the scheduled status and an issue.
        await expect(async () => {
            await scheduleOnlyOnPage.check();
            await pub.selectIssueOption(managerPage, /Vol\. 9 No\. 9 \(2099\)/);
            const saved = waitForPublicationSave(managerPage);
            await pub.saveButton().click();
            const publication = await (await saved).json();
            // 7 = Publication::STATUS_READY_TO_SCHEDULE — what the
            // "Schedule Only" choice commits (IssueAssignment enum).
            expect(publication.status).toBe(7);
            expect(publication.issueId).toBeTruthy();
        }).toPass({intervals: [1_000, 2_000], timeout: 90_000});

        // "Schedule For Publication": the panel opens (no Publication
        // Stage saved yet) with the saved choice pre-checked and its
        // issue pre-picked; fill the remaining required fields and
        // Confirm. The workflow is reloaded first: opening the panel
        // straight after the save races the store's async publication
        // refresh (app-changes row 9 family) and the panel's issue select
        // then never receives the saved issue. The issue assertion also
        // bounds the panel's async issue-options load — an earlier
        // Confirm is refused client-side while the select is still empty.
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Title & Abstract');
        const panel = await pub.openPublishPanelExpectingIssueFields();
        await expect(
            panel.getByRole('radio', {
                name: 'Assign To Future Issue and Schedule Only',
            })
        ).toBeChecked({timeout: 30_000});
        await expect(
            panel.locator('select[name="issueId"] option:checked')
        ).toHaveText(/Vol\. 9 No\. 9 \(2099\)/, {timeout: 30_000});
        await pub.fillVersionDetails(panel);
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();

        // The window promises publication when the issue is published and
        // its button reads "Schedule For Publication".
        const confirmation = pub.confirmationDialog('This will be published when');
        await expect(
            confirmation.getByText(/This will be published when .*Vol\. 9 No\. 9 \(2099\)/)
        ).toBeVisible({timeout: 30_000});
        await pub.confirmPublish(confirmation, 'Schedule For Publication');

        // "Status: Scheduled", the reader page stays down, and the
        // dashboard lists it under "Scheduled for publication".
        await pub.expectStatus('Scheduled');
        await expect(
            pub.rightControls().getByRole('button', {name: 'Unschedule', exact: true})
        ).toBeVisible({timeout: 30_000});
        expect(await readerStatus(page, tag, submissionId)).toBe(404);

        // Nothing stamped: Publication Settings' "Publication Date" is
        // still empty (its issue choice, saved above, is the positive
        // control of the read).
        await pub.openEntry('Publication Settings');
        await expect(
            managerPage.locator('select[name="issueId"] option:checked')
        ).toHaveText(/Vol\. 9 No\. 9 \(2099\)/, {timeout: 30_000});
        await expect(pub.datePublishedInput()).toHaveValue('');

        // The Activity Log adds "The submission was scheduled for
        // publication."
        const log = await pub.openActivityLog();
        await expect(
            log
                .getByRole('row')
                .filter({hasText: 'The submission was scheduled for publication.'})
                .first()
        ).toBeVisible({timeout: 30_000});
        await log.getByRole('button', {name: 'Close', exact: true}).first().click();

        const dash = new EditorialDashboardPage(managerPage, tag);
        await dash.goto();
        await dash.openView('Scheduled for publication');
        const row = await dash.findRowByTag(`${tag}s`);
        await expect(row).toContainText(`Submission ${tag}s`);

        // Nothing sent: the Author's Tasks hold no notice (the grid reads
        // "No Items"; S1 read the notice the same way), and no
        // "Publication Published" email arrives for the scheduled article,
        // bounded by the same Author's "Publication Published" for a
        // second article the test publishes immediately (S1's immediate
        // publish stamped, sent and filed the same way).
        const authorPage = await (await asUser(author)).newPage();
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const tasks = await openTasks(authorPage);
        await expect(tasks.getByText('No Items').first()).toBeVisible({timeout: 30_000});
        await expect(publishedNoticeRows(tasks, `Submission ${tag}s`)).toHaveCount(0);
        const controlMail = await publishControl(pub, pkpMail, {
            submissionId: control.submissionId,
            to: authorEmail,
            title: `Submission ${tag}p`,
        });
        expect(controlMail.Subject).toBe('Publication Published');
        expect(
            await pkpMail.count({
                to: authorEmail,
                subject: 'Publication Published',
                contains: `Submission ${tag}s`,
            })
        ).toBe(0);
    });

    test('S12: continuous publication warns and publishes; publishing the issue releases the scheduled article', async ({asUser, ojsApi, page}, testInfo) => {
        test.slow();
        test.setTimeout(360_000);
        const tag = makeTag('s12', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag);
        const seed = (suffix) =>
            ojsApi.createSubmission({
                tag: `${tag}${suffix}`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}${suffix}`,
            });
        const [continuousSub, scheduledSub, issuelessSub, lateSub] = await Promise.all([
            seed('a'),
            seed('b'),
            seed('c'),
            seed('d'),
        ]);

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);
        await createIssue(managerPage, tag, {
            volume: '9',
            number: '9',
            year: '2099',
            title: 'Future issue 2099',
        });

        // Schedule one article into the future issue through the
        // Publication-Settings-first route (the panel's direct first
        // pick is OJS2's 🐞 — untested) …
        await pub.gotoWorkflow(scheduledSub.submissionId);
        await pub.scheduleToFutureIssue(/Vol\. 9 No\. 9 \(2099\)/);
        await pub.expectStatus('Scheduled');
        expect(await readerStatus(page, tag, scheduledSub.submissionId)).toBe(404);

        // … and publish the other immediately as continuous publication:
        // the window spells out that the issue is not published yet.
        // Control for the last leg: with the future issue unpublished the
        // panel offers both "Future Issue" choices.
        await pub.gotoWorkflow(continuousSub.submissionId);
        await pub.openEntry('Title & Abstract');
        const panelA = await pub.openPublishPanelExpectingIssueFields();
        await pub.fillVersionDetails(panelA);
        await expect(panelA.getByRole('radio', {name: /Future Issue/})).toHaveCount(2);
        await expect(
            panelA.getByRole('radio', {name: 'Assign To Future Issue and Schedule Only'})
        ).toBeVisible();
        const continuous = panelA.getByRole('radio', {
            name: 'Assign To Future Issue and Publish Immediately',
        });
        await expect(continuous).toBeVisible({timeout: 30_000});
        await continuous.check();
        await pub.selectIssueOption(panelA, /Vol\. 9 No\. 9 \(2099\)/);
        await panelA.getByRole('button', {name: 'Confirm', exact: true}).click();
        const confirmation = pub.confirmationDialog(
            'published immediately as continuous publication'
        );
        await expect(
            confirmation.getByText(/even though it is assigned to .*Vol\. 9 No\. 9 \(2099\).* which is not published yet/)
        ).toBeVisible({timeout: 30_000});
        await pub.confirmPublish(confirmation, 'Publish');
        await pub.expectStatus('Published');

        // Live at once, listed with its still-unpublished issue.
        expect(await readerStatus(page, tag, continuousSub.submissionId)).toBe(200);
        await expect(page.locator('.item.issue')).toContainText(
            'Vol. 9 No. 9 (2099)',
            {timeout: 30_000}
        );

        // "Don't Assign To An Issue" on the second: the window reads the
        // issue-less sentence; the reader page is live at once.
        await pub.gotoWorkflow(issuelessSub.submissionId);
        await pub.openEntry('Title & Abstract');
        const panelC = await pub.openPublishPanelExpectingIssueFields();
        await pub.fillVersionDetails(panelC);
        const dontAssign = panelC.getByRole('radio', {name: "Don't Assign To An Issue"});
        await expect(dontAssign).toBeVisible({timeout: 30_000});
        await dontAssign.check();
        await panelC.getByRole('button', {name: 'Confirm', exact: true}).click();
        const confirmationC = pub.confirmationDialog(
            'published immediately without any issue association'
        );
        await expect(
            confirmationC.getByText('All publication requirements have been met.')
        ).toBeVisible({timeout: 30_000});
        await pub.confirmPublish(confirmationC, 'Publish');
        await pub.expectStatus('Published');
        expect(await readerStatus(page, tag, issuelessSub.submissionId)).toBe(200);
        await expect(page.locator('.item.issue .title')).toHaveCount(0);

        // Publishing the issue (an Issues act) releases the scheduled
        // article.
        await managerPage.goto(`/index.php/${tag}/manageIssues`);
        await publishIssue(managerPage, 'Vol. 9 No. 9 (2099)');
        await pub.gotoWorkflow(scheduledSub.submissionId);
        await pub.openEntry('Title & Abstract');
        await pub.expectStatus('Published');
        expect(await readerStatus(page, tag, scheduledSub.submissionId)).toBe(200);

        // No future issue left: the third submission's panel offers no
        // "Future Issue" choice, only "Don't Assign To An Issue" and
        // "Assign To Current/Back Issue".
        await pub.gotoWorkflow(lateSub.submissionId);
        await pub.openEntry('Title & Abstract');
        const panelD = await pub.openPublishPanelExpectingIssueFields();
        await pub.awaitAssignmentPreselected(panelD);
        await expect(panelD.getByRole('radio', {name: /Future Issue/})).toHaveCount(0);
        await expect(panelD.locator('input[name="assignment"]')).toHaveCount(2);
        await expect(
            panelD.getByRole('radio', {name: "Don't Assign To An Issue"})
        ).toBeVisible();
        await expect(
            panelD.getByRole('radio', {name: 'Assign To Current/Back Issue'})
        ).toBeVisible();
        await pub.cancelPanel(panelD);
    });

    test('S13: no issues, no choices', async ({asUser, ojsApi, page}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s13', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag);
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}s`,
        });

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);
        await pub.gotoWorkflow(submissionId);
        await pub.openEntry('Title & Abstract');

        // The panel shows no Issue Assignment at all (positive control:
        // its version fields are there; the issueless confirmation window
        // below proves the flow took the no-issue path).
        const panel = await pub.openPublishPanel();
        await pub.fillVersionDetails(panel);
        await expect(panel.locator('input[name="assignment"]')).toHaveCount(0);
        await expect(panel.getByText('Issue Assignment')).toHaveCount(0);
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        const confirmation = pub.confirmationDialog(
            'published immediately without any issue association'
        );
        await expect(
            confirmation.getByText('All publication requirements have been met.')
        ).toBeVisible({timeout: 30_000});
        await pub.confirmPublish(confirmation, 'Publish');

        // Published immediately, issueless: live reader page with no
        // issue block.
        await pub.expectStatus('Published');
        expect(await readerStatus(page, tag, submissionId)).toBe(200);
        await expect(
            page.getByRole('heading', {name: `Submission ${tag}s`})
        ).toBeVisible({timeout: 30_000});
        await expect(page.locator('.item.issue .title')).toHaveCount(0);

        // Control: once the journal has an issue, the same panel (on a
        // second submission) carries the "Issue Assignment" choices.
        const second = await ojsApi.createSubmission({
            tag: `${tag}c`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}c`,
        });
        await createIssue(managerPage, tag, {
            volume: '9',
            number: '9',
            year: '2099',
            title: 'Future issue 2099',
        });
        await pub.gotoWorkflow(second.submissionId);
        await pub.openEntry('Title & Abstract');
        const controlPanel = await pub.openPublishPanelExpectingIssueFields();
        await expect(controlPanel.getByText('Issue Assignment')).toBeVisible({timeout: 30_000});
        await expect(controlPanel.locator('input[name="assignment"]')).not.toHaveCount(0);
        await pub.cancelPanel(controlPanel);
    });

    test('S17: a submission still in Review already offers the publish button', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s17', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag, [reviewerUser(tag)]);
        const [inReview, inProduction] = await Promise.all([
            ojsApi.createSubmission({
                tag: `${tag}r`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}r`,
                decisions: ['sendExternalReview'],
                reviewRounds: [{reviewers: [{username: `${tag}rv`, status: 'accepted'}]}],
            }),
            ojsApi.createSubmission({
                tag: `${tag}p`,
                context: tag,
                submitter: author,
                title: `Submission ${tag}p`,
                decisions: ['skipExternalReview', 'sendToProduction'],
            }),
        ]);

        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);

        // The Publication area in Review: the top right already offers
        // "Schedule For Publication" (left unpressed) and no "Preview"
        // among the publishing controls; nor does the workflow window's
        // header offer one on this submission (what the tip shows; the
        // scenario's header sentence is returned as a finding).
        await pub.gotoWorkflow(inReview.submissionId);
        await expect(
            managerPage.getByRole('heading', {name: 'Workflow: Review'})
        ).toBeVisible({timeout: 30_000});
        await pub.openEntry('Title & Abstract');
        await pub.expectStatus('Unscheduled');
        await expect(
            pub.rightControls().getByRole('button', {name: 'Schedule For Publication', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(pub.rightControls().getByRole('button')).toHaveCount(1);
        await expect(pub.previewButton()).toHaveCount(0);
        await expect(pub.previewButtons()).toHaveCount(0);

        // Control: the Production-stage submission's Publication area
        // offers the same publish button with "Preview" beside it, and the
        // window's header carries its own, separate Preview.
        await pub.gotoWorkflow(inProduction.submissionId);
        await expect(
            managerPage.getByRole('heading', {name: 'Workflow: Production'})
        ).toBeVisible({timeout: 30_000});
        await pub.openEntry('Title & Abstract');
        await expect(
            pub.rightControls().getByRole('button', {name: 'Schedule For Publication', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(pub.previewButton()).toBeVisible();
        await expect(pub.rightControls().getByRole('button')).toHaveCount(2);
        await expect(pub.previewButtons()).toHaveCount(2);
    });

    test('S18: "Send to Text Editor" only on importable files', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(240_000);
        const tag = makeTag('s18', testInfo);
        const {manager, author} = await seedJournal(ojsApi, tag);
        const {submissionId} = await ojsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title: `Submission ${tag}s`,
            decisions: ['skipExternalReview', 'sendToProduction'],
        });

        // Seeded submissions carry no files: both are uploaded through the
        // "Production Ready Files" list's own upload control.
        const managerPage = await (await asUser(manager)).newPage();
        const pub = new PublishScreen(managerPage, tag);
        await pub.gotoWorkflow(submissionId);
        await expect(
            managerPage.getByRole('heading', {name: 'Workflow: Production'})
        ).toBeVisible({timeout: 30_000});
        await expect(pub.productionReadyFiles().getByText('No Items')).toBeVisible({
            timeout: 30_000,
        });
        await pub.uploadProductionReadyFile(path.join(FIXTURES, 'notes.md'), 'notes.md');
        await pub.uploadProductionReadyFile(path.join(FIXTURES, 'article.pdf'), 'article.pdf');

        // The Markdown row's "More Actions" offers "Send to Text Editor";
        // its dialog asks which version, "Create New Version" first, then
        // each existing version, none selected as it opens; "Cancel"
        // leaves the file where it is.
        const mdItems = await pub.openProductionReadyFileMenu('notes.md');
        await expect(mdItems.filter({hasText: 'Send to Text Editor'})).toHaveCount(1);
        await managerPage.getByRole('menuitem', {name: 'Send to Text Editor', exact: true}).click();
        const dialog = pub.sendToTextEditorDialog();
        await expect(
            dialog.getByText('To which version would you like to send this file?')
        ).toBeVisible({timeout: 30_000});
        const picker = pub.sendToVersionPicker(dialog);
        await expect(picker.locator('option').first()).toHaveText('Create New Version');
        await expect(picker.locator('option')).toHaveCount(2);
        await expect(picker.locator('option').nth(1)).toHaveText(/^Unassigned version \(\d{4}-\d{2}-\d{2}\)$/);
        await expect(picker).toHaveValue('');
        await expect(dialog.getByRole('button', {name: 'Confirm', exact: true})).toBeVisible();
        await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(dialog).toBeHidden({timeout: 30_000});
        await expect(pub.productionReadyFileRow('notes.md')).toBeVisible();
        await expect(pub.productionReadyFileRow('article.pdf')).toBeVisible();
        await expect(
            pub.productionReadyFiles().getByRole('row').filter({hasText: /notes\.md|article\.pdf/})
        ).toHaveCount(2);

        // Control: the PDF row's "More Actions" offers no "Send to Text
        // Editor" (its other items are the positive control of the read).
        const pdfItems = await pub.openProductionReadyFileMenu('article.pdf');
        await expect(pdfItems.filter({hasText: 'Update File Details'})).toHaveCount(1);
        await expect(pdfItems.filter({hasText: 'Send to Text Editor'})).toHaveCount(0);
        await pub.closeMenu();
    });
});
