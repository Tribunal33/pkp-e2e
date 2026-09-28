// @ts-check
/**
 * @file playwright/tests/U49-publish-schedule-and-versions.spec.js
 *
 * Publish, schedule & versions — OPS suite, one test per canonical COMMON
 * scenario as a preprint server runs it (S1–S10, in OPS vocabulary: the
 * publish button is "Post", the confirmation window "Post the preprint",
 * the states "Unposted"/"Scheduled"/"Posted", the way back "Unpost", the
 * flow direct — no "Review Publishing Details" panel and no issues; the
 * date route on the Preprint entry page is what schedules) plus the
 * OPS-specific S15 (Post the preprint: the window, the acknowledgement to
 * every contributor, the future-date leg and the "Do not send an email."
 * server) and S16 (the author cannot post). S11–S13 are {OJS}, S14 {OMP},
 * S17 and S18 {OJS OMP}: a preprint server installs no review stage and
 * mounts no "Production Ready Files" list, so they have no test here and
 * no absence test either. Every bold lead of a scenario has its assertion
 * here; a bullet the register marks carries only the scenario's own
 * sentence.
 * Spec: docs/specs/U49-publish-schedule-and-versions.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section records everything else left out): OPS1, OPS2,
 * OPS4 and OPS5 (the scheduled state, the acknowledgement's arrival matched
 * template-neutrally on "Posted Acknowledgement", the "Publication
 * Published" mail's arrival and the notice's presence are asserted; the
 * never-posts half, the scheduled post's acknowledgement, which template
 * goes out and the "published" wordings are not); OPS3 (the stock
 * no-Post-control side only); A1 (the scenario's own recipients only);
 * A5 and A6 (the summary's reader-side presence and the date line after a
 * draft are not asserted either way); A7 (the window's stage sentence);
 * A2, A3, A4 (S8 asserts what the screens offer; the rest has no OPS
 * surface); OJS1, OJS2, OJS3, OMP1 (no OPS surface).
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only — PK tests mutate only their own seeded submissions; every
 * Mailpit read and the Profile › Notifications opt-out run on a scratch
 * preprint server with throwaway unique-recipient users (A8, A7). Every
 * absence read is bounded by a positive control taken the same way
 * (PRINCIPLES M4, M6): the mailbox by a mail the same act delivers to a
 * throwaway address, the Tasks panel by its rendered table and a notice
 * the test caused, the reader page by its own earlier or later 200, the
 * Activity Log by a line the test wrote. Waits are event-based
 * (publish/unpublish/version API responses, the "Saved" form status,
 * web-first assertions) — no hard-coded sleeps. Everything runs in the
 * parallel `ops` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {
    PublicationScreen,
    openWorkflow,
    unpostPreprint,
    preprintDateLine,
    preprintVersionsList,
    switchOffPublishedEmail,
} = require('../pages/PublicationPages.js');
const {ContributorsScreen} = require('../pages/ContributorPages.js');
const {
    wizardUrl,
    expectWizardOpen,
    completeAndSubmitDraft,
} = require('../pages/SubmissionWizardPages.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');

const PK = 'publicknowledge';
const PK_PREFIX = '/en';
const DATE_FORMAT_ERROR = 'The date must be in the format YYYY-MM-DD, such as 2019-01-01.';
const NEW_VERSION_NOTICE = 'A new version of a submission was created';

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u49${scenario}opsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
function mailOf(username) {
    return `${username}@mail.test`;
}

/** Throwaway user spec for scratch servers (manager + author; optional moderator). */
function contextUsers(tag, {moderator = false} = {}) {
    const users = [
        {
            username: `${tag}mg`,
            givenName: 'Mona',
            familyName: 'Manager',
            email: mailOf(`${tag}mg`),
            roles: ['manager'],
        },
        {
            username: `${tag}au`,
            givenName: 'Ada',
            familyName: 'Author',
            email: mailOf(`${tag}au`),
            roles: ['author'],
        },
    ];
    if (moderator) {
        users.push({
            username: `${tag}md`,
            givenName: 'Mia',
            familyName: 'Moderator',
            email: mailOf(`${tag}md`),
            roles: ['sectionEditor'],
        });
    }
    return users;
}

/**
 * The "Status: {state}" readout strip on a Publication page
 * (WorkflowPublicationVersionControl inside workflow-controls-left).
 */
function statusStrip(page) {
    return page.locator('[data-cy="workflow-controls-left"]');
}

/** Assert the readout ("Posted" never false-matches "Unposted" — case). */
async function expectStatus(page, label) {
    await expect(statusStrip(page)).toContainText('Status:', {timeout: 30_000});
    await expect(statusStrip(page)).toContainText(label, {timeout: 30_000});
}

/** The publication controls region (the stage header carries its own
 * Preview button, so the publish controls are scoped here). */
function controlsRight(page) {
    return page.locator('[data-cy="workflow-controls-right"]');
}

/**
 * Open the workflow straight onto one menu entry (the side menu mirrors its
 * selection into the `workflowMenuKey` query param — useWorkflowMenu), so a
 * SPECIFIC version's page can be reached without walking the nested menu.
 */
async function openMenuKey(page, contextPath, submissionId, menuKey, {author = false, heading} = {}) {
    const dashboard = author ? 'mySubmissions' : 'editorial';
    await page.goto(
        `/index.php/${contextPath}/dashboard/${dashboard}?workflowSubmissionId=${submissionId}&workflowMenuKey=${menuKey}`
    );
    await expect(
        page.getByRole('heading', {name: heading ?? 'Preprint: Title & Abstract'})
    ).toBeVisible({timeout: 30_000});
}

/** Open a version's "Preprint entry" page by address. */
async function openEntryPage(page, contextPath, submissionId, publicationId) {
    await openMenuKey(page, contextPath, submissionId, `publication_${publicationId}_preprintEntry`, {
        heading: 'Preprint: Preprint entry',
    });
}

/**
 * Open the "Post the preprint" window from an open workflow (stage view or
 * any Publication page) and return the modal, located by content unique to
 * the window (the workflow panel is itself a dialog — patterns.md pitfall 6).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string|RegExp} contentFilter text unique to the expected window
 */
