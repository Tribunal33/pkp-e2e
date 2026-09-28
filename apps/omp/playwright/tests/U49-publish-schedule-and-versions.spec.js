// @ts-check
/**
 * @file playwright/tests/U49-publish-schedule-and-versions.spec.js
 *
 * Publish, schedule & versions — OMP suite: one test per canonical scenario
 * the spec runs on a press (S1–S10 common, S14 {OMP}, S17–S18 {OJS OMP}),
 * in the press's own vocabulary: Press Manager, monograph, catalog book
 * page, the "Publish" button whose confirmation window is titled "Schedule
 * For Publication", scheduling by a future "Date Published" on the Catalog
 * Entry page. The press markers ride inside the common tests: the
 * awaiting-approval banner and its replacement pair (Rule 17, S1), the
 * refused window opening directly on a declined monograph (Rule 7's press
 * leg, S2), "Insert Content" on the Catalog Entry page's Summary of
 * Changes (Rule 14, S5) and the date-route scheduling behind S9's
 * Unschedule.
 * Spec: docs/specs/U49-publish-schedule-and-versions.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A5 🐞
 * (S5 fills and publishes a Summary of Changes without asserting the
 * amendment notice either way), A6 🐞 (S4 asserts the reader page's date
 * line only BEFORE the draft, never the rewritten line after it), A1 ❓,
 * A2 ❓ (S8 asserts the on-screen absence only), A3 ❓, A4 ❓ (S6 never
 * asserts the re-selection), A7 ❓, OMP1 ❓ (S9 and S14 assert the window's
 * wording as the scenario's own sentence, nothing about its promise),
 * OJS1–OJS3, OPS1–OPS5 (other apps). The spec's Coverage section records
 * everything else left out.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only (A1, A7): the mailbox- and profile-scoped tests (S1, S3,
 * S4, S5, S14) run on scratch presses with throwaway users whose addresses
 * carry app + test (u49omps1w0…@mail.test); the rest only add their own
 * tagged submissions to publicknowledge. Mailpit reads are scoped by those
 * recipients (A8); every absence claim is a settled read paired with a
 * positive control taken the same way, and every mailbox silence is
 * bounded by a message the test itself causes (`pkpMail.expectNone`, a
 * bounded `count`). Waits are event-based (publish/version/unpublish API
 * responses, the form footer's "Saved" status, web-first assertions) — no
 * hard-coded sleeps. Everything runs in the parallel `omp` project.
 */
