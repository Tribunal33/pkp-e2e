// @ts-check
/**
 * @file playwright/tests/U23-submissions-dashboard.spec.js
 *
 * Submissions dashboard (editorial) — OJS suite, one test per canonical
 * scenario the spec runs on OJS (common scenarios 1–12, 16 and 17 + the
 * OJS-specific 13; scenario 14 is OMP-only, 15 OPS-only).
 * Spec: docs/specs/U23-submissions-dashboard.md.
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as contract, a ❓ is parked, not a gap; the spec's
 * Coverage section is the record of everything else left out):
 * - A1 ❓, A2 ❓, A3 ❓, A7 ❓, A8 ❓.
 *
 * Seeding: scenario endpoints only; publicknowledge and the 18 seeded users
 * are read-only. Tests that assert counts or sidebar badges isolate on
 * scratch journals with throwaway users (S17 on two, one per end of the
 * journal's "Reviews required" setting, seeded through the context's
 * `review` passthrough key); S6, S9, S13 and S16 run on publicknowledge and
 * scope every claim by the seed tag through the list's own search, bounded
 * by that search's response or the heading count. Absence assertions carry
 * same-shape positive controls. Mailbox reads are scoped by the scenario's
 * own throwaway recipients (PRINCIPLES A8) and settled by the scenario's
 * last list read. The decline of S11 and the review confirmation of S17 are
 * driven on screen (the stage's decision wizard, the "Review Details"
 * window) because the scenarios read the list's live counts after them.
 * No hard-coded waits: the count reload after a delete inside the panel
 * runs through the app's own five-second throttle and is read by an
 * auto-waited expect, never a reload. Everything runs in the parallel `ojs`
 * project.
 */
const {test, expect} = require('../support/fixtures.js');
const {EditorialDashboardPage} = require('../../../../shared/playwright/pages/EditorialDashboardPage.js');
const {MySubmissionsPage} = require('../../../../shared/playwright/pages/MySubmissionsPage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {
    DecisionPage,
    acceptReviewRequest,
    completeAssignParticipantForm,
    performReview,
    reviewDetailsModal,
    markReviewComplete,
    closeReviewDetails,
} = require('../pages/ReviewStagePages.js');

const JOURNAL = 'publicknowledge';
const ACCESS_DENIED = 'The current role does not have access to this operation.';
const BULK_DELETE_CONFIRM =
    'Are you sure you want to delete the selected items? This action cannot be undone. Please confirm to proceed.';

/** Unique per-run tag: single alphanumeric token, app + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u23${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** URL equality up to query-parameter order. */
function normalizedUrl(url) {
    const u = new URL(url);
    u.searchParams.sort();
    return `${u.origin}${u.pathname}?${u.searchParams.toString()}`;
}

