// @ts-check
/**
 * @file playwright/tests/U14-reader-comments-and-moderation.spec.js
 *
 * Reader comments & moderation — OMP suite: one test per canonical
 * scenario the spec runs on a press (S1–S7 common, S14 {OMP OPS}), in the
 * press's own vocabulary: Press Manager, Press Editor, Series Editor,
 * monograph, catalog book page, the "Content" group holding "Comments"
 * beside "Catalog". A press installs the moderation half only, so nothing
 * on its screens writes a comment: every comment and report comes from
 * the submission key `userComments[]`, and the common scenarios' landing
 * page bullets ({OJS}) are left out here. S14 reads the monograph's
 * catalog page for the absence of any comments block, with the "Comments"
 * settings tab and the Comments page reading "No Items" as the controls
 * (multi-app rule 3).
 * Spec: docs/specs/U14-reader-comments-and-moderation.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A6 🐞
 * (no unverified iD is seeded; S2's writer carries a verified one), A10 🐞
 * (no submission or account is deleted here), A1 ❓ and A3 ❓ (landing
 * page, OJS), A7 ❓, A9 ❓ and OMP1 ❓ (a Site Administrator holding no
 * manager role is never driven), OPS1 ❓ (preprint-only). Where a scenario
 * marks a ❓ the test asserts that bullet's own sentence and nothing of
 * the register entry beyond it: S1 waits for the Comments tab's reload
 * onto Appearance › Theme and asserts nothing about a "Saved" status (A5);
 * S1 opens the Comments page by address with the setting off and reads
 * the kept comment (A4); S3 reads the address after the report panel's
 * "Close" with neither number (A8); S5 reads the "pending review" row
 * still in each moderator's panel after "Hide Comment" (A2). The spec's
 * Coverage section records everything else left out.
 *
 * Seeding: scenario endpoints only. Every test seeds its own scratch press
 * (the context passthrough `enablePublicComments: true`, throwaway
 * accounts whose addresses name app + test, u14s<n>ompw<i>…@mail.test)
 * and a published monograph carrying its comments and reports through
 * `userComments[]` (footnotes s0–s7, s14). publicknowledge and the 18
 * seeded users are never changed (A1, A7). A batch seeded in one call
 * shares a second and lists in no fixed order, so rows are located by
 * their "Comment" cell, never by position (M5). S2's affiliation has no
 * seed key and is set on the writer's Profile › Contact (Country first).
 * Every absence is a settled read paired with a positive control taken
 * the same way (M4, M6): S5's mailbox silence is an exact count of one
 * after a control email the test sends to the same address from Users &
 * Roles › the row's "Email" (A8), its Series Editor's panel is read after
 * the Press Manager's showed the effect; S14's absences sit beside the
 * page's own headings and the signed-in name. Waits are event-based (the
 * approval, delete and list responses, the settings reload, web-first
 * assertions) — no hard-coded sleeps. Everything runs in the parallel
 * `omp` project.
 */
const {test, expect} = require('../support/fixtures.js');
const {
    CommentsSettingsTab,
    EditorialSideMenu,
    CommentsPage,
    CatalogBookPage,
    COMMENT_TASK,
    REPORT_TASK,
    NOTICE,
    ACCESS_DENIED,
    notice,
} = require('../pages/ReaderCommentsPages.js');
const {TasksPanel} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {ProfilePage} = require('../../../../shared/playwright/pages/ProfilePage.js');
const {EmailUserWindow} = require('../../../../shared/playwright/pages/UsersManagementPages.js');
const {disableMotion} = require('../../../../shared/playwright/support/motion.js');

const ALL_TABS = ['All', 'Approved', 'Hidden/Needs Approval', 'Reported'];
const COLUMNS = ['Submission', 'Comment', 'User', 'Status'];
const APPROVING_NOTE = 'Approving this comment will make it visible to all users on the site';
const APPROVED_NOTE = /^This comment was approved on \d{4}-\d{2}-\d{2} by .+\.$/;
const DATE_TIME = /\d{4}-\d{2}-\d{2} \d{1,2}:\d{2} (AM|PM)/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DELETE_COMMENT_TEXT = 'Are you sure you want to delete this comment? This action cannot be undone.';
const DELETE_REPORT_TEXT = 'Are you sure you want to delete this report? This action cannot be undone.';
const NOT_FOUND = 'The requested resource was not found.';
const VERIFIED_ORCID = 'https://orcid.org/0000-0002-1825-0097';

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u14${scenario}ompw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A scratch press user spec; its address names app + test. */
function scratchUser(tag, key, given, family, roles, extra = {}) {
    return {
        username: `${tag}${key}`,
        givenName: given,
        familyName: family,
        email: `${tag}${key}@mail.test`,
        roles,
        ...extra,
    };
}

/** The standard cast: a Press Manager and a submitting author, plus the readers asked for. */
function cast(tag, {readers = 0, editor = false, sectionEditor = false} = {}) {
    const readerNames = [
        ['Rosa', 'Reader'],
        ['Rob', 'Reporter'],
        ['Rita', 'Third'],
    ];
    return {
        manager: scratchUser(tag, 'mg', 'Mona', 'Manager', ['manager']),
        author: scratchUser(tag, 'au', 'Ada', 'Author', ['author']),
        editor: editor ? scratchUser(tag, 'ed', 'Eve', 'Editor', ['editor']) : null,
        sectionEditor: sectionEditor ? scratchUser(tag, 'se', 'Sam', 'Subeditor', ['sectionEditor']) : null,
        readers: readerNames.slice(0, readers).map(([given, family], i) => scratchUser(tag, `rd${i + 1}`, given, family, ['reader'])),
    };
}

function usersOf(people) {
    return [people.manager, people.author, people.editor, people.sectionEditor, ...people.readers].filter(Boolean);
}

const fullName = (user) => `${user.givenName} ${user.familyName}`;

/** A scratch press with public comments on (or off when `comments` is false). */
async function createPress(ompApi, tag, people, {comments = true} = {}) {
    return ompApi.createContext({
        tag,
        ...(comments ? {enablePublicComments: true} : {}),
        users: usersOf(people),
    });
}