const path = require('path');
const {test, expect} = require('../support/fixtures.js');
const {ProfilePage} = require('../../../../shared/playwright/pages/ProfilePage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {closeMenu} = require('../../../../shared/playwright/support/menus.js');

const PK = 'publicknowledge';
const PK_PREFIX = '/en';
const FIXTURES = path.join(__dirname, '..', 'fixtures', 'files');

/** The Author's task notice for a published version (Side effects). */
const publishedNotice = (title) =>
    `A new version of your submission, "${title}", was published.`;

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u49omp${scenario}w${testInfo.parallelIndex}${Math.random()
        .toString(36)
        .slice(2, 8)}`;
}

/** Throwaway manager+author users for a scratch press. */
function scratchUsers(tag, extra = []) {
    return [
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
        ...extra,
    ];
}

/**
 * Open a monograph's workflow view (editorial or author dashboard) and wait
 * for the Publication group to render. An optional menuKey deep-links to one
 * version's page via the app's own workflowMenuKey query parameter.
 */
async function openWorkflow(
    page,
    contextPath,
    submissionId,
    {author = false, menuKey = null} = {}
) {
    const dashboard = author ? 'mySubmissions' : 'editorial';
    const keyParam = menuKey ? `&workflowMenuKey=${menuKey}` : '';
    await page.goto(
        `/index.php/${contextPath}/dashboard/${dashboard}?workflowSubmissionId=${submissionId}${keyParam}`
    );
    await expect(
        page.getByRole('link', {name: 'Publication', exact: true})
    ).toBeVisible({timeout: 30_000});
}

/**
 * From an open workflow view, open one of the Publication group's pages and
 * wait for its "Publication: {entry}" heading. The group is expanded by
 * default — clicking "Publication" would collapse it, so it is only clicked
 * when the entry is hidden. With several versions expanded the entry link
 * can exist more than once — deep-link via openWorkflow's menuKey instead.
 */
async function openPublicationPage(page, entry) {
    const link = await new WorkflowPage(page, PK).revealPublicationEntry(entry);
    await link.click();
    await expect(
        page.getByRole('heading', {name: `Publication: ${entry}`})
    ).toBeVisible({timeout: 30_000});
}

/** The status readout container ("Status:" + colored dot + state label). */
function statusReadout(page) {
    return page.locator('div:has(> span:text-is("Status:"))');
}

/** Assert the Publication head's status readout. */
async function expectStatus(page, label) {
    await expect(statusReadout(page)).toContainText(label, {timeout: 30_000});
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
    await page.getByRole('button', {name: 'Save', exact: true}).click();
    await saved;
    await expect(
        page.locator('.pkpFormPage__status', {hasText: 'Saved'})
    ).toBeVisible({timeout: 30_000});
}

/**
 * Press the top-right "Publish" button and wait for the confirmation window
 * (titled "Schedule For Publication" even on a press — Rule 2's OMP leg).
 * Returns the modal locator; the caller asserts its content and confirms.
 */
async function openPublishModal(page) {
    await page.getByRole('button', {name: 'Publish', exact: true}).click();
    const modal = page.getByRole('dialog', {name: /Schedule For Publication/});
    await expect(modal).toBeVisible({timeout: 30_000});
    return modal;
}

/**
 * Confirm the publish window and wait for the publish endpoint plus the
 * control that proves the new state (Unpublish on a publish-now, Unschedule
 * on a future-dated schedule).
 */
async function confirmPublish(page, modal, {expectButton = 'Unpublish'} = {}) {
    const published = page.waitForResponse(
        (r) => r.url().includes('/publish') && r.ok(),
        {timeout: 30_000}
    );
    await modal.getByRole('button', {name: 'Publish', exact: true}).click();
    await published;
    await expect(
        page.getByRole('button', {name: expectButton, exact: true})
    ).toBeVisible({timeout: 30_000});
}

/** Full publish-now cycle from an open Publication page. */
async function publishFromWorkflow(page) {
    const modal = await openPublishModal(page);
    await confirmPublish(page, modal);
}

/** Unpublish the open workflow's current publication (confirm dialog). */
async function unpublishFromWorkflow(page) {
    await page.getByRole('button', {name: 'Unpublish', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Unpublish'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    await expect(
        dialog.getByText("Are you sure you don't want this to be published?")
    ).toBeVisible();
    const unpublished = page.waitForResponse(
        (r) => r.url().includes('/unpublish') && r.ok(),
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Unpublish', exact: true}).click();
    await unpublished;
    await expect(
        page.getByRole('button', {name: 'Publish', exact: true})
    ).toBeVisible({timeout: 30_000});
}

/**
 * Set the Catalog Entry page's "Date Published" and save (the date route
 * that schedules a press item — Rule 6).
 */
async function saveDatePublished(page, value) {
    await openPublicationPage(page, 'Catalog Entry');
    await field(page, /^Date Published/).locator('input').first().fill(value);
    await savePublicationForm(page);
}

/** Open the Activity Log dialog and assert a line, then close it by its "Close" (patterns.md pitfall 7). */
async function expectLogLine(page, text) {
    await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
    const log = page.getByRole('dialog', {name: /Activity Log/});
    await expect(log.getByText(text).first()).toBeVisible({timeout: 30_000});
    await log.getByRole('button', {name: 'Close', exact: true}).first().click();
    await expect(log).toHaveCount(0, {timeout: 30_000});
}

/** Open the dashboard Tasks dialog for the given context/dashboard. */
async function openTasks(page, contextPath, {author = false} = {}) {
    const dashboard = author ? 'mySubmissions' : 'editorial';
    await page.goto(`/index.php/${contextPath}/dashboard/${dashboard}`);
    await page.getByRole('button', {name: 'Tasks'}).click();
    return page.getByRole('dialog').filter({hasText: 'Tasks'});
}

/** The catalog book page URL (publicknowledge is bilingual → /en prefix). */
function bookUrl(contextPath, submissionId) {
    const prefix = contextPath === PK ? PK_PREFIX : '';
    return `/index.php/${contextPath}${prefix}/catalog/book/${submissionId}`;
}

/**
 * Open the Create New Version dialog from the side menu. Returns the dialog
 * locator (title "Create New Version", Confirm/Cancel footer).
 */
async function openCreateVersionDialog(page) {
    const item = await new WorkflowPage(page, PK).revealPublicationEntry('Create New Version');
    // The dialog takes its stage from the loaded version at mount.
    await new WorkflowPage(page, PK).expectVersionLoaded();
    await item.click();
    const dialog = page.getByRole('dialog', {name: 'Create New Version'});
    await expect(dialog).toBeVisible({timeout: 30_000});
    // The dialog's selects arrive with the store's data; bound on the stage
    // select having rendered its options.
    await expect(dialog.getByLabel('Publication Stage')).toBeVisible({
        timeout: 30_000,
    });
    return dialog;
}

/**
 * Confirm the Create New Version dialog and return the new publication's id
 * (from the app's own POST …/version response).
 */
async function confirmCreateVersion(page, dialog) {
    const created = page.waitForResponse(
        (r) =>
            /\/publications\/\d+\/version/.test(r.url()) &&
            r.request().method() === 'POST' &&
            r.ok(),
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const response = await created;
    const body = await response.json();
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
    return body.id;
}

/** The Publication area's right-hand publishing controls (Preview/Publish/Unpublish/Unschedule). */
function rightControls(page) {
    return page.locator('[data-cy="workflow-controls-right"]');
}

/**
 * Today as the app stamps it (YYYY-MM-DD). The PHP server's clock and this
 * process's may straddle midnight in different zones, so the match accepts
 * the local and the UTC reading of "today".
 */
function todayPattern() {
    const now = new Date();
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const utc = now.toISOString().slice(0, 10);
    return new RegExp(`^(${local}|${utc})$`);
}

/** The Catalog Entry page's "Date Published" box (the page must be open). */
function datePublishedBox(page) {
    return field(page, /^Date Published/).locator('input').first();
}

/**
 * The catalog book page's "Published" block (`.item.date_published`): its
 * label ("Published") and value (the date, or "{date} — Updated on {date}"
 * once a later version exists).
 */
function bookDateBlock(page) {
    return page.locator('.item.date_published');
}

/** The book page's "Versions" list entries. */
function bookVersions(page) {
    return page.locator('.versions li');
}

/**
 * Open the Author's Profile › Notifications tab on a press and switch off
 * the email of the "Submission Events" row worded like the published
 * notice (setting `notificationPublicationPublished`, footnote x), then
 * save. Live (OMP, 2026-09-16, T-omp-1): the row's email box is "Do not
 * send me an email for these types of notifications." and arrives
 * UNTICKED on a fresh account, so the opt-out is ticking it, not unticking
 * as the scenario words it. The task notice's own box stays ticked.
 */
async function optOutOfPublishedEmail(authorPage, contextPath) {
    const profile = new ProfilePage(authorPage, contextPath);
    await profile.goto('notifications');
    const pair = profile.notificationPair('notificationPublicationPublished');
    await expect(pair.allow).toBeChecked();
    await expect(pair.email).not.toBeChecked();
    await pair.email.check();
    await profile.save();
    await expect(pair.email).toBeChecked();
    await expect(pair.allow).toBeChecked();
}

/**
 * Upload one file into the Production stage's "Production Ready Files"
 * list through its own "Upload" control (the legacy three-step wizard in
 * the dialog "Upload a Production Ready File"; seeded submissions carry
 * no files, footnote s18). Resolves once the list carries the file's row.
 */
async function uploadProductionReadyFile(page, fileName) {
    const list = productionReadyFiles(page);
    await list.getByRole('button', {name: 'Upload', exact: true}).click();
    const wizard = page.getByRole('dialog', {name: 'Upload a Production Ready File'});
    await expect(wizard).toBeVisible({timeout: 30_000});
    const genre = wizard.locator('select[id^="genreId"]');
    await expect(genre).toBeVisible({timeout: 30_000});
    await genre.selectOption({label: 'Book Manuscript'});
    await wizard.locator('input[type="file"]').last().setInputFiles(path.join(FIXTURES, fileName));
    await expect(wizard.getByRole('button', {name: /Change File/})).toBeVisible({timeout: 30_000});
    await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(wizard.getByRole('tab', {name: '2. Review Details'})).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
    await wizard.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(wizard.getByRole('tab', {name: '3. Confirm'})).toHaveAttribute('aria-selected', 'true', {timeout: 30_000});
    await wizard.getByRole('button', {name: 'Complete', exact: true}).click();
    await expect(wizard).toHaveCount(0, {timeout: 30_000});
    await expect(fileRow(page, fileName)).toBeVisible({timeout: 30_000});
}

/**
 * The Production stage's "Production Ready Files" panel: the innermost
 * block holding the list's table (named "Production Ready Files") and,
 * above it, the heading and the "Upload" button.
 */
function productionReadyFiles(page) {
    return page
        .locator('div')
        .filter({has: page.getByRole('table', {name: 'Production Ready Files'})})
        .last();
}

/** A file's row in the Production Ready Files table. */
function fileRow(page, fileName) {
    return page
        .getByRole('table', {name: 'Production Ready Files'})
        .getByRole('row')
        .filter({hasText: fileName})
        .first();
}

/**
 * Open a file row's "More Actions" menu; the items portal to the document
 * root (patterns.md pitfall 3), so they are read from the page. Resolves
 * once at least one item has rendered — the settled bound for an absence
 * read on the menu.
 */
async function openFileRowMenu(page, fileName) {
    await fileRow(page, fileName).getByRole('button', {name: /More Actions/}).click();
    const items = page.getByRole('menuitem');
    await expect(items.first()).toBeVisible({timeout: 30_000});
    return items;
}

test.describe('Publish, schedule & versions (U49)', () => {
    test('S1: publish a monograph and see it live', {tag: '@smoke'}, async ({asUser, ompApi, page, pkpMail}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s1', testInfo);
        await ompApi.createContext({tag, users: scratchUsers(tag)});
        const {submissionId} = await ompApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: `${tag}au`,
            title: `Submission ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
        });

        // Control: before the Confirm the reader page is not there and the
        // Author's Tasks hold no such notice (the list reads "No Items").
        const before = await page.goto(bookUrl(tag, submissionId));
        expect(before.status()).toBe(404);
        const authorPage = await (await asUser(`${tag}au`)).newPage();
        const tasksBefore = await openTasks(authorPage, tag, {author: true});
        await expect(tasksBefore.getByText('No Items')).toBeVisible({timeout: 30_000});
        await expect(
            tasksBefore.getByText(publishedNotice(`Submission ${tag}`))
        ).toHaveCount(0);

        // Rule 17: while nothing is published the Production stage banners
        // the awaiting-approval notice.
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await openWorkflow(managerPage, tag, submissionId);
        await expect(managerPage.getByText('Awaiting approval.')).toBeVisible({
            timeout: 30_000,
        });
        await expect(
            managerPage.getByText(
                'The monograph will not be listed in the catalog until it has been published.'
            )
        ).toBeVisible();

        // The Publication area heads "Status: Unscheduled".
        await openPublicationPage(managerPage, 'Title & Abstract');
        await expectStatus(managerPage, 'Unscheduled');

        // The publish button reads "Publish"; its confirmation window is
        // titled "Schedule For Publication" even on a press (Rule 2), states
        // all requirements are met, names the version to be assigned and
        // carries the requirement-shaped stage sentence under the all-met
        // line (the scenario's own sentence; A7's verdict is parked).
        const modal = await openPublishModal(managerPage);
        await expect(
            modal.getByText('All publication requirements have been met.')
        ).toBeVisible();
        await expect(modal.getByText('Version of Record 1.0').first()).toBeVisible();
        await expect(
            modal.getByText(
                'The publication must have a version stage assigned before it can be published.'
            )
        ).toBeVisible();
        await confirmPublish(managerPage, modal);
        await expectStatus(managerPage, 'Published');

        // Rule 17's replacement pair on the Production stage view.
        await managerPage.getByRole('link', {name: 'Production', exact: true}).click();
        await expect(managerPage.getByText('Submission published.')).toBeVisible({
            timeout: 30_000,
        });
        await expect(managerPage.getByText('Status', {exact: true}).first()).toBeVisible();
        await expect(managerPage.getByText('Awaiting approval.')).toHaveCount(0);

        // The catalog book page is live (anonymous).
        await page.goto(bookUrl(tag, submissionId));
        await expect(page.getByText(`Submission ${tag}`).first()).toBeVisible({
            timeout: 30_000,
        });

        // Activity log: "The submission was published." and the Done-stage
        // move (Side effects).
        await openWorkflow(managerPage, tag, submissionId);
        await expectLogLine(managerPage, 'The submission was published.');
        await expectLogLine(managerPage, /moved this submission to the Done stage\./);

        // The submitting author gets the "Publication Published" email, sent
        // in the press's name from its principal contact's address (a
        // scratch press's: admin@mail.test), not the manager …
        const mail = await pkpMail.find({
            to: `${tag}au@mail.test`,
            subject: 'Publication Published',
            contains: `Submission ${tag}`,
        });
        expect(mail.From.Name).toBe(`Scratch context ${tag}`);
        expect(mail.From.Address).toBe('admin@mail.test');

        // … and the "was published" task notice.
        const tasks = await openTasks(authorPage, tag, {author: true});
        await expect(
            tasks.getByText(publishedNotice(`Submission ${tag}`))
        ).toBeVisible({timeout: 30_000});
    });

    test('S2: a declined submission cannot be published', async ({asUser, ompApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const [{submissionId}, control] = await Promise.all([
            ompApi.createSubmission({
                tag,
                context: PK,
                submitter: 'author.alex',
                title: `Submission ${tag}`,
                decisions: ['initialDecline'],
            }),
            ompApi.createSubmission({
                tag: `${tag}c`,
                context: PK,
                submitter: 'author.alex',
                title: `Submission ${tag}c`,
                decisions: ['skipExternalReview', 'sendToProduction'],
            }),
        ]);

        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        await openPublicationPage(managerPage, 'Title & Abstract');
        await expectStatus(managerPage, 'Unscheduled');

        // A press opens the refused window directly (Rule 7): the
        // requirements list with the declined line, and no confirm button
        // at all.
        const modal = await openPublishModal(managerPage);
        await expect(
            modal.getByText(
                'The following requirements must be met before this can be published.'
            )
        ).toBeVisible();
        await expect(
            modal.getByText('A declined submission can not be published.')
        ).toBeVisible();
        await expect(
            modal.getByRole('button', {name: 'Publish', exact: true})
        ).toHaveCount(0);

        // Close (the window's own "Close"); the status is unchanged.
        await modal.getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(modal).toHaveCount(0, {timeout: 30_000});
        await expectStatus(managerPage, 'Unscheduled');

        // Control: an undeclined monograph in Production reaches "All
        // publication requirements have been met." and its confirm button
        // in the same window (Rule 4); closed without confirming.
        await openWorkflow(managerPage, PK, control.submissionId);
        await openPublicationPage(managerPage, 'Title & Abstract');
        const controlModal = await openPublishModal(managerPage);
        await expect(
            controlModal.getByText('All publication requirements have been met.')
        ).toBeVisible();
        await expect(
            controlModal.getByRole('button', {name: 'Publish', exact: true})
        ).toBeVisible();
        await controlModal.getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(controlModal).toHaveCount(0, {timeout: 30_000});
    });

    test('S3: unpublish takes the book down and clears the author notice', async ({asUser, ompApi, page}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        await ompApi.createContext({tag, users: scratchUsers(tag)});
        const {submissionId} = await ompApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: `${tag}au`,
            title: `Submission ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
            published: true,
        });

        // Control: the author's task notice exists and the catalog page is
        // live before the unpublish.
        const authorPage = await (await asUser(`${tag}au`)).newPage();
        const tasksBefore = await openTasks(authorPage, tag, {author: true});
        await expect(
            tasksBefore.getByText(publishedNotice(`Submission ${tag}`))
        ).toBeVisible({timeout: 30_000});
        await page.goto(bookUrl(tag, submissionId));
        await expect(page.getByText(`Submission ${tag}`).first()).toBeVisible({
            timeout: 30_000,
        });

        // Unpublish: red dialog wording per Rule 9, status back to
        // Unscheduled.
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await openWorkflow(managerPage, tag, submissionId);
        await openPublicationPage(managerPage, 'Title & Abstract');
        await expectStatus(managerPage, 'Published');
        await unpublishFromWorkflow(managerPage);
        await expectStatus(managerPage, 'Unscheduled');

        // The reader page is gone.
        const response = await page.goto(bookUrl(tag, submissionId));
        expect(response.status()).toBe(404);

        // Activity log: "The submission was unpublished." and the return to
        // the workflow (Side effects).
        await expectLogLine(managerPage, 'The submission was unpublished.');
        await expectLogLine(managerPage, /returned this submission to the workflow\./);

        // The author's task notice is gone too: their Tasks read "No Items".
        const tasksAfter = await openTasks(authorPage, tag, {author: true});
        await expect(tasksAfter.getByText('No Items')).toBeVisible({
            timeout: 30_000,
        });
        await expect(
            tasksAfter.getByText(publishedNotice(`Submission ${tag}`))
        ).toHaveCount(0);
    });

    test('S4: create a new version — copy, notices, readers keep the old one', async ({asUser, ompApi, page, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s4', testInfo);
        await ompApi.createContext({
            tag,
            users: scratchUsers(tag, [
                {
                    username: `${tag}ed`,
                    givenName: 'Elena',
                    familyName: 'Editor',
                    email: `${tag}ed@mail.test`,
                    roles: ['editor'],
                },
                {
                    username: `${tag}rv`,
                    givenName: 'Rex',
                    familyName: 'Reviewer',
                    email: `${tag}rv@mail.test`,
                    roles: ['externalReviewer'],
                },
            ]),
        });
        const {submissionId} = await ompApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: `${tag}au`,
            title: `Submission ${tag}`,
            decisions: ['skipInternalReview'],
            reviewRounds: [
                {
                    stage: 'external',
                    reviewers: [{username: `${tag}rv`, status: 'accepted'}],
                },
            ],
            participants: [{username: `${tag}ed`, role: 'editor'}],
            published: true,
        });

        // Control: before the new version the reader page's date line is
        // the bare published date (no "Updated on") …
        await page.goto(bookUrl(tag, submissionId));
        await expect(page.getByText(`Submission ${tag}`).first()).toBeVisible({
            timeout: 30_000,
        });
        await expect(bookDateBlock(page)).toContainText('Published');
        await expect(bookDateBlock(page)).not.toContainText('Updated on');
        await expect(bookVersions(page)).toHaveCount(1);

        // … and the side menu lists the one published version.
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await openWorkflow(managerPage, tag, submissionId);
        await expect(
            managerPage.getByRole('link', {name: 'Version of Record 1.0', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(
            managerPage.getByRole('link', {name: 'Version of Record 1.1', exact: true})
        ).toHaveCount(0);

        // The dialog arrives pre-answered (Rule 11): copy-from select over
        // the existing versions, the published version's stage and "Minor
        // Revision" preselected.
        const dialog = await openCreateVersionDialog(managerPage);
        await expect(
            dialog.getByText('Which version should metadata be copied from?')
        ).toBeVisible();
        await expect(
            dialog
                .getByLabel('Which version should metadata be copied from?')
                .locator('option', {hasText: 'Version of Record 1.0'})
        ).toHaveCount(1);
        await expect(dialog.getByLabel('Publication Stage')).toHaveValue('VoR');
        await expect(dialog.getByLabel('Revision Significance')).toHaveValue('true');

        // An untouched Confirm yields "Version of Record 1.1", opening with
        // "Status: Unpublished" and the copied content.
        await confirmCreateVersion(managerPage, dialog);
        await expect(
            managerPage.getByRole('link', {name: 'Version of Record 1.1', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(
            managerPage.getByRole('heading', {name: 'Publication: Title & Abstract'})
        ).toBeVisible({timeout: 30_000});
        await expectStatus(managerPage, 'Unpublished');
        await expect(richBody(managerPage, /^Title\b/)).toContainText(
            `Submission ${tag}`
        );

        // Give the draft a distinguishable abstract so the reader-side
        // check below is positive, not date-based (A6 stays unasserted).
        const abstractBody = richBody(managerPage, /^Abstract/);
        await abstractBody.click();
        await abstractBody.fill(`V2 abstract ${tag}`);
        await abstractBody.blur();
        await savePublicationForm(managerPage);

        // Readers still get the OLD version: the catalog page's "Versions"
        // list holds only the published entry and the draft's abstract is
        // nowhere on it.
        await page.goto(bookUrl(tag, submissionId));
        await expect(page.getByText(`Submission ${tag}`).first()).toBeVisible({
            timeout: 30_000,
        });
        await expect(bookVersions(page)).toHaveCount(1);
        await expect(page.locator('.versions')).toContainText('Version of Record 1.0');
        await expect(page.getByText(`V2 abstract ${tag}`)).toHaveCount(0);

        // Activity log: "A new version was created." (Side effects).
        await expectLogLine(managerPage, 'A new version was created.');

        // The submitting author and the participating editor get the email
        // and the task notice; the assigned reviewer and the manager (no
        // stage assignment) get neither (the editor's receipt bounds the
        // silences; A1's verdict on the template's wording is parked).
        await pkpMail.find({
            to: `${tag}ed@mail.test`,
            subject: 'A new version was created',
            contains: `Submission ${tag}`,
        });
        await pkpMail.find({
            to: `${tag}au@mail.test`,
            subject: 'A new version was created',
            contains: `Submission ${tag}`,
        });
        for (const silent of [`${tag}rv`, `${tag}mg`]) {
            await pkpMail.expectNone({
                to: `${silent}@mail.test`,
                contains: `Submission ${tag}`,
                afterControl: {to: `${tag}ed@mail.test`, contains: `Submission ${tag}`},
            });
        }
        const editorPage = await (await asUser(`${tag}ed`)).newPage();
        const tasks = await openTasks(editorPage, tag);
        await expect(
            tasks.getByText('A new version of a submission was created').first()
        ).toBeVisible({timeout: 30_000});
        const authorPage = await (await asUser(`${tag}au`)).newPage();
        const authorTasks = await openTasks(authorPage, tag, {author: true});
        await expect(
            authorTasks.getByText('A new version of a submission was created').first()
        ).toBeVisible({timeout: 30_000});
    });

    test('S5: publish the new version', async ({asUser, ompApi, page, pkpMail}, testInfo) => {
        test.setTimeout(360_000);
        const tag = makeTag('s5', testInfo);
        const title = `Submission ${tag}`;
        await ompApi.createContext({
            tag,
            users: scratchUsers(tag, [
                {
                    username: `${tag}ed`,
                    givenName: 'Elena',
                    familyName: 'Editor',
                    email: `${tag}ed@mail.test`,
                    roles: ['editor'],
                },
            ]),
        });
        const {submissionId} = await ompApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: `${tag}au`,
            title,
            decisions: ['skipExternalReview', 'sendToProduction'],
            participants: [{username: `${tag}ed`, role: 'editor'}],
        });

        // Control (scenario 1's leg, taken here on the same Author with the
        // email left on): the first publish delivers both the email and the
        // task notice.
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await openWorkflow(managerPage, tag, submissionId);
        await openPublicationPage(managerPage, 'Title & Abstract');
        await publishFromWorkflow(managerPage);
        await expectStatus(managerPage, 'Published');
        await pkpMail.find({
            to: `${tag}au@mail.test`,
            subject: 'Publication Published',
            contains: title,
        });
        const authorPage = await (await asUser(`${tag}au`)).newPage();
        const tasksBefore = await openTasks(authorPage, tag, {author: true});
        await expect(tasksBefore.getByText(publishedNotice(title))).toHaveCount(1, {
            timeout: 30_000,
        });

        // Create the new version and give it a distinguishable abstract.
        await openWorkflow(managerPage, tag, submissionId);
        const dialog = await openCreateVersionDialog(managerPage);
        const newPubId = await confirmCreateVersion(managerPage, dialog);
        await expect(
            managerPage.getByRole('heading', {name: 'Publication: Title & Abstract'})
        ).toBeVisible({timeout: 30_000});
        await expectStatus(managerPage, 'Unpublished');
        const abstractBody = richBody(managerPage, /^Abstract/);
        await abstractBody.click();
        await abstractBody.fill(`V2 abstract ${tag}`);
        await abstractBody.blur();
        await savePublicationForm(managerPage);

        // "Insert Content" (Rule 14): on the new version's Catalog Entry
        // page the submission-language Summary of Changes box carries the
        // button; its side panel reads the no-summaries line; close it.
        await openWorkflow(managerPage, tag, submissionId, {
            menuKey: `publication_${newPubId}_catalogEntry`,
        });
        await expect(
            managerPage.getByRole('heading', {name: 'Publication: Catalog Entry'})
        ).toBeVisible({timeout: 30_000});
        const summaryField = field(managerPage, /^Summary of Changes/);
        const insert = summaryField.getByRole('button', {name: 'Insert Content', exact: true});
        await expect(insert).toBeVisible({timeout: 30_000});
        await insert.click();
        const panel = managerPage.getByRole('dialog', {name: /Insert Content/});
        await expect(panel).toBeVisible({timeout: 30_000});
        await expect(
            panel.getByText("No saved summaries found for this submission's review revisions.")
        ).toBeVisible();
        await panel.getByRole('button', {name: /Close|Cancel/}).first().click();
        await expect(panel).toHaveCount(0, {timeout: 30_000});

        // The details: Update Type arrives on "New Version"; choose
        // "Correction", type the summary and save (Fields; Rule 13).
        const updateType = field(managerPage, /^Update Type/).locator('select').first();
        await expect(updateType.locator('option:checked')).toHaveText('New Version');
        await updateType.selectOption({label: 'Correction'});
        const summaryBody = richBody(managerPage, /^Summary of Changes/);
        await summaryBody.click();
        await summaryBody.fill('Figure 2 corrected.');
        await summaryBody.blur();
        await savePublicationForm(managerPage);

        // The email switched off: the Author unticks the row's email box on
        // Profile › Notifications and saves (Side effects).
        await optOutOfPublishedEmail(authorPage, tag);

        // Publish the new version: the window names "Version of Record
        // 1.1"; confirm.
        await openWorkflow(managerPage, tag, submissionId, {
            menuKey: `publication_${newPubId}_titleAbstract`,
        });
        await expect(
            managerPage.getByRole('heading', {name: 'Publication: Title & Abstract'})
        ).toBeVisible({timeout: 30_000});
        const modal = await openPublishModal(managerPage);
        await expect(modal.getByText('Version of Record 1.1').first()).toBeVisible();
        await confirmPublish(managerPage, modal);
        await expectStatus(managerPage, 'Published');

        // The reader page now serves the new version and its "Versions"
        // list gains the new entry (the amendment notice is A5's, not
        // asserted either way).
        await page.goto(bookUrl(tag, submissionId));
        await expect(page.getByText(`V2 abstract ${tag}`).first()).toBeVisible({
            timeout: 30_000,
        });
        await expect(bookVersions(page)).toHaveCount(2);
        await expect(page.locator('.versions')).toContainText('Version of Record 1.1');

        // Activity log: "A new version was published."
        await openWorkflow(managerPage, tag, submissionId);
        await expectLogLine(managerPage, 'A new version was published.');

        // The notice without the email: the Author's Tasks hold a second
        // notice while no second "Publication Published" email arrives.
        // The silence is bounded by a message the test causes after the
        // publish: a further version's "A new version was created" to the
        // participating editor.
        const tasksAfter = await openTasks(authorPage, tag, {author: true});
        await expect(tasksAfter.getByText(publishedNotice(title))).toHaveCount(2, {
            timeout: 30_000,
        });
        const bound = await openCreateVersionDialog(managerPage);
        await confirmCreateVersion(managerPage, bound);
        await expect(
            managerPage.getByRole('link', {name: 'Version of Record 1.2', exact: true})
        ).toBeVisible({timeout: 30_000});
        await pkpMail.find({
            to: `${tag}ed@mail.test`,
            subject: 'A new version was created',
            contains: title,
        });
        expect(
            await pkpMail.count({to: `${tag}au@mail.test`, subject: 'Publication Published', contains: title})
        ).toBe(1);

        // Unpublish the new version: the reader page stays live serving
        // "Version of Record 1.0", its "Versions" list one entry shorter
        // (Rule 9).
        await openWorkflow(managerPage, tag, submissionId, {
            menuKey: `publication_${newPubId}_titleAbstract`,
        });
        await expect(
            managerPage.getByRole('heading', {name: 'Publication: Title & Abstract'})
        ).toBeVisible({timeout: 30_000});
        await expectStatus(managerPage, 'Published');
        await unpublishFromWorkflow(managerPage);
        await expectStatus(managerPage, 'Unpublished');
        await page.goto(bookUrl(tag, submissionId));
        await expect(page.getByText(title).first()).toBeVisible({timeout: 30_000});
        await expect(bookVersions(page)).toHaveCount(1);
        await expect(page.locator('.versions')).toContainText('Version of Record 1.0');
        await expect(page.getByText(`V2 abstract ${tag}`)).toHaveCount(0);
    });

    test('S6: minor and major numbering', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s6', testInfo);
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
            published: true,
        });

        // Control: the side menu lists the one published version before
        // the first "Create New Version".
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        await expect(
            managerPage.getByRole('link', {name: 'Version of Record 1.0', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(
            managerPage.getByRole('link', {name: /^(Version of Record|Author Original) (1\.1|2\.0)$/})
        ).toHaveCount(0);

        // Same stage as an existing version: "Minor Revision" is selectable
        // and an untouched Confirm yields "… 1.1".
        let dialog = await openCreateVersionDialog(managerPage);
        await expect(dialog.getByLabel('Publication Stage')).toHaveValue('VoR');
        await expect(
            dialog
                .getByLabel('Revision Significance')
                .locator('option', {hasText: 'Minor Revision'})
        ).toBeEnabled();
        await expect(dialog.getByLabel('Revision Significance')).toHaveValue('true');
        await confirmCreateVersion(managerPage, dialog);
        await expect(
            managerPage.getByRole('link', {name: 'Version of Record 1.1', exact: true})
        ).toBeVisible({timeout: 30_000});

        // A stage with no versions yet: "Minor Revision" is greyed and the
        // result is that stage's "1.0".
        dialog = await openCreateVersionDialog(managerPage);
        await dialog
            .getByLabel('Publication Stage')
            .selectOption({label: 'Author Original (AO)'});
        await expect(
            dialog
                .getByLabel('Revision Significance')
                .locator('option', {hasText: 'Minor Revision'})
        ).toBeDisabled();
        await confirmCreateVersion(managerPage, dialog);
        await expect(
            managerPage.getByRole('link', {name: 'Author Original 1.0', exact: true})
        ).toBeVisible({timeout: 30_000});

        // A major version in a stage that has versions: keeping "Version
        // of Record" and choosing "Major Revision" yields "… 2.0".
        dialog = await openCreateVersionDialog(managerPage);
        await dialog.getByLabel('Publication Stage').selectOption('VoR');
        await dialog.getByLabel('Revision Significance').selectOption({label: 'Major Revision'});
        await confirmCreateVersion(managerPage, dialog);
        await expect(
            managerPage.getByRole('link', {name: 'Version of Record 2.0', exact: true})
        ).toBeVisible({timeout: 30_000});
    });

    test('S7: the version list and the author\'s view', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s7', testInfo);
        const {submissionId, publicationId} = await ompApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
            published: true,
        });

        // The manager prepares a second, unpublished version; on it they
        // are offered the publish button and "Create New Version" (the
        // control for the controls the author must not see).
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        const dialog = await openCreateVersionDialog(managerPage);
        const newPubId = await confirmCreateVersion(managerPage, dialog);
        await expect(
            managerPage.getByRole('link', {name: 'Version of Record 1.1', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expectStatus(managerPage, 'Unpublished');
        await expect(
            rightControls(managerPage).getByRole('button', {name: 'Publish', exact: true})
        ).toBeVisible();
        await expect(
            managerPage.getByRole('link', {name: 'Create New Version', exact: true})
        ).toBeVisible();

        // The author's tracking view lists every version by name; each page
        // heads with the status readout; no publish, unpublish or
        // Create-New-Version control appears anywhere.
        const authorPage = await (await asUser('author.alex')).newPage();
        await openWorkflow(authorPage, PK, submissionId, {
            author: true,
            menuKey: `publication_${publicationId}_titleAbstract`,
        });
        await expect(
            authorPage.getByRole('link', {name: 'Version of Record 1.0', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(
            authorPage.getByRole('link', {name: 'Version of Record 1.1', exact: true})
        ).toBeVisible();
        await expectStatus(authorPage, 'Published');

        await openWorkflow(authorPage, PK, submissionId, {
            author: true,
            menuKey: `publication_${newPubId}_titleAbstract`,
        });
        await expectStatus(authorPage, 'Unpublished');

        await expect(
            authorPage.getByRole('button', {name: 'Publish', exact: true})
        ).toHaveCount(0);
        await expect(
            authorPage.getByRole('button', {name: 'Unpublish', exact: true})
        ).toHaveCount(0);
        await expect(
            authorPage.getByRole('link', {name: 'Create New Version', exact: true})
        ).toHaveCount(0);
    });

    test('S8: roles without the controls', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s8', testInfo);
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
            participants: [
                {username: 'sectioneditor.ana', role: 'sectionEditor'},
                {username: 'layouteditor.leo', role: 'layoutEditor'},
            ],
        });

        // Control: the press manager sees the publish button and the
        // Create New Version item on the same monograph.
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        await openPublicationPage(managerPage, 'Title & Abstract');
        await expect(
            managerPage.getByRole('button', {name: 'Publish', exact: true})
        ).toBeVisible();
        await expect(
            managerPage.getByRole('link', {name: 'Create New Version', exact: true})
        ).toBeVisible();

        // The assigned Series Editor and the assigned Layout Editor
        // (assistant) get the version pages and the readout, but none of
        // the controls (A2's on-screen contract). The Production stage view
        // still shows each of them a "Schedule For Publication" button
        // (inherited from the OJS editorial config via the OMP deep-merge)
        // — pressing it only lands on the Publication area, where nothing
        // more is offered.
        for (const username of ['sectioneditor.ana', 'layouteditor.leo']) {
            const rolePage = await (await asUser(username)).newPage();
            await openWorkflow(rolePage, PK, submissionId);
            await rolePage.getByRole('link', {name: 'Production', exact: true}).click();
            const shortcut = rolePage
                .locator('[data-cy="workflow-action-items"]')
                .getByRole('button', {name: 'Schedule For Publication', exact: true});
            await expect(shortcut).toBeVisible({timeout: 30_000});
            await shortcut.click();
            await expect(
                rolePage.getByRole('heading', {name: 'Publication: Title & Abstract'})
            ).toBeVisible({timeout: 30_000});
            await expectStatus(rolePage, 'Unscheduled');
            await expect(
                rolePage.getByRole('button', {name: 'Publish', exact: true})
            ).toHaveCount(0);
            await expect(
                rolePage.getByRole('button', {name: 'Unpublish', exact: true})
            ).toHaveCount(0);
            await expect(
                rolePage.getByRole('link', {name: 'Create New Version', exact: true})
            ).toHaveCount(0);
        }
    });

    test('S9: unschedule a future-dated book', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s9', testInfo);
        const [{submissionId}, control] = await Promise.all([
            ompApi.createSubmission({
                tag,
                context: PK,
                submitter: 'author.alex',
                title: `Submission ${tag}`,
                decisions: ['skipExternalReview', 'sendToProduction'],
            }),
            ompApi.createSubmission({
                tag: `${tag}c`,
                context: PK,
                submitter: 'author.alex',
                title: `Submission ${tag}c`,
                decisions: ['skipExternalReview', 'sendToProduction'],
                published: true,
            }),
        ]);

        // Reach the scheduled state via the date route (scenario 14's
        // seeding): a future Date Published, then Publish.
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        await saveDatePublished(managerPage, '2030-06-01');
        const modal = await openPublishModal(managerPage);
        await confirmPublish(managerPage, modal, {expectButton: 'Unschedule'});
        await expectStatus(managerPage, 'Scheduled');

        // The button offered is "Unschedule"; its dialog wording per Rule
        // 9; confirming returns the version to "Status: Unscheduled".
        await managerPage
            .getByRole('button', {name: 'Unschedule', exact: true})
            .click();
        const dialog = managerPage.getByRole('dialog', {name: 'Unschedule'});
        await expect(dialog).toBeVisible({timeout: 30_000});
        await expect(
            dialog.getByText(
                "Are you sure you don't want this scheduled for publication?"
            )
        ).toBeVisible();
        const unscheduled = managerPage.waitForResponse(
            (r) => r.url().includes('/unpublish') && r.ok(),
            {timeout: 30_000}
        );
        await dialog.getByRole('button', {name: 'Unschedule', exact: true}).click();
        await unscheduled;
        await expect(
            managerPage.getByRole('button', {name: 'Publish', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expectStatus(managerPage, 'Unscheduled');

        // Activity log: the unschedule logs the unpublish line (Side
        // effects).
        await expectLogLine(managerPage, 'The submission was unpublished.');

        // Control: on a published version the same place offers "Unpublish"
        // instead (Rule 9).
        await openWorkflow(managerPage, PK, control.submissionId);
        await openPublicationPage(managerPage, 'Title & Abstract');
        await expectStatus(managerPage, 'Published');
        await expect(
            rightControls(managerPage).getByRole('button', {name: 'Unpublish', exact: true})
        ).toBeVisible();
        await expect(
            rightControls(managerPage).getByRole('button', {name: 'Unschedule', exact: true})
        ).toHaveCount(0);
    });

    test('S10: republish with what was kept', async ({asUser, ompApi, page}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s10', testInfo);
        const [{submissionId}, control] = await Promise.all([
            ompApi.createSubmission({
                tag,
                context: PK,
                submitter: 'author.alex',
                title: `Submission ${tag}`,
                decisions: ['skipExternalReview', 'sendToProduction'],
            }),
            ompApi.createSubmission({
                tag: `${tag}c`,
                context: PK,
                submitter: 'author.alex',
                title: `Submission ${tag}c`,
                decisions: ['skipExternalReview', 'sendToProduction'],
            }),
        ]);

        // A filled (past) date is kept on publish (Rule 8).
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        await saveDatePublished(managerPage, '2020-01-02');
        await publishFromWorkflow(managerPage);
        await expectStatus(managerPage, 'Published');

        // Unpublish keeps the date (Rule 9).
        await unpublishFromWorkflow(managerPage);
        await expectStatus(managerPage, 'Unscheduled');
        await openPublicationPage(managerPage, 'Catalog Entry');
        await expect(datePublishedBox(managerPage)).toHaveValue('2020-01-02');

        // Republishing goes straight to the confirmation window and back
        // to "Published" carrying the ORIGINAL date (Rule 10).
        await publishFromWorkflow(managerPage);
        await expectStatus(managerPage, 'Published');
        await openPublicationPage(managerPage, 'Catalog Entry');
        await expect(datePublishedBox(managerPage)).toHaveValue('2020-01-02');

        // The catalog page is live again.
        await page.goto(bookUrl(PK, submissionId));
        await expect(page.getByText(`Submission ${tag}`).first()).toBeVisible({
            timeout: 30_000,
        });

        // Control: a first publish with the date left empty stamps today
        // (Rule 8).
        await openWorkflow(managerPage, PK, control.submissionId);
        await openPublicationPage(managerPage, 'Catalog Entry');
        await expect(datePublishedBox(managerPage)).toHaveValue('');
        await publishFromWorkflow(managerPage);
        await expectStatus(managerPage, 'Published');
        await openPublicationPage(managerPage, 'Catalog Entry');
        await expect(datePublishedBox(managerPage)).toHaveValue(todayPattern());
    });

    test('S14: a future date schedules the book', async ({asUser, ompApi, page, pkpMail}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s14', testInfo);
        const scheduledTitle = `Scheduled ${tag}`;
        const controlTitle = `Control ${tag}`;
        await ompApi.createContext({tag, users: scratchUsers(tag)});
        const [{submissionId}, control] = await Promise.all([
            ompApi.createSubmission({
                tag: `${tag}s`,
                context: tag,
                submitter: `${tag}au`,
                title: scheduledTitle,
                decisions: ['skipExternalReview', 'sendToProduction'],
            }),
            ompApi.createSubmission({
                tag: `${tag}c`,
                context: tag,
                submitter: `${tag}au`,
                title: controlTitle,
                decisions: ['skipExternalReview', 'sendToProduction'],
            }),
        ]);

        // Save a future Date Published on the Catalog Entry page, then
        // Publish: the window still reads "…make this catalog entry
        // public?" (the scenario's own sentence; OMP1's verdict is parked).
        // Confirming yields "Status: Scheduled".
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await openWorkflow(managerPage, tag, submissionId);
        await saveDatePublished(managerPage, '2030-01-01');
        const modal = await openPublishModal(managerPage);
        await expect(modal.getByText(/make this catalog entry public\?/)).toBeVisible();
        await confirmPublish(managerPage, modal, {expectButton: 'Unschedule'});
        await expectStatus(managerPage, 'Scheduled');

        // The offered controls become "Preview" and "Unschedule"; the
        // publish button is gone. (Scoped to the Publication area's right
        // controls — the workflow header carries its own Preview.)
        const controls = rightControls(managerPage);
        await expect(
            controls.getByRole('button', {name: 'Preview', exact: true})
        ).toBeVisible();
        await expect(
            controls.getByRole('button', {name: 'Unschedule', exact: true})
        ).toBeVisible();
        await expect(
            controls.getByRole('button', {name: 'Publish', exact: true})
        ).toHaveCount(0);

        // Nothing stamped: "Date Published" still reads "2030-01-01"
        // (Rule 8).
        await openPublicationPage(managerPage, 'Catalog Entry');
        await expect(datePublishedBox(managerPage)).toHaveValue('2030-01-01');

        // Control: the second monograph, published with the date empty,
        // stamps today and goes live at once (Rule 6); its email and
        // notice bound the scheduled one's silence.
        await openWorkflow(managerPage, tag, control.submissionId);
        await openPublicationPage(managerPage, 'Catalog Entry');
        await expect(datePublishedBox(managerPage)).toHaveValue('');
        await publishFromWorkflow(managerPage);
        await expectStatus(managerPage, 'Published');
        await openPublicationPage(managerPage, 'Catalog Entry');
        await expect(datePublishedBox(managerPage)).toHaveValue(todayPattern());
        await page.goto(bookUrl(tag, control.submissionId));
        await expect(page.getByText(controlTitle).first()).toBeVisible({
            timeout: 30_000,
        });

        // The scheduled book's catalog page stays down.
        const response = await page.goto(bookUrl(tag, submissionId));
        expect(response.status()).toBe(404);

        // Nothing sent: no "Publication Published" email for the Author
        // about the scheduled book (bounded by the control's), and their
        // Tasks hold the control's notice only.
        await pkpMail.expectNone({
            to: `${tag}au@mail.test`,
            subject: 'Publication Published',
            contains: scheduledTitle,
            afterControl: {
                to: `${tag}au@mail.test`,
                subject: 'Publication Published',
                contains: controlTitle,
            },
        });
        const authorPage = await (await asUser(`${tag}au`)).newPage();
        const tasks = await openTasks(authorPage, tag, {author: true});
        await expect(tasks.getByText(publishedNotice(controlTitle))).toBeVisible({
            timeout: 30_000,
        });
        await expect(tasks.getByText(publishedNotice(scheduledTitle))).toHaveCount(0);
    });

    test('S17: a submission still in Review already offers the publish button', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s17', testInfo);
        const [review, production] = await Promise.all([
            ompApi.createSubmission({
                tag,
                context: PK,
                submitter: 'author.alex',
                title: `Submission ${tag}`,
                decisions: ['sendExternalReview'],
            }),
            ompApi.createSubmission({
                tag: `${tag}c`,
                context: PK,
                submitter: 'author.alex',
                title: `Submission ${tag}c`,
                decisions: ['skipExternalReview', 'sendToProduction'],
            }),
        ]);

        // The Publication area in Review: the top right already offers
        // "Publish" and no "Preview" among the publishing controls (Rule 2;
        // Actors row 4). The button is left unpressed.
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, review.submissionId, {
            menuKey: `publication_${review.publicationId}_titleAbstract`,
        });
        await expect(
            managerPage.getByRole('heading', {name: 'Publication: Title & Abstract'})
        ).toBeVisible({timeout: 30_000});
        await expectStatus(managerPage, 'Unscheduled');
        await expect(
            rightControls(managerPage).getByRole('button', {name: 'Publish', exact: true})
        ).toBeVisible();
        await expect(
            rightControls(managerPage).getByRole('button', {name: 'Preview', exact: true})
        ).toHaveCount(0);

        // Control: the Production-stage submission's Publication area offers
        // the same publish button and "Preview" beside it, while the
        // workflow window's own header Preview is a separate button.
        await openWorkflow(managerPage, PK, production.submissionId, {
            menuKey: `publication_${production.publicationId}_titleAbstract`,
        });
        await expect(
            managerPage.getByRole('heading', {name: 'Publication: Title & Abstract'})
        ).toBeVisible({timeout: 30_000});
        await expect(
            rightControls(managerPage).getByRole('button', {name: 'Publish', exact: true})
        ).toBeVisible();
        await expect(
            rightControls(managerPage).getByRole('button', {name: 'Preview', exact: true})
        ).toBeVisible();
        await expect(
            managerPage.getByRole('button', {name: 'Preview', exact: true})
        ).toHaveCount(2);
    });

    test('S18: "Send to Text Editor" only on importable files', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s18', testInfo);
        const {submissionId} = await ompApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title: `Submission ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
        });

        // Both files go in through the "Production Ready Files" list's own
        // upload control (seeded submissions carry no files).
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        await managerPage.getByRole('link', {name: 'Production', exact: true}).click();
        await expect(
            managerPage.getByRole('heading', {name: 'Production Ready Files'})
        ).toBeVisible({timeout: 30_000});
        await uploadProductionReadyFile(managerPage, 'notes.md');
        await uploadProductionReadyFile(managerPage, 'article.pdf');

        // The Markdown row's "More Actions" offers "Send to Text Editor";
        // its dialog asks which version to send the file to, "Create New
        // Version" first, then each existing version, none selected as it
        // opens (Rule 16); Cancel leaves the file where it is.
        const mdItems = await openFileRowMenu(managerPage, 'notes.md');
        const send = mdItems.filter({hasText: 'Send to Text Editor'});
        await expect(send).toHaveCount(1);
        await send.click();
        const dialog = managerPage.getByRole('dialog', {name: 'Send File to Text Editor'});
        await expect(dialog).toBeVisible({timeout: 30_000});
        await expect(
            dialog.getByText('To which version would you like to send this file?')
        ).toBeVisible();
        const picker = dialog.getByLabel('To which version would you like to send this file?');
        await expect(picker.locator('option').first()).toHaveText('Create New Version', {
            timeout: 30_000,
        });
        await expect(picker.locator('option')).toHaveCount(2);
        await expect(picker).toHaveValue('');
        await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
        await expect(fileRow(managerPage, 'notes.md')).toBeVisible();

        // Control: the PDF row's "More Actions" offers no "Send to Text
        // Editor" (the menu's other items are the settled bound).
        const pdfItems = await openFileRowMenu(managerPage, 'article.pdf');
        expect(await pdfItems.count()).toBeGreaterThan(0);
        await expect(pdfItems.filter({hasText: 'Send to Text Editor'})).toHaveCount(0);
        await closeMenu(managerPage);
    });
});