async function openPostWindow(page, contentFilter) {
    const stageAction = page.getByRole('button', {name: 'Post the preprint', exact: true});
    const postControl = page.getByRole('button', {name: 'Post', exact: true});
    await expect(stageAction.or(postControl).first()).toBeVisible({timeout: 30_000});
    if (await stageAction.isVisible()) {
        await stageAction.click();
    }
    await expect(postControl).toBeVisible({timeout: 30_000});
    await postControl.click();
    // The modal wrapper reports visibility:hidden (patterns.md pitfall 5) —
    // anchor on the role=dialog element, disambiguated from the workflow
    // panel (itself a dialog) by content unique to the window.
    const dialog = page.getByRole('dialog').filter({hasText: contentFilter});
    await expect(dialog).toBeVisible({timeout: 30_000});
    return dialog;
}

/** Confirm an open post window, bounded by the publish API answering OK. */
async function confirmPostWindow(page, dialog) {
    const posted = page.waitForResponse(
        (r) => /\/publications\/\d+\/publish/.test(r.url()) && r.ok(),
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Post', exact: true}).last().click();
    await posted;
}

/** Open the confirm-state window and confirm it: "Status: Posted" with
 * "Unpost" offered afterwards. */
async function postNow(page) {
    const dialog = await openPostWindow(page, 'Are you sure you want to post this?');
    await confirmPostWindow(page, dialog);
    await expect(page.getByRole('button', {name: 'Unpost', exact: true})).toBeVisible({
        timeout: 30_000,
    });
    await expectStatus(page, 'Posted');
}

/**
 * Unschedule the shown scheduled version: "Unschedule" opens a red confirm
 * dialog whose confirm button repeats the action name (Rule 9; OPS locale
 * wording live in ops/locale/en/submission.po).
 */
async function unschedulePreprint(page) {
    await page.getByRole('button', {name: 'Unschedule', exact: true}).click();
    const dialog = page
        .getByRole('dialog')
        .filter({hasText: "Are you sure you don't want this to be scheduled to be posted?"});
    await expect(dialog).toBeVisible({timeout: 30_000});
    const done = page.waitForResponse(
        (r) => /\/publications\/\d+\/unpublish/.test(r.url()) && r.ok(),
        {timeout: 30_000}
    );
    await dialog.getByRole('button', {name: 'Unschedule', exact: true}).last().click();
    await done;
    await expect(dialog).toHaveCount(0, {timeout: 30_000});
}

/** The "Create New Version" dialog, anchored on its own form control. */
function versionDialog(page) {
    return page
        .getByRole('dialog')
        .filter({has: page.locator('#version-versionSource-control')});
}

/**
 * Create a new version through the side menu's dialog, untouched unless a
 * mutator is given; returns the new publication JSON from the POST.
 *
 * @param {import('@playwright/test').Page} page
 * @param {(dialog: import('@playwright/test').Locator) => Promise<void>} [mutate]
 */
async function createNewVersionViaDialog(page, mutate) {
    // The dialog takes its stage from the loaded version at mount.
    await new WorkflowPage(page, PK).expectVersionLoaded();
    await page.getByRole('link', {name: 'Create New Version', exact: true}).click();
    const dialog = versionDialog(page);
    await expect(dialog.locator('#version-versionSource-control')).toBeVisible({
        timeout: 30_000,
    });
    if (mutate) {
        await mutate(dialog);
    }
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

/** Assert the side menu lists exactly the one version "Author Original 1.0"
 * (the Control every version scenario opens on: the 1.1 entry's absence is
 * bounded by the 1.0 entry read the same way). */
async function expectOneVersionListed(page) {
    await expect(
        page.getByRole('link', {name: 'Author Original 1.0', exact: true})
    ).toBeVisible({timeout: 30_000});
    await expect(
        page.getByRole('link', {name: /^Author Original \d+\.\d+$/})
    ).toHaveCount(1);
}

/** Open the bell Tasks panel (legacy grid modal; a visible "No Items" row
 * when empty bounds the read). The page is reloaded first so a panel
 * opened earlier in the test is not read twice. */
async function openTasksPanel(page, {reload = false} = {}) {
    if (reload) {
        await page.reload();
    }
    await page.getByRole('button', {name: /^Tasks/}).first().click();
    const panel = page.locator('[data-cy="active-modal"]').last();
    await expect(panel.getByRole('table').first()).toBeVisible({timeout: 30_000});
    return panel;
}

/** Assert Activity Log lines on the open workflow, then close the modal.
 * The workflow panel is itself an active-modal, so the log modal is
 * anchored by its own grid title, not by stacking order.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string|string[]} texts
 */
async function expectActivityLogLines(page, texts) {
    await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
    const logModal = page
        .locator('[data-cy="active-modal"]')
        .filter({hasText: 'Activity Log & Notes'});
    await expect(logModal.getByText('Activity Log & Notes')).toBeVisible({
        timeout: 30_000,
    });
    await waitForJQueryIdle(page);
    for (const text of Array.isArray(texts) ? texts : [texts]) {
        await expect(logModal.getByText(text).first()).toBeVisible({timeout: 30_000});
    }
    await logModal.getByRole('button', {name: 'Close'}).first().click();
    await expect(logModal).toHaveCount(0, {timeout: 30_000});
}

/** Fill "Date Posted" on the OPEN Preprint entry page and save (the form is
 * `issueEntry`; its save PUTs onto the publication — tunneled POST). */
async function saveDatePosted(page, screen, date) {
    const dateInput = screen.input('issueEntry', 'datePublished');
    await expect(dateInput).toBeVisible({timeout: 30_000});
    await dateInput.fill(date);
    await screen.save();
}

/** A date string one year ahead (schedules). */
function futureDate() {
    const d = new Date();
    return `${d.getFullYear() + 1}-12-01`;
}

/** Today as YYYY-MM-DD in the runner's zone and in UTC (the server stamps
 * in its own zone; either reading of "today" is accepted). */
function todayCandidates() {
    const d = new Date();
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return [local, d.toISOString().slice(0, 10)];
}

/** Open the reader page signed out and return the response (the `page`
 * fixture carries no session in this file). */
async function gotoReaderPage(page, contextPath, submissionId, {prefix = ''} = {}) {
    return page.goto(`/index.php/${contextPath}${prefix}/preprint/view/${submissionId}`);
}

/**
 * Add a contributor without an account to the open workflow's
 * Publication › Contributors screen (*Contributors & affiliations*'s
 * panel; no `contributors[]` seed key exists) and return to the workflow
 * root. The row is read back before returning.
 */
async function addAccountlessContributor(page, contextPath, submissionId, {given, email}) {
    await openWorkflow(page, contextPath, submissionId);
    const contributors = new ContributorsScreen(page);
    await contributors.openFromWorkflow();
    await contributors.addPersonContributor({given, family: 'Noaccount', email});
    await expect(contributors.row(given)).toBeVisible({timeout: 30_000});
}

test.describe('Publish, schedule & versions (U49)', () => {
    test('S1: post a preprint and see it live', {tag: '@smoke'}, async ({asUser, opsApi, page, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const title = `Preprint ${tag}`;
        await opsApi.createContext({tag, users: contextUsers(tag)});
        const {submissionId} = await opsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: `${tag}au`,
            title,
        });

        // "Control" (before the Confirm): the reader page is not there and
        // the Author's Tasks hold no such notice — the grid reads "No
        // Items" (Rule 8; Side effects). Both are re-read the same way
        // after the post.
        const before = await gotoReaderPage(page, tag, submissionId);
        expect(before?.status()).toBe(404);
        const authorPage = await (await asUser(`${tag}au`)).newPage();
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const tasksBefore = await openTasksPanel(authorPage);
        await expect(tasksBefore.getByText('No Items')).toBeVisible({timeout: 30_000});
        await expect(tasksBefore.getByText(title)).toHaveCount(0);

        // "The Publication area": the stage view's "Post the preprint"
        // button lands on the Publication area; the head reads "Status:
        // Unposted" (Rule 1).
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await openWorkflow(managerPage, tag, submissionId);
        await managerPage
            .getByRole('button', {name: 'Post the preprint', exact: true})
            .click();
        await expect(
            managerPage.getByRole('heading', {name: 'Preprint: Title & Abstract'})
        ).toBeVisible({timeout: 30_000});
        await expectStatus(managerPage, 'Unposted');

        // "The confirmation window": "Post" opens it directly (Rule 2); it
        // states "All requirements have been met." and names "Author
        // Original 1.0" (Rule 4). The requirement-shaped stage sentence is
        // A7's — only the version name is asserted. Confirm.
        const dialog = await openPostWindow(
            managerPage,
            'Are you sure you want to post this?'
        );
        await expect(dialog).toContainText('Post the preprint');
        await expect(dialog).toContainText('All requirements have been met.');
        await expect(dialog).toContainText('Author Original 1.0');
        await confirmPostWindow(managerPage, dialog);

        // "Published": "Status: Posted", the offered control flips to
        // "Unpost" (Rule 9's precondition), and the reader page is live
        // (anonymous context; scratch servers are single-locale — probe
        // bare, patterns.md lesson 9).
        await expect(
            managerPage.getByRole('button', {name: 'Unpost', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expectStatus(managerPage, 'Posted');
        await gotoReaderPage(page, tag, submissionId);
        await expect(page.getByRole('heading', {name: title})).toBeVisible({
            timeout: 30_000,
        });

        // "The Activity Log": the OPS-worded post line and the Done-stage
        // move by the acting manager (Side effects).
        await expectActivityLogLines(managerPage, [
            'The submission was posted.',
            'Mona Manager moved this submission to the Done stage.',
        ]);

        // "The Author's side": the "Publication Published" email
        // (recipient-scoped, A8, with the tag as content marker) and the
        // task notice naming the preprint under Tasks (its "was published"
        // verb is OPS5's ❓ and is not asserted), sent in the server's name
        // from its principal contact's address (a scratch server's:
        // admin@mail.test), not the manager.
        const mail = await pkpMail.find({
            to: mailOf(`${tag}au`),
            subject: 'Publication Published',
            contains: tag,
            timeoutMs: 30_000,
        });
        expect(mail.From.Name).toBe(`Scratch context ${tag}`);
        expect(mail.From.Address).toBe('admin@mail.test');
        const tasks = await openTasksPanel(authorPage, {reload: true});
        await expect(tasks.getByText(title).first()).toBeVisible({timeout: 30_000});
        // The legacy grid keeps its "No Items" row in the DOM, hidden, once
        // a row exists.
        await expect(tasks.getByText('No Items')).toBeHidden();
    });

    test('S2: a declined preprint cannot be posted', async ({asUser, opsApi}, testInfo) => {
        const tag = makeTag('s2', testInfo);
        const {submissionId} = await opsApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title: `Preprint ${tag}`,
            decisions: ['decline'],
        });

        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);

        // "The window": a preprint server opens the refused window directly
        // (Rule 7 — no details panel): the requirements heading, the
        // declined line, and no confirm button at all (Rule 4; "Control":
        // S1's undeclined submission reaches the all-met window and its
        // confirm button, read the same way there).
        await expectStatus(managerPage, 'Unposted');
        const dialog = await openPostWindow(
            managerPage,
            'The following requirements must be met before this can be posted.'
        );
        await expect(dialog).toContainText('A declined submission can not be posted.');
        await expect(
            dialog.getByRole('button', {name: 'Post', exact: true})
        ).toHaveCount(0);

        // "Close": the version is neither posted nor scheduled — the
        // status is unchanged.
        await dialog.getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
        await expectStatus(managerPage, 'Unposted');
        await expect(
            managerPage.getByRole('button', {name: 'Post', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(
            managerPage.getByRole('button', {name: 'Unschedule', exact: true})
        ).toHaveCount(0);
    });

    test('S3: unpost takes the preprint down and clears the author notice', async ({asUser, opsApi, page}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const title = `Preprint ${tag}`;
        await opsApi.createContext({tag, users: contextUsers(tag)});
        const {submissionId} = await opsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: `${tag}au`,
            title,
            published: true,
        });

        // "Control": before the unpost the reader page is live and the
        // Author's Tasks hold the posting notice (S1's state).
        const authorPage = await (await asUser(`${tag}au`)).newPage();
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const tasksBefore = await openTasksPanel(authorPage);
        await expect(tasksBefore.getByText(title).first()).toBeVisible({
            timeout: 30_000,
        });
        await gotoReaderPage(page, tag, submissionId);
        await expect(page.getByRole('heading', {name: title})).toBeVisible({
            timeout: 30_000,
        });

        // "Unpost": the Publication area offers "Unpost"; the red dialog
        // asks "Are you sure you don't want this to be posted?" (asserted
        // inside the helper); confirming returns the readout to "Unposted"
        // (Rule 9).
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await openWorkflow(managerPage, tag, submissionId);
        await expectStatus(managerPage, 'Posted');
        await unpostPreprint(managerPage);
        await expectStatus(managerPage, 'Unposted');

        // The reader page is gone (bounded by the pre-unpost 200 above).
        const response = await gotoReaderPage(page, tag, submissionId);
        expect(response?.status()).toBe(404);

        // "The Activity Log": the OPS-worded unpost line and the return to
        // the workflow by the acting manager (Side effects).
        await expectActivityLogLines(managerPage, [
            'The submission was unposted.',
            'Mona Manager returned this submission to the workflow.',
        ]);

        // "The Author's Tasks": the notice is gone; the grid reads "No
        // Items" (Side effects).
        const tasksAfter = await openTasksPanel(authorPage, {reload: true});
        await expect(tasksAfter.getByText('No Items')).toBeVisible({timeout: 30_000});
        await expect(tasksAfter.getByText(title)).toHaveCount(0);
    });

    test('S4: create a new version', async ({asUser, opsApi, page, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const title = `Preprint ${tag}`;
        await opsApi.createContext({tag, users: contextUsers(tag, {moderator: true})});
        const {submissionId} = await opsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: `${tag}au`,
            title,
            published: true,
            participants: [{username: `${tag}md`, role: 'sectionEditor'}],
        });

        // "Control": before the new version the side menu lists the one
        // posted version, and the reader page's date line ("Posted
        // {date}") carries no "Updated on" — bounded by the same block's
        // "Versions" list naming the posted version (Actors row 7;
        // Rule 11).
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await openWorkflow(managerPage, tag, submissionId);
        await expectOneVersionListed(managerPage);
        await gotoReaderPage(page, tag, submissionId);
        await expect(page.getByRole('heading', {name: title, exact: true})).toBeVisible({
            timeout: 30_000,
        });
        await expect(preprintDateLine(page)).toContainText('Posted');
        await expect(preprintVersionsList(page)).toContainText('(Author Original 1.0)');
        await expect(preprintDateLine(page)).not.toContainText('Updated on');

        // "Create New Version": the dialog arrives pre-answered on a
        // stage-assigned source (Rule 11 / fn-i): the copied version as
        // source, its stage, and "Minor Revision".
        const newPublication = await createNewVersionViaDialog(managerPage, async (dialog) => {
            await expect(
                dialog.locator('#version-versionSource-control option:checked')
            ).toHaveText('Author Original 1.0');
            await expect(
                dialog.locator('#version-versionStage-control option:checked')
            ).toHaveText('Author Original (AO)');
            await expect(
                dialog.locator('#version-versionIsMinor-control option:checked')
            ).toHaveText('Minor Revision');
        });

        // The menu gains "Author Original 1.1"; its pages open with
        // "Status: Unpublished" (a queued NON-current version — fn-g) and
        // the copied content.
        await expect(
            managerPage.getByRole('link', {name: 'Author Original 1.1', exact: true})
        ).toBeVisible({timeout: 30_000});
        const screen = new PublicationScreen(managerPage);
        await openMenuKey(
            managerPage,
            tag,
            submissionId,
            `publication_${newPublication.id}_titleAbstract`
        );
        await expectStatus(managerPage, 'Unpublished');
        await expect(screen.richTextBody('titleAbstract', 'title', 'en')).toContainText(
            title,
            {timeout: 30_000}
        );

        // "The reader page": mark the draft so the reader-side read can
        // tell the versions apart, then the page still serves the OLD
        // version and its "Versions" list shows nothing new (Rule 11; the
        // shifted date line is A6's 🐞 and is not asserted either way).
        await screen.fillRichText('titleAbstract', 'title', 'en', `${title} vNext`);
        await screen.save();
        await gotoReaderPage(page, tag, submissionId);
        await expect(page.getByRole('heading', {name: title, exact: true})).toBeVisible({
            timeout: 30_000,
        });
        await expect(page.getByText(`${title} vNext`)).toHaveCount(0);
        await expect(preprintVersionsList(page)).toContainText('(Author Original 1.0)');
        await expect(preprintVersionsList(page)).not.toContainText('(Author Original 1.1)');

        // "The emails and notices": the submitting Author and the
        // stage-assigned Moderator get the "A new version was created…"
        // email and the task notice; the manager, acting without a stage
        // assignment, gets neither — the mailbox silence bounded by the
        // Moderator's copy, the Tasks silence by the Moderator's notice
        // read the same way (Side effects; A1 owns the audience question
        // and is not asserted).
        const versionMail = {subject: 'A new version was created', contains: tag};
        await pkpMail.find({to: mailOf(`${tag}md`), ...versionMail, timeoutMs: 30_000});
        await pkpMail.find({to: mailOf(`${tag}au`), ...versionMail, timeoutMs: 30_000});
        await pkpMail.expectNone({
            to: mailOf(`${tag}mg`),
            ...versionMail,
            afterControl: {to: mailOf(`${tag}md`), ...versionMail},
        });
        const moderatorPage = await (await asUser(`${tag}md`)).newPage();
        await moderatorPage.goto(`/index.php/${tag}/dashboard/editorial`);
        const moderatorTasks = await openTasksPanel(moderatorPage);
        await expect(moderatorTasks.getByText(NEW_VERSION_NOTICE).first()).toBeVisible({
            timeout: 30_000,
        });
        const authorPage = await (await asUser(`${tag}au`)).newPage();
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const authorTasks = await openTasksPanel(authorPage);
        await expect(authorTasks.getByText(NEW_VERSION_NOTICE).first()).toBeVisible({
            timeout: 30_000,
        });
        await managerPage.goto(`/index.php/${tag}/dashboard/editorial`);
        const managerTasks = await openTasksPanel(managerPage);
        await expect(managerTasks.getByText(NEW_VERSION_NOTICE)).toHaveCount(0);

        // "The Activity Log": adds "A new version was created." (Side
        // effects).
        await openWorkflow(managerPage, tag, submissionId);
        await expectActivityLogLines(managerPage, 'A new version was created.');
    });

    test('S5: post the new version', async ({asUser, opsApi, page, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s5', testInfo);
        const title = `Preprint ${tag}`;
        const author = `${tag}au`;
        await opsApi.createContext({tag, users: contextUsers(tag)});
        const {submissionId} = await opsApi.createSubmission({
            tag: `${tag}s`,
            context: tag,
            submitter: author,
            title,
        });

        // "Control" (S1's state, caused here so the mailbox holds its
        // positive): the manager posts "Author Original 1.0"; the Author,
        // with the email left on, receives both the "Publication
        // Published" email and the task notice (Side effects).
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await openWorkflow(managerPage, tag, submissionId);
        await postNow(managerPage);
        await pkpMail.find({
            to: mailOf(author),
            subject: 'Publication Published',
            contains: tag,
            timeoutMs: 30_000,
        });
        await pkpMail.find({
            to: mailOf(author),
            subject: 'Posted Acknowledgement',
            contains: tag,
            timeoutMs: 30_000,
        });
        const authorPage = await (await asUser(author)).newPage();
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const tasksBefore = await openTasksPanel(authorPage);
        await expect(tasksBefore.getByText(title).first()).toBeVisible({timeout: 30_000});

        // Setup (S4's state, not under test here): a new version.
        const newPublication = await createNewVersionViaDialog(managerPage);

        // "Insert Content" {OJS OMP}: on a preprint server the Summary of
        // Changes box carries no such button (Rule 14) — the box's own
        // editor, read inside the same wrapper, is the positive control.
        // "The details": Update Type arrives on "New Version"; choose
        // "Correction", type the summary and save (Fields; Rule 13).
        const screen = new PublicationScreen(managerPage);
        await openEntryPage(managerPage, tag, submissionId, newPublication.id);
        await expect(
            managerPage.locator('#issueEntry-updateType-control option:checked')
        ).toHaveText('New Version');
        await managerPage
            .locator('#issueEntry-updateType-control')
            .selectOption({label: 'Correction'});
        const summaryWrapper = screen.fieldWrapper('issueEntry', 'summaryOfChanges', 'en');
        await expect(summaryWrapper).toBeVisible({timeout: 30_000});
        await expect(screen.richTextBody('issueEntry', 'summaryOfChanges', 'en')).toBeVisible({
            timeout: 30_000,
        });
        await expect(
            summaryWrapper.getByRole('button', {name: 'Insert Content'})
        ).toHaveCount(0);
        await screen.fillRichText('issueEntry', 'summaryOfChanges', 'en', 'Figure 2 corrected.');
        await screen.save();

        // "The email switched off": the Author switches the email of the
        // "…was published." row off on Profile › Notifications and saves
        // (Side effects). The row's box reads "Do not send me an email for
        // these types of notifications." and arrives unticked, so the
        // opt-out is ticking it, not unticking (T-ops-1 in the findings
        // file: the scenario says "untick").
        await switchOffPublishedEmail(authorPage, tag);

        // "Publish": mark the new version's title so the reader swap is
        // observable, then post it: the window names the already-assigned
        // version (Rule 4's staged form) and confirming yields "Status:
        // Posted".
        await openMenuKey(
            managerPage,
            tag,
            submissionId,
            `publication_${newPublication.id}_titleAbstract`
        );
        await screen.fillRichText('titleAbstract', 'title', 'en', `${title} v2`);
        await screen.save();
        const dialog = await openPostWindow(
            managerPage,
            'Are you sure you want to post this?'
        );
        await expect(dialog).toContainText(
            'The publication version is "Author Original 1.1"'
        );
        await confirmPostWindow(managerPage, dialog);
        await expect(
            managerPage.getByRole('button', {name: 'Unpost', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expectStatus(managerPage, 'Posted');

        // The reader page now serves the new version and its "Versions"
        // list gains the new entry (the saved summary's reader absence is
        // A5's 🐞 — not asserted). The log adds "A new version was
        // posted." (Rules 8, 13; Side effects).
        await gotoReaderPage(page, tag, submissionId);
        await expect(
            page.getByRole('heading', {name: `${title} v2`})
        ).toBeVisible({timeout: 30_000});
        await expect(preprintVersionsList(page)).toContainText('(Author Original 1.1)');
        await expect(preprintVersionsList(page)).toContainText('(Author Original 1.0)');
        await expectActivityLogLines(managerPage, 'A new version was posted.');

        // "The notice without the email": the Author's Tasks hold the new
        // version's notice, while no new "Publication Published" email
        // arrives for them — bounded by the same post's acknowledgement
        // (the second "Posted Acknowledgement" to the same address) and by
        // the first post's positive above: the "Publication Published"
        // count stays at one (Side effects).
        const tasksAfter = await openTasksPanel(authorPage, {reload: true});
        await expect(tasksAfter.getByText(`${title} v2`).first()).toBeVisible({
            timeout: 30_000,
        });
        await expect
            .poll(
                () =>
                    pkpMail.count({
                        to: mailOf(author),
                        subject: 'Posted Acknowledgement',
                        contains: tag,
                    }),
                {timeout: 30_000}
            )
            .toBe(2);
        expect(
            await pkpMail.count({
                to: mailOf(author),
                subject: 'Publication Published',
                contains: tag,
            })
        ).toBe(1);

        // "Unpublish the new version": "Unpost" on it and confirm: the
        // reader page stays live serving "Author Original 1.0", its
        // "Versions" list one entry shorter (Rule 9).
        await unpostPreprint(managerPage);
        await gotoReaderPage(page, tag, submissionId);
        await expect(page.getByRole('heading', {name: title, exact: true})).toBeVisible({
            timeout: 30_000,
        });
        await expect(page.getByText(`${title} v2`)).toHaveCount(0);
        await expect(preprintVersionsList(page)).toContainText('(Author Original 1.0)');
        await expect(preprintVersionsList(page)).not.toContainText('(Author Original 1.1)');
    });

    test('S6: minor and major numbering', async ({asUser, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const {submissionId} = await opsApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title: `Preprint ${tag}`,
            published: true,
        });

        // "Control": the side menu lists the one posted version before the
        // first "Create New Version" (Actors row 7).
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        await expectOneVersionListed(managerPage);

        // "A minor version in the same stage": a preprint server knows a
        // single stage (Rule 12): the dialog's Publication Stage offers
        // only "Author Original (AO)" — the AO option's presence bounds the
        // Version-of-Record absence. With an AO version existing, "Minor
        // Revision" is selectable (and preselected — fn-i); an untouched
        // Confirm yields "… 1.1".
        await createNewVersionViaDialog(managerPage, async (dialog) => {
            const stageOptions = dialog.locator('#version-versionStage-control option');
            await expect(stageOptions.filter({hasText: 'Author Original (AO)'})).toHaveCount(1);
            await expect(stageOptions.filter({hasText: 'Version of Record'})).toHaveCount(0);
            const minorOption = dialog
                .locator('#version-versionIsMinor-control option')
                .filter({hasText: 'Minor Revision'});
            await expect(minorOption).toBeEnabled();
            await expect(
                dialog.locator('#version-versionIsMinor-control option:checked')
            ).toHaveText('Minor Revision');
        });
        await expect(
            managerPage.getByRole('link', {name: 'Author Original 1.1', exact: true})
        ).toBeVisible({timeout: 30_000});

        // "A major version in a stage that has versions": keeping "Author
        // Original" and choosing "Major Revision" yields the stage's next
        // whole number, "Author Original 2.0" (Rule 12).
        await createNewVersionViaDialog(managerPage, async (dialog) => {
            await expect(
                dialog.locator('#version-versionStage-control option:checked')
            ).toHaveText('Author Original (AO)');
            await dialog
                .locator('#version-versionIsMinor-control')
                .selectOption({label: 'Major Revision'});
        });
        await expect(
            managerPage.getByRole('link', {name: 'Author Original 2.0', exact: true})
        ).toBeVisible({timeout: 30_000});
    });

    test('S7: the version list and the author\'s view', async ({asUser, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const title = `Preprint ${tag}`;
        const {submissionId, publicationId} = await opsApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title,
            published: true,
        });

        // Setup: a second version exists (scenario 7's state).
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        const newPublication = await createNewVersionViaDialog(managerPage);

        // "The tracking view": the submitting Author's My Submissions
        // view: the side menu lists every version by name; each page
        // heads with the status readout (Actors row 7; Rule 1).
        const authorPage = await (await asUser('author.alex')).newPage();
        await openWorkflow(authorPage, PK, submissionId, {author: true});
        await expect(
            authorPage.getByRole('link', {name: 'Author Original 1.0', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(
            authorPage.getByRole('link', {name: 'Author Original 1.1', exact: true})
        ).toBeVisible();

        await openMenuKey(
            authorPage,
            PK,
            submissionId,
            `publication_${publicationId}_titleAbstract`,
            {author: true}
        );
        await expectStatus(authorPage, 'Posted');
        await openMenuKey(
            authorPage,
            PK,
            submissionId,
            `publication_${newPublication.id}_titleAbstract`,
            {author: true}
        );
        await expectStatus(authorPage, 'Unpublished');

        // "The controls": no post, unpost or "Create New Version" control
        // anywhere (Actors).
        await expect(
            authorPage.getByRole('button', {name: 'Post', exact: true})
        ).toHaveCount(0);
        await expect(
            authorPage.getByRole('button', {name: 'Unpost', exact: true})
        ).toHaveCount(0);
        await expect(
            authorPage.getByRole('link', {name: 'Create New Version', exact: true})
        ).toHaveCount(0);

        // "Control", taken the same way: the manager's view of the SAME
        // unpublished version offers "Post" and the Create-New-Version
        // item; the posted version offers "Unpost" (Actors rows 1, 5).
        await openMenuKey(
            managerPage,
            PK,
            submissionId,
            `publication_${newPublication.id}_titleAbstract`
        );
        await expect(
            managerPage.getByRole('button', {name: 'Post', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(
            managerPage.getByRole('link', {name: 'Create New Version', exact: true})
        ).toBeVisible();
        await openMenuKey(
            managerPage,
            PK,
            submissionId,
            `publication_${publicationId}_titleAbstract`
        );
        await expect(
            managerPage.getByRole('button', {name: 'Unpost', exact: true})
        ).toBeVisible({timeout: 30_000});
    });

    test('S8: the Moderator gets the version pages but no publish controls', async ({asUser, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        const {submissionId} = await opsApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title: `Preprint ${tag}`,
        });

        // The PRE section's Moderators (sectioneditor.ana among them) are
        // stage-assigned by the real submit's AssignEditors — the assigned
        // Moderator of scenario 8.
        const moderatorPage = await (await asUser('sectioneditor.ana')).newPage();
        await openWorkflow(moderatorPage, PK, submissionId);

        // "The Production stage's button": the stage view still shows the
        // "Post the preprint" button; pressing it only lands on the
        // Publication area (Rule 2; A2's dead-end shortcut, asserted as
        // the scenario instructs).
        const stageAction = moderatorPage.getByRole('button', {
            name: 'Post the preprint',
            exact: true,
        });
        await expect(stageAction).toBeVisible({timeout: 30_000});
        await stageAction.click();
        await expect(
            moderatorPage.getByRole('heading', {name: 'Preprint: Title & Abstract'})
        ).toBeVisible({timeout: 30_000});

        // "The Publication area": the version pages are there — the
        // status readout renders — but the publish controls and "Create
        // New Version" are not (Actors).
        await expectStatus(moderatorPage, 'Unposted');
        await expect(
            moderatorPage.getByRole('button', {name: 'Post', exact: true})
        ).toHaveCount(0);
        await expect(
            moderatorPage.getByRole('button', {name: 'Unpost', exact: true})
        ).toHaveCount(0);
        await expect(
            moderatorPage.getByRole('link', {name: 'Create New Version', exact: true})
        ).toHaveCount(0);

        // "Control", same submission, same way: the manager sees both
        // controls (Actors rows 1, 5).
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        await managerPage
            .getByRole('button', {name: 'Post the preprint', exact: true})
            .click();
        await expect(
            managerPage.getByRole('button', {name: 'Post', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(
            managerPage.getByRole('link', {name: 'Create New Version', exact: true})
        ).toBeVisible();
    });

    test('S9: unschedule a future-dated preprint', async ({asUser, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s9', testInfo);
        const [{submissionId, publicationId}, posted] = await Promise.all([
            opsApi.createSubmission({
                tag,
                context: PK,
                submitter: 'author.alex',
                title: `Preprint ${tag}`,
            }),
            opsApi.createSubmission({
                tag: `${tag}p`,
                context: PK,
                submitter: 'author.alex',
                title: `Posted ${tag}`,
                published: true,
            }),
        ]);

        // A FUTURE "Date Posted" saved on Preprint entry is what schedules
        // (Rule 6); posting then yields "Status: Scheduled" — the scheduled
        // STATE is contract; that nothing ever posts it is OPS1's 🐞 and
        // the window's unchanged wording is not asserted either way.
        const managerPage = await (await asUser('manager.maya')).newPage();
        const screen = new PublicationScreen(managerPage);
        await openEntryPage(managerPage, PK, submissionId, publicationId);
        await saveDatePosted(managerPage, screen, futureDate());
        const dialog = await openPostWindow(
            managerPage,
            'Are you sure you want to post this?'
        );
        await confirmPostWindow(managerPage, dialog);

        // "Unschedule": the offered controls become "Preview" and
        // "Unschedule" (Rule 6 / fn-ops1's probed control set); the Post
        // button is gone — bounded by Unschedule having rendered.
        await expect(
            managerPage.getByRole('button', {name: 'Unschedule', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expectStatus(managerPage, 'Scheduled');
        await expect(
            controlsRight(managerPage).getByRole('button', {name: 'Preview', exact: true})
        ).toBeVisible();
        await expect(
            controlsRight(managerPage).getByRole('button', {name: 'Post', exact: true})
        ).toHaveCount(0);

        // "Unschedule" asks the OPS-worded question and returns the head
        // to "Unposted" (Rule 9).
        await unschedulePreprint(managerPage);
        await expectStatus(managerPage, 'Unposted');

        // "The Activity Log": adds the unpost line (Side effects).
        await expectActivityLogLines(managerPage, 'The submission was unposted.');

        // "Control": on a posted version the same place offers "Unpost"
        // instead (Rule 9; S3).
        await openWorkflow(managerPage, PK, posted.submissionId);
        await expectStatus(managerPage, 'Posted');
        await expect(
            controlsRight(managerPage).getByRole('button', {name: 'Unpost', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expect(
            controlsRight(managerPage).getByRole('button', {name: 'Unschedule', exact: true})
        ).toHaveCount(0);
    });

    test('S10: republish with what was kept', async ({asUser, opsApi, page}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        const title = `Preprint ${tag}`;
        const {submissionId, publicationId} = await opsApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title,
        });

        // Given and "Control": posted with the date left empty, the post
        // stamps today (Rule 8) — read on Preprint entry — and the reader
        // page is live at once carrying it; that stamped date has passed
        // by the time of the unpost below (Rule 10).
        const managerPage = await (await asUser('manager.maya')).newPage();
        const screen = new PublicationScreen(managerPage);
        await openEntryPage(managerPage, PK, submissionId, publicationId);
        await expect(screen.input('issueEntry', 'datePublished')).toHaveValue('', {
            timeout: 30_000,
        });
        await postNow(managerPage);
        await openEntryPage(managerPage, PK, submissionId, publicationId);
        const dateInput = screen.input('issueEntry', 'datePublished');
        await expect(dateInput).toHaveValue(/^\d{4}-\d{2}-\d{2}$/, {timeout: 30_000});
        const stamped = await dateInput.inputValue();
        expect(todayCandidates()).toContain(stamped);
        await gotoReaderPage(page, PK, submissionId, {prefix: PK_PREFIX});
        await expect(page.getByRole('heading', {name: title})).toBeVisible({
            timeout: 30_000,
        });
        await expect(preprintDateLine(page)).toContainText(stamped);

        // "Unpublish": "Unpost" and confirm (Rule 9).
        await unpostPreprint(managerPage);
        await expectStatus(managerPage, 'Unposted');

        // "The entry page": the date is still filled (Rule 9); "2030/01/01"
        // typed into "Date Posted" and saved is refused with the format
        // message, and the kept date stands (Fields).
        await openEntryPage(managerPage, PK, submissionId, publicationId);
        await expect(dateInput).toHaveValue(stamped, {timeout: 30_000});
        await dateInput.fill('2030/01/01');
        await screen.saveButton().click();
        await expect(screen.fieldError('issueEntry', 'datePublished')).toHaveText(
            DATE_FORMAT_ERROR,
            {timeout: 30_000}
        );
        await openEntryPage(managerPage, PK, submissionId, publicationId);
        await expect(dateInput).toHaveValue(stamped, {timeout: 30_000});

        // "The publish button again": it goes straight to the confirmation
        // window; Confirm: the preprint returns to "Posted" carrying its
        // ORIGINAL date (Rule 10).
        await postNow(managerPage);
        await gotoReaderPage(page, PK, submissionId, {prefix: PK_PREFIX});
        await expect(page.getByRole('heading', {name: title})).toBeVisible({
            timeout: 30_000,
        });
        await expect(preprintDateLine(page)).toContainText(stamped);
        await openEntryPage(managerPage, PK, submissionId, publicationId);
        await expect(dateInput).toHaveValue(stamped, {timeout: 30_000});
    });

    test('S15: the Post window, the acknowledgement, the future-date leg, and "Do not send an email."', async ({asUser, opsApi, page, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(360_000);
        const tag = makeTag('o15', testInfo);
        const title = `Preprint ${tag}`;
        const laterTitle = `Later ${tag}`;
        const author = `${tag}au`;
        const noAccount = `${tag}nc`;
        const offTag = `${tag}q`;
        const offAuthor = `${offTag}au`;
        const offNoAccount = `${offTag}nc`;
        const offTitle = `Quiet ${tag}`;
        await Promise.all([
            opsApi.createContext({tag, users: contextUsers(tag)}),
            opsApi.createContext({
                tag: offTag,
                users: contextUsers(offTag),
                postedAcknowledgement: false,
            }),
        ]);
        const [{submissionId}, scheduled, off] = await Promise.all([
            opsApi.createSubmission({tag: `${tag}a`, context: tag, submitter: author, title}),
            opsApi.createSubmission({
                tag: `${tag}b`,
                context: tag,
                submitter: author,
                title: laterTitle,
            }),
            opsApi.createSubmission({
                tag: `${offTag}s`,
                context: offTag,
                submitter: offAuthor,
                title: offTitle,
            }),
        ]);

        // Given: the first preprint's contributor list holds, besides the
        // submitting Author, a contributor without an account, added on
        // the workflow's Contributors screen with a throwaway address.
        const managerPage = await (await asUser(`${tag}mg`)).newPage();
        await addAccountlessContributor(managerPage, tag, submissionId, {
            given: 'Nora',
            email: mailOf(noAccount),
        });

        // "The future-date leg" is driven first so the live post that
        // follows bounds its silences: a date saved on Preprint entry
        // beforehand yields "Status: Scheduled", and the preprint page
        // stays down (Rule 6). That nothing will ever post it is OPS1's
        // 🐞; whether the acknowledgement should have gone out is OPS2's
        // ❓ — neither is asserted.
        const screen = new PublicationScreen(managerPage);
        await openEntryPage(managerPage, tag, scheduled.submissionId, scheduled.publicationId);
        await saveDatePosted(managerPage, screen, futureDate());
        const scheduleDialog = await openPostWindow(
            managerPage,
            'Are you sure you want to post this?'
        );
        await confirmPostWindow(managerPage, scheduleDialog);
        await expect(
            managerPage.getByRole('button', {name: 'Unschedule', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expectStatus(managerPage, 'Scheduled');
        const down = await gotoReaderPage(page, tag, scheduled.submissionId);
        expect(down?.status()).toBe(404);

        // "Post": the "Post the preprint" window shows the requirements
        // met, the version to be assigned and the "Related Publication"
        // line (the requirement-shaped stage sentence is A7's ❓ and is
        // not asserted); Confirm: "Status: Posted" and the preprint page
        // is live (Rules 4, 8) — the same-way positive control for the
        // scheduled page's 404 above.
        await openWorkflow(managerPage, tag, submissionId);
        const dialog = await openPostWindow(
            managerPage,
            'Are you sure you want to post this?'
        );
        await expect(dialog).toContainText('Post the preprint');
        await expect(dialog).toContainText('All requirements have been met.');
        await expect(dialog).toContainText('Author Original 1.0');
        await expect(dialog).toContainText('Related Publication');
        await expect(dialog).toContainText(
            "This preprint's relations have not been entered."
        );
        await confirmPostWindow(managerPage, dialog);
        await expect(
            managerPage.getByRole('button', {name: 'Unpost', exact: true})
        ).toBeVisible({timeout: 30_000});
        await expectStatus(managerPage, 'Posted');
        await gotoReaderPage(page, tag, submissionId);
        await expect(page.getByRole('heading', {name: title})).toBeVisible({
            timeout: 30_000,
        });

        // "The acknowledgement": the contributors receive a posting
        // acknowledgement — matched template-neutrally by the shared
        // "…Posted Acknowledgement" subject tail, so neither template
        // title is frozen (OPS4 🐞 owns which one goes out) — the
        // contributor without an account included (Side effects).
        // (The acknowledgement names the server, not the preprint, so the
        // content marker is the tag the scratch server's name carries.)
        const ack = {subject: 'Posted Acknowledgement', contains: tag, timeoutMs: 30_000};
        await pkpMail.find({to: mailOf(author), ...ack});
        await pkpMail.find({to: mailOf(noAccount), ...ack});

        // "Control": the live post also delivered the Author's
        // "Publication Published" (Side effects; Settings) …
        const published = {subject: 'Publication Published', timeoutMs: 30_000};
        await pkpMail.find({to: mailOf(author), ...published, contains: title});

        // … which bounds the future-date leg's silences: no "Publication
        // Published" for the scheduled preprint, and the Author's Tasks
        // hold the live post's notice but none for the scheduled one
        // (Rule 6; Side effects).
        await pkpMail.expectNone({
            to: mailOf(author),
            subject: 'Publication Published',
            contains: laterTitle,
            afterControl: {to: mailOf(author), subject: 'Publication Published', contains: title},
        });
        const authorPage = await (await asUser(author)).newPage();
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const tasks = await openTasksPanel(authorPage);
        await expect(tasks.getByText(title).first()).toBeVisible({timeout: 30_000});
        await expect(tasks.getByText(laterTitle)).toHaveCount(0);

        // "Do not send an email.": on the second server, seeded with the
        // setting off, the same post reaches its contributors with no
        // acknowledgement, the account-less one included, while the
        // Author's "Publication Published" still arrives and bounds the
        // read (Settings; the first server's post above is the positive
        // control for the acknowledgement itself).
        const offManagerPage = await (await asUser(`${offTag}mg`)).newPage();
        await addAccountlessContributor(offManagerPage, offTag, off.submissionId, {
            given: 'Nora',
            email: mailOf(offNoAccount),
        });
        await openWorkflow(offManagerPage, offTag, off.submissionId);
        await postNow(offManagerPage);
        await gotoReaderPage(page, offTag, off.submissionId);
        await expect(page.getByRole('heading', {name: offTitle})).toBeVisible({
            timeout: 30_000,
        });
        const offControl = {to: mailOf(offAuthor), subject: 'Publication Published', contains: offTitle};
        await pkpMail.find({...offControl, timeoutMs: 30_000});
        await pkpMail.expectNone({
            to: mailOf(offAuthor),
            subject: 'Posted Acknowledgement',
            afterControl: offControl,
        });
        await pkpMail.expectNone({
            to: mailOf(offNoAccount),
            afterControl: offControl,
        });
    });

    test('S16: the author cannot post', async ({asUser, opsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('o16', testInfo);
        const {submissionId} = await opsApi.createSubmission({
            tag,
            context: PK,
            submitter: 'author.alex',
            title: `Preprint ${tag}`,
            submitted: false,
        });

        // Given: the Author submits a preprint of their own through the
        // wizard (a seeded draft completed on its steps — the U21 suite's
        // page objects). "The wizard's closing screen": it says a moderator
        // will review and post the preprint (its texts belong to
        // *Submission wizard*) (Actors).
        const authorPage = await (await asUser('author.alex')).newPage();
        await authorPage.goto(wizardUrl(PK, submissionId));
        await expectWizardOpen(authorPage);
        await completeAndSubmitDraft(authorPage);
        await expect(
            authorPage.getByText(
                'Once the moderator has reviewed your submission, they will post your preprint or contact you.'
            )
        ).toBeVisible({timeout: 30_000});

        // "The workflow view": opened from My Submissions, it offers no
        // Post control (the plugin-granted leg is OPS3's ❓ — only the
        // default-server side is asserted). The rendered readout bounds
        // the absence.
        await openWorkflow(authorPage, PK, submissionId, {author: true});
        await expectStatus(authorPage, 'Unposted');
        await expect(
            authorPage.getByRole('button', {name: 'Post', exact: true})
        ).toHaveCount(0);
        await expect(
            authorPage.getByRole('button', {name: 'Post the preprint', exact: true})
        ).toHaveCount(0);
        await expect(
            authorPage.getByRole('link', {name: 'Create New Version', exact: true})
        ).toHaveCount(0);

        // "Control", same preprint, same way: the manager's Publication
        // area offers "Post" (Actors row 1).
        const managerPage = await (await asUser('manager.maya')).newPage();
        await openWorkflow(managerPage, PK, submissionId);
        await managerPage
            .getByRole('button', {name: 'Post the preprint', exact: true})
            .click();
        await expect(
            managerPage.getByRole('button', {name: 'Post', exact: true})
        ).toBeVisible({timeout: 30_000});
    });
});
