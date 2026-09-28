// @ts-check
/**
 * @file playwright/tests/U24-workflow-screen-and-stage-access.spec.js
 *
 * Workflow screen & stage access — OJS suite, one test per canonical
 * scenario the spec runs on OJS (S1, S5–S8, S11 and S14 common; S2–S4, S12
 * and S13 OJS/OMP; scenario 9 is OMP-only, 10 OPS-only).
 * Spec: docs/specs/U24-workflow-screen-and-stage-access.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 ❓,
 * A2 ❓ (S3 asserts only what Rule 9 states as built: the heading with no
 * node, pressing it changing nothing), A3 ❓ (S6 opens the draft by the
 * dashboard address only), A4 ❓, A5 🐞, A6 🐞 (S8 selects the "Review" entry
 * on a stage the submission has left, Rule 15b; S2 never selects it while
 * the round is active), A7 ❓ (S8 reads "Production" alone on the seed
 * published from the Submission stage), A8 ❓, A9 🐞 (S14 follows the stale
 * dashboard and My Submissions addresses, never an old-shape one), OMP1 ✅,
 * OMP2 ❓, OMP3 🐞, OPS1 ✅, OPS2 ❓, OPS3 🐞, OPS4 ❓ (other apps' territory).
 * The spec's Coverage section records everything else left out.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster are
 * read-only (A1, A7). Every test seeds its own submissions with unique tags
 * (M5) and drives roster accounts through `asUser`; S12 isolates on a scratch
 * journal with throwaway accounts (a two-role account cannot be arranged on
 * the roster, A7). Assignments (S3 Copyeditor, S4 Funding Coordinator, S8
 * Layout Editor, S12 Layout Editor, S13 Section Editor) are seeded as
 * `participants[]`, the row the Assign Participant form writes. The mailbox
 * reads (S8, S14) are before/after counts on the submitter's roster address
 * scoped by the seed tag, the "after" bounded by the response that would
 * have carried the mail (A8). Every refusal is read at the page or in the
 * "Error" dialog and paired with a positive control on the same page (M4,
 * M6). Waits are web-first (A5). Everything runs in the parallel `ojs`
 * project.
 */
const {test, expect} = require('../support/fixtures.js');
const {WorkflowPage, ACCESS_DENIED} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {EditorialDashboardPage} = require('../../../../shared/playwright/pages/EditorialDashboardPage.js');
const {MySubmissionsPage} = require('../../../../shared/playwright/pages/MySubmissionsPage.js');
const {PublicationScreen} = require('../pages/PublicationMetadataPages.js');
const {getEmail} = require('../../../../shared/playwright/data/users.js');

const JOURNAL = 'publicknowledge';

/** OJS stage entries in workflow order (Rule 7). */
const OJS_STAGES = ['Submission', 'Review', 'Copyediting', 'Production'];

/** The editorial roster's production-only pages (Rule 10). */
const PRODUCTION_PAGES = ['Body Text', 'Galleys', 'Media', 'Permissions & Disclosure', 'Publication Settings'];

/** The language line every open stage begins with (Rule 14). */
const LANGUAGE_LINE = 'Current Submission Language: English';

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u24${scenario}ojsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** One review round with the default reviewer accepted (scenario footnote s). */
const ONE_ROUND = [{reviewers: [{username: 'reviewer.julia', status: 'accepted'}]}];

/** Two rounds: the second entry builds Round 2 (fn-s, revision seeds for scenario 2). */
const TWO_ROUNDS = [
    {reviewers: [{username: 'reviewer.julia', status: 'accepted'}]},
    {reviewers: [{username: 'reviewer.paul', status: 'accepted'}]},
];

async function seed(ojsApi, tag, extra = {}) {
    return await ojsApi.createSubmission({
        tag,
        context: JOURNAL,
        submitter: 'author.alex',
        title: `Submission ${tag}`,
        ...extra,
    });
}

/** A submission in Review Round 1 (scenarios 2–4, 11). */
function inReview(extra = {}) {
    return {decisions: ['sendExternalReview'], reviewRounds: ONE_ROUND, ...extra};
}

/** A submission that passed through Review into Production (scenarios 8, 13). */
function inProduction(extra = {}) {
    return {decisions: ['sendExternalReview', 'accept', 'sendToProduction'], reviewRounds: ONE_ROUND, ...extra};
}

/** A page as a given user, plus the workflow page object for it. */
async function workflowAs(asUser, appContext, username, contextPath = JOURNAL) {
    const page = await (await asUser(username)).newPage();
    return {page, workflow: new WorkflowPage(page, contextPath, {appContext})};
}

/** The `currentViewId` the dashboard address carries right now, or null. */
function currentViewId(page) {
    return new URL(page.url()).searchParams.get('currentViewId');
}

/**
 * An open stage for a role whose stage set includes it (Rules 13, 14): the
 * language line first, no no-access box — the line is the positive control
 * for the box's absence.
 */
async function expectStageOpen(workflow) {
    await expect(workflow.languageLine()).toHaveText(LANGUAGE_LINE);
    await expect(workflow.noAccessBox()).toHaveCount(0);
}