/** A throwaway account of the scratch journal (email `<username>@mail.test`). */
function account(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

test.describe('submissions dashboard', () => {
    test('S1: land and walk the views', {tag: '@smoke'}, async ({page, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        // A scratch journal so every view count is deterministic: one new
        // submission, one in copyediting, one in production and one
        // published (fn-s1).
        await ojsApi.createContext({
            tag,
            users: [
                account(manager, 'Mara', 'Manager', ['manager']),
                account(author, 'Ada', 'Author', ['author']),
            ],
        });
        await ojsApi.createSubmission({tag, context: tag, submitter: author, title: `arta ${tag}`});
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `copy ${tag}`,
            decisions: ['skipExternalReview'],
        });
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `prod ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
        });
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `pubs ${tag}`, published: true,
        });

        // Landing: sign in on the journal's login page: a Journal Manager
        // lands on the editorial dashboard, "Assigned to me" view (Rule 1;
        // landing precedence owned by U22 "Landing"), under the sidebar's
        // "Editor Dashboard" group with the "Search submissions" box at
        // its top.
        await page.goto(`/index.php/${tag}/login`);
        const login = new LoginPage(page);
        await login.signIn(manager, manager + manager);
        await page.waitForURL((url) => url.pathname.includes('/dashboard/editorial'), {
            waitUntil: 'commit',
        });
        const dash = new EditorialDashboardPage(page, tag);
        await dash.expectViewHeading('Assigned to me', 0);
        await expect(dash.menuGroupLink()).toBeVisible();
        await expect(dash.globalSearchBox()).toBeVisible();
        // The control: an empty view shows a single "No Items" row (Rule 5).
        await expect(page.getByText('No Items')).toBeVisible();

        // The "Reviews overdue" badge is colored (the attention variant,
        // fn-d) while it reads 0; the other badges are plain, a zero one and
        // a non-zero one read the same way as the controls (Rule 1).
        await dash.expectViewCount('Reviews overdue', 0);
        await expect(dash.viewBadge('Reviews overdue')).toHaveClass(/\bbg-attention\b/);
        await dash.expectViewCount('Needs reviews', 0);
        await expect(dash.viewBadge('Needs reviews')).not.toHaveClass(/\bbg-attention\b/);
        await dash.expectViewCount('Active submissions', 3);
        await expect(dash.viewBadge('Active submissions')).not.toHaveClass(/\bbg-attention\b/);

        // The table: the heading names the view with its count ("Published
        // (1)") over the six columns; a Stage cell names the stage in plain
        // text with a small colored dot beside it (Rule 5).
        await dash.openView('Published');
        await dash.expectViewHeading('Published', 1);
        for (const name of ['ID', 'Submissions', 'Stage', 'Days', 'Editorial Activity', 'Actions']) {
            await expect(dash.columnHeader(name)).toBeVisible();
        }
        await expect(dash.columnHeader('Status')).toHaveCount(0); // positive control for the name match
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 3);
        const activeRow = dash.row(`arta ${tag}`);
        await expect(dash.stageCell(activeRow)).toHaveText(/^\s*Submission\s*$/);
        await expect(dash.stageDot(activeRow)).toBeVisible();

        // The views: walk the manager's full roster (Rule 2): each sidebar
        // entry opens the list under its own heading with its count, and
        // the entry's badge carries the same number; the published
        // submission under "Published" ("Published (1)"), the others under
        // "Active submissions". "Needs editor" is pinned to its own badge:
        // which of the seeded rows count as editor-less is the seed's, not
        // the scenario's, claim.
        const roster = [
            ['Active submissions', 3],
            ['Needs editor', null],
            ['All in submission stage', 1],
            ['Needs reviews', 0],
            ['Awaiting reviews', 0],
            ['Reviews submitted', 0],
            ['Reviews overdue', 0],
            ['Author revisions submitted', 0],
            ['All in review stage', 0],
            ['All in copyediting stage', 1],
            ['All in production stage', 1],
            ['Scheduled for publication', 0],
            ['Published', 1],
            ['Declined', 0],
        ];
        for (const [name, pinned] of roster) {
            const count = pinned === null ? await dash.readViewCount(name) : pinned;
            await dash.openView(name);
            await dash.expectViewHeading(name, count);
            await dash.expectViewCount(name, count);
            if (name === 'Published') {
                await expect(dash.row(`pubs ${tag}`)).toBeVisible();
                await expect(dash.row(`arta ${tag}`)).toHaveCount(0);
            }
            if (name === 'Active submissions') {
                for (const title of [`arta ${tag}`, `copy ${tag}`, `prod ${tag}`]) {
                    await expect(dash.row(title)).toBeVisible();
                }
                await expect(dash.row(`pubs ${tag}`)).toHaveCount(0);
            }
        }
        // Control: the last view (Declined) reads 0 and shows "No Items".
        await expect(page.getByText('No Items')).toBeVisible();
        await expect(dash.row(`arta ${tag}`)).toHaveCount(0);

        // The stage views: the copyediting submission under "All in
        // copyediting stage", its activity cell reading "Copyedited Files
        // Uploaded: {count}" (a seeded submission carries no files, so the
        // label is matched and the number read — fn-s1); the production one
        // under "All in production stage" with an empty activity cell
        // (Rules 9g, 9i).
        await dash.openView('All in copyediting stage');
        await dash.expectViewHeading('All in copyediting stage', 1);
        const copyRow = dash.row(`copy ${tag}`);
        await expect(copyRow).toBeVisible();
        await expect(dash.stageCell(copyRow)).toHaveText(/^\s*Copyediting\s*$/);
        await expect(dash.activityCell(copyRow)).toHaveText(/^\s*Copyedited Files Uploaded: \d+\s*$/);
        await expect(dash.row(`prod ${tag}`)).toHaveCount(0);
        await dash.openView('All in production stage');
        await dash.expectViewHeading('All in production stage', 1);
        const prodRow = dash.row(`prod ${tag}`);
        await expect(prodRow).toBeVisible();
        await expect(dash.stageCell(prodRow)).toHaveText(/^\s*Production\s*$/);
        await expect(dash.activityCell(prodRow)).toHaveText(/^\s*$/);
        await expect(dash.row(`copy ${tag}`)).toHaveCount(0);
    });

    test('S2: assigned-only scope', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const se = `${tag}se`;
        const author = `${tag}au`;
        const manager = `${tag}mg`;
        // The Section Editor holds no section (a submit auto-assigns nobody)
        // and the Reviewer role too, for the reviewer leg (fn-s2).
        await ojsApi.createContext({
            tag,
            users: [
                account(se, 'Sela', 'Sectioneditor', ['sectionEditor', 'externalReviewer']),
                account(author, 'Ada', 'Author', ['author']),
                account(manager, 'Mara', 'Manager', ['manager']),
            ],
        });
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `asg${tag}`,
            participants: [{username: se, role: 'sectionEditor'}],
        });
        await ojsApi.createSubmission({tag, context: tag, submitter: author, title: `uns${tag}`});
        // "Authored study": submitted by the Section Editor's own account.
        await ojsApi.createSubmission({tag, context: tag, submitter: se, title: `own${tag}`});
        // "Reviewed study": the Section Editor is on it as a reviewer only.
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `rev${tag}`,
            decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [{username: se, status: 'invited'}]}],
        });

        // Every view: only the assigned submission is listed (Rule 3); the
        // unassigned one, the one they authored and the one they review
        // appear in none of their views.
        const sePage = await (await asUser(se)).newPage();
        const seDash = new EditorialDashboardPage(sePage, tag);
        await seDash.goto();
        const seViews = [
            ['Assigned to me', 1],
            ['Active submissions', 1],
            ['All in submission stage', 1],
            ['Needs reviews', 0],
            ['Awaiting reviews', 0],
            ['Reviews submitted', 0],
            ['Reviews overdue', 0],
            ['Author revisions submitted', 0],
            ['All in review stage', 0],
            ['All in copyediting stage', 0],
            ['All in production stage', 0],
            ['Scheduled for publication', 0],
            ['Published', 0],
        ];
        for (const [name, count] of seViews) {
            await seDash.openView(name);
            await seDash.expectViewHeading(name, count);
            await expect(seDash.row(`uns${tag}`)).toHaveCount(0);
            await expect(seDash.row(`own${tag}`)).toHaveCount(0);
            await expect(seDash.row(`rev${tag}`)).toHaveCount(0);
            if (count > 0) {
                await expect(seDash.row(`asg${tag}`)).toBeVisible();
            }
        }

        // Global search: Rule 7 applies Rule 3's scope, so the unassigned,
        // the authored and the reviewed submission each return "Search
        // Results (0)". Positive control: the same search finds the
        // assigned one.
        for (const title of [`uns${tag}`, `own${tag}`, `rev${tag}`]) {
            await seDash.globalSearch(title);
            await seDash.expectViewHeading('Search Results', 0);
            await expect(sePage.getByText('No Items')).toBeVisible();
        }
        await seDash.globalSearch(`asg${tag}`);
        await seDash.expectViewHeading('Search Results', 1);
        await expect(seDash.row(`asg${tag}`)).toBeVisible();

        // The submission they authored sits under their "My Submissions as
        // Author" sidebar group.
        const seMySub = new MySubmissionsPage(sePage, tag);
        await seMySub.goto();
        await expect(seMySub.menuGroupLink()).toBeVisible();
        await expect(seMySub.row(`own${tag}`)).toBeVisible();
        await expect(seMySub.row(`uns${tag}`)).toHaveCount(0);

        // Control: a Journal Manager's "Active submissions" lists all four,
        // while their own "Assigned to me" lists only their assignments —
        // none here (Rule 2).
        const mgPage = await (await asUser(manager)).newPage();
        const mgDash = new EditorialDashboardPage(mgPage, tag);
        await mgDash.goto();
        await mgDash.expectViewHeading('Assigned to me', 0);
        await mgDash.expectViewCount('Assigned to me', 0);
        await mgDash.openView('Active submissions');
        await mgDash.expectViewHeading('Active submissions', 4);
        for (const title of [`asg${tag}`, `uns${tag}`, `own${tag}`, `rev${tag}`]) {
            await expect(mgDash.row(title)).toBeVisible();
        }
    });

    test('S3: search within a view', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        await ojsApi.createContext({
            tag,
            users: [
                account(manager, 'Mara', 'Manager', ['manager']),
                account(author, 'Ada', 'Author', ['author']),
            ],
        });
        for (const title of [`arta${tag}`, `artb${tag}`, `artc${tag}`]) {
            await ojsApi.createSubmission({tag, context: tag, submitter: author, title});
        }
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `pubs${tag}`, published: true,
        });

        const page = await (await asUser(manager)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 3);

        // The search box narrows the CURRENT view: the heading keeps the
        // view's name, the count follows, and the phrase shows as a chip
        // (Rule 6).
        await expect(dash.searchBox()).toHaveAccessibleName(/Search submissions, ID, authors, keywords, etc\./);
        await dash.searchFor(`arta${tag}`);
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`arta${tag}`)).toBeVisible();
        await expect(dash.row(`artb${tag}`)).toHaveCount(0);
        await expect(dash.searchChip()).toContainText(`arta${tag}`);

        // The chip's X restores the full view, the count with it.
        await dash.clearSearchChip();
        await dash.expectViewHeading('Active submissions', 3);
        await expect(dash.row(`artb${tag}`)).toBeVisible();
        await expect(dash.searchChip()).toHaveCount(0);

        // A filter on top of the search: the filter's chip joins the search
        // chip, "Clear Filters" appears beside them, and the list holds only
        // the rows matching both (a 30-day floor on today's rows: none,
        // fn-s3).
        await dash.searchFor(`arta${tag}`);
        await dash.expectViewHeading('Active submissions', 1);
        await dash.openFilters();
        await dash.setDaysSinceLastActivity(30);
        await dash.applyFilters();
        await expect(dash.searchChip(`arta${tag}`)).toBeVisible();
        await expect(dash.filterChip('Days since last activity')).toBeVisible();
        await expect(dash.clearFiltersButton()).toBeVisible();
        await dash.expectViewHeading('Active submissions', 0);
        await expect(page.getByText('No Items')).toBeVisible();

        // Switching views drops both chips and empties the search box; back
        // on "Active submissions" the full view shows (Rules 6, 8).
        await dash.openView('Published');
        await dash.expectViewHeading('Published', 1);
        await expect(dash.row(`pubs${tag}`)).toBeVisible();
        await expect(dash.searchChip()).toHaveCount(0);
        await expect(dash.filterChip('Days since last activity')).toHaveCount(0);
        await expect(dash.clearFiltersButton()).toHaveCount(0);
        await expect(dash.searchBox()).toHaveValue('');
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 3);
        await expect(dash.searchBox()).toHaveValue('');

        // Control: the in-page box narrows the current view and never
        // reaches beyond it: the published submission's title finds
        // nothing on "Active submissions".
        await dash.searchFor(`pubs${tag}`);
        await dash.expectViewHeading('Active submissions', 0);
        await expect(page.getByText('No Items')).toBeVisible();

        // Mailbox: none of the above sent an email (Side effects). The
        // scenario's recipients are its own throwaway accounts (A8); the
        // heading read above is the settled end of the last action.
        expect(await pkpMail.count({to: `${manager}@mail.test`})).toBe(0);
        expect(await pkpMail.count({to: `${author}@mail.test`})).toBe(0);
    });

    test('S4: global search', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        await ojsApi.createContext({
            tag,
            users: [
                account(manager, 'Mara', 'Manager', ['manager']),
                account(author, 'Ada', 'Author', ['author']),
            ],
        });
        // One declined submission (declined from the Submission stage so its
        // activity cell stays quiet — fn-s4), plus an active one as noise.
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `decl${tag}`,
            decisions: ['initialDecline'],
        });
        await ojsApi.createSubmission({tag, context: tag, submitter: author, title: `acta${tag}`});

        const page = await (await asUser(manager)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();
        // Start the search from a non-default view (fn-s4).
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 1);
        // Positive control for the search view's missing in-page box.
        await expect(dash.searchBox()).toBeVisible();

        // The sidebar box opens the "Search Results" view — the declined
        // submission listed with its Stage cell reading "Declined" — with
        // the phrase as a chip and no in-page search box (Rule 7).
        await dash.globalSearch(`decl${tag}`);
        await dash.expectViewHeading('Search Results', 1);
        const declRow = dash.row(`decl${tag}`);
        await expect(declRow).toBeVisible();
        await expect(dash.stageCell(declRow)).toHaveText(/^\s*Declined\s*$/);
        await expect(dash.searchChip()).toContainText(`decl${tag}`);
        await expect(dash.searchBox()).toHaveCount(0);

        // Filters on the results: a filter chip joins the phrase chip, the
        // list keeps only the results idle for 30 days or more (none of
        // today's rows), and the view is still "Search Results".
        await dash.openFilters();
        await dash.setDaysSinceLastActivity(30);
        await dash.applyFilters();
        await expect(dash.filterChip('Days since last activity')).toBeVisible();
        await expect(dash.searchChip(`decl${tag}`)).toBeVisible();
        await dash.expectViewHeading('Search Results', 0);
        await expect(declRow).toHaveCount(0);

        // Clearing the phrase alone: the view stays "Search Results", the
        // filter chip still active.
        await dash.clearSearchChip();
        await expect(dash.searchChip()).toHaveCount(0);
        await dash.expectViewHeading('Search Results');
        await expect(dash.filterChip('Days since last activity')).toBeVisible();
        await expect(dash.searchBox()).toHaveCount(0);

        // Clearing the filter too: the page returns to "Active submissions",
        // the view the search started from, with its in-page box back.
        await dash.clearFiltersButton().click();
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`acta${tag}`)).toBeVisible();
        await expect(dash.filterChip('Days since last activity')).toHaveCount(0);
        await expect(dash.searchBox()).toBeVisible();

        // Control: only the sidebar's search reaches a declined submission
        // from here: the in-page box finds nothing.
        await dash.searchFor(`decl${tag}`);
        await dash.expectViewHeading('Active submissions', 0);
        await expect(page.getByText('No Items')).toBeVisible();
    });

    test('S5: filter the list', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s5', testInfo);
        const manager = `${tag}mg`;
        const se = `${tag}se`;
        const author = `${tag}au`;
        const SECOND_SECTION = 'Second section';
        // A two-section journal (the first entry renames the default
        // section, fn-s5) with the Section Editor assigned to one
        // submission and a second submission in the second section.
        await ojsApi.createContext({
            tag,
            sections: [
                {abbrev: 'ART', title: 'Articles'},
                {abbrev: 'SEC', title: SECOND_SECTION},
            ],
            users: [
                account(manager, 'Mara', 'Manager', ['manager']),
                account(se, 'Sela', 'Sectioneditor', ['sectionEditor']),
                account(author, 'Ada', 'Author', ['author']),
            ],
        });
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `acta ${tag}`,
            participants: [{username: se, role: 'sectionEditor'}],
        });
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `actb ${tag}`, section: 'SEC',
        });
        // A published one, so "Published" has a full list to show after the
        // view switch.
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `pubs ${tag}`, published: true,
        });

        const page = await (await asUser(manager)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 2);

        // "Filters": a side panel titled "Filters" with "Days since last
        // activity", "Clear Filters" and "Apply Filters".
        let modal = await dash.openFilters();
        await expect(modal.getByText('Filters', {exact: true}).first()).toBeVisible();
        await expect(modal.getByText('Days since last activity')).toBeVisible();
        await expect(modal.getByRole('button', {name: 'Clear Filters', exact: true})).toBeVisible();
        await expect(modal.getByRole('button', {name: 'Apply Filters', exact: true})).toBeVisible();

        // Applying a Days value closes the panel, narrows the view (both
        // rows are fresh, so a 30-day floor leaves nothing — fn-s5), the
        // count follows, and a chip shows above the table with "Clear
        // Filters" beside it (Rule 8).
        await dash.setDaysSinceLastActivity(30);
        await dash.applyFilters();
        await expect(dash.filterChip('Days since last activity')).toBeVisible();
        await expect(dash.clearFiltersButton()).toBeVisible();
        await dash.expectViewHeading('Active submissions', 0);
        await expect(page.getByText('No Items')).toBeVisible();

        // "Clear Filters" restores the view.
        await dash.clearFiltersButton().click();
        await dash.expectViewHeading('Active submissions', 2);
        await expect(dash.filterChip('Days since last activity')).toHaveCount(0);

        // "Section": tick the second section and apply: the list narrows to
        // the submission in that section, with a chip for the filter above
        // the table (Fields table); "Clear Filters" restores the view.
        modal = await dash.openFilters();
        await expect(modal.getByText('Section', {exact: true})).toBeVisible();
        await expect(dash.filterCheckbox('Articles')).toBeVisible(); // positive control for the field
        await dash.filterCheckbox(SECOND_SECTION).check();
        await dash.applyFilters();
        await expect(dash.filterChip(`Section: ${SECOND_SECTION}`)).toBeVisible();
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`actb ${tag}`)).toBeVisible();
        await expect(dash.row(`acta ${tag}`)).toHaveCount(0);
        await dash.clearFiltersButton().click();
        await dash.expectViewHeading('Active submissions', 2);
        await expect(dash.filterChip('Section:')).toHaveCount(0);
        await expect(dash.row(`acta ${tag}`)).toBeVisible();

        // "Assigned To Editor": the manager's panel lists the field, and its
        // suggest list offers nothing until a name is typed; type the
        // Section Editor's name, pick them and apply: the list narrows to
        // the submission they are assigned to, with a chip for the filter.
        modal = await dash.openFilters();
        await expect(modal.getByText('Assigned To Editor')).toBeVisible();
        const editorField = dash.filterSuggestField('Assigned To Editor');
        await editorField.click();
        await expect(dash.suggestOptions()).toHaveCount(0);
        await editorField.pressSequentially('Sela', {delay: 25});
        await expect(dash.suggestOptions().filter({hasText: 'Sela Sectioneditor'})).toBeVisible();
        await expect(dash.suggestOptions()).toHaveCount(1);
        await dash.pickSuggestOption('Sela Sectioneditor');
        await dash.applyFilters();
        const editorChip = 'Assigned To Editor: Sela Sectioneditor';
        await expect(dash.filterChip(editorChip)).toBeVisible();
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`acta ${tag}`)).toBeVisible();
        await expect(dash.row(`actb ${tag}`)).toHaveCount(0);

        // A chip's X: with that filter still active, add the Days filter at
        // 30 (the list empties), then press the Days chip's X: that chip
        // alone goes, the editor's chip stays, and the list shows the
        // Section Editor's submission again.
        await dash.openFilters();
        await dash.setDaysSinceLastActivity(30);
        await dash.applyFilters();
        await expect(dash.filterChip('Days since last activity')).toBeVisible();
        await expect(dash.filterChip(editorChip)).toBeVisible();
        await dash.expectViewHeading('Active submissions', 0);
        await expect(page.getByText('No Items')).toBeVisible();
        await dash.filterChipButton('Days since last activity').click();
        await expect(dash.filterChip('Days since last activity')).toHaveCount(0);
        await expect(dash.filterChip(editorChip)).toBeVisible();
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`acta ${tag}`)).toBeVisible();
        await expect(dash.row(`actb ${tag}`)).toHaveCount(0);

        // Switching views: with the editor's chip still active, open
        // "Published": the chip is gone and the view shows its full list.
        await dash.openView('Published');
        await dash.expectViewHeading('Published', 1);
        await expect(dash.row(`pubs ${tag}`)).toBeVisible();
        await expect(dash.filterChip(editorChip)).toHaveCount(0);
        await expect(dash.filterChip('Days since last activity')).toHaveCount(0);
        await expect(dash.clearFiltersButton()).toHaveCount(0);

        // Control: a Section Editor's panel has no "Assigned To Editor"
        // field, while the Days field is there.
        const sePage = await (await asUser(se)).newPage();
        const seDash = new EditorialDashboardPage(sePage, tag);
        await seDash.goto();
        const seModal = await seDash.openFilters();
        await expect(seModal.getByText('Days since last activity')).toBeVisible();
        await expect(seModal.getByText('Assigned To Editor')).toHaveCount(0);
        await expect(seDash.filterSuggestField('Assigned To Editor')).toHaveCount(0);
    });

    test('S6: open a submission in place', {tag: '@smoke'}, async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s6', testInfo);
        const {submissionId} = await ojsApi.createSubmission({
            tag, context: JOURNAL, submitter: 'author.alex', title: `view ${tag}`,
        });

        const page = await (await asUser('manager.maya')).newPage();
        const dash = new EditorialDashboardPage(page, JOURNAL);
        await dash.goto();
        await dash.openView('Active submissions');
        const row = await dash.findRowByTag(tag);
        const urlBefore = page.url();

        // "View" opens the workflow as a panel over the list; the address
        // records which submission is open (Rule 11).
        await dash.viewButton(row).click();
        await dash.expectWorkflowOpen();
        expect(page.url()).toContain(`workflowSubmissionId=${submissionId}`);

        // Reload: that address reopens the panel on the same submission.
        await page.reload();
        await dash.expectWorkflowOpen();
        await expect(dash.workflowDialog()).toContainText(`view ${tag}`);

        // Close: the list is back as it was left, at the address it had
        // before "View".
        await dash.closeWorkflow();
        await expect(dash.row(tag)).toBeVisible();
        expect(normalizedUrl(page.url())).toBe(normalizedUrl(urlBefore));

        // Control: reloading the address after closing brings the bare
        // list, no panel.
        await page.reload();
        await expect(dash.row(tag)).toBeVisible({timeout: 30_000});
        await expect(dash.workflowDialog()).toHaveCount(0);
    });

    test('S7: sort and page', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        const ROWS = 31; // one page of 30 plus one, for the paging leg (fn-s7)
        await ojsApi.createContext({
            tag,
            users: [
                account(manager, 'Mara', 'Manager', ['manager']),
                account(author, 'Ada', 'Author', ['author']),
            ],
        });
        // Only the two ends are ordered — "ida" is seeded first and "idc"
        // last, so the ids the sort legs read ascend with those titles. The
        // filler rows in between carry no order of their own, so they are
        // seeded in small concurrent batches: the worker's server takes them
        // one at a time either way, and the batch only keeps it from idling
        // between seeds (small enough that a queued seed never sits out its
        // own request timeout).
        await ojsApi.createSubmission({tag, context: tag, submitter: author, title: `ida${tag}`});
        await ojsApi.createSubmission({tag, context: tag, submitter: author, title: `idb${tag}`});
        const fillers = Array.from({length: ROWS - 3}, (unused, i) => `fill${i}${tag}`);
        const BATCH = 4;
        for (let i = 0; i < fillers.length; i += BATCH) {
            await Promise.all(
                fillers
                    .slice(i, i + BATCH)
                    .map((title) => ojsApi.createSubmission({tag, context: tag, submitter: author, title}))
            );
        }
        await ojsApi.createSubmission({tag, context: tag, submitter: author, title: `idc${tag}`});

        const page = await (await asUser(manager)).newPage();
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

        // First click on "ID": descending, recorded in the address (Rules
        // 4–5). The third, switch-off click is a Planned item (the guard
        // for the retired A5).
        const idHeader = dash.sortButton('ID');
        await idHeader.click();
        await expect(page).toHaveURL(/sortColumn=id/);
        await expect(page).toHaveURL(/sortDirection=descending/);
        await expect(firstDataRow).toContainText(`idc${tag}`);

        // Second click flips to ascending, address following.
        await idHeader.click();
        await expect(page).toHaveURL(/sortDirection=ascending/);
        await expect(firstDataRow).toContainText(`ida${tag}`);

        // The "Days" header sorts by idle time the same way (all three rows
        // share today's activity date, so only the recorded sort is
        // asserted, not an order between equals — fn-s7).
        const daysHeader = dash.sortButton('Days');
        await daysHeader.click();
        await expect(page).toHaveURL(/sortColumn=lastActivity/);
        await expect(page).toHaveURL(/sortDirection=descending/);
        await daysHeader.click();
        await expect(page).toHaveURL(/sortDirection=ascending/);

        // Control: reloading the sorted address brings the rows back in the
        // same order.
        await idHeader.click();
        await expect(page).toHaveURL(/sortColumn=id/);
        await expect(page).toHaveURL(/sortDirection=descending/);
        await expect(firstDataRow).toContainText(`idc${tag}`);
        await page.reload();
        await dash.expectViewHeading('Active submissions', ROWS);
        await expect(firstDataRow).toContainText(`idc${tag}`);
    });

    test('S8: triage a new submission', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        const manager = `${tag}mg`;
        const se = `${tag}se`;
        const author = `${tag}au`;
        await ojsApi.createContext({
            tag,
            users: [
                account(manager, 'Mara', 'Manager', ['manager']),
                account(se, 'Sela', 'Sectioneditor', ['sectionEditor']),
                account(author, 'Ada', 'Author', ['author']),
            ],
        });
        // A fresh submission nobody is assigned to (the scratch journal's
        // section has no section editors, so the wizard-parity auto-assign
        // assigns nobody).
        await ojsApi.createSubmission({tag, context: tag, submitter: author, title: `tri ${tag}`});

        const page = await (await asUser(manager)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();

        // "Needs editor": it lists there and under "All in submission stage"
        // (Rule 2).
        await dash.expectViewCount('Needs editor', 1);
        await dash.openView('Needs editor');
        await dash.expectViewHeading('Needs editor', 1);
        await expect(dash.row(`tri ${tag}`)).toBeVisible();
        await dash.openView('All in submission stage');
        await dash.expectViewHeading('All in submission stage', 1);
        await expect(dash.row(`tri ${tag}`)).toBeVisible();

        // "Assign Editor": its activity cell offers the button (Rule 9d);
        // it opens the "Assign Participant" window; assign the Section
        // Editor through it (the form is Stage participants').
        await dash.openView('Active submissions');
        const row = dash.row(`tri ${tag}`);
        await expect(dash.assignEditorButton(row)).toBeVisible();
        await dash.assignEditorButton(row).click();
        const modal = page
            .getByRole('dialog')
            .filter({has: page.locator('select[name="filterUserGroupId"]')});
        await expect(modal).toContainText('Assign Participant');
        await completeAssignParticipantForm(page, {
            group: 'Section editor',
            name: 'Sectioneditor',
            searchName: 'Sectioneditor',
        });

        // Back on the list: the button is gone and the cell is empty, the
        // row has left "Needs editor", and the badge and the heading total
        // moved without a reload (Rules 9d, 9i, 13).
        await expect(dash.assignEditorButton(row)).toHaveCount(0, {timeout: 30_000});
        await expect(row).toBeVisible();
        await expect(dash.activityCell(row)).toHaveText(/^\s*$/);
        await dash.expectViewCount('Needs editor', 0);
        await dash.expectViewCount('Active submissions', 1);
        await dash.openView('Needs editor');
        await dash.expectViewHeading('Needs editor', 0);
        await expect(page.getByText('No Items')).toBeVisible();

        // Control: the row still lists under "Active submissions" and "All
        // in submission stage".
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`tri ${tag}`)).toBeVisible();
        await dash.openView('All in submission stage');
        await dash.expectViewHeading('All in submission stage', 1);
        await expect(dash.row(`tri ${tag}`)).toBeVisible();
    });

    test('S9: review activity at a glance', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s9', testInfo);
        // Four submissions in external review round 1: one with no
        // reviewers, one with two invitations out and a third reviewer who
        // declined, one with revisions requested this round and one with
        // revisions to be taken to a new round (fn-s9).
        await ojsApi.createSubmission({
            tag, context: JOURNAL, submitter: 'author.alex', title: `norev ${tag}`,
            decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: []}],
        });
        const {submissionId: twoRevId} = await ojsApi.createSubmission({
            tag, context: JOURNAL, submitter: 'author.alex', title: `tworev ${tag}`,
            decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [
                {username: 'reviewer.julia', status: 'invited'},
                {username: 'reviewer.paul', status: 'invited'},
                {username: 'reviewer.amara', status: 'declined'},
            ]}],
        });
        await ojsApi.createSubmission({
            tag, context: JOURNAL, submitter: 'author.alex', title: `revreq ${tag}`,
            decisions: ['sendExternalReview', 'requestRevisions'],
        });
        await ojsApi.createSubmission({
            tag, context: JOURNAL, submitter: 'author.alex', title: `resub ${tag}`,
            decisions: ['sendExternalReview', 'resubmit'],
        });

        const page = await (await asUser('manager.maya')).newPage();
        const dash = new EditorialDashboardPage(page, JOURNAL);
        await dash.goto();
        await dash.openView('Active submissions');
        await dash.searchFor(tag);
        const rowNoRev = dash.row(`norev ${tag}`);
        const rowTwoRev = dash.row(`tworev ${tag}`);
        await expect(rowNoRev).toBeVisible();
        await expect(rowTwoRev).toBeVisible();
        /** Re-list the tagged rows on a view after the reviewer acted in
         * their own session: a fresh page load, because clicking the view
         * already open neither refetches nor clears the in-page phrase. */
        const relist = async (view) => {
            await dash.goto();
            await dash.openView(view);
            await dash.searchFor(tag);
            await expect(rowTwoRev).toBeVisible({timeout: 30_000});
        };

        // No reviewers yet: the cell offers "Assign Reviewers", which opens
        // the Add Reviewer window (Rule 9e); close it.
        await expect(dash.assignReviewersButton(rowNoRev)).toBeVisible();
        await dash.assignReviewersButton(rowNoRev).click();
        const addReviewerModal = page
            .getByRole('dialog')
            .filter({has: page.locator('.listPanel--selectReviewer')});
        await expect(
            addReviewerModal.getByRole('heading', {name: 'Add Reviewer'})
        ).toBeVisible({timeout: 30_000});
        await expect(
            addReviewerModal.locator('.listPanel--selectReviewer input.pkpSearch__input')
        ).toBeVisible({timeout: 30_000});
        // The window's initial (search) face has no Cancel — close via the
        // side modal's own Close control.
        await addReviewerModal
            .getByRole('button', {name: 'Close', exact: true})
            .first()
            .click();
        await expect(addReviewerModal).toHaveCount(0, {timeout: 30_000});

        // Two requests out: two countdown indicators and an icon for the
        // declined reviewer (Rule 10), and the submission lists under
        // "Awaiting reviews" (Rule 2; read below, after the popover legs,
        // from that view).
        const awaiting = dash.activityIndicator(rowTwoRev, /Awaiting Response from the reviewer/);
        await expect(awaiting).toHaveCount(2);
        const declined = dash.activityIndicator(rowTwoRev, /Review Request declined on/);
        await expect(declined).toHaveCount(1);

        // A popover: it names the reviewer, the review type and the status,
        // with the three working buttons (Rule 10). The two awaiting
        // indicators carry the same accessible name and arrive in either
        // order, so the one opened is picked by the reviewer its popover
        // names, after both have rendered (ci-triage, 2026-09-13).
        const popover = await dash.openActivityPopoverFor(
            rowTwoRev, /Awaiting Response from the reviewer/, 'Julia Reviewer', {count: 2}
        );
        await expect(popover).toContainText('Awaiting Response from the reviewer');
        await expect(popover).toContainText('Julia Reviewer');
        await expect(popover).toContainText('Anonymous Reviewer/Anonymous Author');
        await expect(popover.getByRole('button', {name: 'Edit Due Date', exact: true})).toBeVisible();
        await expect(popover.getByRole('button', {name: 'View details', exact: true})).toBeVisible();
        await expect(popover.getByRole('button', {name: 'Unassign', exact: true})).toBeVisible();
        await expect(popover.getByRole('button', {name: 'Cancel Reviewer', exact: true})).toHaveCount(0);

        // The declined reviewer's popover: "Review Request declined on
        // {date}", with "Resend Review Request", "View details" and "Cancel
        // Reviewer" (the declined row of the Rule 10 table).
        await dash.closeActivityPopover(rowTwoRev);
        await declined.click();
        const declinedPopover = dash.activityPopover(rowTwoRev);
        await expect(declinedPopover).toContainText(/Review Request declined on \d{4}-\d{2}-\d{2}/);
        await expect(declinedPopover).toContainText('Amara Reviewer');
        await expect(declinedPopover.getByRole('button', {name: 'Resend Review Request', exact: true})).toBeVisible();
        await expect(declinedPopover.getByRole('button', {name: 'View details', exact: true})).toBeVisible();
        await expect(declinedPopover.getByRole('button', {name: 'Cancel Reviewer', exact: true})).toBeVisible();
        await expect(declinedPopover.getByRole('button', {name: 'Unassign', exact: true})).toHaveCount(0);
        await dash.closeActivityPopover(rowTwoRev);

        // "View details": the window the workflow's Reviewers panel opens
        // for that reviewer ("Review Details: {title}") appears; closing it
        // reloads the list.
        await dash.openActivityPopoverFor(
            rowTwoRev, /Awaiting Response from the reviewer/, 'Julia Reviewer', {count: 2}
        );
        await popover.getByRole('button', {name: 'View details', exact: true}).click();
        const details = reviewDetailsModal(page);
        await expect(details).toBeVisible({timeout: 30_000});
        let refetch = dash.listReload();
        await closeReviewDetails(page, details);
        await refetch;
        await expect(rowTwoRev).toBeVisible({timeout: 30_000});
        await dash.closeActivityPopover(rowTwoRev);

        // The submission lists under "Awaiting reviews".
        await dash.openView('Awaiting reviews');
        await dash.searchFor(tag);
        await expect(dash.row(`tworev ${tag}`)).toBeVisible({timeout: 30_000});

        // Reviewer: one of the two accepts the request (the reviewer's own
        // wizard, U28).
        const juliaPage = await (await asUser('reviewer.julia')).newPage();
        await acceptReviewRequest(juliaPage, JOURNAL, twoRevId);

        // The accepted request: back on the list, that reviewer's indicator
        // is still a countdown ring; its popover reads "Ongoing review -
        // request accepted", with "Edit Due Date", "View details" and
        // "Cancel Reviewer" (positive control for the change: the awaiting
        // indicators are down to one).
        await relist('Active submissions');
        const accepted = dash.activityIndicator(rowTwoRev, /Ongoing review - request accepted/);
        await expect(accepted).toHaveCount(1);
        await expect(dash.activityIndicator(rowTwoRev, /Awaiting Response from the reviewer/)).toHaveCount(1);
        await accepted.click();
        const acceptedPopover = dash.activityPopover(rowTwoRev);
        await expect(acceptedPopover).toContainText('Ongoing review - request accepted');
        await expect(acceptedPopover).toContainText('Julia Reviewer');
        await expect(acceptedPopover.getByRole('button', {name: 'Edit Due Date', exact: true})).toBeVisible();
        await expect(acceptedPopover.getByRole('button', {name: 'View details', exact: true})).toBeVisible();
        await expect(acceptedPopover.getByRole('button', {name: 'Cancel Reviewer', exact: true})).toBeVisible();
        await expect(acceptedPopover.getByRole('button', {name: 'Unassign', exact: true})).toHaveCount(0);
        await dash.closeActivityPopover(rowTwoRev);

        // Reviewer: the same reviewer submits their review.
        await performReview(juliaPage, JOURNAL, twoRevId, {recommendation: 'Accept Submission'});

        // The completed review: that reviewer's indicator is now a done
        // mark; its popover reads "Review completed on {date}", names the
        // recommendation (a journal), with "View unread recommendation".
        await relist('Active submissions');
        const completed = dash.activityIndicator(rowTwoRev, /Review completed on/);
        await expect(completed).toHaveCount(1);
        await expect(dash.activityIndicator(rowTwoRev, /Ongoing review - request accepted/)).toHaveCount(0);
        await completed.click();
        let completedPopover = dash.activityPopover(rowTwoRev);
        await expect(completedPopover).toContainText(/Review completed on \d{4}-\d{2}-\d{2}/);
        await expect(completedPopover).toContainText('Accept Submission');
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
        await expect(details).toBeVisible({timeout: 30_000});
        expect((await marked).ok()).toBe(true);
        refetch = dash.listReload();
        await closeReviewDetails(page, details);
        await refetch;
        await expect(rowTwoRev).toBeVisible({timeout: 30_000});
        await dash.closeActivityPopover(rowTwoRev);
        await dash.activityIndicator(rowTwoRev, /Review completed on/).click();
        completedPopover = dash.activityPopover(rowTwoRev);
        await expect(
            completedPopover.getByRole('button', {name: 'View recommendation', exact: true})
        ).toBeVisible();
        await expect(
            completedPopover.getByRole('button', {name: 'View unread recommendation', exact: true})
        ).toHaveCount(0);
        await dash.closeActivityPopover(rowTwoRev);

        // Revisions asked: the third row's cell reads "Revisions requested
        // from author" and the fourth's "Revisions requested from the
        // author to be taken to a new review round" (Rule 9e).
        const revReqCell = dash.activityCell(dash.row(`revreq ${tag}`));
        await expect(revReqCell).toContainText('Revisions requested from author');
        await expect(revReqCell).not.toContainText('new review round');
        await expect(dash.activityCell(dash.row(`resub ${tag}`))).toContainText(
            'Revisions requested from the author to be taken to a new review round'
        );

        // Control: the other reviewer's indicator is still a countdown ring
        // whose popover reads "Awaiting Response from the reviewer".
        const stillAwaiting = dash.activityIndicator(rowTwoRev, /Awaiting Response from the reviewer/);
        await expect(stillAwaiting).toHaveCount(1);
        await stillAwaiting.click();
        await expect(dash.activityPopover(rowTwoRev)).toContainText('Awaiting Response from the reviewer');
        await expect(dash.activityPopover(rowTwoRev)).toContainText('Paul Reviewer');
        await dash.closeActivityPopover(rowTwoRev);

        // The submission now lists under "Reviews submitted" too.
        await dash.openView('Reviews submitted');
        await dash.searchFor(tag);
        await expect(dash.row(`tworev ${tag}`)).toBeVisible({timeout: 30_000});
    });

    test('S10: the conflict row', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        const combo = `${tag}ma`;
        const author = `${tag}au`;
        // The combo account holds Manager, Author and Reviewer (fn-s10): one
        // submission it submitted, an unrelated one as the "View" control,
        // and a third in review with the combo account invited as its
        // reviewer.
        await ojsApi.createContext({
            tag,
            users: [
                account(combo, 'Mara', 'Combo', ['manager', 'author', 'externalReviewer']),
                account(author, 'Ada', 'Author', ['author']),
            ],
        });
        await ojsApi.createSubmission({tag, context: tag, submitter: combo, title: `own ${tag}`});
        await ojsApi.createSubmission({tag, context: tag, submitter: author, title: `other ${tag}`});
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `revd ${tag}`,
            decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [{username: combo, status: 'invited'}]}],
        });

        const page = await (await asUser(combo)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 3);

        // Their own submission's row shows the conflict notice and offers no
        // button at all (Rule 9a; the notice's role wording is register ❓
        // A3 — asserted by wording-neutral fragments only).
        const rowOwn = dash.row(`own ${tag}`);
        await expect(rowOwn).toContainText('You cannot access this submission');
        await expect(rowOwn).toContainText('My Submissions');
        await expect(dash.viewButton(rowOwn)).toHaveCount(0);
        await expect(dash.assignEditorButton(rowOwn)).toHaveCount(0);
        await expect(rowOwn.getByRole('button')).toHaveCount(0);

        // The submission they review: its activity cell carries a conflict
        // notice that sends them to "Review Assignments" (judged by that
        // phrase, A3), and the row offers no button either: no "View", no
        // "Assign Reviewers" and no reviewer indicator.
        const rowRevd = dash.row(`revd ${tag}`);
        await expect(rowRevd).toContainText('You cannot access this submission');
        await expect(rowRevd).toContainText('Review Assignments');
        await expect(rowRevd).not.toContainText('My Submissions');
        await expect(dash.viewButton(rowRevd)).toHaveCount(0);
        await expect(dash.assignReviewersButton(rowRevd)).toHaveCount(0);
        await expect(rowRevd.getByRole('button')).toHaveCount(0);

        // Control: the other submission's row keeps its "View" (and its
        // "Assign Editor").
        const rowOther = dash.row(`other ${tag}`);
        await expect(dash.viewButton(rowOther)).toBeVisible();
        await expect(dash.assignEditorButton(rowOther)).toBeVisible();

        // "My Submissions as Author": the same submission sits normally
        // under that sidebar group.
        const mySub = new MySubmissionsPage(page, tag);
        await mySub.goto();
        await expect(mySub.menuGroupLink()).toBeVisible();
        const myRow = mySub.row(`own ${tag}`);
        await expect(myRow).toBeVisible();
        await expect(mySub.viewButton(myRow)).toBeVisible();
    });

    test('S11: declined out of editors\' sight', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s11', testInfo);
        const manager = `${tag}mg`;
        const se = `${tag}se`;
        const author = `${tag}au`;
        await ojsApi.createContext({
            tag,
            users: [
                account(manager, 'Mara', 'Manager', ['manager']),
                account(se, 'Sela', 'Sectioneditor', ['sectionEditor']),
                account(author, 'Ada', 'Author', ['author']),
            ],
        });
        // The Section Editor's assigned submission, seeded active and
        // declined on screen below (fn-s11), plus a second assigned, active
        // one as the positive control for their views.
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `decl ${tag}`,
            participants: [{username: se, role: 'sectionEditor'}],
        });
        await ojsApi.createSubmission({
            tag, context: tag, submitter: author, title: `live ${tag}`,
            participants: [{username: se, role: 'sectionEditor'}],
        });

        // Journal Manager: on "Active submissions", press "View" on the row
        // and decline the submission from its Submission stage inside the
        // panel (the "Decline Submission" wizard belongs to U25).
        const mgPage = await (await asUser(manager)).newPage();
        const mgDash = new EditorialDashboardPage(mgPage, tag);
        await mgDash.goto();
        await mgDash.expectViewCount('Declined', 0);
        await mgDash.openView('Active submissions');
        await mgDash.expectViewHeading('Active submissions', 2);
        await mgDash.expectViewCount('Active submissions', 2);
        await mgDash.viewButton(mgDash.row(`decl ${tag}`)).click();
        await mgDash.expectWorkflowOpen();
        await mgDash.workflowDialog().getByRole('button', {name: 'Decline Submission', exact: true}).click();
        const decision = new DecisionPage(mgPage);
        await decision.expectOpen('Decline Submission');
        await decision.completeAll();

        // Close the panel: the heading total and the "Declined" badge move
        // without a reload (Rule 13; the wizard's "View Submission" returns
        // to the view it left, "Active submissions", with the panel open).
        await mgDash.expectWorkflowOpen();
        await mgDash.closeWorkflow();
        await mgDash.expectViewHeading('Active submissions', 1);
        await mgDash.expectViewCount('Declined', 1);
        await mgDash.expectViewCount('Active submissions', 1);
        await expect(mgDash.row(`live ${tag}`)).toBeVisible();
        await expect(mgDash.row(`decl ${tag}`)).toHaveCount(0);

        // Open "Declined": the row is listed with its Stage cell reading
        // "Declined" and its activity cell "Declined during the {stage}
        // stage.", and it keeps "View" (Rule 9b).
        await mgDash.openView('Declined');
        await mgDash.expectViewHeading('Declined', 1);
        const declRow = mgDash.row(`decl ${tag}`);
        await expect(mgDash.stageCell(declRow)).toHaveText(/^\s*Declined\s*$/);
        await expect(mgDash.activityCell(declRow)).toHaveText(/^\s*Declined during the Submission stage\.\s*$/);
        await expect(mgDash.viewButton(declRow)).toBeVisible();

        // Section Editor: their group has no "Declined" entry (A1) and no
        // "Needs editor" entry either (positive control: their other
        // entries render), and the submission is gone from every one of
        // their views.
        const sePage = await (await asUser(se)).newPage();
        const seDash = new EditorialDashboardPage(sePage, tag);
        await seDash.goto();
        await expect(seDash.viewLink('Active submissions')).toBeVisible();
        await expect(seDash.viewLink('All in submission stage')).toBeVisible();
        await expect(seDash.viewLink('Declined')).toHaveCount(0);
        await expect(seDash.viewLink('Needs editor')).toHaveCount(0);
        const seViews = [
            ['Assigned to me', 1],
            ['Active submissions', 1],
            ['All in submission stage', 1],
            ['Needs reviews', 0],
            ['Awaiting reviews', 0],
            ['Reviews submitted', 0],
            ['Reviews overdue', 0],
            ['Author revisions submitted', 0],
            ['All in review stage', 0],
            ['All in copyediting stage', 0],
            ['All in production stage', 0],
            ['Scheduled for publication', 0],
            ['Published', 0],
        ];
        for (const [name, count] of seViews) {
            await seDash.openView(name);
            await seDash.expectViewHeading(name, count);
            await expect(seDash.row(`decl ${tag}`)).toHaveCount(0);
            if (count > 0) {
                await expect(seDash.row(`live ${tag}`)).toBeVisible();
            }
        }

        // Their global search: "Search Results (1)" lists it, with "View"
        // (Rule 7 ⚠ A1 — the roster fact is the spec's rule; the product
        // question stays open).
        await seDash.globalSearch(`decl ${tag}`);
        await seDash.expectViewHeading('Search Results', 1);
        await expect(seDash.row(`decl ${tag}`)).toBeVisible();
        await expect(seDash.viewButton(seDash.row(`decl ${tag}`))).toBeVisible();

        // Deleted inside the panel: Journal Manager: on "Declined", press
        // "View" on the row, press its stage's "Delete" and confirm the
        // "Delete" dialog (U24's): the panel closes on the refreshed list,
        // from which the row is gone, and the "Declined" badge and the
        // heading total follow within a few seconds (the count reload runs
        // through a five-second trailing throttle, fn-d: the reads below
        // are auto-waited, never a reload).
        await mgDash.openView('Declined');
        await mgDash.expectViewHeading('Declined', 1);
        const workflow = new WorkflowPage(mgPage, tag);
        await workflow.openFromRow(mgDash.row(`decl ${tag}`));
        await workflow.deleteSubmission({confirm: true});
        await expect(mgDash.workflowDialog()).toHaveCount(0);
        await expect(mgDash.row(`decl ${tag}`)).toHaveCount(0);
        await expect(mgPage.getByText('No Items')).toBeVisible();
        await mgDash.expectViewCount('Declined', 0);
        await mgDash.expectViewHeading('Declined', 0);

        // Control: the Journal Manager's own group offers "Declined" and
        // "Needs editor".
        await expect(mgDash.viewLink('Declined')).toBeVisible();
        await expect(mgDash.viewLink('Needs editor')).toBeVisible();
    });

    test('S12: bulk-delete incomplete submissions', async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s12', testInfo);
        const manager = `${tag}mg`;
        const se = `${tag}se`;
        const authorA = `${tag}au`;
        const authorB = `${tag}ab`;
        await ojsApi.createContext({
            tag,
            users: [
                account(manager, 'Mara', 'Manager', ['manager']),
                account(se, 'Sela', 'Sectioneditor', ['sectionEditor']),
                account(authorA, 'Ada', 'Author', ['author']),
                account(authorB, 'Bea', 'Author', ['author']),
            ],
        });
        // Two incomplete submissions by two different authors and a
        // submitted control (fn-s12).
        await ojsApi.createSubmission({
            tag, context: tag, submitter: authorA, title: `drafta ${tag}`, submitted: false,
        });
        await ojsApi.createSubmission({
            tag, context: tag, submitter: authorB, title: `draftb ${tag}`, submitted: false,
        });
        await ojsApi.createSubmission({tag, context: tag, submitter: authorA, title: `keep ${tag}`});

        const page = await (await asUser(manager)).newPage();
        const dash = new EditorialDashboardPage(page, tag);
        await dash.goto();
        await dash.openView('Active submissions');
        await dash.expectViewHeading('Active submissions', 3);

        // The incomplete rows: each has its Stage cell reading "Incomplete",
        // offers "Complete submission" (A2: presence only) and has no
        // "View"; the submitted row has "View" (Rules 5, 9c).
        const rowA = dash.row(`drafta ${tag}`);
        const rowB = dash.row(`draftb ${tag}`);
        const rowKeep = dash.row(`keep ${tag}`);
        for (const row of [rowA, rowB]) {
            await expect(dash.stageCell(row)).toHaveText(/^\s*Incomplete\s*$/);
            await expect(dash.completeSubmissionButton(row)).toBeVisible();
            await expect(dash.viewButton(row)).toHaveCount(0);
        }
        await expect(dash.stageCell(rowKeep)).toHaveText(/^\s*Submission\s*$/);
        await expect(dash.viewButton(rowKeep)).toBeVisible();
        await expect(dash.completeSubmissionButton(rowKeep)).toHaveCount(0);

        // "More Actions" → "Delete Incomplete Submissions" puts the list in
        // selection mode: a checkbox on the two incomplete rows only,
        // "Delete Incomplete Submissions" and "Cancel" above, the delete
        // button disabled until a row is ticked (Rule 12).
        await expect(await dash.openMoreActions()).toBeEnabled();
        await dash.bulkDeleteMenuItem().click();
        await expect(dash.bulkDeleteButton()).toBeVisible({timeout: 30_000});
        await expect(dash.bulkDeleteCancelButton()).toHaveText(/^\s*Cancel\s*$/);
        await expect(rowA.getByRole('checkbox')).toBeVisible();
        await expect(rowB.getByRole('checkbox')).toBeVisible();
        await expect(rowKeep.getByRole('checkbox')).toHaveCount(0);
        await expect(dash.bulkDeleteButton()).toBeDisabled();

        /** Both incomplete rows are still listed beside the submitted one. */
        const expectNothingDeleted = async () => {
            await dash.expectViewHeading('Active submissions', 3);
            await expect(rowA).toBeVisible();
            await expect(rowB).toBeVisible();
            await expect(rowKeep).toBeVisible();
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
        // drop without a reload (Rules 12–13).
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
        await expect(rowKeep).toBeVisible();
        await dash.expectViewHeading('Active submissions', 1);
        await dash.expectViewCount('Active submissions', 1);
        await dash.expectViewCount('Needs editor', 1);

        // "More Actions" afterwards: with no incomplete row left on the
        // page, "Delete Incomplete Submissions" is grayed out (the entry was
        // enabled above, the positive control).
        await expect(await dash.openMoreActions()).toBeDisabled();
        await dash.closeMoreActions();

        // The author's own list: signed in as one of the drafts' authors, My
        // Submissions no longer lists it (positive control: their submitted
        // one is still there), and no email about the deletion arrived in
        // their mailbox (the list read is the settled end of the deletion).
        const authorPage = await (await asUser(authorA)).newPage();
        const mySub = new MySubmissionsPage(authorPage, tag);
        await mySub.goto();
        await mySub.openView('Active submissions');
        await mySub.expectViewHeading('Active submissions', 1);
        await expect(mySub.row(`keep ${tag}`)).toBeVisible();
        await expect(mySub.row(`drafta ${tag}`)).toHaveCount(0);
        await mySub.openView('Incomplete submissions');
        await mySub.expectViewHeading('Incomplete submissions', 0);
        await expect(mySub.row(`drafta ${tag}`)).toHaveCount(0);
        expect(await pkpMail.count({to: `${authorA}@mail.test`})).toBe(0);
        expect(await pkpMail.count({to: `${authorB}@mail.test`})).toBe(0);

        // Control: a Section Editor's dashboard shows no "More Actions"
        // button at all (positive control: the neighboring "Filters"
        // control renders).
        const sePage = await (await asUser(se)).newPage();
        const seDash = new EditorialDashboardPage(sePage, tag);
        await seDash.goto();
        await expect(seDash.filtersButton()).toBeVisible();
        await expect(seDash.moreActionsButton()).toHaveCount(0);
    });

    test('S13: issue filter and scheduled rows', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s13', testInfo);
        const ISSUE = 'Vol. 2 No. 1 (2015)';
        // Scheduled into the seeded unpublished issue: the builder publishes
        // through the real services, so publishing into a future issue lands
        // in the scheduled state (the fn-s13 UI caveat applies only to the
        // Schedule For Publication window, which this seed bypasses); plus
        // a second, active submission in no issue.
        await ojsApi.createSubmission({
            tag, context: JOURNAL, submitter: 'author.alex', title: `sched ${tag}`,
            decisions: ['skipExternalReview', 'sendToProduction'],
            published: true,
            issue: {volume: 2, number: 1, year: 2015},
        });
        await ojsApi.createSubmission({
            tag, context: JOURNAL, submitter: 'author.alex', title: `noiss ${tag}`,
        });

        const page = await (await asUser('manager.maya')).newPage();
        const dash = new EditorialDashboardPage(page, JOURNAL);
        await dash.goto();

        /** Tick the seeded issue in the open Filters panel and apply. */
        const applyIssueFilter = async () => {
            const modal = await dash.openFilters();
            const issuesInput = modal.getByRole('combobox', {name: 'Issues'});
            await issuesInput.click();
            await issuesInput.pressSequentially('2015', {delay: 25});
            await modal.getByRole('option', {name: ISSUE}).click();
            await dash.applyFilters();
            await expect(dash.filterChip(ISSUE)).toBeVisible();
        };

        // The scheduled row: its activity cell reads "To be published in
        // issue {issue}" and its Stage cell "Scheduled" (Rule 9h).
        await dash.openView('Scheduled for publication');
        await dash.searchFor(tag);
        const schedRow = dash.row(`sched ${tag}`);
        await expect(schedRow).toBeVisible({timeout: 30_000});
        await expect(dash.stageCell(schedRow)).toHaveText(/^\s*Scheduled\s*$/);
        await expect(schedRow).toContainText(`To be published in issue ${ISSUE}`);

        // The views: it lists under "Scheduled for publication" and no
        // longer under "Active submissions" (the tag search there finds
        // only the active one, the positive control for the absence).
        await dash.openView('Active submissions');
        await dash.searchFor(tag);
        await expect(dash.row(`noiss ${tag}`)).toBeVisible({timeout: 30_000});
        await expect(dash.row(`sched ${tag}`)).toHaveCount(0);
        await dash.expectViewHeading('Active submissions', 1);

        // "Issues": on "Active submissions" the active submission, in no
        // issue, drops out under the issue's chip; on "Scheduled for
        // publication" with the same filter the scheduled one stays listed.
        await applyIssueFilter();
        await dash.expectViewHeading('Active submissions', 0);
        await expect(dash.row(`noiss ${tag}`)).toHaveCount(0);
        await expect(page.getByText('No Items')).toBeVisible();
        await dash.openView('Scheduled for publication');
        await dash.searchFor(tag);
        await expect(dash.row(`sched ${tag}`)).toBeVisible({timeout: 30_000});
        await applyIssueFilter();
        await expect(dash.row(`sched ${tag}`)).toBeVisible();
        await dash.expectViewHeading('Scheduled for publication', 1);

        // Control: "Clear Filters" on "Active submissions" brings the active
        // submission back.
        await dash.openView('Active submissions');
        await dash.searchFor(tag);
        await expect(dash.row(`noiss ${tag}`)).toBeVisible({timeout: 30_000});
        await applyIssueFilter();
        await dash.expectViewHeading('Active submissions', 0);
        await dash.clearFiltersButton().click();
        await expect(dash.filterChip(ISSUE)).toHaveCount(0);
        await dash.expectViewHeading('Active submissions', 1);
        await expect(dash.row(`noiss ${tag}`)).toBeVisible();
    });

    test('S16: refused at the address', async ({asUser}) => {
        test.slow();
        // The seeded journal's Author-only account (fn-s16) types the
        // editorial dashboard's address by hand: the access-denied page, a
        // plain page, shows its sentence and no dashboard.
        const authorPage = await (await asUser('author.alex')).newPage();
        await authorPage.goto(`/index.php/${JOURNAL}/dashboard/editorial`);
        await expect(authorPage.getByText(ACCESS_DENIED)).toBeVisible({timeout: 30_000});
        await expect(authorPage.getByRole('heading', {name: /^Assigned to me/})).toHaveCount(0);
        await expect(authorPage.locator('#app-nav')).toHaveCount(0);
        await expect(authorPage.getByRole('dialog')).toHaveCount(0);

        // Control: the Journal Manager at the same address gets the
        // dashboard.
        const mgPage = await (await asUser('manager.maya')).newPage();
        const dash = new EditorialDashboardPage(mgPage, JOURNAL);
        await dash.goto();
        await dash.expectViewHeading('Assigned to me');
        await expect(mgPage.getByText(ACCESS_DENIED)).toHaveCount(0);
        await expect(dash.menuGroupLink()).toBeVisible();
    });

    test('S17: a review confirmed, with and without a minimum', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const MINIMUM_SENTENCE =
            'Minimum required number of reviews have been confirmed. A decision is needed.';
        const ALL_CONFIRMED_SENTENCE = 'All reviews are confirmed and a decision is needed.';
        // Two scratch journals, one at the install default of "Reviews
        // required" (no `review` key) and one with the minimum set to 1
        // through the context's passthrough key; each holds one submission
        // in review whose single reviewer has submitted their review
        // (fn-s17).
        const seedJournal = async (suffix, contextExtras) => {
            const tag = makeTag(`s17${suffix}`, testInfo);
            const manager = `${tag}mg`;
            const author = `${tag}au`;
            const reviewer = `${tag}rv`;
            await ojsApi.createContext({
                tag,
                ...contextExtras,
                users: [
                    account(manager, 'Mara', 'Manager', ['manager']),
                    account(author, 'Ada', 'Author', ['author']),
                    account(reviewer, 'Rita', 'Reviewer', ['externalReviewer']),
                ],
            });
            await ojsApi.createSubmission({
                tag, context: tag, submitter: author, title: `done ${tag}`,
                decisions: ['sendExternalReview'],
                reviewRounds: [{reviewers: [{username: reviewer, status: 'completed'}]}],
            });
            const page = await (await asUser(manager)).newPage();
            const dash = new EditorialDashboardPage(page, tag);
            return {tag, page, dash};
        };
        const withMinimum = await seedJournal('m', {review: {numReviewsPerSubmission: 1}});
        const atDefault = await seedJournal('d', {});

        /**
         * Confirm the row's submitted review from its popover: "View unread
         * recommendation" opens the "Review Details: {title}" window the
         * workflow's Reviewers panel opens; "Mark as Complete" there (U27),
         * then close it: the list reloads. Returns after the popover is
         * dismissed.
         */
        const confirmReview = async ({page, dash, tag}) => {
            const row = dash.row(`done ${tag}`);
            const completed = dash.activityIndicator(row, /Review completed on/);
            await expect(completed).toHaveCount(1);
            await completed.click();
            const popover = dash.activityPopover(row);
            await expect(popover).toContainText(/Review completed on \d{4}-\d{2}-\d{2}/);
            await popover.getByRole('button', {name: 'View unread recommendation', exact: true}).click();
            const details = reviewDetailsModal(page);
            await expect(details).toBeVisible({timeout: 30_000});
            await markReviewComplete(page, details);
            const refetch = dash.listReload();
            await closeReviewDetails(page, details);
            await refetch;
            await expect(row).toBeVisible({timeout: 30_000});
            await dash.closeActivityPopover(row);
        };

        /** The confirmed review's popover reads "Review was confirmed by
         * editor", with "View recommendation" (the confirmed row of the
         * Rule 10 table); the done mark is gone. */
        const expectConfirmedPopover = async ({page, dash, tag}) => {
            const row = dash.row(`done ${tag}`);
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

        // Before: on each journal the row's activity cell shows the
        // reviewer's indicator alone, no sentence, and the submission lists
        // under "Reviews submitted"; on the journal with the minimum it
        // lists under "Needs reviews" too.
        for (const journal of [withMinimum, atDefault]) {
            const {dash, tag} = journal;
            await dash.goto();
            await dash.expectViewCount('Reviews submitted', 1);
            await dash.openView('Reviews submitted');
            await dash.expectViewHeading('Reviews submitted', 1);
            const row = dash.row(`done ${tag}`);
            await expect(row).toBeVisible();
            await expect(dash.activityIndicator(row, /Review completed on/)).toHaveCount(1);
            await expect(dash.activityCell(row)).not.toContainText('decision is needed');
            await expect(dash.activityCell(row)).not.toContainText('confirmed');
        }
        await withMinimum.dash.expectViewCount('Needs reviews', 1);
        await withMinimum.dash.openView('Needs reviews');
        await withMinimum.dash.expectViewHeading('Needs reviews', 1);
        await expect(withMinimum.dash.row(`done ${withMinimum.tag}`)).toBeVisible();

        // Journal Manager confirms, on the journal with the minimum.
        await withMinimum.dash.openView('Active submissions');
        await withMinimum.dash.expectViewHeading('Active submissions', 1);
        await confirmReview(withMinimum);

        // The confirmed review: the popover now reads "Review was confirmed
        // by editor", with "View recommendation".
        await expectConfirmedPopover(withMinimum);

        // With a minimum set: the activity cell reads the minimum-required
        // sentence (Rule 9e).
        const minRow = withMinimum.dash.row(`done ${withMinimum.tag}`);
        await expect(withMinimum.dash.activityCell(minRow)).toContainText(MINIMUM_SENTENCE);
        await expect(withMinimum.dash.activityCell(minRow)).not.toContainText(ALL_CONFIRMED_SENTENCE);

        // At the default: the same confirmation on the other journal ends
        // with the all-confirmed sentence.
        await atDefault.dash.openView('Active submissions');
        await atDefault.dash.expectViewHeading('Active submissions', 1);
        await confirmReview(atDefault);
        await expectConfirmedPopover(atDefault);
        const defRow = atDefault.dash.row(`done ${atDefault.tag}`);
        await expect(atDefault.dash.activityCell(defRow)).toContainText(ALL_CONFIRMED_SENTENCE);
        await expect(atDefault.dash.activityCell(defRow)).not.toContainText(MINIMUM_SENTENCE);

        // Control: on the journal with the minimum, "Needs reviews" no
        // longer lists the submission once its review is confirmed
        // (positive control: "Reviews submitted" still does).
        await withMinimum.dash.expectViewCount('Needs reviews', 0);
        await withMinimum.dash.openView('Needs reviews');
        await withMinimum.dash.expectViewHeading('Needs reviews', 0);
        await expect(withMinimum.dash.row(`done ${withMinimum.tag}`)).toHaveCount(0);
        await expect(withMinimum.page.getByText('No Items')).toBeVisible();
        await withMinimum.dash.openView('Reviews submitted');
        await withMinimum.dash.expectViewHeading('Reviews submitted', 1);
        await expect(withMinimum.dash.row(`done ${withMinimum.tag}`)).toBeVisible();
    });
});
