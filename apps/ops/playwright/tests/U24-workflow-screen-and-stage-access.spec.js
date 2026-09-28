// @ts-check
/**
 * @file playwright/tests/U24-workflow-screen-and-stage-access.spec.js
 *
 * Workflow screen & stage access — OPS suite, one test per canonical
 * scenario the spec runs on a preprint server: the common scenarios 1, 5,
 * 6, 7, 8, 11 and 14 in the preprint server's own context (one stage, the
 * "Preprint" group, Moderator and Preprint Server Manager as the editorial
 * roles, since OPS enrols no Editor account; no Reviewer, so S11 runs the
 * Reader and the Editorial Board Member only) and the OPS-specific
 * scenario 10. S2, S3, S4, S9, S12 and S13 name their absence or analogue
 * on a preprint server in their last sentence (register OPS1 ✅), so the
 * suite carries no absence test for them.
 * Spec: docs/specs/U24-workflow-screen-and-stage-access.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): OPS3 🐞
 * (S6 opens the Editor's dashboard address for a draft and asserts the panel
 * and its bubble are there, never the bubble's text), OPS2 ❓ (S10 and S14
 * assert the spec's current OPS text — a declined preprint landing on
 * "Preprint: Title & Abstract" — and move with the spec if the ruling
 * flips), OPS4 ❓ (no author's draft is typed at any door), A1 ❓, A3 ❓,
 * A5 🐞 (S6 types the plain `workflow/access` address only, never a
 * stage-naming one), A8 ❓ (the seeded `admin` holds a role everywhere),
 * A9 ❓ (S14 follows the dashboard and My Submissions addresses of the
 * deleted preprint, never an old-shape one), A2 ❓, A4 ❓, A6 🐞, A7 ❓
 * (journal and press states). The spec's Coverage section records
 * everything else left out.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only (A1, A7). Every test seeds its own preprint with a unique
 * tag (M5) and drives roster accounts through `asUser`: `manager.maya`
 * stands in for the spec's Editor, `sectioneditor.ana` is the Moderator of
 * section PRE (assigned automatically to every preprint there),
 * `author.alex` the Author, `author.bea` the stranger Author, `reader.rosa`
 * the Reader and `assistant.rita` the Editorial Board Member. A queued
 * preprint is a plain submitted seed (OPS creates every submission at
 * Production); the declined one is `decisions: ['decline']`; the Done state
 * is `published: true`; the draft `submitted: false`. S14 alone runs on a
 * scratch preprint server with a throwaway Manager and Author: its "Declined"
 * count is read from the side menu, and publicknowledge's count moves under
 * other suites' declined seeds (U49, this suite's S10), so the list must be
 * one the test alone feeds (the U22/U23 precedent; fn-s names
 * `manager.maya`/`author.alex`, which the scratch pair stands in for). The
 * mailbox reads (S8, S14) go through `pkpMail` as a before/after count
 * scoped to the submitter's address (A8); S8's roster recipient sits in a
 * catcher at its message cap, so the read pairs the recipient count with a
 * title-scoped count that roll-off cannot fake. Waits are web-first (A5).
 * Everything runs in the parallel `ops` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage, NO_ACCESS_TEXT, ACCESS_DENIED} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {EditorialDashboardPage} = require('../pages/EditorialDashboardPage.js');
const {MySubmissionsPage} = require('../pages/MySubmissionsPage.js');
const {unpostPreprint, relationsControl} = require('../pages/PublicationPages.js');

const SERVER = 'publicknowledge';

/** The preprint server's single stage entry (Rule 7, OPS1). */
const OPS_STAGES = ['Production'];

/** The editorial roster of a preprint server's version node (Rule 10). */
const EDITORIAL_PAGES = [
    'Title & Abstract',
    'Contributors',
    'Metadata',
    'References',
    'Funding',
    'Galleys',
    'Media',
    'Permissions & Disclosure',
    'Preprint entry',
];

/** The author's roster on a preprint server (Rule 10, OPS1). */
const AUTHOR_PAGES = [
    'Title & Abstract',
    'Contributors',
    'Metadata',
    'References',
    'Funding',
    'Galleys',
    'Media',
    'Production Tasks & Discussions',
];

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u24${scenario}opsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

async function seed(opsApi, tag, extra = {}) {
    return await opsApi.createSubmission({
        tag,
        context: SERVER,
        submitter: 'author.alex',
        title: `Preprint ${tag}`,
        ...extra,
    });
}

