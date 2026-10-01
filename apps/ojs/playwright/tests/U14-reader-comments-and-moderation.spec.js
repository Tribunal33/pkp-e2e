// @ts-check
/**
 * @file playwright/tests/U14-reader-comments-and-moderation.spec.js
 *
 * Reader comments & moderation — OJS suite, one test per canonical
 * scenario the spec runs on OJS (S1–S7 common; S8–S13 {OJS}; S14 is a
 * press's and a preprint server's absence scenario and has no test here).
 * Spec: docs/specs/U14-reader-comments-and-moderation.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A1 ❓
 * (S2 asserts the writer's notice on the hidden comment, the scenario's
 * own sentence, and nothing about telling the two states apart), A2 ❓
 * (S5 asserts the "pending review" row staying after "Hide Comment", the
 * scenario's sentence), A3 ❓ (S9 asserts the dialog staying open on an
 * empty reason and "Report" offered again; no second report is filed),
 * A4 ❓ (S1 asserts the page opening by address with the comment listed),
 * A5 ❓ (S1 asserts the reload onto Appearance › Theme and no "Saved"),
 * A6 🐞 (the comment panel's unverified iD link is never opened; S2's iD
 * is verified), A15 ❓ (the landing page's hollow icon is not read),
 * A7 ❓ (the "…" button is reached as the article's only button; nothing
 * asserts its name), A8 ❓ (S3 asserts both numbers leaving the address on
 * the report panel's "Close"), A9 ❓, A10 🐞 (S12 and S13 assert the rows
 * staying blank, the scenario's sentence, never what pressing them does),
 * OMP1 and OPS1 (a press's and a preprint server's). The spec's Coverage
 * section records everything else left out.
 *
 * Isolation: every test seeds its own scratch journal (or two) with
 * throwaway accounts through the scenario endpoint: the context
 * passthrough `enablePublicComments: true` and the submission key
 * `userComments[]` (scenarios.md). `publicknowledge` and the roster are
 * never touched. A batch of comments seeded in one call shares a second
 * and lists in no fixed order, so rows are located by their "Comment"
 * text, never by position, and the report "first row" of S3 is whichever
 * the table lists first. Mailpit reads (S5) are scoped by the throwaway
 * recipient and bounded by a control mail the test sends the same way
 * (Users & Roles › the row's "Email"), then the recipient's inbox holds
 * that one message alone (A8, M6). The Tasks panel is read through the
 * shared `TasksPanel`; every "no row" is read next to the manager's rows
 * of the same run. Every "nothing sent" on the landing page is bounded by
 * a short response wait (the app sends nothing on an empty reason). The
 * Comments tab's "Save" reloads the whole page: the test waits for the
 * reload, never for "Saved" (patterns.md pitfall 14). No hard-coded waits.
 * Everything runs in the parallel `ojs` project; `page` is the signed-out
 * visitor's browser and every signed-in actor opens through `asUser`.
 */