/** A published monograph of the press carrying `userComments`. */
async function publishMonograph(ompApi, tag, people, {title, userComments = []} = {}) {
    return ompApi.createSubmission({
        tag: `${tag}s`,
        context: tag,
        submitter: people.author.username,
        published: true,
        title,
        ...(userComments.length ? {userComments} : {}),
    });
}

/** The table's "Submission" cell: "{number}. {authors} ; {title}" (Fields). */
function submissionLine(submissionId, people, title) {
    return `${submissionId}. ${people.author.familyName} ; ${title}`;
}

/** The editorial dashboard of a press (the side menu and the Tasks bell live there). */
async function openDashboard(page, contextPath) {
    await page.goto(`/index.php/${contextPath}/dashboard/editorial`);
    await expect(new TasksPanel(page).bell()).toBeVisible({timeout: 30_000});
}

/** A fresh, explicitly-anonymous context (never inherits cached storage state). */
async function anonContext(browser, baseURL) {
    const context = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
    await disableMotion(context);
    return context;
}

/** Open the Tasks panel on the dashboard and return it (the caller reads rows and closes). */
async function openTasks(page, contextPath) {
    await openDashboard(page, contextPath);
    const tasks = new TasksPanel(page);
    await tasks.open();
    return tasks;
}

/**
 * The moderators' two rows (Side effects): the comment task with the text
 * under it and the report task with the reason under it, each cut to its
 * first 200 characters and "...".
 */
async function expectModeratorRows(tasks, {text, note, comment = true, report = true}) {
    const commentRows = tasks.rowsOpening(COMMENT_TASK);
    const reportRows = tasks.rowsOpening(REPORT_TASK);
    await expect(commentRows).toHaveCount(comment ? 1 : 0);
    await expect(reportRows).toHaveCount(report ? 1 : 0);
    if (comment) {
        await expect(tasks.title(commentRows)).toHaveText(cut(text));
    }
    if (report) {
        await expect(tasks.title(reportRows)).toHaveText(cut(note));
    }
}

/** The task grid's cut: the first 200 characters, trailing spaces dropped, then "...". */
function cut(text) {
    return text.length > 200 ? `${text.slice(0, 200).replace(/\s+$/, '')}...` : text;
}

/** No row about comments or reports in this panel (the Series Editor's control read). */
async function expectNoModeratorRows(tasks) {
    await expect(tasks.dialog()).toBeVisible();
    await expect(tasks.rowsOpening(COMMENT_TASK)).toHaveCount(0);
    await expect(tasks.rowsOpening(REPORT_TASK)).toHaveCount(0);
}

/**
 * The mailbox control (footnote s5): as the Press Manager, Users & Roles ›
 * the user's row › "Email", a subject the test controls, "Send Email";
 * the send is accepted, the window closes and the message lands in Mailpit.
 */
async function sendControlEmail(page, pkpMail, contextPath, {username, email, subject}) {
    await page.goto(`/index.php/${contextPath}/management/settings/access`);
    const table = page.locator('table').filter({hasText: username}).first();
    await expect(table).toBeVisible({timeout: 30_000});
    const row = table.locator('tr').filter({hasText: username}).first();
    await row.locator('button').last().click();
    await page.getByRole('menuitem', {name: 'Email', exact: true}).click();
    // The shared window types Body only once its editor is initialised and
    // reads the send's answer as accepted (flake-s28 u14s5-email).
    const emailWindow = new EmailUserWindow(page);
    await emailWindow.compose({subject, body: `Control message ${subject}.`});
    await emailWindow.sendAndExpectSent();
    await pkpMail.find({to: email, subject, timeoutMs: 30_000});
}