/** A page as a given roster user, plus the workflow page object for it. */
async function workflowAs(asUser, appContext, username, contextPath = SERVER) {
    const page = await (await asUser(username)).newPage();
    return {
        page,
        workflow: new WorkflowPage(page, contextPath, {appContext, labels: {publicationGroup: 'Preprint'}}),
    };
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/**
 * Type an address and read the refusal at the page (Rules 2–3): the
 * sentence is on the site's `authorizationDenied` page and no panel is
 * open. Matched as a substring: on a preprint server the non-Author
 * sentence shares its text node with a second sentence ("Please edit your
 * profile…"), which the shared `expectAccessDeniedPage`'s exact match
 * misses (returned as a shared-locator need).
 */
async function expectDeniedPage(workflow, url, message) {
    await workflow.page.goto(url);
    await expect(workflow.page.getByText(message).first()).toBeVisible({timeout: 30_000});
    await expect(workflow.page).toHaveURL(/authorizationDenied/);
    await workflow.expectClosed();
}

/**
 * The empty shell of Rule 3: the panel's header holds the submission
 * number and nothing else, and the "Error" dialog on top reads `message`
 * with an "OK" button. The shell is read through its `data-cy` hook, not
 * through the shared `header()`: the "Error" dialog stacks over the panel,
 * which goes aria-hidden beneath it, so a role-based read of the shell
 * returns nothing once the dialog is up (patterns.md pitfall 6; the shared
 * `expectErrorShell` reads it by role — returned as a shared need).
 */
async function expectErrorShell(workflow, submissionId, message) {
    const header = workflow.page.locator('[data-cy="sidemodal-header"]');
    // The number line also carries the "Refreshing data" spinner's text
    // (the failed fetch never settles it), so the number is the line's
    // leading token; "nothing else" is the missing contributors' line and
    // title paragraph below.
    await expect(header.locator('.text-xl-medium').first()).toHaveText(
        new RegExp(`^\\s*${submissionId}\\b`),
        {timeout: 30_000}
    );
    const dialog = workflow.errorDialog();
    await expect(dialog).toBeVisible({timeout: 30_000});
    await expect(dialog).toContainText(message);
    await expect(dialog.getByRole('button', {name: 'OK', exact: true})).toBeVisible();
    await expect(header.locator('span.underline')).toHaveCount(0);
    await expect(header.locator('p').first()).toHaveText(/^\s*$/);
}

test.describe('workflow screen & stage access', () => {
    test('S1: open a preprint\'s workflow from the editorial dashboard', {tag: '@smoke'}, async ({asUser, opsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const {submissionId} = await seed(opsApi, tag);

        const {page, workflow} = await workflowAs(asUser, appContext, 'manager.maya');
        const dash = new EditorialDashboardPage(page, SERVER);
        await dash.gotoView('active');
        const row = await dash.findRowByTag(tag);
        await workflow.openFromRow(row, submissionId);

        // The header (Rule 4): number, underlined contributors, full title,
        // the stage bubble reading "Production" (Rule 5, OPS1).
        await expect(workflow.contributorsLine()).toBeVisible();
        await expect(workflow.contributorsLine()).not.toHaveText('');
        await expect(workflow.titleLine()).toHaveText(`Preprint ${tag}`);
        await workflow.expectStage('Production');

        // The header buttons (Rule 6): "Activity Log" and "Library", and no
        // "View"; a queued preprint sits in Production, so "Preview" leads
        // (Rule 6's preprint-server clause; the S1 bullet's "neither" is
        // written for a submission in Submission — returned as T-ops-1).
        await workflow.expectHeaderButtons(['Preview', 'Activity Log', 'Library']);
        await expect(workflow.headerButton('View')).toHaveCount(0);

        // The side menu (Rules 7, 9): the Workflow group with "Production"
        // alone, striped; the Preprint group with one version node whose
        // pages start Title & Abstract, Contributors, Metadata.
        await expect(workflow.workflowGroup()).toBeVisible();
        expect(await workflow.stageLabels()).toEqual(OPS_STAGES);
        expect(await workflow.stripedLabels()).toEqual(['Production']);
        await expect(workflow.publicationGroup()).toBeVisible();
        await expect(workflow.versionNodes()).toHaveCount(1);
        expect((await workflow.pagesUnderLatestVersion()).slice(0, 3)).toEqual([
            'Title & Abstract',
            'Contributors',
            'Metadata',
        ]);

        // The main column is headed "Workflow: Production" (Rule 11) and
        // the address records the open preprint (Rule 12).
        await workflow.expectStageHeading('Production');
        expect(workflow.submissionIdFromUrl()).toBe(String(submissionId));

        // Close: the list is back and the address forgets the panel (Rule 1).
        await workflow.close();
        await expect(dash.row(tag)).toBeVisible({timeout: 30_000});
        expect(workflow.submissionIdFromUrl()).toBeNull();
    });

    test('S5: deep link and reload', async ({asUser, opsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const {submissionId} = await seed(opsApi, tag);

        const {page, workflow} = await workflowAs(asUser, appContext, 'manager.maya');
        await workflow.gotoEditorial(submissionId);
        await workflow.selectPage('Contributors');

        // The address names the preprint and the selected entry (Rule 12).
        await expect
            .poll(() => workflow.menuKeyFromUrl(), {timeout: 30_000})
            .toMatch(/^publication_\d+_contributors$/);
        const deepLink = page.url();

        // The same address in a new tab opens straight on the page.
        const tab = await page.context().newPage();
        const tabWorkflow = new WorkflowPage(tab, SERVER, {
            appContext,
            labels: {publicationGroup: 'Preprint'},
        });
        await tab.goto(deepLink);
        await tabWorkflow.expectOpen(submissionId);
        await tabWorkflow.expectPageHeading('Contributors');
        await tabWorkflow.expectSelected('Contributors');
        await tab.close();

        // Reload: the same.
        await page.reload();
        await workflow.expectOpen(submissionId);
        await workflow.expectPageHeading('Contributors');

        // An entry that does not exist: the entry's name replaced with
        // `nonsense` opens the panel at its landing entry, "Workflow:
        // Production", and the address is rewritten to that entry (Rules
        // 11, 12): the key is no longer `nonsense` but the stage's own.
        await page.goto(workflow.editorialUrl(submissionId, 'nonsense'));
        await workflow.expectOpen(submissionId);
        await workflow.expectStageHeading('Production');
        await workflow.expectSelected('Production');
        await expect
            .poll(() => workflow.menuKeyFromUrl(), {timeout: 30_000})
            .toMatch(/^workflow_\d+$/);
        expect(workflow.menuKeyFromUrl()).not.toBe('nonsense');

        // Close: both parts leave the address and the list is back.
        await workflow.close();
        expect(workflow.submissionIdFromUrl()).toBeNull();
        expect(workflow.menuKeyFromUrl()).toBeNull();
        const dash = new EditorialDashboardPage(page, SERVER);
        await expect(dash.heading()).toBeVisible({timeout: 30_000});
    });

    test('S6: typed addresses forward', async ({asUser, opsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const [{submissionId}, draft] = await Promise.all([
            seed(opsApi, tag),
            seed(opsApi, `${tag}dr`, {submitted: false}),
        ]);

        // The Manager's `workflow/access` address forwards to the editorial
        // dashboard, "Assigned to me", with the panel open at its usual
        // landing, the single stage (Rules 2a, 11).
        const manager = await workflowAs(asUser, appContext, 'manager.maya');
        await manager.page.goto(manager.workflow.workflowAccessUrl(submissionId));
        await manager.page.waitForURL((url) => url.pathname.includes('/dashboard/editorial'), {
            waitUntil: 'commit',
        });
        await manager.workflow.expectOpen(submissionId);
        await manager.workflow.expectStageHeading('Production');
        await expect
            .poll(() => new URL(manager.page.url()).searchParams.get('currentViewId'), {timeout: 30_000})
            .toBe('assigned-to-me');
        expect(manager.workflow.submissionIdFromUrl()).toBe(String(submissionId));

        // The dashboard address for a draft: the panel opens on the draft,
        // its header carrying the draft's title and a stage bubble (Rules
        // 2c, 5). The bubble's text is register OPS3 🐞 on a preprint server
        // and is not pinned here (PRINCIPLES M3).
        await manager.workflow.gotoEditorial(draft.submissionId);
        await expect(manager.workflow.titleLine()).toHaveText(`Preprint ${tag}dr`);
        await expect(manager.workflow.stageBubble()).toBeVisible();
        await expect(manager.workflow.stageBubble()).not.toHaveText('');

        // The Author's old author-dashboard address forwards to My
        // Submissions with the panel open on the preprint's pages (Rule 2b).
        const author = await workflowAs(asUser, appContext, 'author.alex');
        await author.page.goto(author.workflow.authorDashboardUrl(submissionId));
        await author.page.waitForURL((url) => url.pathname.includes('/dashboard/mySubmissions'), {
            waitUntil: 'commit',
        });
        await author.workflow.expectOpen(submissionId);
        await author.workflow.expectPageHeading('Title & Abstract');

        // The Author at the editorial addresses (Rules 2a, 3): turned away
        // at the `workflow/access` address with the stage gate's page, and
        // at the dashboard address with the role gate's page, no panel.
        await expectDeniedPage(
            author.workflow,
            author.workflow.workflowAccessUrl(submissionId),
            NO_ACCESS_TEXT
        );
        await expectDeniedPage(
            author.workflow,
            author.workflow.editorialUrl(submissionId),
            ACCESS_DENIED.role
        );

        // A stranger Author at the old author-dashboard address (Rule 2b):
        // author.bea typing author.alex's preprint gets the stage gate's
        // page.
        const stranger = await workflowAs(asUser, appContext, 'author.bea');
        await expectDeniedPage(
            stranger.workflow,
            stranger.workflow.authorDashboardUrl(submissionId),
            NO_ACCESS_TEXT
        );

        // Control: the Manager on the author-dashboard address gets the
        // non-Author sentence (Rule 2b).
        await expectDeniedPage(
            manager.workflow,
            manager.workflow.authorDashboardUrl(submissionId),
            ACCESS_DENIED.notAuthor
        );
    });

    test('S7: the author\'s view', {tag: '@smoke'}, async ({asUser, opsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const [{submissionId}, other] = await Promise.all([
            seed(opsApi, tag),
            seed(opsApi, `${tag}b`, {submitter: 'author.bea'}),
        ]);

        const {page, workflow} = await workflowAs(asUser, appContext, 'author.alex');
        const mySub = new MySubmissionsPage(page, SERVER);
        await mySub.goto();
        const row = await mySub.findRowByTag(tag);
        await workflow.openFromRow(row, submissionId);

        // The header offers "Library" and nothing else, and the bubble
        // reads "Production" (Rules 5, 6).
        await expect(workflow.headerButton('Library')).toBeVisible();
        await workflow.expectHeaderButtons(['Library']);
        await workflow.expectStage('Production');

        // No "Workflow" group at all; the panel lands on "Preprint: Title &
        // Abstract" (Rules 7, 11, OPS1).
        await workflow.expectPageHeading('Title & Abstract');
        await workflow.expectSelected('Title & Abstract');
        await expect(workflow.publicationGroup()).toBeVisible();
        await expect(workflow.workflowGroup()).toHaveCount(0);
        expect(await workflow.stageLabels()).toEqual([]);

        // The version node lists the author's roster, ending with
        // "Production Tasks & Discussions", nothing production-only (Rule
        // 10); no "Create New Version" (Rule 9).
        expect(await workflow.pagesUnderLatestVersion()).toEqual(AUTHOR_PAGES);
        await expect(workflow.createNewVersionLink()).toHaveCount(0);

        // "Title & Abstract" (Rule 17): no language line; the left region's
        // first item is "Status: Unposted", followed by the "Relations"
        // dropdown (the two share one item of the region); no region of
        // publishing controls on the right (the left region with its item
        // is the positive control).
        await workflow.selectPage('Title & Abstract');
        await expect(workflow.controlsLeft()).toBeVisible();
        await expect(workflow.languageLine()).toHaveCount(0);
        await expect
            .poll(() => workflow.controlsLeftItems(), {timeout: 30_000})
            .toEqual(['Status: Unposted Relations']);
        await expect(relationsControl(page)).toBeVisible();
        await expect(workflow.controlsRight()).toHaveCount(0);

        // Control: the Manager on the same preprint has "Activity Log" and
        // "Preview" in the header, the "Workflow" group in the menu,
        // "Permissions & Disclosure" in the list and "Create New Version"
        // after the node (Rules 6, 10). While "Permissions & Disclosure" is
        // selected, the address carries its entry, to be copied below.
        const manager = await workflowAs(asUser, appContext, 'manager.maya');
        await manager.workflow.gotoEditorial(submissionId);
        await expect(manager.workflow.headerButton('Activity Log')).toBeVisible();
        await expect(manager.workflow.headerButton('Preview')).toBeVisible();
        await expect(manager.workflow.workflowGroup()).toBeVisible();
        expect(await manager.workflow.stageLabels()).toEqual(OPS_STAGES);
        await manager.workflow.selectPage('Permissions & Disclosure');
        await expect(manager.workflow.createNewVersionLink()).toBeVisible();
        await expect
            .poll(() => manager.workflow.menuKeyFromUrl(), {timeout: 30_000})
            .toMatch(/^publication_\d+_license$/);
        const editorsEntry = manager.workflow.menuKeyFromUrl();

        // An entry copied from the Manager's address (Rules 11, 12): added
        // to the Author's own My Submissions address, the panel opens at
        // the landing entry, "Preprint: Title & Abstract", and the address
        // is rewritten to that entry.
        await page.goto(workflow.authorUrl(submissionId, editorsEntry));
        await workflow.expectOpen(submissionId);
        await workflow.expectPageHeading('Title & Abstract');
        await workflow.expectSelected('Title & Abstract');
        await expect
            .poll(() => workflow.menuKeyFromUrl(), {timeout: 30_000})
            .toMatch(/^publication_\d+_titleAbstract$/);
        expect(workflow.menuKeyFromUrl()).not.toBe(editorsEntry);

        // The other Author's preprint (Rule 3): its My Submissions address
        // gives the shell with only the number in its header and the
        // "Error" dialog with "OK", over My Submissions.
        await page.goto(workflow.authorUrl(other.submissionId));
        await expectErrorShell(workflow, other.submissionId, ACCESS_DENIED.role);
        await expect(page).toHaveURL(/\/dashboard\/mySubmissions/);

        // Control, continued: pressing the Manager's "Preview" opens the
        // preprint's public page in the same tab, carrying the preview
        // notice (Rule 6).
        await manager.workflow.headerButton('Preview').click();
        await manager.page.waitForURL((url) => /\/preprint\/view\/\d+/.test(url.pathname), {
            waitUntil: 'commit',
            timeout: 30_000,
        });
        await expect(manager.workflow.previewNotice()).toBeVisible({timeout: 30_000});
        await expect(manager.page.getByText(`Preprint ${tag}`).first()).toBeVisible();
    });

    test('S8: View, Done and the two return buttons', async ({asUser, opsApi, appContext, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        const title = `Preprint ${tag}`;
        const {submissionId} = await seed(opsApi, tag, {published: true});
        // The author's mailbox, read before anything is pressed (A8): the
        // roster recipient's count and a title-scoped count (zero after a
        // mail-faked seed) that the catcher's cap cannot move.
        const mailTo = 'author.alex@mail.test';
        const mailBefore = await pkpMail.count({to: mailTo});
        expect(await pkpMail.count({to: mailTo, contains: title})).toBe(0);

        // Resting in Done (Rule 18): bubble "Published", "View" and "Return
        // to Workflow", no striped stage; the panel lands on "Preprint:
        // Title & Abstract" with no language line, "Status: Posted" first
        // (Rule 17's preprint-server wording; the S8 bullet's "Status:
        // Published" is returned as T-ops-2) and "Unpost" on the right
        // (Rules 5, 6, 11, 17).
        const manager = await workflowAs(asUser, appContext, 'manager.maya');
        await manager.workflow.gotoEditorial(submissionId);
        await manager.workflow.expectStage('Published');
        await manager.workflow.expectHeaderButtons(['View', 'Activity Log', 'Library', 'Return to Workflow']);
        expect(await manager.workflow.stripedLabels()).toEqual([]);
        await manager.workflow.expectPageHeading('Title & Abstract');
        await manager.workflow.expectSelected('Title & Abstract');
        await expect(manager.workflow.controlsLeft()).toBeVisible();
        await expect(manager.workflow.languageLine()).toHaveCount(0);
        await expect
            .poll(() => manager.workflow.controlsLeftItems(), {timeout: 30_000})
            .toEqual(['Status: Posted Relations']);
        await expect(manager.workflow.publishingControl('Unpost')).toBeVisible();

        // "Production" reads "Submission published." (Rule 15d).
        await manager.workflow.selectStage('Production');
        await manager.workflow.expectStatus('Submission published.');

        // Control, same state: the Author's header reads "Library" and
        // nothing else (no assistant can open the panel on a preprint
        // server, so the Author is the control).
        const author = await workflowAs(asUser, appContext, 'author.alex');
        await author.workflow.gotoAuthor(submissionId);
        await author.workflow.expectStage('Published');
        await expect(author.workflow.headerButton('Library')).toBeVisible();
        await author.workflow.expectHeaderButtons(['Library']);

        // "Return to Workflow", then "Cancel" (Rule 18a): the dialog is
        // seen (its title and verbatim body anchor the page object's
        // locator) and the bubble still reads "Published".
        await manager.workflow.returnToWorkflow({confirm: false});
        await manager.workflow.expectStage('Published');
        await expect(manager.workflow.headerButton('Return to Workflow')).toBeVisible();

        // "Return to Workflow", then "Confirm" (Rule 18a): back in
        // Production, queued, with the stage's panels and no status box;
        // "Preview" and "Return to Done" in place of "View" and "Return to
        // Workflow".
        await manager.workflow.returnToWorkflow();
        await manager.workflow.expectStage('Production');
        await expect(manager.workflow.headerButton('Preview')).toBeVisible();
        await expect(manager.workflow.headerButton('Return to Done')).toBeVisible();
        await expect(manager.workflow.headerButton('View')).toHaveCount(0);
        await expect(manager.workflow.headerButton('Return to Workflow')).toHaveCount(0);
        await manager.workflow.expectStriped('Production');
        await manager.workflow.expectStageHeading('Production');
        await expect(manager.workflow.panelTables().first()).toBeVisible();
        await expect(manager.workflow.anyStatusBox()).toHaveCount(0);

        // "Title & Abstract" after the return (Rule 17): the language line
        // is back, "Change" included, above "Status: Posted".
        await manager.workflow.selectPage('Title & Abstract');
        await expect(manager.workflow.languageLine()).toBeVisible();
        await expect(manager.workflow.languageLine()).toContainText('Current Submission Language: English');
        await expect(manager.workflow.changeLanguageLink()).toBeVisible();
        await expect
            .poll(() => manager.workflow.controlsLeftItems(), {timeout: 30_000})
            .toEqual(['Current Submission Language: English Change', 'Status: Posted Relations']);

        // Control again: the Author's header still reads "Library" alone.
        await author.workflow.gotoAuthor(submissionId);
        await author.workflow.expectStage('Production');
        await expect(author.workflow.headerButton('Library')).toBeVisible();
        await author.workflow.expectHeaderButtons(['Library']);

        // "Return to Done", then "Cancel" (Rule 18b): the bubble still
        // reads "Production".
        await manager.workflow.returnToDone({confirm: false});
        await manager.workflow.expectStage('Production');
        await expect(manager.workflow.headerButton('Return to Done')).toBeVisible();

        // "Return to Done", then "Confirm" (Rule 18b): "Published" and
        // "View" are back.
        await manager.workflow.returnToDone();
        await manager.workflow.expectStage('Published');
        await expect(manager.workflow.headerButton('View')).toBeVisible();
        await expect(manager.workflow.headerButton('Return to Workflow')).toBeVisible();
        await expect(manager.workflow.headerButton('Return to Done')).toHaveCount(0);

        // "Activity Log" (Rule 18; Side effects): the two return lines are
        // in the log, and no email reached the author's mailbox: the
        // recipient's count has not grown and nothing names the preprint.
        await manager.workflow.openActivityLog();
        await expect(manager.workflow.activityLogRow('returned this submission to the workflow.')).toBeVisible({timeout: 30_000});
        await expect(manager.workflow.activityLogRow('returned this submission to the Done stage.')).toBeVisible();
        await manager.workflow.closeActivityLog();
        expect(await pkpMail.count({to: mailTo, contains: title})).toBe(0);
        expect(await pkpMail.count({to: mailTo})).toBeLessThanOrEqual(mailBefore);

        // "Unpost" from Done (Rules 11, 18, 18b; Side effects): on "Title &
        // Abstract" press "Unpost" and confirm the dialog (U49's): the
        // preprint leaves Done by itself: bubble "Production", the entry
        // striped, "Preview" in the header and no "Return to Done".
        await manager.workflow.selectPage('Title & Abstract');
        await unpostPreprint(manager.page);
        await manager.workflow.expectStage('Production');
        await manager.workflow.expectStriped('Production');
        await manager.workflow.expectHeaderButtons(['Preview', 'Activity Log', 'Library']);
        await expect(manager.workflow.headerButton('Return to Done')).toHaveCount(0);

        // Close the panel and open the preprint again: it lands on
        // "Production" (Rule 11).
        await manager.workflow.close();
        await manager.workflow.gotoEditorial(submissionId);
        await manager.workflow.expectStageHeading('Production');
        await manager.workflow.expectSelected('Production');
        await manager.workflow.expectStage('Production');

        // Control, throughout: the Author's header after the unpost still
        // reads "Library" alone.
        await author.workflow.gotoAuthor(submissionId);
        await author.workflow.expectStage('Production');
        await author.workflow.expectHeaderButtons(['Library']);
    });

    test('S10: the single-stage preprint workflow', async ({asUser, opsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        const [queued, declined] = await Promise.all([
            seed(opsApi, `${tag}q`),
            seed(opsApi, `${tag}d`, {decisions: ['decline']}),
        ]);

        // The Moderator on a queued preprint: "Production" alone, striped;
        // "Workflow: Production" with no status box (Rules 7, 11, 15, OPS1).
        const {page, workflow} = await workflowAs(asUser, appContext, 'sectioneditor.ana');
        await workflow.gotoEditorial(queued.submissionId);
        await workflow.expectStage('Production');
        expect(await workflow.stageLabels()).toEqual(OPS_STAGES);
        expect(await workflow.stripedLabels()).toEqual(['Production']);
        await workflow.expectSelected('Production');
        await workflow.expectStageHeading('Production');
        await expect(workflow.languageLine()).toHaveText('Current Submission Language: English');
        await expect(workflow.anyStatusBox()).toHaveCount(0);

        // The "Preprint" group's version node ends with "Permissions &
        // Disclosure", "Preprint entry", never lists "Identifiers", and the
        // group has no "Create New Version" (Rules 9, 10).
        expect(await workflow.pagesUnderLatestVersion()).toEqual(EDITORIAL_PAGES);
        await expect(workflow.pageLink('Identifiers')).toHaveCount(0);
        await expect(workflow.createNewVersionLink()).toHaveCount(0);

        // "Title & Abstract" as the Moderator (Rule 17): the language line
        // with "Change", under it "Status: Unposted" and the "Relations"
        // dropdown, and no region of publishing controls on the right (the
        // left region with its three items is the positive control).
        await workflow.selectPage('Title & Abstract');
        await expect(workflow.controlsLeft()).toBeVisible();
        await expect(workflow.changeLanguageLink()).toBeVisible();
        await expect
            .poll(() => workflow.controlsLeftItems(), {timeout: 30_000})
            .toEqual(['Current Submission Language: English Change', 'Status: Unposted Relations']);
        await expect(relationsControl(page)).toBeVisible();
        await expect(workflow.controlsRight()).toHaveCount(0);

        // A declined preprint: bubble "Declined" (Rule 5); the panel lands
        // on "Preprint: Title & Abstract", not on "Production", which keeps
        // its stripe (Rule 11 as built; register OPS2 is open).
        await workflow.gotoEditorial(declined.submissionId);
        await workflow.expectStage('Declined');
        await workflow.expectPageHeading('Title & Abstract');
        await workflow.expectSelected('Title & Abstract');
        await expect(workflow.stageLink('Production')).not.toHaveClass(/bg-selection-dark/);
        expect(await workflow.stripedLabels()).toEqual(['Production']);

        // Control: select "Production" on the declined preprint — headed
        // "Workflow: Production" with the stage's own buttons, "Revert
        // Decline" among them (OPS1).
        await workflow.selectStage('Production');
        await expect(workflow.actionButton('Revert Decline')).toBeVisible();
    });

    test('S11: refused at every door', async ({asUser, opsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s11', testInfo);
        const {submissionId} = await seed(opsApi, tag);

        // The Reader at the three addresses (Rules 2a, 2b, 3): the role
        // gate's page at the dashboard address, the stage gate's page at
        // the editorial workflow address, the non-Author sentence at the
        // old author-dashboard address; no panel at any of them.
        const reader = await workflowAs(asUser, appContext, 'reader.rosa');
        await expectDeniedPage(
            reader.workflow,
            reader.workflow.editorialUrl(submissionId),
            ACCESS_DENIED.role
        );
        await expectDeniedPage(
            reader.workflow,
            reader.workflow.workflowAccessUrl(submissionId),
            NO_ACCESS_TEXT
        );
        await expectDeniedPage(
            reader.workflow,
            reader.workflow.authorDashboardUrl(submissionId),
            ACCESS_DENIED.notAuthor
        );

        // The Editorial Board Member at the dashboard address (Rule 3,
        // OPS1): the panel with only the number in its header and the
        // "Error" dialog with "OK"; behind the shell the list shows its
        // "Assigned to me" view.
        const member = await workflowAs(asUser, appContext, 'assistant.rita');
        await member.page.goto(member.workflow.editorialUrl(submissionId));
        await expectErrorShell(member.workflow, submissionId, ACCESS_DENIED.role);
        await expect(member.page).toHaveURL(/\/dashboard\/editorial/);
        await expect(member.page.getByText(/^Assigned to me \(\d+\)/)).toBeVisible();

        // Control: the Manager typing the dashboard address gets the panel
        // with the preprint's header (Rule 2c) and no "Error" dialog.
        const manager = await workflowAs(asUser, appContext, 'manager.maya');
        await manager.workflow.gotoEditorial(submissionId);
        await expect(manager.workflow.contributorsLine()).toBeVisible();
        await expect(manager.workflow.contributorsLine()).not.toHaveText('');
        await expect(manager.workflow.titleLine()).toHaveText(`Preprint ${tag}`);
        await expect(manager.workflow.errorDialog()).toHaveCount(0);
    });

    test('S14: delete a preprint and follow its stale addresses', async ({asUser, opsApi, appContext, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s14', testInfo);
        // A scratch preprint server the test alone feeds (the "Declined"
        // count is the side menu's): a throwaway Manager and Author, the
        // Author's declined preprint and their second, submitted one.
        const managerName = `${tag}mg`;
        const authorName = `${tag}au`;
        const mailTo = `${authorName}@mail.test`;
        await opsApi.createContext({
            tag,
            users: [
                user(managerName, 'Mira', 'Manager', ['manager']),
                user(authorName, 'Ada', 'Author', ['author']),
            ],
        });
        const declinedTitle = `Declined ${tag}`;
        const secondTitle = `Second ${tag}`;
        const [declined, second] = await Promise.all([
            opsApi.createSubmission({
                tag: `${tag}d`, context: tag, submitter: authorName, title: declinedTitle,
                decisions: ['decline'],
            }),
            opsApi.createSubmission({
                tag: `${tag}s`, context: tag, submitter: authorName, title: secondTitle,
            }),
        ]);
        const mailBefore = await pkpMail.count({to: mailTo});

        // The Manager's dashboard: "Declined" counts the one preprint.
        const manager = await workflowAs(asUser, appContext, managerName, tag);
        const dash = new EditorialDashboardPage(manager.page, tag);
        await dash.goto();
        await dash.expectViewCount('Declined', 1);

        // The declined preprint (Rules 5, 11, 12): bubble "Declined", the
        // panel landing on "Preprint: Title & Abstract" with "Production"
        // striped (OPS2 as the spec records it); select "Production" and
        // note the address.
        await manager.workflow.gotoEditorial(declined.submissionId);
        await manager.workflow.expectStage('Declined');
        await manager.workflow.expectPageHeading('Title & Abstract');
        await manager.workflow.expectStriped('Production');
        await manager.workflow.selectStage('Production');
        await expect
            .poll(() => manager.workflow.menuKeyFromUrl(), {timeout: 30_000})
            .toMatch(/^workflow_\d+$/);
        const staleAddress = manager.page.url();
        expect(new URL(staleAddress).searchParams.get('workflowSubmissionId')).toBe(String(declined.submissionId));

        // "Delete", then "Cancel" (Rule 19): the dialog titled "Delete"
        // with its verbatim question, "Confirm" and then "Cancel" in red;
        // "Cancel" keeps the panel and the button.
        await manager.workflow.actionButton('Delete').click();
        const dialog = manager.workflow.confirmDialog('delete');
        await expect(dialog).toBeVisible({timeout: 30_000});
        await expect(dialog.getByRole('button')).toHaveText(['Confirm', 'Cancel']);
        await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toHaveClass(/text-negative/);
        await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
        await manager.workflow.expectOpen(declined.submissionId);
        await expect(manager.workflow.actionButton('Delete')).toBeVisible();

        // "Delete", then "Confirm" (Rule 19; Side effects): the panel
        // closes, the address loses the submission part, the list is back,
        // the preprint is gone from "Declined" and the side menu's count is
        // one lower within a few seconds.
        await manager.workflow.deleteSubmission();
        expect(manager.workflow.submissionIdFromUrl()).toBeNull();
        await expect(dash.heading()).toBeVisible({timeout: 30_000});
        await dash.expectViewCount('Declined', 0);
        await dash.openView('Declined');
        await dash.expectViewHeading('Declined', 0);
        await expect(dash.emptyState()).toBeVisible({timeout: 30_000});
        await expect(dash.row(declinedTitle)).toHaveCount(0);

        // The author's mailbox (Side effects): no email has arrived (the
        // fresh recipient's count is the one taken after seeding).
        expect(await pkpMail.count({to: mailTo})).toBe(mailBefore);

        // The stale dashboard address (Rule 3): the shell with only the
        // number in its header and "Error" / "Invalid submission." with "OK".
        await manager.page.goto(staleAddress);
        await expectErrorShell(manager.workflow, declined.submissionId, ACCESS_DENIED.invalidSubmission);

        // The Author at My Submissions for the deleted preprint (Rule 3):
        // the same shell and dialog over My Submissions.
        const author = await workflowAs(asUser, appContext, authorName, tag);
        await author.page.goto(author.workflow.authorUrl(declined.submissionId));
        await expectErrorShell(author.workflow, declined.submissionId, ACCESS_DENIED.invalidSubmission);
        await expect(author.page).toHaveURL(/\/dashboard\/mySubmissions/);

        // Control: the Author's second preprint at My Submissions opens
        // with its header (Rule 2c) and no "Error" dialog.
        await author.workflow.gotoAuthor(second.submissionId);
        await expect(author.workflow.titleLine()).toHaveText(secondTitle);
        await expect(author.workflow.contributorsLine()).toBeVisible();
        await expect(author.workflow.errorDialog()).toHaveCount(0);
    });
});