test.describe('workflow screen & stage access', () => {
    test('S1: open a submission\'s workflow from the editorial dashboard', {tag: '@smoke'}, async ({asUser, ojsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const {submissionId} = await seed(ojsApi, tag);

        const {page, workflow} = await workflowAs(asUser, appContext, 'editor.diana');
        const dash = new EditorialDashboardPage(page, JOURNAL);
        await dash.goto();
        const row = await dash.findRowByTag(tag);
        await workflow.openFromRow(row, submissionId);

        // The header (Rule 4): number, underlined contributors, full title,
        // the stage bubble (Rule 5), and the buttons "Activity Log" and
        // "Library" — neither "View" nor "Preview" in Submission (Rule 6).
        await expect(workflow.contributorsLine()).toBeVisible();
        await expect(workflow.contributorsLine()).not.toHaveText('');
        await expect(workflow.titleLine()).toHaveText(`Submission ${tag}`);
        await workflow.expectStage('Submission');
        await workflow.expectHeaderButtons(['Activity Log', 'Library']);

        // The side menu (Rules 7, 9): the Workflow group with the four
        // stages in order, the first striped; the Publication group with one
        // version node whose pages start Title & Abstract, Contributors,
        // Metadata.
        await expect(workflow.workflowGroup()).toBeVisible();
        expect(await workflow.stageLabels()).toEqual(OJS_STAGES);
        expect(await workflow.stripedLabels()).toEqual(['Submission']);
        await expect(workflow.publicationGroup()).toBeVisible();
        await expect(workflow.versionNodes()).toHaveCount(1);
        expect((await workflow.pagesUnderLatestVersion()).slice(0, 3)).toEqual([
            'Title & Abstract',
            'Contributors',
            'Metadata',
        ]);

        // The main column is headed "Workflow: Submission" (Rule 11) and the
        // address records the open submission (Rule 12).
        await workflow.expectStageHeading('Submission');
        expect(workflow.submissionIdFromUrl()).toBe(String(submissionId));

        // Close: the list is back and the address forgets the panel (Rule 1).
        await workflow.close();
        await expect(dash.row(tag)).toBeVisible({timeout: 30_000});
        expect(workflow.submissionIdFromUrl()).toBeNull();
    });

    test('S2: walk the stages of a submission in review', async ({asUser, ojsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const tag2 = makeTag('s2b', testInfo);
        const {submissionId} = await seed(ojsApi, tag, inReview());
        const {submissionId: roundTwoId} = await seed(ojsApi, tag2, {
            decisions: ['sendExternalReview'],
            reviewRounds: TWO_ROUNDS,
        });

        const {workflow} = await workflowAs(asUser, appContext, 'editor.diana');
        await workflow.gotoEditorial(submissionId);

        // Lands on Review Round 1 (Rule 11), headed for the round, with the
        // round's status box (Rule 15c); the bubble reads "Review (Round 1)"
        // (Rule 5); the round and its stage are striped (Rule 8).
        await workflow.expectStageHeading('Review (Round 1)');
        await workflow.expectSelected('Review Round 1');
        await expect(workflow.statusBox('Round 1 Status')).toBeVisible();
        await workflow.expectStage('Review (Round 1)');
        expect(await workflow.stripedLabels()).toEqual(['Review', 'Review Round 1']);

        // Submission: the language line as a read-out with no "Change" link
        // (Rule 14), a stage the submission moved beyond (Rule 15b), with
        // its panels below the box.
        await workflow.selectStage('Submission');
        await expect(workflow.languageLine()).toHaveText(LANGUAGE_LINE);
        await expect(workflow.changeLanguageLink()).toHaveCount(0);
        await workflow.expectStatus('The submission is currently in the Review stage.');
        await expect(workflow.panel('Submission Files')).toBeVisible();

        // Copyediting: not yet reached (Rules 15a, 16) — the same language
        // line, no panels, only the Participants list on the right.
        await workflow.selectStage('Copyediting');
        await expect(workflow.languageLine()).toHaveText(LANGUAGE_LINE);
        await workflow.expectStatus('The Copyediting stage has not yet been initiated.');
        await expect(workflow.participantsHeading()).toBeVisible();
        await expect(workflow.panelTables()).toHaveCount(0);

        // Production: the same box naming Production, plus the stage's
        // "Schedule For Publication" button and the Participants list.
        await workflow.selectStage('Production');
        await workflow.expectStatus('The Production stage has not yet been initiated.');
        await expect(workflow.actionButton('Schedule For Publication')).toBeVisible();
        await expect(workflow.participantsHeading()).toBeVisible();
        await expect(workflow.panelTables()).toHaveCount(0);

        // Control: on the Round 1 submission "Review Round 1" alone sits
        // under "Review", and its box is headed "Round 1 Status", not
        // "Status" (Rules 8, 15c).
        expect(await workflow.roundLabels()).toEqual(['Review Round 1']);
        await workflow.selectRound(1);
        await expect(workflow.statusBox('Round 1 Status')).toBeVisible();
        await expect(workflow.statusBox('Status')).toHaveCount(0);

        // The Round 2 submission: both rounds listed in order, the panel
        // lands on Round 2, striped together with "Review", and Round 1
        // reads the advanced sentence (Rules 8, 11, 15c).
        await workflow.gotoEditorial(roundTwoId);
        await workflow.expectStageHeading('Review (Round 2)');
        expect(await workflow.roundLabels()).toEqual(['Review Round 1', 'Review Round 2']);
        await workflow.expectSelected('Review Round 2');
        expect(await workflow.stripedLabels()).toEqual(['Review', 'Review Round 2']);
        await workflow.selectRound(1);
        await expect(workflow.anyStatusBox()).toContainText(
            'The submission has been advanced to the next round of review'
        );
    });

    test('S3: a stage outside the role\'s stage set', async ({asUser, ojsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const tag2 = makeTag('s3b', testInfo);
        const {submissionId} = await seed(
            ojsApi,
            tag,
            inReview({participants: [{username: 'copyeditor.carla', role: 'copyeditor'}]})
        );
        const {submissionId: otherId} = await seed(ojsApi, tag2, inReview());

        // Control first: the Editor sees the round's panels and a version
        // node with pages (the positive control for every absence below, M4).
        const editor = await workflowAs(asUser, appContext, 'editor.diana');
        await editor.workflow.gotoEditorial(submissionId);
        await editor.workflow.expectStageHeading('Review (Round 1)');
        await expect(editor.workflow.panel('Reviewers')).toBeVisible();
        await expect(editor.workflow.versionNodes()).toHaveCount(1);
        await expect(editor.workflow.pageLink('Title & Abstract')).toBeVisible();

        // The assigned Copyeditor lands on the round (Rule 11) and gets the
        // no-access box alone (Rule 13).
        const {page, workflow} = await workflowAs(asUser, appContext, 'copyeditor.carla');
        await workflow.gotoEditorial(submissionId);
        await workflow.expectSelected('Review Round 1');
        await workflow.expectNoAccessOnly();

        // Submission: the same box.
        await workflow.select('Submission');
        await workflow.expectSelected('Submission');
        await workflow.expectNoAccessOnly();

        // Reload on "Submission": the panel reopens there, the box still the
        // whole answer, the address keeping the entry (Rule 12).
        await expect.poll(() => workflow.menuKeyFromUrl(), {timeout: 30_000}).toMatch(/^workflow_/);
        const submissionKey = workflow.menuKeyFromUrl();
        await page.reload();
        await workflow.expectOpen(submissionId);
        await workflow.expectSelected('Submission');
        await workflow.expectNoAccessOnly();
        expect(workflow.menuKeyFromUrl()).toBe(submissionKey);

        // Copyediting, the one stage in the Copyeditor's set: the language
        // line and the not-yet-reached box (Rules 14, 15a), a read-only
        // Participants list, no panels (Rule 16).
        await workflow.selectStage('Copyediting');
        await expect(workflow.languageLine()).toHaveText(LANGUAGE_LINE);
        await workflow.expectStatus('The Copyediting stage has not yet been initiated.');
        await expect(workflow.participantsHeading()).toBeVisible();
        await expect(workflow.participantsAssignButton()).toHaveCount(0);
        await expect(workflow.panelTables()).toHaveCount(0);

        // The Publication group: heading with no version node beneath, and
        // pressing the heading changes nothing (Rule 9).
        await expect(workflow.publicationGroup()).toBeVisible();
        await expect(workflow.versionNodes()).toHaveCount(0);
        const urlBefore = page.url();
        await workflow.publicationGroup().click();
        await workflow.expectStageHeading('Copyediting');
        await expect(workflow.versionNodes()).toHaveCount(0);
        expect(page.url()).toBe(urlBefore);

        // The other submission's dashboard address: the shell with only the
        // number and the "Error" dialog; behind it the list shows its
        // "Assigned to me" view (Rule 3).
        await page.goto(workflow.editorialUrl(otherId));
        await workflow.expectErrorShell(otherId, ACCESS_DENIED.role);
        await expect.poll(() => currentViewId(page), {timeout: 30_000}).toBe('assigned-to-me');
        const dash = new EditorialDashboardPage(page, JOURNAL);
        await expect(dash.contentArea().locator('h1')).toContainText('Assigned to me');

        // The other submission's older address: an access-denied page, no
        // panel (Rule 2a; Actors row 1).
        await workflow.expectAccessDeniedPage(workflow.workflowAccessUrl(otherId), ACCESS_DENIED.stage);
    });

    test('S4: the production-only pages', async ({asUser, ojsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const {submissionId} = await seed(
            ojsApi,
            tag,
            inReview({participants: [{username: 'assistant.rita', role: 'funding'}]})
        );

        // The Funding Coordinator (stage set Submission + Review) reaches the
        // Publication group but not Production: the roster stops at JATS XML
        // (Rule 10); the header offers "Library" and no "Activity Log"
        // (Actors row 7).
        const funding = await workflowAs(asUser, appContext, 'assistant.rita');
        await funding.workflow.gotoEditorial(submissionId);
        await funding.workflow.expectStageHeading('Review (Round 1)');
        expect(await funding.workflow.pagesUnderLatestVersion()).toEqual([
            'Title & Abstract',
            'Contributors',
            'Metadata',
            'References',
            'Funding',
            'JATS XML',
        ]);
        await expect(funding.workflow.createNewVersionLink()).toHaveCount(0);
        await funding.workflow.expectHeaderButtons(['Library']);

        // "Title & Abstract": the language line without "Change", "Status:
        // Unscheduled" under it, no publishing controls (Rules 9, 17).
        await funding.workflow.selectPage('Title & Abstract');
        await expect(funding.workflow.languageLine()).toHaveText(LANGUAGE_LINE);
        await expect(funding.workflow.changeLanguageLink()).toHaveCount(0);
        await funding.workflow.expectPublicationStatus('Unscheduled');
        await expect(funding.workflow.controlsRight()).toHaveCount(0);

        // Control: the Journal Manager sees those pages and the five
        // production-only ones, then "Create New Version" after the node;
        // on "Title & Abstract" the line carries "Change" and the right
        // region offers "Schedule For Publication" without "Preview".
        const manager = await workflowAs(asUser, appContext, 'manager.maya');
        await manager.workflow.gotoEditorial(submissionId);
        expect(await manager.workflow.pagesUnderLatestVersion()).toEqual([
            'Title & Abstract',
            'Contributors',
            'Metadata',
            'References',
            'Funding',
            'JATS XML',
            ...PRODUCTION_PAGES,
        ]);
        await expect(manager.workflow.createNewVersionLink()).toBeVisible();
        await manager.workflow.selectPage('Title & Abstract');
        await expect(manager.workflow.changeLanguageLink()).toBeVisible();
        await expect(manager.workflow.publishingControl('Schedule For Publication')).toBeVisible();
        await expect(manager.workflow.publishingControl('Preview')).toHaveCount(0);
    });

    test('S5: deep link and reload', async ({asUser, ojsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const {submissionId} = await seed(ojsApi, tag);

        const {page, workflow} = await workflowAs(asUser, appContext, 'editor.diana');
        await workflow.gotoEditorial(submissionId);
        await workflow.selectPage('Contributors');

        // The address names the submission and the selected entry (Rule 12).
        await expect
            .poll(() => workflow.menuKeyFromUrl(), {timeout: 30_000})
            .toMatch(/^publication_\d+_contributors$/);
        const deepLink = page.url();

        // The same address in a new tab opens straight on the page.
        const tab = await page.context().newPage();
        const tabWorkflow = new WorkflowPage(tab, JOURNAL, {appContext});
        await tab.goto(deepLink);
        await tabWorkflow.expectOpen(submissionId);
        await tabWorkflow.expectPageHeading('Contributors');
        await tabWorkflow.expectSelected('Contributors');
        await tab.close();

        // Reload: the same.
        await page.reload();
        await workflow.expectOpen(submissionId);
        await workflow.expectPageHeading('Contributors');

        // An entry that does not exist: `nonsense` as the entry opens the
        // panel at its landing entry, "Workflow: Submission", and the
        // address is rewritten to that entry (Rules 11, 12).
        await page.goto(workflow.editorialUrl(submissionId, 'nonsense'));
        await workflow.expectOpen(submissionId);
        await workflow.expectStageHeading('Submission');
        await workflow.expectSelected('Submission');
        await expect.poll(() => workflow.menuKeyFromUrl(), {timeout: 30_000}).toMatch(/^workflow_\d+$/);

        // Close: both parts leave the address and the list is back.
        await workflow.close();
        expect(workflow.submissionIdFromUrl()).toBeNull();
        expect(workflow.menuKeyFromUrl()).toBeNull();
        const dash = new EditorialDashboardPage(page, JOURNAL);
        await expect(dash.heading()).toBeVisible({timeout: 30_000});
    });

    test('S6: typed addresses forward', async ({asUser, ojsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const draftTag = makeTag('s6d', testInfo);
        const {submissionId} = await seed(ojsApi, tag);
        const {submissionId: draftId} = await seed(ojsApi, draftTag, {submitted: false});

        // The Editor's `workflow/access` address forwards to the editorial
        // dashboard, "Assigned to me", with the panel open (Rule 2a).
        const editor = await workflowAs(asUser, appContext, 'editor.diana');
        await editor.workflow.gotoForwarding(editor.workflow.workflowAccessUrl(submissionId), submissionId);
        await expect(editor.page).toHaveURL(/\/dashboard\/editorial/);
        await editor.workflow.expectStageHeading('Submission');
        await expect.poll(() => currentViewId(editor.page), {timeout: 30_000}).toBe('assigned-to-me');
        expect(editor.workflow.submissionIdFromUrl()).toBe(String(submissionId));

        // The dashboard address for a draft: the panel opens, its bubble
        // reading "Incomplete" (Rules 2c, 5).
        await editor.workflow.gotoEditorial(draftId);
        await editor.workflow.expectStage('Incomplete');

        // The Author's old author-dashboard address forwards to My
        // Submissions with the panel open (Rule 2b).
        const author = await workflowAs(asUser, appContext, 'author.alex');
        await author.workflow.gotoForwarding(author.workflow.authorDashboardUrl(submissionId), submissionId);
        await expect(author.page).toHaveURL(/\/dashboard\/mySubmissions/);
        await author.workflow.expectStageHeading('Submission');

        // The Author at the editorial addresses: turned away at the page by
        // the stage gate on `workflow/access`, by the role gate on the
        // dashboard address (Rules 2a, 3).
        await author.workflow.expectAccessDeniedPage(
            author.workflow.workflowAccessUrl(submissionId),
            ACCESS_DENIED.stage
        );
        await author.workflow.expectAccessDeniedPage(
            author.workflow.editorialUrl(submissionId),
            ACCESS_DENIED.role
        );

        // A stranger Author at the old author-dashboard address (Rule 2b).
        const stranger = await workflowAs(asUser, appContext, 'author.bea');
        await stranger.workflow.expectAccessDeniedPage(
            stranger.workflow.authorDashboardUrl(submissionId),
            ACCESS_DENIED.stage
        );

        // Control: the Editor on the author-dashboard address (Rule 2b).
        await editor.workflow.expectAccessDeniedPage(
            editor.workflow.authorDashboardUrl(submissionId),
            ACCESS_DENIED.notAuthor
        );
    });

    test('S7: the author\'s view', {tag: '@smoke'}, async ({asUser, ojsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const otherTag = makeTag('s7b', testInfo);
        const {submissionId, publicationId} = await seed(ojsApi, tag, {
            decisions: ['sendExternalReview', 'accept'],
            reviewRounds: ONE_ROUND,
        });
        const {submissionId: otherId} = await seed(ojsApi, otherTag, {submitter: 'author.bea'});

        const {page, workflow} = await workflowAs(asUser, appContext, 'author.alex');
        const mySub = new MySubmissionsPage(page, JOURNAL);
        await mySub.goto();
        const row = await mySub.findRowByTag(tag);
        await workflow.openFromRow(row, submissionId);

        // The header offers "Library" and nothing else; the bubble reads
        // "Copyediting" (Rules 5, 6).
        await workflow.expectHeaderButtons(['Library']);
        await workflow.expectStage('Copyediting');

        // The Workflow group lists every stage (Rule 7); each opens with the
        // language line, none with the no-access box, none with a
        // Participants column (Rules 13, 14, 16).
        expect(await workflow.stageLabels()).toEqual(OJS_STAGES);
        for (const stage of ['Submission', 'Copyediting', 'Production']) {
            await workflow.selectStage(stage);
            await expectStageOpen(workflow);
            await expect(workflow.secondaryColumn()).toHaveCount(0);
        }
        await workflow.selectRound(1);
        await expectStageOpen(workflow);
        await expect(workflow.secondaryColumn()).toHaveCount(0);

        // The version node lists the author's roster and nothing
        // production-only (Rule 10); no "Create New Version" (Rule 9).
        expect(await workflow.pagesUnderLatestVersion()).toEqual([
            'Title & Abstract',
            'Contributors',
            'Metadata',
            'References',
            'Funding',
            'Galleys',
            'Media',
        ]);
        await expect(workflow.createNewVersionLink()).toHaveCount(0);

        // "Title & Abstract": no language line; the region's first item is
        // "Status: Unscheduled"; no publishing controls (Rule 17).
        await workflow.selectPage('Title & Abstract');
        await workflow.expectPublicationStatus('Unscheduled');
        await expect(workflow.languageLine()).toHaveCount(0);
        expect((await workflow.controlsLeftItems())[0]).toMatch(/^Status: Unscheduled/);
        await expect(workflow.controlsRight()).toHaveCount(0);

        // Control: the Editor on the same submission has "Activity Log" and
        // "Preview" in the header and "Permissions & Disclosure" in the
        // list (Rules 6, 10); its address names that entry once selected.
        const editor = await workflowAs(asUser, appContext, 'editor.diana');
        await editor.workflow.gotoEditorial(submissionId);
        await expect(editor.workflow.headerButton('Activity Log')).toBeVisible();
        await expect(editor.workflow.headerButton('Preview')).toBeVisible();
        await editor.workflow.selectPage('Permissions & Disclosure');
        const licenseKey = `publication_${publicationId}_license`;
        await expect.poll(() => editor.workflow.menuKeyFromUrl(), {timeout: 30_000}).toBe(licenseKey);

        // An entry copied from the Editor's address: the Author's panel
        // opens at its landing entry, "Workflow: Copyediting", and the
        // address is rewritten (Rules 11, 12).
        await page.goto(workflow.authorUrl(submissionId, licenseKey));
        await workflow.expectOpen(submissionId);
        await workflow.expectStageHeading('Copyediting');
        await expect.poll(() => workflow.menuKeyFromUrl(), {timeout: 30_000}).toMatch(/^workflow_\d+$/);

        // The other Author's submission at the My Submissions address: the
        // shell and the "Error" dialog over My Submissions (Rule 3).
        await page.goto(workflow.authorUrl(otherId));
        await workflow.expectErrorShell(otherId, ACCESS_DENIED.role);
        await expect(page).toHaveURL(/\/dashboard\/mySubmissions/);

        // Control, continued: pressing "Preview" opens the submission's
        // public page in the same tab, carrying the preview notice (Rule 6).
        await editor.workflow.headerButton('Preview').click();
        await expect(editor.workflow.previewNotice()).toBeVisible({timeout: 30_000});
        await expect(editor.page).not.toHaveURL(/\/dashboard\//);
    });

    test('S8: View, Done and the two return buttons', async ({asUser, ojsApi, appContext, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s8', testInfo);
        const directTag = makeTag('s8d', testInfo);
        const scheduledTag = makeTag('s8s', testInfo);
        const {submissionId} = await seed(ojsApi, tag, inProduction({
            published: true,
            issue: {volume: 1, number: 2, year: 2014},
            participants: [{username: 'layouteditor.leo', role: 'layoutEditor'}],
        }));
        const {submissionId: directId} = await seed(ojsApi, directTag, {
            published: true,
            issue: {volume: 1, number: 2, year: 2014},
        });
        const {submissionId: scheduledId} = await seed(ojsApi, scheduledTag, inProduction({
            published: true,
            issue: {volume: 2, number: 1, year: 2015},
        }));
        const authorMailbox = {to: getEmail('author.alex'), contains: tag};
        const mailBefore = await pkpMail.count(authorMailbox);

        // Resting in Done (Rule 18): bubble "Published", "View" and "Return
        // to Workflow", no striped stage, the landing on "Title & Abstract"
        // with no language line, "Status: Published" first and "Unpublish"
        // on the right (Rules 5, 6, 11, 17).
        const manager = await workflowAs(asUser, appContext, 'manager.maya');
        await manager.workflow.gotoEditorial(submissionId);
        await manager.workflow.expectStage('Published');
        await manager.workflow.expectHeaderButtons(['View', 'Activity Log', 'Library', 'Return to Workflow']);
        expect(await manager.workflow.stripedLabels()).toEqual([]);
        await manager.workflow.expectPageHeading('Title & Abstract');
        await manager.workflow.expectPublicationStatus('Published');
        await expect(manager.workflow.languageLine()).toHaveCount(0);
        expect((await manager.workflow.controlsLeftItems())[0]).toMatch(/^Status: Published/);
        await expect(manager.workflow.publishingControl('Unpublish')).toBeVisible();

        // "Production": "Submission published." (Rule 15d).
        await manager.workflow.selectStage('Production');
        await manager.workflow.expectStatus('Submission published.');

        // The review entries on a stage the submission has left (Rules 8,
        // 15b): the round's box is headed "Status" and names Production;
        // the "Review" entry itself reads the advanced-and-accepted sentence.
        await manager.workflow.selectRound(1);
        await manager.workflow.expectStatus('The submission is currently in the Production stage.');
        await expect(manager.workflow.statusBox('Round 1 Status')).toHaveCount(0);
        await manager.workflow.select('Review', 'Workflow: Review');
        await manager.workflow.expectStatus(
            'The submission advanced to the next review round, was accepted, and is currently in the Production stage.'
        );

        // Control, same state: the assigned Layout Editor sees "View", the
        // version node with the production-only pages, and neither return
        // button (Rules 9, 10, 18).
        const layout = await workflowAs(asUser, appContext, 'layouteditor.leo');
        await layout.workflow.gotoEditorial(submissionId);
        await layout.workflow.expectHeaderButtons(['View', 'Library']);
        await expect(layout.workflow.versionNodes()).toHaveCount(1);
        expect(await layout.workflow.pagesUnderLatestVersion()).toEqual(
            expect.arrayContaining(['Title & Abstract', ...PRODUCTION_PAGES])
        );

        // "Return to Workflow", then "Cancel": the bubble still reads
        // "Published" and the button stays (Rule 18a).
        await manager.workflow.returnToWorkflow({confirm: false});
        await manager.workflow.expectStage('Published');
        await expect(manager.workflow.headerButton('Return to Workflow')).toBeVisible();

        // "Return to Workflow", then "Confirm" (Rule 18a): back in
        // Production, queued, with the panels and no status box; "Preview"
        // and "Return to Done" in place of "View" and "Return to Workflow".
        await manager.workflow.returnToWorkflow();
        await manager.workflow.expectStage('Production');
        await manager.workflow.expectHeaderButtons(['Preview', 'Activity Log', 'Library', 'Return to Done']);
        await manager.workflow.expectStriped('Production');
        await manager.workflow.selectStage('Production');
        await expect(manager.workflow.panelTables().first()).toBeVisible();
        await expect(manager.workflow.anyStatusBox()).toHaveCount(0);

        // Control again: the Layout Editor now sees "Preview", still no
        // return buttons.
        await layout.workflow.gotoEditorial(submissionId);
        await layout.workflow.expectHeaderButtons(['Preview', 'Library']);

        // "Title & Abstract" after the return: the language line is back,
        // "Change" included, above "Status: Published" (Rule 17).
        await manager.workflow.selectPage('Title & Abstract');
        await expect(manager.workflow.languageLine()).toContainText(LANGUAGE_LINE);
        await expect(manager.workflow.changeLanguageLink()).toBeVisible();
        await manager.workflow.expectPublicationStatus('Published');

        // "Return to Done", then "Cancel": the bubble still reads
        // "Production" (Rule 18b).
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

        // "Activity Log": both return lines are there (Rule 18), and no
        // email reached the author's mailbox — the count scoped to the
        // author's address and this seed's tag is what it was before the
        // returns, read after both dialogs' responses (Side effects, A8).
        const log = await manager.workflow.openActivityLog();
        await expect(log.getByRole('row').filter({hasText: 'returned this submission to the workflow.'}).first()).toBeVisible();
        await expect(log.getByRole('row').filter({hasText: 'returned this submission to the Done stage.'}).first()).toBeVisible();
        await manager.workflow.closeActivityLog();
        expect(await pkpMail.count(authorMailbox)).toBe(mailBefore);

        // "Unpublish" from Done: the submission leaves Done by itself — the
        // bubble reads "Production", the entry is striped, the header offers
        // "Preview" and no "Return to Done"; reopened, the panel lands on
        // "Production" (Rules 11, 18, 18b).
        await manager.workflow.selectPage('Title & Abstract');
        const pub = new PublicationScreen(manager.page, JOURNAL);
        await pub.unpublish();
        await manager.workflow.expectStage('Production');
        await manager.workflow.expectStriped('Production');
        await expect(manager.workflow.headerButton('Preview')).toBeVisible();
        await expect(manager.workflow.headerButton('Return to Done')).toHaveCount(0);
        await expect(manager.workflow.headerButton('View')).toHaveCount(0);
        await manager.workflow.close();
        await manager.workflow.gotoEditorial(submissionId);
        await manager.workflow.expectStageHeading('Production');
        await manager.workflow.expectSelected('Production');

        // The submission published from the Submission stage: "Return to
        // Workflow" / "Confirm" puts it back in "Submission" with neither
        // "View" nor "Preview" but "Return to Done", and "Production" not
        // yet initiated (Rules 6, 18a).
        await manager.workflow.gotoEditorial(directId);
        await manager.workflow.expectStage('Published');
        await manager.workflow.returnToWorkflow();
        await manager.workflow.expectStage('Submission');
        await manager.workflow.expectHeaderButtons(['Activity Log', 'Library', 'Return to Done']);
        await manager.workflow.selectStage('Production');
        await manager.workflow.expectStatus('The Production stage has not yet been initiated.');

        // The scheduled submission: bubble "Scheduled", "Preview" in the
        // header, landing on "Title & Abstract" with "Production" striped
        // (Rules 5, 6, 11).
        await manager.workflow.gotoEditorial(scheduledId);
        await manager.workflow.expectStage('Scheduled');
        await expect(manager.workflow.headerButton('Preview')).toBeVisible();
        await expect(manager.workflow.headerButton('View')).toHaveCount(0);
        await manager.workflow.expectPageHeading('Title & Abstract');
        await manager.workflow.expectStriped('Production');
    });

    test('S11: refused at every door', async ({asUser, ojsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s11', testInfo);
        const {submissionId} = await seed(ojsApi, tag, inReview());

        // The Reviewer (the submission's own, accepted) at the three doors:
        // the role gate at the dashboard address, the stage gate at
        // `workflow/access`, the privileges text at the author-dashboard
        // address (Rules 2a, 2b, 3).
        for (const username of ['reviewer.julia', 'reader.rosa']) {
            const {workflow} = await workflowAs(asUser, appContext, username);
            await workflow.expectAccessDeniedPage(workflow.editorialUrl(submissionId), ACCESS_DENIED.role);
            await workflow.expectAccessDeniedPage(workflow.workflowAccessUrl(submissionId), ACCESS_DENIED.stage);
            await workflow.expectAccessDeniedPage(workflow.authorDashboardUrl(submissionId), ACCESS_DENIED.notAuthor);
        }

        // Control: an Editor typing the dashboard address gets the panel
        // with the submission's header (Rule 2c).
        const editor = await workflowAs(asUser, appContext, 'editor.diana');
        await editor.workflow.gotoEditorial(submissionId);
        await expect(editor.workflow.titleLine()).toHaveText(`Submission ${tag}`);
        await expect(editor.workflow.contributorsLine()).toBeVisible();
    });

    test('S12: a manager assigned in another role', async ({asUser, ojsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s12', testInfo);
        const twoRole = `${tag}ml`;
        const author = `${tag}au`;
        const reviewer = `${tag}rv`;
        await ojsApi.createContext({
            tag,
            users: [
                {username: twoRole, roles: ['manager', 'layoutEditor']},
                {username: author, roles: ['author']},
                {username: reviewer, roles: ['externalReviewer']},
            ],
        });
        const round = [{reviewers: [{username: reviewer, status: 'accepted'}]}];
        const seedOn = (subTag, extra = {}) =>
            ojsApi.createSubmission({
                tag: subTag,
                context: tag,
                submitter: author,
                title: `Submission ${subTag}`,
                decisions: ['sendExternalReview'],
                reviewRounds: round,
                ...extra,
            });
        const {submissionId} = await seedOn(`${tag}a`, {
            participants: [{username: twoRole, role: 'layoutEditor'}],
        });
        const {submissionId: otherId} = await seedOn(`${tag}b`);

        // Assigned as Layout Editor, the account is held to that role's
        // stage set (Actors row 2): the landing round shows the no-access
        // box alone, as do "Submission" and "Copyediting" (Rules 11, 13).
        const {workflow} = await workflowAs(asUser, appContext, twoRole, tag);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectSelected('Review Round 1');
        await workflow.expectNoAccessOnly();
        await workflow.select('Submission');
        await workflow.expectSelected('Submission');
        await workflow.expectNoAccessOnly();
        await workflow.select('Copyediting');
        await workflow.expectSelected('Copyediting');
        await workflow.expectNoAccessOnly();

        // "Production": the language line, the not-yet-reached box, the
        // "Schedule For Publication" button and the Participants list
        // (Rules 14, 15a, 16).
        await workflow.selectStage('Production');
        await expect(workflow.languageLine()).toHaveText(LANGUAGE_LINE);
        await workflow.expectStatus('The Production stage has not yet been initiated.');
        await expect(workflow.actionButton('Schedule For Publication')).toBeVisible();
        await expect(workflow.participantsHeading()).toBeVisible();

        // The header: "Library" and no "Activity Log" (Actors row 7).
        await workflow.expectHeaderButtons(['Library']);

        // Control: the same account on the second submission, where it is a
        // plain manager, opens every stage without the box and gets
        // "Activity Log" (Actors rows 2, 7).
        await workflow.gotoEditorial(otherId);
        await workflow.selectStage('Submission');
        await expectStageOpen(workflow);
        await workflow.selectRound(1);
        await expectStageOpen(workflow);
        await workflow.selectStage('Copyediting');
        await expectStageOpen(workflow);
        await workflow.selectStage('Production');
        await expectStageOpen(workflow);
        await expect(workflow.headerButton('Activity Log')).toBeVisible();
    });

    test('S13: an assigned Section Editor\'s header and publication controls', async ({asUser, ojsApi, appContext}, testInfo) => {
        test.slow();
        const tag = makeTag('s13', testInfo);
        const {submissionId} = await seed(
            ojsApi,
            tag,
            inProduction({participants: [{username: 'sectioneditor.ana', role: 'sectionEditor'}]})
        );

        // The header: "Preview", "Activity Log" and "Library" (Rule 6;
        // Actors row 7).
        const se = await workflowAs(asUser, appContext, 'sectioneditor.ana');
        await se.workflow.gotoEditorial(submissionId);
        await se.workflow.expectHeaderButtons(['Preview', 'Activity Log', 'Library']);

        // The stages: every one opens with the language line and none shows
        // the no-access box (Actors row 2; Rules 13, 14).
        await se.workflow.selectStage('Submission');
        await expectStageOpen(se.workflow);
        await se.workflow.selectRound(1);
        await expectStageOpen(se.workflow);
        await se.workflow.selectStage('Copyediting');
        await expectStageOpen(se.workflow);
        await se.workflow.selectStage('Production');
        await expectStageOpen(se.workflow);

        // "Title & Abstract": the language line with "Change", "Status:
        // Unscheduled", no publishing controls; no "Create New Version"
        // (Rules 9, 17).
        await se.workflow.selectPage('Title & Abstract');
        await expect(se.workflow.languageLine()).toContainText(LANGUAGE_LINE);
        await expect(se.workflow.changeLanguageLink()).toBeVisible();
        await se.workflow.expectPublicationStatus('Unscheduled');
        await expect(se.workflow.controlsRight()).toHaveCount(0);
        await expect(se.workflow.createNewVersionLink()).toHaveCount(0);

        // Control: the Journal Manager gets "Create New Version" and, on
        // "Title & Abstract", the right-hand region with "Preview" and
        // "Schedule For Publication" (Rules 9, 17).
        const manager = await workflowAs(asUser, appContext, 'manager.maya');
        await manager.workflow.gotoEditorial(submissionId);
        await expect(manager.workflow.createNewVersionLink()).toBeVisible();
        await manager.workflow.selectPage('Title & Abstract');
        await expect(manager.workflow.publishingControl('Preview')).toBeVisible();
        await expect(manager.workflow.publishingControl('Schedule For Publication')).toBeVisible();
    });

    test('S14: delete a submission and follow its stale addresses', async ({asUser, ojsApi, appContext, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s14', testInfo);
        const secondTag = makeTag('s14b', testInfo);
        // A scratch journal: the side menu's "Declined" count read below is
        // journal-wide, and on the seeded journal other workers decline
        // submissions of their own meanwhile (ci-triage, 2026-09-15).
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        await ojsApi.createContext({
            tag,
            users: [
                {username: manager, roles: ['manager']},
                {username: author, roles: ['author']},
            ],
        });
        const seedOn = (subTag, extra = {}) =>
            ojsApi.createSubmission({
                tag: subTag,
                context: tag,
                submitter: author,
                title: `Submission ${subTag}`,
                ...extra,
            });
        const {submissionId} = await seedOn(tag, {decisions: ['decline']});
        const {submissionId: secondId} = await seedOn(secondTag);
        const authorMailbox = {to: `${author}@mail.test`, contains: tag};
        const mailBefore = await pkpMail.count(authorMailbox);

        // The declined submission: bubble "Declined", landing on
        // "Submission", striped (Rules 5, 11, 12); the address is noted.
        const {page, workflow} = await workflowAs(asUser, appContext, manager, tag);
        const dash = new EditorialDashboardPage(page, tag);
        await workflow.gotoEditorial(submissionId);
        await workflow.expectStage('Declined');
        await workflow.expectStageHeading('Submission');
        await workflow.expectSelected('Submission');
        await workflow.expectStriped('Submission');
        await expect.poll(() => workflow.menuKeyFromUrl(), {timeout: 30_000}).toMatch(/^workflow_/);
        const staleAddress = page.url();
        // The Manager's side menu: "Declined" counts the one submission.
        await dash.expectViewCount('Declined', 1);

        // "Delete", then "Cancel": the panel and the button stay (Rule 19).
        await workflow.deleteSubmission({confirm: false});
        await workflow.expectOpen(submissionId);
        await expect(workflow.actionButton('Delete')).toBeVisible();
        expect(page.url()).toBe(staleAddress);

        // "Delete", then "Confirm": the panel closes, the address loses the
        // submission part, the list is back refreshed, the submission gone
        // from "Declined", and the side menu's "Declined" count one lower
        // (Rule 19; Side effects).
        const reloaded = dash.listReload();
        await workflow.deleteSubmission();
        await reloaded;
        expect(workflow.submissionIdFromUrl()).toBeNull();
        await expect(dash.heading()).toBeVisible({timeout: 30_000});
        await dash.openView('Declined');
        await dash.searchFor(tag);
        await expect(dash.emptyState()).toBeVisible({timeout: 30_000});
        await expect(dash.row(tag)).toHaveCount(0);
        await dash.expectViewCount('Declined', 0);

        // The author's mailbox: nothing arrived — the count scoped to the
        // author's address and this seed's tag is unchanged, read after the
        // delete's response and the list's reload (Side effects, A8).
        expect(await pkpMail.count(authorMailbox)).toBe(mailBefore);

        // The stale dashboard address: the shell and "Error" / "Invalid
        // submission." (Rule 3).
        await page.goto(staleAddress);
        await workflow.expectErrorShell(submissionId, ACCESS_DENIED.invalidSubmission);

        // The Author at My Submissions: the same shell and dialog over My
        // Submissions (Rule 3).
        const authorView = await workflowAs(asUser, appContext, author, tag);
        await authorView.page.goto(authorView.workflow.authorUrl(submissionId));
        await authorView.workflow.expectErrorShell(submissionId, ACCESS_DENIED.invalidSubmission);
        await expect(authorView.page).toHaveURL(/\/dashboard\/mySubmissions/);

        // Control: the Author's second submission opens with its header
        // (Rule 2c).
        await authorView.workflow.gotoAuthor(secondId);
        await expect(authorView.workflow.titleLine()).toHaveText(`Submission ${secondTag}`);
        await expect(authorView.workflow.errorDialog()).toHaveCount(0);
    });
});