test.describe('Reader comments & moderation (U14)', () => {
    test('S1: switching public comments on and off', {tag: ['@smoke']}, async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s1', testInfo);
        const people = cast(tag, {readers: 1});
        const [reader] = people.readers;
        const title = `Monograph ${tag}`;
        const text = `An approved comment on ${tag}.`;
        await createPress(ompApi, tag, people);
        const {submissionId} = await publishMonograph(ompApi, tag, people, {
            title,
            userComments: [{user: reader.username, text, approved: true}],
        });
        // The fresh press of the control: no `enablePublicComments`, no comments.
        const freshTag = `${tag}b`;
        const freshPeople = cast(freshTag);
        await createPress(ompApi, freshTag, freshPeople, {comments: false});

        const page = await (await asUser(people.manager.username)).newPage();
        const settings = new CommentsSettingsTab(page, tag);
        const menu = new EditorialSideMenu(page);
        const comments = new CommentsPage(page, tag);
        const asked = [];
        page.on('dialog', (dialog) => {
            asked.push(dialog.message());
            dialog.dismiss().catch(() => {});
        });

        // The "Comments" tab: the box ticked, "Save" enabled with nothing changed.
        await settings.goto();
        await expect(settings.box()).toBeChecked();
        await expect(settings.saveButton()).toBeEnabled();

        // Switching off: "Saving", then the whole page reloads onto
        // Appearance › Theme; the Content › Comments side tab reopened
        // shows the box unticked.
        await settings.box().uncheck();
        const off = await settings.save();
        expect(off.sawSaving, '"Saving" showed for a moment').toBe(true);
        await settings.openCommentsTab();
        await expect(settings.box()).not.toBeChecked();

        // The side menu after the reload: the "Content" group keeps "Catalog" and no "Comments".
        await openDashboard(page, tag);
        expect(await menu.contentEntries()).toEqual(['Catalog']);

        // The page by address: it opens and still lists the comment under
        // "All" and "Approved" (the scenario's own sentence; A4).
        await comments.goto();
        await expect(comments.row(text)).toHaveCount(1);
        await expect(comments.status(comments.row(text))).toHaveText('Approved');
        await comments.openTab('Approved');
        await expect(comments.row(text)).toHaveCount(1);

        // Switching on again: the same reload; Content › Comments is back.
        await settings.goto();
        await expect(settings.box()).not.toBeChecked();
        await settings.box().check();
        await settings.save();
        await settings.openCommentsTab();
        await expect(settings.box()).toBeChecked();
        await openDashboard(page, tag);
        expect(await menu.contentEntries()).toEqual(['Comments', 'Catalog']);

        // An unsaved tick: untick, open "Appearance" and come back: still
        // unticked and nothing was asked; leave the page and return: ticked.
        await settings.goto();
        await settings.box().uncheck();
        await settings.appearanceTab().click();
        await expect(settings.appearanceTab()).toHaveAttribute('aria-selected', 'true');
        await settings.openCommentsTab();
        await expect(settings.box()).not.toBeChecked();
        expect(asked, 'nothing was asked on the way').toEqual([]);
        await openDashboard(page, tag);
        expect(asked, 'nothing was asked on leaving the page').toEqual([]);
        await settings.goto();
        await expect(settings.box()).toBeChecked();
        // The setting itself was not changed by the dropped tick.
        await openDashboard(page, tag);
        expect(await menu.contentEntries()).toEqual(['Comments', 'Catalog']);

        // Control: the fresh press's tab shows the box unticked, its side
        // menu offers no Content › Comments, and its Comments page, opened
        // by address, reads "No Items" under every tab.
        const freshPage = await (await asUser(freshPeople.manager.username)).newPage();
        const freshSettings = new CommentsSettingsTab(freshPage, freshTag);
        await freshSettings.goto();
        await expect(freshSettings.box()).not.toBeChecked();
        await expect(freshSettings.saveButton()).toBeEnabled();
        await openDashboard(freshPage, freshTag);
        expect(await new EditorialSideMenu(freshPage).contentEntries()).toEqual(['Catalog']);
        const freshComments = new CommentsPage(freshPage, freshTag);
        await freshComments.goto();
        expect(await freshComments.tabLabels()).toEqual(ALL_TABS);
        for (const name of ALL_TABS) {
            await freshComments.openTab(name);
            await freshComments.expectNoItems();
        }
        // The submission exists on the first press: the row read above was a real one.
        expect(submissionId).toBeGreaterThan(0);
    });

    test('S2: approving and hiding on the Comments page', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(300_000);
        const tag = makeTag('s2', testInfo);
        const people = cast(tag, {readers: 3});
        const [writer, second, third] = people.readers;
        writer.givenName = 'Vera';
        writer.familyName = 'Verified';
        writer.orcid = VERIFIED_ORCID;
        writer.orcidIsVerified = true;
        const title = `Monograph ${tag}`;
        const pendingText = `A pending comment on ${tag}.`;
        const approvedText = `An approved comment on ${tag}.`;
        const reportedText = `A reported comment on ${tag}.`;
        const reportNote = `Reported on ${tag}.`;
        const affiliation = `Verified Institute ${tag}`;
        await createPress(ompApi, tag, people);
        // The second press on the site, with a comment of its own.
        const otherTag = `${tag}b`;
        const otherPeople = cast(otherTag, {readers: 1});
        const otherText = `The other press's comment ${otherTag}.`;
        await createPress(ompApi, otherTag, otherPeople);
        const [{submissionId, userComments}] = await Promise.all([
            publishMonograph(ompApi, tag, people, {
                title,
                userComments: [
                    {user: writer.username, text: pendingText},
                    {user: second.username, text: approvedText, approved: true},
                    {
                        user: third.username,
                        text: reportedText,
                        approved: true,
                        reports: [{user: writer.username, note: reportNote}],
                    },
                ],
            }),
            publishMonograph(ompApi, otherTag, otherPeople, {
                title: `Other monograph ${otherTag}`,
                userComments: [{user: otherPeople.readers[0].username, text: otherText, approved: true}],
            }),
        ]);
        const pendingId = userComments[0].id;

        // The writer's affiliation: Profile › Contact (Country first, then the field).
        const writerPage = await (await asUser(writer.username)).newPage();
        const profile = new ProfilePage(writerPage, tag);
        await profile.goto('contact');
        await profile.country().selectOption({label: 'Canada'});
        await profile.affiliation('en').fill(affiliation);
        await profile.save();
        await writerPage.close();

        const page = await (await asUser(people.manager.username)).newPage();
        const comments = new CommentsPage(page, tag);
        const line = submissionLine(submissionId, people, title);

        // Content › Comments: the page headed "Comments", four tabs, the
        // columns, and under "All" the three rows.
        await openDashboard(page, tag);
        await new EditorialSideMenu(page).pressContentComments();
        await expect(page).toHaveURL(/management\/settings\/userComments/);
        await comments.expectOpen();
        expect(await comments.tabLabels()).toEqual(ALL_TABS);
        expect((await comments.columns()).slice(0, 4)).toEqual(COLUMNS);
        await expect(comments.rows()).toHaveCount(3);
        const expectRow = async (text, user, status) => {
            const row = comments.row(text);
            await expect(row).toHaveCount(1);
            const cells = await comments.cells(row);
            expect(cells.slice(0, 4)).toEqual([line, text, fullName(user), status]);
        };
        await expectRow(pendingText, writer, 'Hidden/Needs Approval');
        await expectRow(approvedText, second, 'Approved');
        await expectRow(reportedText, third, 'Approved, Reported');

        // The tabs, each written after "#" and kept on reload; the other
        // press's comment on no tab.
        await comments.openTab('Approved');
        await comments.expectHash('Approved');
        await expect(comments.rows()).toHaveCount(2);
        await expect(comments.row(approvedText)).toHaveCount(1);
        await expect(comments.row(reportedText)).toHaveCount(1);
        for (const row of await comments.rows().all()) {
            await expect(comments.status(row)).toHaveText('Approved');
        }
        await expect(comments.row(otherText)).toHaveCount(0);
        await comments.openTab('Hidden/Needs Approval');
        await comments.expectHash('Hidden/Needs Approval');
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.row(pendingText)).toHaveCount(1);
        await expect(comments.row(otherText)).toHaveCount(0);
        await comments.openTab('Reported');
        await comments.expectHash('Reported');
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.row(reportedText)).toHaveCount(1);
        await expect(comments.status(comments.row(reportedText))).toHaveText('Reported');
        await expect(comments.row(otherText)).toHaveCount(0);
        await page.reload();
        await comments.expectOpen();
        await comments.expectSelectedTab('Reported');
        await expect(comments.row(reportedText)).toHaveCount(1);
        await comments.openTab('All');
        await expect(comments.rows()).toHaveCount(3);
        await expect(comments.row(otherText)).toHaveCount(0);

        // The comment panel on the pending comment.
        await comments.viewComment(comments.row(pendingText));
        const panel = comments.commentPanel();
        await expect(comments.panelHeading()).toBeVisible();
        await expect(panel.getByText(line)).toBeVisible();
        await expect(panel.getByText('Comment preview')).toBeVisible();
        await expect(panel).toContainText(DATE_TIME);
        await expect(panel.getByText(pendingText)).toBeVisible();
        await expect(panel.getByText(fullName(writer)).first()).toBeVisible();
        await expect(comments.orcidLink()).toHaveAttribute('href', VERIFIED_ORCID);
        await expect(comments.orcidLink()).toHaveText(VERIFIED_ORCID);
        await expect(comments.orcidSolidIcon()).toHaveCount(1);
        await expect(panel.getByText(affiliation)).toBeVisible();
        await expect(comments.noReports()).toBeVisible();
        await expect(comments.approvalNote()).toHaveText(APPROVING_NOTE);
        await expect(comments.approveButton()).toBeEnabled();
        await expect(comments.hideButton()).toBeDisabled();
        await expect(page).toHaveURL(new RegExp(`commentId=${pendingId}\\b`));

        // "Approve Comment": the notice, the panel closes, the row is "Approved".
        await comments.setApproval('Approve Comment');
        await expect(notice(page, NOTICE.updated)).toBeVisible();
        await expect(comments.status(comments.row(pendingText))).toHaveText('Approved');
        await comments.openTab('Hidden/Needs Approval');
        await comments.expectNoItems();
        await comments.openTab('Approved');
        await expect(comments.row(pendingText)).toHaveCount(1);
        // Reopen its panel: the note names the manager, the buttons swapped; "Close" drops the number.
        await comments.viewComment(comments.row(pendingText));
        await expect(comments.approvalNote()).toHaveText(APPROVED_NOTE);
        await expect(comments.approvalNote()).toContainText(`by ${fullName(people.manager)}.`);
        await expect(comments.approveButton()).toBeDisabled();
        await expect(comments.hideButton()).toBeEnabled();
        await expect(page).toHaveURL(new RegExp(`commentId=${pendingId}\\b`));
        await comments.closeCommentPanel();
        await expect(page).not.toHaveURL(/commentId=/);

        // "Hide Comment" on the reported comment: the notice, the row
        // leaves "Approved" for "Hidden/Needs Approval", stays on
        // "Reported", and under "All" reads "Hidden/Needs Approval, Reported".
        await comments.viewComment(comments.row(reportedText));
        await expect(comments.hideButton()).toBeEnabled();
        await comments.setApproval('Hide Comment');
        await expect(notice(page, NOTICE.updated)).toBeVisible();
        await expect(comments.row(reportedText)).toHaveCount(0);
        await expect(comments.row(pendingText)).toHaveCount(1);
        await comments.openTab('Hidden/Needs Approval');
        await expect(comments.row(reportedText)).toHaveCount(1);
        await comments.openTab('Reported');
        await expect(comments.row(reportedText)).toHaveCount(1);
        await expect(comments.status(comments.row(reportedText))).toHaveText('Reported');
        await comments.openTab('All');
        await expect(comments.status(comments.row(reportedText))).toHaveText('Hidden/Needs Approval, Reported');

        // Control: the second press's Comments page lists its own comment alone.
        const otherPage = await (await asUser(otherPeople.manager.username)).newPage();
        const otherComments = new CommentsPage(otherPage, otherTag);
        await otherComments.goto();
        await expect(otherComments.rows()).toHaveCount(1);
        await expect(otherComments.row(otherText)).toHaveCount(1);
        for (const text of [pendingText, approvedText, reportedText]) {
            await expect(otherComments.row(text)).toHaveCount(0);
        }
    });

    test('S3: reports on the Comments page', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s3', testInfo);
        const people = cast(tag, {readers: 3});
        const [writer, rob, rita] = people.readers;
        const title = `Monograph ${tag}`;
        const reportedText = `A twice reported comment on ${tag}.`;
        const cleanText = `A never reported comment on ${tag}.`;
        const notes = {rob: `Report one by Rob on ${tag}.`, rita: `Report two by Rita on ${tag}.`};
        await createPress(ompApi, tag, people);
        const {userComments} = await publishMonograph(ompApi, tag, people, {
            title,
            userComments: [
                {
                    user: writer.username,
                    text: reportedText,
                    approved: true,
                    reports: [
                        {user: rob.username, note: notes.rob},
                        {user: rita.username, note: notes.rita},
                    ],
                },
                {user: writer.username, text: cleanText, approved: true},
            ],
        });
        const reportedId = userComments[0].id;
        const reporterOf = {[notes.rob]: fullName(rob), [notes.rita]: fullName(rita)};

        const page = await (await asUser(people.manager.username)).newPage();
        const comments = new CommentsPage(page, tag);
        await comments.goto();

        // Control, before: the never-reported comment on "Approved", not on
        // "Reported", its panel reading "No one has reported this comment yet".
        await comments.openTab('Approved');
        await expect(comments.row(cleanText)).toHaveCount(1);
        await expect(comments.row(reportedText)).toHaveCount(1);
        await comments.viewComment(comments.row(cleanText));
        await expect(comments.noReports()).toBeVisible();
        await comments.closeCommentPanel();

        // The "Reported" tab: the reported comment alone, "Status" "Reported".
        await comments.openTab('Reported');
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.row(reportedText)).toHaveCount(1);
        await expect(comments.row(cleanText)).toHaveCount(0);
        await expect(comments.status(comments.row(reportedText))).toHaveText('Reported');

        // The "Reports" table in its panel: the description, the columns, one row per report.
        await comments.viewComment(comments.row(reportedText));
        const panel = comments.commentPanel();
        await expect(panel.getByText('This is the list of all the users who have reported this comment')).toBeVisible();
        expect((await comments.reportColumns()).slice(0, 3)).toEqual(['Reported By', 'Reason', 'Date Reported']);
        await expect(comments.reportRows()).toHaveCount(2);
        for (const note of Object.keys(notes).map((k) => notes[k])) {
            const row = comments.reportRow(note);
            await expect(row).toHaveCount(1);
            const cells = (await row.locator('td').allInnerTexts()).map((c) => c.trim());
            expect(cells.slice(0, 2)).toEqual([reporterOf[note], note]);
            expect(cells[2]).toMatch(DATE);
        }

        // "View Report" on the first row: the report panel over the comment
        // panel, with the date and time, the reason, the reporter's name
        // and "Delete Report"; the address carries both numbers.
        const firstRow = comments.reportRows().first();
        const firstNote = (await firstRow.locator('td').nth(1).innerText()).trim();
        await comments.viewReport(firstRow);
        const report = comments.reportPanel();
        await expect(comments.visibleDialogs()).toHaveCount(2);
        await expect(report.getByText('Report preview')).toBeVisible();
        await expect(report).toContainText(DATE_TIME);
        await expect(report.getByText(firstNote)).toBeVisible();
        await expect(report.getByText(reporterOf[firstNote]).first()).toBeVisible();
        await expect(comments.deleteReportButton()).toBeVisible();
        await expect(page).toHaveURL(/reportId=\d+/);
        await expect(page).toHaveURL(new RegExp(`commentId=${reportedId}\\b`));

        // "Close" on the report panel: the comment panel stays open, and
        // both numbers leave the address (the scenario's own sentence; A8).
        await comments.closeReportPanel();
        await expect(comments.commentPanel()).toBeVisible();
        await expect(comments.visibleDialogs()).toHaveCount(1);
        await expect(page).not.toHaveURL(/reportId=/);
        await expect(page).not.toHaveURL(/commentId=/);

        // "Delete Report" from the report panel: the dialog, "Delete", the
        // notice, the report panel closes, the table reloads with one row.
        await comments.viewReport(comments.reportRow(firstNote));
        await comments.deleteReportButton().click();
        const reportDialog = comments.confirmDialog('Delete Report');
        await expect(reportDialog).toBeVisible();
        await expect(reportDialog.getByText(DELETE_REPORT_TEXT)).toBeVisible();
        await expect(reportDialog.getByRole('button', {name: 'Delete', exact: true})).toBeVisible();
        await expect(reportDialog.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        await comments.confirmDeleteReport();
        await expect(notice(page, NOTICE.reportDeleted)).toBeVisible();
        await expect(comments.reportPanel()).toBeHidden();
        await expect(comments.commentPanel()).toBeVisible();
        await expect(comments.reportRows()).toHaveCount(1);
        await expect(comments.reportRow(firstNote)).toHaveCount(0);

        // "Delete Report" from the remaining row: the notice again, the
        // table reads its empty text, the note still says approved.
        await comments.deleteReportFromRow(comments.reportRows().first());
        await comments.confirmDeleteReport();
        await expect(notice(page, NOTICE.reportDeleted)).toBeVisible();
        await expect(comments.noReports()).toBeVisible();
        await expect(comments.approvalNote()).toHaveText(APPROVED_NOTE);
        // "Close": the table reloads, the comment is gone from "Reported",
        // and under "All" its "Status" reads "Approved".
        await comments.closeCommentPanel({changed: true});
        await comments.expectSelectedTab('Reported');
        await comments.expectNoItems();
        await comments.openTab('All');
        await expect(comments.status(comments.row(reportedText))).toHaveText('Approved');

        // Control, after: the never-reported comment as before.
        await comments.openTab('Approved');
        await expect(comments.row(cleanText)).toHaveCount(1);
        await comments.viewComment(comments.row(cleanText));
        await expect(comments.noReports()).toBeVisible();
        await comments.closeCommentPanel();
        await comments.openTab('Reported');
        await expect(comments.row(cleanText)).toHaveCount(0);
        await comments.expectNoItems();
    });

    test('S4: deleting a comment as a moderator', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s4', testInfo);
        const people = cast(tag, {readers: 2});
        const [rosa, rob] = people.readers;
        const title = `Monograph ${tag}`;
        const plainText = `An approved comment to delete from the row on ${tag}.`;
        const reportedText = `A reported comment to delete from the panel on ${tag}.`;
        const pendingText = `A pending comment that stays on ${tag}.`;
        await createPress(ompApi, tag, people);
        const {userComments} = await publishMonograph(ompApi, tag, people, {
            title,
            userComments: [
                {user: rosa.username, text: plainText, approved: true},
                {user: rosa.username, text: reportedText, approved: true, reports: [{user: rob.username, note: `Reported on ${tag}.`}]},
                {user: rob.username, text: pendingText},
            ],
        });
        const reportedId = userComments[1].id;

        const page = await (await asUser(people.manager.username)).newPage();
        const comments = new CommentsPage(page, tag);
        await comments.goto();
        await expect(comments.rows()).toHaveCount(3);

        // From the row: "…" › "Delete Comment", the dialog, "Delete": the
        // notice and the table without the row.
        await comments.deleteCommentFromRow(comments.row(plainText));
        const dialog = comments.confirmDialog('Delete Comment');
        await expect(dialog.getByText(DELETE_COMMENT_TEXT)).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Delete', exact: true})).toBeVisible();
        await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toBeVisible();
        await comments.confirmDeleteComment();
        await expect(notice(page, NOTICE.deleted)).toBeVisible();
        await expect(comments.row(plainText)).toHaveCount(0);
        await expect(comments.rows()).toHaveCount(2);

        // From the panel: the noted address, "Delete Comment", "Delete":
        // the notice, the panel closes, the row is gone from every tab.
        await comments.viewComment(comments.row(reportedText));
        await expect(page).toHaveURL(new RegExp(`commentId=${reportedId}\\b`));
        const noted = page.url();
        await comments.deleteButton().click();
        await expect(comments.confirmDialog('Delete Comment')).toBeVisible();
        await comments.confirmDeleteComment();
        await expect(notice(page, NOTICE.deleted)).toBeVisible();
        await expect(comments.commentPanel()).toBeHidden();
        await expect(comments.row(reportedText)).toHaveCount(0);
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.row(pendingText)).toHaveCount(1);
        for (const name of ['Approved', 'Hidden/Needs Approval', 'Reported']) {
            await comments.openTab(name);
            await expect(comments.row(reportedText)).toHaveCount(0);
            await expect(comments.row(plainText)).toHaveCount(0);
        }
        await comments.openTab('Reported');
        await comments.expectNoItems();

        // The noted address: the page on "All" under the "Error" dialog.
        await page.goto(noted);
        const error = comments.errorDialog();
        await expect(error).toBeVisible({timeout: 30_000});
        await expect(error.getByText(NOT_FOUND)).toBeVisible();
        await expect(error.getByRole('button', {name: 'OK', exact: true})).toBeVisible();
        await expect(comments.tab('All')).toHaveAttribute('aria-selected', 'true');
        await error.getByRole('button', {name: 'OK', exact: true}).click();
        await expect(error).toBeHidden();

        // Control: the pending comment is still listed under "All" and "Hidden/Needs Approval".
        await comments.goto();
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.row(pendingText)).toHaveCount(1);
        await comments.openTab('Hidden/Needs Approval');
        await expect(comments.row(pendingText)).toHaveCount(1);
        await expect(comments.status(comments.row(pendingText))).toHaveText('Hidden/Needs Approval');
    });

    test("S5: the moderators' tasks", async ({asUser, ompApi, pkpMail}, testInfo) => {
        test.setTimeout(480_000);
        const tag = makeTag('s5', testInfo);
        const people = cast(tag, {readers: 2, editor: true, sectionEditor: true});
        const [writer, reporter] = people.readers;
        const title = `Monograph ${tag}`;
        const text = `A long comment on ${tag}: ${'the moderators must read every word of this sentence '.repeat(7)}end.`;
        const note = `A long reason on ${tag}: ${'this comment is reported for a reason the panel cuts short '.repeat(6)}end.`;
        expect(text.length).toBeGreaterThan(200);
        expect(note.length).toBeGreaterThan(200);
        await createPress(ompApi, tag, people);
        const {userComments} = await publishMonograph(ompApi, tag, people, {
            title,
            userComments: [
                {user: writer.username, text, approved: true, reports: [{user: reporter.username, note}]},
            ],
        });
        const commentId = userComments[0].id;

        const managerPage = await (await asUser(people.manager.username)).newPage();
        const editorPage = await (await asUser(people.editor.username)).newPage();
        const sePage = await (await asUser(people.sectionEditor.username)).newPage();
        const comments = new CommentsPage(managerPage, tag);

        // The Press Manager's Tasks panel: the two unread rows with the text
        // and the reason under them, cut to 200 characters and "...".
        let tasks = await openTasks(managerPage, tag);
        await expectModeratorRows(tasks, {text, note});
        await tasks.expectUnread(tasks.rowsOpening(COMMENT_TASK));
        await tasks.expectUnread(tasks.rowsOpening(REPORT_TASK));
        await tasks.close();
        // The Press Editor's: the same two rows.
        let editorTasks = await openTasks(editorPage, tag);
        await expectModeratorRows(editorTasks, {text, note});
        await editorTasks.expectUnread(editorTasks.rowsOpening(COMMENT_TASK));
        await editorTasks.expectUnread(editorTasks.rowsOpening(REPORT_TASK));
        await editorTasks.close();
        // Control: the Series Editor's panel holds neither row.
        let seTasks = await openTasks(sePage, tag);
        await expectNoModeratorRows(seTasks);
        await seTasks.close();

        // Pressing the comment's row: the Comments page with the panel open.
        tasks = await openTasks(managerPage, tag);
        await tasks.openTask(tasks.rowsOpening(COMMENT_TASK));
        await managerPage.waitForURL(/userComments/, {waitUntil: 'commit', timeout: 30_000});
        await expect(comments.commentPanel()).toBeVisible({timeout: 30_000});
        await expect(managerPage).toHaveURL(new RegExp(`commentId=${commentId}\\b`));
        await expect(comments.commentPanel().getByText(text)).toBeVisible();
        // Pressing the report's row: the comment panel and the report panel on top.
        tasks = await openTasks(managerPage, tag);
        await tasks.openTask(tasks.rowsOpening(REPORT_TASK));
        await managerPage.waitForURL(/userComments/, {waitUntil: 'commit', timeout: 30_000});
        await expect(comments.reportPanel()).toBeVisible({timeout: 30_000});
        await expect(comments.visibleDialogs()).toHaveCount(2);
        await expect(managerPage).toHaveURL(/reportId=\d+/);
        await expect(managerPage).toHaveURL(new RegExp(`commentId=${commentId}\\b`));
        await expect(comments.reportPanel().getByText(note)).toBeVisible();

        // Profile › Notifications: no row about comments (the reviewer row
        // is about a review), beside the rows the tab does list.
        const profile = new ProfilePage(managerPage, tag);
        await profile.goto('notifications');
        const sentences = await profile.notificationSentences();
        expect(sentences).toContain('Discussion added.');
        expect(sentences.filter((s) => /comment/i.test(s) && !/reviewer has commented/i.test(s))).toEqual([]);
        expect(sentences).not.toContain(COMMENT_TASK);
        expect(sentences).not.toContain(REPORT_TASK);

        // After "Hide Comment": the "pending review" row stays in every
        // moderator's panel (the scenario's own sentence; A2).
        await comments.goto(`?commentId=${commentId}`);
        await expect(comments.commentPanel()).toBeVisible({timeout: 30_000});
        await comments.setApproval('Hide Comment');
        await expect(notice(managerPage, NOTICE.updated)).toBeVisible();
        tasks = await openTasks(managerPage, tag);
        await expectModeratorRows(tasks, {text, note});
        await tasks.close();
        editorTasks = await openTasks(editorPage, tag);
        await expectModeratorRows(editorTasks, {text, note});
        await editorTasks.close();
        seTasks = await openTasks(sePage, tag);
        await expectNoModeratorRows(seTasks);
        await seTasks.close();

        // After "Delete Report": the "requires review" row leaves every
        // moderator's panel; the "pending review" row stays.
        await comments.goto(`?commentId=${commentId}`);
        await expect(comments.commentPanel()).toBeVisible({timeout: 30_000});
        await expect(comments.reportRows()).toHaveCount(1);
        await comments.deleteReportFromRow(comments.reportRows().first());
        await comments.confirmDeleteReport();
        await expect(notice(managerPage, NOTICE.reportDeleted)).toBeVisible();
        await expect(comments.noReports()).toBeVisible();
        tasks = await openTasks(managerPage, tag);
        await expectModeratorRows(tasks, {text, note, report: false});
        await tasks.close();
        editorTasks = await openTasks(editorPage, tag);
        await expectModeratorRows(editorTasks, {text, note, report: false});
        await editorTasks.close();
        seTasks = await openTasks(sePage, tag);
        await expectNoModeratorRows(seTasks);
        await seTasks.close();

        // After "Delete Comment": the "pending review" row leaves every moderator's panel.
        await comments.goto(`?commentId=${commentId}`);
        await expect(comments.commentPanel()).toBeVisible({timeout: 30_000});
        await comments.deleteButton().click();
        await expect(comments.confirmDialog('Delete Comment')).toBeVisible();
        await comments.confirmDeleteComment();
        await expect(notice(managerPage, NOTICE.deleted)).toBeVisible();
        await comments.expectNoItems();
        tasks = await openTasks(managerPage, tag);
        await expectModeratorRows(tasks, {text, note, comment: false, report: false});
        await tasks.close();
        editorTasks = await openTasks(editorPage, tag);
        await expectModeratorRows(editorTasks, {text, note, comment: false, report: false});
        await editorTasks.close();
        seTasks = await openTasks(sePage, tag);
        await expectNoModeratorRows(seTasks);
        await seTasks.close();

        // Mailboxes: the writer's, the reporter's and each moderator's hold
        // no email about any of it: each judged after a control email sent
        // to the same address (Users & Roles › the row's "Email") arrived,
        // the mailbox then holding that one message alone.
        for (const person of [writer, reporter, people.manager, people.editor]) {
            const subject = `Control ${tag} ${person.username}`;
            await sendControlEmail(managerPage, pkpMail, tag, {
                username: person.username,
                email: person.email,
                subject,
            });
            expect(await pkpMail.count({to: person.email}), `${person.email} holds the control alone`).toBe(1);
        }
    });

    test('S6: who opens the Comments page', async ({asUser, ompApi, browser, baseURL}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s6', testInfo);
        const people = cast(tag, {readers: 1, sectionEditor: true});
        const [reader] = people.readers;
        await createPress(ompApi, tag, people);
        const address = `/index.php/${tag}/management/settings/userComments`;

        const expectDenied = async (page) => {
            await page.goto(address);
            await expect(page).toHaveURL(/user\/authorizationDenied/, {timeout: 30_000});
            await expect(page.getByText(ACCESS_DENIED)).toBeVisible();
        };

        // The Series Editor: no "Content" group; the address answers the access-denied page.
        const sePage = await (await asUser(people.sectionEditor.username)).newPage();
        await openDashboard(sePage, tag);
        const seMenu = new EditorialSideMenu(sePage);
        await expect(seMenu.groupHeader('Statistics')).toHaveCount(1);
        await expect(seMenu.groupHeader('Content')).toHaveCount(0);
        expect(await seMenu.contentEntries()).toEqual([]);
        await expectDenied(sePage);

        // The Author: the dashboard's side menu has no "Content" group; the address is refused.
        const authorPage = await (await asUser(people.author.username)).newPage();
        await authorPage.goto(`/index.php/${tag}/dashboard/mySubmissions`);
        const authorMenu = new EditorialSideMenu(authorPage);
        await expect(authorMenu.groupHeader('My Submissions as Author')).toHaveCount(1);
        await expect(authorMenu.groupHeader('Content')).toHaveCount(0);
        await expectDenied(authorPage);

        // The Reader: the address answers the access-denied page.
        const readerPage = await (await asUser(reader.username)).newPage();
        await expectDenied(readerPage);

        // Signed out: the address answers the Login page, the address as its source.
        const anon = await anonContext(browser, baseURL);
        const anonPage = await anon.newPage();
        await anonPage.goto(address);
        await expect(anonPage).toHaveURL(/\/login\?source=.*userComments/, {timeout: 30_000});
        await expect(anonPage.locator('form#login')).toBeVisible();
        await expect(anonPage.getByText(ACCESS_DENIED)).toHaveCount(0);
        await anon.close();

        // Control: the Press Manager's side menu holds Content › Comments,
        // and the address opens the page headed "Comments".
        const managerPage = await (await asUser(people.manager.username)).newPage();
        await openDashboard(managerPage, tag);
        const menu = new EditorialSideMenu(managerPage);
        expect(await menu.contentEntries()).toEqual(['Comments', 'Catalog']);
        await menu.pressContentComments();
        const comments = new CommentsPage(managerPage, tag);
        await comments.expectOpen();
        await managerPage.goto(address);
        await comments.expectOpen();
        await expect(managerPage.getByText(ACCESS_DENIED)).toHaveCount(0);
    });

    test('S7: more than a page of comments', async ({asUser, ompApi}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s7', testInfo);
        const people = cast(tag, {readers: 1});
        const [reader] = people.readers;
        const title = `Monograph ${tag}`;
        const texts = Array.from({length: 26}, (_, i) => `Comment ${String(i + 1).padStart(2, '0')} of 26 on ${tag}.`);
        await createPress(ompApi, tag, people);
        await publishMonograph(ompApi, tag, people, {
            title,
            userComments: texts.map((text) => ({user: reader.username, text, approved: true})),
        });

        const page = await (await asUser(people.manager.username)).newPage();
        const comments = new CommentsPage(page, tag);
        await comments.goto();

        // The first page: 25 rows and the page links; the second page: one row.
        await expect(comments.rows()).toHaveCount(25);
        await expect(comments.pagination()).toBeVisible();
        await expect(comments.showingLine()).toHaveText(/Showing\s+1\s+to\s+25\s+of\s+26/);
        await expect(comments.pageButton(2)).toBeVisible();
        await comments.gotoPage(2);
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.showingLine()).toHaveText(/Showing\s+26\s+to\s+26\s+of\s+26/);
        const onPageTwo = (await comments.cells(comments.rows().first()))[1];
        expect(texts).toContain(onPageTwo);

        // Coming back to a tab: "Approved" lists its first page; "All" is still on its second.
        await comments.openTab('Approved');
        await expect(comments.rows()).toHaveCount(25);
        await expect(comments.pagination()).toBeVisible();
        await expect(comments.showingLine()).toHaveText(/Showing\s+1\s+to\s+25\s+of\s+26/);
        await comments.openTab('All');
        await expect(comments.rows()).toHaveCount(1);
        await expect(comments.showingLine()).toHaveText(/Showing\s+26\s+to\s+26\s+of\s+26/);
        // Which comment the second page holds is not fixed: the 26 share a
        // second, and each page's query picks among the tie (fn-s7; fix
        // list B, flake-s26). It is one of the seeded comments.
        expect(texts).toContain((await comments.cells(comments.rows().first()))[1]);

        // Control: "Hidden/Needs Approval" and "Reported" read "No Items" and carry no page links.
        for (const name of ['Hidden/Needs Approval', 'Reported']) {
            await comments.openTab(name);
            await comments.expectNoItems();
            await expect(comments.pagination()).toHaveCount(0);
            await expect(comments.showingLine()).toHaveCount(0);
        }
    });

    test('S14: no reader-side half on a press (absence)', async ({asUser, ompApi, browser, baseURL}, testInfo) => {
        test.setTimeout(240_000);
        const tag = makeTag('s14', testInfo);
        const people = cast(tag, {readers: 1});
        const [reader] = people.readers;
        const title = `Monograph ${tag}`;
        await createPress(ompApi, tag, people);
        const {submissionId} = await publishMonograph(ompApi, tag, people, {title});

        // The landing page, signed out: the monograph's page with none of
        // the blocks, beside its own headings and the header's "Login".
        const anon = await anonContext(browser, baseURL);
        const anonPage = await anon.newPage();
        const book = new CatalogBookPage(anonPage, tag);
        await book.goto(submissionId, title);
        await expect(anonPage.getByRole('heading', {name: 'Synopsis', level: 2})).toBeVisible();
        await expect(book.loginLink()).toBeVisible();
        await expect(book.mainBlockHeading()).toHaveCount(0);
        await expect(book.mainBlock()).toHaveCount(0);
        await expect(book.sidebarBlockHeading()).toHaveCount(0);
        await expect(book.allCommentsLink()).toHaveCount(0);
        await expect(book.loginToComment()).toHaveCount(0);
        const before = await book.mainText();
        expect(before).toContain(title);

        // The landing page, signed in: the Reader sees the same page: no
        // comment box, no "Submit" and no comment, beside their name.
        const readerPage = await (await asUser(reader.username)).newPage();
        const readerBook = new CatalogBookPage(readerPage, tag);
        await readerBook.goto(submissionId, title);
        await expect(readerBook.signedInName(reader.username)).toBeVisible();
        await expect(readerPage.getByRole('heading', {name: 'Synopsis', level: 2})).toBeVisible();
        await expect(readerBook.commentBox()).toHaveCount(0);
        await expect(readerBook.submitButton()).toHaveCount(0);
        await expect(readerBook.commentBodies()).toHaveCount(0);
        await expect(readerBook.mainBlock()).toHaveCount(0);
        await expect(readerBook.mainBlockHeading()).toHaveCount(0);
        await expect(readerBook.sidebarBlockHeading()).toHaveCount(0);
        await expect(readerBook.loginToComment()).toHaveCount(0);

        // The "Comments" tab: the box, ticked, and "Save".
        const page = await (await asUser(people.manager.username)).newPage();
        const settings = new CommentsSettingsTab(page, tag);
        await settings.goto();
        await expect(settings.box()).toBeChecked();
        await expect(settings.saveButton()).toBeVisible();
        await expect(settings.saveButton()).toBeEnabled();

        // The Comments page: "Content" holds "Comments" beside "Catalog";
        // pressed, the page headed "Comments" lists "No Items" under each tab.
        await openDashboard(page, tag);
        const menu = new EditorialSideMenu(page);
        expect(await menu.contentEntries()).toEqual(['Comments', 'Catalog']);
        await menu.pressContentComments();
        const comments = new CommentsPage(page, tag);
        await comments.expectOpen();
        expect(await comments.tabLabels()).toEqual(ALL_TABS);
        for (const name of ALL_TABS) {
            await comments.openTab(name);
            await comments.expectNoItems();
        }

        // Control: untick and "Save" (scenario 1): Content › Comments leaves
        // the side menu while the landing page reads exactly as before.
        await settings.goto();
        await settings.box().uncheck();
        await settings.save();
        await settings.openCommentsTab();
        await expect(settings.box()).not.toBeChecked();
        await openDashboard(page, tag);
        expect(await menu.contentEntries()).toEqual(['Catalog']);
        await book.goto(submissionId, title);
        expect(await book.mainText()).toBe(before);
        await expect(book.mainBlock()).toHaveCount(0);
        await expect(book.loginToComment()).toHaveCount(0);
        await anon.close();
    });
});
