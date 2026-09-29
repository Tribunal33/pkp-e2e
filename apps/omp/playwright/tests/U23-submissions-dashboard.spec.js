// @ts-check
/**
 * @file playwright/tests/U23-submissions-dashboard.spec.js
 *
 * U23 — Submissions dashboard (editorial), OMP suite (spec:
 * docs/specs/U23-submissions-dashboard.md). One test per canonical scenario
 * a press runs, in OMP vocabulary (press, monograph, series, Press Manager,
 * Series Editor — glossary substitution): common scenarios 1–12, 16 and 17
 * plus the OMP-specific scenario 14 (one review view over the two review
 * stages). Scenario 13 is OJS-only (issues), scenario 15 OPS-only. What the
 * scenarios leave out is the spec's Coverage section.
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as contract, a ❓ is parked, not a gap):
 * - A1 ❓, A2 ❓, A3 ❓, A7 ❓, A8 ❓, OMP1 ❓.
 * - A4 🐞, A5 🐞, A6 🐞.
 *
 * Seeding: scenario endpoints only; publicknowledge and the seeded roster
 * are read-only (S6 and S16 ride publicknowledge, S6 with its own tagged
 * monograph). Every other test isolates on a scratch press with throwaway
 * users, since view counts and sidebar badges need a list only the test
 * controls (S17 on two presses, one per end of the press's "Reviews
 * required" setting, seeded through the context's `review` passthrough
 * key). Mailpit reads (S3, S12) are scoped by the throwaway addresses
 * (PRINCIPLES A8) and settled by the scenario's own list read. The decline
 * of S11 and the review confirmation of S17 are driven on screen (the
 * Submission stage's "Decline Submission" wizard, the "Review Details"
 * window) because the scenarios read the list's live counts after them;
 * the count reload after a delete inside the panel runs through the app's
 * own five-second throttle and is read by an auto-waited expect, never a
 * reload. Waits are event-based (auto-wait on rows, headings, badges, the
 * workflow panel and the list's own reload) — no hard-coded sleeps.
 * Everything runs in the parallel `omp` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {EditorialDashboardPage} = require('../../../../shared/playwright/pages/EditorialDashboardPage.js');
const {MySubmissionsPage} = require('../../../../shared/playwright/pages/MySubmissionsPage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');
const {topModal, walkDecisionWizard} = require('../pages/ReviewStagePages.js');
const {reviewDetailsModal, markReviewComplete} = require('../pages/ReviewerAssignmentPages.js');
const {waitForEditorReady, editorIdOf} = require('../../../../shared/playwright/support/richtext.js');

const PK = 'publicknowledge';
const ACCESS_DENIED = 'The current role does not have access to this operation.';
const DAYS_FILTER = 'Days since last activity';
const EDITOR_FILTER = 'Assigned To Editor';
const BULK_DELETE_CONFIRM =
    'Are you sure you want to delete the selected items? This action cannot be undone. Please confirm to proceed.';
const AWAITING = /Awaiting Response from the reviewer/;
const ATTENTION = /\bbg-attention\b/;

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u23${scenario}omw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway user spec for the context scenario. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/** The press's editorial views for a Press Manager, in spec Rule 2 order. */
const MANAGER_VIEWS = [
    'Assigned to me',
    'Active submissions',
    'Needs editor',
    'All in submission stage',
    'Needs reviews',
    'Awaiting reviews',
    'Reviews submitted',
    'Reviews overdue',
    'Author revisions submitted',
    'All in review stage',
    'All in copyediting stage',
    'All in production stage',
    'Scheduled for publication',
    'Published',
    'Declined',
];

/** A Series Editor's roster: the manager's minus "Needs editor"/"Declined". */
const SUB_EDITOR_VIEWS = MANAGER_VIEWS.filter(
    (name) => name !== 'Needs editor' && name !== 'Declined'
);

/** The six column headings of the editorial table (Rule 5). */
const COLUMNS = ['ID', 'Submissions', 'Stage', 'Days', 'Editorial Activity', 'Actions'];

/** Apply the Days filter at 30 through the panel (fresh rows drop out). */
async function applyDaysFilter(dash, days = 30) {
    await dash.openFilters();
    await dash.setDaysSinceLastActivity(days);
    await dash.applyFilters();
}

/**
 * Accept a review request as the signed-in reviewer and stop on step 2,
 * leaving the review under way and not submitted (the reviewer's own
 * wizard, U28); `completeReview` picks it up from there later.
 */