const {test, expect} = require('../support/fixtures.js');
const {
    ArticleCommentsPage,
    CommentsSettingsTab,
    SideMenu,
    CommentsPage,
    UsersPage,
    BOX_PLACEHOLDER,
    PENDING_NOTICE,
    CLOSED_NOTICE,
    COMMENT_TASK,
    REPORT_TASK,
    NO_REPORTS,
    NO_ITEMS,
    APPROVE_NOTE,
    APPROVED_NOTE,
    ACCESS_DENIED_TEXT,
    OWN_DELETE_QUESTION,
    NOT_FOUND_MESSAGE,
} = require('../pages/ReaderCommentsPages.js');
const {TasksPanel} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {ProfilePage} = require('../../../../shared/playwright/pages/ProfilePage.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {WorkflowPage} = require('../../../../shared/playwright/pages/WorkflowPage.js');
const {PublishScreen} = require('../pages/PublishSchedulePages.js');
const {DecisionPage} = require('../pages/ReviewStagePages.js');
const {getPassword} = require('../../../../shared/playwright/data/users.js');

const TEST_ORCID = 'https://orcid.org/0000-0002-1825-0097';
const DATE_TIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/;
const TABS = ['All', 'Approved', 'Hidden/Needs Approval', 'Reported'];
const VERSION_1 = 'Version of Record 1.0';
const VERSION_2 = 'Version of Record 1.1';

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u14${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** Today's date as the screens print it ("2026-09-16"). */
function today() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A `users[]` entry: `{tag}{key}` with a readable name. */
function person(tag, key, givenName, familyName, roles) {
    const username = `${tag}${key}`;
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/** The roster every scenario draws from (keys → usernames are `${tag}${key}`). */
const ROSTER = {
    mg: ['Mona', 'Manager', ['manager']],
    ed: ['Eddie', 'Editor', ['editor']],
    se: ['Sonia', 'Sectioneditor', ['sectionEditor']],
    au: ['Alex', 'Author', ['author']],
    ra: ['Rosa', 'Reader', ['reader']],
    rb: ['Rob', 'Reporter', ['reader']],
    rc: ['Rita', 'Third', ['reader']],
    vr: ['Vera', 'Verified', ['reader']],
};

/**
 * Seed a scratch journal with the named roster keys (comments on unless
 * `comments: false`); `extraUsers` are appended as given. Returns the
 * usernames by key.
 */
async function seedJournal(ojsApi, tag, keys, {comments = true, extraUsers = []} = {}) {
    const users = keys.map((key) => {
        const [givenName, familyName, roles] = ROSTER[key];
        return person(tag, key, givenName, familyName, roles);
    });
    await ojsApi.createContext({
        tag,
        ...(comments ? {enablePublicComments: true} : {}),
        users: [...users, ...extraUsers],
    });
    const names = {};
    for (const key of keys) {
        names[key] = `${tag}${key}`;
    }
    return names;
}

/** A published article by the journal's author with the given comments. */
async function seedArticle(ojsApi, {tag, context, author, suffix = '', userComments = []}) {
    const title = `Article ${tag}${suffix}`;
    const result = await ojsApi.createSubmission({
        tag: `${tag}${suffix}`,
        context,
        submitter: author,
        title,
        published: true,
        ...(userComments.length ? {userComments} : {}),
    });
    return {...result, title, submissionLine: `${result.submissionId}. Author ; ${title}`};
}

/** A signed-in page for `username` (its own context, closed at teardown). */
async function pageAs(asUser, username) {
    return (await asUser(username)).newPage();
}

/** The editorial dashboard of a scratch journal (any page carrying the bell). */
async function gotoEditorial(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/dashboard/editorial`);
    await expect(new TasksPanel(page).bell()).toBeVisible({timeout: 30_000});
}

/** A comment row's texts on the Comments page as [submission, comment, user, status]. */
async function rowCells(comments, text) {
    const row = comments.row(text);
    await expect(row).toHaveCount(1, {timeout: 30_000});
    return (await comments.cells(row)).slice(0, 4);
}

/** The row holding `text` is on none of the four tabs (each tab's table read settled). */
async function expectOnNoTab(comments, text) {
    for (const tab of TABS) {
        await comments.openTab(tab);
        await expect(comments.row(text)).toHaveCount(0);
    }
}

test.describe('reader comments & moderation', () => {
    test('S1: switching public comments on and off', async ({page, asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const freshTag = makeTag('s1f', testInfo);
        const {mg, au, ra} = await seedJournal(ojsApi, tag, ['mg', 'au', 'ra']);
        // The fresh journal: never switched on, the same manager added to it.
        await seedJournal(ojsApi, freshTag, [], {comments: false, extraUsers: [{username: mg, roles: ['manager']}]});
        const commentText = `S1 approved comment ${tag}.`;
        const article = await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            userComments: [{user: ra, text: commentText, approved: true}],
        });

        const manager = await pageAs(asUser, mg);
        const settings = new CommentsSettingsTab(manager, tag);
        const menu = new SideMenu(manager);
        const comments = new CommentsPage(manager, tag);
        const landing = new ArticleCommentsPage(page, tag);
        const dialogs = [];
        manager.on('dialog', (dialog) => {
            dialogs.push(dialog.message());
            dialog.dismiss().catch(() => {});
        });

        // The "Comments" tab: the box ticked, "Save" enabled with nothing changed.
        await settings.goto();
        await expect(settings.box()).toBeChecked();
        await expect(settings.saveButton()).toBeEnabled();

        // Switching off: "Saving", the reload onto Appearance › Theme, no
        // "Saved" (A5's marked sentence); the box unticked on reopening.
        await settings.box().uncheck();
        const saving = await settings.save();
        expect(saving, '"Saving" showed for a moment').toBe(true);
        await expect(settings.savedStatus()).toHaveCount(0);
        await settings.openCommentsTab();
        await expect(settings.box()).not.toBeChecked();

        // The side menu after the reload: no Content › Comments, "Issues" kept.
        expect(await menu.contentEntries()).toEqual(['Issues']);

        // The landing page: neither block, while the article itself is there.
        await landing.goto(article.submissionId);
        await expect(page.getByRole('heading', {name: article.title})).toBeVisible();
        await expect(page.locator('.entry_details')).toBeVisible();
        await expect(landing.mainBlock()).toHaveCount(0);
        await expect(landing.sidebarBlock()).toHaveCount(0);
        await expect(page.getByText('Comments on this publication')).toHaveCount(0);

        // The page by address: still opens and lists the comment (A4's sentence).
        await comments.goto();
        await expect(comments.heading()).toBeVisible();
        await comments.expectTab('All');
        await expect(comments.row(commentText)).toHaveCount(1);
        await comments.openTab('Approved');
        await expect(comments.row(commentText)).toHaveCount(1);

        // Switching on again: the same reload; the menu entry and the blocks back.
        await settings.goto();
        await expect(settings.box()).not.toBeChecked();
        await settings.box().check();
        await settings.save();
        expect(await menu.contentEntries()).toEqual(['Comments', 'Issues']);
        await landing.goto(article.submissionId);
        await expect(landing.mainHeading()).toHaveText('Comments on this publication');
        await expect(landing.sidebarHeading()).toHaveText('Comments');
        await landing.expectAllComments(1);
        await landing.expectPartCount(VERSION_1, 1);
        await expect(landing.comment(commentText)).toHaveCount(1);

        // An unsaved tick: another tab of the same page keeps it, nothing asked;
        // leaving the page drops it.
        await settings.goto();
        await settings.box().uncheck();
        await settings.appearanceTab().click();
        await expect(settings.themeSideTab()).toBeVisible();
        await settings.openCommentsTab();
        await expect(settings.box()).not.toBeChecked();
        expect(dialogs).toEqual([]);
        await expect(manager.getByRole('dialog')).toHaveCount(0);
        await gotoEditorial(manager, tag);
        await settings.goto();
        await expect(settings.box()).toBeChecked();
        expect(dialogs).toEqual([]);

        // Control: the fresh journal: box unticked, no Content › Comments,
        // "No Items" under every tab of the page opened by address.
        const freshSettings = new CommentsSettingsTab(manager, freshTag);
        await freshSettings.goto();
        await expect(freshSettings.box()).not.toBeChecked();
        expect(await menu.contentEntries()).toEqual(['Issues']);
        const freshComments = new CommentsPage(manager, freshTag);
        await freshComments.goto();
        for (const tab of TABS) {
            await freshComments.openTab(tab);
            await expect(freshComments.noItems()).toBeVisible();
            await expect(freshComments.rows()).toHaveCount(1);
        }
    });

    test('S2: approving and hiding on the Comments page', async ({page, asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const otherTag = makeTag('s2o', testInfo);
        const vr = `${tag}vr`;
        const {mg, au, ra, rb} = await seedJournal(ojsApi, tag, ['mg', 'au', 'ra', 'rb'], {
            extraUsers: [{...person(tag, 'vr', 'Vera', 'Verified', ['reader']), orcid: TEST_ORCID, orcidIsVerified: true}],
        });
        await seedJournal(ojsApi, otherTag, ['au', 'ra'], {extraUsers: [{username: mg, roles: ['manager']}]});
        const affiliation = `Verified Institute ${tag}`;

        // The pending comment's writer sets an affiliation on Profile › Contact
        // (the seed has no key; a comment shows what the profile holds at load).
        const writer = await pageAs(asUser, vr);
        const profile = new ProfilePage(writer, tag);
        await profile.goto('contact');
        await profile.country().selectOption({label: 'Canada'});
        await profile.affiliation('en').fill(affiliation);
        await profile.save();

        const pendingText = `S2 pending comment ${tag}.`;
        const approvedText = `S2 approved comment ${tag}.`;
        const reportedText = `S2 reported comment ${tag}.`;
        const otherText = `S2 other journal comment ${otherTag}.`;
        const article = await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            userComments: [
                {user: vr, text: pendingText},
                {user: ra, text: approvedText, approved: true},
                {user: rb, text: reportedText, approved: true, reports: [{user: vr, note: `S2 report ${tag}.`}]},
            ],
        });
        await seedArticle(ojsApi, {
            tag: otherTag,
            context: otherTag,
            author: `${otherTag}au`,
            userComments: [{user: `${otherTag}ra`, text: otherText, approved: true}],
        });

        const manager = await pageAs(asUser, mg);
        const menu = new SideMenu(manager);
        const comments = new CommentsPage(manager, tag);

        // Content › Comments: the page, its tabs, columns and the three rows.
        await gotoEditorial(manager, tag);
        await menu.openComments();
        await expect(manager).toHaveURL(/\/management\/settings\/userComments/);
        await comments.expectOpen();
        await expect(comments.tabs()).toHaveText(TABS);
        expect(await comments.columnLabels()).toEqual(['Submission', 'Comment', 'User', 'Status', 'Actions']);
        await comments.expectTab('All');
        await expect(comments.rows()).toHaveCount(3);
        expect(await rowCells(comments, pendingText)).toEqual([article.submissionLine, pendingText, 'Vera Verified', 'Hidden/Needs Approval']);
        expect(await rowCells(comments, approvedText)).toEqual([article.submissionLine, approvedText, 'Rosa Reader', 'Approved']);
        expect(await rowCells(comments, reportedText)).toEqual([article.submissionLine, reportedText, 'Rob Reporter', 'Approved, Reported']);

        // The tabs: what each lists, and the address hash that a reload keeps.
        await comments.openTab('Approved');
        await expect(comments.rows()).toHaveCount(2);
        await expect(comments.row(approvedText)).toHaveCount(1);
        await expect(comments.row(reportedText)).toHaveCount(1);
        for (const row of await comments.rows().all()) {
            await expect(comments.statusCell(row)).toHaveText('Approved');
        }
        await comments.openTab('Hidden/Needs Approval');
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.row(pendingText)).toHaveCount(1);
        await comments.openTab('Reported');
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.statusCell(comments.row(reportedText))).toHaveText('Reported');
        await expect(manager).toHaveURL(/#reported$/);
        await manager.reload();
        await comments.expectOpen();
        await comments.expectTab('Reported');
        await expect(comments.row(reportedText)).toHaveCount(1);

        // Another journal's comment: on no tab.
        await expectOnNoTab(comments, otherText);

        // The comment panel on the pending row.
        await comments.openTab('All');
        const panel = await comments.viewComment(comments.row(pendingText));
        await expect(comments.panelSubmissionLine(panel)).toHaveText(article.submissionLine);
        await expect(panel.getByRole('heading', {level: 1})).toHaveText('View comment details by');
        await expect(comments.panelPerson(panel)).toHaveText('Vera Verified');
        await expect(panel.getByText('Comment preview')).toBeVisible();
        await expect(panel.getByText(DATE_TIME)).toBeVisible();
        await expect(panel.getByText(pendingText)).toBeVisible();
        await expect(comments.orcidLink(panel)).toHaveAttribute('href', TEST_ORCID);
        await expect(comments.orcidLink(panel)).toHaveText(TEST_ORCID);
        // The icon sits right before the link (an image element; the panel's
        // markup carries no icon class of its own).
        expect(
            await comments.orcidLink(panel).evaluate((a) => {
                const before = a.previousElementSibling;
                return !!before && (/^(img|svg)$/i.test(before.tagName) || !!before.querySelector('svg, img'));
            }),
            'an icon right before the iD'
        ).toBe(true);
        await expect(panel.getByText(affiliation)).toBeVisible();
        await expect(comments.noReports()).toBeVisible();
        await expect(comments.note()).toHaveText(APPROVE_NOTE);
        await expect(comments.approveButton()).toBeEnabled();
        await expect(comments.hideButton()).toBeDisabled();
        await expect(manager).toHaveURL(/\?commentId=\d+/);
        const pendingId = Number(new URL(manager.url()).searchParams.get('commentId'));
        expect(pendingId).toBeGreaterThan(0);

        // "Approve Comment": the notice, the panel closed, the row moved.
        await comments.setApproval('Approve Comment');
        await comments.openTab('Hidden/Needs Approval');
        await expect(comments.row(pendingText)).toHaveCount(0);
        await expect(comments.noItems()).toBeVisible();
        await comments.openTab('Approved');
        await expect(comments.row(pendingText)).toHaveCount(1);
        await comments.viewComment(comments.row(pendingText));
        await expect(comments.note()).toHaveText(APPROVED_NOTE);
        await expect(comments.note()).toContainText(`approved on ${today()} by Mona Manager.`);
        await expect(comments.approveButton()).toBeDisabled();
        await expect(comments.hideButton()).toBeEnabled();
        await comments.closeCommentPanel();
        await expect(manager).not.toHaveURL(/commentId=/);

        // The landing page after the approval, signed out.
        const landing = new ArticleCommentsPage(page, tag);
        await landing.goto(article.submissionId);
        const shown = landing.comment(pendingText);
        await expect(shown).toHaveCount(1);
        await expect(landing.time(shown)).toHaveText(DATE_TIME);
        await expect(landing.body(shown)).toHaveText(pendingText);
        await expect(landing.author(shown)).toHaveText('Vera Verified');
        // The iD is a solid icon after the name, a link to the iD; it is not
        // written out (pkp/pkp-lib#13422).
        await expect(landing.orcidLink(shown)).toHaveAttribute('href', TEST_ORCID);
        await expect(landing.orcidLink(shown)).toHaveText('');
        await expect(landing.orcidIcon(shown)).toHaveCount(1);
        await expect(landing.affiliation(shown)).toHaveText(affiliation);
        await landing.expectAllComments(3);

        // "Hide Comment" on the reported comment.
        await comments.openTab('All');
        await comments.viewComment(comments.row(reportedText));
        await comments.setApproval('Hide Comment');
        await comments.openTab('Hidden/Needs Approval');
        await expect(comments.row(reportedText)).toHaveCount(1);
        await comments.openTab('Approved');
        await expect(comments.row(reportedText)).toHaveCount(0);
        await expect(comments.rows()).toHaveCount(2);
        await comments.openTab('Reported');
        await expect(comments.row(reportedText)).toHaveCount(1);
        await comments.openTab('All');
        await expect(comments.statusCell(comments.row(reportedText))).toHaveText('Hidden/Needs Approval, Reported');

        // The landing page after the hide: gone for a visitor, shown with the
        // notice to its writer (A1's marked sentence).
        await landing.goto(article.submissionId);
        await expect(landing.comment(reportedText)).toHaveCount(0);
        await expect(landing.comment(pendingText)).toHaveCount(1);
        await landing.expectAllComments(2);
        const reporterPage = await pageAs(asUser, rb);
        const writerLanding = new ArticleCommentsPage(reporterPage, tag);
        await writerLanding.goto(article.submissionId);
        const hidden = writerLanding.comment(reportedText);
        await expect(hidden).toHaveCount(1);
        await expect(writerLanding.pendingNotice(hidden)).toHaveText(PENDING_NOTICE);

        // Control: the second journal's page lists its own comment alone.
        const otherComments = new CommentsPage(manager, otherTag);
        await otherComments.goto();
        await expect(otherComments.rows()).toHaveCount(1);
        await expect(otherComments.row(otherText)).toHaveCount(1);
        for (const text of [pendingText, approvedText, reportedText]) {
            await expect(otherComments.row(text)).toHaveCount(0);
        }
    });

    test('S3: reports on the Comments page', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const {mg, au, ra, rb, rc} = await seedJournal(ojsApi, tag, ['mg', 'au', 'ra', 'rb', 'rc']);
        const reportedText = `S3 twice reported comment ${tag}.`;
        const cleanText = `S3 never reported comment ${tag}.`;
        const reasonB = `S3 reason by Rob ${tag}.`;
        const reasonC = `S3 reason by Rita ${tag}.`;
        const reporters = {[reasonB]: 'Rob Reporter', [reasonC]: 'Rita Third'};
        await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            userComments: [
                {user: ra, text: reportedText, approved: true, reports: [{user: rb, note: reasonB}, {user: rc, note: reasonC}]},
                {user: ra, text: cleanText, approved: true},
            ],
        });

        const manager = await pageAs(asUser, mg);
        const comments = new CommentsPage(manager, tag);
        await comments.goto();

        // Control, before: the never-reported comment on "Approved", not on "Reported".
        await comments.openTab('Approved');
        await expect(comments.row(cleanText)).toHaveCount(1);

        // The "Reported" tab: the reported comment alone.
        await comments.openTab('Reported');
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.row(reportedText)).toHaveCount(1);
        await expect(comments.row(cleanText)).toHaveCount(0);
        await expect(comments.statusCell(comments.row(reportedText))).toHaveText('Reported');

        // The "Reports" table in the panel.
        const panel = await comments.viewComment(comments.row(reportedText));
        await expect(panel.getByText('This is the list of all the users who have reported this comment')).toBeVisible();
        await expect(comments.reportsTable().locator('thead th')).toHaveText(['Reported By', 'Reason', 'Date Reported', 'Actions']);
        await expect(comments.reportRows()).toHaveCount(2);
        await expect(comments.reportRow(reasonB)).toHaveCount(1);
        await expect(comments.reportRow(reasonC)).toHaveCount(1);
        const commentId = Number(new URL(manager.url()).searchParams.get('commentId'));
        expect(commentId).toBeGreaterThan(0);

        // "View Report" on the first row (the two share a second: whichever is listed first).
        const firstRow = comments.reportRows().first();
        const firstReason = (await comments.cells(firstRow))[1];
        expect(Object.keys(reporters)).toContain(firstReason);
        const report = await comments.viewReport(firstRow);
        await expect(report.getByRole('heading', {level: 1})).toHaveText('View report details by');
        await expect(comments.panelPerson(report)).toHaveText(reporters[firstReason]);
        await expect(report.getByText('Report preview')).toBeVisible();
        await expect(report.getByText(DATE_TIME)).toBeVisible();
        await expect(report.getByText(firstReason)).toBeVisible();
        await expect(comments.deleteReportButton()).toBeVisible();
        await expect(manager).toHaveURL(new RegExp(`reportId=\\d+`));
        await expect(manager).toHaveURL(new RegExp(`commentId=${commentId}`));

        // "Close" on the report panel: the comment panel stays, both numbers
        // leave the address (A8's marked sentence).
        await comments.closeReportPanel();
        await expect(manager).not.toHaveURL(/reportId=/);
        await expect(manager).not.toHaveURL(/commentId=/);
        await expect(comments.commentPanel()).toBeVisible();

        // "Delete Report" from the report panel: the first report again.
        await comments.viewReport(comments.reportRow(firstReason));
        await comments.deleteReportFromPanel();
        await expect(comments.reportRows()).toHaveCount(1);
        await expect(comments.reportRow(firstReason)).toHaveCount(0);

        // "Delete Report" from the remaining row: the table empties, the note stays.
        await comments.deleteReportFromRow(comments.reportRows().first());
        await expect(comments.noReports()).toBeVisible();
        await expect(comments.reportRows()).toHaveCount(0);
        await expect(comments.note()).toHaveText(APPROVED_NOTE);
        await comments.closeCommentPanel({changed: true});
        await comments.openTab('Reported');
        await expect(comments.row(reportedText)).toHaveCount(0);
        await expect(comments.noItems()).toBeVisible();
        await comments.openTab('All');
        await expect(comments.statusCell(comments.row(reportedText))).toHaveText('Approved');

        // Control, after: the never-reported comment's panel and rows.
        await comments.viewComment(comments.row(cleanText));
        await expect(comments.noReports()).toBeVisible();
        await comments.closeCommentPanel();
        await comments.openTab('Approved');
        await expect(comments.row(cleanText)).toHaveCount(1);
        await comments.openTab('Reported');
        await expect(comments.row(cleanText)).toHaveCount(0);
        await expect(comments.noItems()).toBeVisible();
    });

    test('S4: deleting a comment as a moderator', async ({page, asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s4', testInfo);
        const {mg, au, ra, rb} = await seedJournal(ojsApi, tag, ['mg', 'au', 'ra', 'rb']);
        const plainText = `S4 approved unreported ${tag}.`;
        const reportedText = `S4 approved reported ${tag}.`;
        const pendingText = `S4 pending ${tag}.`;
        const article = await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            userComments: [
                {user: ra, text: plainText, approved: true},
                {user: ra, text: reportedText, approved: true, reports: [{user: rb, note: `S4 report ${tag}.`}]},
                {user: rb, text: pendingText},
            ],
        });

        const manager = await pageAs(asUser, mg);
        const comments = new CommentsPage(manager, tag);
        await comments.goto();
        await expect(comments.rows()).toHaveCount(3);

        // From the row: the dialog's question, "Delete", the notice, the row gone.
        await comments.deleteFromRow(comments.row(plainText));
        await expect(comments.row(plainText)).toHaveCount(0);
        await expect(comments.rows()).toHaveCount(2);

        // From the panel: the noted address, "Delete Comment", the panel closed.
        await comments.viewComment(comments.row(reportedText));
        await expect(manager).toHaveURL(/\?commentId=\d+/);
        const noted = manager.url();
        await comments.deleteFromPanel();
        await expect(comments.row(reportedText)).toHaveCount(0);
        await expectOnNoTab(comments, reportedText);
        await comments.openTab('Reported');
        await expect(comments.noItems()).toBeVisible();

        // The noted address: "All" under the "Error" dialog.
        await manager.goto(noted);
        await expect(comments.errorDialog()).toBeVisible({timeout: 30_000});
        await expect(comments.errorDialog()).toContainText(NOT_FOUND_MESSAGE);
        await expect(comments.errorDialog().getByRole('button', {name: 'OK', exact: true})).toBeVisible();
        await comments.errorDialog().getByRole('button', {name: 'OK', exact: true}).click();
        await expect(comments.errorDialog()).toHaveCount(0);
        await comments.expectTab('All');

        // The landing page, signed out: no comment, "(0)", "All Comments (0)".
        const landing = new ArticleCommentsPage(page, tag);
        await landing.goto(article.submissionId);
        await expect(landing.mainHeading()).toHaveText('Comments on this publication');
        await landing.expectPartCount(VERSION_1, 0);
        await expect(landing.comments()).toHaveCount(0);
        await landing.expectAllComments(0);

        // Control: the pending comment still listed under "All" and "Hidden/Needs Approval".
        await comments.goto();
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.row(pendingText)).toHaveCount(1);
        await comments.openTab('Hidden/Needs Approval');
        await expect(comments.row(pendingText)).toHaveCount(1);
    });

    test("S5: the moderators' tasks", async ({asUser, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        test.setTimeout(420_000);
        const tag = makeTag('s5', testInfo);
        const {mg, ed, se, au, ra, rb} = await seedJournal(ojsApi, tag, ['mg', 'ed', 'se', 'au', 'ra', 'rb']);
        const filler = (label) => `${label} ${tag} ` + 'lorem ipsum dolor sit amet '.repeat(12);
        const commentText = filler('S5 long comment').slice(0, 300);
        const reason = filler('S5 long reason').slice(0, 300);
        expect(commentText.length).toBe(300);
        expect(reason.length).toBe(300);
        // The rows cut at 200 characters, trailing space trimmed, then "...".
        const cut = (text) => `${text.slice(0, 200).trimEnd()}...`;
        const marker = commentText.slice(0, 60);
        const reasonMarker = reason.slice(0, 60);
        const article = await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            userComments: [{user: ra, text: commentText, approved: true, reports: [{user: rb, note: reason}]}],
        });
        const commentId = article.userComments[0].id;
        const reportId = article.userComments[0].reports[0];

        const manager = await pageAs(asUser, mg);
        const editor = await pageAs(asUser, ed);
        const sectionEditor = await pageAs(asUser, se);
        const managerTasks = new TasksPanel(manager);
        const editorTasks = new TasksPanel(editor);
        const sectionEditorTasks = new TasksPanel(sectionEditor);

        /** Read a moderator's two rows: sentence, the text cut to 200 and "...", unread. */
        const expectTwoRows = async (tasks) => {
            await tasks.open();
            const commentRow = tasks.rowsOpening(COMMENT_TASK);
            const reportRow = tasks.rowsOpening(REPORT_TASK);
            await expect(commentRow).toHaveCount(1);
            await expect(reportRow).toHaveCount(1);
            await expect(tasks.sentence(commentRow)).toHaveText(COMMENT_TASK);
            await expect(tasks.title(commentRow)).toHaveText(cut(commentText));
            await expect(tasks.sentence(reportRow)).toHaveText(REPORT_TASK);
            await expect(tasks.title(reportRow)).toHaveText(cut(reason));
            await tasks.expectUnread(commentRow);
            await tasks.expectUnread(reportRow);
            await tasks.close();
        };
        /** The rows about comments a panel holds: [comment rows, report rows]. */
        const commentRowCounts = async (tasks, contextPage) => {
            await gotoEditorial(contextPage, tag);
            await tasks.open();
            const counts = [await tasks.rowsOpening(COMMENT_TASK).count(), await tasks.rowsOpening(REPORT_TASK).count()];
            await tasks.close();
            return counts;
        };

        // Control, at the start: the Section Editor's panel has no row about comments.
        await gotoEditorial(sectionEditor, tag);
        expect(await commentRowCounts(sectionEditorTasks, sectionEditor)).toEqual([0, 0]);

        // The Journal Manager's and the Editor's panels: the two rows each.
        await gotoEditorial(manager, tag);
        await expectTwoRows(managerTasks);
        await gotoEditorial(editor, tag);
        await expectTwoRows(editorTasks);

        // Pressing the comment's row: the Comments page with the panel open.
        const comments = new CommentsPage(manager, tag);
        await managerTasks.open();
        await managerTasks.openTask(managerTasks.rowsOpening(COMMENT_TASK));
        await manager.waitForURL(new RegExp(`/management/settings/userComments\\?commentId=${commentId}`), {timeout: 30_000, waitUntil: 'commit'});
        await expect(comments.commentPanel()).toBeVisible({timeout: 30_000});
        await expect(comments.commentPanel().getByText(marker)).toBeVisible();
        await expect(comments.reportPanel()).toHaveCount(0);

        // Pressing the report's row: both panels.
        await gotoEditorial(manager, tag);
        await managerTasks.open();
        await managerTasks.openTask(managerTasks.rowsOpening(REPORT_TASK));
        await manager.waitForURL(/\/management\/settings\/userComments\?/, {timeout: 30_000, waitUntil: 'commit'});
        await expect(manager).toHaveURL(new RegExp(`reportId=${reportId}`));
        await expect(manager).toHaveURL(new RegExp(`commentId=${commentId}`));
        await expect(comments.reportPanel()).toBeVisible({timeout: 30_000});
        await expect(comments.reportPanel().getByText(reasonMarker)).toBeVisible();
        await expect(comments.commentPanelBehind()).toHaveCount(1);
        await expect(comments.commentPanelBehind()).toContainText(marker);

        // Profile › Notifications: no row about comments (the rows that are there are the control).
        const profile = new ProfilePage(manager, tag);
        await profile.goto('notifications');
        const sentences = await profile.notificationSentences();
        expect(sentences.length).toBeGreaterThan(0);
        // No row about reader comments or their reports (the reviewer's "has
        // commented" row and the "Statistics report summary." row are other
        // features' and stay).
        expect(
            sentences.filter((sentence) => /moderator|public comment|reader comment|comment report|report(ed)? (was submitted|for a comment)/i.test(sentence))
        ).toEqual([]);
        expect(sentences).not.toContain(COMMENT_TASK);
        expect(sentences).not.toContain(REPORT_TASK);

        // After "Hide Comment": the "pending review" row stays (A2's marked sentence).
        await comments.goto(`?commentId=${commentId}`);
        await expect(comments.commentPanel()).toBeVisible({timeout: 30_000});
        await comments.setApproval('Hide Comment');
        expect(await commentRowCounts(managerTasks, manager)).toEqual([1, 1]);
        expect(await commentRowCounts(editorTasks, editor)).toEqual([1, 1]);

        // After "Delete Report": the "requires review" row leaves, the other stays.
        await comments.goto(`?commentId=${commentId}`);
        await expect(comments.commentPanel()).toBeVisible({timeout: 30_000});
        await comments.deleteReportFromRow(comments.reportRow(reasonMarker));
        await expect(comments.noReports()).toBeVisible();
        expect(await commentRowCounts(managerTasks, manager)).toEqual([1, 0]);
        expect(await commentRowCounts(editorTasks, editor)).toEqual([1, 0]);

        // After "Delete Comment": the "pending review" row leaves every panel.
        await comments.goto(`?commentId=${commentId}`);
        await expect(comments.commentPanel()).toBeVisible({timeout: 30_000});
        await comments.deleteFromPanel();
        expect(await commentRowCounts(managerTasks, manager)).toEqual([0, 0]);
        expect(await commentRowCounts(editorTasks, editor)).toEqual([0, 0]);

        // Mailboxes: nothing to the writer, the reporter or either moderator,
        // each read after a control mail sent to the same address the same way.
        const users = new UsersPage(manager, tag);
        for (const username of [ra, rb, mg, ed]) {
            const subject = `S5 control ${tag} ${username}`;
            await users.goto(username);
            await users.sendEmail(username, {subject, body: `Control mail for ${username}.`});
            await pkpMail.find({to: mailOf(username), subject});
            expect(await pkpMail.count({to: mailOf(username)}), `${username}'s inbox holds the control alone`).toBe(1);
        }

        // Control: the Section Editor's panel gained no row at any step.
        expect(await commentRowCounts(sectionEditorTasks, sectionEditor)).toEqual([0, 0]);
    });

    test('S6: who opens the Comments page', async ({page, asUser, ojsApi}, testInfo) => {
        const tag = makeTag('s6', testInfo);
        const {mg, se, au, ra} = await seedJournal(ojsApi, tag, ['mg', 'se', 'au', 'ra']);
        const address = new CommentsPage(page, tag).url();

        const expectDenied = async (actor) => {
            await actor.goto(address);
            await expect(actor.getByText(ACCESS_DENIED_TEXT)).toBeVisible({timeout: 30_000});
            await expect(actor).toHaveURL(/\/user\/authorizationDenied\?message=user\.authorization\.roleBasedAccessDenied/);
            await expect(actor.getByRole('heading', {name: 'Comments', exact: true})).toHaveCount(0);
        };

        // The Section Editor: no "Content" group; the address refused.
        const sectionEditor = await pageAs(asUser, se);
        await gotoEditorial(sectionEditor, tag);
        const seMenu = new SideMenu(sectionEditor);
        expect(await seMenu.groupLabels()).not.toContain('Content');
        expect(await seMenu.contentEntries()).toBeNull();
        await expectDenied(sectionEditor);

        // The Author: the dashboard's side menu without "Content"; the address refused.
        const author = await pageAs(asUser, au);
        await author.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const auMenu = new SideMenu(author);
        expect(await auMenu.groupLabels()).not.toContain('Content');
        expect(await auMenu.contentEntries()).toBeNull();
        await expectDenied(author);

        // The Reader: the address refused.
        await expectDenied(await pageAs(asUser, ra));

        // Signed out: the Login page, the address as `source`.
        await page.goto(address);
        await new LoginPage(page).expectForm();
        await expect(page).toHaveURL(/\/login\?source=.*userComments/);

        // Control: the Journal Manager's menu holds Content › Comments and the address opens the page.
        const manager = await pageAs(asUser, mg);
        await gotoEditorial(manager, tag);
        const mgMenu = new SideMenu(manager);
        expect(await mgMenu.groupLabels()).toContain('Content');
        expect(await mgMenu.contentEntries()).toContain('Comments');
        const comments = new CommentsPage(manager, tag);
        await comments.goto();
        await expect(comments.heading()).toBeVisible();
        await expect(manager.getByText(ACCESS_DENIED_TEXT)).toHaveCount(0);
    });

    test('S7: more than a page of comments', async ({page, asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s7', testInfo);
        const {mg, au, ra} = await seedJournal(ojsApi, tag, ['mg', 'au', 'ra']);
        const texts = Array.from({length: 26}, (_, i) => `S7 comment ${String(i + 1).padStart(2, '0')} ${tag}.`);
        const article = await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            userComments: texts.map((text) => ({user: ra, text, approved: true})),
        });

        const manager = await pageAs(asUser, mg);
        const comments = new CommentsPage(manager, tag);
        await comments.goto();

        // The first page: 25 rows and the page links; the second page: one row.
        await expect(comments.rows()).toHaveCount(25);
        await expect(comments.showingLine()).toHaveText('Showing 1 to 25 of 26');
        await expect(comments.pageButton(2)).toBeVisible();
        await comments.openPage(2);
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.showingLine()).toHaveText('Showing 26 to 26 of 26');

        // Coming back to a tab: "Approved" on its first page, "All" still on its second.
        await comments.openTab('Approved');
        await expect(comments.rows()).toHaveCount(25);
        await expect(comments.pageButton(2)).toBeVisible();
        await comments.openTab('All');
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.pageButton(2)).toHaveAttribute('aria-current', 'true');
        await expect(comments.showingLine()).toHaveText('Showing 26 to 26 of 26');

        // The landing page, signed out: 25 comments, "Show more (1)", then all 26.
        const landing = new ArticleCommentsPage(page, tag);
        await landing.goto(article.submissionId);
        await landing.expectPartCount(VERSION_1, 26);
        await expect(landing.comments()).toHaveCount(25);
        await expect(landing.showMoreButton()).toHaveText('Show more (1)');
        const more = page.waitForResponse(
            (r) => /\/api\/v1\/comments\/public\?.*page=2/.test(r.url()) && r.request().method() === 'GET' && r.ok(),
            {timeout: 30_000}
        );
        await landing.showMoreButton().click();
        await more;
        await expect(landing.comments()).toHaveCount(26);
        await expect(landing.showMoreButton()).toHaveCount(0);
        for (const text of texts) {
            await expect(landing.comment(text)).toHaveCount(1);
        }

        // Control: "Hidden/Needs Approval" and "Reported" read "No Items", no page links.
        for (const tab of ['Hidden/Needs Approval', 'Reported']) {
            await comments.openTab(tab);
            await expect(comments.noItems()).toBeVisible();
            await expect(comments.pagination()).toHaveCount(0);
            await expect(comments.showingLine()).toHaveCount(0);
        }
    });

    test('S8: writing a comment', async ({page, asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s8', testInfo);
        const {mg, au, ra, rb} = await seedJournal(ojsApi, tag, ['mg', 'au', 'ra', 'rb']);
        const approvedText = `S8 approved by Rob ${tag}.`;
        const article = await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            userComments: [{user: rb, text: approvedText, approved: true}],
        });
        const secondArticle = await seedArticle(ojsApi, {tag, context: tag, author: au, suffix: 'b'});
        const firstText = 'A first reader comment.';
        const formatted = '<b>bold</b> <script>alert(1)</script> plain';

        // Signed out: the two blocks, the approved comment without a "…" button.
        const landing = new ArticleCommentsPage(page, tag);
        await landing.goto(article.submissionId);
        await expect(landing.mainHeading()).toHaveText('Comments on this publication');
        expect(await landing.partLabels()).toEqual([`${VERSION_1} (1)`]);
        await expect(landing.partButton(VERSION_1)).toHaveAttribute('aria-expanded', 'true');
        const region = landing.partRegion(VERSION_1);
        await expect(region).toBeVisible();
        await expect(landing.loginButton(region)).toBeVisible();
        await expect(landing.box(region)).toHaveCount(0);
        const approved = landing.comment(approvedText, region);
        await expect(approved).toHaveCount(1);
        await expect(landing.time(approved)).toHaveText(DATE_TIME);
        await expect(landing.body(approved)).toHaveText(approvedText);
        await expect(landing.author(approved)).toHaveText('Rob Reporter');
        await expect(landing.menuButton(approved)).toHaveCount(0);
        await expect(landing.sidebarHeading()).toHaveText('Comments');
        await landing.expectAllComments(1);
        await expect(landing.sidebarLoginButton()).toBeVisible();
        const before = await landing.mainBlockPosition();
        expect(before.top).toBeGreaterThan(100);
        await landing.allCommentsLink().click();
        await expect(page).toHaveURL(/#public-comments$/);
        // The block is brought to the top of the window (as far as a short
        // page can scroll: the viewport's top band, well above where it sat).
        await expect.poll(async () => (await landing.mainBlockPosition()).top).toBeLessThan(120);
        expect((await landing.mainBlockPosition()).top).toBeLessThan(before.top - 100);

        // "Log in to comment": the Login page, then back at the comments with the box.
        await landing.loginButton(region).click();
        const login = new LoginPage(page);
        await expect(page).toHaveURL(/\/login/);
        await login.expectForm();
        await login.signIn(ra, getPassword(ra));
        await expect(page).toHaveURL(new RegExp(`/article/view/${article.submissionId}#public-comments$`));
        await expect(landing.mainBlock()).toBeVisible();
        await expect(landing.box(region)).toBeVisible();
        await expect(landing.box(region)).toHaveAttribute('placeholder', BOX_PLACEHOLDER);
        await expect(landing.submitButton(region)).toBeVisible();

        // "Submit" while the box is empty or blank: grayed out; with text: enabled.
        await expect(landing.submitButton(region)).toBeDisabled();
        await landing.box(region).fill('   ');
        await expect(landing.submitButton(region)).toBeDisabled();
        await landing.box(region).fill(firstText);
        await expect(landing.submitButton(region)).toBeEnabled();

        // Submitting: the box empties, the comment tops the list with the notice
        // and its icon, the heading counts it, the sidebar does not, no message.
        await landing.writeComment(firstText);
        await expect(landing.box(region)).toHaveValue('');
        const own = landing.comment(firstText, region);
        await expect(own).toHaveCount(1);
        await expect(landing.comments(region).first()).toHaveText(new RegExp(firstText.replace('.', '\\.')));
        await expect(landing.pendingNotice(own)).toHaveText(PENDING_NOTICE);
        await expect(landing.pendingIcon(own)).toHaveCount(1);
        await expect(landing.time(own)).toHaveText(DATE_TIME);
        await landing.expectPartCount(VERSION_1, 2);
        await landing.expectAllComments(1);
        await expect(page.locator('[role="status"], [role="alert"]').filter({hasText: /\S/})).toHaveCount(0);

        // The "…" menus: "Delete Comment" alone on the own comment, "Report" alone on the other's.
        expect(await landing.openMenu(own)).toEqual(['Delete Comment']);
        await landing.closeMenu();
        expect(await landing.openMenu(approved)).toEqual(['Report']);
        await landing.closeMenu();

        // Formatting: bold kept, the script gone, no message.
        await landing.writeComment(formatted);
        const tagged = landing.comment('plain', region).filter({hasText: 'bold'});
        await expect(tagged).toHaveCount(1);
        await expect(landing.body(tagged)).toHaveText('bold plain');
        await expect(landing.body(tagged).locator('b, strong')).toHaveText('bold');
        expect(await landing.body(tagged).innerHTML()).not.toContain('script');
        await expect(page.locator('[role="status"], [role="alert"]').filter({hasText: /\S/})).toHaveCount(0);
        await landing.expectPartCount(VERSION_1, 3);

        // The second Reader: the approved comment alone, own menu "Delete Comment".
        const second = await pageAs(asUser, rb);
        const rbLanding = new ArticleCommentsPage(second, tag);
        await rbLanding.goto(article.submissionId);
        await expect(rbLanding.comments()).toHaveCount(1);
        await expect(rbLanding.comment(approvedText)).toHaveCount(1);
        await rbLanding.expectPartCount(VERSION_1, 1);
        expect(await rbLanding.openMenu(rbLanding.comment(approvedText))).toEqual(['Delete Comment']);
        await rbLanding.closeMenu();

        // The Journal Manager: the approved comment alone, its menu "Report".
        const manager = await pageAs(asUser, mg);
        const mgLanding = new ArticleCommentsPage(manager, tag);
        await mgLanding.goto(article.submissionId);
        await expect(mgLanding.comments()).toHaveCount(1);
        await expect(mgLanding.comment(approvedText)).toHaveCount(1);
        expect(await mgLanding.openMenu(mgLanding.comment(approvedText))).toEqual(['Report']);
        await mgLanding.closeMenu();

        // Control: the journal's second article shows the first Reader "(0)" and "All Comments (0)".
        await landing.goto(secondArticle.submissionId);
        await landing.expectPartCount(VERSION_1, 0);
        await landing.expectAllComments(0);
        await expect(landing.comments()).toHaveCount(0);
        await expect(landing.box()).toBeVisible();
    });

    test('S9: reporting a comment', async ({asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s9', testInfo);
        const {mg, au, ra, rb} = await seedJournal(ojsApi, tag, ['mg', 'au', 'ra', 'rb']);
        const commentText = `S9 comment by Rob ${tag}.`;
        const article = await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            userComments: [{user: rb, text: commentText, approved: true}],
        });

        // "Report": the dialog's line without a parenthesis, the text, the box, the buttons.
        const reader = await pageAs(asUser, ra);
        const landing = new ArticleCommentsPage(reader, tag);
        await landing.goto(article.submissionId);
        const comment = landing.comment(commentText);
        const dialog = await landing.openReportDialog(comment);
        await expect(dialog.getByRole('heading', {name: 'Report Comment'})).toBeVisible();
        await expect(dialog.getByText('Report the following comment by Rob Reporter', {exact: true})).toBeVisible();
        await expect(dialog.getByText(commentText)).toBeVisible();
        await expect(dialog.getByText('Please tell us why you want to report this comment')).toBeVisible();
        await expect(landing.reasonBox(dialog)).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Submit', exact: true})).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();

        // An empty reason: the dialog stays open, nothing sent, no message (A3's sentence).
        expect(await landing.submitReportSendsNothing(dialog)).toBe(true);
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('[role="alert"], [class*="error"]').filter({hasText: /\S/})).toHaveCount(0);
        await expect(reader.locator('[role="status"], [role="alert"]').filter({hasText: /\S/})).toHaveCount(0);

        // A filed report: the dialog closes, nothing confirms it, "Report" offered again.
        await landing.reasonBox(dialog).fill('Off topic.');
        await landing.submitReport(dialog);
        await expect(reader.locator('[role="status"], [role="alert"]').filter({hasText: /\S/})).toHaveCount(0);
        await expect(comment).toHaveCount(1);
        await expect(landing.body(comment)).toHaveText(commentText);
        await landing.expectPartCount(VERSION_1, 1);
        expect(await landing.openMenu(comment)).toEqual(['Report']);
        await landing.closeMenu();

        // The Comments page: "Reported", "Approved, Reported", the report's row, the note.
        const manager = await pageAs(asUser, mg);
        const comments = new CommentsPage(manager, tag);
        await comments.goto();
        await comments.openTab('Reported');
        await expect(comments.row(commentText)).toHaveCount(1);
        await expect(comments.statusCell(comments.row(commentText))).toHaveText('Reported');
        await comments.openTab('All');
        await expect(comments.statusCell(comments.row(commentText))).toHaveText('Approved, Reported');
        await comments.viewComment(comments.row(commentText));
        await expect(comments.reportRows()).toHaveCount(1);
        expect((await comments.cells(comments.reportRows().first())).slice(0, 3)).toEqual(['Rosa Reader', 'Off topic.', today()]);
        await expect(comments.note()).toHaveText(APPROVED_NOTE);

        // Control: the Journal Manager gets the same menu on the landing page, "Report" alone.
        const mgLanding = new ArticleCommentsPage(manager, tag);
        await mgLanding.goto(article.submissionId);
        expect(await mgLanding.openMenu(mgLanding.comment(commentText))).toEqual(['Report']);
        await mgLanding.closeMenu();
    });

    test("S10: deleting one's own comment", async ({page, asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s10', testInfo);
        const {mg, au, ra, rb} = await seedJournal(ojsApi, tag, ['mg', 'au', 'ra', 'rb']);
        const ownText = `S10 comment by Rosa ${tag}.`;
        const otherText = `S10 comment by Rob ${tag}.`;
        const reason = `S10 report by Rob ${tag}.`;
        const article = await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            userComments: [
                {user: ra, text: ownText, approved: true, reports: [{user: rb, note: reason}]},
                {user: rb, text: otherText, approved: true},
            ],
        });

        // The manager's panel holds the rows about the comment and its report (the given).
        const manager = await pageAs(asUser, mg);
        const tasks = new TasksPanel(manager);
        await gotoEditorial(manager, tag);
        await tasks.open();
        await expect(tasks.row(ownText)).toHaveCount(1);
        await expect(tasks.row(reason)).toHaveCount(1);
        await expect(tasks.row(otherText)).toHaveCount(1);
        await tasks.close();

        // "Delete Comment": the dialog, "Delete", the comment gone at once, the count on reload.
        const reader = await pageAs(asUser, ra);
        const landing = new ArticleCommentsPage(reader, tag);
        await landing.goto(article.submissionId);
        await landing.expectPartCount(VERSION_1, 2);
        const dialog = await landing.openDeleteDialog(landing.comment(ownText));
        await expect(dialog.getByRole('heading', {name: 'Delete Comment'})).toBeVisible();
        await expect(dialog.getByText(OWN_DELETE_QUESTION)).toBeVisible();
        await expect(dialog.locator('strong, b').filter({hasText: ownText})).toHaveCount(1);
        await expect(dialog.getByRole('button', {name: 'Delete', exact: true})).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        await landing.confirmDelete(dialog);
        await expect(landing.comment(ownText)).toHaveCount(0);
        await expect(landing.comment(otherText)).toHaveCount(1);
        await landing.expectPartCount(VERSION_1, 2);
        await landing.goto(article.submissionId);
        await landing.expectPartCount(VERSION_1, 1);

        // The Comments page: on no tab, "Reported" reads "No Items".
        const comments = new CommentsPage(manager, tag);
        await comments.goto();
        await expectOnNoTab(comments, ownText);
        await comments.openTab('Reported');
        await expect(comments.noItems()).toBeVisible();

        // The Tasks panel: the rows about the comment and its report are gone.
        await gotoEditorial(manager, tag);
        await tasks.open();
        await expect(tasks.row(otherText)).toHaveCount(1);
        await expect(tasks.row(ownText)).toHaveCount(0);
        await expect(tasks.row(reason)).toHaveCount(0);
        await expect(tasks.rowsOpening(REPORT_TASK)).toHaveCount(0);
        await tasks.close();

        // Control: the second Reader's comment on the landing page and under "All" and "Approved".
        const visitor = new ArticleCommentsPage(page, tag);
        await visitor.goto(article.submissionId);
        await expect(visitor.comment(otherText)).toHaveCount(1);
        await expect(visitor.comments()).toHaveCount(1);
        await comments.goto();
        await expect(comments.row(otherText)).toHaveCount(1);
        await comments.openTab('Approved');
        await expect(comments.row(otherText)).toHaveCount(1);
    });

    test('S11: a new version closes the old discussion', async ({page, asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(300_000);
        const tag = makeTag('s11', testInfo);
        const {mg, au, ra, rb} = await seedJournal(ojsApi, tag, ['mg', 'au', 'ra', 'rb']);
        const textA = `S11 comment by Rosa ${tag}.`;
        const textB = `S11 comment by Rob ${tag}.`;
        const article = await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            userComments: [
                {user: ra, text: textA, approved: true},
                {user: rb, text: textB, approved: true},
            ],
        });

        // A new version: created and published on the workflow screen.
        const manager = await pageAs(asUser, mg);
        const publish = new PublishScreen(manager, tag);
        await publish.gotoWorkflow(article.submissionId);
        const versionDialog = await publish.openCreateVersionDialog();
        await publish.confirmVersionDialog(versionDialog);
        await publish.openVersionEntry(VERSION_2, 'Title & Abstract');
        await publish.publish();

        // The parts: the newest open with the box, the older closed.
        const reader = await pageAs(asUser, ra);
        const landing = new ArticleCommentsPage(reader, tag);
        await landing.goto(article.submissionId);
        expect(await landing.partLabels()).toEqual([`${VERSION_2} (0)`, `${VERSION_1} (2)`]);
        await expect(landing.partButton(VERSION_2)).toHaveAttribute('aria-expanded', 'true');
        await expect(landing.partButton(VERSION_1)).toHaveAttribute('aria-expanded', 'false');
        await expect(landing.partRegion(VERSION_2)).toBeVisible();
        await expect(landing.box(landing.partRegion(VERSION_2))).toBeVisible();
        await expect(landing.submitButton(landing.partRegion(VERSION_2))).toBeVisible();
        await expect(landing.partRegion(VERSION_1)).toHaveCount(0);

        // One part open at a time.
        await landing.partButton(VERSION_1).click();
        await expect(landing.partButton(VERSION_1)).toHaveAttribute('aria-expanded', 'true');
        await expect(landing.partRegion(VERSION_1)).toBeVisible();
        await expect(landing.partButton(VERSION_2)).toHaveAttribute('aria-expanded', 'false');
        await expect(landing.partRegion(VERSION_2)).toHaveCount(0);
        await landing.partButton(VERSION_1).click();
        await expect(landing.partButton(VERSION_1)).toHaveAttribute('aria-expanded', 'false');
        await expect(landing.partRegion(VERSION_1)).toHaveCount(0);
        await expect(landing.partRegion(VERSION_2)).toHaveCount(0);

        // The older part: the closed notice with its icon, the two comments with menus, a report from there.
        await landing.partButton(VERSION_1).click();
        const older = landing.partRegion(VERSION_1);
        await expect(older).toBeVisible();
        await expect(landing.closedNotice(older)).toHaveText(CLOSED_NOTICE);
        await expect(landing.closedNotice(older).locator('svg, img')).toHaveCount(1);
        await expect(landing.box(older)).toHaveCount(0);
        await expect(landing.comments(older)).toHaveCount(2);
        await expect(landing.menuButton(landing.comment(textA, older))).toHaveCount(1);
        await expect(landing.menuButton(landing.comment(textB, older))).toHaveCount(1);
        const report = await landing.openReportDialog(landing.comment(textB, older));
        await landing.reasonBox(report).fill('Reported from the old version.');
        await landing.submitReport(report);
        const comments = new CommentsPage(manager, tag);
        await comments.goto();
        await comments.openTab('Reported');
        await expect(comments.row(textB)).toHaveCount(1);
        await expect(comments.rows()).toHaveCount(1);

        // The newest part: a comment written there, pending, counted in its heading alone.
        await landing.partButton(VERSION_2).click();
        const newest = landing.partRegion(VERSION_2);
        await expect(newest).toBeVisible();
        await landing.writeComment('A comment on the new version.');
        const own = landing.comment('A comment on the new version.', newest);
        await expect(own).toHaveCount(1);
        await expect(landing.pendingNotice(own)).toHaveText(PENDING_NOTICE);
        await landing.expectPartCount(VERSION_2, 1);
        await landing.expectPartCount(VERSION_1, 2);

        // The sidebar: the approved comments over every version, the pending one not counted.
        await landing.expectAllComments(2);

        // Control: signed out, "Log in to comment" in the newest part only, the closed notice in the older.
        const visitor = new ArticleCommentsPage(page, tag);
        await visitor.goto(article.submissionId);
        await expect(visitor.loginButton(visitor.partRegion(VERSION_2))).toBeVisible();
        await expect(visitor.loginButton()).toHaveCount(1);
        await visitor.partButton(VERSION_1).click();
        await expect(visitor.closedNotice(visitor.partRegion(VERSION_1))).toHaveText(CLOSED_NOTICE);
        await expect(visitor.loginButton()).toHaveCount(0);
        await expect(visitor.comments(visitor.partRegion(VERSION_1))).toHaveCount(2);
    });

    test('S12: the article is unpublished, published again and deleted', async ({page, asUser, ojsApi}, testInfo) => {
        test.slow();
        test.setTimeout(360_000);
        const tag = makeTag('s12', testInfo);
        const {mg, au, ra, rb} = await seedJournal(ojsApi, tag, ['mg', 'au', 'ra', 'rb']);
        const approvedText = `S12 approved by Rosa ${tag}.`;
        const pendingText = `S12 pending by Rosa ${tag}.`;
        const reason = `S12 report by Rob ${tag}.`;
        const otherText = `S12 other article comment ${tag}.`;
        const article = await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            userComments: [
                {user: ra, text: approvedText, approved: true, reports: [{user: rb, note: reason}]},
                {user: ra, text: pendingText},
            ],
        });
        await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            suffix: 'b',
            userComments: [{user: ra, text: otherText, approved: true}],
        });

        const manager = await pageAs(asUser, mg);
        const reader = await pageAs(asUser, ra);
        const publish = new PublishScreen(manager, tag);
        const comments = new CommentsPage(manager, tag);
        const visitor = new ArticleCommentsPage(page, tag);
        const readerLanding = new ArticleCommentsPage(reader, tag);

        // Unpublished: the page still lists both; the article answers "404 Not Found".
        await publish.gotoWorkflow(article.submissionId);
        await publish.unpublish();
        await comments.goto();
        await expect(comments.row(approvedText)).toHaveCount(1);
        await expect(comments.row(pendingText)).toHaveCount(1);
        await visitor.expectNotFound(article.submissionId);
        await readerLanding.expectNotFound(article.submissionId);

        // Published again: the approved comment to a visitor, both to the writer.
        await publish.gotoWorkflow(article.submissionId);
        await publish.openVersionEntry(VERSION_1, 'Title & Abstract');
        await publish.publish();
        await visitor.goto(article.submissionId);
        await visitor.expectPartCount(VERSION_1, 1);
        await expect(visitor.comment(approvedText)).toHaveCount(1);
        await expect(visitor.comment(pendingText)).toHaveCount(0);
        await readerLanding.goto(article.submissionId);
        await readerLanding.expectPartCount(VERSION_1, 2);
        await expect(readerLanding.comment(approvedText)).toHaveCount(1);
        const pending = readerLanding.comment(pendingText);
        await expect(pending).toHaveCount(1);
        await expect(readerLanding.pendingNotice(pending)).toHaveText(PENDING_NOTICE);

        // Deleted: unpublished again, "Decline Submission" on the Submission stage, then "Delete".
        await publish.gotoWorkflow(article.submissionId);
        await publish.openVersionEntry(VERSION_1, 'Title & Abstract');
        await publish.unpublish();
        const workflow = new WorkflowPage(manager, tag);
        await workflow.selectStage('Submission');
        await workflow.actionButton('Decline Submission').click();
        const decision = new DecisionPage(manager);
        await decision.expectOpen('Decline Submission');
        await decision.completeAll();
        await workflow.deleteSubmission();
        await comments.goto();
        await expectOnNoTab(comments, approvedText);
        await expectOnNoTab(comments, pendingText);
        await comments.openTab('Reported');
        await expect(comments.noItems()).toBeVisible();

        // The Tasks panel: the rows about both comments and the report stay, blank (A10's sentence).
        const tasks = new TasksPanel(manager);
        await gotoEditorial(manager, tag);
        await tasks.open();
        const blank = (rows) => rows.filter({hasNot: manager.locator('.task .details .submission', {hasText: /\S/})});
        await expect(blank(tasks.rowsOpening(COMMENT_TASK))).toHaveCount(2);
        await expect(blank(tasks.rowsOpening(REPORT_TASK))).toHaveCount(1);
        await expect(tasks.row(otherText)).toHaveCount(1);
        await expect(tasks.row(approvedText)).toHaveCount(0);
        await expect(tasks.row(pendingText)).toHaveCount(0);
        await expect(tasks.row(reason)).toHaveCount(0);
        await tasks.close();

        // Control: the second article's comment still under "All" and "Approved".
        await comments.goto();
        await expect(comments.row(otherText)).toHaveCount(1);
        await comments.openTab('Approved');
        await expect(comments.row(otherText)).toHaveCount(1);
    });

    test("S13: the writer's account is merged away or removed from the journal", async ({page, asUser, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s13', testInfo);
        const {mg, au, ra, rb} = await seedJournal(ojsApi, tag, ['mg', 'au', 'ra', 'rb']);
        const textA = `S13 comment by A ${tag}.`;
        const textB = `S13 comment by B ${tag}.`;
        const reason = `S13 report by B ${tag}.`;
        const article = await seedArticle(ojsApi, {
            tag,
            context: tag,
            author: au,
            userComments: [
                {user: ra, text: textA, approved: true, reports: [{user: rb, note: reason}]},
                {user: rb, text: textB, approved: true},
            ],
        });
        const commentA = article.userComments[0].id;

        // The manager's panel holds the rows about both comments and the report (the given).
        const manager = await pageAs(asUser, mg);
        const tasks = new TasksPanel(manager);
        await gotoEditorial(manager, tag);
        await tasks.open();
        await expect(tasks.row(textA)).toHaveCount(1);
        await expect(tasks.row(textB)).toHaveCount(1);
        await expect(tasks.row(reason)).toHaveCount(1);
        await tasks.close();

        // "Merge user": B into A; B's comment and B's report gone.
        const users = new UsersPage(manager, tag);
        await users.goto(rb);
        await users.mergeUser(rb, ra);
        const comments = new CommentsPage(manager, tag);
        await comments.goto();
        await expectOnNoTab(comments, textB);
        await comments.openTab('Reported');
        await expect(comments.noItems()).toBeVisible();
        await comments.openTab('All');
        await expect(comments.row(textA)).toHaveCount(1);
        await comments.viewComment(comments.row(textA));
        await expect(comments.noReports()).toBeVisible();
        await comments.closeCommentPanel();
        const visitor = new ArticleCommentsPage(page, tag);
        await visitor.goto(article.submissionId);
        await expect(visitor.comment(textB)).toHaveCount(0);
        await expect(visitor.comment(textA)).toHaveCount(1);
        await visitor.expectPartCount(VERSION_1, 1);

        // "Remove User" on A: A's comment stays listed.
        await users.goto(ra);
        await users.removeUser(ra);
        await comments.goto();
        await expect(comments.row(textA)).toHaveCount(1);
        await comments.openTab('Approved');
        await expect(comments.row(textA)).toHaveCount(1);

        // The Tasks panel: the rows about B's comment and B's report stay, blank (A10's sentence).
        await gotoEditorial(manager, tag);
        await tasks.open();
        const blank = (rows) => rows.filter({hasNot: manager.locator('.task .details .submission', {hasText: /\S/})});
        await expect(blank(tasks.rowsOpening(COMMENT_TASK))).toHaveCount(1);
        await expect(blank(tasks.rowsOpening(REPORT_TASK))).toHaveCount(1);
        await expect(tasks.row(textB)).toHaveCount(0);
        await expect(tasks.row(reason)).toHaveCount(0);

        // Control: the row about A's comment still opens the Comments page with its panel.
        await expect(tasks.row(textA)).toHaveCount(1);
        await tasks.openTask(tasks.row(textA));
        await manager.waitForURL(new RegExp(`/management/settings/userComments\\?commentId=${commentA}`), {timeout: 30_000, waitUntil: 'commit'});
        await expect(comments.commentPanel()).toBeVisible({timeout: 30_000});
        await expect(comments.commentPanel().getByText(textA)).toBeVisible();
    });
});