async function acceptReviewRequest(page, contextPath, submissionId) {
    await page.goto(`/index.php/${contextPath}/en/reviewer/submission/${submissionId}`);
    const acceptButton = page
        .getByRole('button', {name: /Accept Review, Continue to Step #2/})
        .filter({visible: true});
    await expect(acceptButton).toBeVisible({timeout: 30_000});
    const consent = page.locator('input[type="checkbox"][name="privacyConsent"]').filter({visible: true});
    if (await consent.count()) {
        await consent.check();
    }
    await acceptButton.click();
    await expect(
        page.getByRole('button', {name: 'Continue to Step #3'}).filter({visible: true})
    ).toBeVisible({timeout: 30_000});
}

/**
 * Submit a review the signed-in reviewer accepted on screen earlier: a
 * fresh load of the reviewer's wizard then lands on step 2 ("Guidelines",
 * "Continue to Step #3"), a landing U27's `completeReview` does not handle
 * (it expects the invited request or a seeded accept on step 1). Step 3's
 * "For author and editor" comment is filled and the review submitted and
 * confirmed, as `completeReview` does.
 */
async function submitAcceptedReview(page, contextPath, submissionId, comment) {
    await page.goto(`/index.php/${contextPath}/en/reviewer/submission/${submissionId}`);
    const toStep3 = page.getByRole('button', {name: 'Continue to Step #3'}).filter({visible: true});
    await expect(toStep3).toBeVisible({timeout: 30_000});
    await toStep3.click();
    const commentsFrame = page.locator('iframe[id^="comments-"]').first();
    const commentsBody = commentsFrame.contentFrame().locator('body');
    await expect(commentsBody).toBeVisible({timeout: 30_000});
    // Type only once the editor is `initialized`: earlier text is wiped by
    // its late content style sheets (shared/playwright/support/richtext.js).
    await waitForEditorReady(page, await editorIdOf(commentsFrame));
    // Click in and blur after so TinyMCE syncs its backing textarea.
    await commentsBody.click();
    await commentsBody.fill(comment);
    await expect(commentsBody).toContainText(comment);
    await page.getByRole('heading', {name: /^Review:/}).first().click();
    await page.getByRole('button', {name: 'Submit Review'}).click();
    await expect(page.getByText('Are you sure you want to submit this review?')).toBeVisible({
        timeout: 30_000,
    });
    await page.getByRole('button', {name: 'OK'}).click();
    await expect(page.getByText('Review Submitted')).toBeVisible({timeout: 30_000});
}

/**
 * Close the "Review Details: {title}" window through its footer "Cancel"
 * (the same window the workflow's Reviewers panel opens, U27).
 */
async function closeReviewDetails(details) {
    await details.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(details).toBeHidden({timeout: 30_000});
}

test.describe('Submissions dashboard — editorial (U23)', () => {
    test.beforeEach(async ({}, testInfo) => testInfo.setTimeout(300_000));

    test('S1: land and walk the views', {tag: '@smoke'}, async ({page, ompApi}, testInfo) => {
        const tag = makeTag('s1', testInfo);
        const mg = `${tag}mg`;
        await ompApi.createContext({
            tag,
            users: [
                user(mg, 'Mira', 'Manager', ['manager']),
                user(`${tag}au`, 'Ada', 'Author', ['author']),
            ],
        });
        // One submitted monograph nobody is assigned to (it populates the
        // active/needs-editor/submission-stage views), one in copyediting,
        // one in production and one published (fn-s1).
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `walk${tag}`,
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `copy${tag}`,
            decisions: ['skipExternalReview'],
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `prod${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `pub${tag}`, published: true,
        });

        // Landing: sign in on the press's login page: the Press Manager
        // lands on the editorial dashboard, "Assigned to me" view, under
        // the sidebar's "Editor Dashboard" group with the "Search
        // submissions" box at its top (Rule 1).
        await page.goto(`/index.php/${tag}/login`);
        const login = new LoginPage(page);
        await login.signIn(mg, getPassword(mg));
        await page.waitForURL((url) => url.pathname.includes('/dashboard/editorial'), {
            waitUntil: 'commit',
        });
        const dash = new EditorialDashboardPage(page, tag);
        await dash.expectViewHeading('Assigned to me', 0);
        await expect(dash.menuGroupLink()).toBeVisible();
        await expect(dash.globalSearchBox()).toBeVisible();

        // The "Reviews overdue" badge is colored (the attention variant,
        // fn-d) while it reads 0; the other badges are plain — a zero one
        // and a non-zero one read the same way as the controls (Rule 1).
        await dash.expectViewCount('Reviews overdue', 0);
        await expect(dash.viewBadge('Reviews overdue')).toHaveClass(ATTENTION);
        await dash.expectViewCount('Needs reviews', 0);
        await expect(dash.viewBadge('Needs reviews')).not.toHaveClass(ATTENTION);
        await dash.expectViewCount('Active submissions', 3);
        await expect(dash.viewBadge('Active submissions')).not.toHaveClass(ATTENTION);

        // The table: the heading names the view with its count ("Published
        // (1)") over the six columns; a Stage cell names the stage in plain
        // text with a colored dot beside it (Rule 5).
        await dash.openView('Published');
        await dash.expectViewHeading('Published', 1);
        for (const column of COLUMNS) {
            await expect(dash.columnHeader(column)).toBeVisible();
        }
        await expect(page.getByRole('columnheader')).toHaveCount(COLUMNS.length);
        await expect(dash.columnHeader('Status')).toHaveCount(0); // positive control for the name match
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 3);
        const active = dash.row(`walk${tag}`);
        await expect(dash.stageCell(active)).toHaveText(/^\s*Submission\s*$/);
        await expect(dash.stageDot(active)).toBeVisible();

        // The views: each entry opens the list under its own heading with
        // its count; badges carry the same numbers (Rules 1–2). "Needs
        // editor" is pinned to its own badge: which of the seeded rows count
        // as editor-less is the seed's, not the scenario's, claim.
        const expectedCounts = new Map([
            ['Active submissions', 3],
            ['Needs editor', null],
            ['All in submission stage', 1],
            ['All in copyediting stage', 1],
            ['All in production stage', 1],
            ['Published', 1],
        ]);
        for (const name of MANAGER_VIEWS) {
            const pinned = expectedCounts.has(name) ? expectedCounts.get(name) : 0;
            const count = pinned === null ? await dash.readViewCount(name) : pinned;
            await dash.expectViewCount(name, count);
            await dash.openView(name);
            await dash.expectViewHeading(name, count);
            if (name === 'Published') {
                await expect(dash.row(`pub${tag}`)).toBeVisible();
                await expect(dash.row(`walk${tag}`)).toHaveCount(0);
            }
            if (name === 'Active submissions') {
                for (const title of [`walk${tag}`, `copy${tag}`, `prod${tag}`]) {
                    await expect(dash.row(title)).toBeVisible();
                }
                await expect(dash.row(`pub${tag}`)).toHaveCount(0);
            }
        }

        // Control: a view whose badge reads 0 shows a single "No Items" row
        // (Rule 5) — "Declined" is the last one walked and holds nothing.
        await expect(page.getByText('No Items')).toBeVisible();
        await expect(dash.row(`walk${tag}`)).toHaveCount(0);
        await expect(dash.dataRows()).toHaveCount(1);

        // The stage views: the copyediting monograph under "All in
        // copyediting stage", its activity cell reading "Copyedited Files
        // Uploaded: {count}" (a seeded monograph carries no files, so the
        // label is matched and the number read — fn-s1); the production one
        // under "All in production stage" with an empty activity cell
        // (Rules 9g, 9i).
        await dash.openView('All in copyediting stage');
        await dash.expectViewHeading('All in copyediting stage', 1);
        const copyRow = dash.row(`copy${tag}`);
        await expect(copyRow).toBeVisible();
        await expect(dash.stageCell(copyRow)).toHaveText(/^\s*Copyediting\s*$/);
        await expect(dash.activityCell(copyRow)).toHaveText(/^\s*Copyedited Files Uploaded: \d+\s*$/);
        await expect(dash.row(`prod${tag}`)).toHaveCount(0);
        await dash.openView('All in production stage');
        await dash.expectViewHeading('All in production stage', 1);
        const prodRow = dash.row(`prod${tag}`);
        await expect(prodRow).toBeVisible();
        await expect(dash.stageCell(prodRow)).toHaveText(/^\s*Production\s*$/);
        await expect(dash.activityCell(prodRow)).toHaveText(/^\s*$/);
        await expect(dash.row(`copy${tag}`)).toHaveCount(0);
    });

    test('S2: assigned-only scope', async ({asUser, ompApi}, testInfo) => {
        const tag = makeTag('s2', testInfo);
        const mg = `${tag}mg`;
        const se = `${tag}se`;
        await ompApi.createContext({
            tag,
            users: [
                user(mg, 'Mira', 'Manager', ['manager']),
                // The Series Editor holds Author and Reviewer too (fn-s2),
                // with no series assignment, so a submit auto-assigns nobody.
                user(se, 'Sana', 'Series', ['sectionEditor', 'author', 'externalReviewer']),
                user(`${tag}au`, 'Ada', 'Author', ['author']),
            ],
        });
        // One monograph with the Series Editor assigned, one untouched, one
        // they submitted themselves, one they are on as a reviewer only.
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `asg${tag}`,
            participants: [{username: se, role: 'sectionEditor'}],
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `una${tag}`,
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: se, title: `aut${tag}`,
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `rev${tag}`,
            decisions: ['skipInternalReview'],
            reviewRounds: [{stage: 'external', reviewers: [{username: se, status: 'invited'}]}],
        });

        // Every view: the Series Editor's views hold only the assigned
        // monograph (Rules 2–3): badge counts across the whole roster…
        const sePage = await (await asUser(se)).newPage();
        const seDash = new EditorialDashboardPage(sePage, tag);
        await seDash.goto();
        for (const name of SUB_EDITOR_VIEWS) {
            const count = ['Assigned to me', 'Active submissions', 'All in submission stage']
                .includes(name) ? 1 : 0;
            await seDash.expectViewCount(name, count);
        }
        // …no "Needs editor" (or "Declined") entry at all, while the
        // neighboring entries render (Actors table / Rule 2).
        await expect(seDash.viewLink('Needs editor')).toHaveCount(0);
        await expect(seDash.viewLink('Declined')).toHaveCount(0);
        await expect(seDash.viewLink('Active submissions')).toBeVisible();

        // …and walked, each view lists the assigned one at most; the other
        // three appear in none (the heading count bounds each absence).
        for (const name of SUB_EDITOR_VIEWS) {
            await seDash.openView(name);
            const count = ['Assigned to me', 'Active submissions', 'All in submission stage']
                .includes(name) ? 1 : 0;
            await seDash.expectViewHeading(name, count);
            if (count) {
                await expect(seDash.row(`asg${tag}`)).toBeVisible();
            }
            for (const other of ['una', 'aut', 'rev']) {
                await expect(seDash.row(`${other}${tag}`)).toHaveCount(0);
            }
        }

        // Global search: the unassigned one is out of reach (Rule 7), with
        // the assigned title as the positive control taken the same way.
        await seDash.globalSearch(`una${tag}`);
        await seDash.expectViewHeading('Search Results', 0);
        await seDash.globalSearch(`asg${tag}`);
        await seDash.expectViewHeading('Search Results', 1);
        await expect(seDash.row(`asg${tag}`)).toBeVisible();

        // The submission they authored: not in the global search either,
        // while their "My Submissions as Author" group lists it.
        await seDash.globalSearch(`aut${tag}`);
        await seDash.expectViewHeading('Search Results', 0);
        const mySub = new MySubmissionsPage(sePage, tag);
        await expect(mySub.menuGroupLink()).toBeVisible();
        await mySub.goto();
        await expect(mySub.row(`aut${tag}`)).toBeVisible();
        await expect(mySub.row(`una${tag}`)).toHaveCount(0);

        // The submission they review: the same.
        await seDash.goto();
        await seDash.globalSearch(`rev${tag}`);
        await seDash.expectViewHeading('Search Results', 0);

        // Control: the Press Manager's "Active submissions" lists all four,
        // and their own "Assigned to me" stays empty (Rules 2–3).
        const mgPage = await (await asUser(mg)).newPage();
        const mgDash = new EditorialDashboardPage(mgPage, tag);
        await mgDash.goto();
        await mgDash.expectViewHeading('Assigned to me', 0);
        await mgDash.expectViewCount('Active submissions', 4);
        await mgDash.openView('Active submissions');
        await mgDash.expectViewHeading('Active submissions', 4);
        for (const title of ['asg', 'una', 'aut', 'rev']) {
            await expect(mgDash.row(`${title}${tag}`)).toBeVisible();
        }
    });

    test('S3: search within a view', async ({asUser, ompApi, pkpMail}, testInfo) => {
        const tag = makeTag('s3', testInfo);
        const mg = `${tag}mg`;
        const au = `${tag}au`;
        await ompApi.createContext({
            tag,
            users: [
                user(mg, 'Mira', 'Manager', ['manager']),
                user(au, 'Ada', 'Author', ['author']),
            ],
        });
        for (const title of [`finda${tag}`, `findb${tag}`, `findc${tag}`]) {
            await ompApi.createSubmission({
                tag, context: tag, submitter: au, title,
            });
        }
        await ompApi.createSubmission({
            tag, context: tag, submitter: au, title: `pub${tag}`, published: true,
        });

        const page = await (await asUser(mg)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 3);

        // The search box narrows the current view; the heading keeps the
        // view's name and the count follows; the phrase shows as a chip
        // (Rule 6).
        await dash.searchFor(`finda${tag}`);
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`finda${tag}`)).toBeVisible();
        await expect(dash.row(`findb${tag}`)).toHaveCount(0);
        await expect(dash.searchChip(`finda${tag}`)).toBeVisible();
        await expect(dash.searchChipClearButton()).toBeVisible();

        // The chip's X restores the full view.
        await dash.searchChipClearButton().click();
        await dash.expectViewHeading('Active submissions', 3);
        await expect(dash.row(`findb${tag}`)).toBeVisible();
        await expect(dash.searchChip()).toHaveCount(0);

        // A filter on top of the search: the filter's chip joins the search
        // chip, "Clear Filters" appears beside them, and the list holds only
        // the rows matching both — none, since today's rows are not idle
        // (Rules 6, 8; fn-s3).
        await dash.searchFor(`finda${tag}`);
        await dash.expectViewHeading('Active submissions', 1);
        await applyDaysFilter(dash);
        await dash.expectViewHeading('Active submissions', 0);
        await expect(dash.row(`finda${tag}`)).toHaveCount(0);
        await expect(dash.searchChip(`finda${tag}`)).toBeVisible();
        await expect(dash.filterChip(`${DAYS_FILTER}:`)).toBeVisible();
        await expect(dash.clearFiltersButton()).toBeVisible();

        // Switching views clears the phrase and the filter: open
        // "Published": both chips are gone and the search box is empty;
        // back on "Active submissions", the full view shows (Rules 6, 8).
        await dash.openView('Published');
        await dash.expectViewHeading('Published', 1);
        await expect(dash.row(`pub${tag}`)).toBeVisible();
        await expect(dash.searchChip()).toHaveCount(0);
        await expect(dash.filterChip(`${DAYS_FILTER}:`)).toHaveCount(0);
        await expect(dash.clearFiltersButton()).toHaveCount(0);
        await expect(dash.searchBox()).toHaveValue('');
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 3);
        await expect(dash.row(`finda${tag}`)).toBeVisible();
        await expect(dash.row(`findb${tag}`)).toBeVisible();
        await expect(dash.row(`findc${tag}`)).toBeVisible();

        // Control: the in-page box narrows the current view and never
        // reaches beyond it: the published monograph is not found here.
        await dash.searchFor(`pub${tag}`);
        await dash.expectViewHeading('Active submissions', 0);
        await expect(dash.row(`pub${tag}`)).toHaveCount(0);
        await expect(dash.dataRows()).toHaveCount(1);
        await expect(page.getByText('No Items')).toBeVisible();

        // Mailbox: none of the above sent an email (Side effects) — the
        // list read above is the settled point; the throwaway addresses
        // scope the read (PRINCIPLES A8).
        expect(await pkpMail.count({to: `${mg}@mail.test`})).toBe(0);
        expect(await pkpMail.count({to: `${au}@mail.test`})).toBe(0);
    });

    test('S4: global search', async ({asUser, ompApi}, testInfo) => {
        const tag = makeTag('s4', testInfo);
        const mg = `${tag}mg`;
        await ompApi.createContext({
            tag,
            users: [
                user(mg, 'Mira', 'Manager', ['manager']),
                user(`${tag}au`, 'Ada', 'Author', ['author']),
            ],
        });
        // One declined monograph plus an active one as noise.
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `decl${tag}`,
            decisions: ['initialDecline'],
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `act${tag}`,
        });

        const page = await (await asUser(mg)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();

        // Start from a non-default view (fn-s4): "Active submissions" —
        // where the declined monograph is not listed, and the in-page
        // search box renders (the positive control for its absence below).
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`decl${tag}`)).toHaveCount(0);
        await expect(dash.searchBox()).toBeVisible();

        // The sidebar box finds the declined monograph on the "Search
        // Results" view, its Stage cell reading "Declined", the phrase as a
        // chip, and no in-page search box (Rule 7).
        await dash.globalSearch(`decl${tag}`);
        await dash.expectViewHeading('Search Results', 1);
        const declined = dash.row(`decl${tag}`);
        await expect(declined).toBeVisible();
        await expect(dash.stageCell(declined)).toHaveText(/Declined/);
        await expect(dash.searchChip(`decl${tag}`)).toBeVisible();
        await expect(dash.searchBox()).toHaveCount(0);

        // Filters on the results: the Days filter at 30 keeps only results
        // idle that long (none today), a filter chip joins the phrase chip,
        // and the view is still "Search Results".
        await applyDaysFilter(dash);
        await dash.expectViewHeading('Search Results', 0);
        await expect(dash.row(`decl${tag}`)).toHaveCount(0);
        await expect(dash.filterChip(`${DAYS_FILTER}:`)).toBeVisible();
        await expect(dash.searchChip(`decl${tag}`)).toBeVisible();

        // Clearing the phrase alone: the view stays "Search Results", the
        // filter chip still active.
        await dash.searchChipClearButton().click();
        await expect(dash.searchChip()).toHaveCount(0);
        await dash.expectViewHeading('Search Results');
        await expect(dash.filterChip(`${DAYS_FILTER}:`)).toBeVisible();
        await expect(dash.searchBox()).toHaveCount(0);

        // Clearing the filter too: the page returns to "Active submissions",
        // the view the search started from, with its in-page box back.
        await dash.clearFiltersButton().click();
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`act${tag}`)).toBeVisible();
        await expect(dash.filterChip(`${DAYS_FILTER}:`)).toHaveCount(0);
        await expect(dash.searchBox()).toBeVisible();

        // Control: only the sidebar's search reaches a declined monograph
        // from here.
        await dash.searchFor(`decl${tag}`);
        await dash.expectViewHeading('Active submissions', 0);
        await expect(dash.row(`decl${tag}`)).toHaveCount(0);
    });

    test('S5: filter the list', async ({asUser, ompApi}, testInfo) => {
        const tag = makeTag('s5', testInfo);
        const mg = `${tag}mg`;
        const se = `${tag}se`;
        await ompApi.createContext({
            tag,
            users: [
                user(mg, 'Mira', 'Manager', ['manager']),
                user(se, 'Sana', 'Series', ['sectionEditor']),
                user(`${tag}au`, 'Ada', 'Author', ['author']),
            ],
        });
        // The Series Editor assigned to one monograph, a second active one
        // nobody is assigned to (so the editor filter's narrowing is
        // observable), and a published one for the view switch (fn-s5). A
        // press's context takes no series and its panel has no series
        // field (OMP1), so the scenario's {OJS OPS} "Section" bullet has no
        // press leg.
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `days${tag}`,
            participants: [{username: se, role: 'sectionEditor'}],
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `other${tag}`,
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `pub${tag}`, published: true,
        });

        const page = await (await asUser(mg)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 2);

        // "Filters": a side panel titled "Filters" with "Days since last
        // activity", "Clear Filters" and "Apply Filters" (Rule 8; this
        // scratch press has no categories). Set the slider to 30 and
        // apply: the panel closes, the fresh monographs (0 idle days) drop
        // out, the heading count follows, and the filter's chip shows with
        // "Clear Filters" beside it (fn-s5).
        let modal = await dash.openFilters();
        await expect(modal.getByRole('heading', {name: 'Filters'}).first()).toBeVisible();
        await expect(modal.getByText(DAYS_FILTER)).toBeVisible();
        await expect(modal.getByRole('button', {name: 'Clear Filters', exact: true})).toBeVisible();
        await dash.setDaysSinceLastActivity(30);
        await dash.applyFilters();
        await dash.expectViewHeading('Active submissions', 0);
        await expect(dash.row(`days${tag}`)).toHaveCount(0);
        await expect(page.getByText('No Items')).toBeVisible();
        await expect(dash.filterChip(`${DAYS_FILTER}:`)).toBeVisible();
        await expect(dash.clearFiltersButton()).toBeVisible();

        // "Clear Filters" restores the view.
        await dash.clearFiltersButton().click();
        await dash.expectViewHeading('Active submissions', 2);
        await expect(dash.row(`days${tag}`)).toBeVisible();
        await expect(dash.row(`other${tag}`)).toBeVisible();
        await expect(dash.filterChip(`${DAYS_FILTER}:`)).toHaveCount(0);

        // "Assigned To Editor": the manager's panel lists the field; its
        // suggest list offers nothing until a name is typed (Fields table);
        // type the Series Editor's name, pick them and apply: the list
        // narrows to the monograph they are assigned to, with a chip for
        // the filter above the table.
        modal = await dash.openFilters();
        const editorField = dash.filterSuggestField(EDITOR_FILTER);
        await expect(editorField).toBeVisible();
        await editorField.click();
        await expect(editorField).toBeFocused();
        await expect(dash.suggestOptions()).toHaveCount(0);
        await editorField.pressSequentially('Sana', {delay: 25});
        await expect(dash.suggestOptions().filter({hasText: 'Sana Series'})).toBeVisible();
        await expect(dash.suggestOptions()).toHaveCount(1);
        await dash.pickSuggestOption('Sana Series');
        await dash.applyFilters();
        const editorChip = `${EDITOR_FILTER}: Sana Series`;
        await expect(dash.filterChip(editorChip)).toBeVisible();
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`days${tag}`)).toBeVisible();
        await expect(dash.row(`other${tag}`)).toHaveCount(0);

        // A chip's X: with that filter still active, add the Days filter at
        // 30 (the list empties), then press the Days chip's X: that chip
        // alone goes, the editor's chip stays, and the list shows the
        // Series Editor's monograph again.
        await applyDaysFilter(dash);
        await expect(dash.filterChip(`${DAYS_FILTER}:`)).toBeVisible();
        await expect(dash.filterChip(editorChip)).toBeVisible();
        await dash.expectViewHeading('Active submissions', 0);
        await expect(page.getByText('No Items')).toBeVisible();
        await dash.filterChipButton(DAYS_FILTER).click();
        await expect(dash.filterChip(`${DAYS_FILTER}:`)).toHaveCount(0);
        await expect(dash.filterChip(editorChip)).toBeVisible();
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`days${tag}`)).toBeVisible();
        await expect(dash.row(`other${tag}`)).toHaveCount(0);

        // Switching views: with the editor's chip still active, open
        // "Published": the chip is gone and the view shows its full list.
        await dash.openView('Published');
        await dash.expectViewHeading('Published', 1);
        await expect(dash.row(`pub${tag}`)).toBeVisible();
        await expect(dash.filterChip(editorChip)).toHaveCount(0);
        await expect(dash.filterChip(`${DAYS_FILTER}:`)).toHaveCount(0);
        await expect(dash.clearFiltersButton()).toHaveCount(0);

        // Control: a Series Editor's panel has no "Assigned To Editor"
        // field, with the neighboring field as the positive control
        // (Rule 8).
        const sePage = await (await asUser(se)).newPage();
        const seDash = new EditorialDashboardPage(sePage, tag);
        await seDash.goto();
        const seModal = await seDash.openFilters();
        await expect(seModal.getByText(DAYS_FILTER)).toBeVisible();
        await expect(seModal.getByText(EDITOR_FILTER)).toHaveCount(0);
        await expect(seDash.filterSuggestField(EDITOR_FILTER)).toHaveCount(0);
    });

    test('S6: open a monograph in place', async ({asUser, ompApi}, testInfo) => {
        const tag = makeTag('s6', testInfo);
        const {submissionId} = await ompApi.createSubmission({
            tag, context: PK, submitter: 'author.alex', title: `open${tag}`,
            series: 'monographs',
        });

        const page = await (await asUser('editor.diana')).newPage();
        const dash = new EditorialDashboardPage(page, PK);
        await dash.goto();
        const row = await dash.findRowByTag(tag);
        const urlBefore = page.url();

        // "View" opens the workflow as a panel over the list; the address
        // records which submission is open (Rule 11).
        await dash.viewButton(row).click();
        await dash.expectWorkflowOpen();
        expect(page.url()).toContain(`workflowSubmissionId=${submissionId}`);
        const urlOpen = page.url();

        // Reload: the recorded address reopens the panel (Rule 11).
        await page.goto(urlOpen);
        await dash.expectWorkflowOpen();

        // Close: the list is back as it was left, at the address it had
        // before "View".
        await dash.closeWorkflow();
        await expect(dash.row(tag)).toBeVisible();
        expect(page.url()).toBe(urlBefore);

        // Control: reloading the address after closing brings the bare
        // list, no panel.
        await page.goto(page.url());
        await expect(dash.heading()).toBeVisible({timeout: 30_000});
        await expect(dash.row(tag)).toBeVisible();
        await expect(page.getByRole('heading', {name: /^Workflow:/})).toHaveCount(0);
        expect(page.url()).not.toContain('workflowSubmissionId');
    });

    test('S7: sort and page', async ({asUser, ompApi}, testInfo) => {
        const tag = makeTag('s7', testInfo);
        const mg = `${tag}mg`;
        const ROWS = 31; // one page of 30 plus one, for the paging leg (fn-s7)
        await ompApi.createContext({
            tag,
            users: [
                user(mg, 'Mira', 'Manager', ['manager']),
                user(`${tag}au`, 'Ada', 'Author', ['author']),
            ],
        });
        // Only the two ends are ordered — "ida" is seeded first and "idc"
        // last, so the ids the sort legs read ascend with those titles. The
        // filler rows in between carry no order of their own, so they are
        // seeded in small concurrent batches: the worker's server takes them
        // one at a time either way, and the batch only keeps it from idling
        // between seeds (small enough that a queued seed never sits out its
        // own request timeout).
        const first = await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `ida${tag}`,
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `idb${tag}`,
        });
        const fillers = Array.from({length: ROWS - 3}, (unused, i) => `fill${i}${tag}`);
        const BATCH = 4;
        for (let i = 0; i < fillers.length; i += BATCH) {
            await Promise.all(
                fillers.slice(i, i + BATCH).map((title) =>
                    ompApi.createSubmission({tag, context: tag, submitter: `${tag}au`, title})
                )
            );
        }
        const last = await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `idc${tag}`,
        });
        expect(last.submissionId).toBeGreaterThan(first.submissionId);

        const page = await (await asUser(mg)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', ROWS);
        const firstDataRow = dash.firstDataRow();

        // Paging: the list pages at 30 rows, pager controls sit under it,
        // page 2 shows the rest, and the address does not record which
        // page is showing (Rules 4–5; the sort legs below are the positive
        // control for what the address does record).
        await expect(dash.dataRows()).toHaveCount(30);
        await expect(dash.pager()).toBeVisible();
        const firstPageRowText = await firstDataRow.innerText();
        await dash.pagerPageButton(2).click();
        await expect(dash.dataRows()).toHaveCount(1);
        await expect(firstDataRow).not.toHaveText(firstPageRowText);
        await dash.expectViewHeading('Active submissions', ROWS);
        await expect(page).not.toHaveURL(/[?&](page|offset|currentPage)=/);
        await dash.pagerPageButton(1).click();
        await expect(dash.dataRows()).toHaveCount(30);

        // First click on "ID": descending — the address records the sort
        // and the highest ID rises to the top (Rules 4–5). (The third,
        // switch-off click is never made — register 🐞 A5.)
        await dash.sortButton('ID').click();
        await expect(page).toHaveURL(/sortColumn=id/);
        await expect(page).toHaveURL(/sortDirection=descending/);
        await expect(firstDataRow).toContainText(`idc${tag}`);

        // Second click flips it to ascending, address following.
        await dash.sortButton('ID').click();
        await expect(page).toHaveURL(/sortDirection=ascending/);
        await expect(firstDataRow).toContainText(`ida${tag}`);

        // Control: reloading the sorted address brings the rows back in the
        // same order.
        await page.goto(page.url());
        await dash.expectViewHeading('Active submissions', ROWS);
        await expect(firstDataRow).toContainText(`ida${tag}`);

        // The "Days" header sorts by idle time the same way (every row
        // shares an idle time here, so only the recorded sort is asserted,
        // fn-s7).
        await dash.sortButton('Days').click();
        await expect(page).toHaveURL(/sortColumn=lastActivity/);
        await expect(page).toHaveURL(/sortDirection=descending/);
        await dash.expectViewHeading('Active submissions', ROWS);
        await dash.sortButton('Days').click();
        await expect(page).toHaveURL(/sortDirection=ascending/);
    });

    test('S8: triage a new monograph', async ({asUser, ompApi}, testInfo) => {
        const tag = makeTag('s8', testInfo);
        const mg = `${tag}mg`;
        const se = `${tag}se`;
        await ompApi.createContext({
            tag,
            users: [
                user(mg, 'Mira', 'Manager', ['manager']),
                user(se, 'Sana', 'Series', ['sectionEditor']),
                user(`${tag}au`, 'Ada', 'Author', ['author']),
            ],
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `tri${tag}`,
        });

        const page = await (await asUser(mg)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();

        // "Needs editor": the fresh monograph lists there and under "All in
        // submission stage", with an "Assign Editor" button in its activity
        // cell (Rules 2, 9d).
        await dash.expectViewCount('Needs editor', 1);
        await dash.expectViewCount('All in submission stage', 1);
        await dash.openView('Needs editor');
        await expect(dash.row(`tri${tag}`)).toBeVisible();
        await expect(dash.assignEditorButton(dash.row(`tri${tag}`))).toBeVisible();
        await dash.openView('All in submission stage');
        await expect(dash.row(`tri${tag}`)).toBeVisible();

        // "Assign Editor": assign a Series Editor through the "Assign
        // Participant" window (opened from the row on "Active submissions",
        // where the row stays listed afterwards).
        await dash.openView('Active submissions');
        const row = dash.row(`tri${tag}`);
        await dash.assignEditorButton(row).click();
        const dlg = topModal(page);
        await expect(dlg.getByText('Assign Participant').first()).toBeVisible({
            timeout: 20_000,
        });
        await expect(dlg.getByRole('heading', {name: 'Locate a User'})).toBeVisible();
        await dlg.getByRole('combobox').first().selectOption({label: 'Series editor'});
        await dlg.getByRole('textbox', {name: 'Search User By Name'}).fill('Series');
        await dlg.getByRole('button', {name: 'Search', exact: true}).click();
        await expect(dlg.getByText('Sana Series')).toBeVisible({timeout: 20_000});
        await dlg.getByRole('radio').first().check();
        await dlg.getByRole('button', {name: 'OK', exact: true}).click();

        // Back on the list: the button is gone and the cell is empty (Rules
        // 9d, 9i), the row keeps its place here, and the "Needs editor"
        // badge and the heading total moved in place (Rule 13).
        await expect(dash.assignEditorButton(row)).toHaveCount(0, {timeout: 30_000});
        await expect(row).toBeVisible();
        await expect(dash.activityCell(row)).toHaveText(/^\s*$/);
        await dash.expectViewCount('Needs editor', 0);
        await dash.openView('Needs editor');
        await dash.expectViewHeading('Needs editor', 0);
        await expect(dash.row(`tri${tag}`)).toHaveCount(0);

        // Control: the row still lists under "Active submissions" and "All
        // in submission stage".
        await dash.expectViewCount('Active submissions', 1);
        await dash.expectViewCount('All in submission stage', 1);
        await dash.openView('All in submission stage');
        await dash.expectViewHeading('All in submission stage', 1);
        await expect(dash.row(`tri${tag}`)).toBeVisible();
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`tri${tag}`)).toBeVisible();
    });

    test('S9: review activity at a glance', async ({asUser, ompApi}, testInfo) => {
        const tag = makeTag('s9', testInfo);
        const mg = `${tag}mg`;
        const r1 = `${tag}ra`;
        const r2 = `${tag}rb`;
        const r3 = `${tag}rc`;
        await ompApi.createContext({
            tag,
            users: [
                user(mg, 'Mira', 'Manager', ['manager']),
                user(`${tag}au`, 'Ada', 'Author', ['author']),
                user(r1, 'Rita', 'Rana', ['externalReviewer']),
                user(r2, 'Rein', 'Remo', ['externalReviewer']),
                user(r3, 'Dana', 'Dekl', ['externalReviewer']),
            ],
        });
        // Four monographs in external review round 1 (fn-s9): one with no
        // reviewers yet…
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `rva${tag}`,
            decisions: ['skipInternalReview'],
        });
        // …one with two review requests out and a third reviewer who
        // declined…
        const withReviewers = await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `rvb${tag}`,
            decisions: ['skipInternalReview'],
            reviewRounds: [{
                stage: 'external',
                reviewers: [
                    {username: r1, status: 'invited'},
                    {username: r2, status: 'invited'},
                    {username: r3, status: 'declined'},
                ],
            }],
        });
        // …one with revisions requested this round and one with revisions
        // to be taken to a new round.
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `rvc${tag}`,
            decisions: ['skipInternalReview', 'requestRevisions'],
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `rvd${tag}`,
            decisions: ['skipInternalReview', 'resubmit'],
        });

        const page = await (await asUser(mg)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();
        await dash.openView('All in review stage');
        await dash.expectViewHeading('All in review stage', 4);
        /** Re-list the review view after the reviewer acted in their own
         * session: a fresh page load, because clicking the view already
         * open refetches nothing. */
        const relist = async () => {
            await dash.goto();
            await dash.openView('All in review stage');
            await dash.expectViewHeading('All in review stage', 4);
        };

        // No reviewers yet: the first row's cell offers "Assign Reviewers",
        // which opens the Add Reviewer window; close it (Rule 9e).
        const bare = dash.row(`rva${tag}`);
        await dash.assignReviewersButton(bare).click();
        const addModal = topModal(page);
        await expect(
            addModal.getByRole('heading', {name: 'Locate a Reviewer'})
        ).toBeVisible({timeout: 20_000});
        await addModal.getByRole('button', {name: 'Close', exact: true}).first().click();
        await expect(
            page.getByRole('heading', {name: 'Locate a Reviewer'})
        ).toHaveCount(0, {timeout: 20_000});

        // Two requests out: the second row's cell shows two countdown
        // indicators and an icon for the declined reviewer, and the
        // submission lists under "Awaiting reviews" (Rules 2, 10);
        // "Reviews submitted" holds nothing yet.
        const busy = dash.row(`rvb${tag}`);
        const awaiting = dash.activityIndicator(busy, AWAITING);
        await expect(awaiting).toHaveCount(2);
        await expect(dash.activityIndicator(bare, AWAITING)).toHaveCount(0);
        const declined = dash.activityIndicator(busy, /Review Request declined on/);
        await expect(declined).toHaveCount(1);
        await dash.expectViewCount('Awaiting reviews', 1);
        await dash.expectViewCount('Reviews submitted', 0);

        // A popover: it names the reviewer, the review type and the status,
        // with "Edit Due Date", "View details" and "Unassign" (Rule 10).
        await awaiting.first().click();
        const popover = dash.activityPopover(busy);
        await expect(popover).toContainText('Awaiting Response from the reviewer');
        await expect(popover.getByText(/Rana|Remo/).first()).toBeVisible();
        await expect(popover).toContainText('Anonymous Reviewer/Anonymous Author');
        await expect(popover.getByRole('button', {name: 'Edit Due Date', exact: true})).toBeVisible();
        await expect(popover.getByRole('button', {name: 'View details', exact: true})).toBeVisible();
        await expect(popover.getByRole('button', {name: 'Unassign', exact: true})).toBeVisible();
        await expect(popover.getByRole('button', {name: 'Cancel Reviewer', exact: true})).toHaveCount(0);
        await dash.closeActivityPopover(busy);

        // The declined reviewer's popover: "Review Request declined on
        // {date}", with "Resend Review Request", "View details" and "Cancel
        // Reviewer" (the declined row of the Rule 10 table).
        await declined.click();
        const declinedPopover = dash.activityPopover(busy);
        await expect(declinedPopover).toContainText(/Review Request declined on \d{4}-\d{2}-\d{2}/);
        await expect(declinedPopover).toContainText('Dekl');
        await expect(declinedPopover.getByRole('button', {name: 'Resend Review Request', exact: true})).toBeVisible();
        await expect(declinedPopover.getByRole('button', {name: 'View details', exact: true})).toBeVisible();
        await expect(declinedPopover.getByRole('button', {name: 'Cancel Reviewer', exact: true})).toBeVisible();
        await expect(declinedPopover.getByRole('button', {name: 'Unassign', exact: true})).toHaveCount(0);
        await dash.closeActivityPopover(busy);

        // "View details": the window the workflow's Reviewers panel opens
        // for that reviewer appears; close it: the list reloads (Rule 10).
        await awaiting.first().click();
        await popover.getByRole('button', {name: 'View details', exact: true}).click();
        const details = reviewDetailsModal(page);
        await expect(details).toBeVisible({timeout: 20_000});
        await expect(details.getByText(/Rana|Remo/).first()).toBeVisible();
        let reloaded = dash.listReload();
        await closeReviewDetails(details);
        await reloaded;
        await dash.expectViewHeading('All in review stage', 4);
        await expect(dash.activityIndicator(dash.row(`rvb${tag}`), AWAITING)).toHaveCount(2);
        await dash.closeActivityPopover(dash.row(`rvb${tag}`));

        // Reviewer: one of the two accepts the request (the reviewer's own
        // wizard, U28).
        const reviewerPage = await (await asUser(r2)).newPage();
        await acceptReviewRequest(reviewerPage, tag, withReviewers.submissionId);

        // The accepted request: back on the list, that reviewer's indicator
        // is still a countdown ring; its popover reads "Ongoing review -
        // request accepted", with "Edit Due Date", "View details" and
        // "Cancel Reviewer" (positive control for the change: the awaiting
        // indicators are down to one).
        await relist();
        const busyAccepted = dash.row(`rvb${tag}`);
        const accepted = dash.activityIndicator(busyAccepted, /Ongoing review - request accepted/);
        await expect(accepted).toHaveCount(1);
        await expect(dash.activityIndicator(busyAccepted, AWAITING)).toHaveCount(1);
        await accepted.click();
        const acceptedPopover = dash.activityPopover(busyAccepted);
        await expect(acceptedPopover).toContainText('Ongoing review - request accepted');
        await expect(acceptedPopover).toContainText('Remo');
        await expect(acceptedPopover.getByRole('button', {name: 'Edit Due Date', exact: true})).toBeVisible();
        await expect(acceptedPopover.getByRole('button', {name: 'View details', exact: true})).toBeVisible();
        await expect(acceptedPopover.getByRole('button', {name: 'Cancel Reviewer', exact: true})).toBeVisible();
        await expect(acceptedPopover.getByRole('button', {name: 'Unassign', exact: true})).toHaveCount(0);
        await dash.closeActivityPopover(busyAccepted);

        // Reviewer: the same reviewer submits their review.
        await submitAcceptedReview(reviewerPage, tag, withReviewers.submissionId, `Review comment ${tag}`);

        // The completed review: that reviewer's indicator is now a done
        // mark whose popover reads "Review completed on {date}" — on a
        // press without a recommendation (the popover's own completion
        // sentence is the positive control) — with "View unread
        // recommendation"; the submission now lists under "Reviews
        // submitted" too.
        await relist();
        await dash.expectViewCount('Reviews submitted', 1);
        await dash.expectViewCount('Awaiting reviews', 1);
        const busyAfter = dash.row(`rvb${tag}`);
        const done = dash.activityIndicator(busyAfter, /Review completed on/);
        await expect(done).toHaveCount(1);
        await expect(dash.activityIndicator(busyAfter, /Ongoing review - request accepted/)).toHaveCount(0);
        await done.click();
        let completedPopover = dash.activityPopover(busyAfter);
        await expect(completedPopover).toContainText(/Review completed on \d{4}-\d{2}-\d{2}/);
        await expect(completedPopover).toContainText(/The review was completed on \d{4}-\d{2}-\d{2}/);
        await expect(completedPopover).toContainText('Remo');
        await expect(completedPopover).not.toContainText('with the following recommendation');
        await expect(completedPopover).not.toContainText('Accept Submission');
        const unread = completedPopover.getByRole('button', {name: 'View unread recommendation', exact: true});
        await expect(unread).toBeVisible();
        await expect(
            completedPopover.getByRole('button', {name: 'View recommendation', exact: true})
        ).toHaveCount(0);

        // Press it, read, and close the window that opens: reopened, the
        // popover offers "View recommendation". The window marks the review
        // read once it has loaded; closed before that mark lands, the list
        // keeps "View unread recommendation" (U27 ⚠ A32), so the reader
        // waits for it.
        const marked = page.waitForResponse(
            (r) => /\/reviewAssignments\/\d+\/consider$/.test(r.url()) && r.request().method() === 'POST',
            {timeout: 30_000}
        );
        await unread.click();
        await expect(details).toBeVisible({timeout: 20_000});
        expect((await marked).ok()).toBe(true);
        reloaded = dash.listReload();
        await closeReviewDetails(details);
        await reloaded;
        await expect(busyAfter).toBeVisible({timeout: 30_000});
        await dash.closeActivityPopover(busyAfter);
        await dash.activityIndicator(busyAfter, /Review completed on/).click();
        completedPopover = dash.activityPopover(busyAfter);
        await expect(
            completedPopover.getByRole('button', {name: 'View recommendation', exact: true})
        ).toBeVisible();
        await expect(
            completedPopover.getByRole('button', {name: 'View unread recommendation', exact: true})
        ).toHaveCount(0);
        await dash.closeActivityPopover(busyAfter);

        // Revisions asked: the third row's cell reads "Revisions requested
        // from author" and the fourth's "Revisions requested from the
        // author to be taken to a new review round" (Rule 9e).
        const revReqCell = dash.activityCell(dash.row(`rvc${tag}`));
        await expect(revReqCell).toContainText('Revisions requested from author');
        await expect(revReqCell).not.toContainText('new review round');
        await expect(dash.activityCell(dash.row(`rvd${tag}`))).toContainText(
            'Revisions requested from the author to be taken to a new review round'
        );

        // Control: the other reviewer's indicator is still a countdown ring
        // whose popover reads "Awaiting Response from the reviewer".
        const stillAwaiting = dash.activityIndicator(busyAfter, AWAITING);
        await expect(stillAwaiting).toHaveCount(1);
        await stillAwaiting.click();
        await expect(dash.activityPopover(busyAfter)).toContainText('Awaiting Response from the reviewer');
        await expect(dash.activityPopover(busyAfter)).toContainText('Rana');
        await expect(dash.activityPopover(busyAfter).getByRole('button', {name: 'Unassign', exact: true})).toBeVisible();
        await dash.closeActivityPopover(busyAfter);
    });

    test('S10: the conflict row', async ({asUser, ompApi}, testInfo) => {
        const tag = makeTag('s10', testInfo);
        const ma = `${tag}ma`;
        await ompApi.createContext({
            tag,
            users: [
                // The combo account holds Manager, Author and Reviewer
                // (fn-s10).
                user(ma, 'Mona', 'Managerauthor', ['manager', 'author', 'externalReviewer']),
                user(`${tag}au`, 'Ada', 'Author', ['author']),
            ],
        });
        // Their own monograph, another author's as the control row, and a
        // third in review with the combo account invited as its reviewer.
        await ompApi.createSubmission({
            tag, context: tag, submitter: ma, title: `own${tag}`,
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `oth${tag}`,
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `revd${tag}`,
            decisions: ['skipInternalReview'],
            reviewRounds: [{stage: 'external', reviewers: [{username: ma, status: 'invited'}]}],
        });

        const page = await (await asUser(ma)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.gotoView('active');
        await dash.expectViewHeading('Active submissions', 3);

        // Their own row shows the conflict notice and offers no buttons at
        // all — no "View", no "Assign Editor" (Rule 9a; the notice's fixed
        // role wording is register ❓ A3 and is not asserted).
        const own = dash.row(`own${tag}`);
        await expect(own).toContainText('You cannot access this submission');
        await expect(own).toContainText('go to "My Submissions"');
        await expect(own.getByRole('button')).toHaveCount(0);
        await expect(dash.viewButton(own)).toHaveCount(0);
        await expect(dash.assignEditorButton(own)).toHaveCount(0);

        // The submission they review: its activity cell carries a conflict
        // notice that sends them to "Review Assignments" (judged by that
        // phrase, A3), and the row offers no button either: no "View", no
        // "Assign Reviewers" and no reviewer indicator.
        const revd = dash.row(`revd${tag}`);
        await expect(revd).toContainText('You cannot access this submission');
        await expect(revd).toContainText('Review Assignments');
        await expect(revd).not.toContainText('My Submissions');
        await expect(dash.viewButton(revd)).toHaveCount(0);
        await expect(dash.assignReviewersButton(revd)).toHaveCount(0);
        await expect(revd.getByRole('button')).toHaveCount(0);

        // The ordinary row beside them keeps both (positive controls).
        const oth = dash.row(`oth${tag}`);
        await expect(dash.viewButton(oth)).toBeVisible();
        await expect(dash.assignEditorButton(oth)).toBeVisible();

        // The same monograph sits normally under "My Submissions as
        // Author" (scenario 10).
        const mySub = new MySubmissionsPage(page, tag);
        await mySub.goto();
        await mySub.expectViewHeading('Active submissions');
        await expect(mySub.row(`own${tag}`)).toBeVisible();
        await expect(mySub.viewButton(mySub.row(`own${tag}`))).toBeVisible();
    });

    test("S11: declined out of the Series Editor's sight", async ({asUser, ompApi}, testInfo) => {
        const tag = makeTag('s11', testInfo);
        const mg = `${tag}mg`;
        const se = `${tag}se`;
        await ompApi.createContext({
            tag,
            users: [
                user(mg, 'Mira', 'Manager', ['manager']),
                user(se, 'Sana', 'Series', ['sectionEditor']),
                user(`${tag}au`, 'Ada', 'Author', ['author']),
            ],
        });
        // The Series Editor's assigned monograph, seeded active and
        // declined on screen below (fn-s11), plus a second assigned, active
        // one as the positive control for their views.
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `dcl${tag}`,
            participants: [{username: se, role: 'sectionEditor'}],
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `live${tag}`,
            participants: [{username: se, role: 'sectionEditor'}],
        });

        // Press Manager: on "Active submissions", press "View" on the row
        // and decline the monograph from its Submission stage inside the
        // panel (the "Decline Submission" wizard belongs to U25: a
        // full-page flow ending in a completion panel whose "View
        // Submission" returns to the view left, panel open).
        const mgPage = await (await asUser(mg)).newPage();
        const mgDash = new EditorialDashboardPage(mgPage, tag);
        await mgDash.goto();
        await mgDash.expectViewCount('Declined', 0);
        await mgDash.openView('Active submissions');
        await mgDash.expectViewHeading('Active submissions', 2);
        await mgDash.expectViewCount('Active submissions', 2);
        await mgDash.viewButton(mgDash.row(`dcl${tag}`)).click();
        await mgDash.expectWorkflowOpen();
        await mgDash.workflowDialog().getByRole('button', {name: 'Decline Submission', exact: true}).click();
        await expect(
            mgPage.getByRole('heading', {level: 1, name: /^Decline Submission/})
        ).toBeVisible({timeout: 30_000});
        await walkDecisionWizard(mgPage);
        await mgPage.getByRole('link', {name: /^View Submission/}).first().click();

        // Close the panel: the heading total and the "Declined" badge move
        // without a reload (Rule 13).
        await mgDash.expectWorkflowOpen();
        await mgDash.closeWorkflow();
        await mgDash.expectViewHeading('Active submissions', 1);
        await mgDash.expectViewCount('Declined', 1);
        await mgDash.expectViewCount('Active submissions', 1);
        await expect(mgDash.row(`live${tag}`)).toBeVisible();
        await expect(mgDash.row(`dcl${tag}`)).toHaveCount(0);

        // Open "Declined": the row is listed with its Stage cell reading
        // "Declined", its activity cell naming the stage by its plain name,
        // and the row keeping "View" (Rules 2, 9b).
        await mgDash.openView('Declined');
        await mgDash.expectViewHeading('Declined', 1);
        const row = mgDash.row(`dcl${tag}`);
        await expect(row).toBeVisible();
        await expect(mgDash.stageCell(row)).toHaveText(/^\s*Declined\s*$/);
        await expect(mgDash.activityCell(row)).toHaveText(/^\s*Declined during the Submission stage\.\s*$/);
        await expect(mgDash.viewButton(row)).toBeVisible();

        // Series Editor: their group has no "Declined" entry (register ❓
        // A1's plain claim) and no "Needs editor" entry, and the monograph
        // is gone from every one of their views (Rule 2; the other
        // assigned one is the positive control)…
        const sePage = await (await asUser(se)).newPage();
        const seDash = new EditorialDashboardPage(sePage, tag);
        await seDash.goto();
        await expect(seDash.viewLink('Declined')).toHaveCount(0);
        await expect(seDash.viewLink('Needs editor')).toHaveCount(0);
        await expect(seDash.viewLink('Active submissions')).toBeVisible();
        for (const name of SUB_EDITOR_VIEWS) {
            const count = ['Assigned to me', 'Active submissions', 'All in submission stage']
                .includes(name) ? 1 : 0;
            await seDash.expectViewCount(name, count);
            await seDash.openView(name);
            await seDash.expectViewHeading(name, count);
            await expect(seDash.row(`dcl${tag}`)).toHaveCount(0);
            if (count) {
                await expect(seDash.row(`live${tag}`)).toBeVisible();
            }
        }

        // …while their global search still finds it, with "View" (Rule 7).
        await seDash.globalSearch(`dcl${tag}`);
        await seDash.expectViewHeading('Search Results', 1);
        await expect(seDash.row(`dcl${tag}`)).toBeVisible();
        await expect(seDash.viewButton(seDash.row(`dcl${tag}`))).toBeVisible();

        // Deleted inside the panel: Press Manager: on "Declined", press
        // "View" on the row, press its stage's "Delete" and confirm the
        // "Delete" dialog (U24's): the panel closes on the refreshed list,
        // from which the row is gone, and the "Declined" badge and the
        // heading total follow within a few seconds (the count reload runs
        // through a five-second trailing throttle, fn-d: the reads below
        // are auto-waited, never a reload).
        await mgDash.openView('Declined');
        await mgDash.expectViewHeading('Declined', 1);
        const workflow = new WorkflowPage(mgPage, tag);
        await workflow.openFromRow(mgDash.row(`dcl${tag}`));
        await workflow.deleteSubmission({confirm: true});
        await expect(mgDash.workflowDialog()).toHaveCount(0);
        await expect(mgDash.row(`dcl${tag}`)).toHaveCount(0);
        await expect(mgPage.getByText('No Items')).toBeVisible();
        await mgDash.expectViewCount('Declined', 0);
        await mgDash.expectViewHeading('Declined', 0);

        // Control: the Press Manager's own group offers "Declined" and
        // "Needs editor".
        await expect(mgDash.viewLink('Declined')).toBeVisible();
        await expect(mgDash.viewLink('Needs editor')).toBeVisible();
    });

    test('S12: bulk-delete incomplete monographs', async ({asUser, ompApi, pkpMail}, testInfo) => {
        const tag = makeTag('s12', testInfo);
        const mg = `${tag}mg`;
        const se = `${tag}se`;
        const aa = `${tag}aa`;
        const ab = `${tag}ab`;
        await ompApi.createContext({
            tag,
            users: [
                user(mg, 'Mira', 'Manager', ['manager']),
                user(se, 'Sana', 'Series', ['sectionEditor']),
                user(aa, 'Ada', 'Author', ['author']),
                user(ab, 'Bea', 'Author', ['author']),
            ],
        });
        // Two incomplete monographs by different authors + one submitted.
        await ompApi.createSubmission({
            tag, context: tag, submitter: aa, title: `bda${tag}`, submitted: false,
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: ab, title: `bdb${tag}`, submitted: false,
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: aa, title: `bdc${tag}`,
        });

        const page = await (await asUser(mg)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 3);

        // The incomplete rows: each has its Stage cell reading "Incomplete",
        // offers "Complete submission" (Rule 9c; register ❓ A2, offered but
        // never pressed) and has no "View"; the submitted row has "View".
        const rowA = dash.row(`bda${tag}`);
        const rowB = dash.row(`bdb${tag}`);
        const submitted = dash.row(`bdc${tag}`);
        for (const row of [rowA, rowB]) {
            await expect(dash.stageCell(row)).toHaveText(/Incomplete/);
            await expect(dash.completeSubmissionButton(row)).toBeVisible();
            await expect(dash.viewButton(row)).toHaveCount(0);
        }
        await expect(dash.stageCell(submitted)).toHaveText(/Submission/);
        await expect(dash.viewButton(submitted)).toBeVisible();
        await expect(dash.completeSubmissionButton(submitted)).toHaveCount(0);

        // "More Actions" → "Delete Incomplete Submissions": selection mode,
        // a checkbox on the two incomplete rows only, "Delete Incomplete
        // Submissions" and "Cancel" above, the delete button disabled until
        // a row is ticked (Rule 12).
        await expect(await dash.openMoreActions()).toBeEnabled();
        await dash.bulkDeleteMenuItem().click();
        await expect(dash.bulkDeleteButton()).toBeVisible({timeout: 30_000});
        await expect(rowA.getByRole('checkbox')).toBeVisible();
        await expect(rowB.getByRole('checkbox')).toBeVisible();
        await expect(submitted.getByRole('checkbox')).toHaveCount(0);
        await expect(dash.bulkDeleteCancelButton()).toHaveText(/^\s*Cancel\s*$/);
        await expect(dash.bulkDeleteButton()).toBeDisabled();

        /** Both incomplete rows are still listed beside the submitted one. */
        const expectNothingDeleted = async () => {
            await dash.expectViewHeading('Active submissions', 3);
            await expect(rowA).toBeVisible();
            await expect(rowB).toBeVisible();
            await expect(submitted).toBeVisible();
        };

        // "Cancel": tick one row and press "Cancel" above the list:
        // selection mode ends (no checkbox, no delete button) with nothing
        // deleted, both incomplete rows still listed.
        await dash.checkRowCheckbox(rowA);
        await expect(dash.bulkDeleteButton()).toBeEnabled();
        await dash.bulkDeleteCancelButton().click();
        await expect(dash.bulkDeleteButton()).toHaveCount(0);
        await expect(page.getByRole('checkbox')).toHaveCount(0);
        await expectNothingDeleted();

        // … choose "Delete Incomplete Submissions" again, tick one row,
        // press "Delete Incomplete Submissions" and then "Cancel" in the
        // dialog: the same.
        await dash.enterBulkDeleteSelection();
        await dash.checkRowCheckbox(rowA);
        await expect(dash.bulkDeleteButton()).toBeEnabled();
        await dash.bulkDeleteButton().click();
        const dialog = dash.bulkDeleteConfirmDialog();
        await expect(dialog).toBeVisible({timeout: 30_000});
        await expect(dialog).toContainText(BULK_DELETE_CONFIRM);
        await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
        await expect(dialog).toHaveCount(0, {timeout: 30_000});
        await expect(dash.bulkDeleteButton()).toHaveCount(0);
        await expect(page.getByRole('checkbox')).toHaveCount(0);
        await expectNothingDeleted();

        // A view switch in selection mode: choose "Delete Incomplete
        // Submissions" once more, tick one row, open "Published" and return
        // to "Active submissions": no row is ticked and nothing was deleted.
        await dash.enterBulkDeleteSelection();
        await dash.checkRowCheckbox(rowA);
        await expect(rowA.getByRole('checkbox')).toBeChecked(); // positive control for the tick
        await dash.openView('Published');
        await dash.expectViewHeading('Published', 0);
        await dash.openView('Active submissions');
        await expectNothingDeleted();
        await expect(page.getByRole('checkbox', {checked: true})).toHaveCount(0);

        // Delete: choose "Delete Incomplete Submissions" again, tick both
        // and press the button: the confirm dialog reads its sentence;
        // "Confirm" removes both rows, and the badges and the heading total
        // drop in place (Rules 12–13).
        await dash.enterBulkDeleteSelection();
        await dash.checkRowCheckbox(rowA);
        await expect(dash.bulkDeleteButton()).toBeEnabled();
        await dash.checkRowCheckbox(rowB);
        await dash.bulkDeleteButton().click();
        await expect(dialog).toBeVisible({timeout: 30_000});
        await expect(dialog).toContainText(BULK_DELETE_CONFIRM);
        await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        await expect(rowA).toHaveCount(0, {timeout: 30_000});
        await expect(rowB).toHaveCount(0);
        await expect(submitted).toBeVisible();
        await dash.expectViewHeading('Active submissions', 1);
        await dash.expectViewCount('Active submissions', 1);
        await dash.expectViewCount('Needs editor', 1);

        // "More Actions" afterwards: with no incomplete row left on the
        // page, "Delete Incomplete Submissions" is grayed out (Rule 12; the
        // entry was enabled above, the positive control).
        await expect(await dash.openMoreActions()).toBeDisabled();
        await dash.closeMoreActions();

        // The author's own list: signed in as one of the drafts' authors,
        // My Submissions no longer lists it (their submitted monograph is
        // the positive control), and no email about the deletion arrived
        // (Side effects; the list read is the settled point, the throwaway
        // address the scope, PRINCIPLES A8).
        const aaPage = await (await asUser(aa)).newPage();
        const mySub = new MySubmissionsPage(aaPage, tag);
        await mySub.goto();
        await mySub.expectViewCount('Incomplete submissions', 0);
        await mySub.openView('Incomplete submissions');
        await mySub.expectViewHeading('Incomplete submissions', 0);
        await expect(mySub.row(`bda${tag}`)).toHaveCount(0);
        await mySub.openView('Active submissions');
        await mySub.expectViewHeading('Active submissions', 1);
        await expect(mySub.row(`bdc${tag}`)).toBeVisible();
        await expect(mySub.row(`bda${tag}`)).toHaveCount(0);
        expect(await pkpMail.count({to: `${aa}@mail.test`})).toBe(0);
        expect(await pkpMail.count({to: `${ab}@mail.test`})).toBe(0);

        // Control: a Series Editor's dashboard shows no "More Actions"
        // button at all, with the neighboring controls as positive
        // controls (Rule 12 / fn-s12).
        const sePage = await (await asUser(se)).newPage();
        const seDash = new EditorialDashboardPage(sePage, tag);
        await seDash.goto();
        await expect(seDash.filtersButton()).toBeVisible();
        await expect(seDash.searchBox()).toBeVisible();
        await expect(seDash.moreActionsButton()).toHaveCount(0);
    });

    test('S14: one review view, two review stages', async ({asUser, ompApi}, testInfo) => {
        const tag = makeTag('s14', testInfo);
        const mg = `${tag}mg`;
        await ompApi.createContext({
            tag,
            users: [
                user(mg, 'Mira', 'Manager', ['manager']),
                user(`${tag}au`, 'Ada', 'Author', ['author']),
            ],
        });
        // One monograph in Internal Review, another in External Review, no
        // reviewers on either round (fn-s14).
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `int${tag}`,
            decisions: ['sendInternalReview'],
        });
        await ompApi.createSubmission({
            tag, context: tag, submitter: `${tag}au`, title: `ext${tag}`,
            decisions: ['skipInternalReview'],
        });

        const page = await (await asUser(mg)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();

        // "All in review stage" spans both review stages (Rule 2 /
        // scenario 14) — one entry, both monographs, each with its stage
        // in the Stage cell.
        await dash.expectViewCount('All in review stage', 2);
        await dash.openView('All in review stage');
        await dash.expectViewHeading('All in review stage', 2);
        const internal = dash.row(`int${tag}`);
        const external = dash.row(`ext${tag}`);
        await expect(dash.stageCell(internal)).toHaveText(/Internal Review/);
        await expect(dash.stageCell(external)).toHaveText(/External Review/);

        // The internal one's activity cell offers "Assign Reviewers", like
        // the external one's (Rule 9e).
        await expect(dash.assignReviewersButton(internal)).toBeVisible();
        await expect(dash.assignReviewersButton(external)).toBeVisible();

        // Control: the sidebar offers no separate entry for either review
        // stage, while the neighboring entries render.
        await expect(dash.viewLink('All in review stage')).toBeVisible();
        await expect(dash.viewLink('All in copyediting stage')).toBeVisible();
        for (const absent of ['All in internal review stage', 'All in external review stage',
            'Internal Review', 'External Review', 'All in peer review']) {
            await expect(dash.viewLink(absent)).toHaveCount(0);
        }
        await expect(dash.sideNav().locator('a[href*="dashboard/editorial"]')
            .filter({hasText: /review stage/i})).toHaveCount(1);
    });

    test('S16: refused at the address', async ({asUser}) => {
        // The address: a signed-in Author-only account types the editorial
        // dashboard's address: the access-denied page shows (Actors row 1;
        // fn-s16).
        const authorPage = await (await asUser('author.alex')).newPage();
        await authorPage.goto(`/index.php/${PK}/dashboard/editorial`);
        await expect(authorPage.getByText(ACCESS_DENIED)).toBeVisible({timeout: 30_000});
        await expect(authorPage.getByRole('heading', {name: /^Assigned to me/})).toHaveCount(0);
        await expect(authorPage.locator('#app-nav')).toHaveCount(0);

        // Control: a Press Manager at the same address opens the dashboard.
        const managerPage = await (await asUser('manager.maya')).newPage();
        const dash = new EditorialDashboardPage(managerPage, PK);
        await dash.goto();
        await dash.expectViewHeading('Assigned to me');
        await expect(dash.menuGroupLink()).toBeVisible();
        await expect(managerPage.getByText(ACCESS_DENIED)).toHaveCount(0);
    });

    test('S17: a review confirmed, with and without a minimum', async ({asUser, ompApi}, testInfo) => {
        const MINIMUM_SENTENCE =
            'Minimum required number of reviews have been confirmed. A decision is needed.';
        const ALL_CONFIRMED_SENTENCE = 'All reviews are confirmed and a decision is needed.';
        // Two scratch presses, one at the install default of "Reviews
        // required" (no `review` key) and one with the minimum set to 1
        // through the context's passthrough key; each holds one monograph
        // in external review whose single reviewer has submitted their
        // review (fn-s17).
        const seedPress = async (suffix, contextExtras) => {
            const tag = makeTag(`s17${suffix}`, testInfo);
            const mg = `${tag}mg`;
            const reviewer = `${tag}rv`;
            await ompApi.createContext({
                tag,
                ...contextExtras,
                users: [
                    user(mg, 'Mira', 'Manager', ['manager']),
                    user(`${tag}au`, 'Ada', 'Author', ['author']),
                    user(reviewer, 'Rita', 'Rana', ['externalReviewer']),
                ],
            });
            await ompApi.createSubmission({
                tag, context: tag, submitter: `${tag}au`, title: `done${tag}`,
                decisions: ['skipInternalReview'],
                reviewRounds: [{stage: 'external', reviewers: [{username: reviewer, status: 'completed'}]}],
            });
            const page = await (await asUser(mg)).newPage();
            const dash = new EditorialDashboardPage(page, tag);
            return {tag, page, dash};
        };
        const withMinimum = await seedPress('m', {review: {numReviewsPerSubmission: 1}});
        const atDefault = await seedPress('d', {});

        /**
         * Confirm the row's submitted review from its popover: "View unread
         * recommendation" opens the "Review Details: {title}" window the
         * workflow's Reviewers panel opens; "Mark as Complete" there (U27,
         * once the window has settled), then close it: the list reloads.
         * Returns after the popover is dismissed.
         */
        const confirmReview = async ({page, dash, tag}) => {
            const row = dash.row(`done${tag}`);
            const completed = dash.activityIndicator(row, /Review completed on/);
            await expect(completed).toHaveCount(1);
            await completed.click();
            const popover = dash.activityPopover(row);
            await expect(popover).toContainText(/Review completed on \d{4}-\d{2}-\d{2}/);
            await popover.getByRole('button', {name: 'View unread recommendation', exact: true}).click();
            const details = reviewDetailsModal(page);
            await expect(details).toBeVisible({timeout: 30_000});
            await expect(
                details.getByRole('button', {name: 'Modify Review', exact: true})
            ).toBeEnabled({timeout: 30_000});
            await markReviewComplete(page, details);
            const refetch = dash.listReload();
            await closeReviewDetails(details);
            await refetch;
            await expect(row).toBeVisible({timeout: 30_000});
            await dash.closeActivityPopover(row);
        };

        /** The confirmed review's popover reads "Review was confirmed by
         * editor", with "View recommendation" (the confirmed row of the
         * Rule 10 table); the done mark is gone. */
        const expectConfirmedPopover = async ({dash, tag}) => {
            const row = dash.row(`done${tag}`);
            const confirmed = dash.activityIndicator(row, /Review was confirmed by editor/);
            await expect(confirmed).toHaveCount(1);
            await expect(dash.activityIndicator(row, /Review completed on/)).toHaveCount(0);
            await confirmed.click();
            const popover = dash.activityPopover(row);
            await expect(popover).toContainText('Review was confirmed by editor');
            await expect(popover.getByRole('button', {name: 'View recommendation', exact: true})).toBeVisible();
            await expect(
                popover.getByRole('button', {name: 'View unread recommendation', exact: true})
            ).toHaveCount(0);
            await dash.closeActivityPopover(row);
        };

        // Before: on each press the row's activity cell shows the
        // reviewer's indicator alone, no sentence, and the monograph lists
        // under "Reviews submitted"; on the press with the minimum it lists
        // under "Needs reviews" too.
        for (const press of [withMinimum, atDefault]) {
            const {dash, tag} = press;
            await dash.goto();
            await dash.expectViewCount('Reviews submitted', 1);
            await dash.openView('Reviews submitted');
            await dash.expectViewHeading('Reviews submitted', 1);
            const row = dash.row(`done${tag}`);
            await expect(row).toBeVisible();
            await expect(dash.activityIndicator(row, /Review completed on/)).toHaveCount(1);
            await expect(dash.activityCell(row)).not.toContainText('decision is needed');
            await expect(dash.activityCell(row)).not.toContainText('confirmed');
        }
        await withMinimum.dash.expectViewCount('Needs reviews', 1);
        await withMinimum.dash.openView('Needs reviews');
        await withMinimum.dash.expectViewHeading('Needs reviews', 1);
        await expect(withMinimum.dash.row(`done${withMinimum.tag}`)).toBeVisible();

        // Press Manager confirms, on the press with the minimum.
        await withMinimum.dash.openView('Active submissions');
        await withMinimum.dash.expectViewHeading('Active submissions', 1);
        await confirmReview(withMinimum);

        // The confirmed review: the popover now reads "Review was confirmed
        // by editor", with "View recommendation".
        await expectConfirmedPopover(withMinimum);

        // With a minimum set: the activity cell reads the minimum-required
        // sentence (Rule 9e).
        const minRow = withMinimum.dash.row(`done${withMinimum.tag}`);
        await expect(withMinimum.dash.activityCell(minRow)).toContainText(MINIMUM_SENTENCE);
        await expect(withMinimum.dash.activityCell(minRow)).not.toContainText(ALL_CONFIRMED_SENTENCE);

        // At the default: the same confirmation on the other press ends
        // with the all-confirmed sentence.
        await atDefault.dash.openView('Active submissions');
        await atDefault.dash.expectViewHeading('Active submissions', 1);
        await confirmReview(atDefault);
        await expectConfirmedPopover(atDefault);
        const defRow = atDefault.dash.row(`done${atDefault.tag}`);
        await expect(atDefault.dash.activityCell(defRow)).toContainText(ALL_CONFIRMED_SENTENCE);
        await expect(atDefault.dash.activityCell(defRow)).not.toContainText(MINIMUM_SENTENCE);

        // Control: on the press with the minimum, "Needs reviews" no longer
        // lists the monograph once its review is confirmed (positive
        // control: "Reviews submitted" still does).
        await withMinimum.dash.expectViewCount('Needs reviews', 0);
        await withMinimum.dash.openView('Needs reviews');
        await withMinimum.dash.expectViewHeading('Needs reviews', 0);
        await expect(withMinimum.dash.row(`done${withMinimum.tag}`)).toHaveCount(0);
        await expect(withMinimum.page.getByText('No Items')).toBeVisible();
        await withMinimum.dash.openView('Reviews submitted');
        await withMinimum.dash.expectViewHeading('Reviews submitted', 1);
        await expect(withMinimum.dash.row(`done${withMinimum.tag}`)).toBeVisible();
    });
});
